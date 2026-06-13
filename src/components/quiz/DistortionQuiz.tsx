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
  // ── verbs: showing / indicating ──
  [/\bshows\b/gi, ["demonstrates", "indicates", "reveals", "illustrates"]],
  [/\bshown\b/gi, ["demonstrated", "indicated", "revealed", "established"]],
  [/\bsuggests\b/gi, ["indicates", "implies", "points to", "signals"]],
  [/\bdemonstrates\b/gi, ["shows", "illustrates", "confirms", "reveals"]],
  [/\bindicates\b/gi, ["shows", "suggests", "signals", "points to"]],
  [/\bimplies\b/gi, ["suggests", "signals", "points to", "infers"]],
  [/\breveals\b/gi, ["shows", "exposes", "uncovers", "demonstrates"]],
  [/\billustrates\b/gi, ["shows", "demonstrates", "exemplifies", "highlights"]],
  [/\bhighlights\b/gi, ["underlines", "emphasises", "draws attention to", "stresses"]],
  [/\bunderlines\b/gi, ["emphasises", "highlights", "reinforces", "stresses"]],
  [/\bconfirms\b/gi, ["verifies", "establishes", "corroborates", "validates"]],

  // ── verbs: arguing / claiming ──
  [/\bargue\b/gi, ["contend", "assert", "maintain", "hold"]],
  [/\bargues\b/gi, ["contends", "asserts", "maintains", "holds"]],
  [/\bargued\b/gi, ["contended", "asserted", "maintained", "claimed"]],
  [/\bclaim\b/gi, ["assert", "contend", "maintain", "argue"]],
  [/\bclaims\b/gi, ["asserts", "contends", "maintains", "argues"]],
  [/\bclaimed\b/gi, ["asserted", "contended", "maintained", "argued"]],
  [/\bcontend\b/gi, ["argue", "assert", "maintain", "hold"]],
  [/\bcontends\b/gi, ["argues", "asserts", "maintains", "holds"]],
  [/\bassert\b/gi, ["argue", "contend", "maintain", "hold"]],
  [/\basserts\b/gi, ["argues", "contends", "maintains", "holds"]],
  [/\bmaintain\b/gi, ["argue", "contend", "assert", "hold"]],
  [/\bmaintains\b/gi, ["argues", "contends", "asserts", "holds"]],
  [/\bpropose\b/gi, ["suggest", "put forward", "advance", "advocate"]],
  [/\bproposes\b/gi, ["suggests", "puts forward", "advances", "advocates"]],
  [/\bproposed\b/gi, ["suggested", "put forward", "advanced", "advocated"]],

  // ── verbs: requiring / enabling ──
  [/\brequires\b/gi, ["demands", "necessitates", "calls for", "entails"]],
  [/\brequired\b/gi, ["demanded", "necessitated", "needed", "mandated"]],
  [/\ballow\b/gi, ["permit", "enable", "facilitate"]],
  [/\ballows\b/gi, ["permits", "enables", "facilitates"]],
  [/\ballowed\b/gi, ["permitted", "enabled", "facilitated"]],
  [/\benable\b/gi, ["allow", "permit", "facilitate", "make possible"]],
  [/\benables\b/gi, ["allows", "permits", "facilitates", "makes possible"]],
  [/\bfacilitate\b/gi, ["enable", "support", "assist", "promote"]],
  [/\bfacilitates\b/gi, ["enables", "supports", "assists", "promotes"]],
  [/\bpermit\b/gi, ["allow", "enable", "sanction", "authorise"]],
  [/\bpermits\b/gi, ["allows", "enables", "sanctions", "authorises"]],

  // ── verbs: causing / producing ──
  [/\bcauses\b/gi, ["leads to", "results in", "triggers", "produces"]],
  [/\bcaused\b/gi, ["triggered", "resulted in", "brought about", "produced"]],
  [/\bleads to\b/gi, ["results in", "causes", "gives rise to", "produces"]],
  [/\bresults in\b/gi, ["leads to", "causes", "produces", "gives rise to"]],
  [/\btriggers\b/gi, ["causes", "provokes", "sparks", "initiates"]],
  [/\bproduces\b/gi, ["generates", "yields", "creates", "brings about"]],
  [/\bgenerates\b/gi, ["produces", "creates", "yields", "gives rise to"]],
  [/\bcontributes to\b/gi, ["adds to", "plays a role in", "feeds into", "supports"]],

  // ── verbs: supporting / opposing ──
  [/\bsupport\b/gi, ["sustain", "uphold", "back", "endorse"]],
  [/\bsupports\b/gi, ["sustains", "upholds", "backs", "endorses"]],
  [/\boppose\b/gi, ["resist", "challenge", "contest", "object to"]],
  [/\bopposes\b/gi, ["resists", "challenges", "contests", "objects to"]],
  [/\bchallenge\b/gi, ["question", "contest", "dispute", "oppose"]],
  [/\bchallenges\b/gi, ["questions", "contests", "disputes", "opposes"]],
  [/\bquestioned\b/gi, ["challenged", "disputed", "contested", "doubted"]],

  // ── verbs: examining / finding ──
  [/\bexamined\b/gi, ["investigated", "studied", "analysed", "explored"]],
  [/\bexamines\b/gi, ["investigates", "studies", "analyses", "explores"]],
  [/\bidentified\b/gi, ["recognised", "noted", "found", "detected"]],
  [/\bidentifies\b/gi, ["recognises", "notes", "finds", "detects"]],
  [/\bnoted\b/gi, ["observed", "remarked", "pointed out", "recorded"]],
  [/\bnotes\b/gi, ["observes", "remarks", "points out", "records"]],
  [/\bobserved\b/gi, ["noted", "found", "detected", "recorded"]],
  [/\bobserves\b/gi, ["notes", "finds", "records", "remarks"]],
  [/\bestablished\b/gi, ["shown", "confirmed", "demonstrated", "determined"]],
  [/\bfound\b/gi, ["discovered", "identified", "determined", "established"]],
  [/\bdetermined\b/gi, ["established", "found", "concluded", "ascertained"]],
  [/\bconcluded\b/gi, ["determined", "found", "established", "inferred"]],
  [/\brecognised\b/gi, ["acknowledged", "identified", "noted", "accepted"]],
  [/\backnowledged\b/gi, ["recognised", "accepted", "admitted", "conceded"]],

  // ── verbs: emphasising ──
  [/\bemphasise\b/gi, ["stress", "highlight", "underline", "underscore"]],
  [/\bemphasises\b/gi, ["stresses", "highlights", "underlines", "underscores"]],
  [/\bemphasized\b/gi, ["stressed", "highlighted", "underlined", "underscored"]],
  [/\bemphasizes\b/gi, ["stresses", "highlights", "underlines", "underscores"]],
  [/\bstress\b/gi, ["emphasise", "highlight", "underscore", "underline"]],
  [/\bstresses\b/gi, ["emphasises", "highlights", "underscores", "underlines"]],
  [/\bstressed\b/gi, ["emphasised", "highlighted", "underscored", "underlined"]],

  // ── verbs: providing / using ──
  [/\bprovide\b/gi, ["offer", "supply", "give", "afford"]],
  [/\bprovides\b/gi, ["offers", "supplies", "gives", "affords"]],
  [/\bprovided\b/gi, ["offered", "supplied", "given", "afforded"]],
  [/\boffer\b/gi, ["provide", "supply", "present", "give"]],
  [/\boffers\b/gi, ["provides", "supplies", "presents", "gives"]],
  [/\butilise\b/gi, ["use", "employ", "apply", "make use of"]],
  [/\butilises\b/gi, ["uses", "employs", "applies", "makes use of"]],
  [/\butilised\b/gi, ["used", "employed", "applied", "made use of"]],
  [/\bemploy\b/gi, ["use", "utilise", "apply", "make use of"]],
  [/\bemploys\b/gi, ["uses", "utilises", "applies", "makes use of"]],
  [/\bobtain\b/gi, ["acquire", "gain", "secure", "attain"]],
  [/\bobtained\b/gi, ["acquired", "gained", "secured", "attained"]],

  // ── verbs: believing / considering ──
  [/\bbelieved\b/gi, ["thought", "considered", "regarded", "held"]],
  [/\bbelieve\b/gi, ["think", "consider", "hold", "take the view"]],
  [/\bbelieves\b/gi, ["thinks", "considers", "holds", "takes the view"]],
  [/\bconsider\b/gi, ["regard", "view", "deem", "see"]],
  [/\bconsiders\b/gi, ["regards", "views", "deems", "sees"]],
  [/\bconsidered\b/gi, ["regarded", "viewed", "deemed", "seen"]],
  [/\bregard\b/gi, ["view", "consider", "see", "treat"]],
  [/\bregards\b/gi, ["views", "considers", "sees", "treats"]],
  [/\bregarded\b/gi, ["viewed", "considered", "seen", "treated"]],
  [/\bperceived\b/gi, ["seen", "viewed", "regarded", "understood"]],

  // ── adjectives: importance / severity ──
  [/\bimportant\b/gi, ["significant", "crucial", "essential", "key"]],
  [/\bsignificant\b/gi, ["considerable", "substantial", "notable", "meaningful"]],
  [/\bsevere\b/gi, ["serious", "acute", "critical", "grave"]],
  [/\bessential\b/gi, ["vital", "crucial", "necessary", "indispensable"]],
  [/\bvital\b/gi, ["essential", "critical", "indispensable", "key"]],
  [/\bfundamental\b/gi, ["core", "basic", "central", "foundational"]],
  [/\bcritical\b/gi, ["crucial", "pivotal", "decisive", "essential"]],
  [/\bcrucial\b/gi, ["critical", "pivotal", "vital", "essential"]],
  [/\bpivotal\b/gi, ["crucial", "critical", "central", "key"]],
  [/\bkey\b/gi, ["central", "crucial", "primary", "core"]],
  [/\bcentral\b/gi, ["key", "core", "primary", "fundamental"]],
  [/\bprimary\b/gi, ["main", "principal", "chief", "foremost"]],
  [/\bmain\b/gi, ["primary", "principal", "chief", "key"]],
  [/\bprincipal\b/gi, ["main", "primary", "chief", "leading"]],
  [/\bmajor\b/gi, ["significant", "considerable", "substantial", "key"]],
  [/\bminor\b/gi, ["small", "limited", "slight", "modest"]],

  // ── adjectives: difficulty / complexity ──
  [/\bdifficult\b/gi, ["challenging", "demanding", "problematic", "hard"]],
  [/\bchallenging\b/gi, ["difficult", "demanding", "taxing", "problematic"]],
  [/\bcomplex\b/gi, ["intricate", "complicated", "multifaceted", "nuanced"]],
  [/\bintricate\b/gi, ["complex", "complicated", "elaborate", "nuanced"]],
  [/\bcomplicated\b/gi, ["complex", "intricate", "involved", "nuanced"]],
  [/\bstraightforward\b/gi, ["simple", "clear", "uncomplicated", "direct"]],
  [/\bsimple\b/gi, ["straightforward", "basic", "clear", "uncomplicated"]],

  // ── adjectives: size / extent ──
  [/\bnumerous\b/gi, ["many", "a great number of", "a variety of", "multiple"]],
  [/\bsubstantial\b/gi, ["considerable", "significant", "sizeable", "large"]],
  [/\bconsiderable\b/gi, ["substantial", "significant", "sizeable", "notable"]],
  [/\bextensive\b/gi, ["wide-ranging", "broad", "wide", "far-reaching"]],
  [/\bbroad\b/gi, ["wide", "extensive", "wide-ranging", "comprehensive"]],
  [/\bwide\b/gi, ["broad", "extensive", "widespread", "far-reaching"]],
  [/\bwidespread\b/gi, ["common", "extensive", "prevalent", "pervasive"]],
  [/\bprevalent\b/gi, ["widespread", "common", "frequent", "pervasive"]],
  [/\bcommon\b/gi, ["widespread", "prevalent", "frequent", "typical"]],
  [/\btypical\b/gi, ["common", "standard", "usual", "characteristic"]],
  [/\bsignificantly\b/gi, ["considerably", "substantially", "markedly", "notably"]],
  [/\bconsiderably\b/gi, ["significantly", "substantially", "markedly", "greatly"]],
  [/\bsubstantially\b/gi, ["considerably", "significantly", "markedly", "greatly"]],
  [/\bgreatly\b/gi, ["considerably", "substantially", "significantly", "markedly"]],
  [/\bmarkedly\b/gi, ["considerably", "substantially", "significantly", "noticeably"]],

  // ── adjectives: description ──
  [/\beffective\b/gi, ["successful", "efficient", "productive", "impactful"]],
  [/\befficient\b/gi, ["effective", "productive", "streamlined", "capable"]],
  [/\bsuccessful\b/gi, ["effective", "productive", "fruitful", "accomplished"]],
  [/\bineffective\b/gi, ["unsuccessful", "inadequate", "insufficient", "unproductive"]],
  [/\badequate\b/gi, ["sufficient", "satisfactory", "acceptable", "appropriate"]],
  [/\bsufficient\b/gi, ["adequate", "enough", "satisfactory", "appropriate"]],
  [/\binappropriate\b/gi, ["unsuitable", "improper", "unacceptable", "inadequate"]],
  [/\bappropriate\b/gi, ["suitable", "proper", "fitting", "adequate"]],
  [/\bnovel\b/gi, ["new", "innovative", "original", "pioneering"]],
  [/\binnovative\b/gi, ["novel", "pioneering", "groundbreaking", "new"]],
  [/\btraditional\b/gi, ["conventional", "established", "long-standing", "orthodox"]],
  [/\bconventional\b/gi, ["traditional", "standard", "orthodox", "established"]],
  [/\bcontroversial\b/gi, ["disputed", "contentious", "debated", "contested"]],
  [/\bdisputed\b/gi, ["contested", "controversial", "debated", "challenged"]],
  [/\bcontentious\b/gi, ["controversial", "disputed", "debated", "divisive"]],
  [/\bunclear\b/gi, ["ambiguous", "uncertain", "vague", "uncertain"]],
  [/\bambiguous\b/gi, ["unclear", "vague", "uncertain", "open to interpretation"]],
  [/\buncertain\b/gi, ["unclear", "ambiguous", "unsettled", "open"]],
  [/\bapparent\b/gi, ["evident", "clear", "obvious", "visible"]],
  [/\bevident\b/gi, ["apparent", "clear", "obvious", "plain"]],
  [/\bobvious\b/gi, ["clear", "evident", "apparent", "plain"]],
  [/\blimited\b/gi, ["restricted", "constrained", "narrow", "modest"]],
  [/\bpotential\b/gi, ["possible", "prospective", "likely", "promising"]],
  [/\bpossible\b/gi, ["potential", "feasible", "plausible", "conceivable"]],

  // ── adverbs: frequency / degree ──
  [/\bfrequently\b/gi, ["regularly", "commonly", "routinely", "often"]],
  [/\brapidly\b/gi, ["quickly", "swiftly", "speedily", "at pace"]],
  [/\bwidely\b/gi, ["broadly", "generally", "extensively", "commonly"]],
  [/\boften\b/gi, ["frequently", "regularly", "commonly", "routinely"]],
  [/\bregularly\b/gi, ["frequently", "consistently", "routinely", "commonly"]],
  [/\broutinely\b/gi, ["regularly", "frequently", "consistently", "typically"]],
  [/\bcommonly\b/gi, ["frequently", "widely", "generally", "typically"]],
  [/\bgenerally\b/gi, ["typically", "commonly", "broadly", "as a rule"]],
  [/\btypically\b/gi, ["generally", "usually", "commonly", "ordinarily"]],
  [/\busually\b/gi, ["typically", "generally", "commonly", "ordinarily"]],
  [/\bordinarily\b/gi, ["usually", "typically", "generally", "normally"]],
  [/\bnormally\b/gi, ["usually", "typically", "generally", "ordinarily"]],
  [/\bconsistently\b/gi, ["reliably", "regularly", "steadily", "uniformly"]],
  [/\bprimarily\b/gi, ["mainly", "chiefly", "principally", "largely"]],
  [/\bmainly\b/gi, ["primarily", "chiefly", "principally", "largely"]],
  [/\blargely\b/gi, ["mainly", "primarily", "chiefly", "predominantly"]],
  [/\bpredominantly\b/gi, ["mainly", "primarily", "largely", "chiefly"]],
  [/\bchiefly\b/gi, ["mainly", "primarily", "largely", "principally"]],
  [/\bparticularly\b/gi, ["especially", "notably", "specifically", "in particular"]],
  [/\bespecially\b/gi, ["particularly", "notably", "in particular", "specifically"]],
  [/\bnotably\b/gi, ["particularly", "especially", "significantly", "in particular"]],
  [/\bspecifically\b/gi, ["particularly", "in particular", "notably", "explicitly"]],
  [/\bexplicitly\b/gi, ["specifically", "clearly", "expressly", "directly"]],
  [/\bultimately\b/gi, ["in the end", "finally", "at its core", "in the final analysis"]],
  [/\bfinally\b/gi, ["ultimately", "in the end", "lastly", "in conclusion"]],
  [/\binitially\b/gi, ["at first", "originally", "to begin with", "at the outset"]],
  [/\boriginally\b/gi, ["initially", "at first", "to begin with", "at the outset"]],
  [/\bsubsequently\b/gi, ["later", "afterwards", "following this", "thereafter"]],
  [/\bthereafter\b/gi, ["subsequently", "afterwards", "later", "following this"]],
  [/\bpreviously\b/gi, ["earlier", "before", "formerly", "in the past"]],
  [/\bformerly\b/gi, ["previously", "earlier", "once", "in the past"]],
  [/\brecently\b/gi, ["in recent times", "lately", "of late", "in recent years"]],
  [/\binceasingly\b/gi, ["more and more", "progressively", "ever more", "to a greater extent"]],
  [/\bprogressively\b/gi, ["increasingly", "gradually", "steadily", "over time"]],
  [/\bgradually\b/gi, ["progressively", "steadily", "over time", "little by little"]],
  [/\bsteadily\b/gi, ["gradually", "progressively", "consistently", "continuously"]],

  // ── adverbs: connectors ──
  [/\bhowever\b/gi, ["nevertheless", "nonetheless", "yet", "that said"]],
  [/\bnevertheless\b/gi, ["however", "nonetheless", "even so", "that said"]],
  [/\bnonetheless\b/gi, ["however", "nevertheless", "even so", "that said"]],
  [/\bconsequently\b/gi, ["as a result", "therefore", "thus", "hence"]],
  [/\btherefore\b/gi, ["consequently", "as a result", "thus", "hence"]],
  [/\bthus\b/gi, ["therefore", "consequently", "as a result", "hence"]],
  [/\bhence\b/gi, ["therefore", "consequently", "thus", "as a result"]],
  [/\bfurthermore\b/gi, ["moreover", "additionally", "in addition", "beyond this"]],
  [/\bmoreover\b/gi, ["furthermore", "additionally", "in addition", "beyond this"]],
  [/\badditionally\b/gi, ["furthermore", "moreover", "in addition", "also"]],
  [/\bin addition\b/gi, ["furthermore", "moreover", "additionally", "also"]],
  [/\bnevertheless\b/gi, ["however", "nonetheless", "even so", "despite this"]],
  [/\bby contrast\b/gi, ["in contrast", "on the other hand", "conversely", "whereas"]],
  [/\bin contrast\b/gi, ["by contrast", "on the other hand", "conversely", "whereas"]],
  [/\bconversely\b/gi, ["in contrast", "on the other hand", "by contrast", "whereas"]],
  [/\bwhereas\b/gi, ["while", "although", "in contrast", "by contrast"]],
  [/\balthough\b/gi, ["while", "whereas", "even though", "despite the fact that"]],
  [/\bdespite\b/gi, ["notwithstanding", "in spite of", "regardless of", "even with"]],
  [/\bnotwithstanding\b/gi, ["despite", "in spite of", "regardless of", "even with"]],

  // ── nouns: people / roles ──
  [/\bpatients\b/gi, ["individuals", "people", "those affected", "those involved"]],
  [/\bphysicians\b/gi, ["doctors", "clinicians", "medical professionals", "practitioners"]],
  [/\bdoctors\b/gi, ["physicians", "clinicians", "medical professionals", "practitioners"]],
  [/\bclinicians\b/gi, ["doctors", "physicians", "practitioners", "medical professionals"]],
  [/\bpractitioners\b/gi, ["clinicians", "professionals", "doctors", "providers"]],
  [/\bresearchers\b/gi, ["scientists", "investigators", "scholars", "academics"]],
  [/\bscientists\b/gi, ["researchers", "investigators", "scholars", "academics"]],
  [/\binvestigators\b/gi, ["researchers", "scientists", "scholars", "analysts"]],
  [/\bexperts\b/gi, ["specialists", "authorities", "professionals", "scholars"]],
  [/\bspecialists\b/gi, ["experts", "authorities", "professionals", "consultants"]],
  [/\bauthorities\b/gi, ["officials", "regulators", "experts", "specialists"]],
  [/\bregulators\b/gi, ["authorities", "officials", "oversight bodies", "policymakers"]],
  [/\bpolicymakers\b/gi, ["regulators", "authorities", "officials", "legislators"]],
  [/\bgovernments\b/gi, ["authorities", "policymakers", "states", "administrations"]],

  // ── nouns: concepts ──
  [/\bevidence\b/gi, ["data", "findings", "proof", "research"]],
  [/\bfindings\b/gi, ["results", "evidence", "data", "conclusions"]],
  [/\bresults\b/gi, ["findings", "outcomes", "data", "conclusions"]],
  [/\boutcomes\b/gi, ["results", "findings", "consequences", "effects"]],
  [/\bconsequences\b/gi, ["outcomes", "effects", "results", "implications"]],
  [/\bimplications\b/gi, ["consequences", "effects", "ramifications", "significance"]],
  [/\bapproach\b/gi, ["method", "strategy", "way", "technique"]],
  [/\bapproaches\b/gi, ["methods", "strategies", "ways", "techniques"]],
  [/\bmethod\b/gi, ["approach", "technique", "strategy", "procedure"]],
  [/\bmethods\b/gi, ["approaches", "techniques", "strategies", "procedures"]],
  [/\bstrategy\b/gi, ["approach", "method", "plan", "tactic"]],
  [/\bstrategies\b/gi, ["approaches", "methods", "plans", "tactics"]],
  [/\bframework\b/gi, ["structure", "model", "system", "approach"]],
  [/\bsystem\b/gi, ["framework", "structure", "model", "mechanism"]],
  [/\bmechanism\b/gi, ["process", "system", "means", "pathway"]],
  [/\bprocess\b/gi, ["procedure", "mechanism", "system", "approach"]],
  [/\bprocedure\b/gi, ["process", "method", "approach", "technique"]],
  [/\btreatment\b/gi, ["therapy", "intervention", "care", "management"]],
  [/\btherapy\b/gi, ["treatment", "intervention", "care", "management"]],
  [/\bintervention\b/gi, ["treatment", "measure", "action", "approach"]],
  [/\bpolicy\b/gi, ["guideline", "rule", "regulation", "measure"]],
  [/\bpolicies\b/gi, ["guidelines", "rules", "regulations", "measures"]],
  [/\bguidelines\b/gi, ["recommendations", "standards", "policies", "protocols"]],
  [/\bstandards\b/gi, ["guidelines", "criteria", "benchmarks", "norms"]],
  [/\bprinciples\b/gi, ["values", "guidelines", "standards", "foundations"]],
  [/\bvalues\b/gi, ["principles", "beliefs", "ideals", "standards"]],
  [/\bconcerns\b/gi, ["worries", "issues", "problems", "reservations"]],
  [/\bissues\b/gi, ["concerns", "problems", "challenges", "matters"]],
  [/\bproblems\b/gi, ["issues", "concerns", "challenges", "difficulties"]],
  [/\bchallenges\b/gi, ["difficulties", "obstacles", "problems", "issues"]],
  [/\bobstacles\b/gi, ["barriers", "challenges", "hurdles", "impediments"]],
  [/\bbarriers\b/gi, ["obstacles", "impediments", "challenges", "hurdles"]],
  [/\brisk\b/gi, ["danger", "threat", "hazard", "possibility of harm"]],
  [/\brisks\b/gi, ["dangers", "threats", "hazards", "potential harms"]],
  [/\bbenefit\b/gi, ["advantage", "gain", "merit", "positive outcome"]],
  [/\bbenefits\b/gi, ["advantages", "gains", "merits", "positive outcomes"]],
  [/\bharm\b/gi, ["damage", "injury", "detriment", "adverse effect"]],
  [/\bharms\b/gi, ["damages", "injuries", "detriments", "adverse effects"]],
  [/\badvantage\b/gi, ["benefit", "merit", "strength", "plus"]],
  [/\bdisadvantage\b/gi, ["drawback", "limitation", "downside", "shortcoming"]],
  [/\blimitation\b/gi, ["drawback", "shortcoming", "constraint", "weakness"]],
  [/\blimitations\b/gi, ["drawbacks", "shortcomings", "constraints", "weaknesses"]],
  [/\bpurpose\b/gi, ["aim", "goal", "objective", "intention"]],
  [/\baim\b/gi, ["purpose", "goal", "objective", "intention"]],
  [/\bgoal\b/gi, ["aim", "purpose", "objective", "target"]],
  [/\bobjective\b/gi, ["aim", "goal", "purpose", "target"]],
  [/\bdebate\b/gi, ["discussion", "controversy", "argument", "dispute"]],
  [/\bdiscussion\b/gi, ["debate", "dialogue", "examination", "consideration"]],
  [/\bcontroversy\b/gi, ["debate", "dispute", "disagreement", "argument"]],

  // ── nouns: fields ──
  [/\bmedicine\b/gi, ["healthcare", "medical practice", "clinical care", "the medical field"]],
  [/\bhealthcare\b/gi, ["medicine", "medical care", "clinical practice", "health services"]],
  [/\bscience\b/gi, ["research", "scientific inquiry", "the sciences", "scientific study"]],
  [/\btechnology\b/gi, ["innovation", "technical development", "advances", "tools"]],
  [/\bsociety\b/gi, ["communities", "the public", "people", "the population"]],

  // ── multi-word phrases ──
  [/\bassociated with\b/gi, ["linked to", "connected to", "related to", "tied to"]],
  [/\bcharacterised by\b/gi, ["defined by", "marked by", "distinguished by", "typified by"]],
  [/\bin order to\b/gi, ["to", "so as to", "with the aim of", "with a view to"]],
  [/\bwith regard to\b/gi, ["regarding", "concerning", "in relation to", "with respect to"]],
  [/\bin relation to\b/gi, ["regarding", "concerning", "with regard to", "with respect to"]],
  [/\bwith respect to\b/gi, ["regarding", "concerning", "in relation to", "with regard to"]],
  [/\bin the context of\b/gi, ["in terms of", "within", "regarding", "in relation to"]],
  [/\bdue to\b/gi, ["because of", "owing to", "as a result of", "on account of"]],
  [/\bbecause of\b/gi, ["due to", "owing to", "as a result of", "on account of"]],
  [/\bowing to\b/gi, ["due to", "because of", "as a result of", "on account of"]],
  [/\bas a result of\b/gi, ["due to", "because of", "owing to", "stemming from"]],
  [/\bin spite of\b/gi, ["despite", "notwithstanding", "regardless of", "even with"]],
  [/\bprevious\b/gi, ["earlier", "prior", "past", "preceding"]],
  [/\bcurrently\b/gi, ["at present", "today", "at this time", "now"]],
  [/\bincreasing\b/gi, ["growing", "rising", "escalating", "mounting"]],
  [/\bincreased\b/gi, ["grew", "rose", "escalated", "mounted"]],
  [/\bdecreasing\b/gi, ["declining", "falling", "reducing", "diminishing"]],
  [/\bdecreased\b/gi, ["declined", "fell", "reduced", "diminished"]],
];

type ParaphraseResult = {
  text: string;
  originalFragment?: string;
  replacedFragment?: string;
};

function paraphrase(sentence: string): ParaphraseResult {
  let result = sentence;
  let changes = 0;
  let firstOriginal: string | undefined;
  let firstReplaced: string | undefined;
  const maxChanges = 2;
  for (const [re, synonyms] of shuffle(SYNONYM_MAP)) {
    if (changes >= maxChanges) break;
    // Use exec so the regex position is reliable and we get the exact match
    const globalRe = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
    globalRe.lastIndex = 0;
    const match = globalRe.exec(result);
    if (!match) continue;
    const replacement = pick(synonyms);
    // Preserve the capitalisation of whatever character opened the match
    const cased = match[0][0] === match[0][0].toUpperCase() && match[0][0] !== match[0][0].toLowerCase()
      ? replacement.charAt(0).toUpperCase() + replacement.slice(1)
      : replacement;
    if (!firstOriginal) {
      firstOriginal = match[0];
      firstReplaced = cased;
    }
    // Replace only the first occurrence so the fragment tracking stays accurate
    result = result.slice(0, match.index) + cased + result.slice(match.index + match[0].length);
    changes++;
  }
  return { text: result, originalFragment: firstOriginal, replacedFragment: firstReplaced };
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

// ───────── NOT/EXCEPT question builder (exported for the NOT/EXCEPT trainer) ─────────

export type ExceptOption = {
  /** The statement shown to the student. */
  text: string;
  /** True when the statement is supported by the passage. */
  supported: boolean;
  /** The passage sentence this option was built from. */
  sourceSentence: string;
  /** Student-facing explanation of why the option is or is not supported. */
  explanation: string;
  /** Distortion label for the unsupported option (reuses the engine's labels). */
  distortionLabel?: string;
  originalFragment?: string;
  replacedFragment?: string;
};

export type ExceptQuestion = {
  prompt: string;
  options: ExceptOption[];
  /** Index in `options` of the statement NOT supported by the passage. */
  correctIndex: number;
};

/**
 * Builds ONE 4-option NOT/EXCEPT question from a passage: three statements that
 * ARE supported (true variants via synonym substitution of distinct sentences)
 * plus one that is NOT supported (a distorted statement), shuffled.
 *
 * Pass `opts.exclude` (a set of already-used source sentences) when generating
 * several questions from the same passage so questions stay distinct.
 * Returns null when the passage cannot support a question.
 */
// eslint-disable-next-line react-refresh/only-export-components -- pure generator co-located with the distortion engine it reuses; consumed by NotExceptTrainerPage
export function generateExceptSet(
  passage: { text: string; title?: string },
  opts?: { exclude?: Set<string> }
): ExceptQuestion | null {
  const sentences = splitSentences(passage.text.trim()).filter(
    (s) => !opts?.exclude?.has(s)
  );
  if (sentences.length < 4) return null;

  const shuffled = shuffle(sentences);

  // Find a sentence we can distort: this becomes the unsupported statement.
  let distorted: { source: string; result: DistortionResult } | null = null;
  for (const s of shuffled) {
    const result = applyDistortion(s);
    if (result.applied) {
      distorted = { source: s, result };
      break;
    }
  }
  if (!distorted) return null;

  // Three supported statements from distinct other sentences (paraphrased).
  const remaining = shuffled.filter((s) => s !== distorted.source);
  const paraphrased = remaining.map((s) => ({ s, p: paraphrase(s) }));
  // Prefer sentences where a synonym swap was made (richer explanations).
  const ordered = [
    ...paraphrased.filter((r) => r.p.text !== r.s),
    ...paraphrased.filter((r) => r.p.text === r.s),
  ];
  if (ordered.length < 3) return null;

  const supportedOptions: ExceptOption[] = ordered.slice(0, 3).map(({ s, p }) => ({
    text: p.text,
    supported: true,
    sourceSentence: s,
    explanation:
      p.originalFragment && p.replacedFragment
        ? `Supported. The passage states: "${s}" ("${p.originalFragment}" was paraphrased as "${p.replacedFragment}" but the meaning is unchanged).`
        : `Supported. The passage states: "${s}"`,
    originalFragment: p.originalFragment,
    replacedFragment: p.replacedFragment,
  }));

  const unsupportedOption: ExceptOption = {
    text: distorted.result.text,
    supported: false,
    sourceSentence: distorted.source,
    explanation: `Not supported. This statement was changed (${distorted.result.label ?? "the wording was altered"}). The passage actually says: "${distorted.source}"`,
    distortionLabel: distorted.result.label,
    originalFragment: distorted.result.originalFragment,
    replacedFragment: distorted.result.replacedFragment,
  };

  const options = shuffle([...supportedOptions, unsupportedOption]);
  const correctIndex = options.findIndex((o) => !o.supported);
  if (correctIndex === -1) return null;

  // Mark all four source sentences as used so subsequent questions differ.
  if (opts?.exclude) {
    for (const o of options) opts.exclude.add(o.sourceSentence);
  }

  return {
    prompt: "Which of the following is NOT supported by the passage?",
    options,
    correctIndex,
  };
}

// ───────── Question type ─────────

type CorrectAnswer = "true" | "false" | "cant_tell";

export type McOption = {
  text: string;
  /** True for the single best-supported option. */
  isCorrect: boolean;
  /** Why this option is right or wrong (distortion label for wrong options). */
  explanation: string;
  sourceSentence: string;
  distortionLabel?: string;
  originalFragment?: string;
  replacedFragment?: string;
};

type Question =
  | {
      kind: "tfct";
      displayedSentence: string;
      correctAnswer: CorrectAnswer;
      passageSnippet: string;
      distortionLabel?: string;
      originalFragment?: string;
      replacedFragment?: string;
    }
  | {
      kind: "mc";
      prompt: string;
      options: McOption[];
      correctIndex: number;
    };

type AnswerChoice = "true" | "false" | "cant_tell" | null;
/** T/F/CT choice for standard questions; option index (number) for the MC question. */
type AnswerValue = AnswerChoice | number;

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
  /** Present for the 4-option multiple choice question (additive; existing consumers ignore it). */
  mcOptions?: McOption[];
  mcSelectedIndex?: number | null;
  mcCorrectIndex?: number;
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

/**
 * Builds the 4-option "best supported" MC question: 1 true variant + 3 distorted
 * statements, from four distinct sentences. Returns null when the passage cannot
 * support it (callers fall back to a standard T/F/CT question).
 */
function buildMcQuestion(sentences: string[]): Question | null {
  if (sentences.length < 4) return null;
  const shuffled = shuffle(sentences);

  // Three distorted statements from distinct sentences.
  const wrong: McOption[] = [];
  const usedSentences = new Set<string>();
  for (const s of shuffled) {
    if (wrong.length >= 3) break;
    const result = applyDistortion(s);
    if (result.applied) {
      wrong.push({
        text: result.text,
        isCorrect: false,
        explanation: `Not supported: ${result.label ?? "the wording was altered"}. The passage actually says: "${s}"`,
        sourceSentence: s,
        distortionLabel: result.label,
        originalFragment: result.originalFragment,
        replacedFragment: result.replacedFragment,
      });
      usedSentences.add(s);
    }
  }
  if (wrong.length < 3) return null;

  // One true variant from a different sentence (paraphrase preferred).
  const remaining = shuffled.filter((s) => !usedSentences.has(s));
  if (remaining.length === 0) return null;
  const paraphrased = remaining.map((s) => ({ s, p: paraphrase(s) }));
  const best = paraphrased.find((r) => r.p.text !== r.s) ?? paraphrased[0];
  const right: McOption = {
    text: best.p.text,
    isCorrect: true,
    explanation: `Supported. The passage states: "${best.s}"`,
    sourceSentence: best.s,
    originalFragment: best.p.originalFragment,
    replacedFragment: best.p.replacedFragment,
  };

  const options = shuffle([right, ...wrong]);
  return {
    kind: "mc",
    prompt: "Which of the following statements is best supported by the passage?",
    options,
    correctIndex: options.findIndex((o) => o.isCorrect),
  };
}

function buildQuestions(passageText: string, count: number, passageTitle?: string): Question[] {
  const trimmed = passageText.trim();
  if (trimmed.length === 0) return [];

  const allSentences = splitSentences(trimmed);
  if (allSentences.length === 0) return [];

  // When the passage has enough usable sentences, one of the questions becomes a
  // 4-option multiple choice. The MC question consumes 4 sentences, so only
  // attempt it when there are still enough left for the standard questions.
  let mcQuestion: Question | null = null;
  let remainingSentences = allSentences;
  if (count >= 4 && allSentences.length >= 8) {
    mcQuestion = buildMcQuestion(allSentences);
    if (mcQuestion && mcQuestion.kind === "mc") {
      const mcSources = new Set(mcQuestion.options.map((o) => o.sourceSentence));
      remainingSentences = allSentences.filter((s) => !mcSources.has(s));
    }
  }
  const standardCount = mcQuestion ? count - 1 : count;

  const targetCount = Math.max(3, Math.min(standardCount, remainingSentences.length));
  const shuffledSentences = shuffle(remainingSentences);
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
        kind: "tfct",
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
          kind: "tfct",
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
  // First pass: prefer sentences where a synonym swap was made (gives richer explanations)
  const paraphraseResults = shuffledSentences.map((s, i) => ({ i, s, p: paraphrase(s) }));
  const withSwap = paraphraseResults.filter(r => !usedIndices.has(r.i) && r.p.text !== r.s);
  const withoutSwap = paraphraseResults.filter(r => !usedIndices.has(r.i) && r.p.text === r.s);
  const truePool = [...withSwap, ...withoutSwap];
  for (const { i, s, p } of truePool) {
    if (questions.filter(q => q.kind === "tfct" && q.correctAnswer === "true").length >= numTrue) break;
    if (usedIndices.has(i)) continue;
    questions.push({
      kind: "tfct",
      displayedSentence: p.text,
      correctAnswer: "true",
      passageSnippet: s,
      originalFragment: p.originalFragment,
      replacedFragment: p.replacedFragment,
    });
    usedIndices.add(i);
  }

  // Build CAN'T TELL question (only when passage title available for coherent statement)
  if (numCantTell > 0) {
    const cantTell = buildCantTellQuestion(allSentences, passageTitle);
    if (cantTell) {
      questions.push({
        kind: "tfct",
        displayedSentence: cantTell.displayedSentence,
        correctAnswer: "cant_tell",
        passageSnippet: cantTell.passageSnippet,
      });
    }
  }

  return shuffle(mcQuestion ? [...questions, mcQuestion] : questions);
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
  const [answers, setAnswers] = useState<AnswerValue[]>(() =>
    Array(questions.length).fill(null)
  );
  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  const [showReRead, setShowReRead] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const current = questions[currentIndex];
  const answeredCount = answers.filter((a) => a !== null).length;

  const handleAnswer = useCallback(
    (choice: AnswerValue) => {
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
      if (q.kind === "mc") {
        const picked = typeof answers[i] === "number" ? (answers[i] as number) : null;
        const isCorrect = picked === q.correctIndex;
        if (isCorrect) correct++;
        const pickedOption = picked != null ? q.options[picked] : null;
        const trueOption = q.options[q.correctIndex];
        // Map the MC result onto the existing breakdown shape so results screens
        // (ResultsView in Reader/Rapid Recall) render meaningful feedback without changes:
        // the shown statement is the option the student chose, judged true/false.
        return {
          statement: pickedOption
            ? `Best supported by the passage: "${pickedOption.text}"`
            : q.prompt,
          correctAnswer: isCorrect,
          correctAnswerRaw: (isCorrect ? "true" : "false") as CorrectAnswer,
          userAnswer: "true" as const,
          correctAnswerLabel: isCorrect
            ? "True"
            : `The best supported statement was: "${trueOption.text}"`,
          passageSnippet: pickedOption?.sourceSentence ?? trueOption.sourceSentence,
          distortionLabel: pickedOption?.distortionLabel,
          originalFragment: pickedOption?.originalFragment,
          replacedFragment: pickedOption?.replacedFragment,
          mcOptions: q.options,
          mcSelectedIndex: picked,
          mcCorrectIndex: q.correctIndex,
        };
      }
      const raw = answers[i];
      const a: "true" | "false" | "cant_tell" =
        raw === "true" || raw === "false" ? raw : "cant_tell";
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
          {questions.some((q) => q.kind === "mc") && (
            <> One question asks you to pick the statement best supported by the passage.</>
          )}
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

      <div className="bg-card rounded-xl border border-border p-6">
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
                  : "text-ucat-muted hover:bg-secondary"
              }`}
            >
              <span aria-hidden>🚩</span>
              Flag / report
            </button>
          </div>
        </div>
        {current?.kind === "mc" ? (
          <>
            <p className="text-[16px] leading-[1.5] text-ucat-body mb-6 font-normal">
              {current.prompt}
            </p>
            <div className="flex flex-col gap-3">
              {current.options.map((option, optIdx) => (
                <button
                  key={optIdx}
                  type="button"
                  onClick={() => handleAnswer(optIdx)}
                  className={`w-full min-h-[44px] px-4 py-3 rounded-lg border-2 font-normal text-[15px] text-ucat-body text-left flex items-start gap-3 ${answers[currentIndex] === optIdx
                    ? "border-slate-400 bg-secondary text-foreground"
                    : "border-border hover:bg-secondary"
                    }`}
                >
                  <span className="font-medium shrink-0" aria-hidden>
                    {String.fromCharCode(65 + optIdx)}.
                  </span>
                  <span>{option.text}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <p className="text-[16px] leading-[1.5] text-ucat-body mb-6 font-normal">
              {current?.displayedSentence}?
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => handleAnswer("true")}
                className={`flex-1 min-h-[44px] px-4 py-3 rounded-lg border-2 font-normal text-[15px] text-ucat-body ${answers[currentIndex] === "true"
                  ? "border-slate-400 bg-secondary text-foreground"
                  : "border-border hover:bg-secondary"
                  }`}
              >
                True
              </button>
              <button
                type="button"
                onClick={() => handleAnswer("false")}
                className={`flex-1 min-h-[44px] px-4 py-3 rounded-lg border-2 font-normal text-[15px] text-ucat-body ${answers[currentIndex] === "false"
                  ? "border-slate-400 bg-secondary text-foreground"
                  : "border-border hover:bg-secondary"
                  }`}
              >
                False
              </button>
              <button
                type="button"
                onClick={() => handleAnswer("cant_tell")}
                className={`flex-1 min-h-[44px] px-4 py-3 rounded-lg border-2 font-normal text-[15px] text-ucat-body ${answers[currentIndex] === "cant_tell"
                  ? "border-slate-400 bg-secondary text-foreground"
                  : "border-border hover:bg-secondary"
                  }`}
              >
                Can&apos;t Tell
              </button>
            </div>
          </>
        )}
      </div>

      <div className="mt-6 flex flex-col items-center gap-3">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
            disabled={currentIndex === 0}
            className="min-h-[44px] px-4 py-2 border border-border rounded-lg text-[15px] text-ucat-body hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
            className="min-h-[44px] text-[13px] text-ucat-muted hover:text-primary flex items-center justify-center gap-1 px-2"
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
