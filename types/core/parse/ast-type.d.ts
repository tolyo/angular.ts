export type ASTType = number;
/**
 * @readonly
 * @enum {number}
 */
export const ASTType: Readonly<{
    Program: 1;
    ExpressionStatement: 2;
    AssignmentExpression: 3;
    ConditionalExpression: 4;
    LogicalExpression: 5;
    BinaryExpression: 6;
    UnaryExpression: 7;
    CallExpression: 8;
    MemberExpression: 9;
    Identifier: 10;
    Literal: 11;
    ArrayExpression: 12;
    Property: 13;
    ObjectExpression: 14;
    ThisExpression: 15;
    LocalsExpression: 16;
    NGValueParameter: 17;
}>;
