/**
 * Core View class for managing SharedArrayBuffer encoding/decoding.
 * Provides the foundation for serializing JavaScript objects to/from
 * SharedArrayBuffer, with support for schema inference, mutability,
 * and low-level APIs. Used in Node.js and browser environments.
 *
 * @module view-core
 */

import { Descriptor, Schema, ViewOptions, CompiledFunctions, LowLevelApi, Patch, TypedArrayType, TypedArrayConstructor } from './types';
import { inferSchema } from './schema-inference';
import { compileFunctions } from './schema-compiler';
import { defaultCompressString } from './utils';

/**
 * Core View class for managing SharedArrayBuffer encoding/decoding.
 * Handles schema inference, compilation, and low-level operations.
 *
 * @template T - The type of the data being encoded/decoded.
 * @class View
 * @example
 * ```typescript
 * const data = { num: 42, str: 'hello' };
 * const view = View.createView(data, { mutable: true });
 * const sab = new SharedArrayBuffer(view.byteSize);
 * view.encode(data, sab);
 * console.log(view.decode(sab)); // { num: 42, str: 'hello' }
 * ```
 */
export class View<T extends object> {
  /**
   * The schema describing the data structure.
   * @public
   */
  public schema: Schema;

  /**
   * Configuration options for the view.
   * @public
   */
  public options: ViewOptions;

  /**
   * Total byte size required for the SharedArrayBuffer.
   * @public
   */
  public byteSize: number;

  /**
   * Compiled functions for encoding/decoding.
   * @protected
   */
  protected compiled: CompiledFunctions<T>;

  /**
   * Low-level API instance, if enabled.
   * @protected
   */
  protected lowLevel?: LowLevelApi;

  /**
   * Callback for diff operations.
   * @protected
   */
  protected onDiff?: (patch: Patch[]) => void;

  /**
   * Callback for before applying a patch.
   * @protected
   */
  protected beforePatch?: (patch: Patch) => void;

  /**
   * Creates a new View instance.
   * Infers the schema from the provided data and compiles encoding/decoding functions.
   *
   * @param {T} data - The initial data to infer the schema from.
   * @param {ViewOptions} [options={}] - Configuration options.
   * @throws {Error} If schema inference fails or options are invalid.
   * @example
   * ```typescript
   * const view = new View({ num: 42 }, { mutable: true });
   * ```
   */
  constructor(data: T, options: ViewOptions = {}) {
    this.options = {
      mutable: options.mutable ?? false,
      compression: options.compression ?? 'default',
      exposedLowLevelApi: options.exposedLowLevelApi ?? false,
    };
    this.schema = inferSchema(data);
    this.compiled = compileFunctions(this.schema);
    this.byteSize = this.schema.byteSize;
    if (this.options.exposedLowLevelApi) {
      this.lowLevel = this.initLowLevelApi();
    }
  }

  /**
   * Initializes the low-level API.
   * Provides methods for raw buffer operations and debugging.
   *
   * @protected
   * @returns {LowLevelApi} The low-level API instance.
   * @example
   * ```typescript
   * const view = new View({ num: 42 }, { exposedLowLevelApi: true });
   * const lowLevel = view.getLowLevel();
   * console.log(lowLevel.getSchema());
   * ```
   */
  protected initLowLevelApi(): LowLevelApi {
    let logFn = (message: string) => console.log(message);
    return {
      readRaw: (offset: number, type: string, sab: SharedArrayBuffer) => {
        if (offset < 0 || offset >= sab.byteLength) throw new Error(`Invalid offset: ${offset}`);
        const dv = new DataView(sab);
        switch (type) {
          case 'Uint8': return dv.getUint8(offset);
          case 'Uint32': return dv.getUint32(offset, true);
          case 'Float64': return dv.getFloat64(offset, true);
          case 'BigInt64': return dv.getBigInt64(offset, true);
          case 'String': {
            const length = dv.getUint32(offset, true);
            if (offset + 4 + length > sab.byteLength) throw new Error('String length exceeds buffer');
            const bytes = new Uint8Array(sab, offset + 4, length);
            return new TextDecoder().decode(bytes);
          }
          default: throw new Error(`Unsupported type: ${type}`);
        }
      },
      writeRaw: (offset: number, type: string, value: any, sab: SharedArrayBuffer) => {
        if (offset < 0 || offset >= sab.byteLength) throw new Error(`Invalid offset: ${offset}`);
        const dv = new DataView(sab);
        switch (type) {
          case 'Uint8': dv.setUint8(offset, value); break;
          case 'Uint32': dv.setUint32(offset, value, true); break;
          case 'Float64': dv.setFloat64(offset, value, true); break;
          case 'BigInt64': dv.setBigInt64(offset, BigInt(value), true); break;
          case 'String': {
            const bytes = defaultCompressString(value);
            if (offset + 4 + bytes.length > sab.byteLength) throw new Error('String length exceeds buffer');
            dv.setUint32(offset, bytes.length, true);
            new Uint8Array(sab, offset + 4, bytes.length).set(bytes);
            break;
          }
          default: throw new Error(`Unsupported type: ${type}`);
        }
      },
      getSchema: () => this.schema,
      getVersion: (sab: SharedArrayBuffer) => {
        if (sab.byteLength < 4) throw new Error('Buffer too small for version');
        return Atomics.load(new Int32Array(sab, 0, 1), 0);
      },
      getSchemaId: (sab: SharedArrayBuffer) => {
        if (sab.byteLength < 8) throw new Error('Buffer too small for schema ID');
        return new DataView(sab).getUint32(4, true);
      },
      resolvePath: (path: string) => {
        const entry = this.schema.flatIndex.get(path);
        if (!entry) throw new Error(`Invalid path: ${path}`);
        return entry;
      },
      executeTemplate: (index: number, value: any, sab: SharedArrayBuffer) => {
        if (sab.byteLength < this.schema.byteSize) throw new Error('Buffer too small');
        const template = this.schema.encodingTemplate[index];
        if (!template) throw new Error(`Invalid template index: ${index}`);
        template.setter(new DataView(sab), value);
      },
      dumpBytes: (sab: SharedArrayBuffer, start = 0, end = sab.byteLength) => {
        if (start < 0 || end > sab.byteLength || start > end) throw new Error('Invalid byte range');
        const bytes = new Uint8Array(sab, start, end - start);
        return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
      },
      diffSchema: (otherSchema: Schema) => {
        // Placeholder: Compare schemas
        return [];
      },
      log: (message: string) => logFn(message),
      setLog: (fn: (message: string) => void) => { logFn = fn; },
    };
  }

  /**
   * Gets the descriptor for a given path.
   * Traverses the schema to locate the descriptor for a specific path.
   *
   * @protected
   * @param {string} path - The path to resolve (e.g., 'foo.bar[0]').
   * @returns {Descriptor} The descriptor at the path.
   * @throws {Error} If the path is invalid or not found.
   * @example
   * ```typescript
   * const descriptor = view.getDescriptor('num');
   * console.log(descriptor.type); // 'Primitive'
   * ```
   */
  protected getDescriptor(path: string): Descriptor {
    const parts = path.split(/[\.\[\]]/).filter(p => p);
    let current = this.schema.descriptorTree;
    for (const part of parts) {
      if (current.type === 'Object' && current.children) {
        current = current.children[part];
        if (!current) throw new Error(`Invalid path segment: ${part}`);
      } else if (current.type === 'Array' && !isNaN(Number(part))) {
        current = current.children!['[]'];
        if (!current) throw new Error(`Invalid array index: ${part}`);
      } else {
        throw new Error(`Invalid path segment: ${part}`);
      }
    }
    return current;
  }

  /**
   * Reads a value from a DataView based on a descriptor.
   * Handles primitives, objects, arrays, and typed arrays.
   *
   * @protected
   * @param {DataView} dv - The DataView to read from.
   * @param {Descriptor} descriptor - The descriptor for the value.
   * @param {number} offset - The byte offset to start reading.
   * @returns {any} The decoded value.
   * @throws {Error} If the descriptor type or data type is unsupported.
   * @example
   * ```typescript
   * const dv = new DataView(sab);
   * const value = view.readValue(dv, descriptor, 8);
   * ```
   */
  protected readValue(dv: DataView, descriptor: Descriptor, offset: number): any {
    if (offset < 0 || offset >= dv.byteLength) throw new Error(`Invalid offset: ${offset}`);
    switch (descriptor.type) {
      case 'Primitive':
        if (!descriptor.dataType) throw new Error('Missing dataType for Primitive');
        switch (descriptor.dataType) {
          case 'Number': return dv.getFloat64(offset, true);
          case 'String': {
            const length = dv.getUint32(offset, true);
            if (offset + 4 + length > dv.byteLength) throw new Error('String length exceeds buffer');
            const bytes = new Uint8Array(dv.buffer, offset + 4, length);
            return new TextDecoder().decode(bytes);
          }
          case 'Boolean': return dv.getUint8(offset) !== 0;
          case 'BigInt': return dv.getBigInt64(offset, true);
          case 'Date': return new Date(Number(dv.getBigInt64(offset, true)));
          case 'Null': return null;
          case 'Undefined': return undefined;
          default: throw new Error(`Unsupported primitive: ${descriptor.dataType}`);
        }
      case 'Object': {
        const result: Record<string, any> = {};
        for (const [key, child] of Object.entries(descriptor.children || {})) {
          result[key] = this.readValue(dv, child, offset + child.byteOffset);
        }
        return result;
      }
      case 'Array': {
        const length = dv.getUint32(offset, true);
        if (offset + 4 + length * descriptor.children!['[]'].byteSize > dv.byteLength) {
          throw new Error('Array length exceeds buffer');
        }
        const result = new Array(length);
        const child = descriptor.children!['[]'];
        for (let i = 0; i < length; i++) {
          result[i] = this.readValue(dv, child, offset + 4 + i * child.byteSize);
        }
        return result;
      }
      case 'TypedArray': {
        if (!isTypedArrayType(descriptor.dataType)) throw new Error(`Invalid typed array type: ${descriptor.dataType}`);
        const length = dv.getUint32(offset, true);
        if (offset + 4 + length * getTypedArrayByteSize(descriptor.dataType) > dv.byteLength) {
          throw new Error('Typed array length exceeds buffer');
        }
        const TypedArrayClass = {
          Int8Array, Uint8Array, Int16Array, Uint16Array, Int32Array, Uint32Array,
          Float32Array, Float64Array, BigInt64Array, BigUint64Array
        }[descriptor.dataType] as TypedArrayConstructor;
        return new TypedArrayClass(dv.buffer, offset + 4, length);
      }
      default:
        throw new Error(`Unsupported descriptor type: ${descriptor.type}`);
    }
  }

  /**
   * Sets the compiled functions.
   * Used internally for schema updates or imports.
   *
   * @public
   * @param {CompiledFunctions<T>} compiled - The new compiled functions.
   */
  public setCompiled(compiled: CompiledFunctions<T>): void {
    this.compiled = compiled;
  }

  /**
   * Gets the low-level API instance.
   * Returns undefined if `exposedLowLevelApi` is false.
   *
   * @public
   * @returns {LowLevelApi | undefined} The low-level API instance.
   */
  public getLowLevel(): LowLevelApi | undefined {
    return this.lowLevel;
  }

  /**
   * Gets the onDiff callback.
   *
   * @public
   * @returns {((patch: Patch[]) => void) | undefined} The callback.
   */
  public getOnDiff(): ((patch: Patch[]) => void) | undefined {
    return this.onDiff;
  }

  /**
   * Gets the beforePatch callback.
   *
   * @public
   * @returns {((patch: Patch) => void) | undefined} The callback.
   */
  public getBeforePatch(): ((patch: Patch) => void) | undefined {
    return this.beforePatch;
  }

  /**
   * Registers a callback for diff operations.
   * Called when patches are generated.
   *
   * @public
   * @param {(patch: Patch[]) => void} callback - The callback function.
   * @example
   * ```typescript
   * view.setOnDiff(patches => console.log(patches));
   * ```
   */
  public setOnDiff(callback: (patch: Patch[]) => void): void {
    this.onDiff = callback;
  }

  /**
   * Registers a callback before applying a patch.
   * Called for each patch before application.
   *
   * @public
   * @param {(patch: Patch) => void} callback - The callback function.
   * @example
   * ```typescript
   * view.setBeforePatch(patch => console.log(patch));
   * ```
   */
  public setBeforePatch(callback: (patch: Patch) => void): void {
    this.beforePatch = callback;
  }

  /**
   * Creates a new View instance.
   * Static factory method for convenience.
   *
   * @public
   * @static
   * @param {T} data - The initial data.
   * @param {ViewOptions} [options] - Configuration options.
   * @returns {View<T>} A new View instance.
   * @example
   * ```typescript
   * const view = View.createView({ num: 42 });
   * ```
   */
  public static createView<T extends object>(data: T, options?: ViewOptions): View<T> {
    return new View<T>(data, options);
  }
}

/**
 * Type guard for TypedArrayType.
 *
 * @param {string | undefined} type - The type to check.
 * @returns {type is TypedArrayType} True if the type is a valid TypedArrayType.
 */
function isTypedArrayType(type: string | undefined): type is TypedArrayType {
  return [
    'Int8Array', 'Uint8Array', 'Int16Array', 'Uint16Array', 'Int32Array',
    'Uint32Array', 'Float32Array', 'Float64Array', 'BigInt64Array', 'BigUint64Array'
  ].includes(type!);
}

/**
 * Gets the byte size of a typed array element.
 *
 * @param {TypedArrayType} type - The typed array type.
 * @returns {number} The byte size per element.
 */
function getTypedArrayByteSize(type: TypedArrayType): number {
  return {
    Int8Array: 1, Uint8Array: 1, Int16Array: 2, Uint16Array: 2,
    Int32Array: 4, Uint32Array: 4, Float32Array: 4, Float64Array: 8,
    BigInt64Array: 8, BigUint64Array: 8
  }[type];
}