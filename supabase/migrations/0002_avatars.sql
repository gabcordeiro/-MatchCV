-- MatchCV — foto de perfil (avatar)
-- Adiciona profiles.avatar_url + bucket de Storage `avatars` com RLS.

-- 1. Coluna com a URL pública da foto no perfil.
alter table public.profiles
  add column if not exists avatar_url text;

-- 2. Bucket público para as fotos (leitura pública, escrita só do dono).
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- 3. Políticas de Storage no bucket `avatars`.
-- Cada usuário só escreve/edita/apaga arquivos dentro da própria pasta `<uid>/...`.

drop policy if exists "Avatar images are publicly readable" on storage.objects;
create policy "Avatar images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "Users can upload own avatar" on storage.objects;
create policy "Users can upload own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can update own avatar" on storage.objects;
create policy "Users can update own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete own avatar" on storage.objects;
create policy "Users can delete own avatar"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
