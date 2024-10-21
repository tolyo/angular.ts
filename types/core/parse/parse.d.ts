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
export function ParseProvider(): void;
export class ParseProvider {
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
    setIdentifierFns: (identifierStart?: (arg0: any) => boolean, identifierContinue?: (arg0: any) => boolean) => ParseProvider;
    $get: (string | (($filter: (any: any) => any) => ParseService))[];
}
export function constantWatchDelegate(scope: any, listener: any, objectEquality: any, parsedExpression: any): any;
export type CompiledExpressionProps = {
    /**
     * - Indicates if the expression is a literal.
     */
    literal: boolean;
    /**
     * - Indicates if the expression is constant.
     */
    constant: boolean;
    isPure?: boolean;
    oneTime: boolean;
    $$watchDelegate?: (arg0: import("../scope/scope").Scope, arg1: import("../scope/scope").WatchListener, arg2: boolean, arg3: CompiledExpression, arg4: string | ((scope: import("../scope/scope").Scope) => any) | CompiledExpression) => any;
    inputs: any[] | Function;
    /**
     * - Assigns a value to a context. If value is not provided,
     */
    assign?: (arg0: any, arg1: any) => any;
};
export type CompiledExpressionFunction = Function;
export type CompiledExpression = CompiledExpressionFunction & CompiledExpressionProps;
export type ParseService = (arg0: CompiledExpression | string | ((arg0: import("../scope/scope").Scope) => any), arg1: ((arg0: any, arg1: import("../scope/scope").Scope, arg2: any) => any) | undefined, arg2: boolean | undefined) => CompiledExpression;
