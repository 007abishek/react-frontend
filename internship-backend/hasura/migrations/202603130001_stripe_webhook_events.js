/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function up(knex) {
  const hasStripeWebhookEvents = await knex.schema.hasTable("stripe_webhook_events");
  if (!hasStripeWebhookEvents) {
    await knex.schema.createTable("stripe_webhook_events", (table) => {
      table.increments("id").primary();
      table.text("event_id").notNullable().unique();
      table.text("event_type").notNullable();
      table.text("status").notNullable().defaultTo("processing");
      table.timestamp("received_at").notNullable().defaultTo(knex.fn.now());
      table.timestamp("processed_at").nullable();
      table.text("last_error").nullable();
    });
  }

  await knex.raw(`
    ALTER TABLE stripe_webhook_events
    DROP CONSTRAINT IF EXISTS stripe_webhook_events_status_check
  `);
  await knex.raw(`
    ALTER TABLE stripe_webhook_events
    ADD CONSTRAINT stripe_webhook_events_status_check
    CHECK (status IN ('processing', 'processed', 'failed'))
  `);
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_status
    ON stripe_webhook_events(status)
  `);
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_received_at
    ON stripe_webhook_events(received_at)
  `);
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("stripe_webhook_events");
};
