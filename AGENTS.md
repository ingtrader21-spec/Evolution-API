# Agent Contract

1. Middleware V3 :8095 is the only command/durability authority.
2. Do not add a command ledger, retry scheduler, DLQ/replay controller or reconciliation authority here.
3. Provider effects remain disabled unless EXTERNAL_SEND_ENABLED=true.
4. Never commit provider keys/tokens.
5. Preserve command_id, correlation_id and idempotency_key received from Middleware.
6. Use isolated branches/worktrees and record SHA/tests/handoff.
