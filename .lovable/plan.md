## Goal

Gate the "Hire" action behind an M-Pesa STK push using the existing `MpesaCheckout` component. Payment must succeed before `handleStartJob` runs.

## Changes

### `src/components/dashboard/QuotesPanel.tsx`
- Add prop `onPayAndHire(requestId, quoteId, amount, providerName, workThreadId)` to `QuotesPanelProps` and the destructured props.
- In both views (compact accordion + card), swap the existing `onClick={() => onHire(requestId, quote.id)}` on the Hire button to call `onPayAndHire(requestId, quote.id, quote.price_kes, name, quote.work_thread_id ?? "")`.
- Keep `onHire` in the props (unchanged signature) — Dashboard still uses it from `onSuccess`.

### `src/pages/Dashboard.tsx`
- Add `import MpesaCheckout from "@/components/payments/MpesaCheckout"`.
- Add `payContext` state (shape per spec).
- Pass `onPayAndHire` to the `QuotesPanel` instance at line ~737 (resolves `serviceName` from `requests.find(r => r.id === requestId)?.services?.name`).
- Render `<MpesaCheckout ... />` immediately before `<MessageDrawer ... />` (line ~942). On `onSuccess`, call `handleStartJob(payContext.requestId, payContext.quoteId)` then clear `payContext`.

## Out of scope
- `handleStartJob` logic, `MpesaCheckout` internals, backend changes.
