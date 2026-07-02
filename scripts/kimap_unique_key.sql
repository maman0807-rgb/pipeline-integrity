-- Jadikan KIMAP sebagai unique key di gudang_materials
-- Jalankan di Supabase SQL Editor

-- 1. Hapus duplikat kimap jika ada (simpan yang terbaru)
DELETE FROM gudang_materials a
USING gudang_materials b
WHERE a.created_at < b.created_at
  AND a.kimap = b.kimap
  AND a.kimap IS NOT NULL;

-- 2. Set NULL kimap jadi string kosong supaya tidak konflik
UPDATE gudang_materials SET kimap = '' WHERE kimap IS NULL;

-- 3. Tambah constraint unique
ALTER TABLE gudang_materials
  ADD CONSTRAINT gudang_materials_kimap_key UNIQUE (kimap);

SELECT 'KIMAP berhasil dijadikan unique key' AS status;
