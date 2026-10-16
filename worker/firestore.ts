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

  /**
   * Counts cards due at or before `at`.
   *
   * An aggregation query rather than fetching the cards: the Worker needs one
   * number, and a deck of thousands would otherwise be pulled across the
   * network every quarter of an hour.
   */
  async countDueCards(uid: string, at: Date): Promise<number> {
    const result = await this.call<
      { result?: { aggregateFields?: { count?: { integerValue?: string } } } }[]
    >(`${this.root}/users/${uid}:runAggregationQuery`, {
      method: 'POST',
      body: JSON.stringify({
        structuredAggregationQuery: {
          aggregations: [{ alias: 'count', count: {} }],
          structuredQuery: {
            from: [{ collectionId: 'cards' }],
            where: {
              fieldFilter: {
                field: { fieldPath: 'srs.due' },
                op: 'LESS_THAN_OR_EQUAL',
                value: { timestampValue: at.toISOString() },
              },
            },
          },
        },
      }),
    })

    const count = result.find((entry) => entry.result?.aggregateFields?.count)
    return Number(count?.result?.aggregateFields?.count?.integerValue ?? 0)
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
