import { collection, doc } from 'firebase/firestore'
import { db } from '@/shared/firebase/app'

/**
 * Everything hangs off users/{uid} so one security rule covers the lot, and so
 * later modules (planner, habits) can sit beside these without colliding.
 *
 * Cards live in a flat collection rather than under their deck, so "what is due
 * across every deck" stays a single query.
 */
export const decksCol = (uid: string) => collection(db, 'users', uid, 'decks')
export const deckDoc = (uid: string, deckId: string) => doc(decksCol(uid), deckId)

export const cardsCol = (uid: string) => collection(db, 'users', uid, 'cards')
export const cardDoc = (uid: string, cardId: string) => doc(cardsCol(uid), cardId)

export const reviewLogsCol = (uid: string) => collection(db, 'users', uid, 'reviewLogs')
