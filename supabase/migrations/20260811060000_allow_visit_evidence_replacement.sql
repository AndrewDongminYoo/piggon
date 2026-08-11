-- Replacing a photo uploads the new object before upsertVisit can release the old
-- one, so the quota briefly sees one more object than the user will end up owning.
-- With a bare `< 50` a user sitting exactly at the cap could never replace their
-- evidence: the temporary object was rejected and the old one never freed. Allow
-- exactly one in-flight object. The visit flow submits at most one photo per
-- request, so this headroom cannot be widened by a legitimate client, and the
-- advisory lock in the counting helper keeps concurrent attempts from stacking.
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
  and public.current_user_visit_evidence_count() < 51
);
