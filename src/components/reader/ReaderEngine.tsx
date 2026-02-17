import { useState, useRef, useEffect, useMemo } from "react";
import { useIsMobile } from "../../hooks/useIsMobile";
import { clampChunkSize } from "../../lib/guidedChunkingPreferences";

const DEFAULT_TEXT =
  "The quick brown fox jumps over the lazy dog. Reading at a steady pace improves comprehension and retention. Practice with the UKCAT People to build your speed and accuracy. Some people say all experts must agree; many often could argue that never always works.";

const WPM_MIN = 100;
const WPM_MAX = 600;
const WPM_STORAGE_KEY = "ukcat-reader-wpm";

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

type ReaderEngineProps = {
  text?: string;
  initialWpm?: number;
  onFinish?: (wpm: number) => void;
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
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const startTimeRef = useRef<number>(0);
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
        if (!onFinishCalledRef.current) {
          onFinishCalledRef.current = true;
          onFinish?.(wpm);
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
  }, [isPlaying, wpm, words.length, useChunking, effectiveChunkSize]);

  const handlePlayPause = () => {
    const now = Date.now();
    if (now - lastPlayPauseRef.current < DEBOUNCE_MS) return;
    lastPlayPauseRef.current = now;
    if (currentWordIndex >= words.length - 1 && isPlaying) return;
    if (currentWordIndex >= words.length - 1 && !isPlaying) {
      setCurrentWordIndex(0);
    }
    setIsPlaying((prev) => !prev);
  };

  const handleReset = () => {
    const now = Date.now();
    if (now - lastResetRef.current < DEBOUNCE_MS) return;
    lastResetRef.current = now;
    setIsPlaying(false);
    setCurrentWordIndex(0);
    onFinishCalledRef.current = false;
  };

  const handleFinish = () => {
    setIsPlaying(false);
    if (!onFinishCalledRef.current) {
      onFinishCalledRef.current = true;
      onFinish?.(wpm);
    }
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

  const renderWord = (word: string, i: number) => {
    const isCurrent = useChunking
      ? i >= currentWordIndex && i < currentWordIndex + effectiveChunkSize
      : i === currentWordIndex;
    const isPast = i < currentWordIndex;
    const className = `inline-block transition-all duration-75 ${
      isPast ? "opacity-50" : "opacity-100"
    } ${isCurrent ? "text-[#005eb8] scale-105 font-semibold" : "text-ucat-body"}`;

    return (
      <span key={`${word}-${i}`} className={className}>
        {word}
      </span>
    );
  };

  const paragraphBlock = (paragraphWords: string[], startIndex: number) => (
    <div
      key={startIndex}
      className="flex flex-wrap justify-start gap-x-2 gap-y-1 text-[18px] leading-[1.8] mb-4 last:mb-0 text-ucat-body text-left font-sans"
    >
      {paragraphWords.map((word, j) => renderWord(word, startIndex + j))}
    </div>
  );

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

  return (
    <div className="w-full max-w-4xl mx-auto px-4 font-ucat">
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
            <div className="flex flex-wrap items-center gap-2 mb-3 justify-start">
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
                className="min-h-[44px] px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-1.5"
              >
                <span aria-hidden>▶ |</span>
                Finish
              </button>
            </div>
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
          </div>
          {content}
        </>
      ) : (
        <>
          {content}
          <div className="flex flex-wrap items-center justify-between gap-4 mt-8 p-3 bg-slate-50 rounded-xl border border-slate-200">
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
                className="min-h-[44px] px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-1.5"
              >
                <span aria-hidden>▶ |</span>
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
