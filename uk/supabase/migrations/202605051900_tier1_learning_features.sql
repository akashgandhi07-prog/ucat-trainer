-- Mock weakness tags for targeted remediation + session rationales + calibration

alter table public.mock_scores
  add column if not exists weakness_tags text[] not null default '{}';

alter table public.sessions
  add column if not exists planner_rationale text;

alter table public.session_completions
  add column if not exists perceived_effort smallint
    check (perceived_effort is null or perceived_effort between 1 and 5);

comment on column public.mock_scores.weakness_tags is 'Coarse learner-reported UCAT weaknesses, e.g. qr_speed; drives weighting hints';
comment on column public.sessions.planner_rationale is 'One-line why this session is on the plan';
comment on column public.session_completions.perceived_effort is 'After session: 1 very light … 5 very hard';
