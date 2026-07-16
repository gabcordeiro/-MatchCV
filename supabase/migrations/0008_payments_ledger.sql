-- MatchCV — ledger de pagamentos (Pix/cartão, Mercado Pago) + idempotência de webhook
--
-- Contexto: profiles/applications/resumes já têm RLS (migrations 0001–0005) e as
-- colunas sensíveis (plan, credits, role, mercadopago_*) já são write-protected — só
-- o servidor mexe. O que faltava pra "máquina de cobrar" é REGISTRAR o pagamento e
-- garantir que o webhook seja idempotente. É isso que esta migration faz.
--
-- Princípio de segurança (o mesmo do resto do schema):
--   • leitura: o dono lê o próprio (auth.uid() = user_id); admin lê tudo.
--   • escrita: NENHUM grant pro client. Quem cria/atualiza payment é a Edge Function
--     (create-checkout e mercadopago-webhook) usando o service role, que bypassa a RLS.
--   Se o client pudesse inserir um payment 'paid', a cobrança inteira seria burlável —
--   por isso não há policy de INSERT/UPDATE/DELETE aqui.

-- ---------------------------------------------------------------------------
-- payments — um registro por tentativa de cobrança (Pix confirma assíncrono,
-- por isso 'pending' → 'paid' em momentos diferentes).
-- ---------------------------------------------------------------------------
create table if not exists public.payments (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  kind          text not null default 'credits',   -- 'credits' | 'subscription'
  provider      text not null default 'mercadopago',
  amount_cents  integer,                            -- R$9,90 = 990 (em centavos)
  currency      text not null default 'brl',
  credits       integer not null default 0,         -- créditos a liberar quando 'paid'
  status        text not null default 'pending',    -- pending | paid | failed | expired | refunded
  -- preference id (credits) ou preapproval id (subscription), criado no create-checkout
  -- ANTES de chamar o Mercado Pago — vira o external_reference que o webhook usa pra
  -- encontrar de volta esta linha.
  provider_reference text unique,
  -- payment id do Mercado Pago, preenchido pelo webhook quando o pagamento é confirmado.
  provider_payment_id text,
  created_at    timestamptz not null default now(),
  paid_at       timestamptz,
  constraint payments_kind_chk
    check (kind in ('credits', 'subscription')),
  constraint payments_status_chk
    check (status in ('pending', 'paid', 'failed', 'expired', 'refunded'))
);

create index if not exists payments_user_id_created_at_idx
  on public.payments (user_id, created_at desc);

alter table public.payments enable row level security;

-- Leitura: o dono vê os próprios pagamentos (a UI mostra "Pix pendente/pago").
drop policy if exists "Payments are viewable by owner" on public.payments;
create policy "Payments are viewable by owner"
  on public.payments for select
  using (auth.uid() = user_id);

-- Leitura administrativa (mesmo padrão de 0005).
drop policy if exists "Admins can view all payments" on public.payments;
create policy "Admins can view all payments"
  on public.payments for select
  using (public.is_admin());

-- Sem policy de INSERT/UPDATE/DELETE: RLS nega por padrão pro client.
-- create-checkout e mercadopago-webhook escrevem via service role (bypassa RLS).

-- ---------------------------------------------------------------------------
-- payment_webhook_events — livro-caixa de idempotência do webhook.
-- Guarda cada notificação já processada (id numérico que o Mercado Pago manda no
-- corpo do webhook, distinto do data.id do recurso); a Edge Function insere ANTES
-- de aplicar o efeito e ignora a notificação se o insert colidir (retry do MP).
-- Totalmente fechado pro client: RLS ligada, zero policies ⇒ ninguém lê/escreve
-- exceto o service role.
-- ---------------------------------------------------------------------------
create table if not exists public.payment_webhook_events (
  id           text primary key,     -- id da notificação (corpo do webhook, não o data.id)
  type         text,
  processed_at timestamptz not null default now()
);

alter table public.payment_webhook_events enable row level security;
-- (sem policies de propósito — trava total pro client)
