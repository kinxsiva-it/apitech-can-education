import { Global, Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { AuthGuard } from './auth.guard.js'
import { SupabaseGateway } from './supabase.gateway.js'

@Global()
@Module({ providers: [SupabaseGateway, { provide: APP_GUARD, useClass: AuthGuard }], exports: [SupabaseGateway] })
export class AuthModule {}
