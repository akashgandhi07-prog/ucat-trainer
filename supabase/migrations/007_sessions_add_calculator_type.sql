-- Extend sessions.training_type to support the calculator trainer.
-- This keeps existing types and simply adds 'calculator' as an allowed value.

alter table public.sessions drop constraint if exists sessions_training_type_check;

alter table public.sessions add constraint sessions_training_type_check
  check (training_type in ('speed_reading', 'rapid_recall', 'keyword_scanning', 'calculator'));

