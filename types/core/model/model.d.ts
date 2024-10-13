/**
 * Creates a deep proxy for the target object, intercepting property changes
 * and recursively applying proxies to nested objects.
 *
 * @param {Object} target - The object to be wrapped in a proxy.
 * @param {Handler} [context] - The context for the handler, used to track listeners.
 * @returns {Object | Proxy<Object>} - A proxy that intercepts operations on the target object,
 *                                     or the original value if the target is not an object.
 */
export function createModel(target?: any, context?: Handler): any | ProxyConstructor;
/**
 * @typedef {Object} AsyncQueueTask
 * @property {Handler} handler
 * @property {Function} fn
 * @property {Object} locals
 */
/** @type {AsyncQueueTask[]} */
export const $$asyncQueue: AsyncQueueTask[];
export const $$postDigestQueue: any[];
/**
 * @type {Function[]}
 */
export const $$applyAsyncQueue: Function[];
export class RootModelProvider {
    rootModel: any;
    $get: (string | ((exceptionHandler: import("../exception-handler").ErrorHandler, parse: import("../parser/parse").ParseService, browser: import("../../services/browser").Browser) => any))[];
}
export type AsyncQueueTask = {
    handler: Handler;
    fn: Function;
    locals: any;
};
/**
 * Listener function definition.
 */
export type Listener = {
    /**
     * - The original target object.
     */
    originalTarget: any;
    /**
     * - The function invoked when changes are detected.
     */
    listenerFn: ListenerFunction;
    id: number;
    oneTime: boolean;
};
/**
 * Listener function type.
 */
export type ListenerFunction = (newValue: any, oldValue: any, originalTarget: any) => any;
/**
 * Handler class for the Proxy. It intercepts operations like property access (get)
 * and property setting (set), and adds support for deep change tracking and
 * observer-like behavior.
 */
declare class Handler {
    /**
     * Initializes the handler with the target object and a context.
     *
     * @param {Object} target - The target object being proxied.
     * @param {Handler} [context] - The context containing listeners.
     */
    constructor(target: any, context?: Handler);
    /** @type {Object} */
    target: any;
    /** @type {Map<string, Array<Listener>>} */
    listeners: Map<string, Array<Listener>>;
    /** @type {WeakMap<Object, Array<string>>} */
    objectListeners: WeakMap<any, Array<string>>;
    /** @type {?number} */
    listenerCache: number | null;
    /** @type {Proxy} */
    proxy: ProxyConstructor;
    /**
     * @type {number} Unique model ID (monotonically increasing) useful for debugging.
     */
    $id: number;
    /**
     * @type {Handler}
     */
    $root: Handler;
    $parent: Handler;
    /** @type {number} */
    $$watchersCount: number;
    /**
     * Intercepts and handles property assignments on the target object. If a new value is
     * an object, it will be recursively proxied.
     *
     * @param {Object} target - The target object.
     * @param {string} property - The name of the property being set.
     * @param {*} value - The new value being assigned to the property.
     * @returns {boolean} - Returns true to indicate success of the operation.
     */
    set(target: any, property: string, value: any): boolean;
    /**
     * Intercepts property access on the target object. It checks for specific
     * properties (`watch` and `sync`) and binds their methods. For other properties,
     * it returns the value directly.
     *
     * @param {Object} target - The target object.
     * @param {string|number|symbol} property - The name of the property being accessed.
     * @param {Proxy} proxy - The proxy object being invoked
     * @returns {*} - The value of the property or a method if accessing `watch` or `sync`.
     */
    get(target: any, property: string | number | symbol, proxy: ProxyConstructor): any;
    deleteProperty(target: any, property: any): boolean;
    /**
     * Returns the underlying object being wrapped by the Proxy
     * @returns {any}
     */
    $target(): any;
    /**
     * Registers a watcher for a property along with a listener function. The listener
     * function is invoked when changes to that property are detected.
     *
     * @param {((any) => any)} watchProp - A property path (dot notation) to observe specific changes in the target.
     * @param {ListenerFunction} listenerFn - A function to execute when changes are detected.
     */
    $watch(watchProp: ((any: any) => any), listenerFn: ListenerFunction): () => void;
    $new(isIsolated: boolean, parent: any): any;
    registerKey(key: any, listener: any): void;
    deregisterKey(key: any, id: any): boolean;
    /**
     * Invokes all registered listener functions for any watched properties.
     */
    $digest(): void;
    $eval(expr: any, locals: any): any;
    $evalAsync(expr: any, locals: any): void;
    $apply(expr: any): any;
    $applyAsync(expr: any): void;
    /**
     * @private
     */
    private retry;
    $$postDigest(fn: any): void;
    $destroy(): void;
    /**
     * @param {number} count
     */
    incrementWatchersCount(count: number): void;
    /**
     * Invokes the registered listener function when a watched property changes.
     *
     * @param {Listener} listener - The property path that was changed.
     * @param {*} oldValue - The old value of the property.
     * @param {*} newValue - The new value of the property.
     */
    notifyListeners(listener: Listener, oldValue: any, newValue: any): void;
}
export {};
