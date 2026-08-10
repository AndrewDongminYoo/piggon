begin;

select plan(5);

select has_table('public', 'restaurants', 'restaurants exists');
select has_table('public', 'restaurant_videos', 'restaurant_videos exists');
select has_table('public', 'visits', 'visits exists');
select has_table('public', 'reviews', 'reviews exists');
select col_is_unique(
  'public',
  'visits',
  array['user_id', 'restaurant_id'],
  'one visit per user and restaurant'
);

select * from finish();

rollback;
