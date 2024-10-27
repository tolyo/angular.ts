import {
  concat,
  minErr,
  nextUid,
  isFunction,
  isUndefined,
  isObject,
  isArrayLike,
  isNumberNaN,
  arrayRemove,
  equals,
} from "../../shared/utils";

/**
 * @enum {number}
 */
export const ScopePhase = {
  NONE: 0,
  APPLY: 1,
  DIGEST: 2,
};

/**
 * @typedef {Object} AsyncQueueTask
 * @property {Scope} scope
 * @property {Function} fn
 * @property {Object} locals
 */

/**
 * @typedef {function(any, any, Scope): any} WatchListener
 * Callback function triggered whenever the value of `watchExpression` changes.
 *
 * @param {any} newVal - The current value of the `watchExpression`.
 * @param {any} oldVal - The previous value of the `watchExpression`.
 * @param {Scope} scope - The current scope in which the `watchExpression` is evaluated.
 *
 */

/**
 * @typedef {string | ((scope: Scope) => any)} WatchExpression
 */

/**
 *
 * The default number of `$digest` iterations the scope should attempt to execute before giving up and
 * assuming that the model is unstable. In complex applications it's possible that the dependencies between `$watch`s will result in
 * several digest iterations.
 *
 * @typedef {number} TTL The number of digest iterations
 *
 * @type {TTL}
 */
export const TTL = 10;

const $rootScopeMinErr = minErr("$rootScope");

/** @type {AsyncQueueTask[]} */
export const $$asyncQueue = [];
export const $postUpdateQueue = [];

/**
 * @type {Function[]}
 */
export const $$applyAsyncQueue = [];
let postDigestQueuePosition = 0;
let lastDirtyWatch = null;
let applyAsyncId = null;

/** Services required by each scope instance */
/** @type {import('../parse/parse').ParseService} */
let $parse;
/** @type {import('../../services/browser').Browser} */
let $browser;
/**@type {import('../exception-handler').ErrorHandler} */
let $exceptionHandler;

/**
 * Provider responsible for instantiating the initial scope, aka - root scope.
 * Every application has a single root {@link ng.$rootScope.Scope scope}.
 * All other scopes are descendant scopes of the root scope. Scopes provide separation
 * between the model and the view, via a mechanism for watching the model for changes.
 * They also provide event emission/broadcast and subscription facility. See the
 * {@link guide/scope developer guide on scopes}.
 *
 * The provider also injects runtime services to make them available to all scopes.
 *
 */
export class RootScopeProvider {
  constructor() {
    this.rootScope = new Scope(true);
  }

  $get = [
    "$exceptionHandler",
    "$parse",
    "$browser",
    /**
     * @param {import('../exception-handler').ErrorHandler} exceptionHandler
     * @param {import('../parse/parse').ParseService} parse
     * @param {import('../../services/browser').Browser} browser
     * @returns {Scope} root scope
     */
    (exceptionHandler, parse, browser) => {
      $exceptionHandler = exceptionHandler;
      $parse = parse;
      $browser = browser;
      return this.rootScope;
    },
  ];
}

/**
 * DESIGN NOTES
 *
 * The design decisions behind the scope are heavily favored for speed and memory consumption.
 *
 * The typical use of scope is to watch the expressions, which most of the time return the same
 * value as last time so we optimize the operation.
 *
 * Closures construction is expensive in terms of speed as well as memory:
 *   - No closures, instead use prototypical inheritance for API
 *   - Internal state needs to be stored on scope directly, which means that private state is
 *     exposed as $$____ properties
 *
 * Loop operations are optimized by using while(count--) { ... }
 *   - This means that in order to keep the same order of execution as addition we have to add
 *     items to the array at the beginning (unshift) instead of at the end (push)
 *
 * Child scopes are created and removed often
 *   - Using an array would be slow since inserts in the middle are expensive; so we use linked lists
 *
 * There are fewer watches than observers. This is why you don't want the observer to be implemented
 * in the same way as watch. Watch requires return of the initialization function which is expensive
 * to construct.
 */

export class Scope {
  /**
   * @param {boolean} [root=false] - Indicates if this scope is the root scope.
   */
  constructor(root = false) {
    /**
     * @type {boolean}
     */
    this.isRoot = root;

    /**
     * @type {number} Unique scope ID (monotonically increasing) useful for debugging.
     */
    this.$id = nextUid();

    /** @type {ScopePhase} */
    this.$$phase = ScopePhase.NONE;

    /**
     * @type {?Scope} Reference to the parent scope.
     */
    this.$parent = null;

    /**
     * @type {?Scope}
     */
    this.$root = this;

    /**
     * @type {Array<any>}
     */
    this.$$watchers = [];

    /**
     * @type {number}
     */
    this.$$digestWatchIndex = -1;

    /**
     * @type {?Scope}
     */
    this.$$nextSibling = null;

    /**
     * @type {?Scope}
     */
    this.$$prevSibling = null;

    /**
     * @type {?Scope}
     */
    this.$$childHead = null;

    /**
     * @type {?Scope}
     */
    this.$$childTail = null;

    /** @type {boolean} */
    this.$$destroyed = false;

    /** @type {boolean} */
    this.$$suspended = false;

    /** @type {Map<String, Function[]>} */
    this.$$listeners = new Map();

    /** @type {object} */
    this.$$listenerCount = {};

    /** @type {number} */
    this.$$watchersCount = 0;
    this.$$isolateBindings = null;

    /**
     * @type {?Scope}
     */
    this.$$ChildScope = null;
  }

  /**
   * Creates a new child {@link Scope}.
   *
   * The parent scope will propagate the {@link ng.$rootScope.Scope#$digest $digest()} event.
   * The scope can be removed from the scope hierarchy using {@link ng.$rootScope.Scope#$destroy $destroy()}.
   *
   * {@link ng.$rootScope.Scope#$destroy $destroy()} must be called on a scope when it is
   * desired for the scope and its child scopes to be permanently detached from the parent and
   * thus stop participating in model change detection and listener notification by invoking.
   *
   * @param {?boolean} isolate If true, then the scope does not prototypically inherit from the
   *         parent scope. The scope is isolated, as it can not see parent scope properties.
   *         When creating widgets, it is useful for the widget to not accidentally read parent
   *         state.
   *
   * @param {?Scope} [parent=this] The {@link ng.$rootScope.Scope `Scope`} that will be the `$parent`
   *                              of the newly created scope. Defaults to `this` scope if not provided.
   *                              This is used when creating a transclude scope to correctly place it
   *                              in the scope hierarchy while maintaining the correct prototypical
   *                              inheritance.
   *
   * @returns {Scope} The newly created child scope.
   *
   */
  $new(isolate, parent) {
    let child = isolate ? new Scope() : Object.create(this);

    if (isolate) {
      child.$root = this.$root;
    } else {
      // Initialize properties for a non-isolated child scope
      child.$id = nextUid();
      child.$$watchers = [];
      child.$$nextSibling = null;
      child.$$childHead = null;
      child.$$childTail = null;
      child.$$listeners = new Map();
      child.$$listenerCount = {};
      child.$$watchersCount = 0;
      child.$$ChildScope = null;
      child.$$suspended = false;
    }

    child.$parent = parent || this;
    child.$$prevSibling = child.$parent.$$childTail;

    if (child.$parent.$$childHead) {
      child.$parent.$$childTail.$$nextSibling = child;
      child.$parent.$$childTail = child;
    } else {
      child.$parent.$$childHead = child;
      child.$parent.$$childTail = child;
    }

    // Add a destroy listener if isolated or the parent differs from `this`
    if (isolate || parent !== this) {
      child.$on("$destroy", ($event) => {
        $event.currentScope.$$destroyed = true;
      });
    }

    return child;
  }

  /**
 * Registers a `listener` callback to be executed whenever the `watchExpression` changes.
 *
 * - The `watchExpression` is called on every call to {@link ng.$rootScope.Scope#$digest
 *   $digest()} and should return the value that will be watched. (`watchExpression` should not change
 *   its value when executed multiple times with the same input because it may be executed multiple
 *   times by {@link ng.$rootScope.Scope#$digest $digest()}. That is, `watchExpression` should be
 *   [idempotent](http://en.wikipedia.org/wiki/Idempotence).)
 * - The `listener` is called only when the value from the current `watchExpression` and the
 *   previous call to `watchExpression` are not equal (with the exception of the initial run,
 *   see below). Inequality is determined according to reference inequality,
 *   [strict comparison](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Comparison_Operators)
 *    via the `!==` Javascript operator, unless `objectEquality == true`
 *   (see next point)
 * - When `objectEquality == true`, inequality of the `watchExpression` is determined
 *   according to the {@link angular.equals} function. To save the value of the object for
 *   later comparison, the {@link structuredClone} function is used. This therefore means that
 *   watching complex objects will have adverse memory and performance implications.
 * - This should not be used to watch for changes in objects that are (or contain)
 *   [File](https://developer.mozilla.org/docs/Web/API/File) objects due to limitations with {@link structuredClone `structuredClone`}.
 * - The watch `listener` may change the model, which may trigger other `listener`s to fire.
 *   This is achieved by rerunning the watchers until no changes are detected. The rerun
 *   iteration limit is 10 to prevent an infinite loop deadlock.
 *
 *
 * If you want to be notified whenever {@link ng.$rootScope.Scope#$digest $digest} is called,
 * you can register a `watchExpression` function with no `listener`. (Be prepared for
 * multiple calls to your `watchExpression` because it will execute multiple times in a
 * single {@link ng.$rootScope.Scope#$digest $digest} cycle if a change is detected.)
 *
 * After a watcher is registered with the scope, the `listener` fn is called asynchronously
 * (via {@link ng.$rootScope.Scope#$evalAsync $evalAsync}) to initialize the
 * watcher. In rare cases, this is undesirable because the listener is called when the result
 * of `watchExpression` didn't change. To detect this scenario within the `listener` fn, you
 * can compare the `newVal` and `oldVal`. If these two values are identical (`===`) then the
 * listener was called due to initialization.
 *
 *
 *
 * @example
 * ```js
     // let's assume that scope was dependency injected as the $rootScope
     let scope = $rootScope;
     scope.name = 'misko';
     scope.counter = 0;

     expect(scope.counter).toEqual(0);
     scope.$watch('name', function(newValue, oldValue) {
       scope.counter = scope.counter + 1;
     });
     expect(scope.counter).toEqual(0);

     ;
     // the listener is always called during the first $digest loop after it was registered
     expect(scope.counter).toEqual(1);

     ;
     // but now it will not be called unless the value changes
     expect(scope.counter).toEqual(1);

     scope.name = 'adam';
     ;
     expect(scope.counter).toEqual(2);

     // Using a function as a watchExpression
     let food;
     scope.foodCounter = 0;
     expect(scope.foodCounter).toEqual(0);
     scope.$watch(
       // This function returns the value being watched. It is called for each turn of the $digest loop
       function() { return food; },
       // This is the change listener, called when the value returned from the above function changes
       function(newValue, oldValue) {
         if ( newValue !== oldValue ) {
           // Only increment the counter if the value changed
           scope.foodCounter = scope.foodCounter + 1;
         }
       }
     );
     // No digest has been run so the counter will be zero
     expect(scope.foodCounter).toEqual(0);

     // Run the digest but since food has not changed count will still be zero
     ;
     expect(scope.foodCounter).toEqual(0);

     // Update food and run digest.  Now the counter will increment
     food = 'cheeseburger';
     ;
     expect(scope.foodCounter).toEqual(1);

 * ```
 *
 *
 *
 * @param {string | ((scope: Scope) => any) | import("../parse/parse.js").CompiledExpression} watchExp Expression that is evaluated on each
 *    {@link ng.$rootScope.Scope#$digest $digest} cycle. A change in the return value triggers
 *    a call to the `listener`.
 *
 *    - `string`: Evaluated as {@link guide/expression expression}
 *    - `function(scope)`: called with current `scope` as a parameter.
 * @param {WatchListener} [listener]
 * @param {boolean=} [objectEquality=false] Compare for object equality using {@link angular.equals} instead of
 *     comparing for reference equality.
 * @returns {function()} Returns a deregistration function for this listener.
 */
  $watch(watchExp, listener, objectEquality) {
    const get = $parse(watchExp);
    const fn = isFunction(listener) ? listener : () => {};

    if (get.$$watchDelegate) {
      return get.$$watchDelegate(this, fn, objectEquality, get, watchExp);
    }

    const watcher = {
      fn,
      last: initWatchVal,
      get,
      exp: watchExp,
      eq: !!objectEquality,
    };

    lastDirtyWatch = null;

    if (this.$$watchers.length === 0) {
      this.$$digestWatchIndex = -1;
    }
    // we use unshift since we use a while loop in $digest for speed.
    // the while loop reads in reverse order.
    this.$$watchers.unshift(watcher);
    this.$$digestWatchIndex++;
    this.incrementWatchersCount(1);

    return () => {
      const index = arrayRemove(this.$$watchers, watcher);
      if (index >= 0) {
        this.incrementWatchersCount(-1);
        if (index < this.$$digestWatchIndex) {
          this.$$digestWatchIndex--;
        }
      }
      lastDirtyWatch = null;
    };
  }

  /**
   * A variant of {@link ng.$rootScope.Scope#$watch $watch()} where it watches an array of `watchExpressions`.
   * If any one expression in the collection changes the `listener` is executed.
   *
   * - The items in the `watchExpressions` array are observed via the standard `$watch` operation. Their return
   *   values are examined for changes on every call to `$digest`.
   * - The `listener` is called whenever any expression in the `watchExpressions` array changes.
   *
   * @param {Array.<string|((Scope)=>any)>} watchExpressions Array of expressions that will be individually
   * watched using {@link ng.$rootScope.Scope#$watch $watch()}
   *
   * @param {function(any, any, Scope): any} listener Callback called whenever the return value of any
   *    expression in `watchExpressions` changes
   *    The `newValues` array contains the current values of the `watchExpressions`, with the indexes matching
   *    those of `watchExpression`
   *    and the `oldValues` array contains the previous values of the `watchExpressions`, with the indexes matching
   *    those of `watchExpression`
   *    The `scope` refers to the current scope.
   * @returns {function()} Returns a de-registration function for all listeners.
   */
  $watchGroup(watchExpressions, listener) {
    const oldValues = new Array(watchExpressions.length);
    const newValues = new Array(watchExpressions.length);
    const deregisterFns = [];
    const self = this;
    let changeReactionScheduled = false;
    let firstRun = true;

    if (!watchExpressions.length) {
      // No expressions means we call the listener ASAP
      let shouldCall = true;
      self.$evalAsync(() => {
        if (shouldCall) listener(newValues, newValues, self);
      });
      return function deregisterWatchGroup() {
        shouldCall = false;
      };
    }

    if (watchExpressions.length === 1) {
      // Special case size of one
      return this.$watch(watchExpressions[0], (value, oldValue, scope) => {
        newValues[0] = value;
        oldValues[0] = oldValue;
        listener(newValues, value === oldValue ? newValues : oldValues, scope);
      });
    }

    Object.entries(watchExpressions).forEach(([i, expr]) => {
      const unwatchFn = self.$watch(expr, (value) => {
        newValues[i] = value;
        if (!changeReactionScheduled) {
          changeReactionScheduled = true;
          self.$evalAsync(watchGroupAction);
        }
      });
      deregisterFns.push(unwatchFn);
    });

    function watchGroupAction() {
      changeReactionScheduled = false;

      try {
        if (firstRun) {
          firstRun = false;
          listener(newValues, newValues, self);
        } else {
          listener(newValues, oldValues, self);
        }
      } finally {
        for (let i = 0; i < watchExpressions.length; i++) {
          oldValues[i] = newValues[i];
        }
      }
    }

    return function deregisterWatchGroup() {
      while (deregisterFns.length) {
        deregisterFns.shift()();
      }
    };
  }

  /**
   * Shallow watches the properties of an object and fires whenever any of the properties change
   * (for arrays, this implies watching the array items; for object maps, this implies watching
   * the properties). If a change is detected, the `listener` callback is fired.
   *
   * - The `obj` collection is observed via standard $watch operation and is examined on every
   *   call to $digest() to see if any items have been added, removed, or moved.
   * - The `listener` is called whenever anything within the `obj` has changed. Examples include
   *   adding, removing, and moving items belonging to an object or array.
   *
   *
   *
   *
   * @param {string|function(Scope):any} obj Evaluated as {@link guide/expression expression}. The
   *    expression value should evaluate to an object or an array which is observed on each
   *    {@link ng.$rootScope.Scope#$digest $digest} cycle. Any shallow change within the
   *    collection will trigger a call to the `listener`.
   *
   * @param {function(any[], any[], Scope):any} listener a callback function called
   *    when a change is detected.
   *    - The `newCollection` object is the newly modified data obtained from the `obj` expression
   *    - The `oldCollection` object is a copy of the former collection data.
   *      Due to performance considerations, the`oldCollection` value is computed only if the
   *      `listener` function declares two or more arguments.
   *    - The `scope` argument refers to the current scope.
   *
   * @returns {function()} Returns a de-registration function for this listener. When the
   *    de-registration function is executed, the internal watch operation is terminated.
   */
  $watchCollection(obj, listener) {
    // Mark the interceptor as
    // ... $$pure when literal since the instance will change when any input changes
    $watchCollectionInterceptor.$$pure = $parse(obj).literal;
    // ... $stateful when non-literal since we must read the state of the collection
    $watchCollectionInterceptor.$stateful = !$watchCollectionInterceptor.$$pure;

    const self = this;
    // the current value, updated on each dirty-check run
    let newValue;
    // a shallow copy of the newValue from the last dirty-check run,
    // updated to match newValue during dirty-check run
    let oldValue;
    // a shallow copy of the newValue from when the last change happened
    let veryOldValue;
    // only track veryOldValue if the listener is asking for it
    const trackVeryOldValue = listener.length > 1;
    let changeDetected = 0;
    const changeDetector = $parse(obj, $watchCollectionInterceptor);
    const internalArray = [];
    let internalObject = {};
    let initRun = true;
    let oldLength = 0;

    function $watchCollectionInterceptor(_value) {
      newValue = _value;
      let newLength;
      let key;
      let bothNaN;
      let newItem;
      let oldItem;

      // If the new value is undefined, then return undefined as the watch may be a one-time watch
      if (isUndefined(newValue)) return;

      if (!isObject(newValue)) {
        // if primitive
        if (oldValue !== newValue) {
          oldValue = newValue;
          changeDetected++;
        }
      } else if (isArrayLike(newValue)) {
        if (oldValue !== internalArray) {
          // we are transitioning from something which was not an array into array.
          oldValue = internalArray;
          oldLength = oldValue.length = 0;
          changeDetected++;
        }

        newLength = newValue.length;

        if (oldLength !== newLength) {
          // if lengths do not match we need to trigger change notification
          changeDetected++;
          oldValue.length = oldLength = newLength;
        }
        // copy the items to oldValue and look for changes.
        for (let i = 0; i < newLength; i++) {
          oldItem = oldValue[i];
          newItem = newValue[i];

          bothNaN = oldItem !== oldItem && newItem !== newItem;
          if (!bothNaN && oldItem !== newItem) {
            changeDetected++;
            oldValue[i] = newItem;
          }
        }
      } else {
        if (oldValue !== internalObject) {
          // we are transitioning from something which was not an object into object.
          oldValue = internalObject = {};
          oldLength = 0;
          changeDetected++;
        }
        // copy the items to oldValue and look for changes.
        newLength = 0;
        for (key in newValue) {
          if (Object.hasOwnProperty.call(newValue, key)) {
            newLength++;
            newItem = newValue[key];
            oldItem = oldValue[key];

            if (key in oldValue) {
              bothNaN = oldItem !== oldItem && newItem !== newItem;
              if (!bothNaN && oldItem !== newItem) {
                changeDetected++;
                oldValue[key] = newItem;
              }
            } else {
              oldLength++;
              oldValue[key] = newItem;
              changeDetected++;
            }
          }
        }
        if (oldLength > newLength) {
          // we used to have more keys, need to find them and destroy them.
          changeDetected++;
          for (key in oldValue) {
            if (!Object.hasOwnProperty.call(newValue, key)) {
              oldLength--;
              delete oldValue[key];
            }
          }
        }
      }
      return changeDetected;
    }

    function $watchCollectionAction() {
      if (initRun) {
        initRun = false;
        listener(newValue, newValue, self);
      } else {
        listener(newValue, veryOldValue, self);
      }

      // make a copy for the next time a collection is changed
      if (trackVeryOldValue) {
        if (!isObject(newValue)) {
          // primitive
          veryOldValue = newValue;
        } else if (isArrayLike(newValue)) {
          veryOldValue = new Array(newValue.length);
          for (let i = 0; i < newValue.length; i++) {
            veryOldValue[i] = newValue[i];
          }
        } else {
          // if object
          veryOldValue = {};
          for (const key in newValue) {
            if (Object.hasOwnProperty.call(newValue, key)) {
              veryOldValue[key] = newValue[key];
            }
          }
        }
      }
    }
    return this.$watch(changeDetector, $watchCollectionAction);
  }

  /**
 * Processes all of the {@link ng.$rootScope.Scope#$watch watchers} of the current scope and
 * its children. Because a {@link ng.$rootScope.Scope#$watch watcher}'s listener can change
 * the model, the `$digest()` keeps calling the {@link ng.$rootScope.Scope#$watch watchers}
 * until no more listeners are firing. This means that it is possible to get into an infinite
 * loop. This function will throw `'Maximum iteration limit exceeded.'` if the number of
 * iterations exceeds 10.
 *
 * Usually, you don't call `$digest()` directly in
 * {@link ng.directive:ngController controllers} or in
 * {@link ng.$compileProvider#directive directives}.
 * Instead, you should call {@link ng.$rootScope.Scope#$apply $apply()} (typically from within
 * a {@link ng.$compileProvider#directive directive}), which will force a `$digest()`.
 *
 * If you want to be notified whenever `$digest()` is called,
 * you can register a `watchExpression` function with
 * {@link ng.$rootScope.Scope#$watch $watch()} with no `listener`.
 *
 * In unit tests, you may need to call `$digest()` to simulate the scope life cycle.
 *
 * @example
 * ```js
     let scope = ...;
     scope.name = 'misko';
     scope.counter = 0;

     expect(scope.counter).toEqual(0);
     scope.$watch('name', function(newValue, oldValue) {
       scope.counter = scope.counter + 1;
     });
     expect(scope.counter).toEqual(0);

     ;
     // the listener is always called during the first $digest loop after it was registered
     expect(scope.counter).toEqual(1);

     ;
     // but now it will not be called unless the value changes
     expect(scope.counter).toEqual(1);

     scope.name = 'adam';
     ;
     expect(scope.counter).toEqual(2);
 * ```
 *
 */
  $digest() {
    let value;
    let last;
    let fn;
    let get;
    let watchers;
    let dirty;
    let ttl = TTL;
    let next;
    /** @type {Scope} */
    let current;
    /** @type {Scope} */
    const target = $$asyncQueue.length ? this.$root : this;
    const watchLog = [];
    let logIdx;
    let asyncTask;

    this.beginPhase(ScopePhase.DIGEST);
    // Check for changes to browser url that happened in sync before the call to $digest
    // TODO Implement browser
    $browser.$$checkUrlChange();

    if (this.isRoot && applyAsyncId !== null) {
      // If this is the root scope, and $applyAsync has scheduled a deferred $apply(), then
      // cancel the scheduled $apply and flush the queue of expressions to be evaluated.
      $browser.cancel(applyAsyncId);
      flushApplyAsync();
      applyAsyncId = null;
    }

    lastDirtyWatch = null;
    do {
      // "while dirty" loop
      dirty = false;
      current = target;

      // It's safe for asyncQueuePosition to be a local variable here because this loop can't
      // be reentered recursively. Calling $digest from a function passed to $evalAsync would
      // lead to a '$digest already in progress' error.
      for (
        let asyncQueuePosition = 0;
        asyncQueuePosition < $$asyncQueue.length;
        asyncQueuePosition++
      ) {
        try {
          asyncTask = $$asyncQueue[asyncQueuePosition];
          fn = asyncTask.fn;
          fn(asyncTask.scope, asyncTask.locals);
        } catch (e) {
          $exceptionHandler(e);
        }
        lastDirtyWatch = null;
      }
      $$asyncQueue.length = 0;

      do {
        // "traverse the scopes" loop
        if ((watchers = !current.$$suspended && current.$$watchers)) {
          // process our watches
          current.$$digestWatchIndex = watchers.length;
          while (current.$$digestWatchIndex--) {
            try {
              const watch = watchers[current.$$digestWatchIndex];
              // Most common watches are on primitives, in which case we can short
              // circuit it with === operator, only when === fails do we use .equals
              if (watch) {
                get = watch.get;
                if (
                  (value = get(current)) !== (last = watch.last) &&
                  !(watch.eq
                    ? equals(value, last)
                    : isNumberNaN(value) && isNumberNaN(last))
                ) {
                  dirty = true;
                  lastDirtyWatch = watch;
                  watch.last = watch.eq ? structuredClone(value) : value;
                  fn = watch.fn;
                  fn(value, last === initWatchVal ? value : last, current);
                  if (ttl < 5) {
                    logIdx = 4 - ttl;
                    if (!watchLog[logIdx]) watchLog[logIdx] = [];
                    watchLog[logIdx].push({
                      msg: isFunction(watch.exp)
                        ? `fn: ${watch.exp.name || watch.exp.toString()}`
                        : watch.exp,
                      newVal: value,
                      oldVal: last,
                    });
                  }
                } else if (watch === lastDirtyWatch) {
                  // If the most recently dirty watcher is now clean, short circuit since the remaining watchers
                  // have already been tested.
                  dirty = false;
                  break;
                }
              }
            } catch (e) {
              $exceptionHandler(e);
            }
          }
        }

        // Insanity Warning: scope depth-first traversal
        // yes, this code is a bit crazy, but it works and we have tests to prove it!
        // this piece should be kept in sync with the traversal in $broadcast
        // (though it differs due to having the extra check for $$suspended and does not
        // check $$listenerCount)
        if (
          !(next =
            (!current.$$suspended &&
              current.$$watchersCount &&
              current.$$childHead) ||
            (current !== target && current.$$nextSibling))
        ) {
          while (current !== target && !(next = current.$$nextSibling)) {
            current = current.$parent;
          }
        }
      } while ((current = next));

      // `break traverseScopesLoop;` takes us to here

      if ((dirty || $$asyncQueue.length) && !ttl--) {
        this.clearPhase();
        throw $rootScopeMinErr(
          "infdig",
          "{0} $digest() iterations reached. Aborting!\n" +
            "Watchers fired in the last 5 iterations: {1}",
          TTL,
          watchLog,
        );
      }
    } while (dirty || $$asyncQueue.length);

    this.clearPhase();

    // postDigestQueuePosition isn't local here because this loop can be reentered recursively.
    while (postDigestQueuePosition < $postUpdateQueue.length) {
      try {
        $postUpdateQueue[postDigestQueuePosition++]();
      } catch (e) {
        $exceptionHandler(e);
      }
    }
    $postUpdateQueue.length = postDigestQueuePosition = 0;

    // Check for changes to browser url that happened during the $digest
    // (for which no event is fired; e.g. via `history.pushState()`)
    $browser.$$checkUrlChange();
  }

  /**
   * @param {ScopePhase} phase
   */
  beginPhase(phase) {
    if (this.$root.$$phase !== ScopePhase.NONE) {
      throw $rootScopeMinErr(
        "inprog",
        "digest already in progress",
        this.$root.$$phase,
      );
    }

    this.$root.$$phase = phase;
  }

  /**
   * Suspend watchers of this scope subtree so that they will not be invoked during digest.
   *
   * This can be used to optimize your application when you know that running those watchers
   * is redundant.
   *
   * **Warning**
   *
   * Suspending scopes from the digest cycle can have unwanted and difficult to debug results.
   * Only use this approach if you are confident that you know what you are doing and have
   * ample tests to ensure that bindings get updated as you expect.
   *
   * Some of the things to consider are:
   *
   * * Any external event on a directive/component will not trigger a digest while the hosting
   *   scope is suspended - even if the event handler calls `$apply()` or ``.
   * * Transcluded content exists on a scope that inherits from outside a directive but exists
   *   as a child of the directive's containing scope. If the containing scope is suspended the
   *   transcluded scope will also be suspended, even if the scope from which the transcluded
   *   scope inherits is not suspended.
   * * Multiple directives trying to manage the suspended status of a scope can confuse each other:
   *    * A call to `$suspend()` on an already suspended scope is a no-op.
   *    * A call to `$resume()` on a non-suspended scope is a no-op.
   *    * If two directives suspend a scope, then one of them resumes the scope, the scope will no
   *      longer be suspended. This could result in the other directive believing a scope to be
   *      suspended when it is not.
   * * If a parent scope is suspended then all its descendants will be also excluded from future
   *   digests whether or not they have been suspended themselves. Note that this also applies to
   *   isolate child scopes.
   * * Calling `$digest()` directly on a descendant of a suspended scope will still run the watchers
   *   for that scope and its descendants. When digesting we only check whether the current scope is
   *   locally suspended, rather than checking whether it has a suspended ancestor.
   * * Calling `$resume()` on a scope that has a suspended ancestor will not cause the scope to be
   *   included in future digests until all its ancestors have been resumed.
   * * Resolved promises, e.g. from explicit `$q` deferreds and `$http` calls, trigger `$apply()`
   *   against the `$rootScope` and so will still trigger a global digest even if the promise was
   *   initiated by a component that lives on a suspended scope.
   */
  $suspend() {
    this.$$suspended = true;
  }

  /**

   * Call this method to determine if this scope has been explicitly suspended. It will not
   * tell you whether an ancestor has been suspended.
   * To determine if this scope will be excluded from a digest triggered at the $rootScope,
   * for example, you must check all its ancestors:
   *
   * ```
   * function isExcludedFromDigest(scope) {
   *   while(scope) {
   *     if (scope.$isSuspended()) return true;
   *     scope = scope.$parent;
   *   }
   *   return false;
   * ```
   *
   * Be aware that a scope may not be included in digests if it has a suspended ancestor,
   * even if `$isSuspended()` returns false.
   *
   * @returns true if the current scope has been suspended.
   */
  $isSuspended() {
    return this.$$suspended;
  }

  /**
   * Resume watchers of this scope subtree in case it was suspended.
   *
   * See {@link $rootScope.Scope#$suspend} for information about the dangers of using this approach.
   */
  $resume() {
    this.$$suspended = false;
  }

  /**
   * Broadcasted when a scope and its children are being destroyed.
   *
   * Note that, in AngularTS, there is also a `$destroy` jQuery event, which can be used to
   * clean up DOM bindings before an element is removed from the DOM.
   */

  /**
   * Removes the current scope (and all of its children) from the parent scope. Removal implies
   * that calls to {@link ng.$rootScope.Scope#$digest $digest()} will no longer
   * propagate to the current scope and its children. Removal also implies that the current
   * scope is eligible for garbage collection.
   *
   * The `$destroy()` is usually used by directives such as
   * {@link ng.directive:ngRepeat ngRepeat} for managing the
   * unrolling of the loop.
   *
   * Just before a scope is destroyed, a `$destroy` event is broadcasted on this scope.
   * Application code can register a `$destroy` event handler that will give it a chance to
   * perform any necessary cleanup.
   *
   * Note that, in AngularTS, there is also a `$destroy` event, which can be used to
   * clean up DOM bindings before an element is removed from the DOM.
   */
  $destroy() {
    // We can't destroy a scope that has been already destroyed.
    if (this.$$destroyed) return;

    this.$broadcast("$destroy");
    this.$$destroyed = true;

    if (this === this.$root) {
      // Remove handlers attached to window when $rootScope is removed
      $browser.$$applicationDestroyed();
    }

    this.incrementWatchersCount(-this.$$watchersCount);
    for (const eventName in this.$$listenerCount) {
      this.decrementListenerCount(this.$$listenerCount[eventName], eventName);
    }

    // sever all the references to parent scopes (after this cleanup, the current scope should
    // not be retained by any of our references and should be eligible for garbage collection)
    if (this.$parent) {
      if (this.$parent.$$childHead === this)
        this.$parent.$$childHead = this.$$nextSibling;
      if (this.$parent.$$childTail === this)
        this.$parent.$$childTail = this.$$prevSibling;
    }
    if (this.$$prevSibling)
      this.$$prevSibling.$$nextSibling = this.$$nextSibling;
    if (this.$$nextSibling)
      this.$$nextSibling.$$prevSibling = this.$$prevSibling;

    // Disable listeners, watchers and apply/digest methods
    this.$destroy = this.$digest = this.$apply = this.$applyAsync = () => {};
    this.$evalAsync = () => undefined;
    this.$on =
      this.$watch =
      this.$watchGroup =
        function () {
          return () => {};
        };
    this.$$listeners.clear();

    // Disconnect the next sibling to prevent `cleanUpScope` destroying those too
    this.$$nextSibling = null;
    this.$parent = null;
    this.$$nextSibling = null;
    this.$$prevSibling = null;
    this.$$childHead = null;
    this.$$childTail = null;
    this.$root = null;
    this.$$watchers = null;
  }

  /**
 * Executes the `expression` on the current scope and returns the result. Any exceptions in
 * the expression are propagated (uncaught). This is useful when evaluating AngularTS
 * expressions.
 *
 * @example
 * ```js
     let scope = new Scope();
     scope.a = 1;
     scope.b = 2;

     expect(scope.$eval('a+b')).toEqual(3);
     expect(scope.$eval(function(scope){ return scope.a + scope.b; })).toEqual(3);
 * ```
 *
 * @param {string|function(Scope): any} [expr] An AngularTS expression to be executed.
 *
 *    - `string`: execute using the rules as defined in  {@link guide/expression expression}.
 *    - `function(scope)`: execute the function with the current `scope` parameter.
 *
 * @param {(object)=} locals Local variables object, useful for overriding values in scope.
 * @returns {*} The result of evaluating the expression.
 */
  $eval(expr, locals) {
    return $parse(expr)(this, locals);
  }

  /**
   * Executes the expression on the current scope at a later point in time.
   *
   * The `$evalAsync` makes no guarantees as to when the `expression` will be executed, only
   * that:
   *
   *   - it will execute after the function that scheduled the evaluation (preferably before DOM
   *     rendering).
   *   - at least one {@link ng.$rootScope.Scope#$digest $digest cycle} will be performed after
   *     `expression` execution.
   *
   * Any exceptions from the execution of the expression are forwarded to the
   * {@link ng.$exceptionHandler $exceptionHandler} service.
   *
   * __Note:__ if this function is called outside of a `$digest` cycle, a new `$digest` cycle
   * will be scheduled. However, it is encouraged to always call code that changes the model
   * from within an `$apply` call. That includes code evaluated via `$evalAsync`.
   *
   * @param {(string|function(any):any)=} expr An AngularTS expression to be executed.
   *
   *    - `string`: execute using the rules as defined in {@link guide/expression expression}.
   *    - `function(scope)`: execute the function with the current `scope` parameter.
   *
   * @param {(object)=} locals Local variables object, useful for overriding values in scope.
   */
  $evalAsync(expr, locals) {
    // if we are outside of an $digest loop and this is the first time we are scheduling async
    // task also schedule async auto-flush
    let id;
    if (this.$root.$$phase === ScopePhase.NONE && !$$asyncQueue.length) {
      id = $browser.defer(
        () => {
          if ($$asyncQueue.length) {
            this.$root.$digest();
          }
        },
        null,
        "$evalAsync",
      );
    }

    $$asyncQueue.push({
      scope: this,
      fn: $parse(expr),
      locals,
    });

    return id;
  }

  $postUpdate(fn) {
    $postUpdateQueue.push(fn);
  }

  /**
 * `$apply()` is used to execute an expression in AngularTS from outside of the AngularTS
 * framework. (For example from browser DOM events, setTimeout, XHR or third party libraries).
 * Because we are calling into the AngularTS framework we need to perform proper scope life
 * cycle of {@link ng.$exceptionHandler exception handling},
 * {@link ng.$rootScope.Scope#$digest executing watches}.
 *
 * **Life cycle: Pseudo-Code of `$apply()`**
 *
 * ```js
     function $apply(expr) {
       try {
         return $eval(expr);
       } catch (e) {
         $exceptionHandler(e);
       } finally {
         $root.$digest();
       }
     }
 * ```
 *
 *
 * Scope's `$apply()` method transitions through the following stages:
 *
 * 1. The {@link guide/expression expression} is executed using the
 *    {@link ng.$rootScope.Scope#$eval $eval()} method.
 * 2. Any exceptions from the execution of the expression are forwarded to the
 *    {@link ng.$exceptionHandler $exceptionHandler} service.
 * 3. The {@link ng.$rootScope.Scope#$watch watch} listeners are fired immediately after the
 *    expression was executed using the {@link ng.$rootScope.Scope#$digest $digest()} method.
 *
 *
 * @param {string|function(Scope): any} [expr] An AngularTS expression to be executed.
 *
 *    - `string`: execute using the rules as defined in {@link guide/expression expression}.
 *    - `function(scope)`: execute the function with current `scope` parameter.
 *
 * @returns {*} The result of evaluating the expression.
 */
  $apply(expr) {
    try {
      this.beginPhase(ScopePhase.APPLY);
      try {
        return this.$eval(expr);
      } finally {
        this.clearPhase();
      }
    } catch (e) {
      $exceptionHandler(e);
    } finally {
      this.retry();
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

  clearPhase() {
    this.$root.$$phase = ScopePhase.NONE;
  }

  /**
   * Schedule the invocation of $apply to occur at a later time. The actual time difference
   * varies across browsers, but is typically around ~10 milliseconds.
   *
   * This can be used to queue up multiple expressions which need to be evaluated in the same
   * digest.
   *
   * @param {(string|function())=} expr An AngularTS expression to be executed.
   *
   *    - `string`: execute using the rules as defined in {@link guide/expression expression}.
   *    - `function(scope)`: execute the function with current `scope` parameter.
   */
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
   * @description
   * Listens on events of a given type. See {@link ng.$rootScope.Scope#$emit $emit} for
   * discussion of event life cycle.
   *
   * The event listener function format is: `function(event, args...)`. The `event` object
   * passed into the listener has the following attributes:
   *
   *   - `targetScope` - `{Scope}`: the scope on which the event was `$emit`-ed or
   *     `$broadcast`-ed.
   *   - `currentScope` - `{Scope}`: the scope that is currently handling the event. Once the
   *     event propagates through the scope hierarchy, this property is set to null.
   *   - `name` - `{string}`: name of the event.
   *   - `stopPropagation` - `{function=}`: calling `stopPropagation` function will cancel
   *     further event propagation (available only for events that were `$emit`-ed).
   *   - `preventDefault` - `{function}`: calling `preventDefault` sets `defaultPrevented` flag
   *     to true.
   *   - `defaultPrevented` - `{boolean}`: true if `preventDefault` was called.
   *
   * @param {string} name Event name to listen on.
   * @param {function(any): any} listener Function to call when the event is emitted witn angular.IAngularEvent
   * @returns {function()} Returns a deregistration function for this listener.
   */
  $on(name, listener) {
    let namedListeners = this.$$listeners.get(name);
    if (!namedListeners) {
      namedListeners = [];
      this.$$listeners.set(name, namedListeners);
    }
    namedListeners.push(listener);

    /** @type {Scope} */
    let current = this;
    do {
      current.$$listenerCount[name] = (current.$$listenerCount[name] ?? 0) + 1;
    } while ((current = current.$parent));

    return () => {
      const indexOfListener = namedListeners.indexOf(listener);
      if (indexOfListener !== -1) {
        // Use delete in the hope of the browser deallocating the memory for the array entry,
        // while not shifting the array indexes of other listeners.
        // See issue https://github.com/angular/angular.js/issues/16135
        delete namedListeners[indexOfListener];
        this.decrementListenerCount(1, name);
      }
    };
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
   * @param {number} count
   * @param {string} name
   */
  decrementListenerCount(count, name) {
    /** @type {Scope} */
    let self = this;
    for (; self; self = self.$parent) {
      if (self.$$listenerCount[name] !== undefined) {
        self.$$listenerCount[name] -= count;

        if (self.$$listenerCount[name] === 0) {
          delete self.$$listenerCount[name];
        }
      }
    }
  }

  /**
   * Dispatches an event `name` upwards through the scope hierarchy notifying the
   * registered {@link ng.$rootScope.Scope#$on} listeners.
   *
   * The event life cycle starts at the scope on which `$emit` was called. All
   * {@link ng.$rootScope.Scope#$on listeners} listening for `name` event on this scope get
   * notified. Afterwards, the event traverses upwards toward the root scope and calls all
   * registered listeners along the way. The event will stop propagating if one of the listeners
   * cancels it.
   *
   * Any exception emitted from the {@link ng.$rootScope.Scope#$on listeners} will be passed
   * onto the {@link ng.$exceptionHandler $exceptionHandler} service.
   *
   * @param {string} name Event name to emit.
   * @param {...*} args Optional one or more arguments which will be passed onto the event listeners.
   * @return {Object} Event object (see {@link ng.$rootScope.Scope#$on}).
   */
  $emit(name, ...args) {
    const empty = [];
    let namedListeners;
    /** @type {Scope} */
    let scope = this;
    let stopPropagation = false;
    const event = {
      name,
      targetScope: scope,
      stopPropagation() {
        stopPropagation = true;
      },
      preventDefault() {
        event.defaultPrevented = true;
      },
      defaultPrevented: false,
    };
    const listenerArgs = concat([event], [event].concat(args), 1);
    let i;
    let length;

    do {
      namedListeners = scope.$$listeners.get(name) || empty;
      event.currentScope = scope;
      for (i = 0, length = namedListeners.length; i < length; i++) {
        // if listeners were deregistered, defragment the array
        if (!namedListeners[i]) {
          namedListeners.splice(i, 1);
          i--;
          length--;
          continue;
        }
        try {
          // allow all listeners attached to the current scope to run
          namedListeners[i].apply(null, listenerArgs);
        } catch (e) {
          $exceptionHandler(e);
        }
      }
      // if any listener on the current scope stops propagation, prevent bubbling
      if (stopPropagation) {
        break;
      }
      // traverse upwards
      scope = /** @type {Scope} */ scope.$parent;
    } while (scope);

    event.currentScope = null;

    return event;
  }

  /**
   * Dispatches an event `name` downwards to all child scopes (and their children) notifying the
   * registered {@link ng.$rootScope.Scope#$on} listeners.
   *
   * The event life cycle starts at the scope on which `$broadcast` was called. All
   * {@link ng.$rootScope.Scope#$on listeners} listening for `name` event on this scope get
   * notified. Afterwards, the event propagates to all direct and indirect scopes of the current
   * scope and calls all registered listeners along the way. The event cannot be canceled.
   *
   * Any exception emitted from the {@link ng.$rootScope.Scope#$on listeners} will be passed
   * onto the {@link ng.$exceptionHandler $exceptionHandler} service.
   *
   * @param {string} name Event name to broadcast.
   * @param {...*} args Optional one or more arguments which will be passed onto the event listeners.
   * @return {Object} Event object, see {@link ng.$rootScope.Scope#$on}
   */
  $broadcast(name, ...args) {
    const target = this;
    /** @type {Scope} */
    let current = target;

    /** @type {Scope} */
    let next = target;
    const event = {
      name,
      targetScope: target,
      preventDefault() {
        event.defaultPrevented = true;
      },
      defaultPrevented: false,
    };

    if (!target.$$listenerCount[name]) return event;

    const listenerArgs = concat([event], [event].concat(args), 1);
    let listeners;
    let i;
    let length;

    // down while you can, then up and next sibling or up and next sibling until back at root
    while ((current = next)) {
      event.currentScope = current;
      listeners = current.$$listeners.get(name) || [];
      for (i = 0, length = listeners.length; i < length; i++) {
        // if listeners were deregistered, defragment the array
        if (!listeners[i]) {
          listeners.splice(i, 1);
          i--;
          length--;
          continue;
        }

        try {
          listeners[i].apply(null, listenerArgs);
        } catch (e) {
          $exceptionHandler(e);
        }
      }

      // Insanity Warning: scope depth-first traversal
      // yes, this code is a bit crazy, but it works and we have tests to prove it!
      // this piece should be kept in sync with the traversal in $digest
      // (though it differs due to having the extra check for $$listenerCount and
      // does not check $$suspended)
      if (
        !(next =
          (current.$$listenerCount[name] && current.$$childHead) ||
          (current !== target && current.$$nextSibling))
      ) {
        // TODO: current check fixes "contents are destroyed along with transcluding directive" test which sets current to null
        while (
          current &&
          current !== target &&
          !(next = current.$$nextSibling)
        ) {
          current = current.$parent;
        }
      }
    }

    event.currentScope = null;
    return event;
  }
}

/**
 * function used as an initial value for watchers.
 * because it's unique we can easily tell it apart from other values
 */
function initWatchVal() {}

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

/**
 * Counts all the watchers of direct and indirect child scopes of the current scope.
 *
 * The watchers of the current scope are included in the count and so are all the watchers of
 * isolate child scopes.
 * @param {Scope} scope
 * @returns {number} Total number of watchers.
 */
export function countWatchers(scope) {
  var count = scope.$$watchers ? scope.$$watchers.length : 0; // include the current scope
  var pendingChildHeads = [scope.$$childHead];
  var currentScope;

  while (pendingChildHeads.length) {
    currentScope = pendingChildHeads.shift();

    while (currentScope) {
      count += currentScope.$$watchers ? currentScope.$$watchers.length : 0;
      pendingChildHeads.push(currentScope.$$childHead);
      currentScope = currentScope.$$nextSibling;
    }
  }

  return count;
}

/**
 * Counts all the direct and indirect child scopes of the current scope.
 *
 * The current scope is excluded from the count. The count includes all isolate child scopes.
 * @param {Scope} scope
 * @returns {number} Total number of child scopes.
 */
export function countChildScopes(scope) {
  var count = 0; // exclude the current scope
  var pendingChildHeads = [scope.$$childHead];
  var currentScope;

  while (pendingChildHeads.length) {
    currentScope = pendingChildHeads.shift();

    while (currentScope) {
      count += 1;
      pendingChildHeads.push(currentScope.$$childHead);
      currentScope = currentScope.$$nextSibling;
    }
  }

  return count;
}
