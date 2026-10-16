import { useId } from 'react'
import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react'

const CONTROL =
  'w-full rounded-xl border border-slate-300 bg-transparent px-3.5 py-3 text-base outline-none transition placeholder:text-slate-400 focus:border-slate-900 aria-invalid:border-red-400 dark:border-slate-700 dark:focus:border-slate-300'

interface Shared {
  label: string
  hint?: ReactNode
  error?: string
  /**
   * Marks the field as not required. Stated on the optional fields rather than
   * starring the required ones: most fields here are optional, so the shorter
   * list is the one worth labelling, and "nothing said" must never mean
   * "required".
   */
  optional?: boolean
}

function Wrapper({
  label,
  hint,
  error,
  optional,
  id,
  children,
}: Shared & { id: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="flex items-baseline gap-2 text-sm font-medium">
        {label}
        {optional && (
          <span className="text-xs font-normal text-slate-400">không bắt buộc</span>
        )}
      </label>
      {children}
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : hint ? (
        <p className="text-sm text-slate-500">{hint}</p>
      ) : null}
    </div>
  )
}

export function TextField({
  label,
  hint,
  error,
  optional,
  ...props
}: Shared & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId()
  return (
    <Wrapper label={label} hint={hint} error={error} optional={optional} id={id}>
      <input
        id={id}
        {...props}
        // text-base, not text-sm: iOS Safari zooms the page when a focused
        // input renders below 16px.
        className={CONTROL}
        aria-invalid={error ? true : undefined}
      />
    </Wrapper>
  )
}

export function TextAreaField({
  label,
  hint,
  error,
  optional,
  ...props
}: Shared & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId()
  return (
    <Wrapper label={label} hint={hint} error={error} optional={optional} id={id}>
      <textarea
        id={id}
        {...props}
        className={CONTROL}
        aria-invalid={error ? true : undefined}
      />
    </Wrapper>
  )
}

export function SelectField({
  label,
  hint,
  optional,
  children,
  ...props
}: Shared &
  React.SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  const id = useId()
  return (
    <Wrapper label={label} hint={hint} optional={optional} id={id}>
      <select id={id} {...props} className={CONTROL}>
        {children}
      </select>
    </Wrapper>
  )
}
