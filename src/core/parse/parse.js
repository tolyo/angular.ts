import { forEach, isDefined, isFunction } from "../../shared/utils.js";
import { PURITY_RELATIVE } from "./interpreter.js";
import { Lexer } from "./lexer/lexer.js";
import { Parser } from "./parser/parser.js";

/**
 * @typedef {Object} CompiledExpressionProps
 * @property {boolean} literal - Indicates if the expression is a literal.
 * @property {boolean} constant - Indicates if the expression is constant.
 * @property {boolean} [isPure]
 * @property {boolean} oneTime
 * @property {function(import('../scope/scope').Scope, import('../scope/scope').WatchListener, boolean, CompiledExpression, string | ((scope:  import('../scope/scope').Scope) => any) | CompiledExpression): any} [$$watchDelegate]
 * @property {any[]|Function} inputs
 * @property {function(any, any): any} [assign] - Assigns a value to a context. If value is not provided,
 */

/**
 * @typedef {Function} CompiledExpressionFunction
 * @param {import('../scope/scope').Scope} context - An object against which any expressions embedded in the strings are evaluated against (typically a scope object).
 * @param {object} [locals] - local variables context object, useful for overriding values in `context`.
 * @param {any} [assign]
 * @returns {any}
 * undefined is gonna be used since the implementation
 * does not check the parameter. Let's force a value for consistency. If consumer
 * wants to undefine it, pass the undefined value explicitly.
 */

/**
 * @typedef {CompiledExpressionFunction & CompiledExpressionProps} CompiledExpression
 */

/**
 * @typedef {function(CompiledExpression|string|function(import('../scope/scope').Scope):any, function(any, import('../scope/scope').Scope, any):any=, boolean=): CompiledExpression} ParseService
 */

export function ParseProvider() {
  const cache = Object.create(null);

  /** @type {function(any):boolean?} */
  var identStart;

  /** @type {function(any):boolean?} */
  var identContinue;

  /**
   * Allows defining the set of characters that are allowed in AngularJS expressions. The function
   * `identifierStart` will get called to know if a given character is a valid character to be the
   * first character for an identifier. The function `identifierContinue` will get called to know if
   * a given character is a valid character to be a follow-up identifier character. The functions
   * `identifierStart` and `identifierContinue` will receive as arguments the single character to be
   * identifier and the character code point. These arguments will be `string` and `numeric`. Keep in
   * mind that the `string` parameter can be two characters long depending on the character
   * representation. It is expected for the function to return `true` or `false`, whether that
   * character is allowed or not.
   *
   * Since this function will be called extensively, keep the implementation of these functions fast,
   * as the performance of these functions have a direct impact on the expressions parsing speed.
   *
   * @param {function(any):boolean} [identifierStart] The function that will decide whether the given character is
   *   a valid identifier start character.
   * @param {function(any):boolean} [identifierContinue] The function that will decide whether the given character is
   *   a valid identifier continue character.
   * @returns {ParseProvider}
   */
  this.setIdentifierFns = function (identifierStart, identifierContinue) {
    identStart = identifierStart;
    identContinue = identifierContinue;
    return this;
  };

  this.$get = [
    "$filter",
    /**
     *
     * @param {(any) => any} $filter
     * @returns {ParseService}
     */
    function ($filter) {
      /** @type {import("./lexer/lexer.js").LexerOptions} */
      var $lexerOptions = {
        isIdentifierStart: isFunction(identStart) && identStart,
        isIdentifierContinue: isFunction(identContinue) && identContinue,
      };
      return $parse;

      function $parse(exp, interceptorFn) {
        var parsedExpression, cacheKey;

        switch (typeof exp) {
          case "string":
            exp = exp.trim();
            cacheKey = exp;

            parsedExpression = cache[cacheKey];

            if (!parsedExpression) {
              var lexer = new Lexer($lexerOptions);
              var parser = new Parser(lexer, $filter);
              parsedExpression = parser.parse(exp);

              cache[cacheKey] = addWatchDelegate(parsedExpression);
            }
            return addInterceptor(parsedExpression, interceptorFn);

          case "function":
            return addInterceptor(exp, interceptorFn);

          default:
            return addInterceptor(() => {}, interceptorFn);
        }
      }

      function addInterceptor(parsedExpression, interceptorFn) {
        if (!interceptorFn) return parsedExpression;

        // Extract any existing interceptors out of the parsedExpression
        // to ensure the original parsedExpression is always the $$intercepted
        if (parsedExpression.$$interceptor) {
          interceptorFn = chainInterceptors(
            parsedExpression.$$interceptor,
            interceptorFn,
          );
          parsedExpression = parsedExpression.$$intercepted;
        }

        let useInputs = false;

        const fn = function interceptedExpression(
          scope,
          locals,
          assign,
          inputs,
        ) {
          const value =
            useInputs && inputs
              ? inputs[0]
              : parsedExpression(scope, locals, assign, inputs);
          // Do not invoke for getters
          if (scope.getter) {
            return;
          }
          const res = isFunction(value) ? value() : value;
          return interceptorFn(res);
        };

        // Maintain references to the interceptor/intercepted
        fn.$$intercepted = parsedExpression;
        fn.$$interceptor = interceptorFn;

        // Propagate the literal/oneTime/constant attributes
        fn.literal = parsedExpression.literal;
        fn.oneTime = parsedExpression.oneTime;
        fn.constant = parsedExpression.constant;

        // Treat the interceptor like filters.
        // If it is not $stateful then only watch its inputs.
        // If the expression itself has no inputs then use the full expression as an input.
        if (!interceptorFn.$stateful) {
          useInputs = !parsedExpression.inputs;
          fn.inputs = parsedExpression.inputs
            ? parsedExpression.inputs
            : [parsedExpression];

          if (!interceptorFn.$$pure) {
            fn.inputs = fn.inputs.map(function (e) {
              // Remove the isPure flag of inputs when it is not absolute because they are now wrapped in a
              // non-pure interceptor function.
              if (e.isPure === PURITY_RELATIVE) {
                return function depurifier(s) {
                  return e(s);
                };
              }
              return e;
            });
          }
        }

        return addWatchDelegate(fn);
      }
    },
  ];
}

export function constantWatchDelegate(
  scope,
  listener,
  objectEquality,
  parsedExpression,
) {
  const unwatch = scope.$watch(
    () => {
      unwatch();
      return parsedExpression(scope);
    },
    listener,
    objectEquality,
  );
  return unwatch;
}

/**
 *
 * @param {CompiledExpression} parsedExpression
 * @returns {CompiledExpression}
 */
function addWatchDelegate(parsedExpression) {
  if (parsedExpression.constant) {
    parsedExpression.$$watchDelegate = constantWatchDelegate;
  } else if (parsedExpression.oneTime) {
    parsedExpression.$$watchDelegate = oneTimeWatchDelegate;
  } else if (parsedExpression.inputs) {
    parsedExpression.$$watchDelegate = inputsWatchDelegate;
  }

  return parsedExpression;
}

/**
 *
 * @param {import('../scope/scope').Scope} scope
 * @param {import('../scope/scope').WatchListener} listener
 * @param {*} objectEquality
 * @param {CompiledExpression} parsedExpression
 * @returns
 */
function inputsWatchDelegate(
  scope,
  listener,
  objectEquality,
  parsedExpression,
) {
  let inputExpressions = /** @type {Function} */ (parsedExpression.inputs);
  let lastResult;

  if (inputExpressions.length === 1) {
    let oldInputValueOf = expressionInputDirtyCheck; // init to something unique so that equals check fails

    let inputExpression = inputExpressions[0];

    return scope.$watch(
      ($scope) => {
        const newInputValue = inputExpression($scope);
        if (
          !expressionInputDirtyCheck(
            newInputValue,
            oldInputValueOf,
            inputExpression.isPure,
          )
        ) {
          lastResult = parsedExpression($scope, undefined, undefined, [
            newInputValue,
          ]);
          oldInputValueOf = newInputValue && getValueOf(newInputValue);
        }
        return lastResult;
      },
      listener,
      objectEquality,
    );
  } else {
    const oldInputValueOfValues = [];
    const oldInputValues = [];
    for (let i = 0, ii = inputExpressions.length; i < ii; i++) {
      oldInputValueOfValues[i] = expressionInputDirtyCheck; // init to something unique so that equals check fails
      oldInputValues[i] = null;
    }

    return scope.$watch(
      (scope) => {
        let changed = false;

        for (let i = 0, ii = inputExpressions.length; i < ii; i++) {
          const newInputValue = inputExpressions[i](scope);
          if (
            changed ||
            (changed = !expressionInputDirtyCheck(
              newInputValue,
              oldInputValueOfValues[i],
              inputExpressions[i].isPure,
            ))
          ) {
            oldInputValues[i] = newInputValue;
            oldInputValueOfValues[i] =
              newInputValue && getValueOf(newInputValue);
          }
        }

        if (changed) {
          lastResult = parsedExpression(
            scope,
            undefined,
            undefined,
            oldInputValues,
          );
        }

        return lastResult;
      },
      listener,
      objectEquality,
    );
  }
}

function oneTimeWatchDelegate(
  scope,
  listener,
  objectEquality,
  parsedExpression,
) {
  const isDone = parsedExpression.literal ? isAllDefined : isDefined;

  let unwatch;
  let lastValue;

  const exp = parsedExpression.$$intercepted || parsedExpression;
  const post = parsedExpression.$$interceptor || ((x) => x);

  const useInputs = parsedExpression.inputs && !exp.inputs;

  // Propagate the literal/inputs/constant attributes
  // ... but not oneTime since we are handling it
  oneTimeWatch.literal = parsedExpression.literal;
  oneTimeWatch.constant = parsedExpression.constant;
  oneTimeWatch.inputs = parsedExpression.inputs;
  oneTimeWatch.oneTime = undefined;

  // Allow other delegates to run on this wrapped expression
  addWatchDelegate(oneTimeWatch);

  function unwatchIfDone() {
    if (isDone(lastValue)) {
      unwatch();
    }
  }

  function oneTimeWatch(scope, locals, assign, inputs) {
    lastValue =
      useInputs && inputs ? inputs[0] : exp(scope, locals, assign, inputs);
    if (isDone(lastValue)) {
      scope.$postUpdate(unwatchIfDone);
    }
    return post(lastValue);
  }

  unwatch = scope.$watch(oneTimeWatch, listener, objectEquality);

  return unwatch;
}

function chainInterceptors(first, second) {
  function chainedInterceptor(value) {
    return second(first(value));
  }
  chainedInterceptor.$stateful = first.$stateful || second.$stateful;
  chainedInterceptor.$$pure = first.$$pure && second.$$pure;

  return chainedInterceptor;
}

function expressionInputDirtyCheck(
  newValue,
  oldValueOfValue,
  compareObjectIdentity,
) {
  if (newValue == null || oldValueOfValue == null) {
    // null/undefined
    return newValue === oldValueOfValue;
  }

  if (typeof newValue === "object") {
    // attempt to convert the value to a primitive type
    // TODO(docs): add a note to docs that by implementing valueOf even objects and arrays can
    //             be cheaply dirty-checked
    newValue = getValueOf(newValue);

    if (typeof newValue === "object" && !compareObjectIdentity) {
      // objects/arrays are not supported - deep-watching them would be too expensive
      return false;
    }

    // fall-through to the primitive equality check
  }

  // Primitive or NaN

  return (
    newValue === oldValueOfValue ||
    (newValue !== newValue && oldValueOfValue !== oldValueOfValue)
  );
}

function isAllDefined(value) {
  let allDefined = true;
  forEach(value, (val) => {
    if (!isDefined(val)) allDefined = false;
  });
  return allDefined;
}

function getValueOf(value) {
  return isFunction(value.valueOf)
    ? value.valueOf()
    : {}.constructor.prototype.valueOf.call(value);
}
