import { createSignal, For, type JSX, Show } from 'solid-js'
import { clearSlot, readSlot, SAVE_SLOTS } from '../engine/save'
import type { HistoryEntry } from '../engine/machine'
import type { Story } from '../engine/types'
import type { Settings } from '../settings'

export function OverlayShell(props: {
  title: string
  onClose: () => void
  children: JSX.Element
}) {
  return (
    <div class="overlay-backdrop" onClick={props.onClose}>
      <div class="overlay-panel" onClick={(e) => e.stopPropagation()}>
        <div class="overlay-head">
          <h2>{props.title}</h2>
          <button class="overlay-close" onClick={props.onClose}>
            ✕
          </button>
        </div>
        <div class="overlay-body">{props.children}</div>
      </div>
    </div>
  )
}

export function HistoryOverlay(props: {
  story: Story
  history: HistoryEntry[]
  onClose: () => void
}) {
  const items = () => [...props.history].reverse()
  return (
    <OverlayShell title="历史记录" onClose={props.onClose}>
      <Show when={items().length === 0}>
        <p class="overlay-empty">还没有任何对话。</p>
      </Show>
      <div class="history-list">
        <For each={items()}>
          {(h) => {
            const char = h.who ? props.story.characters[h.who] : undefined
            return (
              <div class="history-item">
                <Show when={char}>
                  {(c) => (
                    <span class="history-who" style={{ color: c().color }}>
                      {c().name}
                    </span>
                  )}
                </Show>
                <p>{char ? `${char.prefix}${h.text}${char.suffix}` : h.text}</p>
              </div>
            )
          }}
        </For>
      </div>
    </OverlayShell>
  )
}

export function SavesOverlay(props: {
  story: Story
  mode: 'save' | 'load'
  onSave: (slot: number) => void
  onLoad: (slot: number) => void
  onClose: () => void
}) {
  const [version, setVersion] = createSignal(0)
  const slots = () => {
    version()
    const list = []
    for (let n = 1; n <= SAVE_SLOTS; n++) {
      list.push({ n, data: readSlot(n) })
    }
    return list
  }

  return (
    <OverlayShell title={props.mode === 'save' ? '保存进度' : '读取进度'} onClose={props.onClose}>
      <div class="save-grid">
        <For each={slots()}>
          {({ n, data }) => (
            <div class="save-card" classList={{ empty: !data }}>
              <div class="save-head">存档位 {n}</div>
              <Show
                when={data}
                fallback={<div class="save-preview">（空）</div>}>
                {(d) => (
                  <>
                    <div class="save-chapter">{d().labelTitle || '—'}</div>
                    <div class="save-preview">
                      {d().previewWho ? `${props.story.characters[d().previewWho!]?.name ?? ''}：` : ''}
                      {d().previewText}
                    </div>
                    <div class="save-time">
                      {new Date(d().ts).toLocaleString('zh-CN', { hour12: false })}
                    </div>
                  </>
                )}
              </Show>
              <div class="save-actions">
                <Show when={props.mode === 'save'}>
                  <button class="mini-btn primary" onClick={() => props.onSave(n)}>
                    {data ? '覆盖保存' : '保存'}
                  </button>
                </Show>
                <Show when={props.mode === 'load' && data}>
                  <button class="mini-btn primary" onClick={() => props.onLoad(n)}>
                    读取
                  </button>
                </Show>
                <Show when={data}>
                  <button
                    class="mini-btn danger"
                    onClick={() => {
                      clearSlot(n)
                      setVersion((v) => v + 1)
                    }}>
                    删除
                  </button>
                </Show>
              </div>
            </div>
          )}
        </For>
      </div>
    </OverlayShell>
  )
}

function SliderRow(props: {
  label: string
  value: number
  min: number
  max: number
  step: number
  display: string
  onChange: (v: number) => void
}) {
  return (
    <label class="setting-row">
      <span class="setting-label">{props.label}</span>
      <input
        type="range"
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        onInput={(e) => props.onChange(Number(e.currentTarget.value))}
      />
      <span class="setting-value">{props.display}</span>
    </label>
  )
}

export function SettingsOverlay(props: {
  settings: Settings
  onChange: (s: Settings) => void
  onClose: () => void
}) {
  return (
    <OverlayShell title="设置" onClose={props.onClose}>
      <div class="settings-list">
        <SliderRow
          label="文字速度"
          value={props.settings.textCps}
          min={5}
          max={100}
          step={1}
          display={`${props.settings.textCps} 字/秒`}
          onChange={(v) => props.onChange({ ...props.settings, textCps: v })}
        />
        <SliderRow
          label="自动播放间隔"
          value={props.settings.autoDelayMs}
          min={400}
          max={5000}
          step={100}
          display={`${(props.settings.autoDelayMs / 1000).toFixed(1)} 秒`}
          onChange={(v) => props.onChange({ ...props.settings, autoDelayMs: v })}
        />
        <SliderRow
          label="音乐音量"
          value={props.settings.musicVol}
          min={0}
          max={1}
          step={0.01}
          display={`${Math.round(props.settings.musicVol * 100)}%`}
          onChange={(v) => props.onChange({ ...props.settings, musicVol: v })}
        />
        <SliderRow
          label="音效音量"
          value={props.settings.soundVol}
          min={0}
          max={1}
          step={0.01}
          display={`${Math.round(props.settings.soundVol * 100)}%`}
          onChange={(v) => props.onChange({ ...props.settings, soundVol: v })}
        />
        <SliderRow
          label="配音音量"
          value={props.settings.voiceVol}
          min={0}
          max={1}
          step={0.01}
          display={`${Math.round(props.settings.voiceVol * 100)}%`}
          onChange={(v) => props.onChange({ ...props.settings, voiceVol: v })}
        />
      </div>
    </OverlayShell>
  )
}

export function AboutOverlay(props: { onClose: () => void }) {
  return (
    <OverlayShell title="关于" onClose={props.onClose}>
      <div class="about-body">
        <p>《铃声回响 RingEcho》</p>
        <a href="https://github.com/blyrin/ring-echo" target="_blank" rel="noreferrer">
          github.com/blyrin/ring-echo
        </a>
        <div class="about-keys">
          <div>
            <b>点击 / 空格 / 回车</b> — 推进对话
          </div>
          <div>
            <b>按住 Ctrl</b> — 快速快进
          </div>
          <div>
            <b>H</b> — 历史记录
          </div>
          <div>
            <b>Esc</b> — 打开 / 关闭菜单
          </div>
        </div>
      </div>
    </OverlayShell>
  )
}

export function EndingOverlay(props: { title: string; onExit: () => void }) {
  const clean = () => props.title.replace(/（[^）]*）$/, '')
  return (
    <div class="ending-overlay">
      <div class="ending-label">—— 完 ——</div>
      <h1 class="ending-title">{clean()}</h1>
      <button class="menu-btn ending-btn" onClick={props.onExit}>
        回到主菜单
      </button>
    </div>
  )
}
