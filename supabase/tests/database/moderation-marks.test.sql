begin;

select plan(8);

insert into auth.users (id, email, aud, role)
values (
  '77777777-7777-7777-7777-777777777777',
  'moderated@example.com',
  'authenticated',
  'authenticated'
);

insert into public.profiles (id, display_name)
values ('77777777-7777-7777-7777-777777777777', '모더레이션테스터');

insert into public.restaurants (id, slug, name, region, status)
values (
  'ffffffff-ffff-ffff-ffff-ffffffffffff',
  'moderation-pizza',
  '모더레이션 피자',
  '서울',
  'published'
);

set local role authenticated;
set local request.jwt.claim.sub = '77777777-7777-7777-7777-777777777777';

insert into public.visits (
  id,
  user_id,
  restaurant_id,
  visited_on,
  evidence_type,
  instagram_url
)
values (
  '88888888-8888-8888-8888-888888888888',
  '77777777-7777-7777-7777-777777777777',
  'ffffffff-ffff-ffff-ffff-ffffffffffff',
  current_date,
  'instagram',
  'https://www.instagram.com/p/moderated/'
);

insert into public.reviews (visit_id, rating, body)
values ('88888888-8888-8888-8888-888888888888', 5, '원래 리뷰');

select is_empty(
  $$select 1
    from public.visit_moderation_marks
    where user_id = '77777777-7777-7777-7777-777777777777'$$,
  'ordinary content leaves no moderation mark'
);

reset role;

update public.visits
set hidden = true
where id = '88888888-8888-8888-8888-888888888888';

update public.reviews
set hidden = true
where visit_id = '88888888-8888-8888-8888-888888888888';

select results_eq(
  $$select visit_hidden, review_hidden
    from public.visit_moderation_marks
    where user_id = '77777777-7777-7777-7777-777777777777'$$,
  $$values (true, true)$$,
  'hiding content records the decision against the user and restaurant'
);

set local role authenticated;
set local request.jwt.claim.sub = '77777777-7777-7777-7777-777777777777';

-- The owner may still delete their own content; the mark is what has to outlive
-- the row, since deleting and recreating is how the moderation was undone.
delete from public.visits
where id = '88888888-8888-8888-8888-888888888888';

select isnt_empty(
  $$select 1
    from public.visit_moderation_marks
    where user_id = '77777777-7777-7777-7777-777777777777'$$,
  'the mark outlives the row it describes'
);

insert into public.visits (
  id,
  user_id,
  restaurant_id,
  visited_on,
  evidence_type,
  instagram_url
)
values (
  '99999999-9999-9999-9999-999999999999',
  '77777777-7777-7777-7777-777777777777',
  'ffffffff-ffff-ffff-ffff-ffffffffffff',
  current_date,
  'instagram',
  'https://www.instagram.com/p/recreated/'
);

insert into public.reviews (visit_id, rating, body)
values ('99999999-9999-9999-9999-999999999999', 5, '다시 쓴 리뷰');

select results_eq(
  $$select hidden
    from public.visits
    where id = '99999999-9999-9999-9999-999999999999'$$,
  array[true],
  'a recreated visit inherits the moderation decision'
);

select results_eq(
  $$select hidden
    from public.reviews
    where visit_id = '99999999-9999-9999-9999-999999999999'$$,
  array[true],
  'a recreated review inherits the moderation decision'
);

-- Inheriting silently would be a shadow ban, so the owner has to be able to read
-- why their content is not appearing.
select isnt_empty(
  $$select 1
    from public.visit_moderation_marks
    where user_id = '77777777-7777-7777-7777-777777777777'$$,
  'an owner can read the mark on their own content'
);

set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

select is_empty(
  $$select 1 from public.visit_moderation_marks$$,
  'another user cannot read that mark'
);

reset role;

update public.visits
set hidden = false
where id = '99999999-9999-9999-9999-999999999999';

select results_eq(
  $$select visit_hidden
    from public.visit_moderation_marks
    where user_id = '77777777-7777-7777-7777-777777777777'$$,
  array[false],
  'restoring content clears the decision so later writes are visible again'
);

select * from finish();

rollback;
