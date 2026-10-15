import { describe, expect, it } from 'vitest'
import { CLOZE_BLANK, clozeExample } from '@/modules/flashcards/domain/cloze'

const B = CLOZE_BLANK

describe('clozeExample on the real deck', () => {
  it('hides a term that appears verbatim', () => {
    expect(clozeExample('Most eagle deaths are accidental.', 'accidental')).toBe(
      `Most eagle deaths are ${B}.`,
    )
  })

  it('hides an inflected form', () => {
    // The card says "alight", the sentence says "alighted".
    expect(
      clozeExample('The eagle alighted on a high-voltage wire.', 'alight'),
    ).toBe(`The eagle ${B} on a high-voltage wire.`)
  })

  it('hides a plural', () => {
    expect(
      clozeExample('Eagles are birds of prey that feed on small mammals.', 'bird of prey'),
    ).toBe(`Eagles are ${B} of ${B} that feed on small mammals.`)
  })

  it('hides the content words of a phrase split apart in the sentence', () => {
    expect(
      clozeExample(
        'Plastic waste poses a serious threat to sea birds.',
        'pose a threat',
      ),
    ).toBe(`Plastic waste ${B} a serious ${B} to sea birds.`)
  })

  it('collapses neighbouring blanks into one', () => {
    expect(clozeExample('A long-term solution is needed.', 'long-term')).toBe(
      `A ${B} solution is needed.`,
    )
  })
})

describe('when nothing can be hidden', () => {
  it('returns null rather than showing the sentence unchanged', () => {
    // An unchanged sentence would give the answer away in cloze mode.
    expect(clozeExample('Eagles hunt at dawn.', 'rodent')).toBeNull()
  })

  it('returns null without an example', () => {
    expect(clozeExample('', 'accidental')).toBeNull()
  })

  it('returns null without a term', () => {
    expect(clozeExample('Some sentence.', '   ')).toBeNull()
  })

  it('returns null when the term is only function words', () => {
    expect(clozeExample('It is in the box.', 'in the')).toBeNull()
  })
})

describe('prefix matching stays tight', () => {
  it('does not hide a merely similar longer word', () => {
    expect(clozeExample('Birdwatching enthusiasts gather here.', 'bird')).toBeNull()
  })

  it('does not hide a word that only shares three letters', () => {
    expect(clozeExample('The breeze was cold.', 'breed')).toBeNull()
  })
})
