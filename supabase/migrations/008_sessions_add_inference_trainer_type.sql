-- Extend sessions.training_type to support the inference trainer.
-- Run this after 007_sessions_add_calculator_type.sql

alter table public.sessions drop constraint if exists sessions_training_type_check;

alter table public.sessions add constraint sessions_training_type_check
  check (training_type in ('speed_reading', 'rapid_recall', 'keyword_scanning', 'calculator', 'inference_trainer'));
