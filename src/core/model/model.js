import { isFunction, isString } from "../../shared/utils.js";

/**
 * Creates a deep proxy for the target object, intercepting property changes
 * and recursively applying proxies to nested objects.
 *
 * @param {Object} target - The object to be wrapped in a proxy.
 * @param {Handler} [context] - The context for the handler, used to track listeners.
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
  return target;
}

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

const isProxySymbol = Symbol("isProxy");

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
   * @param {Handler} [context] - The context containing listeners.
   */
  constructor(target, context) {
    /** @type {Object} */
    this.target = target;

    /** @type {Map<string, Array<Listener>>} */
    this.listeners = context ? context.listeners : new Map();
    /** @type {?number} */
    this.listenerCache = null;

    /** @type {Proxy} */
    this.proxy = null;
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
    if (property === "getWatchFunction") {
      return true;
    }

    const oldValue = target[property];
    if (oldValue && oldValue[isProxySymbol]) {
      if (value) {
        Object.keys(value).forEach((key) => {
          oldValue[key] = value[key];
        });
      }
      return true;
    } else {
      target[property] = createModel(value, this);
      if (oldValue !== value) {
        this.notifyListeners(property, oldValue, value);
      }
      return true;
    }
  }

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
  get(target, property, proxy) {
    if (property === isProxySymbol) return true;

    if (property === "$watch") {
      this.proxy = proxy;
      return this.$watch.bind(this);
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
   * @param {string|Function} watchProp - A property path (dot notation) to observe specific changes in the target.
   * @param {ListenerFunction} listenerFn - A function to execute when changes are detected.
   */
  $watch(watchProp, listenerFn) {
    const listener = {
      originalTarget: this.target,
      listenerFn: listenerFn,
    };
    let key;
    if (isFunction(watchProp)) {
      key = getProperty(watchProp);
      this.registerKey(key, listener);
    } else {
      let keys = watchProp.split(".");
      key = keys.pop();
      this.registerKey(key, listener);
    }
  }

  registerKey(key, listener) {
    if (this.listeners.has(key)) {
      this.listeners.get(key).push(listener);
    } else {
      this.listeners.set(key, [listener]);
    }
  }

  /**
   * Invokes all registered listener functions for any watched properties.
   */
  sync() {
    Array.from(this.listeners.values()).forEach((list) =>
      list.forEach(({ listenerFn }) => listenerFn()),
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
  notifyListeners(propertyPath, oldValue, newValue) {
    const listeners = this.listeners.get(propertyPath);

    if (listeners) {
      let index = 0;
      while (index < listeners.length) {
        const { originalTarget, listenerFn } = listeners[index];
        listenerFn(newValue, oldValue ? oldValue : newValue, originalTarget);
        index++;
      }
    }
  }
}

function getProperty(fn) {
  // Initialize an empty array to track the property access path
  let path = [];

  // Create a Proxy to intercept property access
  const handler = {
    get: function (target, prop) {
      // Add the accessed property to the path array
      path.push(prop);
      // Return the proxy again to continue chaining for nested properties
      return new Proxy({}, handler);
    },
  };

  // Execute the function with the Proxy object
  fn(new Proxy({}, handler));

  // Return the path as a string, joined by dots
  return path.pop();
}
