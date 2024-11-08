import { AST } from "../ast/ast.js";
import { ASTType } from "../ast-type.js";
import { ASTInterpreter } from "../interpreter.js";

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
  constructor(lexer, $filter) {
    /** @type {AST} */
    this.ast = new AST(lexer);

    /** @type {ASTInterpreter} */
    this.astCompiler = new ASTInterpreter($filter);
  }

  /**
   *
   * @param {string} exp - Expression to be parsed
   * @returns {import("../parse.js").CompiledExpression}
   */
  parse(exp) {
    const { ast } = this.getAst(exp);
    const fn = this.astCompiler.compile(ast);
    fn.literal = isLiteral(ast);
    fn.constant = isConstant(ast);
    return fn;
  }

  /**
   * @param {string} exp - Expression to be parsed
   * @returns {ParsedAST}
   */
  getAst(exp) {
    exp = exp.trim();
    return {
      ast: this.ast.ast(exp),
    };
  }
}

function isLiteral(ast) {
  return (
    ast.body.length === 0 ||
    (ast.body.length === 1 &&
      (ast.body[0].expression.type === ASTType.Literal ||
        ast.body[0].expression.type === ASTType.ArrayExpression ||
        ast.body[0].expression.type === ASTType.ObjectExpression))
  );
}

function isConstant(ast) {
  return ast.constant;
}
