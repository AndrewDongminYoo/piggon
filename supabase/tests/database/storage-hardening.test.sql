begin;

select plan(30);

select has_function(
  'public',
  'current_user_unreferenced_evidence_count',
  'visit evidence quota helper exists'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.current_user_unreferenced_evidence_count()',
    'execute'
  ),
  'anonymous users cannot execute the quota helper'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.current_user_unreferenced_evidence_count()',
    'execute'
  ),
  'authenticated uploads can evaluate their quota'
);

select has_table(
  'public',
  'visit_photo_cleanup_jobs',
  'failed photo cleanups have a retry queue'
);

select ok(
  not has_table_privilege(
    'authenticated',
    'public.visit_photo_cleanup_jobs',
    'select'
  ),
  'users cannot inspect the cleanup queue'
);

insert into auth.users (id, email, aud, role)
values (
  '44444444-4444-4444-4444-444444444444',
  'quota@example.com',
  'authenticated',
  'authenticated'
);

insert into public.profiles (id, display_name)
values ('44444444-4444-4444-4444-444444444444', '쿼터테스터');

insert into public.restaurants (id, slug, name, region, status)
values (
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  'quota-pizza',
  '쿼터 피자',
  '서울',
  'published'
);

set local role service_role;

select lives_ok(
  $$insert into public.visit_photo_cleanup_jobs (path, user_id, last_error)
    values (
      '44444444-4444-4444-4444-444444444444/eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee/old.webp',
      '44444444-4444-4444-4444-444444444444',
      'temporary failure'
    )$$,
  'the service role can record a failed cleanup'
);

reset role;

set local role authenticated;
set local request.jwt.claim.sub = '44444444-4444-4444-4444-444444444444';

select lives_ok(
  $$do $quota$
    begin
      for item_number in 1..9 loop
        insert into storage.objects (bucket_id, name, owner, owner_id)
        values (
          'visit-evidence',
          '44444444-4444-4444-4444-444444444444/eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee/quota-' || item_number || '.webp',
          '44444444-4444-4444-4444-444444444444',
          '44444444-4444-4444-4444-444444444444'
        );
      end loop;
    end
  $quota$;$$,
  'an owner can upload within the unreferenced evidence budget'
);

select results_eq(
  $$select public.current_user_unreferenced_evidence_count()$$,
  array[9::bigint],
  'the quota helper counts owned evidence nothing references'
);

select volatility_is(
  'public',
  'current_user_unreferenced_evidence_count',
  'volatile',
  'the quota helper is not cached across a statement'
);

-- Proves the count is serialized rather than merely correct: without the per-user
-- transaction lock, concurrent uploaders each read the same pre-insert total.
-- Matching the exact key, not just any advisory lock, keeps this from passing on
-- some unrelated lock held by the same transaction.
select isnt_empty(
  $$select 1
    from pg_locks,
      lateral (
        select hashtextextended(
          'visit-evidence:' || auth.uid()::text,
          0
        ) as lock_key
      ) as expected
    where pg_locks.locktype = 'advisory'
      and pg_locks.pid = pg_backend_pid()
      and pg_locks.objsubid = 1
      and pg_locks.classid = ((expected.lock_key >> 32) & 4294967295)::oid
      and pg_locks.objid = (expected.lock_key & 4294967295)::oid$$,
  'evaluating the quota holds the per-user advisory lock'
);

select lives_ok(
  $$insert into storage.objects (bucket_id, name, owner, owner_id)
    values (
      'visit-evidence',
      '44444444-4444-4444-4444-444444444444/eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee/quota-10.webp',
      '44444444-4444-4444-4444-444444444444',
      '44444444-4444-4444-4444-444444444444'
    )$$,
  'an owner can fill the unreferenced evidence budget'
);

select throws_ok(
  $$insert into storage.objects (bucket_id, name, owner, owner_id)
    values (
      'visit-evidence',
      '44444444-4444-4444-4444-444444444444/eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee/quota-11.webp',
      '44444444-4444-4444-4444-444444444444',
      '44444444-4444-4444-4444-444444444444'
    )$$,
  '42501',
  null,
  'the budget rejects an upload past the unreferenced limit'
);

-- A photo visit is only proof if something was actually uploaded. The path shape
-- is checked by a table constraint, so without this the same syntactically valid
-- path could be registered by a direct REST write with no object behind it.
select throws_ok(
  $$insert into public.visits (
      user_id,
      restaurant_id,
      visited_on,
      evidence_type,
      photo_path
    )
    values (
      '44444444-4444-4444-4444-444444444444',
      'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
      current_date,
      'photo',
      '44444444-4444-4444-4444-444444444444/eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee/never-uploaded.webp'
    )$$,
  '42501',
  null,
  'a photo visit needs an uploaded object at its path'
);

insert into public.visits (
  user_id,
  restaurant_id,
  visited_on,
  evidence_type,
  photo_path
)
values (
  '44444444-4444-4444-4444-444444444444',
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  current_date,
  'photo',
  '44444444-4444-4444-4444-444444444444/eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee/quota-1.webp'
);

-- The point of the whole design: saved evidence stops competing with uploads,
-- because a visit that references it is already bounded to one per restaurant.
-- Without this, a user at the cap could never replace a photo.
select results_eq(
  $$select public.current_user_unreferenced_evidence_count()$$,
  array[9::bigint],
  'evidence a visit references leaves the unreferenced budget'
);

select lives_ok(
  $$insert into storage.objects (bucket_id, name, owner, owner_id)
    values (
      'visit-evidence',
      '44444444-4444-4444-4444-444444444444/eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee/quota-11.webp',
      '44444444-4444-4444-4444-444444444444',
      '44444444-4444-4444-4444-444444444444'
    )$$,
  'attaching evidence to a visit frees budget for a replacement'
);

-- Backs the compare-and-swap in upsertVisit. The token is updated_at rather than
-- photo_path so that any concurrent edit is caught, not only a photo-for-photo
-- replacement: a tab that moved the visit to Instagram leaves photo_path null,
-- which a stale photo form would otherwise be free to overwrite.
select is_empty(
  $$update public.visits
      set photo_path = '44444444-4444-4444-4444-444444444444/eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee/quota-10.webp'
      where user_id = '44444444-4444-4444-4444-444444444444'
        and updated_at = now() - interval '1 hour'
      returning 1$$,
  'a stale version swaps no visit row'
);

select isnt_empty(
  $$update public.visits
      set photo_path = '44444444-4444-4444-4444-444444444444/eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee/quota-10.webp'
      where user_id = '44444444-4444-4444-4444-444444444444'
        and updated_at = (
          select updated_at
          from public.visits
          where user_id = '44444444-4444-4444-4444-444444444444'
        )
      returning 1$$,
  'the current version swaps the visit row'
);

reset role;

-- The trigger must move the token on every write, or a stale submission would
-- still match after the first one landed. now() is transaction-scoped, so this
-- has to backdate the row first: comparing updated_at against created_at inside
-- one transaction compares two reads of the same clock and proves nothing.
update public.visits
set updated_at = now() - interval '1 hour'
where user_id = '44444444-4444-4444-4444-444444444444';

update public.visits
set visited_on = current_date
where user_id = '44444444-4444-4444-4444-444444444444';

select is_empty(
  $$select 1
    from public.visits
    where user_id = '44444444-4444-4444-4444-444444444444'
      and updated_at < now() - interval '1 minute'$$,
  'the trigger advances the version on every write'
);

-- Only this one is old enough to be reclaimable; every other object was created
-- in this transaction, so the age floor must keep them all out.
update storage.objects
set created_at = now() - interval '2 days'
where name = '44444444-4444-4444-4444-444444444444/eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee/quota-2.webp';

set local role service_role;

select is_empty(
  $$select public.list_reclaimable_visit_evidence(
      '44444444-4444-4444-4444-444444444444',
      86400,
      '44444444-4444-4444-4444-444444444444/eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee/quota-2.webp',
      5
    )$$,
  'the path being saved right now is never reclaimed'
);

select results_eq(
  $$select public.list_reclaimable_visit_evidence(
      '44444444-4444-4444-4444-444444444444',
      86400,
      null,
      5
    )$$,
  array[
    '44444444-4444-4444-4444-444444444444/eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee/quota-2.webp'
  ],
  'only aged, unreferenced evidence is reclaimable'
);

reset role;

-- The delete policy itself cannot be exercised here: storage.protect_delete()
-- rejects direct SQL deletion before any policy is consulted, so a pgTAP delete
-- would prove nothing about the policy. Assert the two halves that are reachable
-- — the predicate is correct, and the policy actually uses it — and exercise the
-- policy end to end through the Storage API instead.
select results_eq(
  $$select public.visit_evidence_is_referenced(
      '44444444-4444-4444-4444-444444444444/eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee/quota-10.webp'
    )$$,
  array[true],
  'evidence a visit points at reads as referenced'
);

select results_eq(
  $$select public.visit_evidence_is_referenced(
      '44444444-4444-4444-4444-444444444444/eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee/quota-3.webp'
    )$$,
  array[false],
  'an abandoned upload reads as unreferenced'
);

select ok(
  (
    select position('visit_evidence_is_referenced' in qual) > 0
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'users delete their visit evidence'
  ),
  'owner deletion is gated on the reference check'
);

-- Deleting an object and attaching that path to a visit are checked by different
-- predicates, so without a shared lock both could pass their own snapshot and
-- commit. Asserting they take the *same* key is the point: separate correct locks
-- would still let the two transitions run concurrently.
set local role authenticated;
set local request.jwt.claim.sub = '44444444-4444-4444-4444-444444444444';

select results_eq(
  $$select count(distinct (classid, objid))::int
    from pg_locks
    where locktype = 'advisory'
      and pid = pg_backend_pid()
      and objsubid = 1$$,
  array[1],
  'every evidence transition serializes on one per-user key'
);

select results_eq(
  $$select public.visit_evidence_is_referenced(
      '44444444-4444-4444-4444-444444444444/eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee/quota-10.webp'
    )
    and public.current_user_owns_visit_evidence(
      '44444444-4444-4444-4444-444444444444/eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee/quota-10.webp'
    )
    and public.current_user_unreferenced_evidence_count() >= 0$$,
  array[true],
  'the reference, ownership and quota predicates all remain callable'
);

select results_eq(
  $$select count(distinct (classid, objid))::int
    from pg_locks
    where locktype = 'advisory'
      and pid = pg_backend_pid()
      and objsubid = 1$$,
  array[1],
  'calling all three predicates still holds exactly one key'
);

-- Moving a referenced object relocates it and leaves the visit pointing at
-- nothing, so the update policy has to refuse it the same way delete does.
-- USING filters the row rather than raising, so the protection shows up as the
-- move matching nothing — not as an error. Asserting a throw here would fail even
-- though the object is protected.
select is_empty(
  $$update storage.objects
      set name = '44444444-4444-4444-4444-444444444444/eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee/moved.webp'
    where name = '44444444-4444-4444-4444-444444444444/eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee/quota-10.webp'
    returning 1$$,
  'an owner cannot move evidence a visit points at'
);

select lives_ok(
  $$update storage.objects
      set name = '44444444-4444-4444-4444-444444444444/eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee/renamed.webp'
    where name = '44444444-4444-4444-4444-444444444444/eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee/quota-4.webp'$$,
  'an owner can still move an unreferenced upload'
);

reset role;

-- The role that skips policies is the one that needs constraining here, so the
-- guard is a trigger rather than a policy. storage.allow_delete_query is what the
-- Storage API sets before deleting, so setting it exercises the same path the API
-- takes — without it protect_delete() rejects first and proves nothing.
set local storage.allow_delete_query = 'true';
set local role service_role;

select throws_ok(
  $$delete from storage.objects
    where name = '44444444-4444-4444-4444-444444444444/eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee/quota-10.webp'$$,
  '23503',
  'visit evidence is still referenced by a visit',
  'even the service role cannot delete evidence a visit points at'
);

select lives_ok(
  $$delete from storage.objects
    where name = '44444444-4444-4444-4444-444444444444/eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee/quota-5.webp'$$,
  'the service role can still delete an unreferenced upload'
);

reset role;

select * from finish();

rollback;
