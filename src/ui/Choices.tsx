import { Index } from 'solid-js'
import type { MenuNode } from '../engine/types'

export function Choices(props: { menu: MenuNode; onChoose: (index: number) => void }) {
  return (
    <div class="choices">
      <Index each={props.menu.options}>
        {(option, i) => (
          <button class="choice-card" onClick={() => props.onChoose(i)}>
            {option().text}
          </button>
        )}
      </Index>
    </div>
  )
}
