import {
  applyPairs,
  inherit,
  omit,
  tail,
  copy,
  map,
} from "../../shared/common";
import { isDefined, isFunction, isString } from "../../shared/utils";
import { stringify } from "../../shared/strings";
import { is, pattern, pipe, val } from "../../shared/hof";
import { Resolvable } from "../resolve/resolvable";
import { annotate } from "../../core/di/injector";

function parseUrl(url) {
  if (!isString(url)) return false;
  const root = url.charAt(0) === "^";
  return { val: root ? url.substring(1) : url, root };
}

function selfBuilder(state) {
  state.self.$$state = () => state;
  return state.self;
}

function dataBuilder(state) {
  if (state.parent && state.parent.data) {
    state.data = state.self.data = inherit(state.parent.data, state.data);
  }
  return state.data;
}

function getUrlBuilder($urlService, root) {
  return function (stateObject) {
    let stateDec = stateObject.self;
    // For future states, i.e., states whose name ends with `.**`,
    // match anything that starts with the url prefix
    if (
      stateDec &&
      stateDec.url &&
      stateDec.name &&
      stateDec.name.match(/\.\*\*$/)
    ) {
      const newStateDec = {};
      copy(stateDec, newStateDec);
      newStateDec.url += "{remainder:any}"; // match any path (.*)
      stateDec = newStateDec;
    }
    const parent = stateObject.parent;
    const parsed = parseUrl(stateDec.url);
    const url = !parsed
      ? stateDec.url
      : $urlService.compile(parsed.val, { state: stateDec });
    if (!url) return null;
    if (!$urlService.isMatcher(url))
      throw new Error(`Invalid url '${url}' in state '${stateObject}'`);
    return parsed && parsed.root
      ? url
      : ((parent && parent.navigable) || root()).url.append(url);
  };
}

function getNavigableBuilder(isRoot) {
  return function (state) {
    return !isRoot(state) && state.url
      ? state
      : state.parent
        ? state.parent.navigable
        : null;
  };
}

function getParamsBuilder(paramFactory) {
  return function (state) {
    const makeConfigParam = (_config, id) =>
      paramFactory.fromConfig(id, null, state.self);
    const urlParams =
      (state.url && state.url.parameters({ inherit: false })) || [];
    const nonUrlParams = Object.values(
      map(
        omit(
          state.params || {},
          urlParams.map((x) => x.id),
        ),
        makeConfigParam,
      ),
    );
    return urlParams
      .concat(nonUrlParams)
      .map((p) => [p.id, p])
      .reduce(applyPairs, {});
  };
}

function pathBuilder(state) {
  if (state.parent && !state.abstract) {
    return state.parent.path.concat(state);
  } else {
    return [state];
  }
}

function includesBuilder(state) {
  const includes = state.parent ? Object.assign({}, state.parent.includes) : {};
  includes[state.name] = true;
  return includes;
}

/**
 * This is a [[StateBuilder.builder]] function for the `resolve:` block on a [[StateDeclaration]].
 *
 * When the [[StateBuilder]] builds a [[StateObject]] object from a raw [[StateDeclaration]], this builder
 * validates the `resolve` property and converts it to a [[Resolvable]] array.
 *
 * resolve: input value can be:
 *
 * {
 *   // analyzed but not injected
 *   myFooResolve: function() { return "myFooData"; },
 *
 *   // function.toString() parsed, "DependencyName" dep as string (not min-safe)
 *   myBarResolve: function(DependencyName) { return DependencyName.fetchSomethingAsPromise() },
 *
 *   // Array split; "DependencyName" dep as string
 *   myBazResolve: [ "DependencyName", function(dep) { return dep.fetchSomethingAsPromise() },
 *
 *   // Array split; DependencyType dep as token (compared using ===)
 *   myQuxResolve: [ DependencyType, function(dep) { return dep.fetchSometingAsPromise() },
 *
 *   // val.$inject used as deps
 *   // where:
 *   //     corgeResolve.$inject = ["DependencyName"];
 *   //     function corgeResolve(dep) { dep.fetchSometingAsPromise() }
 *   // then "DependencyName" dep as string
 *   myCorgeResolve: corgeResolve,
 *
 *  // inject service by name
 *  // When a string is found, desugar creating a resolve that injects the named service
 *   myGraultResolve: "SomeService"
 * }
 *
 * or:
 *
 * [
 *   new Resolvable("myFooResolve", function() { return "myFooData" }),
 *   new Resolvable("myBarResolve", function(dep) { return dep.fetchSomethingAsPromise() }, [ "DependencyName" ]),
 *   { provide: "myBazResolve", useFactory: function(dep) { dep.fetchSomethingAsPromise() }, deps: [ "DependencyName" ] }
 * ]
 */
export function resolvablesBuilder(state) {
  /** convert resolve: {} and resolvePolicy: {} objects to an array of tuples */
  const objects2Tuples = (resolveObj, resolvePolicies) =>
    Object.keys(resolveObj || {}).map((token) => ({
      token,
      val: resolveObj[token],
      deps: undefined,
      policy: resolvePolicies[token],
    }));
  /** fetch DI annotations from a function or ng1-style array */
  const annotateFn = (fn) => {
    const $injector = services.$injector;
    // ng1 doesn't have an $injector until runtime.
    // If the $injector doesn't exist, use "deferred" literal as a
    // marker indicating they should be annotated when runtime starts
    return (
      fn["$inject"] ||
      ($injector && annotate(fn, $injector.strictDi)) ||
      "deferred"
    );
  };
  /** true if the object has both `token` and `resolveFn`, and is probably a [[ResolveLiteral]] */
  const isResolveLiteral = (obj) => !!(obj.token && obj.resolveFn);
  /** true if the object looks like a tuple from obj2Tuples */
  const isTupleFromObj = (obj) =>
    !!(
      obj &&
      obj.val &&
      (isString(obj.val) || Array.isArray(obj.val) || isFunction(obj.val))
    );

  // Given a literal resolve or provider object, returns a Resolvable
  const literal2Resolvable = pattern([
    [
      (x) => x.resolveFn,
      (p) => new Resolvable(getToken(p), p.resolveFn, p.deps, p.policy),
    ],
    [
      (x) => x.useFactory,
      (p) =>
        new Resolvable(
          getToken(p),
          p.useFactory,
          p.deps || p.dependencies,
          p.policy,
        ),
    ],
    [
      (x) => x.useClass,
      (p) => new Resolvable(getToken(p), () => new p.useClass(), [], p.policy),
    ],
    [
      (x) => x.useValue,
      (p) =>
        new Resolvable(getToken(p), () => p.useValue, [], p.policy, p.useValue),
    ],
    [
      (x) => x.useExisting,
      (p) => new Resolvable(getToken(p), (x) => x, [p.useExisting], p.policy),
    ],
  ]);
  const tuple2Resolvable = pattern([
    [
      pipe((x) => x.val, isString),
      (tuple) =>
        new Resolvable(tuple.token, (x) => x, [tuple.val], tuple.policy),
    ],
    [
      pipe((x) => x.val, Array.isArray),
      (tuple) =>
        new Resolvable(
          tuple.token,
          tail(tuple.val),
          tuple.val.slice(0, -1),
          tuple.policy,
        ),
    ],
    [
      pipe((x) => x.val, isFunction),
      (tuple) =>
        new Resolvable(
          tuple.token,
          tuple.val,
          annotateFn(tuple.val),
          tuple.policy,
        ),
    ],
  ]);
  const item2Resolvable = pattern([
    [is(Resolvable), (r) => r],
    [isResolveLiteral, literal2Resolvable],
    [isTupleFromObj, tuple2Resolvable],
    [
      val(true),
      (obj) => {
        throw new Error("Invalid resolve value: " + stringify(obj));
      },
    ],
  ]);
  // If resolveBlock is already an array, use it as-is.
  // Otherwise, assume it's an object and convert to an Array of tuples
  const decl = state.resolve;
  const items = Array.isArray(decl)
    ? decl
    : objects2Tuples(decl, state.resolvePolicy || {});
  return items.map(item2Resolvable);
}
/**
 * A internal global service
 *
 * StateBuilder is a factory for the internal [[StateObject]] objects.
 *
 * When you register a state with the [[StateRegistry]], you register a plain old javascript object which
 * conforms to the [[StateDeclaration]] interface.  This factory takes that object and builds the corresponding
 * [[StateObject]] object, which has an API and is used internally.
 *
 * Custom properties or API may be added to the internal [[StateObject]] object by registering a decorator function
 * using the [[builder]] method.
 */
export class StateBuilder {
  constructor(matcher, urlService) {
    this.matcher = matcher;
    this.$injector = undefined;
    const self = this;
    const root = () => matcher.find("");
    function parentBuilder(state) {
      if (isRoot(state)) return null;
      return matcher.find(self.parentName(state)) || root();
    }
    this.builders = {
      name: [(state) => state.name],
      self: [selfBuilder],
      parent: [parentBuilder],
      data: [dataBuilder],
      // Build a URLMatcher if necessary, either via a relative or absolute URL
      url: [getUrlBuilder(urlService, root)],
      // Keep track of the closest ancestor state that has a URL (i.e. is navigable)
      navigable: [getNavigableBuilder(isRoot)],
      // TODO
      params: [getParamsBuilder(urlService.paramFactory)],
      // Each framework-specific ui-router implementation should define its own `views` builder
      // e.g., src/ng1/statebuilders/views.ts
      views: [],
      // Keep a full path from the root down to this state as this is needed for state activation.
      path: [pathBuilder],
      // Speed up $state.includes() as it's used a lot
      includes: [includesBuilder],
      resolvables: [resolvablesBuilder],
    };
  }
  builder(name, fn) {
    const builders = this.builders;
    const array = builders[name] || [];
    // Backwards compat: if only one builder exists, return it, else return whole arary.
    if (isString(name) && !isDefined(fn))
      return array.length > 1 ? array : array[0];
    if (!isString(name) || !isFunction(fn)) return;
    builders[name] = array;
    builders[name].push(fn);
    return () => builders[name].splice(builders[name].indexOf(fn, 1)) && null;
  }
  /**
   * Builds all of the properties on an essentially blank State object, returning a State object which has all its
   * properties and API built.
   *
   * @param state an uninitialized State object
   * @returns the built State object
   */
  build(state) {
    const { matcher, builders } = this;
    const parent = this.parentName(state);
    if (parent && !matcher.find(parent, undefined, false)) {
      return null;
    }
    for (const key in builders) {
      if (!Object.prototype.hasOwnProperty.call(builders, key)) continue;
      const chain = builders[key].reduce(
        (parentFn, step) => (_state) => step(_state, parentFn),
        () => {},
      );
      state[key] = chain(state);
    }
    return state;
  }

  parentName(state) {
    // name = 'foo.bar.baz.**'
    const name = state.name || "";
    // segments = ['foo', 'bar', 'baz', '.**']
    const segments = name.split(".");
    // segments = ['foo', 'bar', 'baz']
    const lastSegment = segments.pop();
    // segments = ['foo', 'bar'] (ignore .** segment for future states)
    if (lastSegment === "**") segments.pop();
    if (segments.length) {
      if (state.parent) {
        throw new Error(
          `States that specify the 'parent:' property should not have a '.' in their name (${name})`,
        );
      }
      // 'foo.bar'
      return segments.join(".");
    }
    if (!state.parent) return "";
    return isString(state.parent) ? state.parent : state.parent.name;
  }
  name(state) {
    const name = state.name;
    if (name.indexOf(".") !== -1 || !state.parent) return name;
    const parentName = isString(state.parent)
      ? state.parent
      : state.parent.name;
    return parentName ? parentName + "." + name : name;
  }
}

function isRoot(state) {
  return state.name === "";
}

/** extracts the token from a Provider or provide literal */
function getToken(p) {
  return p.provide || p.token;
}
