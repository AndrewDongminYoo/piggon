-- The validation record was bound to whatever version was current when the server
-- recorded it, not to the bytes the server actually inspected. Between the
-- download and the record the object is not yet referenced by a visit, so its
-- owner may still overwrite it — and the record would then describe the new bytes:
--
--   server downloads and validates v1  ->  owner overwrites, version becomes v2
--   record reads the current version   ->  records v2
--   policy compares v2 to v2           ->  arbitrary bytes count as validated
--
-- Reproduced against the local stack before this change. The caller now pins the
-- version it read before downloading, and recording refuses if the object moved.
create function public.visit_evidence_version(p_path text, p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(storage.objects.version, '')
  from storage.objects
  where storage.objects.bucket_id = 'visit-evidence'
    and storage.objects.name = p_path
    and storage.objects.owner_id = p_user_id::text;
$$;

revoke all on function public.visit_evidence_version(text, uuid)
from public, anon, authenticated;
grant execute on function public.visit_evidence_version(text, uuid)
to service_role;

-- Dropped rather than overloaded: leaving the two-argument form callable would
-- leave the hole reachable by calling the older one.
drop function public.record_visit_evidence_validation(text, uuid);

create function public.record_visit_evidence_validation(
  p_path text,
  p_user_id uuid,
  p_expected_version text
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

  select coalesce(storage.objects.version, '')
  into current_version
  from storage.objects
  where storage.objects.bucket_id = 'visit-evidence'
    and storage.objects.name = p_path
    and storage.objects.owner_id = p_user_id::text;

  if not found or current_version is distinct from p_expected_version then
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

revoke all on function public.record_visit_evidence_validation(text, uuid, text)
from public, anon, authenticated;
grant execute on function public.record_visit_evidence_validation(text, uuid, text)
to service_role;
