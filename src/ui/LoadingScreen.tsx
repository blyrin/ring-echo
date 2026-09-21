import { Show } from 'solid-js'
import type { Story } from '../engine/types'

export type LoadPhase =
  | { kind: 'loading'; done: number; total: number; current: string | null }
  | { kind: 'failed'; failed: string[] }

interface LoadingScreenProps {
  story: Story
  phase: LoadPhase
  onRetry: () => void
}

function baseName(rel: string): string {
  return rel.split('/').pop() ?? rel
}

export function LoadingScreen(props: LoadingScreenProps) {
  const percent = () =>
    props.phase.kind === 'loading'
      ? props.phase.total > 0
        ? Math.round((props.phase.done / props.phase.total) * 100)
        : 0
      : 100

  return (
    <div class="loading-screen">
      <h1 class="loading-title">{props.story.meta.title}</h1>
      <div class="loading-subtitle">{props.story.meta.subtitle}</div>
      <Show
        when={props.phase.kind === 'loading'}
        fallback={
          <>
            <div class="loading-error">部分资源加载失败，请重试</div>
            <div class="loading-failed-list">
              {props.phase.kind === 'failed'
                ? props.phase.failed.map(baseName).join('、')
                : ''}
            </div>
            <button class="loading-retry" onClick={props.onRetry}>
              重新加载
            </button>
          </>
        }>
        <div class="loading-bar">
          <div class="loading-bar-fill" style={{ width: `${percent()}%` }} />
        </div>
        <div class="loading-status">
          {props.phase.kind === 'loading' && props.phase.current
            ? `正在加载 ${baseName(props.phase.current)} · `
            : ''}
          {percent()}%
        </div>
      </Show>
    </div>
  )
}
