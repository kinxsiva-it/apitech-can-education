import { date } from '../../shared/date'
import { useState } from 'react'
import type { Page } from '@apitech/contracts'
import { useResource } from '../../shared/useResource'
import { Busy, Notice, Pagination } from '../../shared/ui'
interface Delivery {
  id: string
  template: string
  status: string
  attempts: number
  created_at: string
  sent_at: string | null
  last_error: string | null
  next_attempt_at: string
}
const labels: Record<string, string> = {
  pending: 'รอส่ง',
  sending: 'กำลังส่ง',
  sent: 'ผู้ให้บริการรับแล้ว',
  failed: 'ส่งไม่สำเร็จ',
  skipped: 'ข้ามรายการเก่า',
}
export default function EmailPage() {
  const [offset, setOffset] = useState(0)
  const { data, error, reload } = useResource<Page<Delivery>>(
    `/admin/email-deliveries?limit=20&offset=${offset}`,
  )
  return (
    <>
      <div className="cms-page-heading">
        <div>
          <p className="cms-eyebrow">DELIVERY MONITOR</p>
          <h1>สถานะอีเมลสมาชิก</h1>
          <p>ติดตามอีเมลผลอนุมัติ/ปฏิเสธ แยกจากอีเมลยืนยันตัวตนของ Supabase</p>
        </div>
        <button onClick={reload}>โหลดล่าสุด ↻</button>
      </div>
      <Notice success>
        ช่วงทดลองพักการส่งอีเมลแจ้งผลอนุมัติ/ปฏิเสธไว้ก่อน
        ผู้สมัครประสานกับผู้ดูแลโดยตรงและตรวจสถานะใน Education ได้
        รายการรอส่งด้านล่างยังไม่ถูกส่ง การอนุมัติใน CMS ยังคงมีผลตามปกติ
        อีเมลยืนยันบัญชีและกู้รหัสผ่านยังใช้ Supabase Auth ตามเดิม
      </Notice>
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
                  <th>สร้างเมื่อ</th>
                  <th>ประเภทอีเมล</th>
                  <th>สถานะ</th>
                  <th>จำนวนครั้ง</th>
                  <th>รายละเอียด</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((row) => (
                  <tr key={row.id}>
                    <td>{date(row.created_at)}</td>
                    <td>
                      {row.template === 'membership_approved'
                        ? 'แจ้งอนุมัติ'
                        : 'แจ้งปฏิเสธ'}
                    </td>
                    <td>
                      <span
                        className={`cms-status ${row.status === 'sent' ? 'approved' : row.status === 'failed' ? 'rejected' : 'pending'}`}
                      >
                        {labels[row.status] || row.status}
                      </span>
                    </td>
                    <td>{row.attempts} / 5</td>
                    <td>
                      {row.sent_at
                        ? date(row.sent_at)
                        : row.last_error
                          ? row.last_error
                          : 'รอ worker ทำงาน'}
                    </td>
                  </tr>
                ))}
                {!data.items.length && (
                  <tr>
                    <td colSpan={5} className="cms-empty">
                      ยังไม่มีรายการอีเมล
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination offset={offset} total={data.total} onChange={setOffset} />
        </div>
      )}
    </>
  )
}
