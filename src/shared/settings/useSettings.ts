import { useEffect, useState } from 'react'
import { useAuth } from '@/shared/auth/useAuth'
import { watchSettings } from '@/shared/settings/settings.repo'
import { DEFAULT_SETTINGS } from '@/shared/types'
import type { UserSettings } from '@/shared/types'

interface Snapshot {
  uid: string | null
  settings: UserSettings
}

export function useSettings(): { settings: UserSettings; loading: boolean } {
  const { user } = useAuth()
  const [snapshot, setSnapshot] = useState<Snapshot>({
    uid: null,
    settings: DEFAULT_SETTINGS,
  })

  useEffect(() => {
    if (!user) return
    const { uid } = user
    return watchSettings(
      uid,
      (settings) => setSnapshot({ uid, settings }),
      (error) => {
        console.error('Failed to load settings', error)
        // Defaults are usable, so a read failure must not stop a review.
        setSnapshot({ uid, settings: DEFAULT_SETTINGS })
      },
    )
  }, [user])

  const loading = !user || snapshot.uid !== user.uid
  return { settings: loading ? DEFAULT_SETTINGS : snapshot.settings, loading }
}
