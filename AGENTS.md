# Piggon Contributor Guide

## Product scope

Piggon is an unofficial Pizza Ggondae restaurant atlas built with Next.js 16, React 19, TypeScript, Supabase, and the Kakao Map Web SDK.
Keep the MVP focused on source-verified restaurants, map/list browsing, authenticated visit proofs, optional reviews, and owner-only administration.
Do not add rewards, tips, comments, automated visit verification, extra login providers, or general community feeds without explicit approval.

## Working conventions

- Speak to the operator in Korean.
- Keep code identifiers, commit messages, and technical documentation in English unless Korean copy is user-facing.
- Make small, scoped changes that follow the nearest existing pattern.
- Do not add dependencies when the platform, React, Next.js, or existing utilities can satisfy the requirement.
- Preserve public routes and schemas unless the request explicitly changes them.
- Keep `docs/notes/` for evidence and working notes, `docs/plans/` for implementation plans, and `docs/specs/` for durable specifications.

## Next.js and frontend

- This repository uses Next.js 16. Read the relevant guide under `node_modules/next/dist/docs/` before changing Next.js APIs, routing, caching, or rendering behavior.
- Prefer Server Components for data access and Client Components only for browser interaction or local state.
- Treat query parameters as URL state. Use the Page `searchParams` prop for server-side data filtering and `useSearchParams` only for already-loaded client-side data.
- Keep browser interactions keyboard-accessible, preserve visible focus, provide form errors with field associations, and announce asynchronous feedback with the appropriate live region.
- Test responsive changes at desktop and mobile breakpoints. Respect the existing `prefers-reduced-motion` behavior.

## Supabase, privacy, and content

- Never expose `SUPABASE_SECRET_KEY`, administrator identity, private Instagram data, real credentials, or production user data in source, fixtures, logs, screenshots, or pull requests.
- Do not weaken RLS, Storage policies, or owner-only checks without explicitly calling out the security impact and adding policy coverage.
- Changes to visit evidence must preserve the same invariant for server actions and direct REST writes. When SQL cannot express a rule, store a policy-consumable fact bound to the exact object version and test both write paths.
- Use server-side operations for administrator and sensitive-data access.
- Verify restaurant address, coordinates, and Kakao place ID with Kakao sources.
- Verify Pizza Ggondae videos with their canonical YouTube URL and resolved channel author.
- Verify AVPN claims with direct AVPN pages, competition awards with organizer results, and popup dates with dated operator or venue sources.
- Publish a restaurant only with supported public fields. Keep unsupported claims out of the database rather than inferring them from secondary mentions.

## Validation

- Run `pnpm lint`, `pnpm test`, and `pnpm build` after application changes.
- Run `pnpm db:reset` and `pnpm db:test` for migration, seed, RLS, Storage policy, or SQL changes.
- Run `pnpm db:types` after a local database schema change; do not hand-edit generated database types.
- If a required check cannot run, state the exact blocker and the manual verification still needed.

## Git and delivery

- Inspect the complete diff before staging. Keep unrelated or author-unknown edits out of commits.
- Use conventional commits grouped by concern. Include each test with the production change it verifies.
- Before pushing, verify the branch, remote state, staged contents, and applicable checks.
- Do not push, create pull requests, deploy, change remote Supabase configuration, or run remote migrations unless the operator explicitly requests that action.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
