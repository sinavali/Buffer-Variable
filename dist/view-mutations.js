/**
 * Extends the View class with mutation methods.
 * Provides functionality to update values in a SharedArrayBuffer,
 * supporting single updates, bulk updates, and partial patches.
 *
 * @module view-mutations
 */
import { View } from './view-core';
/**
 * Sets a value at a specific path in a SharedArrayBuffer.
 * Updates the value and increments the buffer version.
 *
 * @param {string} path - The path to the value (e.g., 'foo.bar[0]').
 * @param {any} value - The new value.
 * @param {SharedArrayBuffer} sab - The target SharedArrayBuffer.
 * @throws {Error} If the view is immutable, buffer is too small, or path is invalid.
 * @example
 * ```typescript
 * view.set('num', 100, sab);
 * ```
 */
View.prototype.set = function (path, value, sab) {
    if (!this.options.mutable) {
        throw new Error('Cannot mutate immutable view');
    }
    if (sab.byteLength < this.schema.byteSize) {
        throw new Error(`Buffer too small: ${sab.byteLength} < ${this.schema.byteSize}`);
    }
    const dv = new DataView(sab);
    this.compiled.set(path, value, dv);
    Atomics.add(new Int32Array(sab, 0, 1), 0, 1);
};
/**
 * Sets multiple values in a SharedArrayBuffer.
 * Applies multiple updates in a single operation and increments the version.
 *
 * @param {Record<string, any>} pathsAndValues - Object mapping paths to values.
 * @param {SharedArrayBuffer} sab - The target SharedArrayBuffer.
 * @throws {Error} If the view is immutable, buffer is too small, or any path is invalid.
 * @example
 * ```typescript
 * view.bulkSet({ 'num': 100, 'str': 'hello' }, sab);
 * ```
 */
View.prototype.bulkSet = function (pathsAndValues, sab) {
    if (!this.options.mutable) {
        throw new Error('Cannot mutate immutable view');
    }
    if (sab.byteLength < this.schema.byteSize) {
        throw new Error(`Buffer too small: ${sab.byteLength} < ${this.schema.byteSize}`);
    }
    const dv = new DataView(sab);
    for (const [path, value] of Object.entries(pathsAndValues)) {
        this.compiled.set(path, value, dv);
    }
    Atomics.add(new Int32Array(sab, 0, 1), 0, 1);
};
/**
 * Patches an object at a path with partial updates.
 * Merges the partial update with the existing value and updates the buffer.
 *
 * @param {string} path - The path to the object (e.g., 'foo.bar').
 * @param {any} partial - The partial update to apply.
 * @param {SharedArrayBuffer} sab - The target SharedArrayBuffer.
 * @throws {Error} If the view is immutable, buffer is too small, or path is invalid.
 * @example
 * ```typescript
 * view.patch('obj', { key: 'new' }, sab);
 * ```
 */
View.prototype.patch = function (path, partial, sab) {
    if (!this.options.mutable) {
        throw new Error('Cannot mutate immutable view');
    }
    if (sab.byteLength < this.schema.byteSize) {
        throw new Error(`Buffer too small: ${sab.byteLength} < ${this.schema.byteSize}`);
    }
    const current = this.decodePartial(path, sab);
    const updated = { ...current, ...partial };
    this.set(path, updated, sab);
};
