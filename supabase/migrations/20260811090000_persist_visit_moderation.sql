-- Moderation state lived only on the row it moderated, and owners may delete
-- their own rows. So an owner could delete a hidden review and write a fresh one
-- that defaulted to visible, and the same worked one level up for a hidden visit.
--
-- The mark is keyed on (user_id, restaurant_id) — the pair the visits table
-- already holds unique — so it survives deleting and recreating the row it
-- describes. It is maintained by triggers on the hidden column rather than by the
-- moderation actions, because every moderation path converges on that write.
create table public.visit_moderation_marks (
  user_id uuid not null references auth.users(id) on delete cascade,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  visit_hidden boolean not null default false,
  review_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, restaurant_id)
);

create trigger visit_moderation_marks_set_updated_at
before update on public.visit_moderation_marks
for each row execute function public.set_updated_at();

alter table public.visit_moderation_marks enable row level security;

revoke all on public.visit_moderation_marks from public, anon, authenticated;
grant select on public.visit_moderation_marks to authenticated;
grant select, insert, update, delete on public.visit_moderation_marks
to service_role;

-- Owners can read their own marks so the collection can tell them their content
-- was moderated. Without that, inheriting the hidden state would be a silent
-- shadow ban: the owner would keep rewriting content nobody can see.
create policy "users read their moderation marks"
on public.visit_moderation_marks for select
to authenticated
using (auth.uid() = user_id);

create function public.record_visit_moderation_mark()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.visit_moderation_marks (
    user_id,
    restaurant_id,
    visit_hidden
  )
  values (new.user_id, new.restaurant_id, new.hidden)
  on conflict (user_id, restaurant_id) do update
  set visit_hidden = excluded.visit_hidden;

  return new;
end;
$$;

create function public.record_review_moderation_mark()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_id uuid;
  place_id uuid;
begin
  select visits.user_id, visits.restaurant_id
  into owner_id, place_id
  from public.visits
  where visits.id = new.visit_id;

  if owner_id is null then
    return new;
  end if;

  insert into public.visit_moderation_marks (
    user_id,
    restaurant_id,
    review_hidden
  )
  values (owner_id, place_id, new.hidden)
  on conflict (user_id, restaurant_id) do update
  set review_hidden = excluded.review_hidden;

  return new;
end;
$$;

create function public.apply_visit_moderation_mark()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.visit_moderation_marks
    where visit_moderation_marks.user_id = new.user_id
      and visit_moderation_marks.restaurant_id = new.restaurant_id
      and visit_moderation_marks.visit_hidden
  ) then
    new.hidden := true;
  end if;

  return new;
end;
$$;

create function public.apply_review_moderation_mark()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.visits
    join public.visit_moderation_marks
      on visit_moderation_marks.user_id = visits.user_id
      and visit_moderation_marks.restaurant_id = visits.restaurant_id
    where visits.id = new.visit_id
      and visit_moderation_marks.review_hidden
  ) then
    new.hidden := true;
  end if;

  return new;
end;
$$;

create trigger visits_record_moderation_mark
after update of hidden on public.visits
for each row
when (old.hidden is distinct from new.hidden)
execute function public.record_visit_moderation_mark();

create trigger reviews_record_moderation_mark
after update of hidden on public.reviews
for each row
when (old.hidden is distinct from new.hidden)
execute function public.record_review_moderation_mark();

create trigger visits_apply_moderation_mark
before insert on public.visits
for each row execute function public.apply_visit_moderation_mark();

create trigger reviews_apply_moderation_mark
before insert on public.reviews
for each row execute function public.apply_review_moderation_mark();
