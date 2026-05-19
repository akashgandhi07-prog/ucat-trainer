-- Extend sessions.training_type to support the QR Unit Conversions trainer.

alter table public.sessions drop constraint if exists sessions_training_type_check;

alter table public.sessions add constraint sessions_training_type_check
  check (
    training_type in (
      'speed_reading',
      'rapid_recall',
      'keyword_scanning',
      'calculator',
      'inference_trainer',
      'mental_maths',
      'unit_conversions'
    )
  );
