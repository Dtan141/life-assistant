import { getAccessToken, parseServiceAccount } from './google-auth'
import { Firestore, docId, readMap, readString } from './firestore'
import { sendPush } from './fcm'
import { localMoment, shouldSendReminder } from './time'

const SCOPES = [
  'https://www.googleapis.com/auth/datastore',
  'https://www.googleapis.com/auth/firebase.messaging',
]

export interface ReminderEnv {
  /** The service account JSON, held as a Worker secret. */
  FIREBASE_SERVICE_ACCOUNT: string
}

export interface RunSummary {
  considered: number
  notified: number
  delivered: number
  pruned: number
}

function notificationFor(dueCount: number) {
  return {
    title: 'Đến giờ ôn từ vựng',
    body:
      dueCount === 1
        ? 'Hôm nay có 1 thẻ cần ôn.'
        : `Hôm nay có ${dueCount} thẻ cần ôn.`,
    url: '/flashcards/review/session',
  }
}

/**
 * One pass over every user: who is due a reminder, and do they have anything
 * to be reminded about.
 *
 * `forceUid` bypasses the schedule for the "send a test" button, so the whole
 * path — service account, Firestore, FCM, the phone — can be proven without
 * waiting until evening.
 */
export async function runReminders(
  env: ReminderEnv,
  at: Date = new Date(),
  forceUid?: string,
): Promise<RunSummary> {
  const account = parseServiceAccount(env.FIREBASE_SERVICE_ACCOUNT)
  const accessToken = await getAccessToken(account, SCOPES)
  const firestore = new Firestore(account.project_id, accessToken)

  const summary: RunSummary = { considered: 0, notified: 0, delivered: 0, pruned: 0 }

  for (const user of await firestore.listUsers()) {
    const uid = docId(user)
    if (forceUid && uid !== forceUid) continue
    summary.considered += 1

    const settings = readMap(user.fields, 'settings')
    const timezone = readString(settings, 'timezone') || 'Asia/Ho_Chi_Minh'
    const due = !forceUid
      ? shouldSendReminder(
          {
            reminderTime: readString(settings, 'reminderTime') || '20:00',
            timezone,
            lastSentOn: readString(user.fields, 'lastReminderSentOn') || undefined,
          },
          at,
        )
      : true
    if (!due) continue

    const tokens = await firestore.listPushTokens(uid)
    if (tokens.length === 0) continue

    const dueCount = await firestore.countDueCards(uid, at)
    // Nothing waiting is not worth interrupting someone for. A test send says
    // so instead of going quiet, so the button still proves the path works.
    if (dueCount === 0 && !forceUid) continue

    const payload = forceUid && dueCount === 0
      ? {
          title: 'Thử thông báo',
          body: 'Đường dẫn thông báo hoạt động. Hiện không có thẻ nào đến hạn.',
          url: '/',
        }
      : notificationFor(dueCount)

    let anyDelivered = false
    for (const token of tokens) {
      const result = await sendPush(account.project_id, accessToken, token, payload)
      if (result === 'sent') {
        summary.delivered += 1
        anyDelivered = true
      } else if (result === 'expired') {
        // The app was uninstalled or the token rotated; keeping it would mean
        // retrying a dead address every quarter of an hour, forever.
        await firestore.deletePushToken(uid, token)
        summary.pruned += 1
      }
    }

    if (anyDelivered) {
      summary.notified += 1
      if (!forceUid) {
        await firestore.markReminderSent(uid, localMoment(at, timezone).date)
      }
    }
  }

  return summary
}
