create function public.save_restaurant_with_attributes(
  p_restaurant jsonb,
  p_certifications jsonb,
  p_awards jsonb,
  p_availability_periods jsonb,
  p_restaurant_id uuid default null
)
returns table (restaurant_id uuid, restaurant_slug text)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  input record;
  saved_restaurant_id uuid;
  saved_restaurant_slug text;
begin
  if jsonb_typeof(p_restaurant) <> 'object' then
    raise exception 'restaurant must be an object' using errcode = '22023';
  end if;

  if jsonb_typeof(p_certifications) <> 'array'
    or jsonb_typeof(p_awards) <> 'array'
    or jsonb_typeof(p_availability_periods) <> 'array'
  then
    raise exception 'restaurant attributes must be arrays' using errcode = '22023';
  end if;

  select * into input
  from jsonb_to_record(p_restaurant) as value(
    slug text,
    name text,
    alternate_name text,
    description text,
    region text,
    address text,
    kakao_place_id text,
    latitude double precision,
    longitude double precision,
    kind public.restaurant_kind,
    status public.publication_status,
    source_url text,
    updated_by uuid
  );

  if p_restaurant_id is null then
    insert into public.restaurants (
      slug,
      name,
      alternate_name,
      description,
      region,
      address,
      kakao_place_id,
      latitude,
      longitude,
      kind,
      status,
      source_url,
      updated_by
    )
    values (
      input.slug,
      input.name,
      input.alternate_name,
      input.description,
      input.region,
      input.address,
      input.kakao_place_id,
      input.latitude,
      input.longitude,
      input.kind,
      input.status,
      input.source_url,
      input.updated_by
    )
    returning id, slug into saved_restaurant_id, saved_restaurant_slug;
  else
    update public.restaurants as restaurant
    set slug = input.slug,
        name = input.name,
        alternate_name = input.alternate_name,
        description = input.description,
        region = input.region,
        address = input.address,
        kakao_place_id = input.kakao_place_id,
        latitude = input.latitude,
        longitude = input.longitude,
        kind = input.kind,
        status = input.status,
        source_url = input.source_url,
        updated_by = input.updated_by
    where restaurant.id = p_restaurant_id
    returning restaurant.id, restaurant.slug
    into saved_restaurant_id, saved_restaurant_slug;

    if saved_restaurant_id is null then
      raise exception 'restaurant not found' using errcode = 'P0002';
    end if;
  end if;

  delete from public.restaurant_certifications as certification
  where certification.restaurant_id = saved_restaurant_id;

  insert into public.restaurant_certifications (
    restaurant_id,
    name,
    issuer,
    certification_number,
    valid_from,
    valid_until,
    source_url
  )
  select
    saved_restaurant_id,
    certification.name,
    certification.issuer,
    certification.certification_number,
    certification.valid_from,
    certification.valid_until,
    certification.source_url
  from jsonb_to_recordset(p_certifications) as certification(
    name text,
    issuer text,
    certification_number text,
    valid_from date,
    valid_until date,
    source_url text
  );

  delete from public.restaurant_awards as award
  where award.restaurant_id = saved_restaurant_id;

  insert into public.restaurant_awards (
    restaurant_id,
    competition_name,
    award_year,
    division,
    placement,
    source_url
  )
  select
    saved_restaurant_id,
    award.competition_name,
    award.award_year,
    award.division,
    award.placement,
    award.source_url
  from jsonb_to_recordset(p_awards) as award(
    competition_name text,
    award_year integer,
    division text,
    placement text,
    source_url text
  );

  delete from public.restaurant_availability_periods as period
  where period.restaurant_id = saved_restaurant_id;

  insert into public.restaurant_availability_periods (
    restaurant_id,
    starts_on,
    ends_on,
    note
  )
  select
    saved_restaurant_id,
    period.starts_on,
    period.ends_on,
    period.note
  from jsonb_to_recordset(p_availability_periods) as period(
    starts_on date,
    ends_on date,
    note text
  );

  return query select saved_restaurant_id, saved_restaurant_slug;
end;
$$;

revoke all on function public.save_restaurant_with_attributes(
  jsonb,
  jsonb,
  jsonb,
  jsonb,
  uuid
) from public, anon, authenticated;

grant execute on function public.save_restaurant_with_attributes(
  jsonb,
  jsonb,
  jsonb,
  jsonb,
  uuid
) to service_role;
