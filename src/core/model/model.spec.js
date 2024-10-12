import { wait } from "../../shared/test-utils";
import { createModel } from "./model";
import { Angular } from "../../loader";
import { createInjector } from "../di/injector";

describe("Model", () => {
  let model;
  let $parse;
  let logs;
  let $rootModel;

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

    let injector = createInjector(["myModule"]);
    $parse = injector.get("$parse");
    $rootModel = injector.get("$rootModel");
    model = $rootModel;
  });

  it("can be instantiated with plain object", async () => {
    model = createModel({ a: 1, b: { c: 2 } });
    expect(model).toBeDefined();
    expect(model.a).toEqual(1);
    expect(model.b.c).toEqual(2);
    model.a = 2;
    expect(model.a).toEqual(2);
    model.d = 3;
    expect(model.d).toEqual(3);
  });

  it("can register listeners via watch", async () => {
    var listenerFn = jasmine.createSpy();
    model.$watch(() => {}, listenerFn);
    model.$digest();
    expect(listenerFn).toHaveBeenCalled();
  });

  it("should return a deregistration function watch", async () => {
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
    model.$digest();
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

    model.someValue = "b";
    model.$watch(
      (m) => m.someValue,
      () => {
        model.counter++;
      },
    );
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
    expect(model.counter).toBe(0);
    model.aValue = "3";
    await wait();
    expect(model.counter).toBe(1);
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
        async () => {
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

      model.someValue = { b: { c: { d: 2 } } };
      await wait();

      expect(model.counter).toBe(1);

      model.someValue.b.c.d = 3;
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

  describe("inheritance", () => {
    it("can be constructed and used as an object", () => {
      const model = createModel();
      model.aProperty = 1;

      expect(model.aProperty).toBe(1);
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
  });

  describe("$id", () => {
    it("should have a unique id", () => {
      expect(model.$id < model.$new().$id).toBeTruthy();
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
      expect(child.$target.hasOwnProperty("$root")).toBeFalsy();
    });
  });

  describe("$parent", () => {
    it("should point to parent", () => {
      const child = model.$new();

      expect(model.$parent).toEqual(null);
      expect(child.$parent.$id).toEqual(model.$id);
      expect(child.$new().$parent).toEqual(child.$handler);
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

  describe("$watch/$digest", () => {
    it("calls the listener function of a watch on first $digest", function () {
      var watchFn = function () {
        return "wat";
      };
      var listenerFn = jasmine.createSpy();
      model.$watch(watchFn, listenerFn);
      model.$digest();
      expect(listenerFn).toHaveBeenCalled();
    });

    it("calls the watch function with the scope as the argument", function () {
      var watchFn = jasmine.createSpy();
      var listenerFn = function () {};
      model.$watch(watchFn, listenerFn);
      model.$digest();
      expect(watchFn).toHaveBeenCalledWith(model);
    });

    it("calls the listener function when the watched value changes", async function () {
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
      expect(model.counter).toBe(0);
      await wait();
      expect(model.counter).toBe(1);
      model.someValue = "2";
      expect(model.counter).toBe(1);
      await wait();
      expect(model.counter).toBe(2);
    });

    it("should watch and fire on simple property change", async () => {
      const spy = jasmine.createSpy();
      model.$watch("name", spy);
      model.$digest();
      spy.calls.reset();

      expect(spy).not.toHaveBeenCalled();
      model.$digest();
      expect(spy).toHaveBeenCalled();
      spy.calls.reset();

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
      model.$digest();
    });

    it("should watch and fire on expression change", async () => {
      const spy = jasmine.createSpy();
      model.$watch("name.first", spy);
      model.$digest();
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

      //   it("should remove $watchCollection of constant literals after initial digest", () => {
      //     model.$watchCollection("[]", () => {});
      //     model.$watchCollection("{}", () => {});
      //     model.$watchCollection("1", () => {});
      //     model.$watchCollection('"foo"', () => {});
      //     expect(model.$$watchersCount).not.toEqual(0);
      //     model.$digest();

      //     expect(model.$$watchersCount).toEqual(0);
      //   });

      //   it("should remove $watchGroup of constant literals after initial digest", () => {
      //     model.$watchGroup(["[]", "{}", "1", '"foo"'], () => {});
      //     expect(model.$$watchersCount).not.toEqual(0);
      //     model.$digest();

      //     expect(model.$$watchersCount).toEqual(0);
      //   });

      //   it("should remove $watch of filtered constant literals after initial digest", () => {
      //     model.$watch('[1] | filter:"x"', () => {});
      //     model.$watch("1 | limitTo:2", () => {});
      //     expect(model.$$watchersCount).not.toEqual(0);
      //     model.$digest();

      //     expect(model.$$watchersCount).toEqual(0);
      //   });

      //   it("should remove $watchCollection of filtered constant literals after initial digest", () => {
      //     model.$watchCollection('[1] | filter:"x"', () => {});
      //     expect(model.$$watchersCount).not.toEqual(0);
      //     model.$digest();

      //     expect(model.$$watchersCount).toEqual(0);
      //   });

      //   it("should remove $watchGroup of filtered constant literals after initial digest", () => {
      //     model.$watchGroup(['[1] | filter:"x"', "1 | limitTo:2"], () => {});
      //     expect(model.$$watchersCount).not.toEqual(0);
      //     model.$digest();

      //     expect(model.$$watchersCount).toEqual(0);
      //   });

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

      // it("should clean up stable watches from $watchCollection", () => {
      //   model.$watchCollection("::foo", () => {});
      //   expect(model.$$watchersCount).toEqual(1);

      //   model.$digest();
      //   expect(model.$$watchersCount).toEqual(1);

      //   model.foo = [];
      //   model.$digest();
      //   expect(model.$$watchersCount).toEqual(0);
      // });

      // it("should clean up stable watches from $watchCollection literals", () => {
      //   model.$watchCollection("::[foo, bar]", () => {});
      //   expect(model.$$watchersCount).toEqual(1);

      //   model.$digest();
      //   expect(model.$$watchersCount).toEqual(1);

      //   model.foo = 1;
      //   model.$digest();
      //   expect(model.$$watchersCount).toEqual(1);

      //   model.foo = 2;
      //   model.$digest();
      //   expect(model.$$watchersCount).toEqual(1);

      //   model.bar = 3;
      //   model.$digest();
      //   expect(model.$$watchersCount).toEqual(0);
      // });

      // it("should clean up stable watches from $watchGroup", () => {
      //   model.$watchGroup(["::foo", "::bar"], () => {});
      //   expect(model.$$watchersCount).toEqual(2);

      //   model.$digest();
      //   expect(model.$$watchersCount).toEqual(2);

      //   model.foo = "foo";
      //   model.$digest();
      //   expect(model.$$watchersCount).toEqual(1);

      //   model.bar = "bar";
      //   model.$digest();
      //   expect(model.$$watchersCount).toEqual(0);
      // });
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

    // it("should allow $digest on a child scope with and without a right sibling", () => {
    //   // tests a traversal edge case which we originally missed
    //   logs = "";
    //   const childA = model.$new();
    //   const childB = model.$new();

    //   model.$watch(() => {
    //     logs += "r";
    //   });
    //   childA.$watch(() => {
    //     logs += "a";
    //   });
    //   childB.$watch(() => {
    //     logs += "b";
    //   });

    //   // init
    //   model.$digest();
    //   expect(logs).toBe("rabrab");

    //   logs = "";
    //   childA.$digest();
    //   expect(logs).toBe("a");

    //   logs = "";
    //   childB.$digest();
    //   expect(logs).toBe("b");
    // });

    // it("should repeat watch cycle while model changes are identified", () => {
    //   logs = "";
    //   model.$watch("c", (v) => {
    //     model.d = v;
    //     logs += "c";
    //   });
    //   model.$watch("b", (v) => {
    //     model.c = v;
    //     logs += "b";
    //   });
    //   model.$watch("a", (v) => {
    //     model.b = v;
    //     logs += "a";
    //   });
    //   model.$digest();
    //   logs = "";
    //   model.a = 1;
    //   model.$digest();
    //   expect(model.b).toEqual(1);
    //   expect(model.c).toEqual(1);
    //   expect(model.d).toEqual(1);
    //   expect(logs).toEqual("abc");
    // });

    // it("should repeat watch cycle from the root element", () => {
    //   logs = "";
    //   const child = model.$new();
    //   model.$watch(() => {
    //     logs += "a";
    //   });
    //   child.$watch(() => {
    //     logs += "b";
    //   });
    //   model.$digest();
    //   expect(logs).toEqual("abab");
    // });

    // it("should prevent infinite recursion and print watcher expression", () => {
    //   model.$watch("a", function () {
    //     model.b++;
    //   });
    //   model.$watch("b", function () {
    //     model.a++;
    //   });
    //   model.a = model.b = 0;
    //   expect(function () {
    //     model.$digest();
    //   }).toThrow();

    //   expect(model.$$phase).toBe(0);
    // });

    // it("should prevent infinite recursion and print watcher function name or body", () => {
    //   model.$watch(
    //     () => model.a,
    //     () => {
    //       model.b++;
    //     },
    //   );
    //   model.$watch(
    //     () => model.b,
    //     () => {
    //       model.a++;
    //     },
    //   );
    //   model.a = model.b = 0;

    //   try {
    //     model.$digest();
    //     throw new Error("Should have thrown exception");
    //   } catch (e) {
    //     console.error(e);
    //     expect(e.message.match(/rootScope.a/g).length).toBeTruthy();
    //     expect(e.message.match(/rootScope.b/g).length).toBeTruthy();
    //   }
    // });

    // // it("should prevent infinite loop when creating and resolving a promise in a watched expression", () => {
    // //   module((modelProvider) => {
    // //     modelProvider.digestTtl(10);
    // //   });
    // //   () => {
    // //     const d = $q.defer();

    // //     d.resolve("Hello, world.");
    // //     model.$watch(
    // //       () => {
    // //         const $d2 = $q.defer();
    // //         $d2.resolve("Goodbye.");
    // //         $d2.promise.then(() => {});
    // //         return d.promise;
    // //       },
    // //       () => 0,
    // //     );

    // //     expect(() => {
    // //       model.$digest();
    // //     }).toThrow(
    // //       "model",
    // //       "infdig",
    // //       "10 $digest() iterations reached. Aborting!\n" +
    // //         "Watchers fired in the last 5 iterations: []",
    // //     );

    // //     expect(model.$$phase).toBeNull();
    // //   });
    // // });

    // it("should not fire upon $watch registration on initial $digest", () => {
    //   logs = "";
    //   model.a = 1;
    //   model.$watch("a", () => {
    //     logs += "a";
    //   });
    //   model.$watch("b", () => {
    //     logs += "b";
    //   });
    //   model.$digest();
    //   logs = "";
    //   model.$digest();
    //   expect(logs).toEqual("");
    // });

    // it("should watch objects", () => {
    //   logs = "";
    //   model.a = [];
    //   model.b = {};
    //   model.$watch(
    //     "a",
    //     (value) => {
    //       logs += ".";
    //       expect(value).toBe(model.a);
    //     },
    //     true,
    //   );
    //   model.$watch(
    //     "b",
    //     (value) => {
    //       logs += "!";
    //       expect(value).toBe(model.b);
    //     },
    //     true,
    //   );
    //   model.$digest();
    //   logs = "";

    //   model.a.push({});
    //   model.b.name = "";

    //   model.$digest();
    //   expect(logs).toEqual(".!");
    // });

    // it("should watch functions", () => {
    //   model.fn = function () {
    //     return "a";
    //   };
    //   model.$watch("fn", (fn) => {
    //     logs.push(fn());
    //   });
    //   model.$digest();
    //   expect(logs).toEqual(["a"]);
    //   model.fn = function () {
    //     return "b";
    //   };
    //   model.$digest();
    //   expect(logs).toEqual(["a", "b"]);
    // });

    // it("should prevent $digest recursion", () => {
    //   let callCount = 0;
    //   model.$watch("name", () => {
    //     expect(() => {
    //       model.$digest();
    //     }).toThrowError(/digest already in progress/);
    //     callCount++;
    //   });
    //   model.name = "a";
    //   model.$digest();
    //   expect(callCount).toEqual(1);
    // });

    // it("should allow a watch to be added while in a digest", () => {
    //   const watch1 = jasmine.createSpy("watch1");
    //   const watch2 = jasmine.createSpy("watch2");
    //   model.$watch("foo", () => {
    //     model.$watch("foo", watch1);
    //     model.$watch("foo", watch2);
    //   });
    //   model.$apply("foo = true");
    //   expect(watch1).toHaveBeenCalled();
    //   expect(watch2).toHaveBeenCalled();
    // });

    // it("should not skip watchers when adding new watchers during digest", () => {
    //   const watchFn1 = function () {
    //     logs.push(1);
    //   };
    //   const watchFn2 = function () {
    //     logs.push(2);
    //   };
    //   const watchFn3 = function () {
    //     logs.push(3);
    //   };
    //   const addWatcherOnce = function (newValue, oldValue) {
    //     if (newValue === oldValue) {
    //       model.$watch(watchFn3);
    //     }
    //   };

    //   model.$watch(watchFn1, addWatcherOnce);
    //   model.$watch(watchFn2);

    //   model.$digest();

    //   expect(logs).toEqual([1, 2, 3, 1, 2, 3]);
    // });

    // it("should not run the current watcher twice when removing a watcher during digest", () => {
    //   let removeWatcher3;

    //   const watchFn3 = function () {
    //     logs.push(3);
    //   };
    //   const watchFn2 = function () {
    //     logs.push(2);
    //   };
    //   const watchFn1 = function () {
    //     logs.push(1);
    //   };
    //   const removeWatcherOnce = function (newValue, oldValue) {
    //     if (newValue === oldValue) {
    //       removeWatcher3();
    //     }
    //   };

    //   model.$watch(watchFn1, removeWatcherOnce);
    //   model.$watch(watchFn2);
    //   removeWatcher3 = model.$watch(watchFn3);

    //   model.$digest();

    //   expect(logs).toEqual([1, 2, 1, 2]);
    // });

    // it("should not skip watchers when removing itself during digest", () => {
    //   let removeWatcher1;

    //   const watchFn3 = function () {
    //     logs.push(3);
    //   };
    //   const watchFn2 = function () {
    //     logs.push(2);
    //   };
    //   const watchFn1 = function () {
    //     logs.push(1);
    //   };
    //   const removeItself = function () {
    //     removeWatcher1();
    //   };

    //   removeWatcher1 = model.$watch(watchFn1, removeItself);
    //   model.$watch(watchFn2);
    //   model.$watch(watchFn3);

    //   model.$digest();

    //   expect(logs).toEqual([1, 2, 3, 2, 3]);
    // });

    // it("should not infinitely digest when current value is NaN", () => {
    //   model.$watch(() => NaN);

    //   expect(() => {
    //     model.$digest();
    //   }).not.toThrow();
    // });

    // it("should always call the watcher with newVal and oldVal equal on the first run", () => {
    //   function logger(scope, newVal, oldVal) {
    //     const val =
    //       newVal === oldVal || (newVal !== oldVal && oldVal !== newVal)
    //         ? newVal
    //         : "xxx";
    //     logs.push(val);
    //   }

    //   model.$watch(() => NaN, logger);
    //   model.$watch(() => undefined, logger);
    //   model.$watch(() => "", logger);
    //   model.$watch(() => false, logger);
    //   model.$watch(() => ({}), logger, true);
    //   model.$watch(() => 23, logger);

    //   model.$digest();
    //   expect(isNaN(logs.shift())).toBe(true); // jasmine's toBe and toEqual don't work well with NaNs
    //   expect(logs).toEqual([undefined, "", false, {}, 23]);
    //   logs = [];
    //   model.$digest();
    //   expect(logs).toEqual([]);
    // });

    // describe("$watch deregistration", () => {
    //   beforeEach(() => (logs = []));
    //   it("should return a function that allows listeners to be deregistered", () => {
    //     const listener = jasmine.createSpy("watch listener");
    //     let listenerRemove;

    //     listenerRemove = model.$watch("foo", listener);
    //     model.$digest(); // init
    //     expect(listener).toHaveBeenCalled();
    //     expect(listenerRemove).toBeDefined();

    //     listener.calls.reset();
    //     model.foo = "bar";
    //     model.$digest(); // trigger
    //     expect(listener).toHaveBeenCalled();

    //     listener.calls.reset();
    //     model.foo = "baz";
    //     listenerRemove();
    //     model.$digest(); // trigger
    //     expect(listener).not.toHaveBeenCalled();
    //   });

    //   it("should allow a watch to be deregistered while in a digest", () => {
    //     let remove1;
    //     let remove2;
    //     model.$watch("remove", () => {
    //       remove1();
    //       remove2();
    //     });
    //     remove1 = model.$watch("thing", () => {});
    //     remove2 = model.$watch("thing", () => {});
    //     expect(() => {
    //       model.$apply("remove = true");
    //     }).not.toThrow();
    //   });

    //   it("should not mess up the digest loop if deregistration happens during digest", () => {
    //     // we are testing this due to regression #5525 which is related to how the digest loops lastDirtyWatch short-circuiting optimization works
    //     // scenario: watch1 deregistering watch1
    //     let scope = model.$new();
    //     let deregWatch1 = scope.$watch(
    //       () => {
    //         logs.push("watch1");
    //         return "watch1";
    //       },
    //       () => {
    //         deregWatch1();
    //         logs.push("watchAction1");
    //       },
    //     );
    //     scope.$watch(
    //       () => {
    //         logs.push("watch2");
    //         return "watch2";
    //       },
    //       () => logs.push("watchAction2"),
    //     );
    //     scope.$watch(
    //       () => {
    //         logs.push("watch3");
    //         return "watch3";
    //       },
    //       () => logs.push("watchAction3"),
    //     );

    //     model.$digest();

    //     expect(logs).toEqual([
    //       "watch1",
    //       "watchAction1",
    //       "watch2",
    //       "watchAction2",
    //       "watch3",
    //       "watchAction3",
    //       "watch2",
    //       "watch3",
    //     ]);
    //     scope.$destroy();
    //     logs = [];

    //     // scenario: watch1 deregistering watch2
    //     scope = model.$new();
    //     scope.$watch(
    //       () => {
    //         logs.push("watch1");
    //         return "watch1";
    //       },
    //       () => {
    //         deregWatch2();
    //         logs.push("watchAction1");
    //       },
    //     );
    //     let deregWatch2 = scope.$watch(
    //       () => {
    //         logs.push("watch2");
    //         return "watch2";
    //       },
    //       () => logs.push("watchAction2"),
    //     );
    //     scope.$watch(
    //       () => {
    //         logs.push("watch3");
    //         return "watch3";
    //       },
    //       () => logs.push("watchAction3"),
    //     );

    //     model.$digest();

    //     expect(logs).toEqual([
    //       "watch1",
    //       "watchAction1",
    //       "watch3",
    //       "watchAction3",
    //       "watch1",
    //       "watch3",
    //     ]);
    //     scope.$destroy();
    //     logs = [];

    //     // scenario: watch2 deregistering watch1
    //     scope = model.$new();
    //     deregWatch1 = scope.$watch(
    //       () => {
    //         logs.push("watch1");
    //         return "watch1";
    //       },
    //       () => logs.push("watchAction1"),
    //     );
    //     scope.$watch(
    //       () => {
    //         logs.push("watch2");
    //         return "watch2";
    //       },
    //       () => {
    //         deregWatch1();
    //         logs.push("watchAction2");
    //       },
    //     );
    //     scope.$watch(
    //       () => {
    //         logs.push("watch3");
    //         return "watch3";
    //       },
    //       () => logs.push("watchAction3"),
    //     );

    //     model.$digest();

    //     expect(logs).toEqual([
    //       "watch1",
    //       "watchAction1",
    //       "watch2",
    //       "watchAction2",
    //       "watch3",
    //       "watchAction3",
    //       "watch2",
    //       "watch3",
    //     ]);
    //   });
    // });

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
    //       model.$digest();
    //       expect(logs).toEqual([
    //         { newVal: undefined, oldVal: undefined, identical: true },
    //       ]);
    //       logs = [];
    //       model.$digest();
    //       expect(logs).toEqual([]);
    //     });

    //     it("should allow deregistration", () => {
    //       model.obj = [];
    //       model.$digest();
    //       expect(logs.length).toBe(1);
    //       logs = [];

    //       model.obj.push("a");
    //       deregister();

    //       model.$digest();
    //       expect(logs).toEqual([]);
    //     });

    //     describe("array", () => {
    //       it("should return oldCollection === newCollection only on the first listener call", () => {
    //         // first time should be identical
    //         model.obj = ["a", "b"];
    //         model.$digest();
    //         expect(logs).toEqual([
    //           { newVal: ["a", "b"], oldVal: ["a", "b"], identical: true },
    //         ]);
    //         logs = [];

    //         // second time should be different
    //         model.obj[1] = "c";
    //         model.$digest();
    //         expect(logs).toEqual([{ newVal: ["a", "c"], oldVal: ["a", "b"] }]);
    //       });

    //       it("should trigger when property changes into array", () => {
    //         model.obj = "test";
    //         model.$digest();
    //         expect(logs).toEqual([
    //           { newVal: "test", oldVal: "test", identical: true },
    //         ]);

    //         logs = [];
    //         model.obj = [];
    //         model.$digest();
    //         expect(logs).toEqual([{ newVal: [], oldVal: "test" }]);

    //         logs = [];
    //         model.obj = {};
    //         model.$digest();
    //         expect(logs).toEqual([{ newVal: {}, oldVal: [] }]);

    //         logs = [];
    //         model.obj = [];
    //         model.$digest();
    //         expect(logs).toEqual([{ newVal: [], oldVal: {} }]);

    //         logs = [];
    //         model.obj = undefined;
    //         model.$digest();
    //         expect(logs).toEqual([{ newVal: undefined, oldVal: [] }]);
    //       });

    //       it("should not trigger change when object in collection changes", () => {
    //         model.obj = [{}];
    //         model.$digest();
    //         expect(logs).toEqual([
    //           { newVal: [{}], oldVal: [{}], identical: true },
    //         ]);

    //         logs = [];
    //         model.obj[0].name = "foo";
    //         model.$digest();
    //         expect(logs).toEqual([]);
    //       });

    //       it("should watch array properties", () => {
    //         model.obj = [];
    //         model.$digest();
    //         expect(logs).toEqual([{ newVal: [], oldVal: [], identical: true }]);

    //         logs = [];
    //         model.obj.push("a");
    //         model.$digest();
    //         expect(logs).toEqual([{ newVal: ["a"], oldVal: [] }]);

    //         logs = [];
    //         model.obj[0] = "b";
    //         model.$digest();
    //         expect(logs).toEqual([{ newVal: ["b"], oldVal: ["a"] }]);

    //         logs = [];
    //         model.obj.push([]);
    //         model.obj.push({});
    //         model.$digest();
    //         expect(logs).toEqual([{ newVal: ["b", [], {}], oldVal: ["b"] }]);

    //         logs = [];
    //         const temp = model.obj[1];
    //         model.obj[1] = model.obj[2];
    //         model.obj[2] = temp;
    //         model.$digest();
    //         expect(logs).toEqual([
    //           { newVal: ["b", {}, []], oldVal: ["b", [], {}] },
    //         ]);

    //         logs = [];
    //         model.obj.shift();
    //         model.$digest();
    //         expect(logs).toEqual([{ newVal: [{}, []], oldVal: ["b", {}, []] }]);
    //       });

    //       it("should not infinitely digest when current value is NaN", () => {
    //         model.obj = [NaN];
    //         expect(() => {
    //           model.$digest();
    //         }).not.toThrow();
    //       });

    //       it("should watch array-like objects like arrays", () => {
    //         logs = [];
    //         model.obj = document.getElementsByTagName("src");
    //         model.$digest();

    //         expect(logs.length).toBeTruthy();
    //       });
    //     });

    //     describe("object", () => {
    //       it("should return oldCollection === newCollection only on the first listener call", () => {
    //         model.obj = { a: "b" };
    //         // first time should be identical
    //         model.$digest();
    //         expect(logs).toEqual([
    //           { newVal: { a: "b" }, oldVal: { a: "b" }, identical: true },
    //         ]);
    //         logs = [];

    //         // second time not identical
    //         model.obj.a = "c";
    //         model.$digest();
    //         expect(logs).toEqual([{ newVal: { a: "c" }, oldVal: { a: "b" } }]);
    //       });

    //       it("should trigger when property changes into object", () => {
    //         model.obj = "test";
    //         model.$digest();
    //         expect(logs).toEqual([
    //           { newVal: "test", oldVal: "test", identical: true },
    //         ]);
    //         logs = [];

    //         model.obj = {};
    //         model.$digest();
    //         expect(logs).toEqual([{ newVal: {}, oldVal: "test" }]);
    //       });

    //       it("should not trigger change when object in collection changes", () => {
    //         model.obj = { name: {} };
    //         model.$digest();
    //         expect(logs).toEqual([
    //           { newVal: { name: {} }, oldVal: { name: {} }, identical: true },
    //         ]);
    //         logs = [];

    //         model.obj.name.bar = "foo";
    //         model.$digest();
    //         expect(logs).toEqual([]);
    //       });

    //       it("should watch object properties", () => {
    //         model.obj = {};
    //         model.$digest();
    //         expect(logs).toEqual([{ newVal: {}, oldVal: {}, identical: true }]);
    //         logs = [];
    //         model.obj.a = "A";
    //         model.$digest();
    //         expect(logs).toEqual([{ newVal: { a: "A" }, oldVal: {} }]);

    //         logs = [];
    //         model.obj.a = "B";
    //         model.$digest();
    //         expect(logs).toEqual([{ newVal: { a: "B" }, oldVal: { a: "A" } }]);

    //         logs = [];
    //         model.obj.b = [];
    //         model.obj.c = {};
    //         model.$digest();
    //         expect(logs).toEqual([
    //           { newVal: { a: "B", b: [], c: {} }, oldVal: { a: "B" } },
    //         ]);

    //         logs = [];
    //         const temp = model.obj.a;
    //         model.obj.a = model.obj.b;
    //         model.obj.c = temp;
    //         model.$digest();
    //         expect(logs).toEqual([
    //           {
    //             newVal: { a: [], b: [], c: "B" },
    //             oldVal: { a: "B", b: [], c: {} },
    //           },
    //         ]);

    //         logs = [];
    //         delete model.obj.a;
    //         model.$digest();
    //         expect(logs).toEqual([
    //           { newVal: { b: [], c: "B" }, oldVal: { a: [], b: [], c: "B" } },
    //         ]);
    //       });

    //       it("should not infinitely digest when current value is NaN", () => {
    //         model.obj = { a: NaN };
    //         expect(() => {
    //           model.$digest();
    //         }).not.toThrow();
    //       });

    //       it("should handle objects created using `Object.create(null)`", () => {
    //         model.obj = Object.create(null);
    //         model.obj.a = "a";
    //         model.obj.b = "b";
    //         model.$digest();
    //         expect(logs[0].newVal).toEqual(
    //           extend(Object.create(null), { a: "a", b: "b" }),
    //         );

    //         delete model.obj.b;
    //         model.$digest();
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
    //         model.$digest();
    //         expect(logs).toEqual([
    //           { newVal: ["a"], oldVal: ["a"], identical: true },
    //         ]);
    //         logs = [];

    //         // second time should be different
    //         model.obj = "b";
    //         model.$digest();
    //         expect(logs).toEqual([{ newVal: ["b"], oldVal: ["a"] }]);
    //       });

    //       it("should trigger when property changes into array", () => {
    //         model.obj = "test";
    //         model.$digest();
    //         expect(logs).toEqual([
    //           { newVal: ["test"], oldVal: ["test"], identical: true },
    //         ]);

    //         logs = [];
    //         model.obj = [];
    //         model.$digest();
    //         expect(logs).toEqual([{ newVal: [[]], oldVal: ["test"] }]);

    //         logs = [];
    //         model.obj = {};
    //         model.$digest();
    //         expect(logs).toEqual([{ newVal: [{}], oldVal: [[]] }]);

    //         logs = [];
    //         model.obj = [];
    //         model.$digest();
    //         expect(logs).toEqual([{ newVal: [[]], oldVal: [{}] }]);

    //         logs = [];
    //         model.obj = undefined;
    //         model.$digest();
    //         expect(logs).toEqual([{ newVal: [undefined], oldVal: [[]] }]);
    //       });

    //       it("should not trigger change when object in collection changes", () => {
    //         model.obj = {};
    //         model.$digest();
    //         expect(logs).toEqual([
    //           { newVal: [{}], oldVal: [{}], identical: true },
    //         ]);

    //         logs = [];
    //         model.obj.name = "foo";
    //         model.$digest();
    //         expect(logs).toEqual([]);
    //       });

    //       it("should not infinitely digest when current value is NaN", () => {
    //         model.obj = NaN;
    //         expect(() => {
    //           model.$digest();
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
    //         model.$digest();
    //         expect(logs).toEqual([
    //           { newVal: { a: "b" }, oldVal: { a: "b" }, identical: true },
    //         ]);

    //         // second time not identical
    //         logs = [];
    //         model.obj = "c";
    //         model.$digest();
    //         expect(logs).toEqual([{ newVal: { a: "c" }, oldVal: { a: "b" } }]);
    //       });

    //       it("should trigger when property changes into object", () => {
    //         model.obj = "test";
    //         model.$digest();
    //         expect(logs).toEqual([
    //           { newVal: { a: "test" }, oldVal: { a: "test" }, identical: true },
    //         ]);

    //         logs = [];
    //         model.obj = {};
    //         model.$digest();
    //         expect(logs).toEqual([
    //           { newVal: { a: {} }, oldVal: { a: "test" } },
    //         ]);
    //       });

    //       it("should not trigger change when object in collection changes", () => {
    //         model.obj = { name: "foo" };
    //         model.$digest();
    //         expect(logs).toEqual([
    //           {
    //             newVal: { a: { name: "foo" } },
    //             oldVal: { a: { name: "foo" } },
    //             identical: true,
    //           },
    //         ]);

    //         logs = [];
    //         model.obj.name = "bar";
    //         model.$digest();
    //         expect(logs).toEqual([]);
    //       });

    //       it("should watch object properties", () => {
    //         model.obj = {};
    //         model.$digest();
    //         expect(logs).toEqual([
    //           { newVal: { a: {} }, oldVal: { a: {} }, identical: true },
    //         ]);

    //         logs = [];
    //         model.obj = "A";
    //         model.$digest();
    //         expect(logs).toEqual([{ newVal: { a: "A" }, oldVal: { a: {} } }]);

    //         logs = [];
    //         model.obj = "B";
    //         model.$digest();
    //         expect(logs).toEqual([{ newVal: { a: "B" }, oldVal: { a: "A" } }]);

    //         logs = [];
    //         model.obj = [];
    //         model.$digest();
    //         expect(logs).toEqual([{ newVal: { a: [] }, oldVal: { a: "B" } }]);

    //         logs = [];
    //         delete model.obj;
    //         model.$digest();
    //         expect(logs).toEqual([
    //           { newVal: { a: undefined }, oldVal: { a: [] } },
    //         ]);
    //       });

    //       it("should not infinitely digest when current value is NaN", () => {
    //         model.obj = NaN;
    //         expect(() => {
    //           model.$digest();
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
    //         model.$digest();
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
    //         model.$digest();
    //         expect(logs).toEqual([
    //           { newVal: { a: "test" }, oldVal: { a: "test" }, identical: true },
    //         ]);

    //         logs = [];
    //         model.key = "b";
    //         model.$digest();
    //         expect(logs).toEqual([
    //           { newVal: { b: "test" }, oldVal: { a: "test" } },
    //         ]);

    //         logs = [];
    //         model.key = true;
    //         model.$digest();
    //         expect(logs).toEqual([
    //           { newVal: { true: "test" }, oldVal: { b: "test" } },
    //         ]);
    //       });

    //       it("should not trigger when key changes but stringified key does not", () => {
    //         model.key = 1;
    //         model.obj = "test";
    //         model.$digest();
    //         expect(logs).toEqual([
    //           { newVal: { 1: "test" }, oldVal: { 1: "test" }, identical: true },
    //         ]);

    //         logs = [];
    //         model.key = "1";
    //         model.$digest();
    //         expect(logs).toEqual([]);

    //         model.key = true;
    //         model.$digest();
    //         expect(logs).toEqual([
    //           { newVal: { true: "test" }, oldVal: { 1: "test" } },
    //         ]);

    //         logs = [];
    //         model.key = "true";
    //         model.$digest();
    //         expect(logs).toEqual([]);

    //         logs = [];
    //         model.key = {};
    //         model.$digest();
    //         expect(logs).toEqual([
    //           {
    //             newVal: { "[object Object]": "test" },
    //             oldVal: { true: "test" },
    //           },
    //         ]);

    //         logs = [];
    //         model.key = {};
    //         model.$digest();
    //         expect(logs).toEqual([]);
    //       });

    //       it("should not trigger change when object in collection changes", () => {
    //         model.key = "a";
    //         model.obj = { name: "foo" };
    //         model.$digest();
    //         expect(logs).toEqual([
    //           {
    //             newVal: { a: { name: "foo" } },
    //             oldVal: { a: { name: "foo" } },
    //             identical: true,
    //           },
    //         ]);
    //         logs = [];

    //         model.obj.name = "bar";
    //         model.$digest();
    //         expect(logs).toEqual([]);
    //       });

    //       it("should not infinitely digest when key value is NaN", () => {
    //         model.key = NaN;
    //         model.obj = NaN;
    //         expect(() => {
    //           model.$digest();
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
    //     model.$digest();
    //     expect(watchSpy).not.toHaveBeenCalled();
    //   });

    //   it("should resume watchers on scope", () => {
    //     const watchSpy = jasmine.createSpy("watchSpy");
    //     model.$watch(watchSpy);
    //     model.$suspend();
    //     model.$resume();
    //     model.$digest();
    //     expect(watchSpy).toHaveBeenCalled();
    //   });

    //   it("should suspend watchers on child scope", () => {
    //     const watchSpy = jasmine.createSpy("watchSpy");
    //     const scope = model.$new(true);
    //     scope.$watch(watchSpy);
    //     model.$suspend();
    //     model.$digest();
    //     expect(watchSpy).not.toHaveBeenCalled();
    //   });

    //   it("should resume watchers on child scope", () => {
    //     const watchSpy = jasmine.createSpy("watchSpy");
    //     const scope = model.$new(true);
    //     scope.$watch(watchSpy);
    //     model.$suspend();
    //     model.$resume();
    //     model.$digest();
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
    //     model.$digest();
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
    //   scope.$digest();
    //   logs = [];
    // }

    // describe("optimizations", () => {
    //   beforeEach(() => (logs = []));
    //   it("should check watches only once during an empty digest", () => {
    //     setupWatches(model, console.log);
    //     model.$digest();
    //     expect(logs).toEqual(["w1", "w2", "w3"]);
    //   });

    //   it("should quit digest early after we check the last watch that was previously dirty", () => {
    //     setupWatches(model, console.log);
    //     model.w1 = "x";
    //     model.$digest();
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
    //     model.$digest();
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
    //     model.$digest();
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

    //     model.$digest();
    //     logs = [];

    //     model.w1 = "x";
    //     model.w4 = "x";
    //     model.$digest();
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
    it("should eval an expression", () => {
      expect(model.$eval("a=1")).toEqual(1);
      expect(model.a).toEqual(1);

      model.$eval((self) => {
        self.b = 2;
      });
      expect(model.b).toEqual(2);
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

  // describe("$evalAsync", () => {
  //   // it("should run callback before $watch", () => {
  //   //   let log = "";
  //   //   const child = model.$new();
  //   //   model.$evalAsync(() => {
  //   //     log += "parent.async;";
  //   //   });
  //   //   model.$watch("value", () => {
  //   //     log += "parent.$digest;";
  //   //   });
  //   //   child.$evalAsync(() => {
  //   //     log += "child.async;";
  //   //   });
  //   //   child.$watch("value", () => {
  //   //     log += "child.$digest;";
  //   //   });
  //   //   model.value = 1;
  //   //   expect(log).toEqual(
  //   //     "parent.async;child.async;parent.$digest;child.$digest;",
  //   //   );
  //   // });

  //   // it("should not run another digest for an $$postDigest call", () => {
  //   //   let internalWatchCount = 0;
  //   //   let externalWatchCount = 0;

  //   //   model.internalCount = 0;
  //   //   model.externalCount = 0;

  //   //   model.$evalAsync((scope) => {
  //   //     model.internalCount++;
  //   //   });

  //   //   model.$$postDigest((scope) => {
  //   //     model.externalCount++;
  //   //   });

  //   //   model.$watch("internalCount", (value) => {
  //   //     internalWatchCount = value;
  //   //   });
  //   //   model.$watch("externalCount", (value) => {
  //   //     externalWatchCount = value;
  //   //   });

  //   //   model.$digest();

  //   //   expect(internalWatchCount).toEqual(1);
  //   //   expect(externalWatchCount).toEqual(0);
  //   // });

  //   // it("should cause a $digest rerun", () => {
  //   //   model.log = "";
  //   //   model.value = 0;
  //   //   model.$watch("value", () => {
  //   //     model.log += ".";
  //   //   });
  //   //   model.$watch("init", () => {
  //   //     model.$evalAsync('value = 123; log = log + "=" ');
  //   //     expect(model.value).toEqual(0);
  //   //   });
  //   //   model.$digest();
  //   //   expect(model.log).toEqual(".=.");
  //   // });

  //   // it("should run async in the same order as added", () => {
  //   //   model.log = "";
  //   //   model.$evalAsync("log = log + 1");
  //   //   model.$evalAsync("log = log + 2");
  //   //   model.$digest();
  //   //   expect(model.log).toBe("12");
  //   // });

  //   // it("should allow passing locals to the expression", () => {
  //   //   model.log = "";
  //   //   model.$evalAsync("log = log + a", { a: 1 });
  //   //   model.$digest();
  //   //   expect(model.log).toBe("1");
  //   // });

  //   // it("should run async expressions in their proper context", () => {
  //   //   const child = model.$new();
  //   //   model.ctx = "root context";
  //   //   model.log = "";
  //   //   child.ctx = "child context";
  //   //   child.log = "";
  //   //   child.$evalAsync("log=ctx");
  //   //   model.$digest();
  //   //   expect(model.log).toBe("");
  //   //   expect(child.log).toBe("child context");
  //   // });

  //   // it("should operate only with a single queue across all child and isolate scopes", () => {
  //   //   const childScope = model.$new();
  //   //   const isolateScope = model.$new(true);

  //   //   model.$evalAsync("rootExpression");
  //   //   childScope.$evalAsync("childExpression");
  //   //   isolateScope.$evalAsync("isolateExpression");
  //   //   expect($$asyncQueue).toEqual([
  //   //     {
  //   //       scope: model,
  //   //       fn: $parse("rootExpression"),
  //   //       locals: undefined,
  //   //     },
  //   //     {
  //   //       scope: childScope,
  //   //       fn: $parse("childExpression"),
  //   //       locals: undefined,
  //   //     },
  //   //     {
  //   //       scope: isolateScope,
  //   //       fn: $parse("isolateExpression"),
  //   //       locals: undefined,
  //   //     },
  //   //   ]);
  //   // });

  //   // describe("auto-flushing when queueing outside of an $apply", () => {
  //   //   it("should auto-flush the queue asynchronously and trigger digest", () => {
  //   //     logs = [];
  //   //     model.$evalAsync(() => {
  //   //       logs.push("eval-ed!");
  //   //       return "eval-ed!";
  //   //     });
  //   //     model.$watch(() => {
  //   //       logs.push("digesting");
  //   //       return "digesting";
  //   //     });
  //   //     expect(logs).toEqual([]);
  //   //     setTimeout(() => {
  //   //       expect(logs).toEqual(["eval-ed!", "digesting", "digesting"]);
  //   //     });
  //   //   });

  //   //   it("should not trigger digest asynchronously if the queue is empty in the next tick", () => {
  //   //     logs = [];
  //   //     model.$evalAsync(() => {
  //   //       logs.push("eval-ed!");
  //   //       return "eval-ed!";
  //   //     });
  //   //     model.$watch(() => {
  //   //       logs.push("digesting");
  //   //       return "digesting";
  //   //     });
  //   //     expect(logs).toEqual([]);

  //   //     model.$digest();

  //   //     expect(logs).toEqual(["eval-ed!", "digesting", "digesting"]);
  //   //     logs = [];

  //   //     setTimeout(() => {
  //   //       expect(logs).toEqual([]);
  //   //     });
  //   //   });

  //   //   it("should not schedule more than one auto-flush task", () => {
  //   //     logs = [];
  //   //     model.$evalAsync(() => {
  //   //       logs.push("eval-ed 1!");
  //   //       return "eval-ed 1!";
  //   //     });
  //   //     model.$evalAsync(() => {
  //   //       logs.push("eval-ed 2!");
  //   //       return "eval-ed 2!";
  //   //     });
  //   //     expect(logs).toEqual([]);
  //   //     setTimeout(() => {
  //   //       expect(logs).toEqual(["eval-ed 1!", "eval-ed 2!"]);
  //   //     });

  //   //     setTimeout(() => {
  //   //       expect(logs).toEqual(["eval-ed 1!", "eval-ed 2!"]);
  //   //     });
  //   //   });

  //   //   it("should not have execution affected by an explicit $digest call", () => {
  //   //     const scope1 = model.$new();
  //   //     const scope2 = model.$new();

  //   //     scope1.$watch("value", (value) => {
  //   //       scope1.result = value;
  //   //     });

  //   //     scope1.$evalAsync(() => {
  //   //       scope1.value = "bar";
  //   //     });

  //   //     expect(scope1.result).toBe(undefined);
  //   //     scope2.$digest();

  //   //     setTimeout(() => expect(scope1.result).toBe("bar"));
  //   //   });
  //   // });

  //   // it("should not pass anything as `this` to scheduled functions", () => {
  //   //   let this1 = {};
  //   //   const this2 = (function () {
  //   //     return this;
  //   //   })();
  //   //   model.$evalAsync(function () {
  //   //     this1 = this;
  //   //   });
  //   //   model.$digest();
  //   //   expect(this1).toEqual(this2);
  //   // });
  // });
});
