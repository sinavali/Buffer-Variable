/**
 * Compiles schema into optimized encoding/decoding functions.
 * Generates functions for encoding, decoding, setting values, and
 * computing diffs/patches based on a schema.
 *
 * @module schema-compiler
 */
import { Schema, CompiledFunctions } from './types';
/**
 * Compiles encoding/decoding functions for a schema.
 * Creates optimized functions for a specific data structure.
 *
 * @template T - The type of the data.
 * @param {Schema} schema - The schema to compile.
 * @returns {CompiledFunctions<T>} The compiled functions.
 * @example
 * ```typescript
 * const schema = inferSchema({ num: 42 });
 * const functions = compileFunctions(schema);
 * ```
 */
export declare function compileFunctions<T extends object>(schema: Schema): CompiledFunctions<T>;
