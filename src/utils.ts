/**
 * Utility functions for the buffer-variables package.
 * Provides helper functions for type checking, string compression,
 * and data validation used across the package.
 *
 * @module utils
 */

/**
 * Compresses a string to a Uint8Array.
 * Uses TextEncoder for efficient encoding.
 *
 * @param {string} str - The string to compress.
 * @returns {Uint8Array} The compressed bytes.
 * @example
 * ```typescript
 * const bytes = defaultCompressString('hello');
 * console.log(bytes.length); // 5
 * ```
 */
export function defaultCompressString(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

/**
 * Checks if a value is a plain JavaScript object.
 *
 * @param {any} value - The value to check.
 * @returns {boolean} True if the value is a plain object.
 * @example
 * ```typescript
 * console.log(isPlainObject({})); // true
 * console.log(isPlainObject(new Date())); // false
 * ```
 */
export function isPlainObject(value: any): boolean {
  return value !== null && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype;
}

/**
 * Checks if a value is a typed array.
 *
 * @param {any} value - The value to check.
 * @returns {boolean} True if the value is a typed array.
 * @example
 * ```typescript
 * console.log(isTypedArray(new Uint8Array(10))); // true
 * console.log(isTypedArray([1, 2, 3])); // false
 * ```
 */
export function isTypedArray(value: any): boolean {
  return value instanceof Int8Array ||
    value instanceof Uint8Array ||
    value instanceof Int16Array ||
    value instanceof Uint16Array ||
    value instanceof Int32Array ||
    value instanceof Uint32Array ||
    value instanceof Float32Array ||
    value instanceof Float64Array ||
    value instanceof BigInt64Array ||
    value instanceof BigUint64Array;
}

/**
 * Checks if a value contains undefined properties.
 *
 * @param {any} value - The value to check.
 * @returns {boolean} True if the value or its nested properties are undefined.
 * @example
 * ```typescript
 * console.log(hasUndefined({ a: 1, b: undefined })); // true
 * console.log(hasUndefined({ a: 1, b: 2 })); // false
 * ```
 */
export function hasUndefined(value: any): boolean {
  if (value === undefined) return true;
  if (value === null || typeof value !== 'object') return false;
  if (isTypedArray(value)) return false;
  if (Array.isArray(value)) {
    return value.some(hasUndefined);
  }
  return Object.values(value).some(hasUndefined);
}