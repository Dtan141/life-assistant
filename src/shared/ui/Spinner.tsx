export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-3">
      <div
        className="size-7 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900 dark:border-slate-700 dark:border-t-slate-100"
        role="status"
        aria-label={label ?? 'Đang tải'}
      />
      {label && <p className="text-sm text-slate-500">{label}</p>}
    </div>
  )
}
