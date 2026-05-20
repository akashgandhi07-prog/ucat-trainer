import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Check, FileText, RefreshCw, Save } from "lucide-react";

type GoldStandardFile = {
  filename: string;
  slug: string;
  title: string;
};

type LoadState = "idle" | "loading" | "ready" | "error";
type SaveState = "idle" | "saving" | "saved" | "error";

const API_BASE = "/__question-lab/gold-standards";

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export default function GoldStandardFilesPage() {
  const [files, setFiles] = useState<GoldStandardFile[]>([]);
  const [selectedFilename, setSelectedFilename] = useState<string>("");
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
        const response = await fetch(API_BASE);
        if (!response.ok) throw new Error("Could not load gold-standard files.");
        const data = (await response.json()) as { files: GoldStandardFile[] };
        if (cancelled) return;
        setFiles(data.files);
        setSelectedFilename((current) => current || data.files[0]?.filename || "");
        setLoadState("ready");
      } catch (err) {
        if (cancelled) return;
        setLoadState("error");
        setError(
          err instanceof Error
            ? err.message
            : "Could not load gold-standard files. This editor only works on the local Vite dev server.",
        );
      }
    }

    loadFiles();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedFilename) return;
    let cancelled = false;

    async function loadFile() {
      setLoadState("loading");
      setError(null);
      try {
        const response = await fetch(`${API_BASE}/${selectedFilename}`);
        if (!response.ok) throw new Error(`Could not load ${selectedFilename}.`);
        const data = (await response.json()) as { content: string };
        if (cancelled) return;
        setContent(data.content);
        setSavedContent(data.content);
        setSaveState("idle");
        setLoadState("ready");
      } catch (err) {
        if (cancelled) return;
        setLoadState("error");
        setError(err instanceof Error ? err.message : `Could not load ${selectedFilename}.`);
      }
    }

    loadFile();

    return () => {
      cancelled = true;
    };
  }, [selectedFilename]);

  async function saveFile() {
    if (!selectedFilename) return;
    setSaveState("saving");
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/${selectedFilename}`, {
        method: "PUT",
        headers: { "Content-Type": "text/markdown;charset=utf-8" },
        body: content,
      });
      if (!response.ok) throw new Error(`Could not save ${selectedFilename}.`);
      setSavedContent(content);
      setSaveState("saved");
      window.setTimeout(() => setSaveState("idle"), 1800);
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
            <p className="text-sm font-medium text-cyan-300">Question Lab</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal text-white">
              Gold Standard Files
            </h1>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-300">
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
              placeholder="Select a gold-standard file to edit."
            />
          </section>
        </section>
      </div>
    </main>
  );
}
