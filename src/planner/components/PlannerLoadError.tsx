import { Button } from '@/components/ui/button'

type PlannerLoadErrorProps = {
  message: string
  onRetry: () => void
}

export default function PlannerLoadError({ message, onRetry }: PlannerLoadErrorProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-12 text-center">
      <p className="text-sm text-muted-foreground max-w-md">{message}</p>
      <Button type="button" onClick={onRetry}>
        Try again
      </Button>
    </div>
  )
}
