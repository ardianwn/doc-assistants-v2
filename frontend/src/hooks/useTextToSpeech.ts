import { useEffect, useRef, useState } from 'react'

interface UseTextToSpeechProps {
  lang?: string
  rate?: number
  pitch?: number
  volume?: number
}

export function useTextToSpeech({
  lang = 'id-ID',
  rate = 1,
  pitch = 1,
  volume = 1
}: UseTextToSpeechProps = {}) {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const isCancellingRef = useRef(false)

  // Check if browser supports speech synthesis
  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window

  useEffect(() => {
    if (!isSupported) return

    const handleEnd = () => {
      setIsSpeaking(false)
      setIsPaused(false)
    }

    const handleStart = () => {
      setIsSpeaking(true)
      setIsPaused(false)
    }

    const handlePause = () => {
      setIsPaused(true)
    }

    const handleResume = () => {
      setIsPaused(false)
    }

    // Cleanup function
    return () => {
      if (isSupported && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel()
      }
    }
  }, [isSupported])

  const speak = (text: string) => {
    if (!isSupported) {
      console.warn('Speech synthesis not supported')
      return
    }

    // Prevent race conditions - ignore if already cancelling
    if (isCancellingRef.current) {
      console.log('[TTS] Already cancelling, ignoring speak request')
      return
    }

    // Cancel any ongoing speech first
    if (window.speechSynthesis.speaking) {
      isCancellingRef.current = true
      window.speechSynthesis.cancel()
      // Small delay to ensure cancellation is complete
      setTimeout(() => {
        isCancellingRef.current = false
        speakText(text)
      }, 100)
    } else {
      speakText(text)
    }
  }

  const speakText = (text: string) => {
    // Create new utterance
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = lang
    utterance.rate = rate
    utterance.pitch = pitch
    utterance.volume = volume

    utterance.onstart = () => {
      console.log('Speech started')
      setIsSpeaking(true)
      setIsPaused(false)
    }

    utterance.onend = () => {
      console.log('Speech ended')
      setIsSpeaking(false)
      setIsPaused(false)
    }

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event)
      setIsSpeaking(false)
      setIsPaused(false)
    }

    utterance.onpause = () => {
      setIsPaused(true)
    }

    utterance.onresume = () => {
      setIsPaused(false)
    }

    utteranceRef.current = utterance
    window.speechSynthesis.speak(utterance)
  }

  const pause = () => {
    if (isSupported && window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause()
      setIsPaused(true)
    }
  }

  const resume = () => {
    if (isSupported && window.speechSynthesis.paused) {
      window.speechSynthesis.resume()
      setIsPaused(false)
    }
  }

  const cancel = () => {
    if (isSupported) {
      try {
        isCancellingRef.current = true
        window.speechSynthesis.cancel()
        setIsSpeaking(false)
        setIsPaused(false)
        console.log('Speech cancelled')
        // Reset flag after cancellation
        setTimeout(() => {
          isCancellingRef.current = false
        }, 150)
      } catch (error) {
        console.error('Error cancelling speech:', error)
        isCancellingRef.current = false
      }
    }
  }

  return {
    isSupported,
    isSpeaking,
    isPaused,
    speak,
    pause,
    resume,
    cancel
  }
}
