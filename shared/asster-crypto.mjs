import crypto from 'node:crypto'

/**
 * Shared .assterplugin envelope codec (AES-256-GCM + scrypt).
 * Used by both the encryption CLI (scripts/encrypt-plugin.mjs) and the
 * Electron main process decryptor (electron/services/plugins.mjs).
 *
 * NOTE: the passphrase is embedded so the app can open packages without user
 * input. This is obfuscation for distribution, not strong secrecy.
 */

export const MAGIC = 'ASSTERPLUGIN1:'
const PASSPHRASE = process.env.ASSTERPLUGIN_KEY || 'assterplugin-default-key-v1'
const SALT_BYTES = 16
const IV_BYTES = 12
const TAG_BYTES = 16

export function encryptManifest(manifest) {
  const salt = crypto.randomBytes(SALT_BYTES)
  const key = crypto.scryptSync(PASSPHRASE, salt, 32)
  const iv = crypto.randomBytes(IV_BYTES)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const data = Buffer.concat([
    cipher.update(JSON.stringify(manifest), 'utf8'),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()
  const payload = Buffer.concat([salt, iv, tag, data]).toString('base64')
  return `${MAGIC}${payload}`
}

export function decryptManifest(content) {
  const text = String(content ?? '').trim()
  if (!text.startsWith(MAGIC)) {
    throw new Error('缺少 .assterplugin 文件头，请确认文件由加密工具生成')
  }
  let buf
  try {
    buf = Buffer.from(text.slice(MAGIC.length), 'base64')
  } catch {
    throw new Error('文件内容不是有效的 Base64 数据')
  }
  if (buf.length <= SALT_BYTES + IV_BYTES + TAG_BYTES) {
    throw new Error('文件内容不完整或已损坏')
  }
  const salt = buf.subarray(0, SALT_BYTES)
  const iv = buf.subarray(SALT_BYTES, SALT_BYTES + IV_BYTES)
  const tag = buf.subarray(SALT_BYTES + IV_BYTES, SALT_BYTES + IV_BYTES + TAG_BYTES)
  const data = buf.subarray(SALT_BYTES + IV_BYTES + TAG_BYTES)

  const key = crypto.scryptSync(PASSPHRASE, salt, 32)
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  const plain = Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')

  const manifest = JSON.parse(plain)
  if (!Array.isArray(manifest?.files)) {
    throw new Error('插件包清单缺少 files 字段')
  }
  return manifest
}
