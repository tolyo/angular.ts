import { Lexer } from "./lexer";
import { Angular } from "../../../loader";
import { createInjector } from "../../di/injector";

describe("lexer", () => {
  let $rootScope;
  let $parse;
  let logs = [];

  beforeEach(() => {
    window.angular = new Angular();
    window.angular
      .module("myModule", ["ng"])
      .decorator("$exceptionHandler", function () {
        return (exception, cause) => {
          logs.push(exception);
          console.error(exception, cause);
        };
      });
    let injector = createInjector(["myModule"]);
    $parse = injector.get("$parse");
    $rootScope = injector.get("$rootScope");
  });

  describe("lexer", () => {
    let lex;

    beforeEach(() => {
      lex = function () {
        const lexer = new Lexer({});
        return lexer.lex.apply(lexer, arguments);
      };
    });

    it("should only match number chars with isNumber", () => {
      expect(Lexer.prototype.isNumber("0")).toBe(true);
      expect(Lexer.prototype.isNumber("")).toBeFalsy();
      expect(Lexer.prototype.isNumber(" ")).toBeFalsy();
      expect(Lexer.prototype.isNumber(0)).toBeFalsy();
      expect(Lexer.prototype.isNumber(false)).toBeFalsy();
      expect(Lexer.prototype.isNumber(true)).toBeFalsy();
      expect(Lexer.prototype.isNumber(undefined)).toBeFalsy();
      expect(Lexer.prototype.isNumber(null)).toBeFalsy();
    });

    it("should tokenize a string", () => {
      const tokens = lex("a.bc[22]+1.3|f:'a\\'c':\"d\\\"e\"");
      let i = 0;
      expect(tokens[i].index).toEqual(0);
      expect(tokens[i].text).toEqual("a");

      i++;
      expect(tokens[i].index).toEqual(1);
      expect(tokens[i].text).toEqual(".");

      i++;
      expect(tokens[i].index).toEqual(2);
      expect(tokens[i].text).toEqual("bc");

      i++;
      expect(tokens[i].index).toEqual(4);
      expect(tokens[i].text).toEqual("[");

      i++;
      expect(tokens[i].index).toEqual(5);
      expect(tokens[i].text).toEqual("22");
      expect(tokens[i].value).toEqual(22);
      expect(tokens[i].constant).toEqual(true);

      i++;
      expect(tokens[i].index).toEqual(7);
      expect(tokens[i].text).toEqual("]");

      i++;
      expect(tokens[i].index).toEqual(8);
      expect(tokens[i].text).toEqual("+");

      i++;
      expect(tokens[i].index).toEqual(9);
      expect(tokens[i].text).toEqual("1.3");
      expect(tokens[i].value).toEqual(1.3);
      expect(tokens[i].constant).toEqual(true);

      i++;
      expect(tokens[i].index).toEqual(12);
      expect(tokens[i].text).toEqual("|");

      i++;
      expect(tokens[i].index).toEqual(13);
      expect(tokens[i].text).toEqual("f");

      i++;
      expect(tokens[i].index).toEqual(14);
      expect(tokens[i].text).toEqual(":");

      i++;
      expect(tokens[i].index).toEqual(15);
      expect(tokens[i].value).toEqual("a'c");

      i++;
      expect(tokens[i].index).toEqual(21);
      expect(tokens[i].text).toEqual(":");

      i++;
      expect(tokens[i].index).toEqual(22);
      expect(tokens[i].value).toEqual('d"e');
    });

    it("should tokenize identifiers with spaces around dots the same as without spaces", () => {
      function getText(t) {
        return t.text;
      }
      const spaces = lex("foo. bar . baz").map(getText);
      const noSpaces = lex("foo.bar.baz").map(getText);

      expect(spaces).toEqual(noSpaces);
    });

    it("should use callback functions to know when an identifier is valid", () => {
      function getText(t) {
        return t.text;
      }
      const isIdentifierStart = jasmine.createSpy("start");
      const isIdentifierContinue = jasmine.createSpy("continue");
      isIdentifierStart.and.returnValue(true);
      const lex = new Lexer({
        isIdentifierStart,
        isIdentifierContinue,
      });

      isIdentifierContinue.and.returnValue(true);
      let tokens = lex.lex("πΣε").map(getText);
      expect(tokens).toEqual(["πΣε"]);

      isIdentifierContinue.and.returnValue(false);
      tokens = lex.lex("πΣε").map(getText);
      expect(tokens).toEqual(["π", "Σ", "ε"]);
    });

    it("should send the unicode characters and code points", () => {
      function getText(t) {
        return t.text;
      }
      const isIdentifierStart = jasmine.createSpy("start");
      const isIdentifierContinue = jasmine.createSpy("continue");
      isIdentifierStart.and.returnValue(true);
      isIdentifierContinue.and.returnValue(true);
      const lex = new Lexer({
        isIdentifierStart,
        isIdentifierContinue,
      });
      const tokens = lex.lex("\uD801\uDC37\uD852\uDF62\uDBFF\uDFFF");
      expect(isIdentifierStart).toHaveBeenCalledTimes(1);
      expect(isIdentifierStart.calls.argsFor(0)).toEqual([
        "\uD801\uDC37",
        0x10437,
      ]);
      expect(isIdentifierContinue).toHaveBeenCalledTimes(2);
      expect(isIdentifierContinue.calls.argsFor(0)).toEqual([
        "\uD852\uDF62",
        0x24b62,
      ]);
      expect(isIdentifierContinue.calls.argsFor(1)).toEqual([
        "\uDBFF\uDFFF",
        0x10ffff,
      ]);
    });

    it("should tokenize undefined", () => {
      const tokens = lex("undefined");
      const i = 0;
      expect(tokens[i].index).toEqual(0);
      expect(tokens[i].text).toEqual("undefined");
    });

    it("should tokenize quoted string", () => {
      const str = "['\\'', \"\\\"\"]";
      const tokens = lex(str);

      expect(tokens[1].index).toEqual(1);
      expect(tokens[1].value).toEqual("'");

      expect(tokens[3].index).toEqual(7);
      expect(tokens[3].value).toEqual('"');
    });

    it("should tokenize escaped quoted string", () => {
      const str = '"\\"\\n\\f\\r\\t\\v\\u00A0"';
      const tokens = lex(str);

      expect(tokens[0].value).toEqual('"\n\f\r\t\v\u00A0');
    });

    it("should tokenize unicode", () => {
      const tokens = lex('"\\u00A0"');
      expect(tokens.length).toEqual(1);
      expect(tokens[0].value).toEqual("\u00a0");
    });

    it("should ignore whitespace", () => {
      const tokens = lex("a \t \n \r b");
      expect(tokens[0].text).toEqual("a");
      expect(tokens[1].text).toEqual("b");
    });

    it("should tokenize relation and equality", () => {
      const tokens = lex("! == != < > <= >= === !==");
      expect(tokens[0].text).toEqual("!");
      expect(tokens[1].text).toEqual("==");
      expect(tokens[2].text).toEqual("!=");
      expect(tokens[3].text).toEqual("<");
      expect(tokens[4].text).toEqual(">");
      expect(tokens[5].text).toEqual("<=");
      expect(tokens[6].text).toEqual(">=");
      expect(tokens[7].text).toEqual("===");
      expect(tokens[8].text).toEqual("!==");
    });

    it("should tokenize logical and ternary", () => {
      const tokens = lex("&& || ? :");
      expect(tokens[0].text).toEqual("&&");
      expect(tokens[1].text).toEqual("||");
      expect(tokens[2].text).toEqual("?");
      expect(tokens[3].text).toEqual(":");
    });

    it("should tokenize statements", () => {
      const tokens = lex("a;b;");
      expect(tokens[0].text).toEqual("a");
      expect(tokens[1].text).toEqual(";");
      expect(tokens[2].text).toEqual("b");
      expect(tokens[3].text).toEqual(";");
    });

    it("should tokenize function invocation", () => {
      const tokens = lex("a()");
      expect(tokens.map((t) => t.text)).toEqual(["a", "(", ")"]);
    });

    it("should tokenize method invocation", () => {
      const tokens = lex("a.b.c (d) - e.f()");
      expect(tokens.map((t) => t.text)).toEqual([
        "a",
        ".",
        "b",
        ".",
        "c",
        "(",
        "d",
        ")",
        "-",
        "e",
        ".",
        "f",
        "(",
        ")",
      ]);
    });

    it("should tokenize number", () => {
      const tokens = lex("0.5");
      expect(tokens[0].value).toEqual(0.5);
    });

    it("should tokenize negative number", () => {
      let value = $rootScope.$eval("-0.5");
      expect(value).toEqual(-0.5);

      value = $rootScope.$eval("{a:-0.5}");
      expect(value).toEqual({ a: -0.5 });
    });

    it("should tokenize number with exponent", () => {
      let tokens = lex("0.5E-10");
      expect(tokens[0].value).toEqual(0.5e-10);
      expect($rootScope.$eval("0.5E-10")).toEqual(0.5e-10);

      tokens = lex("0.5E+10");
      expect(tokens[0].value).toEqual(0.5e10);
    });

    it("should throws exception for invalid exponent", () => {
      expect(() => {
        lex("0.5E-");
      }).toThrowError(/lexerr/);

      expect(() => {
        lex("0.5E-A");
      }).toThrowError(/lexerr/);
    });

    it("should tokenize number starting with a dot", () => {
      const tokens = lex(".5");
      expect(tokens[0].value).toEqual(0.5);
    });

    it("should throw error on invalid unicode", () => {
      expect(() => {
        lex("'\\u1''bla'");
      }).toThrowError(/lexerr/);
    });
  });
});
