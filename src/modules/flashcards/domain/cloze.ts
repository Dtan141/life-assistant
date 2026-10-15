export const CLOZE_BLANK = '_____'

/** Words too common to be worth blanking out when the term is a phrase. */
const FUNCTION_WORDS = new Set(['a', 'an', 'the', 'of', 'to', 'in', 'on', 'at', 'from', 'sb', 'sth'])

export interface MaskResult {
  text: string
  /** False when the term never appeared, so callers can decide what to do. */
  masked: boolean
}

export interface MaskOptions {
  /**
   * Drops the length guard, so a word-family note like "combine (v)" is hidden
   * alongside "combination". Used for definitions, where over-masking only
   * costs a little readability while a leak destroys the exercise. Sentences
   * keep the guard, so "bird" does not blank out "birdwatching".
   */
  loose?: boolean
}

/**
 * Replaces the term, and plausible inflections of it, with a blank.
 *
 * Matching is on a shared prefix rather than the whole word, because real data
 * rarely repeats a term verbatim: the card says "alight" while the sentence
 * says "alighted", and "pose a threat" appears as "poses a serious threat".
 */
export function maskTerm(
  text: string,
  term: string,
  { loose = false }: MaskOptions = {},
): MaskResult {
  if (!text.trim() || !term.trim()) return { text, masked: false }

  const targets = term
    .toLowerCase()
    .split(/[\s/-]+/)
    .filter((word) => word.length > 1 && !FUNCTION_WORDS.has(word))

  if (targets.length === 0) return { text, masked: false }

  let masked = false
  const out = text.replace(/[\p{L}\p{M}]+/gu, (word) => {
    if (!targets.some((target) => sharePrefix(word.toLowerCase(), target, loose)))
      return word
    masked = true
    return CLOZE_BLANK
  })

  return { text: masked ? collapseBlanks(out) : text, masked }
}

/**
 * Hides the term inside its example sentence.
 *
 * Returns null when nothing could be hidden — the sentence would otherwise give
 * the answer away, and the caller falls back to another mode for that card.
 */
export function clozeExample(example: string, term: string): string | null {
  const result = maskTerm(example, term)
  return result.masked ? result.text : null
}

/**
 * True when one word is plausibly an inflection of the other: they agree on
 * their first few letters and neither is much longer than the other.
 */
function sharePrefix(word: string, target: string, loose: boolean): boolean {
  // Five, not four: "breed" and "breeze" share four letters but are different
  // words, while five still catches alight/alighted and pose/poses.
  const needed = Math.min(5, target.length)
  if (word.length < needed) return false
  const stem = target.slice(0, needed)
  // Loose mode also matches inside the word, because a definition's antonym
  // note carries the answer under a prefix: "(TN: impossibility)" for
  // "possibility", "(TN: impractical solution)" for "practical solution".
  if (loose) return word.includes(stem)
  if (word.slice(0, needed) !== stem) return false
  // Keeps "bird" from swallowing "birdwatching".
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
