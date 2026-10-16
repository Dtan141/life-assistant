import { useState } from 'react'
import { useAuth } from '@/shared/auth/useAuth'
import { useSettings } from '@/shared/settings/useSettings'
import { updateSettings } from '@/shared/settings/settings.repo'
import { Button } from '@/shared/ui/Button'
import { Panel, PanelLink } from '@/shared/ui/Panel'
import { Page, PageHeader } from '@/shared/ui/Page'
import { Spinner } from '@/shared/ui/Spinner'
import { ReminderSettings } from '@/app/ReminderSettings'
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
        <>
          <ReviewSettingsForm key={JSON.stringify(settings)} settings={settings} />
          <ReminderSettings key={`r-${settings.reminderTime}`} settings={settings} />
        </>
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
      <h2 className="font-semibold">Cài đặt chung</h2>

        <TextField
          label="Số từ mới mỗi ngày"
          type="number"
          inputMode="numeric"
          min={0}
          value={newPerDay}
          onChange={(e) => setNewPerDay(e.target.value)}
          hint="Mỗi ngày lấy tối đa chừng này từ chưa học, từ các bộ trong kế hoạch học."
        />

        <TextField
          label="Số lượt ôn tối đa mỗi ngày"
          type="number"
          inputMode="numeric"
          min={0}
          value={maxReviews}
          onChange={(e) => setMaxReviews(e.target.value)}
          hint="Giới hạn lượt ôn các từ đã học, tránh dồn quá nhiều sau nhiều ngày nghỉ."
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
