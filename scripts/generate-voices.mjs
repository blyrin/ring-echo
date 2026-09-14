import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

const localTempDir = path.join(rootDir, '.local', 'tts-temp')
if (!fs.existsSync(localTempDir)) {
  fs.mkdirSync(localTempDir, { recursive: true })
}

try {
  execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' })
} catch {
  console.error('Error: ffmpeg is not found in PATH! Please ensure ffmpeg is installed.')
  process.exit(1)
}

const apiKey = process.env.MIMO_API_KEY
if (!apiKey) {
  console.error('Error: MIMO_API_KEY environment variable is not set!')
  process.exit(1)
}

const outDir = path.join(rootDir, 'public', 'audio', 'voice')
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true })
}

const CONCURRENCY = 6
const RETRY_LIMIT = 4

const DELIVERY_NOTE = '像真人现场说话，不要播音腔和朗读腔，语速、语调、停顿随情绪自然起伏。'

function stripTags(s) {
  return s.replace(/（[^（）]*）/g, '')
}

function collectLines() {
  const story = JSON.parse(fs.readFileSync(path.join(rootDir, 'src', 'assets', 'story.json'), 'utf8'))
  const byFile = new Map()
  for (const node of story.nodes) {
    if (node.t !== 'say' || !node.voice) continue
    const v = node.voice
    const file = path.basename(v.file)
    if (!new RegExp(`^${ node.who }_\\d{4}\\.ogg$`).test(file) || v.file !== `audio/voice/${ node.who }/${ file }`) {
      console.error(`非法配音文件路径：${ v.file }`)
      process.exit(1)
    }
    const existing = byFile.get(file)
    if (existing) {
      if (existing.text !== (v.text ?? node.text) || existing.scene !== v.scene) {
        console.error(`配音文件 ${ file } 在多个节点上定义不一致`)
        process.exit(1)
      }
      continue
    }
    const voice = story.characters[node.who]?.voice
    if (!voice) {
      console.error(`缺少角色声音设定（characters.${ node.who }.voice）：${ node.who }`)
      process.exit(1)
    }
    if (!v.scene || !v.guide) {
      console.error(`缺少导演指令（scene/guide）：${ file } [${ node.who }] ${ node.text.slice(0, 20) }`)
      process.exit(1)
    }
    const text = v.text ?? node.text
    if (stripTags(text) !== node.text) {
      console.error(`合成文本与台词不一致：${ file }\n  台词: ${ node.text }\n  合成: ${ stripTags(text) }`)
      process.exit(1)
    }
    byFile.set(file, {
      file,
      who: node.who,
      character: story.characters[node.who]?.name ?? node.who,
      voice,
      text,
      scene: v.scene,
      guide: v.guide,
    })
  }
  return [...byFile.values()]
}

function convertToOgg(srcPath, destPath) {
  execFileSync('ffmpeg', [
    '-y',
    '-v', 'error',
    '-i', srcPath,
    '-map', '0:a:0',
    '-vn',
    '-c:a', 'libopus',
    '-b:a', '32k',
    '-ac', '1',
    '-ar', '24000',
    '-map_metadata', '-1',
    '-map_chapters', '-1',
    '-fflags', '+bitexact',
    '-flags:a', '+bitexact',
    destPath,
  ])
}

async function requestTts(line) {
  const userContent = `角色：\n${ line.voice }\n\n场景：\n${ line.scene }\n\n指导：\n${ line.guide }。${ DELIVERY_NOTE }`
  const assistantContent = line.text
  const postData = JSON.stringify({
    model: 'mimo-v2.5-tts-voicedesign',
    messages: [
      { role: 'user', content: userContent },
      { role: 'assistant', content: assistantContent },
    ],
    audio: { format: 'mp3' },
  })

  const res = await fetch('https://api.xiaomimimo.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: postData,
    signal: AbortSignal.timeout(60000),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`HTTP ${ res.status }: ${ errText.slice(0, 300) }`)
  }

  const json = await res.json()
  const b64 = json.choices?.[0]?.message?.audio?.data
  if (!b64) {
    throw new Error(`No audio data returned: ${ JSON.stringify(json).slice(0, 300) }`)
  }

  return Buffer.from(b64, 'base64')
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function generateLine(line, forceAll) {
  const oggDir = path.join(outDir, line.who)
  if (!fs.existsSync(oggDir)) {
    fs.mkdirSync(oggDir, { recursive: true })
  }
  const oggPath = path.join(oggDir, line.file)
  if (!forceAll && fs.existsSync(oggPath) && fs.statSync(oggPath).size > 1000) {
    return 'skipped'
  }
  for (let retry = 1; retry <= RETRY_LIMIT; retry++) {
    const tempMp3Path = path.join(localTempDir, `temp_${ line.file.replace('.ogg', '') }_${ Date.now() }.mp3`)
    try {
      const audioBuf = await requestTts(line)
      fs.writeFileSync(tempMp3Path, audioBuf)
      convertToOgg(tempMp3Path, oggPath)
      return 'generated'
    } catch (err) {
      if (retry === RETRY_LIMIT) {
        console.error(`  -> Failed ${ line.file } [${ line.character }] ${ line.text.slice(0, 20) }: ${ err.message }`)
        return 'failed'
      }
      await sleep(1500 * retry)
    } finally {
      if (fs.existsSync(tempMp3Path)) {
        fs.unlinkSync(tempMp3Path)
      }
    }
  }
  return 'failed'
}

async function main() {
  const forceAll = process.argv.includes('--force')
  const positional = process.argv.slice(2).filter(a => !a.startsWith('--'))

  const lines = collectLines()
  const speakers = [...new Set(lines.map(l => l.who))]
  const targets = positional.length > 0
    ? lines.filter(l => positional.includes(l.who))
    : lines

  if (targets.length === 0) {
    console.error(`Error: no matching lines! Available speakers: ${ speakers.join(', ') }`)
    process.exit(1)
  }

  console.log(`Total voice files: ${ lines.length }, to process: ${ targets.length }${ forceAll ? ' (force)' : '' }`)
  const queue = [...targets]
  const stats = { generated: 0, skipped: 0, failed: 0 }
  let processed = 0

  const worker = async () => {
    while (queue.length > 0) {
      const line = queue.shift()
      const result = await generateLine(line, forceAll)
      processed++
      stats[result]++
      console.log(`[${ processed }/${ targets.length }] ${ result }: ${ line.file } [${ line.character }] ${ line.text.slice(0, 24) }`)
      await sleep(150)
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, targets.length) }, () => worker()))

  console.log(`\n========================================`)
  console.log(`Summary: Generated: ${ stats.generated }, Skipped: ${ stats.skipped }, Failed: ${ stats.failed }`)
  console.log(`========================================`)

  if (stats.failed > 0) {
    process.exit(1)
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(err => {
    console.error('Fatal error in generate-voices:', err)
    process.exit(1)
  })
}
