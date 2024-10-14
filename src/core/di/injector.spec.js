import { Angular } from "../../loader";
import { createInjector, annotate } from "./injector";
import { valueFn, extend } from "../../shared/utils";

describe("injector.modules", () => {
  beforeEach(() => {
    window.angular = new Angular();
  });

  it("can be created", () => {
    const injector = createInjector([]);
    expect(injector).toBeDefined();
  });

  it("should have $injector", () => {
    const $injector = createInjector([]);
    expect($injector.get("$injector")).toBe($injector);
  });

  it("should have modules property", () => {
    const $injector = createInjector([]);
    expect($injector.modules).toEqual({});
  });

  it("should have methods", () => {
    const $injector = createInjector([]);
    expect($injector.has).toBeDefined();
    expect($injector.invoke).toBeDefined();
    expect($injector.instantiate).toBeDefined();
    expect($injector.get).toBeDefined();
  });

  it("should have a false strictDi property", () => {
    const injector = createInjector([]);
    expect(injector.strictDi).toBe(false);
  });

  it("should check its modulesToLoad argument", () => {
    expect(() => {
      createInjector(["test"]);
    }).toThrow();
  });

  it("should provide useful message if no provider", () => {
    expect(() => {
      const injector = createInjector([]);
      injector.get("idontexist");
    }).toThrowError(/Unknown provider/);
  });

  it("has a constant that has been registered to a module", () => {
    const module = angular.module("myModule", []);
    module.constant("aConstant", 42);

    const injector = createInjector(["myModule"]);
    expect(injector.has("aConstant")).toBe(true);
  });

  it("does not have a non-registered constant", () => {
    angular.module("myModule", []);
    const injector = createInjector(["myModule"]);
    expect(injector.has("aConstant")).toBe(false);
  });

  it("does not allow a constant called hasOwnProperty", () => {
    const module = angular.module("myModule", []);
    module.constant("hasOwnProperty", false);
    expect(() => {
      createInjector(["myModule"]);
    }).toThrow();
  });

  it("can return a registered constant", () => {
    const module = angular.module("myModule", []);
    module.constant("aConstant", 42);
    const injector = createInjector(["myModule"]);
    expect(injector.get("aConstant")).toBe(42);
  });

  it("loads multiple modules", () => {
    const module1 = angular.module("myModule", []);
    const module2 = angular.module("myOtherModule", []);
    module1.constant("aConstant", 42);
    module2.constant("anotherConstant", 43);
    const injector = createInjector(["myModule", "myOtherModule"]);
    expect(injector.has("aConstant")).toBe(true);
    expect(injector.has("anotherConstant")).toBe(true);
  });

  it("loadNewModules should be defined on $injector", () => {
    const injector = createInjector([]);
    expect(injector.loadNewModules).toEqual(jasmine.any(Function));
  });

  it("should allow new modules to be added after injector creation", () => {
    angular.module("initial", []);
    const injector = createInjector(["initial"]);
    expect(injector.modules.initial).toBeDefined();
    expect(injector.modules.lazy).toBeUndefined();
    angular.module("lazy", []);
    injector.loadNewModules(["lazy"]);
    expect(injector.modules.lazy).toBeDefined();
  });

  it("should execute runBlocks of new modules", () => {
    const log = [];
    angular.module("initial", []).run(() => {
      log.push("initial");
    });
    const injector = createInjector(["initial"]);
    log.push("created");

    angular.module("a", []).run(() => {
      log.push("a");
    });
    injector.loadNewModules(["a"]);
    expect(log).toEqual(["initial", "created", "a"]);
  });

  it("should execute configBlocks of new modules", () => {
    const log = [];
    angular.module("initial", []).config(() => {
      log.push("initial");
    });
    const injector = createInjector(["initial"]);
    expect(log).toEqual(["initial"]);
    log.push("created");

    angular
      .module("a", [], () => {
        log.push("config1");
      })
      .config(() => {
        log.push("config2");
      });
    injector.loadNewModules(["a"]);
    expect(log).toEqual(["initial", "created", "config1", "config2"]);
  });

  it("should execute runBlocks and configBlocks in the correct order", () => {
    const log = [];
    angular
      .module("initial", [], () => {
        log.push(1);
      })
      .config(() => {
        log.push(2);
      })
      .run(() => {
        log.push(3);
      });
    const injector = createInjector(["initial"]);
    log.push("created");

    angular
      .module("a", [], () => {
        log.push(4);
      })
      .config(() => {
        log.push(5);
      })
      .run(() => {
        log.push(6);
      });
    injector.loadNewModules(["a"]);
    expect(log).toEqual([1, 2, 3, "created", 4, 5, 6]);
  });

  it("should load dependent modules", () => {
    angular.module("initial", []);
    const injector = createInjector(["initial"]);
    expect(injector.modules.initial).toBeDefined();
    expect(injector.modules.lazy1).toBeUndefined();
    expect(injector.modules.lazy2).toBeUndefined();
    angular.module("lazy1", ["lazy2"]);
    angular.module("lazy2", []);
    injector.loadNewModules(["lazy1"]);
    expect(injector.modules.lazy1).toBeDefined();
    expect(injector.modules.lazy2).toBeDefined();
  });

  it("should execute blocks of new modules in the correct order", () => {
    const log = [];
    angular.module("initial", []);
    const injector = createInjector(["initial"]);

    angular
      .module("lazy1", ["lazy2"], () => {
        log.push("lazy1-1");
      })
      .config(() => {
        log.push("lazy1-2");
      })
      .run(() => {
        log.push("lazy1-3");
      });
    angular
      .module("lazy2", [], () => {
        log.push("lazy2-1");
      })
      .config(() => {
        log.push("lazy2-2");
      })
      .run(() => {
        log.push("lazy2-3");
      });

    injector.loadNewModules(["lazy1"]);
    expect(log).toEqual([
      "lazy2-1",
      "lazy2-2",
      "lazy1-1",
      "lazy1-2",
      "lazy2-3",
      "lazy1-3",
    ]);
  });

  it("should not reload a module that is already loaded", () => {
    const log = [];
    angular.module("initial", []).run(() => {
      log.push("initial");
    });
    const injector = createInjector(["initial"]);
    expect(log).toEqual(["initial"]);

    injector.loadNewModules(["initial"]);
    expect(log).toEqual(["initial"]);

    angular.module("a", []).run(() => {
      log.push("a");
    });
    injector.loadNewModules(["a"]);
    expect(log).toEqual(["initial", "a"]);
    injector.loadNewModules(["a"]);
    expect(log).toEqual(["initial", "a"]);

    angular.module("b", ["a"]).run(() => {
      log.push("b");
    });
    angular.module("c", []).run(() => {
      log.push("c");
    });
    angular.module("d", ["b", "c"]).run(() => {
      log.push("d");
    });
    injector.loadNewModules(["d"]);
    expect(log).toEqual(["initial", "a", "b", "c", "d"]);
  });

  it("loads the required modules of a module", () => {
    const module1 = angular.module("myModule", []);
    const module2 = angular.module("myOtherModule", ["myModule"]);
    module1.constant("aConstant", 42);
    module2.constant("anotherConstant", 43);
    const injector = createInjector(["myOtherModule"]);
    expect(injector.has("aConstant")).toBe(true);
    expect(injector.has("anotherConstant")).toBe(true);
  });

  it("loads the transitively required modules of a module", () => {
    const module1 = angular.module("myModule", []);
    const module2 = angular.module("myOtherModule", ["myModule"]);
    const module3 = angular.module("myThirdModule", ["myOtherModule"]);
    module1.constant("aConstant", 42);
    module2.constant("anotherConstant", 43);
    module3.constant("aThirdConstant", 44);
    const injector = createInjector(["myThirdModule"]);
    expect(injector.has("aConstant")).toBe(true);
    expect(injector.has("anotherConstant")).toBe(true);
    expect(injector.has("aThirdConstant")).toBe(true);
  });

  it("loads each module only once", () => {
    angular.module("myModule", ["myOtherModule"]);
    angular.module("myOtherModule", ["myModule"]);
    let injector = createInjector(["myModule"]);
    expect(Object.keys(injector.modules).length).toEqual(2);
  });

  it("invokes an annotated function with dependency injection", () => {
    const module = angular.module("myModule", []);
    module.constant("a", 1);
    module.constant("b", 2);
    const injector = createInjector(["myModule"]);
    const fn = (one, two) => {
      return one + two;
    };
    fn.$inject = ["a", "b"];
    expect(injector.invoke(fn)).toBe(3);
  });

  it("invokes a class with static property with dependency injection", () => {
    const module = angular.module("myModule", []);
    module.constant("a", 1);
    module.constant("b", 2);
    const injector = createInjector(["myModule"]);
    class Foo {
      static $inject = ["a", "b"];
      constructor(a, b) {
        this.c = a + b;
      }
    }
    expect(injector.invoke(Foo).c).toBe(3);
  });

  it("invokes an annotated class with dependency injection", () => {
    const module = angular.module("myModule", []);
    module.constant("a", 1);
    module.constant("b", 2);
    const injector = createInjector(["myModule"]);
    class Foo {
      constructor(a, b) {
        this.c = a + b;
      }
    }
    Foo.$inject = ["a", "b"];
    expect(injector.invoke(Foo).c).toBe(3);
  });

  it("does not accept non-strings as injection tokens", () => {
    const module = angular.module("myModule", []);
    module.constant("a", 1);
    const injector = createInjector(["myModule"]);
    const fn = function (one, two) {
      return one + two;
    };
    fn.$inject = ["a", 2];
    expect(() => {
      injector.invoke(fn);
    }).toThrow();
  });

  it("invokes a function with the given this context", () => {
    const module = angular.module("myModule", []);
    module.constant("a", 1);
    const injector = createInjector(["myModule"]);
    const obj = {
      two: 2,
      fn: function (one) {
        return one + this.two;
      },
    };
    obj.fn.$inject = ["a"];
    expect(injector.invoke(obj.fn, obj)).toBe(3);
  });

  it("invokes a function with array of injection tokens", () => {
    const module = angular.module("myModule", []);
    module.constant("a", 1);
    const injector = createInjector(["myModule"]);
    const obj = {
      two: 2,
      fn: function (one) {
        return one + this.two;
      },
    };
    expect(injector.invoke(["a", obj.fn], obj)).toBe(3);
  });

  it("overrides dependencies with locals when invoking", () => {
    const module = angular.module("myModule", []);
    module.constant("a", 1);
    module.constant("b", 2);
    const injector = createInjector(["myModule"]);
    const fn = function (one, two) {
      return one + two;
    };
    fn.$inject = ["a", "b"];
    expect(injector.invoke(fn, undefined, { b: 3 })).toBe(4);
  });

  it("should expose the loaded module info on the instance injector", () => {
    angular.module("test1", ["test2"]).info({ version: "1.1" });
    angular.module("test2", []).info({ version: "1.2" });
    const injector = createInjector(["test1"]);

    injector.invoke(function ($injector) {
      expect($injector.modules.test1.info()).toEqual({ version: "1.1" });
      expect($injector.modules.test2.info()).toEqual({ version: "1.2" });
    });
  });

  it("should expose the loaded module info on the provider injector", () => {
    let providerInjector;
    const test1 = angular.module("test1", ["test2"]).info({ version: "1.1" });
    const test2 = angular
      .module("test2", [])
      .info({ version: "1.2" })
      .provider("test", [
        "$injector",
        function ($injector) {
          providerInjector = $injector;
          return { $get() {} };
        },
      ]);
    createInjector(["test1"]);

    expect(providerInjector.modules.test1.info()).toEqual({ version: "1.1" });
    expect(providerInjector.modules.test2.info()).toEqual({ version: "1.2" });
  });
});

describe("annotate", () => {
  let injector;
  beforeEach(() => {
    window.angular = new Angular();
    injector = createInjector([]);
  });

  it("should return $inject", () => {
    function fn() {}
    fn.$inject = ["a"];
    expect(annotate(fn)).toBe(fn.$inject);
    expect(annotate(() => {})).toEqual([]);
    expect(annotate(() => {})).toEqual([]);
    expect(annotate(() => {})).toEqual([]);
    expect(annotate(/* */ () => {})).toEqual([]);
  });

  it("should create $inject", () => {
    const extraParams = () => {};
    // keep the multi-line to make sure we can handle it
    function $f_n0 /*
     */(
      $a, // x, <-- looks like an arg but it is a comment
      b_ /* z, <-- looks like an arg but it is a
                multi-line comment
                function(a, b) {}
                */,
      _c,
      /* {some type} */ d,
    ) {
      extraParams();
    }
    /* eslint-enable */
    expect(annotate($f_n0)).toEqual(["$a", "b_", "_c", "d"]);
    expect($f_n0.$inject).toEqual(["$a", "b_", "_c", "d"]);
  });

  it("should strip leading and trailing underscores from arg name during inference", () => {
    function beforeEachFn(_foo_) {
      /* foo = _foo_ */
    }
    expect(annotate(beforeEachFn)).toEqual(["foo"]);
  });

  it("should not strip service names with a single underscore", () => {
    function beforeEachFn(_) {
      /* _ = _ */
    }
    expect(annotate(beforeEachFn)).toEqual(["_"]);
  });

  it("should handle no arg functions", () => {
    function $f_n0() {}
    expect(annotate($f_n0)).toEqual([]);
    expect($f_n0.$inject).toEqual([]);
  });

  it("should handle no arg functions with spaces in the arguments list", () => {
    function fn() {}
    expect(annotate(fn)).toEqual([]);
    expect(fn.$inject).toEqual([]);
  });

  it("should handle args with both $ and _", () => {
    function $f_n0($a_) {}
    expect(annotate($f_n0)).toEqual(["$a_"]);
    expect($f_n0.$inject).toEqual(["$a_"]);
  });

  it("should handle functions with overridden toString", () => {
    function fn(a) {}
    fn.toString = () => {
      return "fn";
    };
    expect(annotate(fn)).toEqual(["a"]);
    expect(fn.$inject).toEqual(["a"]);
  });

  it("should throw on non function arg", () => {
    expect(() => {
      annotate({});
    }).toThrow();
  });

  describe("es6", () => {
    it("should be possible to annotate shorthand methods", () => {
      expect(annotate(eval("({ fn(x) { return; } })").fn)).toEqual(["x"]);
    });

    it("should create $inject for arrow functions", () => {
      expect(annotate(eval("(a, b) => a"))).toEqual(["a", "b"]);
    });
    it("should create $inject for arrow functions with no parenthesis", () => {
      expect(annotate(eval("a => a"))).toEqual(["a"]);
    });

    it("should take args before first arrow", () => {
      expect(annotate(eval("a => b => b"))).toEqual(["a"]);
    });

    it("should detect ES6 classes regardless of whitespace/comments ($prop)", () =>
      [
        "class Test {}",
        "class Test{}",
        "class //<--ES6 stuff\nTest {}",
        "class//<--ES6 stuff\nTest {}",
        "class {}",
        "class{}",
        "class //<--ES6 stuff\n {}",
        "class//<--ES6 stuff\n {}",
        "class/* Test */{}",
        "class /* Test */ {}",
      ].forEach((classDefinition) => {
        const Clazz = eval(`(${classDefinition})`);
        const instance = injector.invoke(Clazz);

        expect(instance).toEqual(jasmine.any(Clazz));
      }));
  });

  it("returns the $inject annotation of a function when it has one", () => {
    const injector = createInjector([]);
    const fn = () => {};
    fn.$inject = ["a", "b"];
    expect(annotate(fn)).toEqual(["a", "b"]);
  });

  it("returns the array-style annotations of a function", () => {
    const injector = createInjector([]);
    const fn = ["a", "b", () => {}];
    expect(annotate(fn)).toEqual(["a", "b"]);
  });

  it("returns the array-style annotations of a function", () => {
    const injector = createInjector([]);
    const fn = ["a", "b", () => {}];
    expect(annotate(fn)).toEqual(["a", "b"]);
  });

  it("returns annotations parsed from function args when not annotated", () => {
    const injector = createInjector([]);
    const fn = function (a, b) {};
    expect(annotate(fn)).toEqual(["a", "b"]);
  });

  it("returns annotations parsed from arrow args when not annotated", () => {
    const injector = createInjector([]);
    const fn = (a, b) => {};
    expect(annotate(fn)).toEqual(["a", "b"]);
  });

  it("strips comments from argument lists when parsing", () => {
    const injector = createInjector([]);
    const fn = function (a, /*b,*/ c) {};
    expect(annotate(fn)).toEqual(["a", "c"]);
  });

  it("strips several comments from argument lists when parsing", () => {
    const injector = createInjector([]);
    const fn = function (a, /*b,*/ c /*, d*/) {};
    expect(annotate(fn)).toEqual(["a", "c"]);
  });

  it("strips // comments from argument lists when parsing", () => {
    const injector = createInjector([]);
    const fn = function (
      a, //b,
      c,
    ) {};
    expect(annotate(fn)).toEqual(["a", "c"]);
  });

  it("strips surrounding underscores from argument names when parsing", () => {
    const injector = createInjector([]);
    const fn = function (a, _b_, c_, _d, an_argument) {};
    expect(annotate(fn)).toEqual(["a", "b", "c_", "_d", "an_argument"]);
  });

  it("throws when using a non-annotated fn in strict mode", () => {
    const injector = createInjector([], true);
    const fn = function (a, b, c) {};

    expect(() => {
      injector.annotate(fn, true);
    }).toThrow();
  });

  it("invokes an array-annotated function with dependency injection", () => {
    const module = angular.module("myModule", []);
    module.constant("a", 1);
    module.constant("b", 2);
    const injector = createInjector(["myModule"]);
    const fn = [
      "a",
      "b",
      function (one, two) {
        return one + two;
      },
    ];
    expect(injector.invoke(fn)).toBe(3);
  });

  it("invokes a non-annotated function with dependency injection", () => {
    const module = angular.module("myModule", []);
    module.constant("a", 1);
    module.constant("b", 2);
    const injector = createInjector(["myModule"]);
    const fn = function (a, b) {
      return a + b;
    };
    expect(injector.invoke(fn)).toBe(3);
  });

  it("instantiates an annotated constructor function", () => {
    const module = angular.module("myModule", []);
    module.constant("a", 1);
    module.constant("b", 2);
    const injector = createInjector(["myModule"]);
    function Type(one, two) {
      this.result = one + two;
    }
    Type.$inject = ["a", "b"];
    const instance = injector.instantiate(Type);
    expect(instance.result).toBe(3);
  });

  it("instantiates an array-annotated constructor function", () => {
    const module = angular.module("myModule", []);
    module.constant("a", 1);
    module.constant("b", 2);
    const injector = createInjector(["myModule"]);
    function Type(one, two) {
      this.result = one + two;
    }
    const instance = injector.instantiate(["a", "b", Type]);
    expect(instance.result).toBe(3);
  });

  it("instantiates a non-annotated constructor function", () => {
    const module = angular.module("myModule", []);
    module.constant("a", 1);
    module.constant("b", 2);
    const injector = createInjector(["myModule"]);
    function Type(a, b) {
      this.result = a + b;
    }
    const instance = injector.instantiate(Type);
    expect(instance.result).toBe(3);
  });

  it("uses the prototype of the constructor when instantiating", () => {
    function BaseType() {}
    BaseType.prototype.getValue = () => 42;
    function Type() {
      this.v = this.getValue();
    }
    Type.prototype = BaseType.prototype;
    const module = angular.module("myModule", []);
    const injector = createInjector(["myModule"]);
    const instance = injector.instantiate(Type);
    expect(instance.v).toBe(42);
  });

  it("supports locals when instantiating", () => {
    const module = angular.module("myModule", []);
    module.constant("a", 1);
    module.constant("b", 2);
    const injector = createInjector(["myModule"]);
    function Type(a, b) {
      this.result = a + b;
    }
    const instance = injector.instantiate(Type, { b: 3 });
    expect(instance.result).toBe(4);
  });

  it("supports es6", () => {
    const module = angular.module("myModule", []);
    module.constant("a", 1);
    module.constant("b", 2);
    const injector = createInjector(["myModule"]);
    class Type {
      constructor(a, b) {
        this.result = a + b;
      }
    }
    const instance = injector.instantiate(Type, { b: 3 });
    expect(instance.result).toBe(4);
  });
});

describe("provider", () => {
  beforeEach(() => (window.angular = new Angular()));

  it("allows registering a provider and uses its $get", () => {
    const module = angular.module("myModule", []);
    module.provider("a", {
      $get: () => {
        return 42;
      },
    });
    const injector = createInjector(["myModule"]);
    expect(injector.has("a")).toBe(true);
    expect(injector.get("a")).toBe(42);
  });

  it("injects the $get method of a provider", () => {
    const module = angular.module("myModule", []);
    module.constant("a", 1);
    module.provider("b", {
      $get: function (a) {
        return a + 2;
      },
    });
    const injector = createInjector(["myModule"]);
    expect(injector.get("b")).toBe(3);
  });

  it("injects the $get method of a provider lazily", () => {
    const module = angular.module("myModule", []);
    module.provider("b", {
      $get: (a) => {
        return a + 2;
      },
    });
    module.provider("a", { $get: () => 1 });
    const injector = createInjector(["myModule"]);
    expect(injector.get("b")).toBe(3);
  });

  it("instantiates a dependency only once", () => {
    const module = angular.module("myModule", []);
    module.provider(
      "a",
      class {
        $get() {
          return {};
        }
      },
    );
    const injector = createInjector(["myModule"]);
    expect(injector.get("a")).toBe(injector.get("a"));
  });

  it("should resolve dependency graph and instantiate all services just once", () => {
    const log = [];

    //          s1
    //        /  | \
    //       /  s2  \
    //      /  / | \ \
    //     /s3 < s4 > s5
    //    //
    //   s6
    angular
      .module("myModule", [])
      .provider("s1", {
        $get: (s6, s5) => {
          log.push("s1");
          return {};
        },
      })
      .provider("s2", {
        $get: (s3, s4, s5) => {
          log.push("s2");
          return {};
        },
      })

      .provider("s3", {
        $get: (s6) => {
          log.push("s3");
          return {};
        },
      })
      .provider("s4", {
        $get: (s3, s5) => {
          log.push("s4");
          return {};
        },
      })
      .provider("s5", {
        $get: () => {
          log.push("s5");
          return {};
        },
      })
      .provider("s6", {
        $get: () => {
          log.push("s6");
          return {};
        },
      });

    const injector = createInjector(["myModule"]);
    injector.get("s1");
    injector.get("s2");
    injector.get("s3");
    injector.get("s4");
    injector.get("s5");
    injector.get("s6");
    injector.get("s6");

    expect(log.length).toEqual(6);
  });

  it("should return same instance from calling provider", () => {
    const module = angular.module("myModule", []);
    let instance = "initial";
    const original = instance;
    module.provider("instance", {
      $get: () => {
        return instance;
      },
    });
    const injector = createInjector(["myModule"]);
    expect(injector.get("instance")).toEqual(instance);
    instance = "deleted";
    expect(injector.get("instance")).toEqual(original);
  });

  it("notifies the user about a circular dependency", () => {
    const module = angular.module("myModule", []);
    module.provider("a", { $get: function (b) {} });
    module.provider("b", { $get: function (c) {} });
    module.provider("c", { $get: function (a) {} });
    const injector = createInjector(["myModule"]);
    expect(() => {
      injector.get("a");
    }).toThrowError(/Circular dependency found/);
  });

  it("cleans up the circular marker when instantiation fails", () => {
    const module = angular.module("myModule", []);
    module.provider("a", {
      $get: () => {
        throw "Failing instantiation!";
      },
    });
    const injector = createInjector(["myModule"]);
    expect(() => {
      injector.get("a");
    }).toThrow("Failing instantiation!");
    expect(() => {
      injector.get("a");
    }).toThrow("Failing instantiation!");
  });

  it("notifies the user about a circular dependency", () => {
    const module = angular.module("myModule", []);
    module.provider("a", { $get: function (b) {} });
    module.provider("b", { $get: function (c) {} });
    module.provider("c", { $get: function (a) {} });
    const injector = createInjector(["myModule"]);
    expect(() => {
      injector.get("a");
    }).toThrowError(/Circular dependency found: a <- c <- b <- a/);
  });

  it("instantiates a provider if given as a constructor function", () => {
    const module = angular.module("myModule", []);
    module.provider("a", function AProvider() {
      this.$get = () => {
        return 42;
      };
    });
    const injector = createInjector(["myModule"]);
    expect(injector.get("a")).toBe(42);
  });

  it("injects the given provider constructor function", () => {
    const module = angular.module("myModule", []);
    module.constant("b", 2);
    module.provider("a", function AProvider(b) {
      this.$get = () => {
        return 1 + b;
      };
    });
    const injector = createInjector(["myModule"]);
    expect(injector.get("a")).toBe(3);
  });

  it("injects another provider to a provider constructor function", () => {
    const module = angular.module("myModule", []);
    module.provider("a", function AProvider() {
      let value = 1;
      this.setValue = function (v) {
        value = v;
      };
      this.$get = () => {
        return value;
      };
    });
    module.provider("b", function BProvider(aProvider) {
      aProvider.setValue(2);
      this.$get = () => {};
    });
    const injector = createInjector(["myModule"]);
    expect(injector.get("a")).toBe(2);
  });

  it("does not inject an instance to a provider constructor function", () => {
    const module = angular.module("myModule", []);
    module.provider("a", function AProvider() {
      this.$get = () => {
        return 1;
      };
    });
    module.provider("b", function BProvider(a) {
      this.$get = () => {
        return a;
      };
    });
    expect(() => {
      createInjector(["myModule"]);
    }).toThrow();
  });

  it("does not inject a provider to a $get function", () => {
    const module = angular.module("myModule", []);
    module.provider("a", function AProvider() {
      this.$get = () => {
        return 1;
      };
    });
    module.provider("b", function BProvider() {
      this.$get = function (aProvider) {
        return aProvider.$get();
      };
    });
    const injector = createInjector(["myModule"]);
    expect(() => {
      injector.get("b");
    }).toThrow();
  });

  it("does not inject a provider to invoke", () => {
    const module = angular.module("myModule", []);
    module.provider("a", function AProvider() {
      this.$get = () => {
        return 1;
      };
    });
    const injector = createInjector(["myModule"]);
    expect(() => {
      injector.invoke(function (aProvider) {});
    }).toThrow();
  });

  it("does not give access to providers through get", () => {
    const module = angular.module("myModule", []);
    module.provider("a", function AProvider() {
      this.$get = () => {
        return 1;
      };
    });
    const injector = createInjector(["myModule"]);
    expect(() => {
      injector.get("aProvider");
    }).toThrow();
  });

  it("registers constants first to make them available to providers", () => {
    const module = angular.module("myModule", []);
    module.provider("a", function AProvider(b) {
      this.$get = () => {
        return b;
      };
    });
    module.constant("b", 42);
    const injector = createInjector(["myModule"]);
    expect(injector.get("a")).toBe(42);
  });

  it("allows injecting the provider injector to provider", () => {
    const module = angular.module("myModule", []);
    module.provider("a", function AProvider() {
      this.value = 42;
      this.$get = () => {
        return this.value;
      };
    });
    module.provider("b", function BProvider($injector) {
      const aProvider = $injector.get("aProvider");
      this.$get = () => {
        return aProvider.value;
      };
    });
    const injector = createInjector(["myModule"]);
    expect(injector.get("b")).toBe(42);
  });
});

describe("$provide", () => {
  beforeEach(() => (window.angular = new Angular()));

  it("should inject providers", () => {
    const module = angular.module("myModule", []);
    module.provider("a", function () {
      this.$get = function () {
        return "Father";
      };
    });

    module.provider("b", function (aProvider) {
      this.$get = function () {
        return `${aProvider.$get()} child`;
      };
    });
    const injector = createInjector(["myModule"]);
    expect(injector.get("b")).toEqual("Father child");
  });

  it("allows injecting the $provide service to providers", () => {
    const module = angular.module("myModule", []);
    module.provider("a", function AProvider($provide) {
      $provide.constant("b", 2);
      this.$get = function (b) {
        return 1 + b;
      };
    });
    const injector = createInjector(["myModule"]);
    expect(injector.get("a")).toBe(3);
  });

  it("does not allow injecting the $provide service to $get", () => {
    const module = angular.module("myModule", []);
    module.provider("a", function AProvider() {
      this.$get = function ($provide) {};
    });
    const injector = createInjector(["myModule"]);
    expect(() => {
      injector.get("a");
    }).toThrow();
  });
});

describe("config/run", () => {
  beforeEach(() => (window.angular = new Angular()));

  it("runs config blocks when the injector is created", () => {
    const module = angular.module("myModule", []);
    let hasRun = false;
    module.config(() => {
      hasRun = true;
    });
    createInjector(["myModule"]);
    expect(hasRun).toBe(true);
  });

  it("injects config blocks with provider injector", () => {
    const module = angular.module("myModule", []);
    module.config(function ($provide) {
      $provide.constant("a", 42);
    });
    const injector = createInjector(["myModule"]);
    expect(injector.get("a")).toBe(42);
  });

  it("allows registering config blocks before providers", () => {
    const module = angular.module("myModule", []);
    module.config(function (aProvider) {});
    module.provider("a", function () {
      this.$get = () => 42;
    });
    const injector = createInjector(["myModule"]);
    expect(injector.get("a")).toBe(42);
  });

  it("runs a config block added during module registration", () => {
    angular.module("myModule", [], function ($provide) {
      $provide.constant("a", 42);
    });
    const injector = createInjector(["myModule"]);
    expect(injector.get("a")).toBe(42);
  });

  it("runs run blocks when the injector is created", () => {
    const module = angular.module("myModule", []);
    let hasRun = false;
    module.run(() => {
      hasRun = true;
    });
    createInjector(["myModule"]);
    expect(hasRun).toBe(true);
  });

  it("injects run blocks with the instance injector", () => {
    const module = angular.module("myModule", []);
    module.provider("a", { $get: () => 42 });
    let gotA;
    module.run(function (a) {
      gotA = a;
    });
    createInjector(["myModule"]);
    expect(gotA).toBe(42);
  });

  it("configures all modules before running any run blocks", () => {
    const module1 = angular.module("myModule", []);
    module1.provider("a", { $get: () => 1 });
    let result;
    module1.run((a, b) => {
      result = a + b;
    });
    const module2 = angular.module("myOtherModule", []);
    module2.provider("b", { $get: () => 2 });
    createInjector(["myModule", "myOtherModule"]);
    expect(result).toBe(3);
  });
});

describe("function modules", () => {
  beforeEach(() => (window.angular = new Angular()));

  it("runs a function module dependency as a config block", () => {
    const functionModule = ($provide) => {
      $provide.constant("a", 42);
    };
    angular.module("myModule", [functionModule]);
    const injector = createInjector(["myModule"]);
    expect(injector.get("a")).toBe(42);
  });

  it("runs a function module with array injection as a config block", () => {
    const functionModule = [
      "$provide",
      function ($provide) {
        $provide.constant("a", 42);
      },
    ];
    angular.module("myModule", [functionModule]);
    const injector = createInjector(["myModule"]);
    expect(injector.get("a")).toBe(42);
  });

  it("supports returning a run block from a function module", () => {
    let result;
    const functionModule = function ($provide) {
      $provide.constant("a", 42);
      return function (a) {
        result = a;
      };
    };
    angular.module("myModule", [functionModule]);
    createInjector(["myModule"]);
    expect(result).toBe(42);
  });

  it("only loads function modules once", () => {
    let loadedTimes = 0;
    const functionModule = () => {
      loadedTimes++;
    };
    angular.module("myModule", [functionModule, functionModule]);
    createInjector(["myModule"]);
    expect(loadedTimes).toBe(1);
  });
});

describe("factories", () => {
  beforeEach(() => (window.angular = new Angular()));

  it("allows registering a factory", function () {
    const module = angular.module("myModule", []);
    module.factory("a", function () {
      return 42;
    });
    const injector = createInjector(["myModule"]);
    expect(injector.get("a")).toBe(42);
  });

  it("injects a factory function with instances", function () {
    const module = angular.module("myModule", []);
    module.factory("a", function () {
      return 1;
    });
    module.factory("b", function (a) {
      return a + 2;
    });
    const injector = createInjector(["myModule"]);
    expect(injector.get("b")).toBe(3);
  });

  it("only calls a factory function once", function () {
    const module = angular.module("myModule", []);
    module.factory("a", function () {
      return {};
    });
    const injector = createInjector(["myModule"]);
    expect(injector.get("a")).toBe(injector.get("a"));
  });

  it("forces a factory to return a value", function () {
    const module = angular.module("myModule", []);
    module.factory("a", function () {});
    module.factory("b", function () {
      return null;
    });
    const injector = createInjector(["myModule"]);
    expect(function () {
      injector.get("a");
    }).toThrow();
    expect(injector.get("b")).toBeNull();
  });

  it("should be able to register a service from a new module", () => {
    const injector = createInjector([]);
    angular.module("a", []).factory("aService", () => ({
      sayHello() {
        return "Hello";
      },
    }));
    injector.loadNewModules(["a"]);
    injector.invoke((aService) => {
      expect(aService.sayHello()).toEqual("Hello");
    });
  });
});

describe("values", () => {
  beforeEach(() => (window.angular = new Angular()));

  it("allows registering a value", function () {
    const module = angular.module("myModule", []);
    module.value("a", 42);
    const injector = createInjector(["myModule"]);
    expect(injector.get("a")).toBe(42);
  });

  it("does not make values available to config blocks", function () {
    const module = angular.module("myModule", []);
    module.value("a", 42);
    module.config(function (a) {});
    expect(function () {
      createInjector(["myModule"]);
    }).toThrow();
  });

  it("allows an undefined value", function () {
    const module = angular.module("myModule", []);
    module.value("a", undefined);
    const injector = createInjector(["myModule"]);
    expect(injector.get("a")).toBeUndefined();
  });
});

describe("services", () => {
  beforeEach(() => (window.angular = new Angular()));

  it("allows registering a service", function () {
    const module = angular.module("myModule", []);
    module.service("aService", function MyService() {
      this.getValue = function () {
        return 42;
      };
    });
    const injector = createInjector(["myModule"]);
    expect(injector.get("aService").getValue()).toBe(42);
  });

  it("injects service constructors with instances", function () {
    const module = angular.module("myModule", []);
    module.value("theValue", 42);
    module.service("aService", function MyService(theValue) {
      this.getValue = function () {
        return theValue;
      };
    });
    const injector = createInjector(["myModule"]);
    expect(injector.get("aService").getValue()).toBe(42);
  });

  it("injects service ES6 constructors with instances", function () {
    const module = angular.module("myModule", []);
    module.value("theValue", 42);
    module.service(
      "aService",
      class MyService {
        constructor(theValue) {
          this.theValue = theValue;
        }
        getValue() {
          return this.theValue;
        }
      },
    );
    const injector = createInjector(["myModule"]);
    expect(injector.get("aService").getValue()).toBe(42);
  });

  it("only instantiates services once", function () {
    const module = angular.module("myModule", []);
    module.service("aService", function MyService() {});
    const injector = createInjector(["myModule"]);
    expect(injector.get("aService")).toBe(injector.get("aService"));
  });
});

describe("decorators", () => {
  beforeEach(() => (window.angular = new Angular()));

  it("allows changing an instance using a decorator", function () {
    const module = angular.module("myModule", []);
    module.factory("aValue", function () {
      return { aKey: 42 };
    });
    module.decorator("aValue", function ($delegate) {
      $delegate.decoratedKey = 43;
      return $delegate;
    });
    const injector = createInjector(["myModule"]);

    expect(injector.get("aValue").aKey).toBe(42);
    expect(injector.get("aValue").decoratedKey).toBe(43);
  });

  it("allows multiple decorators per service", function () {
    const module = angular.module("myModule", []);
    module.factory("aValue", function () {
      return {};
    });
    module.decorator("aValue", function ($delegate) {
      $delegate.decoratedKey = 42;
      return $delegate;
    });
    module.decorator("aValue", function ($delegate) {
      $delegate.otherDecoratedKey = 43;
      return $delegate;
    });
    const injector = createInjector(["myModule"]);
    expect(injector.get("aValue").decoratedKey).toBe(42);
    expect(injector.get("aValue").otherDecoratedKey).toBe(43);
  });

  it("uses dependency injection with decorators", function () {
    const module = angular.module("myModule", []);
    module.factory("aValue", function () {
      return {};
    });
    module.constant("a", 42);
    module.decorator("aValue", function (a, $delegate) {
      $delegate.decoratedKey = a;
      return $delegate;
    });
    const injector = createInjector(["myModule"]);
    expect(injector.get("aValue").decoratedKey).toBe(42);
  });
});

describe("controllers", () => {
  beforeEach(() => (window.angular = new Angular()));

  it("should provide the caller name for controllers", () => {
    window.angular
      .module("myModule", [])
      .controller("myCtrl", (idontexist) => {});
    expect(() => {
      createInjector(["myModule"]).get("$controller");
    }).toThrowError(/Unknown provider/);
  });

  it("should be able to register a controller from a new module", () => {
    const injector = createInjector(["ng"]);
    window.angular
      .module("a", [])
      .controller("aController", function Controller($scope) {
        $scope.test = "b";
      });
    injector.loadNewModules(["a"]);
    injector.invoke(($controller) => {
      const scope = {};
      $controller("aController", { $scope: scope });
      expect(scope.test).toEqual("b");
    });
  });
});

describe("filters", () => {
  beforeEach(() => (window.angular = new Angular()));

  it("should be able to register a filter from a new module", () => {
    const injector = createInjector(["ng"]);
    window.angular.module("a", []).filter(
      "aFilter",
      () =>
        function (input) {
          return `${input} filtered`;
        },
    );
    injector.loadNewModules(["a"]);
    injector.invoke((aFilterFilter) => {
      expect(aFilterFilter("test")).toEqual("test filtered");
    });
  });
});

describe("directive", () => {
  beforeEach(() => {
    window.angular = new Angular();
  });

  it("should be able to register a directive from a new module", () => {
    const injector = createInjector(["ng"]);
    window.angular
      .module("a", [])
      .directive("aDirective", () => ({ template: "test directive" }));
    injector.loadNewModules(["a"]);
    injector.invoke(($compile, $rootScope) => {
      const elem = $compile("<div a-directive></div>")($rootScope); // compile and link
      ;
      expect(elem.text()).toEqual("test directive");
      elem.remove();
    });
  });

  it("should be able to register a directive from a new module", () => {
    const injector = createInjector(["ng"]);
    window.angular
      .module("a", [])
      .directive("aDirective", () => ({ template: "test directive" }));
    injector.loadNewModules(["a"]);
    injector.invoke(($compile, $rootScope) => {
      const elem = $compile("<div a-directive></div>")($rootScope); // compile and link
      ;
      expect(elem.text()).toEqual("test directive");
      elem.remove();
    });
  });
});

it("should define module", () => {
  let log = "";
  createInjector([
    function ($provide) {
      $provide.value("value", "value;");
      $provide.factory("fn", valueFn("function;"));
      $provide.provider("service", function Provider() {
        this.$get = valueFn("service;");
      });
    },
    function (valueProvider, fnProvider, serviceProvider) {
      log += valueProvider.$get() + fnProvider.$get() + serviceProvider.$get();
    },
  ]).invoke((value, fn, service) => {
    log += `->${value}${fn}${service}`;
  });
  expect(log).toEqual("value;function;service;->value;function;service;");
});

describe("module", () => {
  beforeEach(() => {
    window.angular = new Angular();
  });

  it("should provide $injector even when no module is requested", () => {
    let $provide;
    const $injector = createInjector([
      extend(
        (p) => {
          $provide = p;
        },
        { $inject: ["$provide"] },
      ),
    ]);
    expect($injector.get("$injector")).toBe($injector);
  });

  it("should load multiple function modules and infer inject them", () => {
    let a = "junk";
    const $injector = createInjector([
      () => {
        a = "A"; // reset to prove we ran
      },
      function ($provide) {
        $provide.value("a", a);
      },
      extend(
        (p, serviceA) => {
          p.value("b", `${serviceA.$get()}B`);
        },
        { $inject: ["$provide", "aProvider"] },
      ),
      [
        "$provide",
        "bProvider",
        function (p, serviceB) {
          p.value("c", `${serviceB.$get()}C`);
        },
      ],
    ]);
    expect($injector.get("a")).toEqual("A");
    expect($injector.get("b")).toEqual("AB");
    expect($injector.get("c")).toEqual("ABC");
  });

  it("should run symbolic modules", () => {
    angular.module("myModule", []).value("a", "abc");
    const $injector = createInjector(["myModule"]);
    expect($injector.get("a")).toEqual("abc");
  });

  it("should error on invalid module name", () => {
    expect(() => {
      createInjector(["IDontExist"], true);
    }).toThrowError(/nomod/);
  });

  it("should load dependant modules only once", () => {
    let log = "";
    angular.module("a", [], () => {
      log += "a";
    });
    angular.module("b", ["a"], () => {
      log += "b";
    });
    angular.module("c", ["a", "b"], () => {
      log += "c";
    });
    createInjector(["c", "c"]);
    expect(log).toEqual("abc");
  });

  it("should load different instances of dependent functions", () => {
    function generateValueModule(name, value) {
      return function ($provide) {
        $provide.value(name, value);
      };
    }
    const injector = createInjector([
      generateValueModule("name1", "value1"),
      generateValueModule("name2", "value2"),
    ]);
    expect(injector.get("name2")).toBe("value2");
  });

  it("should load same instance of dependent function only once", () => {
    let count = 0;
    function valueModule($provide) {
      count++;
      $provide.value("name", "value");
    }

    const injector = createInjector([valueModule, valueModule]);
    expect(injector.get("name")).toBe("value");
    expect(count).toBe(1);
  });

  it("should execute runBlocks after injector creation", () => {
    let log = "";
    angular
      .module("a", [], () => {
        log += "a";
      })
      .run(() => {
        log += "A";
      });
    angular
      .module("b", ["a"], () => {
        log += "b";
      })
      .run(() => {
        log += "B";
      });
    createInjector([
      "b",
      valueFn(() => {
        log += "C";
      }),
      [
        valueFn(() => {
          log += "D";
        }),
      ],
    ]);
    expect(log).toEqual("abABCD");
  });

  it("should execute own config blocks after all own providers are invoked", () => {
    let log = "";
    angular
      .module("a", ["b"])
      .config(($aProvider) => {
        log += "aConfig;";
      })
      .provider("$a", function Provider$a() {
        log += "$aProvider;";
        this.$get = () => {};
      });
    angular
      .module("b", [])
      .config(($bProvider) => {
        log += "bConfig;";
      })
      .provider("$b", function Provider$b() {
        log += "$bProvider;";
        this.$get = () => {};
      });

    createInjector(["a"]);
    expect(log).toBe("$bProvider;bConfig;$aProvider;aConfig;");
  });
});

describe("$provide", () => {
  it('should throw an exception if we try to register a service called "hasOwnProperty"', () => {
    createInjector([
      function ($provide) {
        expect(() => {
          $provide.provider("hasOwnProperty", () => {});
        }).toThrowError(/badname/);
      },
    ]);
  });

  it('should throw an exception if we try to register a constant called "hasOwnProperty"', () => {
    createInjector([
      function ($provide) {
        expect(() => {
          $provide.constant("hasOwnProperty", {});
        }).toThrowError(/badname/);
      },
    ]);
  });
});

describe("constant", () => {
  it("should create configuration injectable constants", () => {
    const log = [];
    createInjector([
      function ($provide) {
        $provide.constant("abc", 123);
        $provide.constant({ a: "A", b: "B" });
        return function (a) {
          log.push(a);
        };
      },
      function (abc) {
        log.push(abc);
        return function (b) {
          log.push(b);
        };
      },
    ]).get("abc");
    expect(log).toEqual([123, "A", "B"]);
  });
});

describe("value", () => {
  it("should configure $provide values", () => {
    expect(
      createInjector([
        function ($provide) {
          $provide.value("value", "abc");
        },
      ]).get("value"),
    ).toEqual("abc");
  });

  it("should configure a set of values", () => {
    expect(
      createInjector([
        function ($provide) {
          $provide.value({ value: Array });
        },
      ]).get("value"),
    ).toEqual(Array);
  });
});

describe("factory", () => {
  it("should configure $provide factory function", () => {
    expect(
      createInjector([
        function ($provide) {
          $provide.factory("value", valueFn("abc"));
        },
      ]).get("value"),
    ).toEqual("abc");
  });

  it("should configure a set of factories", () => {
    expect(
      createInjector([
        function ($provide) {
          $provide.factory({ value: Array });
        },
      ]).get("value"),
    ).toEqual([]);
  });
});

describe("service", () => {
  it("should register a class", () => {
    function Type(value) {
      this.value = value;
    }

    const instance = createInjector([
      function ($provide) {
        $provide.value("value", 123);
        $provide.service("foo", Type);
      },
    ]).get("foo");

    expect(instance instanceof Type).toBe(true);
    expect(instance.value).toBe(123);
  });

  it("should register a set of classes", () => {
    const Type = function () {};

    const injector = createInjector([
      function ($provide) {
        $provide.service({
          foo: Type,
          bar: Type,
        });
      },
    ]);

    expect(injector.get("foo") instanceof Type).toBe(true);
    expect(injector.get("bar") instanceof Type).toBe(true);
  });
});

describe("provider", () => {
  it("should configure $provide provider object", () => {
    expect(
      createInjector([
        function ($provide) {
          $provide.provider("value", {
            $get: valueFn("abc"),
          });
        },
      ]).get("value"),
    ).toEqual("abc");
  });

  it("should configure $provide provider type", () => {
    function Type() {}
    Type.prototype.$get = function () {
      expect(this instanceof Type).toBe(true);
      return "abc";
    };
    expect(
      createInjector([
        function ($provide) {
          $provide.provider("value", Type);
        },
      ]).get("value"),
    ).toEqual("abc");
  });

  it("should configure $provide using an array", () => {
    function Type(PREFIX) {
      this.prefix = PREFIX;
    }
    Type.prototype.$get = function () {
      return `${this.prefix}def`;
    };
    expect(
      createInjector([
        function ($provide) {
          $provide.constant("PREFIX", "abc");
          $provide.provider("value", ["PREFIX", Type]);
        },
      ]).get("value"),
    ).toEqual("abcdef");
  });

  it("should configure a set of providers", () => {
    expect(
      createInjector([
        function ($provide) {
          $provide.provider({ value: valueFn({ $get: Array }) });
        },
      ]).get("value"),
    ).toEqual([]);
  });
});

describe("decorator", () => {
  let log;
  let injector;

  beforeEach(() => {
    log = [];
    window.angular = new Angular();
  });

  it("should be called with the original instance", () => {
    injector = createInjector([
      function ($provide) {
        $provide.value("myService", (val) => {
          log.push(`myService:${val}`);
          return "origReturn";
        });

        $provide.decorator(
          "myService",
          ($delegate) =>
            function (val) {
              log.push(`myDecoratedService:${val}`);
              const origVal = $delegate("decInput");
              return `dec+${origVal}`;
            },
        );
      },
    ]);

    const out = injector.get("myService")("input");
    log.push(out);
    expect(log.join("; ")).toBe(
      "myDecoratedService:input; myService:decInput; dec+origReturn",
    );
  });

  it("should allow multiple decorators to be applied to a service", () => {
    injector = createInjector([
      function ($provide) {
        $provide.value("myService", (val) => {
          log.push(`myService:${val}`);
          return "origReturn";
        });

        $provide.decorator(
          "myService",
          ($delegate) =>
            function (val) {
              log.push(`myDecoratedService1:${val}`);
              const origVal = $delegate("decInput1");
              return `dec1+${origVal}`;
            },
        );

        $provide.decorator(
          "myService",
          ($delegate) =>
            function (val) {
              log.push(`myDecoratedService2:${val}`);
              const origVal = $delegate("decInput2");
              return `dec2+${origVal}`;
            },
        );
      },
    ]);

    const out = injector.get("myService")("input");
    log.push(out);
    expect(log).toEqual([
      "myDecoratedService2:input",
      "myDecoratedService1:decInput2",
      "myService:decInput1",
      "dec2+dec1+origReturn",
    ]);
  });

  it("should decorate services with dependencies", () => {
    injector = createInjector([
      function ($provide) {
        $provide.value("dep1", "dependency1");

        $provide.factory("myService", [
          "dep1",
          function (dep1) {
            return function (val) {
              log.push(`myService:${val},${dep1}`);
              return "origReturn";
            };
          },
        ]);

        $provide.decorator(
          "myService",
          ($delegate) =>
            function (val) {
              log.push(`myDecoratedService:${val}`);
              const origVal = $delegate("decInput");
              return `dec+${origVal}`;
            },
        );
      },
    ]);

    const out = injector.get("myService")("input");
    log.push(out);
    expect(log.join("; ")).toBe(
      "myDecoratedService:input; myService:decInput,dependency1; dec+origReturn",
    );
  });

  it("should allow for decorators to be injectable", () => {
    injector = createInjector([
      function ($provide) {
        $provide.value("dep1", "dependency1");

        $provide.factory(
          "myService",
          () =>
            function (val) {
              log.push(`myService:${val}`);
              return "origReturn";
            },
        );

        $provide.decorator(
          "myService",
          ($delegate, dep1) =>
            function (val) {
              log.push(`myDecoratedService:${val},${dep1}`);
              const origVal = $delegate("decInput");
              return `dec+${origVal}`;
            },
        );
      },
    ]);

    const out = injector.get("myService")("input");
    log.push(out);
    expect(log.join("; ")).toBe(
      "myDecoratedService:input,dependency1; myService:decInput; dec+origReturn",
    );
  });

  it("should allow for decorators to $injector", function () {
    injector = createInjector([
      "ng",
      function ($provide) {
        $provide.decorator("$injector", function ($delegate) {
          // Don't forget the prototype
          return extend(Object.create($delegate), $delegate, {
            get: function (val) {
              if (val === "key") {
                return "value";
              }
              return $delegate.get(val);
            },
          });
        });
      },
    ]);
    expect(injector.get("key")).toBe("value");
    expect(injector.get("$http")).not.toBeUndefined();
  });
});

describe("error handling", () => {
  it("should handle wrong argument type", () => {
    expect(() => {
      createInjector([{}], true);
    }).toThrowError(
      /Failed to instantiate module \{\} due to:\n.*\[ng:areq] Argument 'module' is not a function, got Object/,
    );
  });

  it("should handle exceptions", () => {
    expect(function () {
      createInjector(
        [
          function () {
            throw new Error("MyError");
          },
        ],
        true,
      );
    }).toThrowError(/Failed to instantiate module/);
  });

  it("should decorate the missing service error with module name", () => {
    angular.module("TestModule", [], (xyzzy) => {});
    expect(() => {
      createInjector(["TestModule"]);
    }).toThrowError(
      /Failed to instantiate module TestModule due to:\n.*\[\$injector:unpr] Unknown provider: xyzzy/,
    );
  });

  it("should decorate the missing service error with module function", () => {
    function myModule(xyzzy) {}
    expect(() => {
      createInjector([myModule]);
    }).toThrowError(
      /Failed to instantiate module function myModule\(xyzzy\) due to:\n.*\[\$injector:unpr] Unknown provider: xyzzy/,
    );
  });

  it("should decorate the missing service error with module array function", () => {
    function myModule(xyzzy) {}
    expect(() => {
      createInjector([["xyzzy", myModule]]);
    }).toThrowError(
      /Failed to instantiate module function myModule\(xyzzy\) due to:\n.*\[\$injector:unpr] Unknown provider: xyzzy/,
    );
  });

  it("should throw error when trying to inject oneself", () => {
    expect(() => {
      createInjector([
        function ($provide) {
          $provide.factory("service", (service) => {});
          return function (service) {};
        },
      ]);
    }).toThrowError(/Circular dependency found: service <- service/);
  });

  it("should throw error when trying to inject circular dependency", () => {
    expect(() => {
      createInjector([
        function ($provide) {
          $provide.factory("a", (b) => {});
          $provide.factory("b", (a) => {});
          return function (a) {};
        },
      ]);
    }).toThrowError(/Circular dependency found: a <- b <- a/);
  });
});

describe("retrieval", () => {
  const instance = { name: "angular" };
  function Instance() {
    this.name = "loader";
  }

  function createInjectorWithValue(instanceName, instance) {
    return createInjector([
      [
        "$provide",
        function (provide) {
          provide.value(instanceName, instance);
        },
      ],
    ]);
  }
  function createInjectorWithFactory(serviceName, serviceDef) {
    return createInjector([
      [
        "$provide",
        function (provide) {
          provide.factory(serviceName, serviceDef);
        },
      ],
    ]);
  }

  it("should retrieve by name", () => {
    const $injector = createInjectorWithValue("instance", instance);
    const retrievedInstance = $injector.get("instance");
    expect(retrievedInstance).toBe(instance);
  });

  it("should cache instance", () => {
    const $injector = createInjectorWithFactory(
      "instance",
      () => new Instance(),
    );
    const instance = $injector.get("instance");
    expect($injector.get("instance")).toBe(instance);
    expect($injector.get("instance")).toBe(instance);
  });

  it("should call functions and infer arguments", () => {
    const $injector = createInjectorWithValue("instance", instance);
    expect($injector.invoke((instance) => instance)).toBe(instance);
  });
});

describe("method invoking", () => {
  let $injector;

  beforeEach(() => {
    $injector = createInjector([
      function ($provide) {
        $provide.value("book", "moby");
        $provide.value("author", "melville");
      },
    ]);
  });

  it("should invoke method", () => {
    expect($injector.invoke((book, author) => `${author}:${book}`)).toEqual(
      "melville:moby",
    );
    expect(
      $injector.invoke(function (book, author) {
        expect(this).toEqual($injector);
        return `${author}:${book}`;
      }, $injector),
    ).toEqual("melville:moby");
  });

  it("should invoke method with locals", () => {
    expect($injector.invoke((book, author) => `${author}:${book}`)).toEqual(
      "melville:moby",
    );
    expect(
      $injector.invoke(
        function (book, author, chapter) {
          expect(this).toEqual($injector);
          return `${author}:${book}-${chapter}`;
        },
        $injector,
        { author: "m", chapter: "ch1" },
      ),
    ).toEqual("m:moby-ch1");
  });

  it("should invoke method which is annotated", () => {
    expect(
      $injector.invoke(
        extend((b, a) => `${a}:${b}`, { $inject: ["book", "author"] }),
      ),
    ).toEqual("melville:moby");
    expect(
      $injector.invoke(
        extend(
          function (b, a) {
            expect(this).toEqual($injector);
            return `${a}:${b}`;
          },
          { $inject: ["book", "author"] },
        ),
        $injector,
      ),
    ).toEqual("melville:moby");
  });

  it("should invoke method which is an array of annotation", () => {
    expect($injector.invoke((book, author) => `${author}:${book}`)).toEqual(
      "melville:moby",
    );
    expect(
      $injector.invoke(function (book, author) {
        expect(this).toEqual($injector);
        return `${author}:${book}`;
      }, $injector),
    ).toEqual("melville:moby");
  });

  it("should throw useful error on wrong argument type]", () => {
    expect(() => {
      $injector.invoke({});
    }).toThrowError(/Argument 'fn' is not a function, got Object/);
  });
});

describe("service instantiation", () => {
  let $injector;

  beforeEach(() => {
    $injector = createInjector([
      function ($provide) {
        $provide.value("book", "moby");
        $provide.value("author", "melville");
      },
    ]);
  });

  function Type(book, author) {
    this.book = book;
    this.author = author;
  }
  Type.prototype.title = function () {
    return this.author + ": " + this.book;
  };

  it("should instantiate object and preserve constructor property and be instanceof", () => {
    const t = $injector.instantiate(Type);
    expect(t.book).toEqual("moby");
    expect(t.author).toEqual("melville");
    expect(t.title()).toEqual("melville: moby");
    expect(t instanceof Type).toBe(true);
  });

  it(
    "should instantiate object and preserve constructor property and be instanceof " +
      "with the array annotated type",
    () => {
      const t = $injector.instantiate(["book", "author", Type]);
      expect(t.book).toEqual("moby");
      expect(t.author).toEqual("melville");
      expect(t.title()).toEqual("melville: moby");
      expect(t instanceof Type).toBe(true);
    },
  );

  it("should allow constructor to return different object", () => {
    const obj = {};
    const Class = function () {
      return obj;
    };

    expect($injector.instantiate(Class)).toBe(obj);
  });

  it("should allow constructor to return a function", () => {
    const fn = function () {};
    const Class = function () {
      return fn;
    };

    expect($injector.instantiate(Class)).toBe(fn);
  });

  it("should handle constructor exception", () => {
    expect(function () {
      $injector.instantiate(function () {
        throw "MyError";
      });
    }).toThrow("MyError");
  });

  it("should return instance if constructor returns non-object value", () => {
    const A = function () {
      return 10;
    };

    const B = function () {
      return "some-string";
    };

    const C = function () {
      return undefined;
    };

    expect($injector.instantiate(A) instanceof A).toBe(true);
    expect($injector.instantiate(B) instanceof B).toBe(true);
    expect($injector.instantiate(C) instanceof C).toBe(true);
  });
});

describe("protection modes", () => {
  it("should prevent provider lookup in app", () => {
    const $injector = createInjector([
      function ($provide) {
        $provide.value("name", "angular");
      },
    ]);
    expect(() => {
      $injector.get("nameProvider");
    }).toThrowError(/Unknown provider/);
  });

  it("should prevent provider configuration in app", () => {
    const $injector = createInjector([]);
    expect(() => {
      $injector.get("$provide").value("a", "b");
    }).toThrowError(/Unknown provider/);
  });

  it("should prevent instance lookup in module", () => {
    function instanceLookupInModule(name) {}
    expect(() => {
      createInjector([
        function ($provide) {
          $provide.value("name", "angular");
        },
        instanceLookupInModule,
      ]);
    }).toThrowError(/Unknown provider: name/);
  });
});

describe("strict-di injector", () => {
  let module;
  let $injector;
  beforeEach(() => {
    window.angular = new Angular();
    module = angular.module("test1", []);
    $injector = createInjector(["test1"], true);
  });

  it("should throw if magic annotation is used by service", () => {
    module.provider(($provide) => {
      $provide.service({
        $test: () => {
          return this;
        },
        $test2: function ($test) {
          return this;
        },
      });
    });
    expect(() => {
      $injector.invoke(($test2) => {});
    }).toThrowError(/strictdi/);
  });

  it("should throw if magic annotation is used by provider", () => {
    module.provider(($provide) => {
      $provide.provider({
        $test: () => {
          this.$get = function ($rootScope) {
            return $rootScope;
          };
        },
      });
    });
    expect(() => {
      $injector.invoke(function ($test) {});
    }).toThrowError(/strictdi/);
  });

  it("should throw if magic annotation is used by factory", () => {
    module.provider(($provide) => {
      $provide.factory({
        $test: function ($rootScope) {
          return function () {};
        },
      });
    });
    expect(() => {
      $injector.invoke(function (test) {});
    }).toThrowError(/strictdi/);
  });

  it("should throw if factory does not return a value", () => {
    module.provider(($provide) => {
      $provide.factory("$test", () => {});
    });
    expect(() => {
      $injector.invoke("$test");
    }).toThrowError(/is not a function/);
  });

  it("should set strictDi property on the injector instance", () => {
    angular.module("test1", []);
    let $injector = createInjector(["test1"], true);
    expect($injector.strictDi).toBe(true);

    $injector = createInjector(["test1"]);
    expect($injector.strictDi).toBe(false);
  });
});
