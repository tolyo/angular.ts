import { pick, tail } from "../../shared/common";
import { isDefined, isString } from "../../shared/utils";
import { isInjectable } from "../../shared/predicates";
import { services } from "../common/coreservices";
import { trace } from "../common/trace";
import { ResolveContext } from "../resolve/resolve-context";
import { Resolvable } from "../resolve/resolvable";
import { annotate } from "../../core/di/injector";

export function getNg1ViewConfigFactory() {
  let templateFactory = null;
  return (path, view) => {
    templateFactory =
      templateFactory || services.$injector.get("$templateFactory"); // TODO: remove static injector
    return [new Ng1ViewConfig(path, view, templateFactory)];
  };
}

const hasAnyKey = (keys, obj) =>
  keys.reduce((acc, key) => acc || isDefined(obj[key]), false);
/**
 * This is a [[StateBuilder.builder]] function for angular1 `views`.
 *
 * When the [[StateBuilder]] builds a [[StateObject]] object from a raw [[StateDeclaration]], this builder
 * handles the `views` property with logic specific to @uirouter/angularjs (ng1).
 *
 * If no `views: {}` property exists on the [[StateDeclaration]], then it creates the `views` object
 * and applies the state-level configuration to a view named `$default`.
 *
 */
export function ng1ViewsBuilder(state) {
  // Do not process root state
  if (!state.parent) return {};
  const tplKeys = [
      "templateProvider",
      "templateUrl",
      "template",
      "notify",
      "async",
    ],
    ctrlKeys = [
      "controller",
      "controllerProvider",
      "controllerAs",
      "resolveAs",
    ],
    compKeys = ["component", "bindings", "componentProvider"],
    nonCompKeys = tplKeys.concat(ctrlKeys),
    allViewKeys = compKeys.concat(nonCompKeys);
  // Do not allow a state to have both state-level props and also a `views: {}` property.
  // A state without a `views: {}` property can declare properties for the `$default` view as properties of the state.
  // However, the `$default` approach should not be mixed with a separate `views: ` block.
  if (isDefined(state.views) && hasAnyKey(allViewKeys, state)) {
    throw new Error(
      `State '${state.name}' has a 'views' object. ` +
        `It cannot also have "view properties" at the state level.  ` +
        `Move the following properties into a view (in the 'views' object): ` +
        ` ${allViewKeys.filter((key) => isDefined(state[key])).join(", ")}`,
    );
  }
  const views = {},
    viewsObject = state.views || { $default: pick(state, allViewKeys) };
  Object.entries(viewsObject).forEach(([name, config]) => {
    // Account for views: { "": { template... } }
    name = name || "$default";
    // Account for views: { header: "headerComponent" }
    if (isString(config)) config = { component: config };
    // Make a shallow copy of the config object
    config = Object.assign({}, config);
    // Do not allow a view to mix props for component-style view with props for template/controller-style view
    if (hasAnyKey(compKeys, config) && hasAnyKey(nonCompKeys, config)) {
      throw new Error(
        `Cannot combine: ${compKeys.join("|")} with: ${nonCompKeys.join("|")} in stateview: '${name}@${state.name}'`,
      );
    }
    config.resolveAs = config.resolveAs || "$resolve";
    config.$type = "ng1";
    config.$context = state;
    config.$name = name;
    const normalized = Ng1ViewConfig.normalizeUIViewTarget(
      config.$context,
      config.$name,
    );
    config.$ngViewName = normalized.ngViewName;
    config.$ngViewContextAnchor = normalized.ngViewContextAnchor;
    views[name] = config;
  });
  return views;
}

/**
 * @type {Number}
 */
let id = 0;

export class Ng1ViewConfig {
  constructor(path, viewDecl, factory) {
    this.path = path;
    this.viewDecl = viewDecl;
    this.factory = factory;
    this.component = undefined;
    this.template = undefined;

    /** @type {Number} */ this.$id = id++;
    this.loaded = false;
    this.getTemplate = (ngView, context) =>
      this.component
        ? this.factory.makeComponentTemplate(
            ngView,
            context,
            this.component,
            this.viewDecl.bindings,
          )
        : this.template;
  }

  load() {
    const context = new ResolveContext(this.path);
    const params = this.path.reduce(
      (acc, node) => Object.assign(acc, node.paramValues),
      {},
    );
    const promises = [
      Promise.resolve(this.factory.fromConfig(this.viewDecl, params, context)),
      Promise.resolve(this.getController(context)),
    ];
    return Promise.all(promises).then((results) => {
      trace.traceViewServiceEvent("Loaded", this);
      this.controller = results[0];
      Object.assign(this, results[1]); // Either { template: "tpl" } or { component: "cmpName" }
      return this;
    });
  }
  /**
   * Gets the controller for a view configuration.
   *
   * @returns {Function|Promise.<Function>} Returns a controller, or a promise that resolves to a controller.
   */
  getController(context) {
    const provider = this.viewDecl.controllerProvider;
    if (!isInjectable(provider)) return this.viewDecl.controller;
    const deps = annotate(provider);
    const providerFn = Array.isArray(provider) ? tail(provider) : provider;
    const resolvable = new Resolvable("", providerFn, deps);
    return resolvable.get(context);
  }

  /**
   * Normalizes a view's name from a state.views configuration block.
   *
   * This should be used by a framework implementation to calculate the values for
   * [[_ViewDeclaration.$ngViewName]] and [[_ViewDeclaration.$ngViewContextAnchor]].
   *
   * @param context the context object (state declaration) that the view belongs to
   * @param rawViewName the name of the view, as declared in the [[StateDeclaration.views]]
   *
   * @returns the normalized ngViewName and ngViewContextAnchor that the view targets
   */
  static normalizeUIViewTarget(context, rawViewName = "") {
    // TODO: Validate incoming view name with a regexp to allow:
    // ex: "view.name@foo.bar" , "^.^.view.name" , "view.name@^.^" , "" ,
    // "@" , "$default@^" , "!$default.$default" , "!foo.bar"
    const viewAtContext = rawViewName.split("@");
    let ngViewName = viewAtContext[0] || "$default"; // default to unnamed view
    let ngViewContextAnchor = isString(viewAtContext[1])
      ? viewAtContext[1]
      : "^"; // default to parent context
    // Handle relative view-name sugar syntax.
    // Matches rawViewName "^.^.^.foo.bar" into array: ["^.^.^.foo.bar", "^.^.^", "foo.bar"],
    const relativeViewNameSugar = /^(\^(?:\.\^)*)\.(.*$)/.exec(ngViewName);
    if (relativeViewNameSugar) {
      // Clobbers existing contextAnchor (rawViewName validation will fix this)
      ngViewContextAnchor = relativeViewNameSugar[1]; // set anchor to "^.^.^"
      ngViewName = relativeViewNameSugar[2]; // set view-name to "foo.bar"
    }
    if (ngViewName.charAt(0) === "!") {
      ngViewName = ngViewName.substr(1);
      ngViewContextAnchor = ""; // target absolutely from root
    }
    // handle parent relative targeting "^.^.^"
    const relativeMatch = /^(\^(?:\.\^)*)$/;
    if (relativeMatch.exec(ngViewContextAnchor)) {
      const anchorState = ngViewContextAnchor
        .split(".")
        .reduce((anchor) => anchor.parent, context);
      ngViewContextAnchor = anchorState.name;
    } else if (ngViewContextAnchor === ".") {
      ngViewContextAnchor = context.name;
    }
    return { ngViewName, ngViewContextAnchor };
  }
}
