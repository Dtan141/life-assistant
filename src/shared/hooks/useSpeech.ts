import { useCallback, useEffect, useRef } from 'react'

const supported = typeof window !== 'undefined' && 'speechSynthesis' in window

/**
 * Text-to-speech through the browser's own voices — free, offline on most
 * devices, and no API key, which is what spec §3.4 asks for.
 */
export function useSpeech(lang = 'en-US') {
  const voice = useRef<SpeechSynthesisVoice | null>(null)

  useEffect(() => {
    if (!supported) return

    const pick = () => {
      const voices = speechSynthesis.getVoices()
      voice.current =
        voices.find((v) => v.lang === lang) ??
        voices.find((v) => v.lang.startsWith(lang.split('-')[0])) ??
        null
    }

    pick()
    // Chrome loads voices asynchronously and reports an empty list until then.
    speechSynthesis.addEventListener('voiceschanged', pick)
    return () => speechSynthesis.removeEventListener('voiceschanged', pick)
  }, [lang])

  const speak = useCallback(
    (text: string) => {
      if (!text || !supported) return
      // Cancel first: tapping twice should restart, not queue up behind itself.
      speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = lang
      if (voice.current) utterance.voice = voice.current
      utterance.rate = 0.95
      speechSynthesis.speak(utterance)
    },
    [lang],
  )

  useEffect(() => () => window.speechSynthesis?.cancel(), [])

  return { speak, supported }
}
