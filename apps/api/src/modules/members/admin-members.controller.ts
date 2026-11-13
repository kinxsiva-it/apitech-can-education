import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common'
import { CurrentMember, RequireAdmin } from '../auth/auth.decorators.js'
import type { AuthContext } from '../auth/auth.types.js'
import { ZodPipe } from '../../common/validation/zod.pipe.js'
import { MembersService } from './members.service.js'
import { membersQuery, reviewInput, statusInput, uuidInput } from './members.schemas.js'
import type { MembersQuery, ReviewInput, StatusInput } from './members.schemas.js'

@Controller('admin')
@RequireAdmin()
export class AdminMembersController {
  constructor(private readonly members: MembersService) {}

  @Get('members')
  list(@CurrentMember() member: AuthContext, @Query(new ZodPipe(membersQuery)) query: MembersQuery) {
    return this.members.list(member, query)
  }

  @Patch('membership-requests/:requestId')
  review(@CurrentMember() member: AuthContext, @Param('requestId', new ZodPipe(uuidInput)) requestId: string,
    @Body(new ZodPipe(reviewInput)) input: ReviewInput) {
    return this.members.review(member, requestId, input)
  }

  @Patch('members/:userId/status')
  changeStatus(@CurrentMember() member: AuthContext, @Param('userId', new ZodPipe(uuidInput)) userId: string,
    @Body(new ZodPipe(statusInput)) input: StatusInput) {
    return this.members.changeStatus(member, userId, input)
  }
}
