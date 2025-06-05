/**
 * Core View class for managing SharedArrayBuffer encoding/decoding.
 * Provides the foundation for serializing JavaScript objects to/from
 * SharedArrayBuffer, with support for schema inference, mutability,
 * and low-level APIs. Used in Node.js and browser environments.
 *
 * @module view-core
 */
import { Descriptor, Schema, ViewOptions, CompiledFunctions, LowLevelApi, Patch } from './types';
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
export declare class View<T extends object> {
    /**
     * The schema describing the data structure.
     * @public
     */
    schema: Schema;
    /**
     * Configuration options for the view.
     * @public
     */
    options: ViewOptions;
    /**
     * Total byte size required for the SharedArrayBuffer.
     * @public
     */
    byteSize: number;
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
    constructor(data: T, options?: ViewOptions);
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
    protected initLowLevelApi(): LowLevelApi;
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
    protected getDescriptor(path: string): Descriptor;
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
    protected readValue(dv: DataView, descriptor: Descriptor, offset: number): any;
    /**
     * Sets the compiled functions.
     * Used internally for schema updates or imports.
     *
     * @public
     * @param {CompiledFunctions<T>} compiled - The new compiled functions.
     */
    setCompiled(compiled: CompiledFunctions<T>): void;
    /**
     * Gets the low-level API instance.
     * Returns undefined if `exposedLowLevelApi` is false.
     *
     * @public
     * @returns {LowLevelApi | undefined} The low-level API instance.
     */
    getLowLevel(): LowLevelApi | undefined;
    /**
     * Gets the onDiff callback.
     *
     * @public
     * @returns {((patch: Patch[]) => void) | undefined} The callback.
     */
    getOnDiff(): ((patch: Patch[]) => void) | undefined;
    /**
     * Gets the beforePatch callback.
     *
     * @public
     * @returns {((patch: Patch) => void) | undefined} The callback.
     */
    getBeforePatch(): ((patch: Patch) => void) | undefined;
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
    setOnDiff(callback: (patch: Patch[]) => void): void;
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
    setBeforePatch(callback: (patch: Patch) => void): void;
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
    static createView<T extends object>(data: T, options?: ViewOptions): View<T>;
}
