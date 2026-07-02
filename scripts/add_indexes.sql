-- Index untuk query yang sering dipakai
CREATE INDEX IF NOT EXISTS idx_pipelines_integrity ON pipelines(integrity_status);
CREATE INDEX IF NOT EXISTS idx_pipelines_priority ON pipelines(priority);
CREATE INDEX IF NOT EXISTS idx_pipelines_sertifikat ON pipelines(sertifikat_berlaku);
CREATE INDEX IF NOT EXISTS idx_segments_integrity ON pipeline_segments(integrity_status);
CREATE INDEX IF NOT EXISTS idx_leaks_tanggal ON leak_events(tanggal_kejadian DESC);
CREATE INDEX IF NOT EXISTS idx_leaks_pipeline ON leak_events(pipeline_id);
