import { useMemo, useState } from 'react'
import { useAuth } from '@/shared/auth/useAuth'
import { Button } from '@/shared/ui/Button'
import { Sheet } from '@/shared/ui/Sheet'
import { Spinner } from '@/shared/ui/Spinner'
import { DeckCard } from '@/modules/flashcards/components/DeckCard'
import { DeckForm } from '@/modules/flashcards/components/DeckForm'
import { useDecks } from '@/modules/flashcards/data/useDecks'
import {
  createDeck,
  deleteDeckWithCards,
  setDeckArchived,
  updateDeck,
} from '@/modules/flashcards/data/decks.repo'
import type { Deck } from '@/modules/flashcards/domain/card.types'

type Editing = { mode: 'create' } | { mode: 'edit'; deck: Deck } | null

export default function DeckListPage() {
  const { user } = useAuth()
  const { decks, loading, error } = useDecks()
  const [showArchived, setShowArchived] = useState(false)
  const [editing, setEditing] = useState<Editing>(null)
  const [deleting, setDeleting] = useState<Deck | null>(null)
  const [busy, setBusy] = useState(false)

  const visible = useMemo(
    () => (showArchived ? decks : decks.filter((deck) => !deck.archived)),
    [decks, showArchived],
  )
  const archivedCount = decks.length - decks.filter((deck) => !deck.archived).length

  if (!user) return null

  async function handleSubmit(input: Parameters<typeof createDeck>[1]) {
    if (!user) return
    if (editing?.mode === 'edit') {
      await updateDeck(user.uid, editing.deck.id, input)
    } else {
      await createDeck(user.uid, input)
    }
    setEditing(null)
  }

  async function handleDelete() {
    if (!user || !deleting) return
    setBusy(true)
    try {
      await deleteDeckWithCards(user.uid, deleting.id)
      setDeleting(null)
    } catch (err) {
      console.error('Failed to delete deck', err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-lg px-5 pt-8">
      <header className="mb-5 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Bộ thẻ</h1>
        <Button onClick={() => setEditing({ mode: 'create' })}>+ Tạo bộ thẻ</Button>
      </header>

      {error && (
        <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      {loading ? (
        <Spinner />
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
          <p className="font-medium">Chưa có bộ thẻ nào</p>
          <p className="mt-1 text-sm text-slate-500">
            Tạo một bộ, rồi dán danh sách từ dạng TSV vào.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {visible.map((deck) => (
            <DeckCard
              key={deck.id}
              deck={deck}
              onEdit={() => setEditing({ mode: 'edit', deck })}
              onArchiveToggle={() => void setDeckArchived(user.uid, deck.id, !deck.archived)}
              onDelete={() => setDeleting(deck)}
            />
          ))}
        </ul>
      )}

      {archivedCount > 0 && (
        <Button
          variant="ghost"
          onClick={() => setShowArchived((prev) => !prev)}
          className="mt-4 w-full"
        >
          {showArchived ? 'Ẩn bộ đã lưu trữ' : `Hiện ${archivedCount} bộ đã lưu trữ`}
        </Button>
      )}

      <Sheet
        open={editing !== null}
        title={editing?.mode === 'edit' ? 'Sửa bộ thẻ' : 'Tạo bộ thẻ'}
        onClose={() => setEditing(null)}
      >
        {editing && (
          <DeckForm
            // Remount on target change, so the form never shows the previous deck's values.
            key={editing.mode === 'edit' ? editing.deck.id : 'new'}
            deck={editing.mode === 'edit' ? editing.deck : undefined}
            onSubmit={handleSubmit}
            onCancel={() => setEditing(null)}
          />
        )}
      </Sheet>

      <Sheet open={deleting !== null} title="Xoá bộ thẻ?" onClose={() => setDeleting(null)}>
        <p className="text-slate-600 dark:text-slate-300">
          Xoá <strong>{deleting?.name}</strong> sẽ xoá luôn{' '}
          <strong>{deleting?.cardCount} thẻ</strong> bên trong, kèm toàn bộ lịch sử ôn tập.
          Không khôi phục được.
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Nếu chỉ muốn cất đi, dùng <em>Lưu trữ</em> thay vì xoá.
        </p>
        <div className="mt-5 flex gap-2">
          <Button variant="danger" onClick={() => void handleDelete()} disabled={busy} className="flex-1">
            {busy ? 'Đang xoá…' : 'Xoá vĩnh viễn'}
          </Button>
          <Button variant="secondary" onClick={() => setDeleting(null)} disabled={busy}>
            Huỷ
          </Button>
        </div>
      </Sheet>
    </div>
  )
}
