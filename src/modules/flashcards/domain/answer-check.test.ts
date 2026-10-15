import { describe, expect, it } from 'vitest'
import { checkAnswer, normalizeAnswer } from '@/modules/flashcards/domain/answer-check'

describe('normalizeAnswer', () => {
  it('ignores case and surrounding space', () => {
    expect(normalizeAnswer('  Accidental ')).toBe('accidental')
  })

  it('treats a hyphen as a space', () => {
    expect(normalizeAnswer('fast-moving')).toBe(normalizeAnswer('fast moving'))
  })

  it('drops apostrophes and end punctuation', () => {
    expect(normalizeAnswer("bird's.")).toBe('birds')
  })

  it('collapses the slash in placeholders', () => {
    expect(normalizeAnswer('prevent sb/sth from V-ing')).toBe('prevent sb sth from v ing')
  })
})

describe('checkAnswer', () => {
  it('accepts the exact term', () => {
    expect(checkAnswer('accidental', 'accidental')).toBe('correct')
  })

  it('accepts the forgivable differences', () => {
    expect(checkAnswer('Accidental', 'accidental')).toBe('correct')
    expect(checkAnswer('fast moving traffic', 'fast-moving traffic')).toBe('correct')
    expect(checkAnswer('  seize. ', 'seize')).toBe('correct')
  })

  it('calls one typo in a long word close, not wrong', () => {
    expect(checkAnswer('accidentol', 'accidental')).toBe('close')
    expect(checkAnswer('vulnrable', 'vulnerable')).toBe('close')
  })

  it('does not forgive a typo in a short word', () => {
    // "cut" is not a near-miss of "cat"; accepting it would teach the wrong word.
    expect(checkAnswer('cut', 'cat')).toBe('wrong')
  })

  it('rejects a different word', () => {
    expect(checkAnswer('accident', 'accidental')).toBe('wrong')
    expect(checkAnswer('threat', 'threaten')).toBe('wrong')
  })

  it('rejects an empty answer', () => {
    expect(checkAnswer('   ', 'accidental')).toBe('wrong')
  })

  it('handles a multi-word term', () => {
    expect(checkAnswer('pose a threat', 'pose a threat')).toBe('correct')
    expect(checkAnswer('pose threat', 'pose a threat')).toBe('wrong')
  })
})
