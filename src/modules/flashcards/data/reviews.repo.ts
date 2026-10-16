import { doc, getDocs, query, where, writeBatch } from 'firebase/firestore'
import { Timestamp } from 'firebase/firestore'
import { db } from '@/shared/firebase/app'
import { now, toDate, toNum, toStr } from '@/shared/firebase/convert'
import type { ReviewLogEntry } from '@/modules/flashcards/domain/backup'
import { cardDoc, reviewLogsCol } from '@/modules/flashcards/data/paths'
import { RATING_VALUES } from '@/modules/flashcards/domain/srs'
import type { ReviewRating } from '@/modules/flashcards/domain/srs'
import type { DailyProgress } from '@/modules/flashcards/domain/session'
import { startOfDay } from '@/modules/flashcards/domain/day'
import type { ReviewMode } from '@/modules/flashcards/domain/review-mode'
import type { Card, CardSrs } from '@/modules/flashcards/domain/card.types'

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

/**
 * Review logs since a cut-off, for the statistics page.
 *
 * Bounded by date rather than fetched whole: the log grows by a few hundred
 * documents a week and will outlive every other collection.
 */
export async function listRecentLogs(
  uid: string,
  since: Date,
): Promise<ReviewLogEntry[]> {
  const snap = await getDocs(
    query(reviewLogsCol(uid), where('reviewedAt', '>=', Timestamp.fromDate(since))),
  )
  return snap.docs.map((logDoc) => {
    const data = logDoc.data()
    return {
      id: logDoc.id,
      cardId: toStr(data.cardId),
      deckId: toStr(data.deckId),
      rating: toNum(data.rating, 0),
      reviewedAt: toDate(data.reviewedAt, new Date(0)),
      elapsedDays: toNum(data.elapsedDays, 0),
      scheduledDays: toNum(data.scheduledDays, 0),
      mode: toStr(data.mode),
      wasNew: data.wasNew === true,
    }
  })
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
