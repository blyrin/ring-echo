import { Index, Show } from 'solid-js'
import type { Story } from '../engine/types'

interface TextBoxProps {
  story: Story
  who: string | null
  shown: string
  done: boolean
  visible: boolean
  instant: boolean
}

export function TextBox(props: TextBoxProps) {
  const char = () => (props.who ? props.story.characters[props.who] : undefined)
  const text = () => {
    const c = char()
    return c ? `${c.prefix}${props.shown}${c.suffix}` : props.shown
  }
  const chars = () => [...text()]

  return (
    <div class="textbox" classList={{ 'textbox-hidden': !props.visible }}>
      <Show when={char()}>
        {(c) => (
          <div class="name-pill" style={{ background: c().color }}>
            {c().name}
          </div>
        )}
      </Show>
      <p class="say-text" classList={{ 'say-instant': props.instant }}>
        <Index each={chars()}>
          {(c, i) => (
            <span
              class="say-char"
              style={props.instant ? { 'animation-delay': `${i * 14}ms` } : undefined}>
              {c()}
            </span>
          )}
        </Index>
      </p>
      <Show when={props.visible && props.done}>
        <span class="next-arrow">▼</span>
      </Show>
    </div>
  )
}
