/**
 * Compiles schema into optimized encoding/decoding functions.
 * Generates functions for encoding, decoding, setting values, and
 * computing diffs/patches based on a schema.
 *
 * @module schema-compiler
 */

import { Schema, Descriptor, CompiledFunctions, PrimitiveType, TypedArrayType, Patch, TypedArrayConstructor } from './types';
import { defaultCompressString } from './utils';

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
export function compileFunctions<T extends object>(schema: Schema): CompiledFunctions<T> {
  const { descriptorTree, encodingTemplate } = schema;

  /**
   * Encodes data to a DataView.
   *
   * @param {T} data - The data to encode.
   * @param {DataView} dv - The target DataView.
   * @param {Set<string>} [dirtyFields] - Fields to update (all if undefined).
   * @throws {Error} If a required value is missing.
   */
  const encode = (data: T, dv: DataView, dirtyFields?: Set<string>): void => {
    for (const entry of encodingTemplate) {
      if (dirtyFields && !dirtyFields.has(entry.type)) continue;
      const value = getValueByPath(data, entry.type);
      if (value === undefined) throw new Error(`Missing value at path: ${entry.type}`);
      entry.setter(dv, value);
    }
  };

  /**
   * Decodes data from a DataView.
   *
   * @param {DataView} dv - The source DataView.
   * @returns {T} The decoded data.
   */
  const decode = (dv: DataView): T => {
    const result: any = {};
    traverseDescriptor(descriptorTree, dv, 0, result, '');
    return result;
  };

  /**
   * Sets a value at a specific path in a DataView.
   *
   * @param {string} path - The path to the value.
   * @param {any} value - The new value.
   * @param {DataView} dv - The target DataView.
   * @throws {Error} If the path or template is invalid.
   */
  const set = (path: string, value: any, dv: DataView): void => {
    const entry = schema.flatIndex.get(path);
    if (!entry) throw new Error(`Invalid path: ${path}`);
    const template = encodingTemplate.find(t => t.type === entry.type);
    if (!template) throw new Error(`No template for path: ${path}`);
    template.setter(dv, value);
  };

  /**
   * Computes differences between old and new data.
   *
   * @param {SharedArrayBuffer} oldSab - The old buffer.
   * @param {T} newData - The new data.
   * @returns {Patch[]} The computed patches.
   */
  const diff = (oldSab: SharedArrayBuffer, newData: T): Patch[] => {
    const oldData = decode(new DataView(oldSab));
    const patches: Patch[] = [];
    compareValues('', oldData, newData, descriptorTree, patches);
    return patches;
  };

  /**
   * Applies a patch to a SharedArrayBuffer.
   *
   * @param {SharedArrayBuffer} sab - The target buffer.
   * @param {Patch} patch - The patch to apply.
   */
  const applyPatch = (sab: SharedArrayBuffer, patch: Patch): void => {
    const dv = new DataView(sab);
    set(patch.path, patch.value, dv);
  };

  return { encode, decode, set, diff, applyPatch };
}

/**
 * Traverses a descriptor tree to decode data.
 * Populates the result object with decoded values.
 *
 * @param {Descriptor} descriptor - The descriptor to traverse.
 * @param {DataView} dv - The source DataView.
 * @param {number} offset - The current offset.
 * @param {any} result - The result object to populate.
 * @param {string} path - The current path.
 * @throws {Error} If the descriptor type or data type is unsupported.
 */
function traverseDescriptor(
  descriptor: Descriptor,
  dv: DataView,
  offset: number,
  result: any,
  path: string
): void {
  if (offset < 0 || offset >= dv.byteLength) throw new Error(`Invalid offset: ${offset}`);
  switch (descriptor.type) {
    case 'Primitive':
      if (!descriptor.dataType) throw new Error('Missing dataType for Primitive');
      result[path.split('.').pop()!] = readPrimitive(dv, offset, descriptor.dataType);
      break;
    case 'Object':
      for (const [key, child] of Object.entries(descriptor.children || {})) {
        const newPath = path ? `${path}.${key}` : key;
        result[key] = {};
        traverseDescriptor(child, dv, offset + child.byteOffset, result[key], newPath);
      }
      break;
    case 'Array': {
      const length = dv.getUint32(offset, true);
      if (offset + 4 + length * descriptor.children!['[]'].byteSize > dv.byteLength) {
        throw new Error('Array length exceeds buffer');
      }
      result[path.split('.').pop()!] = new Array(length);
      const child = descriptor.children!['[]'];
      for (let i = 0; i < length; i++) {
        traverseDescriptor(child, dv, offset + 4 + i * child.byteSize, result[path.split('.').pop()!], `${path}[${i}]`);
      }
      break;
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
      result[path.split('.').pop()!] = new TypedArrayClass(dv.buffer, offset + 4, length);
      break;
    }
    default:
      throw new Error(`Unsupported descriptor type: ${descriptor.type}`);
  }
}

/**
 * Reads a primitive value from a DataView.
 *
 * @param {DataView} dv - The source DataView.
 * @param {number} offset - The offset to read from.
 * @param {PrimitiveType | TypedArrayType} dataType - The data type.
 * @returns {any} The decoded value.
 * @throws {Error} If the data type is unsupported or buffer is too small.
 */
function readPrimitive(dv: DataView, offset: number, dataType: PrimitiveType | TypedArrayType): any {
  if (offset < 0 || offset >= dv.byteLength) throw new Error(`Invalid offset: ${offset}`);
  switch (dataType) {
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
    default: throw new Error(`Unsupported primitive: ${dataType}`);
  }
}

/**
 * Compares old and new values to generate patches.
 *
 * @param {string} path - The current path.
 * @param {any} oldValue - The old value.
 * @param {any} newValue - The new value.
 * @param {Descriptor} descriptor - The descriptor for the value.
 * @param {Patch[]} patches - The patches to populate.
 */
function compareValues(path: string, oldValue: any, newValue: any, descriptor: Descriptor, patches: Patch[]): void {
  if (oldValue === newValue) return;

  if (descriptor.type === 'Primitive' || descriptor.type === 'TypedArray') {
    patches.push({ op: 'replace', path, value: newValue });
  } else if (descriptor.type === 'Object') {
    const oldKeys = Object.keys(oldValue || {});
    const newKeys = Object.keys(newValue || {});
    const allKeys = new Set([...oldKeys, ...newKeys]);

    for (const key of allKeys) {
      const subDesc = descriptor.children?.[key];
      if (!subDesc) continue;
      const newPath = path ? `${path}.${key}` : key;
      compareValues(newPath, oldValue?.[key], newValue?.[key], subDesc, patches);
    }
  } else if (descriptor.type === 'Array') {
    const oldArray = oldValue || [];
    const newArray = newValue || [];
    const length = Math.max(oldArray.length, newArray.length);
    const subDesc = descriptor.children!['[]'];

    for (let i = 0; i < length; i++) {
      const newPath = `${path}[${i}]`;
      compareValues(newPath, oldArray[i], newArray[i], subDesc, patches);
    }
  }
}

/**
 * Gets a value by path from data.
 *
 * @param {any} data - The data to traverse.
 * @param {string} path - The path to the value.
 * @returns {any} The value at the path, or undefined if not found.
 */
function getValueByPath(data: any, path: string): any {
  const parts = path.split(/[\.\[\]]/).filter(p => p);
  let current = data;
  for (const part of parts) {
    current = current?.[part];
    if (current === undefined) return undefined;
  }
  return current;
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