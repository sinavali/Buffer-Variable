# Node.js Example

## Overview
This example demonstrates using the `buffer-variables` package in a Node.js environment (>=16). It creates a `SharedArrayBuffer` (SAB) to store a `TransactionLog` object, encodes it using the `View` class, and shares it with a worker thread. The worker decodes the data and monitors for updates, showcasing efficient data sharing and mutation.

## Files
- `node-example.ts`: The main script that runs in both the main thread and worker thread.

## Setup
1. Ensure the `buffer-variables` package is built:
   ```bash
   cd P:\buffer-variables
   npm run build
   ```
2. Compile the example:
   ```bash
   cd examples/node-example
   tsc node-example.ts --module commonjs --target es2020
   ```
3. Run the script:
   ```bash
   node node-example.js
   ```

## What Happens
1. **Main Thread**:
   - Creates a `View` for a `TransactionLog` object (`id`, `timestamp`, `amount`, `details`).
   - Allocates a SAB and encodes the initial data.
   - Spawns a worker thread, passing the SAB.
   - After receiving the worker's decoded data, updates `amount` and terminates the worker.
2. **Worker Thread**:
   - Creates a `View` to decode the SAB.
   - Sends the decoded data to the main thread.
   - Polls for SAB updates and logs changes.

## Expected Output
```
Worker decoded: { id: 1, timestamp: [Date], amount: 100.5, details: ['Purchase', 'Online'] }
Worker detected update: { id: 1, timestamp: [Date], amount: 200.75, details: ['Purchase', 'Online'] }
Main thread: Worker terminated
```

## Features Demonstrated
- **Schema Inference**: Automatically infers the schema for `TransactionLog`.
- **Encoding/Decoding**: Serializes/deserializes data to/from SAB.
- **Mutation**: Updates `amount` using `view.set`.
- **Worker Communication**: Shares SAB between threads.