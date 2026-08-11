# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
pnpm dev                              # Next.js dev server on :3000
pnpm test                             # Vitest once
pnpm test features/visits/schema.test.ts   # single file
pnpm test -t "trims a public display name"  # single test by name
pnpm lint                             # ESLint
pnpm build                            # production build (also type-checks)
pnpm db:start                         # local Supabase stack (needs Docker)
pnpm db:reset                         # reapply migrations + seed
pnpm db:test                          # pgTAP tests in supabase/tests/database
pnpm db:types                         # regenerate lib/database.types.ts
```

Full pre-release gate, env var setup, Google/Kakao provider config, and deployment steps live in `README.md` — do not duplicate them here.

`.trunk/trunk.yaml` configures `trunk fmt` on pre-commit and `trunk check` on pre-push. The hooks are installed through `core.hooksPath` (pointing into trunk's cache), not `.git/hooks` — check there before concluding they are missing. CI (`.github/workflows/`) runs `pnpm test`, `pnpm lint`, `pnpm build`, and a separate pgTAP job — not trunk.

## Architecture

Next.js 16 App Router + Supabase. Three layers, and which one you are in decides which Supabase client you may use.

**Supabase clients (`lib/supabase/`)** — the security boundary:

- `client.ts` — browser, anon/publishable key, RLS applies.
- `server.ts` — RSC/route handlers, cookie-based user session, RLS applies. Default for anything user-scoped.
- `admin.ts` — secret key, **bypasses RLS**. Every caller must first establish the right to bypass: admin pages and actions await `requireAdmin()` (`features/admin/require-admin.ts`); `features/visits/queries.ts` signs evidence URLs only for paths that already passed `isOwnedVisitPhotoPath`; the photo-cleanup driver is background-only. A new `createAdminClient()` call site without such a guard is an RLS bypass. `createAdminFetch` strips a stale `Authorization` header for non-JWT (`sb_secret_…`) keys — leave it in place.
- `proxy.ts` — session refresh, wired through the root `proxy.ts` (Next 16's renamed middleware). It only refreshes cookies; it is not an authorization gate.

Authorization is enforced twice on purpose: `requireUser()` / `requireAdmin()` for routing, and Postgres RLS for the data itself. RLS is the real gate — a change that weakens a policy must be its own reviewed change, never folded into unrelated work.

**Feature modules (`features/<domain>/`)** — restaurants, visits, admin. Same roles everywhere, two naming variants: `visits` uses the flat `queries.ts` / `actions.ts` / `schema.ts`, while `admin` splits per entity (`restaurant-actions.ts` + `restaurant-schema.ts`, `video-actions.ts`, `moderation-actions.ts`) and `restaurants` calls its write module `mutations.ts`. Match the neighbours rather than introducing a third scheme.

- Reads — `import "server-only"`, server client.
- Mutations — `"use server"`: auth guard → zod parse → write → `revalidatePath`. Each declares its own action-state type of the same shape (`status: "idle" | "success" | "error"`, `message`, optional `fieldErrors`) plus an `INITIAL_*` constant, consumed by `useActionState` in the form components. `VisitActionState` adds a `"partial"` status and retry fields for the visit-saved-but-review-failed case.
- Schemas, validators, filters — pure, framework-free, colocated `.test.ts`.
- `components/` — mostly server components; `"use client"` only for maps, forms, and the intro.

Pure-logic-plus-thin-driver is the pattern for anything touching an external system: `features/visits/photo-cleanup.ts` holds the retry/queue logic against an injected driver, `photo-cleanup-server.ts` supplies the Supabase-backed one. Tests exercise the pure half.

**Database (`supabase/`)** — append-only timestamped migrations. `lib/database.types.ts` is generated; regenerate with `pnpm db:types` instead of editing it.

Multi-table writes go through `security invoker` plpgsql RPCs (`save_restaurant_with_attributes`, `upsert_video_with_restaurants`) called with the admin client, so an admin save is atomic and still runs under the caller's rights. Adding a related table means extending the RPC in a new migration, not issuing several client-side writes.

Visit evidence lives in the private `visit-evidence` bucket under `<user_id>/<restaurant_id>/<uuid>.<ext>`; paths are validated in `features/visits/storage.ts`, image types are sniffed from magic bytes rather than trusted from the client, and orphaned objects land in `visit_photo_cleanup_jobs` for retry.

## Conventions

- Env access goes through `lib/env/public.ts` (zod-parsed, safe in client components) and `lib/env/server.ts` (`server-only`). Never read `process.env` directly.
- Dates are Asia/Seoul: the server formats `YYYY-MM-DD` with `Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" })` and passes it down as a prop, so client filtering never uses the visitor's clock.
- Vitest runs in the **node** environment — no jsdom, no testing-library. Components and pages are tested with `renderToStaticMarkup` plus `vi.mock` on their data dependencies (`app/me/page.test.tsx` is the reference).
- User-facing strings and comments explaining product behavior are Korean; identifiers, commit messages, and docs are English.
- Kakao Map failure must degrade to the restaurant list, never hide the catalog (`map-fallback.tsx`).
- New restaurant/video content needs a direct source; the evidence rules and matrix are in `docs/notes/2026-08-10-initial-restaurant-verification.md`. `docs/specs/` holds the MVP design and its explicit non-goals — check it before adding a feature.
