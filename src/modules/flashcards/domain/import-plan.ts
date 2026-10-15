import type { ParseResult, ParsedRow } from '@/modules/flashcards/domain/tsv-parser'
import type { CardDraft } from '@/modules/flashcards/domain/card.types'

export type DuplicateStrategy = 'skip' | 'overwrite' | 'keep-both'

export interface PlanOptions {
  strategy: DuplicateStrategy
  /** Line numbers the user unticked in the preview table. */
  excludedLines?: ReadonlySet<number>
  /** Per-row choices, which beat the blanket strategy. */
  overrides?: ReadonlyMap<number, DuplicateStrategy>
}

export interface ImportPlan {
  create: CardDraft[]
  overwrite: { id: string; draft: CardDraft }[]
}

export interface PlanSummary extends ImportPlan {
  /** Rows deliberately left out: duplicates skipped, or unticked by the user. */
  skipped: number
  /** Rows that could not be parsed at all. */
  invalid: number
}

/**
 * Turns parsed rows into the writes to perform.
 *
 * A duplicate inside the paste is a different thing from a duplicate against
 * the deck: there is no card id to overwrite, so "overwrite" means the later
 * row wins over the earlier one in this same import.
 */
export function buildImportPlan(
  result: Pick<ParseResult, 'rows'>,
  options: PlanOptions,
): PlanSummary {
  const { strategy, excludedLines, overrides } = options

  const create: CardDraft[] = []
  const overwrite: { id: string; draft: CardDraft }[] = []
  // Where each term landed in `create`, so a later row can replace it.
  const createIndexByTerm = new Map<string, number>()
  let skipped = 0
  let invalid = 0

  const choose = (row: ParsedRow) => overrides?.get(row.lineNo) ?? strategy

  for (const row of result.rows) {
    if (row.status === 'error' || !row.card) {
      invalid += 1
      continue
    }

    if (excludedLines?.has(row.lineNo)) {
      skipped += 1
      continue
    }

    if (row.status === 'ok') {
      createIndexByTerm.set(row.card.termLower, create.length)
      create.push(row.card)
      continue
    }

    switch (choose(row)) {
      case 'skip':
        skipped += 1
        break

      case 'keep-both':
        create.push(row.card)
        break

      case 'overwrite': {
        if (row.duplicateOfCardId) {
          overwrite.push({ id: row.duplicateOfCardId, draft: row.card })
          break
        }
        const index = createIndexByTerm.get(row.card.termLower)
        if (index === undefined) {
          // The row it duplicated was excluded or invalid, so nothing is left
          // to overwrite and this row becomes the one that gets created.
          createIndexByTerm.set(row.card.termLower, create.length)
          create.push(row.card)
        } else {
          create[index] = row.card
        }
        break
      }
    }
  }

  return { create, overwrite, skipped, invalid }
}
