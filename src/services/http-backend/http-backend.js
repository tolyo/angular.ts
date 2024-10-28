import { urlResolve } from "../../core/url-utils/url-utils";
import { isDefined, isPromiseLike, isUndefined } from "../../shared/utils";

/**
 * HTTP backend used by the {@link ng.$http service} that delegates to
 * XMLHttpRequest object and deals with browser incompatibilities.
 *
 * You should never need to use this service directly, instead use the higher-level abstractions:
 * {@link ng.$http $http}.
 *
 */
export function HttpBackendProvider() {
  this.$get = [
    "$browser",
    /**
     * @param {import('../browser').Browser} $browser
     * @returns
     */
    function ($browser) {
      return createHttpBackend($browser);
    },
  ];
}

/**
 * @param {import('../browser').Browser} $browser
 * @returns
 */
export function createHttpBackend($browser) {
  // TODO(vojta): fix the signature
  return function (
    method,
    url,
    post,
    callback,
    headers,
    timeout,
    withCredentials,
    responseType,
    eventHandlers,
    uploadEventHandlers,
  ) {
    url = url || $browser.url();

    const xhr = new XMLHttpRequest();
    let abortedByTimeout = false;

    xhr.open(method, url, true);
    if (headers) {
      Object.entries(headers).forEach(([key, value]) => {
        if (isDefined(value)) {
          xhr.setRequestHeader(key, value);
        }
      });
    }

    xhr.onload = function () {
      const statusText = xhr.statusText || "";

      let status = xhr.status;

      // fix status code when it is 0 (0 status is undocumented).
      // Occurs when accessing file resources or on Android 4.1 stock browser
      // while retrieving files from application cache.
      if (status === 0) {
        status = xhr.response
          ? 200
          : urlResolve(url).protocol === "file"
            ? 404
            : 0;
      }

      completeRequest(
        callback,
        status,
        xhr.response,
        xhr.getAllResponseHeaders(),
        statusText,
        "complete",
      );
    };

    xhr.onerror = function () {
      // The response is always empty
      // See https://xhr.spec.whatwg.org/#request-error-steps and https://fetch.spec.whatwg.org/#concept-network-error
      completeRequest(callback, -1, null, null, "", "error");
    };
    xhr.ontimeout = function () {
      // The response is always empty
      // See https://xhr.spec.whatwg.org/#request-error-steps and https://fetch.spec.whatwg.org/#concept-network-error
      completeRequest(callback, -1, null, null, "", "timeout");
    };

    xhr.onabort = function () {
      completeRequest(
        callback,
        -1,
        null,
        null,
        "",
        abortedByTimeout ? "timeout" : "abort",
      );
    };

    if (eventHandlers) {
      eventHandlers &&
        Object.entries(eventHandlers).forEach(([key, value]) => {
          xhr.addEventListener(key, value);
        });
    }

    if (uploadEventHandlers) {
      Object.entries(uploadEventHandlers).forEach(([key, value]) => {
        xhr.upload.addEventListener(key, value);
      });
    }

    if (withCredentials) {
      xhr.withCredentials = true;
    }

    if (responseType) {
      try {
        xhr.responseType = responseType;
      } catch (e) {
        // WebKit added support for the json responseType value on 09/03/2013
        // https://bugs.webkit.org/show_bug.cgi?id=73648. Versions of Safari prior to 7 are
        // known to throw when setting the value "json" as the response type. Other older
        // browsers implementing the responseType
        //
        // The json response type can be ignored if not supported, because JSON payloads are
        // parsed on the client-side regardless.
        if (responseType !== "json") {
          throw e;
        }
      }
    }

    xhr.send(isUndefined(post) ? null : post);

    // Since we are using xhr.abort() when a request times out, we have to set a flag that
    // indicates to requestAborted if the request timed out or was aborted.
    //
    // http.timeout = numerical timeout   timeout
    // http.timeout = $timeout            timeout
    // http.timeout = promise             abort
    // xhr.abort()                        abort (The xhr object is normally inaccessible, but
    //                                    can be exposed with the xhrFactory)
    if (timeout > 0) {
      var timeoutId = $browser.defer(() => {
        timeoutRequest("timeout");
      }, timeout);
    } else if (isPromiseLike(timeout)) {
      timeout.then(() => {
        timeoutRequest(isDefined(timeout.$$timeoutId) ? "timeout" : "abort");
      });
    }

    function timeoutRequest(reason) {
      abortedByTimeout = reason === "timeout";
      if (xhr) {
        xhr.abort();
      }
    }

    function completeRequest(
      callback,
      status,
      response,
      headersString,
      statusText,
      xhrStatus,
    ) {
      // cancel timeout and subsequent timeout promise resolution
      if (isDefined(timeoutId)) {
        $browser.cancel(timeoutId);
      }

      callback(status, response, headersString, statusText, xhrStatus);
    }
  };
}
