begin;

select plan(9);

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

select throws_ok(
  $$insert into storage.objects (bucket_id, name, owner, owner_id)
    values (
      'visit-evidence',
      '44444444-4444-4444-4444-444444444444/eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee/quota-51.webp',
      '44444444-4444-4444-4444-444444444444',
      '44444444-4444-4444-4444-444444444444'
    )$$,
  '42501',
  null,
  'the evidence quota rejects an additional direct upload'
);

select * from finish();

rollback;
