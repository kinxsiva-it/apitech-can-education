import { Controller, Get, Query } from '@nestjs/common'
import { z } from 'zod'
import { Public } from '../auth/auth.decorators.js'
import { SupabaseGateway } from '../auth/supabase.gateway.js'
import { ZodPipe } from '../../common/validation/zod.pipe.js'
import type { InstitutionOption } from '@apitech/contracts'

const querySchema = z.strictObject({ search: z.string().trim().max(200).default(''), limit: z.coerce.number().int().min(1).max(50).default(20) })
const resultSchema: z.ZodType<InstitutionOption[]> = z.array(z.object({ id: z.uuid(), name: z.string() }))

@Controller('institutions')
export class InstitutionsController {
  constructor(private readonly gateway: SupabaseGateway) {}

  @Get()
  @Public()
  async options(@Query(new ZodPipe(querySchema)) query: z.infer<typeof querySchema>) {
    // Signup only needs an anonymous active-institution list, never member data.
    const escaped = query.search.replace(/[\\%_]/g, '\\$&')
    const { data, error, status } = await this.gateway.createClient().from('institutions').select('id,name')
      .ilike('name', `%${escaped}%`).order('name').limit(query.limit)
    if (error) this.gateway.fail(error, status)
    return this.gateway.parse(data, resultSchema)
  }
}
