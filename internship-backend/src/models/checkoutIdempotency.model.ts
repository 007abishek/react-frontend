import db from "../config/knex";

const purgeExpired = async (): Promise<number> => {
  const rows = await db("checkout_idempotency")
    .where("expires_at", "<", db.fn.now())
    .del()
    .returning("id");

  return rows.length;
};

export default {
  purgeExpired,
};

