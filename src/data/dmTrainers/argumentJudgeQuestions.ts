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
      "The aim is improving children's health. Good eating habits link most directly to health. Concentration, cost and waste do not address that aim as directly.",
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
      "The stem lists cost, accuracy and turnout. C addresses all three: equipment cost, discouraging voters and hacking affecting accuracy. A mainly addresses turnout. B mainly addresses accuracy. D is vague.",
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
      "A answers who should be ultimately responsible and covers cases where families cannot provide care. B only discusses mental illness. C does not solve cases where families cannot help. D assumes everyone can save enough.",
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
      "A links uniforms to team identity and then to performance. B assumes all employees lose significant choosing time that becomes productive work. C overclaims. D is an unsupported generalisation.",
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
      "The aim is reducing fatal accidents. A links speed-limit breaking to deaths and supports limiting speed mechanically. B discusses pollution. C does not address fatalities. D compares causes but does not answer whether speed limiters would reduce fatalities.",
    skillTag: "identify-aim",
    commonTrap: "true-but-irrelevant",
    review: {
      exactAim: "reduce fatal motoring accidents",
      whyCorrect: "A ties speeding deaths to the proposed intervention.",
      whyAIsWrong: "A is the correct answer.",
      whyBIsWrong: "B discusses fuel and pollution, not fatal accidents.",
      whyCIsWrong: "C discusses choice, not whether fatalities would fall.",
      whyDIsWrong: "D compares other causes without addressing the speed-limiter proposal.",
      ambiguityRisk: "low",
      whySafeToInclude: "The fatal-accident aim is clear. Only A addresses it directly.",
    },
  },
];
