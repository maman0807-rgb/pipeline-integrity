-- STEP 4: Recount leak_event di pipeline_segments, lalu verifikasi
UPDATE pipeline_segments ps
SET leak_event = (
  SELECT COUNT(*) FROM leak_events WHERE segment_id = ps.id
);

-- Verifikasi: segmen dengan bocor terbanyak
SELECT
  ps.from_loc, ps.to_loc, ps.category,
  ps.service_fluid, ps.leak_event AS total_bocor
FROM pipeline_segments ps
WHERE ps.leak_event > 0
ORDER BY ps.leak_event DESC
LIMIT 20;
