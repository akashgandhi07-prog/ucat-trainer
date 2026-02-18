import { useMemo, useState, useCallback, useEffect } from "react";
import ReReadPassageModal from "./ReReadPassageModal";

const NUM_QUESTIONS = 4;

// ───────── helpers ─────────

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20);
}

// ───────── synonym paraphrasing ─────────

const SYNONYM_MAP: [RegExp, string[]][] = [
  [/\bimportant\b/gi, ["significant", "crucial", "essential"]],
  [/\bshows\b/gi, ["demonstrates", "indicates", "reveals"]],
  [/\bshown\b/gi, ["demonstrated", "indicated", "revealed"]],
  [/\bhowever\b/gi, ["nevertheless", "nonetheless", "yet"]],
  [/\bfrequently\b/gi, ["regularly", "commonly", "routinely"]],
  [/\brapidly\b/gi, ["quickly", "swiftly", "at pace"]],
  [/\bsignificant\b/gi, ["considerable", "substantial", "notable"]],
  [/\bargue\b/gi, ["contend", "assert", "maintain"]],
  [/\bargues\b/gi, ["contends", "asserts", "maintains"]],
  [/\bincreasing\b/gi, ["growing", "rising", "escalating"]],
  [/\bsevere\b/gi, ["serious", "acute", "critical"]],
  [/\bessential\b/gi, ["vital", "crucial", "necessary"]],
  [/\bconsequently\b/gi, ["as a result", "therefore", "thus"]],
  [/\bfurthermore\b/gi, ["moreover", "additionally", "in addition"]],
  [/\bbelieved\b/gi, ["thought", "considered", "regarded"]],
  [/\bsuggests\b/gi, ["indicates", "implies", "points to"]],
  [/\bsupport\b/gi, ["sustain", "uphold", "maintain"]],
  [/\bcomplex\b/gi, ["intricate", "complicated", "multifaceted"]],
  [/\brequires\b/gi, ["demands", "necessitates", "calls for"]],
  [/\bcauses\b/gi, ["leads to", "results in", "triggers"]],
  [/\bcaused\b/gi, ["triggered", "resulted in", "brought about"]],
  [/\bwidely\b/gi, ["broadly", "generally", "extensively"]],
  [/\bdifficult\b/gi, ["challenging", "hard", "demanding"]],
];

function paraphrase(sentence: string): string {
  let result = sentence;
  let changes = 0;
  const maxChanges = 2; // keep it readable
  for (const [re, synonyms] of shuffle(SYNONYM_MAP)) {
    if (changes >= maxChanges) break;
    if (re.test(result)) {
      result = result.replace(re, pick(synonyms));
      changes++;
    }
  }
  // Try clause reorder: "X, which/that Y" stays, but "A. B" → keep as is
  return result;
}

// ───────── distortion strategies ─────────

type DistortionResult = { text: string; applied: boolean };

// 1. Qualifier → absolute
function distortQualifierToAbsolute(s: string): DistortionResult {
  const re = /\b(some|many|often|could|frequently|sometimes|usually|might|may|can)\b/gi;
  if (!re.test(s)) return { text: s, applied: false };
  return {
    text: s.replace(re, (match) => {
      const replacements: Record<string, string> = {
        some: "all", many: "all", often: "always", could: "will",
        frequently: "always", sometimes: "always", usually: "always",
        might: "will", may: "will", can: "will",
      };
      const lower = match.toLowerCase();
      const rep = replacements[lower] ?? "all";
      return match[0] === match[0].toUpperCase() ? rep.charAt(0).toUpperCase() + rep.slice(1) : rep;
    }), applied: true
  };
}

// 2. Negation flip – remove or add "not"
function distortNegation(s: string): DistortionResult {
  if (/\b(not|never|no longer|cannot|can't)\b/i.test(s)) {
    const result = s
      .replace(/\bcannot\b/gi, "can")
      .replace(/\bcan't\b/gi, "can")
      .replace(/\bnever\b/gi, "always")
      .replace(/\bno longer\b/gi, "still")
      .replace(/\bnot\b/gi, "");
    return { text: result.replace(/\s{2,}/g, " ").trim(), applied: true };
  }
  // Insert negation
  const verbMatch = s.match(/\b(is|are|was|were|has|have|had|does|do|did|can|could|will|would|should)\b/i);
  if (verbMatch && verbMatch.index != null) {
    const idx = verbMatch.index + verbMatch[0].length;
    const result = s.slice(0, idx) + " not" + s.slice(idx);
    return { text: result, applied: true };
  }
  return { text: s, applied: false };
}

// 3. Causal exaggeration
function distortCausal(s: string): DistortionResult {
  const causalPhrases: [RegExp, string][] = [
    [/\bcontributed to\b/gi, "was the sole cause of"],
    [/\bplayed a role in\b/gi, "was the sole cause of"],
    [/\bhelped to\b/gi, "single-handedly"],
    [/\binfluenced\b/gi, "completely determined"],
    [/\bpartly\b/gi, "entirely"],
    [/\bpartially\b/gi, "entirely"],
    [/\blargely\b/gi, "entirely"],
    [/\bmostly\b/gi, "entirely"],
    [/\bone of the\b/gi, "the only"],
    [/\ba major\b/gi, "the only"],
    [/\ban important\b/gi, "the only"],
  ];
  for (const [re, rep] of causalPhrases) {
    if (re.test(s)) {
      return { text: s.replace(re, rep), applied: true };
    }
  }
  return { text: s, applied: false };
}

// 4. Scope broadening
function distortScope(s: string): DistortionResult {
  const scopePhrases: [RegExp, string][] = [
    [/\bin some\b/gi, "in all"],
    [/\bcertain\b/gi, "every"],
    [/\bmost\b/gi, "all"],
    [/\bseveral\b/gi, "all"],
    [/\ba few\b/gi, "all"],
    [/\bspecific\b/gi, "universal"],
    [/\bparticular\b/gi, "universal"],
    [/\boccasionally\b/gi, "invariably"],
    [/\brarely\b/gi, "commonly"],
  ];
  for (const [re, rep] of scopePhrases) {
    if (re.test(s)) {
      return { text: s.replace(re, rep), applied: true };
    }
  }
  return { text: s, applied: false };
}

// 5. Certainty injection
function distortCertainty(s: string): DistortionResult {
  const uncertainPhrases: [RegExp, string][] = [
    [/\bit is (now )?widely believed\b/gi, "It is universally proven"],
    [/\bscientists argue\b/gi, "Scientists have proven"],
    [/\bresearch suggests\b/gi, "Research has conclusively proven"],
    [/\bhistorians (have long )?debated\b/gi, "Historians unanimously agree"],
    [/\bsome ethicists argue\b/gi, "All ethicists agree"],
    [/\bcritics (of .+? )?argue\b/gi, "Everyone agrees"],
    [/\bis thought to\b/gi, "is proven to"],
    [/\bare thought to\b/gi, "are proven to"],
    [/\bappears to be\b/gi, "is definitely"],
    [/\bsuggests that\b/gi, "proves that"],
    [/\bmay have\b/gi, "certainly had"],
    [/\bmight be\b/gi, "is definitely"],
  ];
  for (const [re, rep] of uncertainPhrases) {
    if (re.test(s)) {
      return { text: s.replace(re, rep), applied: true };
    }
  }
  return { text: s, applied: false };
}

// Apply first successful distortion
const DISTORTION_FNS = [
  distortQualifierToAbsolute,
  distortNegation,
  distortCausal,
  distortScope,
  distortCertainty,
];

function applyDistortion(sentence: string): DistortionResult {
  const fns = shuffle(DISTORTION_FNS);
  for (const fn of fns) {
    const result = fn(sentence);
    if (result.applied) return result;
  }
  return { text: sentence, applied: false };
}

// ───────── "Can't Tell" question builder ─────────
// Generate statements that sound plausible but aren't stated in the passage

const CANT_TELL_TEMPLATES = [
  (topic: string) => `The author of this passage would personally recommend ${topic} as the best approach`,
  (topic: string) => `The majority of the general public agrees with the position on ${topic} described in this passage`,
  (topic: string) => `This passage was written by someone who has direct professional experience in ${topic}`,
  (topic: string) => `Future developments in ${topic} will likely support the conclusions drawn in this passage`,
  (topic: string) => `The information about ${topic} presented here is based on research conducted in the last five years`,
  (topic: string) => `Those who disagree with the passage's position on ${topic} do so primarily for financial reasons`,
];

function extractTopic(sentence: string): string {
  // Pull a noun phrase from the middle of the sentence
  const words = sentence.split(/\s+/);
  const start = Math.floor(words.length * 0.2);
  const end = Math.min(start + 4, words.length);
  return words
    .slice(start, end)
    .join(" ")
    .replace(/[,.;:!?]/g, "")
    .toLowerCase();
}

function buildCantTellQuestion(sentences: string[]): { displayedSentence: string; passageSnippet: string } | null {
  if (sentences.length < 3) return null;
  const sentence = pick(sentences);
  const topic = extractTopic(sentence);
  if (topic.split(/\s+/).length < 2) return null;
  const template = pick(CANT_TELL_TEMPLATES);
  return {
    displayedSentence: template(topic),
    passageSnippet: sentence,
  };
}

// ───────── Question type ─────────

type CorrectAnswer = "true" | "false" | "cant_tell";

type Question = {
  displayedSentence: string;
  correctAnswer: CorrectAnswer;
  passageSnippet: string;
};

type AnswerChoice = "true" | "false" | "cant_tell" | null;

export type QuestionBreakdownItem = {
  statement: string;
  correctAnswer: boolean;
  correctAnswerRaw: CorrectAnswer;
  userAnswer: "true" | "false" | "cant_tell";
  correctAnswerLabel: string;
  passageSnippet?: string;
};

type DistortionQuizProps = {
  passageText: string;
  onComplete: (correct: number, total: number, breakdown: QuestionBreakdownItem[]) => void;
  allowReRead?: boolean;
  questionCount?: number;
};

function buildQuestions(passageText: string, count: number): Question[] {
  const trimmed = passageText.trim();
  if (trimmed.length === 0) return [];

  const allSentences = splitSentences(trimmed);
  if (allSentences.length === 0) return [];

  const targetCount = Math.max(3, Math.min(count, allSentences.length));
  const shuffledSentences = shuffle(allSentences);
  const questions: Question[] = [];
  const usedIndices = new Set<number>();

  // Decide the mix: ~40% True (paraphrased), ~40% False (distorted), ~20% Can't Tell
  const numFalse = Math.max(1, Math.round(targetCount * 0.4));
  const numCantTell = Math.max(0, Math.min(1, Math.round(targetCount * 0.2)));
  const numTrue = Math.max(1, targetCount - numFalse - numCantTell);

  // Build FALSE questions (distorted)
  for (let i = 0; i < shuffledSentences.length && questions.length < numFalse; i++) {
    const sentence = shuffledSentences[i];
    const result = applyDistortion(sentence);
    if (result.applied) {
      questions.push({
        displayedSentence: result.text,
        correctAnswer: "false",
        passageSnippet: sentence,
      });
      usedIndices.add(i);
    }
  }

  // If we couldn't generate enough False questions via distortion, force some with negation
  if (questions.length < numFalse) {
    for (let i = 0; i < shuffledSentences.length && questions.length < numFalse; i++) {
      if (usedIndices.has(i)) continue;
      const sentence = shuffledSentences[i];
      const result = distortNegation(sentence);
      if (result.applied) {
        questions.push({
          displayedSentence: result.text,
          correctAnswer: "false",
          passageSnippet: sentence,
        });
        usedIndices.add(i);
      }
    }
  }

  // Build TRUE questions (paraphrased – NOT verbatim)
  for (let i = 0; i < shuffledSentences.length && questions.filter(q => q.correctAnswer === "true").length < numTrue; i++) {
    if (usedIndices.has(i)) continue;
    const sentence = shuffledSentences[i];
    const paraphrased = paraphrase(sentence);
    questions.push({
      displayedSentence: paraphrased,
      correctAnswer: "true",
      passageSnippet: sentence,
    });
    usedIndices.add(i);
  }

  // Build CAN'T TELL question
  if (numCantTell > 0) {
    const cantTell = buildCantTellQuestion(allSentences);
    if (cantTell) {
      questions.push({
        displayedSentence: cantTell.displayedSentence,
        correctAnswer: "cant_tell",
        passageSnippet: cantTell.passageSnippet,
      });
    }
  }

  return shuffle(questions);
}

export default function DistortionQuiz({
  passageText,
  onComplete,
  allowReRead = true,
  questionCount = NUM_QUESTIONS,
}: DistortionQuizProps) {
  const questions = useMemo(() => buildQuestions(passageText, questionCount), [passageText, questionCount]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerChoice[]>(() =>
    Array(questions.length).fill(null)
  );
  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  const [showReRead, setShowReRead] = useState(false);

  const current = questions[currentIndex];
  const answeredCount = answers.filter((a) => a !== null).length;

  const handleAnswer = useCallback(
    (choice: AnswerChoice) => {
      setAnswers((prev) => {
        const next = [...prev];
        next[currentIndex] = choice;
        return next;
      });
    },
    [currentIndex]
  );

  const handleFinish = useCallback(() => {
    let correct = 0;
    const ANSWER_LABELS: Record<CorrectAnswer, string> = {
      true: "True",
      false: "False",
      cant_tell: "Can't Tell",
    };
    const breakdown: QuestionBreakdownItem[] = questions.map((q, i) => {
      const a = answers[i] ?? "cant_tell";
      if (a === q.correctAnswer) correct++;
      return {
        statement: q.displayedSentence,
        correctAnswer: q.correctAnswer === "true",
        correctAnswerRaw: q.correctAnswer,
        userAnswer: a,
        correctAnswerLabel: ANSWER_LABELS[q.correctAnswer],
        passageSnippet: q.passageSnippet,
      };
    });
    onComplete(correct, questions.length, breakdown);
  }, [questions, answers, onComplete]);

  const toggleFlag = useCallback(() => {
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(currentIndex)) next.delete(currentIndex);
      else next.add(currentIndex);
      return next;
    });
  }, [currentIndex]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.altKey && e.key === "n") {
        e.preventDefault();
        setCurrentIndex((i) => Math.min(questions.length - 1, i + 1));
      } else if (e.altKey && e.key === "p") {
        e.preventDefault();
        setCurrentIndex((i) => Math.max(0, i - 1));
      } else if (e.altKey && e.key === "f") {
        e.preventDefault();
        toggleFlag();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [questions.length, toggleFlag]);

  const allAnswered = answers.every((a) => a !== null);

  if (questions.length === 0) {
    return (
      <div className="w-full max-w-2xl mx-auto px-4 text-center font-ucat">
        <div className="mb-6">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-medium bg-amber-100 text-amber-800 border border-amber-200">
            <span aria-hidden>⚠</span>
            COMPREHENSION CHECK
          </span>
          <h2 className="text-[22px] font-bold text-ucat-title mt-3">
            No questions for this passage
          </h2>
          <p className="text-ucat-body mt-1 text-[15px]">
            This passage doesn&apos;t have enough content to generate comprehension questions. You can continue to results.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onComplete(0, 0, [])}
          className="min-h-[44px] px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
        >
          Continue to results
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-4 font-ucat">
      <div className="mb-6 text-center">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-medium bg-amber-100 text-amber-800 border border-amber-200">
          <span aria-hidden>⚠</span>
          COMPREHENSION CHECK
        </span>
        <h2 className="text-[22px] font-bold text-ucat-title mt-3">
          Answer the following statements
        </h2>
        <p className="text-ucat-body mt-1 text-[15px] leading-[1.5]">
          Based on the passage you just read, determine if each statement is True,
          False, or Can&apos;t Tell.
        </p>
      </div>

      <div className="flex justify-center gap-2 mb-4">
        {questions.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setCurrentIndex(i)}
            className={`min-w-[44px] min-h-[44px] rounded-lg font-medium text-[14px] inline-flex items-center justify-center relative ${i === currentIndex
              ? "bg-blue-600 text-white"
              : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
          >
            {i + 1}
            {flagged.has(i) && (
              <span className="absolute -top-1 -right-1 text-[10px]" aria-label="Flagged">🚩</span>
            )}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[13px] font-medium text-ucat-muted">
            QUESTION {currentIndex + 1} OF {questions.length}
          </span>
          <button
            type="button"
            onClick={toggleFlag}
            className={`flex items-center justify-center gap-1.5 text-[13px] px-3 py-2 min-h-[44px] rounded ${flagged.has(currentIndex)
              ? "bg-amber-100 text-amber-800"
              : "text-ucat-muted hover:bg-slate-100"
              }`}
          >
            <span aria-hidden>🚩</span>
            Flag
          </button>
        </div>
        <p className="text-[16px] leading-[1.5] text-ucat-body mb-6 font-normal">
          {current?.displayedSentence}?
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => handleAnswer("true")}
            className={`flex-1 min-h-[44px] px-4 py-3 rounded-lg border-2 font-normal text-[15px] text-ucat-body ${answers[currentIndex] === "true"
              ? "border-slate-400 bg-slate-100 text-slate-800"
              : "border-slate-200 hover:bg-slate-50"
              }`}
          >
            True
          </button>
          <button
            type="button"
            onClick={() => handleAnswer("false")}
            className={`flex-1 min-h-[44px] px-4 py-3 rounded-lg border-2 font-normal text-[15px] text-ucat-body ${answers[currentIndex] === "false"
              ? "border-slate-400 bg-slate-100 text-slate-800"
              : "border-slate-200 hover:bg-slate-50"
              }`}
          >
            False
          </button>
          <button
            type="button"
            onClick={() => handleAnswer("cant_tell")}
            className={`flex-1 min-h-[44px] px-4 py-3 rounded-lg border-2 font-normal text-[15px] text-ucat-body ${answers[currentIndex] === "cant_tell"
              ? "border-slate-400 bg-slate-100 text-slate-800"
              : "border-slate-200 hover:bg-slate-50"
              }`}
          >
            Can&apos;t Tell
          </button>
        </div>
      </div>

      <div className="mt-6 flex flex-col items-center gap-3">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
            disabled={currentIndex === 0}
            className="min-h-[44px] px-4 py-2 border border-slate-200 rounded-lg text-[15px] text-ucat-body hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            ← Previous
          </button>
          {currentIndex < questions.length - 1 ? (
            <button
              type="button"
              onClick={() => setCurrentIndex((i) => i + 1)}
              className="min-h-[44px] px-4 py-2 bg-slate-900 text-white text-[15px] rounded-lg hover:bg-slate-800 flex items-center justify-center gap-2"
            >
              Next →
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (!allAnswered) {
                  const unansweredIdx = answers.findIndex((a) => a === null);
                  if (
                    window.confirm(
                      `You haven't answered question ${unansweredIdx + 1}. Submit anyway?`
                    )
                  ) {
                    handleFinish();
                  }
                } else {
                  handleFinish();
                }
              }}
              className={`min-h-[44px] px-4 py-2 text-white text-[15px] rounded-lg flex items-center justify-center ${allAnswered
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-amber-600 hover:bg-amber-700"
                }`}
            >
              {allAnswered ? "Finish" : "Finish (unanswered)"}
            </button>
          )}
        </div>
        <p className="text-[13px] text-ucat-muted">{answeredCount}/{questions.length} answered</p>
        {allowReRead && (
          <button
            type="button"
            onClick={() => setShowReRead(true)}
            className="min-h-[44px] text-[13px] text-ucat-muted hover:text-blue-600 flex items-center justify-center gap-1 px-2"
          >
            <span aria-hidden>↻</span>
            Re-read passage (penalty applies)
          </button>
        )}
      </div>

      <ReReadPassageModal
        isOpen={showReRead}
        onClose={() => setShowReRead(false)}
        passageText={passageText}
      />
    </div>
  );
}
