import { app } from '@/shared/firebase/app'

export default function App() {
  return (
    <main className="flex min-h-full flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-3xl font-bold">Life Assistant</h1>
      <p className="text-slate-500 dark:text-slate-400">
        M0 — nền tảng đã chạy. Module Flashcard đang được xây.
      </p>
      <p className="text-xs text-slate-400">Firebase project: {app.options.projectId}</p>
    </main>
  )
}
