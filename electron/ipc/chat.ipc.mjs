import { BrowserWindow, ipcMain } from 'electron'
import { streamChatCompletion, testConnection } from '../services/llm.mjs'
import { buildMockReply, streamMock } from '../services/mock.mjs'

/** @type {Map<string, AbortController>} */
const controllers = new Map()

const ALLOWED_ROLES = new Set(['system', 'user', 'assistant'])

function emit(event, payload) {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (!win || win.isDestroyed()) return
  win.webContents.send('codex:chat:event', payload)
}

function sanitizeMessages(input) {
  if (!Array.isArray(input)) return []
  return input
    .slice(-40)
    .map((message) => {
      const role = ALLOWED_ROLES.has(message?.role) ? message.role : 'user'
      const content = typeof message?.content === 'string' ? message.content.slice(0, 24000) : ''
      return { role, content: content.trim() }
    })
    .filter((message) => message.content.length > 0)
}

export function registerChatIpc() {
  ipcMain.handle('codex:chat:start', (event, raw) => {
    const requestId = typeof raw?.requestId === 'string' ? raw.requestId : ''
    if (!requestId) return { mode: 'error', message: '缺少 requestId' }

    const messages = sanitizeMessages(raw?.messages)
    if (messages.length === 0) return { mode: 'error', message: '消息内容为空' }

    if (controllers.has(requestId)) {
      controllers.get(requestId).abort()
      controllers.delete(requestId)
    }

    const api = raw?.api && typeof raw.api === 'object' ? raw.api : {}
    const apiKey = typeof api.apiKey === 'string' ? api.apiKey.trim() : ''
    const baseUrl = typeof api.baseUrl === 'string' ? api.baseUrl.trim() : ''
    const temperature = Number.isFinite(api.temperature) ? api.temperature : 0.7
    const model = typeof raw?.model === 'string' ? raw.model.trim() : ''
    const modelLabel = typeof raw?.modelLabel === 'string' && raw.modelLabel ? raw.modelLabel : model
    const lastUserMessage = [...messages].reverse().find((message) => message.role === 'user')
    const prompt = lastUserMessage?.content ?? ''

    const controller = new AbortController()
    controllers.set(requestId, controller)
    const mode = apiKey && baseUrl ? 'live' : 'mock'

    const runMock = async () => {
      const text = buildMockReply(prompt, modelLabel)
      await streamMock({
        text,
        signal: controller.signal,
        onDelta: (delta) => emit(event, { requestId, type: 'chunk', delta }),
      })
      emit(event, {
        requestId,
        type: 'done',
        mode: 'mock',
        aborted: controller.signal.aborted,
      })
    }

    void (async () => {
      try {
        if (mode === 'mock') {
          await runMock()
          return
        }

        try {
          await streamChatCompletion({
            baseUrl,
            apiKey,
            model: model || modelLabel,
            messages,
            temperature,
            signal: controller.signal,
            onDelta: (delta) => emit(event, { requestId, type: 'chunk', delta }),
          })
          emit(event, { requestId, type: 'done', mode: 'live' })
        } catch (error) {
          if (controller.signal.aborted) {
            emit(event, { requestId, type: 'done', mode: 'live', aborted: true })
            return
          }
          const reason = error?.message || '未知网络错误'
          console.error('[chat] live request failed:', reason)
          emit(event, {
            requestId,
            type: 'notice',
            mode: 'mock',
            message: `真实模型请求失败：${reason}。已切换为本地演示回复。`,
          })
          emit(event, { requestId, type: 'reset' })
          await runMock()
        }
      } catch (error) {
        console.error('[chat] stream crashed:', error?.message ?? error)
        emit(event, { requestId, type: 'error', message: error?.message ?? '生成过程中发生错误' })
      } finally {
        controllers.delete(requestId)
      }
    })()

    return { mode }
  })

  ipcMain.handle('codex:chat:abort', (_event, requestId) => {
    if (typeof requestId !== 'string') return { ok: false }
    const controller = controllers.get(requestId)
    if (controller) {
      controller.abort()
      controllers.delete(requestId)
    }
    return { ok: true }
  })

  ipcMain.handle('codex:chat:test', async (_event, payload) => {
    const api = payload?.api && typeof payload.api === 'object' ? payload.api : {}
    const model = typeof payload?.model === 'string' ? payload.model : ''
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 20000)
    try {
      return await testConnection({
        baseUrl: typeof api.baseUrl === 'string' ? api.baseUrl.trim() : '',
        apiKey: typeof api.apiKey === 'string' ? api.apiKey.trim() : '',
        model,
        signal: controller.signal,
      })
    } catch (error) {
      const aborted = controller.signal.aborted
      return { ok: false, message: aborted ? '连接超时（20 秒）' : error?.message ?? '连接失败' }
    } finally {
      clearTimeout(timer)
    }
  })
}
