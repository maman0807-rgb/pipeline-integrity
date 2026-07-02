-- STEP 7: Lihat sample nilai dari kedua tabel untuk tahu format perbedaannya

-- Sample deskripsi_pipa dari leak_events
SELECT DISTINCT deskripsi_pipa, lokasi
FROM leak_events
ORDER BY deskripsi_pipa
LIMIT 30;
