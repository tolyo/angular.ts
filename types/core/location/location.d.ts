/**
 *
 * @param {string} base
 * @param {string} url
 * @returns {string} returns text from `url` after `base` or `undefined` if it does not begin with
 *                   the expected string.
 */
export function stripBaseUrl(base: string, url: string): string;
export function stripHash(url: any): any;
export function stripFile(url: any): any;
export function serverBase(url: any): any;
/**
 * @abstract
 */
export class Location {
    /**
     * @param {string} appBase application base URL
     * @param {string} appBaseNoFile application base URL stripped of any filename
     */
    constructor(appBase: string, appBaseNoFile: string);
    /** @type {string} */
    appBase: string;
    /** @type {string} */
    appBaseNoFile: string;
    /**
     * An absolute URL is the full URL, including protocol (http/https ), the optional subdomain (e.g. www ), domain (example.com), and path (which includes the directory and slug).
     * @type {string}
     */
    $$absUrl: string;
    /**
     * If html5 mode is enabled
     * @type {boolean}
     */
    $$html5: boolean;
    /**
     * Has any change been replacing?
     * @type {boolean}
     */
    $$replace: boolean;
    /** @type {import('../url-utils/url-utils').HttpProtocol} */
    $$protocol: import("../url-utils/url-utils").HttpProtocol;
    /** @type {string} */
    $$host: string;
    /**
     * The port, without ":"
     * @type {number}
     */
    $$port: number;
    /**
     * The pathname, beginning with "/"
     * @type {string}
     */
    $$path: string;
    /**
     * The hash string, minus the hash symbol
     * @type {string}
     */
    $$hash: string;
    /**
     * Helper property for scope watch changes
     * @type {boolean}
     */
    $$urlUpdatedByLocation: boolean;
    /**
     * Return full URL representation with all segments encoded according to rules specified in
     * [RFC 3986](http://www.ietf.org/rfc/rfc3986.txt).
     *
     * @return {string} full URL
     */
    absUrl(): string;
    /**
     * This method is getter / setter.
     *
     * Return URL (e.g. `/path?a=b#hash`) when called without any parameter.
     * Change path, search and hash, when called with parameter and return `$location`.
     *
     * @param {string=} url New URL without base prefix (e.g. `/path?a=b#hash`)
     * @return {Location|string} url
     */
    url(url?: string | undefined): Location | string;
    /**
     *
     * Return protocol of current URL.
     * @return {import("../url-utils/url-utils").HttpProtocol} protocol of current URL
     */
    protocol(): import("../url-utils/url-utils").HttpProtocol;
    /**
     * This method is getter only.
     *
     * Return host of current URL.
     *
     * Note: compared to the non-AngularJS version `location.host` which returns `hostname:port`, this returns the `hostname` portion only.
     *
     *
     * @return {string} host of current URL.
     */
    host(): string;
    /**
     * This method is getter only.
     *
     * Return port of current URL.
     *
     *
     * ```js
     * // given URL http://example.com/#/some/path?foo=bar&baz=xoxo
     * let port = $location.port();
     * // => 80
     * ```
     *
     * @return {number} port
     */
    port(): number;
    /**
     * This method is getter / setter.
     *
     * Return path of current URL when called without any parameter.
     *
     * Change path when called with parameter and return `$location`.
     *
     * Note: Path should always begin with forward slash (/), this method will add the forward slash
     * if it is missing.
     *
     *
     * ```js
     * // given URL http://example.com/#/some/path?foo=bar&baz=xoxo
     * let path = $location.path();
     * // => "/some/path"
     * ```
     *
     * @param {(string|number)=} path New path
     * @return {(string|object)} path if called with no parameters, or `$location` if called with a parameter
     */
    path(path?: (string | number) | undefined): (string | object);
    /**
     * This method is getter / setter.
     *
     * Returns the hash fragment when called without any parameters.
     *
     * Changes the hash fragment when called with a parameter and returns `$location`.
     *
     *
     * ```js
     * // given URL http://example.com/#/some/path?foo=bar&baz=xoxo#hashValue
     * let hash = $location.hash();
     * // => "hashValue"
     * ```
     *
     * @param {(string|number)=} hash New hash fragment
     * @return {string|Location} hash
     */
    hash(hash?: (string | number) | undefined): string | Location;
    /**
     * If called, all changes to $location during the current `$digest` will replace the current history
     * record, instead of adding a new one.
     */
    replace(): this;
    /**
     * Returns or sets the search part (as object) of current URL when called without any parameter
     *
     * @param {string|Object=} search New search params - string or hash object.
     * @param {(string|number|Array<string>|boolean)=} paramValue If search is a string or number, then paramValue will override only a single search property.
     * @returns {Object|Location} Search object or Location object
     */
    search(search?: (string | any) | undefined, paramValue?: (string | number | Array<string> | boolean) | undefined, ...args: any[]): any | Location;
    $$search: any;
    /**
     * Compose url and update `url` and `absUrl` property
     * @returns {void}
     */
    $$compose(): void;
    $$url: string;
    /**
     * @param {string} _url
     * @returns {string}
     */
    $$normalizeUrl(_url: string): string;
    /**
     * This method is getter / setter.
     *
     * Return the history state object when called without any parameter.
     *
     * Change the history state object when called with one parameter and return `$location`.
     * The state object is later passed to `pushState` or `replaceState`.
     * See {@link https://developer.mozilla.org/en-US/docs/Web/API/History/pushState#state|History.state}
     *
     * NOTE: This method is supported only in HTML5 mode and only in browsers supporting
     * the HTML5 History API (i.e. methods `pushState` and `replaceState`). If you need to support
     * older browsers (like IE9 or Android < 4.0), don't use this method.
     *
     * @param {any} state State object for pushState or replaceState
     * @return {any} state
     */
    state(state: any, ...args: any[]): any;
    $$state: any;
    /**
     * @param {string} _url
     * @param {string} _url2
     * @returns {boolean}
     */
    $$parseLinkUrl(_url: string, _url2: string): boolean;
    $$parse(_url: any): void;
}
/**
 * This object is exposed as $location service when HTML5 mode is enabled and supported
 */
export class LocationHtml5Url extends Location {
    /**
     * @param {string} appBase application base URL
     * @param {string} appBaseNoFile application base URL stripped of any filename
     * @param {string} basePrefix URL path prefix
     */
    constructor(appBase: string, appBaseNoFile: string, basePrefix: string);
    basePrefix: string;
    /**
     * Parse given HTML5 (regular) URL string into properties
     * @param {string} url HTML5 URL
     */
    $$parse(url: string): void;
    $$normalizeUrl(url: any): string;
}
/**
 * LocationHashbangUrl represents URL
 * This object is exposed as $location service when developer doesn't opt into html5 mode.
 * It also serves as the base class for html5 mode fallback on legacy browsers.
 *
 * @constructor
 * @param {string} appBase application base URL
 * @param {string} appBaseNoFile application base URL stripped of any filename
 * @param {string} hashPrefix hashbang prefix
 */
export class LocationHashbangUrl extends Location {
    constructor(appBase: any, appBaseNoFile: any, hashPrefix: any);
    hashPrefix: any;
    /**
     * Parse given hashbang URL into properties
     * @param {string} url Hashbang URL
     */
    $$parse(url: string): void;
    $$normalizeUrl(url: any): string;
    /**
     * @param {string} url
     * @returns {boolean}
     */
    $$parseLinkUrl(url: string): boolean;
}
export class LocationProvider {
    /** @type {string} */
    hashPrefixConf: string;
    /** @type {Html5Mode} */
    html5ModeConf: Html5Mode;
    /**
     * The default value for the prefix is `'!'`.
     * @param {string=} prefix Prefix for hash part (containing path and search)
     * @returns {void}
     */
    setHashPrefix(prefix?: string | undefined): void;
    /**
     * Current hash prefix
     * @returns {string}
     */
    getHashPrefix(): string;
    /**
     * Configures html5 mode
     * @param {(boolean|Html5Mode)=} mode If boolean, sets `html5Mode.enabled` to value. Otherwise, accepts html5Mode object
     *
     * @returns {void}
     */
    setHtml5Mode(mode?: (boolean | Html5Mode) | undefined): void;
    /**
     * Returns html5 mode cofiguration
     * @returns {Html5Mode}
     */
    getHtml5Mode(): Html5Mode;
    $get: (string | (($rootScope: import("../scope/scope").Scope, $browser: import("../../services/browser").Browser, $rootElement: JQLite) => Location))[];
}
export type DefaultPorts = {
    http: number;
    https: number;
    ftp: number;
};
/**
 * Represents the configuration options for HTML5 mode.
 */
export type Html5Mode = {
    /**
     * - (default: false) If true, will rely on `history.pushState` to
     * change URLs where supported. Falls back to hash-prefixed paths in browsers that do not
     * support `pushState`.
     */
    enabled: boolean;
    /**
     * - (default: `true`) When html5Mode is enabled, specifies
     * whether or not a `<base>` tag is required to be present. If both `enabled` and `requireBase`
     * are true, and a `<base>` tag is not present, an error will be thrown when `$location` is injected.
     * See the {@link guide /$location $location guide} for more information.
     */
    requireBase: boolean;
    /**
     * - (default: `true`) When html5Mode is enabled, enables or
     * disables URL rewriting for relative links. If set to a string, URL rewriting will only apply to links
     * with an attribute that matches the given string. For example, if set to `'internal-link'`, URL rewriting
     * will only occur for `<a internal-link>` links. Note that [attribute name normalization](guide/directive#normalization)
     * does not apply here, so `'internalLink'` will **not** match `'internal-link'`.
     */
    rewriteLinks: boolean | string;
};
import { JQLite } from "../../shared/jqlite/jqlite.js";
