import { Rating, State, createEmptyCard, fsrs, generatorParameters } from 'ts-fsrs'
import type { Card as FsrsCard, Grade } from 'ts-fsrs'
import type { CardSrs } from '@/modules/flashcards/domain/card.types'

/** The four buttons, in the order they appear and the order keys 1-4 map to. */
export const RATINGS = ['again', 'hard', 'good', 'easy'] as const
export type ReviewRating = (typeof RATINGS)[number]

export const RATING_LABELS: Record<ReviewRating, string> = {
  again: 'Quên',
  hard: 'Khó',
  good: 'Được',
  easy: 'Dễ',
}

/** 1-4 as stored in reviewLogs, matching ts-fsrs' own Rating values. */
export const RATING_VALUES: Record<ReviewRating, 1 | 2 | 3 | 4> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
}

const STATE_TO_NAME: Record<number, CardSrs['state']> = {
  [State.New]: 'new',
  [State.Learning]: 'learning',
  [State.Review]: 'review',
  [State.Relearning]: 'relearning',
}

const NAME_TO_STATE: Record<CardSrs['state'], State> = {
  new: State.New,
  learning: State.Learning,
  review: State.Review,
  relearning: State.Relearning,
}

export function createScheduler(desiredRetention: number) {
  return fsrs(generatorParameters({ request_retention: desiredRetention }))
}

/** Our stored shape -> the shape ts-fsrs works with. */
export function toFsrsCard(srs: CardSrs | null, fallbackNow: Date): FsrsCard {
  if (!srs) return createEmptyCard(fallbackNow)
  return {
    due: srs.due,
    stability: srs.stability,
    difficulty: srs.difficulty,
    elapsed_days: 0,
    scheduled_days: 0,
    learning_steps: 0,
    reps: srs.reps,
    lapses: srs.lapses,
    state: NAME_TO_STATE[srs.state],
    last_review: srs.lastReview ?? undefined,
  }
}

export function fromFsrsCard(card: FsrsCard): CardSrs {
  return {
    due: card.due,
    stability: card.stability,
    difficulty: card.difficulty,
    reps: card.reps,
    lapses: card.lapses,
    state: STATE_TO_NAME[card.state] ?? 'new',
    lastReview: card.last_review ?? null,
  }
}

export interface ScheduledOption {
  rating: ReviewRating
  srs: CardSrs
  /** Days until this choice brings the card back; fractional for same-day steps. */
  intervalDays: number
}

/**
 * What each of the four buttons would do, so the interval can be shown on the
 * button before it is pressed.
 */
export function previewRatings(
  srs: CardSrs | null,
  desiredRetention: number,
  now: Date = new Date(),
): Record<ReviewRating, ScheduledOption> {
  const scheduler = createScheduler(desiredRetention)
  const record = scheduler.repeat(toFsrsCard(srs, now), now)

  const build = (rating: ReviewRating): ScheduledOption => {
    const next = record[RATING_VALUES[rating] as Grade].card
    return {
      rating,
      srs: fromFsrsCard(next),
      intervalDays: (next.due.getTime() - now.getTime()) / 86_400_000,
    }
  }

  return {
    again: build('again'),
    hard: build('hard'),
    good: build('good'),
    easy: build('easy'),
  }
}

export function applyRating(
  srs: CardSrs | null,
  rating: ReviewRating,
  desiredRetention: number,
  now: Date = new Date(),
): CardSrs {
  const scheduler = createScheduler(desiredRetention)
  const result = scheduler.next(
    toFsrsCard(srs, now),
    now,
    RATING_VALUES[rating] as Grade,
  )
  return fromFsrsCard(result.card)
}

/**
 * "10 phút", "1 ngày", "4 tháng" — what the button promises.
 *
 * Rounded rather than exact: the point is to tell Hard from Easy at a glance,
 * not to report a number anyone will check.
 */
export function formatInterval(days: number): string {
  const minutes = days * 24 * 60
  if (minutes < 1) return '<1 phút'
  if (minutes < 60) return `${Math.round(minutes)} phút`
  if (days < 1) return `${Math.round(minutes / 60)} giờ`
  if (days < 30) return `${Math.round(days)} ngày`
  if (days < 365) return `${Math.round(days / 30)} tháng`
  const years = days / 365
  return `${years < 10 ? years.toFixed(1) : Math.round(years)} năm`
}
