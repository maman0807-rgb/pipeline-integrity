-- STEP 7b: Sample from_loc dari pipeline_segments
SELECT DISTINCT from_loc, category
FROM pipeline_segments
ORDER BY from_loc
LIMIT 30;
