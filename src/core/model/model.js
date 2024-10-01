/**
 * Creates a deep proxy for the target object, intercepting property changes
 * and recursively applying proxies to nested objects.
 *
 * @param {Object} target - The object to be wrapped in a proxy.
 * @returns {Proxy|Object} - A proxy that intercepts operations on the target object,
 *                           or the original value if the target is not an object.
 */
export function createModel(target = {}) {
  if (typeof target === "object" && target !== null) {
    for (let key in target) {
      if (Object.prototype.hasOwnProperty.call(target, key)) {
        target[key] = createModel(target[key], new Handler());
      }
    }
    return new Proxy(target, new Handler());
  }
  return target; // Return non-object types as is
}

/**
 * Handler class for the Proxy. It intercepts operations like property access (get)
 * and property setting (set) and adds support for deep change tracking and
 * observer-like behavior.
 */
class Handler {
  /**
   * Initializes the handler with an empty Map for storing listener functions.
   */
  constructor() {
    this.listeners = new Map();
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
    // Notify listeners only if the value has changed
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
   * Registers a watcher for property along with a listener function. The listener
   * function is invoked when changes are detected.
   *
   * @param {string} watchProp - A proper to observe specific changes in the target.
   * @param {Function} listenerFn - A function to execute when changes are detected.
   */
  watch(watchProp, listenerFn) {
    this.listeners.set(watchProp, listenerFn);
  }

  /**
   * Invokes all registered listener functions.
   */
  sync() {
    Array.from(this.listeners.values()).forEach((fn) => fn());
  }

  /**
   * Invokes the registered listener function when a watched value changes.
   *
   * @param {string} target - The target object being modified
   * @param {string} propertyPath - The property path that was changed.
   * @param {*} oldValue - The old value of the property.
   * @param {*} newValue - The new value of the property.
   */
  notifyListeners(target, propertyPath, oldValue, newValue) {
    const listenerFn = this.listeners.get(propertyPath);
    if (listenerFn) {
      listenerFn(newValue, oldValue, target); // Call the listener function
    }
  }
}
