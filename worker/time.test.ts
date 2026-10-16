import { describe, expect, it } from 'vitest'
import { localMoment, parseTimeOfDay, shouldSendReminder } from './time'

const HANOI = 'Asia/Ho_Chi_Minh'

/** 13:00 UTC is 20:00 in Hanoi. */
const AT_20_00 = new Date('2026-10-16T13:00:00Z')

describe('localMoment', () => {
  it('converts UTC to the user’s clock', () => {
    expect(localMoment(AT_20_00, HANOI)).toEqual({ date: '2026-10-16', minutes: 20 * 60 })
  })

  it('rolls the date over where the zone already has', () => {
    // 18:30 UTC is half past one the next morning in Hanoi.
    const moment = localMoment(new Date('2026-10-16T18:30:00Z'), HANOI)
    expect(moment).toEqual({ date: '2026-10-17', minutes: 90 })
  })

  it('handles midnight as 0, not 24', () => {
    expect(localMoment(new Date('2026-10-16T17:00:00Z'), HANOI).minutes).toBe(0)
  })

  it('falls back to UTC for an unknown zone instead of throwing', () => {
    // One bad timezone must not stop everyone else's reminders.
    expect(localMoment(AT_20_00, 'Mars/Olympus')).toEqual(
      localMoment(AT_20_00, 'UTC'),
    )
  })
})

describe('parseTimeOfDay', () => {
  it('reads valid times', () => {
    expect(parseTimeOfDay('20:00')).toBe(1200)
    expect(parseTimeOfDay('09:05')).toBe(545)
    expect(parseTimeOfDay('0:00')).toBe(0)
  })

  it('rejects nonsense', () => {
    expect(parseTimeOfDay('25:00')).toBeNull()
    expect(parseTimeOfDay('20:60')).toBeNull()
    expect(parseTimeOfDay('tối')).toBeNull()
    expect(parseTimeOfDay('')).toBeNull()
  })
})

describe('shouldSendReminder', () => {
  const base = { reminderTime: '20:00', timezone: HANOI }

  it('sends at the appointed minute', () => {
    expect(shouldSendReminder(base, AT_20_00)).toBe(true)
  })

  it('does not send before it', () => {
    const at = new Date('2026-10-16T12:50:00Z') // 19:50 in Hanoi
    expect(shouldSendReminder(base, at)).toBe(false)
  })

  it('still catches up shortly after a missed run', () => {
    // The cron fires every quarter hour; a deploy or outage must not cost the
    // whole day's reminder.
    const at = new Date('2026-10-16T13:40:00Z') // 20:40
    expect(shouldSendReminder(base, at)).toBe(true)
  })

  it('gives up rather than waking someone at midnight', () => {
    const at = new Date('2026-10-16T15:30:00Z') // 22:30, two and a half hours late
    expect(shouldSendReminder(base, at)).toBe(false)
  })

  it('sends only once a day', () => {
    expect(shouldSendReminder({ ...base, lastSentOn: '2026-10-16' }, AT_20_00)).toBe(false)
  })

  it('sends again the next day', () => {
    expect(shouldSendReminder({ ...base, lastSentOn: '2026-10-15' }, AT_20_00)).toBe(true)
  })

  it('respects the user’s own timezone, not the server’s', () => {
    // The same instant is 14:00 in London, nowhere near a 20:00 reminder.
    expect(shouldSendReminder({ ...base, timezone: 'Europe/London' }, AT_20_00)).toBe(
      false,
    )
  })

  it('skips a user whose reminder time is unreadable', () => {
    expect(shouldSendReminder({ ...base, reminderTime: '' }, AT_20_00)).toBe(false)
  })
})
