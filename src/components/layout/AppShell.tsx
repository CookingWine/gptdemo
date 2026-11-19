import { useEffect, useState } from 'react'
import { useChat } from '../../hooks/useChat'
import { useSettings } from '../../hooks/useSettings'
import { ChatView } from '../chat/ChatView'
import { SettingsView } from '../settings/SettingsView'
import { Toast } from '../ui/Toast'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

export function AppShell() {
  const [view, setView] = useState<'chat' | 'settings'>('chat')
  const { notice, dismissNotice, newConversation } = useChat()
  const { ready } = useSettings()

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const meta = event.metaKey || event.ctrlKey
      if (meta && event.key.toLowerCase() === 'n') {
        event.preventDefault()
        newConversation()
        setView('chat')
        return
      }
      if (meta && event.key === ',') {
        event.preventDefault()
        setView('settings')
        return
      }
      if (event.key === 'Escape') {
        setView((current) => (current === 'settings' ? 'chat' : current))
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [newConversation])

  if (!ready) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-ink-950">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-ink-600 border-t-accent" />
          <p className="text-[12.5px] text-fg-dim">正在加载工作区…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-ink-950 text-fg">
      <Sidebar
        view={view}
        onOpenSettings={() => setView('settings')}
        onOpenChat={() => setView('chat')}
      />
      <main className="flex min-w-0 flex-1 flex-col bg-ink-950">
        {view === 'settings' ? (
          <SettingsView onBack={() => setView('chat')} />
        ) : (
          <>
            <TopBar onOpenSettings={() => setView('settings')} />
            <ChatView />
          </>
        )}
      </main>

      {notice ? <Toast message={notice.message} onClose={dismissNotice} /> : null}
    </div>
  )
}
