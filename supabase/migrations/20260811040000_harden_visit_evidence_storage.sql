create table public.visit_photo_cleanup_jobs (
  path text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  last_error text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint visit_photo_cleanup_jobs_owned_path_check check (
    split_part(path, '/', 1) = user_id::text
    and array_length(string_to_array(path, '/'), 1) = 3
    and split_part(path, '/', 3) ~ '^[A-Za-z0-9_-]+\.(jpg|png|webp)$'
  )
);

create trigger visit_photo_cleanup_jobs_set_updated_at
before update on public.visit_photo_cleanup_jobs
for each row execute function public.set_updated_at();

alter table public.visit_photo_cleanup_jobs enable row level security;

revoke all on public.visit_photo_cleanup_jobs from public, anon, authenticated;
grant select, insert, update, delete on public.visit_photo_cleanup_jobs
to service_role;

create function public.current_user_visit_evidence_count()
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)
  from storage.objects
  where objects.bucket_id = 'visit-evidence'
    and objects.owner_id = auth.uid()::text;
$$;

revoke all on function public.current_user_visit_evidence_count() from public;
grant execute on function public.current_user_visit_evidence_count()
to authenticated;

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
  and public.current_user_visit_evidence_count() < 50
);
