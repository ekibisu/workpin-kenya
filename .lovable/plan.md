

## Show Quotes Inline With Their Requests

### Current state
The client dashboard has two separate sections: "Your Requests" (lines 462-630) and "Quotes Received" (lines 632-720). The user must mentally match quotes to requests.

### Plan
Remove the standalone "Quotes Received" section and instead show quotes **inline beneath each request card** that has received them.

### Changes — `src/pages/Dashboard.tsx`

1. **Add inline quotes beneath each request card** (inside the `requests.map` loop, after the images/edit/delete block, before the closing `</div>` of each card):
   - Filter `quotes` array for the current `req.id`
   - If any exist, render a collapsible sub-section (or always-visible list) showing each quote with:
     - Provider name, price (KES), date, message
     - Status badge (pending/accepted/declined)
     - "Start Job" / "Decline" buttons for pending quotes on open requests (reuse existing handlers)
     - "Job Started" badge for accepted quotes

2. **Remove the standalone "Quotes Received" section** (lines 632-720) entirely, since all quote info will now live under each request.

3. **Layout**: Use a two-column grid within each request card — request details on the left, quotes stacked on the right — at `md` breakpoint and above. On mobile, quotes stack below the request.

```text
┌─────────────────────────────────────────────────┐
│  Request Card                                   │
│  ┌──────────────────┐  ┌──────────────────────┐ │
│  │ Service name     │  │ Quote 1              │ │
│  │ Description      │  │  Provider · KES 5000 │ │
│  │ Location · Date  │  │  [Start] [Decline]   │ │
│  │ Photos           │  ├──────────────────────┤ │
│  │ Edit · Delete    │  │ Quote 2              │ │
│  │                  │  │  Provider · KES 4500 │ │
│  │                  │  │  [Start] [Decline]   │ │
│  └──────────────────┘  └──────────────────────┘ │
└─────────────────────────────────────────────────┘
```

4. **Quote count badge** on each request header row — e.g. "2 quotes" next to the status badge, only when quotes exist.

### No other files or migrations needed.

