-- Bersihkan nilai length_m yang salah parse (> 200 km per segmen tidak masuk akal)
-- Hanya 1 baris bermasalah: MANIFOLD PRBUMENANG -> SPG PAKU GAJAH
-- Nilai asli di Excel: "11505 (NPS 6 CS), 410 (NPS 6 SS), & 1000 (NPS 8 CS)"
-- Total sebenarnya: 11505 + 410 + 1000 = 12915 m

UPDATE pipeline_segments
SET length_m = 12915
WHERE from_loc ILIKE '%MANIFOLD%PRBUMENANG%'
  AND to_loc   ILIKE '%PAKU GAJAH%'
  AND length_m > 200000;

-- Kalau tidak match nama, pakai ini (set semua yg > 200km jadi NULL):
-- UPDATE pipeline_segments SET length_m = NULL WHERE length_m > 200000;

-- Verifikasi total trunkline setelah fix
SELECT ROUND(SUM(length_m)/1000, 2) AS total_trunkline_km
FROM pipeline_segments
WHERE category = 'TRUNKLINE' AND length_m IS NOT NULL;
