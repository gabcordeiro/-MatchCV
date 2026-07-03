-- MatchCV — kanban de vagas + base de cobrança (Stripe-ready)

-- 1. Etapa da candidatura no kanban (independente do status de geração da IA).
--    Valores: saved | applied | interview | offer | rejected
alter table public.applications
  add column if not exists stage text not null default 'saved';

-- 2. Plano e uso mensal no perfil (free: limite de gerações/mês; pro: ilimitado).
alter table public.profiles
  add column if not exists plan text not null default 'free',
  add column if not exists generations_used integer not null default 0,
  add column if not exists usage_reset_at timestamptz not null
    default (date_trunc('month', now()) + interval '1 month'),
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text;

-- 3. Segurança: o usuário comum NÃO pode editar plano/uso/dados do Stripe.
--    Só o servidor (service role, nas Edge Functions) mexe nessas colunas.
revoke update on table public.profiles from authenticated;
grant update (base_resume, onboarded, avatar_url)
  on table public.profiles to authenticated;
