import { cardStatus } from '@/modules/flashcards/domain/card-status'
import type { Card, Deck } from '@/modules/flashcards/domain/card.types'

export interface DailyProgress {
  /** New cards already introduced today. */
  newDone: number
  /** Reviews of already-scheduled cards done today. */
  reviewsDone: number
}

export interface SessionLimits {
  newPerDay: number
  maxReviewsPerDay: number
}

export interface SessionPlan {
  /** The queue, in the order it will be shown. */
  queue: Card[]
  dueCount: number
  newCount: number
  /** Cards that are due but will not fit under today's limits. */
  heldBack: number
}

/**
 * Builds today's queue.
 *
 * Due cards come before new ones: the cost of forgetting something already
 * learned is higher than the cost of meeting a new word a day late. Within the
 * due set, the longest-overdue goes first.
 *
 * New cards and reviews have separate ceilings, as the settings describe them:
 * a backlog of reviews must not block learning anything new, and a burst of new
 * cards must not silently eat the review allowance.
 */
export function buildSession(
  cards: readonly Card[],
  limits: SessionLimits,
  progress: DailyProgress = { newDone: 0, reviewsDone: 0 },
  now: Date = new Date(),
): SessionPlan {
  const due: Card[] = []
  const fresh: Card[] = []

  for (const card of cards) {
    const status = cardStatus(card, now)
    if (status === 'new') fresh.push(card)
    else if (card.srs && card.srs.due <= now) due.push(card)
  }

  due.sort((a, b) => (a.srs?.due.getTime() ?? 0) - (b.srs?.due.getTime() ?? 0))

  const reviewAllowance = Math.max(0, limits.maxReviewsPerDay - progress.reviewsDone)
  const newAllowance = Math.max(0, limits.newPerDay - progress.newDone)

  const pickedDue = due.slice(0, reviewAllowance)
  const pickedNew = fresh.slice(0, newAllowance)

  return {
    queue: [...pickedDue, ...pickedNew],
    dueCount: pickedDue.length,
    newCount: pickedNew.length,
    heldBack: due.length - pickedDue.length,
  }
}

/**
 * Free practice: every card, shuffled, with no ceiling. Reviews here are not
 * written back, so the schedule is untouched — spec §3.4.
 */
export function buildPracticeSession(
  cards: readonly Card[],
  random: () => number = Math.random,
): Card[] {
  const shuffled = [...cards]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

/**
 * The cards the daily schedule is allowed to draw from.
 *
 * A library is not a study plan: a deck can be present, practisable and still
 * outside the schedule. Archived decks drop out too — putting a deck away
 * should stop it asking for attention.
 */
export function cardsInPlan(
  cards: readonly Card[],
  decks: readonly Deck[],
): Card[] {
  const active = new Set(
    decks.filter((deck) => deck.inPlan && !deck.archived).map((deck) => deck.id),
  )
  return cards.filter((card) => active.has(card.deckId))
}

/** How many cards are waiting right now, ignoring today's limits. */
export function countDue(cards: readonly Card[], now: Date = new Date()): number {
  return cards.filter((card) => card.srs !== null && card.srs.due <= now).length
}
