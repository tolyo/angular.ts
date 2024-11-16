import { isDefined, isFunction, isObject } from "../../shared/utils";
import { ASTType } from "./ast-type";

export const PURITY_ABSOLUTE = 1;
export const PURITY_RELATIVE = 2;

export class ASTInterpreter {
  /**
   * @param {function(any):any} $filter
   */
  constructor($filter) {
    this.$filter = $filter;
  }

  /**
   * Compiles the AST into a function.
   * @param {import("./ast/ast").ASTNode} ast - The AST to compile.
   * @returns {import("./parse").CompiledExpression}
   */
  compile(ast) {
    let decoratedNode = findConstantAndWatchExpressions(ast, this.$filter);
    /** @type {import("./ast/ast").ASTNode} */
    let assignable;
    /** @type {import("./parse").CompiledExpression} */
    let assign;
    if ((assignable = assignableAST(decoratedNode))) {
      assign = /** @type {import("./parse").CompiledExpression} */ (
        this.recurse(assignable)
      );
    }
    const toWatch = getInputs(decoratedNode.body);
    let inputs;
    if (toWatch) {
      inputs = [];
      for (const [key, watch] of Object.entries(toWatch)) {
        const input = /** @type {import("./parse").CompiledExpression} */ (
          this.recurse(watch)
        );
        input.isPure = watch.isPure;
        watch.input = input;
        inputs.push(input);
        watch.watchId = key;
      }
    }
    const expressions = [];
    decoratedNode.body.forEach((expression) => {
      expressions.push(this.recurse(expression.expression));
    });

    /** @type {import("./parse").CompiledExpression} */
    const fn =
      decoratedNode.body.length === 0
        ? () => {}
        : decoratedNode.body.length === 1
          ? expressions[0]
          : function (scope, locals) {
              let lastValue;
              expressions.forEach((exp) => {
                lastValue = exp(scope, locals);
              });
              return lastValue;
            };
    if (assign) {
      fn.assign = (scope, value, locals) => assign(scope, locals, value);
    }
    if (inputs) {
      fn.inputs = inputs;
    }
    fn.decoratedNode = decoratedNode;
    return fn;
  }

  /**
   * Recurses the AST nodes.
   * @param {import("./ast/ast").ASTNode} ast - The AST node.
   * @param {Object} [context] - The context.
   * @param {boolean|1} [create] - The create flag.
   * @returns {import("./parse").CompiledExpressionFunction} The recursive function.
   */
  recurse(ast, context, create) {
    let left;
    let right;
    const self = this;
    let args;
    switch (ast.type) {
      case ASTType.Literal:
        return this.value(ast.value, context);
      case ASTType.UnaryExpression:
        right = this.recurse(ast.argument);
        return this[`unary${ast.operator}`](right, context);
      case ASTType.BinaryExpression:
        left = this.recurse(ast.left);
        right = this.recurse(ast.right);
        return this[`binary${ast.operator}`](left, right, context);
      case ASTType.LogicalExpression:
        left = this.recurse(ast.left);
        right = this.recurse(ast.right);
        return this[`binary${ast.operator}`](left, right, context);
      case ASTType.ConditionalExpression:
        return this["ternary?:"](
          this.recurse(ast.test),
          this.recurse(ast.alternate),
          this.recurse(ast.consequent),
          context,
        );
      case ASTType.Identifier:
        return self.identifier(ast.name, context, create);
      case ASTType.MemberExpression:
        left = this.recurse(ast.object, false, !!create);
        if (!ast.computed) {
          right = ast.property.name;
        }
        if (ast.computed) right = this.recurse(ast.property);
        return ast.computed
          ? this.computedMember(
              left,
              /** @type {function } */ (right),
              context,
              create,
            )
          : this.nonComputedMember(
              left,
              /** @type {string } */ (right),
              context,
              create,
            );
      case ASTType.CallExpression:
        args = [];
        ast.arguments.forEach((expr) => {
          args.push(self.recurse(expr));
        });
        if (ast.filter) right = this.$filter(ast.callee.name);
        if (!ast.filter) right = this.recurse(ast.callee, true);
        return ast.filter
          ? function (scope, locals, assign) {
              const values = [];
              for (let i = 0; i < args.length; ++i) {
                const res = args[i](scope, locals, assign);
                values.push(isFunction(res) ? res() : res);
              }
              const value = () => right.apply(undefined, values);
              return context
                ? { context: undefined, name: undefined, value }
                : value;
            }
          : function (scope, locals, assign) {
              const rhs = right(scope, locals, assign);
              let value;
              if (rhs.value != null && isFunction(rhs.value)) {
                const values = [];
                for (let i = 0; i < args.length; ++i) {
                  const res = args[i](scope, locals, assign);
                  values.push(isFunction(res) ? res() : res);
                }
                value = rhs.value.apply(rhs.context, values);
              }
              return context ? { value } : value;
            };
      case ASTType.AssignmentExpression:
        left = this.recurse(ast.left, true, 1);
        right = this.recurse(ast.right);
        return function (scope, locals, assign) {
          const lhs = left(scope, locals, assign);
          const rhs = right(scope, locals, assign);
          lhs.context[lhs.name] = rhs;
          return context ? { value: rhs } : rhs;
        };
      case ASTType.ArrayExpression:
        args = [];
        ast.elements.forEach((expr) => {
          args.push(self.recurse(expr));
        });
        return function (scope, locals, assign) {
          const value = [];
          for (let i = 0; i < args.length; ++i) {
            value.push(args[i](scope, locals, assign));
          }
          return context ? { value } : value;
        };
      case ASTType.ObjectExpression:
        args = [];
        ast.properties.forEach((property) => {
          if (property.computed) {
            args.push({
              key: self.recurse(property.key),
              computed: true,
              value: self.recurse(property.value),
            });
          } else {
            args.push({
              key:
                property.key.type === ASTType.Identifier
                  ? property.key.name
                  : `${property.key.value}`,
              computed: false,
              value: self.recurse(property.value),
            });
          }
        });
        return function (scope, locals, assign) {
          const value = {};
          for (let i = 0; i < args.length; ++i) {
            if (args[i].computed) {
              value[args[i].key(scope, locals, assign)] = args[i].value(
                scope,
                locals,
                assign,
              );
            } else {
              value[args[i].key] = args[i].value(scope, locals, assign);
            }
          }
          return context ? { value } : value;
        };
      case ASTType.ThisExpression:
        return function (scope) {
          return context ? { value: scope } : scope;
        };
      case ASTType.LocalsExpression:
        return function (scope, locals) {
          return context ? { value: locals } : locals;
        };
      case ASTType.NGValueParameter:
        return function (scope, locals, assign) {
          return context ? { value: assign } : assign;
        };
    }
  }

  /**
   * Unary plus operation.
   * @param {function} argument - The argument function.
   * @param {Object} [context] - The context.
   * @returns {function} The unary plus function.
   */
  "unary+"(argument, context) {
    return function (scope, locals, assign) {
      let arg = argument(scope, locals, assign);
      if (isDefined(arg)) {
        arg = +arg;
      } else {
        arg = 0;
      }
      return context ? { value: arg } : arg;
    };
  }

  /**
   * Unary minus operation.
   * @param {function} argument - The argument function.
   * @param {Object} [context] - The context.
   * @returns {function} The unary minus function.
   */
  "unary-"(argument, context) {
    return function (scope, locals, assign) {
      let arg = argument(scope, locals, assign);
      if (isDefined(arg)) {
        arg = -arg;
      } else {
        arg = -0;
      }
      return context ? { value: arg } : arg;
    };
  }

  /**
   * Unary negation operation.
   * @param {function} argument - The argument function.
   * @param {Object} [context] - The context.
   * @returns {function} The unary negation function.
   */
  "unary!"(argument, context) {
    return function (scope, locals, assign) {
      const arg = !argument(scope, locals, assign);
      return context ? { value: arg } : arg;
    };
  }

  /**
   * Binary plus operation.
   * @param {function} left - The left operand function.
   * @param {function} right - The right operand function.
   * @param {Object} [context] - The context.
   * @returns {function} The binary plus function.
   */
  "binary+"(left, right, context) {
    return function (scope, locals, assign) {
      const lhs = left(scope, locals, assign);
      const rhs = right(scope, locals, assign);
      const arg = plusFn(lhs, rhs);
      return context ? { value: arg } : arg;
    };
  }

  /**
   * Binary minus operation.
   * @param {function} left - The left operand function.
   * @param {function} right - The right operand function.
   * @param {Object} [context] - The context.
   * @returns {function} The binary minus function.
   */
  "binary-"(left, right, context) {
    return function (scope, locals, assign) {
      const lhs = left(scope, locals, assign);
      const rhs = right(scope, locals, assign);
      const arg = (isDefined(lhs) ? lhs : 0) - (isDefined(rhs) ? rhs : 0);
      return context ? { value: arg } : arg;
    };
  }

  /**
   * Binary multiplication operation.
   * @param {function} left - The left operand function.
   * @param {function} right - The right operand function.
   * @param {Object} [context] - The context.
   * @returns {function} The binary multiplication function.
   */
  "binary*"(left, right, context) {
    return function (scope, locals, assign) {
      const arg = left(scope, locals, assign) * right(scope, locals, assign);
      return context ? { value: arg } : arg;
    };
  }

  "binary/"(left, right, context) {
    return function (scope, locals, assign) {
      const arg = left(scope, locals, assign) / right(scope, locals, assign);
      return context ? { value: arg } : arg;
    };
  }

  /**
   * Binary division operation.
   * @param {function} left - The left operand function.
   * @param {function} right - The right operand function.
   * @param {Object} [context] - The context.
   * @returns {function} The binary division function.
   */
  "binary%"(left, right, context) {
    return function (scope, locals, assign) {
      const arg = left(scope, locals, assign) % right(scope, locals, assign);
      return context ? { value: arg } : arg;
    };
  }

  /**
   * Binary strict equality operation.
   * @param {function} left - The left operand function.
   * @param {function} right - The right operand function.
   * @param {Object} [context] - The context.
   * @returns {function} The binary strict equality function.
   */
  "binary==="(left, right, context) {
    return function (scope, locals, assign) {
      const arg = left(scope, locals, assign) === right(scope, locals, assign);
      return context ? { value: arg } : arg;
    };
  }

  /**
   * Binary strict inequality operation.
   * @param {function} left - The left operand function.
   * @param {function} right - The right operand function.
   * @param {Object} [context] - The context.
   * @returns {function} The binary strict inequality function.
   */
  "binary!=="(left, right, context) {
    return function (scope, locals, assign) {
      const arg = left(scope, locals, assign) !== right(scope, locals, assign);
      return context ? { value: arg } : arg;
    };
  }

  /**
   * Binary equality operation.
   * @param {function} left - The left operand function.
   * @param {function} right - The right operand function.
   * @param {Object} [context] - The context.
   * @returns {function} The binary equality function.
   */
  "binary=="(left, right, context) {
    return function (scope, locals, assign) {
      const arg = left(scope, locals, assign) == right(scope, locals, assign);
      return context ? { value: arg } : arg;
    };
  }

  /**
   * Binary inequality operation.
   * @param {function} left - The left operand function.
   * @param {function} right - The right operand function.
   * @param {Object} [context] - The context.
   * @returns {function} The binary inequality function.
   */
  "binary!="(left, right, context) {
    return function (scope, locals, assign) {
      const arg = left(scope, locals, assign) != right(scope, locals, assign);
      return context ? { value: arg } : arg;
    };
  }

  /**
   * Binary less-than operation.
   * @param {function} left - The left operand function.
   * @param {function} right - The right operand function.
   * @param {Object} [context] - The context.
   * @returns {function} The binary less-than function.
   */
  "binary<"(left, right, context) {
    return function (scope, locals, assign) {
      const arg = left(scope, locals, assign) < right(scope, locals, assign);
      return context ? { value: arg } : arg;
    };
  }

  /**
   * Binary greater-than operation.
   * @param {function} left - The left operand function.
   * @param {function} right - The right operand function.
   * @param {Object} [context] - The context.
   * @returns {function} The binary greater-than function.
   */
  "binary>"(left, right, context) {
    return function (scope, locals, assign) {
      const arg = left(scope, locals, assign) > right(scope, locals, assign);
      return context ? { value: arg } : arg;
    };
  }

  /**
   * Binary less-than-or-equal-to operation.
   * @param {function} left - The left operand function.
   * @param {function} right - The right operand function.
   * @param {Object} [context] - The context.
   * @returns {function} The binary less-than-or-equal-to function.
   */
  "binary<="(left, right, context) {
    return function (scope, locals, assign) {
      const arg = left(scope, locals, assign) <= right(scope, locals, assign);
      return context ? { value: arg } : arg;
    };
  }

  /**
   * Binary greater-than-or-equal-to operation.
   * @param {function} left - The left operand function.
   * @param {function} right - The right operand function.
   * @param {Object} [context] - The context.
   * @returns {function} The binary greater-than-or-equal-to function.
   */
  "binary>="(left, right, context) {
    return function (scope, locals, assign) {
      const arg = left(scope, locals, assign) >= right(scope, locals, assign);
      return context ? { value: arg } : arg;
    };
  }
  /**
   * Binary logical AND operation.
   * @param {function} left - The left operand function.
   * @param {function} right - The right operand function.
   * @param {Object} [context] - The context.
   * @returns {function} The binary logical AND function.
   */
  "binary&&"(left, right, context) {
    return (scope, locals, assign) => {
      const arg = left(scope, locals, assign) && right(scope, locals, assign);
      return context ? { value: arg } : arg;
    };
  }

  /**
   * Binary logical OR operation.
   * @param {function} left - The left operand function.
   * @param {function} right - The right operand function.
   * @param {Object} [context] - The context.
   * @returns {function} The binary logical OR function.
   */
  "binary||"(left, right, context) {
    return function (scope, locals, assign) {
      const arg = left(scope, locals, assign) || right(scope, locals, assign);
      return context ? { value: arg } : arg;
    };
  }

  /**
   * Ternary conditional operation.
   * @param {function} test - The test function.
   * @param {function} alternate - The alternate function.
   * @param {function} consequent - The consequent function.
   * @param {Object} [context] - The context.
   * @returns {function} The ternary conditional function.
   */
  "ternary?:"(test, alternate, consequent, context) {
    return function (scope, locals, assign) {
      const arg = test(scope, locals, assign)
        ? alternate(scope, locals, assign)
        : consequent(scope, locals, assign);
      return context ? { value: arg } : arg;
    };
  }

  /**
   * Returns the value of a literal.
   * @param {*} value - The literal value.
   * @param {Object} [context] - The context.
   * @returns {function} The function returning the literal value.
   */
  value(value, context) {
    return function () {
      return context ? { context: undefined, name: undefined, value } : value;
    };
  }

  /**
   * Returns the value of an identifier.
   * @param {string} name - The identifier name.
   * @param {Object} [context] - The context.
   * @param {boolean|1} [create] - Whether to create the identifier if it does not exist.
   * @returns {function} The function returning the identifier value.
   */
  identifier(name, context, create) {
    return function (scope, locals) {
      const base = locals && name in locals ? locals : scope;
      if (create && create !== 1 && base && base[name] == null) {
        base[name] = {};
      }
      const value = base ? base[name] : undefined;
      if (context) {
        return { context: base, name, value };
      }
      return value;
    };
  }

  /**
   * Returns the value of a computed member expression.
   * @param {function} left - The left operand function.
   * @param {function} right - The right operand function.
   * @param {Object} [context] - The context.
   * @param {boolean|1} [create] - Whether to create the member if it does not exist.
   * @returns {function} The function returning the computed member value.
   */
  computedMember(left, right, context, create) {
    return function (scope, locals, assign) {
      const lhs = left(scope, locals, assign);
      let rhs;
      let value;
      if (lhs != null) {
        rhs = right(scope, locals, assign);
        rhs = getStringValue(rhs);
        if (create && create !== 1) {
          if (lhs && !lhs[rhs]) {
            lhs[rhs] = {};
          }
        }
        value = lhs[rhs];
      }
      if (context) {
        return { context: lhs, name: rhs, value };
      }
      return value;
    };
  }

  /**
   * Returns the value of a non-computed member expression.
   * @param {function} left - The left operand function.
   * @param {string} right - The right operand function.
   * @param {Object} [context] - The context.
   * @param {boolean|1} [create] - Whether to create the member if it does not exist.
   * @returns {function} The function returning the non-computed member value.
   */
  nonComputedMember(left, right, context, create) {
    return function (scope, locals, assign) {
      const lhs = left(scope, locals, assign);
      if (create && create !== 1) {
        if (lhs && lhs[right] == null) {
          lhs[right] = {};
        }
      }
      const value = lhs != null ? lhs[right] : undefined;
      if (context) {
        return { context: lhs, name: right, value };
      }
      return value;
    };
  }
}

/**
 * @typedef {import("./ast/ast").ASTNode & {
 *  isPure: boolean|number,
 *  constant: boolean,
 *  toWatch: Array,
 * }} DecoratedASTNode
 */

/**
 * Decorates AST with constant, toWatch, and isPure properties
 * @param {import("./ast/ast").ASTNode} ast
 * @param {function(any):any} $filter
 * @param {boolean|1|2} [parentIsPure]
 * @returns {DecoratedASTNode}
 */
function findConstantAndWatchExpressions(ast, $filter, parentIsPure) {
  let allConstants;
  let argsToWatch;
  let isStatelessFilter;
  let decoratedNode = /** @type  {DecoratedASTNode} */ (ast);
  let decoratedLeft,
    decoratedRight,
    decoratedTest,
    decoratedAlternate,
    decoratedConsequent,
    decoratedObject,
    decoratedProperty,
    decoratedKey;
  const astIsPure = (decoratedNode.isPure = isPure(ast, parentIsPure));

  switch (ast.type) {
    case ASTType.Program:
      allConstants = true;
      decoratedNode.body.forEach((expr) => {
        let decorated = findConstantAndWatchExpressions(
          expr.expression,
          $filter,
          astIsPure,
        );
        allConstants = allConstants && decorated.constant;
      });
      decoratedNode.constant = allConstants;
      return decoratedNode;
    case ASTType.Literal:
      decoratedNode.constant = true;
      decoratedNode.toWatch = [];
      return decoratedNode;
    case ASTType.UnaryExpression:
      var decorated = findConstantAndWatchExpressions(
        decoratedNode.argument,
        $filter,
        astIsPure,
      );
      decoratedNode.constant = decorated.constant;
      decoratedNode.toWatch = decorated.toWatch;
      return decoratedNode;
    case ASTType.BinaryExpression:
      decoratedLeft = findConstantAndWatchExpressions(
        decoratedNode.left,
        $filter,
        astIsPure,
      );
      decoratedRight = findConstantAndWatchExpressions(
        decoratedNode.right,
        $filter,
        astIsPure,
      );
      decoratedNode.constant =
        decoratedLeft.constant && decoratedRight.constant;
      decoratedNode.toWatch = decoratedLeft.toWatch.concat(
        decoratedRight.toWatch,
      );
      return decoratedNode;
    case ASTType.LogicalExpression:
      decoratedLeft = findConstantAndWatchExpressions(
        decoratedNode.left,
        $filter,
        astIsPure,
      );
      decoratedRight = findConstantAndWatchExpressions(
        decoratedNode.right,
        $filter,
        astIsPure,
      );
      decoratedNode.constant =
        decoratedLeft.constant && decoratedRight.constant;
      decoratedNode.toWatch = decoratedNode.constant ? [] : [ast];
      return decoratedNode;
    case ASTType.ConditionalExpression:
      decoratedTest = findConstantAndWatchExpressions(
        ast.test,
        $filter,
        astIsPure,
      );
      decoratedAlternate = findConstantAndWatchExpressions(
        ast.alternate,
        $filter,
        astIsPure,
      );
      decoratedConsequent = findConstantAndWatchExpressions(
        ast.consequent,
        $filter,
        astIsPure,
      );
      decoratedNode.constant =
        decoratedTest.constant &&
        decoratedAlternate.constant &&
        decoratedConsequent.constant;
      decoratedNode.toWatch = decoratedNode.constant ? [] : [ast];
      return decoratedNode;
    case ASTType.Identifier:
      decoratedNode.constant = false;
      decoratedNode.toWatch = [ast];
      return decoratedNode;
    case ASTType.MemberExpression:
      decoratedObject = findConstantAndWatchExpressions(
        ast.object,
        $filter,
        astIsPure,
      );
      if (ast.computed) {
        decoratedProperty = findConstantAndWatchExpressions(
          ast.property,
          $filter,
          astIsPure,
        );
      }
      decoratedNode.constant =
        decoratedObject.constant &&
        (!decoratedNode.computed || decoratedProperty.constant);
      decoratedNode.toWatch = decoratedNode.constant ? [] : [ast];
      return decoratedNode;
    case ASTType.CallExpression:
      isStatelessFilter = ast.filter
        ? isStateless($filter, ast.callee.name)
        : false;
      allConstants = isStatelessFilter;
      argsToWatch = [];
      ast.arguments.forEach((expr) => {
        decorated = findConstantAndWatchExpressions(expr, $filter, astIsPure);
        allConstants = allConstants && decorated.constant;
        argsToWatch.push.apply(argsToWatch, decorated.toWatch);
      });
      decoratedNode.constant = allConstants;
      decoratedNode.toWatch = isStatelessFilter ? argsToWatch : [decoratedNode];
      return decoratedNode;
    case ASTType.AssignmentExpression:
      decoratedLeft = findConstantAndWatchExpressions(
        ast.left,
        $filter,
        astIsPure,
      );
      decoratedRight = findConstantAndWatchExpressions(
        ast.right,
        $filter,
        astIsPure,
      );
      decoratedNode.constant =
        decoratedLeft.constant && decoratedRight.constant;
      decoratedNode.toWatch = [decoratedNode];
      return decoratedNode;
    case ASTType.ArrayExpression:
      allConstants = true;
      argsToWatch = [];
      ast.elements.forEach((expr) => {
        decorated = findConstantAndWatchExpressions(expr, $filter, astIsPure);
        allConstants = allConstants && decorated.constant;
        argsToWatch.push.apply(argsToWatch, decorated.toWatch);
      });
      decoratedNode.constant = allConstants;
      decoratedNode.toWatch = argsToWatch;
      return decoratedNode;
    case ASTType.ObjectExpression:
      allConstants = true;
      argsToWatch = [];
      ast.properties.forEach((property) => {
        decorated = findConstantAndWatchExpressions(
          property.value,
          $filter,
          astIsPure,
        );
        allConstants = allConstants && decorated.constant;
        argsToWatch.push.apply(argsToWatch, decorated.toWatch);
        if (property.computed) {
          // `{[key]: value}` implicitly does `key.toString()` which may be non-pure
          decoratedKey = findConstantAndWatchExpressions(
            property.key,
            $filter,
            false,
          );
          allConstants = allConstants && decoratedKey.constant;
          argsToWatch.push.apply(argsToWatch, decoratedKey.toWatch);
        }
      });
      decoratedNode.constant = allConstants;
      decoratedNode.toWatch = argsToWatch;
      return decoratedNode;
    case ASTType.ThisExpression:
      decoratedNode.constant = false;
      decoratedNode.toWatch = [];
      return decoratedNode;
    case ASTType.LocalsExpression:
      decoratedNode.constant = false;
      decoratedNode.toWatch = [];
      return decoratedNode;
  }
}

/**
 * Converts a single expression AST node into an assignment expression if the expression is assignable.
 *
 * @param {import("./ast/ast").ASTNode} ast
 * @returns {import("./ast/ast").ASTNode}
 */
function assignableAST(ast) {
  if (ast.body.length === 1 && isAssignable(ast.body[0].expression)) {
    return {
      type: ASTType.AssignmentExpression,
      left: ast.body[0].expression,
      right: { type: ASTType.NGValueParameter },
      operator: "=",
    };
  }
}

function plusFn(l, r) {
  if (typeof l === "undefined" || isObject(l)) return r;
  if (typeof r === "undefined" || isObject(r)) return l;
  return l + r;
}

/**
 *
 * @param {import("./ast/ast").ASTNode[]} body
 * @returns {any}
 */
function getInputs(body) {
  if (body.length !== 1) return;
  const lastExpression = /** @type {DecoratedASTNode} */ (body[0].expression);
  const candidate = lastExpression.toWatch;
  if (candidate.length !== 1) return candidate;
  return candidate[0] !== lastExpression ? candidate : undefined;
}

/**
 * Detect nodes which could depend on non-shallow state of objects
 * @param {import("./ast/ast").ASTNode} node
 * @param {boolean|PURITY_ABSOLUTE|PURITY_RELATIVE} parentIsPure
 * @returns {boolean|PURITY_ABSOLUTE|PURITY_RELATIVE}
 */
function isPure(node, parentIsPure) {
  switch (node.type) {
    // Computed members might invoke a stateful toString()
    case ASTType.MemberExpression:
      if (node.computed) {
        return false;
      }
      break;

    // Unary always convert to primitive
    case ASTType.UnaryExpression:
      return PURITY_ABSOLUTE;

    // The binary + operator can invoke a stateful toString().
    case ASTType.BinaryExpression:
      return node.operator !== "+" ? PURITY_ABSOLUTE : false;

    // Functions / filters probably read state from within objects
    case ASTType.CallExpression:
      return false;
  }

  return undefined === parentIsPure ? PURITY_RELATIVE : parentIsPure;
}

function isStateless($filter, filterName) {
  const fn = $filter(filterName);
  return !fn.$stateful;
}

/**
 * Converts parameter to  strings property name for use  as keys in an object.
 * Any non-string object, including a number, is typecasted into a string via the toString method.
 * {@link https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Operators/Property_accessors#Property_names}
 *
 * @param {!any} name
 * @returns {string}
 */
function getStringValue(name) {
  return `${name}`;
}

/**
 * @param {import("./ast/ast").ASTNode} ast
 * @returns {boolean}
 */
export function isAssignable(ast) {
  return (
    ast.type === ASTType.Identifier || ast.type === ASTType.MemberExpression
  );
}
