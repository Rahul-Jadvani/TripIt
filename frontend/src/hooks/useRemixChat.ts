import { useState, useCallback } from 'react';
import api from '@/services/api';

export interface RemixChatSession {
  id: string;
  title: string;
  source_itinerary_ids: string[];
  current_draft_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  last_message_at: string | null;
  message_count: number;
  current_draft?: any;
  latest_message_preview?: string;
}

export interface RemixChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  metadata?: any;
  created_at: string;
}

export interface SourceItinerary {
  id: string;
  title: string;
  destination: string;
  duration_days: number;
  budget_amount: number;
  budget_currency: string;
  screenshots?: string[];
  creator?: any;
}

export function useRemixChat() {
  const [sessions, setSessions] = useState<RemixChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<RemixChatSession | null>(null);
  const [messages, setMessages] = useState<RemixChatMessage[]>([]);
  const [sourceItineraries, setSourceItineraries] = useState<SourceItinerary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create new chat session
  const createSession = useCallback(async (
    itineraryIds: string[],
    initialMessage: string
  ) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await api.post('/remix/sessions', {
        itinerary_ids: itineraryIds,
        initial_message: initialMessage
      });

      const { session, messages: initialMessages, source_itineraries } = response.data.data;

      setActiveSession(session);
      setMessages(initialMessages);
      setSourceItineraries(source_itineraries);

      return session;
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to create session';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load existing sessions
  const loadSessions = useCallback(async (status: string = 'active') => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('[useRemixChat] Loading sessions with status:', status);
      const response = await api.get('/remix/sessions', {
        params: { status, per_page: 50 }
      });

      console.log('[useRemixChat] Sessions loaded:', response.data);
      setSessions(response.data.data || []);
    } catch (err: any) {
      console.error('[useRemixChat] Error loading sessions:', err);
      setError(err.response?.data?.message || 'Failed to load sessions');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load specific session
  const loadSession = useCallback(async (sessionId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await api.get(`/remix/sessions/${sessionId}`);

      const { session, source_itineraries } = response.data.data;

      setActiveSession(session);
      setMessages(session.messages || []);
      setSourceItineraries(source_itineraries);

      return session;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load session');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Send message
  const sendMessage = useCallback(async (content: string) => {
    if (!activeSession) {
      throw new Error('No active session');
    }

    try {
      setIsSending(true);
      setError(null);

      // Optimistically add user message
      const tempUserMsg: RemixChatMessage = {
        id: 'temp-' + Date.now(),
        session_id: activeSession.id,
        role: 'user',
        content,
        created_at: new Date().toISOString()
      };

      setMessages(prev => [...prev, tempUserMsg]);

      const response = await api.post(`/remix/sessions/${activeSession.id}/messages`, {
        message: content
      });

      const { user_message, assistant_message, session } = response.data.data;

      // Replace temp message with real messages
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== tempUserMsg.id);
        return [...filtered, user_message, assistant_message];
      });

      // Update session
      setActiveSession(session);

      return { user_message, assistant_message };
    } catch (err: any) {
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => !m.id.startsWith('temp-')));
      setError(err.response?.data?.message || 'Failed to send message');
      throw err;
    } finally {
      setIsSending(false);
    }
  }, [activeSession]);

  // Finalize session
  const finalizeSession = useCallback(async () => {
    if (!activeSession) {
      throw new Error('No active session');
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await api.post(`/remix/sessions/${activeSession.id}/finalize`);

      return response.data.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to finalize session');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [activeSession]);

  // Update session title
  const updateSessionTitle = useCallback(async (sessionId: string, title: string) => {
    try {
      await api.patch(`/remix/sessions/${sessionId}`, { title });

      setSessions(prev =>
        prev.map(s => s.id === sessionId ? { ...s, title } : s)
      );

      if (activeSession?.id === sessionId) {
        setActiveSession(prev => prev ? { ...prev, title } : null);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update title');
      throw err;
    }
  }, [activeSession]);

  // Delete session
  const deleteSession = useCallback(async (sessionId: string) => {
    try {
      await api.delete(`/remix/sessions/${sessionId}`);

      setSessions(prev => prev.filter(s => s.id !== sessionId));

      if (activeSession?.id === sessionId) {
        setActiveSession(null);
        setMessages([]);
        setSourceItineraries([]);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete session');
      throw err;
    }
  }, [activeSession]);

  // Archive session
  const archiveSession = useCallback(async (sessionId: string) => {
    try {
      await api.post(`/remix/sessions/${sessionId}/archive`);

      setSessions(prev =>
        prev.map(s => s.id === sessionId ? { ...s, status: 'archived' } : s)
      );

      if (activeSession?.id === sessionId) {
        setActiveSession(prev => prev ? { ...prev, status: 'archived' } : null);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to archive session');
      throw err;
    }
  }, [activeSession]);

  return {
    // State
    sessions,
    activeSession,
    messages,
    sourceItineraries,
    isLoading,
    isSending,
    error,

    // Actions
    createSession,
    loadSessions,
    loadSession,
    sendMessage,
    finalizeSession,
    updateSessionTitle,
    deleteSession,
    archiveSession,
    setActiveSession,
  };
}
