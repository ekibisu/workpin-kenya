

# Delete Two Test Requests from Database

## Requests to Delete
1. **House Cleaning** (pending) — `13b53053-3cfc-4a3e-a213-46eb00dc11cb`
2. **Plumbing - Borken faucet** (open) — `65b765f8-8b00-443c-b2c3-b9c24eb4b4d8`

## Related Data to Clean Up First
- **Work thread** `37e9c470-d560-4cd0-8b1c-37907deab300` (linked to House Cleaning) — no messages
- **Quote** `c06a3abc` (House Cleaning, accepted)
- **Quote** `ca456d73` (Plumbing, declined)

## Execution Order (using database insert/delete tool)

Since current RLS only allows deleting `open` requests and there are no DELETE policies on `quotes` or `work_threads`, a **migration** is needed to execute these deletes. The migration will:

```sql
-- 1. Delete work thread
DELETE FROM work_threads WHERE id = '37e9c470-d560-4cd0-8b1c-37907deab300';

-- 2. Delete quotes
DELETE FROM quotes WHERE request_id IN (
  '13b53053-3cfc-4a3e-a213-46eb00dc11cb',
  '65b765f8-8b00-443c-b2c3-b9c24eb4b4d8'
);

-- 3. Delete job requests
DELETE FROM job_requests WHERE id IN (
  '13b53053-3cfc-4a3e-a213-46eb00dc11cb',
  '65b765f8-8b00-443c-b2c3-b9c24eb4b4d8'
);
```

No code changes needed — just a one-time data cleanup migration.

