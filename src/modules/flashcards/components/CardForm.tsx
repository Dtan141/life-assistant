import { useMemo, useState } from 'react'
import { Button } from '@/shared/ui/Button'
import { TextAreaField, TextField } from '@/shared/ui/Field'
import { normalizeTerm } from '@/modules/flashcards/domain/tsv-parser'
import type { Card, CardDraft } from '@/modules/flashcards/domain/card.types'

interface Props {
  card?: Card
  onSubmit: (draft: CardDraft) => Promise<void>
  onCancel: () => void
  /** Keeps the form open and cleared after saving, for adding several in a row. */
  keepOpen?: boolean
  /** Other cards in the deck, so a clash can be pointed out while typing. */
  siblings?: readonly Card[]
  /** Offered alongside the clash warning, to edit that card instead. */
  onOpenExisting?: (card: Card) => void
}

const list = (value: string) =>
  value
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean)

export function CardForm({
  card,
  onSubmit,
  onCancel,
  keepOpen = false,
  siblings,
  onOpenExisting,
}: Props) {
  const [term, setTerm] = useState(card?.term ?? '')
  const [definition, setDefinition] = useState(card?.definition ?? '')
  const [pronunciation, setPronunciation] = useState(card?.pronunciation ?? '')
  const [partOfSpeech, setPartOfSpeech] = useState(card?.partOfSpeech ?? '')
  const [example, setExample] = useState(card?.example ?? '')
  const [synonyms, setSynonyms] = useState(card?.synonyms.join('; ') ?? '')
  const [antonyms, setAntonyms] = useState(card?.antonyms.join('; ') ?? '')
  const [tags, setTags] = useState(card?.tags.join(', ') ?? '')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // A warning, not a block: the TSV import offers "keep both", so typing a
  // second card for the same word must stay possible here too.
  const clash = useMemo(() => {
    const key = normalizeTerm(term)
    if (!key || !siblings) return undefined
    return siblings.find((other) => other.termLower === key && other.id !== card?.id)
  }, [term, siblings, card])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!term.trim() || !definition.trim()) {
      setError('Cần có cả từ và nghĩa.')
      return
    }

    setBusy(true)
    setError(null)
    try {
      await onSubmit({
        term: term.trim(),
        termLower: normalizeTerm(term),
        definition: definition.trim(),
        pronunciation: pronunciation.trim(),
        partOfSpeech: partOfSpeech.trim(),
        example: example.trim(),
        synonyms: list(synonyms),
        antonyms: list(antonyms),
        tags: tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
      })

      if (keepOpen) {
        setTerm('')
        setDefinition('')
        setPronunciation('')
        setPartOfSpeech('')
        setExample('')
        setSynonyms('')
        setAntonyms('')
        setBusy(false)
      }
    } catch (err) {
      console.error('Failed to save card', err)
      setError('Lưu không thành công. Thử lại.')
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5">
      <TextField
        label="Từ"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        error={error ?? undefined}
        autoFocus
        required
      />

      {clash && (
        <div className="-mt-2 rounded-xl bg-amber-50 p-3 text-sm dark:bg-amber-950">
          <p className="text-amber-800 dark:text-amber-300">
            Bộ này đã có <strong>{clash.term}</strong>: {clash.definition}
          </p>
          <div className="mt-2 flex flex-wrap gap-3">
            {onOpenExisting && (
              <button
                type="button"
                onClick={() => onOpenExisting(clash)}
                className="text-amber-900 underline underline-offset-2 dark:text-amber-200"
              >
                Sửa thẻ đã có
              </button>
            )}
            <span className="text-amber-700 dark:text-amber-400">
              hoặc cứ thêm, sẽ có hai thẻ cùng từ.
            </span>
          </div>
        </div>
      )}

      <TextAreaField
        label="Nghĩa"
        value={definition}
        onChange={(e) => setDefinition(e.target.value)}
        rows={2}
        required
      />
      <div className="grid grid-cols-2 gap-3">
        <TextField
          label="Phát âm"
          optional
          value={pronunciation}
          onChange={(e) => setPronunciation(e.target.value)}
          placeholder="/…/"
        />
        <TextField
          label="Loại từ"
          optional
          value={partOfSpeech}
          onChange={(e) => setPartOfSpeech(e.target.value)}
          placeholder="n, v, adj…"
        />
      </div>
      <TextAreaField
        label="Ví dụ"
        optional
        value={example}
        onChange={(e) => setExample(e.target.value)}
        rows={2}
      />
      <TextField
        label="Đồng nghĩa"
        optional
        value={synonyms}
        onChange={(e) => setSynonyms(e.target.value)}
        hint="Cách nhau bởi dấu chấm phẩy"
      />
      <TextField
        label="Trái nghĩa"
        optional
        value={antonyms}
        onChange={(e) => setAntonyms(e.target.value)}
        hint="Cách nhau bởi dấu chấm phẩy"
      />
      <TextField
        label="Tags"
        optional
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        hint="Cách nhau bởi dấu phẩy, ví dụ: can-on-ky"
      />

      <div className="flex gap-2 pt-1">
        <Button type="submit" disabled={busy} className="flex-1">
          {busy ? 'Đang lưu…' : card ? 'Lưu thay đổi' : 'Thêm thẻ'}
        </Button>
        <Button variant="secondary" onClick={onCancel} disabled={busy}>
          {keepOpen ? 'Xong' : 'Huỷ'}
        </Button>
      </div>
    </form>
  )
}
