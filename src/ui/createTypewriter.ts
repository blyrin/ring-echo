import { type Accessor, createEffect, createMemo, createSignal, onCleanup } from 'solid-js'

export interface Typewriter {
  shown: Accessor<string>
  done: Accessor<boolean>
  complete: () => void
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
    const timer = window.setInterval(() => {
      setCount((c) => {
        const step = Math.max(1, Math.round((currentCps * 40) / 1000))
        return Math.min(targetLength, c + step)
      })
    }, 40)
    onCleanup(() => window.clearInterval(timer))
  })

  const shown = createMemo(() => text().slice(0, count()))

  return {
    shown,
    done,
    complete: () => setCount(text().length),
  }
}
