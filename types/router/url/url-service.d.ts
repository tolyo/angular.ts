/**
 * API for URL management
 */
export class UrlService {
    static $inject: string[];
    /**
     * @param {import("../../core/location/location").LocationProvider} $locationProvider
     * @param {import("../../router/state/state-service.js").StateProvider} stateService
     * @param globals
     * @param {import("../../router/url/url-config.js").UrlConfigProvider} urlConfigProvider
     */
    constructor($locationProvider: import("../../core/location/location").LocationProvider, stateService: import("../../router/state/state-service.js").StateProvider, globals: any, urlConfigProvider: import("../../router/url/url-config.js").UrlConfigProvider);
    stateService: import("../../router/state/state-service.js").StateProvider;
    $locationProvider: import("../../core/location/location").LocationProvider;
    $location: import("../../core/location/location").Location;
    $browser: import("../../services/browser.js").Browser;
    /** Provides services related to the URL */
    urlRuleFactory: UrlRuleFactory;
    /**
     * The nested [[UrlRules]] API for managing URL rules and rewrites
     *
     * See: [[UrlRules]] for details
     * @type {UrlRules}
     */
    rules: UrlRules;
    /**
     * The nested [[UrlConfig]] API to configure the URL and retrieve URL information
     *
     * See: [[UrlConfig]] for details
     * @type {import("./url-config").UrlConfigProvider}
     */
    config: import("./url-config").UrlConfigProvider;
    /** Creates a new [[Param]] for a given location (DefType) */
    paramFactory: ParamFactory;
    /**
     * Gets the path part of the current url
     *
     * If the current URL is `/some/path?query=value#anchor`, this returns `/some/path`
     *
     * @return the path portion of the url
     */
    path: () => any;
    /**
     * Gets the search part of the current url as an object
     *
     * If the current URL is `/some/path?query=value#anchor`, this returns `{ query: 'value' }`
     *
     * @return the search (query) portion of the url, as an object
     */
    search: () => any;
    /**
     * Gets the hash part of the current url
     *
     * If the current URL is `/some/path?query=value#anchor`, this returns `anchor`
     *
     * @return the hash (anchor) portion of the url
     */
    hash: () => string | import("../../core/location/location").Location;
    _urlListeners: any[];
    $get: (string | (($location: import("../../core/location/location.js").Location, $browser: import("../../services/browser.js").Browser, $rootScope: import("../../core/scope/scope.js").Scope) => UrlService))[];
    /**
     * @returns {boolean}
     */
    html5Mode(): boolean;
    baseHref(): string;
    _baseHref: string;
    /**
     * Gets the current url, or updates the url
     *
     * ### Getting the current URL
     *
     * When no arguments are passed, returns the current URL.
     * The URL is normalized using the internal [[path]]/[[search]]/[[hash]] values.
     *
     * For example, the URL may be stored in the hash ([[HashLocationServices]]) or
     * have a base HREF prepended ([[PushStateLocationServices]]).
     *
     * The raw URL in the browser might be:
     *
     * ```
     * http://mysite.com/somepath/index.html#/internal/path/123?param1=foo#anchor
     * ```
     *
     * or
     *
     * ```
     * http://mysite.com/basepath/internal/path/123?param1=foo#anchor
     * ```
     *
     * then this method returns:
     *
     * ```
     * /internal/path/123?param1=foo#anchor
     * ```
     *
     *
     * #### Example:
     * ```js
     * locationServices.url(); // "/some/path?query=value#anchor"
     * ```
     *
     * ### Updating the URL
     *
     * When `newurl` arguments is provided, changes the URL to reflect `newurl`
     *
     * #### Example:
     * ```js
     * locationServices.url("/some/path?query=value#anchor", true);
     * ```
     *
     * @param {string} [newUrl] The new value for the URL.
     *               This url should reflect only the new internal [[path]], [[search]], and [[hash]] values.
     *               It should not include the protocol, site, port, or base path of an absolute HREF.
     * @param {boolean} [replace] When true, replaces the current history entry (instead of appending it) with this new url
     * @param {any} [state] The history's state object, i.e., pushState (if the LocationServices implementation supports it)
     *
     * @return the url (after potentially being processed)
     */
    url(newUrl?: string, replace?: boolean, state?: any): string | import("../../core/location/location").Location;
    /**
     * @internal
     *
     * Registers a low level url change handler
     *
     * Note: Because this is a low level handler, it's not recommended for general use.
     *
     * #### Example:
     * ```js
     * let deregisterFn = locationServices.onChange((evt) => console.log("url change", evt));
     * ```
     *
     * @param callback a function that will be called when the url is changing
     * @return a function that de-registers the callback
     */
    onChange(callback: any): () => any;
    /**
     * Gets the current URL parts
     *
     * This method returns the different parts of the current URL (the [[path]], [[search]], and [[hash]]) as a [[UrlParts]] object.
     */
    parts(): {
        path: any;
        search: any;
        hash: string | import("../../core/location/location").Location;
    };
    /**
     * Activates the best rule for the current URL
     *
     * Checks the current URL for a matching [[UrlRule]], then invokes that rule's handler.
     * This method is called internally any time the URL has changed.
     *
     * This effectively activates the state (or redirect, etc) which matches the current URL.
     *
     * #### Example:
     * ```js
     *
     * fetch('/states.json').then(resp => resp.json()).then(data => {
     *   data.forEach(state => $stateRegistry.register(state));
     *   urlService.listen();
     *   // Find the matching URL and invoke the handler.
     *   urlService.sync();
     * });
     * ```
     */
    sync(evt: any): void;
    /**
     * Starts or stops listening for URL changes
     *
     * Call this sometime after calling [[deferIntercept]] to start monitoring the url.
     * This causes ng-router to start listening for changes to the URL, if it wasn't already listening.
     *
     * If called with `false`, ng-router will stop listening (call listen(true) to start listening again).
     *
     * #### Example:
     * ```js
     *
     * fetch('/states.json').then(resp => resp.json()).then(data => {
     *   data.forEach(state => $stateRegistry.register(state));
     *   // Start responding to URL changes
     *   urlService.listen();
     *   urlService.sync();
     * });
     * ```
     *
     * @param enabled `true` or `false` to start or stop listening to URL changes
     */
    listen(enabled: any): any;
    _stopListeningFn: any;
    /**
     * Matches a URL
     *
     * Given a URL (as a [[UrlParts]] object), check all rules and determine the best matching rule.
     * Return the result as a [[MatchResult]].
     * @returns {any}
     */
    match(url: any): any;
    update(read: any): void;
    location: string | import("../../core/location/location").Location;
    /**
     * Internal API.
     *
     * Pushes a new location to the browser history.
     *
     * @internal
     * @param urlMatcher
     * @param params
     * @param options
     */
    push(urlMatcher: any, params: any, options: any): void;
    /**
     * Builds and returns a URL with interpolated parameters
     *
     * #### Example:
     * ```js
     * matcher = $umf.compile("/about/:person");
     * params = { person: "bob" };
     * $bob = $urlService.href(matcher, params);
     * // $bob == "/about/bob";
     * ```
     *
     * @param urlMatcher The [[UrlMatcher]] object which is used as the template of the URL to generate.
     * @param params An object of parameter values to fill the matcher's required parameters.
     * @param options Options object. The options are:
     *
     * - **`absolute`** - {boolean=false},  If true will generate an absolute url, e.g. "http://www.example.com/fullurl".
     *
     * @returns Returns the fully compiled URL, or `null` if `params` fail validation against `urlMatcher`
     */
    href(urlMatcher: any, params: any, options: any): any;
    /**
     * Creates a [[UrlMatcher]] for the specified pattern.
     *
     * @param pattern  The URL pattern.
     * @param config  The config object hash.
     * @returns The UrlMatcher.
     */
    compile(pattern: any, config: any): UrlMatcher;
    /**
     * Returns true if the specified object is a [[UrlMatcher]], or false otherwise.
     *
     * @param object  The object to perform the type check against.
     * @returns `true` if the object matches the `UrlMatcher` interface, by
     *          implementing all the same methods.
     */
    isMatcher(object: any): boolean;
}
import { UrlRuleFactory } from "./url-rule.js";
import { UrlRules } from "./url-rules.js";
import { ParamFactory } from "../params/param-factory.js";
import { UrlMatcher } from "./url-matcher.js";
