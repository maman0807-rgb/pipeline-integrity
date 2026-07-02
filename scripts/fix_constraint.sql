-- Perluas constraint priority agar P4 bisa masuk
ALTER TABLE pipelines DROP CONSTRAINT IF EXISTS pipelines_priority_check;
ALTER TABLE pipelines ADD CONSTRAINT pipelines_priority_check
  CHECK (priority IN ('P1','P2','P3','P4'));
