#!/usr/bin/env node
// 全路径自检：穷举 rounds 里的所有选项组合，验证
//  1. 每条路都通向结局或死法（无死循环、无死路）
//  2. 五个生存结局全部可达
//  3. rounds 内引用的死法/结局 id 都存在
// 用法：npm run check:paths
import { execSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const out = path.join(root, 'node_modules/.cache/script-check.cjs')
execSync(`npx esbuild src/game/script.ts --bundle --format=cjs --outfile=${out}`, { cwd: root, stdio: 'pipe' })
const require = createRequire(import.meta.url)
const { rounds, nextRoundId, resolveEnding, deaths, endings } = require(out)

const deathsOutsideRounds = new Set(['virus', 'slip', 'blackout']) // 邮箱病毒死 / P图关手滑死 / 未存档断电死（在 App.tsx 触发）
const errors = []
const reachedEndings = new Set()
const reachedDeaths = new Set()
const reachedRounds = new Set()

// 状态 = 回合 + 已用掉的 funnel 选项 + flags
const queue = [{ roundId: 'r1', used: [], flags: {} }]
const seen = new Set()
let steps = 0

while (queue.length) {
  const st = queue.shift()
  if (++steps > 5000) {
    errors.push('状态爆炸：疑似死循环')
    break
  }
  const key = `${st.roundId}|${st.used.sort().join(',')}|${Object.keys(st.flags).sort().join(',')}`
  if (seen.has(key)) continue
  seen.add(key)
  reachedRounds.add(st.roundId)

  const round = rounds[st.roundId]
  if (!round) {
    errors.push(`回合不存在：${st.roundId}`)
    continue
  }
  const options = round.options.filter((o) => !st.used.includes(o.id))
  if (options.length === 0) {
    errors.push(`死路：${st.roundId} 的选项全部用完仍无法推进`)
    continue
  }
  const hasProgress = options.some((o) => !o.funnel)
  if (!hasProgress) errors.push(`死路：${st.roundId} 剩余选项全是 funnel`)

  for (const opt of options) {
    const flags = opt.flags ? { ...st.flags, ...opt.flags } : st.flags
    if (opt.death) {
      if (!deaths[opt.death]) errors.push(`选项 ${st.roundId}/${opt.id} 引用了不存在的死法：${opt.death}`)
      reachedDeaths.add(opt.death)
      continue
    }
    if (opt.ending) {
      const eid = resolveEnding(opt.ending, flags)
      if (!endings[eid]) errors.push(`选项 ${st.roundId}/${opt.id} 解析出不存在的结局：${eid}`)
      reachedEndings.add(eid)
      continue
    }
    if (opt.funnel) {
      queue.push({ roundId: st.roundId, used: [...st.used, opt.id], flags })
      continue
    }
    const next = nextRoundId(st.roundId, opt.id)
    if (!next) {
      errors.push(`选项 ${st.roundId}/${opt.id} 既非结局/死法/funnel，也没有下一回合`)
      continue
    }
    queue.push({ roundId: next, used: [], flags })
  }
}

// 结局可达性
for (const eid of Object.keys(endings)) {
  if (!reachedEndings.has(eid)) errors.push(`结局不可达：${eid}`)
}
// 死法可达性（rounds 外的单独提示）
for (const did of Object.keys(deaths)) {
  if (!reachedDeaths.has(did) && !deathsOutsideRounds.has(did)) {
    errors.push(`死法不可达：${did}（既不在 rounds 里，也不在白名单里）`)
  }
}

console.log(`遍历状态 ${seen.size} 个，可达回合：${[...reachedRounds].join(' → ')}`)
console.log(`可达结局 ${reachedEndings.size}/${Object.keys(endings).length}：${[...reachedEndings].join(', ')}`)
console.log(`可达死法 ${reachedDeaths.size}（另有回合外：${[...deathsOutsideRounds].join(', ')}）`)
if (errors.length) {
  console.error('\n❌ 自检失败：')
  errors.forEach((e) => console.error(' - ' + e))
  process.exit(1)
}
console.log('\n✅ 全路径自检通过：所有路线都通向结局或死法，无死路。')
