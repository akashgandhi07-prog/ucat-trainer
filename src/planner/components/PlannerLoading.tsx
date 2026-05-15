export default function PlannerLoading({ label = 'Loading your plan…' }: { label?: string }) {
  return (
    <div className="flex flex-1 items-center justify-center p-12 text-sm text-muted-foreground">
      {label}
    </div>
  )
}
