export const TEMPORAL_NAMESPACE = process.env.TEMPORAL_NAMESPACE || "default";
export const TEMPORAL_TASK_QUEUE = process.env.TEMPORAL_TASK_QUEUE || "ecommerce-orders";
export const INVENTORY_CLEANUP_CRON_SCHEDULE =
  process.env.INVENTORY_CLEANUP_CRON_SCHEDULE || "* * * * *";
