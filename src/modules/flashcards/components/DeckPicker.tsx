import { useMemo, useState } from 'react'
import { Button } from '@/shared/ui/Button'
import { Sheet } from '@/shared/ui/Sheet'
import { foldForSearch } from '@/modules/flashcards/domain/card-status'
import type { Deck } from '@/modules/flashcards/domain/card.types'

interface Props {
  decks: Deck[]
  selected: ReadonlySet<string>
  onChange: (selected: Set<string>) => void
}

/**
 * Chooses which decks a session draws from.
 *
 * Rendering every deck as a chip worked for three and breaks at fifty — the
 * list pushes the start button off screen and there is no way to find one deck
 * among them. So the selection collapses to a single line and opens a sheet
 * with search, grouped by collection the same way the library is.
 */
export function DeckPicker({ decks, selected, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const matching = useMemo(() => {
    const needle = foldForSearch(query)
    if (!needle) return decks
    // Same accent-insensitive matching as the card search, so "tu vung" finds
    // "Từ vựng" here too.
    return decks.filter(
      (deck) =>
        foldForSearch(deck.name).includes(needle) ||
        foldForSearch(deck.collection).includes(needle),
    )
  }, [decks, query])

  const groups = useMemo(() => {
    const out = new Map<string, Deck[]>()
    for (const deck of matching) {
      const key = deck.collection || ''
      out.set(key, [...(out.get(key) ?? []), deck])
    }
    return [...out.entries()].sort(([a], [b]) => a.localeCompare(b, 'vi'))
  }, [matching])

  function toggle(id: string) {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onChange(next)
  }

  const onlySelected =
    selected.size === 1 ? decks.find((deck) => selected.has(deck.id)) : undefined
  const summary =
    selected.size === 0
      ? 'Tất cả bộ trong kế hoạch học'
      : (onlySelected?.name ?? `${selected.size} bộ thẻ`)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-12 w-full items-center gap-3 rounded-xl border border-slate-300 px-3.5 text-left transition active:scale-[0.99] dark:border-slate-700"
      >
        <span className="min-w-0 flex-1 truncate">{summary}</span>
        <span aria-hidden className="shrink-0 text-slate-400">
          ›
        </span>
      </button>

      <Sheet open={open} title="Chọn bộ thẻ" onClose={() => setOpen(false)}>
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => onChange(new Set())}
            className={`w-full rounded-xl border px-3.5 py-3 text-left transition ${
              selected.size === 0
                ? 'border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900'
                : 'border-slate-300 dark:border-slate-700'
            }`}
          >
            <span className="font-medium">Tất cả bộ trong kế hoạch học</span>
            <span
              className={`block text-sm ${selected.size === 0 ? 'opacity-80' : 'text-slate-500'}`}
            >
              Bỏ qua những bộ chỉ nằm trong thư viện
            </span>
          </button>

          {decks.length > 8 && (
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm bộ thẻ…"
              className="w-full rounded-xl border border-slate-300 bg-transparent px-3.5 py-3 text-base outline-none focus:border-slate-900 dark:border-slate-700 dark:focus:border-slate-300"
            />
          )}

          <div className="max-h-[50dvh] space-y-4 overflow-y-auto">
            {groups.length === 0 && (
              <p className="py-6 text-center text-sm text-slate-500">
                Không có bộ thẻ nào khớp.
              </p>
            )}

            {groups.map(([collection, group]) => (
              <div key={collection || 'loose'}>
                {collection && (
                  <p className="mb-1.5 text-xs font-medium text-slate-400">
                    {collection}
                  </p>
                )}
                <ul className="space-y-1">
                  {group.map((deck) => (
                    <li key={deck.id}>
                      <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-1">
                        <input
                          type="checkbox"
                          checked={selected.has(deck.id)}
                          onChange={() => toggle(deck.id)}
                          className="size-5 shrink-0 accent-slate-900 dark:accent-slate-100"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate">{deck.name}</span>
                          <span className="block text-xs text-slate-400">
                            {deck.cardCount} thẻ
                            {!deck.inPlan && ' · chỉ trong thư viện'}
                          </span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <Button onClick={() => setOpen(false)} className="w-full">
            Xong
          </Button>
        </div>
      </Sheet>
    </>
  )
}
