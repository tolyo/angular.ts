import { isUndefined, nextUid } from "../../shared/utils";

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
    const proxy = new Proxy(target, new Handler(target, context));
    return proxy;
  } else {
    return target;
  }
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

    /** @type {WeakMap<Object, Array<string>>} */
    this.objectListeners = context ? context.objectListeners : new WeakMap();

    /** @type {?number} */
    this.listenerCache = null;

    /** @type {Proxy} */
    this.proxy = null;

    /**
     * @type {number} Unique model ID (monotonically increasing) useful for debugging.
     */
    this.$id = nextUid();
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
        const keys = Object.keys(value);
        Object.keys(oldValue.$target).forEach((k) => {
          if (!keys.includes(k)) {
            delete oldValue[k];
          }
        });

        keys.forEach((key) => {
          oldValue[key] = value[key];
        });
      }

      if (isUndefined(value)) {
        Object.keys(oldValue.$target).forEach((k) => {
          delete oldValue[k];
        });
      }

      return true;
    } else {
      if (
        oldValue !== undefined &&
        Number.isNaN(oldValue) &&
        Number.isNaN(value)
      ) {
        return true;
      }

      target[property] = createModel(value, this);
      if (oldValue !== value) {
        const listeners = this.listeners.get(property);

        if (listeners) {
          listeners.forEach((listener) =>
            Promise.resolve().then(() =>
              this.notifyListeners(listener, oldValue, value),
            ),
          );
        }
      }
      // Right now this is only for Arrays
      if (this.objectListeners.has(target) && property !== "length") {
        let keys = this.objectListeners.get(target);
        keys.forEach((key) => {
          const listeners = this.listeners.get(key);
          if (listeners) {
            listeners.forEach((listener) => {
              Promise.resolve().then(() =>
                this.notifyListeners(listener, oldValue, this.target),
              );
            });
          }
        });
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

    if (property === "$new") {
      return this.$new.bind(this);
    }

    if (property === "$target") {
      return this.$target();
    }

    if (property === "$digest") {
      return this.$digest.bind(this);
    }

    if (property === "$id") {
      return this.$id;
    }

    return target[property];
  }

  deleteProperty(target, property) {
    var oldValue = structuredClone(target);
    delete target[property];
    if (this.objectListeners.has(target)) {
      let keys = this.objectListeners.get(target);
      keys.forEach((key) => {
        const listeners = this.listeners.get(key);
        if (listeners) {
          listeners.forEach((listener) =>
            Promise.resolve().then(() => {
              this.notifyListeners(
                listener,
                oldValue,
                Array.isArray(this.target) ? this.target : undefined,
              );
            }),
          );
        }
      });
    }

    const listeners = this.listeners.get(property);
    if (listeners) {
      listeners.forEach((listener) =>
        Promise.resolve().then(() =>
          this.notifyListeners(listener, target[property], this),
        ),
      );
    }
    return true;
  }

  /**
   * Returns the underlying object being wrapped by the Proxy
   * @returns {any}
   */
  $target() {
    return this.target;
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
    let key = getProperty(watchProp);

    this.registerKey(key, listener);
    let watchedValue = watchProp(this.target);
    const value =
      watchedValue && watchedValue[isProxySymbol]
        ? watchedValue.$target
        : watchedValue;
    const isArray = Array.isArray(value);
    if (isArray) {
      if (this.objectListeners.has(value)) {
        this.objectListeners.get(value).push(key);
      } else {
        this.objectListeners.set(value, [key]);
      }
    }
  }

  $new() {
    let child = Object.create(this.target);
    return new Proxy(child, new Handler(child, this));
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
  $digest() {
    Array.from(this.listeners.values()).forEach((list) =>
      list.forEach(({ listenerFn }) => listenerFn(this.$target)),
    );
  }

  /**
   * Invokes the registered listener function when a watched property changes.
   *
   * @param {Listener} listener - The property path that was changed.
   * @param {*} oldValue - The old value of the property.
   * @param {*} newValue - The new value of the property.
   */
  notifyListeners(listener, oldValue, newValue) {
    const { originalTarget, listenerFn } = listener;
    listenerFn(newValue, oldValue, originalTarget);
  }
}

function getProperty(fn) {
  const path = [];
  const handler = {
    get(_, prop) {
      path.push(prop);
      return new Proxy({}, handler);
    },
  };

  fn(new Proxy({}, handler));
  return path.pop();
}
