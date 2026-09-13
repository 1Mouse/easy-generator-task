import { Injectable } from "@nestjs/common"
import { InjectModel } from "@nestjs/mongoose"
import { FilterQuery, Model } from "mongoose"

import { ListOrdersQueryDto } from "./dto/list-orders-query.dto.js"
import { Order, OrderDocument } from "./schemas/order.schema.js"

const MAX_PAGE_SIZE = 50

export interface PaginatedOrders {
  data: Order[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>
  ) {}

  async list(query: ListOrdersQueryDto): Promise<PaginatedOrders> {
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, query.pageSize))

    const filter: FilterQuery<OrderDocument> = {}
    if (query.status) {
      filter.status = query.status
    }
    if (query.search) {
      const term = query.search.trim()
      if (term) {
        const pattern = new RegExp(escapeRegExp(term), "i")
        filter.$or = [{ customerName: pattern }, { id: pattern }]
      }
    }

    const total = await this.orderModel.countDocuments(filter).exec()
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    const page = Math.min(Math.max(1, query.page), totalPages)

    const data = await this.orderModel
      .find(filter, { _id: 0 })
      .sort({ createdAt: query.sort === "asc" ? 1 : -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean()
      .exec()

    return { data, total, page, pageSize, totalPages }
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
