import {
  isUndefined,
  nextUid,
  minErr,
  isObject,
  concat,
} from "../../shared/utils";

/**
 * @type {import('../parser/parse').ParseService}
 */
let $parse;

/**@type {import('../exception-handler').ErrorHandler} */
let $exceptionHandler;

const $rootModelErr = minErr("$rootModel");

/**
 * @typedef {Object} AsyncQueueTask
 * @property {Handler} handler
 * @property {Function} fn
 * @property {Object} locals
 */

export const $postUpdateQueue = [];

/**
 * @type {Function[]}
 */
export const $$applyAsyncQueue = [];

export class RootModelProvider {
  constructor() {
    this.rootModel = createModel();
  }

  $get = [
    "$exceptionHandler",
    "$parse",
    "$browser",
    /**
     * @param {import('../exception-handler').ErrorHandler} exceptionHandler
     * @param {import('../parser/parse').ParseService} parse
     */
    (exceptionHandler, parse) => {
      $exceptionHandler = exceptionHandler;
      $parse = parse;
      return this.rootModel;
    },
  ];
}

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
  } else {
    return target;
  }
}

/**
 * Listener function definition.
 * @typedef {Object} Listener
 * @property {Object} originalTarget - The original target object.
 * @property {ListenerFunction} listenerFn - The function invoked when changes are detected.
 * @property {number} id
 * @property {boolean} oneTime
 * @property {string} property
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
    this.$target = target;

    /** @type {Map<string, Array<Listener>>} */
    this.listeners = context ? context.listeners : new Map();

    /** @type {WeakMap<Object, Array<string>>} */
    this.objectListeners = context ? context.objectListeners : new WeakMap();

    /** @type {?number} */
    this.listenerCache = null;

    /** @type {Proxy} */
    this.proxy = null;

    /**
     * @type {Proxy[]}
     */
    this.children = [];

    /**
     * @type {number} Unique model ID (monotonically increasing) useful for debugging.
     */
    this.id = nextUid();

    /**
     * @type {Handler}
     */
    this.$root = context ? context.$root : this;

    this.$parent = this.$root === this ? null : context;

    /** @type {number} */
    this.$$watchersCount = 0;

    /** @type {AsyncQueueTask[]} */
    this.$$asyncQueue = [];

    /** @type {Map<String, Function[]>} */
    this.$$listeners = new Map();
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
  set(target, property, value, proxy) {
    this.proxy = proxy;
    const oldValue = target[property];
    if (oldValue && oldValue[isProxySymbol]) {
      if (Array.isArray(value)) {
        target[property] = value;
        return true;
      }
      if (isObject(value)) {
        if (Object.prototype.hasOwnProperty.call(target, property)) {
          Object.keys(oldValue)
            .filter((x) => !value[x])
            .forEach((k) => {
              delete oldValue[k];
            });
        }

        target[property] = createModel({}, this);
        setDeepValue(target[property], value);
        return true;
      }

      if (isUndefined(value)) {
        Object.keys(oldValue.$target).forEach((k) => {
          delete oldValue[k];
        });
        return true;
      }
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
          this.scheduleListener(listeners, oldValue, value);
        }
      }

      // Right now this is only for Arrays
      if (this.objectListeners.has(target) && property !== "length") {
        let keys = this.objectListeners.get(target);
        keys.forEach((key) => {
          const listeners = this.listeners.get(key);
          if (listeners) {
            this.scheduleListener(listeners, oldValue, this.$target);
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
   * @param {string|number|symbol} property - The name of the property being accessed.
   * @param {Proxy} proxy - The proxy object being invoked
   * @returns {*} - The value of the property or a method if accessing `watch` or `sync`.
   */
  get(target, property, proxy) {
    this.proxy = proxy;

    if (property === isProxySymbol) return true;
    const propertyMap = {
      $watch: this.$watch.bind(this),
      $watchGroup: this.$watchGroup.bind(this),
      $watchCollection: this.$watchCollection.bind(this),
      $new: this.$new.bind(this),
      $destroy: this.$destroy.bind(this),
      $eval: this.$eval.bind(this),
      $apply: this.$apply.bind(this),
      $evalAsync: this.$evalAsync.bind(this),
      $postUpdate: this.$postUpdate.bind(this),
      $isRoot: this.isRoot.bind(this),
      $target: this.$target,
      $digest: this.$digest.bind(this),
      $on: this.$on.bind(this),
      $emit: this.$emit.bind(this),
      $broadcast: this.$broadcast.bind(this),
      $handler: this,
      $parent: this.$parent,
      $root: this.$root,
      $$watchersCount: this.$$watchersCount,
      $children: this.children,
      id: this.id,
    };

    return Object.prototype.hasOwnProperty.call(propertyMap, property)
      ? propertyMap[property]
      : target[property];
  }

  /**
   * @private
   * @param {Listener[]} listeners
   * @param {*} oldValue
   * @param {*} newValue
   */
  scheduleListener(listeners, oldValue, newValue) {
    Promise.resolve().then(() => {
      let index = 0;
      while (index < listeners.length) {
        const listener = listeners[index];
        this.notifyListener(listener, oldValue, newValue);
        if (
          listener.oneTime &&
          this.deregisterKey(listener.property, listener.id)
        ) {
          this.incrementWatchersCount(-1);
        }
        index++;
      }
    });
  }

  deleteProperty(target, property) {
    var oldValue = structuredClone(target);
    delete target[property];
    if (this.objectListeners.has(target)) {
      let keys = this.objectListeners.get(target);
      keys.forEach((key) => {
        const listeners = this.listeners.get(key);
        if (listeners) {
          this.scheduleListener(
            listeners,
            oldValue,
            Array.isArray(this.$target) ? this.$target : undefined,
          );
        }
      });
    } else {
      const listeners = this.listeners.get(property);
      if (listeners) {
        this.scheduleListener(listeners, target[property], this);
      }
    }
    return true;
  }

  /**
   * Registers a watcher for a property along with a listener function. The listener
   * function is invoked when changes to that property are detected.
   *
   * @param {((any) => any)} watchProp - A property path (dot notation) to observe specific changes in the target.
   * @param {ListenerFunction} listenerFn - A function to execute when changes are detected.
   */
  $watch(watchProp, listenerFn) {
    const get = $parse(watchProp);
    if (get.constant) {
      Promise.resolve().then(listenerFn(this.$target));
      return () => {};
    }

    /** @type {string} */
    let key = getProperty(get);

    /** @type {Listener} */
    const listener = {
      originalTarget: this.$target,
      listenerFn: listenerFn,
      id: nextUid(),
      oneTime: get.oneTime,
      property: key,
    };

    this.registerKey(key, listener);
    let watchedValue = get(this.$target);
    const value =
      watchedValue && watchedValue[isProxySymbol]
        ? watchedValue.$target
        : watchedValue;

    const isArray = Array.isArray(value);
    const isObject =
      Object.prototype.toString.call(value) === "[object Object]";
    if (isArray || isObject) {
      if (this.objectListeners.has(value)) {
        this.objectListeners.get(value).push(key);
      } else {
        this.objectListeners.set(value, [key]);
      }
    }

    this.incrementWatchersCount(1);

    return () => {
      const res = this.deregisterKey(key, listener.id);
      if (res) {
        this.incrementWatchersCount(-1);
      }
    };
  }

  $watchGroup(watchArray, listenerFn) {
    watchArray.forEach((x) => this.$watch(x, listenerFn));
  }

  $watchCollection() {}

  $new(isIsolated = false, parent) {
    let child;
    if (isIsolated) {
      child = Object.create(null);
    } else {
      child = Object.create(this.$target);
      child.$$watchersCount = 0;
      child.$parent = parent ? parent.$handler : this.$parent;
    }

    const proxy = new Proxy(child, new Handler(child, parent || this));
    this.children.push(proxy);
    return proxy;
  }

  registerKey(key, listener) {
    if (this.listeners.has(key)) {
      this.listeners.get(key).push(listener);
    } else {
      this.listeners.set(key, [listener]);
    }
  }

  deregisterKey(key, id) {
    const listenerList = this.listeners.get(key);
    if (!listenerList) return false;

    const index = listenerList.findIndex((x) => x.id === id);
    if (index === -1) return false;

    listenerList.splice(index, 1);
    if (listenerList.length) {
      this.listeners.set(key, listenerList);
    } else {
      this.listeners.delete(key);
    }
    return true;
  }

  /**
   * @deprecated
   */
  $digest() {
    throw new Error("$Digest is deprecated");
  }

  $eval(expr, locals) {
    return $parse(expr)(this.$target, locals);
  }

  async $evalAsync(expr, locals) {
    return this.$eval(expr, locals);
  }

  $apply(expr) {
    try {
      return $parse(expr)(this.proxy);
    } catch (e) {
      $exceptionHandler(e);
    }
  }

  $on(name, listener) {
    let namedListeners = this.$$listeners.get(name);
    if (!namedListeners) {
      namedListeners = [];
      this.$$listeners.set(name, namedListeners);
    }
    namedListeners.push(listener);

    return () => {
      const indexOfListener = namedListeners.indexOf(listener);
      if (indexOfListener !== -1) {
        namedListeners.splice(indexOfListener, 1);
        if (namedListeners.length == 0) {
          this.$$listeners.delete(name);
        }
      }
    };
  }

  $emit(name, ...args) {
    this.eventHelper({ name: name, scope: undefined }, args);
  }

  $broadcast(name, ...args) {
    this.eventHelper({ name: name, scope: undefined }, args);
  }

  eventHelper({ name, scope }, ...args) {
    if (!this.$$listeners.has(name)) {
      return;
    }
    let stopPropagation = false;
    const event = {
      name,
      targetScope: scope || this,
      currentScope: this,
      stopPropagation() {
        stopPropagation = true;
      },
      preventDefault() {
        event.defaultPrevented = true;
      },
      defaultPrevented: false,
    };
    const listenerArgs = concat([event], [event].concat(args), 1);
    let listeners = this.$$listeners.get(name);
    listeners.forEach((cb) => {
      try {
        cb.apply(null, listenerArgs);
      } catch (e) {
        $exceptionHandler(e);
      }
    });

    // if any listener on the current scope stops propagation, prevent bubbling
    if (stopPropagation) {
      return;
    }

    this.$parent?.eventHelper({ name: name, scope: this }, args);
  }

  /**
   * @private
   * @returns {boolean}
   */
  isRoot() {
    return this.$root == this;
  }

  async $applyAsync(expr) {
    try {
      const result = $parse(expr)(this.proxy);
      return result;
    } catch (error) {
      $exceptionHandler(error);
      throw error;
    }
  }

  /**
   * @private
   */
  retry() {
    try {
      this.$root.$digest();
    } catch (e) {
      $exceptionHandler(e);
      throw e;
    }
  }

  $postUpdate(fn) {
    $postUpdateQueue.push(fn);
  }

  $destroy() {
    this.incrementWatchersCount(-this.$$watchersCount);
  }

  /**
   * @param {number} count
   */
  incrementWatchersCount(count) {
    this.$$watchersCount += count;
    if (this.$parent) {
      this.$parent.incrementWatchersCount(count);
    }
  }

  /**
   * Invokes the registered listener function with watched property changes.
   *
   * @param {Listener} listener - The property path that was changed.
   * @param {*} oldValue - The old value of the property.
   * @param {*} newValue - The new value of the property.
   */
  notifyListener(listener, oldValue, newValue) {
    const { originalTarget, listenerFn } = listener;
    try {
      listenerFn(newValue, oldValue, originalTarget);
      this.$$asyncQueue.forEach((x) => {
        if (x.handler.id == this.id) {
          Promise.resolve().then(x.fn(x.handler, x.locals));
        }
      });
    } catch (e) {
      $exceptionHandler(e);
    }
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

function setDeepValue(model, obj) {
  for (const key in obj) {
    if (isObject(obj[key]) && !Array.isArray(obj[key])) {
      if (!isObject(model[key])) {
        model[key] = {};
      }
      setDeepValue(model[key], obj[key]);
    } else {
      model[key] = obj[key];
    }
  }
}
