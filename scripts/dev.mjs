import { spawn } from 'node:child_process'
import { randomBytes, createHash } from 'node:crypto'
import { readFile, writeFile, access } from 'node:fs/promises'
import { createServer } from 'node:net'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseEnv } from 'node:util'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const npmCli = process.env.npm_execpath
const children = new Set()
const processGroups = new Set()
let stopping = false

async function exists(path) {
  try { await access(path); return true } catch (error) {
    if (error.code !== 'ENOENT') throw error
    return false
  }
}

function npm(args, folder, service = false) {
  const child = spawn(process.execPath, [npmCli, ...args], {
    cwd: join(root, folder), stdio: 'inherit', windowsHide: true,
    detached: service && process.platform !== 'win32',
  })
  children.add(child)
  if (service && process.platform !== 'win32') processGroups.add(child)
  child.once('exit', code => {
    children.delete(child)
    processGroups.delete(child)
    if (service && !stopping) {
      console.error(`${folder} stopped. Stopping the other development server.`)
      void stop(code || 1)
    }
  })
  return new Promise((resolveRun, reject) => {
    child.once('error', reject)
    child.once('exit', code => code === 0 ? resolveRun() : reject(new Error(`${folder}: npm ${args.join(' ')} failed.`)))
  })
}

async function stop(code = 0) {
  if (stopping) return
  stopping = true
  console.info('\nStopping development servers. PostgreSQL remains available; use npm run db:down to stop it.')
  await Promise.all([...children].map(child => new Promise(resolveStopped => {
    if (!child.pid || child.exitCode !== null) return resolveStopped()
    if (process.platform === 'win32') {
      // npm and tsx/Vite create descendants: terminate the complete tree, not just npm.
      const killer = spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore', windowsHide: true })
      killer.once('exit', resolveStopped)
      killer.once('error', resolveStopped)
    } else {
      child.once('exit', resolveStopped)
      if (processGroups.has(child)) process.kill(-child.pid, 'SIGTERM')
      else child.kill('SIGTERM')
    }
  })))
  process.exit(code)
}

process.once('SIGINT', () => void stop())
process.once('SIGTERM', () => void stop())

async function configureEnvironment() {
  const backend = join(root, 'back', '.env')
  if (!await exists(backend)) {
    await writeFile(backend, await readFile(join(root, 'back', '.env.example'), 'utf8'), { flag: 'wx' })
    console.info('Created back/.env from the local development example.')
  }
  let source = await readFile(backend, 'utf8')
  if (!parseEnv(source).AUTH_JWT_SECRET?.trim() && !process.env.AUTH_JWT_SECRET) {
    const setting = `AUTH_JWT_SECRET=${randomBytes(32).toString('hex')}`
    source = /^AUTH_JWT_SECRET\s*=/m.test(source)
      ? source.replace(/^AUTH_JWT_SECRET\s*=.*$/m, setting)
      : `${source.trimEnd()}\n${setting}\n`
    await writeFile(backend, source)
    console.info('Generated a private local JWT signing key in back/.env.')
  }
  const environment = { ...parseEnv(source), ...process.env }
  const frontendUrl = new URL(environment.FRONTEND_ORIGIN || 'http://localhost:5173')
  if (frontendUrl.protocol !== 'http:' || !['localhost', '127.0.0.1', '[::1]'].includes(frontendUrl.hostname)) {
    throw new Error('The combined local launcher needs an HTTP FRONTEND_ORIGIN on localhost. Use the separate application commands for other environments.')
  }
  const apiHost = environment.HOST || '127.0.0.1'
  const apiUrl = new URL(`http://${apiHost === '0.0.0.0' || apiHost === '::' ? '127.0.0.1' : apiHost}:${environment.PORT || 3000}`)
  const frontend = join(root, 'front', '.env.local')
  if (!await exists(frontend)) {
    await writeFile(frontend, `# Local development API origin.\nVITE_API_URL=${apiUrl.origin}\n`, { flag: 'wx' })
    console.info('Created front/.env.local.')
  }
  return { apiUrl, frontendUrl, pgwebPort: environment.PGWEB_PORT || '8081' }
}

async function install(folder) {
  const directory = join(root, folder)
  const fingerprint = createHash('sha256')
    .update(await readFile(join(directory, 'package-lock.json')))
    .update(await readFile(join(directory, 'package.json')))
    .update(`${process.platform}:${process.arch}:${process.versions.node.split('.')[0]}`).digest('hex')
  const stamp = join(directory, 'node_modules', '.mealplanner-install')
  if (await exists(stamp) && (await readFile(stamp, 'utf8')) === fingerprint) return
  console.info(`Installing locked ${folder} dependencies...`)
  await npm(['ci'], folder)
  await writeFile(stamp, fingerprint)
}

async function available(url) {
  const host = url.hostname.replace(/^\[|\]$/g, '')
  const port = Number(url.port || 80)
  await new Promise((resolveAvailable, reject) => {
    const probe = createServer()
    probe.once('error', () => reject(new Error(`${url.origin} is already in use. Stop its existing server before running npm run dev.`)))
    probe.listen(port, host, () => probe.close(resolveAvailable))
  })
}

async function waitUntilReady(url) {
  const deadline = Date.now() + 30_000
  while (!stopping && Date.now() < deadline) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1000) })
      if (response.ok) return
    } catch { /* A development server may still be compiling or binding its port. */ }
    await new Promise(resolveWait => setTimeout(resolveWait, 300))
  }
  throw new Error(`${url} did not become ready within 30 seconds.`)
}

async function main() {
  if (Number(process.versions.node.split('.')[0]) < 22) throw new Error('Node.js 22 is required. Run nvm use 22, then npm run dev again.')
  if (!npmCli) throw new Error('Run this launcher with npm run dev or npm run setup.')
  const { apiUrl, frontendUrl, pgwebPort } = await configureEnvironment()
  await install('back')
  await install('front')
  console.info('Starting PostgreSQL and pgweb. Docker Desktop must be running.')
  await npm(['run', 'db:up'], 'back')
  await npm(['run', 'db:migrate'], 'back')
  if (process.argv.includes('--setup-only')) {
    console.info('Setup complete. Run npm run dev from the repository root.')
    return
  }
  await available(apiUrl)
  await available(frontendUrl)
  void npm(['run', 'dev'], 'back', true).catch(error => { if (!stopping) { console.error(error.message); void stop(1) } })
  void npm(['run', 'dev', '--', '--host', frontendUrl.hostname.replace(/^\[|\]$/g, ''), '--port', frontendUrl.port || '80', '--strictPort'], 'front', true)
    .catch(error => { if (!stopping) { console.error(error.message); void stop(1) } })
  await Promise.all([waitUntilReady(new URL('/ready', apiUrl)), waitUntilReady(frontendUrl)])
  console.info(`\nMealPlanner is ready: ${frontendUrl.origin}\nAPI: ${apiUrl.origin}\nDatabase browser: http://localhost:${pgwebPort}\nPress Ctrl+C to stop both development servers.`)
}

void main().catch(async error => { console.error(error.message); await stop(1) })
