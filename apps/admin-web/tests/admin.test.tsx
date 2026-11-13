import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Session } from '@supabase/supabase-js'
import type { ContentState } from '@apitech/contracts'
const auth = vi.hoisted(() => ({
  session: null as Session | null,
  listener: null as ((event: string, session: Session | null) => void) | null,
  signIn: vi.fn(),
  signOut: vi.fn(),
}))
vi.mock('../src/lib/supabase', () => ({
  ADMIN_AUTH_KEY: 'admin-test-auth',
  supabase: {
    auth: {
      getSession: () =>
        Promise.resolve({ data: { session: auth.session }, error: null }),
      onAuthStateChange: (callback: typeof auth.listener) => {
        auth.listener = callback
        return {
          data: {
            subscription: {
              unsubscribe: () => {
                auth.listener = null
              },
            },
          },
        }
      },
      signInWithPassword: auth.signIn,
      signOut: auth.signOut,
    },
  },
}))
import App from '../src/app/App'
import { ContentBody } from '@apitech/content-ui'
const adminId = '00000000-0000-4000-8000-000000000001',
  userId = '00000000-0000-4000-8000-000000000002',
  requestId = '10000000-0000-4000-8000-000000000001'
let role = 'admin',
  status = 'approved',
  failed = false
let calls: { path: string; body?: Record<string, unknown> }[]
let state: ContentState
let hasNotification = false,
  notificationRead = false
beforeEach(() => {
  window.history.replaceState({}, '', '/')
  auth.session = null
  role = 'admin'
  status = 'approved'
  failed = false
  calls = []
  hasNotification = false
  notificationRead = false
  state = { key: 'education', version: 1, draft: null, published: null }
  auth.signIn.mockReset().mockImplementation(async () => {
    auth.listener?.('SIGNED_IN', {
      access_token: 'admin-token',
      user: { id: adminId, email: 'admin@example.test' },
    } as Session)
    return { error: null }
  })
  auth.signOut.mockReset().mockImplementation(async () => ({ error: null }))
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open')
  }
  vi.stubGlobal(
    'fetch',
    vi.fn(async (path: string, init?: RequestInit) => {
      const url = new URL(path, 'http://localhost'),
        body =
          typeof init?.body === 'string' ? JSON.parse(init.body) : undefined
      calls.push({ path: url.pathname, body })
      if (url.pathname === '/api/members/me')
        return Response.json(
          failed
            ? {}
            : {
                user_id: adminId,
                role,
                status,
                version: 1,
                email_confirmed: true,
                can_access_education: status === 'approved',
                latest_request: null,
              },
          { status: failed ? 503 : 200 },
        )
      if (url.pathname === '/api/admin/notifications')
        return Response.json({
          items: hasNotification
            ? [
                {
                  id: requestId,
                  request_id: requestId,
                  created_at: '2026-11-14T00:00:00Z',
                  read_at: notificationRead ? '2026-11-14T01:00:00Z' : null,
                },
              ]
            : [],
          total: hasNotification ? 1 : 0,
          unread: hasNotification && !notificationRead ? 1 : 0,
          limit: 20,
          offset: 0,
        })
      if (url.pathname === `/api/admin/notifications/${requestId}/read`) {
        notificationRead = true
        return Response.json(true)
      }
      if (url.pathname === '/api/admin/members')
        return Response.json({
          items: [
            {
              user_id: userId,
              full_name: 'Teacher',
              email: 'teacher@example.test',
              email_confirmed: true,
              institution_name: 'Institute',
              status: 'pending',
              access_version: 2,
              profile_revision: 1,
              latest_request: {
                id: requestId,
                status: 'pending',
                version: 1,
                round_no: 1,
                reason: null,
                profile_snapshot: {
                  full_name: 'Teacher',
                  institution_name: 'Institute',
                },
              },
            },
          ],
          total: 1,
          limit: 20,
          offset: 0,
        })
      if (
        url.pathname.endsWith('/history') ||
        url.pathname.endsWith('/versions')
      )
        return Response.json({ items: [], total: 0, limit: 20, offset: 0 })
      if (url.pathname.includes('/membership-requests/'))
        return Response.json({ ok: true })
      if (url.pathname === '/api/admin/content/education')
        return Response.json(state)
      if (url.pathname.endsWith('/draft')) {
        state = {
          ...state,
          version: 2,
          draft: {
            id: 1,
            collection_key: 'education',
            document: body.document,
            created_by: adminId,
            created_at: '2026-11-13T00:00:00Z',
          },
        }
        return Response.json(state)
      }
      if (url.pathname.endsWith('/publish')) {
        state = { ...state, version: 3, published: state.draft }
        return Response.json(state)
      }
      throw new Error(`Unexpected API path ${url.pathname}`)
    }),
  )
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

it('renders pasted HTML as text and never creates script or javascript links', () => {
  const { container } = render(
    <ContentBody
      document={{
        lessons: [
          {
            id: 'lesson',
            title: 'Safe lesson',
            summary: '',
            topics: [
              {
                id: 'topic',
                title: 'Safe topic',
                blocks: [
                  {
                    id: 'block',
                    type: 'text',
                    text: '<script>bad()</script> [bad](javascript:alert(1)) **bold**',
                    assetId: null,
                    alt: '',
                  },
                ],
              },
            ],
          },
        ],
      }}
      renderImage={() => null}
    />,
  )
  expect(container.querySelector('script')).toBeNull()
  expect(container.querySelector('a')).toBeNull()
  expect(container.querySelector('strong')?.textContent).toBe('bold')
  expect(container.textContent).toContain('<script>bad()</script>')
})
function signedIn() {
  auth.session = {
    access_token: 'admin-token',
    user: { id: adminId, email: 'admin@example.test' },
  } as Session
}
it('shows Admin login to a guest and opens the workspace after API verification', async () => {
  render(<App />)
  await screen.findByRole('heading', { name: 'เข้าสู่ระบบผู้ดูแล' })
  fireEvent.change(screen.getByLabelText('อีเมล'), {
    target: { value: 'admin@example.test' },
  })
  fireEvent.change(screen.getByLabelText('รหัสผ่าน'), {
    target: { value: 'example-password' },
  })
  await userEvent.click(screen.getByRole('button', { name: 'เข้าสู่ระบบ →' }))
  expect(
    await screen.findByRole('heading', { name: 'พร้อมดูแลห้องเรียนของคุณ' }),
  ).toBeTruthy()
})
it.each([
  ['instructor', 'approved'],
  ['admin', 'suspended'],
])('blocks %s with status %s', async (r, s) => {
  signedIn()
  role = r
  status = s
  render(<App />)
  expect(
    await screen.findByRole('heading', { name: 'บัญชีนี้ไม่มีสิทธิ์ผู้ดูแล' }),
  ).toBeTruthy()
  expect(calls.filter((c) => c.path.startsWith('/api/admin/'))).toHaveLength(0)
})
it('fails closed when account authorization is unavailable', async () => {
  signedIn()
  failed = true
  render(<App />)
  expect(
    await screen.findByRole('heading', { name: 'ตรวจสอบสิทธิ์ไม่ได้' }),
  ).toBeTruthy()
})
it('submits an approval with the request version, not a client role', async () => {
  signedIn()
  window.history.replaceState({}, '', '/requests')
  render(<App />)
  await userEvent.click(await screen.findByRole('button', { name: 'ดูคำขอ' }))
  await userEvent.selectOptions(
    screen.getByLabelText('การดำเนินการ'),
    'approved',
  )
  await userEvent.click(
    screen.getByRole('button', { name: 'ยืนยันการดำเนินการ' }),
  )
  await waitFor(() =>
    expect(
      calls.find((c) => c.path.includes('/membership-requests/'))?.body,
    ).toEqual({ decision: 'approved', reason: null, expectedVersion: 1 }),
  )
})
it('requires a rejection reason before sending the mutation', async () => {
  signedIn()
  window.history.replaceState({}, '', '/requests')
  render(<App />)
  await userEvent.click(await screen.findByRole('button', { name: 'ดูคำขอ' }))
  await userEvent.selectOptions(
    screen.getByLabelText('การดำเนินการ'),
    'rejected',
  )
  await userEvent.click(
    screen.getByRole('button', { name: 'ยืนยันการดำเนินการ' }),
  )
  expect(
    calls.find((c) => c.path.includes('/membership-requests/')),
  ).toBeUndefined()
})
it('reading notifications clears unread count while pending requests remain outstanding', async () => {
  signedIn()
  hasNotification = true
  window.history.replaceState({}, '', '/notifications')
  render(<App />)
  await screen.findByRole('heading', { name: 'การแจ้งเตือน' })
  await waitFor(() => expect(notificationRead).toBe(true))
  expect(
    await screen.findByRole('link', {
      name: 'การแจ้งเตือน 0 รายการที่ยังไม่อ่าน',
    }),
  ).toBeTruthy()
  expect(
    await screen.findByRole('link', { name: 'คำขอใช้งาน รออนุมัติ 1 รายการ' }),
  ).toBeTruthy()
  expect(
    calls.some((call) => call.path.includes('/membership-requests/')),
  ).toBe(false)
  expect(
    screen.getByRole('link', { name: 'ดูคิวคำขอใช้งาน' }).getAttribute('href'),
  ).toBe('/requests')
})
it('a pending account in the directory directs review to the separate requests page', async () => {
  signedIn()
  window.history.replaceState({}, '', '/members?status=all')
  render(<App />)
  await userEvent.click(await screen.findByRole('button', { name: 'ดูสมาชิก' }))
  expect(screen.queryByLabelText('การดำเนินการ')).toBeNull()
  expect(
    screen.getByRole('link', { name: 'ไปหน้าคำขอใช้งาน' }).getAttribute('href'),
  ).toBe('/requests')
})
it('requires saved preview before publication and passes the preview version', async () => {
  signedIn()
  window.history.replaceState({}, '', '/content/education')
  render(<App />)
  const add = await screen.findByRole('button', { name: '+ เพิ่มรายการ' })
  expect(
    (
      screen.getByRole('button', {
        name: 'ดูตัวอย่างก่อนเผยแพร่',
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true)
  await userEvent.click(add)
  await userEvent.click(screen.getByRole('button', { name: 'บันทึกร่าง' }))
  const preview = await screen.findByRole('button', {
    name: 'ดูตัวอย่างก่อนเผยแพร่',
  })
  await waitFor(() =>
    expect((preview as HTMLButtonElement).disabled).toBe(false),
  )
  await userEvent.click(preview)
  expect(await screen.findByRole('dialog')).toBeTruthy()
  await userEvent.click(
    screen.getByRole('button', { name: 'ยืนยันเผยแพร่เวอร์ชันนี้' }),
  )
  await waitFor(() =>
    expect(calls.find((c) => c.path.endsWith('/publish'))?.body).toEqual({
      expectedVersion: 2,
      previewVersion: 1,
    }),
  )
})
it('hides the workspace immediately on local logout failure', async () => {
  signedIn()
  auth.signOut.mockRejectedValue(new Error('offline'))
  render(<App />)
  await screen.findByRole('heading', { name: 'พร้อมดูแลห้องเรียนของคุณ' })
  await act(async () => {
    await userEvent.click(screen.getByRole('button', { name: 'ออกจากระบบ' }))
  })
  expect(
    await screen.findByRole('heading', { name: 'เข้าสู่ระบบผู้ดูแล' }),
  ).toBeTruthy()
})
