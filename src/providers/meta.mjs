import { ProviderError, normalizeProviderResponse, requireString } from "../contracts.mjs";

export function createMetaProvider(config) {
  return {
    id: "meta",
    ready() {
      return Boolean(config.metaGraphVersion && config.metaPhoneNumberId && config.metaAccessToken);
    },
    async send(command) {
      const version = requireString(config.metaGraphVersion, "META_GRAPH_VERSION");
      const phoneNumberId = requireString(config.metaPhoneNumberId, "META_PHONE_NUMBER_ID");
      const token = requireString(config.metaAccessToken, "META_ACCESS_TOKEN");
      const recipient = requireString(command.recipient, "recipient");
      if (command.message?.type !== "text") {
        throw new ProviderError("unsupported_message_type", "Meta adapter currently supports text messages only", { status: 400, retryHint: "never" });
      }
      const text = requireString(command.message?.text, "message.text");
      const response = await fetch(`https://graph.facebook.com/${encodeURIComponent(version)}/${encodeURIComponent(phoneNumberId)}/messages`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
          "x-correlation-id": command.correlation_id
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: recipient,
          type: "text",
          text: { body: text }
        }),
        signal: AbortSignal.timeout(15000)
      });
      const raw = await response.text();
      let body;
      try { body = raw ? JSON.parse(raw) : null; } catch { body = { raw }; }
      if (!response.ok) {
        throw new ProviderError("meta_provider_error", `Meta returned HTTP ${response.status}`, { status: 502 });
      }
      return normalizeProviderResponse("meta", response, body);
    }
  };
}
