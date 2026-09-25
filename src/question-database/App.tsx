import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Copy,
  Database,
  Download,
  FileUp,
  Plus,
  Save,
  Search,
  Trash2,
} from "lucide-react";
import {
  bankSchema,
  complete,
  type Bank,
  type Question,
} from "../exam-simulator/model";
import { fullShell } from "../exam-simulator/fullShell";

const storageKey = "ucat-local-question-database-v1";
const sectionNames = {
  VR: "Verbal Reasoning",
  DM: "Decision Making",
  QR: "Quantitative Reasoning",
  SJT: "Situational Judgement",
} as const;
type SectionId = keyof typeof sectionNames;
type Status = NonNullable<Question["editorial"]>["status"];
const statuses: Status[] = [
  "draft",
  "in-review",
  "approved",
  "changes-requested",
];
const blankOptionIds = ["A", "B", "C", "D"];

function starterBank(): Bank {
  return structuredClone(fullShell);
}
function download(name: string, content: string, type = "application/json") {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([content], { type }));
  link.download = name;
  link.click();
  URL.revokeObjectURL(link.href);
}
function csvCell(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}
function normalise(q: Question): Question {
  return {
    ...q,
    editorial: q.editorial ?? { status: "draft", tags: [] },
  };
}
function newQuestion(section: SectionId, ids: Set<string>): Question {
  let number = 1;
  while (ids.has(`${section.toLowerCase()}-${number}`)) number += 1;
  return normalise({
    id: `${section.toLowerCase()}-${number}`,
    type: "choice",
    layout: section === "VR" || section === "SJT" ? "split" : "full",
    passage: "",
    prompt: "New question",
    options: blankOptionIds.map((id) => ({ id, text: "" })),
    editorial: {
      status: "draft",
      tags: [],
      updatedAt: new Date().toISOString(),
    },
  });
}

export default function App() {
  const [bank, setBank] = useState<Bank>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? bankSchema.parse(JSON.parse(stored)) : starterBank();
    } catch {
      return starterBank();
    }
  });
  const [selectedId, setSelectedId] = useState(
    bank.sections[0]?.questions[0]?.id ?? "",
  );
  const [sectionFilter, setSectionFilter] = useState<"all" | SectionId>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | Status>("all");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"questions" | "reports">("questions");
  const [notice, setNotice] = useState(
    "Changes save automatically in this browser.",
  );
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(bank));
      setNotice("All changes saved locally.");
    } catch {
      setNotice(
        "Autosave failed. Export the bank now to avoid losing changes.",
      );
    }
  }, [bank]);

  const rows = useMemo(
    () =>
      bank.sections.flatMap((section) =>
        section.questions.map((question) => ({
          section,
          question: normalise(question),
        })),
      ),
    [bank],
  );
  const filtered = rows.filter(({ section, question }) => {
    const haystack =
      `${question.id} ${question.prompt} ${question.passage ?? ""} ${(question.editorial?.tags ?? []).join(" ")}`.toLowerCase();
    return (
      (sectionFilter === "all" || section.id === sectionFilter) &&
      (statusFilter === "all" || question.editorial?.status === statusFilter) &&
      (!query || haystack.includes(query.toLowerCase()))
    );
  });
  const selected = rows.find(({ question }) => question.id === selectedId);
  const validation = bankSchema.safeParse(bank);
  const issuesById = new Map<string, string[]>();
  if (!validation.success) {
    validation.error.issues.forEach((issue) => {
      const questionIndex = issue.path.indexOf("questions");
      const sectionIndex = Number(issue.path[1]);
      const index =
        questionIndex >= 0 ? Number(issue.path[questionIndex + 1]) : -1;
      const id = bank.sections[sectionIndex]?.questions[index]?.id ?? "bank";
      issuesById.set(id, [...(issuesById.get(id) ?? []), issue.message]);
    });
  }

  function updateQuestion(id: string, next: Question) {
    if (next.id !== id) setSelectedId(next.id);
    setBank((old) => ({
      ...old,
      sections: old.sections.map((section) => ({
        ...section,
        questions: section.questions.map((q) =>
          q.id === id
            ? {
                ...next,
                editorial: {
                  ...next.editorial,
                  updatedAt: new Date().toISOString(),
                } as Question["editorial"],
              }
            : q,
        ),
      })),
    }));
  }
  function addQuestion() {
    const section = sectionFilter === "all" ? "VR" : sectionFilter;
    const question = newQuestion(
      section,
      new Set(rows.map((row) => row.question.id)),
    );
    setBank((old) => ({
      ...old,
      sections: old.sections.map((s) =>
        s.id === section ? { ...s, questions: [...s.questions, question] } : s,
      ),
    }));
    setSelectedId(question.id);
    setView("questions");
  }
  function duplicateQuestion() {
    if (!selected) return;
    const copy = newQuestion(
      selected.section.id,
      new Set(rows.map((row) => row.question.id)),
    );
    const next = {
      ...structuredClone(selected.question),
      id: copy.id,
      editorial: {
        ...selected.question.editorial,
        status: "draft" as const,
        tags: selected.question.editorial?.tags ?? [],
        updatedAt: new Date().toISOString(),
      },
    };
    setBank((old) => ({
      ...old,
      sections: old.sections.map((s) =>
        s.id === selected.section.id
          ? { ...s, questions: [...s.questions, next] }
          : s,
      ),
    }));
    setSelectedId(next.id);
  }
  function removeQuestion() {
    if (
      !selected ||
      !window.confirm(
        `Remove ${selected.question.id} from this local bank? Export a backup first if needed.`,
      )
    )
      return;
    setBank((old) => ({
      ...old,
      sections: old.sections.map((s) => ({
        ...s,
        questions: s.questions.filter((q) => q.id !== selected.question.id),
      })),
    }));
    setSelectedId(
      rows.find((row) => row.question.id !== selected.question.id)?.question
        .id ?? "",
    );
  }
  async function importBank(file?: File) {
    if (!file) return;
    try {
      if (file.size > 10_000_000)
        throw new Error("Maximum file size is 10 MB.");
      const parsed = bankSchema.parse(JSON.parse(await file.text()));
      setBank(parsed);
      setSelectedId(parsed.sections[0].questions[0].id);
      setNotice(
        `Imported ${parsed.sections.reduce((sum, s) => sum + s.questions.length, 0)} questions.`,
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? `Import failed: ${error.message}`
          : "Import failed.",
      );
    }
  }
  function exportCsv() {
    const header = [
      "id",
      "section",
      "type",
      "status",
      "difficulty",
      "tags",
      "author",
      "reviewer",
      "prompt",
      "valid",
    ];
    const lines = rows.map(({ section, question }) =>
      [
        question.id,
        section.id,
        question.type,
        question.editorial?.status ?? "draft",
        question.editorial?.difficulty ?? "",
        (question.editorial?.tags ?? []).join(";"),
        question.editorial?.author ?? "",
        question.editorial?.reviewer ?? "",
        question.prompt,
        issuesById.has(question.id) ? "no" : "yes",
      ]
        .map(csvCell)
        .join(","),
    );
    download(
      "ucat-question-report.csv",
      [header.map(csvCell).join(","), ...lines].join("\n"),
      "text/csv",
    );
  }
  function exportApproved() {
    const approved: Bank = {
      ...bank,
      title: `${bank.title}: approved`,
      sections: bank.sections
        .map((section) => ({
          ...section,
          questions: section.questions.filter(
            (question) => question.editorial?.status === "approved",
          ),
        }))
        .filter((section) => section.questions.length > 0),
    };
    const result = bankSchema.safeParse(approved);
    if (!result.success) {
      setNotice(
        approved.sections.length === 0
          ? "No approved questions are ready to export."
          : "Approved export is blocked by a validation issue.",
      );
      return;
    }
    download(
      "ucat-approved-question-bank.json",
      JSON.stringify(result.data, null, 2),
    );
    setNotice(
      `Exported ${result.data.sections.reduce((sum, section) => sum + section.questions.length, 0)} approved question(s).`,
    );
  }

  const counts = statuses.map((status) => ({
    status,
    count: rows.filter((row) => row.question.editorial?.status === status)
      .length,
  }));
  const approval = rows.length
    ? Math.round(
        (counts.find((x) => x.status === "approved")!.count / rows.length) *
          100,
      )
    : 0;

  return (
    <div className="database-app">
      <header>
        <div>
          <Database />
          <div>
            <h1>UCAT Question Database</h1>
            <p>Local tutor authoring and review workspace</p>
          </div>
        </div>
        <nav>
          <button
            className={view === "questions" ? "active" : ""}
            onClick={() => setView("questions")}
          >
            Questions
          </button>
          <button
            className={view === "reports" ? "active" : ""}
            onClick={() => setView("reports")}
          >
            <BarChart3 /> Reports
          </button>
          <a href="/exam-simulator.html" target="_blank">
            Open simulator ↗
          </a>
        </nav>
      </header>
      <div className="toolbar">
        <button className="primary" onClick={addQuestion}>
          <Plus /> New question
        </button>
        <button
          onClick={() =>
            download("ucat-question-bank.json", JSON.stringify(bank, null, 2))
          }
        >
          <Download /> Export bank
        </button>
        <button onClick={exportApproved}>
          <CheckCircle2 /> Export approved
        </button>
        <button onClick={exportCsv}>
          <Download /> Export report
        </button>
        <button onClick={() => fileRef.current?.click()}>
          <FileUp /> Import bank
        </button>
        <input
          ref={fileRef}
          hidden
          type="file"
          accept=".json,application/json"
          onChange={(e) => {
            void importBank(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <span className={validation.success ? "valid" : "invalid"}>
          {validation.success ? <CheckCircle2 /> : <AlertTriangle />}
          {validation.success
            ? "Bank valid"
            : `${validation.error.issues.length} validation issue(s)`}
        </span>
      </div>
      {view === "reports" ? (
        <main className="reports">
          <section className="report-hero">
            <div>
              <strong>{rows.length}</strong>
              <span>Total questions</span>
            </div>
            <div>
              <strong>{approval}%</strong>
              <span>Approved</span>
            </div>
            <div>
              <strong>{issuesById.size}</strong>
              <span>Questions with issues</span>
            </div>
            <div>
              <strong>
                {
                  new Set(rows.flatMap((r) => r.question.editorial?.tags ?? []))
                    .size
                }
              </strong>
              <span>Tags</span>
            </div>
          </section>
          <section className="report-grid">
            <article>
              <h2>Review workflow</h2>
              {counts.map(({ status, count }) => (
                <div className="metric" key={status}>
                  <span>{status}</span>
                  <progress max={Math.max(rows.length, 1)} value={count} />
                  <b>{count}</b>
                </div>
              ))}
            </article>
            <article>
              <h2>Section coverage</h2>
              {bank.sections.map((section) => (
                <div className="metric" key={section.id}>
                  <span>{section.name}</span>
                  <progress max={100} value={section.questions.length} />
                  <b>{section.questions.length}</b>
                </div>
              ))}
            </article>
            <article>
              <h2>Quality checks</h2>
              <p>
                {validation.success
                  ? "Every question passes the simulator bank schema."
                  : "Open affected questions and resolve the listed validation messages."}
              </p>
              {[...issuesById].slice(0, 10).map(([id, messages]) => (
                <button
                  className="issue-link"
                  key={id}
                  onClick={() => {
                    setSelectedId(id);
                    setView("questions");
                  }}
                >
                  {id}: {messages.join("; ")}
                </button>
              ))}
            </article>
            <article>
              <h2>Difficulty mix</h2>
              {["easy", "medium", "hard", "unrated"].map((difficulty) => (
                <div className="metric" key={difficulty}>
                  <span>{difficulty}</span>
                  <progress
                    max={Math.max(rows.length, 1)}
                    value={
                      rows.filter(
                        (r) =>
                          (r.question.editorial?.difficulty ?? "unrated") ===
                          difficulty,
                      ).length
                    }
                  />
                  <b>
                    {
                      rows.filter(
                        (r) =>
                          (r.question.editorial?.difficulty ?? "unrated") ===
                          difficulty,
                      ).length
                    }
                  </b>
                </div>
              ))}
            </article>
          </section>
        </main>
      ) : (
        <main className="workspace">
          <aside>
            <div className="filters">
              <label>
                <Search />
                <input
                  aria-label="Search questions"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search questions…"
                />
              </label>
              <select
                aria-label="Filter section"
                value={sectionFilter}
                onChange={(e) =>
                  setSectionFilter(e.target.value as typeof sectionFilter)
                }
              >
                <option value="all">All sections</option>
                {Object.entries(sectionNames).map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
              <select
                aria-label="Filter status"
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as typeof statusFilter)
                }
              >
                <option value="all">All statuses</option>
                {statuses.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </div>
            <div className="question-list">
              <p>
                {filtered.length} of {rows.length} questions
              </p>
              {filtered.map(({ section, question }) => (
                <button
                  className={question.id === selectedId ? "selected" : ""}
                  key={question.id}
                  onClick={() => setSelectedId(question.id)}
                >
                  <span>
                    <b>{question.id}</b>
                    <small>
                      {section.id} · {question.type}
                    </small>
                  </span>
                  <span
                    className={`status ${question.editorial?.status ?? "draft"}`}
                  >
                    {question.editorial?.status ?? "draft"}
                  </span>
                  {issuesById.has(question.id) && (
                    <AlertTriangle className="warning" />
                  )}
                </button>
              ))}
            </div>
          </aside>
          {selected ? (
            <QuestionEditor
              key={selected.question.id}
              question={selected.question}
              section={selected.section.id}
              issues={issuesById.get(selected.question.id) ?? []}
              onChange={(next) => updateQuestion(selected.question.id, next)}
              onDuplicate={duplicateQuestion}
              onRemove={removeQuestion}
            />
          ) : (
            <section className="empty">Select or create a question.</section>
          )}
        </main>
      )}
      <footer>
        <Save /> {notice}
        <span>{bank.title}</span>
      </footer>
    </div>
  );
}

function QuestionEditor({
  question,
  section,
  issues,
  onChange,
  onDuplicate,
  onRemove,
}: {
  question: Question;
  section: SectionId;
  issues: string[];
  onChange: (q: Question) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const q = normalise(question);
  const patch = (next: Partial<Question>) => onChange({ ...q, ...next });
  const options = q.options ?? blankOptionIds.map((id) => ({ id, text: "" }));
  const answer = q.correctAnswer ?? {};
  const approvalReady =
    !!q.correctAnswer &&
    complete(q, q.correctAnswer) &&
    !!q.explanation?.trim() &&
    (q.type === "yes-no" ||
      Object.values(q.correctAnswer).every((value) =>
        options.some((option) => option.id === value),
      ));
  const setEditorial = (next: Partial<NonNullable<Question["editorial"]>>) =>
    patch({
      editorial: { status: "draft", tags: [], ...q.editorial, ...next },
    });
  const setType = (type: Question["type"]) =>
    patch(
      type === "yes-no"
        ? {
            type,
            options: undefined,
            statements: Array.from(
              { length: 5 },
              (_, i) => q.statements?.[i] ?? "",
            ),
            correctAnswer: undefined,
          }
        : { type, statements: undefined, options, correctAnswer: undefined },
    );
  return (
    <section className="editor">
      <div className="editor-head">
        <div>
          <span>{sectionNames[section]}</span>
          <h2>{q.id}</h2>
        </div>
        <div>
          <button onClick={onDuplicate}>
            <Copy /> Duplicate
          </button>
          <button className="danger" onClick={onRemove}>
            <Trash2 /> Remove
          </button>
        </div>
      </div>
      {issues.length > 0 && (
        <div className="issues">
          <AlertTriangle />{" "}
          <div>
            <b>Needs attention</b>
            {issues.map((issue) => (
              <p key={issue}>{issue}</p>
            ))}
          </div>
        </div>
      )}
      <div className="form-grid">
        <label>
          Question ID
          <input value={q.id} onChange={(e) => patch({ id: e.target.value })} />
        </label>
        <label>
          Type
          <select
            value={q.type}
            onChange={(e) => setType(e.target.value as Question["type"])}
          >
            <option value="choice">Single choice</option>
            <option value="yes-no">Five statements: Yes/No</option>
            <option value="most-least">Most/least appropriate</option>
          </select>
        </label>
        <label>
          Layout
          <select
            value={q.layout ?? "full"}
            onChange={(e) =>
              patch({ layout: e.target.value as "split" | "full" })
            }
          >
            <option value="full">Full width</option>
            <option value="split">Split passage/question</option>
          </select>
        </label>
      </div>
      <label>
        Passage or scenario
        <textarea
          rows={6}
          value={q.passage ?? ""}
          onChange={(e) => patch({ passage: e.target.value || undefined })}
        />
      </label>
      <label>
        Question prompt
        <textarea
          rows={3}
          value={q.prompt}
          onChange={(e) => patch({ prompt: e.target.value })}
        />
      </label>
      {q.type === "yes-no" ? (
        <div className="answer-block">
          <h3>Statements and correct answers</h3>
          {(q.statements ?? Array(5).fill("")).map((statement, index) => (
            <div className="answer-row" key={index}>
              <b>{index + 1}</b>
              <input
                value={statement}
                onChange={(e) =>
                  patch({
                    statements: q.statements!.map((s, i) =>
                      i === index ? e.target.value : s,
                    ),
                  })
                }
              />
              <select
                aria-label={`Correct answer ${index + 1}`}
                value={answer[String(index)] ?? ""}
                onChange={(e) =>
                  patch({
                    correctAnswer: {
                      ...answer,
                      [String(index)]: e.target.value,
                    },
                  })
                }
              >
                <option value="">Answer…</option>
                <option>Yes</option>
                <option>No</option>
              </select>
            </div>
          ))}
        </div>
      ) : (
        <div className="answer-block">
          <h3>Answer options</h3>
          {options.map((option, index) => (
            <div className="answer-row" key={index}>
              <input
                className="option-id"
                aria-label={`Option ${index + 1} ID`}
                value={option.id}
                onChange={(e) =>
                  patch({
                    options: options.map((o, i) =>
                      i === index ? { ...o, id: e.target.value } : o,
                    ),
                  })
                }
              />
              <input
                aria-label={`Option ${index + 1} text`}
                value={option.text}
                onChange={(e) =>
                  patch({
                    options: options.map((o, i) =>
                      i === index ? { ...o, text: e.target.value } : o,
                    ),
                  })
                }
              />
              <button
                aria-label={`Remove option ${index + 1}`}
                onClick={() =>
                  patch({ options: options.filter((_, i) => i !== index) })
                }
              >
                ×
              </button>
            </div>
          ))}
          <button
            onClick={() =>
              patch({
                options: [
                  ...options,
                  { id: String.fromCharCode(65 + options.length), text: "" },
                ],
              })
            }
          >
            + Add option
          </button>
          {q.type === "choice" ? (
            <label>
              Correct option
              <select
                value={answer.choice ?? ""}
                onChange={(e) =>
                  patch({
                    correctAnswer: e.target.value
                      ? { choice: e.target.value }
                      : undefined,
                  })
                }
              >
                <option value="">Not set</option>
                {options.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.id}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div className="form-grid">
              <label>
                Most appropriate
                <select
                  value={answer.most ?? ""}
                  onChange={(e) =>
                    patch({
                      correctAnswer: { ...answer, most: e.target.value },
                    })
                  }
                >
                  <option value="">Not set</option>
                  {options.map((option) => (
                    <option key={option.id}>{option.id}</option>
                  ))}
                </select>
              </label>
              <label>
                Least appropriate
                <select
                  value={answer.least ?? ""}
                  onChange={(e) =>
                    patch({
                      correctAnswer: { ...answer, least: e.target.value },
                    })
                  }
                >
                  <option value="">Not set</option>
                  {options.map((option) => (
                    <option key={option.id}>{option.id}</option>
                  ))}
                </select>
              </label>
            </div>
          )}
        </div>
      )}
      <details>
        <summary>Optional data table</summary>
        <label>
          Headers (tab separated)
          <input
            value={q.table?.headers.join("\t") ?? ""}
            onChange={(e) =>
              patch({
                table: {
                  headers: e.target.value.split("\t"),
                  rows: q.table?.rows ?? [],
                },
              })
            }
          />
        </label>
        <label>
          Rows (one per line, tab separated)
          <textarea
            rows={5}
            value={q.table?.rows.map((row) => row.join("\t")).join("\n") ?? ""}
            onChange={(e) =>
              patch({
                table: {
                  headers: q.table?.headers ?? ["Column"],
                  rows: e.target.value
                    ? e.target.value.split("\n").map((row) => row.split("\t"))
                    : [],
                },
              })
            }
          />
        </label>
      </details>
      <label>
        Explanation
        <textarea
          rows={4}
          value={q.explanation ?? ""}
          onChange={(e) => patch({ explanation: e.target.value || undefined })}
        />
      </label>
      <fieldset>
        <legend>Editorial workflow</legend>
        <div className="form-grid">
          <label>
            Status
            <select
              value={q.editorial!.status}
              onChange={(e) =>
                setEditorial({ status: e.target.value as Status })
              }
            >
              {statuses.map((status) => (
                <option
                  key={status}
                  disabled={status === "approved" && !approvalReady}
                >
                  {status}
                </option>
              ))}
            </select>
            {!approvalReady && (
              <small className="field-help">
                Add a valid correct answer and explanation before approval.
              </small>
            )}
          </label>
          <label>
            Difficulty
            <select
              value={q.editorial?.difficulty ?? ""}
              onChange={(e) =>
                setEditorial({
                  difficulty: e.target.value
                    ? (e.target.value as "easy" | "medium" | "hard")
                    : undefined,
                })
              }
            >
              <option value="">Unrated</option>
              <option>easy</option>
              <option>medium</option>
              <option>hard</option>
            </select>
          </label>
          <label>
            Tags (comma separated)
            <input
              value={(q.editorial?.tags ?? []).join(", ")}
              onChange={(e) =>
                setEditorial({
                  tags: e.target.value
                    .split(",")
                    .map((tag) => tag.trim())
                    .filter(Boolean),
                })
              }
            />
          </label>
          <label>
            Author
            <input
              value={q.editorial?.author ?? ""}
              onChange={(e) => setEditorial({ author: e.target.value })}
            />
          </label>
          <label>
            Reviewer
            <input
              value={q.editorial?.reviewer ?? ""}
              onChange={(e) => setEditorial({ reviewer: e.target.value })}
            />
          </label>
        </div>
        <label>
          Reviewer notes
          <textarea
            rows={3}
            value={q.editorial?.notes ?? ""}
            onChange={(e) => setEditorial({ notes: e.target.value })}
          />
        </label>
      </fieldset>
      <div className="preview">
        <h3>Student preview</h3>
        {q.passage && <p className="pre">{q.passage}</p>}
        <b>{q.prompt}</b>
        {q.type === "yes-no"
          ? q.statements?.map((s, i) => (
              <p key={i}>
                {i + 1}. {s} <em>{answer[String(i)] || "No answer"}</em>
              </p>
            ))
          : q.options?.map((o) => (
              <p key={o.id}>
                {o.id}. {o.text}
              </p>
            ))}
        {q.correctAnswer && (
          <small>
            Correct answer complete:{" "}
            {complete(q, q.correctAnswer) ? "Yes" : "No"}
          </small>
        )}
      </div>
    </section>
  );
}
