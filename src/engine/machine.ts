import type { AudioChannelState, AudioEngine } from './audio'
import { evalCond, evalNum } from './expr.ts'
import type { SaveData } from './save'
import type { MenuNode, SceneState, Story } from './types'

export interface HistoryScene {
  bg: string | null
  sprite: string | null
  window: boolean
}

export interface HistoryEntry {
  who: string | null
  text: string
  voice: string | null
  pc: number
  vars: Record<string, number>
  scene: HistoryScene
  label: string
  audio: { music: AudioChannelState | null; sound: AudioChannelState | null }
}

export interface SayView {
  who: string | null
  text: string
  id: number
}

export interface Snapshot {
  scene: SceneState
  vars: Record<string, number>
  say: SayView | null
  menu: MenuNode | null
  pauseMs: number | null
  transition: 'dissolve' | 'fade' | null
  ended: boolean
  label: string
  labelTitle: string
  lastSay: HistoryEntry | null
  history: HistoryEntry[]
}

function sameTag(sprite: string, tag: string): boolean {
  return sprite === tag || sprite.startsWith(tag + ' ')
}

function sameChannel(a: AudioChannelState | null, b: AudioChannelState | null): boolean {
  if (a === b) {
    return true
  }
  if (!a || !b) {
    return false
  }
  return a.file === b.file && a.loop === b.loop
}

function sameAudioState(
  a: { music: AudioChannelState | null; sound: AudioChannelState | null },
  b: { music: AudioChannelState | null; sound: AudioChannelState | null },
): boolean {
  return sameChannel(a.music, b.music) && sameChannel(a.sound, b.sound)
}

export class Machine {
  private story: Story
  private audio: AudioEngine
  private pc = 0
  private vars: Record<string, number>
  private scene: SceneState = { bg: null, sprite: null, bgV: 0, spriteV: 0, window: false }
  private menuNode: MenuNode | null = null
  private pauseMs: number | null = null
  private transition: 'dissolve' | 'fade' | null = null
  private ended = false
  private currentLabel = ''
  private labelToIndex = new Map<string, number>()
  private labelTitles = new Map<string, string>()
  private history: HistoryEntry[] = []
  private lastSay: HistoryEntry | null = null
  private say: SayView | null = null
  private sayId = 0
  private sayPc = -1
  private skipHistoryOnce = false
  private started = false
  private listeners = new Set<() => void>()
  private cache: Snapshot | null = null

  constructor(story: Story, audio: AudioEngine) {
    this.story = story
    this.audio = audio
    this.vars = { ...story.vars }
    story.nodes.forEach((node, i) => {
      if (node.t === 'label') {
        this.labelToIndex.set(node.name, i)
        if (node.title) {
          this.labelTitles.set(node.name, node.title)
        }
      }
    })
  }

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn)
    return () => {
      this.listeners.delete(fn)
    }
  }

  getSnapshot = (): Snapshot => {
    if (!this.cache) {
      this.cache = this.build()
    }
    return this.cache
  }

  private build(): Snapshot {
    return {
      scene: { ...this.scene },
      vars: { ...this.vars },
      say: this.say,
      menu: this.menuNode,
      pauseMs: this.pauseMs,
      transition: this.transition,
      ended: this.ended,
      label: this.currentLabel,
      labelTitle: this.currentLabelTitle(),
      lastSay: this.lastSay ? { ...this.lastSay } : null,
      history: [...this.history],
    }
  }

  private emit() {
    this.cache = null
    for (const fn of this.listeners) {
      fn()
    }
  }

  start() {
    this.started = true
    this.pc = this.resolveJump('start')
    this.run()
  }

  load(data: SaveData) {
    this.started = true
    this.audio.stopAll()
    this.pc = data.pc
    this.vars = { ...data.vars }
    this.scene = { bg: data.scene.bg, sprite: data.scene.sprite, bgV: 1, spriteV: 1, window: data.scene.window }
    this.menuNode = null
    this.pauseMs = null
    this.transition = null
    this.ended = false
    this.say = null
    this.skipHistoryOnce = true
    this.audio.restore(data.audio)
    this.updateLabel()
    this.run()
  }

  isStarted(): boolean {
    return this.started
  }

  dump(): SaveData {
    this.updateLabel()
    return {
      v: 1,
      ts: Date.now(),
      pc: this.say ? this.sayPc : this.pc,
      vars: { ...this.vars },
      scene: { bg: this.scene.bg, sprite: this.scene.sprite, window: this.scene.window },
      labelTitle: this.currentLabelTitle(),
      previewWho: this.lastSay?.who ?? null,
      previewText: this.lastSay?.text ?? '',
      audio: this.audio.serialize(),
    }
  }

  advance() {
    if (!this.started || this.ended || this.menuNode || this.pauseMs !== null) {
      return
    }
    this.say = null
    this.audio.stopVoice(0.15)
    this.run()
  }

  finishPause() {
    if (this.pauseMs === null) {
      return
    }
    this.pauseMs = null
    this.run()
  }

  choose(index: number) {
    const menu = this.menuNode
    if (!menu) {
      return
    }
    const opt = menu.options[index]
    if (!opt) {
      return
    }
    for (const [k, expr] of Object.entries(opt.set)) {
      this.vars[k] = evalNum(expr, this.vars)
    }
    this.menuNode = null
    this.say = null
    this.audio.stopVoice(0.15)
    this.pc = this.resolveJump(opt.goto)
    this.run()
  }

  rollback(index: number) {
    if (!this.started) {
      return
    }
    const entry = this.history[index]
    if (!entry) {
      return
    }
    this.audio.stopVoice(0.15)
    if (!sameAudioState(this.audio.serialize(), entry.audio)) {
      this.audio.restore(entry.audio)
    }
    const bgChanged = this.scene.bg !== entry.scene.bg
    const spriteChanged = this.scene.sprite !== entry.scene.sprite
    this.pc = entry.pc
    this.vars = { ...entry.vars }
    this.scene = {
      bg: entry.scene.bg,
      sprite: entry.scene.sprite,
      bgV: bgChanged ? this.scene.bgV + 1 : this.scene.bgV,
      spriteV: spriteChanged ? this.scene.spriteV + 1 : this.scene.spriteV,
      window: entry.scene.window,
    }
    this.currentLabel = entry.label
    this.menuNode = null
    this.pauseMs = null
    this.transition = null
    this.ended = false
    this.say = null
    this.skipHistoryOnce = true
    this.history = this.history.slice(0, index + 1)
    this.run()
  }

  clearTransition() {
    if (this.transition) {
      this.transition = null
      this.emit()
    }
  }

  private currentLabelTitle(): string {
    return this.labelTitles.get(this.currentLabel) ?? this.currentLabel
  }

  private resolveJump(target: string): number {
    const idx = this.labelToIndex.get(target)
    if (idx === undefined) {
      throw new Error(`未知标签：${target}`)
    }
    return idx
  }

  private updateLabel() {
    let cur = ''
    let curIdx = -1
    for (const [name, idx] of this.labelToIndex) {
      if (idx <= this.pc && idx > curIdx) {
        cur = name
        curIdx = idx
      }
    }
    this.currentLabel = cur
  }

  private run() {
    const nodes = this.story.nodes
    let guard = 0
    while (true) {
      if (++guard > 1_000_000) {
        throw new Error('解释器循环超限')
      }
      const node = nodes[this.pc]
      if (!node) {
        this.ended = true
        break
      }
      switch (node.t) {
        case 'scene': {
          this.scene.bg = node.img
          this.scene.sprite = null
          this.scene.bgV++
          this.scene.spriteV++
          this.pc++
          break
        }
        case 'show': {
          this.scene.sprite = node.img
          this.scene.spriteV++
          this.pc++
          break
        }
        case 'hide': {
          if (this.scene.sprite && sameTag(this.scene.sprite, node.tag)) {
            this.scene.sprite = null
            this.scene.spriteV++
          }
          this.pc++
          break
        }
        case 'with': {
          this.transition = node.tr
          this.pc++
          break
        }
        case 'window': {
          this.scene.window = node.visible
          this.pc++
          break
        }
        case 'music': {
          this.audio.playMusic(node.file, node.loop, node.fadein)
          this.pc++
          break
        }
        case 'sound': {
          this.audio.playSound(node.file, node.loop, node.fadein)
          this.pc++
          break
        }
        case 'stop': {
          if (node.channel === 'music') {
            this.audio.stopMusic(node.fadeout)
          } else {
            this.audio.stopSound(node.fadeout)
          }
          this.pc++
          break
        }
        case 'set': {
          this.vars[node.var] = evalNum(node.expr, this.vars)
          this.pc++
          break
        }
        case 'label': {
          this.pc++
          break
        }
        case 'ifjump': {
          this.pc = evalCond(node.cond, this.vars) ? this.resolveJump(node.target) : this.pc + 1
          break
        }
        case 'jump': {
          this.pc = this.resolveJump(node.target)
          break
        }
        case 'say': {
          this.sayPc = this.pc
          this.updateLabel()
          const entry: HistoryEntry = {
            who: node.who ?? null,
            text: node.text,
            voice: node.voice?.file ?? null,
            pc: this.pc,
            vars: { ...this.vars },
            scene: { bg: this.scene.bg, sprite: this.scene.sprite, window: true },
            label: this.currentLabel,
            audio: this.audio.serialize(),
          }
          if (this.skipHistoryOnce) {
            this.skipHistoryOnce = false
          } else {
            this.history.push(entry)
          }
          if (this.history.length > 400) {
            this.history.splice(0, this.history.length - 400)
          }
          this.lastSay = entry
          this.say = { who: node.who ?? null, text: node.text, id: ++this.sayId }
          if (node.voice) {
            this.audio.playVoice(node.voice.file)
          }
          this.scene.window = true
          this.pc++
          this.emit()
          return
        }
        case 'menu': {
          this.menuNode = node
          this.updateLabel()
          this.emit()
          return
        }
        case 'pause': {
          this.pauseMs = Math.max(0, node.time * 1000)
          this.pc++
          this.updateLabel()
          this.emit()
          return
        }
        case 'return': {
          this.ended = true
          this.updateLabel()
          this.emit()
          return
        }
      }
    }
    this.updateLabel()
    this.emit()
  }
}
