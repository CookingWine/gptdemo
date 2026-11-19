import { useState } from 'react'
import { useChat } from '../../hooks/useChat'
import { Composer } from './Composer'
import { EmptyState } from './EmptyState'
import { MessageList } from './MessageList'

export function ChatView() {
  const { activeConversation, sendMessage, streaming } = useChat()
  const [draft, setDraft] = useState('')
  const messages = activeConversation?.messages ?? []

  const submit = () => {
    const content = draft.trim()
    if (!content || streaming) return
    sendMessage(content)
    setDraft('')
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {messages.length > 0 ? (
        <MessageList messages={messages} />
      ) : (
        <EmptyState onPick={(prompt) => setDraft(prompt)} />
      )}
      <Composer value={draft} onChange={setDraft} onSubmit={submit} />
    </div>
  )
}
