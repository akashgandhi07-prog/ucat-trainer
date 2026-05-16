export default function SJTQuestionSkeleton() {
  return (
    <div className="space-y-4 animate-pulse" aria-hidden>
      <div className="h-6 w-40 rounded-lg bg-secondary" />
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <div className="h-3 w-full rounded bg-secondary" />
        <div className="h-3 w-full rounded bg-secondary" />
        <div className="h-3 w-4/5 rounded bg-secondary" />
        <div className="h-3 w-3/5 rounded bg-secondary" />
      </div>
      <div className="space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-14 rounded-xl bg-secondary" />
        ))}
      </div>
    </div>
  );
}
