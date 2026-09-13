import { Module } from "@nestjs/common"
import { APP_FILTER, APP_INTERCEPTOR } from "@nestjs/core"
import { MongooseModule } from "@nestjs/mongoose"

import { AuthModule } from "./auth/auth.module.js"
import { HttpExceptionFilter } from "./common/filters/http-exception.filter.js"
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor.js"
import { env } from "./config/env.validation.js"
import { HealthController } from "./health/health.controller.js"
import { OrdersModule } from "./orders/orders.module.js"
import { UsersModule } from "./users/users.module.js"

@Module({
  imports: [
    MongooseModule.forRoot(env.MONGODB_URI),
    UsersModule,
    AuthModule,
    OrdersModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule {}
