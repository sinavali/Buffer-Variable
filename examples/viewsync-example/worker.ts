/**
 * Worker script for ViewSync example.
 * Synchronizes data with the main thread using ViewSync.
 *
 * @module worker
 * @requires buffer-variables
 */

import { View, ViewSync } from 'buffer-variables';

/**
 * Interface for worker messages.
 */
interface WorkerMessage {
  type: 'init' | 'ready' | 'update';
  sab?: SharedArrayBuffer;
  data?: any;
}

/**
 * Sample data structure expected in the SharedArrayBuffer.
 */
interface ChatState {
  messages: string[];
  userCount: number;
  active: boolean;
}

/**
 * Worker context.
 */
const ctx: Worker = self as any;

/**
 * Initializes the worker with ViewSync.
 *
 * @param {SharedArrayBuffer} sab - The SharedArrayBuffer to synchronize.
 */
function initWorker(sab: SharedArrayBuffer): void {
  const sampleData: ChatState = {
    messages: [],
    userCount: 0,
    active: false,
  };
  const view = View.createView(sampleData, { mutable: true });
  const sync = new ViewSync(view, sab, { pollInterval: 16 });
  const boundState = sync.bind({ ...sampleData });

  sync.onUpdateCallback((data: Partial<ChatState>) => {
    ctx.postMessage({ type: 'update', data });
    console.log('Worker sync update:', data);
  });

  setTimeout(() => {
    boundState.userCount = 3;
    sync.syncToSab();
  }, 2000);
}

ctx.onmessage = (event: MessageEvent<WorkerMessage>) => {
  if (event.data.type === 'init' && event.data.sab) {
    initWorker(event.data.sab);
  }
};

ctx.postMessage({ type: 'ready' });