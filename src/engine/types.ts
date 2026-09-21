export type ImageDef =
  | { kind: 'sprite'; src: string }
  | { kind: 'scene'; src: string }
  | { kind: 'color'; value: string }

export interface StoryMeta {
  title: string
  subtitle: string
  engine: string
  tagline?: string
  author?: string
  repo?: string
  menuBg?: string
}

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
}

export interface SayNode {
  t: 'say'
  who?: string
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
  target: string
}

export interface JumpNode {
  t: 'jump'
  target: string
}

export interface MenuOption {
  text: string
  set: Record<string, string>
  goto: string
}

export interface MenuNode {
  t: 'menu'
  options: MenuOption[]
}

export interface ReturnNode {
  t: 'return'
}

export interface LabelNode {
  t: 'label'
  name: string
  title?: string
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
  | LabelNode
  | ReturnNode

export interface Story {
  meta: StoryMeta
  characters: Record<string, CharacterDef>
  images: Record<string, ImageDef>
  vars: Record<string, number>

  nodes: StoryNode[]
}

export interface SceneState {
  bg: string | null
  sprite: string | null
  bgV: number
  spriteV: number
  window: boolean
}
