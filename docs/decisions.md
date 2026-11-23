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
