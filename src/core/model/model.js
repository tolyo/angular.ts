import { isUndefined, nextUid, minErr } from "../../shared/utils";

/**
 * @type {import('../parser/parse').ParseService}
 */
let $parse;

/** @type {import('../../services/browser').Browser} */
let $browser;

/**@type {import('../exception-handler').ErrorHandler} */
let $exceptionHandler;

const $rootModelErr = minErr("$rootModel");

/**
 * @typedef {Object} AsyncQueueTask
 * @property {Handler} handler
 * @property {Function} fn
 * @property {Object} locals
 */

export const $$postDigestQueue = [];

/**
 * @type {Function[]}
 */
export const $$applyAsyncQueue = [];
let applyAsyncId = null;

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
     * @param {import('../../services/browser').Browser} browser
     */
    (exceptionHandler, parse, browser) => {
      $exceptionHandler = exceptionHandler;
      $parse = parse;
      $browser = browser;
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

    /**
     * @type {Handler}
     */
    this.$root = context ? context.$root : this;

    this.$parent = this.$root === this ? null : context;

    /** @type {number} */
    this.$$watchersCount = 0;

    /** @type {AsyncQueueTask[]} */
    this.$$asyncQueue = [];
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
          debugger;
          this.scheduleListener(listeners, oldValue, value);
        }
      }
      // Right now this is only for Arrays
      if (this.objectListeners.has(target) && property !== "length") {
        let keys = this.objectListeners.get(target);
        keys.forEach((key) => {
          const listeners = this.listeners.get(key);
          if (listeners) {
            this.scheduleListener(listeners, oldValue, this.target);
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
      $new: this.$new.bind(this),
      $destroy: this.$destroy.bind(this),
      $eval: this.$eval.bind(this),
      $apply: this.$apply.bind(this),
      $evalAsync: this.$evalAsync.bind(this),
      $$postDigest: this.$$postDigest.bind(this),
      $target: this.$target(),
      $digest: this.$digest.bind(this),
      $handler: this,
      $id: this.$id,
      $parent: this.$parent,
      $root: this.$root,
      $$watchersCount: this.$$watchersCount,
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
            Array.isArray(this.target) ? this.target : undefined,
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
   * @param {((any) => any)} watchProp - A property path (dot notation) to observe specific changes in the target.
   * @param {ListenerFunction} listenerFn - A function to execute when changes are detected.
   */
  $watch(watchProp, listenerFn) {
    const get = $parse(watchProp);
    if (get.constant) {
      Promise.resolve().then(listenerFn(this.target));
      return () => {};
    }

    /** @type {string} */
    let key = getProperty(get);

    /** @type {Listener} */
    const listener = {
      originalTarget: this.target,
      listenerFn: listenerFn,
      id: nextUid(),
      oneTime: get.oneTime,
      property: key,
    };

    this.registerKey(key, listener);
    let watchedValue = get(this.target);
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

  $watchGroup(obj, listenerFn) {}

  $new(isIsolated = false, parent) {
    let child;
    if (isIsolated) {
      child = Object.create(null);
    } else {
      child = Object.create(this.target);
      child.$$watchersCount = 0;
      child.$parent = parent ? parent.$handler : this.$parent;
    }
    const proxy = new Proxy(child, new Handler(child, parent || this));
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
   * Invokes all registered listener functions for any watched properties.
   */
  $digest() {
    this.listeners.forEach((listenerList) => {
      let index = 0;
      while (index < listenerList.length) {
        const { listenerFn } = listenerList[index];
        listenerFn(this.$target);
        index++;
      }
    });

    while (this.$$asyncQueue.length) {
      const x = this.$$asyncQueue.shift();
      x.fn(x.handler, x.locals);
    }
  }

  $eval(expr, locals) {
    return $parse(expr)(this.target, locals);
  }

  $evalAsync(expr, locals) {
    // if we are outside of an $digest loop and this is the first time we are scheduling async
    // task also schedule async auto-flush
    // let id;
    // if (!$$asyncQueue.length) {
    //   id = $browser.defer(
    //     () => {
    //       if ($$asyncQueue.length) {
    //         this.$root.$digest();
    //       }
    //     },
    //     null,
    //     "$evalAsync",
    //   );
    // }

    this.$$asyncQueue.push({
      handler: this,
      fn: $parse(expr),
      locals,
    });

    //return id;
  }

  $apply(expr) {
    try {
      return this.$eval(expr);
    } catch (e) {
      $exceptionHandler(e);
    } finally {
      this.retry();
    }
  }

  $applyAsync(expr) {
    const scope = this;
    if (expr) {
      $$applyAsyncQueue.push(() => scope.$eval(expr));
    }
    // TODO: investigate
    //expr = $parse(expr);

    if (applyAsyncId === null) {
      applyAsyncId = $browser.defer(flushApplyAsync, null, "$applyAsync");
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

  $$postDigest(fn) {
    $$postDigestQueue.push(fn);
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
        if (x.handler.$id == this.$id) {
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

function flushApplyAsync() {
  while ($$applyAsyncQueue.length) {
    try {
      $$applyAsyncQueue.shift()();
    } catch (e) {
      $exceptionHandler(e);
    }
  }
  applyAsyncId = null;
}
