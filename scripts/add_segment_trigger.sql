-- ================================================================
-- Sambungkan leak_events ke pipeline_segments
-- Jalankan di Supabase SQL Editor
-- ================================================================

-- 1. Tambah kolom segment_id ke leak_events
ALTER TABLE leak_events
ADD COLUMN IF NOT EXISTS segment_id UUID REFERENCES pipeline_segments(id) ON DELETE SET NULL;

-- 2. Fungsi trigger — hitung ulang leak_event setiap ada perubahan
CREATE OR REPLACE FUNCTION update_segment_leak_count()
RETURNS TRIGGER AS $$
BEGIN
  -- INSERT atau UPDATE: update segmen baru
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    IF NEW.segment_id IS NOT NULL THEN
      UPDATE pipeline_segments
      SET leak_event = (
        SELECT COUNT(*) FROM leak_events WHERE segment_id = NEW.segment_id
      )
      WHERE id = NEW.segment_id;
    END IF;
  END IF;

  -- UPDATE: kalau segment_id berubah, update juga segmen lama
  IF TG_OP = 'UPDATE' AND OLD.segment_id IS NOT NULL AND OLD.segment_id IS DISTINCT FROM NEW.segment_id THEN
    UPDATE pipeline_segments
    SET leak_event = (
      SELECT COUNT(*) FROM leak_events WHERE segment_id = OLD.segment_id
    )
    WHERE id = OLD.segment_id;
  END IF;

  -- DELETE: update segmen yang ditinggalkan
  IF TG_OP = 'DELETE' THEN
    IF OLD.segment_id IS NOT NULL THEN
      UPDATE pipeline_segments
      SET leak_event = (
        SELECT COUNT(*) FROM leak_events WHERE segment_id = OLD.segment_id
      )
      WHERE id = OLD.segment_id;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 3. Pasang trigger
DROP TRIGGER IF EXISTS trg_update_segment_leak_count ON leak_events;
CREATE TRIGGER trg_update_segment_leak_count
AFTER INSERT OR UPDATE OR DELETE ON leak_events
FOR EACH ROW EXECUTE FUNCTION update_segment_leak_count();

-- 4. Verifikasi
SELECT 'Trigger berhasil dibuat' AS status;
