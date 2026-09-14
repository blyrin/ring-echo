export interface Settings {
  textCps: number
  autoDelayMs: number
  musicVol: number
  soundVol: number
  voiceVol: number
}

export const defaultSettings: Settings = {
  textCps: 35,
  autoDelayMs: 1600,
  musicVol: 0.8,
  soundVol: 0.9,
  voiceVol: 1,
}

const KEY = 'ringecho.settings'

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) { return { ...defaultSettings } }
    return { ...defaultSettings, ...(JSON.parse(raw) as Partial<Settings>) }
  } catch {
    return { ...defaultSettings }
  }
}

export function saveSettings(s: Settings) {
  localStorage.setItem(KEY, JSON.stringify(s))
}
