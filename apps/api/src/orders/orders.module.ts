import { Module } from "@nestjs/common"
import { MongooseModule } from "@nestjs/mongoose"
import { PassportModule } from "@nestjs/passport"

import { OrdersController } from "./orders.controller.js"
import { OrdersService } from "./orders.service.js"
import { Order, OrderSchema } from "./schemas/order.schema.js"

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }]),
    PassportModule.register({ defaultStrategy: "jwt" }),
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
