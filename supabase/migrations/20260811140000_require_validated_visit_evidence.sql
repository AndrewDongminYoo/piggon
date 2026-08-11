-- 20260811080000 required that an object exist at the path, which is not the same
-- as requiring that it be an image. A caller writing straight to the REST API can
-- upload arbitrary bytes under an allowed MIME type and attach them: upsertVisit's
-- signature check is application code and never runs on that path, so the visit is
-- counted as proof while its evidence cannot be rendered or moderated.
--
-- RLS cannot inspect bytes, so the server records what it validated and the policy
-- requires that record. The record is bound to storage.objects.version, which
-- changes when an object is overwritten — otherwise a caller could get valid bytes
-- validated, replace them, and reuse the record.
create table public.visit_evidence_validations (
  path text primary key,
  object_version text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  validated_at timestamptz not null default now()
);

alter table public.visit_evidence_validations enable row level security;

-- No policy for authenticated on purpose: a caller who could write this table
-- could validate their own bytes, which is the whole thing being prevented.
revoke all on public.visit_evidence_validations from public, anon, authenticated;
grant select, insert, update, delete on public.visit_evidence_validations
to service_role;

create function public.visit_evidence_is_validated(p_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.visit_evidence_validations validations
    join storage.objects
      on storage.objects.bucket_id = 'visit-evidence'
      and storage.objects.name = validations.path
    where validations.path = p_path
      and validations.object_version = coalesce(storage.objects.version, '')
  );
$$;

revoke all on function public.visit_evidence_is_validated(text) from public;
grant execute on function public.visit_evidence_is_validated(text) to authenticated;

-- Called by the server once it has downloaded the object and checked its
-- signature. Reading the version here rather than accepting it from the caller
-- keeps the record describing the bytes the server actually inspected.
create function public.record_visit_evidence_validation(
  p_path text,
  p_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_version text;
begin
  perform public.lock_visit_evidence(p_user_id);

  -- A null version is a real object with no version recorded, not a missing one;
  -- collapsing the two would refuse to validate an object that exists.
  select coalesce(storage.objects.version, '')
  into current_version
  from storage.objects
  where storage.objects.bucket_id = 'visit-evidence'
    and storage.objects.name = p_path
    and storage.objects.owner_id = p_user_id::text;

  if not found then
    return false;
  end if;

  insert into public.visit_evidence_validations (path, object_version, user_id)
  values (p_path, current_version, p_user_id)
  on conflict (path) do update
  set object_version = excluded.object_version,
      validated_at = now();

  return true;
end;
$$;

revoke all on function public.record_visit_evidence_validation(text, uuid)
from public, anon, authenticated;
grant execute on function public.record_visit_evidence_validation(text, uuid)
to service_role;

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
    or (
      public.current_user_owns_visit_evidence(visits.photo_path)
      and public.visit_evidence_is_validated(visits.photo_path)
    )
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
    or (
      public.current_user_owns_visit_evidence(visits.photo_path)
      and public.visit_evidence_is_validated(visits.photo_path)
    )
  )
);
