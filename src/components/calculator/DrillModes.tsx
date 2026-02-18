import { useState, useEffect, useRef, useCallback } from "react";

import { DrillActiveArea } from './DrillActiveArea';

export type Difficulty = 'easy' | 'medium' | 'hard';

interface DrillProps {
    onComplete: (score: any) => void;
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
    const a = Math.floor(Math.random() * maxA) + 1;
    const b = Math.floor(Math.random() * maxB) + 1;

    // Ensure clean division
    if (op === '/') {
        const prod = a * b;
        return { text: `${prod} ÷ ${a}`, answer: b };
    }

    let ans = 0;
    if (op === '+') ans = a + b;
    if (op === '-') ans = a - b;
    if (op === '*') ans = a * b;

    return { text: `${a} ${op === '/' ? '÷' : op === '*' ? '×' : op} ${b}`, answer: ans };
};

const getExpectedKeystrokes = (text: string): string[] => {
    const tokens = text.match(/(\d+|\+|\-|\*|\/|x|÷)/g);
    if (!tokens) return [];

    const keys: string[] = [];
    tokens.forEach(token => {
        if (/\d+/.test(token)) {
            keys.push(...token.split(''));
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
    const [displayScore, setDisplayScore] = useState(0);

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


    const finishDrill = useCallback(() => {
        const { score, totalQuestions, keyStats } = statsRef.current;

        // Calculate best/worst keys
        let bestKey = '-';
        let worstKey = '-';
        let bestRate = -1;
        let worstRate = 2; // > 1

        Object.entries(keyStats).forEach(([key, stat]) => {
            if (stat.total < 2) return; // Need at least 2 attempts
            const rate = stat.correct / stat.total;

            // If we have a tie, prefer the one with more attempts
            if (rate > bestRate || (rate === bestRate && stat.total > (keyStats[bestKey]?.total || 0))) {
                bestRate = rate;
                bestKey = key;
            }
            if (rate < worstRate || (rate === worstRate && stat.total > (keyStats[worstKey]?.total || 0))) {
                worstRate = rate;
                worstKey = key;
            }
        });

        // Key-by-key accuracy
        let totalKeys = 0;
        let correctKeys = 0;
        Object.values(keyStats).forEach(s => {
            totalKeys += s.total;
            correctKeys += s.correct;
        });
        const keyAccuracy = totalKeys > 0 ? Math.round((correctKeys / totalKeys) * 100) : 100;

        onComplete({
            kps: (score / 60 * 5).toFixed(1),
            accuracy: keyAccuracy, // User requested strict key accuracy
            score,
            totalQuestions,
            correctQuestions: statsRef.current.correctQuestions,
            timeTaken: "60s",
            bestKey: bestKey !== '-' ? `${bestKey} (${Math.round(bestRate * 100)}%)` : '-',
            worstKey: worstKey !== '-' ? `${worstKey} (${Math.round(worstRate * 100)}%)` : '-'
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

export const FingerTwisterDrill = ({ onComplete: _onComplete, isActive: _isActive, userKeystrokes, onQuestionComplete, onFinish: _onFinish, currentCalculatorValue, difficulty, lastCalculated }: DrillProps) => {
    // Generate numbers that are physically far (1 -> 9, 7 -> 3)
    const [currentSum, setCurrentSum] = useState({ text: '1 + 9', answer: 10 });
    const [score, setScore] = useState(0); // This serves as correct questions count

    const startTimeRef = useRef<number>(Date.now());
    const statsRef = useRef({
        totalQuestions: 0,
        keystrokes: 0
    });

    // Reset start time when drill becomes active
    useEffect(() => {
        if (_isActive) {
            startTimeRef.current = Date.now();
            statsRef.current = { totalQuestions: 0, keystrokes: 0 };
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
        if (_onFinish) _onFinish();
    }, [_onComplete, score, _onFinish]);

    const lastProcessedCalculation = useRef<number>(0);

    useEffect(() => {
        if (!lastCalculated || lastCalculated === lastProcessedCalculation.current || !_isActive) return;
        lastProcessedCalculation.current = lastCalculated;

        statsRef.current.totalQuestions++;
        const expected = currentSum.answer;
        const actual = parseFloat(currentCalculatorValue || '0');
        if (Math.abs(actual - expected) < 0.0001) {
            setScore(s => s + 1);
        }
        // ALWAYS advance
        setCurrentSum(generateSum(difficulty));
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

export const GhostDrill = ({ onComplete: _onComplete, isActive: _isActive, userKeystrokes, onQuestionComplete, onFinish: _onFinish, currentCalculatorValue, difficulty, lastCalculated }: DrillProps) => {
    const [currentSum, setCurrentSum] = useState(generateSum(difficulty));
    const [score, setScore] = useState(0);

    const startTimeRef = useRef<number>(Date.now());
    const statsRef = useRef({
        totalQuestions: 0
    });

    useEffect(() => {
        if (_isActive) {
            startTimeRef.current = Date.now();
            statsRef.current = { totalQuestions: 0 };
            setScore(0);
        }
    }, [_isActive]);

    const finishDrill = useCallback(() => {
        const timeElapsed = (Date.now() - startTimeRef.current) / 1000;
        const total = statsRef.current.totalQuestions;
        const correct = score;
        const safeTime = timeElapsed < 1 ? 1 : timeElapsed;
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
        if (_onFinish) _onFinish();
    }, [_onComplete, score, _onFinish]);

    const lastProcessedCalculation = useRef<number>(0);

    useEffect(() => {
        if (!lastCalculated || lastCalculated === lastProcessedCalculation.current || !_isActive) return;
        lastProcessedCalculation.current = lastCalculated;

        statsRef.current.totalQuestions++;
        const expected = currentSum.answer;
        const actual = parseFloat(currentCalculatorValue || '0');
        if (Math.abs(actual - expected) < 0.0001) {
            setScore(s => s + 1);
        }
        // ALWAYS advance
        setCurrentSum(generateSum(difficulty));
        onQuestionComplete?.();
    }, [lastCalculated, currentCalculatorValue, currentSum, difficulty, onQuestionComplete, _isActive]);

    return (
        <DrillActiveArea
            drillName="👻 Ghost Drill"
            description="Display Hidden. Trust your fingers."
            currentProblem={currentSum}
            userKeystrokes={userKeystrokes}
            stats={{ kps: 0, accuracy: 100, score }}
            onSkip={() => {
                statsRef.current.totalQuestions++;
                setCurrentSum(generateSum('medium'));
                onQuestionComplete?.();
            }}
            onFinish={finishDrill}
            expectedKeystrokes={getExpectedKeystrokes(currentSum.text)}
        />
    );
};

export const MemoryMarathonDrill = ({ onComplete: _onComplete, isActive: _isActive, userKeystrokes, onQuestionComplete, onFinish: _onFinish, currentCalculatorValue, difficulty: _difficulty, lastCalculated: _lastCalculated }: DrillProps) => {
    const [currentSum, setCurrentSum] = useState(generateSum('memory'));
    const [score, setScore] = useState(0);

    const startTimeRef = useRef<number>(Date.now());
    const statsRef = useRef({
        totalQuestions: 0
    });

    useEffect(() => {
        if (_isActive) {
            startTimeRef.current = Date.now();
            statsRef.current = { totalQuestions: 0 };
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
    }, [_onComplete, score]);

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
