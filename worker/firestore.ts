const BASE = 'https://firestore.googleapis.com/v1'

/** The subset of Firestore's REST value shapes this Worker reads. */
interface FsValue {
  stringValue?: string
  integerValue?: string
  doubleValue?: number
  booleanValue?: boolean
  timestampValue?: string
  nullValue?: null
  mapValue?: { fields?: Record<string, FsValue> }
}

export interface FsDocument {
  name: string
  fields?: Record<string, FsValue>
}

export function docId(doc: FsDocument): string {
  return doc.name.slice(doc.name.lastIndexOf('/') + 1)
}

export function readString(fields: Record<string, FsValue> | undefined, key: string): string {
  return fields?.[key]?.stringValue ?? ''
}

export function readMap(
  fields: Record<string, FsValue> | undefined,
  key: string,
): Record<string, FsValue> | undefined {
  return fields?.[key]?.mapValue?.fields
}

export class Firestore {
  constructor(
    private readonly projectId: string,
    private readonly token: string,
  ) {}

  private get root(): string {
    return `${BASE}/projects/${this.projectId}/databases/(default)/documents`
  }

  private async call<T>(url: string, init?: RequestInit): Promise<T> {
    const response = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    })
    if (!response.ok) {
      throw new Error(`Firestore ${response.status}: ${await response.text()}`)
    }
    return (await response.json()) as T
  }

  /** Every user document. One user today, but the data model never assumed so. */
  async listUsers(): Promise<FsDocument[]> {
    const out: FsDocument[] = []
    let pageToken = ''
    do {
      const url = new URL(`${this.root}/users`)
      url.searchParams.set('pageSize', '300')
      if (pageToken) url.searchParams.set('pageToken', pageToken)
      const page = await this.call<{ documents?: FsDocument[]; nextPageToken?: string }>(
        url.toString(),
      )
      out.push(...(page.documents ?? []))
      pageToken = page.nextPageToken ?? ''
    } while (pageToken)
    return out
  }

  /** The decks this user is actually studying, excluding archived ones. */
  async listPlannedDeckIds(uid: string): Promise<Set<string>> {
    const page = await this.call<{ documents?: FsDocument[] }>(
      `${this.root}/users/${uid}/decks?pageSize=300`,
    )
    const planned = new Set<string>()
    for (const deck of page.documents ?? []) {
      // Absent inPlan means a deck written before study plans existed, which
      // was being studied. Matches the client converter.
      const inPlan = deck.fields?.inPlan?.booleanValue
      const archived = deck.fields?.archived?.booleanValue === true
      if (inPlan !== false && !archived) planned.add(docId(deck))
    }
    return planned
  }

  /**
   * Counts cards due at or before `at` that belong to a deck being studied.
   *
   * Firestore cannot join, and filtering on deckId as well as the due date
   * would need a composite index — which cannot be created while offline and
   * costs a manual setup step. So the due cards are fetched with only their
   * deckId projected and matched here. One read per due card, once a day, is
   * nothing against a 50,000 daily allowance.
   */
  async countDueCards(uid: string, at: Date, planned: ReadonlySet<string>): Promise<number> {
    const result = await this.call<{ document?: FsDocument }[]>(
      `${this.root}/users/${uid}:runQuery`,
      {
        method: 'POST',
        body: JSON.stringify({
          structuredQuery: {
            from: [{ collectionId: 'cards' }],
            select: { fields: [{ fieldPath: 'deckId' }] },
            where: {
              fieldFilter: {
                field: { fieldPath: 'srs.due' },
                op: 'LESS_THAN_OR_EQUAL',
                value: { timestampValue: at.toISOString() },
              },
            },
          },
        }),
      },
    )

    return result.filter((entry) => {
      const deckId = readString(entry.document?.fields, 'deckId')
      return deckId !== '' && planned.has(deckId)
    }).length
  }

  async listPushTokens(uid: string): Promise<string[]> {
    const page = await this.call<{ documents?: FsDocument[] }>(
      `${this.root}/users/${uid}/pushTokens?pageSize=100`,
    )
    return (page.documents ?? []).map((doc) => readString(doc.fields, 'token') || docId(doc))
  }

  async deletePushToken(uid: string, token: string): Promise<void> {
    await this.call(`${this.root}/users/${uid}/pushTokens/${encodeURIComponent(token)}`, {
      method: 'DELETE',
    })
  }

  /**
   * Records the local date a reminder was sent on, which is what stops a
   * second one going out in the same day.
   */
  async markReminderSent(uid: string, localDate: string): Promise<void> {
    const url = new URL(`${this.root}/users/${uid}`)
    url.searchParams.append('updateMask.fieldPaths', 'lastReminderSentOn')
    await this.call(url.toString(), {
      method: 'PATCH',
      body: JSON.stringify({ fields: { lastReminderSentOn: { stringValue: localDate } } }),
    })
  }
}
