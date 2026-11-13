import { useState } from 'react'
import type { Institution, Page } from '@apitech/contracts'
import { api, errorMessage } from '../../lib/http'
import { useResource } from '../../shared/useResource'
import { Busy, Modal, Notice, Pagination } from '../../shared/ui'
export default function InstitutionsPage() {
  const [offset, setOffset] = useState(0),
    [editing, setEditing] = useState<Institution | 'new' | null>(null)
  const [name, setName] = useState(''),
    [active, setActive] = useState(true),
    [busy, setBusy] = useState(false),
    [failure, setFailure] = useState('')
  const { data, error, reload, token } = useResource<Page<Institution>>(
    `/admin/institutions?limit=20&offset=${offset}`,
  )
  function edit(row: Institution | 'new') {
    setEditing(row)
    setName(row === 'new' ? '' : row.name)
    setActive(row === 'new' ? true : row.is_active)
    setFailure('')
  }
  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (busy || !editing) return
    setBusy(true)
    setFailure('')
    try {
      await api(token, '/admin/institutions', {
        body: {
          id: editing === 'new' ? null : editing.id,
          name: name.trim(),
          isActive: active,
          expectedVersion: editing === 'new' ? null : editing.version,
        },
      })
      setEditing(null)
      reload()
    } catch (cause) {
      setFailure(errorMessage(cause))
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <div className="cms-page-heading">
        <div>
          <p className="cms-eyebrow">INSTITUTION DIRECTORY</p>
          <h1>สถาบัน / หน่วยงาน</h1>
          <p>
            รายชื่อสำหรับเลือกในหน้าสมัครสมาชิก
            การปิดใช้งานยังเก็บประวัติเดิมไว้
          </p>
        </div>
        <button className="primary" onClick={() => edit('new')}>
          + เพิ่มสถาบัน
        </button>
      </div>
      <button className="cms-refresh" onClick={reload}>
        โหลดข้อมูลล่าสุด ↻
      </button>
      {error ? (
        <Notice>{error}</Notice>
      ) : !data ? (
        <Busy />
      ) : (
        <div className="cms-panel">
          <div className="cms-table-scroll">
            <table>
              <thead>
                <tr>
                  <th>ชื่อสถาบัน</th>
                  <th>สถานะ</th>
                  <th>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((row) => (
                  <tr key={row.id}>
                    <td>{row.name}</td>
                    <td>
                      <span
                        className={`cms-status ${row.is_active ? 'approved' : 'suspended'}`}
                      >
                        {row.is_active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                      </span>
                    </td>
                    <td>
                      <button onClick={() => edit(row)}>แก้ไข</button>
                    </td>
                  </tr>
                ))}
                {!data.items.length && (
                  <tr>
                    <td colSpan={3} className="cms-empty">
                      ยังไม่มีรายชื่อสถาบัน
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination offset={offset} total={data.total} onChange={setOffset} />
        </div>
      )}
      {editing && (
        <Modal
          title={editing === 'new' ? 'เพิ่มสถาบัน' : 'แก้ไขสถาบัน'}
          onClose={() => {
            if (!busy) setEditing(null)
          }}
        >
          <form className="cms-form" onSubmit={save}>
            <label>
              ชื่อสถาบัน
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={200}
                disabled={busy}
              />
            </label>
            <label className="cms-checkbox">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                disabled={busy}
              />
              เปิดใช้งานในรายการสมัคร
            </label>
            {failure && <Notice>{failure}</Notice>}
            <button className="primary" disabled={busy}>
              บันทึกข้อมูล
            </button>
          </form>
        </Modal>
      )}
    </>
  )
}
