import { getDoc, updateDoc } from 'firebase/firestore'
import { userDoc } from '@/shared/auth/user.repo'
import { toNum } from '@/shared/firebase/convert'
import { createDeck, listDecks } from '@/modules/flashcards/data/decks.repo'
import { saveImport } from '@/modules/flashcards/data/cards.repo'
import {
  missingSections,
  parseCollection,
} from '@/modules/flashcards/domain/collection-parser'
import { buildImportPlan } from '@/modules/flashcards/domain/import-plan'

export const CATALOG_URL = '/catalog/toeic-600.tsv'

/**
 * Raised whenever the shipped catalogue gains topics — otherwise accounts that
 * already recorded a version never see them.
 *
 * Seeding then runs again and adds only what is missing, so the topics someone
 * already has keep their review history, and ones they deleted stay deleted.
 *
 * 1: topics 1-3.  2: topics 4-28.  3: topics 29-32.  4: topics 33-36.  5: topics 37-40.
 */
export const CATALOG_VERSION = 5

export interface SeedOutcome {
  decks: number
  cards: number
  /** Topics the account already had, left untouched with their history. */
  skipped: number
}

export async function fetchCatalog(): Promise<string> {
  const response = await fetch(CATALOG_URL)
  if (!response.ok) throw new Error(`Không tải được bộ thẻ mẫu (${response.status}).`)
  return response.text()
}

/**
 * Writes the catalogue into one account as ordinary decks the user owns.
 *
 * A copy rather than a shared library: the cards then behave like any other —
 * editable, deletable, with their own review history — and nothing else in the
 * app needs to know they came from us.
 *
 * Every deck lands outside the study plan. Six hundred words arriving in a
 * queue nobody asked for would be the app deciding what someone should learn.
 */
export async function seedCatalog(uid: string, raw: string): Promise<SeedOutcome> {
  const parsed = parseCollection(raw)
  if (parsed.errors.length > 0) {
    throw new Error(`Bộ thẻ mẫu bị lỗi định dạng: ${parsed.errors[0]}`)
  }

  const collection = parsed.name ?? 'Bộ sưu tập'

  /**
   * Only what is missing. Seeding runs again whenever the catalogue gains
   * topics, and re-creating the ones already present would leave two decks per
   * topic — one carrying the review history, one empty.
   *
   * Archived decks count as present: putting a topic away must not cause a
   * fresh copy of it to appear.
   */
  const existing = await listDecks(uid, { includeArchived: true })
  const sections = missingSections(
    parsed.decks,
    existing.filter((deck) => deck.collection === collection).map((deck) => deck.name),
  )

  const outcome: SeedOutcome = {
    decks: 0,
    cards: 0,
    skipped: parsed.decks.length - sections.length,
  }

  for (const section of sections) {
    const plan = buildImportPlan(section.result, { strategy: 'skip' })
    if (plan.create.length === 0) continue

    const deckId = await createDeck(uid, {
      name: section.name,
      collection,
      inPlan: false,
      description: '',
    })
    await saveImport(uid, deckId, plan)

    outcome.decks += 1
    outcome.cards += plan.create.length
  }

  return outcome
}

/**
 * Gives a new account the catalogue, once.
 *
 * The version is recorded whatever happens next, so deleting the collection
 * keeps it deleted. Re-seeding something the user threw away would be the app
 * arguing with them.
 */
export async function ensureCatalog(uid: string): Promise<SeedOutcome | null> {
  const profile = await getDoc(userDoc(uid))
  if (toNum(profile.data()?.catalogVersion, 0) >= CATALOG_VERSION) return null

  const outcome = await seedCatalog(uid, await fetchCatalog())
  await updateDoc(userDoc(uid), { catalogVersion: CATALOG_VERSION })
  return outcome
}

/** Re-imports the catalogue on request, for someone who removed it and changed their mind. */
export async function reimportCatalog(uid: string): Promise<SeedOutcome> {
  const outcome = await seedCatalog(uid, await fetchCatalog())
  await updateDoc(userDoc(uid), { catalogVersion: CATALOG_VERSION })
  return outcome
}
