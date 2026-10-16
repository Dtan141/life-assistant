import { describe, expect, it, vi } from 'vitest'
import { settleOrContinue } from '@/shared/lib/pending'

describe('settleOrContinue', () => {
  it('reports a fast write as acknowledged', async () => {
    await expect(settleOrContinue(Promise.resolve('ok'))).resolves.toBe('acknowledged')
  })

  it('reports a failure as failed', async () => {
    const onLateError = vi.fn()
    await expect(
      settleOrContinue(Promise.reject(new Error('nope')), { onLateError }),
    ).resolves.toBe('failed')
    expect(onLateError).toHaveBeenCalled()
  })

  it('gives up waiting and lets the caller continue', async () => {
    // A write that never resolves is exactly what an offline Firestore does.
    const never = new Promise(() => {})
    await expect(settleOrContinue(never, { graceMs: 10 })).resolves.toBe('pending')
  })

  it('still reports a failure that arrives after the caller moved on', async () => {
    const onLateError = vi.fn()
    let reject!: (error: Error) => void
    const slow = new Promise((_, r) => {
      reject = r
    })

    await expect(settleOrContinue(slow, { graceMs: 5, onLateError })).resolves.toBe(
      'pending',
    )
    expect(onLateError).not.toHaveBeenCalled()

    reject(new Error('permission denied'))
    await Promise.resolve()
    await Promise.resolve()
    expect(onLateError).toHaveBeenCalledWith(expect.any(Error))
  })

  it('does not leave an unhandled rejection behind', async () => {
    const onUnhandled = vi.fn()
    process.on('unhandledRejection', onUnhandled)
    await settleOrContinue(Promise.reject(new Error('x')), { graceMs: 5 })
    await new Promise((resolve) => setTimeout(resolve, 20))
    process.off('unhandledRejection', onUnhandled)
    expect(onUnhandled).not.toHaveBeenCalled()
  })
})
