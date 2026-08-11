-- Validation records are keyed by the upload's unique path, and every photo
-- replacement mints a new path, so each one left a row behind. Nothing removed
-- them: cleanup deletes the storage object and the cleanup job, never the
-- validation. Ordinary repeated replacements therefore grew this table without
-- bound, one row per upload the user ever made.
--
-- A stale row was never dangerous — visit_evidence_is_validated joins to
-- storage.objects, so a record whose object is gone simply stops matching — but
-- it is unbounded authenticated growth, which is its own problem.
--
-- AFTER DELETE rather than folding this into the BEFORE DELETE guard beside it:
-- that one exists to refuse the delete, and cleanup should only follow a delete
-- that actually happened.
create function public.clear_visit_evidence_validation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.bucket_id = 'visit-evidence' then
    delete from public.visit_evidence_validations
    where visit_evidence_validations.path = old.name;
  end if;

  return old;
end;
$$;

create trigger objects_clear_evidence_validation
after delete on storage.objects
for each row execute function public.clear_visit_evidence_validation();
