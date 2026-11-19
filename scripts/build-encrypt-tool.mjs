/**
 * Build standalone .assterplugin encryption binaries:
 *   release/tools/asster-encrypt-macos-<arch>     (macOS, current arch)
 *   release/tools/asster-encrypt-windows-x64.exe  (Windows)
 *
 * Uses Node.js SEA: bundle CLI -> generate blob -> inject into Node binary.
 * macOS uses the local Node binary; Windows downloads the official node.exe
 * matching the local Node version (cached under build/cache/).
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import https from 'node:https'
import path from 'node:path'
import { createRequire } from 'node:module'

const require_ = createRequire(import.meta.url)
const root = path.resolve(import.meta.dirname, '..')
const buildDir = path.join(root, 'build')
const outDir = path.join(root, 'release', 'tools')
const BLOB_RESOURCE = 'NODE_SEA_BLOB'
const SENTINEL = 'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2'

function run(cmd, args) {
  execFileSync(cmd, args, { stdio: 'inherit', cwd: root })
}

function download(url, dest, redirects = 3) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirects > 0) {
          res.resume()
          download(res.headers.location, dest, redirects - 1).then(resolve, reject)
          return
        }
        if (res.statusCode !== 200) {
          reject(new Error(`下载失败：HTTP ${res.statusCode}（${url}）`))
          return
        }
        const file = fs.createWriteStream(dest)
        res.pipe(file)
        file.on('finish', () => file.close(resolve))
        file.on('error', reject)
      })
      .on('error', reject)
  })
}

async function main() {
  fs.mkdirSync(buildDir, { recursive: true })
  fs.mkdirSync(outDir, { recursive: true })
  fs.mkdirSync(path.join(buildDir, 'cache'), { recursive: true })

  console.log('[1/4] 打包 CLI（esbuild）')
  const esbuild = require_('esbuild')
  await esbuild.build({
    entryPoints: [path.join(root, 'scripts/sea/encrypt-cli.mjs')],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node20',
    outfile: path.join(buildDir, 'encrypt-cli.cjs'),
    logLevel: 'warning',
  })

  console.log('[2/4] 生成 SEA blob')
  fs.writeFileSync(
    path.join(buildDir, 'sea-config.json'),
    JSON.stringify(
      {
        main: 'build/encrypt-cli.cjs',
        output: 'build/encrypt-cli.blob',
        disableExperimentalSEAWarning: true,
      },
      null,
      2,
    ),
  )
  run(process.execPath, ['--experimental-sea-config', path.join(buildDir, 'sea-config.json')])
  const blob = fs.readFileSync(path.join(buildDir, 'encrypt-cli.blob'))

  const postject = require_('postject')
  const nodeVersion = process.versions.node

  /**
   * 准备目标平台的官方 Node 运行时（SEA blob 需要注入到官方发行版二进制，
   * 本地开发构建的 Node 可能包含多份 sentinel 导致注入失败）。
   */
  async function prepareNodeBinary(platform, arch) {
    const assetArch = platform === 'win32' ? 'win-x64' : `${platform}-${arch}`
    const ext = platform === 'win32' ? 'zip' : 'tar.gz'
    const cache = path.join(buildDir, 'cache', `node-${assetArch}-v${nodeVersion}.${ext}`)
    if (!fs.existsSync(cache)) {
      const url = `https://nodejs.org/dist/v${nodeVersion}/node-v${nodeVersion}-${assetArch}.${ext}`
      console.log(`  下载 Node 运行时：${url}`)
      await download(url, cache)
    }

    if (platform === 'win32') {
      // zip 内为 node-vX-win-x64/node.exe
      const dirName = `node-v${nodeVersion}-${assetArch}`
      const extractDir = path.join(buildDir, 'cache', dirName)
      const bin = path.join(extractDir, dirName, 'node.exe')
      if (!fs.existsSync(bin)) {
        fs.rmSync(extractDir, { recursive: true, force: true })
        fs.mkdirSync(extractDir, { recursive: true })
        run('unzip', ['-o', '-q', cache, '-d', extractDir])
      }
      return bin
    }

    const extractDir = cache.replace(/\.tar\.gz$/, '')
    if (!fs.existsSync(path.join(extractDir, 'bin/node'))) {
      fs.mkdirSync(extractDir, { recursive: true })
      run('tar', ['-xzf', cache, '-C', extractDir])
    }
    const bin = path.join(extractDir, `node-v${nodeVersion}-${platform}-${arch}`, 'bin/node')
    fs.chmodSync(bin, 0o755)
    return bin
  }

  const targets = []

  if (process.platform === 'darwin') {
    const dest = path.join(outDir, `demo资源加密-macos-${process.arch}`)
    const nodeBin = await prepareNodeBinary('darwin', process.arch)
    fs.copyFileSync(nodeBin, dest)
    targets.push({ dest, sign: true, machoSegmentName: true })
  } else {
    console.log('[!] 当前系统不是 macOS，跳过 macOS 目标（请在 macOS 上构建）')
  }

  {
    const dest = path.join(outDir, 'demo资源加密-windows-x64.exe')
    const nodeBin = await prepareNodeBinary('win32', 'x64')
    fs.copyFileSync(nodeBin, dest)
    targets.push({ dest, sign: false })
  }

  console.log('[4/4] 注入 SEA blob')
  for (const target of targets) {
    console.log(`  -> ${target.dest}`)
    try {
      await postject.inject(
        target.dest,
        BLOB_RESOURCE,
        blob,
        target.machoSegmentName
          ? { sentinelFuse: SENTINEL, machoSegmentName: 'NODE_SEA' }
          : { sentinelFuse: SENTINEL },
      )
    } catch (error) {
      console.error(`  注入失败：${error?.message ?? error}`)
      continue
    }
    if (target.sign && process.platform === 'darwin') {
      try {
        execFileSync('codesign', ['--sign', '-', '--force', target.dest], { stdio: 'pipe' })
      } catch (error) {
        console.warn(`[!] ad-hoc 签名失败（可忽略）：${error?.message ?? error}`)
      }
    }
    console.log(`  已生成 ${target.dest}`)
  }

  console.log('完成。输出目录：release/tools/')
}

main().catch((error) => {
  console.error('[build] 失败：', error?.message ?? error)
  process.exit(1)
})
