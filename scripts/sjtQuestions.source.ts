import type { SJTQuestion } from "../src/types/sjt";
import { GMP_MAIN_URL } from "../src/data/gmcDomains";

export const SJT_QUESTIONS: SJTQuestion[] = [
  // ─────────────────────────────────────────────────────────────
  // APPROPRIATENESS
  // ─────────────────────────────────────────────────────────────
  {
    id: "app-001",
    type: "appropriateness",
    domain: "colleagues_culture_safety",
    difficulty: "standard",
    stem: `Priya is a final-year medical student on a hospital ward round. She notices that a senior registrar, Dr Mensah, has prescribed a patient a dose of a blood-thinning medication that appears to be twice the standard therapeutic dose. Dr Mensah has already moved on to the next patient. Priya is not completely certain the dose is wrong, but it does appear unusual to her.`,
    pivotInsight:
      "Patient safety always overrides hierarchy and personal discomfort. The question is not whether to act, but how, proportionately and professionally.",
    gmpRef: {
      label: "GMP · Colleagues, culture and safety",
      url: `${GMP_MAIN_URL}/colleagues-culture-and-safety`,
    },
    items: [
      {
        id: "app-001-a",
        text: "Quietly inform Dr Mensah of the apparent discrepancy before the prescription is dispensed.",
        correctRating: "very_appropriate",
        rationale:
          "This is the ideal response. Patient safety requires that concerns are raised promptly and directly with the person responsible. Approaching Dr Mensah privately respects the professional relationship while ensuring the error is reviewed before it can cause harm. GMP is clear that all members of the healthcare team, including students, have a duty to raise patient safety concerns, and doing so directly and promptly is best practice.",
        whyNotAdjacent:
          "'Appropriate' would imply some reservation, but there is none here, this is the textbook response. It is timely, direct, and professional.",
        gmpRef: {
          label: "GMP · Colleagues, culture and safety",
          url: `${GMP_MAIN_URL}/colleagues-culture-and-safety`,
        },
      },
      {
        id: "app-001-b",
        text: "Say nothing, as she might be wrong and it would be embarrassing to challenge a senior.",
        correctRating: "very_inappropriate",
        rationale:
          "GMP is explicit that personal discomfort, hierarchy, or uncertainty does not excuse failing to raise a patient safety concern. A student who stays silent when a potentially dangerous prescription error is in front of them is placing their own comfort above a patient's life. Uncertainty does not remove the duty, it lowers the threshold for raising the concern, not raising it.",
        whyNotAdjacent:
          "'Inappropriate' understates the risk. A significant prescribing error that goes unchallenged can cause serious patient harm. This moves clearly into 'Very Inappropriate' territory.",
        gmpRef: {
          label: "GMP · Colleagues, culture and safety",
          url: `${GMP_MAIN_URL}/colleagues-culture-and-safety`,
        },
      },
      {
        id: "app-001-c",
        text: "Loudly point out the error in front of the whole ward round.",
        correctRating: "inappropriate",
        rationale:
          "Raising a concern is the right instinct, but how it is raised matters. Publicly embarrassing a senior colleague mid-ward round does not align with the collaborative, respectful working culture GMP requires, and may actually make it harder for Dr Mensah to receive the information constructively. The concern is valid; the manner is disproportionate.",
        whyNotAdjacent:
          "This is not 'Very Inappropriate' because the underlying motivation, patient safety, is correct. It is 'Inappropriate' because the execution undermines professional relationships without improving outcomes.",
      },
      {
        id: "app-001-d",
        text: "Raise her concern with the ward pharmacist so they can review the prescription independently.",
        correctRating: "appropriate",
        rationale:
          "Involving the pharmacist is a legitimate safety mechanism. Pharmacists are specifically trained to intercept prescribing errors and would be a reasonable second line of defence. However, it is slightly less direct than speaking to Dr Mensah first, and adds a step that may delay resolution when direct communication is possible. This is appropriate but not the optimal first response.",
        whyNotAdjacent:
          "It is not 'Very Appropriate' because the most direct and effective route is to the prescriber first. Routing through the pharmacist is a sensible backup, not the ideal primary action.",
      },
    ],
  },

  {
    id: "app-002",
    type: "appropriateness",
    domain: "patients_partnership_communication",
    difficulty: "standard",
    stem: `Marcus is a second-year dental student on placement. He is about to perform a routine dental examination on a new patient, Mr Eze, who is 74 years old. Mr Eze speaks limited English and has brought his adult grandson, Theo, to help translate. As Marcus begins the consultation, Theo starts answering questions on behalf of his grandfather without asking him first, and at one point gently rests his hand on his grandfather's arm to stop him responding directly to Marcus.`,
    pivotInsight:
      "Patients with capacity must always be addressed directly, regardless of language barriers or well-meaning relatives. Assumptions about capacity based on age or communication difficulties are never appropriate.",
    gmpRef: {
      label: "GMP · Patients, partnership and communication",
      url: `${GMP_MAIN_URL}/patients-partnership-and-communication`,
    },
    items: [
      {
        id: "app-002-a",
        text: "Continue addressing questions directly to Mr Eze and use Theo to translate the responses.",
        correctRating: "appropriate",
        rationale:
          "A patient with mental capacity should be the primary participant in their own consultation. There is no indication Mr Eze lacks capacity; language is a communication barrier, not a capacity issue. Using Theo to translate while directing questions at Mr Eze is reasonable. However, in this scenario Theo is already answering on his behalf, so continuing without resetting the dynamic is only partly effective.",
        whyNotAdjacent:
          "It is not 'Very Appropriate' because it does not address Theo dominating the consultation. 'Inappropriate' would be too harsh, as directing questions at the patient with a translator is still broadly in line with GMP.",
      },
      {
        id: "app-002-b",
        text: "Allow Theo to lead the conversation as it saves time and Mr Eze seems comfortable.",
        correctRating: "very_inappropriate",
        rationale:
          "Assuming a patient with capacity cannot or should not speak for themselves, based on age, language, or a relative's behaviour, fundamentally undermines patient autonomy and dignity. GMP requires clinicians to ensure patients are involved in decisions about their own care. Deferring to a relative without any assessment of capacity is not acceptable, regardless of convenience or assumed comfort.",
        whyNotAdjacent:
          "This is not merely 'Inappropriate'. Systematically excluding a patient from their own consultation is a serious breach of patient-centred care principles.",
      },
      {
        id: "app-002-c",
        text: "Politely explain to Theo that it is important for Mr Eze to respond in his own words where possible, with Theo translating.",
        correctRating: "very_appropriate",
        rationale:
          "This response actively corrects the dynamic in a respectful, non-confrontational way. It preserves Mr Eze's autonomy, maintains the therapeutic relationship with the family, and sets a clear, professional boundary for how the consultation should proceed. This is an excellent demonstration of patient-centred communication.",
        whyNotAdjacent:
          "This is stronger than continuing without comment because it actively resets the dynamic in a respectful way, while keeping Theo involved as a translator.",
      },
      {
        id: "app-002-d",
        text: "Ask Theo to wait outside so that Marcus can speak to Mr Eze alone.",
        correctRating: "inappropriate",
        rationale:
          "While the intention to restore direct communication with the patient is sound, removing the only available translator would make the consultation impossible and could leave Mr Eze feeling isolated and unsupported. There are better ways to address the issue, such as clarifying Theo's role, without excluding him entirely. This response overcorrects.",
        whyNotAdjacent:
          "It is not 'Very Inappropriate' because the motivation is to protect patient autonomy, which is correct. The execution is however poor and likely to cause harm to the consultation.",
      },
    ],
  },

  {
    id: "app-003",
    type: "appropriateness",
    domain: "trust_professionalism",
    difficulty: "foundation",
    stem: `Lena is a medical student who has been on placement with a GP practice for four weeks. At the end of her placement, the GP supervisor, Dr Anand, invites the whole team to his home for a casual thank-you dinner. The following week, a patient whose case Lena was closely involved with sends a card and a £15 gift voucher to Lena personally, thanking her for her "kindness and attentiveness" during their consultations.`,
    pivotInsight:
      "Modest gifts given after care has concluded, as a genuine expression of gratitude, are generally acceptable when declared and handled appropriately. The concern arises when gifts could reasonably be seen to influence clinical judgement.",
    gmpRef: {
      label: "GMP · Trust and professionalism (gifts)",
      url: `${GMP_MAIN_URL}/trust-and-professionalism`,
    },
    items: [
      {
        id: "app-003-a",
        text: "Accept the gift and inform her GP supervisor, following any local practice policy on gifts.",
        correctRating: "appropriate",
        rationale:
          "A modest token of genuine gratitude from a patient after care has concluded is broadly acceptable under GMP, provided it is declared and handled in line with local policy. Informing her supervisor demonstrates transparency and professional integrity. The gift is small, the clinical relationship is complete, and Lena is not in a position to make clinical decisions that could be influenced by it.",
        whyNotAdjacent:
          "This is a sound, proportionate response. 'Very Appropriate' is slightly strong here; declining (app-003-b) is overcautious but not unreasonable for a student unsure of policy.",
        gmpRef: {
          label: "GMP · Trust and professionalism (gifts)",
          url: `${GMP_MAIN_URL}/trust-and-professionalism`,
        },
      },
      {
        id: "app-003-b",
        text: "Decline the gift and explain to the patient that she cannot accept it.",
        correctRating: "appropriate",
        rationale:
          "Declining a modest thank-you gift is not wrong, students are often uncertain about gift policies and erring on the side of caution is understandable. However, it is not necessary in this case. The gift is small, given after care concluded, and from a patient expressing genuine gratitude. Declining may unnecessarily disappoint the patient and is more cautious than required.",
        whyNotAdjacent:
          "It is not 'Very Appropriate' because no breach has occurred, there is no need to decline. It is 'Appropriate' because the caution, while excessive, comes from a professionally sound instinct.",
      },
      {
        id: "app-003-c",
        text: "Accept the gift without telling anyone, as it was given in good faith.",
        correctRating: "inappropriate",
        rationale:
          "Even a modest gift that is perfectly acceptable to keep should be declared in line with practice policy. Keeping the gift without disclosure lacks the transparency that underpins trust in professional relationships. GMP requires that clinicians manage gifts and benefits honestly, silence is not the same as honest handling.",
        whyNotAdjacent:
          "It is not 'Very Inappropriate' because the gift itself is not problematic. The issue is exclusively the lack of transparency, which places this at 'Inappropriate'.",
      },
      {
        id: "app-003-d",
        text: "Accept the gift and ask the patient if they would mind sending one for the whole team instead.",
        correctRating: "inappropriate",
        rationale:
          "Redirecting a patient's gratitude into a request for a different gift is unprofessional and places the patient in an uncomfortable position. It also risks appearing opportunistic. The appropriate response is to handle the existing gift correctly, not to leverage the patient's gratitude for a more favourable outcome.",
        whyNotAdjacent:
          "This is closer to 'Very Inappropriate' than 'Appropriate', but the underlying gesture of sharing with the team is not inherently wrong, the manner is the problem.",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // IMPORTANCE
  // ─────────────────────────────────────────────────────────────
  {
    id: "imp-001",
    type: "importance",
    domain: "colleagues_culture_safety",
    difficulty: "standard",
    stem: `Amara is a dental student who has been paired with a fellow student, James, for a skills assessment. She has noticed over the past two weeks that James often arrives late to clinical sessions, sometimes smelling faintly of alcohol, and that his hands appear to tremble slightly when handling instruments. Their clinical supervisor has not yet raised any concerns. Amara is trying to decide how to respond to the situation.`,
    pivotInsight:
      "When a colleague's fitness to practise may be impaired, the primary concern must always be patient safety, not colleague loyalty, not personal discomfort. The weight given to each consideration flows directly from how directly it connects to that principle.",
    gmpRef: {
      label: "GMP · Colleagues, culture and safety",
      url: `${GMP_MAIN_URL}/colleagues-culture-and-safety`,
    },
    items: [
      {
        id: "imp-001-a",
        text: "That patients may be placed at risk if James continues to practise in his current state.",
        correctRating: "very_important",
        rationale:
          "This is the most important consideration. Patient safety is the overriding duty of every healthcare professional, including students. GMP is unequivocal that you must act, and act promptly, when there are reasonable grounds to believe a colleague's conduct or health may be putting patients at risk. Everything else in this scenario flows from this concern.",
        whyNotAdjacent:
          "It would be wrong to rate this as merely 'Important'. Patient safety is not one factor among many, it is the primary professional duty.",
        gmpRef: {
          label: "GMP · Colleagues, culture and safety",
          url: `${GMP_MAIN_URL}/colleagues-culture-and-safety`,
        },
      },
      {
        id: "imp-001-b",
        text: "That raising concerns about James could damage their friendship and working relationship.",
        correctRating: "not_important",
        rationale:
          "Personal relationships and professional comfort must not prevent a clinician from acting when patient safety is at risk. GMP explicitly states that the duty to raise concerns is not negated by personal loyalty or the discomfort of reporting a colleague. While the impact on a friendship is an understandable human concern, it has no legitimate weight as a professional consideration in this context.",
        whyNotAdjacent:
          "This should not be rated 'Of Minor Importance'. It is not a professional consideration at all, personal relationships are irrelevant when patient safety is at stake.",
      },
      {
        id: "imp-001-c",
        text: "Whether there might be a personal or health reason behind James's behaviour.",
        correctRating: "important",
        rationale:
          "Understanding whether James is struggling with a health issue, personal crisis, or substance dependency is genuinely important, not because it changes the duty to act, but because it shapes how Amara responds. A compassionate, supportive approach that connects James with help is far better than one that simply reports him without consideration of his wellbeing. GMP acknowledges the duty to support colleagues in difficulty as well as the duty to protect patients.",
        whyNotAdjacent:
          "This is 'Important', not 'Very Important'. It informs how to act, but it does not override patient safety as the primary consideration.",
      },
      {
        id: "imp-001-d",
        text: "That her clinical supervisor has not already raised the issue.",
        correctRating: "minor_importance",
        rationale:
          "The fact that a supervisor has not yet acted does not remove Amara's own duty to raise concerns. Students and junior clinicians cannot defer their professional responsibilities upwards and assume that silence from a senior means no concern exists. It is worth considering as context, perhaps the supervisor has noticed and is already managing it, but it is of minor importance as a reason for Amara to stay silent.",
        whyNotAdjacent:
          "It is not 'Not Important at All', the supervisor's awareness is relevant context. But it should never be used as a justification for inaction.",
      },
    ],
  },

  {
    id: "imp-002",
    type: "importance",
    domain: "knowledge_skills_development",
    difficulty: "foundation",
    stem: `Callum is a medical student who has just started a surgery placement. During his second week, a registrar asks him to assist with a minor procedure. Callum has not been trained on this specific technique at university, although he has seen it demonstrated once. He is flattered to be asked and does not want to appear incompetent in front of the surgical team. He is thinking about how to respond.`,
    pivotInsight:
      "Honesty about the limits of your competence is not weakness, it is a core professional duty. A student who overstates their abilities to avoid embarrassment is placing patient safety at risk.",
    gmpRef: {
      label: "GMP · Knowledge, skills and development",
      url: `${GMP_MAIN_URL}/knowledge-skills-and-development`,
    },
    items: [
      {
        id: "imp-002-a",
        text: "That he has not received formal training in this technique.",
        correctRating: "very_important",
        rationale:
          "Callum must be honest about his level of competence before agreeing to assist. GMP requires all clinicians, including students, to recognise and work within the limits of their knowledge and skills. Proceeding with a technique he has only seen once and not been formally trained in, without disclosing this, risks patient harm and breaches the foundational duty of honest self-assessment.",
        whyNotAdjacent:
          "This cannot be merely 'Important'. Concealing a competence gap when preparing to perform a clinical procedure is directly linked to patient safety.",
        gmpRef: {
          label: "GMP · Knowledge, skills and development",
          url: `${GMP_MAIN_URL}/knowledge-skills-and-development`,
        },
      },
      {
        id: "imp-002-b",
        text: "That the registrar may think less of him if he admits he is not confident.",
        correctRating: "not_important",
        rationale:
          "Professional reputation and perceived competence are not valid considerations when deciding whether to disclose a skills gap. GMP is clear that personal interest or reputation must never take precedence over patient safety and honest practice. In reality, a registrar is more likely to respect a student who is honest about their limits than one who overreaches.",
        whyNotAdjacent:
          "This is not even 'Of Minor Importance'. It is not a legitimate professional consideration. Personal image must have no weight in clinical safety decisions.",
      },
      {
        id: "imp-002-c",
        text: "That this is an opportunity to develop a new clinical skill under supervision.",
        correctRating: "important",
        rationale:
          "Learning new skills under appropriate supervision is one of the core purposes of a clinical placement and is encouraged by GMP. If Callum discloses his lack of training and the registrar provides direct supervision, this becomes a legitimate and valuable learning opportunity. The consideration is important, but only after the competence gap has been disclosed, not as a reason to overlook it.",
        whyNotAdjacent:
          "It is 'Important' but not 'Very Important'. It is only valid as a consideration after the safety question has been properly addressed.",
      },
      {
        id: "imp-002-d",
        text: "Whether the registrar is aware of what procedures are typically taught at his university.",
        correctRating: "important",
        rationale:
          "Whether the registrar knows what Callum has been trained to do matters for safe delegation and supervision. If the registrar assumes competence that is not there, the risk to the patient increases. This does not remove Callum's duty to disclose his limits, but supervisor awareness of training is an important consideration alongside his own honesty.",
        whyNotAdjacent:
          "It is more than 'Of Minor Importance' because it directly affects whether supervision and delegation are safe. It is not 'Very Important' because Callum must still disclose regardless of what the registrar assumes.",
      },
    ],
  },

  {
    id: "imp-003",
    type: "importance",
    domain: "patients_partnership_communication",
    difficulty: "challenging",
    stem: `Nina is a final-year medical student assisting in a GP consultation. The patient, a 45-year-old woman named Mrs Osei, has been diagnosed with type 2 diabetes and needs to start medication. The GP asks Nina to explain the medication and answer any questions while he briefly steps out. Mrs Osei nods along but asks no questions. Partway through Nina's explanation, it becomes clear to Nina that Mrs Osei may not have fully understood what she has been told. Nina is considering how to proceed.`,
    pivotInsight:
      "Checking understanding is not the same as giving information. A patient nodding is not evidence of informed consent, genuine understanding requires active verification.",
    gmpRef: {
      label: "GMP · Patients, partnership and communication",
      url: `${GMP_MAIN_URL}/patients-partnership-and-communication`,
    },
    items: [
      {
        id: "imp-003-a",
        text: "That Mrs Osei may not have fully understood the information she has been given.",
        correctRating: "very_important",
        rationale:
          "For a patient to make an informed decision about their treatment, they must genuinely understand the information they have received. GMP requires that patients are given the opportunity to understand, not merely to hear, information about their care. If Nina has reason to believe understanding is absent, she must act on that. Starting a new medication without understanding what it is, why it is needed, and what to expect compromises the patient's autonomy and safety.",
        whyNotAdjacent:
          "This is the core issue in this scenario and cannot be rated lower than 'Very Important'. Informed consent is a fundamental patient right.",
        gmpRef: {
          label: "GMP · Patients, partnership and communication",
          url: `${GMP_MAIN_URL}/patients-partnership-and-communication`,
        },
      },
      {
        id: "imp-003-b",
        text: "That the GP will be back shortly and can pick up the explanation.",
        correctRating: "minor_importance",
        rationale:
          "The GP's return is relevant context but does not reduce Nina's immediate responsibility. Nina has been asked to explain the medication and is currently in the room with a patient who may not understand. Waiting and deferring the conversation entirely is unlikely to serve the patient well, and if Nina leaves the room without addressing the concern, the GP may not know to revisit it. Nina should act now, within her competence.",
        whyNotAdjacent:
          "This is of minor importance. It is not irrelevant, but it should not be used as a reason for Nina to disengage from a patient who needs clearer communication.",
      },
      {
        id: "imp-003-c",
        text: "Whether there are any language or health literacy barriers affecting Mrs Osei's understanding.",
        correctRating: "very_important",
        rationale:
          "Understanding why a patient may be struggling to follow an explanation is essential to addressing it effectively. Language, health literacy, anxiety, and many other factors can all affect how patients process clinical information. GMP requires clinicians to communicate in a way that patients can understand, which means adapting the approach based on the individual patient's needs. Identifying what is causing the comprehension difficulty is as important as recognising that it exists.",
        whyNotAdjacent:
          "This is not merely 'Important'. It is directly tied to the patient's ability to give informed consent, which is a fundamental GMP obligation.",
      },
      {
        id: "imp-003-d",
        text: "That Nina should complete the explanation she was asked to give before raising concerns.",
        correctRating: "not_important",
        rationale:
          "Completing an explanation that is not being understood does not serve the patient. If Nina recognises mid-explanation that Mrs Osei is not following, continuing as if nothing has changed would compound the problem. GMP requires responsiveness to patients, clinicians must adapt in real time, not adhere rigidly to a plan that is clearly not working.",
        whyNotAdjacent:
          "This is appropriately rated 'Not Important at All'. Prioritising task completion over patient understanding is contrary to patient-centred care.",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // RANKING
  // ─────────────────────────────────────────────────────────────
  {
    id: "rank-001",
    type: "ranking",
    domain: "colleagues_culture_safety",
    difficulty: "standard",
    stem: `Yusuf is a medical student on a hospital placement. After a long shift, he overhears two qualified nurses discussing a patient's confidential diagnosis loudly in the hospital café, where other patients, visitors, and staff can clearly hear the conversation. The nurses are not aware they are being overheard. Yusuf recognises the patient as someone he saw on the ward that morning.`,
    pivotInsight:
      "This tests whether you prioritise patient confidentiality appropriately, choose a proportionate response, and distinguish between passive inaction and active escalation.",
    gmpRef: {
      label: "GMP · Patients, partnership and communication (confidentiality)",
      url: `${GMP_MAIN_URL}/patients-partnership-and-communication`,
    },
    items: [
      {
        id: "rank-001-a",
        text: "Politely let the nurses know that their conversation can be overheard and suggest they move somewhere private.",
        rank: 1,
        rationale:
          "This is the most appropriate response. Patient confidentiality is a core GMP duty. A direct, respectful intervention addresses the breach immediately, protects the patient, and does so in a proportionate, non-escalatory way. The nurses are likely unaware and will almost certainly respond positively to a quiet word.",
      },
      {
        id: "rank-001-b",
        text: "Report the nurses to their ward manager immediately after leaving the café.",
        rank: 2,
        rationale:
          "Escalating a confidentiality breach is appropriate and may be necessary if the nurses are unreceptive or if the breach was deliberate. However, escalating without first attempting a direct, private intervention is disproportionate as a first step, especially given that the nurses appear unaware. This is the right second step, not the first.",
      },
      {
        id: "rank-001-c",
        text: "Walk away and say nothing, as it is not his place as a student to challenge qualified staff.",
        rank: 3,
        rationale:
          "This is the least appropriate response. Hierarchy and student status do not override the duty to protect patient confidentiality. GMP applies to students too, they are not bystanders. Staying silent while a patient's private medical information is being disclosed in a public space is a failure to act on a clear professional responsibility.",
      },
    ],
  },

  {
    id: "rank-002",
    type: "ranking",
    domain: "knowledge_skills_development",
    difficulty: "challenging",
    stem: `Fatima is a dental student in her third year. During a supervised clinical session, her tutor, Dr Patel, briefly leaves the room to take an urgent phone call. While Dr Patel is away, the patient, who is mid-procedure, begins to express discomfort and asks Fatima if she can continue with the treatment herself to get it over with. Fatima is not yet signed off to perform this procedure independently.`,
    pivotInsight:
      "A student's competence boundary is non-negotiable, regardless of patient preference or pressure. The question is how to manage the situation with compassion and without leaving the patient worse off.",
    gmpRef: {
      label: "GMP · Knowledge, skills and development",
      url: `${GMP_MAIN_URL}/knowledge-skills-and-development`,
    },
    items: [
      {
        id: "rank-002-a",
        text: "Reassure the patient, pause the procedure, and go to find Dr Patel immediately.",
        rank: 1,
        rationale:
          "Patient safety requires that Fatima stays within her competence. She cannot perform the procedure unsupervised. However, leaving the patient without explanation or reassurance would be poor practice, so the ideal response combines both: clear, compassionate communication followed by immediate action to retrieve appropriate supervision. This is the most appropriate response.",
      },
      {
        id: "rank-002-b",
        text: "Explain to the patient that she is not yet qualified to continue alone, and wait calmly until Dr Patel returns.",
        rank: 2,
        rationale:
          "Being honest with the patient about her limitations is correct and respectful. However, simply waiting is less proactive than going to find Dr Patel, who may be unaware that the patient is in discomfort and the procedure has stalled. This is appropriate but not optimal, active retrieval of the supervisor is preferable to passive waiting.",
      },
      {
        id: "rank-002-c",
        text: "Continue the procedure to avoid distressing the patient further, given that she has already seen it performed many times.",
        rank: 3,
        rationale:
          "This is the least appropriate response. Familiarity with a procedure does not constitute sign-off or competence. Proceeding outside the limits of her authorised practice, however well-intentioned, puts the patient at risk, breaches GMP, and could have serious consequences for both the patient and Fatima. Patient preference cannot override clinical safety boundaries.",
      },
    ],
  },

  {
    id: "rank-003",
    type: "ranking",
    domain: "trust_professionalism",
    difficulty: "standard",
    stem: `Isabelle is a medical student who has been asked by a friend from her course, Daniel, to help him prepare a reflective learning log that is required for their placement portfolio. Daniel has missed several placement sessions due to personal difficulties and is now significantly behind. He asks Isabelle to write some reflective entries on his behalf, describing experiences she had that he can adapt as if they were his own. He tells her he will fail the placement without it.`,
    pivotInsight:
      "Academic integrity sits at the heart of professional trust. A clinician who fabricates records in training will fabricate records in practice. Isabelle's response must be honest and supportive, but not complicit.",
    gmpRef: {
      label: "GMP · Trust and professionalism (honesty and integrity)",
      url: `${GMP_MAIN_URL}/trust-and-professionalism`,
    },
    items: [
      {
        id: "rank-003-a",
        text: "Decline to write the entries, but offer to help Daniel approach his placement supervisor honestly to discuss his situation and options.",
        rank: 1,
        rationale:
          "This is the most appropriate response. GMP requires absolute honesty in all professional documentation. Writing reflective entries on someone else's behalf is dishonest, regardless of the circumstances. However, Isabelle can still support Daniel in a legitimate way, by encouraging transparency with his supervisor, who may be able to offer extensions, additional sessions, or alternative arrangements. Supporting a colleague honestly is far more valuable than helping them deceive.",
      },
      {
        id: "rank-003-b",
        text: "Decline to help and encourage Daniel to speak to the placement office about his personal difficulties.",
        rank: 2,
        rationale:
          "Declining is correct and refusing to be party to academic dishonesty is the right professional choice. Directing Daniel to the placement office is also sound. However, this response is slightly less supportive than rank 1, it does not offer Isabelle's active assistance in navigating the situation, and Daniel may find it harder to take that step alone. The response is appropriate but less compassionate in its execution.",
      },
      {
        id: "rank-003-c",
        text: "Write the reflective entries for Daniel, as he is clearly struggling and the entries are based on real experiences from the placement.",
        rank: 3,
        rationale:
          "This is the least appropriate response. Fabricating professional documentation, even based on real events, is dishonest and directly contrary to GMP. A doctor who is willing to falsify records under personal pressure is a risk to patients and to the profession. Compassion for a friend does not justify academic fraud. If discovered, both students could face serious disciplinary consequences.",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // APPROPRIATENESS (continued)
  // ─────────────────────────────────────────────────────────────
  {
    id: "app-004",
    type: "appropriateness",
    domain: "trust_professionalism",
    difficulty: "foundation",
    stem: `Tom is a medical student who, while scrolling through social media, sees a post from his classmate Rajesh. Rajesh has uploaded a photograph taken on a hospital ward, captioned with details about an interesting case he observed that day. No patient names are mentioned, but a patient visible in the background is partially identifiable. Tom recognises the ward from his own placement.`,
    pivotInsight:
      "Confidentiality does not require a name. Any information that could allow a patient to be identified, including context, ward, or case details, constitutes a potential breach, regardless of intent.",
    gmpRef: {
      label: "GMP · Trust and professionalism",
      url: `${GMP_MAIN_URL}/trust-and-professionalism`,
    },
    items: [
      {
        id: "app-004-a",
        text: "Message Rajesh privately to explain the potential confidentiality concern and suggest he remove the post.",
        correctRating: "very_appropriate",
        rationale:
          "This is the ideal first step. Patient confidentiality is a fundamental GMP duty and a legal obligation. Raising the issue directly and privately with Rajesh gives him the opportunity to correct the situation immediately. Most students are unaware of exactly how confidentiality applies to social media, a supportive, private approach is proportionate and likely to be effective.",
        whyNotAdjacent:
          "This is not merely 'Appropriate', it is the textbook response. Prompt, direct, private communication is exactly what GMP and professional social media guidance recommend.",
        gmpRef: {
          label: "GMP · Trust and professionalism",
          url: `${GMP_MAIN_URL}/trust-and-professionalism`,
        },
      },
      {
        id: "app-004-b",
        text: "Report the post directly to the medical school without speaking to Rajesh first.",
        correctRating: "appropriate",
        rationale:
          "Escalating a potential confidentiality breach is legitimate. However, going directly to the institution without first attempting a private conversation with Rajesh is disproportionate as an initial step, especially if he is simply unaware of the issue. If he ignores a private message or refuses to remove the post, formal escalation becomes necessary. This is appropriate as a second step, not the first.",
        whyNotAdjacent:
          "It is not 'Very Appropriate' because a direct conversation should come first. It is not 'Inappropriate' because escalation is always a valid route when patient confidentiality is at risk.",
      },
      {
        id: "app-004-c",
        text: "Screenshot the post and share it with other classmates as a warning about social media misuse.",
        correctRating: "inappropriate",
        rationale:
          "While the intention to educate peers may be well-meaning, sharing the post further distributes the potential privacy breach to a wider audience. It compounds the problem rather than resolving it. This is inappropriate even though it comes from a place of professional concern.",
        whyNotAdjacent:
          "This is 'Inappropriate' rather than 'Very Inappropriate' because the underlying motivation, raising awareness, is professionally sound. The method is the problem.",
      },
      {
        id: "app-004-d",
        text: "Ignore it, as no patient names were included and the image was not posted with malicious intent.",
        correctRating: "very_inappropriate",
        rationale:
          "Patient confidentiality is not contingent on names. GMP and GMC social media guidance are explicit that patients can be identifiable through context, background, or case details even without names being used. A partially visible patient on a ward, with case details in the caption, constitutes a real risk. Inaction in the face of a clear confidentiality concern is not passive, it is a failure to act on a professional duty.",
        whyNotAdjacent:
          "This is correctly 'Very Inappropriate'. Intent is not a defence for a confidentiality breach, and staying silent perpetuates the problem.",
      },
    ],
  },

  {
    id: "app-005",
    type: "appropriateness",
    domain: "colleagues_culture_safety",
    difficulty: "challenging",
    stem: `Orla is a final-year medical student observing a ward round led by a consultant, Mr Barratt. A nurse, Sandra, interrupts to report that a patient has been showing signs of deterioration since the last review. Mr Barratt dismisses her abruptly: "I reviewed this patient an hour ago. She is fine. Please do not interrupt ward rounds." Sandra looks frustrated but says nothing further. The ward round continues.`,
    pivotInsight:
      "Nurses are often the first to detect deterioration. A student's duty to act on patient safety concerns does not disappear because the concern was raised by someone else and dismissed by someone senior.",
    gmpRef: {
      label: "GMP · Colleagues, culture and safety",
      url: `${GMP_MAIN_URL}/colleagues-culture-and-safety`,
    },
    items: [
      {
        id: "app-005-a",
        text: "At the earliest safe opportunity, check on the patient, speak to Sandra privately to acknowledge her concern, and suggest she documents it formally.",
        correctRating: "appropriate",
        rationale:
          "This response takes Sandra's concern seriously and acts in a measured way. Checking the patient and encouraging formal documentation are reasonable steps for a senior student. However, waiting until after the full ward round may delay action when deterioration is possible. GMP requires patient safety concerns to be followed up promptly.",
        whyNotAdjacent:
          "It is 'Appropriate' rather than 'Very Appropriate' because timing matters when a nurse has raised possible deterioration. 'Inappropriate' would be too harsh, as the steps themselves are sound.",
        gmpRef: {
          label: "GMP · Colleagues, culture and safety",
          url: `${GMP_MAIN_URL}/colleagues-culture-and-safety`,
        },
      },
      {
        id: "app-005-b",
        text: "Say nothing during the ward round, but raise her concerns with her own educational supervisor afterwards.",
        correctRating: "appropriate",
        rationale:
          "Discussing a patient safety concern with a trusted supervisor is a reasonable response. However, it is less direct than checking on the patient and engaging with Sandra, and there is a risk that time passes before anything is acted upon. It is appropriate but not the most proactive option.",
        whyNotAdjacent:
          "This is 'Appropriate' but not 'Very Appropriate', it relies on a third party to act on a concern Orla could address more directly herself.",
      },
      {
        id: "app-005-c",
        text: "Say nothing, Mr Barratt is the consultant, has reviewed the patient, and it is not Orla's place to second-guess him.",
        correctRating: "very_inappropriate",
        rationale:
          "Hierarchy does not override patient safety. GMP is explicit that all members of the healthcare team, including students, have a duty to act when there is a reasonable concern about a patient's wellbeing. Deferring entirely to a consultant who dismissed a concern without re-examination is not acceptable professional behaviour.",
        whyNotAdjacent:
          "This is correctly 'Very Inappropriate'. Staying silent in the face of a possible patient deterioration is a patient safety failure, regardless of the seniority of those involved.",
      },
      {
        id: "app-005-d",
        text: "Politely ask Mr Barratt, during the ward round, to pause and reconsider Sandra's concern or arrange an immediate review of the patient.",
        correctRating: "very_appropriate",
        rationale:
          "When a nurse reports possible deterioration and is dismissed, prompt action matters. A polite, professional request to pause or review the patient addresses an immediate patient safety concern without ignoring Sandra. Students should not defer entirely to hierarchy when a patient may be at risk.",
        whyNotAdjacent:
          "This is 'Very Appropriate' because the concern is acute and may need action before the ward round ends. 'Appropriate' would understate the urgency when deterioration is possible.",
      },
    ],
  },

  {
    id: "app-006",
    type: "appropriateness",
    domain: "patients_partnership_communication",
    difficulty: "standard",
    stem: `Zara is a dental student assisting Dr Pearce in a consultation. The patient, Mr Holloway, aged 58, has been advised to have a failing molar extracted. Dr Pearce has explained the clinical need clearly and Mr Holloway has confirmed he understands. He says he would prefer to try antibiotics first to see if the pain settles. Dr Pearce looks visibly frustrated, says this is "not the right choice", and briefly leaves the room, asking Zara to "see if you can change his mind."`,
    pivotInsight:
      "A competent adult patient has the right to decline recommended treatment. The role of the clinician, and the student, is to ensure the decision is truly informed, not to override it.",
    gmpRef: {
      label: "GMP · Patients, partnership and communication",
      url: `${GMP_MAIN_URL}/patients-partnership-and-communication`,
    },
    items: [
      {
        id: "app-006-a",
        text: "Ask Mr Holloway about his main concerns regarding the extraction and ensure he understands the likely consequences of delaying treatment.",
        correctRating: "very_appropriate",
        rationale:
          "GMP requires that patients are given the information they need to make a genuinely informed decision. Understanding what is driving Mr Holloway's preference, anxiety, a previous bad experience, cost, allows Zara to provide useful information. Checking his understanding of the consequences ensures the decision, whatever it is, is fully informed. This is patient-centred care.",
        whyNotAdjacent:
          "This is the ideal response. It respects autonomy, fulfils the duty to inform, and is led by the patient's concerns rather than an agenda.",
        gmpRef: {
          label: "GMP · Patients, partnership and communication",
          url: `${GMP_MAIN_URL}/patients-partnership-and-communication`,
        },
      },
      {
        id: "app-006-b",
        text: "Encourage Mr Holloway to trust Dr Pearce's recommendation, as she has many years of clinical experience.",
        correctRating: "inappropriate",
        rationale:
          "Using the clinician's authority as a reason for the patient to comply undermines the patient's autonomy and informed consent. GMP is clear that patients must not be pressured into decisions. Substituting deference for genuine engagement with the patient's concerns is not patient-centred care.",
        whyNotAdjacent:
          "This is 'Inappropriate' rather than 'Very Inappropriate', the intention is to help the patient receive the clinically appropriate treatment, but the method compromises patient autonomy.",
      },
      {
        id: "app-006-c",
        text: "Respect Mr Holloway's stated preference and, when Dr Pearce returns, ensure she is aware he has declined the extraction and chosen to try antibiotics.",
        correctRating: "very_appropriate",
        rationale:
          "A competent patient who has made an informed decision has the legal right to decline treatment. Respecting that decision and ensuring it is clearly communicated to the treating clinician is entirely appropriate. This ensures continuity of care, proper documentation, and respects Mr Holloway's rights. The key is that the decision was made with full understanding of the consequences.",
        whyNotAdjacent:
          "This is 'Very Appropriate'. Respecting an informed refusal while ensuring it is documented and communicated to the treating clinician is exactly the correct professional response.",
      },
      {
        id: "app-006-d",
        text: "Explain to Mr Holloway that refusing the extraction will almost certainly lead to a much more serious and expensive problem.",
        correctRating: "inappropriate",
        rationale:
          "Patients should be informed of the likely consequences of declining treatment. However, framing clinical information as a persuasion technique, particularly after Dr Pearce has already explained the risks, crosses into pressure territory. If Mr Holloway already understands the risk, repeating it with emphasis is not informing him: it is attempting to coerce him. The aim is to inform, not to override.",
        whyNotAdjacent:
          "This is 'Inappropriate' rather than 'Very Inappropriate'. Providing clinical information about consequences is valid; using it as a lever to reverse a patient's decision is not.",
      },
    ],
  },

  {
    id: "app-007",
    type: "appropriateness",
    domain: "colleagues_culture_safety",
    difficulty: "challenging",
    stem: `Remi is a medical student observing a consultation at a care home. The attending nurse, Carl, is helping an elderly patient, Mrs Thornton, out of a chair. As Carl does so, Remi notices that Carl grips Mrs Thornton's arm very tightly, causing her to wince and tense. When Remi looks more carefully, he notices several faint bruises on both of Mrs Thornton's upper arms. Carl does not appear to notice Mrs Thornton's reaction and continues moving her to another chair.`,
    pivotInsight:
      "Students are not passive observers. Where a vulnerable patient may be experiencing harm, GMP requires action, not certainty, not seniority, not permission.",
    gmpRef: {
      label: "GMP · Colleagues, culture and safety",
      url: `${GMP_MAIN_URL}/colleagues-culture-and-safety`,
    },
    items: [
      {
        id: "app-007-a",
        text: "Calmly ask Mrs Thornton if she is all right, and promptly document and report his observations to a senior member of staff.",
        correctRating: "very_appropriate",
        rationale:
          "Checking on the patient directly is a compassionate immediate response and may allow her to disclose further concerns. Documenting and reporting what was observed is a core GMP duty, students must raise concerns about patient safety, even when those concerns involve qualified colleagues. The combination of direct patient check and timely, documented reporting is the ideal response.",
        whyNotAdjacent:
          "This is 'Very Appropriate': it prioritises patient welfare, acts immediately and compassionately, and uses proper reporting channels.",
        gmpRef: {
          label: "GMP · Colleagues, culture and safety",
          url: `${GMP_MAIN_URL}/colleagues-culture-and-safety`,
        },
      },
      {
        id: "app-007-b",
        text: "Speak to Carl privately after the consultation and ask him to be more careful when handling patients.",
        correctRating: "inappropriate",
        rationale:
          "Speaking privately to Carl alone, without involving a senior, risks the concern being dismissed and Mrs Thornton remaining vulnerable. Where physical harm to a patient is possible, particularly given the visible bruising, the matter must be escalated appropriately. A quiet word with the person involved is not sufficient when safeguarding is a possibility.",
        whyNotAdjacent:
          "This is 'Inappropriate' rather than 'Very Inappropriate' because speaking to Carl is not entirely wrong in isolation. The problem is that it bypasses the safeguarding escalation that the bruising makes necessary.",
      },
      {
        id: "app-007-c",
        text: "Say nothing, Carl is a qualified nurse, may simply have been clumsy, and Remi cannot be certain he saw what he thinks he saw.",
        correctRating: "very_inappropriate",
        rationale:
          "GMP does not require certainty before raising a concern, it requires reasonable grounds. Mrs Thornton winced in pain and has visible bruising on both arms. Staying silent because the evidence is imperfect allows potential harm to continue. Qualification does not make a colleague immune from causing harm, and students are not bystanders when patient safety is at risk.",
        whyNotAdjacent:
          "This is correctly 'Very Inappropriate'. Uncertainty is not an excuse for inaction where a vulnerable patient may be experiencing harm.",
      },
      {
        id: "app-007-d",
        text: "Interrupt the transfer to tell Carl that his handling technique appears to be causing the patient discomfort.",
        correctRating: "appropriate",
        rationale:
          "Raising the concern in the moment, when a patient has visibly reacted to pain, is not unreasonable and may prevent immediate further harm. However, interrupting without having first formed a clearer picture of the situation is not the most measured response. The underlying instinct is correct; the approach requires more care, particularly given the possible safeguarding dimension.",
        whyNotAdjacent:
          "This is 'Appropriate' but not 'Very Appropriate'. Immediate action is warranted, but the response should be proportionate and take account of the broader safeguarding concern.",
      },
    ],
  },

  {
    id: "app-008",
    type: "appropriateness",
    domain: "trust_professionalism",
    difficulty: "standard",
    stem: `Elena is a final-year medical student who was present during a consultation that has since become the subject of a formal patient complaint. A senior registrar, Dr Novak, approaches Elena privately before she is due to give her account to the hospital's complaints team. Dr Novak tells her that it would "look better for everyone" if she kept her account "broad and non-specific" rather than describing exactly what she witnessed.`,
    pivotInsight:
      "Honesty in formal investigations is a non-negotiable GMP requirement. Adjusting an account under pressure from a senior is not loyalty, it is dishonesty that undermines the investigation and risks the patient.",
    gmpRef: {
      label: "GMP · Trust and professionalism",
      url: `${GMP_MAIN_URL}/trust-and-professionalism`,
    },
    items: [
      {
        id: "app-008-a",
        text: "Give an honest, accurate account of exactly what she observed to the complaints team.",
        correctRating: "very_appropriate",
        rationale:
          "GMP requires absolute honesty in all professional matters, including formal investigations. Elena's account is sought because she was present, the complaints process depends on accurate information to identify what went wrong and prevent recurrence. Giving an honest account is the only professionally acceptable course of action, regardless of any pressure from colleagues.",
        whyNotAdjacent:
          "This is the required professional standard, not an optional extra. It cannot be rated merely 'Appropriate'.",
        gmpRef: {
          label: "GMP · Trust and professionalism",
          url: `${GMP_MAIN_URL}/trust-and-professionalism`,
        },
      },
      {
        id: "app-008-b",
        text: "Speak to her own educational supervisor before giving her statement, explaining the pressure she has been placed under.",
        correctRating: "appropriate",
        rationale:
          "Seeking guidance from a trusted supervisor before navigating a difficult situation is entirely reasonable. It ensures Elena has appropriate advice and is not left to manage the pressure alone. However, this does not replace the obligation to give an honest account, it is a sensible additional step.",
        whyNotAdjacent:
          "This is 'Appropriate' because seeking support is sound, but Elena's duty to give an honest account exists regardless. It is not the most complete response on its own.",
      },
      {
        id: "app-008-c",
        text: "Give a deliberately vague and non-specific account to avoid implicating Dr Novak.",
        correctRating: "very_inappropriate",
        rationale:
          "Deliberately providing an inaccurate or incomplete account in a formal complaint investigation is dishonest and may itself constitute professional misconduct. GMP is clear that honesty must be maintained in all professional dealings. Compromising the integrity of a patient safety investigation to protect a colleague is a serious breach of professional standards.",
        whyNotAdjacent:
          "This is correctly 'Very Inappropriate'. This is not discretion, it is dishonesty in a formal legal setting.",
      },
      {
        id: "app-008-d",
        text: "Tell Dr Novak she is uncomfortable with the request, but agree to avoid specific details in her account.",
        correctRating: "inappropriate",
        rationale:
          "Voicing discomfort while still complying with the inappropriate request is not sufficient. Elena may feel she has acknowledged the problem, but the result is the same: an inaccurate account that undermines the investigation. GMP requires honesty, acknowledging that a request is uncomfortable does not excuse complying with it.",
        whyNotAdjacent:
          "This is 'Inappropriate' rather than 'Very Inappropriate' because the discomfort shows some awareness of the ethical problem, but the action ultimately fails the patient and the process.",
      },
    ],
  },

  {
    id: "app-009",
    type: "appropriateness",
    domain: "knowledge_skills_development",
    difficulty: "foundation",
    stem: `Sasha is a second-year medical student on a GP placement. Her supervising GP, Dr Walsh, is called away unexpectedly to deal with an urgent prescription query. Before leaving, she asks Sasha to "hold the fort" for a few minutes. The next patient, Mr Delaney, enters the consulting room and begins describing his symptoms. He is clearly unwell and visibly distressed.`,
    pivotInsight:
      "A student cannot act as a substitute clinician, but that does not mean abandoning a distressed patient. The priority is patient welfare and prompt retrieval of an appropriate clinician.",
    gmpRef: {
      label: "GMP · Knowledge, skills and development",
      url: `${GMP_MAIN_URL}/knowledge-skills-and-development`,
    },
    items: [
      {
        id: "app-009-a",
        text: "Let Mr Delaney know she is a student and cannot complete the consultation, stay with him to listen, and find Dr Walsh as promptly as possible.",
        correctRating: "very_appropriate",
        rationale:
          "This response prioritises the patient's immediate welfare while staying within the limits of Sasha's competence. Acknowledging her role honestly is required by GMP; staying with the patient and listening shows compassion; and locating the GP promptly ensures appropriate care is provided without unnecessary delay. This is the ideal balance.",
        whyNotAdjacent:
          "This is the textbook response, compassionate, honest, and safety-focused. It cannot be rated merely 'Appropriate'.",
        gmpRef: {
          label: "GMP · Knowledge, skills and development",
          url: `${GMP_MAIN_URL}/knowledge-skills-and-development`,
        },
      },
      {
        id: "app-009-b",
        text: "Explain to Mr Delaney that she cannot help and ask him to return to the waiting room until the GP returns.",
        correctRating: "inappropriate",
        rationale:
          "Sending an unwell, distressed patient to wait alone without support is not patient-centred. While Sasha cannot complete the consultation, she is capable of sitting with the patient, acknowledging his distress, and getting help quickly. Turning him away lacks any regard for his immediate welfare.",
        whyNotAdjacent:
          "This is 'Inappropriate' rather than 'Very Inappropriate' because Sasha is not ignoring Mr Delaney entirely, but dismissing a distressed patient is a poor response.",
      },
      {
        id: "app-009-c",
        text: "Take a brief history and perform an initial examination to save time when the GP returns.",
        correctRating: "very_inappropriate",
        rationale:
          "Taking an unsupervised history and performing an examination on an unwell patient at a level she is not trained or authorised for risks patient safety. Sasha cannot clinically interpret findings or manage any deterioration. Exceeding her role without supervision is not acceptable, regardless of how well-intentioned the motivation.",
        whyNotAdjacent:
          "This is correctly 'Very Inappropriate'. Working unsupervised outside her competence level places the patient at direct clinical risk.",
      },
      {
        id: "app-009-d",
        text: "Introduce herself, let Mr Delaney start describing his symptoms, and step out briefly to locate Dr Walsh as quickly as possible.",
        correctRating: "appropriate",
        rationale:
          "Letting the patient begin to describe his concerns while moving quickly to find the GP is helpful and practical. It shows awareness of both the patient's needs and Sasha's own limitations. It is slightly less ideal than staying with the patient while sending someone else to retrieve the GP, but it is a sound and reasonable course of action.",
        whyNotAdjacent:
          "This is 'Appropriate' but not 'Very Appropriate', remaining with the patient while assistance is retrieved would better serve Mr Delaney's immediate welfare.",
      },
    ],
  },

  {
    id: "app-010",
    type: "appropriateness",
    domain: "patients_partnership_communication",
    difficulty: "challenging",
    stem: `Jake is a dental student assisting in a special care dental clinic. The next patient, Brendan, is a 34-year-old man with severe autism who communicates primarily through a symbol board. His paid carer tells the team: "He's always like this, he's fine." As the dentist prepares to begin the procedure, Brendan is rocking repeatedly, making vocalisations, and pulling at his bib. The carer continues to insist the team should "just get on with it."`,
    pivotInsight:
      "Non-verbal communication is still communication. A patient who cannot speak in words may be clearly indicating distress through behaviour, and that signal must be taken seriously regardless of what a carer asserts.",
    gmpRef: {
      label: "GMP · Patients, partnership and communication",
      url: `${GMP_MAIN_URL}/patients-partnership-and-communication`,
    },
    items: [
      {
        id: "app-010-a",
        text: "Suggest pausing the procedure to allow Brendan time to settle and to use his symbol board to establish his current wishes.",
        correctRating: "very_appropriate",
        rationale:
          "Brendan is displaying multiple behavioural signs of distress. Proceeding with treatment on a patient who cannot verbalise consent or distress risks harm and potentially breaches his rights under mental capacity frameworks. Pausing to use his communication aids is proportionate, compassionate, and clinically correct. The carer's assertion does not override the patient's expressed distress.",
        whyNotAdjacent:
          "This is 'Very Appropriate'. Patient safety and dignity require that distress signals, however communicated, are responded to before proceeding.",
        gmpRef: {
          label: "GMP · Patients, partnership and communication",
          url: `${GMP_MAIN_URL}/patients-partnership-and-communication`,
        },
      },
      {
        id: "app-010-b",
        text: "Proceed as the carer instructs, carers know their patients and will say if something is seriously wrong.",
        correctRating: "very_inappropriate",
        rationale:
          "Deferring entirely to a carer when a patient is displaying signs of distress is not acceptable. The carer is not the clinical decision-maker. GMP requires clinicians to respond to the patient in front of them. Proceeding with a procedure on a visibly distressed patient who cannot verbalise consent is a serious breach of patient dignity and safety.",
        whyNotAdjacent:
          "This is correctly 'Very Inappropriate'. Dismissing a patient's behavioural communication as irrelevant is both a safety and dignity failure.",
      },
      {
        id: "app-010-c",
        text: "Ask the carer to help communicate with Brendan via his symbol board before the team proceeds.",
        correctRating: "appropriate",
        rationale:
          "Involving the carer as a communication facilitator, rather than a proxy decision-maker, is helpful and appropriate. It uses available resources to better understand Brendan's state. However, it does not go as far as pausing the procedure, and may not be sufficient if Brendan remains distressed once communication is attempted.",
        whyNotAdjacent:
          "This is 'Appropriate' but not 'Very Appropriate'. A good instinct, but the first priority should be pausing the procedure rather than attempting communication while preparing to proceed.",
      },
      {
        id: "app-010-d",
        text: "Carry on with the procedure but document Brendan's apparent distress in the clinical notes.",
        correctRating: "inappropriate",
        rationale:
          "Documenting without acting on evident distress is inadequate. Clinical records should accurately reflect a patient's state, but documentation is not a substitute for appropriate action. Noting that a patient was distressed while proceeding regardless is a failure to respond to a patient safety and dignity concern.",
        whyNotAdjacent:
          "This is 'Inappropriate'. Documenting a concern while doing nothing to address it is not a responsible professional response.",
      },
    ],
  },

  {
    id: "app-011",
    type: "appropriateness",
    domain: "trust_professionalism",
    difficulty: "standard",
    stem: `Priyanka is a third-year medical student who has just completed a four-week GP placement. She is filling in the online placement feedback form, which her university uses to monitor placement quality. Her supervisor, Dr Abubakar, asks her before she submits it to "emphasise the positives," mentioning that low scores could affect whether students are placed there in future. In truth, Priyanka found parts of the placement poorly organised and felt she received insufficient feedback on her clinical development.`,
    pivotInsight:
      "Placement feedback is used to protect future students' learning experiences. Artificially inflating scores undermines that purpose and forms part of a pattern of professional honesty that GMP requires at every stage of training.",
    gmpRef: {
      label: "GMP · Trust and professionalism",
      url: `${GMP_MAIN_URL}/trust-and-professionalism`,
    },
    items: [
      {
        id: "app-011-a",
        text: "Complete the feedback form honestly and, if pressured further, raise the request for inflated scores with her university.",
        correctRating: "very_appropriate",
        rationale:
          "Honest feedback is essential to ensuring placement quality is maintained for future students. GMP requires honesty in all professional communications. Completing a formal evaluation is a professional act, and if Dr Abubakar is actively discouraging accurate feedback, that is itself a concern worth raising with the university.",
        whyNotAdjacent:
          "This is 'Very Appropriate'. Honesty in formal evaluations is a GMP obligation, and reporting inappropriate pressure demonstrates professional integrity.",
        gmpRef: {
          label: "GMP · Trust and professionalism",
          url: `${GMP_MAIN_URL}/trust-and-professionalism`,
        },
      },
      {
        id: "app-011-b",
        text: "Complete the form honestly but tell Dr Abubakar she found the request uncomfortable.",
        correctRating: "appropriate",
        rationale:
          "Being honest on the form is correct; flagging the discomfort directly to Dr Abubakar is a reasonable professional response that may prompt reflection. However, it relies on Dr Abubakar receiving the feedback constructively and does not ensure the university is aware of the pressure. Appropriate but incomplete as a standalone response.",
        whyNotAdjacent:
          "This is 'Appropriate' but not 'Very Appropriate'. It is honest but leaves the institutional issue unaddressed.",
      },
      {
        id: "app-011-c",
        text: "Complete the form with uniformly positive feedback to preserve the placement for future students.",
        correctRating: "very_inappropriate",
        rationale:
          "Submitting false feedback to protect institutional interests is dishonest and directly contrary to GMP. Future students may have the same poor experience Priyanka had. Inflating scores removes the possibility of those problems being identified and addressed. The harm caused by inaccurate feedback may not be visible, but it is real.",
        whyNotAdjacent:
          "This is correctly 'Very Inappropriate'. Falsifying a professional evaluation to satisfy a supervisor's interests is dishonest, regardless of intent.",
      },
      {
        id: "app-011-d",
        text: "Leave the sections about organisation and feedback blank rather than scoring them poorly.",
        correctRating: "inappropriate",
        rationale:
          "Omitting negative data from a formal assessment is a form of dishonesty by omission. Blank fields are not neutral, they prevent the university from understanding the placement's true quality. Selective omission avoids the discomfort of negative feedback without fulfilling the purpose of the evaluation.",
        whyNotAdjacent:
          "This is 'Inappropriate'. Selective omission is not honest, even if it avoids a direct lie.",
      },
    ],
  },

  {
    id: "app-012",
    type: "appropriateness",
    domain: "colleagues_culture_safety",
    difficulty: "challenging",
    stem: `Max is a medical student on a busy surgical ward. He notices that his classmate Keiran has taken a small amount of paracetamol from an unlocked medication trolley without recording it, explaining he has a headache and "it's basically over-the-counter." The medication trolley is the ward's shared supply and includes both controlled and non-controlled drugs.`,
    pivotInsight:
      "Taking medications from a ward supply without authorisation is a breach of professional standards regardless of the drug involved. The integrity of the medication system is a patient safety issue, and an unlocked trolley containing controlled drugs is an immediate hazard.",
    gmpRef: {
      label: "GMP · Colleagues, culture and safety",
      url: `${GMP_MAIN_URL}/colleagues-culture-and-safety`,
    },
    items: [
      {
        id: "app-012-a",
        text: "Tell Keiran this is not appropriate, advise him to discard the tablet, and alert a nurse that the trolley is unlocked.",
        correctRating: "very_appropriate",
        rationale:
          "Taking an unauthorised drug from a ward supply breaches professional conduct expectations, and the unlocked trolley is an immediate patient safety issue. Addressing both concerns directly is correct. GMP requires that professionals act with integrity and raise safety concerns. The drug trolley must be secured, and Keiran needs to understand that this behaviour is unacceptable in a clinical environment.",
        whyNotAdjacent:
          "This is 'Very Appropriate'. Addressing both the colleague's behaviour and the immediate safety concern is the complete and correct response.",
        gmpRef: {
          label: "GMP · Colleagues, culture and safety",
          url: `${GMP_MAIN_URL}/colleagues-culture-and-safety`,
        },
      },
      {
        id: "app-012-b",
        text: "Report the incident to a ward nurse immediately, without speaking to Keiran first.",
        correctRating: "appropriate",
        rationale:
          "Reporting the incident ensures the trolley is secured quickly and the matter is on record. This is appropriate and may be necessary. However, giving Keiran the opportunity to understand why this is a problem before escalating formally is more proportionate as a first step, given the relatively minor scale of the drug involved.",
        whyNotAdjacent:
          "This is 'Appropriate' but not 'Very Appropriate'. A direct conversation with Keiran first is preferable, provided it does not delay securing the trolley.",
      },
      {
        id: "app-012-c",
        text: "Say nothing, it is only paracetamol and there was clearly no malicious intent.",
        correctRating: "very_inappropriate",
        rationale:
          "Intent does not determine whether conduct meets professional standards. Taking medication from a ward supply without authorisation or documentation is contrary to the governance frameworks that protect patients. The unlocked trolley is a patient safety concern in itself. Inaction here normalises conduct that could escalate.",
        whyNotAdjacent:
          "This is correctly 'Very Inappropriate'. Neither the drug's familiarity nor the colleague's intentions make this acceptable in a clinical setting.",
      },
      {
        id: "app-012-d",
        text: "Tell Keiran he should be more careful, but take no further action.",
        correctRating: "inappropriate",
        rationale:
          "A vague caution without addressing the unlocked trolley or ensuring the incident is known to the ward team is insufficient. This falls short of what GMP expects when a colleague behaves inappropriately in a clinical environment.",
        whyNotAdjacent:
          "This is 'Inappropriate'. A half-measure that neither corrects the behaviour nor resolves the immediate safety concern is not sufficient.",
      },
    ],
  },

  {
    id: "app-013",
    type: "appropriateness",
    domain: "patients_partnership_communication",
    difficulty: "standard",
    stem: `Lydia is a third-year dental student accompanying a community dental nurse, Faye, on a home visit to an elderly patient, Mr Cartwright, who has complex medical needs. During the visit, Mr Cartwright mentions to Lydia that he has been taking twice the prescribed dose of a blood pressure medication because "one tablet never seems to do anything." Faye is in another room and does not appear to have heard the comment.`,
    pivotInsight:
      "Medication safety information disclosed by a patient must reach the responsible clinician, regardless of how incidentally it was shared. Patients often disclose significant information to students or less senior team members.",
    gmpRef: {
      label: "GMP · Patients, partnership and communication",
      url: `${GMP_MAIN_URL}/patients-partnership-and-communication`,
    },
    items: [
      {
        id: "app-013-a",
        text: "Inform Faye immediately of what Mr Cartwright has said so it can be documented and acted upon.",
        correctRating: "very_appropriate",
        rationale:
          "Mr Cartwright's disclosure is clinically significant. Taking double the prescribed dose of a blood pressure medication carries serious risks. The information must reach the responsible clinician without delay so it can be properly addressed. GMP requires that patient safety concerns are escalated promptly.",
        whyNotAdjacent:
          "This is 'Very Appropriate'. Prompt escalation of a medication safety concern is a core professional duty.",
        gmpRef: {
          label: "GMP · Patients, partnership and communication",
          url: `${GMP_MAIN_URL}/patients-partnership-and-communication`,
        },
      },
      {
        id: "app-013-b",
        text: "Note what Mr Cartwright said and mention it to Faye at the end of the visit.",
        correctRating: "appropriate",
        rationale:
          "Ensuring Faye receives the information is better than saying nothing, but a potentially dangerous medication concern warrants prompt communication rather than deferral. Mr Cartwright may need advice or an urgent medication review that should not wait until the appointment concludes.",
        whyNotAdjacent:
          "This is 'Appropriate' but not 'Very Appropriate'. Delayed communication of an urgent safety concern reduces its clinical value.",
      },
      {
        id: "app-013-c",
        text: "Advise Mr Cartwright directly that he must return to the recommended dose and should call his GP.",
        correctRating: "inappropriate",
        rationale:
          "While well-intentioned, Lydia is not in a position to give independent medication advice. She cannot verify the full clinical picture. Providing clinical instruction without involving the supervising clinician is outside her competence and may give Mr Cartwright incomplete or incorrect guidance.",
        whyNotAdjacent:
          "This is 'Inappropriate'. Acting alone on a clinical safety concern, outside supervision, is not appropriate for a student.",
      },
      {
        id: "app-013-d",
        text: "Say nothing, Mr Cartwright did not direct the comment at Faye and may not want it shared.",
        correctRating: "very_inappropriate",
        rationale:
          "Patient confidentiality does not require clinicians to ignore safety information. When a patient discloses information with direct implications for their health, GMP requires it is properly documented and acted upon. The manner in which the information was shared is irrelevant to the obligation to act.",
        whyNotAdjacent:
          "This is correctly 'Very Inappropriate'. Staying silent about a medication safety concern because it was disclosed informally is not acceptable.",
      },
    ],
  },

  {
    id: "app-014",
    type: "appropriateness",
    domain: "knowledge_skills_development",
    difficulty: "foundation",
    stem: `Conor is a final-year medical student on a GP placement. His supervisor, Dr Rees, asks him to call Mrs Patel to inform her of her recent blood test results. The results include a mildly elevated serum calcium that Conor recognises could warrant further investigation. Dr Rees, glancing at the results briefly, says: "Just tell her the results are broadly fine and not to worry, I'll review properly next week."`,
    pivotInsight:
      "Giving a patient incomplete or misleading information about their health is not an acceptable shortcut. A student asked to communicate false reassurance faces a direct conflict between following instructions and upholding their duty to the patient.",
    gmpRef: {
      label: "GMP · Knowledge, skills and development",
      url: `${GMP_MAIN_URL}/knowledge-skills-and-development`,
    },
    items: [
      {
        id: "app-014-a",
        text: "Express concern to Dr Rees that Mrs Patel deserves accurate information about her results, and suggest either postponing the call or making it together.",
        correctRating: "very_appropriate",
        rationale:
          "GMP requires that patients are given honest information about their health. Calling Mrs Patel to reassure her that results are broadly fine when they contain a potentially significant finding is misleading. Raising this with Dr Rees and offering a constructive alternative is professional, proportionate, and puts the patient's interests first.",
        whyNotAdjacent:
          "This is the correct response. Challenging misleading patient communication, however gently, is a GMP obligation.",
        gmpRef: {
          label: "GMP · Knowledge, skills and development",
          url: `${GMP_MAIN_URL}/knowledge-skills-and-development`,
        },
      },
      {
        id: "app-014-b",
        text: "Make the call but tell Mrs Patel her results are 'mostly normal' and that the GP will follow up.",
        correctRating: "inappropriate",
        rationale:
          "Describing results as 'mostly normal' when there is a potentially significant finding is still misleading. Mentioning follow-up is better than pure false reassurance, but Mrs Patel is not given accurate information about her health. GMP requires honest communication with patients.",
        whyNotAdjacent:
          "It is not 'Very Inappropriate' because it is less misleading than saying results are entirely fine. It is still 'Inappropriate' because partial reassurance without accuracy is not an acceptable substitute for honest discussion.",
      },
      {
        id: "app-014-c",
        text: "Make the call as instructed and tell Mrs Patel her results are fine.",
        correctRating: "very_inappropriate",
        rationale:
          "Telling a patient with an abnormal finding that their results are fine is a false statement about their health that could delay investigation of a potentially significant finding. GMP is unequivocal that patients have the right to accurate information about their health.",
        whyNotAdjacent:
          "This is correctly 'Very Inappropriate'. False reassurance about abnormal results is dishonest and potentially harmful.",
      },
      {
        id: "app-014-d",
        text: "Refuse to make the call and explain to Dr Rees that he is not comfortable with the instruction.",
        correctRating: "inappropriate",
        rationale:
          "Refusing without attempting to resolve the situation is unhelpful. Dr Rees may not have looked closely enough at the result, and a simple conversation could resolve the issue. Blanket refusal is a less proportionate response than engaging with Dr Rees first.",
        whyNotAdjacent:
          "This is 'Inappropriate'. Refusing without dialogue is not the ideal first step when conversation could resolve the concern.",
      },
    ],
  },

  {
    id: "app-015",
    type: "appropriateness",
    domain: "trust_professionalism",
    difficulty: "challenging",
    stem: `Danielle is a final-year medical student on a night shift. A consultant she has never met, Mr Okafor, approaches and tells her she has been asked to perform an arterial blood gas draw on a patient in the next bay. Danielle has never performed an ABG and has not been signed off for the procedure. Mr Okafor says her own supervisor authorised it. When Danielle tries to call her supervisor, there is no answer.`,
    pivotInsight:
      "A student cannot proceed with an unsupervised procedure they have not been trained in simply because a senior has authorised it, particularly when that authorisation cannot be verified. The patient's safety depends on the procedure being performed by someone competent to do it.",
    gmpRef: {
      label: "GMP · Trust and professionalism",
      url: `${GMP_MAIN_URL}/trust-and-professionalism`,
    },
    items: [
      {
        id: "app-015-a",
        text: "Explain that she has not been trained or signed off for ABGs and ask Mr Okafor to ensure a trained member of staff performs the procedure.",
        correctRating: "very_appropriate",
        rationale:
          "GMP requires that clinicians work within the limits of their competence. Danielle cannot safely perform a procedure she has never done and is not signed off for, regardless of who authorised it. The patient's safety depends on the procedure being performed correctly. Being honest about her limitations and ensuring an appropriate alternative is arranged is the only safe and professional response.",
        whyNotAdjacent:
          "This is 'Very Appropriate'. A student who is honest about their limitations protects the patient and upholds GMP.",
        gmpRef: {
          label: "GMP · Trust and professionalism",
          url: `${GMP_MAIN_URL}/trust-and-professionalism`,
        },
      },
      {
        id: "app-015-b",
        text: "Try to find a more senior student or registrar who is signed off for ABGs and ask them to perform the procedure.",
        correctRating: "appropriate",
        rationale:
          "Identifying someone competent to perform the procedure is practical and helpful. It resolves the immediate problem while staying within her own competence. However, it does not directly address the fact that she was asked to perform a task she is not trained for, that concern should also be raised with Mr Okafor.",
        whyNotAdjacent:
          "This is 'Appropriate'. A sound practical solution but slightly indirect in how it handles the original inappropriate request.",
      },
      {
        id: "app-015-c",
        text: "Attempt the procedure as instructed, Mr Okafor is a consultant and has indicated the supervisor has approved it.",
        correctRating: "very_inappropriate",
        rationale:
          "Performing an unsupervised procedure she has never trained for, on the basis of an unverified authorisation, would place the patient at direct risk. GMP does not allow clinicians to exceed their competence simply because a senior has instructed them to.",
        whyNotAdjacent:
          "This is correctly 'Very Inappropriate'. Proceeding with an untrained procedure under pressure is a serious patient safety breach.",
      },
      {
        id: "app-015-d",
        text: "Wait near the patient's bay without acting, hoping another clinician will step in.",
        correctRating: "inappropriate",
        rationale:
          "Passive waiting does not serve a patient who may need the procedure performed promptly. If the procedure is genuinely necessary, inaction leaves both the patient and the team in a difficult position. Danielle should address the request directly rather than avoiding it.",
        whyNotAdjacent:
          "This is 'Inappropriate'. Avoidance without communication is not a professionally adequate response.",
      },
    ],
  },

  {
    id: "app-016",
    type: "appropriateness",
    domain: "colleagues_culture_safety",
    difficulty: "standard",
    stem: `Hana is a medical student on a gynaecology placement. She observes her registrar, Dr Serrano, begin an intimate examination of a patient without offering a chaperone. The patient, who appears nervous, does not ask about a chaperone and does not say anything. Hana knows from her training that a chaperone should routinely be offered for intimate examinations.`,
    pivotInsight:
      "Chaperone policy exists to protect both patients and clinicians. A patient who is not offered a chaperone may not know they can ask for one, their silence does not imply informed acceptance.",
    gmpRef: {
      label: "GMP · Colleagues, culture and safety",
      url: `${GMP_MAIN_URL}/colleagues-culture-and-safety`,
    },
    items: [
      {
        id: "app-016-a",
        text: "After the consultation, raise the omission privately with Dr Serrano and suggest that a chaperone should be offered routinely for intimate examinations.",
        correctRating: "very_appropriate",
        rationale:
          "Raising the concern with Dr Serrano after the consultation, privately and constructively, is the most proportionate response. The examination has concluded without immediate harm, but the practice needs to change. Bringing this to Dr Serrano's attention is a professional duty under GMP and should be done supportively, not accusatorially.",
        whyNotAdjacent:
          "This is 'Very Appropriate'. Addressing a clinical practice concern with the responsible clinician, privately and after the fact, is the ideal response.",
        gmpRef: {
          label: "GMP · Colleagues, culture and safety",
          url: `${GMP_MAIN_URL}/colleagues-culture-and-safety`,
        },
      },
      {
        id: "app-016-b",
        text: "Ask during the examination whether a chaperone is needed.",
        correctRating: "appropriate",
        rationale:
          "Raising the concern in the moment is not unreasonable, particularly before the examination has progressed. However, interrupting an intimate examination once underway is likely to be disruptive and may cause the patient additional anxiety. Raising the concern afterwards is more measured.",
        whyNotAdjacent:
          "This is 'Appropriate'. Intervening in the moment is better than saying nothing, but the timing is not ideal.",
      },
      {
        id: "app-016-c",
        text: "Say nothing, as the patient did not ask for a chaperone and appears to be managing.",
        correctRating: "very_inappropriate",
        rationale:
          "Patients may not know they can request a chaperone. The absence of a request is not the same as an informed decision not to have one. GMP and clinical governance guidance are clear that a chaperone should be offered for intimate examinations. Staying silent because the patient did not object perpetuates a practice that exists to protect both patient and clinician.",
        whyNotAdjacent:
          "This is correctly 'Very Inappropriate'. Inaction on a clear and known clinical practice requirement is not acceptable.",
      },
      {
        id: "app-016-d",
        text: "Note the omission in her own learning log but not raise it with the registrar.",
        correctRating: "inappropriate",
        rationale:
          "Documenting a concern for reflective purposes without acting on it does not protect future patients. A reflective note without professional follow-up addresses nothing. GMP requires more than passive observation of practice concerns.",
        whyNotAdjacent:
          "This is 'Inappropriate'. Reflection without action is insufficient when a professional practice concern has been identified.",
      },
    ],
  },

  {
    id: "app-017",
    type: "appropriateness",
    domain: "patients_partnership_communication",
    difficulty: "challenging",
    stem: `Sofia is a medical student observing a GP consultation. The patient, Mr Hasan, aged 62, has known heart failure. He mentions casually that he stopped taking his diuretic three weeks ago because "it makes me need the toilet a lot." He adds: "But please don't tell my heart specialist, she'll be annoyed and it makes me feel bad." The GP has not yet responded to the disclosure.`,
    pivotInsight:
      "Patient confidentiality is important, but it does not prevent relevant clinical information from being shared with members of the same treating team. A patient who has stopped a heart failure medication needs the clinical team to know.",
    gmpRef: {
      label: "GMP · Patients, partnership and communication",
      url: `${GMP_MAIN_URL}/patients-partnership-and-communication`,
    },
    items: [
      {
        id: "app-017-a",
        text: "After the consultation, raise with the GP the importance of ensuring Mr Hasan's specialist is made aware, handled sensitively in line with his concerns.",
        correctRating: "very_appropriate",
        rationale:
          "Mr Hasan's decision to stop his diuretic is clinically significant for the management of his heart failure. His specialist needs this information to provide safe ongoing care. The response must also acknowledge the patient's expressed concern. Suggesting to the GP that the information should be shared sensitively, with Mr Hasan's understanding, is the most balanced and clinically responsible approach.",
        whyNotAdjacent:
          "This is 'Very Appropriate'. Clinically significant information must reach the treating team, handled with sensitivity to the patient's concerns.",
        gmpRef: {
          label: "GMP · Patients, partnership and communication",
          url: `${GMP_MAIN_URL}/patients-partnership-and-communication`,
        },
      },
      {
        id: "app-017-b",
        text: "Say nothing and trust that the GP will decide what to do with the information.",
        correctRating: "inappropriate",
        rationale:
          "The GP is the responsible clinician, but Sofia has observed clinically significant information before the GP has responded. Remaining entirely passive when a patient has stopped heart failure medication and asked for secrecy is not ideal. She should contribute to safe care, for example by prompting the GP after the consultation.",
        whyNotAdjacent:
          "It is not 'Very Inappropriate' because she is not promising confidentiality or blocking care herself. It is 'Inappropriate' because passivity is too weak when important clinical information may not yet be acted on.",
      },
      {
        id: "app-017-c",
        text: "Assure Mr Hasan privately that the information will stay between them.",
        correctRating: "very_inappropriate",
        rationale:
          "Making a commitment of confidentiality that conflicts with the duty to share clinically relevant information within the treating team is not appropriate. The GP is already aware of the disclosure. Promising secrecy across the treating team is something Sofia cannot offer and risks Mr Hasan receiving unsafe care because his specialist does not have the full clinical picture.",
        whyNotAdjacent:
          "This is correctly 'Very Inappropriate'. Students cannot promise confidentiality about clinically material information that the treating team needs.",
      },
      {
        id: "app-017-d",
        text: "Tell Mr Hasan that his specialist will need to be told, regardless of how he feels about it.",
        correctRating: "inappropriate",
        rationale:
          "While the specialist does need to know, the manner of the communication matters. Telling Mr Hasan bluntly that his preferences will be overridden is unlikely to improve the therapeutic relationship and misses the opportunity to help him understand why sharing this information is in his best interest.",
        whyNotAdjacent:
          "This is 'Inappropriate'. The intent is correct but the approach is insensitive and unlikely to support good ongoing care.",
      },
    ],
  },

  {
    id: "app-018",
    type: "appropriateness",
    domain: "knowledge_skills_development",
    difficulty: "standard",
    stem: `Harriet is a final-year medical student on an emergency department placement. A junior doctor asks her to take blood from a patient using an ultrasound-guided technique. Harriet has taken blood many times before, but she has only watched ultrasound-guided venepuncture once and has never performed it herself. The department is busy and the doctor says, "You'll be fine, just have a go while I sort something else out."`,
    pivotInsight:
      "Students must be honest about the limits of their competence. Being busy, flattered, or under pressure does not justify attempting a procedure they are not trained or supervised to perform.",
    gmpRef: {
      label: "GMP · Knowledge, skills and development",
      url: `${GMP_MAIN_URL}/knowledge-skills-and-development`,
    },
    items: [
      {
        id: "app-018-a",
        text: "Explain that she is confident with standard venepuncture but has not performed ultrasound-guided venepuncture before, and ask for direct supervision if she is to attempt it.",
        correctRating: "very_appropriate",
        rationale:
          "This is very appropriate. Harriet is being honest about her current competence while also showing willingness to learn under appropriate supervision. This protects the patient and allows the junior doctor to decide whether Harriet should observe, assist, or perform the procedure with direct supervision.",
        whyNotAdjacent:
          "This is not merely 'Appropriate' because it directly addresses the key issue: safe practice within competence, with appropriate supervision.",
        gmpRef: {
          label: "GMP · Knowledge, skills and development",
          url: `${GMP_MAIN_URL}/knowledge-skills-and-development`,
        },
      },
      {
        id: "app-018-b",
        text: "Attempt the procedure because she has seen it done before and the department is very busy.",
        correctRating: "very_inappropriate",
        rationale:
          "This is very inappropriate. Watching a procedure once is not the same as being competent to perform it. Attempting an unfamiliar technique without adequate supervision risks patient harm and misrepresents Harriet's ability.",
        whyNotAdjacent:
          "This is not just 'Inappropriate' because it involves proceeding outside her competence in a patient-facing procedure.",
      },
      {
        id: "app-018-c",
        text: "Ask whether another trained member of staff can perform the procedure if direct supervision is not available.",
        correctRating: "appropriate",
        rationale:
          "This is appropriate. If direct supervision is unavailable, Harriet should not perform the procedure herself. Asking for someone appropriately trained to perform it is a practical way to protect patient safety while recognising the pressures in the department.",
        whyNotAdjacent:
          "This is not 'Very Appropriate' because disclosing limits and seeking supervision (app-018-a) is the stronger first response. It is better than refusing without explanation.",
      },
      {
        id: "app-018-d",
        text: "Decline to perform the procedure and leave without explaining why, as she is not competent to do it.",
        correctRating: "inappropriate",
        rationale:
          "It is correct that Harriet should not perform a procedure outside her competence. However, leaving without explaining why is poor communication and does not help the team arrange safe care for the patient. She should clearly explain her lack of experience and ask for supervision or an alternative trained person.",
        whyNotAdjacent:
          "This is not 'Very Inappropriate' because the underlying refusal is correct. The problem is the poor communication and lack of practical support.",
      },
    ],
  },

  {
    id: "app-019",
    type: "appropriateness",
    domain: "trust_professionalism",
    difficulty: "foundation",
    stem: `Nikhil is a medical student on a paediatric placement. At lunch, a friend asks why Nikhil was late. Nikhil replies in a busy hospital café, "There was a really sad safeguarding case on the ward involving a toddler from my street." He does not mention the child's name, but several staff members and visitors are nearby.`,
    pivotInsight:
      "Confidentiality is not limited to names. Details such as age, location, context, ward, and family situation can make a patient identifiable.",
    gmpRef: {
      label: "GMP · Trust and professionalism",
      url: `${GMP_MAIN_URL}/trust-and-professionalism`,
    },
    items: [
      {
        id: "app-019-a",
        text: "Stop discussing the case immediately and move away from the public area.",
        correctRating: "very_appropriate",
        rationale:
          "This is very appropriate. Nikhil has disclosed enough contextual detail for there to be a confidentiality concern, so the immediate priority is to prevent any further disclosure in a public area.",
        whyNotAdjacent:
          "This is not merely 'Appropriate' because it deals with the immediate risk directly and promptly.",
        gmpRef: {
          label: "GMP · Trust and professionalism",
          url: `${GMP_MAIN_URL}/trust-and-professionalism`,
        },
      },
      {
        id: "app-019-b",
        text: "Continue the conversation because he has not used the child's name.",
        correctRating: "very_inappropriate",
        rationale:
          "This is very inappropriate. A patient can be identifiable from contextual details even when their name is not used. Continuing the conversation in a public place would worsen the breach.",
        whyNotAdjacent:
          "This is not just 'Inappropriate' because it knowingly continues a confidentiality risk involving sensitive patient information.",
      },
      {
        id: "app-019-c",
        text: "Later reflect on the incident and ask his supervisor for advice about whether it needs to be reported.",
        correctRating: "appropriate",
        rationale:
          "This is appropriate because Nikhil recognises that a possible confidentiality issue may have occurred and seeks senior guidance. However, it is not ideal as the only response because he must first stop the conversation immediately and prevent further disclosure.",
        whyNotAdjacent:
          "This is not 'Very Appropriate' in isolation because it is a follow-up action rather than the immediate step needed to protect confidentiality.",
      },
      {
        id: "app-019-d",
        text: "Tell his friend the rest of the story later by message instead, where fewer people can overhear.",
        correctRating: "very_inappropriate",
        rationale:
          "This is very inappropriate. Moving the conversation to a private message does not make it acceptable, as the friend has no professional need to know the details. It also creates a written record of inappropriate disclosure.",
        whyNotAdjacent:
          "This is clearly 'Very Inappropriate' because it deliberately continues an unnecessary disclosure of sensitive patient information.",
      },
    ],
  },

  {
    id: "app-020",
    type: "appropriateness",
    domain: "trust_professionalism",
    difficulty: "standard",
    stem: `Alina is a dental student. After a difficult procedure, her supervisor asks her to write in the notes that the patient was "fully comfortable throughout". Alina remembers that the patient winced several times and asked for a short break because of discomfort. The supervisor says, "It was nothing major, don't make the notes sound worse than they were."`,
    pivotInsight:
      "Clinical records must be accurate. Minimising or altering notes to protect a colleague, avoid criticism, or make care look smoother is dishonest.",
    gmpRef: {
      label: "GMP · Trust and professionalism",
      url: `${GMP_MAIN_URL}/trust-and-professionalism`,
    },
    items: [
      {
        id: "app-020-a",
        text: "Write an accurate note stating that the patient experienced some discomfort, a pause was taken, and the procedure then continued.",
        correctRating: "very_appropriate",
        rationale:
          "This is very appropriate. Clinical notes should accurately reflect what happened. Recording that the patient experienced discomfort and that a pause was taken is factual and supports honest documentation.",
        whyNotAdjacent:
          "This is not merely 'Appropriate' because accurate record-keeping is the central professional issue in the scenario.",
        gmpRef: {
          label: "GMP · Trust and professionalism",
          url: `${GMP_MAIN_URL}/trust-and-professionalism`,
        },
      },
      {
        id: "app-020-b",
        text: "Use the supervisor's wording because the discomfort was not serious and the supervisor is responsible for the treatment.",
        correctRating: "very_inappropriate",
        rationale:
          "This is very inappropriate. Alina should not knowingly enter misleading information into the clinical record, even if the supervisor believes the discomfort was minor.",
        whyNotAdjacent:
          "This is not just 'Inappropriate' because it involves knowingly creating an inaccurate clinical record.",
      },
      {
        id: "app-020-c",
        text: "Ask the supervisor whether they would be comfortable with a more factual note describing the brief discomfort and pause.",
        correctRating: "appropriate",
        rationale:
          "This is appropriate because it challenges the suggested wording professionally and may allow the supervisor to reconsider. However, Alina must still ensure the final record is accurate even if the supervisor is uncomfortable with more factual wording.",
        whyNotAdjacent:
          "This is not 'Very Appropriate' because it still frames accuracy as something for the supervisor to approve, rather than as a non-negotiable requirement.",
      },
      {
        id: "app-020-d",
        text: "Refuse to write any notes at all so that she is not involved in the disagreement.",
        correctRating: "inappropriate",
        rationale:
          "This is inappropriate. Alina is right not to write anything misleading, but refusing to contribute to the notes does not resolve the problem. She should ensure that the record is accurate or seek advice if she is being pressured to document something untrue.",
        whyNotAdjacent:
          "This is not 'Very Inappropriate' because the concern about misleading notes is valid. The problem is that the response is avoidant and incomplete.",
      },
    ],
  },

  {
    id: "app-021",
    type: "appropriateness",
    domain: "patients_partnership_communication",
    difficulty: "challenging",
    stem: `Ethan is a dental student observing a consultation. A patient, Mrs Pavel, has capacity and is advised to have a tooth extracted because of recurrent infection. Mrs Pavel understands the recommendation but says she wants to delay treatment for two weeks because of an important family event. The supervising dentist looks frustrated and asks Ethan to "make her understand that this is a bad idea."`,
    pivotInsight:
      "A competent adult can decline or delay recommended treatment. The professional role is to ensure the decision is informed, not to pressure the patient into agreement.",
    gmpRef: {
      label: "GMP · Patients, partnership and communication",
      url: `${GMP_MAIN_URL}/patients-partnership-and-communication`,
    },
    items: [
      {
        id: "app-021-a",
        text: "Ask Mrs Pavel what worries her about having the extraction now, and check that she understands the risks of delaying treatment.",
        correctRating: "appropriate",
        rationale:
          "This is appropriate. Ethan explores the patient's reasons and checks whether her decision is informed. It respects autonomy while ensuring she understands the possible consequences of delaying treatment.",
        whyNotAdjacent:
          "This is not 'Very Appropriate' because respecting a capacitous patient's wish to delay, once risks are understood (app-021-c), is the stronger response when she has already understood the recommendation.",
      },
      {
        id: "app-021-b",
        text: "Tell Mrs Pavel that the dentist is the expert and that she should follow the recommendation.",
        correctRating: "inappropriate",
        rationale:
          "This is inappropriate. The dentist's recommendation is clinically relevant, but relying on authority does not properly address the patient's concerns or support informed decision-making.",
        whyNotAdjacent:
          "This is not 'Very Inappropriate' because the intention is to encourage recommended care. However, the method is paternalistic and not patient-centred.",
      },
      {
        id: "app-021-c",
        text: "Respect Mrs Pavel's decision if she understands the risks, and ensure the dentist is aware that she wishes to delay treatment.",
        correctRating: "very_appropriate",
        rationale:
          "This is very appropriate. If Mrs Pavel has capacity and understands the consequences, her decision should be respected. Ensuring the dentist is aware supports appropriate documentation and follow-up.",
        whyNotAdjacent:
          "This is not merely 'Appropriate' because it directly applies the principle that a competent adult can decline or delay recommended treatment.",
        gmpRef: {
          label: "GMP · Patients, partnership and communication",
          url: `${GMP_MAIN_URL}/patients-partnership-and-communication`,
        },
      },
      {
        id: "app-021-d",
        text: "Warn Mrs Pavel that delaying the extraction will definitely cause a serious infection.",
        correctRating: "very_inappropriate",
        rationale:
          "This is very inappropriate because it overstates certainty and may pressure the patient. Patients should be told realistic risks, not frightened with exaggerated or misleading statements.",
        whyNotAdjacent:
          "This is 'Very Inappropriate' because it is both misleading and coercive.",
      },
    ],
  },

  {
    id: "app-022",
    type: "appropriateness",
    domain: "trust_professionalism",
    difficulty: "standard",
    stem: `Maya is a medical student observing a consultation. The patient tells the doctor that she is allergic to codeine. Maya notices that the doctor accidentally enters "no known drug allergies" into the electronic record. The doctor seems distracted because the clinic is running late.`,
    pivotInsight:
      "Potentially inaccurate clinical records that could affect patient safety should be clarified promptly and professionally. The student should not assume the doctor intended to enter the wrong information.",
    gmpRef: {
      label: "GMP · Trust and professionalism",
      url: `${GMP_MAIN_URL}/trust-and-professionalism`,
    },
    items: [
      {
        id: "app-022-a",
        text: "Politely ask the doctor to confirm whether the patient's codeine allergy should be recorded.",
        correctRating: "very_appropriate",
        rationale:
          "This is very appropriate. Maya has noticed a possible documentation error that could affect patient safety. Asking the doctor to confirm the allergy is a respectful and direct way to clarify the issue without making accusations.",
        whyNotAdjacent:
          "This is not merely 'Appropriate' because it deals with a potentially important patient safety issue promptly and proportionately.",
        gmpRef: {
          label: "GMP · Trust and professionalism",
          url: `${GMP_MAIN_URL}/trust-and-professionalism`,
        },
      },
      {
        id: "app-022-b",
        text: "Ask the patient to repeat what she said about allergies.",
        correctRating: "appropriate",
        rationale:
          "This is appropriate because it may clarify whether Maya heard the patient correctly. However, it is less direct than asking the doctor to check the record, and it may slightly disrupt the consultation.",
        whyNotAdjacent:
          "This is not 'Very Appropriate' because the issue is the discrepancy between what was said and what was entered. The doctor should be alerted to check the record.",
      },
      {
        id: "app-022-c",
        text: "Tell the patient privately after the consultation that the doctor entered the wrong allergy information.",
        correctRating: "very_inappropriate",
        rationale:
          "This is very inappropriate. Maya should not tell the patient that the doctor made an error without first clarifying the situation with the doctor. This could undermine the doctor-patient relationship and may be based on an incomplete understanding.",
        whyNotAdjacent:
          "This is not merely 'Inappropriate' because it bypasses appropriate clarification and risks damaging trust unnecessarily.",
      },
      {
        id: "app-022-d",
        text: "Say nothing, as the doctor probably knows what they are doing.",
        correctRating: "very_inappropriate",
        rationale:
          "This is very inappropriate. Maya has noticed a possible error in the medical record that could affect prescribing and patient safety. Hierarchy or assumptions about the doctor's knowledge should not prevent her from raising it appropriately.",
        whyNotAdjacent:
          "This is not just 'Inappropriate' because inaction could leave a clinically important allergy incorrectly recorded.",
      },
    ],
  },

  {
    id: "app-023",
    type: "appropriateness",
    domain: "patients_partnership_communication",
    difficulty: "foundation",
    stem: `A dentist is carrying out a routine examination on an eight-year-old child, Adam. Halfway through the check-up, Adam becomes very upset, starts crying, and says he wants to go home. His parent looks embarrassed and says, "Just carry on, he always makes a fuss."`,
    pivotInsight:
      "A distressed child should be treated with patience and compassion. The dentist should not simply continue as normal when the child is clearly upset.",
    gmpRef: {
      label: "GMP · Patients, partnership and communication",
      url: `${GMP_MAIN_URL}/patients-partnership-and-communication`,
    },
    items: [
      {
        id: "app-023-a",
        text: "Pause the examination and try to calm Adam before deciding whether to continue.",
        correctRating: "very_appropriate",
        rationale:
          "This is very appropriate. Adam is clearly distressed, and pausing gives him the chance to calm down and feel safe. It also allows the dentist to decide whether continuing would be in Adam's best interests.",
        whyNotAdjacent:
          "This is not merely 'Appropriate' because it directly responds to the child's distress before making any further decision.",
        gmpRef: {
          label: "GMP · Patients, partnership and communication",
          url: `${GMP_MAIN_URL}/patients-partnership-and-communication`,
        },
      },
      {
        id: "app-023-b",
        text: "Suggest booking another appointment if Adam remains too distressed after attempts to reassure him.",
        correctRating: "very_appropriate",
        rationale:
          "This is very appropriate when attempts to reassure Adam have not worked. Rescheduling may avoid making the experience traumatic and may lead to better cooperation and care at a later appointment.",
        whyNotAdjacent:
          "This is very appropriate because it follows an attempt to reassure the child and prioritises his wellbeing rather than forcing the examination.",
      },
      {
        id: "app-023-c",
        text: "Carry on with the check-up because the parent has given permission.",
        correctRating: "very_inappropriate",
        rationale:
          "This is very inappropriate. Parental permission does not justify continuing as normal when a child is visibly distressed. The dentist should act in the child's best interests and avoid causing unnecessary distress.",
        whyNotAdjacent:
          "This is not merely 'Inappropriate' because continuing despite significant distress could make the experience traumatic and damage trust.",
      },
      {
        id: "app-023-d",
        text: "Tell Adam that he is being silly and that the check-up will only take a few more minutes.",
        correctRating: "very_inappropriate",
        rationale:
          "This is very inappropriate. Dismissing or belittling a frightened child is unkind and likely to worsen his distress. The dentist should respond with reassurance and patience.",
        whyNotAdjacent:
          "This is clearly 'Very Inappropriate' because it is both dismissive and likely to escalate the situation.",
      },
    ],
  },

  {
    id: "app-024",
    type: "appropriateness",
    domain: "patients_partnership_communication",
    difficulty: "standard",
    stem: `Noah is a medical student helping at a GP reception desk. A social worker phones and asks whether a child has recently attended the surgery. The social worker explains that there are concerns about the child's home situation. Noah is aware that the surgery's confidentiality policy says this information cannot be shared without appropriate consent or a formal safeguarding/legal route.`,
    pivotInsight:
      "Confidential information should not be disclosed simply because the requester is from another agency. The response should protect confidentiality while signposting the proper route.",
    gmpRef: {
      label: "GMP · Patients, partnership and communication",
      url: `${GMP_MAIN_URL}/patients-partnership-and-communication`,
    },
    items: [
      {
        id: "app-024-a",
        text: "Explain that he cannot share that information without the appropriate consent or formal process, and advise the social worker to contact the practice manager or safeguarding lead through the proper route.",
        correctRating: "very_appropriate",
        rationale:
          "This is very appropriate. Noah protects patient confidentiality, explains why he cannot disclose the information, and directs the caller towards the correct route for raising a safeguarding or information-sharing request.",
        whyNotAdjacent:
          "This is not merely 'Appropriate' because it both refuses inappropriate disclosure and gives a clear, constructive next step.",
        gmpRef: {
          label: "GMP · Patients, partnership and communication",
          url: `${GMP_MAIN_URL}/patients-partnership-and-communication`,
        },
      },
      {
        id: "app-024-b",
        text: "Say that he understands it is sensitive but he is unable to share the information at this point.",
        correctRating: "appropriate",
        rationale:
          "This is appropriate because Noah does not disclose confidential information and acknowledges the sensitivity of the situation. However, it is not ideal because it does not clearly explain the policy or direct the social worker to the correct process.",
        whyNotAdjacent:
          "This is not 'Very Appropriate' because it lacks a clear explanation and does not provide a practical next step.",
      },
      {
        id: "app-024-c",
        text: "Say that he could lose his placement if he shared the information.",
        correctRating: "inappropriate",
        rationale:
          "This is inappropriate. Although it reflects that breaching confidentiality is serious, it centres Noah's personal consequences rather than the patient's right to confidentiality and the correct information-sharing process.",
        whyNotAdjacent:
          "This is not 'Very Inappropriate' because it still refuses disclosure, but the reasoning given is professionally poor.",
      },
      {
        id: "app-024-d",
        text: "Check the child's record and tell the social worker whether the child has attended, as the request may relate to safeguarding.",
        correctRating: "very_inappropriate",
        rationale:
          "This is very inappropriate. Noah should not disclose confidential information outside the proper process, even if the caller says the situation is sensitive. Safeguarding concerns should be handled through the correct route.",
        whyNotAdjacent:
          "This is clearly 'Very Inappropriate' because it breaches confidentiality without appropriate authority or process.",
      },
    ],
  },

  {
    id: "app-025",
    type: "appropriateness",
    domain: "trust_professionalism",
    difficulty: "standard",
    stem: `Rohan is a dental student assisting with a procedure under supervision. While passing an instrument, he accidentally catches the patient's lip. There is no obvious bleeding, and the patient does not react because the area is numb from local anaesthetic. The practice policy says patients and supervisors must be informed of accidents during treatment.`,
    pivotInsight:
      "Honesty after incidents matters even if harm seems minor or unnoticed. Local policy requiring disclosure should be followed.",
    gmpRef: {
      label: "GMP · Trust and professionalism",
      url: `${GMP_MAIN_URL}/trust-and-professionalism`,
    },
    items: [
      {
        id: "app-025-a",
        text: "Tell his supervisor what happened and ensure the patient is informed in line with practice policy.",
        correctRating: "very_appropriate",
        rationale:
          "This is very appropriate. The policy states that patients and supervisors must be informed of accidents. Rohan should be honest about what happened even if there is no obvious harm.",
        whyNotAdjacent:
          "This is not merely 'Appropriate' because it directly follows policy and supports honest, transparent care.",
        gmpRef: {
          label: "GMP · Trust and professionalism",
          url: `${GMP_MAIN_URL}/trust-and-professionalism`,
        },
      },
      {
        id: "app-025-b",
        text: "Ask the patient whether they are experiencing any discomfort.",
        correctRating: "very_appropriate",
        rationale:
          "This is very appropriate. Although the area may be numb, the patient may still notice discomfort or later effects. Checking on the patient is a sensible and caring immediate step.",
        whyNotAdjacent:
          "This is not merely 'Appropriate' because it directly considers the patient's wellbeing after an incident.",
      },
      {
        id: "app-025-c",
        text: "Say nothing unless the patient later complains of pain.",
        correctRating: "very_inappropriate",
        rationale:
          "This is very inappropriate. The patient may not feel pain until the anaesthetic wears off, and the policy requires disclosure. Waiting for the patient to complain is not honest or safe practice.",
        whyNotAdjacent:
          "This is clearly 'Very Inappropriate' because it ignores policy and fails to disclose an incident.",
      },
      {
        id: "app-025-d",
        text: "Privately record the incident in his own notes but avoid mentioning it to the patient or supervisor because no harm is visible.",
        correctRating: "very_inappropriate",
        rationale:
          "This is very inappropriate. Keeping a private note does not meet the requirement to inform the patient and supervisor. The absence of visible harm does not justify non-disclosure.",
        whyNotAdjacent:
          "This is not merely 'Inappropriate' because it deliberately avoids the required disclosure process.",
      },
    ],
  },

  {
    id: "app-026",
    type: "appropriateness",
    domain: "patients_partnership_communication",
    difficulty: "standard",
    stem: `Yasmin is a medical student in a clinic that is running 40 minutes late. A patient approaches her in the waiting area and complains in a raised voice that he has been waiting too long. He demands to be seen next. Other patients are watching, and Yasmin has been asked to collect notes for the current consultation.`,
    pivotInsight:
      "The response should avoid escalation, avoid making promises that may be unfair or impossible, and recognise the impact on other patients and the current consultation.",
    gmpRef: {
      label: "GMP · Patients, partnership and communication",
      url: `${GMP_MAIN_URL}/patients-partnership-and-communication`,
    },
    items: [
      {
        id: "app-026-a",
        text: "Acknowledge the patient's frustration, explain that she cannot promise he will be seen next, and say she will inform a member of staff that he is concerned.",
        correctRating: "very_appropriate",
        rationale:
          "This is very appropriate. Yasmin acknowledges the patient's concern without making an unfair promise. Informing an appropriate member of staff is a practical way to seek help while avoiding escalation.",
        whyNotAdjacent:
          "This is not merely 'Appropriate' because it balances empathy, honesty, fairness to other patients, and practical action.",
        gmpRef: {
          label: "GMP · Patients, partnership and communication",
          url: `${GMP_MAIN_URL}/patients-partnership-and-communication`,
        },
      },
      {
        id: "app-026-b",
        text: "Tell the patient to calm down and agree that he will be seen next.",
        correctRating: "very_inappropriate",
        rationale:
          "This is very inappropriate. Telling someone to calm down is likely to escalate the situation, and promising he will be seen next may be unfair to other patients and may not be within Yasmin's control.",
        whyNotAdjacent:
          "This is clearly 'Very Inappropriate' because it is both poor communication and an inappropriate promise.",
      },
      {
        id: "app-026-c",
        text: "Spend several minutes trying to investigate whether the clinic waiting time can be reduced.",
        correctRating: "appropriate",
        rationale:
          "This is appropriate in intention because Yasmin is trying to help. However, it is not ideal because she has been asked to collect notes for the current consultation, and delaying that task may slow the clinic further.",
        whyNotAdjacent:
          "This is not 'Very Appropriate' because it may distract from the current consultation and worsen delays.",
      },
      {
        id: "app-026-d",
        text: "Ignore the patient because she is only a student and the clinic delay is not her responsibility.",
        correctRating: "inappropriate",
        rationale:
          "This is inappropriate. Yasmin may not be responsible for the delay, but she should still respond politely and seek appropriate help rather than ignoring a patient who is distressed and disrupting the waiting area.",
        whyNotAdjacent:
          "This is not 'Very Inappropriate' because she is not personally responsible for the delay, but ignoring the patient is still poor communication.",
      },
    ],
  },

  {
    id: "app-027",
    type: "appropriateness",
    domain: "patients_partnership_communication",
    difficulty: "standard",
    stem: `Cerys is a dental student on placement. Her supervisor is due to perform a minor procedure on a 13-year-old patient, Leo. Leo's father is present and says he is uncomfortable with Cerys assisting because she is a student and has not met Leo before. Cerys has been hoping to assist with this procedure for her learning log.`,
    pivotInsight:
      "The patient's and parent's concerns must come before the student's learning opportunity. The best response listens to the concern and gives the parent a genuine choice.",
    gmpRef: {
      label: "GMP · Patients, partnership and communication",
      url: `${GMP_MAIN_URL}/patients-partnership-and-communication`,
    },
    items: [
      {
        id: "app-027-a",
        text: "Ask Leo's father whether he would prefer another member of staff to assist instead.",
        correctRating: "very_appropriate",
        rationale:
          "This is very appropriate. The father's concern should be listened to and taken seriously. Asking whether he would prefer someone else to assist gives him a genuine opportunity to express his preference about his child's care.",
        whyNotAdjacent:
          "This is not merely 'Appropriate' because it directly prioritises the patient and parent's concerns over the student's learning opportunity.",
        gmpRef: {
          label: "GMP · Patients, partnership and communication",
          url: `${GMP_MAIN_URL}/patients-partnership-and-communication`,
        },
      },
      {
        id: "app-027-b",
        text: "Ask her supervisor to reassure Leo's father that she will be closely supervised.",
        correctRating: "appropriate",
        rationale:
          "This is appropriate because reassurance from the supervisor may help Leo's father understand Cerys's role and the safeguards in place. However, it is not ideal if it is used to pressure him into accepting Cerys's involvement despite his concerns.",
        whyNotAdjacent:
          "This is not 'Very Appropriate' because reassurance should not override the parent's expressed discomfort or make him feel pushed into agreement.",
      },
      {
        id: "app-027-c",
        text: "Explain to Leo's father that assisting would be a valuable learning opportunity for her.",
        correctRating: "appropriate",
        rationale:
          "This is appropriate but not ideal. It may help explain why students are involved in care, but it risks putting Cerys's learning needs ahead of the patient and parent's concerns. It should not be used to place pressure on the family.",
        whyNotAdjacent:
          "This is not 'Very Appropriate' because the patient's and parent's interests should come before the student's learning opportunity.",
      },
      {
        id: "app-027-d",
        text: "Ask Leo directly whether he is happy for her to assist, despite his father's concerns.",
        correctRating: "very_inappropriate",
        rationale:
          "This is very inappropriate. Although Leo's views matter, Cerys should not try to bypass or undermine the father's clearly expressed concern. The decision should be handled through the proper consent process with the supervisor.",
        whyNotAdjacent:
          "This is not merely 'Inappropriate' because it risks overstepping her role as a student and placing pressure on a child.",
      },
    ],
  },

  {
    id: "app-028",
    type: "appropriateness",
    domain: "trust_professionalism",
    difficulty: "standard",
    stem: `Farah is a dental student helping at reception for a few minutes while the receptionist steps away. She notices that the receptionist has left a webpage open showing applications for jobs at other dental practices. Practice policy says work computers should not be used for personal browsing. Farah is unsure what to do.`,
    pivotInsight:
      "The response should be proportionate. A private, honest conversation may be better than immediate escalation where there is no immediate patient safety risk.",
    gmpRef: {
      label: "GMP · Trust and professionalism",
      url: `${GMP_MAIN_URL}/trust-and-professionalism`,
    },
    items: [
      {
        id: "app-028-a",
        text: "Speak to the receptionist privately and explain what she saw, asking whether everything is all right at work.",
        correctRating: "very_appropriate",
        rationale:
          "This is very appropriate. Farah is being honest and direct while also giving the receptionist an opportunity to explain or raise any concerns about work. It is proportionate because there is no immediate patient safety risk.",
        whyNotAdjacent:
          "This is not merely 'Appropriate' because it combines honesty, compassion, and proportionate handling of a workplace issue.",
        gmpRef: {
          label: "GMP · Trust and professionalism",
          url: `${GMP_MAIN_URL}/trust-and-professionalism`,
        },
      },
      {
        id: "app-028-b",
        text: "Inform the practice manager immediately without speaking to the receptionist first.",
        correctRating: "appropriate",
        rationale:
          "This is appropriate because the practice may need to know about possible misuse of a work computer. However, it may be more proportionate to speak to the receptionist first, as there is no immediate patient safety issue.",
        whyNotAdjacent:
          "This is not 'Very Appropriate' because immediate escalation may be premature before trying a direct, private conversation.",
      },
      {
        id: "app-028-c",
        text: "Ask the receptionist if he is looking for another job, without mentioning what she saw.",
        correctRating: "inappropriate",
        rationale:
          "This is inappropriate. It is indirect and may make the receptionist uncomfortable or suspicious. If Farah is going to raise the issue, she should be straightforward about what she saw.",
        whyNotAdjacent:
          "This is not 'Very Inappropriate' because it is unlikely to cause serious harm, but it is not an open or helpful way to manage the situation.",
      },
      {
        id: "app-028-d",
        text: "Take a photo of the screen so she has proof if the receptionist denies it later.",
        correctRating: "very_inappropriate",
        rationale:
          "This is very inappropriate. Taking a photo would be disproportionate and could create further confidentiality or privacy concerns. Farah should not start gathering evidence in this way.",
        whyNotAdjacent:
          "This is not merely 'Inappropriate' because it escalates the situation in a covert and unprofessional manner.",
      },
    ],
  },

  {
    id: "app-029",
    type: "appropriateness",
    domain: "knowledge_skills_development",
    difficulty: "foundation",
    stem: `Oscar is a medical student who has just received feedback that his history-taking is too rushed and that patients sometimes feel interrupted. Oscar feels disappointed because he thought he was being efficient. His supervisor asks how he would like to respond to the feedback.`,
    pivotInsight:
      "Feedback should be approached as a chance to understand and improve. Asking for specific examples and reflecting is better than dismissing feedback or seeking reassurance that it is unfair.",
    gmpRef: {
      label: "GMP · Knowledge, skills and development",
      url: `${GMP_MAIN_URL}/knowledge-skills-and-development`,
    },
    items: [
      {
        id: "app-029-a",
        text: "Ask his supervisor for examples so he can understand when patients felt interrupted and how he could improve.",
        correctRating: "very_appropriate",
        rationale:
          "This is very appropriate. Oscar is engaging constructively with feedback and seeking specific information that can help him improve his communication with patients.",
        whyNotAdjacent:
          "This is not merely 'Appropriate' because it directly supports reflection and targeted development.",
        gmpRef: {
          label: "GMP · Knowledge, skills and development",
          url: `${GMP_MAIN_URL}/knowledge-skills-and-development`,
        },
      },
      {
        id: "app-029-b",
        text: "Tell his supervisor that he is surprised by the feedback but will reflect on it.",
        correctRating: "appropriate",
        rationale:
          "This is appropriate because Oscar acknowledges the feedback and remains open to reflection. However, it is less useful than asking for specific examples and practical ways to improve.",
        whyNotAdjacent:
          "This is not 'Very Appropriate' because it does not actively seek clarification or a development plan.",
      },
      {
        id: "app-029-c",
        text: "Ask other students whether they have also received unfair feedback from the same supervisor.",
        correctRating: "inappropriate",
        rationale:
          "This is inappropriate. It shifts the focus away from Oscar's own development and assumes the feedback is unfair. Negative feedback is a normal part of training and should be considered constructively.",
        whyNotAdjacent:
          "This is not 'Very Inappropriate' because it may come from feeling upset, but it is not a helpful or professional response.",
      },
      {
        id: "app-029-d",
        text: "Say he would rather focus on the positive feedback because the criticism has upset him.",
        correctRating: "very_inappropriate",
        rationale:
          "This is very inappropriate. Supervisors need to give honest feedback about strengths and areas for development. Refusing to discuss concerns about patient communication prevents Oscar from improving.",
        whyNotAdjacent:
          "This is not merely 'Inappropriate' because it rejects feedback that is directly relevant to patient care and professional development.",
      },
    ],
  },

  {
    id: "app-030",
    type: "appropriateness",
    domain: "colleagues_culture_safety",
    difficulty: "standard",
    stem: `Sam is a medical student working on a ward. A receptionist is dealing with an angry visitor who is shouting about waiting times. The visitor slams his hand on the desk and other patients in the waiting area look frightened. The receptionist appears shaken.`,
    pivotInsight:
      "Threatening behaviour in a patient area affects staff safety and other patients. Routine work should not take priority over addressing immediate safety and welfare concerns.",
    gmpRef: {
      label: "GMP · Colleagues, culture and safety",
      url: `${GMP_MAIN_URL}/colleagues-culture-and-safety`,
    },
    items: [
      {
        id: "app-030-a",
        text: "Seek help from an appropriate senior member of staff or security, while ensuring the receptionist is not left unsupported.",
        correctRating: "very_appropriate",
        rationale:
          "This is very appropriate. The visitor's behaviour is threatening and is affecting the receptionist and others nearby. Sam should seek appropriate help and ensure the situation is managed safely.",
        whyNotAdjacent:
          "This is not merely 'Appropriate' because it responds promptly to a safety and welfare issue.",
        gmpRef: {
          label: "GMP · Colleagues, culture and safety",
          url: `${GMP_MAIN_URL}/colleagues-culture-and-safety`,
        },
      },
      {
        id: "app-030-b",
        text: "Consider the impact of the visitor's behaviour on other patients in the waiting area.",
        correctRating: "very_appropriate",
        rationale:
          "This is very appropriate. Other patients may feel threatened or distressed by the visitor's behaviour, so their safety and comfort should be considered when deciding how to respond.",
        whyNotAdjacent:
          "This is not merely 'Appropriate' because the behaviour is visibly affecting the wider waiting area.",
      },
      {
        id: "app-030-c",
        text: "Ignore the situation because Sam has clinical tasks to complete.",
        correctRating: "very_inappropriate",
        rationale:
          "This is very inappropriate. A threatening situation involving staff and patients takes priority over routine tasks and should be addressed promptly.",
        whyNotAdjacent:
          "This is not just 'Inappropriate' because ignoring the situation may allow a safety risk to continue.",
      },
      {
        id: "app-030-d",
        text: "Avoid getting involved because the visitor may make a complaint.",
        correctRating: "very_inappropriate",
        rationale:
          "This is very inappropriate. The possibility of a complaint should not prevent staff from responding to threatening or disruptive behaviour in line with policy.",
        whyNotAdjacent:
          "This is clearly 'Very Inappropriate' because fear of complaint is not a valid reason to ignore unsafe behaviour.",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // IMPORTANCE (continued)
  // ─────────────────────────────────────────────────────────────
  {
    id: "imp-004",
    type: "importance",
    domain: "trust_professionalism",
    difficulty: "standard",
    stem: `Lorenzo is a medical student completing an anonymous peer assessment of his classmate Declan. Based on his direct observations, Lorenzo would honestly rate Declan below the expected standard in two clinical competency areas. Before Lorenzo submits the form, Declan approaches him and reveals he knows who is completing his assessment. He asks Lorenzo to be generous with the scores, explaining that a poor result could jeopardise his placement and that he has been struggling personally. Lorenzo is now deciding how to complete the form.`,
    pivotInsight:
      "The integrity of assessment processes depends entirely on honest reporting. A student who adjusts scores under personal pressure helps no one, least of all Declan, who needs accurate feedback to receive the support that will help him improve.",
    gmpRef: {
      label: "GMP · Trust and professionalism",
      url: `${GMP_MAIN_URL}/trust-and-professionalism`,
    },
    items: [
      {
        id: "imp-004-a",
        text: "That the purpose of peer assessment is to identify students who need additional support.",
        correctRating: "very_important",
        rationale:
          "Peer assessments exist precisely to give educators an accurate picture of student development. Inflating scores to protect a friend denies Declan access to the targeted support he may genuinely need to become a safe clinician. Honest assessment is not unkind, it is a professional duty that serves Declan's development and, ultimately, patient safety.",
        whyNotAdjacent:
          "This is 'Very Important', not merely 'Important'. Honest self-assessment and peer assessment are core GMP obligations, and the consequences of dishonest assessment extend directly to patient safety.",
        gmpRef: {
          label: "GMP · Trust and professionalism",
          url: `${GMP_MAIN_URL}/trust-and-professionalism`,
        },
      },
      {
        id: "imp-004-b",
        text: "That Declan is experiencing personal difficulties which may be affecting his performance.",
        correctRating: "important",
        rationale:
          "Personal circumstances are a relevant and legitimate consideration. If Declan is struggling due to external pressures, his supervisors and support services need to know, but they can only help if they have accurate information. Understanding the context does not change what Lorenzo should report, but it informs how he might support Declan through other channels.",
        whyNotAdjacent:
          "This is 'Important', not 'Very Important'. It contextualises the situation but does not justify dishonest assessment.",
      },
      {
        id: "imp-004-c",
        text: "That Declan has directly asked him to adjust the scores, placing Lorenzo in an uncomfortable position.",
        correctRating: "not_important",
        rationale:
          "The discomfort of being asked to be dishonest is an understandable human experience, but it is not a professional consideration. GMP requires honesty in all professional communications and assessments. Being placed in a difficult position by a colleague's request does not alter the obligation to respond professionally and honestly.",
        whyNotAdjacent:
          "This is 'Not Important at All' as a professional factor. Personal discomfort is never a legitimate reason to compromise professional integrity.",
      },
      {
        id: "imp-004-d",
        text: "That adjusting assessment scores under pressure could set a pattern for dishonest record-keeping in clinical practice.",
        correctRating: "very_important",
        rationale:
          "The habits of professional conduct formed during training carry forward into practice. A student who adjusts records under pressure is developing a pattern that, in a clinical setting, could mean falsified documentation, unreported errors, or concealed incompetence. The integrity of professional assessment is a foundation of safe healthcare systems.",
        whyNotAdjacent:
          "This is 'Very Important'. It connects personal behaviour in training directly to systemic professional integrity, a core GMP concern.",
      },
    ],
  },

  {
    id: "imp-005",
    type: "importance",
    domain: "colleagues_culture_safety",
    difficulty: "standard",
    stem: `Harriet is a dental student who realises that her classmate Finn has been listed as present on the clinical attendance register for three consecutive sessions, despite Harriet being certain she has not seen him at any of them. A mutual classmate confirms that Finn has been asking other students to sign in for him while he was absent. Harriet is now considering how to respond.`,
    pivotInsight:
      "Falsifying attendance records is not an administrative matter, it is a professional integrity issue with direct implications for patient safety. Students who are not present cannot develop the clinical competencies that will one day protect patients.",
    gmpRef: {
      label: "GMP · Colleagues, culture and safety",
      url: `${GMP_MAIN_URL}/colleagues-culture-and-safety`,
    },
    items: [
      {
        id: "imp-005-a",
        text: "That Finn may not have received the clinical training required to safely treat patients in the future.",
        correctRating: "very_important",
        rationale:
          "Clinical attendance is not merely a bureaucratic requirement, it is how students develop the skills and experience needed to provide safe patient care. A student who falsifies their attendance is creating a gap between their recorded competence and their actual competence. This gap poses a direct future risk to patients and is the most important consideration in this scenario.",
        whyNotAdjacent:
          "This is 'Very Important', not merely 'Important'. It connects academic misconduct directly to the patient safety implications that underpin GMP's standards of honesty.",
        gmpRef: {
          label: "GMP · Colleagues, culture and safety",
          url: `${GMP_MAIN_URL}/colleagues-culture-and-safety`,
        },
      },
      {
        id: "imp-005-b",
        text: "That falsifying attendance records is a breach of professional integrity.",
        correctRating: "very_important",
        rationale:
          "GMP requires all clinicians, including students, to act honestly in all professional activities. Creating or enabling false records is dishonest regardless of the context. This conduct would be misconduct in a clinical setting (e.g., falsifying patient records) and it is no less serious as a student. Honesty and integrity are not optional for dental professionals.",
        whyNotAdjacent:
          "This is 'Very Important'. Honesty is a non-negotiable GMP standard, not a preference.",
      },
      {
        id: "imp-005-c",
        text: "That Finn may face serious academic and professional consequences if this is reported.",
        correctRating: "not_important",
        rationale:
          "The potential consequences for Finn are not a professional consideration that should affect Harriet's decision. GMP is explicit that concerns about patient safety and professional conduct must be raised regardless of the personal impact on the individual concerned. Finn's consequences are a result of his own choices, not a reason for Harriet to remain silent.",
        whyNotAdjacent:
          "This is 'Not Important at All'. Personal loyalty or concern for a colleague's consequences must not override the professional duty to report dishonest conduct.",
      },
      {
        id: "imp-005-d",
        text: "That other students who signed in for Finn are also involved in the misconduct.",
        correctRating: "minor_importance",
        rationale:
          "The fact that others have been involved in the falsification is relevant context, it may affect how Harriet approaches the situation and how she describes the scope of the issue when she reports it. However, it does not alter her primary responsibility, which is to raise the concern. This is a minor but not irrelevant consideration.",
        whyNotAdjacent:
          "This is 'Of Minor Importance', not 'Not Important at All'. It is relevant context for understanding the scope of the issue, even though it does not change what Harriet should do.",
      },
    ],
  },

  {
    id: "imp-006",
    type: "importance",
    domain: "patients_partnership_communication",
    difficulty: "challenging",
    stem: `Megan is a third-year medical student sitting in on a GP consultation. The patient, Mrs Baig, has attended with a musculoskeletal complaint. While the GP briefly steps out, Mrs Baig makes an almost incidental comment to Megan: "I sometimes get a bit rough treatment at home." She immediately changes the subject and adds that she does not want to talk about it. When the GP returns, he proceeds with the routine consultation. Megan is deciding how to respond.`,
    pivotInsight:
      "A disclosure of possible domestic abuse must be taken seriously even when it is brief, ambiguous, or immediately withdrawn. The patient's reluctance to continue does not remove the duty to respond, it shapes how that duty is carried out.",
    gmpRef: {
      label: "GMP · Patients, partnership and communication",
      url: `${GMP_MAIN_URL}/patients-partnership-and-communication`,
    },
    items: [
      {
        id: "imp-006-a",
        text: "That Mrs Baig's comment may indicate she is experiencing harm at home.",
        correctRating: "very_important",
        rationale:
          "Even brief and ambiguous disclosures of possible domestic abuse must be taken seriously. GMP requires clinicians to act when there are reasonable grounds to believe a patient may be at risk of harm. The fact that Mrs Baig quickly withdrew the comment may itself be significant, it is common for patients experiencing domestic abuse to minimise or retract disclosures. This is the most important consideration in this scenario.",
        whyNotAdjacent:
          "This is 'Very Important'. Patient safety and safeguarding obligations are paramount, even, especially, when the information is incomplete.",
        gmpRef: {
          label: "GMP · Patients, partnership and communication",
          url: `${GMP_MAIN_URL}/patients-partnership-and-communication`,
        },
      },
      {
        id: "imp-006-b",
        text: "That Mrs Baig said she did not want to discuss the matter further.",
        correctRating: "important",
        rationale:
          "Respecting a patient's expressed wishes is a core GMP obligation. Mrs Baig's reluctance to continue shapes how Megan responds, she should not press the patient in a way that feels coercive or unsafe. However, it does not mean the concern should be ignored. Megan must still ensure the GP is made aware, so the practice can respond appropriately and compassionately at the right moment.",
        whyNotAdjacent:
          "This is 'Important', not 'Very Important'. Autonomy is a genuine consideration, but it does not override the safeguarding duty, it informs how that duty is carried out.",
      },
      {
        id: "imp-006-c",
        text: "That Megan is only a student and this matter should be handled by the GP.",
        correctRating: "minor_importance",
        rationale:
          "It is entirely appropriate for Megan to bring this to the GP's attention rather than manage it independently. The GP is the responsible clinician and has the authority and training to respond appropriately. However, 'I am only a student' cannot be used as a reason for inaction. Megan has a duty to pass the information on, she does not need to manage the situation herself.",
        whyNotAdjacent:
          "This is 'Of Minor Importance'. It correctly identifies that Megan should involve the GP, but must not become an excuse for saying nothing at all.",
      },
      {
        id: "imp-006-d",
        text: "That Mrs Baig attended today for an unrelated musculoskeletal complaint.",
        correctRating: "not_important",
        rationale:
          "The presenting complaint does not limit the duty to act on safeguarding concerns that arise during a consultation. Clinical interactions frequently reveal issues that go beyond the stated reason for attendance. GMP requires that patients' safety is protected across all aspects of their care, not only within the narrow scope of what brought them to the appointment.",
        whyNotAdjacent:
          "This is 'Not Important at All'. The reason for attendance has no bearing on the duty to act on a safeguarding disclosure.",
      },
    ],
  },

  {
    id: "imp-007",
    type: "importance",
    domain: "knowledge_skills_development",
    difficulty: "standard",
    stem: `Theo is a first-year dental student on a community placement. The supervising dentist, Dr Costa, is running significantly behind schedule and is visibly under pressure. Dr Costa asks Theo to make direct entries into two patients' electronic clinical records, dictating what to write. Theo has not been trained on the practice's record system and is uncertain whether he has the authority to make entries on real patient files at his current stage of training.`,
    pivotInsight:
      "Clinical records are legal documents. An entry made in error by an untrained student could mislead future clinicians with serious consequences. The appeal to help a busy supervisor is understandable, but it does not override clinical safety requirements.",
    gmpRef: {
      label: "GMP · Knowledge, skills and development",
      url: `${GMP_MAIN_URL}/knowledge-skills-and-development`,
    },
    items: [
      {
        id: "imp-007-a",
        text: "That accurate clinical records are essential for the continuity and safety of patient care.",
        correctRating: "very_important",
        rationale:
          "Clinical records are legal documents that future clinicians rely on to understand a patient's history, current treatment, and any relevant risks. An entry made in error could mislead subsequent practitioners with serious consequences. GMP requires that records are completed accurately and by those with appropriate training and authority to do so.",
        whyNotAdjacent:
          "This is 'Very Important'. Clinical record accuracy is a patient safety issue, not an administrative preference.",
        gmpRef: {
          label: "GMP · Knowledge, skills and development",
          url: `${GMP_MAIN_URL}/knowledge-skills-and-development`,
        },
      },
      {
        id: "imp-007-b",
        text: "That Theo has not been trained on the record system he would be using.",
        correctRating: "very_important",
        rationale:
          "GMP requires clinicians at all levels to recognise and work within the limits of their competence. Using an unfamiliar system creates a real risk of errors, misrecorded treatments, incorrect navigation, or misattributed entries. Lack of training is not a minor concern; it is a specific competence gap that directly affects the quality and safety of clinical records.",
        whyNotAdjacent:
          "This is 'Very Important'. Proceeding with a clinical task without appropriate training is a direct competence concern under GMP.",
      },
      {
        id: "imp-007-c",
        text: "That Dr Costa is under significant time pressure and the request is intended to benefit the running of the practice.",
        correctRating: "minor_importance",
        rationale:
          "Time pressure in clinical settings is real and often genuinely difficult. Acknowledging the context in which the request is made gives Theo a fuller picture. However, workload pressures do not justify bypassing training requirements or asking an unqualified student to perform tasks that carry clinical risk. They are a reason to flag the systemic problem through appropriate channels, not to work around competence requirements.",
        whyNotAdjacent:
          "This is 'Of Minor Importance'. The context is relevant but cannot justify bypassing competence requirements.",
      },
      {
        id: "imp-007-d",
        text: "Whether other students on the same placement have been asked to do similar tasks.",
        correctRating: "not_important",
        rationale:
          "The practice of others has no bearing on whether a task is safe or appropriate for Theo at his current stage of training. GMP standards apply to individuals, not groups. If something is not appropriate given Theo's training and authorisation, the fact that others may have done it does not make it acceptable.",
        whyNotAdjacent:
          "This is 'Not Important at All'. The normalisation of a potentially unsafe practice by others does not make it correct.",
      },
    ],
  },

  {
    id: "imp-008",
    type: "importance",
    domain: "trust_professionalism",
    difficulty: "standard",
    stem: `Camille is a final-year dental student who, during a supervised procedure, mistakenly applied a slightly incorrect topical solution to a patient's gum before the correct one was applied. The error was identified and corrected immediately by her supervisor, Dr Yeoman. The patient did not appear to notice and no harm was caused. Dr Yeoman tells Camille: "These things happen. There is no need to tell the patient, it was minor and we don't want to alarm them unnecessarily." Camille is deciding how she should respond.`,
    pivotInsight:
      "The duty of candour requires honesty with patients about things that have gone wrong in their care, even where the outcome is not harmful. This is a professional and legal obligation, not a discretionary act of kindness.",
    gmpRef: {
      label: "GMP · Trust and professionalism",
      url: `${GMP_MAIN_URL}/trust-and-professionalism`,
    },
    items: [
      {
        id: "imp-008-a",
        text: "That the patient has a right to know when something has gone wrong in their care.",
        correctRating: "very_important",
        rationale:
          "The duty of candour, a professional and legal obligation, requires that patients are informed when errors occur during their treatment, even if no harm results. GMP is explicit: patients must be told when something has gone wrong. Dr Yeoman's instruction, though likely well-intentioned, conflicts directly with this duty.",
        whyNotAdjacent:
          "This is 'Very Important'. The duty of candour is a core GMP standard with no harm threshold.",
        gmpRef: {
          label: "GMP · Trust and professionalism",
          url: `${GMP_MAIN_URL}/trust-and-professionalism`,
        },
      },
      {
        id: "imp-008-b",
        text: "That the error did not cause any detectable harm to the patient.",
        correctRating: "minor_importance",
        rationale:
          "The absence of harm is relevant context, it may affect the tone of the disclosure and is genuinely reassuring. However, it does not remove the obligation to disclose. A finding of no harm is part of what should be explained to the patient, not a reason to stay silent.",
        whyNotAdjacent:
          "This is 'Of Minor Importance'. It is context for how the disclosure is made, not a reason to withhold it.",
      },
      {
        id: "imp-008-c",
        text: "That Dr Yeoman has instructed Camille not to disclose the incident to the patient.",
        correctRating: "not_important",
        rationale:
          "Being instructed by a supervisor to remain silent does not override the duty of candour. GMP is clear that professional obligations are not dissolved by instructions from a senior colleague. If Dr Yeoman refuses to disclose, Camille may need to raise the concern through appropriate channels.",
        whyNotAdjacent:
          "This is 'Not Important at All' as a reason to withhold disclosure. Professional obligations cannot be delegated away by a senior's instruction.",
      },
      {
        id: "imp-008-d",
        text: "That transparency about clinical errors contributes to learning and reduces future risk.",
        correctRating: "important",
        rationale:
          "The broader systemic value of honesty about errors, in terms of learning, quality improvement, and professional culture, is genuinely important. However, in this immediate scenario, the primary reason to disclose is the patient's right to know, not the systemic benefits. This consideration is real but secondary.",
        whyNotAdjacent:
          "This is 'Important'. A valid and valuable consideration, but secondary to the direct duty to the patient.",
      },
    ],
  },

  {
    id: "imp-009",
    type: "importance",
    domain: "knowledge_skills_development",
    difficulty: "challenging",
    stem: `Amir is a medical student on a surgical placement. A ward nurse approaches him and asks if he can obtain consent for a patient, Mr Dubois, who is going to theatre in 45 minutes for an elective hernia repair. The nurse explains that the surgical registrar is scrubbed in and unavailable, and the ward is busy. Amir has observed consent processes during his placement but has never been trained to obtain surgical consent independently.`,
    pivotInsight:
      "Obtaining informed surgical consent requires specific training and detailed knowledge of the procedure's risks, benefits, and alternatives. A student who has not received this training cannot legally or ethically obtain consent, regardless of time pressure.",
    gmpRef: {
      label: "GMP · Knowledge, skills and development",
      url: `${GMP_MAIN_URL}/knowledge-skills-and-development`,
    },
    items: [
      {
        id: "imp-009-a",
        text: "That Amir has not been trained to obtain informed surgical consent independently.",
        correctRating: "very_important",
        rationale:
          "Obtaining surgical consent requires specific training and a detailed understanding of the procedure's risks, benefits, and alternatives. Without this, Amir cannot ensure Mr Dubois is truly informed. GMP requires that clinicians practise within their competence. Proceeding would place the patient's right to informed consent in jeopardy.",
        whyNotAdjacent:
          "This is 'Very Important'. Competence to obtain consent is both a patient safety and patient autonomy issue.",
        gmpRef: {
          label: "GMP · Knowledge, skills and development",
          url: `${GMP_MAIN_URL}/knowledge-skills-and-development`,
        },
      },
      {
        id: "imp-009-b",
        text: "That the surgery may be delayed if consent is not obtained promptly.",
        correctRating: "minor_importance",
        rationale:
          "Time pressure is a genuine logistical concern. However, it cannot justify asking an untrained student to perform a task with significant legal and patient safety implications. Urgency in clinical settings can never override competence requirements.",
        whyNotAdjacent:
          "This is 'Of Minor Importance'. It explains the context but cannot justify proceeding outside training.",
      },
      {
        id: "imp-009-c",
        text: "That the patient has a right to receive accurate information about his procedure from someone with knowledge of it.",
        correctRating: "very_important",
        rationale:
          "Mr Dubois must be given complete and accurate information about his surgery to make a free and informed decision. This can only be done by someone who genuinely understands the procedure, its risks, and its alternatives. A student lacking this training cannot fulfil this fundamental patient right.",
        whyNotAdjacent:
          "This is 'Very Important'. Informed consent is a patient right, not a procedural formality.",
      },
      {
        id: "imp-009-d",
        text: "That other students may have been asked to obtain consent in similar circumstances on this ward.",
        correctRating: "not_important",
        rationale:
          "The practice of others does not establish an acceptable standard. If other students have obtained consent without proper training, that represents a systemic failure, not a precedent. GMP standards apply to individuals regardless of what colleagues may have done.",
        whyNotAdjacent:
          "This is 'Not Important at All'. The normalisation of an unsafe practice by others does not make it acceptable.",
      },
    ],
  },

  {
    id: "imp-010",
    type: "importance",
    domain: "colleagues_culture_safety",
    difficulty: "foundation",
    stem: `Beatrix is a first-year dental student partnered with her classmate Omar for a joint clinical skills session involving patient contact. That morning, Omar tells Beatrix he is unwell, he has a temperature, a cough, and feels "pretty rough", but says he cannot miss the session because he is already borderline on attendance. He asks Beatrix not to say anything. Beatrix is considering what to do.`,
    pivotInsight:
      "A student who is unwell and potentially infectious attending a clinical session creates a direct risk to vulnerable patients. Loyalty to a classmate cannot override the duty to protect patients from preventable harm.",
    gmpRef: {
      label: "GMP · Colleagues, culture and safety",
      url: `${GMP_MAIN_URL}/colleagues-culture-and-safety`,
    },
    items: [
      {
        id: "imp-010-a",
        text: "That patients in a clinical environment may be vulnerable and at increased risk from infection.",
        correctRating: "very_important",
        rationale:
          "Clinical patients may be immunocompromised, elderly, or otherwise vulnerable. GMP places patient safety above all other considerations, including personal loyalty. A student who attends a clinical session while unwell and potentially infectious may cause direct harm to patients. This is the most important consideration in this scenario.",
        whyNotAdjacent:
          "This is 'Very Important'. Patient safety in clinical environments is the overriding concern.",
        gmpRef: {
          label: "GMP · Colleagues, culture and safety",
          url: `${GMP_MAIN_URL}/colleagues-culture-and-safety`,
        },
      },
      {
        id: "imp-010-b",
        text: "That Omar's attendance record places him at academic risk if he misses this session.",
        correctRating: "not_important",
        rationale:
          "Omar's academic difficulties are a real concern and deserve a compassionate response, through proper channels. However, the potential consequence for his progression does not make it acceptable for him to attend a patient contact session while unwell. Academic pressures are not a legitimate professional consideration when patient safety is at stake.",
        whyNotAdjacent:
          "This is 'Not Important at All'. Omar's attendance concerns must be addressed through appropriate absence processes, not by attending while potentially infectious.",
      },
      {
        id: "imp-010-c",
        text: "That there may be formal illness-related absence processes that could protect Omar without risking patient safety.",
        correctRating: "important",
        rationale:
          "Most clinical schools have procedures for illness-related absences that prevent students from being unfairly penalised. Understanding whether these exist is genuinely important, it may represent the most helpful thing Beatrix can offer Omar: a way to manage the situation that protects both him and the patients.",
        whyNotAdjacent:
          "This is 'Important'. It represents a constructive path forward for Omar without compromising patient safety.",
      },
      {
        id: "imp-010-d",
        text: "That Omar has asked Beatrix to keep the matter confidential.",
        correctRating: "minor_importance",
        rationale:
          "Omar's request for confidentiality is understandable but does not override the concern about patient safety. It is relevant context, Beatrix should handle the situation with sensitivity and respect for Omar, but it cannot be the reason for inaction.",
        whyNotAdjacent:
          "This is 'Of Minor Importance'. It shapes how Beatrix responds but cannot prevent her from acting.",
      },
    ],
  },

  {
    id: "imp-011",
    type: "importance",
    domain: "patients_partnership_communication",
    difficulty: "standard",
    stem: `Roberto is a final-year medical student observing a palliative care consultation. The patient, Mr Sherwin, is 78 years old with terminal cancer and has clearly expressed to the clinical team that he does not wish to receive further aggressive treatment and wants to focus on comfort care. During the consultation, his adult children repeatedly press him to "at least try the chemotherapy" and tell him he is "giving up." Mr Sherwin appears distressed and visibly withdraws as his family speak.`,
    pivotInsight:
      "A competent patient's expressed wishes about their own care must be respected, even when family members disagree. Family concern is understandable but cannot override patient autonomy, the patient is the decision-maker.",
    gmpRef: {
      label: "GMP · Patients, partnership and communication",
      url: `${GMP_MAIN_URL}/patients-partnership-and-communication`,
    },
    items: [
      {
        id: "imp-011-a",
        text: "That Mr Sherwin has clearly and previously expressed his own wishes about his treatment.",
        correctRating: "very_important",
        rationale:
          "A competent adult has the absolute right to make decisions about their own care, including the right to decline treatment. Mr Sherwin has clearly expressed his wishes to the clinical team. GMP requires that patient autonomy is respected, and the distress he is showing suggests his expressed preferences are not being upheld in this moment.",
        whyNotAdjacent:
          "This is 'Very Important'. Patient autonomy in treatment decisions is a fundamental GMP right.",
        gmpRef: {
          label: "GMP · Patients, partnership and communication",
          url: `${GMP_MAIN_URL}/patients-partnership-and-communication`,
        },
      },
      {
        id: "imp-011-b",
        text: "That Mr Sherwin's family are motivated by genuine concern for his wellbeing.",
        correctRating: "minor_importance",
        rationale:
          "The family's distress and concern are real and understandable. Compassionate acknowledgement of their feelings is part of good palliative care. However, their concerns, however sincere, cannot override the patient's own expressed wishes. This shapes how the conversation is handled, not the clinical decision itself.",
        whyNotAdjacent:
          "This is 'Of Minor Importance'. It is relevant to how the team communicates with the family, not to whether the patient's decision should be respected.",
      },
      {
        id: "imp-011-c",
        text: "That Mr Sherwin appears visibly distressed by the family's pressure during the consultation.",
        correctRating: "very_important",
        rationale:
          "A patient who is distressed and withdrawing in response to family pressure is not in a position to freely reaffirm or reconsider his wishes. GMP requires that patients are treated with dignity and that their emotional welfare is protected during consultations. The distress is a signal that the dynamic in the room needs to change.",
        whyNotAdjacent:
          "This is 'Very Important'. A patient showing distress in a consultation must be protected, and the clinical team must ensure his wellbeing takes priority.",
      },
      {
        id: "imp-011-d",
        text: "That the family's pressure might lead Mr Sherwin to reconsider and accept the chemotherapy.",
        correctRating: "not_important",
        rationale:
          "The possibility that pressure might cause Mr Sherwin to change his mind is not a reason to allow the pressure to continue, it is a reason to stop it. A decision made under duress does not reflect the patient's genuine autonomous wishes. GMP is clear that patients must be free from coercion when making treatment decisions.",
        whyNotAdjacent:
          "This is 'Not Important at All'. Changing a patient's mind through family pressure is contrary to patient autonomy and is not a legitimate clinical consideration.",
      },
    ],
  },

  {
    id: "imp-012",
    type: "importance",
    domain: "trust_professionalism",
    difficulty: "challenging",
    stem: `Kezia is a medical student who has been given login access to the hospital's electronic patient record system for her placement. At the end of a shift, out of curiosity about the outcome of a case she observed earlier in the week, she considers looking up a patient she was not directly involved with today, simply to see how their condition has progressed.`,
    pivotInsight:
      "Access to patient records must be justified by clinical need. Curiosity, however well-intentioned, is not a legitimate reason to access a patient's records, and accessing records without clinical justification is a breach of confidentiality.",
    gmpRef: {
      label: "GMP · Trust and professionalism",
      url: `${GMP_MAIN_URL}/trust-and-professionalism`,
    },
    items: [
      {
        id: "imp-012-a",
        text: "That accessing a patient's records without clinical justification is a breach of patient confidentiality.",
        correctRating: "very_important",
        rationale:
          "Patient records contain highly sensitive information and must only be accessed by clinicians with a direct clinical need to do so. GMP and data protection legislation are clear that accessing records out of curiosity, even well-meaning curiosity, is a breach of confidentiality. Having system access does not confer the right to use it for non-clinical purposes.",
        whyNotAdjacent:
          "This is 'Very Important'. Unauthorised access to patient records is a serious professional and legal breach.",
        gmpRef: {
          label: "GMP · Trust and professionalism",
          url: `${GMP_MAIN_URL}/trust-and-professionalism`,
        },
      },
      {
        id: "imp-012-b",
        text: "That Kezia has a general interest in clinical outcomes and intends no harm.",
        correctRating: "not_important",
        rationale:
          "Intellectual curiosity is an admirable quality, but it is not a clinical justification for accessing patient records. GMP is explicit that records may only be accessed for purposes directly connected to a patient's care. General interest in outcomes is not sufficient, however benign.",
        whyNotAdjacent:
          "This is 'Not Important at All'. Curiosity and good intent do not constitute a clinical need.",
      },
      {
        id: "imp-012-c",
        text: "That looking at the records could help Kezia learn from the case.",
        correctRating: "minor_importance",
        rationale:
          "Educational value is a more legitimate consideration than pure curiosity, and learning from clinical cases is encouraged. However, there are appropriate ways to do this, asking the team about the outcome, reviewing de-identified case discussions, that do not involve unauthorised access to live patient records.",
        whyNotAdjacent:
          "This is 'Of Minor Importance'. The educational intent is genuine, but it does not justify a confidentiality breach.",
      },
      {
        id: "imp-012-d",
        text: "That Kezia's system access is logged and could be reviewed by hospital administrators.",
        correctRating: "important",
        rationale:
          "The fact that system access is logged is an important practical consideration: accessing records for non-clinical purposes creates an auditable trail that could have serious professional consequences. This is important primarily as a deterrent, but the primary reason not to access the records is the breach of confidentiality itself.",
        whyNotAdjacent:
          "This is 'Important'. A relevant practical consideration, but secondary to the core ethical issue.",
      },
    ],
  },

  {
    id: "imp-013",
    type: "importance",
    domain: "knowledge_skills_development",
    difficulty: "standard",
    stem: `Priya is a third-year medical student on an A&E placement during a short-staffed shift. An experienced A&E nurse, Nurse Thompson, asks Priya to cannulate a patient alone in a side room, without supervision, to free up the nurse for another patient. Priya has practised cannulation in simulation but has only once observed it performed on a real patient.`,
    pivotInsight:
      "Understaffing and clinical pressure do not expand a student's authorised scope of practice. A student who agrees to perform an unsupervised procedure they are not trained for places the patient and themselves at risk.",
    gmpRef: {
      label: "GMP · Knowledge, skills and development",
      url: `${GMP_MAIN_URL}/knowledge-skills-and-development`,
    },
    items: [
      {
        id: "imp-013-a",
        text: "That Priya is not yet trained or signed off for independent cannulation on real patients.",
        correctRating: "very_important",
        rationale:
          "GMP requires clinicians to practise within their competence, and simulation training does not equate to clinical sign-off. Performing an unsupervised procedure at a training level that has not been reached risks patient harm. The student's training status is the most important consideration, it is the direct patient safety issue.",
        whyNotAdjacent:
          "This is 'Very Important'. Working outside clinical competence cannot be overridden by pressure or goodwill.",
        gmpRef: {
          label: "GMP · Knowledge, skills and development",
          url: `${GMP_MAIN_URL}/knowledge-skills-and-development`,
        },
      },
      {
        id: "imp-013-b",
        text: "That the ward is short-staffed and the request reflects genuine service pressure.",
        correctRating: "minor_importance",
        rationale:
          "Staffing pressures are a real and serious problem in healthcare systems, and it is right that Priya is sensitive to the pressure Nurse Thompson is under. However, systemic pressures do not change what Priya is competent to do safely. They are context, not justification.",
        whyNotAdjacent:
          "This is 'Of Minor Importance'. The context is real but cannot justify exceeding clinical competence.",
      },
      {
        id: "imp-013-c",
        text: "That agreeing could allow Priya to gain valuable clinical experience.",
        correctRating: "not_important",
        rationale:
          "Gaining clinical experience is a legitimate aim, but experience must be acquired safely through proper supervision. Performing an independent procedure without the training level required is not experience, it is risk. The distinction between supervised training and independent unsupervised practice is fundamental to GMP.",
        whyNotAdjacent:
          "This is 'Not Important at All'. The desire for experience cannot justify unsafe unsupervised practice.",
      },
      {
        id: "imp-013-d",
        text: "That Priya should clearly explain her training status to Nurse Thompson and suggest an alternative arrangement.",
        correctRating: "important",
        rationale:
          "How Priya communicates her limitations is genuinely important. Declining without explanation could create unnecessary friction; explaining clearly that she is not signed off and actively suggesting alternatives, such as helping find a qualified colleague, is both professional and practically helpful. The manner of the refusal matters.",
        whyNotAdjacent:
          "This is 'Important'. Clear communication and proactive problem-solving when declining an inappropriate request reflects good professional practice.",
      },
    ],
  },

  {
    id: "imp-014",
    type: "importance",
    domain: "colleagues_culture_safety",
    difficulty: "challenging",
    stem: `Jasper is a medical student who has independently heard concerns about a senior registrar, Dr Hadley, from three separate classmates. Each student has described a different uncomfortable encounter: one felt pressured during an assessment feedback session; one overheard Dr Hadley making dismissive comments about a patient; and one reported that Dr Hadley asked her to falsify part of a training record. Jasper is considering whether and how to act.`,
    pivotInsight:
      "A pattern of independent concerns about the same individual carries more weight than any single incident. GMP requires concerns about a colleague's conduct to be raised appropriately, and a pattern of behaviour suggests a systemic issue that cannot be dismissed.",
    gmpRef: {
      label: "GMP · Colleagues, culture and safety",
      url: `${GMP_MAIN_URL}/colleagues-culture-and-safety`,
    },
    items: [
      {
        id: "imp-014-a",
        text: "That three independent students have raised concerns about the same registrar in different contexts.",
        correctRating: "very_important",
        rationale:
          "A single concerning incident could be a misunderstanding. Three separate students, independently, raising concerns about the same registrar across different contexts is a significant pattern. GMP requires that concerns about colleagues' conduct are raised through appropriate channels. A pattern of this nature cannot be attributed to coincidence and demands a formal response.",
        whyNotAdjacent:
          "This is 'Very Important'. A pattern of independent concerns is a serious professional safety signal that cannot be ignored.",
        gmpRef: {
          label: "GMP · Colleagues, culture and safety",
          url: `${GMP_MAIN_URL}/colleagues-culture-and-safety`,
        },
      },
      {
        id: "imp-014-b",
        text: "That one of the concerns involves an allegation of falsifying a training record.",
        correctRating: "very_important",
        rationale:
          "Falsifying clinical or training records is among the most serious professional misconduct issues under GMP. Even if the other concerns were ambiguous, this specific allegation is not, it directly implicates GMP's requirements for honesty and integrity in professional documentation. This concern alone warrants formal escalation.",
        whyNotAdjacent:
          "This is 'Very Important'. An allegation of falsifying records is a serious professional integrity matter requiring formal action.",
      },
      {
        id: "imp-014-c",
        text: "That the classmates shared their concerns privately and may not want to come forward formally.",
        correctRating: "important",
        rationale:
          "Respecting the privacy and agency of those who shared concerns is an important consideration that should shape how Jasper proceeds. He should engage them in the decision about how to act rather than acting over their heads. Formal concerns are also stronger when they have the support of those directly affected.",
        whyNotAdjacent:
          "This is 'Important'. The classmates' agency in the process matters and should inform how Jasper acts, though it cannot ultimately prevent the concerns from being raised.",
      },
      {
        id: "imp-014-d",
        text: "That raising concerns about a senior registrar could affect Jasper's own standing in the department.",
        correctRating: "not_important",
        rationale:
          "Personal concerns about professional standing or relationships must not prevent a student from fulfilling their duty to raise concerns about unsafe or unethical conduct. GMP explicitly requires that concerns are raised regardless of personal consequences.",
        whyNotAdjacent:
          "This is 'Not Important at All'. Personal career considerations cannot override the duty to raise concerns about a colleague's conduct.",
      },
    ],
  },

  {
    id: "imp-015",
    type: "importance",
    domain: "patients_partnership_communication",
    difficulty: "foundation",
    stem: `Nadia is a first-year dental student observing a consultation. An elderly patient, Mr Holbrook, is being prepared for a routine dental extraction. As the nurse explains what is about to happen, Mr Holbrook asks: "Are you sure I agreed to this? I thought I was just coming in for a check-up." The nurse explains he signed the consent form at a previous appointment. Mr Holbrook nods, but continues to look uncertain. The dentist begins to prepare his instruments.`,
    pivotInsight:
      "Consent is not a historic document, it must be current and freely given. A patient expressing uncertainty about what they have agreed to is a signal that requires attention before any procedure proceeds.",
    gmpRef: {
      label: "GMP · Patients, partnership and communication",
      url: `${GMP_MAIN_URL}/patients-partnership-and-communication`,
    },
    items: [
      {
        id: "imp-015-a",
        text: "That Mr Holbrook has expressed uncertainty about what he has agreed to.",
        correctRating: "very_important",
        rationale:
          "A patient questioning whether they have agreed to a procedure is a direct signal that their consent may not currently be valid. GMP requires that consent is an ongoing, informed process, not a form signed on a previous occasion. The procedure must not proceed until Mr Holbrook's current understanding and agreement have been properly established.",
        whyNotAdjacent:
          "This is 'Very Important'. Real-time expressions of uncertainty about consent must stop a procedure until the issue is properly resolved.",
        gmpRef: {
          label: "GMP · Patients, partnership and communication",
          url: `${GMP_MAIN_URL}/patients-partnership-and-communication`,
        },
      },
      {
        id: "imp-015-b",
        text: "That Mr Holbrook signed a consent form at his previous appointment.",
        correctRating: "not_important",
        rationale:
          "A signed consent form is evidence that consent was given at a particular point in time. It does not mean consent remains valid if the patient is now expressing uncertainty or confusion. Consent is dynamic. A signed form does not override a patient's current expressed uncertainty.",
        whyNotAdjacent:
          "This is 'Not Important at All' as a reason to proceed. Prior documentation does not validate consent when the patient has expressed real doubt.",
      },
      {
        id: "imp-015-c",
        text: "That proceeding without addressing Mr Holbrook's uncertainty would undermine his right to make an informed decision.",
        correctRating: "very_important",
        rationale:
          "Patients must have the opportunity to ask questions, withdraw consent, and understand what is happening at the time of the procedure. If Mr Holbrook is uncertain, he must be given the chance to be re-informed and to confirm or withdraw his consent freely. Proceeding regardless breaches his fundamental rights.",
        whyNotAdjacent:
          "This is 'Very Important'. Informed consent is a current obligation, not a historical one that can be relied on indefinitely.",
      },
      {
        id: "imp-015-d",
        text: "That addressing the uncertainty now will cause a delay to the dental appointment.",
        correctRating: "minor_importance",
        rationale:
          "Delay is a practical inconvenience but has no weight as a reason to proceed with a procedure where consent is in question. Clinical governance and patient rights always take precedence over appointment scheduling. The delay required to properly establish consent is the minimum standard, not an unreasonable imposition.",
        whyNotAdjacent:
          "This is 'Of Minor Importance'. Procedural delay cannot take precedence over valid consent.",
      },
    ],
  },

  {
    id: "imp-016",
    type: "importance",
    domain: "trust_professionalism",
    difficulty: "standard",
    stem: `Reece is a medical student who discovers that his classmate Sione has been posting regularly in a private Facebook group, charging members a small fee for "personalised medical advice" based on their symptoms. Sione is still in his third year of training and is not a qualified clinician. Several of his posts advise members on whether to seek medical attention, and at least one appears to advise against it for symptoms that Reece thinks could be serious.`,
    pivotInsight:
      "Providing paid medical advice while not yet qualified is a serious public safety issue. It is also a direct breach of professional standards that GMP applies to students and qualified practitioners alike.",
    gmpRef: {
      label: "GMP · Trust and professionalism",
      url: `${GMP_MAIN_URL}/trust-and-professionalism`,
    },
    items: [
      {
        id: "imp-016-a",
        text: "That Sione is not a qualified clinician and is providing paid medical advice beyond his level of competence.",
        correctRating: "very_important",
        rationale:
          "GMP and student fitness to practise standards explicitly prohibit students from representing themselves as competent to provide clinical advice they are not trained to give. Sione's posts are misleading members of the public about his qualifications and, critically, may result in people not seeking appropriate medical care.",
        whyNotAdjacent:
          "This is 'Very Important'. Unqualified medical advice that may discourage people from seeking proper care is a direct public safety concern.",
        gmpRef: {
          label: "GMP · Trust and professionalism",
          url: `${GMP_MAIN_URL}/trust-and-professionalism`,
        },
      },
      {
        id: "imp-016-b",
        text: "That at least one post may have advised against seeking medical attention for potentially serious symptoms.",
        correctRating: "very_important",
        rationale:
          "Advice that actively discourages someone from seeking medical care for potentially serious symptoms could cause direct harm. This is not merely a regulatory concern, it is a live patient safety issue. The potential for harm is real and cannot be dismissed.",
        whyNotAdjacent:
          "This is 'Very Important'. Advice that may prevent someone from seeking necessary care is a direct patient safety concern requiring action.",
      },
      {
        id: "imp-016-c",
        text: "That Sione is receiving payment for the advice.",
        correctRating: "important",
        rationale:
          "Payment for advice given without appropriate qualifications is an aggravating factor that suggests a sustained, deliberate practice rather than an isolated post. It is also relevant to what regulatory frameworks may apply. It is genuinely important but secondary to the core competence and safety concerns.",
        whyNotAdjacent:
          "This is 'Important'. The financial dimension adds gravity but is secondary to the competence and patient safety issues.",
      },
      {
        id: "imp-016-d",
        text: "That raising concerns could end Reece and Sione's friendship.",
        correctRating: "not_important",
        rationale:
          "Personal relationships are not a legitimate professional consideration when a colleague is engaging in conduct that poses a risk to public safety. GMP is explicit that the duty to raise concerns about fitness to practise is not diminished by personal relationships or loyalty.",
        whyNotAdjacent:
          "This is 'Not Important at All'. Personal loyalty cannot be weighed against a public safety and professional standards concern.",
      },
    ],
  },

  {
    id: "imp-017",
    type: "importance",
    domain: "knowledge_skills_development",
    difficulty: "standard",
    stem: `Adam is a medical student who realises, after leaving the ward, that he told a nurse the fluid balance target for a patient was "maintain at 2L positive per day" when he now believes the correct instruction was to maintain at no more than 500ml positive. The consultant who gave the instruction is currently in theatre and cannot be immediately reached. Adam is unsure whether to act.`,
    pivotInsight:
      "Duty of candour and patient safety require that incorrect clinical information is corrected as quickly as possible. Uncertainty about whether an error was made is not a reason to delay, it is a reason to act immediately to verify and correct.",
    gmpRef: {
      label: "GMP · Knowledge, skills and development",
      url: `${GMP_MAIN_URL}/knowledge-skills-and-development`,
    },
    items: [
      {
        id: "imp-017-a",
        text: "That the incorrect fluid balance target could cause direct harm to the patient if acted upon.",
        correctRating: "very_important",
        rationale:
          "Fluid balance management can have serious clinical consequences. Targeting 2L positive instead of 500ml positive could lead to significant fluid overload in a patient who may be vulnerable. This is a patient safety concern that must be addressed immediately. GMP requires prompt action when a clinical error may have occurred.",
        whyNotAdjacent:
          "This is 'Very Important'. Incorrect clinical instructions in an active patient care setting are an immediate patient safety concern.",
        gmpRef: {
          label: "GMP · Knowledge, skills and development",
          url: `${GMP_MAIN_URL}/knowledge-skills-and-development`,
        },
      },
      {
        id: "imp-017-b",
        text: "That Adam acted in good faith and may simply have misremembered the instruction.",
        correctRating: "not_important",
        rationale:
          "Good faith does not reduce the responsibility to correct an error that may be causing harm. The patient's safety does not depend on Adam's intent, it depends on the accuracy of the information the nursing team is acting on. Good intent, once an error has been made, is irrelevant to the duty to correct it.",
        whyNotAdjacent:
          "This is 'Not Important at All'. Good intent does not alter the duty to act once an error is suspected.",
      },
      {
        id: "imp-017-c",
        text: "That Adam should return to the ward, inform the nurse of the possible error, and take steps to verify the correct target.",
        correctRating: "very_important",
        rationale:
          "This is the core action Adam must take. GMP is explicit that clinicians must take immediate action to correct clinical errors and be honest with colleagues about mistakes. Returning to the ward and flagging the concern directly ensures the nurse can pause any action on the incorrect instruction while the correct target is verified.",
        whyNotAdjacent:
          "This is 'Very Important'. Prompt correction of a potential clinical error is a direct GMP obligation under the duty of candour.",
      },
      {
        id: "imp-017-d",
        text: "That Adam will need to explain the mistake to the consultant once they are available.",
        correctRating: "important",
        rationale:
          "Informing the consultant once accessible is an important step, they need to know about the error for clinical continuity, and the incident should be documented and reviewed. However, this is a secondary step to the immediate priority of ensuring the nurse is informed and the error is corrected before any harm occurs.",
        whyNotAdjacent:
          "This is 'Important'. Disclosure to the supervising consultant is a necessary follow-up but not the most time-critical action.",
      },
    ],
  },

  {
    id: "imp-018",
    type: "importance",
    domain: "knowledge_skills_development",
    difficulty: "standard",
    stem: `Sameer is a dental student on placement. His supervisor asks him to use a newly introduced digital scanner to take impressions for a patient. Sameer has used traditional impression material many times but has only seen the digital scanner demonstrated once. The patient is anxious and wants the appointment finished quickly. Sameer is deciding how to respond.`,
    pivotInsight:
      "The key issue is whether Sameer can carry out the task safely and honestly within his competence. Patient pressure and personal embarrassment must not override safe supervision.",
    gmpRef: {
      label: "GMP · Knowledge, skills and development",
      url: `${GMP_MAIN_URL}/knowledge-skills-and-development`,
    },
    items: [
      {
        id: "imp-018-a",
        text: "That Sameer has never used the digital scanner on a patient before.",
        correctRating: "very_important",
        rationale:
          "This is very important because it directly affects whether Sameer can carry out the task safely. He must communicate his lack of experience honestly so that his supervisor can decide whether he should observe, practise first, or use the scanner under direct supervision.",
        whyNotAdjacent:
          "This should not be rated merely 'Important'. Lack of experience with the specific tool is central to patient safety and safe supervision.",
        gmpRef: {
          label: "GMP · Knowledge, skills and development",
          url: `${GMP_MAIN_URL}/knowledge-skills-and-development`,
        },
      },
      {
        id: "imp-018-b",
        text: "That his supervisor may not know he has only seen the scanner demonstrated once.",
        correctRating: "important",
        rationale:
          "This is important because both Sameer and his supervisor have responsibilities for patient safety. Sameer should discuss his experience and limitations so that they can agree a safe plan for learning and patient care.",
        whyNotAdjacent:
          "This is not 'Very Important' because the most central issue is Sameer's actual lack of experience. However, the supervisor's awareness is still important for safe delegation.",
      },
      {
        id: "imp-018-c",
        text: "That the patient is anxious and wants the appointment finished quickly.",
        correctRating: "important",
        rationale:
          "This is important because the patient's anxiety should be acknowledged and managed sensitively. However, the patient's wish for speed does not justify Sameer working beyond his competence or failing to disclose his lack of experience.",
        whyNotAdjacent:
          "This is 'Important' rather than 'Very Important' because it affects communication and patient experience, but it does not override patient safety.",
      },
      {
        id: "imp-018-d",
        text: "That Sameer worries his supervisor may stop giving him practical opportunities if he admits he is unfamiliar with the scanner.",
        correctRating: "minor_importance",
        rationale:
          "This is of minor importance. Sameer's learning opportunities matter, but they cannot take priority over patient safety. He can develop the skill through observation, simulation, or supervised practice.",
        whyNotAdjacent:
          "This is not 'Not Important at All' because learning opportunities are relevant to his training. However, it is only minor compared with safe practice and honest communication.",
      },
    ],
  },

  {
    id: "imp-019",
    type: "importance",
    domain: "colleagues_culture_safety",
    difficulty: "standard",
    stem: `Leila is a dental student in clinic. She notices that another student, Ben, has repeatedly failed to clean down his workstation properly between patients. On one occasion, Leila sees used instruments left on the side while the next patient is being called in. Ben says he is rushing because he is behind schedule. Leila is deciding what to do.`,
    pivotInsight:
      "Infection control is a patient safety issue. Time pressure and colleague discomfort do not justify unsafe practice.",
    gmpRef: {
      label: "GMP · Colleagues, culture and safety",
      url: `${GMP_MAIN_URL}/colleagues-culture-and-safety`,
    },
    items: [
      {
        id: "imp-019-a",
        text: "That patients could be exposed to avoidable infection risk.",
        correctRating: "very_important",
        rationale:
          "This is very important. Poor cleaning and unsafe handling of used instruments between patients may expose patients to avoidable harm. Patient safety must take priority.",
        whyNotAdjacent:
          "This cannot be rated merely 'Important' because the risk is direct, immediate, and linked to patient safety.",
        gmpRef: {
          label: "GMP · Colleagues, culture and safety",
          url: `${GMP_MAIN_URL}/colleagues-culture-and-safety`,
        },
      },
      {
        id: "imp-019-b",
        text: "That Ben is running behind schedule.",
        correctRating: "minor_importance",
        rationale:
          "This is of minor importance. It may help explain why Ben is rushing and may be relevant to how he is supported, but it does not justify unsafe infection control practice.",
        whyNotAdjacent:
          "This is not 'Not Important at All' because workload pressure may help explain the behaviour. However, it is minor compared with patient safety.",
      },
      {
        id: "imp-019-c",
        text: "That raising the concern might make working with Ben awkward.",
        correctRating: "not_important",
        rationale:
          "This is not important at all. Personal awkwardness should not prevent Leila from acting where patient safety may be compromised.",
        whyNotAdjacent:
          "This should not be rated 'Of Minor Importance' because awkwardness has no legitimate weight when patients may be exposed to harm.",
      },
      {
        id: "imp-019-d",
        text: "Whether this has happened more than once.",
        correctRating: "important",
        rationale:
          "This is important. A repeated pattern suggests a more serious concern and may affect how the issue should be raised or escalated. However, even a single infection control breach still needs to be addressed.",
        whyNotAdjacent:
          "This is 'Important' rather than 'Very Important' because recurrence affects the seriousness of the pattern, but the immediate safety concern exists regardless.",
      },
    ],
  },

  {
    id: "imp-020",
    type: "importance",
    domain: "patients_partnership_communication",
    difficulty: "standard",
    stem: `Ravi is a medical student observing a consultation. A patient, Ms Clarke, is offered a steroid injection for shoulder pain. The doctor explains the benefits but does not mention possible side effects. Ms Clarke says, "If you think it's best, I'll just have it." Ravi knows from teaching that patients should understand material risks and alternatives before agreeing to a procedure. He is deciding whether to say anything.`,
    pivotInsight:
      "Consent is not just agreement. Patients need relevant information about benefits, risks, alternatives, and the option of doing nothing in order to make an informed decision.",
    gmpRef: {
      label: "GMP · Patients, partnership and communication",
      url: `${GMP_MAIN_URL}/patients-partnership-and-communication`,
    },
    items: [
      {
        id: "imp-020-a",
        text: "That Ms Clarke may not have been told the relevant risks and alternatives.",
        correctRating: "very_important",
        rationale:
          "This is very important. A patient's agreement is only meaningful if they have been given enough information to make an informed decision. If relevant risks and alternatives have not been discussed, Ravi should raise this appropriately.",
        whyNotAdjacent:
          "This cannot be rated merely 'Important' because it is the central consent issue in the scenario.",
        gmpRef: {
          label: "GMP · Patients, partnership and communication",
          url: `${GMP_MAIN_URL}/patients-partnership-and-communication`,
        },
      },
      {
        id: "imp-020-b",
        text: "That Ms Clarke appears willing to follow the doctor's recommendation.",
        correctRating: "minor_importance",
        rationale:
          "This is of minor importance. Ms Clarke's trust in the doctor is relevant context, but it does not remove the need for proper consent. Willingness to proceed is not the same as informed agreement.",
        whyNotAdjacent:
          "This is not 'Important' because apparent willingness cannot compensate for missing information about risks and alternatives.",
      },
      {
        id: "imp-020-c",
        text: "That Ravi is only a student and the doctor is more clinically experienced.",
        correctRating: "minor_importance",
        rationale:
          "This is of minor importance. Ravi should raise the issue respectfully and within his role, but being a student does not mean ignoring a possible consent issue.",
        whyNotAdjacent:
          "This is not 'Not Important at All' because hierarchy may affect how Ravi raises the issue. However, it must not prevent action.",
      },
      {
        id: "imp-020-d",
        text: "That interrupting the consultation may feel uncomfortable.",
        correctRating: "minor_importance",
        rationale:
          "This is of minor importance. Ravi's discomfort should not prevent him from raising a possible consent issue, but it is relevant to how he does so. He should raise the point respectfully and at an appropriate moment.",
        whyNotAdjacent:
          "This is not 'Not Important at All' because the way a concern is raised during a consultation matters. However, it is only minor because discomfort must not prevent action.",
      },
    ],
  },

  {
    id: "imp-021",
    type: "importance",
    domain: "trust_professionalism",
    difficulty: "foundation",
    stem: `Luca is a medical student. He realises on the way to placement that he has forgotten his student identification badge. The placement involves speaking to patients on a ward under supervision. Hospital policy says students must wear visible identification showing their name and student status. Luca is deciding what to do when he arrives.`,
    pivotInsight:
      "Patients must know who is involved in their care and whether that person is a student. Identification also protects safety and security.",
    gmpRef: {
      label: "GMP · Trust and professionalism",
      url: `${GMP_MAIN_URL}/trust-and-professionalism`,
    },
    items: [
      {
        id: "imp-021-a",
        text: "That patients should know he is a medical student and not a qualified doctor.",
        correctRating: "very_important",
        rationale:
          "This is very important. Patients should understand who is involved in their care and whether that person is a student rather than a qualified clinician.",
        whyNotAdjacent:
          "This should not be rated merely 'Important' because it directly affects transparency, consent, and patient trust.",
        gmpRef: {
          label: "GMP · Trust and professionalism",
          url: `${GMP_MAIN_URL}/trust-and-professionalism`,
        },
      },
      {
        id: "imp-021-b",
        text: "That hospital policy requires identification to be worn on placement.",
        correctRating: "very_important",
        rationale:
          "This is very important. If local policy requires identification during patient contact, Luca should follow the policy and inform the placement team rather than proceeding as normal.",
        whyNotAdjacent:
          "This is not merely 'Important' because the policy exists to protect patients, staff, and the public, and to ensure transparency.",
      },
      {
        id: "imp-021-c",
        text: "That Luca may miss a useful learning opportunity if he is not allowed onto the ward.",
        correctRating: "minor_importance",
        rationale:
          "This is of minor importance. Learning opportunities are relevant to Luca's placement, but they cannot take priority over patient transparency, safety, and local policy.",
        whyNotAdjacent:
          "This is not 'Not Important at All' because his learning is relevant. However, it is only minor compared with identification and patient trust.",
      },
      {
        id: "imp-021-d",
        text: "That other students sometimes forget their badges too.",
        correctRating: "not_important",
        rationale:
          "This is not important at all. Other students' behaviour does not justify ignoring policy or reducing transparency with patients.",
        whyNotAdjacent:
          "This should not be rated 'Of Minor Importance' because it has no legitimate bearing on what Luca should do.",
      },
    ],
  },

  {
    id: "imp-022",
    type: "importance",
    domain: "trust_professionalism",
    difficulty: "foundation",
    stem: `Hannah is a dental student. Her friend Eva texts her in the morning to say she is skipping a compulsory teaching session and asks Hannah to sign the attendance register for her. Eva says she is exhausted and adds that other students have signed in for friends before without being caught. Hannah is deciding how to respond.`,
    pivotInsight:
      "Signing another student in is dishonest. Friendship, possible annoyance, and the fact that others do it do not justify academic dishonesty.",
    gmpRef: {
      label: "GMP · Trust and professionalism",
      url: `${GMP_MAIN_URL}/trust-and-professionalism`,
    },
    items: [
      {
        id: "imp-022-a",
        text: "That signing the register for Eva would be dishonest.",
        correctRating: "very_important",
        rationale:
          "This is very important. Signing Eva in would create a false record of attendance and would be dishonest. Students are expected to act with honesty and integrity in their education and professional activities.",
        whyNotAdjacent:
          "This cannot be rated merely 'Important' because honesty is the central issue in the scenario.",
        gmpRef: {
          label: "GMP · Trust and professionalism",
          url: `${GMP_MAIN_URL}/trust-and-professionalism`,
        },
      },
      {
        id: "imp-022-b",
        text: "That Eva may be annoyed if Hannah refuses.",
        correctRating: "not_important",
        rationale:
          "This is not important at all. Eva's possible annoyance does not justify dishonest conduct. Hannah should not allow friendship or fear of upsetting Eva to influence her decision.",
        whyNotAdjacent:
          "This should not be rated 'Of Minor Importance' because personal annoyance has no legitimate weight where dishonesty is being requested.",
      },
      {
        id: "imp-022-c",
        text: "That other students have signed in for friends before.",
        correctRating: "not_important",
        rationale:
          "This is not important at all. The fact that other students may have acted dishonestly does not make it acceptable for Hannah to do the same.",
        whyNotAdjacent:
          "This is not 'Of Minor Importance' because other students' behaviour does not affect Hannah's professional responsibility.",
      },
      {
        id: "imp-022-d",
        text: "That Eva says she is exhausted.",
        correctRating: "important",
        rationale:
          "This is important because Eva may need support if she is struggling with fatigue or wellbeing. However, it does not justify Hannah signing the register for her. Hannah can refuse the dishonest request while encouraging Eva to speak to the tutor or student support.",
        whyNotAdjacent:
          "This is 'Important' rather than 'Very Important' because it affects how Hannah should support Eva, but it does not change the need to refuse the dishonest request.",
      },
    ],
  },

  {
    id: "imp-023",
    type: "importance",
    domain: "colleagues_culture_safety",
    difficulty: "standard",
    stem: `Oliver is a medical student on placement. He sees a poster in a staff area advertising a student debate. The poster includes a joke about patients from low-income backgrounds that Oliver feels could be offensive. He raises this with the team, but most people say they had not noticed anything wrong with it. Oliver is deciding what to do next.`,
    pivotInsight:
      "Potentially offensive material in a healthcare environment can affect patients, staff, inclusivity and trust, even if not everyone recognises the problem immediately.",
    gmpRef: {
      label: "GMP · Colleagues, culture and safety",
      url: `${GMP_MAIN_URL}/colleagues-culture-and-safety`,
    },
    items: [
      {
        id: "imp-023-a",
        text: "That patients or staff who see the poster may find it offensive.",
        correctRating: "very_important",
        rationale:
          "This is very important. A healthcare environment should be respectful and inclusive. If patients or staff may reasonably find the poster offensive, the concern should be taken seriously.",
        whyNotAdjacent:
          "This is not merely 'Important' because the potential impact is on patients, staff and the culture of the clinical environment.",
        gmpRef: {
          label: "GMP · Colleagues, culture and safety",
          url: `${GMP_MAIN_URL}/colleagues-culture-and-safety`,
        },
      },
      {
        id: "imp-023-b",
        text: "That the poster may reflect badly on the clinic.",
        correctRating: "very_important",
        rationale:
          "This is very important. The clinic's reputation depends partly on showing respect for all patients and communities. Offensive wording can undermine trust in the clinic.",
        whyNotAdjacent:
          "This should not be rated merely 'Important' because the concern relates to the clinic's respect for patients and the public.",
      },
      {
        id: "imp-023-c",
        text: "That Oliver personally feels uneasy about the poster.",
        correctRating: "important",
        rationale:
          "This is important. Oliver's unease may indicate that the wording is inappropriate and may affect his ability to feel comfortable in the placement environment. However, the wider impact on patients and staff is more important.",
        whyNotAdjacent:
          "This is not 'Very Important' because Oliver's personal discomfort is not the only issue; the broader impact on others is more significant.",
      },
      {
        id: "imp-023-d",
        text: "That most staff members did not seem to find the poster offensive.",
        correctRating: "minor_importance",
        rationale:
          "This is of minor importance. It provides context, but it does not mean the poster is acceptable. Other patients or staff may still find it offensive.",
        whyNotAdjacent:
          "This is not 'Not Important at All' because colleagues' views are relevant context. However, it is only minor because lack of concern from others does not remove the issue.",
      },
    ],
  },

  {
    id: "imp-024",
    type: "importance",
    domain: "colleagues_culture_safety",
    difficulty: "challenging",
    stem: `Thomas is a medical student on placement with his friend, Max. Thomas suspects that Max has taken small quantities of prescription painkillers from the ward medication cupboard. When Thomas asks him about it, Max becomes tearful and says he has become dependent on the medication. Max begs Thomas not to tell anyone. Thomas is deciding how to respond.`,
    pivotInsight:
      "This is both a serious professional/safety issue and a wellbeing issue. The official-style response should not be judgemental, but the behaviour cannot simply be ignored.",
    gmpRef: {
      label: "GMP · Colleagues, culture and safety",
      url: `${GMP_MAIN_URL}/colleagues-culture-and-safety`,
    },
    items: [
      {
        id: "imp-024-a",
        text: "That Max may need support for addiction or another underlying problem.",
        correctRating: "very_important",
        rationale:
          "This is very important. Max's disclosure suggests he may need urgent support for addiction or another serious difficulty. Thomas should respond compassionately and help him access appropriate support.",
        whyNotAdjacent:
          "This is not merely 'Important' because understanding and supporting Max is central to managing the situation safely and humanely.",
        gmpRef: {
          label: "GMP · Colleagues, culture and safety",
          url: `${GMP_MAIN_URL}/colleagues-culture-and-safety`,
        },
      },
      {
        id: "imp-024-b",
        text: "That prescription medicines may have been stolen from a clinical area.",
        correctRating: "very_important",
        rationale:
          "This is very important. Taking prescription medicines from a clinical area is a serious concern involving safety, honesty, and professional conduct. It cannot simply be ignored.",
        whyNotAdjacent:
          "This cannot be rated lower than 'Very Important' because it is a serious breach with potential patient and professional safety implications.",
      },
      {
        id: "imp-024-c",
        text: "That Max is Thomas's close friend.",
        correctRating: "not_important",
        rationale:
          "This is not important at all as a reason to ignore the issue. Thomas's friendship with Max should not prevent him from acting appropriately. He can be supportive without concealing serious misconduct or risk.",
        whyNotAdjacent:
          "This should not be rated 'Of Minor Importance' because personal loyalty cannot justify inaction in a serious safety and professionalism concern.",
      },
      {
        id: "imp-024-d",
        text: "That Max may become more distressed if Thomas raises the issue with someone appropriate.",
        correctRating: "important",
        rationale:
          "This is important because Thomas should handle the conversation sensitively and avoid being judgemental. However, Max's possible distress does not mean the issue should be kept secret or unmanaged.",
        whyNotAdjacent:
          "This is not 'Very Important' because it affects how Thomas should act, rather than whether action is needed.",
      },
    ],
  },

  {
    id: "imp-025",
    type: "importance",
    domain: "patients_partnership_communication",
    difficulty: "challenging",
    stem: `Sofia is a medical student in paediatrics. A six-year-old child has a worsening asthma attack and needs inhaled medication urgently. The child's father says he does not believe the inhaler is necessary and would prefer to try steam inhalation first. Sofia is deciding how to respond while waiting for the doctor to return.`,
    pivotInsight:
      "For a child, parental views are important, but urgent medical need and risk to the child are also very important. The response should inform and protect, not dismiss the parent.",
    gmpRef: {
      label: "GMP · Patients, partnership and communication",
      url: `${GMP_MAIN_URL}/patients-partnership-and-communication`,
    },
    items: [
      {
        id: "imp-025-a",
        text: "That the child is in need of urgent medical treatment.",
        correctRating: "very_important",
        rationale:
          "This is very important. A worsening asthma attack can become life-threatening if not treated promptly. The child's immediate medical need must be central to Sofia's response.",
        whyNotAdjacent:
          "This cannot be rated merely 'Important' because the child's urgent health need is the key safety issue.",
        gmpRef: {
          label: "GMP · Patients, partnership and communication",
          url: `${GMP_MAIN_URL}/patients-partnership-and-communication`,
        },
      },
      {
        id: "imp-025-b",
        text: "That the father has the right to be involved in decisions about his child's care.",
        correctRating: "very_important",
        rationale:
          "This is very important. As the child's parent, the father has an important role in decisions about his child's care. His views should be taken seriously and addressed respectfully.",
        whyNotAdjacent:
          "This should not be rated merely 'Important' because parental involvement is central in decisions about a young child's treatment.",
      },
      {
        id: "imp-025-c",
        text: "That the father may change his mind if the risk of delaying treatment is explained clearly.",
        correctRating: "important",
        rationale:
          "This is important. The father may not understand the seriousness of the situation, and clear explanation may help him agree to the inhaler. However, this is not as central as the child's urgent need for treatment.",
        whyNotAdjacent:
          "This is 'Important' rather than 'Very Important' because it informs the communication approach but does not outweigh the child's urgent medical need.",
      },
      {
        id: "imp-025-d",
        text: "That Sofia personally disagrees with the father's preference for steam inhalation.",
        correctRating: "minor_importance",
        rationale:
          "This is of minor importance. Sofia's personal disagreement is not the key issue; the important point is the child's clinical need and the need to explain the risks clearly and professionally.",
        whyNotAdjacent:
          "This is not 'Not Important at All' because Sofia's clinical understanding may alert her to the risk, but her personal disagreement is not the central consideration.",
      },
    ],
  },

  {
    id: "imp-026",
    type: "importance",
    domain: "colleagues_culture_safety",
    difficulty: "standard",
    stem: `Jude is a medical student attending a compulsory seminar. Another student, Nadia, repeatedly interrupts the lecturer with irrelevant comments and laughs when the lecturer appears flustered. Several students look uncomfortable, and Jude is struggling to concentrate. Jude is deciding whether and how to respond.`,
    pivotInsight:
      "Disruptive behaviour affecting a teaching session matters because it affects everyone's learning and the lecturer's wellbeing. Personal relationships or fear of grading consequences should carry little or no weight.",
    gmpRef: {
      label: "GMP · Colleagues, culture and safety",
      url: `${GMP_MAIN_URL}/colleagues-culture-and-safety`,
    },
    items: [
      {
        id: "imp-026-a",
        text: "The impact Nadia's behaviour is having on the opportunity for everyone to learn.",
        correctRating: "very_important",
        rationale:
          "This is very important. Nadia's interruptions are affecting the learning environment for the whole group, not just Jude. This makes it a legitimate concern to address.",
        whyNotAdjacent:
          "This should not be rated merely 'Important' because the disruption is affecting the whole class's learning.",
        gmpRef: {
          label: "GMP · Colleagues, culture and safety",
          url: `${GMP_MAIN_URL}/colleagues-culture-and-safety`,
        },
      },
      {
        id: "imp-026-b",
        text: "The impact Nadia's behaviour is having on the lecturer's emotional state.",
        correctRating: "important",
        rationale:
          "This is important. The lecturer's distress may affect the session and should be considered. However, the wider impact on the learning environment for all students is the more central issue.",
        whyNotAdjacent:
          "This is not 'Very Important' because the lecturer's emotional state matters, but the main concern is the disruption to the whole group.",
      },
      {
        id: "imp-026-c",
        text: "Jude's existing friendship with Nadia.",
        correctRating: "minor_importance",
        rationale:
          "This is of minor importance. Jude's response may affect his relationship with Nadia, but that should not prevent him from responding appropriately to behaviour that is disrupting others.",
        whyNotAdjacent:
          "This is not 'Not Important at All' because the relationship may affect how he raises the issue. However, it is only minor.",
      },
      {
        id: "imp-026-d",
        text: "Whether raising the issue could affect future grades from the lecturer.",
        correctRating: "not_important",
        rationale:
          "This is not important at all. Jude's grades should not be affected by raising a concern appropriately, and this should not influence his response.",
        whyNotAdjacent:
          "This should not be rated 'Of Minor Importance' because fear about grades has no legitimate bearing on whether disruptive behaviour should be addressed.",
      },
    ],
  },

  {
    id: "imp-027",
    type: "importance",
    domain: "trust_professionalism",
    difficulty: "standard",
    stem: `Tariq is a medical student revising in the anatomy room with classmates. He notices that a person he recognises from university, who is not a medical student, has entered using someone else's ID badge and is taking photographs of cadaveric material. Tariq knows unauthorised people are not allowed in the room and photographs are prohibited. He is deciding whether to report it.`,
    pivotInsight:
      "Unauthorised access and photography of cadaveric material is a serious breach of policy, security, dignity and trust. Friendship, ignorance, or the possibility someone else may report it should not matter.",
    gmpRef: {
      label: "GMP · Trust and professionalism",
      url: `${GMP_MAIN_URL}/trust-and-professionalism`,
    },
    items: [
      {
        id: "imp-027-a",
        text: "That the person used someone else's ID badge to enter a restricted area.",
        correctRating: "very_important",
        rationale:
          "This is very important. Using another person's ID badge to enter a restricted area is a serious security and policy breach. Tariq should not ignore it.",
        whyNotAdjacent:
          "This cannot be rated merely 'Important' because the breach is deliberate and serious.",
        gmpRef: {
          label: "GMP · Trust and professionalism",
          url: `${GMP_MAIN_URL}/trust-and-professionalism`,
        },
      },
      {
        id: "imp-027-b",
        text: "That photographs are being taken of cadaveric material without permission.",
        correctRating: "very_important",
        rationale:
          "This is very important. Taking photographs in this setting compromises dignity and breaches strict rules around the use of donated bodies for teaching.",
        whyNotAdjacent:
          "This is not merely 'Important' because it directly concerns dignity, consent, and professional standards.",
      },
      {
        id: "imp-027-c",
        text: "That Tariq knows the person socially.",
        correctRating: "not_important",
        rationale:
          "This is not important at all. Tariq's social relationship with the person should not prevent him from reporting a serious breach of policy and dignity.",
        whyNotAdjacent:
          "This should not be rated 'Of Minor Importance' because personal relationship has no legitimate weight in deciding whether to report this.",
      },
      {
        id: "imp-027-d",
        text: "That other students have also noticed and may report it.",
        correctRating: "not_important",
        rationale:
          "This is not important at all. Tariq has personally witnessed the incident and should not assume someone else will report it. Everyone has a responsibility to raise concerns about serious breaches.",
        whyNotAdjacent:
          "This is not 'Of Minor Importance' because the possibility of someone else reporting it does not remove Tariq's responsibility.",
      },
    ],
  },

  {
    id: "imp-028",
    type: "importance",
    domain: "colleagues_culture_safety",
    difficulty: "standard",
    stem: `Eleni is a medical student. Her friend Marcus promised to help another student, Rosie, revise for an exam, but cancelled an hour before the session to go out with friends. Rosie is upset because she was relying on the help. Eleni knows why Marcus cancelled and is deciding whether to say anything to him.`,
    pivotInsight:
      "Students should support colleagues and give honest feedback about behaviour. Saying nothing may allow the behaviour and its impact to go unrecognised.",
    gmpRef: {
      label: "GMP · Colleagues, culture and safety",
      url: `${GMP_MAIN_URL}/colleagues-culture-and-safety`,
    },
    items: [
      {
        id: "imp-028-a",
        text: "That Rosie was relying on Marcus's help for exam preparation.",
        correctRating: "very_important",
        rationale:
          "This is very important. Marcus's cancellation affected Rosie at a time when she needed support. The impact on Rosie is central to whether Eleni should raise the issue.",
        whyNotAdjacent:
          "This should not be rated merely 'Important' because the behaviour has had a significant effect on a colleague's ability to access support.",
        gmpRef: {
          label: "GMP · Colleagues, culture and safety",
          url: `${GMP_MAIN_URL}/colleagues-culture-and-safety`,
        },
      },
      {
        id: "imp-028-b",
        text: "That Marcus may not realise the impact of cancelling at short notice.",
        correctRating: "important",
        rationale:
          "This is important. Speaking to Marcus may help him understand the effect of his behaviour and encourage him to repair the situation, such as by rescheduling.",
        whyNotAdjacent:
          "This is not 'Very Important' because it informs why speaking to Marcus could help, but the main issue is the impact on Rosie.",
      },
      {
        id: "imp-028-c",
        text: "That Eleni does not want Marcus to be annoyed with her.",
        correctRating: "minor_importance",
        rationale:
          "This is of minor importance. Eleni's relationship with Marcus may affect how she raises the issue, but it should not stop her from giving honest and constructive feedback.",
        whyNotAdjacent:
          "This is not 'Not Important at All' because relationships can affect how feedback is delivered. However, it is only minor.",
      },
      {
        id: "imp-028-d",
        text: "That Marcus cancelled to go out with friends rather than for an unavoidable reason.",
        correctRating: "important",
        rationale:
          "This is important because it affects how responsible Marcus was for the cancellation and whether he should be encouraged to put things right. However, Eleni should still approach the conversation constructively rather than judgementally.",
        whyNotAdjacent:
          "This is 'Important' rather than 'Very Important' because the main focus should be the impact and how Marcus can respond now.",
      },
    ],
  },

  {
    id: "imp-029",
    type: "importance",
    domain: "trust_professionalism",
    difficulty: "foundation",
    stem: `Mina is a dental student due to attend a supervised clinic. On the way in, she realises she has lost her photo identification badge, which shows her name, course and year of study. Clinic policy says students must wear their badge during patient contact. Mina is deciding what to do.`,
    pivotInsight:
      "Identification matters for patient transparency, security and local policy. A lost badge should not simply be ignored.",
    gmpRef: {
      label: "GMP · Trust and professionalism",
      url: `${GMP_MAIN_URL}/trust-and-professionalism`,
    },
    items: [
      {
        id: "imp-029-a",
        text: "That patients should know Mina is a student and not a qualified dentist.",
        correctRating: "very_important",
        rationale:
          "This is very important. Patients should understand who is involved in their care and whether that person is still in training.",
        whyNotAdjacent:
          "This should not be rated merely 'Important' because it directly affects transparency and patient trust.",
        gmpRef: {
          label: "GMP · Trust and professionalism",
          url: `${GMP_MAIN_URL}/trust-and-professionalism`,
        },
      },
      {
        id: "imp-029-b",
        text: "That the lost badge could be used by someone else to access the clinic.",
        correctRating: "very_important",
        rationale:
          "This is very important. A lost identification badge may create a security risk if it is found and misused by someone else.",
        whyNotAdjacent:
          "This is not merely 'Important' because it has potential implications for safety and security.",
      },
      {
        id: "imp-029-c",
        text: "Whether her fellow students are aware of the situation.",
        correctRating: "minor_importance",
        rationale:
          "This is of minor importance. Other students may help by informing the supervisor or being mindful that patients need to know Mina is a student. However, Mina remains responsible for reporting and managing the issue herself.",
        whyNotAdjacent:
          "This is not 'Not Important at All' because classmates may be able to assist practically. However, it is only minor.",
      },
      {
        id: "imp-029-d",
        text: "That the clinic session is important for her course performance.",
        correctRating: "minor_importance",
        rationale:
          "This is of minor importance. Mina's learning and assessment matter, but they do not override patient transparency, clinic policy, or security concerns.",
        whyNotAdjacent:
          "This is not 'Not Important at All' because her placement matters. However, it is only minor compared with identification and safety.",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // RANKING (continued)
  // ─────────────────────────────────────────────────────────────
  {
    id: "rank-004",
    type: "ranking",
    domain: "trust_professionalism",
    difficulty: "standard",
    stem: `Miriam is a medical student reviewing a shared group project document before it is submitted. She notices that a large section written by her classmate Stuart appears to have been copied directly from a published journal article, with no citation or attribution. The project is due in two days. Stuart is a close friend who has been going through a difficult time, and Miriam does not want to make things worse for him.`,
    pivotInsight:
      "Academic integrity is not separate from professional integrity, the same honesty that patients and colleagues will one day depend on must be evident in how students conduct themselves during training.",
    gmpRef: {
      label: "GMP · Trust and professionalism",
      url: `${GMP_MAIN_URL}/trust-and-professionalism`,
    },
    items: [
      {
        id: "rank-004-a",
        text: "Speak to Stuart privately about what she has found and give him the opportunity to correct the plagiarised section before submission.",
        rank: 1,
        rationale:
          "This is the most appropriate response. Speaking to Stuart directly, privately, and with the goal of giving him the opportunity to do the right thing is both honest and compassionate. It makes clear that the work as submitted is unacceptable while respecting the friendship. If Stuart refuses to correct it, escalation becomes necessary, but giving him the first opportunity to act is the correct starting point.",
      },
      {
        id: "rank-004-b",
        text: "Report the plagiarism to the course tutor without speaking to Stuart first.",
        rank: 2,
        rationale:
          "Reporting academic dishonesty to the appropriate authority is entirely correct and may ultimately be necessary. However, going directly to a tutor without first attempting a conversation with Stuart is disproportionate as an initial step. This is the right second step, or the right first step if Stuart refuses to act or if the deadline is so close that there is no time for a private conversation.",
      },
      {
        id: "rank-004-c",
        text: "Quietly rephrase or remove the copied text herself before submission so the group does not face consequences.",
        rank: 3,
        rationale:
          "This is the least appropriate response. Altering Stuart's work without disclosure does not resolve the underlying dishonesty, it conceals it and makes Miriam complicit in the misconduct. GMP requires honesty in all professional dealings. Hiding someone else's dishonesty is a separate act of dishonesty, not an act of loyalty.",
      },
    ],
  },

  {
    id: "rank-005",
    type: "ranking",
    domain: "patients_partnership_communication",
    difficulty: "challenging",
    stem: `Niamh is a dental student assisting at a paediatric dental clinic. While examining a six-year-old patient, she notices multiple bruises in unusual locations, the inner forearms and upper back, that are inconsistent with common childhood bumps. When she gently asks how the child got the bruises, the child says "I fell" but avoids eye contact. The supervising dentist, Dr Lim, is currently occupied with another patient in a separate room.`,
    pivotInsight:
      "Safeguarding vulnerable patients, particularly children, is one of the most serious responsibilities in clinical practice. A student who fails to act on possible signs of abuse because they are unsupported, uncertain, or afraid of being wrong causes harm by omission.",
    gmpRef: {
      label: "GMP · Patients, partnership and communication",
      url: `${GMP_MAIN_URL}/patients-partnership-and-communication`,
    },
    items: [
      {
        id: "rank-005-a",
        text: "Note her observations carefully, continue the appointment calmly, and ensure she informs Dr Lim of her concerns before the patient leaves the practice.",
        rank: 1,
        rationale:
          "This is the most appropriate response. Safeguarding concerns must be acted on, but the priority is to ensure the concern reaches the supervising clinician before the patient and family leave the building. Continuing the appointment without distressing the child, while carefully documenting observations, ensures the situation is managed calmly and escalated promptly. There is no need to abandon the appointment to fulfil the safeguarding duty.",
      },
      {
        id: "rank-005-b",
        text: "Excuse herself from the appointment and go immediately to find Dr Lim to report her concerns.",
        rank: 2,
        rationale:
          "Interrupting Dr Lim directly is appropriate if there is a risk the patient and family will leave before Niamh can escalate otherwise. In most circumstances, careful note-taking during the appointment followed by a prompt handover to Dr Lim before the patient departs is sufficient and less disruptive. This is a valid response, just slightly less measured than the most appropriate one.",
      },
      {
        id: "rank-005-c",
        text: "Say nothing at this stage, as the bruises may have a benign explanation and she is only a student.",
        rank: 3,
        rationale:
          "This is the least appropriate response. Safeguarding is not a function of seniority, all members of the dental team, including students, have a duty to act on possible signs of abuse. Uncertainty about the cause of the bruises is not a reason for inaction; it is a reason to pass the concern to someone with greater experience and authority. Staying silent is a safeguarding failure.",
      },
    ],
  },

  {
    id: "rank-006",
    type: "ranking",
    domain: "colleagues_culture_safety",
    difficulty: "standard",
    stem: `Patrick is a fourth-year medical student on a surgical placement. During a post-operative debrief, he witnesses a senior registrar, Dr Hollis, publicly berate a foundation doctor in front of the entire surgical team, using aggressive language and dismissing her contribution entirely. The foundation doctor looks visibly distressed. The rest of the team appears uncomfortable but nobody says anything. Patrick is trying to decide what to do.`,
    pivotInsight:
      "Bullying and undermining behaviour in healthcare creates a culture where people are afraid to speak up, and where patients are ultimately harmed. GMP requires all members of the team, including students, to contribute to a safe and respectful working environment.",
    gmpRef: {
      label: "GMP · Colleagues, culture and safety",
      url: `${GMP_MAIN_URL}/colleagues-culture-and-safety`,
    },
    items: [
      {
        id: "rank-006-a",
        text: "After the debrief, check in privately with the foundation doctor, offer support, and encourage her to speak to her educational supervisor or raise a formal concern if she wishes.",
        rank: 1,
        rationale:
          "This is the most appropriate response. GMP requires that colleagues are supported and that a culture of respect is maintained. Checking in privately with the foundation doctor is compassionate and respects her autonomy to decide how she wants to respond. Encouraging her to raise a formal concern ensures the behaviour is addressed through proper channels while empowering her rather than acting over her head.",
      },
      {
        id: "rank-006-b",
        text: "Raise what he witnessed with his own educational supervisor after the session so it can be addressed through formal channels.",
        rank: 2,
        rationale:
          "Reporting witnessed bullying to a supervisor is appropriate and ensures it is on record. This is a valid and professional response, particularly if the behaviour is severe, repeated, or has potential patient safety implications. It is slightly less supportive than first checking in with the foundation doctor directly, as it bypasses her agency in the situation.",
      },
      {
        id: "rank-006-c",
        text: "Say nothing, Patrick is only a student and it is not his place to get involved in matters between qualified doctors.",
        rank: 3,
        rationale:
          "This is the least appropriate response. Student status does not exempt Patrick from his professional responsibility to contribute to a safe, respectful working culture. GMP requires all members of the team to act if they witness bullying, harassment, or undermining behaviour. Staying silent normalises harmful behaviour and contributes to the culture of fear that makes speaking up feel impossible.",
      },
    ],
  },

  {
    id: "rank-007",
    type: "ranking",
    domain: "knowledge_skills_development",
    difficulty: "challenging",
    stem: `Yemi is a medical student on placement. His classmate Dana approaches him and explains that she has been asked by a registrar to perform a venepuncture on a patient that afternoon. Dana has never performed a venepuncture, not even in a simulation setting. She is nervous and asks Yemi, who has completed several under supervision, if he can come along and step in to do it if she struggles, without telling the registrar. The registrar believes Dana has prior experience.`,
    pivotInsight:
      "The registrar's incorrect assumption about Dana's competence is the core patient safety concern. The solution must address that assumption honestly, not work around it. Helping Dana conceal a competence gap benefits neither the patient nor Dana.",
    gmpRef: {
      label: "GMP · Knowledge, skills and development",
      url: `${GMP_MAIN_URL}/knowledge-skills-and-development`,
    },
    items: [
      {
        id: "rank-007-a",
        text: "Encourage Dana to tell the registrar honestly that she has not yet performed a venepuncture, and offer to support her during a properly supervised first attempt if the registrar agrees.",
        rank: 1,
        rationale:
          "This is the most appropriate response. GMP requires that students are honest about their competence. The registrar has made an assumption about Dana's experience that is incorrect, and that assumption creates a patient safety risk. Disclosing the truth allows the registrar to provide appropriate supervision, which is the correct and safe outcome for the patient and for Dana's professional development.",
      },
      {
        id: "rank-007-b",
        text: "Decline to help cover for Dana but suggest she speaks to the registrar about her concern before the procedure takes place.",
        rank: 2,
        rationale:
          "Declining to be complicit in concealing a competence gap is correct. Directing Dana to speak to the registrar is appropriate. This response is slightly less supportive than rank 1, it does not offer Yemi's active presence to help Dana approach the conversation with confidence. The response is appropriate but less practically helpful.",
      },
      {
        id: "rank-007-c",
        text: "Agree to accompany Dana and take over if she struggles, without informing the registrar.",
        rank: 3,
        rationale:
          "This is the least appropriate response. Concealing Dana's lack of experience from the registrar means the procedure proceeds without appropriate supervision for an untrained student. If something goes wrong, neither student has the authority or training to manage the situation safely. This places the patient at risk and puts both students in a professionally untenable position. Concealing competence gaps is directly contrary to GMP.",
      },
    ],
  },

  {
    id: "rank-008",
    type: "ranking",
    domain: "trust_professionalism",
    difficulty: "standard",
    stem: `Callum is a medical student who is asked by a ward nurse to sign as "patient's witness" on a consent form for an orthopaedic procedure. The nurse explains: "The patient signed it earlier when you were on the ward, I just need a witness signature. It's only a formality." Callum was not present when the patient signed and did not witness the consent process.`,
    pivotInsight:
      "Signing a legal document as a witness to something you did not witness is falsifying a medical record. This is not a formality, it is professional misconduct, regardless of whether the patient did in fact consent.",
    gmpRef: {
      label: "GMP · Trust and professionalism",
      url: `${GMP_MAIN_URL}/trust-and-professionalism`,
    },
    items: [
      {
        id: "rank-008-a",
        text: "Decline to sign as he did not witness the consent process, and suggest the nurse arranges for someone who was actually present to sign.",
        rank: 1,
        rationale:
          "Signing as a witness to something you did not witness is falsifying a legal document. Consent forms are medical records. GMP is unequivocal that honesty must be maintained in all professional documentation. Declining and suggesting an appropriate alternative is the only professionally acceptable response.",
      },
      {
        id: "rank-008-b",
        text: "Decline to sign but offer to speak to the patient now to check they still consent and understand the procedure.",
        rank: 2,
        rationale:
          "Declining to sign as a false witness is correct. Offering to speak to the patient is a helpful and constructive alternative that supports the team without compromising integrity. However, speaking to the patient now is not a substitute for properly witnessing the original consent, the form itself should only be signed by someone who was present for that process.",
      },
      {
        id: "rank-008-c",
        text: "Sign the form as it is genuinely only a formality and the patient definitely consented.",
        rank: 3,
        rationale:
          "Signing as witness to a consent process you did not observe is falsifying a legal document, regardless of whether the patient actually consented. Medical records must accurately reflect what occurred. 'It's only a formality' is not a justification for falsification, and GMP places an absolute requirement on honesty in documentation.",
      },
    ],
  },

  {
    id: "rank-009",
    type: "ranking",
    domain: "patients_partnership_communication",
    difficulty: "challenging",
    stem: `Isla is a final-year medical student in A&E when a patient, Mr Osei, a 42-year-old Jehovah's Witness, is brought in following a road traffic accident. He is conscious and alert. His haemoglobin is critically low and the attending doctor tells Isla the patient will almost certainly die without an immediate blood transfusion. Mr Osei states clearly: "No blood. My religion does not permit it. I understand what you are telling me."`,
    pivotInsight:
      "A competent adult patient has the legal right to refuse life-saving treatment for any reason. This is one of the most difficult situations in medicine, but GMP and the law are explicit that competent refusal must be respected.",
    gmpRef: {
      label: "GMP · Patients, partnership and communication",
      url: `${GMP_MAIN_URL}/patients-partnership-and-communication`,
    },
    items: [
      {
        id: "rank-009-a",
        text: "Ensure Mr Osei's capacity is formally assessed and, if confirmed, that his refusal is fully documented and respected.",
        rank: 1,
        rationale:
          "A competent adult may refuse any treatment, including life-saving treatment. GMP is explicit that patient autonomy must be respected even where the consequences are fatal. The crucial step is a formal capacity assessment, Mr Osei appears to have capacity, and if confirmed, his refusal must be documented and honoured. This is the most appropriate response: following the process that protects both the patient's rights and the clinical team.",
      },
      {
        id: "rank-009-b",
        text: "Ensure the responsible clinician is aware of the refusal and that any discussion with Mr Osei is conducted calmly, without pressure.",
        rank: 2,
        rationale:
          "Ensuring the responsible senior clinician is involved is appropriate and may be necessary for both the capacity assessment and documentation. Ensuring the discussion is pressure-free is essential, GMP is clear that patients must not be coerced into decisions. This is an appropriate response, slightly less primary than formally establishing and documenting capacity.",
      },
      {
        id: "rank-009-c",
        text: "Suggest the clinical team administer the transfusion given the life-threatening circumstances, reasoning that the patient will recover and may be grateful.",
        rank: 3,
        rationale:
          "This is the least appropriate response. A competent patient's refusal cannot be overridden because a clinician believes they know best or predicts future gratitude. Administering treatment against a competent patient's expressed refusal constitutes battery, regardless of the motivation or the clinical stakes. GMP and the law are unambiguous on this point.",
      },
    ],
  },

  {
    id: "rank-010",
    type: "ranking",
    domain: "colleagues_culture_safety",
    difficulty: "foundation",
    stem: `Tomasz is a medical student who realises that two consultants, Dr Firth and Mr Blaine, have given conflicting advice to the same patient, Mrs Hemmings, about her post-operative care. Dr Firth told her to mobilise and walk the corridor twice daily. Mr Blaine, who saw her an hour later, told her to stay in bed and rest. Mrs Hemmings is confused and distressed, unsure what to do.`,
    pivotInsight:
      "Conflicting clinical instructions to a patient are a patient safety issue. The patient cannot safely navigate contradictory advice, and the confusion must be resolved through the team, not left for the patient to manage herself.",
    gmpRef: {
      label: "GMP · Colleagues, culture and safety",
      url: `${GMP_MAIN_URL}/colleagues-culture-and-safety`,
    },
    items: [
      {
        id: "rank-010-a",
        text: "Acknowledge Mrs Hemmings's concern, ask her to wait until the team clarifies the advice urgently, and escalate the discrepancy to the nursing team and both consultants' teams.",
        rank: 1,
        rationale:
          "Mrs Hemmings cannot safely follow two contradictory sets of instructions, and she should not be placed in the position of choosing between them. Asking her to wait while the team clarifies avoids her acting on conflicting advice, and prompt escalation is correct. A student should raise and coordinate, not give independent clinical instructions.",
      },
      {
        id: "rank-010-b",
        text: "Tell Mrs Hemmings to follow whichever piece of advice feels most sensible to her and ask the nurse to clarify with the team.",
        rank: 2,
        rationale:
          "Asking the nurse to escalate the confusion is appropriate and helpful. However, telling the patient to decide for herself between conflicting clinical instructions is not appropriate, she lacks the clinical knowledge to judge which instruction is correct, and placing that burden on her is poor practice. This response partially addresses the problem.",
      },
      {
        id: "rank-010-c",
        text: "Tell Mrs Hemmings not to worry, that these disagreements happen, and that she should wait to ask at the next ward round.",
        rank: 3,
        rationale:
          "This is the least appropriate response. A patient who is confused and distressed by contradictory clinical advice deserves a prompt, clear response, not dismissal. 'These things happen' is not reassuring and does not resolve an immediate safety question. Waiting for the next ward round could mean hours of uncertainty during which the patient may make an unsafe choice.",
      },
    ],
  },

  {
    id: "rank-011",
    type: "ranking",
    domain: "knowledge_skills_development",
    difficulty: "standard",
    stem: `Petra is a final-year medical student who has been consistently working longer hours than her timetable requires because the foundation doctors rely on her help and she does not want to let the team down. Over the past three weeks she has been working 10 to 12 hour days despite a recommended 8-hour maximum. She feels exhausted, has made two small documentation errors this week, and is struggling to concentrate by the end of shifts.`,
    pivotInsight:
      "Working when fatigued impairs clinical performance and creates patient safety risks. GMP requires clinicians to recognise when their own health or performance is affected and to take appropriate action, not simply absorb the pressure.",
    gmpRef: {
      label: "GMP · Knowledge, skills and development",
      url: `${GMP_MAIN_URL}/knowledge-skills-and-development`,
    },
    items: [
      {
        id: "rank-011-a",
        text: "Speak to her educational supervisor about her hours and the impact on her performance, and begin leaving at her scheduled end time.",
        rank: 1,
        rationale:
          "GMP requires that clinicians take care of their own health and recognise the limits of what they can safely do. Fatigue-related errors are a patient safety concern. Raising the issue with her educational supervisor ensures the problem is acknowledged and addressed, while adhering to her timetable protects her wellbeing and performance going forward. This is the most professionally responsible response.",
      },
      {
        id: "rank-011-b",
        text: "Begin leaving at her scheduled end time without raising the concern about her documentation errors.",
        rank: 2,
        rationale:
          "Leaving at the scheduled end time is correct. However, the two documentation errors she has already made are a patient safety concern that should be flagged and reviewed, not silently set aside. Simply adjusting her hours without acknowledging the errors or seeking support is a partial solution.",
      },
      {
        id: "rank-011-c",
        text: "Continue working the extended hours because the team relies on her, managing the fatigue as best she can.",
        rank: 3,
        rationale:
          "This is the least appropriate response. GMP requires clinicians to recognise when their health or performance may be compromised. A student who continues working to exhaustion, has already made documentation errors, and is struggling to concentrate is creating an escalating patient safety risk. Absorbing pressure at the expense of safety is not loyalty, it is a patient safety failure.",
      },
    ],
  },

  {
    id: "rank-012",
    type: "ranking",
    domain: "trust_professionalism",
    difficulty: "challenging",
    stem: `Yusuf is a medical student one month from graduation. His supervising registrar, Dr Nakamura, is extremely busy and says: "You know how to do this, just sign off the discharge prescription. I'll countersign later." Yusuf is not yet a qualified doctor and does not hold a prescribing licence.`,
    pivotInsight:
      "Prescribing without a licence is illegal, regardless of any supervision promised after the fact. A student who signs a prescription without authority places the patient and themselves at serious legal and clinical risk.",
    gmpRef: {
      label: "GMP · Trust and professionalism",
      url: `${GMP_MAIN_URL}/trust-and-professionalism`,
    },
    items: [
      {
        id: "rank-012-a",
        text: "Explain to Dr Nakamura that he cannot legally prescribe as he is not yet qualified, and offer to prepare the discharge medication details for Dr Nakamura to review, prescribe, and sign.",
        rank: 1,
        rationale:
          "Being clear that he cannot sign a prescription is the legally and professionally correct response. GMP requires clinicians to practise within their legal authority. Preparing details for a qualified clinician to review and prescribe is a helpful contribution without Yusuf exceeding his authority. This is honest, professional, and constructive.",
      },
      {
        id: "rank-012-b",
        text: "Prepare the prescription but leave the signature line blank and wait for Dr Nakamura to return to sign it.",
        rank: 2,
        rationale:
          "Preparing a prescription for a qualified clinician to review and sign is appropriate, and leaving the signature line blank is correct, Yusuf should not sign. However, this response is passive in that it does not directly communicate to Dr Nakamura why Yusuf cannot sign. A clear explanation is better than silent compliance.",
      },
      {
        id: "rank-012-c",
        text: "Sign the prescription, reasoning that Dr Nakamura will countersign as promised and graduation is only one month away.",
        rank: 3,
        rationale:
          "This is the least appropriate response. Signing a prescription without a prescribing licence is illegal, regardless of how close Yusuf is to qualifying or what Dr Nakamura has promised. A countersignature cannot retrospectively validate an unlicensed prescription. Both the patient and Yusuf would be placed at serious legal and clinical risk.",
      },
    ],
  },

  {
    id: "rank-013",
    type: "ranking",
    domain: "colleagues_culture_safety",
    difficulty: "standard",
    stem: `Precious is a dental student attending a handover at the start of a community placement shift. The supervising dentist, Mr Carrick, refers to one of the afternoon's patients by a derogatory nickname based on their weight, prompting a laugh from one of the nurses present. The patient is not present. Precious feels uncomfortable but is unsure how to respond.`,
    pivotInsight:
      "Derogatory comments about patients, even when the patient cannot hear them, undermine the dignity owed to every patient. GMP requires a culture of respect in all healthcare settings, and all team members have a role in maintaining it.",
    gmpRef: {
      label: "GMP · Colleagues, culture and safety",
      url: `${GMP_MAIN_URL}/colleagues-culture-and-safety`,
    },
    items: [
      {
        id: "rank-013-a",
        text: "After the handover, speak privately to Mr Carrick to explain that she found the comment uncomfortable and that she believes all patients should be referred to with respect.",
        rank: 1,
        rationale:
          "Raising the concern directly with Mr Carrick, privately and respectfully, is the most proportionate and professionally appropriate response. GMP requires that clinicians treat all patients with dignity and that colleagues actively support a culture of respect. A private conversation after the handover is more likely to be well-received and effective than a public challenge.",
      },
      {
        id: "rank-013-b",
        text: "If she cannot raise it directly with Mr Carrick, speak to her educational supervisor about the culture she has observed on the placement.",
        rank: 2,
        rationale:
          "Escalating to an educational supervisor is appropriate if a direct conversation with Mr Carrick is not possible or has not been effective. It ensures the concern is raised through proper channels. This is a slightly less immediate response than a direct conversation but is entirely appropriate and professional.",
      },
      {
        id: "rank-013-c",
        text: "Say nothing, as the comment was made behind closed doors and the patient was unaware.",
        rank: 3,
        rationale:
          "Dignity is not contingent on whether a patient can hear what is being said about them. GMP requires that patients are treated with respect in all circumstances. Staying silent in response to derogatory language normalises disrespectful behaviour and contributes to a culture in which patients are not treated with the dignity they deserve.",
      },
    ],
  },

  {
    id: "rank-014",
    type: "ranking",
    domain: "patients_partnership_communication",
    difficulty: "standard",
    stem: `Chloe is a medical student observing a GP consultation with a patient, Mrs Alonzo, who speaks limited English. A professional telephone interpreter has been arranged. During the consultation, Chloe notices that the interpreter is not simply translating, they are adding commentary, summarising rather than directly translating the patient's words, and at one point appears to advise Mrs Alonzo on what to say. The GP appears not to have noticed.`,
    pivotInsight:
      "An interpreter's role is to translate accurately and impartially, not to filter, advise, or advocate. A patient whose words are being altered or filtered is not receiving the consultation they are entitled to.",
    gmpRef: {
      label: "GMP · Patients, partnership and communication",
      url: `${GMP_MAIN_URL}/patients-partnership-and-communication`,
    },
    items: [
      {
        id: "rank-014-a",
        text: "Raise quietly with the GP, during a natural pause, that the interpreter appears to be doing more than translating, and suggest asking the interpreter to translate directly.",
        rank: 1,
        rationale:
          "The GP needs to be aware that the consultation may not be accurately reflecting what Mrs Alonzo is saying. Raising this quietly, during a natural pause, is discreet and ensures the GP can address the issue appropriately. This protects Mrs Alonzo's right to have her words accurately conveyed without causing unnecessary disruption.",
      },
      {
        id: "rank-014-b",
        text: "Note the concern and raise it with the GP after the consultation, asking whether the patient's actual responses are reflected in the clinical record.",
        rank: 2,
        rationale:
          "Raising the concern after the consultation is better than saying nothing, but there is a risk that the clinical record has already been completed based on the interpreter's filtered version of Mrs Alonzo's words. Raising the issue during the consultation is more timely and more protective of the patient's interests.",
      },
      {
        id: "rank-014-c",
        text: "Say nothing, as interpreters are trained professionals who are experienced in managing these consultations.",
        rank: 3,
        rationale:
          "Professional training does not guarantee appropriate conduct in any individual consultation. Chloe has directly observed that the interpreter is not simply translating, this is not an assumption, it is an observation. Staying silent because the interpreter is a professional ignores what Chloe can see happening in real time, and leaves Mrs Alonzo without the protection of accurate translation.",
      },
    ],
  },

  {
    id: "rank-015",
    type: "ranking",
    domain: "knowledge_skills_development",
    difficulty: "challenging",
    stem: `Mei is a final-year medical student who arrives on time for her supervised GP clinic. Her supervising GP, Dr Hassan, sends a message saying he will be 40 minutes late due to a family emergency and asks Mei to "start seeing patients and take notes, and I'll review your findings when I arrive." There are several patients in the waiting room. Mei is not qualified to consult independently.`,
    pivotInsight:
      "A student who begins consultations alone is not supervised, she is practising without a licence. Patients deserve to be seen by a qualified clinician, not reassured by a student working beyond their authorised scope.",
    gmpRef: {
      label: "GMP · Knowledge, skills and development",
      url: `${GMP_MAIN_URL}/knowledge-skills-and-development`,
    },
    items: [
      {
        id: "rank-015-a",
        text: "Speak to the practice manager or duty GP to explain that the clinic cannot begin without a qualified clinician present, and ensure waiting patients are appropriately informed.",
        rank: 1,
        rationale:
          "GMP requires that students practise within their authorised scope. Mei cannot see patients independently, regardless of Dr Hassan's instructions. The practice manager needs to know the situation so that alternative cover can be arranged and patients can be properly managed. This response does not abandon the patients but does not ask Mei to exceed her authorised role.",
      },
      {
        id: "rank-015-b",
        text: "Call Dr Hassan to clarify exactly what he expects and explain that she is not comfortable seeing patients independently.",
        rank: 2,
        rationale:
          "Clarifying Dr Hassan's instruction and being honest about her discomfort is appropriate. Dr Hassan may not have been thinking clearly about what he was asking. However, this response leaves the clinic in a holding position without engaging the practice infrastructure to find a solution. It is appropriate but less proactive than speaking to the practice manager.",
      },
      {
        id: "rank-015-c",
        text: "Begin seeing patients as requested, taking detailed notes for Dr Hassan to review, as she is nearly qualified and it is a supervised clinic.",
        rank: 3,
        rationale:
          "This is the least appropriate response. Beginning independent consultations on real patients without a qualified clinician present is not supervision, it is unsupervised practice, regardless of how detailed the notes are. Dr Hassan's review after the fact does not constitute supervision in any meaningful clinical or legal sense. Mei would be practising without the authority to do so, placing patients at risk.",
      },
    ],
  },

  {
    id: "rank-016",
    type: "ranking",
    domain: "trust_professionalism",
    difficulty: "standard",
    stem: `Oliver is a medical student whose hospital ID badge was accidentally swapped with a fellow student's, which he only notices at the end of the day. His badge identifies him correctly but the badge he wore today displayed a different student's name and training level. During the day he introduced himself correctly to patients and staff, but at least two patients would have read his badge before he noticed the mix-up.`,
    pivotInsight:
      "Patients have the right to know who is treating them. While the error was accidental, it should be reported and handled in line with local policy, especially where identification may have been unclear.",
    gmpRef: {
      label: "GMP · Trust and professionalism",
      url: `${GMP_MAIN_URL}/trust-and-professionalism`,
    },
    items: [
      {
        id: "rank-016-a",
        text: "Report the badge mix-up to his placement coordinator and follow local policy on whether any patients need to be informed.",
        rank: 1,
        rationale:
          "Reporting the incident is the right professional response. Oliver introduced himself correctly, but patients may have relied on the badge. Local policy and the placement team can decide whether further action is needed. Transparency about errors is important even when harm is unlikely.",
      },
      {
        id: "rank-016-b",
        text: "Return both badges and report the mix-up, but not attempt to identify the affected patients as the error was minor.",
        rank: 2,
        rationale:
          "Returning the badges and reporting the mix-up is correct. However, completely dismissing the impact on patients by not attempting to identify them understates the importance of patient transparency. Whether patients can in practice be identified depends on the records available, but the attempt should be made.",
      },
      {
        id: "rank-016-c",
        text: "Simply swap the badges back and say nothing, as the error was accidental and he introduced himself correctly by name throughout.",
        rank: 3,
        rationale:
          "The fact that Oliver introduced himself correctly does not fully resolve the issue for patients who may have relied on his badge for identification. Saying nothing when something has gone wrong, even accidentally, is contrary to GMP's duty of candour. Transparency about errors is a professional obligation, not an optional act.",
      },
    ],
  },

  {
    id: "rank-017",
    type: "ranking",
    domain: "colleagues_culture_safety",
    difficulty: "challenging",
    stem: `Suki is a medical student on a night placement. At 2am, the outgoing registrar tells her that a patient, Mr Voss, "is fine but just a bit unsettled." Reviewing the observation chart on the way to the next bay, Suki notices that Mr Voss's respiratory rate has increased significantly over the last four hours, his blood pressure has dropped, and he had a temperature spike earlier that was not mentioned in the handover.`,
    pivotInsight:
      "Inadequate handover information is a patient safety risk. A student who notices discrepancies between what they were told and what the clinical record shows must act immediately, not assume the outgoing team already knows.",
    gmpRef: {
      label: "GMP · Colleagues, culture and safety",
      url: `${GMP_MAIN_URL}/colleagues-culture-and-safety`,
    },
    items: [
      {
        id: "rank-017-a",
        text: "Immediately bring the observation chart findings to the on-call registrar's attention, ensuring Mr Voss is reviewed without delay.",
        rank: 1,
        rationale:
          "The discrepancy between the handover information and Mr Voss's observation chart suggests possible deterioration that was either missed or not communicated. This is a patient safety issue requiring immediate escalation. GMP requires that concerns about patient safety are raised promptly, and Suki should not wait or assume the clinical team is already aware.",
      },
      {
        id: "rank-017-b",
        text: "Review the full observation chart carefully and document her concerns before escalating to the on-call registrar.",
        rank: 2,
        rationale:
          "Briefly reviewing the chart to better understand the clinical picture before escalating is reasonable. However, a patient with rising respiratory rate, dropping blood pressure, and a recent temperature spike may be deteriorating rapidly. Documentation should not delay escalation. This is appropriate if the review is brief, but prompt escalation must take priority.",
      },
      {
        id: "rank-017-c",
        text: "Assume the outgoing registrar would have highlighted these findings if they were truly concerning, and continue with the rest of the handover.",
        rank: 3,
        rationale:
          "This is the least appropriate response. The job of a clinician is to assess the patient in front of them, not to assume that everything important has been communicated at handover. Handover errors are a well-documented source of patient harm. Mr Voss's observation chart shows a pattern that cannot be dismissed. Assuming someone else has already noticed is how patients deteriorate without intervention.",
      },
    ],
  },

  {
    id: "rank-018",
    type: "ranking",
    domain: "patients_partnership_communication",
    difficulty: "standard",
    stem: `Meera is a medical student sitting in with a GP. A patient, Mr Lang, has been prescribed a new blood pressure medication. The GP explains the medication quickly and then leaves to take an urgent call, asking Meera to give Mr Lang the printed information leaflet. Mr Lang looks worried and says, "I don't really understand why I need this. I don't like taking tablets."`,
    pivotInsight:
      "Giving information is not enough. The patient needs an opportunity to understand, ask questions, and make an informed decision. A student should help within competence and involve the GP where needed.",
    gmpRef: {
      label: "GMP · Patients, partnership and communication",
      url: `${GMP_MAIN_URL}/patients-partnership-and-communication`,
    },
    items: [
      {
        id: "rank-018-a",
        text: "Acknowledge Mr Lang's concerns, ask what he is worried about, explain what she can within her competence, and tell the GP that Mr Lang has further questions before deciding.",
        rank: 1,
        rationale:
          "This is the most appropriate response. It acknowledges the patient's concerns, explores what he does not understand, keeps Meera within her competence, and ensures the GP is aware that the patient needs further discussion before making a decision.",
      },
      {
        id: "rank-018-b",
        text: "Give Mr Lang the leaflet and advise him to read it at home, as the GP has already explained the medication.",
        rank: 2,
        rationale:
          "This is less appropriate but still offers some support. Written information may be useful, but it does not properly address the fact that Mr Lang is currently confused and worried. He needs an opportunity to ask questions and understand the medication before deciding.",
      },
      {
        id: "rank-018-c",
        text: "Tell Mr Lang that he should take the medication because the GP would not prescribe it unless it was necessary.",
        rank: 3,
        rationale:
          "This is the least appropriate response. It relies on the GP's authority rather than addressing the patient's concerns. Patients should be supported to understand and participate in decisions, not pressured into agreement.",
      },
    ],
  },

  {
    id: "rank-019",
    type: "ranking",
    domain: "colleagues_culture_safety",
    difficulty: "challenging",
    stem: `Owen is a medical student on a surgical ward. A nurse tells the foundation doctor that a post-operative patient has become increasingly drowsy and has a low respiratory rate after receiving pain relief. The foundation doctor says, "I'm sure she's just tired after surgery," and continues writing discharge summaries. The nurse looks worried and says she has already tried to raise this twice.`,
    pivotInsight:
      "Possible clinical deterioration is an urgent patient safety issue. A student should not ignore a nurse's concern simply because a doctor has dismissed it.",
    gmpRef: {
      label: "GMP · Colleagues, culture and safety",
      url: `${GMP_MAIN_URL}/colleagues-culture-and-safety`,
    },
    items: [
      {
        id: "rank-019-a",
        text: "Support the nurse in escalating the concern immediately to another appropriate clinician or senior member of the team.",
        rank: 1,
        rationale:
          "This is the most appropriate response. The patient may be deteriorating and the concern has already been dismissed more than once. Owen should help ensure the patient is reviewed promptly by someone able to assess and manage the situation.",
      },
      {
        id: "rank-019-b",
        text: "Ask the foundation doctor politely whether they could review the patient before continuing the discharge summaries.",
        rank: 2,
        rationale:
          "This is appropriate because it raises the concern directly and respectfully. However, because the concern has already been raised twice and may be urgent, escalation to another appropriate clinician is a stronger response if there is ongoing delay or dismissal.",
      },
      {
        id: "rank-019-c",
        text: "Assume the foundation doctor has made a clinical judgement and say nothing further.",
        rank: 3,
        rationale:
          "This is the least appropriate response. Owen has heard a clear patient safety concern. Student status and hierarchy do not remove the responsibility to act when a patient may be at risk.",
      },
    ],
  },

  {
    id: "rank-020",
    type: "ranking",
    domain: "trust_professionalism",
    difficulty: "standard",
    stem: `Clara is a medical student. Her friend Jamie asks to copy her completed reflective portfolio because he has fallen behind and says he will "change the wording enough that nobody notices". Jamie says he has been struggling with family problems and is worried he will fail the placement if he submits late.`,
    pivotInsight:
      "The response must combine honesty with support. Compassion for a struggling colleague does not justify academic dishonesty or falsifying professional reflection.",
    gmpRef: {
      label: "GMP · Trust and professionalism",
      url: `${GMP_MAIN_URL}/trust-and-professionalism`,
    },
    items: [
      {
        id: "rank-020-a",
        text: "Speak with Jamie to understand why he has fallen behind, decline to let him copy the portfolio, and encourage him to contact his supervisor or student support honestly.",
        rank: 1,
        rationale:
          "This is the most appropriate response. Clara is honest and does not participate in academic dishonesty, but she is also supportive and non-judgemental. Understanding Jamie's circumstances may help him access appropriate support and resolve the problem properly.",
      },
      {
        id: "rank-020-b",
        text: "Decline to share the portfolio and tell Jamie he needs to sort it out himself.",
        rank: 2,
        rationale:
          "Refusing to allow copying is correct. However, this response is less appropriate than offering support or signposting Jamie to help, particularly as he has described personal difficulties.",
      },
      {
        id: "rank-020-c",
        text: "Share the portfolio as long as Jamie promises to rewrite it in his own words.",
        rank: 3,
        rationale:
          "This is the least appropriate response. It facilitates academic dishonesty and undermines the purpose of reflective practice. Rewording copied reflection does not make it honest or professional.",
      },
    ],
  },

  {
    id: "rank-021",
    type: "ranking",
    domain: "colleagues_culture_safety",
    difficulty: "standard",
    stem: `Priya is a dental student. During a clinic, she hears a senior student speak sharply to a nervous patient, saying, "If you keep moving, this will be your fault." The patient becomes tearful and stops asking questions. The senior student later says the patient was being difficult and that Priya should not make a fuss.`,
    pivotInsight:
      "Poor communication that intimidates a patient affects dignity, trust, and safety. The response should support the patient and raise the concern proportionately.",
    gmpRef: {
      label: "GMP · Colleagues, culture and safety",
      url: `${GMP_MAIN_URL}/colleagues-culture-and-safety`,
    },
    items: [
      {
        id: "rank-021-a",
        text: "Check that the patient is all right, and raise the incident with the clinical supervisor after the consultation.",
        rank: 1,
        rationale:
          "This is the most appropriate response. It supports the patient and ensures the behaviour is raised with someone responsible for supervision. This is proportionate because the comment affected the patient during care.",
      },
      {
        id: "rank-021-b",
        text: "Speak privately to the senior student afterwards and explain that the comment seemed to upset the patient.",
        rank: 2,
        rationale:
          "This is reasonable and may help the senior student reflect. However, because the behaviour affected a patient during care, raising it only with the student may not be sufficient.",
      },
      {
        id: "rank-021-c",
        text: "Say nothing because the senior student has more clinical experience and may know how best to manage nervous patients.",
        rank: 3,
        rationale:
          "This is the least appropriate response. Experience does not justify intimidating or blaming a patient. Saying nothing fails to address the patient's distress and allows poor communication to go unchallenged.",
      },
    ],
  },

  {
    id: "rank-022",
    type: "ranking",
    domain: "colleagues_culture_safety",
    difficulty: "standard",
    stem: `Aisha is leading a group project with three other medical students. Two members of the group, Leo and Imran, start arguing during a meeting about which section should be prioritised. The argument becomes heated, and the other students look uncomfortable. The project deadline is the next day.`,
    pivotInsight:
      "Good leadership means turning conflict into a constructive discussion and finding a practical way forward, rather than dismissing concerns or allowing the conflict to continue.",
    gmpRef: {
      label: "GMP · Colleagues, culture and safety",
      url: `${GMP_MAIN_URL}/colleagues-culture-and-safety`,
    },
    items: [
      {
        id: "rank-022-a",
        text: "Facilitate a focused discussion so the group can agree which section to prioritise and how to complete the remaining work.",
        rank: 1,
        rationale:
          "This is the most appropriate response. Aisha acknowledges the disagreement and turns it into a constructive discussion with a practical aim. This supports teamwork and helps the group make progress.",
      },
      {
        id: "rank-022-b",
        text: "Ask Leo and Imran to explain their concerns briefly, then help the group decide on a plan.",
        rank: 2,
        rationale:
          "This is appropriate and supportive, but slightly less strong than rank 1 because it focuses first on the two students rather than immediately facilitating a whole-group solution. It is still a reasonable response.",
      },
      {
        id: "rank-022-c",
        text: "Tell Leo and Imran to stop discussing their disagreement because the group has more important things to do.",
        rank: 3,
        rationale:
          "This is the least appropriate response. It dismisses their concerns and may make them feel alienated. It also fails to resolve the disagreement that is distracting the group.",
      },
    ],
  },

  {
    id: "rank-023",
    type: "ranking",
    domain: "patients_partnership_communication",
    difficulty: "foundation",
    stem: `Ella is a medical student in the emergency department. She is about to collect a patient with a minor wrist injury from the waiting room when she notices a young child crying and calling for his father. The child appears lost and no parent or guardian is nearby.`,
    pivotInsight:
      "A lost and distressed child needs immediate reassurance and help. A patient with a minor injury may be asked to wait briefly while the child is made safe.",
    gmpRef: {
      label: "GMP · Patients, partnership and communication",
      url: `${GMP_MAIN_URL}/patients-partnership-and-communication`,
    },
    items: [
      {
        id: "rank-023-a",
        text: "Tell the patient with the wrist injury that she will return shortly, then comfort the child and seek help to locate his parent.",
        rank: 1,
        rationale:
          "This is the most appropriate response. The patient with the wrist injury is not described as being in immediate danger, while the lost child is distressed and potentially vulnerable. Ella should reassure the patient briefly and then help the child.",
      },
      {
        id: "rank-023-b",
        text: "Ask people nearby whether they have seen the child's father.",
        rank: 2,
        rationale:
          "This is useful and may help locate the parent, but it would be better first to comfort the child and ensure he is safe while help is sought.",
      },
      {
        id: "rank-023-c",
        text: "Distract the child with toys and leave him in the play area while she continues with the wrist injury patient.",
        rank: 3,
        rationale:
          "This is the least appropriate response. It does not resolve the situation or ensure the child is supervised and safe. Ella should not leave a lost and distressed child unattended.",
      },
    ],
  },

  {
    id: "rank-024",
    type: "ranking",
    domain: "knowledge_skills_development",
    difficulty: "standard",
    stem: `Nadia is a first-year medical student. Her supervisor tells her that several patients and nurses have found her communication style abrupt. Nadia is surprised and feels the feedback is unfair because she believes she has been efficient rather than rude.`,
    pivotInsight:
      "Feedback should be treated as an opportunity to understand and improve. Dismissing feedback or looking for reassurance from others is less helpful.",
    gmpRef: {
      label: "GMP · Knowledge, skills and development",
      url: `${GMP_MAIN_URL}/knowledge-skills-and-development`,
    },
    items: [
      {
        id: "rank-024-a",
        text: "Ask her supervisor for specific examples so she can understand the concern and work on her communication.",
        rank: 1,
        rationale:
          "This is the most appropriate response. Asking for specific examples helps Nadia understand how her behaviour is perceived and gives her a practical basis for improving her communication.",
      },
      {
        id: "rank-024-b",
        text: "Tell her supervisor she is surprised by the feedback but will reflect on it and try to improve.",
        rank: 2,
        rationale:
          "This is appropriate because Nadia acknowledges the feedback and shows willingness to reflect. However, it is less helpful than asking for specific examples, which would allow more targeted development.",
      },
      {
        id: "rank-024-c",
        text: "Ask other students whether they have also received unfair feedback from the same supervisor.",
        rank: 3,
        rationale:
          "This is the least appropriate response. It shifts the focus away from Nadia's own development and assumes the feedback may be unfair rather than trying to understand and learn from it.",
      },
    ],
  },

  {
    id: "rank-025",
    type: "ranking",
    domain: "knowledge_skills_development",
    difficulty: "standard",
    stem: `Priya is working with another medical student, Laila, on a shared presentation. Laila has missed several planning meetings and says she is struggling to balance the project with caring responsibilities at home. The deadline is approaching and Priya is worried they will not finish in time.`,
    pivotInsight:
      "The official-style approach is to be non-judgemental, understand the difficulty, and look for a practical arrangement that allows the work to be completed.",
    gmpRef: {
      label: "GMP · Knowledge, skills and development",
      url: `${GMP_MAIN_URL}/knowledge-skills-and-development`,
    },
    items: [
      {
        id: "rank-025-a",
        text: "Ask Laila whether there is a more suitable way for them to divide the work and complete the project together.",
        rank: 1,
        rationale:
          "This is the most appropriate response. It recognises that Laila may have genuine difficulties and focuses on finding a practical, non-judgemental solution that helps both students complete the project.",
      },
      {
        id: "rank-025-b",
        text: "Tell Laila that Priya understands caring responsibilities can be difficult and ask whether she needs support.",
        rank: 2,
        rationale:
          "This is supportive and empathetic, but it is slightly less appropriate than rank 1 because it does not directly create a practical plan for completing the project.",
      },
      {
        id: "rank-025-c",
        text: "Tell Laila that her absences are affecting the project and that this is unfair to Priya.",
        rank: 3,
        rationale:
          "This is the least appropriate response. Although the absences are affecting the project, this wording is likely to make Laila feel judged and does not explore the reasons or offer a practical solution.",
      },
    ],
  },

  {
    id: "rank-026",
    type: "ranking",
    domain: "patients_partnership_communication",
    difficulty: "challenging",
    stem: `Amelia is a medical student seeing a long-term patient with a minor chronic condition. Recently, the patient has been attending more frequently with vague symptoms and asking for sick notes. Amelia suspects there may be emotional distress linked to work, but she is also worried the patient may be exaggerating symptoms.`,
    pivotInsight:
      "The best response is non-judgemental and curious. Accusing a patient of pretending to be ill is highly damaging to trust.",
    gmpRef: {
      label: "GMP · Patients, partnership and communication",
      url: `${GMP_MAIN_URL}/patients-partnership-and-communication`,
    },
    items: [
      {
        id: "rank-026-a",
        text: "Ask the patient how he has been feeling generally and whether anything at work has been affecting his wellbeing.",
        rank: 1,
        rationale:
          "This is the most appropriate response. It is empathetic, non-judgemental and may uncover emotional or work-related difficulties contributing to the repeated attendances.",
      },
      {
        id: "rank-026-b",
        text: "Discuss her observations with the supervising doctor so the patient's situation can be considered more holistically.",
        rank: 2,
        rationale:
          "This is appropriate because Amelia should involve the supervising doctor and think holistically. However, it is slightly less direct than first exploring the patient's wellbeing in a sensitive way if she is involved in the consultation.",
      },
      {
        id: "rank-026-c",
        text: "Tell the patient that she does not believe he is genuinely unwell.",
        rank: 3,
        rationale:
          "This is the least appropriate response. It is judgemental and likely to damage the clinician-patient relationship. There may be emotional, social, or medically unexplained reasons for the presentations.",
      },
    ],
  },

  {
    id: "rank-027",
    type: "ranking",
    domain: "trust_professionalism",
    difficulty: "standard",
    stem: `Daniel is a dental student. His friend Noor asks him to help with a piece of coursework because English is not her first language. Daniel later realises that Noor has copied parts of his previous work into her assignment. Noor says she panicked and asks Daniel not to tell anyone because she is already struggling financially and academically.`,
    pivotInsight:
      "Copying work is not acceptable, but the official-style first response should be honest, supportive, and curious about the reasons, rather than simply abandoning the colleague.",
    gmpRef: {
      label: "GMP · Trust and professionalism",
      url: `${GMP_MAIN_URL}/trust-and-professionalism`,
    },
    items: [
      {
        id: "rank-027-a",
        text: "Speak to Noor to understand why she copied the work, make clear that copying is not acceptable, and encourage her to seek academic support.",
        rank: 1,
        rationale:
          "This is the most appropriate response. Daniel addresses the dishonesty directly while also trying to understand the reasons and guide Noor towards appropriate support.",
      },
      {
        id: "rank-027-b",
        text: "Offer to help Noor understand the topic in future, but tell her she must not copy his work.",
        rank: 2,
        rationale:
          "This is appropriate because it sets a clear boundary and offers legitimate support. However, it is slightly less complete than rank 1 because it does not explore why Noor felt the need to copy or signpost formal support.",
      },
      {
        id: "rank-027-c",
        text: "Refuse to help Noor with any work again.",
        rank: 3,
        rationale:
          "This is the least appropriate response. Although Daniel should not allow copying, simply refusing any future help is unhelpful and misses the chance to support Noor appropriately.",
      },
    ],
  },

];

export function getSJTQuestionsByType(type: SJTQuestion["type"]): SJTQuestion[] {
  return SJT_QUESTIONS.filter((q) => q.type === type);
}

export function getSJTQuestionsByDomain(
  domain: SJTQuestion["domain"]
): SJTQuestion[] {
  return SJT_QUESTIONS.filter((q) => q.domain === domain);
}

export function getSJTQuestionsByDifficulty(
  difficulty: SJTQuestion["difficulty"]
): SJTQuestion[] {
  return SJT_QUESTIONS.filter((q) => q.difficulty === difficulty);
}

export function pickRandomSJTQuestion(
  type: SJTQuestion["type"],
  excludeId?: string | null,
  domain?: SJTQuestion["domain"] | null
): SJTQuestion | null {
  let pool = getSJTQuestionsByType(type);
  if (domain) pool = pool.filter((q) => q.domain === domain);
  if (pool.length === 0) pool = getSJTQuestionsByType(type);
  if (pool.length === 0) return null;

  const available = excludeId ? pool.filter((q) => q.id !== excludeId) : pool;
  const source = available.length > 0 ? available : pool;
  return source[Math.floor(Math.random() * source.length)];
}
