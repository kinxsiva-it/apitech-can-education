import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { ConfigService } from '@nestjs/config'
import { AppModule } from './app.module.js'
import type { Request, Response, NextFunction } from 'express'

export async function createApp(logger: false | undefined = undefined) {
  const app = await NestFactory.create(AppModule, { logger })
  app.setGlobalPrefix('api')
  app.use((_request: Request, response: Response, next: NextFunction) => {
    response.setHeader('Cache-Control', 'no-store')
    next()
  })
  const config = app.get(ConfigService)
  app.enableCors({ origin: config.getOrThrow<string[]>('CORS_ORIGINS') })
  app.enableShutdownHooks()
  return app
}
