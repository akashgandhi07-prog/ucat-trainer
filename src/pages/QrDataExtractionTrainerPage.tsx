import { useEffect, useRef, useState } from "react";
import SkillTrainerShell, { ChoiceField, MistakeCausePrompt, ResultsCard, ReviewMistakesButton, TrainerLoading, TrainerProgress } from "../components/skillTrainers/SkillTrainerShell";
import { useSkillTrainerRun } from "../components/skillTrainers/useSkillTrainerRun";
import { RESULTS_SUMMARY } from "../components/skillTrainers/resultsSummary";
import { DATA_EXTRACTION_QUESTIONS, type DataExtractionQuestion } from "../data/skillTrainerQuestions";
import { saveSkillAttempt } from "../lib/skillTrainerProgress";
import { useSkillTrainerRunLog } from "../hooks/useSkillTrainerRunLog";
const DESCRIPTION="Find the correct row, column and unit before doing any arithmetic. This isolates the table-reading errors that often look like maths errors.";
type Answers={source:string;value:string;unit:string}; const blank=():Answers=>({source:"",value:"",unit:""});
export default function QrDataExtractionTrainerPage(){
 const run=useSkillTrainerRun("qr_extraction",DATA_EXTRACTION_QUESTIONS,8);
 if(!run.items)return <SkillTrainerShell title="QR Data Extraction Trainer" description={DESCRIPTION} path="/ucat-qr-data-extraction-trainer" hubPath="/ucat-quantitative-reasoning-practice" hubLabel="Quantitative Reasoning" faqKey="qrDataExtraction"><TrainerLoading/></SkillTrainerShell>;
 return <DataExtractionRun key={run.runKey} questions={run.items} sessionId={run.sessionId} reviewMode={run.reviewMode} userId={run.userId} markAnswered={run.markAnswered} restart={run.restart}/>;
}
function DataExtractionRun({questions,sessionId,reviewMode,userId,markAnswered,restart}:{questions:DataExtractionQuestion[];sessionId:string;reviewMode:boolean;userId:string|null;markAnswered:()=>void;restart:(review?:boolean)=>void}){
 const [startedAt,setStartedAt]=useState(()=>Date.now()); const logRun=useSkillTrainerRunLog("qr_data_extraction",sessionId);
 const [index,setIndex]=useState(0),[answers,setAnswers]=useState<Answers>(blank),[revealed,setRevealed]=useState(false),[score,setScore]=useState(0),[done,setDone]=useState(false); const q=questions[index];
 const points=Number(answers.source===q.sourceAnswer)+Number(answers.value===q.valueAnswer)+Number(answers.unit===q.unitAnswer), ready=Object.values(answers).every(Boolean);
 if(done)return <SkillTrainerShell title="QR Data Extraction Trainer" description={DESCRIPTION} path="/ucat-qr-data-extraction-trainer" hubPath="/ucat-quantitative-reasoning-practice" hubLabel="Quantitative Reasoning" faqKey="qrDataExtraction"><ResultsCard score={score} total={questions.length*3} summary={RESULTS_SUMMARY.qr_extraction} onRestart={()=>restart()} actions={<ReviewMistakesButton trainerType="qr_extraction" userId={userId} onReview={()=>restart(true)}/>}/></SkillTrainerShell>;
 return <SkillTrainerShell title="QR Data Extraction Trainer" description={DESCRIPTION} path="/ucat-qr-data-extraction-trainer" hubPath="/ucat-quantitative-reasoning-practice" hubLabel="Quantitative Reasoning" faqKey="qrDataExtraction">
  <TrainerProgress current={index} total={questions.length} score={score+(revealed?points:0)}/><section className="rounded-2xl border border-border bg-card p-5 shadow-card sm:p-7">
   <h2 className="text-lg font-semibold">{q.title}</h2><DataTable headers={q.headers} rows={q.rows}/>
   <p className="mt-5 text-base font-semibold text-foreground">{q.prompt}</p><div className="mt-4 space-y-4"><ChoiceField legend="1. Which cells contain the needed data?" options={q.sourceOptions} value={answers.source} answer={q.sourceAnswer} revealed={revealed} onChange={v=>setAnswers(a=>({...a,source:v}))}/><ChoiceField legend="2. What value follows from those cells?" options={q.valueOptions} value={answers.value} answer={q.valueAnswer} revealed={revealed} onChange={v=>setAnswers(a=>({...a,value:v}))}/><ChoiceField legend="3. What is the correct unit?" options={q.unitOptions} value={answers.unit} answer={q.unitAnswer} revealed={revealed} onChange={v=>setAnswers(a=>({...a,unit:v}))}/></div>
   {revealed&&<div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4" role="status"><p className="font-semibold text-blue-950">{points}/3 extraction decisions correct</p><p className="mt-1 text-sm text-blue-900">{q.explanation}</p></div>}{revealed&&(points)<3&&<MistakeCausePrompt key={q.id} trainerType="qr_extraction" sessionId={sessionId} itemId={q.id} userId={userId}/>}
   <div className="mt-5 flex justify-end"><button type="button" disabled={!ready} onClick={()=>{if(!revealed){markAnswered();void saveSkillAttempt("qr_extraction",{clientSessionId:sessionId,review:reviewMode,itemId:q.id,score:points,max:3,seconds:Math.round((Date.now()-startedAt)/1000),at:new Date().toISOString(),components:{source:answers.source===q.sourceAnswer,value:answers.value===q.valueAnswer,unit:answers.unit===q.unitAnswer}},userId);logRun({correct:score+points,total:(index+1)*3,completed:index===questions.length-1});setRevealed(true);return}const next=score+points;setScore(next);if(index===questions.length-1)setDone(true);else{setIndex(i=>i+1);setAnswers(blank());setRevealed(false);setStartedAt(Date.now())}}} className="min-h-11 rounded-lg bg-primary px-5 py-2.5 font-semibold text-primary-foreground disabled:opacity-40">{revealed?(index===questions.length-1?"See results":"Next table"):"Check extraction"}</button></div>
  </section>
 </SkillTrainerShell>;
}

/** Fits a 4-column table on a 375px phone: no forced width, wrapping headers, tighter cells. Sideways scroll stays as a last resort, with a hint only when it is actually needed. */
function DataTable({headers,rows}:{headers:string[];rows:string[][]}){
 const ref=useRef<HTMLDivElement>(null); const[overflows,setOverflows]=useState(false);
 useEffect(()=>{const el=ref.current;if(!el)return;const measure=()=>setOverflows(el.scrollWidth>el.clientWidth+1);measure();if(typeof ResizeObserver==="undefined")return;const ro=new ResizeObserver(measure);ro.observe(el);return()=>ro.disconnect()},[headers,rows]);
 return <div className="mt-3">
  <div ref={ref} className="overflow-x-auto rounded-xl border border-border" tabIndex={overflows?0:undefined} role={overflows?"region":undefined} aria-label={overflows?"Data table, scroll sideways to see every column":undefined}><table className="w-full border-collapse text-xs sm:text-sm"><thead><tr>{headers.map(h=><th key={h} scope="col" className="break-words border-b border-border bg-secondary px-2 py-2 text-left align-bottom font-semibold sm:px-3 sm:py-2.5">{h}</th>)}</tr></thead><tbody>{rows.map(row=><tr key={row[0]}>{row.map((cell,j)=><td key={j} className="border-b border-border px-2 py-2 tabular-nums sm:px-3 sm:py-2.5">{cell}</td>)}</tr>)}</tbody></table></div>
  {overflows&&<p className="mt-1 text-xs text-muted-foreground">Scroll sideways to see every column.</p>}
 </div>;
}
