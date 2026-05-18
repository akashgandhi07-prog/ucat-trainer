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
      "Congestion and congestion-free are the only two outcomes (mutually exclusive and exhaustive), so they must add to 100%. Congestion = 100% − 60% = 40%.",
    generalRule:
      "When two outcomes are mutually exclusive and exhaustive (they cover all possibilities), they sum to exactly 100%. Complement = 100% − given value.",
    wrongOptionReasons: {
      A: "30% - no valid operation on 60% produces 30%. Possibly halved incorrectly.",
      B: "Correct - 100% − 60% = 40%. Congestion and congestion-free are complements.",
      C: "50% - halving 100% ignores the given information.",
      D: "60% - repeats the congestion-free figure instead of subtracting it from 100%.",
    },
    keyInsight:
      "If A and B are the only two possibilities, P(B) = 1 − P(A). Always. One step, no exceptions.",
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
      "First convert the raw count: 45 ÷ 150 × 100 = 30%. Known percentages: 36% + 30% + 18% = 84%. Missing % = 100% − 84% = 16%.",
    generalRule:
      "Convert all raw counts to percentages first. Then sum all known percentages. Missing % = 100% − total known. This only works because 'exactly one complication' makes categories mutually exclusive.",
    wrongOptionReasons: {
      A: "12% - likely uses 45 directly as 45% (raw-as-% trap), giving 36+45+18=99; 100−99=1%. Or a different arithmetic error.",
      B: "14% - arithmetic error after converting 45 to 30%, possibly adding incorrectly.",
      C: "Correct - 45÷150=30%; 36+30+18=84%; 100−84=16%.",
      D: "18% - confuses the hypothermia percentage (18%) with the nausea percentage.",
    },
    keyInsight:
      "Spot the mixed format: some figures are raw counts, others are percentages. Convert everything to the same unit before summing.",
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
      "The question asks about those who responded, not everyone surveyed. Respondents = 84 + 76 = 160. Of these, 84 liked the product. 84 ÷ 160 × 100 = 52.5%.",
    generalRule:
      "Always identify what the question asks you to divide by. 'Of those who responded' means respondents only as denominator - not the full sample. Read the denominator clause before calculating.",
    wrongOptionReasons: {
      A: "42% - uses the total sample (200) as denominator: 84÷200=42%. Wrong denominator.",
      B: "48% - arithmetic error or wrong grouping of respondents.",
      C: "Correct - respondents=84+76=160; 84÷160×100=52.5%.",
      D: "60% - no valid calculation from the given numbers produces this.",
    },
    keyInsight:
      "A (42%) is the answer you get with the wrong denominator. If you calculate 42%, stop and re-read whether the question asks about respondents or all participants.",
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
      "Use the complement method. P(no window on one flight) = 0.6. P(no window on both flights) = 0.6 × 0.6 = 0.36. P(at least one window) = 1 − 0.36 = 0.64, which is greater than 0.5.",
    generalRule:
      "P(at least one) = 1 − P(none). Calculate P(none) using independence (multiply), then subtract from 1. Never add individual probabilities for 'at least one' - this overcounts.",
    wrongOptionReasons: {
      A: "Correct - P(miss both)=0.6²=0.36; P(at least one)=1−0.36=0.64>0.5. Yes, more likely.",
      B: "0.8 - adds the two probabilities (0.4+0.4=0.8), which overcounts the both-window scenario.",
      C: "0.16 - calculates P(window on both flights)=0.4×0.4=0.16, which is neither the at-least-one probability nor the answer to the question.",
      D: "0.24 - no valid calculation from these numbers produces 0.24. Likely a random arithmetic error.",
    },
    keyInsight:
      "Never add probabilities for 'at least one'. Use the complement: P(at least one) = 1 − P(none).",
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
      "Y can only win if X fails first. X gets the very first opportunity to throw a six. This turn-order advantage gives X a higher overall probability of winning, regardless of how the die is biased or whether the die is fair.",
    generalRule:
      "In a first-to-succeed game with alternating turns, Player 1 always has a structural advantage: they get the first attempt before Player 2 can act. Probability magnitude and die bias do not remove this structural edge.",
    wrongOptionReasons: {
      A: "Incorrect - sharing the same die does not equalise chances. X still gets the first throw opportunity.",
      B: "Incorrect - bias magnitude affects individual throw probability but does not remove X's first-throw structural advantage.",
      C: "Correct - X has the first throw; Y can only win if X misses. Turn order creates an inherent advantage.",
      D: "Incorrect - X's structural advantage exists regardless of bias direction. Even an unbiased die gives X the first-throw edge.",
    },
    keyInsight:
      "Turn order, not probability values, creates first-player advantage. This is true regardless of whether the die is fair or biased.",
    skillTag: "first-player-advantage",
    commonTrap: "same-probability-each-turn",
    review: {
      ambiguityRisk: "low",
      whySafeToInclude:
        "Turn order creates first-throw advantage. Bias magnitude does not remove that structural edge.",
    },
  },

  // ── BETA QUESTIONS ────────────────────────────────────────────────────────

  {
    id: "data-complement-002",
    trainerType: "data-logic",
    difficulty: "easy",
    beta: true,
    stem: "A machine on a production line has a 75% success rate.",
    question: "What is the failure rate of the machine?",
    options: [
      { id: "A", text: "15%" },
      { id: "B", text: "20%" },
      { id: "C", text: "25%" },
      { id: "D", text: "30%" },
    ],
    correctAnswer: "C",
    explanation:
      "Success and failure are mutually exclusive and exhaustive, so they add to 100%. Failure rate = 100% − 75% = 25%.",
    generalRule:
      "Success + Failure = 100%. Always. The complement of success is failure. One step: subtract the given rate from 100.",
    wrongOptionReasons: {
      A: "15% - no standard operation on 75% produces 15%.",
      B: "20% - no standard complement of 75% gives 20%. Possibly from halving something incorrectly.",
      C: "Correct - 100% − 75% = 25%.",
      D: "30% - no standard operation on 75% produces 30%.",
    },
    keyInsight:
      "Success and failure cover all possibilities with no overlap, so they must sum to exactly 100%.",
    skillTag: "complement",
    commonTrap: "complement-error",
    review: {
      calculationChecked: true,
      ambiguityRisk: "low",
      whySafeToInclude: "Single complement step with whole-number percentages. One clear correct answer.",
    },
  },
  {
    id: "data-complement-003",
    trainerType: "data-logic",
    difficulty: "easy",
    beta: true,
    stem: "In a postal survey, 65% of recipients did not respond.",
    question: "What was the response rate?",
    options: [
      { id: "A", text: "25%" },
      { id: "B", text: "35%" },
      { id: "C", text: "45%" },
      { id: "D", text: "65%" },
    ],
    correctAnswer: "B",
    explanation:
      "Responding and not responding are the only two outcomes, so they add to 100%. Response rate = 100% − 65% = 35%.",
    generalRule:
      "Response and non-response are complements: response rate = 100% − non-response rate. They are mutually exclusive and exhaustive.",
    wrongOptionReasons: {
      A: "25% - no valid complement of 65%. Possibly from subtracting from a wrong base.",
      B: "Correct - 100% − 65% = 35%.",
      C: "45% - arithmetic error, possibly from subtracting 65 from 100 incorrectly.",
      D: "65% - copies the non-response figure directly instead of subtracting from 100%. Classic trap.",
    },
    keyInsight:
      "D is the most common mistake: copying the given percentage as the answer. Always subtract from 100%.",
    skillTag: "complement",
    commonTrap: "complement-error",
    review: {
      calculationChecked: true,
      ambiguityRisk: "low",
      whySafeToInclude:
        "Practises the complement rule in a survey context. D is a common trap (repeating the non-response figure).",
    },
  },
  {
    id: "data-raw-to-percentage-001",
    trainerType: "data-logic",
    difficulty: "easy",
    beta: true,
    stem: "In a clinical trial, 80 patients took a new medication. 20 of them reported a side effect.",
    question: "What percentage of patients reported a side effect?",
    options: [
      { id: "A", text: "20%" },
      { id: "B", text: "25%" },
      { id: "C", text: "30%" },
      { id: "D", text: "40%" },
    ],
    correctAnswer: "B",
    explanation:
      "Percentage = (part ÷ whole) × 100 = (20 ÷ 80) × 100 = 25%. The raw count (20) and the percentage (25%) are different numbers.",
    generalRule:
      "Percentage = (part ÷ whole) × 100. A raw count is never automatically a percentage - always divide by the total and multiply by 100.",
    wrongOptionReasons: {
      A: "20% - treats the raw count (20 patients) as if it were already a percentage. The most common trap.",
      B: "Correct - 20÷80×100=25%.",
      C: "30% - arithmetic error, no valid calculation from these numbers.",
      D: "40% - likely 80÷200 or some confusion with another figure.",
    },
    keyInsight:
      "The raw count (20) and the percentage (25%) will almost never be the same number. If they match, double-check your arithmetic.",
    skillTag: "raw-to-percentage",
    commonTrap: "raw-number-treated-as-percentage",
    optionalWorkingSteps: ["20 ÷ 80 = 0.25.", "0.25 × 100 = 25%."],
    review: {
      calculationChecked: true,
      ambiguityRisk: "low",
      whySafeToInclude:
        "A straightforward conversion. Option A (20%) is the classic trap of misreading the raw count as a percentage.",
    },
  },
  {
    id: "data-missing-percentage-002",
    trainerType: "data-logic",
    difficulty: "medium",
    beta: true,
    stem:
      "200 subscribers cancelled their subscription and each gave exactly one reason. 32% cited poor customer service, 50 cited price increases, 15% cited lack of new content, and the remainder cited technical issues.",
    question: "What percentage cited technical issues?",
    options: [
      { id: "A", text: "22%" },
      { id: "B", text: "25%" },
      { id: "C", text: "28%" },
      { id: "D", text: "33%" },
    ],
    correctAnswer: "C",
    explanation:
      "Convert the raw count: 50 ÷ 200 × 100 = 25%. Known percentages: 32% + 25% + 15% = 72%. Technical issues = 100% − 72% = 28%.",
    generalRule:
      "Convert all raw counts to percentages first. Sum known percentages. Missing % = 100% − sum. The 'exactly one reason' condition makes categories mutually exclusive and ensures percentages sum to 100%.",
    wrongOptionReasons: {
      A: "22% - likely uses 50 as 50% (raw-as-% trap), giving 32+50+15=97; 100−97=3%. Or a different error path.",
      B: "25% - correctly converts 50 to 25% but stops there, confusing the price-increase percentage with the answer.",
      C: "Correct - 50÷200=25%; 32+25+15=72%; 100−72=28%.",
      D: "33% - treats 50 as a percentage and makes an arithmetic error in the subtraction.",
    },
    keyInsight:
      "The raw-to-percentage conversion (50÷200=25%) is the essential step. Getting this wrong makes every subsequent calculation wrong.",
    skillTag: "missing-percentage",
    commonTrap: "raw-number-treated-as-percentage",
    optionalWorkingSteps: [
      "50 ÷ 200 × 100 = 25%.",
      "32 + 25 + 15 = 72.",
      "100 − 72 = 28%.",
    ],
    review: {
      calculationChecked: true,
      ambiguityRisk: "low",
      whySafeToInclude:
        "Exactly one reason per person makes the categories mutually exclusive. The raw-to-percentage conversion must be done before summing. D is the trap for adding 50 directly.",
    },
  },
  {
    id: "data-response-rate-001",
    trainerType: "data-logic",
    difficulty: "medium",
    beta: true,
    stem:
      "A survey was sent to 400 people. 140 responded positively, 120 responded negatively, and the rest did not respond.",
    question: "What was the overall response rate?",
    options: [
      { id: "A", text: "50%" },
      { id: "B", text: "55%" },
      { id: "C", text: "60%" },
      { id: "D", text: "65%" },
    ],
    correctAnswer: "D",
    explanation:
      "Total respondents = 140 + 120 = 260. Both positive and negative responses count. Response rate = 260 ÷ 400 × 100 = 65%.",
    generalRule:
      "Response rate = (total respondents ÷ total invited) × 100. Both positive AND negative responses count. The denominator is the full number invited, not just respondents.",
    wrongOptionReasons: {
      A: "50% - uses only one response group (e.g. 140÷400=35% or confuses with some other calculation).",
      B: "55% - arithmetic error, possibly using only one group or the wrong denominator.",
      C: "60% - arithmetic error; 260÷400=0.65 not 0.60.",
      D: "Correct - 140+120=260 respondents; 260÷400×100=65%.",
    },
    keyInsight:
      "Both 'yes' and 'no' responses count. Add positive AND negative responses before dividing by the total invited.",
    skillTag: "response-rate",
    commonTrap: "wrong-denominator",
    optionalWorkingSteps: [
      "Respondents = 140 + 120 = 260.",
      "Response rate = 260 ÷ 400 × 100 = 65%.",
    ],
    review: {
      calculationChecked: true,
      ambiguityRisk: "low",
      whySafeToInclude:
        "Reinforces that response rate uses the total invited as the denominator, not just those who responded positively.",
    },
  },
  {
    id: "data-denominator-002",
    trainerType: "data-logic",
    difficulty: "medium",
    beta: true,
    stem:
      "A company surveyed 300 employees. 96 said they were very satisfied, 144 said they were satisfied. The rest did not respond.",
    question: "What percentage of those who responded said they were very satisfied?",
    options: [
      { id: "A", text: "32%" },
      { id: "B", text: "40%" },
      { id: "C", text: "48%" },
      { id: "D", text: "64%" },
    ],
    correctAnswer: "B",
    explanation:
      "Respondents = 96 + 144 = 240. Of those who responded, 96 were very satisfied. 96 ÷ 240 × 100 = 40%. Using the full 300 as denominator is the trap: 96÷300=32%.",
    generalRule:
      "'Of those who responded' means respondents only as denominator. Add all response groups (very satisfied + satisfied) to get the respondent count, then divide.",
    wrongOptionReasons: {
      A: "32% - uses the total survey population (300) as denominator: 96÷300=32%. Wrong denominator.",
      B: "Correct - respondents=96+144=240; 96÷240×100=40%.",
      C: "48% - arithmetic error or wrong grouping (e.g. 144÷300=48%).",
      D: "64% - no valid calculation from the given numbers produces this.",
    },
    keyInsight:
      "If you get 32%, you used the wrong denominator. That is the most common wrong answer in survey percentage questions.",
    skillTag: "denominator",
    commonTrap: "wrong-denominator",
    optionalWorkingSteps: [
      "Respondents = 96 + 144 = 240.",
      "96 ÷ 240 × 100 = 40%.",
    ],
    review: {
      calculationChecked: true,
      ambiguityRisk: "low",
      whySafeToInclude:
        "The question specifies 'those who responded' as the denominator. Option A (32%) is the precise wrong answer obtained by using the full survey population.",
    },
  },
  {
    id: "data-decision-comparison-002",
    trainerType: "data-logic",
    difficulty: "medium",
    beta: true,
    stem:
      "Jamie can book an outdoor tennis court or an indoor tennis court. The outdoor court is unavailable during rain. Past records show a 0.35 probability of no rain on a given summer day. The likelihood of a maintenance closure is 1/10 for the outdoor court and 10% for the indoor court. Considering only the likelihood of rain and maintenance closure, should Jamie choose the outdoor court?",
    question: "Is the outdoor court the better choice?",
    options: [
      {
        id: "A",
        text: "Yes, because there is a 35% chance of no rain on any given day.",
      },
      {
        id: "B",
        text: "Yes, because both courts have the same likelihood of maintenance closure.",
      },
      {
        id: "C",
        text: "No, because the outdoor court has a much higher overall likelihood of being unavailable due to rain.",
      },
      {
        id: "D",
        text: "No, because the indoor court has a lower maintenance closure likelihood than the outdoor court.",
      },
    ],
    correctAnswer: "C",
    explanation:
      "Both courts have identical maintenance closure probability (1/10 = 10%). The outdoor court is also closed during rain: P(rain) = 1 − 0.35 = 0.65 = 65%. The indoor court is never closed for rain. So the outdoor court has a far higher overall unavailability risk.",
    generalRule:
      "For decision comparison, list all risk factors for each option. When one factor is equal for both, it cannot distinguish them - focus on the factors that differ. Don't forget the complement: 'no rain probability 0.35' means rain probability 0.65.",
    wrongOptionReasons: {
      A: "Incorrect - 35% chance of no rain means 65% chance of rain. The outdoor court is unavailable 65% of the time due to rain alone. This option ignores the complement.",
      B: "Incorrect - maintenance is equal for both courts (1/10=10%), so it is not a distinguishing factor and cannot favour either court.",
      C: "Correct - outdoor has 65% rain closure risk on top of equal 10% maintenance risk. Indoor has only 10% overall risk. Indoor is clearly better.",
      D: "Incorrect - maintenance rates are identical (1/10=10%). This reason is factually wrong.",
    },
    keyInsight:
      "When two factors are equal (maintenance), they cancel out. The deciding factor is the one that differs - rain, which has a 65% probability.",
    skillTag: "decision-comparison",
    commonTrap: "ignores-complement",
    optionalWorkingSteps: [
      "P(rain) = 1 − 0.35 = 0.65.",
      "Maintenance: 1/10 = 10% for both courts.",
      "Outdoor has 65% rain closure risk; indoor has 0%.",
      "Indoor is preferable overall.",
    ],
    review: {
      calculationChecked: true,
      ambiguityRisk: "low",
      whySafeToInclude:
        "The 'no rain' figure is a complement trap. D is precisely wrong: maintenance is equal for both courts. Only C correctly identifies rain as the deciding factor.",
    },
  },
  {
    id: "data-decision-comparison-003",
    trainerType: "data-logic",
    difficulty: "hard",
    beta: true,
    stem:
      "Zara can buy Machine P or Machine Q. The annual maintenance cost of each machine is £0, £100 or £200. For Machine P, the probability of £200 maintenance is 0.2, and the remaining probability is equally split between £0 and £100. For Machine Q, the probability of £100 maintenance is 0.3 and the probability of £0 maintenance is 0.2. Considering only annual maintenance costs, should Zara buy Machine P?",
    question: "Is Machine P the better purchase?",
    options: [
      {
        id: "A",
        text: "Yes, because the probability of £200 maintenance is lower for Machine P.",
      },
      {
        id: "B",
        text: "Yes, because Machine P has a 70% chance of low maintenance costs.",
      },
      {
        id: "C",
        text: "No, because Machine P has a 60% chance of maintenance costing £100.",
      },
      {
        id: "D",
        text: "No, because Machine Q has a 50% chance of maintenance costing £0.",
      },
    ],
    correctAnswer: "A",
    explanation:
      "Machine P: P(£200)=0.2; remaining 0.8 split equally gives P(£0)=P(£100)=0.4. Machine Q: P(£100)=0.3, P(£0)=0.2, so P(£200)=1−0.3−0.2=0.5. Machine P has 20% chance of highest cost vs 50% for Machine Q. Machine P is better. B is wrong: P(£0 or £100 for P)=0.8=80%, not 70%. C is wrong: P(£100 for P)=0.4=40%, not 60%. D is wrong: P(£0 for Q)=0.2=20%, not 50%.",
    generalRule:
      "For expected-cost comparisons, first complete the probability distribution for each option (all probabilities must sum to 1). Then compare the probability of the worst-cost outcome.",
    wrongOptionReasons: {
      A: "Correct - P(£200 for P)=0.2 vs P(£200 for Q)=0.5. Machine P has a much lower worst-case probability.",
      B: "Incorrect - P(£0 or £100 for P)=0.4+0.4=0.8=80%, not 70%. The stated figure is precisely wrong.",
      C: "Incorrect - P(£100 for P)=0.4=40%, not 60%. The stated figure is precisely wrong.",
      D: "Incorrect - P(£0 for Q)=0.2=20%, not 50%. The stated figure is precisely wrong.",
    },
    keyInsight:
      "Always verify the numbers in each option against your own calculation. B, C and D all contain precisely wrong figures - they are designed to catch students who do not check.",
    skillTag: "decision-comparison",
    commonTrap: "misreads-probability-distribution",
    optionalWorkingSteps: [
      "Machine P: P(£200)=0.2, so P(£0)=P(£100)=0.4.",
      "Machine Q: P(£0)=0.2, P(£100)=0.3, P(£200)=0.5.",
      "P(£200 for P) = 0.2 < P(£200 for Q) = 0.5.",
      "Machine P is better.",
    ],
    review: {
      calculationChecked: true,
      ambiguityRisk: "low",
      whySafeToInclude:
        "Each wrong option states a precise incorrect figure, making it clearly disprovable. The correct answer follows directly from comparing the probabilities of the highest-cost outcome.",
    },
  },
  {
    id: "data-independent-events-002",
    trainerType: "data-logic",
    difficulty: "medium",
    beta: true,
    stem:
      "Emma spins a fair spinner that has four equal sections: Red, Blue, Green and Yellow. She spins it 5 times in a row and gets Red every time.",
    question: "Will the probability of getting Red on the 6th spin still be 1/4?",
    options: [
      {
        id: "A",
        text: "Yes, because each spin is independent of previous spins.",
      },
      {
        id: "B",
        text: "Yes, but only because the spinner has equal sections.",
      },
      {
        id: "C",
        text: "No, because Red is already overrepresented in the results.",
      },
      {
        id: "D",
        text: "No, because statistically the next spin should be more likely to be a different colour.",
      },
    ],
    correctAnswer: "A",
    explanation:
      "Each spin is an independent event. The spinner has no memory of previous outcomes, so the probability of Red remains 1/4 on every spin. Options C and D describe the gambler's fallacy. Option B is incorrect because independence holds for any fixed-probability spinner, not only those with equal sections.",
    generalRule:
      "Independent events have no memory. Past outcomes cannot change future probabilities. Each trial is a fresh start with exactly the same probability as originally defined.",
    wrongOptionReasons: {
      A: "Correct - each spin is independent; past results have zero effect. P(Red) = 1/4 always.",
      B: "Incorrect - independence holds for any spinner with fixed probabilities, not exclusively equal-section ones. The principle is broader than stated.",
      C: "Incorrect - gambler's fallacy. Red being 'overrepresented' in 5 spins has no effect on spin 6. The spinner has no memory.",
      D: "Incorrect - gambler's fallacy. The spinner cannot 'compensate' for past results to restore balance.",
    },
    keyInsight:
      "Five Reds in a row feels unlikely, but the spinner has no memory. The sixth spin is a completely fresh event with P(Red) = 1/4.",
    skillTag: "independent-events",
    commonTrap: "gambler-fallacy",
    review: {
      ambiguityRisk: "low",
      whySafeToInclude:
        "C and D are clear gambler's fallacy traps. B adds a false condition. The independence principle applies regardless of the spinner's distribution.",
    },
  },
  {
    id: "data-at-least-one-002",
    trainerType: "data-logic",
    difficulty: "medium",
    beta: true,
    stem:
      "Anya takes two shots at a target. Each shot is independent. The probability of hitting the target on each shot is 0.3.",
    question: "Is Anya more likely than not to hit the target at least once?",
    options: [
      {
        id: "A",
        text: "Yes, because the probability of at least one hit is 0.51.",
      },
      {
        id: "B",
        text: "Yes, because the probability of hitting both times is 0.09.",
      },
      {
        id: "C",
        text: "No, because each individual shot has less than a 50% chance of success.",
      },
      {
        id: "D",
        text: "No, because the probability of at least one hit is 0.30.",
      },
    ],
    correctAnswer: "A",
    explanation:
      "Use the complement. P(miss one shot) = 0.7. P(miss both shots) = 0.7 × 0.7 = 0.49. P(at least one hit) = 1 − 0.49 = 0.51, which is greater than 0.5.",
    generalRule:
      "P(at least one hit in n trials) = 1 − P(miss all n trials). Use independence to multiply miss probabilities across trials, then subtract from 1.",
    wrongOptionReasons: {
      A: "Correct - P(miss)=0.7; P(miss both)=0.49; P(at least one hit)=0.51>0.5. Yes.",
      B: "Incorrect - 0.09 is P(hit both)=0.3×0.3=0.09. This is not the at-least-one probability, and it doesn't justify the 'Yes'.",
      C: "Incorrect - this is the most dangerous trap. Each shot being <50% does NOT mean at-least-one is <50%. The complement method is required.",
      D: "Incorrect - 0.30 is the single-shot probability, not the at-least-one probability. These are completely different values.",
    },
    keyInsight:
      "C is the most dangerous wrong answer: 'each shot less than 50% therefore overall less than 50%' is completely wrong reasoning. Two chances combined can exceed 50% even when each is below it.",
    skillTag: "at-least-one",
    commonTrap: "adds-probabilities-incorrectly",
    optionalWorkingSteps: [
      "P(miss) = 1 − 0.3 = 0.7.",
      "P(miss both) = 0.7 × 0.7 = 0.49.",
      "P(at least one hit) = 1 − 0.49 = 0.51 > 0.5.",
    ],
    review: {
      calculationChecked: true,
      ambiguityRisk: "low",
      whySafeToInclude:
        "Independence is stated. The complement method gives a clear numerical answer. C targets the classic error of judging at-least-one probability from the per-event probability alone.",
    },
  },
];
