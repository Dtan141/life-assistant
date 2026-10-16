import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'

interface Props {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}

/**
 * A bottom sheet on a phone, a centred dialog from `sm` up.
 *
 * Uses <dialog> so the browser supplies focus trapping, Escape and inertness
 * for the rest of the page rather than us reimplementing them.
 */
export function Sheet({ open, title, onClose, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  useEffect(() => {
    // Lock the page behind the sheet; without this iOS scrolls the page
    // underneath while the sheet is open.
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  // A <dialog> is centred by `margin: auto`; on a phone it is pinned to the
  // bottom instead, so it reads as a sheet and sits under the thumb.
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(event) => {
        // The backdrop is part of the dialog element, so a click landing on
        // the element itself rather than its content means "outside".
        if (event.target === ref.current) onClose()
      }}
      className="fixed inset-x-0 bottom-0 top-auto m-0 w-full max-w-none bg-transparent p-0 text-slate-900 backdrop:bg-slate-900/50 backdrop:backdrop-blur-[2px] sm:inset-0 sm:m-auto sm:max-w-lg dark:text-slate-100"
    >
      <div
        className="max-h-[90dvh] overflow-y-auto rounded-t-2xl bg-white p-5 dark:bg-slate-950 sm:rounded-2xl"
        style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
      >
        {/* A grab handle on the phone: it reads as a sheet you can dismiss,
            which a flat panel does not. */}
        <div
          aria-hidden
          className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-700 sm:hidden"
        />
        <h2 className="mb-4 text-lg font-bold">{title}</h2>
        {children}
      </div>
    </dialog>
  )
}
