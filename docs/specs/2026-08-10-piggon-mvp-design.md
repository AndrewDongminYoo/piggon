# Piggon MVP Design

## Status

Approved in conversation on 2026-08-10.
This document defines the first shippable version of Piggon.

## Product Context

Piggon is an unofficial fan community and restaurant atlas inspired by the YouTube creator 피자꼰대.
The project is intended as a gift for the creator, but the creator has not reviewed or approved it yet.
Until explicit approval is received, the product must identify itself as unofficial and must not imply an official partnership, endorsement, or ownership of the creator's name, logo, quotations, or channel assets.

The product combines two local references under `../pizza-references`.
It adopts the pizza-box opening and cardboard atmosphere from the box-oriented reference and the responsive two-column layout, strong copy, and neo-brutalist design tokens from the editorial reference.
The references are implementation inputs rather than authoritative sources for restaurant facts.

## Goals

- Let anyone discover the initial restaurant catalog through a synchronized map and list.
- Preserve the relationship between restaurants and 피자꼰대 YouTube videos, including restaurant-specific start timestamps.
- Let Google-authenticated users publicly record which restaurants they have visited.
- Let authenticated users attach one uploaded photo or one public Instagram post URL as lightweight visit evidence.
- Let authenticated visitors optionally publish a rating and review with their visit record.
- Give the creator a single-account admin interface for restaurants, videos, certifications, awards, popup availability, and community moderation.
- Deploy the complete MVP to Vercel with Supabase and Kakao Map as managed services.

## Non-Goals

- Restaurant submissions from community members.
- Comments on reviews or visits.
- Rewards, points, competitive ranking, or automated visit verification.
- Automatic Instagram tag verification, scraping, or embedding.
- Automatic YouTube channel synchronization.
- Multiple administrators or role-management UI.
- Repeat-visit history for the same user and restaurant.
- Multiple uploaded photos per visit.
- Live geolocation, receipt verification, or fraud detection.
- A custom domain as a release requirement.

## Initial Content Scope

The initial catalog contains only the restaurants supplied by the operator in the approved source list.
Each record begins as a draft until its exact location and claimed attributes have been verified.
The supplied names, broad regions, categories, and video URLs are input evidence, but they are not sufficient by themselves to assert exact addresses, coordinates, certification numbers, award details, or current operating status.

### AVPN List

- 볼라레 — 서울 서초구.
- 베라 한남점 — 서울 용산구.
- 피제리아 다 알리 — 대전.
- 빠넬로 — 서울 마포구, with supplied video `https://www.youtube.com/watch?v=M5H0e6o7B2s`.
- 지오네 키친 — 대구.
- 피아노 레스토랑 — 강원 동해.
- 주토피아 — 대구.
- 마리오네 — 서울 성동구.
- 포폴로 피자 — 경기 일산.

The supplied source for the nine-restaurant AVPN list is a Google search URL rather than a direct YouTube URL.
It is `[PARTIAL]` and must be resolved and verified before publication.

### Competition List

- 불칸 — 전북 완주, with supplied video `https://www.youtube.com/watch?v=L17S1Dx28Ss`.
- 피자파쪼 — 서울 관악구 서울대입구역, with supplied video `https://www.youtube.com/watch?v=7JObzRptG20`.

The supplied competition names, years, divisions, and placements remain draft claims until a supporting source URL has been verified and stored with each award.

### Other Featured Restaurants

- 데빌스 바지니코 — 서울 마포구 합정, with supplied video `https://www.youtube.com/watch?v=ZHvHUEZEKGE`.
- 브렛피자 — 서울 마포구 상수동, with supplied video `https://www.youtube.com/watch?v=yqzVi-pRUiE`.
- 멜팅 피자 — 서울 강남구, with supplied video `https://www.youtube.com/watch?v=BglDJb2spOM`.
- 아따 (ATTA) — 서울 용산구 한남동, with supplied video `https://www.youtube.com/watch?v=_UFcjwMjdJM`.
- 오스테리아 현 — 서울 광진구 군자역, with supplied video `https://www.youtube.com/watch?v=i7-TO2kYfqY`.
- 도우큐먼트 — 서울 중구 명동, with supplied video `https://www.youtube.com/watch?v=dlLHEXE4KU0`.
- 이짜 — 서울 성동구 성수동, with supplied video `https://www.youtube.com/watch?v=2lozYHXjAzY`.
- 오르노 — 서울 성동구 성수동, with supplied video `https://www.youtube.com/watch?v=2lozYHXjAzY`.
- FWV — 서울 용산구, with supplied video `https://www.youtube.com/watch?v=2lozYHXjAzY`.
- 로리스피자 — supplied as 수제 화덕피자, with supplied video `https://www.youtube.com/watch?v=p0RJrxzu9Xg`.
- 코스모더케이브 — supplied as an EAT YOUR CRUST popup, with supplied video `https://www.youtube.com/watch?v=JfWOuZh0o0M`.

### Franchise Review

- 피자스쿨 — supplied with an 오지치즈포테이토 피자 review video at `https://www.youtube.com/watch?v=Qpl8EVZtJfg`.

## Recommended Architecture

### Application Stack

- Next.js App Router and TypeScript for the application.
- Tailwind CSS for design tokens and responsive styling.
- Supabase PostgreSQL for relational data.
- Supabase Auth for Google login.
- Supabase Storage for visit photos.
- Kakao Map Web API for map rendering, markers, and admin location selection.
- Vercel for preview and production deployment.

This stack keeps authentication, relational data, and media storage within one backend while preserving the many-to-many restaurant and video relationship.
Firebase was rejected because the relational model is central to this product.
A separately assembled Auth.js, PostgreSQL, and object-storage stack was rejected as unnecessary integration work for the MVP.

### Application Routes

- `/` renders public search, filters, the map, the restaurant list, and the desktop intro.
- `/restaurants/[slug]` renders a shareable restaurant detail page using the same detail component as the map experience.
- `/me` renders the authenticated user's unique visited-restaurant count, visit collection, and reviews.
- `/admin` renders the owner-only administration interface.
- `/auth/callback` completes Google OAuth and returns the user to the route that initiated login.

### Rendering Boundaries

Public restaurant and video data should be server-rendered where it improves initial load and shareability.
The Kakao map, synchronized selection, filters, desktop intro, mobile tabs, upload flow, and other browser-dependent interactions should remain focused client components.
Authentication and authorization decisions must be rechecked on the server for every protected mutation.

## Data Model

### Profiles

`profiles` stores the Supabase user ID, public display name, optional public avatar, creation time, and update time.
Google email addresses are never exposed in public profile queries.
A user must choose or confirm a public display name before publishing the first visit.

### Restaurants

`restaurants` stores a stable ID, slug, Korean name, optional alternate name, description, broad region, full address, Kakao place identifier, latitude, longitude, restaurant kind, publication status, source URL, creation time, update time, and last editor.
Publication status is `draft`, `published`, or `archived`.
Restaurant kind distinguishes a permanent venue, popup, restaurant, and franchise where necessary, but it does not encode certifications, awards, or YouTube appearance.

YouTube appearance is derived from the existence of a published `restaurant_videos` relationship.
It must not be duplicated as an `is_featured` boolean.

### Certifications

`restaurant_certifications` stores the restaurant, certification name, issuer, optional certification number, validity dates, verification source URL, creation time, and update time.
AVPN is represented as a certification rather than as a restaurant category.
Only certifications with a verification source may be published.

### Awards

`restaurant_awards` stores the restaurant, competition name, year, division, placement, verification source URL, creation time, and update time.
Only awards with a verification source may be published.

### Availability

`restaurant_availability_periods` stores the restaurant, start date, end date, availability note, creation time, and update time.
Permanent restaurants may omit explicit periods.
Popup restaurants use one or more periods.
An ended popup remains in the archive and in historical video relationships but is excluded from the default currently visitable map.
Users can reveal it with an `종료된 팝업 포함` filter.

### Videos

`videos` stores a stable ID, YouTube video ID, canonical URL, title, thumbnail URL, optional publication date, metadata-fetch state, creation time, and update time.
An admin creates a video by pasting a YouTube URL.
The server attempts to fetch public metadata, and the admin can correct the title or thumbnail when the fetch fails.

`restaurant_videos` is the many-to-many join between restaurants and videos.
It stores an optional start time in seconds and an optional context note.
One video may link to multiple restaurants, and one restaurant may link to multiple videos.

### Visits

`visits` stores the authenticated user, restaurant, visit date, evidence type, uploaded storage path or Instagram URL, hidden state, creation time, and update time.
The combination of user and restaurant is unique in the MVP.
A repeat submission edits the existing record rather than creating visit history.
The public visit count is the number of unique visible users for the restaurant.

Evidence type is either `photo` or `instagram`.
Instagram evidence is restricted to a valid public Instagram post or reel URL and is displayed as an outbound link only.
No automated verification, scraping, or embedding occurs.

### Reviews

`reviews` stores a one-to-one visit reference, integer rating from one to five, review body, hidden state, creation time, and update time.
A visit may exist without a review.
The review can be created, edited, or removed without deleting the visit record.

## Public Experience

### Desktop Intro

The pizza-box opening runs only at the desktop layout breakpoint and only on the first visit in that browser.
The state is stored locally and is not tied to an account.
The animation lasts approximately one second, includes a skip control, and reveals the map as the box opens.
The header provides a box icon that lets a user replay the intro.
The intro is skipped when the user prefers reduced motion.

### Desktop Atlas

The default desktop surface is a responsive two-column layout.
The map occupies the primary column, and the restaurant list occupies the secondary column.
Search and filters update both surfaces.
Selecting a marker highlights its list item.
Selecting a list item focuses its marker.
The secondary column switches from the list to a restaurant detail panel, with a clear control to return to the list.

### Mobile Atlas

Mobile never plays the pizza-box intro.
The mobile layout provides a sticky search and filter area followed by a `지도 / 목록` segmented control.
Only one view is active at a time so the map retains usable height and page scrolling does not compete with map gestures.
Selecting a marker opens a summary bottom sheet that leads to the full detail view.

### Restaurant Detail

Restaurant detail shows verified availability, address, Kakao map location, verified certifications, verified awards, linked videos and timestamps, unique visitor count, visible visit evidence, and visible reviews.
Sections with no data are omitted.
A logged-out user who selects the visit action is sent through Google login and returned to the same restaurant.

### Profile

`/me` shows the user's public display name, unique visited-restaurant count, visit collection, and authored reviews.
The collection is a personal record rather than a reward system.
There is no leaderboard, level, badge, or competitive mechanic in the MVP.

## Visual System

The approved direction is `Box Atlas`.
It uses a kraft-cardboard background, ink-colored three-pixel borders, tomato red, basil green, warm paper panels, and offset hard shadows.
The display type should feel like a stamped pizza-box label, while body type prioritizes Korean readability.
The exact font files must come from a license-compatible web-font source selected during implementation.
Cardboard grain and box structure should use CSS patterns where practical so the page does not depend on large texture assets.

The design must not reproduce either reference wholesale.
It should reuse the approved interaction ideas and token language while forming a coherent Piggon-specific interface.

## Visit and Review Flow

The restaurant detail exposes a single `나도 다녀왔어요` action.
If necessary, the flow authenticates with Google and returns to the restaurant.
The user confirms a public display name, enters a visit date, selects one photo or one Instagram URL, optionally adds a rating and review, previews the result, and publishes it.

Uploaded images are validated by actual media type and configured size limits rather than filename extension alone.
They are stored in a private Supabase bucket under a user-owned path.
The application generates access only for visible records so hiding a visit also removes normal application access to its image.
An upload failure preserves the visit date, URL, rating, and review text and lets the user retry only the photo step.

An ended popup still accepts a historical visit.
If the visit date does not fall within a known availability period, the UI warns the user but does not block submission because the stored period data may be incomplete.

## Admin Experience

The `/admin` route verifies the signed-in Google email against one server-side environment variable.
No administrator email or service-role key is shipped to the browser.
The environment variable value is configured in local development and Vercel rather than committed to the repository.

### Restaurant Management

The admin can create, edit, publish, archive, and restore restaurant records.
The form supports Kakao place search followed by manual marker adjustment.
The admin manages certifications, awards, availability periods, and their source URLs as structured data.
Missing coordinates, missing source URLs for claims, and expired popup periods are surfaced before publication.

### Video Management

The admin pastes a YouTube URL, reviews the fetched metadata, and links one or more restaurants.
Each relationship may define a start timestamp and context note.
Channel-wide synchronization remains out of scope.

### Community Moderation

The admin can inspect visible and hidden visits and reviews.
The default moderation action hides or restores content rather than deleting user data.
Users retain control over permanent deletion of their own visit, review, and uploaded photo.
The MVP stores creation time, update time, and last editor instead of implementing a separate audit-log subsystem.

## Authorization and Security

- Public users can read published restaurants, published verified attributes, published video links, non-hidden visits, non-hidden reviews, and safe public profile fields.
- Authenticated users can create, edit, and delete only their own visit, review, and storage object.
- The admin guard is checked on the server before every restaurant, video, attribute, publication, or moderation mutation.
- Supabase Row Level Security independently enforces user ownership and public visibility rules.
- Supabase service-role credentials remain server-only.
- Storage policies restrict object paths to the authenticated user's identifier.
- YouTube, Instagram, and verification-source URLs are parsed and validated against allowed HTTPS domains before storage.
- The UI renders user text as text rather than trusted HTML.
- Relaxing an RLS or storage policy is a security-sensitive change and must be called out explicitly during implementation and review.

## Failure Handling

- If Kakao Map fails to load, search, the restaurant list, and restaurant detail remain usable.
- If video metadata lookup fails, the admin can enter or correct public metadata manually.
- If image upload fails, non-image form state is preserved and the upload can be retried.
- If an image cannot be displayed, the visit remains visible with a neutral evidence-unavailable state.
- If a restaurant has no certification, award, video, visit, or review data, the corresponding empty section is omitted.
- Protected actions return a clear unauthenticated, unauthorized, validation, or retryable error state rather than silently failing.

## Accessibility and Responsive Requirements

- Every interactive control is keyboard reachable and has a visible focus state.
- The restaurant list provides full discovery without requiring map interaction.
- Marker selection has a text equivalent in the synchronized list.
- Color is not the only signal for certification, award, availability, or selection state.
- Text and controls meet readable contrast against kraft and paper backgrounds.
- Motion respects `prefers-reduced-motion`.
- Mobile touch targets remain usable without relying on hover.
- Dialogs, drawers, and bottom sheets manage focus and expose appropriate accessible names.

## Verification Strategy

### Automated Checks

- Run `pnpm lint`.
- Add and run focused unit tests for URL parsing, YouTube timestamp parsing, availability-state derivation, unique visit aggregation, and authorization helpers.
- Verify Supabase RLS and storage policies with separate anonymous, normal-user, other-user, and admin cases.
- Run `pnpm build` with the required environment variables configured.

### Manual Product Checks

- Confirm the intro runs once on desktop, can be skipped and replayed, and never runs on mobile or reduced-motion mode.
- Confirm desktop map/list synchronization and mobile map/list switching.
- Confirm map failure leaves list discovery usable.
- Confirm Google login returns to the originating restaurant.
- Confirm photo and Instagram visit flows, optional review creation, edit, and deletion.
- Confirm one user cannot edit another user's visit, review, or photo.
- Confirm the configured admin can manage content and a normal user cannot open or mutate admin surfaces.
- Confirm expired popups are excluded by default and recoverable through the archive filter.
- Confirm each published certification and award exposes a stored verification source.
- Confirm the Vercel production deployment and its Supabase, Google OAuth, and Kakao domain configuration.

## Release Acceptance Criteria

- The approved Box Atlas visual direction is implemented without copying a reference wholesale.
- The desktop and mobile interaction models match the approved responsive behavior.
- Only verified initial records are published, while incomplete records remain drafts.
- Restaurant details distinguish YouTube appearance, certification, awards, and current availability.
- Google-authenticated users can publish and manage one visit per restaurant with one supported evidence type and an optional review.
- Public profiles show unique visited-restaurant counts without reward mechanics.
- The single-account admin can manage the approved content types and moderate visits and reviews.
- The security policies and ownership checks pass their verification cases.
- Lint, focused tests, build, responsive QA, and production deployment checks pass.

## Deferred Work

The next product phase may consider community restaurant submissions, comments, multiple photos, repeat visits, richer public profiles, a community feed, report workflows, channel synchronization, or multiple administrators.
None of these capabilities should be introduced while implementing this MVP unless the design is explicitly revised.
