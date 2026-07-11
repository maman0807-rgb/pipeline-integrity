-- Pipeline Integrity System — Migration
-- Jalankan di Supabase SQL Editor (project eRAMCore)

-- 1. PIPELINES (master flowline register, dari sheet "Contoh")
CREATE TABLE IF NOT EXISTS pipelines (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  no                    integer,
  wk                    text,
  cluster               text,
  status                text DEFAULT 'Aktif',
  dari_sumur            text NOT NULL,
  ke_stasiun            text,
  nama_flowline         text,
  jenis_sumur           text,
  panjang_m             numeric,
  tahun_konstruksi      integer,
  jumlah_kejadian       integer DEFAULT 0,
  jumlah_titik_inspeksi numeric,
  priority              text CHECK (priority IN ('P1','P2','P3')),
  tanggal_inspeksi      date,
  rla_document          text,
  re_document           text,
  tanggal_coi_plo       date,
  sertifikat_berlaku    date,
  coi_plo               text,
  rlt_lt3               numeric,
  rlt_3_5               numeric,
  rlt_gt5               numeric,
  integrity_status      text CHECK (integrity_status IN ('GOOD','MONITOR','BAD')),
  catatan               text,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

-- 2. PIPELINE_SEGMENTS (dari sheet "Monitoring Inspeksi")
CREATE TABLE IF NOT EXISTS pipeline_segments (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  no               integer,
  category         text,
  from_loc         text,
  to_loc           text,
  size_inch        numeric,
  length_m         numeric,
  service_fluid    text,
  year_built       integer,
  ansi_rating      text,
  corrosion_rate   numeric,
  remain_life      numeric,
  design_pressure  numeric,
  leak_event       integer DEFAULT 0,
  perbaikan        text,
  ndt              text,
  plo              text,
  integrity_status text CHECK (integrity_status IN ('GOOD','MONITOR','BAD')),
  memo_inspeksi    text,
  hasil_inspeksi   text,
  tindak_lanjut    text,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

-- 3. LEAK_EVENTS (dari sheet "History Kebocoran" + entry baru)
CREATE TABLE IF NOT EXISTS leak_events (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deskripsi_pipa     text,
  deskripsi_kegiatan text,
  start_time         timestamptz,
  end_time           timestamptz,
  bocor_titik        integer DEFAULT 0,
  clamp_titik        integer DEFAULT 0,
  sadel_titik        integer DEFAULT 0,
  sisip_meter        numeric DEFAULT 0,
  tanggal_kejadian   date,
  mulai_perbaikan    date,
  selesai_perbaikan  date,
  keterangan         text,
  lokasi             text,
  kp                 text,
  struktur           text,
  distrik            text,
  dimensi_pipa       text,
  panjang_pipa       numeric,
  pipeline_id        uuid REFERENCES pipelines(id) ON DELETE SET NULL,
  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz DEFAULT now()
);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION set_updated_at_pipeline()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN new.updated_at = now(); RETURN new; END; $$;

CREATE TRIGGER trg_pipelines_updated_at
  BEFORE UPDATE ON pipelines
  FOR EACH ROW EXECUTE FUNCTION set_updated_at_pipeline();

CREATE TRIGGER trg_segments_updated_at
  BEFORE UPDATE ON pipeline_segments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at_pipeline();

CREATE TRIGGER trg_leak_events_updated_at
  BEFORE UPDATE ON leak_events
  FOR EACH ROW EXECUTE FUNCTION set_updated_at_pipeline();

-- RLS
ALTER TABLE pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE leak_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pipelines_all" ON pipelines
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "segments_all" ON pipeline_segments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "leak_events_all" ON leak_events
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
