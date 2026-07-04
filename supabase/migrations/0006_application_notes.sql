-- MatchCV — anotações pessoais por candidatura (contatos, datas, follow-up)
alter table public.applications
  add column if not exists notes text;
