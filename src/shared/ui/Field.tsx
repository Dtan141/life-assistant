import { useId } from 'react'
import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react'

const CONTROL =
  'w-full rounded-xl border border-slate-300 bg-transparent px-3.5 py-3 text-base outline-none transition placeholder:text-slate-400 focus:border-slate-900 dark:border-slate-700 dark:focus:border-slate-300'

interface Shared {
  label: string
  hint?: string
  error?: string
}

function Wrapper({
  label,
  hint,
  error,
  id,
  children,
}: Shared & { id: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
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
  ...props
}: Shared & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId()
  return (
    <Wrapper label={label} hint={hint} error={error} id={id}>
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
  ...props
}: Shared & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId()
  return (
    <Wrapper label={label} hint={hint} error={error} id={id}>
      <textarea id={id} {...props} className={CONTROL} aria-invalid={error ? true : undefined} />
    </Wrapper>
  )
}
