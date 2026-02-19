import { useState, useRef, useEffect, useMemo } from "react";
import { useIsMobile } from "../../hooks/useIsMobile";
import { clampChunkSize } from "../../lib/guidedChunkingPreferences";

const DEFAULT_TEXT =
  "The quick brown fox jumps over the lazy dog. Reading at a steady pace improves comprehension and retention. Practice with TheUKCATPeople to build your speed and accuracy. Some people say all experts must agree; many often could argue that never always works.";

const WPM_MIN = 100;
const WPM_MAX = 900;
const WPM_STORAGE_KEY = "ukcat-reader-wpm";
const SHOW_TIMER_STORAGE_KEY = "ukcat-reader-show-timer";
const HIGHLIGHT_WORDS_STORAGE_KEY = "ukcat-reader-highlight-words";

function clampWpm(value: number): number {
  return Math.min(WPM_MAX, Math.max(WPM_MIN, value));
}

function getInitialWpm(): number {
  if (typeof window === "undefined") return 300;
  const stored = localStorage.getItem(WPM_STORAGE_KEY);
  if (stored == null) return 300;
  const parsed = parseInt(stored, 10);
  return Number.isFinite(parsed) ? clampWpm(parsed) : 300;
}

function getStoredShowTimer(): boolean {
  if (typeof window === "undefined") return true;
  const v = localStorage.getItem(SHOW_TIMER_STORAGE_KEY);
  if (v === "false") return false;
  return true;
}

function getStoredHighlightWords(): boolean {
  if (typeof window === "undefined") return true;
  const v = localStorage.getItem(HIGHLIGHT_WORDS_STORAGE_KEY);
  if (v === "false") return false;
  return true;
}

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export type ReaderFinishOpts = {
  timeSpentSeconds: number;
  usedOvertime?: boolean;
};

type ReaderEngineProps = {
  text?: string;
  initialWpm?: number;
  onFinish?: (wpm: number, opts?: ReaderFinishOpts) => void;
  passageTitle?: string;
  wordCount?: number;
  guidedChunkingEnabled?: boolean;
  chunkSize?: number;
};

export default function ReaderEngine({
  text = DEFAULT_TEXT,
  initialWpm,
  onFinish,
  passageTitle,
  wordCount: wordCountProp,
  guidedChunkingEnabled = false,
  chunkSize,
}: ReaderEngineProps) {
  const isMobile = useIsMobile();
  const [isPlaying, setIsPlaying] = useState(false);
  const [wpm, setWpm] = useState(() =>
    initialWpm != null ? clampWpm(initialWpm) : getInitialWpm()
  );
  const [showTimer, setShowTimer] = useState(getStoredShowTimer);
  const [highlightEnabled, setHighlightEnabled] = useState(getStoredHighlightWords);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(() => 0);
  const [showMoreTimeModal, setShowMoreTimeModal] = useState(false);
  const [overtimeMode, setOvertimeMode] = useState(false);
  const [overtimeSeconds, setOvertimeSeconds] = useState(0);
  const startTimeRef = useRef<number>(0);
  const readingStartTimeRef = useRef<number>(0);
  const overtimeStartRef = useRef<number>(0);
  const rafRef = useRef<number>(0);
  const onFinishCalledRef = useRef(false);
  const mountedRef = useRef(true);
  const lastPlayPauseRef = useRef<number>(0);
  const lastResetRef = useRef<number>(0);
  const DEBOUNCE_MS = 400;

  const effectiveChunkSize = guidedChunkingEnabled && chunkSize != null ? clampChunkSize(chunkSize) : 1;
  const useChunking = guidedChunkingEnabled && effectiveChunkSize > 1;

  const paragraphs = useMemo(() => {
    return text
      .split(/\n\n+/)
      .map((p) => p.trim().split(/\s+/).filter(Boolean))
      .filter((p) => p.length > 0);
  }, [text]);
  const words = useMemo(
    () => paragraphs.flat(),
    [paragraphs]
  );
  const wordCount = wordCountProp ?? words.length;
  const totalReadingSeconds = useMemo(
    () => (wordCount > 0 && wpm > 0 ? Math.ceil((wordCount / wpm) * 60) : 0),
    [wordCount, wpm]
  );

  // When not playing, display uses totalReadingSeconds (see timerSeconds below). When playing starts, countdown effect sets remainingSeconds.

  // Countdown tick: update remaining time every second while playing; when it hits 0, pause and show "More time?" modal
  useEffect(() => {
    if (!isPlaying || totalReadingSeconds <= 0 || overtimeMode) return;
    setRemainingSeconds(totalReadingSeconds);
    const interval = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const remaining = Math.max(0, totalReadingSeconds - elapsed);
      setRemainingSeconds(remaining);
      if (remaining <= 0) {
        setIsPlaying(false);
        setShowMoreTimeModal(true);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying, totalReadingSeconds, overtimeMode]);

  // Overtime: count up every second when in overtime mode
  useEffect(() => {
    if (!overtimeMode) return;
    overtimeStartRef.current = Date.now();
    const interval = setInterval(() => {
      setOvertimeSeconds(Math.floor((Date.now() - overtimeStartRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [overtimeMode]);

  // currentWordIndex intentionally omitted from deps: we use it only to set startTimeRef when
  // play starts or wpm/words.length change, to avoid restarting the animation on every word tick.
  useEffect(() => {
    mountedRef.current = true;
    if (!isPlaying) return;

    const tick = () => {
      if (!mountedRef.current) return;
      const elapsedMs = Date.now() - startTimeRef.current;
      const rawIndex = Math.floor((elapsedMs / 60000) * wpm);
      const index = useChunking ? Math.floor(rawIndex / effectiveChunkSize) * effectiveChunkSize : rawIndex;

      if (index >= words.length) {
        if (!mountedRef.current) return;
        setIsPlaying(false);
        setCurrentWordIndex(words.length - 1);
        const elapsedSec = elapsedMs / 1000;
        const timeRanOut = totalReadingSeconds > 0 && elapsedSec >= totalReadingSeconds - 0.01;
        if (timeRanOut) {
          setShowMoreTimeModal(true);
        } else if (!onFinishCalledRef.current) {
          onFinishCalledRef.current = true;
          const timeSpentSeconds = Math.round((Date.now() - readingStartTimeRef.current) / 1000);
          onFinish?.(wpm, { timeSpentSeconds, usedOvertime: false });
        }
        return;
      }

      if (!mountedRef.current) return;
      setCurrentWordIndex(index);
      rafRef.current = requestAnimationFrame(tick);
    };

    startTimeRef.current = Date.now() - (currentWordIndex / wpm) * 60000;
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      mountedRef.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- currentWordIndex/onFinish intentionally omitted to avoid restarting animation on every word
  }, [isPlaying, wpm, words.length, useChunking, effectiveChunkSize, totalReadingSeconds]);

  const handlePlayPause = () => {
    const now = Date.now();
    if (now - lastPlayPauseRef.current < DEBOUNCE_MS) return;
    lastPlayPauseRef.current = now;
    if (currentWordIndex >= words.length - 1 && isPlaying) return;
    if (currentWordIndex >= words.length - 1 && !isPlaying) {
      setCurrentWordIndex(0);
    }
    if (!isPlaying && currentWordIndex === 0) readingStartTimeRef.current = Date.now();
    setIsPlaying((prev) => !prev);
  };

  const handleReset = () => {
    const now = Date.now();
    if (now - lastResetRef.current < DEBOUNCE_MS) return;
    lastResetRef.current = now;
    setIsPlaying(false);
    setCurrentWordIndex(0);
    setRemainingSeconds(totalReadingSeconds);
    setShowMoreTimeModal(false);
    setOvertimeMode(false);
    setOvertimeSeconds(0);
    onFinishCalledRef.current = false;
  };

  const handleFinish = () => {
    setIsPlaying(false);
    if (!onFinishCalledRef.current) {
      onFinishCalledRef.current = true;
      const timeSpentSeconds = overtimeMode
        ? totalReadingSeconds + overtimeSeconds
        : (readingStartTimeRef.current
            ? Math.max(0, Math.round((Date.now() - readingStartTimeRef.current) / 1000))
            : 0);
      onFinish?.(wpm, { timeSpentSeconds, usedOvertime: overtimeMode });
    }
  };

  const handleMoreTimeNo = () => {
    setShowMoreTimeModal(false);
    if (!onFinishCalledRef.current) {
      onFinishCalledRef.current = true;
      onFinish?.(wpm, { timeSpentSeconds: totalReadingSeconds, usedOvertime: false });
    }
  };

  const handleMoreTimeYes = () => {
    setShowMoreTimeModal(false);
    setOvertimeMode(true);
    setOvertimeSeconds(0);
    overtimeStartRef.current = Date.now();
  };

  const handleWpmIncrement = () => setWpm((prev) => clampWpm(prev + 25));
  const handleWpmDecrement = () => setWpm((prev) => clampWpm(prev - 25));

  useEffect(() => {
    try {
      localStorage.setItem(WPM_STORAGE_KEY, String(wpm));
    } catch {
      // ignore storage errors
    }
  }, [wpm]);

  useEffect(() => {
    try {
      localStorage.setItem(SHOW_TIMER_STORAGE_KEY, String(showTimer));
    } catch {
      // ignore
    }
  }, [showTimer]);

  useEffect(() => {
    try {
      localStorage.setItem(HIGHLIGHT_WORDS_STORAGE_KEY, String(highlightEnabled));
    } catch {
      // ignore
    }
  }, [highlightEnabled]);

  const renderWord = (word: string, i: number) => {
    const isCurrent = highlightEnabled && (useChunking
      ? i >= currentWordIndex && i < currentWordIndex + effectiveChunkSize
      : i === currentWordIndex);
    const isPast = highlightEnabled && i < currentWordIndex;
    const className = `transition-colors duration-75 ${
      isPast ? "opacity-50" : "opacity-100"
    } ${
      isCurrent
        ? "text-[#005eb8] bg-[#e0f2ff] rounded"
        : "text-ucat-body"
    }`;

    return (
      <span key={`${word}-${i}`} className={className}>
        {word}
      </span>
    );
  };

  const paragraphBlock = (paragraphWords: string[], startIndex: number) => {
    const baseClass =
      "flex flex-wrap justify-start gap-x-2 gap-y-1 text-[18px] leading-[1.8] mb-4 last:mb-0 text-ucat-body text-left font-sans";

    if (useChunking) {
      // Group words into chunks. Each chunk is a wrapper that uses the same flex/gap
      // layout as the paragraph so text positions stay identical-only the background changes.
      const chunks: string[][] = [];
      for (let i = 0; i < paragraphWords.length; i += effectiveChunkSize) {
        chunks.push(paragraphWords.slice(i, i + effectiveChunkSize));
      }

      return (
        <div key={startIndex} className={baseClass}>
          {chunks.map((chunkWords, chunkIdx) => {
            const chunkStartIndex = startIndex + chunkIdx * effectiveChunkSize;
            const isCurrentChunk = highlightEnabled &&
              chunkStartIndex <= currentWordIndex &&
              chunkStartIndex + chunkWords.length > currentWordIndex;
            const isPastChunk = highlightEnabled &&
              chunkStartIndex + chunkWords.length <= currentWordIndex;

            const wrapperClass = `inline-flex flex-wrap gap-x-2 gap-y-1 transition-colors duration-75 ${
              isPastChunk ? "opacity-50" : "opacity-100"
            } ${
              isCurrentChunk ? "bg-[#e0f2ff] rounded" : ""
            }`;
            const wordClass = isCurrentChunk
              ? "text-[#005eb8]"
              : "text-ucat-body";

            return (
              <span key={chunkIdx} className={wrapperClass}>
                {chunkWords.map((word, j) => (
                  <span key={j} className={wordClass}>
                    {word}
                  </span>
                ))}
              </span>
            );
          })}
        </div>
      );
    }

    return (
      <div key={startIndex} className={baseClass}>
        {paragraphWords.map((word, j) => renderWord(word, startIndex + j))}
      </div>
    );
  };

  const content = (
    <div>
      {paragraphs.map((paragraphWords, pIdx) => {
        const start = paragraphs
          .slice(0, pIdx)
          .reduce((sum, p) => sum + p.length, 0);
        return paragraphBlock(paragraphWords, start);
      })}
    </div>
  );

  const timerSeconds = overtimeMode ? overtimeSeconds : (isPlaying ? remainingSeconds : totalReadingSeconds);
  const isCountdown = !overtimeMode && isPlaying;
  const isLowTime = isCountdown && remainingSeconds <= 10 && remainingSeconds > 0;

  return (
    <div className="w-full max-w-4xl mx-auto px-4 font-ucat">
      {showMoreTimeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" aria-modal="true" role="dialog" aria-labelledby="more-time-title">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 text-center">
            <h2 id="more-time-title" className="text-lg font-semibold text-slate-900 mb-2">Time&apos;s up</h2>
            <p className="text-slate-600 mb-6">More time?</p>
            <div className="flex gap-3 justify-center">
              <button
                type="button"
                onClick={handleMoreTimeYes}
                className="min-h-[44px] px-5 py-2.5 bg-slate-100 text-slate-800 font-medium rounded-lg hover:bg-slate-200 transition-colors"
              >
                Yes
              </button>
              <button
                type="button"
                onClick={handleMoreTimeNo}
                className="min-h-[44px] px-5 py-2.5 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors"
              >
                No, go to questions
              </button>
            </div>
          </div>
        </div>
      )}
      {showTimer && totalReadingSeconds > 0 && (
        <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
          <span className="text-sm font-medium text-slate-500">
            Speed reading
          </span>
          <span
            className={`text-2xl font-bold tabular-nums shrink-0 ${
              overtimeMode ? "text-red-600" : isLowTime ? "text-red-600" : "text-slate-900"
            }`}
            aria-live="polite"
            aria-label={overtimeMode ? `Overtime ${formatCountdown(overtimeSeconds)}` : isPlaying ? `${formatCountdown(remainingSeconds)} left` : `${formatCountdown(totalReadingSeconds)} total`}
          >
            {overtimeMode ? `+${formatCountdown(timerSeconds)}` : formatCountdown(timerSeconds)}
          </span>
        </div>
      )}
      {(passageTitle != null || wordCount > 0) && (
        <p className="text-[13px] text-ucat-muted mb-2 text-center">
          {wpm} WPM · {wordCount} words
          {useChunking ? ` · ${effectiveChunkSize} words per chunk` : ""}
          {passageTitle ? ` · ${passageTitle}` : ""}
        </p>
      )}
      {isMobile ? (
        <>
          <div className="mt-4 mb-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <label className="flex items-center gap-1.5 text-sm text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={highlightEnabled}
                  onChange={(e) => setHighlightEnabled(e.target.checked)}
                  className="rounded border-slate-300"
                />
                Highlight words
              </label>
              <label className="flex items-center gap-1.5 text-sm text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showTimer}
                  onChange={(e) => setShowTimer(e.target.checked)}
                  className="rounded border-slate-300"
                />
                Show timer
              </label>
            </div>
            <div className="flex flex-col gap-2 mb-4">
              <button
                type="button"
                onClick={handlePlayPause}
                className="w-full min-h-[48px] px-4 py-2.5 bg-green-600 text-white text-base font-semibold rounded-full hover:bg-green-700 transition-colors flex items-center justify-center gap-1.5"
              >
                <span aria-hidden>
                  {isPlaying ? "‖‖" : "▶"}
                </span>
                {isPlaying ? "Pause" : "Play"}
              </button>
              <button
                type="button"
                onClick={handleFinish}
                className="w-full min-h-[44px] px-4 py-2.5 bg-white text-primary border border-primary font-medium rounded-full hover:bg-primary/5 transition-colors flex items-center justify-center gap-1.5"
              >
                Finish and go to questions
              </button>
            </div>
            <div className="flex items-center gap-3 justify-between">
              <span className="text-xs text-slate-500">Reading speed</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleWpmDecrement}
                  disabled={isPlaying}
                  className="min-w-[40px] min-h-[40px] rounded-lg border border-slate-200 bg-white text-slate-700 font-medium hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center"
                  aria-label="Decrease WPM"
                >
                  −
                </button>
                <span className="min-w-[4.5rem] text-center text-sm font-semibold text-slate-900">
                  {wpm} WPM
                </span>
                <button
                  type="button"
                  onClick={handleWpmIncrement}
                  disabled={isPlaying}
                  className="min-w-[40px] min-h-[40px] rounded-lg border border-slate-200 bg-white text-slate-700 font-medium hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center"
                  aria-label="Increase WPM"
                >
                  +
                </button>
              </div>
            </div>
          </div>
          {content}
        </>
      ) : (
        <>
          {content}
          <div className="flex flex-wrap items-center justify-between gap-4 mt-8 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleWpmDecrement}
                  disabled={isPlaying}
                  className="min-w-[44px] min-h-[44px] rounded-lg border border-slate-200 bg-white text-slate-700 font-medium hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center"
                  aria-label="Decrease WPM"
                >
                  −
                </button>
                <span className="min-w-[5rem] text-center font-semibold text-slate-900">
                  {wpm} WPM
                </span>
                <button
                  type="button"
                  onClick={handleWpmIncrement}
                  disabled={isPlaying}
                  className="min-w-[44px] min-h-[44px] rounded-lg border border-slate-200 bg-white text-slate-700 font-medium hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center"
                  aria-label="Increase WPM"
                >
                  +
                </button>
              </div>
              <label className="flex items-center gap-1.5 text-sm text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={highlightEnabled}
                  onChange={(e) => setHighlightEnabled(e.target.checked)}
                  className="rounded border-slate-300"
                />
                Highlight words
              </label>
              <label className="flex items-center gap-1.5 text-sm text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showTimer}
                  onChange={(e) => setShowTimer(e.target.checked)}
                  className="rounded border-slate-300"
                />
                Show timer
              </label>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePlayPause}
                className="min-h-[44px] px-4 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-1.5"
              >
                <span aria-hidden>
                  {isPlaying ? "‖‖" : "▶"}
                </span>
                {isPlaying ? "Pause" : "Play"}
              </button>
              <button
                type="button"
                onClick={handleFinish}
                className="min-h-[44px] px-4 py-2.5 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5"
              >
                <span aria-hidden>▶ |</span>
                Finish
              </button>
            </div>
          </div>
        </>
      )}
      {!isPlaying && (
        <div className={`mt-2 flex ${isMobile ? "justify-start" : "justify-center"}`}>
          <button
            type="button"
            onClick={handleReset}
            className="text-[13px] text-ucat-muted hover:text-ucat-body"
          >
            Reset
          </button>
        </div>
      )}
    </div>
  );
}
