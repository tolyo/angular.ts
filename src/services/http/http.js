import { urlIsAllowedOriginFactory } from "../../core/url-utils/url-utils";
import {
  minErr,
  isObject,
  isDate,
  toJson,
  isUndefined,
  isFunction,
  encodeUriQuery,
  isString,
  fromJson,
  lowercase,
  trim,
  isFile,
  isBlob,
  isFormData,
  shallowCopy,
  isDefined,
  extend,
  uppercase,
  isPromiseLike,
} from "../../shared/utils";
import { getCookies } from "../cookie-reader";

const APPLICATION_JSON = "application/json";
const CONTENT_TYPE_APPLICATION_JSON = {
  "Content-Type": `${APPLICATION_JSON};charset=utf-8`,
};
const JSON_START = /^\[|^\{(?!\{)/;
const JSON_ENDS = {
  "[": /]$/,
  "{": /}$/,
};
const JSON_PROTECTION_PREFIX = /^\)]\}',?\n/;
const $httpMinErr = minErr("$http");

function serializeValue(v) {
  if (isObject(v)) {
    return isDate(v) ? v.toISOString() : toJson(v);
  }
  return v;
}

/**
 * Default params serializer that converts objects to strings
 * according to the following rules:
 *
 * * `{'foo': 'bar'}` results in `foo=bar`
 * * `{'foo': Date.now()}` results in `foo=2015-04-01T09%3A50%3A49.262Z` (`toISOString()` and encoded representation of a Date object)
 * * `{'foo': ['bar', 'baz']}` results in `foo=bar&foo=baz` (repeated key for each array element)
 * * `{'foo': {'bar':'baz'}}` results in `foo=%7B%22bar%22%3A%22baz%22%7D` (stringified and encoded representation of an object)
 *
 * Note that serializer will sort the request parameters alphabetically.
 */
export function HttpParamSerializerProvider() {
  this.$get = function () {
    return function ngParamSerializer(params) {
      if (!params) return "";
      const parts = [];
      Object.keys(params)
        .sort()
        .forEach((key) => {
          const value = params[key];
          if (value === null || isUndefined(value) || isFunction(value)) return;
          if (Array.isArray(value)) {
            value.forEach((v) => {
              parts.push(
                `${encodeUriQuery(key)}=${encodeUriQuery(serializeValue(v))}`,
              );
            });
          } else {
            parts.push(
              `${encodeUriQuery(key)}=${encodeUriQuery(serializeValue(value))}`,
            );
          }
        });

      return parts.join("&");
    };
  };
}

export function defaultHttpResponseTransform(data, headers) {
  if (isString(data)) {
    // Strip json vulnerability protection prefix and trim whitespace
    const tempData = data.replace(JSON_PROTECTION_PREFIX, "").trim();

    if (tempData) {
      const contentType = headers("Content-Type");
      const hasJsonContentType =
        contentType && contentType.indexOf(APPLICATION_JSON) === 0;

      if (hasJsonContentType || isJsonLike(tempData)) {
        try {
          data = fromJson(tempData);
        } catch (e) {
          if (!hasJsonContentType) {
            return data;
          }
          throw $httpMinErr(
            "baddata",
            'Data must be a valid JSON object. Received: "{0}". ' +
              'Parse error: "{1}"',
            data,
            e,
          );
        }
      }
    }
  }

  return data;
}

function isJsonLike(str) {
  const jsonStart = str.match(JSON_START);
  return jsonStart && JSON_ENDS[jsonStart[0]].test(str);
}

/**
 * Parse headers into key value object
 *
 * @param {string} headers Raw headers as a string
 * @returns {Object} Parsed headers as key value object
 */
function parseHeaders(headers) {
  const parsed = Object.create(null);
  let i;

  function fillInParsed(key, val) {
    if (key) {
      parsed[key] = parsed[key] ? `${parsed[key]}, ${val}` : val;
    }
  }

  if (isString(headers)) {
    headers.split("\n").forEach(
      /** @param {string} line */
      (line) => {
        i = line.indexOf(":");
        fillInParsed(
          line.substring(0, i).trim().toLowerCase(),
          trim(line.substring(i + 1)),
        );
      },
    );
  } else if (isObject(headers)) {
    Object.entries(headers).forEach(([headerKey, headerVal]) => {
      fillInParsed(lowercase(headerKey), trim(headerVal));
    });
  }

  return parsed;
}

/**
 * Returns a function that provides access to parsed headers.
 *
 * Headers are lazy parsed when first requested.
 * @see parseHeaders
 *
 * @param {(string|Object)} headers Headers to provide access to.
 * @returns {function(string=)} Returns a getter function which if called with:
 *
 *   - if called with an argument returns a single header value or null
 *   - if called with no arguments returns an object containing all headers.
 */
function headersGetter(headers) {
  let headersObj;

  return function (name) {
    if (!headersObj) headersObj = parseHeaders(headers);

    if (name) {
      let value = headersObj[lowercase(name)];
      if (value === undefined) {
        value = null;
      }
      return value;
    }

    return headersObj;
  };
}

/**
 * Chain all given functions
 *
 * This function is used for both request and response transforming
 *
 * @param {*} data Data to transform.
 * @param {function(string=):any} headers HTTP headers getter fn.
 * @param {number} status HTTP status code of the response.
 * @param {function(...any): any | Array<Function>} fns Function or an array of functions.
 * @returns {*} Transformed data.
 */
function transformData(data, headers, status, fns) {
  if (isFunction(fns)) {
    return fns(data, headers, status);
  }

  if (Array.isArray(fns)) {
    /** @type {Array<function(...any): any>} */ (fns).forEach((fn) => {
      data = fn(data, headers, status);
    });
  }

  return data;
}

function isSuccess(status) {
  return status >= 200 && status < 300;
}

/**
 * Use `$httpProvider` to change the default behavior of the {@link ng.$http $http} service.
 */
export function HttpProvider() {
  /**
   * Object containing default values for all {@link ng.$http $http} requests.
   *
   * - **`defaults.cache`** - {boolean|Object} - A boolean value or object created with
   * {@link ng.$cacheFactory `$cacheFactory`} to enable or disable caching of HTTP responses
   * by default. See {@link $http#caching $http Caching} for more information.
   *
   * - **`defaults.headers`** - {Object} - Default headers for all $http requests.
   * Refer to {@link ng.$http#setting-http-headers $http} for documentation on
   * setting default headers.
   *     - **`defaults.headers.common`**
   *     - **`defaults.headers.post`**
   *     - **`defaults.headers.put`**
   *     - **`defaults.headers.patch`**
   *   *
   * - **`defaults.paramSerializer`** - `{string|function(Object<string,string>):string}` - A function
   *  used to the prepare string representation of request parameters (specified as an object).
   *  If specified as string, it is interpreted as a function registered with the {@link auto.$injector $injector}.
   *  Defaults to {@link ng.$httpParamSerializer $httpParamSerializer}.
   *
   * - **`defaults.transformRequest`** -
   * `{Array<function(data, headersGetter)>|function(data, headersGetter)}` -
   * An array of functions (or a single function) which are applied to the request data.
   * By default, this is an array with one request transformation function:
   *
   *   - If the `data` property of the request configuration object contains an object, serialize it
   *     into JSON format.
   *
   * - **`defaults.transformResponse`** -
   * `{Array<function(data, headersGetter, status)>|function(data, headersGetter, status)}` -
   * An array of functions (or a single function) which are applied to the response data. By default,
   * this is an array which applies one response transformation function that does two things:
   *
   *  - If XSRF prefix is detected, strip it
   *    (see {@link ng.$http#security-considerations Security Considerations in the $http docs}).
   *  - If the `Content-Type` is `application/json` or the response looks like JSON,
   *    deserialize it using a JSON parser.
   *
   * - **`defaults.xsrfCookieName`** - {string} - Name of cookie containing the XSRF token.
   * Defaults value is `'XSRF-TOKEN'`.
   *
   * - **`defaults.xsrfHeaderName`** - {string} - Name of HTTP header to populate with the
   * XSRF token. Defaults value is `'X-XSRF-TOKEN'`.
   *
   */
  const defaults = (this.defaults = {
    // transform incoming response data
    transformResponse: [defaultHttpResponseTransform],

    // transform outgoing request data
    transformRequest: [
      function (d) {
        return isObject(d) && !isFile(d) && !isBlob(d) && !isFormData(d)
          ? toJson(d)
          : d;
      },
    ],

    // default headers
    headers: {
      common: {
        Accept: "application/json, text/plain, */*",
      },
      post: shallowCopy(CONTENT_TYPE_APPLICATION_JSON),
      put: shallowCopy(CONTENT_TYPE_APPLICATION_JSON),
      patch: shallowCopy(CONTENT_TYPE_APPLICATION_JSON),
    },

    xsrfCookieName: "XSRF-TOKEN",
    xsrfHeaderName: "X-XSRF-TOKEN",

    paramSerializer: "$httpParamSerializer",
  });

  let useApplyAsync = false;
  /**
   * Configure $http service to combine processing of multiple http responses received at around
   * the same time via {@link ng.$rootScope.Scope#$applyAsync $rootScope.$applyAsync}. This can result in
   * significant performance improvement for bigger applications that make many HTTP requests
   * concurrently (common during application bootstrap).
   *
   * Defaults to false. If no value is specified, returns the current configured value.
   *
   * @param {boolean=} value If true, when requests are loaded, they will schedule a deferred
   *    "apply" on the next tick, giving time for subsequent requests in a roughly ~10ms window
   *    to load and share the same digest cycle.
   *
   * @returns {boolean|Object} If a value is specified, returns the $httpProvider for chaining.
   *    otherwise, returns the current configured value.
   */
  this.useApplyAsync = function (value) {
    if (isDefined(value)) {
      useApplyAsync = !!value;
      return this;
    }
    return useApplyAsync;
  };

  /**
   * Array containing service factories for all synchronous or asynchronous {@link ng.$http $http}
   * pre-processing of request or postprocessing of responses.
   *
   * These service factories are ordered by request, i.e. they are applied in the same order as the
   * array, on request, but reverse order, on response.
   *
   * {@link ng.$http#interceptors Interceptors detailed info}
   */
  const interceptorFactories = (this.interceptors = []);

  /**
   * Array containing URLs whose origins are trusted to receive the XSRF token. See the
   * {@link ng.$http#security-considerations Security Considerations} sections for more details on
   * XSRF.
   *
   * **Note:** An "origin" consists of the [URI scheme](https://en.wikipedia.org/wiki/URI_scheme),
   * the [hostname](https://en.wikipedia.org/wiki/Hostname) and the
   * [port number](https://en.wikipedia.org/wiki/Port_(computer_networking). For `http:` and
   * `https:`, the port number can be omitted if using th default ports (80 and 443 respectively).
   * Examples: `http://example.com`, `https://api.example.com:9876`
   *
   * <div class="alert alert-warning">
   *   It is not possible to trust specific URLs/paths. The `path`, `query` and `fragment` parts
   *   of a URL will be ignored. For example, `https://foo.com/path/bar?query=baz#fragment` will be
   *   treated as `https://foo.com`, meaning that **all** requests to URLs starting with
   *   `https://foo.com/` will include the XSRF token.
   * </div>
   *
   * @example
   *
   * ```js
   * // App served from `https://example.com/`.
   * angular.
   *   module('xsrfTrustedOriginsExample', []).
   *   config(['$httpProvider', function($httpProvider) {
   *     $httpProvider.xsrfTrustedOrigins.push('https://api.example.com');
   *   }]).
   *   run(['$http', function($http) {
   *     // The XSRF token will be sent.
   *     $http.get('https://api.example.com/preferences').then(...);
   *
   *     // The XSRF token will NOT be sent.
   *     $http.get('https://stats.example.com/activity').then(...);
   *   }]);
   * ```
   */
  const xsrfTrustedOrigins = (this.xsrfTrustedOrigins = []);

  /**
   * This property is deprecated. Use {@link $httpProvider#xsrfTrustedOrigins xsrfTrustedOrigins}
   * instead.
   */
  Object.defineProperty(this, "xsrfWhitelistedOrigins", {
    get() {
      return this.xsrfTrustedOrigins;
    },
    set(origins) {
      this.xsrfTrustedOrigins = origins;
    },
  });

  this.$get = [
    "$browser",
    "$httpBackend",
    "$rootScope",
    "$injector",
    "$sce",
    /**
     *
     * @param {*} $browser
     * @param {*} $httpBackend
     * @param {*} $rootScope
     * @param {import("../../core/di/internal-injector").InjectorService} $injector
     * @param {*} $sce
     * @returns
     */
    function ($browser, $httpBackend, $rootScope, $injector, $sce) {
      /**
       * @type {Map<string, string>}
       */
      const defaultCache = new Map();

      /**
       * Make sure that default param serializer is exposed as a function
       */
      defaults.paramSerializer = isString(defaults.paramSerializer)
        ? $injector.get(defaults.paramSerializer)
        : defaults.paramSerializer;

      /**
       * Interceptors stored in reverse order. Inner interceptors before outer interceptors.
       * The reversal is needed so that we can build up the interception chain around the
       * server request.
       */
      const reversedInterceptors = [];

      interceptorFactories.forEach((interceptorFactory) => {
        reversedInterceptors.unshift(
          isString(interceptorFactory)
            ? $injector.get(interceptorFactory)
            : $injector.invoke(interceptorFactory),
        );
      });

      /**
       * A function to check request URLs against a list of allowed origins.
       */
      const urlIsAllowedOrigin = urlIsAllowedOriginFactory(xsrfTrustedOrigins);

      /**
       * @property {Array.<Object>} requestConfig Array of config objects for currently pending
       * requests. This is primarily meant to be used for debugging purposes.
       */
      function $http(requestConfig) {
        if (!isObject(requestConfig)) {
          throw minErr("$http")(
            "badreq",
            "Http request configuration must be an object.  Received: {0}",
            requestConfig,
          );
        }

        if (!isString($sce.valueOf(requestConfig.url))) {
          throw minErr("$http")(
            "badreq",
            "Http request configuration url must be a string or a $sce trusted object.  Received: {0}",
            requestConfig.url,
          );
        }

        const config = extend(
          {
            method: "get",
            transformRequest: defaults.transformRequest,
            transformResponse: defaults.transformResponse,
            paramSerializer: defaults.paramSerializer,
          },
          requestConfig,
        );

        config.headers = mergeHeaders(requestConfig);
        config.method = uppercase(config.method);
        config.paramSerializer = isString(config.paramSerializer)
          ? $injector.get(config.paramSerializer)
          : config.paramSerializer;

        $browser.$$incOutstandingRequestCount("$http");

        const requestInterceptors = [];
        const responseInterceptors = [];
        let promise = Promise.resolve(config);

        // apply interceptors
        reversedInterceptors.forEach((interceptor) => {
          if (interceptor.request || interceptor.requestError) {
            requestInterceptors.unshift(
              interceptor.request,
              interceptor.requestError,
            );
          }
          if (interceptor.response || interceptor.responseError) {
            responseInterceptors.push(
              interceptor.response,
              interceptor.responseError,
            );
          }
        });

        promise = chainInterceptors(promise, requestInterceptors);
        promise = promise.then(serverRequest);
        promise = chainInterceptors(promise, responseInterceptors);
        promise = promise.finally(completeOutstandingRequest);

        return promise;

        function chainInterceptors(promise, interceptors) {
          for (let i = 0, ii = interceptors.length; i < ii; ) {
            const thenFn = interceptors[i++];
            const rejectFn = interceptors[i++];

            promise = promise.then(thenFn, rejectFn);
          }

          interceptors.length = 0;

          return promise;
        }

        function completeOutstandingRequest() {
          $browser.$$completeOutstandingRequest(() => {}, "$http");
        }

        function executeHeaderFns(headers, config) {
          let headerContent;
          const processedHeaders = {};

          Object.entries(headers).forEach(([header, headerFn]) => {
            if (isFunction(headerFn)) {
              headerContent = headerFn(config);
              if (headerContent != null) {
                processedHeaders[header] = headerContent;
              }
            } else {
              processedHeaders[header] = headerFn;
            }
          });

          return processedHeaders;
        }

        function mergeHeaders(config) {
          let defHeaders = defaults.headers,
            reqHeaders = extend({}, config.headers);

          defHeaders = extend(
            {},
            defHeaders.common,
            defHeaders[lowercase(config.method)],
          );

          Object.keys(defHeaders).forEach((defHeaderName) => {
            const lowercaseDefHeaderName = lowercase(defHeaderName);
            const hasMatchingHeader = Object.keys(reqHeaders).some(
              (reqHeaderName) => {
                return lowercase(reqHeaderName) === lowercaseDefHeaderName;
              },
            );
            if (!hasMatchingHeader) {
              reqHeaders[defHeaderName] = defHeaders[defHeaderName];
            }
          });

          // execute if header value is a function for merged headers
          return executeHeaderFns(reqHeaders, shallowCopy(config));
        }

        function serverRequest(config) {
          const { headers } = config;
          const reqData = transformData(
            config.data,
            headersGetter(headers),
            undefined,
            config.transformRequest,
          );

          // strip content-type if data is undefined
          if (isUndefined(reqData)) {
            Object.keys(headers).forEach((header) => {
              if (lowercase(header) === "content-type") {
                delete headers[header];
              }
            });
          }

          if (
            isUndefined(config.withCredentials) &&
            !isUndefined(defaults.withCredentials)
          ) {
            config.withCredentials = defaults.withCredentials;
          }

          // send request
          return sendReq(config, reqData).then(
            transformResponse,
            transformResponse,
          );
        }

        function transformResponse(response) {
          // make a copy since the response must be cacheable
          const resp = extend({}, response);
          resp.data = transformData(
            response.data,
            response.headers,
            response.status,
            config.transformResponse,
          );
          return isSuccess(response.status) ? resp : Promise.reject(resp);
        }
      }

      $http.pendingRequests = [];

      /**
       * Shortcut method to perform `GET` request.
       *
       * @param {string} url Absolute or relative URL of the resource that is being requested;
       *                                   or an object created by a call to `$sce.trustAsResourceUrl(url)`.
       * @param {Object=} config Optional configuration object. See {@link ng.$http#$http-arguments `$http()` arguments}.
       * @returns {HttpPromise}  A Promise that will be resolved or rejected with a response object.
       * See {@link ng.$http#$http-returns `$http()` return value}.
       */

      /**
       * Shortcut method to perform `DELETE` request.
       *
       * @param {string} url Absolute or relative URL of the resource that is being requested;
       *                                   or an object created by a call to `$sce.trustAsResourceUrl(url)`.
       * @param {Object=} config Optional configuration object. See {@link ng.$http#$http-arguments `$http()` arguments}.
       * @returns {HttpPromise}  A Promise that will be resolved or rejected with a response object.
       * See {@link ng.$http#$http-returns `$http()` return value}.
       */

      /**
       * Shortcut method to perform `HEAD` request.
       *
       * @param {string} url Absolute or relative URL of the resource that is being requested;
       *                                   or an object created by a call to `$sce.trustAsResourceUrl(url)`.
       * @param {Object=} config Optional configuration object. See {@link ng.$http#$http-arguments `$http()` arguments}.
       * @returns {HttpPromise}  A Promise that will be resolved or rejected with a response object.
       * See {@link ng.$http#$http-returns `$http()` return value}.
       */

      /**
       * Shortcut method to perform `JSONP` request.
       *
       * Note that, since JSONP requests are sensitive because the response is given full access to the browser,
       * the url must be declared, via {@link $sce} as a trusted resource URL.
       * You can trust a URL by adding it to the trusted resource URL list via
       * {@link $sceDelegateProvider#trustedResourceUrlList  `$sceDelegateProvider.trustedResourceUrlList`} or
       * by explicitly trusting the URL via {@link $sce#trustAsResourceUrl `$sce.trustAsResourceUrl(url)`}.
       *
       * You should avoid generating the URL for the JSONP request from user provided data.
       * Provide additional query parameters via `params` property of the `config` parameter, rather than
       * modifying the URL itself.
       *
       * You can also specify a default callback parameter name in `$http.defaults.jsonpCallbackParam`.
       * Initially this is set to `'callback'`.
       *
       * <div class="alert alert-danger">
       * You can no longer use the `JSON_CALLBACK` string as a placeholder for specifying where the callback
       * parameter value should go.
       * </div>
       *
       * If you would like to customise where and how the callbacks are stored then try overriding
       * or decorating the {@link $jsonpCallbacks} service.
       *
       * @param {string} url Absolute or relative URL of the resource that is being requested;
       *                                   or an object created by a call to `$sce.trustAsResourceUrl(url)`.
       * @param {Object=} config Optional configuration object. See {@link ng.$http#$http-arguments `$http()` arguments}.
       * @returns {HttpPromise}  A Promise that will be resolved or rejected with a response object.
       * See {@link ng.$http#$http-returns `$http()` return value}.
       */
      createShortMethods("get", "delete", "head");

      /**
       * Shortcut method to perform `POST` request.
       *
       * @param {string} url Relative or absolute URL specifying the destination of the request
       * @param {*} data Request content
       * @param {Object=} config Optional configuration object. See {@link ng.$http#$http-arguments `$http()` arguments}.
       * @returns {HttpPromise}  A Promise that will be resolved or rejected with a response object.
       * See {@link ng.$http#$http-returns `$http()` return value}.
       */

      /**
       * Shortcut method to perform `PUT` request.
       *
       * @param {string} url Relative or absolute URL specifying the destination of the request
       * @param {*} data Request content
       * @param {Object=} config Optional configuration object. See {@link ng.$http#$http-arguments `$http()` arguments}.
       * @returns {HttpPromise}  A Promise that will be resolved or rejected with a response object.
       * See {@link ng.$http#$http-returns `$http()` return value}.
       */

      /**
       * Shortcut method to perform `PATCH` request.
       *
       * @param {string} url Relative or absolute URL specifying the destination of the request
       * @param {*} data Request content
       * @param {Object=} config Optional configuration object. See {@link ng.$http#$http-arguments `$http()` arguments}.
       * @returns {HttpPromise}  A Promise that will be resolved or rejected with a response object.
       * See {@link ng.$http#$http-returns `$http()` return value}.
       */
      createShortMethodsWithData("post", "put", "patch");

      /**
       * Runtime equivalent of the `$httpProvider.defaults` property. Allows configuration of
       * default headers, withCredentials as well as request and response transformations.
       *
       * See "Setting HTTP Headers" and "Transforming Requests and Responses" sections above.
       */
      $http.defaults = defaults;

      return $http;

      function createShortMethods(...names) {
        names.forEach((name) => {
          $http[name] = function (url, config) {
            return $http(
              extend({}, config || {}, {
                method: name,
                url,
              }),
            );
          };
        });
      }

      function createShortMethodsWithData(...names) {
        names.forEach((name) => {
          $http[name] = function (url, data, config) {
            return $http(
              extend({}, config || {}, {
                method: name,
                url,
                data,
              }),
            );
          };
        });
      }

      /**
       * Makes the request.
       *
       * !!! ACCESSES CLOSURE VARS:
       * $httpBackend, defaults, $log, $rootScope, defaultCache, $http.pendingRequests
       */
      function sendReq(config, reqData) {
        const { promise, resolve, reject } = Promise.withResolvers();
        let cache;
        let cachedResp;
        const reqHeaders = config.headers;
        let { url } = config;

        if (!isString(url)) {
          // If it is not a string then the URL must be a $sce trusted object
          url = $sce.valueOf(url);
        }

        url = buildUrl(url, config.paramSerializer(config.params));

        $http.pendingRequests.push(config);
        promise.then(removePendingReq, removePendingReq);

        if (
          (config.cache || defaults.cache) &&
          config.cache !== false &&
          config.method === "GET"
        ) {
          cache = isObject(config.cache)
            ? config.cache
            : isObject(/** @type {?} */ (defaults).cache)
              ? /** @type {?} */ (defaults).cache
              : defaultCache;
        }

        if (cache) {
          cachedResp = cache.get(url);
          if (isDefined(cachedResp)) {
            if (isPromiseLike(cachedResp)) {
              // cached request has already been sent, but there is no response yet
              cachedResp.then(
                resolvePromiseWithResult,
                resolvePromiseWithResult,
              );
            } else {
              // serving from cache
              if (Array.isArray(cachedResp)) {
                resolvePromise(
                  cachedResp[1],
                  cachedResp[0],
                  shallowCopy(cachedResp[2]),
                  cachedResp[3],
                  cachedResp[4],
                );
              } else {
                resolvePromise(cachedResp, 200, {}, "OK", "complete");
              }
            }
          } else {
            // put the promise for the non-transformed response into cache as a placeholder
            cache.set(url, promise);
          }
        }

        // if we won't have the response in cache, set the xsrf headers and
        // send the request to the backend
        if (isUndefined(cachedResp)) {
          const xsrfValue = urlIsAllowedOrigin(config.url)
            ? getCookies()[config.xsrfCookieName || defaults.xsrfCookieName]
            : undefined;
          if (xsrfValue) {
            reqHeaders[config.xsrfHeaderName || defaults.xsrfHeaderName] =
              xsrfValue;
          }

          $httpBackend(
            config.method,
            url,
            reqData,
            done,
            reqHeaders,
            config.timeout,
            config.withCredentials,
            config.responseType,
            createApplyHandlers(config.eventHandlers),
            createApplyHandlers(config.uploadEventHandlers),
          );
        }

        return promise;

        function createApplyHandlers(eventHandlers) {
          if (eventHandlers) {
            const applyHandlers = {};
            Object.entries(eventHandlers).forEach(([key, eventHandler]) => {
              applyHandlers[key] = function (event) {
                if (useApplyAsync) {
                  setTimeout(() => $rootScope.$apply(callEventHandler));
                } else {
                  $rootScope.$apply(callEventHandler);
                }

                function callEventHandler() {
                  eventHandler(event);
                }
              };
            });
            return applyHandlers;
          }
        }

        /**
         * Callback registered to $httpBackend():
         *  - caches the response if desired
         *  - resolves the raw $http promise
         *  - calls $apply
         */
        function done(status, response, headersString, statusText, xhrStatus) {
          if (cache) {
            if (isSuccess(status)) {
              cache.set(url, [
                status,
                response,
                parseHeaders(headersString),
                statusText,
                xhrStatus,
              ]);
            } else {
              // remove promise from the cache
              cache.delete(url);
            }
          }

          function resolveHttpPromise() {
            resolvePromise(
              response,
              status,
              headersString,
              statusText,
              xhrStatus,
            );
          }

          if (useApplyAsync) {
            $rootScope.$applyAsync(resolveHttpPromise);
          } else {
            resolveHttpPromise();
          }
        }

        /**
         * Resolves the raw $http promise.
         */
        function resolvePromise(
          response,
          status,
          headers,
          statusText,
          xhrStatus,
        ) {
          // status: HTTP response status code, 0, -1 (aborted by timeout / promise)
          status = status >= -1 ? status : 0;

          (isSuccess(status) ? resolve : reject)({
            data: response,
            status,
            headers: headersGetter(headers),
            config,
            statusText,
            xhrStatus,
          });
        }

        function resolvePromiseWithResult(result) {
          resolvePromise(
            result.data,
            result.status,
            shallowCopy(result.headers()),
            result.statusText,
            result.xhrStatus,
          );
        }

        function removePendingReq() {
          const idx = $http.pendingRequests.indexOf(config);
          if (idx !== -1) $http.pendingRequests.splice(idx, 1);
        }
      }

      function buildUrl(url, serializedParams) {
        if (serializedParams.length > 0) {
          url += (url.indexOf("?") === -1 ? "?" : "&") + serializedParams;
        }
        return url;
      }
    },
  ];
}
