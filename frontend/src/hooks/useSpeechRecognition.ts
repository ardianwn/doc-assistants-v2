import { useEffect, useRef, useState } from 'react'

interface UseSpeechRecognitionProps {
  onResult?: (text: string) => void
  onError?: (error: string) => void
  continuous?: boolean
  language?: string
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
  message: string
}

interface SpeechRecognitionResultList {
  length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  isFinal: boolean
  length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

interface ISpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  abort(): void
  onstart: ((this: ISpeechRecognition, ev: Event) => any) | null
  onend: ((this: ISpeechRecognition, ev: Event) => any) | null
  onerror: ((this: ISpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null
  onresult: ((this: ISpeechRecognition, ev: SpeechRecognitionEvent) => any) | null
}

declare global {
  interface Window {
    SpeechRecognition: new () => ISpeechRecognition
    webkitSpeechRecognition: new () => ISpeechRecognition
  }
}

export function useSpeechRecognition({
  onResult,
  onError,
  continuous = false,
  language = 'id-ID'
}: UseSpeechRecognitionProps = {}) {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const recognitionRef = useRef<ISpeechRecognition | null>(null)
  const currentTranscriptRef = useRef<string>('')
  const isStoppingRef = useRef(false) // Track if user manually stopped
  
  // Store callbacks in refs to avoid recreating recognition on every change
  const onResultRef = useRef(onResult)
  const onErrorRef = useRef(onError)
  
  useEffect(() => {
    onResultRef.current = onResult
    onErrorRef.current = onError
  }, [onResult, onError])

  // Check if browser supports speech recognition
  const isSupported = typeof window !== 'undefined' && 
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  useEffect(() => {
    if (!isSupported) return

    // Initialize speech recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()

    recognition.continuous = continuous
    recognition.interimResults = true
    recognition.lang = language

    recognition.onstart = () => {
      console.log('Speech recognition started')
      setIsListening(true)
    }

    recognition.onend = () => {
      console.log('Speech recognition ended')
      const wasStopping = isStoppingRef.current
      
      setIsListening(false)
      
      // Only submit remaining transcript if user manually stopped
      if (wasStopping) {
        const remainingTranscript = currentTranscriptRef.current
        if (remainingTranscript && onResultRef.current) {
          console.log('Submitting remaining transcript on manual stop:', remainingTranscript)
          onResultRef.current(remainingTranscript.trim())
        }
        // Clear refs after manual stop
        currentTranscriptRef.current = ''
        setTranscript('')
        isStoppingRef.current = false
      } else {
        // Auto-ended (continuous mode restarts) - don't clear transcript
        console.log('Auto-ended, will restart if continuous mode')
      }
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error)
      setIsListening(false)
      setTranscript('')
      currentTranscriptRef.current = '' // Clear ref on error
      if (onErrorRef.current) {
        onErrorRef.current(event.error)
      }
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = ''
      let finalTranscript = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' '
        } else {
          interimTranscript += transcript
        }
      }

      const currentTranscript = finalTranscript || interimTranscript
      setTranscript(currentTranscript)
      currentTranscriptRef.current = currentTranscript // Store in ref for onend handler

      // Submit final results immediately
      if (finalTranscript && onResultRef.current) {
        console.log('Submitting final transcript:', finalTranscript.trim())
        onResultRef.current(finalTranscript.trim())
        currentTranscriptRef.current = '' // Clear ref after submitting
        setTranscript('') // Clear transcript after final result
      }
    }

    recognitionRef.current = recognition

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort()
        } catch (e) {
          console.error('Error aborting recognition:', e)
        }
      }
    }
  }, [continuous, language, isSupported])

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      try {
        setTranscript('') // Clear previous transcript
        currentTranscriptRef.current = '' // Clear ref
        isStoppingRef.current = false // Reset stopping flag
        recognitionRef.current.start()
        console.log('Starting speech recognition...')
      } catch (error) {
        console.error('Error starting speech recognition:', error)
        setIsListening(false)
        if (onError) {
          onError('failed-to-start')
        }
      }
    }
  }

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      try {
        isStoppingRef.current = true // Mark as manual stop
        recognitionRef.current.stop()
        console.log('Stopping speech recognition...')
      } catch (error) {
        console.error('Error stopping speech recognition:', error)
      }
    }
  }

  const resetTranscript = () => {
    setTranscript('')
    currentTranscriptRef.current = ''
  }

  return {
    isSupported,
    isListening,
    transcript,
    startListening,
    stopListening,
    resetTranscript
  }
}
