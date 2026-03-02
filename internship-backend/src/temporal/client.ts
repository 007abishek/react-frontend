import {
  Client,
  Connection,
  WorkflowExecutionAlreadyStartedError,
  WorkflowIdReusePolicy,
} from "@temporalio/client";

import {
  INVENTORY_CLEANUP_CRON_SCHEDULE,
  TEMPORAL_NAMESPACE,
  TEMPORAL_TASK_QUEUE,
} from "./config";

let client: Client | null = null;

export async function getTemporalClient(): Promise<Client> {
  if (client) {
    return client;
  }

  try {
    const connection = await Connection.connect({
      address: process.env.TEMPORAL_ADDRESS || "localhost:7233",
    });

    client = new Client({
      connection,
      namespace: TEMPORAL_NAMESPACE,
    });

    console.log("Connected to Temporal");
    return client;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Failed to connect to Temporal:", message);
    throw error;
  }
}

export async function getWorkflowHandle(workflowId: string) {
  const temporalClient = await getTemporalClient();
  return temporalClient.workflow.getHandle(workflowId);
}

export async function startWorkflowIdempotent(params: {
  workflowType: string;
  workflowId: string;
  taskQueue: string;
  args?: unknown[];
}): Promise<{ started: boolean }> {
  const temporalClient = await getTemporalClient();

  try {
    await temporalClient.workflow.start(params.workflowType, {
      workflowId: params.workflowId,
      taskQueue: params.taskQueue,
      args: params.args ?? [],
      workflowIdReusePolicy: WorkflowIdReusePolicy.WORKFLOW_ID_REUSE_POLICY_REJECT_DUPLICATE,
    });
    return { started: true };
  } catch (error: unknown) {
    if (error instanceof WorkflowExecutionAlreadyStartedError) {
      return { started: false };
    }
    throw error;
  }
}

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

export async function ensureInventoryCleanupTemporalCron(): Promise<void> {
  const temporalClient = await getTemporalClient();

  try {
    await temporalClient.workflow.start("inventoryCleanupSweepWorkflow", {
      workflowId: "inventory-cleanup-sweep-cron",
      taskQueue: TEMPORAL_TASK_QUEUE,
      cronSchedule: INVENTORY_CLEANUP_CRON_SCHEDULE,
      workflowIdReusePolicy: WorkflowIdReusePolicy.WORKFLOW_ID_REUSE_POLICY_REJECT_DUPLICATE,
    });
    console.log("Temporal inventory cleanup cron workflow started");
  } catch (error: unknown) {
    if (error instanceof WorkflowExecutionAlreadyStartedError) {
      console.log("Temporal inventory cleanup cron workflow already active");
      return;
    }
    throw error;
  }
}