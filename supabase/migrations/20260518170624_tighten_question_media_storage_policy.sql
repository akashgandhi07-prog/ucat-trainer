-- Public buckets can serve object URLs without a broad SELECT policy.
-- Dropping this policy prevents clients from listing every object in the bucket.

drop policy if exists "Question media images are publicly readable" on storage.objects;
