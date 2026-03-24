-- 1. Delete quotes first (they reference work_threads and job_requests)
DELETE FROM quotes WHERE request_id IN (
  '13b53053-3cfc-4a3e-a213-46eb00dc11cb',
  '65b765f8-8b00-443c-b2c3-b9c24eb4b4d8'
);

-- 2. Delete work thread (now safe, no more FK references)
DELETE FROM work_threads WHERE id = '37e9c470-d560-4cd0-8b1c-37907deab300';

-- 3. Delete the job requests
DELETE FROM job_requests WHERE id IN (
  '13b53053-3cfc-4a3e-a213-46eb00dc11cb',
  '65b765f8-8b00-443c-b2c3-b9c24eb4b4d8'
);