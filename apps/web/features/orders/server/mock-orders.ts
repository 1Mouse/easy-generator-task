import { ORDER_STATUSES, type Order } from "../model"

const CUSTOMER_NAMES = [
  "Alice Johnson",
  "Bob Smith",
  "Carol Williams",
  "David Brown",
  "Emma Davis",
  "Frank Miller",
  "Grace Wilson",
  "Henry Moore",
  "Ivy Taylor",
  "Jack Anderson",
  "Karen Thomas",
  "Leo Jackson",
  "Mia White",
  "Noah Harris",
  "Olivia Martin",
  "Paul Garcia",
  "Quinn Martinez",
  "Rachel Robinson",
  "Sam Clark",
  "Tara Rodriguez",
  "Uma Lewis",
  "Victor Lee",
  "Wendy Walker",
  "Xavier Hall",
  "Yara Allen",
] as const

const ITEM_CATALOG = [
  "Organic Bananas",
  "Sourdough Bread",
  "Oat Milk",
  "Free-Range Eggs",
  "Avocados",
  "Greek Yogurt",
  "Chicken Breast",
  "Brown Rice",
  "Olive Oil",
  "Fresh Salmon",
  "Sweet Potatoes",
  "Spinach Bundle",
  "Almond Butter",
  "Whole Wheat Pasta",
  "Tomato Sauce",
  "Cheddar Cheese",
  "Frozen Berries",
  "Ground Coffee",
  "Honey",
  "Dark Chocolate",
] as const

function generateOrders(count: number): Order[] {
  const baseDate = new Date("2026-03-19T12:00:00Z")

  return Array.from({ length: count }, (_, index) => {
    const id = `ORD-${String(index + 1).padStart(4, "0")}`
    const customerName = CUSTOMER_NAMES[index % CUSTOMER_NAMES.length]!
    const status = ORDER_STATUSES[index % ORDER_STATUSES.length]!
    const itemCount = (index % 4) + 1
    const items = Array.from(
      { length: itemCount },
      (_, itemIndex) =>
        ITEM_CATALOG[(index * 3 + itemIndex) % ITEM_CATALOG.length]!
    )

    const createdAt = buildCreatedAt(baseDate, index)

    return { id, customerName, status, items, createdAt }
  })
}

function buildCreatedAt(baseDate: Date, index: number): string {
  const date = new Date(baseDate)
  date.setDate(date.getDate() - index)
  date.setHours(8 + (index % 12), (index * 17) % 60, 0, 0)

  return date.toISOString()
}

export const MOCK_ORDERS: Order[] = generateOrders(118)
