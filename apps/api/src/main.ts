import { ConfigService } from '@nestjs/config'
import { createApp } from './app.js'

async function bootstrap() {
  const app = await createApp()
  const config = app.get(ConfigService)
  await app.listen(config.getOrThrow<number>('PORT'), config.getOrThrow<string>('HOST'))
}

bootstrap().catch(() => {
  console.error('API failed to start. Check server configuration and port availability.')
  process.exitCode = 1
})
