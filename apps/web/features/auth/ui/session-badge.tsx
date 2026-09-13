"use client"

import { useSession } from "../hooks/use-session"
import { SignOutButton } from "./sign-out-button"

/** Signed-in identity plus the way out, for the header of protected pages. */
export function SessionBadge() {
  const { user, isPending } = useSession()

  if (isPending || !user) return null

  return (
    <div className="flex items-center gap-3">
      <div className="min-w-0 text-right">
        <p className="truncate text-xs font-medium">{user.name}</p>
        {/* Emails get long; keep them from crowding the sign-out control. */}
        <p className="max-w-[16rem] truncate text-xs text-muted-foreground">
          {user.email}
        </p>
      </div>
      <SignOutButton />
    </div>
  )
}
