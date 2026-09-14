import Link from "next/link"
import { Button } from "@workspace/ui/components/button"

import { Logo } from "@/components/brand/logo"

export default function Page() {
  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="flex flex-col items-center gap-6 text-center">
        <Logo className="[&_span]:text-3xl [&_svg]:size-12" />
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
