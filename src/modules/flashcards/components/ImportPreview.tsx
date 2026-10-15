import type { ParsedRow } from '@/modules/flashcards/domain/tsv-parser'
import type { DuplicateStrategy } from '@/modules/flashcards/domain/import-plan'

interface Props {
  rows: ParsedRow[]
  excluded: ReadonlySet<number>
  overrides: ReadonlyMap<number, DuplicateStrategy>
  onToggle: (lineNo: number) => void
  /** An empty strategy means "fall back to the blanket choice". */
  onOverride: (lineNo: number, strategy: DuplicateStrategy | '') => void
}

/**
 * A list rather than a table: on a phone a six-column table is unreadable, and
 * what matters per row is the term, why it is flagged, and what to do about it.
 */
export function ImportPreview({ rows, excluded, overrides, onToggle, onOverride }: Props) {
  return (
    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
      {rows.map((row) => {
        const isExcluded = excluded.has(row.lineNo)
        const tone =
          row.status === 'error'
            ? 'bg-red-50/60 dark:bg-red-950/30'
            : row.status === 'duplicate'
              ? 'bg-amber-50/60 dark:bg-amber-950/30'
              : ''

        return (
          <li key={row.lineNo} className={`${tone} ${isExcluded ? 'opacity-45' : ''}`}>
            <div className="flex gap-3 px-3 py-2.5">
              <span className="w-7 shrink-0 pt-0.5 text-right text-xs tabular-nums text-slate-400">
                {row.lineNo}
              </span>

              <div className="min-w-0 flex-1">
                {row.status === 'error' ? (
                  <>
                    <p className="truncate text-sm text-slate-500">
                      {row.raw.replace(/\t/g, ' · ') || '(dòng trống)'}
                    </p>
                    <p className="mt-0.5 text-sm text-red-600 dark:text-red-400">
                      {row.errors.join(' · ')}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="truncate font-medium">{row.card?.term}</p>
                    <p className="truncate text-sm text-slate-500">{row.card?.definition}</p>
                    {row.status === 'duplicate' && (
                      <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-500">
                        {row.duplicateOfLine
                          ? `Trùng với dòng ${row.duplicateOfLine} trong đoạn dán`
                          : 'Đã có trong bộ thẻ này'}
                      </p>
                    )}
                  </>
                )}

                {row.status === 'duplicate' && !isExcluded && (
                  <select
                    value={overrides.get(row.lineNo) ?? ''}
                    onChange={(e) =>
                      onOverride(row.lineNo, e.target.value as DuplicateStrategy | '')
                    }
                    className="mt-1.5 rounded-lg border border-slate-300 bg-transparent px-2 py-1 text-xs dark:border-slate-700"
                    aria-label={`Cách xử lý dòng ${row.lineNo}`}
                  >
                    <option value="">Theo lựa chọn chung</option>
                    <option value="skip">Bỏ qua</option>
                    <option value="overwrite">Ghi đè</option>
                    <option value="keep-both">Giữ cả hai</option>
                  </select>
                )}
              </div>

              {row.status !== 'error' && (
                <label className="flex shrink-0 items-start pt-0.5">
                  <span className="sr-only">Nhập dòng {row.lineNo}</span>
                  <input
                    type="checkbox"
                    checked={!isExcluded}
                    onChange={() => onToggle(row.lineNo)}
                    className="size-5 accent-slate-900 dark:accent-slate-100"
                  />
                </label>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
