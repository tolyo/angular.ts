import { val } from "../../shared/hof.js";
import {
  isUndefined,
  nextUid,
  isObject,
  concat,
  isFunction,
  assert,
  isString,
  isDefined,
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
  if (target === null) {
    return null;
  }
  if (typeof target === "object") {
    const proxy = new Proxy(target, context || new Model());
    for (const key in target) {
      if (Object.prototype.hasOwnProperty.call(target, key)) {
        target[key] = createModel(target[key], proxy.$handler);
      }
    }
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
 * @property {import("../parse/parse.js").CompiledExpression} watchFn
 * @property {number} id - Deregistration id
 * @property {number} scopeId - The scope that created the Listener
 * @property {boolean} oneTime
 * @property {string} property
 * @property {string} [watchProp] - The original property to watch if different from observed key
 * @property {Proxy} [foreignListener]
 *
 */

/**
 * Listener function type.
 * @callback ListenerFunction
 * @param {*} newValue - The new value of the changed property.
 * @param {Object} originalTarget - The original target object.
 */

export const isProxySymbol = Symbol("isProxy");

/**
 * Model class for the Proxy. It intercepts operations like property access (get)
 * and property setting (set), and adds support for deep change tracking and
 * observer-like behavior.
 */
class Model {
  /**
   * Initializes the handler with the target object and a context.
   *
   * @param {Model} [context] - The context containing listeners.
   */
  constructor(context) {
    this.context = context
      ? context.context
        ? context.context
        : context
      : undefined;

    /** @type {Map<string, Array<Listener>>} Watch listeners */
    this.watchers = context ? context.watchers : new Map();

    /** @type {Map<String, Function[]>} Event listeners */
    this.$$listeners = new Map();

    /** @type {Map<string, Array<Listener>>} Watch listeners from other proxies */
    this.foreignListeners = context ? context.foreignListeners : new Map();

    /** @type {Set<ProxyConstructor>} */
    this.foreignProxies = context ? context.foreignProxies : new Set();

    /** @type {WeakMap<Object, Array<string>>} */
    this.objectListeners = context ? context.objectListeners : new WeakMap();

    /** @type {Map<Function, {oldValue: any, fn: Function}>} */
    this.functionListeners = context ? context.functionListeners : new Map();

    /** Current proxy being operated on */
    this.$proxy = null;

    /** @type {*} Current target begin called on */
    this.$target = null;

    /** @type {*} Value wrapped by the proxy */
    this.$value = null;

    /**
     * @type {Model[]}
     */
    this.$children = [];

    /**
     * @type {number} Unique model ID (monotonically increasing) useful for debugging.
     */
    this.id = nextUid();

    /**
     * @type {Model}
     */
    this.$root = context ? context.$root : this;

    this.$parent = this.$root === this ? null : context;

    /** @type {AsyncQueueTask[]} */
    this.$$asyncQueue = [];

    this.filters = [];

    this.$wrapperProxy = undefined;

    /** @type {boolean} */
    this.$$destroyed = false;
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
    this.$proxy = proxy;
    this.$target = target;
    const oldValue = target[property];

    // Handle NaNs
    if (
      oldValue !== undefined &&
      Number.isNaN(oldValue) &&
      Number.isNaN(value)
    ) {
      return true;
    }
    if (oldValue && oldValue[isProxySymbol]) {
      if (Array.isArray(value)) {
        if (oldValue !== value) {
          const listeners = this.watchers.get(property);

          if (listeners) {
            this.scheduleListener(listeners);
          }

          const foreignListeners = this.foreignListeners.get(property);

          if (foreignListeners) {
            this.scheduleListener(foreignListeners);
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
          const listeners = this.watchers.get(property);

          if (listeners) {
            this.scheduleListener(listeners);
          }

          const foreignListeners = this.foreignListeners.get(property);

          if (foreignListeners) {
            this.scheduleListener(foreignListeners);
          }
        }
        target[property] = createModel({}, this);
        setDeepValue(target[property], value);
        return true;
      }

      if (isUndefined(value)) {
        let called = false;
        Object.keys(oldValue.$target).forEach((k) => {
          if (oldValue[k][isProxySymbol]) {
            called = true;
          }
          delete oldValue[k];
        });

        target[property] = undefined;
        if (!called) {
          let listeners = this.watchers.get(property);

          if (listeners) {
            this.scheduleListener(listeners);
          }
        }

        return true;
      }

      if (isDefined(value)) {
        target[property] = value;
        // Object.keys(oldValue.$target).forEach((k) => {
        //   delete oldValue[k];
        // });
        // target[property] = undefined;
        let listeners = this.watchers.get(property);

        if (listeners) {
          this.scheduleListener(listeners);
        }
        // listeners = [];
        // if (this.$wrapperProxy) {
        //   Object.keys(this.$wrapperProxy.$target).forEach((v) => {
        //     this.watchers.get(v).forEach((i) => {
        //       listeners.push(i);
        //     });
        //   });
        //   const oldObject = Object.create(null);

        //   oldObject[property] = oldValue;

        //   this.scheduleListener(listeners, oldObject);
        // }

        return true;
      }
      return true;
    } else {
      if (isUndefined(target[property]) && isProxy(value)) {
        this.foreignProxies.add(value);
        target[property] = value;
        return true;
      }

      target[property] = createModel(value, this);

      if (oldValue !== value) {
        // Handle the case where we need to start observing object after a watcher has been set
        if (isUndefined(oldValue) && isObject(target[property])) {
          if (!this.objectListeners.has(target[property])) {
            this.objectListeners.set(target[property], [property]);
          }
        }

        let listeners = this.watchers.get(property);
        if (listeners) {
          assert(listeners.length !== 0);
          // check if the listener actually appllies to this target
          this.scheduleListener(listeners, (x) => {
            return x.filter((x) => {
              if (!x.watchProp) return true;
              // Compute the expected target based on `watchProp`
              const wrapperExpr = x.watchProp.split(".").slice(0, -1).join(".");
              const expectedTarget = $parse(wrapperExpr)(x.originalTarget)
                ?.$handler.$target;
              return expectedTarget === target;
            });
          });
        }

        let foreignListeners = this.foreignListeners.get(property);

        if (!foreignListeners && this.$parent?.foreignListeners) {
          foreignListeners = this.$parent.foreignListeners.get(property);
        }
        if (foreignListeners) {
          assert(foreignListeners.length !== 0);
          this.scheduleListener(foreignListeners);
        }
      }

      if (this.objectListeners.has(proxy) && property !== "length") {
        let keys = this.objectListeners.get(proxy);
        keys.forEach((key) => {
          const listeners = this.watchers.get(key);
          if (listeners) {
            this.scheduleListener(listeners);
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
    // Sets current proxy and current targets
    this.$proxy = proxy;
    this.$target = target;

    if (property === "$$watchersCount") return calculateWatcherCount(this);
    if (property === isProxySymbol) return true;

    if (!this.propertyMap) {
      this.propertyMap = {
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
        $proxy: this.$proxy,
        $digest: this.$digest.bind(this),
        $on: this.$on.bind(this),
        $emit: this.$emit.bind(this),
        $broadcast: this.$broadcast.bind(this),
        $transcluded: this.$transcluded.bind(this),
        $handler: this,
        $parent: this.$parent,
        $root: this.$root,
        $wrapperProxy: this.$wrapperProxy,
        $children: this.$children,
        id: this.id,
        registerForeignKey: this.registerForeignKey.bind(this),
        notifyListener: this.notifyListener.bind(this),
      };
    }

    return Object.prototype.hasOwnProperty.call(this.propertyMap, property)
      ? this.propertyMap[property]
      : target[property];
  }

  /**
   * @private
   * @param {Listener[]} listeners
   */
  scheduleListener(listeners, filter = (val) => val) {
    Promise.resolve().then(() => {
      let index = 0;

      while (index < filter(listeners).length) {
        const listener = filter(listeners)[index];
        if (listener.foreignListener) {
          listener.foreignListener.notifyListener(listener, this.$target);
        } else {
          this.notifyListener(listener, this.$target);
        }

        if (listener.oneTime) {
          this.deregisterKey(listener.property, listener.id);
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

    if (this.$wrapperProxy) {
      let listeners = [];
      Object.keys(this.$wrapperProxy.$target).forEach((v) => {
        this.watchers.get(v).forEach((i) => {
          listeners.push(i);
        });
      });
      const oldObject = Object.create(null);
      oldObject[property] = undefined;

      this.scheduleListener(listeners, oldObject);
      return true;
    }

    delete target[property];
    if (this.objectListeners.has(this.$proxy)) {
      let keys = this.objectListeners.get(this.$proxy);
      keys.forEach((key) => {
        const listeners = this.watchers.get(key);
        if (listeners) {
          this.scheduleListener(listeners);
        }
      });
    } else {
      const listeners = this.watchers.get(property);
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
      scopeId: this.id,
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
        key = get.decoratedNode.body[0].expression.left.name;
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
        listener.property =
          get.decoratedNode.body[0].expression.toWatch[0].property.name;
        key = listener.property;
        break;
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
        key = get.decoratedNode.body[0].expression.property.name;
        if (watchProp !== key) {
          // Handle nested expression call
          listener.watchProp = watchProp;

          let potentialProxy = $parse(
            watchProp.split(".").slice(0, -1).join("."),
          )(listener.originalTarget);
          if (potentialProxy && this.foreignProxies.has(potentialProxy)) {
            potentialProxy.$handler.registerForeignKey(key, listener);
            return () => {
              return potentialProxy.$handler.deregisterKey(key, listener.id);
            };
          }
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
        listener.property =
          get.decoratedNode.body[0].expression.toWatch[0].name;
        key = listener.property;
        break;
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

    // if the target is an object, then start observing it
    if (isObject(listener.watchFn(this.$target))) {
      this.objectListeners.set(listener.watchFn(this.$target), [key]);
    }

    this.registerKey(key, listener);
    this.scheduleListener([listener]);
    return () => {
      return this.deregisterKey(key, listener.id);
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
      child.$parent = this.$parent;
    }

    const proxy = new Proxy(child, new Model(this));
    this.$children.push(proxy);
    return proxy;
  }

  $newIsolate(instance) {
    let child = instance ? Object.create(instance) : Object.create(null);
    child.$root = this.$root;
    const proxy = new Proxy(child, new Model(this));
    this.$children.push(proxy);
    return proxy;
  }

  $transcluded(parentInstance) {
    let child = Object.create(this.$target);
    child.$parent = parentInstance;
    const proxy = new Proxy(child, new Model(this));
    this.$children.push(proxy);
    return proxy;
  }

  registerKey(key, listener) {
    if (this.watchers.has(key)) {
      this.watchers.get(key).push(listener);
    } else {
      this.watchers.set(key, [listener]);
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
    const listenerList = this.watchers.get(key);
    if (!listenerList) return false;

    const index = listenerList.findIndex((x) => x.id === id);
    if (index === -1) return false;

    listenerList.splice(index, 1);
    if (listenerList.length) {
      this.watchers.set(key, listenerList);
    } else {
      this.watchers.delete(key);
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
      return $parse(expr)(this.$proxy);
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
      if (this.$children.length > 0) {
        this.$children.forEach((child) => {
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
      const result = $parse(expr)(this.$proxy);
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
    Array.from(this.watchers.entries()).forEach(([key, val]) => {
      this.watchers.set(
        key,
        val.filter((x) => x.scopeId !== this.id),
      );
    });

    if (this.$$destroyed) return;

    this.$broadcast("$destroy");
    this.$$destroyed = true;
  }

  /**
   * Invokes the registered listener function with watched property changes.
   *
   * @param {Listener} listener - The property path that was changed.
   */
  notifyListener(listener, target) {
    const { originalTarget, listenerFn, watchFn } = listener;
    try {
      const newVal = watchFn(target) || watchFn(originalTarget);
      listenerFn(newVal, originalTarget);
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

/**
 * @param {Model} model
 * @returns {number}
 */
function calculateWatcherCount(model) {
  const childIds = collectChildIds(model).add(model.id);

  return Array.from(model.watchers.values()).reduce(
    (count, watcherArray) =>
      count +
      watcherArray.reduce(
        (subCount, watcher) =>
          subCount + (childIds.has(watcher.scopeId) ? 1 : 0),
        0,
      ),
    0,
  );
}

/**
 * @param {Model} child
 * @returns {Set<number>}
 */
function collectChildIds(child) {
  const ids = new Set([child.id]);
  child.$children?.forEach((c) => {
    collectChildIds(c).forEach((id) => ids.add(id));
  });
  return ids;
}

/**
 *
 * @param {*} value
 * @returns {boolean}
 */
function isProxy(value) {
  if (value && value[isProxySymbol]) {
    return true;
  }
  return false;
}
