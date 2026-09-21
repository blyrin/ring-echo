interface QuickMenuProps {
  auto: boolean
  skip: boolean
  onToggleAuto: () => void
  onToggleSkip: () => void
  onHistory: () => void
  onSave: () => void
  onLoad: () => void
  onSettings: () => void
  onQuit: () => void
}

export function QuickMenu(props: QuickMenuProps) {
  return (
    <div class="quickmenu">
      <button
        class="qm-btn"
        classList={{ active: props.auto }}
        onClick={props.onToggleAuto}>
        自动
      </button>
      <button
        class="qm-btn"
        classList={{ active: props.skip }}
        onClick={props.onToggleSkip}>
        跳过
      </button>
      <button class="qm-btn" onClick={props.onHistory}>
        历史
      </button>
      <button class="qm-btn" onClick={props.onSave}>
        存档
      </button>
      <button class="qm-btn" onClick={props.onLoad}>
        读档
      </button>
      <button class="qm-btn" onClick={props.onSettings}>
        设置
      </button>
      <button class="qm-btn" onClick={props.onQuit}>
        标题
      </button>
    </div>
  )
}
