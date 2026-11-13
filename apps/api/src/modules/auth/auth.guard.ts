import { ForbiddenException, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common'
import type { CanActivate, ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { SupabaseGateway } from './supabase.gateway.js'
import { accessSchema } from './access.schemas.js'
import { ADMIN_ROUTE, APPROVED_ROUTE, PUBLIC_ROUTE } from './auth.decorators.js'
import type { AuthenticatedRequest } from './auth.types.js'

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly gateway: SupabaseGateway) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()]
    if (this.reflector.getAllAndOverride<boolean>(PUBLIC_ROUTE, targets)) return true
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const header = request.headers.authorization
    const count = request.rawHeaders.filter((value, index) => index % 2 === 0 && value.toLowerCase() === 'authorization').length
    const match = typeof header === 'string' && header.length <= 8192 ? /^Bearer ([A-Za-z0-9._~-]+)$/i.exec(header) : null
    if (!match?.[1] || count !== 1) throw new UnauthorizedException('Bearer access token required')
    const token = match[1]
    const userId = await this.gateway.verifyToken(token)
    const client = this.gateway.createClient(token)
    const access = await this.gateway.rpc(client, 'get_my_access', {}, accessSchema)
    if (access.user_id !== userId) throw new ServiceUnavailableException('Account identity mismatch')
    // Always read current DB status, including when an old JWT still says admin/approved.
    if (this.reflector.getAllAndOverride<boolean>(ADMIN_ROUTE, targets)
      && (access.role !== 'admin' || !access.can_access_education)) throw new ForbiddenException('Admin access required')
    if (this.reflector.getAllAndOverride<boolean>(APPROVED_ROUTE, targets)
      && !access.can_access_education) throw new ForbiddenException('Approved membership required')
    request.identity = { userId, access, client }
    return true
  }
}
