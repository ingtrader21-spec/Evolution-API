# Architecture

Middleware V3 :8095 is the platform command kernel.

This service is intentionally provider-specific and stateless with respect to platform command durability. It does not own command idempotency, durable outbox, retry policy, DLQ/replay, reconciliation or business audit.

## Outbound

Middleware worker/adapter context -> this provider adapter -> provider.

## Inbound

Provider -> verified webhook -> normalized provider event -> Middleware V3 ingress configured by MIDDLEWARE_EVENT_URL.

Forwarding is disabled by default until the exact Middleware event-ingress contract is registered and certified.

## Registry dependency

The current Middleware V3 registry does not yet contain a WhatsApp command family. A reviewed Middleware change must register the chosen command type (planned: `whatsapp.message.send.v1`) and bind it to the Evolution adapter before live sends can pass the V3 safety gate.

## Internal service authentication

Middleware-to-adapter transport requests require `Authorization: Bearer <ADAPTER_SERVICE_TOKEN>`. The token is never committed and must move to OpenBao-backed resolution before production activation.

## Readback

`GET /internal/v1/whatsapp/transport/messages/{provider_message_id}` returns the adapter's current normalized provider state. The current in-process state index is a staging scaffold only; production activation remains blocked until provider-backed/durable readback is certified. Middleware V3 remains the durable command authority.
