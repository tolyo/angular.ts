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
export function nextUid(): number;
/**
 *
 * @description Converts the specified string to lowercase.
 * @param {string} string String to be converted to lowercase.
 * @returns {string} Lowercased string.
 */
export function lowercase(string: string): string;
/**
 *
 * @description Converts the specified string to uppercase.
 * @param {string} string String to be converted to uppercase.
 * @returns {string} Uppercased string.
 */
export function uppercase(string: string): string;
/**
 * @param {*} obj
 * @return {boolean} Returns true if `obj` is an array or array-like object (NodeList, Arguments,
 *                   String ...)
 */
export function isArrayLike(obj: any): boolean;
/**
 * Determines if a reference is undefined.
 *
 * @param {*} value Reference to check.
 * @returns {boolean} True if `value` is undefined.
 */
export function isUndefined(value: any): boolean;
/**
 * Determines if a reference is defined.
 *
 * @param {*} value Reference to check.
 * @returns {boolean} True if `value` is defined.
 */
export function isDefined(value: any): boolean;
/**
 * Determines if a reference is an `Object`. Unlike `typeof` in JavaScript, `null`s are not
 * considered to be objects. Note that JavaScript arrays are objects.
 *
 * @param {*} value Reference to check.
 * @returns {boolean} True if `value` is an `Object` but not `null`.
 */
export function isObject(value: any): boolean;
/**
 * Determines if a value is an object with a null prototype
 *
 * @returns {boolean} True if `value` is an `Object` with a null prototype
 */
export function isBlankObject(value: any): boolean;
/**
 * Determines if a reference is a `String`.
 *
 * @param {*} value Reference to check.
 * @returns {boolean} True if `value` is a `String`.
 */
export function isString(value: any): boolean;
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
export function isNumber(value: any): boolean;
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
export function isDate(value: any): boolean;
/**
 * Determines if a reference is an `Error`.
 * Loosely based on https://www.npmjs.com/package/iserror
 *
 * @param {*} value Reference to check.
 * @returns {boolean} True if `value` is an `Error`.
 */
export function isError(value: any): boolean;
/**
 * Determines if a reference is a `Function`.
 *
 * @param {*} value Reference to check.
 * @returns {boolean} True if `value` is a `Function`.
 */
export function isFunction(value: any): boolean;
/**
 * Determines if a value is a regular expression object.
 *
 * @param {*} value Reference to check.
 * @returns {boolean} True if `value` is a `RegExp`.
 */
export function isRegExp(value: any): boolean;
/**
 * Checks if `obj` is a window object.
 *
 * @param {*} obj Object to check
 * @returns {boolean} True if `obj` is a window obj.
 */
export function isWindow(obj: any): boolean;
/**
 * @param {*} obj
 * @returns {boolean}
 */
export function isScope(obj: any): boolean;
/**
 * @param {*} obj
 * @returns {boolean}
 */
export function isFile(obj: any): boolean;
/**
 * @param {*} obj
 * @returns {boolean}
 */
export function isFormData(obj: any): boolean;
/**
 * @param {*} obj
 * @returns {boolean}
 */
export function isBlob(obj: any): boolean;
/**
 * @param {*} value
 * @returns {boolean}
 */
export function isBoolean(value: any): boolean;
/**
 * @param {*} obj
 * @returns {boolean}
 */
export function isPromiseLike(obj: any): boolean;
/**
 * @param {*} value
 * @returns {boolean}
 */
export function isTypedArray(value: any): boolean;
/**
 * @param {*} obj
 * @returns {boolean}
 */
export function isArrayBuffer(obj: any): boolean;
/**
 * @param {*} value
 * @returns {string | *}
 */
export function trim(value: any): string | any;
export function snakeCase(name: any, separator: any): any;
/**
 * Set or clear the hashkey for an object.
 * @param obj object
 * @param h the hashkey (!truthy to delete the hashkey)
 */
export function setHashKey(obj: any, h: any): void;
export function baseExtend(dst: any, objs: any, deep: any): any;
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
export function extend(dst: any, ...src: any[]): any;
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
export function merge(dst: any, ...src: any[]): any;
/**
 * @param {string} str
 * @returns {number}
 */
export function toInt(str: string): number;
/**
 * @param {any} num
 * @returns {boolean}
 */
export function isNumberNaN(num: any): boolean;
/**
 * @param {Object} parent
 * @param {Object} extra
 * @returns {Object}
 */
export function inherit(parent: any, extra: any): any;
export function hasCustomToString(obj: any): boolean;
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
export function isElement(node: any): boolean;
/**
 * Returns a string appropriate for the type of node.
 *
 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/nodeName)
 *
 * @param {import('../shared/jqlite/jqlite').JQLite|Element} element
 * @returns
 */
export function getNodeName(element: import("../shared/jqlite/jqlite").JQLite | Element): string;
export function includes(array: any, obj: any): boolean;
/**
 * Removes the first occurrence of a specified value from an array.
 *
 * @template T
 * @param {Array<T>} array - The array from which to remove the value.
 * @param {T} value - The value to remove.
 * @returns {number} - The index of the removed value, or -1 if the value was not found.
 */
export function arrayRemove<T>(array: Array<T>, value: T): number;
export function simpleCompare(a: any, b: any): boolean;
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
export function equals(o1: any, o2: any): boolean;
export function csp(): any;
/**
 * throw error if the name given is hasOwnProperty
 * @param  {string} name    the name to test
 * @param  {string} context the context in which the name is used, such as module or directive
 */
export function assertNotHasOwnProperty(name: string, context: string): void;
export function stringify(value: any): any;
/**
 * @param {Number} maxDepth
 * @return {boolean}
 */
export function isValidObjectMaxDepth(maxDepth: number): boolean;
export function concat(array1: any, array2: any, index: any): any;
export function sliceArgs(args: any, startIndex: any): any;
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
export function bind(context: any, fn: any, ...args: any[]): Function;
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
export function toJson(obj: any | any[] | Date | string | number | boolean, pretty?: boolean | number): string | undefined;
/**
 * Deserializes a JSON string.
 *
 * @param {string} json JSON string to deserialize.
 * @returns {Object|Array|string|number} Deserialized JSON string.
 */
export function fromJson(json: string): any | any[] | string | number;
export function timezoneToOffset(timezone: any, fallback: any): any;
export function addDateMinutes(date: any, minutes: any): Date;
export function convertTimezoneToLocal(date: any, timezone: any, reverse: any): Date;
/**
 * Parses an escaped url query string into key-value pairs.
 * @param {string} keyValue
 * @returns {Object.<string,boolean|Array>}
 */
export function parseKeyValue(keyValue: string): {
    [x: string]: boolean | any[];
};
export function toKeyValue(obj: any): string;
/**
 * Tries to decode the URI component without throwing an exception.
 *
 * @param  {string} value potential URI component to check.
 * @returns {string}
 */
export function tryDecodeURIComponent(value: string): string;
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
export function encodeUriSegment(val: any): string;
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
export function encodeUriQuery(val: any, pctEncodeSpaces: any): string;
export function getNgAttribute(element: any, ngAttr: any): any;
/**
 * Creates a shallow copy of an object, an array or a primitive.
 *
 * Assumes that there are no proto properties for objects.
 */
export function shallowCopy(src: any, dst: any): any;
/**
 * Throw error if the argument is false
 * @param {boolean} argument
 * @param {string} errorMsg
 */
export function assert(argument: boolean, errorMsg?: string): void;
/**
 * Throw error if the argument is falsy.
 */
export function assertArg(arg: any, name: any, reason: any): any;
export function assertArgFn(arg: any, name: any, acceptArrayAnnotation: any): any;
/**
 * @param {ErrorHandlingConfig} [config]
 * @returns {ErrorHandlingConfig}
 */
export function errorHandlingConfig(config?: ErrorHandlingConfig): ErrorHandlingConfig;
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
export function minErr(module: string): (arg0: string, ...args: any[]) => Error;
export function toDebugString(obj: any): any;
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
export function hashKey(obj: any): string;
export function mergeClasses(a: any, b: any): any;
/**
 * Converts all accepted directives format into proper directive name.
 * @param {string} name Name to normalize
 * @returns {string}
 */
export function directiveNormalize(name: string): string;
/**
 * Whether element should be animated
 * @param {Node} node
 * @returns {boolean}
 */
export function hasAnimate(node: Node): boolean;
/**
 * @param {Object|null|undefined} obj
 * @returns {boolean}
 */
export function isObjectEmpty(obj: any | null | undefined): boolean;
export const ngAttrPrefixes: string[];
/**
 * Error configuration object. May only contain the options that need to be updated.
 */
export type ErrorHandlingConfig = {
    /**
     * - The max depth for stringifying objects. Setting to a
     * non-positive or non-numeric value removes the max depth limit. Default: 5.
     */
    objectMaxDepth?: number | undefined;
    /**
     * - Specifies whether the generated error URL will
     * contain the parameters of the thrown error. Default: true. When used without argument, it returns the current value.
     */
    urlErrorParamsEnabled?: boolean | undefined;
};
