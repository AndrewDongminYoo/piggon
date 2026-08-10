insert into public.restaurants (slug, name, alternate_name, region, kind, status, source_url)
values
  ('bolare', '볼라레', null, '서울 서초구', 'pizzeria', 'draft', 'https://www.google.com/search?q=https://www.youtube.com/watch%3Fv%3DTw-16nX-0LA'),
  ('vera-hannam', '베라 한남점', null, '서울 용산구', 'pizzeria', 'draft', 'https://www.google.com/search?q=https://www.youtube.com/watch%3Fv%3DTw-16nX-0LA'),
  ('pizzeria-da-ali', '피제리아 다 알리', null, '대전', 'pizzeria', 'draft', 'https://www.google.com/search?q=https://www.youtube.com/watch%3Fv%3DTw-16nX-0LA'),
  ('panello', '빠넬로', null, '서울 마포구', 'pizzeria', 'draft', 'https://www.youtube.com/watch?v=M5H0e6o7B2s'),
  ('gione-kitchen', '지오네 키친', null, '대구', 'pizzeria', 'draft', 'https://www.google.com/search?q=https://www.youtube.com/watch%3Fv%3DTw-16nX-0LA'),
  ('piano-restaurant-donghae', '피아노 레스토랑', null, '강원 동해', 'restaurant', 'draft', 'https://www.google.com/search?q=https://www.youtube.com/watch%3Fv%3DTw-16nX-0LA'),
  ('zootopia-daegu', '주토피아', null, '대구', 'pizzeria', 'draft', 'https://www.google.com/search?q=https://www.youtube.com/watch%3Fv%3DTw-16nX-0LA'),
  ('marione', '마리오네', null, '서울 성동구', 'pizzeria', 'draft', 'https://www.google.com/search?q=https://www.youtube.com/watch%3Fv%3DTw-16nX-0LA'),
  ('popolo-pizza', '포폴로 피자', null, '경기 일산', 'pizzeria', 'draft', 'https://www.google.com/search?q=https://www.youtube.com/watch%3Fv%3DTw-16nX-0LA'),
  ('vulcan-wanju', '불칸', null, '전북 완주', 'pizzeria', 'draft', 'https://www.youtube.com/watch?v=L17S1Dx28Ss'),
  ('pizza-pazzo', '피자파쪼', null, '서울 관악구 서울대입구역', 'pizzeria', 'draft', 'https://www.youtube.com/watch?v=7JObzRptG20'),
  ('devils-bajinico', '데빌스 바지니코', null, '서울 마포구 합정', 'pizzeria', 'draft', 'https://www.youtube.com/watch?v=ZHvHUEZEKGE'),
  ('brett-pizza', '브렛피자', null, '서울 마포구 상수동', 'pizzeria', 'draft', 'https://www.youtube.com/watch?v=yqzVi-pRUiE'),
  ('melting-pizza', '멜팅 피자', null, '서울 강남구', 'pizzeria', 'draft', 'https://www.youtube.com/watch?v=BglDJb2spOM'),
  ('atta-hannam', '아따', 'ATTA', '서울 용산구 한남동', 'restaurant', 'draft', 'https://www.youtube.com/watch?v=_UFcjwMjdJM'),
  ('osteria-hyun', '오스테리아 현', null, '서울 광진구 군자역', 'restaurant', 'draft', 'https://www.youtube.com/watch?v=i7-TO2kYfqY'),
  ('dough-cument', '도우큐먼트', null, '서울 중구 명동', 'pizzeria', 'draft', 'https://www.youtube.com/watch?v=dlLHEXE4KU0'),
  ('izza', '이짜', null, '서울 성동구 성수동', 'pizzeria', 'draft', 'https://www.youtube.com/watch?v=2lozYHXjAzY'),
  ('orno', '오르노', null, '서울 성동구 성수동', 'pizzeria', 'draft', 'https://www.youtube.com/watch?v=2lozYHXjAzY'),
  ('fwv', 'FWV', null, '서울 용산구', 'pizzeria', 'draft', 'https://www.youtube.com/watch?v=2lozYHXjAzY'),
  ('lorris-pizza', '로리스피자', null, '[PARTIAL]', 'pizzeria', 'draft', 'https://www.youtube.com/watch?v=p0RJrxzu9Xg'),
  ('cosmos-the-cave', '코스모더케이브', 'EAT YOUR CRUST', '[PARTIAL]', 'popup', 'draft', 'https://www.youtube.com/watch?v=JfWOuZh0o0M'),
  ('pizza-school', '피자스쿨', null, '[PARTIAL]', 'franchise', 'draft', 'https://www.youtube.com/watch?v=Qpl8EVZtJfg');

insert into public.videos (youtube_video_id, canonical_url, metadata_fetch_state)
values
  ('M5H0e6o7B2s', 'https://www.youtube.com/watch?v=M5H0e6o7B2s', 'pending'),
  ('L17S1Dx28Ss', 'https://www.youtube.com/watch?v=L17S1Dx28Ss', 'pending'),
  ('7JObzRptG20', 'https://www.youtube.com/watch?v=7JObzRptG20', 'pending'),
  ('ZHvHUEZEKGE', 'https://www.youtube.com/watch?v=ZHvHUEZEKGE', 'pending'),
  ('yqzVi-pRUiE', 'https://www.youtube.com/watch?v=yqzVi-pRUiE', 'pending'),
  ('BglDJb2spOM', 'https://www.youtube.com/watch?v=BglDJb2spOM', 'pending'),
  ('_UFcjwMjdJM', 'https://www.youtube.com/watch?v=_UFcjwMjdJM', 'pending'),
  ('i7-TO2kYfqY', 'https://www.youtube.com/watch?v=i7-TO2kYfqY', 'pending'),
  ('dlLHEXE4KU0', 'https://www.youtube.com/watch?v=dlLHEXE4KU0', 'pending'),
  ('2lozYHXjAzY', 'https://www.youtube.com/watch?v=2lozYHXjAzY', 'pending'),
  ('p0RJrxzu9Xg', 'https://www.youtube.com/watch?v=p0RJrxzu9Xg', 'pending'),
  ('JfWOuZh0o0M', 'https://www.youtube.com/watch?v=JfWOuZh0o0M', 'pending'),
  ('Qpl8EVZtJfg', 'https://www.youtube.com/watch?v=Qpl8EVZtJfg', 'pending');

insert into public.restaurant_videos (restaurant_id, video_id)
select restaurants.id, videos.id
from (
  values
    ('panello', 'M5H0e6o7B2s'),
    ('vulcan-wanju', 'L17S1Dx28Ss'),
    ('pizza-pazzo', '7JObzRptG20'),
    ('devils-bajinico', 'ZHvHUEZEKGE'),
    ('brett-pizza', 'yqzVi-pRUiE'),
    ('melting-pizza', 'BglDJb2spOM'),
    ('atta-hannam', '_UFcjwMjdJM'),
    ('osteria-hyun', 'i7-TO2kYfqY'),
    ('dough-cument', 'dlLHEXE4KU0'),
    ('izza', '2lozYHXjAzY'),
    ('orno', '2lozYHXjAzY'),
    ('fwv', '2lozYHXjAzY'),
    ('lorris-pizza', 'p0RJrxzu9Xg'),
    ('cosmos-the-cave', 'JfWOuZh0o0M'),
    ('pizza-school', 'Qpl8EVZtJfg')
) as links(restaurant_slug, youtube_video_id)
join public.restaurants on restaurants.slug = links.restaurant_slug
join public.videos on videos.youtube_video_id = links.youtube_video_id;
