-- Dev seed data — idempotent (safe to re-run).
-- store_locations / product_availability rows are MOCK data for building the
-- Phase-2 UI before the PSM geo backfill + publish pipeline exist. The site only
-- reads them when MOCK_PSM_DATA=true. Fixed UUIDs prefixed 00000000-… mark them
-- as mock; the real publish pipeline uses PSM retail_accounts ids.
-- Product names follow the naming style in docs/reference/lovable screenshots.

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
insert into public.content_banners (id, media_url, media_type, link_url, badge_text, sort_order, is_active) values
  ('20000000-0000-4000-8000-000000000001', '/placeholders/banner-1.svg', 'image', '/products',      'SEASONAL LIMITED DROP', 1, true),
  ('20000000-0000-4000-8000-000000000002', '/placeholders/banner-2.svg', 'image', '/apparel',       null,                    2, true),
  ('20000000-0000-4000-8000-000000000003', '/placeholders/banner-3.svg', 'image', '/store-locator', null,                    3, true)
on conflict (id) do update set
  media_url = excluded.media_url, media_type = excluded.media_type, link_url = excluded.link_url,
  badge_text = excluded.badge_text, sort_order = excluded.sort_order, is_active = excluded.is_active;

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
delete from public.product_availability where store_id in (select id from public.store_locations where id::text like '00000000%');
insert into public.product_availability (store_id, brand, product_name, variant, menu_product_url, image_url, checked_at) values
  ('00000000-0000-4000-8000-000000000001', 'Outfitters',           '3.5G Top Shelf Flower',                              '3.5g',  'https://example.com/menus/river-north/top-shelf',  '/placeholders/product.svg', now() - interval '1 day'),
  ('00000000-0000-4000-8000-000000000001', 'TerpKings',            '0.5G Live Rosin Astro Vape All-In-One (Fruit/Dessert/Gas)', '0.5g', 'https://example.com/menus/river-north/astro-vape', '/placeholders/product.svg', now() - interval '1 day'),
  ('00000000-0000-4000-8000-000000000001', 'Higher Self',          '5-Pack 0.35G Infused Pre-Rolls',                     '5pk',   'https://example.com/menus/river-north/infused-prerolls', '/placeholders/product.svg', now() - interval '1 day'),
  ('00000000-0000-4000-8000-000000000002', 'Outfitters',           '3.5G Top Shelf Flower',                              '3.5g',  'https://example.com/menus/wicker-park/top-shelf',  '/placeholders/product.svg', now() - interval '2 days'),
  ('00000000-0000-4000-8000-000000000002', 'Savage Squad Strains', '3.5G Exotic Small-Batch Flower',                     '3.5g',  'https://example.com/menus/wicker-park/exotic',     '/placeholders/product.svg', now() - interval '2 days'),
  ('00000000-0000-4000-8000-000000000003', 'TerpKings',            '0.5G Live Rosin Astro Vape All-In-One (Fruit/Dessert/Gas)', '0.5g', 'https://example.com/menus/evanston/astro-vape', '/placeholders/product.svg', now() - interval '20 days'),
  ('00000000-0000-4000-8000-000000000003', 'Higher Self',          '5-Pack 0.35G Infused Pre-Rolls',                     '5pk',   'https://example.com/menus/evanston/infused-prerolls', '/placeholders/product.svg', now() - interval '20 days'),
  ('00000000-0000-4000-8000-000000000004', 'Savage Squad Strains', '3.5G Exotic Small-Batch Flower',                     '3.5g',  'https://example.com/menus/naperville/exotic',      '/placeholders/product.svg', now() - interval '35 days');

-- ===== Catalog: 6 per allowlisted brand, screenshot naming style =====
delete from public.catalog_products where id::text like '40000000%';
insert into public.catalog_products
  (id, brand, name, slug, category, format, weight, thc_range, description, image_url, terpene_profile, terp_category, is_active, sort_order) values
  -- Outfitters
  ('40000000-0000-4000-8000-000000000001', 'Outfitters', '3.5G Top Shelf Flower', 'outfitters-3-5g-top-shelf-flower', 'Flower', 'Whole Flower', '3.5g', '24–28%',
   'Placeholder description — final copy syncs from the iHeartJane sheet.', '/placeholders/product.svg',
   '[{"name":"Myrcene","note":"earthy"},{"name":"Limonene","note":"citrus"}]', null, true, 1),
  ('40000000-0000-4000-8000-000000000002', 'Outfitters', '1G Top Shelf Flower', 'outfitters-1g-top-shelf-flower', 'Flower', 'Whole Flower', '1g', '24–28%',
   'Placeholder description — final copy syncs from the iHeartJane sheet.', '/placeholders/product.svg',
   '[{"name":"Myrcene","note":"earthy"},{"name":"Pinene","note":"pine"}]', null, true, 2),
  ('40000000-0000-4000-8000-000000000003', 'Outfitters', '7G Gun Powder Premium Ground Flower', 'outfitters-7g-gun-powder-premium-ground-flower', 'Flower', 'Ground Flower', '7g', '22–26%',
   'Placeholder description — final copy syncs from the iHeartJane sheet.', '/placeholders/product.svg',
   '[{"name":"Caryophyllene","note":"pepper"},{"name":"Myrcene","note":"earthy"}]', null, true, 3),
  ('40000000-0000-4000-8000-000000000004', 'Outfitters', '7G Gun Powder Infused Ground Flower', 'outfitters-7g-gun-powder-infused-ground-flower', 'Flower', 'Infused Ground Flower', '7g', '30–35%',
   'Placeholder description — final copy syncs from the iHeartJane sheet.', '/placeholders/product.svg',
   '[{"name":"Caryophyllene","note":"pepper"},{"name":"Limonene","note":"citrus"}]', null, true, 4),
  ('40000000-0000-4000-8000-000000000005', 'Outfitters', '5-Pack 0.7G Luckies Cigarette-Style Pre-Rolls', 'outfitters-5-pack-0-7g-luckies-pre-rolls', 'Pre-Rolls', '5-Pack', '3.5g', '22–26%',
   'Placeholder description — final copy syncs from the iHeartJane sheet.', '/placeholders/product.svg',
   '[{"name":"Pinene","note":"pine"},{"name":"Myrcene","note":"earthy"}]', null, true, 5),
  ('40000000-0000-4000-8000-000000000006', 'Outfitters', '2G Rosin Infused Glasstip Blunt', 'outfitters-2g-rosin-infused-glasstip-blunt', 'Pre-Rolls', 'Blunt', '2g', '35–40%',
   'Placeholder description — final copy syncs from the iHeartJane sheet.', '/placeholders/product.svg',
   '[{"name":"Caryophyllene","note":"gas"},{"name":"Humulene","note":"hops"}]', null, true, 6),
  -- TerpKings
  ('40000000-0000-4000-8000-000000000007', 'TerpKings', '5-Pack Rosin Infused Kief Coated Pre-Rolls (Fruit)', 'terpkings-5-pack-rosin-kief-pre-rolls-fruit', 'Pre-Rolls', '5-Pack', '2.5g', '32–38%',
   'Placeholder description — final copy syncs from the iHeartJane sheet.', '/placeholders/product.svg',
   '[{"name":"Limonene","note":"citrus"},{"name":"Terpinolene","note":"fruity"}]', 'fruit', true, 1),
  ('40000000-0000-4000-8000-000000000008', 'TerpKings', '5-Pack Rosin Infused Kief Coated Pre-Rolls (Dessert)', 'terpkings-5-pack-rosin-kief-pre-rolls-dessert', 'Pre-Rolls', '5-Pack', '2.5g', '32–38%',
   'Placeholder description — final copy syncs from the iHeartJane sheet.', '/placeholders/product.svg',
   '[{"name":"Linalool","note":"sweet"},{"name":"Caryophyllene","note":"spice"}]', 'dessert', true, 2),
  ('40000000-0000-4000-8000-000000000009', 'TerpKings', '0.5G Live Rosin Astro Vape All-In-One (Fruit/Dessert/Gas)', 'terpkings-0-5g-live-rosin-astro-vape', 'Vapes', 'All-In-One', '0.5g', '75–82%',
   'Placeholder description — final copy syncs from the iHeartJane sheet.', '/placeholders/product.svg',
   '[{"name":"Limonene","note":"citrus"},{"name":"Myrcene","note":"gas"}]', 'gas', true, 3),
  ('40000000-0000-4000-8000-000000000010', 'TerpKings', '0.5G Liquid Diamond Astro Vape All-In-One (Fruit)', 'terpkings-0-5g-liquid-diamond-astro-vape-fruit', 'Vapes', 'All-In-One', '0.5g', '80–88%',
   'Placeholder description — final copy syncs from the iHeartJane sheet.', '/placeholders/product.svg',
   '[{"name":"Terpinolene","note":"fruity"},{"name":"Limonene","note":"citrus"}]', 'fruit', true, 4),
  ('40000000-0000-4000-8000-000000000011', 'TerpKings', '0.5G Liquid Diamond Astro Vape All-In-One (Dessert)', 'terpkings-0-5g-liquid-diamond-astro-vape-dessert', 'Vapes', 'All-In-One', '0.5g', '80–88%',
   'Placeholder description — final copy syncs from the iHeartJane sheet.', '/placeholders/product.svg',
   '[{"name":"Linalool","note":"sweet"},{"name":"Humulene","note":"rich"}]', 'dessert', true, 5),
  ('40000000-0000-4000-8000-000000000012', 'TerpKings', 'TerpBurstz Fast-Acting Long-Lasting Gummies 100MG', 'terpkings-terpburstz-gummies-100mg', 'Edibles', 'Gummies', '100mg', '100mg',
   'Placeholder description — final copy syncs from the iHeartJane sheet.', '/placeholders/product.svg',
   '[{"name":"Limonene","note":"citrus"},{"name":"Linalool","note":"floral"}]', 'fruit', true, 6),
  -- Higher Self
  ('40000000-0000-4000-8000-000000000013', 'Higher Self', '10-Pack 0.35G Infused Pre-Rolls', 'higherself-10-pack-0-35g-infused-pre-rolls', 'Pre-Rolls', '10-Pack', '3.5g', '30–36%',
   'Placeholder description — final copy syncs from the iHeartJane sheet.', '/placeholders/product.svg',
   '[{"name":"Linalool","note":"floral"},{"name":"Limonene","note":"citrus"}]', null, true, 1),
  ('40000000-0000-4000-8000-000000000014', 'Higher Self', '5-Pack 0.35G Infused Pre-Rolls', 'higherself-5-pack-0-35g-infused-pre-rolls', 'Pre-Rolls', '5-Pack', '1.75g', '30–36%',
   'Placeholder description — final copy syncs from the iHeartJane sheet.', '/placeholders/product.svg',
   '[{"name":"Linalool","note":"floral"},{"name":"Myrcene","note":"calm"}]', null, true, 2),
  ('40000000-0000-4000-8000-000000000015', 'Higher Self', '2-Pack 0.35G Infused Pre-Rolls', 'higherself-2-pack-0-35g-infused-pre-rolls', 'Pre-Rolls', '2-Pack', '0.7g', '30–36%',
   'Placeholder description — final copy syncs from the iHeartJane sheet.', '/placeholders/product.svg',
   '[{"name":"Linalool","note":"floral"},{"name":"Pinene","note":"clear"}]', null, true, 3),
  ('40000000-0000-4000-8000-000000000016', 'Higher Self', '3.5G / 7G / 14G Premium Flower', 'higherself-premium-flower', 'Flower', 'Whole Flower', '3.5g–14g', '22–28%',
   'Placeholder description — final copy syncs from the iHeartJane sheet.', '/placeholders/product.svg',
   '[{"name":"Myrcene","note":"earthy"},{"name":"Limonene","note":"citrus"}]', null, true, 4),
  ('40000000-0000-4000-8000-000000000017', 'Higher Self', '1G / 2G Vape Stone All-In-One Vape', 'higherself-vape-stone-all-in-one', 'Vapes', 'All-In-One', '1g–2g', '78–85%',
   'Placeholder description — final copy syncs from the iHeartJane sheet.', '/placeholders/product.svg',
   '[{"name":"Terpinolene","note":"uplifting"},{"name":"Pinene","note":"pine"}]', null, true, 5),
  ('40000000-0000-4000-8000-000000000018', 'Higher Self', '1G / 2G Vape Cartridge', 'higherself-vape-cartridge', 'Vapes', 'Cartridge', '1g–2g', '78–85%',
   'Placeholder description — final copy syncs from the iHeartJane sheet.', '/placeholders/product.svg',
   '[{"name":"Limonene","note":"citrus"},{"name":"Caryophyllene","note":"spice"}]', null, true, 6),
  -- Savage Squad Strains (names invented in the same style — not visible in screenshots)
  ('40000000-0000-4000-8000-000000000019', 'Savage Squad Strains', '3.5G Exotic Small-Batch Flower', 'savagesquadstrains-3-5g-exotic-small-batch-flower', 'Flower', 'Whole Flower', '3.5g', '28–32%',
   'Placeholder description — final copy syncs from the iHeartJane sheet.', '/placeholders/product.svg',
   '[{"name":"Myrcene","note":"earthy"},{"name":"Caryophyllene","note":"gas"}]', null, true, 1),
  ('40000000-0000-4000-8000-000000000020', 'Savage Squad Strains', '7G Exotic Small-Batch Flower', 'savagesquadstrains-7g-exotic-small-batch-flower', 'Flower', 'Whole Flower', '7g', '28–32%',
   'Placeholder description — final copy syncs from the iHeartJane sheet.', '/placeholders/product.svg',
   '[{"name":"Myrcene","note":"earthy"},{"name":"Limonene","note":"citrus"}]', null, true, 2),
  ('40000000-0000-4000-8000-000000000021', 'Savage Squad Strains', '2-Pack 1G Rosin Infused Pre-Rolls', 'savagesquadstrains-2-pack-1g-rosin-infused-pre-rolls', 'Pre-Rolls', '2-Pack', '2g', '34–40%',
   'Placeholder description — final copy syncs from the iHeartJane sheet.', '/placeholders/product.svg',
   '[{"name":"Caryophyllene","note":"gas"},{"name":"Humulene","note":"hops"}]', null, true, 3),
  ('40000000-0000-4000-8000-000000000022', 'Savage Squad Strains', '5-Pack Rosin Infused Pre-Rolls', 'savagesquadstrains-5-pack-rosin-infused-pre-rolls', 'Pre-Rolls', '5-Pack', '2.5g', '34–40%',
   'Placeholder description — final copy syncs from the iHeartJane sheet.', '/placeholders/product.svg',
   '[{"name":"Caryophyllene","note":"gas"},{"name":"Pinene","note":"pine"}]', null, true, 4),
  ('40000000-0000-4000-8000-000000000023', 'Savage Squad Strains', '1G Liquid Diamond All-In-One Vape', 'savagesquadstrains-1g-liquid-diamond-all-in-one-vape', 'Vapes', 'All-In-One', '1g', '82–88%',
   'Placeholder description — final copy syncs from the iHeartJane sheet.', '/placeholders/product.svg',
   '[{"name":"Limonene","note":"citrus"},{"name":"Myrcene","note":"gas"}]', null, true, 5),
  ('40000000-0000-4000-8000-000000000024', 'Savage Squad Strains', 'Fast-Acting Fruit Gummies 100MG', 'savagesquadstrains-fast-acting-fruit-gummies-100mg', 'Edibles', 'Gummies', '100mg', '100mg',
   'Placeholder description — final copy syncs from the iHeartJane sheet.', '/placeholders/product.svg',
   '[{"name":"Limonene","note":"citrus"},{"name":"Humulene","note":"hops"}]', null, true, 6);

-- ===== Merch: SKU-style captions per the reference screenshots =====
delete from public.merch_products where id::text like '50000000%';
insert into public.merch_products (id, name, slug, description, brand, images, is_active, sort_order) values
  ('50000000-0000-4000-8000-000000000001', 'TS-03', 'ts-03',  'Placeholder merch product.', 'Savage Squad Strains', '["/placeholders/merch-1.svg"]', true, 1),
  ('50000000-0000-4000-8000-000000000002', 'TS-07', 'ts-07',  'Placeholder merch product.', 'Savage Squad Strains', '["/placeholders/merch-2.svg"]', true, 2),
  ('50000000-0000-4000-8000-000000000003', 'TT-06', 'tt-06',  'Placeholder merch product.', null,                   '["/placeholders/merch-3.svg"]', true, 3),
  ('50000000-0000-4000-8000-000000000004', 'LS-03', 'ls-03',  'Placeholder merch product.', null,                   '["/placeholders/merch-4.svg"]', true, 4),
  ('50000000-0000-4000-8000-000000000005', 'HD-10', 'hd-10',  'Placeholder merch product.', 'Outfitters',           '["/placeholders/merch-1.svg"]', true, 5),
  ('50000000-0000-4000-8000-000000000006', 'JC-08', 'jc-08',  'Placeholder merch product.', 'Outfitters',           '["/placeholders/merch-2.svg"]', true, 6),
  ('50000000-0000-4000-8000-000000000007', 'PK-01', 'pk-01',  'Placeholder merch product.', 'Outfitters',           '["/placeholders/merch-3.svg"]', true, 7),
  ('50000000-0000-4000-8000-000000000008', 'HT-05', 'ht-05',  'Placeholder merch product.', 'Outfitters',           '["/placeholders/merch-4.svg"]', true, 8),
  ('50000000-0000-4000-8000-000000000009', 'BG-02', 'bg-02',  'Placeholder merch product.', 'Outfitters',           '["/placeholders/merch-1.svg"]', true, 9),
  ('50000000-0000-4000-8000-000000000010', 'GL-01', 'gl-01',  'Placeholder merch product.', 'Outfitters',           '["/placeholders/merch-2.svg"]', true, 10),
  ('50000000-0000-4000-8000-000000000011', 'ZH-02', 'zh-02',  'Placeholder merch product.', 'Higher Self',          '["/placeholders/merch-3.svg"]', true, 11),
  ('50000000-0000-4000-8000-000000000012', 'CP-04', 'cp-04',  'Placeholder merch product.', 'Higher Self',          '["/placeholders/merch-4.svg"]', true, 12);
