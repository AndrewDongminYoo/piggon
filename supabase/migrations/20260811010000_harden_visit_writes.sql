alter table public.visits
add constraint visits_not_future_check
check (visited_on <= current_date);

alter table public.visits
drop constraint visits_evidence_matches_owner_check;

alter table public.visits
add constraint visits_evidence_matches_owner_check check (
  (
    evidence_type = 'photo'
    and photo_path is not null
    and instagram_url is null
    and split_part(photo_path, '/', 1) = user_id::text
    and split_part(photo_path, '/', 2) = restaurant_id::text
    and array_length(string_to_array(photo_path, '/'), 1) = 3
    and split_part(photo_path, '/', 3) ~ '^[A-Za-z0-9_-]+\.(jpg|png|webp)$'
  )
  or (
    evidence_type = 'instagram'
    and instagram_url is not null
    and instagram_url ~ '^https://(www\.)?instagram\.com/(p|reel)/[A-Za-z0-9_-]+/?([?#].*)?$'
    and photo_path is null
  )
);

create function public.current_user_has_profile()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
  );
$$;

revoke all on function public.current_user_has_profile() from public;
grant execute on function public.current_user_has_profile() to authenticated;

drop policy "users insert visits for published restaurants"
on public.visits;

create policy "users insert visits for published restaurants"
on public.visits for insert
to authenticated
with check (
  auth.uid() = user_id
  and public.current_user_has_profile()
  and exists (
    select 1
    from public.restaurants
    where restaurants.id = visits.restaurant_id
      and restaurants.status = 'published'
  )
);

drop policy "users update their visits"
on public.visits;

create policy "users update their visits"
on public.visits for update
to authenticated
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and public.current_user_has_profile()
  and exists (
    select 1
    from public.restaurants
    where restaurants.id = visits.restaurant_id
      and restaurants.status = 'published'
  )
);

revoke update on public.visits from authenticated;
grant update (visited_on, evidence_type, photo_path, instagram_url)
on public.visits to authenticated;

revoke update on public.reviews from authenticated;
grant update (rating, body)
on public.reviews to authenticated;
