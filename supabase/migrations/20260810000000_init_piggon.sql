create type public.publication_status as enum ('draft', 'published', 'archived');
create type public.restaurant_kind as enum ('pizzeria', 'restaurant', 'popup', 'franchise');
create type public.visit_evidence_type as enum ('photo', 'instagram');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 30),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.restaurants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  alternate_name text,
  description text,
  region text not null,
  address text,
  kakao_place_id text unique,
  latitude double precision,
  longitude double precision,
  kind public.restaurant_kind not null default 'pizzeria',
  status public.publication_status not null default 'draft',
  source_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  check (
    (latitude is null and longitude is null)
    or (latitude is not null and longitude is not null)
  )
);

create table public.restaurant_certifications (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null,
  issuer text not null,
  certification_number text,
  valid_from date,
  valid_until date,
  source_url text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (valid_until is null or valid_from is null or valid_from <= valid_until)
);

create table public.restaurant_awards (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  competition_name text not null,
  award_year integer not null check (award_year > 0),
  division text not null,
  placement text not null,
  source_url text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.restaurant_availability_periods (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  starts_on date not null,
  ends_on date,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on is null or starts_on <= ends_on)
);

create table public.videos (
  id uuid primary key default gen_random_uuid(),
  youtube_video_id text not null unique,
  canonical_url text not null unique,
  title text,
  thumbnail_url text,
  published_at timestamptz,
  metadata_fetch_state text not null default 'pending' check (
    metadata_fetch_state in ('pending', 'fetched', 'manual', 'failed')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.restaurant_videos (
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  video_id uuid not null references public.videos(id) on delete cascade,
  start_seconds integer check (start_seconds is null or start_seconds >= 0),
  context_note text,
  primary key (restaurant_id, video_id)
);

create table public.visits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  visited_on date not null,
  evidence_type public.visit_evidence_type not null,
  photo_path text,
  instagram_url text,
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, restaurant_id),
  check (
    (
      evidence_type = 'photo'
      and photo_path is not null
      and instagram_url is null
    )
    or (
      evidence_type = 'instagram'
      and instagram_url is not null
      and photo_path is null
    )
  )
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null unique references public.visits(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  body text not null check (char_length(body) between 1 and 2000),
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index restaurants_published_idx
on public.restaurants (name)
where status = 'published';

create index restaurant_certifications_restaurant_id_idx
on public.restaurant_certifications (restaurant_id);

create index restaurant_awards_restaurant_id_idx
on public.restaurant_awards (restaurant_id);

create index restaurant_availability_periods_restaurant_id_idx
on public.restaurant_availability_periods (restaurant_id, starts_on, ends_on);

create index restaurant_videos_video_id_idx
on public.restaurant_videos (video_id);

create index visits_restaurant_id_idx
on public.visits (restaurant_id)
where hidden = false;

create index visits_user_id_idx
on public.visits (user_id);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger restaurants_set_updated_at
before update on public.restaurants
for each row execute function public.set_updated_at();

create trigger restaurant_certifications_set_updated_at
before update on public.restaurant_certifications
for each row execute function public.set_updated_at();

create trigger restaurant_awards_set_updated_at
before update on public.restaurant_awards
for each row execute function public.set_updated_at();

create trigger restaurant_availability_periods_set_updated_at
before update on public.restaurant_availability_periods
for each row execute function public.set_updated_at();

create trigger videos_set_updated_at
before update on public.videos
for each row execute function public.set_updated_at();

create trigger visits_set_updated_at
before update on public.visits
for each row execute function public.set_updated_at();

create trigger reviews_set_updated_at
before update on public.reviews
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.restaurants enable row level security;
alter table public.restaurant_certifications enable row level security;
alter table public.restaurant_awards enable row level security;
alter table public.restaurant_availability_periods enable row level security;
alter table public.videos enable row level security;
alter table public.restaurant_videos enable row level security;
alter table public.visits enable row level security;
alter table public.reviews enable row level security;

create policy "published restaurants are public"
on public.restaurants for select
using (status = 'published');

create policy "published certifications are public"
on public.restaurant_certifications for select
using (
  exists (
    select 1
    from public.restaurants
    where restaurants.id = restaurant_certifications.restaurant_id
      and restaurants.status = 'published'
  )
);

create policy "published awards are public"
on public.restaurant_awards for select
using (
  exists (
    select 1
    from public.restaurants
    where restaurants.id = restaurant_awards.restaurant_id
      and restaurants.status = 'published'
  )
);

create policy "published availability is public"
on public.restaurant_availability_periods for select
using (
  exists (
    select 1
    from public.restaurants
    where restaurants.id = restaurant_availability_periods.restaurant_id
      and restaurants.status = 'published'
  )
);

create policy "videos for published restaurants are public"
on public.videos for select
using (
  exists (
    select 1
    from public.restaurant_videos
    join public.restaurants
      on restaurants.id = restaurant_videos.restaurant_id
    where restaurant_videos.video_id = videos.id
      and restaurants.status = 'published'
  )
);

create policy "published restaurant video links are public"
on public.restaurant_videos for select
using (
  exists (
    select 1
    from public.restaurants
    where restaurants.id = restaurant_videos.restaurant_id
      and restaurants.status = 'published'
  )
);

create policy "visible visits are public and owners retain access"
on public.visits for select
using (
  auth.uid() = user_id
  or (
    hidden = false
    and exists (
      select 1
      from public.restaurants
      where restaurants.id = visits.restaurant_id
        and restaurants.status = 'published'
    )
  )
);

create policy "safe profiles with visible visits are public"
on public.profiles for select
using (
  auth.uid() = id
  or exists (
    select 1
    from public.visits
    join public.restaurants
      on restaurants.id = visits.restaurant_id
    where visits.user_id = profiles.id
      and visits.hidden = false
      and restaurants.status = 'published'
  )
);

create policy "visible reviews are public and owners retain access"
on public.reviews for select
using (
  exists (
    select 1
    from public.visits
    join public.restaurants
      on restaurants.id = visits.restaurant_id
    where visits.id = reviews.visit_id
      and (
        visits.user_id = auth.uid()
        or (
          reviews.hidden = false
          and visits.hidden = false
          and restaurants.status = 'published'
        )
      )
  )
);

create policy "users insert their profile"
on public.profiles for insert
to authenticated
with check (auth.uid() = id);

create policy "users update their profile"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "users delete their profile"
on public.profiles for delete
to authenticated
using (auth.uid() = id);

create policy "users insert visits for published restaurants"
on public.visits for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.restaurants
    where restaurants.id = visits.restaurant_id
      and restaurants.status = 'published'
  )
);

create policy "users update their visits"
on public.visits for update
to authenticated
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.restaurants
    where restaurants.id = visits.restaurant_id
      and restaurants.status = 'published'
  )
);

create policy "users delete their visits"
on public.visits for delete
to authenticated
using (auth.uid() = user_id);

create policy "users insert reviews for their visits"
on public.reviews for insert
to authenticated
with check (
  exists (
    select 1
    from public.visits
    where visits.id = reviews.visit_id
      and visits.user_id = auth.uid()
  )
);

create policy "users update reviews for their visits"
on public.reviews for update
to authenticated
using (
  exists (
    select 1
    from public.visits
    where visits.id = reviews.visit_id
      and visits.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.visits
    where visits.id = reviews.visit_id
      and visits.user_id = auth.uid()
  )
);

create policy "users delete reviews for their visits"
on public.reviews for delete
to authenticated
using (
  exists (
    select 1
    from public.visits
    where visits.id = reviews.visit_id
      and visits.user_id = auth.uid()
  )
);

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'visit-evidence',
  'visit-evidence',
  false,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "users insert visit evidence in their folder"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'visit-evidence'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "users read their visit evidence"
on storage.objects for select
to authenticated
using (
  bucket_id = 'visit-evidence'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "users update their visit evidence"
on storage.objects for update
to authenticated
using (
  bucket_id = 'visit-evidence'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'visit-evidence'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "users delete their visit evidence"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'visit-evidence'
  and (storage.foldername(name))[1] = auth.uid()::text
);

grant usage on schema public to anon, authenticated, service_role;
grant select on all tables in schema public to anon, authenticated;
grant insert, update, delete on public.profiles to authenticated;
grant insert, update, delete on public.visits to authenticated;
grant insert, update, delete on public.reviews to authenticated;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
