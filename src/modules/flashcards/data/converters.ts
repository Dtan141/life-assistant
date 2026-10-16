import type { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore'
import {
  toBool,
  toDate,
  toNum,
  toOptionalDate,
  toStr,
  toStrList,
} from '@/shared/firebase/convert'
import type { Card, CardSrs, Deck } from '@/modules/flashcards/domain/card.types'

const SRS_STATES: CardSrs['state'][] = ['new', 'learning', 'review', 'relearning']

function srsFromDoc(value: unknown): CardSrs | null {
  if (!value || typeof value !== 'object') return null
  const data = value as DocumentData
  const due = toOptionalDate(data.due)
  if (!due) return null

  const state = SRS_STATES.includes(data.state) ? (data.state as CardSrs['state']) : 'new'
  return {
    due,
    stability: toNum(data.stability, 0),
    difficulty: toNum(data.difficulty, 0),
    reps: toNum(data.reps, 0),
    lapses: toNum(data.lapses, 0),
    state,
    lastReview: toOptionalDate(data.lastReview),
  }
}

export function cardFromDoc(snap: QueryDocumentSnapshot): Card {
  const data = snap.data()
  const createdAt = toDate(data.createdAt, new Date(0))
  const term = toStr(data.term)
  return {
    id: snap.id,
    deckId: toStr(data.deckId),
    term,
    // Older documents may predate the field; fall back rather than lose the card.
    termLower: toStr(data.termLower) || term.toLowerCase(),
    definition: toStr(data.definition),
    pronunciation: toStr(data.pronunciation),
    partOfSpeech: toStr(data.partOfSpeech),
    example: toStr(data.example),
    synonyms: toStrList(data.synonyms),
    antonyms: toStrList(data.antonyms),
    wordFamily: toStr(data.wordFamily),
    myExample: toStr(data.myExample),
    tags: toStrList(data.tags),
    createdAt,
    updatedAt: toDate(data.updatedAt, createdAt),
    srs: srsFromDoc(data.srs),
  }
}

export function deckFromDoc(snap: QueryDocumentSnapshot): Deck {
  const data = snap.data()
  const createdAt = toDate(data.createdAt, new Date(0))
  return {
    id: snap.id,
    name: toStr(data.name),
    description: toStr(data.description),
    tags: toStrList(data.tags),
    sourceUrl: toStr(data.sourceUrl),
    collection: toStr(data.collection),
    // Absent means a deck written before study plans existed, and every deck
    // back then was being studied. Defaulting to false would quietly drop them
    // all out of the schedule.
    inPlan: data.inPlan === undefined ? true : data.inPlan === true,
    cardCount: Math.max(0, toNum(data.cardCount, 0)),
    createdAt,
    updatedAt: toDate(data.updatedAt, createdAt),
    archived: toBool(data.archived),
  }
}
