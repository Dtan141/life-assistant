import { useState } from 'react'
import { useAuth } from '@/shared/auth/useAuth'
import { useSettings } from '@/shared/settings/useSettings'
import { updateSettings } from '@/shared/settings/settings.repo'
import { Button } from '@/shared/ui/Button'
import { Panel, PanelLink } from '@/shared/ui/Panel'
import { Page, PageHeader } from '@/shared/ui/Page'
import { Spinner } from '@/shared/ui/Spinner'
import { TextField } from '@/shared/ui/Field'
import type { UserSettings } from '@/shared/types'

export default function SettingsPage() {
  const { user, signOut } = useAuth()
  const { settings, loading } = useSettings()

  return (
    <Page>
      <PageHeader title="Cài đặt" />

      <Panel className="mb-6 flex items-center gap-3 p-4">
        {user?.photoURL && (
          <img src={user.photoURL} alt="" className="size-11 rounded-full" />
        )}
        <div className="min-w-0">
          <p className="truncate font-medium">{user?.displayName}</p>
          <p className="truncate text-sm text-slate-500">{user?.email}</p>
        </div>
      </Panel>

      {loading ? (
        <Spinner />
      ) : (
        // Remounting on change seeds the inputs from stored values without an
        // effect, and picks up edits made on another device.
        <ReviewSettingsForm key={JSON.stringify(settings)} settings={settings} />
      )}

      <div className="my-6 space-y-3">
        <PanelLink
          to="/settings/backup"
          title="Sao lưu"
          description="Xuất toàn bộ dữ liệu ra file, hoặc khôi phục"
        />
        <PanelLink
          to="/flashcards/huong-dan-nhap"
          title="Cách chuẩn bị file nhập"
          description="Thứ tự cột, ví dụ, và lỗi hay gặp"
        />
      </div>

      <Button
        variant="secondary"
        onClick={() => void signOut()}
        className="w-full text-red-600 dark:text-red-400"
      >
        Đăng xuất
      </Button>
    </Page>
  )
}

function ReviewSettingsForm({ settings }: { settings: UserSettings }) {
  const { user } = useAuth()
  const [newPerDay, setNewPerDay] = useState(String(settings.newPerDay))
  const [maxReviews, setMaxReviews] = useState(String(settings.maxReviewsPerDay))
  const [retention, setRetention] = useState(String(settings.desiredRetention))
  const [reminderTime, setReminderTime] = useState(settings.reminderTime)
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)

  async function handleSave() {
    if (!user) return
    setBusy(true)
    setSaved(false)
    try {
      await updateSettings(user.uid, {
        newPerDay: Math.max(0, Number(newPerDay) || 0),
        maxReviewsPerDay: Math.max(0, Number(maxReviews) || 0),
        desiredRetention: Math.min(0.98, Math.max(0.7, Number(retention) || 0.9)),
        reminderTime,
      })
      setSaved(true)
    } catch (err) {
      console.error('Failed to save settings', err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="space-y-4">
      <h2 className="font-semibold">Ôn tập</h2>

        <TextField
          label="Thẻ mới mỗi ngày"
          type="number"
          inputMode="numeric"
          min={0}
          value={newPerDay}
          onChange={(e) => setNewPerDay(e.target.value)}
          hint="Số từ mới được đưa vào học mỗi ngày."
        />

        <TextField
          label="Lượt ôn tối đa mỗi ngày"
          type="number"
          inputMode="numeric"
          min={0}
          value={maxReviews}
          onChange={(e) => setMaxReviews(e.target.value)}
          hint="Hạn mức này tách riêng với thẻ mới, nên nợ ôn không chặn việc học từ mới."
        />

        <TextField
          label="Tỉ lệ nhớ mong muốn"
          type="number"
          inputMode="decimal"
          step={0.01}
          min={0.7}
          max={0.98}
          value={retention}
          onChange={(e) => setRetention(e.target.value)}
          hint="0.9 là mặc định. Cao hơn thì ôn dày hơn và nhớ chắc hơn, nhưng tốn thời gian hơn."
        />

        <TextField
          label="Giờ nhắc hằng ngày"
          type="time"
          value={reminderTime}
          onChange={(e) => setReminderTime(e.target.value)}
          hint="Thông báo đẩy sẽ hoạt động ở M4."
        />

        <div className="flex items-center gap-3">
          <Button onClick={() => void handleSave()} disabled={busy}>
            {busy ? 'Đang lưu…' : 'Lưu cài đặt'}
          </Button>
          {saved && <span className="text-sm text-emerald-600">Đã lưu</span>}
        </div>
    </section>
  )
}
