/**
 * Entry point for the buffer-variables package, exporting all public APIs.
 * This module re-exports classes, utilities, and types for encoding/decoding
 * JavaScript objects to/from SharedArrayBuffer, enabling high-performance data
 * sharing in multi-threaded environments. Supports Node.js, browsers, and
 * frameworks like React, Vue, Next.js, and Nuxt.js.
 *
 * @module index
 * @example
 * ```typescript
 * import { View, ViewSync } from 'buffer-variables';
 * const data = { num: 42, str: 'hello' };
 * const view = View.createView(data, { mutable: true });
 * const sab = new SharedArrayBuffer(view.byteSize);
 * view.encode(data, sab);
 * console.log(view.decode(sab)); // { num: 42, str: 'hello' }
 * ```
 */
export * from './view-core';
export * from './view-encode-decode';
export * from './view-mutations';
export * from './view-accessors';
export * from './view-sync';
export * from './schema-inference';
export * from './schema-diff-patch';
export * from './schema-compiler';
export * from './types';
export * from './utils';
