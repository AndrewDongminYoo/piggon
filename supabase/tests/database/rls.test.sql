begin;

select plan(15);

insert into auth.users (id, email, aud, role)
values
  ('11111111-1111-1111-1111-111111111111', 'owner@example.com', 'authenticated', 'authenticated'),
  ('22222222-2222-2222-2222-222222222222', 'other@example.com', 'authenticated', 'authenticated');

insert into public.profiles (id, display_name)
values
  ('11111111-1111-1111-1111-111111111111', '피자러버'),
  ('22222222-2222-2222-2222-222222222222', '도우마스터');

insert into public.restaurants (id, slug, name, region, status)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'published-test', '공개 테스트', '서울', 'published'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'draft-test', '초안 테스트', '서울', 'draft');

insert into public.visits (
  id,
  user_id,
  restaurant_id,
  visited_on,
  evidence_type,
  instagram_url
)
values (
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  '22222222-2222-2222-2222-222222222222',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  current_date,
  'instagram',
  'https://www.instagram.com/p/other-example/'
);

insert into public.reviews (id, visit_id, rating, body)
values (
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  4,
  '공개 리뷰'
);

set local role anon;

select results_eq(
  $$select slug from public.restaurants where slug in ('draft-test', 'published-test') order by slug$$,
  array['published-test'::text],
  'anonymous users see only the published restaurant in the test fixture'
);

select results_eq(
  $$select count(*) from public.restaurants where slug = 'draft-test'$$,
  array[0::bigint],
  'anonymous users cannot see drafts'
);

select results_eq(
  $$select count(*) from public.profiles where id = '22222222-2222-2222-2222-222222222222'$$,
  array[1::bigint],
  'a profile with a visible visit is public'
);

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

select lives_ok(
  $$insert into public.visits (id, user_id, restaurant_id, visited_on, evidence_type, instagram_url)
    values (
      'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
      '11111111-1111-1111-1111-111111111111',
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      current_date,
      'instagram',
      'https://www.instagram.com/p/owner-example/'
    )$$,
  'an owner can create a visit'
);

select lives_ok(
  $$update public.visits
    set visited_on = current_date - 1
    where id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'$$,
  'an owner can update their visit'
);

select results_eq(
  $$update public.visits
    set visited_on = current_date - 1
    where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
    returning 1$$,
  $$select 1 where false$$,
  'a user cannot update another visit'
);

select throws_ok(
  $$update public.visits
    set evidence_type = 'photo',
        photo_path = '22222222-2222-2222-2222-222222222222/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/file.webp',
        instagram_url = null
    where id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'$$,
  '23514',
  null,
  'an owner cannot attach another users storage path'
);

select lives_ok(
  $$insert into public.reviews (visit_id, rating, body)
    values ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 5, '내 리뷰')$$,
  'an owner can create a review for their visit'
);

select results_eq(
  $$update public.reviews
    set body = '수정 시도'
    where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'
    returning 1$$,
  $$select 1 where false$$,
  'a user cannot update another review'
);

select lives_ok(
  $$insert into storage.objects (bucket_id, name, owner, owner_id)
    values (
      'visit-evidence',
      '11111111-1111-1111-1111-111111111111/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/file.webp',
      '11111111-1111-1111-1111-111111111111',
      '11111111-1111-1111-1111-111111111111'
    )$$,
  'an owner can create an object in their folder'
);

select throws_ok(
  $$insert into storage.objects (bucket_id, name, owner, owner_id)
    values (
      'visit-evidence',
      '22222222-2222-2222-2222-222222222222/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/file.webp',
      '11111111-1111-1111-1111-111111111111',
      '11111111-1111-1111-1111-111111111111'
    )$$,
  '42501',
  null,
  'a user cannot create an object in another folder'
);

reset role;

update public.visits
set hidden = true
where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

set local role anon;

select results_eq(
  $$select count(*) from public.visits where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'$$,
  array[0::bigint],
  'anonymous users cannot see a hidden visit'
);

select results_eq(
  $$select count(*) from public.reviews where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'$$,
  array[0::bigint],
  'anonymous users cannot see a review under a hidden visit'
);

select results_eq(
  $$select count(*) from public.profiles where id = '22222222-2222-2222-2222-222222222222'$$,
  array[0::bigint],
  'a profile without a visible visit is not public'
);

set local role authenticated;
set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

select results_eq(
  $$select count(*) from public.visits where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'$$,
  array[1::bigint],
  'an owner retains access to their hidden visit'
);

select * from finish();

rollback;
