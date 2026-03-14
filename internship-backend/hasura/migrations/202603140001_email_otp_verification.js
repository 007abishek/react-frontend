/**
 * Email OTP verification support.
 *
 * Adds:
 * - users.email_verified (boolean)
 * - email_otps table for short-lived OTP storage/verification
 */

/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function up(knex) {
  const hasEmailOtps = await knex.schema.hasTable("email_otps");
  if (!hasEmailOtps) {
    await knex.schema.createTable("email_otps", (table) => {
      table.increments("id").primary();
      table.text("email").notNullable();
      table.text("purpose").notNullable().defaultTo("email_verification");
      table.text("code_hash").notNullable();
      table.text("salt").notNullable();
      table.integer("attempts").notNullable().defaultTo(0);
      table.timestamp("expires_at").notNullable();
      table.timestamp("consumed_at").nullable();
      table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
      table.index(["email", "purpose", "created_at"], "idx_email_otps_lookup");
    });
  }

  await knex.raw(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE
  `);
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function down(knex) {
  await knex.raw(`
    ALTER TABLE users
    DROP COLUMN IF EXISTS email_verified
  `);
  await knex.schema.dropTableIfExists("email_otps");
};

