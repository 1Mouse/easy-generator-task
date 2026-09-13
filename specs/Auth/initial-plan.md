# Add NestJS Auth + Orders API to the Turborepo

## Phase scope for this pass

This pass builds **backend only** (Milestones 1-4 below). Frontend integration (sign-up/sign-in/app pages, `packages/ui` additions, wiring `app/orders/page.tsx` to the real API — originally Milestone 5) is deferred to a later pass and is not implemented now; it stays in this document for continuity but nothing under it gets built yet.

Deliverables for this pass, all under a new `specs/Auth/` directory (design artifacts, checked in alongside the code):

- `specs/Auth/initial-plan.md` — this plan, copied in verbatim as the design record for the backend work.
- `specs/Auth/ER-diagram.puml` — entity-relationship diagram (User / Order collections, fields, indexes/uniqueness).
- `specs/Auth/sequence-diagram.puml` — sequence diagram covering sign-up, sign-in, and an authenticated request to the protected `/api/orders` endpoint (JWT issuance → Bearer header → guard/strategy validation).
- `specs/Auth/class-diagram.puml` — class diagram of the NestJS module (modules, controllers, services, guards, strategy, DTOs, schemas, and their relationships).
- All three `.puml` files validated by running the locally installed `plantuml` CLI against each (confirms syntax and renders an output diagram) before considering the design step done.
- A Bruno collection (`.bru` files) under the repo-root `bruno/` directory (already present, empty, matching the convention seen in the reference `learning-be/ecommerce/bruno` collection) to manually exercise the API once built: signup (valid + invalid-password/email/name variants), signin (valid + wrong-password), `GET /api/orders` without a token (expect 401) and with a token (expect 200 + paginated data), and `GET /api/health` (public, no token). A `bruno/environments/Local.bru` with `baseUrl` and placeholder vars, and `script:post-response` blocks on Signup/Signin capturing `accessToken` into the environment for subsequent requests' bearer auth — same pattern as the reference collection.

## Context

`task.md` (the take-home brief) asks for a production-ready sign-up/sign-in auth module: a React/TS frontend and a NestJS + MongoDB backend, with the same field validation on both sides, at least one JWT-protected endpoint, and a README. This repo already has the frontend half of the stack — `apps/web` (Next.js 16 + `@workspace/ui`) currently renders an orders table from 118 in-memory mock records (`apps/web/features/orders/server/mock-orders.ts` → `list-orders.ts` → `app/orders/page.tsx`) with no backend at all.

The goal of this change is to add a real NestJS backend (`apps/api`) into the existing pnpm/Turborepo workspace, backed by MongoDB, that:

- authenticates users (sign-up/sign-in, JWT), matching the frontend's validation rules exactly,
- serves the orders table data from a **protected** endpoint (guarded by JWT) instead of in-memory mocks, seeded from the same mock dataset so the UI looks identical,
- exposes at least one clearly **public** endpoint (`/api/health`) distinct from signup/signin,
- is testable at three tiers (unit, integration via in-memory Mongo, full e2e) using **Vitest** (not Nest's default Jest, to stay consistent with `apps/web`), per the user's explicit request,
- wires the new sign-up/sign-in/"welcome" pages into `apps/web` using `@workspace/ui` primitives.

Scope is deliberately bounded to match task.md's own scoring note ("delivery speed... a few hours, not days"): simple authenticated-only guarding (no RBAC), no separate Dockerization of the API itself (only Mongo runs in Docker Compose), and duplication over premature sharing where extracting a shared package would introduce real runtime risk (see Milestone 3).

User-confirmed decisions baked into this plan:

- MongoDB via **Docker Compose** (local `mongo` service).
- Seed the orders collection from the **existing mock-orders generator logic** so the API serves the same 118 records the UI currently renders from memory.
- Testing: **unit + integration (mongodb-memory-server) + full e2e**, all on **Vitest**, per NestJS's testing docs (runner-agnostic `@nestjs/testing`).
- Authorization: simple **authenticated-only** guard, no roles.

## Milestone 1 — Scaffold `apps/api` into the workspace

```
pnpm dlx @nestjs/cli new api --package-manager pnpm --directory apps/api --skip-git --skip-install
pnpm install
```

`--skip-install` avoids Nest CLI running its own npm install inside the package (would create a stray lockfile/nested node_modules); pnpm does the single workspace install after.

Post-scaffold fixes (Nest's generated files don't match this repo's conventions):

- `apps/api/package.json`: `"private": true`; remove the generated Jest config + `jest`/`ts-jest`/`@types/jest` deps (replaced by Vitest, Milestone 4); add `@workspace/eslint-config`/`@workspace/typescript-config` as `workspace:*` devDeps; scripts: `dev` (`nest start --watch`), `build` (`nest build`), `start` (`node dist/main.js`), `lint`, `format`, `typecheck` (`tsc --noEmit`), `test`/`test:watch`/`test:integration`/`test:e2e` (Vitest, see Milestone 4).
- **New file** `packages/typescript-config/nestjs.json` extending `./base.json` (base.json uses `NodeNext`/strict — fine to keep — but Nest needs `experimentalDecorators`, `emitDecoratorMetadata`, `module: "CommonJS"`, `moduleResolution: "Node"`, `allowSyntheticDefaultImports: true`, `strictPropertyInitialization: false` since Nest DI classes/Mongoose `@Prop()` fields have no initializers). `apps/api/tsconfig.json` extends `@workspace/typescript-config/nestjs.json`, keeps `tsconfig.build.json` (Nest CLI convention, excludes `test/**`).
- `apps/api/eslint.config.js`: same pattern as `apps/web/eslint.config.js` — import `config` from `@workspace/eslint-config/base`, add `ignores: ["dist/**"]`.
- Delete Nest-generated `.prettierrc`/root-duplicating `.gitignore` entries/README — root configs already govern the workspace (and `lefthook.yml` pre-commit/pre-push runs lint/typecheck/test across all packages, so this must lint/typecheck/test cleanly once wired in).
- **New file** `apps/api/turbo.json` extending `["//"]`, declaring `dev` (persistent, env: `MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `PORT`, `CORS_ORIGIN`), `build` (outputs `dist/**`, no env needed — `nest build` is just `tsc`), `typecheck`, `test:integration`/`test:e2e` (dependsOn `transit`).
- Root `turbo.json`: add `test:integration` task (`dependsOn: ["transit"]`) — api-only, no other root changes needed.
- Root `package.json`: add `test:integration` and `test:e2e:api` convenience scripts (`turbo run ... --filter=api`). Keep the existing `test:e2e` script filtered to `web` unchanged (avoid surprising existing behavior); the shared task _name_ `test:e2e` across both apps (Playwright for web, Vitest+supertest for api) is fine — same vocabulary, different implementation, standard Turborepo pattern.

Gotcha: use **`bcryptjs`** (pure JS) instead of `bcrypt` for password hashing — avoids native builds, which pnpm blocks by default (`pnpm-workspace.yaml`'s `onlyBuiltDependencies` only allow-lists `lefthook` today).

Verify: `pnpm --filter api dev` boots Nest's hello-world on a configured port before proceeding.

## Milestone 2 — NestJS module architecture

Layout under `apps/api/src/`: `main.ts`, `app.module.ts`, `config/env.validation.ts` (`@t3-oss/env-core` + zod — same tool family as `apps/web/env.ts`, fail-fast on boot for `MONGODB_URI`/`JWT_SECRET`/`JWT_EXPIRES_IN`/`PORT`/`CORS_ORIGIN`), `common/` (exception filter, logging interceptor, `JwtAuthGuard`, `@CurrentUser()` decorator), `auth/` (module, controller, service, DTOs, `jwt.strategy.ts`), `users/` (module, service, Mongoose `user.schema.ts`), `orders/` (module, controller, service, DTO, `order.schema.ts`), `health/health.controller.ts`, `seed/`.

- Global prefix `api` (`app.setGlobalPrefix('api')`) → `POST /api/auth/signup`, `POST /api/auth/signin`, `GET /api/auth/me` (protected), `GET /api/orders` (protected), `GET /api/health` (public — the explicit non-protected endpoint).
- DTOs via `class-validator`, matching task.md exactly: `SignUpDto` — `email: @IsEmail()`, `name: @IsString() @MinLength(3)`, `password: @MinLength(8)` + `@Matches(...)` requiring a letter, a digit, and a special char. `SignInDto` — email + non-empty password only (no strength re-check on login). Global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })`.
- `AuthService`: signup checks `UsersService.findByEmail` (409 if exists), hashes with `bcryptjs`, persists, signs a JWT via `@nestjs/jwt` (`{ sub, email }`), returns `{ accessToken }` (never the hash). Signin: lookup + `bcryptjs.compare`, 401 on mismatch.
- `passport-jwt` strategy (`ExtractJwt.fromAuthHeaderAsBearerToken()`), `JwtAuthGuard extends AuthGuard('jwt')`, applied via `@UseGuards` on `OrdersController` and `GET /auth/me`.
- **Orders endpoint — full parity with the existing frontend contract**, not a simplified version: `OrdersService.list(query)` takes the same shape as `apps/web/features/orders/query-state.ts`'s `OrderListQuery` (`page`, `pageSize`, `status`, `search`, `sort`) and does the Mongoose equivalent of `list-orders.ts` (filter by status/search regex → sort by `createdAt` → skip/limit), returning the same paginated shape (`data, total, page, pageSize, totalPages`). This means `OrderTable`, `DataTable`, the toolbar, and nuqs parsers in `apps/web` need **zero changes** — only the fetch call changes (Milestone 5). `OrderSchema` keeps `createdAt` as an ISO **string** (matching the existing `Order` type, not a Mongo Date) and projects out `_id`/`__v` so API JSON matches `Order` exactly. `UserSchema`: `email` (unique/lowercase/trim), `name`, `passwordHash`.
- Cheap production-readiness additions: `helmet()`, `compression()`, a global `HttpExceptionFilter` (consistent `{statusCode, message, error, path, timestamp}`), a `LoggingInterceptor` (method/path/status/duration via Nest's `Logger`), `@nestjs/throttler` on the `auth` controller only (~10 req/min), `enableCors({ origin: CORS_ORIGIN, credentials: true })` (defensive — see Milestone 5, the actual auth flow doesn't depend on it).
- `@nestjs/swagger` mounted at `/api/docs` with `addBearerAuth()` — cheap bonus point, DTOs get `@ApiProperty()`.

## Milestone 3 — MongoDB + seeding

Root `docker-compose.yml`, Mongo only (deliberately not containerizing the API itself — disproportionate scope for this task; note the cut in the README):

```yaml
services:
  mongo:
    image: mongo:7
    restart: unless-stopped
    ports: ["27017:27017"]
    volumes: ["mongo-data:/data/db"]
volumes:
  mongo-data:
```

`apps/api/.env.example` (committed): `MONGODB_URI=mongodb://localhost:27017/order-listing`, `JWT_SECRET=change-me`, `JWT_EXPIRES_IN=1h`, `PORT=3001`, `CORS_ORIGIN=http://localhost:3000`. `apps/api/.env` gitignored.

Seed script `apps/api/src/seed/seed.ts`, run standalone (plain `mongoose.connect()`, **not** through Nest's DI container — unnecessary ceremony for a one-off script): generates the same 118 records via a self-contained copy of the mock generator (`apps/api/src/seed/generate-mock-orders.ts`) and `bulkWrite`s idempotent upserts keyed on `id`.

**Duplicate the generator rather than extracting a shared package.** `apps/web` resolves `@workspace/ui` via TS path aliases pointing at source (fine — bundled by Next/Vite); `apps/api` is compiled by `tsc` to CommonJS and run as plain `node dist/main.js`, where path aliases are erased and a path-aliased shared package would silently break at runtime after build (needing `tsconfig-paths/register` to fix) — a real time-sink under a "few hours" budget for a ~30-line function. Duplicate `generateMockOrders` and the 2-3 validation constants (min password length, the regex, min name length) with a `// keep in sync with apps/api/...`-style comment on both sides. Do not touch `apps/web/features/orders/server/mock-orders.ts` or `list-orders.ts` — leave them exactly as-is (Milestone 5 explains why).

## Milestone 4 — Testing (Vitest, three tiers)

Nest's testing utilities (`Test.createTestingModule`) are runner-agnostic, but Vitest's default esbuild transform strips decorators without emitting `design:type`/`design:paramtypes` metadata, which silently breaks Nest's constructor DI and `@Prop()` schemas. Fix: **`unplugin-swc`** as the Vitest transform, with `jsc.transform.legacyDecorator: true` and `jsc.transform.decoratorMetadata: true` both set (missing either breaks DI silently, not loudly — the actual gotcha to watch for). New devDeps: `unplugin-swc`, `@swc/core`, `vitest`, `@nestjs/testing`, `mongodb-memory-server`, `supertest`, `@types/supertest`.

- `apps/api/vitest.setup.ts`: `import "reflect-metadata"` (must load before any decorated class), mirroring `apps/web/vitest.setup.ts`'s role.
- `apps/api/vitest.shared.ts`: shared `defineConfig` (SWC plugin, `resolve.alias` for `@/` → `./src/` — matching `apps/web/vitest.config.ts`'s existing manual-alias convention rather than adding a new `vite-tsconfig-paths` dependency, `test.globals: true`, `test.setupFiles`). Three thin configs via `mergeConfig`:
  - `vitest.config.ts` — unit, `src/**/*.spec.ts`: mock `UsersService`/`JwtService` via `Test.createTestingModule({ providers: [...] })`, assert `AuthService`'s branches (duplicate email, wrong password, success) and `OrdersService`'s query-building against a mocked Mongoose `Model`.
  - `vitest.integration.config.ts` — `src/**/*.integration-spec.ts`, raised timeout: `beforeAll` starts `MongoMemoryServer`, feeds its URI into `Test.createTestingModule({ imports: [MongooseModule.forRoot(uri), UsersModule] })` — real Mongoose + real Nest DI, no HTTP layer. Covers `UsersService` round-trips and `OrdersService` filter/sort/paginate against seeded docs.
  - `vitest.e2e.config.ts` — `test/**/*.e2e-spec.ts` (Nest's own convention): builds the full `AppModule` against the in-memory Mongo URI, `app.init()` (no `listen()` needed), `supertest(app.getHttpServer())`. Covers signup (201), duplicate email (409), invalid password (400), signin (200 + token), `/orders` without token (401) and with token (200 + correct shape), `/health` with no token (200).
- All three tiers are hermetic (no real `MONGODB_URI` needed) — none need env vars declared for Turborepo caching.
- Gotcha: `mongodb-memory-server` downloads a real `mongod` binary on first run (~70MB, needs network); if CI is added later, cache `~/.cache/mongodb-binaries`.

## Milestone 5 — Frontend integration (deferred — not built in this pass)

New pages in `apps/web/app/`: `(auth)/sign-up/page.tsx`, `(auth)/sign-in/page.tsx` (shared minimal layout via a route group), `app/page.tsx` — the task.md "App page": "Welcome to the application[, {name}]." + logout button, redirects to `/sign-in` if unauthenticated.

**Auth state: httpOnly cookie via Next Server Actions, not localStorage.** Storing the JWT in `localStorage` + client-side `Authorization` header is readable by any injected script (XSS exposure); an httpOnly cookie the browser JS can never read is the more production-appropriate default and is what task.md's "production-ready" scoring criterion rewards. Concretely: `apps/web/features/auth/server/actions.ts` — `"use server"` `signUpAction`/`signInAction`/`signOutAction`, each `fetch`ing the Nest API server-side and setting `cookies().set("token", accessToken, { httpOnly: true, sameSite: "lax", secure: prod, path: "/" })` then `redirect("/app")`. Forms use `useActionState` for pending/error UI (no new form library — `react-hook-form` isn't used elsewhere in this repo and two 2-3-field forms don't need it). Because the JWT never reaches client JS and is only ever forwarded server-to-server, CORS is largely moot for this flow (still configured defensively on the Nest side for direct/Swagger use).

`env.ts`: add a server-only `API_URL` (`@t3-oss/env-nextjs`'s `server: {}` block, `z.url().default("http://localhost:3001")`).

`app/orders/page.tsx`: replace the `listOrders(query)` in-memory call with a server-side `fetch(`${API_URL}/api/orders?...`, { headers: { Authorization: \`Bearer ${token}\` }, cache: "no-store" })`, redirecting to `/sign-in`on 401. No changes to`OrderTable`/`DataTable`/toolbar/nuqs parsers. `app/app/page.tsx` also reads the cookie server-side and redirects if absent.

`mock-orders.ts`/`list-orders.ts` (+ its existing test) stay untouched — no longer wired into `page.tsx`, but remain the executable spec the Nest `OrdersService` must match and a trivial offline fallback; not worth building an actual runtime toggle between them.

`packages/ui` additions (following existing CVA/Base-UI conventions in `packages/ui/src/components/`): `label.tsx` and a small `field-error.tsx` for validation messages — `input.tsx`/`button.tsx` already cover the fields. No checkbox — task.md's fields don't need one.

## Milestone 6 — README / AI.md

Root `README.md` needs a full rewrite (currently documents the old "Rabbit Orders" demo): prerequisites, `docker compose up -d`, `pnpm install`, `.env.example` → `.env` copy, seed command, `pnpm dev` (both apps via turbo), web/API/Swagger URLs, and how to run each test tier. `AI.md` is a required deliverable but its content is the developer's own reflection — just don't forget to create it before submitting.

## Verification (this pass — backend only)

- `pnpm --filter api dev` boots the API against the composed Mongo; `GET /api/health` returns 200 with no auth header.
- `pnpm --filter api seed` populates the `orders` collection with 118 records matching the current mock data.
- `pnpm test`, `pnpm test:integration`, `pnpm test:e2e:api` all pass for `apps/api`.
- `pnpm lint`, `pnpm typecheck` at the root (turbo, all packages) pass, satisfying `lefthook`'s pre-commit/pre-push hooks.
- Each `specs/Auth/*.puml` renders cleanly via the local `plantuml` CLI (e.g. `plantuml specs/Auth/ER-diagram.puml`) with no syntax errors, producing a diagram image alongside it.
- The Bruno collection in `bruno/` is run manually (Bruno CLI or GUI) against the running API to exercise: signup happy path + each validation failure, signin happy path + wrong password, `GET /api/orders` unauthenticated (401) and authenticated (200), `GET /api/health` (200, no auth).

Frontend verification (browser walkthrough of sign-up → app page → orders table → logout) is deferred to the later frontend-integration pass, once Milestone 5 is actually built.

---

# Increment 2 — Email Verification + Podman Dockerization

## Context

The backend built in the pass above lets any freshly signed-up account log in immediately. The user wants a real email-verification gate — "the account shouldn't be active directly after signup" — modeled on a reference implementation they pointed at (`/home/mouse/projects/learning-be/ecommerce/`, a hand-rolled Express/Mongoose backend, NOT NestJS, but its design doc `docs/specs/auth-email-verification/initial-email-verification-decisions.md` and actual code are a deliberate blueprint to translate into our NestJS/Mongoose/Vitest stack). They also want the API itself containerized with **Podman**, using **Mongo 8** and **Mailpit** (a local SMTP-catcher with a web inbox), again mirroring that reference project's `Containerfile`/`compose.yaml` style but adapted for our pnpm/Turborepo monorepo layout (their repo is a flat single-package repo; ours is not, which changes the container build meaningfully).

User-confirmed decisions:

- **E2E tests stay hermetic**: mock `MailService` in e2e tests (no live Mailpit needed to run `pnpm test:e2e`), capturing the raw verification token straight from the mock's call args. Real end-to-end mail delivery is verified manually via Bruno + `podman compose up -d`, not by the automated suite.
- **This is an intentional breaking API change**: `signup` stops returning an `accessToken` (returns `{user, message}` instead); `signin` now returns `403 EMAIL_NOT_VERIFIED` for unverified accounts; verifying email auto-logs-in by returning a token. All existing tests/Bruno requests touching signup/signin get updated accordingly.

## Milestone 1 — Data model

`apps/api/src/users/schemas/user.schema.ts`: add `@Prop({ type: Date, default: null }) emailVerifiedAt!: Date | null` — `null` = unverified, a `Date` = verified-at-that-time (not a boolean flag, matching the reference convention).

**New file** `apps/api/src/auth/schemas/email-verification-token.schema.ts` (an `auth` concern, not `users` — `users/` has no schema-per-concern precedent to fight):

```ts
@Schema({ timestamps: true, collection: "emailVerificationTokens" })
export class EmailVerificationToken {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: User.name,
    required: true,
    index: true,
  })
  userId!: Types.ObjectId

  @Prop({ required: true, unique: true })
  tokenHash!: string

  @Prop({ type: Date, required: true, expires: 0 })
  expiresAt!: Date

  @Prop({ type: Date, default: null })
  usedAt!: Date | null
}
```

`expires: 0` on an absolute `expiresAt` Date creates a Mongo **TTL index** that expires exactly at the stored timestamp (distinct from the more common `expires: <seconds>` pattern on a `createdAt`-like field) — this is Mongoose's real TTL mechanism, not just a plain index. Skip the reference's generic soft-delete (`deletedAt`) — that's a repo-wide convention there we don't share; a token expiring/being marked used is enough here. Register the schema in `AuthModule`'s `MongooseModule.forFeature([...])` (new — `AuthModule` doesn't register any schema today).

Add `UsersService.markEmailVerified(id): Promise<UserDocument | null>` — `findByIdAndUpdate(id, { emailVerifiedAt: new Date() }, { new: true })`.

## Milestone 2 — Mail plumbing

**New module** `apps/api/src/mail/`: `mail.module.ts` + `mail.service.ts`. `MailService` wraps `nodemailer.createTransport({ host: env.SMTP_HOST, port: env.SMTP_PORT, secure: false })` with one method `sendMail({ to, subject, text, html? }): Promise<void>`. New deps: `nodemailer`, `@types/nodemailer` (dev).

**New file** `apps/api/src/auth/token.util.ts` — two pure functions, no class/DI needed (we have no refresh tokens, so no generalized `TokenService`):

```ts
export function generateVerificationToken(): string {
  return randomBytes(48).toString("base64url") // raw token — NOT a JWT, NOT stored anywhere
}
export function hashVerificationToken(token: string): string {
  return createHash("sha256").update(token).digest("hex") // this is what gets persisted
}
```

**New file** `apps/api/src/auth/email-verification.service.ts` — the architecture boundary the reference project calls out explicitly ("the auth module should not know Mailpit directly"): `AuthService` never touches nodemailer/crypto/the token schema, only this service does.

```ts
async createAndSendToken(user: { id: string; email: string }): Promise<void> {
  const rawToken = generateVerificationToken()
  const tokenHash = hashVerificationToken(rawToken)
  await this.tokenModel.create({ userId: user.id, tokenHash, expiresAt: new Date(Date.now() + env.EMAIL_VERIFICATION_EXPIRES_IN_SECONDS * 1000) })
  const url = new URL(env.EMAIL_VERIFICATION_URL)
  url.searchParams.set("token", rawToken)
  await this.mailService.sendMail({ to: user.email, subject: "Verify your email", text: `Verify your email: ${url}`, html: `<a href="${url}">Verify your email</a>` })
}

async consumeToken(rawToken: string): Promise<{ userId: string }> {
  const tokenHash = hashVerificationToken(rawToken)
  const doc = await this.tokenModel.findOne({ tokenHash, usedAt: null, expiresAt: { $gt: new Date() } }).exec()
  if (!doc) throw new UnauthorizedException({ message: "Invalid or expired verification token", code: "INVALID_EMAIL_VERIFICATION_TOKEN" })
  doc.usedAt = new Date()
  await doc.save()
  return { userId: doc.userId.toString() }
}
```

Accepted scope cut: `consumeToken` + `UsersService.markEmailVerified` are two sequential writes, not a transaction (a standalone/non-replica-set Mongo can't do multi-doc transactions anyway; worst case of a crash between them is a used token whose user never got marked verified — recoverable via resend).

`AuthModule` imports `MailModule`, provides `EmailVerificationService` (not exported — only `AuthService`/`AuthController` need it).

## Milestone 3 — Auth logic changes

**New DTOs** (`apps/api/src/auth/dto/`): `verify-email.dto.ts` (`token: string`, `@IsString() @Length(32, 500)`), `resend-verification-email.dto.ts` (`email: string`, `@IsEmail()`), `sign-up-response.dto.ts` (`{ user: { id, email, name }, message: string }` — replaces `AuthResponseDto` as signup's return type). Keep `AuthResponseDto` (`{accessToken}`) for `signin` and the new verify-email success response; add a small `MessageResponseDto` (`{message}`) for resend's Swagger doc.

`AuthService` (`apps/api/src/auth/auth.service.ts`):

- `signUp`: unchanged duplicate-check/bcrypt/create, then `await this.emailVerificationService.createAndSendToken({id, email})`, return `{ user: {id, email, name}, message: "Account created. Check your email to verify your account." }` — **no accessToken**.
- `signIn`: unchanged lookup/bcrypt.compare, then before signing a token: `if (!user.emailVerifiedAt) throw new ForbiddenException({ message: "Please verify your email before signing in", code: "EMAIL_NOT_VERIFIED" })`.
- New `verifyEmail(dto)`: `const {userId} = await this.emailVerificationService.consumeToken(dto.token)`, `const user = await this.usersService.markEmailVerified(userId)`, return `this.signToken(user.id, user.email)` — verifying doubles as auto-login via the existing `signToken` helper.
- New `resendVerificationEmail(dto)`: find by email; if found AND unverified, `createAndSendToken`; **always** return the identical generic message `{ message: "If an unverified account exists, a verification email has been sent" }` regardless of whether the user exists or is already verified (anti-enumeration).

`AuthController`: add `POST /api/auth/verify-email` and `POST /api/auth/resend-verification-email`, both `@HttpCode(HttpStatus.OK)`, both public (no `JwtAuthGuard`), both still covered by the controller-level `@UseGuards(ThrottlerGuard)` (no extra rate-limiting specifically on resend — the general throttler is enough, matching the reference's explicit scope cut).

`HttpExceptionFilter` (`apps/api/src/common/filters/http-exception.filter.ts`): thread an optional `code` through non-destructively:

```ts
const code = exceptionResponse && typeof exceptionResponse === "object" ? (exceptionResponse as {code?: string}).code : undefined
response.status(statusCode).json({ statusCode, message, ...(code ? { code } : {}), error: ..., path: ..., timestamp: ... })
```

Existing exceptions (`new ConflictException("...")` etc.) produce no `code` key today and keep producing none — only the two new throw sites populate it. No existing response shape changes.

## Milestone 4 — Env vars

`apps/api/src/config/env.validation.ts` — add to `server`, **all with sane defaults** (so e2e tests and anyone's `pnpm dev` without a `.env` don't start failing validation the moment this ships):

```ts
SMTP_HOST: z.string().min(1).default("localhost"),
SMTP_PORT: z.coerce.number().int().positive().default(1025),
SMTP_FROM: z.string().min(1).default("Order Listing <no-reply@order-listing.local>"),
EMAIL_VERIFICATION_URL: z.string().min(1).default("http://localhost:3000/verify-email"),
EMAIL_VERIFICATION_EXPIRES_IN_SECONDS: z.coerce.number().int().positive().default(86_400),
```

`apps/api/.env.example` gets the same five vars with `SMTP_HOST=localhost` (non-containerized `pnpm dev` hits Mailpit's host-published port `1025`). The containerized `api` service in `compose.yaml` uses `SMTP_HOST=mailpit` instead (service-name DNS) — two genuinely different configs, not a copy-paste.

## Milestone 5 — Testing

**Fix the 3 files that break:**

- `auth.service.spec.ts`: add a mocked `EmailVerificationService` to the testing module providers. Update the `signUp` test to assert `{user, message}` (no token) and that `createAndSendToken` was called. Update the `signIn` "valid credentials" test's mock user to include `emailVerifiedAt: new Date()` (otherwise it now hits the new 403 branch). Add a new test: unverified `signIn` throws `ForbiddenException` with `code: "EMAIL_NOT_VERIFIED"`.
- `users.service.integration-spec.ts`: not broken (new field defaults to `null`), but add an assertion that a fresh user has `emailVerifiedAt: null` and a new test for `markEmailVerified`.
- `test/auth.e2e-spec.ts`: restructure — override `MailService` (`Test.createTestingModule({imports:[AppModule]}).overrideProvider(MailService).useValue({sendMail: vi.fn().mockResolvedValue(undefined)})`). Signup assertion changes to `{user, message}` + assert `sendMail` was called. Add: sign-in right after signup → 403 `EMAIL_NOT_VERIFIED`. Add: extract the raw token from the mock's last captured call (`mock.calls.at(-1)![0].text.match(/[?&]token=([^&\s]+)/)?.[1]`), POST `/api/auth/verify-email` → 200 + `accessToken`. Add: replay the same token → 401 `INVALID_EMAIL_VERIFICATION_TOKEN`. Move the existing "signs in with valid credentials" assertion to _after_ the verify-email step. Add: resend for a nonexistent email and for an already-verified email both return the byte-identical generic message; resend for a still-unverified user triggers a second `sendMail` call.

**New unit tests:**

- `apps/api/src/auth/email-verification.service.spec.ts` — mock the Mongoose `Model` (`create`/`findOne`) and `MailService`; verify `createAndSendToken` stores a _hash_ (never the raw token) and calls `sendMail` with a URL containing `?token=<raw>`; verify `consumeToken` throws for missing/expired/used tokens and succeeds + sets `usedAt` for a valid one.
- `apps/api/src/auth/token.util.spec.ts` — sanity-check token length/charset and that hashing is deterministic and doesn't equal its input.

Note on TTL index + tests: `mongodb-memory-server`'s TTL background monitor runs on its own ~60s interval and won't have purged expired docs within a test's lifetime — that's fine, `consumeToken`'s own `expiresAt: {$gt: new Date()}` query-time check is what tests actually validate; the TTL index is production hygiene, not a test dependency.

## Milestone 6 — Podman dockerization

Delete `apps/api/package.json`'s leftover `"deploy": "nest deploy"` script (unused `@nestjs/mau` cloud-deploy leftover from Nest CLI scaffolding — pnpm's own `pnpm deploy` CLI command takes precedence over same-named npm scripts so there's no functional collision, but it's confusing to leave in place).

**New file** `apps/api/Containerfile`, built with **context: repo root** (the monorepo build needs `pnpm-workspace.yaml`, root `package.json`/`pnpm-lock.yaml`, and sibling `packages/*` that `apps/api`'s tsconfig/eslint extend):

```dockerfile
FROM docker.io/library/node:24-slim AS build
WORKDIR /repo
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages ./packages
RUN pnpm install --filter=api... --frozen-lockfile
COPY apps/api ./apps/api
RUN pnpm --filter=api build
RUN pnpm --filter=api deploy --prod /out/api

FROM docker.io/library/node:24-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /out/api ./
USER node
EXPOSE 3001
CMD ["node", "dist/main.js"]
```

Using `pnpm deploy` (not hand-rolled multi-`COPY node_modules`) because it's pnpm's purpose-built tool for producing a pruned, non-symlinked, standalone directory for one workspace package — correctly handling pnpm's content-addressable store, which manual copying would not. Two real constraints validated empirically (Podman is installed here — actually built it):

- `pnpm deploy` does **not** run build scripts — `apps/api/dist` must exist before it runs (hence `build` before `deploy` above).
- **File-selection gotcha**: `pnpm deploy`'s file selection follows the same ignore-pattern logic as `npm pack`; since root `.gitignore` lists `dist`, the default selection may exclude it even though it's freshly generated in the build stage. **Fix applied: `"files": ["dist"]` added to `apps/api/package.json`** — confirmed empirically that `dist/main.js` lands correctly in `/out/api/dist/`.
- The deploy target must be an absolute path outside the workspace root (`/out/api`, not something under `/repo`) — a real pnpm constraint.

**New file** repo-root `.dockerignore`: `node_modules`, `**/dist`, `**/.next`, `.turbo`, `coverage`, `.git`.

**Replaced** `docker-compose.yml` with repo-root `compose.yaml`:

```yaml
services:
  api:
    build: { context: ., dockerfile: apps/api/Containerfile }
    restart: unless-stopped
    environment:
      NODE_ENV: production
      PORT: "3001"
      MONGODB_URI: mongodb://mongo:27017/order-listing
      JWT_SECRET: change-me
      JWT_EXPIRES_IN: 1h
      CORS_ORIGIN: http://localhost:3000
      SMTP_HOST: mailpit
      SMTP_PORT: "1025"
      SMTP_FROM: "Order Listing <no-reply@order-listing.local>"
      EMAIL_VERIFICATION_URL: http://localhost:3000/verify-email
      EMAIL_VERIFICATION_EXPIRES_IN_SECONDS: "86400"
    ports: ["3001:3001"]
    depends_on: [mongo, mailpit]
  mongo:
    image: docker.io/library/mongo:8.0
    restart: unless-stopped
    ports: ["27017:27017"]
    volumes: ["mongo-data:/data/db"]
  mailpit:
    image: docker.io/axllent/mailpit:v1.30
    restart: unless-stopped
    ports: ["1025:1025", "8025:8025"]
volumes:
  mongo-data:
```

Mongo bumped to **8.0** per the user's explicit ask (was 7). `podman compose up -d` (full stack) is the primary "run everything" workflow; `podman compose up -d mongo mailpit` + `pnpm --filter api dev` remains the fast-iteration path (both `podman-compose` 1.3.0 and `podman compose`'s external-provider mode confirmed working). Minor Podman notes, none requiring extra config: all ports are >1024 (no rootless privileged-port issue); the named `mongo-data` volume (not a bind-mount) avoids rootless UID-mapping permission issues; no healthchecks — `restart: unless-stopped` on `api` absorbs a brief crash-loop if it starts before Mongo is ready, acceptable for local/dev scope.

## Milestone 7 — Diagrams, Bruno, README

**Diagrams** (edited then re-rendered via `java -jar /home/mouse/sources/plantuml-lgpl-1.2026.5.jar <file>.puml`):

- `ER-diagram.puml`: added `emailVerifiedAt : Date <<nullable>>` to `User`; new `EmailVerificationToken` entity (`_id`, `userId <<FK>>`, `tokenHash <<unique>>`, `expiresAt <<TTL>>`, `usedAt <<nullable>>`, `createdAt`, `updatedAt`); relationship `user ||--o{ emailVerificationToken`.
- `sequence-diagram.puml`: Sign Up block gains token-generation/email-send steps and now ends in `201 { user, message }` (no token); new Verify Email block (valid/invalid `alt` branches); new Resend block (both branches converging on the identical response); Sign In block gains an `alt`/`else` for the unverified-403 case.
- `class-diagram.puml`: new `mail` package (`MailService`, `MailModule`); `auth` package gains `EmailVerificationService`, `EmailVerificationToken`, `VerifyEmailDto`, `ResendVerificationEmailDto`, `SignUpResponseDto`; new associations for all of the above.

**Bruno** (`bruno/Auth/`): new `Verify Email.bru` (`POST .../verify-email`, body `{"token": "{{verificationToken}}"}`, `script:post-response` capturing `accessToken`) and `Resend Verification Email.bru` (`POST .../resend-verification-email`, body `{"email": "{{signUpEmail}}"}`, no capture needed). `bruno/environments/Local.bru` gets a new `verificationToken: paste-token-from-mailpit-here` placeholder.

**README**: added Mailpit UI URL, documented both run workflows (full `podman compose up -d` vs. mongo+mailpit-only + `pnpm dev`), replaced `docker compose`/`docker-compose.yml` mentions with `podman compose`/`compose.yaml`, listed the 5 new env vars, noted the breaking contract change, removed the deleted `deploy` script reference.

## Verification

- `pnpm --filter api test` (21 tests), `test:integration` (8 tests), `test:e2e` (23 tests) all pass — e2e mocks `MailService`, no live Mailpit needed.
- `pnpm --filter api typecheck`/`lint` clean; root `pnpm lint` clean (root `pnpm typecheck` has one pre-existing, unrelated `apps/web` failure — `@testing-library/jest-dom` type augmentation — not touched by this work).
- Manual flow verified via a real `podman compose up -d --build`: sign up → real email captured by Mailpit's HTTP API → sign-in returns 403 `EMAIL_NOT_VERIFIED` → verify-email with the real token returns 200 + `accessToken` → sign-in now succeeds (200) → replaying the same verify-email token returns 401 `INVALID_EMAIL_VERIFICATION_TOKEN`. All confirmed via curl against the live containerized stack.
- `bru run` against the containerized stack exercises the same flow (Sign Up → Mailpit → paste token → Verify Email → Sign In → Resend) — confirmed passing end-to-end via the Bruno CLI.
- All three `.puml` diagrams re-rendered cleanly via the local PlantUML jar.
- `podman build -f apps/api/Containerfile .` succeeded; verified `dist/main.js` present in the deployed output and the container boots and serves `/api/health` correctly within the compose network.

---

# Increment 3 — Refresh Tokens + Full Session Payload

## Context

After Increment 2, `signin` and `verify-email` returned a bare `{ accessToken }`. That's not enough to build a frontend session: there's no refresh token (so a 15-minute access token means a hard logout every 15 minutes), and no user object (so the UI can't render the signed-in user's name without an extra `/auth/me` round trip). This increment makes those three endpoints return a complete session and adds token rotation, following NestJS's own JWT authentication docs plus the common `jwt-refresh` passport-strategy pattern.

## Design

**Two separate JWTs, two separate secrets.** Access tokens are signed with `JWT_ACCESS_SECRET` (default TTL `5m`, down from the old `1h` now that sessions can be refreshed); refresh tokens with `JWT_REFRESH_SECRET` (default `30d`). Distinct secrets mean an access token can never be replayed as a refresh token, or vice versa — verified by an e2e test.

**Refresh tokens are persisted as hashes and rotated.** A new `refreshTokens` collection (`apps/api/src/auth/schemas/refresh-token.schema.ts`) stores `userId`, `tokenHash` (SHA-256, unique), `expiresAt` (TTL index mirroring the JWT's own `exp`), and `revokedAt`. `POST /api/auth/refresh` consumes the presented token (marks it revoked) and issues a fresh pair, so a stolen token stops working at the legitimate client's next refresh. Replay returns `401 INVALID_REFRESH_TOKEN`.

A stateless JWT alone couldn't do this — persisting the hash is what makes refresh tokens revocable, which is also what makes `POST /api/auth/logout` meaningful.

**Access tokens stay stateless — an explicit, accepted trade-off.** Logout revokes the refresh token but cannot invalidate an already-issued access token, because validating one never consults the database. This was raised as a bug after testing (`/api/orders` still returned 200 with a pre-logout token) and was reviewed as a design decision:

- _Chosen:_ keep access-token validation fully stateless and bound the exposure with a short TTL (`JWT_ACCESS_EXPIRES_IN` `15m` → `5m`), with clients required to discard both tokens on logout. Every authenticated request stays free of a DB round trip.
- _Rejected (for now):_ session-bound access tokens — a `sid` claim on the access token checked against its `refreshTokens` row on every request, giving instant per-device revocation at the cost of one indexed Mongo lookup per authenticated request. This is the upgrade path if instant revocation ever becomes a requirement.
- _Rejected:_ a `jti` denylist collection — same per-request DB cost as the `sid` approach but more moving parts, and it only expresses explicit logout.

The semantics are documented where someone will actually hit them: the `logout` endpoint's Swagger description, the README, the Bruno `Logout.bru` docs block, and a note on the sequence diagram.

**`jti` claim.** Each refresh token carries a random `jti`. Found via a failing e2e test: without it, two sign-ins for the same user inside the same second produce byte-identical JWTs (identical payload, second-resolution `iat`) and collide on the unique `tokenHash` index — a real bug, not just a test artifact.

**Session shape.** `signin`, `verify-email`, and `refresh` all return `AuthSessionDto`: `{ user: { id, email, name }, accessToken, refreshToken }`. `signup` deliberately still returns `{ user, message }` with no tokens — the email-verification gate from Increment 2 is unchanged.

## Files

- New: `refresh-token.service.ts` (issue/consume/revoke), `schemas/refresh-token.schema.ts`, `strategies/jwt-refresh.strategy.ts` (reads the token from the body via `ExtractJwt.fromBodyField`, `passReqToCallback` so the raw token reaches the service for hash lookup), `common/guards/jwt-refresh.guard.ts`, and DTOs `auth-session.dto.ts` / `user-summary.dto.ts` / `refresh-token.dto.ts`.
- `token.util.ts`: `generateVerificationToken`/`hashVerificationToken` generalized to `generateOpaqueToken`/`hashToken`, now shared by email-verification and refresh tokens.
- `auth.service.ts`: private `createSession(user)` used by all three session-returning paths; new `refresh()` and `logout()`.
- Env renamed for clarity now that there are two token types: `JWT_SECRET`/`JWT_EXPIRES_IN` → `JWT_ACCESS_SECRET`/`JWT_ACCESS_EXPIRES_IN`, plus new `JWT_REFRESH_SECRET`/`JWT_REFRESH_EXPIRES_IN` (updated across `.env`, `.env.example`, `compose.yaml`, `turbo.json`, `vitest.setup.ts`, and the e2e specs).

## Verification

- 67 automated tests pass: 30 unit (incl. new `refresh-token.service.spec.ts` asserting only hashes are stored and rotation revokes), 8 integration, 29 e2e (rotation, replay rejection, cross-token rejection, logout revocation, and an access token minted from refresh working on a protected route).
- `typecheck`/`lint` clean.
- Manual run against a rebuilt `podman compose up -d --build` stack: signup → Mailpit → verify-email returns `{user, accessToken, refreshToken}` → refresh rotates both → new access token works on `/api/auth/me` → replaying the old refresh token 401s → logout then refresh 401s.
- Bruno: `Sign In`/`Verify Email` capture both tokens; new `Refresh.bru` (re-captures the rotated pair) and `Logout.bru` confirmed 200 → 401-on-replay → 200 via the `bru` CLI.
- All three `.puml` diagrams updated (new `RefreshToken` entity, refresh/logout sequences, new classes) and re-rendered.
