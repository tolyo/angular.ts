import { isDefined, minErr } from "../../../shared/utils.js";

const $parseMinErr = minErr("$parse");

const ESCAPE = {
  n: "\n",
  f: "\f",
  r: "\r",
  t: "\t",
  v: "\v",
  "'": "'",
  '"': '"',
};

const OPERATORS = new Set(
  "+ - * / % === !== == != < > <= >= && || ! = |".split(" "),
);

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
  constructor(options) {
    /** @type {LexerOptions} */
    this.options = options;
  }

  /**
   * Tokenizes the input text.
   * @param {string} text Input text to lex.
   * @returns {Array<Token>} Array of tokens.
   */
  lex(text) {
    this.text = text;
    this.index = 0;
    /** @type {Array<Token>} */
    this.tokens = [];

    while (this.index < this.text.length) {
      const ch = this.text.charAt(this.index);
      if (ch === '"' || ch === "'") {
        this.readString(ch);
      } else if (
        this.isNumber(ch) ||
        (ch === "." && this.isNumber(/** @type {string} */ (this.peek())))
      ) {
        this.readNumber();
      } else if (
        this.isIdentifierStart &&
        this.isIdentifierStart(this.peekMultichar())
      ) {
        this.readIdent();
      } else if (this.is(ch, "(){}[].,;:?")) {
        this.tokens.push({ index: this.index, text: ch });
        this.index++;
      } else if (this.isWhitespace(ch)) {
        this.index++;
      } else {
        const ch2 = ch + this.peek();
        const ch3 = ch2 + this.peek(2);
        const op1 = OPERATORS.has(ch);
        const op2 = OPERATORS.has(ch2);
        const op3 = OPERATORS.has(ch3);
        if (op1 || op2 || op3) {
          const token = op3 ? ch3 : op2 ? ch2 : ch;
          this.tokens.push({ index: this.index, text: token, operator: true });
          this.index += token.length;
        } else {
          this.throwError(
            "Unexpected next character ",
            this.index,
            this.index + 1,
          );
        }
      }
    }
    return this.tokens;
  }

  /**
   * Checks if a character is contained in a set of characters.
   * @param {string} ch Character to check.
   * @param {string} chars Set of characters.
   * @returns {boolean} True if character is in the set, false otherwise.
   */
  is(ch, chars) {
    return chars.indexOf(ch) !== -1;
  }

  /**
   * Peeks at the next character in the text.
   * @param {number} [i=1] Number of characters to peek.
   * @returns {string|false} Next character or false if end of text.
   */
  peek(i) {
    const num = i || 1;
    return this.index + num < this.text.length
      ? this.text.charAt(this.index + num)
      : false;
  }

  /**
   * Checks if a character is a number.
   * @param {string} ch Character to check.
   * @returns {boolean} True if character is a number, false otherwise.
   */
  isNumber(ch) {
    return ch >= "0" && ch <= "9" && typeof ch === "string";
  }

  /**
   * Checks if a character is whitespace.
   * @param {string} ch Character to check.
   * @returns {boolean} True if character is whitespace, false otherwise.
   */
  isWhitespace(ch) {
    return (
      ch === " " || ch === "\r" || ch === "\t" || ch === "\n" || ch === "\v"
    );
  }

  /**
   * Checks if a character is a valid identifier start.
   * @param {string} ch Character to check.
   * @returns {boolean} True if character is a valid identifier start, false otherwise.
   */
  isIdentifierStart(ch) {
    return this.options.isIdentifierStart
      ? this.options.isIdentifierStart(ch, this.codePointAt(ch))
      : (ch >= "a" && ch <= "z") ||
          (ch >= "A" && ch <= "Z") ||
          ch === "_" ||
          ch === "$";
  }

  /**
   * Checks if a character is a valid identifier continuation.
   * @param {string} ch Character to check.
   * @returns {boolean} True if character is a valid identifier continuation, false otherwise.
   */
  isIdentifierContinue(ch) {
    return this.options.isIdentifierContinue
      ? this.options.isIdentifierContinue(ch, this.codePointAt(ch))
      : (ch >= "a" && ch <= "z") ||
          (ch >= "A" && ch <= "Z") ||
          ch === "_" ||
          ch === "$" ||
          (ch >= "0" && ch <= "9");
  }

  /**
   * Converts a character to its Unicode code point.
   * @param {string} ch Character to convert.
   * @returns {number} Unicode code point.
   */
  codePointAt(ch) {
    if (ch.length === 1) return ch.charCodeAt(0);
    return (ch.charCodeAt(0) << 10) + ch.charCodeAt(1) - 0x35fdc00;
  }

  /**
   * Peeks at the next multicharacter sequence in the text.
   * @returns {string} Next multicharacter sequence.
   */
  peekMultichar() {
    const ch = this.text.charAt(this.index);
    const peek = this.peek();
    if (!peek) {
      return ch;
    }
    const cp1 = ch.charCodeAt(0);
    const cp2 = peek.charCodeAt(0);
    if (cp1 >= 0xd800 && cp1 <= 0xdbff && cp2 >= 0xdc00 && cp2 <= 0xdfff) {
      return ch + peek;
    }
    return ch;
  }

  /**
   * Checks if a character is an exponent operator.
   * @param {string} ch Character to check.
   * @returns {boolean} True if character is an exponent operator, false otherwise.
   */
  isExpOperator(ch) {
    return ch === "-" || ch === "+" || this.isNumber(ch);
  }

  /**
   * Throws a lexer error.
   * @param {string} error Error message.
   * @param {number} [start] Start index.
   * @param {number} [end] End index.
   * @throws {Error} Lexer error.
   */
  throwError(error, start, end) {
    end = end || this.index;
    const colStr = isDefined(start)
      ? `s ${start}-${this.index} [${this.text.substring(start, end)}]`
      : ` ${end}`;
    throw $parseMinErr(
      "lexerr",
      `Lexer Error: ${error} at column${colStr} in expression [${this.text}].`,
    );
  }

  /**
   * Reads and tokenizes a number from the text.
   * @return {void}
   */
  readNumber() {
    let number = "";
    const start = this.index;
    while (this.index < this.text.length) {
      const ch = this.text.charAt(this.index).toLowerCase();
      if (ch === "." || this.isNumber(ch)) {
        number += ch;
      } else {
        const peekCh = this.peek();
        if (ch === "e" && this.isExpOperator(/** @type {string} */ (peekCh))) {
          number += ch;
        } else if (
          this.isExpOperator(ch) &&
          peekCh &&
          this.isNumber(peekCh) &&
          number.charAt(number.length - 1) === "e"
        ) {
          number += ch;
        } else if (
          this.isExpOperator(ch) &&
          (!peekCh || !this.isNumber(peekCh)) &&
          number.charAt(number.length - 1) === "e"
        ) {
          this.throwError("Invalid exponent");
        } else {
          break;
        }
      }
      this.index++;
    }
    this.tokens.push({
      index: start,
      text: number,
      constant: true,
      value: Number(number),
    });
  }

  /**
   * Reads and tokenizes an identifier from the text.
   */
  readIdent() {
    const start = this.index;
    this.index += this.peekMultichar().length;
    while (this.index < this.text.length) {
      const ch = this.peekMultichar();
      if (this.isIdentifierContinue && !this.isIdentifierContinue(ch)) {
        break;
      }
      this.index += ch.length;
    }
    this.tokens.push({
      index: start,
      text: this.text.slice(start, this.index),
      identifier: true,
    });
  }

  /**
   * Reads and tokenizes a string from the text.
   * @param {string} quote Quote character used for the string.
   */
  readString(quote) {
    const start = this.index;
    let string = "";
    let escape = false;

    this.index++; // Skip opening quote

    while (this.index < this.text.length) {
      const ch = this.text[this.index];

      if (escape) {
        if (ch === "u") {
          // Handle unicode escapes
          // Simplified for brevity
          string += this.handleUnicodeEscape();
        } else {
          string += ESCAPE[ch] || ch;
        }
        escape = false;
      } else if (ch === "\\") {
        escape = true;
      } else if (ch === quote) {
        this.tokens.push({
          index: start,
          text: this.text.slice(start, this.index + 1),
          constant: true,
          value: string,
        });
        this.index++; // Skip closing quote
        return;
      } else {
        string += ch;
      }

      this.index++;
    }

    this.throwError("Unterminated quote", start);
  }

  /**
   * @returns {string}
   */
  handleUnicodeEscape() {
    const hex = this.text.substring(this.index + 1, this.index + 5);
    if (!hex.match(/[\da-f]{4}/i)) {
      this.throwError(`Invalid unicode escape [\\u${hex}]`);
    }
    this.index += 4; // Move index past the four hexadecimal digits
    return String.fromCharCode(parseInt(hex, 16));
  }
}
