import { type Accessor, createEffect, createMemo, createSignal, onCleanup, untrack } from 'solid-js'

export interface Typewriter {
  shown: Accessor<string>
  done: Accessor<boolean>
  complete: () => void
}

function charDelay(cps: number): number {
  return 1000 / Math.max(1, cps)
}

export function createTypewriter(
  text: Accessor<string>,
  id: Accessor<number>,
  cps: Accessor<number>,
  instant: Accessor<boolean>,
): Typewriter {
  const [count, setCount] = createSignal(instant() ? text().length : 0)
  let prevId = id()

  createEffect(() => {
    const currentId = id()
    const currentText = text()
    const isInstant = instant()
    const idChanged = prevId !== currentId
    prevId = currentId

    if (isInstant) {
      setCount(currentText.length)
      return
    }
    setCount((c) => (idChanged ? 0 : Math.min(c, currentText.length)))
  })

  const done = createMemo(() => count() >= text().length)

  createEffect(() => {
    if (instant() || done()) {
      return
    }
    const currentCps = cps()
    const targetLength = text().length
    let timer = 0

    const step = (from: number) => {
      if (from >= targetLength) {
        return
      }
      const delay = charDelay(currentCps)
      timer = window.setTimeout(() => {
        setCount(from + 1)
        step(from + 1)
      }, delay)
    }

    step(untrack(count))
    onCleanup(() => window.clearTimeout(timer))
  })

  const shown = createMemo(() => text().slice(0, count()))

  return {
    shown,
    done,
    complete: () => setCount(text().length),
  }
}
