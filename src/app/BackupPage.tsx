import { useRef, useState } from 'react'
import { useAuth } from '@/shared/auth/useAuth'
import { Button } from '@/shared/ui/Button'
import { Note, Panel } from '@/shared/ui/Panel'
import { Page, PageHeader, Section } from '@/shared/ui/Page'
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
    <Page>
      <PageHeader title="Sao lưu" back={{ to: '/settings', label: 'Cài đặt' }} />

      <Section title="Xuất dữ liệu">
        <p className="mb-3 text-sm text-slate-500">
          Một file JSON chứa toàn bộ bộ thẻ, thẻ, lịch sử ôn tập và cài đặt. Giữ nó ở
          đâu đó ngoài máy — đây là bản duy nhất nằm ngoài Firestore.
        </p>
        <Button onClick={() => void handleExport()} disabled={busy} className="w-full">
          {busy ? 'Đang xử lý…' : 'Tải file sao lưu'}
        </Button>
      </Section>

      <Section title="Khôi phục">
        <p className="mb-3 text-sm text-slate-500">
          Khôi phục <strong>không xoá gì cả</strong>. Thẻ hiện có chỉ bị ảnh hưởng nếu
          bạn chọn ghi đè.
        </p>

        <Button
          variant="secondary"
          onClick={() => fileInput.current?.click()}
          disabled={busy}
          className="mb-3 w-full"
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
          <Panel className="space-y-3 p-4">
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
          </Panel>
        )}

        {outcome && (
          <div className="mt-3">
            <Note tone="success">
              Đã khôi phục {outcome.decks} bộ thẻ, {outcome.cards} thẻ,{' '}
              {outcome.reviewLogs} lượt ôn
              {outcome.skipped > 0 && `, bỏ qua ${outcome.skipped} mục đã có`}.
            </Note>
          </div>
        )}
      </Section>

      <div className="space-y-3">
        {message && <Note tone="success">{message}</Note>}
        {error && <Note tone="danger">{error}</Note>}
      </div>
    </Page>
  )
}
