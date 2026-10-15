import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { clozeExample } from '@/modules/flashcards/domain/cloze'

const rows = readFileSync(
  fileURLToPath(new URL('./__fixtures__/eagles.tsv', import.meta.url)),
  'utf8',
)
  .split('\n')
  .filter(Boolean)
  .map((line) => line.split('\t'))

/**
 * Cloze is only worth offering if it works on most real cards. This measures
 * that on the actual export rather than on invented sentences, and pins the
 * result so a future tweak to the matcher cannot quietly gut the mode.
 */
describe('cloze coverage on the 59-card eagle deck', () => {
  const results = rows.map(([term, , , , example]) => ({
    term,
    masked: clozeExample(example ?? '', term),
  }))
  const covered = results.filter((r) => r.masked !== null)

  it('covers every card in the deck', () => {
    // Measured, not aspirational: all 59 mask cleanly today. If a matcher
    // change drops one, the names of the casualties show up here.
    expect(results.filter((r) => r.masked === null).map((r) => r.term)).toEqual([])
  })

  it('never leaves the term visible in a masked sentence', () => {
    for (const { term, masked } of covered) {
      const head = term.toLowerCase().split(/[\s/-]+/)[0]
      if (head.length < 5) continue
      expect(masked!.toLowerCase()).not.toContain(head)
    }
  })
})
