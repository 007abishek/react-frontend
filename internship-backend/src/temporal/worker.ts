import { NativeConnection, Worker } from '@temporalio/worker';
import * as inventoryActivities from './activities/inventory.activities';
import * as orderActivities from './activities/order.activities';
import path from 'path';

async function run() {
  try {
    // Connect to Temporal
    const connection = await NativeConnection.connect({
      address: process.env.TEMPORAL_ADDRESS || 'localhost:7233',
    });

    // Combine all activities
    const activities = {
      ...inventoryActivities,
      ...orderActivities,
    };

    // Create worker
    const worker = await Worker.create({
      connection,
      namespace: 'default',
      taskQueue: 'ecommerce-orders',
      workflowsPath: path.join(__dirname, 'workflows'),
      activities,
    });

    console.log('🔄 Temporal Worker started');
    console.log('📋 Task Queue: ecommerce-orders');
    console.log('🔧 Inventory Activities:', Object.keys(inventoryActivities).length);
    console.log('🔧 Order Activities:', Object.keys(orderActivities).length);
    console.log('🔧 Total Activities:', Object.keys(activities).length);
    
    // Start worker
    await worker.run();
    
  } catch (error: any) {
    console.error('❌ Worker failed:', error.message);
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
```

---

## File Structure Verification
```
src/temporal/
├── client.ts                           ✅ Given
├── worker.ts                           ✅ Updated
├── workflows/
│   ├── orderPlacement.ts              ✅ Given
│   └── inventoryRelease.ts            ✅ NEW
└── activities/
    ├── inventory.activities.ts        ✅ Given
    └── order.activities.ts            ✅ NEW