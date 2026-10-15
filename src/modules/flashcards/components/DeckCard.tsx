import { Link } from 'react-router-dom'
import type { Deck } from '@/modules/flashcards/domain/card.types'

interface Props {
  deck: Deck
  onEdit: () => void
  onArchiveToggle: () => void
  onDelete: () => void
}

export function DeckCard({ deck, onEdit, onArchiveToggle, onDelete }: Props) {
  return (
    <li className="rounded-2xl border border-slate-200 dark:border-slate-800">
      <Link
        to={`/flashcards/${deck.id}`}
        className="block px-4 pt-4 pb-3 active:bg-slate-50 dark:active:bg-slate-900"
      >
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="truncate font-semibold">{deck.name}</h2>
          <span className="shrink-0 text-sm tabular-nums text-slate-500">
            {deck.cardCount} thẻ
          </span>
        </div>

        {deck.description && (
          <p className="mt-1 line-clamp-2 text-sm text-slate-500">{deck.description}</p>
        )}

        {deck.tags.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {deck.tags.map((tag) => (
              <li
                key={tag}
                className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300"
              >
                {tag}
              </li>
            ))}
          </ul>
        )}

        {deck.archived && (
          <p className="mt-2 text-xs text-slate-400">Đã lưu trữ</p>
        )}
      </Link>

      <div className="flex gap-1 border-t border-slate-100 px-2 py-1 dark:border-slate-800">
        <Action onClick={onEdit}>Sửa</Action>
        <Action onClick={onArchiveToggle}>{deck.archived ? 'Bỏ lưu trữ' : 'Lưu trữ'}</Action>
        <Action onClick={onDelete} danger>
          Xoá
        </Action>
      </div>
    </li>
  )
}

function Action({
  onClick,
  danger,
  children,
}: {
  onClick: () => void
  danger?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'no-select min-h-10 flex-1 rounded-lg px-2 text-sm transition active:scale-[0.98]',
        danger
          ? 'text-red-600 active:bg-red-50 dark:text-red-400 dark:active:bg-red-950'
          : 'text-slate-600 active:bg-slate-100 dark:text-slate-300 dark:active:bg-slate-800',
      ].join(' ')}
    >
      {children}
    </button>
  )
}
