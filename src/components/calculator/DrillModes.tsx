import { useState, useEffect, useRef, useCallback } from "react";
import { Trophy, Target, Clock, Sparkles, ChevronRight } from 'lucide-react';

import { DrillActiveArea } from './DrillActiveArea';
import { CALCULATOR_STAGES, getHighestUnlockedStage, setHighestUnlockedStage } from './calculatorStages';

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface DrillCompleteScore {
    kps: string;
    accuracy: number;
    score?: number;
    totalQuestions?: number;
    correctQuestions?: number;
    timeTaken?: string;
    bestKey?: string;
    worstKey?: string;
    stagePassed?: boolean;
    stageIndex?: number;
    stageName?: string;
}

interface DrillProps {
    onComplete: (score: DrillCompleteScore) => void;
    isActive: boolean;
    userKeystrokes: string[];
    onInput?: (key: string) => void;
    onQuestionComplete?: () => void;
    onFinish?: () => void;
    currentCalculatorValue?: string;
    difficulty: Difficulty;
    lastCalculated?: number;
}

// Simple math problem generator
const generateSum = (difficulty: Difficulty | 'memory') => {
    if (difficulty === 'memory') {
        const a = Math.floor(Math.random() * 20) + 5;
        const b = Math.floor(Math.random() * 10) + 2;
        const c = Math.floor(Math.random() * 20) + 5;
        const d = Math.floor(Math.random() * 10) + 2;
        return {
            text: `(${a} × ${b}) + (${c} × ${d})`,
            answer: (a * b) + (c * d)
        };
    }

    // const ops = ['+', '-', '*', '/']; // REMOVED UNUSED
    // Difficulty logic
    // Easy: +, - only, 2 digits max
    // Medium: +, -, *, small /, 2-3 digits
    // Hard: All ops, decimals possible (maybe just larger ints for now), 3 digits

    let allowedOps = ['+', '-'];
    let maxA = 50;
    let maxB = 20;

    if (difficulty === 'medium') {
        allowedOps = ['+', '-', '*', '/'];
        maxA = 100;
        maxB = 50;
    } else if (difficulty === 'hard') {
        allowedOps = ['+', '-', '*', '/'];
        maxA = 500;
        maxB = 100;
    }

    const op = allowedOps[Math.floor(Math.random() * allowedOps.length)];
    let a = Math.floor(Math.random() * maxA) + 1;
    let b = Math.floor(Math.random() * maxB) + 1;

    // Ensure clean division
    if (op === '/') {
        const prod = a * b;
        return { text: `${prod} ÷ ${a}`, answer: b };
    }

    // For subtraction, ensure non-negative answers by ordering operands so a ≥ b
    if (op === '-' && a < b) {
        const tmp = a;
        a = b;
        b = tmp;
    }

    let ans = 0;
    if (op === '+') ans = a + b;
    if (op === '-') ans = a - b;
    if (op === '*') ans = a * b;

    return { text: `${a} ${op === '/' ? '÷' : op === '*' ? '×' : op} ${b}`, answer: ans };
};

/** UCAT-style: percentage-of, multi-step (a×b)+(c×d), or single-op by difficulty */
const generateUCATStyleQuestion = (difficulty: Difficulty): { text: string; answer: number } => {
    const roll = Math.random();
    if (difficulty === 'easy') {
        if (roll < 0.3) {
            const pct = [5, 10, 15, 20, 25][Math.floor(Math.random() * 5)];
            const n = [20, 40, 60, 80, 100][Math.floor(Math.random() * 5)];
            const ans = Math.round((pct / 100) * n);
            return { text: `${pct}% of ${n}`, answer: ans };
        }
        return generateSum(difficulty);
    }
    if (difficulty === 'medium') {
        if (roll < 0.25) {
            const pct = [10, 15, 20, 25, 30][Math.floor(Math.random() * 5)];
            const n = [40, 60, 80, 100, 120][Math.floor(Math.random() * 5)];
            const ans = Math.round((pct / 100) * n);
            return { text: `${pct}% of ${n}`, answer: ans };
        }
        if (roll < 0.5) {
            const a = Math.floor(Math.random() * 15) + 2, b = Math.floor(Math.random() * 12) + 2;
            const c = Math.floor(Math.random() * 15) + 2, d = Math.floor(Math.random() * 12) + 2;
            return { text: `(${a} × ${b}) + (${c} × ${d})`, answer: (a * b) + (c * d) };
        }
        return generateSum(difficulty);
    }
    if (roll < 0.2) {
        const pct = [15, 20, 25, 30, 40][Math.floor(Math.random() * 5)];
        const n = [80, 100, 120, 150, 200][Math.floor(Math.random() * 5)];
        const ans = Math.round((pct / 100) * n);
        return { text: `${pct}% of ${n}`, answer: ans };
    }
    if (roll < 0.5) {
        const a = Math.floor(Math.random() * 25) + 3, b = Math.floor(Math.random() * 15) + 2;
        const c = Math.floor(Math.random() * 25) + 3, d = Math.floor(Math.random() * 15) + 2;
        return { text: `(${a} × ${b}) + (${c} × ${d})`, answer: (a * b) + (c * d) };
    }
    return generateSum(difficulty);
};

const getExpectedKeystrokes = (text: string): string[] => {
    // Percentage: "X% of Y" → enter as decimal 0.XX × Y (e.g. 15% of 60 → 0.15 * 60)
    const pctMatch = text.match(/^(\d+)%\s*of\s*(\d+)$/);
    if (pctMatch) {
        const pct = parseInt(pctMatch[1], 10);
        const n = pctMatch[2];
        const decimalStr = (pct / 100).toString(); // e.g. "0.15" or "0.05"
        const keys: string[] = [...decimalStr.split(''), '*', ...n.split(''), 'Enter'];
        return keys;
    }

    const tokens = text.match(/(\d+|\+|-|\*|\/|x|÷|%)/g);
    if (!tokens) return [];

    const keys: string[] = [];
    tokens.forEach(token => {
        if (/\d+/.test(token)) {
            keys.push(...token.split(''));
        } else if (token === '%') {
            // Standalone % in other patterns: skip (we already handled "X% of Y")
        } else if (token === '+' || token === '-') {
            keys.push(token);
        } else if (token === '*' || token === 'x' || token === '×') {
            keys.push('*');
        } else if (token === '/' || token === '÷') {
            keys.push('/');
        }
    });
    keys.push('Enter');
    return keys;
};


export const SprintDrill = ({ onComplete, isActive, userKeystrokes, onQuestionComplete, onFinish, currentCalculatorValue, difficulty, lastCalculated }: DrillProps) => {
    const [timeLeft, setTimeLeft] = useState(60);
    const [currentSum, setCurrentSum] = useState(generateSum(difficulty));

    // Stats Refs
    const statsRef = useRef({
        score: 0,
        totalQuestions: 0,
        correctQuestions: 0,
        keyStats: {} as Record<string, { total: number; correct: number }>
    });
    const startTimeRef = useRef<number>(0);
    const [displayScore, setDisplayScore] = useState(0);

    useEffect(() => {
        if (isActive) startTimeRef.current = Date.now();
    }, [isActive]);

    // Sync Ref with current keystrokes for final calculation
    const currentKeystrokesRef = useRef<string[]>([]);
    useEffect(() => {
        currentKeystrokesRef.current = userKeystrokes;
    }, [userKeystrokes]);

    const updateKeyStats = useCallback((key: string, isCorrect: boolean) => {
        if (!statsRef.current.keyStats[key]) {
            statsRef.current.keyStats[key] = { total: 0, correct: 0 };
        }
        statsRef.current.keyStats[key].total += 1;
        if (isCorrect) statsRef.current.keyStats[key].correct += 1;
    }, []);

    // Analyze keys strictly
    useEffect(() => {
        if (userKeystrokes.length > 0) {
            const expected = getExpectedKeystrokes(currentSum.text);
            const currentIndex = userKeystrokes.length - 1;
            const key = userKeystrokes[currentIndex];

            // If within bounds, check match
            if (currentIndex < expected.length) {
                const isMatch = key === expected[currentIndex];
                updateKeyStats(key, isMatch);
            } else {
                // Over-typing is considered incorrect
                updateKeyStats(key, false);
            }
        }
    }, [userKeystrokes, currentSum, updateKeyStats]);

    // Reset timer and stats whenever the drill (re)starts
    useEffect(() => {
        if (!isActive) return;
        startTimeRef.current = Date.now();
        setTimeLeft(60);
        statsRef.current = {
            score: 0,
            totalQuestions: 0,
            correctQuestions: 0,
            keyStats: {}
        };
        setDisplayScore(0);
        setCurrentSum(generateSum(difficulty));
    }, [isActive, difficulty]);

    const finishDrill = useCallback(() => {
        const timeElapsed = (Date.now() - startTimeRef.current) / 1000;
        const boundedElapsed = Math.min(60, Math.max(0, timeElapsed));
        const roundedSeconds = Math.round(boundedElapsed);
        const { score, totalQuestions, keyStats } = statsRef.current;

        // Calculate best/worst keys (only when we have enough data per key)
        let bestKeyName: string | null = null;
        let worstKeyName: string | null = null;
        let bestRate = -1;
        let worstRate = 2; // > 1

        Object.entries(keyStats).forEach(([key, stat]) => {
            if (stat.total < 2) return; // Need at least 2 attempts for a meaningful stat
            const rate = stat.correct / stat.total;

            // Best key: highest success rate, breaking ties by attempts
            if (
                rate > bestRate ||
                (rate === bestRate && bestKeyName && stat.total > (keyStats[bestKeyName]?.total || 0))
            ) {
                bestRate = rate;
                bestKeyName = key;
            }

            // Worst key: lowest success rate, breaking ties by attempts
            if (
                rate < worstRate ||
                (rate === worstRate && worstKeyName && stat.total > (keyStats[worstKeyName]?.total || 0))
            ) {
                worstRate = rate;
                worstKeyName = key;
            }
        });

        // If best and worst are effectively the same performance, don't show a "Needs Work" key
        if (bestKeyName && worstKeyName && bestKeyName === worstKeyName) {
            worstKeyName = null;
        }

        // Key-by-key overall accuracy
        let totalKeys = 0;
        let correctKeys = 0;
        Object.values(keyStats).forEach(s => {
            totalKeys += s.total;
            correctKeys += s.correct;
        });
        const keyAccuracy = totalKeys > 0 ? Math.round((correctKeys / totalKeys) * 100) : 100;

        const bestKeyDisplay =
            bestKeyName != null ? `${bestKeyName} (${Math.round(bestRate * 100)}%)` : undefined;

        const worstKeyDisplay =
            worstKeyName != null ? `${worstKeyName} (${Math.round(worstRate * 100)}%)` : undefined;

        onComplete({
            kps: (score / 60 * 5).toFixed(1),
            accuracy: keyAccuracy, // Strict key accuracy
            score,
            totalQuestions,
            correctQuestions: statsRef.current.correctQuestions,
            timeTaken: `${roundedSeconds}s`,
            bestKey: bestKeyDisplay,
            worstKey: worstKeyDisplay
        });
        if (onFinish) onFinish();
    }, [onComplete, onFinish]);

    // Race Condition Fix: Wait for calculator engine to report a new calculation
    const lastProcessedCalculation = useRef<number>(0);

    useEffect(() => {
        if (!lastCalculated || lastCalculated === lastProcessedCalculation.current || !isActive) return;

        // New calculation arrived!
        lastProcessedCalculation.current = lastCalculated;

        statsRef.current.totalQuestions += 1;

        // Validation
        const val = parseFloat(currentCalculatorValue || '0');
        const ans = currentSum.answer as number;
        // Check if value is correct
        const isCorrect = !isNaN(val) && Math.abs(val - ans) < 0.001;

        if (isCorrect) {
            statsRef.current.score += 1;
            statsRef.current.correctQuestions += 1;
            setDisplayScore(s => s + 1);
        }

        // Advance
        setCurrentSum(generateSum(difficulty));

        if (onQuestionComplete) {
            onQuestionComplete();
        }

    // eslint-disable-next-line react-hooks/exhaustive-deps -- only run when lastCalculated changes
    }, [lastCalculated]);


    useEffect(() => {
        if (!isActive) return;
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    finishDrill();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [isActive, finishDrill]);

    return (
        <DrillActiveArea
            drillName="🏃 The Sprint"
            description="Solve as many as you can!"
            currentProblem={currentSum}
            userKeystrokes={userKeystrokes}
            stats={{ kps: 0, accuracy: 100, score: displayScore, timeLeft }}
            onSkip={() => {
                statsRef.current.totalQuestions += 1;
                // No score increment
                setCurrentSum(generateSum(difficulty));
                onQuestionComplete?.();
            }}
            onFinish={finishDrill}
            expectedKeystrokes={getExpectedKeystrokes(currentSum.text)}
        />
    );
};

export const FingerTwisterDrill = ({ onComplete: _onComplete, isActive: _isActive, userKeystrokes, onQuestionComplete, onFinish, currentCalculatorValue, difficulty, lastCalculated }: DrillProps) => {
    // Generate numbers that are physically far (1 -> 9, 7 -> 3)
    const [currentSum, setCurrentSum] = useState({ text: '1 + 9', answer: 10 });
    const [score, setScore] = useState(0); // This serves as correct questions count

    const startTimeRef = useRef<number>(0);
    const statsRef = useRef({
        totalQuestions: 0,
        keystrokes: 0
    });

    // Reset start time when drill becomes active
    useEffect(() => {
        if (_isActive) {
            startTimeRef.current = Date.now();
            statsRef.current = { totalQuestions: 0, keystrokes: 0 };
            /* eslint-disable-next-line react-hooks/set-state-in-effect -- reset when entering FingerTwister */
            setScore(0);
        }
    }, [_isActive]);

    // Track detailed stats
    useEffect(() => {
        if (userKeystrokes.length > 0) {
            statsRef.current.keystrokes++;
        }
    }, [userKeystrokes]); // This might over-count if userKeystrokes array is replaced, but since it appends, looking at length change is better? 
    // Actually userKeystrokes is reset on question complete. 
    // We can just trust the Estimator for now: (Correct / Time) * 5 is the Sprint mechanic.
    // Better: (Total Keystrokes / Time).
    // Let's us the Estimator for consistency for now as tracking exact keystrokes with the reset logic requires more props.
    // Or just use the simple score-based KPS estimator: (score / seconds) * 5 chars avg.

    const finishDrill = useCallback(() => {
        const timeElapsed = (Date.now() - startTimeRef.current) / 1000;
        const total = statsRef.current.totalQuestions;
        const correct = score;

        // Avoid division by zero
        const safeTime = timeElapsed < 1 ? 1 : timeElapsed;
        const kps = ((correct * 5) / safeTime).toFixed(1); // estimating 5 keystrokes per correct answer
        const accuracy = total > 0 ? Math.round((correct / total) * 100) : 100;

        _onComplete({
            kps,
            accuracy,
            score,
            totalQuestions: total,
            correctQuestions: correct,
            timeTaken: `${Math.round(timeElapsed)}s`
        });
        onFinish?.();
    }, [_onComplete, score, onFinish]);

    const lastProcessedCalculation = useRef<number>(0);

    useEffect(() => {
        if (!lastCalculated || lastCalculated === lastProcessedCalculation.current || !_isActive) return;
        lastProcessedCalculation.current = lastCalculated;

        statsRef.current.totalQuestions++;
        const expected = currentSum.answer;
        const actual = parseFloat(currentCalculatorValue || '0');
        /* eslint-disable react-hooks/set-state-in-effect -- update FingerTwister score/next when calculation validated */
        if (Math.abs(actual - expected) < 0.0001) {
            setScore(s => s + 1);
        }
        setCurrentSum(generateSum(difficulty));
        /* eslint-enable react-hooks/set-state-in-effect */
        onQuestionComplete?.();
    }, [lastCalculated, currentCalculatorValue, currentSum, difficulty, onQuestionComplete, _isActive]);

    return (
        <DrillActiveArea
            drillName="🌪️ Finger Twister"
            description="Large jumps!"
            currentProblem={currentSum}
            userKeystrokes={userKeystrokes}
            stats={{ kps: 0, accuracy: 100, score }}
            onSkip={() => {
                statsRef.current.totalQuestions++;
                setCurrentSum(generateSum(difficulty));
                onQuestionComplete?.();
            }}
            onFinish={finishDrill}
            expectedKeystrokes={getExpectedKeystrokes(currentSum.text)}
        />
    );
};

export const MemoryMarathonDrill = ({ onComplete: _onComplete, isActive: _isActive, userKeystrokes, onQuestionComplete, onFinish: _onFinish, currentCalculatorValue }: DrillProps) => {
    const [currentSum, setCurrentSum] = useState(generateSum('memory'));
    const [score, setScore] = useState(0);

    const startTimeRef = useRef<number>(0);
    const statsRef = useRef({
        totalQuestions: 0
    });

    useEffect(() => {
        if (_isActive) {
            startTimeRef.current = Date.now();
            statsRef.current = { totalQuestions: 0 };
            /* eslint-disable-next-line react-hooks/set-state-in-effect -- reset when entering MemoryMarathon */
            setScore(0);
        }
    }, [_isActive]);

    const finishDrill = useCallback(() => {
        const timeElapsed = (Date.now() - startTimeRef.current) / 1000;
        const total = statsRef.current.totalQuestions;
        const correct = score;
        const safeTime = timeElapsed < 1 ? 1 : timeElapsed;
        // Memory drill is slower/harder, but let's keep consistent KPS estimator
        const kps = ((correct * 5) / safeTime).toFixed(1);
        const accuracy = total > 0 ? Math.round((correct / total) * 100) : 100;

        _onComplete({
            kps,
            accuracy,
            score,
            totalQuestions: total,
            correctQuestions: correct,
            timeTaken: `${Math.round(timeElapsed)}s`
        });
        _onFinish?.();
    }, [_onComplete, score, _onFinish]);

    const handleNextQuestion = useCallback(() => {
        statsRef.current.totalQuestions++;
        const val = parseFloat(currentCalculatorValue || '0');
        const ans = currentSum.answer as number;
        if (!isNaN(val) && Math.abs(val - ans) < 0.001) {
            setScore(s => s + 1);
        }
        setCurrentSum(generateSum('memory'));
        if (onQuestionComplete) onQuestionComplete();
    }, [currentCalculatorValue, currentSum, onQuestionComplete]);

    // For Memory drill, we DO NOT auto-advance on Enter because they might use it for intermediate steps
    // effectively, we just ignore the Enter key from a "submission" perspective

    return (
        <DrillActiveArea
            drillName="🧠 Memory Marathon"
            description="Use M+ / MRC. Press Next when done."
            currentProblem={currentSum}
            userKeystrokes={userKeystrokes}
            stats={{ kps: 0, accuracy: 100, score }}
            onSkip={() => {
                statsRef.current.totalQuestions++;
                setCurrentSum(generateSum('memory'));
                onQuestionComplete?.();
            }}
            onFinish={finishDrill}
            manualAdvance={true}
            onNextQuestion={handleNextQuestion}
            expectedKeystrokes={[]}
        />
    );
};

type StagePassedStats = {
    stageIndex: number;
    stageName: string;
    accuracy: number;
    score: number;
    totalQuestions: number;
    timeTaken: string;
    kps: string;
    isLastStage: boolean;
};

const StagePassedView = ({
    stats,
    nextStageName,
    onContinue,
    onFinish
}: {
    stats: StagePassedStats;
    nextStageName: string | null;
    onContinue: () => void;
    onFinish: () => void;
}) => (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full animate-in fade-in zoom-in-95 duration-300">
        <div className="flex-1 p-8 flex flex-col items-center justify-center gap-6">
            <div className="flex items-center gap-2 text-amber-500">
                <Sparkles className="w-8 h-8" />
                <span className="text-2xl font-bold text-amber-600">Stage passed!</span>
                <Sparkles className="w-8 h-8" />
            </div>
            <h2 className="text-3xl font-bold text-slate-800 text-center">Well done! 🎉</h2>
            <p className="text-slate-600 text-center max-w-sm">
                You crushed {stats.stageName}. {stats.accuracy === 100 ? "Perfect score!" : "Keep that momentum going!"}
            </p>

            <div className="grid grid-cols-2 gap-4 w-full max-w-xs mt-4">
                <div className="bg-indigo-50 p-4 rounded-xl flex flex-col items-center">
                    <Target className="w-5 h-5 text-indigo-600 mb-1" />
                    <span className="text-xl font-bold text-indigo-900">{stats.accuracy}%</span>
                    <span className="text-xs text-indigo-600 font-semibold uppercase tracking-wider">Accuracy</span>
                </div>
                <div className="bg-emerald-50 p-4 rounded-xl flex flex-col items-center">
                    <Trophy className="w-5 h-5 text-emerald-600 mb-1" />
                    <span className="text-xl font-bold text-emerald-900">{stats.score}/{stats.totalQuestions}</span>
                    <span className="text-xs text-emerald-600 font-semibold uppercase tracking-wider">Score</span>
                </div>
                <div className="bg-amber-50 p-4 rounded-xl flex flex-col items-center">
                    <Clock className="w-5 h-5 text-amber-600 mb-1" />
                    <span className="text-xl font-bold text-amber-900">{stats.timeTaken}</span>
                    <span className="text-xs text-amber-600 font-semibold uppercase tracking-wider">Time</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl flex flex-col items-center">
                    <span className="text-xl font-bold text-slate-800 pt-1">{stats.kps}</span>
                    <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">KPS</span>
                </div>
            </div>

            {stats.isLastStage ? (
                <p className="text-slate-600 text-center font-medium">You&apos;ve completed all stages! Incredible work. 🏆</p>
            ) : (
                <p className="text-slate-500 text-center text-sm">Next up: {nextStageName}</p>
            )}

            <div className="flex gap-4 w-full max-w-xs mt-4">
                {stats.isLastStage ? (
                    <button
                        onClick={onFinish}
                        className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold rounded-xl shadow-sm transition-colors"
                    >
                        Back to menu
                    </button>
                ) : (
                    <button
                        onClick={onContinue}
                        className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold rounded-xl shadow-sm transition-colors"
                    >
                        {nextStageName}
                        <ChevronRight className="w-5 h-5" />
                    </button>
                )}
            </div>
        </div>
    </div>
);

export const StagesDrill = ({
    onComplete,
    isActive,
    userKeystrokes,
    onQuestionComplete,
    onFinish,
    currentCalculatorValue,
    lastCalculated
}: DrillProps) => {
    const [currentStageIndex, setCurrentStageIndex] = useState(0);
    const [questionsAnswered, setQuestionsAnswered] = useState(0);
    const [correctCount, setCorrectCount] = useState(0);
    const [currentProblem, setCurrentProblem] = useState<{ text: string; answer: number }>(() => ({ text: '', answer: 0 }));
    const [stageFailed, setStageFailed] = useState(false);
    const [stagePassedStats, setStagePassedStats] = useState<StagePassedStats | null>(null);

    const startTimeRef = useRef<number>(0);
    const lastProcessedCalculation = useRef<number>(0);

    const stage = CALCULATOR_STAGES[currentStageIndex];
    const requiredAccuracy = stage?.requiredAccuracy ?? 100;
    const questionCount = stage?.questionCount ?? 5;
    const nextStage = CALCULATOR_STAGES[currentStageIndex + 1];

    useEffect(() => {
        if (isActive) {
            const startIndex = getHighestUnlockedStage();
            /* eslint-disable react-hooks/set-state-in-effect -- reset stages drill when entering */
            setCurrentStageIndex(startIndex);
            setQuestionsAnswered(0);
            setCorrectCount(0);
            setStageFailed(false);
            setStagePassedStats(null);
            const s = CALCULATOR_STAGES[startIndex];
            setCurrentProblem(s ? generateUCATStyleQuestion(s.difficulty) : { text: '0', answer: 0 });
            /* eslint-enable react-hooks/set-state-in-effect */
            startTimeRef.current = Date.now();
        }
    }, [isActive]);

    const advanceToNextQuestion = useCallback(() => {
        const s = CALCULATOR_STAGES[currentStageIndex];
        if (!s) return;
        setCurrentProblem(generateUCATStyleQuestion(s.difficulty));
        onQuestionComplete?.();
    }, [currentStageIndex, onQuestionComplete]);

    const handleStagePassed = useCallback((nextCorrect: number) => {
        setHighestUnlockedStage(currentStageIndex + 1);
        const timeElapsed = (Date.now() - startTimeRef.current) / 1000;
        const safeTime = timeElapsed < 1 ? 1 : timeElapsed;
        const kps = ((nextCorrect * 5) / safeTime).toFixed(1);
        const accuracyPct = questionCount > 0 ? (nextCorrect / questionCount) * 100 : 0;

        setStagePassedStats({
            stageIndex: currentStageIndex,
            stageName: stage?.name ?? 'Stage',
            accuracy: Math.round(accuracyPct),
            score: nextCorrect,
            totalQuestions: questionCount,
            timeTaken: `${Math.round(timeElapsed)}s`,
            kps,
            isLastStage: currentStageIndex >= CALCULATOR_STAGES.length - 1
        });
    }, [currentStageIndex, stage?.name, questionCount]);

    const handleContinueToNextStage = useCallback(() => {
        if (currentStageIndex >= CALCULATOR_STAGES.length - 1) return;
        setStagePassedStats(null);
        setCurrentStageIndex(prev => prev + 1);
        setQuestionsAnswered(0);
        setCorrectCount(0);
        const nextStageData = CALCULATOR_STAGES[currentStageIndex + 1];
        setCurrentProblem(nextStageData ? generateUCATStyleQuestion(nextStageData.difficulty) : { text: '0', answer: 0 });
        startTimeRef.current = Date.now();
        onQuestionComplete?.();
    }, [currentStageIndex, onQuestionComplete]);

    const handleFinishAllStages = useCallback(() => {
        if (!stagePassedStats) return;
        onComplete({
            kps: stagePassedStats.kps,
            accuracy: stagePassedStats.accuracy,
            score: stagePassedStats.score,
            totalQuestions: stagePassedStats.totalQuestions,
            correctQuestions: stagePassedStats.score,
            timeTaken: stagePassedStats.timeTaken,
            stagePassed: true,
            stageIndex: stagePassedStats.stageIndex,
            stageName: stagePassedStats.stageName
        });
        onFinish?.();
    }, [stagePassedStats, onComplete, onFinish]);

    useEffect(() => {
        if (!lastCalculated || lastCalculated === lastProcessedCalculation.current || !isActive || stageFailed || stagePassedStats) return;
        lastProcessedCalculation.current = lastCalculated;

        const expected = currentProblem.answer;
        const actual = parseFloat(currentCalculatorValue || '0');
        const isCorrect = !isNaN(actual) && Math.abs(actual - expected) < 0.001;

        const nextAnswered = questionsAnswered + 1;
        const nextCorrect = correctCount + (isCorrect ? 1 : 0);
        /* eslint-disable react-hooks/set-state-in-effect -- update stage progress when calculation validated */
        setQuestionsAnswered(nextAnswered);
        setCorrectCount(nextCorrect);
        /* eslint-enable react-hooks/set-state-in-effect */

        if (nextAnswered < questionCount) {
            advanceToNextQuestion();
        } else {
            const accuracyPct = questionCount > 0 ? (nextCorrect / questionCount) * 100 : 0;
            if (accuracyPct >= requiredAccuracy) {
                handleStagePassed(nextCorrect);
            } else {
                setStageFailed(true);
            }
        }
    }, [lastCalculated, currentCalculatorValue, currentProblem.answer, isActive, questionsAnswered, correctCount, questionCount, requiredAccuracy, currentStageIndex, stage?.name, stageFailed, stagePassedStats, advanceToNextQuestion, handleStagePassed]);

    const retryStage = useCallback(() => {
        setQuestionsAnswered(0);
        setCorrectCount(0);
        setStageFailed(false);
        const s = CALCULATOR_STAGES[currentStageIndex];
        setCurrentProblem(s ? generateUCATStyleQuestion(s.difficulty) : { text: '0', answer: 0 });
        onQuestionComplete?.();
    }, [currentStageIndex, onQuestionComplete]);

    const finishEarly = useCallback(() => {
        const timeElapsed = (Date.now() - startTimeRef.current) / 1000;
        const safeTime = timeElapsed < 1 ? 1 : timeElapsed;
        const kps = (correctCount * 5) / safeTime;
        onComplete({
            kps: kps.toFixed(1),
            accuracy: questionCount > 0 ? Math.round((correctCount / questionsAnswered) * 100) : 0,
            score: correctCount,
            totalQuestions: questionsAnswered,
            correctQuestions: correctCount,
            timeTaken: `${Math.round(timeElapsed)}s`,
            stagePassed: false
        });
        onFinish?.();
    }, [onComplete, onFinish, correctCount, questionsAnswered, questionCount]);

    if (!stage) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center text-slate-600">
                No stages configured.
            </div>
        );
    }

    if (stagePassedStats) {
        return (
            <StagePassedView
                stats={stagePassedStats}
                nextStageName={nextStage?.name ?? null}
                onContinue={handleContinueToNextStage}
                onFinish={handleFinishAllStages}
            />
        );
    }

    if (stageFailed) {
        const achievedPct = questionCount > 0 ? Math.round((correctCount / questionCount) * 100) : 0;
        return (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full animate-in fade-in zoom-in-95 duration-300">
                <div className="bg-slate-50 p-4 border-b border-slate-200">
                    <h3 className="font-bold text-slate-800">{stage.name}</h3>
                    <p className="text-xs text-slate-500">Stage not passed</p>
                </div>
                <div className="flex-1 p-8 flex flex-col items-center justify-center gap-6">
                    <p className="text-slate-600 text-center">
                        You got <strong>{achievedPct}%</strong> accuracy. You need {requiredAccuracy}% to pass. Keep practicing!
                    </p>
                    <button
                        onClick={retryStage}
                        className="px-6 py-3 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold rounded-lg shadow-sm transition-colors"
                    >
                        Retry stage
                    </button>
                </div>
            </div>
        );
    }

    const description = `Question ${questionsAnswered + 1} of ${questionCount} · ${requiredAccuracy}% to pass`;

    return (
        <DrillActiveArea
            drillName={`🎯 ${stage.name}`}
            description={description}
            currentProblem={currentProblem}
            userKeystrokes={userKeystrokes}
            stats={{ kps: 0, accuracy: 100, score: correctCount }}
            onSkip={() => {
                const newAnswered = questionsAnswered + 1;
                const newCorrect = correctCount;
                setQuestionsAnswered(newAnswered);
                if (newAnswered < questionCount) {
                    advanceToNextQuestion();
                } else {
                    const accuracyPct = questionCount > 0 ? (newCorrect / questionCount) * 100 : 0;
                    if (accuracyPct >= requiredAccuracy) {
                        handleStagePassed(newCorrect);
                    } else {
                        setStageFailed(true);
                    }
                }
            }}
            onFinish={finishEarly}
            expectedKeystrokes={getExpectedKeystrokes(currentProblem.text)}
        />
    );
};
