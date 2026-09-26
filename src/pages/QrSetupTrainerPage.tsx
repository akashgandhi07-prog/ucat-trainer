import { useState } from "react";
import SkillTrainerShell, { ChoiceField, ComponentProgress, MistakeCausePrompt, ResultsCard, ReviewMistakesButton, TrainerLoading, TrainerProgress } from "../components/skillTrainers/SkillTrainerShell";
import { useSkillTrainerRun } from "../components/skillTrainers/useSkillTrainerRun";
import { QR_SETUP_QUESTIONS, type QrSetupQuestion } from "../data/skillTrainerQuestions";
import { getSkillSummary, saveSkillAttempt } from "../lib/skillTrainerProgress";
import { useSkillTrainerRunLog } from "../hooks/useSkillTrainerRunLog";

const DESCRIPTION = "Identify the useful information, operation, answer unit and calculator entry. You are training mathematical translation, so the final result is deliberately withheld until review.";

type Answers = { relevant:string; operation:string; unit:string; calculation:string };
const empty = (): Answers => ({ relevant:"", operation:"", unit:"", calculation:"" });

export default function QrSetupTrainerPage() {
  const run=useSkillTrainerRun("qr_setup",QR_SETUP_QUESTIONS,8);
  if(!run.items) return <SkillTrainerShell title="QR Setup Trainer" description={DESCRIPTION} path="/ucat-qr-setup-trainer" hubPath="/ucat-quantitative-reasoning-practice" hubLabel="Quantitative Reasoning" faqKey="qrSetup"><TrainerLoading/></SkillTrainerShell>;
  return <QrSetupRun key={run.runKey} questions={run.items} sessionId={run.sessionId} reviewMode={run.reviewMode} userId={run.userId} markAnswered={run.markAnswered} restart={run.restart}/>;
}

function QrSetupRun({questions,sessionId,reviewMode,userId,markAnswered,restart}:{questions:QrSetupQuestion[];sessionId:string;reviewMode:boolean;userId:string|null;markAnswered:()=>void;restart:(review?:boolean)=>void}) {
  const logRun=useSkillTrainerRunLog("qr_setup",sessionId);
  const [startedAt,setStartedAt]=useState(()=>Date.now());
  const [index,setIndex]=useState(0), [answers,setAnswers]=useState<Answers>(empty), [revealed,setRevealed]=useState(false), [score,setScore]=useState(0), [done,setDone]=useState(false);
  const q=questions[index];
  const points = Number(answers.relevant===q.relevantAnswer)+Number(answers.operation===q.operationAnswer)+Number(answers.unit===q.unitAnswer)+Number(answers.calculation===q.calculationAnswer);
  const allChosen=Object.values(answers).every(Boolean);
  if(done) return <SkillTrainerShell title="QR Setup Trainer" description={DESCRIPTION} path="/ucat-qr-setup-trainer" hubPath="/ucat-quantitative-reasoning-practice" hubLabel="Quantitative Reasoning" faqKey="qrSetup"><ResultsCard score={score} total={questions.length*4} onRestart={()=>restart()}><ComponentProgress rows={getSkillSummary("qr_setup",userId).components}/><ReviewMistakesButton trainerType="qr_setup" userId={userId} onReview={()=>restart(true)}/></ResultsCard></SkillTrainerShell>;
  return <SkillTrainerShell title="QR Setup Trainer" description={DESCRIPTION} path="/ucat-qr-setup-trainer" hubPath="/ucat-quantitative-reasoning-practice" hubLabel="Quantitative Reasoning" faqKey="qrSetup">
    <TrainerProgress current={index} total={questions.length} score={score+(revealed?points:0)} />
    <section className="rounded-2xl border border-border bg-card p-5 shadow-card sm:p-7">
      <p className="text-base leading-relaxed text-foreground">{q.situation}</p><h2 className="mt-3 text-lg font-semibold">{q.prompt}</h2>
      <div className="mt-5 space-y-4">
        <ChoiceField legend="1. Which information matters?" options={q.relevantOptions} value={answers.relevant} answer={q.relevantAnswer} revealed={revealed} onChange={v=>setAnswers(a=>({...a,relevant:v}))}/>
        <ChoiceField legend="2. What operation or process is required?" options={q.operationOptions} value={answers.operation} answer={q.operationAnswer} revealed={revealed} onChange={v=>setAnswers(a=>({...a,operation:v}))}/>
        <ChoiceField legend="3. What unit should the answer use?" options={q.unitOptions} value={answers.unit} answer={q.unitAnswer} revealed={revealed} onChange={v=>setAnswers(a=>({...a,unit:v}))}/>
        <ChoiceField legend="4. What should be entered into the calculator?" options={q.calculationOptions} value={answers.calculation} answer={q.calculationAnswer} revealed={revealed} onChange={v=>setAnswers(a=>({...a,calculation:v}))}/>
      </div>
      {revealed && <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4" role="status"><p className="font-semibold text-blue-950">{points}/4 setup decisions correct</p><p className="mt-1 text-sm leading-relaxed text-blue-900">{q.explanation}</p></div>}{revealed&&(points)<4&&<MistakeCausePrompt key={q.id} trainerType="qr_setup" sessionId={sessionId} itemId={q.id} userId={userId}/>}
      <div className="mt-5 flex justify-end"><button type="button" disabled={!allChosen} onClick={()=>{if(!revealed){markAnswered();void saveSkillAttempt("qr_setup",{clientSessionId:sessionId,review:reviewMode,itemId:q.id,score:points,max:4,seconds:Math.round((Date.now()-startedAt)/1000),at:new Date().toISOString(),components:{information:answers.relevant===q.relevantAnswer,operation:answers.operation===q.operationAnswer,unit:answers.unit===q.unitAnswer,calculator_entry:answers.calculation===q.calculationAnswer}},userId);logRun({correct:score+points,total:(index+1)*4,completed:index===questions.length-1});setRevealed(true);return} const next=score+points;setScore(next);if(index===questions.length-1)setDone(true);else{setIndex(i=>i+1);setAnswers(empty());setRevealed(false);setStartedAt(Date.now())}}} className="min-h-11 rounded-lg bg-primary px-5 py-2.5 font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40">{revealed ? index===questions.length-1?"See results":"Next setup" : "Check setup"}</button></div>
    </section>
  </SkillTrainerShell>;
}
