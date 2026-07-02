-- Tambah RLS policy DELETE untuk tabel users
-- Jalankan di Supabase SQL Editor

CREATE POLICY "admin can delete users"
  ON users FOR DELETE
  TO authenticated
  USING (true);

SELECT 'Policy DELETE users berhasil ditambahkan' AS status;
