import { useEffect, useState } from 'react'
import { useAuth } from '@/shared/auth/useAuth'
import { Button } from '@/shared/ui/Button'
import { Note } from '@/shared/ui/Panel'
import { Section } from '@/shared/ui/Page'
import { TextField } from '@/shared/ui/Field'
import { updateSettings } from '@/shared/settings/settings.repo'
import {
  findPushBlocker,
  hasPushPermission,
  recallToken,
  registerForPush,
  rememberToken,
  unregisterFromPush,
} from '@/shared/push/messaging'
import { settleOrContinue } from '@/shared/lib/pending'
import type { PushBlocker } from '@/shared/push/messaging'
import { deletePushToken, savePushToken } from '@/shared/push/push.repo'
import type { UserSettings } from '@/shared/types'

const BLOCKER_TEXT: Record<Exclude<PushBlocker, null>, string> = {
  'ios-needs-install':
    'Trên iPhone, thông báo chỉ hoạt động khi app đã được thêm vào Màn hình chính. Mở bằng Safari → nút Chia sẻ → Thêm vào MH chính, rồi mở app từ icon đó.',
  unsupported: 'Trình duyệt này không hỗ trợ thông báo đẩy.',
  denied:
    'Bạn đã từ chối quyền thông báo cho trang này. Phải bật lại trong cài đặt trình duyệt, app không hỏi lại được nữa.',
}

export function ReminderSettings({ settings }: { settings: UserSettings }) {
  const { user } = useAuth()
  const [blocker, setBlocker] = useState<PushBlocker | 'checking'>('checking')
  const [enabled, setEnabled] = useState(hasPushPermission())
  // Recalled rather than fetched: after a reload the SDK would have to
  // re-register to tell us the token, which is the opposite of turning off.
  const [token, setToken] = useState<string | null>(recallToken)
  const [reminderTime, setReminderTime] = useState(settings.reminderTime)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void findPushBlocker().then((result) => {
      if (!cancelled) setBlocker(result)
    })
    return () => {
      cancelled = true
    }
  }, [])

  async function turnOn() {
    if (!user) return
    setBusy(true)
    setMessage(null)
    try {
      const fresh = await registerForPush()
      if (!fresh) {
        setBlocker('denied')
        return
      }
      await savePushToken(user.uid, fresh)
      rememberToken(fresh)
      setToken(fresh)
      setEnabled(true)
      setMessage('Đã bật. Thiết bị này sẽ nhận nhắc nhở.')
    } catch (err) {
      console.error('Failed to enable push', err)
      // Carries the reason: a timeout and a blocked request need different
      // responses, and "thử lại sau" tells the user neither.
      setMessage(
        `Không bật được thông báo. ${err instanceof Error ? err.message : String(err)}`,
      )
    } finally {
      setBusy(false)
    }
  }

  async function turnOff() {
    if (!user) return
    setBusy(true)
    setMessage(null)
    try {
      // The Firestore record is what the reminder job reads, so removing it
      // is what actually stops the notifications; revoking with FCM is tidying
      // up. Neither is allowed to hang the button.
      if (token) {
        await settleOrContinue(deletePushToken(user.uid, token), {
          onLateError: (err) => console.error('Token delete failed to sync', err),
        })
      }
      await unregisterFromPush()
      rememberToken(null)
      setEnabled(false)
      setToken(null)
      setMessage('Đã tắt nhắc nhở trên thiết bị này.')
    } catch (err) {
      console.error('Failed to disable push', err)
      setMessage(
        `Không tắt được. ${err instanceof Error ? err.message : String(err)}`,
      )
    } finally {
      setBusy(false)
    }
  }

  async function saveTime(value: string) {
    setReminderTime(value)
    if (user) await updateSettings(user.uid, { reminderTime: value })
  }

  return (
    <Section title="Nhắc nhở ôn tập">
      {blocker === 'checking' ? (
        <p className="text-sm text-slate-500">Đang kiểm tra…</p>
      ) : blocker ? (
        <Note tone="warning">{BLOCKER_TEXT[blocker]}</Note>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Mỗi ngày vào giờ bạn chọn, nếu có thẻ đến hạn thì điện thoại sẽ báo. Quyền
            thông báo là <strong>riêng từng thiết bị</strong> — bật trên iPhone không
            tự bật trên máy tính.
          </p>

          <Button
            variant={enabled ? 'secondary' : 'primary'}
            onClick={() => void (enabled ? turnOff() : turnOn())}
            disabled={busy}
            className="w-full"
          >
            {busy
              ? 'Đang xử lý…'
              : enabled
                ? 'Tắt nhắc nhở trên thiết bị này'
                : 'Bật nhắc nhở trên thiết bị này'}
          </Button>

          <TextField
            label="Giờ nhắc hằng ngày"
            type="time"
            value={reminderTime}
            onChange={(e) => void saveTime(e.target.value)}
            hint="Lưu ngay khi đổi. Thông báo có thể đến muộn tối đa 15 phút."
          />

          {message && (
            <Note tone={message.startsWith('Không') ? 'danger' : 'info'}>{message}</Note>
          )}
        </div>
      )}
    </Section>
  )
}
