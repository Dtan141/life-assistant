export interface PushPayload {
  title: string
  body: string
  url: string
}

export type SendResult = 'sent' | 'expired' | 'failed'

/**
 * Sends one notification.
 *
 * Data-only, with no `notification` block: that leaves src/sw.ts in charge of
 * what is shown, so the reminder can carry a tag and replace yesterday's
 * instead of stacking up.
 *
 * "expired" is reported separately because it is not an error — the device
 * uninstalled the app, and the token should simply be dropped.
 */
export async function sendPush(
  projectId: string,
  accessToken: string,
  token: string,
  payload: PushPayload,
): Promise<SendResult> {
  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          token,
          data: { ...payload },
          webpush: {
            headers: {
              // A reminder that arrives a day late is noise, not a reminder.
              TTL: '43200',
              Urgency: 'normal',
            },
            fcmOptions: { link: payload.url },
          },
        },
      }),
    },
  )

  if (response.ok) return 'sent'

  const text = await response.text()
  if (
    response.status === 404 ||
    text.includes('UNREGISTERED') ||
    text.includes('INVALID_ARGUMENT')
  ) {
    return 'expired'
  }
  console.error(`FCM ${response.status}: ${text}`)
  return 'failed'
}
