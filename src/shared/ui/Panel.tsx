import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'

const SURFACE = 'rounded-2xl border border-slate-200 dark:border-slate-800'

/** The one bordered surface in the app. Was copy-pasted into eight files. */
export function Panel({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={`${SURFACE} ${className}`}>{children}</div>
}

/** A panel that is also a link: chevron on the right, pressable whole. */
export function PanelLink({
  to,
  title,
  description,
  badge,
}: {
  to: string
  title: string
  description?: ReactNode
  badge?: ReactNode
}) {
  return (
    <Link
      to={to}
      className={`${SURFACE} flex min-h-14 items-center gap-3 px-4 py-3 transition active:scale-[0.99] active:bg-slate-50 dark:active:bg-slate-900`}
    >
      <span className="min-w-0 flex-1">
        <span className="font-medium">{title}</span>
        {badge}
        {description && (
          <span className="block text-sm text-slate-500">{description}</span>
        )}
      </span>
      <span aria-hidden className="text-slate-400">
        ›
      </span>
    </Link>
  )
}

export function EmptyState({
  title,
  children,
}: {
  title: string
  children?: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
      <p className="font-medium">{title}</p>
      {children && <div className="mt-1 text-sm text-slate-500">{children}</div>}
    </div>
  )
}

type Tone = 'info' | 'warning' | 'danger' | 'success'

const TONES: Record<Tone, string> = {
  info: 'bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300',
  warning: 'bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
  danger: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
  success: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
}

/** Inline message. Danger and warning announce themselves to screen readers. */
export function Note({
  tone = 'info',
  children,
}: {
  tone?: Tone
  children: ReactNode
}) {
  return (
    <p
      role={tone === 'danger' ? 'alert' : tone === 'warning' ? 'status' : undefined}
      className={`rounded-xl p-3 text-sm break-words ${TONES[tone]}`}
    >
      {children}
    </p>
  )
}

/** A text-style action. Replaces the hand-rolled underlined buttons. */
export function QuietButton({
  onClick,
  children,
  tone = 'neutral',
  full = false,
}: {
  onClick: () => void
  children: ReactNode
  tone?: 'neutral' | 'danger'
  /** Stretches to fill its container, for a row of equal-width actions. */
  full?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`no-select min-h-10 rounded-lg px-3 text-sm transition active:scale-[0.97] ${
        full ? 'w-full' : ''
      } ${
        tone === 'danger'
          ? 'text-red-600 active:bg-red-50 dark:text-red-400 dark:active:bg-red-950'
          : 'text-slate-600 active:bg-slate-100 dark:text-slate-300 dark:active:bg-slate-800'
      }`}
    >
      {children}
    </button>
  )
}
