import { parseSse } from './sse.mjs'

/**
 * Normalize an OpenAI-compatible base url into a chat completions endpoint.
 * @param {string} baseUrl
 */
export function chatCompletionsUrl(baseUrl) {
  const trimmed = String(baseUrl || '').trim().replace(/\/+$/, '')
  if (!trimmed) return ''
  if (/\/chat\/completions$/.test(trimmed)) return trimmed
  return `${trimmed}/chat/completions`
}

function normalizeHttpError(status, body) {
  let detail = ''
  try {
    const parsed = JSON.parse(body)
    detail = parsed?.error?.message || parsed?.message || ''
  } catch {
    detail = String(body || '').slice(0, 200)
  }
  const hint =
    status === 401 || status === 403
      ? 'API Key 无效或没有该模型的访问权限'
      : status === 404
        ? '模型不存在或 Base URL 路径不正确'
        : status === 429
          ? '请求过于频繁或额度不足'
          : '服务端返回异常'
  return `${hint}（HTTP ${status}${detail ? `：${detail}` : ''}）`
}

/**
 * Stream an OpenAI-compatible chat completion.
 * @param {{
 *   baseUrl: string,
 *   apiKey: string,
 *   model: string,
 *   messages: Array<{ role: string, content: string }>,
 *   temperature?: number,
 *   signal?: AbortSignal,
 *   onDelta: (delta: string) => void,
 * }} options
 */
export async function streamChatCompletion(options) {
  const { baseUrl, apiKey, model, messages, temperature, signal, onDelta } = options
  const url = chatCompletionsUrl(baseUrl)
  if (!url) throw new Error('Base URL 未配置')

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: Number.isFinite(temperature) ? temperature : 0.7,
      stream: true,
    }),
    signal,
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(normalizeHttpError(response.status, body))
  }
  if (!response.body) throw new Error('上游返回了空响应体')

  let received = 0
  for await (const payload of parseSse(response.body)) {
    if (payload === '[DONE]') break
    let json
    try {
      json = JSON.parse(payload)
    } catch {
      continue
    }
    const delta = json?.choices?.[0]?.delta?.content
    if (typeof delta === 'string' && delta.length > 0) {
      received += delta.length
      onDelta(delta)
    }
  }

  if (received === 0) {
    throw new Error('模型未返回任何内容')
  }
}

/**
 * Lightweight connectivity probe: asks for a 1-token completion without streaming.
 * @param {{ baseUrl: string, apiKey: string, model: string, signal?: AbortSignal }} options
 */
export async function testConnection({ baseUrl, apiKey, model, signal }) {
  const url = chatCompletionsUrl(baseUrl)
  if (!url) return { ok: false, message: '请先填写 Base URL' }
  if (!apiKey) return { ok: false, message: '请先填写 API Key' }

  const startedAt = Date.now()
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: 'ping' }],
      max_tokens: 1,
      stream: false,
    }),
    signal,
  })

  const latencyMs = Date.now() - startedAt
  if (!response.ok) {
    const body = await response.text().catch(() => '')
    return { ok: false, message: normalizeHttpError(response.status, body), latencyMs }
  }
  return { ok: true, message: `连接成功，${model} 可用`, latencyMs }
}
