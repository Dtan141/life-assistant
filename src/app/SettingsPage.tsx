import { useAuth } from '@/shared/auth/useAuth'

export default function SettingsPage() {
  const { user, signOut } = useAuth()

  return (
    <div className="mx-auto max-w-lg space-y-6 px-5 pt-8">
      <h1 className="text-2xl font-bold">Cài đặt</h1>

      <section className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
        {user?.photoURL && (
          <img src={user.photoURL} alt="" className="size-11 rounded-full" />
        )}
        <div className="min-w-0">
          <p className="truncate font-medium">{user?.displayName}</p>
          <p className="truncate text-sm text-slate-500">{user?.email}</p>
        </div>
      </section>

      <button
        type="button"
        onClick={() => void signOut()}
        className="w-full rounded-xl border border-slate-300 py-3 font-medium text-red-600 transition active:scale-[0.98] dark:border-slate-700 dark:text-red-400"
      >
        Đăng xuất
      </button>
    </div>
  )
}
