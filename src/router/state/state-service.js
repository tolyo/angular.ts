import {
  createProxyFunctions,
  defaults,
  removeFrom,
  silenceUncaughtInPromise,
  silentRejection,
} from "../../shared/common";
import { isDefined, isObject, isString, minErr } from "../../shared/utils";
import { Queue } from "../common/queue";
import { makeTargetState } from "../path/path-utils";
import { PathNode } from "../path/path-node";
import { defaultTransOpts } from "../transition/transition-service";
import { Rejection, RejectType } from "../transition/reject-factory";
import { TargetState } from "./target-state";
import { Param } from "../params/param";
import { Glob } from "../common/glob";
import { ResolveContext } from "../resolve/resolve-context";
import { lazyLoadState } from "../hooks/lazy-load";
import { val } from "../../shared/hof";
import { EventBus } from "../../core/pubsub/pubsub";

const err = minErr("$stateProvider");

/**
 * Provides services related to ui-router states.
 *
 * This API is located at `router.stateService` ([[UIRouter.stateService]])
 */
export class StateProvider {
  /**
   * The latest successful state parameters
   *
   * @deprecated This is a passthrough through to [[UIRouterGlobals.params]]
   */
  get params() {
    return this.globals.params;
  }
  /**
   * The current [[StateDeclaration]]
   *
   * @deprecated This is a passthrough through to [[UIRouterGlobals.current]]
   */
  get current() {
    return this.globals.current;
  }
  /**
   * The current [[StateObject]] (an internal API)
   *
   * @deprecated This is a passthrough through to [[UIRouterGlobals.$current]]
   */
  get $current() {
    return this.globals.$current;
  }

  static $inject = ["$routerGlobalsProvider", "$transitionsProvider"];

  // Needs access to urlService, stateRegistry
  constructor(globals, transitionService) {
    this.stateRegistry = undefined;
    this.urlService = undefined;
    this.globals = globals;
    this.transitionService = transitionService;
    this.invalidCallbacks = [];

    this._defaultErrorHandler = function $defaultErrorHandler($error$) {
      if ($error$ instanceof Error && $error$.stack) {
        throw $error$;
      } else if ($error$ instanceof Rejection) {
        throw new Error($error$.toString());
      } else {
        throw new Error($error$);
      }
    };
    const getters = ["current", "$current", "params", "transition"];
    const boundFns = Object.keys(StateProvider.prototype).filter(
      (x) => !getters.includes(x),
    );
    createProxyFunctions(
      val(StateProvider.prototype),
      this,
      val(this),
      boundFns,
    );

    EventBus.subscribe("$stateService:defaultErrorHandler", (err) =>
      this.defaultErrorHandler()(err),
    );
  }

  $get = () => this;

  /**
   * Decorates states when they are registered
   *
   * Allows you to extend (carefully) or override (at your own peril) the
   * `stateBuilder` object used internally by [[StateRegistry]].
   * This can be used to add custom functionality to ui-router,
   * for example inferring templateUrl based on the state name.
   *
   * When passing only a name, it returns the current (original or decorated) builder
   * function that matches `name`.
   *
   * The builder functions that can be decorated are listed below. Though not all
   * necessarily have a good use case for decoration, that is up to you to decide.
   *
   * In addition, users can attach custom decorators, which will generate new
   * properties within the state's internal definition. There is currently no clear
   * use-case for this beyond accessing internal states (i.e. $state.$current),
   * however, expect this to become increasingly relevant as we introduce additional
   * meta-programming features.
   *
   * **Warning**: Decorators should not be interdependent because the order of
   * execution of the builder functions in non-deterministic. Builder functions
   * should only be dependent on the state definition object and super function.
   *
   *
   * Existing builder functions and current return values:
   *
   * - **parent** `{object}` - returns the parent state object.
   * - **data** `{object}` - returns state data, including any inherited data that is not
   *   overridden by own values (if any).
   * - **url** `{object}` - returns a {@link ui.router.util.type:UrlMatcher UrlMatcher}
   *   or `null`.
   * - **navigable** `{object}` - returns closest ancestor state that has a URL (aka is
   *   navigable).
   * - **params** `{object}` - returns an array of state params that are ensured to
   *   be a super-set of parent's params.
   * - **views** `{object}` - returns a views object where each key is an absolute view
   *   name (i.e. "viewName@stateName") and each value is the config object
   *   (template, controller) for the view. Even when you don't use the views object
   *   explicitly on a state config, one is still created for you internally.
   *   So by decorating this builder function you have access to decorating template
   *   and controller properties.
   * - **ownParams** `{object}` - returns an array of params that belong to the state,
   *   not including any params defined by ancestor states.
   * - **path** `{string}` - returns the full path from the root down to this state.
   *   Needed for state activation.
   * - **includes** `{object}` - returns an object that includes every state that
   *   would pass a `$state.includes()` test.
   *
   * #### Example:
   * Override the internal 'views' builder with a function that takes the state
   * definition, and a reference to the internal function being overridden:
   * ```js
   * $stateProvider.decorator('views', function (state, parent) {
   *   let result = {},
   *       views = parent(state);
   *
   *   angular.forEach(views, function (config, name) {
   *     let autoName = (state.name + '.' + name).replace('.', '/');
   *     config.templateUrl = config.templateUrl || '/partials/' + autoName + '.html';
   *     result[name] = config;
   *   });
   *   return result;
   * });
   *
   * $stateProvider.state('home', {
   *   views: {
   *     'contact.list': { controller: 'ListController' },
   *     'contact.item': { controller: 'ItemController' }
   *   }
   * });
   * ```
   *
   *
   * ```js
   * // Auto-populates list and item views with /partials/home/contact/list.html,
   * // and /partials/home/contact/item.html, respectively.
   * $state.go('home');
   * ```
   *
   * @param {string} name The name of the builder function to decorate.
   * @param {object} func A function that is responsible for decorating the original
   * builder function. The function receives two parameters:
   *
   *   - `{object}` - state - The state config object.
   *   - `{object}` - super - The original builder function.
   *
   * @return {object} $stateProvider - $stateProvider instance
   */
  decorator(name, func) {
    return this.stateRegistry.decorator(name, func) || this;
  }

  /**
   *
   * @param {any} definition
   */
  state(definition) {
    if (!definition.name) {
      throw err("stateinvalid", `'name' required`);
    }
    try {
      this.stateRegistry.register(definition);
    } catch (e) {
      throw err("stateinvalid", e.message);
    }
    return this;
  }

  /**
   * Handler for when [[transitionTo]] is called with an invalid state.
   *
   * Invokes the [[onInvalid]] callbacks, in natural order.
   * Each callback's return value is checked in sequence until one of them returns an instance of TargetState.
   * The results of the callbacks are wrapped in $q.resolve(), so the callbacks may return promises.
   *
   * If a callback returns an TargetState, then it is used as arguments to $state.transitionTo() and the result returned.
   *
   * @internal
   */
  _handleInvalidTargetState(fromPath, toState) {
    const fromState = makeTargetState(this.stateRegistry, fromPath);
    const globals = this.globals;
    const latestThing = () => globals.transitionHistory.peekTail();
    const latest = latestThing();
    const callbackQueue = new Queue(this.invalidCallbacks.slice());
    const injector = new ResolveContext(fromPath).injector();
    const checkForRedirect = (result) => {
      if (!(result instanceof TargetState)) {
        return;
      }
      let target = result;
      // Recreate the TargetState, in case the state is now defined.
      target = this.target(
        target.identifier(),
        target.params(),
        target.options(),
      );
      if (!target.valid()) {
        return Rejection.invalid(target.error()).toPromise();
      }
      if (latestThing() !== latest) {
        return Rejection.superseded().toPromise();
      }
      return this.transitionTo(
        target.identifier(),
        target.params(),
        target.options(),
      );
    };
    function invokeNextCallback() {
      const nextCallback = callbackQueue.dequeue();
      if (nextCallback === undefined)
        return Rejection.invalid(toState.error()).toPromise();
      const callbackResult = Promise.resolve(
        nextCallback(toState, fromState, injector),
      );
      return callbackResult
        .then(checkForRedirect)
        .then((result) => result || invokeNextCallback());
    }
    return invokeNextCallback();
  }
  /**
   * Registers an Invalid State handler
   *
   * Registers a [[OnInvalidCallback]] function to be invoked when [[StateService.transitionTo]]
   * has been called with an invalid state reference parameter
   *
   * Example:
   * ```js
   * stateService.onInvalid(function(to, from, injector) {
   *   if (to.name() === 'foo') {
   *     let lazyLoader = injector.get('LazyLoadService');
   *     return lazyLoader.load('foo')
   *         .then(() => stateService.target('foo'));
   *   }
   * });
   * ```
   *
   * @param {function} callback invoked when the toState is invalid
   *   This function receives the (invalid) toState, the fromState, and an injector.
   *   The function may optionally return a [[TargetState]] or a Promise for a TargetState.
   *   If one is returned, it is treated as a redirect.
   *
   * @returns a function which deregisters the callback
   */
  onInvalid(callback) {
    this.invalidCallbacks.push(callback);
    return function deregisterListener() {
      removeFrom(this.invalidCallbacks)(callback);
    }.bind(this);
  }
  /**
   * Reloads the current state
   *
   * A method that force reloads the current state, or a partial state hierarchy.
   * All resolves are re-resolved, and components reinstantiated.
   *
   * #### Example:
   * ```js
   * let app angular.module('app', ['ui.router']);
   *
   * app.controller('ctrl', function ($scope, $state) {
   *   $scope.reload = function(){
   *     $state.reload();
   *   }
   * });
   * ```
   *
   * Note: `reload()` is just an alias for:
   *
   * ```js
   * $state.transitionTo($state.current, $state.params, {
   *   reload: true, inherit: false
   * });
   * ```
   *
   * @param reloadState A state name or a state object.
   *    If present, this state and all its children will be reloaded, but ancestors will not reload.
   *
   * #### Example:
   * ```js
   * //assuming app application consists of 3 states: 'contacts', 'contacts.detail', 'contacts.detail.item'
   * //and current state is 'contacts.detail.item'
   * let app angular.module('app', ['ui.router']);
   *
   * app.controller('ctrl', function ($scope, $state) {
   *   $scope.reload = function(){
   *     //will reload 'contact.detail' and nested 'contact.detail.item' states
   *     $state.reload('contact.detail');
   *   }
   * });
   * ```
   *
   * @returns A promise representing the state of the new transition. See [[StateService.go]]
   */
  reload(reloadState) {
    return this.transitionTo(this.globals.current, this.globals.params, {
      reload: isDefined(reloadState) ? reloadState : true,
      inherit: false,
      notify: false,
    });
  }
  /**
   * Transition to a different state and/or parameters
   *
   * Convenience method for transitioning to a new state.
   *
   * `$state.go` calls `$state.transitionTo` internally but automatically sets options to
   * `{ location: true, inherit: true, relative: router.globals.$current, notify: true }`.
   * This allows you to use either an absolute or relative `to` argument (because of `relative: router.globals.$current`).
   * It also allows you to specify * only the parameters you'd like to update, while letting unspecified parameters
   * inherit from the current parameter values (because of `inherit: true`).
   *
   * #### Example:
   * ```js
   * let app = angular.module('app', ['ui.router']);
   *
   * app.controller('ctrl', function ($scope, $state) {
   *   $scope.changeState = function () {
   *     $state.go('contact.detail');
   *   };
   * });
   * ```
   *
   * @param to Absolute state name, state object, or relative state path (relative to current state).
   *
   * Some examples:
   *
   * - `$state.go('contact.detail')` - will go to the `contact.detail` state
   * - `$state.go('^')` - will go to the parent state
   * - `$state.go('^.sibling')` - if current state is `home.child`, will go to the `home.sibling` state
   * - `$state.go('.child.grandchild')` - if current state is home, will go to the `home.child.grandchild` state
   *
   * @param params A map of the parameters that will be sent to the state, will populate $stateParams.
   *
   *    Any parameters that are not specified will be inherited from current parameter values (because of `inherit: true`).
   *    This allows, for example, going to a sibling state that shares parameters defined by a parent state.
   *
   * @param options Transition options
   *
   * @returns {promise} A promise representing the state of the new transition.
   */
  go(to, params, options) {
    const defautGoOpts = { relative: this.$current, inherit: true };
    const transOpts = defaults(options, defautGoOpts, defaultTransOpts);
    return this.transitionTo(to, params, transOpts);
  }
  /**
   * Creates a [[TargetState]]
   *
   * This is a factory method for creating a TargetState
   *
   * This may be returned from a Transition Hook to redirect a transition, for example.
   */
  target(identifier, params, options = {}) {
    // If we're reloading, find the state object to reload from
    if (isObject(options.reload) && !options.reload.name)
      throw new Error("Invalid reload state object");
    const reg = this.stateRegistry;
    options.reloadState =
      options.reload === true
        ? reg.root()
        : reg.matcher.find(options.reload, options.relative);
    if (options.reload && !options.reloadState)
      throw new Error(
        `No such reload state '${isString(options.reload) ? options.reload : options.reload.name}'`,
      );
    return new TargetState(this.stateRegistry, identifier, params, options);
  }

  getCurrentPath() {
    const globals = this.globals;
    const latestSuccess = globals.successfulTransitions.peekTail();
    const rootPath = () => [new PathNode(this.stateRegistry.root())];
    return latestSuccess ? latestSuccess.treeChanges().to : rootPath();
  }
  /**
   * Low-level method for transitioning to a new state.
   *
   * The [[go]] method (which uses `transitionTo` internally) is recommended in most situations.
   *
   * #### Example:
   * ```js
   * let app = angular.module('app', ['ui.router']);
   *
   * app.controller('ctrl', function ($scope, $state) {
   *   $scope.changeState = function () {
   *     $state.transitionTo('contact.detail');
   *   };
   * });
   * ```
   *
   * @param to State name or state object.
   * @param toParams A map of the parameters that will be sent to the state,
   *      will populate $stateParams.
   * @param options Transition options
   *
   * @returns A promise representing the state of the new transition. See [[go]]
   */
  transitionTo(to, toParams = {}, options = {}) {
    options = defaults(options, defaultTransOpts);
    const getCurrent = () => this.globals.transition;
    options = Object.assign(options, { current: getCurrent });
    const ref = this.target(to, toParams, options);
    const currentPath = this.getCurrentPath();
    if (!ref.exists()) return this._handleInvalidTargetState(currentPath, ref);
    if (!ref.valid()) return silentRejection(ref.error());
    if (options.supercede === false && getCurrent()) {
      return Rejection.ignored(
        "Another transition is in progress and supercede has been set to false in TransitionOptions for the transition. So the transition was ignored in favour of the existing one in progress.",
      ).toPromise();
    }
    /**
     * Special handling for Ignored, Aborted, and Redirected transitions
     *
     * The semantics for the transition.run() promise and the StateService.transitionTo()
     * promise differ. For instance, the run() promise may be rejected because it was
     * IGNORED, but the transitionTo() promise is resolved because from the user perspective
     * no error occurred.  Likewise, the transition.run() promise may be rejected because of
     * a Redirect, but the transitionTo() promise is chained to the new Transition's promise.
     */
    const rejectedTransitionHandler = (trans) => (error) => {
      if (error instanceof Rejection) {
        const isLatest = this.globals.lastStartedTransitionId <= trans.$id;
        if (error.type === RejectType.IGNORED) {
          isLatest && this.urlService.update();
          // Consider ignored `Transition.run()` as a successful `transitionTo`
          return Promise.resolve(this.globals.current);
        }
        const detail = error.detail;
        if (
          error.type === RejectType.SUPERSEDED &&
          error.redirected &&
          detail instanceof TargetState
        ) {
          // If `Transition.run()` was redirected, allow the `transitionTo()` promise to resolve successfully
          // by returning the promise for the new (redirect) `Transition.run()`.
          const redirect = trans.redirect(detail);
          return redirect.run().catch(rejectedTransitionHandler(redirect));
        }
        if (error.type === RejectType.ABORTED) {
          isLatest && this.urlService.update();
          return Promise.reject(error);
        }
      }
      const errorHandler = this.defaultErrorHandler();
      errorHandler(error);
      return Promise.reject(error);
    };
    const transition = this.transitionService.create(currentPath, ref);
    const transitionToPromise = transition
      .run()
      .catch(rejectedTransitionHandler(transition));
    silenceUncaughtInPromise(transitionToPromise); // issue #2676
    // Return a promise for the transition, which also has the transition object on it.
    return Object.assign(transitionToPromise, { transition });
  }
  /**
   * Checks if the current state *is* the provided state
   *
   * Similar to [[includes]] but only checks for the full state name.
   * If params is supplied then it will be tested for strict equality against the current
   * active params object, so all params must match with none missing and no extras.
   *
   * #### Example:
   * ```js
   * $state.$current.name = 'contacts.details.item';
   *
   * // absolute name
   * $state.is('contact.details.item'); // returns true
   * $state.is(contactDetailItemStateObject); // returns true
   * ```
   *
   * // relative name (. and ^), typically from a template
   * // E.g. from the 'contacts.details' template
   * ```html
   * <div ng-class="{highlighted: $state.is('.item')}">Item</div>
   * ```
   *
   * @param stateOrName The state name (absolute or relative) or state object you'd like to check.
   * @param params A param object, e.g. `{sectionId: section.id}`, that you'd like
   * to test against the current active state.
   * @param options An options object. The options are:
   *   - `relative`: If `stateOrName` is a relative state name and `options.relative` is set, .is will
   *     test relative to `options.relative` state (or name).
   *
   * @returns Returns true if it is the state.
   */
  is(stateOrName, params, options) {
    options = defaults(options, { relative: this.$current });
    const state = this.stateRegistry.matcher.find(
      stateOrName,
      options.relative,
    );
    if (!isDefined(state)) return undefined;
    if (this.$current !== state) return false;
    if (!params) return true;
    const schema = state.parameters({ inherit: true, matchingKeys: params });
    return Param.equals(
      schema,
      Param.values(schema, params),
      this.globals.params,
    );
  }
  /**
   * Checks if the current state *includes* the provided state
   *
   * A method to determine if the current active state is equal to or is the child of the
   * state stateName. If any params are passed then they will be tested for a match as well.
   * Not all the parameters need to be passed, just the ones you'd like to test for equality.
   *
   * #### Example when `$state.$current.name === 'contacts.details.item'`
   * ```js
   * // Using partial names
   * $state.includes("contacts"); // returns true
   * $state.includes("contacts.details"); // returns true
   * $state.includes("contacts.details.item"); // returns true
   * $state.includes("contacts.list"); // returns false
   * $state.includes("about"); // returns false
   * ```
   *
   * #### Glob Examples when `* $state.$current.name === 'contacts.details.item.url'`:
   * ```js
   * $state.includes("*.details.*.*"); // returns true
   * $state.includes("*.details.**"); // returns true
   * $state.includes("**.item.**"); // returns true
   * $state.includes("*.details.item.url"); // returns true
   * $state.includes("*.details.*.url"); // returns true
   * $state.includes("*.details.*"); // returns false
   * $state.includes("item.**"); // returns false
   * ```
   *
   * @param stateOrName A partial name, relative name, glob pattern,
   *   or state object to be searched for within the current state name.
   * @param params A param object, e.g. `{sectionId: section.id}`,
   *   that you'd like to test against the current active state.
   * @param options An options object. The options are:
   *   - `relative`: If `stateOrName` is a relative state name and `options.relative` is set, .is will
   *     test relative to `options.relative` state (or name).
   *
   * @returns {boolean} Returns true if it does include the state
   */
  includes(stateOrName, params, options) {
    options = defaults(options, { relative: this.$current });
    const glob = isString(stateOrName) && Glob.fromString(stateOrName);
    if (glob) {
      if (!glob.matches(this.$current.name)) return false;
      stateOrName = this.$current.name;
    }
    const state = this.stateRegistry.matcher.find(
        stateOrName,
        options.relative,
      ),
      include = this.$current.includes;
    if (!isDefined(state)) return undefined;
    if (!isDefined(include[state.name])) return false;
    if (!params) return true;
    const schema = state.parameters({ inherit: true, matchingKeys: params });
    return Param.equals(
      schema,
      Param.values(schema, params),
      this.globals.params,
    );
  }
  /**
   * Generates a URL for a state and parameters
   *
   * Returns the url for the given state populated with the given params.
   *
   * #### Example:
   * ```js
   * expect($state.href("about.person", { person: "bob" })).toEqual("/about/bob");
   * ```
   *
   * @param stateOrName The state name or state object you'd like to generate a url from.
   * @param params An object of parameter values to fill the state's required parameters.
   * @param options Options object. The options are:
   *
   * @returns {string} compiled state url
   */
  href(stateOrName, params, options) {
    const defaultHrefOpts = {
      lossy: true,
      inherit: true,
      absolute: false,
      relative: this.$current,
    };
    options = defaults(options, defaultHrefOpts);
    params = params || {};
    const state = this.stateRegistry.matcher.find(
      stateOrName,
      options.relative,
    );
    if (!isDefined(state)) return null;
    if (options.inherit)
      params = this.globals.params.$inherit(params, this.$current, state);
    const nav = state && options.lossy ? state.navigable : state;
    if (!nav || nav.url === undefined || nav.url === null) {
      return null;
    }
    return this.urlService.href(nav.url, params, {
      absolute: options.absolute,
    });
  }
  /**
   * Sets or gets the default [[transitionTo]] error handler.
   *
   * The error handler is called when a [[Transition]] is rejected or when any error occurred during the Transition.
   * This includes errors caused by resolves and transition hooks.
   *
   * Note:
   * This handler does not receive certain Transition rejections.
   * Redirected and Ignored Transitions are not considered to be errors by [[StateService.transitionTo]].
   *
   * The built-in default error handler logs the error to the console.
   *
   * You can provide your own custom handler.
   *
   * #### Example:
   * ```js
   * stateService.defaultErrorHandler(function() {
   *   // Do not log transitionTo errors
   * });
   * ```
   *
   * @param handler a global error handler function
   * @returns the current global error handler
   */
  defaultErrorHandler(handler) {
    return (this._defaultErrorHandler = handler || this._defaultErrorHandler);
  }

  get(stateOrName, base) {
    const reg = this.stateRegistry;
    if (arguments.length === 0) return reg.get();
    return reg.get(stateOrName, base || this.$current);
  }
  /**
   * Lazy loads a state
   *
   * Explicitly runs a state's [[StateDeclaration.lazyLoad]] function.
   *
   * @param stateOrName the state that should be lazy loaded
   * @param transition the optional Transition context to use (if the lazyLoad function requires an injector, etc)
   * Note: If no transition is provided, a noop transition is created using the from the current state to the current state.
   * This noop transition is not actually run.
   *
   * @returns a promise to lazy load
   */
  lazyLoad(stateOrName, transition) {
    const state = this.get(stateOrName);
    if (!state || !state.lazyLoad)
      throw new Error("Can not lazy load " + stateOrName);
    const currentPath = this.getCurrentPath();
    const target = makeTargetState(this.stateRegistry, currentPath);
    transition =
      transition || this.transitionService.create(currentPath, target);
    return lazyLoadState(transition, state);
  }
}
