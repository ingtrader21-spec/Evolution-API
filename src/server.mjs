import http from "node:http";
import { loadConfig } from "./config.mjs";
import { ProviderError, requireString } from "./contracts.mjs";
import { createEvolutionProvider } from "./providers/evolution.mjs";
import { createMetaProvider } from "./providers/meta.mjs";
import { forwardEvent } from "./middleware.mjs";
import { normalizeEvolutionWebhook, normalizeMetaWebhook, verifyMetaSignature, verifySharedSecret } from "./webhooks.mjs";

const MAX_BODY = 1024 * 1024;

async function readBody(req) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > MAX_BODY) throw new ProviderError("payload_too_large", "request body exceeds 1 MiB", { status: 413, retryHint: "never" });
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function json(res, status, body, headers = {}) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", ...headers });
  res.end(JSON.stringify(body));
}

export function createApp(customConfig = loadConfig()) {
  const providers = {
    evolution: createEvolutionProvider(customConfig),
    meta: createMetaProvider(customConfig)
  };

  return http.createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    const correlationId = req.headers["x-correlation-id"] || cryptoRandom();

    try {
      if (req.method === "GET" && url.pathname === "/healthz") {
        return json(res, 200, {
          status: "ok",
          service: "codestra-evolution-adapter",
          architecture: "middleware-v3-provider-adapter",
          middleware_authority: customConfig.middlewareBaseUrl,
          external_send_enabled: customConfig.externalSendEnabled
        });
      }

      if (req.method === "GET" && url.pathname === "/readyz") {
        return json(res, 200, {
          status: "ready",
          safe_mode: !customConfig.externalSendEnabled,
          providers: Object.fromEntries(Object.entries(providers).map(([k, p]) => [k, { configured: p.ready() }]))
        });
      }

      if (req.method === "GET" && url.pathname === "/internal/v1/whatsapp/transport/health") {
        return json(res, 200, {
          middleware_v3_authority: true,
          provider_adapter_only: true,
          providers: Object.fromEntries(Object.entries(providers).map(([k, p]) => [k, { configured: p.ready() }]))
        });
      }

      if (req.method === "POST" && url.pathname === "/internal/v1/whatsapp/transport/messages") {
        const raw = await readBody(req);
        const body = JSON.parse(raw.toString("utf8") || "{}");
        requireString(body.command_id, "command_id");
        requireString(body.correlation_id, "correlation_id");
        requireString(body.idempotency_key, "idempotency_key");
        const providerName = requireString(body.provider, "provider");
        if (!customConfig.externalSendEnabled) {
          return json(res, 423, {
            error: { code: "external_send_disabled", message: "Provider effects are disabled by default", retryable: false },
            correlation_id: body.correlation_id
          });
        }
        const provider = providers[providerName];
        if (!provider) throw new ProviderError("unknown_provider", `unknown provider: ${providerName}`, { status: 400, retryHint: "never" });
        const result = await provider.send(body);
        return json(res, 202, {
          command_id: body.command_id,
          correlation_id: body.correlation_id,
          idempotency_key: body.idempotency_key,
          result
        });
      }

      if (req.method === "POST" && url.pathname === "/internal/v1/whatsapp/webhooks/evolution") {
        const raw = await readBody(req);
        if (!verifySharedSecret(customConfig.evolutionWebhookSecret, req.headers["x-codestra-webhook-secret"])) {
          return json(res, 401, { error: { code: "invalid_webhook_secret" } });
        }
        const event = normalizeEvolutionWebhook(JSON.parse(raw.toString("utf8") || "{}"));
        const forward = await forwardEvent(customConfig, event, correlationId);
        return json(res, 202, { accepted: true, event, forward });
      }

      if (req.method === "GET" && url.pathname === "/internal/v1/whatsapp/webhooks/meta") {
        const mode = url.searchParams.get("hub.mode");
        const token = url.searchParams.get("hub.verify_token");
        const challenge = url.searchParams.get("hub.challenge");
        if (mode === "subscribe" && customConfig.metaVerifyToken && token === customConfig.metaVerifyToken) {
          res.writeHead(200, { "content-type": "text/plain" });
          return res.end(challenge || "");
        }
        return json(res, 403, { error: { code: "verification_failed" } });
      }

      if (req.method === "POST" && url.pathname === "/internal/v1/whatsapp/webhooks/meta") {
        const raw = await readBody(req);
        if (!verifyMetaSignature(customConfig.metaAppSecret, raw, req.headers["x-hub-signature-256"])) {
          return json(res, 401, { error: { code: "invalid_meta_signature" } });
        }
        const event = normalizeMetaWebhook(JSON.parse(raw.toString("utf8") || "{}"));
        const forward = await forwardEvent(customConfig, event, correlationId);
        return json(res, 202, { accepted: true, event, forward });
      }

      return json(res, 404, { error: { code: "not_found" } });
    } catch (error) {
      const status = error instanceof ProviderError ? error.status : 500;
      return json(res, status, {
        error: {
          code: error.code || "internal_error",
          message: error.message,
          retry_hint: error.retryHint || "middleware_decides"
        },
        correlation_id: correlationId
      });
    }
  });
}

function cryptoRandom() {
  return globalThis.crypto?.randomUUID?.() || `corr-${Date.now()}`;
}

if (process.argv[1] && import.meta.url === new URL(`file:///${process.argv[1].replace(/\\/g, "/")}`).href) {
  const config = loadConfig();
  createApp(config).listen(config.port, "0.0.0.0", () => {
    console.log(JSON.stringify({ service: "codestra-evolution-adapter", port: config.port, external_send_enabled: config.externalSendEnabled }));
  });
}
