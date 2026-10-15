import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@/shared/auth/useAuth'
import { Button } from '@/shared/ui/Button'
import { Sheet } from '@/shared/ui/Sheet'
import { Spinner } from '@/shared/ui/Spinner'
import { CardForm } from '@/modules/flashcards/components/CardForm'
import { CardRow } from '@/modules/flashcards/components/CardRow'
import { getDeck } from '@/modules/flashcards/data/decks.repo'
import { createCard, deleteCard, updateCard } from '@/modules/flashcards/data/cards.repo'
import { useCards } from '@/modules/flashcards/data/useCards'
import {
  STATUS_LABELS,
  cardMatches,
  cardStatus,
  countByStatus,
} from '@/modules/flashcards/domain/card-status'
import type { CardStatus } from '@/modules/flashcards/domain/card-status'
import type { Card, Deck } from '@/modules/flashcards/domain/card.types'

type Filter = CardStatus | 'all'
type Editing = { mode: 'new' } | { mode: 'edit'; card: Card } | null

export default function DeckDetailPage() {
  const { deckId = '' } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { cards, loading, error } = useCards(deckId)

  const [deck, setDeck] = useState<Deck | null>(null)
  const [deckLoading, setDeckLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [editing, setEditing] = useState<Editing>(null)
  const [deleting, setDeleting] = useState<Card | null>(null)

  useEffect(() => {
    if (!user || !deckId) return
    let cancelled = false
    void getDeck(user.uid, deckId)
      .catch((err) => {
        console.error('Failed to load deck', err)
        return null
      })
      .then((loaded) => {
        if (cancelled) return
        setDeck(loaded)
        setDeckLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [user, deckId])

  const counts = useMemo(() => countByStatus(cards), [cards])
  const visible = useMemo(
    () =>
      cards.filter(
        (card) =>
          cardMatches(card, search) && (filter === 'all' || cardStatus(card) === filter),
      ),
    [cards, search, filter],
  )

  if (deckLoading) return <Spinner />

  if (!deck) {
    return (
      <div className="mx-auto max-w-lg space-y-3 px-5 pt-8">
        <p className="text-slate-500">Bộ thẻ không tồn tại hoặc đã bị xoá.</p>
        <Link to="/flashcards" className="text-sm text-slate-500">
          ← Về danh sách bộ thẻ
        </Link>
      </div>
    )
  }

  const filters: { value: Filter; label: string; count: number }[] = [
    { value: 'all', label: 'Tất cả', count: cards.length },
    { value: 'new', label: STATUS_LABELS.new, count: counts.new },
    { value: 'learning', label: STATUS_LABELS.learning, count: counts.learning },
    { value: 'due', label: STATUS_LABELS.due, count: counts.due },
    { value: 'known', label: STATUS_LABELS.known, count: counts.known },
  ]

  return (
    <div className="mx-auto max-w-lg px-5 pt-6">
      <Link to="/flashcards" className="text-sm text-slate-500">
        ← Bộ thẻ
      </Link>
      <h1 className="mt-1 text-2xl font-bold">{deck.name}</h1>
      {deck.description && (
        <p className="mt-1 text-slate-500 dark:text-slate-400">{deck.description}</p>
      )}
      {deck.sourceUrl && (
        <a
          href={deck.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-block text-sm text-slate-500 underline underline-offset-2"
        >
          Nguồn ↗
        </a>
      )}

      {cards.length > 0 && (
        <Button
          onClick={() => navigate(`/flashcards/review/session?deck=${deckId}`)}
          className="mt-4 w-full"
        >
          Ôn bộ này
          {counts.due + counts.learning > 0 && ` · ${counts.due + counts.learning} đến hạn`}
        </Button>
      )}

      <div className="mt-2 flex gap-2">
        <Button
          variant="secondary"
          onClick={() => navigate(`/flashcards/${deckId}/import`)}
          className="flex-1"
        >
          + Nhập TSV
        </Button>
        <Button variant="secondary" onClick={() => setEditing({ mode: 'new' })}>
          + Một thẻ
        </Button>
      </div>

      {cards.length > 0 && (
        <>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm từ, nghĩa hoặc ví dụ…"
            className="mt-4 w-full rounded-xl border border-slate-300 bg-transparent px-3.5 py-3 text-base outline-none focus:border-slate-900 dark:border-slate-700 dark:focus:border-slate-300"
          />

          <div className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1">
            {filters.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setFilter(item.value)}
                className={[
                  'no-select shrink-0 rounded-full border px-3 py-1.5 text-sm transition',
                  filter === item.value
                    ? 'border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900'
                    : 'border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300',
                ].join(' ')}
              >
                {item.label} <span className="tabular-nums opacity-60">{item.count}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {error && (
        <p role="alert" className="mt-4 break-words rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <div className="mt-3">
        {loading ? (
          <Spinner />
        ) : cards.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
            <p className="font-medium">Bộ thẻ còn trống</p>
            <p className="mt-1 text-sm text-slate-500">
              Dán danh sách TSV vào, hoặc thêm từng thẻ một.
            </p>
          </div>
        ) : visible.length === 0 ? (
          <p className="py-8 text-center text-slate-500">Không có thẻ nào khớp.</p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
            {visible.map((card) => (
              <CardRow
                key={card.id}
                card={card}
                expanded={expanded === card.id}
                onToggle={() => setExpanded((prev) => (prev === card.id ? null : card.id))}
                onEdit={() => setEditing({ mode: 'edit', card })}
                onDelete={() => setDeleting(card)}
              />
            ))}
          </ul>
        )}
      </div>

      {visible.length > 0 && visible.length !== cards.length && (
        <p className="mt-3 text-center text-sm text-slate-500">
          Hiện {visible.length} / {cards.length} thẻ
        </p>
      )}

      <Sheet
        open={editing !== null}
        title={editing?.mode === 'edit' ? 'Sửa thẻ' : 'Thêm thẻ'}
        onClose={() => setEditing(null)}
      >
        {editing && user && (
          <CardForm
            key={editing.mode === 'edit' ? editing.card.id : 'new'}
            card={editing.mode === 'edit' ? editing.card : undefined}
            keepOpen={editing.mode === 'new'}
            siblings={cards}
            onOpenExisting={(existing) => setEditing({ mode: 'edit', card: existing })}
            onSubmit={async (draft) => {
              if (editing.mode === 'edit') {
                await updateCard(user.uid, editing.card.id, draft)
                setEditing(null)
              } else {
                await createCard(user.uid, deckId, draft)
              }
            }}
            onCancel={() => setEditing(null)}
          />
        )}
      </Sheet>

      <Sheet open={deleting !== null} title="Xoá thẻ?" onClose={() => setDeleting(null)}>
        <p className="text-slate-600 dark:text-slate-300">
          Xoá <strong>{deleting?.term}</strong> cùng lịch sử ôn tập của nó. Không khôi
          phục được.
        </p>
        <div className="mt-5 flex gap-2">
          <Button
            variant="danger"
            className="flex-1"
            onClick={() => {
              if (user && deleting) void deleteCard(user.uid, deckId, deleting.id)
              setDeleting(null)
            }}
          >
            Xoá thẻ
          </Button>
          <Button variant="secondary" onClick={() => setDeleting(null)}>
            Huỷ
          </Button>
        </div>
      </Sheet>
    </div>
  )
}
