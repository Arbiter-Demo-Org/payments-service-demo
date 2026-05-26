# payments-service-demo

A minimal payments service used to demonstrate **Arbiter** governing the
promotion of AI-originated changes.

The interesting file is `payments/settlement.py` — payout/settlement logic that
moves money. Arbiter is wired so that changes touching `payments/**` require an
approved change ticket before they can merge.

## Run the authorization check locally

```bash
npm run evaluate
```

- No change-ticket evidence present → **DENIED**.
- Add the approval (`.ai/evidence/change-ticket.json`) → re-run → **ALLOWED**.

See `DEMO_RUNBOOK.md` for the full recording walkthrough.
