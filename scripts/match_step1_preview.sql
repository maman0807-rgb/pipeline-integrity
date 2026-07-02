-- STEP 1: Preview matching — jalankan dulu, cek hasilnya sebelum lanjut
SELECT
  le.id                   AS leak_id,
  le.deskripsi_pipa       AS leak_deskripsi,
  le.lokasi               AS leak_lokasi,
  le.tanggal_kejadian,
  ps.from_loc,
  ps.to_loc,
  ps.category,
  ps.size_inch,
  ps.service_fluid
FROM leak_events le
JOIN pipeline_segments ps ON (
     LOWER(TRIM(le.deskripsi_pipa)) ILIKE '%' || LOWER(TRIM(ps.from_loc)) || '%'
  OR LOWER(TRIM(ps.from_loc))       ILIKE '%' || LOWER(TRIM(le.deskripsi_pipa)) || '%'
  OR LOWER(TRIM(le.deskripsi_pipa)) ILIKE '%' || LOWER(TRIM(ps.to_loc)) || '%'
  OR LOWER(TRIM(ps.to_loc))         ILIKE '%' || LOWER(TRIM(le.deskripsi_pipa)) || '%'
  OR LOWER(TRIM(le.lokasi))         ILIKE '%' || LOWER(TRIM(ps.from_loc)) || '%'
  OR LOWER(TRIM(ps.from_loc))       ILIKE '%' || LOWER(TRIM(le.lokasi)) || '%'
)
WHERE le.segment_id IS NULL
ORDER BY le.deskripsi_pipa, ps.from_loc
LIMIT 100;
