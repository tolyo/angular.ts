import { isDefined, isFunction, isObject } from "../shared/utils";
import { services } from "./common/coreservices";
import { tail, unnestR } from "../shared/common";
import { Resolvable } from "./resolve/resolvable";
import { kebobString } from "../shared/strings";
import { annotate } from "../core/di/injector";

/**
 * @typedef BindingTuple
 * @property {string} name
 * @property {string} type
 */

/**
 * Service which manages loading of templates from a ViewConfig.
 */
export class TemplateFactoryProvider {
  constructor() {
    /** @type {boolean} */
    this._useHttp = false;
  }

  $get = [
    "$http",
    "$templateCache",
    "$templateRequest",
    "$injector",
    /**
     * @param {any} $http
     * @param {import("../core/cache/cache-factory").TemplateCache} $templateCache
     * @param {any} $templateRequest
     * @param {import("../core/di/internal-injector").InjectorService} $injector
     * @returns
     */
    ($http, $templateCache, $templateRequest, $injector) => {
      this.$templateRequest = $templateRequest;
      this.$http = $http;
      this.$templateCache = $templateCache;
      this.$injector = $injector;
      return this;
    },
  ];

  /**
   * Forces the provider to use $http service directly
   * @param {boolean} value
   */
  useHttpService(value) {
    this._useHttp = value;
  }

  /**
   * Creates a template from a configuration object.
   *
   * @param config Configuration object for which to load a template.
   * The following properties are search in the specified order, and the first one
   * that is defined is used to create the template:
   *
   * @param {any} config
   * @param {any} params  Parameters to pass to the template function.
   * @param {import("./resolve/resolve-context").ResolveContext} context The resolve context associated with the template's view
   *
   * @return {string|object}  The template html as a string, or a promise for
   * that string,or `null` if no template is configured.
   */
  fromConfig(config, params, context) {
    const defaultTemplate = "<ng-view></ng-view>";
    const asTemplate = (result) =>
      Promise.resolve(result).then((str) => ({ template: str }));
    const asComponent = (result) =>
      Promise.resolve(result).then((str) => ({ component: str }));

    const getConfigType = (config) => {
      if (isDefined(config.template)) return "template";
      if (isDefined(config.templateUrl)) return "templateUrl";
      if (isDefined(config.templateProvider)) return "templateProvider";
      if (isDefined(config.component)) return "component";
      if (isDefined(config.componentProvider)) return "componentProvider";
      return "default";
    };

    switch (getConfigType(config)) {
      case "template":
        return asTemplate(this.fromString(config.template, params));
      case "templateUrl":
        return asTemplate(this.fromUrl(config.templateUrl, params));
      case "templateProvider":
        return asTemplate(
          this.fromProvider(config.templateProvider, params, context),
        );
      case "component":
        return asComponent(config.component);
      case "componentProvider":
        return asComponent(
          this.fromComponentProvider(config.componentProvider, params, context),
        );
      default:
        return asTemplate(defaultTemplate);
    }
  }
  /**
   * Creates a template from a string or a function returning a string.
   *
   * @param {string | Function} template html template as a string or function that returns an html template as a string.
   * @param {any} [params] Parameters to pass to the template function.
   *
   * @return {string|object} The template html as a string, or a promise for that
   * string.
   */
  fromString(template, params) {
    return isFunction(template)
      ? /** @type {Function} */ (template)(params)
      : template;
  }
  /**
   * Loads a template from the a URL via `$http` and `$templateCache`.
   *
   * @param {string|Function} url url of the template to load, or a function
   * that returns a url.
   * @param {Object} params Parameters to pass to the url function.
   * @return {string|Promise.<string>} The template html as a string, or a promise
   * for that string.
   */
  fromUrl(url, params) {
    if (isFunction(url)) url = /** @type {Function} */ (url)(params);
    if (url == null) return null;
    if (this._useHttp) {
      return this.$http
        .get(url, {
          cache: this.$templateCache,
          headers: { Accept: "text/html" },
        })
        .then(function (response) {
          return response.data;
        });
    }
    return this.$templateRequest(url);
  }
  /**
   * Creates a template by invoking an injectable provider function.
   *
   * @param {import('../types').Injectable<any>} provider Function to invoke via `locals`
   * @param {Function} params a function used to invoke the template provider
   * @param {import("./resolve/resolve-context").ResolveContext} context
   * @return {string|Promise.<string>} The template html as a string, or a promise
   * for that string.
   */
  fromProvider(provider, params, context) {
    const deps = annotate(provider);
    const providerFn = Array.isArray(provider) ? tail(provider) : provider;
    const resolvable = new Resolvable("", providerFn, deps);
    return resolvable.get(context);
  }
  /**
   * Creates a component's template by invoking an injectable provider function.
   *
   * @param {import('../types').Injectable<any>} provider Function to invoke via `locals`
   * @param {Function} params a function used to invoke the template provider
   * @return {string} The template html as a string: "<component-name input1='::$resolve.foo'></component-name>".
   */
  fromComponentProvider(provider, params, context) {
    const deps = annotate(provider);
    const providerFn = Array.isArray(provider) ? tail(provider) : provider;
    const resolvable = new Resolvable("", providerFn, deps);
    return resolvable.get(context);
  }
  /**
   * Creates a template from a component's name
   *
   * This implements route-to-component.
   * It works by retrieving the component (directive) metadata from the injector.
   * It analyses the component's bindings, then constructs a template that instantiates the component.
   * The template wires input and output bindings to resolves or from the parent component.
   *
   * @param {any} ngView {object} The parent ng-view (for binding outputs to callbacks)
   * @param {import("./resolve/resolve-context").ResolveContext} context The ResolveContext (for binding outputs to callbacks returned from resolves)
   * @param {string} component {string} Component's name in camel case.
   * @param {any} [bindings] An object defining the component's bindings: {foo: '<'}
   * @return {string} The template as a string: "<component-name input1='$resolve.foo'></component-name>".
   */
  makeComponentTemplate(ngView, context, component, bindings) {
    bindings = bindings || {};
    // Bind once prefix
    // Convert to kebob name. Add x- prefix if the string starts with `x-` or `data-`
    const kebob = (camelCase) => {
      const kebobed = kebobString(camelCase);
      return /^(x|data)-/.exec(kebobed) ? `x-${kebobed}` : kebobed;
    };

    const attributeTpl = /** @param {BindingTuple} input*/ (input) => {
      const { name, type } = input;
      const attrName = kebob(name);
      // If the ng-view has an attribute which matches a binding on the routed component
      // then pass that attribute through to the routed component template.
      // Prefer ng-view wired mappings to resolve data, unless the resolve was explicitly bound using `bindings:`
      if (ngView.attr(attrName) && !bindings[name])
        return `${attrName}='${ngView.attr(attrName)}'`;
      const resolveName = bindings[name] || name;
      // Pre-evaluate the expression for "@" bindings by enclosing in {{ }}
      // some-attr="{{$resolve.someResolveName }}"
      if (type === "@") return `${attrName}='{{s$resolve.${resolveName}}}'`;
      // Wire "&" callbacks to resolves that return a callback function
      // Get the result of the resolve (should be a function) and annotate it to get its arguments.
      // some-attr="$resolve.someResolveResultName(foo, bar)"
      if (type === "&") {
        const res = context.getResolvable(resolveName);
        const fn = res && res.data;
        const args = (fn && annotate(fn)) || [];
        // account for array style injection, i.e., ['foo', function(foo) {}]
        const arrayIdxStr = Array.isArray(fn) ? `[${fn.length - 1}]` : "";
        return `${attrName}='$resolve.${resolveName}${arrayIdxStr}(${args.join(",")})'`;
      }
      // some-attr="::$resolve.someResolveName"
      return `${attrName}='$resolve.${resolveName}'`;
    };
    const attrs = getComponentBindings(component).map(attributeTpl).join(" ");
    const kebobName = kebob(component);
    return `<${kebobName} ${attrs}></${kebobName}>`;
  }
}

/**
 * Gets all the directive(s)' inputs ('@', '=', and '<') and outputs ('&')
 * @param {string} name
 * @returns
 */
function getComponentBindings(name) {
  const cmpDefs = services.$injector.get(name + "Directive"); // could be multiple
  if (!cmpDefs || !cmpDefs.length)
    throw new Error(`Unable to find component named '${name}'`);
  return cmpDefs.map(getBindings).reduce(unnestR, []);
}
// Given a directive definition, find its object input attributes
// Use different properties, depending on the type of directive (component, bindToController, normal)
const getBindings = (def) => {
  if (isObject(def.bindToController))
    return scopeBindings(def.bindToController);
  return scopeBindings(def.scope);
};
// for ng 1.2 style, process the scope: { input: "=foo" }
// for ng 1.3 through ng 1.5, process the component's bindToController: { input: "=foo" } object
const scopeBindings = (bindingsObj) =>
  Object.keys(bindingsObj || {})
    // [ 'input', [ '=foo', '=', 'foo' ] ]
    .map((key) => [key, /^([=<@&])[?]?(.*)/.exec(bindingsObj[key])])
    // skip malformed values
    .filter((tuple) => isDefined(tuple) && Array.isArray(tuple[1]))
    // { name: ('foo' || 'input'), type: '=' }
    .map((tuple) => ({ name: tuple[1][2] || tuple[0], type: tuple[1][1] }));
