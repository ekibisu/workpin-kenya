

# Delete Plumbing Pending Job Request

## Record identified
- **Job request**: `648a4b1b-2f6f-4e70-83c0-735c8a123920` — "Plumbing", pending, "I have a leaking faucet in the bathroom", Langata Nairobi, Feb 17
- **Quote 1**: `a0c86287-069d-4008-a0fb-5e8857cba65f` (accepted)
- **Quote 2**: `61c94f87-27eb-4460-bd7c-94b61f26a529` (declined)
- No work threads or messages linked

## Migration SQL

```sql
-- 1. Delete quotes referencing this request
DELETE FROM quotes WHERE request_id = '648a4b1b-2f6f-4e70-83c0-735c8a123920';

-- 2. Delete the job request
DELETE FROM job_requests WHERE id = '648a4b1b-2f6f-4e70-83c0-735c8a123920';
```

This removes the record from both the client dashboard and the provider's "Jobs Pending" view. No code changes needed.

