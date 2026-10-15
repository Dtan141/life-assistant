import { useRegisterSW } from 'virtual:pwa-register/react'
import { Button } from '@/shared/ui/Button'

/**
 * The service worker is registered with `prompt`, not `autoUpdate`, so it never
 * reloads the page on its own — losing a review mid-session would be worse than
 * running one version behind for a minute. The trade-off only works if there is
 * a way to accept the update, which is this bar.
 */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      // An installed PWA can stay open for days without a navigation, which is
      // when a service worker would normally check for a new version.
      if (registration) setInterval(() => void registration.update(), 60 * 60 * 1000)
    },
  })

  if (!needRefresh) return null

  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-2.5">
        <p className="flex-1 text-sm">Có bản mới của ứng dụng.</p>
        <Button onClick={() => void updateServiceWorker(true)} className="min-h-9 px-3">
          Cập nhật
        </Button>
        <Button
          variant="ghost"
          onClick={() => setNeedRefresh(false)}
          className="min-h-9 px-3"
          aria-label="Để sau"
        >
          Để sau
        </Button>
      </div>
    </div>
  )
}
