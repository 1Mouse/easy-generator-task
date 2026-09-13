import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import { HydratedDocument } from "mongoose"

export const ORDER_STATUSES = [
  "New",
  "Picking",
  "Delivering",
  "Delivered",
] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

export type OrderDocument = HydratedDocument<Order>

@Schema({ collection: "orders", versionKey: false })
export class Order {
  @Prop({ required: true, unique: true, index: true })
  id!: string

  @Prop({ required: true })
  customerName!: string

  @Prop({ type: String, required: true, enum: ORDER_STATUSES, index: true })
  status!: OrderStatus

  @Prop({ type: [String], required: true, default: [] })
  items!: string[]

  // Kept as an ISO string (not a Mongo Date) to match apps/web's Order type exactly.
  @Prop({ required: true })
  createdAt!: string
}

export const OrderSchema = SchemaFactory.createForClass(Order)
