import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { AdminIcon } from './AdminIcon'
export function Notice({
  children,
  success = false,
}: {
  children: ReactNode
  success?: boolean
}) {
  return (
    <p
      className={`cms-notice ${success ? 'success' : ''}`}
      role={success ? 'status' : 'alert'}
    >
      {children}
    </p>
  )
}
export function Busy() {
  return (
    <div className="cms-loading" role="status">
      <span className="cms-loading-spinner" aria-hidden="true" />
      กำลังโหลดข้อมูล…
    </div>
  )
}
export function Pagination({
  offset,
  total,
  onChange,
}: {
  offset: number
  total: number
  onChange(offset: number): void
}) {
  return (
    <div className="cms-pagination">
      <span>
        {total === 0
          ? 'ไม่มีรายการ'
          : `${offset + 1}–${Math.min(offset + 20, total)} จาก ${total} รายการ`}
      </span>
      <button
        disabled={offset === 0}
        onClick={() => onChange(Math.max(0, offset - 20))}
      >
        ก่อนหน้า
      </button>
      <button
        disabled={offset + 20 >= total}
        onClick={() => onChange(offset + 20)}
      >
        ถัดไป
      </button>
    </div>
  )
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string
  children: ReactNode
  onClose(): void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    dialog?.showModal()
    return () => dialog?.close()
  }, [])
  return (
    <dialog
      className="cms-modal"
      ref={ref}
      aria-labelledby="cms-dialog-title"
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
    >
      <header>
        <h2 id="cms-dialog-title">{title}</h2>
        <button onClick={onClose} aria-label="ปิดหน้าต่าง">
          <AdminIcon name="close" />
        </button>
      </header>
      {children}
    </dialog>
  )
}
