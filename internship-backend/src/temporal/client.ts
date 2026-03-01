import { Connection, Client } from '@temporalio/client';

let client: Client | null = null;

// Connect to Temporal server
export async function getTemporalClient(): Promise<Client> {
  if (client) {
    return client;
  }

  try {
    const connection = await Connection.connect({
      address: process.env.TEMPORAL_ADDRESS || 'localhost:7233',
    });

    client = new Client({
      connection,
      namespace: 'default',
    });

    console.log('✅ Connected to Temporal');
    return client;
  } catch (error: any) {
    console.error('❌ Failed to connect to Temporal:', error.message);
    throw error;
  }
}

// Get existing workflow handle
export async function getWorkflowHandle(workflowId: string) {
  const client = await getTemporalClient();
  return client.workflow.getHandle(workflowId);
}

// Start workflow with deterministic ID and treat "already started" as success.
export async function startWorkflowIdempotent(params: {
  workflowType: string;
  workflowId: string;
  taskQueue: string;
  args?: unknown[];
}): Promise<{ started: boolean }> {
  const client = await getTemporalClient();

  try {
    await client.workflow.start(params.workflowType, {
      workflowId: params.workflowId,
      taskQueue: params.taskQueue,
      args: params.args ?? [],
    });
    return { started: true };
  } catch (error: any) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.toLowerCase().includes('already started')) {
      return { started: false };
    }
    throw error;
  }
}

// Best-effort cancellation for superseded attempts.
export async function cancelWorkflowById(workflowId: string): Promise<void> {
  try {
    const handle = await getWorkflowHandle(workflowId);
    await handle.cancel();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const lowered = message.toLowerCase();
    if (
      lowered.includes("not found") ||
      lowered.includes("already completed") ||
      lowered.includes("already closed")
    ) {
      return;
    }
    throw error;
  }
}

// Ensure a Temporal-server-managed cron workflow exists for inventory cleanup.
export async function ensureInventoryCleanupTemporalCron(): Promise<void> {
  const client = await getTemporalClient();

  try {
    await client.workflow.start("inventoryCleanupSweepWorkflow", {
      workflowId: "inventory-cleanup-sweep-cron",
      taskQueue: "ecommerce-orders",
      cronSchedule: "* * * * *",
    });
    console.log("✅ Temporal inventory cleanup cron workflow started");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.toLowerCase().includes("already started")) {
      console.log("ℹ️ Temporal inventory cleanup cron workflow already active");
      return;
    }
    throw error;
  }
}
