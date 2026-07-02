-- STEP 6: Match ulang dengan exact match saja (lebih akurat)
UPDATE leak_events le
SET segment_id = ps.id
FROM pipeline_segments ps
WHERE le.segment_id IS NULL
  AND LOWER(TRIM(le.deskripsi_pipa)) = LOWER(TRIM(ps.from_loc));

-- Cek hasilnya
SELECT
  COUNT(*) FILTER (WHERE segment_id IS NOT NULL) AS sudah_linked,
  COUNT(*) FILTER (WHERE segment_id IS NULL)      AS belum_linked,
  COUNT(*)                                        AS total
FROM leak_events;
