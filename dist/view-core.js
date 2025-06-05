/**
 * Core View class for managing SharedArrayBuffer encoding/decoding.
 * Provides the foundation for serializing JavaScript objects to/from
 * SharedArrayBuffer, with support for schema inference, mutability,
 * and low-level APIs. Used in Node.js and browser environments.
 *
 * @module view-core
 */
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
export class View {
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
    constructor(data, options = {}) {
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
    initLowLevelApi() {
        let logFn = (message) => console.log(message);
        return {
            readRaw: (offset, type, sab) => {
                if (offset < 0 || offset >= sab.byteLength)
                    throw new Error(`Invalid offset: ${offset}`);
                const dv = new DataView(sab);
                switch (type) {
                    case 'Uint8': return dv.getUint8(offset);
                    case 'Uint32': return dv.getUint32(offset, true);
                    case 'Float64': return dv.getFloat64(offset, true);
                    case 'BigInt64': return dv.getBigInt64(offset, true);
                    case 'String': {
                        const length = dv.getUint32(offset, true);
                        if (offset + 4 + length > sab.byteLength)
                            throw new Error('String length exceeds buffer');
                        const bytes = new Uint8Array(sab, offset + 4, length);
                        return new TextDecoder().decode(bytes);
                    }
                    default: throw new Error(`Unsupported type: ${type}`);
                }
            },
            writeRaw: (offset, type, value, sab) => {
                if (offset < 0 || offset >= sab.byteLength)
                    throw new Error(`Invalid offset: ${offset}`);
                const dv = new DataView(sab);
                switch (type) {
                    case 'Uint8':
                        dv.setUint8(offset, value);
                        break;
                    case 'Uint32':
                        dv.setUint32(offset, value, true);
                        break;
                    case 'Float64':
                        dv.setFloat64(offset, value, true);
                        break;
                    case 'BigInt64':
                        dv.setBigInt64(offset, BigInt(value), true);
                        break;
                    case 'String': {
                        const bytes = defaultCompressString(value);
                        if (offset + 4 + bytes.length > sab.byteLength)
                            throw new Error('String length exceeds buffer');
                        dv.setUint32(offset, bytes.length, true);
                        new Uint8Array(sab, offset + 4, bytes.length).set(bytes);
                        break;
                    }
                    default: throw new Error(`Unsupported type: ${type}`);
                }
            },
            getSchema: () => this.schema,
            getVersion: (sab) => {
                if (sab.byteLength < 4)
                    throw new Error('Buffer too small for version');
                return Atomics.load(new Int32Array(sab, 0, 1), 0);
            },
            getSchemaId: (sab) => {
                if (sab.byteLength < 8)
                    throw new Error('Buffer too small for schema ID');
                return new DataView(sab).getUint32(4, true);
            },
            resolvePath: (path) => {
                const entry = this.schema.flatIndex.get(path);
                if (!entry)
                    throw new Error(`Invalid path: ${path}`);
                return entry;
            },
            executeTemplate: (index, value, sab) => {
                if (sab.byteLength < this.schema.byteSize)
                    throw new Error('Buffer too small');
                const template = this.schema.encodingTemplate[index];
                if (!template)
                    throw new Error(`Invalid template index: ${index}`);
                template.setter(new DataView(sab), value);
            },
            dumpBytes: (sab, start = 0, end = sab.byteLength) => {
                if (start < 0 || end > sab.byteLength || start > end)
                    throw new Error('Invalid byte range');
                const bytes = new Uint8Array(sab, start, end - start);
                return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
            },
            diffSchema: (otherSchema) => {
                // Placeholder: Compare schemas
                return [];
            },
            log: (message) => logFn(message),
            setLog: (fn) => { logFn = fn; },
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
    getDescriptor(path) {
        const parts = path.split(/[\.\[\]]/).filter(p => p);
        let current = this.schema.descriptorTree;
        for (const part of parts) {
            if (current.type === 'Object' && current.children) {
                current = current.children[part];
                if (!current)
                    throw new Error(`Invalid path segment: ${part}`);
            }
            else if (current.type === 'Array' && !isNaN(Number(part))) {
                current = current.children['[]'];
                if (!current)
                    throw new Error(`Invalid array index: ${part}`);
            }
            else {
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
    readValue(dv, descriptor, offset) {
        if (offset < 0 || offset >= dv.byteLength)
            throw new Error(`Invalid offset: ${offset}`);
        switch (descriptor.type) {
            case 'Primitive':
                if (!descriptor.dataType)
                    throw new Error('Missing dataType for Primitive');
                switch (descriptor.dataType) {
                    case 'Number': return dv.getFloat64(offset, true);
                    case 'String': {
                        const length = dv.getUint32(offset, true);
                        if (offset + 4 + length > dv.byteLength)
                            throw new Error('String length exceeds buffer');
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
                const result = {};
                for (const [key, child] of Object.entries(descriptor.children || {})) {
                    result[key] = this.readValue(dv, child, offset + child.byteOffset);
                }
                return result;
            }
            case 'Array': {
                const length = dv.getUint32(offset, true);
                if (offset + 4 + length * descriptor.children['[]'].byteSize > dv.byteLength) {
                    throw new Error('Array length exceeds buffer');
                }
                const result = new Array(length);
                const child = descriptor.children['[]'];
                for (let i = 0; i < length; i++) {
                    result[i] = this.readValue(dv, child, offset + 4 + i * child.byteSize);
                }
                return result;
            }
            case 'TypedArray': {
                if (!isTypedArrayType(descriptor.dataType))
                    throw new Error(`Invalid typed array type: ${descriptor.dataType}`);
                const length = dv.getUint32(offset, true);
                if (offset + 4 + length * getTypedArrayByteSize(descriptor.dataType) > dv.byteLength) {
                    throw new Error('Typed array length exceeds buffer');
                }
                const TypedArrayClass = {
                    Int8Array, Uint8Array, Int16Array, Uint16Array, Int32Array, Uint32Array,
                    Float32Array, Float64Array, BigInt64Array, BigUint64Array
                }[descriptor.dataType];
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
    setCompiled(compiled) {
        this.compiled = compiled;
    }
    /**
     * Gets the low-level API instance.
     * Returns undefined if `exposedLowLevelApi` is false.
     *
     * @public
     * @returns {LowLevelApi | undefined} The low-level API instance.
     */
    getLowLevel() {
        return this.lowLevel;
    }
    /**
     * Gets the onDiff callback.
     *
     * @public
     * @returns {((patch: Patch[]) => void) | undefined} The callback.
     */
    getOnDiff() {
        return this.onDiff;
    }
    /**
     * Gets the beforePatch callback.
     *
     * @public
     * @returns {((patch: Patch) => void) | undefined} The callback.
     */
    getBeforePatch() {
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
    setOnDiff(callback) {
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
    setBeforePatch(callback) {
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
    static createView(data, options) {
        return new View(data, options);
    }
}
/**
 * Type guard for TypedArrayType.
 *
 * @param {string | undefined} type - The type to check.
 * @returns {type is TypedArrayType} True if the type is a valid TypedArrayType.
 */
function isTypedArrayType(type) {
    return [
        'Int8Array', 'Uint8Array', 'Int16Array', 'Uint16Array', 'Int32Array',
        'Uint32Array', 'Float32Array', 'Float64Array', 'BigInt64Array', 'BigUint64Array'
    ].includes(type);
}
/**
 * Gets the byte size of a typed array element.
 *
 * @param {TypedArrayType} type - The typed array type.
 * @returns {number} The byte size per element.
 */
function getTypedArrayByteSize(type) {
    return {
        Int8Array: 1, Uint8Array: 1, Int16Array: 2, Uint16Array: 2,
        Int32Array: 4, Uint32Array: 4, Float32Array: 4, Float64Array: 8,
        BigInt64Array: 8, BigUint64Array: 8
    }[type];
}
