-- ================================================================
-- Stok Gudang — Pipeline Integrity
-- Jalankan di Supabase SQL Editor
-- ================================================================

CREATE TABLE IF NOT EXISTS gudang_materials (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  part_number   TEXT NOT NULL,
  description   TEXT NOT NULL,
  category      TEXT DEFAULT 'Spare Part',
  satuan        TEXT,
  stok          INTEGER DEFAULT 0,
  safety_stock  INTEGER DEFAULT 5,
  unit_price    NUMERIC,
  lead_time_days INTEGER,
  penyimpanan   TEXT,
  tgl_masuk     DATE,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS gudang_transactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id   UUID REFERENCES gudang_materials(id) ON DELETE CASCADE,
  part_number   TEXT,
  description   TEXT,
  tipe          TEXT CHECK (tipe IN ('masuk','keluar')),
  jumlah        INTEGER NOT NULL,
  stok_sebelum  INTEGER,
  stok_sesudah  INTEGER,
  keterangan    TEXT,
  tanggal       DATE DEFAULT CURRENT_DATE,
  user_name     TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE gudang_materials    ENABLE ROW LEVEL SECURITY;
ALTER TABLE gudang_transactions ENABLE ROW LEVEL SECURITY;

-- Policy: semua authenticated user bisa baca
CREATE POLICY "read gudang_materials"    ON gudang_materials    FOR SELECT TO authenticated USING (true);
CREATE POLICY "read gudang_transactions" ON gudang_transactions FOR SELECT TO authenticated USING (true);

-- Policy: semua authenticated user bisa write (sesuaikan ke role kalau perlu)
CREATE POLICY "write gudang_materials"    ON gudang_materials    FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "write gudang_transactions" ON gudang_transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);

SELECT 'Tabel gudang berhasil dibuat' AS status;
