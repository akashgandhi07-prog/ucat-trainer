export type TrainerFaqItem = {
  id: string;
  question: string;
  answer: string;
};

export type TrainerFaqKey =
  | "home"
  | "verbalHub"
  | "speedReading"
  | "rapidRecall"
  | "keywordScanning"
  | "inference"
  | "quantHub"
  | "mentalMaths"
  | "decisionHub"
  | "syllogismMacro";

export type TrainerFaqMap = Record<TrainerFaqKey, TrainerFaqItem[]>;

export const trainerFaqs: TrainerFaqMap = {
  home: [
    {
      id: "what-is-ucat-trainer",
      question: "What is the UCAT Trainer and who is it for?",
      answer:
        "The UCAT Trainer is a free, browser-based set of practice tools built specifically for UK medical and dental school applicants sitting the UCAT. It focuses on high-yield skills that are hard to develop with static question banks alone, such as speed reading, keyword scanning, mental maths and syllogistic reasoning.",
    },
    {
      id: "how-should-i-use-site",
      question: "How should I use this UCAT practice site alongside my main question bank?",
      answer:
        "Use your main UCAT question bank for full mock exams and timed section practice, then come here to target the underlying skills you keep losing marks on. For example, if Verbal Reasoning timing is a problem, spend 10–15 minutes a day on the speed reading, rapid recall and keyword scanning trainers, then apply those techniques back in full UCAT-style questions.",
    },
    {
      id: "how-often-practise",
      question: "How often should I practise with these UCAT trainers?",
      answer:
        "Most students see the best gains when they practise little and often rather than cramming. Aim for short, focused sessions of 15–30 minutes at least 4–5 days per week in the month or two before your UCAT test date, increasing the intensity in the final few weeks.",
    },
    {
      id: "which-sections-covered",
      question: "Which UCAT sections does the UCAT Trainer cover?",
      answer:
        "The current tools focus on Verbal Reasoning, Decision Making and Quantitative Reasoning. Within those sections we provide targeted drills for speed reading, keyword scanning, rapid recall, inference, syllogisms, mental maths and calculator fluency.",
    },
    {
      id: "ucat-length-and-structure",
      question: "How long is the UCAT and how is it structured?",
      answer:
        "The standard UCAT exam lasts 117 minutes and 30 seconds of scored testing time, split across four timed subtests: Verbal Reasoning (44 questions in 22 minutes), Decision Making (35 questions in 37 minutes), Quantitative Reasoning (36 questions in 26 minutes) and Situational Judgement (69 questions in 26 minutes). Each subtest is preceded by its own short, separately timed instruction section (usually 1 minute 30 seconds, or 2 minutes for Quantitative Reasoning), so you should think of the UCAT as a sequence of sprints rather than one continuous paper.",
    },
    {
      id: "does-this-replicate-official",
      question: "Does this UCAT Trainer exactly replicate the official UCAT exam?",
      answer:
        "No third-party resource can perfectly copy the official Pearson VUE interface, timings or question pool. The aim here is not to replace official preparation, but to give you high-quality drills that mirror the cognitive demands of the test so that the official practice materials feel easier and more familiar.",
    },
    {
      id: "how-long-to-see-improvement",
      question: "How long does it take to see improvement in UCAT scores using these tools?",
      answer:
        "It varies, but many students notice improvements in reading speed, accuracy and confidence within two to three weeks of regular use. Score gains in full UCAT mocks usually lag behind by another couple of weeks as new habits become automatic.",
    },
    {
      id: "can-beginners-use",
      question: "Can I use these UCAT trainers if I am just starting my preparation?",
      answer:
        "Yes. If you are early in your UCAT journey, use the trainers to build core skills before you worry too much about scores. For example, work on reading speed and mental arithmetic first, then layer on full-length Verbal Reasoning and Quantitative Reasoning practice once you are more comfortable with the timing.",
    },
    {
      id: "does-it-track-progress",
      question: "Does the UCAT Trainer track my progress over time?",
      answer:
        "If you create an account and log in, many of the trainers will record key metrics such as words per minute, accuracy, question breakdowns and streaks. This allows you to see objective improvements over time and identify which UCAT subskills still need the most work.",
    },
    {
      id: "is-it-free",
      question: "Is this UCAT practice platform free to use?",
      answer:
        "Yes, the core trainers on this site are free to access for UK and international applicants. There are optional paid services such as one-to-one tutoring and full courses, but the tools on this platform are designed to be genuinely useful even if you never purchase anything.",
    },
    {
      id: "how-fits-with-official",
      question: "How should I use this alongside the official UCAT practice materials?",
      answer:
        "Use the official UCAT practice materials to familiarise yourself with the exact format of the exam and to benchmark your scores. Between those mocks, use this trainer to isolate one or two weak skills—for example, inference questions or calculator speed—and drill them repeatedly until they feel natural.",
    },
  ],
  verbalHub: [
    {
      id: "vr-what-is",
      question: "What is UCAT Verbal Reasoning and what does it test?",
      answer:
        "UCAT Verbal Reasoning (VR) is the first scored subtest of the UCAT exam. It assesses your ability to read, critically analyse and interpret written information quickly and accurately—skills that are essential for healthcare professionals who must process complex clinical notes, research papers and patient records under time pressure. You are presented with 11 passages of roughly 200–400 words each and must answer 44 questions in 22 minutes, giving you about 30 seconds per question.",
    },
    {
      id: "vr-question-types",
      question: "What are the question types in UCAT Verbal Reasoning?",
      answer:
        "There are two main UCAT Verbal Reasoning formats. First, True / False / Can’t Tell questions, where you decide whether a statement is supported, contradicted or cannot be confirmed from the passage alone. Second, multiple-choice comprehension questions, where you select the best answer to an incomplete statement or question about the passage. The key rule is that 'Can’t Tell' is used when the passage neither proves nor disproves the statement—not simply when you personally are unsure from real-world knowledge.",
    },
    {
      id: "vr-average-score",
      question: "What is a good UCAT Verbal Reasoning score?",
      answer:
        "Verbal Reasoning consistently has the lowest average score of all UCAT subtests. Recent UK data place the average VR score at around 600–610. A solid Verbal Reasoning score is anything above 650, and a highly competitive score for top medical schools is typically 700+. Because the average is relatively low, even modest improvements in VR can significantly boost your overall UCAT percentile.",
    },
    {
      id: "what-is-verbal-hub",
      question: "What is the Verbal Reasoning hub and how does it help my UCAT score?",
      answer:
        "The Verbal Reasoning hub brings together speed reading, rapid recall, keyword scanning and inference practice in one place. Instead of only doing mixed UCAT Verbal Reasoning questions, you can isolate each underlying skill and build automatic habits that make the official questions feel less rushed.",
    },
    {
      id: "how-much-time-verbal",
      question: "How much time should I spend on Verbal Reasoning practice each week?",
      answer:
        "Verbal Reasoning is often the lowest-scoring section for UCAT candidates, so it deserves regular attention. Many successful applicants dedicate at least 30–45 minutes per day in the final month, alternating between full verbal question sets and short targeted drills from the hub.",
    },
    {
      id: "which-trainer-first",
      question: "Which Verbal Reasoning trainer should I start with?",
      answer:
        "If you struggle to finish passages in time, start with speed reading. If you often misread statements or forget what you have just read, focus on rapid recall. If you are generally slow but accurate, keyword scanning and inference drills will help you locate relevant information faster.",
    },
    {
      id: "vr-strategies",
      question: "What general strategy should I use for UCAT Verbal Reasoning questions?",
      answer:
        "Most candidates do best when they read the question stem first, identify one or two strong keywords, then scan the passage for those terms rather than reading every word. Once you find the relevant sentence, read around it carefully and apply strict True/False/Can’t Tell or multiple-choice logic without using outside knowledge.",
    },
    {
      id: "vr-timing",
      question: "How can I manage the strict timing in UCAT Verbal Reasoning?",
      answer:
        "Aim for roughly 30 seconds per question, accepting that some sets will be quicker and others slower. The skills in this hub—especially speed reading and keyword scanning—are designed to cut down the time you spend on unimportant parts of the passage so that you can invest more attention in truly tricky questions.",
    },
    {
      id: "common-vr-mistakes",
      question: "What common mistakes do applicants make in UCAT Verbal Reasoning?",
      answer:
        "Typical mistakes include reading the entire passage before looking at the questions, bringing in outside knowledge, over-interpreting what the author might mean, and spending too long on a single difficult stem. The drills here train you to anchor your answer strictly to the text and to move on quickly when needed.",
    },
    {
      id: "when-start-verbal-prep",
      question: "When should I start focused Verbal Reasoning preparation?",
      answer:
        "Ideally you should start focused Verbal Reasoning work at least six to eight weeks before your UCAT test date. Early on, concentrate on understanding question types and practising skills like scanning; nearer the exam, prioritise full timed sets and use the hub to fix any recurring weaknesses you see in your review.",
    },
    {
      id: "improve-comprehension",
      question: "How can I improve my reading comprehension for UCAT passages?",
      answer:
        "Regularly read dense, unfamiliar texts such as opinion pieces, scientific articles and policy reports, and force yourself to summarise the main point in one sentence. Combine that habit with our speed reading and rapid recall trainers so that you learn to extract main ideas quickly without losing accuracy.",
    },
    {
      id: "balancing-speed-accuracy",
      question: "How do I balance speed and accuracy in Verbal Reasoning?",
      answer:
        "Use drills to push your reading speed and scanning technique, then review every mistake slowly to understand why the credited answer is correct. Over time you will learn which question types you can answer quickly and which deserve a little more time, allowing you to speed up without sacrificing accuracy.",
    },
    {
      id: "vr-vs-ielts",
      question: "Is UCAT Verbal Reasoning similar to school English or IELTS reading?",
      answer:
        "There is some overlap, but UCAT Verbal Reasoning is generally more time-pressured and less interested in your opinion. The test rewards precise, text-based reasoning rather than creative interpretation. The trainers on this site are designed to bridge that gap by focusing on the specific skills UCAT examiners care about.",
    },
  ],
  speedReading: [
    {
      id: "what-is-speed-reading-trainer",
      question: "What does the UCAT speed reading trainer actually do?",
      answer:
        "The speed reading trainer shows you dense, UCAT-style passages and measures your reading speed in words per minute while tracking your comprehension through follow-up questions. It is designed to help you read more efficiently without simply skimming and missing key details.",
    },
    {
      id: "target-wpm",
      question: "What words per minute (WPM) should I aim for in UCAT Verbal Reasoning?",
      answer:
        "Most successful candidates can comfortably read UCAT-style text at around 300–450 words per minute while still understanding the main ideas. You do not need extreme speed reading figures; instead you want a sustainable pace that leaves you with time to interpret questions and options accurately.",
    },
    {
      id: "how-often-speed-reading",
      question: "How often should I use the speed reading trainer?",
      answer:
        "Short, regular sessions work best. Many students benefit from doing two or three passages a day, several days per week, gradually increasing difficulty. Over time you should see your measured WPM rise while your accuracy in the follow-up quiz remains stable or improves.",
    },
    {
      id: "improve-without-losing-accuracy",
      question: "How can I increase my reading speed without losing comprehension?",
      answer:
        "Focus on reading in meaningful chunks rather than word by word, reduce subvocalisation, and avoid constantly re-reading sentences. Use the trainer to deliberately push your pace for one passage, then slow down slightly and check that you can still answer the comprehension questions reliably.",
    },
    {
      id: "transfer-to-ucat",
      question: "How does speed reading practice transfer to real UCAT Verbal Reasoning questions?",
      answer:
        "By training with similar text density and timing, you become more comfortable digesting complex information quickly. That frees up more of your limited question time for careful evaluation of answer options, True/False/Can’t Tell decisions and inference, all of which directly affect your Verbal Reasoning score.",
    },
    {
      id: "bad-at-reading",
      question: "What if I am a slow reader or English is not my first language?",
      answer:
        "If you currently read slowly or English is not your first language, start with easier passages and a lower WPM target, then gradually build up. Consistent practice can still produce large gains in speed and confidence, and focusing on precise, text-based reasoning will help you even if you never reach very high WPM values.",
    },
    {
      id: "how-long-passages",
      question: "Are the speed reading passages the same length as UCAT Verbal Reasoning texts?",
      answer:
        "The passages are designed to be broadly comparable to UCAT Verbal Reasoning texts in length and complexity, though individual sets may vary. This keeps the practice realistic while allowing you to work on different topics, tones and structures.",
    },
    {
      id: "time-management-benefits",
      question: "How does improving speed reading help my overall UCAT timing?",
      answer:
        "If you can understand passages more quickly and with fewer re-reads, you spend less time wrestling with the text and more time evaluating options. That breathing space reduces panic, makes it easier to flag and revisit tricky questions, and indirectly supports better performance across the whole exam day.",
    },
    {
      id: "other-exams",
      question: "Will speed reading practice help with other exams or medical school?",
      answer:
        "Yes. The same skills that help you process UCAT passages—reading dense information quickly, identifying main arguments, and spotting supporting evidence—are valuable for medical school interviews, situational judgement scenarios, university reading lists and even clinical guidelines later on.",
    },
    {
      id: "avoid-bad-habits",
      question: "Can speed reading training ever be harmful for UCAT preparation?",
      answer:
        "Speed reading becomes unhelpful if you focus only on headline WPM and stop caring about accuracy. Always monitor your quiz results; if comprehension drops as speed rises, dial the pace back slightly and work on chunking and focus rather than pure speed.",
    },
  ],
  rapidRecall: [
    {
      id: "what-is-rapid-recall",
      question: "What does the Rapid Recall trainer practise for UCAT Verbal Reasoning?",
      answer:
        "The Rapid Recall trainer presents you with a short passage and then a series of statements under strict time pressure, mimicking UCAT True/False/Can’t Tell style questions. It trains you to hold key facts in mind and make quick, text-based judgements without rereading the entire passage.",
    },
    {
      id: "difference-from-speed-reading",
      question: "How is Rapid Recall different from the speed reading trainer?",
      answer:
        "Speed reading focuses on increasing your reading rate and comfort with dense text, whereas Rapid Recall stresses short-term retention and rapid decision-making. In Rapid Recall you intentionally read with the knowledge that you will be quizzed moments later, which closely mirrors the feel of Verbal Reasoning question sets.",
    },
    {
      id: "improve-tfct",
      question: "Can this help with True/False/Can’t Tell questions in the UCAT?",
      answer:
        "Yes. Rapid Recall passages and statements are designed to train the exact skill you need for True/False/Can’t Tell: remembering what the text actually said and distinguishing that from what might be true in real life. Practising under time pressure makes it easier to apply the same discipline in the real exam.",
    },
    {
      id: "handling-time-pressure",
      question: "How should I handle the time pressure in the Rapid Recall trainer?",
      answer:
        "Treat each passage as a sprint. Skim efficiently for structure, note key names, numbers and claims, then commit to your answers without agonising. If you are repeatedly running out of time, slow the trainer slightly, focus on accuracy, and then gradually increase the pressure again.",
    },
    {
      id: "how-many-sets",
      question: "How many Rapid Recall sets should I do in one sitting?",
      answer:
        "Quality is more important than raw volume. Two to four focused sets, followed by a careful review of explanations and mistakes, will usually teach you more than ten rushed sets. You want to finish each session knowing exactly why you missed particular statements so you can adjust your reading strategy.",
    },
    {
      id: "link-to-keyword-scanning",
      question: "How does Rapid Recall relate to keyword scanning and inference skills?",
      answer:
        "Rapid Recall strengthens your baseline comprehension and memory, making it easier to spot contradictions or unsupported claims when you later use keyword scanning or inference strategies. Together, these skills allow you to jump to the right part of the passage and still remember enough context to judge each statement correctly.",
    },
    {
      id: "benefit-for-other-subtests",
      question: "Does Rapid Recall practice help with other UCAT sections?",
      answer:
        "Indirectly, yes. Training yourself to read, retain and manipulate information quickly is useful in Decision Making and Situational Judgement as well as Verbal Reasoning. However, you should still practise those sections directly using targeted resources.",
    },
    {
      id: "common-rapid-recall-mistakes",
      question: "What common mistakes should I avoid in Rapid Recall practice?",
      answer:
        "Common pitfalls include reading too slowly at the start, second-guessing your first instinct without checking the text, and letting one difficult statement eat up all your remaining time. Use the trainer to practise making clear, decisive choices based on what the text actually says.",
    },
    {
      id: "measuring-progress-rapid-recall",
      question: "How can I measure progress using the Rapid Recall trainer?",
      answer:
        "Track your percentage of correct statements, how often you run out of time, and whether particular passage types or topics cause more difficulty. Over time you should see higher accuracy, fewer unanswered statements and a calmer decision-making process under time pressure.",
    },
    {
      id: "when-to-use-rapid-recall",
      question: "When in my UCAT preparation should I focus on Rapid Recall practice?",
      answer:
        "Rapid Recall is most helpful once you understand the basic Verbal Reasoning formats and want to improve speed and reliability. Many students use it heavily in the final four to six weeks before the exam, alternating it with full Verbal Reasoning sets and review.",
    },
  ],
  keywordScanning: [
    {
      id: "what-is-keyword-scanning",
      question: "What does the keyword scanning trainer teach me for UCAT Verbal Reasoning?",
      answer:
        "The keyword scanning trainer helps you practise reading the question first, choosing one or two distinctive keywords, and then scanning a dense passage to find the exact sentence you need. This mirrors the technique used by high-scoring candidates to cope with severe Verbal Reasoning time pressure.",
    },
    {
      id: "choosing-keywords",
      question: "How do I choose good keywords to scan for in a passage?",
      answer:
        "Pick specific, visually distinctive words such as names, dates, numbers and uncommon nouns rather than vague terms like \"people\" or \"study\". If your first keyword appears too often, switch to an alternative that is more unique so you read less of the passage before finding the relevant line.",
    },
    {
      id: "avoiding-traps",
      question: "How does keyword scanning help me avoid UCAT Verbal Reasoning traps?",
      answer:
        "Many wrong options are based on distortions of what the passage actually says. By locating the exact sentence linked to your keyword and reading around it carefully, you are less likely to be pulled in by answers that twist the detail, exaggerate claims or rely on outside knowledge.",
    },
    {
      id: "when-to-read-fully",
      question: "Should I always scan for keywords instead of reading the whole passage?",
      answer:
        "Not always. Keyword scanning is ideal when you have specific, fact-based questions, but some inference and tone questions benefit from a broader understanding. The trainer helps you develop a feel for when scanning is efficient and when a more complete read is worth the time.",
    },
    {
      id: "time-savings",
      question: "How much time can effective keyword scanning save in the UCAT?",
      answer:
        "Candidates who scan well often answer straightforward fact-based questions in under 20 seconds, leaving extra time for tougher inference or evaluation items. Over a full Verbal Reasoning section, this can free up several additional minutes compared with reading every passage line by line.",
    },
    {
      id: "improving-with-practice",
      question: "How can I tell if my keyword scanning is improving?",
      answer:
        "You should notice that you locate relevant sentences more quickly and that your accuracy on detail-based questions improves even as you read less of the passage. Reviewing each question and highlighting where the answer came from in the text is a powerful way to accelerate this progress.",
    },
    {
      id: "common-scanning-mistakes",
      question: "What common mistakes should I avoid when using keyword scanning?",
      answer:
        "Typical errors include picking keywords that are too generic, failing to read enough surrounding context once the keyword is found, and assuming that a similar-looking word must relate to the question. The trainer encourages you to slow down at the crucial moment—once you have located the right line—so you still answer accurately.",
    },
    {
      id: "fits-with-other-trainers",
      question: "How does keyword scanning fit with speed reading and rapid recall training?",
      answer:
        "Speed reading makes it easier to move through the text, rapid recall improves how much you retain, and keyword scanning decides where to focus that effort. Using all three together gives you a robust Verbal Reasoning toolkit for the real UCAT exam.",
    },
    {
      id: "benefit-beyond-ucat",
      question: "Will keyword scanning skills help me beyond the UCAT?",
      answer:
        "Yes. Efficiently locating key information in long documents is invaluable at university and in clinical practice, whether you are reading research papers, guidelines or patient notes. UCAT-style keyword scanning is an excellent early introduction to that way of working.",
    },
    {
      id: "difficulty-levels",
      question: "Does the keyword scanning trainer include different difficulty levels?",
      answer:
        "Passages and tasks can vary in density and subtlety, from relatively straightforward factual look-up questions to trickier ones where the keyword appears several times. Working through this range will prepare you for the full spectrum of UCAT Verbal Reasoning sets.",
    },
  ],
  inference: [
    {
      id: "what-is-inference-trainer",
      question: "What does the UCAT inference trainer help me practise?",
      answer:
        "The inference trainer gives you passages and asks you to identify which conclusions are supported, contradicted or not fully justified by the text. It closely mirrors UCAT Verbal Reasoning inference questions, where you must base your answer only on the evidence in front of you.",
    },
    {
      id: "difference-from-tfct",
      question: "How are inference questions different from simple True/False/Can’t Tell items?",
      answer:
        "Inference questions often require you to combine two or more statements or to recognise what logically follows from a claim, rather than matching a sentence directly. The correct answer is still strictly tied to the passage, but you may have to join the dots in a more subtle way.",
    },
    {
      id: "avoiding-assumptions",
      question: "How can I stop bringing outside knowledge into inference questions?",
      answer:
        "Train yourself to ask, \"What does the passage guarantee is true?\" rather than \"What do I know about this topic?\" If the text does not explicitly support or contradict a claim, you should be willing to choose an option that reflects uncertainty, even if you personally suspect the claim is true.",
    },
    {
      id: "step-by-step-method",
      question: "Is there a step-by-step method for tackling UCAT inference items?",
      answer:
        "A simple approach is to underline the key facts in the passage, restate them in your own words, then test each possible conclusion against that summary. If a conclusion adds information, softens or strengthens a claim beyond what was stated, it is usually not strictly supported.",
    },
    {
      id: "improving-accuracy",
      question: "How can I improve my accuracy on inference-style Verbal Reasoning questions?",
      answer:
        "Focus your review on why wrong answers are wrong, not just why the right answer is right. Look for recurring patterns such as extreme language, assumptions about motives, or extrapolations to different time periods or populations that the passage never mentioned.",
    },
    {
      id: "timing-inference",
      question: "How much time should I spend on inference questions in the UCAT?",
      answer:
        "Inference questions can be slower than simple fact-checking items, so try to save them for when you have a small buffer of time from earlier questions. With practice in this trainer, you should be able to recognise the structure quickly and avoid over-analysing every possible interpretation.",
    },
    {
      id: "benefit-to-other-sections",
      question: "Do inference skills help with other UCAT sections or interviews?",
      answer:
        "Yes. The same habit of basing your conclusions on evidence is central to Decision Making, Situational Judgement and later medical school interview scenarios. Being precise about what is and is not justified by the information given is a core professional skill.",
    },
    {
      id: "dealing-with-ambiguous",
      question: "What should I do when an inference question feels genuinely ambiguous?",
      answer:
        "When stuck, compare the options and ask which one is most tightly tied to the exact wording of the passage. The credited answer is rarely a wild leap; it tends to be the statement that restates the text in different words without going beyond it.",
    },
    {
      id: "reviewing-inference-mistakes",
      question: "How should I review mistakes from inference training sessions?",
      answer:
        "Rewrite the key lines of the passage in your own words, then write down why your chosen answer was not fully supported or was contradicted. Over time you will build a personal list of \"red flag\" patterns that signal likely trap answers for you.",
    },
    {
      id: "building-confidence",
      question: "How does repeated inference practice build confidence for exam day?",
      answer:
        "By seeing many variations on the same logical structures, you start to recognise common question frames quickly. This reduces the cognitive load on test day so that you can focus on the content of the passage rather than figuring out what the question is really asking.",
    },
  ],
  quantHub: [
    {
      id: "qr-what-is",
      question: "What is UCAT Quantitative Reasoning and what level of maths is required?",
      answer:
        "UCAT Quantitative Reasoning (QR) is the third scored subtest of the UCAT exam. It assesses your ability to work with numbers in context by interpreting tables, charts, graphs and worded scenarios—not advanced pure mathematics. The required level is solid GCSE maths: percentages, ratios, proportions, basic algebra, averages, unit conversions, and simple area and volume. You have 26 minutes to answer 36 questions, with access to an on-screen calculator, so the challenge is using straightforward maths efficiently under time pressure rather than knowing complex formulas.",
    },
    {
      id: "what-is-quant-hub",
      question: "What is the Quantitative Reasoning hub designed to do?",
      answer:
        "The Quantitative Reasoning hub brings together calculator-focused and mental maths trainers to strengthen the numerical skills you need for the UCAT Quantitative Reasoning section. It helps you decide when to reach for the on-screen calculator and when to rely on fast mental calculation.",
    },
    {
      id: "qr-timing",
      question: "How much time do I get per question in UCAT Quantitative Reasoning?",
      answer:
        "In the UCAT you have 26 minutes for 36 Quantitative Reasoning questions, plus a 2 minute instruction section before the subtest starts. That works out at a little over 40 seconds per scored question, so you cannot afford to do long, written calculations for every item.",
    },
    {
      id: "calculator-vs-mental",
      question: "When should I use the on-screen calculator instead of mental maths?",
      answer:
        "Use the calculator for multi-step operations, awkward decimals and unfamiliar percentages, but rely on mental maths for simple addition, subtraction, rounding and estimation. Our trainers are designed to help you develop good instincts for which approach will be faster and safer in each scenario.",
    },
    {
      id: "estimating-answers",
      question: "How important is estimation in UCAT Quantitative Reasoning?",
      answer:
        "Estimation is crucial. Many questions can be answered by rounding numbers sensibly and checking which option is in the right ballpark, saving you precious seconds. Practising estimation in both calculator and mental maths drills will make you more confident about using this approach.",
    },
    {
      id: "improve-weak-maths",
      question: "What if my GCSE maths is rusty—can I still do well in QR?",
      answer:
        "Yes, but you will need to be systematic. Use the mental maths trainer to refresh core arithmetic, fractions, ratios and percentages, then move on to mixed Quantitative Reasoning practice where you apply those basics under time pressure. The hub helps you close gaps without needing a full A level in maths.",
    },
    {
      id: "data-interpretation",
      question: "Does the Quantitative Reasoning hub cover graphs and data interpretation?",
      answer:
        "The current focus is on the underlying calculation skills that sit beneath most QR questions. You should also practise interpreting tables, charts and word problems in your main question bank, but being faster and more accurate with the numbers will already make those tasks much easier.",
    },
    {
      id: "common-qr-mistakes",
      question: "What common mistakes lead to lost marks in Quantitative Reasoning?",
      answer:
        "Candidates often misread units, mishandle percentages, or carry forward earlier errors through long calculations. They also waste time by overusing the calculator for sums that could be done mentally. Our trainers encourage you to check units, approximate answers and keep calculations as simple as possible.",
    },
    {
      id: "balancing-speed-accuracy-qr",
      question: "How can I balance speed and accuracy in UCAT QR practice?",
      answer:
        "Start by working untimed until you are consistently accurate, then gradually add time pressure. Use the hub to speed up your mental arithmetic and calculator fluency so that timing in full QR sets becomes less of a constraint.",
    },
    {
      id: "using-official-calculator",
      question: "Should I practise with the official UCAT calculator layout?",
      answer:
        "As you get closer to your test date, it is sensible to practise with an interface that resembles the official UCAT calculator, including keyboard shortcuts for opening it and entering numbers. The calculator-focused trainer on this site is designed with that goal in mind.",
    },
    {
      id: "qr-improvement-timeline",
      question: "How long does it usually take to improve at Quantitative Reasoning?",
      answer:
        "With consistent, focused practice, many students see noticeable improvements in QR scores over four to six weeks. The key is to combine targeted skill work—like mental maths—with regular full-question practice so that you learn to apply those skills under realistic timing.",
    },
  ],
  mentalMaths: [
    {
      id: "what-is-mental-maths-trainer",
      question: "What does the UCAT mental maths trainer focus on?",
      answer:
        "The mental maths trainer gives you rapid-fire arithmetic questions that mimic the kinds of calculations you need in UCAT Quantitative Reasoning, such as percentages, ratios, fractions and simple algebra. It trains you to work accurately in your head without relying on the calculator for every step.",
    },
    {
      id: "benefit-for-qr",
      question: "How does improving mental maths help my Quantitative Reasoning score?",
      answer:
        "If you can handle basics like percentage changes, fraction conversions and proportional reasoning mentally, you will spend far less time entering numbers into the calculator. That time can then be used to understand the scenario properly and avoid careless mistakes in multi-step questions.",
    },
    {
      id: "how-often-mental-maths",
      question: "How often should I practise mental maths for the UCAT?",
      answer:
        "Short, daily practice is ideal. Five to ten minutes of focused mental maths drills most days will usually beat one long session at the weekend. The trainer is designed to fit into small gaps in your schedule, such as study breaks or commutes.",
    },
    {
      id: "dealing-with-anxiety",
      question: "What if I get anxious when doing maths in my head?",
      answer:
        "Regular exposure in a low-stakes environment can gradually desensitise that anxiety. Start with easier questions, focus on staying calm rather than being perfect, and celebrate small improvements in speed or accuracy. Over time, the UCAT calculator will feel like a helpful backup rather than a crutch.",
    },
    {
      id: "which-topics-to-focus",
      question: "Which mental maths topics are most important for UCAT QR?",
      answer:
        "Key areas include percentages (especially percentage change and reverse percentages), ratios, unit conversions, averages, and basic algebra. The trainer emphasises these because they appear again and again in official-style Quantitative Reasoning questions.",
    },
    {
      id: "checking-work",
      question: "How can I quickly check mental calculations during the UCAT?",
      answer:
        "Use rough estimation and order-of-magnitude checks. Ask yourself whether your answer is obviously too big or too small, whether the direction of change makes sense, and whether the number of decimal places is reasonable given the question.",
    },
    {
      id: "transition-to-calculator",
      question: "When should I move from pure mental maths practice to calculator-based QR sets?",
      answer:
        "Once you can answer basic arithmetic questions quickly and accurately in this trainer, begin mixing in full Quantitative Reasoning questions that require both mental work and calculator use. The goal is not to abandon the calculator, but to use it only where it genuinely speeds you up.",
    },
    {
      id: "tracking-progress-mental",
      question: "How can I track my progress in mental maths over time?",
      answer:
        "Watch for improvements in your accuracy percentage, the difficulty of questions you can handle comfortably, and your subjective sense of effort. Many students also notice that school maths and everyday calculations feel easier, which is a good sign that the skill is becoming automatic.",
    },
    {
      id: "non-maths-students",
      question: "Can I still succeed in UCAT QR if I do not study A level Maths?",
      answer:
        "Yes. The UCAT draws heavily on GCSE-level content rather than advanced mathematics. Focused mental maths training and regular QR practice questions are more important than formal maths qualifications.",
    },
    {
      id: "using-notes",
      question: "May I write notes while doing mental maths in the UCAT?",
      answer:
        "In the official test you will have access to a whiteboard or notepad and pen. It is sensible to jot down intermediate steps for longer calculations, but the more you can simplify and streamline those steps through mental practice, the less cluttered and stressful the process will feel.",
    },
  ],
  decisionHub: [
    {
      id: "dm-what-is",
      question: "What is UCAT Decision Making and what does it test?",
      answer:
        "UCAT Decision Making (DM) is the second scored subtest of the UCAT. It assesses your ability to apply logic, evaluate evidence and make sound decisions under time pressure—directly reflecting the skills required of doctors who must make clinical judgements with incomplete or complex information. You answer 35 questions in 37 minutes across six formats: syllogisms, logic puzzles, recognising assumptions, interpreting information (data and text), Venn diagrams and probabilistic reasoning.",
    },
    {
      id: "what-is-decision-hub",
      question: "What does the Decision Making hub cover for the UCAT?",
      answer:
        "The Decision Making hub focuses on the logical reasoning skills tested in the UCAT Decision Making section, particularly syllogisms. It helps you practise working carefully through arguments, identifying what must be true, and rejecting attractive but unjustified statements.",
    },
    {
      id: "dm-format",
      question: "What is the format of the UCAT Decision Making section?",
      answer:
        "In Decision Making you answer 35 questions in 37 minutes, with a separate 1 minute 30 second instruction section before the subtest. That is just over one minute per scored question on average. The section includes formats such as syllogisms, logic puzzles, data interpretation, probability and recognising assumptions. Many items require you to evaluate several Yes/No statements from the same stimulus, and multi-statement questions use partial marking rather than all-or-nothing scoring.",
    },
    {
      id: "why-syllogisms-important",
      question: "Why are syllogism questions so important for UCAT Decision Making?",
      answer:
        "Syllogisms appear frequently and can be a reliable source of marks once you have a clear, repeatable method. They reward disciplined, rule-based reasoning rather than background knowledge, so good technique can quickly turn them into a strength.",
    },
    {
      id: "using-syllogism-drills",
      question: "How should I use the syllogism micro and macro drills in this hub?",
      answer:
        "Use micro drills to master the basic logic of statements involving words like \"all\", \"some\" and \"none\" on short, focused questions. Then move on to macro drills that more closely resemble full UCAT Decision Making items, with longer stimuli and five Yes/No conclusions per scenario.",
    },
    {
      id: "common-dm-mistakes",
      question: "What common mistakes do students make in Decision Making syllogisms?",
      answer:
        "Students often reverse statements (treating \"all A are B\" as if it implied \"all B are A\"), bring in real-world knowledge, or misinterpret quantifiers such as \"some\" and \"none\". The drills are structured to expose you repeatedly to these traps until you recognise and avoid them automatically.",
    },
    {
      id: "diagram-use",
      question: "Should I draw diagrams for UCAT syllogism questions?",
      answer:
        "Many candidates find simple Venn diagrams or quick sketches of sets helpful, especially when several groups are involved. With practice you will learn when a diagram is worth the time investment and when the relationships are simple enough to track mentally.",
    },
    {
      id: "timing-dm",
      question: "How can I manage timing in UCAT Decision Making?",
      answer:
        "Aim for roughly a minute per question on average, but recognise that some puzzle-style items will take longer. If a particular syllogism or puzzle is absorbing too much time, practise the discipline of making your best guess, flagging the item, and moving on.",
    },
    {
      id: "dm-vs-interviews",
      question: "Will Decision Making practice help with medical school interviews?",
      answer:
        "Yes. The same logical discipline of basing decisions on evidence and clearly stated rules is valuable in ethical scenarios, multiple mini-interviews and later in clinical reasoning. Getting comfortable with structured thinking now will serve you well beyond the UCAT.",
    },
    {
      id: "when-to-focus-dm",
      question: "When in my UCAT preparation should I focus on Decision Making?",
      answer:
        "Many students start with Verbal Reasoning and Quantitative Reasoning, then add regular Decision Making practice a few weeks later. The hub is ideal once you know the basic question formats and want to build consistency and speed, especially with syllogisms.",
    },
    {
      id: "balancing-sections",
      question: "How should I balance practice time between Decision Making and other UCAT sections?",
      answer:
        "Your exact balance will depend on your mock results, but most applicants benefit from touching every section at least twice a week. If Decision Making is currently a weakness, schedule short, frequent sessions with the hub until your accuracy and confidence improve.",
    },
  ],
  syllogismMacro: [
    {
      id: "what-is-syllogism-macro",
      question: "What does the Syllogism Macro drill simulate from the UCAT?",
      answer:
        "The Syllogism Macro drill recreates full UCAT-style Decision Making syllogism questions, where you are given a longer stimulus and asked to judge several conclusions as Yes or No. It trains you to maintain concentration over a complex scenario while applying formal logic consistently.",
    },
    {
      id: "difference-micro-macro",
      question: "How is the macro drill different from the micro syllogism exercises?",
      answer:
        "Micro drills focus on short, isolated statements so you can learn the rules. Macro drills combine those rules in more realistic, exam-length questions with five conclusions. They help you practise stamina, error-checking and time management under pressure.",
    },
    {
      id: "using-quantifiers-correctly",
      question: "How should I handle words like \"all\", \"some\" and \"none\" in macro syllogisms?",
      answer:
        "Treat these quantifiers as precise, mathematical terms rather than everyday language. \"All\" means every member of the group, \"none\" means not a single member, and \"some\" means at least one but not necessarily all. The drill gives you repeated exposure so these meanings become second nature.",
    },
    {
      id: "diagram-strategy",
      question: "Is it worth drawing diagrams for long syllogism scenarios?",
      answer:
        "Often yes. A quick sketch of overlapping sets or a simple table can prevent confusion when several categories are involved. The macro drill is a good place to practise doing this efficiently so it helps rather than slows you down in the real UCAT.",
    },
    {
      id: "checking-conclusions",
      question: "What is the best way to check conclusions in a macro syllogism question?",
      answer:
        "Work one conclusion at a time, asking whether it must always be true given the premises. If you can imagine even one possible arrangement of the groups where the premises hold but the conclusion fails, you should answer No. This \"counter-example\" mindset is central to accurate syllogism work.",
    },
    {
      id: "handling-time-pressure-macro",
      question: "How can I handle the time pressure on long syllogism questions?",
      answer:
        "Have a clear, practised routine—for example, skim the premises, sketch a diagram, then test each conclusion systematically. If you are still stuck after a minute, make your best judgement on the remaining statements, flag the question and move on rather than letting one item derail your timing.",
    },
    {
      id: "marking-scheme",
      question: "How are macro-style syllogism questions marked in the UCAT?",
      answer:
        "In the official exam, macro-style syllogism questions use partial marking: you receive 2 marks if all five Yes/No judgements are correct, 1 mark if four out of five are correct, and 0 marks otherwise. Our macro drill mirrors this scoring so that your practice scores reflect the real UCAT marking scheme.",
    },
    {
      id: "improving-over-time",
      question: "How should I track my improvement on Syllogism Macro drills?",
      answer:
        "Record how many statements per question you get correct, how often you finish within your target time, and whether particular quantifiers or patterns cause recurring mistakes. Revisiting those patterns in micro drills can then reinforce the underlying rule.",
    },
    {
      id: "dm-score-impact",
      question: "How much can mastering macro syllogisms boost my Decision Making score?",
      answer:
        "Because syllogisms appear frequently and allow partial credit, becoming strong at them can make a noticeable difference to your overall Decision Making scaled score. Many high scorers treat them as \"must-get\" marks rather than lottery questions.",
    },
    {
      id: "when-to-practise-macro",
      question: "When should I add Syllogism Macro drills into my study plan?",
      answer:
        "Once you are comfortable with the basic logic from micro exercises, start adding one or two macro drills into each Decision Making study session. This gives you enough exposure to exam-style complexity without overwhelming your practice with only the hardest questions.",
    },
  ],
};

