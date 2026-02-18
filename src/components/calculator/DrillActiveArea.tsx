import { useEffect, useRef, useState } from 'react';
import { Timer, ArrowRight, RotateCcw } from 'lucide-react';

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
    const [progress, setProgress] = useState(0);

    // Auto-scroll typing history
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
        }
    }, [userKeystrokes]);

    // Calculate progress based on expected keystrokes matches (simple heuristic)
    useEffect(() => {
        if (expectedKeystrokes && expectedKeystrokes.length > 0) {
            // This is a naive visual progress, real accuracy logic is in the drill component
            const matchCount = userKeystrokes.length;
            const total = expectedKeystrokes.length;
            setProgress(Math.min((matchCount / total) * 100, 100));
        } else {
            setProgress(0);
        }
    }, [userKeystrokes, expectedKeystrokes]);

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full animate-in fade-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center">
                <div>
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        {drillName}
                        {stats?.timeLeft !== undefined && (
                            <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${stats.timeLeft < 10 ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-slate-200 text-slate-700'}`}>
                                <Timer className="w-3 h-3" />
                                {stats.timeLeft}s
                            </span>
                        )}
                    </h3>
                    <p className="text-xs text-slate-500">{description}</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <div className="text-xs text-slate-500 uppercase tracking-wider">Score</div>
                        <div className="font-mono font-bold text-lg text-indigo-600">{stats?.score || 0}</div>
                    </div>
                </div>
            </div>

            {/* Main Display Area */}
            <div className="flex-1 p-8 flex flex-col justify-center items-center bg-white relative">
                <div className="text-xs text-slate-400 uppercase tracking-widest mb-2 font-semibold">Calculate</div>
                <div className="text-5xl md:text-6xl font-mono font-bold text-slate-900 tracking-tight mb-8">
                    {currentProblem.text}
                </div>

                {/* Expected Keystrokes Hint */}
                {expectedKeystrokes && expectedKeystrokes.length > 0 && (
                    <div className="mb-8">
                        <div className="text-[10px] text-slate-400 uppercase tracking-widest text-center mb-2">Expected Keystrokes</div>
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
                                            : 'bg-slate-50 border-slate-200 text-slate-400'} // Not reached
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
                    <div className="flex justify-between text-xs text-slate-500 mb-1 px-1">
                        <span>Your Typing</span>
                        <span>{userKeystrokes.length} keystrokes</span>
                    </div>
                    <div
                        className="bg-slate-50 border-2 border-slate-100 rounded-lg p-3 h-14 flex items-center overflow-x-auto gap-2 no-scrollbar scroll-smooth"
                        ref={scrollRef}
                    >
                        {userKeystrokes.length === 0 && (
                            <span className="text-slate-300 italic text-sm pl-1">Start typing...</span>
                        )}
                        {userKeystrokes.map((key, i) => (
                            <span key={i} className="px-2 py-1 bg-white border border-slate-200 rounded shadow-sm text-sm font-mono text-slate-700 whitespace-nowrap min-w-[1.5rem] text-center">
                                {key === 'Enter' ? '⏎' : key === 'Backspace' ? '⌫' : key}
                            </span>
                        ))}
                    </div>

                    {/* Progress Bar */}
                    <div className="h-1 w-full bg-slate-100 mt-2 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-indigo-500 transition-all duration-300 ease-out"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
                {onReset && (
                    <button
                        onClick={onReset}
                        className="flex items-center gap-2 text-sm text-slate-500 hover:text-red-500 transition-colors px-3 py-1.5 rounded-md hover:bg-slate-100"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Reset Session
                    </button>
                )}
                <button
                    onClick={onSkip}
                    className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-700 px-4 py-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                    Skip
                </button>
                {manualAdvance && onNextQuestion && (
                    <button
                        onClick={onNextQuestion}
                        className="ml-auto flex items-center gap-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-6 py-2 rounded-lg transition-colors shadow-sm hover:shadow group"
                    >
                        Next Question
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                )}
                {!manualAdvance && (
                    <button
                        onClick={onSkip} // Fallback if no manual advance but using this UI
                        className="ml-auto flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors hidden"
                    >
                        Skip
                    </button>
                )}
                {onFinish && (
                    <button
                        onClick={onFinish}
                        className="ml-2 flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-800 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                        Finish
                    </button>
                )}
            </div>
        </div>
    );
};
