import type { DmTrainerQuestion } from "../../types/dmTrainers";

export const VENN_LOGIC_QUESTIONS: DmTrainerQuestion[] = [
  {
    id: "venn-exactly-two-001",
    trainerType: "venn-logic",
    difficulty: "easy",
    stem:
      "A group of students were asked which of three activities they enjoyed: Cycling, Swimming and Running.",
    question: "Which statement best describes people who enjoyed exactly two activities?",
    options: [
      {
        id: "A",
        text: "People who enjoyed any two activities, including those who enjoyed all three.",
      },
      {
        id: "B",
        text: "People who enjoyed two activities but not the third.",
      },
      {
        id: "C",
        text: "People who enjoyed at least one activity.",
      },
      {
        id: "D",
        text: "People who enjoyed only one activity.",
      },
    ],
    correctAnswer: "B",
    explanation:
      "Exactly two means membership in two sets but not the third. Anyone who enjoyed all three is excluded.",
    skillTag: "exactly-two",
    commonTrap: "includes-all-three-incorrectly",
    review: {
      ambiguityRisk: "low",
      whySafeToInclude:
        "This tests precise UCAT wording for exactly two versus at least two or any two including all three.",
    },
  },
  {
    id: "venn-total-mentions-001",
    trainerType: "venn-logic",
    difficulty: "medium",
    stem:
      "A group were asked how they like their eggs cooked. 14 liked boiled, 11 liked scrambled and 12 liked fried. 6 liked all three ways. 3 liked exactly two ways. 2 liked none of them.",
    question: "How many people were asked?",
    options: [
      { id: "A", text: "20" },
      { id: "B", text: "22" },
      { id: "C", text: "24" },
      { id: "D", text: "26" },
    ],
    correctAnswer: "C",
    explanation:
      "Total mentions = 14 + 11 + 12 = 37. All-three mentions = 6 × 3 = 18. Exactly-two mentions = 3 × 2 = 6. That leaves 37 − 18 − 6 = 13 people who liked exactly one way. Total people = 13 + 3 + 6 + 2 = 24.",
    skillTag: "total-mentions",
    commonTrap: "confuses-exactly-and-at-least",
    optionalWorkingSteps: [
      "Total mentions = 14 + 11 + 12 = 37.",
      "All-three mentions = 6 × 3 = 18.",
      "Exactly-two mentions = 3 × 2 = 6.",
      "Exactly-one people = 37 − 18 − 6 = 13.",
      "Total people = 13 + 3 + 6 + 2 = 24.",
    ],
    review: {
      calculationChecked: true,
      ambiguityRisk: "low",
      whySafeToInclude:
        "The stem separates all three, exactly two and none. The total follows from mention counting.",
    },
  },
  {
    id: "venn-unknown-overlap-001",
    trainerType: "venn-logic",
    difficulty: "hard",
    stem:
      "There are 48 people in a room. 29 say they like reading. 9 say they like watching television.",
    question: "Which of the following must be true?",
    options: [
      {
        id: "A",
        text: "Between 10 and 19 inclusive people like neither reading nor television.",
      },
      {
        id: "B",
        text: "Exactly 20 people like reading but not television.",
      },
      {
        id: "C",
        text: "More people do not like reading than do not like watching television.",
      },
      {
        id: "D",
        text: "Exactly 38 people like either reading or television.",
      },
    ],
    correctAnswer: "A",
    explanation:
      "At most 29 + 9 = 38 like reading or television, so at least 48 − 38 = 10 like neither. At least 29 like reading (all television fans could be readers), so at most 48 − 29 = 19 like neither. The number who like neither must be between 10 and 19 inclusive.",
    skillTag: "unknown-overlap",
    commonTrap: "assumes-no-overlap",
    optionalWorkingSteps: [
      "Maximum reading or TV = 29 + 9 = 38, so minimum neither = 10.",
      "Minimum reading or TV = 29, so maximum neither = 19.",
    ],
    review: {
      calculationChecked: true,
      ambiguityRisk: "low",
      whySafeToInclude:
        "Overlap is unknown, so only a range for neither can be proved. Other options fix exact counts without justification.",
    },
  },
  {
    id: "venn-negative-wording-001",
    trainerType: "venn-logic",
    difficulty: "hard",
    stem:
      "In Millbrook, half of the 200 homes have both a front garden and a back garden. 70 homes do not have a back garden. 85 homes do not have a front garden.",
    question: "How many homes have neither a front garden nor a back garden?",
    options: [
      { id: "A", text: "25" },
      { id: "B", text: "40" },
      { id: "C", text: "55" },
      { id: "D", text: "70" },
    ],
    correctAnswer: "C",
    explanation:
      "100 homes have both gardens. Let x be the number with neither. Homes with only a front garden = 70 − x. Homes with only a back garden = 85 − x. So (70 − x) + 100 + (85 − x) + x = 200, giving 255 − x = 200 and x = 55.",
    skillTag: "negative-wording",
    commonTrap: "misinterprets-not-a",
    optionalWorkingSteps: [
      "Both gardens: 200 ÷ 2 = 100.",
      "Let x = neither.",
      "(70 − x) + 100 + (85 − x) + x = 200 → x = 55.",
    ],
    review: {
      calculationChecked: true,
      ambiguityRisk: "low",
      whySafeToInclude:
        "The not-a wording is translated into only-front and only-back regions. The equation has one solution.",
    },
  },
  {
    id: "venn-three-set-fill-001",
    trainerType: "venn-logic",
    difficulty: "medium",
    stem:
      "Members were asked which keep-fit methods they used: Cycling, Swimming and Running. No member used all three. 12 used exactly two methods. 10 used only Running. 9 used both Cycling and Swimming.",
    question: "How many members used Running?",
    options: [
      { id: "A", text: "12" },
      { id: "B", text: "13" },
      { id: "C", text: "17" },
      { id: "D", text: "21" },
    ],
    correctAnswer: "B",
    explanation:
      "Exactly two includes the 9 who used both Cycling and Swimming, so 12 − 9 = 3 used Running as one of exactly two other pairs. Total using Running = only Running + those two Running pairs = 10 + 3 = 13.",
    skillTag: "three-set-partition",
    commonTrap: "double-counts-pair-overlap",
    optionalWorkingSteps: [
      "Other exactly-two pairs (involving Running) = 12 − 9 = 3.",
      "Running total = 10 + 3 = 13.",
    ],
    review: {
      calculationChecked: true,
      ambiguityRisk: "low",
      whySafeToInclude:
        "No all-three region is stated. Exactly two is partitioned using the given Cycling and Swimming pair.",
    },
  },
];
