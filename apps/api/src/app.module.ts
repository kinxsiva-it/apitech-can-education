import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { validateEnvironment } from './config/environment.js'
import { HealthModule } from './modules/health/health.module.js'
import { AuthModule } from './modules/auth/auth.module.js'
import { MembersModule } from './modules/members/members.module.js'
import { InstitutionsModule } from './modules/institutions/institutions.module.js'
import { AdminModule } from './modules/admin/admin.module.js'
import { ContentModule } from './modules/content/content.controller.js'

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
    AdminModule,
    ContentModule,
  ],
})
export class AppModule {}
