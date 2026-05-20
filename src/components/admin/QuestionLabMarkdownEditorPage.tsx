import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AlertCircle, Check, FileText, RefreshCw, Save } from "lucide-react";

type MarkdownFile = {
  filename: string;
  slug: string;
  title: string;
};

type LoadState = "idle" | "loading" | "ready" | "error";
type SaveState = "idle" | "saving" | "saved" | "error";

function titleFromFilename(filename: string): string {
  return filename
    .replace(/\.md$/, "")
    .split("-")
    .map((word) =>
      ["dm", "qr", "vr", "sjt"].includes(word) ? word.toUpperCase() : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(" ");
}

function bundledFiles(bundledByPath: Record<string, string>): MarkdownFile[] {
  return Object.keys(bundledByPath)
    .map((path) => {
      const filename = path.split("/").pop() ?? "";
      return { filename, slug: filename.replace(/\.md$/, ""), title: titleFromFilename(filename) };
    })
    .filter((file) => file.filename)
    .sort((a, b) => a.filename.localeCompare(b.filename));
}

function bundledContent(bundledByPath: Record<string, string>, filename: string): string | null {
  const key = Object.keys(bundledByPath).find((path) => path.endsWith(`/${filename}`));
  return key ? bundledByPath[key] : null;
}

async function readJson<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!response.ok || !contentType.includes("application/json")) {
    throw new Error("Local editor API unavailable.");
  }
  return response.json() as Promise<T>;
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

type Props = {
  apiBase: string;
  bundledByPath: Record<string, string>;
  eyebrow: string;
  title: string;
  description?: string;
  placeholder: string;
  headerLinks?: ReactNode;
};

export default function QuestionLabMarkdownEditorPage({
  apiBase,
  bundledByPath,
  eyebrow,
  title,
  description,
  placeholder,
  headerLinks,
}: Props) {
  const [files, setFiles] = useState<MarkdownFile[]>([]);
  const [selectedFilename, setSelectedFilename] = useState("");
  const [content, setContent] = useState("");
  const [savedContent, setSavedContent] = useState("");
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);

  const selectedFile = useMemo(
    () => files.find((file) => file.filename === selectedFilename) ?? null,
    [files, selectedFilename],
  );
  const hasUnsavedChanges = content !== savedContent;

  useEffect(() => {
    let cancelled = false;

    async function loadFiles() {
      setLoadState("loading");
      setError(null);
      try {
        const response = await fetch(apiBase);
        const data = await readJson<{ files: MarkdownFile[] }>(response);
        if (cancelled) return;
        setFiles(data.files);
        setSelectedFilename((current) => current || data.files[0]?.filename || "");
        setLoadState("ready");
      } catch (err) {
        if (cancelled) return;
        const fallback = bundledFiles(bundledByPath);
        setFiles(fallback);
        setSelectedFilename((current) => current || fallback[0]?.filename || "");
        setLoadState("ready");
        setError(fallback.length ? null : err instanceof Error ? err.message : "Could not load files.");
      }
    }

    void loadFiles();
    return () => {
      cancelled = true;
    };
  }, [apiBase, bundledByPath]);

  useEffect(() => {
    if (!selectedFilename) return;
    let cancelled = false;

    async function loadContent() {
      setLoadState("loading");
      setError(null);
      try {
        const response = await fetch(`${apiBase}/${selectedFilename}`);
        const data = await readJson<{ content: string }>(response);
        if (cancelled) return;
        setContent(data.content);
        setSavedContent(data.content);
        setLoadState("ready");
      } catch {
        if (cancelled) return;
        const fallback = bundledContent(bundledByPath, selectedFilename) ?? "";
        setContent(fallback);
        setSavedContent(fallback);
        setLoadState("ready");
      }
    }

    void loadContent();
    return () => {
      cancelled = true;
    };
  }, [apiBase, bundledByPath, selectedFilename]);

  async function saveFile() {
    if (!selectedFilename) return;
    setSaveState("saving");
    setError(null);
    try {
      const response = await fetch(`${apiBase}/${selectedFilename}`, {
        method: "PUT",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: content,
      });
      if (!response.ok) {
        const data = await readJson<{ error?: string }>(response).catch(() => ({ error: "Save failed." }));
        throw new Error(data.error ?? "Save failed.");
      }
      setSavedContent(content);
      setSaveState("saved");
    } catch (err) {
      setSaveState("error");
      setError(err instanceof Error ? err.message : `Could not save ${selectedFilename}.`);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-5 flex flex-col gap-3 border-b border-slate-800 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-cyan-300">{eyebrow}</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal text-white">{title}</h1>
            {description ? <p className="mt-2 max-w-2xl text-sm text-slate-400">{description}</p> : null}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-300">
            {headerLinks}
            {hasUnsavedChanges ? (
              <span className="rounded-md border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-amber-100">
                Unsaved changes
              </span>
            ) : (
              <span className="rounded-md border border-emerald-400/40 bg-emerald-400/10 px-3 py-2 text-emerald-100">
                Saved
              </span>
            )}
            <button
              type="button"
              onClick={saveFile}
              disabled={!selectedFilename || saveState === "saving" || !hasUnsavedChanges}
              className="inline-flex items-center gap-2 rounded-md bg-cyan-400 px-3 py-2 font-medium text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
            >
              {saveState === "saving" ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save
            </button>
          </div>
        </header>

        {error ? (
          <div className="mb-4 flex items-start gap-3 rounded-md border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>{error}</div>
          </div>
        ) : null}

        {saveState === "saved" ? (
          <div className="mb-4 flex items-center gap-2 rounded-md border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            <Check className="h-4 w-4" />
            Saved {selectedFilename}
          </div>
        ) : null}

        <section className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="min-h-0 rounded-md border border-slate-800 bg-slate-900/60">
            <div className="border-b border-slate-800 px-4 py-3">
              <h2 className="text-sm font-semibold text-white">Files</h2>
            </div>
            <nav className="max-h-[70vh] overflow-y-auto p-2">
              {files.map((file) => (
                <button
                  key={file.filename}
                  type="button"
                  onClick={() => setSelectedFilename(file.filename)}
                  className={`mb-1 flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition ${
                    file.filename === selectedFilename
                      ? "bg-cyan-400 text-slate-950"
                      : "text-slate-200 hover:bg-slate-800"
                  }`}
                >
                  <FileText className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 flex-1 truncate">{file.title}</span>
                </button>
              ))}
            </nav>
          </aside>

          <section className="flex min-h-0 flex-col overflow-hidden rounded-md border border-slate-800 bg-slate-900/60">
            <div className="flex flex-col gap-2 border-b border-slate-800 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-white">
                  {selectedFile?.title ?? "No file selected"}
                </h2>
                <p className="mt-1 text-xs text-slate-400">{selectedFilename}</p>
              </div>
              <div className="text-xs text-slate-400">
                {wordCount(content)} words · {content.length.toLocaleString()} characters
              </div>
            </div>

            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              spellCheck
              disabled={loadState === "loading" || !selectedFilename}
              className="min-h-[68vh] flex-1 resize-none bg-slate-950 p-4 font-mono text-sm leading-6 text-slate-100 outline-none placeholder:text-slate-500 disabled:cursor-wait disabled:text-slate-500"
              placeholder={placeholder}
            />
          </section>
        </section>
      </div>
    </main>
  );
}
