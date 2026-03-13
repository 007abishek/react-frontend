import db from "../config/knex";

export type StripeWebhookEventStatus = "processing" | "processed" | "failed";

export interface StripeWebhookEventRow {
  id: number;
  event_id: string;
  event_type: string;
  status: StripeWebhookEventStatus;
  received_at: Date;
  processed_at: Date | null;
  last_error: string | null;
}

async function createIfMissing(eventId: string, eventType: string): Promise<boolean> {
  const rows = await db<StripeWebhookEventRow>("stripe_webhook_events")
    .insert({
      event_id: eventId,
      event_type: eventType,
      status: "processing",
      processed_at: null,
      last_error: null,
    })
    .onConflict("event_id")
    .ignore()
    .returning("id");

  return rows.length > 0;
}

async function getByEventId(eventId: string): Promise<StripeWebhookEventRow | null> {
  const row = await db<StripeWebhookEventRow>("stripe_webhook_events")
    .select("*")
    .where({ event_id: eventId })
    .first();

  return row ?? null;
}

async function markProcessingFromFailed(eventId: string): Promise<boolean> {
  const rows = await db<StripeWebhookEventRow>("stripe_webhook_events")
    .where({ event_id: eventId, status: "failed" })
    .update({
      status: "processing",
      last_error: null,
      processed_at: null,
    })
    .returning("id");

  return rows.length > 0;
}

async function markProcessed(eventId: string): Promise<void> {
  await db<StripeWebhookEventRow>("stripe_webhook_events")
    .where({ event_id: eventId })
    .update({
      status: "processed",
      processed_at: db.fn.now(),
      last_error: null,
    });
}

async function markFailed(eventId: string, reason: string): Promise<void> {
  await db<StripeWebhookEventRow>("stripe_webhook_events")
    .where({ event_id: eventId })
    .update({
      status: "failed",
      last_error: reason.slice(0, 1000),
      processed_at: null,
    });
}

export async function beginWebhookEventProcessing(
  eventId: string,
  eventType: string
): Promise<"start" | "skip_processed" | "skip_processing"> {
  const created = await createIfMissing(eventId, eventType);
  if (created) return "start";

  const existing = await getByEventId(eventId);
  if (!existing) {
    return "skip_processing";
  }

  if (existing.status === "processed") {
    return "skip_processed";
  }

  if (existing.status === "failed") {
    const requeued = await markProcessingFromFailed(eventId);
    return requeued ? "start" : "skip_processing";
  }

  return "skip_processing";
}

export default {
  markProcessed,
  markFailed,
};
