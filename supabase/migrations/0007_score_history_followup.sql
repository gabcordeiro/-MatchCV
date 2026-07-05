-- MatchCV — histórico de score por versão (comparativo) + lembrete de follow-up
alter table public.applications
  add column if not exists score_history jsonb not null default '[]'::jsonb,
  add column if not exists follow_up_at timestamptz;
