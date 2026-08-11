alter table public.visits
drop constraint visits_not_future_check;

alter table public.visits
add constraint visits_not_future_check
check (visited_on <= (now() at time zone 'Asia/Seoul')::date);
