import {
  isUndefined,
  nextUid,
  isObject,
  concat,
  isFunction,
  assert,
  isString,
} from "../../shared/utils.js";
import { ASTType } from "../parse/ast-type.js";

/**
 * @type {import('../parse/parse.js').ParseService}
 */
let $parse;

/**@type {import('../exception-handler').ErrorHandler} */
let $exceptionHandler;

/**
 * @typedef {Object} AsyncQueueTask
 * @property {Model} handler
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
     * @param {import('../parse/parse.js').ParseService} parse
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
 * @param {Model} [context] - The context for the handler, used to track listeners.
 * @returns {ProxyHandler<Object>} - A proxy that intercepts operations on the target object,
 *                                     or the original value if the target is not an object.
 */
export function createModel(target = {}, context) {
  if (typeof target === "object" && target !== null) {
    for (const key in target) {
      if (Object.prototype.hasOwnProperty.call(target, key)) {
        target[key] = createModel(target[key], new Model(target, context));
      }
    }
    return new Proxy(target, new Model(target, context));
  } else {
    return target;
  }
}

/**
 * Listener function definition.
 * @typedef {Object} Listener
 * @property {Object} originalTarget - The original target object.
 * @property {ListenerFunction} listenerFn - The function invoked when changes are detected.
 * @property {import("../parse/parse.js").CompiledExpression} watchFn
 * @property {number} id
 * @property {boolean} oneTime
 * @property {string} property
 * @property {Object} [context] - The optional context in which a property exists
 * @property {Proxy} [foreignListener]
 */

/**
 * Listener function type.
 * @callback ListenerFunction
 * @param {*} newValue - The new value of the changed property.
 * @param {*} oldValue - The old value of the changed property.
 * @param {Object} originalTarget - The original target object.
 */

export const isProxySymbol = Symbol("isProxy");

/**
 * @enum {number}
 */
export const ModelPhase = {
  NONE: 0,
  WATCH: 1,
  DIGEST: 2,
};

/**
 * Model class for the Proxy. It intercepts operations like property access (get)
 * and property setting (set), and adds support for deep change tracking and
 * observer-like behavior.
 */
class Model {
  /**
   * Initializes the handler with the target object and a context.
   *
   * @param {Object} target - The target object being proxied.
   * @param {Model} [context] - The context containing listeners.
   */
  constructor(target, context) {
    /** @type {Object} */
    this.$target = target;

    this.context = context
      ? context.context
        ? context.context
        : context
      : undefined;

    /** @type {Map<string, Array<Listener>>} Watch listeners */
    this.listeners = context ? context.listeners : new Map();

    /** @type {Map<string, Array<Listener>>} Watch listeners from other proxies */
    this.foreignListeners = context ? context.foreignListeners : new Map();

    /** @type {WeakMap<Object, Array<string>>} */
    this.objectListeners = context ? context.objectListeners : new WeakMap();

    /** @type {Map<Function, {oldValue: any, fn: Function}>} */
    this.functionListeners = context ? context.functionListeners : new Map();

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
     * @type {Model}
     */
    this.$root = context ? context.$root : this;

    this.$parent = this.$root === this ? null : context;

    /** @type {number} */
    this.$$watchersCount = 0;

    /** @type {AsyncQueueTask[]} */
    this.$$asyncQueue = [];

    /** @type {Map<String, Function[]>} Event listeners */
    this.$$listeners = new Map();

    this.filters = [];

    /** @type {ModelPhase} */
    this.state = ModelPhase.NONE;

    this.$wrapperProxy = undefined;
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
        if (oldValue !== value) {
          const listeners = this.listeners.get(property);

          if (listeners) {
            this.scheduleListener(listeners, oldValue);
          }

          const foreignListeners = this.foreignListeners.get(property);

          if (foreignListeners) {
            this.scheduleListener(foreignListeners, oldValue);
          }
        }
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

        if (oldValue !== value) {
          const listeners = this.listeners.get(property);

          if (listeners) {
            this.scheduleListener(listeners, oldValue);
          }

          const foreignListeners = this.foreignListeners.get(property);

          if (foreignListeners) {
            this.scheduleListener(foreignListeners, oldValue);
          }
        }
        target[property] = createModel({}, this);
        setDeepValue(target[property], value);
        return true;
      }

      if (isUndefined(value)) {
        Object.keys(oldValue.$target).forEach((k) => {
          delete oldValue[k];
        });
        target[property] = undefined;
        const listeners = this.listeners.get(property);

        if (listeners) {
          this.scheduleListener(listeners, oldValue);
        }
        return true;
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
        let listeners = this.listeners.get(property);

        if (listeners) {
          assert(listeners.length !== 0);

          if (
            isUndefined(oldValue) &&
            isObject(target[property]) &&
            target[property][isProxySymbol]
          ) {
            target[property].$handler.$wrapperProxy = this.proxy;
          }

          // primitive only

          let isValue =
            Number.isNaN(value) ||
            listeners[0].watchFn(this.context?.$target) == value ||
            (() => {
              const res = listeners[0].watchFn(this.$target);
              if (res && res[isProxySymbol]) {
                return res.$target == value;
              } else {
                return res == value;
              }
            })();

          if (isValue) {
            this.scheduleListener(listeners, oldValue);
          }
        }

        if (this.$wrapperProxy) {
          listeners = [];
          Object.keys(this.$wrapperProxy.$target).forEach((v) => {
            this.listeners.get(v).forEach((i) => {
              listeners.push(i);
            });
          });
          const oldObject = Object.create(null);
          oldObject[property] = oldValue;
          this.scheduleListener(listeners, oldObject);
        }

        const foreignListeners = this.foreignListeners.get(property);

        if (foreignListeners) {
          assert(foreignListeners.length !== 0);
          // primitive only

          // let isValue =
          //   Number.isNaN(value) ||
          //   foreignListeners[0].watchFn(this.context?.$target) == value ||
          //   (() => {
          //     const res = foreignListeners[0].watchFn(this.$target);
          //     if (res && res[isProxySymbol]) {
          //       return res.$target == value;
          //     } else {
          //       return res == value;
          //     }
          //   })();

          // if (isValue) {
          this.scheduleListener(foreignListeners, oldValue);
          //}
        }
      }

      // Right now this is only for Arrays
      if (this.objectListeners.has(target) && property !== "length") {
        let keys = this.objectListeners.get(target);
        keys.forEach((key) => {
          const listeners = this.listeners.get(key);
          if (listeners) {
            this.scheduleListener(listeners, oldValue);
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
      $newIsolate: this.$newIsolate.bind(this),
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
      $transcluded: this.$transcluded.bind(this),
      $handler: this,
      $parent: this.$parent,
      $root: this.$root,
      $$watchersCount: this.$$watchersCount,
      $wrapperProxy: this.$wrapperProxy,
      $children: this.children,
      id: this.id,
      state: this.state,
      registerForeignKey: this.registerForeignKey.bind(this),
      notifyListener: this.notifyListener.bind(this),
    };

    return Object.prototype.hasOwnProperty.call(propertyMap, property)
      ? propertyMap[property]
      : target[property];
  }

  /**
   * @private
   * @param {Listener[]} listeners
   * @param {*} oldValue
   */
  scheduleListener(listeners, oldValue) {
    Promise.resolve().then(() => {
      let index = 0;
      while (index < listeners.length) {
        const listener = listeners[index];
        if (listener.foreignListener) {
          listener.foreignListener.notifyListener(
            listener,
            oldValue,
            this.$target,
          );
        } else {
          this.notifyListener(listener, oldValue, this.$target);
        }

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
    // Currently deletes $model
    if (target[property] && target[property][isProxySymbol]) {
      delete target[property];
      return true;
    }

    var oldValue = structuredClone(target);
    delete target[property];
    if (this.objectListeners.has(target)) {
      let keys = this.objectListeners.get(target);
      keys.forEach((key) => {
        const listeners = this.listeners.get(key);
        if (listeners) {
          this.scheduleListener(listeners, oldValue);
        }
      });
    } else {
      const listeners = this.listeners.get(property);
      if (listeners) {
        this.scheduleListener(listeners, target[property]);
      }
    }

    return true;
  }

  /**
   * Registers a watcher for a property along with a listener function. The listener
   * function is invoked when changes to that property are detected.
   *
   * @param {string} watchProp - An expression to be watched in the context of this model.
   * @param {ListenerFunction} [listenerFn] - A function to execute when changes are detected on watched context.
   */
  $watch(watchProp, listenerFn) {
    assert(isString(watchProp), "Watched property required");
    this.state = ModelPhase.WATCH;

    const get = $parse(watchProp);

    // Constant are immediately passed to listener function
    if (get.constant) {
      if (listenerFn) {
        Promise.resolve().then(() => {
          let res = get();
          while (isFunction(res)) {
            res = res();
          }
          listenerFn(res, undefined, this.$target);
        });
      }
      return () => {};
    }

    /** @type {Listener} */
    const listener = {
      originalTarget: this.$target,
      listenerFn: listenerFn,
      watchFn: get,
      id: nextUid(),
      oneTime: get.oneTime,
      property: undefined,
    };

    // simplest case
    let key = get.decoratedNode.body[0].expression.name;

    let type = get.decoratedNode.body[0].expression.type;
    switch (type) {
      // 1
      case ASTType.Program: {
        throw new Error("Unsupported type " + type);
      }

      // 2
      case ASTType.ExpressionStatement: {
        throw new Error("Unsupported type " + type);
      }
      // 3
      case ASTType.AssignmentExpression:
        // assignment calls without listener functions
        if (!listenerFn) {
          let res = get(this.$target);
          while (isFunction(res)) {
            res = res(this.$target);
          }
          Promise.resolve().then(res);
          return () => {};
        }
        break;
      // 4
      case ASTType.ConditionalExpression: {
        throw new Error("Unsupported type " + type);
      }
      // 5
      case ASTType.LogicalExpression: {
        throw new Error("Unsupported type " + type);
      }
      // 6
      case ASTType.BinaryExpression: {
        throw new Error("Unsupported type " + type);
      }

      // 7
      case ASTType.UnaryExpression: {
        throw new Error("Unsupported type " + type);
      }

      // function
      case ASTType.CallExpression: {
        listener.property = get.decoratedNode.body[0].callee.name;
        break;
      }

      case ASTType.MemberExpression: {
        listener.property = get.decoratedNode.body[0].expression.property.name;
        const name = extractTarget(get.decoratedNode.body[0].expression.object);
        key = get.decoratedNode.body[0].expression.property.name;
        if (this.$target[name]) {
          listener.context = () => {
            return this.$target[name].$target;
          };
        }
        break;
      }

      // 10
      case ASTType.Identifier: {
        listener.property = get.decoratedNode.body[0].expression.name;
        break;
      }

      // 11
      case ASTType.Literal: {
        throw new Error("Unsupported type " + type);
      }

      // 12
      case ASTType.ArrayExpression: {
        throw new Error("Unsupported type " + type);
      }

      // 13
      case ASTType.Property: {
        throw new Error("Unsupported type " + type);
      }

      // 14
      case ASTType.ObjectExpression: {
        throw new Error("Unsupported type " + type);
      }

      // 15
      case ASTType.ThisExpression: {
        throw new Error("Unsupported type " + type);
      }

      // 16
      case ASTType.LocalsExpression: {
        throw new Error("Unsupported type " + type);
      }

      // 17
      case ASTType.NGValueParameter: {
        throw new Error("Unsupported type " + type);
      }
    }
    if (
      listener.context &&
      listener.context() &&
      listener.context()[isProxySymbol]
    ) {
      listener.foreignListener = this.proxy;
      listener.context().$handler.registerForeignKey(key, listener);
    } else {
      this.registerKey(key, listener);
    }

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
    this.state = ModelPhase.NONE;
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

  $watchCollection(watchProp, listenerFn) {
    return this.$watch(watchProp, listenerFn);
  }

  $new(childInstance) {
    let child;
    if (childInstance) {
      if (Object.getPrototypeOf(childInstance) === Object.prototype) {
        Object.setPrototypeOf(childInstance, this.$target);
      } else {
        Object.setPrototypeOf(
          Object.getPrototypeOf(childInstance),
          this.$target,
        );
      }

      child = childInstance;
    } else {
      child = Object.create(this.$target);
      child.$$watchersCount = 0;
      child.$parent = this.$parent;
    }

    const proxy = new Proxy(child, new Model(child, this));
    this.children.push(proxy);
    return proxy;
  }

  $newIsolate(instance) {
    let child = instance ? Object.create(instance) : Object.create(null);
    child.$root = this.$root;
    const proxy = new Proxy(child, new Model(child, this));
    this.children.push(proxy);
    return proxy;
  }

  $transcluded(parentInstance) {
    let child = Object.create(this.$target);
    child.$$watchersCount = 0;
    child.$parent = parentInstance;
    const proxy = new Proxy(child, new Model(child, this));
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

  registerForeignKey(key, listener) {
    if (this.foreignListeners.has(key)) {
      this.foreignListeners.get(key).push(listener);
    } else {
      this.foreignListeners.set(key, [listener]);
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

  deregisterForeignKey(key, id) {
    const listenerList = this.foreignListeners.get(key);
    if (!listenerList) return false;

    const index = listenerList.findIndex((x) => x.id === id);
    if (index === -1) return false;

    listenerList.splice(index, 1);
    if (listenerList.length) {
      this.foreignListeners.set(key, listenerList);
    } else {
      this.foreignListeners.delete(key);
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
    const fn = $parse(expr);
    const res = fn(this.$target, locals);

    if (isUndefined(res) || res === null) {
      return res;
    }

    if (res["name"] === Object.hasOwnProperty["name"]) {
      return res;
    }
    if (isFunction(res)) {
      return res();
    }

    if (Number.isNaN(res)) {
      return 0;
    }

    return res;
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

  /**
   * @param {string} name
   * @param  {...any} args
   * @returns
   */
  $emit(name, ...args) {
    return this.eventHelper(
      { name: name, event: undefined, broadcast: false },
      ...args,
    );
  }

  /**
   * @param {string} name
   * @param  {...any} args
   * @returns
   */
  $broadcast(name, ...args) {
    return this.eventHelper(
      { name: name, event: undefined, broadcast: true },
      ...args,
    );
  }

  eventHelper({ name, event, broadcast }, ...args) {
    if (!broadcast) {
      if (!this.$$listeners.has(name)) {
        return;
      }
    }
    if (event) {
      event.currentScope = this.$target;
    } else {
      event = event || {
        name,
        targetScope: this.$target,
        currentScope: this.$target,
        stopped: false,
        stopPropagation() {
          event.stopped = true;
        },
        preventDefault() {
          event.defaultPrevented = true;
        },
        defaultPrevented: false,
      };
    }

    const listenerArgs = concat([event], [event].concat(args), 1);
    let listeners = this.$$listeners.get(name);
    if (listeners) {
      let length = listeners.length;
      for (let i = 0; i < length; i++) {
        try {
          let cb = listeners[i];
          cb.apply(null, listenerArgs);
          if (listeners.length !== length) {
            if (listeners.length < length) {
              i--;
            }
            length = listeners.length;
          }
        } catch (e) {
          $exceptionHandler(e);
        }
      }
    }

    event.currentScope = null;

    if (event.stopped) {
      return event;
    }

    if (broadcast) {
      if (this.children.length > 0) {
        this.children.forEach((child) => {
          event = child["$handler"].eventHelper(
            { name: name, event: event, broadcast: broadcast },
            ...args,
          );
        });
      }
      return event;
    } else {
      if (this.$parent) {
        return this.$parent?.eventHelper(
          { name: name, event: event, broadcast: broadcast },
          ...args,
        );
      } else {
        return event;
      }
    }
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
   */
  notifyListener(listener, oldValue, target) {
    const { originalTarget, listenerFn, watchFn } = listener;
    try {
      const newVal = watchFn(target) || watchFn(listener.originalTarget);
      //const res  = watchFn(listener.originalTarget.$target).$target
      listenerFn(newVal, oldValue, originalTarget);
      // if (oneTime) {
      //   this.deregisterKey(property, id)
      // }

      this.$$asyncQueue.forEach((x) => {
        if (x.handler.id == this.id) {
          Promise.resolve().then(x.fn(x.handler, x.locals));
        }
      });

      while ($postUpdateQueue.length) {
        $postUpdateQueue.shift()();
      }
    } catch (e) {
      $exceptionHandler(e);
    }
  }
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

function extractTarget(object) {
  if (!object.name) {
    return extractTarget(object.object);
  } else {
    return object.name;
  }
}

// function deProxy(maybeProxy) {
//   if (maybeProxy[isProxySymbol]) {
//     return deProxy(maybeProxy);
//   } else {
//     return maybeProxy.$target;
//   }
// }
