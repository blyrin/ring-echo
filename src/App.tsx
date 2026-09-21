import { createEffect, createSignal, onMount, Show } from 'solid-js'
import { AudioEngine } from './engine/audio'
import { preloadAssets } from './engine/assets'
import { Machine } from './engine/machine'
import { latestSlot, readSlot, writeSlot } from './engine/save'
import { loadSettings, saveSettings, type Settings } from './settings'
import { GameScreen } from './ui/GameScreen'
import { MainMenu } from './ui/MainMenu'
import { LoadingScreen, type LoadPhase } from './ui/LoadingScreen'
import { story } from './engine/assets.ts'

export default function App() {
  const [settings, setSettings] = createSignal<Settings>(loadSettings())
  const audio = new AudioEngine()
  const [session, setSession] = createSignal<{ machine: Machine } | null>(null)
  const [canContinue, setCanContinue] = createSignal(latestSlot() !== null)
  const [loadPhase, setLoadPhase] = createSignal<LoadPhase | null>({
    kind: 'loading',
    done: 0,
    total: 0,
    current: null,
  })

  const runPreload = () => {
    setLoadPhase({ kind: 'loading', done: 0, total: 0, current: null })
    preloadAssets(story, (done, total, current) => {
      setLoadPhase({ kind: 'loading', done, total, current })
    }).then((failed) => {
      setLoadPhase(failed.length > 0 ? { kind: 'failed', failed } : null)
    })
  }

  onMount(() => {
    runPreload()
  })

  createEffect(() => {
    const s = settings()
    saveSettings(s)
    audio.setVolume('music', s.musicVol)
    audio.setVolume('sound', s.soundVol)
    audio.setVolume('voice', s.voiceVol)
  })

  const startNew = () => {
    const m = new Machine(story, audio)
    m.start()
    setSession({ machine: m })
  }

  const startFromSlot = (slot: number) => {
    const data = readSlot(slot)
    if (!data) {
      return
    }
    const m = new Machine(story, audio)
    m.load(data)
    setSession({ machine: m })
  }

  const continueGame = () => {
    const slot = latestSlot()
    if (slot !== null) {
      startFromSlot(slot)
    }
  }

  const exitToMenu = () => {
    audio.stopAll()
    setSession(null)
    setCanContinue(latestSlot() !== null)
  }

  const saveSlot = (slot: number) => {
    const s = session()
    if (!s) {
      return
    }
    writeSlot(slot, s.machine.dump())
  }

  return (
    <div class="stage-wrap">
      <div class="stage">
        <Show
          when={loadPhase()}
          fallback={
            <Show
              when={session()}
              fallback={
                <MainMenu
                  story={story}
                  canContinue={canContinue()}
                  onNew={startNew}
                  onContinue={continueGame}
                  onLoadSlot={startFromSlot}
                  settings={settings()}
                  onSettingsChange={setSettings} />
              }
              keyed>
              {(sess) => (
                <GameScreen
                  story={story}
                  machine={sess.machine}
                  audio={audio}
                  settings={settings()}
                  onSettingsChange={setSettings}
                  onExit={exitToMenu}
                  onSaveSlot={saveSlot}
                  onLoadSlot={startFromSlot} />
              )}
            </Show>
          }>
          {(phase) => (
            <LoadingScreen story={story} phase={phase()} onRetry={runPreload} />
          )}
        </Show>
      </div>
    </div>
  )
}
