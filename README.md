# Rabbit Orders

A responsive order management interface built with Next.js 16, featuring a data table with search, filtering, sorting, pagination, and a mobile-optimized card layout. Includes light/dark mode support.

UI is accurately crafted to match rabbit identity with a modern neo-brutalism design.

**Live Demo:** [rabbit-orders-web.vercel.app](https://rabbit-orders-web.vercel.app/)

![Rabbit Orders screenshot](./Screenshot_20260322_205347.png)
![Rabbit Orders mobile screenshot](./Screenshot_20260322_205727.png)

## Getting Started

```bash
# Prerequisites: Node.js >= 20, pnpm >= 9

# Install dependencies
pnpm install

# Start development server
pnpm dev

# Open http://localhost:3000/orders
```

## Project Structure

This is a **pnpm monorepo** managed with [Turborepo](https://turbo.build):

```
order-listing/
├── apps/
│   └── web/                          # Next.js 16 application
│       ├── app/                      # App Router pages
│       │   └── orders/page.tsx       # Orders page (server component)
│       ├── components/
│       │   └── data-table/           # Reusable data table system
│       ├── features/
│       │   └── orders/               # Order feature module
│       │       ├── model.ts          # Types & constants
│       │       ├── query-state.ts    # URL query param parsers
│       │       ├── server/           # Server-side data & mock generation
│       │       └── ui/               # UI components & config
│       ├── e2e/                      # Playwright E2E tests
│       ├── env.ts                    # Type-safe env vars (t3-env + Zod)
│       ├── hooks/                    # Shared React hooks
│       └── providers/                # App-level providers
├── packages/
│   ├── ui/                           # Shared component library (Base UI + CVA)
│   ├── eslint-config/                # Shared ESLint configuration
│   └── typescript-config/            # Shared TypeScript configuration
├── turbo.json                        # Turborepo task pipeline
└── pnpm-workspace.yaml              # Workspace definition
```

### Architecture Decisions

**Feature-based organization** — Order-related code lives in `features/orders/` rather than being spread across generic `components/`, `hooks/`, `utils/` directories. Each feature module contains its own model, query state, server logic, and UI components.

**Reusable data table** — The `components/data-table/` system is generic and decoupled from the orders feature. It accepts configuration objects for search, filters, sort, and pagination — making it reusable for any entity.

**Server-side rendering** — The orders page is a React Server Component. Data filtering, sorting, and pagination happen on the server via `listOrders()`. The client only handles URL state management through [nuqs](https://nuqs.47ng.com).

**URL-driven state** — All table state (search, status filter, sort direction, page) is stored in URL query parameters via nuqs. This means every view is bookmarkable, shareable, and works with browser back/forward navigation.

## Features Implemented

### Core Requirements

| Requirement                                              | Implementation                                               |
| -------------------------------------------------------- | ------------------------------------------------------------ |
| Order table with ID, Customer, Status, Items, Created At | `order-table-columns.tsx` with TanStack Table                |
| Status filter dropdown                                   | `data-table-toolbar.tsx` with status selector                |
| Responsive design                                        | Desktop table + mobile card layout (`order-mobile-card.tsx`) |
| Static mock data source                                  | `mock-orders.ts` generates 118 deterministic orders          |
| Alternating row colors                                   | Striped rows via `index % 2` conditional styling             |
| Empty state message                                      | `data-table-empty-state.tsx` — "No orders found"             |
| Clean, maintainable code                                 | Feature modules, typed props, no `any` leaks                 |

### Bonus Features

| Feature              | Implementation                                                |
| -------------------- | ------------------------------------------------------------- |
| Search by name or ID | Debounced search input (500ms) in toolbar                     |
| Sort by date         | Toggle button cycling between "Newest first" / "Oldest first" |
| Light/dark mode      | `ThemeToggle` component using `next-themes`                   |

### Additional Enhancements

- **Pagination** — Page navigation with ellipsis for large page counts, "Showing X-Y of Z" indicator
- **Type-safe environment variables** — `@t3-oss/env-nextjs` with Zod validation
- **Shared UI library** — `@workspace/ui` package with Base UI + CVA components
- **Mobile card layout** — Responsive cards below `md` breakpoint, table above
- **SEO & Social sharing** — Full OpenGraph and Twitter Card meta tags with a dynamically generated OG image (`opengraph-image.tsx`) rendered at the edge using `next/og`

## Tech Stack

| Layer          | Technology                         |
| -------------- | ---------------------------------- |
| Framework      | Next.js 16 (App Router, React 19)  |
| Language       | TypeScript 5.9                     |
| Styling        | Tailwind CSS 4                     |
| UI Components  | Base UI + Class Variance Authority |
| Data Table     | TanStack React Table v8            |
| URL State      | nuqs v2                            |
| Theme          | next-themes                        |
| Env Validation | @t3-oss/env-nextjs + Zod           |
| Build System   | Turborepo + pnpm workspaces        |
| CI             | GitHub Actions                     |
| Deployment     | Vercel                             |

## Quality Standards

### Type Safety

- Strict TypeScript across the entire codebase
- Type-safe environment variables validated at build time with Zod
- Type-safe URL query parameters via nuqs parsers with defaults
- Input normalization (`normalizeOrderListQuery`) clamps and validates all query params

### Code Organization

- Feature modules encapsulate related model, state, server logic, and UI
- Shared UI components live in a separate workspace package
- Data table system is config-driven and entity-agnostic
- Formatters are pure functions extracted for testability

### CI/CD

**GitHub Actions** (`.github/workflows/ci.yml`) runs on every push to `main` and on pull requests:

1. **checks** job — lint, typecheck, and unit/component tests
2. **e2e** job (depends on checks) — builds the app, installs Chromium, runs Playwright tests. On failure, uploads Playwright report and test results as artifacts.

**Vercel** handles production deployments automatically on push to `main`, with preview deployments for pull requests.

### Linting & Formatting

```bash
pnpm lint          # ESLint across all packages
pnpm format        # Prettier with Tailwind plugin
pnpm typecheck     # TypeScript strict mode
```

## Backend API (`apps/api`)

A NestJS + MongoDB backend providing authentication with email verification (sign up → verify via emailed link → sign in → JWT) and a protected, paginated orders endpoint. Mail is sent over SMTP to [Mailpit](https://github.com/axllent/mailpit) locally (a fake mailbox with a web inbox — nothing is ever really emailed). See `specs/Auth/initial-plan.md` for the full design (ER diagram, sequence diagram, class diagram — all under `specs/Auth/*.puml`).

### Running it

```bash
podman compose up -d --build   # full stack: api + mongo:8.0 + mailpit
pnpm --filter api seed         # populate the orders collection
# → http://localhost:5000/api        (REST endpoints, prefixed with /api)
# → http://localhost:5000/api/docs   (Swagger UI)
# → http://localhost:8025            (Mailpit inbox — read verification emails here)
```

Podman is the primary tool this repo is set up for (Docker works too — see below). For the fast-iteration workflow (containers for dependencies only, API running on the host with hot reload), the full container build/`Containerfile` design rationale, `.containerignore` vs `.dockerignore`, and Docker-equivalent commands, see **[`dev-guide/setup/containers.md`](dev-guide/setup/containers.md)**.

### Endpoints

| Method | Path                                  | Auth          | Description                                                                        |
| ------ | ------------------------------------- | ------------- | ---------------------------------------------------------------------------------- |
| POST   | `/api/auth/signup`                    | Public        | Create an account (unverified), sends a verification email — **returns no tokens** |
| POST   | `/api/auth/verify-email`              | Public        | Verify with the emailed token — activates the account and **starts a session**     |
| POST   | `/api/auth/resend-verification-email` | Public        | Resend the verification email (always returns the same generic message)            |
| POST   | `/api/auth/signin`                    | Public        | Sign in — **403 `EMAIL_NOT_VERIFIED` until verified**                              |
| POST   | `/api/auth/refresh`                   | Refresh token | Rotate: exchange a refresh token for a brand new access/refresh pair               |
| POST   | `/api/auth/logout`                    | Refresh token | Revoke the presented refresh token                                                 |
| GET    | `/api/auth/me`                        | Bearer JWT    | Current authenticated user                                                         |
| GET    | `/api/orders`                         | Bearer JWT    | Paginated/filterable/sortable orders                                               |
| GET    | `/api/health`                         | Public        | Liveness check                                                                     |

**Session payload.** `signin`, `verify-email`, and `refresh` all return the same shape, so the frontend can store the session and render the user's name without a follow-up request:

```jsonc
{
  "user": { "id": "…", "email": "jane@example.com", "name": "Jane Doe" },
  "accessToken": "…", // short-lived (JWT_ACCESS_EXPIRES_IN, default 5m) — send as `Authorization: Bearer`
  "refreshToken": "…", // long-lived (JWT_REFRESH_EXPIRES_IN, default 30d) — POST to /api/auth/refresh
}
```

**Token design.** Access and refresh tokens are separate JWTs signed with **separate secrets**, so one can never be used in the other's place. Refresh tokens are additionally persisted as a SHA-256 hash in a `refreshTokens` collection, which makes them revocable and lets `/api/auth/refresh` do **rotation**: the presented token is consumed (revoked) and a new pair issued, so a stolen token stops working the moment the legitimate client next refreshes. Replaying a rotated or logged-out token returns `401 INVALID_REFRESH_TOKEN`.

**What logout does and doesn't do.** Logout revokes the refresh token, so the session can't be extended. The access token is intentionally left **stateless** — validating it never touches the database, which keeps every authenticated request free of a DB round trip. The trade-off is that an access token issued before logout stays valid until it expires on its own; the TTL is deliberately short (`5m`) to bound that window, and **clients must discard both tokens on logout** so it's never sent again. If you ever need instant server-side revocation instead, the shape to add is a `sid` claim on the access token checked against its `refreshTokens` row — at the cost of one indexed lookup per request.

Sign-up validation: email format, name ≥ 3 chars, password ≥ 8 chars with at least one letter, one digit, and one special character — enforced via `class-validator` DTOs. Email-verification tokens are single-use, opaque (not JWTs), SHA-256-hashed at rest, and expire after `EMAIL_VERIFICATION_EXPIRES_IN_SECONDS` (default 24h).

### Testing it manually — Bruno

A Bruno collection lives in `bruno/` (open the folder in the Bruno app, or run headlessly):

```bash
cd bruno
bru run --env Local
```

`baseUrl` is a collection variable (`bruno/collection.bru`), so individual requests work even without selecting an environment; `--env Local` is still needed for the auth flow's test inputs (`signUpEmail`, etc.) and for `accessToken`/`refreshToken`/`verificationToken`, which the request scripts populate at runtime.

Run "Sign Up", then open Mailpit at `http://localhost:8025`, copy the token out of the verification link, paste it into the `verificationToken` environment variable, then run "Verify Email" — its `post-response` script captures both `accessToken` and `refreshToken` into the environment, so "Me", "List Orders", "Refresh", and "Logout" all work straight afterwards. (The verification token is the one thing that can't be script-captured, since it only ever exists inside an email.) "Refresh" re-captures the rotated pair each time it runs.

### Automated tests

```bash
pnpm --filter api test              # unit tests (mocked dependencies)
pnpm --filter api test:integration  # real Mongoose + Nest DI against mongodb-memory-server
pnpm --filter api test:e2e          # full HTTP flow (supertest) against mongodb-memory-server
```

All three tiers are hermetic — `mongodb-memory-server` spins up its own ephemeral MongoDB and `MailService` is mocked (the raw verification token is captured straight from the mock's call arguments), so no live Mongo, Mailpit, or Podman is needed to run the suite.

## Test Suite

Three layers of testing cover the application from pure logic through component rendering to full browser interactions.

### Unit Tests (Vitest)

Pure function tests with no React rendering required:

```bash
pnpm test          # Run all unit + component tests (single run)
pnpm test:watch    # Watch mode for development
```

| Test File                  | What It Covers                                                                      | Tests |
| -------------------------- | ----------------------------------------------------------------------------------- | ----- |
| `query-state.test.ts`      | `normalizeOrderListQuery` — page clamping, pageSize bounds, search trimming         | 8     |
| `order-formatters.test.ts` | `formatOrderDate` locale formatting, `formatOrderItemsSummary` truncation           | 5     |
| `list-orders.test.ts`      | `listOrders` — filtering by status/search, sorting asc/desc, pagination, edge cases | 10    |

### Component Tests (Vitest + React Testing Library)

Render tests verifying component behavior through the DOM:

| Test File                         | What It Covers                                               | Tests |
| --------------------------------- | ------------------------------------------------------------ | ----- |
| `order-status-badge.test.tsx`     | Renders correct text for all 4 statuses                      | 4     |
| `data-table-empty-state.test.tsx` | Renders title, description, and icon from config             | 1     |
| `data-table-pagination.test.tsx`  | Page buttons, disabled states, navigation calls, entity name | 6     |

### E2E Tests (Playwright)

Full browser tests against the running application:

```bash
pnpm test:e2e      # Headless Chromium
pnpm test:e2e:ui   # Interactive Playwright UI
```

| Test                            | What It Verifies                                      |
| ------------------------------- | ----------------------------------------------------- |
| Loads and displays orders table | Page renders, heading visible, table rows present     |
| Search filters results          | Typing a non-match shows empty state                  |
| Search clears and restores      | Clearing input brings back the full table             |
| Status filter narrows results   | Selecting "New" shows only New-status badges          |
| Sort toggles                    | Button cycles between "Newest first" / "Oldest first" |
| Pagination navigates            | Clicking page 2 updates URL and content               |

### Running All Tests

```bash
# Unit + component tests
pnpm test

# E2E tests (starts dev server automatically)
pnpm test:e2e

# Everything via Turborepo
pnpm test && pnpm test:e2e
```
