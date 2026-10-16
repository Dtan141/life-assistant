import type { Card, CardSrs, Deck } from '@/modules/flashcards/domain/card.types'
import type { UserSettings } from '@/shared/types'

export const BACKUP_FORMAT = 'life-assistant-backup'
export const BACKUP_VERSION = 1

export interface ReviewLogEntry {
  id: string
  cardId: string
  deckId: string
  rating: number
  reviewedAt: Date
  elapsedDays: number
  scheduledDays: number
  mode: string
  wasNew: boolean
}

export interface BackupData {
  settings: UserSettings
  decks: Deck[]
  cards: Card[]
  reviewLogs: ReviewLogEntry[]
}

export interface BackupFile extends BackupData {
  format: typeof BACKUP_FORMAT
  version: number
  exportedAt: Date
}

/**
 * Serialises to JSON with dates as ISO strings, so a backup stays readable and
 * diffable rather than being a dump of Firestore's internal timestamp shape.
 */
export function serializeBackup(data: BackupData, exportedAt = new Date()): string {
  const file = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: exportedAt.toISOString(),
    settings: data.settings,
    decks: data.decks.map((deck) => ({
      ...deck,
      createdAt: deck.createdAt.toISOString(),
      updatedAt: deck.updatedAt.toISOString(),
    })),
    cards: data.cards.map((card) => ({
      ...card,
      createdAt: card.createdAt.toISOString(),
      updatedAt: card.updatedAt.toISOString(),
      srs: card.srs
        ? {
            ...card.srs,
            due: card.srs.due.toISOString(),
            lastReview: card.srs.lastReview?.toISOString() ?? null,
          }
        : null,
    })),
    reviewLogs: data.reviewLogs.map((log) => ({
      ...log,
      reviewedAt: log.reviewedAt.toISOString(),
    })),
  }
  return JSON.stringify(file, null, 2)
}

export type ParseResult =
  | { ok: true; file: BackupFile }
  | { ok: false; error: string }

/**
 * Reads a backup back.
 *
 * Returns an error rather than throwing, and refuses anything it does not
 * recognise: restoring half-understood data over a working deck would be worse
 * than refusing to restore at all.
 */
export function parseBackup(text: string): ParseResult {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { ok: false, error: 'File không phải JSON hợp lệ.' }
  }

  if (!isRecord(raw)) return { ok: false, error: 'Nội dung file không đúng định dạng.' }
  if (raw.format !== BACKUP_FORMAT) {
    return { ok: false, error: 'Đây không phải file sao lưu của Life Assistant.' }
  }
  if (typeof raw.version !== 'number' || raw.version > BACKUP_VERSION) {
    return {
      ok: false,
      error: `File sao lưu phiên bản ${String(raw.version)}, bản app này chỉ đọc được tới ${BACKUP_VERSION}.`,
    }
  }
  if (!Array.isArray(raw.decks) || !Array.isArray(raw.cards)) {
    return { ok: false, error: 'File thiếu danh sách bộ thẻ hoặc thẻ.' }
  }

  const decks = raw.decks.filter(isRecord).map(toDeck)
  const cards = raw.cards.filter(isRecord).map(toCard)
  const reviewLogs = Array.isArray(raw.reviewLogs)
    ? raw.reviewLogs.filter(isRecord).map(toLog)
    : []

  return {
    ok: true,
    file: {
      format: BACKUP_FORMAT,
      version: raw.version,
      exportedAt: toDate(raw.exportedAt) ?? new Date(0),
      settings: raw.settings as UserSettings,
      decks,
      cards,
      reviewLogs,
    },
  }
}

/** Cards whose deck is missing would be invisible forever once restored. */
export function findOrphanCards(file: BackupFile): Card[] {
  const deckIds = new Set(file.decks.map((deck) => deck.id))
  return file.cards.filter((card) => !deckIds.has(card.deckId))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function toDate(value: unknown): Date | null {
  if (typeof value !== 'string') return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function strList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []
}

function num(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function toDeck(raw: Record<string, unknown>): Deck {
  const createdAt = toDate(raw.createdAt) ?? new Date(0)
  return {
    id: str(raw.id),
    name: str(raw.name),
    description: str(raw.description),
    tags: strList(raw.tags),
    sourceUrl: str(raw.sourceUrl),
    collection: str(raw.collection),
    // Same reasoning as the Firestore converter: a backup taken before study
    // plans existed describes decks that were all being studied.
    inPlan: raw.inPlan === undefined ? true : raw.inPlan === true,
    cardCount: num(raw.cardCount),
    createdAt,
    updatedAt: toDate(raw.updatedAt) ?? createdAt,
    archived: raw.archived === true,
  }
}

function toSrs(value: unknown): CardSrs | null {
  if (!isRecord(value)) return null
  const due = toDate(value.due)
  if (!due) return null
  const state = str(value.state)
  return {
    due,
    stability: num(value.stability),
    difficulty: num(value.difficulty),
    reps: num(value.reps),
    lapses: num(value.lapses),
    state:
      state === 'learning' || state === 'review' || state === 'relearning'
        ? state
        : 'new',
    lastReview: toDate(value.lastReview),
  }
}

function toCard(raw: Record<string, unknown>): Card {
  const createdAt = toDate(raw.createdAt) ?? new Date(0)
  const term = str(raw.term)
  return {
    id: str(raw.id),
    deckId: str(raw.deckId),
    term,
    termLower: str(raw.termLower) || term.toLowerCase(),
    definition: str(raw.definition),
    pronunciation: str(raw.pronunciation),
    partOfSpeech: str(raw.partOfSpeech),
    example: str(raw.example),
    synonyms: strList(raw.synonyms),
    antonyms: strList(raw.antonyms),
    wordFamily: str(raw.wordFamily),
    myExample: str(raw.myExample),
    tags: strList(raw.tags),
    createdAt,
    updatedAt: toDate(raw.updatedAt) ?? createdAt,
    srs: toSrs(raw.srs),
  }
}

function toLog(raw: Record<string, unknown>): ReviewLogEntry {
  return {
    id: str(raw.id),
    cardId: str(raw.cardId),
    deckId: str(raw.deckId),
    rating: num(raw.rating),
    reviewedAt: toDate(raw.reviewedAt) ?? new Date(0),
    elapsedDays: num(raw.elapsedDays),
    scheduledDays: num(raw.scheduledDays),
    mode: str(raw.mode),
    wasNew: raw.wasNew === true,
  }
}

/** A deck as TSV, in the same column order the import accepts. */
export function deckToTsv(cards: readonly Card[]): string {
  return cards
    .map((card) =>
      [
        card.term,
        card.definition,
        card.pronunciation,
        card.partOfSpeech,
        card.example,
        card.synonyms.join('; '),
        card.antonyms.join('; '),
        card.tags.join('; '),
      ]
        // A tab inside a field would shift every column after it on re-import.
        .map((field) => field.replace(/[\t\r\n]+/g, ' '))
        .join('\t'),
    )
    .join('\n')
}
