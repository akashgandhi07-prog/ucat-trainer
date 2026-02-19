import type { InferenceQuestion, TextSpan } from "../types/inference";

/** Helper: find character span for a substring in passage text. Returns null if not found. */
function spanFor(passageText: string, substring: string): TextSpan | null {
  const idx = passageText.indexOf(substring);
  if (idx === -1) return null;
  return { start: idx, end: idx + substring.length };
}

/**
 * Build questions for a passage. Call with passage.text to get spans.
 * Important: each question uses an exact substring match (spanFor). If passage text in
 * passages.ts is edited, the corresponding substring in this file must match exactly,
 * or that question will be omitted at runtime.
 */
function buildQuestionsForPassage(passageId: string, text: string): InferenceQuestion[] {
  const questions: InferenceQuestion[] = [];

  // pass_01: Autonomy in Geriatric Care
  if (passageId === "pass_01") {
    const q1 = spanFor(
      text,
      "The legal framework in the United Kingdom requires that every effort is made to support decision making before capacity is deemed absent."
    );
    if (q1) {
      questions.push({
        id: "inf_01_q1",
        passageId: "pass_01",
        questionText:
          "Identify the part of the text from which we can infer that UK law requires supporting patient decision-making before declaring incapacity.",
        correctSpans: [q1],
        explanation:
          "This sentence states that the UK legal framework requires every effort to support decision making before capacity is deemed absent—directly answering the question.",
        difficulty: "medium",
      });
    }

    const q2 = spanFor(
      text,
      "Some ethicists argue that soft paternalism is necessary in cases of fluctuating capacity while others maintain that autonomy allows for choices that seem irrational to observers."
    );
    if (q2) {
      questions.push({
        id: "inf_01_q2",
        passageId: "pass_01",
        questionText:
          "Identify the part of the text from which we can infer that there is disagreement among ethicists about when to override a patient's choices.",
        correctSpans: [q2],
        explanation:
          "The passage presents two opposing views: one arguing for soft paternalism in fluctuating capacity, the other that autonomy permits seemingly irrational choices.",
        difficulty: "medium",
      });
    }
    const q3 = spanFor(
      text,
      "Family members often intervene believing they know what is best for the patient which can lead to further conflicts."
    );
    if (q3) {
      questions.push({
        id: "inf_01_q3",
        passageId: "pass_01",
        questionText:
          "Identify the part of the text from which we can infer that family involvement can create additional ethical tension.",
        correctSpans: [q3],
        explanation:
          "Family intervention based on their view of what is best can lead to further conflicts—additional tension in decision-making.",
        difficulty: "medium",
      });
    }
  }

  // pass_02: Bronze Age Collapse
  if (passageId === "pass_02") {
    const q1 = spanFor(
      text,
      "It is now widely believed that a combination of environmental disaster disrupted trade and warfare created a domino effect."
    );
    if (q1) {
      questions.push({
        id: "inf_02_q1",
        passageId: "pass_02",
        questionText:
          "Identify the part of the text from which we can infer that historians no longer attribute the Bronze Age collapse to a single cause.",
        correctSpans: [q1],
        explanation:
          "The phrase 'a combination of environmental disaster disrupted trade and warfare' indicates multiple factors, not a single explanation.",
        difficulty: "easy",
      });
    }

    const q2 = spanFor(
      text,
      "Climate data indicates that a series of severe droughts occurred simultaneously which would have decimated agricultural output."
    );
    if (q2) {
      questions.push({
        id: "inf_02_q2",
        passageId: "pass_02",
        questionText:
          "Identify the part of the text from which we can infer that environmental factors contributed to the Bronze Age collapse.",
        correctSpans: [q2],
        explanation:
          "This sentence directly links severe droughts to decimated agricultural output, an environmental contribution to societal breakdown.",
        difficulty: "easy",
      });
    }
    const q3 = spanFor(
      text,
      "Early theories often focused entirely on military invasions specifically the migration of the Sea Peoples who were said to have ravaged the coastlines."
    );
    if (q3) {
      questions.push({
        id: "inf_02_q3",
        passageId: "pass_02",
        questionText:
          "Identify the part of the text from which we can infer that earlier historians emphasised invasion as the main cause.",
        correctSpans: [q3],
        explanation:
          "Early theories focused entirely on military invasions—contrasting with the multi-factor view that follows.",
        difficulty: "medium",
      });
    }
  }

  // pass_03: Antibiotic Resistance
  if (passageId === "pass_03") {
    const q1 = spanFor(
      text,
      "The overuse of antibiotics in agriculture and human medicine has undoubtedly accelerated this process."
    );
    if (q1) {
      questions.push({
        id: "inf_03_q1",
        passageId: "pass_03",
        questionText:
          "Identify the part of the text from which we can infer that human behaviour has made antibiotic resistance worse.",
        correctSpans: [q1],
        explanation:
          "Overuse in agriculture and medicine is human behaviour that has accelerated the development of resistance.",
        difficulty: "easy",
      });
    }

    const q2 = spanFor(
      text,
      "Scientists argue that strict stewardship programs must be implemented globally to preserve existing drugs."
    );
    if (q2) {
      questions.push({
        id: "inf_03_q2",
        passageId: "pass_03",
        questionText:
          "Identify the part of the text from which we can infer that experts believe coordinated action is needed to combat resistance.",
        correctSpans: [q2],
        explanation:
          "Strict stewardship programs implemented globally implies coordinated, international action is necessary.",
        difficulty: "medium",
      });
    }
    const q3 = spanFor(
      text,
      "While new antibiotics are being developed the pace of discovery is slow compared to the rate of bacterial evolution."
    );
    if (q3) {
      questions.push({
        id: "inf_03_q3",
        passageId: "pass_03",
        questionText:
          "Identify the part of the text from which we can infer that drug development is losing the race against resistance.",
        correctSpans: [q3],
        explanation:
          "The pace of discovery is slow compared to bacterial evolution—inferring that development lags behind.",
        difficulty: "medium",
      });
    }
  }

  // pass_04: Utilitarianism and Triage
  if (passageId === "pass_04") {
    const q1 = spanFor(
      text,
      "Those who are likely to survive without immediate care and those who are unlikely to survive even with maximal care are prioritised lower than those for whom immediate intervention will make the difference between life and death."
    );
    if (q1) {
      questions.push({
        id: "inf_04_q1",
        passageId: "pass_04",
        questionText:
          "Identify the part of the text from which we can infer how triage systems decide who receives treatment first.",
        correctSpans: [q1],
        explanation:
          "This sentence explains the prioritisation logic: patients for whom immediate care makes a difference are prioritised over those who will survive without it or those who will not survive regardless.",
        difficulty: "medium",
      });
    }
    const q2 = spanFor(
      text,
      "Critics of utilitarianism argue that this treats individuals merely as means to an end ignoring the inherent value of each human life."
    );
    if (q2) {
      questions.push({
        id: "inf_04_q2",
        passageId: "pass_04",
        questionText:
          "Identify the part of the text from which we can infer that triage is criticised for failing to respect the value of each life.",
        correctSpans: [q2],
        explanation:
          "Critics argue triage treats individuals as means to an end, ignoring the inherent value of each life.",
        difficulty: "hard",
      });
    }
  }

  // pass_06: Confidentiality in Adolescence
  if (passageId === "pass_06") {
    const q1 = spanFor(
      text,
      "If a clinician believes that a young patient is being abused or is in danger of serious injury they must breach confidentiality to protect the child."
    );
    if (q1) {
      questions.push({
        id: "inf_06_q1",
        passageId: "pass_06",
        questionText:
          "Identify the part of the text from which we can infer that confidentiality for minors is not absolute.",
        correctSpans: [q1],
        explanation:
          "The obligation to breach confidentiality when abuse or serious harm is suspected shows that confidentiality has limits.",
        difficulty: "medium",
      });
    }
    const q2 = spanFor(
      text,
      "While the duty of confidentiality is paramount it is never absolute."
    );
    if (q2) {
      questions.push({
        id: "inf_06_q2",
        passageId: "pass_06",
        questionText:
          "Identify the part of the text from which we can infer that confidentiality has limits even when it is highly valued.",
        correctSpans: [q2],
        explanation:
          "The duty is paramount but never absolute—directly stating that confidentiality has limits.",
        difficulty: "medium",
      });
    }
    const q3 = spanFor(
      text,
      "Some practitioners argue that breaking trust in these instances could deter adolescents from seeking help in the future."
    );
    if (q3) {
      questions.push({
        id: "inf_06_q3",
        passageId: "pass_06",
        questionText:
          "Identify the part of the text from which we can infer that breaching confidentiality may discourage young people from seeking care.",
        correctSpans: [q3],
        explanation:
          "Breaking trust could deter adolescents from seeking help—the inferred consequence of breaching confidentiality.",
        difficulty: "medium",
      });
    }
  }

  // pass_07: The Silk Road Trade
  if (passageId === "pass_07") {
    const q1 = spanFor(
      text,
      "The Silk Road was not a single thoroughfare but a vast network of trade routes connecting the East and West."
    );
    if (q1) {
      questions.push({
        id: "inf_07_q1",
        passageId: "pass_07",
        questionText:
          "Identify the part of the text from which we can infer that the Silk Road was a complex network rather than a single route.",
        correctSpans: [q1],
        explanation:
          "The opening sentence explicitly states it was not a single thoroughfare but a vast network of trade routes.",
        difficulty: "easy",
      });
    }
    const q2 = spanFor(
      text,
      "It facilitated the exchange of goods such as silk spices and precious metals but it also enabled the transmission of ideas technologies and diseases across vast distances."
    );
    if (q2) {
      questions.push({
        id: "inf_07_q2",
        passageId: "pass_07",
        questionText:
          "Identify the part of the text from which we can infer that the Silk Road had effects beyond trade in material goods.",
        correctSpans: [q2],
        explanation:
          "This sentence states that the Silk Road enabled the transmission of ideas, technologies, and diseases—not only goods.",
        difficulty: "medium",
      });
    }
    const q3 = spanFor(
      text,
      "Historians emphasize that the Silk Road was never static as routes shifted due to political instability and environmental changes."
    );
    if (q3) {
      questions.push({
        id: "inf_07_q3",
        passageId: "pass_07",
        questionText:
          "Identify the part of the text from which we can infer that the Silk Road's routes changed over time.",
        correctSpans: [q3],
        explanation:
          "The Silk Road was never static; routes shifted due to political instability and environmental changes.",
        difficulty: "medium",
      });
    }
  }

  // pass_08: Plate Tectonics and Volcanism
  if (passageId === "pass_08") {
    const q1 = spanFor(
      text,
      "Not all volcanoes occur at plate boundaries however. Some form over hot spots where a plume of hot mantle material rises through the crust."
    );
    if (q1) {
      questions.push({
        id: "inf_08_q1",
        passageId: "pass_08",
        questionText:
          "Identify the part of the text from which we can infer that volcanic activity can occur away from plate boundaries.",
        correctSpans: [q1],
        explanation:
          "The text states that not all volcanoes occur at plate boundaries and that some form over hot spots.",
        difficulty: "medium",
      });
    }
    const q2 = spanFor(
      text,
      "At divergent boundaries plates move apart allowing magma to rise and form new crust often creating mid ocean ridges."
    );
    if (q2) {
      questions.push({
        id: "inf_08_q2",
        passageId: "pass_08",
        questionText:
          "Identify the part of the text from which we can infer how new oceanic crust is formed.",
        correctSpans: [q2],
        explanation:
          "At divergent boundaries plates move apart, allowing magma to rise and form new crust—directly describing the mechanism.",
        difficulty: "medium",
      });
    }
    const q3 = spanFor(
      text,
      "The Hawaiian Islands are a classic example of this phenomenon."
    );
    if (q3) {
      questions.push({
        id: "inf_08_q3",
        passageId: "pass_08",
        questionText:
          "Identify the part of the text from which we can infer that volcanoes can form in the middle of a plate.",
        correctSpans: [q3],
        explanation:
          "The Hawaiian Islands are given as a classic example of hot-spot volcanism, which occurs away from plate boundaries.",
        difficulty: "easy",
      });
    }
  }

  // pass_09: Resource Allocation in Pandemics
  if (passageId === "pass_09") {
    const q1 = spanFor(
      text,
      "Some ethicists argue that a lottery system is the only truly fair method of allocation as it treats all individuals as equals regardless of their prognosis."
    );
    if (q1) {
      questions.push({
        id: "inf_09_q1",
        passageId: "pass_09",
        questionText:
          "Identify the part of the text from which we can infer that some ethicists reject prognosis-based allocation in favour of equality.",
        correctSpans: [q1],
        explanation:
          "A lottery treats everyone equally regardless of prognosis, contrasting with the utilitarian approach described earlier.",
        difficulty: "hard",
      });
    }
    const q2 = spanFor(
      text,
      "Transparency in decision making is crucial to maintain public trust."
    );
    if (q2) {
      questions.push({
        id: "inf_09_q2",
        passageId: "pass_09",
        questionText:
          "Identify the part of the text from which we can infer why allocation criteria must be made visible to the public.",
        correctSpans: [q2],
        explanation:
          "Transparency is stated as crucial to maintain public trust—the inferred reason for making criteria visible.",
        difficulty: "medium",
      });
    }
    const q3 = spanFor(
      text,
      "However this method can disadvantage certain groups such as the elderly or those with disabilities who might have a lower likelihood of survival."
    );
    if (q3) {
      questions.push({
        id: "inf_09_q3",
        passageId: "pass_09",
        questionText:
          "Identify the part of the text from which we can infer that utilitarian allocation may unfairly disadvantage some patients.",
        correctSpans: [q3],
        explanation:
          "This method can disadvantage the elderly or those with disabilities—directly stating who may be unfairly disadvantaged.",
        difficulty: "medium",
      });
    }
  }

  // pass_10: The Invention of the Printing Press
  if (passageId === "pass_10") {
    const q1 = spanFor(
      text,
      "Some historians argue that the scientific revolution would have been impossible without the ability to disseminate findings accurately."
    );
    if (q1) {
      questions.push({
        id: "inf_10_q1",
        passageId: "pass_10",
        questionText:
          "Identify the part of the text from which we can infer that historians link the printing press to the scientific revolution.",
        correctSpans: [q1],
        explanation:
          "The sentence states that the ability to disseminate findings accurately was necessary for the scientific revolution—a capability the press provided.",
        difficulty: "hard",
      });
    }
    const q2 = spanFor(
      text,
      "Governments often attempted to control the output of the press through censorship but the flow of information proved difficult to stem."
    );
    if (q2) {
      questions.push({
        id: "inf_10_q2",
        passageId: "pass_10",
        questionText:
          "Identify the part of the text from which we can infer that state censorship of the press was largely ineffective.",
        correctSpans: [q2],
        explanation:
          "The flow of information proved difficult to stem despite attempts at control—inferring ineffectiveness of censorship.",
        difficulty: "medium",
      });
    }
    const q3 = spanFor(
      text,
      "Before this innovation books were hand copied by scribes making them rare and expensive items for the elite."
    );
    if (q3) {
      questions.push({
        id: "inf_10_q3",
        passageId: "pass_10",
        questionText:
          "Identify the part of the text from which we can infer that before the press books were largely restricted to the wealthy.",
        correctSpans: [q3],
        explanation:
          "Books were rare and expensive items for the elite—inferring restriction to the wealthy.",
        difficulty: "easy",
      });
    }
  }

  // pass_11: Enzyme Specificity and Function
  if (passageId === "pass_11") {
    const q1 = spanFor(
      text,
      "However the induced fit model is now considered more accurate as it describes how the enzyme changes shape slightly to accommodate the substrate perfectly."
    );
    if (q1) {
      questions.push({
        id: "inf_11_q1",
        passageId: "pass_11",
        questionText:
          "Identify the part of the text from which we can infer that the lock and key model has been superseded by a more accurate model.",
        correctSpans: [q1],
        explanation:
          "The induced fit model is stated as now considered more accurate than the earlier lock and key model.",
        difficulty: "medium",
      });
    }
    const q2 = spanFor(
      text,
      "This specificity is determined by the unique three dimensional shape of the enzyme's active site."
    );
    if (q2) {
      questions.push({
        id: "inf_11_q2",
        passageId: "pass_11",
        questionText:
          "Identify the part of the text from which we can infer why each enzyme binds only to certain substrates.",
        correctSpans: [q2],
        explanation:
          "The unique three-dimensional shape of the active site determines specificity—directly explaining selective binding.",
        difficulty: "medium",
      });
    }
    const q3 = spanFor(
      text,
      "Enzymes are sensitive to their environment. Extreme temperatures or pH levels can denature the enzyme destroying its shape and rendering it functionless."
    );
    if (q3) {
      questions.push({
        id: "inf_11_q3",
        passageId: "pass_11",
        questionText:
          "Identify the part of the text from which we can infer why enzymes may stop working under harsh conditions.",
        correctSpans: [q3],
        explanation:
          "Extreme temperatures or pH can denature the enzyme, destroying its shape and rendering it functionless.",
        difficulty: "medium",
      });
    }
  }

  // pass_12: Genetic Modification of Embryos
  if (passageId === "pass_12") {
    const q1 = spanFor(
      text,
      "However critics fear that allowing therapeutic modifications could lead to a slippery slope towards eugenics."
    );
    if (q1) {
      questions.push({
        id: "inf_12_q1",
        passageId: "pass_12",
        questionText:
          "Identify the part of the text from which we can infer that opponents of germline editing worry about a slide from therapy to enhancement.",
        correctSpans: [q1],
        explanation:
          "The slippery slope towards eugenics implies a progression from therapeutic use to non-therapeutic selection—the critics' concern.",
        difficulty: "hard",
      });
    }
    const q2 = spanFor(
      text,
      "There is also the issue of consent as the future child cannot agree to the alteration."
    );
    if (q2) {
      questions.push({
        id: "inf_12_q2",
        passageId: "pass_12",
        questionText:
          "Identify the part of the text from which we can infer that embryo editing raises a consent problem for the person whose genome is changed.",
        correctSpans: [q2],
        explanation:
          "The future child cannot agree to the alteration—directly stating the consent issue for the affected individual.",
        difficulty: "medium",
      });
    }
    const q3 = spanFor(
      text,
      "Furthermore the long term effects of germline editing are unknown and unintended mutations could be passed down to future generations."
    );
    if (q3) {
      questions.push({
        id: "inf_12_q3",
        passageId: "pass_12",
        questionText:
          "Identify the part of the text from which we can infer that embryo editing could harm future generations.",
        correctSpans: [q3],
        explanation:
          "Unintended mutations could be passed down to future generations—directly stating potential harm to descendants.",
        difficulty: "medium",
      });
    }
  }

  // pass_13: The Great Fire of London
  if (passageId === "pass_13") {
    const q1 = spanFor(
      text,
      "The aftermath of the fire provided an opportunity for urban renewal."
    );
    if (q1) {
      questions.push({
        id: "inf_13_q1",
        passageId: "pass_13",
        questionText:
          "Identify the part of the text from which we can infer that the fire led to positive changes in the city's development.",
        correctSpans: [q1],
        explanation:
          "Urban renewal is a positive outcome; the sentence states the aftermath provided an opportunity for it.",
        difficulty: "medium",
      });
    }
    const q2 = spanFor(
      text,
      "Sir Christopher Wren proposed grand designs for a modern city but legal complications regarding property rights meant that much of the old street plan was preserved."
    );
    if (q2) {
      questions.push({
        id: "inf_13_q2",
        passageId: "pass_13",
        questionText:
          "Identify the part of the text from which we can infer why Wren's plans for London were not fully implemented.",
        correctSpans: [q2],
        explanation:
          "Legal complications regarding property rights are given as the reason much of the old street plan was preserved instead.",
        difficulty: "hard",
      });
    }
    const q3 = spanFor(
      text,
      "Miraculously the recorded death toll was surprisingly low though some historians suggest that the deaths of the poor may have gone unrecorded."
    );
    if (q3) {
      questions.push({
        id: "inf_13_q3",
        passageId: "pass_13",
        questionText:
          "Identify the part of the text from which we can infer that the true death toll may have been higher than official records.",
        correctSpans: [q3],
        explanation:
          "Some historians suggest the deaths of the poor may have gone unrecorded—inferring the true toll could be higher.",
        difficulty: "medium",
      });
    }
  }

  // pass_14: The Hydrological Cycle
  if (passageId === "pass_14") {
    const q1 = spanFor(
      text,
      "Solar energy drives the process by causing water to evaporate from oceans lakes and rivers transforming it into water vapour."
    );
    if (q1) {
      questions.push({
        id: "inf_14_q1",
        passageId: "pass_14",
        questionText:
          "Identify the part of the text from which we can infer what provides the energy for the hydrological cycle to operate.",
        correctSpans: [q1],
        explanation:
          "Solar energy is stated as what drives the process—directly identifying the energy source.",
        difficulty: "easy",
      });
    }
    const q2 = spanFor(
      text,
      "Climate change is also intensifying the cycle causing more severe droughts in some regions."
    );
    if (q2) {
      questions.push({
        id: "inf_14_q2",
        passageId: "pass_14",
        questionText:
          "Identify the part of the text from which we can infer that human-induced climate change is affecting the water cycle.",
        correctSpans: [q2],
        explanation:
          "Climate change is intensifying the cycle and causing more severe droughts—affecting the hydrological cycle.",
        difficulty: "medium",
      });
    }
    const q3 = spanFor(
      text,
      "However human activities are increasingly disrupting this balance."
    );
    if (q3) {
      questions.push({
        id: "inf_14_q3",
        passageId: "pass_14",
        questionText:
          "Identify the part of the text from which we can infer that the water cycle is being altered by human activity.",
        correctSpans: [q3],
        explanation:
          "Human activities are increasingly disrupting the balance of the cycle—directly stating alteration by humans.",
        difficulty: "medium",
      });
    }
  }

  // pass_15: Truth Telling in Oncology
  if (passageId === "pass_15") {
    const q1 = spanFor(
      text,
      "There are rare situations where therapeutic privilege might be invoked if the doctor believes that the information would cause serious psychological harm."
    );
    if (q1) {
      questions.push({
        id: "inf_15_q1",
        passageId: "pass_15",
        questionText:
          "Identify the part of the text from which we can infer that doctors may sometimes withhold the truth for the patient's psychological protection.",
        correctSpans: [q1],
        explanation:
          "Therapeutic privilege allows withholding information when it would cause serious psychological harm—the exception to full disclosure.",
        difficulty: "hard",
      });
    }
    const q2 = spanFor(
      text,
      "Some patients may explicitly request not to be told the details of their prognosis and in such cases the physician should respect this wish."
    );
    if (q2) {
      questions.push({
        id: "inf_15_q2",
        passageId: "pass_15",
        questionText:
          "Identify the part of the text from which we can infer that patient autonomy can override the default duty to disclose.",
        correctSpans: [q2],
        explanation:
          "When a patient requests not to be told, the physician should respect that wish—autonomy limiting disclosure.",
        difficulty: "medium",
      });
    }
    const q3 = spanFor(
      text,
      "Cultural differences also play a role as in some societies the family is the primary unit of decision making rather than the individual."
    );
    if (q3) {
      questions.push({
        id: "inf_15_q3",
        passageId: "pass_15",
        questionText:
          "Identify the part of the text from which we can infer that truth-telling practices may vary across cultures.",
        correctSpans: [q3],
        explanation:
          "Cultural differences play a role; in some societies the family rather than the individual is the decision-making unit—inferring variation in practice.",
        difficulty: "medium",
      });
    }
  }

  // pass_16: The Discovery of Penicillin
  if (passageId === "pass_16") {
    const q1 = spanFor(
      text,
      "Despite this success Fleming warned early on that bacteria could develop resistance to the drug if it was misused."
    );
    if (q1) {
      questions.push({
        id: "inf_16_q1",
        passageId: "pass_16",
        questionText:
          "Identify the part of the text from which we can infer that Fleming anticipated the problem of antibiotic resistance.",
        correctSpans: [q1],
        explanation:
          "Fleming warned that bacteria could develop resistance if the drug was misused—an early anticipation of the resistance problem.",
        difficulty: "medium",
      });
    }
    const q2 = spanFor(
      text,
      "Their work was driven by the urgent need for antibiotics during the Second World War."
    );
    if (q2) {
      questions.push({
        id: "inf_16_q2",
        passageId: "pass_16",
        questionText:
          "Identify the part of the text from which we can infer why Florey and Chain prioritised mass producing penicillin.",
        correctSpans: [q2],
        explanation:
          "The urgent need for antibiotics during the Second World War drove their work—the stated reason for mass production.",
        difficulty: "easy",
      });
    }
    const q3 = spanFor(
      text,
      "He observed that the bacteria surrounding the mould had been destroyed."
    );
    if (q3) {
      questions.push({
        id: "inf_16_q3",
        passageId: "pass_16",
        questionText:
          "Identify the part of the text from which we can infer that Fleming noticed the mould had an antibacterial effect.",
        correctSpans: [q3],
        explanation:
          "Fleming observed that bacteria surrounding the mould had been destroyed—the initial observation of the antibacterial effect.",
        difficulty: "easy",
      });
    }
  }

  // pass_05: The Industrial Revolution in Manchester
  if (passageId === "pass_05") {
    const q1 = spanFor(
      text,
      "Manchester is frequently cited as the first industrial city in the world serving as the archetype for the rapid urbanisation that characterized the nineteenth century."
    );
    if (q1) {
      questions.push({
        id: "inf_05_q1",
        passageId: "pass_05",
        questionText:
          "Identify the part of the text from which we can infer that Manchester became a model for industrial urbanisation.",
        correctSpans: [q1],
        explanation:
          "Manchester is cited as the first industrial city and the archetype for rapid urbanisation—the model for others.",
        difficulty: "easy",
      });
    }
    const q2 = spanFor(
      text,
      "This growth brought immense wealth to the factory owners but it also created dire living conditions for the working class."
    );
    if (q2) {
      questions.push({
        id: "inf_05_q2",
        passageId: "pass_05",
        questionText:
          "Identify the part of the text from which we can infer that industrialisation increased inequality between owners and workers.",
        correctSpans: [q2],
        explanation:
          "Wealth for factory owners contrasted with dire conditions for the working class—inferring increased inequality.",
        difficulty: "medium",
      });
    }
    const q3 = spanFor(
      text,
      "Labour unions began to form as workers realised that collective action was the only way to improve their lot."
    );
    if (q3) {
      questions.push({
        id: "inf_05_q3",
        passageId: "pass_05",
        questionText:
          "Identify the part of the text from which we can infer why workers turned to trade unions.",
        correctSpans: [q3],
        explanation:
          "Workers realised collective action was the only way to improve their lot—the stated reason for forming unions.",
        difficulty: "medium",
      });
    }
  }

  // pass_17: Black Holes and Event Horizons
  if (passageId === "pass_17") {
    const q1 = spanFor(
      text,
      "The boundary of no return is called the event horizon."
    );
    if (q1) {
      questions.push({
        id: "inf_17_q1",
        passageId: "pass_17",
        questionText:
          "Identify the part of the text from which we can infer the name for the point beyond which nothing can escape a black hole.",
        correctSpans: [q1],
        explanation:
          "The event horizon is defined as the boundary of no return—the point beyond which nothing escapes.",
        difficulty: "easy",
      });
    }
    const q2 = spanFor(
      text,
      "While the black hole itself is invisible its presence can be inferred by its interaction with other matter."
    );
    if (q2) {
      questions.push({
        id: "inf_17_q2",
        passageId: "pass_17",
        questionText:
          "Identify the part of the text from which we can infer that black holes are detected indirectly.",
        correctSpans: [q2],
        explanation:
          "The black hole is invisible but its presence can be inferred by interaction with other matter—indirect detection.",
        difficulty: "medium",
      });
    }
    const q3 = spanFor(
      text,
      "Stephen Hawking proposed that black holes emit radiation and can eventually evaporate over vast timescales."
    );
    if (q3) {
      questions.push({
        id: "inf_17_q3",
        passageId: "pass_17",
        questionText:
          "Identify the part of the text from which we can infer that black holes may not last forever.",
        correctSpans: [q3],
        explanation:
          "Hawking proposed that black holes can eventually evaporate—inferring they do not last forever.",
        difficulty: "medium",
      });
    }
  }

  // pass_18: Animal Testing in Research
  if (passageId === "pass_18") {
    const q1 = spanFor(
      text,
      "They point out that almost every major medical breakthrough has depended on animal research."
    );
    if (q1) {
      questions.push({
        id: "inf_18_q1",
        passageId: "pass_18",
        questionText:
          "Identify the part of the text from which we can infer that supporters of animal research cite its historical importance.",
        correctSpans: [q1],
        explanation:
          "Proponents point out that almost every major medical breakthrough has depended on animal research.",
        difficulty: "easy",
      });
    }
    const q2 = spanFor(
      text,
      "Opponents however contend that animals are sentient beings with an intrinsic right to life and that subjecting them to pain is morally indefensible."
    );
    if (q2) {
      questions.push({
        id: "inf_18_q2",
        passageId: "pass_18",
        questionText:
          "Identify the part of the text from which we can infer that opponents base their view on the moral status of animals.",
        correctSpans: [q2],
        explanation:
          "Opponents contend animals are sentient with an intrinsic right to life—the moral basis for their view.",
        difficulty: "medium",
      });
    }
    const q3 = spanFor(
      text,
      "The principle of the Three Rs Replacement Reduction and Refinement guides ethical oversight."
    );
    if (q3) {
      questions.push({
        id: "inf_18_q3",
        passageId: "pass_18",
        questionText:
          "Identify the part of the text from which we can infer that researchers are expected to minimise animal use and suffering.",
        correctSpans: [q3],
        explanation:
          "The Three Rs (Replacement, Reduction, Refinement) guide oversight—minimising use and suffering.",
        difficulty: "medium",
      });
    }
  }

  // pass_19: The Suffragette Movement
  if (passageId === "pass_19") {
    const q1 = spanFor(
      text,
      "In the early twentieth century the movement split into two main camps the suffragists who advocated for peaceful change and the suffragettes who adopted militant tactics."
    );
    if (q1) {
      questions.push({
        id: "inf_19_q1",
        passageId: "pass_19",
        questionText:
          "Identify the part of the text from which we can infer that the suffrage movement was divided over strategy.",
        correctSpans: [q1],
        explanation:
          "The movement split into two camps—peaceful suffragists vs militant suffragettes—division over strategy.",
        difficulty: "medium",
      });
    }
    const q2 = spanFor(
      text,
      "The outbreak of the First World War led to a suspension of militant activities as women joined the war effort."
    );
    if (q2) {
      questions.push({
        id: "inf_19_q2",
        passageId: "pass_19",
        questionText:
          "Identify the part of the text from which we can infer that the war changed the suffragettes' approach.",
        correctSpans: [q2],
        explanation:
          "The war led to a suspension of militant activities as women joined the war effort—a change in approach.",
        difficulty: "medium",
      });
    }
    const q3 = spanFor(
      text,
      "This contribution is often credited with shifting public opinion."
    );
    if (q3) {
      questions.push({
        id: "inf_19_q3",
        passageId: "pass_19",
        questionText:
          "Identify the part of the text from which we can infer why support for women's suffrage may have grown during the war.",
        correctSpans: [q3],
        explanation:
          "Women's contribution to the war effort is credited with shifting public opinion—inferring why support grew.",
        difficulty: "medium",
      });
    }
  }

  // pass_20: Desertification Processes
  if (passageId === "pass_20") {
    const q1 = spanFor(
      text,
      "Overgrazing is a major contributing factor as livestock remove the vegetation cover that protects the soil from erosion."
    );
    if (q1) {
      questions.push({
        id: "inf_20_q1",
        passageId: "pass_20",
        questionText:
          "Identify the part of the text from which we can infer how overgrazing leads to land degradation.",
        correctSpans: [q1],
        explanation:
          "Livestock remove vegetation that protects soil from erosion—the mechanism linking overgrazing to degradation.",
        difficulty: "medium",
      });
    }
    const q2 = spanFor(
      text,
      "Climate change exacerbates the problem by altering rainfall patterns and increasing evaporation rates."
    );
    if (q2) {
      questions.push({
        id: "inf_20_q2",
        passageId: "pass_20",
        questionText:
          "Identify the part of the text from which we can infer that climate change worsens desertification.",
        correctSpans: [q2],
        explanation:
          "Climate change exacerbates the problem by altering rainfall and evaporation—worsening desertification.",
        difficulty: "medium",
      });
    }
    const q3 = spanFor(
      text,
      "This process does not necessarily mean the expansion of existing deserts but rather the decline in the biological productivity of the land."
    );
    if (q3) {
      questions.push({
        id: "inf_20_q3",
        passageId: "pass_20",
        questionText:
          "Identify the part of the text from which we can infer that desertification is defined by loss of productivity rather than spreading sand.",
        correctSpans: [q3],
        explanation:
          "Desertification is the decline in biological productivity rather than expansion of deserts—the definition.",
        difficulty: "hard",
      });
    }
  }

  // pass_21: Mandatory Vaccination Ethics
  if (passageId === "pass_21") {
    const q1 = spanFor(text, "Mandatory vaccination programs are designed to achieve herd immunity which protects those who cannot be vaccinated for medical reasons.");
    if (q1) { questions.push({ id: "inf_21_q1", passageId: "pass_21", questionText: "Identify the part of the text from which we can infer why mandatory vaccination is said to protect some unvaccinated people.", correctSpans: [q1], explanation: "Herd immunity protects those who cannot be vaccinated for medical reasons.", difficulty: "medium", }); }
    const q2 = spanFor(text, "However libertarians argue that the state should never have the power to force a medical intervention upon a competent adult.");
    if (q2) { questions.push({ id: "inf_21_q2", passageId: "pass_21", questionText: "Identify the part of the text from which we can infer that some oppose mandates on grounds of bodily freedom.", correctSpans: [q2], explanation: "Libertarians argue the state should not force a medical intervention on a competent adult.", difficulty: "medium", }); }
    const q3 = spanFor(text, "The legitimacy depends on proportionality.");
    if (q3) { questions.push({ id: "inf_21_q3", passageId: "pass_21", questionText: "Identify the part of the text from which we can infer that the justification for mandates depends on the scale of the threat.", correctSpans: [q3], explanation: "Legitimacy depends on proportionality—the response must match the threat.", difficulty: "hard", }); }
  }

  // pass_22: The Mayan Civilisation
  if (passageId === "pass_22") {
    const q1 = spanFor(text, "Unlike the Aztec or Inca empires the Maya never formed a single unified state but were organized into a network of independent city states.");
    if (q1) { questions.push({ id: "inf_22_q1", passageId: "pass_22", questionText: "Identify the part of the text from which we can infer that the Maya were politically fragmented.", correctSpans: [q1], explanation: "The Maya never formed a single unified state but were independent city states.", difficulty: "medium", }); }
    const q2 = spanFor(text, "The reasons for this collapse include overpopulation environmental degradation and prolonged drought.");
    if (q2) { questions.push({ id: "inf_22_q2", passageId: "pass_22", questionText: "Identify the part of the text from which we can infer that scholars cite multiple causes for the Maya collapse.", correctSpans: [q2], explanation: "Overpopulation, environmental degradation, and prolonged drought are listed as reasons.", difficulty: "medium", }); }
    const q3 = spanFor(text, "Despite this collapse the Mayan people did not disappear.");
    if (q3) { questions.push({ id: "inf_22_q3", passageId: "pass_22", questionText: "Identify the part of the text from which we can infer that Maya culture survived the collapse.", correctSpans: [q3], explanation: "The Mayan people did not disappear—culture and people survived.", difficulty: "easy", }); }
  }

  // pass_23: Photosynthesis and Energy
  if (passageId === "pass_23") {
    const q1 = spanFor(text, "Oxygen is released as a byproduct which is essential for the survival of aerobic life forms.");
    if (q1) { questions.push({ id: "inf_23_q1", passageId: "pass_23", questionText: "Identify the part of the text from which we can infer that photosynthesis supplies oxygen for many living things.", correctSpans: [q1], explanation: "Oxygen is released as a byproduct and is essential for aerobic life.", difficulty: "easy", }); }
    const q2 = spanFor(text, "While photosynthesis is crucial for the plant it also serves as the foundation of the global food web.");
    if (q2) { questions.push({ id: "inf_23_q2", passageId: "pass_23", questionText: "Identify the part of the text from which we can infer that most life ultimately depends on photosynthesis.", correctSpans: [q2], explanation: "Photosynthesis is the foundation of the global food web.", difficulty: "medium", }); }
    const q3 = spanFor(text, "Furthermore photosynthesis plays a critical role in the carbon cycle by removing carbon dioxide from the atmosphere.");
    if (q3) { questions.push({ id: "inf_23_q3", passageId: "pass_23", questionText: "Identify the part of the text from which we can infer that photosynthesis reduces atmospheric CO2.", correctSpans: [q3], explanation: "Photosynthesis removes carbon dioxide from the atmosphere.", difficulty: "medium", }); }
  }

  // pass_24: Assisted Dying Debates
  if (passageId === "pass_24") {
    const q1 = spanFor(text, "Opponents however raise concerns about the potential for abuse. They fear that vulnerable individuals such as the elderly might feel pressured into ending their lives to avoid being a burden on their families.");
    if (q1) { questions.push({ id: "inf_24_q1", passageId: "pass_24", questionText: "Identify the part of the text from which we can infer that opponents worry about coercion of vulnerable people.", correctSpans: [q1], explanation: "Vulnerable individuals might feel pressured to end their lives to avoid being a burden.", difficulty: "medium", }); }
    const q2 = spanFor(text, "Jurisdictions that have legalized assisted dying usually implement strict safeguards to protect the vulnerable from coercion.");
    if (q2) { questions.push({ id: "inf_24_q2", passageId: "pass_24", questionText: "Identify the part of the text from which we can infer that legalisation is accompanied by protective measures.", correctSpans: [q2], explanation: "Strict safeguards are implemented to protect the vulnerable from coercion.", difficulty: "medium", }); }
    const q3 = spanFor(text, "Religious groups often oppose the practice on the grounds that life is a gift that should not be discarded.");
    if (q3) { questions.push({ id: "inf_24_q3", passageId: "pass_24", questionText: "Identify the part of the text from which we can infer why some religious groups oppose assisted dying.", correctSpans: [q3], explanation: "Life is a gift that should not be discarded—the religious objection.", difficulty: "easy", }); }
  }

  // pass_25: The Apollo 11 Mission
  if (passageId === "pass_25") {
    const q1 = spanFor(text, "The mission was the culmination of the Space Race between the United States and the Soviet Union.");
    if (q1) { questions.push({ id: "inf_25_q1", passageId: "pass_25", questionText: "Identify the part of the text from which we can infer that the Moon landing was the outcome of US-Soviet competition.", correctSpans: [q1], explanation: "The mission was the culmination of the Space Race between the US and USSR.", difficulty: "easy", }); }
    const q2 = spanFor(text, "Critics argued that the billions spent could have been better used to address social problems on Earth.");
    if (q2) { questions.push({ id: "inf_25_q2", passageId: "pass_25", questionText: "Identify the part of the text from which we can infer that the cost of Apollo was controversial.", correctSpans: [q2], explanation: "Critics argued the money could have been used for social problems.", difficulty: "medium", }); }
    const q3 = spanFor(text, "Nevertheless the legacy of Apollo 11 inspires scientists to this day demonstrating what can be achieved through collective effort.");
    if (q3) { questions.push({ id: "inf_25_q3", passageId: "pass_25", questionText: "Identify the part of the text from which we can infer that Apollo is still seen as a model of achievement.", correctSpans: [q3], explanation: "The legacy inspires scientists and demonstrates what collective effort can achieve.", difficulty: "medium", }); }
  }

  // pass_26: Consent in Paediatrics
  if (passageId === "pass_26") {
    const q1 = spanFor(text, "If a Gillick competent child refuses life saving treatment the courts or parents can often override this decision acting in the child's best interests.");
    if (q1) { questions.push({ id: "inf_26_q1", passageId: "pass_26", questionText: "Identify the part of the text from which we can infer that a competent child's refusal can be overridden.", correctSpans: [q1], explanation: "Courts or parents can override a competent child's refusal in the child's best interests.", difficulty: "medium", }); }
    const q2 = spanFor(text, "The law prioritises the preservation of life above the autonomy of a minor.");
    if (q2) { questions.push({ id: "inf_26_q2", passageId: "pass_26", questionText: "Identify the part of the text from which we can infer that the law favours life over a minor's choice.", correctSpans: [q2], explanation: "The law prioritises preservation of life above the autonomy of a minor.", difficulty: "medium", }); }
    const q3 = spanFor(text, "Soft paternalism is frequently employed where doctors and parents gently persuade the child to accept the necessary care.");
    if (q3) { questions.push({ id: "inf_26_q3", passageId: "pass_26", questionText: "Identify the part of the text from which we can infer that persuasion is preferred to forcing treatment.", correctSpans: [q3], explanation: "Soft paternalism involves gently persuading rather than forcing.", difficulty: "medium", }); }
  }

  // pass_27: The Fall of the Western Roman Empire
  if (passageId === "pass_27") {
    const q1 = spanFor(text, "However modern scholarship tends to emphasise a combination of external pressures and internal structural failures.");
    if (q1) { questions.push({ id: "inf_27_q1", passageId: "pass_27", questionText: "Identify the part of the text from which we can infer that historians now favour multiple causes for Rome's fall.", correctSpans: [q1], explanation: "Modern scholarship emphasises a combination of external and internal factors.", difficulty: "medium", }); }
    const q2 = spanFor(text, "The migration of Germanic tribes such as the Visigoths and Vandals overwhelmed the Roman frontiers which were already poorly defended due to a lack of manpower and funds.");
    if (q2) { questions.push({ id: "inf_27_q2", passageId: "pass_27", questionText: "Identify the part of the text from which we can infer that the empire was militarily weakened before invasions.", correctSpans: [q2], explanation: "Frontiers were already poorly defended due to lack of manpower and funds.", difficulty: "hard", }); }
    const q3 = spanFor(text, "It is likely that no single cause was responsible but rather a perfect storm of military economic and political crises.");
    if (q3) { questions.push({ id: "inf_27_q3", passageId: "pass_27", questionText: "Identify the part of the text from which we can infer that the collapse resulted from several factors together.", correctSpans: [q3], explanation: "No single cause but a perfect storm of military, economic, and political crises.", difficulty: "medium", }); }
  }

  // pass_28: Ocean Acidification
  if (passageId === "pass_28") {
    const q1 = spanFor(text, "The ocean acts as a massive carbon sink absorbing approximately one quarter of the CO2 emitted by human activities.");
    if (q1) { questions.push({ id: "inf_28_q1", passageId: "pass_28", questionText: "Identify the part of the text from which we can infer that the ocean absorbs a large share of human CO2.", correctSpans: [q1], explanation: "The ocean absorbs approximately one quarter of human-emitted CO2.", difficulty: "easy", }); }
    const q2 = spanFor(text, "When CO2 dissolves in seawater it forms carbonic acid which lowers the pH of the water making it more acidic.");
    if (q2) { questions.push({ id: "inf_28_q2", passageId: "pass_28", questionText: "Identify the part of the text from which we can infer the chemical mechanism that makes the ocean more acidic.", correctSpans: [q2], explanation: "CO2 forms carbonic acid, which lowers pH.", difficulty: "medium", }); }
    const q3 = spanFor(text, "the rate of acidification is currently faster than any event in the last 300 million years.");
    if (q3) { questions.push({ id: "inf_28_q3", passageId: "pass_28", questionText: "Identify the part of the text from which we can infer that current acidification is unprecedented in scale.", correctSpans: [q3], explanation: "Faster than any event in the last 300 million years—unprecedented.", difficulty: "medium", }); }
  }

  // pass_29: Opt Out Organ Donation
  if (passageId === "pass_29") {
    const q1 = spanFor(text, "Consequently many countries including parts of the UK have shifted to a deemed consent or opt out system where every adult is presumed to be a donor unless they have recorded a decision to the contrary.");
    if (q1) { questions.push({ id: "inf_29_q1", passageId: "pass_29", questionText: "Identify the part of the text from which we can infer how an opt-out system works.", correctSpans: [q1], explanation: "Every adult is presumed a donor unless they have recorded a decision to the contrary.", difficulty: "medium", }); }
    const q2 = spanFor(text, "Critics however contend that deemed consent undermines the fundamental principle of bodily autonomy.");
    if (q2) { questions.push({ id: "inf_29_q2", passageId: "pass_29", questionText: "Identify the part of the text from which we can infer why some oppose opt-out donation.", correctSpans: [q2], explanation: "Deemed consent undermines bodily autonomy—the critics' objection.", difficulty: "medium", }); }
    const q3 = spanFor(text, "The success of such systems depends heavily on public trust and effective communication.");
    if (q3) { questions.push({ id: "inf_29_q3", passageId: "pass_29", questionText: "Identify the part of the text from which we can infer what opt-out systems need to work well.", correctSpans: [q3], explanation: "Success depends on public trust and effective communication.", difficulty: "easy", }); }
  }

  // pass_30: The Meiji Restoration
  if (passageId === "pass_30") {
    const q1 = spanFor(text, "Before this event Japan had effectively isolated itself from the rest of the world for over two centuries under the sakoku policy.");
    if (q1) { questions.push({ id: "inf_30_q1", passageId: "pass_30", questionText: "Identify the part of the text from which we can infer that Japan was closed to the world before the Meiji period.", correctSpans: [q1], explanation: "Japan had isolated itself for over two centuries under sakoku.", difficulty: "easy", }); }
    const q2 = spanFor(text, "The slogan rich country strong army guided national policy as Japan sought to establish itself as a global power.");
    if (q2) { questions.push({ id: "inf_30_q2", passageId: "pass_30", questionText: "Identify the part of the text from which we can infer the main aim of Meiji policy.", correctSpans: [q2], explanation: "Rich country, strong army—economic and military strength as national goals.", difficulty: "medium", }); }
    const q3 = spanFor(text, "By the early twentieth century Japan had transformed from a secluded feudal society into a modern industrial empire capable of defeating a European power in the Russo Japanese War.");
    if (q3) { questions.push({ id: "inf_30_q3", passageId: "pass_30", questionText: "Identify the part of the text from which we can infer that Japan's modernisation was rapid and successful.", correctSpans: [q3], explanation: "Transformed into a modern industrial empire capable of defeating a European power.", difficulty: "medium", }); }
  }

  // pass_31: The Human Genome Project
  if (passageId === "pass_31") {
    const q1 = spanFor(text, "One of the most significant outcomes is the field of pharmacogenomics which studies how genes affect a person's response to drugs.");
    if (q1) { questions.push({ id: "inf_31_q1", passageId: "pass_31", questionText: "Identify the part of the text from which we can infer that the project enabled drug response to be studied via genetics.", correctSpans: [q1], explanation: "Pharmacogenomics studies how genes affect response to drugs.", difficulty: "medium", }); }
    const q2 = spanFor(text, "The number of genes was found to be lower than expected suggesting that gene regulation and environmental factors play a much larger role.");
    if (q2) { questions.push({ id: "inf_31_q2", passageId: "pass_31", questionText: "Identify the part of the text from which we can infer that the genome surprised scientists by having fewer genes.", correctSpans: [q2], explanation: "The number of genes was lower than expected.", difficulty: "medium", }); }
    const q3 = spanFor(text, "While the complete sequence is now available the function of many parts of the genome remains unknown.");
    if (q3) { questions.push({ id: "inf_31_q3", passageId: "pass_31", questionText: "Identify the part of the text from which we can infer that mapping the sequence did not explain everything.", correctSpans: [q3], explanation: "The function of many parts of the genome remains unknown.", difficulty: "easy", }); }
  }

  // pass_32: Euthanasia in Dementia
  if (passageId === "pass_32") {
    const q1 = spanFor(text, "Unlike patients with physical terminal illnesses those with dementia often lose capacity long before they reach the terminal phase.");
    if (q1) { questions.push({ id: "inf_32_q1", passageId: "pass_32", questionText: "Identify the part of the text from which we can infer why advance directives are especially difficult in dementia.", correctSpans: [q1], explanation: "Dementia patients lose capacity long before the terminal phase.", difficulty: "hard", }); }
    const q2 = spanFor(text, "However when that stage is reached the patient may appear content. Opponents argue that carrying out euthanasia in such cases violates the current interests of the patient.");
    if (q2) { questions.push({ id: "inf_32_q2", passageId: "pass_32", questionText: "Identify the part of the text from which we can infer that opponents appeal to the patient's current state.", correctSpans: [q2], explanation: "The patient may appear content; opponents say euthanasia violates current interests.", difficulty: "hard", }); }
    const q3 = spanFor(text, "Proponents conversely argue that the right to self determination extends to one's future self.");
    if (q3) { questions.push({ id: "inf_32_q3", passageId: "pass_32", questionText: "Identify the part of the text from which we can infer that supporters appeal to prior wishes.", correctSpans: [q3], explanation: "Self-determination extends to one's future self—prior wishes count.", difficulty: "medium", }); }
  }

  // pass_33: The French Revolution
  if (passageId === "pass_33") {
    const q1 = spanFor(text, "While the chaos eventually led to the rise of Napoleon Bonaparte the revolution succeeded in establishing the principle of popular sovereignty.");
    if (q1) { questions.push({ id: "inf_33_q1", passageId: "pass_33", questionText: "Identify the part of the text from which we can infer that the revolution had a lasting constitutional legacy.", correctSpans: [q1], explanation: "The revolution established the principle of popular sovereignty.", difficulty: "medium", }); }
    const q2 = spanFor(text, "It demonstrated that the power of the state is derived from the people not from divine right.");
    if (q2) { questions.push({ id: "inf_33_q2", passageId: "pass_33", questionText: "Identify the part of the text from which we can infer how the revolution challenged monarchical legitimacy.", correctSpans: [q2], explanation: "Power is derived from the people, not divine right.", difficulty: "medium", }); }
    const q3 = spanFor(text, "However the initial idealism soon descended into the Reign of Terror led by Robespierre.");
    if (q3) { questions.push({ id: "inf_33_q3", passageId: "pass_33", questionText: "Identify the part of the text from which we can infer that the revolution turned violent and repressive.", correctSpans: [q3], explanation: "Initial idealism descended into the Reign of Terror.", difficulty: "easy", }); }
  }

  // pass_34: Dark Matter and Energy
  if (passageId === "pass_34") {
    const q1 = spanFor(text, "Its existence is inferred solely from its gravitational effects on visible matter such as the rotation speeds of galaxies.");
    if (q1) { questions.push({ id: "inf_34_q1", passageId: "pass_34", questionText: "Identify the part of the text from which we can infer that dark matter is detected indirectly.", correctSpans: [q1], explanation: "Existence is inferred solely from gravitational effects.", difficulty: "medium", }); }
    const q2 = spanFor(text, "This discovery in the late 1990s overturned the previous assumption that the expansion of the universe was slowing down.");
    if (q2) { questions.push({ id: "inf_34_q2", passageId: "pass_34", questionText: "Identify the part of the text from which we can infer that scientists' view of cosmic expansion changed recently.", correctSpans: [q2], explanation: "Discovery in the late 1990s overturned the assumption that expansion was slowing.", difficulty: "medium", }); }
    const q3 = spanFor(text, "Dark energy appears to be a repulsive force that is driving the accelerated expansion of the universe.");
    if (q3) { questions.push({ id: "inf_34_q3", passageId: "pass_34", questionText: "Identify the part of the text from which we can infer what role dark energy plays in the universe.", correctSpans: [q3], explanation: "A repulsive force driving accelerated expansion.", difficulty: "medium", }); }
  }

  // pass_35: Allocating Scarce Organs
  if (passageId === "pass_35") {
    const q1 = spanFor(text, "The utilitarian approach favours allocating organs to patients who will derive the greatest benefit. This often means prioritising younger healthier patients over those with comorbidities or a history of transplant rejection.");
    if (q1) { questions.push({ id: "inf_35_q1", passageId: "pass_35", questionText: "Identify the part of the text from which we can infer who tends to be prioritised under a utilitarian allocation system.", correctSpans: [q1], explanation: "Younger, healthier patients over those with comorbidities or rejection history.", difficulty: "medium", }); }
    const q2 = spanFor(text, "Alternatively the egalitarian approach emphasises fairness and the equal value of all lives.");
    if (q2) { questions.push({ id: "inf_35_q2", passageId: "pass_35", questionText: "Identify the part of the text from which we can infer that some systems prioritise fairness over outcomes.", correctSpans: [q2], explanation: "Egalitarian approach emphasises fairness and equal value of all lives.", difficulty: "medium", }); }
    const q3 = spanFor(text, "The decision making process must always remain transparent to maintain public confidence in the system and encourage future donation.");
    if (q3) { questions.push({ id: "inf_35_q3", passageId: "pass_35", questionText: "Identify the part of the text from which we can infer why transparency in allocation matters.", correctSpans: [q3], explanation: "Transparency maintains public confidence and encourages future donation.", difficulty: "medium", }); }
  }

  // pass_36 to pass_55: compact blocks (3 questions each)
  if (passageId === "pass_36") {
    const q1 = spanFor(text, "The doctrine of Mutually Assured Destruction or MAD likely prevented a direct military confrontation.");
    if (q1) { questions.push({ id: "inf_36_q1", passageId: "pass_36", questionText: "Identify the part of the text from which we can infer why the superpowers avoided direct war.", correctSpans: [q1], explanation: "MAD likely prevented direct military confrontation.", difficulty: "medium", }); }
    const q2 = spanFor(text, "Instead it was fought through proxy wars and espionage.");
    if (q2) { questions.push({ id: "inf_36_q2", passageId: "pass_36", questionText: "Identify the part of the text from which we can infer how the Cold War was waged.", correctSpans: [q2], explanation: "Fought through proxy wars and espionage.", difficulty: "easy", }); }
    const q3 = spanFor(text, "The collapse of the Berlin Wall symbolised the end of the conflict.");
    if (q3) { questions.push({ id: "inf_36_q3", passageId: "pass_36", questionText: "Identify the part of the text from which we can infer what event marked the end of the Cold War.", correctSpans: [q3], explanation: "The Berlin Wall collapse symbolised the end.", difficulty: "easy", }); }
  }
  if (passageId === "pass_37") {
    const q1 = spanFor(text, "Einstein famously referred to this as spooky action at a distance.");
    if (q1) { questions.push({ id: "inf_37_q1", passageId: "pass_37", questionText: "Identify the part of the text from which we can infer that entanglement puzzled Einstein.", correctSpans: [q1], explanation: "Einstein called it spooky action at a distance.", difficulty: "easy", }); }
    const q2 = spanFor(text, "This suggests that information can be correlated faster than the speed of light although it does not allow for faster than light communication.");
    if (q2) { questions.push({ id: "inf_37_q2", passageId: "pass_37", questionText: "Identify the part of the text from which we can infer that entanglement does not enable faster-than-light messaging.", correctSpans: [q2], explanation: "Does not allow for faster than light communication.", difficulty: "hard", }); }
    const q3 = spanFor(text, "Furthermore quantum cryptography utilises entanglement to create unbreakable channels.");
    if (q3) { questions.push({ id: "inf_37_q3", passageId: "pass_37", questionText: "Identify the part of the text from which we can infer a practical use of entanglement.", correctSpans: [q3], explanation: "Quantum cryptography uses entanglement for unbreakable channels.", difficulty: "medium", }); }
  }
  if (passageId === "pass_38") {
    const q1 = spanFor(text, "The SPIKES protocol is a widely taught framework designed to guide doctors through this process.");
    if (q1) { questions.push({ id: "inf_38_q1", passageId: "pass_38", questionText: "Identify the part of the text from which we can infer that there is a standard method for breaking bad news.", correctSpans: [q1], explanation: "SPIKES is a widely taught framework for the process.", difficulty: "easy", }); }
    const q2 = spanFor(text, "Research shows that the way bad news is delivered can have a lasting impact on the patient's psychological adjustment.");
    if (q2) { questions.push({ id: "inf_38_q2", passageId: "pass_38", questionText: "Identify the part of the text from which we can infer why delivery of bad news matters.", correctSpans: [q2], explanation: "Delivery has a lasting impact on psychological adjustment.", difficulty: "medium", }); }
    const q3 = spanFor(text, "Validating these emotions is essential for maintaining the therapeutic relationship and trust.");
    if (q3) { questions.push({ id: "inf_38_q3", passageId: "pass_38", questionText: "Identify the part of the text from which we can infer that acknowledging the patient's reaction is important.", correctSpans: [q3], explanation: "Validating emotions is essential for relationship and trust.", difficulty: "medium", }); }
  }
  if (passageId === "pass_39") {
    const q1 = spanFor(text, "The First Opium War was triggered by China's attempt to suppress the opium trade which Britain had used to balance its trade deficit.");
    if (q1) { questions.push({ id: "inf_39_q1", passageId: "pass_39", questionText: "Identify the part of the text from which we can infer why Britain promoted the opium trade.", correctSpans: [q1], explanation: "Britain used the opium trade to balance its trade deficit.", difficulty: "medium", }); }
    const q2 = spanFor(text, "The resulting Treaty of Nanking was the first of the Unequal Treaties.");
    if (q2) { questions.push({ id: "inf_39_q2", passageId: "pass_39", questionText: "Identify the part of the text from which we can infer that the treaty was imposed on China.", correctSpans: [q2], explanation: "First of the Unequal Treaties—imposed and one-sided.", difficulty: "medium", }); }
    const q3 = spanFor(text, "They marked the beginning of the Century of Humiliation a period of foreign imperialism and internal chaos that would eventually lead to the fall of the imperial system.");
    if (q3) { questions.push({ id: "inf_39_q3", passageId: "pass_39", questionText: "Identify the part of the text from which we can infer the long-term significance of the wars for China.", correctSpans: [q3], explanation: "Beginning of Century of Humiliation and path to fall of imperial system.", difficulty: "medium", }); }
  }
  if (passageId === "pass_40") {
    const q1 = spanFor(text, "However the use of embryonic stem cells is ethically controversial because obtaining them involves the destruction of a human embryo.");
    if (q1) { questions.push({ id: "inf_40_q1", passageId: "pass_40", questionText: "Identify the part of the text from which we can infer why embryonic stem cell research is contested.", correctSpans: [q1], explanation: "Obtaining them involves destruction of a human embryo.", difficulty: "medium", }); }
    const q2 = spanFor(text, "Recent advances in induced pluripotent stem cells offer a potential solution.");
    if (q2) { questions.push({ id: "inf_40_q2", passageId: "pass_40", questionText: "Identify the part of the text from which we can infer that an alternative may avoid the ethical problem.", correctSpans: [q2], explanation: "iPSCs offer a potential solution—alternative to embryonic.", difficulty: "medium", }); }
    const q3 = spanFor(text, "These are adult cells that have been genetically reprogrammed to an embryonic stem cell like state.");
    if (q3) { questions.push({ id: "inf_40_q3", passageId: "pass_40", questionText: "Identify the part of the text from which we can infer how iPSCs are produced.", correctSpans: [q3], explanation: "Adult cells genetically reprogrammed to embryonic-like state.", difficulty: "medium", }); }
  }
  if (passageId === "pass_41") {
    const q1 = spanFor(text, "If this data were accessed by third parties it could lead to genetic discrimination by employers or insurers.");
    if (q1) { questions.push({ id: "inf_41_q1", passageId: "pass_41", questionText: "Identify the part of the text from which we can infer a risk of genetic data misuse.", correctSpans: [q1], explanation: "Could lead to genetic discrimination by employers or insurers.", difficulty: "medium", }); }
    const q2 = spanFor(text, "There is also the issue of forensic genealogy where law enforcement uses public DNA databases to solve crimes.");
    if (q2) { questions.push({ id: "inf_41_q2", passageId: "pass_41", questionText: "Identify the part of the text from which we can infer that police use DNA databases in investigations.", correctSpans: [q2], explanation: "Forensic genealogy uses public DNA databases to solve crimes.", difficulty: "easy", }); }
    const q3 = spanFor(text, "Furthermore the anonymisation of genetic data is becoming increasingly difficult as studies show it is often possible to re identify individuals using cross referencing techniques.");
    if (q3) { questions.push({ id: "inf_41_q3", passageId: "pass_41", questionText: "Identify the part of the text from which we can infer that genetic data may not stay anonymous.", correctSpans: [q3], explanation: "Re-identification is often possible via cross-referencing.", difficulty: "medium", }); }
  }
  if (passageId === "pass_42") {
    const q1 = spanFor(text, "The sudden shortage of labour shifted the balance of power from the landowners to the peasantry.");
    if (q1) { questions.push({ id: "inf_42_q1", passageId: "pass_42", questionText: "Identify the part of the text from which we can infer that the Black Death improved workers' bargaining power.", correctSpans: [q1], explanation: "Shortage of labour shifted power from landowners to peasantry.", difficulty: "medium", }); }
    const q2 = spanFor(text, "It eventually contributed to the end of feudalism.");
    if (q2) { questions.push({ id: "inf_42_q2", passageId: "pass_42", questionText: "Identify the part of the text from which we can infer a long-term social effect of the plague.", correctSpans: [q2], explanation: "Contributed to the end of feudalism.", difficulty: "medium", }); }
    const q3 = spanFor(text, "In addition the plague spurred developments in medicine as physicians sought to understand the disease leading to the first primitive forms of quarantine.");
    if (q3) { questions.push({ id: "inf_42_q3", passageId: "pass_42", questionText: "Identify the part of the text from which we can infer that the plague led to early public health measures.", correctSpans: [q3], explanation: "Led to first primitive forms of quarantine.", difficulty: "medium", }); }
  }
  if (passageId === "pass_43") {
    const q1 = spanFor(text, "Expectations play a crucial role as the brain may release endorphins that actually reduce pain if the patient believes the treatment will work.");
    if (q1) { questions.push({ id: "inf_43_q1", passageId: "pass_43", questionText: "Identify the part of the text from which we can infer a biological mechanism for the placebo effect.", correctSpans: [q1], explanation: "Brain may release endorphins that reduce pain when the patient believes.", difficulty: "medium", }); }
    const q2 = spanFor(text, "Prescribing a placebo involves a level of deception which violates the principle of informed consent.");
    if (q2) { questions.push({ id: "inf_43_q2", passageId: "pass_43", questionText: "Identify the part of the text from which we can infer an ethical objection to placebos.", correctSpans: [q2], explanation: "Involves deception and violates informed consent.", difficulty: "medium", }); }
    const q3 = spanFor(text, "However some studies suggest that open label placebos where the patient knows they are taking a dummy pill can still be effective.");
    if (q3) { questions.push({ id: "inf_43_q3", passageId: "pass_43", questionText: "Identify the part of the text from which we can infer that placebos may work even without deception.", correctSpans: [q3], explanation: "Open-label placebos can still be effective.", difficulty: "hard", }); }
  }
  if (passageId === "pass_44") {
    const q1 = spanFor(text, "Critics argue that vulnerable populations may be coerced into participating due to a lack of other healthcare options.");
    if (q1) { questions.push({ id: "inf_44_q1", passageId: "pass_44", questionText: "Identify the part of the text from which we can infer an exploitation risk in offshored trials.", correctSpans: [q1], explanation: "Vulnerable populations may be coerced due to lack of healthcare options.", difficulty: "medium", }); }
    const q2 = spanFor(text, "It is often the case that the drugs tested in these regions are too expensive for the local population to afford once they are approved.");
    if (q2) { questions.push({ id: "inf_44_q2", passageId: "pass_44", questionText: "Identify the part of the text from which we can infer a problem with post-trial access to drugs.", correctSpans: [q2], explanation: "Drugs tested are too expensive for local population once approved.", difficulty: "medium", }); }
    const q3 = spanFor(text, "Ethical guidelines state that research populations should benefit from the results of the study but enforcement is often weak in some areas.");
    if (q3) { questions.push({ id: "inf_44_q3", passageId: "pass_44", questionText: "Identify the part of the text from which we can infer that ethical rules are not always enforced.", correctSpans: [q3], explanation: "Enforcement is often weak in some areas.", difficulty: "medium", }); }
  }
  if (passageId === "pass_45") {
    const q1 = spanFor(text, "It began in Italy specifically in Florence where wealthy patrons funded artists.");
    if (q1) { questions.push({ id: "inf_45_q1", passageId: "pass_45", questionText: "Identify the part of the text from which we can infer where and how the Renaissance was funded.", correctSpans: [q1], explanation: "Florence; wealthy patrons funded artists.", difficulty: "easy", }); }
    const q2 = spanFor(text, "In science the period marked a move towards observation and experimentation challenging the dogmatic reliance on ancient authorities.");
    if (q2) { questions.push({ id: "inf_45_q2", passageId: "pass_45", questionText: "Identify the part of the text from which we can infer that the Renaissance challenged traditional science.", correctSpans: [q2], explanation: "Move towards observation and experimentation; challenging ancient authorities.", difficulty: "medium", }); }
    const q3 = spanFor(text, "While the Renaissance was primarily an elite movement its influence eventually filtered down to all levels of society.");
    if (q3) { questions.push({ id: "inf_45_q3", passageId: "pass_45", questionText: "Identify the part of the text from which we can infer that the Renaissance spread beyond the elite.", correctSpans: [q3], explanation: "Influence eventually filtered down to all levels of society.", difficulty: "medium", }); }
  }
  if (passageId === "pass_46") {
    const q1 = spanFor(text, "These vaccines instruct cells to produce a protein that triggers an immune response rather than introducing the virus itself.");
    if (q1) { questions.push({ id: "inf_46_q1", passageId: "pass_46", questionText: "Identify the part of the text from which we can infer how mRNA vaccines differ from traditional vaccines.", correctSpans: [q1], explanation: "Instruct cells to produce a protein rather than introducing the virus.", difficulty: "medium", }); }
    const q2 = spanFor(text, "Achieving herd immunity is essential to protect those who cannot be vaccinated.");
    if (q2) { questions.push({ id: "inf_46_q2", passageId: "pass_46", questionText: "Identify the part of the text from which we can infer why high vaccination coverage is important.", correctSpans: [q2], explanation: "Herd immunity protects those who cannot be vaccinated.", difficulty: "easy", }); }
    const q3 = spanFor(text, "Despite scientific success vaccine hesitancy remains a significant hurdle.");
    if (q3) { questions.push({ id: "inf_46_q3", passageId: "pass_46", questionText: "Identify the part of the text from which we can infer that public acceptance is a current challenge.", correctSpans: [q3], explanation: "Vaccine hesitancy remains a significant hurdle.", difficulty: "easy", }); }
  }
  if (passageId === "pass_47") {
    const q1 = spanFor(text, "The ethical standard is typically the substituted judgment standard which requires following the patient's values.");
    if (q1) { questions.push({ id: "inf_47_q1", passageId: "pass_47", questionText: "Identify the part of the text from which we can infer what standard guides surrogate decisions.", correctSpans: [q1], explanation: "Substituted judgment requires following the patient's values.", difficulty: "medium", }); }
    const q2 = spanFor(text, "In cases where the patient's wishes are unknown the best interest standard is used instead.");
    if (q2) { questions.push({ id: "inf_47_q2", passageId: "pass_47", questionText: "Identify the part of the text from which we can infer the fallback when the patient's wishes are unknown.", correctSpans: [q2], explanation: "Best interest standard is used when wishes are unknown.", difficulty: "medium", }); }
    const q3 = spanFor(text, "This highlights the vital need for clear communication and advance care planning before capacity is lost by the patient.");
    if (q3) { questions.push({ id: "inf_47_q3", passageId: "pass_47", questionText: "Identify the part of the text from which we can infer why advance care planning is recommended.", correctSpans: [q3], explanation: "Clear communication and advance planning before capacity is lost.", difficulty: "medium", }); }
  }
  if (passageId === "pass_48") {
    const q1 = spanFor(text, "The partition was based on religious lines creating significant displacement.");
    if (q1) { questions.push({ id: "inf_48_q1", passageId: "pass_48", questionText: "Identify the part of the text from which we can infer why partition caused mass migration.", correctSpans: [q1], explanation: "Based on religious lines—creating displacement.", difficulty: "medium", }); }
    const q2 = spanFor(text, "The partition also left the issue of Kashmir unresolved leading to decades of conflict and multiple wars between the two nations.");
    if (q2) { questions.push({ id: "inf_48_q2", passageId: "pass_48", questionText: "Identify the part of the text from which we can infer a lasting consequence of partition.", correctSpans: [q2], explanation: "Kashmir unresolved—decades of conflict and wars.", difficulty: "medium", }); }
    const q3 = spanFor(text, "It serves as a stark reminder of the catastrophic consequences of poorly managed and hasty decolonisation.");
    if (q3) { questions.push({ id: "inf_48_q3", passageId: "pass_48", questionText: "Identify the part of the text from which we can infer the passage's conclusion about how decolonisation was done.", correctSpans: [q3], explanation: "Catastrophic consequences of poorly managed and hasty decolonisation.", difficulty: "hard", }); }
  }
  if (passageId === "pass_49") {
    const q1 = spanFor(text, "Neuroplasticity also plays a crucial role in recovery from stroke. Through rehabilitation patients can retrain undamaged parts of the brain to take over functions previously managed by damaged areas.");
    if (q1) { questions.push({ id: "inf_49_q1", passageId: "pass_49", questionText: "Identify the part of the text from which we can infer how stroke recovery can occur.", correctSpans: [q1], explanation: "Retrain undamaged parts to take over functions of damaged areas.", difficulty: "medium", }); }
    const q2 = spanFor(text, "However plasticity can also be maladaptive in certain conditions like chronic tinnitus where the brain rewires itself in a way that causes suffering.");
    if (q2) { questions.push({ id: "inf_49_q2", passageId: "pass_49", questionText: "Identify the part of the text from which we can infer that brain rewiring can be harmful.", correctSpans: [q2], explanation: "Plasticity can be maladaptive and cause suffering.", difficulty: "medium", }); }
    const q3 = spanFor(text, "For a long time it was believed that the adult brain was a static organ unable to generate new neurons.");
    if (q3) { questions.push({ id: "inf_49_q3", passageId: "pass_49", questionText: "Identify the part of the text from which we can infer the old view that neuroplasticity overturned.", correctSpans: [q3], explanation: "Adult brain was believed static and unable to generate new neurons.", difficulty: "easy", }); }
  }
  if (passageId === "pass_50") {
    const q1 = spanFor(text, "However the use of AI raises significant ethical and liability issues such as the black box problem where the algorithm's reasoning is opaque.");
    if (q1) { questions.push({ id: "inf_50_q1", passageId: "pass_50", questionText: "Identify the part of the text from which we can infer why doctors may distrust AI diagnosis.", correctSpans: [q1], explanation: "Black box problem—algorithm's reasoning is opaque.", difficulty: "medium", }); }
    const q2 = spanFor(text, "There is also the risk of algorithmic bias if the AI is trained on data that is not representative of the diverse patient population.");
    if (q2) { questions.push({ id: "inf_50_q2", passageId: "pass_50", questionText: "Identify the part of the text from which we can infer that AI can perpetuate inequality.", correctSpans: [q2], explanation: "Algorithmic bias if data is not representative.", difficulty: "medium", }); }
    const q3 = spanFor(text, "The goal is to support clinicians rather than replace their vital judgment.");
    if (q3) { questions.push({ id: "inf_50_q3", passageId: "pass_50", questionText: "Identify the part of the text from which we can infer the intended role of AI in diagnosis.", correctSpans: [q3], explanation: "Support clinicians rather than replace their judgment.", difficulty: "easy", }); }
  }
  if (passageId === "pass_51") {
    const q1 = spanFor(text, "If each herder seeks to maximize their own gain they will add more cattle to the land eventually leading to overgrazing and the destruction of the resource for everyone.");
    if (q1) { questions.push({ id: "inf_51_q1", passageId: "pass_51", questionText: "Identify the part of the text from which we can infer how individual self-interest can destroy a shared resource.", correctSpans: [q1], explanation: "Adding more cattle leads to overgrazing and destruction for everyone.", difficulty: "medium", }); }
    const q2 = spanFor(text, "Since no single person owns the resource there is often little incentive to conserve it.");
    if (q2) { questions.push({ id: "inf_51_q2", passageId: "pass_51", questionText: "Identify the part of the text from which we can infer why common resources are overused.", correctSpans: [q2], explanation: "No single owner—little incentive to conserve.", difficulty: "medium", }); }
    const q3 = spanFor(text, "To prevent this tragedy societies must implement regulations such as quotas taxes or private property rights.");
    if (q3) { questions.push({ id: "inf_51_q3", passageId: "pass_51", questionText: "Identify the part of the text from which we can infer possible solutions to the tragedy of the commons.", correctSpans: [q3], explanation: "Regulations such as quotas, taxes, or private property.", difficulty: "medium", }); }
  }
  if (passageId === "pass_52") {
    const q1 = spanFor(text, "Most importantly it established the idea that the king was not above the law and that individuals had a right to due process.");
    if (q1) { questions.push({ id: "inf_52_q1", passageId: "pass_52", questionText: "Identify the part of the text from which we can infer the main constitutional principle of the Magna Carta.", correctSpans: [q1], explanation: "King not above the law; right to due process.", difficulty: "medium", }); }
    const q2 = spanFor(text, "Clause thirty nine stated that no free man could be imprisoned except by the lawful judgment of his peers.");
    if (q2) { questions.push({ id: "inf_52_q2", passageId: "pass_52", questionText: "Identify the part of the text from which we can infer an early guarantee against arbitrary imprisonment.", correctSpans: [q2], explanation: "No free man imprisoned except by lawful judgment of peers.", difficulty: "medium", }); }
    const q3 = spanFor(text, "Although only a few clauses remain in English law today its symbolic value as the foundation of modern constitutionalism is undeniable.");
    if (q3) { questions.push({ id: "inf_52_q3", passageId: "pass_52", questionText: "Identify the part of the text from which we can infer that the Magna Carta's influence is largely symbolic today.", correctSpans: [q3], explanation: "Only a few clauses remain; symbolic value undeniable.", difficulty: "medium", }); }
  }
  if (passageId === "pass_53") {
    const q1 = spanFor(text, "Without this natural insulation the average temperature of the Earth would be well below freezing.");
    if (q1) { questions.push({ id: "inf_53_q1", passageId: "pass_53", questionText: "Identify the part of the text from which we can infer that the greenhouse effect is necessary for life.", correctSpans: [q1], explanation: "Without it Earth would be well below freezing.", difficulty: "easy", }); }
    const q2 = spanFor(text, "However human activities such as burning fossil fuels and deforestation have significantly increased the concentration of these gases.");
    if (q2) { questions.push({ id: "inf_53_q2", passageId: "pass_53", questionText: "Identify the part of the text from which we can infer that humans have intensified the greenhouse effect.", correctSpans: [q2], explanation: "Human activities have increased concentration of these gases.", difficulty: "medium", }); }
    const q3 = spanFor(text, "the current rate of warming is unprecedented in the geological record and is largely attributed to human influence.");
    if (q3) { questions.push({ id: "inf_53_q3", passageId: "pass_53", questionText: "Identify the part of the text from which we can infer that current warming is mainly human-caused.", correctSpans: [q3], explanation: "Unprecedented rate largely attributed to human influence.", difficulty: "medium", }); }
  }
  if (passageId === "pass_54") {
    const q1 = spanFor(text, "For example placing healthy food at eye level in a cafeteria is a nudge while banning junk food is not.");
    if (q1) { questions.push({ id: "inf_54_q1", passageId: "pass_54", questionText: "Identify the part of the text from which we can infer the difference between a nudge and a ban.", correctSpans: [q1], explanation: "Placing at eye level is a nudge; banning is not.", difficulty: "easy", }); }
    const q2 = spanFor(text, "Proponents of nudging argue that it is a form of libertarian paternalism that helps people make better choices for their health and wealth while still respecting their freedom of choice.");
    if (q2) { questions.push({ id: "inf_54_q2", passageId: "pass_54", questionText: "Identify the part of the text from which we can infer why supporters say nudging respects freedom.", correctSpans: [q2], explanation: "Helps people make better choices while respecting freedom of choice.", difficulty: "medium", }); }
    const q3 = spanFor(text, "They fear that the state could use these techniques to bypass rational debate and shape behaviour in ways that benefit the government rather than the individual.");
    if (q3) { questions.push({ id: "inf_54_q3", passageId: "pass_54", questionText: "Identify the part of the text from which we can infer a criticism of government nudging.", correctSpans: [q3], explanation: "State could shape behaviour to benefit government rather than individual.", difficulty: "medium", }); }
  }
  if (passageId === "pass_55") {
    const q1 = spanFor(text, "The conquest was also made possible by the alliances Cortes formed with indigenous groups like the Tlaxcalans who were enemies of the Aztecs and sought to end their dominance.");
    if (q1) { questions.push({ id: "inf_55_q1", passageId: "pass_55", questionText: "Identify the part of the text from which we can infer that indigenous allies helped the Spanish conquer the Aztecs.", correctSpans: [q1], explanation: "Alliances with Tlaxcalans and others made conquest possible.", difficulty: "medium", }); }
    const q2 = spanFor(text, "Perhaps the most devastating factor was the introduction of smallpox which ravaged the indigenous population who had no immunity to the disease.");
    if (q2) { questions.push({ id: "inf_55_q2", passageId: "pass_55", questionText: "Identify the part of the text from which we can infer that disease contributed to the Aztec defeat.", correctSpans: [q2], explanation: "Smallpox ravaged the population with no immunity.", difficulty: "medium", }); }
    const q3 = spanFor(text, "Furthermore internal political divisions within the Aztec leadership weakened their response to the invaders at a critical moment.");
    if (q3) { questions.push({ id: "inf_55_q3", passageId: "pass_55", questionText: "Identify the part of the text from which we can infer that Aztec internal politics helped the Spanish.", correctSpans: [q3], explanation: "Internal political divisions weakened their response.", difficulty: "medium", }); }
  }
  if (passageId === "pass_56") {
    const q1 = spanFor(text, "Unlike Newton who viewed gravity as a force acting between masses Einstein proposed that gravity is a curvature of spacetime caused by the presence of mass and energy.");
    if (q1) { questions.push({ id: "inf_56_q1", passageId: "pass_56", questionText: "Identify the part of the text from which we can infer how Einstein's view of gravity differed from Newton's.", correctSpans: [q1], explanation: "Einstein: curvature of spacetime; Newton: force between masses.", difficulty: "medium", }); }
    const q2 = spanFor(text, "One of the key predictions of the theory was that light from distant stars would bend as it passed near the Sun which was confirmed during a solar eclipse in 1919.");
    if (q2) { questions.push({ id: "inf_56_q2", passageId: "pass_56", questionText: "Identify the part of the text from which we can infer that general relativity was confirmed by observation.", correctSpans: [q2], explanation: "Light bending confirmed during 1919 solar eclipse.", difficulty: "medium", }); }
    const q3 = spanFor(text, "Today the theory is essential for the functioning of global positioning systems which must account for time dilation caused by Earth's gravity.");
    if (q3) { questions.push({ id: "inf_56_q3", passageId: "pass_56", questionText: "Identify the part of the text from which we can infer a practical application of general relativity.", correctSpans: [q3], explanation: "GPS must account for time dilation—practical application.", difficulty: "medium", }); }
  }
  if (passageId === "pass_57") {
    const q1 = spanFor(text, "Proponents argue that UBI simplifies the welfare system by removing complex bureaucracy and eliminating the poverty trap where people lose benefits when they start working.");
    if (q1) { questions.push({ id: "inf_57_q1", passageId: "pass_57", questionText: "Identify the part of the text from which we can infer why supporters say UBI is simpler than traditional welfare.", correctSpans: [q1], explanation: "Removes complex bureaucracy and eliminates poverty trap.", difficulty: "medium", }); }
    const q2 = spanFor(text, "Critics however worry that UBI is prohibitively expensive and could lead to a decrease in labour participation if people no longer feel the need to work.");
    if (q2) { questions.push({ id: "inf_57_q2", passageId: "pass_57", questionText: "Identify the part of the text from which we can infer two main objections to UBI.", correctSpans: [q2], explanation: "Prohibitively expensive; decrease in labour participation.", difficulty: "medium", }); }
    const q3 = spanFor(text, "The goal is to provide a financial safety net and reduce poverty in an era of increasing automation and economic instability.");
    if (q3) { questions.push({ id: "inf_57_q3", passageId: "pass_57", questionText: "Identify the part of the text from which we can infer why UBI is proposed now.", correctSpans: [q3], explanation: "Era of increasing automation and economic instability.", difficulty: "easy", }); }
  }
  if (passageId === "pass_58") {
    const q1 = spanFor(text, "European crusaders returned home with a taste for Eastern luxury goods such as silk spices and sugar which stimulated trade.");
    if (q1) { questions.push({ id: "inf_58_q1", passageId: "pass_58", questionText: "Identify the part of the text from which we can infer that the Crusades increased European demand for Eastern goods.", correctSpans: [q1], explanation: "Returned with taste for Eastern goods—stimulated trade.", difficulty: "medium", }); }
    const q2 = spanFor(text, "Furthermore the Crusades facilitated the exchange of knowledge as Europeans rediscovered classical texts preserved by Muslim scholars.");
    if (q2) { questions.push({ id: "inf_58_q2", passageId: "pass_58", questionText: "Identify the part of the text from which we can infer an intellectual consequence of the Crusades.", correctSpans: [q2], explanation: "Exchange of knowledge; rediscovery of classical texts.", difficulty: "medium", }); }
    const q3 = spanFor(text, "While the Crusades are often remembered for their violence they also played a significant role in the economic and cultural integration of the Mediterranean region.");
    if (q3) { questions.push({ id: "inf_58_q3", passageId: "pass_58", questionText: "Identify the part of the text from which we can infer that the Crusades had positive as well as violent effects.", correctSpans: [q3], explanation: "Also played a role in economic and cultural integration.", difficulty: "medium", }); }
  }
  if (passageId === "pass_59") {
    const q1 = spanFor(text, "Ocean currents are the continuous predictable movements of seawater driven by forces such as wind the Coriolis effect and differences in water density.");
    if (q1) { questions.push({ id: "inf_59_q1", passageId: "pass_59", questionText: "Identify the part of the text from which we can infer what drives ocean currents.", correctSpans: [q1], explanation: "Wind, Coriolis effect, and differences in water density.", difficulty: "easy", }); }
    const q2 = spanFor(text, "The Gulf Stream for instance keeps Western Europe warmer than it would otherwise be.");
    if (q2) { questions.push({ id: "inf_59_q2", passageId: "pass_59", questionText: "Identify the part of the text from which we can infer that currents affect regional climate.", correctSpans: [q2], explanation: "Gulf Stream keeps Western Europe warmer.", difficulty: "easy", }); }
    const q3 = spanFor(text, "Climate change is a threat to this system as melting glaciers could add fresh water to the ocean and disrupt the sinking of salty water.");
    if (q3) { questions.push({ id: "inf_59_q3", passageId: "pass_59", questionText: "Identify the part of the text from which we can infer that climate change could disrupt ocean currents.", correctSpans: [q3], explanation: "Melting glaciers could disrupt the sinking of salty water.", difficulty: "medium", }); }
  }
  if (passageId === "pass_60") {
    const q1 = spanFor(text, "This right was formally recognized by the European Court of Justice in 2014 as a way to protect individual privacy in the digital age.");
    if (q1) { questions.push({ id: "inf_60_q1", passageId: "pass_60", questionText: "Identify the part of the text from which we can infer where the right to be forgotten was first recognised.", correctSpans: [q1], explanation: "European Court of Justice in 2014.", difficulty: "easy", }); }
    const q2 = spanFor(text, "Proponents argue that individuals should not be perpetually defined by their past mistakes or by information that is no longer accurate.");
    if (q2) { questions.push({ id: "inf_60_q2", passageId: "pass_60", questionText: "Identify the part of the text from which we can infer why supporters want the right to be forgotten.", correctSpans: [q2], explanation: "Should not be perpetually defined by past mistakes or outdated information.", difficulty: "medium", }); }
    const q3 = spanFor(text, "However critics worry that the right to be forgotten can lead to a form of private censorship and the rewriting of history.");
    if (q3) { questions.push({ id: "inf_60_q3", passageId: "pass_60", questionText: "Identify the part of the text from which we can infer a free-speech concern about the right to be forgotten.", correctSpans: [q3], explanation: "Can lead to private censorship and rewriting of history.", difficulty: "medium", }); }
  }
  if (passageId === "pass_61") {
    const q1 = spanFor(text, "The Viking presence also forced the disparate Anglo Saxon kingdoms to unite under a single monarch to defend their territory.");
    if (q1) { questions.push({ id: "inf_61_q1", passageId: "pass_61", questionText: "Identify the part of the text from which we can infer that the Vikings contributed to English unification.", correctSpans: [q1], explanation: "Forced Anglo-Saxon kingdoms to unite to defend territory.", difficulty: "medium", }); }
    const q2 = spanFor(text, "The region under Viking control became known as the Danelaw where Scandinavian laws and customs prevailed.");
    if (q2) { questions.push({ id: "inf_61_q2", passageId: "pass_61", questionText: "Identify the part of the text from which we can infer what the Danelaw was.", correctSpans: [q2], explanation: "Region under Viking control where Scandinavian laws prevailed.", difficulty: "easy", }); }
    const q3 = spanFor(text, "Despite their reputation as raiders many Vikings were farmers and merchants who integrated into the local population over time.");
    if (q3) { questions.push({ id: "inf_61_q3", passageId: "pass_61", questionText: "Identify the part of the text from which we can infer that Vikings were not only raiders.", correctSpans: [q3], explanation: "Many were farmers and merchants who integrated.", difficulty: "easy", }); }
  }
  if (passageId === "pass_62") {
    const q1 = spanFor(text, "The glymphatic system which is most active during deep sleep helps to remove toxins that accumulate during the day.");
    if (q1) { questions.push({ id: "inf_62_q1", passageId: "pass_62", questionText: "Identify the part of the text from which we can infer why deep sleep is important for the brain.", correctSpans: [q1], explanation: "Glymphatic system removes toxins during deep sleep.", difficulty: "medium", }); }
    const q2 = spanFor(text, "REM sleep is characterized by rapid eye movements and vivid dreaming and it is thought to play a key role in emotional regulation and memory consolidation.");
    if (q2) { questions.push({ id: "inf_62_q2", passageId: "pass_62", questionText: "Identify the part of the text from which we can infer a function of REM sleep.", correctSpans: [q2], explanation: "Key role in emotional regulation and memory consolidation.", difficulty: "medium", }); }
    const q3 = spanFor(text, "Researchers emphasize that most adults need between seven and nine hours of sleep per night for optimal health.");
    if (q3) { questions.push({ id: "inf_62_q3", passageId: "pass_62", questionText: "Identify the part of the text from which we can infer the recommended amount of sleep for adults.", correctSpans: [q3], explanation: "Seven to nine hours per night for optimal health.", difficulty: "easy", }); }
  }
  if (passageId === "pass_63") {
    const q1 = spanFor(text, "It works by ensuring that the trait is passed on to nearly all offspring bypassing the usual rules of inheritance.");
    if (q1) { questions.push({ id: "inf_63_q1", passageId: "pass_63", questionText: "Identify the part of the text from which we can infer how gene drive differs from normal inheritance.", correctSpans: [q1], explanation: "Trait passed to nearly all offspring—bypassing usual rules.", difficulty: "medium", }); }
    const q2 = spanFor(text, "Critics worry that releasing such a powerful tool into the wild could have unintended consequences for the ecosystem such as the extinction of a species that other animals depend on for food.");
    if (q2) { questions.push({ id: "inf_63_q2", passageId: "pass_63", questionText: "Identify the part of the text from which we can infer an ecological risk of gene drive.", correctSpans: [q2], explanation: "Unintended consequences; possible extinction of a species.", difficulty: "medium", }); }
    const q3 = spanFor(text, "There is also the question of governance as a gene drive released in one country would likely spread across international borders without the consent of neighbouring nations.");
    if (q3) { questions.push({ id: "inf_63_q3", passageId: "pass_63", questionText: "Identify the part of the text from which we can infer a governance problem with gene drive.", correctSpans: [q3], explanation: "Would spread across borders without consent of neighbours.", difficulty: "hard", }); }
  }
  if (passageId === "pass_64") {
    const q1 = spanFor(text, "In exchange for the throne William and Mary accepted the Bill of Rights in 1689 which limited the powers of the monarchy and guaranteed certain rights for Parliament and the people.");
    if (q1) { questions.push({ id: "inf_64_q1", passageId: "pass_64", questionText: "Identify the part of the text from which we can infer what the new monarchs had to accept.", correctSpans: [q1], explanation: "Bill of Rights limited monarchy and guaranteed rights.", difficulty: "medium", }); }
    const q2 = spanFor(text, "It established that the king could not raise taxes or maintain an army without parliamentary consent.");
    if (q2) { questions.push({ id: "inf_64_q2", passageId: "pass_64", questionText: "Identify the part of the text from which we can infer a key limit on royal power.", correctSpans: [q2], explanation: "No taxes or army without parliamentary consent.", difficulty: "easy", }); }
    const q3 = spanFor(text, "The revolution was largely bloodless in England and was driven by fears of James II's pro Catholic policies and his attempts to rule without Parliament.");
    if (q3) { questions.push({ id: "inf_64_q3", passageId: "pass_64", questionText: "Identify the part of the text from which we can infer why James II was overthrown.", correctSpans: [q3], explanation: "Pro-Catholic policies and attempts to rule without Parliament.", difficulty: "medium", }); }
  }
  if (passageId === "pass_65") {
    const q1 = spanFor(text, "The captured CO2 is then compressed and transported to be stored deep underground in geological formations such as depleted oil fields.");
    if (q1) { questions.push({ id: "inf_65_q1", passageId: "pass_65", questionText: "Identify the part of the text from which we can infer where captured CO2 is stored.", correctSpans: [q1], explanation: "Compressed and stored deep underground in geological formations.", difficulty: "easy", }); }
    const q2 = spanFor(text, "Proponents of CCS argue that it is essential for meeting global climate targets as it allows for the continued use of fossil fuels in sectors where transition to renewables is difficult.");
    if (q2) { questions.push({ id: "inf_65_q2", passageId: "pass_65", questionText: "Identify the part of the text from which we can infer why CCS is supported despite fossil fuel use.", correctSpans: [q2], explanation: "Allows continued fossil fuel use where renewables are difficult.", difficulty: "medium", }); }
    const q3 = spanFor(text, "However critics worry that the high cost of CCS makes it less attractive than simply investing in renewable energy like wind and solar.");
    if (q3) { questions.push({ id: "inf_65_q3", passageId: "pass_65", questionText: "Identify the part of the text from which we can infer a main criticism of CCS.", correctSpans: [q3], explanation: "High cost makes it less attractive than renewables.", difficulty: "medium", }); }
  }
  if (passageId === "pass_66") {
    const q1 = spanFor(text, "Proponents argue that an individual mandate is necessary to ensure the stability of the insurance market by preventing a situation where only sick people buy insurance which would cause premiums to skyrocket. This is known as adverse selection.");
    if (q1) { questions.push({ id: "inf_66_q1", passageId: "pass_66", questionText: "Identify the part of the text from which we can infer why mandates are said to stabilise insurance markets.", correctSpans: [q1], explanation: "Prevents only sick people buying—avoids adverse selection.", difficulty: "medium", }); }
    const q2 = spanFor(text, "Critics however view an individual mandate as an overreach of government power and an infringement on personal liberty.");
    if (q2) { questions.push({ id: "inf_66_q2", passageId: "pass_66", questionText: "Identify the part of the text from which we can infer why some oppose mandatory insurance.", correctSpans: [q2], explanation: "Overreach of government; infringement on personal liberty.", difficulty: "easy", }); }
    const q3 = spanFor(text, "It also reduces the burden on taxpayers who often end up paying for the care of the uninsured through emergency services.");
    if (q3) { questions.push({ id: "inf_66_q3", passageId: "pass_66", questionText: "Identify the part of the text from which we can infer another argument for mandates.", correctSpans: [q3], explanation: "Reduces burden on taxpayers who pay for uninsured care.", difficulty: "medium", }); }
  }
  if (passageId === "pass_67") {
    const q1 = spanFor(text, "However the later reign of Aurangzeb was marked by constant warfare and religious policies that alienated many of his subjects.");
    if (q1) { questions.push({ id: "inf_67_q1", passageId: "pass_67", questionText: "Identify the part of the text from which we can infer why Aurangzeb's reign contributed to decline.", correctSpans: [q1], explanation: "Constant warfare and religious policies alienated subjects.", difficulty: "medium", }); }
    const q2 = spanFor(text, "The Battle of Plassey in 1757 was a decisive moment that established British influence in Bengal.");
    if (q2) { questions.push({ id: "inf_67_q2", passageId: "pass_67", questionText: "Identify the part of the text from which we can infer when British control in India began to take hold.", correctSpans: [q2], explanation: "Plassey 1757 established British influence in Bengal.", difficulty: "easy", }); }
    const q3 = spanFor(text, "Regional governors began to assert their independence leading to the fragmentation of the empire into smaller competing states.");
    if (q3) { questions.push({ id: "inf_67_q3", passageId: "pass_67", questionText: "Identify the part of the text from which we can infer how the Mughal Empire fragmented.", correctSpans: [q3], explanation: "Governors asserted independence—fragmentation into competing states.", difficulty: "medium", }); }
  }
  if (passageId === "pass_68") {
    const q1 = spanFor(text, "While our DNA sequence is fixed throughout our lives the way our genes are turned on or off can be influenced by our environment and lifestyle.");
    if (q1) { questions.push({ id: "inf_68_q1", passageId: "pass_68", questionText: "Identify the part of the text from which we can infer that genes can be regulated without changing DNA.", correctSpans: [q1], explanation: "Way genes are turned on or off influenced by environment.", difficulty: "medium", }); }
    const q2 = spanFor(text, "One common epigenetic mechanism is DNA methylation where a chemical group is added to the DNA molecule to silence a specific gene.");
    if (q2) { questions.push({ id: "inf_68_q2", passageId: "pass_68", questionText: "Identify the part of the text from which we can infer one way gene expression is modified.", correctSpans: [q2], explanation: "DNA methylation silences a specific gene.", difficulty: "medium", }); }
    const q3 = spanFor(text, "For example studies have shown that the descendants of people who experienced famine may have an increased risk of obesity and diabetes due to epigenetic changes.");
    if (q3) { questions.push({ id: "inf_68_q3", passageId: "pass_68", questionText: "Identify the part of the text from which we can infer that environmental effects can be passed to offspring.", correctSpans: [q3], explanation: "Descendants of famine survivors—epigenetic changes.", difficulty: "medium", }); }
  }
  if (passageId === "pass_69") {
    const q1 = spanFor(text, "However critics worry that facial recognition enables mass surveillance on an unprecedented scale.");
    if (q1) { questions.push({ id: "inf_69_q1", passageId: "pass_69", questionText: "Identify the part of the text from which we can infer a main privacy concern about facial recognition.", correctSpans: [q1], explanation: "Enables mass surveillance on unprecedented scale.", difficulty: "easy", }); }
    const q2 = spanFor(text, "There is also the issue of accuracy as many systems have been found to have higher error rates when identifying women and people of colour.");
    if (q2) { questions.push({ id: "inf_69_q2", passageId: "pass_69", questionText: "Identify the part of the text from which we can infer that facial recognition can be biased.", correctSpans: [q2], explanation: "Higher error rates for women and people of colour.", difficulty: "medium", }); }
    const q3 = spanFor(text, "Several cities and countries have already moved to ban or strictly regulate the use of facial recognition by law enforcement.");
    if (q3) { questions.push({ id: "inf_69_q3", passageId: "pass_69", questionText: "Identify the part of the text from which we can infer that some places have restricted the technology.", correctSpans: [q3], explanation: "Cities and countries ban or strictly regulate use.", difficulty: "easy", }); }
  }
  if (passageId === "pass_70") {
    const q1 = spanFor(text, "While the stock market crash in October 1929 is often seen as the starting point it was not the sole cause of the crisis.");
    if (q1) { questions.push({ id: "inf_70_q1", passageId: "pass_70", questionText: "Identify the part of the text from which we can infer that the crash was not the only cause of the Depression.", correctSpans: [q1], explanation: "Not the sole cause of the crisis.", difficulty: "easy", }); }
    const q2 = spanFor(text, "The lack of government intervention in the early years allowed the crisis to deepen.");
    if (q2) { questions.push({ id: "inf_70_q2", passageId: "pass_70", questionText: "Identify the part of the text from which we can infer why the Depression worsened.", correctSpans: [q2], explanation: "Lack of government intervention allowed crisis to deepen.", difficulty: "medium", }); }
    const q3 = spanFor(text, "The crisis fundamentally changed the way governments managed the economy and led to the creation of the modern welfare state.");
    if (q3) { questions.push({ id: "inf_70_q3", passageId: "pass_70", questionText: "Identify the part of the text from which we can infer a lasting legacy of the Depression.", correctSpans: [q3], explanation: "Changed government management; creation of welfare state.", difficulty: "medium", }); }
  }
  if (passageId === "pass_71") {
    const q1 = spanFor(text, "This theory provides a unified explanation for many geological phenomena including earthquakes and volcanoes.");
    if (q1) { questions.push({ id: "inf_71_q1", passageId: "pass_71", questionText: "Identify the part of the text from which we can infer why plate tectonics is important.", correctSpans: [q1], explanation: "Unified explanation for earthquakes and volcanoes.", difficulty: "easy", }); }
    const q2 = spanFor(text, "The movement of these plates is driven by convection currents in the mantle and the force of gravity.");
    if (q2) { questions.push({ id: "inf_71_q2", passageId: "pass_71", questionText: "Identify the part of the text from which we can infer what drives plate motion.", correctSpans: [q2], explanation: "Convection currents in mantle and gravity.", difficulty: "medium", }); }
    const q3 = spanFor(text, "While the theory was not widely accepted until the mid twentieth century it is now a cornerstone of modern geology.");
    if (q3) { questions.push({ id: "inf_71_q3", passageId: "pass_71", questionText: "Identify the part of the text from which we can infer when plate tectonics was accepted.", correctSpans: [q3], explanation: "Not widely accepted until mid twentieth century.", difficulty: "easy", }); }
  }
  if (passageId === "pass_72") {
    const q1 = spanFor(text, "If the historical data used to train the algorithm is biased the AI will likely replicate those biases in its decisions.");
    if (q1) { questions.push({ id: "inf_72_q1", passageId: "pass_72", questionText: "Identify the part of the text from which we can infer why AI hiring can perpetuate bias.", correctSpans: [q1], explanation: "Biased training data leads to replicated biases.", difficulty: "medium", }); }
    const q2 = spanFor(text, "Furthermore the use of AI in interviews to analyse facial expressions or tone of voice is controversial as it lacks a clear scientific basis and can disadvantage people with disabilities or different cultural backgrounds.");
    if (q2) { questions.push({ id: "inf_72_q2", passageId: "pass_72", questionText: "Identify the part of the text from which we can infer a concern about AI interview analysis.", correctSpans: [q2], explanation: "Lacks scientific basis; can disadvantage disabled or different cultures.", difficulty: "medium", }); }
    const q3 = spanFor(text, "Proponents argue that AI can make hiring more efficient and objective by removing human biases and focusing on the most relevant skills and qualifications.");
    if (q3) { questions.push({ id: "inf_72_q3", passageId: "pass_72", questionText: "Identify the part of the text from which we can infer why companies use AI in hiring.", correctSpans: [q3], explanation: "More efficient and objective; remove human biases.", difficulty: "easy", }); }
  }
  if (passageId === "pass_73") {
    const q1 = spanFor(text, "The conference established the principle of effective occupation.");
    if (q1) { questions.push({ id: "inf_73_q1", passageId: "pass_73", questionText: "Identify the part of the text from which we can infer the rule for claiming African territory.", correctSpans: [q1], explanation: "Effective occupation—administrative presence required.", difficulty: "medium", }); }
    const q2 = spanFor(text, "The conference led to a rapid scramble for Africa where borders were drawn by Europeans without any regard for the existing linguistic or ethnic divisions of the African people.");
    if (q2) { questions.push({ id: "inf_73_q2", passageId: "pass_73", questionText: "Identify the part of the text from which we can infer why African borders caused problems.", correctSpans: [q2], explanation: "Borders drawn without regard for linguistic or ethnic divisions.", difficulty: "medium", }); }
    const q3 = spanFor(text, "By 1900 almost the entire continent was under European rule with the exception of Ethiopia and Liberia.");
    if (q3) { questions.push({ id: "inf_73_q3", passageId: "pass_73", questionText: "Identify the part of the text from which we can infer which African states avoided colonisation.", correctSpans: [q3], explanation: "Ethiopia and Liberia were exceptions.", difficulty: "easy", }); }
  }
  if (passageId === "pass_74") {
    const q1 = spanFor(text, "Research has shown that an imbalance in the microbiome known as dysbiosis is linked to a range of health conditions including inflammatory bowel disease obesity and even mental health disorders like anxiety and depression.");
    if (q1) { questions.push({ id: "inf_74_q1", passageId: "pass_74", questionText: "Identify the part of the text from which we can infer that gut health is linked to other conditions.", correctSpans: [q1], explanation: "Dysbiosis linked to IBD, obesity, anxiety, depression.", difficulty: "medium", }); }
    const q2 = spanFor(text, "This connection between the gut and the brain is known as the gut brain axis.");
    if (q2) { questions.push({ id: "inf_74_q2", passageId: "pass_74", questionText: "Identify the part of the text from which we can infer that the gut and brain communicate.", correctSpans: [q2], explanation: "Gut-brain axis—connection between gut and brain.", difficulty: "easy", }); }
    const q3 = spanFor(text, "Fecal microbiota transplants have shown promise in treating certain severe infections by restoring a healthy balance of bacteria.");
    if (q3) { questions.push({ id: "inf_74_q3", passageId: "pass_74", questionText: "Identify the part of the text from which we can infer a treatment that restores the microbiome.", correctSpans: [q3], explanation: "Fecal microbiota transplants restore healthy balance.", difficulty: "medium", }); }
  }
  if (passageId === "pass_75") {
    const q1 = spanFor(text, "However critics worry that autonomous weapons lower the threshold for going to war and raise significant accountability issues.");
    if (q1) { questions.push({ id: "inf_75_q1", passageId: "pass_75", questionText: "Identify the part of the text from which we can infer two main objections to autonomous weapons.", correctSpans: [q1], explanation: "Lower threshold for war; accountability issues.", difficulty: "medium", }); }
    const q2 = spanFor(text, "If a machine makes a mistake and kills innocent people it is unclear who should be held responsible for the action.");
    if (q2) { questions.push({ id: "inf_75_q2", passageId: "pass_75", questionText: "Identify the part of the text from which we can infer the accountability problem with killer robots.", correctSpans: [q2], explanation: "Unclear who should be held responsible.", difficulty: "medium", }); }
    const q3 = spanFor(text, "Many human rights organizations and scientists have called for a total ban on the development and use of killer robots.");
    if (q3) { questions.push({ id: "inf_75_q3", passageId: "pass_75", questionText: "Identify the part of the text from which we can infer that some advocate a ban on autonomous weapons.", correctSpans: [q3], explanation: "Human rights groups and scientists call for total ban.", difficulty: "easy", }); }
  }

  // pass_76: Informed Consent in Emergency Research
  if (passageId === "pass_76") {
    const q1 = spanFor(text, "Obtaining informed consent is normally a strict requirement for participation in clinical trials.");
    if (q1) { questions.push({ id: "inf_76_q1", passageId: "pass_76", questionText: "Identify the part of the text from which we can infer that consent is usually required for trial participation.", correctSpans: [q1], explanation: "Informed consent is normally a strict requirement.", difficulty: "easy", }); }
    const q2 = spanFor(text, "In emergency settings however the window for intervention may be so short that seeking consent from a legally authorised representative is not feasible.");
    if (q2) { questions.push({ id: "inf_76_q2", passageId: "pass_76", questionText: "Identify the part of the text from which we can infer why consent is difficult in emergencies.", correctSpans: [q2], explanation: "Window for intervention may be so short that seeking consent is not feasible.", difficulty: "medium", }); }
    const q3 = spanFor(text, "Regulations in many countries therefore permit exception from informed consent or EFIC for a narrow class of emergency research.");
    if (q3) { questions.push({ id: "inf_76_q3", passageId: "pass_76", questionText: "Identify the part of the text from which we can infer that some countries allow research without consent in certain cases.", correctSpans: [q3], explanation: "Regulations permit exception from informed consent (EFIC) for a narrow class.", difficulty: "medium", }); }
    const q4 = spanFor(text, "Such studies must address a life threatening condition for which no standard treatment exists and the intervention must hold out the prospect of direct benefit.");
    if (q4) { questions.push({ id: "inf_76_q4", passageId: "pass_76", questionText: "Identify the part of the text from which we can infer what conditions must be met for EFIC research.", correctSpans: [q4], explanation: "Life-threatening condition, no standard treatment, prospect of direct benefit.", difficulty: "hard", }); }
    const q5 = spanFor(text, "The balance between protecting autonomy and allowing research that could save lives remains contested.");
    if (q5) { questions.push({ id: "inf_76_q5", passageId: "pass_76", questionText: "Identify the part of the text from which we can infer that the ethics of emergency research are still debated.", correctSpans: [q5], explanation: "The balance remains contested.", difficulty: "easy", }); }
  }
  // pass_77: Treaty of Westphalia
  if (passageId === "pass_77") {
    const q1 = spanFor(text, "The Peace of Westphalia signed in 1648 ended the Thirty Years War in Europe and is often cited as the origin of the modern system of sovereign states.");
    if (q1) { questions.push({ id: "inf_77_q1", passageId: "pass_77", questionText: "Identify the part of the text from which we can infer why Westphalia is historically significant.", correctSpans: [q1], explanation: "Ended Thirty Years War; often cited as origin of modern sovereign states.", difficulty: "easy", }); }
    const q2 = spanFor(text, "The treaties recognised the principle of territorial sovereignty meaning that each state had exclusive authority within its own borders and was not subject to interference by other states or by religious authorities.");
    if (q2) { questions.push({ id: "inf_77_q2", passageId: "pass_77", questionText: "Identify the part of the text from which we can infer what territorial sovereignty means.", correctSpans: [q2], explanation: "Each state had exclusive authority; not subject to interference.", difficulty: "medium", }); }
    const q3 = spanFor(text, "The Peace also confirmed the right of rulers to determine the religion of their own territory a concept known as cuius regio eius religio which had been established at the Peace of Augsburg in 1555.");
    if (q3) { questions.push({ id: "inf_77_q3", passageId: "pass_77", questionText: "Identify the part of the text from which we can infer that Westphalia affirmed rulers' control over religion.", correctSpans: [q3], explanation: "Right of rulers to determine the religion of their territory.", difficulty: "medium", }); }
    const q4 = spanFor(text, "The legacy of Westphalia is still invoked today when states resist external pressure on grounds of national sovereignty.");
    if (q4) { questions.push({ id: "inf_77_q4", passageId: "pass_77", questionText: "Identify the part of the text from which we can infer that Westphalia still influences international relations.", correctSpans: [q4], explanation: "Legacy still invoked when states resist external pressure.", difficulty: "medium", }); }
  }
  // pass_78: Mitochondria and Cellular Energy
  if (passageId === "pass_78") {
    const q1 = spanFor(text, "Mitochondria are often called the powerhouses of the cell because they produce most of the adenosine triphosphate or ATP that cells use as an energy currency.");
    if (q1) { questions.push({ id: "inf_78_q1", passageId: "pass_78", questionText: "Identify the part of the text from which we can infer why mitochondria are called powerhouses.", correctSpans: [q1], explanation: "They produce most of the ATP that cells use.", difficulty: "easy", }); }
    const q2 = spanFor(text, "The inner membrane of the mitochondrion is highly folded into structures called cristae which greatly increase the surface area available for the proteins that carry out the electron transport chain.");
    if (q2) { questions.push({ id: "inf_78_q2", passageId: "pass_78", questionText: "Identify the part of the text from which we can infer why the inner membrane is folded.", correctSpans: [q2], explanation: "Cristae greatly increase surface area for electron transport proteins.", difficulty: "medium", }); }
    const q3 = spanFor(text, "This has led scientists to conclude that mitochondria evolved from free living bacteria that were engulfed by an ancestral cell in an endosymbiotic event.");
    if (q3) { questions.push({ id: "inf_78_q3", passageId: "pass_78", questionText: "Identify the part of the text from which we can infer the evolutionary origin of mitochondria.", correctSpans: [q3], explanation: "Evolved from free-living bacteria in endosymbiotic event.", difficulty: "medium", }); }
    const q4 = spanFor(text, "Mitochondrial DNA is inherited only from the mother in most species because sperm mitochondria are usually destroyed after fertilisation.");
    if (q4) { questions.push({ id: "inf_78_q4", passageId: "pass_78", questionText: "Identify the part of the text from which we can infer why mitochondrial DNA is maternally inherited.", correctSpans: [q4], explanation: "Sperm mitochondria are usually destroyed after fertilisation.", difficulty: "medium", }); }
  }
  // pass_79: Conscientious Objection in Healthcare
  if (passageId === "pass_79") {
    const q1 = spanFor(text, "Defenders of conscientious objection argue that forcing professionals to act against their deeply held moral or religious beliefs violates their right to freedom of conscience.");
    if (q1) { questions.push({ id: "inf_79_q1", passageId: "pass_79", questionText: "Identify the part of the text from which we can infer the main argument for allowing conscientious objection.", correctSpans: [q1], explanation: "Forcing professionals violates right to freedom of conscience.", difficulty: "medium", }); }
    const q2 = spanFor(text, "Opponents counter that when objection is widespread or when the professional is the only provider in a region patients may be effectively denied access to care.");
    if (q2) { questions.push({ id: "inf_79_q2", passageId: "pass_79", questionText: "Identify the part of the text from which we can infer why some oppose conscientious objection.", correctSpans: [q2], explanation: "Patients may be effectively denied access to care.", difficulty: "medium", }); }
    const q3 = spanFor(text, "In the United Kingdom the General Medical Council states that doctors may decline to participate in a procedure to which they object but they must refer the patient to another provider without delay and must not express judgment about the patient.");
    if (q3) { questions.push({ id: "inf_79_q3", passageId: "pass_79", questionText: "Identify the part of the text from which we can infer what the GMC requires of objecting doctors.", correctSpans: [q3], explanation: "May decline but must refer without delay and not express judgment.", difficulty: "medium", }); }
    const q4 = spanFor(text, "the scope of that right and whether it should extend to referral or to indirect involvement remains disputed.");
    if (q4) { questions.push({ id: "inf_79_q4", passageId: "pass_79", questionText: "Identify the part of the text from which we can infer that the limits of conscientious objection are debated.", correctSpans: [q4], explanation: "Scope and whether it extends to referral remains disputed.", difficulty: "hard", }); }
  }
  // pass_80: The Scramble for Africa
  if (passageId === "pass_80") {
    const q1 = spanFor(text, "No African rulers were invited to the conference.");
    if (q1) { questions.push({ id: "inf_80_q1", passageId: "pass_80", questionText: "Identify the part of the text from which we can infer that Africans were excluded from the partition process.", correctSpans: [q1], explanation: "No African rulers were invited to the conference.", difficulty: "easy", }); }
    const q2 = spanFor(text, "The borders imposed by the colonisers paid no attention to existing ethnic linguistic or political boundaries.");
    if (q2) { questions.push({ id: "inf_80_q2", passageId: "pass_80", questionText: "Identify the part of the text from which we can infer why colonial borders caused problems.", correctSpans: [q2], explanation: "Paid no attention to existing ethnic, linguistic, or political boundaries.", difficulty: "medium", }); }
    const q3 = spanFor(text, "Economic motives were significant as European industry sought raw materials and new markets and strategic considerations such as controlling sea routes and military bases also played a role.");
    if (q3) { questions.push({ id: "inf_80_q3", passageId: "pass_80", questionText: "Identify the part of the text from which we can infer what drove European powers to colonise Africa.", correctSpans: [q3], explanation: "Economic motives and strategic considerations.", difficulty: "medium", }); }
    const q4 = spanFor(text, "This arbitrary division has been blamed for many of the conflicts and governance problems that have plagued post colonial Africa.");
    if (q4) { questions.push({ id: "inf_80_q4", passageId: "pass_80", questionText: "Identify the part of the text from which we can infer a long-term consequence of the scramble.", correctSpans: [q4], explanation: "Blamed for conflicts and governance problems in post-colonial Africa.", difficulty: "medium", }); }
  }
  // pass_81: CRISPR and Gene Editing
  if (passageId === "pass_81") {
    const q1 = spanFor(text, "The system was adapted from a defence mechanism found in bacteria which use it to recognise and cut the DNA of invading viruses.");
    if (q1) { questions.push({ id: "inf_81_q1", passageId: "pass_81", questionText: "Identify the part of the text from which we can infer where CRISPR originally came from.", correctSpans: [q1], explanation: "Adapted from a defence mechanism in bacteria.", difficulty: "easy", }); }
    const q2 = spanFor(text, "However editing the germline so that changes are passed to future generations is banned in many countries because of unresolved ethical and safety concerns.");
    if (q2) { questions.push({ id: "inf_81_q2", passageId: "pass_81", questionText: "Identify the part of the text from which we can infer why germline editing is restricted.", correctSpans: [q2], explanation: "Banned in many countries due to ethical and safety concerns.", difficulty: "medium", }); }
    const q3 = spanFor(text, "Off target effects in which the enzyme cuts DNA at unintended locations remain a risk.");
    if (q3) { questions.push({ id: "inf_81_q3", passageId: "pass_81", questionText: "Identify the part of the text from which we can infer a current limitation of CRISPR.", correctSpans: [q3], explanation: "Off-target effects remain a risk.", difficulty: "medium", }); }
    const q4 = spanFor(text, "Researchers can design a short guide RNA that directs the Cas9 enzyme to a specific sequence in the genome where it creates a cut.");
    if (q4) { questions.push({ id: "inf_81_q4", passageId: "pass_81", questionText: "Identify the part of the text from which we can infer how scientists target a specific gene.", correctSpans: [q4], explanation: "Guide RNA directs Cas9 to a specific sequence.", difficulty: "medium", }); }
  }
  // pass_82: Pandemic Triage and the Disability Critique
  if (passageId === "pass_82") {
    const q1 = spanFor(text, "Some protocols explicitly or implicitly deprioritised patients with significant disabilities or chronic conditions on the grounds that they had a lower chance of benefit or a shorter expected lifespan.");
    if (q1) { questions.push({ id: "inf_82_q1", passageId: "pass_82", questionText: "Identify the part of the text from which we can infer how some triage guidelines treated disabled patients.", correctSpans: [q1], explanation: "Deprioritised patients with disabilities or chronic conditions.", difficulty: "medium", }); }
    const q2 = spanFor(text, "They argued that quality of life judgments should not be used to deny treatment and that the value of a life should not be measured by longevity or ability.");
    if (q2) { questions.push({ id: "inf_82_q2", passageId: "pass_82", questionText: "Identify the part of the text from which we can infer the core objection of disability advocates.", correctSpans: [q2], explanation: "Value of life should not be measured by longevity or ability.", difficulty: "medium", }); }
    const q3 = spanFor(text, "The Americans with Disabilities Act and similar laws require that people with disabilities not be denied care on the basis of disability.");
    if (q3) { questions.push({ id: "inf_82_q3", passageId: "pass_82", questionText: "Identify the part of the text from which we can infer that law may protect disabled patients from discrimination.", correctSpans: [q3], explanation: "ADA and similar laws require no denial of care on basis of disability.", difficulty: "easy", }); }
    const q4 = spanFor(text, "The debate has highlighted the tension between utilitarian triage and the principle that each person has equal moral worth regardless of their condition.");
    if (q4) { questions.push({ id: "inf_82_q4", passageId: "pass_82", questionText: "Identify the part of the text from which we can infer the ethical tension in triage.", correctSpans: [q4], explanation: "Tension between utilitarian triage and equal moral worth.", difficulty: "hard", }); }
  }
  // pass_83: The Haitian Revolution
  if (passageId === "pass_83") {
    const q1 = spanFor(text, "The Haitian Revolution which began in 1791 was the only successful slave revolt in history that led to the founding of an independent state.");
    if (q1) { questions.push({ id: "inf_83_q1", passageId: "pass_83", questionText: "Identify the part of the text from which we can infer the unique place of the Haitian Revolution in history.", correctSpans: [q1], explanation: "Only successful slave revolt that led to an independent state.", difficulty: "easy", }); }
    const q2 = spanFor(text, "Inspired by the French Revolution and by rumours that the French king had already freed the slaves the enslaved population rose in rebellion.");
    if (q2) { questions.push({ id: "inf_83_q2", passageId: "pass_83", questionText: "Identify the part of the text from which we can infer what motivated the enslaved to revolt.", correctSpans: [q2], explanation: "French Revolution and rumours of royal emancipation.", difficulty: "medium", }); }
    const q3 = spanFor(text, "The new republic was forced to pay a large indemnity to France in exchange for recognition which crippled its economy for decades.");
    if (q3) { questions.push({ id: "inf_83_q3", passageId: "pass_83", questionText: "Identify the part of the text from which we can infer why Haiti's economy struggled after independence.", correctSpans: [q3], explanation: "Forced to pay large indemnity to France for recognition.", difficulty: "medium", }); }
    const q4 = spanFor(text, "The revolution terrified slave owning societies elsewhere and reinforced the determination of many to maintain the institution.");
    if (q4) { questions.push({ id: "inf_83_q4", passageId: "pass_83", questionText: "Identify the part of the text from which we can infer the international impact of the revolution.", correctSpans: [q4], explanation: "Terrified slave-owning societies; reinforced determination to maintain slavery.", difficulty: "medium", }); }
  }
  // pass_84: The Blood Brain Barrier
  if (passageId === "pass_84") {
    const q1 = spanFor(text, "This barrier is formed by endothelial cells that are tightly joined together and supported by astrocytes.");
    if (q1) { questions.push({ id: "inf_84_q1", passageId: "pass_84", questionText: "Identify the part of the text from which we can infer what the blood brain barrier is made of.", correctSpans: [q1], explanation: "Formed by endothelial cells tightly joined and supported by astrocytes.", difficulty: "medium", }); }
    const q2 = spanFor(text, "One consequence of the blood brain barrier is that many drugs that are effective elsewhere in the body cannot reach the brain in sufficient concentrations.");
    if (q2) { questions.push({ id: "inf_84_q2", passageId: "pass_84", questionText: "Identify the part of the text from which we can infer why treating brain conditions with drugs is difficult.", correctSpans: [q2], explanation: "Many drugs cannot reach the brain in sufficient concentrations.", difficulty: "medium", }); }
    const q3 = spanFor(text, "It allows essential nutrients and oxygen to pass through while blocking many potentially harmful molecules including some drugs and pathogens.");
    if (q3) { questions.push({ id: "inf_84_q3", passageId: "pass_84", questionText: "Identify the part of the text from which we can infer what the barrier lets through and what it blocks.", correctSpans: [q3], explanation: "Allows nutrients and oxygen; blocks harmful molecules.", difficulty: "easy", }); }
    const q4 = spanFor(text, "The barrier can also break down in conditions such as stroke or traumatic brain injury leading to swelling and further damage.");
    if (q4) { questions.push({ id: "inf_84_q4", passageId: "pass_84", questionText: "Identify the part of the text from which we can infer when the blood brain barrier may be damaged.", correctSpans: [q4], explanation: "Break down in stroke or traumatic brain injury.", difficulty: "medium", }); }
  }
  // pass_85: Medical Tourism and Equity
  if (passageId === "pass_85") {
    const q1 = spanFor(text, "In destination countries resources may be diverted from local populations to serve wealthy foreigners.");
    if (q1) { questions.push({ id: "inf_85_q1", passageId: "pass_85", questionText: "Identify the part of the text from which we can infer a negative effect of medical tourism on local patients.", correctSpans: [q1], explanation: "Resources diverted from local populations to serve foreigners.", difficulty: "medium", }); }
    const q2 = spanFor(text, "Complications or follow up care may fall on the home country's health system when patients return.");
    if (q2) { questions.push({ id: "inf_85_q2", passageId: "pass_85", questionText: "Identify the part of the text from which we can infer who may bear the cost if treatment abroad goes wrong.", correctSpans: [q2], explanation: "Follow-up care may fall on home country's health system.", difficulty: "medium", }); }
    const q3 = spanFor(text, "Some procedures such as organ transplantation may involve exploitation of living donors in countries with weak regulation.");
    if (q3) { questions.push({ id: "inf_85_q3", passageId: "pass_85", questionText: "Identify the part of the text from which we can infer an ethical risk in some medical tourism.", correctSpans: [q3], explanation: "Organ transplantation may involve exploitation in weakly regulated countries.", difficulty: "medium", }); }
    const q4 = spanFor(text, "Medical tourism occurs when patients travel to another country to receive medical care often to access treatments that are cheaper faster or not available at home.");
    if (q4) { questions.push({ id: "inf_85_q4", passageId: "pass_85", questionText: "Identify the part of the text from which we can infer why patients become medical tourists.", correctSpans: [q4], explanation: "To access treatments cheaper, faster, or not available at home.", difficulty: "easy", }); }
  }
  // pass_86: The Spanish Inquisition
  if (passageId === "pass_86") {
    const q1 = spanFor(text, "The Spanish Inquisition was established in 1478 by the Catholic Monarchs Ferdinand and Isabella with the stated aim of ensuring the orthodoxy of converts from Judaism and Islam.");
    if (q1) { questions.push({ id: "inf_86_q1", passageId: "pass_86", questionText: "Identify the part of the text from which we can infer the official purpose of the Inquisition.", correctSpans: [q1], explanation: "Stated aim of ensuring orthodoxy of converts.", difficulty: "easy", }); }
    const q2 = spanFor(text, "In practice it became an instrument of political and religious control.");
    if (q2) { questions.push({ id: "inf_86_q2", passageId: "pass_86", questionText: "Identify the part of the text from which we can infer that the Inquisition's real role differed from its stated aim.", correctSpans: [q2], explanation: "In practice became an instrument of political and religious control.", difficulty: "medium", }); }
    const q3 = spanFor(text, "Conversos or Jewish converts were often suspected of secretly practising their former faith and the Inquisition used torture to extract confessions.");
    if (q3) { questions.push({ id: "inf_86_q3", passageId: "pass_86", questionText: "Identify the part of the text from which we can infer how the Inquisition treated Jewish converts.", correctSpans: [q3], explanation: "Suspected of secretly practising; torture used to extract confessions.", difficulty: "medium", }); }
    const q4 = spanFor(text, "It also contributed to the expulsion of Jews from Spain in 1492 and of Muslims in the early seventeenth century which had lasting demographic and economic effects.");
    if (q4) { questions.push({ id: "inf_86_q4", passageId: "pass_86", questionText: "Identify the part of the text from which we can infer a long-term consequence of the Inquisition.", correctSpans: [q4], explanation: "Contributed to expulsions with lasting demographic and economic effects.", difficulty: "medium", }); }
  }
  // pass_87: Antibiotic Stewardship
  if (passageId === "pass_87") {
    const q1 = spanFor(text, "Antibiotic stewardship refers to coordinated interventions designed to improve and measure the appropriate use of antibiotics.");
    if (q1) { questions.push({ id: "inf_87_q1", passageId: "pass_87", questionText: "Identify the part of the text from which we can infer what stewardship programmes aim to do.", correctSpans: [q1], explanation: "Improve and measure the appropriate use of antibiotics.", difficulty: "easy", }); }
    const q2 = spanFor(text, "Evidence shows that stewardship programs reduce unnecessary antibiotic use and improve patient outcomes.");
    if (q2) { questions.push({ id: "inf_87_q2", passageId: "pass_87", questionText: "Identify the part of the text from which we can infer that stewardship is supported by evidence.", correctSpans: [q2], explanation: "Reduce unnecessary use and improve outcomes.", difficulty: "easy", }); }
    const q3 = spanFor(text, "Resistance to stewardship can come from clinicians who fear that restricting antibiotics will harm patients or who are reluctant to change established practice.");
    if (q3) { questions.push({ id: "inf_87_q3", passageId: "pass_87", questionText: "Identify the part of the text from which we can infer why some doctors resist stewardship.", correctSpans: [q3], explanation: "Fear restricting antibiotics will harm patients; reluctance to change.", difficulty: "medium", }); }
    const q4 = spanFor(text, "As resistance grows stewardship is increasingly seen as an ethical duty to preserve antibiotics for future generations.");
    if (q4) { questions.push({ id: "inf_87_q4", passageId: "pass_87", questionText: "Identify the part of the text from which we can infer why stewardship is considered an ethical duty.", correctSpans: [q4], explanation: "To preserve antibiotics for future generations.", difficulty: "medium", }); }
  }
  // pass_88: Parental Refusal of Treatment for Children
  if (passageId === "pass_88") {
    const q1 = spanFor(text, "When parents refuse recommended treatment however doctors may face a conflict between respecting parental autonomy and protecting the child's welfare.");
    if (q1) { questions.push({ id: "inf_88_q1", passageId: "pass_88", questionText: "Identify the part of the text from which we can infer the dilemma doctors face when parents refuse treatment.", correctSpans: [q1], explanation: "Conflict between parental autonomy and child's welfare.", difficulty: "medium", }); }
    const q2 = spanFor(text, "In cases where the child's life is at risk or where refusal would lead to serious harm courts in many jurisdictions can override parental refusal and order treatment.");
    if (q2) { questions.push({ id: "inf_88_q2", passageId: "pass_88", questionText: "Identify the part of the text from which we can infer when courts may override parents.", correctSpans: [q2], explanation: "When life at risk or refusal would lead to serious harm.", difficulty: "medium", }); }
    const q3 = spanFor(text, "The best interests of the child are the usual standard applied by the court.");
    if (q3) { questions.push({ id: "inf_88_q3", passageId: "pass_88", questionText: "Identify the part of the text from which we can infer the legal standard used in such cases.", correctSpans: [q3], explanation: "Best interests of the child.", difficulty: "easy", }); }
    const q4 = spanFor(text, "The law typically allows parents wide discretion for decisions that do not threaten life or serious harm but draws the line at refusal of life saving treatment.");
    if (q4) { questions.push({ id: "inf_88_q4", passageId: "pass_88", questionText: "Identify the part of the text from which we can infer where the law limits parental choice.", correctSpans: [q4], explanation: "Draws the line at refusal of life-saving treatment.", difficulty: "medium", }); }
  }
  // pass_89: The Congress of Vienna
  if (passageId === "pass_89") {
    const q1 = spanFor(text, "The Congress of Vienna met from 1814 to 1815 after the defeat of Napoleon to redraw the map of Europe and to establish a balance of power that would prevent another continent wide war.");
    if (q1) { questions.push({ id: "inf_89_q1", passageId: "pass_89", questionText: "Identify the part of the text from which we can infer the main goals of the Congress.", correctSpans: [q1], explanation: "Redraw map and establish balance of power to prevent war.", difficulty: "easy", }); }
    const q2 = spanFor(text, "The Congress restored many of the monarchies that Napoleon had overthrown and sought to contain the forces of liberalism and nationalism that had been unleashed by the French Revolution.");
    if (q2) { questions.push({ id: "inf_89_q2", passageId: "pass_89", questionText: "Identify the part of the text from which we can infer that the Congress opposed revolutionary ideas.", correctSpans: [q2], explanation: "Sought to contain liberalism and nationalism.", difficulty: "medium", }); }
    const q3 = spanFor(text, "The principle of legitimacy held that rightful rulers should be restored to their thrones.");
    if (q3) { questions.push({ id: "inf_89_q3", passageId: "pass_89", questionText: "Identify the part of the text from which we can infer what the principle of legitimacy meant.", correctSpans: [q3], explanation: "Rightful rulers should be restored to their thrones.", difficulty: "easy", }); }
    const q4 = spanFor(text, "Critics argue that the Congress ignored the aspirations of ordinary people for freedom and self determination.");
    if (q4) { questions.push({ id: "inf_89_q4", passageId: "pass_89", questionText: "Identify the part of the text from which we can infer a criticism of the Congress.", correctSpans: [q4], explanation: "Ignored aspirations for freedom and self-determination.", difficulty: "medium", }); }
  }
  // pass_90: Circadian Rhythms and Health
  if (passageId === "pass_90") {
    const q1 = spanFor(text, "In humans the master clock is located in the suprachiasmatic nucleus of the brain and is synchronised to the environment mainly by light.");
    if (q1) { questions.push({ id: "inf_90_q1", passageId: "pass_90", questionText: "Identify the part of the text from which we can infer where the body's main clock is and what sets it.", correctSpans: [q1], explanation: "Suprachiasmatic nucleus; synchronised mainly by light.", difficulty: "medium", }); }
    const q2 = spanFor(text, "Disruption of circadian rhythms such as through shift work or jet lag is associated with an increased risk of metabolic disorders cardiovascular disease and some cancers.");
    if (q2) { questions.push({ id: "inf_90_q2", passageId: "pass_90", questionText: "Identify the part of the text from which we can infer that disrupting the body clock can harm health.", correctSpans: [q2], explanation: "Associated with increased risk of metabolic, cardiovascular, and cancer.", difficulty: "medium", }); }
    const q3 = spanFor(text, "Exposure to artificial light especially blue light in the evening can suppress melatonin and delay sleep onset.");
    if (q3) { questions.push({ id: "inf_90_q3", passageId: "pass_90", questionText: "Identify the part of the text from which we can infer why evening screen use may affect sleep.", correctSpans: [q3], explanation: "Artificial light can suppress melatonin and delay sleep.", difficulty: "easy", }); }
    const q4 = spanFor(text, "Understanding circadian biology has led to chronotherapy in which the timing of drug administration is optimised according to the patient's rhythm.");
    if (q4) { questions.push({ id: "inf_90_q4", passageId: "pass_90", questionText: "Identify the part of the text from which we can infer a medical application of circadian research.", correctSpans: [q4], explanation: "Chronotherapy optimises timing of drug administration.", difficulty: "medium", }); }
  }
  // pass_91 to pass_105
  if (passageId === "pass_91") {
    const q1 = spanFor(text, "Ethicists and professional bodies generally agree that patients have a right to know what happened and that disclosure is a duty of honesty and respect.");
    if (q1) { questions.push({ id: "inf_91_q1", passageId: "pass_91", questionText: "Identify the part of the text from which we can infer that disclosure of error is widely supported.", correctSpans: [q1], explanation: "Patients have a right to know; disclosure is a duty.", difficulty: "easy", }); }
    const q2 = spanFor(text, "Nevertheless many providers find disclosure difficult because they fear litigation loss of reputation or the patient's anger.");
    if (q2) { questions.push({ id: "inf_91_q2", passageId: "pass_91", questionText: "Identify the part of the text from which we can infer why doctors may hesitate to disclose errors.", correctSpans: [q2], explanation: "Fear litigation, loss of reputation, or patient anger.", difficulty: "medium", }); }
    const q3 = spanFor(text, "Some institutions have adopted policies of full disclosure and apology and have found that this can reduce rather than increase the likelihood of lawsuits.");
    if (q3) { questions.push({ id: "inf_91_q3", passageId: "pass_91", questionText: "Identify the part of the text from which we can infer that disclosure may reduce legal risk.", correctSpans: [q3], explanation: "Full disclosure and apology can reduce likelihood of lawsuits.", difficulty: "medium", }); }
    const q4 = spanFor(text, "The way in which disclosure is made matters: it should be timely clear and accompanied by a plan to prevent recurrence.");
    if (q4) { questions.push({ id: "inf_91_q4", passageId: "pass_91", questionText: "Identify the part of the text from which we can infer what good disclosure involves.", correctSpans: [q4], explanation: "Timely, clear, and accompanied by plan to prevent recurrence.", difficulty: "medium", }); }
  }
  if (passageId === "pass_92") {
    const q1 = spanFor(text, "The trade was driven by the demand for labour on plantations producing sugar tobacco cotton and other commodities.");
    if (q1) { questions.push({ id: "inf_92_q1", passageId: "pass_92", questionText: "Identify the part of the text from which we can infer why the Atlantic slave trade existed.", correctSpans: [q1], explanation: "Demand for labour on plantations.", difficulty: "easy", }); }
    const q2 = spanFor(text, "The middle passage as this leg of the journey was known had a mortality rate that could exceed twenty percent.");
    if (q2) { questions.push({ id: "inf_92_q2", passageId: "pass_92", questionText: "Identify the part of the text from which we can infer how deadly the Atlantic crossing was.", correctSpans: [q2], explanation: "Mortality rate could exceed twenty percent.", difficulty: "medium", }); }
    const q3 = spanFor(text, "The trade had profound demographic economic and social effects on Africa where some societies were destabilised and others grew powerful through participation in the trade.");
    if (q3) { questions.push({ id: "inf_92_q3", passageId: "pass_92", questionText: "Identify the part of the text from which we can infer the impact of the trade on Africa.", correctSpans: [q3], explanation: "Some societies destabilised; others grew powerful.", difficulty: "medium", }); }
    const q4 = spanFor(text, "The trade is now widely recognised as a crime against humanity.");
    if (q4) { questions.push({ id: "inf_92_q4", passageId: "pass_92", questionText: "Identify the part of the text from which we can infer how the trade is now viewed.", correctSpans: [q4], explanation: "Widely recognised as a crime against humanity.", difficulty: "easy", }); }
  }
  if (passageId === "pass_93") {
    const q1 = spanFor(text, "Because viruses replicate inside host cells using the host's machinery they are harder to treat without harming the host.");
    if (q1) { questions.push({ id: "inf_93_q1", passageId: "pass_93", questionText: "Identify the part of the text from which we can infer why antivirals are harder to develop than antibiotics.", correctSpans: [q1], explanation: "Viruses use host machinery; hard to treat without harming host.", difficulty: "medium", }); }
    const q2 = spanFor(text, "Most antiviral drugs work by interfering with a specific step in the viral life cycle such as entry into the cell replication of the viral genome or release of new virus particles.");
    if (q2) { questions.push({ id: "inf_93_q2", passageId: "pass_93", questionText: "Identify the part of the text from which we can infer how antiviral drugs typically work.", correctSpans: [q2], explanation: "Interfere with a specific step in the viral life cycle.", difficulty: "medium", }); }
    const q3 = spanFor(text, "Combination therapy using several drugs with different targets can reduce the risk of resistance.");
    if (q3) { questions.push({ id: "inf_93_q3", passageId: "pass_93", questionText: "Identify the part of the text from which we can infer a strategy to limit antiviral resistance.", correctSpans: [q3], explanation: "Combination therapy with different targets.", difficulty: "medium", }); }
    const q4 = spanFor(text, "Vaccines remain the most effective way to prevent many viral infections because they prime the immune system before exposure.");
    if (q4) { questions.push({ id: "inf_93_q4", passageId: "pass_93", questionText: "Identify the part of the text from which we can infer why vaccines are preferred for prevention.", correctSpans: [q4], explanation: "Prime the immune system before exposure.", difficulty: "easy", }); }
  }
  if (passageId === "pass_94") {
    const q1 = spanFor(text, "One view holds that younger patients should be prioritised because they have had less opportunity to experience life and because saving them yields more years of life gained.");
    if (q1) { questions.push({ id: "inf_94_q1", passageId: "pass_94", questionText: "Identify the part of the text from which we can infer the argument for prioritising younger patients.", correctSpans: [q1], explanation: "Less opportunity to experience life; more years of life gained.", difficulty: "medium", }); }
    const q2 = spanFor(text, "An opposing view holds that age is irrelevant and that each person's life has equal value regardless of how long they have already lived.");
    if (q2) { questions.push({ id: "inf_94_q2", passageId: "pass_94", questionText: "Identify the part of the text from which we can infer the argument against using age in allocation.", correctSpans: [q2], explanation: "Age irrelevant; each life has equal value.", difficulty: "medium", }); }
    const q3 = spanFor(text, "Many ethicists argue that age may be used only as a proxy for likelihood of benefit and that when two patients have an equal chance of benefit they should be treated equally regardless of age.");
    if (q3) { questions.push({ id: "inf_94_q3", passageId: "pass_94", questionText: "Identify the part of the text from which we can infer a middle position on age and allocation.", correctSpans: [q3], explanation: "Age only as proxy for benefit; equal benefit means equal treatment.", difficulty: "hard", }); }
    const q4 = spanFor(text, "The law in some jurisdictions prohibits discrimination on the basis of age in healthcare.");
    if (q4) { questions.push({ id: "inf_94_q4", passageId: "pass_94", questionText: "Identify the part of the text from which we can infer that age-based allocation may be illegal.", correctSpans: [q4], explanation: "Some jurisdictions prohibit age discrimination.", difficulty: "easy", }); }
  }
  if (passageId === "pass_95") {
    const q1 = spanFor(text, "In October 1962 American intelligence discovered that the Soviet Union was installing nuclear missiles in Cuba capable of striking the United States.");
    if (q1) { questions.push({ id: "inf_95_q1", passageId: "pass_95", questionText: "Identify the part of the text from which we can infer what triggered the Cuban Missile Crisis.", correctSpans: [q1], explanation: "Soviet missiles in Cuba capable of striking the US.", difficulty: "easy", }); }
    const q2 = spanFor(text, "For thirteen days the world stood on the brink of nuclear war as Kennedy and Soviet leader Khrushchev exchanged messages and sought a way out.");
    if (q2) { questions.push({ id: "inf_95_q2", passageId: "pass_95", questionText: "Identify the part of the text from which we can infer how close the world came to nuclear war.", correctSpans: [q2], explanation: "World stood on the brink of nuclear war for thirteen days.", difficulty: "easy", }); }
    const q3 = spanFor(text, "In the end Khrushchev agreed to remove the missiles in exchange for a public American pledge not to invade Cuba and a secret undertaking to remove American missiles from Turkey.");
    if (q3) { questions.push({ id: "inf_95_q3", passageId: "pass_95", questionText: "Identify the part of the text from which we can infer the terms that ended the crisis.", correctSpans: [q3], explanation: "Remove missiles in exchange for no-invasion pledge and Turkey deal.", difficulty: "medium", }); }
    const q4 = spanFor(text, "It led to the establishment of a direct hotline between Washington and Moscow to reduce the risk of miscalculation in future crises.");
    if (q4) { questions.push({ id: "inf_95_q4", passageId: "pass_95", questionText: "Identify the part of the text from which we can infer a lasting consequence of the crisis.", correctSpans: [q4], explanation: "Direct hotline to reduce risk of miscalculation.", difficulty: "medium", }); }
  }
  if (passageId === "pass_96") {
    const q1 = spanFor(text, "The niche provides signals that maintain the stem cells in an undifferentiated state and that regulate when they divide and when their daughter cells differentiate.");
    if (q1) { questions.push({ id: "inf_96_q1", passageId: "pass_96", questionText: "Identify the part of the text from which we can infer what the stem cell niche does.", correctSpans: [q1], explanation: "Maintains undifferentiated state; regulates division and differentiation.", difficulty: "medium", }); }
    const q2 = spanFor(text, "If stem cells leave the niche or if the niche is damaged they may lose their stem cell properties or be depleted.");
    if (q2) { questions.push({ id: "inf_96_q2", passageId: "pass_96", questionText: "Identify the part of the text from which we can infer why the niche is essential.", correctSpans: [q2], explanation: "Without niche, cells may lose stem properties or be depleted.", difficulty: "medium", }); }
    const q3 = spanFor(text, "Understanding niches is important for regenerative medicine because growing stem cells in the laboratory requires mimicking the right signals.");
    if (q3) { questions.push({ id: "inf_96_q3", passageId: "pass_96", questionText: "Identify the part of the text from which we can infer why niche research matters for therapy.", correctSpans: [q3], explanation: "Lab growth of stem cells requires mimicking niche signals.", difficulty: "medium", }); }
    const q4 = spanFor(text, "some tumours are thought to be driven by cancer stem cells that reside in a niche like environment and that may be resistant to conventional therapy.");
    if (q4) { questions.push({ id: "inf_96_q4", passageId: "pass_96", questionText: "Identify the part of the text from which we can infer a link between niches and cancer.", correctSpans: [q4], explanation: "Cancer stem cells in niche-like environment may be therapy-resistant.", difficulty: "hard", }); }
  }
  if (passageId === "pass_97") {
    const q1 = spanFor(text, "Common examples include payments from pharmaceutical companies for speaking or consulting ownership of stock in a company whose drug they are studying or incentives to enrol patients in trials.");
    if (q1) { questions.push({ id: "inf_97_q1", passageId: "pass_97", questionText: "Identify the part of the text from which we can infer examples of conflicts of interest.", correctSpans: [q1], explanation: "Payments, stock ownership, enrolment incentives.", difficulty: "easy", }); }
    const q2 = spanFor(text, "The aim is to allow others to assess whether the conflict might have influenced the person's conduct or conclusions.");
    if (q2) { questions.push({ id: "inf_97_q2", passageId: "pass_97", questionText: "Identify the part of the text from which we can infer why disclosure is required.", correctSpans: [q2], explanation: "So others can assess whether conflict influenced conduct.", difficulty: "medium", }); }
    const q3 = spanFor(text, "Others maintain that certain conflicts are so serious that the person should be barred from the activity altogether such as when a researcher with a financial stake in a drug conducts the trial.");
    if (q3) { questions.push({ id: "inf_97_q3", passageId: "pass_97", questionText: "Identify the part of the text from which we can infer that some argue disclosure is not enough.", correctSpans: [q3], explanation: "Some conflicts so serious the person should be barred.", difficulty: "medium", }); }
    const q4 = spanFor(text, "Studies have shown that even small gifts can influence prescribing behaviour.");
    if (q4) { questions.push({ id: "inf_97_q4", passageId: "pass_97", questionText: "Identify the part of the text from which we can infer that conflicts can affect practice.", correctSpans: [q4], explanation: "Even small gifts can influence prescribing.", difficulty: "easy", }); }
  }
  if (passageId === "pass_98") {
    const q1 = spanFor(text, "The Marshall Plan or European Recovery Program provided over twelve billion dollars in grants and loans to sixteen nations between 1948 and 1952.");
    if (q1) { questions.push({ id: "inf_98_q1", passageId: "pass_98", questionText: "Identify the part of the text from which we can infer the scale and form of Marshall Plan aid.", correctSpans: [q1], explanation: "Over twelve billion in grants and loans to sixteen nations.", difficulty: "easy", }); }
    const q2 = spanFor(text, "The aid was offered to all European countries including the Soviet Union and its allies but the Soviet bloc refused to participate and pressured Eastern European countries to do the same.");
    if (q2) { questions.push({ id: "inf_98_q2", passageId: "pass_98", questionText: "Identify the part of the text from which we can infer why Eastern Europe did not receive Marshall aid.", correctSpans: [q2], explanation: "Soviet bloc refused and pressured Eastern Europe.", difficulty: "medium", }); }
    const q3 = spanFor(text, "The United States had several motives: humanitarian concern for suffering allies a desire to create stable trading partners and a fear that poverty and instability would fuel the spread of communism.");
    if (q3) { questions.push({ id: "inf_98_q3", passageId: "pass_98", questionText: "Identify the part of the text from which we can infer US motives for the Marshall Plan.", correctSpans: [q3], explanation: "Humanitarian, economic, and anti-communist motives.", difficulty: "medium", }); }
    const q4 = spanFor(text, "It is widely credited with accelerating Western European recovery and with strengthening the political and economic bonds between the United States and Western Europe.");
    if (q4) { questions.push({ id: "inf_98_q4", passageId: "pass_98", questionText: "Identify the part of the text from which we can infer the Plan's perceived effects.", correctSpans: [q4], explanation: "Accelerated recovery; strengthened US-Western Europe bonds.", difficulty: "medium", }); }
  }
  if (passageId === "pass_99") {
    const q1 = spanFor(text, "Unlike conventional infectious agents prions consist only of misfolded protein with no DNA or RNA.");
    if (q1) { questions.push({ id: "inf_99_q1", passageId: "pass_99", questionText: "Identify the part of the text from which we can infer how prions differ from viruses and bacteria.", correctSpans: [q1], explanation: "Consist only of misfolded protein; no DNA or RNA.", difficulty: "medium", }); }
    const q2 = spanFor(text, "The misfolded prion protein can induce normally folded proteins of the same type to adopt the abnormal shape in a cascade that damages the brain.");
    if (q2) { questions.push({ id: "inf_99_q2", passageId: "pass_99", questionText: "Identify the part of the text from which we can infer how prions cause damage.", correctSpans: [q2], explanation: "Induce normal proteins to misfold in a cascade.", difficulty: "medium", }); }
    const q3 = spanFor(text, "The variant form of Creutzfeldt Jakob disease in humans is linked to exposure to BSE contaminated beef and caused a major public health crisis in the United Kingdom in the 1990s.");
    if (q3) { questions.push({ id: "inf_99_q3", passageId: "pass_99", questionText: "Identify the part of the text from which we can infer the link between mad cow disease and human disease.", correctSpans: [q3], explanation: "Variant CJD linked to BSE-contaminated beef.", difficulty: "medium", }); }
    const q4 = spanFor(text, "Prions are highly resistant to standard methods of sterilisation that would destroy bacteria or viruses.");
    if (q4) { questions.push({ id: "inf_99_q4", passageId: "pass_99", questionText: "Identify the part of the text from which we can infer why prions are hard to eliminate.", correctSpans: [q4], explanation: "Resistant to standard sterilisation.", difficulty: "easy", }); }
  }
  if (passageId === "pass_100") {
    const q1 = spanFor(text, "A patient with capacity has the right to refuse medical treatment even if the refusal will result in death.");
    if (q1) { questions.push({ id: "inf_100_q1", passageId: "pass_100", questionText: "Identify the part of the text from which we can infer that competent patients may refuse life-saving treatment.", correctSpans: [q1], explanation: "Right to refuse even if refusal will result in death.", difficulty: "easy", }); }
    const q2 = spanFor(text, "This principle applies regardless of the rationality of the refusal: a patient may refuse life saving treatment for reasons that others find foolish or wrong.");
    if (q2) { questions.push({ id: "inf_100_q2", passageId: "pass_100", questionText: "Identify the part of the text from which we can infer that the reason for refusal need not be rational.", correctSpans: [q2], explanation: "Applies regardless of rationality of refusal.", difficulty: "medium", }); }
    const q3 = spanFor(text, "Capacity is decision specific: a patient may have capacity to refuse one treatment but not to manage their finances.");
    if (q3) { questions.push({ id: "inf_100_q3", passageId: "pass_100", questionText: "Identify the part of the text from which we can infer that capacity depends on the decision.", correctSpans: [q3], explanation: "Capacity is decision-specific.", difficulty: "medium", }); }
    const q4 = spanFor(text, "The Act requires that the person be supported to make their own decision where possible and that any decision made for them must be in their best interests and must be the least restrictive option.");
    if (q4) { questions.push({ id: "inf_100_q4", passageId: "pass_100", questionText: "Identify the part of the text from which we can infer what the Mental Capacity Act requires.", correctSpans: [q4], explanation: "Support to decide; best interests; least restrictive option.", difficulty: "medium", }); }
  }
  if (passageId === "pass_101") {
    const q1 = spanFor(text, "The empire was organised around a system of devshirme in which Christian boys from the Balkans were conscripted converted to Islam and trained as soldiers or administrators.");
    if (q1) { questions.push({ id: "inf_101_q1", passageId: "pass_101", questionText: "Identify the part of the text from which we can infer how the Ottomans recruited key personnel.", correctSpans: [q1], explanation: "Devshirme: Christian boys conscripted, converted, trained.", difficulty: "medium", }); }
    const q2 = spanFor(text, "The empire was relatively tolerant of religious diversity: Jews and Christians were allowed to practise their faith in return for payment of a special tax.");
    if (q2) { questions.push({ id: "inf_101_q2", passageId: "pass_101", questionText: "Identify the part of the text from which we can infer how non-Muslims were treated.", correctSpans: [q2], explanation: "Allowed to practise in return for special tax.", difficulty: "medium", }); }
    const q3 = spanFor(text, "Decline set in from the seventeenth century as the empire faced military defeats economic competition from European powers and internal unrest.");
    if (q3) { questions.push({ id: "inf_101_q3", passageId: "pass_101", questionText: "Identify the part of the text from which we can infer causes of Ottoman decline.", correctSpans: [q3], explanation: "Military defeats, economic competition, internal unrest.", difficulty: "medium", }); }
    const q4 = spanFor(text, "The capture of Constantinople in 1453 ended the Byzantine Empire and made the Ottomans the dominant power in the eastern Mediterranean.");
    if (q4) { questions.push({ id: "inf_101_q4", passageId: "pass_101", questionText: "Identify the part of the text from which we can infer the significance of the fall of Constantinople.", correctSpans: [q4], explanation: "Ended Byzantine Empire; Ottomans dominant in region.", difficulty: "easy", }); }
  }
  if (passageId === "pass_102") {
    const q1 = spanFor(text, "The immune system has two main arms: the innate response which is rapid and non specific and the adaptive response which is slower but highly specific and which creates memory.");
    if (q1) { questions.push({ id: "inf_102_q1", passageId: "pass_102", questionText: "Identify the part of the text from which we can infer the difference between innate and adaptive immunity.", correctSpans: [q1], explanation: "Innate rapid and non-specific; adaptive slower, specific, creates memory.", difficulty: "medium", }); }
    const q2 = spanFor(text, "Vaccines typically trigger the adaptive response by presenting the immune system with antigens from the pathogen.");
    if (q2) { questions.push({ id: "inf_102_q2", passageId: "pass_102", questionText: "Identify the part of the text from which we can infer how vaccines work.", correctSpans: [q2], explanation: "Trigger adaptive response by presenting antigens.", difficulty: "easy", }); }
    const q3 = spanFor(text, "The success of vaccination depends on herd immunity: when a sufficient proportion of the population is immune the pathogen cannot spread easily and even those who are not vaccinated are protected.");
    if (q3) { questions.push({ id: "inf_102_q3", passageId: "pass_102", questionText: "Identify the part of the text from which we can infer how the unvaccinated can be protected.", correctSpans: [q3], explanation: "Herd immunity protects unvaccinated when enough are immune.", difficulty: "medium", }); }
    const q4 = spanFor(text, "Live attenuated vaccines use weakened forms of the pathogen that can still replicate to a limited extent and thus produce a strong immune response.");
    if (q4) { questions.push({ id: "inf_102_q4", passageId: "pass_102", questionText: "Identify the part of the text from which we can infer why live attenuated vaccines are effective.", correctSpans: [q4], explanation: "Weakened pathogen can still replicate; strong immune response.", difficulty: "medium", }); }
  }
  if (passageId === "pass_103") {
    const q1 = spanFor(text, "According to this doctrine it may be permissible to perform an action that has a bad effect if the action itself is good or neutral the good effect is what is intended the bad effect is not a means to the good effect and there is a proportionate reason to allow the bad effect.");
    if (q1) { questions.push({ id: "inf_103_q1", passageId: "pass_103", questionText: "Identify the part of the text from which we can infer the conditions for double effect.", correctSpans: [q1], explanation: "Action good/neutral; good intended; bad not a means; proportionate reason.", difficulty: "hard", }); }
    const q2 = spanFor(text, "In end of life care the classic application is to the use of opioids for pain relief: the doctor intends to relieve pain but foresees that increasing the dose may shorten the patient's life.");
    if (q2) { questions.push({ id: "inf_103_q2", passageId: "pass_103", questionText: "Identify the part of the text from which we can infer the standard example of double effect in medicine.", correctSpans: [q2], explanation: "Opioids for pain; intend relief, foresee shortened life.", difficulty: "medium", }); }
    const q3 = spanFor(text, "If the intention is relief of suffering and not to cause death the action may be morally acceptable even though death is a foreseeable side effect.");
    if (q3) { questions.push({ id: "inf_103_q3", passageId: "pass_103", questionText: "Identify the part of the text from which we can infer when opioid use may be deemed acceptable.", correctSpans: [q3], explanation: "Intention relief not death; death foreseeable side effect.", difficulty: "medium", }); }
    const q4 = spanFor(text, "Critics of the doctrine argue that the distinction between intending and foreseeing is psychologically and morally unclear.");
    if (q4) { questions.push({ id: "inf_103_q4", passageId: "pass_103", questionText: "Identify the part of the text from which we can infer a criticism of double effect.", correctSpans: [q4], explanation: "Distinction between intending and foreseeing unclear.", difficulty: "medium", }); }
  }
  if (passageId === "pass_104") {
    const q1 = spanFor(text, "The conflict was triggered by the weak rule of Henry VI and by rival claims to the throne.");
    if (q1) { questions.push({ id: "inf_104_q1", passageId: "pass_104", questionText: "Identify the part of the text from which we can infer what caused the Wars of the Roses.", correctSpans: [q1], explanation: "Weak rule of Henry VI and rival claims.", difficulty: "easy", }); }
    const q2 = spanFor(text, "Henry married Elizabeth of York thus uniting the two houses and founding the Tudor dynasty.");
    if (q2) { questions.push({ id: "inf_104_q2", passageId: "pass_104", questionText: "Identify the part of the text from which we can infer how Henry VII ended the conflict.", correctSpans: [q2], explanation: "Married Elizabeth of York; united houses; founded Tudors.", difficulty: "medium", }); }
    const q3 = spanFor(text, "The wars had weakened the nobility and strengthened the monarchy creating conditions for the strong centralised rule of the Tudors.");
    if (q3) { questions.push({ id: "inf_104_q3", passageId: "pass_104", questionText: "Identify the part of the text from which we can infer a long-term effect of the wars.", correctSpans: [q3], explanation: "Weakened nobility; strengthened monarchy.", difficulty: "medium", }); }
    const q4 = spanFor(text, "The ordinary population was less affected than in some conflicts but the instability disrupted trade and agriculture.");
    if (q4) { questions.push({ id: "inf_104_q4", passageId: "pass_104", questionText: "Identify the part of the text from which we can infer how the wars affected common people.", correctSpans: [q4], explanation: "Less affected than in some conflicts; disrupted trade and agriculture.", difficulty: "medium", }); }
  }
  if (passageId === "pass_105") {
    const q1 = spanFor(text, "Each time a cell divides the telomeres shorten slightly because the machinery that replicates DNA cannot fully copy the end of the chromosome.");
    if (q1) { questions.push({ id: "inf_105_q1", passageId: "pass_105", questionText: "Identify the part of the text from which we can infer why telomeres shorten with division.", correctSpans: [q1], explanation: "Replication machinery cannot fully copy chromosome end.", difficulty: "medium", }); }
    const q2 = spanFor(text, "When telomeres become too short the cell may stop dividing or undergo programmed cell death.");
    if (q2) { questions.push({ id: "inf_105_q2", passageId: "pass_105", questionText: "Identify the part of the text from which we can infer what happens when telomeres are too short.", correctSpans: [q2], explanation: "Cell may stop dividing or undergo programmed death.", difficulty: "easy", }); }
    const q3 = spanFor(text, "In most normal adult cells telomerase is not expressed which is one reason that cells have a finite number of divisions.");
    if (q3) { questions.push({ id: "inf_105_q3", passageId: "pass_105", questionText: "Identify the part of the text from which we can infer why most cells cannot divide indefinitely.", correctSpans: [q3], explanation: "Telomerase not expressed in most normal adult cells.", difficulty: "medium", }); }
    const q4 = spanFor(text, "Cancer cells often reactivate telomerase which allows them to divide indefinitely.");
    if (q4) { questions.push({ id: "inf_105_q4", passageId: "pass_105", questionText: "Identify the part of the text from which we can infer how cancer cells escape the usual limit on divisions.", correctSpans: [q4], explanation: "Reactivate telomerase; divide indefinitely.", difficulty: "medium", }); }
  }

  return questions;
}

/** All inference questions, keyed by passage ID. Build at runtime from passage text. */
export function getInferenceQuestionsForPassage(
  passageId: string,
  passageText: string
): InferenceQuestion[] {
  return buildQuestionsForPassage(passageId, passageText);
}

/** Passage IDs that have inference questions. All passages pass_01 through pass_105. */
export const PASSAGE_IDS_WITH_INFERENCE: string[] = Array.from(
  { length: 105 },
  (_, i) => `pass_${String(i + 1).padStart(2, "0")}`
);
