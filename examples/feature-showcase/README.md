# Feature Showcase

## Overview
This example showcases advanced features of `buffer-variables` in a Node.js environment, including diff/patch, low-level APIs, and schema updates. It uses a `Task` object to demonstrate these capabilities.

## Files
- `feature-showcase.ts`: The script demonstrating advanced features.

## Setup
1. Build the package:
   ```bash
   cd P:\buffer-variables
   npm run build
   ```
2. Compile the example:
   ```bash
   cd examples/feature-showcase
   tsc feature-showcase.ts --module commonjs --target es2020
   ```
3. Run the script:
   ```bash
   node feature-showcase.js
   ```

## What Happens
1. Creates a `View` for a `Task` object (`title`, `priority`, `tags`) with low-level APIs enabled.
2. Allocates a SAB and encodes the initial data.
3. **Diff/Patch**: Generates patches for updated data and applies them.
4. **Low-Level API**: Reads/writes raw data at the `title` path.
5. **Schema Update**: Updates the `priority` value.
6. **Schema Export**: Exports the schema as JSON.

## Expected Output
```
Diff patches: [
  { op: 'replace', path: 'title', value: 'Complete Project v2' },
  { op: 'replace', path: 'priority', value: 4 },
  { op: 'replace', path: 'tags', value: Uint8Array [1, 2, 3] }
]
After patch: { title: 'Complete Project v2', priority: 4, tags: Uint8Array [1, 2, 3] }
Raw title read: Complete Project v2
After raw write: { title: 'Final Project', priority: 4, tags: Uint8Array [1, 2, 3] }
After schema update: { title: 'Final Project', priority: 5, tags: Uint8Array [1, 2, 3] }
Exported schema size: [JSON length]
```

## Features Demonstrated
- **Diff/Patch**: Generates and applies patches for efficient updates.
- **Low-Level API**: Direct buffer manipulation with `readRaw`/`writeRaw`.
- **Schema Update**: Dynamically updates schema and data.
- **Schema Export**: Serializes schema for storage/transfer.
- **Performance**: Uses optimized data structures (flatIndex, typed arrays).