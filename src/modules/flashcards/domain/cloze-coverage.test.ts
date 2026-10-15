import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { clozeExample, maskTerm } from '@/modules/flashcards/domain/cloze'

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

/**
 * Definitions in this deck routinely carry the English term inside them, as
 * collocations or word-family notes. Showing one unmasked in Việt → Anh or
 * typing mode simply hands over the answer, so this pins that none slips out.
 */
describe('masking the term inside its own definition', () => {
  const leaks = rows
    .map(([term, definition]) => ({
      term,
      prompt: maskTerm(definition ?? '', term, { loose: true }).text.toLowerCase(),
    }))
    .filter(({ term, prompt }) => {
      const head = term.toLowerCase().split(/[\s/-]+/)[0]
      return head.length >= 5 && prompt.includes(head)
    })
    .map(({ term }) => term)

  it('leaves no card showing its own answer', () => {
    expect(leaks).toEqual([])
  })

  it('masks the cases that motivated this', () => {
    // Loose matching also catches the word-family note: "combine" is four
    // letters shorter than "combination", so the strict rule would miss it.
    const combination = maskTerm(
      'sự kết hợp — a combination OF A and B · combine (v)',
      'combination',
      { loose: true },
    ).text
    expect(combination).not.toMatch(/combin/i)

    const vegetation = maskTerm(
      'thảm thực vật, cây cối — thick vegetation',
      'vegetation',
      { loose: true },
    ).text
    expect(vegetation).not.toMatch(/vegetation/i)
  })

  it('leaves the Vietnamese meaning readable', () => {
    const masked = maskTerm('thảm thực vật, cây cối — thick vegetation', 'vegetation', {
      loose: true,
    }).text
    expect(masked).toContain('thảm thực vật, cây cối')
  })
})
