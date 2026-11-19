import type { ChatMessage } from '../../types'
import { useAutoScroll } from '../../hooks/useAutoScroll'
import { MessageItem } from './MessageItem'

export function MessageList({ messages }: { messages: ChatMessage[] }) {
  const last = messages[messages.length - 1]
  const scrollRef = useAutoScroll<HTMLDivElement>([messages.length, last?.content.length])

  return (
    <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 pb-4 pt-6">
        {messages.map((message) => (
          <MessageItem key={message.id} message={message} />
        ))}
      </div>
    </div>
  )
}
