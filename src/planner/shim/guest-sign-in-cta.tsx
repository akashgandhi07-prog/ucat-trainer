import { Button } from '@/components/ui/button'
import { useAuthModal } from '../../contexts/AuthModalContext'

export function GuestSignInCta({ className = '' }: { className?: string }) {
  const { openAuthModal } = useAuthModal()

  return (
    <div
      className={`rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${className}`}
    >
      <div className="text-left">
        <p className="text-sm font-semibold text-amber-900">Browsing as a guest</p>
        <p className="text-xs text-amber-800 mt-0.5">
          Everything is free. Create a free account only when you want progress saved across devices.
        </p>
      </div>
      <Button
        type="button"
        size="sm"
        className="shrink-0 bg-blue-600 hover:bg-blue-700"
        onClick={() => openAuthModal('register')}
      >
        Sign in to save
      </Button>
    </div>
  )
}
