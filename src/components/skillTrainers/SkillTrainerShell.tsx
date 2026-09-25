import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, RotateCcw } from "lucide-react";
import Header from "../layout/Header";
import Footer from "../layout/Footer";
import BreadcrumbNav from "../layout/BreadcrumbNav";
import SEOHead from "../seo/SEOHead";
import TrainerFaqSection from "../seo/TrainerFaqSection";
import { trainerFaqs, type TrainerFaqKey } from "../../data/trainerFaqs";
import { getSiteBaseUrl } from "../../lib/siteUrl";
import { useState } from "react";
import { annotateLatestSkillAttempt, type MistakeCause, type SkillTrainerKey } from "../../lib/skillTrainerProgress";

type Props = {
  title: string;
  description: string;
  path: string;
  hubPath: string;
  hubLabel: string;
  /** FAQs from trainerFaqs.ts, rendered below the drill with FAQPage JSON-LD. */
  faqKey?: TrainerFaqKey;
  children: ReactNode;
};

export default function SkillTrainerShell({ title, description, path, hubPath, hubLabel, faqKey, children }: Props) {
  const base = getSiteBaseUrl();
  const breadcrumbs = base ? [
    { name: "Home", url: `${base}/` },
    { name: hubLabel, url: `${base}${hubPath}` },
    { name: title, url: `${base}${path}` },
  ] : undefined;
  return <>
    <SEOHead title={title} description={description} canonicalUrl={base ? `${base}${path}` : undefined} breadcrumbs={breadcrumbs} schemaType="LearningResource" />
    <Header />
    <main id="main-content" className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:py-8">
      <BreadcrumbNav items={breadcrumbs} />
      <Link to={hubPath} className="mb-4 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Back to {hubLabel}
      </Link>
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{title}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">{description}</p>
      </header>
      {children}
    </main>
    {faqKey && <TrainerFaqSection
      id={`${path.replace(/^\//, "")}-faq`}
      title={`${title} FAQs`}
      intro="How the drill works, how it is scored and how your progress is saved."
      faqs={trainerFaqs[faqKey]}
      collapseIntoSingleAccordion
    />}
    <Footer />
  </>;
}

export function TrainerProgress({ current, total, score }: { current: number; total: number; score: number }) {
  return <div className="mb-5" aria-label={`Question ${current + 1} of ${total}. Score ${score}.`}>
    <div className="mb-2 flex items-center justify-between text-sm">
      <span className="font-medium text-foreground">Skill {current + 1} of {total}</span>
      <span className="text-muted-foreground">{score} points</span>
    </div>
    <div className="h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${((current + 1) / total) * 100}%` }} /></div>
  </div>;
}

export function ResultsCard({ score, total, onRestart, children }: { score: number; total: number; onRestart: () => void; children?: ReactNode }) {
  const pct = Math.round(score / total * 100);
  return <section className="rounded-2xl border border-border bg-card p-6 shadow-card sm:p-8" aria-labelledby="results-title">
    <p className="text-sm font-semibold uppercase tracking-wide text-primary">Drill complete</p>
    <h2 id="results-title" className="mt-1 text-2xl font-bold text-foreground">{score}/{total} points · {pct}%</h2>
    <p className="mt-2 text-sm text-muted-foreground">Your score measures the setup decisions, not just the final answer.</p>
    {children}
    <button type="button" onClick={onRestart} className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-5 py-2.5 font-semibold text-primary-foreground hover:bg-primary/90">
      <RotateCcw className="h-4 w-4" aria-hidden /> Practise again
    </button>
  </section>;
}

export function ComponentProgress({ rows }: { rows:{name:string;accuracy:number;correct:number;total:number}[] }) {
  if(!rows.length)return null;
  return <div className="mt-5"><h3 className="font-semibold text-foreground">Skill breakdown</h3><div className="mt-2 grid gap-2 sm:grid-cols-2">{rows.map(row=><div key={row.name} className="rounded-lg border border-border p-3"><div className="flex justify-between gap-3 text-sm"><span className="capitalize">{row.name.replaceAll("_"," ")}</span><strong>{row.accuracy}%</strong></div><div className="mt-2 h-1.5 rounded-full bg-secondary"><div className="h-full rounded-full bg-primary" style={{width:`${row.accuracy}%`}}/></div><p className="mt-1 text-xs text-muted-foreground">{row.correct}/{row.total} decisions</p></div>)}</div></div>
}

const MISTAKE_CAUSES: { id: MistakeCause; label: string }[] = [
  { id: "misread", label: "I misread the information" },
  { id: "method", label: "I chose the wrong method" },
  { id: "calculation", label: "Calculation slip" },
  { id: "unit", label: "Unit error" },
  { id: "rushed", label: "I rushed" },
  { id: "guessed", label: "I guessed" },
  { id: "changed_answer", label: "I changed a correct answer" },
];

export function MistakeCausePrompt({ trainerType, sessionId, itemId, userId }: {
  trainerType: SkillTrainerKey;
  sessionId: string;
  itemId: string;
  userId?: string | null;
}) {
  const [selected, setSelected] = useState<MistakeCause | null>(null);
  return <fieldset className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
    <legend className="px-1 text-sm font-semibold text-amber-950">What caused the mistake?</legend>
    <p className="mb-3 text-xs text-amber-900">Choose the main reason. This helps future recommendations target the real problem.</p>
    <div className="flex flex-wrap gap-2">{MISTAKE_CAUSES.map((cause) => <button
      key={cause.id}
      type="button"
      aria-pressed={selected === cause.id}
      onClick={() => {
        setSelected(cause.id);
        void annotateLatestSkillAttempt(trainerType, sessionId, itemId, cause.id, userId);
      }}
      className={`min-h-11 rounded-lg border px-3 py-2 text-sm ${selected === cause.id ? "border-amber-700 bg-amber-700 text-white" : "border-amber-300 bg-white text-amber-950 hover:bg-amber-100"}`}
    >{cause.label}</button>)}</div>
  </fieldset>;
}

export function ChoiceField({ legend, options, value, answer, revealed, onChange }: { legend: string; options: {id:string;label:string}[]; value: string; answer: string; revealed: boolean; onChange: (id:string)=>void }) {
  // Stable label-based ordering prevents a bank whose source answers happen to use
  // the same id from teaching an answer-position pattern. It does not jump around
  // when the component re-renders.
  const displayedOptions = [...options].sort((a, b) => {
    const hash = (text: string) => [...text].reduce((n, char) => ((n * 31) + char.charCodeAt(0)) | 0, 7);
    return hash(`${legend}:${a.label}`) - hash(`${legend}:${b.label}`);
  });
  return <fieldset className="rounded-xl border border-border p-4">
    <legend className="px-1 text-sm font-semibold text-foreground">{legend}</legend>
    <div className="mt-1 grid gap-2 sm:grid-cols-2">
      {displayedOptions.map(option => {
        const correct = revealed && option.id === answer;
        const wrong = revealed && option.id === value && option.id !== answer;
        return <label key={option.id} className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm ${correct ? "border-green-500 bg-green-50" : wrong ? "border-red-400 bg-red-50" : value === option.id ? "border-primary bg-primary/5" : "border-border bg-background hover:bg-secondary"}`}>
          <input type="radio" name={legend} value={option.id} checked={value === option.id} disabled={revealed} onChange={() => onChange(option.id)} className="h-4 w-4" />
          <span>{option.label}</span>
          {correct && <span className="ml-auto font-semibold text-green-700">Correct</span>}
        </label>;
      })}
    </div>
  </fieldset>;
}
