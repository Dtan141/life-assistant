export class TimeoutError extends Error {
  constructor(label: string, ms: number) {
    super(`${label} không phản hồi sau ${Math.round(ms / 1000)} giây.`)
    this.name = 'TimeoutError'
  }
}

/**
 * Rejects if the promise has not settled in time.
 *
 * For SDK calls that can stall indefinitely instead of failing — a promise
 * that never settles is not something try/catch can rescue, and a button that
 * waits on one spins forever.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>
  const guard = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new TimeoutError(label, ms)), ms)
  })
  return Promise.race([promise, guard]).finally(() => clearTimeout(timer)) as Promise<T>
}
