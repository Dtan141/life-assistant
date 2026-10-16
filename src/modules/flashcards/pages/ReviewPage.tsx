import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/shared/auth/useAuth'
import { useSettings } from '@/shared/settings/useSettings'
import { Button } from '@/shared/ui/Button'
import { Spinner } from '@/shared/ui/Spinner'
import { Note } from '@/shared/ui/Panel'
import { Page } from '@/shared/ui/Page'
import { useBack } from '@/shared/ui/useBack'
import { RatingButtons } from '@/modules/flashcards/components/RatingButtons'
import { ReviewCard } from '@/modules/flashcards/components/ReviewCard'
import { useAllCards } from '@/modules/flashcards/data/useAllCards'
import { useDecks } from '@/modules/flashcards/data/useDecks'
import { getDailyProgress, saveReview } from '@/modules/flashcards/data/reviews.repo'
import {
  buildPracticeSession,
  buildSession,
  cardsInPlan,
  nextDueAt,
} from '@/modules/flashcards/domain/session'
import { RATINGS, applyRating, previewRatings } from '@/modules/flashcards/domain/srs'
import type { ReviewRating } from '@/modules/flashcards/domain/srs'
import { TypingAnswer } from '@/modules/flashcards/components/TypingAnswer'
import { checkAnswer } from '@/modules/flashcards/domain/answer-check'
import type { AnswerVerdict } from '@/modules/flashcards/domain/answer-check'
import { isReviewMode } from '@/modules/flashcards/domain/review-mode'
import type { ReviewMode } from '@/modules/flashcards/domain/review-mode'
import { settleOrContinue } from '@/shared/lib/pending'
import { cardStatus } from '@/modules/flashcards/domain/card-status'
import { startOfDay } from '@/modules/flashcards/domain/day'
import type { CardStatus } from '@/modules/flashcards/domain/card-status'
import type { DailyProgress } from '@/modules/flashcards/domain/session'
import type { Card } from '@/modules/flashcards/domain/card.types'

const CARD_STATUSES: CardStatus[] = ['new', 'learning', 'due', 'known']
const isCardStatus = (value: string): value is CardStatus =>
  (CARD_STATUSES as string[]).includes(value)

export default function ReviewPage() {
  const { user } = useAuth()
  const { settings, loading: settingsLoading } = useSettings()
  const { cards, loading, error } = useAllCards()
  const { decks } = useDecks()
  const [params] = useSearchParams()
  // A session can start from the home screen, a deck, or the setup screen.
  const exitSession = useBack('/flashcards/review')

  const practice = params.get('mode') === 'practice'
  const mode: ReviewMode = isReviewMode(params.get('card')) ? params.get('card') as ReviewMode : 'en-vi'

  // `deck` (one, from a deck page) and `decks` (several, from the setup screen)
  // both land here.
  const deckFilter = useMemo(() => {
    const many = params.get('decks')
    const one = params.get('deck')
    const ids = many ? many.split(',').filter(Boolean) : one ? [one] : []
    return ids.length > 0 ? new Set(ids) : null
  }, [params])

  const statusFilter = useMemo(() => {
    const raw = params.get('status')
    if (!raw) return null
    const allowed = raw.split(',').filter(isCardStatus)
    return allowed.length > 0 ? new Set<CardStatus>(allowed) : null
  }, [params])

  const [session, setSession] = useState<{
    queue: Card[]
    heldBack: number
    doneToday: number
    nextDue: Date | null
  } | null>(null)
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState({ reviewed: 0, again: 0 })
  const [saveError, setSaveError] = useState<string | null>(null)
  const [typed, setTyped] = useState('')
  const [verdict, setVerdict] = useState<AnswerVerdict | null>(null)
  const building = useRef(false)

  /**
   * Choosing decks explicitly overrides the study plan; choosing nothing falls
   * back to it. So "ôn bộ này" works on a deck kept out of the schedule, while
   * the plain "bắt đầu ôn" never reaches into the library.
   */
  const scope = useMemo(() => {
    const pool = deckFilter ? cards : cardsInPlan(cards, decks)
    return pool.filter(
      (card) =>
        (!deckFilter || deckFilter.has(card.deckId)) &&
        (!statusFilter || statusFilter.has(cardStatus(card))),
    )
  }, [cards, decks, deckFilter, statusFilter])

  /**
   * The cards and settings the queue will be built from.
   *
   * Held in a ref rather than listed as effect dependencies: both change
   * identity whenever a Firestore snapshot lands, and the build must not be
   * torn down and restarted every time one does.
   */
  const latest = useRef({ scope, settings })
  useEffect(() => {
    latest.current = { scope, settings }
  })

  /**
   * The queue is built once and then left alone. Rebuilding it as cards change
   * underneath — which they do, since every answer writes one — would reorder
   * the session while it is being worked through.
   *
   * Today's tally comes from the review log rather than local state, so the
   * daily limits survive a reload and follow the user between devices.
   *
   * `building` guards against starting twice; the absence of a session is what
   * says a build is still needed. An earlier version used a "already built"
   * flag together with per-run cancellation, and the two could cancel the only
   * build that would ever happen: a snapshot arriving mid-build tore the
   * effect down, the re-run saw the flag and returned, and the screen span
   * forever.
   */
  useEffect(() => {
    if (loading || settingsLoading || !user || session !== null || building.current) {
      return
    }
    building.current = true
    let active = true

    void (async () => {
      try {
        if (practice) {
          if (active) {
            setSession({
              queue: buildPracticeSession(latest.current.scope),
              heldBack: 0,
              doneToday: 0,
              nextDue: null,
            })
          }
          return
        }
        const progress: DailyProgress = await getDailyProgress(user.uid).catch((err) => {
          console.error('Failed to read daily progress', err)
          return { newDone: 0, reviewsDone: 0 }
        })
        if (!active) return
        const { scope: cards, settings: limits } = latest.current
        const plan = buildSession(cards, limits, progress)
        setSession({
          queue: plan.queue,
          heldBack: plan.heldBack,
          // Kept so a finished day can report itself rather than just saying
          // there is nothing to do.
          doneToday: progress.newDone + progress.reviewsDone,
          nextDue: nextDueAt(cards),
        })
      } finally {
        // Released either way, so a cancelled build is retried rather than
        // leaving the screen with nothing to show.
        building.current = false
      }
    })()

    return () => {
      active = false
    }
  }, [loading, settingsLoading, user, practice, session])

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
          // Carries on once the answer is in the local cache rather than
          // waiting for the server, so a review session survives losing signal.
          const outcome = await settleOrContinue(
            saveReview(user.uid, { card: current, rating, srs, mode }),
            {
              onLateError: (err) => {
                console.error('Review failed to sync', err)
                setSaveError('Có lượt ôn chưa đồng bộ được lên máy chủ.')
              },
            },
          )
          if (outcome === 'failed') {
            setSaving(false)
            return
          }
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
        setTyped('')
        setVerdict(null)
      } catch (err) {
        console.error('Failed to save review', err)
        setSaveError('Không lưu được kết quả. Kiểm tra mạng rồi thử lại.')
      } finally {
        setSaving(false)
      }
    },
    [user, current, saving, practice, settings.desiredRetention, index, mode],
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
      <Page>
        <Note tone="danger">{error}</Note>
      </Page>
    )
  }

  if (!current) {
    return (
      <Page>
        <div className="space-y-4 pt-6 text-center">
        <p className="text-4xl">{done.reviewed > 0 ? '🎉' : '✓'}</p>
        <h1 className="text-2xl font-bold">
          {done.reviewed > 0 ? 'Xong phiên hôm nay' : 'Hôm nay không còn thẻ nào'}
        </h1>

        {done.reviewed > 0 ? (
          <p className="text-slate-500">
            Đã ôn {done.reviewed} lượt
            {done.again > 0 && `, trong đó ${done.again} lượt quên`}.
          </p>
        ) : (
          /* Opened after finishing, which the home screen now allows: report
             the day rather than implying nothing happened. */
          <p className="text-slate-500">
            {session.doneToday > 0
              ? `Bạn đã ôn ${session.doneToday} lượt hôm nay.`
              : 'Chưa có thẻ nào tới hạn. Thêm bộ thẻ vào kế hoạch học để bắt đầu.'}
          </p>
        )}

        {session.nextDue && (
          <p className="text-sm text-slate-500">
            Thẻ tiếp theo đến hạn {describeDue(session.nextDue)}.
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
            to="/flashcards/review"
            className="text-sm text-slate-500 underline underline-offset-2"
          >
            Ôn thêm — chọn bộ, trạng thái và kiểu hỏi
          </Link>
          <Link to="/" className="text-sm text-slate-500 underline underline-offset-2">
            Về trang chủ
          </Link>
        </div>
        </div>
      </Page>
    )
  }

  const total = queue.length
  const position = Math.min(index + 1, total)

  return (
    <Page>
      <div className="mb-4 flex items-center justify-between gap-3 text-sm text-slate-500">
        <span className="tabular-nums">
          {position} / {total}
        </span>
        {practice && <span className="text-amber-700 dark:text-amber-500">Luyện tự do</span>}
        <button
          type="button"
          onClick={exitSession}
          className="underline underline-offset-2"
        >
          Thoát
        </button>
      </div>

      <div className="mb-4 h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className="h-full bg-slate-900 transition-[width] dark:bg-slate-100"
          style={{ width: `${(index / total) * 100}%` }}
        />
      </div>

      <ReviewCard
        card={current}
        mode={mode}
        revealed={revealed}
        onReveal={() => setRevealed(true)}
      >
        {mode === 'typing' && (
          <TypingAnswer
            value={typed}
            verdict={verdict}
            term={current.term}
            onChange={setTyped}
            onSubmit={() => {
              setVerdict(checkAnswer(typed, current.term))
              setRevealed(true)
            }}
          />
        )}
      </ReviewCard>

      {saveError && (
        <div className="mt-3">
          <Note tone="danger">{saveError}</Note>
        </div>
      )}

      <div className="mt-4">
        {revealed && options ? (
          <RatingButtons
            options={options}
            onRate={(rating) => void handleRate(rating)}
            disabled={saving}
          />
        ) : mode === 'typing' ? (
          <Button variant="secondary" onClick={() => setRevealed(true)} className="w-full">
            Chịu, xem đáp án
          </Button>
        ) : (
          <Button onClick={() => setRevealed(true)} className="w-full">
            Lật thẻ
          </Button>
        )}
      </div>
    </Page>
  )
}

/**
 * "hôm nay lúc 21:40", "ngày mai lúc 09:00", "thứ Năm, 23/10".
 *
 * A bare date answers the wrong question. What someone who has just finished
 * wants to know is how long until there is something again, and for the next
 * day or two that is better said in words than in a date.
 */
function describeDue(due: Date, now: Date = new Date()): string {
  const time = due.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  const days = Math.round(
    (startOfDay(due).getTime() - startOfDay(now).getTime()) / 86_400_000,
  )
  if (days <= 0) return `hôm nay lúc ${time}`
  if (days === 1) return `ngày mai lúc ${time}`
  if (days < 7) return `sau ${days} ngày, lúc ${time}`
  return `vào ${due.toLocaleDateString('vi-VN')}`
}
