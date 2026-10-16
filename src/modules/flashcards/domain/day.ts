/**
 * Local midnight.
 *
 * Days are counted on the clock in front of the user, not in UTC: a review at
 * 23:30 in Hanoi belongs to that evening, not to the next day.
 */
export function startOfDay(at: Date = new Date()): Date {
  const start = new Date(at)
  start.setHours(0, 0, 0, 0)
  return start
}
