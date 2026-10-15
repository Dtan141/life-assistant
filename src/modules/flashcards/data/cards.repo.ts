import {
  deleteDoc,
  doc,
  getDocs,
  increment,
  onSnapshot,
  query,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import type { Timestamp, Unsubscribe } from 'firebase/firestore'
import { db } from '@/shared/firebase/app'
import { now } from '@/shared/firebase/convert'
import { cardFromDoc } from '@/modules/flashcards/data/converters'
import { cardDoc, cardsCol, deckDoc } from '@/modules/flashcards/data/paths'
import { BATCH_LIMIT, chunk } from '@/modules/flashcards/data/batch'
import { normalizeTerm } from '@/modules/flashcards/domain/tsv-parser'
import type { ImportPlan } from '@/modules/flashcards/domain/import-plan'
import type { Card, CardDraft } from '@/modules/flashcards/domain/card.types'

/**
 * Cards of one deck, sorted A→Z.
 *
 * The sort happens here rather than in the query: adding orderBy('termLower')
 * would demand a composite index, which cannot be created while offline and
 * costs a manual setup step for no gain. A deck holds hundreds of cards, not
 * millions, so sorting them in memory is free.
 *
 * localeCompare with 'vi' so Vietnamese definitions and accented terms order
 * the way a reader expects.
 */
export async function listCards(uid: string, deckId: string): Promise<Card[]> {
  const snap = await getDocs(query(cardsCol(uid), where('deckId', '==', deckId)))
  return sortCards(snap.docs.map(cardFromDoc))
}

export function sortCards(cards: Card[]): Card[] {
  return cards.sort((a, b) => a.termLower.localeCompare(b.termLower, 'vi'))
}

/**
 * Every card the user owns, across all decks — what a review session draws
 * from, since the queue is not per-deck.
 */
export function watchAllCards(
  uid: string,
  onChange: (cards: Card[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    cardsCol(uid),
    (snap) => onChange(sortCards(snap.docs.map(cardFromDoc))),
    onError,
  )
}

/** Live, A→Z view of one deck's cards. Serves the local cache first. */
export function watchCards(
  uid: string,
  deckId: string,
  onChange: (cards: Card[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    query(cardsCol(uid), where('deckId', '==', deckId)),
    (snap) => onChange(sortCards(snap.docs.map(cardFromDoc))),
    onError,
  )
}

/** Lowercased term -> card id, the shape the TSV parser wants for duplicate detection. */
export async function getExistingTerms(
  uid: string,
  deckId: string,
): Promise<Map<string, string>> {
  const cards = await listCards(uid, deckId)
  return new Map(cards.map((card) => [card.termLower, card.id]))
}

/** The fields an import controls. Deliberately excludes createdAt and srs. */
function contentFields(deckId: string, draft: CardDraft, updatedAt: Timestamp) {
  return {
    deckId,
    term: draft.term,
    termLower: draft.termLower,
    definition: draft.definition,
    pronunciation: draft.pronunciation,
    partOfSpeech: draft.partOfSpeech,
    example: draft.example,
    synonyms: draft.synonyms,
    antonyms: draft.antonyms,
    tags: draft.tags,
    updatedAt,
  }
}

function newCardDoc(deckId: string, draft: CardDraft, timestamp: Timestamp) {
  return {
    ...contentFields(deckId, draft, timestamp),
    wordFamily: '',
    myExample: '',
    createdAt: timestamp,
    // New cards carry no schedule; FSRS fills this in at the first review (M3).
    srs: null,
  }
}

export interface ImportOutcome {
  created: number
  overwritten: number
}

/**
 * Writes an import in batches, adjusting the deck's cardCount by the number of
 * cards actually added.
 *
 * increment() is used rather than a computed total so that the chunks of a
 * large import stay correct even though they cannot commit atomically together.
 */
export async function saveImport(
  uid: string,
  deckId: string,
  plan: ImportPlan,
): Promise<ImportOutcome> {
  const timestamp = now()
  const deckRef = deckDoc(uid, deckId)

  for (const group of chunk(plan.create, BATCH_LIMIT)) {
    const batch = writeBatch(db)
    for (const draft of group) {
      batch.set(doc(cardsCol(uid)), newCardDoc(deckId, draft, timestamp))
    }
    batch.update(deckRef, { cardCount: increment(group.length), updatedAt: timestamp })
    await batch.commit()
  }

  for (const group of chunk(plan.overwrite, BATCH_LIMIT)) {
    const batch = writeBatch(db)
    for (const { id, draft } of group) {
      // update(), not set(): only the content fields move, so createdAt and
      // any FSRS progress on the card survive being re-imported.
      batch.update(cardDoc(uid, id), contentFields(deckId, draft, timestamp))
    }
    batch.update(deckRef, { updatedAt: timestamp })
    await batch.commit()
  }

  return { created: plan.create.length, overwritten: plan.overwrite.length }
}

export async function createCard(
  uid: string,
  deckId: string,
  draft: CardDraft,
): Promise<string> {
  const timestamp = now()
  const ref = doc(cardsCol(uid))
  const batch = writeBatch(db)
  batch.set(ref, newCardDoc(deckId, draft, timestamp))
  batch.update(deckDoc(uid, deckId), {
    cardCount: increment(1),
    updatedAt: timestamp,
  })
  await batch.commit()
  return ref.id
}

export async function updateCard(
  uid: string,
  cardId: string,
  patch: Partial<CardDraft>,
): Promise<void> {
  const data: Record<string, unknown> = { ...patch, updatedAt: now() }
  if (patch.term !== undefined) data.termLower = normalizeTerm(patch.term)
  await updateDoc(cardDoc(uid, cardId), data)
}

export async function deleteCard(
  uid: string,
  deckId: string,
  cardId: string,
): Promise<void> {
  await deleteDoc(cardDoc(uid, cardId))
  await updateDoc(deckDoc(uid, deckId), { cardCount: increment(-1), updatedAt: now() })
}
