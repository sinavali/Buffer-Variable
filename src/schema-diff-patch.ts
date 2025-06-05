/**
 * Provides diff and patch functionality for SharedArrayBuffer data.
 * Generates patches by comparing old and new data and applies patches
 * to update the buffer efficiently. Integrates with View instances for
 * schema-based operations in Node.js and browser environments.
 *
 * @module schema-diff-patch
 */

import { View } from './view-core';
import { Descriptor, Patch } from './types';

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
export function diff<T extends object>(view: View<T>, oldSab: SharedArrayBuffer, newData: T): Patch[] {
  if (oldSab.byteLength < view.schema.byteSize) {
    throw new Error(`Buffer too small: ${oldSab.byteLength} < ${view.schema.byteSize}`);
  }
  const patches: Patch[] = [];
  const descriptor = view.schema.descriptorTree;

  /**
   * Recursively compares old and new values to generate patches.
   *
   * @param {Descriptor} desc - The descriptor for the current value.
   * @param {string} path - The current path (e.g., 'foo.bar[0]').
   * @param {any} oldValue - The old value from the buffer.
   * @param {any} newValue - The new value from the input data.
   */
  function compare(desc: Descriptor, path: string, oldValue: any, newValue: any): void {
    if (oldValue === newValue) return;

    if (desc.type === 'Primitive' || desc.type === 'TypedArray') {
      patches.push({ op: 'replace', path, value: newValue });
    } else if (desc.type === 'Object') {
      const oldKeys = Object.keys(oldValue || {});
      const newKeys = Object.keys(newValue || {});
      const allKeys = new Set([...oldKeys, ...newKeys]);

      for (const key of allKeys) {
        const subDesc = desc.children?.[key];
        if (!subDesc) continue;
        const newPath = path ? `${path}.${key}` : key;
        compare(subDesc, newPath, oldValue?.[key], newValue?.[key]);
      }
    } else if (desc.type === 'Array') {
      const oldArray = oldValue || [];
      const newArray = newValue || [];
      const length = Math.max(oldArray.length, newArray.length);
      const subDesc = desc.children!['[]'];

      for (let i = 0; i < length; i++) {
        const newPath = `${path}[${i}]`;
        compare(subDesc, newPath, oldArray[i], newArray[i]);
      }
    }
  }

  const oldData = view.decode(oldSab);
  compare(descriptor, '', oldData, newData);
  const onDiff = view.getOnDiff();
  if (onDiff) {
    onDiff(patches);
  }
  return patches;
}

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
export function applyPatch<T extends object>(view: View<T>, sab: SharedArrayBuffer, patch: Patch): void {
  if (!view.options.mutable) {
    throw new Error('Cannot apply patch to immutable view');
  }
  if (sab.byteLength < view.schema.byteSize) {
    throw new Error(`Buffer too small: ${sab.byteLength} < ${view.schema.byteSize}`);
  }
  const beforePatch = view.getBeforePatch();
  if (beforePatch) {
    beforePatch(patch);
  }
  switch (patch.op) {
    case 'replace':
    case 'add':
      view.set(patch.path, patch.value, sab);
      break;
    case 'remove':
      view.set(patch.path, undefined, sab);
      break;
    default:
      throw new Error(`Unsupported patch operation: ${patch.op}`);
  }
}