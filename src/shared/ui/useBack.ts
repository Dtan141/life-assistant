import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

/**
 * Goes back to wherever the user came from.
 *
 * A hardcoded destination is wrong whenever a screen has more than one way in:
 * the import guide is reachable from the deck list and from settings, and a
 * review session from the home screen, a deck, or the setup screen. Sending
 * everyone to the same place contradicts the browser's own back gesture, which
 * does the right thing already.
 *
 * The fallback covers a cold start — a bookmark, a notification, a shared link
 * — where there is no history to step back through and `navigate(-1)` would
 * leave the app entirely.
 */
export function useBack(fallback: string): () => void {
  const navigate = useNavigate()

  return useCallback(() => {
    const index = (window.history.state as { idx?: number } | null)?.idx ?? 0
    if (index > 0) navigate(-1)
    else navigate(fallback, { replace: true })
  }, [navigate, fallback])
}
