import { isProxySymbol } from "../core/scope/scope.js";
import { PREFIX_REGEXP, SPECIAL_CHARS_REGEXP } from "./constants.js";

const ngMinErr = minErr("ng");

/**
 * @type {number}
 */
let uid = 0;

/**
 * A consistent way of creating unique IDs in angular.
 *
 * Using simple numbers allows us to generate 28.6 million unique ids per second for 10 years before
 * we hit number precision issues in JavaScript.
 *
 * Math.pow(2,53) / 60 / 60 / 24 / 365 / 10 = 28.6M
 *
 * @returns {number} an unique alpha-numeric string
 */
export function nextUid() {
  uid += 1;
  return uid;
}

/**
 *
 * @description Converts the specified string to lowercase.
 * @param {string} string String to be converted to lowercase.
 * @returns {string} Lowercased string.
 */
export function lowercase(string) {
  return isString(string) ? string.toLowerCase() : string;
}

/**
 *
 * @description Converts the specified string to uppercase.
 * @param {string} string String to be converted to uppercase.
 * @returns {string} Uppercased string.
 */
export function uppercase(string) {
  return isString(string) ? string.toUpperCase() : string;
}

/**
 * @param {*} obj
 * @return {boolean} Returns true if `obj` is an array or array-like object (NodeList, Arguments,
 *                   String ...)
 */
export function isArrayLike(obj) {
  // `null`, `undefined` and `window` are not array-like
  if (obj == null || isWindow(obj)) return false;

  // arrays, strings and jQuery/jqLite objects are array like
  // * we have to check the existence of JQLite first as this method is called
  //   via the forEach method when constructing the JQLite object in the first place
  if (Array.isArray(obj) || obj instanceof Array || isString(obj)) return true;

  // Support: iOS 8.2 (not reproducible in simulator)
  // "length" in obj used to prevent JIT error (gh-11508)
  const length = "length" in Object(obj) && obj.length;

  // NodeList objects (with `item` method) and
  // other objects with suitable length characteristics are array-like
  return (
    isNumber(length) &&
    ((length >= 0 && length - 1 in obj) || typeof obj.item === "function")
  );
}

/**
 * Determines if a reference is undefined.
 *
 * @param {*} value Reference to check.
 * @returns {boolean} True if `value` is undefined.
 */
export function isUndefined(value) {
  return typeof value === "undefined";
}

/**
 * Determines if a reference is defined.
 *
 * @param {*} value Reference to check.
 * @returns {boolean} True if `value` is defined.
 */
export function isDefined(value) {
  return typeof value !== "undefined";
}

/**
 * Determines if a reference is an `Object`. Unlike `typeof` in JavaScript, `null`s are not
 * considered to be objects. Note that JavaScript arrays are objects.
 *
 * @param {*} value Reference to check.
 * @returns {boolean} True if `value` is an `Object` but not `null`.
 */
export function isObject(value) {
  // http://jsperf.com/isobject4
  return value !== null && typeof value === "object";
}

/**
 * Determines if a value is an object with a null prototype
 *
 * @returns {boolean} True if `value` is an `Object` with a null prototype
 */
export function isBlankObject(value) {
  return (
    value !== null && typeof value === "object" && !Object.getPrototypeOf(value)
  );
}

/**
 * Determines if a reference is a `String`.
 *
 * @param {*} value Reference to check.
 * @returns {boolean} True if `value` is a `String`.
 */
export function isString(value) {
  return typeof value === "string";
}

/**
 * Determines if a reference is a `Number`.
 *
 * This includes the "special" numbers `NaN`, `+Infinity` and `-Infinity`.
 *
 * If you wish to exclude these then you can use the native
 * [`isFinite'](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/isFinite)
 * method.
 *
 * @param {*} value Reference to check.
 * @returns {boolean} True if `value` is a `Number`.
 */
export function isNumber(value) {
  return typeof value === "number";
}

/**
 * @module angular
 * @function isDate
 *
 * @description
 * Determines if a value is a date.
 *
 * @param {*} value Reference to check.
 * @returns {boolean} True if `value` is a `Date`.
 */
export function isDate(value) {
  return toString.call(value) === "[object Date]";
}

/**
 * Determines if a reference is an `Error`.
 * Loosely based on https://www.npmjs.com/package/iserror
 *
 * @param {*} value Reference to check.
 * @returns {boolean} True if `value` is an `Error`.
 */
export function isError(value) {
  const tag = toString.call(value);
  switch (tag) {
    case "[object Error]":
      return true;
    case "[object Exception]":
      return true;
    case "[object DOMException]":
      return true;
    default:
      return value instanceof Error;
  }
}

/**
 * Determines if a reference is a `Function`.
 *
 * @param {*} value Reference to check.
 * @returns {boolean} True if `value` is a `Function`.
 */
export function isFunction(value) {
  return typeof value === "function";
}

/**
 * Determines if a value is a regular expression object.
 *
 * @param {*} value Reference to check.
 * @returns {boolean} True if `value` is a `RegExp`.
 */
export function isRegExp(value) {
  return toString.call(value) === "[object RegExp]";
}

/**
 * Checks if `obj` is a window object.
 *
 * @param {*} obj Object to check
 * @returns {boolean} True if `obj` is a window obj.
 */
export function isWindow(obj) {
  return obj && obj.window === obj;
}

/**
 * @param {*} obj
 * @returns {boolean}
 */
export function isScope(obj) {
  return obj && obj.$evalAsync && obj.$watch;
}

/**
 * @param {*} obj
 * @returns {boolean}
 */
export function isFile(obj) {
  return toString.call(obj) === "[object File]";
}

/**
 * @param {*} obj
 * @returns {boolean}
 */
export function isFormData(obj) {
  return toString.call(obj) === "[object FormData]";
}

/**
 * @param {*} obj
 * @returns {boolean}
 */
export function isBlob(obj) {
  return toString.call(obj) === "[object Blob]";
}

/**
 * @param {*} value
 * @returns {boolean}
 */
export function isBoolean(value) {
  return typeof value === "boolean";
}

/**
 * @param {*} obj
 * @returns {boolean}
 */
export function isPromiseLike(obj) {
  return obj && isFunction(obj.then);
}

/**
 * @param {*} value
 * @returns {boolean}
 */
export function isTypedArray(value) {
  return (
    value &&
    isNumber(value.length) &&
    /^\[object (?:Uint8|Uint8Clamped|Uint16|Uint32|Int8|Int16|Int32|Float32|Float64)Array]$/.test(
      toString.call(value),
    )
  );
}

/**
 * @param {*} obj
 * @returns {boolean}
 */
export function isArrayBuffer(obj) {
  return toString.call(obj) === "[object ArrayBuffer]";
}

/**
 * @param {*} value
 * @returns {string | *}
 */
export function trim(value) {
  return isString(value) ? value.trim() : value;
}

export function snakeCase(name, separator) {
  const modseparator = separator || "_";
  return name.replace(
    /[A-Z]/g,
    (letter, pos) => (pos ? modseparator : "") + letter.toLowerCase(),
  );
}

/**
 * Set or clear the hashkey for an object.
 * @param obj object
 * @param h the hashkey (!truthy to delete the hashkey)
 */
export function setHashKey(obj, h) {
  if (h) {
    obj.$$hashKey = h;
  } else {
    delete obj.$$hashKey;
  }
}

export function baseExtend(dst, objs, deep) {
  const h = dst.$$hashKey;

  for (let i = 0, ii = objs.length; i < ii; ++i) {
    const obj = objs[i];
    if (!isObject(obj) && !isFunction(obj)) continue;
    const keys = Object.keys(obj);
    for (let j = 0, jj = keys.length; j < jj; j++) {
      const key = keys[j];
      const src = obj[key];

      if (deep && isObject(src)) {
        if (isDate(src)) {
          dst[key] = new Date(src.valueOf());
        } else if (isRegExp(src)) {
          dst[key] = new RegExp(src);
        } else if (src.nodeName) {
          dst[key] = src.cloneNode(true);
        } else if (isElement(src)) {
          dst[key] = src[0].cloneNode(true);
        } else if (key !== "__proto__") {
          if (!isObject(dst[key])) dst[key] = Array.isArray(src) ? [] : {};
          baseExtend(dst[key], [src], true);
        }
      } else {
        dst[key] = src;
      }
    }
  }

  setHashKey(dst, h);
  return dst;
}

/**
 * Extends the destination object `dst` by copying own enumerable properties from the `src` object(s)
 * to `dst`. You can specify multiple `src` objects. If you want to preserve original objects, you can do so
 * by passing an empty object as the target: `let object = angular.extend({}, object1, object2)`.
 *
 * **Note:** Keep in mind that `angular.extend` does not support recursive merge (deep copy). Use
 * {@link angular.merge} for this.
 *
 * @param {Object} dst Destination object.
 * @param {...Object} src Source object(s).
 * @returns {Object} Reference to `dst`.
 */
export function extend(dst, ...src) {
  return baseExtend(dst, src, false);
}

/**
 * Deeply extends the destination object `dst` by copying own enumerable properties from the `src` object(s)
 * to `dst`. You can specify multiple `src` objects. If you want to preserve original objects, you can do so
 * by passing an empty object as the target: `let object = angular.merge({}, object1, object2)`.
 *
 * Unlike {@link angular.extend extend()}, `merge()` recursively descends into object properties of source
 * objects, performing a deep copy.
 *
 * @deprecated
 * sinceVersion="1.6.5"
 * This function is deprecated, but will not be removed in the 1.x lifecycle.
 * There are edge cases (see {@link angular.merge#known-issues known issues}) that are not
 * supported by this function. We suggest using another, similar library for all-purpose merging,
 * such as [lodash's merge()](https://lodash.com/docs/4.17.4#merge).
 *
 * @knownIssue
 * This is a list of (known) object types that are not handled correctly by this function:
 * - [`Blob`](https://developer.mozilla.org/docs/Web/API/Blob)
 * - [`MediaStream`](https://developer.mozilla.org/docs/Web/API/MediaStream)
 * - [`CanvasGradient`](https://developer.mozilla.org/docs/Web/API/CanvasGradient)
 * - AngularJS {@link $rootScope.Scope scopes};
 *
 * `angular.merge` also does not support merging objects with circular references.
 *
 * @param {Object} dst Destination object.
 * @param {...Object} src Source object(s).
 * @returns {Object} Reference to `dst`.
 */
export function merge(dst, ...src) {
  return baseExtend(dst, src, true);
}

/**
 * @param {string} str
 * @returns {number}
 */
export function toInt(str) {
  return parseInt(str, 10);
}

/**
 * @param {any} num
 * @returns {boolean}
 */
export function isNumberNaN(num) {
  return Number.isNaN(num);
}

/**
 * @param {Object} parent
 * @param {Object} extra
 * @returns {Object}
 */
export function inherit(parent, extra) {
  return extend(Object.create(parent), extra);
}

export function hasCustomToString(obj) {
  return isFunction(obj.toString) && obj.toString !== toString;
}

/**
 * @module angular
 * @function isElement

 * @function
 *
 * @description
 * Determines if a reference is a DOM element (or wrapped jQuery element).
 *
 * @param {*} node Reference to check.
 * @returns {boolean} True if `value` is a DOM element (or wrapped jQuery element).
 */
export function isElement(node) {
  return !!(
    node &&
    (node.nodeName || // We are a direct element.
      (node.attr && node.find))
  ); // We have an on and find method part of jQuery API.
}

/**
 * Returns a string appropriate for the type of node.
 *
 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/nodeName)
 *
 * @param {import('../shared/jqlite/jqlite').JQLite|Element} element
 * @returns
 */
export function getNodeName(element) {
  return lowercase(
    /** @type {Element} */ (element).nodeName ||
      (element[0] && element[0].nodeName),
  );
}

export function includes(array, obj) {
  return Array.prototype.indexOf.call(array, obj) !== -1;
}

/**
 * Removes the first occurrence of a specified value from an array.
 *
 * @template T
 * @param {Array<T>} array - The array from which to remove the value.
 * @param {T} value - The value to remove.
 * @returns {number} - The index of the removed value, or -1 if the value was not found.
 */
export function arrayRemove(array, value) {
  const index = array.indexOf(value);
  if (index >= 0) {
    array.splice(index, 1);
  }
  return index;
}

export function simpleCompare(a, b) {
  return a === b || (a !== a && b !== b);
}

/**
 * Determines if two objects or two values are equivalent. Supports value types, regular
 * expressions, arrays and objects.
 *
 * Two objects or values are considered equivalent if at least one of the following is true:
 *
 * * Both objects or values pass `===` comparison.
 * * Both objects or values are of the same type and all of their properties are equal by
 *   comparing them with `angular.equals`.
 * * Both values are NaN. (In JavaScript, NaN == NaN => false. But we consider two NaN as equal)
 * * Both values represent the same regular expression (In JavaScript,
 *   /abc/ == /abc/ => false. But we consider two regular expressions as equal when their textual
 *   representation matches).
 *
 * During a property comparison, properties of `function` type and properties with names
 * that begin with `$` are ignored.
 *
 * Scope and DOMWindow objects are being compared only by identify (`===`).
 *
 * @param {*} o1 Object or value to compare.
 * @param {*} o2 Object or value to compare.
 * @returns {boolean} True if arguments are equal.
 *
 * @example
   <example module="equalsExample" name="equalsExample">
     <file name="index.html">
      <div ng-controller="ExampleController">
        <form novalidate>
          <h3>User 1</h3>
          Name: <input type="text" ng-model="user1.name">
          Age: <input type="number" ng-model="user1.age">

          <h3>User 2</h3>
          Name: <input type="text" ng-model="user2.name">
          Age: <input type="number" ng-model="user2.age">

          <div>
            <br/>
            <input type="button" value="Compare" ng-click="compare()">
          </div>
          User 1: <pre>{{user1 | json}}</pre>
          User 2: <pre>{{user2 | json}}</pre>
          Equal: <pre>{{result}}</pre>
        </form>
      </div>
    </file>
    <file name="script.js">
        angular.module('equalsExample', []).controller('ExampleController', ['$scope', function($scope) {
          $scope.user1 = {};
          $scope.user2 = {};
          $scope.compare = function() {
            $scope.result = angular.equals($scope.user1, $scope.user2);
          };
        }]);
    </file>
  </example>
 */
export function equals(o1, o2) {
  if (o1 === o2) return true;
  if (o1 === null || o2 === null) return false;

  if (o1 !== o1 && o2 !== o2) return true; // NaN === NaN
  const t1 = typeof o1;
  const t2 = typeof o2;
  let length;
  let key;
  let keySet;
  if (t1 === t2 && t1 === "object") {
    if (Array.isArray(o1)) {
      if (!Array.isArray(o2)) return false;
      if ((length = o1.length) === o2.length) {
        for (key = 0; key < length; key++) {
          if (!equals(o1[key], o2[key])) return false;
        }
        return true;
      }
    } else if (isDate(o1)) {
      if (!isDate(o2)) return false;
      return simpleCompare(o1.getTime(), o2.getTime());
    } else if (isRegExp(o1)) {
      if (!isRegExp(o2)) return false;
      return o1.toString() === o2.toString();
    } else {
      if (
        isScope(o1) ||
        isScope(o2) ||
        isWindow(o1) ||
        isWindow(o2) ||
        Array.isArray(o2) ||
        isDate(o2) ||
        isRegExp(o2)
      )
        return false;
      keySet = Object.create(null);
      for (key in o1) {
        if (key.charAt(0) === "$" || isFunction(o1[key])) continue;
        if (!equals(o1[key], o2[key])) return false;
        keySet[key] = true;
      }
      for (key in o2) {
        if (
          !(key in keySet) &&
          key.charAt(0) !== "$" &&
          isDefined(o2[key]) &&
          !isFunction(o2[key])
        )
          return false;
      }
      return true;
    }
  }
  return false;
}

const cspCache = {};

export function csp() {
  if (!isDefined(cspCache.rules)) {
    const ngCspElement =
      document.querySelector("[ng-csp]") ||
      document.querySelector("[data-ng-csp]");

    if (ngCspElement) {
      const ngCspAttribute =
        ngCspElement.getAttribute("ng-csp") ||
        ngCspElement.getAttribute("data-ng-csp");
      cspCache.rules = {
        noUnsafeEval:
          !ngCspAttribute || ngCspAttribute.indexOf("no-unsafe-eval") !== -1,
        noInlineStyle:
          !ngCspAttribute || ngCspAttribute.indexOf("no-inline-style") !== -1,
      };
    } else {
      cspCache.rules = {
        noUnsafeEval: noUnsafeEval(),
        noInlineStyle: false,
      };
    }
  }

  return cspCache.rules;

  function noUnsafeEval() {
    try {
      new Function("");
      return false;
    } catch (e) {
      return true;
    }
  }
}

/**
 * throw error if the name given is hasOwnProperty
 * @param  {string} name    the name to test
 * @param  {string} context the context in which the name is used, such as module or directive
 */
export function assertNotHasOwnProperty(name, context) {
  if (name === "hasOwnProperty") {
    throw ngMinErr(
      "badname",
      "hasOwnProperty is not a valid {0} name",
      context,
    );
  }
}

export function stringify(value) {
  if (value && value[isProxySymbol]) {
    return value.$deproxy();
  }
  if (value == null) {
    // null || undefined
    return "";
  }
  switch (typeof value) {
    case "string":
      break;
    case "number":
      value = `${value}`;
      break;
    default:
      if (hasCustomToString(value) && !Array.isArray(value) && !isDate(value)) {
        value = value.toString();
      } else {
        value = toJson(value);
      }
  }

  return value;
}

/**
 * @param {Number} maxDepth
 * @return {boolean}
 */
export function isValidObjectMaxDepth(maxDepth) {
  return isNumber(maxDepth) && maxDepth > 0;
}

export function concat(array1, array2, index) {
  return array1.concat(Array.prototype.slice.call(array2, index));
}

export function sliceArgs(args, startIndex) {
  return Array.prototype.slice.call(args, startIndex || 0);
}

/**
 * Returns a function which calls function `fn` bound to `self` (`self` becomes the `this` for
 * `fn`). You can supply optional `args` that are prebound to the function. This feature is also
 * known as [partial application](http://en.wikipedia.org/wiki/Partial_application), as
 * distinguished from [function currying](http://en.wikipedia.org/wiki/Currying#Contrast_with_partial_function_application).
 *
 * @param {Object} context Context which `fn` should be evaluated in.
 * @param {*} fn Function to be bound.
 * @returns {Function} Function that wraps the `fn` with all the specified bindings.
 */
export function bind(context, fn) {
  const curryArgs = arguments.length > 2 ? sliceArgs(arguments, 2) : [];
  if (isFunction(fn) && !(fn instanceof RegExp)) {
    return curryArgs.length
      ? function () {
          return arguments.length
            ? fn.apply(context, concat(curryArgs, arguments, 0))
            : fn.apply(context, curryArgs);
        }
      : function () {
          return arguments.length
            ? fn.apply(context, arguments)
            : fn.call(context);
        };
  }
  // In IE, native methods are not functions so they cannot be bound (note: they don't need to be).
  return fn;
}

function toJsonReplacer(key, value) {
  let val = value;

  if (
    typeof key === "string" &&
    key.charAt(0) === "$" &&
    key.charAt(1) === "$"
  ) {
    val = undefined;
  } else if (isWindow(value)) {
    val = "$WINDOW";
  } else if (value && window.document === value) {
    val = "$DOCUMENT";
  } else if (isScope(value)) {
    val = "$SCOPE";
  }

  return val;
}

/**
 * Serializes input into a JSON-formatted string. Properties with leading $$ characters will be
 * stripped since AngularJS uses this notation internally.
 *
 * @param {Object|Array|Date|string|number|boolean} obj Input to be serialized into JSON.
 * @param {boolean|number} [pretty=2] If set to true, the JSON output will contain newlines and whitespace.
 *    If set to an integer, the JSON output will contain that many spaces per indentation.
 * @returns {string|undefined} JSON-ified string representing `obj`.
 * @knownIssue
 *
 * The Safari browser throws a `RangeError` instead of returning `null` when it tries to stringify a `Date`
 * object with an invalid date value. The only reliable way to prevent this is to monkeypatch the
 * `Date.prototype.toJSON` method as follows:
 *
 * ```
 * let _DatetoJSON = Date.prototype.toJSON;
 * Date.prototype.toJSON = function() {
 *   try {
 *     return _DatetoJSON.call(this);
 *   } catch(e) {
 *     if (e instanceof RangeError) {
 *       return null;
 *     }
 *     throw e;
 *   }
 * };
 * ```
 *
 * See https://github.com/angular/angular.js/pull/14221 for more information.
 */
export function toJson(obj, pretty) {
  if (isUndefined(obj)) return undefined;
  if (!isNumber(pretty)) {
    pretty = pretty ? 2 : null;
  }
  return JSON.stringify(obj, toJsonReplacer, /** @type {Number} */ (pretty));
}

/**
 * Deserializes a JSON string.
 *
 * @param {string} json JSON string to deserialize.
 * @returns {Object|Array|string|number} Deserialized JSON string.
 */
export function fromJson(json) {
  return isString(json) ? JSON.parse(json) : json;
}

export function timezoneToOffset(timezone, fallback) {
  const requestedTimezoneOffset =
    Date.parse(`Jan 01, 1970 00:00:00 ${timezone}`) / 60000;
  return isNumberNaN(requestedTimezoneOffset)
    ? fallback
    : requestedTimezoneOffset;
}

export function addDateMinutes(date, minutes) {
  const newDate = new Date(date.getTime());
  newDate.setMinutes(newDate.getMinutes() + minutes);
  return newDate;
}

export function convertTimezoneToLocal(date, timezone, reverse) {
  const doReverse = reverse ? -1 : 1;
  const dateTimezoneOffset = date.getTimezoneOffset();
  const timezoneOffset = timezoneToOffset(timezone, dateTimezoneOffset);
  return addDateMinutes(
    date,
    doReverse * (timezoneOffset - dateTimezoneOffset),
  );
}

/**
 * Parses an escaped url query string into key-value pairs.
 * @param {string} keyValue
 * @returns {Object.<string,boolean|Array>}
 */
export function parseKeyValue(keyValue) {
  const obj = {};
  (keyValue || "").split("&").forEach((keyValue) => {
    let splitPoint;
    let key;
    let val;
    if (keyValue) {
      key = keyValue = keyValue.replace(/\+/g, "%20");
      splitPoint = keyValue.indexOf("=");
      if (splitPoint !== -1) {
        key = keyValue.substring(0, splitPoint);
        val = keyValue.substring(splitPoint + 1);
      }
      key = tryDecodeURIComponent(key);
      if (isDefined(key)) {
        val = isDefined(val) ? tryDecodeURIComponent(val) : true;
        if (!Object.hasOwnProperty.call(obj, key)) {
          obj[key] = val;
        } else if (Array.isArray(obj[key])) {
          obj[key].push(val);
        } else {
          obj[key] = [obj[key], val];
        }
      }
    }
  });
  return /** @type {Object.<string,boolean|Array>} */ (obj);
}

export function toKeyValue(obj) {
  const parts = [];
  obj &&
    Object.entries(obj).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((arrayValue) => {
          parts.push(
            encodeUriQuery(key, true) +
              (arrayValue === true
                ? ""
                : `=${encodeUriQuery(arrayValue, true)}`),
          );
        });
      } else {
        parts.push(
          encodeUriQuery(key, true) +
            (value === true ? "" : `=${encodeUriQuery(value, true)}`),
        );
      }
    });
  return parts.length ? parts.join("&") : "";
}

/**
 * Tries to decode the URI component without throwing an exception.
 *
 * @param  {string} value potential URI component to check.
 * @returns {string}
 */
export function tryDecodeURIComponent(value) {
  try {
    return decodeURIComponent(value);
  } catch (e) {
    value;
  }
}

/**
 * We need our custom method because encodeURIComponent is too aggressive and doesn't follow
 * http://www.ietf.org/rfc/rfc3986.txt with regards to the character set (pchar) allowed in path
 * segments:
 *    segment       = *pchar
 *    pchar         = unreserved / pct-encoded / sub-delims / ":" / "@"
 *    pct-encoded   = "%" HEXDIG HEXDIG
 *    unreserved    = ALPHA / DIGIT / "-" / "." / "_" / "~"
 *    sub-delims    = "!" / "$" / "&" / "'" / "(" / ")"
 *                     / "*" / "+" / "," / ";" / "="
 */
export function encodeUriSegment(val) {
  return encodeUriQuery(val, true)
    .replace(/%26/gi, "&")
    .replace(/%3D/gi, "=")
    .replace(/%2B/gi, "+");
}

/**
 * This method is intended for encoding *key* or *value* parts of query component. We need a custom
 * method because encodeURIComponent is too aggressive and encodes stuff that doesn't have to be
 * encoded per http://tools.ietf.org/html/rfc3986:
 *    query         = *( pchar / "/" / "?" )
 *    pchar         = unreserved / pct-encoded / sub-delims / ":" / "@"
 *    unreserved    = ALPHA / DIGIT / "-" / "." / "_" / "~"
 *    pct-encoded   = "%" HEXDIG HEXDIG
 *    sub-delims    = "!" / "$" / "&" / "'" / "(" / ")"
 *                     / "*" / "+" / "," / ";" / "="
 */
export function encodeUriQuery(val, pctEncodeSpaces) {
  return encodeURIComponent(val)
    .replace(/%40/gi, "@")
    .replace(/%3A/gi, ":")
    .replace(/%24/g, "$")
    .replace(/%2C/gi, ",")
    .replace(/%3B/gi, ";")
    .replace(/%20/g, pctEncodeSpaces ? "%20" : "+");
}

export const ngAttrPrefixes = ["ng-", "data-ng-"];

export function getNgAttribute(element, ngAttr) {
  let attr;
  let i;
  const ii = ngAttrPrefixes.length;
  for (i = 0; i < ii; ++i) {
    attr = ngAttrPrefixes[i] + ngAttr;
    if (isString((attr = element.getAttribute(attr)))) {
      return attr;
    }
  }
  return null;
}

/**
 * Creates a shallow copy of an object, an array or a primitive.
 *
 * Assumes that there are no proto properties for objects.
 */
export function shallowCopy(src, dst) {
  if (Array.isArray(src)) {
    dst = dst || [];

    for (let i = 0, ii = src.length; i < ii; i++) {
      dst[i] = src[i];
    }
  } else if (isObject(src)) {
    dst = dst || {};

    for (const key in src) {
      if (!(key.startsWith("$") && key.charAt(1) === "$")) {
        dst[key] = src[key];
      }
    }
  }

  return dst || src;
}

/**
 * Throw error if the argument is false
 * @param {boolean} argument
 * @param {string} errorMsg
 */
export function assert(argument, errorMsg = "Assertion failed") {
  if (!argument) throw new Error(errorMsg);
}

/**
 * Throw error if the argument is falsy.
 */
export function assertArg(arg, name, reason) {
  if (!arg) {
    throw ngMinErr(
      "areq",
      "Argument '{0}' is {1}",
      name || "?",
      reason || "required",
    );
  }
  return arg;
}

export function assertArgFn(arg, name, acceptArrayAnnotation) {
  if (acceptArrayAnnotation && Array.isArray(arg)) {
    arg = arg[arg.length - 1];
  }

  assertArg(
    isFunction(arg),
    name,
    `not a function, got ${
      arg && typeof arg === "object"
        ? arg.constructor.name || "Object"
        : typeof arg
    }`,
  );
  return arg;
}

/**
 * @typedef {Object} ErrorHandlingConfig
 * Error configuration object. May only contain the options that need to be updated.
 * @property {number=} objectMaxDepth - The max depth for stringifying objects. Setting to a
 *   non-positive or non-numeric value removes the max depth limit. Default: 5.
 * @property {boolean=} urlErrorParamsEnabled - Specifies whether the generated error URL will
 *   contain the parameters of the thrown error. Default: true. When used without argument, it returns the current value.
 */

/** @type {ErrorHandlingConfig} */
const minErrConfig = {
  objectMaxDepth: 5,
  urlErrorParamsEnabled: true,
};

/**
 * @param {ErrorHandlingConfig} [config]
 * @returns {ErrorHandlingConfig}
 */
export function errorHandlingConfig(config) {
  if (isObject(config)) {
    if (isDefined(config.objectMaxDepth)) {
      minErrConfig.objectMaxDepth = isValidObjectMaxDepth(config.objectMaxDepth)
        ? config.objectMaxDepth
        : NaN;
    }
    if (
      isDefined(config.urlErrorParamsEnabled) &&
      isBoolean(config.urlErrorParamsEnabled)
    ) {
      minErrConfig.urlErrorParamsEnabled = config.urlErrorParamsEnabled;
    }
  }
  return minErrConfig;
}

/**
 * This object provides a utility for producing rich Error messages within
 * AngularJS. It can be called as follows:
 *
 * let exampleMinErr = minErr('example');
 * throw exampleMinErr('one', 'This {0} is {1}', foo, bar);
 *
 * The above creates an instance of minErr in the example namespace. The
 * resulting error will have a namespaced error code of example.one.  The
 * resulting error will replace {0} with the value of foo, and {1} with the
 * value of bar. The object is not restricted in the number of arguments it can
 * take.
 *
 * If fewer arguments are specified than necessary for interpolation, the extra
 * interpolation markers will be preserved in the final string.
 *
 * Since data will be parsed statically during a build step, some restrictions
 * are applied with respect to how minErr instances are created and called.
 * Instances should have names of the form namespaceMinErr for a minErr created
 * using minErr('namespace'). Error codes, namespaces and template strings
 * should all be static strings, not variables or general expressions.
 *
 * @param {string} module The namespace to use for the new minErr instance.
 * @returns {function(string, ...*): Error} minErr instance
 */
export function minErr(module) {
  const url = 'https://errors.angularjs.org/"NG_VERSION_FULL"/';
  const regex = `${url.replace(".", "\\.")}[\\s\\S]*`;
  const errRegExp = new RegExp(regex, "g");

  return function (...args) {
    const code = args[0];
    const template = args[1];
    let message = `[${module ? `${module}:` : ""}${code}] `;
    const templateArgs = sliceArgs(args, 2).map((arg) => toDebugString(arg));
    let paramPrefix;
    let i;

    // A minErr message has two parts: the message itself and the url that contains the
    // encoded message.
    // The message's parameters can contain other error messages which also include error urls.
    // To prevent the messages from getting too long, we strip the error urls from the parameters.

    message += template.replace(/\{\d+\}/g, (match) => {
      const index = +match.slice(1, -1);

      if (index < templateArgs.length) {
        return templateArgs[index].replace(errRegExp, "");
      }

      return match;
    });

    message += `\n${url}${module ? `${module}/` : ""}${code}`;

    if (errorHandlingConfig().urlErrorParamsEnabled) {
      for (
        i = 0, paramPrefix = "?";
        i < templateArgs.length;
        i++, paramPrefix = "&"
      ) {
        message += `${paramPrefix}p${i}=${encodeURIComponent(templateArgs[i])}`;
      }
    }
    return new Error(message);
  };
}

export function toDebugString(obj) {
  if (typeof obj === "function") {
    return obj.toString().replace(/ \{[\s\S]*$/, "");
  }
  if (isUndefined(obj)) {
    return "undefined";
  }
  if (typeof obj !== "string") {
    const seen = [];
    let copyObj = structuredClone(obj);
    return JSON.stringify(copyObj, (key, val) => {
      const replace = toJsonReplacer(key, val);
      if (isObject(replace)) {
        if (seen.indexOf(replace) >= 0) return "...";

        seen.push(replace);
      }
      return replace;
    });
  }
  return obj;
}

/**
 * Computes a hash of an 'obj'.
 * Hash of a:
 *  string is string
 *  number is number as string
 *  object is either result of calling $$hashKey function on the object or uniquely generated id,
 *         that is also assigned to the $$hashKey property of the object.
 *
 * @param {*} obj
 * @returns {string} hash string such that the same input will have the same hash string.
 *         The resulting string key is in 'type:hashKey' format.
 */
export function hashKey(obj) {
  const key = obj && obj.$$hashKey;

  if (key) {
    if (typeof key === "function") {
      return obj.$$hashKey();
    }
    return key;
  }

  const objType = typeof obj;
  if (objType === "function" || (objType === "object" && obj !== null)) {
    obj.$$hashKey = `${objType}:${nextUid()}`;
    return obj.$$hashKey;
  }

  return `${objType}:${obj}`;
}

export function mergeClasses(a, b) {
  if (!a && !b) return "";
  if (!a) return b;
  if (!b) return a;
  if (Array.isArray(a)) a = a.join(" ");
  if (Array.isArray(b)) b = b.join(" ");
  return a + " " + b;
}

/**
 * Converts all accepted directives format into proper directive name.
 * @param {string} name Name to normalize
 * @returns {string}
 */

export function directiveNormalize(name) {
  return name
    .replace(PREFIX_REGEXP, "")
    .replace(SPECIAL_CHARS_REGEXP, (_, letter, offset) =>
      offset ? letter.toUpperCase() : letter,
    );
}

/**
 * Whether element should be animated
 * @param {Node} node
 * @returns {boolean}
 */
export function hasAnimate(node) {
  return hasCustomOrDataAttribute(node, "animate");
}

/**
 * @ignore
 * @param {Node} node
 * @param {string} attr
 * @returns {boolean}
 */
function hasCustomOrDataAttribute(node, attr) {
  if (node.nodeType !== Node.ELEMENT_NODE) return false;
  const element = /** @type {HTMLElement} */ (node);
  return (
    element.dataset[attr] === "true" || element.getAttribute(attr) === "true"
  );
}
