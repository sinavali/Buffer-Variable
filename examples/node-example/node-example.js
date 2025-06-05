"use strict";
/**
 * Demonstrates buffer-variables usage in a Node.js environment.
 * Creates a SharedArrayBuffer, encodes data using View, and shares it
 * with a worker thread for processing.
 *
 * @module node-example
 * @requires buffer-variables
 * @requires worker_threads
 */
Object.defineProperty(exports, "__esModule", { value: true });
const buffer_variables_1 = require("@fbb-org/buffer-variables");
const worker_threads_1 = require("worker_threads");
/**
 * Main function for the Node.js example.
 * Runs in the main thread or worker thread based on context.
 */
function run() {
    if (worker_threads_1.isMainThread) {
        // Main thread: Create View and SAB
        const initialData = {
            id: 1,
            timestamp: new Date(),
            amount: 100.50,
            details: ['Purchase', 'Online'],
        };
        const view = buffer_variables_1.View.createView(initialData, { mutable: true });
        const sab = new SharedArrayBuffer(view.byteSize);
        view.encode(initialData, sab);
        // Spawn worker
        const worker = new worker_threads_1.Worker(__filename, { workerData: sab });
        worker.on('message', (msg) => {
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
    }
    else {
        // Worker thread: Decode SAB
        const sab = worker_threads_1.workerData;
        const view = buffer_variables_1.View.createView({
            id: 0,
            timestamp: new Date(),
            amount: 0,
            details: [],
        }, { mutable: true });
        const decoded = view.decode(sab);
        worker_threads_1.parentPort.postMessage({ type: 'decoded', data: decoded });
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
