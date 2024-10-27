import { assertArgFn, minErr } from "../../shared/utils";
import { createModel } from "../model/model";
import { INJECTOR_LITERAL } from "./ng-module";

const ARROW_ARG = /^([^(]+?)=>/;
const FN_ARGS = /^[^(]*\(\s*([^)]*)\)/m;
const FN_ARG_SPLIT = /,/;
const FN_ARG = /^\s*(_?)(\S+?)\1\s*$/;
const STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/gm;
const $injectorMinErr = minErr(INJECTOR_LITERAL);

const providerSuffix = "Provider";
const INSTANTIATING = true;

class AbstractInjector {
  /**
   * @param {boolean} strictDi - Indicates if strict dependency injection is enforced.
   */
  constructor(strictDi) {
    /**
     * @type {Object<String, Function>}
     */
    this.cache = {};
    /** @type {boolean} */
    this.strictDi = strictDi;
    this.path = [];
    /** @type {Object.<string, import("../../types").Module>} */
    this.modules = {};
  }

  /**
   * Get a service by name.
   *
   * @param {string} serviceName
   * @returns {any}
   */
  get(serviceName) {
    if (Object.prototype.hasOwnProperty.call(this.cache, serviceName)) {
      if (this.cache[serviceName] === INSTANTIATING) {
        throw $injectorMinErr(
          "cdep",
          "Circular dependency found: {0}",
          `${serviceName} <- ${this.path.join(" <- ")}`,
        );
      }
      return this.cache[serviceName];
    }

    this.path.unshift(serviceName);
    this.cache[serviceName] = INSTANTIATING;
    try {
      // this goes to line 60
      this.cache[serviceName] = this.factory(serviceName);
    } catch (err) {
      // this is for the error handling being thrown by the providerCache multiple times
      delete this.cache[serviceName];
      throw err;
    }
    return this.cache[serviceName];
  }

  /**
   * Get the injection arguments for a function.
   *
   * @param {Function|Array} fn
   * @param {Object} locals
   * @param {string} serviceName
   * @returns
   */
  injectionArgs(fn, locals, serviceName) {
    const args = [];
    const $inject = annotate(fn, this.strictDi, serviceName);

    for (let i = 0, { length } = $inject; i < length; i++) {
      const key = $inject[i];
      if (typeof key !== "string") {
        throw $injectorMinErr(
          "itkn",
          "Incorrect injection token! Expected service name as string, got {0}",
          key,
        );
      }
      args.push(
        locals && Object.prototype.hasOwnProperty.call(locals, key)
          ? locals[key]
          : this.get(key),
      );
    }
    return args;
  }

  /**
   * Invoke a function with optional context and locals.
   *
   * @param {Function|String|Array<any>} fn
   * @param {*} [self]
   * @param {Object} [locals]
   * @param {string} [serviceName]
   * @returns
   */
  invoke(fn, self, locals, serviceName) {
    if (typeof locals === "string") {
      serviceName = locals;
      locals = null;
    }

    const args = this.injectionArgs(
      /** @type {Function} */ (fn),
      locals,
      serviceName,
    );
    if (Array.isArray(fn)) {
      fn = fn[fn.length - 1];
    }

    if (isClass(/** @type {string} */ (fn))) {
      args.unshift(null);
      const res = createModel(new (Function.prototype.bind.apply(fn, args))());
      return res;
    } else {
      return /** @type {Function} */ (fn).apply(self, args);
    }
  }

  /**
   * Instantiate a type constructor with optional locals.
   * @param {Function|Array} type
   * @param {*} [locals]
   * @param {string} [serviceName]
   */
  instantiate(type, locals, serviceName) {
    // Check if type is annotated and use just the given function at n-1 as parameter
    // e.g. someModule.factory('greeter', ['$window', function(renamed$window) {}]);
    const ctor = Array.isArray(type) ? type[type.length - 1] : type;
    const args = this.injectionArgs(type, locals, serviceName);
    // Empty object at position 0 is ignored for invocation with `new`, but required.
    args.unshift(null);
    return new (Function.prototype.bind.apply(ctor, args))();
  }

  /**
   * @abstract
   */
  loadNewModules() {}

  /**
   * @abstract
   * @param {string} _serviceName
   */
  factory(_serviceName) {
    console.error(`Unhandled ${_serviceName}`);
  }
}

/**
 * Injector for providers
 * @extends AbstractInjector
 */
export class ProviderInjector extends AbstractInjector {
  /**
   * @param {Object} cache
   * @param {boolean} strictDi - Indicates if strict dependency injection is enforced.
   */
  constructor(cache, strictDi) {
    super(strictDi);
    this.cache = cache;
  }

  /**
   * Factory method for creating services.
   * @param {string} caller - The name of the caller requesting the service.
   * @throws {Error} If the provider is unknown.
   */
  factory(caller) {
    this.path.push(caller);
    // prevents lookups to providers through get
    throw $injectorMinErr(
      "unpr",
      "Unknown provider: {0}",
      this.path.join(" <- "),
    );
  }
}

/**
 * Injector for factories and services
 * @extends AbstractInjector
 */
export class InjectorService extends AbstractInjector {
  /**
   *
   * @param {boolean} strictDi - Indicates if strict dependency injection is enforced.
   * @param {ProviderInjector} providerInjector
   */
  constructor(strictDi, providerInjector) {
    super(strictDi);
    this.providerInjector = providerInjector;
    this.modules = this.providerInjector.modules;
  }

  factory(serviceName) {
    const provider = this.providerInjector.get(serviceName + providerSuffix);
    const res = this.invoke(provider.$get, provider, undefined, serviceName);
    return res;
  }

  /**
   *
   * @param {string} name
   * @returns {boolean}
   */
  has(name) {
    const hasProvider = Object.prototype.hasOwnProperty.call(
      this.providerInjector.cache,
      name + providerSuffix,
    );
    const hasCache = Object.prototype.hasOwnProperty.call(this.cache, name);
    return hasProvider || hasCache;
  }
}

// Helpers

/**
 * @param {string} fn
 * @returns {string}
 */
function stringifyFn(fn) {
  return Function.prototype.toString.call(fn);
}

/**
 * @param {string} fn
 * @returns {Array<any>}
 */
function extractArgs(fn) {
  const fnText = stringifyFn(fn).replace(STRIP_COMMENTS, "");
  const args = fnText.match(ARROW_ARG) || fnText.match(FN_ARGS);
  return args;
}

/**
 * @param {string} func
 * @returns {boolean}
 */
function isClass(func) {
  return /^class\b/.test(stringifyFn(func));
}

/**
 *
 * @param {any} fn
 * @param {boolean} strictDi
 * @param {string} name
 * @returns {Array<string>}
 */
function annotate(fn, strictDi, name) {
  let $inject, argDecl, last;

  if (typeof fn === "function") {
    if (!($inject = fn.$inject)) {
      $inject = [];
      if (fn.length) {
        if (strictDi) {
          throw $injectorMinErr(
            "strictdi",
            "{0} is not using explicit annotation and cannot be invoked in strict mode",
            name,
          );
        }
        argDecl = extractArgs(/** @type {string} */ (fn));
        argDecl[1].split(FN_ARG_SPLIT).forEach(function (arg) {
          arg.replace(FN_ARG, function (_all, _underscore, name) {
            $inject.push(name);
          });
        });
      }
      fn.$inject = $inject;
    }
  } else if (Array.isArray(fn)) {
    last = /** @type {Array} */ (fn).length - 1;
    assertArgFn(fn[last], "fn");
    $inject = /** @type {Array} */ (fn).slice(0, last);
  } else {
    assertArgFn(fn, "fn", true);
  }
  return $inject;
}
