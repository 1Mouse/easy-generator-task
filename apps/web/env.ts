import { createEnv } from "@t3-oss/env-nextjs"
import { z } from "zod"

export const env = createEnv({
  server: {
    // Server-only on purpose: the browser never talks to the API directly, it
    // goes through this app's /api/auth/* route handlers so tokens can stay in
    // httpOnly cookies.
    API_URL: z.url().default("http://localhost:5000"),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3000"),
  },
  runtimeEnv: {
    API_URL: process.env.API_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
})
