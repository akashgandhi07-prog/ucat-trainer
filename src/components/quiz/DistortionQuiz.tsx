import { useMemo, useState, useCallback, useEffect } from "react";
import ReReadPassageModal from "./ReReadPassageModal";
import QuestionFeedbackModal from "../feedback/QuestionFeedbackModal";
import type { TrainingType } from "../../types/training";

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
  [/\bimportant\b/gi, ["significant", "crucial", "essential", "key"]],
  [/\bshows\b/gi, ["demonstrates", "indicates", "reveals", "illustrates"]],
  [/\bshown\b/gi, ["demonstrated", "indicated", "revealed", "established"]],
  [/\bhowever\b/gi, ["nevertheless", "nonetheless", "yet", "that said"]],
  [/\bfrequently\b/gi, ["regularly", "commonly", "routinely", "often"]],
  [/\brapidly\b/gi, ["quickly", "swiftly", "at pace", "speedily"]],
  [/\bsignificant\b/gi, ["considerable", "substantial", "notable", "meaningful"]],
  [/\bargue\b/gi, ["contend", "assert", "maintain", "hold"]],
  [/\bargues\b/gi, ["contends", "asserts", "maintains", "holds"]],
  [/\bincreasing\b/gi, ["growing", "rising", "escalating", "mounting"]],
  [/\bsevere\b/gi, ["serious", "acute", "critical", "grave"]],
  [/\bessential\b/gi, ["vital", "crucial", "necessary", "indispensable"]],
  [/\bconsequently\b/gi, ["as a result", "therefore", "thus", "hence"]],
  [/\bfurthermore\b/gi, ["moreover", "additionally", "in addition", "beyond this"]],
  [/\bbelieved\b/gi, ["thought", "considered", "regarded", "held"]],
  [/\bsuggests\b/gi, ["indicates", "implies", "points to", "signals"]],
  [/\bsupport\b/gi, ["sustain", "uphold", "maintain", "back"]],
  [/\bcomplex\b/gi, ["intricate", "complicated", "multifaceted", "nuanced"]],
  [/\brequires\b/gi, ["demands", "necessitates", "calls for", "entails"]],
  [/\bcauses\b/gi, ["leads to", "results in", "triggers", "produces"]],
  [/\bcaused\b/gi, ["triggered", "resulted in", "brought about", "produced"]],
  [/\bwidely\b/gi, ["broadly", "generally", "extensively", "commonly"]],
  [/\bdifficult\b/gi, ["challenging", "hard", "demanding", "problematic"]],
  [/\ballow\b/gi, ["permit", "enable", "facilitate"]],
  [/\ballows\b/gi, ["permits", "enables", "facilitates"]],
  [/\bprimary\b/gi, ["main", "principal", "chief", "foremost"]],
  [/\bobtain\b/gi, ["acquire", "gain", "secure"]],
  [/\bultimately\b/gi, ["in the end", "finally", "at its core"]],
  [/\bnumerous\b/gi, ["many", "a great number of", "a variety of"]],
  [/\bvital\b/gi, ["essential", "critical", "indispensable"]],
  [/\bfundamental\b/gi, ["core", "basic", "central", "foundational"]],
  [/\bestablished\b/gi, ["shown", "confirmed", "demonstrated"]],
  [/\bemphasise\b/gi, ["stress", "highlight", "underline"]],
  [/\bemphasizes\b/gi, ["stresses", "highlights", "underlines"]],
  [/\bassociated with\b/gi, ["linked to", "connected to", "related to"]],
  [/\bcharacterised by\b/gi, ["defined by", "marked by", "distinguished by"]],
  [/\bidentified\b/gi, ["recognised", "noted", "found"]],
  [/\bprovide\b/gi, ["offer", "supply", "give"]],
  [/\bprovides\b/gi, ["offers", "supplies", "gives"]],
  [/\bnoted\b/gi, ["observed", "remarked", "pointed out"]],
  [/\bprevious\b/gi, ["earlier", "prior", "past"]],
  [/\bcurrently\b/gi, ["at present", "today", "at this time"]],
  [/\bexamined\b/gi, ["investigated", "studied", "analysed"]],
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

type DistortionResult = {
  text: string;
  applied: boolean;
  label?: string;
  originalFragment?: string;
  replacedFragment?: string;
};

// 1. Qualifier → absolute
function distortQualifierToAbsolute(s: string): DistortionResult {
  const re = /\b(some|many|often|could|frequently|sometimes|usually|might|may|can|occasionally|typically|generally|tends to|tend to)\b/gi;
  if (!re.test(s)) return { text: s, applied: false };
  let originalFragment = "";
  let replacedFragment = "";
  const text = s.replace(re, (match) => {
    const replacements: Record<string, string> = {
      some: "all", many: "all", often: "always", could: "will",
      frequently: "always", sometimes: "always", usually: "always",
      might: "will", may: "will", can: "will", occasionally: "always",
      typically: "always", generally: "always", "tends to": "always",
      "tend to": "always",
    };
    const lower = match.toLowerCase();
    const rep = replacements[lower] ?? "all";
    if (!originalFragment) {
      originalFragment = match;
      replacedFragment = match[0] === match[0].toUpperCase()
        ? rep.charAt(0).toUpperCase() + rep.slice(1)
        : rep;
    }
    return match[0] === match[0].toUpperCase() ? rep.charAt(0).toUpperCase() + rep.slice(1) : rep;
  });
  if (text === s) return { text: s, applied: false };
  return {
    text, applied: true,
    label: `qualifier word changed to an absolute ("${originalFragment}" → "always"/"all"/"will")`,
    originalFragment,
    replacedFragment,
  };
}

// 2. Negation flip - remove or add "not"
function distortNegation(s: string): DistortionResult {
  const negationMatch = s.match(/\b(cannot|can't|never|no longer|not)\b/i);
  if (negationMatch) {
    const originalFragment = negationMatch[0];
    const replacements: Record<string, string> = {
      cannot: "can", "can't": "can", never: "always", "no longer": "still", not: "",
    };
    const lower = originalFragment.toLowerCase();
    const replacedFragment = replacements[lower] ?? "";
    const result = s
      .replace(/\bcannot\b/gi, "can")
      .replace(/\bcan't\b/gi, "can")
      .replace(/\bnever\b/gi, "always")
      .replace(/\bno longer\b/gi, "still")
      .replace(/\bnot\b/gi, "");
    const cleaned = result
      .replace(/,\s*,/g, ",")       // ", ," → "," (e.g. ", not surprisingly," → ", surprisingly,")
      .replace(/\(\s*\)/g, "")      // empty parens from removed "not"
      .replace(/\s{2,}/g, " ")
      .trim();
    if (cleaned === s) return { text: s, applied: false };
    return {
      text: cleaned, applied: true,
      label: 'negation removed (e.g. "not" or "never" stripped out)',
      originalFragment,
      replacedFragment,
    };
  }
  // Insert negation after the first auxiliary verb
  const verbMatch = s.match(/\b(is|are|was|were|has|have|had|does|do|did|can|could|will|would|should)\b/i);
  if (verbMatch && verbMatch.index != null) {
    const idx = verbMatch.index + verbMatch[0].length;
    const result = s.slice(0, idx) + " not" + s.slice(idx);
    return {
      text: result, applied: true,
      label: `negation inserted after "${verbMatch[0]}"`,
      originalFragment: verbMatch[0],
      replacedFragment: verbMatch[0] + " not",
    };
  }
  return { text: s, applied: false };
}

// 3. Causal exaggeration
function distortCausal(s: string): DistortionResult {
  const causalPhrases: [RegExp, string, string][] = [
    [/\bcontributed to\b/gi, "was the sole cause of", '"contributed to" → "was the sole cause of"'],
    [/\bplayed a role in\b/gi, "was the sole cause of", '"played a role in" → "was the sole cause of"'],
    [/\bhelped to\b/gi, "single-handedly", '"helped to" → "single-handedly"'],
    [/\binfluenced\b/gi, "completely determined", '"influenced" → "completely determined"'],
    [/\bpartly\b/gi, "entirely", '"partly" → "entirely"'],
    [/\bpartially\b/gi, "entirely", '"partially" → "entirely"'],
    [/\blargely\b/gi, "entirely", '"largely" → "entirely"'],
    [/\bmostly\b/gi, "entirely", '"mostly" → "entirely"'],
    [/\bone of the\b/gi, "the only", '"one of the" → "the only"'],
    [/\ba major\b/gi, "the only", '"a major" → "the only"'],
    [/\ban important\b/gi, "the only", '"an important" → "the only"'],
    [/\bplayed a part in\b/gi, "was solely responsible for", '"played a part in" → "was solely responsible for"'],
  ];
  for (const [re, rep, label] of causalPhrases) {
    const m = s.match(re);
    if (m) {
      return {
        text: s.replace(re, rep), applied: true,
        label: `causal relationship exaggerated: ${label}`,
        originalFragment: m[0],
        replacedFragment: rep,
      };
    }
  }
  return { text: s, applied: false };
}

// 4. Scope broadening
function distortScope(s: string): DistortionResult {
  const scopePhrases: [RegExp, string, string][] = [
    [/\bin some\b/gi, "in all", '"in some" → "in all"'],
    [/\bcertain\b/gi, "every", '"certain" → "every"'],
    // Only replace "most" as a quantifier (e.g. "most countries"), NOT as a superlative.
    // Chained negative lookbehinds exclude "the most" and "at most".
    [/(?<!the )(?<!at )\bmost\b/gi, "all", '"most" → "all"'],
    [/\bseveral\b/gi, "all", '"several" → "all"'],
    [/\ba few\b/gi, "all", '"a few" → "all"'],
    [/\bspecific\b/gi, "universal", '"specific" → "universal"'],
    [/\bparticular\b/gi, "universal", '"particular" → "universal"'],
    [/\boccasionally\b/gi, "invariably", '"occasionally" → "invariably"'],
    [/\brarely\b/gi, "commonly", '"rarely" → "commonly"'],
    [/\bin many\b/gi, "in all", '"in many" → "in all"'],
    [/\boften\b/gi, "always", '"often" → "always"'],
  ];
  for (const [re, rep, label] of scopePhrases) {
    const m = s.match(re);
    if (m) {
      return {
        text: s.replace(re, rep), applied: true,
        label: `scope broadened: ${label}`,
        originalFragment: m[0],
        replacedFragment: rep,
      };
    }
  }
  return { text: s, applied: false };
}

// 5. Certainty injection
function distortCertainty(s: string): DistortionResult {
  const uncertainPhrases: [RegExp, string, string][] = [
    [/\bit is (now )?widely believed\b/gi, "It is universally proven", '"widely believed" → "universally proven"'],
    [/\bscientists argue\b/gi, "Scientists have proven", '"scientists argue" → "scientists have proven"'],
    [/\bresearch suggests\b/gi, "Research has conclusively proven", '"research suggests" → "research has conclusively proven"'],
    [/\bhistorians (have long )?debated\b/gi, "Historians unanimously agree", '"historians debated" → "historians unanimously agree"'],
    [/\bsome ethicists argue\b/gi, "All ethicists agree", '"some ethicists argue" → "all ethicists agree"'],
    [/\bcritics (of .+? )?argue\b/gi, "Everyone agrees", '"critics argue" → "everyone agrees"'],
    [/\bis thought to\b/gi, "is proven to", '"is thought to" → "is proven to"'],
    [/\bare thought to\b/gi, "are proven to", '"are thought to" → "are proven to"'],
    [/\bappears to be\b/gi, "is definitely", '"appears to be" → "is definitely"'],
    [/\bsuggests that\b/gi, "proves that", '"suggests that" → "proves that"'],
    [/\bmay have\b/gi, "certainly had", '"may have" → "certainly had"'],
    [/\bmight be\b/gi, "is definitely", '"might be" → "is definitely"'],
    [/\bsome scholars\b/gi, "All scholars agree", '"some scholars" → "all scholars agree"'],
    [/\bsome argue\b/gi, "It is universally agreed", '"some argue" → "it is universally agreed"'],
    [/\bhas been suggested\b/gi, "has been conclusively proven", '"has been suggested" → "has been conclusively proven"'],
  ];
  for (const [re, rep, label] of uncertainPhrases) {
    const m = s.match(re);
    if (m) {
      return {
        text: s.replace(re, rep), applied: true,
        label: `hedging language made absolute: ${label}`,
        originalFragment: m[0],
        replacedFragment: rep,
      };
    }
  }
  return { text: s, applied: false };
}

// Catch distortions that produce obviously broken grammar before showing to users
function isGrammaticallyPlausible(original: string, distorted: string): boolean {
  if (distorted === original) return false;
  // Reject article + "all/always/will" combos that superlative replacement can produce
  if (/\b(the|an?)\s+(all|always)\b/i.test(distorted)) return false;
  // Reject adjacent commas left by negation removal
  if (/,\s*,/.test(distorted)) return false;
  // Reject double spaces (should be cleaned already, but belt-and-suspenders)
  if (/\s{2,}/.test(distorted)) return false;
  // Reject sentences that now start with a lowercase letter (negation removed from start)
  if (/^[a-z]/.test(distorted.trim())) return false;
  // Reject if the change made zero meaningful word-level difference
  const origWords = original.toLowerCase().replace(/[^a-z\s]/g, "").split(/\s+/);
  const distWords = distorted.toLowerCase().replace(/[^a-z\s]/g, "").split(/\s+/);
  const commonLength = Math.min(origWords.length, distWords.length);
  const diffs = origWords.slice(0, commonLength).filter((w, i) => distWords[i] !== w).length
    + Math.abs(origWords.length - distWords.length);
  return diffs > 0;
}

// Apply first successful distortion (randomised order)
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
    if (result.applied && isGrammaticallyPlausible(sentence, result.text)) return result;
  }
  return { text: sentence, applied: false };
}

// ───────── "Can't Tell" question builder ─────────
// Use the passage title to generate plausible-but-unverifiable statements

const CANT_TELL_TITLE_TEMPLATES: ((title: string) => string)[] = [
  (t) => `The author personally advocates for policy changes related to ${t}`,
  (t) => `The majority of the general public supports the views on ${t} presented in this passage`,
  (t) => `This passage was written in direct response to a real recent event involving ${t}`,
  (t) => `Experts in the field of ${t} unanimously endorse the conclusions drawn in this passage`,
  (t) => `The passage's perspective on ${t} represents the dominant view in academia`,
  (t) => `The arguments about ${t} presented here have been peer-reviewed and widely accepted`,
  (t) => `Those who disagree with this passage's stance on ${t} do so mainly for economic reasons`,
  (t) => `The author has first-hand professional experience with the issues described regarding ${t}`,
  (t) => `Further research into ${t} will ultimately confirm the claims made in this passage`,
  (t) => `Government policy on ${t} has been directly influenced by arguments like those in this passage`,
];

function buildCantTellQuestion(
  sentences: string[],
  passageTitle?: string
): { displayedSentence: string; passageSnippet: string } | null {
  if (sentences.length < 3) return null;
  const snippet = pick(sentences);

  // Use passage title when available - produces far more coherent Can't Tell statements
  const topic = passageTitle
    ? passageTitle.toLowerCase()
    : null;

  if (!topic) return null;

  const template = pick(CANT_TELL_TITLE_TEMPLATES);
  return {
    displayedSentence: template(topic),
    passageSnippet: snippet,
  };
}

// ───────── Question type ─────────

type CorrectAnswer = "true" | "false" | "cant_tell";

type Question = {
  displayedSentence: string;
  correctAnswer: CorrectAnswer;
  passageSnippet: string;
  distortionLabel?: string;
  originalFragment?: string;
  replacedFragment?: string;
};

type AnswerChoice = "true" | "false" | "cant_tell" | null;

export type QuestionBreakdownItem = {
  statement: string;
  correctAnswer: boolean;
  correctAnswerRaw: CorrectAnswer;
  userAnswer: "true" | "false" | "cant_tell";
  correctAnswerLabel: string;
  passageSnippet?: string;
  distortionLabel?: string;
  originalFragment?: string;
  replacedFragment?: string;
};

type DistortionQuizProps = {
  passageText: string;
  passageTitle?: string;
  onComplete: (correct: number, total: number, breakdown: QuestionBreakdownItem[]) => void;
  allowReRead?: boolean;
  questionCount?: number;
  trainerType: TrainingType;
  passageId: string;
};

function buildQuestions(passageText: string, count: number, passageTitle?: string): Question[] {
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
  // Only include Can't Tell if we have a passage title (otherwise they'd be incoherent)
  const numCantTell = passageTitle ? Math.max(0, Math.min(1, Math.round(targetCount * 0.2))) : 0;
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
        distortionLabel: result.label,
        originalFragment: result.originalFragment,
        replacedFragment: result.replacedFragment,
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
      if (result.applied && result.text !== sentence) {
        questions.push({
          displayedSentence: result.text,
          correctAnswer: "false",
          passageSnippet: sentence,
          distortionLabel: result.label,
          originalFragment: result.originalFragment,
          replacedFragment: result.replacedFragment,
        });
        usedIndices.add(i);
      }
    }
  }

  // Build TRUE questions (paraphrased - NOT verbatim)
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

  // Build CAN'T TELL question (only when passage title available for coherent statement)
  if (numCantTell > 0) {
    const cantTell = buildCantTellQuestion(allSentences, passageTitle);
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
  passageTitle,
  onComplete,
  allowReRead = true,
  questionCount = NUM_QUESTIONS,
  trainerType,
  passageId,
}: DistortionQuizProps) {
  const questions = useMemo(() => buildQuestions(passageText, questionCount, passageTitle), [passageText, questionCount, passageTitle]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerChoice[]>(() =>
    Array(questions.length).fill(null)
  );
  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  const [showReRead, setShowReRead] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

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
        distortionLabel: q.distortionLabel,
        originalFragment: q.originalFragment,
        replacedFragment: q.replacedFragment,
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
      // Use event.code so shortcuts work on Mac (Option = Alt; Option+key yields different key value)
      if (e.altKey && e.code === "KeyN") {
        e.preventDefault();
        setCurrentIndex((i) => Math.min(questions.length - 1, i + 1));
      } else if (e.altKey && e.code === "KeyP") {
        e.preventDefault();
        setCurrentIndex((i) => Math.max(0, i - 1));
      } else if (e.altKey && e.code === "KeyF") {
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
          className="min-h-[44px] px-6 py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90"
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
              ? "bg-primary text-primary-foreground"
              : "bg-card border border-border text-foreground hover:bg-secondary"
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
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                toggleFlag();
                setFeedbackOpen(true);
              }}
              className={`flex items-center justify-center gap-1.5 text-[13px] px-3 py-2 min-h-[44px] rounded ${
                flagged.has(currentIndex)
                  ? "bg-amber-100 text-amber-800"
                  : "text-ucat-muted hover:bg-slate-100"
              }`}
            >
              <span aria-hidden>🚩</span>
              Flag / report
            </button>
          </div>
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
              className="min-h-[44px] px-4 py-2 bg-primary text-primary-foreground text-[15px] rounded-lg hover:bg-primary/90 flex items-center justify-center gap-2"
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
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-amber-600 text-white hover:bg-amber-700"
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

      {questions.length > 0 && (
        <QuestionFeedbackModal
          isOpen={feedbackOpen}
          onClose={() => setFeedbackOpen(false)}
          context={{
            trainerType,
            questionKind: "vr_tfct",
            questionIdentifier: `distortion:${passageId}:${currentIndex}`,
            passageId,
            sessionId: null,
          }}
        />
      )}
    </div>
  );
}
