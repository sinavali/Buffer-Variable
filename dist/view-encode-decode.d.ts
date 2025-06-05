/**
 * Extends the View class with encoding and decoding methods.
 * Provides functionality to serialize and deserialize JavaScript objects
 * to/from SharedArrayBuffer using the inferred schema.
 *
 * @module view-encode-decode
 */
/**
 * Module augmentation to extend View with encoding/decoding methods.
 */
declare module './view-core' {
    interface View<T> {
        /**
         * Encodes data to a SharedArrayBuffer.
         * @param {T} data - The data to encode.
         * @param {SharedArrayBuffer} sab - The target buffer.
         */
        encode(data: T, sab: SharedArrayBuffer): void;
        /**
         * Decodes data from a SharedArrayBuffer.
         * @param {SharedArrayBuffer} sab - The source buffer.
         * @returns {T} The decoded data.
         */
        decode(sab: SharedArrayBuffer): T;
        /**
         * Decodes a partial value from a SharedArrayBuffer.
         * @param {string} path - The path to the value.
         * @param {SharedArrayBuffer} sab - The source buffer.
         * @returns {any} The decoded value.
         */
        decodePartial(path: string, sab: SharedArrayBuffer): any;
    }
}
export {};
