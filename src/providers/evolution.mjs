import { ProviderError, normalizeProviderResponse, requireString } from "../contracts.mjs";

export function createEvolutionProvider(config) {
  return {
    id: "evolution",
    ready() {
      return Boolean(config.evolutionBaseUrl && config.evolutionApiKey);
    },
    async send(command) {
      const base = requireString(config.evolutionBaseUrl, "EVOLUTION_BASE_URL").replace(/\/$/, "");
      const apiKey = requireString(config.evolutionApiKey, "EVOLUTION_API_KEY");
      const instanceId = requireString(command.instance_id, "instance_id");
      const recipient = requireString(command.recipient, "recipient");
      if (command.message?.type !== "text") {
        throw new ProviderError("unsupported_message_type", "Evolution adapter currently supports text messages only", { status: 400, retryHint: "never" });
      }
      const text = requireString(command.message?.text, "message.text");
      const response = await fetch(`${base}/message/sendText/${encodeURIComponent(instanceId)}`, {
        method: "POST",
        headers: { "content-type": "application/json", apikey: apiKey, "x-correlation-id": command.correlation_id },
        body: JSON.stringify({ number: recipient, text }),
        signal: AbortSignal.timeout(15000)
      });
      const raw = await response.text();
      let body;
      try { body = raw ? JSON.parse(raw) : null; } catch { body = { raw }; }
      if (!response.ok) {
        throw new ProviderError("evolution_provider_error", `Evolution returned HTTP ${response.status}`, { status: 502 });
      }
      return normalizeProviderResponse("evolution", response, body);
    }
  };
}
