import { Controller, Get } from '@nestjs/common'
import type { HealthResponse } from '@apitech/contracts'
import { Public } from '../auth/auth.decorators.js'

@Controller('health')
export class HealthController {
  @Get()
  @Public()
  getHealth(): HealthResponse {
    return { status: 'ok', service: 'apitech-api' }
  }
}
