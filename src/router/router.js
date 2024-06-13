import { UrlMatcherFactory } from "./url/url-matcher-factory";
import { UrlRouter } from "./url/url-router";
import { TransitionService } from "./transition/transition-service";
import { ViewService } from "./view/view";
import { StateRegistry } from "./state/state-registry";
import { StateService } from "./state/state-service";
import { UIRouterGlobals } from "./globals";
import { removeFrom } from "../shared/common";
import { isFunction } from "../shared/utils";
import { UrlService } from "./url/url-service";
import { trace } from "./common/trace";

/**
 * Router id tracker
 * @type {number}
 */
let routerId = 0;

/**
 * An instance of UI-Router.
 * @class
 *
 * This object contains references to service APIs which define your application's routing behavior.
 */
export class UIRouter {
  /**
   * Creates a new `UIRouter` object
   *
   * @param {import('./location-services').Ng1LocationServices} locationService
   */
  constructor(locationService) {
    /**
     * @type {import('./location-services').Ng1LocationServices}
     */
    this.locationService = locationService;
    /**  @type {number} */ this.$id = routerId++;
    /**  @type {boolean} */ this._disposed = false;
    this._disposables = [];
    /** Enable/disable tracing to the javascript console */
    this.trace = trace;
    /** Provides services related to ui-view synchronization */
    this.viewService = new ViewService(this);
    /** @type {UIRouterGlobals} An object that contains global router state, such as the current state and params */
    this.globals = new UIRouterGlobals();
    /** @type {TransitionService}  A service that exposes global Transition Hooks */
    this.transitionService = new TransitionService(this);
    /**
     * Deprecated for public use. Use [[urlService]] instead.
     * @deprecated Use [[urlService]] instead
     */
    this.urlMatcherFactory = new UrlMatcherFactory(this);
    /**
     * Deprecated for public use. Use [[urlService]] instead.
     * @deprecated Use [[urlService]] instead
     */
    this.urlRouter = new UrlRouter(this);
    /** Provides services related to the URL */
    this.urlService = new UrlService(this);
    /** Provides a registry for states, and related registration services */
    this.stateRegistry = new StateRegistry(this);
    /** Provides services related to states */
    this.stateService = new StateService(this);
    /** @internal plugin instances are registered here */
    this._plugins = {};
    this.viewService._pluginapi._rootViewContext(this.stateRegistry.root());
    this.globals.$current = this.stateRegistry.root();
    this.globals.current = this.globals.$current.self;
    this.disposable(this.globals);
    this.disposable(this.stateService);
    this.disposable(this.stateRegistry);
    this.disposable(this.transitionService);
    this.disposable(this.urlService);
    this.disposable(locationService);
  }

  /**
   * Registers an object to be notified when the router is disposed
   * @param {Disposable} disposable
   * @returns {void}
   */
  disposable(disposable) {
    this._disposables.push(disposable);
  }
  /**
   * Disposes this router instance
   *
   * When called, clears resources retained by the router by calling `dispose(this)` on all
   * registered [[disposable]] objects.
   *
   * Or, if a `disposable` object is provided, calls `dispose(this)` on that object only.
   *
   * @internal
   * @param disposable (optional) the disposable to dispose
   */
  dispose(disposable) {
    if (disposable && isFunction(disposable.dispose)) {
      disposable.dispose(this);
      return undefined;
    }
    this._disposed = true;
    this._disposables.slice().forEach((d) => {
      try {
        typeof d.dispose === "function" && d.dispose(this);
        removeFrom(this._disposables, d);
      } catch (ignored) {
        /* empty */
      }
    });
  }

  /**
   * Adds a plugin to UI-Router
   *
   * This method adds a UI-Router Plugin.
   * A plugin can enhance or change UI-Router behavior using any public API.
   *
   * #### Example:
   * ```js
   * import { MyCoolPlugin } from "ui-router-cool-plugin";
   *
   * var plugin = router.addPlugin(MyCoolPlugin);
   * ```
   *
   * ### Plugin authoring
   *
   * A plugin is simply a class (or constructor function) which accepts a [[UIRouter]] instance and (optionally) an options object.
   *
   * The plugin can implement its functionality using any of the public APIs of [[UIRouter]].
   * For example, it may configure router options or add a Transition Hook.
   *
   * The plugin can then be published as a separate module.
   *
   * #### Example:
   * ```js
   * export class MyAuthPlugin implements UIRouterPlugin {
   *   constructor(router: UIRouter, options: any) {
   *     this.name = "MyAuthPlugin";
   *     let $transitions = router.transitionService;
   *     let $state = router.stateService;
   *
   *     let authCriteria = {
   *       to: (state) => state.data && state.data.requiresAuth
   *     };
   *
   *     function authHook(transition: Transition) {
   *       let authService = transition.injector().get('AuthService');
   *       if (!authService.isAuthenticated()) {
   *         return $state.target('login');
   *       }
   *     }
   *
   *     $transitions.onStart(authCriteria, authHook);
   *   }
   * }
   * ```
   *
   * @param plugin one of:
   *        - a plugin class which implements [[UIRouterPlugin]]
   *        - a constructor function for a [[UIRouterPlugin]] which accepts a [[UIRouter]] instance
   *        - a factory function which accepts a [[UIRouter]] instance and returns a [[UIRouterPlugin]] instance
   * @param options options to pass to the plugin class/factory
   * @returns the registered plugin instance
   */
  plugin(plugin, options = {}) {
    const pluginInstance = new plugin(this, options);
    if (!pluginInstance.name)
      throw new Error(
        "Required property `name` missing on plugin: " + pluginInstance,
      );
    this._disposables.push(pluginInstance);
    return (this._plugins[pluginInstance.name] = pluginInstance);
  }
  getPlugin(pluginName) {
    return pluginName
      ? this._plugins[pluginName]
      : Object.values(this._plugins);
  }
}
