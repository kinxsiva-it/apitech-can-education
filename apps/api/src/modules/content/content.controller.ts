import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Module,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
  ServiceUnavailableException,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { randomUUID } from 'node:crypto'
import sharp from 'sharp'
import type {} from 'multer'
import type { Response } from 'express'
import { z } from 'zod'
import {
  CurrentMember,
  RequireAdmin,
  RequireApproved,
} from '../auth/auth.decorators.js'
import type { AuthContext } from '../auth/auth.types.js'
import { SupabaseGateway } from '../auth/supabase.gateway.js'
import { ZodPipe } from '../../common/validation/zod.pipe.js'
import {
  collectionKey,
  contentState,
  contentVersion,
  publishContent,
  restoreContent,
  saveContent,
} from './content.schemas.js'

const paging = z.strictObject({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).max(100000).default(0),
})

@Controller('admin/content')
@RequireAdmin()
export class ContentAdminController {
  constructor(private readonly gateway: SupabaseGateway) {}
  @Get(':key')
  get(
    @CurrentMember() m: AuthContext,
    @Param('key', new ZodPipe(collectionKey)) key: string,
  ) {
    return this.gateway.rpc(
      m.client,
      'get_cms_content',
      { p_key: key },
      contentState,
    )
  }
  @Post(':key/draft')
  save(
    @CurrentMember() m: AuthContext,
    @Param('key', new ZodPipe(collectionKey)) key: string,
    @Body(new ZodPipe(saveContent)) input: z.infer<typeof saveContent>,
  ) {
    return this.gateway.rpc(
      m.client,
      'save_cms_content',
      {
        p_key: key,
        p_document: input.document,
        p_expected_version: input.expectedVersion,
      },
      contentState,
    )
  }
  @Post(':key/restore')
  restore(
    @CurrentMember() m: AuthContext,
    @Param('key', new ZodPipe(collectionKey)) key: string,
    @Body(new ZodPipe(restoreContent)) input: z.infer<typeof restoreContent>,
  ) {
    return this.gateway.rpc(
      m.client,
      'save_cms_content',
      {
        p_key: key,
        p_document: null,
        p_expected_version: input.expectedVersion,
        p_restore_version: input.sourceVersion,
      },
      contentState,
    )
  }
  @Post(':key/publish')
  publish(
    @CurrentMember() m: AuthContext,
    @Param('key', new ZodPipe(collectionKey)) key: string,
    @Body(new ZodPipe(publishContent)) input: z.infer<typeof publishContent>,
  ) {
    return this.gateway.rpc(
      m.client,
      'publish_cms_content',
      {
        p_key: key,
        p_expected_version: input.expectedVersion,
        p_preview_version: input.previewVersion,
      },
      contentState,
    )
  }
  @Get(':key/versions')
  async versions(
    @CurrentMember() m: AuthContext,
    @Param('key', new ZodPipe(collectionKey)) key: string,
    @Query(new ZodPipe(paging)) query: z.infer<typeof paging>,
  ) {
    const { data, error, status, count } = await m.client
      .from('cms_versions')
      .select('id,collection_key,created_by,created_at', { count: 'exact' })
      .eq('collection_key', key)
      .order('id', { ascending: false })
      .range(query.offset, query.offset + query.limit - 1)
    if (error) this.gateway.fail(error, status)
    return { items: data, total: count, ...query }
  }
}

@Controller('content')
@RequireApproved()
export class PublishedContentController {
  constructor(private readonly gateway: SupabaseGateway) {}
  @Get(':key')
  get(
    @CurrentMember() m: AuthContext,
    @Param('key', new ZodPipe(collectionKey)) key: string,
  ) {
    return this.gateway.rpc(
      m.client,
      'get_published_content',
      { p_key: key },
      contentVersion.nullable(),
    )
  }
}

@Controller('admin/media')
@RequireAdmin()
export class MediaAdminController {
  constructor(private readonly gateway: SupabaseGateway) {}
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5242880, files: 1, fields: 0 },
    }),
  )
  async upload(
    @CurrentMember() m: AuthContext,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (
      !file ||
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)
    )
      throw new BadRequestException('Use JPEG, PNG or WebP up to 5 MB')
    let buffer: Buffer
    try {
      const image = sharp(file.buffer, {
        limitInputPixels: 25000000,
        animated: false,
      })
      const meta = await image.metadata()
      if (
        !meta.format ||
        !['jpeg', 'png', 'webp'].includes(meta.format) ||
        (meta.pages ?? 1) > 1
      )
        throw new Error('Unsupported image')
      buffer = await image
        .rotate()
        .resize({
          width: 2400,
          height: 2400,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: 85 })
        .toBuffer()
    } catch {
      throw new BadRequestException(
        'Invalid image or image exceeds 25 megapixels',
      )
    }
    if (buffer.length > 5242880)
      throw new BadRequestException('Image too large')
    const id = randomUUID(),
      path = `${m.userId}/${id}.webp`
    const { error } = await m.client.storage
      .from('cms-images')
      .upload(path, buffer, {
        contentType: 'image/webp',
        upsert: false,
        cacheControl: '0',
      })
    if (error)
      throw new ServiceUnavailableException('Image storage unavailable')
    await this.gateway.rpc(
      m.client,
      'register_cms_asset',
      { p_id: id, p_path: path, p_bytes: buffer.length },
      z.uuid(),
    )
    return { id }
  }
}

@Controller('media')
@RequireApproved()
export class MediaController {
  constructor(private readonly gateway: SupabaseGateway) {}
  @Get(':id')
  async image(
    @CurrentMember() m: AuthContext,
    @Param('id', new ZodPipe(z.uuid())) id: string,
    @Res() response: Response,
  ) {
    // RLS resolves the asset path through a checked RPC; no public or long-lived signed URL.
    const path = await this.gateway.rpc(
      m.client,
      'get_cms_asset_path',
      { p_id: id },
      z.string(),
    )
    const { data, error } = await m.client.storage
      .from('cms-images')
      .download(path)
    if (error || !data)
      throw new ServiceUnavailableException('Image unavailable')
    response.setHeader('Content-Type', 'image/webp')
    response.setHeader('X-Content-Type-Options', 'nosniff')
    response.send(Buffer.from(await data.arrayBuffer()))
  }
}
@Module({
  controllers: [
    ContentAdminController,
    PublishedContentController,
    MediaAdminController,
    MediaController,
  ],
})
export class ContentModule {}
