import fs from 'node:fs'
import path from 'node:path'
import type { ServerResponse, IncomingMessage } from 'node:http'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import solid from 'vite-plugin-solid'
import { convertToOgg, getSampleBase64, outDir, requestTts, tempDir } from './scripts/generate-voices.mjs'

const rootDir = path.dirname(fileURLToPath(import.meta.url))
const storyPath = path.join(rootDir, 'src', 'assets', 'story.json')

function readStory() {
  return JSON.parse(fs.readFileSync(storyPath, 'utf8'))
}

function sendJson(res: ServerResponse, status: number, data: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(data))
}

function readBody(req: IncomingMessage) {
  return new Promise<string>((resolve, reject) => {
    let data = ''
    req.on('data', (chunk: Buffer) => (data += chunk))
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}

function badRequest(res: ServerResponse, error: string) {
  sendJson(res, 400, { error })
}

function devWorkbenchApi(): Plugin {
  return {
    name: 'dev-workbench-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__workbench', async (req, res, next) => {
        try {
          const url = new URL(req.url ?? '/', 'http://localhost')

          if (req.method === 'POST' && url.pathname === '/save') {
            const { index, node } = JSON.parse(await readBody(req))
            const story = readStory()
            if (!Array.isArray(story.nodes) || typeof index !== 'number' || story.nodes[index]?.t !== 'say') {
              return badRequest(res, '非法的节点下标')
            }
            if (node?.t !== 'say' || typeof node.text !== 'string' || typeof node.voice?.file !== 'string') {
              return badRequest(res, '非法的节点数据')
            }
            story.nodes[index] = node
            fs.writeFileSync(storyPath, JSON.stringify(story, null, 2) + '\n')
            return sendJson(res, 200, { ok: true })
          }

          if (req.method === 'POST' && url.pathname === '/generate') {
            if (!process.env.MIMO_API_KEY) return badRequest(res, '未设置环境变量 MIMO_API_KEY，无法生成配音')
            const { index, force } = JSON.parse(await readBody(req))
            const story = readStory()
            const node = story.nodes?.[index]
            if (!node || node.t !== 'say' || !node.voice) return badRequest(res, '该节点不是配音 say 节点')
            if (!node.voice.scene) return badRequest(res, '缺少导演指令（scene）')
            const sampleRef = story.characters?.[node.who]?.voice
            if (!sampleRef) return badRequest(res, `角色 ${node.who} 缺少音色样本设定（characters.${node.who}.voice）`)

            const file = path.basename(node.voice.file)
            const oggPath = path.join(outDir, node.who, file)
            fs.mkdirSync(path.join(outDir, node.who), { recursive: true })
            fs.mkdirSync(tempDir, { recursive: true })
            if (force) fs.rmSync(oggPath, { force: true })

            const wavPath = path.join(tempDir, `temp_${file.replace(/\.ogg$/, '')}_${Date.now()}.wav`)
            try {
              fs.writeFileSync(
                wavPath,
                await requestTts({
                  who: node.who,
                  text: node.text,
                  scene: node.voice.scene,
                  sample: getSampleBase64(node.who, sampleRef),
                }),
              )
              convertToOgg(wavPath, oggPath)
            } finally {
              fs.rmSync(wavPath, { force: true })
            }
            return sendJson(res, 200, { ok: true, file: node.voice.file })
          }

          next()
        } catch (err) {
          sendJson(res, 500, { error: err instanceof Error ? err.message : String(err) })
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [solid(), devWorkbenchApi()],
  server: {
    port: 8869,
    watch: {
      ignored: ['**/src/assets/story.json', '**/public/audio/voice/**'],
    },
  },
})
