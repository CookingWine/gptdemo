export function PluginFormatGuide() {
  return (
    <details className="rounded-xl border border-ink-700/70 bg-ink-900/40">
      <summary className="cursor-pointer px-4 py-2.5 text-[12px] text-fg-secondary">
        查看目录结构与文件格式约定
      </summary>
      <div className="space-y-3 border-t border-ink-700/70 px-4 py-3 text-[11.5px] leading-relaxed text-fg-dim">
        <p>
          ① 按以下结构准备源文件夹（agents/ 与 skills/ 均为可选）：
        </p>
        <pre className="overflow-x-auto rounded-lg border border-ink-700 bg-ink-950 p-3 font-mono text-[11px] text-fg-secondary">
{`源文件夹/
├── agents/                 # 每个 .json 文件一个 Agent
│   └── 代码评审.json
└── skills/                 # 每个 .json 文件一个 Skill
    └── 单元测试生成.json`}
        </pre>
        <p>
          ② 使用加密工具打包为单个{' '}
          <span className="font-mono text-fg-secondary">.assterplugin</span> 文件：
          <span className="font-mono text-fg-secondary"> npm run encrypt -- 源文件夹</span>
          ，导入时选择该文件即可；应用会解密到隐藏目录（userData/.asster/）并自动加载。
        </p>

        <div>
          <p className="font-medium text-fg-secondary">Agent（agents/*.json）</p>
          <pre className="mt-1 overflow-x-auto rounded-lg border border-ink-700 bg-ink-950 p-3 font-mono text-[11px] text-fg-secondary">
{`{
  "name": "代码评审",              // 必填，1-50 字符
  "description": "严格的代码评审员", // 选填，≤200 字符
  "systemPrompt": "你是一名…",     // 必填，≤8000 字符
  "tags": ["代码"]                 // 选填，≤5 个
}`}
          </pre>
        </div>

        <div>
          <p className="font-medium text-fg-secondary">Skill（skills/*.json）</p>
          <pre className="mt-1 overflow-x-auto rounded-lg border border-ink-700 bg-ink-950 p-3 font-mono text-[11px] text-fg-secondary">
{`{
  "name": "单元测试生成",          // 必填，1-50 字符
  "description": "为函数生成测试", // 选填，≤200 字符
  "instructions": "为给定函数…",  // 必填，≤12000 字符
  "enabled": true,                // 选填，默认启用
  "tags": ["测试"]                // 选填，≤5 个
}`}
          </pre>
        </div>

        <ul className="space-y-1">
          <li>· 仅打包与扫描 .json 文件，其他文件会被忽略并计入导入反馈；</li>
          <li>· 同名（不区分大小写）的 Agent / Skill 会被跳过，不会覆盖；</li>
          <li>· 导入成功后立即生效，无需重启应用；解密目录默认隐藏（userData/.asster/）。</li>
        </ul>
      </div>
    </details>
  )
}
