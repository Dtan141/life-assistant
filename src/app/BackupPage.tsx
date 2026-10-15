import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/shared/auth/useAuth'
import { Button } from '@/shared/ui/Button'
import { downloadText, stampedName } from '@/shared/lib/download'
import { collectBackup, restoreBackup } from '@/modules/flashcards/data/backup.repo'
import type { RestoreMode, RestoreOutcome } from '@/modules/flashcards/data/backup.repo'
import {
  findOrphanCards,
  parseBackup,
  serializeBackup,
} from '@/modules/flashcards/domain/backup'
import type { BackupFile } from '@/modules/flashcards/domain/backup'

export default function BackupPage() {
  const { user } = useAuth()
  const fileInput = useRef<HTMLInputElement>(null)

  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<BackupFile | null>(null)
  const [outcome, setOutcome] = useState<RestoreOutcome | null>(null)

  async function handleExport() {
    if (!user) return
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const data = await collectBackup(user.uid)
      downloadText(
        stampedName('life-assistant', 'json'),
        serializeBackup(data),
      )
      setMessage(
        `Đã xuất ${data.decks.length} bộ thẻ, ${data.cards.length} thẻ và ${data.reviewLogs.length} lượt ôn.`,
      )
    } catch (err) {
      console.error('Export failed', err)
      setError('Không xuất được dữ liệu. Kiểm tra mạng rồi thử lại.')
    } finally {
      setBusy(false)
    }
  }

  async function handleFile(file: File) {
    setError(null)
    setMessage(null)
    setOutcome(null)
    const result = parseBackup(await file.text())
    if (!result.ok) {
      setError(result.error)
      setPending(null)
    } else {
      setPending(result.file)
    }
    if (fileInput.current) fileInput.current.value = ''
  }

  async function handleRestore(mode: RestoreMode) {
    if (!user || !pending) return
    setBusy(true)
    setError(null)
    try {
      setOutcome(await restoreBackup(user.uid, pending, mode))
      setPending(null)
    } catch (err) {
      console.error('Restore failed', err)
      setError('Khôi phục không thành công. Dữ liệu hiện tại không bị thay đổi.')
    } finally {
      setBusy(false)
    }
  }

  const orphans = pending ? findOrphanCards(pending) : []

  return (
    <div className="mx-auto max-w-lg space-y-6 px-5 pt-6">
      <div>
        <Link to="/settings" className="text-sm text-slate-500">
          ← Cài đặt
        </Link>
        <h1 className="mt-1 text-2xl font-bold">Sao lưu</h1>
      </div>

      <section className="space-y-3">
        <h2 className="font-semibold">Xuất dữ liệu</h2>
        <p className="text-sm text-slate-500">
          Một file JSON chứa toàn bộ bộ thẻ, thẻ, lịch sử ôn tập và cài đặt. Giữ nó ở
          đâu đó ngoài máy — đây là bản duy nhất nằm ngoài Firestore.
        </p>
        <Button onClick={() => void handleExport()} disabled={busy} className="w-full">
          {busy ? 'Đang xử lý…' : 'Tải file sao lưu'}
        </Button>
      </section>

      <section className="space-y-3 border-t border-slate-200 pt-6 dark:border-slate-800">
        <h2 className="font-semibold">Khôi phục</h2>
        <p className="text-sm text-slate-500">
          Khôi phục <strong>không xoá gì cả</strong>. Thẻ hiện có chỉ bị ảnh hưởng nếu
          bạn chọn ghi đè.
        </p>

        <Button
          variant="secondary"
          onClick={() => fileInput.current?.click()}
          disabled={busy}
          className="w-full"
        >
          Chọn file sao lưu…
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void handleFile(file)
          }}
        />

        {pending && (
          <div className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
            <p className="text-sm">
              File ngày{' '}
              <strong>{pending.exportedAt.toLocaleDateString('vi-VN')}</strong>:{' '}
              {pending.decks.length} bộ thẻ, {pending.cards.length} thẻ,{' '}
              {pending.reviewLogs.length} lượt ôn.
            </p>

            {orphans.length > 0 && (
              <p className="text-sm text-amber-700 dark:text-amber-500">
                {orphans.length} thẻ không thuộc bộ nào trong file này. Khôi phục xong
                chúng sẽ không hiện ở đâu cả.
              </p>
            )}

            <div className="space-y-2">
              <Button
                onClick={() => void handleRestore('merge')}
                disabled={busy}
                className="w-full"
              >
                Chỉ thêm những gì còn thiếu
              </Button>
              <Button
                variant="danger"
                onClick={() => void handleRestore('overwrite')}
                disabled={busy}
                className="w-full"
              >
                Ghi đè bằng nội dung trong file
              </Button>
              <Button
                variant="ghost"
                onClick={() => setPending(null)}
                disabled={busy}
                className="w-full"
              >
                Huỷ
              </Button>
            </div>

            <p className="text-xs text-slate-500">
              <strong>Chỉ thêm</strong> giữ nguyên mọi thứ đang có, dùng khi lỡ xoá mất
              một bộ. <strong>Ghi đè</strong> thay nội dung và cả tiến độ ôn tập bằng bản
              trong file, dùng khi muốn quay về đúng thời điểm sao lưu.
            </p>
          </div>
        )}

        {outcome && (
          <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            Đã khôi phục {outcome.decks} bộ thẻ, {outcome.cards} thẻ,{' '}
            {outcome.reviewLogs} lượt ôn
            {outcome.skipped > 0 && `, bỏ qua ${outcome.skipped} mục đã có`}.
          </p>
        )}
      </section>

      {message && (
        <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}
    </div>
  )
}
