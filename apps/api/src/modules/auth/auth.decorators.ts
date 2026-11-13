import { SetMetadata, UnauthorizedException, createParamDecorator } from '@nestjs/common'
import type { AuthenticatedRequest } from './auth.types.js'

export const PUBLIC_ROUTE = 'apitech:public'
export const ADMIN_ROUTE = 'apitech:admin'
export const APPROVED_ROUTE = 'apitech:approved'
export const Public = () => SetMetadata(PUBLIC_ROUTE, true)
export const RequireAdmin = () => SetMetadata(ADMIN_ROUTE, true)
export const RequireApproved = () => SetMetadata(APPROVED_ROUTE, true)
export const CurrentMember = createParamDecorator((_value, context) => {
  const identity = context.switchToHttp().getRequest<AuthenticatedRequest>().identity
  if (!identity) throw new UnauthorizedException()
  return identity
})
