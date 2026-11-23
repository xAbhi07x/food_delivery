# Decision Log

Technical decisions made while building the project. Product and business decisions that the
SRS leaves open are tracked in [implementation-plan.md](./implementation-plan.md#3-open-decisions-do-not-resolve-without-the-owner).
IDs (D-xx) match that list. Add new entries as decisions are made. Do not rewrite old ones;
supersede them.

## Phase 1 decisions

### D-12 — Money representation (decided)

**Decision:** Store and compute all money as **integer paise** (1 ₹ = 100 paise), in columns
named with a `_paise` suffix (for example `base_price_paise`). Never use floating point.
Convert to rupees only at the UI edge.

**Why:** supabase-js returns Postgres `numeric` as a JavaScript `number` (a float), which risks
rounding errors in totals. Integers are exact in both Postgres and JavaScript.

**Consequence:** The SRS §6 table sketch uses names like `base_price` and `total_amount`. Those
are a proposal; actual columns will use the `_paise` suffix. No online payments or fractional
paise are in scope.

### D-13 — Package manager and Node version (decided)

**Decision:** **npm**, with **Node.js 22** (pinned in `.nvmrc`; `engines` requires `>=22`).
The lockfile `package-lock.json` is committed. Use `npm ci` in CI.

**Why:** Already installed with Node, no extra tooling for contributors, and nothing in the
project needs a workspace-aware manager.

### D-14 — Test tooling (partly decided)

| Level               | Tool                                            | Notes                                                                                                        |
| ------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Unit                | **Vitest** (`unit` project)                     | `src/**/*.test.ts` and `tests/unit/**`                                                                       |
| Database            | **Vitest** (`db` project) with `pg`             | `tests/db/**`. Runs against the real local Supabase Postgres. Parallel connections allow concurrency tests.  |
| End-to-end          | **Playwright**, Chromium, Pixel 7 mobile device | `tests/e2e/**`. Mobile-first per SRS §9.3.                                                                   |
| Load / peak testing | **Still open**                                  | Needed in Phase 9. Not chosen yet.                                                                           |

**Why:** One runner (Vitest) for unit and DB tests keeps everything in TypeScript. pgTAP was
not chosen because it cannot easily drive concurrent transactions, which Phase 5 requires.

### Other Phase 1 decisions

- **Stack versions:** Next.js 16 (App Router, Turbopack), React 19, TypeScript strict, Tailwind
  CSS 4, shadcn/ui (`base-nova` style, built on Base UI), ESLint 9, Prettier 3, Vitest 5,
  Playwright, Supabase CLI 3 (as an npm dev dependency, so no global install is needed).
- **Cache Components disabled.** The Next.js scaffold enables `cacheComponents` and
  `partialPrefetching` by default. They add caching and streaming constraints this app does not
  need, so they are switched off in `next.config.ts`. Revisit only with evidence of a need.
- **Supabase key naming.** The environment uses the current Supabase names:
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (browser-safe) and `SUPABASE_SECRET_KEY`
  (server-only, bypasses RLS). The SRS says "privileged keys must never be exposed to the
  browser" (SRS §8); the secret key is that key. Legacy `anon` / `service_role` keys are not used.
- **Environment validation.** `zod` schemas in `src/lib/env/schema.ts`. Public and server
  variables are validated separately. `src/instrumentation.ts` validates at server start, so
  a misconfigured server exits immediately. Error messages list variable names, never values.
  Empty strings count as unset.
- **Secret leakage checks.** (1) Unit tests in `tests/unit/secret-separation.test.ts` check naming
  rules and that `src/lib/env/server.ts` is `server-only`. (2) `npm run check:bundle` scans the
  built `.next/static` output for privileged variable names and (if set) their values.
- **Local Supabase ports use the 143xx range** (API `14321`, DB `14322`, Studio `14323`, and so on)
  instead of Supabase's default 543xx. On the primary development machine Windows reserves
  ports 54151–54850, so the defaults fail to bind. Ports are set in `supabase/config.toml`.
  If another developer's machine reserves the 143xx range, change the ports in `config.toml`,
  `.env.example` and the default URL in `tests/db/migrations.test.ts` together.
- **Baseline migration is intentionally a no-op** (`select 1;`). The DB test checks that every
  migration file is recorded as applied, which proves the workflow without inventing schema.
- **No domain folders created ahead of need.** `src/modules/` holds only a README listing planned
  modules. Each is created in the phase that needs it.
- **No Supabase client code yet.** `@supabase/supabase-js` and `@supabase/ssr` are added in
  Phase 2, when authentication needs them.
- **`.gitattributes`** forces LF line endings so Prettier checks behave the same on Windows
  and in CI.
- **Documentation location.** All project documentation lives in `docs/` (the SRS was moved
  from `documents/`).
- **`AGENTS.md`** was generated by the Next.js scaffold. It tells AI tools to read the version-
  matched docs in `node_modules/next/dist/docs/` before writing Next.js code. It is kept.

## Phase 2 decisions

### D-01 — OTP provider (deferred; build against local test OTP)

**Decision:** Do not choose an SMS provider yet. Phase 2 is built and tested using Supabase's
local test OTP numbers (`[auth.sms.test_otp]` in `supabase/config.toml`). The provider is chosen
before real SMS is tested on a hosted project, and in any case before launch.

**Why:** The provider only affects real SMS delivery, cost and reliability. It does not change how
login logic is built. This avoids locking a commercial choice early.

**Consequences:** Keep provider-specific details out of application code (configuration only). Start
any India-specific SMS registration (such as DLT) well before launch, since lead time can be days.
D-01 stays listed as open in the implementation plan.

### D-02 — Rider and admin sign-in (decided)

- **Riders:** sign in with **phone OTP**, the same mechanism as customers. A rider account is
  **pre-created by an admin**. The rider role can never be self-assigned through signup.
- **Admins:** sign in with **email and password**.
- **First admin:** created by a **one-off, documented developer script**. The app never creates
  its own first admin.

**Why:** Riders already have phones, so one OTP mechanism keeps things simple. Pre-creating rider
accounts satisfies "assigned account" (SRS §3.2) and prevents self-promotion. A password for the
rarely-used admin account avoids SMS dependence for the most privileged role.

**Consequences:** The admin sign-in screen differs from the customer and rider one. Rider
creation by an admin must be possible early enough to test Phase 5; a minimal path is planned
for Phase 5 and the full rider management UI for Phase 8. Password policy and admin account
recovery are not specified by the SRS and should be settled when admin sign-in is built.

### Other Phase 2 decisions

- **All sign-in goes through server actions.** No Supabase client runs in the browser yet; one is added
  when Realtime needs it (Phase 5 or 7). The publishable key is therefore only used on the server for now.
- **Guards live in each protected page, not in layouts or the proxy.** `requireRole()` (in
  `src/modules/auth/current-user.ts`) is called at the top of every protected page and must be called
  by every protected server action and data function added later. Layouts do not re-run on every
  navigation, and the proxy is not an authorisation boundary. The proxy (`src/proxy.ts`) only refreshes
  an expiring session, and skips requests that carry no session cookie.
- **Identity is verified, the role comes from the database.** `getCurrentUser()` calls `auth.getUser()`
  (validated with the Auth server, not just read from the cookie) and then reads `profiles.role`. A user
  without a valid profile is treated as signed out (fails closed).
- **Three sign-in portals.** `/login` (customers; may create an account), `/rider/login` (no account
  creation), `/admin/login` (email and password). After verification the account's role must match the
  portal, otherwise the new session is ended. The rider portal looks the same whether or not a number is
  registered (no account enumeration), and the admin form gives one generic error for every failure.
- **Phone numbers are Indian mobiles only** (`+91`, 10 digits starting 6 to 9), stored as E.164. The SRS
  asks for a "valid mobile number" without defining the format, so this is an assumption. The rule lives in
  `src/modules/auth/phone.ts` and is duplicated in `scripts/lib/provision.mjs` (keep them in sync).
- **Admin password policy:** at least 12 characters with upper case, lower case and a digit, enforced by
  Supabase Auth (`supabase/config.toml`). The SRS sets none.
- **OTP limits:** one code per number per minute (`[auth.sms] max_frequency = "60s"`). Per-IP limits are
  Supabase's defaults. CAPTCHA is not enabled (available later if abuse appears).
- **Local SMS setup.** The CLI refuses to enable phone login without a provider, so Twilio is enabled
  locally with fake placeholder credentials. Numbers `919999900001` to `919999900012` accept the code
  `123456` and never reach a provider. Any other number fails with an SMS delivery error, which the
  app shows as a clear message. This does not choose Twilio (D-01 stays open).
- **Phone number changes are not supported.** A profile's phone is set at signup. Changing a rider's or
  customer's number is a later, deliberate feature.
- **Profile access:** a user reads only their own profile; an admin reads all profiles; nobody can insert
  or delete profiles through the API; users can update only `full_name`. Roles change only with the
  secret key (the provisioning scripts).
- **Provisioning.** `npm run user:create-admin` and `npm run user:create-rider` use the secret key, refuse
  to touch a non-local project without typed confirmation, and read the admin password from a hidden
  prompt (or `ADMIN_PASSWORD` for non-interactive use). They share `scripts/lib/provision.mjs` with the tests.
- **Test layers.** DB tests run as `anon`/`authenticated` inside rolled-back transactions; integration
  tests call the real Auth API with test numbers; e2e tests drive the UI. Each test uses its own phone
  number because of the one-code-per-minute limit.
- **CI.** Database, integration and e2e tests share one job so Supabase starts once; the fast checks stay
  in a separate job. The local keys are read from `supabase status` and the secret is masked.

### Known gap: email self-registration

Email sign-up must stay enabled because admins sign in with email, and Supabase cannot separate
phone sign-up from email sign-up. Anyone can therefore register an email-only account through the public API.
That account is a `CUSTOMER` with no phone and cannot become anything else without the secret key
(tested in `tests/integration/auth.test.ts`). Revisit before launch: a `before_user_created` hook or CAPTCHA.

### Launch settings for the hosted Supabase project (manual, none done yet)

`supabase/config.toml` only configures the **local** stack. When the hosted project is created, set these
in the Supabase dashboard (or via CLI config push) and re-verify:

- Real SMS provider and sender registration (D-01; India DLT lead time applies).
- Password policy: 12+ characters, upper, lower, digit.
- Rate limits: one code per number per minute. The default project-wide SMS limit (30 per hour locally)
  is far too low for about 500 orders a day, so raise it deliberately.
- Site URL and redirect URLs set to the production domain.
- Never configure test OTP numbers on the hosted project.
- Decide on CAPTCHA and the email self-registration gap above.
- Decide on session timeouts (the local default access token lasts 1 hour and is refreshed).

## Known issues

- **`npm audit` reports 4 moderate findings** (a `minimatch` denial-of-service advisory reached through
  `shadcn` → `ts-morph`). The `shadcn` package is the component CLI that `shadcn init` added; its
  vulnerable path is CLI tooling, not request handling in the app. The only offered fix
  (`npm audit fix --force`) downgrades shadcn to 1.0.0, so it was not applied. Re-check after
  shadcn releases an update. Re-run `npm audit` before launch (Phase 9).

## Still open after Phase 1

- D-14 load-test tool (Phase 9).
- D-26 hosting target and region (Phase 9, or earlier if preview deployments are wanted).
- All other open decisions in the implementation plan.
