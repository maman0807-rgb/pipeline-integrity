-- ================================================================
-- STEP 1: Preview — lihat dulu hasil matching sebelum dieksekusi
-- Jalankan ini dulu, cek apakah hasilnya masuk akal
-- ================================================================
SELECT
  le.id                            AS leak_id,
  le.deskripsi_pipa                AS leak_deskripsi,
  le.lokasi                        AS leak_lokasi,
  le.tanggal_kejadian,
  ps.id                            AS matched_segment_id,
  ps.from_loc,
  ps.to_loc,
  ps.category,
  ps.size_inch,
  ps.service_fluid
FROM leak_events le
JOIN pipeline_segments ps ON (
  -- Coba match deskripsi_pipa ke from_loc atau to_loc
     LOWER(TRIM(le.deskripsi_pipa)) ILIKE '%' || LOWER(TRIM(ps.from_loc)) || '%'
  OR LOWER(TRIM(ps.from_loc))       ILIKE '%' || LOWER(TRIM(le.deskripsi_pipa)) || '%'
  OR LOWER(TRIM(le.deskripsi_pipa)) ILIKE '%' || LOWER(TRIM(ps.to_loc)) || '%'
  OR LOWER(TRIM(ps.to_loc))         ILIKE '%' || LOWER(TRIM(le.deskripsi_pipa)) || '%'
  -- Atau match dari field lokasi
  OR LOWER(TRIM(le.lokasi))         ILIKE '%' || LOWER(TRIM(ps.from_loc)) || '%'
  OR LOWER(TRIM(ps.from_loc))       ILIKE '%' || LOWER(TRIM(le.lokasi)) || '%'
)
WHERE le.segment_id IS NULL   -- hanya yang belum ter-link
ORDER BY le.deskripsi_pipa, ps.from_loc
LIMIT 100;


-- ================================================================
-- STEP 2: Cek ringkasan — berapa yang bisa di-match vs total
-- ================================================================
SELECT
  COUNT(*) FILTER (WHERE le.segment_id IS NOT NULL)  AS sudah_linked,
  COUNT(*) FILTER (WHERE le.segment_id IS NULL)       AS belum_linked,
  COUNT(*)                                            AS total
FROM leak_events le;


-- ================================================================
-- STEP 3: UPDATE — pasang segment_id ke leak_events
-- Hanya jalankan setelah Step 1 di-review dan hasilnya OK
-- Pakai DISTINCT ON untuk ambil match terbaik (closest from_loc)
-- ================================================================
UPDATE leak_events le
SET segment_id = matched.segment_id
FROM (
  SELECT DISTINCT ON (le2.id)
    le2.id      AS leak_id,
    ps.id       AS segment_id
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
  ORDER BY le2.id, LENGTH(ps.from_loc) DESC  -- prefer segmen dengan nama lebih spesifik
) matched
WHERE le.id = matched.leak_id;


-- ================================================================
-- STEP 4: Recount — update kolom leak_event di pipeline_segments
-- Jalankan setelah Step 3 selesai
-- ================================================================
UPDATE pipeline_segments ps
SET leak_event = (
  SELECT COUNT(*) FROM leak_events WHERE segment_id = ps.id
)
WHERE EXISTS (
  SELECT 1 FROM leak_events WHERE segment_id = ps.id
);


-- ================================================================
-- STEP 5: Verifikasi hasil akhir
-- ================================================================
SELECT
  COUNT(*) FILTER (WHERE le.segment_id IS NOT NULL)  AS sudah_linked,
  COUNT(*) FILTER (WHERE le.segment_id IS NULL)       AS belum_linked,
  COUNT(*)                                            AS total
FROM leak_events le;

-- Segmen dengan leak terbanyak
SELECT
  ps.from_loc, ps.to_loc, ps.category, ps.service_fluid,
  ps.leak_event AS total_bocor
FROM pipeline_segments ps
WHERE ps.leak_event > 0
ORDER BY ps.leak_event DESC
LIMIT 20;
