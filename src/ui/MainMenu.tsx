import { createSignal, Show } from 'solid-js'
import { assetUrl } from '../engine/assets'
import type { Story } from '../engine/types'
import type { Settings } from '../settings'
import { AboutOverlay, SavesOverlay, SettingsOverlay } from './overlays'

interface MainMenuProps {
  story: Story
  canContinue: boolean
  onNew: () => void
  onContinue: () => void
  onLoadSlot: (slot: number) => void
  settings: Settings
  onSettingsChange: (s: Settings) => void
}

export function MainMenu(props: MainMenuProps) {
  const [overlay, setOverlay] = createSignal<'load' | 'settings' | 'about' | null>(null)
  const bgDef = () => {
    const key = props.story.meta.menuBg
    if (!key) {
      return undefined
    }
    const d = props.story.images[key]
    return d?.kind === 'scene' ? d : undefined
  }

  return (
    <div class="main-menu">
      <div class="menu-bg">
        <Show when={bgDef()}>
          <img src={assetUrl(bgDef()!.src)} alt="" draggable={false} />
        </Show>
        <div class="menu-shade" />
      </div>
      <div class="menu-content">
        <h1 class="game-title">{props.story.meta.title}</h1>
        <div class="game-subtitle">{props.story.meta.subtitle}</div>
        <Show when={props.story.meta.tagline}>
          <p class="menu-tagline">{props.story.meta.tagline}</p>
        </Show>
        <div class="menu-buttons">
          <button class="menu-btn" onClick={props.onNew}>
            开始游戏
          </button>
          <Show when={props.canContinue}>
            <button class="menu-btn" onClick={props.onContinue}>
              继续游戏
            </button>
          </Show>
          <button class="menu-btn" onClick={() => setOverlay('load')}>
            读取存档
          </button>
          <button class="menu-btn" onClick={() => setOverlay('settings')}>
            设置
          </button>
          <button class="menu-btn" onClick={() => setOverlay('about')}>
            关于
          </button>
        </div>
      </div>
      <div class="menu-footer">{props.story.meta.author}</div>
      <Show when={overlay() === 'load'}>
        <SavesOverlay
          story={props.story}
          mode="load"
          onSave={() => {}}
          onLoad={(n) => {
            setOverlay(null)
            props.onLoadSlot(n)
          }}
          onClose={() => setOverlay(null)}
        />
      </Show>
      <Show when={overlay() === 'settings'}>
        <SettingsOverlay
          settings={props.settings}
          onChange={props.onSettingsChange}
          onClose={() => setOverlay(null)}
        />
      </Show>
      <Show when={overlay() === 'about'}>
        <AboutOverlay story={props.story} onClose={() => setOverlay(null)} />
      </Show>
    </div>
  )
}
