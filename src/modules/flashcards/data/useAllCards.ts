import { useEffect, useState } from 'react'
import { useAuth } from '@/shared/auth/useAuth'
import { watchAllCards } from '@/modules/flashcards/data/cards.repo'
import type { Card } from '@/modules/flashcards/domain/card.types'

interface Snapshot {
  uid: string | null
  cards: Card[]
  error: string | null
}

export function useAllCards(): { cards: Card[]; loading: boolean; error: string | null } {
  const { user } = useAuth()
  const [snapshot, setSnapshot] = useState<Snapshot>({
    uid: null,
    cards: [],
    error: null,
  })

  useEffect(() => {
    if (!user) return
    const { uid } = user
    return watchAllCards(
      uid,
      (cards) => setSnapshot({ uid, cards, error: null }),
      (error) => {
        console.error('Failed to load cards', error)
        setSnapshot({ uid, cards: [], error: error.message })
      },
    )
  }, [user])

  const loading = !user || snapshot.uid !== user.uid
  return loading
    ? { cards: [], loading: true, error: null }
    : { cards: snapshot.cards, loading: false, error: snapshot.error }
}
