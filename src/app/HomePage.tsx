import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/shared/auth/useAuth'
import { useSettings } from '@/shared/settings/useSettings'
import { Button } from '@/shared/ui/Button'
import { Panel, PanelLink } from '@/shared/ui/Panel'
import { Page, PageHeader } from '@/shared/ui/Page'
import { Spinner } from '@/shared/ui/Spinner'
import { useAllCards } from '@/modules/flashcards/data/useAllCards'
import { countByStatus } from '@/modules/flashcards/domain/card-status'
import { countDue } from '@/modules/flashcards/domain/session'
import { computeStreak } from '@/modules/flashcards/domain/stats'
import { listRecentLogs } from '@/modules/flashcards/data/reviews.repo'
import type { ReviewLogEntry } from '@/modules/flashcards/domain/backup'

/** Enough history to tell the current streak without reading the whole log. */
const STREAK_WINDOW_DAYS = 90

export default function HomePage() {
  const { user } = useAuth()
  const { settings } = useSettings()
  const { cards, loading } = useAllCards()
  const navigate = useNavigate()

  const [logs, setLogs] = useState<ReviewLogEntry[]>([])

  useEffect(() => {
    if (!user) return
    let cancelled = false
    const since = new Date()
    since.setDate(since.getDate() - STREAK_WINDOW_DAYS)
    void listRecentLogs(user.uid, since)
      .then((result) => {
        if (!cancelled) setLogs(result)
      })
      // The streak is decoration; failing to read it must not break the page.
      .catch((err) => console.error('Failed to load streak', err))
    return () => {
      cancelled = true
    }
  }, [user])

  const streak = useMemo(() => computeStreak(logs), [logs])
  const firstName = user?.displayName?.split(' ').pop() ?? ''
  const due = useMemo(() => countDue(cards), [cards])
  const counts = useMemo(() => countByStatus(cards), [cards])
  const newAvailable = Math.min(counts.new, settings.newPerDay)
  const waiting = due + newAvailable

  return (
    <Page>
      <PageHeader title={`Chào ${firstName}`} subtitle="Hôm nay học gì nào?" />

      {loading ? (
        <Spinner />
      ) : (
        <>
          <Panel className="mb-4 p-5">
            <p className="text-sm text-slate-500">Chờ ôn hôm nay</p>
            <p className="mt-1 text-4xl font-bold tabular-nums">{waiting}</p>
            <p className="mt-1 text-sm text-slate-500">
              {due} thẻ đến hạn
              {newAvailable > 0 && ` · ${newAvailable} thẻ mới`}
            </p>

            <Button
              onClick={() => navigate('/flashcards/review/session')}
              disabled={waiting === 0}
              className="mt-4 w-full"
            >
              {waiting === 0 ? 'Không có gì để ôn' : 'Bắt đầu ôn'}
            </Button>

            <button
              type="button"
              onClick={() => navigate('/flashcards/review')}
              className="mt-2 w-full text-sm text-slate-500 underline underline-offset-2"
            >
              Chọn bộ, trạng thái và kiểu hỏi
            </button>
          </Panel>

          <section className="mb-4 grid grid-cols-4 gap-2 text-center">
            <Tile value={counts.new} label="Mới" />
            <Tile value={counts.learning} label="Đang học" />
            <Tile value={counts.due} label="Cần ôn" />
            <Tile value={counts.known} label="Đã thuộc" />
          </section>

          <PanelLink
            to="/stats"
            title="Thống kê"
            description="Lịch đến hạn, tỉ lệ nhớ, thẻ hay quên"
            badge={
              streak.current > 0 && (
                <span className="ml-2 text-sm text-emerald-600 dark:text-emerald-400">
                  🔥 {streak.current} ngày liên tiếp
                </span>
              )
            }
          />

          {cards.length === 0 && (
            <p className="mt-4 text-center text-sm text-slate-500">
              Chưa có thẻ nào. Vào <strong>Bộ thẻ</strong> để tạo bộ đầu tiên.
            </p>
          )}
        </>
      )}
    </Page>
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
