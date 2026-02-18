import { RefreshCw, Menu, Trophy, Target, Clock, AlertCircle } from 'lucide-react';

interface DrillSummaryProps {
    drillName: string;
    score: number;
    totalQuestions: number;
    correctQuestions: number;
    timeTaken: string; // e.g. "60s"
    kps: string;
    bestKey?: string;
    worstKey?: string;
    onRetry: () => void;
    onMenu: () => void;
}

export const DrillSummary = ({
    drillName,
    score,
    totalQuestions,
    correctQuestions,
    timeTaken,
    kps,
    bestKey,
    worstKey,
    onRetry,
    onMenu
}: DrillSummaryProps) => {
    const accuracy = totalQuestions > 0 ? Math.round((correctQuestions / totalQuestions) * 100) : 0;

    return (
        <div className="flex flex-col items-center justify-center p-8 bg-white rounded-xl shadow-lg border border-slate-200 animate-in zoom-in-95 duration-300 max-w-xl mx-auto w-full">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">{drillName} Complete!</h2>
            <p className="text-slate-500 mb-8">Here's how you performed.</p>

            <div className="grid grid-cols-2 gap-4 w-full mb-8">
                <div className="bg-indigo-50 p-4 rounded-xl flex flex-col items-center">
                    <Trophy className="w-6 h-6 text-indigo-600 mb-2" />
                    <span className="text-2xl font-bold text-indigo-900">{score}</span>
                    <span className="text-xs text-indigo-600 font-semibold uppercase tracking-wider">Score</span>
                </div>
                <div className="bg-emerald-50 p-4 rounded-xl flex flex-col items-center">
                    <Target className="w-6 h-6 text-emerald-600 mb-2" />
                    <span className="text-2xl font-bold text-emerald-900">{accuracy}%</span>
                    <span className="text-xs text-emerald-600 font-semibold uppercase tracking-wider">Accuracy</span>
                </div>
                <div className="bg-amber-50 p-4 rounded-xl flex flex-col items-center">
                    <Clock className="w-6 h-6 text-amber-600 mb-2" />
                    <span className="text-2xl font-bold text-amber-900">{timeTaken}</span>
                    <span className="text-xs text-amber-600 font-semibold uppercase tracking-wider">Time</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl flex flex-col items-center">
                    <span className="text-2xl font-bold text-slate-800 pt-2">{kps}</span>
                    <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider mt-auto">KPS</span>
                </div>
            </div>

            <div className="w-full space-y-4 mb-8">
                {bestKey && (
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <span className="text-sm font-medium text-slate-600">Best Key</span>
                        <span className="font-mono font-bold text-emerald-600 bg-emerald-100 px-2 py-1 rounded">{bestKey}</span>
                    </div>
                )}
                {worstKey && (
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <span className="text-sm font-medium text-slate-600">Needs Work</span>
                        <span className="font-mono font-bold text-red-600 bg-red-100 px-2 py-1 rounded">{worstKey}</span>
                    </div>
                )}
                {!bestKey && !worstKey && (
                    <div className="flex items-center gap-2 p-3 bg-blue-50 text-blue-700 rounded-lg text-sm">
                        <AlertCircle className="w-4 h-4" />
                        <span>Keep practicing to generate key stats!</span>
                    </div>
                )}
            </div>

            <div className="flex gap-4 w-full">
                <button
                    onClick={onMenu}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors"
                >
                    <Menu className="w-4 h-4" />
                    Menu
                </button>
                <button
                    onClick={onRetry}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors shadow-sm hover:shadow"
                >
                    <RefreshCw className="w-4 h-4" />
                    Retry
                </button>
            </div>
        </div>
    );
};
