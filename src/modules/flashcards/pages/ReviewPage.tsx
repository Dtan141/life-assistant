import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/shared/auth/useAuth'
import { useSettings } from '@/shared/settings/useSettings'
import { Button } from '@/shared/ui/Button'
import { Spinner } from '@/shared/ui/Spinner'
import { RatingButtons } from '@/modules/flashcards/components/RatingButtons'
import { ReviewCard } from '@/modules/flashcards/components/ReviewCard'
import { useAllCards } from '@/modules/flashcards/data/useAllCards'
import { getDailyProgress, saveReview } from '@/modules/flashcards/data/reviews.repo'
import { buildPracticeSession, buildSession } from '@/modules/flashcards/domain/session'
import { RATINGS, applyRating, previewRatings } from '@/modules/flashcards/domain/srs'
import type { ReviewRating } from '@/modules/flashcards/domain/srs'
import type { DailyProgress } from '@/modules/flashcards/domain/session'
import type { Card } from '@/modules/flashcards/domain/card.types'

export default function ReviewPage() {
  const { user } = useAuth()
  const { settings, loading: settingsLoading } = useSettings()
  const { cards, loading, error } = useAllCards()
  const [params] = useSearchParams()

  const deckId = params.get('deck')
  const practice = params.get('mode') === 'practice'

  const [session, setSession] = useState<{ queue: Card[]; heldBack: number } | null>(null)
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState({ reviewed: 0, again: 0 })
  const [saveError, setSaveError] = useState<string | null>(null)
  const built = useRef(false)

  const scope = useMemo(
    () => (deckId ? cards.filter((card) => card.deckId === deckId) : cards),
    [cards, deckId],
  )

  /**
   * The queue is built once and then left alone. Rebuilding it as cards change
   * underneath — which they do, since every answer writes one — would reorder
   * the session while it is being worked through.
   *
   * Today's tally comes from the review log rather than local state, so the
   * daily limits survive a reload and follow the user between devices.
   */
  useEffect(() => {
    if (loading || settingsLoading || !user || built.current) return
    built.current = true
    let cancelled = false

    void (async () => {
      if (practice) {
        if (!cancelled) setSession({ queue: buildPracticeSession(scope), heldBack: 0 })
        return
      }
      const progress: DailyProgress = await getDailyProgress(user.uid).catch((err) => {
        console.error('Failed to read daily progress', err)
        return { newDone: 0, reviewsDone: 0 }
      })
      const plan = buildSession(scope, settings, progress)
      if (!cancelled) setSession({ queue: plan.queue, heldBack: plan.heldBack })
    })()

    return () => {
      cancelled = true
    }
  }, [loading, settingsLoading, user, practice, scope, settings])

  const queue = session?.queue ?? null
  const current = queue?.[index]

  const options = useMemo(
    () => (current ? previewRatings(current.srs, settings.desiredRetention) : null),
    [current, settings.desiredRetention],
  )

  const handleRate = useCallback(
    async (rating: ReviewRating) => {
      if (!user || !current || saving) return
      setSaving(true)
      setSaveError(null)
      try {
        if (!practice) {
          const srs = applyRating(current.srs, rating, settings.desiredRetention)
          await saveReview(user.uid, { card: current, rating, srs, mode: 'en-vi' })
        }
        setDone((prev) => ({
          reviewed: prev.reviewed + 1,
          again: prev.again + (rating === 'again' ? 1 : 0),
        }))
        setSession((prev) => {
          // "Quên" sends the card to the back so it comes round again today.
          if (!prev || rating !== 'again') return prev
          const rest = [...prev.queue]
          const [card] = rest.splice(index, 1)
          rest.push(card)
          return { ...prev, queue: rest }
        })
        setIndex((prev) => (rating === 'again' ? prev : prev + 1))
        setRevealed(false)
      } catch (err) {
        console.error('Failed to save review', err)
        setSaveError('Không lưu được kết quả. Kiểm tra mạng rồi thử lại.')
      } finally {
        setSaving(false)
      }
    },
    [user, current, saving, practice, settings.desiredRetention, index],
  )

  // Kept in a ref so the key listener is installed once rather than on every
  // card, which would add and remove a window listener each answer.
  const handleRateRef = useRef(handleRate)
  useEffect(() => {
    handleRateRef.current = handleRate
  }, [handleRate])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement) return
      if (event.code === 'Space') {
        event.preventDefault()
        setRevealed(true)
        return
      }
      const slot = Number(event.key)
      if (slot >= 1 && slot <= 4) {
        // Rating before seeing the answer would be meaningless.
        setRevealed((isRevealed) => {
          if (isRevealed) void handleRateRef.current(RATINGS[slot - 1])
          return isRevealed
        })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (loading || settingsLoading || session === null) return <Spinner />

  if (error) {
    return (
      <div className="mx-auto max-w-lg px-5 pt-8">
        <p className="break-words text-red-600 dark:text-red-400">{error}</p>
      </div>
    )
  }

  if (!current) {
    return (
      <div className="mx-auto max-w-lg space-y-4 px-5 pt-10 text-center">
        <p className="text-4xl">{done.reviewed > 0 ? '🎉' : '✓'}</p>
        <h1 className="text-2xl font-bold">
          {done.reviewed > 0 ? 'Xong phiên hôm nay' : 'Không có thẻ nào đến hạn'}
        </h1>
        {done.reviewed > 0 && (
          <p className="text-slate-500">
            Đã ôn {done.reviewed} lượt
            {done.again > 0 && `, trong đó ${done.again} lượt quên`}.
          </p>
        )}
        {session.heldBack > 0 && (
          <p className="text-sm text-slate-500">
            Còn {session.heldBack} thẻ đến hạn để dành cho mai, do giới hạn{' '}
            {settings.maxReviewsPerDay} lượt mỗi ngày.
          </p>
        )}
        <div className="flex flex-col gap-2 pt-2">
          <Link
            to={deckId ? `/flashcards/review?deck=${deckId}&mode=practice` : '/flashcards/review?mode=practice'}
            className="text-sm text-slate-500 underline underline-offset-2"
          >
            Luyện tự do (không ảnh hưởng lịch ôn)
          </Link>
          <Link to="/" className="text-sm text-slate-500 underline underline-offset-2">
            Về trang chủ
          </Link>
        </div>
      </div>
    )
  }

  const total = queue.length
  const position = Math.min(index + 1, total)

  return (
    <div className="mx-auto max-w-lg px-5 pt-6">
      <div className="mb-4 flex items-center justify-between gap-3 text-sm text-slate-500">
        <span className="tabular-nums">
          {position} / {total}
        </span>
        {practice && <span className="text-amber-700 dark:text-amber-500">Luyện tự do</span>}
        <Link to="/flashcards" className="underline underline-offset-2">
          Thoát
        </Link>
      </div>

      <div className="mb-4 h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className="h-full bg-slate-900 transition-[width] dark:bg-slate-100"
          style={{ width: `${(index / total) * 100}%` }}
        />
      </div>

      <ReviewCard card={current} revealed={revealed} onReveal={() => setRevealed(true)} />

      {saveError && (
        <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
          {saveError}
        </p>
      )}

      <div className="mt-4">
        {revealed && options ? (
          <RatingButtons
            options={options}
            onRate={(rating) => void handleRate(rating)}
            disabled={saving}
          />
        ) : (
          <Button onClick={() => setRevealed(true)} className="w-full">
            Lật thẻ
          </Button>
        )}
      </div>
    </div>
  )
}
