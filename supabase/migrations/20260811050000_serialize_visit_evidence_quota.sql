-- The evidence quota was a bare count predicate. Under READ COMMITTED two concurrent
-- uploads from the same user each read the pre-insert total, because neither sees the
-- other's uncommitted row, so both passed `< 50` and the limit was not a limit.
-- Taking a per-user transaction lock before counting serializes those attempts: the
-- second one waits for the first to commit and then counts it.
create or replace function public.current_user_visit_evidence_count()
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
    and objects.owner_id = auth.uid()::text;

  return evidence_count;
end;
$$;
