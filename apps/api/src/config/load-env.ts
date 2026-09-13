// Must be imported before anything that reads `process.env` (env.validation.ts
// included) — Node has no automatic .env loading, and we deliberately don't
// pull in @nestjs/config just for this.
import { existsSync } from "node:fs"
import { resolve } from "node:path"

const envPath = resolve(process.cwd(), ".env")
if (existsSync(envPath)) {
  process.loadEnvFile(envPath)
}
