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
