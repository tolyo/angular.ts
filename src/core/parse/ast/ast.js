import { isAssignable } from "../interpreter.js";
import { ASTType } from "../ast-type.js";
import { minErr } from "../../../shared/utils.js";

const $parseMinErr = minErr("$parse");

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

// Keep this exported in case modification is required
/** @type {Map<string,any>} */
export const literals = new Map(
  Object.entries({
    true: true,
    false: false,
    null: null,
    undefined,
  }),
);

/**
 * @class
 */
export class AST {
  /**
   * @param {import('../lexer/lexer.js').Lexer} lexer - The lexer instance for tokenizing input
   */
  constructor(lexer) {
    /** @type {import('../lexer/lexer.js').Lexer} */
    this.lexer = lexer;
    this.selfReferential = {
      this: { type: ASTType.ThisExpression },
      $locals: { type: ASTType.LocalsExpression },
    };
  }

  /**
   * Parses the input text and generates an AST.
   * @param {string} text - The input text to parse.
   * @returns {ASTNode} The root node of the AST.
   */
  ast(text) {
    this.text = text;
    this.tokens = this.lexer.lex(text);
    const value = this.program();
    if (this.tokens.length !== 0) {
      this.throwError("is an unexpected token", this.tokens[0]);
    }
    return value;
  }

  /**
   * Parses a program.
   * @returns {ASTNode} The program node.
   */
  program() {
    const body = [];
    let hasMore = true;
    while (hasMore) {
      if (this.tokens.length > 0 && !this.peek("}", ")", ";", "]"))
        body.push(this.expressionStatement());
      if (!this.expect(";")) {
        hasMore = false;
      }
    }
    return { type: ASTType.Program, body };
  }

  /**
   * Parses an expression statement.
   * @returns {ASTNode} The expression statement node.
   */
  expressionStatement() {
    return {
      type: ASTType.ExpressionStatement,
      expression: this.filterChain(),
    };
  }

  /**
   * Parses a filter chain.
   * @returns {ASTNode} The filter chain node.
   */
  filterChain() {
    let left = this.assignment();
    while (this.expect("|")) {
      left = this.filter(left);
    }
    return left;
  }

  /**
   * Parses an assignment expression.
   * @returns {ASTNode} The assignment expression node.
   */
  assignment() {
    let result = this.ternary();
    if (this.expect("=")) {
      if (!isAssignable(result)) {
        throw $parseMinErr("lval", "Trying to assign a value to a non l-value");
      }

      result = {
        type: ASTType.AssignmentExpression,
        left: result,
        right: this.assignment(),
        operator: "=",
      };
    }
    return result;
  }

  /**
   * Parses a ternary expression.
   * @returns {ASTNode} The ternary expression node.
   */
  ternary() {
    const test = this.logicalOR();
    let alternate;
    let consequent;
    if (this.expect("?")) {
      alternate = this.assignment();
      if (this.consume(":")) {
        consequent = this.assignment();
        return {
          type: ASTType.ConditionalExpression,
          test,
          alternate,
          consequent,
        };
      }
    }
    return test;
  }

  /**
   * Parses a logical OR expression.
   * @returns {ASTNode} The logical OR expression node.
   */
  logicalOR() {
    let left = this.logicalAND();
    while (this.expect("||")) {
      left = {
        type: ASTType.LogicalExpression,
        operator: "||",
        left,
        right: this.logicalAND(),
      };
    }
    return left;
  }

  /**
   * Parses a logical AND expression.
   * @returns {ASTNode} The logical AND expression node.
   */
  logicalAND() {
    let left = this.equality();
    while (this.expect("&&")) {
      left = {
        type: ASTType.LogicalExpression,
        operator: "&&",
        left,
        right: this.equality(),
      };
    }
    return left;
  }

  /**
   * Parses an equality expression.
   * @returns {ASTNode} The equality expression node.
   */
  equality() {
    let left = this.relational();
    let token;
    while ((token = this.expect("==", "!=", "===", "!=="))) {
      left = {
        type: ASTType.BinaryExpression,
        operator: /** @type {import("../lexer/lexer.js").Token} */ (token).text,
        left,
        right: this.relational(),
      };
    }
    return left;
  }

  /**
   * Parses a relational expression.
   * @returns {ASTNode} The relational expression node.
   */
  relational() {
    let left = this.additive();
    let token;
    while ((token = this.expect("<", ">", "<=", ">="))) {
      left = {
        type: ASTType.BinaryExpression,
        operator: /** @type {import("../lexer/lexer.js").Token} */ (token).text,
        left,
        right: this.additive(),
      };
    }
    return left;
  }

  /**
   * Parses an additive expression.
   * @returns {ASTNode} The additive expression node.
   */
  additive() {
    let left = this.multiplicative();
    let token;
    while ((token = this.expect("+", "-"))) {
      left = {
        type: ASTType.BinaryExpression,
        operator: /** @type {import("../lexer/lexer.js").Token} */ (token).text,
        left,
        right: this.multiplicative(),
      };
    }
    return left;
  }

  /**
   * Parses a multiplicative expression.
   * @returns {ASTNode} The multiplicative expression node.
   */
  multiplicative() {
    let left = this.unary();
    let token;
    while ((token = this.expect("*", "/", "%"))) {
      left = {
        type: ASTType.BinaryExpression,
        operator: /** @type {import("../lexer/lexer.js").Token} */ (token).text,
        left,
        right: this.unary(),
      };
    }
    return left;
  }

  /**
   * Parses a unary expression.
   * @returns {ASTNode} The unary expression node.
   */
  unary() {
    let token;
    if ((token = this.expect("+", "-", "!"))) {
      return {
        type: ASTType.UnaryExpression,
        operator: /** @type {import("../lexer/lexer.js").Token} */ (token).text,
        prefix: true,
        argument: this.unary(),
      };
    }
    return this.primary();
  }

  /**
   * Parses a primary expression.
   * @returns {ASTNode} The primary expression node.
   */
  primary() {
    let primary;
    if (this.expect("(")) {
      primary = this.filterChain();
      this.consume(")");
    } else if (this.expect("[")) {
      primary = this.arrayDeclaration();
    } else if (this.expect("{")) {
      primary = this.object();
    } else if (
      Object.prototype.hasOwnProperty.call(
        this.selfReferential,
        /** @type {import("../lexer/lexer.js").Token} */ (this.peek()).text,
      )
    ) {
      primary = structuredClone(this.selfReferential[this.consume().text]);
    } else if (
      literals.has(
        /** @type {import("../lexer/lexer.js").Token} */ (this.peek()).text,
      )
    ) {
      primary = {
        type: ASTType.Literal,
        value: literals.get(this.consume().text),
      };
    } else if (
      /** @type {import("../lexer/lexer.js").Token} */ (this.peek()).identifier
    ) {
      primary = this.identifier();
    } else if (
      /** @type {import("../lexer/lexer.js").Token} */ (this.peek()).constant
    ) {
      primary = this.constant();
    } else {
      this.throwError(
        "not a primary expression",
        /** @type {import("../lexer/lexer.js").Token} */ (this.peek()),
      );
    }

    let next;
    while ((next = this.expect("(", "[", "."))) {
      if (
        /** @type {import("../lexer/lexer.js").Token} */ (next).text === "("
      ) {
        primary = {
          type: ASTType.CallExpression,
          callee: primary,
          arguments: this.parseArguments(),
        };
        this.consume(")");
      } else if (
        /** @type {import("../lexer/lexer.js").Token} */ (next).text === "["
      ) {
        primary = {
          type: ASTType.MemberExpression,
          object: primary,
          property: this.assignment(),
          computed: true,
        };
        this.consume("]");
      } else if (
        /** @type {import("../lexer/lexer.js").Token} */ (next).text === "."
      ) {
        primary = {
          type: ASTType.MemberExpression,
          object: primary,
          property: this.identifier(),
          computed: false,
        };
      } else {
        this.throwError("IMPOSSIBLE");
      }
    }
    return primary;
  }

  /**
   * Parses a filter.
   * @param {ASTNode} baseExpression - The base expression to apply the filter to.
   * @returns {ASTNode} The filter node.
   */
  filter(baseExpression) {
    /** @type {ASTNode[]} */
    const args = [baseExpression];
    const result = {
      type: ASTType.CallExpression,
      callee: this.identifier(),
      arguments: args,
      filter: true,
    };

    while (this.expect(":")) {
      args.push(this.assignment());
    }

    return result;
  }

  /**
   * Parses function arguments.
   * @returns {ASTNode[]} The arguments array.
   */
  parseArguments() {
    /** @type {ASTNode[]} */
    const args = [];
    if (this.peekToken().text !== ")") {
      do {
        args.push(this.filterChain());
      } while (this.expect(","));
    }
    return args;
  }

  /**
   * Parses an identifier.
   * @returns {ASTNode} The identifier node.
   */
  identifier() {
    const token = this.consume();
    if (!token.identifier) {
      this.throwError("is not a valid identifier", token);
    }
    return { type: ASTType.Identifier, name: token.text };
  }

  /**
   * Parses a constant.
   * @returns {ASTNode} The constant node.
   */
  constant() {
    // TODO check that it is a constant
    return { type: ASTType.Literal, value: this.consume().value };
  }

  /**
   * Parses an array declaration.
   * @returns {ASTNode} The array declaration node.
   */
  arrayDeclaration() {
    /** @type {ASTNode[]} */
    const elements = [];
    if (this.peekToken().text !== "]") {
      do {
        if (this.peek("]")) {
          // Support trailing commas per ES5.1.
          break;
        }
        elements.push(this.assignment());
      } while (this.expect(","));
    }
    this.consume("]");

    return { type: ASTType.ArrayExpression, elements };
  }

  /**
   * Parses an object.
   * @returns {ASTNode} The object node.
   */
  object() {
    /** @type {ASTNode[]} */
    const properties = [];
    /** @type {ASTNode} */
    let property;
    if (this.peekToken().text !== "}") {
      do {
        if (this.peek("}")) {
          // Support trailing commas per ES5.1.
          break;
        }
        property = { type: ASTType.Property, kind: "init" };
        if (
          /** @type {import("../lexer/lexer.js").Token} */ (this.peek())
            .constant
        ) {
          property.key = this.constant();
          property.computed = false;
          this.consume(":");
          property.value = this.assignment();
        } else if (
          /** @type {import("../lexer/lexer.js").Token} */ (this.peek())
            .identifier
        ) {
          property.key = this.identifier();
          property.computed = false;
          if (this.peek(":")) {
            this.consume(":");
            property.value = this.assignment();
          } else {
            property.value = property.key;
          }
        } else if (this.peek("[")) {
          this.consume("[");
          property.key = this.assignment();
          this.consume("]");
          property.computed = true;
          this.consume(":");
          property.value = this.assignment();
        } else {
          this.throwError(
            "invalid key",
            /** @type {import("../lexer/lexer.js").Token} */ (this.peek()),
          );
        }
        properties.push(property);
      } while (this.expect(","));
    }
    this.consume("}");

    return { type: ASTType.ObjectExpression, properties };
  }

  /**
   * Throws a syntax error.
   * @param {string} msg - The error message.
   * @param {import("../lexer/lexer.js").Token} [token] - The token that caused the error.
   */
  throwError(msg, token) {
    throw $parseMinErr(
      "syntax",
      "Syntax Error: Token '{0}' {1} at column {2} of the expression [{3}] starting at [{4}].",
      token.text,
      msg,
      token.index + 1,
      this.text,
      this.text.substring(token.index),
    );
  }

  /**
   * Consumes a token if it matches the expected type.
   * @param {string} [e1] - The expected token type.
   * @returns {import("../lexer/lexer.js").Token} The consumed token.
   */
  consume(e1) {
    if (this.tokens.length === 0) {
      throw $parseMinErr(
        "ueoe",
        "Unexpected end of expression: {0}",
        this.text,
      );
    }

    const token = this.expect(e1);
    if (!token) {
      this.throwError(
        `is unexpected, expecting [${e1}]`,
        /** @type {import("../lexer/lexer.js").Token} */ (this.peek()),
      );
    } else {
      return /** @type  {import("../lexer/lexer.js").Token} */ (token);
    }
  }

  /**
   * Returns the next token without consuming it.
   * @returns {import("../lexer/lexer.js").Token} The next token.
   */
  peekToken() {
    if (this.tokens.length === 0) {
      throw $parseMinErr(
        "ueoe",
        "Unexpected end of expression: {0}",
        this.text,
      );
    }
    return this.tokens[0];
  }

  /**
   * Checks if the next token matches any of the expected types.
   * @param {...string} [expected] - The expected token types.
   * @returns {import('../lexer/lexer.js').Token|boolean} The next token if it matches, otherwise false.
   */
  peek(...expected) {
    return this.peekAhead(0, ...expected);
  }

  /**
   * Checks if the token at the specified index matches any of the expected types.
   * @param {number} i - The index to check.
   * @param {...string} [expected] - The expected token types.
   * @returns {import("../lexer/lexer.js").Token|boolean} The token at the specified index if it matches, otherwise false.
   */
  peekAhead(i, ...expected) {
    if (this.tokens.length > i) {
      const token = this.tokens[i];
      const t = token.text;
      if (
        expected.includes(t) ||
        (!expected[0] && !expected[1] && !expected[2] && !expected[3])
      ) {
        return token;
      }
    }
    return false;
  }

  /**
   * Consumes the next token if it matches any of the expected types.
   * @param {...string} [expected] - The expected token types.
   * @returns {import("../lexer/lexer.js").Token|boolean} The consumed token if it matches, otherwise false.
   */
  expect(...expected) {
    const token = this.peek(...expected);
    if (token) {
      this.tokens.shift();
      return token;
    }
    return false;
  }
}
