import { useEffect, useId, useState } from 'react'
import type { InstitutionOption } from '@apitech/contracts'
import { getInstitutions } from '../membership-api'

export function InstitutionField({ value, onChange, other, onOtherChange, disabled = false }: {
  value: string; onChange(value: string): void; other: string; onOtherChange(value: string): void; disabled?: boolean
}) {
  const id = useId()
  const [search, setSearch] = useState('')
  const [options, setOptions] = useState<InstitutionOption[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    let active = true
    // Loading reflects the debounced external search, including retries.
    // oxlint-disable-next-line react/set-state-in-effect
    setLoading(true)
    const timer = setTimeout(() => {
      getInstitutions(search, controller.signal).then((rows) => {
        if (active) { setOptions(rows); setFailed(false) }
      }).catch(() => { if (active) { setOptions([]); setFailed(true) } }).finally(() => { if (active) setLoading(false) })
    }, 250)
    return () => { active = false; clearTimeout(timer); controller.abort() }
  }, [search, retry])

  return <fieldset className="auth-institution" disabled={disabled}><legend>สถาบัน / หน่วยงาน <span>(ไม่บังคับ)</span></legend>
    <label className="auth-sr-only" htmlFor={`${id}-search`}>ค้นหาสถาบัน</label>
    <input id={`${id}-search`} type="search" value={search} placeholder="ค้นหาชื่อสถาบัน" maxLength={200}
      onChange={(event) => { setSearch(event.target.value); onChange('') }} />
    <label className="auth-sr-only" htmlFor={id}>เลือกสถาบัน</label>
    <select id={id} value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">ไม่ระบุสถาบัน</option>
      {value && value !== 'other' && !options.some((row) => row.id === value) && <option value={value}>สถาบันที่เคยเลือกไว้</option>}
      {options.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
      <option value="other">อื่น ๆ — ระบุชื่อเอง</option>
    </select>
    {loading && <small role="status">กำลังโหลดรายชื่อ…</small>}
    {failed && <p className="auth-field-hint">โหลดรายชื่อไม่ได้ คุณสามารถเลือก “อื่น ๆ” หรือเว้นว่างไว้ <button type="button" onClick={() => setRetry((n) => n + 1)}>ลองใหม่</button></p>}
    {value === 'other' && <div className="auth-field"><label htmlFor={`${id}-other`}>ชื่อสถาบัน / หน่วยงาน</label>
      <input id={`${id}-other`} value={other} onChange={(event) => onOtherChange(event.target.value)} required maxLength={200} autoComplete="organization" /></div>}
  </fieldset>
}
