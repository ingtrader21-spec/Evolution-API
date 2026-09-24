# Codestra Evolution Adapter

Thin WhatsApp provider adapter behind **Middleware V3 :8095**.

## Authority boundary

Middleware V3 owns command lifecycle, idempotency, durable ledger/outbox/workers, retries, DLQ/replay, reconciliation, audit and policy. This repository does not duplicate those capabilities.

This adapter owns only provider-specific concerns:

- Meta Cloud API / Evolution-Baileys request translation
- instance/session identifiers
- provider message IDs
- webhook verification/parsing
- delivery/read normalization
- provider health/readiness
- provider-specific telemetry hooks

Public/business callers never use provider endpoints directly.

## Safe defaults

`EXTERNAL_SEND_ENABLED=false` and `FORWARD_EVENTS_ENABLED=false` by default.

## Run

```powershell
node src/server.mjs
node --test
```

See `.env.example` and `openapi.yaml`.
