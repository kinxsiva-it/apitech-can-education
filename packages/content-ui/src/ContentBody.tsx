import type { ReactNode } from 'react'
import type { ContentDocument } from '@apitech/contracts'
export function InlineContent({ text }: { text: string }) {
  return (
    <>
      {text
        .split(/(\*\*[^*]+\*\*|\[[^\]]+\]\(https?:\/\/[^\s)]+\))/g)
        .map((part, index) => {
          if (part.startsWith('**') && part.endsWith('**'))
            return <strong key={index}>{part.slice(2, -2)}</strong>
          const link = /^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/.exec(part)
          if (link)
            return (
              <a
                key={index}
                href={link[2]}
                target="_blank"
                rel="noopener noreferrer"
              >
                {link[1]}
              </a>
            )
          return part
        })}
    </>
  )
}
/** Identical safe rendering in Admin preview and Education; never interprets HTML. */
export function ContentBody({
  document,
  renderImage,
}: {
  document: ContentDocument
  renderImage(id: string, alt: string): ReactNode
}) {
  return (
    <div className="cms-content-preview">
      {document.lessons.map((lesson) => (
        <article key={lesson.id}>
          <p className="cms-eyebrow">LESSON / COMPONENT</p>
          <h2>{lesson.title}</h2>
          <p className="cms-preview-summary">{lesson.summary}</p>
          {lesson.topics.map((topic) => (
            <section key={topic.id}>
              <h3>{topic.title}</h3>
              {topic.blocks.map((block) =>
                block.type === 'image' && block.assetId ? (
                  <div key={block.id}>
                    {renderImage(block.assetId, block.alt)}
                  </div>
                ) : block.type === 'heading' ? (
                  <h4 key={block.id}>{block.text}</h4>
                ) : (
                  <div className="cms-prose" key={block.id}>
                    {block.text.split('\n').map((line, index) =>
                      line.startsWith('- ') ? (
                        <p className="cms-bullet" key={index}>
                          • <InlineContent text={line.slice(2)} />
                        </p>
                      ) : (
                        <p key={index}>
                          <InlineContent text={line} />
                        </p>
                      ),
                    )}
                  </div>
                ),
              )}
            </section>
          ))}
        </article>
      ))}
    </div>
  )
}
