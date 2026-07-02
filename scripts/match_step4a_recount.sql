-- STEP 4a: Update kolom leak_event di semua pipeline_segments
UPDATE pipeline_segments ps
SET leak_event = (
  SELECT COUNT(*) FROM leak_events WHERE segment_id = ps.id
);
