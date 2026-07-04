-- MatchCV — roles (user/admin), conta ativa, créditos avulsos e link da vaga

-- 1. Novas colunas em profiles.
--    role/is_active/credits/email NÃO entram no grant de UPDATE do usuário
--    (ver migration 0003) — só o servidor/admin mexe nelas.
alter table public.profiles
  add column if not exists role text not null default 'user',
  add column if not exists is_active boolean not null default true,
  add column if not exists credits integer not null default 0,
  add column if not exists email text;

-- Backfill de email a partir do auth.
update public.profiles p
set email = u.email
from auth.users u
where u.id = p.id and p.email is null;

-- Trigger de signup passa a copiar o email.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

-- 2. Link da vaga no kanban.
alter table public.applications
  add column if not exists job_url text;

-- 3. is_admin(): security definer evita recursão nas policies de profiles.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- 4. Admin lê tudo (usuário comum continua lendo só o próprio — policies antigas).
drop policy if exists "Admins can view all profiles" on public.profiles;
create policy "Admins can view all profiles"
  on public.profiles for select using (public.is_admin());

drop policy if exists "Admins can view all applications" on public.applications;
create policy "Admins can view all applications"
  on public.applications for select using (public.is_admin());

drop policy if exists "Admins can view all resumes" on public.resumes;
create policy "Admins can view all resumes"
  on public.resumes for select using (public.is_admin());

-- Escrita administrativa (trocar plano, desativar conta) NÃO é via client:
-- passa pela Edge Function admin-actions (service role + checagem de role),
-- porque o grant de colunas de profiles é restrito por segurança.
