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
    /** @type {?number} */
    listenerCache: number | null;
    /** @type {Proxy} */
    proxy: ProxyConstructor;
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
     * @param {string} property - The name of the property being accessed.
     * @param {Proxy} proxy - The proxy object being invoked
     * @returns {*} - The value of the property or a method if accessing `watch` or `sync`.
     */
    get(target: any, property: string, proxy: ProxyConstructor): any;
    /**
     * Registers a watcher for a property along with a listener function. The listener
     * function is invoked when changes to that property are detected.
     *
     * @param {string|Function} watchProp - A property path (dot notation) to observe specific changes in the target.
     * @param {ListenerFunction} listenerFn - A function to execute when changes are detected.
     */
    $watch(watchProp: string | Function, listenerFn: ListenerFunction): void;
    registerKey(key: any, listener: any): void;
    /**
     * Invokes all registered listener functions for any watched properties.
     */
    sync(): void;
    /**
     * Invokes the registered listener function when a watched property changes.
     *
     * @param {Object} _target - The target object being modified.
     * @param {string} propertyPath - The property path that was changed.
     * @param {*} oldValue - The old value of the property.
     * @param {*} newValue - The new value of the property.
     */
    notifyListeners(propertyPath: string, oldValue: any, newValue: any): void;
}
export {};
