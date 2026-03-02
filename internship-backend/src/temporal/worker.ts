import "dotenv/config";
import path from "path";

import { NativeConnection, Worker } from "@temporalio/worker";

import * as inventoryActivities from "./activities/inventory.activities";
import * as lambdaActivities from "./activities/lambda.activities";
import * as orderActivities from "./activities/order.activities";
import { TEMPORAL_NAMESPACE, TEMPORAL_TASK_QUEUE } from "./config";

async function run() {
  try {
    const connection = await NativeConnection.connect({
      address: process.env.TEMPORAL_ADDRESS || "localhost:7233",
    });

    const activities = {
      ...inventoryActivities,
      ...orderActivities,
      ...lambdaActivities,
    };

    const worker = await Worker.create({
      connection,
      namespace: TEMPORAL_NAMESPACE,
      taskQueue: TEMPORAL_TASK_QUEUE,
      workflowsPath: path.join(__dirname, "workflows", "index.ts"),
      activities,
    });

    console.log("Temporal Worker started");
    console.log(`Task Queue: ${TEMPORAL_TASK_QUEUE}`);
    console.log(`Namespace: ${TEMPORAL_NAMESPACE}`);
    console.log("Inventory Activities:", Object.keys(inventoryActivities).length);
    console.log("Order Activities:", Object.keys(orderActivities).length);
    console.log("Total Activities:", Object.keys(activities).length);

    await worker.run();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Worker failed:", message);
    process.exit(1);
  }
}

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("Fatal worker error:", message);
  process.exit(1);
});