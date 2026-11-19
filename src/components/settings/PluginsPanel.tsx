import { useState } from 'react'
import { AlertTriangle, Bot, Check, FolderOpen, Loader2, Puzzle, Sparkles } from 'lucide-react'
import { useSettings } from '../../hooks/useSettings'
import { cn } from '../../lib/utils'
import type { PluginImportReport } from '../../types'
import { Button } from '../ui/Button'
import { Switch } from '../ui/Form'
import { PluginFormatGuide } from './PluginFormatGuide'

function ImportReportCard({ report }: { report: PluginImportReport }) {
  const agentCount = report.importedAgents.length
  const skillCount = report.importedSkills.length
  const hasImported = agentCount > 0 || skillCount > 0

  return (
    <div
      className={cn(
        'space-y-2 rounded-xl border p-3.5 text-[12px]',
        hasImported ? 'border-ok/30 bg-ok/[0.05]' : 'border-warn/30 bg-warn/[0.05]',
      )}
    >
      <p className={cn('flex items-center gap-1.5 font-medium', hasImported ? 'text-ok' : 'text-warn')}>
        {hasImported ? <Check size={13} /> : <AlertTriangle size={13} />}
        {hasImported
          ? `导入成功：${agentCount} 个 Agent、${skillCount} 个 Skill，已实时生效`
          : '没有可导入的插件'}
      </p>

      {hasImported ? (
        <ul className="space-y-1 text-fg-secondary">
          {report.importedAgents.map((agent) => (
            <li key={agent.id} className="flex items-center gap-1.5">
              <span className="rounded bg-ink-700/80 px-1 text-[10px] text-fg-muted">Agent</span>
              <span>{agent.name}</span>
              {agent.description ? (
                <span className="truncate text-fg-dim">— {agent.description}</span>
              ) : null}
            </li>
          ))}
          {report.importedSkills.map((skill) => (
            <li key={skill.id} className="flex items-center gap-1.5">
              <span className="rounded bg-ink-700/80 px-1 text-[10px] text-fg-muted">Skill</span>
              <span>{skill.name}</span>
              {skill.description ? (
                <span className="truncate text-fg-dim">— {skill.description}</span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {report.errors.length > 0 ? (
        <div className="space-y-1 rounded-lg border border-bad/25 bg-bad/[0.07] p-2.5">
          <p className="flex items-center gap-1.5 font-medium text-bad">
            <AlertTriangle size={12} />
            {report.errors.length} 个文件导入失败
          </p>
          <ul className="space-y-0.5 text-bad/90">
            {report.errors.map((error) => (
              <li key={`${error.file}-${error.reason}`} className="font-mono text-[11px]">
                {error.file}：{error.reason}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {report.ignored.length > 0 ? (
        <p className="text-[11px] text-fg-dim">已忽略 {report.ignored.length} 个非 .json 文件/目录</p>
      ) : null}
    </div>
  )
}

export function PluginsPanel() {
  const { plugins, settings, setActiveAgent, savePlugins, importPlugins } = useSettings()
  const [importing, setImporting] = useState(false)
  const [report, setReport] = useState<PluginImportReport | null>(null)

  const handleImport = () => {
    if (importing) return
    setImporting(true)
    importPlugins()
      .then(setReport)
      .catch((error) => console.error('[plugins] import failed:', error))
      .finally(() => setImporting(false))
  }

  const toggleSkill = (id: string, enabled: boolean) => {
    savePlugins({
      agents: plugins.agents,
      skills: plugins.skills.map((skill) =>
        skill.id === id ? { ...skill, enabled } : skill,
      ),
    })
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="flex items-center gap-1.5 text-[15px] font-semibold text-fg">
          <Puzzle size={15} className="text-accent-soft" />
          插件（Agent 与 Skill）
        </h2>
        <p className="mt-1 text-[12.5px] leading-relaxed text-fg-muted">
          从本地文件夹导入 Agent（对话角色）与 Skill（技能指令）。导入成功后立即对当前及后续对话生效，无需重启。
        </p>
      </header>

      <section className="space-y-3 rounded-xl border border-ink-600 bg-ink-900/50 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[12.5px] font-medium text-fg">从加密资源导入</p>
            <p className="mt-0.5 text-[10.5px] text-fg-dim">
              选择 .assterplugin 加密资源文件，自动解密到隐藏目录并校验其中的 Agent 与 Skill
            </p>
          </div>
          <Button variant="primary" size="sm" onClick={handleImport} disabled={importing}>
            {importing ? <Loader2 size={12} className="animate-spin" /> : <FolderOpen size={12} />}
            {importing ? '导入中…' : '选择资源…'}
          </Button>
        </div>

        {report && !report.canceled ? <ImportReportCard report={report} /> : null}

        <PluginFormatGuide />
      </section>

      <section className="rounded-xl border border-ink-600 bg-ink-900/50 p-4">
        <h3 className="flex items-center gap-1.5 text-[12.5px] font-medium text-fg">
          <Bot size={13} className="text-accent-soft" />
          Agent（对话角色）
          <span className="rounded bg-ink-700/80 px-1.5 py-px font-mono text-[10px] text-fg-muted">
            {plugins.agents.length}
          </span>
        </h3>
        <p className="mt-1 text-[11.5px] text-fg-muted">
          选中的 Agent 会替代默认系统提示词，作用于之后发送的每条消息。
        </p>
        <div className="mt-3 space-y-2" role="radiogroup" aria-label="Agent 列表">
          {[
            { id: '', label: '不使用 Agent', description: '使用内置默认系统提示词' },
            ...plugins.agents.map((agent) => ({
              id: agent.id,
              label: agent.name,
              description: agent.description ?? agent.systemPrompt.slice(0, 80),
              tags: agent.tags,
            })),
          ].map((item) => {
            const selected = settings.activeAgentId === item.id
            return (
              <button
                key={item.id || 'none'}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setActiveAgent(item.id)}
                className={cn(
                  'flex w-full cursor-pointer items-start gap-2.5 rounded-lg border p-3 text-left transition-all duration-150',
                  selected
                    ? 'border-accent/50 bg-accent/[0.06]'
                    : 'border-ink-600 bg-ink-900/40 hover:border-ink-500 hover:bg-ink-850',
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                    selected ? 'border-accent bg-accent' : 'border-ink-500 bg-ink-900',
                  )}
                >
                  {selected ? <Check size={11} className="text-white" strokeWidth={3} /> : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[12.5px] font-medium text-fg">{item.label}</span>
                  <span className="mt-0.5 block truncate text-[11px] text-fg-dim">
                    {item.description}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <section className="rounded-xl border border-ink-600 bg-ink-900/50 p-4">
        <h3 className="flex items-center gap-1.5 text-[12.5px] font-medium text-fg">
          <Sparkles size={13} className="text-accent-soft" />
          Skill（技能指令）
          <span className="rounded bg-ink-700/80 px-1.5 py-px font-mono text-[10px] text-fg-muted">
            {plugins.skills.length}
          </span>
        </h3>
        <p className="mt-1 text-[11.5px] text-fg-muted">
          启用的技能指令会附加到系统提示词中，与当前 Agent 叠加生效。
        </p>
        {plugins.skills.length === 0 ? (
          <p className="mt-3 rounded-lg border border-dashed border-ink-600 px-3 py-2.5 text-[11.5px] text-fg-dim">
            暂无 Skill，先通过上方按钮导入。
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {plugins.skills.map((skill) => (
              <div
                key={skill.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-ink-600 bg-ink-900/40 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-[12.5px] font-medium text-fg">
                    {skill.name}
                    {skill.enabled ? null : (
                      <span className="rounded border border-ink-600 px-1 text-[9.5px] text-fg-dim">
                        已停用
                      </span>
                    )}
                  </p>
                  {skill.description ? (
                    <p className="mt-0.5 truncate text-[11px] text-fg-dim">{skill.description}</p>
                  ) : null}
                </div>
                <Switch
                  checked={skill.enabled !== false}
                  onChange={(enabled) => toggleSkill(skill.id, enabled)}
                  label=""
                />
              </div>
            ))}
          </div>
        )}
      </section>

    </div>
  )
}
