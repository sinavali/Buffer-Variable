I encountered codes and APIs working not as intended
Do not use, or use it and be ready for a new version next week with unit tests involved in codebase and usable methods.

**I used grok to generate JSDoc and README.MD**

# Buffer Variables

**buffer-variables** is a high-performance, TypeScript-based library for encoding and decoding complex JavaScript objects into `SharedArrayBuffer` for efficient data sharing across threads or workers in both Node.js and browser environments. Optimized for large datasets (~50MB, 10-layer nested objects) with processing times of ~120–172ms, it supports mutable/immutable views, automatic schema inference, partial updates, diff/patch operations, and real-time synchronization. The library is compatible with Node.js, modern browsers, and frontend frameworks like React and Vue, making it ideal for collaborative applications, data processing pipelines, and performance-critical systems.

---

## Table of Contents

1. [Introduction](#introduction)
2. [Features](#features)
3. [Minimum Requirements](#minimum-requirements)
4. [Installation](#installation)
5. [Quick Start](#quick-start)
6. [Usage Examples](#usage-examples)
   - [Node.js: Encoding and Decoding](#nodejs-encoding-and-decoding)
   - [Browser: Partial Updates](#browser-partial-updates)
   - [React: Real-Time Synchronization](#react-real-time-synchronization)
   - [Vue: Schema Export/Import](#vue-schema-exportimport)
   - [Low-Level Debugging](#low-level-debugging)
7. [API Documentation](#api-documentation)
   - [Non-Advanced APIs](#non-advanced-apis)
   - [Advanced APIs](#advanced-apis)
   - [Low-Level APIs](#low-level-apis)
8. [Performance Considerations](#performance-considerations)
9. [Contributing and Extending](#contributing-and-extending)
   - [Project Structure](#project-structure)
   - [Setup for Development](#setup-for-development)
   - [Extending the Package](#extending-the-package)
   - [Coding Guidelines](#coding-guidelines)
   - [Testing with Jest](#testing-with-jest)
   - [Contribution Workflow](#contribution-workflow)
   - [Performance Optimization Tips](#performance-optimization-tips)
   - [Debugging and Logging](#debugging-and-logging)
10. [License](#license)

---

## Introduction

**buffer-variables** enables efficient serialization of JavaScript objects into `SharedArrayBuffer` for multi-threaded environments, such as Node.js Worker Threads, Web Workers, or frontend frameworks. Unlike JSON, it uses a binary format for speed and memory efficiency, supporting applications like real-time collaboration tools, high-performance computing, and state synchronization.

Key abstractions:
- **`View`**: Encodes/decodes objects to/from `SharedArrayBuffer`, with schema inference, partial updates, and diff/patch.
- **`ViewSync`**: Binds variables to `SharedArrayBuffer` for real-time synchronization.

Use cases:
- Sharing large datasets across threads or workers.
- Synchronizing state in collaborative applications.
- Optimizing binary data processing.
- Debugging complex data structures.

The library is TypeScript-based, ensuring type safety, and supports Node.js, browsers, and frameworks like React and Vue.

---

## Features

- **Cross-Platform**: Works in Node.js, browsers, and frontend frameworks.
- **High Performance**: ~120–172ms for 50MB, 10-layer objects using typed arrays and LRU caching.
- **Schema Inference**: Automatically infers schemas for primitives, strings, arrays, objects, and typed arrays.
- **Mutable/Immutable Views**: Supports updates or read-only access.
- **Partial Updates**: Modify specific fields efficiently.
- **Diff/Patch**: Generate and apply patches for minimal updates.
- **Synchronization**: Real-time binding with `ViewSync`.
- **Compression**: Customizable string compression.
- **Extensibility**: Hooks and low-level APIs for customization.
- **Debugging**: Tools for inspecting bytes and schemas.
- **Type Safety**: Comprehensive TypeScript definitions.
- **Modular**: Small, maintainable modules (~100–200 lines).

---

## Minimum Requirements

### Node.js
- **Version**: Node.js >= 16.0.0 (due to `SharedArrayBuffer` support).
- **Environment**: No special flags required, as `SharedArrayBuffer` is enabled by default.
- **Dependencies**: None beyond standard Node.js APIs.

### Browser
- **Browsers**: Chrome 68+, Firefox 79+, Safari 15.4+, Edge 79+.
- **Cross-Origin Isolation**: Required for `SharedArrayBuffer`. Serve over HTTPS with:
  ```http
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: require-corp
  ```
- **JavaScript Environment**: ES2015+ support.
- **Dependencies**: None, but a bundler (e.g., esbuild, Webpack) is recommended.

### Frontend Frameworks
- **React**: >= 16.8.0 (Hooks support).
- **Vue**: >= 3.0.0 (Composition API recommended).
- **Bundler**: esbuild, Webpack, or Vite for module bundling.

---

## Installation

Install via npm or yarn:

```bash
npm install @fbb-org/buffer-variables
```

Or with yarn:

```bash
yarn add @fbb-org/buffer-variables
```

### Node.js
Use directly with CommonJS or ESM:

```javascript
// CommonJS
const { View } = require('@fbb-org/buffer-variables');
// ESM
import { View } from '@fbb-org/buffer-variables';
```

### Browser
Bundle the library using esbuild (see [Build Setup](#build-setup)) and include in HTML:

```html
<script src="/dist/buffer-variables.umd.js"></script>
<script>
  const { View } = bufferVariables;
</script>
```

Ensure cross-origin isolation headers are set (see [Browser Setup](#browser-setup)).

### Frontend Frameworks
Import in React or Vue projects after bundling:

```javascript
import { View } from '@fbb-org/buffer-variables';
```

### Build Setup
The package provides dual builds (Node.js: CommonJS/ESM, Browser: UMD) via esbuild. Run:

```bash
npm run build
```

This generates:
- `dist/index.cjs.js`: CommonJS for Node.js.
- `dist/index.esm.js`: ESM for Node.js and bundlers.
- `dist/buffer-variables.umd.js`: UMD for browsers.

See `esbuild.config.js` for configuration.

---

## Quick Start

### Node.js
```javascript
import { View } from '@fbb-org/buffer-variables';

const data = { num: 42, str: 'hello', arr: [1, 2, 3] };
const view = View.createView(data, { mutable: true });
const sab = new SharedArrayBuffer(view.byteSize);

view.encode(data, sab);
console.log(view.decode(sab)); // { num: 42, str: 'hello', arr: [1, 2, 3] }
```

### Browser
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <script src="/dist/buffer-variables.umd.js"></script>
</head>
<body>
  <script>
    const { View } = bufferVariables;
    const data = { num: 42 };
    const view = View.createView(data, { mutable: true });
    const sab = new SharedArrayBuffer(view.byteSize);
    view.encode(data, sab);
    console.log(view.decode(sab)); // { num: 42 }
  </script>
</body>
</html>
```

Ensure the server sets cross-origin isolation headers.

---

## Usage Examples

### Node.js: Encoding and Decoding
```javascript
import { View } from '@fbb-org/buffer-variables';

const data = {
  user: { id: 123, name: 'Alice', scores: [95, 88, 92] },
  settings: { theme: 'dark' },
};

const view = View.createView(data, { mutable: true });
const sab = new SharedArrayBuffer(view.byteSize);

view.encode(data, sab);
console.log(view.decode(sab));
// { user: { id: 123, name: 'Alice', scores: [95, 88, 92] }, settings: { theme: 'dark' } }
```

### Browser: Partial Updates
```html
<script src="/dist/buffer-variables.umd.js"></script>
<script>
  const { View } = bufferVariables;
  const data = { name: 'Bob', count: 0 };
  const view = View.createView(data, { mutable: true });
  const sab = new SharedArrayBuffer(view.byteSize);
  view.encode(data, sab);

  view.set('count', 100, sab);
  console.log(view.decodePartial('count', sab)); // 100
</script>
```

### React: Real-Time Synchronization
```jsx
import React, { useState, useEffect } from 'react';
import { View, ViewSync } from '@fbb-org/buffer-variables';

const App = () => {
  const [view] = useState(() => View.createView({ counter: 0 }, { mutable: true }));
  const [sab] = useState(new SharedArrayBuffer(view.byteSize));
  const [data, setData] = useState({ counter: 0 });

  useEffect(() => {
    const sync = new ViewSync(view, sab);
    const boundData = sync.bind(data);
    sync.onUpdateCallback(updated => setData({ ...boundData }));
    view.encode(data, sab);
    return () => sync.destroy();
  }, []);

  const increment = () => {
    data.counter++;
    view.encode(data, sab);
  };

  return (
    <div>
      <h1>Counter: {data.counter}</h1>
      <button onClick={increment}>Increment</button>
    </div>
  );
};

export default App;
```

### Vue: Mixed Data
```vue
<template>
  <div>
    <h1>{{ data.name }}</h1>
    <button @click="updateName">Update Name</button>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { View, ViewSync } from '@fbb-org/buffer-variables';

const view = new View().createView({ name: 'Alice' }, { mutable: true });
const sab = new SharedArrayBuffer(view.byteSize);
const data = ref({ name: 'Alice' });

onMounted(() => {
  const sync = new ViewSync(view, sab);
  const boundData = sync.bind(data.value);
  sync.onUpdateCallback(updated => {
    data.value = { ...boundData };
  });
  view.encode(data.value, sab);
});

const updateName = () => {
  data.value.name = 'Bob';
  view.encode(data.value, sab);
};

onUnmounted(() => {
  sync.destroy();
});
</script>
```

### Low-Level Debugging
```javascript
const view = View.createView({ num: 42 }, { mutable: true, exposedLowLevelApi: true });
const sab = new SharedArrayBuffer(view.byteSize);
view.encode({ num: 42 }, sab);

view.lowLevel.setLog(console.log);
view.lowLevel.log('Dumping bytes...');
console.log(view.lowLevel.dumpBytes(sab)); // Hex string
console.log(view.lowLevel.readRaw(8, 'Uint32', sab)); // 42
```

---

## API Documentation

### Non-Advanced APIs
- `View.createView<T>(data: T, options?: { mutable?: boolean, compression?: 'default' | 'none' | (str: string) => Uint8Array, exposedLowLevelApi?: boolean })`
  ```javascript
  const view = View.createView({ foo: 'bar' }, { mutable: true });
  ```
- `encode(data: T, sab: SharedArrayBuffer)`
  ```javascript
  view.encode({ foo: 'bar' }, sab);
  ```
- `decode(sab: SharedArrayBuffer): T`
  ```javascript
  console.log(view.decode(sab)); // { foo: 'bar' }
  ```
- `set(path: string, value: any, sab: SharedArrayBuffer)`
  ```javascript
  view.set('foo', 'baz', sab);
  ```
- `decodePartial(path: string, sab: SharedArrayBuffer): any`
  ```javascript
  console.log(view.decodePartial('foo', sab)); // 'baz'
  ```
- `bulkSet(pathsAndValues: Record<string, any>, sab: SharedArrayBuffer)`
  ```javascript
  view.bulkSet({ 'foo': 'baz', 'bar': 123 }, sab);
  ```
- `patch(path: string, partial: any, sab: SharedArrayBuffer)`
  ```javascript
  view.patch('obj', { y: 2 }, sab);
  ```
- `destroy()`
  ```javascript
  view.destroy();
  ```
- `ViewSync<T>(view: View<T>, sab: SharedArrayBuffer, options?: { pollInterval?: number, boundPaths?: string[] })`
  ```javascript
  const sync = new ViewSync(view, sab);
  ```
- `bind(variable: T, paths?: string[]): T`
  ```javascript
  const obj = sync.bind({ foo: 'bar' });
  ```
- `syncToSab()`
  ```javascript
  sync.syncToSab();
  ```
- `onUpdateCallback(callback: (data: Partial<T>) => void)`
  ```javascript
  sync.onUpdateCallback(data => console.log(data));
  ```
- `destroy()`
  ```javascript
  sync.destroy();
  ```

### Advanced APIs
- `advanced.ptr(path: string): { offset: number, type: string }`
  ```javascript
  console.log(view.advanced.ptr('foo')); // { offset: 8, type: 'String' }
  ```
- `advanced.flat.get(path: string): { offset: number, type: string }`
  ```javascript
  console.log(view.advanced.flat.get('foo'));
  ```
- `advanced.resize(path: string, newSize: number, sab: SharedArrayBuffer)`
  ```javascript
  view.advanced.resize('arr', 10, sab);
  ```
- `advanced.mutate(path: string, mutator: (current: any) => any, sab: SharedArrayBuffer)`
  ```javascript
  view.advanced.mutate('num', x => x + 1, sab);
  ```
- `advanced.directPatch(partial: any, sab: SharedArrayBuffer)`
  ```javascript
  view.advanced.directPatch({ foo: 123 }, sab);
  ```
- `getTypedArray(path: string, sab: SharedArrayBuffer): TypedArray`
  ```javascript
  const arr = view.getTypedArray('scores', sab);
  ```
- `exportSchema(): string`
  ```javascript
  const schema = view.exportSchema();
  ```
- `View.importSchema<T>(schemaJson: string, byteSize: number): View<T>`
  ```javascript
  const newView = View.importSchema(schema, view.byteSize);
  ```
- `schemaUpdate(path: string, value: any, sab: SharedArrayBuffer)`
  ```javascript
  view.schemaUpdate('obj.newField', 42, sab);
  ```

### Low-Level APIs
Enabled with `exposedLowLevelApi: true`.
- `lowLevel.getSchema(): View.schema`
- `lowLevel.readRaw(offset: number, type: string, sab: SharedArrayBuffer): any`
- `lowLevel.writeRaw(offset: number, type: string, value: any, sab: SharedArrayBuffer)`
- `lowLevel.getVersion(sab: SharedArrayBuffer): number`
- `lowLevel.getSchemaId(sab: SharedArrayBuffer): number`
- `lowLevel.resolvePath(path: string): { offset: number, type: string }`
- `lowLevel.executeTemplate(index: number, value: any, sab: SharedArrayBuffer)`
- `lowLevel.dumpBytes(sab: SharedArrayBuffer, start?: number, end?: number): string`
- `lowLevel.diffSchema(otherSchema: View.schema): string[]`
- `lowLevel.log(message: string)`
- `lowLevel.setLog(fn: (message: string) => void)`

---

## Performance Considerations
- **Optimizations**: Uses typed arrays, LRU caching (10,000 entries), and flatIndex for O(1) path lookups.
- **Tips**:
  - Use `set`/`patch` for small updates.
  - Leverage `getTypedArray` for arrays.
  - Batch updates with `bulkSet`.
  - Adjust `pollInterval` in `ViewSync`.
- **Benchmarking**:
  ```javascript
  const data = { arr: new Array(1000000).fill(1) };
  const view = View.createView(data, { mutable: true });
  const sab = new SharedArrayBuffer(view.byteSize);
  console.time('encode');
  view.encode(data, sab);
  console.timeEnd('encode'); // ~120–172ms
  ```

---

## Contributing and Extending

### Project Structure
- `src/index.ts`: Exports APIs.
- `src/view-core.ts`: Core `View` class.
- `src/view-encode-decode.ts`: Encoding/decoding.
- `src/view-mutations.ts`: Mutations.
- `src/view-accessors.ts`: Accessors and low-level APIs.
- `src/view-sync.ts`: `ViewSync` and `LRUCache`.
- `src/schema-inference.ts`: Schema inference.
- `src/schema-diff-patch.ts`: Diff/patch.
- `src/schema-compiler.ts`: Schema compilation.
- `src/types.ts`: Types.
- `src/utils.ts`: Utilities.
- `tests/`: Jest tests.
- `package.json`: Configuration.
- `tsconfig.json`: TypeScript setup.
- `esbuild.config.js`: Build config.

### Setup for Development
```bash
git clone https://github.com/sinavali/Buffer-Variable.git
cd buffer-variables
npm install
npm test
npm run build
```

### Extending the Package
- **New Types**: Update `inferSchema` and `types.ts`.
- **Custom Compression**: Modify `utils.ts`.
- **Hooks**: Add to `view-core.ts`.
- **APIs**: Extend `view-mutations.ts` or `view-accessors.ts`.

### Coding Guidelines
- Files: ~100–200 lines.
- TypeScript: Strict typing.
- JSDoc: Document APIs.
- Naming: `camelCase` for methods, `PascalCase` for classes.

### Testing with Jest
Tests use Jest with coverage:
```bash
npm test
npm test -- --coverage
```

### Contribution Workflow
1. Fork the repo.
2. Create a branch: `git checkout -b feature/my-feature`.
3. Commit: `git commit -m "Add feature"`.
4. Push: `git push origin feature/my-feature`.
5. Open a pull request.

### Performance Optimization Tips
- Cache paths with `pathCache`.
- Use `TypedArray` for arrays.
- Batch schema updates.

### Debugging and Logging
```javascript
view.lowLevel.setLog(console.log);
view.lowLevel.log('Debug');
```

---

## License
MIT License. See [LICENSE](LICENSE).
