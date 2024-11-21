import { wait } from "../../shared/test-utils";
import { $postUpdateQueue, createScope } from "./scope";
import { Angular } from "../../loader";
import { createInjector } from "../di/injector";
import { isDefined, sliceArgs } from "../../shared/utils";

describe("Scope", () => {
  let scope;
  let $parse;
  let logs;
  let $rootScope;
  let injector;
  let count;

  beforeEach(() => {
    logs = [];
    count = 0;
    delete window.angular;
    window.angular = new Angular();
    window.angular
      .module("myModule", ["ng"])
      .decorator("$exceptionHandler", function () {
        return (exception, cause) => {
          logs.push(exception);
          console.error(exception, cause);
        };
      });

    injector = createInjector(["myModule"]);
    $parse = injector.get("$parse");
    $rootScope = injector.get("$rootScope");
    scope = $rootScope;
  });

  it("can be instantiated without parameters", () => {
    scope = createScope();
    expect(scope).toBeDefined();

    scope.a = 1;
    expect(scope.a).toEqual(1);
  });

  it("can be instantiated with plain object", () => {
    scope = createScope({ a: 1, b: { c: 2 } });
    expect(scope).toBeDefined();
    expect(scope.a).toEqual(1);
    expect(scope.b.c).toEqual(2);
    scope.a = 2;
    expect(scope.a).toEqual(2);
    scope.d = 3;
    expect(scope.d).toEqual(3);
  });

  class Demo {
    a = "test";

    check() {
      return this.a + "!";
    }
  }

  it("can be instantiated from a class instance", () => {
    scope = createScope(new Demo());
    expect(scope.a).toEqual("test");
    expect(scope.check()).toEqual("test!");
  });

  it("can be instantiated from a class instance as a property", () => {
    scope.test = createScope(new Demo());
    expect(scope.test.a).toEqual("test");
    expect(scope.test.check()).toEqual("test!");
  });

  describe("$id", () => {
    it("should have a unique id", () => {
      expect(scope.id < scope.$new().id).toBeTruthy();
    });
  });

  describe("inheritance", () => {
    it("can be constructed and used as an object", () => {
      const scope = createScope();
      scope.aProperty = 1;

      expect(scope.aProperty).toBe(1);
    });

    it("constructs a root scope by default while all children non-root", () => {
      const scope = createScope();
      expect(scope.$isRoot()).toBe(true);

      const child = scope.$new();
      expect(child.$isRoot()).toBe(false);
    });

    it("inherits the parents properties", () => {
      scope.aValue = [1, 2, 3];

      const child = scope.$new();
      expect(child.aValue).toEqual([1, 2, 3]);

      scope.bValue = 2;
      expect(child.bValue).toEqual(2);
    });

    it("does not cause a parent to inherit its properties", () => {
      const child = scope.$new();
      child.aValue = [1, 2, 3];

      expect(scope.aValue).toBeUndefined();
    });

    it("inherits the parents properties whenever they are defined", () => {
      const child = scope.$new();

      scope.aValue = [1, 2, 3];

      expect(child.aValue).toEqual([1, 2, 3]);
    });

    it("can create a scope from an existing object", () => {
      let instance = { bValue: "child" };
      const child = scope.$new(instance);

      scope.aValue = [1, 2, 3];

      expect(child.aValue).toEqual([1, 2, 3]);
      expect(child.bValue).toEqual("child");
    });

    it("can be nested at any depth", () => {
      const a = scope;
      const aa = a.$new();
      const aaa = aa.$new();
      const aab = aa.$new();
      const ab = a.$new();
      const abb = ab.$new();

      a.value = 1;

      expect(aa.value).toBe(1);
      expect(aaa.value).toBe(1);
      expect(aab.value).toBe(1);
      expect(ab.value).toBe(1);
      expect(abb.value).toBe(1);

      ab.anotherValue = 2;

      expect(abb.anotherValue).toBe(2);
      expect(aa.anotherValue).toBeUndefined();
      expect(aaa.anotherValue).toBeUndefined();
    });

    it("can manipulate a parent scopes property", () => {
      const child = scope.$new();

      scope.aValue = [1, 2, 3];
      child.aValue.push(4);

      expect(child.aValue).toEqual([1, 2, 3, 4]);
      expect(scope.aValue).toEqual([1, 2, 3, 4]);
      expect(child.aValue).toEqual(scope.aValue);
    });

    it("can manipulate a parent scopes property with functions", () => {
      class Demo {
        test() {
          return "Test";
        }
        increase() {
          this.counter++;
        }
      }

      let instance = new Demo();
      expect(instance.test()).toEqual("Test");
      const child = scope.$new(instance);

      scope.counter = 0;

      expect(child.counter).toEqual(0);
      expect(child.test()).toEqual("Test");

      child.increase();
      expect(child.counter).toEqual(1);

      child.increase();
      expect(child.counter).toEqual(2);
    });

    it("cannot override a parent scopes property", () => {
      const child = scope.$new();
      scope.aValue = [1, 2, 3];
      child.aValue = [1, 2, 3, 4];
      scope.bValue = { a: 1 };
      child.bValue = { b: 2 };
      scope.cValue = 1;
      child.cValue = 2;
      expect(scope.aValue).toEqual([1, 2, 3]);
      expect(child.aValue).toEqual([1, 2, 3, 4]);
      expect(scope.bValue).toEqual({ a: 1 });
      // expect(child.bValue).toEqual({ b: 2 });
      // expect(scope.cValue).toEqual(1);
      // expect(child.cValue).toEqual(2);
    });

    it("inherits the parents listeners", () => {
      const child = scope.$new();

      expect(child.$$listeners).toBe(scope.$$listeners);
    });
  });

  describe("$new()", () => {
    it("should create a child scope", () => {
      const child = scope.$new();
      scope.a = 123;
      expect(child.a).toEqual(123);
    });

    it("should create a non prototypically inherited child scope", () => {
      const child = scope.$newIsolate();
      scope.a = 123;
      expect(child.a).toBeUndefined();
      expect(child.$parent).toBe(scope.$root);
      expect(child.$new).toBeDefined();
      expect(child.$root).toEqual(scope.$root);
    });

    it("should attach the child scope to a specified parent", () => {
      const isolated = scope.$newIsolate();
      const trans = scope.$transcluded(isolated);
      scope.a = 123;
      expect(isolated.a).toBeUndefined();
      expect(trans.a).toEqual(123);
      expect(trans.$root.$id).toEqual(scope.$root.$id);
      expect(trans.$parent.$id).toEqual(isolated.$id);
    });
  });

  describe("$root", () => {
    it("should point to itself", () => {
      expect(scope.$root.$id).toEqual(scope.$id);
      expect(scope.$root).toEqual(scope.$root.$root);
    });

    it("should expose the constructor", () => {
      expect(Object.getPrototypeOf(scope)).toBe(scope.constructor.prototype);
    });

    it("should not have $root on children, but should inherit", () => {
      const child = scope.$new();
      expect(child.$root).toEqual(scope.$root);
    });
  });

  describe("$parent", () => {
    it("should point to parent", () => {
      const child = scope.$new();

      expect(scope.$parent).toEqual(null);
      expect(child.$parent.$id).toEqual(scope.$id);
      expect(child.$parent).toEqual(scope.$handler);
      expect(child.$new().$parent).toEqual(child.$handler);
    });

    it("should keep track of its children", () => {
      const child = scope.$new();
      expect(scope.$children).toEqual([child]);

      const child2 = scope.$new();
      expect(scope.$children).toEqual([child, child2]);

      const child3 = child2.$new();
      expect(scope.$children).toEqual([child, child2]);
      expect(child2.$children).toEqual([child3]);
    });
  });

  describe("this", () => {
    it("should evaluate 'this' to be the scope", () => {
      const child = scope.$new();
      expect(scope.$eval("this")).toEqual(scope.$target);
      expect(child.$eval("this")).toEqual(child.$target);
    });

    it("'this' should not be recursive", () => {
      expect(scope.$eval("this.this")).toBeUndefined();
      expect(scope.$eval("$parent.this")).toBeUndefined();
    });

    it("should not be able to overwrite the 'this' keyword", () => {
      scope.this = 123;
      expect(scope.$eval("this")).toEqual(scope);
    });

    it("should be able to access a constant variable named 'this'", () => {
      scope.this = 42;
      expect(scope.$eval("this['this']")).toBe(42);
    });
  });

  describe("$watch", () => {
    it("needs an expression to designate a watched property", async () => {
      expect(() => scope.$watch()).toThrowError();
    });

    it("does not need a listener function", async () => {
      expect(() => scope.$watch("1")).not.toThrowError();
    });

    it("can register listeners via watch", async () => {
      var listenerFn = jasmine.createSpy();
      scope.$watch("a", listenerFn);
      scope.a = 1;
      await wait();
      expect(listenerFn).toHaveBeenCalled();
    });

    it("can calls a listener upon registration", async () => {
      var listenerFn = jasmine.createSpy();
      scope.$watch("a", listenerFn);
      await wait();
      expect(listenerFn).toHaveBeenCalled();
    });

    it("should return a deregistration function watch", () => {
      let fn = scope.$watch("a", () => {});
      expect(fn).toBeDefined();
      expect(typeof fn).toEqual("function");
    });

    it("should manipulate the $watcher count", () => {
      let fn = scope.$watch("a", () => {});
      expect(scope.$$watchersCount).toBeDefined();
      expect(scope.$$watchersCount).toEqual(1);

      fn();
      expect(scope.$$watchersCount).toEqual(0);
    });

    it("should not expose the `inner working of watch", async () => {
      let get, listen;
      function Listener() {
        listen = this;
      }
      scope.$watch("foo", Listener);

      scope.a = 1;
      await wait();

      expect(get).toBeUndefined();
      expect(listen).toBeUndefined();
    });

    it("can trigger watch from a class", async () => {
      let called = false;
      class Demo {
        constructor() {
          this.counter = 0;
        }
        test() {
          this.counter++;
        }
      }

      scope = createScope(new Demo());

      scope.$watch("counter", () => {
        called = true;
      });

      expect(scope.counter).toEqual(0);
      expect(called).toBeFalse();

      scope.test();
      await wait();

      expect(scope.counter).toEqual(1);
      expect(called).toBeTrue();
    });

    it("can trigger watch from a constuctor function", async () => {
      let called = false;
      function Demo() {
        this.counter = 0;
        this.test = function () {
          this.counter++;
        };
      }

      scope = createScope(new Demo());

      scope.$watch("counter", () => {
        called = true;
      });

      expect(scope.counter).toEqual(0);
      expect(called).toBeFalse();

      scope.test();
      await wait();

      expect(scope.counter).toEqual(1);
      expect(called).toBeTrue();
    });

    it("can trigger watch from an POJO object ", async () => {
      let called = false;
      const demo = {
        counter: 0,
        test: function () {
          this.counter++;
        },
      };

      scope = createScope(demo);

      scope.$watch("counter", () => {
        called = true;
      });

      expect(scope.counter).toEqual(0);
      expect(called).toBeFalse();

      scope.test();
      await wait();

      expect(scope.counter).toEqual(1);
      expect(called).toBeTrue();
    });

    it("calls the listener function when the watched value is initialized", async () => {
      scope.counter = 0;
      scope.someValue = "b";
      scope.$watch("someValue", () => scope.counter++);
      expect(scope.counter).toBe(0);

      await wait();
      expect(scope.counter).toBe(1);

      scope.someValue = "b";
      await wait();
      expect(scope.counter).toBe(1);

      scope.someValue = "c";
      await wait();
      expect(scope.counter).toBe(2);
    });

    it("calls the listener function when the watched value is destroyed", async () => {
      scope.counter = 0;
      scope.someValue = "b";
      expect(scope.counter).toBe(0);

      scope.$watch("someValue", () => scope.counter++);
      await wait();
      expect(scope.counter).toBe(1);

      delete scope.someValue;
      await wait();
      expect(scope.counter).toBe(2);
    });

    it("can call multiple the listener functions when the watched value changes", async () => {
      scope.someValue = "a";
      scope.counter = 0;

      scope.$watch("someValue", () => {
        scope.counter++;
      });

      scope.$watch("someValue", () => scope.counter++);
      await wait();
      expect(scope.counter).toBe(2);

      scope.someValue = "b";
      await wait();
      expect(scope.counter).toBe(4);
    });

    it("calls only the listeners registerred at the moment the watched value changes", async () => {
      scope.someValue = "a";
      scope.counter = 0;

      scope.$watch("someValue", () => scope.counter++);
      await wait();
      expect(scope.counter).toBe(1);

      scope.someValue = "b";
      await wait();
      expect(scope.counter).toBe(2);

      scope.$watch("someValue", () => {
        scope.counter++;
      });
      await wait();
      expect(scope.counter).toBe(3);

      scope.someValue = "b";
      await wait();
      expect(scope.counter).toBe(3);

      scope.someValue = "c";
      await wait();
      expect(scope.counter).toBe(5);
    });

    it("correctly handles NaNs", async () => {
      scope.counter = 0;
      scope.$watch("number", function (newValue, scope) {
        scope.counter++;
      });
      scope.number = 0 / 0;
      await wait();
      expect(scope.number).toBeNaN();
      expect(scope.counter).toBe(2);

      scope.number = NaN;
      await wait();
      expect(scope.number).toBeNaN();
      expect(scope.counter).toBe(2);
    });

    it("calls listener with undefined old value the first time", async () => {
      var newValueGiven;
      scope.$watch("someValue", function (newValue, scope) {
        newValueGiven = newValue;
      });
      scope.someValue = 123;
      await wait();
      expect(newValueGiven).toBe(123);
    });

    it("calls listener with new value and old value the first time if defined", async () => {
      var newValueGiven;
      scope.someValue = 123;

      scope.$watch("someValue", function (newValue) {
        newValueGiven = newValue;
      });
      scope.someValue = 321;
      await wait();

      expect(newValueGiven).toBe(321);
    });

    it("calls listener with with the instance of a scope as 2nd argument", async () => {
      var scopeInstance;
      scope.someValue = 123;

      scope.$watch("someValue", function (_1, m) {
        scopeInstance = m;
      });
      scope.someValue = 321;
      await wait();

      expect(scopeInstance).toBeDefined();
      expect(scopeInstance).toEqual(scope);
    });

    it("triggers chained watchers in the same scope change", async () => {
      scope.$watch("nameUpper", function (newValue) {
        if (newValue) {
          scope.initial = newValue.substring(0, 1) + ".";
        }
      });
      scope.$watch("name", function (newValue) {
        if (newValue) {
          scope.nameUpper = newValue.toUpperCase();
        }
      });
      scope.name = "Jane";
      await wait();
      expect(scope.initial).toBe("J.");

      scope.name = "Bob";
      await wait();
      expect(scope.initial).toBe("B.");
    });

    it("can register nested watches", async () => {
      scope.counter = 0;
      scope.aValue = "abc";
      scope.$watch("aValue", () => {
        scope.$watch("bValue", () => {
          scope.counter++;
        });
      });
      scope.aValue = "2";
      await wait();
      expect(scope.counter).toBe(2);

      scope.bValue = "3";
      await wait();
      expect(scope.counter).toBe(4);

      scope.aValue = "6";
      await wait();
      expect(scope.counter).toBe(5);
    });

    it("should delegate exceptions", async () => {
      scope.$watch("a", () => {
        throw new Error("abc");
      });
      scope.a = 1;
      await wait();
      expect(logs[0]).toMatch(/abc/);
    });

    it("should fire watches in order of addition", async () => {
      // this is not an external guarantee, just our own sanity
      logs = "";
      scope.$watch("a", () => {
        logs += "a";
      });
      scope.$watch("b", () => {
        logs += "b";
      });
      // constant expressions have slightly different handling as they are executed in priority
      scope.$watch("1", () => {
        logs += "1";
      });
      scope.$watch("c", () => {
        logs += "c";
      });
      scope.$watch("2", () => {
        logs += "2";
      });
      scope.a = 1;
      scope.b = 1;
      scope.c = 1;
      await wait();
      expect(logs).toEqual("ab1c2abc");
    });

    it("should repeat watch cycle while scope changes are identified", async () => {
      logs = "";
      scope.$watch("c", (v) => {
        scope.d = v;
        logs += "c";
      });
      scope.$watch("b", (v) => {
        scope.c = v;
        logs += "b";
      });
      scope.$watch("a", (v) => {
        scope.b = v;
        logs += "a";
      });
      await wait();
      expect(logs).toEqual("cba");
      logs = "";
      scope.a = 1;
      await wait();
      expect(scope.a).toEqual(1);
      expect(scope.b).toEqual(1);
      expect(scope.c).toEqual(1);
      expect(scope.d).toEqual(1);
      expect(logs).toEqual("abc");
    });

    describe("constants", () => {
      it("does not watch constants", async () => {
        scope.$watch("1", () => {});
        expect(scope.$$watchersCount).toBe(0);
        await wait();
        expect(scope.$$watchersCount).toBe(0);
      });

      const cases = [
        { expression: "1", expected: 1 },
        { expression: "'a'", expected: "a" },
        { expression: "[1,2,3]", expected: [1, 2, 3] },
        { expression: "false", expected: false },
        { expression: "null", expected: null },
        { expression: '{x: 1}["x"]', expected: 1 },
        { expression: "2 + 2", expected: 4 },
        { expression: "2 / 0", expected: Infinity },
        { expression: "false || 2", expected: 2 },
        { expression: "false && 2", expected: false },
      ];

      cases.forEach(async ({ expression, expected }) => {
        it("passes constants to listener cb " + expression, async () => {
          let res;
          scope.$watch(expression, (val) => {
            res = val;
          });

          await wait();
          expect(res).toEqual(expected);
        });
      });
    });

    describe("expressions", () => {
      it("its should increase the count of watchers", async () => {
        logs = "";
        scope.a = 1;
        scope.$watch("a", () => {
          logs += "a";
        });
        scope.$watch("b", () => {
          logs += "b";
        });

        expect(scope.$handler.watchers.size).toEqual(2);
        expect(scope.$$watchersCount).toEqual(scope.$handler.watchers.size);
      });

      it("should fire upon $watch registration on initial registeration", async () => {
        logs = "";
        scope.a = 1;
        scope.$watch("a", () => {
          logs += "a";
        });
        scope.$watch("b", () => {
          logs += "b";
        });
        await wait();
        expect(logs).toEqual("ab");
      });

      it("invokes a callback on property change", async () => {
        let newV, target;
        scope.$watch("foo", (a, b) => {
          newV = a;
          target = b;
        });

        scope.foo = 1;
        await wait();
        expect(newV).toEqual(1);
        expect(target).toEqual(scope.$target);

        scope.foo = 2;
        await wait();
        expect(newV).toEqual(2);
        expect(target).toEqual(scope.$target);

        scope.foo = [];
        await wait();
        expect(newV).toEqual([]);
        expect(target).toEqual(scope.$target);
      });

      it("calls the listener function when the watched value changes", async () => {
        scope.counter = 0;
        scope.$watch("someValue", function (newValue, scope) {
          scope.counter++;
        });
        await wait();
        expect(scope.counter).toBe(1);

        scope.someValue = "1";
        await wait();
        expect(scope.counter).toBe(2);

        scope.someValue = "2";
        await wait();
        expect(scope.counter).toBe(3);
      });

      it("should watch and fire on simple property change", async () => {
        const spy = jasmine.createSpy();
        scope.$watch("name", spy);

        spy.calls.reset();

        expect(spy).not.toHaveBeenCalled();
        scope.name = "misko";
        await wait();
        expect(spy).toHaveBeenCalledWith("misko", scope);
      });

      it("should watch and fire on correct expression change", async () => {
        const spy = jasmine.createSpy();
        scope.$watch("name.first", spy);
        await wait();
        expect(spy).toHaveBeenCalled();

        spy.calls.reset();
        scope.name = {};
        await wait();
        expect(spy).not.toHaveBeenCalled();

        spy.calls.reset();
        scope.first = "bruno";
        await wait();
        expect(spy).not.toHaveBeenCalled();

        spy.calls.reset();
        scope.name.first = "misko";
        await wait();
        expect(spy).toHaveBeenCalled();

        spy.calls.reset();
        scope.first = "misko";
        await wait();
        expect(spy).not.toHaveBeenCalled();
      });
    });

    describe("apply expression", () => {
      it("adds watches expressions", async () => {
        expect(scope.$$watchersCount).toBe(0);
        scope.$watch("foo = 1", () => {});

        await wait();
        expect(scope.$$watchersCount).toBe(1);
      });

      it("applies a property change and continues watching the scopes", async () => {
        expect(scope.$$watchersCount).toBe(0);
        scope.$watch("foo = 2", () => {});

        await wait();
        expect(scope.$$watchersCount).toBe(1);
        expect(scope.$handler.watchers.has("foo")).toBeTrue();
        expect(scope.foo).toBe(2);

        scope.$watch("boo = 3", () => {});

        await wait();
        expect(scope.$$watchersCount).toBe(2);
        expect(scope.boo).toBe(3);
      });

      it("should apply a change and not increase watchers if no listener function", async () => {
        expect(scope.$$watchersCount).toBe(0);
        scope.$watch("foo = 2");

        await wait();
        expect(scope.$$watchersCount).toBe(0);
        expect(scope.foo).toBe(2);

        scope.$watch("foo = 3");

        await wait();
        expect(scope.$$watchersCount).toBe(0);
        expect(scope.foo).toBe(3);
      });
    });

    describe("filters", () => {
      it("applies filters to constants", async () => {
        expect(scope.$$watchersCount).toBe(0);
        let res;
        scope.$watch("'abcd'|limitTo:3", (val) => {
          res = val;
        });
        await wait();
        expect(res).toEqual("abc");

        scope.$watch("'abcd'|limitTo:3|limitTo:2", (val) => {
          res = val;
        });

        await wait();
        expect(res).toEqual("ab");

        scope.$watch("'abcd'|limitTo:3|limitTo:2|limitTo:1", (val) => {
          res = val;
        });

        await wait();
        expect(res).toEqual("a");
      });
    });

    describe("$watch on constants", () => {
      beforeEach(() => (logs = []));
      it("should not $watch constant literals ", () => {
        scope.$watch("[]", () => {});
        scope.$watch("{}", () => {});
        scope.$watch("1", () => {});
        scope.$watch('"foo"', () => {});
        expect(scope.$$watchersCount).toEqual(0);
      });

      it("should not $watch filtered literals", () => {
        scope.$watch('[1] | filter:"x"', () => {});
        scope.$watch("1 | limitTo:2", () => {});
        expect(scope.$$watchersCount).toEqual(0);
      });

      it("should ignore $watch of constant expressions", () => {
        scope.$watch("1 + 1", () => {});
        scope.$watch('"a" + "b"', () => {});
        scope.$watch('"ab".length', () => {});
        scope.$watch("[].length", () => {});
        scope.$watch("(1 + 1) | limitTo:2", () => {});
        expect(scope.$$watchersCount).toEqual(0);
      });
    });

    describe("watching objects", () => {
      it("should watch objects", async () => {
        scope.a = { c: 2 };
        scope.$watch("a", (value) => {
          logs += "success";
          expect(value).toEqual(scope.a);
        });
        await wait();
        logs = "";
        scope.a.c = "1";

        await wait();
        expect(logs).toEqual("success");
      });

      it("calls the listener function registered via function when a value is created as an object", async () => {
        scope.counter = 0;

        scope.$watch("someValue", () => {
          scope.counter++;
        });
        await wait();

        expect(scope.counter).toBe(1);

        scope.someValue = {};
        await wait();

        expect(scope.counter).toBe(2);
      });

      it("calls the listener function registered via expression when a value is created as an object", async () => {
        scope.counter = 0;

        scope.$watch("someValue", () => {
          scope.counter++;
        });
        await wait();

        expect(scope.counter).toBe(1);

        scope.someValue = {};
        await wait();

        expect(scope.counter).toBe(2);
      });

      it("calls the listener function registered via function when a value is created on a nested object", async () => {
        scope.counter = 0;
        scope.a = { someValue: 1 };
        scope.$watch("a.someValue", () => {
          scope.counter++;
        });
        await wait();
        expect(scope.counter).toBe(1);

        scope.a.someValue = 2;

        await wait();
        expect(scope.counter).toBe(2);

        scope.a.someValue = 3;
        await wait();
        expect(scope.counter).toBe(3);
      });

      it("calls the listener function registered via expression when a value is created on a nested object", async () => {
        scope.counter = 0;
        scope.a = { someValue: 1 };

        scope.$watch("a.someValue", () => {
          scope.counter++;
        });

        await wait();
        expect(scope.counter).toBe(1);

        scope.a.someValue = 2;

        await wait();
        expect(scope.counter).toBe(2);

        scope.a.someValue = 3;
        await wait();
        expect(scope.counter).toBe(3);
      });

      it("calls the listener function when a nested value is created on an empty wrapper object", async () => {
        scope.counter = 0;
        scope.someValue = {};

        scope.$watch("someValue.b", () => {
          scope.counter++;
        });
        await wait();

        expect(scope.counter).toBe(1);
        scope.someValue = { b: 2 };
        await wait();

        expect(scope.counter).toBe(2);
      });

      it("calls the listener function when a nested value is created on an undefined wrapper object", async () => {
        scope.counter = 0;
        scope.someValue = undefined;

        scope.$watch("someValue.b", async () => {
          scope.counter++;
        });
        await wait();

        expect(scope.counter).toBe(1);

        scope.someValue = { b: 2 };
        await wait();

        expect(scope.counter).toBe(2);

        scope.someValue.b = 3;
        await wait();

        expect(scope.counter).toBe(3);
      });

      it("calls the listener function when a nested value is created from a wrapper object", async () => {
        scope.someValue = { b: 1 };
        scope.counter = 0;

        scope.$watch("someValue.b", () => scope.counter++);
        await wait();
        expect(scope.counter).toBe(1);

        scope.someValue = { b: 2 };
        await wait();
        expect(scope.counter).toBe(2);

        scope.someValue = { c: 2 };
        await wait();
        expect(scope.counter).toBe(3);

        scope.someValue = { b: 2 };
        await wait();
        expect(scope.counter).toBe(4);

        scope.someValue = undefined;
        await wait();
        expect(scope.counter).toBe(5);
      });

      it("call the listener function when a nested value is created from an instance", async () => {
        let ctrl = createScope({ scope: { name: "John" } });
        let count = 0;
        expect(ctrl.scope.name).toEqual("John");

        ctrl.$watch("scope.name", () => {
          count++;
        });
        await wait();
        expect(count).toEqual(1);

        ctrl.scope.name = "Bob";
        await wait();
        expect(count).toEqual(2);

        ctrl.scope.name = "John";
        await wait();
        expect(count).toEqual(3);

        ctrl.scope.lastName = "NaN";
        await wait();

        expect(count).toEqual(3);
      });

      it("calls the listener function when a deeply nested watched value changes", async () => {
        scope.counter = 0;
        scope.someValue = { b: { c: { d: 1 } } };

        scope.$watch("someValue.b.c.d", function (newValue, scope) {
          scope.counter++;
        });
        await wait();
        expect(scope.counter).toBe(1);

        scope.someValue.b.c.d = 2;
        await wait();
        expect(scope.counter).toBe(2);

        scope.someValue = { b: { c: { d: 3 } } };
        await wait();

        expect(scope.counter).toBe(3);
      });

      it("call the listener function on correct listener", async () => {
        scope.counter = 0;
        scope.someValue = { b: { c: 1 } };

        scope.$watch("someValue.b.c", function (newValue, scope) {
          scope.counter++;
        });
        await wait();
        expect(scope.counter).toBe(1);

        scope.c = 5;
        await wait();
        expect(scope.counter).toBe(1);
      });

      it("calls the listener function when a deeply nested watched value is initially undefined", async () => {
        scope.counter = 0;
        scope.someValue = { b: { c: undefined } };

        scope.$watch("someValue.b.c.d", function (newValue, scope) {
          scope.counter++;
        });
        await wait();
        expect(scope.counter).toBe(1);

        scope.someValue = { b: { c: { d: 2 } } };
        await wait();
        expect(scope.counter).toBe(2);

        scope.someValue.b.c.d = 3;
        await wait();
        expect(scope.counter).toBe(3);
      });
    });

    describe("inherited $watch", () => {
      it("should decrement the watcherCount when destroying a child scope", () => {
        const child1 = scope.$new();
        const child2 = scope.$new();

        expect(scope.$$watchersCount).toBe(0);
        expect(child1.$$watchersCount).toBe(0);
        expect(child1.$$watchersCount).toBe(0);

        const grandChild1 = child1.$new();
        const grandChild2 = child2.$new();
        child1.$watch("a", () => {});
        expect(scope.$$watchersCount).toBe(1);
        expect(child1.$$watchersCount).toBe(1);

        child2.$watch("a", () => {});
        expect(scope.$$watchersCount).toBe(2);
        expect(child2.$$watchersCount).toBe(1);

        grandChild1.$watch("a", () => {});
        expect(grandChild1.$$watchersCount).toBe(1);
        expect(child1.$$watchersCount).toBe(2);

        grandChild2.$watch("a", () => {});
        expect(grandChild2.$$watchersCount).toBe(1);
        expect(child2.$$watchersCount).toBe(2);

        // a watcher is shared by all
        expect(scope.$$watchersCount).toBe(4);
        expect(child1.$$watchersCount).toBe(2);
        expect(grandChild1.$$watchersCount).toBe(1);
        expect(child2.$$watchersCount).toBe(2);
        expect(grandChild1.$$watchersCount).toBe(1);
        expect(grandChild2.$$watchersCount).toBe(1);

        grandChild2.$destroy();
        expect(child2.$$watchersCount).toBe(1);
        expect(scope.$$watchersCount).toBe(3);
        child1.$destroy();
        expect(child1.$$watchersCount).toBe(1);
        expect(scope.$$watchersCount).toBe(2);
      });

      it("should decrement the watcherCount when calling the remove function", () => {
        const child1 = scope.$new();
        const child2 = scope.$new();
        const grandChild1 = child1.$new();
        const grandChild2 = child2.$new();
        let remove1 = child1.$watch("a", () => {});
        child2.$watch("a", () => {});
        grandChild1.$watch("a", () => {});
        let remove2 = grandChild2.$watch("a", () => {});

        expect(grandChild2.$$watchersCount).toBe(1);
        expect(child2.$$watchersCount).toBe(2);
        expect(scope.$$watchersCount).toBe(4);

        expect(remove2()).toBeTrue();
        expect(grandChild2.$$watchersCount).toBe(0);
        expect(child2.$$watchersCount).toBe(1);
        expect(scope.$$watchersCount).toBe(3);

        expect(grandChild1.$$watchersCount).toBe(1);
        expect(child1.$$watchersCount).toBe(2);

        expect(remove1()).toBeTrue();
        expect(grandChild1.$$watchersCount).toBe(1);
        expect(child1.$$watchersCount).toBe(1);
        expect(scope.$$watchersCount).toBe(2);

        // Execute everything a second time to be sure that calling the remove function
        // several times, it only decrements the counter once
        remove2();
        expect(child2.$$watchersCount).toBe(1);
        expect(scope.$$watchersCount).toBe(2);
        remove1();
        expect(child1.$$watchersCount).toBe(1);
        expect(scope.$$watchersCount).toBe(2);
      });

      it("should call child $watchers in addition order", async () => {
        logs = "";
        const childA = scope.$new();
        childA.$watch("a", () => {
          logs += "a";
        });
        childA.$watch("a", () => {
          logs += "b";
        });
        childA.$watch("a", () => {
          logs += "c";
        });
        await wait();
        logs = "";
        childA.a = 1;
        await wait();
        expect(logs).toEqual("abc");
      });

      it("should share listeners with parent", async () => {
        logs = "";
        const childA = scope.$new();
        const childB = scope.$new();

        scope.$watch("a", () => {
          logs += "r";
        });

        childA.$watch("a", () => {
          logs += "a";
        });
        childB.$watch("a", () => {
          logs += "b";
        });
        await wait();
        logs = "";

        // init
        scope.a = 1;
        await wait();
        expect(logs).toBe("rab");

        logs = "";
        childA.a = 3;
        await wait();
        expect(logs).toBe("rab");

        logs = "";
        childA.a = 4;
        await wait();
        expect(logs).toBe("rab");
      });

      it("should repeat watch cycle from the root element", async () => {
        logs = "";
        const child = scope.$new();
        scope.$watch("c", () => {
          logs += "a";
        });
        child.$watch("c", () => {
          logs += "b";
        });
        await wait();
        logs = "";
        scope.c = 1;
        child.c = 2;
        await wait();
        expect(logs).toEqual("abab");
      });
    });

    it("should watch functions", async () => {
      scope.$watch("fn", (fn) => {
        logs.push(fn);
      });
      await wait();
      logs = [];
      scope.fn = function () {
        return "a";
      };
      await wait();
      expect(logs).toEqual(["a"]);
      scope.fn = function () {
        return "b";
      };
      await wait();
      expect(logs).toEqual(["a", "b"]);
    });

    it("should allow a watch to be added while in a digest", async () => {
      const watch1 = jasmine.createSpy("watch1");
      const watch2 = jasmine.createSpy("watch2");
      scope.$watch("foo", () => {
        scope.$watch("foo", watch1);
        scope.$watch("foo", watch2);
      });

      scope.$apply("foo = true");
      await wait();
      expect(watch1).toHaveBeenCalled();
      expect(watch2).toHaveBeenCalled();
    });

    it("should not skip watchers when adding new watchers during digest", async () => {
      const watch1 = jasmine.createSpy("watch1");
      const watch2 = jasmine.createSpy("watch2");
      scope.$watch("foo", () => {
        scope.$watch("foo", watch1);
        scope.$watch("foo", watch2);
      });
      scope.foo = "a";
      await wait();
      expect(watch1).toHaveBeenCalled();
      expect(watch2).toHaveBeenCalled();
    });

    it("should not skip watchers when adding new watchers during property update", async () => {
      const watch1 = jasmine.createSpy("watch1");
      const watch2 = jasmine.createSpy("watch2");
      scope.$watch("foo", () => {
        scope.$watch("foo", watch1);
        scope.$watch("foo", watch2);
      });
      scope.foo = 2;
      await wait();
      expect(watch1).toHaveBeenCalled();
      expect(watch2).toHaveBeenCalled();
    });

    describe("$watch deregistration", () => {
      beforeEach(() => (logs = []));
      it("should return a function that allows listeners to be deregistered", async () => {
        const listener = jasmine.createSpy("watch listener");
        let listenerRemove;

        listenerRemove = scope.$watch("foo", listener);

        expect(listener).not.toHaveBeenCalled();
        expect(listenerRemove).toBeDefined();

        scope.foo = "bar";
        await wait();
        expect(listener).toHaveBeenCalled();

        listener.calls.reset();
        listenerRemove();
        scope.foo = "baz";
        await wait();
        expect(listener).not.toHaveBeenCalled();
      });

      it("should allow a watch to be deregistered while in a digest", async () => {
        let remove1;
        let remove2;
        scope.$watch("remove", () => {
          remove1();
          remove2();
        });
        remove1 = scope.$watch("thing", () => {});
        remove2 = scope.$watch("thing", () => {});
        expect(async () => {
          scope.$apply("remove = true");
          await wait();
        }).not.toThrow();
      });
    });

    describe("watching arrays", () => {
      it("can watch arrays", async () => {
        scope.aValue = [1, 2, 3];
        scope.counter = 0;
        scope.$watch("aValue", function (newValue, m) {
          m.counter++;
        });
        await wait();
        expect(scope.counter).toBe(1);

        scope.aValue.push(4);
        await wait();
        expect(scope.counter).toBe(2);

        scope.aValue.pop();
        await wait();
        expect(scope.counter).toBe(3);
      });

      it("can pass the new value of the array as well as the previous value of the dropped item", async () => {
        scope.aValue = [];
        var newValueGiven;
        scope.$watch("aValue", function (newValue) {
          newValueGiven = newValue;
        });

        scope.aValue.push(4);
        await wait();
        expect(newValueGiven).toEqual(scope.aValue);

        scope.aValue.push(5);
        await wait();
        expect(newValueGiven).toEqual([4, 5]);

        scope.aValue[1] = 2;
        await wait();
        expect(newValueGiven).toEqual([4, 2]);
      });

      it("can detect removal of items", async () => {
        scope.aValue = [2, 3];
        var newValueGiven;
        scope.$watch("aValue", function (newValue) {
          newValueGiven = newValue;
        });

        scope.aValue.pop();
        await wait();
        expect(newValueGiven).toEqual([2]);
      });

      it("should return oldCollection === newCollection only on the first listener call", async () => {
        // first time should be identical
        scope.aValue = ["a", "b"];
        scope.counter = 0;
        var newValueGiven;
        scope.$watch("aValue", function (newValue, m) {
          newValueGiven = newValue;
          m.counter++;
        });
        await wait();
        expect(scope.counter).toBe(1);

        scope.aValue[1] = "c";
        await wait();
        expect(newValueGiven).toEqual(["a", "c"]);
        expect(scope.counter).toBe(2);
      });

      it("should trigger when property changes into array", async () => {
        scope.aValue = "test";
        scope.counter = 0;
        var newValue;
        scope.$watch("aValue", function (newV, m) {
          m.counter++;
          newValue = newV;
        });

        scope.aValue = [];
        await wait();
        expect(scope.counter).toBe(2);
        expect(newValue).toEqual([]);

        scope.aValue = {};
        await wait();
        expect(scope.counter).toBe(3);
        expect(newValue).toEqual({});

        scope.aValue = [];
        await wait();
        expect(scope.counter).toBe(4);
        expect(newValue).toEqual([]);

        scope.aValue = {};
        await wait();
        expect(scope.counter).toBe(5);

        scope.aValue = undefined;
        await wait();
        expect(scope.counter).toBe(6);
        expect(newValue).toEqual(undefined);
      });

      it("should allow deregistration", async () => {
        scope.obj = [];
        count = 0;
        let deregister = scope.$watch("obj", (newVal) => {
          logs.push(newVal);
          count++;
        });

        scope.obj.push("a");
        await wait();
        expect(logs.length).toBe(2);
        expect(count).toEqual(2);

        scope.obj.push("a");
        await wait();
        expect(logs.length).toBe(3);
        expect(count).toEqual(3);

        deregister();
        scope.obj.push("a");
        await wait();
        expect(logs.length).toBe(3);
        expect(count).toEqual(3);
      });

      it("should not trigger change when object in collection changes", async () => {
        scope.$watch("obj", function () {
          count++;
        });
        scope.obj = [{}];
        await wait();
        expect(count).toEqual(2);

        scope.obj[0].name = "foo";
        await wait();
        expect(count).toEqual(2);
      });

      it("should watch array properties", async () => {
        let counter = 0;
        scope.obj = [];
        scope.$watch("obj", function () {
          counter++;
        });
        await wait();
        expect(counter).toEqual(1);

        scope.obj.push("a");

        await wait();
        expect(counter).toEqual(2);

        scope.obj[0] = "b";
        await wait();
        expect(counter).toEqual(3);

        scope.obj.push([]);
        scope.obj.push({});
        expect(scope.obj.length).toBe(3);
        await wait();
        expect(counter).toEqual(5);

        scope.obj.shift();
        await wait();
        expect(counter).toEqual(6);

        scope.obj[0] = "c";
        await wait();
        expect(counter).toEqual(7);

        scope.obj.pop();
        await wait();
        expect(counter).toEqual(8);
      });

      it("should watch array-like objects like arrays", async () => {
        scope.$watch("obj", function () {
          counter++;
        });
        scope.obj = document.getElementsByTagName("src");
        await wait();
        expect(logs.length).toBeTruthy();
      });
    });

    describe("watching other proxies", () => {
      it("should register a foreign proxies ", async () => {
        let scope1 = createScope();
        let scope2 = createScope({ b: 2 });
        scope1.service = scope2;
        expect(scope1.$handler.foreignProxies.size).toEqual(1);
      });

      it("should detect changes on another proxy", async () => {
        let scope1 = createScope();
        let scope2 = createScope({ b: 2 });
        let count = 0;

        scope1.service = scope2;
        scope1.$watch("service.b", () => {
          count++;
        });

        scope2.$watch("b", () => {
          count++;
        });

        scope2.b = 1;
        await wait();

        expect(count).toBe(4);
      });
    });

    describe("$watch", () => {
      describe("constiable", () => {
        let deregister;
        beforeEach(async () => {
          logs = [];

          deregister = scope.$watch("obj", (newVal) => {
            const msg = { newVal };
            logs.push(msg);
          });

          await wait();
          logs = [];
        });

        describe("object", () => {
          it("should return undefined for old value the first listener call", async () => {
            scope.obj = { a: "b" };
            await wait();
            expect(logs).toEqual([{ newVal: { a: "b" } }]);
            logs = [];

            scope.obj.a = "c";
            await wait();
            expect(logs).toEqual([{ newVal: { a: "c" } }]);
          });

          it("should trigger when property changes into object", async () => {
            scope.obj = "test";
            await wait();
            expect(logs).toEqual([{ newVal: "test" }]);

            logs = [];
            scope.obj = {};
            await wait();
            expect(logs).toEqual([{ newVal: {} }]);
          });

          it("should not trigger change when object in collection changes", async () => {
            scope.obj = { name: {} };

            await wait();

            expect(logs).toEqual([{ newVal: { name: {} } }]);
            logs = [];

            scope.obj.name.bar = "foo";

            expect(logs).toEqual([]);
          });

          it("should watch object properties", async () => {
            scope.obj = {};

            await wait();
            expect(logs).toEqual([{ newVal: {} }]);

            logs = [];

            scope.obj.a = "A";
            await wait();

            expect(logs).toEqual([{ newVal: { a: "A" } }]);

            logs = [];
            scope.obj.a = "B";
            await wait();

            expect(logs).toEqual([{ newVal: { a: "B" } }]);

            logs = [];

            scope.obj.b = [];
            await wait();
            expect(logs).toEqual([{ newVal: scope.obj }]);

            logs = [];
            scope.obj.c = {};

            await wait();
            expect(logs).toEqual([{ newVal: scope.obj }]);
          });

          it("should not infinitely digest when current value is NaN", async () => {
            scope.obj = { a: NaN };
            await wait();
            expect(() => {}).not.toThrow();
          });

          it("should handle objects created using `Object.create(null)`", async () => {
            scope.obj = Object.create(null);
            scope.obj.a = "a";
            scope.obj.b = "b";

            await wait();
            expect(logs[0].newVal).toEqual(scope.obj);

            delete scope.obj.b;

            await wait();
            expect(logs[0].newVal).toEqual(scope.obj);
          });
        });
      });

      describe("literal", () => {
        describe("array", () => {
          beforeEach(async () => {
            logs = [];
            scope.$watch("[obj]", (newVal) => {
              const msg = { newVal };

              logs.push(msg);
            });
            await wait();
            logs = [];
          });

          it("should trigger when item in array changes", async () => {
            // first time should be identical
            scope.obj = "a";
            await wait();
            expect(logs[0].newVal).toEqual(["a"]);

            // second time should be different
            logs = [];
            scope.obj = "b";
            await wait();
            expect(logs[0].newVal).toEqual(["b"]);
          });

          it("should trigger when property changes into array", async () => {
            scope.obj = "test";
            await wait();

            expect(logs).toEqual([{ newVal: ["test"] }]);

            logs = [];
            scope.obj = [];
            await wait();
            expect(logs).toEqual([{ newVal: [[]] }]);

            logs = [];
            scope.obj = {};
            await wait();
            expect(logs).toEqual([{ newVal: [{}] }]);

            logs = [];
            scope.obj = [];
            await wait();
            expect(logs).toEqual([{ newVal: [[]] }]);

            logs = [];

            scope.obj = undefined;
            await wait();
            expect(logs).toEqual([{ newVal: [undefined] }]);
          });

          it("should not trigger change when object in collection changes", async () => {
            scope.obj = {};
            await wait();
            expect(logs).toEqual([{ newVal: [{}] }]);

            logs = [];
            scope.obj.name = "foo";
            await wait();
            expect(logs).toEqual([{ newVal: [{ name: "foo" }] }]);
          });

          it("should not infinitely digest when current value is NaN", async () => {
            scope.obj = NaN;
            await wait();
            expect(() => {}).not.toThrow();
          });
        });

        describe("object", () => {
          beforeEach(() => {
            logs = [];
            scope.$watch("{a: obj}", (newVal) => {
              const msg = { newVal };

              logs.push(msg);
            });
          });

          it("should trigger when property changes into object", async () => {
            logs = [];
            scope.obj = {};
            await wait();
            expect(logs).toEqual([{ newVal: { a: {} } }]);
          });

          it("should not trigger change when object in collection changes", async () => {
            scope.obj = { name: "foo" };
            await wait();
            expect(logs).toEqual([
              {
                newVal: { a: { name: "foo" } },
              },
            ]);

            logs = [];
            scope.obj.name = "bar";
            await wait();
            expect(logs).toEqual([]);
          });

          it("should not infinitely digest when current value is NaN", () => {
            scope.obj = NaN;
            expect(() => {}).not.toThrow();
          });
        });

        describe("object computed property", () => {
          beforeEach(async () => {
            logs = [];
            scope.$watch("{[key]: obj}", (newVal) => {
              const msg = { newVal };

              logs.push(msg);
            });

            await wait();
            logs = [];
          });

          it("should not trigger when key absent", async () => {
            scope.obj = "test";
            await wait();
            expect(logs).toEqual([]);
          });

          it("should trigger when key changes", async () => {
            scope.key = "a";
            scope.obj = "test";
            await wait();
            expect(logs).toEqual([{ newVal: { a: "test" } }]);

            logs = [];
            scope.key = "b";
            await wait();
            expect(logs).toEqual([{ newVal: { b: "test" } }]);

            logs = [];
            scope.key = true;
            await wait();
            expect(logs).toEqual([{ newVal: { true: "test" } }]);
          });

          it("should not trigger change when object in collection changes", async () => {
            scope.key = "a";
            scope.obj = { name: "foo" };
            await wait();
            expect(logs).toEqual([
              {
                newVal: { a: { name: "foo" } },
              },
            ]);
            logs = [];

            scope.obj.name = "bar";
            await wait();
            expect(logs).toEqual([]);
          });

          it("should not infinitely digest when key value is NaN", () => {
            scope.key = NaN;
            scope.obj = NaN;
            expect(() => {}).not.toThrow();
          });
        });
      });
    });

    logs = [];
    function setupWatches(scope, log) {
      scope.$watch(() => {
        logs.push("w1");
        return scope.w1;
      }, log("w1action"));
      scope.$watch(() => {
        logs.push("w2");
        return scope.w2;
      }, log("w2action"));
      scope.$watch(() => {
        logs.push("w3");
        return scope.w3;
      }, log("w3action"));
      console.error(logs.length);
      logs = [];
    }
  });

  describe("$eval", () => {
    it("should eval an expression and modify the scope", () => {
      expect(scope.$eval("a=1")).toEqual(1);
      expect(scope.a).toEqual(1);

      scope.$eval((self) => {
        self.b = 2;
      });
      expect(scope.b).toEqual(2);
    });

    it("executes $eval'ed function and returns result", function () {
      scope.aValue = 42;
      var result = scope.$eval(function (scope) {
        return scope.aValue;
      });
      expect(result).toBe(42);
    });

    it("passes the second $eval argument straight through", function () {
      scope.aValue = 42;
      var result = scope.$eval(function (scope, arg) {
        return scope.aValue + arg;
      }, 2);
      expect(result).toBe(44);
    });

    it("should allow passing locals to the expression", () => {
      expect(scope.$eval("a+1", { a: 2 })).toBe(3);

      scope.$eval(
        (scope, locals) => {
          scope.c = locals.b + 4;
        },
        { b: 3 },
      );
      expect(scope.c).toBe(7);
    });
  });

  describe("$apply", () => {
    beforeEach(() => (logs = []));

    it("should eval an expression, modify the scope and trigger the watches", async () => {
      let counter = 0;
      scope.$watch("a", () => {
        counter++;
      });
      await wait();
      expect(counter).toEqual(1);

      scope.$apply("a=1");
      await wait();
      expect(counter).toEqual(2);
    });

    it("should update the scope and add values", async () => {
      scope.$apply("a=1");
      await wait();
      expect(scope.a).toEqual(1);
    });

    it("should update the scope and remove values", async () => {
      scope.a = 2;
      scope.$apply("a=null");
      await wait();
      expect(scope.a).toBeNull();
    });

    it("should update the scope and modify objects", async () => {
      scope.$apply("a={b: 2}");
      await wait();
      expect(scope.a.b).toEqual(2);

      scope.$apply("a.b = 3");
      await wait();
      expect(scope.a.b).toEqual(3);

      scope.$apply("a={c: 2}");
      await wait();
      expect(scope.a.c).toEqual(2);
      expect(scope.a.b).toBeUndefined();
    });

    it("should update arrays", async () => {
      scope.a = [];
      scope.$watch("a", () => count++);

      scope.$apply("a.push(1)");

      await wait();
      expect(scope.a).toEqual([1]);
      expect(count).toEqual(2);

      scope.$apply("a.push(2)");

      await wait();
      expect(scope.a).toEqual([1, 2]);
      expect(count).toEqual(3);
    });

    it("executes $apply'ed function and starts the digest", async () => {
      scope.aValue = "someValue";
      scope.counter = 0;
      scope.$watch("aValue", () => scope.counter++);
      await wait();
      expect(scope.counter).toBe(1);

      scope.$apply(function (scope) {
        scope.aValue = "someOtherValue";
      });
      await wait();
      expect(scope.counter).toBe(2);
    });

    it("should apply expression with full lifecycle", async () => {
      let log = "";
      const child = scope.$new();
      scope.$watch("a", (a) => {
        log += "1";
      });

      child.$apply("a = 0");
      await wait();
      expect(log).toEqual("11");
    });

    it("should catch exceptions", async () => {
      let log = "";
      const child = scope.$new();
      scope.$watch("a", (a) => {
        log += "1";
      });
      scope.a = 0;
      await wait();
      child.$apply(() => {
        throw new Error("MyError");
      });
      await wait();
      expect(log).toEqual("11");
      expect(logs[0].message).toEqual("MyError");
    });
  });

  // describe("$applyAsync", () => {
  //   beforeEach(() => (logs = []));
  //   it("should evaluate in the context of specific $scope", () => {
  //     const scope = scope.$new();
  //     let id = scope.$applyAsync('x = "CODE ORANGE"');

  //     $browser.cancel(id);
  //     setTimeout(() => {
  //       expect(scope.x).toBe("CODE ORANGE");
  //       expect(scope.x).toBeUndefined();
  //     });

  //     expect(scope.x).toBeUndefined();
  //   });

  //   it("should evaluate queued expressions in order", () => {
  //     scope.x = [];
  //     let id1 = scope.$applyAsync('x.push("expr1")');
  //     let id2 = scope.$applyAsync('x.push("expr2")');

  //     $browser.cancel(id1);
  //     $browser.cancel(id2);
  //     setTimeout(() => {
  //       expect(scope.x).toEqual(["expr1", "expr2"]);
  //     });
  //     expect(scope.x).toEqual([]);
  //   });

  //   it("should evaluate subsequently queued items in same turn", () => {
  //     scope.x = [];
  //     let id = scope.$applyAsync(() => {
  //       scope.x.push("expr1");
  //       scope.$applyAsync('x.push("expr2")');
  //       expect($browser.deferredFns.length).toBe(0);
  //     });

  //     $browser.cancel(id);
  //     setTimeout(() => {
  //       expect(scope.x).toEqual(["expr1", "expr2"]);
  //     });
  //     expect(scope.x).toEqual([]);
  //   });

  //   it("should pass thrown exceptions to $exceptionHandler", () => {
  //     let id = scope.$applyAsync(() => {
  //       throw "OOPS";
  //     });

  //     $browser.cancel(id);
  //     expect(logs).toEqual([]);
  //     setTimeout(() => expect(logs[0]).toEqual("OOPS"));
  //   });

  //   it("should evaluate subsequent expressions after an exception is thrown", () => {
  //     let id = scope.$applyAsync(() => {
  //       throw "OOPS";
  //     });
  //     let id2 = scope.$applyAsync('x = "All good!"');

  //     $browser.cancel(id);
  //     $browser.cancel(id2);
  //     setTimeout(() => expect(scope.x).toBe("All good!"));
  //     expect(scope.x).toBeUndefined();
  //   });

  //   it("should be cancelled if a scope digest occurs before the next tick", () => {
  //     const cancel = spyOn($browser, "cancel").and.callThrough();
  //     const expression = jasmine.createSpy("expr");

  //     scope.$applyAsync(expression);

  //     expect(expression).toHaveBeenCalled();
  //     expect(cancel).toHaveBeenCalled();
  //     expression.calls.reset();
  //     cancel.calls.reset();

  //     // assert that another digest won't call the function again

  //     expect(expression).not.toHaveBeenCalled();
  //     expect(cancel).not.toHaveBeenCalled();
  //   });
  // });

  describe("$postUpdate", () => {
    beforeEach(() => (logs = []));
    it("should process callbacks as a queue (FIFO) when the scope is digested", async () => {
      let signature = "";

      scope.$postUpdate(() => {
        signature += "A";
        scope.$postUpdate(() => {
          signature += "D";
        });
      });

      scope.$postUpdate(() => {
        signature += "B";
      });

      scope.$postUpdate(() => {
        signature += "C";
      });

      expect(signature).toBe("");
      expect($postUpdateQueue.length).toBe(3);

      scope.$watch("a", () => {});
      scope.a = 1;

      await wait();

      expect(signature).toBe("ABCD");
    });

    it("should support $apply calls nested in $postUpdate callbacks", async () => {
      let signature = "";

      scope.$postUpdate(() => {
        signature += "A";
      });

      scope.$postUpdate(() => {
        signature += "B";
        scope.$postUpdate(() => {
          signature += "D";
        });
        scope.$apply("a = 2");
      });

      scope.$postUpdate(() => {
        signature += "C";
      });
      expect(signature).toBe("");

      scope.$watch("a", () => {});
      scope.a = 1;
      await wait();

      expect(signature).toBe("ABCD");
    });

    it("should run a $postUpdate call on all child scopes when a parent scope is digested", async () => {
      const parent = scope.$new();
      const child = parent.$new();
      let count = 0;

      scope.$postUpdate(() => {
        count++;
      });

      parent.$postUpdate(() => {
        count++;
      });

      child.$postUpdate(() => {
        count++;
      });

      expect(count).toBe(0);

      scope.$watch("a", () => {});
      scope.a = 1;
      await wait();

      expect(count).toBe(3);
    });

    it("should run a $postUpdate call even if the child scope is isolated", async () => {
      const parent = scope.$new();
      const child = parent.$newIsolate();
      let signature = "";

      parent.$postUpdate(() => {
        signature += "A";
      });

      child.$postUpdate(() => {
        signature += "B";
      });

      expect(signature).toBe("");
      scope.$watch("a", () => {});
      scope.a = 1;
      await wait();
      expect(signature).toBe("AB");
    });
  });

  describe("events", () => {
    describe("$on", () => {
      it("should add listener to list of listerner", () => {
        const child = scope.$new();
        function eventFn() {}
        child.$on("abc", eventFn);
        expect(child.$handler.$$listeners.get("abc").length).toEqual(1);

        child.$on("abc", eventFn);
        expect(child.$handler.$$listeners.get("abc").length).toEqual(2);
      });

      it("should return a deregistration function", () => {
        const child = scope.$new();
        function eventFn() {}
        let res = child.$on("abc", eventFn);
        expect(isDefined(res)).toBeDefined();
      });

      it("should return a deregistration function that removes a listener", () => {
        const child = scope.$new();
        function eventFn() {}
        let res = child.$on("abc", eventFn);
        expect(isDefined(res)).toBeDefined();
        expect(child.$handler.$$listeners.get("abc").length).toEqual(1);
        let res2 = child.$on("abc", eventFn);
        expect(child.$handler.$$listeners.get("abc").length).toEqual(2);
        res();
        expect(child.$handler.$$listeners.get("abc").length).toEqual(1);
        res2();
        expect(child.$handler.$$listeners.has("abc")).toBeFalse();
      });

      it("should add listener for both $emit and $broadcast events", () => {
        logs = "";
        const child = scope.$new();

        function eventFn() {
          logs += "X";
        }

        child.$on("abc", eventFn);
        expect(logs).toEqual("");

        child.$emit("abc");
        expect(logs).toEqual("X");

        child.$broadcast("abc");
        expect(logs).toEqual("XX");
      });

      describe("deregistration", () => {
        it("should return a function that deregisters the listener", () => {
          let log = "";
          const child = scope.$new();
          let listenerRemove;

          function eventFn() {
            log += "X";
          }

          listenerRemove = child.$on("abc", eventFn);
          expect(log).toEqual("");
          expect(listenerRemove).toBeDefined();

          child.$emit("abc");
          child.$broadcast("abc");
          expect(log).toEqual("XX");

          expect(child.$handler.$$listeners.get("abc").length).toBe(1);

          log = "";
          listenerRemove();
          child.$emit("abc");
          child.$broadcast("abc");
          expect(log).toEqual("");
          expect(scope.$handler.$$listeners.get("abc")).toBeUndefined();
        });

        it("should deallocate the listener array entry", () => {
          const remove1 = scope.$on("abc", () => {});
          scope.$on("abc", () => {});

          expect(scope.$handler.$$listeners.get("abc").length).toBe(2);

          remove1();

          expect(scope.$handler.$$listeners.get("abc").length).toBe(1);
        });

        it("should call next listener after removing the current listener via its own handler", () => {
          const listener1 = jasmine.createSpy("listener1").and.callFake(() => {
            remove1();
          });
          let remove1 = scope.$on("abc", listener1);

          const listener2 = jasmine.createSpy("listener2");
          const remove2 = scope.$on("abc", listener2);

          const listener3 = jasmine.createSpy("listener3");
          const remove3 = scope.$on("abc", listener3);

          scope.$broadcast("abc");
          expect(listener1).toHaveBeenCalled();
          expect(listener2).toHaveBeenCalled();
          expect(listener3).toHaveBeenCalled();

          listener1.calls.reset();
          listener2.calls.reset();
          listener3.calls.reset();

          scope.$broadcast("abc");
          expect(listener1).not.toHaveBeenCalled();
          expect(listener2).toHaveBeenCalled();
          expect(listener3).toHaveBeenCalled();
        });

        it("should call all subsequent listeners when a previous listener is removed via a handler", () => {
          const listener1 = jasmine.createSpy();
          const remove1 = scope.$on("abc", listener1);

          const listener2 = jasmine.createSpy().and.callFake(remove1);
          const remove2 = scope.$on("abc", listener2);

          const listener3 = jasmine.createSpy();
          const remove3 = scope.$on("abc", listener3);

          scope.$broadcast("abc");
          expect(listener1).toHaveBeenCalled();
          expect(listener2).toHaveBeenCalled();
          expect(listener3).toHaveBeenCalled();

          listener1.calls.reset();
          listener2.calls.reset();
          listener3.calls.reset();

          scope.$broadcast("abc");
          expect(listener1).not.toHaveBeenCalled();
          expect(listener2).toHaveBeenCalled();
          expect(listener3).toHaveBeenCalled();
        });

        it("should not call listener when removed by previous", () => {
          const listener1 = jasmine.createSpy("listener1");
          const remove1 = scope.$on("abc", listener1);

          const listener2 = jasmine.createSpy("listener2").and.callFake(() => {
            remove3();
          });
          const remove2 = scope.$on("abc", listener2);

          const listener3 = jasmine.createSpy("listener3");
          let remove3 = scope.$on("abc", listener3);

          const listener4 = jasmine.createSpy("listener4");
          const remove4 = scope.$on("abc", listener4);

          scope.$broadcast("abc");
          expect(listener1).toHaveBeenCalled();
          expect(listener2).toHaveBeenCalled();
          expect(listener3).not.toHaveBeenCalled();
          expect(listener4).toHaveBeenCalled();

          listener1.calls.reset();
          listener2.calls.reset();
          listener3.calls.reset();
          listener4.calls.reset();

          scope.$broadcast("abc");
          expect(listener1).toHaveBeenCalled();
          expect(listener2).toHaveBeenCalled();
          expect(listener3).not.toHaveBeenCalled();
          expect(listener4).toHaveBeenCalled();
        });
      });
    });

    describe("$emit", () => {
      let log;
      let child;
      let grandChild;
      let greatGrandChild;

      function logger(event) {
        log += `${event.currentScope.id}>`;
      }

      beforeEach(() => {
        log = "";
        logs = [];
        child = scope.$new();
        grandChild = child.$new();
        greatGrandChild = grandChild.$new();

        scope.id = 0;
        child.id = 1;
        grandChild.id = 2;
        greatGrandChild.id = 3;

        scope.$on("myEvent", logger);
        child.$on("myEvent", logger);
        grandChild.$on("myEvent", logger);
        greatGrandChild.$on("myEvent", logger);
      });

      it("should do nothing on empty listener", () => {
        logs = "";
        const child = scope.$new();

        function eventFn() {
          logs += "X";
        }

        child.$on("abc", eventFn);
        expect(logs).toEqual("");

        child.$emit("none");
        expect(logs).toEqual("");
      });

      it("should bubble event up to the root scope", () => {
        grandChild.$emit("myEvent");
        expect(log).toEqual("2>1>0>");
      });

      it("should allow all events on the same scope to run even if stopPropagation is called", () => {
        child.$on("myEvent", logger);
        grandChild.$on("myEvent", (e) => {
          e.stopPropagation();
        });
        grandChild.$on("myEvent", logger);
        grandChild.$on("myEvent", logger);
        grandChild.$emit("myEvent");
        expect(log).toEqual("2>2>2>");
      });

      it("should dispatch exceptions to the $exceptionHandler", () => {
        child.$on("myEvent", () => {
          throw "bubbleException";
        });
        grandChild.$emit("myEvent");
        expect(log).toEqual("2>1>0>");
        expect(logs).toEqual(["bubbleException"]);
      });

      it("should allow stopping event propagation", () => {
        child.$on("myEvent", (event) => {
          event.stopPropagation();
        });
        grandChild.$emit("myEvent");
        expect(log).toEqual("2>1>");
      });

      it("should forward method arguments", () => {
        child.$on("abc", (event, arg1, arg2) => {
          expect(event.name).toBe("abc");
          expect(arg1).toBe("arg1");
          expect(arg2).toBe("arg2");
        });
        child.$emit("abc", "arg1", "arg2");
      });

      it("should allow removing event listener inside a listener on $emit", () => {
        const spy1 = jasmine.createSpy("1st listener");
        const spy2 = jasmine.createSpy("2nd listener");
        const spy3 = jasmine.createSpy("3rd listener");

        const remove1 = child.$on("evt", spy1);
        const remove2 = child.$on("evt", spy2);
        const remove3 = child.$on("evt", spy3);

        spy1.and.callFake(remove1);

        expect(child.$handler.$$listeners.get("evt").length).toBe(3);

        // should call all listeners and remove 1st
        child.$emit("evt");
        expect(spy1).toHaveBeenCalled();
        expect(spy2).toHaveBeenCalled();
        expect(spy3).toHaveBeenCalled();
        expect(child.$handler.$$listeners.get("evt").length).toBe(2);

        spy1.calls.reset();
        spy2.calls.reset();
        spy3.calls.reset();

        // // should call only 2nd because 1st was already removed and 2nd removes 3rd
        spy2.and.callFake(remove3);
        child.$emit("evt");
        expect(spy1).not.toHaveBeenCalled();
        expect(spy2).toHaveBeenCalled();
        expect(spy3).not.toHaveBeenCalled();
        expect(child.$handler.$$listeners.get("evt").length).toBe(1);
      });

      it("should allow removing event listener inside a listener on $broadcast", () => {
        const spy1 = jasmine.createSpy("1st listener");
        const spy2 = jasmine.createSpy("2nd listener");
        const spy3 = jasmine.createSpy("3rd listener");

        const remove1 = child.$on("evt", spy1);
        const remove2 = child.$on("evt", spy2);
        const remove3 = child.$on("evt", spy3);

        spy1.and.callFake(remove1);

        expect(child.$handler.$$listeners.get("evt").length).toBe(3);

        // should call all listeners and remove 1st
        child.$broadcast("evt");
        expect(spy1).toHaveBeenCalled();
        expect(spy2).toHaveBeenCalled();
        expect(spy3).toHaveBeenCalled();
        expect(child.$handler.$$listeners.get("evt").length).toBe(2);

        spy1.calls.reset();
        spy2.calls.reset();
        spy3.calls.reset();

        // should call only 2nd because 1st was already removed and 2nd removes 3rd
        spy2.and.callFake(remove3);
        child.$broadcast("evt");
        expect(spy1).not.toHaveBeenCalled();
        expect(spy2).toHaveBeenCalled();
        expect(spy3).not.toHaveBeenCalled();
        expect(child.$handler.$$listeners.get("evt").length).toBe(1);
      });

      describe("event object", () => {
        it("should have methods/properties", () => {
          let eventFired = false;

          child.$on("myEvent", (e) => {
            expect(e.targetScope).toBe(grandChild.$handler.$target);
            expect(e.currentScope).toBe(child.$handler.$target);
            expect(e.name).toBe("myEvent");
            eventFired = true;
          });
          grandChild.$emit("myEvent");
          expect(eventFired).toBe(true);
        });

        it("should have its `currentScope` property set to null after emit", () => {
          let event;

          child.$on("myEvent", (e) => {
            event = e;
          });
          grandChild.$emit("myEvent");

          expect(event.currentScope).toBe(null);
          expect(event.targetScope).toBe(grandChild.$target);
          expect(event.name).toBe("myEvent");
        });

        it("should have preventDefault method and defaultPrevented property", () => {
          let event = grandChild.$emit("myEvent");
          expect(event.defaultPrevented).toBe(false);

          child.$on("myEvent", (event) => {
            event.preventDefault();
          });
          event = grandChild.$emit("myEvent");
          expect(event.defaultPrevented).toBe(true);
          expect(event.currentScope).toBe(null);
        });
      });
    });

    describe("$broadcast", () => {
      describe("event propagation", () => {
        let log;
        let child1;
        let child2;
        let child3;
        let grandChild11;
        let grandChild21;
        let grandChild22;
        let grandChild23;
        let greatGrandChild211;

        function logger(event) {
          log += `${event.currentScope.id}>`;
        }

        beforeEach(() => {
          log = "";
          child1 = scope.$new();
          child2 = scope.$new();
          child3 = scope.$new();
          grandChild11 = child1.$new();
          grandChild21 = child2.$new();
          grandChild22 = child2.$new();
          grandChild23 = child2.$new();
          greatGrandChild211 = grandChild21.$new();

          scope.id = 0;
          child1.id = 1;
          child2.id = 2;
          child3.id = 3;
          grandChild11.id = 11;
          grandChild21.id = 21;
          grandChild22.id = 22;
          grandChild23.id = 23;
          greatGrandChild211.id = 211;

          scope.$on("myEvent", logger);
          child1.$on("myEvent", logger);
          child2.$on("myEvent", logger);
          child3.$on("myEvent", logger);
          grandChild11.$on("myEvent", logger);
          grandChild21.$on("myEvent", logger);
          grandChild22.$on("myEvent", logger);
          grandChild23.$on("myEvent", logger);
          greatGrandChild211.$on("myEvent", logger);

          //          R
          //       /  |   \
          //     1    2    3
          //    /   / | \
          //   11  21 22 23
          //       |
          //      211
        });

        it("should broadcast an event from the root scope", () => {
          scope.$broadcast("myEvent");
          expect(log).toBe("0>1>11>2>21>211>22>23>3>");
        });

        it("should broadcast an event from a child scope", () => {
          child2.$broadcast("myEvent");
          expect(log).toBe("2>21>211>22>23>");
        });

        it("should broadcast an event from a leaf scope with a sibling", () => {
          grandChild22.$broadcast("myEvent");
          expect(log).toBe("22>");
        });

        it("should broadcast an event from a leaf scope without a sibling", () => {
          grandChild23.$broadcast("myEvent");
          expect(log).toBe("23>");
        });

        it("should not not fire any listeners for other events", () => {
          scope.$broadcast("fooEvent");
          expect(log).toBe("");
        });

        it("should return event object", () => {
          const result = child1.$broadcast("some");

          expect(result).toBeDefined();
          expect(result.name).toBe("some");
          expect(result.targetScope).toBe(child1.$target);
        });
      });

      describe("listener", () => {
        it("should receive event object", () => {
          const child = scope.$new();
          let eventFired = false;

          child.$on("fooEvent", (event) => {
            eventFired = true;
            expect(event.name).toBe("fooEvent");
            expect(event.targetScope).toBe(scope.$target);
            expect(event.currentScope).toBe(child.$target);
          });
          scope.$broadcast("fooEvent");

          expect(eventFired).toBe(true);
        });

        it("should have the event's `currentScope` property set to null after broadcast", () => {
          const child = scope.$new();
          let event;

          child.$on("fooEvent", (e) => {
            event = e;
          });
          scope.$broadcast("fooEvent");

          expect(event.name).toBe("fooEvent");
          expect(event.targetScope).toBe(scope.$target);
          expect(event.currentScope).toBe(null);
        });

        it("should support passing messages as constargs", () => {
          const child = scope.$new();
          let args;

          child.$on("fooEvent", function () {
            args = arguments;
          });
          scope.$broadcast("fooEvent", "do", "re", "me", "fa");

          expect(args.length).toBe(5);
          expect(sliceArgs(args, 1)).toEqual(["do", "re", "me", "fa"]);
        });
      });
    });

    it("should allow recursive $emit/$broadcast", () => {
      let callCount = 0;
      scope.$on("evt", ($event, arg0) => {
        callCount++;
        if (arg0 !== 1234) {
          scope.$emit("evt", 1234);
          scope.$broadcast("evt", 1234);
        }
      });

      scope.$emit("evt");
      scope.$broadcast("evt");
      expect(callCount).toBe(6);
    });

    it("should allow recursive $emit/$broadcast between parent/child", () => {
      const child = scope.$new();
      let calls = "";

      scope.$on("evt", ($event, arg0) => {
        calls += "r"; // For "root".
        if (arg0 === "fromChild") {
          scope.$broadcast("evt", "fromRoot2");
        }
      });

      child.$on("evt", ($event, arg0) => {
        calls += "c"; // For "child".
        if (arg0 === "fromRoot1") {
          child.$emit("evt", "fromChild");
        }
      });

      scope.$broadcast("evt", "fromRoot1");
      expect(calls).toBe("rccrrc");
    });
  });

  describe("doc examples", () => {
    it("should properly fire off watch listeners upon scope changes", async () => {
      // <docs tag="docs1">
      const $scope = scope.$new();
      $scope.salutation = "Hello";
      $scope.name = "World";
      await wait();
      expect($scope.greeting).toEqual(undefined);

      $scope.$watch("name", () => {
        $scope.greeting = `${$scope.salutation} ${$scope.name}!`;
      });

      expect($scope.greeting).toEqual(undefined);
      expect($scope.greeting).toEqual(undefined);

      $scope.name = "Misko";
      await wait();
      expect($scope.greeting).toEqual("Hello Misko!");
    });
  });
});
