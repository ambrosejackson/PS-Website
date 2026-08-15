-- Dev seed data — idempotent (safe to re-run).
-- store_locations / product_availability rows are MOCK data for building the
-- Phase-2 UI before the PSM geo backfill + publish pipeline exist. The site only
-- reads them when MOCK_PSM_DATA=true. Fixed UUIDs prefixed 00000000-… mark them
-- as mock; the real publish pipeline uses PSM retail_accounts ids.

-- ===== Heroes: 1 default + 3 nav-hover assets for the landing page =====
insert into public.content_heroes (id, page, nav_target, media_url, media_type, theme, is_default, sort_order, is_active) values
  ('10000000-0000-4000-8000-000000000001', '/', null,            '/placeholders/hero-default.svg',       'image', 'dark',  true,  1, true),
  ('10000000-0000-4000-8000-000000000002', '/', 'BRANDS',        '/placeholders/hero-brands.svg',        'image', 'dark',  false, 2, true),
  ('10000000-0000-4000-8000-000000000003', '/', 'STORE LOCATOR', '/placeholders/hero-store-locator.svg', 'image', 'dark',  false, 3, true),
  ('10000000-0000-4000-8000-000000000004', '/', 'YOUR REWARDS',  '/placeholders/hero-rewards-light.svg', 'image', 'light', false, 4, true)
on conflict (id) do update set
  page = excluded.page, nav_target = excluded.nav_target, media_url = excluded.media_url,
  media_type = excluded.media_type, theme = excluded.theme, is_default = excluded.is_default,
  sort_order = excluded.sort_order, is_active = excluded.is_active;

-- ===== Banner carousel: 3 slides =====
insert into public.content_banners (id, media_url, media_type, link_url, sort_order, is_active) values
  ('20000000-0000-4000-8000-000000000001', '/placeholders/banner-1.svg', 'image', '/products',      1, true),
  ('20000000-0000-4000-8000-000000000002', '/placeholders/banner-2.svg', 'image', '/apparel',       2, true),
  ('20000000-0000-4000-8000-000000000003', '/placeholders/banner-3.svg', 'image', '/store-locator', 3, true)
on conflict (id) do update set
  media_url = excluded.media_url, media_type = excluded.media_type, link_url = excluded.link_url,
  sort_order = excluded.sort_order, is_active = excluded.is_active;

-- ===== Blog: 3 placeholder posts =====
insert into public.blog_posts (id, title, slug, excerpt, hero_image, body_md, published_at, is_published, seo) values
  ('30000000-0000-4000-8000-000000000001',
   'Welcome to the New Private Stock',
   'welcome-to-the-new-private-stock',
   'A first look at the rebuilt privatestock.co — built around our brands, our stores, and the people who support them.',
   '/placeholders/blog-1.svg',
   E'Placeholder post. Final copy TBD.\n\nThis post exists so the In the News section, the /news index, and per-post SEO pages can be built and reviewed before launch content lands.',
   now() - interval '2 days', true,
   '{"title":"Welcome to the New Private Stock","description":"A first look at the rebuilt privatestock.co."}'),
  ('30000000-0000-4000-8000-000000000002',
   'Inside the Grow: A Dedication to the Exceptional',
   'inside-the-grow',
   'Restraint, precision, and intention — how we control every element from cultivation to retail.',
   '/placeholders/blog-2.svg',
   E'Placeholder post. Final copy TBD.',
   now() - interval '1 day', true,
   '{"title":"Inside the Grow","description":"How Private Stock controls every element from cultivation to retail."}'),
  ('30000000-0000-4000-8000-000000000003',
   'Find Us: Where to Buy Private Stock Brands',
   'where-to-buy-private-stock',
   'Our store locator is coming online — here''s how availability will work.',
   '/placeholders/blog-3.svg',
   E'Placeholder post. Final copy TBD.',
   now(), true,
   '{"title":"Where to Buy Private Stock Brands","description":"How the Private Stock store locator and availability work."}')
on conflict (id) do update set
  title = excluded.title, slug = excluded.slug, excerpt = excluded.excerpt,
  hero_image = excluded.hero_image, body_md = excluded.body_md,
  published_at = excluded.published_at, is_published = excluded.is_published, seo = excluded.seo;

-- ===== MOCK store_locations (Chicago-area, clearly fake names) =====
insert into public.store_locations
  (id, name, chain_name, address_line1, city, state, zip, latitude, longitude, phone, menu_url, brands, last_delivery_within_90d, availability_tier, availability_checked_at) values
  ('00000000-0000-4000-8000-000000000001', 'Mock Dispensary — River North', 'Mock Chain', '400 N Clark St',   'Chicago',    'IL', '60654', 41.8896, -87.6314, '(312) 555-0101', 'https://example.com/menus/river-north', '{Outfitters,TerpKings,"Higher Self"}',          true,  'live',   now() - interval '1 day'),
  ('00000000-0000-4000-8000-000000000002', 'Mock Dispensary — Wicker Park', 'Mock Chain', '1500 N Milwaukee Ave', 'Chicago', 'IL', '60622', 41.9088, -87.6796, '(312) 555-0102', 'https://example.com/menus/wicker-park', '{Outfitters,"Savage Squad Strains"}',           true,  'live',   now() - interval '2 days'),
  ('00000000-0000-4000-8000-000000000003', 'Mock Dispensary — Evanston',    null,         '900 Church St',    'Evanston',   'IL', '60201', 42.0475, -87.6828, '(847) 555-0103', 'https://example.com/menus/evanston',    '{TerpKings,"Higher Self"}',                     true,  'recent', now() - interval '20 days'),
  ('00000000-0000-4000-8000-000000000004', 'Mock Dispensary — Naperville',  'Mock Chain', '55 S Main St',     'Naperville', 'IL', '60540', 41.7727, -88.1535, '(630) 555-0104', 'https://example.com/menus/naperville',  '{"Savage Squad Strains","Higher Self"}',        true,  'recent', now() - interval '35 days'),
  ('00000000-0000-4000-8000-000000000005', 'Mock Dispensary — Springfield', null,         '10 Capitol Ave',   'Springfield','IL', '62701', 39.7990, -89.6540, '(217) 555-0105', null,                                     '{Outfitters}',                                  false, 'listed', null),
  ('00000000-0000-4000-8000-000000000006', 'Mock Dispensary — Rockford',    null,         '200 E State St',   'Rockford',   'IL', '61104', 42.2711, -89.0937, '(815) 555-0106', 'https://example.com/menus/rockford',    '{TerpKings}',                                   false, 'listed', null)
on conflict (id) do update set
  name = excluded.name, chain_name = excluded.chain_name, address_line1 = excluded.address_line1,
  city = excluded.city, state = excluded.state, zip = excluded.zip,
  latitude = excluded.latitude, longitude = excluded.longitude, phone = excluded.phone,
  menu_url = excluded.menu_url, brands = excluded.brands,
  last_delivery_within_90d = excluded.last_delivery_within_90d,
  availability_tier = excluded.availability_tier, availability_checked_at = excluded.availability_checked_at;

-- ===== MOCK product_availability (presence + link + image ONLY — no prices, ever) =====
insert into public.product_availability (store_id, brand, product_name, variant, menu_product_url, image_url, checked_at) values
  ('00000000-0000-4000-8000-000000000001', 'Outfitters',           'Trail Mix Flower',     '3.5g',  'https://example.com/menus/river-north/trail-mix',   '/placeholders/product.svg', now() - interval '1 day'),
  ('00000000-0000-4000-8000-000000000001', 'TerpKings',            'Citrus Haze Cart',     '1g',    'https://example.com/menus/river-north/citrus-haze', '/placeholders/product.svg', now() - interval '1 day'),
  ('00000000-0000-4000-8000-000000000001', 'Higher Self',          'Calm Gummies',         '100mg', 'https://example.com/menus/river-north/calm',        '/placeholders/product.svg', now() - interval '1 day'),
  ('00000000-0000-4000-8000-000000000002', 'Outfitters',           'Trail Mix Flower',     '3.5g',  'https://example.com/menus/wicker-park/trail-mix',   '/placeholders/product.svg', now() - interval '2 days'),
  ('00000000-0000-4000-8000-000000000002', 'Savage Squad Strains', 'Savage OG',            '3.5g',  'https://example.com/menus/wicker-park/savage-og',   '/placeholders/product.svg', now() - interval '2 days'),
  ('00000000-0000-4000-8000-000000000003', 'TerpKings',            'Citrus Haze Cart',     '1g',    'https://example.com/menus/evanston/citrus-haze',    '/placeholders/product.svg', now() - interval '20 days'),
  ('00000000-0000-4000-8000-000000000003', 'Higher Self',          'Calm Gummies',         '100mg', 'https://example.com/menus/evanston/calm',           '/placeholders/product.svg', now() - interval '20 days'),
  ('00000000-0000-4000-8000-000000000004', 'Savage Squad Strains', 'Savage OG',            '3.5g',  'https://example.com/menus/naperville/savage-og',    '/placeholders/product.svg', now() - interval '35 days')
on conflict (store_id, brand, product_name, variant) do update set
  menu_product_url = excluded.menu_product_url, image_url = excluded.image_url, checked_at = excluded.checked_at;

-- ===== Catalog products: 2 per allowlisted brand so grids/detail pages render =====
insert into public.catalog_products
  (id, brand, name, slug, category, format, weight, thc_range, description, image_url, terpene_profile, terp_category, is_active, sort_order) values
  ('40000000-0000-4000-8000-000000000001', 'Outfitters', 'Trail Mix Flower', 'outfitters-trail-mix-flower', 'Flower', 'Whole Flower', '3.5g', '24–28%',
   'Placeholder description — final copy syncs from the iHeartJane sheet.', '/placeholders/product.svg',
   '[{"name":"Myrcene","note":"earthy"},{"name":"Limonene","note":"citrus"}]', null, true, 1),
  ('40000000-0000-4000-8000-000000000002', 'Outfitters', 'Basecamp Pre-Rolls', 'outfitters-basecamp-pre-rolls', 'Pre-Rolls', '5-pack', '2.5g', '20–24%',
   'Placeholder description — final copy syncs from the iHeartJane sheet.', '/placeholders/product.svg',
   '[{"name":"Pinene","note":"pine"},{"name":"Caryophyllene","note":"pepper"}]', null, true, 2),
  ('40000000-0000-4000-8000-000000000003', 'TerpKings', 'Citrus Haze Cart', 'terpkings-citrus-haze-cart', 'Vapes', 'Cartridge', '1g', '80–85%',
   'Placeholder description — final copy syncs from the iHeartJane sheet.', '/placeholders/product.svg',
   '[{"name":"Limonene","note":"citrus"},{"name":"Terpinolene","note":"haze"}]', 'fruit', true, 1),
  ('40000000-0000-4000-8000-000000000004', 'TerpKings', 'Gas Giant Flower', 'terpkings-gas-giant-flower', 'Flower', 'Whole Flower', '3.5g', '26–30%',
   'Placeholder description — final copy syncs from the iHeartJane sheet.', '/placeholders/product.svg',
   '[{"name":"Caryophyllene","note":"gas"},{"name":"Myrcene","note":"earthy"}]', 'gas', true, 2),
  ('40000000-0000-4000-8000-000000000005', 'Higher Self', 'Calm Gummies', 'higherself-calm-gummies', 'Edibles', 'Gummies', '100mg', '100mg',
   'Placeholder description — final copy syncs from the iHeartJane sheet.', '/placeholders/product.svg',
   '[{"name":"Linalool","note":"floral"},{"name":"Limonene","note":"citrus"}]', null, true, 1),
  ('40000000-0000-4000-8000-000000000006', 'Higher Self', 'Elevate Vape', 'higherself-elevate-vape', 'Vapes', 'Disposable', '0.5g', '78–82%',
   'Placeholder description — final copy syncs from the iHeartJane sheet.', '/placeholders/product.svg',
   '[{"name":"Terpinolene","note":"uplifting"},{"name":"Pinene","note":"pine"}]', null, true, 2),
  ('40000000-0000-4000-8000-000000000007', 'Savage Squad Strains', 'Savage OG', 'savagesquadstrains-savage-og', 'Flower', 'Whole Flower', '3.5g', '28–32%',
   'Placeholder description — final copy syncs from the iHeartJane sheet.', '/placeholders/product.svg',
   '[{"name":"Myrcene","note":"earthy"},{"name":"Caryophyllene","note":"gas"}]', null, true, 1),
  ('40000000-0000-4000-8000-000000000008', 'Savage Squad Strains', 'Squad Snacks Gummies', 'savagesquadstrains-squad-snacks', 'Edibles', 'Gummies', '100mg', '100mg',
   'Placeholder description — final copy syncs from the iHeartJane sheet.', '/placeholders/product.svg',
   '[{"name":"Limonene","note":"citrus"},{"name":"Humulene","note":"hops"}]', null, true, 2)
on conflict (id) do update set
  brand = excluded.brand, name = excluded.name, slug = excluded.slug, category = excluded.category,
  format = excluded.format, weight = excluded.weight, thc_range = excluded.thc_range,
  description = excluded.description, image_url = excluded.image_url,
  terpene_profile = excluded.terpene_profile, terp_category = excluded.terp_category,
  is_active = excluded.is_active, sort_order = excluded.sort_order;

-- ===== Merch placeholders so the landing Apparel grid renders =====
insert into public.merch_products (id, name, slug, description, brand, images, is_active, sort_order) values
  ('50000000-0000-4000-8000-000000000001', 'Private Stock Tee',       'private-stock-tee',      'Placeholder merch product.', null, '["/placeholders/merch-1.svg"]', true, 1),
  ('50000000-0000-4000-8000-000000000002', 'Private Stock Hoodie',    'private-stock-hoodie',   'Placeholder merch product.', null, '["/placeholders/merch-2.svg"]', true, 2),
  ('50000000-0000-4000-8000-000000000003', 'Outfitters Cap',          'outfitters-cap',         'Placeholder merch product.', 'Outfitters', '["/placeholders/merch-3.svg"]', true, 3),
  ('50000000-0000-4000-8000-000000000004', 'Higher Self Crewneck',    'higherself-crewneck',    'Placeholder merch product.', 'Higher Self', '["/placeholders/merch-4.svg"]', true, 4)
on conflict (id) do update set
  name = excluded.name, slug = excluded.slug, description = excluded.description,
  brand = excluded.brand, images = excluded.images, is_active = excluded.is_active,
  sort_order = excluded.sort_order;
