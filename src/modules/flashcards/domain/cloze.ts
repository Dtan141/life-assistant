export const CLOZE_BLANK = '_____'

/** Words too common to be worth blanking out when the term is a phrase. */
const FUNCTION_WORDS = new Set(['a', 'an', 'the', 'of', 'to', 'in', 'on', 'at', 'from', 'sb', 'sth'])

/**
 * Hides the term inside its example sentence.
 *
 * An exact match is rare in real data: the card says "alight" while the example
 * says "alighted", and "pose a threat" appears as "poses a serious threat". So
 * words are matched on a shared prefix rather than in full, which catches
 * inflections without needing a stemmer.
 *
 * Returns null when nothing could be hidden — the sentence would otherwise give
 * the answer away, and the caller falls back to another mode for that card.
 */
export function clozeExample(example: string, term: string): string | null {
  if (!example.trim() || !term.trim()) return null

  const targets = term
    .toLowerCase()
    .split(/[\s/-]+/)
    .filter((word) => word.length > 1 && !FUNCTION_WORDS.has(word))

  if (targets.length === 0) return null

  let hid = false
  const masked = example.replace(/[\p{L}\p{M}]+/gu, (word) => {
    if (!targets.some((target) => sharePrefix(word.toLowerCase(), target))) return word
    hid = true
    return CLOZE_BLANK
  })

  return hid ? collapseBlanks(masked) : null
}

/**
 * True when one word is plausibly an inflection of the other: they agree on
 * their first few letters and neither is much longer than the other.
 */
function sharePrefix(word: string, target: string): boolean {
  // Five, not four: "breed" and "breeze" share four letters but are different
  // words, while five still catches alight/alighted and pose/poses.
  const needed = Math.min(5, target.length)
  if (word.length < needed) return false
  if (word.slice(0, needed) !== target.slice(0, needed)) return false
  // "breed" must not swallow "breeding ground"-sized words, nor "bird" match
  // "birdwatching enthusiast".
  return Math.abs(word.length - target.length) <= 3
}

/**
 * "_____ _____ threat" reads worse than one blank, and a hyphenated term like
 * "long-term" is split into two words by the matcher, leaving "_____-_____".
 */
function collapseBlanks(sentence: string): string {
  return sentence.replace(
    new RegExp(`${CLOZE_BLANK}([\\s-]+${CLOZE_BLANK})+`, 'g'),
    CLOZE_BLANK,
  )
}
