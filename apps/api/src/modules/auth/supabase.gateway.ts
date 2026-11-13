import { ConflictException, BadRequestException, ForbiddenException, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient, PostgrestError } from '@supabase/supabase-js'
import type { ZodType } from 'zod'

@Injectable()
export class SupabaseGateway {
  constructor(private readonly config: ConfigService) {}

  createClient(token?: string): SupabaseClient {
    const url = this.config.get<string>('SUPABASE_URL')
    const key = this.config.get<string>('SUPABASE_PUBLISHABLE_KEY')
    if (!url || !key) throw new ServiceUnavailableException('Supabase is not configured')
    return createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        fetch: (input, init) => {
          const deadline = AbortSignal.timeout(5000)
          return fetch(input, { ...init, signal: init?.signal ? AbortSignal.any([init.signal, deadline]) : deadline })
        },
      },
    })
  }

  async verifyToken(token: string): Promise<string> {
    const client = this.createClient()
    // getUser contacts Auth to validate the token. Never trust getSession or decoded user_metadata here.
    const { data, error } = await client.auth.getUser(token)
    if (error) {
      if (error.status === 401 || error.status === 403 || error.status === 400) throw new UnauthorizedException('Invalid or expired access token')
      throw new ServiceUnavailableException('Authentication service unavailable')
    }
    if (!data.user?.id || data.user.is_anonymous) throw new UnauthorizedException('Authenticated account required')
    return data.user.id
  }

  fail(error: Pick<PostgrestError, 'code'>, status?: number): never {
    if (status === 401 || ['PGRST301', 'PGRST303'].includes(error.code)) throw new UnauthorizedException('Access token rejected')
    if (error.code === '42501') throw new ForbiddenException('Operation not permitted')
    if (['40001', '23505', '55000', '40P01'].includes(error.code)) throw new ConflictException('Data changed or operation conflicts with current state')
    if (['22023', '23514', '23503', '22P02'].includes(error.code)) throw new BadRequestException('Invalid values or operation')
    throw new ServiceUnavailableException('Database request failed')
  }

  parse<T>(data: unknown, schema: ZodType<T>): T {
    const result = schema.safeParse(data)
    if (!result.success) throw new ServiceUnavailableException('Unexpected database response')
    return result.data
  }

  async rpc<T>(client: SupabaseClient, name: string, args: Record<string, unknown>, schema: ZodType<T>, singleRow = false): Promise<T> {
    const query = client.rpc(name, args)
    const { data, error, status } = await (singleRow ? query.single() : query)
    if (error) this.fail(error, status)
    return this.parse(data, schema)
  }
}
