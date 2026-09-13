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
