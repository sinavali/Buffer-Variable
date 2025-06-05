/**
 * Extends the View class with accessor methods.
 * Provides functionality to access typed arrays, export/import schemas,
 * update schemas, and clean up resources.
 *
 * @module view-accessors
 */
import { TypedArray } from './types';
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
