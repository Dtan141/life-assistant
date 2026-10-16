export type WriteOutcome = 'acknowledged' | 'pending' | 'failed'

/**
 * Waits for a Firestore write, but only briefly.
 *
 * Firestore resolves a write promise when the *server* acknowledges it, while
 * the local cache is updated immediately and the write is retried until it
 * lands. Awaiting the server would freeze the screen for as long as the phone
 * is offline — precisely when reviewing has to keep working.
 *
 * So: carry on once the write is safely in the local cache, and report a real
 * failure whenever it arrives, even after the caller has moved on.
 */
export function settleOrContinue<T>(
  write: Promise<T>,
  { graceMs = 1200, onLateError }: { graceMs?: number; onLateError?: (error: unknown) => void } = {},
): Promise<WriteOutcome> {
  const guarded: Promise<WriteOutcome> = write.then(
    () => 'acknowledged',
    (error: unknown) => {
      onLateError?.(error)
      return 'failed'
    },
  )

  const grace = new Promise<WriteOutcome>((resolve) => {
    setTimeout(() => resolve('pending'), graceMs)
  })

  return Promise.race([guarded, grace])
}
