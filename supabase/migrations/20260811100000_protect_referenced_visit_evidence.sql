-- 20260811080000 made an uploaded object a condition of writing a photo visit,
-- but only at write time. Nothing kept the object there afterwards: the owner
-- could delete it straight through the Storage API and leave a visible visit,
-- still counted as proof, whose evidence neither the public nor moderation could
-- inspect. Verified against the local stack through the Storage API — direct SQL
-- cannot reproduce it, because storage.protect_delete() blocks that path first.
--
-- Evidence a visit points at is not the owner's to delete piecemeal; deleting the
-- visit or replacing the photo still removes it, through the service-role cleanup
-- that bypasses RLS. Unreferenced objects stay deletable, so an owner can still
-- clear an upload they abandoned.
create function public.visit_evidence_is_referenced(p_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.visits
    where visits.photo_path = p_path
  );
$$;

revoke all on function public.visit_evidence_is_referenced(text) from public;
grant execute on function public.visit_evidence_is_referenced(text)
to authenticated;

drop policy "users delete their visit evidence"
on storage.objects;

create policy "users delete their visit evidence"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'visit-evidence'
  and (storage.foldername(name))[1] = auth.uid()::text
  and not public.visit_evidence_is_referenced(name)
);
