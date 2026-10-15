/**
 * Compares a typed answer with the card's term.
 *
 * Spec §3.4 asks for small mistakes to be forgiven. What counts as small here:
 * capitalisation, surrounding whitespace, hyphens and apostrophes, a trailing
 * full stop, and one typo in a word long enough that a typo is plausible.
 * Anything more is a different word, and accepting it would teach the wrong
 * spelling.
 */
export function normalizeAnswer(value: string): string {
  return value
    .toLowerCase()
    .replace(/[’']/g, '')
    // Hyphens and slashes become spaces: "fast-moving" and "fast moving" are
    // the same answer, as are the halves of "sb/sth".
    .replace(/[-–—/]/g, ' ')
    .replace(/[.,;:!?]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export type AnswerVerdict = 'correct' | 'close' | 'wrong'

export function checkAnswer(input: string, term: string): AnswerVerdict {
  const typed = normalizeAnswer(input)
  const expected = normalizeAnswer(term)
  if (!typed) return 'wrong'
  if (typed === expected) return 'correct'
  // Only for words long enough that a single slip is more likely than a
  // different word: "cat" and "cut" are not near-misses of each other.
  if (expected.length >= 5 && editDistance(typed, expected) <= 1) return 'close'
  return 'wrong'
}

/** Levenshtein distance, capped early since only a result of 0 or 1 matters. */
export function editDistance(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 1) return 2
  if (a === b) return 0

  let previous = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const current = [i]
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      )
    }
    if (Math.min(...current) > 1) return 2
    previous = current
  }
  return previous[b.length]
}
