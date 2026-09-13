import { Controller, Get, Query, UseGuards } from "@nestjs/common"
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger"

import { JwtAuthGuard } from "../common/guards/jwt-auth.guard.js"
import { ListOrdersQueryDto } from "./dto/list-orders-query.dto.js"
import { OrdersService, PaginatedOrders } from "./orders.service.js"

@ApiTags("orders")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("orders")
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @ApiOperation({
    summary: "List orders (protected — requires a valid Bearer token)",
  })
  list(@Query() query: ListOrdersQueryDto): Promise<PaginatedOrders> {
    return this.ordersService.list(query)
  }
}
