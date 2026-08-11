-- visit_evidence_is_validated was the one evidence predicate left `stable`, so it
-- answered from the snapshot the statement started with. Its sibling
-- current_user_owns_visit_evidence is volatile and takes the lock, so during a
-- concurrent overwrite the insert could wait on the lock, confirm the *new*
-- object exists, and still match the *old* version against its validation from
-- the pre-lock snapshot — attaching bytes nobody checked.
--
-- Volatile, and taking the lock first, so the read happens after the wait rather
-- than before it. Every evidence predicate now shares that shape; this one was
-- simply missed when the others were converted.
create or replace function public.visit_evidence_is_validated(p_path text)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  owner_id uuid;
begin
  select validations.user_id
  into owner_id
  from public.visit_evidence_validations validations
  where validations.path = p_path;

  if not found then
    return false;
  end if;

  perform public.lock_visit_evidence(owner_id);

  return exists (
    select 1
    from public.visit_evidence_validations validations
    join storage.objects
      on storage.objects.bucket_id = 'visit-evidence'
      and storage.objects.name = validations.path
    where validations.path = p_path
      and validations.object_version = coalesce(storage.objects.version, '')
  );
end;
$$;
