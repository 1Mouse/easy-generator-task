import { createEnv } from "@t3-oss/env-core"
import { z } from "zod"

export const env = createEnv({
  server: {
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    PORT: z.coerce.number().int().positive().default(5000),
    MONGODB_URI: z.string().min(1),
    JWT_ACCESS_SECRET: z.string().min(1),
    JWT_ACCESS_EXPIRES_IN: z.string().min(1).default("5m"),
    JWT_REFRESH_SECRET: z.string().min(1),
    JWT_REFRESH_EXPIRES_IN: z.string().min(1).default("30d"),
    CORS_ORIGIN: z.string().min(1).default("http://localhost:3000"),
    // Rate limit applied to the auth controller (per client, per endpoint).
    THROTTLE_TTL_MS: z.coerce.number().int().positive().default(60_000),
    THROTTLE_LIMIT: z.coerce.number().int().positive().default(10),
    SMTP_HOST: z.string().min(1).default("localhost"),
    SMTP_PORT: z.coerce.number().int().positive().default(1025),
    SMTP_FROM: z
      .string()
      .min(1)
      .default("Order Listing <no-reply@order-listing.local>"),
    EMAIL_VERIFICATION_URL: z
      .string()
      .min(1)
      .default("http://localhost:3000/verify-email"),
    EMAIL_VERIFICATION_EXPIRES_IN_SECONDS: z.coerce
      .number()
      .int()
      .positive()
      .default(86_400),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
})

export type Env = typeof env
