export class ProviderError extends Error {
  constructor(code, message, { status = 502, retryHint = "middleware_decides" } = {}) {
    super(message);
    this.name = "ProviderError";
    this.code = code;
    this.status = status;
    this.retryHint = retryHint;
  }
}

export function requireString(value, name) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new ProviderError("invalid_request", `${name} is required`, { status: 400, retryHint: "never" });
  }
  return value.trim();
}

export function normalizeProviderResponse(provider, response, body) {
  const providerMessageId =
    body?.key?.id ??
    body?.id ??
    body?.messages?.[0]?.id ??
    body?.messageId ??
    null;

  return {
    provider,
    provider_message_id: providerMessageId,
    accepted: response.ok,
    provider_status: response.status,
    provider_payload: body ?? null
  };
}
