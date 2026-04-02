import { useState, useEffect, useCallback } from 'react';
import { AgentClient } from '@agent/sdk';
import throttle from 'lodash.throttle';

const client = new AgentClient();

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'tool_call' | 'tool_result';
  content: string;
  toolName?: string;
  toolArgs?: string;
  toolResult?: string;
}

export function useChat(sessionId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentAssistantMessage, setCurrentAssistantMessage] = useState('');
  const [disconnected, setDisconnected] = useState(false);
  const [lastEventTime, setLastEventTime] = useState<number>(Date.now());

  // Throttle token updates to 50ms to improve performance
  const throttledSetCurrentMessage = useCallback(
    throttle((message: string) => {
      setCurrentAssistantMessage(message);
    }, 50),
    []
  );

  const loadMessages = useCallback(async () => {
    if (!sessionId) return;

    setLoading(true);
    try {
      const session = await client.getSession(sessionId);
      setMessages(session.messages as Message[]);
      setError(null);
      setDisconnected(false); // Clear disconnection state on successful load
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  // Load messages when sessionId changes
  useEffect(() => {
    if (!sessionId) {
      setMessages([]);
      return;
    }

    void loadMessages();
  }, [sessionId, loadMessages]);

  // Detect disconnection - check if no events received in 5 seconds while streaming
  useEffect(() => {
    if (!isStreaming) return;

    const interval = setInterval(() => {
      const timeSinceLastEvent = Date.now() - lastEventTime;
      if (timeSinceLastEvent > 5000) {
        setDisconnected(true);
        setIsStreaming(false);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isStreaming, lastEventTime]);

  const resync = useCallback(async () => {
    if (!sessionId) return;

    setLoading(true);
    try {
      const session = await client.resync(sessionId);
      setMessages(session.messages as Message[]);
      setError(null);
      setDisconnected(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!sessionId || !content.trim()) return;

      // Add user message immediately
      const userMessage: Message = {
        id: `temp-${Date.now()}`,
        role: 'user',
        content,
      };
      setMessages(prev => [...prev, userMessage]);

      setIsStreaming(true);
      setCurrentAssistantMessage('');
      setError(null);
      setDisconnected(false);
      setLastEventTime(Date.now());

      // Accumulate assistant message locally
      let accumulatedMessage = '';

      try {
        // Stream response from agent
        for await (const event of client.sendMessage(sessionId, content)) {
          setLastEventTime(Date.now()); // Update last event time on each event

          if (event.type === 'token') {
            accumulatedMessage += String(event.data);
            throttledSetCurrentMessage(accumulatedMessage);
          } else if (event.type === 'tool_call') {
            // Tool call event
            const eventData = event.data as { toolName: string; args: unknown };
            const toolCallMsg: Message = {
              id: `tool-call-${Date.now()}`,
              role: 'tool_call',
              content: '',
              toolName: eventData.toolName,
              toolArgs: JSON.stringify(eventData.args),
            };
            setMessages(prev => [...prev, toolCallMsg]);
          } else if (event.type === 'tool_result') {
            // Tool result event
            const eventData = event.data as { result: unknown };
            const toolResultMsg: Message = {
              id: `tool-result-${Date.now()}`,
              role: 'tool_result',
              content: '',
              toolResult: JSON.stringify(eventData.result),
            };
            setMessages(prev => [...prev, toolResultMsg]);
          } else if (event.type === 'done') {
            // Add final assistant message using accumulated content
            if (accumulatedMessage) {
              const assistantMsg: Message = {
                id: `assistant-${Date.now()}`,
                role: 'assistant',
                content: accumulatedMessage,
              };
              setMessages(prev => [...prev, assistantMsg]);
            }
            setCurrentAssistantMessage('');
            accumulatedMessage = '';
          } else if (event.type === 'error') {
            // Preserve partial message if we have accumulated content
            if (accumulatedMessage) {
              const partialMsg: Message = {
                id: `assistant-partial-${Date.now()}`,
                role: 'assistant',
                content: accumulatedMessage + '\n\n❌ Error: ' + (event.data as string),
              };
              setMessages(prev => [...prev, partialMsg]);
              setCurrentAssistantMessage('');
              accumulatedMessage = '';
            } else {
              setError(event.data as string);
            }
          }
        }
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        // Preserve partial message if we have accumulated content
        if (accumulatedMessage) {
          const partialMsg: Message = {
            id: `assistant-partial-${Date.now()}`,
            role: 'assistant',
            content: accumulatedMessage + '\n\n❌ Error: ' + errorMessage,
          };
          setMessages(prev => [...prev, partialMsg]);
          setCurrentAssistantMessage('');
        } else {
          setError(errorMessage);
        }
      } finally {
        setIsStreaming(false);
      }
    },
    [sessionId, throttledSetCurrentMessage]
  );

  return {
    messages,
    loading,
    error,
    isStreaming,
    currentAssistantMessage,
    disconnected,
    sendMessage,
    reload: loadMessages,
    resync,
  };
}
