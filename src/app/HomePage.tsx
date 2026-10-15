import { useAuth } from '@/shared/auth/useAuth'

export default function HomePage() {
  const { user } = useAuth()
  const firstName = user?.displayName?.split(' ').pop() ?? ''

  return (
    <div className="mx-auto max-w-lg space-y-6 px-5 pt-8">
      <header>
        <h1 className="text-2xl font-bold">Chào {firstName}</h1>
        <p className="text-slate-500 dark:text-slate-400">Hôm nay học gì nào?</p>
      </header>

      <section className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
        <p className="text-sm text-slate-500">Thẻ đến hạn hôm nay</p>
        <p className="mt-1 text-4xl font-bold tabular-nums">—</p>
        <p className="mt-2 text-sm text-slate-400">
          Số liệu sẽ có khi lịch ôn hoàn thành (M3).
        </p>
      </section>
    </div>
  )
}
