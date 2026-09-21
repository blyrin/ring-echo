import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { Buffer } from 'node:buffer'
import { fileURLToPath } from 'node:url'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
export const tempDir = path.join(rootDir, '.local', 'tts-temp')
export const outDir = path.join(rootDir, 'public', 'audio', 'voice')
const publicDir = path.join(rootDir, 'public')

const fail = msg => {
  console.error(msg)
  process.exit(1)
}

const SAMPLE_MIME = { '.mp3': 'audio/mpeg', '.wav': 'audio/wav' }
const sampleCache = new Map()

export function getSampleBase64(who, sampleRef) {
  const cached = sampleCache.get(who)
  if (cached) return cached

  const mime = SAMPLE_MIME[path.extname(sampleRef).toLowerCase()]
  if (!mime) throw new Error(`音色样本格式不支持（仅 mp3/wav）：characters.${who}.voice = ${sampleRef}`)
  if (!sampleRef.startsWith('audio/') || path.isAbsolute(sampleRef) || sampleRef.includes('..')) {
    throw new Error(`音色样本路径非法：characters.${who}.voice = ${sampleRef}`)
  }

  const samplePath = path.join(publicDir, sampleRef)
  if (!fs.existsSync(samplePath) || fs.statSync(samplePath).size > 10 * 1024 * 1024) {
    throw new Error(`音色样本缺失或超过 10MB 上限：characters.${who}.voice = ${sampleRef}`)
  }

  const uri = `data:${mime};base64,${fs.readFileSync(samplePath).toString('base64')}`
  sampleCache.set(who, uri)
  return uri
}

const RETRY_LIMIT = 4

function collectLines() {
  const story = JSON.parse(fs.readFileSync(path.join(rootDir, 'src', 'assets', 'story.json'), 'utf8'))
  const byFile = new Map()

  for (const node of story.nodes) {
    if (node.t !== 'say' || !node.voice) continue
    const v = node.voice
    const file = path.basename(v.file)

    if (!new RegExp(`^${node.who}_\\d{4}\\.ogg$`).test(file) || v.file !== `audio/voice/${node.who}/${file}`) {
      fail(`非法配音文件路径：${v.file}`)
    }

    const text = node.text
    const existing = byFile.get(file)
    if (existing) {
      if (existing.text !== text || existing.scene !== v.scene) {
        fail(`配音文件 ${file} 在多个节点上定义不一致`)
      }
      continue
    }

    const voice = story.characters[node.who]?.voice
    if (!voice) fail(`缺少音色样本设定（characters.${node.who}.voice）：${node.who}`)
    if (!SAMPLE_MIME[path.extname(voice).toLowerCase()]) {
      fail(`characters.${node.who}.voice 必须是音频样本路径（mp3/wav），当前值：${voice.slice(0, 60)}`)
    }
    if (!v.scene) {
      fail(`缺少导演指令（scene）：${file} [${node.who}] ${node.text.slice(0, 20)}`)
    }

    byFile.set(file, {
      file,
      who: node.who,
      character: story.characters[node.who]?.name ?? node.who,
      sample: getSampleBase64(node.who, voice),
      text,
      scene: v.scene,
    })
  }
  return [...byFile.values()]
}

export function convertToOgg(src, dest) {
  execFileSync('ffmpeg', [
    '-y', '-v', 'error',
    '-i', src,
    '-map', '0:a:0', '-vn',
    '-c:a', 'libopus', '-b:a', '32k', '-ac', '1', '-ar', '24000',
    '-map_metadata', '-1', '-map_chapters', '-1',
    '-fflags', '+bitexact', '-flags:a', '+bitexact',
    dest,
  ])
}

export async function requestTts(line) {
  const apiKey = process.env.MIMO_API_KEY
  const res = await fetch('https://api.xiaomimimo.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'mimo-v2.5-tts-voiceclone',
      messages: [
        { role: 'user', content: `场景：\n${line.scene}。` },
        { role: 'assistant', content: line.text },
      ],
      audio: { format: 'wav', voice: line.sample },
    }),
    signal: AbortSignal.timeout(60000),
  })

  if (!res.ok) throw new Error(`HTTP ${res.status}：${(await res.text()).slice(0, 300)}`)

  const json = await res.json()
  const b64 = json.choices?.[0]?.message?.audio?.data
  if (!b64) throw new Error(`未返回音频数据：${JSON.stringify(json).slice(0, 300)}`)
  return Buffer.from(b64, 'base64')
}

const sleep = ms => new Promise(r => setTimeout(r, ms))

async function generateLine(line, forceAll) {
  const oggDir = path.join(outDir, line.who)
  fs.mkdirSync(oggDir, { recursive: true })
  const oggPath = path.join(oggDir, line.file)

  if (!forceAll && fs.existsSync(oggPath) && fs.statSync(oggPath).size > 1000) return 'skipped'

  for (let retry = 1; retry <= RETRY_LIMIT; retry++) {
    const tempWav = path.join(tempDir, `temp_${line.file.replace('.ogg', '')}_${Date.now()}.wav`)
    try {
      fs.writeFileSync(tempWav, await requestTts(line))
      convertToOgg(tempWav, oggPath)
      return 'generated'
    } catch (err) {
      if (retry === RETRY_LIMIT) {
        console.error(`  -> 失败 ${line.file} [${line.character}] ${line.text.slice(0, 20)}：${err.message}`)
        return 'failed'
      }
      await sleep(5000 * retry)
    } finally {
      fs.rmSync(tempWav, { force: true })
    }
  }
  return 'failed'
}

async function main() {
  fs.mkdirSync(tempDir, { recursive: true })
  fs.mkdirSync(outDir, { recursive: true })

  try {
    execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' })
  } catch {
    fail('错误：PATH 中未找到 ffmpeg，请确认已安装 ffmpeg。')
  }

  if (!process.env.MIMO_API_KEY) fail('错误：未设置环境变量 MIMO_API_KEY。')

  const forceAll = process.argv.includes('--force')
  const positional = process.argv.slice(2).filter(a => !a.startsWith('--'))

  const lines = collectLines()
  const speakers = [...new Set(lines.map(l => l.who))]
  const targets = positional.length > 0 ? lines.filter(l => positional.includes(l.who)) : lines

  if (targets.length === 0) {
    fail(`错误：没有匹配的台词！可用的角色：${speakers.join('、')}`)
  }

  console.log(`配音文件总数：${lines.length}，本次处理：${targets.length}${forceAll ? '（强制重新生成）' : ''}`)

  const stats = { generated: 0, skipped: 0, failed: 0 }
  const resultLabel = { generated: '已生成', skipped: '已跳过', failed: '失败' }

  for (let i = 0; i < targets.length; i++) {
    const line = targets[i]
    const result = await generateLine(line, forceAll)
    stats[result]++
    console.log(`[${i +
    1}/${targets.length}] ${resultLabel[result]}：${line.file} [${line.character}] ${line.text.slice(0, 24)}`)
    if (i < targets.length - 1) await sleep(1000)
  }

  console.log('\n========================================')
  console.log(`汇总：已生成 ${stats.generated}，已跳过 ${stats.skipped}，失败 ${stats.failed}`)
  console.log('========================================')

  if (stats.failed > 0) process.exit(1)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(err => {
    console.error('generate-voices 发生致命错误：', err)
    process.exit(1)
  })
}