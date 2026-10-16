import { QuietButton } from '@/shared/ui/Panel'
import { STATUS_LABELS, cardStatus } from '@/modules/flashcards/domain/card-status'
import type { Card } from '@/modules/flashcards/domain/card.types'

const STATUS_TONE: Record<string, string> = {
  new: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  learning: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  due: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  known: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
}

interface Props {
  card: Card
  expanded: boolean
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
}

export function CardRow({ card, expanded, onToggle, onEdit, onDelete }: Props) {
  const status = cardStatus(card)

  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-start gap-3 px-4 py-3 text-left active:bg-slate-50 dark:active:bg-slate-900"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="truncate font-medium">{card.term}</span>
            {card.partOfSpeech && (
              <span className="shrink-0 text-xs text-slate-400">{card.partOfSpeech}</span>
            )}
          </div>
          <p className={`text-sm text-slate-500 ${expanded ? '' : 'truncate'}`}>
            {card.definition}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-md px-1.5 py-0.5 text-xs ${STATUS_TONE[status]}`}
        >
          {STATUS_LABELS[status]}
        </span>
      </button>

      {expanded && (
        <div className="space-y-2 px-4 pb-3 text-sm">
          {card.pronunciation && (
            <Detail label="Phát âm">
              <span className="font-mono">{card.pronunciation}</span>
            </Detail>
          )}
          {card.example && <Detail label="Ví dụ">{card.example}</Detail>}
          {card.myExample && <Detail label="Câu của tôi">{card.myExample}</Detail>}
          {card.synonyms.length > 0 && (
            <Detail label="Đồng nghĩa">{card.synonyms.join('; ')}</Detail>
          )}
          {card.antonyms.length > 0 && (
            <Detail label="Trái nghĩa">{card.antonyms.join('; ')}</Detail>
          )}
          {card.wordFamily && <Detail label="Họ từ">{card.wordFamily}</Detail>}
          {card.tags.length > 0 && <Detail label="Tags">{card.tags.join(', ')}</Detail>}

          <div className="-ml-3 flex gap-1 pt-1">
            <QuietButton onClick={onEdit}>Sửa</QuietButton>
            <QuietButton onClick={onDelete} tone="danger">
              Xoá
            </QuietButton>
          </div>
        </div>
      )}
    </li>
  )
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <p className="flex gap-2">
      <span className="w-20 shrink-0 text-slate-400">{label}</span>
      <span className="min-w-0 flex-1">{children}</span>
    </p>
  )
}
