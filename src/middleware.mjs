export async function forwardEvent(config, event, correlationId) {
  if (!config.forwardEventsEnabled) {
    return { forwarded: false, reason: "forwarding_disabled" };
  }
  if (!config.middlewareEventUrl) {
    throw new Error("MIDDLEWARE_EVENT_URL is required when FORWARD_EVENTS_ENABLED=true");
  }
  const headers = {
    "content-type": "application/json",
    "x-correlation-id": correlationId || event.provider_event_id || "provider-event"
  };
  if (config.middlewareServiceToken) headers.authorization = `Bearer ${config.middlewareServiceToken}`;
  const response = await fetch(config.middlewareEventUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(event),
    signal: AbortSignal.timeout(10000)
  });
  const raw = await response.text();
  if (!response.ok) throw new Error(`Middleware event forwarding failed with HTTP ${response.status}: ${raw.slice(0, 300)}`);
  return { forwarded: true, middleware_status: response.status };
}
