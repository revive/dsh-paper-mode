#!/usr/bin/env node
// Validate the dsh-paper-mode bundle: manifest, patch, locales, docs, skills,
// workflows, and packed contents. Used by CI and by contributors before a release.
//
// Usage:
//   node scripts/check-bundle.mjs [--strict]
//
// With --strict, warnings become failures. Set DSH_PACKAGE_DIR to check the
// bundle against a specific DSH installation instead of an auto-detected one.

import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DEFAULT_SCHEMA, Type, load } from 'js-yaml'
import semver from 'semver'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const strict = process.argv.includes('--strict')
const errors = []
const warnings = []
let checked = 0

const fail = message => errors.push(message)
const warn = message => warnings.push(message)
const pass = message => {
  checked += 1
  console.log(`ok   ${message}`)
}
const read = path => readFileSync(join(root, path), 'utf8')
const exists = path => existsSync(join(root, path))

function parseYaml(text, label, extraSchema = []) {
  try {
    return load(text, { schema: DEFAULT_SCHEMA.extend(extraSchema) })
  } catch (error) {
    fail(`${label}: invalid YAML (${error.message})`)
    return undefined
  }
}

// ── package.json ────────────────────────────────────────────────────────────

let pkg
try {
  pkg = JSON.parse(read('package.json'))
  pass('package.json parses')
} catch (error) {
  fail(`package.json: ${error.message}`)
  process.exit(1)
}

if (typeof pkg.name === 'string' && /^[a-z0-9][a-z0-9._-]*$/.test(pkg.name)) pass(`package name ${pkg.name}`)
else fail('package.json: name must be a lowercase npm package name')

if (semver.valid(pkg.version)) pass(`version ${pkg.version}`)
else fail('package.json: version is not valid SemVer')

if (pkg.private === true) fail('package.json: private must be false or absent for a publishable bundle')
if (!pkg.description) fail('package.json: description is required')
if (!Array.isArray(pkg.keywords) || pkg.keywords.length < 5) fail('package.json: at least 5 keywords are expected')
if (!pkg.license) fail('package.json: license is required')
if (!pkg.repository?.url) fail('package.json: repository.url is required')
if (!pkg.bugs?.url) warn('package.json: bugs.url is missing')
if (!pkg.homepage) warn('package.json: homepage is missing')
if (pkg.publishConfig?.access !== 'public') warn('package.json: publishConfig.access should be "public"')

if (!pkg.dsh?.bundle?.patch) fail('package.json: dsh.bundle.patch is required')
else if (!exists(pkg.dsh.bundle.patch)) fail(`package.json: dsh.bundle.patch ${pkg.dsh.bundle.patch} does not exist`)
else pass(`bundle patch ${pkg.dsh.bundle.patch}`)

const dshRange = pkg.engines?.dsh
if (!dshRange || !semver.validRange(dshRange)) fail('package.json: engines.dsh must be a valid SemVer range')
else pass(`engines.dsh ${dshRange}`)

// ── patch ───────────────────────────────────────────────────────────────────

const JsType = new Type('tag:yaml.org,2002:js', {
  kind: 'scalar',
  construct: data => ({ js: data }),
})

const patchPath = pkg.dsh?.bundle?.patch ?? 'cordis.patch.yml'
const patch = exists(patchPath) ? parseYaml(read(patchPath), patchPath, [JsType]) : undefined
const presetRows = Array.isArray(patch)
  ? patch.flatMap(entry => (Array.isArray(entry?.insert) ? entry.insert : []))
  : []
const presets = presetRows.filter(row => row?.name === '@deepseek-ai/dsh-agent-preset')

if (presets.length !== 1) fail(`${patchPath}: exactly one @deepseek-ai/dsh-agent-preset row is expected, found ${presets.length}`)
else {
  const preset = presets[0]
  if (preset.id !== 'preset-paper') warn(`${patchPath}: preset row id is ${preset.id}, expected preset-paper`)
  if (preset.config?.id !== 'paper') fail(`${patchPath}: config.id must be "paper"`)
  else pass('preset id paper')
  if (!Array.isArray(preset.config?.plugins) || preset.config.plugins.length === 0) fail(`${patchPath}: config.plugins is empty`)
}

const plugins = presets[0]?.config?.plugins ?? []
const pluginNames = plugins.map(row => row?.name).filter(name => typeof name === 'string')
const persona = plugins.find(row => row?.id === 'persona')
if (typeof persona?.config?.prefix !== 'string' || persona.config.prefix.length < 500) fail(`${patchPath}: persona.prefix is missing or too short`)
else pass(`persona.prefix ${persona.config.prefix.length} chars`)
if (typeof persona?.config?.suffix !== 'string' || persona.config.suffix.length === 0) warn(`${patchPath}: persona.suffix is empty`)
if (/\{\{/.test(persona?.config?.prefix ?? '')) fail(`${patchPath}: persona.prefix contains double braces, which are parsed as prompt variables`)

const shellRows = plugins.filter(row => row?.id === 'tool-bash' || row?.id === 'tool-pwsh')
if (shellRows.length !== 2) fail(`${patchPath}: both tool-bash and tool-pwsh rows are expected`)
else {
  const bash = shellRows.find(row => row.id === 'tool-bash')
  const pwsh = shellRows.find(row => row.id === 'tool-pwsh')
  const isExpression = value => typeof value?.js === 'string'
  if (!isExpression(bash.disabled) || !isExpression(pwsh.disabled)) fail(`${patchPath}: shell rows must be platform-gated with !!js expressions`)
  else if (!bash.disabled.js.includes("'win32'") || !pwsh.disabled.js.includes("'win32'")) fail(`${patchPath}: shell rows must gate on process.platform === 'win32'`)
  else pass('shell rows are complementary on win32')
}

const skillRow = plugins.find(row => row?.id === 'skill-filesystem')
const skillDirs = skillRow?.config?.customSkillDirs
if (!Array.isArray(skillDirs) || skillDirs.length === 0) fail(`${patchPath}: skill-filesystem.customSkillDirs is not configured, so the bundled skill is not mounted`)
else if (!skillDirs.some(entry => typeof entry?.js === 'string' && entry.js.includes(pkg.name) && entry.js.includes("'skills'"))) {
  fail(`${patchPath}: customSkillDirs must resolve this package's skills/ directory (expected ${pkg.name} and 'skills')`)
} else pass('bundled skill directory is mounted')

// ── DSH compatibility and row resolution ────────────────────────────────────

function findDshDir() {
  const candidates = []
  if (process.env.DSH_PACKAGE_DIR) candidates.push(resolve(process.env.DSH_PACKAGE_DIR))
  try {
    candidates.push(dirname(createRequire(import.meta.url).resolve('@deepseek-ai/dsh/package.json')))
  } catch {}
  try {
    const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
    const globalRoot = execFileSync(npm, ['root', '-g'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
    candidates.push(join(globalRoot, '@deepseek-ai', 'dsh'))
  } catch {}
  return candidates.find(candidate => existsSync(join(candidate, 'package.json')))
}

const dshDir = findDshDir()
if (!dshDir) {
  warn('no DSH installation found; skipping plugin row resolution (set DSH_PACKAGE_DIR to enable it)')
} else {
  const dshPkg = JSON.parse(readFileSync(join(dshDir, 'package.json'), 'utf8'))
  if (dshRange && semver.validRange(dshRange)) {
    if (semver.satisfies(dshPkg.version, dshRange)) pass(`DSH ${dshPkg.version} satisfies ${dshRange}`)
    else fail(`installed DSH ${dshPkg.version} does not satisfy engines.dsh ${dshRange}`)
  }

  const dshRequire = createRequire(join(dshDir, 'package.json'))
  const standardNames = new Set()
  let standardPath
  try {
    standardPath = join(dirname(dshRequire.resolve('@deepseek-ai/dsh-web-app/package.json')), 'presets', 'standard.patch.yml')
  } catch {}
  if (standardPath !== undefined && existsSync(standardPath)) {
    const standard = load(readFileSync(standardPath, 'utf8'), { schema: DEFAULT_SCHEMA.extend([JsType]) })
    const collectNames = value => {
      if (Array.isArray(value)) {
        for (const item of value) collectNames(item)
      } else if (value !== null && typeof value === 'object') {
        if (typeof value.name === 'string') standardNames.add(value.name)
        for (const child of Object.values(value)) collectNames(child)
      }
    }
    collectNames(standard)
    pass(`standard preset rows: ${standardNames.size}`)
  } else {
    warn('shipped standard preset not found; skipping the row-set comparison')
  }

  for (const name of pluginNames) {
    if (name.startsWith('cordis:')) continue
    try {
      dshRequire.resolve(`${name}/package.json`)
      pass(`row resolves: ${name}`)
    } catch {
      fail(`row does not resolve in DSH ${dshPkg.version}: ${name}`)
    }
    if (standardNames.size > 0 && !standardNames.has(name)) {
      warn(`row ${name} is not part of the shipped standard preset; confirm it is still supported`)
    }
  }
}

// ── locales ─────────────────────────────────────────────────────────────────

const locales = { en: 'locale/en.json', zh: 'locale/zh.json' }
for (const [language, path] of Object.entries(locales)) {
  if (!exists(path)) {
    fail(`${path}: missing ${language} locale`)
    continue
  }
  let meta
  try {
    meta = JSON.parse(read(path))?.meta
  } catch (error) {
    fail(`${path}: invalid JSON (${error.message})`)
    continue
  }
  if (typeof meta?.title !== 'string' || meta.title.trim() === '') fail(`${path}: meta.title is required`)
  if (typeof meta?.description !== 'string' || meta.description.trim() === '') fail(`${path}: meta.description is required`)
  if (typeof meta?.detail !== 'string') fail(`${path}: meta.detail is required`)
  else if (!meta.detail.endsWith('.md')) fail(`${path}: meta.detail must name a Markdown file`)
  else if (!exists(meta.detail)) fail(`${path}: meta.detail ${meta.detail} does not exist`)
  else pass(`${language} locale -> ${meta.detail}`)
}

// ── docs ────────────────────────────────────────────────────────────────────

for (const path of ['docs/DETAIL.en.md', 'docs/DETAIL.zh.md', 'docs/DEPENDENCIES.md']) {
  if (!exists(path) || statSync(join(root, path)).size < 500) fail(`${path}: missing or suspiciously small`)
  else pass(`${path} present`)
}

const readme = read('README.md')
const readmeZh = exists('README.zh-CN.md') ? read('README.zh-CN.md') : undefined
if (!readme.includes('README.zh-CN.md')) fail('README.md must link to README.zh-CN.md')
else pass('README cross-links the Chinese README')
if (!readmeZh) fail('README.zh-CN.md is missing')
else if (!readmeZh.includes('README.md')) fail('README.zh-CN.md must link back to README.md')
else pass('Chinese README cross-links the English README')

// ── changelog ───────────────────────────────────────────────────────────────

if (!exists('CHANGELOG.md')) fail('CHANGELOG.md is missing')
else if (!read('CHANGELOG.md').includes(`## [${pkg.version}]`)) fail(`CHANGELOG.md has no section for ${pkg.version}`)
else pass(`CHANGELOG.md documents ${pkg.version}`)

// ── skills ──────────────────────────────────────────────────────────────────

const skillsDir = join(root, 'skills')
if (!existsSync(skillsDir)) fail('skills/ is missing')
else {
  const entries = readdirSync(skillsDir).filter(name => statSync(join(skillsDir, name)).isDirectory())
  if (entries.length === 0) fail('skills/: no skill directories')
  for (const name of entries) {
    const skillFile = join(skillsDir, name, 'SKILL.md')
    if (!existsSync(skillFile)) {
      fail(`skills/${name}/SKILL.md is missing`)
      continue
    }
    const text = readFileSync(skillFile, 'utf8')
    const frontmatter = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/)
    if (!frontmatter) {
      fail(`skills/${name}/SKILL.md: missing YAML frontmatter`)
      continue
    }
    const meta = parseYaml(frontmatter[1], `skills/${name}/SKILL.md frontmatter`)
    if (meta?.name !== name) fail(`skills/${name}/SKILL.md: frontmatter name must be ${name}`)
    else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(meta.name)) fail(`skills/${name}/SKILL.md: name must be kebab-case`)
    if (typeof meta?.description !== 'string' || meta.description.length < 20) fail(`skills/${name}/SKILL.md: description is missing or too short`)
    else pass(`skill ${name}`)

    for (const sub of ['references', 'scripts', 'templates']) {
      const subDir = join(skillsDir, name, sub)
      if (existsSync(subDir) && readdirSync(subDir).length === 0) warn(`skills/${name}/${sub}/ is empty`)
    }
  }

  const bashProbe = spawnSync('bash', ['-c', 'exit 0'])
  if (bashProbe.error) warn('bash is not available; skipping shell syntax checks')
  else {
    for (const name of entries) {
      const scriptsDir = join(skillsDir, name, 'scripts')
      if (!existsSync(scriptsDir)) continue
      for (const file of readdirSync(scriptsDir).filter(entry => entry.endsWith('.sh'))) {
        const path = join(scriptsDir, file)
        if (!readFileSync(path, 'utf8').startsWith('#!/usr/bin/env bash')) fail(`skills/${name}/scripts/${file}: missing bash shebang`)
        const result = spawnSync('bash', ['-n', path], { encoding: 'utf8' })
        if (result.status !== 0) fail(`skills/${name}/scripts/${file}: bash -n failed: ${result.stderr.trim()}`)
        else pass(`skill script syntax: ${name}/${file}`)
      }
    }
  }
}

// ── workflows and helper scripts ────────────────────────────────────────────

const workflowsDir = join(root, '.github', 'workflows')
if (!existsSync(workflowsDir)) fail('.github/workflows/ is missing')
else {
  for (const file of readdirSync(workflowsDir).filter(entry => entry.endsWith('.yml') || entry.endsWith('.yaml'))) {
    const parsed = parseYaml(readFileSync(join(workflowsDir, file), 'utf8'), `.github/workflows/${file}`)
    if (parsed && typeof parsed.jobs === 'object' && parsed.jobs !== null) pass(`workflow ${file}`)
    else fail(`.github/workflows/${file}: no jobs block`)
  }
}

const helperDir = join(root, '.github', 'scripts')
if (existsSync(helperDir)) {
  for (const file of readdirSync(helperDir).filter(entry => entry.endsWith('.sh'))) {
    const result = spawnSync('bash', ['-n', join(helperDir, file)], { encoding: 'utf8' })
    if (result.error) warn(`cannot syntax-check .github/scripts/${file}: bash unavailable`)
    else if (result.status !== 0) fail(`.github/scripts/${file}: bash -n failed: ${result.stderr.trim()}`)
    else pass(`helper script syntax: ${file}`)
  }
}

// ── line endings and tracked files ──────────────────────────────────────────

try {
  const tracked = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean)
  const textExtensions = new Set(['.md', '.json', '.yml', '.yaml', '.sh', '.mjs', '.js', '.tex', '.bib', '.svg', '.txt'])
  const crlf = tracked.filter(path => {
    const dot = path.lastIndexOf('.')
    const ext = dot === -1 ? '' : path.slice(dot)
    if (!textExtensions.has(ext) && !path.startsWith('.github/') && path !== '.gitattributes' && path !== '.gitignore') return false
    if (!existsSync(join(root, path))) return false
    return readFileSync(join(root, path), 'utf8').includes('\r\n')
  })
  if (crlf.length > 0) fail(`CRLF line endings in: ${crlf.slice(0, 5).join(', ')}${crlf.length > 5 ? '…' : ''}`)
  else pass('tracked text files use LF line endings')
} catch {
  warn('git is not available; skipping the LF line-ending check')
}

// ── packaged contents ───────────────────────────────────────────────────────

try {
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
  const output = execFileSync(npm, ['pack', '--dry-run', '--json', '--ignore-scripts'], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  const packed = JSON.parse(output)[0]
  const paths = new Set((packed.files ?? []).map(file => file.path))
  const required = [
    'package.json',
    'cordis.patch.yml',
    'locale/en.json',
    'locale/zh.json',
    'docs/DETAIL.en.md',
    'docs/DETAIL.zh.md',
    'docs/DEPENDENCIES.md',
    'README.md',
    'README.zh-CN.md',
    'CHANGELOG.md',
    'LICENSE',
    'icon.svg',
    'skills/latex-paper/SKILL.md',
    'skills/latex-paper/scripts/latex-doctor.sh',
    'skills/latex-paper/scripts/latex-build.sh',
    'skills/latex-paper/templates/latexmkrc',
  ]
  const missing = required.filter(path => !paths.has(path))
  if (missing.length > 0) fail(`packed tarball is missing: ${missing.join(', ')}`)
  else pass(`packed tarball contains ${paths.size} files, including the skill`)
  const leaked = [...paths].filter(path => path.startsWith('node_modules/') || path.startsWith('dist/'))
  if (leaked.length > 0) fail(`packed tarball contains build noise: ${leaked.slice(0, 5).join(', ')}`)
} catch (error) {
  warn(`could not run npm pack --dry-run (${error.message.split('\n')[0]})`)
}

// ── summary ─────────────────────────────────────────────────────────────────

for (const message of warnings) console.warn(`warn ${message}`)
for (const message of errors) console.error(`FAIL ${message}`)

if (errors.length > 0) {
  console.error(`\n${errors.length} error(s), ${warnings.length} warning(s)`)
  process.exit(1)
}
if (strict && warnings.length > 0) {
  console.error(`\n--strict: ${warnings.length} warning(s) treated as errors`)
  process.exit(1)
}
console.log(`\n${checked} checks passed, ${warnings.length} warning(s)`)
