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
      "Exactly two means membership in precisely two sets - not one more, not one less. Anyone who enjoyed all three activities is excluded from this group, because they belong to three sets, not two.",
    generalRule:
      "Exactly two = both sets but NOT the third. The all-three region is always excluded. 'At least two' is the broader phrase that includes the all-three region.",
    wrongOptionReasons: {
      A: "Incorrect - 'any two including all three' describes at least two, not exactly two. The all-three region must be excluded.",
      B: "Correct - two activities but not the third is the precise definition of exactly-two regions in a Venn diagram.",
      C: "Incorrect - at least one includes everyone: people who enjoyed one, two or all three activities.",
      D: "Incorrect - only one activity is the single-set region, the opposite of exactly two.",
    },
    keyInsight:
      "When you see 'exactly two', mentally draw the Venn diagram and shade only the three pairwise-overlap zones, leaving the centre (all-three) unshaded.",
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
      "Total mentions = 14 + 11 + 12 = 37. All-three people generate 3 mentions each: 6 × 3 = 18 mentions. Exactly-two people generate 2 mentions each: 3 × 2 = 6 mentions. Exactly-one people = 37 − 18 − 6 = 13. Total people = 13 + 3 + 6 + 2 = 24.",
    generalRule:
      "Total mentions = sum of all raw set sizes (each person counted once per set). Remove all-three mentions (×3) and exactly-two mentions (×2) to find exactly-one people. Then sum: exactly-one + exactly-two + all-three + none.",
    wrongOptionReasons: {
      A: "20 - undercounts. Likely obtained by adding some groups but missing the mentions-to-people conversion.",
      B: "22 - a common arithmetic error, possibly from misidentifying all-three mentions.",
      C: "Correct - mentions=37; subtract 18 (all-three) and 6 (exactly-two); exactly-one=13; total=13+3+6+2=24.",
      D: "26 - overcounts. Possibly from adding all given numbers without converting mentions to people first.",
    },
    keyInsight:
      "Work in mentions first, then convert back to people. The trap is treating the raw set sizes as if they already count people once each.",
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
      "The overlap is unknown. Maximum union = 29 + 9 = 38 (no overlap), giving minimum neither = 48 − 38 = 10. Minimum union = 29 (all TV-watchers also read), giving maximum neither = 48 − 29 = 19. So neither must be between 10 and 19 inclusive.",
    generalRule:
      "When overlap is unknown, only ranges can be proved. Max union = A + B (no overlap). Min union = max(A, B) (smaller set entirely inside larger). Neither = total − union.",
    wrongOptionReasons: {
      A: "Correct - neither ∈ [48−38, 48−29] = [10, 19]. This is always true regardless of overlap size.",
      B: "Incorrect - reading-only = 29 − overlap. Without knowing the overlap, this cannot be fixed at 20.",
      C: "Incorrect - not-reading = 48−29 = 19; not-TV = 48−9 = 39. More people dislike TV, not reading. This statement is false.",
      D: "Incorrect - union = 29 + 9 − overlap. Without knowing the overlap, the union is not fixed at 38.",
    },
    keyInsight:
      "For unknown-overlap questions, never state a fixed count - compute the range instead using min and max union.",
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
      "Both gardens = 200 ÷ 2 = 100. Let x = neither. 'No back garden' = only-front + neither, so only-front = 70 − x. 'No front garden' = only-back + neither, so only-back = 85 − x. Equation: (70 − x) + 100 + (85 − x) + x = 200 → 255 − x = 200 → x = 55.",
    generalRule:
      "'Does not have X' means only-Y or neither - not only-Y alone. Translate each negative clause, set x = neither, and build one equation summing all four regions to the total.",
    wrongOptionReasons: {
      A: "25 - undercounts neither, likely from treating 'no back garden' as a single region rather than only-front + neither.",
      B: "40 - arithmetic error in the equation, possibly using the wrong coefficient for x.",
      C: "Correct - equation (70−x)+(85−x)+100+x=200 gives x=55. Verify: only-front=15, only-back=30, both=100, neither=55; total=200. ✓",
      D: "70 - confuses 'no back garden' with 'neither', treating the 70 directly as the answer.",
    },
    keyInsight:
      "Always label all four Venn regions explicitly: only-A, only-B, both, neither. Then write one equation and solve.",
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
      "Since no member used all three, the three exactly-two pairs are Cycling+Swimming, Cycling+Running and Swimming+Running. Cycling+Swimming = 9. The two Running pairs = 12 − 9 = 3. Running total = only-Running + Running pairs = 10 + 3 = 13.",
    generalRule:
      "When no all-three region exists, every exactly-two person is in one of three pairwise zones. Identify the given pair, subtract from the total exactly-two, and the remainder are pairs involving the target set.",
    wrongOptionReasons: {
      A: "12 - confuses 'exactly two methods total' with 'total using Running'.",
      B: "Correct - Running pairs = 12−9=3; Running total = 10+3=13.",
      C: "17 - adds 12 and 9 without subtracting correctly, double-counting.",
      D: "21 - sums all three given numbers (10+9+12) without accounting for which pairs involve Running.",
    },
    keyInsight:
      "Subtract the known non-Running pair (Cycling+Swimming=9) from total exactly-two (12) to isolate Running pairs.",
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

  // ── BETA QUESTIONS ────────────────────────────────────────────────────────

  {
    id: "venn-at-least-two-001",
    trainerType: "venn-logic",
    difficulty: "easy",
    beta: true,
    stem: "A group of students were asked which of three sports they enjoyed: Tennis, Football and Badminton.",
    question: "Which statement best describes students who enjoyed at least two of the sports?",
    options: [
      {
        id: "A",
        text: "Students who enjoyed exactly two sports but not the third.",
      },
      {
        id: "B",
        text: "Students who enjoyed two or more sports, including those who enjoyed all three.",
      },
      {
        id: "C",
        text: "Students who enjoyed all three sports.",
      },
      {
        id: "D",
        text: "Students who enjoyed only one sport.",
      },
    ],
    correctAnswer: "B",
    explanation:
      "'At least two' means two or more, so it includes everyone in the exactly-two regions AND everyone in the all-three region. 'Exactly two' is the stricter sub-case that excludes the all-three region.",
    generalRule:
      "'At least two' (≥2) includes exactly-two AND all-three. 'Exactly two' excludes the all-three region. These are different groups - know which one the question asks for.",
    wrongOptionReasons: {
      A: "Incorrect - this describes 'exactly two', not 'at least two'. It leaves out the all-three region.",
      B: "Correct - two or more sports includes exactly-two and all-three, which is the full meaning of at-least-two.",
      C: "Incorrect - the all-three region alone is a sub-group of at-least-two, not the whole group.",
      D: "Incorrect - only-one is a completely separate, smaller region with no overlap.",
    },
    keyInsight:
      "Think of 'at least two' as 'exactly two PLUS all three'. Draw both regions, then shade them together.",
    skillTag: "at-least-two",
    commonTrap: "confuses-at-least-two-with-exactly-two",
    review: {
      ambiguityRisk: "low",
      whySafeToInclude:
        "The distinction between 'at least two' and 'exactly two' is a core UCAT wording test. Only B is correct.",
    },
  },
  {
    id: "venn-only-one-set-001",
    trainerType: "venn-logic",
    difficulty: "easy",
    beta: true,
    stem: "A group of students were asked whether they played Piano, Guitar or Violin.",
    question: "Which statement best describes students who played 'only Piano'?",
    options: [
      {
        id: "A",
        text: "Students who played Piano and at least one other instrument.",
      },
      {
        id: "B",
        text: "Students who played Piano and one other instrument but not the third.",
      },
      {
        id: "C",
        text: "Students who played Piano but neither Guitar nor Violin.",
      },
      {
        id: "D",
        text: "Students who played all three instruments.",
      },
    ],
    correctAnswer: "C",
    explanation:
      "'Only Piano' means Piano and nothing else. These students are entirely outside the Guitar and Violin circles - no overlap with any other set.",
    generalRule:
      "'Only X' = X and nothing else. The student sits in the single-set region with zero overlap with any other circle. Any option that includes another instrument alongside Piano is wrong.",
    wrongOptionReasons: {
      A: "Incorrect - 'Piano and at least one other' puts the student inside overlaps, the opposite of 'only Piano'.",
      B: "Incorrect - 'Piano and one other but not the third' is the exactly-two definition, not only-Piano.",
      C: "Correct - Piano but neither Guitar nor Violin is precisely the only-Piano region.",
      D: "Incorrect - all three instruments is the centre of the diagram, the furthest point from 'only Piano'.",
    },
    keyInsight:
      "'Only' is your signal for the exclusive single-set zone. If you can draw a line to any other circle, it is not 'only'.",
    skillTag: "only-one-set",
    commonTrap: "includes-pairwise-overlaps",
    review: {
      ambiguityRisk: "low",
      whySafeToInclude:
        "The 'only' qualifier unambiguously means the single-set region with no overlap. Only C captures this.",
    },
  },
  {
    id: "venn-three-set-subjects-001",
    trainerType: "venn-logic",
    difficulty: "medium",
    beta: true,
    stem:
      "40 students were asked which subjects they had studied: Science, Art and Music. All students had studied at least one subject. No student had studied both Science and Art. 8 students had studied both Science and Music. Twice as many had studied both Art and Music. 7 students had studied only Music. 5 students had studied only Science.",
    question: "How many more students had studied Music than had studied Science?",
    options: [
      { id: "A", text: "15" },
      { id: "B", text: "18" },
      { id: "C", text: "20" },
      { id: "D", text: "24" },
    ],
    correctAnswer: "B",
    explanation:
      "Art+Music = 2 × 8 = 16. No Science+Art means the all-three region = 0. Art-only = 40 − 5 − 7 − 8 − 16 = 4. Music total = 7 + 8 + 16 = 31. Science total = 5 + 8 = 13. Difference = 31 − 13 = 18.",
    generalRule:
      "In three-set problems, fill in regions from most constrained to least. Use given constraints to eliminate unknowns early, then sum the regions for each set you need.",
    wrongOptionReasons: {
      A: "15 - arithmetic error, likely missing the Art+Music region or misreading 'twice as many'.",
      B: "Correct - Music=31, Science=13, difference=18. Verify: 5+4+7+8+16=40. ✓",
      C: "20 - likely uses Art+Music=16 rather than computing it, or sums the wrong regions.",
      D: "24 - overcounts, possibly treating 'twice as many' as adding 16 to a region that already includes it.",
    },
    keyInsight:
      "No Science+Art means no all-three region. Remove it from your diagram immediately - it simplifies every subsequent step.",
    skillTag: "three-set-partition",
    commonTrap: "misreads-twice-as-many",
    optionalWorkingSteps: [
      "Art + Music = 2 × 8 = 16.",
      "No Science+Art means all-three = 0.",
      "Art-only = 40 − 5 − 7 − 8 − 16 = 4.",
      "Music = 7 + 8 + 16 = 31.",
      "Science = 5 + 8 = 13.",
      "Difference = 31 − 13 = 18.",
    ],
    review: {
      calculationChecked: true,
      ambiguityRisk: "low",
      whySafeToInclude:
        "All values are non-negative and the total (5+4+7+8+16=40) is verified. The no-Science-and-Art constraint cleanly eliminates the all-three region.",
    },
  },
  {
    id: "venn-total-mentions-transport-001",
    trainerType: "venn-logic",
    difficulty: "medium",
    beta: true,
    stem:
      "A group were asked how they preferred to travel: by Train, Car or Bicycle. 17 liked Train, 14 liked Car and 10 liked Bicycle. 5 liked all three. 8 liked exactly two. 3 liked none of them.",
    question: "How many people were asked?",
    options: [
      { id: "A", text: "22" },
      { id: "B", text: "24" },
      { id: "C", text: "26" },
      { id: "D", text: "28" },
    ],
    correctAnswer: "C",
    explanation:
      "Total mentions = 17 + 14 + 10 = 41. All-three mentions = 5 × 3 = 15. Exactly-two mentions = 8 × 2 = 16. Exactly-one people = 41 − 15 − 16 = 10. Total = 10 + 8 + 5 + 3 = 26.",
    generalRule:
      "Total mentions = sum of all raw set sizes. Subtract all-three×3 and exactly-two×2 to find exactly-one people. Sum the four groups: exactly-one + exactly-two + all-three + none.",
    wrongOptionReasons: {
      A: "22 - undercounts. Likely treats all-three and exactly-two as people rather than converting to mentions first.",
      B: "24 - close but a step is missing or arithmetic error in the mentions conversion.",
      C: "Correct - mentions=41; subtract 15 and 16; exactly-one=10; total=10+8+5+3=26. Verify: 10×1+8×2+5×3=41. ✓",
      D: "28 - overcounts. Possibly adds all given numbers without the mentions-to-people conversion.",
    },
    keyInsight:
      "The mentions method reverses the double/triple counting built into the raw set sizes. Always subtract mentions, not people.",
    skillTag: "total-mentions",
    commonTrap: "confuses-exactly-and-at-least",
    optionalWorkingSteps: [
      "Total mentions = 17 + 14 + 10 = 41.",
      "All-three mentions = 5 × 3 = 15.",
      "Exactly-two mentions = 8 × 2 = 16.",
      "Exactly-one people = 41 − 15 − 16 = 10.",
      "Total = 10 + 8 + 5 + 3 = 26.",
    ],
    review: {
      calculationChecked: true,
      ambiguityRisk: "low",
      whySafeToInclude:
        "Mentions are balanced: 10×1 + 8×2 + 5×3 = 41. All regions are non-negative. Total is uniquely determined.",
    },
  },
  {
    id: "venn-unknown-overlap-002",
    trainerType: "venn-logic",
    difficulty: "hard",
    beta: true,
    stem:
      "There are 60 people at an event. 40 say they enjoy hiking. 15 say they enjoy swimming. People may enjoy both or neither.",
    question: "Which of the following must be true?",
    options: [
      {
        id: "A",
        text: "Between 5 and 20 inclusive people enjoy neither hiking nor swimming.",
      },
      {
        id: "B",
        text: "Exactly 5 people enjoy both hiking and swimming.",
      },
      {
        id: "C",
        text: "More people do not enjoy hiking than do not enjoy swimming.",
      },
      {
        id: "D",
        text: "Exactly 55 people enjoy hiking or swimming.",
      },
    ],
    correctAnswer: "A",
    explanation:
      "Neither = 60 − (40 + 15 − overlap) = 5 + overlap. Overlap ranges from 0 to 15, so neither ranges from 5 to 20. A must be true. B fixes the overlap without justification. C is false: not-hiking = 20, not-swimming = 45, so more people do not swim. D is false because the union depends on the unknown overlap.",
    generalRule:
      "For two sets in a universe of N, neither = N − union. Union ranges from max(A,B) to A+B. Therefore neither ranges from N−(A+B) to N−max(A,B). Only statements that hold across the entire range must be true.",
    wrongOptionReasons: {
      A: "Correct - neither = 5+overlap, overlap ∈ [0,15], so neither ∈ [5,20]. Always true.",
      B: "Incorrect - fixes overlap at 15 without justification; overlap could be any value from 0 to 15.",
      C: "Incorrect - not-hiking=20, not-swimming=45. More people do NOT swim than do not hike. The statement is false.",
      D: "Incorrect - union=55−overlap, which is not fixed without knowing the overlap. Could be anything from 40 to 55.",
    },
    keyInsight:
      "Overlap is bounded by [0, min(A,B)] = [0, 15]. Never assume it is zero (no overlap) or the maximum (all swimmers hike).",
    skillTag: "unknown-overlap",
    commonTrap: "assumes-no-overlap",
    optionalWorkingSteps: [
      "Neither = 60 − union = 60 − (40 + 15 − overlap) = 5 + overlap.",
      "Overlap ∈ [0, 15], so neither ∈ [5, 20]. A must be true.",
      "Not-hiking = 20, not-swimming = 45. More don't swim, so C is false.",
      "Union = 55 − overlap; not fixed, so D is false.",
    ],
    review: {
      calculationChecked: true,
      ambiguityRisk: "low",
      whySafeToInclude:
        "40+15=55 < 60 so overlap is not forced. The range for neither follows directly. B, C and D each fail for a precise calculable reason.",
    },
  },
  {
    id: "venn-negative-wording-002",
    trainerType: "venn-logic",
    difficulty: "hard",
    beta: true,
    stem:
      "In Trentham, a third of the 270 houses have both a garage and a driveway. 108 houses do not have a garage. 90 houses do not have a driveway.",
    question: "How many houses have neither a garage nor a driveway?",
    options: [
      { id: "A", text: "9" },
      { id: "B", text: "18" },
      { id: "C", text: "27" },
      { id: "D", text: "36" },
    ],
    correctAnswer: "B",
    explanation:
      "Both = 270 ÷ 3 = 90. Let x = neither. 'No garage' = only-driveway + neither, so only-driveway = 108 − x. 'No driveway' = only-garage + neither, so only-garage = 90 − x. Equation: (108 − x) + (90 − x) + 90 + x = 270 → 288 − x = 270 → x = 18.",
    generalRule:
      "'Does not have garage' = only-driveway + neither. 'Does not have driveway' = only-garage + neither. Set x = neither, express all four regions, sum to total, and solve.",
    wrongOptionReasons: {
      A: "9 - arithmetic error in the equation, possibly from mishandling the coefficient of x.",
      B: "Correct - equation gives x=18. Verify: only-driveway=90, only-garage=72, both=90, neither=18; total=270. ✓",
      C: "27 - likely from misinterpreting 'a third' (e.g. using 90 as the neither figure rather than the both figure).",
      D: "36 - likely uses the wrong fraction or confuses the two 'no-garden' figures.",
    },
    keyInsight:
      "After solving, verify by summing all four regions: only-driveway + only-garage + both + neither must equal 270.",
    skillTag: "negative-wording",
    commonTrap: "misinterprets-not-a",
    optionalWorkingSteps: [
      "Both = 270 ÷ 3 = 90.",
      "Let x = neither.",
      "Only-driveway = 108 − x, only-garage = 90 − x.",
      "(108−x) + (90−x) + 90 + x = 270 → x = 18.",
    ],
    review: {
      calculationChecked: true,
      ambiguityRisk: "low",
      whySafeToInclude:
        "All four regions are non-negative when x=18 (only-driveway=90, only-garage=72, both=90, neither=18; total=270). The equation has one solution.",
    },
  },
  {
    id: "venn-three-set-rides-001",
    trainerType: "venn-logic",
    difficulty: "medium",
    beta: true,
    stem:
      "Visitors to a fair were asked which rides they had taken: Rollercoaster, Ferris Wheel and Log Flume. No visitor had taken all three rides. 18 visitors had taken exactly two rides. 20 visitors had taken only the Rollercoaster. 11 visitors had taken both the Ferris Wheel and the Log Flume.",
    question: "How many visitors had taken the Rollercoaster?",
    options: [
      { id: "A", text: "22" },
      { id: "B", text: "25" },
      { id: "C", text: "27" },
      { id: "D", text: "31" },
    ],
    correctAnswer: "C",
    explanation:
      "Since no visitor took all three, all exactly-two people are in one of three pairwise zones. Ferris Wheel+Log Flume = 11. The two Rollercoaster pairs = 18 − 11 = 7. Rollercoaster total = 20 + 7 = 27.",
    generalRule:
      "When no all-three region exists, every exactly-two person is in one of three pairwise zones. Identify the given pair, subtract from the total exactly-two, and the remainder are pairs involving the target set.",
    wrongOptionReasons: {
      A: "22 - undercounts. Possibly uses only directly given numbers without computing Rollercoaster pairs.",
      B: "25 - arithmetic error in the pairs subtraction (e.g. 18−11=7 computed incorrectly).",
      C: "Correct - Ferris+Flume=11; Rollercoaster pairs=18−11=7; total=20+7=27.",
      D: "31 - overcounts, perhaps adding 11 instead of subtracting, or misidentifying which pairs involve the Rollercoaster.",
    },
    keyInsight:
      "Ferris Wheel+Log Flume is the only pair that does NOT involve the Rollercoaster. Remove it from the exactly-two total to isolate Rollercoaster pairs.",
    skillTag: "three-set-partition",
    commonTrap: "double-counts-pair-overlap",
    optionalWorkingSteps: [
      "Ferris Wheel + Log Flume pairs = 11.",
      "Rollercoaster pairs = 18 − 11 = 7.",
      "Rollercoaster total = 20 + 7 = 27.",
    ],
    review: {
      calculationChecked: true,
      ambiguityRisk: "low",
      whySafeToInclude:
        "The no-all-three constraint means Ferris Wheel+Log Flume can only be an exactly-two pair. The remaining exactly-two pairs all involve the Rollercoaster.",
    },
  },
  {
    id: "venn-sports-cricket-001",
    trainerType: "venn-logic",
    difficulty: "medium",
    beta: true,
    stem:
      "A group of 30 people all watched at least one of three sports: Cricket, Rugby and Tennis. 6 people watched all three sports. 9 people watched exactly two sports. 15 people watched exactly one sport. 12 people watched Cricket in total.",
    question: "How many people watched Rugby or Tennis but not Cricket?",
    options: [
      { id: "A", text: "12" },
      { id: "B", text: "15" },
      { id: "C", text: "18" },
      { id: "D", text: "21" },
    ],
    correctAnswer: "C",
    explanation:
      "Since all 30 watched at least one sport, there are no empty-region people. Cricket watchers = 12, so everyone else watched Rugby or Tennis but not Cricket: 30 − 12 = 18.",
    generalRule:
      "When every person in the group belongs to at least one set, 'not in set X' = total − |X|. The 'at least one' condition eliminates the empty region, making the complement simple subtraction.",
    wrongOptionReasons: {
      A: "12 - this is the Cricket total, not the non-Cricket total.",
      B: "15 - this is the exactly-one total, a tempting but irrelevant figure.",
      C: "Correct - all 30 watched at least one sport; not-Cricket = 30−12=18.",
      D: "21 - likely 30−9=21, confusing the exactly-two total (9) with Cricket viewers (12).",
    },
    keyInsight:
      "The 'at least one' guarantee eliminates any empty region, so not-Cricket = everyone else in the group. Extra data (exactly-one, exactly-two) is a deliberate distraction.",
    skillTag: "complement-in-universal-set",
    commonTrap: "confuses-exactly-one-with-the-answer",
    optionalWorkingSteps: [
      "Total = 15 + 9 + 6 = 30 (confirmed).",
      "Not-Cricket = 30 − 12 = 18.",
      "Since all 30 watched at least one sport, not-Cricket = Rugby or Tennis but not Cricket.",
    ],
    review: {
      calculationChecked: true,
      ambiguityRisk: "low",
      whySafeToInclude:
        "The 'at least one' condition makes 'not Cricket' equivalent to 'Rugby or Tennis but not Cricket'. The answer is fixed at 18 regardless of how the exactly-two and exactly-one groups are distributed among the three sports.",
    },
  },
  {
    id: "venn-pairwise-overlap-001",
    trainerType: "venn-logic",
    difficulty: "medium",
    beta: true,
    stem:
      "A group of pet owners were surveyed. 10 owned all three: a cat, a dog and a rabbit. 15 owned both a cat and a dog (including those who also owned a rabbit). 20 owned both a cat and a rabbit (including those who also owned a dog). 8 owned both a dog and a rabbit (including those who also owned a cat).",
    question: "How many owners had a cat and a dog but not a rabbit?",
    options: [
      { id: "A", text: "3" },
      { id: "B", text: "5" },
      { id: "C", text: "7" },
      { id: "D", text: "10" },
    ],
    correctAnswer: "B",
    explanation:
      "'Both a cat and a dog including those with a rabbit' means cat∩dog = 15, which includes the all-three region. Cat and dog but not rabbit = (cat∩dog) − all-three = 15 − 10 = 5.",
    generalRule:
      "A∩B 'including those with C' = the full pairwise overlap count, which contains the all-three region. A and B only = (A∩B) − all-three. One subtraction gives the exactly-two zone.",
    wrongOptionReasons: {
      A: "3 - likely subtracts from the wrong pairwise figure or uses 8 (dog+rabbit) instead of 15 (cat+dog).",
      B: "Correct - cat∩dog (including rabbit) = 15; all-three = 10; cat and dog only = 15−10=5.",
      C: "7 - possibly confuses cat∩rabbit (20−10=10) with cat∩dog, or makes an arithmetic error.",
      D: "10 - reports the all-three count rather than subtracting it from cat∩dog.",
    },
    keyInsight:
      "Always subtract all-three from any 'including those with the third' figure to isolate the exactly-two region. Never report the all-three count as your answer.",
    skillTag: "pairwise-overlap-including-all-three",
    commonTrap: "includes-all-three-in-answer",
    optionalWorkingSteps: [
      "Cat ∩ dog (including rabbit) = 15.",
      "All three = 10.",
      "Cat and dog only = 15 − 10 = 5.",
    ],
    review: {
      calculationChecked: true,
      ambiguityRisk: "low",
      whySafeToInclude:
        "The stem explicitly states 'including those who also owned a rabbit', teaching students that A∩B in UCAT includes the all-three region unless 'only' is specified. One subtraction gives the unique answer.",
    },
  },
  {
    id: "venn-total-mentions-films-001",
    trainerType: "venn-logic",
    difficulty: "medium",
    beta: true,
    stem:
      "A group were asked which of three films they had seen: Film X, Film Y and Film Z. 20 had seen Film X, 18 had seen Film Y and 15 had seen Film Z. 9 had seen all three films. 6 had seen exactly two films.",
    question: "How many people had seen at least one film?",
    options: [
      { id: "A", text: "23" },
      { id: "B", text: "26" },
      { id: "C", text: "29" },
      { id: "D", text: "32" },
    ],
    correctAnswer: "C",
    explanation:
      "Total mentions = 20 + 18 + 15 = 53. All-three mentions = 9 × 3 = 27. Exactly-two mentions = 6 × 2 = 12. Exactly-one people = 53 − 27 − 12 = 14. At-least-one = 14 + 6 + 9 = 29.",
    generalRule:
      "At-least-one = exactly-one + exactly-two + all-three. Use the mentions method to find exactly-one people first. Note: the question asks for at-least-one, not the total people asked (which would include those who saw no films).",
    wrongOptionReasons: {
      A: "23 - undercounts. Likely omits the all-three or exactly-two group from the final sum.",
      B: "26 - arithmetic error in the mentions conversion or final summing step.",
      C: "Correct - exactly-one=14; at-least-one=14+6+9=29. Verify: 14×1+6×2+9×3=53. ✓",
      D: "32 - overcounts. Possibly from not converting mentions to people correctly, or adding an extra group.",
    },
    keyInsight:
      "'At least one film' ≠ 'total people asked'. If there were also people who saw no films, they would not appear in any set and must be added separately.",
    skillTag: "total-mentions",
    commonTrap: "confuses-exactly-and-at-least",
    optionalWorkingSteps: [
      "Total mentions = 20 + 18 + 15 = 53.",
      "All-three mentions = 9 × 3 = 27.",
      "Exactly-two mentions = 6 × 2 = 12.",
      "Exactly-one people = 53 − 27 − 12 = 14.",
      "At-least-one = 14 + 6 + 9 = 29.",
    ],
    review: {
      calculationChecked: true,
      ambiguityRisk: "low",
      whySafeToInclude:
        "Verification: 14×1 + 6×2 + 9×3 = 14+12+27 = 53. Internal consistency confirmed. The question asks for 'at least one' rather than 'total asked', reinforcing the distinction.",
    },
  },
];
