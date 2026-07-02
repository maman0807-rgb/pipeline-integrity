-- STEP 3: Update segment_id di leak_events — jalankan setelah Step 1 di-review
UPDATE leak_events le
SET segment_id = matched.segment_id
FROM (
  SELECT DISTINCT ON (le2.id)
    le2.id AS leak_id,
    ps.id  AS segment_id
  FROM leak_events le2
  JOIN pipeline_segments ps ON (
       LOWER(TRIM(le2.deskripsi_pipa)) ILIKE '%' || LOWER(TRIM(ps.from_loc)) || '%'
    OR LOWER(TRIM(ps.from_loc))        ILIKE '%' || LOWER(TRIM(le2.deskripsi_pipa)) || '%'
    OR LOWER(TRIM(le2.deskripsi_pipa)) ILIKE '%' || LOWER(TRIM(ps.to_loc)) || '%'
    OR LOWER(TRIM(ps.to_loc))          ILIKE '%' || LOWER(TRIM(le2.deskripsi_pipa)) || '%'
    OR LOWER(TRIM(le2.lokasi))         ILIKE '%' || LOWER(TRIM(ps.from_loc)) || '%'
    OR LOWER(TRIM(ps.from_loc))        ILIKE '%' || LOWER(TRIM(le2.lokasi)) || '%'
  )
  WHERE le2.segment_id IS NULL
  ORDER BY le2.id, LENGTH(ps.from_loc) DESC
) matched
WHERE le.id = matched.leak_id;
