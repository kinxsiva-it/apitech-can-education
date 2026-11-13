import { date } from '../../shared/date'
import { useState } from 'react'
import type { AuditEntry, Page } from '@apitech/contracts'
import { useResource } from '../../shared/useResource'
import { Busy, Modal, Notice, Pagination } from '../../shared/ui'
export default function AuditPage() {
  const [offset, setOffset] = useState(0),
    [selected, setSelected] = useState<AuditEntry | null>(null)
  const { data, error, reload } = useResource<Page<AuditEntry>>(
    `/admin/audit?limit=20&offset=${offset}`,
  )
  return (
    <>
      <div className="cms-page-heading">
        <div>
          <p className="cms-eyebrow">AUDIT TRAIL</p>
          <h1>ประวัติการทำรายการ</h1>
          <p>
            ข้อมูลบันทึกจากระบบ อ่านได้อย่างเดียว ไม่มีการลบหรือแก้ไขจาก CMS
          </p>
        </div>
        <button onClick={reload}>โหลดล่าสุด ↻</button>
      </div>
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
                  <th>วันเวลา</th>
                  <th>การดำเนินการ</th>
                  <th>ข้อมูลที่เกี่ยวข้อง</th>
                  <th>รายละเอียด</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((row) => (
                  <tr key={row.id}>
                    <td>{date(row.created_at)}</td>
                    <td>
                      <strong>{row.action}</strong>
                      <small>{row.actor_id || 'ระบบ'}</small>
                    </td>
                    <td>
                      {row.entity_type}
                      <small>{row.entity_id}</small>
                    </td>
                    <td>
                      <button onClick={() => setSelected(row)}>
                        ก่อน / หลัง
                      </button>
                    </td>
                  </tr>
                ))}
                {!data.items.length && (
                  <tr>
                    <td colSpan={4} className="cms-empty">
                      ยังไม่มีประวัติ
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination offset={offset} total={data.total} onChange={setOffset} />
        </div>
      )}
      {selected && (
        <Modal title="รายละเอียดประวัติ" onClose={() => setSelected(null)}>
          <p>
            {selected.action} · {date(selected.created_at)}
          </p>
          <h4 className="cms-subheading">ข้อมูลก่อนเปลี่ยน</h4>
          <pre>{JSON.stringify(selected.before_data, null, 2)}</pre>
          <h4 className="cms-subheading">ข้อมูลหลังเปลี่ยน</h4>
          <pre>{JSON.stringify(selected.after_data, null, 2)}</pre>
        </Modal>
      )}
    </>
  )
}
