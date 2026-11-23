# Copilot Instructions — Murliganj Food Ordering & Delivery Platform

**Authoritative sources:** [docs/SRS.md](../docs/SRS.md) is the source of truth for functional requirements and acceptance criteria (AC-01…AC-22). [docs/implementation-plan.md](../docs/implementation-plan.md) defines the phase order and the open decisions. If this file, the plan, and the SRS disagree, the SRS wins. Flag the conflict instead of silently picking a side.

## 1. Product in one paragraph

A hyperlocal food ordering and delivery web app for Murliganj, Bihar (~5 km radius). It is **product-centric, not a restaurant marketplace**. Customers browse the business's own catalog and prices. The business handles sourcing offline. Orders are offered to riders. A rider accepts, picks up, and delivers. The customer tracks the order. Three roles: `CUSTOMER`, `RIDER`, `ADMIN`. Payment is Cash on Delivery only. Currency is INR (₹). Timezone is `Asia/Kolkata`.

Guiding principle (SRS §13): *build a simple food ordering and delivery platform, not a restaurant marketplace or a complex logistics system.*

## 2. Business rules that must never be broken

- **Server is the authority on money.** Item prices, customisation prices, subtotal, delivery fee, and total are always computed server-side from trusted DB records. Never trust client-sent prices or totals. (FR-CART-05, FR-ORDER-08)
- **Snapshots.** Orders store snapshots of product name/price, customisation names/prices, delivery fee, and delivery address. Later catalog, fee, or address edits must never change historical orders. (FR-PROD-06, FR-FEE-04, FR-ORDER-09, SRS §6.3)
- **Operating hours are enforced in the backend** using `Asia/Kolkata`. Out-of-hours order creation is rejected with a clear message. Riders cannot accept new orders after closing. Orders **already accepted** may finish after closing. Unaccepted pending orders are closed at closing time. (FR-HOURS-*)
- **Service area is validated server-side** at checkout. The exact boundary is not decided (see plan's open decisions). Read it from configuration and never hard-code it.
- **One order = one pickup, one delivery, one rider.** No multi-pickup and no multi-rider orders.
- **Rider capacity: max 5 active orders.** It is enforced atomically in the database or a transaction with locking, never by a frontend count. The limit lives in `business_settings`, with a default of 5. "Active" means accepted but not yet delivered or cancelled (`ACCEPTED`, `PICKUP_IN_PROGRESS`, `PICKED_UP`, `OUT_FOR_DELIVERY`). Delivered or cancelled orders free the slot. (FR-RIDER-06/07/10)
- **Concurrent acceptance:** exactly one rider wins. (AC-10)
- **Independent order status per order.** Never assume a rider's orders move together. Riders choose their own delivery sequence. No automatic route optimisation.
- **State machine (SRS §5):** transitions are validated server-side, only by authorised actors, and every transition is logged in `order_status_history`. Terminal states (`DELIVERED`, `CANCELLED`, `REJECTED`) never move back. Cancellation and rejection are recorded separately, each with reason, initiator (user or system), timestamp, and the status at the time.
- **Cancellation:** the customer can cancel directly only in `PENDING_ASSIGNMENT`. After acceptance the customer can only *request* cancellation and an admin decides. Delivered orders cannot be cancelled.
- **Rider rejecting an order** (with a mandatory reason) is not an order-level `REJECTED`. The order stays available to other eligible riders. (FR-AREA-03/04/05)
- **Privacy:** rider name and phone are visible only to the customer of that assigned order. Customer phone, address, and GPS are visible only to the assigned rider, to admins as needed, and to the owning customer. Rider GPS is visible only to customers with an order assigned to that rider, and to admins. Never expose these publicly or in broad API responses.
- **Realtime is not the source of truth.** The database is. Realtime and notifications are best-effort, and the UI must recover from missed events by re-fetching.
- **Out of scope** (SRS §2.2): vendor/restaurant management, inventory/stock, procurement, online payments, native apps, loyalty, subscriptions, recommendations, route optimisation, multi-pickup/multi-rider. Do not add them.

## 3. Architecture principles

- **Modular monolith**: a single Next.js (App Router) + TypeScript codebase. No microservices, queues, caches, or extra infrastructure unless there is evidence it is needed.
- Baseline stack from SRS §7.1: Next.js, TypeScript, Tailwind CSS, shadcn/ui, Supabase (PostgreSQL, Auth, Realtime, Storage), managed Next.js hosting. Map, OTP/SMS, and notification providers are **undecided**. Hide them behind a thin interface so the choice stays swappable. Do not pick one without the user.
- Organise code by domain module (auth, catalog, customisation, cart, checkout, orders, riders, assignment, tracking, notifications, admin, reporting). Each module owns its logic and exposes a small interface. Route files and components stay thin and call module code.
- Business-critical operations (place order, accept order, change status, cancel, reassign) live in **one server-side place each**, ideally Postgres functions or transactions for anything needing atomicity. They are never duplicated in UI code.
- Prefer boring, simple solutions. Add an abstraction only when it removes real duplication, or when it is required by an open decision. No speculative features, generic frameworks, or "future-proof" layers. (Exception from the SRS: keep the order and payment model able to accept online payments later, without building it.)
- Do not add dependencies casually. Prefer the platform, Supabase, and the standard library. Justify each new dependency in the PR/commit description.

## 4. Coding standards

- TypeScript `strict` mode. No `any` without a comment explaining why. Prefer `unknown` plus narrowing.
- Generate DB types from the schema rather than hand-writing them. Share validation schemas between client and server.
- Names: `camelCase` for variables/functions, `PascalCase` for components/types, `kebab-case` for file names, and `snake_case` for DB identifiers. Enum-like values use the SRS spelling (e.g. `PENDING_ASSIGNMENT`).
- Money: **integer paise, never floating point** (decision D-12, see `docs/decisions.md`). Name money columns with a `_paise` suffix. Convert to ₹ only at the UI edge.
- Timestamps: store UTC (`timestamptz`). Convert to `Asia/Kolkata` only for operating-hours logic and display.
- Small, single-purpose functions. Comment only non-obvious intent, not what the code plainly says.
- Reuse shadcn/ui components and existing helpers before writing new ones.
- Small, focused commits with clear messages. Keep one concern per change. Do not mix refactors with features. Do not fix unrelated issues in passing.

## 5. Database & API guidelines

- All schema changes are **version-controlled SQL migrations**. Never edit the schema by hand in a dashboard without a matching migration. Never edit a migration that has already been applied elsewhere. Add a new one.
- Start from the table design in SRS §6, but note that it is a proposal. Add tables the SRS implies but does not list (for example cancellation requests, rider rejections, delivery problem reports, idempotency keys) only when the phase needs them, and document each in `docs/`.
- Use foreign keys, `NOT NULL`, `CHECK` constraints (positive quantities, non-negative prices, valid status values), and unique constraints to make invalid states unrepresentable. Enforce the SRS §6.2 constraints in the database, not only in app code.
- Index foreign keys and columns used by hot queries (orders by status, by rider, by customer; latest rider location). Add indexes with a reason, not by default.
- **RLS is mandatory** on every table in an exposed schema. Default deny, then add explicit per-role policies. Each policy needs a test.
- API/route handlers: authenticate, authorise by role and ownership, validate input, call the module function, and return a consistent response shape. Do not leak internal errors.
- Mutations that must not double-run (order placement) must be **idempotent** (FR-ORDER-07). Use a client-generated idempotency key enforced by a DB unique constraint.
- Apply rate limits to OTP endpoints and other abuse-prone endpoints (FR-AUTH-06). Limit location-update frequency from clients.
- Keep rider location writes small and append-oriented. Query only the latest position for display. Retention is an open decision.
- Seed data is for development only and must never contain real credentials or personal data.

## 6. Authentication, authorisation & security

- Sign-in methods (decision D-02): customers and riders use phone OTP; admins use email and password. The SMS provider is undecided (D-01). Riders and admins are **never self-service**: they are created with the secret key (`npm run user:create-rider`, `npm run user:create-admin`). New auth users always start as `CUSTOMER` (database trigger); the role is **never** read from signup metadata or any client-supplied data. Role lives in the database (`profiles.role`).
- **Guard every protected page, server action and data function with `requireRole()`** (`src/modules/auth/current-user.ts`) at the top. Do not rely on layouts or on `src/proxy.ts`: the proxy only refreshes sessions. Use `getCurrentUser()` for the identity (it verifies with the Auth server and fails closed).
- **Every new table in `public` must:** enable RLS, revoke the default API grants (`revoke all ... from anon, authenticated`) and grant back only what is needed (column-level for updates where relevant), add per-role policies, and have a DB test for each role. Use `public.current_user_role()` in policies. `tests/db/rls-baseline.test.ts` fails if a table lacks RLS or is readable by `anon` without being listed there.
- Authorisation is enforced on the server **and** in RLS. Hiding a page is never access control. Check role *and* ownership or assignment on every request.
- The Supabase secret key (`SUPABASE_SECRET_KEY`, or any privileged key) is **server-only**. It must never be in browser bundles or `NEXT_PUBLIC_*` variables. Only the publishable key is public. Read environment variables through `src/lib/env/` (never `process.env` directly), and keep `src/lib/env/server.ts` out of client components.
- Validate all input on the server (types, ranges, lengths, enums, coordinates). Validate image uploads (type, size) and store them in Supabase Storage with sensible access rules.
- Secrets go only in environment variables or a secret manager. Never commit them. Keep `.env.example` current with names only, and no real values. HTTPS in production.
- Keep audit history for sensitive operations (status changes, reassignment, cancellation decisions, price, fee, and settings changes, COD collection).
- Log without PII where possible. Never log OTPs, tokens, or full phone numbers or addresses unnecessarily.

## 7. Frontend & UI guidelines

- **Mobile-first** for customer and rider interfaces (browser only; no native apps). The admin dashboard should be simple and functional.
- Use Tailwind and shadcn/ui. Keep the design consistent and minimal. Few steps to place an order.
- Always show clear prices: item price, customisations, item total, subtotal, delivery fee, and the final COD amount. The UI shows server-calculated numbers. Client-side previews must be labelled or reconciled with the server result.
- Show clear order statuses and plain-language error messages (for example "We are closed right now. Orders open at …", "This address is outside our delivery area").
- Handle loading, empty, error, and offline states. Realtime failures must degrade gracefully (re-fetch or poll).
- Show rider location as **approximate** with a visible "last updated" or stale indicator. Show ETA as an approximate time or range. (FR-TRACK-05, FR-ETA-04)
- "Call Rider" is a `tel:` link. Do not build calling infrastructure. (FR-COMM-03)
- Accessibility basics: semantic HTML, labels, sufficient contrast, usable touch targets.
- Rider GPS uses browser geolocation while the rider screen is active. Background tracking is **not guaranteed**, so design and word the UI honestly around that limitation.
- Business UI copy and any language/localisation choice is an open decision. Do not assume Hindi or English-only without asking.

## 8. Testing expectations

- Every feature ships with tests at the appropriate level. A phase is not done until its tests in the implementation plan pass.
- **Unit tests:** pricing and customisation calculation, state-machine transitions, operating-hours logic (including timezone and boundary cases), service-area check, validation schemas.
- **Database/integration tests against a real Postgres (not mocks):** RLS policies per role, constraints, atomic assignment and capacity, idempotent order creation, snapshot immutability.
- **Concurrency tests:** two riders accepting at once (AC-10), and a sixth-order attempt (AC-11).
- **End-to-end tests** for the SRS acceptance scenarios, on a mobile viewport.
- Add a regression test for every bug fixed.
- Security tests: unauthenticated and wrong-role access, cross-customer access, rider-to-rider access, privileged key not in client bundle.
- Peak-load testing is mandatory before launch (SRS §9.1).
- Run the relevant tests, lint, and type-check before declaring work complete. If a check cannot be run, say so instead of claiming success.
- **Commands:** `npm test` (unit), `npm run test:db`, `npm run test:integration` and `npm run test:e2e` (the last three need `npm run db:start` and `.env.local`), `npm run lint`, `npm run typecheck`, `npm run format:check`, and `npm run build` followed by `npm run check:bundle`. After any schema change run `npm run db:types`. Unit tests live next to the source as `*.test.ts` or in `tests/unit/`.
- Tests that request an OTP must use their own phone number from `[auth.sms.test_otp]` in `supabase/config.toml` (one code per number per minute), and must delete the users they create.
- This project uses Next.js 16, which differs from older versions. Follow [AGENTS.md](../AGENTS.md) and read the matching docs in `node_modules/next/dist/docs/` before writing Next.js code.

## 9. Error handling & validation

- Validate at the boundary (server) and return structured, user-safe errors with stable error codes, so the UI can show specific messages.
- Fail closed: if authorisation, hours, or service-area configuration is missing or invalid, reject the request. Never allow by default.
- Handle expected failures explicitly: duplicate submissions, sold-out or unavailable products, capacity reached, order already accepted by another rider, invalid transition, OTP delivery failure, stale GPS, and realtime disconnects.
- Wrap multi-step writes in a transaction. Never leave an order half-created or half-assigned.
- Do not swallow errors. Log with context (order id, actor role) and avoid PII.

## 10. Avoid overengineering

- Build the smallest thing that meets the SRS and the current phase. Do not start work from a later phase.
- Do not add online payments, route optimisation, number masking, caching layers, event buses, job-queue systems, multi-tenant structures, or admin features beyond the SRS.
- When something is undecided in the SRS (SRS §12 and the plan's open-decisions list), **do not guess**. Ask the user, or isolate it behind a small interface and a config value, and record the open item.
- Prefer configuration (`business_settings`) over hard-coded values for hours, fee, coverage, max active orders, and timezone.

## 11. Working agreement for Copilot

- Read the relevant SRS section and the current plan phase before implementing.
- Work phase by phase, in order. Stay inside the current phase's scope.
- Do not claim a feature is implemented, or document a command or config value, unless it exists. Keep `README.md` and the plan accurate as things change.
- Do not commit secrets or real data. Do not make destructive operations (dropping data, force pushes) without explicit approval.
- If a requirement is ambiguous or two SRS sections conflict, surface it and ask before building.
