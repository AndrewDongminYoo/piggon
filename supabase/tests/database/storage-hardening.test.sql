begin;

select plan(14);

select has_function(
  'public',
  'current_user_visit_evidence_count',
  'visit evidence quota helper exists'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.current_user_visit_evidence_count()',
    'execute'
  ),
  'anonymous users cannot execute the quota helper'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.current_user_visit_evidence_count()',
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
      for item_number in 1..50 loop
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
  'an owner can upload within the evidence quota'
);

select results_eq(
  $$select public.current_user_visit_evidence_count()$$,
  array[50::bigint],
  'the quota helper counts owned evidence'
);

select volatility_is(
  'public',
  'current_user_visit_evidence_count',
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

-- Replacement uploads the new object while the old one is still referenced, so a
-- user sitting exactly at the cap must still be able to put one object in flight.
select lives_ok(
  $$insert into storage.objects (bucket_id, name, owner, owner_id)
    values (
      'visit-evidence',
      '44444444-4444-4444-4444-444444444444/eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee/quota-51.webp',
      '44444444-4444-4444-4444-444444444444',
      '44444444-4444-4444-4444-444444444444'
    )$$,
  'an owner at the cap can still upload one replacement'
);

select throws_ok(
  $$insert into storage.objects (bucket_id, name, owner, owner_id)
    values (
      'visit-evidence',
      '44444444-4444-4444-4444-444444444444/eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee/quota-52.webp',
      '44444444-4444-4444-4444-444444444444',
      '44444444-4444-4444-4444-444444444444'
    )$$,
  '42501',
  null,
  'the evidence quota rejects an upload past the replacement slot'
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

-- Backs the compare-and-swap in upsertVisit: the loser of a concurrent photo
-- replacement holds a stale path, so its guarded update must match no row rather
-- than overwrite the winner and strand the winner's object.
select is_empty(
  $$update public.visits
      set photo_path = '44444444-4444-4444-4444-444444444444/eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee/quota-51.webp'
      where user_id = '44444444-4444-4444-4444-444444444444'
        and photo_path = '44444444-4444-4444-4444-444444444444/eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee/quota-9.webp'
      returning 1$$,
  'a stale evidence path swaps no visit row'
);

select isnt_empty(
  $$update public.visits
      set photo_path = '44444444-4444-4444-4444-444444444444/eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee/quota-51.webp'
      where user_id = '44444444-4444-4444-4444-444444444444'
        and photo_path = '44444444-4444-4444-4444-444444444444/eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee/quota-1.webp'
      returning 1$$,
  'the current evidence path swaps the visit row'
);

select * from finish();

rollback;
