import { useEffect, useState } from 'react'
import { useAuth } from '@/shared/auth/useAuth'
import { watchDecks } from '@/modules/flashcards/data/decks.repo'
import type { Deck } from '@/modules/flashcards/domain/card.types'

interface Snapshot {
  /** Whose decks these are, so a stale result is never shown to the next user. */
  uid: string | null
  decks: Deck[]
  error: string | null
}

export interface DecksState {
  decks: Deck[]
  loading: boolean
  error: string | null
}

function describe(error: Error): string {
  // The first run of a new query needs an index Firestore offers to create.
  return error.message.includes('index')
    ? 'Firestore cần tạo index cho truy vấn này. Mở Console (F12) và bấm vào link Firestore đưa ra.'
    : 'Không tải được danh sách bộ thẻ.'
}

export function useDecks(): DecksState {
  const { user } = useAuth()
  const [snapshot, setSnapshot] = useState<Snapshot>({
    uid: null,
    decks: [],
    error: null,
  })

  useEffect(() => {
    if (!user) return
    const { uid } = user
    return watchDecks(
      uid,
      (decks) => setSnapshot({ uid, decks, error: null }),
      (error) => {
        console.error('Failed to load decks', error)
        setSnapshot({ uid, decks: [], error: describe(error) })
      },
    )
  }, [user])

  // Derived rather than stored: no setState needed when the user changes.
  const loading = !user || snapshot.uid !== user.uid
  return loading
    ? { decks: [], loading: true, error: null }
    : { decks: snapshot.decks, loading: false, error: snapshot.error }
}
