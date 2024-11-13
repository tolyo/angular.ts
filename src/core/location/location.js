import { JQLite } from "../../shared/jqlite/jqlite";
import { urlResolve } from "../url-utils/url-utils";
import {
  encodeUriSegment,
  isDefined,
  isNumber,
  isObject,
  isString,
  isUndefined,
  minErr,
  parseKeyValue,
  toInt,
  toKeyValue,
} from "../../shared/utils";

/**
 * @typedef {Object} DefaultPorts
 * @property {number} http
 * @property {number} https
 * @property {number} ftp
 */

/**
 * @typedef {Object} Html5Mode
 * @property {boolean} enabled
 * @property {boolean} requireBase
 * @property {boolean|string} rewriteLinks
 */

/** @type {DefaultPorts} */
const DEFAULT_PORTS = { http: 80, https: 443, ftp: 21 };
const PATH_MATCH = /^([^?#]*)(\?([^#]*))?(#(.*))?$/;
const $locationMinErr = minErr("$location");

/**
 * @abstract
 */
export class Location {
  /**
   * @param {string} appBase application base URL
   * @param {string} appBaseNoFile application base URL stripped of any filename
   */
  constructor(appBase, appBaseNoFile) {
    const parsedUrl = urlResolve(appBase);

    /** @type {string} */
    this.appBase = appBase;

    /** @type {string} */
    this.appBaseNoFile = appBaseNoFile;

    /**
     * An absolute URL is the full URL, including protocol (http/https ), the optional subdomain (e.g. www ), domain (example.com), and path (which includes the directory and slug).
     * @type {string}
     */
    this.$$absUrl = "";

    /**
     * If html5 mode is enabled
     * @type {boolean}
     */
    this.$$html5 = false;

    /**
     * Has any change been replacing?
     * @type {boolean}
     */
    this.$$replace = false;

    /** @type {import('../url-utils/url-utils').HttpProtocol} */
    this.$$protocol = parsedUrl.protocol;

    /** @type {string} */
    this.$$host = parsedUrl.hostname;

    /**
     * The port, without ":"
     * @type {number}
     */
    this.$$port =
      toInt(parsedUrl.port) || DEFAULT_PORTS[parsedUrl.protocol] || null;

    /**
     * The pathname, beginning with "/"
     * @type {string}
     */
    this.$$path = undefined;

    /**
     * The hash string, minus the hash symbol
     * @type {string}
     */
    this.$$hash = undefined;

    /**
     * Helper property for scope watch changes
     * @type {boolean}
     */
    this.$$urlUpdatedByLocation = false;
  }

  /**
   * Return full URL representation with all segments encoded according to rules specified in
   * [RFC 3986](http://www.ietf.org/rfc/rfc3986.txt).
   *
   * @return {string} full URL
   */
  absUrl() {
    return this.$$absUrl;
  }

  /**
   * This method is getter / setter.
   *
   * Return URL (e.g. `/path?a=b#hash`) when called without any parameter.
   * Change path, search and hash, when called with parameter and return `$location`.
   *
   * @param {string=} url New URL without base prefix (e.g. `/path?a=b#hash`)
   * @return {Location|string} url
   */
  url(url) {
    if (isUndefined(url)) {
      return this.$$url;
    }

    const match = PATH_MATCH.exec(url);
    if (match[1] || url === "") this.path(decodeURIComponent(match[1]));
    if (match[2] || match[1] || url === "") this.search(match[3] || "");
    this.hash(match[5] || "");

    return this;
  }

  /**
   *
   * Return protocol of current URL.
   * @return {import("../url-utils/url-utils").HttpProtocol} protocol of current URL
   */
  protocol() {
    return this.$$protocol;
  }

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
  host() {
    return this.$$host;
  }

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
  port() {
    return this.$$port;
  }

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
  path(path) {
    if (isUndefined(path)) {
      return this.$$path;
    }
    let newPath = path !== null ? path.toString() : "";
    this.$$path = newPath.charAt(0) === "/" ? newPath : `/${newPath}`;
    this.$$compose();
    return this;
  }

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
  hash(hash) {
    if (isUndefined(hash)) {
      return this.$$hash;
    }

    this.$$hash = hash !== null ? hash.toString() : "";
    this.$$compose();
    return this;
  }

  /**
   * If called, all changes to $location during the current `$digest` will replace the current history
   * record, instead of adding a new one.
   */
  replace() {
    this.$$replace = true;
    return this;
  }

  /**
   * Returns or sets the search part (as object) of current URL when called without any parameter
   *
   * @param {string|Object=} search New search params - string or hash object.
   * @param {(string|number|Array<string>|boolean)=} paramValue If search is a string or number, then paramValue will override only a single search property.
   * @returns {Object|Location} Search object or Location object
   */
  search(search, paramValue) {
    switch (arguments.length) {
      case 0:
        return this.$$search;
      case 1:
        if (isString(search) || isNumber(search)) {
          search = search.toString();
          this.$$search = parseKeyValue(search);
        } else if (isObject(search)) {
          search = structuredClone(search, {});
          // remove object undefined or null properties
          Object.entries(search).forEach(([key, value]) => {
            if (value == null) delete search[key];
          });

          this.$$search = search;
        } else {
          throw $locationMinErr(
            "isrcharg",
            "The first argument of the `$location#search()` call must be a string or an object.",
          );
        }
        break;
      default:
        if (isUndefined(paramValue) || paramValue === null) {
          delete this.$$search[search];
        } else {
          this.$$search[search] = paramValue;
        }
    }

    this.$$compose();
    return this;
  }

  /**
   * Compose url and update `url` and `absUrl` property
   * @returns {void}
   */
  $$compose() {
    this.$$url = normalizePath(this.$$path, this.$$search, this.$$hash);
    this.$$absUrl = this.$$normalizeUrl(this.$$url);
    this.$$urlUpdatedByLocation = true;
  }

  /**
   * @param {string} _url
   * @returns {string}
   */
  $$normalizeUrl(_url) {
    throw new Error(`Method not implemented ${_url}`);
  }

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
  state(state) {
    if (!arguments.length) {
      return this.$$state;
    }

    if (!(this instanceof LocationHtml5Url) || !this.$$html5) {
      throw $locationMinErr(
        "nostate",
        "History API state support is available only " +
          "in HTML5 mode and only in browsers supporting HTML5 History API",
      );
    }
    // The user might modify `stateObject` after invoking `$location.state(stateObject)`
    // but we're changing the $$state reference to $browser.state() during the $digest
    // so the modification window is narrow.
    this.$$state = isUndefined(state) ? null : state;
    this.$$urlUpdatedByLocation = true;
    return this;
  }

  /**
   * @param {string} _url
   * @param {string} _url2
   * @returns {boolean}
   */
  $$parseLinkUrl(_url, _url2) {
    throw new Error(`Method not implemented ${_url} ${_url2}`);
  }

  $$parse(_url) {
    throw new Error(`Method not implemented ${_url}`);
  }
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
  constructor(appBase, appBaseNoFile, basePrefix) {
    super(appBase, appBaseNoFile);
    this.$$html5 = true;
    this.basePrefix = basePrefix || "";
  }

  /**
   * Parse given HTML5 (regular) URL string into properties
   * @param {string} url HTML5 URL
   */
  $$parse(url) {
    const pathUrl = stripBaseUrl(this.appBaseNoFile, url);
    if (!isString(pathUrl)) {
      throw $locationMinErr(
        "ipthprfx",
        'Invalid url "{0}", missing path prefix "{1}".',
        url,
        this.appBaseNoFile,
      );
    }

    parseAppUrl(pathUrl, this, true);

    if (!this.$$path) {
      this.$$path = "/";
    }

    this.$$compose();
  }

  $$normalizeUrl(url) {
    return this.appBaseNoFile + url.substr(1); // first char is always '/'
  }

  /**
   * @param {string} url
   * @param {string} relHref
   * @returns {boolean}
   */
  $$parseLinkUrl(url, relHref) {
    if (relHref && relHref[0] === "#") {
      // special case for links to hash fragments:
      // keep the old url and only replace the hash fragment
      this.hash(relHref.slice(1));
      return true;
    }
    let appUrl;
    let prevAppUrl;
    let rewrittenUrl;

    if (isDefined((appUrl = stripBaseUrl(this.appBase, url)))) {
      prevAppUrl = appUrl;
      if (
        this.basePrefix &&
        isDefined((appUrl = stripBaseUrl(this.basePrefix, appUrl)))
      ) {
        rewrittenUrl =
          this.appBaseNoFile + (stripBaseUrl("/", appUrl) || appUrl);
      } else {
        rewrittenUrl = this.appBase + prevAppUrl;
      }
    } else if (isDefined((appUrl = stripBaseUrl(this.appBaseNoFile, url)))) {
      rewrittenUrl = this.appBaseNoFile + appUrl;
    } else if (this.appBaseNoFile === `${url}/`) {
      rewrittenUrl = this.appBaseNoFile;
    }
    if (rewrittenUrl) {
      this.$$parse(rewrittenUrl);
    }
    return !!rewrittenUrl;
  }
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
  constructor(appBase, appBaseNoFile, hashPrefix) {
    super(appBase, appBaseNoFile);
    this.hashPrefix = hashPrefix;
  }

  /**
   * Parse given hashbang URL into properties
   * @param {string} url Hashbang URL
   */
  $$parse(url) {
    const withoutBaseUrl =
      stripBaseUrl(this.appBase, url) || stripBaseUrl(this.appBaseNoFile, url);
    let withoutHashUrl;

    if (!isUndefined(withoutBaseUrl) && withoutBaseUrl.charAt(0) === "#") {
      // The rest of the URL starts with a hash so we have
      // got either a hashbang path or a plain hash fragment
      withoutHashUrl = stripBaseUrl(this.hashPrefix, withoutBaseUrl);
      if (isUndefined(withoutHashUrl)) {
        // There was no hashbang prefix so we just have a hash fragment
        withoutHashUrl = withoutBaseUrl;
      }
    } else {
      // There was no hashbang path nor hash fragment:
      // If we are in HTML5 mode we use what is left as the path;
      // Otherwise we ignore what is left
      if (this.$$html5) {
        withoutHashUrl = withoutBaseUrl;
      } else {
        withoutHashUrl = "";
        if (isUndefined(withoutBaseUrl)) {
          this.appBase = url;
          /** @type {?} */ (this).replace();
        }
      }
    }

    parseAppUrl(withoutHashUrl, this, false);

    this.$$path = removeWindowsDriveName(
      this.$$path,
      withoutHashUrl,
      this.appBase,
    );

    this.$$compose();

    /*
     * In Windows, on an anchor node on documents loaded from
     * the filesystem, the browser will return a pathname
     * prefixed with the drive name ('/C:/path') when a
     * pathname without a drive is set:
     *  * a.setAttribute('href', '/foo')
     *   * a.pathname === '/C:/foo' //true
     *
     * Inside of AngularJS, we're always using pathnames that
     * do not include drive names for routing.
     */
    function removeWindowsDriveName(path, url, base) {
      /*
      Matches paths for file protocol on windows,
      such as /C:/foo/bar, and captures only /foo/bar.
      */
      const windowsFilePathExp = /^\/[A-Z]:(\/.*)/;

      let firstPathSegmentMatch;

      // Get the relative path from the input URL.
      if (startsWith(url, base)) {
        url = url.replace(base, "");
      }

      // The input URL intentionally contains a first path segment that ends with a colon.
      if (windowsFilePathExp.exec(url)) {
        return path;
      }

      firstPathSegmentMatch = windowsFilePathExp.exec(path);
      return firstPathSegmentMatch ? firstPathSegmentMatch[1] : path;
    }
  }

  $$normalizeUrl(url) {
    return this.appBase + (url ? this.hashPrefix + url : "");
  }

  /**
   * @param {string} url
   * @returns {boolean}
   */
  $$parseLinkUrl(url) {
    if (stripHash(this.appBase) === stripHash(url)) {
      this.$$parse(url);
      return true;
    }
    return false;
  }
}

export class LocationProvider {
  constructor() {
    this.hashPrefixValue = "!";
    this.html5ModeConfig = {
      enabled: false,
      requireBase: true,
      rewriteLinks: true,
    };
  }

  /**
   * The default value for the prefix is `'!'`.
   * @param {string=} prefix - Prefix for hash part (containing path and search)
   * @returns {string|LocationProvider} current value if used as getter or itself (chaining) if used as setter
   */
  hashPrefix(prefix) {
    if (typeof prefix !== "undefined") {
      this.hashPrefixValue = prefix;
      return this;
    }
    return this.hashPrefixValue;
  }

  /**
   * @param {(boolean|Object)=} mode If boolean, sets `html5Mode.enabled` to value.
   *   If object, sets `enabled`, `requireBase` and `rewriteLinks` to respective values. Supported
   *   properties:
   *   - **enabled** – `{boolean}` – (default: false) If true, will rely on `history.pushState` to
   *     change urls where supported. Will fall back to hash-prefixed paths in browsers that do not
   *     support `pushState`.
   *   - **requireBase** - `{boolean}` - (default: `true`) When html5Mode is enabled, specifies
   *     whether or not a <base> tag is required to be present. If `enabled` and `requireBase` are
   *     true, and a base tag is not present, an error will be thrown when `$location` is injected.
   *     See the {@link guide/$location $location guide for more information}
   *   - **rewriteLinks** - `{boolean|string}` - (default: `true`) When html5Mode is enabled,
   *     enables/disables URL rewriting for relative links. If set to a string, URL rewriting will
   *     only happen on links with an attribute that matches the given string. For example, if set
   *     to `'internal-link'`, then the URL will only be rewritten for `<a internal-link>` links.
   *     Note that [attribute name normalization](guide/directive#normalization) does not apply
   *     here, so `'internalLink'` will **not** match `'internal-link'`.
   *
   * @returns {Object} html5Mode object if used as getter or itself (chaining) if used as setter
   */
  html5Mode(mode) {
    if (typeof mode === "boolean") {
      this.html5ModeConfig.enabled = mode;
      return this;
    }

    if (typeof mode === "object") {
      if (typeof mode.enabled === "boolean")
        this.html5ModeConfig.enabled = mode.enabled;
      if (typeof mode.requireBase === "boolean")
        this.html5ModeConfig.requireBase = mode.requireBase;
      if (
        typeof mode.rewriteLinks === "boolean" ||
        typeof mode.rewriteLinks === "string"
      ) {
        this.html5ModeConfig.rewriteLinks = mode.rewriteLinks;
      }
      return this;
    }
    return this.html5ModeConfig;
  }

  $get = [
    "$rootScope",
    "$browser",
    "$rootElement",
    /**
     *
     * @param {import('../scope/scope').Scope} $rootScope
     * @param {import('../../services/browser').Browser} $browser
     * @param {JQLite} $rootElement
     * @returns
     */
    function ($rootScope, $browser, $rootElement) {
      /** @type {Location} */
      let $location;
      let LocationMode;
      const baseHref = $browser.baseHref(); // if base[href] is undefined, it defaults to ''
      const initialUrl = /** @type {string} */ ($browser.url());
      let appBase;

      if (this.html5Mode.enabled) {
        if (!baseHref && this.html5Mode.requireBase) {
          throw $locationMinErr(
            "nobase",
            "$location in HTML5 mode requires a <base> tag to be present!",
          );
        }
        appBase = serverBase(initialUrl) + (baseHref || "/");
        LocationMode = LocationHtml5Url;
      } else {
        appBase = stripHash(initialUrl);
        LocationMode = LocationHashbangUrl;
      }
      const appBaseNoFile = stripFile(appBase);

      $location = new LocationMode(
        appBase,
        appBaseNoFile,
        `#${this.hashPrefix}`,
      );
      $location.$$parseLinkUrl(initialUrl, initialUrl);

      $location.$$state = $browser.state();

      const IGNORE_URI_REGEXP = /^\s*(javascript|mailto):/i;

      function setBrowserUrlWithFallback(url, state) {
        const oldUrl = $location.url();
        const oldState = $location.$$state;
        try {
          $browser.url(url, state);

          // Make sure $location.state() returns referentially identical (not just deeply equal)
          // state object; this makes possible quick checking if the state changed in the digest
          // loop. Checking deep equality would be too expensive.
          $location.$$state = $browser.state();
        } catch (e) {
          // Restore old values if pushState fails
          $location.url(/** @type {string} */ (oldUrl));
          $location.$$state = oldState;

          throw e;
        }
      }

      $rootElement.on("click", (event) => {
        const { rewriteLinks } = this.html5Mode;
        // TODO(vojta): rewrite link when opening in new tab/window (in legacy browser)
        // currently we open nice url link and redirect then

        if (
          !rewriteLinks ||
          event.ctrlKey ||
          event.metaKey ||
          event.shiftKey ||
          event.which === 2 ||
          event.button === 2
        )
          return;

        let elm = JQLite(event.target);

        // traverse the DOM up to find first A tag
        while (elm[0].nodeName.toLowerCase() !== "a") {
          // ignore rewriting if no A tag (reached root element, or no parent - removed from document)
          if (elm[0] === $rootElement[0] || !(elm = elm.parent())[0]) return;
        }

        if (isString(rewriteLinks) && isUndefined(elm.attr(rewriteLinks)))
          return;

        let absHref = elm[0].href;
        // get the actual href attribute - see
        // http://msdn.microsoft.com/en-us/library/ie/dd347148(v=vs.85).aspx
        const relHref = elm.attr("href") || elm.attr("xlink:href");

        if (
          isObject(absHref) &&
          absHref.toString() === "[object SVGAnimatedString]"
        ) {
          // SVGAnimatedString.animVal should be identical to SVGAnimatedString.baseVal, unless during
          // an animation.
          absHref = urlResolve(absHref.animVal).href;
        }

        // Ignore when url is started with javascript: or mailto:
        if (IGNORE_URI_REGEXP.test(absHref)) return;

        if (absHref && !elm.attr("target") && !event.isDefaultPrevented()) {
          if ($location.$$parseLinkUrl(absHref, relHref)) {
            // We do a preventDefault for all urls that are part of the AngularJS application,
            // in html5mode and also without, so that we are able to abort navigation without
            // getting double entries in the location history.
            event.preventDefault();
            // update location manually
            // if ($location.absUrl() !== $browser.url()) {
            //   $rootScope.$apply();
            // }
          }
        }
      });

      // rewrite hashbang url <> html5 url
      if ($location.absUrl() !== initialUrl) {
        $browser.url($location.absUrl(), true);
      }

      let initializing = true;

      // update $location when $browser url changes
      $browser.onUrlChange((newUrl, newState) => {
        if (!startsWith(newUrl, appBaseNoFile)) {
          // If we are navigating outside of the app then force a reload
          window.location.href = newUrl;
          return;
        }

        $rootScope.$evalAsync(() => {
          const oldUrl = $location.absUrl();
          const oldState = $location.$$state;
          let defaultPrevented;
          $location.$$parse(newUrl);
          $location.$$state = newState;

          defaultPrevented = $rootScope.$broadcast(
            "$locationChangeStart",
            newUrl,
            oldUrl,
            newState,
            oldState,
          ).defaultPrevented;

          // if the location was changed by a `$locationChangeStart` handler then stop
          // processing this location change
          if ($location.absUrl() !== newUrl) return;

          if (defaultPrevented) {
            $location.$$parse(oldUrl);
            $location.$$state = oldState;
            setBrowserUrlWithFallback(oldUrl, oldState);
          } else {
            initializing = false;
            afterLocationChange(oldUrl, oldState);
          }
        });
      });

      // update browser
      function browserUpdate() {
        if (initializing || $location.$$urlUpdatedByLocation) {
          $location.$$urlUpdatedByLocation = false;

          const oldUrl = /** @type {string} */ ($browser.url());
          const newUrl = $location.absUrl();
          const oldState = $browser.state();
          const urlOrStateChanged =
            !urlsEqual(oldUrl, newUrl) ||
            ($location.$$html5 && oldState !== $location.$$state);

          if (initializing || urlOrStateChanged) {
            initializing = false;

            $rootScope.$evalAsync(() => {
              const newUrl = $location.absUrl();
              const { defaultPrevented } = $rootScope.$broadcast(
                "$locationChangeStart",
                newUrl,
                oldUrl,
                $location.$$state,
                oldState,
              );

              // if the location was changed by a `$locationChangeStart` handler then stop
              // processing this location change
              if ($location.absUrl() !== newUrl) return;

              if (defaultPrevented) {
                $location.$$parse(oldUrl);
                $location.$$state = oldState;
              } else {
                if (urlOrStateChanged) {
                  setBrowserUrlWithFallback(
                    newUrl,
                    oldState === $location.$$state ? null : $location.$$state,
                  );
                }
                afterLocationChange(oldUrl, oldState);
              }
            });
          }
        }

        $location.$$replace = false;

        // we don't need to return anything because $evalAsync will make the digest loop dirty when
        // there is a change
      }

      setTimeout(() => browserUpdate());

      return $location;

      function afterLocationChange(oldUrl, oldState) {
        $rootScope.$broadcast(
          "$locationChangeSuccess",
          $location.absUrl(),
          oldUrl,
          $location.$$state,
          oldState,
        );
        browserUpdate();
      }
    },
  ];
}

/**
 * ///////////////////////////
 *          HELPERS
 * ///////////////////////////
 */

/**
 * Encode path using encodeUriSegment, ignoring forward slashes
 *
 * @param {string} path Path to encode
 * @returns {string}
 */
function encodePath(path) {
  const segments = path.split("/");
  let i = segments.length;

  while (i--) {
    // decode forward slashes to prevent them from being double encoded
    segments[i] = encodeUriSegment(segments[i].replace(/%2F/g, "/"));
  }

  return segments.join("/");
}

function decodePath(path, html5Mode) {
  const segments = path.split("/");
  let i = segments.length;

  while (i--) {
    segments[i] = decodeURIComponent(segments[i]);
    if (html5Mode) {
      // encode forward slashes to prevent them from being mistaken for path separators
      segments[i] = segments[i].replace(/\//g, "%2F");
    }
  }

  return segments.join("/");
}

function normalizePath(pathValue, searchValue, hashValue) {
  const search = toKeyValue(searchValue);
  const hash = hashValue ? `#${encodeUriSegment(hashValue)}` : "";
  const path = encodePath(pathValue);

  return path + (search ? `?${search}` : "") + hash;
}

function parseAppUrl(url, locationObj, html5Mode) {
  if (/^\s*[\\/]{2,}/.test(url)) {
    throw $locationMinErr("badpath", 'Invalid url "{0}".', url);
  }

  const prefixed = url.charAt(0) !== "/";
  if (prefixed) {
    url = `/${url}`;
  }
  const match = urlResolve(url);
  const path =
    prefixed && match.pathname.charAt(0) === "/"
      ? match.pathname.substring(1)
      : match.pathname;
  locationObj.$$path = decodePath(path, html5Mode);
  locationObj.$$search = parseKeyValue(match.search);
  locationObj.$$hash = decodeURIComponent(match.hash);

  // make sure path starts with '/';
  if (locationObj.$$path && locationObj.$$path.charAt(0) !== "/") {
    locationObj.$$path = `/${locationObj.$$path}`;
  }
}

function startsWith(str, search) {
  return str.slice(0, search.length) === search;
}

/**
 *
 * @param {string} base
 * @param {string} url
 * @returns {string} returns text from `url` after `base` or `undefined` if it does not begin with
 *                   the expected string.
 */
export function stripBaseUrl(base, url) {
  if (startsWith(url, base)) {
    return url.substr(base.length);
  }
}

export function stripHash(url) {
  const index = url.indexOf("#");
  return index === -1 ? url : url.substr(0, index);
}

export function stripFile(url) {
  return url.substr(0, stripHash(url).lastIndexOf("/") + 1);
}

/* return the server only (scheme://host:port) */
export function serverBase(url) {
  return url.substring(0, url.indexOf("/", url.indexOf("//") + 2));
}

// Determine if two URLs are equal despite potentially having different encoding/normalizing
//  such as $location.absUrl() vs $browser.url()
// See https://github.com/angular/angular.js/issues/16592
function urlsEqual(a, b) {
  return a === b || urlResolve(a).href === urlResolve(b).href;
}
