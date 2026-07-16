-- MatchCV — mensagens de contato (formulário público "Fale com a gente")
--
-- Qualquer visitante (anônimo ou logado) pode ENVIAR uma mensagem; só admin lê.
-- Nada sensível aqui — é canal de suporte. Limites de tamanho contêm abuso.

create table if not exists public.contact_messages (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users (id) on delete set null,
  name       text,
  email      text,
  message    text not null,
  created_at timestamptz not null default now(),
  constraint contact_messages_message_len check (char_length(message) between 1 and 4000),
  constraint contact_messages_name_len check (name is null or char_length(name) <= 120),
  constraint contact_messages_email_len check (email is null or char_length(email) <= 200)
);

create index if not exists contact_messages_created_at_idx
  on public.contact_messages (created_at desc);

alter table public.contact_messages enable row level security;

-- Envio aberto (visitante anônimo ou logado). with check (true) porque é um
-- formulário público de contato — o servidor não precisa validar o remetente.
drop policy if exists "Anyone can send a contact message" on public.contact_messages;
create policy "Anyone can send a contact message"
  on public.contact_messages for insert
  with check (true);

-- Leitura só para admin (mesmo padrão de is_admin() das migrations anteriores).
drop policy if exists "Admins can read contact messages" on public.contact_messages;
create policy "Admins can read contact messages"
  on public.contact_messages for select
  using (public.is_admin());
