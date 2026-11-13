import { date } from '../../shared/date'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import type { AdminMember, Page } from '@apitech/contracts'
import { useResource } from '../../shared/useResource'
import { api, errorMessage } from '../../lib/http'
import { Busy, Modal, Notice, Pagination } from '../../shared/ui'
const labels: Record<string, string> = {
  pending: 'รออนุมัติ',
  approved: 'อนุมัติแล้ว',
  rejected: 'ไม่ผ่านอนุมัติ',
  suspended: 'ระงับสิทธิ์',
  submitted: 'ส่งคำขอ',
  restored: 'คืนสิทธิ์',
}
interface History {
  id: string
  action: string
  reason: string | null
  created_at: string
  actor_id: string | null
}
function MemberDialog({
  member,
  onClose,
  onSaved,
  onRefresh,
  mode,
}: {
  member: AdminMember
  onClose(): void
  onSaved(): void
  onRefresh(): void
  mode: 'members' | 'requests'
}) {
  const [offset, setOffset] = useState(0)
  const { data, error, token } = useResource<Page<History>>(
    `/admin/members/${member.user_id}/history?limit=20&offset=${offset}`,
  )
  const [action, setAction] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState('')
  const request = member.latest_request
  async function save(event: React.FormEvent) {
    event.preventDefault()
    if (busy || !action) return
    if ((action === 'rejected' || action === 'suspend') && !reason.trim()) {
      setFailure('กรุณาระบุเหตุผล')
      return
    }
    setBusy(true)
    setFailure('')
    try {
      if (action === 'approved' || action === 'rejected') {
        if (!request) return
        await api(token, `/admin/membership-requests/${request.id}`, {
          method: 'PATCH',
          body: {
            decision: action,
            reason: reason.trim() || null,
            expectedVersion: request.version,
          },
        })
      } else
        await api(token, `/admin/members/${member.user_id}/status`, {
          method: 'PATCH',
          body: {
            action,
            reason: reason.trim() || null,
            expectedVersion: member.access_version,
          },
        })
      onSaved()
    } catch (cause) {
      setFailure(errorMessage(cause))
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal
      title={mode === 'requests' ? 'รายละเอียดคำขอใช้งาน' : 'รายละเอียดสมาชิก'}
      onClose={() => {
        if (!busy) onClose()
      }}
    >
      <div className="cms-person">
        <span className="cms-avatar">
          {member.full_name.slice(0, 1) || '?'}
        </span>
        <div>
          <h3>{member.full_name || 'ยังไม่ระบุชื่อ'}</h3>
          <p>{member.email}</p>
          <span className={`cms-status ${member.status}`}>
            {labels[member.status]}
          </span>
        </div>
      </div>
      <dl className="cms-details">
        <div>
          <dt>สถาบันปัจจุบัน</dt>
          <dd>{member.institution_name || 'ไม่ระบุ'}</dd>
        </div>
        <div>
          <dt>ยืนยันอีเมล</dt>
          <dd>{member.email_confirmed ? 'ยืนยันแล้ว' : 'ยังไม่ยืนยัน'}</dd>
        </div>
        <div>
          <dt>คำขอล่าสุด</dt>
          <dd>{request ? `รอบที่ ${request.round_no}` : 'ยังไม่มีคำขอ'}</dd>
        </div>
      </dl>
      {request && (
        <section className="cms-snapshot">
          <h4>ข้อมูล ณ วันที่ส่งคำขอ</h4>
          <p>{request.profile_snapshot.full_name}</p>
          <p>
            {request.profile_snapshot.institution_name ||
              request.profile_snapshot.institution_other ||
              'ไม่ระบุสถาบัน'}
          </p>
          {request.reason && <p>เหตุผลเดิม: {request.reason}</p>}
        </section>
      )}
      {(
        mode === 'requests'
          ? member.status === 'pending'
          : ['approved', 'suspended'].includes(member.status)
      ) ? (
        <form onSubmit={save} className="cms-form">
          <label>
            การดำเนินการ
            <select
              value={action}
              onChange={(e) => {
                setAction(e.target.value)
                setReason('')
              }}
              required
              disabled={busy}
            >
              <option value="">เลือกการดำเนินการ</option>
              {mode === 'requests' &&
                member.status === 'pending' &&
                request?.status === 'pending' &&
                member.email_confirmed && (
                  <>
                    <option value="approved">อนุมัติให้เข้าใช้งาน</option>
                    <option value="rejected">ปฏิเสธคำขอ</option>
                  </>
                )}
              {mode === 'members' && member.status === 'approved' && (
                <option value="suspend">ระงับสิทธิ์</option>
              )}
              {mode === 'members' && member.status === 'suspended' && (
                <option value="restore">คืนสิทธิ์</option>
              )}
            </select>
          </label>
          {action && (
            <>
              <label>
                เหตุผล{' '}
                {action === 'rejected' || action === 'suspend'
                  ? '(บังคับ)'
                  : '(ไม่บังคับ)'}
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  maxLength={2000}
                  required={action === 'rejected' || action === 'suspend'}
                  disabled={busy}
                />
              </label>
              <p className="cms-hint">
                ตรวจข้อมูลก่อนยืนยัน ระบบบันทึกประวัติทุกการเปลี่ยนสถานะ
              </p>
              <button
                className={
                  action === 'rejected' || action === 'suspend'
                    ? 'danger'
                    : 'primary'
                }
                disabled={busy}
              >
                {busy ? 'กำลังบันทึก…' : 'ยืนยันการดำเนินการ'}
              </button>
            </>
          )}
          {failure && (
            <>
              <Notice>{failure}</Notice>
              <button type="button" onClick={onRefresh} disabled={busy}>
                ปิดและโหลดข้อมูลล่าสุด
              </button>
            </>
          )}
        </form>
      ) : (
        <div className="cms-snapshot cms-membership-guidance">
          <p>
            {member.status === 'rejected'
              ? 'คำขอนี้ไม่ผ่านการอนุมัติ รอผู้สมัครแก้ไขข้อมูลและส่งคำขอใหม่'
              : 'บัญชีนี้ยังไม่มีสิทธิ์ใช้งาน การอนุมัติหรือปฏิเสธให้ดำเนินการในหน้าคำขอใช้งาน'}
          </p>
          {mode === 'members' && (
            <Link className="cms-button" to="/requests">
              ไปหน้าคำขอใช้งาน
            </Link>
          )}
        </div>
      )}
      <h4 className="cms-subheading">ประวัติการพิจารณา</h4>
      {error ? (
        <Notice>{error}</Notice>
      ) : !data ? (
        <Busy />
      ) : (
        <>
          <ul className="cms-timeline">
            {data.items.map((row) => (
              <li key={row.id}>
                <strong>{labels[row.action] || row.action}</strong>
                <time>{date(row.created_at)}</time>
                {row.reason && <p>{row.reason}</p>}
                <small>ผู้ทำรายการ: {row.actor_id || 'ระบบ'}</small>
              </li>
            ))}
          </ul>
          <Pagination offset={offset} total={data.total} onChange={setOffset} />
        </>
      )}
    </Modal>
  )
}
export default function MembersPage({
  mode = 'members',
}: {
  mode?: 'members' | 'requests'
}) {
  const [params] = useSearchParams()
  const isRequests = mode === 'requests'
  const [status, setStatus] = useState(() =>
      isRequests ? 'pending' : params.get('status') === 'all' ? '' : 'approved',
    ),
    [search, setSearch] = useState(''),
    [draft, setDraft] = useState(''),
    [offset, setOffset] = useState(0)
  const [selected, setSelected] = useState<AdminMember | null>(null),
    [success, setSuccess] = useState(false)
  const { data, error, reload } = useResource<Page<AdminMember>>(
    `/admin/members?limit=20&offset=${offset}&search=${encodeURIComponent(search)}${status ? `&status=${status}` : ''}`,
  )
  function saved() {
    setSelected(null)
    setSuccess(true)
    reload()
    window.dispatchEvent(new Event('cms:mutated'))
  }
  return (
    <>
      <div className="cms-page-heading">
        <div>
          <p className="cms-eyebrow">
            {isRequests ? 'ACCESS REQUESTS' : 'MEMBER DIRECTORY'}
          </p>
          <h1>{isRequests ? 'คำขอใช้งาน' : 'สมาชิก'}</h1>
          <p>
            {isRequests
              ? 'พิจารณาอนุมัติหรือปฏิเสธผู้สมัคร เลขคิวจะค้างจนกว่าจะพิจารณา ไม่ขึ้นกับการอ่านแจ้งเตือน'
              : 'ดูข้อมูลและจัดการระงับหรือคืนสิทธิ์สมาชิก การอนุมัติผู้สมัครอยู่ในหน้าคำขอใช้งาน'}
          </p>
        </div>
        <button onClick={reload}>โหลดล่าสุด ↻</button>
      </div>
      {success && (
        <Notice success>
          {isRequests ? 'บันทึกผลการพิจารณาคำขอแล้ว' : 'บันทึกสถานะสมาชิกแล้ว'}
        </Notice>
      )}
      <div className="cms-filters">
        <label>
          สถานะ
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              setOffset(0)
            }}
          >
            {!isRequests && (
              <option value="">บัญชีทั้งหมด (รวมผู้สมัคร)</option>
            )}
            {Object.entries(labels)
              .filter(([key]) =>
                isRequests
                  ? ['pending', 'rejected'].includes(key)
                  : ['approved', 'suspended'].includes(key),
              )
              .map(([key, value]) => (
                <option key={key} value={key}>
                  {value}
                </option>
              ))}
          </select>
        </label>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            setSearch(draft.trim())
            setOffset(0)
          }}
        >
          <label>
            ค้นหาชื่อหรืออีเมล
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="ชื่อ หรือ email@example.com"
              maxLength={200}
            />
          </label>
          <button>ค้นหา</button>
        </form>
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
                  <th>{isRequests ? 'ผู้สมัคร' : 'สมาชิก'}</th>
                  <th>สถาบัน</th>
                  <th>{isRequests ? 'ผลการพิจารณา' : 'สถานะบัญชี'}</th>
                  <th>{isRequests ? 'รอบคำขอ' : 'คำขอล่าสุด'}</th>
                  <th>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {data.items.length ? (
                  data.items.map((row) => (
                    <tr key={row.user_id}>
                      <td>
                        <strong>{row.full_name || 'ยังไม่ระบุชื่อ'}</strong>
                        <small>{row.email || 'ไม่มีอีเมล'}</small>
                      </td>
                      <td>{row.institution_name || 'ไม่ระบุ'}</td>
                      <td>
                        <span className={`cms-status ${row.status}`}>
                          {labels[row.status]}
                        </span>
                        {!row.email_confirmed && (
                          <small>ยังไม่ยืนยันอีเมล</small>
                        )}
                      </td>
                      <td>
                        {row.latest_request
                          ? `รอบที่ ${row.latest_request.round_no}`
                          : '—'}
                      </td>
                      <td>
                        <button
                          onClick={() => {
                            setSuccess(false)
                            setSelected(row)
                          }}
                        >
                          {isRequests ? 'ดูคำขอ' : 'ดูสมาชิก'}
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="cms-empty">
                      {isRequests
                        ? 'ไม่มีคำขอในสถานะนี้'
                        : 'ไม่พบสมาชิกในรายการนี้'}
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
        <MemberDialog
          mode={mode}
          member={selected}
          onClose={() => setSelected(null)}
          onSaved={saved}
          onRefresh={() => {
            setSelected(null)
            setSuccess(false)
            reload()
          }}
        />
      )}
    </>
  )
}
