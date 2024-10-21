/**
 * @typedef {Object} ASTNode
 * @property {number} type - The type of the AST node.
 * @property {string} [name] - The name of the identifier.
 * @property {string} [kind] - The kind of the property (e.g., 'init').
 * @property {*} [value] - The value of the node if it is a literal.
 * @property {ASTNode[]} [elements] - The elements of an array node.
 * @property {ASTNode[]} [properties] - The properties of an object node.
 * @property {ASTNode} [key] - The key of an object property.
 * @property {ASTNode} [value] - The value of an object property.
 * @property {ASTNode} [left] - The left-hand side of a binary expression.
 * @property {ASTNode} [right] - The right-hand side of a binary expression.
 * @property {ASTNode} [argument] - The argument of a unary expression.
 * @property {ASTNode} [test] - The test expression of a conditional expression.
 * @property {ASTNode} [alternate] - The alternate expression of a conditional expression.
 * @property {ASTNode} [consequent] - The consequent expression of a conditional expression.
 * @property {ASTNode[]} [body] - The body of a program or block statement.
 * @property {ASTNode} [expression] - The expression of an expression statement.
 * @property {ASTNode} [callee] - The callee of a call expression.
 * @property {ASTNode[]} [arguments] - The arguments of a call expression.
 * @property {boolean} [prefix] - Indicates if a unary operator is a prefix.
 * @property {ASTNode} [object] - The object of a member expression.
 * @property {ASTNode} [property] - The property of a member expression.
 * @property {boolean} [computed] - Indicates if a member expression is computed.
 * @property {string} [operator] - The operator of a binary or logical expression.
 * @property {boolean} [filter]
 */
/** @type {Map<string,any>} */
export const literals: Map<string, any>;
/**
 * @class
 */
export class AST {
    /**
     * @param {import('../lexer/lexer.js').Lexer} lexer - The lexer instance for tokenizing input
     */
    constructor(lexer: import("../lexer/lexer.js").Lexer);
    /** @type {import('../lexer/lexer.js').Lexer} */
    lexer: import("../lexer/lexer.js").Lexer;
    selfReferential: {
        this: {
            type: 15;
        };
        $locals: {
            type: 16;
        };
    };
    /**
     * Parses the input text and generates an AST.
     * @param {string} text - The input text to parse.
     * @returns {ASTNode} The root node of the AST.
     */
    ast(text: string): ASTNode;
    text: string;
    tokens: import("../lexer/lexer.js").Token[];
    /**
     * Parses a program.
     * @returns {ASTNode} The program node.
     */
    program(): ASTNode;
    /**
     * Parses an expression statement.
     * @returns {ASTNode} The expression statement node.
     */
    expressionStatement(): ASTNode;
    /**
     * Parses a filter chain.
     * @returns {ASTNode} The filter chain node.
     */
    filterChain(): ASTNode;
    /**
     * Parses an assignment expression.
     * @returns {ASTNode} The assignment expression node.
     */
    assignment(): ASTNode;
    /**
     * Parses a ternary expression.
     * @returns {ASTNode} The ternary expression node.
     */
    ternary(): ASTNode;
    /**
     * Parses a logical OR expression.
     * @returns {ASTNode} The logical OR expression node.
     */
    logicalOR(): ASTNode;
    /**
     * Parses a logical AND expression.
     * @returns {ASTNode} The logical AND expression node.
     */
    logicalAND(): ASTNode;
    /**
     * Parses an equality expression.
     * @returns {ASTNode} The equality expression node.
     */
    equality(): ASTNode;
    /**
     * Parses a relational expression.
     * @returns {ASTNode} The relational expression node.
     */
    relational(): ASTNode;
    /**
     * Parses an additive expression.
     * @returns {ASTNode} The additive expression node.
     */
    additive(): ASTNode;
    /**
     * Parses a multiplicative expression.
     * @returns {ASTNode} The multiplicative expression node.
     */
    multiplicative(): ASTNode;
    /**
     * Parses a unary expression.
     * @returns {ASTNode} The unary expression node.
     */
    unary(): ASTNode;
    /**
     * Parses a primary expression.
     * @returns {ASTNode} The primary expression node.
     */
    primary(): ASTNode;
    /**
     * Parses a filter.
     * @param {ASTNode} baseExpression - The base expression to apply the filter to.
     * @returns {ASTNode} The filter node.
     */
    filter(baseExpression: ASTNode): ASTNode;
    /**
     * Parses function arguments.
     * @returns {ASTNode[]} The arguments array.
     */
    parseArguments(): ASTNode[];
    /**
     * Parses an identifier.
     * @returns {ASTNode} The identifier node.
     */
    identifier(): ASTNode;
    /**
     * Parses a constant.
     * @returns {ASTNode} The constant node.
     */
    constant(): ASTNode;
    /**
     * Parses an array declaration.
     * @returns {ASTNode} The array declaration node.
     */
    arrayDeclaration(): ASTNode;
    /**
     * Parses an object.
     * @returns {ASTNode} The object node.
     */
    object(): ASTNode;
    /**
     * Throws a syntax error.
     * @param {string} msg - The error message.
     * @param {import("../lexer/lexer.js").Token} [token] - The token that caused the error.
     */
    throwError(msg: string, token?: import("../lexer/lexer.js").Token): void;
    /**
     * Consumes a token if it matches the expected type.
     * @param {string} [e1] - The expected token type.
     * @returns {import("../lexer/lexer.js").Token} The consumed token.
     */
    consume(e1?: string): import("../lexer/lexer.js").Token;
    /**
     * Returns the next token without consuming it.
     * @returns {import("../lexer/lexer.js").Token} The next token.
     */
    peekToken(): import("../lexer/lexer.js").Token;
    /**
     * Checks if the next token matches any of the expected types.
     * @param {...string} [expected] - The expected token types.
     * @returns {import('../lexer/lexer.js').Token|boolean} The next token if it matches, otherwise false.
     */
    peek(...expected?: string[]): import("../lexer/lexer.js").Token | boolean;
    /**
     * Checks if the token at the specified index matches any of the expected types.
     * @param {number} i - The index to check.
     * @param {...string} [expected] - The expected token types.
     * @returns {import("../lexer/lexer.js").Token|boolean} The token at the specified index if it matches, otherwise false.
     */
    peekAhead(i: number, ...expected?: string[]): import("../lexer/lexer.js").Token | boolean;
    /**
     * Consumes the next token if it matches any of the expected types.
     * @param {...string} [expected] - The expected token types.
     * @returns {import("../lexer/lexer.js").Token|boolean} The consumed token if it matches, otherwise false.
     */
    expect(...expected?: string[]): import("../lexer/lexer.js").Token | boolean;
}
export type ASTNode = {
    /**
     * - The type of the AST node.
     */
    type: number;
    /**
     * - The name of the identifier.
     */
    name?: string;
    /**
     * - The kind of the property (e.g., 'init').
     */
    kind?: string;
    /**
     * - The value of the node if it is a literal.
     */
    value?: any;
    /**
     * - The elements of an array node.
     */
    elements?: ASTNode[];
    /**
     * - The properties of an object node.
     */
    properties?: ASTNode[];
    /**
     * - The key of an object property.
     */
    key?: ASTNode;
    /**
     * - The left-hand side of a binary expression.
     */
    left?: ASTNode;
    /**
     * - The right-hand side of a binary expression.
     */
    right?: ASTNode;
    /**
     * - The argument of a unary expression.
     */
    argument?: ASTNode;
    /**
     * - The test expression of a conditional expression.
     */
    test?: ASTNode;
    /**
     * - The alternate expression of a conditional expression.
     */
    alternate?: ASTNode;
    /**
     * - The consequent expression of a conditional expression.
     */
    consequent?: ASTNode;
    /**
     * - The body of a program or block statement.
     */
    body?: ASTNode[];
    /**
     * - The expression of an expression statement.
     */
    expression?: ASTNode;
    /**
     * - The callee of a call expression.
     */
    callee?: ASTNode;
    /**
     * - The arguments of a call expression.
     */
    arguments?: ASTNode[];
    /**
     * - Indicates if a unary operator is a prefix.
     */
    prefix?: boolean;
    /**
     * - The object of a member expression.
     */
    object?: ASTNode;
    /**
     * - The property of a member expression.
     */
    property?: ASTNode;
    /**
     * - Indicates if a member expression is computed.
     */
    computed?: boolean;
    /**
     * - The operator of a binary or logical expression.
     */
    operator?: string;
    filter?: boolean;
};
