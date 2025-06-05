/**
 * Provides the ViewSync class for synchronizing JavaScript variables
 * with a SharedArrayBuffer. Enables real-time updates across threads
 * or workers using polling or proxy-based binding.
 *
 * @module view-sync
 */
import { View } from './view-core';
import { ViewSyncOptions } from './types';
/**
 * LRU Cache for path resolution.
 * Caches path resolutions to improve performance for frequent lookups.
 *
 * @template K - The key type.
 * @template V - The value type.
 * @class LRUCache
 */
export declare class LRUCache<K, V> {
    /**
     * Internal Map storing cache entries.
     * @private
     */
    private cache;
    /**
     * Maximum number of entries in the cache.
     * @private
     */
    private maxSize;
    /**
     * Creates a new LRUCache instance.
     *
     * @param {number} maxSize - The maximum number of entries.
     * @throws {Error} If maxSize is less than or equal to 0.
     * @example
     * ```typescript
     * const cache = new LRUCache<string, number>(100);
     * ```
     */
    constructor(maxSize: number);
    /**
     * Gets a value from the cache.
     * Moves the accessed entry to the end (most recently used).
     *
     * @param {K} key - The key to look up.
     * @returns {V | undefined} The value, or undefined if not found.
     * @example
     * ```typescript
     * cache.set('key', 42);
     * console.log(cache.get('key')); // 42
     * ```
     */
    get(key: K): V | undefined;
    /**
     * Sets a value in the cache.
     * Evicts the least recently used entry if the cache is full.
     *
     * @param {K} key - The key to set.
     * @param {V} value - The value to store.
     * @example
     * ```typescript
     * cache.set('key', 42);
     * ```
     */
    set(key: K, value: V): void;
}
/**
 * Synchronizes a JavaScript variable with a SharedArrayBuffer.
 * Uses polling and proxy-based binding for real-time updates.
 *
 * @template T - The type of the bound variable.
 * @class ViewSync
 * @example
 * ```typescript
 * const view = View.createView({ counter: 0 }, { mutable: true });
 * const sab = new SharedArrayBuffer(view.byteSize);
 * const sync = new ViewSync(view, sab);
 * const bound = sync.bind({ counter: 0 });
 * bound.counter = 1;
 * sync.syncToSab();
 * ```
 */
export declare class ViewSync<T extends object> {
    /**
     * The associated View instance.
     * @protected
     */
    protected view: View<T>;
    /**
     * The SharedArrayBuffer to synchronize with.
     * @protected
     */
    protected sab: SharedArrayBuffer;
    /**
     * The bound JavaScript variable.
     * @protected
     */
    protected boundVariable: T | null;
    /**
     * Set of paths to synchronize.
     * @protected
     */
    protected boundPaths: Set<string>;
    /**
     * Last known version of the SharedArrayBuffer.
     * @protected
     */
    protected lastVersion: number;
    /**
     * Callback for update notifications.
     * @protected
     */
    protected onUpdate: ((data: Partial<T>) => void) | null;
    /**
     * Handle for the polling interval.
     * @private
     */
    private pollHandle;
    /**
     * Creates a new ViewSync instance.
     * Starts polling for changes in the SharedArrayBuffer.
     *
     * @param {View<T>} view - The View instance to synchronize with.
     * @param {SharedArrayBuffer} sab - The SharedArrayBuffer to monitor.
     * @param {ViewSyncOptions} [options={}] - Configuration options.
     * @throws {Error} If the buffer is too small.
     * @example
     * ```typescript
     * const sync = new ViewSync(view, sab, { pollInterval: 10 });
     * ```
     */
    constructor(view: View<T>, sab: SharedArrayBuffer, options?: ViewSyncOptions);
    /**
     * Binds a JavaScript variable to the SharedArrayBuffer.
     * Returns a proxy that synchronizes updates to the buffer.
     *
     * @param {T} variable - The variable to bind.
     * @param {string[]} [paths] - Specific paths to synchronize.
     * @returns {T} The proxied variable.
     * @throws {Error} If undefined values are set.
     * @example
     * ```typescript
     * const bound = sync.bind({ counter: 0 }, ['counter']);
     * bound.counter = 1;
     * ```
     */
    bind(variable: T, paths?: string[]): T;
    /**
     * Synchronizes the bound variable to the SharedArrayBuffer.
     * Encodes the entire bound variable to the buffer.
     *
     * @throws {Error} If no variable is bound.
     * @example
     * ```typescript
     * sync.syncToSab();
     * ```
     */
    syncToSab(): void;
    /**
     * Registers a callback for update notifications.
     * Called when the SharedArrayBuffer changes.
     *
     * @param {(data: Partial<T>) => void} callback - The callback function.
     * @example
     * ```typescript
     * sync.onUpdateCallback(data => console.log(data));
     * ```
     */
    onUpdateCallback(callback: (data: Partial<T>) => void): void;
    /**
     * Starts polling for changes in the SharedArrayBuffer.
     * Uses requestAnimationFrame in browsers or setTimeout in Node.js.
     *
     * @protected
     * @param {number} intervalMs - The polling interval in milliseconds.
     */
    protected startPolling(intervalMs: number): void;
    /**
     * Notifies other ViewSync instances of changes.
     * Updates the bound variable and triggers the onUpdate callback.
     *
     * @protected
     */
    protected notify(): void;
    /**
     * Cleans up resources associated with the ViewSync.
     * Stops polling and removes the instance from the registry.
     *
     * @example
     * ```typescript
     * sync.destroy();
     * ```
     */
    destroy(): void;
}
