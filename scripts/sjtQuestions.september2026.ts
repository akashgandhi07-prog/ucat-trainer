/** Original editorial drafts. Not included in seed:sjt or any browser bundle.
 * Export for Question Lab with npm run export:sjt-expansion.
 * GMC references support principles, not an official UCAT answer key.
 */
import type { GmpReference, RatingItem, RankingItem, SJTQuestion } from "../src/types/sjt";

const GMP = "https://www.gmc-uk.org/professional-standards/the-professional-standards/good-medical-practice";
const patients: GmpReference = { label: "GMP domain 2, paragraphs 24, 25 and 28 to 35", url: `${GMP}/domain-2-patients-partnership-and-communication` };
const colleagues: GmpReference = { label: "GMP domain 3, paragraphs 48 to 67 and 69 to 75", url: `${GMP}/domain-3-colleagues-culture-and-safety` };
const honesty: GmpReference = { label: "GMP domain 4, paragraphs 81, 88 and 89", url: `${GMP}/domain-4-trust-and-professionalism` };
const teachingConsent: GmpReference = { label: "GMC confidentiality guidance: disclosing for education and training purposes", url: "https://www.gmc-uk.org/professional-standards/the-professional-standards/confidentiality---disclosing-for-education-and-training-purposes/disclosing-for-education-and-training-purposes" };
const researchParticipation: GmpReference = { label: "GMC Good practice in research, paragraphs 38 to 41", url: "https://www.gmc-uk.org/professional-standards/the-professional-standards/good-practice-in-research/good-practice-in-research" };
const students: GmpReference = { label: "Achieving good medical practice: guidance for medical students", url: "https://www.gmc-uk.org/-/media/documents/agmp-2024-for-medical-students-english_pdf-108649541.pdf" };
const reflection: GmpReference = { label: "GMC: Anonymising reflective notes", url: "https://www.gmc-uk.org/education/standards-guidance-and-curricula/guidance/reflective-practice/the-reflective-practitioner---supplementary-guidance-for-medical-students/anonymising-reflective-notes" };

function rating(id: string, text: string, correctRating: RatingItem["correctRating"], rationale: string, whyNotAdjacent: string): RatingItem {
  return { id, text, correctRating, rationale, whyNotAdjacent };
}
function ranked(id: string, text: string, rank: RankingItem["rank"], rationale: string): RankingItem {
  return { id, text, rank, rationale };
}

export const SJT_EXPANSION: SJTQuestion[] = [
  {
    id: "app-031", type: "appropriateness", domain: "patients_partnership_communication", difficulty: "foundation",
    stem: "Amelie is a medical student attending an outpatient clinic. Before the consultation, the doctor explains that Amelie would observe for teaching purposes and asks the patient's permission. The patient understands this but clearly declines, saying they would prefer to speak to the doctor alone. Amelie can wait outside without delaying the consultation. Rate each response independently.",
    pivotInsight: "Consent to receive care does not mean consent to student observation. More than one response can be very appropriate.",
    gmpRef: teachingConsent,
    items: [
      rating("app-031-a", "Ask the patient to reconsider because Amelie has had few learning opportunities this week.", "inappropriate", "This puts Amelie's educational needs ahead of a clearly expressed preference. The patient has already understood the request, so asking again for Amelie's benefit adds unnecessary pressure.", "The response is unhelpful rather than appropriate. It does not itself force Amelie to remain or falsely claim that observation is compulsory, so very inappropriate would overstate what this particular action says."),
      rating("app-031-b", "Thank the patient for explaining their preference and leave the room before the consultation starts.", "very_appropriate", "Amelie respects the decision promptly and allows the private consultation to proceed. There is no need to obtain a justification for the refusal.", "There is no stated drawback that would lower this to appropriate but not ideal. It directly respects the patient's choice."),
      rating("app-031-c", "Tell the patient that the consultation can only go ahead if they agree to a student observing.", "very_inappropriate", "This invents a condition on access to care and pressures the patient into accepting an unwanted observer. Nothing in the scenario makes Amelie's presence necessary.", "This is more serious than an insensitive request: it is a misleading threat to withhold the consultation."),
      rating("app-031-d", "Reassure the patient that declining student observation will not affect their care, then wait outside.", "very_appropriate", "This both respects the refusal and addresses any concern about consequences for care. It avoids bargaining or making the patient feel obliged to help.", "The reassurance is consistent with the facts and Amelie leaves immediately. The existence of another very appropriate response does not reduce this rating."),
    ],
  },
  {
    id: "app-032", type: "appropriateness", domain: "trust_professionalism", difficulty: "standard",
    stem: "Darius is preparing a reflection about listening to an anxious patient. The draft is saved in the university's approved secure portfolio and has not been submitted. He has removed the patient's name but included their exact age, unusual occupation, village and appointment date. Those details are unnecessary to explain what he learnt and, together, could identify the patient. Rate each response independently.",
    pivotInsight: "Removing a name is only one part of anonymisation. Retain the learning, not unnecessary identifying detail.",
    gmpRef: reflection,
    items: [
      rating("app-032-a", "Remove or generalise the identifying details and focus the reflection on what he learnt about listening.", "very_appropriate", "This preserves the purpose of the reflection while addressing the actual identification risk. None of the listed details is needed to explain the learning.", "This is a suitable response to the stated problem, not merely an acceptable compromise. No educationally necessary information is lost."),
      rating("app-032-b", "Post the unchanged reflection in a large student social-media group to ask whether it is anonymous enough.", "very_inappropriate", "Darius already knows the combined details could identify the patient. Sharing them with a wider, unauthorised audience creates the very disclosure risk he should be preventing.", "This is more than a minor error in judgement because it actively spreads potentially identifiable patient information outside the approved portfolio."),
      rating("app-032-c", "Keep the details because a reflection without the patient's name must be anonymous.", "inappropriate", "The conclusion is wrong: the remaining details can identify the patient together. Darius should revise them before submitting the reflection.", "It is not appropriate because it ignores an explicit identification risk. Unlike publishing the draft to an unauthorised audience, this action retains it in the approved secure portfolio, which limits the severity of the stated action."),
      rating("app-032-d", "Before submitting, discuss how to anonymise the reflection with his tutor without sharing the identifying details.", "very_appropriate", "Seeking focused advice while withholding the unnecessary details is a responsible way to resolve uncertainty. The question does not require Darius to solve the entire issue without help.", "A safe request for relevant guidance should not be downgraded simply because another response edits the draft directly. This action addresses the problem without a stated disadvantage."),
    ],
  },
  {
    id: "app-033", type: "appropriateness", domain: "trust_professionalism", difficulty: "standard",
    stem: "Safiya is helping with a supervised audit of whether discharge information was documented. Three records cannot be accessed before tomorrow's meeting. The audit lead has asked her to identify missing data explicitly. Another student suggests marking the three unavailable records as complete because most of the other records were complete. Rate each response independently.",
    pivotInsight: "A plausible estimate is not an observation. Missing evidence should remain visible.",
    gmpRef: honesty,
    items: [
      rating("app-033-a", "Explain to the other student that the unavailable records cannot be assumed complete and ask them to help make that limitation clear in the presentation.", "very_appropriate", "This rejects the proposed guess and involves the colleague in reporting the limitation honestly. Safiya does not accuse the colleague of having already falsified anything.", "It addresses the suggested misconduct constructively without a stated drawback. It need not be the only possible very appropriate action."),
      rating("app-033-b", "Record the three results as unavailable and explain the limitation to the audit lead.", "very_appropriate", "This reports exactly what is known and what is missing. The audit lead can decide how to present or follow up the incomplete dataset.", "It is not merely appropriate but not ideal: accurate reporting of unavailable evidence is the correct response to the stated limitation."),
      rating("app-033-c", "Mark all three records as complete and report that she checked them.", "very_inappropriate", "Safiya would be inventing findings and falsely claiming to have reviewed the records. The apparent consistency with other records cannot justify this.", "This crosses beyond an incomplete explanation into deliberate fabrication, which makes the lower-severity inappropriate category insufficient."),
      rating("app-033-d", "Ask the audit lead whether the missing records can be checked later, while reporting them as unavailable in tomorrow's presentation.", "very_appropriate", "This combines transparent reporting now with a practical plan for completing the work. It does not misrepresent the existing evidence or promise access she cannot guarantee.", "A later follow-up does not make the present report inadequate when the missing results are honestly identified. There is no stated reason to downgrade it."),
    ],
  },
  {
    id: "app-034", type: "appropriateness", domain: "colleagues_culture_safety", difficulty: "standard",
    stem: "After an unsuccessful formative assessment, medical student Ben tells his classmate Imani that he feels embarrassed and discouraged. He asks to talk privately and says he is safe and has support at home. There is no patient-care task or immediate safety concern. Rate each response independently.",
    pivotInsight: "Support should acknowledge the person's concern. Ordinary disappointment does not automatically justify sharing private information widely.",
    gmpRef: colleagues,
    items: [
      rating("app-034-a", "Say, 'One difficult assessment does not define you,' then change the subject without giving Ben a chance to talk.", "inappropriate", "The words are kind, but changing the subject straight away shuts down Ben's explicit request to talk privately. Using reassurance to close the conversation leaves him without the support he asked a colleague for.", "It is not appropriate because a kind phrase does not make up for refusing the conversation Ben asked for. It is not very inappropriate because it is not hostile, does not disclose his information and there is no stated safety risk."),
      rating("app-034-b", "Tell Ben that he should stop making a fuss because everyone has problems.", "inappropriate", "This dismisses Ben's experience and discourages him from seeking support. A private, respectful response is possible without agreeing that the assessment defines his abilities.", "The statement is unkind rather than helpful. It does not disclose his information, threaten him or describe a more serious pattern of bullying, so very inappropriate would overstate this isolated response."),
      rating("app-034-c", "Listen privately, ask what support would help and offer to help him arrange a discussion with his tutor if he wants one.", "very_appropriate", "This responds to the request and lets Ben participate in choosing support. There is no stated emergency requiring Imani to override his preferences.", "It meets the immediate need without a stated drawback, so appropriate but not ideal would underrate it."),
      rating("app-034-d", "Post Ben's name and what he said in the year-group chat without asking him, so other students can comment.", "very_inappropriate", "Ben requested privacy. Publicising a personal disclosure without permission exposes him to unwanted attention and breaks his trust, with no stated safety reason to do so.", "This is a deliberate, wide disclosure of a private conversation, not simply a clumsy attempt at reassurance."),
    ],
  },
  {
    id: "imp-030", type: "importance", domain: "patients_partnership_communication", difficulty: "foundation",
    stem: "A doctor asks medical student Leila to help a patient access an approved information leaflet about a planned treatment. The patient says they cannot read the small print and would like a large-print version. There is time to arrange this before any decision is made. Rate the importance of each consideration when Leila decides how to help.",
    pivotInsight: "An information leaflet only helps if the patient can use it. Ask about support rather than assuming what a disability means.",
    gmpRef: patients,
    items: [
      rating("imp-030-a", "Whether the patient can access and understand the information needed for their decision.", "very_important", "This is central to the purpose of providing the leaflet. Simply delivering unreadable material would not meet that purpose.", "Important would understate a factor that determines whether the patient can use the information at all."),
      rating("imp-030-b", "Leila's personal preference for the appearance of the small-print leaflet.", "not_important", "Her aesthetic preference should not influence whether the patient receives accessible information.", "It has no relevant bearing on the patient's information needs, so even minor importance would give it undue weight."),
      rating("imp-030-c", "Which colleague can help Leila obtain the approved large-print version.", "important", "This helps Leila put the response into practice and avoid giving an unapproved or inaccurate substitute.", "It is more than a minor detail because assistance may be needed. It is not the fundamental reason to act: the need for accessible information remains whichever colleague supplies it."),
      rating("imp-030-d", "The patient's expressed preference for large print.", "very_important", "The patient has identified a specific barrier and a preferred form of support. That information should drive the response rather than an assumption about what they need.", "Important would understate the explicit information that makes the proposed adjustment appropriate to this individual."),
    ],
  },
  {
    id: "imp-031", type: "importance", domain: "colleagues_culture_safety", difficulty: "standard",
    stem: "Hugo must give written feedback on a fellow medical student's contribution to a joint teaching project. The instructions ask for specific observations and constructive suggestions. Hugo has worked with the student for three weeks. A friend who was not part of the project has also told Hugo that the student is lazy. Rate the importance of each consideration when Hugo writes the feedback.",
    pivotInsight: "Fair feedback separates observed behaviour from labels and hearsay, while remaining useful to the recipient.",
    gmpRef: colleagues,
    items: [
      rating("imp-031-a", "How to word accurate criticism respectfully so the student can use it.", "important", "Constructive wording improves the usefulness of feedback. Honesty does not require hostile or humiliating language.", "This is more than a minor presentational preference. However, respectful wording cannot compensate for inaccurate content, so the evidence supporting the assessment is the more fundamental consideration."),
      rating("imp-031-b", "Whether Hugo can support his comments with things he personally observed during the project.", "very_important", "The task requires a fair account of this student's contribution. Direct observations give the feedback a sound basis and allow specific examples.", "Important would understate the need for a defensible basis for the assessment itself."),
      rating("imp-031-c", "Whether agreeing with his friend's opinion would make Hugo more popular with that friend.", "not_important", "Personal popularity should not shape another student's assessment.", "There is no legitimate contribution to the feedback decision, so minor importance would still give this motive undue influence."),
      rating("imp-031-d", "Whether the finished feedback uses bullets or short paragraphs, when both meet the instructions and are equally clear.", "minor_importance", "Presentation can be chosen when preparing the feedback, but these two equally clear, permitted formats do not change the assessment or its usefulness.", "It is a small practical choice rather than an important determinant of the content. Not important at all would be too strong for a legitimate but low-impact presentation choice."),
    ],
  },
  {
    id: "imp-032", type: "importance", domain: "knowledge_skills_development", difficulty: "standard",
    stem: "Medical student Amina is preparing for a supervised clinical skills session next week. Her tutor has identified a specific gap in her technique and arranged a practice session using a model, with feedback. Amina is deciding how to prepare. Rate the importance of each consideration.",
    pivotInsight: "Use feedback to choose what to practise, then check improvement rather than equating confidence with competence.",
    gmpRef: students,
    items: [
      rating("imp-032-a", "Whether her classmates would think she looked naturally talented if she did not need to practise.", "not_important", "The appearance of effortless ability is not a sound reason to avoid addressing a known learning need.", "This consideration should not influence the learning decision, rather than simply carrying a small amount of weight."),
      rating("imp-032-b", "Which part of the technique the tutor observed she needs to improve.", "very_important", "This identifies the actual learning need and determines the focus of useful preparation.", "It is central to choosing the practice, not just helpful background information."),
      rating("imp-032-c", "How to schedule preparation around her other required teaching sessions.", "important", "A realistic plan helps Amina attend to the learning need without neglecting other commitments.", "It has a practical effect on whether preparation happens, so minor importance is too low. It does not establish what needs correcting, so it is not the central educational issue."),
      rating("imp-032-d", "Whether she will receive feedback on her technique after practising.", "very_important", "Without checking the result, Amina could repeat the original mistake while becoming more confident. Feedback helps establish whether the specific gap has been addressed.", "This is fundamental to evaluating improvement, rather than an optional convenience that merits only important."),
    ],
  },
  {
    id: "imp-033", type: "importance", domain: "patients_partnership_communication", difficulty: "standard",
    stem: "Medical student Ravi is helping a supervised research team arrange an optional interview study. A patient says they no longer want to attend their interview next week and asks whether this will affect their usual care. The approved participant information says participation is voluntary and declining the interview will not affect care. Ravi is deciding how to respond. Rate each consideration independently.",
    pivotInsight: "Respect the decision about future participation and explain its effect accurately. Do not assume this question also settles what happens to previously collected data.",
    gmpRef: researchParticipation,
    items: [
      rating("imp-033-a", "Whether Ravi would miss his personal recruitment target if the patient declines.", "not_important", "A personal target must not be used to pressure the patient or influence whether their choice is respected.", "Minor importance would still suggest that Ravi's target may legitimately weigh against the patient's voluntary decision."),
      rating("imp-033-b", "The patient's clear wish not to attend the optional interview.", "very_important", "The patient has made a decision about future participation. Respecting that decision is central to the response.", "It is not merely one useful consideration among others; it determines that the interview should not be imposed."),
      rating("imp-033-c", "How the research team should be told, through its approved process, to stop sending interview reminders.", "important", "This helps make the patient's decision effective and avoids unwanted follow-up messages.", "It is more than a minor administrative preference because it prevents further invitations. The logistics support, rather than determine, the underlying voluntary choice."),
      rating("imp-033-d", "Whether the patient understands that declining this interview will not affect their usual care.", "very_important", "The patient has specifically asked about a consequence that might make them feel obliged to participate. Accurate reassurance is essential here and is supported by the stated participant information.", "Important would understate the need to remove the particular pressure or misunderstanding identified in the scenario."),
    ],
  },
  {
    id: "rank-028", type: "ranking", domain: "colleagues_culture_safety", difficulty: "standard",
    stem: "Medical student Nia has been asked to remind the ward doctor that a stable patient needs a routine result reviewed before discharge tomorrow. Nia is about to leave at the end of her placement day. The doctor has not yet acknowledged the task, but a covering doctor is available. Choose the most and least appropriate response.",
    pivotInsight: "A message sent is not necessarily a responsibility accepted. Make the handover explicit.",
    gmpRef: colleagues,
    items: [
      ranked("rank-028-a", "Leave a factual note in the approved task system for the ward doctor and go home without checking whether anyone will pick it up.", 2, "This preserves the outstanding task and uses the correct system, but leaves responsibility unconfirmed. It is less reliable than contacting the available covering doctor and better than falsely reporting completion."),
      ranked("rank-028-b", "Tell the nurse that the result has already been reviewed so she does not have to chase it.", 3, "This is false and could prevent the team from arranging the needed review. It is worse than leaving an accurate, though unconfirmed, handover note."),
      ranked("rank-028-c", "Contact the covering doctor, explain the outstanding task and confirm who will review it before leaving.", 1, "This makes responsibility clear while keeping Nia within her role. It addresses the uncertainty more effectively than leaving a note without acknowledgement."),
    ],
  },
  {
    id: "rank-029", type: "ranking", domain: "colleagues_culture_safety", difficulty: "foundation",
    stem: "Medical student Owen is organising a small-group revision session. Another student, Freya, tells him she uses hearing aids and cannot follow discussion in the noisy cafe he has booked. A quiet university room is available at the same time without extra cost. Freya wants to take part. Choose the most and least appropriate response.",
    pivotInsight: "An available adjustment should enable participation, rather than replacing it with an inferior alternative without discussion.",
    gmpRef: colleagues,
    items: [
      ranked("rank-029-a", "Discuss the quiet room with Freya, move the session there if it meets her needs and let the group know the new location.", 1, "This checks the adjustment with Freya and uses an available way for her to participate. It is better than assuming that written notes are an equivalent substitute."),
      ranked("rank-029-b", "Tell Freya that students with hearing difficulties should avoid group sessions and remove her from the invitation list.", 3, "This excludes her based on an assumption about her disability despite an available adjustment and her wish to attend. It is worse than the limited support of sending notes."),
      ranked("rank-029-c", "Keep the cafe booking and offer to send Freya the group's written notes afterwards.", 2, "The notes provide some support, but Freya still loses the chance to participate in discussion. This is less inclusive than considering the available quiet room, although it does not reject her needs as openly as excluding her from future invitations."),
    ],
  },
  {
    id: "rank-030", type: "ranking", domain: "colleagues_culture_safety", difficulty: "foundation",
    stem: "While preparing a clinic room under supervision, medical student Luan notices an obvious crack in a device's casing and a loose cable. The device has not been used on a patient. He does not know whether it is safe, and a nurse responsible for the room is nearby. A checked replacement is available. Choose the most and least appropriate response.",
    pivotInsight: "Prevent possible harm first, then make sure the concern is communicated so the device is not reused unknowingly.",
    gmpRef: colleagues,
    items: [
      ranked("rank-030-a", "Use the damaged device on the next patient to see whether it still works.", 3, "Testing an uncertain device on a patient creates avoidable risk when a checked replacement is available. Neither of the other responses exposes the next patient in this way."),
      ranked("rank-030-b", "Keep the device out of use, tell the nurse about the damage and ask for it to be dealt with under the clinic's equipment procedure.", 1, "This prevents immediate use and alerts the person who can arrange the correct next steps. It is more reliable than putting the device aside without explanation."),
      ranked("rank-030-c", "Put the device on a spare shelf, use the checked replacement and leave without telling anyone about the damage.", 2, "This avoids using the device for the next patient, but someone else could unknowingly return it to use. It is safer immediately than testing it on a patient but incomplete compared with notifying the nurse."),
    ],
  },
  {
    id: "rank-031", type: "ranking", domain: "trust_professionalism", difficulty: "standard",
    stem: "Medical student Rosa realises she has accidentally emailed an identifiable patient document to the wrong external address while carrying out an authorised administrative task. Her supervisor is available. The hospital has a process for reporting information-security incidents. Rosa cannot tell whether the recipient has opened the email. Choose the most and least appropriate response.",
    pivotInsight: "An attempt to retrieve information does not remove the need to report a disclosure and obtain help.",
    gmpRef: honesty,
    items: [
      ranked("rank-031-a", "Ask the recipient to delete the email, but decide not to tell anyone at the hospital unless the recipient refuses.", 2, "Seeking deletion may limit the disclosure, but it cannot confirm that no copy remains and it does not replace the reporting process. This is better than concealment without any containment attempt, but less complete than promptly involving the hospital."),
      ranked("rank-031-b", "Inform her supervisor promptly, follow the hospital's reporting process and seek help to limit the disclosure.", 1, "This enables an appropriate response while Rosa is honest about what happened and what is unknown. It is better than privately seeking deletion and assuming that solves the incident."),
      ranked("rank-031-c", "Delete the message from her sent folder and say nothing so there is no visible record of her mistake.", 3, "This hides the incident without withdrawing the recipient's copy or enabling a response. It is worse than a limited attempt to contain the disclosure."),
    ],
  },
];
