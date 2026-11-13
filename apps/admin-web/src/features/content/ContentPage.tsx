import { date } from '../../shared/date'
import { useEffect, useState } from 'react'
import type {
  ContentBlock,
  ContentCollection,
  ContentDocument,
  ContentLesson,
  ContentState,
  ContentVersion,
  Page,
} from '@apitech/contracts'
import { api, errorMessage } from '../../lib/http'
import { useResource } from '../../shared/useResource'
import { Busy, Modal, Notice, Pagination } from '../../shared/ui'
import { ContentPreview } from './ContentPreview'
import { TextEditor } from './TextEditor'

function moved<T>(items: T[], index: number, delta: number): T[] {
  const result = [...items]
  const next = index + delta
  if (next < 0 || next >= result.length) return result
  ;[result[index], result[next]] = [result[next]!, result[index]!]
  return result
}
function Reorder({
  index,
  length,
  onMove,
  label,
}: {
  index: number
  length: number
  onMove(delta: number): void
  label: string
}) {
  return (
    <span className="cms-reorder">
      <button
        type="button"
        disabled={index === 0}
        aria-label={`เลื่อน${label}ขึ้น`}
        onClick={() => onMove(-1)}
      >
        ↑
      </button>
      <button
        type="button"
        disabled={index === length - 1}
        aria-label={`เลื่อน${label}ลง`}
        onClick={() => onMove(1)}
      >
        ↓
      </button>
    </span>
  )
}

function Editor({ initial, token }: { initial: ContentState; token: string }) {
  const [base, setBase] = useState(initial)
  const [document, setDocument] = useState<ContentDocument>(() =>
    structuredClone(initial.draft?.document ?? { lessons: [] }),
  )
  const [selected, setSelected] = useState(
    initial.draft?.document.lessons[0]?.id ?? '',
  )
  const [topicId, setTopicId] = useState(
    initial.draft?.document.lessons[0]?.topics[0]?.id ?? '',
  )
  const [dirty, setDirty] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(''),
    [failure, setFailure] = useState('')
  const [preview, setPreview] = useState<ContentVersion | null>(null),
    [offset, setOffset] = useState(0)
  const [confirm, setConfirm] = useState<{
    type: 'lesson' | 'topic' | 'block' | 'restore'
    id: string | number
  } | null>(null)
  const history = useResource<Page<Omit<ContentVersion, 'document'>>>(
    `/admin/content/${initial.key}/versions?limit=20&offset=${offset}`,
  )
  const lesson = document.lessons.find((l) => l.id === selected),
    topic = lesson?.topics.find((t) => t.id === topicId)
  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])
  useEffect(() => {
    const guard = (event: MouseEvent) => {
      if (
        dirty &&
        (event.target as Element).closest('a[href]') &&
        !window.confirm('มีร่างที่ยังไม่บันทึก ต้องการออกจากหน้านี้หรือไม่?')
      ) {
        event.preventDefault()
        event.stopPropagation()
      }
    }
    window.document.addEventListener('click', guard, true)
    return () => window.document.removeEventListener('click', guard, true)
  }, [dirty])
  function change(next: ContentDocument) {
    setDocument(next)
    setDirty(true)
    setMessage('')
    setPreview(null)
  }
  function patchLesson(patch: Partial<ContentLesson>) {
    change({
      lessons: document.lessons.map((l) =>
        l.id === selected ? { ...l, ...patch } : l,
      ),
    })
  }
  function patchBlock(id: string, patch: Partial<ContentBlock>) {
    if (lesson && topic)
      patchLesson({
        topics: lesson.topics.map((t) =>
          t.id === topicId
            ? {
                ...t,
                blocks: t.blocks.map((b) =>
                  b.id === id ? { ...b, ...patch } : b,
                ),
              }
            : t,
        ),
      })
  }
  function addLesson() {
    const id = crypto.randomUUID()
    change({
      lessons: [
        ...document.lessons,
        { id, title: 'บทเรียนใหม่', summary: '', topics: [] },
      ],
    })
    setSelected(id)
    setTopicId('')
  }
  function addTopic() {
    if (!lesson) return
    const id = crypto.randomUUID()
    patchLesson({
      topics: [...lesson.topics, { id, title: 'หัวข้อใหม่', blocks: [] }],
    })
    setTopicId(id)
  }
  function addBlock(type: ContentBlock['type']) {
    if (lesson && topic)
      patchLesson({
        topics: lesson.topics.map((t) =>
          t.id === topicId
            ? {
                ...t,
                blocks: [
                  ...t.blocks,
                  {
                    id: crypto.randomUUID(),
                    type,
                    text: '',
                    assetId: null,
                    alt: '',
                  },
                ],
              }
            : t,
        ),
      })
  }
  async function mutate(path: string, body: unknown, success: string) {
    if (busy) return
    setBusy(true)
    setFailure('')
    setMessage('')
    try {
      const state = await api<ContentState>(
        token,
        `/admin/content/${initial.key}/${path}`,
        { body },
      )
      setBase(state)
      setDocument(structuredClone(state.draft?.document ?? { lessons: [] }))
      setDirty(false)
      setPreview(null)
      setConfirm(null)
      setMessage(success)
      history.reload()
    } catch (cause) {
      setFailure(errorMessage(cause))
    } finally {
      setBusy(false)
    }
  }
  async function upload(id: string, file: File | undefined) {
    if (!file || busy) return
    if (
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
      file.size > 5242880
    ) {
      setFailure('รองรับ JPEG, PNG, WebP ขนาดไม่เกิน 5 MB')
      return
    }
    setBusy(true)
    setFailure('')
    try {
      const form = new FormData()
      form.append('file', file)
      const result = await api<{ id: string }>(token, '/admin/media', {
        body: form,
      })
      patchBlock(id, { assetId: result.id })
      setMessage('อัปโหลดรูปแล้ว กรุณาระบุคำอธิบายภาพและบันทึกร่าง')
    } catch (cause) {
      setFailure(errorMessage(cause))
    } finally {
      setBusy(false)
    }
  }
  function remove() {
    if (!confirm || !lesson) return
    if (confirm.type === 'lesson') {
      change({ lessons: document.lessons.filter((l) => l.id !== confirm.id) })
      setSelected('')
      setTopicId('')
    }
    if (confirm.type === 'topic') {
      patchLesson({ topics: lesson.topics.filter((t) => t.id !== confirm.id) })
      setTopicId('')
    }
    if (confirm.type === 'block' && topic)
      patchLesson({
        topics: lesson.topics.map((t) =>
          t.id === topicId
            ? { ...t, blocks: t.blocks.filter((b) => b.id !== confirm.id) }
            : t,
        ),
      })
    setConfirm(null)
  }
  return (
    <>
      <div className="cms-editor-toolbar">
        <div>
          <span className="cms-status pending">
            {dirty
              ? 'มีการแก้ไขที่ยังไม่บันทึก'
              : `ร่าง #${base.draft?.id ?? '—'}`}
          </span>
          <span className="cms-status approved">
            เผยแพร่ #{base.published?.id ?? '—'}
          </span>
        </div>
        <div className="cms-inline">
          <button
            onClick={() =>
              void mutate(
                'draft',
                { document, expectedVersion: base.version },
                'บันทึกร่างแล้ว เว็บไซต์ยังคงใช้ฉบับเผยแพร่เดิม',
              )
            }
            disabled={busy || !dirty}
          >
            บันทึกร่าง
          </button>
          <button
            className="primary"
            disabled={busy || dirty || !base.draft}
            onClick={() => setPreview(base.draft)}
          >
            ดูตัวอย่างก่อนเผยแพร่
          </button>
        </div>
      </div>
      {failure && (
        <Notice>
          {failure}{' '}
          <button onClick={() => window.location.reload()} disabled={busy}>
            โหลดฉบับล่าสุด (ทิ้งร่างในฟอร์ม)
          </button>
        </Notice>
      )}
      {message && <Notice success>{message}</Notice>}
      <fieldset className="cms-editor" disabled={busy}>
        <aside className="cms-outline">
          <h2>{initial.key === 'education' ? 'บทเรียน' : 'รายการชิ้นส่วน'}</h2>
          <button onClick={addLesson} disabled={document.lessons.length >= 100}>
            + เพิ่มรายการ
          </button>
          <ol>
            {document.lessons.map((l, index) => (
              <li key={l.id} className={l.id === selected ? 'selected' : ''}>
                <button
                  onClick={() => {
                    setSelected(l.id)
                    setTopicId(l.topics[0]?.id ?? '')
                  }}
                >
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  {l.title}
                </button>
                <Reorder
                  index={index}
                  length={document.lessons.length}
                  label="รายการ"
                  onMove={(delta) =>
                    change({ lessons: moved(document.lessons, index, delta) })
                  }
                />
              </li>
            ))}
          </ol>
          {!document.lessons.length && (
            <p className="cms-hint">
              เริ่มจากเพิ่มรายการแรก ยังไม่ต้องมีเนื้อหาจากลูกค้า
            </p>
          )}
        </aside>
        <div className="cms-editor-fields">
          {!lesson ? (
            <p className="cms-empty">เลือกรายการด้านซ้าย หรือเพิ่มรายการใหม่</p>
          ) : (
            <>
              <div className="cms-inline cms-between">
                <h2>ข้อมูลรายการ</h2>
                <button
                  className="danger"
                  onClick={() => setConfirm({ type: 'lesson', id: lesson.id })}
                >
                  ลบรายการ
                </button>
              </div>
              <label>
                ชื่อรายการ
                <input
                  value={lesson.title}
                  onChange={(e) => patchLesson({ title: e.target.value })}
                  maxLength={200}
                  required
                />
              </label>
              <label>
                คำอธิบายสั้น
                <textarea
                  value={lesson.summary}
                  onChange={(e) => patchLesson({ summary: e.target.value })}
                  maxLength={2000}
                />
              </label>
              <div className="cms-inline cms-between">
                <h3>หัวข้อภายใน</h3>
                <button
                  onClick={addTopic}
                  disabled={lesson.topics.length >= 100}
                >
                  + เพิ่มหัวข้อ
                </button>
              </div>
              <div className="cms-topic-tabs">
                {lesson.topics.map((t, index) => (
                  <div key={t.id}>
                    <button
                      className={topicId === t.id ? 'active' : ''}
                      onClick={() => setTopicId(t.id)}
                    >
                      {t.title}
                    </button>
                    <Reorder
                      index={index}
                      length={lesson.topics.length}
                      label="หัวข้อ"
                      onMove={(delta) =>
                        patchLesson({
                          topics: moved(lesson.topics, index, delta),
                        })
                      }
                    />
                  </div>
                ))}
              </div>
              {topic && (
                <>
                  <div className="cms-inline cms-between">
                    <label className="cms-grow">
                      ชื่อหัวข้อ
                      <input
                        value={topic.title}
                        maxLength={200}
                        onChange={(e) =>
                          patchLesson({
                            topics: lesson.topics.map((t) =>
                              t.id === topic.id
                                ? { ...t, title: e.target.value }
                                : t,
                            ),
                          })
                        }
                      />
                    </label>
                    <button
                      className="danger"
                      onClick={() =>
                        setConfirm({ type: 'topic', id: topic.id })
                      }
                    >
                      ลบหัวข้อ
                    </button>
                  </div>
                  <p className="cms-hint">
                    ข้อความ: ใช้ **ตัวหนา**, ขึ้นต้นบรรทัดด้วย - สำหรับรายการ
                    และ [ชื่อลิงก์](https://example.com) ระบบไม่แสดง
                    HTML/JavaScript เป็นโค้ด
                  </p>
                  {topic.blocks.map((block, index) => (
                    <section className="cms-block" key={block.id}>
                      <div className="cms-inline cms-between">
                        <h4>
                          {block.type === 'image'
                            ? 'รูปภาพ'
                            : block.type === 'heading'
                              ? 'หัวข้อย่อย'
                              : 'ข้อความ'}{' '}
                          / {index + 1}
                        </h4>
                        <div className="cms-inline">
                          <Reorder
                            index={index}
                            length={topic.blocks.length}
                            label="เนื้อหา"
                            onMove={(delta) =>
                              patchLesson({
                                topics: lesson.topics.map((t) =>
                                  t.id === topic.id
                                    ? {
                                        ...t,
                                        blocks: moved(t.blocks, index, delta),
                                      }
                                    : t,
                                ),
                              })
                            }
                          />
                          <button
                            onClick={() =>
                              setConfirm({ type: 'block', id: block.id })
                            }
                            aria-label="ลบเนื้อหา"
                          >
                            ลบ
                          </button>
                        </div>
                      </div>
                      {block.type === 'image' ? (
                        <>
                          <label>
                            เลือกรูป JPEG / PNG / WebP (ไม่เกิน 5 MB)
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              onChange={(e) =>
                                void upload(block.id, e.target.files?.[0])
                              }
                            />
                          </label>
                          <small>
                            {block.assetId
                              ? `รูปพร้อมใช้ · ${block.assetId}`
                              : 'ยังไม่มีรูป'}
                          </small>
                          <label>
                            คำอธิบายภาพ (บังคับ)
                            <input
                              value={block.alt}
                              onChange={(e) =>
                                patchBlock(block.id, { alt: e.target.value })
                              }
                              maxLength={500}
                              required
                            />
                          </label>
                        </>
                      ) : block.type === 'text' ? (
                        <TextEditor
                          value={block.text}
                          onChange={(text) => patchBlock(block.id, { text })}
                        />
                      ) : (
                        <label>
                          หัวข้อย่อย
                          <textarea
                            value={block.text}
                            maxLength={20000}
                            onChange={(e) =>
                              patchBlock(block.id, { text: e.target.value })
                            }
                          />
                        </label>
                      )}
                    </section>
                  ))}
                  <div className="cms-inline">
                    <button
                      disabled={topic.blocks.length >= 100}
                      onClick={() => addBlock('text')}
                    >
                      + ข้อความ
                    </button>
                    <button
                      disabled={topic.blocks.length >= 100}
                      onClick={() => addBlock('heading')}
                    >
                      + หัวข้อย่อย
                    </button>
                    <button
                      disabled={topic.blocks.length >= 100}
                      onClick={() => addBlock('image')}
                    >
                      + รูปภาพ
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </fieldset>
      <section className="cms-panel cms-history">
        <div className="cms-inline cms-between">
          <h2>ประวัติเวอร์ชัน</h2>
          <button onClick={history.reload}>โหลดประวัติล่าสุด</button>
        </div>
        <p className="cms-hint">
          ย้อนเวอร์ชันเป็นร่างใหม่ก่อนดูตัวอย่างและเผยแพร่
          ประวัติเดิมจะยังอยู่ครบ
        </p>
        {history.error ? (
          <Notice>{history.error}</Notice>
        ) : !history.data ? (
          <Busy />
        ) : (
          <>
            <ul>
              {history.data.items.map((v) => (
                <li key={v.id}>
                  <span>
                    <strong>เวอร์ชัน #{v.id}</strong>
                    <small>
                      {date(v.created_at)} · {v.created_by}
                    </small>
                  </span>
                  <button
                    disabled={busy || dirty}
                    onClick={() => setConfirm({ type: 'restore', id: v.id })}
                  >
                    นำกลับมาเป็นร่าง
                  </button>
                </li>
              ))}
            </ul>
            <Pagination
              offset={offset}
              total={history.data.total}
              onChange={setOffset}
            />
          </>
        )}
      </section>
      {preview && (
        <Modal
          title={`ตัวอย่างร่าง #${preview.id}`}
          onClose={() => {
            if (!busy) setPreview(null)
          }}
        >
          <Notice success>
            นี่คือตัวอย่างร่างที่บันทึกแล้ว ยังไม่เปลี่ยนเนื้อหาบน Education
          </Notice>
          <ContentPreview document={preview.document} />
          <div className="cms-inline cms-preview-actions">
            <button onClick={() => setPreview(null)} disabled={busy}>
              กลับไปแก้ไข
            </button>
            <button
              className="primary"
              disabled={busy}
              onClick={() =>
                void mutate(
                  'publish',
                  { expectedVersion: base.version, previewVersion: preview.id },
                  'เผยแพร่เนื้อหาสำเร็จแล้ว',
                )
              }
            >
              {busy ? 'กำลังเผยแพร่…' : 'ยืนยันเผยแพร่เวอร์ชันนี้'}
            </button>
          </div>
        </Modal>
      )}
      {confirm && (
        <Modal
          title={
            confirm.type === 'restore'
              ? 'นำเวอร์ชันกลับมาเป็นร่าง'
              : 'ยืนยันลบออกจากร่าง'
          }
          onClose={() => {
            if (!busy) setConfirm(null)
          }}
        >
          <p>
            {confirm.type === 'restore'
              ? `สร้างร่างใหม่จากเวอร์ชัน #${confirm.id} โดยไม่เปลี่ยนฉบับที่กำลังเผยแพร่`
              : 'รายการนี้จะถูกลบจากร่างเมื่อบันทึก และมีผลกับเว็บไซต์หลังเผยแพร่เท่านั้น ประวัติเวอร์ชันเดิมยังอยู่'}
          </p>
          <div className="cms-inline">
            <button onClick={() => setConfirm(null)} disabled={busy}>
              ยกเลิก
            </button>
            <button
              className="danger"
              disabled={busy}
              onClick={() =>
                confirm.type === 'restore'
                  ? void mutate(
                      'restore',
                      {
                        expectedVersion: base.version,
                        sourceVersion: Number(confirm.id),
                      },
                      'คืนเวอร์ชันเป็นร่างแล้ว กรุณาดูตัวอย่างก่อนเผยแพร่',
                    )
                  : remove()
              }
            >
              ยืนยัน
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}
export default function ContentPage({
  collection,
}: {
  collection: ContentCollection
}) {
  const { data, error, reload, token } = useResource<ContentState>(
    `/admin/content/${collection}`,
  )
  return (
    <>
      <div className="cms-page-heading">
        <div>
          <p className="cms-eyebrow">CONTENT WORKSPACE</p>
          <h1>
            {collection === 'education'
              ? 'Education · บทเรียน'
              : 'EV Component Lab · เนื้อหาชิ้นส่วน'}
          </h1>
          <p>จัดการข้อความและรูปภาพ ลำดับในรายการคือการจัดแสดงหลังเผยแพร่</p>
        </div>
      </div>
      {error ? (
        <>
          <Notice>{error}</Notice>
          <button onClick={reload}>ลองโหลดอีกครั้ง</button>
        </>
      ) : !data ? (
        <Busy />
      ) : (
        <Editor key={collection} initial={data} token={token} />
      )}
    </>
  )
}
