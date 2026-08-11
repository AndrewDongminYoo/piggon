-- The delete trigger checked references on a plain statement snapshot, so an
-- attach and a cleanup delete could still each see a world where the other had
-- not happened and both commit.
--
-- Making the trigger take the existing lock would not have fixed it, and would
-- have looked like it did. lock_visit_evidence() derived its key from auth.uid(),
-- which is null under service_role — the role the cleanup driver uses — so the
-- trigger would have locked the key for the empty string while the attaching user
-- locked their own. Two transactions, two different keys, no serialization, and a
-- diff that reads as if there were.
--
-- The key now comes from the owner of the evidence rather than from whoever is
-- asking, so every transition on one user's evidence serializes regardless of the
-- role performing it.
drop function public.lock_visit_evidence();

create function public.lock_visit_evidence(p_user_id uuid)
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  select pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'visit-evidence:' || coalesce(p_user_id::text, ''),
      0
    )
  );
$$;

revoke all on function public.lock_visit_evidence(uuid) from public;
grant execute on function public.lock_visit_evidence(uuid) to authenticated;

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
  perform public.lock_visit_evidence(auth.uid());

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
  perform public.lock_visit_evidence(auth.uid());

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
  perform public.lock_visit_evidence(auth.uid());

  return exists (
    select 1
    from public.visits
    where visits.photo_path = p_path
  );
end;
$$;

create or replace function public.reject_referenced_evidence_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.bucket_id <> 'visit-evidence' then
    return old;
  end if;

  -- Keyed on the evidence owner, not the caller: the cleanup driver runs as
  -- service_role, where auth.uid() is null.
  perform public.lock_visit_evidence(old.owner_id::uuid);

  if exists (
    select 1
    from public.visits
    where visits.photo_path = old.name
  ) then
    raise exception 'visit evidence is still referenced by a visit'
      using errcode = '23503';
  end if;

  return old;
end;
$$;
