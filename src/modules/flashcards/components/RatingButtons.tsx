import { RATINGS, RATING_LABELS, formatInterval } from '@/modules/flashcards/domain/srs'
import type { ReviewRating, ScheduledOption } from '@/modules/flashcards/domain/srs'

const TONE: Record<ReviewRating, string> = {
  again: 'border-red-300 text-red-700 dark:border-red-900 dark:text-red-300',
  hard: 'border-amber-300 text-amber-800 dark:border-amber-900 dark:text-amber-300',
  good: 'border-emerald-300 text-emerald-800 dark:border-emerald-900 dark:text-emerald-300',
  easy: 'border-sky-300 text-sky-800 dark:border-sky-900 dark:text-sky-300',
}

interface Props {
  options: Record<ReviewRating, ScheduledOption>
  onRate: (rating: ReviewRating) => void
  disabled?: boolean
}

export function RatingButtons({ options, onRate, disabled }: Props) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {RATINGS.map((rating) => (
        <button
          key={rating}
          type="button"
          disabled={disabled}
          onClick={() => onRate(rating)}
          className={`no-select flex min-h-16 flex-col items-center justify-center gap-0.5 rounded-xl border px-1 transition active:scale-[0.97] disabled:opacity-50 ${TONE[rating]}`}
        >
          <span className="text-sm font-medium">{RATING_LABELS[rating]}</span>
          {/* The interval is the whole point of four buttons rather than two. */}
          <span className="text-xs tabular-nums opacity-70">
            {formatInterval(options[rating].intervalDays)}
          </span>
        </button>
      ))}
    </div>
  )
}
