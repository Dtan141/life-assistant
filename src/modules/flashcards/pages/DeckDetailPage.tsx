import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@/shared/auth/useAuth'
import { Button } from '@/shared/ui/Button'
import { Spinner } from '@/shared/ui/Spinner'
import { getDeck } from '@/modules/flashcards/data/decks.repo'
import type { Deck } from '@/modules/flashcards/domain/card.types'

export default function DeckDetailPage() {
  const { deckId = '' } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [deck, setDeck] = useState<Deck | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user || !deckId) return
    let cancelled = false
    void getDeck(user.uid, deckId)
      .catch((err) => {
        console.error('Failed to load deck', err)
        return null
      })
      .then((loaded) => {
        if (cancelled) return
        setDeck(loaded)
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [user, deckId])

  if (loading) return <Spinner />

  if (!deck) {
    return (
      <div className="mx-auto max-w-lg space-y-3 px-5 pt-8">
        <p className="text-slate-500">Bộ thẻ không tồn tại hoặc đã bị xoá.</p>
        <Link to="/flashcards" className="text-sm text-slate-500">
          ← Về danh sách bộ thẻ
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg space-y-5 px-5 pt-6">
      <div>
        <Link to="/flashcards" className="text-sm text-slate-500">
          ← Bộ thẻ
        </Link>
        <h1 className="mt-1 text-2xl font-bold">{deck.name}</h1>
        {deck.description && (
          <p className="mt-1 text-slate-500 dark:text-slate-400">{deck.description}</p>
        )}
        <p className="mt-1 text-sm text-slate-500">{deck.cardCount} thẻ</p>
        {deck.sourceUrl && (
          <a
            href={deck.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-block text-sm text-slate-500 underline underline-offset-2"
          >
            Nguồn ↗
          </a>
        )}
      </div>

      <Button onClick={() => navigate(`/flashcards/${deckId}/import`)} className="w-full">
        + Nhập thẻ từ TSV
      </Button>

      <p className="text-slate-500 dark:text-slate-400">
        Danh sách thẻ, tìm kiếm và sắp xếp sẽ có ở bước cuối của M2.
      </p>
    </div>
  )
}
