/**
 * Type definitions for the buffer-variables package.
 * Defines interfaces and types for schema descriptors, view options, patches,
 * and low-level APIs used in encoding/decoding JavaScript objects to/from
 * SharedArrayBuffer. Ensures type safety across Node.js and browser environments.
 *
 * @module types
 */

/**
 * Supported primitive types for schema inference.
 * Represents JavaScript primitive types that can be serialized.
 */
export type PrimitiveType = 'String' | 'Number' | 'Boolean' | 'Null' | 'BigInt' | 'Date' | 'Undefined';

/**
 * Supported typed array types for schema inference.
 * Represents JavaScript typed arrays that can be serialized.
 */
export type TypedArrayType =
  | 'Int8Array'
  | 'Uint8Array'
  | 'Int16Array'
  | 'Uint16Array'
  | 'Int32Array'
  | 'Uint32Array'
  | 'Float32Array'
  | 'Float64Array'
  | 'BigInt64Array'
  | 'BigUint64Array';

/**
 * Schema descriptor for a data structure.
 * Describes the type, memory layout, and hierarchy of a JavaScript value.
 *
 * @interface Descriptor
 */
export interface Descriptor {
  /** Type of the descriptor, indicating the data structure. */
  type: 'Primitive' | 'Object' | 'Array' | 'TypedArray';
  /** Byte offset in the SharedArrayBuffer where this value starts. */
  byteOffset: number;
  /** Total byte size of this value, including children. */
  byteSize: number;
  /** Specific data type for primitives or typed arrays (e.g., 'Number', 'Int8Array'). */
  dataType?: PrimitiveType | TypedArrayType;
  /** Child descriptors for objects or arrays, keyed by property or '[]' for arrays. */
  children?: Record<string, Descriptor>;
  /** Length of arrays or typed arrays, if applicable. */
  length?: number;
}

/**
 * Schema structure for a View instance.
 * Encapsulates all metadata required for encoding/decoding data.
 *
 * @interface Schema
 */
export interface Schema {
  /** Root descriptor tree describing the entire data structure. */
  descriptorTree: Descriptor;
  /** Total byte size required for the SharedArrayBuffer. */
  byteSize: number;
  /** Map of paths to offsets and types for O(1) access. */
  flatIndex: Map<string, { offset: number; type: string }>;
  /** Array of template entries for low-level encoding/decoding operations. */
  encodingTemplate: TemplateEntry[];
  /** Map of paths to typed array configurations. */
  typedArrayViews: Map<string, { type: TypedArrayType; offset: number; length: number }>;
}

/**
 * Options for creating a View instance.
 * Configures behavior such as mutability, compression, and API exposure.
 *
 * @interface ViewOptions
 */
export interface ViewOptions {
  /** Whether the view allows mutations (default: false). */
  mutable?: boolean;
  /** Compression strategy for strings (default: 'default'). */
  compression?: 'default' | 'none' | ((str: string) => Uint8Array);
  /** Whether to expose low-level APIs for advanced operations (default: false). */
  exposedLowLevelApi?: boolean;
}

/**
 * Options for creating a ViewSync instance.
 * Configures synchronization behavior for real-time updates.
 *
 * @interface ViewSyncOptions
 */
export interface ViewSyncOptions {
  /** Polling interval in milliseconds for detecting SAB changes (default: 10). */
  pollInterval?: number;
  /** Specific paths to synchronize (default: all paths). */
  boundPaths?: string[];
}

/**
 * Patch operation for diff/patch functionality.
 * Represents a single change to apply to a SharedArrayBuffer.
 *
 * @interface Patch
 */
export interface Patch {
  /** Operation type: add, remove, or replace a value. */
  op: 'add' | 'remove' | 'replace';
  /** Path to the value (e.g., 'foo.bar[0]'). */
  path: string;
  /** New value for add or replace operations (optional for remove). */
  value?: any;
}

/**
 * Template entry for low-level encoding/decoding.
 * Defines how to read/write a value at a specific offset.
 *
 * @interface TemplateEntry
 */
export interface TemplateEntry {
  /** Byte offset where the value is stored. */
  offset: number;
  /** Type or path identifier for the value. */
  type: string;
  /** Byte size of the value. */
  size: number;
  /** Function to write the value to a DataView. */
  setter: (dv: DataView, value: any) => void;
  /** Function to read the value from a DataView. */
  getter: (dv: DataView) => any;
}

/**
 * Flat index entry for path resolution.
 * Maps a path to its offset and type in the SharedArrayBuffer.
 *
 * @interface FlatIndexEntry
 */
export interface FlatIndexEntry {
  /** Byte offset of the value. */
  offset: number;
  /** Type of the value (e.g., 'Primitive', 'TypedArray'). */
  type: string;
}

/**
 * Typed array constructor types.
 * Represents constructors for JavaScript typed arrays.
 */
export type TypedArrayConstructor =
  | Int8ArrayConstructor
  | Uint8ArrayConstructor
  | Int16ArrayConstructor
  | Uint16ArrayConstructor
  | Int32ArrayConstructor
  | Uint32ArrayConstructor
  | Float32ArrayConstructor
  | Float64ArrayConstructor
  | BigInt64ArrayConstructor
  | BigUint64ArrayConstructor;

/**
 * Generic typed array types.
 * Represents instances of JavaScript typed arrays.
 */
export type TypedArray =
  | Int8Array
  | Uint8Array
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Float32Array
  | Float64Array
  | BigInt64Array
  | BigUint64Array;

/**
 * Compiled schema functions for encoding/decoding.
 * Provides optimized methods for a specific schema.
 *
 * @interface CompiledFunctions
 * @template T - The type of the data being encoded/decoded.
 */
export interface CompiledFunctions<T> {
  /** Encodes data to a DataView, optionally updating only dirty fields. */
  encode: (data: T, dv: DataView, dirtyFields?: Set<string>) => void;
  /** Decodes data from a DataView to a JavaScript object. */
  decode: (dv: DataView) => T;
  /** Sets a value at a specific path in a DataView. */
  set: (path: string, value: any, dv: DataView) => void;
  /** Computes differences between old and new data as patches. */
  diff: (oldSab: SharedArrayBuffer, newData: T) => Patch[];
  /** Applies a patch to a SharedArrayBuffer. */
  applyPatch: (sab: SharedArrayBuffer, patch: Patch) => void;
}

/**
 * Low-level API for advanced SharedArrayBuffer operations.
 * Exposed when `exposedLowLevelApi` is true.
 *
 * @interface LowLevelApi
 */
export interface LowLevelApi {
  /** Reads a raw value from a SharedArrayBuffer at the specified offset. */
  readRaw: (offset: number, type: string, sab: SharedArrayBuffer) => any;
  /** Writes a raw value to a SharedArrayBuffer at the specified offset. */
  writeRaw: (offset: number, type: string, value: any, sab: SharedArrayBuffer) => void;
  /** Returns the schema associated with the View. */
  getSchema: () => Schema;
  /** Gets the version number from a SharedArrayBuffer. */
  getVersion: (sab: SharedArrayBuffer) => number;
  /** Gets the schema ID from a SharedArrayBuffer. */
  getSchemaId: (sab: SharedArrayBuffer) => number;
  /** Resolves a path to its offset and type. */
  resolvePath: (path: string) => { offset: number; type: string };
  /** Executes a template entry to write a value. */
  executeTemplate: (index: number, value: any, sab: SharedArrayBuffer) => void;
  /** Dumps a range of bytes from a SharedArrayBuffer as a hex string. */
  dumpBytes: (sab: SharedArrayBuffer, start?: number, end?: number) => string;
  /** Computes differences between two schemas. */
  diffSchema: (otherSchema: Schema) => string[];
  /** Logs a message using the configured logger. */
  log: (message: string) => void;
  /** Sets a custom logging function. */
  setLog: (fn: (message: string) => void) => void;
}