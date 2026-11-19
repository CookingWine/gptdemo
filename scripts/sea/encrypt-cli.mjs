#!/usr/bin/env node
/**
 * Demo 资源加密 — SEA (Single Executable Application) 入口。
 * 经 esbuild 打包为 CJS 后注入 Node 运行时，生成独立可执行文件。
 *
 * 两种运行方式：
 *   1. 双击/无参数运行：弹出系统文件夹选择与保存对话框（免控制台）
 *   2. 带参数运行：命令行模式 encrypt <源文件夹> [-o 输出.assterplugin]
 *
 * macOS 使用系统 osascript，Windows 使用系统 PowerShell，均为内置组件。
 */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFile } from 'node:child_process'

const PROGRAM_NAME = 'demo资源加密'
const MAGIC = 'ASSTERPLUGIN1:'
const PASSPHRASE = process.env.ASSTERPLUGIN_KEY || 'assterplugin-default-key-v1'

// 自动化测试钩子：设置后跳过系统对话框
const TEST_FOLDER = process.env.ASSTERPLUGIN_TEST_FOLDER
const TEST_OUTPUT = process.env.ASSTERPLUGIN_TEST_OUT

function encryptManifest(manifest) {
  const salt = crypto.randomBytes(16)
  const key = crypto.scryptSync(PASSPHRASE, salt, 32)
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const data = Buffer.concat([cipher.update(JSON.stringify(manifest), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  const payload = Buffer.concat([salt, iv, tag, data]).toString('base64')
  return `${MAGIC}${payload}`
}

function fail(message) {
  console.error(`[${PROGRAM_NAME}] ${message}`)
  process.exit(1)
}

function execText(cmd, args) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { encoding: 'utf8', maxBuffer: 1024 * 1024 }, (error, stdout) => {
      if (error) reject(error)
      else resolve(String(stdout).trim())
    })
  })
}

function powershell(script) {
  // -EncodedCommand 使用 UTF-16LE Base64，规避中文与引号转义问题
  const encoded = Buffer.from(script, 'utf16le').toString('base64')
  return execText('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', encoded])
}

async function pickFolderGui() {
  if (process.platform === 'darwin') {
    const out = await execText('osascript', [
      '-e',
      'POSIX path of (choose folder with prompt "选择要加密的资源文件夹")',
    ])
    return out.replace(/\/+$/, '') || null
  }
  if (process.platform === 'win32') {
    const out = await powershell(
      [
        "Add-Type -AssemblyName System.Windows.Forms",
        "$f = New-Object System.Windows.Forms.FolderBrowserDialog",
        "$f.Description = '选择要加密的资源文件夹'",
        "if ($f.ShowDialog() -eq 'OK') { Write-Output $f.SelectedPath }",
      ].join('; '),
    )
    return out || null
  }
  fail('当前平台不支持图形界面，请使用命令行参数运行')
}

async function pickSaveGui(defaultName) {
  if (process.platform === 'darwin') {
    const out = await execText('osascript', [
      '-e',
      `POSIX path of (choose file name with prompt "保存加密资源文件" default name "${defaultName}")`,
    ])
    return out || null
  }
  if (process.platform === 'win32') {
    const out = await powershell(
      [
        "Add-Type -AssemblyName System.Windows.Forms",
        "$s = New-Object System.Windows.Forms.SaveFileDialog",
        "$s.Title = '保存加密资源文件'",
        "$s.Filter = 'Asster 插件资源 (*.assterplugin)|*.assterplugin'",
        "$s.FileName = '" + defaultName.replace(/'/g, "''") + "'",
        "if ($s.ShowDialog() -eq 'OK') { Write-Output $s.FileName }",
      ].join('; '),
    )
    return out || null
  }
  fail('当前平台不支持图形界面，请使用命令行参数运行')
}

async function alertGui(message, isError) {
  try {
    if (process.platform === 'darwin') {
      const tone = isError ? 'critical' : 'informational'
      await execText('osascript', [
        '-e',
        `display alert "${PROGRAM_NAME}" message "${message.replace(/"/g, "'")}" as ${tone}`,
      ])
    } else if (process.platform === 'win32') {
      const icon = isError ? 'Error' : 'Information'
      await powershell(
        [
          "Add-Type -AssemblyName System.Windows.Forms",
          `[System.Windows.Forms.MessageBox]::Show('${message.replace(/'/g, "''")}', '${PROGRAM_NAME}', 'OK', '${icon}')`,
        ].join('; '),
      )
    }
  } catch {
    // 提示框失败不影响结果
  }
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

function encryptFolder(root, output) {
  const files = walk(root).sort()
  if (files.length === 0) fail('目录为空，没有可打包的文件')

  const manifest = {
    version: 1,
    generatedAt: new Date().toISOString(),
    files: files.map((rel) => ({
      path: rel,
      content: fs.readFileSync(path.join(root, rel), 'utf8'),
    })),
  }

  fs.mkdirSync(path.dirname(output), { recursive: true })
  fs.writeFileSync(output, encryptManifest(manifest), 'utf8')
  return { output, count: files.length }
}

function ensureExtension(output) {
  return output.toLowerCase().endsWith('.assterplugin')
    ? output
    : `${output}.assterplugin`
}

async function guiFlow() {
  const folder = TEST_FOLDER ?? (await pickFolderGui())
  if (!folder) process.exit(0) // 用户取消，静默退出

  if (!fs.existsSync(folder) || !fs.statSync(folder).isDirectory()) {
    await alertGui(`目录不存在：${folder}`, true)
    process.exit(1)
  }

  const defaultName = `${path.basename(folder)}.assterplugin`
  const picked = TEST_OUTPUT ?? (await pickSaveGui(defaultName))
  if (!picked) process.exit(0) // 用户取消，静默退出

  const output = ensureExtension(picked)

  try {
    const { output: out, count } = encryptFolder(path.resolve(folder), path.resolve(output))
    if (TEST_OUTPUT) {
      console.log(`[demo资源加密] 完成：${out}（${count} 个文件）`)
    } else {
      await alertGui(`打包完成（${count} 个文件）：\n${out}`, false)
    }
  } catch (error) {
    const message = error?.message ?? String(error)
    if (TEST_OUTPUT) console.error(`[${PROGRAM_NAME}] ${message}`)
    await alertGui(message, true)
    process.exit(1)
  }
}

function consoleFlow() {
  const folder = args.find((arg) => !arg.startsWith('-'))
  const outputIndex = args.indexOf('-o')
  const outputFile = outputIndex !== -1 ? args[outputIndex + 1] : undefined

  if (!folder) {
    fail(`用法：${PROGRAM_NAME} <源文件夹> [-o 输出文件.assterplugin]`)
  }

  const root = path.resolve(folder)
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    fail(`目录不存在：${root}`)
  }

  const defaultName = `${path.basename(root)}.assterplugin`
  const output = path.resolve(outputFile ?? path.join(path.dirname(root), defaultName))

  const { output: out, count } = encryptFolder(root, output)
  console.log(`[${PROGRAM_NAME}] 打包完成`)
  console.log(`  源文件夹：${root}（${count} 个文件）`)
  console.log(`  输出文件：${out}`)
  console.log('  在 Demo Client 的「设置 → 插件 → 选择资源」中导入该文件即可。')
}

const args = process.argv.slice(2)

async function main() {
  if (args.length === 0 || args.includes('--gui')) {
    await guiFlow()
  } else {
    consoleFlow()
  }
}

main()
