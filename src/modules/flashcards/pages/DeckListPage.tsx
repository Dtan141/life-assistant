import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/shared/auth/useAuth'
import { Button } from '@/shared/ui/Button'
import { EmptyState, Note } from '@/shared/ui/Panel'
import { Page, PageHeader } from '@/shared/ui/Page'
import { Sheet } from '@/shared/ui/Sheet'
import { Spinner } from '@/shared/ui/Spinner'
import { CollectionGroup } from '@/modules/flashcards/components/CollectionGroup'
import { DeckCard } from '@/modules/flashcards/components/DeckCard'
import { DeckForm } from '@/modules/flashcards/components/DeckForm'
import { useDecks } from '@/modules/flashcards/data/useDecks'
import {
  createDeck,
  deleteDeckWithCards,
  setDeckArchived,
  setDeckInPlan,
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

  /**
   * Standalone decks first, then each collection as one collapsed row. A
   * collection of fifty topics would otherwise push everything else off screen.
   */
  const { loose, collections } = useMemo(() => {
    const loose: Deck[] = []
    const collections = new Map<string, Deck[]>()
    for (const deck of visible) {
      if (!deck.collection) {
        loose.push(deck)
        continue
      }
      const group = collections.get(deck.collection) ?? []
      group.push(deck)
      collections.set(deck.collection, group)
    }
    return { loose, collections: [...collections.entries()] }
  }, [visible])
  const archivedCount = decks.length - decks.filter((deck) => !deck.archived).length

  if (!user) return null

  function deckActions(deck: Deck) {
    return {
      onEdit: () => setEditing({ mode: 'edit', deck }),
      onArchiveToggle: () => {
        if (user) void setDeckArchived(user.uid, deck.id, !deck.archived)
      },
      onDelete: () => setDeleting(deck),
      onPlanToggle: () => {
        if (user) void setDeckInPlan(user.uid, deck.id, !deck.inPlan)
      },
    }
  }

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
    <Page>
      <PageHeader
        title="Bộ thẻ"
        action={
          <Button onClick={() => setEditing({ mode: 'create' })}>+ Tạo bộ thẻ</Button>
        }
      />

      {error && (
        <div className="mb-4">
          <Note tone="danger">{error}</Note>
        </div>
      )}

      {loading ? (
        <Spinner />
      ) : visible.length === 0 ? (
        <EmptyState title="Chưa có bộ thẻ nào">
          Tạo một bộ, rồi dán danh sách từ vào.{' '}
          <Link to="/flashcards/huong-dan-nhap" className="underline underline-offset-2">
            Xem cách chuẩn bị file
          </Link>
          .
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {loose.map((deck) => (
            <DeckCard key={deck.id} deck={deck} {...deckActions(deck)} />
          ))}

          {collections.map(([name, group]) => (
            <CollectionGroup key={name} name={name} decks={group}>
              {group.map((deck) => (
                <DeckCard key={deck.id} deck={deck} {...deckActions(deck)} />
              ))}
            </CollectionGroup>
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
    </Page>
  )
}
