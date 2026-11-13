import { BadRequestException } from '@nestjs/common'
import type { PipeTransform } from '@nestjs/common'
import type { ZodType } from 'zod'

/** Reject unknown keys rather than accepting hidden role/actor/status fields. */
export class ZodPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodType<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value)
    if (!result.success) {
      throw new BadRequestException({
        message: 'Invalid request data',
        issues: result.error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })),
      })
    }
    return result.data
  }
}
