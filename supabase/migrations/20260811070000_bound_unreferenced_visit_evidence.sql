-- Counting every owned object made saved evidence compete with in-flight uploads
-- for one budget, and every fix to that traded one lock-out for a narrower one:
-- a user at the cap could not replace a photo, and the headroom slot added for
-- that could itself be consumed forever by a tab closed mid-upload.
--
-- Objects a visit references need no cap of their own — `visits` is unique per
-- (user, restaurant), so referenced evidence is already bounded by the published
-- catalog. Only unreferenced objects can grow without limit, so bound only those.
create index visits_photo_path_idx
on public.visits (photo_path)
where photo_path is not null;

create function public.current_user_unreferenced_evidence_count()
returns bigint
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  evidence_count bigint;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'visit-evidence:' || coalesce(auth.uid()::text, ''),
      0
    )
  );

  select pg_catalog.count(*)
  into evidence_count
  from storage.objects
  where objects.bucket_id = 'visit-evidence'
    and objects.owner_id = auth.uid()::text
    and not exists (
      select 1
      from public.visits
      where visits.photo_path = objects.name
    );

  return evidence_count;
end;
$$;

revoke all on function public.current_user_unreferenced_evidence_count()
from public;
grant execute on function public.current_user_unreferenced_evidence_count()
to authenticated;

drop policy "users insert visit evidence in their folder"
on storage.objects;

create policy "users insert visit evidence in their folder"
on storage.objects for insert
to authenticated
with check (
  storage.objects.bucket_id = 'visit-evidence'
  and storage.objects.owner_id = auth.uid()::text
  and array_length(storage.foldername(storage.objects.name), 1) = 2
  and (storage.foldername(storage.objects.name))[1] = auth.uid()::text
  and public.current_user_has_profile()
  and exists (
    select 1
    from public.restaurants
    where restaurants.id::text = (
      storage.foldername(storage.objects.name)
    )[2]
      and restaurants.status = 'published'
  )
  and public.current_user_unreferenced_evidence_count() < 10
);

drop function public.current_user_visit_evidence_count();

-- Reclaims the budget an abandoned upload would otherwise hold forever. The age
-- floor keeps a slow client's in-flight object out of reach, and the caller
-- passes the path it is currently saving so its own upload is never a candidate.
create function public.list_reclaimable_visit_evidence(
  p_user_id uuid,
  p_older_than_seconds integer,
  p_except_path text,
  p_limit integer
)
returns setof text
language sql
stable
security definer
set search_path = ''
as $$
  select objects.name
  from storage.objects
  where objects.bucket_id = 'visit-evidence'
    and objects.owner_id = p_user_id::text
    and objects.created_at
      < pg_catalog.now() - pg_catalog.make_interval(secs => p_older_than_seconds)
    and objects.name is distinct from p_except_path
    and not exists (
      select 1
      from public.visits
      where visits.photo_path = objects.name
    )
  order by objects.created_at
  limit p_limit;
$$;

revoke all on function public.list_reclaimable_visit_evidence(
  uuid, integer, text, integer
) from public, anon, authenticated;
grant execute on function public.list_reclaimable_visit_evidence(
  uuid, integer, text, integer
) to service_role;
