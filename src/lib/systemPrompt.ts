import type { PluginAgent, PluginSkill } from '../types'

/** Hard cap for the composed system prompt, keeps requests within safe limits. */
const MAX_PROMPT_LENGTH = 24000

export interface ComposeSystemPromptOptions {
  /** Active imported agent; when absent the built-in default prompt is used. */
  agent?: PluginAgent
  /** Imported skills; only those with `enabled !== false` participate. */
  skills?: PluginSkill[]
  fallback: string
}

/**
 * Compose the system prompt sent with every message:
 * agent persona (or built-in default) + instructions of all enabled skills.
 * Re-computed on every send, so imported plugins take effect immediately.
 */
export function composeSystemPrompt({
  agent,
  skills = [],
  fallback,
}: ComposeSystemPromptOptions): string {
  const parts: string[] = [agent?.systemPrompt?.trim() || fallback]

  for (const skill of skills) {
    const instructions = skill.instructions?.trim()
    if (skill.enabled === false || !instructions) continue
    parts.push(`# 已启用技能：${skill.name}\n${instructions}`)
  }

  let prompt = parts.join('\n\n')
  if (prompt.length > MAX_PROMPT_LENGTH) {
    prompt = `${prompt.slice(0, MAX_PROMPT_LENGTH)}\n\n（系统提示词过长，已截断）`
  }
  return prompt
}
