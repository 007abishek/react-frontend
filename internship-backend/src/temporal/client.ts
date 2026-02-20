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