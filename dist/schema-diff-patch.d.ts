/**
 * Provides diff and patch functionality for SharedArrayBuffer data.
 * Generates patches by comparing old and new data and applies patches
 * to update the buffer efficiently. Integrates with View instances for
 * schema-based operations in Node.js and browser environments.
 *
 * @module schema-diff-patch
 */
import { View } from './view-core';
import { Patch } from './types';
/**
 * Generates a diff between old and new data.
 * Compares the contents of a SharedArrayBuffer with new data to produce
 * an array of patches representing the differences.
 *
 * @template T - The type of the data being compared.
 * @param {View<T>} view - The View instance managing the schema and buffer operations.
 * @param {SharedArrayBuffer} oldSab - The old SharedArrayBuffer containing existing data.
 * @param {T} newData - The new data to compare against the old buffer.
 * @returns {Patch[]} An array of patches describing changes (add, remove, replace).
 * @throws {Error} If the buffer is too small or the schema is invalid.
 * @example
 * ```typescript
 * const view = View.createView({ num: 42, str: 'hello' }, { mutable: true });
 * const sab = new SharedArrayBuffer(view.byteSize);
 * view.encode({ num: 42, str: 'hello' }, sab);
 * const patches = diff(view, sab, { num: 100, str: 'world' });
 * console.log(patches); // [{ op: 'replace', path: 'num', value: 100 }, { op: 'replace', path: 'str', value: 'world' }]
 * ```
 */
export declare function diff<T extends object>(view: View<T>, oldSab: SharedArrayBuffer, newData: T): Patch[];
/**
 * Applies a patch to a SharedArrayBuffer.
 * Updates the buffer by applying a single patch operation (add, remove, replace).
 *
 * @template T - The type of the data in the View.
 * @param {View<T>} view - The View instance managing the schema and buffer operations.
 * @param {SharedArrayBuffer} sab - The SharedArrayBuffer to update.
 * @param {Patch} patch - The patch to apply.
 * @throws {Error} If the view is immutable, buffer is too small, or path is invalid.
 * @example
 * ```typescript
 * const patch = { op: 'replace', path: 'num', value: 100 };
 * applyPatch(view, sab, patch);
 * console.log(view.decode(sab).num); // 100
 * ```
 */
export declare function applyPatch<T extends object>(view: View<T>, sab: SharedArrayBuffer, patch: Patch): void;
