import { useMemo, useState } from 'react'
import { MessageSquare, Pencil, Plus, Settings, Terminal, Trash2 } from 'lucide-react'
import { useChat } from '../../hooks/useChat'
import { useSettings } from '../../hooks/useSettings'
import { APP_NAME } from '../../lib/constants'
import { getBridge } from '../../lib/ipc'
import { cn, formatRelative } from '../../lib/utils'
import type { Conversation } from '../../types'
import { ConfirmDialog } from '../ui/Modal'

type Group = { label: string; items: Conversation[] }

function groupConversations(list: Conversation[]): Group[] {
  const now = Date.now()
  const startOfToday = new Date().setHours(0, 0, 0, 0)
  const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000
  const groups: Group[] = [
    { label: '今天', items: [] },
    { label: '昨天', items: [] },
    { label: '更早', items: [] },
  ]
  for (const conversation of list) {
    if (conversation.updatedAt >= startOfToday) groups[0].items.push(conversation)
    else if (conversation.updatedAt >= startOfYesterday) groups[1].items.push(conversation)
    else groups[2].items.push(conversation)
  }
  return groups.filter((group) => group.items.length > 0)
}

export function Sidebar({
  view,
  onOpenSettings,
  onOpenChat,
}: {
  view: 'chat' | 'settings'
  onOpenSettings: () => void
  onOpenChat: () => void
}) {
  const { conversations, activeId, selectConversation, newConversation, renameConversation, deleteConversation } =
    useChat()
  const { activeProvider, appConfig } = useSettings()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftTitle, setDraftTitle] = useState('')
  const [pendingDelete, setPendingDelete] = useState<Conversation | null>(null)
  const isMac = getBridge().platform === 'darwin'
  const groups = useMemo(() => groupConversations(conversations), [conversations])
  const liveMode = Boolean(activeProvider.apiKey && activeProvider.baseUrl)

  const startRename = (conversation: Conversation) => {
    setEditingId(conversation.id)
    setDraftTitle(conversation.title)
  }

  const commitRename = () => {
    if (editingId) renameConversation(editingId, draftTitle)
    setEditingId(null)
  }

  return (
    <aside className="flex w-[264px] shrink-0 flex-col border-r border-ink-600 bg-ink-900">
      <div
        className="drag-region flex h-[54px] items-center gap-2 pr-3"
        style={{ paddingLeft: isMac ? 80 : 14 }}
      >
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-accent to-accent-deep shadow-[0_0_16px_-4px_rgba(91,141,239,0.7)]">
          <Terminal size={13} className="text-white" />
        </div>
        <span className="text-[13px] font-semibold tracking-tight text-fg">{APP_NAME}</span>
        <span className="rounded border border-ink-600 px-1 py-px font-mono text-[9.5px] text-fg-dim">
          v0.1
        </span>
      </div>

      <div className="px-2.5 pb-2 pt-1">
        <button
          type="button"
          onClick={() => {
            newConversation()
            onOpenChat()
          }}
          className="no-drag flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg border border-ink-600 bg-ink-800 px-2.5 py-2 text-[12.5px] text-fg transition-all duration-150 hover:border-accent/40 hover:bg-ink-750 hover:shadow-[0_6px_18px_-10px_rgba(91,141,239,0.6)]"
        >
          <span className="flex items-center gap-2">
            <Plus size={14} className="text-accent-soft" />
            新建会话
          </span>
          <span className="font-mono text-[10px] text-fg-dim">⌘N</span>
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {groups.length === 0 ? (
          <p className="px-2.5 py-3 text-[11.5px] leading-relaxed text-fg-dim">
            还没有会话。发送第一条消息即可自动创建。
          </p>
        ) : null}

        {groups.map((group) => (
          <div key={group.label} className="mb-2">
            <p className="px-2.5 py-1.5 text-[10.5px] uppercase tracking-[0.08em] text-fg-dim">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((conversation) => {
                const active = view === 'chat' && conversation.id === activeId
                return (
                  <div key={conversation.id} className="group/item relative">
                    {editingId === conversation.id ? (
                      <input
                        autoFocus
                        value={draftTitle}
                        onChange={(event) => setDraftTitle(event.target.value)}
                        onBlur={commitRename}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') commitRename()
                          if (event.key === 'Escape') setEditingId(null)
                        }}
                        className="w-full rounded-lg border border-accent/50 bg-ink-850 px-2.5 py-1.5 text-[12.5px] text-fg outline-none"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          selectConversation(conversation.id)
                          onOpenChat()
                        }}
                        className={cn(
                          'w-full cursor-pointer rounded-lg py-1.5 pl-3 pr-14 text-left transition-colors duration-150',
                          active ? 'bg-ink-750 text-fg' : 'text-fg-muted hover:bg-ink-800 hover:text-fg',
                        )}
                      >
                        {active ? (
                          <span className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-accent" />
                        ) : null}
                        <span className="flex items-center gap-2">
                          <MessageSquare size={12.5} className={active ? 'text-accent-soft' : 'text-fg-dim'} />
                          <span className="truncate text-[12.5px]">{conversation.title}</span>
                        </span>
                        <span className="mt-0.5 block pl-[20px] text-[10.5px] text-fg-dim">
                          {formatRelative(conversation.updatedAt)} · {conversation.messages.length} 条
                        </span>
                      </button>
                    )}

                    <div className="absolute right-1 top-1.5 hidden items-center gap-0.5 group-hover/item:flex">
                      <button
                        type="button"
                        aria-label="重命名"
                        onClick={() => startRename(conversation)}
                        className="flex h-5 w-5 cursor-pointer items-center justify-center rounded text-fg-dim hover:bg-ink-600 hover:text-fg"
                      >
                        <Pencil size={11} />
                      </button>
                      <button
                        type="button"
                        aria-label="删除会话"
                        onClick={() => setPendingDelete(conversation)}
                        className="flex h-5 w-5 cursor-pointer items-center justify-center rounded text-fg-dim hover:bg-bad/20 hover:text-bad"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-1 border-t border-ink-700 p-2.5">
        {appConfig.ui.showSidebarStatus ? (
          <div className="flex items-center gap-2 px-1.5 py-1">
            <span
              className={cn(
                'h-1.5 w-1.5 rounded-full',
                liveMode ? 'bg-ok shadow-[0_0_8px_rgba(63,185,80,0.7)]' : 'bg-warn',
              )}
            />
            <span className="text-[11px] text-fg-muted">
              {liveMode ? `${activeProvider.label} 已连接` : '本地演示模式'}
            </span>
          </div>
        ) : null}
        <button
          type="button"
          onClick={onOpenSettings}
          className={cn(
            'flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-[12.5px] transition-colors duration-150',
            view === 'settings'
              ? 'bg-ink-750 text-fg'
              : 'text-fg-muted hover:bg-ink-800 hover:text-fg',
          )}
        >
          <Settings size={13} className={view === 'settings' ? 'text-accent-soft' : 'text-fg-dim'} />
          设置
          <span className="ml-auto font-mono text-[10px] text-fg-dim">⌘,</span>
        </button>
      </div>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="删除会话"
        description={`将永久删除「${pendingDelete?.title ?? ''}」及其全部消息，此操作无法撤销。`}
        confirmLabel="删除"
        danger
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) deleteConversation(pendingDelete.id)
          setPendingDelete(null)
        }}
      />
    </aside>
  )
}
