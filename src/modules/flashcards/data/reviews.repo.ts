import { doc, getDocs, query, where, writeBatch } from 'firebase/firestore'
import { Timestamp } from 'firebase/firestore'
import { db } from '@/shared/firebase/app'
import { now } from '@/shared/firebase/convert'
import { cardDoc, reviewLogsCol } from '@/modules/flashcards/data/paths'
import { RATING_VALUES } from '@/modules/flashcards/domain/srs'
import type { ReviewRating } from '@/modules/flashcards/domain/srs'
import type { DailyProgress } from '@/modules/flashcards/domain/session'
import type { Card, CardSrs } from '@/modules/flashcards/domain/card.types'

export type ReviewMode = 'en-vi' | 'vi-en' | 'typing' | 'cloze'

export interface ReviewRecord {
  card: Card
  rating: ReviewRating
  /** The schedule FSRS produced for this answer. */
  srs: CardSrs
  mode: ReviewMode
}

/**
 * Records one answer: the card's new schedule and a log entry, in one batch so
 * a card can never move forward without the log that explains why.
 *
 * The log is what makes it possible to change scheduler or tune parameters
 * later without losing history — spec §3.5.
 */
export async function saveReview(uid: string, record: ReviewRecord): Promise<void> {
  const { card, rating, srs, mode } = record
  const reviewedAt = now()
  const previous = card.srs

  const batch = writeBatch(db)

  batch.update(cardDoc(uid, card.id), {
    srs: {
      due: Timestamp.fromDate(srs.due),
      stability: srs.stability,
      difficulty: srs.difficulty,
      reps: srs.reps,
      lapses: srs.lapses,
      state: srs.state,
      lastReview: srs.lastReview ? Timestamp.fromDate(srs.lastReview) : null,
    },
    updatedAt: reviewedAt,
  })

  batch.set(doc(reviewLogsCol(uid)), {
    cardId: card.id,
    deckId: card.deckId,
    rating: RATING_VALUES[rating],
    reviewedAt,
    elapsedDays: previous?.lastReview
      ? (reviewedAt.toMillis() - previous.lastReview.getTime()) / 86_400_000
      : 0,
    scheduledDays: (srs.due.getTime() - reviewedAt.toMillis()) / 86_400_000,
    mode,
    // Recorded rather than derived later: it decides which of the two daily
    // allowances this answer spent, and the card's state has already moved on.
    wasNew: previous === null || previous.state === 'new',
  })

  await batch.commit()
}

/** Local midnight. The day a person means is the one on the clock in front of them. */
export function startOfDay(at: Date = new Date()): Date {
  const start = new Date(at)
  start.setHours(0, 0, 0, 0)
  return start
}

export async function getDailyProgress(
  uid: string,
  at: Date = new Date(),
): Promise<DailyProgress> {
  const snap = await getDocs(
    query(reviewLogsCol(uid), where('reviewedAt', '>=', Timestamp.fromDate(startOfDay(at)))),
  )

  let newDone = 0
  let reviewsDone = 0
  for (const logDoc of snap.docs) {
    if (logDoc.data().wasNew === true) newDone += 1
    else reviewsDone += 1
  }
  return { newDone, reviewsDone }
}
