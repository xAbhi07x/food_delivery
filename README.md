# Murliganj Food Ordering & Delivery Platform

A hyperlocal food ordering and delivery web application for **Murliganj, Madhepura, Bihar, India**.

> **Project status: Phase 1 (Foundation) is complete locally. No business features exist yet.**
> The app is a working skeleton: a placeholder home page and a health endpoint, with tooling, a
> local database workflow, environment validation, tests and CI in place. CI has not yet run on
> GitHub and no hosted Supabase project exists. Authentication, the
> catalog, ordering, riders, tracking and the admin dashboard are **not implemented**. See the
> [implementation plan](docs/implementation-plan.md) for what comes next.

## Overview

The application lets customers order food for delivery within roughly 5 km of Murliganj. It is inspired by Zomato and Swiggy but is **product-centric, not a restaurant marketplace**.

## Business concept

1. The platform shows a single, centralised food catalog with the business's own prices.
2. A customer selects one or more products (with optional customisations) and places a delivery order.
3. The order is offered to eligible riders. One rider accepts it.
4. The rider picks up and delivers the order. The customer can call the rider and track them.

The business handles sourcing food offline. The application does **not** do supplier procurement, inventory, or stock management.

Design targets (to be validated by load testing): 2 initial riders, up to 20 riders, up to 5 active orders per rider, about 500 orders per day, Cash on Delivery only, one pickup and one delivery per order.

## Key features (planned, none implemented yet)

- Product catalog with categories, search, and per-product customisation (variants, add-ons, special instructions).
- Cart and checkout with server-side price calculation.
- Mobile OTP authentication for customers.
- Cash on Delivery with a configurable delivery fee.
- Service-area validation and operating-hours enforcement.
- Rider availability, order acceptance, and multi-order assignment (max 5 active orders per rider, enforced atomically).
- Independent status tracking for each order.
- Customer-rider calling (`tel:` link), live rider tracking, and estimated delivery time.
- Admin dashboard for catalog, riders, orders, cancellations, settings, and basic reports.

Out of scope for the initial version: restaurant/vendor management, inventory, online payments, native mobile apps, route optimisation, loyalty, subscriptions, and AI recommendations (see SRS §2.2).

## User roles

| Role              | Summary                                                                                                                                                                  |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Customer**      | Signs in with mobile OTP, browses, customises, orders (COD), cancels before acceptance, calls and tracks the assigned rider.                                             |
| **Rider**         | Goes online or offline, accepts or rejects orders, holds up to 5 active orders, chooses the delivery sequence, updates each order's status, shares GPS during deliveries. |
| **Administrator** | Manages catalog, riders, and orders; handles cancellations and exceptions; configures hours, delivery fee, and service area; views reports.                              |

Full permissions are in [SRS §3](docs/SRS.md).

## Technology stack

Based on the SRS's recommended stack (§7.1). Items marked _installed_ are in the repository now.

| Layer                | Technology                                                                          | Status                         |
| -------------------- | ----------------------------------------------------------------------------------- | ------------------------------ |
| Web app              | Next.js 16 (App Router), React 19, TypeScript (strict)                              | Installed                      |
| Styling / UI         | Tailwind CSS 4, shadcn/ui                                                           | Installed                      |
| Database             | Supabase PostgreSQL 17 (local via Docker)                                           | Local workflow working         |
| Auth                 | Supabase Auth (mobile OTP)                                                          | Phase 2                        |
| Realtime / Storage   | Supabase Realtime, Supabase Storage                                                 | Later phases                   |
| Validation           | Zod                                                                                 | Installed (environment only)   |
| Tests                | Vitest (unit, database), Playwright (end-to-end)                                    | Installed                      |
| Lint / format        | ESLint 9, Prettier                                                                  | Installed                      |
| CI                   | GitHub Actions ([.github/workflows/ci.yml](.github/workflows/ci.yml))               | Written; not yet run on GitHub |
| Hosting              | Managed Next.js hosting                                                             | Provider not chosen            |

**Not yet decided:** OTP/SMS provider, map provider, rider notification channel, hosting provider, load-test tool, and monitoring tooling. See the [open decisions](docs/implementation-plan.md#3-open-decisions-do-not-resolve-without-the-owner). Technical decisions already made are in the [decision log](docs/decisions.md).

Architecture: a **modular monolith**. One Next.js application will contain the customer, rider, and admin interfaces and the server-side logic. No microservices.

## Project structure

```text
.
├── .github/
│   ├── copilot-instructions.md   # Project guidance for Copilot
│   └── workflows/ci.yml          # CI: lint, types, tests, build, database, e2e
├── docs/
│   ├── SRS.md                    # Software Requirements Specification (source of truth)
│   ├── implementation-plan.md    # Phased plan, open decisions, ambiguities
│   └── decisions.md              # Technical decision log
├── scripts/
│   └── check-client-bundle.mjs   # Fails if privileged variables reach the client bundle
├── src/
│   ├── app/                      # Next.js routes (home page, /api/health)
│   ├── components/ui/            # shadcn/ui components
│   ├── lib/
│   │   ├── env/                  # Validated environment variables (public vs server-only)
│   │   ├── supabase/             # Generated database types
│   │   └── utils.ts
│   ├── instrumentation.ts        # Validates the environment when the server starts
│   └── modules/                  # Domain modules go here (see src/modules/README.md)
├── supabase/
│   ├── config.toml               # Local Supabase configuration
│   ├── migrations/               # Version-controlled SQL migrations
│   └── seed.sql                  # Development seed data (empty for now)
├── tests/
│   ├── unit/                     # Unit tests (more live next to source as *.test.ts)
│   ├── db/                       # Database tests against local Postgres
│   └── e2e/                      # Playwright end-to-end tests
├── .env.example                  # Environment variable names (no secrets)
└── AGENTS.md                     # Generated by Next.js: tells AI tools to read its bundled docs
```

Application code is organised by domain module (SRS §7.3). Modules are added in the phase that needs them.

## Prerequisites

- **Node.js 22** (see `.nvmrc`) and **npm**.
- **Git**.
- **Docker Desktop**, running, for the local Supabase database. The first `npm run db:start` downloads several Docker images.
- No global Supabase CLI is needed; it is installed as a project dev dependency.

## Local development setup

```bash
# 1. Install dependencies
npm ci

# 2. Start the local Supabase stack (Docker must be running).
#    This applies the migrations in supabase/migrations.
npm run db:start

# 3. Create your local environment file (see "Environment variables" below)
#    PowerShell:   Copy-Item .env.example .env.local
#    macOS/Linux:  cp .env.example .env.local

# 4. Start the app
npm run dev
```

Then open <http://localhost:3000> and <http://localhost:3000/api/health> (expected response: `{"status":"ok"}`).

Stop the local database with `npm run db:stop`.

## Environment variables

Copy [.env.example](.env.example) to `.env.local` (git-ignored) and fill in the values.

| Variable                               | Scope       | Required | Purpose                                                                           |
| -------------------------------------- | ----------- | -------- | --------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Public      | Yes      | Supabase API URL. Local: `http://127.0.0.1:14321`.                                |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public      | Yes      | Browser-safe key. Local value: `PUBLISHABLE_KEY` printed by `npm run db:status`.  |
| `SUPABASE_SECRET_KEY`                  | Server only | No (yet) | Bypasses Row Level Security. Not used yet. Never expose it to the browser.        |
| `TEST_DATABASE_URL`                    | Tests only  | No       | Override for `npm run test:db`. Defaults to the local Supabase database.          |

The server validates its environment when it starts and **exits immediately** if a required variable is missing or malformed. The error names the variable, never its value. Never commit `.env.local` or real secrets.

## Database setup and migrations

The database is PostgreSQL on Supabase. Locally it runs in Docker through the Supabase CLI. Configuration is in `supabase/config.toml`.

| Task                          | Command                                |
| ----------------------------- | -------------------------------------- |
| Start the local stack         | `npm run db:start`                     |
| Stop it                       | `npm run db:stop`                      |
| Show URLs and keys            | `npm run db:status`                    |
| Create a new migration file   | `npm run db:migration:new -- <name>`   |
| Rebuild from migrations + seed | `npm run db:reset`                    |
| Regenerate TypeScript types   | `npm run db:types`                     |

Rules: schema changes are SQL migrations in `supabase/migrations/`; never edit one that has been applied elsewhere (add a new one); regenerate the types after changing the schema.

Current state: there is **one baseline migration that creates no tables**. The real schema (starting with `profiles`) arrives in Phase 2. Local ports use the 143xx range rather than Supabase's default 543xx because Windows can reserve the default range. See the [decision log](docs/decisions.md).

Local Studio: <http://127.0.0.1:14323>. Local email inbox (Mailpit): <http://127.0.0.1:14324>.

A hosted Supabase project is **not set up yet**. It will be needed for deployment (Phase 9) or earlier if you want a shared dev environment.

## Development commands

| Command                | What it does                                              |
| ---------------------- | --------------------------------------------------------- |
| `npm run dev`          | Start the development server                              |
| `npm run build`        | Production build                                          |
| `npm run start`        | Serve the production build (run `build` first)            |
| `npm run lint`         | ESLint                                                    |
| `npm run format`       | Format all files with Prettier                            |
| `npm run format:check` | Check formatting without writing                          |
| `npm run typecheck`    | Generate Next.js route types, then run `tsc --noEmit`     |
| `npm run check:bundle` | After `build`, fail if privileged variables are in the client bundle |

Markdown files are not auto-formatted by Prettier.

## Testing

| Command                                              | Runs                       | Needs                                  |
| ---------------------------------------------------- | -------------------------- | -------------------------------------- |
| `npm test`                                           | Unit tests (Vitest)        | Nothing external                       |
| `npm run test:db`                                    | Database tests (Vitest)    | Local Supabase running (`db:start`)    |
| `npm run test:e2e`                                   | End-to-end tests (Playwright, mobile Chromium) | `.env.local`; starts the dev server itself |

First time only, install the Playwright browser: `npx playwright install chromium`.

Current tests prove the tooling works: environment validation, secret-separation checks, database connectivity and migration state, and a smoke test of the health endpoint and home page. **There are no business-logic tests yet because there is no business logic.** The plan lists the tests each phase must add, including concurrency tests, RLS tests, the SRS acceptance scenarios (AC-01 to AC-22) and mandatory peak-load testing before launch.

## CI

[.github/workflows/ci.yml](.github/workflows/ci.yml) runs on pushes to `main` and on pull requests: formatting, lint, type-check, unit tests, build and bundle check; database tests against a local Supabase stack; and Playwright end-to-end tests. **It has not been run on GitHub yet** (it has only been syntax-checked), so treat it as unverified until the first run passes.

## Deployment overview

**Not yet established.** The intended approach is managed Next.js hosting plus a production Supabase project, served over HTTPS, with secrets held in environment variables or a secret manager, and with monitoring and backups. The hosting provider is undecided. Deployment steps will be documented in Phase 9.

## Roadmap

Development proceeds in nine phases. See the [implementation plan](docs/implementation-plan.md) for details, acceptance criteria, and tests.

1. Foundation — **complete locally** (first GitHub CI run pending)
2. Authentication & authorisation
3. Product catalog & customisation
4. Customer ordering (cart to COD order)
5. Rider management & order assignment
6. Delivery lifecycle & customer-rider calling
7. Live tracking & ETA
8. Admin operations
9. Hardening, testing & deployment

## Documentation

- [Software Requirements Specification](docs/SRS.md): authoritative requirements.
- [Implementation plan](docs/implementation-plan.md): phases, open decisions, ambiguities.
- [Decision log](docs/decisions.md): technical decisions made so far.
- [Copilot instructions](.github/copilot-instructions.md): development rules for this project.

## License

Not yet specified.
