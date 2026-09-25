# SJT expansion review, 22 September 2026

## Status and scope

12 original editorial drafts, comprising 44 response items: four appropriateness scenarios, four importance scenarios and four most/least scenarios. They supplement the 86 scenarios in the current local editorial source. The live Question Lab can contain additional or edited rows; 86 is not a verified production count.

**Not published. Not added to the production seed. Not official UCAT questions or a GMC-endorsed answer key.** Import files create reviewable drafts using the existing Question Lab workflow. The authoring source is `scripts/sjtQuestions.september2026.ts`; `QUESTIONS.md` is a readable review copy. Running `npm run export:sjt-expansion` regenerates the three JSON files and review copy without making database calls.

The four passes below were performed by the same assistant using different checks. They are not four independent expert reviews. GMC guidance supports the principles, but does not certify the exact category assigned to an original response. A UCAT tutor should adjudicate the keys before activating these drafts, especially the middle ratings. No clinician sign-off is recorded.

## Pass 1: authoritative source and role check

Checked current official sources on 22 September 2026 and checked them again on 24 September 2026. New questions avoid diagnostic knowledge, treatment instructions and jurisdiction-specific capacity rules. They specify the student's role, the immediate decision and relevant availability of help. Research withdrawal concerns a future optional interview only, not legal rights concerning previously collected data.

| Scenarios | Source and relevant section |
|---|---|
| app-031 | [GMC confidentiality guidance: disclosing for education and training](https://www.gmc-uk.org/professional-standards/the-professional-standards/confidentiality---disclosing-for-education-and-training-purposes/disclosing-for-education-and-training-purposes): patients must be free to refuse teaching participation without pressure or an implication that care depends on consent |
| app-032 | [GMC anonymising reflective notes](https://www.gmc-uk.org/education/standards-guidance-and-curricula/guidance/reflective-practice/the-reflective-practitioner---supplementary-guidance-for-medical-students/anonymising-reflective-notes): combinations of details can identify a person |
| app-033 | [GMP domain 4](https://www.gmc-uk.org/professional-standards/the-professional-standards/good-medical-practice/domain-4-trust-and-professionalism), paragraphs 88 and 89: truthful, accurate communication |
| app-034, imp-031, rank-029 | [GMP domain 3](https://www.gmc-uk.org/professional-standards/the-professional-standards/good-medical-practice/domain-3-colleagues-culture-and-safety), paragraphs 48 to 58 and 62: respectful teamwork and fair assessment |
| imp-030 | GMP domain 2, paragraphs 28 to 34: usable information and individual communication needs |
| imp-032 | [Achieving good medical practice: medical students](https://www.gmc-uk.org/-/media/documents/agmp-2024-for-medical-students-english_pdf-108649541.pdf), domain 1: competence, learning and feedback |
| imp-033 | [GMC Good practice in research](https://www.gmc-uk.org/professional-standards/the-professional-standards/good-practice-in-research/good-practice-in-research), paragraphs 38 to 41: the right to decline or withdraw and no effect on the relationship with the usual care team |
| rank-028 | GMP domain 3, paragraph 65: transfer of information and responsibility |
| rank-030 | GMP domain 3, paragraphs 73 and 75: equipment concerns and protecting patients |
| rank-031 | [GMP domain 4](https://www.gmc-uk.org/professional-standards/the-professional-standards/good-medical-practice/domain-4-trust-and-professionalism), paragraphs 81, 88 and 89, plus the stated hospital reporting process: confidentiality, honesty and accurate communication |

Format/scoring cross-check: [current UCAT test format and scoring](https://www.ucat.ac.uk/about-ucat/test-format-and-scoring/) and [official preparation tutorials](https://www.ucat.ac.uk/prepare/question-tutorials/). The current UCAT is four subtests. Public scoring guidance confirms partial credit for close SJT responses; it does not validate this app's particular half-mark algorithm or convert this draft bank into an official band predictor. Historical [official response guidance](https://www.ucat.ac.uk/uploads/ukcat-guides/2017/files/basic-html/page30.html) explicitly describes independent rating. Current authoring should continue to be calibrated with the current official practice material.

## Pass 2: keyed answer and boundary check

Every rating item has a rationale and `whyNotAdjacent`. Middle-category explanations consider both neighbouring categories. Several actions deliberately share very appropriate: categories are not a forced distribution. Ranking scenarios have three distinct responses with both pairwise comparisons explained.

Proposed keys below are in displayed item order, a to d or a to c. VA/A/I/VI are appropriateness; VImp/Imp/Minor/None are importance; numbers are ranks.

| ID | Topic | Proposed keys | Adjudication focus |
|---|---|---|---|
| app-031 | Declining student observation | I, VA, VI, VA | Asking again for the student's benefit versus falsely making observation compulsory |
| app-032 | Identifiability in reflection | VA, VI, I, VA | Secure unsubmitted draft versus disclosure to an unauthorised group |
| app-033 | Missing audit evidence | VA, VA, VI, VA | An unknown result cannot be reported as an observed finding |
| app-034 | Supporting a discouraged peer | I, I, VA, VI | Reassurance used to close down a request to talk versus open dismissal versus public disclosure |
| imp-030 | Accessible patient information | VImp, None, Imp, VImp | Practical help obtaining the format versus the need for usable information |
| imp-031 | Fair peer feedback | Imp, VImp, None, Minor | Constructive wording and harmless format choice; do not rate by a predetermined quota |
| imp-032 | Responding to learning needs | None, VImp, Imp, VImp | Feedback and assessment of improvement without requiring immediate patient danger |
| imp-033 | Optional research participation | None, VImp, Imp, VImp | Declining an upcoming interview, not deciding the fate of existing data |
| rank-028 | Confirmed handover | 2, 3, 1 | Accurate note without acknowledgement versus false completion |
| rank-029 | Inclusive group learning | 1, 3, 2 | Available adjustment versus notes alone versus exclusion |
| rank-030 | Damaged equipment | 3, 1, 2 | Prevent reuse and communicate; do not test uncertain equipment on a patient |
| rank-031 | Misdirected patient email | 2, 1, 3 | Seeking deletion alone does not substitute for reporting |

## Pass 3: challenge and consistency review

- Challenged whether a reasonable alternative reading would move a key. Removed an audit item about silently excluding records because deliberate omission introduced an avoidable severity dispute. Replaced it with a clear, constructive response to the proposed guess.
- Specified that the reflective draft is on an approved secure system and not submitted. This distinguishes retaining excessive detail from deliberately sharing it outside that system.
- Specified an optional, understood student-observation request and a clear refusal; no urgency or clinical dependency is implied.
- Specified no immediate safety concern in the peer-support scenario. No promise to keep imminent danger secret is suggested.
- Specified that the handover concerns a stable patient and a result due before tomorrow's discharge; no specialist judgement about urgent results is required.
- Checked response order rather than putting the best option first in every ranking question.
- Checked exact duplicates and compared stem-token similarity against the 86 local scenarios. Highest nearest-neighbour Jaccard similarity was approximately 0.14. This is a basic duplication screen, not proof of originality or educational breadth.
- All four GMC domain tags are represented. This is a small foundation/standard batch; difficult questions should be added through explicit adjudication, not by making the stem vague.

## Pass 4: automated integrity and import check

`npm run verify:sjt` validates the existing source plus these drafts for IDs, distinct response text, required fields, domains, difficulty, rating scales and unique ranks. It permits repeated ratings. New drafts require HTTPS GMC references, boundary explanations and compliant punctuation.

Round-trip checks call the actual Question Lab mapper and compare keys, rationales and scenario references with the source. Export-freshness checks detect stale JSON. Mutation tests verify rejection of duplicate IDs, invalid rating scales, duplicate ranks and malformed items. Structural success is explicitly not a professional-judgement certificate.

The app's importer previously discarded scenario-level `gmpRef`. That has been fixed locally. Deploy that fix before importing, so the source references survive. CI now runs the SJT integrity gate.

## Pass 5: 24 September key challenge

Re-read all 12 stems and all 44 responses against the official UCAT category definitions and current GMC sources. The review specifically challenged every middle category, every use of "very", and every rank-2 response. No answer key or ranking changed. The distinctions remain explicit in the stems and rationales, including secure draft versus wider disclosure, incomplete reassurance versus dismissal, operational detail versus a vital consideration, and partial containment versus formal incident reporting.

Three scenario references were made more precise: app-031 now cites the GMC teaching-disclosure guidance, imp-033 cites research paragraphs 38 to 41, and rank-031 cites the confidentiality and honesty provisions in domain 4. The audit reference no longer includes research paragraph 85. These were citation improvements, not changes to the proposed answers.

## Import and publication

1. Run `npm run export:sjt-expansion` and `npm run verify:sjt`.
2. Deploy the importer fix before using the live Question Lab.
3. Select the matching trainer and import its complete JSON file: `appropriateness.json`, `importance.json` or `ranking.json`.
4. Confirm the preview contains four scenarios, the expected IDs and source references. Existing admin import creates drafts; do not label them expert-approved based on structural checks.
5. Have the tutor review the full stem and every response without assuming the proposed keys are correct. Record decisions and any revised boundaries, then activate accepted scenarios.
6. Check one accepted scenario from each trainer in a guest session and monitor answer disputes after release.

Do not run `seed:sjt` to deploy this batch. That command updates the older table and only updates already-existing live-table rows; it does not insert these new scenarios into `trainer_questions`.
