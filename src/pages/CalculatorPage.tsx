import { useState, useEffect, useCallback } from 'react';
import { CalculatorEngine } from '../components/calculator/CalculatorEngine';
import { AnalyticsDashboard } from '../components/calculator/AnalyticsDashboard';
import { SprintDrill, FingerTwisterDrill, MemoryMarathonDrill, StagesDrill } from '../components/calculator/DrillModes';
import type { Difficulty } from '../components/calculator/DrillModes';
import { ArrowLeft, Clock, Activity, Brain, Trash2, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getHistory, saveSession, getAggregatedStats, clearHistory } from '../utils/analyticsStorage';
import type { GameSession } from '../utils/analyticsStorage';

type LastDrillStats = {
  drillName?: string;
  kps?: string;
  accuracy?: number;
  score?: number;
  totalQuestions?: number;
  correctQuestions?: number;
  timeTaken?: string;
  bestKey?: string | null;
  worstKey?: string | null;
  stageName?: string;
};
import { calculateLevel } from '../utils/xpSystem';
import { KeyHeatmap } from '../components/calculator/KeyHeatmap';
import { ShortcutsModal } from '../components/calculator/ShortcutsModal';
import { Keyboard } from 'lucide-react';
import { DrillSummary } from '../components/calculator/DrillSummary';
import { trackEvent, setActiveTrainer, clearActiveTrainer } from '../lib/analytics';

const MOBILE_NOTICE_KEY = 'calculator-mobile-notice-dismissed';

function MobileDesktopNotice() {
    const [dismissed, setDismissed] = useState(() => {
        if (typeof sessionStorage === 'undefined') return false;
        return sessionStorage.getItem(MOBILE_NOTICE_KEY) === '1';
    });
    const handleDismiss = () => {
        setDismissed(true);
        sessionStorage.setItem(MOBILE_NOTICE_KEY, '1');
    };
    if (dismissed) return null;
    return (
        <div className="order-first lg:order-none col-span-full block lg:hidden bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-amber-900">
                    This calculator trainer is best done on a desktop computer with a keyboard to practice real UCAT conditions. It is not ideal on mobile.
                </p>
            </div>
            <button
                type="button"
                onClick={handleDismiss}
                className="flex-shrink-0 p-1 rounded hover:bg-amber-100 text-amber-700"
                aria-label="Dismiss"
            >
                <X className="w-5 h-5" />
            </button>
        </div>
    );
}

type DrillType = 'sprint' | 'fingerTwister' | 'memory' | 'stages' | null;

const CalculatorPage = () => {
    const [lagEnabled, setLagEnabled] = useState(false);
    const [isFocused, setIsFocused] = useState(true);
    const [activeDrill, setActiveDrill] = useState<DrillType>(null);
    const [difficulty, setDifficulty] = useState<Difficulty>('easy');
    const [history, setHistory] = useState<GameSession[]>([]);
    const [aggregates, setAggregates] = useState({ averageKps: 0, averageAccuracy: 0, totalSessions: 0 });
    const [lastDrillStats, setLastDrillStats] = useState<LastDrillStats | null>(null);

    const { level, progress, rank } = calculateLevel(aggregates.totalSessions, aggregates.averageAccuracy);

    // New UX State
    const [userKeystrokes, setUserKeystrokes] = useState<string[]>([]);
    const [shortcutsOpen, setShortcutsOpen] = useState(false);
    const [calculatorState, setCalculatorState] = useState<{ display: string; currentValue: number | null; lastCalculated?: number }>({ display: '0', currentValue: null });

    // Reset keystrokes when drill changes
    useEffect(() => {
        setUserKeystrokes([]);
    }, [activeDrill]);

    // Analytics: trainer_opened on mount
    useEffect(() => {
        trackEvent("trainer_opened", {
            training_type: "calculator",
            pathname: "/train/calculator",
        });
    }, []);

    // Analytics: trainer_started and trainer_mode_selected when drill starts
    useEffect(() => {
        if (activeDrill) {
            trackEvent("trainer_started", {
                training_type: "calculator",
                mode: activeDrill,
                difficulty,
            });
            trackEvent("trainer_mode_selected", {
                training_type: "calculator",
                mode: activeDrill,
                difficulty,
            });
            setActiveTrainer("calculator", activeDrill);
        }
    }, [activeDrill, difficulty]);

    const handleCalculatorInput = useCallback((key: string) => {
        if (activeDrill) {
            setUserKeystrokes(prev => [...prev, key]);
        }
    }, [activeDrill]);

    const handleResetKeystrokes = useCallback(() => {
        setUserKeystrokes([]);
    }, []);

    const loadData = useCallback(() => {
        const hist = getHistory();
        setHistory(hist.reverse());
        setAggregates(getAggregatedStats());
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleDrillComplete = useCallback((stats: LastDrillStats) => {
        clearActiveTrainer();
        const mode: GameSession['mode'] = activeDrill ?? 'free';
        const sessionData: Omit<GameSession, 'id' | 'date'> = {
            kps: parseFloat(stats.kps ?? '0'),
            accuracy: stats.accuracy ?? 0,
            mode,
            correctQuestions: stats.correctQuestions,
            totalQuestions: stats.totalQuestions,
            timeTaken: stats.timeTaken
        };
        saveSession(sessionData);
        loadData();
        setLastDrillStats({ ...stats, drillName: activeDrill ?? undefined });
        setActiveDrill(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadData intentionally omitted to avoid loop
    }, [activeDrill]);

    const handleRetry = () => {
        const drill = lastDrillStats?.drillName;
        setLastDrillStats(null);
        setActiveDrill(drill && (drill === 'sprint' || drill === 'fingerTwister' || drill === 'memory' || drill === 'stages') ? drill : null);
    };


    const handleMenu = () => {
        setLastDrillStats(null);
        setActiveDrill(null);
    };

    const handleClearHistory = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('Clear all progress history?')) {
            clearHistory();
            loadData();
        }
    };

    const chartData = history.slice().reverse().map((h, i) => ({
        name: `Session ${i + 1}`,
        kps: h.kps,
        accuracy: h.accuracy
    }));

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col" onClick={() => setIsFocused(true)}>
            {/* Header */}
            <div className="bg-white shadow-sm p-4 flex items-center justify-between z-10">
                <div className="flex items-center gap-4">
                    <Link to="/" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <ArrowLeft className="w-6 h-6 text-slate-600" />
                    </Link>
                    <h1 className="text-xl font-bold text-slate-800">UCAT Mastery Engine</h1>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={() => setShortcutsOpen(true)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-sm font-medium transition-colors"
                    >
                        <Keyboard className="w-4 h-4" />
                        Shortcuts
                    </button>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-600">Pearson Lag (40ms)</span>
                        <button
                            className={`w-12 h-6 rounded-full p-1 transition-colors ${lagEnabled ? 'bg-blue-600' : 'bg-slate-300'}`}
                            onClick={(e) => { e.stopPropagation(); setLagEnabled(!lagEnabled); }}
                        >
                            <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${lagEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                        </button>
                    </div>
                </div>
            </div>

            <div className={`flex-1 p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-[1600px] mx-auto w-full`}>
                {/* Mobile-only notice: best on desktop with keyboard */}
                <MobileDesktopNotice />

                {/* Left column part 1: XP + Drills — mobile order 1, desktop col 1 row 1 */}
                <div className="order-1 lg:col-span-4 lg:col-start-1 lg:row-start-1 space-y-6">
                    {/* XP Banner */}
                    <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl shadow-sm p-6 text-white relative overflow-hidden">
                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h2 className="text-2xl font-bold">{rank}</h2>
                                    <p className="text-indigo-100 text-sm">Level {level}</p>
                                </div>
                                <div className="text-3xl">🏆</div>
                            </div>
                            <div className="w-full bg-indigo-800/50 rounded-full h-2 mt-2">
                                <div className="bg-white/90 h-2 rounded-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                            </div>
                            <p className="text-xs text-indigo-200 mt-1 text-right">{progress}% to Level {level + 1}</p>
                        </div>
                        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
                        <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-16 h-16 bg-white/10 rounded-full blur-lg"></div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <Brain className="w-5 h-5 text-indigo-600" />
                            Targeted Drills
                        </h2>
                        <div className="flex p-1 bg-slate-100 rounded-lg mb-4">
                            {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
                                <button
                                    key={d}
                                    onClick={() => setDifficulty(d)}
                                    className={`flex-1 py-1.5 text-sm font-medium rounded-md capitalize transition-all ${difficulty === d ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    {d}
                                </button>
                            ))}
                        </div>
                        <div className="space-y-2">
                            <button
                                onClick={(e) => { e.stopPropagation(); setLastDrillStats(null); setActiveDrill('sprint'); }}
                                className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors border ${activeDrill === 'sprint' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'hover:bg-slate-50 text-slate-700 border-slate-200'}`}
                            >
                                🏃 The Sprint (Speed)
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); setLastDrillStats(null); setActiveDrill('fingerTwister'); }}
                                className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors border ${activeDrill === 'fingerTwister' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'hover:bg-slate-50 text-slate-700 border-slate-200'}`}
                            >
                                🌪️ Finger Twister
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); setLastDrillStats(null); setActiveDrill('stages'); }}
                                className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors border ${activeDrill === 'stages' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'hover:bg-slate-50 text-slate-700 border-slate-200'}`}
                            >
                                🎯 UCAT Ready (Stages)
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); setLastDrillStats(null); setActiveDrill('memory'); }}
                                className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors border ${activeDrill === 'memory' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'hover:bg-slate-50 text-slate-700 border-slate-200'}`}
                            >
                                🧠 Memory Marathon
                            </button>
                        </div>
                    </div>
                </div>

                {/* Center: Calculator Playground — mobile order 2, desktop col 2 span 2 rows */}
                <div className="order-2 lg:col-span-8 lg:col-start-5 lg:row-start-1 lg:row-span-2 flex flex-col xl:flex-row gap-6 items-start">

                    {/* Active Drill Area */}
                    <div className="flex-1 w-full xl:w-7/12 min-h-[500px] flex flex-col">
                        {activeDrill && (
                            <>
                                {activeDrill === 'sprint' && <SprintDrill isActive={true} onComplete={handleDrillComplete} userKeystrokes={userKeystrokes} onQuestionComplete={handleResetKeystrokes} currentCalculatorValue={calculatorState.display} difficulty={difficulty} lastCalculated={calculatorState.lastCalculated} />}
                                {activeDrill === 'fingerTwister' && <FingerTwisterDrill isActive={true} onComplete={handleDrillComplete} userKeystrokes={userKeystrokes} onQuestionComplete={handleResetKeystrokes} currentCalculatorValue={calculatorState.display} difficulty={difficulty} lastCalculated={calculatorState.lastCalculated} />}
                                {activeDrill === 'stages' && <StagesDrill isActive={true} onComplete={handleDrillComplete} userKeystrokes={userKeystrokes} onQuestionComplete={handleResetKeystrokes} currentCalculatorValue={calculatorState.display} difficulty={difficulty} lastCalculated={calculatorState.lastCalculated} />}
                                {activeDrill === 'memory' && <MemoryMarathonDrill isActive={true} onComplete={handleDrillComplete} userKeystrokes={userKeystrokes} onQuestionComplete={handleResetKeystrokes} currentCalculatorValue={calculatorState.display} difficulty={difficulty} lastCalculated={calculatorState.lastCalculated} />}
                            </>
                        )}

                        {!activeDrill && lastDrillStats && (
                            <DrillSummary
                                drillName={
                                    lastDrillStats.drillName === 'sprint'
                                        ? 'The Sprint'
                                        : lastDrillStats.drillName === 'fingerTwister'
                                            ? 'Finger Twister'
                                            : lastDrillStats.drillName === 'memory'
                                                ? 'Memory Marathon'
                                                : lastDrillStats.drillName === 'stages'
                                                    ? (lastDrillStats.stageName ?? 'UCAT Ready (Stages)')
                                                    : (lastDrillStats.drillName ?? 'Drill')
                                }
                                score={lastDrillStats.score ?? 0}
                                totalQuestions={lastDrillStats.totalQuestions ?? 0}
                                correctQuestions={lastDrillStats.correctQuestions ?? 0}
                                timeTaken={lastDrillStats.timeTaken ?? '60s'}
                                kps={lastDrillStats.kps ?? ''}
                                bestKey={lastDrillStats.bestKey ?? undefined}
                                worstKey={lastDrillStats.worstKey ?? undefined}
                                onRetry={handleRetry}
                                onMenu={handleMenu}
                            />
                        )}
                    </div>

                    <div className={`flex flex-col items-center justify-center bg-white rounded-xl shadow-sm p-4 md:p-6 min-h-[420px] relative border border-slate-100 transition-all duration-300 ${activeDrill ? 'w-full xl:w-5/12' : 'w-full xl:w-5/12'}`}>

                        {/* Click catcher for focus loss simulation */}
                        <div
                            className="absolute inset-0 z-0"
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsFocused(false);
                            }}
                        ></div>

                        {/* Calculator Wrapper */}
                        <div className="z-10" onClick={(e) => { e.stopPropagation(); setIsFocused(true); }}>
                            <CalculatorEngine
                                lagEnabled={lagEnabled}
                                active={isFocused}
                                onInput={handleCalculatorInput}
                                onStateChange={setCalculatorState}
                            />
                        </div>

                        <div className="mt-8 text-center max-w-md text-slate-400 text-sm z-10 pointer-events-none">
                            <p className="flex items-center gap-2 justify-center mb-2">
                                <Clock className="w-4 h-4" />
                                <span>{activeDrill ? 'Drill Active' : 'Practice Mode'}</span>
                            </p>
                            {!activeDrill && !lastDrillStats && <p>Select a drill from the left or just practice freely.</p>}
                        </div>

                    </div>
                </div>

                {/* Stats — mobile order 3 (bottom), desktop col 1 row 2 */}
                <div className="order-3 lg:col-span-4 lg:col-start-1 lg:row-start-2">
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                <Activity className="w-5 h-5 text-emerald-600" />
                                Stats (Avg)
                            </h2>
                            <button onClick={handleClearHistory} className="text-slate-400 hover:text-red-500" title="Clear History">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className="bg-slate-50 p-4 rounded-lg text-center">
                                <div className="text-2xl font-bold text-slate-800">{aggregates.averageKps}</div>
                                <div className="text-xs text-slate-500 uppercase tracking-wide">Avg KPS</div>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-lg text-center">
                                <div className="text-2xl font-bold text-slate-800">{aggregates.averageAccuracy}%</div>
                                <div className="text-xs text-slate-500 uppercase tracking-wide">Accuracy</div>
                            </div>
                        </div>
                        <AnalyticsDashboard data={chartData} />
                        <KeyHeatmap />
                    </div>
                </div>

            </div>

            <ShortcutsModal isOpen={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
        </div>
    );
};

export default CalculatorPage;
