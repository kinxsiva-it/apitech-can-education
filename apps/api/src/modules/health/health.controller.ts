import { Controller, Get } from '@nestjs/common'
import type { HealthResponse } from '@apitech/contracts'

@Controller('health')
export class HealthController {
  @Get()
  getHealth(): HealthResponse {
    return { status: 'ok', service: 'apitech-api' }
  }
}
