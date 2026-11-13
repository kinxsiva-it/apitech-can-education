import { Module } from '@nestjs/common'
import { MembersService } from './members.service.js'
import { MembersController } from './members.controller.js'
import { AdminMembersController } from './admin-members.controller.js'

@Module({ controllers: [MembersController, AdminMembersController], providers: [MembersService] })
export class MembersModule {}
