-- STEP 2: Cek berapa yang bisa di-match vs belum
SELECT
  COUNT(*) FILTER (WHERE segment_id IS NOT NULL) AS sudah_linked,
  COUNT(*) FILTER (WHERE segment_id IS NULL)      AS belum_linked,
  COUNT(*)                                        AS total
FROM leak_events;
