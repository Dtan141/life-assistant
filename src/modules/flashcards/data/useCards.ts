import { useEffect, useState } from 'react'
import { useAuth } from '@/shared/auth/useAuth'
import { watchCards } from '@/modules/flashcards/data/cards.repo'
import type { Card } from '@/modules/flashcards/domain/card.types'

interface Snapshot {
  key: string | null
  cards: Card[]
  error: string | null
}

export interface CardsState {
  cards: Card[]
  loading: boolean
  error: string | null
}

export function useCards(deckId: string): CardsState {
  const { user } = useAuth()
  const [snapshot, setSnapshot] = useState<Snapshot>({
    key: null,
    cards: [],
    error: null,
  })

  useEffect(() => {
    if (!user || !deckId) return
    const key = `${user.uid}/${deckId}`
    return watchCards(
      user.uid,
      deckId,
      (cards) => setSnapshot({ key, cards, error: null }),
      (error) => {
        console.error('Failed to load cards', error)
        setSnapshot({ key, cards: [], error: error.message })
      },
    )
  }, [user, deckId])

  // Derived, so switching decks shows a spinner without a setState in the effect.
  const key = user && deckId ? `${user.uid}/${deckId}` : null
  const loading = key === null || snapshot.key !== key
  return loading
    ? { cards: [], loading: true, error: null }
    : { cards: snapshot.cards, loading: false, error: snapshot.error }
}
