/**
 * Extends the View class with encoding and decoding methods.
 * Provides functionality to serialize and deserialize JavaScript objects
 * to/from SharedArrayBuffer using the inferred schema.
 *
 * @module view-encode-decode
 */

import { View } from './view-core';
import { hasUndefined } from './utils';

/**
 * Module augmentation to extend View with encoding/decoding methods.
 */
declare module './view-core' {
  interface View<T> {
    /**
     * Encodes data to a SharedArrayBuffer.
     * @param {T} data - The data to encode.
     * @param {SharedArrayBuffer} sab - The target buffer.
     */
    encode(data: T, sab: SharedArrayBuffer): void;
    /**
     * Decodes data from a SharedArrayBuffer.
     * @param {SharedArrayBuffer} sab - The source buffer.
     * @returns {T} The decoded data.
     */
    decode(sab: SharedArrayBuffer): T;
    /**
     * Decodes a partial value from a SharedArrayBuffer.
     * @param {string} path - The path to the value.
     * @param {SharedArrayBuffer} sab - The source buffer.
     * @returns {any} The decoded value.
     */
    decodePartial(path: string, sab: SharedArrayBuffer): any;
  }
}

/**
 * Encodes data to a SharedArrayBuffer.
 * Writes the data to the buffer using the compiled encode function and increments the version.
 *
 * @param {T} data - The data to encode.
 * @param {SharedArrayBuffer} sab - The target SharedArrayBuffer.
 * @throws {Error} If the buffer is too small, immutable view size mismatches, or data contains undefined.
 * @example
 * ```typescript
 * const view = View.createView({ num: 42 });
 * const sab = new SharedArrayBuffer(view.byteSize);
 * view.encode({ num: 42 }, sab);
 * ```
 */
View.prototype.encode = function <T extends object>(this: View<T>, data: T, sab: SharedArrayBuffer): void {
  if (sab.byteLength < this.schema.byteSize) {
    throw new Error(`Buffer too small: ${sab.byteLength} < ${this.schema.byteSize}`);
  }
  if (!this.options.mutable && this.schema.byteSize !== sab.byteLength) {
    throw new Error('Immutable view requires matching buffer size');
  }
  if (hasUndefined(data)) {
    throw new Error('Undefined values not allowed in encoded data');
  }
  const dv = new DataView(sab);
  this.compiled.encode(data, dv, new Set());
  Atomics.add(new Int32Array(sab, 0, 1), 0, 1);
};

/**
 * Decodes data from a SharedArrayBuffer.
 * Reads the entire data structure using the compiled decode function.
 *
 * @param {SharedArrayBuffer} sab - The source SharedArrayBuffer.
 * @returns {T} The decoded data.
 * @throws {Error} If the buffer is too small.
 * @example
 * ```typescript
 * const data = view.decode(sab); // { num: 42 }
 * ```
 */
View.prototype.decode = function <T extends object>(this: View<T>, sab: SharedArrayBuffer): T {
  if (sab.byteLength < this.schema.byteSize) {
    throw new Error(`Buffer too small: ${sab.byteLength} < ${this.schema.byteSize}`);
  }
  const dv = new DataView(sab);
  return this.compiled.decode(dv);
};

/**
 * Decodes a partial value from a SharedArrayBuffer.
 * Reads a specific value at the given path.
 *
 * @param {string} path - The path to the value (e.g., 'foo.bar[0]').
 * @param {SharedArrayBuffer} sab - The source SharedArrayBuffer.
 * @returns {any} The decoded value.
 * @throws {Error} If the buffer is too small or the path is invalid.
 * @example
 * ```typescript
 * const value = view.decodePartial('num', sab); // 42
 * ```
 */
View.prototype.decodePartial = function <T extends object>(this: View<T>, path: string, sab: SharedArrayBuffer): any {
  if (sab.byteLength < this.schema.byteSize) {
    throw new Error(`Buffer too small: ${sab.byteLength} < ${this.schema.byteSize}`);
  }
  const entry = this.schema.flatIndex.get(path);
  if (!entry) {
    throw new Error(`Invalid path: ${path}`);
  }
  const dv = new DataView(sab);
  const descriptor = this.getDescriptor(path);
  return this.readValue(dv, descriptor, entry.offset);
};