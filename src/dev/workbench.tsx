import { createEffect, createMemo, createSignal, For, onCleanup, onMount, Show } from 'solid-js'
import { render } from 'solid-js/web'
import type { Story, SayNode } from '../engine/types'

const STORY_URL = `${import.meta.env.BASE_URL}src/assets/story.json`

interface Draft {
  text: string
  scene: string
}

const [open, setOpen] = createSignal(false)

function audioUrl(file: string) {
  return import.meta.env.BASE_URL + file
}

function workbenchCss() {
  return `
#dev-workbench-host {
  position: fixed;
  left: 20px;
  bottom: 20px;
  z-index: 9999;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  color: #e5e7eb;
}

.vw-launcher {
  background: rgba(31, 41, 55, 0.9);
  color: #f3f4f6;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 999px;
  padding: 8px 20px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.025em;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.05);
  transition: all 0.2s ease;
}

.vw-launcher:hover {
  background: #374151;
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1);
}

.vw-mask {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.85);
  display: flex;
  flex-direction: column;
}

.vw-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 32px;
  background: rgba(15, 23, 42, 0.95);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  flex: none;
}

.vw-head h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #fff;
  letter-spacing: 0.5px;
}

.vw-head .vw-tip {
  color: #94a3b8;
  font-size: 13px;
  font-weight: 400;
}

.vw-body {
  display: flex;
  flex: 1;
  min-height: 0;
  gap: 1px;
  background: rgba(255, 255, 255, 0.05);
}

.vw-list {
  width: 500px;
  flex: none;
  display: flex;
  flex-direction: column;
  background: #0f172a;
  box-shadow: 4px 0 24px rgba(0, 0, 0, 0.2);
}

.vw-filter {
  display: flex;
  gap: 8px;
  padding: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  background: #0f172a;
  position: sticky;
  top: 0;
  z-index: 10;
}

.vw-filter select, .vw-filter input {
  background: #1e293b;
  color: #e2e8f0;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 6px 10px;
  font: inherit;
  outline: none;
  transition: border-color 0.2s;
}

.vw-filter select:focus, .vw-filter input:focus {
  border-color: #60a5fa;
}

.vw-filter input {
  flex: 1;
}

.vw-filter label {
  color: #94a3b8;
  font-size: 12px;
  display: flex;
  gap: 6px;
  align-items: center;
  cursor: pointer;
}

.vw-items {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 8px;
}

.vw-items::-webkit-scrollbar {
  width: 6px;
}

.vw-items::-webkit-scrollbar-thumb {
  background: #334155;
  border-radius: 3px;
}

.vw-items::-webkit-scrollbar-track {
  background: transparent;
}

.vw-item {
  padding: 10px 12px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  gap: 10px;
  align-items: center;
  /* Baseline -> Center for cleaner look */
  color: #cbd5e1;
  transition: background 0.15s;
  border: 1px solid transparent;
}

.vw-item:hover {
  background: rgba(255, 255, 255, 0.03);
}

.vw-item.vw-active {
  background: rgba(37, 99, 235, 0.15);
  color: #fff;
  border-color: rgba(37, 99, 235, 0.3);
}

.vw-dot {
  flex: none;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #334155;
}

.vw-dot.vw-has {
  background: #10b981;
  box-shadow: 0 0 8px rgba(16, 185, 129, 0.4);
}

.vw-dot.vw-missing {
  background: #ef4444;
}

.vw-who {
  flex: none;
  color: #60a5fa;
  font-size: 11px;
  font-weight: 600;
  width: 2.5em;
  text-transform: uppercase;
}

.vw-item.vw-active .vw-who {
  color: #93c5fd;
}

.vw-editor {
  flex: 1;
  overflow-y: auto;
  padding: 32px 40px;
  background: #1e293b;
  display: flex;
  flex-direction: column;
}

.vw-editor-inner {
  max-width: 800px;
  width: 100%;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.vw-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
  font-size: 15px;
  font-weight: 500;
}

.vw-meta {
  color: #94a3b8;
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  align-items: center;
  font-size: 13px;
  padding-bottom: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  margin-bottom: 4px;
}

.vw-meta code {
  color: #e2e8f0;
  background: rgba(0, 0, 0, 0.3);
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-family: monospace;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.vw-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  background: rgba(255, 255, 255, 0.05);
  color: #94a3b8;
  border: 1px solid transparent;
}

.vw-badge.vw-has {
  color: #34d399;
  background: rgba(16, 185, 129, 0.1);
  border-color: rgba(16, 185, 129, 0.2);
}

.vw-badge.vw-missing {
  color: #f87171;
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.2);
}

.vw-editor label {
  color: #94a3b8;
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 6px;
  display: block;
}

.vw-editor textarea, .vw-editor input {
  width: 100%;
  box-sizing: border-box;
  background: rgba(15, 23, 42, 0.6);
  color: #f1f5f9;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 10px 14px;
  font: inherit;
  line-height: 1.6;
  resize: vertical;
  transition: all 0.2s;
}

.vw-editor textarea:focus, .vw-editor input:focus {
  outline: none;
  border-color: #3b82f6;
  background: rgba(15, 23, 42, 0.9);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

.vw-foot {
  position: sticky;
  bottom: 0;
  background: linear-gradient(to top, #1e293b 80%, rgba(30, 41, 59, 0));
  padding: 24px 0 10px;
  margin-top: auto;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.vw-toolbar {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.vw-toolbar button {
  border: none;
  color: #fff;
  border-radius: 6px;
  padding: 9px 16px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.vw-toolbar button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2);
}

.vw-toolbar button:active:not(:disabled) {
  transform: translateY(0);
}

.vw-toolbar button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
}

.vw-toolbar button:not(.vw-ghost):not(.vw-warn) {
  background: #2563eb;
}

.vw-toolbar button:not(.vw-ghost):not(.vw-warn):hover:not(:disabled) {
  background: #3b82f6;
}

.vw-toolbar button.vw-ghost {
  background: rgba(255, 255, 255, 0.05);
  color: #cbd5e1;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.vw-toolbar button.vw-ghost:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.vw-toolbar button.vw-warn {
  background: #b91c1c;
  color: #fecaca;
}

.vw-toolbar button.vw-warn:hover:not(:disabled) {
  background: #dc2626;
}

.vw-status {
  min-height: 20px;
  font-size: 13px;
  margin-top: 12px;
  font-weight: 500;
}

.vw-status.vw-ok {
  color: #34d399;
}

.vw-status.vw-err {
  color: #f87171;
}

.vw-status.vw-busy {
  color: #fbbf24;
}

.vw-warnbox {
  color: #fcd34d;
  font-size: 13px;
  line-height: 1.6;
  background: rgba(252, 211, 77, 0.08);
  border: 1px solid rgba(252, 211, 77, 0.2);
  border-left: 3px solid #fbbf24;
  border-radius: 6px;
  padding: 10px 14px;
}`
}

function Workbench() {
  const [story, setStory] = createSignal<Story | null>(null)
  const [loadError, setLoadError] = createSignal('')
  const [existing, setExisting] = createSignal<Set<string>>(new Set())
  const [sel, setSel] = createSignal<number | null>(null)
  const [draft, setDraft] = createSignal<Draft>({ text: '', scene: '' })
  const [status, setStatus] = createSignal<{ kind: 'idle' | 'busy' | 'ok' | 'err'; msg: string }>(
    { kind: 'idle', msg: '' })
  const [whoFilter, setWhoFilter] = createSignal('')
  const [onlyMissing, setOnlyMissing] = createSignal(false)
  const [query, setQuery] = createSignal('')

  let audioEl: HTMLAudioElement | undefined

  const voiceNodes = createMemo(() => {
    const s = story()
    if (!s) return []
    const list: { index: number; node: SayNode }[] = []
    s.nodes.forEach((node, index) => {
      if (node.t === 'say' && node.voice) list.push({ index, node })
    })
    return list
  })

  const whoList = createMemo(() => {
    const s = story()
    if (!s) return []
    return [...new Set(voiceNodes().map((v) => v.node.who ?? ''))]
  })

  const filtered = createMemo(() => {
    const q = query().trim()
    return voiceNodes().filter((v) => {
      const who = v.node.who ?? ''
      if (whoFilter() && who !== whoFilter()) return false
      if (onlyMissing() && existing().has(v.node.voice!.file)) return false
      if (q) {
        const hay = `${v.node.text} ${v.node.voice!.scene ?? ''} ${v.node.voice!.file}`
        if (!hay.includes(q)) return false
      }
      return true
    })
  })

  const current = createMemo(() => {
    const index = sel()
    const s = story()
    if (index === null || !s) return null
    const node = s.nodes[index]
    return node && node.t === 'say' && node.voice ? { index, node } : null
  })

  const missingCount = createMemo(() => voiceNodes().filter((v) => !existing().has(v.node.voice!.file)).length)

  const warnings = createMemo(() => {
    const c = current()
    if (!c) return []
    const list: string[] = []
    const d = draft()
    if (!d.scene.trim()) list.push('scene 为空，生成脚本会校验失败')
    const file = c.node.voice!.file
    const name = file.split('/').pop() ?? ''
    if (!new RegExp(`^${c.node.who ?? ''}_\\d{4}\\.ogg$`).test(name) || file !== `audio/voice/${c.node.who}/${name}`) {
      list.push('配音文件路径不符合 audio/voice/<who>/<who>_NNNN.ogg 约定')
    }
    return list
  })

  async function probe(files: string[]) {
    const next = new Set(existing())
    await Promise.all(
      files.map(async (f) => {
        try {
          const r = await fetch(audioUrl(f), { method: 'HEAD' })
          if (r.ok) {
            next.add(f)
          } else {
            next.delete(f)
          }
        } catch {
          next.delete(f)
        }
      }),
    )
    setExisting(new Set(next))
  }

  async function loadStory() {
    try {
      const res = await fetch(`${STORY_URL}?t=${Date.now()}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: Story = JSON.parse(await res.text())
      setStory(data)
      setLoadError('')
      void probe(
        [...new Set(data.nodes.filter((n): n is SayNode => n.t === 'say' && !!n.voice).map((n) => n.voice!.file))])
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : String(err))
    }
  }

  onMount(loadStory)

  function select(index: number) {
    stopAudio()
    setSel(index)
    setStatus({ kind: 'idle', msg: '' })
    const node = story()!.nodes[index] as SayNode
    setDraft({
      text: node.text,
      scene: node.voice?.scene ?? '',
    })
  }

  function buildNode(): SayNode {
    const src = current()!.node
    const d = draft()
    const voice: { file: string; scene: string } = {
      file: src.voice!.file,
      scene: d.scene,
    }
    return { ...src, text: d.text, voice }
  }

  async function save(): Promise<boolean> {
    const c = current()
    if (!c) return false
    const node = buildNode()
    const res = await fetch('/__workbench/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ index: c.index, node }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data.ok) {
      setStatus({ kind: 'err', msg: `保存失败：${data.error ?? res.status}` })
      return false
    }
    setStory((s) => {
      if (!s) return s
      const nodes = [...s.nodes]
      nodes[c.index] = node
      return { ...s, nodes }
    })
    setStatus({ kind: 'ok', msg: '已保存' })
    return true
  }

  async function generate(force: boolean) {
    const c = current()
    if (!c || status().kind === 'busy') return
    setStatus({ kind: 'busy', msg: force ? '正在重新生成…（约需十几秒）' : '正在生成…（约需十几秒）' })
    if (!(await save())) return
    const res = await fetch('/__workbench/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ index: c.index, force }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data.ok) {
      setStatus({ kind: 'err', msg: `生成失败：${data.error ?? res.status}` })
      return
    }
    await probe([data.file])
    setStatus({ kind: 'ok', msg: '已生成，可试听' })
    void play()
  }

  function play() {
    const c = current()
    if (!c) return
    stopAudio()
    const el = new Audio(audioUrl(c.node.voice!.file))
    audioEl = el
    el.volume = 0.5
    el.play().catch(() => setStatus({ kind: 'err', msg: '音频播放失败（可能尚未生成）' }))
  }

  function stopAudio() {
    audioEl?.pause()
    audioEl = undefined
  }

  function togglePlay() {
    if (audioEl) {
      stopAudio()
    } else {
      play()
    }
  }

  createEffect(() => {
    if (!open()) return
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        void save()
      }
    }
    document.addEventListener('keydown', onKey)
    onCleanup(() => document.removeEventListener('keydown', onKey))
  })

  const busy = () => status().kind === 'busy'

  return (
    <>
      <style>{workbenchCss()}</style>
      <button type="button" class="vw-launcher" onClick={() => setOpen(!open())}>配音工作台</button>
      <Show when={open()}>
        <div class="vw-mask">
          <div class="vw-head">
            <h2>配音工作台</h2>
            <span class="vw-tip">
              台词 {voiceNodes().length} 条 · 缺音频 {missingCount()} 条，按 F5 刷新游戏生效
            </span>
            <button type="button" class="vw-launcher" onClick={() => setOpen(false)}>
              关闭
            </button>
          </div>
          <div class="vw-body">
            <div class="vw-list">
              <div class="vw-filter">
                <select value={whoFilter()} onChange={(e) => setWhoFilter(e.currentTarget.value)}>
                  <option value="">全部角色</option>
                  <For each={whoList()}>{(who) => <option value={who}>{who}</option>}</For>
                </select>
                <label>
                  <input type="checkbox"
                         checked={onlyMissing()}
                         onChange={(e) => setOnlyMissing(e.currentTarget.checked)} />
                  只看缺音频
                </label>
                <input type="search"
                       placeholder="搜索台词/scene"
                       value={query()}
                       onInput={(e) => setQuery(e.currentTarget.value)} />
              </div>
              <div class="vw-items">
                <For each={filtered()}>
                  {(v) => (
                    <div
                      class="vw-item"
                      classList={{ 'vw-active': sel() === v.index }}
                      onClick={() => select(v.index)}>
                    <span class="vw-dot"
                          classList={{
                            'vw-has': existing().has(v.node.voice!.file),
                            'vw-missing': !existing().has(v.node.voice!.file),
                          }} />
                      <span class="vw-who">{v.node.who}</span>
                      <span>{v.node.text}</span>
                    </div>
                  )}
                </For>
              </div>
            </div>
            <Show
              when={current()}
              fallback={<div class="vw-empty">{loadError()
                ? `剧本加载失败：${loadError()}`
                : '← 从左侧选择一条台词'}</div>}>
              <div class="vw-editor">
                <div class="vw-editor-inner">
                  <div class="vw-meta">
                    <span>角色：{current()!.node.who}</span>
                    <span>
                    文件：<code>{current()!.node.voice!.file}</code>
                  </span>
                    <span
                      class="vw-badge"
                      classList={{
                        'vw-has': existing().has(current()!.node.voice!.file),
                        'vw-missing': !existing().has(current()!.node.voice!.file),
                      }}>
                    {existing().has(current()!.node.voice!.file) ? '已有音频' : '缺音频'}
                  </span>
                  </div>
                  <label>台词</label>
                  <textarea rows={2}
                            value={draft().text}
                            onInput={(e) => setDraft({ ...draft(), text: e.currentTarget.value })} />
                  <label>场景 scene（给 TTS 的情境描述）</label>
                  <textarea rows={3}
                            value={draft().scene}
                            onInput={(e) => setDraft({ ...draft(), scene: e.currentTarget.value })} />
                  <Show when={warnings().length > 0}>
                    <div class="vw-warnbox">
                      ⚠ <For each={warnings()}>{(w, i) => <>{i() > 0 && '；'}{w}</>}</For>
                    </div>
                  </Show>
                  <div class="vw-foot">
                    <div class="vw-toolbar">
                      <button type="button" disabled={busy()} onClick={() => void save()}>
                        保存（Ctrl+S）
                      </button>
                      <button type="button" disabled={busy()} onClick={() => void generate(false)}>
                        保存并生成
                      </button>
                      <button type="button" class="vw-warn" disabled={busy()} onClick={() => void generate(true)}>
                        强制重新生成
                      </button>
                      <button type="button"
                              class="vw-ghost"
                              disabled={!existing().has(current()!.node.voice!.file)}
                              onClick={togglePlay}>
                        试听 / 停止
                      </button>
                    </div>
                    <div class="vw-status"
                         classList={{
                           'vw-ok': status().kind === 'ok',
                           'vw-err': status().kind === 'err',
                           'vw-busy': busy(),
                         }}>
                      {status().msg}
                    </div>
                  </div>
                </div>
              </div>
            </Show>
          </div>
        </div>
      </Show>
    </>
  )
}

export function mount() {
  if (document.getElementById('dev-workbench-host')) return
  const host = document.createElement('div')
  host.id = 'dev-workbench-host'
  document.body.appendChild(host)
  render(() => <Workbench />, host)
}
