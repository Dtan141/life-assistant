import { parseCards } from '@/modules/flashcards/domain/tsv-parser'
import type { ParseOptions, ParseResult } from '@/modules/flashcards/domain/tsv-parser'

export interface ParsedDeckSection {
  name: string
  /** 1-based line where this section's heading sits, for error messages. */
  lineNo: number
  result: ParseResult
}

export interface ParsedCollection {
  /** From a `## ` line, if the file names itself. */
  name: string | null
  decks: ParsedDeckSection[]
  /** Problems with the file's shape, as opposed to a single row. */
  errors: string[]
  stats: { decks: number; ok: number; error: number; duplicate: number }
}

const COLLECTION_PREFIX = '## '
const DECK_PREFIX = '# '

/**
 * Reads a whole collection — many decks — from one file.
 *
 * Fifty topics would otherwise mean fifty imports. A line starting with `# `
 * opens a deck and everything under it is ordinary TSV, so the format is one
 * rule on top of what the import already accepts, and a file can be written or
 * generated without learning anything new.
 *
 * Duplicates are judged per deck: the same word legitimately appears in two
 * topics, and flagging that would bury the clashes that matter.
 */
export function parseCollection(
  raw: string,
  options: Omit<ParseOptions, 'hasHeader'> = {},
): ParsedCollection {
  const text = raw.replace(/^﻿/, '').replace(/\r\n?/g, '\n')

  let name: string | null = null
  const errors: string[] = []
  const sections: { name: string; lineNo: number; lines: string[] }[] = []
  let orphanLines = 0

  text.split('\n').forEach((line, index) => {
    const lineNo = index + 1
    if (!line.trim()) return

    if (line.startsWith(COLLECTION_PREFIX)) {
      const value = line.slice(COLLECTION_PREFIX.length).trim()
      // A second one is a mistake, not a rename: say so rather than silently
      // keeping one of them.
      if (name !== null) {
        errors.push(`Dòng ${lineNo}: file có nhiều hơn một tên bộ sưu tập.`)
      } else if (value) {
        name = value
      }
      return
    }

    if (line.startsWith(DECK_PREFIX)) {
      const value = line.slice(DECK_PREFIX.length).trim()
      if (!value) {
        errors.push(`Dòng ${lineNo}: tên bộ thẻ bị trống.`)
        return
      }
      sections.push({ name: value, lineNo, lines: [] })
      return
    }

    if (sections.length === 0) {
      orphanLines += 1
      return
    }
    sections[sections.length - 1].lines.push(line)
  })

  if (orphanLines > 0) {
    errors.push(
      `${orphanLines} dòng nằm trước bộ thẻ đầu tiên nên không thuộc về đâu. Mỗi nhóm thẻ cần một dòng bắt đầu bằng "# ".`,
    )
  }

  const decks = sections.map(
    (section): ParsedDeckSection => ({
      name: section.name,
      lineNo: section.lineNo,
      result: parseCards(section.lines.join('\n'), options),
    }),
  )

  const empty = decks.filter((deck) => deck.result.stats.total === 0)
  for (const deck of empty) {
    errors.push(`Dòng ${deck.lineNo}: bộ thẻ "${deck.name}" không có thẻ nào.`)
  }

  return {
    name,
    decks,
    errors,
    stats: {
      decks: decks.length,
      ok: sum(decks, (deck) => deck.result.stats.ok),
      error: sum(decks, (deck) => deck.result.stats.error),
      duplicate: sum(decks, (deck) => deck.result.stats.duplicate),
    },
  }
}

function sum(decks: readonly ParsedDeckSection[], pick: (deck: ParsedDeckSection) => number) {
  return decks.reduce((total, deck) => total + pick(deck), 0)
}
