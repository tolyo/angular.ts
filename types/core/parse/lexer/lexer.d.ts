/**
 * @typedef {Object} LexerOptions
 * @property {(ch: string, codePoint: number) => boolean} [isIdentifierStart] - Custom function to determine if a character is a valid identifier start.
 * @property {(ch: string, codePoint: number) => boolean} [isIdentifierContinue] - Custom function to determine if a character is a valid identifier continuation.
 */
/**
 * Represents a token produced by the lexer, which will be used by the AST to construct an abstract syntax tree.
 * @typedef {Object} Token
 * @property {number} index - Index of the token.
 * @property {string} text - Text of the token.
 * @property {boolean} [identifier] - Indicates if token is an identifier.
 * @property {boolean} [constant] - Indicates if token is a constant.
 * @property {string|number} [value] - Value of the token if it's a constant.
 * @property {boolean} [operator] - Indicates if token is an operator.
 */
/**
 * Represents a lexer that tokenizes input text. The Lexer takes the original expression string and returns an array of tokens parsed from that string.
 * For example, the string "a + b" would result in tokens for a, +, and b.
 */
export class Lexer {
    /**
     * Creates an instance of Lexer.
     * @param {LexerOptions} options - Lexer options.
     */
    constructor(options: LexerOptions);
    /** @type {LexerOptions} */
    options: LexerOptions;
    /**
     * Tokenizes the input text.
     * @param {string} text Input text to lex.
     * @returns {Array<Token>} Array of tokens.
     */
    lex(text: string): Array<Token>;
    text: string;
    index: number;
    /** @type {Array<Token>} */
    tokens: Array<Token>;
    /**
     * Checks if a character is contained in a set of characters.
     * @param {string} ch Character to check.
     * @param {string} chars Set of characters.
     * @returns {boolean} True if character is in the set, false otherwise.
     */
    is(ch: string, chars: string): boolean;
    /**
     * Peeks at the next character in the text.
     * @param {number} [i=1] Number of characters to peek.
     * @returns {string|false} Next character or false if end of text.
     */
    peek(i?: number): string | false;
    /**
     * Checks if a character is a number.
     * @param {string} ch Character to check.
     * @returns {boolean} True if character is a number, false otherwise.
     */
    isNumber(ch: string): boolean;
    /**
     * Checks if a character is whitespace.
     * @param {string} ch Character to check.
     * @returns {boolean} True if character is whitespace, false otherwise.
     */
    isWhitespace(ch: string): boolean;
    /**
     * Checks if a character is a valid identifier start.
     * @param {string} ch Character to check.
     * @returns {boolean} True if character is a valid identifier start, false otherwise.
     */
    isIdentifierStart(ch: string): boolean;
    /**
     * Checks if a character is a valid identifier continuation.
     * @param {string} ch Character to check.
     * @returns {boolean} True if character is a valid identifier continuation, false otherwise.
     */
    isIdentifierContinue(ch: string): boolean;
    /**
     * Converts a character to its Unicode code point.
     * @param {string} ch Character to convert.
     * @returns {number} Unicode code point.
     */
    codePointAt(ch: string): number;
    /**
     * Peeks at the next multicharacter sequence in the text.
     * @returns {string} Next multicharacter sequence.
     */
    peekMultichar(): string;
    /**
     * Checks if a character is an exponent operator.
     * @param {string} ch Character to check.
     * @returns {boolean} True if character is an exponent operator, false otherwise.
     */
    isExpOperator(ch: string): boolean;
    /**
     * Throws a lexer error.
     * @param {string} error Error message.
     * @param {number} [start] Start index.
     * @param {number} [end] End index.
     * @throws {Error} Lexer error.
     */
    throwError(error: string, start?: number, end?: number): void;
    /**
     * Reads and tokenizes a number from the text.
     * @return {void}
     */
    readNumber(): void;
    /**
     * Reads and tokenizes an identifier from the text.
     */
    readIdent(): void;
    /**
     * Reads and tokenizes a string from the text.
     * @param {string} quote Quote character used for the string.
     */
    readString(quote: string): void;
    /**
     * @returns {string}
     */
    handleUnicodeEscape(): string;
}
export type LexerOptions = {
    /**
     * - Custom function to determine if a character is a valid identifier start.
     */
    isIdentifierStart?: (ch: string, codePoint: number) => boolean;
    /**
     * - Custom function to determine if a character is a valid identifier continuation.
     */
    isIdentifierContinue?: (ch: string, codePoint: number) => boolean;
};
/**
 * Represents a token produced by the lexer, which will be used by the AST to construct an abstract syntax tree.
 */
export type Token = {
    /**
     * - Index of the token.
     */
    index: number;
    /**
     * - Text of the token.
     */
    text: string;
    /**
     * - Indicates if token is an identifier.
     */
    identifier?: boolean;
    /**
     * - Indicates if token is a constant.
     */
    constant?: boolean;
    /**
     * - Value of the token if it's a constant.
     */
    value?: string | number;
    /**
     * - Indicates if token is an operator.
     */
    operator?: boolean;
};
