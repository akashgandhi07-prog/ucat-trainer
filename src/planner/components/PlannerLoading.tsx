export default function PlannerLoading({ label = 'Loading your plan…' }: { label?: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-12">
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  )
}
