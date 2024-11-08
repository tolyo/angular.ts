/**
 * @typedef BindingTuple
 * @property {string} name
 * @property {string} type
 */
/**
 * Service which manages loading of templates from a ViewConfig.
 */
export class TemplateFactoryProvider {
    /** @type {boolean} */
    _useHttp: boolean;
    $get: (string | (($http: any, $templateCache: import("../core/cache/cache-factory").TemplateCache, $templateRequest: any, $injector: import("../core/di/internal-injector").InjectorService) => this))[];
    $templateRequest: any;
    $http: any;
    $templateCache: import("../core/cache/cache-factory").TemplateCache;
    $injector: import("../core/di/internal-injector").InjectorService;
    /**
     * Forces the provider to use $http service directly
     * @param {boolean} value
     */
    useHttpService(value: boolean): void;
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
    fromConfig(config: any, params: any, context: import("./resolve/resolve-context").ResolveContext): string | object;
    /**
     * Creates a template from a string or a function returning a string.
     *
     * @param {string | Function} template html template as a string or function that returns an html template as a string.
     * @param {any} [params] Parameters to pass to the template function.
     *
     * @return {string|object} The template html as a string, or a promise for that
     * string.
     */
    fromString(template: string | Function, params?: any): string | object;
    /**
     * Loads a template from the a URL via `$http` and `$templateCache`.
     *
     * @param {string|Function} url url of the template to load, or a function
     * that returns a url.
     * @param {Object} params Parameters to pass to the url function.
     * @return {string|Promise.<string>} The template html as a string, or a promise
     * for that string.
     */
    fromUrl(url: string | Function, params: any): string | Promise<string>;
    /**
     * Creates a template by invoking an injectable provider function.
     *
     * @param {import('../types').Injectable<any>} provider Function to invoke via `locals`
     * @param {Function} params a function used to invoke the template provider
     * @param {import("./resolve/resolve-context").ResolveContext} context
     * @return {string|Promise.<string>} The template html as a string, or a promise
     * for that string.
     */
    fromProvider(provider: import("../types").Injectable<any>, params: Function, context: import("./resolve/resolve-context").ResolveContext): string | Promise<string>;
    /**
     * Creates a component's template by invoking an injectable provider function.
     *
     * @param {import('../types').Injectable<any>} provider Function to invoke via `locals`
     * @param {Function} params a function used to invoke the template provider
     * @return {string} The template html as a string: "<component-name input1='::$resolve.foo'></component-name>".
     */
    fromComponentProvider(provider: import("../types").Injectable<any>, params: Function, context: any): string;
    /**
     * Creates a template from a component's name
     *
     * This implements route-to-component.
     * It works by retrieving the component (directive) metadata from the injector.
     * It analyses the component's bindings, then constructs a template that instantiates the component.
     * The template wires input and output bindings to resolves or from the parent component.
     *
     * @param {any} ngView {object} The parent ui-view (for binding outputs to callbacks)
     * @param {import("./resolve/resolve-context").ResolveContext} context The ResolveContext (for binding outputs to callbacks returned from resolves)
     * @param {string} component {string} Component's name in camel case.
     * @param {any} [bindings] An object defining the component's bindings: {foo: '<'}
     * @return {string} The template as a string: "<component-name input1='$resolve.foo'></component-name>".
     */
    makeComponentTemplate(ngView: any, context: import("./resolve/resolve-context").ResolveContext, component: string, bindings?: any): string;
}
export type BindingTuple = {
    name: string;
    type: string;
};
