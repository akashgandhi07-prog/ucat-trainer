import { Link } from "react-router-dom";
import QuestionLabMarkdownEditorPage from "../../components/admin/QuestionLabMarkdownEditorPage";

const API_BASE = "/__question-lab/output-specs";
const bundledSpecs = import.meta.glob(
  "../../../question-lab/output-specs/*.md",
  { eager: true, query: "?raw", import: "default" },
) as Record<string, string>;

export default function OutputSpecsFilesPage() {
  return (
    <QuestionLabMarkdownEditorPage
      apiBase={API_BASE}
      bundledByPath={bundledSpecs}
      eyebrow="Question Lab"
      title="Output format specs"
      description="How each trainer question should look in our product (JSON fields, explanation style, constraints). Used with the AI copy kit in Question Lab."
      placeholder="Select an output spec file to edit."
      headerLinks={
        <>
          <Link
            to="/admin/question-lab"
            className="inline-flex items-center gap-2 rounded-md border border-slate-700 px-3 py-2 font-medium text-slate-100 transition hover:border-cyan-300 hover:text-cyan-200"
          >
            Question Lab
          </Link>
          <Link
            to="/admin/question-lab/gold-standards"
            className="inline-flex items-center gap-2 rounded-md border border-slate-700 px-3 py-2 font-medium text-slate-100 transition hover:border-cyan-300 hover:text-cyan-200"
          >
            Official examples
          </Link>
          <a
            href="/__question-lab/master-plan"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-md border border-slate-700 px-3 py-2 font-medium text-slate-100 transition hover:border-cyan-300 hover:text-cyan-200"
          >
            Master plan
          </a>
        </>
      }
    />
  );
}
