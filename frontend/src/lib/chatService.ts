import { authAPI } from './auth';

export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  lastUpdated: Date;
}

export interface BackendChatHistory {
  id: number;
  question: string;
  answer: string;
  created_at: string;
  session_id?: string; // NEW: For session grouping
}

class ChatService {
  private baseUrl = 'http://localhost:8000';

  // Get authentication token
  private getAuthHeaders() {
    const token = authAPI.getToken();
    if (!token) {
      throw new Error('No authentication token found');
    }
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  // Generate new session ID untuk chat baru
  generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

    // Send chat message with session_id
  async sendMessage(question: string, sessionId?: string): Promise<{answer: string, session_id: string}> {
    try {
      // Use OpenAI Tools endpoint - OpenAI handles everything including retrieval
      const response = await fetch(`${this.baseUrl}/chat/openai-tools`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          question: question,
          session_id: sessionId || this.generateSessionId()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();
      return {
        answer: data.answer,
        session_id: data.session_id
      };
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  // NEW: Send chat message using OpenAI Assistants API (more powerful reasoning)
  async sendMessageWithAssistant(
    question: string, 
    sessionId?: string, 
    threadId?: string
  ): Promise<{answer: string, session_id: string, thread_id: string}> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/openai-assistant`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          question: question,
          session_id: sessionId || this.generateSessionId(),
          thread_id: threadId // For conversation continuity
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to send message to assistant');
      }

      const data = await response.json();
      return {
        answer: data.answer,
        session_id: data.session_id,
        thread_id: data.thread_id // Return for next message in conversation
      };
    } catch (error) {
      console.error('Error sending message to assistant:', error);
      throw error;
    }
  }

    // Load chat history from backend
  async loadChatHistory(): Promise<BackendChatHistory[]> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/history`, {
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to load chat history');
      }

      const data = await response.json();
      return data.history || [];
    } catch (error) {
      console.error('Error loading chat history:', error);
      return [];
    }
  }

    // Delete specific chat history item from backend
  async deleteChatHistory(chatId: number): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/history/${chatId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to delete chat history');
      }

      return true;
    } catch (error) {
      console.error('Error deleting chat history:', error);
      return false;
    }
  }

    // Delete entire session from backend
  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/session/${sessionId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to delete session');
      }

      return true;
    } catch (error) {
      console.error('Error deleting session:', error);
      return false;
    }
  }

    // Clear all chat history from backend
  async clearAllChatHistory(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/history`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to clear chat history');
      }

      return true;
    } catch (error) {
      console.error('Error clearing chat history:', error);
      return false;
    }
  }

    // NEW: Convert backend history to frontend sessions using session_id
  convertBackendHistoryToSessions(history: BackendChatHistory[]): ChatSession[] {
    if (history.length === 0) {
      return [];
    }

    // Group by session_id instead of time proximity
    const sessionMap = new Map<string, ChatSession>();

    // Sort history by created_at (oldest first) to maintain conversation order
    const sortedHistory = history.sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    sortedHistory.forEach((item) => {
      const messageDate = new Date(item.created_at);
      
      // Use session_id if available, fallback to date-based for backward compatibility
      const sessionId = item.session_id || `legacy_${messageDate.toDateString().replace(/\s+/g, '_')}`;
      
      // Get or create session
      let session = sessionMap.get(sessionId);
      if (!session) {
        session = {
          id: sessionId,
          title: this.generateSmartTitle(item.question),
          messages: [],
          createdAt: messageDate,
          lastUpdated: messageDate
        };
        sessionMap.set(sessionId, session);
      }

      // Add user message
      session.messages.push({
        id: `user_${item.id}`,
        content: item.question,
        role: 'user',
        timestamp: messageDate
      });

      // Add assistant message
      session.messages.push({
        id: `assistant_${item.id}`,
        content: item.answer,
        role: 'assistant',
        timestamp: messageDate
      });

      // Update session metadata
      session.lastUpdated = messageDate;
      
      // Keep first question as title
      if (session.messages.length === 2) {
        session.title = this.generateSmartTitle(item.question);
      }
    });

    // Convert to array and sort by last updated (newest first)
    return Array.from(sessionMap.values()).sort((a, b) => 
      new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
    );
  }

  // Generate smart title from user question
  private generateSmartTitle(question: string): string {
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

  // Save chat session to localStorage
  saveSessionToLocalStorage(sessions: ChatSession[]): void {
    try {
      localStorage.setItem('chatSessions', JSON.stringify(sessions));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }    // Load chat sessions from localStorage
  loadSessionsFromLocalStorage(): ChatSession[] {
    try {
      const saved = localStorage.getItem('chatSessions');
      if (saved) {
        const sessions = JSON.parse(saved);
        // Convert string dates back to Date objects
        return sessions.map((session: any) => ({
          ...session,
          createdAt: new Date(session.createdAt),
          lastUpdated: new Date(session.lastUpdated),
          messages: session.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }))
        }));
      }
    } catch (error) {
      console.error('Error loading from localStorage:', error);
    }
    return [];
  }

    // Sync local sessions with backend history using session_id
  async syncWithBackend(): Promise<ChatSession[]> {
    try {
      // Load from backend (grouped by session_id)
      const backendHistory = await this.loadChatHistory();
      const backendSessions = this.convertBackendHistoryToSessions(backendHistory);
      
      // Load from localStorage
      const localSessions = this.loadSessionsFromLocalStorage();
      
      // Smart merge prioritizing backend data
      const mergedSessions = this.smartMergeSessions(backendSessions, localSessions);
      
      // Save merged sessions to localStorage
      this.saveSessionToLocalStorage(mergedSessions);
      
      return mergedSessions;
    } catch (error) {
      console.error('Error syncing with backend:', error);
      // Fallback to localStorage
      return this.loadSessionsFromLocalStorage();
    }
  }

  // Smart merge sessions using session_id
  private smartMergeSessions(backendSessions: ChatSession[], localSessions: ChatSession[]): ChatSession[] {
    const merged = new Map<string, ChatSession>();
    
    // First, add backend sessions (source of truth)
    backendSessions.forEach(session => {
      merged.set(session.id, session);
    });
    
    // Then, add local sessions that don't exist in backend yet
    localSessions.forEach(localSession => {
      if (!merged.has(localSession.id)) {
        merged.set(localSession.id, localSession);
      }
    });
    
    // Sort by last updated time (newest first)
    return Array.from(merged.values()).sort((a, b) => 
      new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
    );
  }
}

export const chatService = new ChatService(); 
