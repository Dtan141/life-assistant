export interface ReminderWindow {
  /** "HH:mm" the user asked to be reminded at. */
  reminderTime: string
  /** IANA zone, e.g. Asia/Ho_Chi_Minh. */
  timezone: string
  /** Local date "YYYY-MM-DD" a reminder was last sent on, if any. */
  lastSentOn?: string
}

export interface LocalMoment {
  date: string
  minutes: number
}

/**
 * What time it is where the user is.
 *
 * The reminder has to fire at 20:00 on their clock, and the Worker runs in
 * UTC, so the zone stored with their settings is the only thing that can
 * answer this. An unknown zone falls back to UTC rather than throwing: a
 * reminder at the wrong hour beats a crash that stops everyone's.
 */
export function localMoment(at: Date, timezone: string): LocalMoment {
  let parts: Intl.DateTimeFormatPart[]
  try {
    parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(at)
  } catch {
    return localMoment(at, 'UTC')
  }

  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '00'
  const hour = Number(get('hour')) % 24
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    minutes: hour * 60 + Number(get('minute')),
  }
}

export function parseTimeOfDay(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim())
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return null
  return hours * 60 + minutes
}

/** How late a reminder may still be sent after its time, in minutes. */
export const LATE_GRACE_MINUTES = 120

/**
 * Whether this run should remind this user.
 *
 * Due, not yet sent today, and not so late that it would arrive at bedtime:
 * the cron fires every quarter hour, so a run that is skipped — a deploy, an
 * outage — should still catch up shortly after rather than go silent for the
 * day or wake someone at midnight.
 */
export function shouldSendReminder(window: ReminderWindow, at: Date): boolean {
  const target = parseTimeOfDay(window.reminderTime)
  if (target === null) return false

  const local = localMoment(at, window.timezone)
  if (window.lastSentOn === local.date) return false

  const elapsed = local.minutes - target
  return elapsed >= 0 && elapsed < LATE_GRACE_MINUTES
}
