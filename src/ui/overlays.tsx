import { createSignal, For, type JSX, Show } from 'solid-js'
import { clearSlot, readSlot, SAVE_SLOTS } from '../engine/save'
import type { HistoryEntry } from '../engine/machine'
import type { Story } from '../engine/types'
import { SETTING_DEFS, type Settings, type SettingKey } from '../settings'

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
  onRollback: (index: number) => void
  onReplayVoice: (file: string) => void
  onClose: () => void
}) {
  const items = () => props.history.map((entry, index) => ({ entry, index })).reverse()
  const lastIndex = () => props.history.length - 1
  return (
    <OverlayShell title="历史记录" onClose={props.onClose}>
      <Show when={items().length === 0}>
        <p class="overlay-empty">还没有任何对话。</p>
      </Show>
      <div class="history-list">
        <For each={items()}>
          {({ entry, index }) => {
            const char = entry.who ? props.story.characters[entry.who] : undefined
            const current = () => index === lastIndex()
            return (
              <div class="history-item" classList={{ 'history-current': current() }}>
                <div class="history-head">
                  <Show when={char}>
                    {(c) => (
                      <span class="history-who" style={{ color: c().color }}>
                        {c().name}
                      </span>
                    )}
                  </Show>
                  <span class="history-actions">
                    <Show when={entry.voice}>
                      <button
                        class="mini-btn history-voice"
                        title="重播语音"
                        onClick={() => props.onReplayVoice(entry.voice!)}>
                        语音
                      </button>
                    </Show>
                    <Show when={!current()}>
                      <button
                        class="mini-btn history-back"
                        title="回滚到此句"
                        onClick={() => props.onRollback(index)}>
                        回滚
                      </button>
                    </Show>
                  </span>
                </div>
                <p>{char ? `${char.prefix}${entry.text}${char.suffix}` : entry.text}</p>
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
  const rows = () => (Object.keys(SETTING_DEFS) as SettingKey[]).map((k) => ({ key: k, def: SETTING_DEFS[k] }))
  return (
    <OverlayShell title="设置" onClose={props.onClose}>
      <div class="settings-list">
        <For each={rows()}>
          {({ key, def }) => (
            <SliderRow
              label={def.label}
              value={props.settings[key]}
              min={def.min}
              max={def.max}
              step={def.step}
              display={def.format(props.settings[key])}
              onChange={(v) => props.onChange({ ...props.settings, [key]: v })}
            />
          )}
        </For>
      </div>
    </OverlayShell>
  )
}

export function AboutOverlay(props: { story: Story; onClose: () => void }) {
  const meta = props.story.meta
  return (
    <OverlayShell title="关于" onClose={props.onClose}>
      <div class="about-body">
        <p>《{meta.title} {meta.subtitle}》</p>
        <Show when={meta.repo}>
          <a href={meta.repo} target="_blank" rel="noreferrer">
            {meta.repo}
          </a>
        </Show>
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
            <b>滚轮上 / 下</b> — 后退 / 前进
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
