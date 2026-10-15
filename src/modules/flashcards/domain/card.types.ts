/** FSRS scheduling state. Null until the card is first reviewed (M3). */
export interface CardSrs {
  due: Date
  stability: number
  difficulty: number
  reps: number
  lapses: number
  state: 'new' | 'learning' | 'review' | 'relearning'
  lastReview: Date | null
}

export interface Card {
  id: string
  deckId: string
  term: string
  /** term lowercased and whitespace-collapsed, for duplicate lookup and sorting. */
  termLower: string
  definition: string
  pronunciation: string
  partOfSpeech: string
  example: string
  synonyms: string[]
  antonyms: string[]
  wordFamily: string
  myExample: string
  tags: string[]
  createdAt: Date
  updatedAt: Date
  srs: CardSrs | null
}

/** The fields an import can supply; everything else is filled in on save. */
export type CardDraft = Pick<
  Card,
  | 'term'
  | 'termLower'
  | 'definition'
  | 'pronunciation'
  | 'partOfSpeech'
  | 'example'
  | 'synonyms'
  | 'antonyms'
  | 'tags'
>

export interface Deck {
  id: string
  name: string
  description: string
  tags: string[]
  sourceUrl: string
  /**
   * Denormalised so the deck list does not have to read every card. The card
   * repository keeps it current with increment() inside the same batch as the
   * writes that change it.
   */
  cardCount: number
  createdAt: Date
  updatedAt: Date
  archived: boolean
}
