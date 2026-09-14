import { createEffect, createSignal, Match, on, Show, Switch } from 'solid-js'
import { assetUrl } from '../engine/assets'
import type { SceneState, Story } from '../engine/types'

interface Composite {
  bg: string | null
  sprite: string | null
}

function Backdrop(props: { story: Story; img: string | null }) {
  const def = () => (props.img ? props.story.images[props.img] : undefined)
  return (
    <Switch fallback={<div class="scene-fill" style={{ background: '#000' }} />}>
      <Match when={def()?.kind === 'color'}>
        <div class="scene-fill" style={{ background: (def() as { kind: 'color'; value: string }).value }} />
      </Match>
      <Match when={def()?.kind === 'scene' || def()?.kind === 'sprite'}>
        <img class="scene-fill" src={assetUrl((def() as { src: string }).src)} alt="" draggable={false} />
      </Match>
    </Switch>
  )
}

function Sprite(props: { story: Story; img: string | null }) {
  const def = () => {
    const d = props.img ? props.story.images[props.img] : undefined
    return d?.kind === 'sprite' ? d : undefined
  }
  return (
    <Show when={def()}>
      <img class="bl-sprite" src={assetUrl(def()!.src)} alt="" draggable={false} />
    </Show>
  )
}

interface StageProps {
  story: Story
  scene: SceneState
  transition: 'dissolve' | 'fade' | null
  onTransitionEnd: () => void
  onAdvance: () => void
}

export function Stage(props: StageProps) {
  let prevComposite: Composite = { bg: props.scene.bg, sprite: props.scene.sprite }
  const [leaving, setLeaving] = createSignal<Composite | null>(null)
  const [kind, setKind] = createSignal<'dissolve' | 'fade' | null>(null)

  createEffect(
    on(
      () => [props.scene.bgV, props.scene.spriteV, props.transition] as const,
      ([, , transition]) => {
        if (transition) {
          setLeaving({ ...prevComposite })
          setKind(transition)
        } else {
          setLeaving(null)
          setKind(null)
        }
        prevComposite = { bg: props.scene.bg, sprite: props.scene.sprite }
      },
      { defer: true },
    ),
  )

  return (
    <div class="stage-layers" onClick={props.onAdvance}>
      <Show when={leaving() && kind() === 'dissolve'}>
        <div class="composite comp-leave" aria-hidden="true">
          <Backdrop story={props.story} img={leaving()!.bg} />
          <Sprite story={props.story} img={leaving()!.sprite} />
        </div>
      </Show>
      <div
        class="composite"
        classList={{ 'comp-enter': kind() === 'dissolve' }}
        onAnimationEnd={() => {
          if (kind() === 'dissolve') {
            props.onTransitionEnd()
          }
        }}>
        <Backdrop story={props.story} img={props.scene.bg} />
        <Sprite story={props.story} img={props.scene.sprite} />
      </div>
      <Show when={kind() === 'fade'}>
        <div class="fade-dip" onAnimationEnd={() => props.onTransitionEnd()} />
      </Show>
    </div>
  )
}
