import { useEffect, useMemo, useRef } from 'react';
import { Timer, ArrowRight, RotateCcw } from 'lucide-react';
import { cn } from '../../lib/cn';

interface DrillActiveAreaProps {
    drillName: string;
    description: string;
    currentProblem: { text: string; answer: number | string };
    userKeystrokes: string[];
    stats?: { kps: number; accuracy: number; score: number; timeLeft?: number };
    onSkip: () => void;
    onReset?: () => void;
    onFinish?: () => void;
    expectedKeystrokes?: string[];
    manualAdvance?: boolean;
    onNextQuestion?: () => void;
}

export const DrillActiveArea = ({
    drillName,
    description,
    currentProblem,
    userKeystrokes,
    stats,
    onSkip,
    onReset,
    onFinish,
    expectedKeystrokes,
    manualAdvance,
    onNextQuestion
}: DrillActiveAreaProps) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const showManualNext = Boolean(manualAdvance && onNextQuestion);

    const progress = useMemo(() => {
        if (expectedKeystrokes && expectedKeystrokes.length > 0) {
            const matchCount = userKeystrokes.length;
            const total = expectedKeystrokes.length;
            return Math.min((matchCount / total) * 100, 100);
        }
        return 0;
    }, [userKeystrokes, expectedKeystrokes]);

    // Auto-scroll typing history
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
        }
    }, [userKeystrokes]);

    return (
        <div className="bg-card rounded-xl border border-border overflow-hidden flex flex-col h-full animate-in fade-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="bg-secondary p-4 border-b border-border flex justify-between items-center">
                <div>
                    <h3 className="font-bold text-foreground flex items-center gap-2">
                        {drillName}
                        {stats?.timeLeft !== undefined && (
                            <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${stats.timeLeft < 10 ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-slate-200 text-foreground'}`}>
                                <Timer className="w-3 h-3" />
                                {stats.timeLeft}s
                            </span>
                        )}
                    </h3>
                    <p className="text-xs text-muted-foreground">{description}</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <div className="text-xs text-muted-foreground uppercase tracking-wider">Score</div>
                        <div className="font-mono font-bold text-lg text-primary">{stats?.score || 0}</div>
                    </div>
                </div>
            </div>

            {/* Main Display Area */}
            <div className="flex-1 p-8 flex flex-col justify-center items-center bg-white relative">
                <div className="text-xs text-muted-foreground uppercase tracking-widest mb-2 font-semibold">Calculate</div>
                <div className="text-5xl md:text-6xl font-mono font-bold text-foreground tracking-tight mb-8">
                    {currentProblem.text}
                </div>

                {/* Expected Keystrokes Hint */}
                {expectedKeystrokes && expectedKeystrokes.length > 0 && (
                    <div className="mb-8">
                        <div className="text-[10px] text-muted-foreground uppercase tracking-widest text-center mb-2">Expected Keystrokes</div>
                        <div className="flex flex-wrap justify-center gap-2">
                            {expectedKeystrokes.map((key, i) => (
                                <div
                                    key={i}
                                    className={`
                                        w-8 h-8 flex items-center justify-center rounded border text-sm font-bold font-mono transition-all duration-200
                                        ${i < userKeystrokes.length
                                            ? (userKeystrokes[i] === key || (key === 'Enter' && userKeystrokes[i] === '='))
                                                ? 'bg-emerald-50 border-emerald-200 text-emerald-600' // Correct
                                                : 'bg-red-50 border-red-200 text-red-600' // Wrong
                                            : 'bg-secondary border-border text-muted-foreground'} // Not reached
                                    `}
                                >
                                    {key === 'Enter' ? '⏎' : key === 'Backspace' ? '⌫' : key}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* User Typing Display */}
                <div className="w-full max-w-lg">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1 px-1">
                        <span>Your Typing</span>
                        <span>{userKeystrokes.length} keystrokes</span>
                    </div>
                    <div
                        className="bg-secondary border-2 border-border rounded-lg p-3 h-14 flex items-center overflow-x-auto gap-2 no-scrollbar scroll-smooth"
                        ref={scrollRef}
                    >
                        {userKeystrokes.length === 0 && (
                            <span className="text-slate-300 italic text-sm pl-1">Start typing...</span>
                        )}
                        {userKeystrokes.map((key, i) => (
                            <span key={i} className="px-2 py-1 bg-card border border-border rounded text-sm font-mono text-foreground whitespace-nowrap min-w-[1.5rem] text-center">
                                {key === 'Enter' ? '⏎' : key === 'Backspace' ? '⌫' : key}
                            </span>
                        ))}
                    </div>

                    {/* Progress Bar */}
                    <div className="h-1 w-full bg-secondary mt-2 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-primary transition-all duration-300 ease-out"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 bg-secondary border-t border-border flex justify-between items-center">
                {onReset && (
                    <button
                        type="button"
                        onClick={onReset}
                        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-red-500 transition-colors px-3 py-1.5 rounded-md hover:bg-secondary"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Reset Session
                    </button>
                )}
                <button
                    type="button"
                    onClick={onSkip}
                    className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground px-4 py-2 hover:bg-secondary rounded-lg transition-colors"
                >
                    Skip
                </button>
                {showManualNext && onNextQuestion && (
                    <button
                        type="button"
                        onClick={onNextQuestion}
                        className="ml-auto flex min-h-[44px] items-center gap-2 rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 hover:shadow group"
                    >
                        Next Question
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" aria-hidden />
                    </button>
                )}
                {onFinish && (
                    <button
                        type="button"
                        onClick={onFinish}
                        className={cn(
                            'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                            showManualNext
                                ? 'ml-2 border border-primary/40 bg-background text-primary hover:bg-primary/10'
                                : 'ml-auto bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow',
                        )}
                    >
                        Finish
                    </button>
                )}
            </div>
        </div>
    );
};
