import { Body, Controller, Get, HttpCode, Patch, Post, Query } from '@nestjs/common'
import { CurrentMember } from '../auth/auth.decorators.js'
import type { AuthContext } from '../auth/auth.types.js'
import { ZodPipe } from '../../common/validation/zod.pipe.js'
import { MembersService } from './members.service.js'
import { membersQuery, profileInput, submitInput } from './members.schemas.js'
import type { MembersQuery, ProfileInput, SubmitInput } from './members.schemas.js'

@Controller('members/me')
export class MembersController {
  constructor(private readonly members: MembersService) {}

  @Get()
  access(@CurrentMember() member: AuthContext) { return member.access }

  @Get('profile')
  profile(@CurrentMember() member: AuthContext) { return this.members.profile(member) }

  @Patch('profile')
  updateProfile(@CurrentMember() member: AuthContext, @Body(new ZodPipe(profileInput)) input: ProfileInput) {
    return this.members.updateProfile(member, input)
  }

  @Get('requests')
  requests(@CurrentMember() member: AuthContext, @Query(new ZodPipe(membersQuery.pick({ limit: true, offset: true }))) query: Pick<MembersQuery, 'limit' | 'offset'>) {
    return this.members.requests(member, { ...query, search: '' })
  }

  @Post('requests')
  @HttpCode(200)
  submit(@CurrentMember() member: AuthContext, @Body(new ZodPipe(submitInput)) input: SubmitInput) {
    return this.members.submit(member, input.expectedRevision)
  }
}
