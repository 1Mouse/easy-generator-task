"use client"

import { Button } from "@workspace/ui/components/button"

import { useLogout } from "../hooks/use-auth-mutations"

export function SignOutButton() {
  const logout = useLogout()

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => logout.mutate()}
      disabled={logout.isPending}
    >
      {logout.isPending ? "Signing out…" : "Sign out"}
    </Button>
  )
}
