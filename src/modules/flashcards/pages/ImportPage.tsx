import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@/shared/auth/useAuth'
import { settleOrContinue } from '@/shared/lib/pending'
import { useOnlineStatus } from '@/shared/hooks/useOnlineStatus'
import { Button } from '@/shared/ui/Button'
import { Spinner } from '@/shared/ui/Spinner'
import { Note } from '@/shared/ui/Panel'
import { Page } from '@/shared/ui/Page'
import { ImportPreview } from '@/modules/flashcards/components/ImportPreview'
import { getDeck } from '@/modules/flashcards/data/decks.repo'
import { getExistingTerms, saveImport } from '@/modules/flashcards/data/cards.repo'
import { parseCards } from '@/modules/flashcards/domain/tsv-parser'
import { buildImportPlan } from '@/modules/flashcards/domain/import-plan'
import type { DuplicateStrategy } from '@/modules/flashcards/domain/import-plan'
import type { Deck } from '@/modules/flashcards/domain/card.types'

const DELIMITERS = [
  { value: '\t', label: 'Tab (khuyên dùng)' },
  { value: ',', label: 'Dấu phẩy' },
  { value: ';', label: 'Chấm phẩy' },
  { value: '|', label: 'Gạch đứng' },
]

export default function ImportPage() {
  const { deckId = '' } = useParams()
  const { user } = useAuth()
  const online = useOnlineStatus()
  const navigate = useNavigate()
  const fileInput = useRef<HTMLInputElement>(null)

  const [deck, setDeck] = useState<Deck | null>(null)
  const [existingTerms, setExistingTerms] = useState<Map<string, string>>(new Map())
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [raw, setRaw] = useState('')
  const [columnDelimiter, setColumnDelimiter] = useState('\t')
  const [hasHeader, setHasHeader] = useState(false)
  const [strategy, setStrategy] = useState<DuplicateStrategy>('skip')
  const [excluded, setExcluded] = useState<Set<number>>(new Set())
  const [overrides, setOverrides] = useState<Map<number, DuplicateStrategy>>(new Map())

  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    if (!user || !deckId) return
    let cancelled = false
    void (async () => {
      try {
        const [loadedDeck, terms] = await Promise.all([
          getDeck(user.uid, deckId),
          getExistingTerms(user.uid, deckId),
        ])
        if (cancelled) return
        setDeck(loadedDeck)
        setExistingTerms(terms)
      } catch (err) {
        console.error('Failed to load deck for import', err)
        // Carry the real message through: "could not load" alone leaves no way
        // to tell a missing index from a permissions problem or a dead network.
        const detail = err instanceof Error ? err.message : String(err)
        if (!cancelled) setLoadError(`Không tải được bộ thẻ. ${detail}`)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user, deckId])

  const parsed = useMemo(
    () => parseCards(raw, { columnDelimiter, hasHeader, existingTerms }),
    [raw, columnDelimiter, hasHeader, existingTerms],
  )

  const plan = useMemo(
    () => buildImportPlan(parsed, { strategy, excludedLines: excluded, overrides }),
    [parsed, strategy, excluded, overrides],
  )

  const willWrite = plan.create.length + plan.overwrite.length

  function toggleRow(lineNo: number) {
    setExcluded((prev) => {
      const next = new Set(prev)
      if (next.has(lineNo)) next.delete(lineNo)
      else next.add(lineNo)
      return next
    })
  }

  function overrideRow(lineNo: number, value: DuplicateStrategy | '') {
    setOverrides((prev) => {
      const next = new Map(prev)
      if (value) next.set(lineNo, value)
      else next.delete(lineNo)
      return next
    })
  }

  async function handleFile(file: File) {
    setRaw(await file.text())
    // Let the same file be picked again after an edit.
    if (fileInput.current) fileInput.current.value = ''
  }

  async function handleSave() {
    if (!user || !deckId || willWrite === 0) return
    setSaving(true)
    setSaveError(null)
    try {
      // Firestore acknowledges a write only when the server does, so waiting
      // for it would hang the screen offline. The cards are already in the
      // local cache by the time this returns.
      const outcome = await settleOrContinue(saveImport(user.uid, deckId, plan), {
        onLateError: (err) => console.error('Import failed to sync', err),
      })
      if (outcome === 'failed') {
        setSaveError('Lưu không thành công. Thử lại.')
        setSaving(false)
        return
      }
      navigate(`/flashcards/${deckId}`, { replace: true })
    } catch (err) {
      console.error('Failed to save import', err)
      setSaveError('Lưu không thành công. Thử lại.')
      setSaving(false)
    }
  }

  if (loading) return <Spinner label="Đang mở bộ thẻ…" />

  if (loadError || !deck) {
    return (
      <Page>
        <div className="mb-3">
          <Note tone="danger">{loadError ?? 'Bộ thẻ không tồn tại.'}</Note>
        </div>
        <Link to="/flashcards" className="text-sm text-slate-500">
          ← Về danh sách bộ thẻ
        </Link>
      </Page>
    )
  }

  return (
    <Page>
      <div className="space-y-5">
      <div>
        <Link to={`/flashcards/${deckId}`} className="text-sm text-slate-500">
          ← {deck.name}
        </Link>
        <div className="mt-1 flex items-baseline justify-between gap-3">
          <h1 className="text-2xl font-bold">Nhập thẻ</h1>
          <Link
            to="/flashcards/huong-dan-nhap"
            className="shrink-0 text-sm text-slate-500 underline underline-offset-2"
          >
            Định dạng file?
          </Link>
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="paste" className="block text-sm font-medium">
          Dán danh sách từ
        </label>
        <textarea
          id="paste"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          rows={7}
          spellCheck={false}
          placeholder={'Từ ⇥ Nghĩa ⇥ Phiên âm ⇥ Loại từ ⇥ Ví dụ ⇥ Đồng nghĩa\n\naccidental ⇥ vô tình, do tai nạn ⇥ /ˌæksɪˈdentl/ ⇥ adj'}
          className="w-full rounded-xl border border-slate-300 bg-transparent p-3 font-mono text-sm outline-none focus:border-slate-900 dark:border-slate-700 dark:focus:border-slate-300"
        />
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="text-sm text-slate-500 underline underline-offset-2"
          >
            hoặc chọn file .tsv / .csv / .txt
          </button>
          <input
            ref={fileInput}
            type="file"
            accept=".tsv,.csv,.txt,text/plain"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void handleFile(file)
            }}
          />
          {raw && (
            <button
              type="button"
              onClick={() => setRaw('')}
              className="ml-auto text-sm text-slate-500 underline underline-offset-2"
            >
              Xoá hết
            </button>
          )}
        </div>
      </div>

      <details className="rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-800">
        <summary className="cursor-pointer text-sm text-slate-600 dark:text-slate-300">
          Tuỳ chọn đọc file
        </summary>
        <div className="mt-3 space-y-3 pb-1">
          <div className="space-y-1">
            <label htmlFor="delim" className="block text-sm font-medium">
              Phân cách cột
            </label>
            <select
              id="delim"
              value={columnDelimiter}
              onChange={(e) => setColumnDelimiter(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-transparent px-3 py-2.5 text-base dark:border-slate-700"
            >
              {DELIMITERS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500">
              Nghĩa và phát âm thường chứa dấu phẩy, nên Tab là lựa chọn an toàn.
            </p>
          </div>

          <label className="flex items-center gap-2.5 text-sm">
            <input
              type="checkbox"
              checked={hasHeader}
              onChange={(e) => setHasHeader(e.target.checked)}
              className="size-5 accent-slate-900 dark:accent-slate-100"
            />
            Dòng đầu là tiêu đề cột
          </label>
        </div>
      </details>

      {parsed.warnings.map((warning) => (
        <Note key={warning} tone="warning">
          {warning}
        </Note>
      ))}

      {parsed.rows.length > 0 && (
        <>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <Stat value={parsed.stats.ok} label="hợp lệ" />
            {parsed.stats.duplicate > 0 && (
              <Stat value={parsed.stats.duplicate} label="trùng" tone="amber" />
            )}
            {parsed.stats.error > 0 && (
              <Stat value={parsed.stats.error} label="lỗi" tone="red" />
            )}
          </div>

          {parsed.stats.duplicate > 0 && (
            <div className="space-y-1">
              <label htmlFor="strategy" className="block text-sm font-medium">
                Với thẻ trùng
              </label>
              <select
                id="strategy"
                value={strategy}
                onChange={(e) => setStrategy(e.target.value as DuplicateStrategy)}
                className="w-full rounded-xl border border-slate-300 bg-transparent px-3 py-2.5 text-base dark:border-slate-700"
              >
                <option value="skip">Bỏ qua, giữ thẻ cũ</option>
                <option value="overwrite">Ghi đè bằng nội dung mới</option>
                <option value="keep-both">Giữ cả hai</option>
              </select>
              <p className="text-xs text-slate-500">
                Ghi đè chỉ thay nội dung, tiến độ ôn tập của thẻ được giữ nguyên.
              </p>
            </div>
          )}

          <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
            <ImportPreview
              rows={parsed.rows}
              excluded={excluded}
              overrides={overrides}
              onToggle={toggleRow}
              onOverride={(line, value) => overrideRow(line, value)}
            />
          </div>
        </>
      )}

      {saveError && <Note tone="danger">{saveError}</Note>}

      <div
        className="sticky bottom-0 -mx-5 border-t border-slate-200 bg-white/95 px-5 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95"
        style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom))' }}
      >
        <Button
          onClick={() => void handleSave()}
          disabled={willWrite === 0 || saving}
          className="w-full"
        >
          {saving
            ? 'Đang lưu…'
            : willWrite === 0
              ? 'Chưa có thẻ nào để nhập'
              : `Nhập ${willWrite} thẻ`}
        </Button>
        {willWrite > 0 && !online && (
          <p className="mt-1.5 text-center text-xs text-amber-700 dark:text-amber-500">
            Đang offline — thẻ sẽ lưu vào máy và tự đồng bộ khi có mạng.
          </p>
        )}
        {willWrite > 0 && (
          <p className="mt-1.5 text-center text-xs text-slate-500">
            {plan.create.length} thẻ mới
            {plan.overwrite.length > 0 && `, ${plan.overwrite.length} thẻ ghi đè`}
            {plan.skipped > 0 && `, ${plan.skipped} bỏ qua`}
            {plan.invalid > 0 && `, ${plan.invalid} dòng lỗi`}
          </p>
        )}
      </div>
      </div>
    </Page>
  )
}

function Stat({
  value,
  label,
  tone,
}: {
  value: number
  label: string
  tone?: 'amber' | 'red'
}) {
  const color =
    tone === 'red'
      ? 'text-red-600 dark:text-red-400'
      : tone === 'amber'
        ? 'text-amber-700 dark:text-amber-500'
        : ''
  return (
    <span className={color}>
      <strong className="tabular-nums">{value}</strong> {label}
    </span>
  )
}
