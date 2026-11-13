import { useId, useState } from 'react'

export function PasswordField({ label, value, onChange, newPassword = false, disabled = false }: {
  label: string; value: string; onChange(value: string): void; newPassword?: boolean; disabled?: boolean
}) {
  const id = useId()
  const [visible, setVisible] = useState(false)
  return <div className="auth-field"><label htmlFor={id}>{label}</label><div className="auth-password">
    <input id={id} type={visible ? 'text' : 'password'} value={value} onChange={(event) => onChange(event.target.value)}
      autoComplete={newPassword ? 'new-password' : 'current-password'} required minLength={newPassword ? 8 : undefined} disabled={disabled} />
    <button type="button" onClick={() => setVisible(!visible)} aria-controls={id} aria-pressed={visible} disabled={disabled}>
      {visible ? 'ซ่อน' : 'แสดง'}</button></div></div>
}
