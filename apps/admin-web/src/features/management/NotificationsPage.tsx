import { date } from '../../shared/date'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { AdminNotification, Page } from '@apitech/contracts'
import { api, errorMessage } from '../../lib/http'
import { useResource } from '../../shared/useResource'
import { Busy, Notice, Pagination } from '../../shared/ui'
export default function NotificationsPage() {
  const [offset, setOffset] = useState(0),
    [failure, setFailure] = useState(''),
    [busy, setBusy] = useState('')
  const { data, error, reload, token } = useResource<
    Page<AdminNotification> & { unread: number }
  >(`/admin/notifications?limit=20&offset=${offset}`)
  const attempted = useRef(new Set<string>())
  useEffect(() => {
    if (!data || !token) return
    const unread = data.items.filter(
      (row) => !row.read_at && !attempted.current.has(`${token}:${row.id}`),
    )
    if (!unread.length) return
    unread.forEach((row) => attempted.current.add(`${token}:${row.id}`))
    let active = true
    // Reading notifications and reviewing applications are separate, independently persisted actions.
    void Promise.allSettled(
      unread.map(async (row) => {
        const updated = await api<boolean>(
          token,
          `/admin/notifications/${row.id}/read`,
          { method: 'PATCH' },
        )
        if (!updated) throw new Error('Notification was not marked read')
      }),
    ).then((results) => {
      const succeeded = results.filter(
        (result) => result.status === 'fulfilled',
      ).length
      if (succeeded) window.dispatchEvent(new Event('cms:notifications-read'))
      if (!active) return
      if (results.some((result) => result.status === 'rejected'))
        setFailure(
          'บันทึกการอ่านบางรายการไม่สำเร็จ กรุณากดทำเครื่องหมายอ่านแล้วเพื่อลองใหม่',
        )
      if (succeeded) reload()
    })
    return () => {
      active = false
    }
  }, [data, token, reload])
  async function read(id: string) {
    setBusy(id)
    setFailure('')
    try {
      const updated = await api<boolean>(
        token,
        `/admin/notifications/${id}/read`,
        { method: 'PATCH' },
      )
      if (!updated) throw new Error('Notification was not marked read')
      reload()
      window.dispatchEvent(new Event('cms:notifications-read'))
    } catch (cause) {
      setFailure(errorMessage(cause))
    } finally {
      setBusy('')
    }
  }
  return (
    <>
      <div className="cms-page-heading">
        <div>
          <p className="cms-eyebrow">INBOX</p>
          <h1>การแจ้งเตือน</h1>
          <p>
            รายการที่เปิดดูจะถูกทำเครื่องหมายอ่านแล้ว
            การอ่านแจ้งเตือนไม่ใช่การอนุมัติคำขอ
          </p>
        </div>
        <button onClick={reload}>โหลดล่าสุด ↻</button>
      </div>
      {failure && <Notice>{failure}</Notice>}
      {error ? (
        <Notice>{error}</Notice>
      ) : !data ? (
        <Busy />
      ) : (
        <div className="cms-panel">
          <ul className="cms-inbox">
            {data.items.map((row) => (
              <li key={row.id} className={row.read_at ? '' : 'unread'}>
                <div>
                  <strong>มีคำขอใช้งานสื่อการสอน</strong>
                  <p>เลขคำขอ: {row.request_id}</p>
                  <small>
                    {date(row.created_at)} ·{' '}
                    {row.read_at ? 'อ่านแล้ว' : 'ยังไม่อ่าน'}
                  </small>
                </div>
                <div className="cms-inline">
                  <Link className="cms-button" to="/requests">
                    ดูคิวคำขอใช้งาน
                  </Link>
                  {!row.read_at && (
                    <button
                      onClick={() => void read(row.id)}
                      disabled={Boolean(busy)}
                    >
                      {busy === row.id
                        ? 'กำลังบันทึก…'
                        : 'ทำเครื่องหมายอ่านแล้ว'}
                    </button>
                  )}
                </div>
              </li>
            ))}
            {!data.items.length && (
              <li className="cms-empty">ยังไม่มีการแจ้งเตือน</li>
            )}
          </ul>
          <Pagination offset={offset} total={data.total} onChange={setOffset} />
        </div>
      )}
    </>
  )
}
