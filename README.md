# Orderly

A full-stack **authentication sandbox**. The interesting part is the auth: email-verified sign-up, JWT access/refresh tokens with rotation, and httpOnly-cookie sessions. Order management is the payload — a realistic protected resource to point the session at, so "is this endpoint actually guarded?" has a concrete answer you can click through instead of a `curl` against a toy `/private` route.

Every auth edge you'd normally hand-wave is wired up and exercised: an unverified account can't sign in, a verification link works exactly once, an expired access token refreshes silently mid-navigation, a rotated refresh token is dead on replay, and signing out revokes server-side.

```
Browser ──► Next.js (apps/web) ───────────────► NestJS API (apps/api) ──► MongoDB
          │  • renders UI                    │   • issues + verifies JWTs
          │  • BFF: /api/auth/* route         │   • owns users, tokens, orders
          │    handlers hold the tokens       └─► Mailpit (SMTP, local inbox)
          │  • proxy.ts rotates expired
          │    access tokens per request
          └── tokens live in httpOnly cookies; client JS never sees one
```

The browser never talks to the API directly. It talks to Next, which holds the tokens in httpOnly cookies and forwards to the API — a backend-for-frontend. That single decision explains most of the frontend architecture below.

## Tech stack

| Layer         | Choice                                                      |
| ------------- | ----------------------------------------------------------- |
| Monorepo      | Turborepo + pnpm workspaces                                 |
| Backend       | NestJS 12, Mongoose 8, MongoDB 8                            |
| Auth          | `@nestjs/jwt` + Passport (`jwt`, `jwt-refresh`), bcryptjs   |
| Mail          | Nodemailer → Mailpit (local SMTP catcher with a web inbox)  |
| Frontend      | Next.js 16 (App Router, RSC, Server Actions), React 19      |
| Data fetching | TanStack Query                                              |
| Forms         | TanStack Form + Zod                                         |
| UI            | Tailwind CSS 4, Base UI, CVA, TanStack Table, nuqs          |
| Validation    | class-validator (API) · Zod (web + env)                     |
| Env safety    | `@t3-oss/env-core` / `env-nextjs`, fail-fast at boot        |
| API docs      | Swagger at `/api/docs`                                      |
| Testing       | Vitest (unit/integration/e2e), Supertest, Playwright, Bruno |
| Containers    | Podman (Docker-compatible), `compose.yaml`                  |

## Project structure

```
orderly/
├── apps/
│   ├── api/                              # NestJS API — the authority on identity
│   │   ├── src/
│   │   │   ├── auth/                     # Everything credential-shaped
│   │   │   │   ├── auth.controller.ts    #   signup, signin, verify-email, refresh, logout, me
│   │   │   │   ├── auth.service.ts       #   orchestration + createSession()
│   │   │   │   ├── email-verification.service.ts   # issue/consume verification tokens
│   │   │   │   ├── refresh-token.service.ts        # issue/consume/revoke, rotation
│   │   │   │   ├── token.util.ts         #   opaque token generation + SHA-256 hashing
│   │   │   │   ├── dto/                  #   class-validator request/response contracts
│   │   │   │   ├── schemas/              #   emailVerificationTokens, refreshTokens (TTL-indexed)
│   │   │   │   └── strategies/           #   jwt (access) + jwt-refresh, separate secrets
│   │   │   ├── users/                    # User schema + lookups (emailVerifiedAt lives here)
│   │   │   ├── orders/                   # The protected resource: schema, service, guarded controller
│   │   │   ├── mail/                     # Nodemailer wrapper — auth never touches SMTP directly
│   │   │   ├── common/                   # Guards, exception filter, logging interceptor, password policy
│   │   │   ├── config/                   # Zod-validated env, .env loader
│   │   │   ├── seed/                     # 118 deterministic orders
│   │   │   └── main.ts                   # helmet, compression, CORS, global pipe/prefix, Swagger
│   │   ├── test/                         # e2e specs (auth, orders, health, throttler)
│   │   └── Containerfile                 # Multi-stage build via `pnpm deploy`
│   │
│   └── web/                              # Next.js front end — the BFF
│       ├── proxy.ts                      # Route guard + silent refresh rotation (Next 16's middleware)
│       ├── app/
│       │   ├── api/auth/*/route.ts       # BFF endpoints; the only place cookies are written
│       │   ├── (auth)/                   # login, signup, verify-email (+ shared shell)
│       │   └── orders/                   # Protected page, server-rendered from the API
│       ├── features/
│       │   ├── auth/                     # model, zod schemas, server/, client/, hooks/, ui/
│       │   └── orders/                   # model, query-state, server/, ui/
│       ├── components/form/              # Composable TanStack Form wrapper (useAppForm)
│       ├── lib/api-error.ts              # Normalizes the API's error envelope
│       └── e2e/                          # Playwright: auth setup project + specs
│
├── packages/
│   ├── ui/                               # Shared components (Base UI + CVA)
│   ├── eslint-config/ · typescript-config/
│
├── bruno/                                # API collection for manual testing
├── specs/Auth/                            # Design record + ER/sequence/class diagrams (.puml)
├── dev-guide/setup/containers.md          # Container setup in depth
└── compose.yaml                           # api + mongo + mailpit
```

## Backend architecture (`apps/api`)

A standard NestJS module graph — `AuthModule`, `UsersModule`, `OrdersModule`, `MailModule` — with the API as the sole authority on identity. Every token it issues, it verifies.

**Two token types, two secrets.** Access tokens (`JWT_ACCESS_SECRET`, 5 min) and refresh tokens (`JWT_REFRESH_SECRET`, 30 days) are separate JWTs signed with separate secrets, so one can never be replayed as the other — there's an e2e test asserting exactly that.

**Refresh tokens are stateful; access tokens aren't.** Refresh tokens are persisted as a SHA-256 hash in a TTL-indexed `refreshTokens` collection. That's what makes them revocable, and it's what `/auth/refresh` uses to enforce **rotation**: the presented token is consumed and a new pair issued, so a stolen token stops working the moment the real client next refreshes. Replaying a rotated or logged-out token returns `401 INVALID_REFRESH_TOKEN`.

Access tokens are deliberately left stateless — validating one never touches the database, which keeps every authenticated request free of a round trip. The trade-off is that **logout can't invalidate an already-issued access token**; it stays valid until it expires, which is why the TTL is short and clients must discard both tokens. (The upgrade path, if instant revocation is ever needed: a `sid` claim checked against the token's `refreshTokens` row.)

**Email verification gates the account.** Sign-up creates a user with `emailVerifiedAt: null` and returns **no tokens** — the account is inert until the emailed link is opened. Sign-in on an unverified account returns `403 EMAIL_NOT_VERIFIED`. Verification tokens are opaque random strings (not JWTs), stored only as a SHA-256 hash, single-use, and TTL-expiring; verifying consumes the token and starts the session. `resend-verification-email` always returns the same generic message so it can't be used to enumerate accounts.

**Layering.** `AuthService` never touches SMTP, crypto, or token schemas — `EmailVerificationService` and `RefreshTokenService` own those, and `MailService` wraps Nodemailer. Cross-cutting concerns sit in `common/`: a global exception filter producing one consistent error envelope (with an optional machine-readable `code`), a logging interceptor, JWT guards, and the shared password policy. Config is Zod-validated at boot, so a missing secret fails immediately rather than at first request.

Rate limiting (`@nestjs/throttler`) covers the auth controller, configurable via `THROTTLE_TTL_MS` / `THROTTLE_LIMIT`.

## Frontend architecture (`apps/web`)

Built around one constraint: **tokens must never reach client JavaScript.** So the browser only ever calls this app's own `/api/auth/*` route handlers, which proxy to the API and own every cookie write. The login response body is just `{ user }` — the tokens went into `Set-Cookie`.

The second constraint shapes the rest: **a server component cannot set cookies while rendering.** That single fact decides where three things live.

| Concern            | Where                                 | Why there                                                                                                                                                                              |
| ------------------ | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cookie writes      | Route handlers + a Server Action      | The only places Next permits it                                                                                                                                                        |
| Silent rotation    | `proxy.ts`                            | A page could rotate a refresh token and then fail to persist it — burning the session. Proxy writes to the forwarded request _and_ the response, so the same render sees the new token |
| Route protection   | `proxy.ts`                            | Redirects to `/login?next=…`; bounces signed-in users off the auth pages                                                                                                               |
| Email verification | `(auth)/verify-email` + Server Action | Consuming a single-use token is a mutation that must set cookies. A POST also keeps the token away from email scanners and prefetchers that follow GET links                           |
| Session state      | TanStack Query                        | `useSession` reads `/api/auth/me`; auth mutations invalidate the key so the UI follows the session                                                                                     |

> `proxy.ts` is Next 16's rename of `middleware.ts` — same feature, and it now defaults to the Node runtime.

**Feature modules.** `features/auth/` splits into `model` / `schemas` / `server` / `client` / `hooks` / `ui`, so the server-only surface (cookies, API calls, actions) is physically separate from anything that ships to the browser. `features/orders/` follows the same shape.

**Forms** use TanStack Form + Zod behind a small composable wrapper (`components/form`). `useAppForm` returns a form whose fields already know the app's components:

```tsx
<form.AppField name="email">{(f) => <f.TextField label="Email" />}</form.AppField>
<form.AppForm><form.SubmitButton label="Sign in" /></form.AppForm>
```

Errors are split by cause: **field-level problems render under the field** (caught by the Zod schema before any request goes out), while **server errors that aren't tied to a field** — bad credentials, unverified account, duplicate email — surface as a **toast**. The web Zod schemas mirror the API's password policy so users get instant feedback; the API still enforces it independently.

## Getting started

**Prerequisites:** Node.js ≥ 20, pnpm 9, and Podman (or Docker).

```bash
pnpm install
cp apps/api/.env.example apps/api/.env

cat > apps/web/.env.local <<'EOF'
API_URL=http://localhost:5000
NEXT_PUBLIC_APP_URL=http://localhost:3000
EOF
```

`API_URL` is deliberately **server-only** — the browser never sees it, because it never calls the API directly.

### 1. Start the backing services

Podman is the primary tool here; every command works with Docker by swapping the binary name.

```bash
podman compose up -d              # api + mongo:8 + mailpit
pnpm --filter api seed            # 118 orders into MongoDB
```

| Service       | URL                            |
| ------------- | ------------------------------ |
| API           | http://localhost:5000/api      |
| Swagger       | http://localhost:5000/api/docs |
| Mailpit inbox | http://localhost:8025          |
| MongoDB       | localhost:27017                |

Mailpit catches every outgoing email — **nothing is ever really sent**. Open its inbox to read verification links.

### 2. Start the front end

```bash
pnpm --filter web dev             # → http://localhost:3000
```

### Iterating on the API

To run the API on the host with hot reload instead of in a container, start only its dependencies:

```bash
podman compose up -d mongo mailpit
pnpm --filter api dev
```

Tear everything down with `podman compose down -v` (`-v` also drops the Mongo volume). Full container details — why `Containerfile` and `.containerignore`, how the monorepo build works — are in [`dev-guide/setup/containers.md`](dev-guide/setup/containers.md).

### Walking through the auth flow

1. Open http://localhost:3000/signup and create an account.
2. Try signing in — you'll get **403, email not verified**.
3. Open http://localhost:8025, click the verification link in the email.
4. You land on `/orders`, signed in, reading real data from the protected endpoint.
5. Sign out; `/orders` bounces you back to `/login`.

## API reference

| Method | Path                                  | Auth          | Description                                                             |
| ------ | ------------------------------------- | ------------- | ----------------------------------------------------------------------- |
| POST   | `/api/auth/signup`                    | Public        | Create an unverified account, send a verification email — **no tokens** |
| POST   | `/api/auth/verify-email`              | Public        | Consume the emailed token, activate the account, **start a session**    |
| POST   | `/api/auth/resend-verification-email` | Public        | Always returns the same generic message                                 |
| POST   | `/api/auth/signin`                    | Public        | **403 `EMAIL_NOT_VERIFIED`** until verified                             |
| POST   | `/api/auth/refresh`                   | Refresh token | Rotate: consume the token, issue a fresh pair                           |
| POST   | `/api/auth/logout`                    | Refresh token | Revoke the refresh token                                                |
| GET    | `/api/auth/me`                        | Bearer JWT    | Current user                                                            |
| GET    | `/api/orders`                         | Bearer JWT    | **The protected resource** — paginated, filterable, sortable            |
| GET    | `/api/health`                         | Public        | Liveness                                                                |

`signin`, `verify-email`, and `refresh` all return the same session shape, so the client can store it and render the user without a follow-up request:

```jsonc
{
  "user": { "id": "…", "email": "jane@example.com", "name": "Jane Doe" },
  "accessToken": "…", // short-lived, Authorization: Bearer
  "refreshToken": "…", // long-lived, POST to /api/auth/refresh
}
```

Sign-up validation: valid email, name ≥ 3 chars, password ≥ 8 chars with at least one letter, one digit, and one special character.

### Environment variables

| Variable                                   | Default                              | Notes                               |
| ------------------------------------------ | ------------------------------------ | ----------------------------------- |
| `MONGODB_URI`                              | —                                    | Required                            |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | —                                    | Required, and must differ           |
| `JWT_ACCESS_EXPIRES_IN`                    | `5m`                                 | Short by design (see logout caveat) |
| `JWT_REFRESH_EXPIRES_IN`                   | `30d`                                |                                     |
| `EMAIL_VERIFICATION_URL`                   | `http://localhost:3000/verify-email` | Front-end link placed in the email  |
| `EMAIL_VERIFICATION_EXPIRES_IN_SECONDS`    | `86400`                              |                                     |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_FROM`    | `localhost` / `1025`                 | `mailpit` as host inside compose    |
| `THROTTLE_TTL_MS` / `THROTTLE_LIMIT`       | `60000` / `10`                       | Auth rate limit                     |
| `CORS_ORIGIN`                              | `http://localhost:3000`              |                                     |
| `API_URL` (web)                            | `http://localhost:5000`              | Server-only                         |

## Testing

```bash
pnpm --filter api test              # unit — mocked dependencies
pnpm --filter api test:integration  # real Mongoose + Nest DI on mongodb-memory-server
pnpm --filter api test:e2e          # full HTTP via Supertest
pnpm --filter web test              # component/unit (Vitest + Testing Library)
pnpm --filter web test:e2e          # Playwright, real browser
```

Every API tier is **hermetic**: `mongodb-memory-server` supplies a real ephemeral MongoDB and `MailService` is mocked, so no running container is needed. Coverage deliberately includes the things that quietly rot — token expiry (proved by backdating stored rows, so the `expiresAt` guards can't be removed unnoticed), refresh rotation and replay, rate limiting, and email casing.

The Playwright suite runs three projects: a `setup` project that creates a genuinely verified account by driving the real sign-up and verification screens (reading the token out of Mailpit) and saves the session, an `anonymous` project for the signed-out auth screens, and an `authenticated` project for `/orders`. Because `/orders` is truly protected, these need the API stack running.

### Manual API testing

A [Bruno](https://usebruno.com) collection lives in `bruno/`:

```bash
cd bruno && bru run --env Local
```

`baseUrl` is a collection variable, so single requests work without selecting an environment. Run **Sign Up**, grab the token from Mailpit, paste it into `verificationToken`, then run **Verify Email** — its script captures `accessToken` and `refreshToken` for the protected requests that follow.

## Design record

`specs/Auth/` holds the design decisions and diagrams (`.puml` sources rendered to PNG): an ER diagram of the collections, a sequence diagram covering sign-up through refresh and logout, and a class diagram of the NestJS modules.

## Quality checks

```bash
pnpm lint          # ESLint across all packages
pnpm typecheck     # TypeScript strict mode
pnpm format        # Prettier
```
