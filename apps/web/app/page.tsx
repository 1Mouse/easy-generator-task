import Image from "next/image"
import Link from "next/link"
import { Button } from "@workspace/ui/components/button"

export default function Page() {
  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="flex flex-col items-center gap-6 text-center">
        <Image
          src="/assets/rabbit-logo.png"
          alt="Rabbit"
          width={240}
          height={60}
          priority
          className="h-auto not-dark:bg-primary"
        />
        <p className="text-sm text-muted-foreground">
          View and manage customer orders.
        </p>
        <Button nativeButton={false} render={<Link href="/orders" />}>
          View Orders
        </Button>
      </div>
    </div>
  )
}
