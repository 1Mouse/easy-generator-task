import "./config/load-env.js"

import compression from "compression"
import helmet from "helmet"
import { NestFactory } from "@nestjs/core"
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger"
import { ValidationPipe } from "@nestjs/common"

import { AppModule } from "./app.module.js"
import { env } from "./config/env.validation.js"

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  app.use(helmet())
  app.use(compression())
  app.enableCors({ origin: env.CORS_ORIGIN, credentials: true })
  app.setGlobalPrefix("api")
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  )

  const swaggerConfig = new DocumentBuilder()
    .setTitle("Order Listing API")
    .setDescription("Auth + protected orders API")
    .setVersion("1.0")
    .addBearerAuth()
    .build()
  const document = SwaggerModule.createDocument(app, swaggerConfig)
  SwaggerModule.setup("api/docs", app, document)

  await app.listen(env.PORT)
}
await bootstrap()
