export interface UserSettings {
  /** New cards introduced per day. */
  newPerDay: number
  /** Ceiling on reviews per day, so a backlog never becomes unmanageable. */
  maxReviewsPerDay: number
  /** FSRS target recall probability. */
  desiredRetention: number
  /** Local time of the daily reminder, "HH:mm". */
  reminderTime: string
  /** IANA zone, used by the reminder Worker to resolve reminderTime. */
  timezone: string
}

export interface UserProfile {
  displayName: string | null
  email: string | null
  photoURL: string | null
  createdAt: Date
  settings: UserSettings
}

export const DEFAULT_SETTINGS: UserSettings = {
  newPerDay: 20,
  maxReviewsPerDay: 200,
  // 0.8 rather than FSRS's 0.9: fewer reviews per day for the same words,
  // which matters more than the last few points of recall for someone fitting
  // this around other work. No longer exposed as a setting.
  desiredRetention: 0.8,
  reminderTime: '20:00',
  timezone: 'Asia/Ho_Chi_Minh',
}
