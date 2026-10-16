import {
  addDoc,
  deleteDoc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import type { Unsubscribe } from 'firebase/firestore'
import { db } from '@/shared/firebase/app'
import { now } from '@/shared/firebase/convert'
import { deckFromDoc } from '@/modules/flashcards/data/converters'
import { cardsCol, deckDoc, decksCol } from '@/modules/flashcards/data/paths'
import { BATCH_LIMIT } from '@/modules/flashcards/data/batch'
import type { Deck } from '@/modules/flashcards/domain/card.types'

export interface DeckInput {
  name: string
  description?: string
  tags?: string[]
  sourceUrl?: string
  collection?: string
  /**
   * Defaults to true: a deck someone created by hand was created to be
   * studied. Seeded catalog decks pass false, so a library of 600 words does
   * not become 600 cards queued for tonight.
   */
  inPlan?: boolean
}

export async function listDecks(
  uid: string,
  { includeArchived = false } = {},
): Promise<Deck[]> {
  const snap = await getDocs(query(decksCol(uid), orderBy('name')))
  const decks = snap.docs.map(deckFromDoc)
  return includeArchived ? decks : decks.filter((deck) => !deck.archived)
}

/**
 * Live view of the deck list. onSnapshot serves the local cache first, so the
 * list appears instantly and offline, then updates when the server answers.
 */
export function watchDecks(
  uid: string,
  onChange: (decks: Deck[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    query(decksCol(uid), orderBy('name')),
    (snap) => onChange(snap.docs.map(deckFromDoc)),
    onError,
  )
}

export async function getDeck(uid: string, deckId: string): Promise<Deck | null> {
  const snap = await getDoc(deckDoc(uid, deckId))
  return snap.exists() ? deckFromDoc(snap) : null
}

export async function createDeck(uid: string, input: DeckInput): Promise<string> {
  const timestamp = now()
  const ref = await addDoc(decksCol(uid), {
    name: input.name.trim(),
    description: input.description?.trim() ?? '',
    tags: input.tags ?? [],
    sourceUrl: input.sourceUrl?.trim() ?? '',
    collection: input.collection?.trim() ?? '',
    inPlan: input.inPlan ?? true,
    cardCount: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
    archived: false,
  })
  return ref.id
}

export async function updateDeck(
  uid: string,
  deckId: string,
  patch: Partial<DeckInput>,
): Promise<void> {
  const data: Record<string, unknown> = { updatedAt: now() }
  if (patch.name !== undefined) data.name = patch.name.trim()
  if (patch.description !== undefined) data.description = patch.description.trim()
  if (patch.tags !== undefined) data.tags = patch.tags
  if (patch.sourceUrl !== undefined) data.sourceUrl = patch.sourceUrl.trim()
  if (patch.collection !== undefined) data.collection = patch.collection.trim()
  if (patch.inPlan !== undefined) data.inPlan = patch.inPlan
  await updateDoc(deckDoc(uid, deckId), data)
}

/** Adds a deck to the daily schedule, or takes it out again. */
export async function setDeckInPlan(
  uid: string,
  deckId: string,
  inPlan: boolean,
): Promise<void> {
  await updateDoc(deckDoc(uid, deckId), { inPlan, updatedAt: now() })
}

export async function setDeckArchived(
  uid: string,
  deckId: string,
  archived: boolean,
): Promise<void> {
  await updateDoc(deckDoc(uid, deckId), { archived, updatedAt: now() })
}

/**
 * Deletes a deck and every card in it.
 *
 * Firestore has no cascade, and cards are stored flat, so orphaned cards would
 * otherwise keep showing up in review sessions forever. The cards go first: if
 * this is interrupted the deck remains and the delete can simply be retried,
 * whereas deleting the deck first would leave cards nothing points at.
 */
export async function deleteDeckWithCards(uid: string, deckId: string): Promise<number> {
  const cards = await getDocs(query(cardsCol(uid), where('deckId', '==', deckId)))

  for (let i = 0; i < cards.docs.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db)
    for (const card of cards.docs.slice(i, i + BATCH_LIMIT)) batch.delete(card.ref)
    await batch.commit()
  }

  await deleteDoc(deckDoc(uid, deckId))
  return cards.size
}
