import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { validateEnvironment } from './config/environment.js'
import { HealthModule } from './modules/health/health.module.js'
import { AuthModule } from './modules/auth/auth.module.js'
import { MembersModule } from './modules/members/members.module.js'
import { InstitutionsModule } from './modules/institutions/institutions.module.js'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validate: validateEnvironment,
    }),
    HealthModule,
    AuthModule,
    MembersModule,
    InstitutionsModule,
  ],
})
export class AppModule {}
