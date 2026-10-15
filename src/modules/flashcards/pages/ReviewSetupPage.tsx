import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSettings } from '@/shared/settings/useSettings'
import { Button } from '@/shared/ui/Button'
import { Spinner } from '@/shared/ui/Spinner'
import { useAllCards } from '@/modules/flashcards/data/useAllCards'
import { useDecks } from '@/modules/flashcards/data/useDecks'
import { STATUS_LABELS, cardStatus } from '@/modules/flashcards/domain/card-status'
import type { CardStatus } from '@/modules/flashcards/domain/card-status'
import { MODE_HINTS, MODE_LABELS, REVIEW_MODES } from '@/modules/flashcards/domain/review-mode'
import type { ReviewMode } from '@/modules/flashcards/domain/review-mode'
import { buildSession } from '@/modules/flashcards/domain/session'

const SELECTABLE: CardStatus[] = ['new', 'learning', 'due']

export default function ReviewSetupPage() {
  const navigate = useNavigate()
  const { decks, loading: decksLoading } = useDecks()
  const { cards, loading: cardsLoading } = useAllCards()
  const { settings } = useSettings()

  const [deckIds, setDeckIds] = useState<Set<string>>(new Set())
  const [statuses, setStatuses] = useState<Set<CardStatus>>(new Set(SELECTABLE))
  const [mode, setMode] = useState<ReviewMode>('en-vi')
  const [practice, setPractice] = useState(false)

  // An empty deck selection means "all", so a fresh visit needs no tapping.
  const scope = useMemo(
    () =>
      cards.filter(
        (card) =>
          (deckIds.size === 0 || deckIds.has(card.deckId)) &&
          statuses.has(cardStatus(card)),
      ),
    [cards, deckIds, statuses],
  )

  // Without today's tally this over-counts slightly; the session screen has the
  // real number. Close enough to decide what to tap.
  const estimate = practice
    ? scope.length
    : buildSession(scope, settings).queue.length

  function toggleDeck(id: string) {
    setDeckIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleStatus(status: CardStatus) {
    setStatuses((prev) => {
      const next = new Set(prev)
      if (next.has(status)) next.delete(status)
      else next.add(status)
      return next
    })
  }

  function start() {
    const params = new URLSearchParams()
    if (deckIds.size > 0) params.set('decks', [...deckIds].join(','))
    if (statuses.size !== SELECTABLE.length) params.set('status', [...statuses].join(','))
    if (mode !== 'en-vi') params.set('card', mode)
    if (practice) params.set('mode', 'practice')
    navigate(`/flashcards/review/session?${params.toString()}`)
  }

  if (decksLoading || cardsLoading) return <Spinner />

  const active = decks.filter((deck) => !deck.archived)

  return (
    <div className="mx-auto max-w-lg space-y-6 px-5 pt-6 pb-4">
      <h1 className="text-2xl font-bold">Ôn tập</h1>

      {cards.length === 0 ? (
        <p className="text-slate-500">
          Chưa có thẻ nào. Vào <strong>Bộ thẻ</strong> để tạo bộ đầu tiên.
        </p>
      ) : (
        <>
          <Group title="Bộ thẻ" note={deckIds.size === 0 ? 'Đang chọn tất cả' : undefined}>
            <div className="flex flex-wrap gap-2">
              <Chip selected={deckIds.size === 0} onClick={() => setDeckIds(new Set())}>
                Tất cả
              </Chip>
              {active.map((deck) => (
                <Chip
                  key={deck.id}
                  selected={deckIds.has(deck.id)}
                  onClick={() => toggleDeck(deck.id)}
                >
                  {deck.name}
                </Chip>
              ))}
            </div>
          </Group>

          <Group title="Trạng thái thẻ">
            <div className="flex flex-wrap gap-2">
              {SELECTABLE.map((status) => (
                <Chip
                  key={status}
                  selected={statuses.has(status)}
                  onClick={() => toggleStatus(status)}
                >
                  {STATUS_LABELS[status]}
                </Chip>
              ))}
            </div>
          </Group>

          <Group title="Kiểu hỏi">
            <div className="grid grid-cols-2 gap-2">
              {REVIEW_MODES.map((value) => (
                <Chip key={value} selected={mode === value} onClick={() => setMode(value)}>
                  {MODE_LABELS[value]}
                </Chip>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-500">{MODE_HINTS[mode]}</p>
          </Group>

          <Group title="Cách ôn">
            <div className="grid grid-cols-2 gap-2">
              <Chip selected={!practice} onClick={() => setPractice(false)}>
                Theo lịch
              </Chip>
              <Chip selected={practice} onClick={() => setPractice(true)}>
                Luyện tự do
              </Chip>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {practice
                ? 'Ôn bao nhiêu tuỳ thích. Kết quả không được ghi lại, lịch ôn giữ nguyên.'
                : `Theo thuật toán FSRS, tối đa ${settings.newPerDay} thẻ mới và ${settings.maxReviewsPerDay} lượt ôn mỗi ngày.`}
            </p>
          </Group>

          <div className="sticky bottom-20 pt-1">
            <Button onClick={start} disabled={estimate === 0} className="w-full">
              {estimate === 0 ? 'Không có thẻ nào khớp' : `Bắt đầu · ${estimate} thẻ`}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

function Group({
  title,
  note,
  children,
}: {
  title: string
  note?: string
  children: React.ReactNode
}) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-medium">
        {title}
        {note && <span className="ml-2 font-normal text-slate-400">{note}</span>}
      </h2>
      {children}
    </section>
  )
}

function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={[
        'no-select min-h-10 rounded-full border px-3.5 text-sm transition active:scale-[0.97]',
        selected
          ? 'border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900'
          : 'border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300',
      ].join(' ')}
    >
      {children}
    </button>
  )
}
