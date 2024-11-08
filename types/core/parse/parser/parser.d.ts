/**
 * @typedef {Object} ParsedAST
 * @property {import("../ast/ast.js").ASTNode} ast - AST representation of expression
 */
/**
 * @constructor
 */
export class Parser {
    /**
     *
     * @param {import('../lexer/lexer.js').Lexer} lexer
     * @param {function(any):any} $filter
     */
    constructor(lexer: import("../lexer/lexer.js").Lexer, $filter: (arg0: any) => any);
    /** @type {AST} */
    ast: AST;
    /** @type {ASTInterpreter} */
    astCompiler: ASTInterpreter;
    /**
     *
     * @param {string} exp - Expression to be parsed
     * @returns {import("../parse.js").CompiledExpression}
     */
    parse(exp: string): import("../parse.js").CompiledExpression;
    /**
     * @param {string} exp - Expression to be parsed
     * @returns {ParsedAST}
     */
    getAst(exp: string): ParsedAST;
}
export type ParsedAST = {
    /**
     * - AST representation of expression
     */
    ast: import("../ast/ast.js").ASTNode;
};
import { AST } from "../ast/ast.js";
import { ASTInterpreter } from "../interpreter.js";
