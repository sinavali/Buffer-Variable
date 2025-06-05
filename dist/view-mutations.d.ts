/**
 * Extends the View class with mutation methods.
 * Provides functionality to update values in a SharedArrayBuffer,
 * supporting single updates, bulk updates, and partial patches.
 *
 * @module view-mutations
 */
/**
 * Module augmentation to extend View with mutation methods.
 */
declare module './view-core' {
    interface View<T> {
        /**
         * Sets a value at a specific path in a SharedArrayBuffer.
         * @param {string} path - The path to the value.
         * @param {any} value - The new value.
         * @param {SharedArrayBuffer} sab - The target buffer.
         */
        set(path: string, value: any, sab: SharedArrayBuffer): void;
        /**
         * Sets multiple values in a SharedArrayBuffer.
         * @param {Record<string, any>} pathsAndValues - Paths and their values.
         * @param {SharedArrayBuffer} sab - The target buffer.
         */
        bulkSet(pathsAndValues: Record<string, any>, sab: SharedArrayBuffer): void;
        /**
         * Patches an object at a path with partial updates.
         * @param {string} path - The path to the object.
         * @param {any} partial - The partial update.
         * @param {SharedArrayBuffer} sab - The target buffer.
         */
        patch(path: string, partial: any, sab: SharedArrayBuffer): void;
    }
}
export {};
