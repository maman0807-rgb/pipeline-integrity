-- STEP 5: Reset semua auto-match yang salah, mulai ulang dari nol
UPDATE leak_events SET segment_id = NULL;

-- Konfirmasi
SELECT
  COUNT(*) FILTER (WHERE segment_id IS NOT NULL) AS sudah_linked,
  COUNT(*) FILTER (WHERE segment_id IS NULL)      AS belum_linked,
  COUNT(*)                                        AS total
FROM leak_events;
