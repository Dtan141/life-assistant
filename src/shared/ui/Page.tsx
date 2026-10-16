import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'

/**
 * One page shell for every screen, so top spacing, width and the position of
 * the back link stop drifting apart page by page.
 */
export function Page({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-lg px-5 pt-6 pb-2">{children}</div>
}

const BACK_CLASS =
  '-ml-1 inline-flex min-h-9 items-center rounded-lg px-1 text-sm text-slate-500 transition hover:text-slate-900 dark:hover:text-slate-100'

interface HeaderProps {
  title: string
  subtitle?: ReactNode
  /**
   * The back link. `to` for a screen with one way in; `onBack` for one with
   * several, where the right destination is wherever the user came from.
   */
  back?: { label: string; to?: string; onBack?: () => void }
  /** Sits to the right of the title, for a primary action. */
  action?: ReactNode
}

export function PageHeader({ title, subtitle, back, action }: HeaderProps) {
  return (
    <header className="mb-5">
      {back &&
        (back.onBack ? (
          <button type="button" onClick={back.onBack} className={BACK_CLASS}>
            ← {back.label}
          </button>
        ) : (
          <Link to={back.to ?? '/'} className={BACK_CLASS}>
            ← {back.label}
          </Link>
        ))}
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-2xl font-bold text-balance">{title}</h1>
        {action}
      </div>
      {subtitle && (
        <div className="mt-1 text-slate-500 dark:text-slate-400">{subtitle}</div>
      )}
    </header>
  )
}

export function Section({
  title,
  note,
  separated = false,
  children,
}: {
  title?: string
  note?: ReactNode
  /**
   * Rules off from the section above. For pages that stack unrelated groups of
   * settings, where a heading alone leaves the first control looking like it
   * belongs to the previous group's button.
   */
  separated?: boolean
  children: ReactNode
}) {
  return (
    <section
      className={
        separated
          ? 'mt-8 mb-6 border-t border-slate-200 pt-6 last:mb-0 dark:border-slate-800'
          : 'mb-6 last:mb-0'
      }
    >
      {title && (
        <h2 className="mb-2 font-semibold">
          {title}
          {note && <span className="ml-2 font-normal text-slate-400">{note}</span>}
        </h2>
      )}
      {children}
    </section>
  )
}
