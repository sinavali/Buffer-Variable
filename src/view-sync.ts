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
 * Registry for ViewSync instances.
 * Maps SharedArrayBuffers to their associated ViewSync instances.
 *
 * @private
 */
const viewSyncRegistry = new WeakMap<SharedArrayBuffer, Set<ViewSync<any>>>();

/**
 * LRU Cache for path resolution.
 * Caches path resolutions to improve performance for frequent lookups.
 *
 * @template K - The key type.
 * @template V - The value type.
 * @class LRUCache
 */
export class LRUCache<K, V> {
  /**
   * Internal Map storing cache entries.
   * @private
   */
  private cache = new Map<K, V>();

  /**
   * Maximum number of entries in the cache.
   * @private
   */
  private maxSize: number;

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
  constructor(maxSize: number) {
    if (maxSize <= 0) throw new Error('Max size must be positive');
    this.maxSize = maxSize;
  }

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
  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value) {
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

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
  set(key: K, value: V): void {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }
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
export class ViewSync<T extends object> {
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
  protected boundVariable: T | null = null;

  /**
   * Set of paths to synchronize.
   * @protected
   */
  protected boundPaths: Set<string> = new Set();

  /**
   * Last known version of the SharedArrayBuffer.
   * @protected
   */
  protected lastVersion: number = 0;

  /**
   * Callback for update notifications.
   * @protected
   */
  protected onUpdate: ((data: Partial<T>) => void) | null = null;

  /**
   * Handle for the polling interval.
   * @private
   */
  private pollHandle: number | NodeJS.Timeout | null = null;

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
  constructor(view: View<T>, sab: SharedArrayBuffer, options: ViewSyncOptions = {}) {
    if (sab.byteLength < view.byteSize) {
      throw new Error(`Buffer too small: ${sab.byteLength} < ${view.byteSize}`);
    }
    this.view = view;
    this.sab = sab;
    if (options.boundPaths) {
      options.boundPaths.forEach(p => this.boundPaths.add(p));
    }
    if (!viewSyncRegistry.has(sab)) {
      viewSyncRegistry.set(sab, new Set());
    }
    viewSyncRegistry.get(sab)!.add(this);
    this.startPolling(options.pollInterval || 10);
  }

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
  public bind(variable: T, paths?: string[]): T {
    this.boundVariable = new Proxy(variable, {
      set: (target, prop, value) => {
        const path = prop.toString();
        if (paths && !paths.includes(path)) {
          return Reflect.set(target, prop, value);
        }
        if (value === undefined) {
          throw new Error('Undefined values not allowed');
        }
        this.view.set(path, value, this.sab);
        return Reflect.set(target, prop, value);
      },
    });
    if (paths) {
      this.boundPaths = new Set(paths);
    }
    return this.boundVariable;
  }

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
  public syncToSab(): void {
    if (!this.boundVariable) {
      throw new Error('No bound variable');
    }
    this.view.encode(this.boundVariable, this.sab);
  }

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
  public onUpdateCallback(callback: (data: Partial<T>) => void): void {
    this.onUpdate = callback;
  }

  /**
   * Starts polling for changes in the SharedArrayBuffer.
   * Uses requestAnimationFrame in browsers or setTimeout in Node.js.
   *
   * @protected
   * @param {number} intervalMs - The polling interval in milliseconds.
   */
  protected startPolling(intervalMs: number): void {
    const poll = () => {
      const version = Atomics.load(new Int32Array(this.sab, 0, 1), 0);
      if (version !== this.lastVersion) {
        this.lastVersion = version;
        const data = this.boundPaths.size > 0
          ? Object.fromEntries([...this.boundPaths].map(p => [p.split('.').pop()!, this.view.decodePartial(p, this.sab)])) as Partial<T>
          : this.view.decode(this.sab);
        if (this.boundVariable) {
          Object.assign(this.boundVariable, data);
        }
        if (this.onUpdate) {
          this.onUpdate(data);
        }
        viewSyncRegistry.get(this.sab)?.forEach(v => v !== this && v.notify());
      }
      this.pollHandle = typeof requestAnimationFrame !== 'undefined'
        ? requestAnimationFrame(poll)
        : setTimeout(poll, intervalMs);
    };
    poll();
  }

  /**
   * Notifies other ViewSync instances of changes.
   * Updates the bound variable and triggers the onUpdate callback.
   *
   * @protected
   */
  protected notify(): void {
    const version = Atomics.load(new Int32Array(this.sab, 0, 1), 0);
    if (version !== this.lastVersion) {
      this.lastVersion = version;
      const data = this.boundPaths.size > 0
        ? Object.fromEntries([...this.boundPaths].map(p => [p.split('.').pop()!, this.view.decodePartial(p, this.sab)])) as Partial<T>
        : this.view.decode(this.sab);
      if (this.boundVariable) {
        Object.assign(this.boundVariable, data);
      }
      if (this.onUpdate) {
        this.onUpdate(data);
      }
    }
  }

  /**
   * Cleans up resources associated with the ViewSync.
   * Stops polling and removes the instance from the registry.
   *
   * @example
   * ```typescript
   * sync.destroy();
   * ```
   */
  public destroy(): void {
    if (this.pollHandle !== null) {
      if (typeof cancelAnimationFrame !== 'undefined') {
        cancelAnimationFrame(this.pollHandle as number);
      } else {
        clearTimeout(this.pollHandle as NodeJS.Timeout);
      }
    }
    viewSyncRegistry.get(this.sab)?.delete(this);
    this.boundVariable = null;
    this.onUpdate = null;
    this.pollHandle = null;
  }
}