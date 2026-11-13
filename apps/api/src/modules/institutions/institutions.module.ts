import { Module } from '@nestjs/common'
import { InstitutionsController } from './institutions.controller.js'

@Module({ controllers: [InstitutionsController] })
export class InstitutionsModule {}
