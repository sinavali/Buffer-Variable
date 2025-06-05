/**
 * Extends the View class with accessor methods.
 * Provides functionality to access typed arrays, export/import schemas,
 * update schemas, and clean up resources.
 *
 * @module view-accessors
 */

import { View } from './view-core';
import { TypedArray, TypedArrayConstructor, Schema } from './types';
import { compileFunctions } from './schema-compiler';

/**
 * Module augmentation to extend View with accessor methods.
 */
declare module './view-core' {
  interface View<T> {
    /**
     * Gets a typed array from a SharedArrayBuffer at a specific path.
     * @param {string} path - The path to the typed array.
     * @param {SharedArrayBuffer} sab - The source buffer.
     * @returns {TypedArray} The typed array.
     */
    getTypedArray(path: string, sab: SharedArrayBuffer): TypedArray;
    /**
     * Exports the schema as a JSON string.
     * @returns {string} The serialized schema.
     */
    exportSchema(): string;
    /**
     * Updates the schema at a specific path.
     * @param {string} path - The path to update.
     * @param {any} value - The new value.
     * @param {SharedArrayBuffer} sab - The target buffer.
     */
    schemaUpdate(path: string, value: any, sab: SharedArrayBuffer): void;
    /**
     * Cleans up resources associated with the view.
     */
    destroy(): void;
  }
}

/**
 * Declares static methods on the View class.
 */
declare module './view-core' {
  namespace View {
    /**
     * Imports a schema from a JSON string.
     * @param {string} schemaJson - The serialized schema.
     * @param {number} byteSize - The required buffer size.
     * @returns {View<T>} A new View instance.
     */
    function importSchema<T extends object>(schemaJson: string, byteSize: number): View<T>;
  }
}

/**
 * Gets a typed array from a SharedArrayBuffer at a specific path.
 * Returns a typed array view of the buffer at the specified path.
 *
 * @param {string} path - The path to the typed array (e.g., 'data.array').
 * @param {SharedArrayBuffer} sab - The source SharedArrayBuffer.
 * @returns {TypedArray} The typed array instance.
 * @throws {Error} If the buffer is too small or no typed array exists at the path.
 * @example
 * ```typescript
 * const array = view.getTypedArray('data.array', sab);
 * console.log(array[0]);
 * ```
 */
View.prototype.getTypedArray = function <T extends object>(this: View<T>, path: string, sab: SharedArrayBuffer): TypedArray {
  if (sab.byteLength < this.schema.byteSize) {
    throw new Error(`Buffer too small: ${sab.byteLength} < ${this.schema.byteSize}`);
  }
  const view = this.schema.typedArrayViews.get(path);
  if (!view) {
    throw new Error(`No typed array at path: ${path}`);
  }
  return new (globalThis[view.type as keyof typeof globalThis] as TypedArrayConstructor)(
    sab,
    view.offset + 4,
    view.length
  );
};

/**
 * Exports the schema as a JSON string.
 * Serializes the schema for storage or transfer.
 *
 * @returns {string} The JSON string representing the schema.
 * @example
 * ```typescript
 * const schemaJson = view.exportSchema();
 * ```
 */
View.prototype.exportSchema = function <T extends object>(this: View<T>): string {
  return JSON.stringify({
    descriptorTree: this.schema.descriptorTree,
    byteSize: this.schema.byteSize,
    flatIndex: Array.from(this.schema.flatIndex.entries()),
    encodingTemplate: this.schema.encodingTemplate.map(t => ({
      offset: t.offset,
      type: t.type,
      size: t.size,
    })),
    typedArrayViews: Array.from(this.schema.typedArrayViews.entries()),
  });
};

/**
 * Imports a schema from a JSON string.
 * Creates a new View instance with the imported schema.
 *
 * @param {string} schemaJson - The JSON string representing the schema.
 * @param {number} byteSize - The required buffer size.
 * @returns {View<T>} A new View instance.
 * @throws {Error} If the JSON is invalid or schema is malformed.
 * @example
 * ```typescript
 * const view = View.importSchema(schemaJson, 1024);
 * ```
 */
View.importSchema = function <T extends object>(schemaJson: string, byteSize: number): View<T> {
  if (byteSize < 8) throw new Error('Byte size must be at least 8');
  let parsed;
  try {
    parsed = JSON.parse(schemaJson);
  } catch (e: any) {
    throw new Error(`Invalid schema JSON: ${e.message}`);
  }
  const schema: Schema = {
    descriptorTree: parsed.descriptorTree,
    byteSize,
    flatIndex: new Map(parsed.flatIndex),
    encodingTemplate: parsed.encodingTemplate.map((t: any) => ({
      ...t,
      setter: () => {}, // Rebuild on compile
      getter: () => {},
    })),
    typedArrayViews: new Map(parsed.typedArrayViews),
  };
  const view = new View<T>({} as T, { mutable: true });
  view.schema = schema;
  view.setCompiled(compileFunctions(schema));
  view.byteSize = byteSize;
  return view;
};

/**
 * Updates the schema at a specific path.
 * Applies a value update and potentially recompiles the schema.
 *
 * @param {string} path - The path to update (e.g., 'foo.bar').
 * @param {any} value - The new value.
 * @param {SharedArrayBuffer} sab - The target SharedArrayBuffer.
 * @throws {Error} If the view is immutable, buffer is too small, or path is invalid.
 * @example
 * ```typescript
 * view.schemaUpdate('num', 100, sab);
 * ```
 */
View.prototype.schemaUpdate = function <T extends object>(this: View<T>, path: string, value: any, sab: SharedArrayBuffer): void {
  if (!this.options.mutable) {
    throw new Error('Cannot update schema in immutable view');
  }
  if (sab.byteLength < this.schema.byteSize) {
    throw new Error(`Buffer too small: ${sab.byteLength} < ${this.schema.byteSize}`);
  }
  // Placeholder: Update schema and recompile
  this.set(path, value, sab);
};

/**
 * Cleans up resources associated with the view.
 * Clears internal data structures and callbacks.
 *
 * @example
 * ```typescript
 * view.destroy();
 * ```
 */
View.prototype.destroy = function <T extends object>(this: View<T>): void {
  this.schema.flatIndex.clear();
  this.schema.typedArrayViews.clear();
  this.schema.encodingTemplate = [];
  this.onDiff = undefined;
  this.beforePatch = undefined;
};