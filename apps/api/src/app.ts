import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { ConfigService } from '@nestjs/config'
import { AppModule } from './app.module.js'

export async function createApp(logger: false | undefined = undefined) {
  const app = await NestFactory.create(AppModule, { logger })
  app.setGlobalPrefix('api')
  const config = app.get(ConfigService)
  app.enableCors({ origin: config.getOrThrow<string[]>('CORS_ORIGINS') })
  app.enableShutdownHooks()
  return app
}
