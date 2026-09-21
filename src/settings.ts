export type SettingKey = 'textCps' | 'autoDelayMs' | 'musicVol' | 'soundVol' | 'voiceVol'

export interface SettingDef {
  label: string
  default: number
  min: number
  max: number
  step: number
  format: (v: number) => string
}

export interface Settings {
  textCps: number
  autoDelayMs: number
  musicVol: number
  soundVol: number
  voiceVol: number
}

const percent = (v: number) => `${Math.round(v * 100)}%`

export const SETTING_DEFS: Record<SettingKey, SettingDef> = {
  textCps: { label: '文字速度', default: 50, min: 5, max: 200, step: 1, format: (v) => `${v} 字/秒` },
  autoDelayMs: {
    label: '自动播放间隔',
    default: 1600,
    min: 400,
    max: 5000,
    step: 100,
    format: (v) => `${(v / 1000).toFixed(1)} 秒`,
  },
  musicVol: { label: '音乐音量', default: 0.2, min: 0, max: 1, step: 0.01, format: percent },
  soundVol: { label: '音效音量', default: 0.4, min: 0, max: 1, step: 0.01, format: percent },
  voiceVol: { label: '配音音量', default: 0.3, min: 0, max: 1, step: 0.01, format: percent },
}

export function defaultSettings(): Settings {
  return {
    textCps: SETTING_DEFS.textCps.default,
    autoDelayMs: SETTING_DEFS.autoDelayMs.default,
    musicVol: SETTING_DEFS.musicVol.default,
    soundVol: SETTING_DEFS.soundVol.default,
    voiceVol: SETTING_DEFS.voiceVol.default,
  }
}

const KEY = 'ringecho.settings'

export function loadSettings(): Settings {
  const base = defaultSettings()
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) {
      return base
    }
    return { ...base, ...(JSON.parse(raw) as Partial<Settings>) }
  } catch {
    return base
  }
}

export function saveSettings(s: Settings) {
  localStorage.setItem(KEY, JSON.stringify(s))
}
