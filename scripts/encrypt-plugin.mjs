#!/usr/bin/env node
/**
 * Encrypt a plugin source folder (agents/ + skills/) into a single
 * .assterplugin file that Demo Client can import.
 *
 * Usage:
 *   npm run encrypt -- <源文件夹> [-o 输出文件.assterplugin]
 */
import fs from 'node:fs'
import path from 'node:path'
import { encryptManifest } from '../shared/asster-crypto.mjs'

function fail(message) {
  console.error(`[encrypt] ${message}`)
  process.exit(1)
}

const args = process.argv.slice(2)
const folder = args.find((arg) => !arg.startsWith('-'))
const outputIndex = args.indexOf('-o')
const outputFile =
  outputIndex !== -1 ? args[outputIndex + 1] : undefined

if (!folder) {
  fail('用法：npm run encrypt -- <源文件夹> [-o 输出文件.assterplugin]')
}

const root = path.resolve(folder)
if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
  fail(`目录不存在：${root}`)
}

function walk(dir, base = '') {
  const files = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = base ? `${base}/${entry.name}` : entry.name
    if (entry.isDirectory()) {
      files.push(...walk(path.join(dir, entry.name), rel))
    } else if (entry.isFile()) {
      files.push(rel)
    }
  }
  return files
}

const files = walk(root).sort()
if (files.length === 0) {
  fail('目录为空，没有可打包的文件')
}

const manifest = {
  version: 1,
  generatedAt: new Date().toISOString(),
  files: files.map((rel) => ({
    path: rel,
    content: fs.readFileSync(path.join(root, rel), 'utf8'),
  })),
}

const defaultName = `${path.basename(root)}.assterplugin`
const output = path.resolve(outputFile ?? path.join(path.dirname(root), defaultName))

const encoded = encryptManifest(manifest)
fs.mkdirSync(path.dirname(output), { recursive: true })
fs.writeFileSync(output, encoded, 'utf8')

console.log('[encrypt] 打包完成')
console.log(`  源文件夹：${root}（${files.length} 个文件）`)
console.log(`  输出文件：${output}`)
console.log('  在 Demo Client 的「设置 → 插件 → 选择资源」中导入该文件即可。')
