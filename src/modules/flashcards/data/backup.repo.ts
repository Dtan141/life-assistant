import { Timestamp, doc, getDoc, getDocs, writeBatch } from 'firebase/firestore'
import { db } from '@/shared/firebase/app'
import { userDoc } from '@/shared/auth/user.repo'
import { toDate, toNum, toStr } from '@/shared/firebase/convert'
import { cardFromDoc, deckFromDoc } from '@/modules/flashcards/data/converters'
import { cardsCol, decksCol, reviewLogsCol } from '@/modules/flashcards/data/paths'
import { BATCH_LIMIT, chunk } from '@/modules/flashcards/data/batch'
import { DEFAULT_SETTINGS } from '@/shared/types'
import type { UserSettings } from '@/shared/types'
import type { BackupData, BackupFile, ReviewLogEntry } from '@/modules/flashcards/domain/backup'

export async function collectBackup(uid: string): Promise<BackupData> {
  const [profile, deckDocs, cardDocs, logDocs] = await Promise.all([
    getDoc(userDoc(uid)),
    getDocs(decksCol(uid)),
    getDocs(cardsCol(uid)),
    getDocs(reviewLogsCol(uid)),
  ])

  const stored = (profile.data()?.settings ?? {}) as Partial<UserSettings>

  return {
    settings: { ...DEFAULT_SETTINGS, ...stored },
    decks: deckDocs.docs.map(deckFromDoc),
    cards: cardDocs.docs.map(cardFromDoc),
    reviewLogs: logDocs.docs.map((snap): ReviewLogEntry => {
      const data = snap.data()
      return {
        id: snap.id,
        cardId: toStr(data.cardId),
        deckId: toStr(data.deckId),
        rating: toNum(data.rating, 0),
        reviewedAt: toDate(data.reviewedAt, new Date(0)),
        elapsedDays: toNum(data.elapsedDays, 0),
        scheduledDays: toNum(data.scheduledDays, 0),
        mode: toStr(data.mode),
        wasNew: data.wasNew === true,
      }
    }),
  }
}

export type RestoreMode = 'merge' | 'overwrite'

export interface RestoreOutcome {
  decks: number
  cards: number
  reviewLogs: number
  skipped: number
}

/**
 * Writes a backup back under its original ids.
 *
 * Keeping ids means a restore is a restore rather than a second copy: run it
 * twice and nothing is duplicated. 'merge' leaves anything already present
 * alone, which is what you want after losing one deck; 'overwrite' replaces,
 * which is what you want after an edit you regret.
 *
 * Nothing is deleted either way. A restore cannot be the thing that loses data.
 */
export async function restoreBackup(
  uid: string,
  file: BackupFile,
  mode: RestoreMode,
): Promise<RestoreOutcome> {
  const [existingDecks, existingCards, existingLogs] = await Promise.all([
    getDocs(decksCol(uid)),
    getDocs(cardsCol(uid)),
    getDocs(reviewLogsCol(uid)),
  ])

  const have = {
    decks: new Set(existingDecks.docs.map((d) => d.id)),
    cards: new Set(existingCards.docs.map((d) => d.id)),
    logs: new Set(existingLogs.docs.map((d) => d.id)),
  }

  const outcome: RestoreOutcome = { decks: 0, cards: 0, reviewLogs: 0, skipped: 0 }
  const writes: { ref: ReturnType<typeof doc>; data: Record<string, unknown> }[] = []

  for (const deck of file.decks) {
    if (!deck.id) continue
    if (mode === 'merge' && have.decks.has(deck.id)) {
      outcome.skipped += 1
      continue
    }
    writes.push({
      ref: doc(decksCol(uid), deck.id),
      data: {
        name: deck.name,
        description: deck.description,
        tags: deck.tags,
        sourceUrl: deck.sourceUrl,
        collection: deck.collection,
        inPlan: deck.inPlan,
        cardCount: deck.cardCount,
        createdAt: Timestamp.fromDate(deck.createdAt),
        updatedAt: Timestamp.fromDate(deck.updatedAt),
        archived: deck.archived,
      },
    })
    outcome.decks += 1
  }

  for (const card of file.cards) {
    if (!card.id) continue
    if (mode === 'merge' && have.cards.has(card.id)) {
      outcome.skipped += 1
      continue
    }
    writes.push({
      ref: doc(cardsCol(uid), card.id),
      data: {
        deckId: card.deckId,
        term: card.term,
        termLower: card.termLower,
        definition: card.definition,
        pronunciation: card.pronunciation,
        partOfSpeech: card.partOfSpeech,
        example: card.example,
        synonyms: card.synonyms,
        antonyms: card.antonyms,
        wordFamily: card.wordFamily,
        myExample: card.myExample,
        tags: card.tags,
        createdAt: Timestamp.fromDate(card.createdAt),
        updatedAt: Timestamp.fromDate(card.updatedAt),
        srs: card.srs
          ? {
              ...card.srs,
              due: Timestamp.fromDate(card.srs.due),
              lastReview: card.srs.lastReview
                ? Timestamp.fromDate(card.srs.lastReview)
                : null,
            }
          : null,
      },
    })
    outcome.cards += 1
  }

  for (const log of file.reviewLogs) {
    if (!log.id || have.logs.has(log.id)) continue
    writes.push({
      ref: doc(reviewLogsCol(uid), log.id),
      data: {
        cardId: log.cardId,
        deckId: log.deckId,
        rating: log.rating,
        reviewedAt: Timestamp.fromDate(log.reviewedAt),
        elapsedDays: log.elapsedDays,
        scheduledDays: log.scheduledDays,
        mode: log.mode,
        wasNew: log.wasNew,
      },
    })
    outcome.reviewLogs += 1
  }

  for (const group of chunk(writes, BATCH_LIMIT)) {
    const batch = writeBatch(db)
    for (const { ref, data } of group) batch.set(ref, data)
    await batch.commit()
  }

  return outcome
}
