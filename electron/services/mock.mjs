const SIMPLE_SNIPPET = `export function summarize(input: string, max = 80): string {
  const normalized = input.replace(/\\s+/g, ' ').trim()
  return normalized.length > max ? normalized.slice(0, max) + '…' : normalized
}`

const REACT_SNIPPET = `type ModelPickerProps = {
  models: ModelConfig[]
  activeId: string
  onChange: (id: string) => void
}

export function ModelPicker({ models, activeId, onChange }: ModelPickerProps) {
  return (
    <select value={activeId} onChange={(event) => onChange(event.target.value)}>
      {models.map((model) => (
        <option key={model.id} value={model.id}>
          {model.label}
        </option>
      ))}
    </select>
  )
}`

const API_SNIPPET = `const response = await fetch(\`\${baseUrl}/chat/completions\`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: \`Bearer \${apiKey}\`,
  },
  body: JSON.stringify({ model, messages, stream: true }),
})

if (!response.ok) throw new Error(\`请求失败：HTTP \${response.status}\`)`

function pickSnippet(prompt) {
  if (/react|组件|前端|界面|ui|tailwind/i.test(prompt)) return { lang: 'tsx', code: REACT_SNIPPET }
  if (/api|接口|请求|服务端|node|electron/i.test(prompt)) return { lang: 'ts', code: API_SNIPPET }
  return { lang: 'ts', code: SIMPLE_SNIPPET }
}

/**
 * Compose a deterministic-yet-thoughtful demo answer so the app is usable without credentials.
 * @param {string} prompt
 * @param {string} modelLabel
 */
export function buildMockReply(prompt, modelLabel) {
  const clean = String(prompt || '').replace(/\s+/g, ' ').trim()
  const topic = clean.length > 60 ? `${clean.slice(0, 60)}…` : clean || '你的问题'
  const snippet = pickSnippet(clean)
  const stepped = /怎么|如何|步骤|实现|方案|why|how/i.test(clean)

  if (stepped) {
    return `### 针对「${topic}」的实现思路

当前由 **${modelLabel}** 在**本地演示模式**下回答（尚未配置 API Key），因此以下内容为内置示例回复。

1. **先明确输入与输出**：把需求拆成「输入 → 处理 → 输出」三段，避免一开始就陷入实现细节。
2. **定义最小可用契约**：先用类型或接口固定数据结构，后续替换数据源时不会牵动上层代码。
3. **用可观测的方式推进**：每完成一层就留日志或断言，出问题时能快速定位边界。

\`\`\`${snippet.lang}
${snippet.code}
\`\`\`

> 配置对应供应商的 Base URL 与 API Key 后，本对话框会自动切换为真实模型输出，当前模型 ${modelLabel} 会作为请求参数直接透传给上游接口。`
  }

  return `### 关于「${topic}」

我来给出一个精简判断，由 **${modelLabel}** 生成（本地演示模式）。

**核心结论**：这类问题的关键不在于堆叠功能，而在于明确边界与失败路径。把「正常路径」写清楚只需一半工作量，另一半要留给超时、空返回、权限不足这些情况。

**建议关注的三点**

- 数据结构先行：先定义稳定的输入输出，再写实现；
- 失败可恢复：网络与模型调用都可能失败，必须有兜底与重试；
- 保持可替换：把模型调用收敛到一个适配层，换供应商时只改一处。

\`\`\`${snippet.lang}
${snippet.code}
\`\`\`

配置真实 API Key 后，同样的提问会由 ${modelLabel} 实时流式返回，而不是这段内置示例。`
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Stream a mock reply character-by-character to mimic token streaming.
 * @param {{ text: string, signal?: AbortSignal, onDelta: (delta: string) => void }} options
 */
export async function streamMock({ text, signal, onDelta }) {
  const chars = Array.from(text)
  let index = 0
  while (index < chars.length) {
    if (signal?.aborted) return
    const size = 2 + Math.floor(Math.random() * 4)
    onDelta(chars.slice(index, index + size).join(''))
    index += size
    await wait(10 + Math.floor(Math.random() * 16))
  }
}
