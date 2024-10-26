import { createInjector } from "../di/injector";
import { Angular } from "../../loader";
import { wait } from "../../shared/test-utils";

describe("$interpolate", () => {
  let $interpolate, $injector, $rootScope, $sce;

  beforeEach(() => {
    window.angular = new Angular();
    $injector = createInjector(["ng"]);
    $interpolate = $injector.get("$interpolate");
    $rootScope = $injector.get("$rootScope");
    $sce = $injector.get("$sce");
  });

  it("produces an identity function for static content", function () {
    const interp = $interpolate("hello");
    expect(interp instanceof Function).toBe(true);
    expect(interp()).toEqual("hello");
  });

  it("evaluates a single expression", function () {
    const interp = $interpolate("{{anAttr}}");
    expect(interp({ anAttr: "42" })).toEqual("42");
  });

  it("passes through ill-defined interpolations", function () {
    const interp = $interpolate("why u no }}work{{");
    expect(interp({})).toEqual("why u no }}work{{");
  });

  it("evaluates many expressions", function () {
    const interp = $interpolate("First {{anAttr}}, then {{anotherAttr}}!");
    expect(interp({ anAttr: "42", anotherAttr: "43" })).toEqual(
      "First 42, then 43!",
    );
  });

  it("turns nulls into empty strings", function () {
    const interp = $interpolate("{{aNull}}");
    expect(interp({ aNull: null })).toEqual("");
  });

  it("turns undefineds into empty strings", function () {
    const interp = $interpolate("{{anUndefined}}");
    expect(interp({})).toEqual("");
  });

  it("turns numbers into strings", function () {
    const interp = $interpolate("{{aNumber}}");
    expect(interp({ aNumber: 42 })).toEqual("42");
  });

  it("turns booleans into strings", function () {
    const interp = $interpolate("{{aBoolean}}");
    expect(interp({ aBoolean: true })).toEqual("true");
  });

  it("turns arrays into JSON strings", function () {
    const interp = $interpolate("{{anArray}}");
    expect(interp({ anArray: [1, 2, [3]] })).toEqual("[1,2,[3]]");
  });

  it("turns objects into JSON strings", function () {
    const interp = $interpolate("{{anObject}}");
    expect(interp({ anObject: { a: 1, b: "2" } })).toEqual('{"a":1,"b":"2"}');
  });

  it("unescapes escaped sequences", function () {
    const interp = $interpolate("\\{\\{expr\\}\\} {{expr}} \\{\\{expr\\}\\}");
    expect(interp({ expr: "value" })).toEqual("{{expr}} value {{expr}}");
  });

  it("does not return function when flagged and no expressions", function () {
    const interp = $interpolate("static content only", true);
    expect(interp).toBeFalsy();
  });

  it("returns function when flagged and has expressions", function () {
    const interp = $interpolate("has an {{expr}}", true);
    expect(interp).not.toBeFalsy();
  });

  it("should return the interpolation object when there are no bindings and textOnly is undefined", () => {
    const interpolateFn = $interpolate("some text");

    expect(interpolateFn.exp).toBe("some text");
    expect(interpolateFn.expressions).toEqual([]);

    expect(interpolateFn({})).toBe("some text");
  });

  it("should return undefined when there are no bindings and textOnly is set to true", () => {
    expect($interpolate("some text", true)).toBeUndefined();
  });

  it("should return undefined when there are bindings and strict is set to true", () => {
    expect($interpolate("test {{foo}}", false, null, true)({})).toBeUndefined();
  });

  it("should suppress falsy objects", () => {
    expect($interpolate("{{undefined}}")({})).toEqual("");
    expect($interpolate("{{null}}")({})).toEqual("");
    expect($interpolate("{{a.b}}")({})).toEqual("");
  });

  it("should jsonify objects", () => {
    expect($interpolate("{{ {} }}")({})).toEqual("{}");
    expect($interpolate("{{ true }}")({})).toEqual("true");
    expect($interpolate("{{ false }}")({})).toEqual("false");
  });

  it("should use custom toString when present", () => {
    const context = {
      a: {
        toString() {
          return "foo";
        },
      },
    };

    expect($interpolate("{{ a }}")(context)).toEqual("foo");
  });

  it("should NOT use toString on array objects", () => {
    expect($interpolate("{{a}}")({ a: [] })).toEqual("[]");
  });

  it("should NOT use toString on Date objects", () => {
    const date = new Date(2014, 10, 10);
    expect($interpolate("{{a}}")({ a: date })).toBe(JSON.stringify(date));
    expect($interpolate("{{a}}")({ a: date })).not.toEqual(date.toString());
  });

  it("should return interpolation function", () => {
    const interpolateFn = $interpolate("Hello {{name}}!");

    expect(interpolateFn.exp).toBe("Hello {{name}}!");
    expect(interpolateFn.expressions).toEqual(["name"]);

    const scope = $rootScope.$new();
    scope.name = "Bubu";

    expect(interpolateFn(scope)).toBe("Hello Bubu!");
  });

  it("should ignore undefined model", () => {
    expect($interpolate("Hello {{'World'}}{{foo}}")({})).toBe("Hello World");
  });

  it("should interpolate with undefined context", () => {
    expect($interpolate("Hello, world!{{bloop}}")()).toBe("Hello, world!");
  });

  describe("watching", () => {
    it("should be watchable with any input types", () => {
      let lastVal;
      $rootScope.$watch($interpolate("{{i}}"), (val) => {
        lastVal = val;
      });
      $rootScope.$apply();
      expect(lastVal).toBe("");

      $rootScope.i = null;
      $rootScope.$apply();
      expect(lastVal).toBe("");

      $rootScope.i = "";
      $rootScope.$apply();
      expect(lastVal).toBe("");

      $rootScope.i = 0;
      $rootScope.$apply();
      expect(lastVal).toBe("0");

      $rootScope.i = [0];
      $rootScope.$apply();
      expect(lastVal).toBe("[0]");

      $rootScope.i = { a: 1, b: 2 };
      $rootScope.$apply();
      expect(lastVal).toBe('{"a":1,"b":2}');
    });

    it("should be watchable with literal values", () => {
      let lastVal;
      $rootScope.$watch(
        $interpolate('{{1}}{{"2"}}{{true}}{{[false]}}{{ {a: 2} }}'),
        (val) => {
          lastVal = val;
        },
      );
      $rootScope.$apply();
      expect(lastVal).toBe('12true[false]{"a":2}');
    });

    it("should respect one-time bindings for each individual expression", () => {
      const calls = [];
      $rootScope.$watch($interpolate("{{::a}} {{::s}}"), (val) => {
        calls.push(val);
      });

      $rootScope.$apply();
      expect(calls.length).toBe(1);
      expect(calls).toEqual([" "]);

      $rootScope.a = "a";
      $rootScope.$apply();
      expect(calls.length).toBe(2);
      expect(calls[1]).toBe("a ");

      $rootScope.a = "b";
      $rootScope.$apply();
      expect(calls.length).toBe(2);

      $rootScope.s = "str!";
      $rootScope.$apply();
      expect(calls.length).toBe(3);
      expect(calls[2]).toBe("a str!");
    });

    it("should respect one-time bindings for literals", () => {
      const calls = [];
      $rootScope.$watch($interpolate("{{ ::{x: x} }}"), (val) => {
        calls.push(val);
      });

      $rootScope.$apply();
      expect(calls.pop()).toBe("{}");

      $rootScope.$apply("x = 1");
      expect(calls.pop()).toBe('{"x":1}');

      $rootScope.$apply("x = 2");
      expect(calls.pop()).toBeUndefined();
    });

    // TODO these tests shoudl be revereds
    // Calling interpolation with scope should CREATE watches on scope
    it("should stop watching strings with no expressions after first execution", async () => {
      const spy = jasmine.createSpy();
      $rootScope.$watch($interpolate("foo")(), spy);
      $rootScope.foo = "foo";
      await wait();
      expect(spy).toHaveBeenCalledWith("foo", undefined, $rootScope);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it("should stop watching strings with only constant expressions after first execution", () => {
      const spy = jasmine.createSpy();
      let res = $interpolate("foo {{42}}")($rootScope);
      $rootScope.$watch(res, spy);

      expect(spy).toHaveBeenCalledWith("foo 42", "foo 42", $rootScope);
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe("interpolation escaping", () => {
    let obj;
    let $compile;
    beforeEach(() => {
      obj = { foo: "Hello", bar: "World" };
      $compile = $injector.get("$compile");
    });

    it("uses a watch delegate", function () {
      const interp = $interpolate("has an {{expr}}");
      expect(interp.$$watchDelegate).toBeDefined();
    });

    it("correctly returns new value", async () => {
      const interp = $interpolate("{{expr}}");
      $rootScope.$watch("expr", () => {});
      $rootScope.expr = 42;
      await wait();
      expect(interp($rootScope)).toEqual("42");
    });

    it("should support escaping interpolation signs", () => {
      expect($interpolate("\\{\\{")(obj)).toBe("{{");
      expect($interpolate("{{foo}} \\{\\{bar\\}\\}")(obj)).toBe(
        "Hello {{bar}}",
      );
      expect($interpolate("\\{\\{foo\\}\\} {{bar}}")(obj)).toBe(
        "{{foo}} World",
      );
    });

    it("should unescape multiple expressions", () => {
      expect($interpolate("\\{\\{foo\\}\\}\\{\\{bar\\}\\} {{foo}}")(obj)).toBe(
        "{{foo}}{{bar}} Hello",
      );
      expect($interpolate("{{foo}}\\{\\{foo\\}\\}\\{\\{bar\\}\\}")(obj)).toBe(
        "Hello{{foo}}{{bar}}",
      );
      expect($interpolate("\\{\\{foo\\}\\}{{foo}}\\{\\{bar\\}\\}")(obj)).toBe(
        "{{foo}}Hello{{bar}}",
      );
      expect(
        $interpolate("{{foo}}\\{\\{foo\\}\\}{{bar}}\\{\\{bar\\}\\}{{foo}}")(
          obj,
        ),
      ).toBe("Hello{{foo}}World{{bar}}Hello");
    });

    it("should support escaping custom interpolation start/end symbols", () => {
      angular
        .module("customInterpolationApp", ["ng"])
        .config(function ($interpolateProvider) {
          $interpolateProvider.startSymbol("[[");
          $interpolateProvider.endSymbol("]]");
        });

      $injector = createInjector(["customInterpolationApp"]);
      $interpolate = $injector.get("$interpolate");

      expect($interpolate("[[foo]] \\[\\[bar\\]\\]")(obj)).toBe(
        "Hello [[bar]]",
      );
    });

    it("should unescape incomplete escaped expressions", () => {
      expect($interpolate("\\{\\{foo{{foo}}")(obj)).toBe("{{fooHello");
      expect($interpolate("\\}\\}foo{{foo}}")(obj)).toBe("}}fooHello");
      expect($interpolate("foo{{foo}}\\{\\{")(obj)).toBe("fooHello{{");
      expect($interpolate("foo{{foo}}\\}\\}")(obj)).toBe("fooHello}}");
    });

    it("should not unescape markers within expressions", () => {
      expect($interpolate('{{"\\\\{\\\\{Hello, world!\\\\}\\\\}"}}')(obj)).toBe(
        "\\{\\{Hello, world!\\}\\}",
      );
      expect($interpolate('{{"\\{\\{Hello, world!\\}\\}"}}')(obj)).toBe(
        "{{Hello, world!}}",
      );
      expect(() => {
        $interpolate("{{\\{\\{foo\\}\\}}}")(obj);
      }).toThrowError(/Unexpected next character  at columns 0-0/);
    });

    it("allows configuring start and end symbols", function () {
      const injector = createInjector([
        "ng",
        function ($interpolateProvider) {
          $interpolateProvider.startSymbol("FOO").endSymbol("OOF");
        },
      ]);
      const $interpolate = injector.get("$interpolate");
      expect($interpolate.startSymbol()).toEqual("FOO");
      expect($interpolate.endSymbol()).toEqual("OOF");
    });

    it("works with start and end symbols that differ from default", function () {
      const injector = createInjector([
        "ng",
        function ($interpolateProvider) {
          $interpolateProvider.startSymbol("FOO").endSymbol("OOF");
        },
      ]);
      const $interpolate = injector.get("$interpolate");
      const interpFn = $interpolate("FOOmyExprOOF");
      expect(interpFn({ myExpr: 42 })).toEqual("42");
    });

    it("does not work with default symbols when reconfigured", function () {
      const injector = createInjector([
        "ng",
        function ($interpolateProvider) {
          $interpolateProvider.startSymbol("FOO").endSymbol("OOF");
        },
      ]);
      const $interpolate = injector.get("$interpolate");
      const interpFn = $interpolate("{{myExpr}}");
      expect(interpFn({ myExpr: 42 })).toEqual("{{myExpr}}");
    });

    it("supports unescaping for reconfigured symbols", function () {
      const injector = createInjector([
        "ng",
        function ($interpolateProvider) {
          $interpolateProvider.startSymbol("FOO").endSymbol("OOF");
        },
      ]);
      const $interpolate = injector.get("$interpolate");
      const interpFn = $interpolate("\\F\\O\\OmyExpr\\O\\O\\F");
      expect(interpFn({})).toEqual("FOOmyExprOOF");
    });

    // This test demonstrates that the web-server is responsible for escaping every single instance
    // of interpolation start/end markers in an expression which they do not wish to evaluate,
    // because AngularJS will not protect them from being evaluated (due to the added compleity
    // and maintenance burden of context-sensitive escaping)
    it("should evaluate expressions between escaped start/end symbols", () => {
      expect($interpolate("\\{\\{Hello, {{bar}}!\\}\\}")(obj)).toBe(
        "{{Hello, World!}}",
      );
    });
  });

  describe("interpolation callbacks", () => {
    it("does not require a callback", async () => {
      let text;
      $rootScope.expr = 42;
      const interp = $interpolate("{{expr}}");

      text = interp($rootScope);

      expect(text).toEqual("42");
    });

    it("correctly invokes callback when interpolated value changes", async () => {
      let counter = 0;

      const interp = $interpolate("{{expr}}");

      interp($rootScope, (val) => {
        counter++;
      });

      $rootScope.expr = 42;
      await wait();
      expect(counter).toEqual(1);

      $rootScope.expr++;
      await wait();
      expect(counter).toEqual(2);
    });

    it("returns currently interpolated text", async () => {
      let text;
      $rootScope.expr = 42;
      const interp = $interpolate("{{expr}}");

      text = interp($rootScope, (val) => {
        text = val;
      });

      expect(text).toEqual("42");
    });

    it("invokes callback with newly interpolated text", async () => {
      let text;
      const interp = $interpolate("{{expr}}");

      interp($rootScope, (val) => {
        text = val;
      });

      $rootScope.expr = 42;
      await wait();
      expect(text).toEqual("42");
    });
  });

  describe("interpolating in a trusted context", () => {
    let sce;

    beforeEach(() => {
      angular
        .module("customInterpolationApp", ["ng"])
        .config(function ($sceProvider) {
          $sceProvider.enabled(true);
        });

      $injector = createInjector(["customInterpolationApp"]);
      $interpolate = $injector.get("$interpolate");
      $rootScope = $injector.get("$rootScope");
      sce = $injector.get("$sce");
    });

    it("should NOT interpolate non-trusted expressions", () => {
      const scope = $rootScope.$new();
      scope.foo = "foo";

      expect(() => {
        $interpolate("{{foo}}", true, sce.CSS)(scope);
      }).toThrowError(/Can't interpolate/);
    });

    it("should interpolate trusted expressions in a regular context", () => {
      const foo = sce.trustAsCss("foo");
      expect($interpolate("{{foo}}", true)({ foo })).toBe("foo");
    });

    it("should interpolate trusted expressions in a specific trustedContext", () => {
      const foo = sce.trustAsCss("foo");
      expect($interpolate("{{foo}}", true, sce.CSS)({ foo })).toBe("foo");
    });

    // The concatenation of trusted values does not necessarily result in a trusted value.  (For
    // instance, you can construct evil JS code by putting together pieces of JS strings that are by
    // themselves safe to execute in isolation). Therefore, some contexts disable it, such as CSS.
    it("should NOT interpolate trusted expressions with multiple parts", () => {
      const foo = sce.trustAsCss("foo");
      const bar = sce.trustAsCss("bar");
      expect(() =>
        $interpolate("{{foo}}{{bar}}", true, sce.CSS)({ foo, bar }),
      ).toThrowError(/Error while interpolating/);
    });
  });

  describe("provider", () => {
    beforeEach(() => {
      angular
        .module("customInterpolationApp", ["ng"])
        .config(function ($interpolateProvider) {
          $interpolateProvider.startSymbol("--");
          $interpolateProvider.endSymbol("--");
        });

      $injector = createInjector(["customInterpolationApp"]);
      $interpolate = $injector.get("$interpolate");
    });

    it("should not get confused with same markers", () => {
      expect($interpolate("---").expressions).toEqual([]);
      expect($interpolate("----")({})).toEqual("");
      expect($interpolate("--1--")({})).toEqual("1");
    });
  });

  describe("parseBindings", () => {
    it("should Parse Text With No Bindings", () => {
      expect($interpolate("a").expressions).toEqual([]);
    });

    it("should Parse Empty Text", () => {
      expect($interpolate("").expressions).toEqual([]);
    });

    it("should Parse Inner Binding", () => {
      const interpolateFn = $interpolate("a{{b}}C");
      const { expressions } = interpolateFn;
      expect(expressions).toEqual(["b"]);
      expect(interpolateFn({ b: 123 })).toEqual("a123C");
    });

    it("should Parse Ending Binding", () => {
      const interpolateFn = $interpolate("a{{b}}");
      const { expressions } = interpolateFn;
      expect(expressions).toEqual(["b"]);
      expect(interpolateFn({ b: 123 })).toEqual("a123");
    });

    it("should Parse Begging Binding", () => {
      const interpolateFn = $interpolate("{{b}}c");
      const { expressions } = interpolateFn;
      expect(expressions).toEqual(["b"]);
      expect(interpolateFn({ b: 123 })).toEqual("123c");
    });

    it("should Parse Loan Binding", () => {
      const interpolateFn = $interpolate("{{b}}");
      const { expressions } = interpolateFn;
      expect(expressions).toEqual(["b"]);
      expect(interpolateFn({ b: 123 })).toEqual("123");
    });

    it("should Parse Two Bindings", () => {
      const interpolateFn = $interpolate("{{b}}{{c}}");
      const { expressions } = interpolateFn;
      expect(expressions).toEqual(["b", "c"]);
      expect(interpolateFn({ b: 111, c: 222 })).toEqual("111222");
    });

    it("should Parse Two Bindings With Text In Middle", () => {
      const interpolateFn = $interpolate("{{b}}x{{c}}");
      const { expressions } = interpolateFn;
      expect(expressions).toEqual(["b", "c"]);
      expect(interpolateFn({ b: 111, c: 222 })).toEqual("111x222");
    });

    it("should Parse Multiline", () => {
      const interpolateFn = $interpolate('"X\nY{{A\n+B}}C\nD"');
      const { expressions } = interpolateFn;
      expect(expressions).toEqual(["A\n+B"]);
      expect(interpolateFn({ A: "aa", B: "bb" })).toEqual('"X\nYaabbC\nD"');
    });
  });

  describe("isTrustedContext", () => {
    it("should NOT interpolate a multi-part expression when isTrustedContext is RESOURCE_URL", () => {
      const isTrustedContext = $sce.RESOURCE_URL;
      expect(() => {
        $interpolate("constant/{{var}}", true, isTrustedContext)("val");
      }).toThrowError(/Can't interpolate:/);
      expect(() => {
        $interpolate("{{var}}/constant", true, isTrustedContext)("val");
      }).toThrowError(/Can't interpolate:/);
      expect(() => {
        $interpolate("{{foo}}{{bar}}", true, isTrustedContext)("val");
      }).toThrowError(/Can't interpolate:/);
    });

    it("should interpolate a multi-part expression when isTrustedContext is false", () => {
      expect($interpolate("some/{{id}}")({})).toEqual("some/");
      expect($interpolate("some/{{id}}")({ id: 1 })).toEqual("some/1");
      expect($interpolate("{{foo}}{{bar}}")({ foo: 1, bar: 2 })).toEqual("12");
    });

    it("should interpolate a multi-part expression when isTrustedContext is URL", () => {
      expect($interpolate("some/{{id}}", true, $sce.URL)({})).toEqual("some/");
      expect($interpolate("some/{{id}}", true, $sce.URL)({ id: 1 })).toEqual(
        "some/1",
      );
      expect(
        $interpolate("{{foo}}{{bar}}", true, $sce.URL)({ foo: 1, bar: 2 }),
      ).toEqual("12");
    });

    it("should interpolate and sanitize a multi-part expression when isTrustedContext is URL", () => {
      expect($interpolate("some/{{id}}", true, $sce.URL)({})).toEqual("some/");
      expect(
        $interpolate("some/{{id}}", true, $sce.URL)({ id: "javascript:" }),
      ).toEqual("some/javascript:");
      expect(
        $interpolate(
          "{{foo}}{{bar}}",
          true,
          $sce.URL,
        )({ foo: "javascript:", bar: "javascript:" }),
      ).toEqual("unsafe:javascript:javascript:");
    });
  });

  describe("startSymbol", () => {
    beforeEach(() => {
      angular
        .module("customInterpolationApp", ["ng"])
        .config(function ($interpolateProvider) {
          expect($interpolateProvider.startSymbol()).toBe("{{");
          $interpolateProvider.startSymbol("((");
        });

      $injector = createInjector(["customInterpolationApp"]);
      $interpolate = $injector.get("$interpolate");
    });

    it("should expose the endSymbol in config phase", () => {
      angular
        .module("customInterpolationApp")
        .config(function ($interpolateProvider) {
          expect($interpolateProvider.startSymbol()).toBe("((");
        });
    });

    it("should expose the startSymbol in run phase", () => {
      expect($interpolate.startSymbol()).toBe("((");
    });

    it("should not get confused by matching start and end symbols", () => {
      angular
        .module("customInterpolationApp", ["ng"])
        .config(function ($interpolateProvider) {
          $interpolateProvider.startSymbol("--");
          $interpolateProvider.endSymbol("--");
        });

      $injector = createInjector(["customInterpolationApp"]);
      $interpolate = $injector.get("$interpolate");

      () => {
        expect($interpolate("---").expressions).toEqual([]);
        expect($interpolate("----")({})).toEqual("");
        expect($interpolate("--1--")({})).toEqual("1");
      };
    });
  });

  describe("endSymbol", () => {
    beforeEach(() => {
      angular
        .module("customInterpolationApp", ["ng"])
        .config(function ($interpolateProvider) {
          expect($interpolateProvider.endSymbol()).toBe("}}");
          $interpolateProvider.endSymbol("))");
        });

      $injector = createInjector(["customInterpolationApp"]);
      $interpolate = $injector.get("$interpolate");
    });

    it("should expose the endSymbol in config phase", () => {
      angular
        .module("customInterpolationApp")
        .config(function ($interpolateProvider) {
          expect($interpolateProvider.endSymbol()).toBe("))");
        });
    });

    it("should expose the endSymbol in run phase", () => {
      expect($interpolate.endSymbol()).toBe("))");
    });
  });
});
