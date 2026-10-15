import { useMemo } from 'react'
import { useSpeech } from '@/shared/hooks/useSpeech'
import { CLOZE_BLANK, clozeExample } from '@/modules/flashcards/domain/cloze'
import type { ReviewMode } from '@/modules/flashcards/domain/review-mode'
import type { Card } from '@/modules/flashcards/domain/card.types'

interface Props {
  card: Card
  mode: ReviewMode
  revealed: boolean
  onReveal: () => void
  /** Rendered between prompt and answer; the typing mode puts its input here. */
  children?: React.ReactNode
}

export function ReviewCard({ card, mode, revealed, onReveal, children }: Props) {
  const { speak, supported } = useSpeech()

  // Falls back to showing the term when the sentence cannot hide it, rather
  // than printing an example that gives the answer away.
  const cloze = useMemo(
    () => (mode === 'cloze' ? clozeExample(card.example, card.term) : null),
    [mode, card.example, card.term],
  )
  const asksForTerm = mode !== 'en-vi' && !(mode === 'cloze' && !cloze)

  return (
    <div
      onClick={revealed || children ? undefined : onReveal}
      className={`rounded-2xl border border-slate-200 p-6 dark:border-slate-800 ${
        revealed || children ? '' : 'no-select cursor-pointer'
      }`}
    >
      {/* Prompt */}
      {asksForTerm ? (
        <div className="space-y-3">
          {cloze ? (
            <p className="text-lg leading-relaxed">
              {cloze.split(CLOZE_BLANK).map((part, i, all) => (
                <span key={i}>
                  {part}
                  {i < all.length - 1 && (
                    <span className="mx-0.5 inline-block min-w-16 border-b-2 border-slate-400 align-bottom" />
                  )}
                </span>
              ))}
            </p>
          ) : (
            <p className="text-xl font-medium">{card.definition}</p>
          )}
          {card.partOfSpeech && (
            <p className="text-sm text-slate-400">{card.partOfSpeech}</p>
          )}
        </div>
      ) : (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-2xl font-bold break-words">{card.term}</h2>
            {card.pronunciation && (
              <p className="mt-1 font-mono text-sm text-slate-500">{card.pronunciation}</p>
            )}
            {card.partOfSpeech && (
              <p className="mt-1 text-sm text-slate-400">{card.partOfSpeech}</p>
            )}
          </div>
          {supported && (
            <SpeakButton onClick={() => speak(card.term)} />
          )}
        </div>
      )}

      {children}

      {revealed ? (
        <div className="mt-5 space-y-3 border-t border-slate-100 pt-5 dark:border-slate-800">
          {asksForTerm ? (
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-2xl font-bold break-words">{card.term}</p>
                {card.pronunciation && (
                  <p className="mt-1 font-mono text-sm text-slate-500">
                    {card.pronunciation}
                  </p>
                )}
              </div>
              {supported && <SpeakButton onClick={() => speak(card.term)} />}
            </div>
          ) : (
            <p className="text-lg">{card.definition}</p>
          )}

          {asksForTerm && cloze && <p className="text-slate-500">{card.definition}</p>}

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
        !children && (
          <p className="mt-6 text-center text-sm text-slate-400">
            Chạm để lật · hoặc phím Space
          </p>
        )
      )}
    </div>
  )
}

function SpeakButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      aria-label="Phát âm"
      className="shrink-0 rounded-full p-2.5 text-slate-500 active:bg-slate-100 dark:active:bg-slate-800"
    >
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
    </button>
  )
}
