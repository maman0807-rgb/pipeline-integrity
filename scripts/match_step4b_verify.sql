-- STEP 4b: Verifikasi — segmen dengan bocor terbanyak
SELECT
  ROW_NUMBER() OVER (ORDER BY leak_event DESC) AS no,
  CONCAT('[', category, '] ', from_loc, ' → ', to_loc) AS segmen,
  service_fluid  AS fluida,
  leak_event     AS total_bocor
FROM pipeline_segments
WHERE leak_event > 0
ORDER BY leak_event DESC
LIMIT 20;
