'use client'

import { Loading } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { useTextToSpeech } from '@/hooks/useTextToSpeech'
import { ChatMessage, chatService, ChatSession } from '@/lib/chatService'
import { cn } from '@/lib/utils'
import { Bot, Copy, Edit3, Menu, Mic, MicOff, RefreshCw, Send, Share, User, Volume2, VolumeX } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize from 'rehype-sanitize'
import remarkBreaks from 'remark-breaks'
import remarkGfm from 'remark-gfm'
import ChatSidebar from './ChatSidebar'

export default function ChatPage() {
  const { user } = useAuth()
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string>('')
  const [currentThreadId, setCurrentThreadId] = useState<string>('') // For OpenAI Assistants continuity
  const useAssistant = true // Always use Assistant API (default behavior)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false) // Changed default to false for mobile-first
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [autoSpeak, setAutoSpeak] = useState(false)
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null)
  const [loadingDots, setLoadingDots] = useState('')
  const [loadingStage, setLoadingStage] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Speech Recognition
  const { 
    isSupported: isSpeechSupported, 
    isListening, 
    transcript,
    startListening, 
    stopListening,
    resetTranscript
  } = useSpeechRecognition({
    onResult: (text: string) => {
      console.log('[ChatPage] Received voice input:', text)
      const trimmedText = text.trim()
      if (trimmedText) {
        setInput(prev => {
          const currentText = prev.trim()
          const newInput = currentText ? `${currentText} ${trimmedText}` : trimmedText
          console.log('[ChatPage] Updated input:', newInput)
          return newInput
        })
      }
    },
    onError: (error: string) => {
      console.error('Speech error in chat:', error)
      if (error === 'not-allowed') {
        alert('Microphone permission ditolak. Silakan izinkan akses microphone di browser settings.')
      } else if (error === 'no-speech') {
        // Don't alert for no-speech, keep listening
        console.log('No speech detected, continuing to listen...')
      } else if (error === 'aborted') {
        // Normal abort, don't alert
        console.log('Speech recognition aborted')
      } else {
        alert(`Speech recognition error: ${error}`)
      }
    },
    continuous: true,
    language: 'id-ID'
  })

  // Text to Speech
  const { 
    isSupported: isTTSSupported, 
    isSpeaking,
    speak,
    cancel
  } = useTextToSpeech({
    lang: 'id-ID',
    rate: 1,
    pitch: 1
  })

  // Get current session
  const currentSession = chatSessions.find(session => session.id === currentSessionId)
  const messages = currentSession?.messages || []

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Handle responsive sidebar
  useEffect(() => {
    const handleResize = () => {
      // Auto-open sidebar on desktop, auto-close on mobile
      if (window.innerWidth >= 768) {
        setIsSidebarOpen(true)
      } else {
        setIsSidebarOpen(false)
      }
    }

    // Set initial state
    handleResize()

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Load chat history from backend and localStorage
  useEffect(() => {
    const loadChatHistory = async () => {
      try {
        const sessions = await chatService.syncWithBackend();
        if (sessions.length > 0) {
          setChatSessions(sessions);
          setCurrentSessionId(sessions[0].id);
        } else {
          // Create new session if no history exists
          const newSession: ChatSession = {
            id: chatService.generateSessionId(),
            title: 'New Chat',
            messages: [],
            createdAt: new Date(),
            lastUpdated: new Date()
          };
          setChatSessions([newSession]);
          setCurrentSessionId(newSession.id);
        }
      } catch (error) {
        console.error('Error loading chat history:', error);
        // Fallback to new session
        const newSession: ChatSession = {
          id: chatService.generateSessionId(),
          title: 'New Chat',
          messages: [],
          createdAt: new Date(),
          lastUpdated: new Date()
        };
        setChatSessions([newSession]);
        setCurrentSessionId(newSession.id);
      }
    };

    loadChatHistory();
  }, []);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading || !currentSession) return
    
    // Ensure we have a valid session ID
    if (!currentSessionId) {
      console.error('No current session ID available');
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: input,
      role: 'user',
      timestamp: new Date()
    }

    // Update current session with new message
    setChatSessions(prev => {
      const updated = prev.map(session => {
        if (session.id === currentSessionId) {
          // Update title if this is the first message in the session
          let newTitle = session.title;
          if (session.messages.length === 0) {
            // Generate smart title from first user message
            newTitle = generateSmartTitle(input.trim());
          }
          
          return { 
            ...session, 
            title: newTitle,
            messages: [...session.messages, userMessage], 
            lastUpdated: new Date() 
          };
        }
        return session;
      });
      // Move the updated session to the top
      const reordered = moveSessionToTop(updated, currentSessionId);
      // Save to localStorage
      chatService.saveSessionToLocalStorage(reordered);
      return reordered;
    });
    setInput('')
    setIsLoading(true)

    try {
      // Use OpenAI Assistants API for better reasoning (or fallback to tools)
      let data;
      
      if (useAssistant) {
        // Use Assistants API - more powerful reasoning with conversation continuity
        data = await chatService.sendMessageWithAssistant(input, currentSessionId, currentThreadId);
        // Store thread_id for conversation continuity
        setCurrentThreadId(data.thread_id);
      } else {
        // Use Tools API - simpler approach
        data = await chatService.sendMessage(input, currentSessionId);
      }

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: data.answer,
        role: 'assistant',
        timestamp: new Date()
      }

      // Update current session with assistant message
      setChatSessions(prev => {
        const updated = prev.map(session => {
          if (session.id === currentSessionId) {
            // Update title if this session still has default title
            let newTitle = session.title;
            if (session.title === 'New Chat' && session.messages.length > 0) {
              const firstUserMessage = session.messages.find(msg => msg.role === 'user');
              if (firstUserMessage) {
                newTitle = generateSmartTitle(firstUserMessage.content);
              }
            }
            
            return { 
              ...session, 
              title: newTitle,
              messages: [...session.messages, assistantMessage], 
              lastUpdated: new Date() 
            };
          }
          return session;
        });
        // Move the updated session to the top
        const reordered = moveSessionToTop(updated, currentSessionId);
        // Save to localStorage
        chatService.saveSessionToLocalStorage(reordered);
        return reordered;
      });

      // Auto-speak if enabled
      if (autoSpeak && isTTSSupported) {
        // Clean markdown for better speech
        const cleanContent = data.answer
          .replace(/\*\*(.*?)\*\*/g, '$1')
          .replace(/\*(.*?)\*/g, '$1')
          .replace(/`(.*?)`/g, '$1')
          .replace(/```[\s\S]*?```/g, '')
          .replace(/#{1,6}\s/g, '')
          .replace(/\n+/g, '. ')
          .trim()
        
        speak(cleanContent)
      }
    } catch (error) {
      console.error('Error sending message:', error)
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: 'Maaf, terjadi kesalahan dalam memproses pesan Anda.',
        role: 'assistant',
        timestamp: new Date()
      }

      setChatSessions(prev => {
        const updated = prev.map(session => {
          if (session.id === currentSessionId) {
            // Update title if this session still has default title
            let newTitle = session.title;
            if (session.title === 'New Chat' && session.messages.length > 0) {
              const firstUserMessage = session.messages.find(msg => msg.role === 'user');
              if (firstUserMessage) {
                newTitle = generateSmartTitle(firstUserMessage.content);
              }
            }
            
            return { 
              ...session, 
              title: newTitle,
              messages: [...session.messages, errorMessage], 
              lastUpdated: new Date() 
            };
          }
          return session;
        });
        // Move the updated session to the top
        const reordered = moveSessionToTop(updated, currentSessionId);
        // Save to localStorage
        chatService.saveSessionToLocalStorage(reordered);
        return reordered;
      });
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleEditKeyPress = (e: React.KeyboardEvent, messageId: string) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      saveEditMessage(messageId)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      cancelEdit()
    }
  }

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen)
  }

  const closeSidebar = () => {
    setIsSidebarOpen(false)
  }

  // Message interaction functions
  const copyMessage = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content)
      // You can add a toast notification here
      console.log('Message copied to clipboard')
    } catch (err) {
      console.error('Failed to copy message:', err)
    }
  }

  const shareMessage = async (content: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'AI Chat Message',
          text: content,
        })
      } catch (err) {
        console.error('Error sharing:', err)
      }
    } else {
      // Fallback: copy to clipboard
      await copyMessage(content)
    }
  }

  const handleVoiceInput = () => {
    if (isListening) {
      stopListening()
    } else {
      if (!isSpeechSupported) {
        alert('Browser Anda tidak mendukung fitur voice input. Gunakan Chrome, Edge, atau Safari terbaru.')
        return
      }
      startListening()
    }
  }

  const handleSpeakMessage = (messageId: string, content: string) => {
    if (!isTTSSupported) {
      alert('Browser Anda tidak mendukung fitur text-to-speech.')
      return
    }
    
    // Toggle speaking - if already speaking this message, cancel it
    if (isSpeaking && speakingMessageId === messageId) {
      cancel()
      setSpeakingMessageId(null)
    } else {
      // Stop any currently speaking message
      if (isSpeaking) {
        cancel()
      }
      
      // Set this message as speaking
      setSpeakingMessageId(messageId)
      
      // Clean markdown formatting for better speech
      const cleanContent = content
        .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
        .replace(/\*(.*?)\*/g, '$1')     // Remove italic
        .replace(/`(.*?)`/g, '$1')       // Remove inline code
        .replace(/```[\s\S]*?```/g, '')  // Remove code blocks
        .replace(/#{1,6}\s/g, '')        // Remove headers
        .replace(/\n+/g, '. ')           // Replace newlines with periods
        .trim()
      
      speak(cleanContent)
    }
  }

  // Stop speaking when component unmounts or user navigates away
  // Also clear speaking state when TTS finishes
  useEffect(() => {
    if (!isSpeaking && speakingMessageId) {
      setSpeakingMessageId(null)
    }
  }, [isSpeaking, speakingMessageId])

  // Animated loading dots effect
  useEffect(() => {
    if (!isLoading) {
      setLoadingDots('')
      setLoadingStage(0)
      return
    }

    const interval = setInterval(() => {
      setLoadingDots(prev => {
        if (prev === '...') return ''
        return prev + '.'
      })
    }, 500) // Update every 500ms

    return () => clearInterval(interval)
  }, [isLoading])

  // Animated loading stages effect
  useEffect(() => {
    if (!isLoading) {
      setLoadingStage(0)
      return
    }

    // Cycle through different stages to simulate AI processing
    const stages = [
      "AI sedang berpikir",
      "Mencari data yang relevan",
      "Menganalisis dokumen",
      "Menyusun jawaban"
    ]
    
    let currentStage = 0
    setLoadingStage(0)

    const stageInterval = setInterval(() => {
      currentStage = (currentStage + 1) % stages.length
      setLoadingStage(currentStage)
    }, 2000) // Change stage every 2 seconds

    return () => clearInterval(stageInterval)
  }, [isLoading])

  const getLoadingMessage = () => {
    const stages = [
      "AI sedang berpikir",
      "Mencari data yang relevan",
      "Menganalisis dokumen",
      "Menyusun jawaban"
    ]
    return stages[loadingStage] || stages[0]
  }

  useEffect(() => {
    return () => {
      if (isSpeaking) {
        cancel()
      }
      if (isListening) {
        stopListening()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const regenerateMessage = async (messageIndex: number) => {
    if (!currentSession || messageIndex < 1 || isLoading) return
    
    // Remove the last AI message and regenerate
    const updatedMessages = currentSession.messages.slice(0, messageIndex)
    const lastUserMessage = updatedMessages[updatedMessages.length - 1]
    
    if (lastUserMessage && lastUserMessage.role === 'user') {
      // Update session with truncated messages
      const updatedSession = {
        ...currentSession,
        messages: updatedMessages,
        lastUpdated: new Date()
      }
      
      setChatSessions(prev => {
        const updated = prev.map(session => 
          session.id === currentSessionId ? updatedSession : session
        );
        // Move the updated session to the top
        const reordered = moveSessionToTop(updated, currentSessionId);
        // Save to localStorage
        chatService.saveSessionToLocalStorage(reordered);
        return reordered;
      })
      
      setIsLoading(true)
      
      try {
        // Use chatService to send message with session_id
        const data = await chatService.sendMessage(lastUserMessage.content, currentSessionId)

        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          content: data.answer,
          role: 'assistant',
          timestamp: new Date()
        }

        // Update current session with new assistant message
        setChatSessions(prev => {
          const updated = prev.map(session => {
            if (session.id === currentSessionId) {
              return { 
                ...session, 
                messages: [...updatedMessages, assistantMessage], 
                lastUpdated: new Date() 
              };
            }
            return session;
          });
          // Move the updated session to the top
          const reordered = moveSessionToTop(updated, currentSessionId);
          // Save to localStorage
          chatService.saveSessionToLocalStorage(reordered);
          return reordered;
        });
      } catch (error) {
        console.error('Error regenerating message:', error)
        // You can add error handling UI here
      } finally {
        setIsLoading(false)
      }
    }
  }

  // User message interaction functions
  const startEditMessage = (messageId: string, content: string) => {
    setEditingMessageId(messageId)
    setEditContent(content)
  }

  const cancelEdit = () => {
    setEditingMessageId(null)
    setEditContent('')
  }

  const saveEditMessage = async (messageId: string) => {
    if (!editContent.trim() || !currentSession) return

    const messageIndex = currentSession.messages.findIndex(msg => msg.id === messageId)
    if (messageIndex === -1) return

    // Update the message content
    const updatedMessages = [...currentSession.messages]
    const editedMessage = {
      ...updatedMessages[messageIndex],
      content: editContent.trim(),
      timestamp: new Date() // Update timestamp
    }
    updatedMessages[messageIndex] = editedMessage

    // Cancel edit mode first
    cancelEdit()

    // If this message is followed by an AI response, regenerate it
    if (messageIndex < updatedMessages.length - 1 && updatedMessages[messageIndex + 1].role === 'assistant') {
      
      // Remove AI response that follows this user message
      const messagesUpToEdit = updatedMessages.slice(0, messageIndex + 1)
      
      // Update session to remove AI response
      const sessionWithoutAI = {
        ...currentSession,
        messages: messagesUpToEdit,
        lastUpdated: new Date()
      }

      setChatSessions(prev => {
        const updated = prev.map(session => 
          session.id === currentSessionId ? sessionWithoutAI : session
        );
        // Move the updated session to the top
        const reordered = moveSessionToTop(updated, currentSessionId);
        // Save to localStorage
        chatService.saveSessionToLocalStorage(reordered);
        return reordered;
      })

      // Regenerate AI response with the EDITED message
      setIsLoading(true)
      
      try {
        // Use the edited message content
        const data = await chatService.sendMessage(editedMessage.content, currentSessionId)

        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          content: data.answer,
          role: 'assistant',
          timestamp: new Date()
        }

        // Update current session with new assistant message
        setChatSessions(prev => {
          const updated = prev.map(session => {
            if (session.id === currentSessionId) {
              return { 
                ...session, 
                messages: [...messagesUpToEdit, assistantMessage], 
                lastUpdated: new Date() 
              };
            }
            return session;
          });
          // Move the updated session to the top
          const reordered = moveSessionToTop(updated, currentSessionId);
          // Save to localStorage
          chatService.saveSessionToLocalStorage(reordered);
          return reordered;
        });
      } catch (error) {
        console.error('Error regenerating message after edit:', error)
      } finally {
        setIsLoading(false)
      }
    } else {
      // Just update the message without regenerating
      const updatedSession = {
        ...currentSession,
        messages: updatedMessages,
        lastUpdated: new Date()
      }

      setChatSessions(prev => {
        const updated = prev.map(session => 
          session.id === currentSessionId ? updatedSession : session
        );
        // Move the updated session to the top
        const reordered = moveSessionToTop(updated, currentSessionId);
        // Save to localStorage
        chatService.saveSessionToLocalStorage(reordered);
        return reordered;
      })
    }
  }

  const copyUserMessage = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content)
      console.log('User message copied to clipboard')
    } catch (err) {
      console.error('Failed to copy user message:', err)
    }
  }

  // Helper function to move a session to the top
  const moveSessionToTop = (sessions: ChatSession[], sessionId: string): ChatSession[] => {
    const sessionIndex = sessions.findIndex(s => s.id === sessionId);
    if (sessionIndex === -1) return sessions;
    
    const session = sessions[sessionIndex];
    const otherSessions = sessions.filter(s => s.id !== sessionId);
    return [session, ...otherSessions];
  };

  const startNewChat = () => {
    const newSession: ChatSession = {
      id: chatService.generateSessionId(),
      title: 'New Chat',
      messages: [],
      createdAt: new Date(),
      lastUpdated: new Date()
    }
    setChatSessions(prev => {
      const updated = [newSession, ...prev];
      chatService.saveSessionToLocalStorage(updated);
      return updated;
    });
    setCurrentSessionId(newSession.id)
    setCurrentThreadId('') // Reset thread for new session
    setInput('')
  }

  const switchToSession = (sessionId: string) => {
    setCurrentSessionId(sessionId)
    setCurrentThreadId('') // Reset thread when switching sessions
    setInput('')
  }

  const deleteSession = async (sessionId: string) => {
    try {
      // Extract chat IDs from the session to delete from backend
      const sessionToDelete = chatSessions.find(s => s.id === sessionId);
      if (sessionToDelete) {
        // Delete each chat history item from backend
        for (const message of sessionToDelete.messages) {
          if (message.role === 'user') {
            // Extract chat ID from message ID (format: user_123)
            const chatId = message.id.split('_')[1];
            if (chatId && !isNaN(Number(chatId))) {
              await chatService.deleteChatHistory(Number(chatId));
            }
          }
        }
      }

      // Update frontend state
      setChatSessions(prev => {
        const updated = prev.filter(session => session.id !== sessionId);
        chatService.saveSessionToLocalStorage(updated);
        return updated;
      });

      // Switch to another session if current one is deleted
      if (currentSessionId === sessionId && chatSessions.length > 1) {
        const remainingSessions = chatSessions.filter(session => session.id !== sessionId)
        setCurrentSessionId(remainingSessions[0].id)
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      // Fallback: just remove from frontend
      setChatSessions(prev => {
        const updated = prev.filter(session => session.id !== sessionId);
        chatService.saveSessionToLocalStorage(updated);
        return updated;
      });
    }
  }

  const clearAllSessions = async () => {
    try {
      // Clear all chat history from backend
      await chatService.clearAllChatHistory();
      
      // Clear frontend state
      setChatSessions([])
      setCurrentSessionId('')
      chatService.saveSessionToLocalStorage([])
    } catch (error) {
      console.error('Error clearing all sessions:', error);
      // Fallback: just clear frontend
      setChatSessions([])
      setCurrentSessionId('')
      chatService.saveSessionToLocalStorage([])
    }
  }

  const refreshChatHistory = async () => {
    try {
      const sessions = await chatService.syncWithBackend();
      if (sessions.length > 0) {
        setChatSessions(sessions);
        setCurrentSessionId(sessions[0].id);
      }
    } catch (error) {
      console.error('Error refreshing chat history:', error);
    }
  }

  // Generate smart title from user question (similar to chatService)
  const generateSmartTitle = (question: string): string => {
    // Clean the question
    let cleanQuestion = question.trim();
    
    // Remove common prefixes
    const prefixes = ['tolong', 'bisa', 'mohon', 'saya ingin', 'saya mau', 'bagaimana', 'apa', 'kenapa', 'kapan', 'dimana', 'siapa'];
    for (const prefix of prefixes) {
      if (cleanQuestion.toLowerCase().startsWith(prefix.toLowerCase())) {
        cleanQuestion = cleanQuestion.substring(prefix.length).trim();
        break;
      }
    }
    
    // Remove punctuation at the end
    cleanQuestion = cleanQuestion.replace(/[.!?]+$/, '');
    
    // Limit length and capitalize first letter
    if (cleanQuestion.length > 50) {
      cleanQuestion = cleanQuestion.substring(0, 47) + '...';
    }
    
    return cleanQuestion.charAt(0).toUpperCase() + cleanQuestion.slice(1);
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-800 relative">
      {/* Sidebar Component */}
      <ChatSidebar
        isOpen={isSidebarOpen}
        onClose={closeSidebar}
        onToggle={toggleSidebar}
        chatSessions={chatSessions}
        currentSessionId={currentSessionId}
        onStartNewChat={startNewChat}
        onSwitchSession={switchToSession}
        onDeleteSession={deleteSession}
        onClearAllSessions={clearAllSessions}
        onRefreshHistory={refreshChatHistory}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header with toggle button */}
        <div className="bg-white dark:bg-gray-800">
          <div className="flex items-center gap-3 p-3">
            {/* Mobile toggle button - only visible on mobile */}
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors md:hidden"
              title="Toggle sidebar"
            >
              <Menu className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 w-full">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md mx-auto">
                <Bot className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Welcome to AI Chat Assistant
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Start a new conversation by typing a message below.
                </p>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                id={`message-${message.id}`}
                className={cn(
                  'flex gap-3 w-full max-w-3xl mx-auto px-2',
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                <div
                  className={cn(
                    'flex gap-3 items-start max-w-[90%] sm:max-w-[85%]',
                    message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                  )}
                >
                  <div
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                      message.role === 'user'
                        ? 'bg-[#1A829B] text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                    )}
                  >
                    {message.role === 'user' ? (
                      <User className="w-4 h-4" />
                    ) : (
                      <Bot className="w-4 h-4" />
                    )}
                  </div>
                  <div
                    className={cn(
                      'px-4 py-3 rounded-2xl text-sm shadow-sm min-w-0 break-words overflow-hidden transition-all duration-300',
                      message.role === 'user'
                        ? 'bg-[#1A829B] text-white rounded-tr-md'
                        : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-md',
                      // Add pulse animation when this message is being spoken
                      isSpeaking && speakingMessageId === message.id && 'ring-2 ring-[#1A829B] ring-opacity-50 animate-pulse'
                    )}
                  >
                    {message.role === 'user' ? (
                      editingMessageId === message.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            onKeyDown={(e) => handleEditKeyPress(e, message.id)}
                            className="w-full p-2 bg-[#1A829B] text-white border border-[#4DA8B8] rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-[#7DC4CD]"
                            rows={3}
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => saveEditMessage(message.id)}
                              className="px-3 py-1 bg-white text-[#1A829B] rounded-md text-xs font-medium hover:bg-[#E5F5F6] transition-colors"
                            >
                              Save
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="px-3 py-1 bg-[#146B7C] text-white rounded-md text-xs font-medium hover:bg-[#0F5463] transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap leading-relaxed break-words overflow-wrap-anywhere">{message.content}</p>
                      )
                    ) : (
                      <div className="chat-message prose prose-sm max-w-full leading-relaxed overflow-hidden break-words text-gray-800 dark:text-gray-200">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm, remarkBreaks]}
                          rehypePlugins={[rehypeRaw, rehypeSanitize]}
                          components={{
                            // Custom styling for markdown elements
                            h1: ({node, ...props}) => <h1 className="text-lg font-bold mb-3 text-gray-900 dark:text-gray-100 border-b-2 border-blue-500 dark:border-[#1A829B] pb-1" {...props} />,
                            h2: ({node, ...props}) => <h2 className="text-base font-bold mb-2 text-gray-800 dark:text-gray-200 flex items-center gap-2" {...props} />,
                            h3: ({node, ...props}) => <h3 className="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300" {...props} />,
                            p: ({node, ...props}) => <p className="mb-2 leading-relaxed break-words overflow-wrap-anywhere text-gray-800 dark:text-gray-200" {...props} />,
                            strong: ({node, ...props}) => <strong className="font-bold text-gray-900 dark:text-gray-100 break-words" {...props} />,
                            em: ({node, ...props}) => <em className="italic text-gray-700 dark:text-gray-300 break-words" {...props} />,
                            ul: ({node, ...props}) => <ul className="list-disc list-inside mb-2 space-y-1 text-gray-800 dark:text-gray-200" {...props} />,
                            ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-2 space-y-1 text-gray-800 dark:text-gray-200" {...props} />,
                            li: ({node, ...props}) => <li className="text-sm break-words overflow-wrap-anywhere text-gray-800 dark:text-gray-200" {...props} />,
                            code: ({node, className, children, ...props}) => {
                              const isInline = !className?.includes('language-');
                              return isInline ? 
                                <code className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-xs font-mono text-gray-800 dark:text-gray-200 break-all" {...props}>{children}</code> :
                                <code className="block bg-gray-100 dark:bg-gray-700 p-3 rounded-lg text-xs font-mono text-gray-800 dark:text-gray-200 overflow-x-auto whitespace-pre-wrap break-all max-w-full" {...props}>{children}</code>;
                            },
                            pre: ({node, ...props}) => <pre className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg overflow-x-auto mb-2 max-w-full whitespace-pre-wrap break-all" {...props} />,
                            table: ({node, ...props}) => (
                              <div className="overflow-x-auto mb-3 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm max-w-full">
                                <table className="w-full border-collapse bg-white dark:bg-gray-800 text-xs" {...props} />
                              </div>
                            ),
                            th: ({node, ...props}) => <th className="border-b border-gray-200 dark:border-gray-600 px-4 py-3 bg-gradient-to-r from-blue-50 to-[#E5F5F6] dark:from-gray-700 dark:to-gray-600 font-bold text-xs text-gray-700 dark:text-gray-200 text-left uppercase tracking-wider" {...props} />,
                            td: ({node, ...props}) => <td className="border-b border-gray-100 dark:border-gray-600 px-4 py-3 text-xs text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors" {...props} />,
                            blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-blue-500 dark:border-[#1A829B] pl-3 italic text-gray-700 dark:text-gray-300 mb-2" {...props} />,
                            hr: ({node, ...props}) => <hr className="my-3 border-t border-gray-300 dark:border-gray-600" {...props} />,
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    )}
                    <p
                      className={cn(
                        'text-xs mt-2',
                        message.role === 'user' ? 'text-[#B3E5E8]' : 'text-gray-500 dark:text-gray-400'
                      )}
                    >
                      {message.timestamp.toLocaleTimeString('id-ID', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                    
                    {/* Message Actions - Only for User messages (when not editing) */}
                    {message.role === 'user' && editingMessageId !== message.id && (
                      <div className="flex items-center gap-1 mt-3 pt-2 border-t border-[#1A829B]/20">
                        <button
                          onClick={() => copyUserMessage(message.content)}
                          className="p-1.5 text-[#B3E5E8] hover:text-white rounded transition-colors"
                          title="Copy message"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={() => startEditMessage(message.id, message.content)}
                          className="p-1.5 text-[#B3E5E8] hover:text-white rounded transition-colors"
                          title="Edit message"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    
                    {/* Message Actions - Only for AI messages */}
                    {message.role === 'assistant' && (
                      <div className="flex items-center gap-1 mt-3 pt-2">
                        <button
                          onClick={() => copyMessage(message.content)}
                          className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors"
                          title="Copy message"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={() => shareMessage(message.content)}
                          className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors"
                          title="Share message"
                        >
                          <Share className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={() => regenerateMessage(messages.indexOf(message))}
                          className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors"
                          title="Regenerate response"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>

                        {isTTSSupported && (
                          <button
                            onClick={() => handleSpeakMessage(message.id, message.content)}
                            className={cn(
                              "p-1.5 rounded transition-colors",
                              isSpeaking && speakingMessageId === message.id
                                ? "text-[#1A829B] bg-[#E5F5F6]"
                                : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors"
                            )}
                            title={isSpeaking && speakingMessageId === message.id ? "Stop speaking" : "Read aloud"}
                          >
                            {isSpeaking && speakingMessageId === message.id ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex gap-3 max-w-4xl mx-auto justify-start">
              <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="px-4 py-3 rounded-2xl rounded-tl-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-sm shadow-sm">
                <div className="flex items-center gap-2">
                  <Loading size="sm" />
                  <span className="text-gray-600 dark:text-gray-300">
                    {getLoadingMessage()}{loadingDots}
                  </span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white dark:bg-gray-800">
          <div className="max-w-3xl mx-auto px-2">
            {/* Voice Features Row */}
            {isListening && (
              <div className="mb-2 px-2">
                <span className="text-xs text-[#1A829B] dark:text-[#1A829B] font-medium flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#1A829B] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-[#1A829B]"></span>
                  </span>
                  <span className="hidden sm:inline">
                    {transcript ? `"${transcript}"` : 'Listening...'}
                  </span>
                  <span className="sm:hidden">Recording...</span>
                </span>
              </div>
            )}

            <div className="flex gap-2 items-center bg-gray-50 dark:bg-gray-700 rounded-2xl border border-gray-200 dark:border-gray-600 focus-within:ring-2 focus-within:ring-[#1A829B] focus-within:border-[#1A829B] p-1.5 sm:p-2">
              <div className="flex-1 relative">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask anything"
                  className="w-full px-2 sm:px-3 py-2 bg-transparent resize-none focus:outline-none text-gray-800 dark:text-gray-200 text-xs sm:text-sm placeholder-gray-500 dark:placeholder-gray-400"
                  rows={1}
                  style={{ 
                    minHeight: '36px',
                    maxHeight: '120px',
                    height: 'auto'
                  }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement
                    target.style.height = 'auto'
                    target.style.height = target.scrollHeight + 'px'
                  }}
                />
                {/* Interim Transcript Preview */}
                {isListening && transcript && (
                  <div className="absolute bottom-full left-0 mb-2 px-3 py-2 bg-[#1A829B] text-white text-xs rounded-lg shadow-lg max-w-full">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <span className="w-1 h-1 bg-white rounded-full animate-bounce"></span>
                        <span className="w-1 h-1 bg-white rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></span>
                        <span className="w-1 h-1 bg-white rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span>
                      </div>
                      <span className="opacity-90">{transcript}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Voice Input Button */}
              {isSpeechSupported && (
                <button
                  onClick={handleVoiceInput}
                  disabled={isLoading}
                  className={`p-2 rounded-lg transition-all flex-shrink-0 relative ${
                    isListening
                      ? 'bg-[#1A829B] text-white shadow-lg'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  title={isListening ? 'Click to stop recording' : 'Click to start voice input'}
                >
                  {isListening ? (
                    <>
                      <MicOff className="w-4 h-4" />
                      <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                      </span>
                    </>
                  ) : (
                    <Mic className="w-4 h-4" />
                  )}
                </button>
              )}
              
              {/* Send Button */}
              <button
                onClick={handleSendMessage}
                disabled={!input.trim() || isLoading}
                className={`p-2 rounded-lg transition-all flex-shrink-0 ${
                  !input.trim() || isLoading
                    ? 'bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                    : 'bg-gray-100 dark:bg-gray-700 text-[#1A829B] dark:text-[#1A829B] hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
              Press Enter to send, Shift+Enter for new line
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
