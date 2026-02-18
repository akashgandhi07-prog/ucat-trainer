-- Migration: Create Syllogism Trainer tables
-- Tables for storing generated syllogism questions and user session performance.

-- ─────────────────────────────────────────────────────────────────────────────
-- syllogism_questions
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.syllogism_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    macro_block_id UUID DEFAULT gen_random_uuid(),
    stimulus_text TEXT NOT NULL,
    conclusion_text TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL,
    logic_group TEXT NOT NULL CHECK (logic_group IN ('categorical', 'relative', 'majority', 'complex')),
    trick_type TEXT NOT NULL,
    explanation TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.syllogism_questions IS 'Programmatically generated syllogism questions; macro_block_id groups five conclusions per stimulus for Macro Drill.';

ALTER TABLE public.syllogism_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to syllogism questions"
    ON public.syllogism_questions FOR SELECT USING (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- syllogism_sessions
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.syllogism_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    mode TEXT NOT NULL CHECK (mode IN ('micro', 'macro')),
    score INTEGER NOT NULL,
    total_questions INTEGER NOT NULL,
    average_time_per_decision NUMERIC NOT NULL,
    categorical_accuracy NUMERIC CHECK (categorical_accuracy IS NULL OR (categorical_accuracy >= 0 AND categorical_accuracy <= 1)),
    relative_accuracy NUMERIC CHECK (relative_accuracy IS NULL OR (relative_accuracy >= 0 AND relative_accuracy <= 1)),
    majority_accuracy NUMERIC CHECK (majority_accuracy IS NULL OR (majority_accuracy >= 0 AND majority_accuracy <= 1)),
    complex_accuracy NUMERIC CHECK (complex_accuracy IS NULL OR (complex_accuracy >= 0 AND complex_accuracy <= 1)),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.syllogism_sessions IS 'User syllogism drill sessions with aggregate accuracy per logic group.';

ALTER TABLE public.syllogism_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own syllogism sessions"
    ON public.syllogism_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own syllogism sessions"
    ON public.syllogism_sessions FOR SELECT USING (auth.uid() = user_id);
