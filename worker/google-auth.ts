export interface ServiceAccount {
  project_id: string
  client_email: string
  private_key: string
}

export function parseServiceAccount(raw: string): ServiceAccount {
  const parsed = JSON.parse(raw) as Partial<ServiceAccount>
  for (const field of ['project_id', 'client_email', 'private_key'] as const) {
    if (!parsed[field]) {
      throw new Error(`Service account key is missing "${field}"`)
    }
  }
  return parsed as ServiceAccount
}

function base64url(bytes: ArrayBuffer | string): string {
  const binary =
    typeof bytes === 'string'
      ? bytes
      : String.fromCharCode(...new Uint8Array(bytes))
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** PEM -> the DER bytes WebCrypto wants. */
function pemToBuffer(pem: string): ArrayBuffer {
  const body = pem
    .replace(/-----BEGIN [^-]+-----/, '')
    .replace(/-----END [^-]+-----/, '')
    // Keys stored in JSON carry literal \n; keys pasted by hand carry real ones.
    .replace(/\\n/g, '')
    .replace(/\s/g, '')
  const binary = atob(body)
  const buffer = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) buffer[i] = binary.charCodeAt(i)
  return buffer.buffer
}

/**
 * Exchanges the service account for an OAuth access token.
 *
 * Google's own libraries cannot run on Workers, so the JWT is signed here with
 * WebCrypto and swapped for a token the REST APIs accept. Tokens last an hour;
 * the caller holds on to one for the duration of an invocation.
 */
export async function getAccessToken(
  account: ServiceAccount,
  scopes: readonly string[],
): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claims = base64url(
    JSON.stringify({
      iss: account.client_email,
      scope: scopes.join(' '),
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    }),
  )

  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToBuffer(account.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(`${header}.${claims}`),
  )

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${header}.${claims}.${base64url(signature)}`,
    }),
  })

  if (!response.ok) {
    throw new Error(`Token exchange failed: ${response.status} ${await response.text()}`)
  }
  return ((await response.json()) as { access_token: string }).access_token
}
