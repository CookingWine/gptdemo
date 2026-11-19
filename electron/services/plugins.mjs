import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { decryptManifest } from '../../shared/asster-crypto.mjs'

const LIMITS = {
  name: 50,
  description: 200,
  prompt: 8000,
  instructions: 12000,
  tags: 5,
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function pluginsFilePath() {
  return path.join(app.getPath('userData'), 'plugins.json')
}

function newId(prefix) {
  return `${prefix}_${randomUUID().replace(/-/g, '').slice(0, 12)}`
}

function normalizeTags(value) {
  if (!Array.isArray(value)) return undefined
  const tags = value
    .filter((tag) => typeof tag === 'string')
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, LIMITS.tags)
  return tags.length > 0 ? tags : undefined
}

function readStore() {
  try {
    const raw = JSON.parse(fs.readFileSync(pluginsFilePath(), 'utf8'))
    const agents = Array.isArray(raw?.agents) ? raw.agents : []
    const skills = Array.isArray(raw?.skills) ? raw.skills : []
    return {
      agents: agents.filter((item) => isPlainObject(item) && typeof item.id === 'string'),
      skills: skills.filter((item) => isPlainObject(item) && typeof item.id === 'string'),
    }
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      console.error('[plugins] failed to read store:', error?.message ?? error)
    }
    return { agents: [], skills: [] }
  }
}

function writeStore(store) {
  const target = pluginsFilePath()
  try {
    fs.mkdirSync(path.dirname(target), { recursive: true })
    const tmp = `${target}.${process.pid}.tmp`
    fs.writeFileSync(tmp, JSON.stringify(store, null, 2), 'utf8')
    fs.renameSync(tmp, target)
  } catch (error) {
    console.error('[plugins] failed to write store:', error?.message ?? error)
  }
}

export function getPlugins() {
  return readStore()
}

export function savePlugins(next) {
  const current = readStore()
  const agents = Array.isArray(next?.agents) ? next.agents : current.agents
  const skills = Array.isArray(next?.skills) ? next.skills : current.skills
  const store = {
    agents: agents.map((agent) => ({
      id: typeof agent.id === 'string' ? agent.id : newId('agent'),
      name: String(agent.name ?? '').slice(0, LIMITS.name),
      description: String(agent.description ?? '').slice(0, LIMITS.description),
      systemPrompt: String(agent.systemPrompt ?? '').slice(0, LIMITS.prompt),
      ...(Array.isArray(agent.tags) ? { tags: agent.tags.slice(0, LIMITS.tags) } : {}),
    })),
    skills: skills.map((skill) => ({
      id: typeof skill.id === 'string' ? skill.id : newId('skill'),
      name: String(skill.name ?? '').slice(0, LIMITS.name),
      description: String(skill.description ?? '').slice(0, LIMITS.description),
      instructions: String(skill.instructions ?? '').slice(0, LIMITS.instructions),
      enabled: skill.enabled !== false,
      ...(Array.isArray(skill.tags) ? { tags: skill.tags.slice(0, LIMITS.tags) } : {}),
    })),
  }
  writeStore(store)
  return store
}

export function validateAgent(raw) {
  if (!isPlainObject(raw)) return { error: '文件内容必须是 JSON 对象' }
  const name = typeof raw.name === 'string' ? raw.name.trim() : ''
  if (!name) return { error: '缺少必填字段 name（Agent 名称）' }
  if (name.length > LIMITS.name) return { error: `name 超过 ${LIMITS.name} 个字符` }
  const prompt =
    typeof raw.systemPrompt === 'string' && raw.systemPrompt.trim()
      ? raw.systemPrompt
      : typeof raw.prompt === 'string'
        ? raw.prompt
        : ''
  if (!prompt.trim()) return { error: '缺少必填字段 systemPrompt（Agent 系统提示词）' }
  if (prompt.length > LIMITS.prompt) {
    return { error: `systemPrompt 超过 ${LIMITS.prompt} 个字符` }
  }
  const description =
    typeof raw.description === 'string' ? raw.description.trim().slice(0, LIMITS.description) : ''
  return {
    value: {
      name,
      description,
      systemPrompt: prompt.trim(),
      tags: normalizeTags(raw.tags),
    },
  }
}

export function validateSkill(raw) {
  if (!isPlainObject(raw)) return { error: '文件内容必须是 JSON 对象' }
  const name = typeof raw.name === 'string' ? raw.name.trim() : ''
  if (!name) return { error: '缺少必填字段 name（Skill 名称）' }
  if (name.length > LIMITS.name) return { error: `name 超过 ${LIMITS.name} 个字符` }
  const instructions =
    typeof raw.instructions === 'string' && raw.instructions.trim()
      ? raw.instructions
      : typeof raw.content === 'string'
        ? raw.content
        : ''
  if (!instructions.trim()) return { error: '缺少必填字段 instructions（技能指令内容）' }
  if (instructions.length > LIMITS.instructions) {
    return { error: `instructions 超过 ${LIMITS.instructions} 个字符` }
  }
  const description =
    typeof raw.description === 'string' ? raw.description.trim().slice(0, LIMITS.description) : ''
  return {
    value: {
      name,
      description,
      instructions: instructions.trim(),
      enabled: raw.enabled !== false,
      tags: normalizeTags(raw.tags),
    },
  }
}

/**
 * Decrypt an .assterplugin package into a hidden folder under userData.
 * Returns the folder so the regular import pipeline can scan agents/ + skills/.
 */
export function decryptToHiddenFolder(filePath) {
  const stat = fs.statSync(filePath)
  if (!stat.isFile()) throw new Error('所选路径不是文件')

  const manifest = decryptManifest(fs.readFileSync(filePath, 'utf8'))
  const dest = path.join(
    app.getPath('userData'),
    '.asster',
    `import-${Date.now()}-${randomUUID().replace(/-/g, '').slice(0, 8)}`,
  )

  for (const file of manifest.files) {
    const rel = String(file?.path ?? '')
    if (!rel || rel.includes('..') || path.isAbsolute(rel)) {
      throw new Error(`插件包含非法路径：${rel || '(空)'}`)
    }
    const target = path.join(dest, rel)
    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.writeFileSync(target, String(file.content ?? ''), 'utf8')
  }

  console.log(`[plugins] decrypted ${manifest.files.length} files -> ${dest}`)
  return dest
}

function scanPluginDir(root, dirName, kind, names, report) {
  const abs = path.join(root, dirName)
  let entries
  try {
    entries = fs.readdirSync(abs, { withFileTypes: true })
  } catch {
    return
  }

  for (const entry of entries) {
    const rel = `${dirName}/${entry.name}`
    if (!entry.isFile() || !entry.name.toLowerCase().endsWith('.json')) {
      report.ignored.push(rel)
      continue
    }

    let raw
    try {
      raw = JSON.parse(fs.readFileSync(path.join(abs, entry.name), 'utf8'))
    } catch {
      report.errors.push({ file: rel, reason: '不是有效的 JSON 文件' })
      continue
    }

    const validated = kind === 'agent' ? validateAgent(raw) : validateSkill(raw)
    if (validated.error) {
      report.errors.push({ file: rel, reason: validated.error })
      continue
    }

    const kindLabel = kind === 'agent' ? 'Agent' : 'Skill'
    const nameKey = validated.value.name.toLowerCase()
    if (names.has(nameKey)) {
      report.errors.push({
        file: rel,
        reason: `已存在同名${kindLabel}「${validated.value.name}」，已跳过`,
      })
      continue
    }
    names.add(nameKey)

    if (kind === 'agent') {
      report.importedAgents.push({
        id: newId('agent'),
        builtin: false,
        ...validated.value,
      })
    } else {
      report.importedSkills.push({
        id: newId('skill'),
        ...validated.value,
      })
    }
  }
}

/**
 * Scan `<dir>/agents/*.json` and `<dir>/skills/*.json`, validate each file and
 * merge valid entries into the persisted store. Never throws; every failure is
 * reported per file so the renderer can show precise feedback.
 */
export function importFromDirectory(dirPath) {
  const existing = readStore()
  const report = {
    canceled: false,
    importedAgents: [],
    importedSkills: [],
    errors: [],
    ignored: [],
    store: existing,
  }

  let root = null
  try {
    root = fs.statSync(dirPath).isDirectory() ? dirPath : null
  } catch {
    root = null
  }
  if (!root) {
    report.errors.push({ file: dirPath, reason: '目录不存在或不可读' })
    return report
  }

  const agentNames = new Set(existing.agents.map((agent) => agent.name.toLowerCase()))
  const skillNames = new Set(existing.skills.map((skill) => skill.name.toLowerCase()))
  scanPluginDir(root, 'agents', 'agent', agentNames, report)
  scanPluginDir(root, 'skills', 'skill', skillNames, report)

  if (report.importedAgents.length > 0 || report.importedSkills.length > 0) {
    const store = savePlugins({
      agents: [...existing.agents, ...report.importedAgents],
      skills: [...existing.skills, ...report.importedSkills],
    })
    report.store = store
  }
  return report
}
