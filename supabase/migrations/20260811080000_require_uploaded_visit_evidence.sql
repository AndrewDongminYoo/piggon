-- The visit policies validated the shape of photo_path but never that anything
-- had been uploaded there. upsertVisit downloads the object before saving, but
-- that is application code: a caller writing straight to the REST API with their
-- own session could register a photo visit against a path holding no object, and
-- the public visitor count would present it as proof while moderation could not
-- load any evidence. Make the storage object a condition of the write itself.
create function public.current_user_owns_visit_evidence(p_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from storage.objects
    where objects.bucket_id = 'visit-evidence'
      and objects.name = p_path
      and objects.owner_id = auth.uid()::text
  );
$$;

revoke all on function public.current_user_owns_visit_evidence(text) from public;
grant execute on function public.current_user_owns_visit_evidence(text)
to authenticated;

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
  and (
    visits.evidence_type <> 'photo'
    or public.current_user_owns_visit_evidence(visits.photo_path)
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
  and (
    visits.evidence_type <> 'photo'
    or public.current_user_owns_visit_evidence(visits.photo_path)
  )
);
