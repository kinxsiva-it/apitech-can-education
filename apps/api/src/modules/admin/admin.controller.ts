import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common'
import { z } from 'zod'
import { CurrentMember, RequireAdmin } from '../auth/auth.decorators.js'
import type { AuthContext } from '../auth/auth.types.js'
import { SupabaseGateway } from '../auth/supabase.gateway.js'
import { ZodPipe } from '../../common/validation/zod.pipe.js'

const pageQuery = z.strictObject({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).max(100000).default(0),
})
const institutionInput = z.strictObject({
  id: z.uuid().nullable(),
  name: z.string().trim().min(1).max(200),
  isActive: z.boolean(),
  expectedVersion: z.number().int().positive().nullable(),
})
const institutionSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  is_active: z.boolean(),
  version: z.number().int(),
  created_at: z.string(),
  updated_at: z.string(),
})

@Controller('admin')
@RequireAdmin()
export class AdminController {
  constructor(private readonly gateway: SupabaseGateway) {}

  @Get('email-deliveries')
  emails(
    @CurrentMember() member: AuthContext,
    @Query(new ZodPipe(pageQuery)) query: z.infer<typeof pageQuery>,
  ) {
    return this.gateway.rpc(
      member.client,
      'list_membership_email_status',
      { p_limit: query.limit, p_offset: query.offset },
      z.object({
        items: z.array(z.unknown()),
        total: z.number(),
        limit: z.number(),
        offset: z.number(),
      }),
    )
  }

  @Get('institutions')
  async institutions(
    @CurrentMember() member: AuthContext,
    @Query(new ZodPipe(pageQuery)) query: z.infer<typeof pageQuery>,
  ) {
    const { data, error, status, count } = await member.client
      .from('institutions')
      .select('*', { count: 'exact' })
      .order('name')
      .order('id')
      .range(query.offset, query.offset + query.limit - 1)
    if (error) this.gateway.fail(error, status)
    return {
      items: this.gateway.parse(data, z.array(institutionSchema)),
      total: count,
      ...query,
    }
  }
  @Post('institutions')
  saveInstitution(
    @CurrentMember() member: AuthContext,
    @Body(new ZodPipe(institutionInput))
    input: z.infer<typeof institutionInput>,
  ) {
    return this.gateway.rpc(
      member.client,
      'save_institution',
      {
        p_id: input.id,
        p_name: input.name,
        p_active: input.isActive,
        p_expected_version: input.expectedVersion,
      },
      institutionSchema,
      true,
    )
  }
  @Get('notifications')
  async notifications(
    @CurrentMember() member: AuthContext,
    @Query(new ZodPipe(pageQuery)) query: z.infer<typeof pageQuery>,
  ) {
    const { data, error, status, count } = await member.client
      .from('admin_notifications')
      .select('id,request_id,created_at,read_at', { count: 'exact' })
      .eq('recipient_id', member.userId)
      .order('created_at', { ascending: false })
      .order('id')
      .range(query.offset, query.offset + query.limit - 1)
    if (error) this.gateway.fail(error, status)
    const unread = await member.client
      .from('admin_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_id', member.userId)
      .is('read_at', null)
    if (unread.error) this.gateway.fail(unread.error, unread.status)
    return { items: data, total: count, unread: unread.count, ...query }
  }
  @Patch('notifications/:id/read')
  read(
    @CurrentMember() member: AuthContext,
    @Param('id', new ZodPipe(z.uuid())) id: string,
  ) {
    return this.gateway.rpc(
      member.client,
      'mark_notification_read',
      { p_notification_id: id },
      z.boolean(),
    )
  }
  @Get('audit')
  async audit(
    @CurrentMember() member: AuthContext,
    @Query(new ZodPipe(pageQuery)) query: z.infer<typeof pageQuery>,
  ) {
    const { data, error, status, count } = await member.client
      .from('audit_logs')
      .select(
        'id,actor_id,action,entity_type,entity_id,before_data,after_data,created_at',
        { count: 'exact' },
      )
      .order('created_at', { ascending: false })
      .order('id')
      .range(query.offset, query.offset + query.limit - 1)
    if (error) this.gateway.fail(error, status)
    return { items: data, total: count, ...query }
  }
  @Get('members/:id/history')
  async history(
    @CurrentMember() member: AuthContext,
    @Param('id', new ZodPipe(z.uuid())) id: string,
    @Query(new ZodPipe(pageQuery)) query: z.infer<typeof pageQuery>,
  ) {
    const { data, error, status, count } = await member.client
      .from('membership_events')
      .select('id,action,from_status,to_status,actor_id,reason,created_at', {
        count: 'exact',
      })
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .order('id')
      .range(query.offset, query.offset + query.limit - 1)
    if (error) this.gateway.fail(error, status)
    return { items: data, total: count, ...query }
  }
}
