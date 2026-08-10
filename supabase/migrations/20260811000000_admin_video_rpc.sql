create function public.upsert_video_with_restaurants(
  p_youtube_video_id text,
  p_canonical_url text,
  p_title text,
  p_thumbnail_url text,
  p_metadata_fetch_state text,
  p_links jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  saved_video_id uuid;
begin
  if p_youtube_video_id !~ '^[A-Za-z0-9_-]{11}$' then
    raise exception 'invalid YouTube video ID' using errcode = '22023';
  end if;

  if p_canonical_url <> ('https://www.youtube.com/watch?v=' || p_youtube_video_id) then
    raise exception 'invalid canonical YouTube URL' using errcode = '22023';
  end if;

  if p_metadata_fetch_state not in ('fetched', 'manual') then
    raise exception 'invalid saved metadata state' using errcode = '22023';
  end if;

  if jsonb_typeof(p_links) <> 'array' or jsonb_array_length(p_links) = 0 then
    raise exception 'at least one restaurant link is required' using errcode = '22023';
  end if;

  insert into public.videos (
    youtube_video_id,
    canonical_url,
    title,
    thumbnail_url,
    metadata_fetch_state
  )
  values (
    p_youtube_video_id,
    p_canonical_url,
    p_title,
    nullif(btrim(p_thumbnail_url), ''),
    p_metadata_fetch_state
  )
  on conflict (youtube_video_id) do update
  set canonical_url = excluded.canonical_url,
      title = excluded.title,
      thumbnail_url = excluded.thumbnail_url,
      metadata_fetch_state = excluded.metadata_fetch_state
  returning id into saved_video_id;

  delete from public.restaurant_videos
  where video_id = saved_video_id;

  insert into public.restaurant_videos (
    restaurant_id,
    video_id,
    start_seconds,
    context_note
  )
  select
    link.restaurant_id,
    saved_video_id,
    link.start_seconds,
    nullif(btrim(link.context_note), '')
  from jsonb_to_recordset(p_links) as link(
    restaurant_id uuid,
    start_seconds integer,
    context_note text
  );

  return saved_video_id;
end;
$$;

revoke all on function public.upsert_video_with_restaurants(
  text,
  text,
  text,
  text,
  text,
  jsonb
) from public, anon, authenticated;

grant execute on function public.upsert_video_with_restaurants(
  text,
  text,
  text,
  text,
  text,
  jsonb
) to service_role;
