/**
 * Infers a schema from JavaScript data.
 * Generates a schema describing the structure, types, and memory layout
 * for encoding/decoding data to/from a SharedArrayBuffer.
 *
 * @module schema-inference
 */

import { Descriptor, Schema, PrimitiveType, TypedArrayType, TemplateEntry } from './types';
import { isTypedArray, isPlainObject } from './utils';

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
export function inferSchema<T>(data: T): Schema {
  let currentOffset = 8; // Reserve 8 bytes for version and schema ID
  const flatIndex = new Map<string, { offset: number; type: string }>();
  const encodingTemplate: TemplateEntry[] = [];
  const typedArrayViews = new Map<string, { type: TypedArrayType; offset: number; length: number }>();

  /**
   * Infers a descriptor for a value.
   *
   * @param {any} value - The value to infer.
   * @param {string} path - The current path (e.g., 'foo.bar[0]').
   * @returns {Descriptor} The inferred descriptor.
   */
  function inferDescriptor(value: any, path: string): Descriptor {
    if (value === null) {
      return {
        type: 'Primitive',
        dataType: 'Null',
        byteOffset: currentOffset,
        byteSize: 0,
      };
    }
    if (value === undefined) {
      return {
        type: 'Primitive',
        dataType: 'Undefined',
        byteOffset: currentOffset,
        byteSize: 0,
      };
    }
    if (typeof value === 'number') {
      flatIndex.set(path, { offset: currentOffset, type: 'Number' });
      encodingTemplate.push({
        offset: currentOffset,
        type: path,
        size: 8,
        setter: (dv: DataView, v: number) => dv.setFloat64(currentOffset, v, true),
        getter: (dv: DataView) => dv.getFloat64(currentOffset, true),
      });
      const offset = currentOffset;
      currentOffset += 8;
      return {
        type: 'Primitive',
        dataType: 'Number',
        byteOffset: offset,
        byteSize: 8,
      };
    }
    if (typeof value === 'string') {
      const bytes = new TextEncoder().encode(value);
      flatIndex.set(path, { offset: currentOffset, type: 'String' });
      encodingTemplate.push({
        offset: currentOffset,
        type: path,
        size: 4 + bytes.length,
        setter: (dv: DataView, v: string) => {
          const b = new TextEncoder().encode(v);
          dv.setUint32(currentOffset, b.length, true);
          new Uint8Array(dv.buffer, currentOffset + 4, b.length).set(b);
        },
        getter: (dv: DataView) => {
          const len = dv.getUint32(currentOffset, true);
          return new TextDecoder().decode(new Uint8Array(dv.buffer, currentOffset + 4, len));
        },
      });
      const offset = currentOffset;
      currentOffset += 4 + bytes.length;
      return {
        type: 'Primitive',
        dataType: 'String',
        byteOffset: offset,
        byteSize: 4 + bytes.length,
      };
    }
    if (typeof value === 'boolean') {
      flatIndex.set(path, { offset: currentOffset, type: 'Boolean' });
      encodingTemplate.push({
        offset: currentOffset,
        type: path,
        size: 1,
        setter: (dv: DataView, v: boolean) => dv.setUint8(currentOffset, v ? 1 : 0),
        getter: (dv: DataView) => dv.getUint8(currentOffset) !== 0,
      });
      const offset = currentOffset;
      currentOffset += 1;
      return {
        type: 'Primitive',
        dataType: 'Boolean',
        byteOffset: offset,
        byteSize: 1,
      };
    }
    if (typeof value === 'bigint') {
      flatIndex.set(path, { offset: currentOffset, type: 'BigInt' });
      encodingTemplate.push({
        offset: currentOffset,
        type: path,
        size: 8,
        setter: (dv: DataView, v: bigint) => dv.setBigInt64(currentOffset, v, true),
        getter: (dv: DataView) => dv.getBigInt64(currentOffset, true),
      });
      const offset = currentOffset;
      currentOffset += 8;
      return {
        type: 'Primitive',
        dataType: 'BigInt',
        byteOffset: offset,
        byteSize: 8,
      };
    }
    if (value instanceof Date) {
      flatIndex.set(path, { offset: currentOffset, type: 'Date' });
      encodingTemplate.push({
        offset: currentOffset,
        type: path,
        size: 8,
        setter: (dv: DataView, v: Date) => dv.setBigInt64(currentOffset, BigInt(v.getTime()), true),
        getter: (dv: DataView) => new Date(Number(dv.getBigInt64(currentOffset, true))),
      });
      const offset = currentOffset;
      currentOffset += 8;
      return {
        type: 'Primitive',
        dataType: 'Date',
        byteOffset: offset,
        byteSize: 8,
      };
    }
    if (isTypedArray(value)) {
      const type = value.constructor.name as TypedArrayType;
      const length = value.length;
      flatIndex.set(path, { offset: currentOffset, type });
      encodingTemplate.push({
        offset: currentOffset,
        type: path,
        size: 4 + length * getTypedArrayByteSize(type),
        setter: (dv: DataView, v: any) => {
          dv.setUint32(currentOffset, v.length, true);
          new (globalThis[type] as any)(dv.buffer, currentOffset + 4, v.length).set(v);
        },
        getter: (dv: DataView) => {
          const len = dv.getUint32(currentOffset, true);
          return new (globalThis[type] as any)(dv.buffer, currentOffset + 4, len);
        },
      });
      typedArrayViews.set(path, { type, offset: currentOffset, length });
      const offset = currentOffset;
      currentOffset += 4 + length * getTypedArrayByteSize(type);
      return {
        type: 'TypedArray',
        dataType: type,
        byteOffset: offset,
        byteSize: 4 + length * getTypedArrayByteSize(type),
        length,
      };
    }
    if (Array.isArray(value)) {
      const offset = currentOffset;
      currentOffset += 4; // Length prefix
      let child: Descriptor;
      if (value.length === 0) {
        // Fallback for empty arrays
        child = {
          type: 'Primitive',
          dataType: 'Null',
          byteOffset: 0,
          byteSize: 0,
        };
      } else {
        child = inferDescriptor(value[0], `${path}[]`);
      }
      const length = value.length;
      for (let i = 1; i < length; i++) {
        const itemDesc = inferDescriptor(value[i], `${path}[${i}]`);
        child.byteSize = Math.max(child.byteSize, itemDesc.byteSize);
      }
      flatIndex.set(path, { offset, type: 'Array' });
      encodingTemplate.push({
        offset,
        type: path,
        size: 4 + length * child.byteSize,
        setter: (dv: DataView, v: any[]) => {
          dv.setUint32(offset, v.length, true);
          // Items are set individually via their paths
        },
        getter: (dv: DataView) => {
          const len = dv.getUint32(offset, true);
          const arr = new Array(len);
          // Items are read via their paths
          return arr;
        },
      });
      return {
        type: 'Array',
        byteOffset: offset,
        byteSize: 4 + length * child.byteSize,
        length,
        children: { '[]': child },
      };
    }
    if (isPlainObject(value)) {
      const offset = currentOffset;
      const children: Record<string, Descriptor> = {};
      let byteSize = 0;
      for (const [key, val] of Object.entries(value)) {
        const childPath = path ? `${path}.${key}` : key;
        const child = inferDescriptor(val, childPath);
        children[key] = child;
        byteSize = Math.max(byteSize, child.byteOffset + child.byteSize - offset);
      }
      flatIndex.set(path, { offset, type: 'Object' });
      encodingTemplate.push({
        offset,
        type: path,
        size: byteSize,
        setter: () => {}, // Handled by child setters
        getter: () => ({}), // Handled by child getters
      });
      return {
        type: 'Object',
        byteOffset: offset,
        byteSize,
        children,
      };
    }
    throw new Error(`Unsupported type at path ${path}: ${value?.constructor?.name}`);
  }

  const descriptorTree = inferDescriptor(data, '');
  return {
    descriptorTree,
    byteSize: Math.max(currentOffset, 8),
    flatIndex,
    encodingTemplate,
    typedArrayViews,
  };
}

/**
 * Gets the byte size of a typed array element.
 *
 * @param {TypedArrayType} type - The typed array type.
 * @returns {number} The byte size per element.
 * @throws {Error} If the type is invalid.
 */
function getTypedArrayByteSize(type: TypedArrayType): number {
  const sizes: Record<TypedArrayType, number> = {
    Int8Array: 1,
    Uint8Array: 1,
    Int16Array: 2,
    Uint16Array: 2,
    Int32Array: 4,
    Uint32Array: 4,
    Float32Array: 4,
    Float64Array: 8,
    BigInt64Array: 8,
    BigUint64Array: 8,
  };
  const size = sizes[type];
  if (!size) throw new Error(`Invalid typed array type: ${type}`);
  return size;
}