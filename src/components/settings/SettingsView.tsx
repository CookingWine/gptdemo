import { useEffect, useState } from 'react'
import { ArrowLeft, Cpu, KeyRound, Puzzle, SlidersHorizontal } from 'lucide-react'
import { useSettings } from '../../hooks/useSettings'
import { APP_VERSION } from '../../lib/constants'
import { cn } from '../../lib/utils'
import { Button } from '../ui/Button'
import { ApiPanel } from './ApiPanel'
import { GeneralPanel } from './GeneralPanel'
import { ModelsPanel } from './ModelsPanel'
import { PluginsPanel } from './PluginsPanel'

type SettingsTab = 'models' | 'plugins' | 'api' | 'general'

const TABS: Array<{ id: SettingsTab; label: string; hint: string; icon: typeof Cpu }> = [
  { id: 'models', label: '模型', hint: '选择与自定义', icon: Cpu },
  { id: 'plugins', label: '插件', hint: 'Agent 与 Skill', icon: Puzzle },
  { id: 'api', label: 'API 连接', hint: '密钥与端点', icon: KeyRound },
  { id: 'general', label: '通用', hint: '应用信息', icon: SlidersHorizontal },
]

export function SettingsView({ onBack }: { onBack: () => void }) {
  const { modelSwitchLocked, appConfig } = useSettings()
  const [tab, setTab] = useState<SettingsTab>(modelSwitchLocked ? 'general' : 'models')
  const visibleTabs = modelSwitchLocked
    ? TABS.filter((item) => item.id === 'general' || item.id === 'plugins')
    : TABS

  useEffect(() => {
    // Only model/API tabs are locked; the plugins tab stays reachable.
    if (modelSwitchLocked && (tab === 'models' || tab === 'api')) setTab('general')
  }, [modelSwitchLocked, tab])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="drag-region flex h-[54px] shrink-0 items-center gap-2 border-b border-ink-700/70 px-4">
        <Button variant="ghost" size="icon" className="no-drag" onClick={onBack} aria-label="返回对话">
          <ArrowLeft size={15} />
        </Button>
        <div className="flex items-baseline gap-2">
          <span className="text-[13px] font-medium text-fg">设置</span>
          <span className="font-mono text-[10.5px] text-fg-dim">v{APP_VERSION}</span>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <nav className="w-[190px] shrink-0 space-y-1 border-r border-ink-700/70 p-3">
          {visibleTabs.map((item) => {
            const Icon = item.icon
            const active = tab === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={cn(
                  'flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors duration-150',
                  active ? 'bg-ink-750 text-fg' : 'text-fg-muted hover:bg-ink-850 hover:text-fg',
                )}
              >
                <Icon size={14} className={active ? 'text-accent-soft' : 'text-fg-dim'} />
                <span className="flex-1">
                  <span className="block text-[12.5px]">{item.label}</span>
                  <span className="block text-[10.5px] text-fg-dim">{item.hint}</span>
                </span>
                {active ? <span className="h-1.5 w-1.5 rounded-full bg-accent" /> : null}
              </button>
            )
          })}

          {appConfig.ui.showSettingsNavHint ? (
            <div className="mt-3 rounded-lg border border-ink-700/70 bg-ink-900/60 p-2.5">
              <p className="text-[10.5px] leading-relaxed text-fg-dim">
                模型与 API 配置仅保存在本机，不会上传到第三方服务。
              </p>
            </div>
          ) : null}
        </nav>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-2xl px-7 py-6">
            {tab === 'models' ? <ModelsPanel /> : null}
            {tab === 'plugins' ? <PluginsPanel /> : null}
            {tab === 'api' ? <ApiPanel /> : null}
            {tab === 'general' ? <GeneralPanel onBack={onBack} /> : null}
          </div>
        </div>
      </div>
    </div>
  )
}
