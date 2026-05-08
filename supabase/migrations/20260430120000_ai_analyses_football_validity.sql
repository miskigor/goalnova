-- Football validity gate: reject non-football clips before metric scoring.
-- visibility_analysis remains jsonb for valid analyses; null when invalid.

alter table public.ai_analyses
  add column if not exists valid_for_football_analysis boolean not null default true;

alter table public.ai_analyses
  add column if not exists clip_type text;

alter table public.ai_analyses
  add column if not exists invalid_reason text;

comment on column public.ai_analyses.valid_for_football_analysis is
  'When false, the clip was not suitable for football scoring (e.g. non-football or insufficient evidence).';

comment on column public.ai_analyses.clip_type is
  'High-level classification: training | match | skill | non_football | unclear | other (provider-defined).';

comment on column public.ai_analyses.invalid_reason is
  'Human-readable reason when valid_for_football_analysis is false.';
