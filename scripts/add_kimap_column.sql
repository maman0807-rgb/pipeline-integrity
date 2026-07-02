-- Tambah kolom KIMAP ke tabel gudang_materials
-- Jalankan di Supabase SQL Editor

ALTER TABLE gudang_materials
  ADD COLUMN IF NOT EXISTS kimap TEXT;

SELECT 'Kolom kimap berhasil ditambahkan' AS status;
