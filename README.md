# Piggon

Piggon is an unofficial fan-made restaurant atlas for the YouTube creator Pizza Ggondae.
It combines a responsive Kakao map and restaurant list with Google-authenticated visit proofs, optional reviews, and an owner-only administration area.
This project is not operated, endorsed, or sponsored by Pizza Ggondae, YouTube, Kakao, Google, Supabase, or any listed restaurant.

## MVP scope

- Browse a source-verified restaurant catalog in synchronized map and list views.
- Filter by Pizza Ggondae video, AVPN certification, award, and popup availability.
- Sign in with Google before creating a visit proof or review.
- Prove one visit per account and restaurant with either an uploaded image or an Instagram post URL.
- Create, edit, or delete the optional review attached to that visit.
- Let the configured owner manage restaurants, video links, and reversible visit or review moderation.
- Show the pizza-box intro on desktop only, with skip, replay, and reduced-motion behavior.

Restaurant tips, comments, rewards, automatic visit verification, additional login providers, and general-purpose community feeds are intentionally outside the current MVP.

## Requirements

- Node.js 24
- pnpm 11.20.0
- A Docker-compatible runtime for the local Supabase stack
- A Kakao Developers app with Kakao Map enabled
- A Google OAuth web client for login testing

The local Supabase stack is development-only and requires a running Docker-compatible runtime, as described in the [Supabase local development guide](https://supabase.com/docs/guides/local-development/cli-workflows).

## Local setup

Install the locked dependencies.

```bash
pnpm install --frozen-lockfile
```

Copy the environment variable template and fill it with local values.
Do not commit the resulting `.env.local` file.

```bash
cp .env.example .env.local
```

Start Supabase, inspect the local URLs and keys printed by the CLI, and reset the database from migrations and the verified seed.

```bash
pnpm db:start
pnpm db:reset
```

Start Next.js at the default local origin expected by `supabase/config.toml`.

```bash
pnpm dev
```

Open `http://localhost:3000`.

## Environment variables

| Variable                               | Exposure    | Purpose                                                                                            |
| -------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Browser     | Supabase project API URL.                                                                          |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser     | Supabase publishable key used by browser and SSR clients.                                          |
| `NEXT_PUBLIC_KAKAO_MAP_APP_KEY`        | Browser     | Kakao JavaScript key for the Map Web SDK.                                                          |
| `SUPABASE_SECRET_KEY`                  | Server only | Supabase secret key used by owner-only administration operations. Never expose it to browser code. |
| `ADMIN_GOOGLE_EMAIL`                   | Server only | The single Google account allowed to access `/admin`; comparison is case-insensitive.              |

Configure all five variables separately in Vercel Development, Preview, and Production environments.
Vercel applies environment changes only to new deployments, so redeploy after changing a value; see the [Vercel environment variable guide](https://vercel.com/docs/environment-variables).

## Google OAuth

Piggon requests only the `openid`, email, and profile scopes required by Supabase Auth.
The [Supabase Google login guide](https://supabase.com/docs/guides/auth/social-login/auth-google) documents the same minimal scope set and provider callback setup.

1. In Google Auth Platform, create a Web application OAuth client.
2. Add `http://localhost:3000` and the intended preview and production origins under Authorized JavaScript origins.
3. Add the callback shown by the Supabase Google provider page under Authorized redirect URIs.
4. For a locally configured Google provider, the callback is `http://127.0.0.1:54321/auth/v1/callback`, matching the `[api] port` in `supabase/config.toml`.
5. Enable Google in Supabase Authentication providers and store the client ID and secret there.
6. In Supabase URL Configuration, set the production origin as Site URL and allow `http://localhost:3000/**`, the Vercel preview pattern, and the exact production `/auth/callback` URL.

Supabase recommends `https://*-<team-or-account-slug>.vercel.app/**` for Vercel previews and an exact production redirect path; confirm the final pattern against the [Supabase redirect URL guide](https://supabase.com/docs/guides/auth/redirect-urls).
The application validates the `next` parameter before redirecting after login, and failed exchanges return a generic error page instead of provider details.

## Kakao Map

1. Create or select a Kakao Developers app.
2. Enable Kakao Map under Kakao Map usage settings.
3. Use a JavaScript key, not a REST API key, for `NEXT_PUBLIC_KAKAO_MAP_APP_KEY`.
4. Register `http://localhost:3000`, the stable Vercel preview origin used for acceptance testing, and the production origin under the JavaScript key's JavaScript SDK domains.

The Map Web SDK requires an enabled Kakao Map product and a registered JavaScript SDK domain for the JavaScript key; see the [Kakao Map setup guide](https://developers.kakao.com/docs/en/kakaomap/common) and [Kakao app settings](https://developers.kakao.com/docs/en/app-setting/app).
If the SDK fails, Piggon keeps the restaurant list available instead of hiding the catalog.

## Database and RLS

Migrations, Storage bucket policy, and seed data live under `supabase/`.
The seed publishes only claims with direct evidence and keeps unresolved records as drafts; the current evidence matrix is in [initial restaurant verification](docs/notes/2026-08-10-initial-restaurant-verification.md).

Reset the local database and run all pgTAP schema and policy tests.

```bash
pnpm db:reset
pnpm db:test
```

The RLS tests cover anonymous published-only reads, visit ownership, review ownership, private upload paths, hidden-content removal, and service-role-only video administration.
Any change that weakens an RLS policy must be reviewed explicitly and must not be hidden inside an unrelated change.

## Commands

| Command           | Purpose                                                                   |
| ----------------- | ------------------------------------------------------------------------- |
| `pnpm dev`        | Start the Next.js development server.                                     |
| `pnpm build`      | Create the production Next.js build.                                      |
| `pnpm start`      | Serve the completed production build.                                     |
| `pnpm lint`       | Run ESLint.                                                               |
| `pnpm test`       | Run Vitest once.                                                          |
| `pnpm test:watch` | Run Vitest in watch mode.                                                 |
| `pnpm db:start`   | Start the local Supabase stack.                                           |
| `pnpm db:reset`   | Recreate the local database from migrations and seed data.                |
| `pnpm db:test`    | Run local pgTAP tests.                                                    |
| `pnpm db:types`   | Regenerate local Supabase TypeScript types and format the generated file. |

## CI

GitHub Actions runs two independent jobs on pull requests and pushes to `main`.
The app job performs a frozen install, Vitest, ESLint, and a production build using only the four browser-exposed or placeholder values checked into the workflow; `SUPABASE_SECRET_KEY` is never supplied because no build-time code path reads it.
The database job starts a local Supabase stack, reapplies migrations and seed data, and runs pgTAP.

Before a release, run the same complete local gate.

```bash
pnpm install --frozen-lockfile
pnpm test
pnpm lint
pnpm build
pnpm db:reset
pnpm db:test
```

## Managed Supabase deployment

Do not run a remote migration until the CLI target and dry-run output have been reviewed.

```bash
pnpm supabase projects list
pnpm supabase link --project-ref <project-ref>
pnpm supabase db push --dry-run
pnpm supabase db push
```

After the push, verify Authentication URL Configuration, the Google provider, the private `visit-evidence` bucket, RLS policies, and the published restaurant count in the linked project.

## Vercel deployment

Link the repository to the intended personal-account Vercel project and configure all five environment variables before deploying.
Use the preview environment for the complete acceptance checklist before touching the production domain.

```bash
pnpm dlx vercel
pnpm dlx vercel inspect <preview-url> --wait
pnpm dlx vercel --prod
pnpm dlx vercel inspect <production-url> --wait
```

Running `vercel` without `--prod` creates a Preview deployment, while `--prod` assigns a successful deployment to the production domain; see the [Vercel CLI deployment guide](https://vercel.com/docs/cli/deploy).
Verify the Google callback, Kakao domain registration, owner-only admin access, one restaurant detail, one visit flow, and deployment logs in both Preview and Production before declaring the release complete.

## Content verification

- Use Kakao place results for the exact road address, place ID, latitude, longitude, and current listing status.
- Use the YouTube canonical URL and resolved channel author before a video participates in the Pizza Ggondae filter.
- Use direct AVPN restaurant pages for certification records.
- Use organizer results for awards and dated operator or venue sources for popup periods.
- Mark incomplete claims `[PARTIAL]`, conflicts `[UNCERTAIN]`, and source-verified retired venues `[OUT_OF_SCOPE]` in the evidence note.
- Publish the restaurant separately when its public fields are verified, but omit any unsupported video, certification, award, or availability claim.

## Privacy and moderation

Visit uploads are private and are served through short-lived signed URLs only to their owner and the configured administrator.
The server validates image type, size, and user-scoped Storage paths.
Moderation hides and restores visits or reviews without deleting the underlying record.
Do not place real credentials, administrator email addresses, private Instagram content, or production user data in source control, fixtures, screenshots, or issue reports.
