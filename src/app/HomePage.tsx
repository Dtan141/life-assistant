import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/shared/auth/useAuth'
import { useSettings } from '@/shared/settings/useSettings'
import { Button } from '@/shared/ui/Button'
import { Spinner } from '@/shared/ui/Spinner'
import { useAllCards } from '@/modules/flashcards/data/useAllCards'
import { countByStatus } from '@/modules/flashcards/domain/card-status'
import { countDue } from '@/modules/flashcards/domain/session'

export default function HomePage() {
  const { user } = useAuth()
  const { settings } = useSettings()
  const { cards, loading } = useAllCards()
  const navigate = useNavigate()

  const firstName = user?.displayName?.split(' ').pop() ?? ''
  const due = useMemo(() => countDue(cards), [cards])
  const counts = useMemo(() => countByStatus(cards), [cards])
  const newAvailable = Math.min(counts.new, settings.newPerDay)
  const waiting = due + newAvailable

  return (
    <div className="mx-auto max-w-lg space-y-5 px-5 pt-8">
      <header>
        <h1 className="text-2xl font-bold">Chào {firstName}</h1>
        <p className="text-slate-500 dark:text-slate-400">Hôm nay học gì nào?</p>
      </header>

      {loading ? (
        <Spinner />
      ) : (
        <>
          <section className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
            <p className="text-sm text-slate-500">Chờ ôn hôm nay</p>
            <p className="mt-1 text-4xl font-bold tabular-nums">{waiting}</p>
            <p className="mt-1 text-sm text-slate-500">
              {due} thẻ đến hạn
              {newAvailable > 0 && ` · ${newAvailable} thẻ mới`}
            </p>

            <Button
              onClick={() => navigate('/flashcards/review')}
              disabled={waiting === 0}
              className="mt-4 w-full"
            >
              {waiting === 0 ? 'Không có gì để ôn' : 'Bắt đầu ôn'}
            </Button>
          </section>

          <section className="grid grid-cols-4 gap-2 text-center">
            <Tile value={counts.new} label="Mới" />
            <Tile value={counts.learning} label="Đang học" />
            <Tile value={counts.due} label="Cần ôn" />
            <Tile value={counts.known} label="Đã thuộc" />
          </section>

          {cards.length === 0 && (
            <p className="text-center text-sm text-slate-500">
              Chưa có thẻ nào. Vào <strong>Bộ thẻ</strong> để tạo bộ đầu tiên.
            </p>
          )}
        </>
      )}
    </div>
  )
}

function Tile({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-xl border border-slate-200 py-3 dark:border-slate-800">
      <p className="text-xl font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  )
}
