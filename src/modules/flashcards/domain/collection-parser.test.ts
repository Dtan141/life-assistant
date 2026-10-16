import { describe, expect, it } from 'vitest'
import { parseCollection } from '@/modules/flashcards/domain/collection-parser'

const row = (...cells: string[]) => cells.join('\t')

const FILE = [
  '## TOEIC 600',
  '',
  '# 01 — Contracts',
  row('agreement', 'thoả thuận'),
  row('clause', 'điều khoản'),
  '',
  '# 02 — Marketing',
  row('market', 'thị trường'),
  row('strategy', 'chiến lược'),
  row('customer', 'khách hàng'),
].join('\n')

describe('parseCollection', () => {
  const parsed = parseCollection(FILE)

  it('reads the collection name', () => {
    expect(parsed.name).toBe('TOEIC 600')
  })

  it('splits into decks by their heading', () => {
    expect(parsed.decks.map((deck) => deck.name)).toEqual([
      '01 — Contracts',
      '02 — Marketing',
    ])
  })

  it('keeps each deck’s own cards', () => {
    expect(parsed.decks[0].result.rows.map((r) => r.card?.term)).toEqual([
      'agreement',
      'clause',
    ])
    expect(parsed.decks[1].result.rows).toHaveLength(3)
  })

  it('totals the whole file', () => {
    expect(parsed.stats).toEqual({ decks: 2, ok: 5, error: 0, duplicate: 0 })
    expect(parsed.errors).toEqual([])
  })

  it('ignores blank lines between sections', () => {
    expect(parsed.decks.every((deck) => deck.result.stats.error === 0)).toBe(true)
  })
})

describe('duplicates are judged per deck', () => {
  it('allows the same word in two topics', () => {
    // "coverage" belongs to both Warranties and Health Insurance; flagging that
    // would bury the clashes that actually matter.
    const parsed = parseCollection(
      [
        '# 03 — Warranties',
        row('coverage', 'phạm vi bảo hành'),
        '# 48 — Health Insurance',
        row('coverage', 'phạm vi bảo hiểm'),
      ].join('\n'),
    )
    expect(parsed.stats).toMatchObject({ decks: 2, ok: 2, duplicate: 0 })
  })

  it('still flags the same word twice in one topic', () => {
    const parsed = parseCollection(
      ['# 02 — Marketing', row('market', 'thị trường'), row('MARKET', 'tiếp thị')].join(
        '\n',
      ),
    )
    expect(parsed.stats).toMatchObject({ ok: 1, duplicate: 1 })
  })
})

describe('malformed files', () => {
  it('reports rows that sit before any deck heading', () => {
    const parsed = parseCollection([row('a', 'nghĩa a'), '# 01 — X', row('b', 'nghĩa b')].join('\n'))
    expect(parsed.errors[0]).toMatch(/1 dòng nằm trước bộ thẻ đầu tiên/)
    expect(parsed.stats.decks).toBe(1)
  })

  it('reports a deck heading with no name', () => {
    const parsed = parseCollection(['# ', row('a', 'nghĩa a')].join('\n'))
    expect(parsed.errors.some((e) => /tên bộ thẻ bị trống/.test(e))).toBe(true)
  })

  it('reports a deck with no cards', () => {
    const parsed = parseCollection(['# 01 — Trống', '# 02 — Có', row('a', 'nghĩa a')].join('\n'))
    expect(parsed.errors.some((e) => /"01 — Trống" không có thẻ nào/.test(e))).toBe(true)
  })

  it('reports a second collection name rather than picking one', () => {
    const parsed = parseCollection(
      ['## Một', '## Hai', '# 01 — X', row('a', 'nghĩa a')].join('\n'),
    )
    expect(parsed.name).toBe('Một')
    expect(parsed.errors.some((e) => /nhiều hơn một tên bộ sưu tập/.test(e))).toBe(true)
  })

  it('passes row-level errors through per deck', () => {
    const parsed = parseCollection(['# 01 — X', row('', 'thiếu từ')].join('\n'))
    expect(parsed.stats).toMatchObject({ error: 1, ok: 0 })
    expect(parsed.decks[0].result.rows[0].errors).toEqual(['Thiếu từ (cột 1)'])
  })

  it('accepts a file with no collection name', () => {
    const parsed = parseCollection(['# 01 — X', row('a', 'nghĩa a')].join('\n'))
    expect(parsed.name).toBeNull()
    expect(parsed.errors).toEqual([])
  })

  it('treats a plain TSV file as having no decks at all', () => {
    // Pointing at the missing headings beats importing one nameless deck.
    const parsed = parseCollection([row('a', 'nghĩa a'), row('b', 'nghĩa b')].join('\n'))
    expect(parsed.stats.decks).toBe(0)
    expect(parsed.errors[0]).toMatch(/2 dòng nằm trước/)
  })
})
