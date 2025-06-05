# ViewSync Example

## Overview
This example demonstrates `ViewSync` for real-time data synchronization between a browser main thread and a worker. It uses a `ChatState` object to simulate a chat application, with updates propagated via a `SharedArrayBuffer`.

## Files
- `viewsync-example.ts`: The main script for setting up ViewSync and worker communication.
- `worker.ts`: The worker script for synchronizing data.
- `index.html` (optional): Create to load the script (similar to browser-example).

## Setup
1. Ensure cross-origin isolation:
   ```bash
   npx http-server -p 8080 --coep require-corp --coop same-origin
   ```
2. Build the package:
   ```bash
   cd P:\buffer-variables
   npm run build
   ```
3. Compile the example:
   ```bash
   cd examples/viewsync-example
   tsc viewsync-example.ts worker.ts --module esnext --target es2020
   ```
4. Serve and open `http://localhost:8080/examples/viewsync-example`.

## What Happens
1. **Main Thread**:
   - Creates a `View` and SAB for a `ChatState` object (`messages`, `userCount`, `active`).
   - Sets up `ViewSync` and binds a local variable.
   - Sends the SAB to the worker and adds a new message after 1 second.
   - Cleans up after 3 seconds.
2. **Worker**:
   - Receives the SAB, sets up `ViewSync`, and binds a local variable.
   - Updates `userCount` after 2 seconds.
   - Reports updates to the main thread.

## Expected Output
```
Main initial state: { messages: ['Hello!', 'Welcome!'], userCount: 2, active: true }
Main sync update: { messages: ['Hello!', 'Welcome!', 'Main thread message'] }
Worker sync update: { messages: ['Hello!', 'Welcome!', 'Main thread message'] }
Worker sync update: { userCount: 3 }
Main received update: { userCount: 3 }
Main cleanup complete
```

## Features Demonstrated
- **ViewSync**: Synchronizes data between threads.
- **Schema Inference**: Infers schema for `ChatState`.
- **Real-Time Updates**: Propagates changes with ~60fps polling.
- **Worker Communication**: Shares SAB efficiently.