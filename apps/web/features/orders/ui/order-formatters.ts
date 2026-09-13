export function formatOrderDate(createdAt: string): string {
  return new Date(createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export function formatOrderItemsSummary(items: string[]): string {
  if (items.length <= 2) {
    return items.join(", ")
  }

  return `${items[0]}, ${items[1]} +${items.length - 2} more`
}
