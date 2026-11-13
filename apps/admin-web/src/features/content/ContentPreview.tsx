import { useEffect, useState } from 'react'
import type { ContentDocument } from '@apitech/contracts'
import { useAdmin } from '../../auth/context'
import { imageBlob } from '../../lib/http'
import { ContentBody } from '@apitech/content-ui'

function Image({ id, alt }: { id: string; alt: string }) {
  const { session } = useAdmin()
  const [result, setResult] = useState<{
    id: string
    url?: string
    failed?: boolean
  }>({ id: '' })
  useEffect(() => {
    if (!session) return
    let active = true,
      url = ''
    const controller = new AbortController()
    imageBlob(session.access_token, id, controller.signal)
      .then((blob) => {
        if (active) {
          url = URL.createObjectURL(blob)
          setResult({ id, url })
        }
      })
      .catch(() => {
        if (active) setResult({ id, failed: true })
      })
    return () => {
      active = false
      controller.abort()
      if (url) URL.revokeObjectURL(url)
    }
  }, [id, session])
  if (result.id !== id || !result.url)
    return (
      <p role="status">
        {result.id === id && result.failed
          ? 'โหลดรูปภาพไม่ได้ กรุณาปิดและเปิดตัวอย่างใหม่'
          : 'กำลังโหลดรูปภาพ…'}
      </p>
    )
  return (
    <figure>
      <img src={result.url} alt={alt} />
      <figcaption>{alt}</figcaption>
    </figure>
  )
}
export function ContentPreview({ document }: { document: ContentDocument }) {
  return (
    <>
      {!document.lessons.length && <p>ยังไม่มีเนื้อหาในฉบับนี้</p>}
      <ContentBody
        document={document}
        renderImage={(id, alt) => <Image id={id} alt={alt} />}
      />
    </>
  )
}
