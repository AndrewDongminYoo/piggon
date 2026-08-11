-- The evidence predicates were each a snapshot-time check. Deleting an
-- unreferenced object and attaching that same path to a visit could therefore
-- both pass under READ COMMITTED and both commit, leaving a visit pointing at
-- evidence that no longer exists — the state 20260811100000 exists to prevent,
-- reached by racing instead of by a single call.
--
-- The quota count already took a per-user transaction lock for the same reason.
-- Every evidence transition now takes that same lock, so they serialize against
-- each other rather than only against their own kind. The key lives in one
-- function on purpose: three copies of the hash expression would serialize
-- correctly until one of them drifted, and nothing would report that they had
-- stopped agreeing.
create function public.lock_visit_evidence()
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  select pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'visit-evidence:' || coalesce(auth.uid()::text, ''),
      0
    )
  );
$$;

revoke all on function public.lock_visit_evidence() from public;
grant execute on function public.lock_visit_evidence() to authenticated;

create or replace function public.current_user_unreferenced_evidence_count()
returns bigint
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  evidence_count bigint;
begin
  perform public.lock_visit_evidence();

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

create or replace function public.current_user_owns_visit_evidence(p_path text)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  perform public.lock_visit_evidence();

  return exists (
    select 1
    from storage.objects
    where objects.bucket_id = 'visit-evidence'
      and objects.name = p_path
      and objects.owner_id = auth.uid()::text
  );
end;
$$;

create or replace function public.visit_evidence_is_referenced(p_path text)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  perform public.lock_visit_evidence();

  return exists (
    select 1
    from public.visits
    where visits.photo_path = p_path
  );
end;
$$;
