import { $$asyncQueue, Scope, ScopePhase } from "./scope";
import { extend, sliceArgs } from "../../shared/utils";
import { Angular } from "../../loader";
import { createInjector } from "../di/injector";

describe("Scope", function () {
  let $rootScope;
  let $parse;
  let $browser;
  let logs;
  let scope;
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
    $browser = injector.get("$browser");

    $rootScope = injector.get("$rootScope");
    scope = $rootScope;
  });

  describe("class", () => {
    it("can be constructed as a class", () => {
      const scope = new Scope();
      expect(scope).toBeDefined();
      expect(scope.isRoot).toBeFalse();
    });

    it("can be constructed as a root scope", () => {
      const scope = new Scope(true);
      expect(scope).toBeDefined();
      expect(scope.isRoot).toBeTrue();
    });
  });

  describe("inheritance", () => {
    it("can be constructed and used as an object", () => {
      const scope = $rootScope.$new();
      scope.aProperty = 1;

      expect(scope.aProperty).toBe(1);
    });

    it("inherits the parents properties", () => {
      $rootScope.aValue = [1, 2, 3];

      const child = $rootScope.$new();

      expect(child.aValue).toEqual([1, 2, 3]);
    });

    it("does not cause a parent to inherit its properties", () => {
      const child = $rootScope.$new();
      child.aValue = [1, 2, 3];

      expect($rootScope.aValue).toBeUndefined();
    });

    it("inherits the parents properties whenever they are defined", () => {
      const child = $rootScope.$new();

      $rootScope.aValue = [1, 2, 3];

      expect(child.aValue).toEqual([1, 2, 3]);
    });

    it("can be nested at any depth", () => {
      const a = $rootScope;
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
      const child = $rootScope.$new();

      $rootScope.aValue = [1, 2, 3];
      child.aValue.push(4);

      expect(child.aValue).toEqual([1, 2, 3, 4]);
      expect($rootScope.aValue).toEqual([1, 2, 3, 4]);
      expect(child.aValue).toEqual($rootScope.aValue);
    });
  });

  describe("$id", () => {
    it("should have a unique id", () => {
      expect($rootScope.$id < $rootScope.$new().$id).toBeTruthy();
    });
  });

  describe("$new()", () => {
    it("should create a child scope", () => {
      const child = $rootScope.$new();
      $rootScope.a = 123;
      expect(child.a).toEqual(123);
    });

    it("should create a non prototypically inherited child scope", () => {
      const child = $rootScope.$new(true);
      $rootScope.a = 123;
      expect(child.a).toBeUndefined();
      expect(child.$parent).toEqual($rootScope);
      expect(child.$new).toBe($rootScope.$new);
      expect(child.$root).toBe($rootScope);
    });

    it("should attach the child scope to a specified parent", () => {
      const isolated = $rootScope.$new(true);
      const trans = $rootScope.$new(false, isolated);
      $rootScope.a = 123;
      expect(isolated.a).toBeUndefined();
      expect(trans.a).toEqual(123);
      expect(trans.$root).toBe($rootScope);
      expect(trans.$parent).toBe(isolated);
    });
  });

  describe("$root", () => {
    it("should point to itself", () => {
      expect($rootScope.$root).toEqual($rootScope);
      expect($rootScope.hasOwnProperty("$root")).toBeTruthy();
    });

    it("should expose the constructor", () => {
      expect(Object.getPrototypeOf($rootScope)).toBe(
        $rootScope.constructor.prototype,
      );
    });

    it("should not have $root on children, but should inherit", () => {
      const child = $rootScope.$new();
      expect(child.$root).toEqual($rootScope);
      expect(child.hasOwnProperty("$root")).toBeFalsy();
    });
  });

  describe("$parent", () => {
    it("should point to parent", () => {
      const child = $rootScope.$new();
      expect($rootScope.$parent).toEqual(null);
      expect(child.$parent).toEqual($rootScope);
      expect(child.$new().$parent).toEqual(child);
    });
  });

  describe("this", () => {
    it("should evaluate 'this' to be the scope", () => {
      const child = $rootScope.$new();
      expect($rootScope.$eval("this")).toEqual($rootScope);
      expect(child.$eval("this")).toEqual(child);
    });

    it("'this' should not be recursive", () => {
      expect($rootScope.$eval("this.this")).toBeUndefined();
      expect($rootScope.$eval("$parent.this")).toBeUndefined();
    });

    it("should not be able to overwrite the 'this' keyword", () => {
      $rootScope.this = 123;
      expect($rootScope.$eval("this")).toEqual($rootScope);
    });

    it("should be able to access a constant variable named 'this'", () => {
      $rootScope.this = 42;
      expect($rootScope.$eval("this['this']")).toBe(42);
    });
  });

  describe("$watch/$digest", () => {
    it("calls the listener function of a watch on first $digest", function () {
      var watchFn = function () {
        return "wat";
      };
      var listenerFn = jasmine.createSpy();
      $rootScope.$watch(watchFn, listenerFn);
      $rootScope.$digest();
      expect(listenerFn).toHaveBeenCalled();
    });

    it("calls the watch function with the scope as the argument", function () {
      var watchFn = jasmine.createSpy();
      var listenerFn = function () {};
      $rootScope.$watch(watchFn, listenerFn);
      $rootScope.$digest();
      expect(watchFn).toHaveBeenCalledWith($rootScope);
    });

    it("calls the listener function when the watched value changes", function () {
      scope.someValue = "a";
      scope.counter = 0;
      scope.$watch(
        function (scope) {
          return scope.someValue;
        },
        function (newValue, oldValue, scope) {
          scope.counter++;
        },
      );
      expect(scope.counter).toBe(0);
      scope.$digest();
      expect(scope.counter).toBe(1);
      scope.$digest();
      expect(scope.counter).toBe(1);
      scope.someValue = "b";
      expect(scope.counter).toBe(1);
      scope.$digest();
      expect(scope.counter).toBe(2);
    });

    it("should watch and fire on simple property change", () => {
      const spy = jasmine.createSpy();
      $rootScope.$watch("name", spy);
      $rootScope.$digest();
      spy.calls.reset();

      expect(spy).not.toHaveBeenCalled();
      $rootScope.$digest();
      expect(spy).not.toHaveBeenCalled();
      $rootScope.name = "misko";
      $rootScope.$digest();
      expect(spy).toHaveBeenCalledWith("misko", undefined, $rootScope);
    });

    it("should not expose the `inner working of watch", () => {
      function Getter() {
        expect(this).toBeUndefined();
        return "foo";
      }
      function Listener() {
        expect(this).toBeUndefined();
      }

      $rootScope.$watch(Getter, Listener);
      $rootScope.$digest();
    });

    it("should watch and fire on expression change", () => {
      const spy = jasmine.createSpy();
      $rootScope.$watch("name.first", spy);
      $rootScope.$digest();
      spy.calls.reset();

      $rootScope.name = {};
      expect(spy).not.toHaveBeenCalled();
      $rootScope.$digest();
      expect(spy).not.toHaveBeenCalled();
      $rootScope.name.first = "misko";
      $rootScope.$digest();
      expect(spy).toHaveBeenCalled();
    });

    it("should decrement the watcherCount when destroying a child scope", () => {
      const child1 = $rootScope.$new();
      const child2 = $rootScope.$new();
      const grandChild1 = child1.$new();
      const grandChild2 = child2.$new();
      child1.$watch("a", () => {});
      child2.$watch("a", () => {});
      grandChild1.$watch("a", () => {});
      grandChild2.$watch("a", () => {});

      expect($rootScope.$$watchersCount).toBe(4);
      expect(child1.$$watchersCount).toBe(2);
      expect(child2.$$watchersCount).toBe(2);
      expect(grandChild1.$$watchersCount).toBe(1);
      expect(grandChild2.$$watchersCount).toBe(1);

      grandChild2.$destroy();
      expect(child2.$$watchersCount).toBe(1);
      expect($rootScope.$$watchersCount).toBe(3);
      child1.$destroy();
      expect($rootScope.$$watchersCount).toBe(1);
    });

    it("should decrement the watcherCount when calling the remove function", () => {
      const child1 = $rootScope.$new();
      const child2 = $rootScope.$new();
      const grandChild1 = child1.$new();
      const grandChild2 = child2.$new();
      let remove1;
      let remove2;

      remove1 = child1.$watch("a", () => {});
      child2.$watch("a", () => {});
      grandChild1.$watch("a", () => {});
      remove2 = grandChild2.$watch("a", () => {});

      remove2();
      expect(grandChild2.$$watchersCount).toBe(0);
      expect(child2.$$watchersCount).toBe(1);
      expect($rootScope.$$watchersCount).toBe(3);
      remove1();
      expect(grandChild1.$$watchersCount).toBe(1);
      expect(child1.$$watchersCount).toBe(1);
      expect($rootScope.$$watchersCount).toBe(2);

      // Execute everything a second time to be sure that calling the remove function
      // several times, it only decrements the counter once
      remove2();
      expect(child2.$$watchersCount).toBe(1);
      expect($rootScope.$$watchersCount).toBe(2);
      remove1();
      expect(child1.$$watchersCount).toBe(1);
      expect($rootScope.$$watchersCount).toBe(2);
    });

    describe("constants cleanup", () => {
      beforeEach(() => (logs = []));
      it("should remove $watch of constant literals after initial digest", () => {
        $rootScope.$watch("[]", () => {});
        $rootScope.$watch("{}", () => {});
        $rootScope.$watch("1", () => {});
        $rootScope.$watch('"foo"', () => {});
        expect($rootScope.$$watchers.length).not.toEqual(0);
        $rootScope.$digest();

        expect($rootScope.$$watchers.length).toEqual(0);
      });

      it("should remove $watchCollection of constant literals after initial digest", () => {
        $rootScope.$watchCollection("[]", () => {});
        $rootScope.$watchCollection("{}", () => {});
        $rootScope.$watchCollection("1", () => {});
        $rootScope.$watchCollection('"foo"', () => {});
        expect($rootScope.$$watchers.length).not.toEqual(0);
        $rootScope.$digest();

        expect($rootScope.$$watchers.length).toEqual(0);
      });

      it("should remove $watchGroup of constant literals after initial digest", () => {
        $rootScope.$watchGroup(["[]", "{}", "1", '"foo"'], () => {});
        expect($rootScope.$$watchers.length).not.toEqual(0);
        $rootScope.$digest();

        expect($rootScope.$$watchers.length).toEqual(0);
      });

      it("should remove $watch of filtered constant literals after initial digest", () => {
        $rootScope.$watch('[1] | filter:"x"', () => {});
        $rootScope.$watch("1 | limitTo:2", () => {});
        expect($rootScope.$$watchers.length).not.toEqual(0);
        $rootScope.$digest();

        expect($rootScope.$$watchers.length).toEqual(0);
      });

      it("should remove $watchCollection of filtered constant literals after initial digest", () => {
        $rootScope.$watchCollection('[1] | filter:"x"', () => {});
        expect($rootScope.$$watchers.length).not.toEqual(0);
        $rootScope.$digest();

        expect($rootScope.$$watchers.length).toEqual(0);
      });

      it("should remove $watchGroup of filtered constant literals after initial digest", () => {
        $rootScope.$watchGroup(['[1] | filter:"x"', "1 | limitTo:2"], () => {});
        expect($rootScope.$$watchers.length).not.toEqual(0);
        $rootScope.$digest();

        expect($rootScope.$$watchers.length).toEqual(0);
      });

      it("should remove $watch of constant expressions after initial digest", () => {
        $rootScope.$watch("1 + 1", () => {});
        $rootScope.$watch('"a" + "b"', () => {});
        $rootScope.$watch('"ab".length', () => {});
        $rootScope.$watch("[].length", () => {});
        $rootScope.$watch("(1 + 1) | limitTo:2", () => {});
        expect($rootScope.$$watchers.length).not.toEqual(0);
        $rootScope.$digest();

        expect($rootScope.$$watchers.length).toEqual(0);
      });
    });

    describe("onetime cleanup", () => {
      it("should clean up stable watches on the watch queue", () => {
        $rootScope.$watch("::foo", () => {});
        expect($rootScope.$$watchers.length).toEqual(1);
        $rootScope.$digest();
        expect($rootScope.$$watchers.length).toEqual(1);

        $rootScope.foo = "foo";
        $rootScope.$digest();
        expect($rootScope.$$watchers.length).toEqual(0);
      });

      it("should clean up stable watches from $watchCollection", () => {
        $rootScope.$watchCollection("::foo", () => {});
        expect($rootScope.$$watchers.length).toEqual(1);

        $rootScope.$digest();
        expect($rootScope.$$watchers.length).toEqual(1);

        $rootScope.foo = [];
        $rootScope.$digest();
        expect($rootScope.$$watchers.length).toEqual(0);
      });

      it("should clean up stable watches from $watchCollection literals", () => {
        $rootScope.$watchCollection("::[foo, bar]", () => {});
        expect($rootScope.$$watchers.length).toEqual(1);

        $rootScope.$digest();
        expect($rootScope.$$watchers.length).toEqual(1);

        $rootScope.foo = 1;
        $rootScope.$digest();
        expect($rootScope.$$watchers.length).toEqual(1);

        $rootScope.foo = 2;
        $rootScope.$digest();
        expect($rootScope.$$watchers.length).toEqual(1);

        $rootScope.bar = 3;
        $rootScope.$digest();
        expect($rootScope.$$watchers.length).toEqual(0);
      });

      it("should clean up stable watches from $watchGroup", () => {
        $rootScope.$watchGroup(["::foo", "::bar"], () => {});
        expect($rootScope.$$watchers.length).toEqual(2);

        $rootScope.$digest();
        expect($rootScope.$$watchers.length).toEqual(2);

        $rootScope.foo = "foo";
        $rootScope.$digest();
        expect($rootScope.$$watchers.length).toEqual(1);

        $rootScope.bar = "bar";
        $rootScope.$digest();
        expect($rootScope.$$watchers.length).toEqual(0);
      });
    });

    it("should delegate exceptions", () => {
      $rootScope.$watch("a", () => {
        throw new Error("abc");
      });
      $rootScope.a = 1;
      $rootScope.$digest();
      expect(logs[0]).toMatch(/abc/);
    });

    it("should fire watches in order of addition", () => {
      // this is not an external guarantee, just our own sanity
      logs = "";
      $rootScope.$watch("a", () => {
        logs += "a";
      });
      $rootScope.$watch("b", () => {
        logs += "b";
      });
      // constant expressions have slightly different handling,
      // let's ensure they are kept in the same list as others
      $rootScope.$watch("1", () => {
        logs += "1";
      });
      $rootScope.$watch("c", () => {
        logs += "c";
      });
      $rootScope.$watch("2", () => {
        logs += "2";
      });
      $rootScope.a = $rootScope.b = $rootScope.c = 1;
      $rootScope.$digest();
      expect(logs).toEqual("ab1c2");
    });

    it("should call child $watchers in addition order", () => {
      // this is not an external guarantee, just our own sanity
      logs = "";
      const childA = $rootScope.$new();
      const childB = $rootScope.$new();
      const childC = $rootScope.$new();
      childA.$watch("a", () => {
        logs += "a";
      });
      childB.$watch("b", () => {
        logs += "b";
      });
      childC.$watch("c", () => {
        logs += "c";
      });
      childA.a = childB.b = childC.c = 1;
      $rootScope.$digest();
      expect(logs).toEqual("abc");
    });

    it("should allow $digest on a child scope with and without a right sibling", () => {
      // tests a traversal edge case which we originally missed
      logs = "";
      const childA = $rootScope.$new();
      const childB = $rootScope.$new();

      $rootScope.$watch(() => {
        logs += "r";
      });
      childA.$watch(() => {
        logs += "a";
      });
      childB.$watch(() => {
        logs += "b";
      });

      // init
      $rootScope.$digest();
      expect(logs).toBe("rabrab");

      logs = "";
      childA.$digest();
      expect(logs).toBe("a");

      logs = "";
      childB.$digest();
      expect(logs).toBe("b");
    });

    it("should repeat watch cycle while model changes are identified", () => {
      logs = "";
      $rootScope.$watch("c", (v) => {
        $rootScope.d = v;
        logs += "c";
      });
      $rootScope.$watch("b", (v) => {
        $rootScope.c = v;
        logs += "b";
      });
      $rootScope.$watch("a", (v) => {
        $rootScope.b = v;
        logs += "a";
      });
      $rootScope.$digest();
      logs = "";
      $rootScope.a = 1;
      $rootScope.$digest();
      expect($rootScope.b).toEqual(1);
      expect($rootScope.c).toEqual(1);
      expect($rootScope.d).toEqual(1);
      expect(logs).toEqual("abc");
    });

    it("should repeat watch cycle from the root element", () => {
      logs = "";
      const child = $rootScope.$new();
      $rootScope.$watch(() => {
        logs += "a";
      });
      child.$watch(() => {
        logs += "b";
      });
      $rootScope.$digest();
      expect(logs).toEqual("abab");
    });

    it("should prevent infinite recursion and print watcher expression", () => {
      $rootScope.$watch("a", function () {
        $rootScope.b++;
      });
      $rootScope.$watch("b", function () {
        $rootScope.a++;
      });
      $rootScope.a = $rootScope.b = 0;
      expect(function () {
        $rootScope.$digest();
      }).toThrow();

      expect($rootScope.$$phase).toBe(0);
    });

    it("should prevent infinite recursion and print watcher function name or body", () => {
      $rootScope.$watch(
        () => $rootScope.a,
        () => {
          $rootScope.b++;
        },
      );
      $rootScope.$watch(
        () => $rootScope.b,
        () => {
          $rootScope.a++;
        },
      );
      $rootScope.a = $rootScope.b = 0;

      try {
        $rootScope.$digest();
        throw new Error("Should have thrown exception");
      } catch (e) {
        console.error(e);
        expect(e.message.match(/rootScope.a/g).length).toBeTruthy();
        expect(e.message.match(/rootScope.b/g).length).toBeTruthy();
      }
    });

    it("should prevent infinite loop when creating and resolving a promise in a watched expression", () => {
      let $q = injector.get("$q");
      const d = $q.defer();

      d.resolve("Hello, world.");
      $rootScope.$watch(
        () => {
          const $d2 = $q.defer();
          $d2.resolve("Goodbye.");
          $d2.promise.then(() => {});
          return d.promise;
        },
        () => 0,
      );

      expect(() => {
        $rootScope.$digest();
      }).toThrowError();

      expect($rootScope.$$phase).toBe(ScopePhase.NONE);
    });

    it("should not fire upon $watch registration on initial $digest", () => {
      logs = "";
      $rootScope.a = 1;
      $rootScope.$watch("a", () => {
        logs += "a";
      });
      $rootScope.$watch("b", () => {
        logs += "b";
      });
      $rootScope.$digest();
      logs = "";
      $rootScope.$digest();
      expect(logs).toEqual("");
    });

    it("should watch objects", () => {
      logs = "";
      $rootScope.a = [];
      $rootScope.b = {};
      $rootScope.$watch(
        "a",
        (value) => {
          logs += ".";
          expect(value).toBe($rootScope.a);
        },
        true,
      );
      $rootScope.$watch(
        "b",
        (value) => {
          logs += "!";
          expect(value).toBe($rootScope.b);
        },
        true,
      );
      $rootScope.$digest();
      logs = "";

      $rootScope.a.push({});
      $rootScope.b.name = "";

      $rootScope.$digest();
      expect(logs).toEqual(".!");
    });

    it("should watch functions", () => {
      $rootScope.fn = function () {
        return "a";
      };
      $rootScope.$watch("fn", (fn) => {
        logs.push(fn());
      });
      $rootScope.$digest();
      expect(logs).toEqual(["a"]);
      $rootScope.fn = function () {
        return "b";
      };
      $rootScope.$digest();
      expect(logs).toEqual(["a", "b"]);
    });

    it("should prevent $digest recursion", () => {
      let callCount = 0;
      $rootScope.$watch("name", () => {
        expect(() => {
          $rootScope.$digest();
        }).toThrowError(/digest already in progress/);
        callCount++;
      });
      $rootScope.name = "a";
      $rootScope.$digest();
      expect(callCount).toEqual(1);
    });

    it("should allow a watch to be added while in a digest", () => {
      const watch1 = jasmine.createSpy("watch1");
      const watch2 = jasmine.createSpy("watch2");
      $rootScope.$watch("foo", () => {
        $rootScope.$watch("foo", watch1);
        $rootScope.$watch("foo", watch2);
      });
      $rootScope.$apply("foo = true");
      expect(watch1).toHaveBeenCalled();
      expect(watch2).toHaveBeenCalled();
    });

    it("should not skip watchers when adding new watchers during digest", () => {
      const watchFn1 = function () {
        logs.push(1);
      };
      const watchFn2 = function () {
        logs.push(2);
      };
      const watchFn3 = function () {
        logs.push(3);
      };
      const addWatcherOnce = function (newValue, oldValue) {
        if (newValue === oldValue) {
          $rootScope.$watch(watchFn3);
        }
      };

      $rootScope.$watch(watchFn1, addWatcherOnce);
      $rootScope.$watch(watchFn2);

      $rootScope.$digest();

      expect(logs).toEqual([1, 2, 3, 1, 2, 3]);
    });

    it("should not run the current watcher twice when removing a watcher during digest", () => {
      let removeWatcher3;

      const watchFn3 = function () {
        logs.push(3);
      };
      const watchFn2 = function () {
        logs.push(2);
      };
      const watchFn1 = function () {
        logs.push(1);
      };
      const removeWatcherOnce = function (newValue, oldValue) {
        if (newValue === oldValue) {
          removeWatcher3();
        }
      };

      $rootScope.$watch(watchFn1, removeWatcherOnce);
      $rootScope.$watch(watchFn2);
      removeWatcher3 = $rootScope.$watch(watchFn3);

      $rootScope.$digest();

      expect(logs).toEqual([1, 2, 1, 2]);
    });

    it("should not skip watchers when removing itself during digest", () => {
      let removeWatcher1;

      const watchFn3 = function () {
        logs.push(3);
      };
      const watchFn2 = function () {
        logs.push(2);
      };
      const watchFn1 = function () {
        logs.push(1);
      };
      const removeItself = function () {
        removeWatcher1();
      };

      removeWatcher1 = $rootScope.$watch(watchFn1, removeItself);
      $rootScope.$watch(watchFn2);
      $rootScope.$watch(watchFn3);

      $rootScope.$digest();

      expect(logs).toEqual([1, 2, 3, 2, 3]);
    });

    it("should not infinitely digest when current value is NaN", () => {
      $rootScope.$watch(() => NaN);

      expect(() => {
        $rootScope.$digest();
      }).not.toThrow();
    });

    it("should always call the watcher with newVal and oldVal equal on the first run", () => {
      function logger(scope, newVal, oldVal) {
        const val =
          newVal === oldVal || (newVal !== oldVal && oldVal !== newVal)
            ? newVal
            : "xxx";
        logs.push(val);
      }

      $rootScope.$watch(() => NaN, logger);
      $rootScope.$watch(() => undefined, logger);
      $rootScope.$watch(() => "", logger);
      $rootScope.$watch(() => false, logger);
      $rootScope.$watch(() => ({}), logger, true);
      $rootScope.$watch(() => 23, logger);

      $rootScope.$digest();
      expect(isNaN(logs.shift())).toBe(true); // jasmine's toBe and toEqual don't work well with NaNs
      expect(logs).toEqual([undefined, "", false, {}, 23]);
      logs = [];
      $rootScope.$digest();
      expect(logs).toEqual([]);
    });

    describe("$watch deregistration", () => {
      beforeEach(() => (logs = []));
      it("should return a function that allows listeners to be deregistered", () => {
        const listener = jasmine.createSpy("watch listener");
        let listenerRemove;

        listenerRemove = $rootScope.$watch("foo", listener);
        $rootScope.$digest(); // init
        expect(listener).toHaveBeenCalled();
        expect(listenerRemove).toBeDefined();

        listener.calls.reset();
        $rootScope.foo = "bar";
        $rootScope.$digest(); // trigger
        expect(listener).toHaveBeenCalled();

        listener.calls.reset();
        $rootScope.foo = "baz";
        listenerRemove();
        $rootScope.$digest(); // trigger
        expect(listener).not.toHaveBeenCalled();
      });

      it("should allow a watch to be deregistered while in a digest", () => {
        let remove1;
        let remove2;
        $rootScope.$watch("remove", () => {
          remove1();
          remove2();
        });
        remove1 = $rootScope.$watch("thing", () => {});
        remove2 = $rootScope.$watch("thing", () => {});
        expect(() => {
          $rootScope.$apply("remove = true");
        }).not.toThrow();
      });

      it("should not mess up the digest loop if deregistration happens during digest", () => {
        // we are testing this due to regression #5525 which is related to how the digest loops lastDirtyWatch short-circuiting optimization works
        // scenario: watch1 deregistering watch1
        let scope = $rootScope.$new();
        let deregWatch1 = scope.$watch(
          () => {
            logs.push("watch1");
            return "watch1";
          },
          () => {
            deregWatch1();
            logs.push("watchAction1");
          },
        );
        scope.$watch(
          () => {
            logs.push("watch2");
            return "watch2";
          },
          () => logs.push("watchAction2"),
        );
        scope.$watch(
          () => {
            logs.push("watch3");
            return "watch3";
          },
          () => logs.push("watchAction3"),
        );

        $rootScope.$digest();

        expect(logs).toEqual([
          "watch1",
          "watchAction1",
          "watch2",
          "watchAction2",
          "watch3",
          "watchAction3",
          "watch2",
          "watch3",
        ]);
        scope.$destroy();
        logs = [];

        // scenario: watch1 deregistering watch2
        scope = $rootScope.$new();
        scope.$watch(
          () => {
            logs.push("watch1");
            return "watch1";
          },
          () => {
            deregWatch2();
            logs.push("watchAction1");
          },
        );
        let deregWatch2 = scope.$watch(
          () => {
            logs.push("watch2");
            return "watch2";
          },
          () => logs.push("watchAction2"),
        );
        scope.$watch(
          () => {
            logs.push("watch3");
            return "watch3";
          },
          () => logs.push("watchAction3"),
        );

        $rootScope.$digest();

        expect(logs).toEqual([
          "watch1",
          "watchAction1",
          "watch3",
          "watchAction3",
          "watch1",
          "watch3",
        ]);
        scope.$destroy();
        logs = [];

        // scenario: watch2 deregistering watch1
        scope = $rootScope.$new();
        deregWatch1 = scope.$watch(
          () => {
            logs.push("watch1");
            return "watch1";
          },
          () => logs.push("watchAction1"),
        );
        scope.$watch(
          () => {
            logs.push("watch2");
            return "watch2";
          },
          () => {
            deregWatch1();
            logs.push("watchAction2");
          },
        );
        scope.$watch(
          () => {
            logs.push("watch3");
            return "watch3";
          },
          () => logs.push("watchAction3"),
        );

        $rootScope.$digest();

        expect(logs).toEqual([
          "watch1",
          "watchAction1",
          "watch2",
          "watchAction2",
          "watch3",
          "watchAction3",
          "watch2",
          "watch3",
        ]);
      });
    });

    describe("$watchCollection", () => {
      describe("constiable", () => {
        let deregister;
        beforeEach(() => {
          logs = [];
          deregister = $rootScope.$watchCollection("obj", (newVal, oldVal) => {
            const msg = { newVal, oldVal };

            if (newVal === oldVal) {
              msg.identical = true;
            }

            logs.push(msg);
          });
        });

        it("should not trigger if nothing change", () => {
          $rootScope.$digest();
          expect(logs).toEqual([
            { newVal: undefined, oldVal: undefined, identical: true },
          ]);
          logs = [];
          $rootScope.$digest();
          expect(logs).toEqual([]);
        });

        it("should allow deregistration", () => {
          $rootScope.obj = [];
          $rootScope.$digest();
          expect(logs.length).toBe(1);
          logs = [];

          $rootScope.obj.push("a");
          deregister();

          $rootScope.$digest();
          expect(logs).toEqual([]);
        });

        describe("array", () => {
          it("should return oldCollection === newCollection only on the first listener call", () => {
            // first time should be identical
            $rootScope.obj = ["a", "b"];
            $rootScope.$digest();
            expect(logs).toEqual([
              { newVal: ["a", "b"], oldVal: ["a", "b"], identical: true },
            ]);
            logs = [];

            // second time should be different
            $rootScope.obj[1] = "c";
            $rootScope.$digest();
            expect(logs).toEqual([{ newVal: ["a", "c"], oldVal: ["a", "b"] }]);
          });

          it("should trigger when property changes into array", () => {
            $rootScope.obj = "test";
            $rootScope.$digest();
            expect(logs).toEqual([
              { newVal: "test", oldVal: "test", identical: true },
            ]);

            logs = [];
            $rootScope.obj = [];
            $rootScope.$digest();
            expect(logs).toEqual([{ newVal: [], oldVal: "test" }]);

            logs = [];
            $rootScope.obj = {};
            $rootScope.$digest();
            expect(logs).toEqual([{ newVal: {}, oldVal: [] }]);

            logs = [];
            $rootScope.obj = [];
            $rootScope.$digest();
            expect(logs).toEqual([{ newVal: [], oldVal: {} }]);

            logs = [];
            $rootScope.obj = undefined;
            $rootScope.$digest();
            expect(logs).toEqual([{ newVal: undefined, oldVal: [] }]);
          });

          it("should not trigger change when object in collection changes", () => {
            $rootScope.obj = [{}];
            $rootScope.$digest();
            expect(logs).toEqual([
              { newVal: [{}], oldVal: [{}], identical: true },
            ]);

            logs = [];
            $rootScope.obj[0].name = "foo";
            $rootScope.$digest();
            expect(logs).toEqual([]);
          });

          it("should watch array properties", () => {
            $rootScope.obj = [];
            $rootScope.$digest();
            expect(logs).toEqual([{ newVal: [], oldVal: [], identical: true }]);

            logs = [];
            $rootScope.obj.push("a");
            $rootScope.$digest();
            expect(logs).toEqual([{ newVal: ["a"], oldVal: [] }]);

            logs = [];
            $rootScope.obj[0] = "b";
            $rootScope.$digest();
            expect(logs).toEqual([{ newVal: ["b"], oldVal: ["a"] }]);

            logs = [];
            $rootScope.obj.push([]);
            $rootScope.obj.push({});
            $rootScope.$digest();
            expect(logs).toEqual([{ newVal: ["b", [], {}], oldVal: ["b"] }]);

            logs = [];
            const temp = $rootScope.obj[1];
            $rootScope.obj[1] = $rootScope.obj[2];
            $rootScope.obj[2] = temp;
            $rootScope.$digest();
            expect(logs).toEqual([
              { newVal: ["b", {}, []], oldVal: ["b", [], {}] },
            ]);

            logs = [];
            $rootScope.obj.shift();
            $rootScope.$digest();
            expect(logs).toEqual([{ newVal: [{}, []], oldVal: ["b", {}, []] }]);
          });

          it("should not infinitely digest when current value is NaN", () => {
            $rootScope.obj = [NaN];
            expect(() => {
              $rootScope.$digest();
            }).not.toThrow();
          });

          it("should watch array-like objects like arrays", () => {
            logs = [];
            $rootScope.obj = document.getElementsByTagName("src");
            $rootScope.$digest();

            expect(logs.length).toBeTruthy();
          });
        });

        describe("object", () => {
          it("should return oldCollection === newCollection only on the first listener call", () => {
            $rootScope.obj = { a: "b" };
            // first time should be identical
            $rootScope.$digest();
            expect(logs).toEqual([
              { newVal: { a: "b" }, oldVal: { a: "b" }, identical: true },
            ]);
            logs = [];

            // second time not identical
            $rootScope.obj.a = "c";
            $rootScope.$digest();
            expect(logs).toEqual([{ newVal: { a: "c" }, oldVal: { a: "b" } }]);
          });

          it("should trigger when property changes into object", () => {
            $rootScope.obj = "test";
            $rootScope.$digest();
            expect(logs).toEqual([
              { newVal: "test", oldVal: "test", identical: true },
            ]);
            logs = [];

            $rootScope.obj = {};
            $rootScope.$digest();
            expect(logs).toEqual([{ newVal: {}, oldVal: "test" }]);
          });

          it("should not trigger change when object in collection changes", () => {
            $rootScope.obj = { name: {} };
            $rootScope.$digest();
            expect(logs).toEqual([
              { newVal: { name: {} }, oldVal: { name: {} }, identical: true },
            ]);
            logs = [];

            $rootScope.obj.name.bar = "foo";
            $rootScope.$digest();
            expect(logs).toEqual([]);
          });

          it("should watch object properties", () => {
            $rootScope.obj = {};
            $rootScope.$digest();
            expect(logs).toEqual([{ newVal: {}, oldVal: {}, identical: true }]);
            logs = [];
            $rootScope.obj.a = "A";
            $rootScope.$digest();
            expect(logs).toEqual([{ newVal: { a: "A" }, oldVal: {} }]);

            logs = [];
            $rootScope.obj.a = "B";
            $rootScope.$digest();
            expect(logs).toEqual([{ newVal: { a: "B" }, oldVal: { a: "A" } }]);

            logs = [];
            $rootScope.obj.b = [];
            $rootScope.obj.c = {};
            $rootScope.$digest();
            expect(logs).toEqual([
              { newVal: { a: "B", b: [], c: {} }, oldVal: { a: "B" } },
            ]);

            logs = [];
            const temp = $rootScope.obj.a;
            $rootScope.obj.a = $rootScope.obj.b;
            $rootScope.obj.c = temp;
            $rootScope.$digest();
            expect(logs).toEqual([
              {
                newVal: { a: [], b: [], c: "B" },
                oldVal: { a: "B", b: [], c: {} },
              },
            ]);

            logs = [];
            delete $rootScope.obj.a;
            $rootScope.$digest();
            expect(logs).toEqual([
              { newVal: { b: [], c: "B" }, oldVal: { a: [], b: [], c: "B" } },
            ]);
          });

          it("should not infinitely digest when current value is NaN", () => {
            $rootScope.obj = { a: NaN };
            expect(() => {
              $rootScope.$digest();
            }).not.toThrow();
          });

          it("should handle objects created using `Object.create(null)`", () => {
            $rootScope.obj = Object.create(null);
            $rootScope.obj.a = "a";
            $rootScope.obj.b = "b";
            $rootScope.$digest();
            expect(logs[0].newVal).toEqual(
              extend(Object.create(null), { a: "a", b: "b" }),
            );

            delete $rootScope.obj.b;
            $rootScope.$digest();
            expect(logs[0].newVal).toEqual(
              extend(Object.create(null), { a: "a" }),
            );
          });
        });
      });

      describe("literal", () => {
        describe("array", () => {
          beforeEach(() => {
            logs = [];
            $rootScope.$watchCollection("[obj]", (newVal, oldVal) => {
              const msg = { newVal, oldVal };

              if (newVal === oldVal) {
                msg.identical = true;
              }

              logs.push(msg);
            });
          });

          it("should return oldCollection === newCollection only on the first listener call", () => {
            // first time should be identical
            $rootScope.obj = "a";
            $rootScope.$digest();
            expect(logs).toEqual([
              { newVal: ["a"], oldVal: ["a"], identical: true },
            ]);
            logs = [];

            // second time should be different
            $rootScope.obj = "b";
            $rootScope.$digest();
            expect(logs).toEqual([{ newVal: ["b"], oldVal: ["a"] }]);
          });

          it("should trigger when property changes into array", () => {
            $rootScope.obj = "test";
            $rootScope.$digest();
            expect(logs).toEqual([
              { newVal: ["test"], oldVal: ["test"], identical: true },
            ]);

            logs = [];
            $rootScope.obj = [];
            $rootScope.$digest();
            expect(logs).toEqual([{ newVal: [[]], oldVal: ["test"] }]);

            logs = [];
            $rootScope.obj = {};
            $rootScope.$digest();
            expect(logs).toEqual([{ newVal: [{}], oldVal: [[]] }]);

            logs = [];
            $rootScope.obj = [];
            $rootScope.$digest();
            expect(logs).toEqual([{ newVal: [[]], oldVal: [{}] }]);

            logs = [];
            $rootScope.obj = undefined;
            $rootScope.$digest();
            expect(logs).toEqual([{ newVal: [undefined], oldVal: [[]] }]);
          });

          it("should not trigger change when object in collection changes", () => {
            $rootScope.obj = {};
            $rootScope.$digest();
            expect(logs).toEqual([
              { newVal: [{}], oldVal: [{}], identical: true },
            ]);

            logs = [];
            $rootScope.obj.name = "foo";
            $rootScope.$digest();
            expect(logs).toEqual([]);
          });

          it("should not infinitely digest when current value is NaN", () => {
            $rootScope.obj = NaN;
            expect(() => {
              $rootScope.$digest();
            }).not.toThrow();
          });
        });

        describe("object", () => {
          beforeEach(() => {
            logs = [];
            $rootScope.$watchCollection("{a: obj}", (newVal, oldVal) => {
              const msg = { newVal, oldVal };

              if (newVal === oldVal) {
                msg.identical = true;
              }

              logs.push(msg);
            });
          });

          it("should return oldCollection === newCollection only on the first listener call", () => {
            $rootScope.obj = "b";
            // first time should be identical
            $rootScope.$digest();
            expect(logs).toEqual([
              { newVal: { a: "b" }, oldVal: { a: "b" }, identical: true },
            ]);

            // second time not identical
            logs = [];
            $rootScope.obj = "c";
            $rootScope.$digest();
            expect(logs).toEqual([{ newVal: { a: "c" }, oldVal: { a: "b" } }]);
          });

          it("should trigger when property changes into object", () => {
            $rootScope.obj = "test";
            $rootScope.$digest();
            expect(logs).toEqual([
              { newVal: { a: "test" }, oldVal: { a: "test" }, identical: true },
            ]);

            logs = [];
            $rootScope.obj = {};
            $rootScope.$digest();
            expect(logs).toEqual([
              { newVal: { a: {} }, oldVal: { a: "test" } },
            ]);
          });

          it("should not trigger change when object in collection changes", () => {
            $rootScope.obj = { name: "foo" };
            $rootScope.$digest();
            expect(logs).toEqual([
              {
                newVal: { a: { name: "foo" } },
                oldVal: { a: { name: "foo" } },
                identical: true,
              },
            ]);

            logs = [];
            $rootScope.obj.name = "bar";
            $rootScope.$digest();
            expect(logs).toEqual([]);
          });

          it("should watch object properties", () => {
            $rootScope.obj = {};
            $rootScope.$digest();
            expect(logs).toEqual([
              { newVal: { a: {} }, oldVal: { a: {} }, identical: true },
            ]);

            logs = [];
            $rootScope.obj = "A";
            $rootScope.$digest();
            expect(logs).toEqual([{ newVal: { a: "A" }, oldVal: { a: {} } }]);

            logs = [];
            $rootScope.obj = "B";
            $rootScope.$digest();
            expect(logs).toEqual([{ newVal: { a: "B" }, oldVal: { a: "A" } }]);

            logs = [];
            $rootScope.obj = [];
            $rootScope.$digest();
            expect(logs).toEqual([{ newVal: { a: [] }, oldVal: { a: "B" } }]);

            logs = [];
            delete $rootScope.obj;
            $rootScope.$digest();
            expect(logs).toEqual([
              { newVal: { a: undefined }, oldVal: { a: [] } },
            ]);
          });

          it("should not infinitely digest when current value is NaN", () => {
            $rootScope.obj = NaN;
            expect(() => {
              $rootScope.$digest();
            }).not.toThrow();
          });
        });

        describe("object computed property", () => {
          beforeEach(() => {
            logs = [];
            $rootScope.$watchCollection("{[key]: obj}", (newVal, oldVal) => {
              const msg = { newVal, oldVal };

              if (newVal === oldVal) {
                msg.identical = true;
              }

              logs.push(msg);
            });
          });

          it('should default to "undefined" key', () => {
            $rootScope.obj = "test";
            $rootScope.$digest();
            expect(logs).toEqual([
              {
                newVal: { undefined: "test" },
                oldVal: { undefined: "test" },
                identical: true,
              },
            ]);
          });

          it("should trigger when key changes", () => {
            $rootScope.key = "a";
            $rootScope.obj = "test";
            $rootScope.$digest();
            expect(logs).toEqual([
              { newVal: { a: "test" }, oldVal: { a: "test" }, identical: true },
            ]);

            logs = [];
            $rootScope.key = "b";
            $rootScope.$digest();
            expect(logs).toEqual([
              { newVal: { b: "test" }, oldVal: { a: "test" } },
            ]);

            logs = [];
            $rootScope.key = true;
            $rootScope.$digest();
            expect(logs).toEqual([
              { newVal: { true: "test" }, oldVal: { b: "test" } },
            ]);
          });

          it("should not trigger when key changes but stringified key does not", () => {
            $rootScope.key = 1;
            $rootScope.obj = "test";
            $rootScope.$digest();
            expect(logs).toEqual([
              { newVal: { 1: "test" }, oldVal: { 1: "test" }, identical: true },
            ]);

            logs = [];
            $rootScope.key = "1";
            $rootScope.$digest();
            expect(logs).toEqual([]);

            $rootScope.key = true;
            $rootScope.$digest();
            expect(logs).toEqual([
              { newVal: { true: "test" }, oldVal: { 1: "test" } },
            ]);

            logs = [];
            $rootScope.key = "true";
            $rootScope.$digest();
            expect(logs).toEqual([]);

            logs = [];
            $rootScope.key = {};
            $rootScope.$digest();
            expect(logs).toEqual([
              {
                newVal: { "[object Object]": "test" },
                oldVal: { true: "test" },
              },
            ]);

            logs = [];
            $rootScope.key = {};
            $rootScope.$digest();
            expect(logs).toEqual([]);
          });

          it("should not trigger change when object in collection changes", () => {
            $rootScope.key = "a";
            $rootScope.obj = { name: "foo" };
            $rootScope.$digest();
            expect(logs).toEqual([
              {
                newVal: { a: { name: "foo" } },
                oldVal: { a: { name: "foo" } },
                identical: true,
              },
            ]);
            logs = [];

            $rootScope.obj.name = "bar";
            $rootScope.$digest();
            expect(logs).toEqual([]);
          });

          it("should not infinitely digest when key value is NaN", () => {
            $rootScope.key = NaN;
            $rootScope.obj = NaN;
            expect(() => {
              $rootScope.$digest();
            }).not.toThrow();
          });
        });
      });
    });

    describe("$suspend/$resume/$isSuspended", () => {
      it("should suspend watchers on scope", () => {
        const watchSpy = jasmine.createSpy("watchSpy");
        $rootScope.$watch(watchSpy);
        $rootScope.$suspend();
        $rootScope.$digest();
        expect(watchSpy).not.toHaveBeenCalled();
      });

      it("should resume watchers on scope", () => {
        const watchSpy = jasmine.createSpy("watchSpy");
        $rootScope.$watch(watchSpy);
        $rootScope.$suspend();
        $rootScope.$resume();
        $rootScope.$digest();
        expect(watchSpy).toHaveBeenCalled();
      });

      it("should suspend watchers on child scope", () => {
        const watchSpy = jasmine.createSpy("watchSpy");
        const scope = $rootScope.$new(true);
        scope.$watch(watchSpy);
        $rootScope.$suspend();
        $rootScope.$digest();
        expect(watchSpy).not.toHaveBeenCalled();
      });

      it("should resume watchers on child scope", () => {
        const watchSpy = jasmine.createSpy("watchSpy");
        const scope = $rootScope.$new(true);
        scope.$watch(watchSpy);
        $rootScope.$suspend();
        $rootScope.$resume();
        $rootScope.$digest();
        expect(watchSpy).toHaveBeenCalled();
      });

      it("should resume digesting immediately if `$resume` is called from an ancestor scope watch handler", () => {
        const watchSpy = jasmine.createSpy("watchSpy");
        const scope = $rootScope.$new();

        // Setup a handler that will toggle the scope suspension
        $rootScope.$watch("a", (a) => {
          if (a) scope.$resume();
          else scope.$suspend();
        });

        // Spy on the scope watches being called
        scope.$watch(watchSpy);

        // Trigger a digest that should suspend the scope from within the watch handler
        $rootScope.$apply("a = false");
        // The scope is suspended before it gets to do a digest
        expect(watchSpy).not.toHaveBeenCalled();

        // Trigger a digest that should resume the scope from within the watch handler
        $rootScope.$apply("a = true");
        // The watch handler that resumes the scope is in the parent, so the resumed scope will digest immediately
        expect(watchSpy).toHaveBeenCalled();
      });

      it("should resume digesting immediately if `$resume` is called from a non-ancestor scope watch handler", () => {
        const watchSpy = jasmine.createSpy("watchSpy");
        const scope = $rootScope.$new();
        const sibling = $rootScope.$new();

        // Setup a handler that will toggle the scope suspension
        sibling.$watch("a", (a) => {
          if (a) scope.$resume();
          else scope.$suspend();
        });

        // Spy on the scope watches being called
        scope.$watch(watchSpy);

        // Trigger a digest that should suspend the scope from within the watch handler
        $rootScope.$apply("a = false");
        // The scope is suspended by the sibling handler after the scope has already digested
        expect(watchSpy).toHaveBeenCalled();
        watchSpy.calls.reset();

        // Trigger a digest that should resume the scope from within the watch handler
        $rootScope.$apply("a = true");
        // The watch handler that resumes the scope marks the digest as dirty, so it will run an extra digest
        expect(watchSpy).toHaveBeenCalled();
      });

      it("should not suspend watchers on parent or sibling scopes", () => {
        const watchSpyParent = jasmine.createSpy("watchSpyParent");
        const watchSpyChild = jasmine.createSpy("watchSpyChild");
        const watchSpySibling = jasmine.createSpy("watchSpySibling");

        const parent = $rootScope.$new();
        parent.$watch(watchSpyParent);
        const child = parent.$new();
        child.$watch(watchSpyChild);
        const sibling = parent.$new();
        sibling.$watch(watchSpySibling);

        child.$suspend();
        $rootScope.$digest();
        expect(watchSpyParent).toHaveBeenCalled();
        expect(watchSpyChild).not.toHaveBeenCalled();
        expect(watchSpySibling).toHaveBeenCalled();
      });

      it("should return true from `$isSuspended()` when a scope is suspended", () => {
        $rootScope.$suspend();
        expect($rootScope.$isSuspended()).toBe(true);
        $rootScope.$resume();
        expect($rootScope.$isSuspended()).toBe(false);
      });

      it("should return false from `$isSuspended()` for a non-suspended scope that has a suspended ancestor", () => {
        const childScope = $rootScope.$new();
        $rootScope.$suspend();
        expect(childScope.$isSuspended()).toBe(false);
        childScope.$suspend();
        expect(childScope.$isSuspended()).toBe(true);
        childScope.$resume();
        expect(childScope.$isSuspended()).toBe(false);
        $rootScope.$resume();
        expect(childScope.$isSuspended()).toBe(false);
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
      scope.$digest();
      logs = [];
    }

    describe("optimizations", () => {
      beforeEach(() => (logs = []));
      it("should check watches only once during an empty digest", () => {
        setupWatches($rootScope, console.log);
        $rootScope.$digest();
        expect(logs).toEqual(["w1", "w2", "w3"]);
      });

      it("should quit digest early after we check the last watch that was previously dirty", () => {
        setupWatches($rootScope, console.log);
        $rootScope.w1 = "x";
        $rootScope.$digest();
        expect(logs).toEqual(["w1", "w2", "w3", "w1"]);
      });

      it("should not quit digest early if a new watch was added from an existing watch action", () => {
        setupWatches($rootScope, console.log);
        $rootScope.$watch(
          () => {
            logs.push("w4");
            return "w4";
          },
          () => {
            logs.push("w4action");
            $rootScope.$watch(
              () => {
                logs.push("w5");
                return "w5";
              },
              () => logs.push("w5action"),
            );
          },
        );
        $rootScope.$digest();
        expect(logs).toEqual([
          "w1",
          "w2",
          "w3",
          "w4",
          "w4action",
          "w5",
          "w5action",
          "w1",
          "w2",
          "w3",
          "w4",
          "w5",
        ]);
      });

      it("should not quit digest early if an evalAsync task was scheduled from a watch action", () => {
        setupWatches($rootScope, console.log);
        $rootScope.$watch(
          () => {
            logs.push("w4");
            return "w4";
          },
          () => {
            logs.push("w4action");
            $rootScope.$evalAsync(() => {
              logs.push("evalAsync");
            });
          },
        );
        $rootScope.$digest();
        expect(logs).toEqual([
          "w1",
          "w2",
          "w3",
          "w4",
          "w4action",
          "evalAsync",
          "w1",
          "w2",
          "w3",
          "w4",
        ]);
      });

      it("should quit digest early but not too early when constious watches fire", () => {
        setupWatches($rootScope, console.log);
        $rootScope.$watch(
          () => {
            logs.push("w4");
            return $rootScope.w4;
          },
          (newVal) => {
            logs.push("w4action");
            $rootScope.w2 = newVal;
          },
        );

        $rootScope.$digest();
        logs = [];

        $rootScope.w1 = "x";
        $rootScope.w4 = "x";
        $rootScope.$digest();
        expect(logs).toEqual([
          "w1",
          "w2",
          "w3",
          "w4",
          "w4action",
          "w1",
          "w2",
          "w3",
          "w4",
          "w1",
          "w2",
        ]);
      });
    });
  });

  describe("$watchGroup", () => {
    let scope;

    beforeEach(() => {
      scope = $rootScope.$new();
    });

    it("should pass same group instance on first call (no expressions)", () => {
      let newValues;
      let oldValues;
      scope.$watchGroup([], (n, o) => {
        newValues = n;
        oldValues = o;
      });

      scope.$apply();
      expect(newValues).toBe(oldValues);
    });

    it("should pass same group instance on first call (single expression)", () => {
      let newValues;
      let oldValues;
      scope.$watchGroup(["a"], (n, o) => {
        newValues = n;
        oldValues = o;
      });

      scope.$apply();
      expect(newValues).toBe(oldValues);

      scope.$apply("a = 1");
      expect(newValues).not.toBe(oldValues);
    });

    it("should pass same group instance on first call (multiple expressions)", () => {
      let newValues;
      let oldValues;
      scope.$watchGroup(["a", "b"], (n, o) => {
        newValues = n;
        oldValues = o;
      });

      scope.$apply();
      expect(newValues).toBe(oldValues);

      scope.$apply("a = 1");
      expect(newValues).not.toBe(oldValues);
    });

    it("should detect a change to any one expression in the group", () => {
      logs = [];
      scope.$watchGroup(["a", "b"], (values, oldValues, s) => {
        expect(s).toBe(scope);
        logs.push(`${oldValues} >>> ${values}`);
      });

      scope.a = "foo";
      scope.b = "bar";
      scope.$digest();
      expect(logs[0]).toEqual("foo,bar >>> foo,bar");

      logs = [];
      scope.$digest();
      expect(logs).toEqual([]);

      scope.a = "a";
      scope.$digest();
      expect(logs[0]).toEqual("foo,bar >>> a,bar");

      logs = [];
      scope.a = "A";
      scope.b = "B";
      scope.$digest();
      expect(logs[0]).toEqual("a,bar >>> A,B");
    });

    it("should work for a group with just a single expression", () => {
      logs = [];
      scope.$watchGroup(["a"], (values, oldValues, s) => {
        expect(s).toBe(scope);
        logs.push(`${oldValues} >>> ${values}`);
      });

      scope.a = "foo";
      scope.$digest();
      expect(logs[0]).toEqual("foo >>> foo");

      logs = [];
      scope.$digest();
      expect(logs).toEqual([]);

      scope.a = "bar";
      scope.$digest();
      expect(logs[0]).toEqual("foo >>> bar");
    });

    it("should call the listener once when the array of watchExpressions is empty", () => {
      logs = [];
      scope.$watchGroup([], (values, oldValues) => {
        logs.push(`${oldValues} >>> ${values}`);
      });

      expect(logs).toEqual([]);
      scope.$digest();
      expect(logs[0]).toEqual(" >>> ");

      logs = [];
      scope.$digest();
      expect(logs).toEqual([]);
    });

    it("should not call watch action fn when watchGroup was deregistered", () => {
      logs = [];
      const deregisterMany = scope.$watchGroup(
        ["a", "b"],
        (values, oldValues) => {
          logs.push(`${oldValues} >>> ${values}`);
        },
      );
      const deregisterOne = scope.$watchGroup(["a"], (values, oldValues) => {
        logs.push(`${oldValues} >>> ${values}`);
      });
      const deregisterNone = scope.$watchGroup([], (values, oldValues) => {
        logs.push(`${oldValues} >>> ${values}`);
      });

      deregisterMany();
      deregisterOne();
      deregisterNone();
      scope.a = "xxx";
      scope.b = "yyy";
      scope.$digest();
      expect(logs).toEqual([]);
    });

    it("should have each individual old value equal to new values of previous watcher invocation", () => {
      let newValues;
      let oldValues;
      scope.$watchGroup(["a", "b"], (n, o) => {
        newValues = n.slice();
        oldValues = o.slice();
      });

      scope.$apply(); // skip the initial invocation

      scope.$apply("a = 1");
      expect(newValues).toEqual([1, undefined]);
      expect(oldValues).toEqual([undefined, undefined]);

      scope.$apply("a = 2");
      expect(newValues).toEqual([2, undefined]);
      expect(oldValues).toEqual([1, undefined]);

      scope.$apply("b = 3");
      expect(newValues).toEqual([2, 3]);
      expect(oldValues).toEqual([2, undefined]);

      scope.$apply("a = b = 4");
      expect(newValues).toEqual([4, 4]);
      expect(oldValues).toEqual([2, 3]);

      scope.$apply("a = 5");
      expect(newValues).toEqual([5, 4]);
      expect(oldValues).toEqual([4, 4]);

      scope.$apply("b = 6");
      expect(newValues).toEqual([5, 6]);
      expect(oldValues).toEqual([5, 4]);
    });

    it("should have each individual old value equal to new values of previous watcher invocation, with modifications from other watchers", () => {
      scope.$watch("a", () => {
        scope.b++;
      });
      scope.$watch("b", () => {
        scope.c++;
      });

      let newValues;
      let oldValues;
      scope.$watchGroup(["a", "b", "c"], (n, o) => {
        newValues = n.slice();
        oldValues = o.slice();
      });

      scope.$apply(); // skip the initial invocation

      scope.$apply("a = b = c = 1");
      expect(newValues).toEqual([1, 2, 2]);
      expect(oldValues).toEqual([undefined, NaN, NaN]);

      scope.$apply("a = 3");
      expect(newValues).toEqual([3, 3, 3]);
      expect(oldValues).toEqual([1, 2, 2]);

      scope.$apply("b = 5");
      expect(newValues).toEqual([3, 5, 4]);
      expect(oldValues).toEqual([3, 3, 3]);

      scope.$apply("c = 7");
      expect(newValues).toEqual([3, 5, 7]);
      expect(oldValues).toEqual([3, 5, 4]);
    });

    it("should remove all watchers once one-time/constant bindings are stable", () => {
      // empty
      scope.$watchGroup([], () => {});
      // single one-time
      scope.$watchGroup(["::a"], () => {});
      // multi one-time
      scope.$watchGroup(["::a", "::b"], () => {});
      // single constant
      scope.$watchGroup(["1"], () => {});
      // multi constant
      scope.$watchGroup(["1", "2"], () => {});
      // multi one-time/constant
      scope.$watchGroup(["::a", "1"], () => {});

      expect(scope.$$watchersCount).not.toBe(0);
      scope.$apply("a = b = 1");
      expect(scope.$$watchersCount).toBe(0);
    });

    it("should maintain correct new/old values with one time bindings", () => {
      let newValues;
      let oldValues;
      scope.$watchGroup(["a", "::b", "b", "4"], (n, o) => {
        newValues = n.slice();
        oldValues = o.slice();
      });

      scope.$apply();
      expect(newValues).toEqual(oldValues);
      expect(oldValues).toEqual([undefined, undefined, undefined, 4]);

      scope.$apply("a = 1");
      expect(newValues).toEqual([1, undefined, undefined, 4]);
      expect(oldValues).toEqual([undefined, undefined, undefined, 4]);

      scope.$apply("b = 2");
      expect(newValues).toEqual([1, 2, 2, 4]);
      expect(oldValues).toEqual([1, undefined, undefined, 4]);

      scope.$apply("b = 3");
      expect(newValues).toEqual([1, 2, 3, 4]);
      expect(oldValues).toEqual([1, 2, 2, 4]);

      scope.$apply("b = 4");
      expect(newValues).toEqual([1, 2, 4, 4]);
      expect(oldValues).toEqual([1, 2, 3, 4]);
    });
  });

  describe("$watchGroup with logging $exceptionHandler", () => {
    it("should maintain correct new/old values even when listener throws", () => {
      let newValues;
      let oldValues;
      $rootScope.$watchGroup(["a", "::b", "b", "4"], (n, o) => {
        newValues = n.slice();
        oldValues = o.slice();
        throw "test";
      });

      $rootScope.$apply();
      expect(newValues).toEqual(oldValues);
      expect(oldValues).toEqual([undefined, undefined, undefined, 4]);
      expect(logs.length).toBe(1);

      $rootScope.$apply("a = 1");
      expect(newValues).toEqual([1, undefined, undefined, 4]);
      expect(oldValues).toEqual([undefined, undefined, undefined, 4]);
      expect(logs.length).toBe(2);

      $rootScope.$apply("b = 2");
      expect(newValues).toEqual([1, 2, 2, 4]);
      expect(oldValues).toEqual([1, undefined, undefined, 4]);
      expect(logs.length).toBe(3);

      $rootScope.$apply("b = 3");
      expect(newValues).toEqual([1, 2, 3, 4]);
      expect(oldValues).toEqual([1, 2, 2, 4]);
      expect(logs.length).toBe(4);

      $rootScope.$apply("b = 4");
      expect(newValues).toEqual([1, 2, 4, 4]);
      expect(oldValues).toEqual([1, 2, 3, 4]);
      expect(logs.length).toBe(5);
    });
  });

  describe("$destroy", () => {
    let first = null;
    let middle = null;
    let last = null;
    let log = null;

    beforeEach(() => {
      log = "";

      first = $rootScope.$new();
      middle = $rootScope.$new();
      last = $rootScope.$new();

      first.$watch(() => {
        log += "1";
      });
      middle.$watch(() => {
        log += "2";
      });
      last.$watch(() => {
        log += "3";
      });

      $rootScope.$digest();
      log = "";
    });

    it("should broadcast $destroy on rootScope", () => {
      const spy = jasmine.createSpy("$destroy handler");
      $rootScope.$on("$destroy", spy);
      $rootScope.$destroy();
      expect(spy).toHaveBeenCalled();
      expect($rootScope.$$destroyed).toBe(true);
    });

    it("should remove all listeners after $destroy of rootScope", () => {
      const spy = jasmine.createSpy("$destroy handler");
      $rootScope.$on("dummy", spy);
      $rootScope.$destroy();
      $rootScope.$broadcast("dummy");
      expect(spy).not.toHaveBeenCalled();
    });

    it("should remove all watchers after $destroy of rootScope", () => {
      const spy = jasmine.createSpy("$watch spy");
      $rootScope.$watch(spy);
      $rootScope.$destroy();
      $rootScope.$digest();
      expect(spy).not.toHaveBeenCalled();
    });

    it("should call $browser.$$applicationDestroyed when destroying rootScope", () => {
      spyOn($browser, "$$applicationDestroyed");
      $rootScope.$destroy();
      expect($browser.$$applicationDestroyed).toHaveBeenCalled();
    });

    it("should remove first", () => {
      first.$destroy();
      $rootScope.$digest();
      expect(log).toEqual("23");
    });

    it("should remove middle", () => {
      middle.$destroy();
      $rootScope.$digest();
      expect(log).toEqual("13");
    });

    it("should remove last", () => {
      last.$destroy();
      $rootScope.$digest();
      expect(log).toEqual("12");
    });

    it("should broadcast the $destroy event", () => {
      logs = [];
      first.$on("$destroy", () => logs.push("first"));
      first.$new().$on("$destroy", () => logs.push("first-child"));

      first.$destroy();
      expect(logs).toEqual(["first", "first-child"]);
    });

    it("should $destroy a scope only once and ignore any further destroy calls", () => {
      $rootScope.$digest();
      expect(log).toBe("123");

      first.$destroy();

      // once a scope is destroyed apply should not do anything any more
      first.$apply();
      expect(log).toBe("123");

      first.$destroy();
      first.$destroy();
      first.$apply();
      expect(log).toBe("123");
    });

    it("should broadcast the $destroy only once", () => {
      logs = [];
      const isolateScope = first.$new(true);
      isolateScope.$on("$destroy", () => logs.push("event"));
      first.$destroy();
      isolateScope.$destroy();
      expect(logs).toEqual(["event"]);
    });

    it("should decrement ancestor $$listenerCount entries", () => {
      const EVENT = "fooEvent";
      const spy = jasmine.createSpy("listener");
      const firstSecond = first.$new();

      firstSecond.$on(EVENT, spy);
      firstSecond.$on(EVENT, spy);
      middle.$on(EVENT, spy);

      expect($rootScope.$$listenerCount[EVENT]).toBe(3);
      expect(first.$$listenerCount[EVENT]).toBe(2);

      firstSecond.$destroy();

      expect($rootScope.$$listenerCount[EVENT]).toBe(1);
      expect(first.$$listenerCount[EVENT]).toBeUndefined();

      $rootScope.$broadcast(EVENT);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it("should do nothing when a child event listener is registered after parent's destruction", () => {
      const parent = $rootScope.$new();
      const child = parent.$new();
      parent.$destroy();
      let called = false;
      child.$on("someEvent", () => {
        called = true;
      });

      // Trigger the event
      child.$broadcast("someEvent");

      // Check if the listener was called
      expect(called).toBe(false);
    });

    it("should do nothing when a child watch is registered after parent's destruction", () => {
      const parent = $rootScope.$new();
      const child = parent.$new();
      parent.$destroy();
      let called = false;
      child.$watch("someEvent", () => {
        called = true;
      });
      expect(called).toBe(false);
    });

    it("should do nothing when $apply()ing after parent's destruction", () => {
      const parent = $rootScope.$new();
      const child = parent.$new();

      parent.$destroy();

      let called = false;
      function applyFunc() {
        called = true;
      }
      child.$apply(applyFunc);

      expect(called).toBe(false);
    });

    it("should do nothing when $evalAsync()ing after parent's destruction", () => {
      const parent = $rootScope.$new();
      const child = parent.$new();

      parent.$destroy();

      let called = false;
      function applyFunc() {
        called = true;
      }
      child.$evalAsync(applyFunc);
      expect(called).toBe(false);
    });

    it("should preserve all (own and inherited) model properties on a destroyed scope", () => {
      // This test simulates an async task (xhr response) interacting with the scope after the scope
      // was destroyed. Since we can't abort the request, we should ensure that the task doesn't
      // throw NPEs because the scope was cleaned up during destruction.

      const parent = $rootScope.$new();
      const child = parent.$new();

      parent.parentModel = "parent";
      child.childModel = "child";

      child.$destroy();

      expect(child.parentModel).toBe("parent");
      expect(child.childModel).toBe("child");
    });
  });

  describe("$eval", () => {
    it("should eval an expression", () => {
      expect($rootScope.$eval("a=1")).toEqual(1);
      expect($rootScope.a).toEqual(1);

      $rootScope.$eval((self) => {
        self.b = 2;
      });
      expect($rootScope.b).toEqual(2);
    });

    it("should allow passing locals to the expression", () => {
      expect($rootScope.$eval("a+1", { a: 2 })).toBe(3);

      $rootScope.$eval(
        (scope, locals) => {
          scope.c = locals.b + 4;
        },
        { b: 3 },
      );
      expect($rootScope.c).toBe(7);
    });
  });

  describe("$evalAsync", () => {
    it("should run callback before $watch", () => {
      let log = "";
      const child = $rootScope.$new();
      $rootScope.$evalAsync((scope) => {
        log += "parent.async;";
      });
      $rootScope.$watch("value", () => {
        log += "parent.$digest;";
      });
      child.$evalAsync((scope) => {
        log += "child.async;";
      });
      child.$watch("value", () => {
        log += "child.$digest;";
      });
      $rootScope.$digest();
      expect(log).toEqual(
        "parent.async;child.async;parent.$digest;child.$digest;",
      );
    });

    it("should not run another digest for an $$postDigest call", () => {
      let internalWatchCount = 0;
      let externalWatchCount = 0;

      $rootScope.internalCount = 0;
      $rootScope.externalCount = 0;

      $rootScope.$evalAsync((scope) => {
        $rootScope.internalCount++;
      });

      $rootScope.$$postDigest((scope) => {
        $rootScope.externalCount++;
      });

      $rootScope.$watch("internalCount", (value) => {
        internalWatchCount = value;
      });
      $rootScope.$watch("externalCount", (value) => {
        externalWatchCount = value;
      });

      $rootScope.$digest();

      expect(internalWatchCount).toEqual(1);
      expect(externalWatchCount).toEqual(0);
    });

    it("should cause a $digest rerun", () => {
      $rootScope.log = "";
      $rootScope.value = 0;
      $rootScope.$watch("value", () => {
        $rootScope.log += ".";
      });
      $rootScope.$watch("init", () => {
        $rootScope.$evalAsync('value = 123; log = log + "=" ');
        expect($rootScope.value).toEqual(0);
      });
      $rootScope.$digest();
      expect($rootScope.log).toEqual(".=.");
    });

    it("should run async in the same order as added", () => {
      $rootScope.log = "";
      $rootScope.$evalAsync("log = log + 1");
      $rootScope.$evalAsync("log = log + 2");
      $rootScope.$digest();
      expect($rootScope.log).toBe("12");
    });

    it("should allow passing locals to the expression", () => {
      $rootScope.log = "";
      $rootScope.$evalAsync("log = log + a", { a: 1 });
      $rootScope.$digest();
      expect($rootScope.log).toBe("1");
    });

    it("should run async expressions in their proper context", () => {
      const child = $rootScope.$new();
      $rootScope.ctx = "root context";
      $rootScope.log = "";
      child.ctx = "child context";
      child.log = "";
      child.$evalAsync("log=ctx");
      $rootScope.$digest();
      expect($rootScope.log).toBe("");
      expect(child.log).toBe("child context");
    });

    it("should operate only with a single queue across all child and isolate scopes", () => {
      const childScope = $rootScope.$new();
      const isolateScope = $rootScope.$new(true);

      $rootScope.$evalAsync("rootExpression");
      childScope.$evalAsync("childExpression");
      isolateScope.$evalAsync("isolateExpression");
      expect($$asyncQueue).toEqual([
        {
          scope: $rootScope,
          fn: $parse("rootExpression"),
          locals: undefined,
        },
        {
          scope: childScope,
          fn: $parse("childExpression"),
          locals: undefined,
        },
        {
          scope: isolateScope,
          fn: $parse("isolateExpression"),
          locals: undefined,
        },
      ]);
    });

    describe("auto-flushing when queueing outside of an $apply", () => {
      it("should auto-flush the queue asynchronously and trigger digest", () => {
        logs = [];
        $rootScope.$evalAsync(() => {
          logs.push("eval-ed!");
          return "eval-ed!";
        });
        $rootScope.$watch(() => {
          logs.push("digesting");
          return "digesting";
        });
        expect(logs).toEqual([]);
        setTimeout(() => {
          expect(logs).toEqual(["eval-ed!", "digesting", "digesting"]);
        });
      });

      it("should not trigger digest asynchronously if the queue is empty in the next tick", () => {
        logs = [];
        $rootScope.$evalAsync(() => {
          logs.push("eval-ed!");
          return "eval-ed!";
        });
        $rootScope.$watch(() => {
          logs.push("digesting");
          return "digesting";
        });
        expect(logs).toEqual([]);

        $rootScope.$digest();

        expect(logs).toEqual(["eval-ed!", "digesting", "digesting"]);
        logs = [];

        setTimeout(() => {
          expect(logs).toEqual([]);
        });
      });

      it("should not schedule more than one auto-flush task", () => {
        logs = [];
        $rootScope.$evalAsync(() => {
          logs.push("eval-ed 1!");
          return "eval-ed 1!";
        });
        $rootScope.$evalAsync(() => {
          logs.push("eval-ed 2!");
          return "eval-ed 2!";
        });
        expect(logs).toEqual([]);
        setTimeout(() => {
          expect(logs).toEqual(["eval-ed 1!", "eval-ed 2!"]);
        });

        setTimeout(() => {
          expect(logs).toEqual(["eval-ed 1!", "eval-ed 2!"]);
        });
      });

      it("should not have execution affected by an explicit $digest call", () => {
        const scope1 = $rootScope.$new();
        const scope2 = $rootScope.$new();

        scope1.$watch("value", (value) => {
          scope1.result = value;
        });

        scope1.$evalAsync(() => {
          scope1.value = "bar";
        });

        expect(scope1.result).toBe(undefined);
        scope2.$digest();

        setTimeout(() => expect(scope1.result).toBe("bar"));
      });
    });

    it("should not pass anything as `this` to scheduled functions", () => {
      let this1 = {};
      const this2 = (function () {
        return this;
      })();
      $rootScope.$evalAsync(function () {
        this1 = this;
      });
      $rootScope.$digest();
      expect(this1).toEqual(this2);
    });
  });

  describe("$apply", () => {
    beforeEach(() => (logs = []));

    it("should apply expression with full lifecycle", () => {
      let log = "";
      const child = $rootScope.$new();
      $rootScope.$watch("a", (a) => {
        log += "1";
      });
      child.$apply("$parent.a=0");
      expect(log).toEqual("1");
    });

    it("should catch exceptions", () => {
      let log = "";
      const child = $rootScope.$new();
      $rootScope.$watch("a", (a) => {
        log += "1";
      });
      $rootScope.a = 0;
      child.$apply(() => {
        throw new Error("MyError");
      });
      expect(log).toEqual("1");
      expect(logs[0].message).toEqual("MyError");
    });

    it("should log exceptions from $digest", () => {
      $rootScope.$watch("a", () => {
        $rootScope.b++;
      });
      $rootScope.$watch("b", () => {
        $rootScope.a++;
      });
      $rootScope.a = $rootScope.b = 0;

      expect(() => {
        $rootScope.$apply();
      }).toThrow();

      expect(logs[0]).toBeDefined();

      expect($rootScope.$$phase).toBe(0);
    });

    describe("exceptions", () => {
      let log;

      beforeEach(() => {
        logs = [];
        log = "";
        $rootScope.$watch(() => {
          log += "$digest;";
        });
        $rootScope.$digest();
        log = "";
      });

      it("should execute and return value and update", () => {
        $rootScope.name = "abc";
        expect($rootScope.$apply((scope) => scope.name)).toEqual("abc");
        expect(log).toEqual("$digest;");
        expect(logs).toEqual([]);
      });

      it("should catch exception and update", () => {
        const error = new Error("MyError");
        $rootScope.$apply(() => {
          throw error;
        });
        expect(log).toEqual("$digest;");
        expect(logs).toEqual([error]);
      });
    });

    describe("recursive $apply protection", () => {
      beforeEach(() => (logs = []));

      it("should throw an exception if $apply is called while an $apply is in progress", () => {
        $rootScope.$apply(() => {
          $rootScope.$apply();
        });
        expect(logs[0].message.match(/progress/g).length).toBeTruthy();
      });

      it("should not clear the state when calling $apply during an $apply", () => {
        $rootScope.$apply(() => {
          $rootScope.$apply();
          expect(logs[0].message.match(/progress/g).length).toBeTruthy();
          logs = [];
          $rootScope.$apply();
          expect(logs[0].message.match(/progress/g).length).toBeTruthy();
        });
        logs = [];
        $rootScope.$apply();
        expect(logs).toEqual([]);
      });

      it("should throw an exception if $apply is called while flushing evalAsync queue", () => {
        $rootScope.$apply(() => {
          $rootScope.$evalAsync(() => {
            $rootScope.$apply();
          });
        });
        expect(logs[0].message.match(/progress/g).length).toBeTruthy();
      });

      it("should throw an exception if $apply is called while a watch is being initialized", () => {
        const childScope1 = $rootScope.$new();
        childScope1.$watch("x", () => {
          childScope1.$apply();
        });
        childScope1.$apply();
        expect(logs[0].message.match(/progress/g).length).toBeTruthy();
      });

      it("should thrown an exception if $apply in called from a watch fn (after init)", () => {
        const childScope2 = $rootScope.$new();
        childScope2.$apply(() => {
          childScope2.$watch("x", (newVal, oldVal) => {
            if (newVal !== oldVal) {
              childScope2.$apply();
            }
          });
        });
        childScope2.$apply(() => {
          childScope2.x = "something";
        });

        expect(logs[0].message.match(/progress/g).length).toBeTruthy();
      });
    });
  });

  describe("$applyAsync", () => {
    beforeEach(() => (logs = []));
    it("should evaluate in the context of specific $scope", () => {
      const scope = $rootScope.$new();
      let id = scope.$applyAsync('x = "CODE ORANGE"');

      $browser.cancel(id);
      setTimeout(() => {
        expect(scope.x).toBe("CODE ORANGE");
        expect($rootScope.x).toBeUndefined();
      });

      expect(scope.x).toBeUndefined();
    });

    it("should evaluate queued expressions in order", () => {
      $rootScope.x = [];
      let id1 = $rootScope.$applyAsync('x.push("expr1")');
      let id2 = $rootScope.$applyAsync('x.push("expr2")');

      $browser.cancel(id1);
      $browser.cancel(id2);
      setTimeout(() => {
        expect($rootScope.x).toEqual(["expr1", "expr2"]);
      });
      expect($rootScope.x).toEqual([]);
    });

    it("should evaluate subsequently queued items in same turn", () => {
      $rootScope.x = [];
      let id = $rootScope.$applyAsync(() => {
        $rootScope.x.push("expr1");
        $rootScope.$applyAsync('x.push("expr2")');
        expect($browser.deferredFns.length).toBe(0);
      });

      $browser.cancel(id);
      setTimeout(() => {
        expect($rootScope.x).toEqual(["expr1", "expr2"]);
      });
      expect($rootScope.x).toEqual([]);
    });

    it("should pass thrown exceptions to $exceptionHandler", () => {
      let id = $rootScope.$applyAsync(() => {
        throw "OOPS";
      });

      $browser.cancel(id);
      expect(logs).toEqual([]);
      setTimeout(() => expect(logs[0]).toEqual("OOPS"));
    });

    it("should evaluate subsequent expressions after an exception is thrown", () => {
      let id = $rootScope.$applyAsync(() => {
        throw "OOPS";
      });
      let id2 = $rootScope.$applyAsync('x = "All good!"');

      $browser.cancel(id);
      $browser.cancel(id2);
      setTimeout(() => expect($rootScope.x).toBe("All good!"));
      expect($rootScope.x).toBeUndefined();
    });

    it("should be cancelled if a $rootScope digest occurs before the next tick", () => {
      const cancel = spyOn($browser, "cancel").and.callThrough();
      const expression = jasmine.createSpy("expr");

      $rootScope.$applyAsync(expression);
      $rootScope.$digest();
      expect(expression).toHaveBeenCalled();
      expect(cancel).toHaveBeenCalled();
      expression.calls.reset();
      cancel.calls.reset();

      // assert that another digest won't call the function again
      $rootScope.$digest();
      expect(expression).not.toHaveBeenCalled();
      expect(cancel).not.toHaveBeenCalled();
    });
  });

  describe("$$postDigest", () => {
    beforeEach(() => (logs = []));
    it("should process callbacks as a queue (FIFO) when the scope is digested", () => {
      let signature = "";

      $rootScope.$$postDigest(() => {
        signature += "A";
        $rootScope.$$postDigest(() => {
          signature += "D";
        });
      });

      $rootScope.$$postDigest(() => {
        signature += "B";
      });

      $rootScope.$$postDigest(() => {
        signature += "C";
      });

      expect(signature).toBe("");
      $rootScope.$digest();
      expect(signature).toBe("ABCD");
    });

    it("should support $apply calls nested in $$postDigest callbacks", () => {
      let signature = "";

      $rootScope.$$postDigest(() => {
        signature += "A";
      });

      $rootScope.$$postDigest(() => {
        signature += "B";
        $rootScope.$apply();
        signature += "D";
      });

      $rootScope.$$postDigest(() => {
        signature += "C";
      });

      expect(signature).toBe("");
      $rootScope.$digest();
      expect(signature).toBe("ABCD");
    });

    it("should run a $$postDigest call on all child scopes when a parent scope is digested", () => {
      const parent = $rootScope.$new();
      const child = parent.$new();
      let count = 0;

      $rootScope.$$postDigest(() => {
        count++;
      });

      parent.$$postDigest(() => {
        count++;
      });

      child.$$postDigest(() => {
        count++;
      });

      expect(count).toBe(0);
      $rootScope.$digest();
      expect(count).toBe(3);
    });

    it("should run a $$postDigest call even if the child scope is isolated", () => {
      const parent = $rootScope.$new();
      const child = parent.$new(true);
      let signature = "";

      parent.$$postDigest(() => {
        signature += "A";
      });

      child.$$postDigest(() => {
        signature += "B";
      });

      expect(signature).toBe("");
      $rootScope.$digest();
      expect(signature).toBe("AB");
    });
  });

  describe("events", () => {
    describe("$on", () => {
      it("should add listener for both $emit and $broadcast events", () => {
        logs = "";
        const child = $rootScope.$new();

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

      it("should increment ancestor $$listenerCount entries", () => {
        const child1 = $rootScope.$new();
        const child2 = child1.$new();
        const spy = jasmine.createSpy();

        $rootScope.$on("event1", spy);
        expect($rootScope.$$listenerCount.event1).toEqual(1);

        child1.$on("event1", spy);
        expect($rootScope.$$listenerCount.event1).toEqual(2);
        expect(child1.$$listenerCount.event1).toEqual(1);

        child2.$on("event2", spy);
        expect($rootScope.$$listenerCount.event1).toEqual(2);
        expect($rootScope.$$listenerCount.event2).toEqual(1);
        expect(child1.$$listenerCount.event1).toEqual(1);
        expect(child1.$$listenerCount.event2).toEqual(1);
        expect(child2.$$listenerCount.event2).toEqual(1);
      });

      describe("deregistration", () => {
        it("should return a function that deregisters the listener", () => {
          let log = "";
          const child = $rootScope.$new();
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
          expect($rootScope.$$listenerCount.abc).toBe(1);

          log = "";
          listenerRemove();
          child.$emit("abc");
          child.$broadcast("abc");
          expect(log).toEqual("");
          expect($rootScope.$$listenerCount.abc).toBeUndefined();
        });

        // See issue https://github.com/angular/angular.js/issues/16135
        it("should deallocate the listener array entry", () => {
          const remove1 = $rootScope.$on("abc", () => {});
          $rootScope.$on("abc", () => {});

          expect($rootScope.$$listeners.get("abc").length).toBe(2);
          expect(0 in $rootScope.$$listeners.get("abc")).toBe(true);

          remove1();

          expect($rootScope.$$listeners.get("abc").length).toBe(2);
          expect(0 in $rootScope.$$listeners.get("abc")).toBe(false);
        });

        it("should call next listener after removing the current listener via its own handler", () => {
          const listener1 = jasmine.createSpy("listener1").and.callFake(() => {
            remove1();
          });
          let remove1 = $rootScope.$on("abc", listener1);

          const listener2 = jasmine.createSpy("listener2");
          const remove2 = $rootScope.$on("abc", listener2);

          const listener3 = jasmine.createSpy("listener3");
          const remove3 = $rootScope.$on("abc", listener3);

          $rootScope.$broadcast("abc");
          expect(listener1).toHaveBeenCalled();
          expect(listener2).toHaveBeenCalled();
          expect(listener3).toHaveBeenCalled();

          listener1.calls.reset();
          listener2.calls.reset();
          listener3.calls.reset();

          $rootScope.$broadcast("abc");
          expect(listener1).not.toHaveBeenCalled();
          expect(listener2).toHaveBeenCalled();
          expect(listener3).toHaveBeenCalled();
        });

        it("should call all subsequent listeners when a previous listener is removed via a handler", () => {
          const listener1 = jasmine.createSpy();
          const remove1 = $rootScope.$on("abc", listener1);

          const listener2 = jasmine.createSpy().and.callFake(remove1);
          const remove2 = $rootScope.$on("abc", listener2);

          const listener3 = jasmine.createSpy();
          const remove3 = $rootScope.$on("abc", listener3);

          $rootScope.$broadcast("abc");
          expect(listener1).toHaveBeenCalled();
          expect(listener2).toHaveBeenCalled();
          expect(listener3).toHaveBeenCalled();

          listener1.calls.reset();
          listener2.calls.reset();
          listener3.calls.reset();

          $rootScope.$broadcast("abc");
          expect(listener1).not.toHaveBeenCalled();
          expect(listener2).toHaveBeenCalled();
          expect(listener3).toHaveBeenCalled();
        });

        it("should not call listener when removed by previous", () => {
          const listener1 = jasmine.createSpy("listener1");
          const remove1 = $rootScope.$on("abc", listener1);

          const listener2 = jasmine.createSpy("listener2").and.callFake(() => {
            remove3();
          });
          const remove2 = $rootScope.$on("abc", listener2);

          const listener3 = jasmine.createSpy("listener3");
          let remove3 = $rootScope.$on("abc", listener3);

          const listener4 = jasmine.createSpy("listener4");
          const remove4 = $rootScope.$on("abc", listener4);

          $rootScope.$broadcast("abc");
          expect(listener1).toHaveBeenCalled();
          expect(listener2).toHaveBeenCalled();
          expect(listener3).not.toHaveBeenCalled();
          expect(listener4).toHaveBeenCalled();

          listener1.calls.reset();
          listener2.calls.reset();
          listener3.calls.reset();
          listener4.calls.reset();

          $rootScope.$broadcast("abc");
          expect(listener1).toHaveBeenCalled();
          expect(listener2).toHaveBeenCalled();
          expect(listener3).not.toHaveBeenCalled();
          expect(listener4).toHaveBeenCalled();
        });

        it("should decrement ancestor $$listenerCount entries", () => {
          const child1 = $rootScope.$new();
          const child2 = child1.$new();
          const spy = jasmine.createSpy();

          $rootScope.$on("event1", spy);
          expect($rootScope.$$listenerCount.event1).toEqual(1);

          child1.$on("event1", spy);
          expect($rootScope.$$listenerCount.event1).toEqual(2);
          expect(child1.$$listenerCount.event1).toEqual(1);

          const deregisterEvent2Listener = child2.$on("event2", spy);
          expect($rootScope.$$listenerCount.event1).toEqual(2);
          expect($rootScope.$$listenerCount.event2).toEqual(1);
          expect(child1.$$listenerCount.event1).toEqual(1);
          expect(child1.$$listenerCount.event2).toEqual(1);
          expect(child2.$$listenerCount.event2).toEqual(1);

          deregisterEvent2Listener();

          expect($rootScope.$$listenerCount.event1).toEqual(2);
          expect(child1.$$listenerCount.event1).toEqual(1);
          expect(child2.$$listenerCount).toBeTruthy();
        });

        it("should not decrement $$listenerCount when called second time", () => {
          const child = $rootScope.$new();
          const listener1Spy = jasmine.createSpy();
          const listener2Spy = jasmine.createSpy();

          child.$on("abc", listener1Spy);
          expect($rootScope.$$listenerCount.abc).toEqual(1);
          expect(child.$$listenerCount.abc).toEqual(1);

          const deregisterEventListener = child.$on("abc", listener2Spy);
          expect($rootScope.$$listenerCount.abc).toEqual(2);
          expect(child.$$listenerCount.abc).toEqual(2);

          deregisterEventListener();

          expect($rootScope.$$listenerCount.abc).toEqual(1);
          expect(child.$$listenerCount.abc).toEqual(1);

          deregisterEventListener();

          expect($rootScope.$$listenerCount.abc).toEqual(1);
          expect(child.$$listenerCount.abc).toEqual(1);
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
        child = $rootScope.$new();
        grandChild = child.$new();
        greatGrandChild = grandChild.$new();

        $rootScope.id = 0;
        child.id = 1;
        grandChild.id = 2;
        greatGrandChild.id = 3;

        $rootScope.$on("myEvent", logger);
        child.$on("myEvent", logger);
        grandChild.$on("myEvent", logger);
        greatGrandChild.$on("myEvent", logger);
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

        expect(child.$$listeners.get("evt").length).toBe(3);

        // should call all listeners and remove 1st
        child.$emit("evt");
        expect(spy1).toHaveBeenCalled();
        expect(spy2).toHaveBeenCalled();
        expect(spy3).toHaveBeenCalled();
        expect(child.$$listeners.get("evt").length).toBe(3); // cleanup will happen on next $emit

        spy1.calls.reset();
        spy2.calls.reset();
        spy3.calls.reset();

        // should call only 2nd because 1st was already removed and 2nd removes 3rd
        spy2.and.callFake(remove3);
        child.$emit("evt");
        expect(spy1).not.toHaveBeenCalled();
        expect(spy2).toHaveBeenCalled();
        expect(spy3).not.toHaveBeenCalled();
        expect(child.$$listeners.get("evt").length).toBe(1);
      });

      it("should allow removing event listener inside a listener on $broadcast", () => {
        const spy1 = jasmine.createSpy("1st listener");
        const spy2 = jasmine.createSpy("2nd listener");
        const spy3 = jasmine.createSpy("3rd listener");

        const remove1 = child.$on("evt", spy1);
        const remove2 = child.$on("evt", spy2);
        const remove3 = child.$on("evt", spy3);

        spy1.and.callFake(remove1);

        expect(child.$$listeners.get("evt").length).toBe(3);

        // should call all listeners and remove 1st
        child.$broadcast("evt");
        expect(spy1).toHaveBeenCalled();
        expect(spy2).toHaveBeenCalled();
        expect(spy3).toHaveBeenCalled();
        expect(child.$$listeners.get("evt").length).toBe(3); // cleanup will happen on next $broadcast

        spy1.calls.reset();
        spy2.calls.reset();
        spy3.calls.reset();

        // should call only 2nd because 1st was already removed and 2nd removes 3rd
        spy2.and.callFake(remove3);
        child.$broadcast("evt");
        expect(spy1).not.toHaveBeenCalled();
        expect(spy2).toHaveBeenCalled();
        expect(spy3).not.toHaveBeenCalled();
        expect(child.$$listeners.get("evt").length).toBe(1);
      });

      describe("event object", () => {
        it("should have methods/properties", () => {
          let eventFired = false;

          child.$on("myEvent", (e) => {
            expect(e.targetScope).toBe(grandChild);
            expect(e.currentScope).toBe(child);
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
          expect(event.targetScope).toBe(grandChild);
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
          child1 = $rootScope.$new();
          child2 = $rootScope.$new();
          child3 = $rootScope.$new();
          grandChild11 = child1.$new();
          grandChild21 = child2.$new();
          grandChild22 = child2.$new();
          grandChild23 = child2.$new();
          greatGrandChild211 = grandChild21.$new();

          $rootScope.id = 0;
          child1.id = 1;
          child2.id = 2;
          child3.id = 3;
          grandChild11.id = 11;
          grandChild21.id = 21;
          grandChild22.id = 22;
          grandChild23.id = 23;
          greatGrandChild211.id = 211;

          $rootScope.$on("myEvent", logger);
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
          $rootScope.$broadcast("myEvent");
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
          $rootScope.$broadcast("fooEvent");
          expect(log).toBe("");
        });

        it("should not descend past scopes with a $$listerCount of 0 or undefined", () => {
          const EVENT = "fooEvent";
          const spy = jasmine.createSpy("listener");

          // Precondition: There should be no listeners for fooEvent.
          expect($rootScope.$$listenerCount[EVENT]).toBeUndefined();

          // Add a spy listener to a child scope.
          $rootScope.$$childHead.$$listeners[EVENT] = [spy];

          // $rootScope's count for 'fooEvent' is undefined, so spy should not be called.
          $rootScope.$broadcast(EVENT);
          expect(spy).not.toHaveBeenCalled();
        });

        it("should return event object", () => {
          const result = child1.$broadcast("some");

          expect(result).toBeDefined();
          expect(result.name).toBe("some");
          expect(result.targetScope).toBe(child1);
        });
      });

      describe("listener", () => {
        it("should receive event object", () => {
          const scope = $rootScope;
          const child = scope.$new();
          let eventFired = false;

          child.$on("fooEvent", (event) => {
            eventFired = true;
            expect(event.name).toBe("fooEvent");
            expect(event.targetScope).toBe(scope);
            expect(event.currentScope).toBe(child);
          });
          scope.$broadcast("fooEvent");

          expect(eventFired).toBe(true);
        });

        it("should have the event's `currentScope` property set to null after broadcast", () => {
          const scope = $rootScope;
          const child = scope.$new();
          let event;

          child.$on("fooEvent", (e) => {
            event = e;
          });
          scope.$broadcast("fooEvent");

          expect(event.name).toBe("fooEvent");
          expect(event.targetScope).toBe(scope);
          expect(event.currentScope).toBe(null);
        });

        it("should support passing messages as constargs", () => {
          const scope = $rootScope;
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
      $rootScope.$on("evt", ($event, arg0) => {
        callCount++;
        if (arg0 !== 1234) {
          $rootScope.$emit("evt", 1234);
          $rootScope.$broadcast("evt", 1234);
        }
      });

      $rootScope.$emit("evt");
      $rootScope.$broadcast("evt");
      expect(callCount).toBe(6);
    });

    it("should allow recursive $emit/$broadcast between parent/child", () => {
      const child = $rootScope.$new();
      let calls = "";

      $rootScope.$on("evt", ($event, arg0) => {
        calls += "r"; // For "root".
        if (arg0 === "fromChild") {
          $rootScope.$broadcast("evt", "fromRoot2");
        }
      });

      child.$on("evt", ($event, arg0) => {
        calls += "c"; // For "child".
        if (arg0 === "fromRoot1") {
          child.$emit("evt", "fromChild");
        }
      });

      $rootScope.$broadcast("evt", "fromRoot1");
      expect(calls).toBe("rccrrc");
    });
  });

  describe("doc examples", () => {
    it("should properly fire off watch listeners upon scope changes", () => {
      // <docs tag="docs1">
      const scope = $rootScope.$new();
      scope.salutation = "Hello";
      scope.name = "World";

      expect(scope.greeting).toEqual(undefined);

      scope.$watch("name", () => {
        scope.greeting = `${scope.salutation} ${scope.name}!`;
      }); // initialize the watch

      expect(scope.greeting).toEqual(undefined);
      scope.name = "Misko";
      // still old value, since watches have not been called yet
      expect(scope.greeting).toEqual(undefined);

      scope.$digest(); // fire all  the watches
      expect(scope.greeting).toEqual("Hello Misko!");
      // </docs>
    });
  });
});
