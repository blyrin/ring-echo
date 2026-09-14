export type ImageDef =
  | { kind: 'sprite'; src: string }
  | { kind: 'scene'; src: string }
  | { kind: 'color'; value: string }

export interface CharacterDef {
  name: string
  color: string
  prefix: string
  suffix: string
  voice?: string
}

export interface VoiceDef {
  file: string
  scene?: string
  guide?: string
  text?: string
}

export interface SayNode {
  t: 'say'
  who: string | null
  text: string
  voice?: VoiceDef
}

export interface SceneNode {
  t: 'scene'
  img: string
}

export interface ShowNode {
  t: 'show'
  img: string
}

export interface HideNode {
  t: 'hide'
  tag: string
}

export interface WithNode {
  t: 'with'
  tr: 'dissolve' | 'fade'
}

export interface WindowNode {
  t: 'window'
  visible: boolean
}

export interface MusicNode {
  t: 'music'
  op: 'play'
  file: string
  loop: boolean
  fadein: number
}

export interface SoundNode {
  t: 'sound'
  op: 'play'
  file: string
  loop: boolean
  fadein: number
}

export interface StopNode {
  t: 'stop'
  channel: 'music' | 'sound'
  fadeout: number
}

export interface PauseNode {
  t: 'pause'
  time: number
}

export interface SetNode {
  t: 'set'
  var: string
  expr: string
}

export interface IfJumpNode {
  t: 'ifjump'
  cond: string
  target: number
}

export interface JumpNode {
  t: 'jump'
  target: string | number
}

export interface MenuOption {
  text: string
  set: Record<string, string>
  goto: string | number
}

export interface MenuNode {
  t: 'menu'
  options: MenuOption[]
}

export interface ReturnNode {
  t: 'return'
}

export type StoryNode =
  | SayNode
  | SceneNode
  | ShowNode
  | HideNode
  | WithNode
  | WindowNode
  | MusicNode
  | SoundNode
  | StopNode
  | PauseNode
  | SetNode
  | IfJumpNode
  | JumpNode
  | MenuNode
  | ReturnNode

export interface Story {
  meta: { title: string; subtitle: string; engine: string }
  characters: Record<string, CharacterDef>
  images: Record<string, ImageDef>
  vars: Record<string, number>
  labels: Record<string, number>
  labelTitles: Record<string, string>
  nodes: StoryNode[]
}

export interface SceneState {
  bg: string | null
  sprite: string | null
  bgV: number
  spriteV: number
  window: boolean
}
