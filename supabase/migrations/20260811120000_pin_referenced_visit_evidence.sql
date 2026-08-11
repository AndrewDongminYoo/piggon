-- Two remaining ways for evidence to vanish out from under a visible visit.
--
-- The UPDATE policy was left alone in 20260811100000 on the reasoning that
-- overwriting in place leaves an inspectable object. That reasoning missed the
-- move case: the Storage move API updates `name`, which relocates the object and
-- leaves visits.photo_path pointing at nothing, exactly like a delete. Overwrite
-- is weaker but not harmless either, since the server validates the image
-- signature only when the visit is written.
--
-- And the DELETE policy only constrains `authenticated`. The cleanup driver runs
-- as service_role, which bypasses RLS entirely and so never takes the evidence
-- lock, leaving a window where cleanup removes a path an attach has just claimed.
--
-- Policies cannot close that second one, because the role that skips them is the
-- one that needs constraining. A trigger can: it fires for every role, and it runs
-- inside the same statement as the delete, so "referenced" and "deleted" cannot
-- both win. The Storage API deletes through SQL after setting
-- storage.allow_delete_query, so this covers the API path as well as direct SQL.
create function public.reject_referenced_evidence_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.bucket_id = 'visit-evidence'
    and exists (
      select 1
      from public.visits
      where visits.photo_path = old.name
    )
  then
    raise exception 'visit evidence is still referenced by a visit'
      using errcode = '23503';
  end if;

  return old;
end;
$$;

create trigger objects_reject_referenced_evidence_delete
before delete on storage.objects
for each row execute function public.reject_referenced_evidence_delete();

drop policy "users update their visit evidence"
on storage.objects;

create policy "users update their visit evidence"
on storage.objects for update
to authenticated
using (
  bucket_id = 'visit-evidence'
  and (storage.foldername(name))[1] = auth.uid()::text
  and not public.visit_evidence_is_referenced(name)
)
with check (
  bucket_id = 'visit-evidence'
  and (storage.foldername(name))[1] = auth.uid()::text
  and not public.visit_evidence_is_referenced(name)
);
