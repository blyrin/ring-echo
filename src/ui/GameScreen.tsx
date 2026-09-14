import { createEffect, createSignal, onCleanup, onMount, Show } from 'solid-js'
import type { AudioEngine } from '../engine/audio'
import type { Machine, Snapshot } from '../engine/machine'
import type { Story } from '../engine/types'
import type { Settings } from '../settings'
import { Choices } from './Choices'
import { QuickMenu } from './QuickMenu'
import { Stage } from './Stage'
import { TextBox } from './TextBox'
import { AboutOverlay, EndingOverlay, HistoryOverlay, SavesOverlay, SettingsOverlay } from './overlays'
import { createTypewriter } from './createTypewriter'

type OverlayKind = 'history' | 'save' | 'load' | 'settings' | 'about' | null

interface GameScreenProps {
  story: Story
  machine: Machine
  audio: AudioEngine
  settings: Settings
  onSettingsChange: (s: Settings) => void
  onExit: () => void
  onSaveSlot: (slot: number) => void
  onLoadSlot: (slot: number) => void
}

export function GameScreen(props: GameScreenProps) {
  const [snap, setSnap] = createSignal<Snapshot>(props.machine.getSnapshot())
  onCleanup(
    props.machine.subscribe(() => {
      setSnap(props.machine.getSnapshot())
    }),
  )

  const [overlay, setOverlay] = createSignal<OverlayKind>(null)
  const [auto, setAuto] = createSignal(false)
  const [skip, setSkip] = createSignal(false)
  const [ctrl, setCtrl] = createSignal(false)
  const instant = () => skip() || ctrl()

  const tw = createTypewriter(
    () => snap().say?.text ?? '',
    () => snap().say?.id ?? 0,
    () => props.settings.textCps,
    instant,
  )

  const busy = () => snap().menu !== null || snap().ended || overlay() !== null

  const advance = () => {
    if (busy()) {
      return
    }
    const s = snap()
    if (s.pauseMs !== null) {
      props.machine.finishPause()
      return
    }
    if (s.say) {
      if (!tw.done()) {
        tw.complete()
        return
      }
      props.machine.advance()
    }
  }

  createEffect(() => {
    const s = snap()
    if (s.pauseMs === null) {
      return
    }
    const isInst = instant()
    const t = window.setTimeout(() => props.machine.finishPause(), isInst ? 120 : s.pauseMs)
    onCleanup(() => window.clearTimeout(t))
  })

  createEffect(() => {
    if (instant() || !auto() || busy() || !snap().say || !tw.done()) {
      return
    }
    const delay = props.settings.autoDelayMs
    let cancelled = false
    let timer = 0
    const step = () => {
      if (cancelled) {
        return
      }
      if (props.audio.isVoicePlaying()) {
        timer = window.setTimeout(step, 250)
        return
      }
      timer = window.setTimeout(() => {
        if (!cancelled) {
          props.machine.advance()
        }
      }, delay)
    }
    step()
    onCleanup(() => {
      cancelled = true
      window.clearTimeout(timer)
    })
  })

  createEffect(() => {
    const isInst = instant()
    props.audio.setVoiceSuppressed(isInst)
  })
  onCleanup(() => props.audio.setVoiceSuppressed(false))

  createEffect(() => {
    if (!instant() || busy()) {
      return
    }
    const s = snap()
    if (s.pauseMs !== null) {
      const t = window.setTimeout(() => props.machine.finishPause(), 60)
      onCleanup(() => window.clearTimeout(t))
      return
    }
    if (s.say && tw.done()) {
      const t = window.setTimeout(() => props.machine.advance(), 90)
      onCleanup(() => window.clearTimeout(t))
    }
  })

  onMount(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'Control') {
        setCtrl(true)
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        advance()
      } else if (e.key === 'Escape') {
        setOverlay((o) => (o ? null : 'settings'))
      } else if (e.key === 'h' || e.key === 'H') {
        setOverlay((o) => (o === 'history' ? null : 'history'))
      }
    }
    const up = (e: KeyboardEvent) => {
      if (e.key === 'Control') {
        setCtrl(false)
      }
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    onCleanup(() => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    })
  })

  const textboxVisible = () => {
    const s = snap()
    return s.scene.window && s.menu === null && (s.say !== null || s.pauseMs !== null)
  }

  return (
    <div class="game-screen">
      <Stage
        story={props.story}
        scene={snap().scene}
        transition={snap().transition}
        onTransitionEnd={() => props.machine.clearTransition()}
        onAdvance={advance} />
      <TextBox
        story={props.story}
        who={snap().say?.who ?? null}
        shown={tw.shown()}
        done={tw.done()}
        visible={textboxVisible()} />
      <Show when={snap().menu}>
        {(menu) => <Choices menu={menu()} onChoose={(i) => props.machine.choose(i)} />}
      </Show>
      <QuickMenu
        auto={auto()}
        skip={skip()}
        onToggleAuto={() => setAuto((a) => !a)}
        onToggleSkip={() => setSkip((s) => !s)}
        onHistory={() => setOverlay('history')}
        onSave={() => setOverlay('save')}
        onLoad={() => setOverlay('load')}
        onSettings={() => setOverlay('settings')}
        onQuit={props.onExit} />
      <Show when={overlay() === 'history'}>
        <HistoryOverlay
          story={props.story}
          history={snap().history}
          onClose={() => setOverlay(null)} />
      </Show>
      <Show when={overlay() === 'save'}>
        <SavesOverlay
          story={props.story}
          mode="save"
          onSave={(n) => {
            props.onSaveSlot(n)
            setOverlay(null)
          }}
          onLoad={() => {}}
          onClose={() => setOverlay(null)} />
      </Show>
      <Show when={overlay() === 'load'}>
        <SavesOverlay
          story={props.story}
          mode="load"
          onSave={() => {}}
          onLoad={(n) => {
            props.onLoadSlot(n)
            setOverlay(null)
          }}
          onClose={() => setOverlay(null)} />
      </Show>
      <Show when={overlay() === 'settings'}>
        <SettingsOverlay
          settings={props.settings}
          onChange={props.onSettingsChange}
          onClose={() => setOverlay(null)} />
      </Show>
      <Show when={overlay() === 'about'}>
        <AboutOverlay onClose={() => setOverlay(null)} />
      </Show>
      <Show when={snap().ended}>
        <EndingOverlay title={snap().labelTitle} onExit={props.onExit} />
      </Show>
    </div>
  )
}
