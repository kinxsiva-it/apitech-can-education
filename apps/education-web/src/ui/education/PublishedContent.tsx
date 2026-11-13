import { useEffect, useState } from 'react'
import type { ContentCollection, ContentVersion } from '@apitech/contracts'
import { ContentBody } from '@apitech/content-ui'
import { useAuth } from '../../features/auth/auth-context'
import './published-content.css'
const origin = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')
function PublishedImage({
  id,
  alt,
  token,
}: {
  id: string
  alt: string
  token: string
}) {
  const [url, setUrl] = useState(''),
    [failed, setFailed] = useState(false)
  useEffect(() => {
    let active = true,
      objectUrl = ''
    const controller = new AbortController()
    fetch(`${origin}/api/media/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error()
        return response.blob()
      })
      .then((blob) => {
        if (active) {
          objectUrl = URL.createObjectURL(blob)
          setUrl(objectUrl)
        }
      })
      .catch(() => {
        if (active) setFailed(true)
      })
    return () => {
      active = false
      controller.abort()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [id, token])
  return url ? (
    <figure>
      <img src={url} alt={alt} />
      <figcaption>{alt}</figcaption>
    </figure>
  ) : (
    <p role="status">
      {failed ? 'โหลดรูปภาพไม่ได้ กรุณาโหลดเนื้อหาใหม่' : 'กำลังโหลดรูปภาพ…'}
    </p>
  )
}
export function PublishedContent({
  collection,
}: {
  collection: ContentCollection
}) {
  const { session } = useAuth(),
    token = session?.access_token ?? ''
  const [result, setResult] = useState<{
    key: string
    value?: ContentVersion | null
    error?: boolean
  }>({ key: '' })
  const [revision, setRevision] = useState(0),
    [selected, setSelected] = useState('')
  const key = `${collection}:${token}:${revision}`
  useEffect(() => {
    const controller = new AbortController()
    let active = true
    fetch(`${origin}/api/content/${collection}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
    })
      .then((response) => {
        if (!response.ok) throw new Error()
        return response.json() as Promise<ContentVersion | null>
      })
      .then((value) => {
        if (active) setResult({ key, value })
      })
      .catch(() => {
        if (active) setResult({ key, error: true })
      })
    return () => {
      active = false
      controller.abort()
    }
  }, [key, collection, token])
  const current = result.key === key ? result : null,
    version = current?.value
  const lesson =
    version?.document.lessons.find((l) => l.id === selected) ??
    version?.document.lessons[0]
  return (
    <section className="published-learning">
      <header>
        <div>
          <p className="eyebrow">
            {collection === 'education'
              ? 'CAN EDUCATION'
              : 'COMPONENT TEACHING NOTES'}
          </p>
          <h2>สื่อประกอบการสอน</h2>
        </div>
        <button onClick={() => setRevision((n) => n + 1)}>
          โหลดเนื้อหาล่าสุด ↻
        </button>
      </header>
      {!current ? (
        <p role="status">กำลังโหลดสื่อการสอน…</p>
      ) : current.error ? (
        <p role="alert">โหลดเนื้อหาไม่ได้ กรุณาลองใหม่หรือติดต่อผู้ดูแล</p>
      ) : !lesson ? (
        <p className="published-empty">
          ยังไม่มีเนื้อหาที่เผยแพร่ในหมวดนี้
          ผู้ดูแลสามารถเตรียมร่างและเผยแพร่จาก CMS ได้
        </p>
      ) : (
        <div className="published-layout">
          <nav aria-label="รายการสื่อการสอน">
            {version?.document.lessons.map((l, index) => (
              <button
                className={lesson.id === l.id ? 'selected' : ''}
                aria-pressed={lesson.id === l.id}
                onClick={() => setSelected(l.id)}
                key={l.id}
              >
                <span>{String(index + 1).padStart(2, '0')}</span>
                {l.title}
              </button>
            ))}
          </nav>
          <ContentBody
            document={{ lessons: [lesson] }}
            renderImage={(id, alt) => (
              <PublishedImage
                key={`${id}:${token}`}
                id={id}
                alt={alt}
                token={token}
              />
            )}
          />
        </div>
      )}
    </section>
  )
}
