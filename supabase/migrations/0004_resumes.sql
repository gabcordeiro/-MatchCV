-- MatchCV — repositório de currículos (versões + análise vinculada)

-- 1. Tabela de currículos: cada upload/colagem é uma versão.
create table if not exists public.resumes (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  title          text not null default 'Currículo',
  file_path      text,               -- caminho no bucket `resumes` (null = colado como texto)
  extracted_text text not null,      -- texto usado nas análises
  created_at     timestamptz not null default now()
);

create index if not exists resumes_user_id_created_at_idx
  on public.resumes (user_id, created_at desc);

alter table public.resumes enable row level security;

drop policy if exists "Resumes are viewable by owner" on public.resumes;
create policy "Resumes are viewable by owner"
  on public.resumes for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own resumes" on public.resumes;
create policy "Users can insert own resumes"
  on public.resumes for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own resumes" on public.resumes;
create policy "Users can update own resumes"
  on public.resumes for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete own resumes" on public.resumes;
create policy "Users can delete own resumes"
  on public.resumes for delete using (auth.uid() = user_id);

-- 2. Cada análise registra qual versão do currículo usou (permite evolução do score).
alter table public.applications
  add column if not exists resume_id uuid references public.resumes (id) on delete set null;

-- 3. Bucket PRIVADO para os PDFs (currículo é dado pessoal; preview via URL assinada).
insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', false)
on conflict (id) do nothing;

drop policy if exists "Resume files readable by owner" on storage.objects;
create policy "Resume files readable by owner"
  on storage.objects for select
  using (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can upload own resume files" on storage.objects;
create policy "Users can upload own resume files"
  on storage.objects for insert
  with check (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can delete own resume files" on storage.objects;
create policy "Users can delete own resume files"
  on storage.objects for delete
  using (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);

-- 4. Migra o currículo base já existente para o repositório (uma vez).
insert into public.resumes (user_id, title, extracted_text)
select p.id, 'Currículo principal', p.base_resume
from public.profiles p
where p.base_resume is not null
  and length(trim(p.base_resume)) > 0
  and not exists (select 1 from public.resumes r where r.user_id = p.id);
