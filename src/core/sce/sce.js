import {
  urlIsSameOrigin,
  urlIsSameOriginAsBaseUrl,
  urlResolve,
} from "./../url-utils/url-utils";
import {
  isFunction,
  isRegExp,
  isString,
  isUndefined,
  lowercase,
  minErr,
  shallowCopy,
} from "../../shared/utils";

import { snakeToCamel } from "../../shared/jqlite/jqlite.js";

const $sceMinErr = minErr("$sce");

export const SCE_CONTEXTS = {
  // HTML is used when there's HTML rendered (e.g. ng-bind-html, iframe srcdoc binding).
  HTML: "html",

  // Style statements or stylesheets. Currently unused in AngularJS.
  CSS: "css",

  // An URL used in a context where it refers to the source of media, which are not expected to be run
  // as scripts, such as an image, audio, video, etc.
  MEDIA_URL: "mediaUrl",

  // An URL used in a context where it does not refer to a resource that loads code.
  // A value that can be trusted as a URL can also trusted as a MEDIA_URL.
  URL: "url",

  // RESOURCE_URL is a subtype of URL used where the referred-to resource could be interpreted as
  // code. (e.g. ng-include, script src binding, templateUrl)
  // A value that can be trusted as a RESOURCE_URL, can also trusted as a URL and a MEDIA_URL.
  RESOURCE_URL: "resourceUrl",

  // Script. Currently unused in AngularJS.
  JS: "js",
};

// Copied from:
// http://docs.closure-library.googlecode.com/git/local_closure_goog_string_string.js.source.html#line1021
// Prereq: s is a string.
export function escapeForRegexp(s) {
  return s.replace(/([-()[\]{}+?*.$^|,:#<!\\])/g, "\\$1");
}

export function adjustMatcher(matcher) {
  if (matcher === "self") {
    return matcher;
  }
  if (isString(matcher)) {
    // Strings match exactly except for 2 wildcards - '*' and '**'.
    // '*' matches any character except those from the set ':/.?&'.
    // '**' matches any character (like .* in a RegExp).
    // More than 2 *'s raises an error as it's ill defined.
    if (matcher.indexOf("***") > -1) {
      throw $sceMinErr(
        "iwcard",
        "Illegal sequence *** in string matcher.  String: {0}",
        matcher,
      );
    }
    matcher = escapeForRegexp(matcher)
      .replace(/\\\*\\\*/g, ".*")
      .replace(/\\\*/g, "[^:/.?&;]*");
    return new RegExp(`^${matcher}$`);
  }
  if (isRegExp(matcher)) {
    // The only other type of matcher allowed is a Regexp.
    // Match entire URL / disallow partial matches.
    // Flags are reset (i.e. no global, ignoreCase or multiline)
    return new RegExp(`^${matcher.source}$`);
  }
  throw $sceMinErr(
    "imatcher",
    'Matchers may only be "self", string patterns or RegExp objects',
  );
}

/**
 * `$sceDelegate` is a service that is used by the `$sce` service to provide {@link ng.$sce Strict
 * Contextual Escaping (SCE)} services to AngularJS.
 *
 * For an overview of this service and the functionnality it provides in AngularJS, see the main
 * page for {@link ng.$sce SCE}. The current page is targeted for developers who need to alter how
 * SCE works in their application, which shouldn't be needed in most cases.
 *
 * <div class="alert alert-danger">
 * AngularJS strongly relies on contextual escaping for the security of bindings: disabling or
 * modifying this might cause cross site scripting (XSS) vulnerabilities. For libraries owners,
 * changes to this service will also influence users, so be extra careful and document your changes.
 * </div>
 *
 * Typically, you would configure or override the {@link ng.$sceDelegate $sceDelegate} instead of
 * the `$sce` service to customize the way Strict Contextual Escaping works in AngularJS.  This is
 * because, while the `$sce` provides numerous shorthand methods, etc., you really only need to
 * override 3 core functions (`trustAs`, `getTrusted` and `valueOf`) to replace the way things
 * work because `$sce` delegates to `$sceDelegate` for these operations.
 *
 * Refer {@link ng.$sceDelegateProvider $sceDelegateProvider} to configure this service.
 *
 * The default instance of `$sceDelegate` should work out of the box with little pain.  While you
 * can override it completely to change the behavior of `$sce`, the common case would
 * involve configuring the {@link ng.$sceDelegateProvider $sceDelegateProvider} instead by setting
 * your own trusted and banned resource lists for trusting URLs used for loading AngularJS resources
 * such as templates.  Refer {@link ng.$sceDelegateProvider#trustedResourceUrlList
 * $sceDelegateProvider.trustedResourceUrlList} and {@link
 * ng.$sceDelegateProvider#bannedResourceUrlList $sceDelegateProvider.bannedResourceUrlList}
 */

/**
 *
 * The `$sceDelegateProvider` provider allows developers to configure the {@link ng.$sceDelegate
 * $sceDelegate service}, used as a delegate for {@link ng.$sce Strict Contextual Escaping (SCE)}.
 *
 * The `$sceDelegateProvider` allows one to get/set the `trustedResourceUrlList` and
 * `bannedResourceUrlList` used to ensure that the URLs used for sourcing AngularJS templates and
 * other script-running URLs are safe (all places that use the `$sce.RESOURCE_URL` context). See
 * {@link ng.$sceDelegateProvider#trustedResourceUrlList
 * $sceDelegateProvider.trustedResourceUrlList} and
 * {@link ng.$sceDelegateProvider#bannedResourceUrlList $sceDelegateProvider.bannedResourceUrlList},
 *
 * For the general details about this service in AngularJS, read the main page for {@link ng.$sce
 * Strict Contextual Escaping (SCE)}.
 *
 * **Example**:  Consider the following case. <a name="example"></a>
 *
 * - your app is hosted at url `http://myapp.example.com/`
 * - but some of your templates are hosted on other domains you control such as
 *   `http://srv01.assets.example.com/`, `http://srv02.assets.example.com/`, etc.
 * - and you have an open redirect at `http://myapp.example.com/clickThru?...`.
 *
 * Here is what a secure configuration for this scenario might look like:
 *
 * ```
 *  angular.module('myApp', []).config(function($sceDelegateProvider) {
 *    $sceDelegateProvider.trustedResourceUrlList([
 *      // Allow same origin resource loads.
 *      'self',
 *      // Allow loading from our assets domain.  Notice the difference between * and **.
 *      'http://srv*.assets.example.com/**'
 *    ]);
 *
 *    // The banned resource URL list overrides the trusted resource URL list so the open redirect
 *    // here is blocked.
 *    $sceDelegateProvider.bannedResourceUrlList([
 *      'http://myapp.example.com/clickThru**'
 *    ]);
 *  });
 * ```
 * Note that an empty trusted resource URL list will block every resource URL from being loaded, and will require
 * you to manually mark each one as trusted with `$sce.trustAsResourceUrl`. However, templates
 * requested by {@link ng.$templateRequest $templateRequest} that are present in
 * {@link ng.$templateCache $templateCache} will not go through this check. If you have a mechanism
 * to populate your templates in that cache at config time, then it is a good idea to remove 'self'
 * from the trusted resource URL lsit. This helps to mitigate the security impact of certain types
 * of issues, like for instance attacker-controlled `ng-includes`.
 */

export function SceDelegateProvider() {
  this.SCE_CONTEXTS = SCE_CONTEXTS;

  // Resource URLs can also be trusted by policy.
  let trustedResourceUrlList = ["self"];
  let bannedResourceUrlList = [];

  /**
   *
   * @param {Array=} trustedResourceUrlList When provided, replaces the trustedResourceUrlList with
   *     the value provided.  This must be an array or null.  A snapshot of this array is used so
   *     further changes to the array are ignored.
   *     Follow {@link ng.$sce#resourceUrlPatternItem this link} for a description of the items
   *     allowed in this array.
   *
   * @return {Array} The currently set trusted resource URL array.
   *
   * @description
   * Sets/Gets the list trusted of resource URLs.
   *
   * The **default value** when no `trustedResourceUrlList` has been explicitly set is `['self']`
   * allowing only same origin resource requests.
   *
   * <div class="alert alert-warning">
   * **Note:** the default `trustedResourceUrlList` of 'self' is not recommended if your app shares
   * its origin with other apps! It is a good idea to limit it to only your application's directory.
   * </div>
   */
  this.trustedResourceUrlList = function (value) {
    if (arguments.length) {
      trustedResourceUrlList = value.map((v) => adjustMatcher(v));
    }
    return trustedResourceUrlList;
  };

  /**
   *
   * @param {Array=} bannedResourceUrlList When provided, replaces the `bannedResourceUrlList` with
   *     the value provided. This must be an array or null. A snapshot of this array is used so
   *     further changes to the array are ignored.</p><p>
   *     Follow {@link ng.$sce#resourceUrlPatternItem this link} for a description of the items
   *     allowed in this array.</p><p>
   *     The typical usage for the `bannedResourceUrlList` is to **block
   *     [open redirects](http://cwe.mitre.org/data/definitions/601.html)** served by your domain as
   *     these would otherwise be trusted but actually return content from the redirected domain.
   *     </p><p>
   *     Finally, **the banned resource URL list overrides the trusted resource URL list** and has
   *     the final say.
   *
   * @return {Array} The currently set `bannedResourceUrlList` array.
   *
   * @description
   * Sets/Gets the `bannedResourceUrlList` of trusted resource URLs.
   *
   * The **default value** when no trusted resource URL list has been explicitly set is the empty
   * array (i.e. there is no `bannedResourceUrlList`.)
   */
  this.bannedResourceUrlList = function (value) {
    if (arguments.length) {
      bannedResourceUrlList = value.map((v) => adjustMatcher(v));
    }
    return bannedResourceUrlList;
  };

  this.$get = [
    "$injector",
    "$$sanitizeUri",
    /**
     *
     * @param {import("../../core/di/internal-injector").InjectorService} $injector
     * @param {*} $$sanitizeUri
     * @returns
     */
    function ($injector, $$sanitizeUri) {
      let htmlSanitizer = function () {
        throw $sceMinErr(
          "unsafe",
          "Attempting to use an unsafe value in a safe context.",
        );
      };

      if ($injector.has("$sanitize")) {
        htmlSanitizer = $injector.get("$sanitize");
      }

      function matchUrl(matcher, parsedUrl) {
        if (matcher === "self") {
          return (
            urlIsSameOrigin(parsedUrl) || urlIsSameOriginAsBaseUrl(parsedUrl)
          );
        }
        // definitely a regex.  See adjustMatchers()
        return !!matcher.exec(parsedUrl.href);
      }

      function isResourceUrlAllowedByPolicy(url) {
        const parsedUrl = urlResolve(url.toString());
        let i;
        let n;
        let allowed = false;
        // Ensure that at least one item from the trusted resource URL list allows this url.
        for (i = 0, n = trustedResourceUrlList.length; i < n; i++) {
          if (matchUrl(trustedResourceUrlList[i], parsedUrl)) {
            allowed = true;
            break;
          }
        }
        if (allowed) {
          // Ensure that no item from the banned resource URL list has blocked this url.
          for (i = 0, n = bannedResourceUrlList.length; i < n; i++) {
            if (matchUrl(bannedResourceUrlList[i], parsedUrl)) {
              allowed = false;
              break;
            }
          }
        }
        return allowed;
      }

      function generateHolderType(Base) {
        const holderType = function TrustedValueHolderType(trustedValue) {
          this.$$unwrapTrustedValue = function () {
            return trustedValue;
          };
        };
        if (Base) {
          holderType.prototype = new Base();
        }
        holderType.prototype.valueOf = function sceValueOf() {
          return this.$$unwrapTrustedValue();
        };
        holderType.prototype.toString = function sceToString() {
          return this.$$unwrapTrustedValue().toString();
        };
        return holderType;
      }

      const trustedValueHolderBase = generateHolderType();
      const byType = {};

      byType[SCE_CONTEXTS.HTML] = generateHolderType(trustedValueHolderBase);
      byType[SCE_CONTEXTS.CSS] = generateHolderType(trustedValueHolderBase);
      byType[SCE_CONTEXTS.MEDIA_URL] = generateHolderType(
        trustedValueHolderBase,
      );
      byType[SCE_CONTEXTS.URL] = generateHolderType(
        byType[SCE_CONTEXTS.MEDIA_URL],
      );
      byType[SCE_CONTEXTS.JS] = generateHolderType(trustedValueHolderBase);
      byType[SCE_CONTEXTS.RESOURCE_URL] = generateHolderType(
        byType[SCE_CONTEXTS.URL],
      );

      /**
       * Returns a trusted representation of the parameter for the specified context. This trusted
       * object will later on be used as-is, without any security check, by bindings or directives
       * that require this security context.
       * For instance, marking a string as trusted for the `$sce.HTML` context will entirely bypass
       * the potential `$sanitize` call in corresponding `$sce.HTML` bindings or directives, such as
       * `ng-bind-html`. Note that in most cases you won't need to call this function: if you have the
       * sanitizer loaded, passing the value itself will render all the HTML that does not pose a
       * security risk.
       *
       * See {@link ng.$sceDelegate#getTrusted getTrusted} for the function that will consume those
       * trusted values, and {@link ng.$sce $sce} for general documentation about strict contextual
       * escaping.
       *
       * @param {string} type The context in which this value is safe for use, e.g. `$sce.URL`,
       *     `$sce.RESOURCE_URL`, `$sce.HTML`, `$sce.JS` or `$sce.CSS`.
       *
       * @param {*} trustedValue The value that should be considered trusted.
       * @return {*} A trusted representation of value, that can be used in the given context.
       */
      function trustAs(type, trustedValue) {
        const Constructor = Object.prototype.hasOwnProperty.call(byType, type)
          ? byType[type]
          : null;
        if (!Constructor) {
          throw $sceMinErr(
            "icontext",
            "Attempted to trust a value in invalid context. Context: {0}; Value: {1}",
            type,
            trustedValue,
          );
        }
        if (
          trustedValue === null ||
          isUndefined(trustedValue) ||
          trustedValue === ""
        ) {
          return trustedValue;
        }
        // All the current contexts in SCE_CONTEXTS happen to be strings.  In order to avoid trusting
        // mutable objects, we ensure here that the value passed in is actually a string.
        if (typeof trustedValue !== "string") {
          throw $sceMinErr(
            "itype",
            "Attempted to trust a non-string value in a content requiring a string: Context: {0}",
            type,
          );
        }
        return new Constructor(trustedValue);
      }

      /**
       * If the passed parameter had been returned by a prior call to {@link ng.$sceDelegate#trustAs
       * `$sceDelegate.trustAs`}, returns the value that had been passed to {@link
       * ng.$sceDelegate#trustAs `$sceDelegate.trustAs`}.
       *
       * If the passed parameter is not a value that had been returned by {@link
       * ng.$sceDelegate#trustAs `$sceDelegate.trustAs`}, it must be returned as-is.
       *
       * @param {*} maybeTrusted The result of a prior {@link ng.$sceDelegate#trustAs `$sceDelegate.trustAs`}
       *     call or anything else.
       * @return {*} The `value` that was originally provided to {@link ng.$sceDelegate#trustAs
       *     `$sceDelegate.trustAs`} if `value` is the result of such a call.  Otherwise, returns
       *     `value` unchanged.
       */
      function valueOf(maybeTrusted) {
        if (maybeTrusted instanceof trustedValueHolderBase) {
          return maybeTrusted.$$unwrapTrustedValue();
        }
        return maybeTrusted;
      }

      /**
       * @description
       * Given an object and a security context in which to assign it, returns a value that's safe to
       * use in this context, which was represented by the parameter. To do so, this function either
       * unwraps the safe type it has been given (for instance, a {@link ng.$sceDelegate#trustAs
       * `$sceDelegate.trustAs`} result), or it might try to sanitize the value given, depending on
       * the context and sanitizer availablility.
       *
       * The contexts that can be sanitized are $sce.MEDIA_URL, $sce.URL and $sce.HTML. The first two are available
       * by default, and the third one relies on the `$sanitize` service (which may be loaded through
       * the `ngSanitize` module). Furthermore, for $sce.RESOURCE_URL context, a plain string may be
       * accepted if the resource url policy defined by {@link ng.$sceDelegateProvider#trustedResourceUrlList
       * `$sceDelegateProvider.trustedResourceUrlList`} and {@link ng.$sceDelegateProvider#bannedResourceUrlList
       * `$sceDelegateProvider.bannedResourceUrlList`} accepts that resource.
       *
       * This function will throw if the safe type isn't appropriate for this context, or if the
       * value given cannot be accepted in the context (which might be caused by sanitization not
       * being available, or the value not being recognized as safe).
       *
       * <div class="alert alert-danger">
       * Disabling auto-escaping is extremely dangerous, it usually creates a Cross Site Scripting
       * (XSS) vulnerability in your application.
       * </div>
       *
       * @param {string} type The context in which this value is to be used (such as `$sce.HTML`).
       * @param {*} maybeTrusted The result of a prior {@link ng.$sceDelegate#trustAs
       *     `$sceDelegate.trustAs`} call, or anything else (which will not be considered trusted.)
       * @return {*} A version of the value that's safe to use in the given context, or throws an
       *     exception if this is impossible.
       */
      function getTrusted(type, maybeTrusted) {
        if (
          maybeTrusted === null ||
          isUndefined(maybeTrusted) ||
          maybeTrusted === ""
        ) {
          return maybeTrusted;
        }
        const constructor = Object.prototype.hasOwnProperty.call(byType, type)
          ? byType[type]
          : null;
        // If maybeTrusted is a trusted class instance or subclass instance, then unwrap and return
        // as-is.
        if (constructor && maybeTrusted instanceof constructor) {
          return maybeTrusted.$$unwrapTrustedValue();
        }

        // If maybeTrusted is a trusted class instance but not of the correct trusted type
        // then unwrap it and allow it to pass through to the rest of the checks
        if (isFunction(maybeTrusted.$$unwrapTrustedValue)) {
          maybeTrusted = maybeTrusted.$$unwrapTrustedValue();
        }

        // If we get here, then we will either sanitize the value or throw an exception.
        if (type === SCE_CONTEXTS.MEDIA_URL || type === SCE_CONTEXTS.URL) {
          // we attempt to sanitize non-resource URLs
          return $$sanitizeUri(
            maybeTrusted.toString(),
            type === SCE_CONTEXTS.MEDIA_URL,
          );
        }
        if (type === SCE_CONTEXTS.RESOURCE_URL) {
          if (isResourceUrlAllowedByPolicy(maybeTrusted)) {
            return maybeTrusted;
          }
          throw $sceMinErr(
            "insecurl",
            "Blocked loading resource from url not allowed by $sceDelegate policy.  URL: {0}",
            maybeTrusted.toString(),
          );
        } else if (type === SCE_CONTEXTS.HTML) {
          // htmlSanitizer throws its own error when no sanitizer is available.
          return htmlSanitizer();
        }
        // Default error when the $sce service has no way to make the input safe.
        throw $sceMinErr(
          "unsafe",
          "Attempting to use an unsafe value in a safe context.",
        );
      }

      return { trustAs, getTrusted, valueOf };
    },
  ];
}

export function SceProvider() {
  let enabled = true;

  /**
   * @param {boolean=} value If provided, then enables/disables SCE application-wide.
   * @return {boolean} True if SCE is enabled, false otherwise.
   *
   * @description
   * Enables/disables SCE and returns the current value.
   */
  this.enabled = function (value) {
    if (arguments.length) {
      enabled = !!value;
    }
    return enabled;
  };

  this.$get = [
    "$parse",
    "$sceDelegate",
    function ($parse, $sceDelegate) {
      const sce = shallowCopy(SCE_CONTEXTS);

      /**
       * @return {Boolean} True if SCE is enabled, false otherwise.  If you want to set the value, you
       *     have to do it at module config time on {@link ng.$sceProvider $sceProvider}.
       *
       * @description
       * Returns a boolean indicating if SCE is enabled.
       */
      sce.isEnabled = function () {
        return enabled;
      };
      sce.trustAs = $sceDelegate.trustAs;
      sce.getTrusted = $sceDelegate.getTrusted;
      sce.valueOf = $sceDelegate.valueOf;

      if (!enabled) {
        sce.trustAs = sce.getTrusted = function (type, value) {
          return value;
        };
        sce.valueOf = function ($) {
          return $;
        };
      }

      /**
       * Converts AngularJS {@link guide/expression expression} into a function.  This is like {@link
       * ng.$parse $parse} and is identical when the expression is a literal constant.  Otherwise, it
       * wraps the expression in a call to {@link ng.$sce#getTrusted $sce.getTrusted(*type*,
       * *result*)}
       *
       * @param {string} type The SCE context in which this result will be used.
       * @param {string} expr String expression to compile.
       * @return {function(context, locals)} A function which represents the compiled expression:
       *
       *    * `context` – `{object}` – an object against which any expressions embedded in the
       *      strings are evaluated against (typically a scope object).
       *    * `locals` – `{object=}` – local variables context object, useful for overriding values
       *      in `context`.
       */
      sce.parseAs = function sceParseAs(type, expr) {
        const parsed = $parse(expr);
        if (parsed.literal && parsed.constant) {
          return parsed;
        }
        return $parse(expr, (value) => sce.getTrusted(type, value));
      };

      /**
       * Delegates to {@link ng.$sceDelegate#trustAs `$sceDelegate.trustAs`}. As such, returns a
       * wrapped object that represents your value, and the trust you have in its safety for the given
       * context. AngularJS can then use that value as-is in bindings of the specified secure context.
       * This is used in bindings for `ng-bind-html`, `ng-include`, and most `src` attribute
       * interpolations. See {@link ng.$sce $sce} for strict contextual escaping.
       *
       * @param {string} type The context in which this value is safe for use, e.g. `$sce.URL`,
       *     `$sce.RESOURCE_URL`, `$sce.HTML`, `$sce.JS` or `$sce.CSS`.
       *
       * @param {*} value The value that that should be considered trusted.
       * @return {*} A wrapped version of value that can be used as a trusted variant of your `value`
       *     in the context you specified.
       */

      /**
       * Shorthand method.  `$sce.trustAsHtml(value)` →
       *     {@link ng.$sceDelegate#trustAs `$sceDelegate.trustAs($sce.HTML, value)`}
       *
       * @param {*} value The value to mark as trusted for `$sce.HTML` context.
       * @return {*} A wrapped version of value that can be used as a trusted variant of your `value`
       *     in `$sce.HTML` context (like `ng-bind-html`).
       */

      /**
       * Shorthand method.  `$sce.trustAsCss(value)` →
       *     {@link ng.$sceDelegate#trustAs `$sceDelegate.trustAs($sce.CSS, value)`}
       *
       * @param {*} value The value to mark as trusted for `$sce.CSS` context.
       * @return {*} A wrapped version of value that can be used as a trusted variant
       *     of your `value` in `$sce.CSS` context. This context is currently unused, so there are
       *     almost no reasons to use this function so far.
       */

      /**
       * Shorthand method.  `$sce.trustAsUrl(value)` →
       *     {@link ng.$sceDelegate#trustAs `$sceDelegate.trustAs($sce.URL, value)`}
       *
       * @param {*} value The value to mark as trusted for `$sce.URL` context.
       * @return {*} A wrapped version of value that can be used as a trusted variant of your `value`
       *     in `$sce.URL` context. That context is currently unused, so there are almost no reasons
       *     to use this function so far.
       */

      /**
       * Shorthand method.  `$sce.trustAsResourceUrl(value)` →
       *     {@link ng.$sceDelegate#trustAs `$sceDelegate.trustAs($sce.RESOURCE_URL, value)`}
       *
       * @param {*} value The value to mark as trusted for `$sce.RESOURCE_URL` context.
       * @return {*} A wrapped version of value that can be used as a trusted variant of your `value`
       *     in `$sce.RESOURCE_URL` context (template URLs in `ng-include`, most `src` attribute
       *     bindings, ...)
       */

      /**
       * Shorthand method.  `$sce.trustAsJs(value)` →
       *     {@link ng.$sceDelegate#trustAs `$sceDelegate.trustAs($sce.JS, value)`}
       *
       * @param {*} value The value to mark as trusted for `$sce.JS` context.
       * @return {*} A wrapped version of value that can be used as a trusted variant of your `value`
       *     in `$sce.JS` context. That context is currently unused, so there are almost no reasons to
       *     use this function so far.
       */

      /**
       * Delegates to {@link ng.$sceDelegate#getTrusted `$sceDelegate.getTrusted`}.  As such,
       * takes any input, and either returns a value that's safe to use in the specified context,
       * or throws an exception. This function is aware of trusted values created by the `trustAs`
       * function and its shorthands, and when contexts are appropriate, returns the unwrapped value
       * as-is. Finally, this function can also throw when there is no way to turn `maybeTrusted` in a
       * safe value (e.g., no sanitization is available or possible.)
       *
       * @param {string} type The context in which this value is to be used.
       * @param {*} maybeTrusted The result of a prior {@link ng.$sce#trustAs
       *     `$sce.trustAs`} call, or anything else (which will not be considered trusted.)
       * @return {*} A version of the value that's safe to use in the given context, or throws an
       *     exception if this is impossible.
       */

      /**
       * Shorthand method.  `$sce.getTrustedHtml(value)` →
       *     {@link ng.$sceDelegate#getTrusted `$sceDelegate.getTrusted($sce.HTML, value)`}
       *
       * @param {*} value The value to pass to `$sce.getTrusted`.
       * @return {*} The return value of `$sce.getTrusted($sce.HTML, value)`
       */

      /**
       * Shorthand method.  `$sce.getTrustedCss(value)` →
       *     {@link ng.$sceDelegate#getTrusted `$sceDelegate.getTrusted($sce.CSS, value)`}
       *
       * @param {*} value The value to pass to `$sce.getTrusted`.
       * @return {*} The return value of `$sce.getTrusted($sce.CSS, value)`
       */

      /**
       * Shorthand method.  `$sce.getTrustedUrl(value)` →
       *     {@link ng.$sceDelegate#getTrusted `$sceDelegate.getTrusted($sce.URL, value)`}
       *
       * @param {*} value The value to pass to `$sce.getTrusted`.
       * @return {*} The return value of `$sce.getTrusted($sce.URL, value)`
       */

      /**
       * Shorthand method.  `$sce.getTrustedResourceUrl(value)` →
       *     {@link ng.$sceDelegate#getTrusted `$sceDelegate.getTrusted($sce.RESOURCE_URL, value)`}
       *
       * @param {*} value The value to pass to `$sceDelegate.getTrusted`.
       * @return {*} The return value of `$sce.getTrusted($sce.RESOURCE_URL, value)`
       */

      /**
       * Shorthand method.  `$sce.getTrustedJs(value)` →
       *     {@link ng.$sceDelegate#getTrusted `$sceDelegate.getTrusted($sce.JS, value)`}
       *
       * @param {*} value The value to pass to `$sce.getTrusted`.
       * @return {*} The return value of `$sce.getTrusted($sce.JS, value)`
       */

      /**
       * Shorthand method.  `$sce.parseAsHtml(expression string)` →
       *     {@link ng.$sce#parseAs `$sce.parseAs($sce.HTML, value)`}
       *
       * @param {string} expression String expression to compile.
       * @return {function(context, locals)} A function which represents the compiled expression:
       *
       *    * `context` – `{object}` – an object against which any expressions embedded in the
       *      strings are evaluated against (typically a scope object).
       *    * `locals` – `{object=}` – local variables context object, useful for overriding values
       *      in `context`.
       */

      /**
       * Shorthand method.  `$sce.parseAsCss(value)` →
       *     {@link ng.$sce#parseAs `$sce.parseAs($sce.CSS, value)`}
       *
       * @param {string} expression String expression to compile.
       * @return {function(context, locals)} A function which represents the compiled expression:
       *
       *    * `context` – `{object}` – an object against which any expressions embedded in the
       *      strings are evaluated against (typically a scope object).
       *    * `locals` – `{object=}` – local variables context object, useful for overriding values
       *      in `context`.
       */

      /**
       * Shorthand method.  `$sce.parseAsUrl(value)` →
       *     {@link ng.$sce#parseAs `$sce.parseAs($sce.URL, value)`}
       *
       * @param {string} expression String expression to compile.
       * @return {function(context, locals)} A function which represents the compiled expression:
       *
       *    * `context` – `{object}` – an object against which any expressions embedded in the
       *      strings are evaluated against (typically a scope object).
       *    * `locals` – `{object=}` – local variables context object, useful for overriding values
       *      in `context`.
       */

      /**
       * Shorthand method.  `$sce.parseAsResourceUrl(value)` →
       *     {@link ng.$sce#parseAs `$sce.parseAs($sce.RESOURCE_URL, value)`}
       *
       * @param {string} expression String expression to compile.
       * @return {function(context, locals)} A function which represents the compiled expression:
       *
       *    * `context` – `{object}` – an object against which any expressions embedded in the
       *      strings are evaluated against (typically a scope object).
       *    * `locals` – `{object=}` – local variables context object, useful for overriding values
       *      in `context`.
       */

      /**
       * Shorthand method.  `$sce.parseAsJs(value)` →
       *     {@link ng.$sce#parseAs `$sce.parseAs($sce.JS, value)`}
       *
       * @param {string} expression String expression to compile.
       * @return {function(context, locals)} A function which represents the compiled expression:
       *
       *    * `context` – `{object}` – an object against which any expressions embedded in the
       *      strings are evaluated against (typically a scope object).
       *    * `locals` – `{object=}` – local variables context object, useful for overriding values
       *      in `context`.
       */

      // Shorthand delegations.
      const parse = sce.parseAs;
      const { getTrusted } = sce;
      const { trustAs } = sce;

      Object.entries(SCE_CONTEXTS).forEach(([name, enumValue]) => {
        const lName = lowercase(name);
        sce[snakeToCamel(`parse_as_${lName}`)] = function (expr) {
          return parse(enumValue, expr);
        };
        sce[snakeToCamel(`get_trusted_${lName}`)] = function (value) {
          return getTrusted(enumValue, value);
        };
        sce[snakeToCamel(`trust_as_${lName}`)] = function (value) {
          return trustAs(enumValue, value);
        };
      });

      return sce;
    },
  ];
}
