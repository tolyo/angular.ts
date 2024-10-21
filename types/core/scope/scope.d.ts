/**
 * Counts all the watchers of direct and indirect child scopes of the current scope.
 *
 * The watchers of the current scope are included in the count and so are all the watchers of
 * isolate child scopes.
 * @param {Scope} scope
 * @returns {number} Total number of watchers.
 */
export function countWatchers(scope: Scope): number;
/**
 * Counts all the direct and indirect child scopes of the current scope.
 *
 * The current scope is excluded from the count. The count includes all isolate child scopes.
 * @param {Scope} scope
 * @returns {number} Total number of child scopes.
 */
export function countChildScopes(scope: Scope): number;
export type ScopePhase = number;
export namespace ScopePhase {
    let NONE: number;
    let APPLY: number;
    let DIGEST: number;
}
/**
 * The number of digest iterations
 */
export type TTL = number;
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
export const TTL: TTL;
/** @type {AsyncQueueTask[]} */
export const $$asyncQueue: AsyncQueueTask[];
export const $postUpdateQueue: any[];
/**
 * @type {Function[]}
 */
export const $$applyAsyncQueue: Function[];
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
    rootScope: Scope;
    $get: (string | ((exceptionHandler: import("../exception-handler").ErrorHandler, parse: import("../parse/parse").ParseService, browser: import("../../services/browser").Browser) => Scope))[];
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
    constructor(root?: boolean);
    /**
     * @type {boolean}
     */
    isRoot: boolean;
    /**
     * @type {number} Unique scope ID (monotonically increasing) useful for debugging.
     */
    $id: number;
    /** @type {ScopePhase} */
    $$phase: ScopePhase;
    /**
     * @type {?Scope} Reference to the parent scope.
     */
    $parent: Scope | null;
    /**
     * @type {?Scope}
     */
    $root: Scope | null;
    /**
     * @type {Array<any>}
     */
    $$watchers: Array<any>;
    /**
     * @type {number}
     */
    $$digestWatchIndex: number;
    /**
     * @type {?Scope}
     */
    $$nextSibling: Scope | null;
    /**
     * @type {?Scope}
     */
    $$prevSibling: Scope | null;
    /**
     * @type {?Scope}
     */
    $$childHead: Scope | null;
    /**
     * @type {?Scope}
     */
    $$childTail: Scope | null;
    /** @type {boolean} */
    $$destroyed: boolean;
    /** @type {boolean} */
    $$suspended: boolean;
    /** @type {Map<String, Function[]>} */
    $$listeners: Map<string, Function[]>;
    /** @type {object} */
    $$listenerCount: object;
    /** @type {number} */
    $$watchersCount: number;
    $$isolateBindings: any;
    /**
     * @type {?Scope}
     */
    $$ChildScope: Scope | null;
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
    $new(isolate: boolean | null, parent?: Scope | null): Scope;
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
    $watch(watchExp: string | ((scope: Scope) => any) | import("../parse/parse.js").CompiledExpression, listener?: WatchListener, objectEquality?: boolean | undefined): () => any;
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
    $watchGroup(watchExpressions: Array<string | ((Scope: any) => any)>, listener: (arg0: any, arg1: any, arg2: Scope) => any): () => any;
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
    $watchCollection(obj: string | ((arg0: Scope) => any), listener: (arg0: any[], arg1: any[], arg2: Scope) => any): () => any;
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
    $digest(): void;
    /**
     * @param {ScopePhase} phase
     */
    beginPhase(phase: ScopePhase): void;
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
    $suspend(): void;
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
    $isSuspended(): boolean;
    /**
     * Resume watchers of this scope subtree in case it was suspended.
     *
     * See {@link $rootScope.Scope#$suspend} for information about the dangers of using this approach.
     */
    $resume(): void;
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
    $destroy(): void;
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
    $apply(expr?: string | ((arg0: Scope) => any)): any;
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
    $applyAsync(expr?: (string | (() => any)) | undefined): void;
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
    $evalAsync(expr?: (string | ((arg0: any) => any)) | undefined, locals?: (object) | undefined): number;
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
    $on(name: string, listener: (arg0: any) => any): () => any;
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
    $eval(expr?: string | ((arg0: Scope) => any), locals?: (object) | undefined): any;
    $postUpdate(fn: any): void;
    /**
     * @private
     */
    private retry;
    clearPhase(): void;
    /**
     * @param {number} count
     */
    incrementWatchersCount(count: number): void;
    /**
     * @param {number} count
     * @param {string} name
     */
    decrementListenerCount(count: number, name: string): void;
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
    $emit(name: string, ...args: any[]): any;
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
    $broadcast(name: string, ...args: any[]): any;
}
export type AsyncQueueTask = {
    scope: Scope;
    fn: Function;
    locals: any;
};
/**
 * Callback function triggered whenever the value of `watchExpression` changes.
 */
export type WatchListener = (arg0: any, arg1: any, arg2: Scope) => any;
export type WatchExpression = string | ((scope: Scope) => any);
