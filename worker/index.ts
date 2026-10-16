import { runReminders } from './reminders'
import type { ReminderEnv } from './reminders'

/**
 * Serves the built SPA, proxies Firebase's auth helper, and sends the daily
 * review reminder.
 *
 * Safari blocks third-party storage, so the helper iframe hosted on
 * <project>.firebaseapp.com cannot hand the redirect result back to an app on
 * a different domain — getRedirectResult() just resolves to null and sign-in
 * silently loops. Proxying /__/auth/ through this Worker, with
 * VITE_FIREBASE_AUTH_DOMAIN pointing here, makes app and helper same-origin.
 *
 * This requires https://<this-domain>/__/auth/handler to be registered as an
 * authorized redirect URI on the Google OAuth client.
 */

const FIREBASE_AUTH_HOST = 'life-assistant-1401.firebaseapp.com'
const PROXIED_PREFIXES = ['/__/auth/', '/__/firebase/']
const TEST_PATH = '/__/reminders/test'

export interface Env extends ReminderEnv {
  ASSETS: Fetcher
  /** The Firebase Web API key, used to verify the caller's ID token. */
  FIREBASE_API_KEY: string
}

/**
 * Establishes who is calling, by asking Firebase to resolve their ID token.
 *
 * Verifying the JWT signature here would mean fetching and caching Google's
 * rotating public keys; letting the identity service answer is both shorter
 * and impossible to get subtly wrong.
 */
async function callerUid(request: Request, apiKey: string): Promise<string | null> {
  const header = request.headers.get('Authorization') ?? ''
  const idToken = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!idToken) return null

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    },
  )
  if (!response.ok) return null

  const body = (await response.json()) as { users?: { localId?: string }[] }
  return body.users?.[0]?.localId ?? null
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === TEST_PATH && request.method === 'POST') {
      const uid = await callerUid(request, env.FIREBASE_API_KEY)
      if (!uid) {
        return Response.json({ error: 'Chưa đăng nhập.' }, { status: 401 })
      }
      try {
        // Scoped to the caller: nobody can make this send to anyone else.
        const summary = await runReminders(env, new Date(), uid)
        return Response.json(summary)
      } catch (error) {
        console.error('Test reminder failed', error)
        return Response.json(
          { error: error instanceof Error ? error.message : String(error) },
          { status: 500 },
        )
      }
    }

    if (PROXIED_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) {
      const target = new URL(url.pathname + url.search, `https://${FIREBASE_AUTH_HOST}`)
      // Pass redirects straight through; following them here would resolve
      // them against the wrong origin.
      return fetch(new Request(target, request), { redirect: 'manual' })
    }

    return env.ASSETS.fetch(request)
  },

  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(
      runReminders(env)
        .then((summary) => {
          // Logged every run: with no UI, this is the only way to tell a quiet
          // evening from a broken one.
          console.log('Reminder run', JSON.stringify(summary))
        })
        .catch((error: unknown) => {
          console.error('Reminder run failed', error)
        }),
    )
  },
} satisfies ExportedHandler<Env>
