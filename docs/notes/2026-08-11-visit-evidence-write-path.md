# Visit evidence write path

Decision record from the PR #1 review rounds, 2026-08-11.
Written because the question below was asked twice by reviewers and will be asked again: the answer is not visible from the code, only the consequences are.

## The question

`public.visits` has two writers: the browser through PostgREST with the user's own session, and the server through `upsertVisit`.
Anything the server enforces in application code has to be re-expressed as SQL for the REST path, and each re-expression turned out slightly weaker than the thing it was standing in for:

| Server enforces                       | First SQL expression      | What that missed                       |
| ------------------------------------- | ------------------------- | -------------------------------------- |
| the path belongs to this user         | table check constraint    | no object need exist                   |
| an object was uploaded                | existence check in policy | the bytes need not be an image         |
| the bytes decode as the claimed image | validation record         | the record was not pinned to the bytes |

Each gap was found, fixed, and produced the next one.

## Decision

**Keep both writers.**
Rejected: revoking `insert`/`update` on `visits` from `authenticated` and writing only through the server with the service-role client.

That alternative would collapse the whole class in one change — no REST path means nothing to re-express.
It was rejected because the design contract in `docs/specs/2026-08-10-piggon-mvp-design.md` states that Row Level Security independently enforces user ownership, and moving writes behind the server makes write-side ownership an application-code property with no second opinion.
Trading a checked invariant for a smaller attack surface is a real trade, not a free win.

Decided by the repo owner, 2026-08-11.

## What this commits us to

- A new server-side rule about visit evidence is not finished until it also holds for a direct REST write. If it cannot be expressed in SQL, that is a reason to reconsider the rule, not to skip the expression.
- Where SQL genuinely cannot express the rule — RLS cannot decode an image — the server records a fact the policy can require, and the record is bound to the exact object version it describes. `visit_evidence_validations` is the worked example.
- Predicates evaluated inside policies are `volatile` and take `public.lock_visit_evidence(owner)` before reading. A `stable` one answers from the statement's pre-lock snapshot, which is how a validated version and a replaced object once both looked current in the same statement.

## Related

- `supabase/migrations/20260811080000_require_uploaded_visit_evidence.sql` — an object must exist.
- `supabase/migrations/20260811140000_require_validated_visit_evidence.sql` — the server's decode result is required.
- `supabase/migrations/20260811150000_pin_validated_evidence_version.sql` — that result is pinned to the bytes inspected.
- `features/visits/image-decode-server.ts` — the decode itself, using `sharp`, added deliberately rather than approximating with more structural checks.
