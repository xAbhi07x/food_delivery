# Implementation Plan — Murliganj Food Ordering & Delivery Platform

**Source of truth:** [SRS.md](./SRS.md) (v1.0, 22 Nov 2026). This plan sequences the work. It does not restate every requirement. References like `FR-RIDER-07` and `AC-10` point to the SRS.
**Companion files:** [.github/copilot-instructions.md](../.github/copilot-instructions.md), [README.md](../README.md).
**Status:** Phases 1 (Foundation) and 2 (Authentication & authorisation) are complete and CI is green on `main`. Phases 3–9 are not started. No business features exist beyond sign-in.

## 1. How to read this plan

- The phases follow the SRS §11 roadmap (Stages 1–8). SRS Stage 6 is split into two phases (delivery lifecycle, then tracking and ETA), and the SRS Stage 8 work is Phase 9.
- Each phase is an independently testable milestone. A phase is **done** only when its acceptance criteria are met and its required tests pass.
- Work in order. Do not start a phase before its dependencies are done, except for drafting.
- The MVP is defined by SRS §13. It is reached at the end of **Phase 9**.
- **Open decisions** (Section 3) are deliberately not resolved here. Each lists the phase by which it must be settled.
- **SRS ambiguities** (Section 4) are places where the SRS is silent or implies something it does not spell out. Each has a *working interpretation*, which is an assumption to confirm and not a decision.

### Phase overview

| Phase | Name | SRS stage | Depends on |
|---|---|---|---|
| 1 | Foundation | Stage 1 | — |
| 2 | Authentication & authorisation | Stage 2 | 1 |
| 3 | Product catalog & customisation (with minimal admin catalog UI) | Stage 3 | 2 |
| 4 | Customer ordering (cart → COD order) | Stage 4 | 3 |
| 5 | Rider management & order assignment | Stage 5 | 4 |
| 6 | Delivery lifecycle & customer–rider calling | Stage 6 (part) | 5 |
| 7 | Live tracking & ETA | Stage 6 (part) | 6 |
| 8 | Admin operations | Stage 7 | 4–7 (can partially overlap, see notes) |
| 9 | Hardening, testing & deployment | Stage 8 | 1–8 |

### Acceptance-criteria traceability (SRS §10)

| AC | Scenario | Phase |
|---|---|---|
| AC-01 | Customer OTP login | 2 |
| AC-02 | Browse products | 3 |
| AC-03 | Customisation price | 3 (server calc), 4 (cart/UI) |
| AC-04 | Multiple products, correct cart total | 4 |
| AC-05 / AC-06 | Order during / after hours | 4 |
| AC-07 | Out-of-area checkout prevented | 4 |
| AC-08 | COD order created | 4 |
| AC-09 | Rider accepts order | 5 |
| AC-10 | Simultaneous acceptance, one wins | 5 (verified again in 9) |
| AC-11 | Sixth order rejected | 5 (verified again in 9) |
| AC-12 | Multiple orders tracked independently | 5, 6 |
| AC-13 | Delivery frees a slot | 6 |
| AC-14 | Call rider opens dialler | 6 |
| AC-15 / AC-16 | GPS visible / stale indication | 7 |
| AC-17 | Cancel before acceptance | 4 (customer action), 8 (admin visibility) |
| AC-18 | Cancellation request after acceptance, admin handles | 8 (request creation UI can land in 6) |
| AC-19 | Rider accept after closing rejected | 5 |
| AC-20 | Accepted order continues after closing | 6 |
| AC-21 | Fee change affects only new orders | 4 (snapshot), 8 (admin UI) |
| AC-22 | Price change doesn't alter history | 4 (snapshot), 8 (admin UI) |

---

## 2. Phases

### Phase 1 — Foundation

**Status: complete. CI passes on GitHub. One optional item is pending (a hosted Supabase project, which needs your Supabase account).**

**Objective:** A reproducible, empty-but-working project skeleton, with tooling, database migrations, and tests running, and no business features.

**Features:** None for end users. A "health" page or route proving the stack is wired up.

**Major tasks**
- [x] Initialise the Next.js + TypeScript (strict) app, Tailwind CSS, and shadcn/ui (SRS §7.1 baseline).
- [x] Define the folder layout as a modular monolith by domain (SRS §7.3). Recorded in the README and `src/modules/README.md`.
- [~] Local development workflow for Postgres and Supabase: done (Supabase CLI + Docker). **A hosted dev Supabase project is not created yet** (needs your account).
- [x] Migrations directory and process. Baseline no-op migration applies on a fresh database; `npm run db:reset` is reproducible.
- [x] `.env.example` (names only), typed environment validation (zod), server-only vs public separation. The server fails fast at startup on invalid configuration.
- [x] `.gitignore`, ESLint, Prettier, type-check, and runners for unit tests (Vitest), DB tests (Vitest + `pg`), and e2e tests (Playwright).
- [x] CI on GitHub: workflow passes on `main` (checks, database, and e2e jobs all green on the first run).
- [x] Conventions recorded for D-12, D-13, D-14 (see [decisions.md](./decisions.md)).
- [x] Decision log in `docs/decisions.md`.

**Dependencies:** None. Decisions D-12 to D-14 were needed here and are settled (D-14's load-test tool stays open until Phase 9).

**Deliverables:** Running app skeleton; migrations workflow; CI pipeline; `.env.example`; updated README with real, verified setup commands; decision log.

**Acceptance criteria**
- [x] A new developer can follow the README from clone to a running local app and passing tests. *Verified from a fresh clone of the GitHub repository: `npm ci`, environment file, then format check, lint, type-check, unit, database, build, bundle check and e2e all pass. It ran on the primary development machine, so a second machine is still a nice-to-have check.*
- [x] A migration can be applied to a fresh database and the database reset reproducibly. *Verified with `db:reset` followed by `test:db`.*
- [x] No secret is committed. Privileged keys are server-only. *Verified by unit tests and `npm run check:bundle`, including a negative test showing the bundle check detects a planted value.*
- [x] CI runs and passes on the default branch. *Run 1 on `main` (commit `c786d3c`): all three jobs succeeded.*

**Tests required:** Smoke test (app boots, health route returns OK); one trivial unit test, one DB test, and one e2e test proving each runner works; env-validation test (missing required variable fails fast).

**Test results (local):** 13 unit tests pass, 4 database tests pass (before and after a database reset), 2 Playwright tests pass on a mobile viewport. Lint, format check, type-check and production build pass. Fail-fast startup was verified manually with an invalid `NEXT_PUBLIC_SUPABASE_URL`.

**Pending items (need you)**
1. Create a hosted Supabase dev project if you want a shared environment before Phase 9. Not required for local development. It will be needed when OTP is configured in Phase 2 (the OTP provider and hosted settings depend on D-01).

---

### Phase 2 — Authentication & authorisation

**Status: complete. CI passes on GitHub (run on commit `d15f1bb`: both jobs green). Real SMS (D-01) and hosted-project settings are pending.**

**Objective:** Identity and role enforcement for all three roles, in the app and in the database, before any business data exists.

**Features:** Customer mobile-OTP sign-in. Rider and admin sign-in. Role-based route protection. RLS foundation. (FR-AUTH-01…06)

**Major tasks**
- [x] Wire Supabase Auth phone OTP, built and tested against Supabase's local test OTP. The real SMS provider (**D-01**) is deliberately deferred and stays swappable by configuration. OTP delivery failure shows a clear message and the user can retry or change number.
- [x] `profiles` (id, full_name, phone, role, timestamps) with a `CUSTOMER` default for self-signup. A customer can never self-assign `RIDER` or `ADMIN`: the signup trigger ignores metadata, and column-level grants stop users updating `role`, `phone` or `id`.
- [x] Sign-in per the decided **D-02**: riders by phone OTP with admin-created accounts (`npm run user:create-rider`), admins by email and password, and the one-off developer script that bootstraps the first admin (`npm run user:create-admin`).
- [x] Server-side session handling (`@supabase/ssr`, session-refresh `proxy.ts`) and route guards for the customer (`/account`), rider (`/rider`) and admin (`/admin`) areas. The role is read from the database by `requireRole`, never from client input, and the check fails closed.
- [x] RLS enabled on `profiles` with a reusable `current_user_role()` helper for later phases. Default deny, plus a standing test that every `public` table has RLS enabled.
- [~] Rate limiting on OTP request and verify (FR-AUTH-06): one code per number per minute is configured and tested; the per-IP limits are Supabase's defaults, configured but **not load-tested**, and the hosted project must be configured separately (see "Launch settings" in [decisions.md](./decisions.md)).
- [~] Sign-out works. Session expiry and refresh rely on Supabase defaults (1-hour access token, refreshed by the proxy) and are **not covered by a dedicated test**.

**Dependencies:** Phase 1. **D-02** is decided. **D-01** is deferred (not a blocker; see decisions.md). The admin password policy was set to 12+ characters with upper, lower and digit (the SRS specifies none). **Admin password recovery is not implemented** and is not specified in the SRS.

**Deliverables:** Working login flows for each role; `profiles` migration with RLS; role-check helper; OTP rate-limiting; authorisation test suite; provisioning scripts.

**Acceptance criteria**
- [x] AC-01: a customer logs in with OTP and gets an authenticated session. *Covered by integration and e2e tests.*
- [x] A customer cannot access rider or admin areas, by UI or by direct API call. Rider cannot access admin. Unauthenticated requests are rejected. *No rider or admin APIs exist yet; the only API-exposed table is `profiles`, whose access is tested per role. Every area is guarded in each page, verified in e2e for all role pairs.*
- [x] A user cannot change their own `role`. *Tested in the database and through the public API.*
- [~] OTP endpoints are rate-limited. Repeated requests are throttled. *Per-number cooldown is tested; see the rate-limiting note above.*
- [x] No privileged key reaches the browser. *Unit tests, `npm run check:bundle` with the real secret loaded, and a guard that only `src/lib/env/` references the secret key.*

**Tests required:** Unit tests for role guards. DB/RLS tests per role on `profiles` (read own, cannot read others, cannot escalate role). Integration tests for OTP flow using the provider's test mode or a stub. Rate-limit test. E2E: customer login. Security check: secret key absent from client bundle (`npm run check:bundle`).

**Test results (local):** 54 unit, 27 database, 14 integration and 14 end-to-end tests pass, along with lint, format check, type-check, build and the bundle check.

**Known gap (documented, tested):** email sign-up is enabled because admins sign in with email, so anyone can self-register an email-only account through the public API. It is a powerless `CUSTOMER` with no phone and cannot become anything else without the secret key. Decide before launch whether to block it (for example with Supabase's `before_user_created` hook or CAPTCHA).

**Pending items (need you)**
- Real SMS provider (**D-01**) and the hosted-project launch settings. Neither blocks Phase 3.

---

### Phase 3 — Product catalog & customisation

**Objective:** An administrator can build the catalog; customers can browse it; prices are calculated correctly on the server.

**Features:** Categories; products (name, description, image, category, price, availability, display order); customisation groups and options (variants, add-ons, special instructions); customer browse and search. A **minimal admin UI for catalog only**, so MVP item 1 is testable early. The wider dashboard comes in Phase 8. (FR-PROD-*, SRS §4.3)

**Major tasks**
- Migrations: `categories`, `products`, `customization_groups`, `customization_options`, with constraints (price ≥ 0, `min_selections ≤ max_selections`, valid selection types) and RLS. Public read applies to available or active items only. Writes are admin-only.
- Image upload to Supabase Storage with type and size validation (SRS §8 item 11), and storage access rules.
- Server-side **price calculator**: given a product, selected options, and quantity, return the item price and total. Validate required groups and min/max selections, option availability, and group activity. This module is reused by checkout in Phase 4.
- Admin catalog screens: create, edit, deactivate products; manage categories, availability, display order, and customisation configuration.
- Customer screens: category browsing, product list, product detail with customisation selection, search (FR-PROD-03/04).
- Decide search approach (**D-11**). The simplest option that works for a small catalog is preferred.
- Seed a small development-only catalog.

**Dependencies:** Phase 2 (admin role and RLS).

**Deliverables:** Catalog migrations; storage setup; price-calculation module; admin catalog UI; customer browse, search, and detail UI; seed data.

**Acceptance criteria**
- AC-02: available products are displayed. Unavailable or deactivated products are not orderable (FR-PROD-05).
- AC-03: the customisation price is correct, as calculated by the server (e.g. SRS example: Veg Burger ₹99 + Large ₹30 + Extra cheese ₹20 = ₹149).
- Invalid customisation selections (missing required group, over max, unknown option) are rejected by the server.
- Only admins can create or modify catalog data. Customers can only read available items.
- Uploading an invalid image is rejected.

**Tests required:** Unit tests for the price calculator (variants, add-ons, min/max, required, inactive options, quantity). DB tests for constraints and RLS (customer cannot write; unavailable items hidden from customers). Integration tests for admin CRUD. E2E: admin creates a product with customisations → customer sees it and the correct price.

---

### Phase 4 — Customer ordering (cart → COD order)

**Objective:** A customer can build a cart and place a valid, snapshotted Cash-on-Delivery order, subject to operating hours and service area.

**Features:** Cart; address management; map/location capture; service-area validation; operating-hours check; checkout; COD order creation; order history and detail; customer cancellation before rider acceptance. (SRS §4.4–4.8, §4.14, §4.15)

**Major tasks**
- Choose the map provider (**D-04**) and the service-area model (**D-05**). Implement location capture (map coordinates plus address description and landmark) behind a thin provider interface.
- Decide where the cart lives (**D-10**) and implement it. Show all fields required by FR-CART-04.
- Migrations: `customer_addresses`, `orders`, `order_items`, `order_item_customizations`, `order_status_history`, `business_settings`, with the SRS §6.2 constraints and RLS. Money and status constraints live in the database.
- Seed `business_settings` with **development-only placeholder values** for hours, fee, timezone (`Asia/Kolkata`), service area, and max active orders (default 5). Real values are set under **D-06/D-07/D-05** before launch.
- A single server-side **place-order** operation (transaction): authenticate → validate address and phone → check operating hours (backend, `Asia/Kolkata`) → check service area → re-fetch products and options and recompute prices → check availability → compute the delivery fee from settings → insert order, items, customisation snapshots, address snapshot, fee snapshot → write initial status history. Initial status is `PENDING_ASSIGNMENT`, payment method `COD`, and payment status `PENDING`.
- **Duplicate-submission protection** with an idempotency key and a DB unique constraint (FR-ORDER-07).
- Order number generation (format is undecided, see **D-15**).
- Customer order list and detail, and **customer cancel** while `PENDING_ASSIGNMENT`, using the shared state-machine module, with a recorded reason (reason list under **D-08**).
- Clear user-facing errors for closed hours, out-of-area, unavailable product, and price change since the cart was built.

**Dependencies:** Phase 3. **D-04, D-05, D-10** must be settled. Real **D-06, D-07** values are not needed until launch.

**Deliverables:** Order-domain migrations and RLS; place-order operation; state-machine module (initial transitions); cart, address, checkout, order history UI; customer cancel.

**Acceptance criteria**
- AC-04: multiple products give a correct cart total.
- AC-05: an order during hours is created. AC-06: an order after hours is rejected with a clear message **by the backend** (not only the UI).
- AC-07: an out-of-area location prevents checkout (and is also rejected server-side).
- AC-08: a COD order is created with the correct total, `PENDING` payment status, and `PENDING_ASSIGNMENT` status.
- Tampered client prices or totals are ignored. The server total is used (FR-ORDER-08).
- Double-submitting checkout creates one order.
- AC-17: a customer cancels a `PENDING_ASSIGNMENT` order. A cancelled order records the reason, initiator, timestamp, and previous status. A customer cannot cancel any other status directly.
- AC-21 and AC-22 (data level): after a product price or fee change, existing orders are unchanged.
- A customer cannot see another customer's orders or addresses.

**Tests required:** Unit tests for the hours check (boundaries, midnight rollover if hours cross it, timezone), service-area check, fee calculation, state-machine transitions. DB/RLS tests (ownership, constraints, snapshot immutability, idempotency key uniqueness). Integration tests for place-order (success, each rejection reason, tampered payload, duplicate submit). E2E (mobile viewport): cart → checkout → order confirmation; after-hours rejection; out-of-area rejection; customer cancel.

---

### Phase 5 — Rider management & order assignment

**Objective:** Riders can go online, see pending orders, and accept or reject them, with atomic assignment and enforced capacity.

**Features:** Rider profiles; online/offline availability; pending-order list and notifications; order review; accept; reject with reason; maximum of five active orders; multiple active orders per rider. (SRS §4.9, FR-AREA-03/04/05)

**Major tasks**
- Migrations: `rider_profiles`, rider-rejection records (order, rider, reason, timestamp), and the assignment function. RLS: riders see only pending orders they are eligible for, plus their own assigned orders.
- Decide rider eligibility and the notification channel (**D-03**, **D-16**). Implement notifications as best-effort over a persistent order list (the DB remains the source of truth, with re-fetch or polling as fallback).
- Decide what order details a rider may see **before** accepting (**D-17**), balancing FR-RIDER-04 and FR-AREA-03 against the SRS rule that riders cannot access unrelated customer location data.
- **Atomic accept operation** (single transaction with locking or an equivalent guarantee): verify the order is still `PENDING_ASSIGNMENT`, the rider is active and online, operating hours allow acceptance (FR-HOURS-04), and active orders < configured max (default 5). Then set `rider_id`, move to `ACCEPTED`, and write status history. Concurrent attempts yield exactly one winner.
- **Reject operation:** requires a reason, records it, and leaves the order available to other eligible riders (FR-AREA-05).
- Rider online/offline toggle. Define what happens to a rider's existing active orders when they go offline (they stay assigned; offline only stops new offers).
- Rider UI (mobile-first): availability toggle, available orders, order detail, my active orders (count shown, e.g. 3/5).
- Minimal rider account management by admin sufficient to test (full admin UI in Phase 8).

**Dependencies:** Phase 4. **D-02** (rider accounts), **D-03/D-16/D-17** must be settled.

**Deliverables:** Rider migrations and RLS; accept and reject operations; rider UI; notification mechanism; concurrency test harness.

**Acceptance criteria**
- AC-09: an accepted order is assigned to that rider. Status is `ACCEPTED`. History is logged.
- AC-10: two riders accepting the same order at the same time, so exactly one succeeds and the other gets a clear "already taken" response.
- AC-11: with five active orders, a sixth acceptance is rejected. This also holds under concurrent attempts.
- AC-12: a rider holds multiple orders, each with its own status and history.
- AC-19: acceptance after closing is rejected.
- An offline or inactive rider cannot accept. A rider cannot see or act on another rider's orders.
- A rejected order remains offered to other riders, and the rejection reason is stored.

**Tests required:** Unit tests for eligibility and capacity rules. **DB concurrency tests** with parallel transactions (two riders / one order; one rider / many orders racing the 5-limit). RLS tests per role. Integration tests for accept, reject, offline, inactive, after-hours. E2E: rider goes online → sees order → accepts; the customer's order shows `ACCEPTED`.

---

### Phase 6 — Delivery lifecycle & customer–rider calling

**Objective:** Each assigned order moves independently through pickup and delivery, with valid transitions, flexible sequencing, COD collection, and customer–rider contact.

**Features:** Independent per-order status updates; rider-chosen delivery sequence; pickup confirmation; start delivery; delivery confirmation; COD collection recording; problem reporting; assigned-rider details and Call Rider for the customer. (SRS §4.10, §4.11, §4.6 FR-PAY-04, FR-RIDER-08/09/10)

**Major tasks**
- Complete the **state-machine module** and a single server-side transition operation: `ACCEPTED → PICKUP_IN_PROGRESS → PICKED_UP → OUT_FOR_DELIVERY → DELIVERED`. Enforce actor, assignment, and valid transition. Log every change. Reject arbitrary jumps and updates by non-assigned riders.
- Rider's delivery sequence: a stored ordering the rider can change. It is advisory only (no auto-optimisation). It must not force orders to be handled together.
- Delivery confirmation requirements (**D-09**): COD collection confirmation, and whether anything beyond the status transition (e.g. PIN) is required.
- COD payment recording: rider or authorised admin sets payment status `PAID` (or `FAILED`), with audit.
- Delivered orders release capacity immediately (FR-RIDER-10).
- Rider "report a delivery problem": create a record for admins (handled in Phase 8). Customer "request cancellation" after acceptance: create a pending request visible to admins (handled in Phase 8). Keep these as simple records.
- Customer-facing: order status timeline; assigned rider name and phone shown only after acceptance, only to the owning customer, with a `tel:` Call Rider link. Expose rider contact through a restricted query or function, never a broad profile read (FR-COMM-04/05).
- Rider-facing: customer contact and delivery address for assigned orders only, with a `tel:` link to contact the customer.

**Dependencies:** Phase 5. **D-09** and **D-08** should be settled.

**Deliverables:** Transition operation with full history; sequencing UI; payment-recording; customer status and call UI; problem and cancellation-request records.

**Acceptance criteria**
- Valid transitions work. Every invalid transition is rejected (e.g. `ACCEPTED → DELIVERED`, anything out of a terminal state, updates by a non-assigned rider).
- AC-12: orders of the same rider advance independently, in any order the rider chooses.
- AC-13: delivering one order frees a capacity slot, and the rider can accept another.
- AC-14: the customer's Call Rider button opens the device dialler via `tel:`.
- AC-20: an order accepted before closing can be completed after closing.
- Rider contact is visible only to the owning customer once the order is accepted. It is not visible before acceptance, to other customers, or publicly.
- Customer cannot update status. Rider cannot alter prices or totals.

**Tests required:** Exhaustive unit tests on the state-machine transition table. DB/RLS tests (rider cannot touch others' orders; contact-field visibility). Integration tests for each transition by correct and incorrect actors; history written; capacity release. E2E: full order from placement → accept → pickup → out for delivery → delivered, with customer view updating; after-closing completion.

---

### Phase 7 — Live tracking & ETA

**Objective:** Customers can see an approximate live rider position and a delivery estimate, with correct privacy and stale-data handling.

**Features:** Rider location sharing; customer map view; stale indicator; ETA. (SRS §4.12, §4.13)

**Major tasks**
- Migration for `rider_locations` with RLS: a rider writes only their own location. A customer can read **only** the latest location of the rider assigned to one of their active orders. Admins can read all (FR-TRACK-04/07).
- Rider client: browser geolocation while the rider's delivery screen is active, sending throttled periodic updates (FR-TRACK-02). Handle permission denial, GPS errors, and tab backgrounding, and tell the rider clearly that sharing pauses when the screen is inactive (**D-18** background tracking is not guaranteed).
- Location sharing stops when the rider has no active orders, and when the relevant delivery is completed or cancelled (FR-TRACK-06).
- Customer tracking view using the map provider (**D-04**), showing the rider position, the delivery point, and "last updated". Deliver updates by Supabase Realtime or polling with fallback (the DB is the source of truth).
- **Stale detection:** define the staleness threshold (**D-19**) and display a stale indication (FR-TRACK-05).
- **ETA:** decide the calculation approach (**D-20**). It should consider fulfilment time, the rider's location, remaining distance, other active deliveries, and the rider's chosen sequence (FR-ETA-02). Recompute on meaningful changes (FR-ETA-03). Present as an approximate time or range (FR-ETA-04). Store in `orders.estimated_delivery_at`.
- Define a location retention policy (**D-21**).

**Dependencies:** Phase 6. **D-04** (maps), **D-18…D-21**.

**Deliverables:** `rider_locations` migration and RLS; rider location-sharing client; customer tracking view; stale indicator; ETA logic and display.

**Acceptance criteria**
- AC-15: when a rider updates GPS, the authorised customer sees the updated location.
- AC-16: when updates stop, the customer sees a stale-location indication.
- A customer cannot read the location of a rider who is not assigned to one of their orders. A rider's location serves multiple customers only when each has an order with that rider.
- Location updates stop after the delivery is completed or cancelled.
- Every active order shows an approximate ETA that changes when conditions change. It is never presented as exact.
- Behaviour when permission is denied or the browser is backgrounded is visible and not silently broken.

**Tests required:** RLS tests (authorised vs unrelated customer, rider writing others' locations). Unit tests for stale detection and ETA calculation (including multi-order sequence). Integration tests for location write throttling. E2E: rider shares location → customer sees movement → updates stop → stale warning. Manual test on real mobile browsers (foreground, background, permission denied).

---

### Phase 8 — Admin operations

**Objective:** Administrators can run the business day to day and handle exceptions. This completes the admin dashboard started in Phase 3.

**Features:** Order monitoring; active-delivery monitoring; cancellation requests; rejected and unassigned orders; reassignment; rider management; settings (operating hours, fee, service area, max active orders, support contact); basic reports. (SRS §3.3, §4.7, §4.14, §4.15, §4.9 FR-RIDER-11/12)

**Major tasks**
- Order list and detail with filters (status, date, rider); active-delivery view; ability to view the customer information needed for operations.
- **Cancellation handling:** the admin reviews customer cancellation requests (from Phase 6) and records the decision and reason. Admin may cancel from any non-terminal state per SRS §4.15 (**interpretation A-02**). Cancellation and rejection are recorded separately with reason, initiator, timestamp, and prior status.
- **Rejected / unassigned orders:** admin can reject an unfulfillable order (e.g. unavailable product), and handle orders no rider accepted.
- **Time-based closing:** at closing time, pending unaccepted orders are closed or rejected by the system (FR-HOURS-05), and orders expire when unaccepted by the deadline (FR-RIDER-11). The deadline (**D-22**) and the scheduling mechanism (**D-23**) are open. Accepted orders are left alone.
- **Reassignment** for exceptional cases (FR-RIDER-12), atomic and audited, honouring the capacity limit of the new rider. The resulting status is an open question (**D-24**).
- **Rider management:** create, activate, and deactivate riders (per **D-02**). Deactivation behaviour for a rider with active orders must be defined (e.g. block until reassigned).
- **Settings UI** backed by `business_settings`, each change audited (`updated_by`): opening and closing time, fee (including zero), service-area configuration, max active orders, customer support contact (**D-07**).
- Remaining product and category management polish.
- **Basic reports**, limited to what the SRS asks for (orders and operational summaries). Scope the exact reports with the user (**D-25**).
- Review COD collection records and delivery problem reports.

**Dependencies:** Phases 4–7. Settings UI can begin after Phase 4, and order exceptions after Phase 6.

**Deliverables:** Admin dashboard modules; settings with audit; closing/expiry job; reassignment; reports.

**Acceptance criteria**
- AC-18: a customer's cancellation request after acceptance appears for the admin, who can decide and record the result.
- AC-21: changing the delivery fee applies to new orders only. Existing orders are unchanged.
- AC-22: changing a product price leaves historical order prices unchanged.
- Pending orders are closed at closing time. Accepted orders are not affected and can still be delivered (AC-20).
- Reassignment moves an order to a new eligible rider without violating capacity or leaving two riders on one order.
- All admin actions that change orders, settings, or prices are audited. Non-admins cannot reach any admin operation (UI or API).

**Tests required:** RLS and authorisation tests for every admin operation. Integration tests for cancellation decisions, reassignment (including capacity), settings changes with their effect on new vs old orders, closing-time sweep (clock-controlled). E2E: admin handles a cancellation request; admin changes fee, then a new order uses it while the old one does not.

---

### Phase 9 — Hardening, testing & deployment

**Objective:** Meet SRS §13 MVP completion: pass security and load tests, deploy to production with monitoring and backups.

**Features:** No new business features. Quality, security, performance, and operations.

**Major tasks**
- Run the **full SRS acceptance suite (AC-01…AC-22)** end to end, including on real mobile devices and browsers.
- Security review: RLS audit on every table, privileged-key exposure check, endpoint authorisation matrix, input validation, upload validation, OTP and API rate limits, PII exposure in API responses and logs, HTTPS (SRS §8).
- **Peak-hour load testing** (mandatory, SRS §9.1): ~500 orders/day shape, up to 20 riders × 5 active orders, concurrent customers, concurrent acceptance, multiple tracking sessions. Re-run the concurrency tests (AC-10/AC-11) under load. Fix bottlenecks found, with no speculative optimisation.
- Reliability checks (SRS §9.2): network interruptions, duplicate notifications, rider going offline, stale GPS, failed OTP, realtime disconnect with fallback, transaction failures.
- Decide the hosting target (**D-26**) and configure production: environment variables and secrets, production Supabase project, separate from dev, production OTP/SMS and map accounts, domain and HTTPS.
- Apply migrations to production via the documented process. Configure the real business settings (hours, fee, service-area boundary, support contact) with the owner (**D-05/D-06/D-07**).
- Monitoring and error tracking (**D-27**, keep it minimal), backup and restore verification, and a rollback procedure.
- Create the production admin account and rider accounts, and run a soft-launch dry run with the 2 initial riders.
- Finalise README and operations notes.

**Dependencies:** Phases 1–8. All launch-relevant open decisions settled.

**Deliverables:** Test and security reports; load-test results; production deployment; monitoring and backups; operations runbook (short); final docs.

**Acceptance criteria**
- All AC-01…AC-22 pass. All SRS §13 MVP items are demonstrably met.
- No critical or high security findings are open. RLS verified for each role on every table.
- Load test meets the targets in SRS §1.3 / §9.1 without data-integrity failures (no double assignment, no capacity breach, no duplicate orders).
- A backup can be restored. Rollback is documented and rehearsed.
- Production runs over HTTPS with secrets managed outside the repository.

**Tests required:** Full e2e suite on mobile viewports plus manual real-device checks; security test suite; concurrency tests under load; load tests; restore test; production smoke test after deploy.

---

## 3. Open decisions (do not resolve without the owner)

The SRS says these are undecided (SRS §12 and elsewhere), or the SRS needs them to be decided but does not do so. **No code should hard-code an answer.** Use configuration or a thin interface until settled.

| ID | Decision | SRS position | Needed by | Notes |
|---|---|---|---|---|
| D-01 | OTP provider (SMS delivery for Supabase Auth phone OTP) | "To be selected"; pricing to be reviewed before implementation (§4.1) | Before real SMS testing / launch | **Still open, by choice.** Phase 2 is built and tested against Supabase's local test OTP, behind Supabase's provider configuration so the provider stays swappable. Choose the provider before testing real SMS on a hosted project. Affects cost and delivery reliability in India; DLT registration lead time applies, so start early. |
| D-02 | How rider and admin accounts are created and how they sign in; first-admin bootstrap | Only "authenticated accounts" / "assigned account" (FR-AUTH-03/04, §3.2) | Phase 2 | **Decided:** riders sign in by phone OTP with accounts pre-created by an admin; admins sign in with email and password; the first admin is created by a one-off documented developer script. See [decisions.md](./decisions.md). |
| D-03 | Rider notification channel (in-app realtime, web push, SMS, other) | "To be selected" | Phase 5 | Browser PWA limits apply. DB list remains the source of truth. |
| D-04 | Map provider (maps, geocoding/address selection, distance/ETA data) | "To be selected" | Phase 4 (location capture) | Also drives the Phase 7 tracking view and ETA options. |
| D-05 | Exact service-area boundary and its model (centre + radius, polygon, other) | "Approximately 5 km"; boundary to be finalised | Phase 4 (model), launch (values) | The model affects how the check is built. |
| D-06 | Exact opening and closing hours | To be configured | Launch | Dev placeholders are fine until then. |
| D-07 | Delivery fee amount; customer support contact | Admin configurable / to be configured | Launch | Both are stored in `business_settings`. |
| D-08 | Cancellation and rejection reason list | "To be configured" | Phase 4 | Whether it is a fixed list, a configurable list, or free text. |
| D-09 | COD collection confirmation (who confirms, when, whether required before `DELIVERED`, any PIN or proof) | "To be finalized" | Phase 6 | Affects the delivery-confirmation flow. |
| D-10 | Cart storage (browser-only, or server-persisted) | Not specified | Phase 4 | Server recomputation at checkout applies either way. |
| D-11 | Product search approach (simple filter, Postgres text search, other) | Not specified | Phase 3 | The catalog is small; choose the simplest option. |
| D-12 | Money representation | Not specified | Phase 1 | **Decided:** integer paise, `_paise` column suffix. See [decisions.md](./decisions.md). |
| D-13 | Package manager and Node version | Not specified | Phase 1 | **Decided:** npm, Node 22. See [decisions.md](./decisions.md). |
| D-14 | Test tooling (unit/DB/e2e runners, load-test tool) | "Automated tests" only | Phase 1 (unit/e2e), Phase 9 (load) | **Partly decided:** Vitest (unit and DB), Playwright (e2e). **Load-test tool still open** (Phase 9). |
| D-15 | Order-number format | Not specified (column exists, §6.1) | Phase 4 | |
| D-16 | Rider eligibility for an order (all active, online riders? capacity-aware? proximity?) | "Eligible riders" undefined | Phase 5 | Working assumption: active, online, under capacity. |
| D-17 | What a rider may see about an order **before** accepting (item list, approximate area, exact address?) | FR-RIDER-04 vs the rule that riders cannot access unrelated customer location data | Phase 5 | A genuine tension. See A-04. |
| D-18 | Rider background GPS tracking | "Not guaranteed in initial PWA"; evaluate separately | Phase 7 (accept limitation), post-MVP | Whether PWA installation is wanted at all is also undecided. |
| D-19 | GPS staleness threshold and rider update interval | Not specified | Phase 7 | |
| D-20 | ETA calculation method and inputs (fulfilment time assumption, distance source) | Inputs listed in FR-ETA-02; method not specified | Phase 7 | |
| D-21 | Rider-location retention (keep history vs latest only; how long) | Not specified | Phase 7 | Privacy consideration. |
| D-22 | Pending-order expiry deadline ("applicable deadline") | Not specified (FR-RIDER-11, §4.15) | Phase 8 | |
| D-23 | Mechanism for time-based actions (closing-time sweep, expiry): scheduled DB job, scheduled function, or lazy evaluation | Not specified | Phase 8 | Keep the minimum infrastructure that is reliable. |
| D-24 | Status of an order after admin reassignment (stays `ACCEPTED` with a new rider, or returns to `PENDING_ASSIGNMENT`) | Not specified (FR-RIDER-12) | Phase 8 | |
| D-25 | Exact "basic reports" content | "Basic order and operational reporting" | Phase 8 | |
| D-26 | Hosting target ("managed Next.js hosting") and region | Not specified | Phase 9 (earlier if CI/preview deploys are wanted) | |
| D-27 | Monitoring, error-tracking, and backup tooling | "Monitoring and backups" required, tools unspecified | Phase 9 | |
| D-28 | UI language(s) / localisation | Not specified | Phase 3 (before customer-facing copy is written) | |

**Note on the stack:** SRS §7.1 labels the stack "Recommended". This plan adopts Next.js, TypeScript, Tailwind, shadcn/ui, and Supabase (Postgres, Auth, Realtime, Storage) as the **working baseline**, because the SRS builds its security requirements (RLS, Supabase keys) around it. It is not a locked decision for the undecided parts: map provider, OTP provider, notification channel, and hosting.

## 4. SRS ambiguities and working interpretations

These are assumptions that keep the plan moving. Confirm or correct them with the owner. Treat them as provisional.

| ID | Observation | Working interpretation |
|---|---|---|
| A-01 | "Active order" is not formally defined. | Active = `ACCEPTED`, `PICKUP_IN_PROGRESS`, `PICKED_UP`, `OUT_FOR_DELIVERY` (assigned, not yet `DELIVERED` or `CANCELLED`). |
| A-02 | §5.2 lists only `PENDING_ASSIGNMENT → CANCELLED`, but §4.15 says admins handle cancellation at later stages. | `CANCELLED` is reachable from any non-terminal status, by an admin only (customer only from `PENDING_ASSIGNMENT`). |
| A-03 | A rider "rejecting" an order (FR-AREA-03) and the `REJECTED` status share a name. | Rider rejection is a recorded event per rider and does not change order status. `REJECTED` is an order-level outcome (business cannot fulfil, expired, or out-of-hours). |
| A-04 | Riders must "review relevant order details" (FR-RIDER-04) and judge coverage (FR-AREA-03), but must not see unrelated customer location data (§3.2). | Pre-acceptance exposure is limited (see D-17). Full address and phone are exposed only after acceptance. |
| A-05 | The SRS schema (§6) does not list tables for cancellation requests, rider rejections, delivery problem reports, idempotency keys, or delivery sequence. | They are added in the phase that needs them, kept minimal, and documented. |
| A-06 | Max active orders is both a fixed target (5) and a `business_settings` item. | Stored in settings with a default of 5. The hard requirement is that it is enforced atomically. |
| A-07 | FR-TRACK-01 says location is shared "during active delivery operations". | Sharing runs while the rider has at least one active order and their delivery screen is open. |
| A-08 | "Rider can choose the sequence" has no data model. | An advisory ordering on the rider's active orders. It does not restrict which order the rider updates. |
| A-09 | The SRS leaves it unclear whether the rider is notified of new orders only when online. | Only online, active riders are offered orders (FR-RIDER-02/03). |

## 5. Scope guardrails

- Build **only** what the SRS lists. Everything in SRS §2.2 stays out, including online payments, inventory, supplier management, route optimisation, native apps, loyalty programs, and recommendations.
- No microservices, queues, or caches without measured evidence (SRS §7.2).
- No number masking in the MVP (SRS §4.11). `tel:` links only.
- Prefer configuration over code for anything the SRS marks "to be configured".

## 6. Definition of done (every phase)

1. Acceptance criteria for the phase are met.
2. Required tests for the phase pass locally and in CI. Lint and type-check pass.
3. Migrations are versioned, apply cleanly to a fresh database, and RLS has policy tests.
4. No secrets are committed. `.env.example` is current.
5. README, this plan, and the copilot instructions are updated if anything they describe changed.
6. Any open decision that the phase depended on is recorded as settled in the decision log.
