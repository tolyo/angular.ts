/**
 * @param {import("./ast/ast").ASTNode} ast
 * @returns {boolean}
 */
export function isAssignable(ast: import("./ast/ast").ASTNode): boolean;
export const PURITY_ABSOLUTE: 1;
export const PURITY_RELATIVE: 2;
export class ASTInterpreter {
    /**
     * @param {function(any):any} $filter
     */
    constructor($filter: (arg0: any) => any);
    $filter: (arg0: any) => any;
    /**
     * Compiles the AST into a function.
     * @param {import("./ast/ast").ASTNode} ast - The AST to compile.
     * @returns {import("./parse").CompiledExpression}
     */
    compile(ast: import("./ast/ast").ASTNode): import("./parse").CompiledExpression;
    /**
     * Recurses the AST nodes.
     * @param {import("./ast/ast").ASTNode} ast - The AST node.
     * @param {Object} [context] - The context.
     * @param {boolean|1} [create] - The create flag.
     * @returns {import("./parse").CompiledExpressionFunction} The recursive function.
     */
    recurse(ast: import("./ast/ast").ASTNode, context?: any, create?: boolean | 1): import("./parse").CompiledExpressionFunction;
    /**
     * Unary plus operation.
     * @param {function} argument - The argument function.
     * @param {Object} [context] - The context.
     * @returns {function} The unary plus function.
     */
    "unary+"(argument: Function, context?: any): Function;
    /**
     * Unary minus operation.
     * @param {function} argument - The argument function.
     * @param {Object} [context] - The context.
     * @returns {function} The unary minus function.
     */
    "unary-"(argument: Function, context?: any): Function;
    /**
     * Unary negation operation.
     * @param {function} argument - The argument function.
     * @param {Object} [context] - The context.
     * @returns {function} The unary negation function.
     */
    "unary!"(argument: Function, context?: any): Function;
    /**
     * Binary plus operation.
     * @param {function} left - The left operand function.
     * @param {function} right - The right operand function.
     * @param {Object} [context] - The context.
     * @returns {function} The binary plus function.
     */
    "binary+"(left: Function, right: Function, context?: any): Function;
    /**
     * Binary minus operation.
     * @param {function} left - The left operand function.
     * @param {function} right - The right operand function.
     * @param {Object} [context] - The context.
     * @returns {function} The binary minus function.
     */
    "binary-"(left: Function, right: Function, context?: any): Function;
    /**
     * Binary multiplication operation.
     * @param {function} left - The left operand function.
     * @param {function} right - The right operand function.
     * @param {Object} [context] - The context.
     * @returns {function} The binary multiplication function.
     */
    "binary*"(left: Function, right: Function, context?: any): Function;
    "binary/"(left: any, right: any, context: any): (scope: any, locals: any, assign: any) => number | {
        value: number;
    };
    /**
     * Binary division operation.
     * @param {function} left - The left operand function.
     * @param {function} right - The right operand function.
     * @param {Object} [context] - The context.
     * @returns {function} The binary division function.
     */
    "binary%"(left: Function, right: Function, context?: any): Function;
    /**
     * Binary strict equality operation.
     * @param {function} left - The left operand function.
     * @param {function} right - The right operand function.
     * @param {Object} [context] - The context.
     * @returns {function} The binary strict equality function.
     */
    "binary==="(left: Function, right: Function, context?: any): Function;
    /**
     * Binary strict inequality operation.
     * @param {function} left - The left operand function.
     * @param {function} right - The right operand function.
     * @param {Object} [context] - The context.
     * @returns {function} The binary strict inequality function.
     */
    "binary!=="(left: Function, right: Function, context?: any): Function;
    /**
     * Binary equality operation.
     * @param {function} left - The left operand function.
     * @param {function} right - The right operand function.
     * @param {Object} [context] - The context.
     * @returns {function} The binary equality function.
     */
    "binary=="(left: Function, right: Function, context?: any): Function;
    /**
     * Binary inequality operation.
     * @param {function} left - The left operand function.
     * @param {function} right - The right operand function.
     * @param {Object} [context] - The context.
     * @returns {function} The binary inequality function.
     */
    "binary!="(left: Function, right: Function, context?: any): Function;
    /**
     * Binary less-than operation.
     * @param {function} left - The left operand function.
     * @param {function} right - The right operand function.
     * @param {Object} [context] - The context.
     * @returns {function} The binary less-than function.
     */
    "binary<"(left: Function, right: Function, context?: any): Function;
    /**
     * Binary greater-than operation.
     * @param {function} left - The left operand function.
     * @param {function} right - The right operand function.
     * @param {Object} [context] - The context.
     * @returns {function} The binary greater-than function.
     */
    "binary>"(left: Function, right: Function, context?: any): Function;
    /**
     * Binary less-than-or-equal-to operation.
     * @param {function} left - The left operand function.
     * @param {function} right - The right operand function.
     * @param {Object} [context] - The context.
     * @returns {function} The binary less-than-or-equal-to function.
     */
    "binary<="(left: Function, right: Function, context?: any): Function;
    /**
     * Binary greater-than-or-equal-to operation.
     * @param {function} left - The left operand function.
     * @param {function} right - The right operand function.
     * @param {Object} [context] - The context.
     * @returns {function} The binary greater-than-or-equal-to function.
     */
    "binary>="(left: Function, right: Function, context?: any): Function;
    /**
     * Binary logical AND operation.
     * @param {function} left - The left operand function.
     * @param {function} right - The right operand function.
     * @param {Object} [context] - The context.
     * @returns {function} The binary logical AND function.
     */
    "binary&&"(left: Function, right: Function, context?: any): Function;
    /**
     * Binary logical OR operation.
     * @param {function} left - The left operand function.
     * @param {function} right - The right operand function.
     * @param {Object} [context] - The context.
     * @returns {function} The binary logical OR function.
     */
    "binary||"(left: Function, right: Function, context?: any): Function;
    /**
     * Ternary conditional operation.
     * @param {function} test - The test function.
     * @param {function} alternate - The alternate function.
     * @param {function} consequent - The consequent function.
     * @param {Object} [context] - The context.
     * @returns {function} The ternary conditional function.
     */
    "ternary?:"(test: Function, alternate: Function, consequent: Function, context?: any): Function;
    /**
     * Returns the value of a literal.
     * @param {*} value - The literal value.
     * @param {Object} [context] - The context.
     * @returns {function} The function returning the literal value.
     */
    value(value: any, context?: any): Function;
    /**
     * Returns the value of an identifier.
     * @param {string} name - The identifier name.
     * @param {Object} [context] - The context.
     * @param {boolean|1} [create] - Whether to create the identifier if it does not exist.
     * @returns {function} The function returning the identifier value.
     */
    identifier(name: string, context?: any, create?: boolean | 1): Function;
    /**
     * Returns the value of a computed member expression.
     * @param {function} left - The left operand function.
     * @param {function} right - The right operand function.
     * @param {Object} [context] - The context.
     * @param {boolean|1} [create] - Whether to create the member if it does not exist.
     * @returns {function} The function returning the computed member value.
     */
    computedMember(left: Function, right: Function, context?: any, create?: boolean | 1): Function;
    /**
     * Returns the value of a non-computed member expression.
     * @param {function} left - The left operand function.
     * @param {string} right - The right operand function.
     * @param {Object} [context] - The context.
     * @param {boolean|1} [create] - Whether to create the member if it does not exist.
     * @returns {function} The function returning the non-computed member value.
     */
    nonComputedMember(left: Function, right: string, context?: any, create?: boolean | 1): Function;
}
export type DecoratedASTNode = import("./ast/ast").ASTNode & {
    isPure: boolean | number;
    constant: boolean;
    toWatch: any[];
};
