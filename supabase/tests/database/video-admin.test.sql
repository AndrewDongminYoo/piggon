begin;

select plan(8);

select has_function(
  'public',
  'upsert_video_with_restaurants',
  array['text', 'text', 'text', 'text', 'text', 'jsonb'],
  'transactional video upsert exists'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.upsert_video_with_restaurants(text,text,text,text,text,jsonb)',
    'execute'
  ),
  'anonymous users cannot execute the video upsert'
);

select ok(
  has_function_privilege(
    'service_role',
    'public.upsert_video_with_restaurants(text,text,text,text,text,jsonb)',
    'execute'
  ),
  'the server service role can execute the video upsert'
);

insert into public.restaurants (id, slug, name, region, status)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'video-first', '첫 맛집', '서울', 'published'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'video-second', '둘째 맛집', '서울', 'published');

set local role service_role;

select lives_ok(
  $$select public.upsert_video_with_restaurants(
    '2lozYHXjAzY',
    'https://www.youtube.com/watch?v=2lozYHXjAzY',
    '성수 피자 세 곳',
    'https://i.ytimg.com/vi/2lozYHXjAzY/hqdefault.jpg',
    'fetched',
    '[
      {
        "restaurant_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        "start_seconds": 30,
        "context_note": "이짜"
      },
      {
        "restaurant_id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
        "start_seconds": 420,
        "context_note": "오르노"
      }
    ]'::jsonb
  )$$,
  'a video and its restaurant links are saved together'
);

reset role;

select results_eq(
  $$select metadata_fetch_state, title from public.videos
    where youtube_video_id = '2lozYHXjAzY'$$,
  $$values ('fetched'::text, '성수 피자 세 곳'::text)$$,
  'video metadata is upserted'
);

select results_eq(
  $$select start_seconds, context_note from public.restaurant_videos
    join public.videos on videos.id = restaurant_videos.video_id
    where videos.youtube_video_id = '2lozYHXjAzY'
    order by start_seconds$$,
  $$values (30, '이짜'::text), (420, '오르노'::text)$$,
  'restaurant-specific timestamps and notes are preserved'
);

set local role service_role;

select throws_ok(
  $$select public.upsert_video_with_restaurants(
    '2lozYHXjAzY',
    'https://www.youtube.com/watch?v=2lozYHXjAzY',
    '덮어쓰면 안 되는 제목',
    '',
    'manual',
    '[
      {
        "restaurant_id": "cccccccc-cccc-cccc-cccc-cccccccccccc",
        "start_seconds": 99,
        "context_note": "없는 맛집"
      }
    ]'::jsonb
  )$$,
  '23503',
  null,
  'a failed restaurant-link replacement rolls back the whole write'
);

reset role;

select results_eq(
  $$select title, count(restaurant_videos.restaurant_id)::integer
    from public.videos
    join public.restaurant_videos on restaurant_videos.video_id = videos.id
    where videos.youtube_video_id = '2lozYHXjAzY'
    group by videos.title$$,
  $$values ('성수 피자 세 곳'::text, 2)$$,
  'the previous video and links survive a failed replacement'
);

select * from finish();

rollback;
