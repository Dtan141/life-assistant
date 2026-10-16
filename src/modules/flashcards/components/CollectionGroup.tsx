import { useState } from 'react'
import type { ReactNode } from 'react'
import type { Deck } from '@/modules/flashcards/domain/card.types'

interface Props {
  name: string
  decks: Deck[]
  children: ReactNode
}

/**
 * A collection of sub-decks, collapsed by default.
 *
 * Fifty TOEIC topics laid out flat would bury whatever else is in the library,
 * so a collection reads as one row until opened, and says how much of itself is
 * being studied.
 */
export function CollectionGroup({ name, decks, children }: Props) {
  const [open, setOpen] = useState(false)
  const planned = decks.filter((deck) => deck.inPlan).length
  const cards = decks.reduce((total, deck) => total + deck.cardCount, 0)

  return (
    <li className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="no-select flex w-full items-center gap-3 px-4 py-3.5 text-left transition active:bg-slate-50 dark:active:bg-slate-900"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{name}</span>
          <span className="block text-sm text-slate-500">
            {decks.length} bộ · {cards} thẻ ·{' '}
            {planned === 0 ? (
              'chưa học bộ nào'
            ) : (
              <span className="text-emerald-700 dark:text-emerald-400">
                đang học {planned}/{decks.length}
              </span>
            )}
          </span>
        </span>
        <span
          aria-hidden
          className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-90' : ''}`}
        >
          ›
        </span>
      </button>

      {open && (
        <ul className="space-y-2 border-t border-slate-100 p-2 dark:border-slate-800">
          {children}
        </ul>
      )}
    </li>
  )
}
