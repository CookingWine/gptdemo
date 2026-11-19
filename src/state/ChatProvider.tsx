import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { ChatMessage, Conversation } from '../types'
import { DEFAULT_SYSTEM_PROMPT } from '../lib/constants'
import { composeSystemPrompt } from '../lib/systemPrompt'
import { getBridge } from '../lib/ipc'
import { createId, titleFromPrompt } from '../lib/utils'
import { useSettings } from '../hooks/useSettings'

interface StreamTarget {
  requestId: string
  conversationId: string
  messageId: string
}

interface Notice {
  id: string
  message: string
}

export interface ChatContextValue {
  conversations: Conversation[]
  activeConversation: Conversation | null
  activeId: string | null
  ready: boolean
  streaming: boolean
  notice: Notice | null
  dismissNotice: () => void
  selectConversation: (id: string) => void
  newConversation: () => void
  renameConversation: (id: string, title: string) => void
  deleteConversation: (id: string) => void
  clearAll: () => Promise<void>
  sendMessage: (text: string) => void
  stopGeneration: () => void
}

export const ChatContext = createContext<ChatContextValue | null>(null)

function patchMessage(
  list: Conversation[],
  target: StreamTarget,
  patch: (message: ChatMessage) => Partial<ChatMessage>,
): Conversation[] {
  return list.map((conversation) => {
    if (conversation.id !== target.conversationId) return conversation
    return {
      ...conversation,
      updatedAt: Date.now(),
      messages: conversation.messages.map((message) =>
        message.id === target.messageId ? { ...message, ...patch(message) } : message,
      ),
    }
  })
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const { activeModel, activeProvider, plugins, settings } = useSettings()

  const activeAgent = useMemo(
    () =>
      settings.activeAgentId
        ? plugins.agents.find((agent) => agent.id === settings.activeAgentId)
        : undefined,
    [plugins.agents, settings.activeAgentId],
  )

  const systemPrompt = useMemo(
    () =>
      composeSystemPrompt({
        agent: activeAgent,
        skills: plugins.skills,
        fallback: DEFAULT_SYSTEM_PROMPT,
      }),
    [activeAgent, plugins.skills],
  )
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)

  const conversationsRef = useRef<Conversation[]>([])
  const activeIdRef = useRef<string | null>(null)
  const targetRef = useRef<StreamTarget | null>(null)
  const bufferRef = useRef('')
  const rafRef = useRef<number | null>(null)
  const streamingRef = useRef(false)

  const updateConversations = useCallback((updater: (prev: Conversation[]) => Conversation[]) => {
    setConversations((prev) => {
      const next = updater(prev)
      conversationsRef.current = next
      return next
    })
  }, [])

  useEffect(() => {
    activeIdRef.current = activeId
  }, [activeId])

  const flush = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    const chunk = bufferRef.current
    const target = targetRef.current
    bufferRef.current = ''
    if (!chunk || !target) return
    updateConversations((prev) =>
      patchMessage(prev, target, (message) => ({ content: message.content + chunk })),
    )
  }, [updateConversations])

  const finishStream = useCallback(
    (aborted: boolean, error?: string) => {
      flush()
      const target = targetRef.current
      if (target) {
        updateConversations((prev) =>
          patchMessage(prev, target, (message) => ({
            streaming: false,
            error,
            content:
              message.content.length > 0 ? message.content : aborted ? '已停止生成。' : message.content,
          })),
        )
      }
      targetRef.current = null
      bufferRef.current = ''
      streamingRef.current = false
      setStreaming(false)
    },
    [flush, updateConversations],
  )

  useEffect(() => {
    const bridge = getBridge()
    const unsubscribe = bridge.onChatEvent((event) => {
      const target = targetRef.current
      if (!target || event.requestId !== target.requestId) return

      if (event.type === 'chunk') {
        bufferRef.current += event.delta
        if (rafRef.current === null) {
          rafRef.current = requestAnimationFrame(flush)
        }
        return
      }

      if (event.type === 'reset') {
        bufferRef.current = ''
        if (rafRef.current !== null) {
          cancelAnimationFrame(rafRef.current)
          rafRef.current = null
        }
        updateConversations((prev) => patchMessage(prev, target, () => ({ content: '' })))
        return
      }

      if (event.type === 'notice') {
        setNotice({ id: createId('notice'), message: event.message })
        updateConversations((prev) => patchMessage(prev, target, () => ({ mock: true })))
        return
      }

      if (event.type === 'done') {
        finishStream(Boolean(event.aborted))
        return
      }

      if (event.type === 'error') {
        finishStream(false, event.message)
        setNotice({ id: createId('notice'), message: event.message })
      }
    })
    return unsubscribe
  }, [finishStream, flush, updateConversations])

  useEffect(() => {
    let cancelled = false
    getBridge()
      .listConversations()
      .then((list) => {
        if (cancelled) return
        const safe = (Array.isArray(list) ? list : []).filter(
          (item) => item && typeof item.id === 'string' && Array.isArray(item.messages),
        )
        conversationsRef.current = safe
        setConversations(safe)
        const first = safe[0]?.id ?? null
        activeIdRef.current = first
        setActiveId(first)
        setReady(true)
      })
      .catch((error) => {
        console.error('[chat] failed to load conversations:', error)
        if (!cancelled) setReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!ready || streaming) return
    const timer = setTimeout(() => {
      getBridge()
        .saveConversations(conversationsRef.current)
        .catch((error) => console.error('[chat] persist failed:', error))
    }, 450)
    return () => clearTimeout(timer)
  }, [conversations, ready, streaming])

  const selectConversation = useCallback(
    (id: string) => {
      if (id === activeIdRef.current) return
      if (streamingRef.current) finishStream(true)
      activeIdRef.current = id
      setActiveId(id)
    },
    [finishStream],
  )

  const newConversation = useCallback(() => {
    if (streamingRef.current) finishStream(true)
    activeIdRef.current = null
    setActiveId(null)
  }, [finishStream])

  const renameConversation = useCallback(
    (id: string, title: string) => {
      const next = title.trim()
      if (!next) return
      updateConversations((prev) =>
        prev.map((conversation) =>
          conversation.id === id ? { ...conversation, title: next } : conversation,
        ),
      )
    },
    [updateConversations],
  )

  const deleteConversation = useCallback(
    (id: string) => {
      if (targetRef.current?.conversationId === id) finishStream(true)
      const remaining = conversationsRef.current.filter((conversation) => conversation.id !== id)
      conversationsRef.current = remaining
      setConversations(remaining)
      if (activeIdRef.current === id) {
        const nextId = remaining[0]?.id ?? null
        activeIdRef.current = nextId
        setActiveId(nextId)
      }
    },
    [finishStream],
  )

  const clearAll = useCallback(async () => {
    if (streamingRef.current) finishStream(true)
    await getBridge().clearConversations()
    conversationsRef.current = []
    setConversations([])
    activeIdRef.current = null
    setActiveId(null)
  }, [finishStream])

  const stopGeneration = useCallback(() => {
    const target = targetRef.current
    if (!target) return
    getBridge()
      .abortChat(target.requestId)
      .catch((error) => console.error('[chat] abort failed:', error))
    finishStream(true)
  }, [finishStream])

  const sendMessage = useCallback(
    (text: string) => {
      const content = text.trim()
      if (!content || streamingRef.current) return

      const now = Date.now()
      const isMock = !activeProvider.apiKey?.trim() || !activeProvider.baseUrl?.trim()
      const userMessage: ChatMessage = {
        id: createId('msg'),
        role: 'user',
        content,
        createdAt: now,
      }
      const assistantMessage: ChatMessage = {
        id: createId('msg'),
        role: 'assistant',
        content: '',
        createdAt: now + 1,
        modelLabel: activeModel.label,
        mock: isMock,
        streaming: true,
      }

      const existing = conversationsRef.current.find(
        (conversation) => conversation.id === activeIdRef.current,
      )
      const conversationId = existing?.id ?? createId('conv')
      const history = existing?.messages ?? []
      const requestId = createId('req')

      updateConversations((prev) => {
        if (existing) {
          return prev.map((conversation) =>
            conversation.id === existing.id
              ? {
                  ...conversation,
                  title: conversation.messages.length ? conversation.title : titleFromPrompt(content),
                  updatedAt: now,
                  messages: [...conversation.messages, userMessage, assistantMessage],
                }
              : conversation,
          )
        }
        const created: Conversation = {
          id: conversationId,
          title: titleFromPrompt(content),
          createdAt: now,
          updatedAt: now,
          messages: [userMessage, assistantMessage],
        }
        return [created, ...prev]
      })

      activeIdRef.current = conversationId
      setActiveId(conversationId)
      targetRef.current = {
        requestId,
        conversationId,
        messageId: assistantMessage.id,
      }
      bufferRef.current = ''
      streamingRef.current = true
      setStreaming(true)

      const messages = [
        { role: 'system' as const, content: systemPrompt },
        ...history
          .filter((message) => message.content && !message.error)
          .slice(-18)
          .map((message) => ({ role: message.role, content: message.content })),
        { role: 'user' as const, content },
      ]

      getBridge()
        .startChat({
          requestId,
          model: activeModel.modelId,
          modelLabel: activeModel.label,
          messages,
          api: {
            baseUrl: activeProvider.baseUrl,
            apiKey: activeProvider.apiKey,
            temperature: activeProvider.temperature,
          },
        })
        .then((result) => {
          if (result.mode === 'error') {
            finishStream(false, result.message ?? '无法启动对话')
          }
        })
        .catch((error) => {
          console.error('[chat] start failed:', error)
          finishStream(false, error?.message ?? '无法启动对话')
        })
    },
    [activeModel, activeProvider, systemPrompt, updateConversations, finishStream],
  )

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeId) ?? null,
    [conversations, activeId],
  )

  const value = useMemo<ChatContextValue>(
    () => ({
      conversations,
      activeConversation,
      activeId,
      ready,
      streaming,
      notice,
      dismissNotice: () => setNotice(null),
      selectConversation,
      newConversation,
      renameConversation,
      deleteConversation,
      clearAll,
      sendMessage,
      stopGeneration,
    }),
    [
      conversations,
      activeConversation,
      activeId,
      ready,
      streaming,
      notice,
      selectConversation,
      newConversation,
      renameConversation,
      deleteConversation,
      clearAll,
      sendMessage,
      stopGeneration,
    ],
  )

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}
