/**
 * Demonstrates ViewSync usage in a browser environment.
 * Synchronizes data between main thread and worker using SharedArrayBuffer.
 *
 * @module viewsync-example
 * @requires buffer-variables
 */

import { View, ViewSync } from 'buffer-variables';

/**
 * Sample data structure for testing.
 * Represents a chat application state.
 */
interface ChatState {
  messages: string[];
  userCount: number;
  active: boolean;
}

/**
 * Main function for the ViewSync example.
 * Sets up ViewSync and communicates with a worker.
 */
async function main(): Promise<void> {
  const initialData: ChatState = {
    messages: ['Hello!', 'Welcome!'],
    userCount: 2,
    active: true,
  };

  const view = View.createView(initialData, { mutable: true });
  const sab = new SharedArrayBuffer(view.byteSize);
  view.encode(initialData, sab);

  const sync = new ViewSync(view, sab, { pollInterval: 16 });
  const boundState = sync.bind({ ...initialData });
  console.log('Main initial state:', boundState);

  const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });

  worker.onmessage = (event: MessageEvent) => {
    const { type, data } = event.data;
    if (type === 'ready') {
      worker.postMessage({ type: 'init', sab });
    } else if (type === 'update') {
      console.log('Main received update:', data);
    }
  };

  sync.onUpdateCallback((data: Partial<ChatState>) => {
    console.log('Main sync update:', data);
  });

  setTimeout(() => {
    boundState.messages.push('Main thread message');
    sync.syncToSab();
  }, 1000);

  setTimeout(() => {
    sync.destroy();
    worker.terminate();
    console.log('Main cleanup complete');
  }, 3000);
}

main().catch(console.error);