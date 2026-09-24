export function createMessageState() {
  const messages = new Map();

  function rememberAccepted(result) {
    const id = result?.provider_message_id;
    if (!id) return;
    messages.set(String(id), {
      provider_message_id: String(id),
      provider: result.provider ?? null,
      state: "ACCEPTED",
      updated_at: new Date().toISOString()
    });
  }

  function applyEvent(event) {
    const id = event?.provider_message_id ?? event?.provider_event_id;
    if (!id) return;
    const current = messages.get(String(id)) ?? {
      provider_message_id: String(id),
      provider: event?.source ?? null
    };
    messages.set(String(id), {
      ...current,
      state: deriveState(event),
      updated_at: new Date().toISOString()
    });
  }

  function get(id) {
    return messages.get(String(id)) ?? null;
  }

  return Object.freeze({ rememberAccepted, applyEvent, get });
}

function deriveState(event) {
  const payload = event?.provider_payload ?? {};
  const metaStatus = payload?.entry?.[0]?.changes?.[0]?.value?.statuses?.[0]?.status;
  const evolutionStatus = payload?.data?.status ?? payload?.data?.update?.status ?? payload?.status;
  const raw = String(metaStatus ?? evolutionStatus ?? event?.event_type ?? "").toLowerCase();

  if (raw.includes("read")) return "READ";
  if (raw.includes("deliver")) return "DELIVERED";
  if (raw.includes("sent") || raw.includes("server_ack") || raw.includes("device_ack")) return "SENT";
  if (raw.includes("fail") || raw.includes("error")) return "FAILED";
  return "ACCEPTED";
}
