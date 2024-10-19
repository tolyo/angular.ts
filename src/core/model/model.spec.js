import { wait } from "../../shared/test-utils";
import { createModel } from "./model";
import { Angular } from "../../loader";
import { createInjector } from "../di/injector";
import { isDefined } from "../../shared/utils";

describe("Model", () => {
  let model;
  let $parse;
  let logs;
  let $rootModel;
  let injector;

  beforeEach(() => {
    logs = [];
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
    $rootModel = injector.get("$rootModel");
    model = $rootModel;
  });

  it("can be instantiated with plain object", () => {
    model = createModel({ a: 1, b: { c: 2 } });
    expect(model).toBeDefined();
    expect(model.a).toEqual(1);
    expect(model.b.c).toEqual(2);
    model.a = 2;
    expect(model.a).toEqual(2);
    model.d = 3;
    expect(model.d).toEqual(3);
  });

  describe("$id", () => {
    it("should have a unique id", () => {
      expect(model.id < model.$new().id).toBeTruthy();
    });
  });

  describe("inheritance", () => {
    it("can be constructed and used as an object", () => {
      const model = createModel();
      model.aProperty = 1;

      expect(model.aProperty).toBe(1);
    });

    it("constructs a root scope by default while all children non-root", () => {
      const model = createModel();
      expect(model.$isRoot()).toBe(true);

      const child = model.$new();
      expect(child.$isRoot()).toBe(false);
    });

    it("inherits the parents properties", () => {
      model.aValue = [1, 2, 3];

      const child = model.$new();
      expect(child.aValue).toEqual([1, 2, 3]);

      model.bValue = 2;
      expect(child.bValue).toEqual(2);
    });

    it("does not cause a parent to inherit its properties", () => {
      const child = model.$new();
      child.aValue = [1, 2, 3];

      expect(model.aValue).toBeUndefined();
    });

    it("inherits the parents properties whenever they are defined", () => {
      const child = model.$new();

      model.aValue = [1, 2, 3];

      expect(child.aValue).toEqual([1, 2, 3]);
    });

    it("can be nested at any depth", () => {
      const a = model;
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

    it("can manipulate a parent models property", () => {
      const child = model.$new();

      model.aValue = [1, 2, 3];
      child.aValue.push(4);

      expect(child.aValue).toEqual([1, 2, 3, 4]);
      expect(model.aValue).toEqual([1, 2, 3, 4]);
      expect(child.aValue).toEqual(model.aValue);
    });

    it("cannot override a parent models property", () => {
      const child = model.$new();
      model.aValue = [1, 2, 3];
      child.aValue = [1, 2, 3, 4];
      model.bValue = { a: 1 };
      child.bValue = { b: 2 };
      model.cValue = 1;
      child.cValue = 2;
      expect(model.aValue).toEqual([1, 2, 3]);
      expect(child.aValue).toEqual([1, 2, 3, 4]);
      expect(model.bValue).toEqual({ a: 1 });
      expect(child.bValue).toEqual({ b: 2 });
      expect(model.cValue).toEqual(1);
      expect(child.cValue).toEqual(2);
    });
  });

  describe("$new()", () => {
    it("should create a child scope", () => {
      const child = model.$new();
      model.a = 123;
      expect(child.a).toEqual(123);
    });

    it("should create a non prototypically inherited child scope", () => {
      const child = model.$new(true);
      model.a = 123;
      expect(child.a).toBeUndefined();
      expect(child.$parent).toBe(model.$root);
      expect(child.$new).toBeDefined();
      expect(child.$root).toEqual(model.$root);
    });

    it("should attach the child scope to a specified parent", () => {
      const isolated = model.$new(true);

      const trans = model.$new(false, isolated);
      model.a = 123;
      expect(isolated.a).toBeUndefined();
      expect(trans.a).toEqual(123);
      expect(trans.$root.$id).toEqual(model.$root.$id);
      expect(trans.$parent.$id).toEqual(isolated.$id);
    });
  });

  describe("$root", () => {
    it("should point to itself", () => {
      expect(model.$root.$id).toEqual(model.$id);
      expect(model.$root).toEqual(model.$root.$root);
    });

    it("should expose the constructor", () => {
      expect(Object.getPrototypeOf(model)).toBe(model.constructor.prototype);
    });

    it("should not have $root on children, but should inherit", () => {
      const child = model.$new();
      expect(child.$root).toEqual(model.$root);
    });
  });

  describe("$parent", () => {
    it("should point to parent", () => {
      const child = model.$new();

      expect(model.$parent).toEqual(null);
      expect(child.$parent.$id).toEqual(model.$id);
      expect(child.$parent).toEqual(model.$handler);
      expect(child.$new().$parent).toEqual(child.$handler);
    });

    it("should keep track of its children", () => {
      const child = model.$new();
      expect(model.$children).toEqual([child]);

      const child2 = model.$new();
      expect(model.$children).toEqual([child, child2]);

      const child3 = child2.$new();
      expect(model.$children).toEqual([child, child2]);
      expect(child2.$children).toEqual([child3]);
    });
  });

  describe("this", () => {
    it("should evaluate 'this' to be the scope", () => {
      const child = model.$new();
      expect(model.$eval("this")).toEqual(model.$target);
      expect(child.$eval("this")).toEqual(child.$target);
    });

    it("'this' should not be recursive", () => {
      expect(model.$eval("this.this")).toBeUndefined();
      expect(model.$eval("$parent.this")).toBeUndefined();
    });

    it("should not be able to overwrite the 'this' keyword", () => {
      model.this = 123;
      expect(model.$eval("this")).toEqual(model);
    });

    it("should be able to access a constant variable named 'this'", () => {
      model.this = 42;
      expect(model.$eval("this['this']")).toBe(42);
    });
  });

  describe("$watch", () => {
    it("can register listeners via watch", async () => {
      var listenerFn = jasmine.createSpy();
      model.$watch((o) => o.a, listenerFn);
      model.a = 1;
      await wait();
      expect(listenerFn).toHaveBeenCalled();
    });

    it("should return a deregistration function watch", () => {
      let fn = model.$watch(
        () => {},
        () => {},
      );
      expect(fn).toBeDefined();
      expect(typeof fn).toEqual("function");
    });

    it("calls the watch function with the model as the argument", async () => {
      var watchFn = jasmine.createSpy();
      var listenerFn = () => {};
      model.$watch(watchFn, listenerFn);

      expect(watchFn).toHaveBeenCalledWith(model);
    });

    it("calls the listener function when the watched value changes", async () => {
      model.someValue = "a";
      model.counter = 0;

      model.$watch(
        (m) => m.someValue,
        () => {
          model.counter++;
        },
      );
      expect(model.counter).toBe(0);

      model.someValue = "b";
      await wait();
      expect(model.counter).toBe(1);

      model.someValue = "b";
      await wait();
      expect(model.counter).toBe(1);

      model.someValue = "c";
      await wait();
      expect(model.counter).toBe(2);
    });

    it("calls the listener function when the watched value is iniatized", async () => {
      model.counter = 0;

      model.$watch(
        (m) => m.someValue,
        () => model.counter++,
      );
      expect(model.counter).toBe(0);

      model.someValue = "b";
      await wait();
      expect(model.counter).toBe(1);

      model.someValue = "b";
      await wait();
      expect(model.counter).toBe(1);

      model.someValue = "c";
      await wait();
      expect(model.counter).toBe(2);
    });

    it("calls the listener function when the watched value is destroyed", async () => {
      model.counter = 0;

      model.$watch(
        (m) => m.someValue,
        () => model.counter++,
      );
      expect(model.counter).toBe(0);

      model.someValue = "b";
      await wait();
      expect(model.counter).toBe(1);

      delete model.someValue;
      await wait();
      expect(model.counter).toBe(2);
    });

    it("can call multiple the listener functions when the watched value changes", async () => {
      model.someValue = "a";
      model.counter = 0;

      model.$watch(
        (m) => m.someValue,
        () => {
          model.counter++;
        },
      );

      model.$watch(
        (m) => m.someValue,
        () => model.counter++,
      );

      expect(model.counter).toBe(0);

      model.someValue = "b";
      await wait();
      expect(model.counter).toBe(2);
    });

    it("calls only the listeners registerred at the moment the watched value changes", async () => {
      model.someValue = "a";
      model.counter = 0;

      model.$watch(
        (m) => m.someValue,
        () => model.counter++,
      );
      expect(model.counter).toBe(0);

      model.someValue = "b";
      await wait();
      expect(model.counter).toBe(1);

      model.$watch(
        (m) => m.someValue,
        () => {
          model.counter++;
        },
      );
      model.someValue = "b";
      await wait();

      expect(model.counter).toBe(1);
    });

    it("correctly handles NaNs", async () => {
      model.counter = 0;
      model.$watch(
        function (model) {
          return model.number;
        },
        function (newValue, oldValue, model) {
          model.counter++;
        },
      );
      model.number = 0 / 0;
      await wait();
      expect(model.number).toBeNaN();
      expect(model.counter).toBe(1);

      model.number = NaN;
      await wait();
      expect(model.number).toBeNaN();
      expect(model.counter).toBe(1);
    });

    it("calls listener with undefined old value the first time", async () => {
      var oldValueGiven;
      var newValueGiven;
      model.$watch(
        function (model) {
          return model.someValue;
        },
        function (newValue, oldValue, model) {
          newValueGiven = newValue;
          oldValueGiven = oldValue;
        },
      );
      model.someValue = 123;
      await wait();

      expect(oldValueGiven).toBe(undefined);
      expect(newValueGiven).toBe(123);
    });

    it("calls listener with new value and old value the first time if defined", async () => {
      var oldValueGiven;
      var newValueGiven;
      model.someValue = 123;

      model.$watch(
        function (model) {
          return model.someValue;
        },
        function (newValue, oldValue, model) {
          newValueGiven = newValue;
          oldValueGiven = oldValue;
        },
      );
      model.someValue = 321;
      await wait();

      expect(oldValueGiven).toBe(123);
      expect(newValueGiven).toBe(321);
    });

    it("calls listener with with the instance of a model as 3rd argument", async () => {
      var modelInstance;
      model.someValue = 123;

      model.$watch(
        function (model) {
          return model.someValue;
        },
        function (_1, _2, m) {
          modelInstance = m;
        },
      );
      model.someValue = 321;
      await wait();

      expect(modelInstance).toBeDefined();
      expect(modelInstance).toEqual(model);
    });

    it("triggers chained watchers in the same model change", async () => {
      model.$watch(
        (model) => model.nameUpper,
        function (newValue) {
          if (newValue) {
            model.initial = newValue.substring(0, 1) + ".";
          }
        },
      );
      model.$watch(
        (model) => model.name,
        function (newValue) {
          if (newValue) {
            model.nameUpper = newValue.toUpperCase();
          }
        },
      );
      model.name = "Jane";
      await wait();
      expect(model.initial).toBe("J.");

      model.name = "Bob";
      await wait();
      expect(model.initial).toBe("B.");
    });

    it("can register nested watches", async () => {
      model.counter = 0;
      model.aValue = "abc";
      model.$watch(
        (model) => model.aValue,
        () => {
          model.$watch(
            (model) => model.aValue,
            () => {
              model.counter++;
            },
          );
        },
      );
      model.aValue = "2";
      await wait();
      expect(model.counter).toBe(1);
      model.aValue = "3";
      await wait();
      expect(model.counter).toBe(3);

      model.aValue = "6";
      await wait();
      expect(model.counter).toBe(6);
    });

    it("calls the watch function with the scope as the argument", function () {
      var watchFn = jasmine.createSpy();
      var listenerFn = function () {};
      model.$watch(watchFn, listenerFn);

      expect(watchFn).toHaveBeenCalledWith(model);
    });

    it("calls the listener function when the watched value changes", async () => {
      model.someValue = "a";
      model.counter = 0;
      model.$watch(
        function (scope) {
          return scope.someValue;
        },
        function (newValue, oldValue, scope) {
          scope.counter++;
        },
      );
      expect(model.counter).toBe(0);

      model.someValue = "1";
      await wait();
      expect(model.counter).toBe(1);

      model.someValue = "2";
      await wait();
      expect(model.counter).toBe(2);
    });

    it("should watch and fire on simple property change", async () => {
      const spy = jasmine.createSpy();
      model.$watch("name", spy);

      spy.calls.reset();

      expect(spy).not.toHaveBeenCalled();
      model.name = "misko";
      await wait();
      expect(spy).toHaveBeenCalledWith("misko", undefined, model);
    });

    it("should not expose the `inner working of watch", () => {
      function Getter() {
        expect(this).toBeUndefined();
        return "foo";
      }
      function Listener() {
        expect(this).toBeUndefined();
      }

      model.$watch(Getter, Listener);
    });

    it("should watch and fire on expression change", async () => {
      const spy = jasmine.createSpy();
      model.$watch("name.first", spy);

      spy.calls.reset();

      model.name = {};
      expect(spy).not.toHaveBeenCalled();
      model.name.first = "misko";
      await wait();
      expect(spy).toHaveBeenCalled();
    });

    it("should decrement the watcherCount when destroying a child scope", () => {
      const child1 = model.$new();
      const child2 = model.$new();
      const grandChild1 = child1.$new();
      const grandChild2 = child2.$new();
      child1.$watch("a", () => {});
      child2.$watch("a", () => {});
      grandChild1.$watch("a", () => {});
      grandChild2.$watch("a", () => {});

      expect(model.$$watchersCount).toBe(4);
      expect(child1.$$watchersCount).toBe(2);
      expect(child2.$$watchersCount).toBe(2);
      expect(grandChild1.$$watchersCount).toBe(1);
      expect(grandChild2.$$watchersCount).toBe(1);

      grandChild2.$destroy();
      expect(child2.$$watchersCount).toBe(1);
      expect(model.$$watchersCount).toBe(3);
      child1.$destroy();
      expect(model.$$watchersCount).toBe(1);
    });

    it("should decrement the watcherCount when calling the remove function", () => {
      const child1 = model.$new();
      const child2 = model.$new();
      const grandChild1 = child1.$new();
      const grandChild2 = child2.$new();
      let remove1 = child1.$watch("a", () => {});
      child2.$watch("a", () => {});
      grandChild1.$watch("a", () => {});
      let remove2 = grandChild2.$watch("a", () => {});

      remove2();
      expect(grandChild2.$$watchersCount).toBe(0);
      expect(child2.$$watchersCount).toBe(1);
      expect(model.$$watchersCount).toBe(3);
      remove1();
      expect(grandChild1.$$watchersCount).toBe(1);
      expect(child1.$$watchersCount).toBe(1);
      expect(model.$$watchersCount).toBe(2);

      // Execute everything a second time to be sure that calling the remove function
      // several times, it only decrements the counter once
      remove2();
      expect(child2.$$watchersCount).toBe(1);
      expect(model.$$watchersCount).toBe(2);
      remove1();
      expect(child1.$$watchersCount).toBe(1);
      expect(model.$$watchersCount).toBe(2);
    });

    describe("constants ignore", () => {
      beforeEach(() => (logs = []));
      it("should not $watch constant literals ", () => {
        model.$watch("[]", () => {});
        model.$watch("{}", () => {});
        model.$watch("1", () => {});
        model.$watch('"foo"', () => {});
        expect(model.$$watchersCount).toEqual(0);
      });

      it("should not $watch filtered literals", () => {
        model.$watch('[1] | filter:"x"', () => {});
        model.$watch("1 | limitTo:2", () => {});
        expect(model.$$watchersCount).toEqual(0);
      });

      it("should ignore $watch of constant expressions", () => {
        model.$watch("1 + 1", () => {});
        model.$watch('"a" + "b"', () => {});
        model.$watch('"ab".length', () => {});
        model.$watch("[].length", () => {});
        model.$watch("(1 + 1) | limitTo:2", () => {});
        expect(model.$$watchersCount).toEqual(0);
      });
    });

    describe("onetime cleanup", () => {
      it("should clean up stable watches on the watch queue", async () => {
        let count = 0;

        model.$watch("::foo", () => {
          count++;
        });
        expect(model.$$watchersCount).toEqual(1);
        expect(count).toEqual(0);

        model.foo = "foo";
        await wait();
        expect(model.$$watchersCount).toEqual(0);
        expect(count).toEqual(1);
      });

      it("should clean up stable watches from $watch collection", async () => {
        let count = 0;
        model.$watch("::foo", () => {
          count++;
        });
        expect(model.$$watchersCount).toEqual(1);

        model.foo = [];

        await wait();
        expect(count).toEqual(1);
        expect(model.$$watchersCount).toEqual(0);
      });

      it("should clean up stable watches from $watch array literals", async () => {
        let count = 0;
        model.$watch("::[foo, bar]", () => {
          count++;
        });
        expect(model.$$watchersCount).toEqual(1);

        expect(model.$$watchersCount).toEqual(1);
        expect(count).toEqual(0);

        model.foo = 1;
        await wait();
        expect(count).toEqual(0);
        expect(model.$$watchersCount).toEqual(1);

        model.foo = 2;
        await wait();
        expect(count).toEqual(0);
        expect(model.$$watchersCount).toEqual(1);

        model.bar = 3;
        await wait();
        expect(count).toEqual(1);
        expect(model.$$watchersCount).toEqual(0);
      });

      it("should clean up stable watches from $watchGroup", async () => {
        model.$watchGroup(["::foo", "::bar"], () => {});
        expect(model.$$watchersCount).toEqual(2);
        model.foo = "foo";
        await wait();
        expect(model.$$watchersCount).toEqual(1);

        model.bar = "bar";
        await wait();
        expect(model.$$watchersCount).toEqual(0);
      });
    });

    it("should delegate exceptions", async () => {
      model.$watch("a", () => {
        throw new Error("abc");
      });
      model.a = 1;
      await wait();
      expect(logs[0]).toMatch(/abc/);
    });

    it("should fire watches in order of addition", async () => {
      // this is not an external guarantee, just our own sanity
      logs = "";
      model.$watch("a", () => {
        logs += "a";
      });
      model.$watch("b", () => {
        logs += "b";
      });
      // constant expressions have slightly different handling as they are executed in priority
      model.$watch("1", () => {
        logs += "1";
      });
      model.$watch("c", () => {
        logs += "c";
      });
      model.$watch("2", () => {
        logs += "2";
      });
      model.a = 1;
      model.b = 1;
      model.c = 1;
      await wait();
      expect(logs).toEqual("12abc");
    });

    it("should call child $watchers in addition order", async () => {
      logs = "";
      const childA = model.$new();
      childA.$watch("a", () => {
        logs += "a";
      });
      childA.$watch("a", () => {
        logs += "b";
      });
      childA.$watch("a", () => {
        logs += "c";
      });
      childA.a = 1;
      await wait();
      expect(logs).toEqual("abc");
    });

    it("should share listeners with parent", async () => {
      logs = "";
      const childA = model.$new();
      const childB = model.$new();

      model.$watch("a", () => {
        logs += "r";
      });

      childA.$watch("a", () => {
        logs += "a";
      });
      childB.$watch("a", () => {
        logs += "b";
      });

      // init
      model.a = 1;
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

    it("should repeat watch cycle while model changes are identified", async () => {
      logs = "";
      model.$watch("c", (v) => {
        model.d = v;
        logs += "c";
      });
      model.$watch("b", (v) => {
        model.c = v;
        logs += "b";
      });
      model.$watch("a", (v) => {
        model.b = v;
        logs += "a";
      });
      await wait();
      logs = "";
      model.a = 1;
      await wait();
      expect(model.b).toEqual(1);
      expect(model.c).toEqual(1);
      expect(model.d).toEqual(1);
      expect(logs).toEqual("abc");
    });

    it("should repeat watch cycle from the root element", async () => {
      logs = "";
      const child = model.$new();
      model.$watch("c", () => {
        logs += "a";
      });
      child.$watch("c", () => {
        logs += "b";
      });
      model.c = 1;
      child.c = 2;
      await wait();
      expect(logs).toEqual("abab");
    });

    it("should not fire upon $watch registration on initial registeration", async () => {
      logs = "";
      model.a = 1;
      model.$watch("a", () => {
        logs += "a";
      });
      model.$watch("b", () => {
        logs += "b";
      });
      await wait();
      expect(logs).toEqual("");
    });

    it("should watch objects", async () => {
      logs = "";
      model.a = [];
      model.b = { c: 2 };
      model.$watch("a", (value) => {
        logs += ".";
        expect(value).toEqual(model.a);
      });
      model.$watch("b", (value) => {
        logs += "!";
        expect(value).toEqual(model.b);
      });

      model.a.push({});

      model.b.name = "1";

      await wait();
      expect(logs).toEqual(".!");
    });

    it("should watch functions", async () => {
      model.$watch("fn", (fn) => {
        logs.push(fn());
      });

      model.fn = function () {
        return "a";
      };
      await wait();
      expect(logs).toEqual(["a"]);
      model.fn = function () {
        return "b";
      };
      await wait();
      expect(logs).toEqual(["a", "b"]);
    });

    it("should prevent $watch recursion", async () => {
      let callCount = 0;
      model.$watch("name", () => {
        callCount++;
        expect(() => {}).toThrowMatching(/Maximum call stack size exceeded/);
      });
      model.name = "a";
      await wait();
      expect(callCount).toEqual(1);
    });

    it("should allow a watch to be added while in a digest", async () => {
      const watch1 = jasmine.createSpy("watch1");
      const watch2 = jasmine.createSpy("watch2");
      model.$watch("foo", () => {
        model.$watch("foo", watch1);
        model.$watch("foo", watch2);
      });
      model.$apply("foo = true");
      await wait();
      expect(watch1).toHaveBeenCalled();
      expect(watch2).toHaveBeenCalled();
    });

    it("should not skip watchers when adding new watchers during digest", async () => {
      const watch1 = jasmine.createSpy("watch1");
      const watch2 = jasmine.createSpy("watch2");
      model.$watch("foo", () => {
        model.$watch("foo", watch1);
        model.$watch("foo", watch2);
      });
      model.foo = "a";
      await wait();
      expect(watch1).toHaveBeenCalled();
      expect(watch2).toHaveBeenCalled();
    });

    it("should not skip watchers when adding new watchers during property update", async () => {
      const watch1 = jasmine.createSpy("watch1");
      const watch2 = jasmine.createSpy("watch2");
      model.$watch("foo", () => {
        model.$watch("foo", watch1);
        model.$watch("foo", watch2);
      });
      model.foo = 2;
      await wait();
      expect(watch1).toHaveBeenCalled();
      expect(watch2).toHaveBeenCalled();
    });

    describe("$watch deregistration", () => {
      beforeEach(() => (logs = []));
      it("should return a function that allows listeners to be deregistered", async () => {
        const listener = jasmine.createSpy("watch listener");
        let listenerRemove;

        listenerRemove = model.$watch("foo", listener);

        expect(listener).not.toHaveBeenCalled();
        expect(listenerRemove).toBeDefined();

        model.foo = "bar";
        await wait();
        expect(listener).toHaveBeenCalled();

        listener.calls.reset();
        listenerRemove();
        model.foo = "baz";
        await wait();
        expect(listener).not.toHaveBeenCalled();
      });

      it("should allow a watch to be deregistered while in a digest", async () => {
        let remove1;
        let remove2;
        model.$watch("remove", () => {
          remove1();
          remove2();
        });
        remove1 = model.$watch("thing", () => {});
        remove2 = model.$watch("thing", () => {});
        expect(async () => {
          model.$apply("remove = true");
          await wait();
        }).not.toThrow();
      });
    });

    describe("watching objects", () => {
      it("can set watch functions that return nested properties", async () => {
        model.counter = 0;
        model.a = { someValue: 1 };
        model.$watch(
          (obj) => obj.a.someValue,
          () => {
            model.counter++;
          },
        );

        model.a.someValue = 2;
        await wait();
        expect(model.counter).toBe(1);

        model.a.someValue = 3;
        await wait();
        expect(model.counter).toBe(2);
      });

      it("calls the listener function when a nested value is created on an empty wrapper object", async () => {
        model.counter = 0;
        model.someValue = {};

        model.$watch(
          (obj) => obj.someValue.b,
          () => {
            model.counter++;
          },
        );
        await wait();

        expect(model.counter).toBe(0);

        model.someValue = { b: 2 };
        await wait();

        expect(model.counter).toBe(1);
      });

      it("calls the listener function when a nested value is created on an undefined wrapper object", async () => {
        model.counter = 0;
        model.someValue = undefined;

        model.$watch(
          (obj) => obj.someValue.b,
          async () => {
            model.counter++;
          },
        );
        await wait();

        expect(model.counter).toBe(0);

        model.someValue = { b: 2 };
        await wait();

        expect(model.counter).toBe(1);

        model.someValue.b = 3;
        await wait();

        expect(model.counter).toBe(2);
      });

      it("calls the listener function when a nested value is created from a wrapper object", async () => {
        model.someValue = { b: 1 };
        model.counter = 0;

        model.$watch(
          (obj) => obj.someValue.b,
          () => model.counter++,
        );
        await wait();

        expect(model.counter).toBe(0);

        model.someValue = { b: 2 };
        await wait();

        expect(model.counter).toBe(1);
        model.someValue = { c: 2 };
        await wait();

        expect(model.counter).toBe(2);

        model.someValue = { b: 2 };
        await wait();

        expect(model.counter).toBe(3);

        model.someValue = undefined;
        await wait();

        expect(model.counter).toBe(4);
      });

      it("calls the listener function when a deeply nested watched value changes", async () => {
        model.counter = 0;
        model.someValue = { b: { c: { d: 1 } } };

        model.$watch(
          (obj) => obj.someValue.b.c.d,
          function (newValue, oldValue, model) {
            model.counter++;
          },
        );
        await wait();

        expect(model.counter).toBe(0);

        model.someValue.b.c.d = 2;
        await wait();

        expect(model.counter).toBe(1);

        model.someValue = { b: { c: { d: 3 } } };
        await wait();

        expect(model.counter).toBe(2);
      });

      it("calls the listener function when a deeply nested watched value is initially undefined", async () => {
        model.counter = 0;
        model.someValue = { b: { c: undefined } };

        model.$watch(
          (obj) => obj.someValue.b.c.d,
          function (newValue, oldValue, model) {
            model.counter++;
          },
        );
        await wait();

        expect(model.counter).toBe(0);

        model.someValue = { b: { c: { d: 2 } } };
        await wait();

        expect(model.counter).toBe(1);

        model.someValue.b.c.d = 3;
        await wait();

        expect(model.counter).toBe(2);
      });
    });

    describe("watching arrays", () => {
      it("can watch arrays", async () => {
        model.aValue = [1, 2, 3];
        model.counter = 0;
        model.$watch(
          (model) => model.aValue,
          function (newValue, oldValue, m) {
            m.counter++;
          },
        );
        expect(model.counter).toBe(0);
        model.aValue.push(4);
        await wait();
        expect(model.counter).toBe(1);

        model.aValue.pop();
        await wait();
        expect(model.counter).toBe(2);
      });

      it("can pass the new value of the array as well as the previous value of the dropped item", async () => {
        model.aValue = [];
        var oldValueGiven;
        var newValueGiven;
        model.$watch(
          function (model) {
            return model.aValue;
          },
          function (newValue, oldValue) {
            newValueGiven = newValue;
            oldValueGiven = oldValue;
          },
        );

        model.aValue.push(4);
        await wait();
        expect(newValueGiven).toEqual([4]);
        expect(oldValueGiven).toBe(undefined);

        model.aValue.push(5);
        await wait();
        expect(newValueGiven).toEqual([4, 5]);
        expect(oldValueGiven).toBe(undefined);

        model.aValue[1] = 2;
        await wait();
        expect(newValueGiven).toEqual([4, 2]);
        expect(oldValueGiven).toBe(5);
      });

      it("can detect removal of items", async () => {
        model.aValue = [2, 3];
        var oldValueGiven;
        var newValueGiven;
        model.$watch(
          function (model) {
            return model.aValue;
          },
          function (newValue, oldValue) {
            newValueGiven = newValue;
            oldValueGiven = oldValue;
          },
        );

        model.aValue.pop();
        await wait();
        expect(newValueGiven).toEqual([2]);
        expect(oldValueGiven).toEqual([2, 3]);
      });
    });

    // describe("$watchCollection", () => {
    //   describe("constiable", () => {
    //     let deregister;
    //     beforeEach(() => {
    //       logs = [];
    //       deregister = model.$watchCollection("obj", (newVal, oldVal) => {
    //         const msg = { newVal, oldVal };

    //         if (newVal === oldVal) {
    //           msg.identical = true;
    //         }

    //         logs.push(msg);
    //       });
    //     });

    //     it("should not trigger if nothing change", () => {
    //
    //       expect(logs).toEqual([
    //         { newVal: undefined, oldVal: undefined, identical: true },
    //       ]);
    //       logs = [];
    //
    //       expect(logs).toEqual([]);
    //     });

    //     it("should allow deregistration", () => {
    //       model.obj = [];
    //
    //       expect(logs.length).toBe(1);
    //       logs = [];

    //       model.obj.push("a");
    //       deregister();

    //
    //       expect(logs).toEqual([]);
    //     });

    //     describe("array", () => {
    //       it("should return oldCollection === newCollection only on the first listener call", () => {
    //         // first time should be identical
    //         model.obj = ["a", "b"];
    //
    //         expect(logs).toEqual([
    //           { newVal: ["a", "b"], oldVal: ["a", "b"], identical: true },
    //         ]);
    //         logs = [];

    //         // second time should be different
    //         model.obj[1] = "c";
    //
    //         expect(logs).toEqual([{ newVal: ["a", "c"], oldVal: ["a", "b"] }]);
    //       });

    //       it("should trigger when property changes into array", () => {
    //         model.obj = "test";
    //
    //         expect(logs).toEqual([
    //           { newVal: "test", oldVal: "test", identical: true },
    //         ]);

    //         logs = [];
    //         model.obj = [];
    //
    //         expect(logs).toEqual([{ newVal: [], oldVal: "test" }]);

    //         logs = [];
    //         model.obj = {};
    //
    //         expect(logs).toEqual([{ newVal: {}, oldVal: [] }]);

    //         logs = [];
    //         model.obj = [];
    //
    //         expect(logs).toEqual([{ newVal: [], oldVal: {} }]);

    //         logs = [];
    //         model.obj = undefined;
    //
    //         expect(logs).toEqual([{ newVal: undefined, oldVal: [] }]);
    //       });

    //       it("should not trigger change when object in collection changes", () => {
    //         model.obj = [{}];
    //
    //         expect(logs).toEqual([
    //           { newVal: [{}], oldVal: [{}], identical: true },
    //         ]);

    //         logs = [];
    //         model.obj[0].name = "foo";
    //
    //         expect(logs).toEqual([]);
    //       });

    //       it("should watch array properties", () => {
    //         model.obj = [];
    //
    //         expect(logs).toEqual([{ newVal: [], oldVal: [], identical: true }]);

    //         logs = [];
    //         model.obj.push("a");
    //
    //         expect(logs).toEqual([{ newVal: ["a"], oldVal: [] }]);

    //         logs = [];
    //         model.obj[0] = "b";
    //
    //         expect(logs).toEqual([{ newVal: ["b"], oldVal: ["a"] }]);

    //         logs = [];
    //         model.obj.push([]);
    //         model.obj.push({});
    //
    //         expect(logs).toEqual([{ newVal: ["b", [], {}], oldVal: ["b"] }]);

    //         logs = [];
    //         const temp = model.obj[1];
    //         model.obj[1] = model.obj[2];
    //         model.obj[2] = temp;
    //
    //         expect(logs).toEqual([
    //           { newVal: ["b", {}, []], oldVal: ["b", [], {}] },
    //         ]);

    //         logs = [];
    //         model.obj.shift();
    //
    //         expect(logs).toEqual([{ newVal: [{}, []], oldVal: ["b", {}, []] }]);
    //       });

    //       it("should not infinitely digest when current value is NaN", () => {
    //         model.obj = [NaN];
    //         expect(() => {
    //
    //         }).not.toThrow();
    //       });

    //       it("should watch array-like objects like arrays", () => {
    //         logs = [];
    //         model.obj = document.getElementsByTagName("src");
    //

    //         expect(logs.length).toBeTruthy();
    //       });
    //     });

    //     describe("object", () => {
    //       it("should return oldCollection === newCollection only on the first listener call", () => {
    //         model.obj = { a: "b" };
    //         // first time should be identical
    //
    //         expect(logs).toEqual([
    //           { newVal: { a: "b" }, oldVal: { a: "b" }, identical: true },
    //         ]);
    //         logs = [];

    //         // second time not identical
    //         model.obj.a = "c";
    //
    //         expect(logs).toEqual([{ newVal: { a: "c" }, oldVal: { a: "b" } }]);
    //       });

    //       it("should trigger when property changes into object", () => {
    //         model.obj = "test";
    //
    //         expect(logs).toEqual([
    //           { newVal: "test", oldVal: "test", identical: true },
    //         ]);
    //         logs = [];

    //         model.obj = {};
    //
    //         expect(logs).toEqual([{ newVal: {}, oldVal: "test" }]);
    //       });

    //       it("should not trigger change when object in collection changes", () => {
    //         model.obj = { name: {} };
    //
    //         expect(logs).toEqual([
    //           { newVal: { name: {} }, oldVal: { name: {} }, identical: true },
    //         ]);
    //         logs = [];

    //         model.obj.name.bar = "foo";
    //
    //         expect(logs).toEqual([]);
    //       });

    //       it("should watch object properties", () => {
    //         model.obj = {};
    //
    //         expect(logs).toEqual([{ newVal: {}, oldVal: {}, identical: true }]);
    //         logs = [];
    //         model.obj.a = "A";
    //
    //         expect(logs).toEqual([{ newVal: { a: "A" }, oldVal: {} }]);

    //         logs = [];
    //         model.obj.a = "B";
    //
    //         expect(logs).toEqual([{ newVal: { a: "B" }, oldVal: { a: "A" } }]);

    //         logs = [];
    //         model.obj.b = [];
    //         model.obj.c = {};
    //
    //         expect(logs).toEqual([
    //           { newVal: { a: "B", b: [], c: {} }, oldVal: { a: "B" } },
    //         ]);

    //         logs = [];
    //         const temp = model.obj.a;
    //         model.obj.a = model.obj.b;
    //         model.obj.c = temp;
    //
    //         expect(logs).toEqual([
    //           {
    //             newVal: { a: [], b: [], c: "B" },
    //             oldVal: { a: "B", b: [], c: {} },
    //           },
    //         ]);

    //         logs = [];
    //         delete model.obj.a;
    //
    //         expect(logs).toEqual([
    //           { newVal: { b: [], c: "B" }, oldVal: { a: [], b: [], c: "B" } },
    //         ]);
    //       });

    //       it("should not infinitely digest when current value is NaN", () => {
    //         model.obj = { a: NaN };
    //         expect(() => {
    //
    //         }).not.toThrow();
    //       });

    //       it("should handle objects created using `Object.create(null)`", () => {
    //         model.obj = Object.create(null);
    //         model.obj.a = "a";
    //         model.obj.b = "b";
    //
    //         expect(logs[0].newVal).toEqual(
    //           extend(Object.create(null), { a: "a", b: "b" }),
    //         );

    //         delete model.obj.b;
    //
    //         expect(logs[0].newVal).toEqual(
    //           extend(Object.create(null), { a: "a" }),
    //         );
    //       });
    //     });
    //   });

    //   describe("literal", () => {
    //     describe("array", () => {
    //       beforeEach(() => {
    //         logs = [];
    //         model.$watchCollection("[obj]", (newVal, oldVal) => {
    //           const msg = { newVal, oldVal };

    //           if (newVal === oldVal) {
    //             msg.identical = true;
    //           }

    //           logs.push(msg);
    //         });
    //       });

    //       it("should return oldCollection === newCollection only on the first listener call", () => {
    //         // first time should be identical
    //         model.obj = "a";
    //
    //         expect(logs).toEqual([
    //           { newVal: ["a"], oldVal: ["a"], identical: true },
    //         ]);
    //         logs = [];

    //         // second time should be different
    //         model.obj = "b";
    //
    //         expect(logs).toEqual([{ newVal: ["b"], oldVal: ["a"] }]);
    //       });

    //       it("should trigger when property changes into array", () => {
    //         model.obj = "test";
    //
    //         expect(logs).toEqual([
    //           { newVal: ["test"], oldVal: ["test"], identical: true },
    //         ]);

    //         logs = [];
    //         model.obj = [];
    //
    //         expect(logs).toEqual([{ newVal: [[]], oldVal: ["test"] }]);

    //         logs = [];
    //         model.obj = {};
    //
    //         expect(logs).toEqual([{ newVal: [{}], oldVal: [[]] }]);

    //         logs = [];
    //         model.obj = [];
    //
    //         expect(logs).toEqual([{ newVal: [[]], oldVal: [{}] }]);

    //         logs = [];
    //         model.obj = undefined;
    //
    //         expect(logs).toEqual([{ newVal: [undefined], oldVal: [[]] }]);
    //       });

    //       it("should not trigger change when object in collection changes", () => {
    //         model.obj = {};
    //
    //         expect(logs).toEqual([
    //           { newVal: [{}], oldVal: [{}], identical: true },
    //         ]);

    //         logs = [];
    //         model.obj.name = "foo";
    //
    //         expect(logs).toEqual([]);
    //       });

    //       it("should not infinitely digest when current value is NaN", () => {
    //         model.obj = NaN;
    //         expect(() => {
    //
    //         }).not.toThrow();
    //       });
    //     });

    //     describe("object", () => {
    //       beforeEach(() => {
    //         logs = [];
    //         model.$watchCollection("{a: obj}", (newVal, oldVal) => {
    //           const msg = { newVal, oldVal };

    //           if (newVal === oldVal) {
    //             msg.identical = true;
    //           }

    //           logs.push(msg);
    //         });
    //       });

    //       it("should return oldCollection === newCollection only on the first listener call", () => {
    //         model.obj = "b";
    //         // first time should be identical
    //
    //         expect(logs).toEqual([
    //           { newVal: { a: "b" }, oldVal: { a: "b" }, identical: true },
    //         ]);

    //         // second time not identical
    //         logs = [];
    //         model.obj = "c";
    //
    //         expect(logs).toEqual([{ newVal: { a: "c" }, oldVal: { a: "b" } }]);
    //       });

    //       it("should trigger when property changes into object", () => {
    //         model.obj = "test";
    //
    //         expect(logs).toEqual([
    //           { newVal: { a: "test" }, oldVal: { a: "test" }, identical: true },
    //         ]);

    //         logs = [];
    //         model.obj = {};
    //
    //         expect(logs).toEqual([
    //           { newVal: { a: {} }, oldVal: { a: "test" } },
    //         ]);
    //       });

    //       it("should not trigger change when object in collection changes", () => {
    //         model.obj = { name: "foo" };
    //
    //         expect(logs).toEqual([
    //           {
    //             newVal: { a: { name: "foo" } },
    //             oldVal: { a: { name: "foo" } },
    //             identical: true,
    //           },
    //         ]);

    //         logs = [];
    //         model.obj.name = "bar";
    //
    //         expect(logs).toEqual([]);
    //       });

    //       it("should watch object properties", () => {
    //         model.obj = {};
    //
    //         expect(logs).toEqual([
    //           { newVal: { a: {} }, oldVal: { a: {} }, identical: true },
    //         ]);

    //         logs = [];
    //         model.obj = "A";
    //
    //         expect(logs).toEqual([{ newVal: { a: "A" }, oldVal: { a: {} } }]);

    //         logs = [];
    //         model.obj = "B";
    //
    //         expect(logs).toEqual([{ newVal: { a: "B" }, oldVal: { a: "A" } }]);

    //         logs = [];
    //         model.obj = [];
    //
    //         expect(logs).toEqual([{ newVal: { a: [] }, oldVal: { a: "B" } }]);

    //         logs = [];
    //         delete model.obj;
    //
    //         expect(logs).toEqual([
    //           { newVal: { a: undefined }, oldVal: { a: [] } },
    //         ]);
    //       });

    //       it("should not infinitely digest when current value is NaN", () => {
    //         model.obj = NaN;
    //         expect(() => {
    //
    //         }).not.toThrow();
    //       });
    //     });

    //     describe("object computed property", () => {
    //       beforeEach(() => {
    //         logs = [];
    //         model.$watchCollection("{[key]: obj}", (newVal, oldVal) => {
    //           const msg = { newVal, oldVal };

    //           if (newVal === oldVal) {
    //             msg.identical = true;
    //           }

    //           logs.push(msg);
    //         });
    //       });

    //       it('should default to "undefined" key', () => {
    //         model.obj = "test";
    //
    //         expect(logs).toEqual([
    //           {
    //             newVal: { undefined: "test" },
    //             oldVal: { undefined: "test" },
    //             identical: true,
    //           },
    //         ]);
    //       });

    //       it("should trigger when key changes", () => {
    //         model.key = "a";
    //         model.obj = "test";
    //
    //         expect(logs).toEqual([
    //           { newVal: { a: "test" }, oldVal: { a: "test" }, identical: true },
    //         ]);

    //         logs = [];
    //         model.key = "b";
    //
    //         expect(logs).toEqual([
    //           { newVal: { b: "test" }, oldVal: { a: "test" } },
    //         ]);

    //         logs = [];
    //         model.key = true;
    //
    //         expect(logs).toEqual([
    //           { newVal: { true: "test" }, oldVal: { b: "test" } },
    //         ]);
    //       });

    //       it("should not trigger when key changes but stringified key does not", () => {
    //         model.key = 1;
    //         model.obj = "test";
    //
    //         expect(logs).toEqual([
    //           { newVal: { 1: "test" }, oldVal: { 1: "test" }, identical: true },
    //         ]);

    //         logs = [];
    //         model.key = "1";
    //
    //         expect(logs).toEqual([]);

    //         model.key = true;
    //
    //         expect(logs).toEqual([
    //           { newVal: { true: "test" }, oldVal: { 1: "test" } },
    //         ]);

    //         logs = [];
    //         model.key = "true";
    //
    //         expect(logs).toEqual([]);

    //         logs = [];
    //         model.key = {};
    //
    //         expect(logs).toEqual([
    //           {
    //             newVal: { "[object Object]": "test" },
    //             oldVal: { true: "test" },
    //           },
    //         ]);

    //         logs = [];
    //         model.key = {};
    //
    //         expect(logs).toEqual([]);
    //       });

    //       it("should not trigger change when object in collection changes", () => {
    //         model.key = "a";
    //         model.obj = { name: "foo" };
    //
    //         expect(logs).toEqual([
    //           {
    //             newVal: { a: { name: "foo" } },
    //             oldVal: { a: { name: "foo" } },
    //             identical: true,
    //           },
    //         ]);
    //         logs = [];

    //         model.obj.name = "bar";
    //
    //         expect(logs).toEqual([]);
    //       });

    //       it("should not infinitely digest when key value is NaN", () => {
    //         model.key = NaN;
    //         model.obj = NaN;
    //         expect(() => {
    //
    //         }).not.toThrow();
    //       });
    //     });
    //   });
    // });

    // describe("$suspend/$resume/$isSuspended", () => {
    //   it("should suspend watchers on scope", () => {
    //     const watchSpy = jasmine.createSpy("watchSpy");
    //     model.$watch(watchSpy);
    //     model.$suspend();
    //
    //     expect(watchSpy).not.toHaveBeenCalled();
    //   });

    //   it("should resume watchers on scope", () => {
    //     const watchSpy = jasmine.createSpy("watchSpy");
    //     model.$watch(watchSpy);
    //     model.$suspend();
    //     model.$resume();
    //
    //     expect(watchSpy).toHaveBeenCalled();
    //   });

    //   it("should suspend watchers on child scope", () => {
    //     const watchSpy = jasmine.createSpy("watchSpy");
    //     const scope = model.$new(true);
    //     scope.$watch(watchSpy);
    //     model.$suspend();
    //
    //     expect(watchSpy).not.toHaveBeenCalled();
    //   });

    //   it("should resume watchers on child scope", () => {
    //     const watchSpy = jasmine.createSpy("watchSpy");
    //     const scope = model.$new(true);
    //     scope.$watch(watchSpy);
    //     model.$suspend();
    //     model.$resume();
    //
    //     expect(watchSpy).toHaveBeenCalled();
    //   });

    //   it("should resume digesting immediately if `$resume` is called from an ancestor scope watch handler", () => {
    //     const watchSpy = jasmine.createSpy("watchSpy");
    //     const scope = model.$new();

    //     // Setup a handler that will toggle the scope suspension
    //     model.$watch("a", (a) => {
    //       if (a) scope.$resume();
    //       else scope.$suspend();
    //     });

    //     // Spy on the scope watches being called
    //     scope.$watch(watchSpy);

    //     // Trigger a digest that should suspend the scope from within the watch handler
    //     model.$apply("a = false");
    //     // The scope is suspended before it gets to do a digest
    //     expect(watchSpy).not.toHaveBeenCalled();

    //     // Trigger a digest that should resume the scope from within the watch handler
    //     model.$apply("a = true");
    //     // The watch handler that resumes the scope is in the parent, so the resumed scope will digest immediately
    //     expect(watchSpy).toHaveBeenCalled();
    //   });

    //   it("should resume digesting immediately if `$resume` is called from a non-ancestor scope watch handler", () => {
    //     const watchSpy = jasmine.createSpy("watchSpy");
    //     const scope = model.$new();
    //     const sibling = model.$new();

    //     // Setup a handler that will toggle the scope suspension
    //     sibling.$watch("a", (a) => {
    //       if (a) scope.$resume();
    //       else scope.$suspend();
    //     });

    //     // Spy on the scope watches being called
    //     scope.$watch(watchSpy);

    //     // Trigger a digest that should suspend the scope from within the watch handler
    //     model.$apply("a = false");
    //     // The scope is suspended by the sibling handler after the scope has already digested
    //     expect(watchSpy).toHaveBeenCalled();
    //     watchSpy.calls.reset();

    //     // Trigger a digest that should resume the scope from within the watch handler
    //     model.$apply("a = true");
    //     // The watch handler that resumes the scope marks the digest as dirty, so it will run an extra digest
    //     expect(watchSpy).toHaveBeenCalled();
    //   });

    //   it("should not suspend watchers on parent or sibling scopes", () => {
    //     const watchSpyParent = jasmine.createSpy("watchSpyParent");
    //     const watchSpyChild = jasmine.createSpy("watchSpyChild");
    //     const watchSpySibling = jasmine.createSpy("watchSpySibling");

    //     const parent = model.$new();
    //     parent.$watch(watchSpyParent);
    //     const child = parent.$new();
    //     child.$watch(watchSpyChild);
    //     const sibling = parent.$new();
    //     sibling.$watch(watchSpySibling);

    //     child.$suspend();
    //
    //     expect(watchSpyParent).toHaveBeenCalled();
    //     expect(watchSpyChild).not.toHaveBeenCalled();
    //     expect(watchSpySibling).toHaveBeenCalled();
    //   });

    //   it("should return true from `$isSuspended()` when a scope is suspended", () => {
    //     model.$suspend();
    //     expect(model.$isSuspended()).toBe(true);
    //     model.$resume();
    //     expect(model.$isSuspended()).toBe(false);
    //   });

    //   it("should return false from `$isSuspended()` for a non-suspended scope that has a suspended ancestor", () => {
    //     const childScope = model.$new();
    //     model.$suspend();
    //     expect(childScope.$isSuspended()).toBe(false);
    //     childScope.$suspend();
    //     expect(childScope.$isSuspended()).toBe(true);
    //     childScope.$resume();
    //     expect(childScope.$isSuspended()).toBe(false);
    //     model.$resume();
    //     expect(childScope.$isSuspended()).toBe(false);
    //   });
    // });

    // logs = [];
    // function setupWatches(scope, log) {
    //   scope.$watch(() => {
    //     logs.push("w1");
    //     return scope.w1;
    //   }, log("w1action"));
    //   scope.$watch(() => {
    //     logs.push("w2");
    //     return scope.w2;
    //   }, log("w2action"));
    //   scope.$watch(() => {
    //     logs.push("w3");
    //     return scope.w3;
    //   }, log("w3action"));
    //   console.error(logs.length);
    //   ;
    //   logs = [];
    // }

    // describe("optimizations", () => {
    //   beforeEach(() => (logs = []));
    //   it("should check watches only once during an empty digest", () => {
    //     setupWatches(model, console.log);
    //
    //     expect(logs).toEqual(["w1", "w2", "w3"]);
    //   });

    //   it("should quit digest early after we check the last watch that was previously dirty", () => {
    //     setupWatches(model, console.log);
    //     model.w1 = "x";
    //
    //     expect(logs).toEqual(["w1", "w2", "w3", "w1"]);
    //   });

    //   it("should not quit digest early if a new watch was added from an existing watch action", () => {
    //     setupWatches(model, console.log);
    //     model.$watch(
    //       () => {
    //         logs.push("w4");
    //         return "w4";
    //       },
    //       () => {
    //         logs.push("w4action");
    //         model.$watch(
    //           () => {
    //             logs.push("w5");
    //             return "w5";
    //           },
    //           () => logs.push("w5action"),
    //         );
    //       },
    //     );
    //
    //     expect(logs).toEqual([
    //       "w1",
    //       "w2",
    //       "w3",
    //       "w4",
    //       "w4action",
    //       "w5",
    //       "w5action",
    //       "w1",
    //       "w2",
    //       "w3",
    //       "w4",
    //       "w5",
    //     ]);
    //   });

    //   it("should not quit digest early if an evalAsync task was scheduled from a watch action", () => {
    //     setupWatches(model, console.log);
    //     model.$watch(
    //       () => {
    //         logs.push("w4");
    //         return "w4";
    //       },
    //       () => {
    //         logs.push("w4action");
    //         model.$evalAsync(() => {
    //           logs.push("evalAsync");
    //         });
    //       },
    //     );
    //
    //     expect(logs).toEqual([
    //       "w1",
    //       "w2",
    //       "w3",
    //       "w4",
    //       "w4action",
    //       "evalAsync",
    //       "w1",
    //       "w2",
    //       "w3",
    //       "w4",
    //     ]);
    //   });

    //   it("should quit digest early but not too early when constious watches fire", () => {
    //     setupWatches(model, console.log);
    //     model.$watch(
    //       () => {
    //         logs.push("w4");
    //         return model.w4;
    //       },
    //       (newVal) => {
    //         logs.push("w4action");
    //         model.w2 = newVal;
    //       },
    //     );

    //
    //     logs = [];

    //     model.w1 = "x";
    //     model.w4 = "x";
    //
    //     expect(logs).toEqual([
    //       "w1",
    //       "w2",
    //       "w3",
    //       "w4",
    //       "w4action",
    //       "w1",
    //       "w2",
    //       "w3",
    //       "w4",
    //       "w1",
    //       "w2",
    //     ]);
    //   });
    // });
  });

  describe("$eval", () => {
    it("should eval an expression and modify the model", () => {
      expect(model.$eval("a=1")).toEqual(1);
      expect(model.a).toEqual(1);

      model.$eval((self) => {
        self.b = 2;
      });
      expect(model.b).toEqual(2);
    });

    it("executes $eval'ed function and returns result", function () {
      model.aValue = 42;
      var result = model.$eval(function (model) {
        return model.aValue;
      });
      expect(result).toBe(42);
    });

    it("passes the second $eval argument straight through", function () {
      model.aValue = 42;
      var result = model.$eval(function (model, arg) {
        return model.aValue + arg;
      }, 2);
      expect(result).toBe(44);
    });

    it("should allow passing locals to the expression", () => {
      expect(model.$eval("a+1", { a: 2 })).toBe(3);

      model.$eval(
        (scope, locals) => {
          scope.c = locals.b + 4;
        },
        { b: 3 },
      );
      expect(model.c).toBe(7);
    });
  });

  describe("$apply", () => {
    beforeEach(() => (logs = []));

    it("should eval an expression, modify the model and trigger the watches", async () => {
      let counter = 0;
      model.$watch("a", () => {
        counter++;
      });

      model.$apply("a=1");
      await wait();
      expect(counter).toEqual(1);
    });

    it("should update the model and add values", async () => {
      model.$apply("a=1");
      await wait();
      expect(model.a).toEqual(1);
    });

    it("should update the model and remove values", async () => {
      model.a = 2;
      model.$apply("a=null");
      await wait();
      expect(model.a).toBeNull();
    });

    it("should update the model and modify objects", async () => {
      model.$apply("a={b: 2}");
      await wait();
      expect(model.a.b).toEqual(2);

      model.$apply("a.b = 3");
      await wait();
      expect(model.a.b).toEqual(3);

      model.$apply("a={c: 2}");
      await wait();
      expect(model.a.c).toEqual(2);
      expect(model.a.b).toBeUndefined();
    });

    it("executes $apply'ed function and starts the digest", async function () {
      model.aValue = "someValue";
      model.counter = 0;
      model.$watch(
        function (scope) {
          return scope.aValue;
        },
        function () {
          model.counter++;
        },
      );
      expect(model.counter).toBe(0);

      model.$apply(function (model) {
        model.aValue = "someOtherValue";
      });
      await wait();

      expect(model.counter).toBe(1);
    });

    //   it("should apply expression with full lifecycle", () => {
    //     let log = "";
    //     const child = model.$new();
    //     model.$watch("a", (a) => {
    //       log += "1";
    //     });
    //     child.$apply("$parent.a=0");
    //     expect(log).toEqual("1");
    //   });

    //   it("should catch exceptions", () => {
    //     let log = "";
    //     const child = model.$new();
    //     model.$watch("a", (a) => {
    //       log += "1";
    //     });
    //     model.a = 0;
    //     child.$apply(() => {
    //       throw new Error("MyError");
    //     });
    //     expect(log).toEqual("1");
    //     expect(logs[0].message).toEqual("MyError");
    //   });

    //   it("should log exceptions from $digest", () => {
    //     model.$watch("a", () => {
    //       model.b++;
    //     });
    //     model.$watch("b", () => {
    //       model.a++;
    //     });
    //     model.a = model.b = 0;

    //     expect(() => {
    //       model.$apply();
    //     }).toThrow();

    //     expect(logs[0]).toBeDefined();

    //     expect(model.$$phase).toBe(0);
    //   });

    //   describe("exceptions", () => {
    //     let log;

    //     beforeEach(() => {
    //       logs = [];
    //       log = "";
    //       model.$watch(() => {
    //         log += "$digest;";
    //       });
    //
    //       log = "";
    //     });

    //     it("should execute and return value and update", () => {
    //       model.name = "abc";
    //       expect(model.$apply((scope) => scope.name)).toEqual("abc");
    //       expect(log).toEqual("$digest;");
    //       expect(logs).toEqual([]);
    //     });

    //     it("should catch exception and update", () => {
    //       const error = new Error("MyError");
    //       model.$apply(() => {
    //         throw error;
    //       });
    //       expect(log).toEqual("$digest;");
    //       expect(logs).toEqual([error]);
    //     });
    //   });

    //   describe("recursive $apply protection", () => {
    //     beforeEach(() => (logs = []));

    //     it("should throw an exception if $apply is called while an $apply is in progress", () => {
    //       model.$apply(() => {
    //         model.$apply();
    //       });
    //       expect(logs[0].message.match(/progress/g).length).toBeTruthy();
    //     });

    //     it("should not clear the state when calling $apply during an $apply", () => {
    //       model.$apply(() => {
    //         model.$apply();
    //         expect(logs[0].message.match(/progress/g).length).toBeTruthy();
    //         logs = [];
    //         model.$apply();
    //         expect(logs[0].message.match(/progress/g).length).toBeTruthy();
    //       });
    //       logs = [];
    //       model.$apply();
    //       expect(logs).toEqual([]);
    //     });

    //     it("should throw an exception if $apply is called while flushing evalAsync queue", () => {
    //       model.$apply(() => {
    //         model.$evalAsync(() => {
    //           model.$apply();
    //         });
    //       });
    //       expect(logs[0].message.match(/progress/g).length).toBeTruthy();
    //     });

    //     it("should throw an exception if $apply is called while a watch is being initialized", () => {
    //       const childScope1 = model.$new();
    //       childScope1.$watch("x", () => {
    //         childScope1.$apply();
    //       });
    //       childScope1.$apply();
    //       expect(logs[0].message.match(/progress/g).length).toBeTruthy();
    //     });

    //     it("should thrown an exception if $apply in called from a watch fn (after init)", () => {
    //       const childScope2 = model.$new();
    //       childScope2.$apply(() => {
    //         childScope2.$watch("x", (newVal, oldVal) => {
    //           if (newVal !== oldVal) {
    //             childScope2.$apply();
    //           }
    //         });
    //       });
    //       childScope2.$apply(() => {
    //         childScope2.x = "something";
    //       });

    //       expect(logs[0].message.match(/progress/g).length).toBeTruthy();
    //     });
    //   });
  });

  // describe("$applyAsync", () => {
  //   beforeEach(() => (logs = []));
  //   it("should evaluate in the context of specific $scope", () => {
  //     const scope = model.$new();
  //     let id = scope.$applyAsync('x = "CODE ORANGE"');

  //     $browser.cancel(id);
  //     setTimeout(() => {
  //       expect(scope.x).toBe("CODE ORANGE");
  //       expect(model.x).toBeUndefined();
  //     });

  //     expect(scope.x).toBeUndefined();
  //   });

  //   it("should evaluate queued expressions in order", () => {
  //     model.x = [];
  //     let id1 = model.$applyAsync('x.push("expr1")');
  //     let id2 = model.$applyAsync('x.push("expr2")');

  //     $browser.cancel(id1);
  //     $browser.cancel(id2);
  //     setTimeout(() => {
  //       expect(model.x).toEqual(["expr1", "expr2"]);
  //     });
  //     expect(model.x).toEqual([]);
  //   });

  //   it("should evaluate subsequently queued items in same turn", () => {
  //     model.x = [];
  //     let id = model.$applyAsync(() => {
  //       model.x.push("expr1");
  //       model.$applyAsync('x.push("expr2")');
  //       expect($browser.deferredFns.length).toBe(0);
  //     });

  //     $browser.cancel(id);
  //     setTimeout(() => {
  //       expect(model.x).toEqual(["expr1", "expr2"]);
  //     });
  //     expect(model.x).toEqual([]);
  //   });

  //   it("should pass thrown exceptions to $exceptionHandler", () => {
  //     let id = model.$applyAsync(() => {
  //       throw "OOPS";
  //     });

  //     $browser.cancel(id);
  //     expect(logs).toEqual([]);
  //     setTimeout(() => expect(logs[0]).toEqual("OOPS"));
  //   });

  //   it("should evaluate subsequent expressions after an exception is thrown", () => {
  //     let id = model.$applyAsync(() => {
  //       throw "OOPS";
  //     });
  //     let id2 = model.$applyAsync('x = "All good!"');

  //     $browser.cancel(id);
  //     $browser.cancel(id2);
  //     setTimeout(() => expect(model.x).toBe("All good!"));
  //     expect(model.x).toBeUndefined();
  //   });

  //   it("should be cancelled if a model digest occurs before the next tick", () => {
  //     const cancel = spyOn($browser, "cancel").and.callThrough();
  //     const expression = jasmine.createSpy("expr");

  //     model.$applyAsync(expression);
  //
  //     expect(expression).toHaveBeenCalled();
  //     expect(cancel).toHaveBeenCalled();
  //     expression.calls.reset();
  //     cancel.calls.reset();

  //     // assert that another digest won't call the function again
  //
  //     expect(expression).not.toHaveBeenCalled();
  //     expect(cancel).not.toHaveBeenCalled();
  //   });
  // });

  // describe("$postUpdate", () => {
  //   beforeEach(() => (logs = []));
  //   it("should process callbacks as a queue (FIFO) when the scope is digested", () => {
  //     let signature = "";

  //     model.$postUpdate(() => {
  //       signature += "A";
  //       model.$postUpdate(() => {
  //         signature += "D";
  //       });
  //     });

  //     model.$postUpdate(() => {
  //       signature += "B";
  //     });

  //     model.$postUpdate(() => {
  //       signature += "C";
  //     });

  //     expect(signature).toBe("");
  //
  //     expect(signature).toBe("ABCD");
  //   });

  //   it("should support $apply calls nested in $postUpdate callbacks", () => {
  //     let signature = "";

  //     model.$postUpdate(() => {
  //       signature += "A";
  //     });

  //     model.$postUpdate(() => {
  //       signature += "B";
  //       model.$apply();
  //       signature += "D";
  //     });

  //     model.$postUpdate(() => {
  //       signature += "C";
  //     });

  //     expect(signature).toBe("");
  //
  //     expect(signature).toBe("ABCD");
  //   });

  //   it("should run a $postUpdate call on all child scopes when a parent scope is digested", () => {
  //     const parent = model.$new();
  //     const child = parent.$new();
  //     let count = 0;

  //     model.$postUpdate(() => {
  //       count++;
  //     });

  //     parent.$postUpdate(() => {
  //       count++;
  //     });

  //     child.$postUpdate(() => {
  //       count++;
  //     });

  //     expect(count).toBe(0);
  //
  //     expect(count).toBe(3);
  //   });

  //   it("should run a $postUpdate call even if the child scope is isolated", () => {
  //     const parent = model.$new();
  //     const child = parent.$new(true);
  //     let signature = "";

  //     parent.$postUpdate(() => {
  //       signature += "A";
  //     });

  //     child.$postUpdate(() => {
  //       signature += "B";
  //     });

  //     expect(signature).toBe("");
  //
  //     expect(signature).toBe("AB");
  //   });
  // });

  describe("events", () => {
    describe("$on", () => {
      it("should add listener to list of listerner", () => {
        const child = model.$new();
        function eventFn() {}
        child.$on("abc", eventFn);
        expect(child.$handler.$$listeners.get("abc").length).toEqual(1);

        child.$on("abc", eventFn);
        expect(child.$handler.$$listeners.get("abc").length).toEqual(2);
      });

      it("should return a deregistration function", () => {
        const child = model.$new();
        function eventFn() {}
        let res = child.$on("abc", eventFn);
        expect(isDefined(res)).toBeDefined();
      });

      it("should return a deregistration function that removes a listener", () => {
        const child = model.$new();
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
        const child = model.$new();

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
          const child = model.$new();
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
          expect(model.$handler.$$listeners.get("abc")).toBeUndefined();
        });

        it("should deallocate the listener array entry", () => {
          const remove1 = model.$on("abc", () => {});
          model.$on("abc", () => {});

          expect(model.$handler.$$listeners.get("abc").length).toBe(2);

          remove1();

          expect(model.$handler.$$listeners.get("abc").length).toBe(1);
        });

        it("should call next listener after removing the current listener via its own handler", () => {
          const listener1 = jasmine.createSpy("listener1").and.callFake(() => {
            remove1();
          });
          let remove1 = model.$on("abc", listener1);

          const listener2 = jasmine.createSpy("listener2");
          const remove2 = model.$on("abc", listener2);

          const listener3 = jasmine.createSpy("listener3");
          const remove3 = model.$on("abc", listener3);

          model.$broadcast("abc");
          expect(listener1).toHaveBeenCalled();
          expect(listener2).toHaveBeenCalled();
          expect(listener3).toHaveBeenCalled();

          listener1.calls.reset();
          listener2.calls.reset();
          listener3.calls.reset();

          model.$broadcast("abc");
          expect(listener1).not.toHaveBeenCalled();
          expect(listener2).toHaveBeenCalled();
          expect(listener3).toHaveBeenCalled();
        });

        it("should call all subsequent listeners when a previous listener is removed via a handler", () => {
          const listener1 = jasmine.createSpy();
          const remove1 = model.$on("abc", listener1);

          const listener2 = jasmine.createSpy().and.callFake(remove1);
          const remove2 = model.$on("abc", listener2);

          const listener3 = jasmine.createSpy();
          const remove3 = model.$on("abc", listener3);

          model.$broadcast("abc");
          expect(listener1).toHaveBeenCalled();
          expect(listener2).toHaveBeenCalled();
          expect(listener3).toHaveBeenCalled();

          listener1.calls.reset();
          listener2.calls.reset();
          listener3.calls.reset();

          model.$broadcast("abc");
          expect(listener1).not.toHaveBeenCalled();
          expect(listener2).toHaveBeenCalled();
          expect(listener3).toHaveBeenCalled();
        });

        it("should not call listener when removed by previous", () => {
          const listener1 = jasmine.createSpy("listener1");
          const remove1 = model.$on("abc", listener1);

          const listener2 = jasmine.createSpy("listener2").and.callFake(() => {
            remove3();
          });
          const remove2 = model.$on("abc", listener2);

          const listener3 = jasmine.createSpy("listener3");
          let remove3 = model.$on("abc", listener3);

          const listener4 = jasmine.createSpy("listener4");
          const remove4 = model.$on("abc", listener4);

          model.$broadcast("abc");
          expect(listener1).toHaveBeenCalled();
          expect(listener2).toHaveBeenCalled();
          expect(listener3).not.toHaveBeenCalled();
          expect(listener4).toHaveBeenCalled();

          listener1.calls.reset();
          listener2.calls.reset();
          listener3.calls.reset();
          listener4.calls.reset();

          model.$broadcast("abc");
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
        child = model.$new();
        grandChild = child.$new();
        greatGrandChild = grandChild.$new();

        model.id = 0;
        child.id = 1;
        grandChild.id = 2;
        greatGrandChild.id = 3;

        model.$on("myEvent", logger);
        child.$on("myEvent", logger);
        grandChild.$on("myEvent", logger);
        greatGrandChild.$on("myEvent", logger);
      });

      it("should do nothing on empty listener", () => {
        logs = "";
        const child = model.$new();

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
          debugger;
          expect(event.defaultPrevented).toBe(false);

          child.$on("myEvent", (event) => {
            debugger;
            event.preventDefault();
          });
          event = grandChild.$emit("myEvent");
          expect(event.defaultPrevented).toBe(true);
          expect(event.currentScope).toBe(null);
        });
      });
    });

    //   describe("$broadcast", () => {
    //     describe("event propagation", () => {
    //       let log;
    //       let child1;
    //       let child2;
    //       let child3;
    //       let grandChild11;
    //       let grandChild21;
    //       let grandChild22;
    //       let grandChild23;
    //       let greatGrandChild211;

    //       function logger(event) {
    //         log += `${event.currentScope.id}>`;
    //       }

    //       beforeEach(() => {
    //         log = "";
    //         child1 = model.$new();
    //         child2 = model.$new();
    //         child3 = model.$new();
    //         grandChild11 = child1.$new();
    //         grandChild21 = child2.$new();
    //         grandChild22 = child2.$new();
    //         grandChild23 = child2.$new();
    //         greatGrandChild211 = grandChild21.$new();

    //         model.id = 0;
    //         child1.id = 1;
    //         child2.id = 2;
    //         child3.id = 3;
    //         grandChild11.id = 11;
    //         grandChild21.id = 21;
    //         grandChild22.id = 22;
    //         grandChild23.id = 23;
    //         greatGrandChild211.id = 211;

    //         model.$on("myEvent", logger);
    //         child1.$on("myEvent", logger);
    //         child2.$on("myEvent", logger);
    //         child3.$on("myEvent", logger);
    //         grandChild11.$on("myEvent", logger);
    //         grandChild21.$on("myEvent", logger);
    //         grandChild22.$on("myEvent", logger);
    //         grandChild23.$on("myEvent", logger);
    //         greatGrandChild211.$on("myEvent", logger);

    //         //          R
    //         //       /  |   \
    //         //     1    2    3
    //         //    /   / | \
    //         //   11  21 22 23
    //         //       |
    //         //      211
    //       });

    //       it("should broadcast an event from the root scope", () => {
    //         model.$broadcast("myEvent");
    //         expect(log).toBe("0>1>11>2>21>211>22>23>3>");
    //       });

    //       it("should broadcast an event from a child scope", () => {
    //         child2.$broadcast("myEvent");
    //         expect(log).toBe("2>21>211>22>23>");
    //       });

    //       it("should broadcast an event from a leaf scope with a sibling", () => {
    //         grandChild22.$broadcast("myEvent");
    //         expect(log).toBe("22>");
    //       });

    //       it("should broadcast an event from a leaf scope without a sibling", () => {
    //         grandChild23.$broadcast("myEvent");
    //         expect(log).toBe("23>");
    //       });

    //       it("should not not fire any listeners for other events", () => {
    //         model.$broadcast("fooEvent");
    //         expect(log).toBe("");
    //       });

    //       it("should not descend past scopes with a $$listerCount of 0 or undefined", () => {
    //         const EVENT = "fooEvent";
    //         const spy = jasmine.createSpy("listener");

    //         // Precondition: There should be no listeners for fooEvent.
    //         expect(model.$$listenerCount[EVENT]).toBeUndefined();

    //         // Add a spy listener to a child scope.
    //         model.$$childHead.$$listeners[EVENT] = [spy];

    //         // model's count for 'fooEvent' is undefined, so spy should not be called.
    //         model.$broadcast(EVENT);
    //         expect(spy).not.toHaveBeenCalled();
    //       });

    //       it("should return event object", () => {
    //         const result = child1.$broadcast("some");

    //         expect(result).toBeDefined();
    //         expect(result.name).toBe("some");
    //         expect(result.targetScope).toBe(child1);
    //       });
    //     });

    //     describe("listener", () => {
    //       it("should receive event object", () => {
    //         const scope = model;
    //         const child = scope.$new();
    //         let eventFired = false;

    //         child.$on("fooEvent", (event) => {
    //           eventFired = true;
    //           expect(event.name).toBe("fooEvent");
    //           expect(event.targetScope).toBe(scope);
    //           expect(event.currentScope).toBe(child);
    //         });
    //         scope.$broadcast("fooEvent");

    //         expect(eventFired).toBe(true);
    //       });

    //       it("should have the event's `currentScope` property set to null after broadcast", () => {
    //         const scope = model;
    //         const child = scope.$new();
    //         let event;

    //         child.$on("fooEvent", (e) => {
    //           event = e;
    //         });
    //         scope.$broadcast("fooEvent");

    //         expect(event.name).toBe("fooEvent");
    //         expect(event.targetScope).toBe(scope);
    //         expect(event.currentScope).toBe(null);
    //       });

    //       it("should support passing messages as constargs", () => {
    //         const scope = model;
    //         const child = scope.$new();
    //         let args;

    //         child.$on("fooEvent", function () {
    //           args = arguments;
    //         });
    //         scope.$broadcast("fooEvent", "do", "re", "me", "fa");

    //         expect(args.length).toBe(5);
    //         expect(sliceArgs(args, 1)).toEqual(["do", "re", "me", "fa"]);
    //       });
    //     });
    //   });

    //   it("should allow recursive $emit/$broadcast", () => {
    //     let callCount = 0;
    //     model.$on("evt", ($event, arg0) => {
    //       callCount++;
    //       if (arg0 !== 1234) {
    //         model.$emit("evt", 1234);
    //         model.$broadcast("evt", 1234);
    //       }
    //     });

    //     model.$emit("evt");
    //     model.$broadcast("evt");
    //     expect(callCount).toBe(6);
    //   });

    //   it("should allow recursive $emit/$broadcast between parent/child", () => {
    //     const child = model.$new();
    //     let calls = "";

    //     model.$on("evt", ($event, arg0) => {
    //       calls += "r"; // For "root".
    //       if (arg0 === "fromChild") {
    //         model.$broadcast("evt", "fromRoot2");
    //       }
    //     });

    //     child.$on("evt", ($event, arg0) => {
    //       calls += "c"; // For "child".
    //       if (arg0 === "fromRoot1") {
    //         child.$emit("evt", "fromChild");
    //       }
    //     });

    //     model.$broadcast("evt", "fromRoot1");
    //     expect(calls).toBe("rccrrc");
    //   });
  });

  describe("doc examples", () => {
    it("should properly fire off watch listeners upon scope changes", async () => {
      // <docs tag="docs1">
      const scope = model.$new();
      scope.salutation = "Hello";
      scope.name = "World";
      await wait();
      expect(scope.greeting).toEqual(undefined);

      scope.$watch("name", () => {
        scope.greeting = `${scope.salutation} ${scope.name}!`;
      });

      expect(scope.greeting).toEqual(undefined);
      expect(scope.greeting).toEqual(undefined);
      scope.name = "Misko";
      await wait();
      expect(scope.greeting).toEqual("Hello Misko!");
    });
  });
});
