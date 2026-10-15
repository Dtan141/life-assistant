import { Timestamp } from 'firebase/firestore'

/**
 * Firestore hands back a Timestamp, but a pending offline write reads back as
 * null, and data written by an older build may be missing the field entirely.
 */
export function toDate(value: unknown, fallback: Date): Date {
  if (value instanceof Timestamp) return value.toDate()
  if (value instanceof Date) return value
  return fallback
}

export function toOptionalDate(value: unknown): Date | null {
  if (value instanceof Timestamp) return value.toDate()
  if (value instanceof Date) return value
  return null
}

export function toStr(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

export function toStrList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}

export function toNum(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

export function toBool(value: unknown): boolean {
  return value === true
}

/**
 * Client time rather than serverTimestamp(): a server timestamp reads back as
 * null until it syncs, which would break sorting while offline. This is a
 * single-user app, so clock skew between devices is not a concern.
 */
export function now(): Timestamp {
  return Timestamp.now()
}
