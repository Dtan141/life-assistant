/**
 * Serves the built SPA, and proxies Firebase's auth helper so the whole
 * sign-in flow stays on one origin.
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

export interface Env {
  ASSETS: Fetcher
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (PROXIED_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) {
      const target = new URL(url.pathname + url.search, `https://${FIREBASE_AUTH_HOST}`)
      // Pass redirects straight through; following them here would resolve
      // them against the wrong origin.
      return fetch(new Request(target, request), { redirect: 'manual' })
    }

    return env.ASSETS.fetch(request)
  },
} satisfies ExportedHandler<Env>
