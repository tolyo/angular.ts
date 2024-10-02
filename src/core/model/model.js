/**
 * Creates a deep proxy for the target object, intercepting property changes
 * and recursively applying proxies to nested objects.
 *
 * @param {Object} target - The object to be wrapped in a proxy.
 * @param {HandlerContext} [context] - The context for the handler, used to track listeners.
 * @returns {Object | Proxy<Object>} - A proxy that intercepts operations on the target object,
 *                                     or the original value if the target is not an object.
 */
export function createModel(target = {}, context) {
  if (typeof target === "object" && target !== null) {
    for (const key in target) {
      if (Object.prototype.hasOwnProperty.call(target, key)) {
        target[key] = createModel(target[key], new Handler(target, context));
      }
    }
    return new Proxy(target, new Handler(target, context));
  }
  return target; // Return non-object types as is
}

/**
 * A context object for passing information between handlers.
 * @typedef {Object} HandlerContext
 * @property {Map<string, Listener>} listeners - A map of listeners for property changes.
 */

/**
 * Listener function definition.
 * @typedef {Object} Listener
 * @property {Object} originalTarget - The original target object.
 * @property {ListenerFunction} listenerFn - The function invoked when changes are detected.
 */

/**
 * Listener function type.
 * @callback ListenerFunction
 * @param {*} newValue - The new value of the changed property.
 * @param {*} oldValue - The old value of the changed property.
 * @param {Object} originalTarget - The original target object.
 */

/**
 * Handler class for the Proxy. It intercepts operations like property access (get)
 * and property setting (set), and adds support for deep change tracking and
 * observer-like behavior.
 */
class Handler {
  /**
   * Initializes the handler with the target object and a context.
   *
   * @param {Object} target - The target object being proxied.
   * @param {HandlerContext} [context] - The context containing listeners.
   */
  constructor(target, context) {
    /**
     * @type {Object}
     */
    this.target = target;

    /**
     * A map that stores listeners for property changes.
     * @type {Map<string, Listener>}
     */
    this.listeners = context ? context.listeners : new Map();
  }

  /**
   * Intercepts and handles property assignments on the target object. If a new value is
   * an object, it will be recursively proxied.
   *
   * @param {Object} target - The target object.
   * @param {string} property - The name of the property being set.
   * @param {*} value - The new value being assigned to the property.
   * @returns {boolean} - Returns true to indicate success of the operation.
   */
  set(target, property, value) {
    const oldValue = target[property];
    target[property] = createModel(value, this);
    if (oldValue !== value) {
      this.notifyListeners(target, property, oldValue, value);
    }
    return true;
  }

  /**
   * Intercepts property access on the target object. It checks for specific
   * properties (`watch` and `sync`) and binds their methods. For other properties,
   * it returns the value directly.
   *
   * @param {Object} target - The target object.
   * @param {string} property - The name of the property being accessed.
   * @returns {*} - The value of the property or a method if accessing `watch` or `sync`.
   */
  get(target, property) {
    if (property === "watch") {
      return this.watch.bind(this);
    }

    if (property === "sync") {
      return this.sync.bind(this);
    }

    return target[property];
  }

  /**
   * Registers a watcher for a property along with a listener function. The listener
   * function is invoked when changes to that property are detected.
   *
   * @param {string} watchProp - A property path (dot notation) to observe specific changes in the target.
   * @param {ListenerFunction} listenerFn - A function to execute when changes are detected.
   */
  watch(watchProp, listenerFn) {
    const keys = watchProp.split(".");
    const actual = keys.pop();
    this.listeners.set(actual, {
      originalTarget: this.target,
      listenerFn: listenerFn,
    });
  }

  /**
   * Invokes all registered listener functions for any watched properties.
   */
  sync() {
    Array.from(this.listeners.values()).forEach(({ listenerFn }) =>
      listenerFn(),
    );
  }

  /**
   * Invokes the registered listener function when a watched property changes.
   *
   * @param {Object} _target - The target object being modified.
   * @param {string} propertyPath - The property path that was changed.
   * @param {*} oldValue - The old value of the property.
   * @param {*} newValue - The new value of the property.
   */
  notifyListeners(_target, propertyPath, oldValue, newValue) {
    const listener = this.listeners.get(propertyPath);
    if (listener) {
      const { originalTarget, listenerFn } = listener;
      listenerFn(newValue, oldValue, originalTarget); // Call the listener function
    }
  }
}
