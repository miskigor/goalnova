-- Visibility-first AI analysis: optional legacy columns + structured JSON payload.

alter table public.ai_analyses
  add column if not exists visibility_analysis jsonb;

alter table public.ai_analyses
  drop constraint if exists ai_analyses_scores_range;

alter table public.ai_analyses
  alter column speed drop not null,
  alter column technique drop not null,
  alter column decision_making drop not null,
  alter column agility drop not null,
  alter column shot_power drop not null;

alter table public.ai_analyses
  add constraint ai_analyses_scores_range_v2 check (
    (speed is null or (speed >= 0 and speed <= 100))
    and (technique is null or (technique >= 0 and technique <= 100))
    and (decision_making is null or (decision_making >= 0 and decision_making <= 100))
    and (agility is null or (agility >= 0 and agility <= 100))
    and (shot_power is null or (shot_power >= 0 and shot_power <= 100))
    and overall_score between 0 and 100
  );

comment on column public.ai_analyses.visibility_analysis is
  'Evidence-based AI breakdown: clip understanding, per-metric assessability, scores only when visible.';
