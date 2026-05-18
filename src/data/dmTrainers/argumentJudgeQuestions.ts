import type { DmTrainerQuestion } from "../../types/dmTrainers";

export const ARGUMENT_JUDGE_QUESTIONS: DmTrainerQuestion[] = [
  {
    id: "arg-health-lunches-001",
    trainerType: "argument-judge",
    difficulty: "easy",
    stem: "To improve children's health, should all primary-age children be given free school lunches?",
    question: "Select the strongest argument.",
    options: [
      {
        id: "A",
        text: "Yes, school lunches may help children concentrate in class.",
        label: "true-but-irrelevant",
      },
      {
        id: "B",
        text: "Yes, free school lunches can save carers money over a year.",
        label: "true-but-irrelevant",
      },
      {
        id: "C",
        text: "Yes, school lunches can help support good eating habits in children.",
        label: "directly-relevant",
      },
      {
        id: "D",
        text: "No, a lot of school lunches are wasted each year.",
        label: "does-not-answer-aim",
      },
    ],
    correctAnswer: "C",
    explanation:
      "The stated aim is improving children's health. Good eating habits are a direct mechanism for achieving better health. Concentration, cost savings, and food waste do not address the health aim.",
    generalRule:
      "Identify the stated aim first. Score every option against that exact aim. Reject options that are true but address something different - they are true-but-irrelevant.",
    wrongOptionReasons: {
      A: "Concentration may benefit from better nutrition, but the aim is children's health, not academic performance. True but irrelevant.",
      B: "Saving carers money is a financial benefit to families, not a health benefit to children. True but irrelevant.",
      C: "Correct - good eating habits are a direct mechanism for improving children's health. Directly on-aim.",
      D: "Food waste is an operational concern, not an argument about health outcomes. Does not address the aim.",
    },
    keyInsight:
      "Always score options against the stated aim, not against general goodness. An option can be true and beneficial without being the strongest argument for this specific aim.",
    skillTag: "identify-aim",
    commonTrap: "true-but-irrelevant",
    review: {
      exactAim: "improve children's health",
      whyCorrect:
        "C links school lunches to good eating habits, which links to health.",
      whyAIsWrong: "A discusses concentration, not health.",
      whyBIsWrong: "B discusses saving money, not health.",
      whyCIsWrong: "C is the correct answer.",
      whyDIsWrong: "D discusses waste, not a health benefit from lunches.",
      ambiguityRisk: "low",
      whySafeToInclude: "The aim is explicit and only one option targets health most directly.",
    },
  },
  {
    id: "arg-voting-online-001",
    trainerType: "argument-judge",
    difficulty: "hard",
    stem:
      "To reduce costs, increase accuracy and improve turnout, should voting in elections be undertaken online or, exceptionally, by post?",
    question: "Select the strongest argument.",
    options: [
      {
        id: "A",
        text: "Yes, online or postal voting would be more convenient and would therefore be likely to improve turnout.",
        label: "only-addresses-one-criterion",
      },
      {
        id: "B",
        text: "Yes, electronic counting would provide results more rapidly and with less chance of error.",
        label: "only-addresses-one-criterion",
      },
      {
        id: "C",
        text: "No, the necessary equipment would be expensive, electronic voting may discourage some voters, and hackers might interfere with the result.",
        label: "directly-relevant",
      },
      {
        id: "D",
        text: "No, current systems work effectively, so there is no need to change.",
        label: "vague",
      },
    ],
    correctAnswer: "C",
    explanation:
      "The stem lists three criteria: reduce costs, increase accuracy, and improve turnout. C addresses all three: expensive equipment (costs), hackers interfering (accuracy), and discouraging some voters (turnout). A addresses turnout only. B addresses accuracy only. D is vague and engages with none.",
    generalRule:
      "When a stem lists multiple criteria, count them. Eliminate any option that does not address ALL of them. The option covering every criterion is strongest.",
    wrongOptionReasons: {
      A: "Addresses turnout only (one of three criteria). Partial coverage means it is not the strongest.",
      B: "Addresses accuracy only (one of three criteria). 'Rapidly' is not the same as the cost criterion.",
      C: "Correct - addresses all three: cost (equipment), accuracy (hacking), turnout (discouraging voters).",
      D: "Vague: 'current systems work' does not engage with cost, accuracy or turnout as specified.",
    },
    keyInsight:
      "Tick off each criterion against each option. Only the option that scores 3/3 can be the strongest argument.",
    skillTag: "multi-criteria",
    commonTrap: "only-addresses-one-criterion",
    review: {
      exactAim: "reduce costs, increase accuracy and improve turnout",
      whyCorrect: "C responds to cost, turnout and accuracy in one argument.",
      whyAIsWrong: "A focuses on convenience and turnout only.",
      whyBIsWrong: "B focuses on speed and accuracy only.",
      whyCIsWrong: "C is the correct answer.",
      whyDIsWrong: "D does not engage with the three criteria.",
      ambiguityRisk: "low",
      whySafeToInclude: "Three criteria are explicit. Only C addresses all of them.",
    },
  },
  {
    id: "arg-elderly-care-001",
    trainerType: "argument-judge",
    difficulty: "medium",
    stem:
      "Should society rather than family members be ultimately responsible for the care of older people when they can no longer mentally or physically care for themselves?",
    question: "Select the strongest argument.",
    options: [
      {
        id: "A",
        text: "Yes, family members may help where possible, but society should ensure care is available when family cannot provide it.",
        label: "directly-relevant",
      },
      {
        id: "B",
        text: "Yes, older people with mental illness can be difficult for untrained relatives to support.",
        label: "too-narrow",
      },
      {
        id: "C",
        text: "No, families should learn to stick together by caring for relatives themselves.",
        label: "partially-relevant",
      },
      {
        id: "D",
        text: "No, everyone should save enough money to pay for their own care.",
        label: "unsupported-assumption",
      },
    ],
    correctAnswer: "A",
    explanation:
      "A addresses the full scope: who is ultimately responsible when older people cannot care for themselves, including cases where families genuinely cannot help. B covers only mental illness in a subset of cases. C tells families to care, but does not resolve the scenario where family care is impossible. D assumes everyone can save enough money - unsupported.",
    generalRule:
      "Check scope: does the argument address all cases the question asks about, or only a special sub-case? A strong argument must cover the full scope of the question.",
    wrongOptionReasons: {
      A: "Correct - balances family contribution with society's ultimate responsibility, including cases where family care is impossible.",
      B: "Too narrow - addresses only mental illness in older people, a sub-group of 'when they can no longer care for themselves'.",
      C: "Partially relevant - tells families to care but does not solve the cases where families genuinely cannot provide care.",
      D: "Unsupported assumption - assumes everyone can save enough money, which is not established and excludes those who cannot.",
    },
    keyInsight:
      "A good 'ultimate responsibility' argument must account for the hardest cases - when family care is genuinely impossible. B and C both fail this test.",
    skillTag: "scope",
    commonTrap: "too-narrow",
    review: {
      exactAim:
        "who should ultimately be responsible for care when older people cannot care for themselves",
      whyCorrect:
        "A balances family help with society's ultimate responsibility when family care is not possible.",
      whyAIsWrong: "A is the correct answer.",
      whyBIsWrong: "B is too narrow because it only discusses mental illness.",
      whyCIsWrong: "C does not address inability of families to provide care.",
      whyDIsWrong: "D relies on the unsupported assumption that everyone can save enough.",
      ambiguityRisk: "low",
      whySafeToInclude: "A matches the full scope of the stem. Wrong options fail on scope or assumptions.",
    },
  },
  {
    id: "arg-workplace-uniforms-001",
    trainerType: "argument-judge",
    difficulty: "medium",
    stem: "Will enforcing uniforms in the workplace boost productivity?",
    question: "Select the strongest argument.",
    options: [
      {
        id: "A",
        text: "Yes, shared workwear may promote team identity, and stronger team identity can improve workplace performance.",
        label: "directly-relevant",
      },
      {
        id: "B",
        text: "Yes, all employees will save time every morning if they are required to wear a uniform.",
        label: "unsupported-assumption",
      },
      {
        id: "C",
        text: "Yes, uniforms will remove every form of inequality in the workplace.",
        label: "overclaim",
      },
      {
        id: "D",
        text: "No, uniforms are always unpopular with employees.",
        label: "unsupported-assumption",
      },
    ],
    correctAnswer: "A",
    explanation:
      "A provides a direct mechanism: uniforms → team identity → improved performance (productivity). B assumes all employees waste significant choosing time AND that saved time becomes productive output - neither is established. C overclaims with 'every form'. D makes an unsupported absolute claim and never links to productivity.",
    generalRule:
      "Spot unsupported assumptions: words like 'all', 'every', 'always', 'never' signal claims that cannot be established from available information. The correct answer has a traceable, plausible mechanism.",
    wrongOptionReasons: {
      A: "Correct - uniforms → team identity → performance. A plausible mechanism with each step stated explicitly.",
      B: "Unsupported assumption: 'all employees' waste significant time and that saved time becomes productive work - neither is established.",
      C: "Overclaim: uniforms cannot remove 'every form of inequality' in the workplace. The absolute claim is unjustifiable.",
      D: "Unsupported assumption: 'always unpopular' is an absolute claim, and even if true, it does not address productivity.",
    },
    keyInsight:
      "'All', 'always', 'every', 'never' are red flags for unsupported assumptions. Flag them immediately and look for what is actually claimed.",
    skillTag: "unsupported-assumption",
    commonTrap: "unsupported-assumption",
    review: {
      exactAim: "whether workplace uniforms will boost productivity",
      whyCorrect: "A gives a direct chain from uniforms to team identity to performance.",
      whyAIsWrong: "A is the correct answer.",
      whyBIsWrong: "B assumes uniform time savings become productive output for all staff.",
      whyCIsWrong: "C claims uniforms remove every form of inequality.",
      whyDIsWrong: "D makes a blanket claim about popularity without linking to productivity.",
      ambiguityRisk: "low",
      whySafeToInclude: "Only A links uniforms to productivity with a plausible mechanism.",
    },
  },
  {
    id: "arg-speed-limits-001",
    trainerType: "argument-judge",
    difficulty: "easy",
    stem:
      "In order to reduce fatal motoring accidents, should cars be fitted with a device to limit the speeds at which they can travel?",
    question: "Select the strongest argument.",
    options: [
      {
        id: "A",
        text: "Yes, many deaths are caused by drivers who break speed limits.",
        label: "directly-relevant",
      },
      {
        id: "B",
        text: "Yes, driving at fast speeds uses more fuel and increases pollution.",
        label: "true-but-irrelevant",
      },
      {
        id: "C",
        text: "No, people should decide for themselves how fast they drive.",
        label: "does-not-answer-aim",
      },
      {
        id: "D",
        text: "No, more road deaths are caused by drink driving than by speeding.",
        label: "true-but-irrelevant",
      },
    ],
    correctAnswer: "A",
    explanation:
      "The aim is reducing fatal accidents. A links speeding deaths to the intervention: speed limiters would prevent speed-limit breaking, which causes deaths. B is about pollution - a different aim entirely. C raises personal choice without addressing fatalities. D compares causes but does not argue that speed limiters would fail.",
    generalRule:
      "Identify the exact aim. Reject options that are true but address a different aim. The correct option must be both true AND directly support (or oppose) the stated aim.",
    wrongOptionReasons: {
      A: "Correct - speeding deaths are directly related to fatal accidents; speed limiters target this cause.",
      B: "True (fuel usage) but irrelevant - the aim is fatal accidents, not environmental pollution.",
      C: "Personal freedom is a values argument that does not answer whether fatalities would fall.",
      D: "Even if drink-driving causes more deaths, this does not mean speed limiters would fail to reduce fatalities from speeding. A non-sequitur.",
    },
    keyInsight:
      "D is a trap: 'another cause is bigger' does not mean the proposed intervention is useless. The question is whether THIS intervention helps, not whether it is the only intervention needed.",
    skillTag: "identify-aim",
    commonTrap: "true-but-irrelevant",
    review: {
      exactAim: "reduce fatal motoring accidents",
      whyCorrect: "A ties speeding deaths to the proposed intervention.",
      whyAIsWrong: "A is the correct answer.",
      whyBIsWrong: "B discusses fuel and pollution, not fatal accidents.",
      whyCIsWrong: "C discusses choice, not whether fatalities would fall.",
      whyDIsWrong: "D compares causes without addressing whether speed limiters would reduce fatalities.",
      ambiguityRisk: "low",
      whySafeToInclude: "The fatal-accident aim is clear. Only A addresses it directly.",
    },
  },

  // ── BETA QUESTIONS ────────────────────────────────────────────────────────

  {
    id: "arg-fizzy-drinks-001",
    trainerType: "argument-judge",
    difficulty: "easy",
    beta: true,
    stem: "To encourage people to eat more healthily, should fizzy drinks be subject to a tax?",
    question: "Select the strongest argument.",
    options: [
      {
        id: "A",
        text: "Yes, revenue from the tax could be used to fund local sports facilities.",
        label: "partially-relevant",
      },
      {
        id: "B",
        text: "Yes, a higher price may deter people from buying fizzy drinks, which contain high levels of sugar.",
        label: "directly-relevant",
      },
      {
        id: "C",
        text: "Yes, fizzy drinks contribute to dental problems in children.",
        label: "true-but-irrelevant",
      },
      {
        id: "D",
        text: "No, people should be free to choose what they eat and drink.",
        label: "does-not-answer-aim",
      },
    ],
    correctAnswer: "B",
    explanation:
      "The aim is encouraging healthier eating. B traces a direct mechanism: higher price → less consumption of high-sugar drinks → healthier diet. A uses tax revenue for sports, an indirect and separate benefit. C raises dental health, which is related to sugar but not the same as eating more healthily. D raises personal freedom without addressing whether diets would improve.",
    generalRule:
      "Match the option to the stated aim word-for-word. 'Eating more healthily' is about dietary habits. Dental health, sports funding, and personal freedom are all related topics but not the same aim.",
    wrongOptionReasons: {
      A: "Tax revenue funding sports is too indirect - it is a benefit of the revenue, not a mechanism for healthier eating.",
      B: "Correct - higher price → less fizzy drink consumption → less sugar → healthier diet. Direct mechanism matching the aim.",
      C: "Dental problems are a health consequence of sugar, but dental health is not the same as eating more healthily. True but irrelevant.",
      D: "Personal freedom does not address whether the tax would actually change eating habits.",
    },
    keyInsight:
      "C is the classic near-miss: it mentions health, but dental health ≠ eating more healthily. The aim is specific - read it carefully.",
    skillTag: "identify-aim",
    commonTrap: "true-but-irrelevant",
    review: {
      exactAim: "encourage people to eat more healthily",
      whyCorrect: "B directly links the tax mechanism to reduced sugar consumption, which is the healthier eating aim.",
      whyAIsWrong: "A uses revenue for sports, which is an indirect and separate benefit unrelated to dietary habits.",
      whyBIsWrong: "B is the correct answer.",
      whyCIsWrong: "C raises dental health, which is related to sugar but not to the broader aim of eating more healthily.",
      whyDIsWrong: "D discusses freedom without addressing whether the policy would achieve healthier eating.",
      ambiguityRisk: "low",
      whySafeToInclude:
        "The aim (eating more healthily) is stated explicitly. Only B traces a mechanism from the tax to the dietary aim. C is a deliberate near-miss testing whether students can distinguish dental consequences from dietary habits.",
    },
  },
  {
    id: "arg-lorry-restriction-001",
    trainerType: "argument-judge",
    difficulty: "hard",
    beta: true,
    stem:
      "To improve safety, reduce journey times and lower emissions, should lorries be required to travel only between midnight and 6am?",
    question: "Select the strongest argument.",
    options: [
      {
        id: "A",
        text: "Yes, fewer lorries during the day would reduce road accidents involving lorries.",
        label: "only-addresses-one-criterion",
      },
      {
        id: "B",
        text: "Yes, the roads would be clearer during the day, which is when most commuters use the motorway.",
        label: "only-addresses-one-criterion",
      },
      {
        id: "C",
        text: "No, lorry drivers working only at night face higher accident rates due to fatigue, restricting lorries to six hours per day would require more total trips thus increasing emissions, and concentrating lorry movements at night could create new congestion during those hours.",
        label: "directly-relevant",
      },
      {
        id: "D",
        text: "No, the haulage industry would struggle financially if limited to six hours per day.",
        label: "does-not-answer-aim",
      },
    ],
    correctAnswer: "C",
    explanation:
      "The stem lists three criteria: safety, journey times and emissions. C addresses all three: night fatigue (safety), more total trips (emissions), night congestion (journey times). A addresses safety only. B addresses journey times only. D raises haulage industry finances, which is not one of the three stated criteria.",
    generalRule:
      "Three-criteria questions require the answer to address all three. Count the criteria in the stem. Only the option that scores 3/3 is the strongest.",
    wrongOptionReasons: {
      A: "Addresses safety only (1/3 criteria). Partial coverage - not the strongest.",
      B: "Addresses journey times during the day (1/3 criteria). Does not address safety or emissions.",
      C: "Correct - fatigue (safety), more trips (emissions), night congestion (journey times). All three criteria addressed.",
      D: "Haulage finances are not one of the three stated criteria. Completely off-aim.",
    },
    keyInsight:
      "For three-criteria questions, systematically tick each criterion against each option. The answer with all three ticked is the strongest.",
    skillTag: "multi-criteria",
    commonTrap: "only-addresses-one-criterion",
    review: {
      exactAim: "improve safety, reduce journey times and lower emissions",
      whyCorrect: "C responds to all three criteria in one argument: safety (fatigue), emissions (more trips), journey times (night congestion).",
      whyAIsWrong: "A addresses safety only.",
      whyBIsWrong: "B addresses journey times only.",
      whyCIsWrong: "C is the correct answer.",
      whyDIsWrong: "D raises haulage industry finances, which is not one of the three stated criteria.",
      ambiguityRisk: "low",
      whySafeToInclude:
        "Three criteria are explicitly listed in the stem. Only C engages with all of them. Each wrong option fails at least one criterion, and D fails all three.",
    },
  },
  {
    id: "arg-energy-drinks-001",
    trainerType: "argument-judge",
    difficulty: "medium",
    beta: true,
    stem: "Should children aged under 16 be prohibited from buying energy drinks?",
    question: "Select the strongest argument.",
    options: [
      {
        id: "A",
        text: "Yes, energy drinks contain high levels of caffeine and sugar, which can be harmful to children's physical and mental health.",
        label: "directly-relevant",
      },
      {
        id: "B",
        text: "Yes, energy drink consumption has been linked to poor academic performance in secondary school students.",
        label: "too-narrow",
      },
      {
        id: "C",
        text: "No, most children who buy energy drinks are aware of the health risks.",
        label: "unsupported-assumption",
      },
      {
        id: "D",
        text: "No, parents are responsible for what their children buy and consume.",
        label: "does-not-answer-aim",
      },
    ],
    correctAnswer: "A",
    explanation:
      "A gives a broad, evidence-based reason covering the full scope of harm - both caffeine and sugar, both physical and mental health, across all under-16s. B is too narrow: academic performance is one consequence for a subset of older children. C makes an unsupported assumption about what 'most children' know. D deflects to parental responsibility rather than addressing whether the drinks are harmful.",
    generalRule:
      "Too-narrow options identify a real consequence but address only a subset of the issue. A strong argument must cover the full scope the question implies.",
    wrongOptionReasons: {
      A: "Correct - covers the full scope: caffeine and sugar, physical and mental health, all children under 16.",
      B: "Too narrow - academic performance is one outcome for one sub-group (secondary students). Misses physical health harms and younger children.",
      C: "Unsupported assumption - 'most children are aware' is not established and does not justify permitting purchase even if true.",
      D: "Deflects the question - parental responsibility does not address whether energy drinks are harmful to children under 16.",
    },
    keyInsight:
      "B sounds relevant because it mentions children and energy drinks. The trap is that academic performance is one specific consequence - not the full picture of harm.",
    skillTag: "scope",
    commonTrap: "too-narrow",
    review: {
      exactAim: "should children under 16 be prohibited from buying energy drinks",
      whyCorrect: "A gives a broad, evidence-based reason covering the full scope of harm (physical and mental health).",
      whyAIsWrong: "A is the correct answer.",
      whyBIsWrong: "B focuses only on academic performance in secondary students, not the full range of health harms.",
      whyCIsWrong: "C assumes 'most children' are aware of risks - an unsupported claim that does not justify allowing purchase.",
      whyDIsWrong: "D argues about responsibility rather than whether children should be protected from the product.",
      ambiguityRisk: "low",
      whySafeToInclude:
        "B is a deliberate too-narrow trap (academic performance is one consequence, not the full harm picture). C is an unsupported assumption. D deflects to parental responsibility. Only A addresses the full scope of the question.",
    },
  },
  {
    id: "arg-universities-online-001",
    trainerType: "argument-judge",
    difficulty: "medium",
    beta: true,
    stem:
      "Should universities be required to offer all of their courses online as well as in person?",
    question: "Select the strongest argument.",
    options: [
      {
        id: "A",
        text: "Yes, online courses would enable people who cannot attend in person due to disability, work or caring responsibilities to access higher education.",
        label: "directly-relevant",
      },
      {
        id: "B",
        text: "Yes, all students prefer online study as it is more flexible than attending lectures.",
        label: "unsupported-assumption",
      },
      {
        id: "C",
        text: "No, universities would lose income from student accommodation if fewer students lived on campus.",
        label: "does-not-answer-aim",
      },
      {
        id: "D",
        text: "No, online learning is always of lower quality than face-to-face teaching.",
        label: "unsupported-assumption",
      },
    ],
    correctAnswer: "A",
    explanation:
      "A identifies a specific group who would benefit (people with genuine access barriers) and explains the mechanism (online provision removes those barriers). B uses 'all students' - an absolute unsupported claim. C raises accommodation revenue, an economic concern unrelated to educational access. D uses 'always' - an absolute claim contradicted by established online programmes.",
    generalRule:
      "Reject options containing 'all', 'always', 'never', 'every' unless the claim is verifiably true. These absolute quantifiers mark unsupported assumptions in UCAT Argument Judgement.",
    wrongOptionReasons: {
      A: "Correct - identifies a specific group with genuine barriers and explains the access mechanism. Plausible and grounded.",
      B: "'All students prefer' - absolute and unsupported. Even one student who prefers in-person attendance disproves it.",
      C: "Accommodation revenue is an economic concern, not an educational argument. Does not address whether online provision is justified.",
      D: "'Always of lower quality' - absolute and unsupported. Contradicted by well-established, high-quality online degree programmes.",
    },
    keyInsight:
      "B and D are both marked by absolute quantifiers ('all', 'always'). These are UCAT red flags - reject them immediately.",
    skillTag: "unsupported-assumption",
    commonTrap: "unsupported-assumption",
    review: {
      exactAim: "should universities offer all courses online as well as in person",
      whyCorrect: "A identifies a clear group who would benefit, with a plausible and specific mechanism (removing access barriers).",
      whyAIsWrong: "A is the correct answer.",
      whyBIsWrong: "B uses 'all students' - an absolute and unsupported generalisation.",
      whyCIsWrong: "C raises accommodation revenue, which does not address whether online courses are educationally justified.",
      whyDIsWrong: "D uses 'always' - an absolute claim that cannot be supported and ignores well-established online programmes.",
      ambiguityRisk: "low",
      whySafeToInclude:
        "B and D both contain absolute quantifiers ('all', 'always') that mark them as unsupported assumptions. C is an economic distraction. Only A is grounded in a plausible educational benefit.",
    },
  },
  {
    id: "arg-plastic-bags-001",
    trainerType: "argument-judge",
    difficulty: "easy",
    beta: true,
    stem:
      "To reduce plastic waste, should supermarkets be required to charge customers for all plastic bags?",
    question: "Select the strongest argument.",
    options: [
      {
        id: "A",
        text: "Yes, charging for bags has been shown to significantly reduce the number of plastic bags used.",
        label: "directly-relevant",
      },
      {
        id: "B",
        text: "Yes, a plastic bag charge will reduce the income of the supermarket.",
        label: "true-but-irrelevant",
      },
      {
        id: "C",
        text: "Yes, biodegradable bags are better for the environment than plastic bags.",
        label: "true-but-irrelevant",
      },
      {
        id: "D",
        text: "No, customers have a right to choose how they carry their shopping.",
        label: "does-not-answer-aim",
      },
    ],
    correctAnswer: "A",
    explanation:
      "The aim is reducing plastic waste. A links the charge directly to reduced plastic bag usage, which directly reduces plastic waste. B states that the charge reduces supermarket income - a financial impact irrelevant to plastic waste. C discusses biodegradable bags, a different intervention entirely. D raises customer choice without addressing plastic waste.",
    generalRule:
      "True-but-irrelevant options are factually correct but address a different aim. Always check: does this option directly address the stated aim, or does it address something adjacent?",
    wrongOptionReasons: {
      A: "Correct - charge → reduced bag use → reduced plastic waste. Direct mechanism for the stated aim.",
      B: "True (supermarket income may fall) but irrelevant - lower income does not reduce plastic waste.",
      C: "True (biodegradable is better) but discusses a different product and a different intervention. Irrelevant to the charge.",
      D: "Customer choice is a values argument that does not address whether plastic waste would actually decrease.",
    },
    keyInsight:
      "B and C are both true statements - that is precisely what makes them dangerous traps. Truth alone is not enough; the argument must address the stated aim.",
    skillTag: "identify-aim",
    commonTrap: "true-but-irrelevant",
    review: {
      exactAim: "reduce plastic waste",
      whyCorrect: "A connects the charge mechanism directly to reduced bag usage, addressing the aim.",
      whyAIsWrong: "A is the correct answer.",
      whyBIsWrong: "B is about supermarket revenue, not plastic waste.",
      whyCIsWrong: "C discusses an alternative product rather than addressing whether the charge reduces plastic waste.",
      whyDIsWrong: "D discusses freedom without engaging with the plastic waste aim.",
      ambiguityRisk: "low",
      whySafeToInclude:
        "The aim is explicit. B and C are true statements that are clearly irrelevant to plastic waste. D is a common 'personal freedom' distractor.",
    },
  },
  {
    id: "arg-police-foot-patrols-001",
    trainerType: "argument-judge",
    difficulty: "hard",
    beta: true,
    stem:
      "To reduce crime, improve community relations and save money, should police officers patrol their local communities on foot rather than in cars?",
    question: "Select the strongest argument.",
    options: [
      {
        id: "A",
        text: "Yes, foot patrols would increase police visibility and allow officers to engage directly with local residents.",
        label: "only-addresses-one-criterion",
      },
      {
        id: "B",
        text: "Yes, police officers who walk their beat get more exercise than those who drive.",
        label: "true-but-irrelevant",
      },
      {
        id: "C",
        text: "No, foot patrols cover less ground than car patrols and are therefore less effective at reducing crime.",
        label: "only-addresses-one-criterion",
      },
      {
        id: "D",
        text: "No, the cost of additional officers required for foot patrols, the limited reach compared to car patrols, and the potential for foot patrols to be perceived as intrusive by some residents would all need to be considered.",
        label: "directly-relevant",
      },
    ],
    correctAnswer: "D",
    explanation:
      "The stem gives three criteria: reduce crime, improve community relations and save money. D addresses all three: additional officer costs (money), limited ground coverage (crime), and potential perception of intrusiveness (community relations). A addresses community relations and some crime deterrence, but not cost. B discusses officer fitness - not a stated criterion. C addresses crime coverage only.",
    generalRule:
      "Three-criteria questions can have the correct answer on either side ('Yes' or 'No'). Do not assume 'Yes' is always correct. Score all options against the full list of criteria.",
    wrongOptionReasons: {
      A: "Addresses community relations (visibility and engagement) and some crime deterrence - but does not address cost. 2/3 criteria.",
      B: "Officer fitness is not one of the three stated criteria. Completely irrelevant.",
      C: "Addresses crime coverage only (limited ground). Ignores community relations and cost. 1/3 criteria.",
      D: "Correct - staffing costs (money), limited reach (crime), perceived intrusiveness (community relations). All three criteria.",
    },
    keyInsight:
      "The correct answer is 'No'. Multi-criteria questions can have strong arguments on either side - always evaluate evidence, not intuition about which side should win.",
    skillTag: "multi-criteria",
    commonTrap: "only-addresses-one-criterion",
    review: {
      exactAim: "reduce crime, improve community relations and save money",
      whyCorrect: "D engages with cost (staffing), crime coverage (limited reach) and community relations (perceived intrusiveness) - all three criteria.",
      whyAIsWrong: "A addresses community relations and crime deterrence but does not address cost.",
      whyBIsWrong: "B discusses officer fitness, which is not one of the three stated criteria.",
      whyCIsWrong: "C addresses crime coverage only, ignoring community relations and cost.",
      whyDIsWrong: "D is the correct answer.",
      ambiguityRisk: "low",
      whySafeToInclude:
        "Three explicit criteria make it verifiable which options address how many. A tempts students who spot two matching criteria and stop there. Only D covers all three.",
    },
  },
  {
    id: "arg-flexible-hours-001",
    trainerType: "argument-judge",
    difficulty: "easy",
    beta: true,
    stem:
      "To improve workplace wellbeing, should all employees be offered the option to work flexible hours?",
    question: "Select the strongest argument.",
    options: [
      {
        id: "A",
        text: "Yes, flexible hours allow employees to better manage family and personal commitments, which can reduce stress and improve wellbeing.",
        label: "directly-relevant",
      },
      {
        id: "B",
        text: "Yes, working flexible hours is popular with most employees.",
        label: "true-but-irrelevant",
      },
      {
        id: "C",
        text: "No, flexible hours make it harder for managers to schedule team meetings.",
        label: "does-not-answer-aim",
      },
      {
        id: "D",
        text: "No, flexible hours are more expensive for employers to administer.",
        label: "does-not-answer-aim",
      },
    ],
    correctAnswer: "A",
    explanation:
      "The aim is improving workplace wellbeing. A provides a clear mechanism: flexible hours → better management of personal commitments → reduced stress → improved wellbeing. B establishes popularity, not a wellbeing benefit. C raises scheduling difficulties - an operational concern for managers, not a wellbeing argument. D raises administration costs - an employer cost concern, not a wellbeing argument.",
    generalRule:
      "Popularity is not a mechanism for wellbeing. An option must trace a chain from the action to the stated aim. Convenience for managers and employer costs are separate aims from employee wellbeing.",
    wrongOptionReasons: {
      A: "Correct - flexible hours → better personal management → reduced stress → improved wellbeing. Clear, complete mechanism.",
      B: "Popular ≠ beneficial for wellbeing. These are different claims. True-but-irrelevant.",
      C: "Scheduling difficulty is an operational concern for managers, not related to employee wellbeing.",
      D: "Administration costs are an employer concern, not an employee wellbeing argument.",
    },
    keyInsight:
      "B sounds positive ('popular') but popularity is not a wellbeing benefit. The key question is: does this option explain HOW the aim is achieved?",
    skillTag: "identify-aim",
    commonTrap: "true-but-irrelevant",
    review: {
      exactAim: "improve workplace wellbeing",
      whyCorrect: "A gives a direct mechanism: flexible hours → better personal management → reduced stress → improved wellbeing.",
      whyAIsWrong: "A is the correct answer.",
      whyBIsWrong: "B establishes popularity, not a wellbeing benefit.",
      whyCIsWrong: "C raises scheduling, which is an operational concern unrelated to employee wellbeing.",
      whyDIsWrong: "D raises employer costs, which does not address employee wellbeing.",
      ambiguityRisk: "low",
      whySafeToInclude:
        "The aim is single and explicit. B is the primary trap: 'popular' sounds positive but does not demonstrate a wellbeing improvement. C and D are clear distractors addressing the employer rather than the aim.",
    },
  },
  {
    id: "arg-preventive-healthcare-001",
    trainerType: "argument-judge",
    difficulty: "medium",
    beta: true,
    stem:
      "Should hospitals prioritise spending on preventive healthcare rather than on treatment services?",
    question: "Select the strongest argument.",
    options: [
      {
        id: "A",
        text: "Yes, preventive care reduces the number of people who develop serious conditions, which lowers the demand for expensive treatment over time.",
        label: "directly-relevant",
      },
      {
        id: "B",
        text: "Yes, preventive care is more beneficial than treatment for patients who already have serious conditions.",
        label: "partially-relevant",
      },
      {
        id: "C",
        text: "No, some diseases cannot be prevented and patients with these conditions still need adequate treatment services.",
        label: "too-narrow",
      },
      {
        id: "D",
        text: "No, hospital staff prefer to work in treatment services rather than preventive care.",
        label: "does-not-answer-aim",
      },
    ],
    correctAnswer: "A",
    explanation:
      "A makes a systemic argument: prevention reduces disease onset, lowering demand for expensive treatment - directly justifying the prioritisation. B contains a conceptual error: preventive care stops diseases from developing; it cannot treat conditions that already exist. C identifies a real limitation but covers only a subset of conditions - too narrow to defeat the general case for prioritising prevention. D discusses staff preferences, which is irrelevant to patient benefit or resource allocation.",
    generalRule:
      "A too-narrow 'No' argument acknowledges a genuine exception but cannot defeat a broadly valid policy. Ask: does this exception apply to most cases, or only some? If only some, it is too narrow.",
    wrongOptionReasons: {
      A: "Correct - prevention reduces future disease onset → lower demand for expensive treatment → systemic benefit. Directly justifies prioritising prevention.",
      B: "Conceptual error: preventive care prevents disease; it is not a superior treatment for those who already have serious conditions.",
      C: "True but too narrow: some diseases being unpreventable is a real exception, but it does not defeat the overall case for prioritising prevention across all preventable conditions.",
      D: "Staff preferences are irrelevant to whether prevention is a better use of hospital resources.",
    },
    keyInsight:
      "B contains a subtle conceptual trap about what 'preventive' means. Prevention = before illness. It cannot help patients who already have serious conditions.",
    skillTag: "scope",
    commonTrap: "too-narrow",
    review: {
      exactAim: "should hospitals prioritise preventive healthcare over treatment spending",
      whyCorrect: "A provides a systemic benefit: prevention reduces future demand for expensive treatment, directly justifying the prioritisation.",
      whyAIsWrong: "A is the correct answer.",
      whyBIsWrong: "B misunderstands preventive care - it prevents disease onset rather than treating existing conditions.",
      whyCIsWrong: "C is true but too narrow: acknowledging that some diseases cannot be prevented does not refute the overall case for prioritising prevention.",
      whyDIsWrong: "D raises staff preferences, which is irrelevant to whether prevention is a better use of resources.",
      ambiguityRisk: "low",
      whySafeToInclude:
        "B contains a deliberate conceptual trap about what preventive care means. C is a classic too-narrow option that identifies a real exception but cannot defeat the general policy. D is a clear distractor.",
    },
  },
  {
    id: "arg-motorway-speed-001",
    trainerType: "argument-judge",
    difficulty: "medium",
    beta: true,
    stem:
      "To reduce traffic accidents on motorways, should the speed limit be reduced from 70mph to 60mph?",
    question: "Select the strongest argument.",
    options: [
      {
        id: "A",
        text: "Yes, lower speeds give drivers more time to react to hazards, reducing both the likelihood and the severity of accidents.",
        label: "directly-relevant",
      },
      {
        id: "B",
        text: "Yes, most motorway accidents occur in the outside lane.",
        label: "true-but-irrelevant",
      },
      {
        id: "C",
        text: "No, reducing the speed limit would increase journey times and reduce economic productivity.",
        label: "does-not-answer-aim",
      },
      {
        id: "D",
        text: "No, modern cars with automatic emergency braking are already very safe at 70mph.",
        label: "unsupported-assumption",
      },
    ],
    correctAnswer: "A",
    explanation:
      "The aim is reducing motorway accidents. A identifies two direct mechanisms: greater reaction time reduces accident likelihood, and lower impact speed reduces severity. B states a fact about accident location but gives no reason why reducing the limit would help. C raises journey times and economic productivity - a different aim entirely. D makes an unsupported assumption by implying emergency braking makes 70mph as safe as 60mph for all vehicles.",
    generalRule:
      "True-but-irrelevant options may mention words from the question (e.g. 'accidents') without explaining WHY the proposed intervention would achieve the aim. The correct option needs a mechanism, not just a fact.",
    wrongOptionReasons: {
      A: "Correct - lower speed → more reaction time (likelihood) AND lower impact force (severity). Two direct mechanisms.",
      B: "True (outside lane statistic may be correct) but irrelevant - it tells us WHERE accidents happen, not WHY reducing the limit would help.",
      C: "Journey times and economic productivity are different aims. Does not address accident reduction.",
      D: "Unsupported assumption: not all modern cars have AEB, and AEB does not eliminate all speed-related risk. Both premises are unsupported.",
    },
    keyInsight:
      "B mentions 'motorway accidents' which makes it sound relevant. But it explains location, not causation. No mechanism = not the strongest argument.",
    skillTag: "identify-aim",
    commonTrap: "true-but-irrelevant",
    review: {
      exactAim: "reduce traffic accidents on motorways",
      whyCorrect: "A links lower speed directly to accident likelihood and severity, addressing both aspects of the aim.",
      whyAIsWrong: "A is the correct answer.",
      whyBIsWrong: "B states where accidents happen but gives no reason why reducing the limit would reduce them.",
      whyCIsWrong: "C raises journey times and economic output, which are not the stated aim.",
      whyDIsWrong: "D assumes all modern cars have emergency braking and that this technology eliminates any speed-related risk - both unsupported.",
      ambiguityRisk: "low",
      whySafeToInclude:
        "B is a true-but-irrelevant trap: the outside-lane statistic sounds relevant to motorway safety but does not address the speed-limit proposal. D is an unsupported assumption about technology coverage.",
    },
  },
  {
    id: "arg-coding-schools-001",
    trainerType: "argument-judge",
    difficulty: "hard",
    beta: true,
    stem:
      "To improve literacy, reduce inequality and prepare children for the digital workplace, should coding be made a compulsory subject in all secondary schools?",
    question: "Select the strongest argument.",
    options: [
      {
        id: "A",
        text: "Yes, coding develops logical and structured thinking linked to literacy, gives every pupil equal access to digital skills regardless of background, and directly prepares them for an increasingly digital jobs market.",
        label: "directly-relevant",
      },
      {
        id: "B",
        text: "Yes, coding is the most popular optional subject in schools where it is currently available.",
        label: "true-but-irrelevant",
      },
      {
        id: "C",
        text: "No, not all teachers are trained to teach coding, which would make implementation difficult.",
        label: "does-not-answer-aim",
      },
      {
        id: "D",
        text: "No, schools should focus on core subjects such as English and Maths before adding new compulsory subjects.",
        label: "vague",
      },
    ],
    correctAnswer: "A",
    explanation:
      "The stem specifies three criteria: improve literacy, reduce inequality and prepare for the digital workplace. A addresses all three with distinct mechanisms: structured thinking supports literacy, universal access reduces inequality, and digital skills prepare pupils for jobs. B states that coding is popular - irrelevant to the three aims. C raises a staffing implementation challenge - not an argument against the aims being valid. D is vague and does not engage with any of the three criteria.",
    generalRule:
      "Three-criteria questions: score each option against literacy, inequality, and digital workplace readiness. The option addressing all three is the strongest.",
    wrongOptionReasons: {
      A: "Correct - structured thinking (literacy), universal access (inequality), digital skills (workplace). All three criteria with distinct mechanisms.",
      B: "Popularity is irrelevant to the three stated aims. True-but-irrelevant.",
      C: "Teacher training is an implementation challenge, not an argument against the validity of the three aims. Does not address any criterion.",
      D: "Vague priority argument ('core subjects first') does not engage with literacy, inequality or workplace readiness.",
    },
    keyInsight:
      "C is a plausible-sounding 'No' - but it attacks feasibility, not the merits of the aims. An implementation difficulty is not the same as the aims being wrong.",
    skillTag: "multi-criteria",
    commonTrap: "true-but-irrelevant",
    review: {
      exactAim: "improve literacy, reduce inequality and prepare children for the digital workplace",
      whyCorrect: "A addresses all three criteria with distinct, plausible mechanisms.",
      whyAIsWrong: "A is the correct answer.",
      whyBIsWrong: "B cites popularity, which does not address literacy, inequality or workplace readiness.",
      whyCIsWrong: "C raises a staffing implementation issue, not a reason why the three aims are invalid.",
      whyDIsWrong: "D asserts that other subjects come first but does not address whether coding would achieve the three stated aims.",
      ambiguityRisk: "low",
      whySafeToInclude:
        "Three explicit criteria make scoring verifiable. B is the primary trap (popular = sounds good, but irrelevant to the aims). C and D address implementation and prioritisation rather than the aims themselves.",
    },
  },
];
