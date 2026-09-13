export const ACCESS_TOKEN_COOKIE = "order_listing_access"
export const REFRESH_TOKEN_COOKIE = "order_listing_refresh"

export const AUTH_ROUTES = {
  login: "/login",
  signup: "/signup",
  verifyEmail: "/verify-email",
} as const

/** Where a successful sign-in lands. */
export const AFTER_LOGIN_ROUTE = "/orders"

/** Routes that require a session; everything else is public. */
export const PROTECTED_ROUTES = ["/orders"] as const
