import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import type { ReactNode } from 'react'
import type { MemberAccess } from '@apitech/contracts'

const mock = vi.hoisted(() => ({
  session: null as Session | null,
  listener: null as ((event: string, session: Session | null) => void) | null,
  link: { error: null as string | null, recovery: false },
  signUp: vi.fn(), signIn: vi.fn(), signOut: vi.fn(), updateUser: vi.fn(), resend: vi.fn(), reset: vi.fn(),
}))
vi.mock('../src/lib/supabase/client', () => ({
  initialAuthLink: mock.link, AUTH_STORAGE_KEY: 'test-auth',
  supabase: { auth: {
    getSession: () => Promise.resolve({ data: { session: mock.session }, error: null }),
    onAuthStateChange: (listener: typeof mock.listener) => {
      mock.listener = listener
      return { data: { subscription: { unsubscribe: () => { mock.listener = null } } } }
    },
    signUp: mock.signUp, signInWithPassword: mock.signIn, signOut: mock.signOut,
    updateUser: mock.updateUser, resend: mock.resend, resetPasswordForEmail: mock.reset,
  } },
}))
vi.mock('../src/ui/workspace/EducationWorkspace', () => ({
  EducationWorkspace: ({ accountActions }: { accountActions: ReactNode }) => <main data-testid="workspace">Lesson workspace{accountActions}<input aria-label="Lesson notes" /></main>,
}))
import { AuthProvider } from '../src/features/auth/AuthProvider'
import { AuthRoutes } from '../src/app/AuthRoutes'
import { parseMemberAccess } from '../src/features/auth/membership-api'
import { readAuthLink } from '../src/features/auth/auth-links'

const userId = 'test-member'
const session = (id = userId, token = 'token-one') => ({ access_token: token, user: { id, email: 'teacher@example.test' } }) as Session
const access = (status: MemberAccess['status'] = 'approved', id = userId): MemberAccess => ({
  user_id: id, role: 'instructor', status, version: 1, email_confirmed: true,
  can_access_education: status === 'approved',
  latest_request: { id: 'request-one', status: status === 'rejected' ? 'rejected' : status === 'pending' ? 'pending' : 'approved', round_no: 1, version: 1, reason: status === 'rejected' ? 'กรุณาตรวจชื่อสถาบัน' : null },
})
let currentAccess: MemberAccess
let apiFailure = false
let deferAccess: Promise<Response> | null = null
let profileRevision = 2
let requests: { url: string; init?: RequestInit }[]

function mount(path = '/learn') {
  return render(<MemoryRouter initialEntries={[path]}><AuthProvider><AuthRoutes /></AuthProvider></MemoryRouter>)
}
beforeEach(() => {
  mock.session = null; mock.listener = null; mock.link.error = null; mock.link.recovery = false
  for (const fn of [mock.signUp, mock.signIn, mock.signOut, mock.updateUser, mock.resend, mock.reset]) fn.mockReset().mockResolvedValue({ error: null })
  currentAccess = access(); apiFailure = false; deferAccess = null; profileRevision = 2; requests = []
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    requests.push({ url, init })
    if (url.endsWith('/members/me')) {
      if (deferAccess) return deferAccess
      return Response.json(apiFailure ? {} : currentAccess, { status: apiFailure ? 503 : 200 })
    }
    if (url.includes('/institutions?')) return Response.json([{ id: 'school-one', name: 'วิทยาลัยตัวอย่าง' }])
    if (url.endsWith('/profile')) {
      if (init?.method === 'PATCH') profileRevision += 1
      return Response.json({ user_id: userId, full_name: 'อาจารย์ตัวอย่าง', institution_id: null, institution_other: null, revision: profileRevision })
    }
    if (url.endsWith('/requests')) { currentAccess = access('pending'); return Response.json('request-two') }
    throw new Error(`Unexpected request: ${url}`)
  }))
})
afterEach(() => { cleanup(); vi.unstubAllGlobals(); localStorage.clear() })

describe('membership route boundaries', () => {
  it('opens the public landing page and navigates to login from its header', async () => {
    mount('/')
    expect(await screen.findByRole('heading', { name: /เปิดมุมมองใหม่/ })).toBeTruthy()
    const header = screen.getByRole('banner')
    const login = header.querySelector('a[href="/login"]')
    expect(login).toBeTruthy()
    await userEvent.click(login as HTMLAnchorElement)
    expect(await screen.findByRole('heading', { name: 'ยินดีต้อนรับกลับ' })).toBeTruthy()
    expect(screen.queryByTestId('workspace')).toBeNull()
  })
  it('keeps the landing page public for approved members with a classroom link', async () => {
    mock.session = session(); mount('/')
    expect(await screen.findByRole('heading', { name: /เปิดมุมมองใหม่/ })).toBeTruthy()
    await waitFor(() => expect(screen.getAllByRole('link', { name: 'เข้าสู่ห้องเรียน' }).length).toBeGreaterThan(0))
    expect(screen.queryByTestId('workspace')).toBeNull()
  })
  it('preserves expired email handling when Auth redirects to the site root', async () => {
    mock.link.error = 'expired'; mount('/')
    expect(await screen.findByRole('heading', { name: 'ลิงก์หมดอายุหรือถูกใช้แล้ว' })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: /เปิดมุมมองใหม่/ })).toBeNull()
  })
  it('opens recovery instead of the landing page for a recovery session at root', async () => {
    mock.session = session(); mock.link.recovery = true; mount('/')
    expect(await screen.findByRole('heading', { name: 'ตั้งรหัสผ่านใหม่' })).toBeTruthy()
    expect(screen.queryByTestId('workspace')).toBeNull()
  })
  it('redirects a guest who opens a protected URL to login', async () => {
    mount()
    expect(await screen.findByRole('heading', { name: 'ยินดีต้อนรับกลับ' })).toBeTruthy()
    expect(screen.queryByTestId('workspace')).toBeNull()
  })
  it.each(['pending', 'rejected', 'suspended'] as const)('blocks a %s member', async (status) => {
    mock.session = session(); currentAccess = access(status); mount()
    const titles = { pending: 'รอผู้ดูแลอนุมัติ', rejected: 'คำขอยังไม่ผ่านการอนุมัติ', suspended: 'บัญชีถูกระงับสิทธิ์' }
    expect(await screen.findByRole('heading', { name: titles[status] })).toBeTruthy()
    expect(screen.queryByTestId('workspace')).toBeNull()
    if (status === 'suspended') expect(screen.queryByRole('button', { name: 'บันทึกข้อมูลและส่งคำขอพิจารณา' })).toBeNull()
  })
  it('allows only server-confirmed access, forwarding the session bearer token', async () => {
    mock.session = session(); mount()
    expect(await screen.findByTestId('workspace')).toBeTruthy()
    expect(requests[0].init?.headers).toEqual({ Authorization: 'Bearer token-one' })
  })
  it('fails closed when the Members API is unavailable', async () => {
    mock.session = session(); apiFailure = true; mount()
    expect(await screen.findByRole('heading', { name: 'ตรวจสอบสิทธิ์ไม่ได้' })).toBeTruthy()
    expect(screen.queryByTestId('workspace')).toBeNull()
  })
  it('does not reuse approval across users or accept an identity mismatch', async () => {
    mock.session = session(); mount(); await screen.findByTestId('workspace')
    await act(async () => { mock.listener?.('SIGNED_IN', session('another-user', 'another-token')) })
    expect(screen.queryByTestId('workspace')).toBeNull()
    expect(await screen.findByRole('heading', { name: 'ตรวจสอบสิทธิ์ไม่ได้' })).toBeTruthy()
  })
  it('preserves lesson state during a refresh and removes access when suspended', async () => {
    mock.session = session(); mount(); await screen.findByTestId('workspace')
    fireEvent.change(screen.getByLabelText('Lesson notes'), { target: { value: 'keep this lesson state' } })
    let resolve!: (value: Response) => void
    deferAccess = new Promise((done) => { resolve = done })
    fireEvent.focus(window)
    await waitFor(() => expect(requests.filter((r) => r.url.endsWith('/members/me')).length).toBe(2))
    expect((screen.getByLabelText('Lesson notes') as HTMLInputElement).value).toBe('keep this lesson state')
    await act(async () => resolve(Response.json(access('suspended'))))
    expect(await screen.findByRole('heading', { name: 'บัญชีถูกระงับสิทธิ์' })).toBeTruthy()
    expect(screen.queryByTestId('workspace')).toBeNull()
  })
  it('removes protected UI and cached session even if remote logout fails', async () => {
    mock.session = session(); mock.signOut.mockRejectedValue(new Error('offline')); localStorage.setItem('test-auth', 'session-placeholder')
    mount(); await screen.findByTestId('workspace')
    await userEvent.click(screen.getByRole('button', { name: 'ออกจากระบบ' }))
    expect(await screen.findByRole('heading', { name: 'ยินดีต้อนรับกลับ' })).toBeTruthy()
    await waitFor(() => expect(localStorage.getItem('test-auth')).toBeNull())
    expect(screen.queryByTestId('workspace')).toBeNull()
  })
})

describe('forms and email links', () => {
  it('signs in through Auth, then waits for API approval before opening lessons', async () => {
    mock.signIn.mockImplementation(async () => {
      mock.listener?.('SIGNED_IN', session())
      return { error: null }
    })
    mount('/login'); await screen.findByRole('heading', { name: 'ยินดีต้อนรับกลับ' })
    fireEvent.change(screen.getByLabelText('อีเมล'), { target: { value: 'teacher@example.test' } })
    fireEvent.change(screen.getByLabelText('รหัสผ่าน'), { target: { value: 'example-password' } })
    await userEvent.click(screen.getByRole('button', { name: 'เข้าสู่ระบบ' }))
    expect(await screen.findByTestId('workspace')).toBeTruthy()
    expect(mock.signIn).toHaveBeenCalledWith({ email: 'teacher@example.test', password: 'example-password' })
  })
  it('shows a safe login error without displaying the server message', async () => {
    mock.signIn.mockResolvedValue({ error: { code: 'invalid_credentials', message: 'internal-server-details' } })
    mount('/login'); await screen.findByRole('heading', { name: 'ยินดีต้อนรับกลับ' })
    fireEvent.change(screen.getByLabelText('อีเมล'), { target: { value: 'teacher@example.test' } })
    fireEvent.change(screen.getByLabelText('รหัสผ่าน'), { target: { value: 'wrong-password' } })
    await userEvent.click(screen.getByRole('button', { name: 'เข้าสู่ระบบ' }))
    expect((await screen.findByRole('alert')).textContent).toContain('อีเมลหรือรหัสผ่านไม่ถูกต้อง')
    expect(screen.queryByText('internal-server-details')).toBeNull()
    expect(screen.queryByTestId('workspace')).toBeNull()
  })
  it.each(['/verify-email', '/forgot-password'])('requests the correct email link from %s', async (path) => {
    mount(path); const email = await screen.findByLabelText('อีเมล')
    fireEvent.change(email, { target: { value: 'teacher@example.test' } })
    const recovery = path === '/forgot-password'
    await userEvent.click(screen.getByRole('button', { name: recovery ? 'ส่งลิงก์ตั้งรหัสผ่านใหม่' : 'ส่งอีเมลยืนยันอีกครั้ง' }))
    if (recovery) expect(mock.reset).toHaveBeenCalledWith('teacher@example.test', { redirectTo: `${window.location.origin}/reset-password` })
    else expect(mock.resend).toHaveBeenCalledWith({ type: 'signup', email: 'teacher@example.test', options: { emailRedirectTo: `${window.location.origin}/auth/callback` } })
    expect(await screen.findByRole('status')).toBeTruthy()
  })
  it('rejects mismatching passwords without sending a signup request', async () => {
    mount('/register')
    await screen.findByRole('heading', { name: 'สมัครบัญชีอาจารย์' })
    fireEvent.change(screen.getByLabelText('ชื่อ–นามสกุล'), { target: { value: 'Teacher' } })
    fireEvent.change(screen.getByLabelText('อีเมล'), { target: { value: 'teacher@example.test' } })
    fireEvent.change(screen.getByLabelText('รหัสผ่าน'), { target: { value: 'example-password' } })
    fireEvent.change(screen.getByLabelText('ยืนยันรหัสผ่าน'), { target: { value: 'different-password' } })
    await userEvent.click(screen.getByRole('button', { name: 'สมัครและรับอีเมลยืนยัน' }))
    expect(await screen.findByRole('alert')).toBeTruthy(); expect(mock.signUp).not.toHaveBeenCalled()
  })
  it('submits only profile metadata with the email callback URL', async () => {
    mount('/register'); await screen.findByRole('heading', { name: 'สมัครบัญชีอาจารย์' })
    fireEvent.change(screen.getByLabelText('ชื่อ–นามสกุล'), { target: { value: 'Teacher' } })
    fireEvent.change(screen.getByLabelText('อีเมล'), { target: { value: 'teacher@example.test' } })
    fireEvent.change(screen.getByLabelText('รหัสผ่าน'), { target: { value: 'example-password' } })
    fireEvent.change(screen.getByLabelText('ยืนยันรหัสผ่าน'), { target: { value: 'example-password' } })
    await userEvent.click(screen.getByRole('button', { name: 'สมัครและรับอีเมลยืนยัน' }))
    await waitFor(() => expect(mock.signUp).toHaveBeenCalledOnce())
    expect(mock.signUp.mock.calls[0][0].options).toEqual({ emailRedirectTo: `${window.location.origin}/auth/callback`, data: { full_name: 'Teacher', institution_id: null, institution_other: null } })
  })
  it('saves the profile before resubmitting with the returned revision', async () => {
    mock.session = session(); currentAccess = access('rejected'); mount('/membership')
    const submit = await screen.findByRole('button', { name: 'บันทึกข้อมูลและส่งคำขอพิจารณา' })
    await userEvent.click(submit)
    expect(await screen.findByRole('heading', { name: 'รอผู้ดูแลอนุมัติ' })).toBeTruthy()
    const writes = requests.filter((r) => r.init?.method !== 'GET')
    expect(writes.map((r) => r.init?.method)).toEqual(['PATCH', 'POST'])
    expect(JSON.parse(writes[0].init?.body as string).expectedRevision).toBe(2)
    expect(JSON.parse(writes[1].init?.body as string).expectedRevision).toBe(3)
  })
  it('shows an expired link without rendering its raw error description', async () => {
    mock.link.error = 'expired'; mount('/auth/callback')
    expect(await screen.findByRole('heading', { name: 'ลิงก์หมดอายุหรือถูกใช้แล้ว' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'ขออีเมลยืนยันใหม่' })).toBeTruthy()
  })
  it('does not allow a normal signed-in session to use recovery form', async () => {
    mock.session = session(); mount('/reset-password')
    expect(await screen.findByRole('heading', { name: 'กรุณาเปิดลิงก์ตั้งรหัสผ่านล่าสุด' })).toBeTruthy()
    expect(mock.updateUser).not.toHaveBeenCalled()
  })
  it('allows a recovery session to set its own password then requires login', async () => {
    mock.session = session(); mock.link.recovery = true; mount('/reset-password')
    await screen.findByRole('heading', { name: 'ตั้งรหัสผ่านใหม่' })
    fireEvent.change(screen.getByLabelText('รหัสผ่านใหม่'), { target: { value: 'new-example-password' } })
    fireEvent.change(screen.getByLabelText('ยืนยันรหัสผ่านใหม่'), { target: { value: 'new-example-password' } })
    await userEvent.click(screen.getByRole('button', { name: 'บันทึกรหัสผ่านใหม่' }))
    expect(await screen.findByRole('heading', { name: 'ยินดีต้อนรับกลับ' })).toBeTruthy()
    expect(mock.updateUser).toHaveBeenCalledWith({ password: 'new-example-password' })
    expect(mock.signOut).toHaveBeenCalledWith({ scope: 'local' })
  })
})

describe('untrusted responses', () => {
  it('rejects inconsistent access flags', () => {
    expect(() => parseMemberAccess({ ...access('pending'), can_access_education: true })).toThrow()
    expect(() => parseMemberAccess({ ...access(), email_confirmed: false })).toThrow()
  })
  it('extracts only normalized email-link state', () => {
    expect(readAuthLink({ hash: '#error=access_denied&error_code=otp_expired&error_description=untrusted-text', search: '' })).toEqual({ error: 'expired', recovery: false })
    expect(readAuthLink({ hash: '#type=recovery&access_token=not-a-real-token', search: '' })).toEqual({ error: null, recovery: true })
  })
})
