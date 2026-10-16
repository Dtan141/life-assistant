import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/shared/auth/useAuth'
import { Spinner } from '@/shared/ui/Spinner'
import { useAllCards } from '@/modules/flashcards/data/useAllCards'
import { listRecentLogs } from '@/modules/flashcards/data/reviews.repo'
import { countByStatus } from '@/modules/flashcards/domain/card-status'
import {
  computeStreak,
  dueForecast,
  mostForgotten,
  retentionRate,
  reviewsPerDay,
} from '@/modules/flashcards/domain/stats'
import type { ReviewLogEntry } from '@/modules/flashcards/domain/backup'

/** Enough to cover the longest streak worth showing without reading the lot. */
const WINDOW_DAYS = 180

const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']

export default function StatsPage() {
  const { user } = useAuth()
  const { cards, loading: cardsLoading } = useAllCards()
  const [logs, setLogs] = useState<ReviewLogEntry[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    const since = new Date()
    since.setDate(since.getDate() - WINDOW_DAYS)

    void listRecentLogs(user.uid, since)
      .then((result) => {
        if (!cancelled) setLogs(result)
      })
      .catch((err) => {
        console.error('Failed to load review logs', err)
        if (!cancelled) {
          setError('Không tải được lịch sử ôn tập.')
          setLogs([])
        }
      })
    return () => {
      cancelled = true
    }
  }, [user])

  const streak = useMemo(() => computeStreak(logs ?? []), [logs])
  const retention = useMemo(() => retentionRate(logs ?? []), [logs])
  const activity = useMemo(() => reviewsPerDay(logs ?? [], 14), [logs])
  const forecast = useMemo(() => dueForecast(cards, 7), [cards])
  const counts = useMemo(() => countByStatus(cards), [cards])
  const forgotten = useMemo(() => mostForgotten(cards, 10), [cards])

  if (cardsLoading || logs === null) return <Spinner />

  const peakForecast = Math.max(1, ...forecast.map((d) => d.count))
  const peakActivity = Math.max(1, ...activity.map((d) => d.count))

  return (
    <div className="mx-auto max-w-lg space-y-7 px-5 pt-6">
      <div>
        <Link to="/" className="text-sm text-slate-500">
          ← Hôm nay
        </Link>
        <h1 className="mt-1 text-2xl font-bold">Thống kê</h1>
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <section className="grid grid-cols-3 gap-2 text-center">
        <Stat
          value={streak.current}
          label={streak.studiedToday ? 'ngày liên tiếp' : 'ngày — chưa ôn hôm nay'}
          accent
        />
        <Stat value={streak.longest} label="chuỗi dài nhất" />
        <Stat
          value={retention.rate === null ? '—' : `${Math.round(retention.rate * 100)}%`}
          label="tỉ lệ nhớ"
        />
      </section>

      {retention.rate !== null && (
        <p className="-mt-5 text-center text-xs text-slate-500">
          {retention.remembered}/{retention.total} lượt ôn nhớ được. Không tính lần đầu
          gặp từ mới.
        </p>
      )}

      <section className="space-y-2">
        <h2 className="font-semibold">Thẻ đến hạn 7 ngày tới</h2>
        <ul className="flex items-end gap-1.5">
          {forecast.map((day, index) => (
            <li key={day.date.toISOString()} className="flex-1 text-center">
              <div className="flex h-24 items-end">
                <div
                  className="w-full rounded-t bg-slate-900 dark:bg-slate-100"
                  style={{ height: `${Math.max(4, (day.count / peakForecast) * 96)}px` }}
                  title={`${day.count} thẻ`}
                />
              </div>
              <p className="mt-1 text-xs tabular-nums">{day.count}</p>
              <p className="text-[10px] text-slate-400">
                {index === 0 ? 'Nay' : WEEKDAYS[day.date.getDay()]}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">Lượt ôn 14 ngày qua</h2>
        <ul className="flex items-end gap-1">
          {activity.map((day) => (
            <li key={day.date.toISOString()} className="flex-1">
              <div className="flex h-16 items-end">
                <div
                  className={`w-full rounded-t ${
                    day.count > 0
                      ? 'bg-emerald-500'
                      : 'bg-slate-200 dark:bg-slate-800'
                  }`}
                  style={{ height: `${Math.max(3, (day.count / peakActivity) * 64)}px` }}
                  title={`${day.date.toLocaleDateString('vi-VN')}: ${day.count} lượt`}
                />
              </div>
            </li>
          ))}
        </ul>
        <p className="text-xs text-slate-400">
          Cột xám là ngày không ôn. Tổng {logs.length} lượt trong {WINDOW_DAYS} ngày qua.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">Thẻ theo trạng thái</h2>
        <div className="grid grid-cols-4 gap-2 text-center">
          <Stat value={counts.new} label="Mới" small />
          <Stat value={counts.learning} label="Đang học" small />
          <Stat value={counts.due} label="Cần ôn" small />
          <Stat value={counts.known} label="Đã thuộc" small />
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">Hay quên nhất</h2>
        {forgotten.length === 0 ? (
          <p className="text-sm text-slate-500">
            Chưa có thẻ nào bị quên. Danh sách này xuất hiện sau khi bạn bấm “Quên” ở
            một thẻ đã thuộc.
          </p>
        ) : (
          <>
            <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
              {forgotten.map((card) => (
                <li key={card.id} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{card.term}</p>
                    <p className="truncate text-sm text-slate-500">{card.definition}</p>
                  </div>
                  <span className="shrink-0 rounded-md bg-amber-100 px-2 py-0.5 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    quên {card.srs?.lapses}×
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-slate-500">
              Gắn tag <code>can-on-ky</code> cho những thẻ này để ôn riêng, hoặc mang
              sang Claude để luyện thêm.
            </p>
          </>
        )}
      </section>
    </div>
  )
}

function Stat({
  value,
  label,
  accent,
  small,
}: {
  value: number | string
  label: string
  accent?: boolean
  small?: boolean
}) {
  return (
    <div className="rounded-xl border border-slate-200 py-3 dark:border-slate-800">
      <p
        className={`font-bold tabular-nums ${small ? 'text-xl' : 'text-3xl'} ${
          accent ? 'text-emerald-600 dark:text-emerald-400' : ''
        }`}
      >
        {value}
      </p>
      <p className="px-1 text-xs text-slate-500">{label}</p>
    </div>
  )
}
