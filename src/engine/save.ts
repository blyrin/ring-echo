import type { AudioChannelState } from './audio'

export interface SaveData {
  v: 1
  ts: number
  pc: number
  vars: Record<string, number>
  scene: { bg: string | null; sprite: string | null; window: boolean }
  labelTitle: string
  previewWho: string | null
  previewText: string
  audio: { music: AudioChannelState | null; sound: AudioChannelState | null }
}

export const SAVE_SLOTS = 6

const key = (n: number) => `ringecho.save.${n}`

export function readSlot(n: number): SaveData | null {
  try {
    const raw = localStorage.getItem(key(n))
    if (!raw) {
      return null
    }
    const data = JSON.parse(raw) as SaveData
    if (data.v !== 1 || typeof data.pc !== 'number') {
      return null
    }
    return data
  } catch {
    return null
  }
}

export function writeSlot(n: number, data: SaveData) {
  localStorage.setItem(key(n), JSON.stringify(data))
}

export function clearSlot(n: number) {
  localStorage.removeItem(key(n))
}

export function latestSlot(): number | null {
  let best: number | null = null
  let bestTs = -1
  for (let n = 1; n <= SAVE_SLOTS; n++) {
    const d = readSlot(n)
    if (d && d.ts > bestTs) {
      bestTs = d.ts
      best = n
    }
  }
  return best
}
