begin;

select plan(8);

select has_function(
  'public',
  'save_restaurant_with_attributes',
  array['jsonb', 'jsonb', 'jsonb', 'jsonb', 'uuid'],
  'transactional restaurant save exists'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.save_restaurant_with_attributes(jsonb,jsonb,jsonb,jsonb,uuid)',
    'execute'
  ),
  'anonymous users cannot execute the restaurant save'
);

select ok(
  has_function_privilege(
    'service_role',
    'public.save_restaurant_with_attributes(jsonb,jsonb,jsonb,jsonb,uuid)',
    'execute'
  ),
  'the server service role can execute the restaurant save'
);

set local role service_role;

select lives_ok(
  $$select public.save_restaurant_with_attributes(
    '{
      "slug": "atomic-pizza",
      "name": "원래 이름",
      "alternate_name": null,
      "description": "원래 설명",
      "region": "서울",
      "address": "서울 테스트로 1",
      "kakao_place_id": null,
      "latitude": 37.5,
      "longitude": 127.0,
      "kind": "pizzeria",
      "status": "published",
      "source_url": "https://example.com/source",
      "updated_by": null
    }'::jsonb,
    '[{
      "name": "AVPN",
      "issuer": "AVPN",
      "certification_number": null,
      "valid_from": "2026-01-01",
      "valid_until": null,
      "source_url": "https://example.com/certification"
    }]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    null
  )$$,
  'restaurant and attributes are inserted together'
);

reset role;

select results_eq(
  $$select restaurants.name, restaurants.status, count(restaurant_certifications.id)::integer
    from public.restaurants
    left join public.restaurant_certifications
      on restaurant_certifications.restaurant_id = restaurants.id
    where restaurants.slug = 'atomic-pizza'
    group by restaurants.name, restaurants.status$$,
  $$values ('원래 이름'::text, 'published'::public.publication_status, 1)$$,
  'the base row and certification are committed'
);

set local role service_role;

select throws_ok(
  $$select public.save_restaurant_with_attributes(
    '{
      "slug": "atomic-pizza",
      "name": "손실되면 안 되는 이름",
      "alternate_name": null,
      "description": "실패하는 변경",
      "region": "서울",
      "address": "서울 테스트로 2",
      "kakao_place_id": null,
      "latitude": 37.5,
      "longitude": 127.0,
      "kind": "pizzeria",
      "status": "draft",
      "source_url": "https://example.com/source",
      "updated_by": null
    }'::jsonb,
    '[{
      "name": "잘못된 인증",
      "issuer": "테스트",
      "certification_number": null,
      "valid_from": "2026-12-31",
      "valid_until": "2026-01-01",
      "source_url": "https://example.com/invalid"
    }]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    (select id from public.restaurants where slug = 'atomic-pizza')
  )$$,
  '23514',
  null,
  'an invalid attribute aborts the complete restaurant save'
);

reset role;

select results_eq(
  $$select name, status from public.restaurants where slug = 'atomic-pizza'$$,
  $$values ('원래 이름'::text, 'published'::public.publication_status)$$,
  'a failed attribute replacement preserves the base row and publication state'
);

select results_eq(
  $$select name from public.restaurant_certifications
    where restaurant_id = (select id from public.restaurants where slug = 'atomic-pizza')$$,
  $$values ('AVPN'::text)$$,
  'a failed attribute replacement preserves the previous attributes'
);

select * from finish();

rollback;
