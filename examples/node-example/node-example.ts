/**
 * Demonstrates buffer-variables usage in a Node.js environment.
 * Creates a SharedArrayBuffer, encodes data using View, and shares it
 * with a worker thread for processing.
 *
 * @module node-example
 * @requires buffer-variables
 * @requires worker_threads
 */

import { View } from "@fbb-org/buffer-variables"
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';

/**
 * Sample data structure for testing.
 * Represents a financial transaction log.
 */
interface TransactionLog {
  id: number;
  timestamp: Date;
  amount: number;
  details: string[];
}

/**
 * Main function for the Node.js example.
 * Runs in the main thread or worker thread based on context.
 */
function run(): void {
  if (isMainThread) {
    // Main thread: Create View and SAB
    const initialData: TransactionLog = {
      id: 1,
      timestamp: new Date(),
      amount: 100.50,
      details: ['Purchase', 'Online'],
    };

    const view = View.createView(initialData, { mutable: true });
    const sab = new SharedArrayBuffer(view.byteSize);
    view.encode(initialData, sab);

    // Spawn worker
    const worker = new Worker(__filename, { workerData: sab });

    worker.on('message', (msg: { type: string; data: any }) => {
      if (msg.type === 'decoded') {
        console.log('Worker decoded:', msg.data);
        // Update data
        view.set('amount', 200.75, sab);
        setTimeout(() => {
          worker.terminate();
          console.log('Main thread: Worker terminated');
        }, 1000);
      }
    });

    worker.on('error', err => console.error('Worker error:', err));
  } else {
    // Worker thread: Decode SAB
    const sab: SharedArrayBuffer = workerData;
    const view = View.createView({
      id: 0,
      timestamp: new Date(),
      amount: 0,
      details: [],
    }, { mutable: true });

    const decoded = view.decode(sab);
    parentPort!.postMessage({ type: 'decoded', data: decoded });

    // Watch for updates
    let lastVersion = Atomics.load(new Int32Array(sab, 0, 1), 0);
    const interval = setInterval(() => {
      const version = Atomics.load(new Int32Array(sab, 0, 1), 0);
      if (version !== lastVersion) {
        lastVersion = version;
        console.log('Worker detected update:', view.decode(sab));
        clearInterval(interval);
      }
    }, 100);
  }
}

// Execute
run();