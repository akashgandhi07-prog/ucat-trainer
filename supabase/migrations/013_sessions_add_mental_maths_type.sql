-- Extend sessions.training_type to support the mental maths trainer.
-- Extend sessions.difficulty to allow stage_1..stage_4 for mental_maths.

alter table public.sessions drop constraint if exists sessions_training_type_check;

alter table public.sessions add constraint sessions_training_type_check
  check (training_type in ('speed_reading', 'rapid_recall', 'keyword_scanning', 'calculator', 'inference_trainer', 'mental_maths'));

alter table public.sessions drop constraint if exists sessions_difficulty_check;

alter table public.sessions add constraint sessions_difficulty_check
  check (
    difficulty is null
    or difficulty in (
      'easy', 'medium', 'hard',
      'sprint', 'fingerTwister', 'memory', 'stages', 'free',
      'stage_1', 'stage_2', 'stage_3', 'stage_4'
    )
  );
