# Piggon MVP Implementation Plan

## Status

Completed. Every task below landed on `feat/piggon-mvp`, from `build: add Supabase and test foundation` through `ci: add Piggon release gates`; the unchecked boxes are a historical record, not remaining work.
Read this plan for the reasoning behind a decision, not as the current state of the code.
The steps below are preserved as written except for renamed identifiers, which are normalized to the names the code uses today — `SUPABASE_SECRET_KEY`, not the `SUPABASE_SERVICE_ROLE_KEY` this plan was drafted against.

The code has since moved past several snippets here:

- `requireAdmin()` additionally requires `app_metadata.provider === "google"` and a confirmed email, extracted as the pure `isAuthorizedGoogleAdmin` in `features/admin/admin-auth.ts`.
- Multi-table admin writes run through the `save_restaurant_with_attributes` and `upsert_video_with_restaurants` RPCs instead of sequential client-side statements.
- Visit dates are derived in `Asia/Seoul`, and failed evidence deletion is queued in `visit_photo_cleanup_jobs` for bounded retry.
- `db:types` pipes the generated file through `trunk fmt`, and CI pins `supabase/setup-cli` to 2.113.0.

> **For agentic workers:** this plan is complete — do not re-execute it. It was originally written for superpowers:subagent-driven-development or superpowers:executing-plans, and steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy the approved Piggon MVP with a responsive Kakao Map restaurant atlas, Google-authenticated visit records and reviews, and a single-owner administration surface.

**Architecture:** Next.js App Router renders public data and protected surfaces through a small data-access layer backed by Supabase PostgreSQL, Auth, and private Storage. Client components own only browser-specific behavior such as the Kakao Map, the desktop pizza-box intro, responsive tabs, and direct authenticated uploads; every mutation revalidates identity and ownership on the server, with RLS as the independent data boundary.

**Tech Stack:** Next.js 16.3.0, React 19.2.8, TypeScript 6.0.3, Tailwind CSS 4.3.3, Supabase PostgreSQL/Auth/Storage, Kakao Map Web API, Zod, Vitest, Trunk, Vercel.

## Global Constraints

- Treat `docs/specs/2026-08-10-piggon-mvp-design.md` as the product contract.
- Keep the product explicitly unofficial until the creator approves official wording and asset use.
- Use only the operator-supplied restaurant list for initial records, and keep unverified claims and locations in `draft` state.
- Derive YouTube appearance from `restaurant_videos`; never add a duplicate feature boolean.
- Keep certifications, awards, and availability periods structured and source-backed.
- Treat `archived` as editorial removal from public access. An ended popup stays `published`, derives `ended` from its availability period, is hidden by the default filter, and remains discoverable when `종료된 팝업 포함` is enabled.
- Allow exactly one visit per user and restaurant, one photo or one Instagram URL, and an optional one-to-one review.
- Keep community submissions, comments, rewards, automatic verification, channel synchronization, multiple administrators, repeat visits, and multiple photos out of scope.
- Play the pizza-box intro only on the desktop layout breakpoint, once per browser, with skip, replay, and reduced-motion handling.
- Use the approved desktop two-column atlas and mobile `지도 / 목록` segmented control.
- Use the local Next.js 16.3.0 guides under `node_modules/next/dist/docs/` as the API source before editing Next.js code.
- Use `proxy.ts`, not the retired `middleware.ts` convention, for Supabase session refresh.
- Use `supabase.auth.getUser()` or `getClaims()` for authorization decisions; never authorize from `getSession()` alone.
- Keep the Supabase service-role key and administrator email server-only.
- Do not add a Kakao React wrapper; the official JavaScript SDK and a focused local adapter are sufficient.
- Do not add a form framework; native forms, Server Actions, `useActionState`, and Zod are sufficient.
- Converse in Korean, but keep code identifiers, technical documentation, and commit messages in English.
- Stage explicit paths and create one conventional commit per task.

## File Structure

- `app/` owns routes, route handlers, metadata, error boundaries, and route-level composition.
- `components/` owns shared visual primitives, authentication controls, the site header, and the desktop intro.
- `features/restaurants/` owns restaurant DTOs, queries, filters, Kakao integration, atlas UI, details, and admin restaurant forms.
- `features/visits/` owns visit/review validation, upload flow, mutations, profile collection, and public review presentation.
- `features/admin/` owns server-only authorization, admin navigation, video linking, and moderation actions.
- `lib/supabase/` owns browser, server, proxy, and service-role clients.
- `lib/env/` owns validated public and server environment access.
- `supabase/migrations/` is the only hand-authored database schema source.
- `lib/database.types.ts` is generated from the applied local migration and is never hand-edited.
- `supabase/tests/database/` owns pgTAP schema and RLS verification.
- `supabase/seed.sql` contains only the approved initial draft data and development fixtures.
- `docs/notes/` may hold source-verification evidence produced during content curation.

---

### Task 1: Add the Supabase, validation, and test foundation

**Files:**

- Modify: `.gitignore`
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Create: `.env.example`
- Create: `vitest.config.ts`
- Create: `lib/env/public.ts`
- Create: `lib/env/server-schema.ts`
- Create: `lib/env/server.ts`
- Create: `lib/env/env.test.ts`

**Interfaces:**

- Produces: `getPublicEnv(): { supabaseUrl: string; supabasePublishableKey: string; kakaoMapAppKey: string }`.
- Produces: `getServerEnv(): { supabaseSecretKey: string; adminGoogleEmail: string }`.
- Produces: package scripts `test`, `test:watch`, `db:start`, `db:reset`, `db:test`, and `db:types`.

- [ ] **Step 1: Write failing environment parsing tests**

```ts
import { describe, expect, it } from "vitest";
import { parsePublicEnv } from "./public";
import { parseServerEnv } from "./server-schema";

describe("environment parsing", () => {
  it("accepts complete public configuration", () => {
    expect(
      parsePublicEnv({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example",
        NEXT_PUBLIC_KAKAO_MAP_APP_KEY: "kakao-javascript-key",
      }),
    ).toEqual({
      supabaseUrl: "https://example.supabase.co",
      supabasePublishableKey: "sb_publishable_example",
      kakaoMapAppKey: "kakao-javascript-key",
    });
  });

  it("rejects an invalid administrator email", () => {
    expect(() =>
      parseServerEnv({
        SUPABASE_SECRET_KEY: "secret-key",
        ADMIN_GOOGLE_EMAIL: "not-an-email",
      }),
    ).toThrow();
  });
});
```

- [ ] **Step 2: Run the tests and confirm the missing modules fail**

Run: `pnpm exec vitest run lib/env/env.test.ts`
Expected: FAIL because Vitest and the environment modules do not exist.

- [ ] **Step 3: Add the minimum dependencies and scripts**

Run: `pnpm add @supabase/ssr @supabase/supabase-js server-only zod`
Run: `pnpm add -D supabase vitest`

Add these scripts to `package.json`:

```json
{
  "test": "vitest run",
  "test:watch": "vitest",
  "db:start": "supabase start",
  "db:reset": "supabase db reset --local",
  "db:test": "supabase test db --local",
  "db:types": "supabase gen types typescript --local > lib/database.types.ts"
}
```

Zod is the shared validation boundary, `@supabase/ssr` and `@supabase/supabase-js` are required for cookie-based Auth and data access, `server-only` prevents secret-bearing modules from entering client bundles, Supabase CLI owns migrations and generated types, and Vitest supplies the focused unit tests required by the spec.

- [ ] **Step 4: Implement explicit environment parsers**

```ts
import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  NEXT_PUBLIC_KAKAO_MAP_APP_KEY: z.string().min(1),
});

export function parsePublicEnv(source: Record<string, string | undefined>) {
  const value = publicEnvSchema.parse(source);
  return {
    supabaseUrl: value.NEXT_PUBLIC_SUPABASE_URL,
    supabasePublishableKey: value.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    kakaoMapAppKey: value.NEXT_PUBLIC_KAKAO_MAP_APP_KEY,
  };
}

export function getPublicEnv() {
  return parsePublicEnv({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_KAKAO_MAP_APP_KEY: process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY,
  });
}
```

Implement the pure `parseServerEnv` function in `lib/env/server-schema.ts` so Vitest can exercise it without importing a server-boundary sentinel.
Implement `lib/env/server.ts` with `import "server-only"`; it passes `SUPABASE_SECRET_KEY` and a normalized lowercase `ADMIN_GOOGLE_EMAIL` into that pure parser.
List all five keys with empty values in `.env.example`; never include real credentials.
Add `!.env.example` immediately after the existing `.env*` rule in `.gitignore` so the template can be reviewed and committed while every real environment file remains ignored.

- [ ] **Step 5: Run focused and repository checks**

Run: `pnpm test -- lib/env/env.test.ts`
Expected: PASS with two tests.
Run: `pnpm install --frozen-lockfile`
Expected: exit 0 with the manifest and lockfile synchronized.
Run: `pnpm lint`
Expected: exit 0.

- [ ] **Step 6: Commit the foundation**

```bash
git add .gitignore package.json pnpm-lock.yaml .env.example vitest.config.ts lib/env/public.ts lib/env/server-schema.ts lib/env/server.ts lib/env/env.test.ts
git commit -m "build: add Supabase and test foundation"
```

### Task 2: Create the database schema, storage policies, and draft seed

**Files:**

- Create: `supabase/config.toml`
- Create: `supabase/migrations/20260810000000_init_piggon.sql`
- Create: `supabase/tests/database/schema.test.sql`
- Create: `supabase/tests/database/rls.test.sql`
- Create: `supabase/seed.sql`
- Generate: `lib/database.types.ts`

**Interfaces:**

- Produces tables: `profiles`, `restaurants`, `restaurant_certifications`, `restaurant_awards`, `restaurant_availability_periods`, `videos`, `restaurant_videos`, `visits`, and `reviews`.
- Produces enums: `publication_status`, `restaurant_kind`, and `visit_evidence_type`.
- Produces private Storage bucket: `visit-evidence`, limited to JPEG, PNG, and WebP files up to 8 MiB.
- Produces the unique constraint `visits(user_id, restaurant_id)` and one-to-one constraint `reviews(visit_id)`.

- [ ] **Step 1: Initialize local Supabase and write failing schema tests**

Run: `pnpm supabase init`

Create `schema.test.sql` with explicit checks:

```sql
begin;
select plan(5);
select has_table('public', 'restaurants', 'restaurants exists');
select has_table('public', 'restaurant_videos', 'restaurant_videos exists');
select has_table('public', 'visits', 'visits exists');
select has_table('public', 'reviews', 'reviews exists');
select col_is_unique('public', 'visits', array['user_id', 'restaurant_id'], 'one visit per user and restaurant');
select * from finish();
rollback;
```

- [ ] **Step 2: Start the local stack and prove the schema test fails**

Run: `pnpm db:start`
Run: `pnpm db:test`
Expected: FAIL because the Piggon tables do not exist.

- [ ] **Step 3: Write the migration with exact relational boundaries**

The migration must create the approved columns and constraints without JSON blobs for certifications, awards, availability periods, or restaurant-video links.

```sql
create type public.publication_status as enum ('draft', 'published', 'archived');
create type public.restaurant_kind as enum ('pizzeria', 'restaurant', 'popup', 'franchise');
create type public.visit_evidence_type as enum ('photo', 'instagram');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 30),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.restaurants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  alternate_name text,
  description text,
  region text not null,
  address text,
  kakao_place_id text,
  latitude double precision,
  longitude double precision,
  kind public.restaurant_kind not null default 'pizzeria',
  status public.publication_status not null default 'draft',
  source_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  check ((latitude is null and longitude is null) or (latitude is not null and longitude is not null))
);

create table public.restaurant_certifications (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null,
  issuer text not null,
  certification_number text,
  valid_from date,
  valid_until date,
  source_url text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.restaurant_awards (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  competition_name text not null,
  award_year integer not null check (award_year > 0),
  division text not null,
  placement text not null,
  source_url text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.restaurant_availability_periods (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  starts_on date not null,
  ends_on date,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on is null or starts_on <= ends_on)
);

create table public.videos (
  id uuid primary key default gen_random_uuid(),
  youtube_video_id text not null unique,
  canonical_url text not null,
  title text not null,
  thumbnail_url text,
  published_at timestamptz,
  metadata_fetch_state text not null default 'pending' check (metadata_fetch_state in ('pending', 'fetched', 'manual', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.restaurant_videos (
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  video_id uuid not null references public.videos(id) on delete cascade,
  start_seconds integer check (start_seconds is null or start_seconds >= 0),
  context_note text,
  primary key (restaurant_id, video_id)
);

create table public.visits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  visited_on date not null,
  evidence_type public.visit_evidence_type not null,
  photo_path text,
  instagram_url text,
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, restaurant_id),
  check ((evidence_type = 'photo' and photo_path is not null and instagram_url is null) or (evidence_type = 'instagram' and instagram_url is not null and photo_path is null))
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null unique references public.visits(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  body text not null check (char_length(body) between 1 and 2000),
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Add `updated_at` triggers, indexes for published restaurants and foreign keys, enable RLS on every public table, allow anonymous reads only for `published` restaurant content and visible community content whose parent restaurant is also `published`, allow authenticated owners to continue reading and deleting their own hidden records, allow authenticated users to mutate only their own profile, visit, review, and Storage path, and leave editorial writes to the service-role client.
Review ownership policies must resolve through the referenced visit, and public review policies must require both the review and its visit to be visible.
Certification, award, availability, video-link, visit, review, and safe-profile reads must not reveal a row through a draft or archived parent restaurant.

- [ ] **Step 4: Add RLS negative and positive cases**

Use pgTAP transactions with `set local role authenticated` and `set local request.jwt.claim.sub` to assert that a user can insert and update their own visit, cannot update another user's visit or review, can still read and delete their own moderated record, anonymous users cannot see drafts, archived restaurants, hidden visits, reviews under hidden visits, or safe profiles that have no visible visit, and public users can see published visible records.

```sql
set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

select lives_ok(
  $$insert into public.visits (user_id, restaurant_id, visited_on, evidence_type, instagram_url)
    values ('11111111-1111-1111-1111-111111111111', current_setting('piggon.restaurant_id')::uuid, current_date, 'instagram', 'https://www.instagram.com/p/example/')$$,
  'owner can create a visit'
);

select results_eq(
  $$update public.visits set visited_on = current_date - 1 where user_id = '22222222-2222-2222-2222-222222222222' returning 1$$,
  $$select 1 where false$$,
  'user cannot update another visit'
);
```

- [ ] **Step 5: Configure private Storage and the approved draft seed**

Configure `visit-evidence` as private with an 8 MiB limit and `image/jpeg`, `image/png`, and `image/webp` MIME types.
Restrict object names to `<auth.uid()>/<restaurant-id>/<uuid>.<extension>` and owner operations through Storage RLS.
Insert all 23 operator-supplied restaurants as `draft` rows with only the supplied name, broad region, kind, and source information.
Insert the supplied direct YouTube URLs into `videos` with `metadata_fetch_state = 'pending'` and create only the restaurant-video relationships explicitly present in the approved list.
Do not invent coordinates, exact addresses, AVPN numbers, award details, or popup dates.

- [ ] **Step 6: Reset, test, and generate types**

Run: `pnpm db:reset`
Expected: migrations and seed apply from an empty local database.
Run: `pnpm db:test`
Expected: all pgTAP schema and policy cases pass.
Run: `pnpm db:types`
Expected: `lib/database.types.ts` is regenerated from the local schema.

- [ ] **Step 7: Commit the database boundary**

```bash
git add supabase/config.toml supabase/migrations/20260810000000_init_piggon.sql supabase/tests/database/schema.test.sql supabase/tests/database/rls.test.sql supabase/seed.sql lib/database.types.ts
git commit -m "feat(data): add Piggon schema and access policies"
```

### Task 3: Add Supabase clients, Google login, and owner authorization

**Files:**

- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`
- Create: `lib/supabase/proxy.ts`
- Create: `lib/supabase/admin.ts`
- Create: `proxy.ts`
- Create: `lib/auth/redirect.ts`
- Create: `lib/auth/redirect.test.ts`
- Create: `features/admin/require-admin.ts`
- Create: `app/auth/callback/route.ts`
- Create: `app/auth/auth-code-error/page.tsx`
- Create: `components/auth/google-sign-in.tsx`
- Create: `components/auth/sign-out-button.tsx`

**Interfaces:**

- Produces: `createClient()` in browser and server variants.
- Produces: `createAdminClient()` guarded by `server-only`.
- Produces: `getSafeNextPath(value: string | null): string`.
- Produces: `requireUser()` and `requireAdmin()` returning a server-confirmed Supabase user.

- [ ] **Step 1: Test safe post-login redirects**

```ts
import { describe, expect, it } from "vitest";
import { getSafeNextPath } from "./redirect";

describe("getSafeNextPath", () => {
  it.each([
    ["/restaurants/marione", "/restaurants/marione"],
    ["https://attacker.example", "/"],
    ["//attacker.example", "/"],
    [null, "/"],
  ])("maps %s safely", (input, expected) => {
    expect(getSafeNextPath(input)).toBe(expected);
  });
});
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run: `pnpm test -- lib/auth/redirect.test.ts`
Expected: FAIL because `getSafeNextPath` does not exist.

- [ ] **Step 3: Implement official SSR client boundaries**

Use `createBrowserClient` for `client.ts`, `createServerClient` with `await cookies()` for `server.ts`, the official cookie-copying response pattern in `lib/supabase/proxy.ts`, and `createClient<Database>` with the service-role key only in `admin.ts`.
Root `proxy.ts` calls `updateSession(request)` and excludes static and image assets with the official matcher.

```ts
import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

- [ ] **Step 4: Implement PKCE callback and login controls**

The Google button calls `signInWithOAuth({ provider: "google", options: { redirectTo } })` with `/auth/callback?next=<safe-relative-path>`.
The callback exchanges the code and redirects using `getSafeNextPath` without copying Google profile metadata into the public profile table.
The visit flow creates or updates the user's public display name explicitly before their first public visit.
The application never stores Google provider access or refresh tokens because no Google API access is required.

- [ ] **Step 5: Implement server-confirmed user and owner checks**

```ts
import "server-only";
import { redirect } from "next/navigation";
import { getServerEnv } from "@/lib/env/server";
import { createClient } from "@/lib/supabase/server";

export async function requireAdmin() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  const adminEmail = getServerEnv().adminGoogleEmail;

  if (error || !data.user) redirect("/?auth=required");
  if (data.user.email?.toLowerCase() !== adminEmail)
    redirect("/?auth=forbidden");
  return data.user;
}
```

Use the same server-confirmed identity pattern for `requireUser()` without the email comparison.

- [ ] **Step 6: Verify and commit Auth**

Run: `pnpm test -- lib/auth/redirect.test.ts`
Expected: PASS.
Run: `pnpm lint`
Expected: exit 0.
Run: `env NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_build_only NEXT_PUBLIC_KAKAO_MAP_APP_KEY=kakao-build-only SUPABASE_SECRET_KEY=secret-build-only ADMIN_GOOGLE_EMAIL=admin@example.com pnpm build`
Expected: exit 0 using only disposable build-time values.

```bash
git add lib/supabase lib/auth features/admin/require-admin.ts proxy.ts app/auth components/auth
git commit -m "feat(auth): add Google login and owner guard"
```

### Task 4: Add restaurant DTOs, validation, filters, and the data-access layer

**Files:**

- Create: `features/restaurants/types.ts`
- Create: `features/restaurants/validators.ts`
- Create: `features/restaurants/validators.test.ts`
- Create: `features/restaurants/filters.ts`
- Create: `features/restaurants/filters.test.ts`
- Create: `features/restaurants/queries.ts`
- Create: `features/restaurants/mutations.ts`

**Interfaces:**

- Produces: `RestaurantSummary`, `RestaurantDetail`, `RestaurantFilter`, `AvailabilityState`, and `ActionState` DTOs containing only safe public fields.
- Produces: `parseYouTubeUrl`, `parseInstagramUrl`, `parseTimestamp`, `getAvailabilityState`, and `filterRestaurants`.
- Produces: `listPublishedRestaurants(filter)` and `getPublishedRestaurantBySlug(slug)`.

- [ ] **Step 1: Write failing validator and filter tests**

```ts
it("parses a YouTube URL and timestamp", () => {
  expect(
    parseYouTubeUrl("https://www.youtube.com/watch?v=2lozYHXjAzY&t=125s"),
  ).toEqual({
    videoId: "2lozYHXjAzY",
    startSeconds: 125,
  });
});

it("rejects non-post Instagram URLs", () => {
  expect(() => parseInstagramUrl("https://instagram.com/example")).toThrow();
});

it("excludes an ended popup by default", () => {
  expect(
    filterRestaurants([endedPopup], { includeEndedPopups: false }),
  ).toEqual([]);
});
```

- [ ] **Step 2: Run the focused tests and confirm missing exports fail**

Run: `pnpm test -- features/restaurants/validators.test.ts features/restaurants/filters.test.ts`
Expected: FAIL because the domain functions do not exist.

- [ ] **Step 3: Implement pure validation and filter functions**

Accept canonical `youtube.com/watch`, `youtu.be`, Instagram `/p/`, and Instagram `/reel/` HTTPS URLs only.
Parse `t=125`, `t=125s`, and `t=2m5s` into seconds.
Compute `current`, `upcoming`, `ended`, or `permanent` availability from the stored periods and an injected current date so tests are deterministic.

- [ ] **Step 4: Implement server-only public queries and DTO mapping**

`queries.ts` imports `server-only`, selects published restaurants with certifications, awards, availability periods, and video joins, and maps database rows into explicit DTOs.
It never returns `updated_by`, Storage paths, Google metadata, or email addresses.
`mutations.ts` defines shared `ActionState = { status: "idle" | "success" | "error"; message: string; fieldErrors?: Record<string, string[]> }` for Server Actions.

- [ ] **Step 5: Verify and commit the domain layer**

Run: `pnpm test -- features/restaurants/validators.test.ts features/restaurants/filters.test.ts`
Expected: PASS.
Run: `pnpm lint`
Expected: exit 0.

```bash
git add features/restaurants/types.ts features/restaurants/validators.ts features/restaurants/validators.test.ts features/restaurants/filters.ts features/restaurants/filters.test.ts features/restaurants/queries.ts features/restaurants/mutations.ts
git commit -m "feat(restaurants): add restaurant domain layer"
```

### Task 5: Build the Box Atlas visual shell and desktop intro

**Files:**

- Modify: `app/layout.tsx`
- Modify: `app/globals.css`
- Create: `components/site-header.tsx`
- Create: `components/pizza-box-intro.tsx`
- Create: `components/ui/stamp-badge.tsx`
- Create: `components/ui/paper-panel.tsx`
- Create: `components/ui/segmented-control.tsx`
- Create: `lib/intro-state.ts`
- Create: `lib/intro-state.test.ts`

**Interfaces:**

- Produces: CSS tokens `--kraft`, `--paper`, `--ink`, `--tomato`, `--basil`, and `--cheese`.
- Produces: `shouldPlayIntro({ isDesktop, prefersReducedMotion, hasSeenIntro }): boolean`.
- Produces: reusable `StampBadge`, `PaperPanel`, and `SegmentedControl` primitives.

- [ ] **Step 1: Write the intro decision test**

```ts
it.each([
  [{ isDesktop: true, prefersReducedMotion: false, hasSeenIntro: false }, true],
  [
    { isDesktop: false, prefersReducedMotion: false, hasSeenIntro: false },
    false,
  ],
  [{ isDesktop: true, prefersReducedMotion: true, hasSeenIntro: false }, false],
  [{ isDesktop: true, prefersReducedMotion: false, hasSeenIntro: true }, false],
])("returns the expected intro decision", (input, expected) => {
  expect(shouldPlayIntro(input)).toBe(expected);
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `pnpm test -- lib/intro-state.test.ts`
Expected: FAIL because `shouldPlayIntro` does not exist.

- [ ] **Step 3: Implement the visual tokens and typography**

Use `Black_Han_Sans` as the display font and `Noto_Sans_KR` as the body font through `next/font/google`, both exposed as CSS variables.
Replace the starter light/dark theme with the approved light kraft system, CSS-only grain, three-pixel ink borders, offset shadows, clear focus rings, and reduced-motion overrides.
Update metadata to identify Piggon as an unofficial pizza atlas.

- [ ] **Step 4: Implement the accessible desktop-only intro**

Use the pure decision function with `matchMedia("(min-width: 1024px)")`, `matchMedia("(prefers-reduced-motion: reduce)")`, and the versioned local key `piggon:intro:v1`.
The intro contains a real skip button, marks the local key only after skip or completion, releases focus when hidden, and exposes a replay callback from the header.

- [ ] **Step 5: Verify responsive and reduced-motion behavior**

Run: `pnpm test -- lib/intro-state.test.ts`
Expected: PASS.
Run: `pnpm lint`
Expected: exit 0.
Manual: verify keyboard skip, replay, 1024-pixel breakpoint behavior, and reduced-motion bypass.

- [ ] **Step 6: Commit the visual shell**

```bash
git add app/layout.tsx app/globals.css components/site-header.tsx components/pizza-box-intro.tsx components/ui lib/intro-state.ts lib/intro-state.test.ts
git commit -m "feat(ui): add Box Atlas visual shell"
```

### Task 6: Build the synchronized Kakao Map and restaurant list

**Files:**

- Modify: `app/page.tsx`
- Create: `features/restaurants/kakao-maps.ts`
- Create: `features/restaurants/kakao-maps.test.ts`
- Create: `features/restaurants/components/atlas-shell.tsx`
- Create: `features/restaurants/components/restaurant-map.tsx`
- Create: `features/restaurants/components/restaurant-list.tsx`
- Create: `features/restaurants/components/restaurant-card.tsx`
- Create: `features/restaurants/components/restaurant-filters.tsx`
- Create: `features/restaurants/components/map-fallback.tsx`
- Create: `types/kakao.maps.d.ts`

**Interfaces:**

- Produces: `loadKakaoMaps(appKey): Promise<typeof window.kakao.maps>`.
- Produces: `AtlasShell({ restaurants })` with synchronized `selectedRestaurantId`, search, filters, and mobile view state.
- Consumes: `RestaurantSummary`, `filterRestaurants`, and `getPublicEnv`.

- [ ] **Step 1: Test one-time Kakao SDK loading and failure reset**

```ts
it("shares one in-flight SDK promise", () => {
  const first = loadKakaoMaps("key");
  const second = loadKakaoMaps("key");
  expect(second).toBe(first);
});
```

The test environment supplies a fake `document.head.append` that invokes the script load callback and a fake `window.kakao.maps.load`.

- [ ] **Step 2: Run the focused test and confirm it fails**

Run: `pnpm test -- features/restaurants/kakao-maps.test.ts`
Expected: FAIL because the loader does not exist.

- [ ] **Step 3: Implement the official SDK adapter**

Load `https://dapi.kakao.com/v2/maps/sdk.js?autoload=false&libraries=services,clusterer&appkey=<encoded-key>` once, resolve only after `kakao.maps.load`, reject on script error, and clear the cached promise after rejection so retry is possible.
Declare only the Kakao interfaces used by the app in `types/kakao.maps.d.ts`.

- [ ] **Step 4: Implement the desktop and mobile atlas state**

Desktop renders `minmax(0, 1fr) 380px`, with map on the left and scrollable list or selected detail on the right.
Mobile renders a sticky search/filter block and the approved `지도 / 목록` segmented control, with one active surface at a time.
Search matches Korean name, alternate name, region, and address.
Filters cover video appearance, AVPN certification, competition award, current availability, and ended-popup inclusion.

- [ ] **Step 5: Synchronize map and list without making the map mandatory**

Marker selection updates `selectedRestaurantId`, list selection pans the map, and every marker has an equivalent list button.
If the SDK or public key fails, `MapFallback` reports the problem while the list remains fully interactive.
Use custom tomato, basil, and ink marker styles without embedding restaurant HTML from untrusted content.

- [ ] **Step 6: Verify and commit the public atlas**

Run: `pnpm test -- features/restaurants/kakao-maps.test.ts features/restaurants/filters.test.ts`
Expected: PASS.
Run: `pnpm lint`
Expected: exit 0.
Manual: verify desktop two-column synchronization, mobile tab switching, keyboard list selection, and map-failure fallback.

```bash
git add app/page.tsx features/restaurants/kakao-maps.ts features/restaurants/kakao-maps.test.ts features/restaurants/components types/kakao.maps.d.ts
git commit -m "feat(atlas): add synchronized Kakao map discovery"
```

### Task 7: Add shareable restaurant details and timestamped videos

**Files:**

- Modify: `next.config.ts`
- Create: `app/restaurants/[slug]/page.tsx`
- Create: `app/restaurants/[slug]/not-found.tsx`
- Create: `features/restaurants/video-links.ts`
- Create: `features/restaurants/video-links.test.ts`
- Create: `features/restaurants/components/restaurant-detail.tsx`
- Create: `features/restaurants/components/video-card.tsx`
- Modify: `features/restaurants/components/atlas-shell.tsx`

**Interfaces:**

- Produces: `buildYouTubeTimestampUrl(videoId: string, startSeconds: number | null): string`.
- Produces: `RestaurantDetail` usable both in the desktop secondary column and the standalone route.
- Consumes: `getPublishedRestaurantBySlug` and `RestaurantDetail` DTO.

- [ ] **Step 1: Test canonical timestamp links**

```ts
it("builds a canonical timestamp URL", () => {
  expect(buildYouTubeTimestampUrl("2lozYHXjAzY", 125)).toBe(
    "https://www.youtube.com/watch?v=2lozYHXjAzY&t=125s",
  );
});
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run: `pnpm test -- features/restaurants/video-links.test.ts`
Expected: FAIL because the builder does not exist.

- [ ] **Step 3: Implement the reusable detail hierarchy**

Render current, upcoming, or ended availability first, followed by address, verified certification badges, verified awards, linked videos, visitor count, visit evidence, and reviews.
Omit empty sections.
Use outbound YouTube links with a visible timestamp label and safe `target="_blank"` attributes.
Configure `next/image` with an HTTPS `remotePatterns` entry limited to `i.ytimg.com` and `/vi/**` as documented by the local Next.js Image guide.
The standalone route returns `notFound()` for a draft, archived record, or unknown slug.

- [ ] **Step 4: Connect atlas selection and shareable navigation**

The desktop secondary column uses the same detail component for the selected restaurant and offers `상세 링크 복사` plus a clear return-to-list action.
Mobile marker selection opens a compact summary sheet that links to `/restaurants/[slug]`.

- [ ] **Step 5: Verify and commit details**

Run: `pnpm test -- features/restaurants/video-links.test.ts`
Expected: PASS.
Run: `pnpm lint`
Expected: exit 0.
Run: `pnpm build`
Expected: exit 0 and the dynamic restaurant route is listed.

```bash
git add next.config.ts app/restaurants features/restaurants/video-links.ts features/restaurants/video-links.test.ts features/restaurants/components/restaurant-detail.tsx features/restaurants/components/video-card.tsx features/restaurants/components/atlas-shell.tsx
git commit -m "feat(restaurants): add details and video links"
```

### Task 8: Add visit evidence, optional reviews, and the personal collection

**Files:**

- Create: `features/visits/schema.ts`
- Create: `features/visits/schema.test.ts`
- Create: `features/visits/actions.ts`
- Create: `features/visits/queries.ts`
- Create: `features/visits/storage.ts`
- Create: `features/visits/components/visit-form.tsx`
- Create: `features/visits/components/visit-card.tsx`
- Create: `features/visits/components/review-list.tsx`
- Create: `app/me/page.tsx`
- Create: `app/me/loading.tsx`
- Modify: `features/restaurants/components/restaurant-detail.tsx`

**Interfaces:**

- Produces: `visitInputSchema` and `VisitActionState`.
- Produces: `profileInputSchema`, `detectImageMediaType(bytes): "image/jpeg" | "image/png" | "image/webp" | null`, and `saveDisplayName`.
- Produces: `createVisitPhotoPath(userId, restaurantId, extension, fileId = crypto.randomUUID())`.
- Produces Server Actions: `upsertVisit`, `deleteVisit`, `upsertReview`, and `deleteReview`.
- Produces: `listUserCollection(userId)` and signed evidence URL mapping for visible photo visits.

- [ ] **Step 1: Write validation and storage-path tests**

```ts
it("accepts one Instagram post as evidence", () => {
  expect(
    visitInputSchema.parse({
      restaurantId: "11111111-1111-1111-1111-111111111111",
      visitedOn: "2026-08-10",
      evidenceType: "instagram",
      instagramUrl: "https://www.instagram.com/p/example/",
      photoPath: null,
      rating: 5,
      reviewBody: "다시 먹고 싶은 피자",
    }).evidenceType,
  ).toBe("instagram");
});

it("builds an owner-scoped photo path", () => {
  expect(
    createVisitPhotoPath("user-id", "restaurant-id", "webp", "file-id"),
  ).toBe("user-id/restaurant-id/file-id.webp");
});

it("detects a PNG from its file signature", () => {
  expect(
    detectImageMediaType(
      Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    ),
  ).toBe("image/png");
});
```

- [ ] **Step 2: Run the focused tests and confirm they fail**

Run: `pnpm test -- features/visits/schema.test.ts`
Expected: FAIL because the visit modules do not exist.

- [ ] **Step 3: Implement direct authenticated upload with server confirmation**

The client checks JPEG, PNG, or WebP file signatures and the 8 MiB limit before upload, uploads to the owner-scoped private bucket through the authenticated browser client, and then submits only the returned Storage path to `upsertVisit`.
The Server Action calls `requireUser()`, revalidates the path prefix against `user.id`, downloads the new private object to validate its actual signature and size again, validates the restaurant is `published`, and upserts on `(user_id, restaurant_id)`.
An ended popup remains eligible because it stays `published`; an editorially archived record is not eligible for a new or edited visit.
If the database mutation fails after a new upload, the client attempts to delete the new object and preserves all non-file form fields.

- [ ] **Step 4: Implement optional one-to-one review mutation and read-your-own-writes**

`upsertVisit` returns the owned visit ID after saving evidence.
When optional rating and body are both present, the form then calls `upsertReview` with that visit ID; if the review write fails, the visit remains saved and the returned state offers a review-only retry without re-uploading the photo.
Rating and body must either both be present or both be absent.
Every mutation re-reads the owned row, returns a shaped `VisitActionState`, and calls `revalidatePath` for the restaurant route and `/me` before returning.
Deletion removes the review and visit transactionally, then removes the owned Storage object.

- [ ] **Step 5: Build the accessible form and personal collection**

Use `useActionState` for field errors and pending state.
Require `saveDisplayName` to validate and upsert a public display name before first publication, never render Google email, and expose clear `사진 업로드` and `Instagram 링크` choices.
`/me` shows the unique visited count, visit collection, and authored reviews with edit and delete actions.
The restaurant detail shows visible visits and reviews and creates short-lived signed photo URLs on the server with `createAdminClient()` only after the public query has confirmed that the visit, parent restaurant, and review visibility predicates pass.
Render those signed URLs directly without passing them through the Next.js image optimizer cache, and include explicit dimensions, aspect-ratio styling, and alternative text.

- [ ] **Step 6: Verify and commit visits and reviews**

Run: `pnpm test -- features/visits/schema.test.ts`
Expected: PASS.
Run: `pnpm db:test`
Expected: visit, review, and Storage ownership cases pass.
Run: `pnpm lint`
Expected: exit 0.
Manual: verify Google return path, photo upload, Instagram link, optional review, update, delete, and cross-user denial.

```bash
git add features/visits app/me features/restaurants/components/restaurant-detail.tsx
git commit -m "feat(visits): add visit evidence and reviews"
```

### Task 9: Add owner-only restaurant, credential, award, and availability management

**Files:**

- Create: `app/admin/layout.tsx`
- Create: `app/admin/page.tsx`
- Create: `app/admin/restaurants/new/page.tsx`
- Create: `app/admin/restaurants/[id]/page.tsx`
- Create: `features/admin/components/admin-nav.tsx`
- Create: `features/admin/components/restaurant-form.tsx`
- Create: `features/admin/restaurant-schema.ts`
- Create: `features/admin/restaurant-schema.test.ts`
- Create: `features/admin/restaurant-actions.ts`
- Create: `features/restaurants/components/kakao-place-picker.tsx`

**Interfaces:**

- Produces: `restaurantAdminSchema` with nested certifications, awards, and availability periods.
- Produces Server Actions: `saveRestaurant`, `publishRestaurant`, `archiveRestaurant`, and `restoreRestaurant`.
- Consumes: `requireAdmin`, `createAdminClient`, and Kakao Places services.

- [ ] **Step 1: Test publication requirements**

```ts
it("rejects publishing a restaurant without coordinates", () => {
  expect(() =>
    restaurantAdminSchema.parse({
      intent: "publish",
      name: "마리오네",
      slug: "marione",
      region: "서울 성동구",
      kind: "pizzeria",
      address: "서울 성동구",
      latitude: null,
      longitude: null,
      certifications: [],
      awards: [],
      availabilityPeriods: [],
    }),
  ).toThrow();
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `pnpm test -- features/admin/restaurant-schema.test.ts`
Expected: FAIL because the admin schema does not exist.

- [ ] **Step 3: Implement fail-closed publication validation**

Drafts require name, slug, region, and kind.
Publishing additionally requires exact address, latitude, longitude, and a restaurant source URL.
Every certification and award requires its own HTTPS source URL.
Popup publication requires at least one valid availability period.

- [ ] **Step 4: Build the server-guarded admin routes and mutations**

`app/admin/layout.tsx` calls `requireAdmin()` before rendering any child.
Every Server Action calls `requireAdmin()` again because route rendering is not a mutation boundary.
Mutations use `createAdminClient()`, set `updated_by`, and return shaped field errors without exposing database rows or secrets.
Archiving any restaurant removes it from public reads; an ended popup that should remain historically discoverable stays `published` and is controlled by its availability period instead.

- [ ] **Step 5: Build Kakao place selection and structured repeatable fields**

Search Kakao Places by keyword, let the admin select a result, copy place ID, address, latitude, and longitude, and let the marker be adjusted before save.
Certification, award, and availability rows use explicit add/remove controls and stable client keys.
The form exposes `초안 저장`, `공개`, `보관`, and `복원` with distinct confirmation text.

- [ ] **Step 6: Verify and commit restaurant administration**

Run: `pnpm test -- features/admin/restaurant-schema.test.ts`
Expected: PASS.
Run: `pnpm lint`
Expected: exit 0.
Manual: verify the configured account can create and publish a complete restaurant, incomplete publication fails, and a normal user cannot render or invoke admin actions.

```bash
git add app/admin features/admin/components features/admin/restaurant-schema.ts features/admin/restaurant-schema.test.ts features/admin/restaurant-actions.ts features/restaurants/components/kakao-place-picker.tsx
git commit -m "feat(admin): add restaurant content management"
```

### Task 10: Add video linking and community moderation

**Files:**

- Create: `app/admin/videos/page.tsx`
- Create: `app/admin/moderation/page.tsx`
- Create: `features/admin/video-schema.ts`
- Create: `features/admin/video-schema.test.ts`
- Create: `features/admin/video-actions.ts`
- Create: `features/admin/moderation-actions.ts`
- Create: `features/admin/components/video-form.tsx`
- Create: `features/admin/components/moderation-table.tsx`
- Create: `app/api/youtube/oembed/route.ts`

**Interfaces:**

- Produces: `videoAdminSchema` containing canonical video ID and restaurant links with optional `startSeconds` and `contextNote`.
- Produces Server Actions: `saveVideoLinks`, `hideVisit`, `restoreVisit`, `hideReview`, and `restoreReview`.
- Produces: owner-only YouTube metadata route returning `{ videoId, title, thumbnailUrl, fetchState }`.

- [ ] **Step 1: Test many-to-many video input**

```ts
it("accepts two restaurants with independent timestamps", () => {
  expect(
    videoAdminSchema.parse({
      youtubeUrl: "https://www.youtube.com/watch?v=2lozYHXjAzY",
      links: [
        {
          restaurantId: "11111111-1111-1111-1111-111111111111",
          startSeconds: 30,
          contextNote: "이짜",
        },
        {
          restaurantId: "22222222-2222-2222-2222-222222222222",
          startSeconds: 420,
          contextNote: "오르노",
        },
      ],
    }).links,
  ).toHaveLength(2);
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `pnpm test -- features/admin/video-schema.test.ts`
Expected: FAIL because the video schema does not exist.

- [ ] **Step 3: Implement guarded public metadata lookup**

The route calls `requireAdmin()`, canonicalizes the YouTube ID, requests `https://www.youtube.com/oembed?url=<canonical-url>&format=json`, validates the response, and returns `fetchState = "failed"` with an empty title and thumbnail when lookup fails.
It never accepts an arbitrary outbound host.

- [ ] **Step 4: Implement transactional video and link writes**

Upsert `videos` by `youtube_video_id`, replace only that video's join rows, and preserve independent timestamps per restaurant.
The form supports fetched metadata review plus manual title and thumbnail correction when fetch state is `failed`.
Both fetched and manually corrected thumbnail URLs must use HTTPS, `i.ytimg.com`, and `/vi/**`; reject arbitrary image hosts rather than widening `next/image` configuration.

- [ ] **Step 5: Implement reversible moderation**

The moderation page lists visible and hidden visits and reviews with restaurant, public display name, created time, evidence type, and hidden state.
Hide and restore actions call `requireAdmin()`, mutate only the boolean state, and revalidate affected restaurant and profile routes.
Do not add administrator deletion.

- [ ] **Step 6: Verify and commit video and moderation workflows**

Run: `pnpm test -- features/admin/video-schema.test.ts`
Expected: PASS.
Run: `pnpm lint`
Expected: exit 0.
Manual: link one video to multiple restaurants, verify timestamped public links, force metadata failure and manual correction, and hide and restore a visit and review.

```bash
git add app/admin/videos app/admin/moderation app/api/youtube features/admin/video-schema.ts features/admin/video-schema.test.ts features/admin/video-actions.ts features/admin/moderation-actions.ts features/admin/components/video-form.tsx features/admin/components/moderation-table.tsx
git commit -m "feat(admin): add video links and moderation"
```

### Task 11: Verify and publish the approved initial restaurant catalog

**Files:**

- Modify: `supabase/seed.sql`
- Create: `docs/notes/2026-08-10-initial-restaurant-verification.md`

**Interfaces:**

- Produces: one evidence row per supplied restaurant containing name, exact address source, Kakao place ID, latitude, longitude, operating status, supplied video source, and attribute source status.
- Produces: verified published seed rows only where every public claim has a source.

- [ ] **Step 1: Create the verification matrix from the 23 approved draft records**

Use these exact columns:

```markdown
| Restaurant | Address source | Kakao place ID | Coordinates | Operating status | Video source | Certification source | Award source | Publish decision |
| ---------- | -------------- | -------------- | ----------- | ---------------- | ------------ | -------------------- | ------------ | ---------------- |
```

Add all 23 names from the approved spec in the same category order.
Mark unavailable facts `[PARTIAL]`, retired businesses `[OUT_OF_SCOPE]` for current map publication, and conflicting names or locations `[UNCERTAIN]` until resolved.

- [ ] **Step 2: Verify exact location and current availability through Kakao place results**

For each restaurant, record the Kakao place ID, exact road address, latitude, longitude, and whether the venue is permanent, currently available popup, ended popup, or no longer verifiable.
Keep a source-verified ended popup `published` with its completed availability period so the default filter hides it and the archive filter can reveal it.
Do not infer a location from district text alone.

- [ ] **Step 3: Verify video, certification, award, and popup claims from direct sources**

Resolve the AVPN nine-restaurant Google search URL to a direct video before using it.
Store the supplied direct YouTube URL for each linked restaurant.
Store a direct AVPN or organizer source for certifications and competition results.
Store a direct operator or venue source for popup dates.
Do not publish a claim whose evidence remains `[PARTIAL]` or `[UNCERTAIN]`.

- [ ] **Step 4: Update the seed without inventing missing facts**

Change only fully verified restaurant rows from `draft` to `published`, add their exact Kakao fields, and insert only source-backed certification, award, availability, video, and join records.
Keep unresolved records as drafts so the admin can complete them after deployment.

- [ ] **Step 5: Reset and review the public catalog**

Run: `pnpm db:reset`
Expected: the verified seed applies cleanly.
Run: `pnpm db:test`
Expected: all schema and policy tests pass.
Manual: compare the public map and details with every `published` decision in the verification matrix and confirm draft rows are absent.

- [ ] **Step 6: Commit source-verified seed data**

```bash
git add supabase/seed.sql docs/notes/2026-08-10-initial-restaurant-verification.md
git commit -m "data(restaurants): add verified initial catalog"
```

### Task 12: Add CI, project documentation, production errors, and Vercel deployment

**Files:**

- Create: `.github/workflows/ci.yml`
- Create: `README.md`
- Create: `app/error.tsx`
- Create: `app/global-error.tsx`
- Create: `app/not-found.tsx`
- Modify: `.env.example`

**Interfaces:**

- Produces: CI gates for frozen install, unit tests, ESLint, production build, local Supabase reset, and pgTAP.
- Produces: project-specific setup, environment, database, validation, and deployment documentation.
- Produces: retryable route and global error states that preserve the unofficial brand language.

- [ ] **Step 1: Add deterministic CI**

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

jobs:
  app:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 11.20.0
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm test
      - run: pnpm lint
      - run: pnpm build
        env:
          NEXT_PUBLIC_SUPABASE_URL: https://example.supabase.co
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: sb_publishable_build_only
          NEXT_PUBLIC_KAKAO_MAP_APP_KEY: kakao-build-only
          SUPABASE_SECRET_KEY: secret-build-only
          ADMIN_GOOGLE_EMAIL: admin@example.com

  database:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
      - run: supabase start
      - run: supabase db reset --local
      - run: supabase test db --local
```

- [ ] **Step 2: Replace starter documentation with project-specific operations**

Document the unofficial project status, exact package scripts, local Supabase prerequisites, Google OAuth configuration, Kakao JavaScript SDK domain registration, all environment variable names, RLS verification, content verification policy, Vercel preview and production deployment, and the current MVP exclusions.
Do not include real keys or the administrator email.

- [ ] **Step 3: Add recoverable production error surfaces**

`app/error.tsx` and `app/global-error.tsx` provide a clear retry control and preserve non-file form state where the owning component can retry.
`app/not-found.tsx` links back to the atlas.
Errors never render raw Supabase, OAuth, Storage, or service-role details.

- [ ] **Step 4: Run the full local gate**

Run: `pnpm install --frozen-lockfile`
Run: `pnpm test`
Run: `pnpm lint`
Run: `pnpm build`
Run: `pnpm db:reset`
Run: `pnpm db:test`
Run: `trunk check .github/workflows/ci.yml README.md app/error.tsx app/global-error.tsx app/not-found.tsx .env.example app components features lib proxy.ts supabase docs/specs/2026-08-10-piggon-mvp-design.md docs/notes/2026-08-10-initial-restaurant-verification.md`
Expected: every command exits 0 with no skipped required gate.

- [ ] **Step 5: Run the responsive and authorization acceptance checklist**

Verify desktop intro once, skip, replay, and reduced motion; mobile intro absence and map/list switching; map/list selection synchronization; map failure fallback; Google return path; visit photo and Instagram flows; optional review create, edit, and delete; unique visit count; ended popup filtering; normal-user admin denial; owner admin access; source visibility for every public certification and award; video many-to-many timestamps; and hidden-content removal.

- [ ] **Step 6: Commit the release gate**

```bash
git add .github/workflows/ci.yml README.md app/error.tsx app/global-error.tsx app/not-found.tsx .env.example
git commit -m "ci: add Piggon release gates"
```

- [ ] **Step 7: Configure managed services without committing secrets**

Create or link the Supabase project, run `pnpm supabase projects list` to confirm the target, run `pnpm supabase db push --dry-run`, review the exact migration set, and then run `pnpm supabase db push`.
Enable Google Auth with only `openid`, email, and profile scopes and configure local, preview, and production redirect allowlists.
Register localhost, Vercel preview, and Vercel production origins for the Kakao JavaScript key.
Configure `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_KAKAO_MAP_APP_KEY`, `SUPABASE_SECRET_KEY`, and `ADMIN_GOOGLE_EMAIL` in Vercel Development, Preview, and Production environments.

- [ ] **Step 8: Deploy preview, verify, and promote production**

Run: `pnpm dlx vercel`
Expected: a preview deployment URL for the current exact commit.
Run the acceptance checklist on that preview.
Run: `pnpm dlx vercel --prod`
Expected: a production deployment URL.
Verify the production URL, Google callback, Kakao domain, admin account, one published restaurant detail, one visit flow, and Vercel deployment status before reporting completion.
