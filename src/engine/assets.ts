import type { Story } from './types.ts'
import storyJson from '../assets/story.json'

export function assetUrl(rel: string): string {
  const base = import.meta.env.BASE_URL
  return base.endsWith('/') ? base + rel : `${base}/${rel}`
}

export const story = storyJson as Story

const audioUrlCache = new Map<string, string>()

export function audioBlobUrl(file: string): string | null {
  return audioUrlCache.get(file) ?? null
}

export function collectAssetPaths(st: Story): string[] {
  const paths = new Set<string>()
  for (const def of Object.values(st.images)) {
    if (def.kind === 'color') {
      continue
    }
    paths.add(def.src)
  }
  for (const node of st.nodes) {
    if ((node.t === 'music' || node.t === 'sound') && node.op === 'play') {
      paths.add(node.file)
    }
    if (node.t === 'say' && node.voice) {
      paths.add(node.voice.file)
    }
  }
  return [...paths]
}

function isAudio(rel: string): boolean {
  return /\.(ogg|mp3|wav|m4a)$/i.test(rel)
}

async function loadImage(rel: string): Promise<void> {
  const img = new Image()
  img.src = assetUrl(rel)
  await img.decode()
}

async function loadAudio(rel: string): Promise<void> {
  const res = await fetch(assetUrl(rel))
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`)
  }
  const blob = await res.blob()
  audioUrlCache.set(rel, URL.createObjectURL(blob))
}

const LOAD_ATTEMPTS = 3
const LOAD_CONCURRENCY = 6

export async function preloadAssets(
  st: Story,
  onProgress: (done: number, total: number, current: string | null) => void,
): Promise<string[]> {
  const queue = collectAssetPaths(st)
  const total = queue.length
  let done = 0
  const failed: string[] = []

  const worker = async() => {
    while (queue.length > 0) {
      const rel = queue.shift() as string
      onProgress(done, total, rel)
      for (let attempt = 1; attempt <= LOAD_ATTEMPTS; attempt++) {
        try {
          if (isAudio(rel)) {
            await loadAudio(rel)
          } else {
            await loadImage(rel)
          }
          break
        } catch (e) {
          if (attempt === LOAD_ATTEMPTS) {
            failed.push(rel)
            console.warn(`资源加载失败：${rel}`, e)
          }
        }
      }
      done++
      onProgress(done, total, rel)
    }
  }

  await Promise.all(Array.from({ length: Math.min(LOAD_CONCURRENCY, total) }, () => worker()))
  return failed
}
