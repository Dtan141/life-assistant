import { useSpeech } from '@/shared/hooks/useSpeech'
import type { Card } from '@/modules/flashcards/domain/card.types'

interface Props {
  card: Card
  revealed: boolean
  onReveal: () => void
}

export function ReviewCard({ card, revealed, onReveal }: Props) {
  const { speak, supported } = useSpeech()

  return (
    <div
      onClick={revealed ? undefined : onReveal}
      className={`rounded-2xl border border-slate-200 p-6 dark:border-slate-800 ${
        revealed ? '' : 'no-select cursor-pointer'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-2xl font-bold break-words">{card.term}</h2>
          {card.pronunciation && (
            <p className="mt-1 font-mono text-sm text-slate-500">{card.pronunciation}</p>
          )}
        </div>
        {supported && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              speak(card.term)
            }}
            aria-label="Phát âm"
            className="shrink-0 rounded-full p-2.5 text-slate-500 active:bg-slate-100 dark:active:bg-slate-800"
          >
            <SpeakerIcon />
          </button>
        )}
      </div>

      {card.partOfSpeech && (
        <p className="mt-2 text-sm text-slate-400">{card.partOfSpeech}</p>
      )}

      {revealed ? (
        <div className="mt-5 space-y-3 border-t border-slate-100 pt-5 dark:border-slate-800">
          <p className="text-lg">{card.definition}</p>

          {card.example && (
            <p className="text-slate-600 italic dark:text-slate-400">{card.example}</p>
          )}
          {card.myExample && (
            <p className="text-slate-600 dark:text-slate-400">{card.myExample}</p>
          )}
          {card.synonyms.length > 0 && (
            <p className="text-sm text-slate-500">
              <span className="text-slate-400">Đồng nghĩa: </span>
              {card.synonyms.join('; ')}
            </p>
          )}
          {card.antonyms.length > 0 && (
            <p className="text-sm text-slate-500">
              <span className="text-slate-400">Trái nghĩa: </span>
              {card.antonyms.join('; ')}
            </p>
          )}
        </div>
      ) : (
        <p className="mt-6 text-center text-sm text-slate-400">
          Chạm để lật · hoặc phím Space
        </p>
      )}
    </div>
  )
}

function SpeakerIcon() {
  return (
    <svg
      className="size-6"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M11 5 6 9H3v6h3l5 4z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />
    </svg>
  )
}
