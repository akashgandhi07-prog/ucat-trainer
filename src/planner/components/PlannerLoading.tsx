import { useEffect, useState } from 'react'

export default function PlannerLoading({ label = 'Loading your plan…' }: { label?: string }) {
  const [showRefresh, setShowRefresh] = useState(false)

  useEffect(() => {
    const t = window.setTimeout(() => setShowRefresh(true), 2000)
    return () => window.clearTimeout(t)
  }, [])

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-12">
      <span className="text-sm text-muted-foreground">{label}</span>
      {showRefresh && (
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
        >
          Taking too long? Refresh the page
        </button>
      )}
    </div>
  )
}
