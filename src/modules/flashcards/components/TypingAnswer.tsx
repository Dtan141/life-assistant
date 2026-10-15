import { useRef } from 'react'
import { Button } from '@/shared/ui/Button'
import type { AnswerVerdict } from '@/modules/flashcards/domain/answer-check'

interface Props {
  value: string
  verdict: AnswerVerdict | null
  term: string
  onChange: (value: string) => void
  onSubmit: () => void
}

export function TypingAnswer({ value, verdict, term, onChange, onSubmit }: Props) {
  const input = useRef<HTMLInputElement>(null)

  return (
    <div className="mt-5 space-y-2">
      <form
        onSubmit={(event) => {
          event.preventDefault()
          if (!verdict) onSubmit()
        }}
        className="flex gap-2"
      >
        <input
          ref={input}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={verdict !== null}
          autoFocus
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          placeholder="Gõ từ tiếng Anh…"
          className={`w-full rounded-xl border bg-transparent px-3.5 py-3 text-base outline-none disabled:opacity-80 ${
            verdict === 'correct'
              ? 'border-emerald-400'
              : verdict === 'close'
                ? 'border-amber-400'
                : verdict === 'wrong'
                  ? 'border-red-400'
                  : 'border-slate-300 focus:border-slate-900 dark:border-slate-700 dark:focus:border-slate-300'
          }`}
        />
        {!verdict && (
          <Button type="submit" disabled={!value.trim()}>
            Kiểm tra
          </Button>
        )}
      </form>

      {verdict === 'correct' && (
        <p className="text-sm text-emerald-700 dark:text-emerald-400">Chính xác.</p>
      )}
      {verdict === 'close' && (
        <p className="text-sm text-amber-700 dark:text-amber-500">
          Gần đúng — chính tả là <strong>{term}</strong>.
        </p>
      )}
      {verdict === 'wrong' && (
        <p className="text-sm text-red-600 dark:text-red-400">
          Chưa đúng. Đáp án: <strong>{term}</strong>.
        </p>
      )}
    </div>
  )
}
