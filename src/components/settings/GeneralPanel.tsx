import { useState } from 'react'
import { ArrowLeft, Database, Info, MonitorCog, Trash2 } from 'lucide-react'
import { useChat } from '../../hooks/useChat'
import { useSettings } from '../../hooks/useSettings'
import { APP_NAME, APP_VERSION } from '../../lib/constants'
import { getBridge, isElectron } from '../../lib/ipc'
import { Button } from '../ui/Button'
import { ConfirmDialog } from '../ui/Modal'

/** Agent / Skill counts come from imported plugins, shared with the plugins panel. */

function Row({ label, value, title }: { label: string; value: string; title?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-ink-700/60 py-2 last:border-0">
      <span className="text-[11.5px] text-fg-muted">{label}</span>
      <span
        title={title ?? value}
        className="max-w-[60%] truncate font-mono text-[11px] text-fg-secondary"
      >
        {value}
      </span>
    </div>
  )
}

export function GeneralPanel({ onBack }: { onBack: () => void }) {
  const { conversations, clearAll } = useChat()
  const { settings, appConfig, plugins, activeModel, activeProvider, modelSwitchLocked } =
    useSettings()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const bridge = getBridge()
  const liveMode = Boolean(activeProvider.apiKey && activeProvider.baseUrl)
  const totalMessages = conversations.reduce((sum, item) => sum + item.messages.length, 0)
  const { showRuntimeDetails, showLocalData, showAboutDetails } = appConfig.ui

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-[15px] font-semibold text-fg">通用</h2>
        <p className="mt-1 text-[12.5px] leading-relaxed text-fg-muted">
          查看运行环境与应用信息。
        </p>
      </header>

      <section className="rounded-xl border border-ink-600 bg-ink-900/50 p-4">
        <h3 className="flex items-center gap-1.5 text-[12.5px] font-medium text-fg">
          <MonitorCog size={13} className="text-accent-soft" />
          运行状态
        </h3>
        <div className="mt-2">
          <Row label="运行环境" value={isElectron() ? 'Electron 桌面端' : '浏览器预览'} />
          <Row label="Electron" value={bridge.versions.electron} />
          <Row label="Node" value={bridge.versions.node} />
          <Row label="Skill 数量" value={String(plugins.skills.length)} />
          <Row label="Agent 数量" value={String(plugins.agents.length)} />
          {showRuntimeDetails ? (
            <>
              <Row
                label="连接模式"
                value={liveMode ? `真实 API（${activeProvider.label}）` : '本地演示'}
              />
              <Row
                label="当前模型"
                value={`${activeModel.label} (${activeModel.modelId})`}
              />
              <Row
                label="模型切换"
                value={modelSwitchLocked ? `已锁定（${activeModel.label}）` : '允许切换'}
              />
              <Row
                label="配置文件"
                value={
                  appConfig.configPath
                    ? `${appConfig.configPath}${appConfig.configFound ? '' : '（未找到，使用默认值）'}`
                    : '不可用（使用默认值）'
                }
                title={appConfig.configPath}
              />
              <Row label="模型数量" value={`${settings.models.length} 个`} />
              {settings.providers.map((provider) => (
                <Row
                  key={provider.id}
                  label={`${provider.label} 通道`}
                  value={provider.apiKey ? '已配置 Key' : '未配置 Key'}
                />
              ))}
            </>
          ) : null}
        </div>
        {showRuntimeDetails ? (
          <p className="mt-2 text-[10.5px] leading-relaxed text-fg-dim">
            修改配置文件后需重启应用生效；打包应用读取 App 包内
            Resources/config/app.config.json。
          </p>
        ) : null}
      </section>

      {showLocalData ? (
        <section className="rounded-xl border border-ink-600 bg-ink-900/50 p-4">
          <h3 className="flex items-center gap-1.5 text-[12.5px] font-medium text-fg">
            <Database size={13} className="text-accent-soft" />
            本地数据
          </h3>
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-fg-muted">
            共 {conversations.length} 个会话、{totalMessages} 条消息，保存在本机用户数据目录。
          </p>
          <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-bad/25 bg-bad/[0.06] px-3 py-2.5">
            <div>
              <p className="text-[12px] font-medium text-fg">清空全部会话</p>
              <p className="mt-0.5 text-[10.5px] text-fg-dim">模型与 API 配置不会被删除</p>
            </div>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setConfirmOpen(true)}
              disabled={conversations.length === 0}
            >
              <Trash2 size={11} />
              清空
            </Button>
          </div>
        </section>
      ) : null}

      <section className="rounded-xl border border-ink-600 bg-ink-900/50 p-4">
        <h3 className="flex items-center gap-1.5 text-[12.5px] font-medium text-fg">
          <Info size={13} className="text-accent-soft" />
          关于
        </h3>
        <div className="mt-2">
          <Row label="应用" value={APP_NAME} />
          <Row label="版本" value={`v${APP_VERSION}`} />
          {showAboutDetails ? (
            <>
              <Row label="技术栈" value="Electron · React · TypeScript · Vite" />
              <Row label="界面参考" value="Codex Desktop" />
            </>
          ) : null}
        </div>
        {showAboutDetails ? (
          <>
            <p className="mt-3 text-[11.5px] leading-relaxed text-fg-dim">
              主对话与设置共享同一份模型状态；选择结果会随每次请求透传给上游模型接口，并在重启后恢复。
            </p>
            <Button variant="outline" size="sm" className="mt-3" onClick={onBack}>
              <ArrowLeft size={12} />
              返回对话
            </Button>
          </>
        ) : null}
      </section>

      {showLocalData ? (
        <ConfirmDialog
          open={confirmOpen}
          title="清空全部会话"
          description="将删除本机保存的所有会话与消息记录，此操作无法撤销。"
          confirmLabel="全部清空"
          danger
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => {
            clearAll().catch((error) => console.error('[settings] clear failed:', error))
            setConfirmOpen(false)
          }}
        />
      ) : null}
    </div>
  )
}
