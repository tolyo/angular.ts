import {
  minErr,
  getNgAttribute,
  ngAttrPrefixes,
  assertNotHasOwnProperty,
  errorHandlingConfig,
} from "./shared/utils";
import { JQLite } from "./shared/jqlite/jqlite.js";
import { annotate, createInjector } from "./core/di/injector";
import { NgModule } from "./core/di/ng-module";
import { CACHE } from "./core/cache/cache";
import { publishExternalAPI } from "./public";
import { VERSION } from "./public";
import { services } from "./router/common/coreservices";
import { unnestR } from "./shared/common";

const ngMinErr = minErr("ng");
const $injectorMinErr = minErr("$injector");

/** @type {Object.<string, NgModule>} */
const modules = {};

/**
 * Configuration option for AngularTS bootstrap process.
 *
 * @typedef {Object} AngularBootstrapConfig
 * @property {boolean} [strictDi] - Disable automatic function annotation for the application. This is meant to assist in finding bugs which break minified code. Defaults to `false`.
 */

export class Angular {
  constructor() {
    CACHE.clear(); // a ensure new instance of angular gets a clean cache

    /** @type {Map<number, import("./core/cache/cache").ExpandoStore>} */
    this.cache = CACHE;

    /** @type {string} */
    this.version = VERSION;

    /** @type {typeof import('./shared/jqlite/jqlite').JQLite} */
    this.element = JQLite;

    /** @type {!Array<string|any>} */
    this.bootsrappedModules = [];

    /** @type {Function} */
    this.doBootstrap;
    publishExternalAPI(this);
  }

  /**
   * Configure several aspects of error handling if used as a setter or return the
   * current configuration if used as a getter.
   *
   * Omitted or undefined options will leave the corresponding configuration values unchanged.
   *
   * @param {import('./shared/utils').ErrorHandlingConfig} [config]
   * @returns {import('./shared/utils').ErrorHandlingConfig}
   */
  errorHandlingConfig(config) {
    return errorHandlingConfig(config);
  }

  /**
   * Use this function to manually start up AngularJS application.
   *
   * AngularJS will detect if it has been loaded into the browser more than once and only allow the
   * first loaded script to be bootstrapped and will report a warning to the browser console for
   * each of the subsequent scripts. This prevents strange results in applications, where otherwise
   * multiple instances of AngularJS try to work on the DOM.
   *   *
   * <div class="alert alert-warning">
   * **Note:** Do not bootstrap the app on an element with a directive that uses {@link ng.$compile#transclusion transclusion},
   * such as {@link ng.ngIf `ngIf`}, {@link ng.ngInclude `ngInclude`} and {@link ngRoute.ngView `ngView`}.
   * Doing this misplaces the app {@link ng.$rootElement `$rootElement`} and the app's {@link auto.$injector injector},
   * causing animations to stop working and making the injector inaccessible from outside the app.
   * </div>
   *
   * ```html
   * <!doctype html>
   * <html>
   * <body>
   * <div ng-controller="WelcomeController">
   *   {{greeting}}
   * </div>
   *
   * <script src="angular.js"></script>
   * <script>
   *   let app = angular.module('demo', [])
   *   .controller('WelcomeController', function($scope) {
   *       $scope.greeting = 'Welcome!';
   *   });
   *   angular.bootstrap(document, ['demo']);
   * </script>
   * </body>
   * </html>
   * ```
   *
   * @param {string | Element | Document} element DOM element which is the root of AngularJS application.
   * @param {Array<String|any>} [modules] an array of modules to load into the application.
   *     Each item in the array should be the name of a predefined module or a (DI annotated)
   *     function that will be invoked by the injector as a `config` block.
   *     See: {@link angular.module modules}
   * @param {AngularBootstrapConfig} [config] an object for defining configuration options for the application. The
   *     following keys are supported:
   *
   * * `strictDi` - disable automatic function annotation for the application. This is meant to
   *   assist in finding bugs which break minified code. Defaults to `false`.
   *
   * @returns {any} InjectorService - Returns the newly created injector for this app.
   */
  bootstrap(element, modules, config) {
    config = config || {
      strictDi: false,
    };

    const jqLite = JQLite(element);

    if (jqLite.injector()) {
      throw ngMinErr("btstrpd", "App already bootstrapped");
    }

    if (Array.isArray(modules)) {
      this.bootsrappedModules = modules;
    }

    this.bootsrappedModules.unshift([
      "$provide",
      ($provide) => {
        $provide.value("$rootElement", jqLite);
      },
    ]);

    this.bootsrappedModules.unshift("ng");

    const injector = createInjector(this.bootsrappedModules, config.strictDi);
    injector.invoke([
      "$rootScope",
      "$rootElement",
      "$compile",
      "$injector",
      /**
       * @param {import('./core/scope/scope').Scope} scope
       * @param {JQLite} el
       * @param {*} compile
       * @param {import("./core/di/internal-injector").InjectorService} $injector
       */
      function (scope, el, compile, $injector) {
        // ng-route deps
        services.$injector = $injector;
        el.data("$injector", $injector);
        compile(el)(scope);
        
        // https://github.com/angular-ui/ui-router/issues/3678
        if (!Object.prototype.hasOwnProperty.call($injector, "strictDi")) {
          try {
            $injector.invoke(() => {});
          } catch (error) {
            $injector.strictDi = !!/strict mode/.exec(
              error && error.toString(),
            );
          }
        }

        $injector
          .get("$stateRegistry")
          .get()
          .map((x) => x.$$state().resolvables)
          .reduce(unnestR, [])
          .filter((x) => x.deps === "deferred")
          .forEach(
            (resolvable) =>
              (resolvable.deps = annotate(
                resolvable.resolveFn,
                $injector.strictDi,
              )),
          );
      },
    ]);
    return injector;
  }

  /**
   *
   * @param {any[]} modules
   * @param {boolean?} strictDi
   * @returns {import("./core/di/internal-injector").InjectorService}
   */
  injector(modules, strictDi) {
    return createInjector(modules, strictDi);
  }

  resumeBootstrap(extraModules) {
    extraModules.forEach((module) => {
      this.bootsrappedModules.push(module);
    });
    return this.doBootstrap();
  }

  /**
   * @param {Element|Document} element
   */
  init(element) {
    let appElement;
    let module;
    const config = {};
    // The element `element` has priority over any other element.
    ngAttrPrefixes.forEach((prefix) => {
      const name = `${prefix}app`;
      if (
        /** @type {Element} */ (element).hasAttribute &&
        /** @type {Element} */ (element).hasAttribute(name)
      ) {
        appElement = element;
        module = /** @type {Element} */ (element).getAttribute(name);
      }
    });
    ngAttrPrefixes.forEach((prefix) => {
      const name = `${prefix}app`;
      let candidate;

      if (
        !appElement &&
        (candidate = element.querySelector(`[${name.replace(":", "\\:")}]`))
      ) {
        appElement = candidate;
        module = candidate.getAttribute(name);
      }
    });
    if (appElement) {
      config.strictDi = getNgAttribute(appElement, "strict-di") !== null;
      this.$injector = this.bootstrap(appElement, module ? [module] : [], config);
    }
  }

  /**
   *
   * The `angular.module` is a global place for creating, registering and retrieving AngularJS
   * modules.
   * All modules (AngularJS core or 3rd party) that should be available to an application must be
   * registered using this mechanism.
   *
   * Passing one argument retrieves an existing {@link import('./types').Module},
   * whereas passing more than one argument creates a new {@link import('./types').Module}
   *
   *
   * # Module
   *
   * A module is a collection of services, directives, controllers, filters, and configuration information.
   * `angular.module` is used to configure the {@link auto.$injector $injector}.
   *
   * ```js
   * // Create a new module
   * let myModule = angular.module('myModule', []);
   *
   * // register a new service
   * myModule.value('appName', 'MyCoolApp');
   *
   * // configure existing services inside initialization blocks.
   * myModule.config(['$locationProvider', function($locationProvider) {
   *   // Configure existing providers
   *   $locationProvider.hashPrefix('!');
   * }]);
   * ```
   *
   * Then you can create an injector and load your modules like this:
   *
   * ```js
   * let injector = angular.injector(['ng', 'myModule'])
   * ```
   *
   * However it's more likely that you'll just use
   * {@link ng.directive:ngApp ngApp} or
   * {@link angular.bootstrap} to simplify this process for you.
   *
   * @param {string} name The name of the module to create or retrieve.
   * @param {Array.<string>} [requires] If specified then new module is being created. If
   *        unspecified then the module is being retrieved for further configuration.
   * @param {Array<any>|Function} [configFn] Optional configuration function for the module. Same as
   *        {@link import('./types').Module#config Module#config()}.
   * @returns {NgModule} A newly registered module.
   */
  module(name, requires, configFn) {
    assertNotHasOwnProperty(name, "module");
    if (requires && Object.prototype.hasOwnProperty.call(modules, name)) {
      modules[name] = null;
    }
    return ensure(modules, name, () => {
      if (!requires) {
        throw $injectorMinErr(
          "nomod",
          "Module '{0}' is not available. Possibly misspelled or not loaded",
          name,
        );
      }
      const moduleInstance = new NgModule(
        name,
        requires,
        /** @type {Function} */ (configFn),
      );
      return moduleInstance;
    });
  }
}

function ensure(obj, name, factory) {
  return obj[name] || (obj[name] = factory());
}
