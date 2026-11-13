import { useId, useRef } from 'react'
export function TextEditor({
  value,
  onChange,
}: {
  value: string
  onChange(value: string): void
}) {
  const id = useId(),
    ref = useRef<HTMLTextAreaElement>(null)
  function insert(prefix: string, suffix = '') {
    const start = ref.current?.selectionStart ?? value.length,
      end = ref.current?.selectionEnd ?? start
    const selection = value.slice(start, end) || 'ข้อความ'
    onChange(
      value.slice(0, start) + prefix + selection + suffix + value.slice(end),
    )
    requestAnimationFrame(() => {
      ref.current?.focus()
      ref.current?.setSelectionRange(
        start + prefix.length,
        start + prefix.length + selection.length,
      )
    })
  }
  return (
    <div>
      <label htmlFor={id}>เนื้อหา</label>
      <div
        className="cms-inline cms-format-tools"
        role="toolbar"
        aria-label="จัดรูปแบบข้อความ"
      >
        <button type="button" onClick={() => insert('**', '**')}>
          ตัวหนา
        </button>
        <button type="button" onClick={() => insert('\n- ')}>
          รายการ
        </button>
        <button
          type="button"
          onClick={() => insert('[', '](https://example.com)')}
        >
          ลิงก์
        </button>
      </div>
      <textarea
        id={id}
        ref={ref}
        className="cms-text-editor"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={20000}
      />
    </div>
  )
}
