# Container Setup

This project runs its backing services (MongoDB, Mailpit) and, optionally, the
API itself as OCI containers. **Podman is the first-class tool here** — it's
what's installed and used day to day, and it's what every command below is
written for. Docker is a drop-in alternative (see [Using Docker
instead](#using-docker-instead)) because both speak the same OCI image format
and the same Compose file schema — nothing here is Podman-exclusive syntax,
it's just the tool this repo standardizes on.

## Why Podman

- **Daemonless, rootless.** No background root daemon to install, trust, or
  keep running — `podman build`/`podman run` execute as your own user.
- **Drop-in Docker CLI compatibility.** The commands, `Containerfile` syntax,
  and Compose file format are the same; muscle memory transfers directly.
- **No lock-in to Docker Hub's daemon or licensing.** Podman pulls from any
  OCI registry (including `docker.io`, which is what this repo's images use)
  without needing Docker Desktop or the `dockerd` service at all.

If you don't have Podman, install it via your package manager (`apt install
podman podman-compose`, `brew install podman`, etc.) — no other setup is
required; unlike Docker Desktop there's no daemon to start first.

## Quickstart

**Full containerized stack** (API + MongoDB + Mailpit, all in containers):

```bash
podman compose up -d --build
pnpm --filter api seed   # populate the orders collection

# → http://localhost:5000/api        REST endpoints (prefixed with /api)
# → http://localhost:5000/api/docs   Swagger UI
# → http://localhost:8025            Mailpit inbox (read verification emails here)
```

**Fast local iteration** (only the dependencies in containers, API runs on the
host with hot reload):

```bash
podman compose up -d mongo mailpit
cp apps/api/.env.example apps/api/.env
pnpm install
pnpm --filter api seed
pnpm --filter api dev
```

**Tear down:**

```bash
podman compose down -v   # -v also drops the mongo-data volume
```

`podman compose` here is being handled by `podman-compose` as an external
provider (both `podman-compose` and the `podman compose` subcommand are
available and behave the same against this repo's `compose.yaml`).

## The files

| File                     | Purpose                                                      |
| ------------------------ | ------------------------------------------------------------ |
| `compose.yaml`           | Defines the `api`, `mongo`, `mailpit` services (repo root)   |
| `apps/api/Containerfile` | Multi-stage build for the API image                          |
| `.containerignore`       | Build-context exclusions for the container build (repo root) |

### Why the build definition is called `Containerfile`, not `Dockerfile`

`Containerfile` is the tool-neutral, OCI-oriented name for this file — it's
the name Podman/Buildah document as their default, and Docker reads it just
as happily via an explicit path. Nothing here depends on the filename being
"Dockerfile"; `compose.yaml` points at it explicitly:

```yaml
build:
  context: .
  dockerfile: apps/api/Containerfile # the `dockerfile:` key just takes a path
```

and a raw build works the same way:

```bash
podman build -f apps/api/Containerfile -t order-listing-api .
# or, with Docker:
docker build -f apps/api/Containerfile -t order-listing-api .
```

### Why the Containerfile lives at `apps/api/Containerfile` with the build context set to the repo root

This repo is a pnpm/Turborepo **monorepo** — `apps/api` isn't a standalone
package, it depends on the workspace root (`pnpm-workspace.yaml`, the root
`package.json` and lockfile) and sibling packages
(`packages/typescript-config`, `packages/eslint-config`) that its own
`tsconfig.json`/ESLint config extend. `pnpm install --filter=api...` needs all
of that visible to resolve the dependency graph correctly, which means the
build context has to be the repo root, not `apps/api/` in isolation — a
context scoped to `apps/api/` alone would never see those files and the
install would fail. The Containerfile itself still lives inside `apps/api/`
(next to the app it builds, not orphaned at the repo root) since that's where
a reader looking at this app will naturally look for it; `compose.yaml`
`dockerfile:` path is a straightforward pointer through the root-scoped
context to that file — there's no requirement that a Containerfile sit at the
same level as its build context.

The build itself uses [`pnpm
deploy`](https://pnpm.io/cli/deploy) rather than hand-copying `node_modules`:
it's pnpm's own purpose-built command for producing a pruned, standalone,
non-symlinked directory for one workspace package — the correct way to
extract a single app's runtime footprint out of a pnpm monorepo's
content-addressable store. Two non-obvious constraints that shaped the
Containerfile, in case you're editing it:

- `pnpm deploy` does **not** run build scripts — `nest build` has to happen
  in an earlier step, before `pnpm --filter=api deploy` runs.
- `pnpm deploy`'s file selection follows the same ignore-pattern logic as
  `npm pack`. Since `dist/` is git-ignored, it would silently be excluded
  from the deploy output — `apps/api/package.json` has an explicit
  `"files": ["dist"]` to override that.

### `.containerignore`, not `.dockerignore`

Podman's build backend (Buildah) looks for `.containerignore` first and only
falls back to `.dockerignore` if that file doesn't exist — so with Podman as
the primary tool, `.containerignore` is the one that's actually authoritative
here, and keeping both around would just invite them to drift out of sync.
It excludes the same things a `.gitignore` would (`node_modules`, `dist`,
`.next`, `.turbo`, `coverage`, `.git`) so the build context sent to the
daemon/Buildah stays small.

If you build this image with plain Docker, note that Docker only reads
`.dockerignore` — it will not pick up `.containerignore` automatically. In
practice this only means a slightly larger build context (Docker will send
along `node_modules`/`.git`/etc. that Podman would have excluded); the build
still succeeds correctly either way. If you need Docker to exclude the same
paths, copy or symlink `.containerignore` to `.dockerignore` locally — that's
a local convenience, not something this repo maintains as a second source of
truth.

## Verifying it actually works

```bash
curl http://localhost:5000/api/health
# {"status":"ok","timestamp":"..."}

curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"jane@example.com","name":"Jane Doe","password":"Str0ng!Pass"}'

curl http://localhost:8025/api/v1/messages   # confirm Mailpit received the verification email
```

Or use the Bruno collection in `bruno/` — see its own docs for the manual
verify-email flow (the token only ever exists inside the email, so it has to
be pasted in by hand from Mailpit's inbox UI at `http://localhost:8025`).

## Podman-specific notes

- All published ports here (`5000`, `27017`, `1025`, `8025`) are above 1024,
  so rootless Podman's restriction on binding privileged ports never comes
  up — no extra config needed.
- MongoDB's data directory is a **named volume** (`mongo-data:`), not a host
  bind-mount — this sidesteps the UID-mapping/permission mismatches that
  bind-mounts can hit under rootless Podman's user-namespace remapping.
- There are no healthchecks / `depends_on: condition: service_healthy` — the
  `api` container can crash-loop briefly on first boot if it starts before
  MongoDB is accepting connections; `restart: unless-stopped` absorbs that
  without extra plumbing. Fine for local/dev use; revisit if this ever needs
  to run somewhere with stricter startup ordering guarantees.

## Using Docker instead

Everything above works unmodified with Docker — swap `podman` for `docker` in
every command (`docker compose up -d --build`, `docker build -f
apps/api/Containerfile .`, etc.). The one asymmetry is the `.containerignore`
vs. `.dockerignore` behavior described above; it doesn't break anything, it
just means Docker's build context isn't as trimmed as Podman's by default.
