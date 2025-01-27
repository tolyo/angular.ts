export function CompileProvider($provide: any, $$sanitizeUriProvider: any): void;
export class CompileProvider {
    constructor($provide: any, $$sanitizeUriProvider: any);
    /**
     * Register a new directive with the compiler.
     *
     * @param {string|Object} name Name of the directive in camel-case (i.e. `ngBind` which will match
     *    as `ng-bind`), or an object map of directives where the keys are the names and the values
     *    are the factories.
     * @param {Function|Array} directiveFactory An injectable directive factory function. See the
     *    {@link guide/directive directive guide} and the {@link $compile compile API} for more info.
     * @returns {CompileProvider} Self for chaining.
     */
    directive: (name: string | any, directiveFactory: Function | any[]) => CompileProvider;
    /**
     * @param {string|Object} name Name of the component in camelCase (i.e. `myComp` which will match `<my-comp>`),
     *    or an object map of components where the keys are the names and the values are the component definition objects.
     * @param {Object} options Component definition object (a simplified
     *    {directive definition object}),
     *    with the following properties (all optional):
     *
     *    - `controller` – `{(string|function()=}` – controller constructor function that should be
     *      associated with newly created scope or the name of a {controller} if passed as a string. An empty `noop` function by default.
     *    - `controllerAs` – `{string=}` – identifier name for to reference the controller in the component's scope.
     *      If present, the controller will be published to scope under the `controllerAs` name.
     *      If not present, this will default to be `$ctrl`.
     *    - `template` – `{string=|function()=}` – html template as a string or a function that
     *      returns an html template as a string which should be used as the contents of this component.
     *      Empty string by default.
     *
     *      If `template` is a function, then it is {injected} with
     *      the following locals:
     *
     *      - `$element` - Current element
     *      - `$attrs` - Current attributes object for the element
     *
     *    - `templateUrl` – `{string=|function()=}` – path or function that returns a path to an html
     *      template that should be used  as the contents of this component.
     *
     *      If `templateUrl` is a function, then it is {injected} with
     *      the following locals:
     *
     *      - `$element` - Current element
     *      - `$attrs` - Current attributes object for the element
     *
     *    - `bindings` – `{object=}` – defines bindings between DOM attributes and component properties.
     *      Component properties are always bound to the component controller and not to the scope.
     *      See {`bindToController`}.
     *    - `transclude` – `{boolean=}` – whether {content transclusion} is enabled.
     *      Disabled by default.
     *    - `require` - `{Object<string, string>=}` - requires the controllers of other directives and binds them to
     *      this component's controller. The object keys specify the property names under which the required
     *      controllers (object values) will be bound. See {`require`}.
     *    - `$...` – additional properties to attach to the directive factory function and the controller
     *      constructor function. (This is used by the component router to annotate)
     *
     * @returns {CompileProvider} the compile provider itself, for chaining of function calls.
     */
    component: (name: string | any, options: any) => CompileProvider;
    /**
     * Retrieves or overrides the default regular expression that is used for determining trusted safe
     * urls during a[href] sanitization.
     *
     * The sanitization is a security measure aimed at preventing XSS attacks via html links.
     *
     * Any url about to be assigned to a[href] via data-binding is first normalized and turned into
     * an absolute url. Afterwards, the url is matched against the `aHrefSanitizationTrustedUrlList`
     * regular expression. If a match is found, the original url is written into the dom. Otherwise,
     * the absolute url is prefixed with `'unsafe:'` string and only then is it written into the DOM.
     *
     * @param {RegExp=} regexp New regexp to trust urls with.
     * @returns {RegExp|CompileProvider} Current RegExp if called without value or self for
     *    chaining otherwise.
     */
    aHrefSanitizationTrustedUrlList: (regexp?: RegExp | undefined) => RegExp | CompileProvider;
    /**
     * Retrieves or overrides the default regular expression that is used for determining trusted safe
     * urls during img[src] sanitization.
     *
     * The sanitization is a security measure aimed at prevent XSS attacks via html links.
     *
     * Any url about to be assigned to img[src] via data-binding is first normalized and turned into
     * an absolute url. Afterwards, the url is matched against the `imgSrcSanitizationTrustedUrlList`
     * regular expression. If a match is found, the original url is written into the dom. Otherwise,
     * the absolute url is prefixed with `'unsafe:'` string and only then is it written into the DOM.
     *
     * @param {RegExp=} regexp New regexp to trust urls with.
     * @returns {RegExp|CompileProvider} Current RegExp if called without value or self for
     *    chaining otherwise.
     */
    imgSrcSanitizationTrustedUrlList: (regexp?: RegExp | undefined) => RegExp | CompileProvider;
    strictComponentBindingsEnabled: (enabled: any) => boolean | this;
    /**
     * Defines the security context for DOM properties bound by ng-prop-*.
     *
     * @param {string} elementName The element name or '*' to match any element.
     * @param {string} propertyName The DOM property name.
     * @param {string} ctx The {@link $sce} security context in which this value is safe for use, e.g. `$sce.URL`
     * @returns {object} `this` for chaining
     */
    addPropertySecurityContext: (elementName: string, propertyName: string, ctx: string) => object;
    $get: (string | (($injector: import("../../core/di/internal-injector.js").InjectorService, $interpolate: any, $exceptionHandler: import("../exception-handler").ErrorHandler, $templateRequest: any, $parse: import("../parse/parse").ParseService, $controller: any, $rootScope: import("../scope/scope").Scope, $sce: any, $animate: any) => ($compileNodes: string | Element | NodeList, transcludeFn?: any, maxPriority?: number, ignoreDirective?: string, previousCompileContext?: any) => PublicLinkFn | null))[];
}
export namespace CompileProvider {
    let $inject: string[];
}
export const DirectiveSuffix: "Directive";
export type CompositeLinkFn = (scope: import("../scope/scope.js").Scope, $linkNode: Element[], parentBoundTranscludeFn: Function) => any;
export type TranscludeFn = Function;
export type PublicLinkFn = any | ((scope: import("../scope/scope.js").Scope, transcludeFn: TranscludeFn) => string);
export type CompileFn = ($compileNodes: string | Element | NodeList, transcludeFn?: any, maxPriority?: number, ignoreDirective?: string, previousCompileContext?: any) => PublicLinkFn | null;
export type NodeLinkFn = Function;
