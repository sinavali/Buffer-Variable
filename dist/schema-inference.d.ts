/**
 * Infers a schema from JavaScript data.
 * Generates a schema describing the structure, types, and memory layout
 * for encoding/decoding data to/from a SharedArrayBuffer.
 *
 * @module schema-inference
 */
import { Schema } from './types';
/**
 * Infers a schema from the provided data.
 * Creates a descriptor tree, flat index, encoding template, and typed array views.
 *
 * @template T - The type of the input data.
 * @param {T} data - The data to infer the schema from.
 * @returns {Schema} The inferred schema.
 * @throws {Error} If the data type is unsupported or schema inference fails.
 * @example
 * ```typescript
 * const data = { num: 42, arr: [1, 2, 3], typed: new Uint8Array([4, 5]) };
 * const schema = inferSchema(data);
 * console.log(schema.byteSize);
 * ```
 */
export declare function inferSchema<T>(data: T): Schema;
