import { z } from 'zod'
export const collectionKey = z.enum(['education', 'components'])
export const contentBlock = z
  .strictObject({
    id: z.uuid(),
    type: z.enum(['text', 'heading', 'image']),
    text: z.string().max(20000),
    assetId: z.uuid().nullable(),
    alt: z.string().max(500),
  })
  .refine(
    (b) => b.type !== 'image' || Boolean(b.assetId && b.alt.trim()),
    'Image description required',
  )
export const contentDocument = z
  .strictObject({
    lessons: z
      .array(
        z.strictObject({
          id: z.uuid(),
          title: z.string().trim().min(1).max(200),
          summary: z.string().max(2000),
          topics: z
            .array(
              z.strictObject({
                id: z.uuid(),
                title: z.string().trim().min(1).max(200),
                blocks: z.array(contentBlock).max(100),
              }),
            )
            .max(100),
        }),
      )
      .max(100),
  })
  .refine(
    (doc) => Buffer.byteLength(JSON.stringify(doc)) <= 1000000,
    'Document too large',
  )
export const contentVersion = z.object({
  id: z.number().int().positive(),
  collection_key: collectionKey,
  document: contentDocument,
  created_by: z.uuid(),
  created_at: z.string(),
})
export const contentState = z.object({
  key: collectionKey,
  version: z.number().int().positive(),
  draft: contentVersion.nullable(),
  published: contentVersion.nullable(),
})
export const saveContent = z.strictObject({
  expectedVersion: z.number().int().positive(),
  document: contentDocument,
})
export const restoreContent = z.strictObject({
  expectedVersion: z.number().int().positive(),
  sourceVersion: z.number().int().positive(),
})
export const publishContent = z.strictObject({
  expectedVersion: z.number().int().positive(),
  previewVersion: z.number().int().positive(),
})
