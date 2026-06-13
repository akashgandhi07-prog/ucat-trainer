# VR Passages: Output format

## Explanation formatting (required)

Use **line breaks between evidence points** per question. **No em dash or en dash** (`—` `–`). UK English spelling throughout (organise, colour, centre, behaviour, analyse, defence). See `_shared-explanation-formatting.md`.

---

## 1. What This Trainer Teaches

Students learn to read passages efficiently and answer UCAT Verbal Reasoning questions accurately. Each generated item is a complete passage set: one passage plus four questions, replicating the real UCAT VR format.

Question formats covered:

- **True / False / Can't tell** (`tfct`): is the statement directly supported, directly contradicted, or not addressed?
- **4-option multiple choice** (`mc4`): comparative reasoning across four statements. Three sub-styles via `questionCategory`:
  - `standard`: "Which of the following is best supported by the passage?"
  - `author-opinion`: "Which of the following best reflects the author's view?" (requires the passage to carry a discernible authorial stance in at least one place)
  - `not-except`: "Which of the following is NOT supported by the passage?" (three supported statements, one unsupported)

## 2. Passage Requirements

- **260 to 400 words.** This is the exam-realism band; passages under 260 words will be rejected by the structural validator.
- Self-contained: answerable without outside knowledge.
- Categories (use exactly one per passage): `Science`, `History`, `Ethics`, `Society`, `Environment`, `Culture`, `Health`, `Economics`.
- Vary structure: some passages state facts directly, some use hedged or qualified language, some present conflicting viewpoints. At least one paragraph should carry hedged language (suggests, may, some researchers argue) so Can't tell questions have honest material.
- At least 5 distinct pieces of information that can each support a question.
- Multi-paragraph (3 to 4 paragraphs), plain prose, no headings or bullet lists inside the passage.
- No em or en dashes anywhere. UK English.

## 3. Question Mix Per Passage (exactly 4 questions)

Default mix:
- 2 x `tfct` (one True or False with explicit evidence; one Can't tell where the statement is plausible but unaddressed)
- 1 x `mc4` with `questionCategory` `standard` or `author-opinion`
- 1 x `tfct` or `mc4` with `questionCategory` `not-except`

Avoid making every tfct answer Can't tell, and avoid all-True sets. Across a batch, vary which slot holds the mc4 questions.

## 4. Difficulty Calibration

We need a deliberately fat hard tier: when asked for `hard`, do not soften.

- **easy**: evidence is a single explicit sentence; statement paraphrases lightly.
- **medium**: evidence requires combining two sentences or resisting one named trap (scope, qualifier, causation).
- **hard**: dense passage prose; the statement is a close paraphrase that fails on one precise word (overclaim, reversed causation, wrong subject); Can't tell items sit next to near-miss evidence; mc4 distractors each fail for a different named reason.

## 5. Our Explanation Style

Do NOT just state the verdict. Every verdict must be traceable to specific passage text.

Structure per question:
1. State the verdict (True / False / Can't tell, or the correct option letter text).
2. Quote or closely paraphrase the key sentence(s) that decide it.
3. For Can't tell: state what the passage does say and why it does not go far enough.
4. For False: state exactly what the passage says that contradicts the statement.
5. Name the trap when relevant ("Students who chose True were relying on general knowledge; the passage never states this").
6. For mc4: one line per wrong option explaining the specific failure (overclaim, not stated, contradicts paragraph 2, wrong subject).

## 6. What Makes A Good Question

- Statement wording differs from the passage (paraphrase, not copy-paste) so it tests comprehension, not phrase matching.
- Wrong answers include: plausible-but-absent content (Can't tell trap), partial matches that overclaim, and fact mix-ups between two parts of the passage.
- not-except questions: the three supported statements must each trace to different parts of the passage; the unsupported one must be tempting (plausible from general knowledge or a subtle distortion), never absurd.
- author-opinion questions: only where the passage genuinely signals a stance (evaluative language, a concluding judgement); distractors are views the passage reports from others, or overstated versions of the author's actual position.

## 7. Hidden verification fields

Required on every item, stripped before students see them:
- `solutionFormula`: one line naming the decisive evidence per question, e.g. "Q1 True para 2 sentence 3; Q2 CT plausible but unaddressed; Q3 option B para 1; Q4 except option C overclaim".
- `computedAnswer`: the four keyed answers joined, e.g. "True | Can't tell | B | C".
- `distractorLogic`: for each mc4, one line per wrong option naming its failure mode.

## 8. JSON Schema

Return one object per passage set. All fields required unless marked optional.

```json
{
  "id": "vr-passage-001",
  "trainerType": "vr-passages",
  "difficulty": "hard",
  "skill_tag": "science",
  "title": "The Limits of Peer Review",
  "category": "Science",
  "passage": "Three to four paragraphs of 260 to 400 words total...",
  "questions": [
    {
      "type": "tfct",
      "questionCategory": "standard",
      "statement": "Paraphrased claim to judge.",
      "answer": "True",
      "explanation": "True.\n\nParagraph 2 states that ...\n\nTrap: ..."
    },
    {
      "type": "tfct",
      "questionCategory": "standard",
      "statement": "Plausible but unaddressed claim.",
      "answer": "Can't tell",
      "explanation": "Can't tell.\n\nThe passage says ... but never addresses ..."
    },
    {
      "type": "mc4",
      "questionCategory": "author-opinion",
      "stem": "Which of the following best reflects the author's view?",
      "options": ["Option text A", "Option text B", "Option text C", "Option text D"],
      "answer": "Option text B",
      "explanation": "B.\n\nThe author's concluding judgement is ...\n\nA: reported view of critics, not the author.\nC: overclaims the author's hedged position.\nD: contradicts paragraph 3."
    },
    {
      "type": "mc4",
      "questionCategory": "not-except",
      "stem": "Which of the following is NOT supported by the passage?",
      "options": ["Option text A", "Option text B", "Option text C", "Option text D"],
      "answer": "Option text C",
      "explanation": "C.\n\nA: supported by paragraph 1 ...\nB: supported by paragraph 2 ...\nC: the passage never states this; it is a general-knowledge trap.\nD: supported by paragraph 4 ..."
    }
  ],
  "solutionFormula": "Q1 True para 2; Q2 CT unaddressed; Q3 B author conclusion; Q4 except C not stated",
  "computedAnswer": "True | Can't tell | B | C",
  "distractorLogic": "Q3: A reported-view, C overclaim, D contradiction. Q4: A para 1, B para 2, D para 4 all supported."
}
```

`answer` for `tfct` must be exactly `True`, `False`, or `Can't tell`. `answer` for `mc4` must exactly match one entry in `options`.

## 9. Self-Check Before Finalising Any Question

For each passage set, verify before returning:
- Passage is 260 to 400 words, UK English, no em or en dashes, no headings.
- Exactly 4 questions; the mix follows section 3.
- Every tfct answer is defensible from the passage alone; re-read the decisive sentence and confirm True is not actually Can't tell (the most common error).
- Every mc4 has exactly one defensible answer; each wrong option fails for a distinct named reason recorded in distractorLogic.
- not-except: confirm each of the three supported options traces to a different passage sentence; confirm the unsupported one appears nowhere in the passage.
- Explanations quote or closely paraphrase the deciding evidence and use line breaks between evidence points.
- No statement copies a passage sentence verbatim.
- solutionFormula, computedAnswer, and the keyed answers all agree.
