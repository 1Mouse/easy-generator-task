// Standalone seed script — deliberately not wired through Nest's DI container.
// Run with: pnpm --filter api seed
import "../config/load-env.js"

import mongoose from "mongoose"

import { env } from "../config/env.validation.js"
import { generateMockOrders } from "./generate-mock-orders.js"

const orderSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    customerName: { type: String, required: true },
    status: { type: String, required: true, index: true },
    items: { type: [String], required: true },
    createdAt: { type: String, required: true },
  },
  { collection: "orders", versionKey: false }
)

async function seed() {
  await mongoose.connect(env.MONGODB_URI)
  const OrderModel = mongoose.model("Order", orderSchema)

  const orders = generateMockOrders(118)
  const operations = orders.map((order) => ({
    updateOne: {
      filter: { id: order.id },
      update: { $set: order },
      upsert: true,
    },
  }))

  const result = await OrderModel.bulkWrite(operations)
  console.log(
    `Seeded orders: ${result.upsertedCount} inserted, ${result.modifiedCount} updated, ${orders.length} total.`
  )

  await mongoose.disconnect()
}

await seed()
