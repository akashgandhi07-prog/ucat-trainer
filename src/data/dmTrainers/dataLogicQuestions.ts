import type { DmTrainerQuestion } from "../../types/dmTrainers";

export const DATA_LOGIC_QUESTIONS: DmTrainerQuestion[] = [
  {
    id: "data-complement-001",
    trainerType: "data-logic",
    difficulty: "easy",
    stem: "Route B has a 60% likelihood of remaining congestion free.",
    question: "What is the likelihood of congestion on Route B?",
    options: [
      { id: "A", text: "30%" },
      { id: "B", text: "40%" },
      { id: "C", text: "50%" },
      { id: "D", text: "60%" },
    ],
    correctAnswer: "B",
    explanation:
      "Congestion and congestion-free are complements, so they add to 100%. Congestion = 100% − 60% = 40%.",
    skillTag: "complement",
    commonTrap: "complement-error",
    review: {
      calculationChecked: true,
      ambiguityRisk: "low",
      whySafeToInclude: "Single complement step with whole-number percentages.",
    },
  },
  {
    id: "data-missing-percentage-001",
    trainerType: "data-logic",
    difficulty: "medium",
    stem:
      "150 patients reported exactly one post-operative complication. 36% reported breathing issues, 45 reported cardiovascular complaints and 18% reported hypothermia. The remaining patients reported nausea.",
    question: "What percentage of patients reported nausea?",
    options: [
      { id: "A", text: "12%" },
      { id: "B", text: "14%" },
      { id: "C", text: "16%" },
      { id: "D", text: "18%" },
    ],
    correctAnswer: "C",
    explanation:
      "45 out of 150 is 30%. Known percentages are 36%, 30% and 18%, totalling 84%. The remaining share is 100% − 84% = 16%.",
    skillTag: "missing-percentage",
    commonTrap: "raw-number-treated-as-percentage",
    optionalWorkingSteps: [
      "45 ÷ 150 × 100 = 30%.",
      "36 + 30 + 18 = 84.",
      "100 − 84 = 16%.",
    ],
    review: {
      calculationChecked: true,
      ambiguityRisk: "low",
      whySafeToInclude:
        "Exactly one complication makes categories mutually exclusive. The remaining percentage is determined uniquely.",
    },
  },
  {
    id: "data-denominator-001",
    trainerType: "data-logic",
    difficulty: "medium",
    stem:
      "Survey X involved 200 people. 84 said they liked the product, 76 said they did not like the product. The rest did not respond.",
    question: "What percentage of those who responded liked the product?",
    options: [
      { id: "A", text: "42%" },
      { id: "B", text: "48%" },
      { id: "C", text: "52.5%" },
      { id: "D", text: "60%" },
    ],
    correctAnswer: "C",
    explanation:
      "Respondents = 84 + 76 = 160. Of those who responded, 84 liked the product. 84 ÷ 160 × 100 = 52.5%.",
    skillTag: "denominator",
    commonTrap: "wrong-denominator",
    optionalWorkingSteps: [
      "Respondents = 84 + 76 = 160.",
      "84 ÷ 160 × 100 = 52.5%.",
    ],
    review: {
      calculationChecked: true,
      ambiguityRisk: "low",
      whySafeToInclude:
        "The question specifies respondents as the denominator, not everyone surveyed.",
    },
  },
  {
    id: "data-at-least-one-001",
    trainerType: "data-logic",
    difficulty: "medium",
    stem:
      "Kai takes two flights. Seat assignment is independent on each flight. The probability of a window seat on each flight is 0.4.",
    question: "Is Kai more likely than not to get at least one window seat?",
    options: [
      {
        id: "A",
        text: "Yes, because the probability of at least one window seat is 0.64.",
      },
      {
        id: "B",
        text: "Yes, because the probability of at least one window seat is 0.8.",
      },
      {
        id: "C",
        text: "No, because the probability of window seats on both flights is only 0.16.",
      },
      {
        id: "D",
        text: "No, because the probability of at least one window seat is 0.24.",
      },
    ],
    correctAnswer: "A",
    explanation:
      "Use the complement. No window on one flight: 0.6. No window on both: 0.6 × 0.6 = 0.36. At least one window: 1 − 0.36 = 0.64, which is greater than 0.5.",
    skillTag: "at-least-one",
    commonTrap: "adds-probabilities-incorrectly",
    optionalWorkingSteps: [
      "P(no window on one flight) = 0.6.",
      "P(no window on both) = 0.36.",
      "P(at least one) = 1 − 0.36 = 0.64.",
    ],
    review: {
      calculationChecked: true,
      ambiguityRisk: "low",
      whySafeToInclude: "Independence is stated. Complement method gives a single numeric answer.",
    },
  },
  {
    id: "data-first-player-001",
    trainerType: "data-logic",
    difficulty: "hard",
    stem:
      "X and Y take turns throwing a biased six-sided die. The first person to throw a six wins. X throws first.",
    question: "Do X and Y have an equal chance of winning?",
    options: [
      {
        id: "A",
        text: "Yes, because they use the same die on each turn.",
      },
      {
        id: "B",
        text: "Yes, because bias does not change the probability of a six on a single throw.",
      },
      {
        id: "C",
        text: "No, because X has a chance to win before Y gets a turn.",
      },
      {
        id: "D",
        text: "No, but only if the die is biased towards six.",
      },
    ],
    correctAnswer: "C",
    explanation:
      "Y can only win if X fails first. X has the first opportunity to throw a six, so X has the advantage regardless of how the die is biased.",
    skillTag: "first-player-advantage",
    commonTrap: "same-probability-each-turn",
    review: {
      ambiguityRisk: "low",
      whySafeToInclude:
        "Turn order creates first-throw advantage. Bias magnitude does not remove that structural edge.",
    },
  },
];
