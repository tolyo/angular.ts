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
export const $postUpdateQueue: any[];
/**
 * @type {Function[]}
 */
export const $$applyAsyncQueue: Function[];
export class RootModelProvider {
    rootModel: any;
    $get: (string | ((exceptionHandler: import("../exception-handler").ErrorHandler, parse: import("../parser/parse").ParseService) => any))[];
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
    property: string;
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
    $target: any;
    /** @type {Map<string, Array<Listener>>} */
    listeners: Map<string, Array<Listener>>;
    /** @type {WeakMap<Object, Array<string>>} */
    objectListeners: WeakMap<any, Array<string>>;
    /** @type {?number} */
    listenerCache: number | null;
    /** @type {Proxy} */
    proxy: ProxyConstructor;
    /**
     * @type {Proxy[]}
     */
    children: ProxyConstructor[];
    /**
     * @type {number} Unique model ID (monotonically increasing) useful for debugging.
     */
    id: number;
    /**
     * @type {Handler}
     */
    $root: Handler;
    $parent: Handler;
    /** @type {number} */
    $$watchersCount: number;
    /** @type {AsyncQueueTask[]} */
    $$asyncQueue: AsyncQueueTask[];
    /** @type {Map<String, Function[]>} */
    $$listeners: Map<string, Function[]>;
    /**
     * Intercepts and handles property assignments on the target object. If a new value is
     * an object, it will be recursively proxied.
     *
     * @param {Object} target - The target object.
     * @param {string} property - The name of the property being set.
     * @param {*} value - The new value being assigned to the property.
     * @returns {boolean} - Returns true to indicate success of the operation.
     */
    set(target: any, property: string, value: any, proxy: any): boolean;
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
    /**
     * @private
     * @param {Listener[]} listeners
     * @param {*} oldValue
     * @param {*} newValue
     */
    private scheduleListener;
    deleteProperty(target: any, property: any): boolean;
    /**
     * Registers a watcher for a property along with a listener function. The listener
     * function is invoked when changes to that property are detected.
     *
     * @param {((any) => any)} watchProp - A property path (dot notation) to observe specific changes in the target.
     * @param {ListenerFunction} listenerFn - A function to execute when changes are detected.
     */
    $watch(watchProp: ((any: any) => any), listenerFn: ListenerFunction): () => void;
    $watchGroup(watchArray: any, listenerFn: any): void;
    $watchCollection(): void;
    $new(isIsolated: boolean, parent: any): any;
    registerKey(key: any, listener: any): void;
    deregisterKey(key: any, id: any): boolean;
    /**
     * @deprecated
     */
    $digest(): void;
    $eval(expr: any, locals: any): any;
    $evalAsync(expr: any, locals: any): Promise<any>;
    $apply(expr: any): any;
    $on(name: any, listener: any): () => void;
    $emit(name: any, ...args: any[]): any;
    $broadcast(name: any, ...args: any[]): any;
    eventHelper({ name, event }: {
        name: any;
        event: any;
    }, ...args: any[]): any;
    /**
     * @private
     * @returns {boolean}
     */
    private isRoot;
    $applyAsync(expr: any): Promise<any>;
    /**
     * @private
     */
    private retry;
    $postUpdate(fn: any): void;
    $destroy(): void;
    /**
     * @param {number} count
     */
    incrementWatchersCount(count: number): void;
    /**
     * Invokes the registered listener function with watched property changes.
     *
     * @param {Listener} listener - The property path that was changed.
     * @param {*} oldValue - The old value of the property.
     * @param {*} newValue - The new value of the property.
     */
    notifyListener(listener: Listener, oldValue: any, newValue: any): void;
}
export {};
