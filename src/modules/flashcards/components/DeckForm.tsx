import { useState } from 'react'
import { Button } from '@/shared/ui/Button'
import { TextAreaField, TextField } from '@/shared/ui/Field'
import type { DeckInput } from '@/modules/flashcards/data/decks.repo'
import type { Deck } from '@/modules/flashcards/domain/card.types'

interface Props {
  deck?: Deck
  onSubmit: (input: DeckInput) => Promise<void>
  onCancel: () => void
}

export function DeckForm({ deck, onSubmit, onCancel }: Props) {
  const [name, setName] = useState(deck?.name ?? '')
  const [description, setDescription] = useState(deck?.description ?? '')
  const [tags, setTags] = useState(deck?.tags.join(', ') ?? '')
  const [sourceUrl, setSourceUrl] = useState(deck?.sourceUrl ?? '')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [showMore, setShowMore] = useState(
    Boolean(deck?.description || deck?.tags.length || deck?.sourceUrl),
  )

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!name.trim()) {
      setError('Bộ thẻ cần có tên.')
      return
    }

    setBusy(true)
    setError(null)
    try {
      await onSubmit({
        name,
        description,
        sourceUrl,
        tags: tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
      })
    } catch (err) {
      console.error('Failed to save deck', err)
      setError('Lưu không thành công. Thử lại.')
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <TextField
        label="Tên bộ thẻ"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Study4 Listening — Đại bàng"
        hint="Chỉ cần tên là tạo được. Mọi thứ khác thêm sau cũng được."
        error={error ?? undefined}
        autoFocus
        required
      />

      {/* The other three fields are collapsed by default so the form says, at a
          glance, that one field is all it needs. */}
      {!showMore ? (
        <button
          type="button"
          onClick={() => setShowMore(true)}
          className="text-sm text-slate-500 underline underline-offset-2"
        >
          Thêm mô tả, tags, link nguồn
        </button>
      ) : (
        <>
          <TextAreaField
            label="Mô tả"
            optional
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
          />

          <TextField
            label="Tags"
            optional
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            hint="Cách nhau bởi dấu phẩy, ví dụ: study4, listening"
          />

          <TextField
            label="Link nguồn"
            optional
            type="url"
            inputMode="url"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            hint="Trang Notion chứa danh sách từ gốc"
            placeholder="https://notion.so/…"
          />
        </>
      )}

      <div className="flex gap-2 pt-1">
        <Button type="submit" disabled={busy} className="flex-1">
          {busy ? 'Đang lưu…' : deck ? 'Lưu thay đổi' : 'Tạo bộ thẻ'}
        </Button>
        <Button variant="secondary" onClick={onCancel} disabled={busy}>
          Huỷ
        </Button>
      </div>
    </form>
  )
}
