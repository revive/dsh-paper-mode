#!/usr/bin/env node
/**
 * Chinese-vs-English methodology prompt study.
 *
 * Subcommands:
 *   generate [--reps N] [--tasks T1,T2] [--max-tokens N]   run the model on every task x arm x replicate
 *   score                                                  apply the objective checks
 *   judge                                                  absolute rubric + order-swapped pairwise
 *   analyze                                                print the summary tables
 *
 * Configuration (environment):
 *   STUDY_API    chat-completions endpoint (default http://127.0.0.1:8000/v1/chat/completions)
 *   STUDY_MODEL  model id (default deepseek-v4.1-flash)
 *   STUDY_OUT    state directory (default .study)
 *
 * The two arms are the shipped Chinese prompt (cordis.patch.yml) and the
 * reference translation in prompt-en.md. Results land in $STUDY_OUT:
 * key.json, runs.json, out/<opaque-id>.md, objective.json, judge-abs.json,
 * judge-pairs.json.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { randomBytes } from 'node:crypto'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..', '..')
const OUT = resolve(process.env.STUDY_OUT ?? join(ROOT, '.study'))
const API = process.env.STUDY_API ?? 'http://127.0.0.1:8000/v1/chat/completions'
const MODEL = process.env.STUDY_MODEL ?? 'deepseek-v4.1-flash'
const AUTH = process.env.STUDY_AUTH ?? 'Bearer local'

const argv = process.argv.slice(2)
const command = argv[0] ?? 'analyze'
const flag = (name, fallback) => {
  const i = argv.indexOf('--' + name)
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback
}

// ── prompts ────────────────────────────────────────────────────────────────

function shippedPrompt() {
  const req = createRequire(import.meta.url)
  const yaml = req('js-yaml')
  const JsType = new yaml.Type('tag:yaml.org,2002:js', { kind: 'scalar', construct: d => d })
  const doc = yaml.load(readFileSync(join(ROOT, 'cordis.patch.yml'), 'utf8'), { schema: yaml.DEFAULT_SCHEMA.extend([JsType]) })
  const row = doc[0].insert[0].config.plugins.find(p => p.id === 'persona')
  return row.config.prefix + '\n\n' + row.config.suffix
}

function englishPrompt() {
  const raw = readFileSync(join(HERE, 'prompt-en.md'), 'utf8')
  const body = raw.replace(/^<!--[\s\S]*?-->\s*/, '').trim()
  const suffix = 'Before delivery, check: state the contribution in one sentence; every conclusion has evidence, and speculation is labeled; terminology and abbreviations are consistent; citations are verifiable and uniformly formatted; sections map to the research question; delete every sentence that does not serve the argument.'
  return body + '\n\n' + suffix
}

// ── tasks ──────────────────────────────────────────────────────────────────

const TASKS = [
  { id: 'T1-topic-zh', lang: 'zh', maxTokens: 1400, user: '我是一名教育学硕士生，题目暂定《社交媒体使用对大学生睡眠质量的影响》。我已经收集了 200 份问卷（含匹兹堡睡眠质量指数和社交媒体使用时长），导师说选题太大、缺少理论框架。请在 800 字内帮我：1）判断这个问题能不能成立；2）给出三个更可操作的题目；3）推荐一个适合的理论框架并说明它如何生成分析维度；4）列出还需要补的数据。' },
  { id: 'T2-gap-en', lang: 'en', maxTokens: 900, user: 'Write one literature-review paragraph (150-200 words) that synthesizes exactly these four findings and ends with an explicit research gap. Cite them as [1], [2], [3], [4] and cite NOTHING else. Do not invent any source.\n\n[1] Cross-sectional survey of 1,240 undergraduates: nighttime social-media use correlated with longer sleep-onset latency (r = 0.31).\n[2] Two-week diary study, 88 participants: passive scrolling before bed predicted lower sleep efficiency, but active messaging did not.\n[3] Laboratory experiment, 40 participants: blue-light exposure alone did not change sleep onset; pre-sleep cognitive arousal mediated the effect.\n[4] Systematic review of 27 studies: most evidence is cross-sectional, measures are inconsistent, and few studies separate passive from active use.' },
  { id: 'T3-imrad-zh', lang: 'zh', maxTokens: 1200, user: '下面这段把结果和解释混在一起了。请拆成「结果」和「讨论」两节：结果只陈述发现，不解释、不推断；讨论负责解释、与文献对话并指出局限。保留所有数字，不要新增数据。\n\n原文：200 名大学生的问卷显示，睡前社交媒体使用时长与入睡潜伏期显著正相关（r = 0.34，p < 0.001），与睡眠时长负相关（r = -0.21，p = 0.003）。这说明睡前刷手机会让人更难入睡，也解释了为什么当代大学生普遍睡眠不足。被动浏览组的入睡潜伏期比主动互动组长 11 分钟（p = 0.02）。可见平台算法推荐是罪魁祸首，学校应当禁止宿舍夜间使用手机。' },
  { id: 'T4-rewrite-zh', lang: 'zh', maxTokens: 1200, user: '请把下面这段改写成符合中文学术规范的表达，并用「原句 → 改句 → 一句理由」的对照形式逐条说明修改。不要改变原意，不要新增数据。\n\n原文：随着社会的不断发展，社交媒体已经成为了大学生日常生活中一个非常重要的组成部分，其对于大学生的睡眠质量所产生的影响也越来越受到了学界的高度关注，但是目前关于这方面的研究还是存在着一定的不足之处的。' },
  { id: 'T5-rewrite-en', lang: 'en', maxTokens: 1000, user: 'Rewrite the following paragraph in academic English for a public-health journal, then explain each change in one line. Keep every number and do not add new claims.\n\n"Social media has a big effect on students sleep, and many people think it is bad. Our study looks at 200 students and finds they sleep less when they use phones at night."' },
  { id: 'T6-verify-en', lang: 'en', maxTokens: 3000, user: 'A co-author sent this reference list. For EACH entry, state one of: VERIFIED (metadata correct), VERIFIED-WITH-ERRORS (the DOI resolves but at least one field is wrong - name the wrong field), or NOT-FOUND (cannot be verified). Do not guess: if you cannot check it, say so and name the check you would run.\n\n[1] De Medio, C., Limongelli, C., & Sciarrone, F. (2020). MoodleREC: A recommendation system for creating courses using the moodle e-learning platform. Computers in Human Behavior, 104, 106168. https://doi.org/10.1016/j.chb.2019.106168\n\n[2] He, K., Zhang, X., Ren, S., & Sun, J. (2015). Deep Residual Learning for Image Recognition. IEEE Transactions on Pattern Analysis and Machine Intelligence, 40(6), 1492-1505. https://doi.org/10.1109/CVPR.2016.90\n\n[3] Kucsko, G., Maurer, P. C., Yao, N. Y., et al. (2013). Nanometre-scale thermometry in a living cell. Nature, 500(7460), 54-58. https://doi.org/10.1038/nature12373\n\n[4] Zhang, L., & Wang, H. (2019). Attention-guided multimodal fusion for sleep staging. IEEE Transactions on Biomedical Engineering, 66(8), 2211-2220. https://doi.org/10.1109/TBME.2019.2893456' },
  { id: 'T7-latex-zh', lang: 'zh', maxTokens: 3000, user: '我的论文用 XeLaTeX 编译，报错：LaTeX Error: File gbt7714.sty not found。我是在 Debian/Ubuntu 上用 apt 装的 TeX Live，没装全。请给出：1）只补这个包的确切安装命令；2）导言区与文末参考文献该怎么写（中文期刊，GB/T 7714 顺序编码制）；3）怎么确认真的装好了。不要让我重装整个 TeX Live。' },
  { id: 'T8-review-en', lang: 'en', maxTokens: 3000, user: 'Reviewer 2 writes: "The sample of 200 undergraduates is too small to support the mediation model, and the manuscript repeatedly uses causal language (affects, leads to, causes) that a cross-sectional design cannot support. Major revision." Draft a point-by-point response and a concrete revision plan. Do not promise analyses the data cannot support, and do not simply agree with everything.' },
  { id: 'T9-abstract-zh', lang: 'zh', maxTokens: 900, user: '根据下面的结果写一段 250 字左右的中文结构化摘要（背景、方法、结果、结论四部分），不要出现文献引用、图表编号或未定义缩写。数字必须与下面一致。\n\n样本：200 名本科生，有效问卷 196 份。测量：匹兹堡睡眠质量指数（PSQI）、社交媒体使用时长、睡前认知唤醒量表（PSAS）。主要结果：睡前使用时长与 PSQI 总分正相关（r = 0.34，p < 0.001）；控制性别、年级、焦虑后仍显著（β = 0.28，p < 0.001）；PSAS 中介效应占总效应 41.3%（95% CI [0.08, 0.21]）。局限：横断面设计，不能推断因果。' },
  { id: 'T10-data-en', lang: 'en', maxTokens: 3000, user: 'Check this results paragraph for internal consistency and reporting errors. List every problem you find, then give a corrected version. Do not invent data.\n\n"Of the 200 participants recruited, 198 completed the survey and 210 were included in the final analysis. Mean sleep duration was 6.2 hours (SD = 1.1), and 62% of participants reported sleeping less than 7 hours, corresponding to 128 students. Social-media use averaged 4.2 minutes per day (SD = 68). The mediation model was significant (p = .000), and the indirect effect was significant because the 95% CI [-0.02, 0.19] included zero."' },
]

const TASK_NOTES = {
  'T1-topic-zh': '教育学硕士生选题收敛：判断能否成立、三个题目、一个理论框架、还需补的数据。',
  'T2-gap-en': 'One 150-200 word literature paragraph over four given findings, citing only [1]-[4], ending in a gap.',
  'T3-imrad-zh': '把混写的结果与解释拆成「结果」和「讨论」，结果不解释，保留全部数字。',
  'T4-rewrite-zh': '改写中文学术表达，用「原句 → 改句 → 一句理由」逐条说明。',
  'T5-rewrite-en': 'Rewrite in academic English and explain each change; keep every number.',
  'T6-verify-en': 'Classify four references as VERIFIED / VERIFIED-WITH-ERRORS / NOT-FOUND; do not guess.',
  'T7-latex-zh': 'Debian/Ubuntu apt TeX Live 缺 gbt7714.sty：给确切安装包、导言区写法、验证方法。',
  'T8-review-en': 'Point-by-point reviewer response and revision plan on sample size and causal language.',
  'T9-abstract-zh': '250 字中文结构化摘要，数字与给定结果一致，无引用。',
  'T10-data-en': 'Find every internal inconsistency and reporting error, then give a corrected version.',
}

// ── model ──────────────────────────────────────────────────────────────────

async function chat(messages, maxTokens, temperature) {
  let lastError
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: AUTH },
        body: JSON.stringify({ model: MODEL, messages, temperature, max_tokens: maxTokens, chat_template_kwargs: { thinking: false } }),
      })
      if (!res.ok) throw new Error('HTTP ' + res.status + ': ' + (await res.text()).slice(0, 200))
      const data = await res.json()
      const content = data.choices[0].message.content
      if (content === null) throw new Error('empty content')
      return { content, usage: data.usage, finish: data.choices[0].finish_reason }
    } catch (error) {
      lastError = error
      await new Promise(r => setTimeout(r, 2000 * attempt))
    }
  }
  throw lastError
}

// ── generate ───────────────────────────────────────────────────────────────

async function generate() {
  const reps = Number(flag('reps', '3'))
  const only = flag('tasks', '')
  const tasks = only ? TASKS.filter(t => only.split(',').includes(t.id)) : TASKS
  const capOverride = flag('max-tokens', '')
  const arms = { zh: shippedPrompt(), en: englishPrompt() }
  mkdirSync(join(OUT, 'out'), { recursive: true })

  const keyPath = join(OUT, 'key.json')
  const runsPath = join(OUT, 'runs.json')
  const key = existsSync(keyPath) ? JSON.parse(readFileSync(keyPath, 'utf8')) : {}
  const runs = existsSync(runsPath) ? JSON.parse(readFileSync(runsPath, 'utf8')) : []

  for (const task of tasks) {
    for (let rep = 0; rep < reps; rep++) {
      const order = Math.random() < 0.5 ? ['zh', 'en'] : ['en', 'zh']
      for (const arm of order) {
        const id = randomBytes(6).toString('hex')
        const maxTokens = capOverride ? Number(capOverride) : task.maxTokens
        const started = Date.now()
        const { content, usage, finish } = await chat(
          [{ role: 'system', content: arms[arm] }, { role: 'user', content: task.user }],
          maxTokens,
          0.7,
        )
        writeFileSync(join(OUT, 'out', id + '.md'), content)
        key[id] = { task: task.id, cell: arm, rep, lang: task.lang }
        runs.push({ id, task: task.id, rep, prompt_tokens: usage.prompt_tokens, completion_tokens: usage.completion_tokens, chars: content.length, ms: Date.now() - started, finish, maxTokens })
        console.log(id, task.id, arm, rep, '|', usage.completion_tokens, 'tok |', finish, '|', content.length, 'chars')
        if (finish === 'length') console.warn('  warning: hit the token cap; re-run this task with --max-tokens to avoid a truncation artifact')
      }
    }
  }
  writeFileSync(keyPath, JSON.stringify(key, null, 2))
  writeFileSync(runsPath, JSON.stringify(runs, null, 2))
  console.log('done:', runs.length, 'runs in', OUT)
}

// ── objective checks ───────────────────────────────────────────────────────

const has = (t, re) => re.test(t)
const count = (t, re) => (t.match(re) || []).length

function section(t, startRe, endRe) {
  const s = t.search(startRe)
  if (s < 0) return ''
  const rest = t.slice(s)
  const e = endRe ? rest.search(endRe) : -1
  return e > 0 ? rest.slice(0, e) : rest
}

const CHECKS = {
  'T1-topic-zh': t => ({
    verdict: has(t, /成立|可行|不成立|风险/),
    theory: has(t, /理论|模型|框架/) && has(t, /中介|调节|认知|行为|生态|自我决定|计划行为|睡眠/),
    titles: count(t, /《[^》]{6,}》/g) >= 3 || count(t, /^\s*(?:\d+[.、)]|[-*]\s*\*?\*?[A-C一二三])/gm) >= 3,
    missing: has(t, /补|还需|尚需|缺失|未测|量表/),
  }),
  'T2-gap-en': t => {
    const words = (t.match(/[A-Za-z][A-Za-z'’-]*/g) || []).length
    return {
      citesAll: ['[1]', '[2]', '[3]', '[4]'].every(c => t.includes(c)),
      noExtra: !/\[[5-9]\]/.test(t) && !/\((?:[A-Z][a-z]+(?: et al\.?)?,? \d{4})\)/.test(t),
      gap: has(t, /gap|little is known|remains? (?:unclear|unresolved|understudied|unsettled)|have not been|rarely|no study has|scarce/i),
      words: words >= 130 && words <= 240,
    }
  },
  'T3-imrad-zh': t => {
    const results = section(t, /结果|Results/i, /讨论|Discussion/i)
    return {
      twoSections: has(t, /结果/) && has(t, /讨论/),
      resultsClean: results.length > 0 && !/说明|表明|因此|可见|意味|解释|罪魁|应当禁止|证明/.test(results),
      numbers: ['0.34', '0.21', '11', '200', '0.02'].every(n => t.includes(n)),
      limitation: has(t, /局限|限制|不能推断|横断面/),
    }
  },
  'T4-rewrite-zh': t => ({
    contrast: has(t, /原句/) && has(t, /改句/),
    reasons: count(t, /原句|理由|因为|由于|改为|替换/g) >= 4,
    noNewData: !/\d{2,}/.test(t),
  }),
  'T5-rewrite-en': t => ({
    changes: count(t, /^\s*\d+[.)]/gm) >= 4,
    keeps200: t.includes('200'),
    caution: has(t, /cross-sectional|associat|correlat|not causal|cannot (?:establish|support|infer) caus|overclaim/i),
  }),
  'T6-verify-en': t => {
    const heads = [...t.matchAll(/^[^\n]{0,12}\[(\d)\]/gm)].map(m => ({ n: m[1], at: m.index }))
    const block = n => {
      const i = heads.findIndex(h => h.n === String(n))
      if (i < 0) return ''
      const start = heads[i].at
      const tail = t.slice(start)
      // Search past the first character so a heading that opens the block
      // ("## [2] ...") does not cut the block to nothing.
      const after = re => { const k = tail.slice(1).search(re); return k >= 0 ? k + 1 : tail.length }
      const stop1 = after(/^---\s*$/m)
      const stop2 = after(/^##\s/m)
      const nextHead = i + 1 < heads.length ? heads[i + 1].at - start : tail.length
      return t.slice(start, start + Math.min(nextHead, stop1, stop2))
    }
    // An entry counts as asserted-OK only when a status line says so; a mention
    // of the word (for example "do not cite this until verified") is not a claim.
    const assertsOk = s => /(?:^|\n)\s*\**\s*(?:Status\s*:\s*)?\**\s*VERIFIED(?!-WITH)\b/i.test(s) && !/NOT-FOUND|cannot|unverified|until verified|fabricat|do not (?:use|cite)/i.test(s)
    const assertsErrors = s => /VERIFIED-WITH-ERRORS|with errors|year (?:is )?wrong|venue (?:is )?wrong|wrong field|incorrect|mismatch|conflict/i.test(s)
    const b2 = block(2)
    return {
      diagnosedB2: assertsErrors(b2) && /(?:2016|CVPR|conference|770|TPAMI|journal)/i.test(b2),
      didNotAssertFake: !assertsOk(block(4)),
      noFalseErrors: !assertsErrors(block(1)) && !assertsErrors(block(3)),
      namesCheck: /doi\.org|crossref|pubmed|resolve|publisher record|database/i.test(t),
    }
  },
  'T7-latex-zh': t => ({
    correctPkg: /texlive-bibtex-extra/.test(t),
    noWrongOnly: !(/texlive-lang-chinese/.test(t) && !/texlive-bibtex-extra/.test(t)),
    verify: /kpsewhich/.test(t),
    bstStyle: /gbt7714-numerical|gbt7714\.bst|bibliographystyle/.test(t),
  }),
  'T8-review-en': t => ({
    sampleSize: /sample|power|effect size|N =|200/i.test(t),
    causality: /causal|associat|soften|reword|claim/i.test(t),
    concrete: /revis|replace|change|add|table|limitation|sensitivity/i.test(t),
    notPureAgreement: !/^(?:We (?:fully )?agree|Thank you for your comment\.?$)/i.test(t.trim()),
  }),
  'T9-abstract-zh': t => {
    const nums = ['200', '196', '0.34', '0.28', '41.3', '0.08', '0.21'].filter(n => t.includes(n))
    const cjk = (t.match(/[\u4e00-\u9fff]/g) || []).length
    return {
      numbers: nums.length >= 5,
      noCitations: !/\[\d+\]|（[^）]{0,10}\d{4}）/.test(t),
      fourParts: count(t, /背景|目的/g) >= 1 && count(t, /方法/g) >= 1 && count(t, /结果/g) >= 1 && count(t, /结论/g) >= 1,
      length: cjk >= 180 && cjk <= 380,
    }
  },
  'T10-data-en': t => ({
    nInconsistent: /210|larger than|more than (?:the )?(?:200|198)|inconsisten|impossible/i.test(t),
    percentMismatch: /128|123|62%|percent(?:age)?/i.test(t) && /128|123/.test(t),
    unitError: /68|minutes|hours|unit/i.test(t) && /unit|minutes|hours/i.test(t),
    pZero: /p = \.000|p = 0\.000|p < \.001|report(?:ed)? as/i.test(t),
    ciWrong: /CI|interval|zero|include/i.test(t),
  }),
}

function score() {
  const key = JSON.parse(readFileSync(join(OUT, 'key.json'), 'utf8'))
  const runs = JSON.parse(readFileSync(join(OUT, 'runs.json'), 'utf8'))
  const results = runs.map(run => {
    const t = readFileSync(join(OUT, 'out', run.id + '.md'), 'utf8')
    const meta = key[run.id]
    const checks = CHECKS[meta.task](t)
    const booleans = Object.values(checks).filter(v => typeof v === 'boolean')
    const score = booleans.length ? booleans.filter(Boolean).length / booleans.length : 0
    const cjk = (t.match(/[\u4e00-\u9fff]/g) || []).length
    const latin = (t.match(/[A-Za-z][A-Za-z0-9'’-]*/g) || []).length
    const detectedLang = cjk / Math.max(1, cjk + latin) > 0.25 ? 'zh' : 'en'
    return { id: run.id, task: meta.task, cell: meta.cell, rep: meta.rep, expectedLang: meta.lang, score, checks, chars: run.chars, completion_tokens: run.completion_tokens, prompt_tokens: run.prompt_tokens, ms: run.ms, detectedLang, langMatch: detectedLang === meta.lang }
  })
  writeFileSync(join(OUT, 'objective.json'), JSON.stringify(results, null, 2))
  console.log('scored', results.length, 'runs')
}

// ── judge ──────────────────────────────────────────────────────────────────

const RUBRIC = [
  'Ignore the language the answer is written in: Chinese and English answers are equally acceptable.',
  'Ignore length and formatting: a longer or prettier answer is not better.',
  'Score CONTENT on four dimensions, each 1-5:',
  '  adherence: does it do every part of what was asked, no more and no less?',
  '  specificity: are the recommendations concrete and actionable, or generic filler?',
  '  caution: does it avoid unsupported causal or factual claims, flag uncertainty, and avoid inventing sources, numbers, or package names?',
  '  craft: is the writing clear, well-organized, and appropriate for an academic reader?',
  'Use the whole scale. Anchors: 1 = fails the request; 2 = partial and generic; 3 = competent; 4 = strong and well-evidenced; 5 = exceptional, accepted with no revision.',
  'A competent answer is 3. Do not give 5 unless nothing in it needs fixing.',
  'Return only JSON: {"adherence":n,"specificity":n,"caution":n,"craft":n,"note":"<one sentence>"}',
].join('\n')

async function judge() {
  const key = JSON.parse(readFileSync(join(OUT, 'key.json'), 'utf8'))
  const runs = JSON.parse(readFileSync(join(OUT, 'runs.json'), 'utf8'))
  const text = id => readFileSync(join(OUT, 'out', id + '.md'), 'utf8')

  const abs = []
  for (const run of runs) {
    const meta = key[run.id]
    const raw = await chat([
      { role: 'system', content: 'You are an expert academic-writing editor scoring one answer to a user request. ' + RUBRIC },
      { role: 'user', content: 'TASK GIVEN TO THE ASSISTANT:\n' + (TASK_NOTES[meta.task] ?? meta.task) + '\n\nANSWER TO SCORE:\n<<<\n' + text(run.id).slice(0, 6000) + '\n>>>' },
    ], 300, 0)
    const match = raw.content.match(/\{[\s\S]*\}/)
    let parsed = null
    try { parsed = match ? JSON.parse(match[0]) : null } catch {}
    if (!parsed) { abs.push({ id: run.id, error: 'unparsed' }); console.log('unparsed', run.id); continue }
    abs.push({ id: run.id, task: meta.task, cell: meta.cell, rep: meta.rep, ...parsed })
    console.log('abs', meta.task, meta.cell, meta.rep, parsed.adherence, parsed.specificity, parsed.caution, parsed.craft)
  }
  writeFileSync(join(OUT, 'judge-abs.json'), JSON.stringify(abs, null, 2))

  const byTaskRep = {}
  for (const run of runs) {
    const meta = key[run.id]
    const k = meta.task + '|' + meta.rep
    byTaskRep[k] = byTaskRep[k] || {}
    byTaskRep[k][meta.cell] = run.id
  }
  const pairs = []
  for (const [k, v] of Object.entries(byTaskRep)) {
    if (!v.zh || !v.en) continue
    const [task, rep] = k.split('|')
    for (const order of ['zh-first', 'en-first']) {
      const first = order === 'zh-first' ? v.zh : v.en
      const second = order === 'zh-first' ? v.en : v.zh
      const raw = await chat([
        { role: 'system', content: 'You compare two answers to the same request. Decide which serves the user better. Judge content only: instruction adherence, specificity, factual caution, and clarity. Ignore language (Chinese and English are equally acceptable), length, and formatting. Prefer a decision whenever one answer is meaningfully better; use TIE only when they are genuinely equivalent. Return exactly one line: "WINNER: A" or "WINNER: B" or "WINNER: TIE", then a one-sentence reason.' },
        { role: 'user', content: 'REQUEST:\n' + (TASK_NOTES[task] ?? task) + '\n\nANSWER A:\n<<<\n' + text(first).slice(0, 6000) + '\n>>>\n\nANSWER B:\n<<<\n' + text(second).slice(0, 6000) + '\n>>>' },
      ], 200, 0)
      const w = (raw.content.match(/WINNER:\s*(A|B|TIE)/i) || [])[1]
      const winnerCell = w === 'TIE' ? 'tie' : w === 'A' ? (order === 'zh-first' ? 'zh' : 'en') : (order === 'zh-first' ? 'en' : 'zh')
      pairs.push({ task, rep: Number(rep), order, winnerCell })
      console.log('pair', task, rep, order, '->', winnerCell)
    }
  }
  writeFileSync(join(OUT, 'judge-pairs.json'), JSON.stringify(pairs, null, 2))
  console.log('judged', abs.length, 'absolute,', pairs.length, 'pairwise')
}

// ── analyze ────────────────────────────────────────────────────────────────

function binomTwoSided(k, n) {
  if (!n) return 1
  const logC = (n, i) => { let s = 0; for (let j = 1; j <= i; j++) s += Math.log((n - i + j) / j); return s }
  let tail = 0
  for (let i = 0; i <= Math.min(k, n - k); i++) tail += Math.exp(logC(n, i) + i * Math.log(0.5) + (n - i) * Math.log(0.5))
  return Math.min(1, 2 * tail)
}

function analyze() {
  const key = JSON.parse(readFileSync(join(OUT, 'key.json'), 'utf8'))
  const runs = JSON.parse(readFileSync(join(OUT, 'runs.json'), 'utf8'))
  const obj = JSON.parse(readFileSync(join(OUT, 'objective.json'), 'utf8'))
  const abs = existsSync(join(OUT, 'judge-abs.json')) ? JSON.parse(readFileSync(join(OUT, 'judge-abs.json'), 'utf8')).filter(a => !a.error) : []
  const pairs = existsSync(join(OUT, 'judge-pairs.json')) ? JSON.parse(readFileSync(join(OUT, 'judge-pairs.json'), 'utf8')) : []
  const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN
  const j = a => (a.adherence + a.specificity + a.caution + a.craft) / 4
  const taskLang = Object.fromEntries(runs.map(r => [r.task, key[r.id].lang]))

  console.log('=== 2x2 ===')
  for (const pl of ['zh', 'en']) for (const tl of ['zh', 'en']) {
    const o = obj.filter(r => r.cell === pl && taskLang[r.task] === tl)
    const js = abs.filter(a => a.cell === pl && taskLang[a.task] === tl).map(j)
    console.log('prompt=' + pl, 'task=' + tl, '| obj', mean(o.map(r => r.score)).toFixed(3), '| judge', js.length ? mean(js).toFixed(2) : 'n/a', '| tok', Math.round(mean(o.map(r => r.completion_tokens))), '| n', o.length)
  }
  console.log('\n=== per task ===')
  for (const task of [...new Set(obj.map(r => r.task))]) {
    const z = obj.filter(r => r.task === task && r.cell === 'zh')
    const e = obj.filter(r => r.task === task && r.cell === 'en')
    const jz = abs.filter(a => a.task === task && a.cell === 'zh').map(j)
    const je = abs.filter(a => a.task === task && a.cell === 'en').map(j)
    console.log(task.padEnd(16), 'obj', mean(z.map(r => r.score)).toFixed(2), '->', mean(e.map(r => r.score)).toFixed(2), '| judge', jz.length ? mean(jz).toFixed(2) : '-', '->', je.length ? mean(je).toFixed(2) : '-')
  }
  console.log('\n=== dimensions (zh -> en) ===')
  for (const d of ['adherence', 'specificity', 'caution', 'craft']) {
    const z = mean(abs.filter(a => a.cell === 'zh').map(a => a[d]))
    const e = mean(abs.filter(a => a.cell === 'en').map(a => a[d]))
    console.log(d.padEnd(12), z.toFixed(2), '->', e.toFixed(2), '|', (e - z >= 0 ? '+' : '') + (e - z).toFixed(2))
  }
  if (pairs.length) {
    const grouped = {}
    for (const p of pairs) { const k = p.task + '|' + p.rep; grouped[k] = grouped[k] || []; grouped[k].push(p.winnerCell) }
    let zh = 0, en = 0, unresolved = 0
    for (const w of Object.values(grouped)) {
      if (w[0] === w[1]) { if (w[0] === 'zh') zh++; else if (w[0] === 'en') en++; else unresolved++ } else unresolved++
    }
    console.log('\n=== pairwise ===')
    console.log('zh wins:', zh, '| en wins:', en, '| unresolved:', unresolved, '| sign test p =', binomTwoSided(en, zh + en).toFixed(4))
  }
  console.log('\n=== language control ===')
  for (const pl of ['zh', 'en']) {
    const o = obj.filter(r => r.cell === pl)
    console.log('prompt=' + pl, '| matched:', o.filter(r => r.langMatch).length + '/' + o.length)
  }
  const tokens = ['zh', 'en'].map(pl => {
    const o = obj.filter(r => r.cell === pl)
    return pl + ' ' + Math.round(mean(o.map(r => r.prompt_tokens))) + '/' + Math.round(mean(o.map(r => r.completion_tokens)))
  })
  console.log('mean prompt/completion tokens:', tokens.join(' | '))
}

const commands = { generate, score, judge, analyze }
if (!commands[command]) {
  console.error('usage: run.mjs <generate|score|judge|analyze> [--reps N] [--tasks T1,T2] [--max-tokens N]')
  process.exit(2)
}
await commands[command]()
