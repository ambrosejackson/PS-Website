-- Verify the legacy product-image cutover (P3 of the sheet-sync retirement, D-132..D-134).
-- Run in the WEBSITE Supabase project's SQL editor (never PSM). Read-only.
--
-- Target state after "Import next 25" has been run until remaining = 0 and
-- "Mark placeholder rows as image-missing" has been run once:
--   * zero image_url rows on lh3.googleusercontent.com / drive.google.com
--     EXCEPT rows that carry an image_error (those keep their Drive link on purpose);
--   * zero rows on /placeholders/product.png;
--   * every row with an empty image_url has image_missing = true;
--   * every row with image_storage_path has image_url on Supabase Storage.

-- 1. image_url by host -----------------------------------------------------
select
  case
    when image_url is null or image_url = ''                         then '(empty)'
    when image_url = '/placeholders/product.png'                     then 'legacy placeholder'
    when image_url like '%lh3.googleusercontent.com%'                then 'lh3.googleusercontent.com'
    when image_url like '%drive.google.com%'                         then 'drive.google.com'
    when image_url like '%/storage/v1/object/public/products/%'      then 'supabase storage'
    else 'other: ' || split_part(split_part(image_url, '://', 2), '/', 1)
  end                                                                 as host,
  count(*)                                                            as rows,
  count(*) filter (where image_storage_path is not null)              as with_storage_path,
  count(*) filter (where image_error is not null)                     as with_image_error,
  count(*) filter (where image_missing)                               as image_missing
from public.catalog_products
group by 1
order by 2 desc;

-- 2. Rows still on a Drive host WITHOUT an image_error → should be ZERO rows -
select id, brand, name, slug, image_url, image_source_url
from public.catalog_products
where (image_url like '%lh3.googleusercontent.com%' or image_url like '%drive.google.com%')
  and image_error is null
order by brand, name;

-- 3. Rows with image_error (expected: the Drive files that 403'd / were deleted)
select id, brand, name, slug, image_error, image_url, image_source_url, image_missing
from public.catalog_products
where image_error is not null
order by image_error, brand, name;

-- 4. Rows with a storage path: image_url must be that path's 800 rendition --
select
  count(*)                                                                         as with_storage_path,
  count(*) filter (where image_url like '%/' || image_storage_path || '/800.webp') as url_matches_path,
  count(*) filter (where image_missing)                                            as still_flagged_missing,
  count(*) filter (where image_error is not null)                                  as still_has_error
from public.catalog_products
where image_storage_path is not null;

-- 5. Placeholder / empty rows (both counts in the second column should be 0) --
select 'legacy placeholder url'       as check, count(*) as rows_remaining
from public.catalog_products where image_url = '/placeholders/product.png'
union all
select 'empty url but image_missing = false', count(*)
from public.catalog_products
where (image_url is null or image_url = '') and image_storage_path is null and image_missing = false;

-- 6. Distinct Drive files still referenced by image_source_url (audit only; never modified)
select count(distinct substring(image_source_url from '/d/([A-Za-z0-9_-]{10,})')) as distinct_drive_files_in_source,
       count(*) filter (where image_source_url like '%lh3.googleusercontent.com%'
                           or image_source_url like '%drive.google.com%')         as rows_with_drive_source
from public.catalog_products;
