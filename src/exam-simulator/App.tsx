import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  Clock,
  Flag,
  Calculator as CalcIcon,
  ArrowRight,
  ArrowLeft,
  CircleHelp,
  Expand,
  Lightbulb,
  X,
} from "lucide-react";
import { bankSchema, complete, assign, examShortcut } from "./model";
import type { Bank, Answer } from "./model";
import { sample } from "./sample";
import { fullShell } from "./fullShell";
import questionBankSchema from "./question-bank.schema.json";
import { Calculator } from "./Calculator";
import { supabase } from "../lib/supabase";
import {
  clearActiveAttempt,
  clearLocalAttemptsForUser,
  currentUserId,
  listAttemptHistory,
  loadLatestCloudAttempt,
  readLocalAttempt,
  saveAttempt,
  summariseAttempt,
} from "./progress";
import type { AttemptSnapshot } from "./progress";
import type { AttemptHistoryItem } from "./progress";
import "./style.css";

type Phase = "setup" | "instructions" | "question" | "review" | "finished";
type Draft = AttemptSnapshot & { phase: Exclude<Phase, "setup" | "finished"> };

// Validates a stored attempt (local or cloud) before it can be resumed, so a
// malformed or outdated snapshot never points past the end of its bank.
function toDraft(value: unknown): Draft | null {
  try {
    const candidate = value as Partial<Draft> | null;
    if (!candidate || (candidate as { phase?: string }).phase === "finished")
      return null;
    const parsedBank = bankSchema.safeParse(candidate.bank);
    if (!parsedBank.success) return null;
    if (
      !candidate.phase ||
      !["instructions", "question", "review"].includes(candidate.phase)
    )
      return null;
    const sectionIndex = Number(candidate.sectionIndex);
    const index = Number(candidate.index);
    if (
      !Number.isInteger(sectionIndex) ||
      !parsedBank.data.sections[sectionIndex]
    )
      return null;
    if (
      !Number.isInteger(index) ||
      !parsedBank.data.sections[sectionIndex].questions[index]
    )
      return null;
    return {
      bank: parsedBank.data,
      phase: candidate.phase as Draft["phase"],
      sectionIndex,
      index,
      answers:
        candidate.answers && typeof candidate.answers === "object"
          ? candidate.answers
          : {},
      seen: Array.isArray(candidate.seen)
        ? candidate.seen.filter((x): x is string => typeof x === "string")
        : [],
      flags: Array.isArray(candidate.flags)
        ? candidate.flags.filter((x): x is string => typeof x === "string")
        : [],
      deadline: typeof candidate.deadline === "number" ? candidate.deadline : 0,
      multiplier: candidate.multiplier === 1.25 ? 1.25 : 1,
      timed: candidate.timed !== false,
      scheme:
        typeof candidate.scheme === "string" ? candidate.scheme : "default",
      attemptId:
        typeof candidate.attemptId === "string"
          ? candidate.attemptId
          : crypto.randomUUID(),
      startedAt:
        typeof candidate.startedAt === "string"
          ? candidate.startedAt
          : new Date().toISOString(),
      updatedAt:
        typeof candidate.updatedAt === "string"
          ? candidate.updatedAt
          : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function loadDraft(): Draft | null {
  return toDraft(readLocalAttempt());
}

// Cloud saves carry the whole bank, so they are debounced and only follow
// meaningful changes; the local copy is saved promptly on every change.
const LOCAL_SAVE_DELAY_MS = 500;
const CLOUD_SAVE_DELAY_MS = 5000;
function download(name: string, data: unknown) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function formatDuration(seconds: number) {
  seconds = Math.round(seconds);
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  if (!minutes) return `${remainder} seconds`;
  if (!remainder) return `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
  return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ${remainder} seconds`;
}

const MOCK_NAME = "TheUKCATPeople Mock";
const guessingNote =
  "Wrong answers do not lose marks, so give an answer to every question, even if you have to make your best guess.";
const calculatorNote =
  "Open the calculator from the toolbar. You can use it with the mouse or with the number keys on your keyboard.";
const sectionInstructions: Record<Bank["sections"][number]["id"], string[]> = {
  VR: [
    "Each question has one correct answer. Select a single option.",
    guessingNote,
  ],
  DM: [
    "Some questions have one correct answer. Others give five statements, and you drag a Yes or No tile next to each one.",
    guessingNote,
    calculatorNote,
  ],
  QR: [
    "Each question has one correct answer. Select a single option.",
    guessingNote,
    calculatorNote,
  ],
  SJT: [
    "Rate each action or consideration using the options shown. Some questions ask you to choose the most and the least appropriate action instead.",
    "For most and least questions, each answer box needs a different action.",
    "Try to answer every item. Anything left blank shows as incomplete on the review screen.",
  ],
};
function Dialog({
  title,
  close,
  children,
  kind = "",
}: {
  title: string;
  close: () => void;
  children: ReactNode;
  kind?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const drag = useRef<{
    x: number;
    y: number;
    baseX: number;
    baseY: number;
  } | null>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    ref.current?.focus();
    return () => previous?.focus();
  }, []);
  return (
    <div className="overlay">
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={"dialog " + kind}
        style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.stopPropagation();
            close();
          }
          if (e.key === "Tab") {
            const nodes = ref.current?.querySelectorAll<HTMLElement>(
              'button:not(:disabled),select,[tabindex="0"]',
            );
            if (!nodes?.length) return;
            const first = nodes[0],
              last = nodes[nodes.length - 1];
            if (
              e.shiftKey &&
              (document.activeElement === first ||
                document.activeElement === ref.current)
            ) {
              e.preventDefault();
              last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              first.focus();
            }
          }
        }}
      >
        <header
          onPointerDown={(e) => {
            if ((e.target as Element).closest("button")) return;
            drag.current = {
              x: e.clientX,
              y: e.clientY,
              baseX: position.x,
              baseY: position.y,
            };
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (!drag.current) return;
            setPosition({
              x: Math.max(
                -window.innerWidth / 3,
                Math.min(
                  window.innerWidth / 3,
                  drag.current.baseX + e.clientX - drag.current.x,
                ),
              ),
              y: Math.max(
                -window.innerHeight / 4,
                Math.min(
                  window.innerHeight / 4,
                  drag.current.baseY + e.clientY - drag.current.y,
                ),
              ),
            });
          }}
          onPointerUp={() => {
            drag.current = null;
          }}
        >
          <span className="dialog-title">
            {kind === "answer" && <Lightbulb aria-hidden="true" />}
            {title}
          </span>
          <button aria-label="Close dialog" onClick={close}>
            <X size={20} />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}
export default function App() {
  const [savedDraft, setSavedDraft] = useState<Draft | null>(() => loadDraft());
  const [bank, setBank] = useState<Bank>(fullShell),
    [phase, setPhase] = useState<Phase>("setup"),
    [sectionIndex, setSection] = useState(0),
    [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({}),
    [seen, setSeen] = useState<string[]>([]),
    [flags, setFlags] = useState<string[]>([]),
    [deadline, setDeadline] = useState(0),
    [now, setNow] = useState(Date.now()),
    [multiplier, setMultiplier] = useState(1),
    [timed, setTimed] = useState(true);
  const [dialog, setDialog] = useState<
      null | "navigator" | "calculator" | "help" | "end" | "answer"
    >(null),
    [scheme, setScheme] = useState("default"),
    [filter, setFilter] = useState("All"),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [token, setToken] = useState(""),
    [hideTime, setHideTime] = useState(false),
    [hideCounter, setHideCounter] = useState(false),
    [expiredNotice, setExpiredNotice] = useState("");
  const [userId, setUserId] = useState<string | null>(null),
    [syncState, setSyncState] = useState<
      "local" | "saving" | "saved" | "error"
    >("local"),
    [history, setHistory] = useState<AttemptHistoryItem[]>([]);
  const attemptId = useRef(savedDraft?.attemptId ?? crypto.randomUUID());
  const startedAt = useRef(savedDraft?.startedAt ?? new Date().toISOString());
  const signedInAs = useRef<string | null>(null);
  useEffect(() => {
    signedInAs.current = userId;
  }, [userId]);
  const section = bank.sections[sectionIndex],
    q = section.questions[index],
    a = answers[q.id] ?? {},
    remaining = Math.max(0, Math.ceil((deadline - now) / 1000));
  const status = (id: string) => {
    const question = section.questions.find((x) => x.id === id)!;
    return complete(question, answers[id])
      ? "Complete"
      : seen.includes(id)
        ? "Incomplete"
        : "Unseen";
  };
  const correctResponseLabel = (question = q) => {
    if (!question.correctAnswer) return "Unavailable";
    if (question.type === "yes-no")
      return question
        .statements!.map(
          (_, i) => `${i + 1}: ${question.correctAnswer![String(i)]}`,
        )
        .join(", ");
    if (question.type === "most-least")
      return `Most ${question.correctAnswer.most}; Least ${question.correctAnswer.least}`;
    return question.correctAnswer.choice;
  };
  function visit(i: number) {
    setIndex(i);
    setSeen((s) =>
      s.includes(section.questions[i].id) ? s : [...s, section.questions[i].id],
    );
    setPhase("question");
    setDialog(null);
    setToken("");
  }
  function beginQuestions() {
    setDeadline(Date.now() + section.durationSeconds * multiplier * 1000);
    setNow(Date.now());
    visit(0);
  }
  function start(si: number) {
    setSection(si);
    setIndex(0);
    setPhase("instructions");
    setDeadline(Date.now() + bank.sections[si].instructionSeconds * 1000);
    setNow(Date.now());
    setFilter("All");
    setDialog(null);
  }
  function startExam() {
    attemptId.current = crypto.randomUUID();
    startedAt.current = new Date().toISOString();
    setAnswers({});
    setSeen([]);
    setFlags([]);
    start(0);
  }
  function advance() {
    setDialog(null);
    if (sectionIndex + 1 < bank.sections.length) start(sectionIndex + 1);
    else setPhase("finished");
  }
  function flag() {
    setFlags((f) =>
      f.includes(q.id) ? f.filter((id) => id !== q.id) : [...f, q.id],
    );
  }
  function answer(slot: string, value: string) {
    setAnswers((old) => ({
      ...old,
      [q.id]: assign(old[q.id] ?? {}, slot, value, q.type === "most-least"),
    }));
    setToken("");
  }
  useEffect(() => {
    if (phase === "setup" || phase === "finished") return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [phase]);
  useEffect(() => {
    let active = true;
    void currentUserId().then(async (id) => {
      if (!active) return;
      setUserId(id);
      setHistory(await listAttemptHistory(id));
      const local = readLocalAttempt();
      if (local?.ownerId && local.ownerId !== id) {
        // Left behind by an account that is no longer signed in here.
        clearLocalAttemptsForUser(local.ownerId);
        setSavedDraft((draft) =>
          draft?.attemptId === local.attemptId ? null : draft,
        );
      }
      if (!id) return;
      const cloud = toDraft(await loadLatestCloudAttempt(id));
      if (!active || !cloud) return;
      const current = readLocalAttempt();
      if (
        !current ||
        Date.parse(cloud.updatedAt) > Date.parse(current.updatedAt)
      ) {
        setSavedDraft(cloud);
        setNotice(
          "Your latest in-progress attempt was restored from your account.",
        );
      }
    });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      const id = session?.user.id ?? null;
      if (event === "SIGNED_OUT" && signedInAs.current) {
        const previous = signedInAs.current;
        clearLocalAttemptsForUser(previous);
        setSavedDraft((draft) =>
          draft && readLocalAttempt()?.attemptId !== draft.attemptId
            ? null
            : draft,
        );
      }
      signedInAs.current = id;
      setUserId(id);
      void listAttemptHistory(id).then(setHistory);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);
  const latestSnapshot = useRef<AttemptSnapshot | null>(null);
  useEffect(() => {
    if (phase === "setup") return;
    const snapshot: AttemptSnapshot = {
      attemptId: attemptId.current,
      bank,
      phase,
      sectionIndex,
      index,
      answers,
      seen,
      flags,
      deadline,
      multiplier,
      timed,
      scheme,
      startedAt: startedAt.current,
      updatedAt: new Date().toISOString(),
    };
    latestSnapshot.current = snapshot;
    if (phase !== "finished") setSavedDraft(snapshot as Draft);
    const timer = window.setTimeout(
      () => {
        void saveAttempt(snapshot, userId, { cloud: false }).then((result) => {
          if (!userId) setSyncState(result.local ? "local" : "error");
        });
      },
      phase === "finished" ? 0 : LOCAL_SAVE_DELAY_MS,
    );
    return () => window.clearTimeout(timer);
  }, [
    answers,
    bank,
    deadline,
    flags,
    index,
    multiplier,
    phase,
    scheme,
    sectionIndex,
    seen,
    timed,
    userId,
  ]);
  // Cloud sync: answers, flags, section and phase changes only, debounced.
  useEffect(() => {
    if (phase === "setup") return;
    // Guests only need this effect to close off a finished attempt.
    if (!userId && phase !== "finished") return;
    if (userId) setSyncState("saving");
    const timer = window.setTimeout(
      () => {
        const snapshot = latestSnapshot.current;
        if (!snapshot) return;
        void saveAttempt(snapshot, userId).then((result) => {
          if (phase === "finished") {
            clearActiveAttempt();
            setSavedDraft(null);
          }
          setSyncState(
            userId
              ? result.error
                ? "error"
                : "saved"
              : result.local
                ? "local"
                : "error",
          );
          void listAttemptHistory(userId).then(setHistory);
        });
      },
      phase === "finished" ? 0 : CLOUD_SAVE_DELAY_MS,
    );
    return () => window.clearTimeout(timer);
  }, [answers, bank, flags, phase, sectionIndex, userId]);
  useEffect(() => {
    if (!timed || remaining > 0 || expiredNotice) return;
    if (phase === "instructions") beginQuestions();
    else if (phase === "question" || phase === "review") advance();
  });
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, [contenteditable='true']"))
        return;
      if (expiredNotice) return;
      const shortcut = examShortcut(e);
      if (!shortcut) return;
      e.preventDefault();
      if (shortcut === "help") {
        setDialog((open) => (open === "help" ? null : "help"));
        return;
      }
      if (shortcut === "calculator" && phase === "question") {
        setDialog((open) => (open === "calculator" ? null : "calculator"));
        return;
      }
      if (shortcut === "navigator" && phase === "question") {
        setDialog((open) => (open === "navigator" ? null : "navigator"));
        return;
      }
      if (dialog) return;
      if (phase === "review" && shortcut === "end-review") {
        setDialog("end");
        return;
      }
      if (phase === "review" && shortcut === "review-all") {
        setFilter("All");
        visit(0);
        return;
      }
      if (phase === "instructions" && shortcut === "next") beginQuestions();
      if (phase !== "question") return;
      if (shortcut === "next") {
        if (index < section.questions.length - 1) visit(index + 1);
        else setPhase("review");
      }
      if (shortcut === "previous" && index > 0) visit(index - 1);
      if (shortcut === "flag") flag();
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  });
  async function importBank(file?: File) {
    if (!file) return;
    try {
      if (file.size > 10_000_000) throw Error("Maximum file size is 10 MB.");
      const result = bankSchema.safeParse(JSON.parse(await file.text()));
      if (!result.success) {
        setError(
          result.error.issues
            .map(
              (issue) => `${issue.path.join(".") || "bank"}: ${issue.message}`,
            )
            .join("\n"),
        );
        setNotice("");
        return;
      }
      setBank(result.data);
      setSection(0);
      setIndex(0);
      setError("");
      setNotice(
        `Loaded “${result.data.title}” with ${result.data.sections.reduce((sum, section) => sum + section.questions.length, 0)} questions.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load questions.");
      setNotice("");
    }
  }
  const resumeDraft = () => {
    if (!savedDraft) return;
    setBank(savedDraft.bank);
    setSection(savedDraft.sectionIndex);
    setIndex(savedDraft.index);
    setAnswers(savedDraft.answers);
    setSeen(savedDraft.seen);
    setFlags(savedDraft.flags);
    const expired = savedDraft.timed && savedDraft.deadline <= Date.now();
    setDeadline(expired ? Date.now() : savedDraft.deadline);
    // Tell the student before moving on, rather than silently skipping ahead.
    setExpiredNotice(
      expired && savedDraft.phase !== "instructions"
        ? `Time ran out for ${savedDraft.bank.sections[savedDraft.sectionIndex].name} while you were away. Your saved answers for this section have been kept.`
        : "",
    );
    setMultiplier(savedDraft.multiplier);
    setTimed(savedDraft.timed);
    setScheme(savedDraft.scheme);
    attemptId.current = savedDraft.attemptId;
    startedAt.current = savedDraft.startedAt;
    setPhase(savedDraft.phase);
    setNow(Date.now());
  };
  const reset = () => {
    clearActiveAttempt();
    setSavedDraft(null);
    setPhase("setup");
    setAnswers({});
    setSeen([]);
    setFlags([]);
    setSection(0);
    setIndex(0);
    setDialog(null);
  };
  const selectPreset = (preset: Bank) => {
    reset();
    setBank(preset);
    setError("");
    setNotice(`Loaded local template “${preset.title}”.`);
  };
  const stimulus = (
    <>
      {q.passage && <div className="prose">{q.passage}</div>}
      {q.table && (
        <table className="data-table">
          <thead>
            <tr>
              {q.table.headers.map((h, i) => (
                <th key={i}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {q.table.rows.map((r, i) => (
              <tr key={i}>
                {r.map((v, j) => (
                  <td key={j}>{v}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {q.image && (
        <img className="question-image" src={q.image} alt="Question diagram" />
      )}
    </>
  );
  function dropSlot(slot: string, label: string) {
    const value = a[slot];
    return (
      <button
        className={"drop-slot " + (value ? "filled" : "")}
        aria-label={`${label}: ${value ? (q.options?.find((o) => o.id === value)?.text ?? value) : "empty"}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const v = e.dataTransfer.getData("text/plain");
          if (
            q.type === "yes-no"
              ? ["Yes", "No"].includes(v)
              : q.options?.some((o) => o.id === v)
          )
            answer(slot, v);
        }}
        onClick={() =>
          token
            ? answer(slot, token)
            : value &&
              setAnswers((old) => ({
                ...old,
                [q.id]: Object.fromEntries(
                  Object.entries(a).filter(([k]) => k !== slot),
                ),
              }))
        }
      >
        {q.options?.find((o) => o.id === value)?.text ?? value ?? ""}
      </button>
    );
  }
  return (
    <div className={"exam theme-" + scheme}>
      {phase === "setup" ? (
        <>
          <header className="titlebar setup-titlebar">
            <span>
              {timed ? MOCK_NAME : `${MOCK_NAME} · ${section.name} practice`}
            </span>
            <span className="setup-status">Test setup</span>
          </header>
          <nav className="toolbar setup-toolbar">
            <span className="toolbar-spacer" />
            <select
              aria-label="Colour Scheme"
              value={scheme}
              onChange={(e) => setScheme(e.target.value)}
            >
              <option value="default">Colour Scheme</option>
              <option value="lightyellow">Black on Light Yellow</option>
              <option value="salmon">Black on Salmon</option>
              <option value="white">Black on White</option>
              <option value="yellow">Black on Yellow</option>
              <option value="bluewhite">Blue on White</option>
              <option value="blueyellow">Blue on Yellow</option>
            </select>
          </nav>
          <main className="setup content setup-screen">
            <p className="eyebrow">THEUKCATPEOPLE MOCK</p>
            <h1>Select your test</h1>
            <p className="setup-intro">
              Choose a test format and timing arrangement. Your progress is
              saved automatically.
            </p>
            <div
              className="preset-switch"
              aria-label="Local question-bank templates"
            >
              <button
                aria-pressed={bank.title === fullShell.title}
                onClick={() => selectPreset(fullShell)}
              >
                Full-length shell
              </button>
              <button
                aria-pressed={bank.title === sample.title}
                onClick={() => selectPreset(sample)}
              >
                Short interaction demo
              </button>
            </div>
            <h2 className="selected-test-title">{bank.title}</h2>
            <div className="section-cards">
              {bank.sections.map((s) => (
                <div key={s.id}>
                  <strong>{s.name}</strong>
                  <p>
                    {s.questions.length}{" "}
                    {s.questions.length === 1 ? "question" : "questions"} ·{" "}
                    {formatDuration(s.durationSeconds)} section timer
                  </p>
                </div>
              ))}
            </div>
            <div className="setup-options">
              <label>
                Timing{" "}
                <select
                  value={multiplier}
                  onChange={(e) => setMultiplier(Number(e.target.value))}
                >
                  <option value={1}>Standard time</option>
                  <option value={1.25}>25% extra time</option>
                </select>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={timed}
                  onChange={(e) => setTimed(e.target.checked)}
                />{" "}
                Enforce section timers
              </label>
            </div>
            <p className="setup-guidance">
              The full-length mock uses the same section question counts and
              timings as the real test. The short demo contains eight questions
              covering every supported interaction. Imported banks use their own
              question counts and timer settings. Active attempts recover after
              reloads and sync across devices for signed-in users.
            </p>
            <div className="setup-actions">
              {savedDraft && (
                <button className="resume" onClick={resumeDraft}>
                  Resume {savedDraft.bank.title}
                </button>
              )}
            </div>
            <details className="tutor-tools">
              <summary>Tutor and question-bank tools</summary>
              <div>
                <button
                  onClick={() => download("current-question-bank.json", bank)}
                >
                  Download current bank JSON
                </button>
                <button
                  onClick={() =>
                    download(
                      "ucat-question-bank.schema.json",
                      questionBankSchema,
                    )
                  }
                >
                  Download JSON schema
                </button>
                <label className="upload">
                  Load question JSON
                  <input
                    type="file"
                    accept=".json,application/json"
                    onChange={(e) => {
                      void importBank(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                </label>
                <a className="bank-manager-link" href="/question-database.html">
                  Open tutor question database
                </a>
              </div>
            </details>
            {error && <pre role="alert">{error}</pre>}
            {notice && (
              <p className="notice" role="status">
                {notice}
              </p>
            )}
            <p className="sync-state" role="status">
              {userId
                ? syncState === "error"
                  ? "Account sync needs a connection; progress remains saved on this device."
                  : syncState === "saving"
                    ? "Saving progress to your account…"
                    : "Signed in · progress syncs to your account"
                : "Guest mode · progress is saved on this device"}
            </p>
            {history.length > 0 && (
              <section className="attempt-history" aria-label="Recent attempts">
                <h2>Recent progress</h2>
                {history.slice(0, 6).map((attempt) => (
                  <div key={attempt.attemptId}>
                    <span>
                      <strong>{attempt.bankTitle}</strong>
                      <small>
                        {new Date(attempt.updatedAt).toLocaleString()}
                      </small>
                    </span>
                    <span>
                      {attempt.answered}/{attempt.total} answered
                      {attempt.scorable > 0 &&
                        ` · ${attempt.correct}/${attempt.scorable} correct`}
                    </span>
                    <b>
                      {attempt.status === "completed"
                        ? "Complete"
                        : "In progress"}
                    </b>
                  </div>
                ))}
              </section>
            )}
            <p className="fine">Local development · unpublished</p>
          </main>
          <footer className="setup-footer">
            <button onClick={() => setDialog("help")}>
              <CircleHelp /> <u>H</u>elp
            </button>
            <div />
            <button className="setup-next" onClick={startExam}>
              <u>N</u>ext <ArrowRight />
            </button>
          </footer>
        </>
      ) : phase === "finished" ? (
        <>
          <header className="titlebar setup-titlebar">
            <span>{MOCK_NAME}</span>
            <span className="setup-status">Test complete</span>
          </header>
          <nav className="toolbar setup-toolbar">
            <span className="toolbar-spacer" />
            <select
              aria-label="Colour Scheme"
              value={scheme}
              onChange={(e) => setScheme(e.target.value)}
            >
              <option value="default">Colour Scheme</option>
              <option value="lightyellow">Black on Light Yellow</option>
              <option value="salmon">Black on Salmon</option>
              <option value="white">Black on White</option>
              <option value="yellow">Black on Yellow</option>
              <option value="bluewhite">Blue on White</option>
              <option value="blueyellow">Blue on Yellow</option>
            </select>
          </nav>
          <main className="setup content setup-screen results-screen">
            <p className="eyebrow">PRACTICE COMPLETE</p>
            <h1>Responses recorded</h1>
            <p>Your attempt and section progress have been recorded.</p>
            {(() => {
              const result = summariseAttempt(bank, answers);
              return result.scorable > 0 ? (
                <p>
                  <strong>
                    {result.correct} of {result.scorable}
                  </strong>{" "}
                  scorable questions correct.
                </p>
              ) : null;
            })()}
            {bank.sections.map((s) => (
              <p key={s.id}>
                <strong>{s.name}:</strong>{" "}
                {s.questions.filter((x) => complete(x, answers[x.id])).length}{" "}
                of {s.questions.length} complete
              </p>
            ))}
            <button
              className="primary"
              onClick={() =>
                download("exam-responses.json", {
                  title: bank.title,
                  answers,
                  flags,
                  seen,
                })
              }
            >
              Export responses
            </button>{" "}
            <p className="sync-state" role="status">
              {userId
                ? syncState === "error"
                  ? "Saved on this device; account sync needs a connection."
                  : syncState === "saving"
                    ? "Saving completed attempt…"
                    : "Completed attempt saved to your account"
                : "Completed attempt saved on this device"}
            </p>
          </main>
          <footer className="setup-footer">
            <button onClick={() => setDialog("help")}>
              <CircleHelp /> <u>H</u>elp
            </button>
            <div />
            <button onClick={reset}>
              Return to setup <ArrowRight />
            </button>
          </footer>
        </>
      ) : (
        <>
          <header className="titlebar">
            <span>
              {timed ? MOCK_NAME : `${MOCK_NAME} · ${section.name} practice`}
            </span>
            <div>
              <button
                className={remaining < 60 ? "urgent" : ""}
                onClick={() => setHideTime(!hideTime)}
                aria-label="Toggle timer"
              >
                <Clock />
                {!hideTime &&
                  (timed
                    ? `Time Remaining ${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`
                    : "Untimed practice")}
              </button>
              {phase === "question" && (
                <button
                  className="counter"
                  onClick={() => setHideCounter((hidden) => !hidden)}
                  aria-label={
                    hideCounter ? "Show screen counter" : "Hide screen counter"
                  }
                >
                  ▱{" "}
                  {hideCounter
                    ? "Screen counter"
                    : `${index + 1} of ${section.questions.length}`}
                </button>
              )}
            </div>
          </header>
          <nav className="toolbar">
            {phase === "question" ? (
              <>
                {!timed && (
                  <button
                    onClick={() => setDialog("answer")}
                    disabled={!q.correctAnswer}
                    title={
                      q.correctAnswer
                        ? undefined
                        : "No answer supplied for this question"
                    }
                  >
                    <Lightbulb /> <u>E</u>xplain Answer
                  </button>
                )}
                <button
                  onClick={() => setDialog("calculator")}
                  aria-keyshortcuts="Alt+C"
                >
                  <CalcIcon />
                  <u>C</u>alculator
                </button>
                <button
                  className="flag"
                  aria-pressed={flags.includes(q.id)}
                  aria-keyshortcuts="Alt+F"
                  onClick={flag}
                >
                  <Flag fill={flags.includes(q.id) ? "white" : "none"} />
                  <u>F</u>lag for Review
                </button>
              </>
            ) : (
              <span className="toolbar-spacer" />
            )}
            <select
              aria-label="Colour Scheme"
              value={scheme}
              onChange={(e) => setScheme(e.target.value)}
            >
              {[
                ["default", "Colour Scheme"],
                ["lightyellow", "Black on Light Yellow"],
                ["salmon", "Black on Salmon"],
                ["white", "Black on White"],
                ["yellow", "Black on Yellow"],
                ["bluewhite", "Blue on White"],
                ["blueyellow", "Blue on Yellow"],
              ].map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </nav>
          {phase === "instructions" ? (
            <main className="content instructions">
              {timed && (
                <b>
                  This screen closes after{" "}
                  {formatDuration(section.instructionSeconds)}.
                </b>
              )}
              <h3>
                {section.name.toUpperCase()}{" "}
                {timed ? "INSTRUCTIONS" : "PRACTICE QUESTIONS"}
              </h3>
              <table className="data-table">
                <thead>
                  <tr>
                    <th rowSpan={2}>Subtest</th>
                    <th rowSpan={2}>Number of Questions</th>
                    <th colSpan={2}>Subtest Time</th>
                  </tr>
                  <tr>
                    <th>Standard time</th>
                    <th>Extended time (25% extra)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th>{section.name}</th>
                    <td>{section.questions.length}</td>
                    <td>{formatDuration(section.durationSeconds)}</td>
                    <td>{formatDuration(section.durationSeconds * 1.25)}</td>
                  </tr>
                </tbody>
              </table>
              {sectionInstructions[section.id].map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              <p>
                The <b>Navigator</b> allows you to navigate to questions within
                this subtest. You can flag questions and review your responses
                before ending the section.
              </p>
              <p>
                The timer continues while Help, Navigator or Calculator is open.
              </p>
              {!timed && (
                <p>
                  As you progress, select <b>Explain Answer</b> at the top left
                  to check the correct response and read the answer rationale.
                </p>
              )}
              <p>
                Select <b>Next (N)</b> when you are ready. The section starts
                automatically when the time on this screen runs out.
              </p>
            </main>
          ) : phase === "question" ? (
            <main
              className={
                "content question " + (q.layout === "split" ? "split" : "full")
              }
              key={q.id}
            >
              {q.layout === "split" && (
                <article className="passage">{stimulus}</article>
              )}
              <article className="question-pane">
                {q.layout !== "split" && stimulus}
                <p className="prompt">{q.prompt}</p>
                {q.type === "choice" ? (
                  <fieldset className="choices">
                    <legend className="sr-only">Select one answer</legend>
                    {q.options!.map((o) => (
                      <label key={o.id}>
                        <input
                          type="radio"
                          name={q.id}
                          checked={a.choice === o.id}
                          onChange={() => answer("choice", o.id)}
                        />
                        <span>{o.id}.</span>
                        <div>{o.text}</div>
                      </label>
                    ))}
                  </fieldset>
                ) : (
                  <>
                    <div className={"drag-question " + q.type}>
                      <div className="slots">
                        {q.type === "yes-no"
                          ? q.statements!.map((s, i) => (
                              <div className="statement" key={i}>
                                <div>{s}</div>
                                {dropSlot(String(i), s)}
                              </div>
                            ))
                          : ["most", "least"].map((slot) => (
                              <div className="statement" key={slot}>
                                <div>
                                  {slot === "most" ? "Most" : "Least"}{" "}
                                  Appropriate
                                </div>
                                {dropSlot(slot, slot + " appropriate")}
                              </div>
                            ))}
                      </div>
                      <div className="tokens">
                        {(q.type === "yes-no"
                          ? [
                              { id: "Yes", text: "Yes" },
                              { id: "No", text: "No" },
                            ]
                          : q.options!
                        ).map((o) => (
                          <button
                            key={o.id}
                            draggable
                            aria-pressed={token === o.id}
                            className={token === o.id ? "selected" : ""}
                            onDragStart={(e) =>
                              e.dataTransfer.setData("text/plain", o.id)
                            }
                            onClick={() => setToken(o.id)}
                          >
                            {o.text}
                          </button>
                        ))}
                      </div>
                    </div>
                    <p className="drag-hint">
                      Drag an answer into a box, or select an answer then select
                      its box. Select a filled box to clear it.
                    </p>
                  </>
                )}
              </article>
            </main>
          ) : (
            <main className="content review">
              <h1>
                {section.name} Review Prescore: use this screen to review the
                items and amend your responses
              </h1>
              <button
                className="primary"
                aria-keyshortcuts="Alt+A"
                onClick={() => {
                  const i = section.questions.findIndex(
                    (x) =>
                      filter === "All" ||
                      (filter === "Flagged"
                        ? flags.includes(x.id)
                        : status(x.id) === filter),
                  );
                  if (i >= 0) visit(i);
                }}
              >
                {filter === "All" ? (
                  <>
                    Review <u>A</u>ll
                  </>
                ) : (
                  `Review ${filter}`
                )}
              </button>
              <div className="tabs">
                {["All", "Incomplete", "Unseen", "Flagged"].map((f) => (
                  <button
                    key={f}
                    className={filter === f ? "active" : ""}
                    onClick={() => setFilter(f)}
                  >
                    {f} (
                    {
                      section.questions.filter(
                        (x) =>
                          f === "All" ||
                          (f === "Flagged"
                            ? flags.includes(x.id)
                            : status(x.id) === f),
                      ).length
                    }
                    )
                  </button>
                ))}
              </div>
              <table>
                <thead>
                  <tr>
                    <th>QUESTION</th>
                    <th>TITLE</th>
                    <th>STATUS</th>
                    <th>FLAGGED</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {section.questions
                    .map((x, i) => ({ x, i }))
                    .filter(
                      ({ x }) =>
                        filter === "All" ||
                        (filter === "Flagged"
                          ? flags.includes(x.id)
                          : status(x.id) === filter),
                    )
                    .map(({ x, i }) => (
                      <tr key={x.id}>
                        <td>{i + 1}</td>
                        <td>{section.name}</td>
                        <td>
                          <span className={"badge " + status(x.id)}>
                            {status(x.id)}
                          </span>
                        </td>
                        <td>{flags.includes(x.id) ? "Yes" : "No"}</td>
                        <td>
                          <button onClick={() => visit(i)}>Review</button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </main>
          )}
          <footer>
            {!timed && phase !== "review" ? (
              <button onClick={() => setDialog("end")}>
                ⇥ <u>E</u>nd Exam
              </button>
            ) : phase === "review" ? (
              <button
                onClick={() => setDialog("end")}
                aria-keyshortcuts="Alt+E"
              >
                ⇥ <u>E</u>nd Review
              </button>
            ) : (
              <button
                onClick={() => setDialog("help")}
                aria-keyshortcuts="Alt+H"
              >
                <CircleHelp />
                <u>H</u>elp
              </button>
            )}
            <div />
            {phase === "question" && (
              <>
                {index > 0 && (
                  <button
                    onClick={() => visit(index - 1)}
                    aria-keyshortcuts="Alt+P"
                  >
                    <ArrowLeft />
                    <u>P</u>revious
                  </button>
                )}
                <button
                  onClick={() => setDialog("navigator")}
                  aria-keyshortcuts="Alt+V"
                >
                  <Expand />
                  Na<u>v</u>igator
                </button>
              </>
            )}
            {phase !== "review" && (
              <button
                aria-keyshortcuts="Alt+N"
                onClick={() =>
                  phase === "instructions"
                    ? beginQuestions()
                    : index < section.questions.length - 1
                      ? visit(index + 1)
                      : setPhase("review")
                }
              >
                <u>N</u>ext
                <ArrowRight />
              </button>
            )}
          </footer>
        </>
      )}
      {expiredNotice && !dialog && (
        <Dialog
          title="Section time ended"
          kind="end"
          close={() => setExpiredNotice("")}
        >
          <div className="dialog-copy">
            <p>{expiredNotice}</p>
            <button onClick={() => setExpiredNotice("")}>Continue</button>
          </div>
        </Dialog>
      )}
      {dialog && (
        <Dialog
          title={
            dialog === "navigator"
              ? "Navigator - select a question to go to it"
              : dialog === "calculator"
                ? "Calculator"
                : dialog === "end"
                  ? "End section?"
                  : dialog === "answer"
                    ? "Answer Rationale"
                    : "Help"
          }
          kind={dialog}
          close={() => setDialog(null)}
        >
          {dialog === "calculator" ? (
            <Calculator close={() => setDialog(null)} />
          ) : dialog === "answer" ? (
            <div className="answer-rationale">
              <p>Correct response: {correctResponseLabel()}</p>
              {q.explanation && <p>{q.explanation}</p>}
            </div>
          ) : dialog === "navigator" ? (
            <>
              <div className="navigator-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Question #</th>
                      <th>Status</th>
                      <th>Flagged</th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.questions.map((x, i) => (
                      <tr key={x.id} className={index === i ? "current" : ""}>
                        <td>
                          <button onClick={() => visit(i)}>
                            Question {i + 1}
                          </button>
                        </td>
                        <td
                          className={status(x.id) !== "Complete" ? "red" : ""}
                        >
                          {status(x.id) === "Complete" ? "" : status(x.id)}
                        </td>
                        <td>{flags.includes(x.id) ? "⚑" : ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="dialog-bottom">
                {
                  section.questions.filter((x) => !complete(x, answers[x.id]))
                    .length
                }{" "}
                Unseen/Incomplete{" "}
                <button
                  onClick={() => {
                    setDialog(null);
                    setPhase("review");
                  }}
                >
                  Review screen
                </button>
                <button onClick={() => setDialog(null)}>Close</button>
              </div>
            </>
          ) : dialog === "end" ? (
            <div className="dialog-copy">
              <p>
                {
                  section.questions.filter((x) => !complete(x, answers[x.id]))
                    .length
                }{" "}
                questions are unseen or incomplete.
              </p>
              <p>You cannot return to this section after continuing.</p>
              <button onClick={() => setDialog(null)}>
                Return to review
              </button>{" "}
              <button onClick={advance}>End section</button>
            </div>
          ) : (
            <div className="dialog-copy">
              <h2>Keyboard controls</h2>
              <p>Hold Alt on Windows or Option on Mac while pressing:</p>
              <table className="shortcut-table">
                <tbody>
                  <tr>
                    <th>N</th>
                    <td>Next question or screen</td>
                  </tr>
                  <tr>
                    <th>P</th>
                    <td>Previous question</td>
                  </tr>
                  <tr>
                    <th>F</th>
                    <td>Flag or unflag the current question</td>
                  </tr>
                  <tr>
                    <th>V</th>
                    <td>Open or close Navigator</td>
                  </tr>
                  <tr>
                    <th>C</th>
                    <td>Open or close Calculator</td>
                  </tr>
                  <tr>
                    <th>H</th>
                    <td>Open or close Help</td>
                  </tr>
                  <tr>
                    <th>E</th>
                    <td>End Review from the review screen</td>
                  </tr>
                  <tr>
                    <th>A</th>
                    <td>Review All from the review screen</td>
                  </tr>
                </tbody>
              </table>
              <p>
                Escape closes an open dialog. Tab moves between controls; Space
                or Enter activates the focused control. Radio answers also
                support arrow keys.
              </p>
              <p>
                For tiles, drag to a box or select a tile then select a box.
                Click an assigned box with no tile selected to clear it.
              </p>
              <p>
                Section time continues while dialogs are open. Responses are
                saved on this device and sync to the signed-in account when
                available.
              </p>
            </div>
          )}
        </Dialog>
      )}
    </div>
  );
}
