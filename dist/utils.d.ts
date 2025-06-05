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
export declare function defaultCompressString(str: string): Uint8Array;
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
export declare function isPlainObject(value: any): boolean;
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
export declare function isTypedArray(value: any): boolean;
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
export declare function hasUndefined(value: any): boolean;
