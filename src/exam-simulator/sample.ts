import { bankSchema } from "./model";
const opts = (texts: string[]) =>
  texts.map((text, i) => ({ id: String.fromCharCode(65 + i), text }));
export const sample = bankSchema.parse({
  title: "TheUKCATPeople Interaction Demo",
  sections: [
    {
      id: "VR",
      name: "Verbal Reasoning",
      durationSeconds: 1320,
      questions: [
        {
          id: "vr1",
          type: "choice",
          layout: "split",
          passage:
            "A community library extended its opening hours for a six-month trial. Evening visits increased, while morning visits remained stable. The library also introduced a weekly repair workshop.\n\nA survey of workshop attendees found that most had not previously visited the library. The survey did not ask whether attendees borrowed books. The council will review the costs before deciding whether to retain the extended hours.",
          prompt: "Which statement is supported by the passage?",
          options: opts([
            "Morning visits declined.",
            "The extended hours are permanent.",
            "Most workshop attendees were new visitors.",
            "All workshop attendees borrowed books.",
          ]),
          correctAnswer: { choice: "C" },
          explanation:
            "The passage states that most workshop attendees had not previously visited the library.",
        },
        {
          id: "vr2",
          type: "choice",
          layout: "split",
          passage:
            "During a trial, a library extended its opening hours. Evening visits increased, while morning visits remained stable. The council has not yet decided whether to retain the new hours.",
          prompt:
            "The extended opening hours reduced the library’s running costs.",
          options: opts(["True", "False", "Cannot tell"]),
          correctAnswer: { choice: "C" },
          explanation:
            "The passage reports changes in visits but gives no information about running costs.",
        },
      ],
    },
    {
      id: "DM",
      name: "Decision Making",
      durationSeconds: 2220,
      questions: [
        {
          id: "dm1",
          type: "yes-no",
          passage:
            "All cedar trees in a park are labelled. Some labelled trees are beside the lake. No trees beside the lake are newly planted.",
          prompt:
            "Place “Yes” if the conclusion follows. Place “No” if it does not follow.",
          statements: [
            "All cedar trees are labelled.",
            "All labelled trees are cedars.",
            "Some labelled trees are not newly planted.",
            "Every cedar is beside the lake.",
            "No newly planted tree is beside the lake.",
          ],
          correctAnswer: {
            "0": "Yes",
            "1": "No",
            "2": "Yes",
            "3": "No",
            "4": "Yes",
          },
          explanation:
            "Use only the stated set relationships. The lake-side trees cannot be newly planted, but labelled trees are not necessarily cedars and cedars are not necessarily beside the lake.",
        },
        {
          id: "dm2",
          type: "choice",
          prompt:
            "A shuttle leaves every 20 minutes, starting at 09:00. The journey takes 15 minutes. You reach the stop at 09:06. When can you first arrive?",
          options: opts(["09:15", "09:21", "09:35", "09:40"]),
          correctAnswer: { choice: "C" },
          explanation:
            "After arriving at 09:06, the next shuttle is at 09:20. Adding the 15-minute journey gives 09:35.",
        },
      ],
    },
    {
      id: "QR",
      name: "Quantitative Reasoning",
      durationSeconds: 1560,
      questions: [
        {
          id: "qr1",
          type: "choice",
          passage: "The table shows tickets sold at a community cinema.",
          table: {
            headers: ["Day", "Adult (£8)", "Child (£5)"],
            rows: [
              ["Friday", "40", "20"],
              ["Saturday", "60", "30"],
              ["Sunday", "50", "40"],
            ],
          },
          prompt: "What was the total ticket revenue on Saturday?",
          options: opts(["£480", "£550", "£600", "£630", "£720"]),
          correctAnswer: { choice: "D" },
          explanation:
            "Saturday revenue is (60 × £8) + (30 × £5) = £480 + £150 = £630.",
        },
      ],
    },
    {
      id: "SJT",
      name: "Situational Judgement",
      durationSeconds: 1560,
      questions: [
        {
          id: "sjt1",
          type: "choice",
          layout: "split",
          passage:
            "A student notices that a colleague has left a computer showing patient information unlocked in a public area.\n\nHow appropriate is the following action?",
          prompt:
            "Secure the computer promptly and remind the colleague about confidentiality.",
          options: opts([
            "A very appropriate thing to do",
            "Appropriate, but not ideal",
            "Inappropriate, but not awful",
            "A very inappropriate thing to do",
          ]),
          correctAnswer: { choice: "A" },
          explanation:
            "Securing confidential information immediately protects patients, and a respectful reminder addresses the cause proportionately.",
        },
        {
          id: "sjt2",
          type: "choice",
          layout: "split",
          passage:
            "A student is asked to perform an unfamiliar task without supervision.\n\nHow important is this consideration when deciding what to do?",
          prompt:
            "Whether the student has the skills to perform the task safely.",
          options: opts([
            "Very important",
            "Important",
            "Of minor importance",
            "Not important at all",
          ]),
          correctAnswer: { choice: "A" },
          explanation:
            "Patient safety comes first, so competence to perform the task safely is a very important consideration.",
        },
        {
          id: "sjt3",
          type: "most-least",
          passage:
            "A student realises they have recorded the wrong appointment time for a patient. The error can still be corrected.",
          prompt:
            "Choose both the most appropriate and least appropriate actions.",
          options: opts([
            "Tell the supervisor promptly and help correct the record.",
            "Ignore the error and hope nobody notices.",
            "Ask a colleague how to report the error.",
          ]),
          correctAnswer: { most: "A", least: "B" },
          explanation:
            "Promptly escalating and correcting the record is open and protects the patient. Ignoring a known error is the least appropriate response.",
        },
      ],
    },
  ],
});
