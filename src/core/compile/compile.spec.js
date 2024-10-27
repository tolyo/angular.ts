import { Angular } from "../../loader";
import { createInjector } from "../di/injector";
import { dealoc, JQLite, getOrSetCacheData } from "../../shared/jqlite/jqlite";
import {
  isFunction,
  valueFn,
  isElement,
  getNodeName,
  extend,
} from "../../shared/utils";
import { countChildScopes, countWatchers } from "../scope/scope";
import { CACHE, EXPANDO } from "../cache/cache";
import { wait } from "../../shared/test-utils";

function isUnknownElement(el) {
  return !!el.toString().match(/Unknown/);
}

function isSVGElement(el) {
  return !!el.toString().match(/SVG/);
}

function isHTMLElement(el) {
  return !!el.toString().match(/HTML/);
}

function getChildScopes(scope) {
  let children = [];
  if (!scope.$$childHead) {
    return children;
  }
  let childScope = scope.$$childHead;
  do {
    children.push(childScope);
    children = children.concat(getChildScopes(childScope));
  } while ((childScope = childScope.$$nextSibling));
  return children;
}

describe("$compile", () => {
  const $ = JQLite;
  let $rootScope,
    myModule,
    module,
    injector,
    defaultModule,
    element,
    $compile,
    $templateCache,
    log,
    $sce;

  beforeEach(() => {
    dealoc(document.getElementById("dummy"));
    log = [];
    window.angular = new Angular();
    module = window.angular.module("test1", ["ng"]);
    defaultModule = window.angular.module("defaultModule", ["ng"]);
    myModule = window.angular.module("myModule", ["ng"]);
    injector = window.angular.bootstrap(document.getElementById("dummy"), [
      "defaultModule",
    ]);
    $rootScope = injector.get("$rootScope");
    $compile = injector.get("$compile");
    $templateCache = injector.get("$templateCache");
    $sce = injector.get("$sce");
  });

  function registerDirectives() {
    var args = arguments;
    myModule = window.angular.module("myModule", [
      "ng",
      function ($compileProvider) {
        $compileProvider.directive.apply($compileProvider, args);
      },
    ]);
  }

  function registerComponent(name, options) {
    myModule.component(name, options);
  }

  function registerDefaultDirectives() {
    return registerDirectives({
      log: () => ({
        restrict: "A",
        priority: 0,
        compile: valueFn((scope, element, attrs) => {
          log.push(attrs.log || "LOG");
        }),
      }),

      highLog: () => ({
        restrict: "A",
        priority: 3,
        compile: valueFn((scope, element, attrs) => {
          log.push(attrs.highLog || "HIGH");
        }),
      }),

      mediumLog: () => ({
        restrict: "A",
        priority: 2,
        compile: valueFn((scope, element, attrs) => {
          log.push(attrs.mediumLog || "MEDIUM");
        }),
      }),

      greet: () => ({
        restrict: "A",
        priority: 10,
        compile: valueFn((scope, element, attrs) => {
          element.text(`Hello ${attrs.greet}`);
        }),
      }),

      set: () => (scope, element, attrs) => element.text(attrs.set),

      mediumStop: valueFn({
        priority: 2,
        terminal: true,
      }),

      stop: valueFn({
        terminal: true,
      }),

      negativeStop: valueFn({
        priority: -100, // even with negative priority we still should be able to stop descend
        terminal: true,
      }),

      svgContainer: () => ({
        template: '<svg width="400" height="400" ng-transclude></svg>',
        replace: true,
        transclude: true,
      }),

      svgCustomTranscludeContainer: () => ({
        template: '<svg width="400" height="400"></svg>',
        transclude: true,
        link(scope, element, attr, ctrls, $transclude) {
          const futureParent = element.children().eq(0);
          $transclude((clone) => {
            futureParent.append(clone);
          }, futureParent);
        },
      }),

      svgCircle: () => ({
        template: '<circle cx="2" cy="2" r="1"></circle>',
        templateNamespace: "svg",
        replace: true,
      }),

      myForeignObject: () => ({
        template:
          '<foreignObject width="100" height="100" ng-transclude></foreignObject>',
        templateNamespace: "svg",
        replace: true,
        transclude: true,
      }),
    });
  }

  /**
   * To simplify registration of new dependencies, a default module is created before each test, and additional
   * dependencies are loaded into our main module ("myModule"). The lazy loading updates all injectables to invoke
   * the newly-registered injecables.
   */
  function reloadModules() {
    injector.loadNewModules(["myModule"]);
  }

  function initInjector(name) {
    dealoc(document.getElementById("dummy"));
    injector = window.angular.bootstrap(document.getElementById("dummy"), [
      name,
    ]);
    reloadInjector();
  }

  function reloadInjector() {
    $rootScope = injector.get("$rootScope");
    $compile = injector.get("$compile");
    $templateCache = injector.get("$templateCache");
    $sce = injector.get("$sce");
  }

  it("allows creating directives", () => {
    myModule.directive("testing", () => {});
    reloadModules();
    expect(injector.has("testingDirective")).toBe(true);
  });

  it("allows creating many directives with the same name", () => {
    myModule.directive("testing", () => ({ d: "one" }));
    myModule.directive("testing", () => ({ d: "two" }));
    reloadModules();
    var result = injector.get("testingDirective");
    expect(result.length).toBe(2);
    expect(result[0].d).toEqual("one");
    expect(result[1].d).toEqual("two");
  });

  it("does not allow a directive called hasOwnProperty", () => {
    myModule.directive("hasOwnProperty", () => {});
    expect(() => {
      reloadModules();
    }).toThrowError();
  });

  it("allows creating directives with object notation", () => {
    myModule.directive({
      a: () => {},
      b: () => {},
      c: () => {},
    });
    reloadModules();

    expect(injector.has("aDirective")).toBe(true);
    expect(injector.has("bDirective")).toBe(true);
    expect(injector.has("cDirective")).toBe(true);
  });

  it("compiles element directives from a single element", () => {
    myModule.directive("myDirective", () => {
      return {
        restrict: "EA",
        compile: function (element) {
          element.data("hasCompiled", true);
        },
      };
    });
    reloadModules();

    var el = $("<my-directive></my-directive>");
    $compile(el);
    expect(el.data("hasCompiled")).toBe(true);
  });

  it("compiles element directives found from several elements", () => {
    var idx = 1;
    myModule.directive("myDirective", () => {
      return {
        restrict: "EA",
        compile: function (element) {
          element.data("idx", idx++);
        },
      };
    });
    reloadModules();
    var el = $("<my-directive></my-directive><my-directive></my-directive>");
    $compile(el);
    expect(el.eq(0).data("idx")).toBe(1);
    expect(el.eq(1).data("idx")).toBe(2);
  });

  it("compiles element directives from child elements", () => {
    var idx = 1;
    myModule.directive("myDirective", () => {
      return {
        restrict: "EA",
        compile: function (element) {
          element.data("dir", idx++);
        },
      };
    });
    reloadModules();

    var el = $("<div><my-directive></my-directive></div>");
    $compile(el);
    expect(el.data("dir")).toBeUndefined();
    expect(el.find("my-directive").data("dir")).toBe(1);
  });

  it("compiles nested directives", () => {
    var idx = 1;
    myModule.directive("myDir", () => {
      return {
        restrict: "EA",
        compile: function (element) {
          element.data("dir", idx++);
        },
      };
    });
    reloadModules();
    var el = $("<my-dir><my-dir><my-dir></my-dir></my-dir></my-dir>");
    $compile(el);
    expect(el.data("dir")).toBe(1);
    expect(el.find("my-dir").data("dir")).toBe(2);
    expect(el[0].childNodes[0].childNodes[0]).toBeTruthy();
  });

  ["data"].forEach((prefix) => {
    ["-"].forEach((delim) => {
      it(
        "compiles element directives with " + prefix + delim + " prefix",
        () => {
          myModule.directive("myDirective", () => {
            return {
              restrict: "EA",
              compile: function (element) {
                element.data("hasCompiled", true);
              },
            };
          });
          reloadModules();
          var el = $(
            "<" +
              prefix +
              delim +
              "my-directive></" +
              prefix +
              delim +
              "my-directive>",
          );
          $compile(el);
          expect(el.data("hasCompiled")).toBe(true);
        },
      );
    });
  });

  it("compiles attribute directives", () => {
    myModule.directive("myDirective", () => {
      return {
        restrict: "EA",
        compile: function (element) {
          element.data("hasCompiled", true);
        },
      };
    });

    reloadModules();
    var el = $("<div my-directive></div>");
    $compile(el);
    expect(el.data("hasCompiled")).toBe(true);
  });

  it("compiles attribute directives with prefixes", () => {
    myModule.directive("myDirective", () => {
      return {
        restrict: "EA",
        compile: function (element) {
          element.data("hasCompiled", true);
        },
      };
    });
    reloadModules();
    var el = $("<div my-directive></div>");
    $compile(el);
    expect(el.data("hasCompiled")).toBe(true);
  });

  it("compiles several attribute directives in an element", () => {
    myModule
      .directive("myDirective", () => {
        return {
          restrict: "EA",
          compile: function (element) {
            element.data("hasCompiled", true);
          },
        };
      })
      .directive("mySecondDirective", () => {
        return {
          restrict: "EA",
          compile: function (element) {
            element.data("secondCompiled", true);
          },
        };
      });
    reloadModules();
    var el = $("<div my-directive my-second-directive></div>");
    $compile(el);
    expect(el.data("hasCompiled")).toBe(true);
    expect(el.data("secondCompiled")).toBe(true);
  });

  it("compiles both element and attributes directives in an element", () => {
    myModule
      .directive("myDirective", () => {
        return {
          restrict: "EA",
          compile: function (element) {
            element.data("hasCompiled", true);
          },
        };
      })
      .directive("mySecondDirective", () => {
        return {
          restrict: "EA",
          compile: function (element) {
            element.data("secondCompiled", true);
          },
        };
      });

    reloadModules();
    var el = $("<my-directive my-second-directive></my-directive>");
    $compile(el);
    expect(el.data("hasCompiled")).toBe(true);
    expect(el.data("secondCompiled")).toBe(true);
  });

  it("compiles attribute directives with ng-attr prefix", () => {
    myModule.directive("myDirective", () => {
      return {
        restrict: "EA",
        compile: function (element) {
          element.data("hasCompiled", true);
        },
      };
    });
    reloadModules();
    var el = $("<div ng-attr-my-directive></div>");
    $compile(el);
    expect(el.data("hasCompiled")).toBe(true);
  });

  it("compiles attribute directives with ng-attr prefix", () => {
    myModule.directive("myDirective", () => {
      return {
        restrict: "EA",
        compile: function (element) {
          element.data("hasCompiled", true);
        },
      };
    });
    reloadModules();
    var el = $("<div ng-attr-my-directive></div>");
    $compile(el);
    expect(el.data("hasCompiled")).toBe(true);
  });

  Object.entries({
    E: { element: true, attribute: false },
    A: { element: false, attribute: true },
    EA: { element: true, attribute: true },
  }).forEach(([restrict, expected]) => {
    describe("restricted to " + restrict, () => {
      Object.entries({
        element: "<my-directive></my-directive>",
        attribute: "<div my-directive></div>",
      }).forEach(([type, dom]) => {
        it(
          (expected[type] ? "matches" : "does not match") + " on " + type,
          () => {
            var hasCompiled = false;
            myModule.directive("myDirective", () => {
              return {
                restrict: restrict,
                compile: () => {
                  hasCompiled = true;
                },
              };
            });
            reloadModules();
            $compile(dom);
            expect(hasCompiled).toBe(expected[type]);
          },
        );
      });
    });
  });

  it("applies to attributes when no restrict given", () => {
    var hasCompiled = false;
    myModule.directive("myDirective", () => {
      return {
        compile: () => {
          hasCompiled = true;
        },
      };
    });
    reloadModules();
    var el = $("<div my-directive></div>");
    $compile(el);
    expect(hasCompiled).toBe(true);
  });

  it("applies to elements when no restrict given", () => {
    var hasCompiled = false;
    myModule.directive("myDirective", () => {
      return {
        compile: () => {
          hasCompiled = true;
        },
      };
    });
    reloadModules();
    var el = $("<my-directive></my-directive>");
    $compile(el);
    expect(hasCompiled).toBe(true);
  });

  it("does not apply to classes when no restrict given", () => {
    var hasCompiled = false;
    myModule.directive("myDirective", () => {
      return {
        compile: () => {
          hasCompiled = true;
        },
      };
    });
    reloadModules();
    var el = $('<div class="my-directive"></div>');
    $compile(el);
    expect(hasCompiled).toBe(false);
  });

  it("applies in priority order", () => {
    var compilations = [];
    myModule
      .directive("lowerDirective", () => {
        return {
          priority: 1,
          compile: () => {
            compilations.push("lower");
          },
        };
      })
      .directive("higherDirective", () => {
        return {
          priority: 2,
          compile: () => {
            compilations.push("higher");
          },
        };
      });
    reloadModules();
    var el = $("<div lower-directive higher-directive></div>");
    $compile(el);
    expect(compilations).toEqual(["higher", "lower"]);
  });

  it("applies in name order when priorities are the same", () => {
    var compilations = [];
    myModule
      .directive("firstDirective", () => {
        return {
          priority: 1,
          compile: () => {
            compilations.push("first");
          },
        };
      })
      .directive("secondDirective", () => {
        return {
          priority: 1,
          compile: () => {
            compilations.push("second");
          },
        };
      });
    reloadModules();
    $compile("<div second-directive first-directive></div>");
    expect(compilations).toEqual(["first", "second"]);
  });

  it("applies in registration order when names are the same", () => {
    var compilations = [];
    myModule
      .directive("aDirective", () => {
        return {
          priority: 1,
          compile: () => {
            compilations.push("first");
          },
        };
      })
      .directive("aDirective", () => {
        return {
          priority: 1,
          compile: () => {
            compilations.push("second");
          },
        };
      });
    reloadModules();
    $compile("<div a-directive></div>");
    expect(compilations).toEqual(["first", "second"]);
  });

  it("uses default priority when one not given", () => {
    var compilations = [];
    myModule
      .directive("firstDirective", () => {
        return {
          priority: 1,
          compile: () => {
            compilations.push("first");
          },
        };
      })
      .directive("secondDirective", () => {
        return {
          compile: () => {
            compilations.push("second");
          },
        };
      });
    reloadModules();
    $compile("<div second-directive first-directive></div>");
    expect(compilations).toEqual(["first", "second"]);
  });

  it("stops compiling at a terminal directive", () => {
    var compilations = [];

    myModule
      .directive("firstDirective", () => {
        return {
          priority: 1,
          terminal: true,
          compile: () => {
            compilations.push("first");
          },
        };
      })
      .directive("secondDirective", () => {
        return {
          priority: 0,
          compile: () => {
            compilations.push("second");
          },
        };
      });
    reloadModules();
    $compile("<div first-directive second-directive></div>");
    expect(compilations).toEqual(["first"]);
  });

  it("still compiles directives with same priority after terminal", () => {
    var compilations = [];
    myModule
      .directive("firstDirective", () => {
        return {
          priority: 1,
          terminal: true,
          compile: () => {
            compilations.push("first");
          },
        };
      })
      .directive("secondDirective", () => {
        return {
          priority: 1,
          compile: () => {
            compilations.push("second");
          },
        };
      });
    reloadModules();
    $compile("<div first-directive second-directive></div>");
    expect(compilations).toEqual(["first", "second"]);
  });

  it("stops child compilation after a terminal directive", () => {
    var compilations = [];
    myModule
      .directive("parentDirective", () => {
        return {
          terminal: true,
          compile: () => {
            compilations.push("parent");
          },
        };
      })
      .directive("childDirective", () => {
        return {
          compile: () => {
            compilations.push("child");
          },
        };
      });
    reloadModules();
    $compile("<div parent-directive><div child-directive></div></div>");
    expect(compilations).toEqual(["parent"]);
  });

  describe("multiple directives per element", () => {
    beforeEach(() => {
      registerDefaultDirectives();
    });

    afterEach(() => {
      dealoc(element);
    });

    it("allows applying a directive to multiple elements", () => {
      var compileEl = false;
      registerDirectives("myDir", () => {
        return {
          multiElement: true,
          compile: function (element) {
            compileEl = element;
          },
        };
      });
      reloadModules();
      $compile("<div my-dir-start></div><span></span><div my-dir-end></div>");
      expect(compileEl.length).toBe(3);
    });

    it("should allow multiple directives per element", () => {
      reloadModules();
      var el = $(
        "<span greet='angular' log='L' high-log='H' data-medium-log='M'></span>",
      );
      $compile(el)($rootScope);
      expect(el.text()).toEqual("Hello angular");
      expect(log.join("; ")).toEqual("L; M; H");
    });

    it("should recurse to children", () => {
      reloadModules();
      element = $compile(
        '<div>0<a set="hello">1</a>2<b set="angular">3</b>4</div>',
      )($rootScope);
      expect(element.text()).toEqual("0hello2angular4");
    });

    it("should allow directives in SVG element classes", () => {
      reloadModules();
      if (!window.SVGElement) return;
      element = $compile('<svg><text greet="angular" log="123"></text></svg>')(
        $rootScope,
      );
      const text = element.children().eq(0);
      // In old Safari, SVG elements don't have innerHTML, so element.html() won't work
      // (https://bugs.webkit.org/show_bug.cgi?id=136903)
      expect(text.text()).toEqual("Hello angular");
      expect(log[0]).toEqual("123");
    });

    it("should ignore not set CSS classes on SVG elements", () => {
      reloadModules();
      if (!window.SVGElement) return;
      // According to spec SVG element className property is readonly, but only FF
      // implements it this way which causes compile exceptions.
      element = $compile("<svg><text>{{1}}</text></svg>")($rootScope);
      expect(element.text()).toEqual("1");
    });

    it("should receive scope, element, and attributes", () => {
      let injectableInjector;
      myModule.directive("log", ($rootScope, $injector) => {
        injectableInjector = $injector;
        return {
          restrict: "A",
          compile(element, templateAttr) {
            expect(typeof templateAttr.$normalize).toBe("function");
            expect(typeof templateAttr.$set).toBe("function");
            expect(isElement(templateAttr.$$element)).toBeTruthy();
            expect(element.text()).toEqual("unlinked");
            expect(templateAttr.exp).toEqual("abc");
            expect(templateAttr.aa).toEqual("A");
            expect(templateAttr.bb).toEqual("B");
            expect(templateAttr.cc).toEqual("C");
            return function (scope, element, attr) {
              expect(element.text()).toEqual("unlinked");
              expect(attr).toBe(templateAttr);
              expect(scope).toEqual($rootScope);
              element.text("worked");
            };
          },
        };
      });

      reloadModules();
      element = $compile(
        '<div log exp="abc" aa="A" Bb="B" daTa-cC="C">unlinked</div>',
      )($rootScope);

      expect(element.text()).toEqual("worked");
      expect(injector).toBe(injectableInjector);
      // verify that directive is injectable
    });
  });

  describe("attributes", () => {
    function registerAndCompile(dirName, domString, callback) {
      var givenAttrs;
      registerDirectives(dirName, () => {
        return {
          restrict: "EA",
          compile: function (element, attrs) {
            givenAttrs = attrs;
          },
        };
      });
      reloadModules();
      var el = $(domString);
      $compile(el);
      callback(el, givenAttrs, $rootScope);
    }

    it("passes the element attributes to the compile function", () => {
      registerAndCompile(
        "myDirective",
        '<my-directive my-attr="1" my-other-attr="two"></my-directive>',
        function (element, attrs) {
          expect(attrs.myAttr).toEqual("1");
          expect(attrs.myOtherAttr).toEqual("two");
        },
      );
    });

    it("trims attribute values", () => {
      registerAndCompile(
        "myDirective",
        '<my-directive my-attr="val"></my-directive>',
        function (element, attrs) {
          expect(attrs.myAttr).toEqual("val");
        },
      );
    });

    it("sets the value of boolean attributes to true", () => {
      registerAndCompile(
        "myDirective",
        "<input my-directive disabled>",
        function (element, attrs) {
          expect(attrs.disabled).toBe(true);
        },
      );
    });

    it("does not set the value of non-standard boolean attributes to true", () => {
      registerAndCompile(
        "myDirective",
        "<input my-directive whatever>",
        function (element, attrs) {
          expect(attrs.whatever).toEqual("");
        },
      );
    });

    it("overrides attributes with ng-attr- versions", () => {
      registerAndCompile(
        "myDirective",
        '<input my-directive ng-attr-whatever="42" whatever="41">',
        function (element, attrs) {
          expect(attrs.whatever).toEqual("42");
        },
      );
    });

    it("allows setting attributes", () => {
      registerAndCompile(
        "myDirective",
        '<my-directive attr="true"></my-directive>',
        function (element, attrs) {
          attrs.$set("attr", "false");
          expect(attrs.attr).toEqual("false");
        },
      );
    });

    it("sets attributes to DOM", () => {
      registerAndCompile(
        "myDirective",
        '<my-directive attr="true"></my-directive>',
        function (element, attrs) {
          attrs.$set("attr", "false");
          expect(element.attr("attr")).toEqual("false");
        },
      );
    });

    it("does not set attributes to DOM when flag set to false", () => {
      registerAndCompile(
        "myDirective",
        '<my-directive attr="true"></my-directive>',
        function (element, attrs) {
          attrs.$set("attr", "false", false);
          expect(element.attr("attr")).toEqual("true");
        },
      );
    });

    it("shares attributes between directives", () => {
      var attrs1, attrs2;
      registerDirectives({
        myDir: () => {
          return {
            compile: function (element, attrs) {
              attrs1 = attrs;
            },
          };
        },
        myOtherDir: () => {
          return {
            compile: function (element, attrs) {
              attrs2 = attrs;
            },
          };
        },
      });
      reloadModules();
      var el = $("<div my-dir my-other-dir></div>");
      $compile(el);
      expect(attrs1).toBe(attrs2);
    });

    it("sets prop for boolean attributes", () => {
      registerAndCompile(
        "myDirective",
        "<input my-directive>",
        function (element, attrs) {
          attrs.$set("disabled", true);
          expect(element[0]["disabled"]).toBe(true);
        },
      );
    });

    it("sets prop for boolean attributes even when not flushing", () => {
      registerAndCompile(
        "myDirective",
        "<input my-directive>",
        function (element, attrs) {
          attrs.$set("disabled", true, false);
          expect(element[0]["disabled"]).toBe(true);
        },
      );
    });

    it("denormalizes attribute name when explicitly given", () => {
      registerAndCompile(
        "myDirective",
        '<my-directive some-attribute="42"></my-directive>',
        function (element, attrs) {
          attrs.$set("someAttribute", 43, true, "some-attribute");
          expect(element.attr("some-attribute")).toEqual("43");
        },
      );
    });

    it("denormalizes attribute by snake-casing when no other means available", () => {
      registerAndCompile(
        "myDirective",
        '<my-directive some-attribute="42"></my-directive>',
        function (element, attrs) {
          attrs.$set("someAttribute", 43);
          expect(element.attr("some-attribute")).toEqual("43");
        },
      );
    });

    it("denormalizes attribute by using original attribute name", () => {
      registerAndCompile(
        "myDirective",
        '<my-directive some-attribute="42"></my-directive>',
        function (element, attrs) {
          attrs.$set("someAttribute", 43);
          expect(element.attr("some-attribute")).toEqual("43");
        },
      );
    });

    it("does not use ng-attr- prefix in denormalized names", () => {
      registerAndCompile(
        "myDirective",
        '<my-directive ng-attr-some-attribute="42"></my-directive>',
        function (element, attrs) {
          attrs.$set("someAttribute", 43);
          expect(element.attr("some-attribute")).toEqual("43");
        },
      );
    });

    it("uses new attribute name after once given", () => {
      registerAndCompile(
        "myDirective",
        '<my-directive some-attribute="42"></my-directive>',
        function (element, attrs) {
          attrs.$set("someAttribute", 43, true, "some-attribute");
          attrs.$set("someAttribute", 44);

          expect(element.attr("some-attribute")).toEqual("44");
        },
      );
    });

    it("calls observer immediately when attribute is $set", () => {
      registerAndCompile(
        "myDirective",
        '<my-directive some-attribute="42"></my-directive>',
        function (element, attrs) {
          var gotValue;
          attrs.$observe("someAttribute", function (value) {
            gotValue = value;
          });

          attrs.$set("someAttribute", "43");

          expect(gotValue).toEqual("43");
        },
      );
    });

    it("calls observer on next $digest after registration", () => {
      registerAndCompile(
        "myDirective",
        '<my-directive some-attribute="42"></my-directive>',
        function (element, attrs, $rootScope) {
          var gotValue;
          attrs.$observe("someAttribute", function (value) {
            gotValue = value;
          });

          expect(gotValue).toEqual("42");
        },
      );
    });

    it("lets observers be deregistered", () => {
      registerAndCompile(
        "myDirective",
        '<my-directive some-attribute="42"></my-directive>',
        function (element, attrs) {
          var gotValue;
          var remove = attrs.$observe("someAttribute", function (value) {
            gotValue = value;
          });

          attrs.$set("someAttribute", "43");
          expect(gotValue).toEqual("43");

          remove();
          attrs.$set("someAttribute", "44");
          expect(gotValue).toEqual("43");
        },
      );
    });

    it("does not add attribute from class without a directive", () => {
      registerAndCompile(
        "myDirective",
        '<my-directive class="some-class"></my-directive>',
        function (element, attrs) {
          expect(attrs.hasOwnProperty("someClass")).toBe(false);
        },
      );
    });

    it("allows adding classes", () => {
      registerAndCompile(
        "myDirective",
        "<my-directive></my-directive>",
        function (element, attrs) {
          attrs.$addClass("some-class");
          expect(element[0].classList.contains("some-class")).toBe(true);
        },
      );
    });

    it("allows removing classes", () => {
      registerAndCompile(
        "myDirective",
        '<my-directive class="some-class"></my-directive>',
        function (element, attrs) {
          attrs.$removeClass("some-class");
          expect(element[0].classList.contains("some-class")).toBe(false);
        },
      );
    });

    it("allows updating classes", () => {
      registerAndCompile(
        "myDirective",
        '<my-directive class="one three four"></my-directive>',
        function (element, attrs) {
          attrs.$updateClass("one two three", "one three four");
          expect(element[0].classList.contains("one")).toBe(true);
          expect(element[0].classList.contains("two")).toBe(true);
          expect(element[0].classList.contains("three")).toBe(true);
          expect(element[0].classList.contains("four")).toBe(false);
        },
      );
    });
  });

  it("returns a public link function from compile", () => {
    registerDirectives("myDirective", () => {
      return { compile: () => {} };
    });
    reloadModules();
    var el = $("<div my-directive></div>");
    var linkFn = $compile(el);
    expect(linkFn).toBeDefined();
    expect(isFunction(linkFn)).toBe(true);
  });

  describe("linking", () => {
    // THERE IS NO SCOPE ATTACHED TO ACTUAL ELEMENTS
    // it("takes a scope and attaches it to elements", () => {
    //   registerDirectives("myDirective", () => {
    //     return { compile: () => {} };
    //   });
    //   reloadModules();
    //   var el = $("<div my-directive></div>");
    //   $compile(el)($rootScope);
    //   expect(el.data("$scope")).toBe($rootScope);
    // });

    it("calls directive link function with scope", () => {
      var givenScope, givenElement, givenAttrs;
      registerDirectives("myDirective", () => {
        return {
          compile: () => {
            return function link(scope, element, attrs) {
              givenScope = scope;
              givenElement = element;
              givenAttrs = attrs;
            };
          },
        };
      });
      reloadModules();
      var el = $("<div my-directive></div>");
      $compile(el)($rootScope);
      expect(givenScope).toBe($rootScope);
      expect(givenElement[0]).toBe(el[0]);
      expect(givenAttrs).toBeDefined();
      expect(givenAttrs.myDirective).toBeDefined();
    });

    it("supports link function in directive definition object", () => {
      var givenScope, givenElement, givenAttrs;
      registerDirectives("myDirective", () => {
        return {
          link: function (scope, element, attrs) {
            givenScope = scope;
            givenElement = element;
            givenAttrs = attrs;
          },
        };
      });
      reloadModules();
      var el = $("<div my-directive></div>");
      $compile(el)($rootScope);
      expect(givenScope).toBe($rootScope);
      expect(givenElement[0]).toBe(el[0]);
      expect(givenAttrs).toBeDefined();
      expect(givenAttrs.myDirective).toBeDefined();
    });
  });

  it("links children when parent has no directives", () => {
    var givenElements = [];
    registerDirectives("myDirective", () => {
      return {
        link: function (scope, element, attrs) {
          givenElements.push(element);
        },
      };
    });
    reloadModules();
    var el = $("<div><div my-directive></div></div>");
    $compile(el)($rootScope);
    expect(givenElements.length).toBe(1);
    expect(givenElements[0][0]).toBe(el[0].firstChild);
  });

  it("supports link function objects", () => {
    var linked;
    registerDirectives("myDirective", () => {
      return {
        link: {
          post: function (scope, element, attrs) {
            linked = true;
          },
        },
      };
    });
    reloadModules();
    var el = $("<div><div my-directive></div></div>");
    $compile(el)($rootScope);
    expect(linked).toBe(true);
  });

  it("supports prelinking and postlinking", () => {
    var linkings = [];
    registerDirectives("myDirective", () => {
      return {
        link: {
          pre: function (scope, element) {
            linkings.push(["pre", element[0]]);
          },
          post: function (scope, element) {
            linkings.push(["post", element[0]]);
          },
        },
      };
    });
    reloadModules();
    var el = $("<div my-directive><div my-directive></div></div>");
    $compile(el)($rootScope);
    expect(linkings.length).toBe(4);
    expect(linkings[0]).toEqual(["pre", el[0]]);
    expect(linkings[1]).toEqual(["pre", el[0].firstChild]);
    expect(linkings[2]).toEqual(["post", el[0].firstChild]);
    expect(linkings[3]).toEqual(["post", el[0]]);
  });

  it("reverses priority for postlink functions", () => {
    var linkings = [];
    registerDirectives({
      firstDirective: () => {
        return {
          priority: 2,
          link: {
            pre: function (scope, element) {
              linkings.push("first-pre");
            },
            post: function (scope, element) {
              linkings.push("first-post");
            },
          },
        };
      },
      secondDirective: () => {
        return {
          priority: 1,
          link: {
            pre: function (scope, element) {
              linkings.push("second-pre");
            },
            post: function (scope, element) {
              linkings.push("second-post");
            },
          },
        };
      },
    });
    reloadModules();
    var el = $("<div first-directive second-directive></div>");
    $compile(el)($rootScope);
    expect(linkings).toEqual([
      "first-pre",
      "second-pre",
      "second-post",
      "first-post",
    ]);
  });

  it("stabilizes node list during linking", () => {
    var givenElements = [];
    registerDirectives("myDirective", () => {
      return {
        link: function (scope, element, attrs) {
          givenElements.push(element[0]);
          element.after("<div></div>");
        },
      };
    });
    reloadModules();
    var el = $("<div><div my-directive></div><div my-directive></div></div>");
    var el1 = el[0].childNodes[0],
      el2 = el[0].childNodes[1];
    $compile(el)($rootScope);
    expect(givenElements.length).toBe(2);
    expect(givenElements[0]).toBe(el1);
    expect(givenElements[1]).toBe(el2);
  });

  it("invokes multi-element directive link functions with whole group", () => {
    var givenElements;
    registerDirectives("myDirective", () => {
      return {
        multiElement: true,
        link: function (scope, element, attrs) {
          givenElements = element;
        },
      };
    });
    reloadModules();
    var el = $(
      "<div my-directive-start></div>" +
        "<p></p>" +
        "<div my-directive-end></div>",
    );
    $compile(el)($rootScope);
    expect(givenElements.length).toBe(3);
  });

  it("makes new scope for element when directive asks for it", () => {
    var givenScope;
    registerDirectives("myDirective", () => {
      return {
        scope: true,
        link: function (scope) {
          givenScope = scope;
        },
      };
    });
    reloadModules();
    var el = $("<div my-directive></div>");
    $compile(el)($rootScope);
    expect(givenScope.$parent).toBe($rootScope);
  });

  it("gives inherited scope to all directives on element", () => {
    var givenScope;
    registerDirectives({
      myDirective: () => {
        return {
          scope: true,
        };
      },
      myOtherDirective: () => {
        return {
          link: function (scope) {
            givenScope = scope;
          },
        };
      },
    });
    reloadModules();
    var el = $("<div my-directive my-other-directive></div>");
    $compile(el)($rootScope);
    expect(givenScope.$parent).toBe($rootScope);
  });

  it("adds new scope", () => {
    var givenScope;
    registerDirectives("myDirective", () => {
      return {
        scope: true,
        link: function (scope) {
          givenScope = scope;
        },
      };
    });
    reloadModules();
    var el = $("<div my-directive></div>");
    $compile(el)($rootScope);
    expect($rootScope.$$childHead).toBe(givenScope);
  });

  it("creates an isolate scope when requested", () => {
    var givenScope;
    registerDirectives("myDirective", () => {
      return {
        scope: {},
        link: function (scope) {
          givenScope = scope;
        },
      };
    });
    reloadModules();
    var el = $("<div my-directive></div>");
    $compile(el)($rootScope);
    expect(givenScope.$parent).toBe($rootScope);
    expect(Object.getPrototypeOf(givenScope)).not.toBe($rootScope);
  });

  it("does not share isolate scope with other directives on the element", () => {
    var givenScope;
    registerDirectives({
      myDirective: () => {
        return {
          scope: {},
        };
      },
      myOtherDirective: () => {
        return {
          link: function (scope) {
            givenScope = scope;
          },
        };
      },
    });
    reloadModules();
    var el = $("<div my-directive my-other-directive></div>");
    $compile(el)($rootScope);
    expect(givenScope).toBe($rootScope);
  });

  it("does not use isolate scope on child elements", () => {
    var givenScope;
    registerDirectives({
      myDirective: () => {
        return {
          scope: {},
        };
      },
      myOtherDirective: () => {
        return {
          link: function (scope) {
            givenScope = scope;
          },
        };
      },
    });
    reloadModules();
    var el = $("<div my-directive><div my-other-directive></div></div>");
    $compile(el)($rootScope);
    expect(givenScope).toBe($rootScope);
  });

  it("does not allow two isolate scope directives on an element", () => {
    registerDirectives({
      myDirective: () => {
        return {
          scope: {},
        };
      },
      myOtherDirective: () => {
        return {
          scope: {},
        };
      },
    });
    reloadModules();
    var el = $("<div my-directive my-other-directive></div>");
    expect(() => {
      $compile(el);
    }).toThrowError();
  });

  it("does not allow both isolate and inherited scopes on an element", () => {
    registerDirectives({
      myDirective: () => {
        return {
          scope: {},
        };
      },
      myOtherDirective: () => {
        return {
          scope: true,
        };
      },
    });
    reloadModules();
    var el = $("<div my-directive my-other-directive></div>");
    expect(() => {
      $compile(el);
    }).toThrowError();
  });

  it("adds isolated scope", () => {
    var givenScope;
    registerDirectives("myDirective", () => {
      return {
        scope: {},
        link: function (scope) {
          givenScope = scope;
        },
      };
    });
    reloadModules();
    var el = $("<div my-directive></div>");
    $compile(el)($rootScope);
    expect($rootScope.$$childHead).toBe(givenScope);
  });

  it("allows observing attribute to the isolate scope", () => {
    var givenScope, givenAttrs;
    registerDirectives("myDirective", () => {
      return {
        scope: {
          anAttr: "@",
        },
        link: function (scope, element, attrs) {
          givenScope = scope;
          givenAttrs = attrs;
        },
      };
    });
    reloadModules();
    var el = $("<div my-directive></div>");
    $compile(el)($rootScope);

    givenAttrs.$set("anAttr", "42");
    expect(givenScope.anAttr).toEqual("42");
  });

  it("sets initial value of observed attr to the isolate scope", () => {
    var givenScope;
    registerDirectives("myDirective", () => {
      return {
        scope: {
          anAttr: "@",
        },
        link: function (scope, element, attrs) {
          givenScope = scope;
        },
      };
    });
    reloadModules();
    var el = $('<div my-directive an-attr="42"></div>');
    $compile(el)($rootScope);
    expect(givenScope.anAttr).toEqual("42");
  });

  it("allows aliasing observed attribute", () => {
    var givenScope;
    registerDirectives("myDirective", () => {
      return {
        scope: {
          aScopeAttr: "@anAttr",
        },
        link: function (scope, element, attrs) {
          givenScope = scope;
        },
      };
    });
    reloadModules();
    var el = $('<div my-directive an-attr="42"></div>');
    $compile(el)($rootScope);
    expect(givenScope.aScopeAttr).toEqual("42");
  });

  it("allows binding expression to isolate scope", () => {
    var givenScope;
    registerDirectives("myDirective", () => {
      return {
        scope: {
          anAttr: "<",
        },
        link: function (scope) {
          givenScope = scope;
        },
      };
    });
    reloadModules();
    var el = $('<div my-directive an-attr="42"></div>');
    $compile(el)($rootScope);

    expect(givenScope.anAttr).toBe(42);
  });

  it("allows aliasing expression attribute on isolate scope", () => {
    var givenScope;
    registerDirectives("myDirective", () => {
      return {
        scope: {
          myAttr: "<theAttr",
        },
        link: function (scope) {
          givenScope = scope;
        },
      };
    });
    reloadModules();
    var el = $('<div my-directive the-attr="42"></div>');
    $compile(el)($rootScope);

    expect(givenScope.myAttr).toBe(42);
  });

  it("evaluates isolate scope expression on parent scope", () => {
    var givenScope;
    registerDirectives("myDirective", () => {
      return {
        scope: {
          myAttr: "<",
        },
        link: function (scope) {
          givenScope = scope;
        },
      };
    });
    reloadModules();
    $rootScope.parentAttr = 41;
    var el = $('<div my-directive my-attr="parentAttr + 1"></div>');
    $compile(el)($rootScope);

    expect(givenScope.myAttr).toBe(42);
  });

  it("watches isolated scope expressions", () => {
    var givenScope;
    registerDirectives("myDirective", () => {
      return {
        scope: {
          myAttr: "<",
        },
        link: function (scope) {
          givenScope = scope;
        },
      };
    });
    reloadModules();
    var el = $('<div my-directive my-attr="parentAttr + 1"></div>');
    $compile(el)($rootScope);

    $rootScope.parentAttr = 41;
    expect(givenScope.myAttr).toBe(42);
  });

  it("does not watch optional missing isolate scope expressions", () => {
    var givenScope;
    registerDirectives("myDirective", () => {
      return {
        scope: {
          myAttr: "<?",
        },
        link: function (scope) {
          givenScope = scope;
        },
      };
    });
    reloadModules();
    var el = $("<div my-directive></div>");
    $compile(el)($rootScope);
    expect($rootScope.$$watchers.length).toEqual(0);
  });

  it("allows binding two-way expression to isolate scope", () => {
    var givenScope;
    registerDirectives("myDirective", () => {
      return {
        scope: {
          anAttr: "=",
        },
        link: function (scope) {
          givenScope = scope;
        },
      };
    });
    reloadModules();
    var el = $('<div my-directive an-attr="42"></div>');
    $compile(el)($rootScope);

    expect(givenScope.anAttr).toBe(42);
  });

  it("allows aliasing two-way expression attribute on isolate scope", () => {
    var givenScope;
    registerDirectives("myDirective", () => {
      return {
        scope: {
          myAttr: "=theAttr",
        },
        link: function (scope) {
          givenScope = scope;
        },
      };
    });
    reloadModules();
    var el = $('<div my-directive the-attr="42"></div>');
    $compile(el)($rootScope);

    expect(givenScope.myAttr).toBe(42);
  });

  it("watches two-way expressions", () => {
    var givenScope;
    registerDirectives("myDirective", () => {
      return {
        scope: {
          myAttr: "=",
        },
        link: function (scope) {
          givenScope = scope;
        },
      };
    });
    reloadModules();
    var el = $('<div my-directive my-attr="parentAttr + 1"></div>');
    $compile(el)($rootScope);

    $rootScope.parentAttr = 41;
    expect(givenScope.myAttr).toBe(42);
  });

  it("does not watch optional missing two-way expressions", () => {
    registerDirectives("myDirective", () => {
      return {
        scope: {
          myAttr: "=?",
        },
        link: () => {},
      };
    });
    reloadModules();
    var el = $("<div my-directive></div>");
    $compile(el)($rootScope);
    expect($rootScope.$$watchers.length).toEqual(0);
  });

  it("allows assigning to two-way scope expressions", () => {
    var isolateScope;
    registerDirectives("myDirective", () => {
      return {
        scope: {
          myAttr: "=",
        },
        link: function (scope) {
          isolateScope = scope;
        },
      };
    });
    reloadModules();
    var el = $('<div my-directive my-attr="parentAttr"></div>');
    $compile(el)($rootScope);

    isolateScope.myAttr = 42;
    expect($rootScope.parentAttr).toBe(42);
  });

  it("gives parent change precedence when both parent and child change", () => {
    var isolateScope;
    registerDirectives("myDirective", () => {
      return {
        scope: {
          myAttr: "=",
        },
        link: function (scope) {
          isolateScope = scope;
        },
      };
    });
    reloadModules();
    var el = $('<div my-directive my-attr="parentAttr"></div>');
    $compile(el)($rootScope);

    $rootScope.parentAttr = 42;
    isolateScope.myAttr = 43;
    expect($rootScope.parentAttr).toBe(42);
    expect(isolateScope.myAttr).toBe(42);
  });

  it("throws when two-way expression returns new arrays", () => {
    var givenScope;
    registerDirectives("myDirective", () => {
      return {
        scope: {
          myAttr: "=",
        },
        link: function (scope) {
          givenScope = scope;
        },
      };
    });
    reloadModules();
    $rootScope.parentFunction = () => {
      return [1, 2, 3];
    };
    var el = $('<div my-directive my-attr="parentFunction()"></div>');
    $compile(el)($rootScope);
    expect(() => {}).toThrowError();
  });

  it("can watch two-way bindings as collections", () => {
    var givenScope;
    registerDirectives("myDirective", () => {
      return {
        scope: {
          myAttr: "=*",
        },
        link: function (scope) {
          givenScope = scope;
        },
      };
    });
    reloadModules();
    $rootScope.parentFunction = () => {
      return [1, 2, 3];
    };
    var el = $('<div my-directive my-attr="parentFunction()"></div>');
    $compile(el)($rootScope);
    expect(givenScope.myAttr).toEqual([1, 2, 3]);
  });

  it("allows binding an invokable expression on the parent scope", () => {
    var givenScope;
    registerDirectives("myDirective", () => {
      return {
        scope: {
          myExpr: "&",
        },
        link: function (scope) {
          givenScope = scope;
        },
      };
    });
    reloadModules();
    $rootScope.parentFunction = () => {
      return 42;
    };
    var el = $('<div my-directive my-expr="parentFunction() + 1"></div>');
    $compile(el)($rootScope);
    expect(givenScope.myExpr()).toBe(43);
  });

  it("allows passing arguments to parent scope expression", () => {
    var givenScope;
    registerDirectives("myDirective", () => {
      return {
        scope: {
          myExpr: "&",
        },
        link: function (scope) {
          givenScope = scope;
        },
      };
    });
    reloadModules();
    var gotArg;
    $rootScope.parentFunction = function (arg) {
      gotArg = arg;
    };
    var el = $(
      '<div my-directive my-expr="parentFunction(argFromChild)"></div>',
    );
    $compile(el)($rootScope);
    givenScope.myExpr({ argFromChild: 42 });
    expect(gotArg).toBe(42);
  });

  it("sets missing optional parent scope expression to undefined", () => {
    var givenScope;
    registerDirectives("myDirective", () => {
      return {
        scope: {
          myExpr: "&?",
        },
        link: function (scope) {
          givenScope = scope;
        },
      };
    });
    reloadModules();
    var gotArg;
    $rootScope.parentFunction = function (arg) {
      gotArg = arg;
    };
    var el = $("<div my-directive></div>");
    $compile(el)($rootScope);
    expect(givenScope.myExpr).toBeUndefined();
  });

  describe("controllers", () => {
    it("can be attached to directives as functions", () => {
      var controllerInvoked;
      registerDirectives("myDirective", () => {
        return {
          controller: function MyController() {
            controllerInvoked = true;
          },
        };
      });
      reloadModules();
      var el = $("<div my-directive></div>");
      $compile(el)($rootScope);
      expect(controllerInvoked).toBe(true);
    });

    it("can be attached to directives as string references", () => {
      var controllerInvoked;
      function MyController() {
        controllerInvoked = true;
      }
      myModule
        .controller("MyController", MyController)
        .directive("myDirective", () => {
          return { controller: "MyController" };
        });

      reloadModules();
      var el = $("<div my-directive></div>");
      $compile(el)($rootScope);
      expect(controllerInvoked).toBe(true);
    });

    it("can be applied in the same element independent of each other", () => {
      var controllerInvoked;
      var otherControllerInvoked;
      function MyController() {
        controllerInvoked = true;
      }
      function MyOtherController() {
        otherControllerInvoked = true;
      }
      myModule
        .controller("MyController", MyController)
        .controller("MyOtherController", MyOtherController)
        .directive("myDirective", () => {
          return { controller: "MyController" };
        })
        .directive("myOtherDirective", () => {
          return { controller: "MyOtherController" };
        });
      reloadModules();
      var el = $("<div my-directive my-other-directive></div>");
      $compile(el)($rootScope);
      expect(controllerInvoked).toBe(true);
      expect(otherControllerInvoked).toBe(true);
    });

    it("can be applied to different directives, as different instances", () => {
      var invocations = 0;
      function MyController() {
        invocations++;
      }
      myModule
        .controller("MyController", MyController)
        .directive("myDirective", () => {
          return { controller: "MyController" };
        })
        .directive("myOtherDirective", () => {
          return { controller: "MyController" };
        });
      reloadModules();
      var el = $("<div my-directive my-other-directive></div>");
      $compile(el)($rootScope);
      expect(invocations).toBe(2);
    });

    it("can be aliased with @ when given in directive attribute", () => {
      var controllerInvoked;
      function MyController() {
        controllerInvoked = true;
      }
      myModule
        .controller("MyController", MyController)
        .directive("myDirective", () => {
          return { controller: "@" };
        });
      reloadModules();

      $compile('<div my-directive="MyController"></div>')($rootScope);
      expect(controllerInvoked).toBe(true);
    });

    it("gets scope, element, and attrs through DI", () => {
      var gotScope, gotElement, gotAttrs;
      function MyController($element, $scope, $attrs) {
        gotElement = $element;
        gotScope = $scope;
        gotAttrs = $attrs;
      }
      myModule
        .controller("MyController", MyController)
        .directive("myDirective", () => {
          return { controller: "MyController" };
        });
      reloadModules();
      var el = $('<div my-directive an-attr="abc"></div>');
      $compile(el)($rootScope);
      expect(gotElement[0]).toBe(el[0]);
      expect(gotScope).toBe($rootScope);
      expect(gotAttrs).toBeDefined();
      expect(gotAttrs.anAttr).toEqual("abc");
    });

    it("can be attached on the scope", () => {
      function MyController() {}
      myModule
        .controller("MyController", MyController)
        .directive("myDirective", () => {
          return {
            controller: "MyController",
            controllerAs: "myCtrl",
          };
        });
      reloadModules();
      var el = $("<div my-directive></div>");
      $compile(el)($rootScope);
      expect($rootScope.myCtrl).toBeDefined();
      expect($rootScope.myCtrl instanceof MyController).toBe(true);
    });

    it("gets isolate scope as injected $scope", () => {
      var gotScope;
      function MyController($scope) {
        gotScope = $scope;
      }
      myModule
        .controller("MyController", MyController)
        .directive("myDirective", () => {
          return {
            scope: {},
            controller: "MyController",
          };
        });
      reloadModules();
      var el = $("<div my-directive></div>");
      $compile(el)($rootScope);
      expect(gotScope).not.toBe($rootScope);
    });

    it("has isolate scope bindings available during construction", () => {
      var gotMyAttr;
      function MyController($scope) {
        gotMyAttr = $scope.myAttr;
      }
      myModule
        .controller("MyController", MyController)
        .directive("myDirective", () => {
          return {
            scope: {
              myAttr: "@myDirective",
            },
            controller: "MyController",
          };
        });
      reloadModules();
      var el = $('<div my-directive="abc"></div>');
      $compile(el)($rootScope);
      expect(gotMyAttr).toEqual("abc");
    });

    it("can bind isolate scope bindings directly to self", () => {
      var ctl;
      function MyController() {
        ctl = this;
      }
      myModule
        .controller("MyController", MyController)
        .directive("myDirective", () => {
          return {
            scope: {
              myAttr: "@myDirective",
            },
            controller: "MyController",
            bindToController: true,
          };
        });
      reloadModules();
      var el = $('<div my-directive="abc"></div>');

      $compile(el)($rootScope);
      expect(ctl.myAttr).toEqual("abc");
    });

    it("can return a semi-constructed controller when using array injection", () => {
      myModule.constant("aDep", 42);
      reloadModules();
      var $controller = injector.get("$controller");

      function MyController(aDep) {
        this.aDep = aDep;
        this.constructed = true;
      }

      var controller = $controller(["aDep", MyController], null, true);
      expect(controller.constructed).toBeUndefined();
      var actualController = controller();
      expect(actualController.constructed).toBeDefined();
      expect(actualController.aDep).toBe(42);
    });

    it("can bind iso scope bindings through bindToController", () => {
      var ctl;
      function MyController() {
        ctl = this;
      }
      myModule
        .controller("MyController", MyController)
        .directive("myDirective", () => {
          return {
            scope: {},
            controller: "MyController",
            bindToController: {
              myAttr: "@myDirective",
            },
          };
        });
      reloadModules();
      var el = $('<div my-directive="abc"></div>');
      $compile(el)($rootScope);
      expect(ctl.myAttr).toEqual("abc");
    });

    it("can bind through bindToController without iso scope", () => {
      var ctl;
      function MyController() {
        ctl = this;
      }
      myModule
        .controller("MyController", MyController)
        .directive("myDirective", () => {
          return {
            scope: true,
            controller: "MyController",
            bindToController: {
              myAttr: "@myDirective",
            },
          };
        });
      reloadModules();
      var el = $('<div my-directive="abc"></div>');
      $compile(el)($rootScope);
      expect(ctl.myAttr).toEqual("abc");
    });

    it("can be required from a sibling directive", () => {
      function MyController() {}
      var gotMyController;
      myModule
        .directive("myDirective", () => {
          return {
            scope: {},
            controller: MyController,
          };
        })
        .directive("myOtherDirective", () => {
          return {
            require: "myDirective",
            link: function (scope, element, attrs, myController) {
              gotMyController = myController;
            },
          };
        });
      reloadModules();
      var el = $("<div my-directive my-other-directive></div>");
      $compile(el)($rootScope);
      expect(gotMyController).toBeDefined();
      expect(gotMyController instanceof MyController).toBe(true);
    });

    it("can be required from multiple sibling directives", () => {
      function MyController() {}
      function MyOtherController() {}
      var gotControllers;
      myModule
        .directive("myDirective", () => {
          return {
            scope: true,
            controller: MyController,
          };
        })
        .directive("myOtherDirective", () => {
          return {
            scope: true,
            controller: MyOtherController,
          };
        })
        .directive("myThirdDirective", () => {
          return {
            require: ["myDirective", "myOtherDirective"],
            link: function (scope, element, attrs, controllers) {
              gotControllers = controllers;
            },
          };
        });
      reloadModules();
      var el = $(
        "<div my-directive my-other-directive my-third-directive></div>",
      );
      $compile(el)($rootScope);
      expect(gotControllers).toBeDefined();
      expect(gotControllers.length).toBe(2);
      expect(gotControllers[0] instanceof MyController).toBe(true);
      expect(gotControllers[1] instanceof MyOtherController).toBe(true);
    });

    it("can be required as an object", () => {
      function MyController() {}
      function MyOtherController() {}
      var gotControllers;
      myModule
        .directive("myDirective", () => {
          return {
            scope: true,
            controller: MyController,
          };
        })
        .directive("myOtherDirective", () => {
          return {
            scope: true,
            controller: MyOtherController,
          };
        })
        .directive("myThirdDirective", () => {
          return {
            require: {
              myDirective: "myDirective",
              myOtherDirective: "myOtherDirective",
            },
            link: function (scope, element, attrs, controllers) {
              gotControllers = controllers;
            },
          };
        });
      reloadModules();
      var el = $(
        "<div my-directive my-other-directive my-third-directive></div>",
      );
      $compile(el)($rootScope);
      expect(gotControllers).toBeDefined();
      expect(gotControllers.myDirective instanceof MyController).toBe(true);
      expect(gotControllers.myOtherDirective instanceof MyOtherController).toBe(
        true,
      );
    });

    it("can be required as an object with values omitted", () => {
      function MyController() {}
      var gotControllers;
      myModule
        .directive("myDirective", () => {
          return {
            scope: true,
            controller: MyController,
          };
        })
        .directive("myOtherDirective", () => {
          return {
            require: {
              myDirective: "",
            },
            link: function (scope, element, attrs, controllers) {
              gotControllers = controllers;
            },
          };
        });
      reloadModules();
      var el = $(
        "<div my-directive my-other-directive my-third-directive></div>",
      );
      $compile(el)($rootScope);
      expect(gotControllers).toBeDefined();
      expect(gotControllers.myDirective instanceof MyController).toBe(true);
    });

    it("requires itself if there is no explicit require", () => {
      function MyController() {}
      var gotMyController;
      myModule.directive("myDirective", () => {
        return {
          scope: {},
          controller: MyController,
          link: function (scope, element, attrs, myController) {
            gotMyController = myController;
          },
        };
      });
      reloadModules();
      var el = $("<div my-directive></div>");
      $compile(el)($rootScope);
      expect(gotMyController).toBeDefined();
      expect(gotMyController instanceof MyController).toBe(true);
    });

    it("is passed through grouped link wrapper", () => {
      function MyController() {}
      var gotMyController;
      myModule.directive("myDirective", () => {
        return {
          multiElement: true,
          scope: {},
          controller: MyController,
          link: function (scope, element, attrs, myController) {
            gotMyController = myController;
          },
        };
      });
      reloadModules();
      var el = $("<div my-directive-start></div><div my-directive-end></div>");
      $compile(el)($rootScope);
      expect(gotMyController).toBeDefined();
      expect(gotMyController instanceof MyController).toBe(true);
    });

    it("can be required from a parent directive", () => {
      function MyController() {}
      var gotMyController;
      myModule
        .directive("myDirective", () => {
          return {
            scope: {},
            controller: MyController,
          };
        })
        .directive("myOtherDirective", () => {
          return {
            require: "^myDirective",
            link: function (scope, element, attrs, myController) {
              gotMyController = myController;
            },
          };
        });
      reloadModules();
      var el = $("<div my-directive><div my-other-directive></div></div>");
      $compile(el)($rootScope);
      expect(gotMyController).toBeDefined();
      expect(gotMyController instanceof MyController).toBe(true);
    });

    it("also finds from sibling directive when requiring with parent prefix", () => {
      function MyController() {}
      var gotMyController;
      myModule
        .directive("myDirective", () => {
          return {
            scope: {},
            controller: MyController,
          };
        })
        .directive("myOtherDirective", () => {
          return {
            require: "^myDirective",
            link: function (scope, element, attrs, myController) {
              gotMyController = myController;
            },
          };
        });
      reloadModules();
      var el = $("<div my-directive my-other-directive></div>");
      $compile(el)($rootScope);
      expect(gotMyController).toBeDefined();
      expect(gotMyController instanceof MyController).toBe(true);
    });

    it("can be required from a parent directive with ^^", () => {
      function MyController() {}
      var gotMyController;
      myModule
        .directive("myDirective", () => {
          return {
            scope: {},
            controller: MyController,
          };
        })
        .directive("myOtherDirective", () => {
          return {
            require: "^^myDirective",
            link: function (scope, element, attrs, myController) {
              gotMyController = myController;
            },
          };
        });
      reloadModules();
      var el = $("<div my-directive><div my-other-directive></div></div>");
      $compile(el)($rootScope);
      expect(gotMyController).toBeDefined();
      expect(gotMyController instanceof MyController).toBe(true);
    });

    it("does not find from sibling directive when requiring with ^^", () => {
      function MyController() {}
      myModule
        .directive("myDirective", () => {
          return {
            scope: {},
            controller: MyController,
          };
        })
        .directive("myOtherDirective", () => {
          return {
            require: "^^myDirective",
            link: function (scope, element, attrs, myController) {},
          };
        });
      reloadModules();
      var el = $("<div my-directive my-other-directive></div>");
      expect(() => {
        $compile(el)($rootScope);
      }).toThrowError();
    });

    it("can be required from parent in object form", () => {
      function MyController() {}
      var gotControllers;
      myModule
        .directive("myDirective", () => {
          return {
            scope: {},
            controller: MyController,
          };
        })
        .directive("myOtherDirective", () => {
          return {
            require: {
              myDirective: "^",
            },
            link: function (scope, element, attrs, controllers) {
              gotControllers = controllers;
            },
          };
        });
      reloadModules();
      var el = $("<div my-directive><div my-other-directive></div></div>");
      $compile(el)($rootScope);
      expect(gotControllers.myDirective instanceof MyController).toBe(true);
    });

    it("does not throw on required missing controller when optional", () => {
      var gotCtrl;
      myModule.directive("myDirective", () => {
        return {
          require: "?noSuchDirective",
          link: function (scope, element, attrs, ctrl) {
            gotCtrl = ctrl;
          },
        };
      });
      reloadModules();
      var el = $("<div my-directive></div>");
      $compile(el)($rootScope);
      expect(gotCtrl).toBe(null);
    });

    it("allows optional marker after parent marker", () => {
      var gotCtrl;
      myModule.directive("myDirective", () => {
        return {
          require: "^?noSuchDirective",
          link: function (scope, element, attrs, ctrl) {
            gotCtrl = ctrl;
          },
        };
      });
      reloadModules();
      var el = $("<div my-directive></div>");
      $compile(el)($rootScope);
      expect(gotCtrl).toBe(null);
    });

    it("allows optional marker before parent marker", () => {
      function MyController() {}
      var gotMyController;
      myModule
        .directive("myDirective", () => {
          return {
            scope: {},
            controller: MyController,
          };
        })
        .directive("myOtherDirective", () => {
          return {
            require: "?^myDirective",
            link: function (scope, element, attrs, ctrl) {
              gotMyController = ctrl;
            },
          };
        });
      reloadModules();
      var el = $("<div my-directive my-other-directive></div>");
      $compile(el)($rootScope);
      expect(gotMyController).toBeDefined();
      expect(gotMyController instanceof MyController).toBe(true);
    });

    it("attaches required controllers on controller when using object", () => {
      function MyController() {}
      var ctl;
      myModule
        .directive("myDirective", () => {
          return {
            scope: {},
            controller: MyController,
          };
        })
        .directive("myOtherDirective", () => {
          return {
            require: {
              myDirective: "^",
            },
            bindToController: true,
            controller: function () {
              ctl = this;
            },
          };
        });
      reloadModules();

      $compile("<div my-directive><div my-other-directive></div></div>")(
        $rootScope,
      );
      expect(ctl.myDirective instanceof MyController).toBeTrue();
    });
  });

  describe("template", () => {
    it("populates an element during compilation", () => {
      registerDirectives("myDirective", () => {
        return {
          template: '<div class="from-template"></div>',
        };
      });
      reloadModules();
      var el = $("<div my-directive></div>");
      $compile(el);
      expect(el.html()).toBe('<div class="from-template"></div>');
    });

    it("replaces any existing children", () => {
      registerDirectives("myDirective", () => {
        return {
          template: '<div class="from-template"></div>',
        };
      });
      reloadModules();
      var el = $('<div my-directive><div class="existing"></div></div>');
      $compile(el);
      expect(el.html()).toBe('<div class="from-template"></div>');
    });

    it("compiles template contents also", () => {
      var compileSpy = jasmine.createSpy();
      registerDirectives({
        myDirective: () => {
          return {
            template: "<div my-other-directive></div>",
          };
        },
        myOtherDirective: () => {
          return {
            compile: compileSpy,
          };
        },
      });
      reloadModules();
      var el = $("<div my-directive></div>");
      $compile(el);
      expect(compileSpy).toHaveBeenCalled();
    });

    it("does not allow two directives with templates", () => {
      registerDirectives({
        myDirective: () => {
          return { template: "<div></div>" };
        },
        myOtherDirective: () => {
          return { template: "<div></div>" };
        },
      });
      reloadModules();
      var el = $("<div my-directive my-other-directive></div>");
      expect(() => {
        $compile(el);
      }).toThrowError();
    });

    it("supports functions as template values", () => {
      var templateSpy = jasmine
        .createSpy()
        .and.returnValue('<div class="from-template"></div>');
      registerDirectives({
        myDirective: () => {
          return {
            template: templateSpy,
          };
        },
      });
      reloadModules();
      var el = $("<div my-directive></div>");
      $compile(el);
      expect(el.html()).toBe('<div class="from-template"></div>');
      expect(templateSpy.calls.first().args[0][0]).toBe(el[0]);
      expect(templateSpy.calls.first().args[1].myDirective).toBeDefined();
    });

    it("uses isolate scope for template contents", () => {
      var linkSpy = jasmine.createSpy();
      registerDirectives({
        myDirective: () => {
          return {
            scope: {
              isoValue: "=myDirective",
            },
            template: "<div my-other-directive></div>",
          };
        },
        myOtherDirective: () => {
          return { link: linkSpy };
        },
      });
      reloadModules();
      var el = $('<div my-directive="42"></div>');
      $compile(el)($rootScope);
      expect(linkSpy.calls.first().args[0]).not.toBe($rootScope);
      expect(linkSpy.calls.first().args[0].isoValue).toBe(42);
    });
  });

  describe("templateUrl", () => {
    it("defers remaining directive compilation", () => {
      var otherCompileSpy = jasmine.createSpy();
      registerDirectives({
        myDirective: () => {
          return { templateUrl: "/my_directive.html" };
        },
        myOtherDirective: () => {
          return { compile: otherCompileSpy };
        },
      });
      reloadModules();
      var el = $("<div my-directive my-other-directive></div>");
      $compile(el);
      expect(otherCompileSpy).not.toHaveBeenCalled();
    });

    it("defers current directive compilation", () => {
      var compileSpy = jasmine.createSpy();
      registerDirectives({
        myDirective: () => {
          return {
            templateUrl: "/public/my_directive.html",
            compile: compileSpy,
          };
        },
      });
      reloadModules();
      var el = $("<div my-directive></div>");
      $compile(el);
      expect(compileSpy).not.toHaveBeenCalled();
    });

    it("immediately empties out the element", () => {
      registerDirectives({
        myDirective: () => {
          return { templateUrl: "/my_directive.html" };
        },
      });
      reloadModules();
      var el = $("<div my-directive>Hello</div>");
      $compile(el);
      expect(el.html()).toBe("");
    });

    it("populates element with template", (done) => {
      registerDirectives({
        myDirective: () => {
          return { templateUrl: "/public/my_directive.html" };
        },
      });
      reloadModules();
      var el = $("<div my-directive></div>");
      $compile(el);
      $rootScope.$apply();
      setTimeout(() => {
        expect(el.find("div").length).toBe(1);
        done();
      }, 100);
    });

    it("resumes current directive compilation after template received", (done) => {
      var compileSpy = jasmine.createSpy();
      registerDirectives({
        myDirective: () => {
          return {
            templateUrl: "/public/my_directive.html",
            compile: compileSpy,
          };
        },
      });
      reloadModules();
      var el = $("<div my-directive></div>");

      $compile(el);
      $rootScope.$apply();
      setTimeout(() => {
        expect(compileSpy).toHaveBeenCalled();
        done();
      }, 100);
    });

    it("resumes remaining directive compilation after template received", (done) => {
      var otherCompileSpy = jasmine.createSpy();
      registerDirectives({
        myDirective: () => {
          return { templateUrl: "/public/my_directive.html" };
        },
        myOtherDirective: () => {
          return { compile: otherCompileSpy };
        },
      });
      reloadModules();
      var el = $("<div my-directive my-other-directive></div>");

      $compile(el);
      $rootScope.$apply();

      setTimeout(() => {
        expect(otherCompileSpy).toHaveBeenCalled();
        done();
      }, 100);
    });

    it("resumes child compilation after template received", (done) => {
      var otherCompileSpy = jasmine.createSpy();
      registerDirectives({
        myDirective: () => {
          return { templateUrl: "/public/my_other_directive.html" };
        },
        myOtherDirective: () => {
          return { compile: otherCompileSpy };
        },
      });
      reloadModules();
      var el = $("<div my-directive></div>");

      $compile(el);
      $rootScope.$apply();

      setTimeout(() => {
        expect(otherCompileSpy).toHaveBeenCalled();
        done();
      }, 10);
    });

    it("supports functions as values", () => {
      var templateUrlSpy = jasmine
        .createSpy()
        .and.returnValue("/public/my_directive.html");
      registerDirectives({
        myDirective: () => {
          return {
            templateUrl: templateUrlSpy,
          };
        },
      });
      reloadModules();
      var el = $("<div my-directive></div>");

      $compile(el);
      $rootScope.$apply();
      expect(templateUrlSpy.calls.first().args[0][0]).toBe(el[0]);
      expect(templateUrlSpy.calls.first().args[1].myDirective).toBeDefined();
    });

    it("does not allow templateUrl directive after template directive", () => {
      registerDirectives({
        myDirective: () => {
          return { template: "<div></div>" };
        },
        myOtherDirective: () => {
          return { templateUrl: "/public/my_other_directive.html" };
        },
      });
      reloadModules();
      var el = $("<div my-directive my-other-directive></div>");
      expect(() => {
        $compile(el);
      }).toThrowError();
    });

    it("does not allow template directive after templateUrl directive", (done) => {
      registerDirectives({
        myDirective: () => {
          return { templateUrl: "/public/my_directive.html" };
        },
        myOtherDirective: () => {
          return { template: "<div></div>" };
        },
      });
      reloadModules();
      var el = $("<div my-directive my-other-directive></div>");

      $compile(el);
      $rootScope.$apply();
      setTimeout(() => {
        expect(el.find("div").length).toBe(1);
        done();
      }, 10);
    });

    it("links the directive when public link function is invoked", (done) => {
      var linkSpy = jasmine.createSpy();
      registerDirectives({
        myDirective: () => {
          return {
            templateUrl: "/public/my_directive.html",
            link: linkSpy,
          };
        },
      });
      reloadModules();
      var el = $("<div my-directive></div>");

      var linkFunction = $compile(el);
      $rootScope.$apply();

      linkFunction($rootScope);

      setTimeout(() => {
        expect(linkSpy).toHaveBeenCalled();
        expect(linkSpy.calls.first().args[0]).toBe($rootScope);
        expect(linkSpy.calls.first().args[1][0]).toBe(el[0]);
        expect(linkSpy.calls.first().args[2].myDirective).toBeDefined();
        done();
      }, 10);
    });

    it("links child elements when public link function is invoked", (done) => {
      var linkSpy = jasmine.createSpy();
      registerDirectives({
        myDirective: () => {
          return { templateUrl: "/public/my_other_directive.html" };
        },
        myOtherDirective: () => {
          return { link: linkSpy };
        },
      });
      reloadModules();
      var el = $("<div my-directive></div>");

      var linkFunction = $compile(el);
      $rootScope.$apply();

      linkFunction($rootScope);
      setTimeout(() => {
        expect(linkSpy).toHaveBeenCalled();
        expect(linkSpy.calls.first().args[0]).toBe($rootScope);
        expect(linkSpy.calls.first().args[1][0]).toBe(el[0].firstChild);
        expect(linkSpy.calls.first().args[2].myOtherDirective).toBeDefined();
        done();
      }, 100);
    });

    it("links when template received if node link function has been invoked", (done) => {
      var linkSpy = jasmine.createSpy();
      registerDirectives({
        myDirective: () => {
          return {
            templateUrl: "/public/my_directive.html",
            link: linkSpy,
          };
        },
      });
      reloadModules();
      var el = $("<div my-directive></div>");

      var linkFunction = $compile(el)($rootScope); // link first

      $rootScope.$apply();

      setTimeout(() => {
        expect(linkSpy).toHaveBeenCalled();
        expect(linkSpy.calls.argsFor(0)[0]).toBe($rootScope);
        expect(linkSpy.calls.argsFor(0)[1][0]).toBe(el[0]);
        expect(linkSpy.calls.argsFor(0)[2].myDirective).toBeDefined();
        done();
      }, 10);
    });

    it("links directives that were compiled earlier", (done) => {
      var linkSpy = jasmine.createSpy();
      registerDirectives({
        myDirective: () => {
          return { link: linkSpy };
        },
        myOtherDirective: () => {
          return { templateUrl: "/my_directive.html" };
        },
      });
      reloadModules();
      var el = $("<div my-directive my-other-directive></div>");

      let linkFunction = $compile(el);
      $rootScope.$apply();
      linkFunction($rootScope);

      setTimeout(() => {
        expect(linkSpy).toHaveBeenCalled();
        expect(linkSpy.calls.argsFor(0)[0]).toBe($rootScope);
        expect(linkSpy.calls.argsFor(0)[1][0]).toBe(el[0]);
        expect(linkSpy.calls.argsFor(0)[2].myDirective).toBeDefined();
        done();
      }, 10);
    });

    it("retains isolate scope directives from earlier", (done) => {
      var linkSpy = jasmine.createSpy();
      registerDirectives({
        myDirective: () => {
          return {
            scope: { val: "=myDirective" },
            link: linkSpy,
          };
        },
        myOtherDirective: () => {
          return { templateUrl: "/my_directive.html" };
        },
      });
      reloadModules();
      var el = $('<div my-directive="42" my-other-directive></div>');

      var linkFunction = $compile(el);
      $rootScope.$apply();

      linkFunction($rootScope);

      setTimeout(() => {
        expect(linkSpy).toHaveBeenCalled();
        expect(linkSpy.calls.first().args[0]).toBeDefined();
        expect(linkSpy.calls.first().args[0]).not.toBe($rootScope);
        expect(linkSpy.calls.first().args[0].val).toBe(42);
        done();
      }, 10);
    });

    it("supports isolate scope directives with templateUrls", (done) => {
      var linkSpy = jasmine.createSpy();
      registerDirectives({
        myDirective: () => {
          return {
            scope: { val: "=myDirective" },
            link: linkSpy,
            templateUrl: "/public/my_directive.html",
          };
        },
      });
      reloadModules();
      var el = $('<div my-directive="42"></div>');

      $compile(el)($rootScope);
      $rootScope.$apply();

      setTimeout(() => {
        expect(linkSpy).toHaveBeenCalled();
        expect(linkSpy.calls.first().args[0]).not.toBe($rootScope);
        expect(linkSpy.calls.first().args[0].val).toBe(42);
        done();
      }, 10);
    });

    it("links children of isolate scope directives with templateUrls", (done) => {
      var linkSpy = jasmine.createSpy();
      registerDirectives({
        myDirective: () => {
          return {
            scope: { val: "=myDirective" },
            templateUrl: "/public/my_child_directive.html",
          };
        },
        myChildDirective: () => {
          return {
            link: linkSpy,
          };
        },
      });
      reloadModules();
      var el = $('<div my-directive="42"></div>');
      $compile(el)($rootScope);
      $rootScope.$apply();
      setTimeout(() => {
        expect(linkSpy).toHaveBeenCalled();
        expect(linkSpy.calls.first().args[0]).not.toBe($rootScope);
        expect(linkSpy.calls.first().args[0].val).toBe(42);
        done();
      }, 10);
    });

    it("sets up controllers for all controller directives", (done) => {
      var myDirectiveControllerInstantiated,
        myOtherDirectiveControllerInstantiated;
      registerDirectives({
        myDirective: () => {
          return {
            controller: function MyDirectiveController() {
              myDirectiveControllerInstantiated = true;
            },
          };
        },
        myOtherDirective: () => {
          return {
            templateUrl: "/public/my_directive.html",
            controller: function MyOtherDirectiveController() {
              myOtherDirectiveControllerInstantiated = true;
            },
          };
        },
      });
      reloadModules();
      var el = $("<div my-directive my-other-directive></div>");

      $compile(el)($rootScope);
      $rootScope.$apply();

      //requests[0].respond(200, {}, "<div></div>");
      setTimeout(() => {
        expect(myDirectiveControllerInstantiated).toBe(true);
        expect(myOtherDirectiveControllerInstantiated).toBe(true);
        done();
      }, 100);
    });
  });

  describe("with transclusion", () => {
    it("makes transclusion available to link fn when template arrives", (done) => {
      registerDirectives({
        myTranscluder: () => {
          return {
            transclude: true,
            templateUrl: "/public/my_directive.html",
            link: function (scope, element, attrs, ctrl, transclude) {
              element[0].firstChild.append(transclude());
            },
          };
        },
      });
      reloadModules();
      var el = $("<div my-transcluder><div in-transclude></div></div>");

      var linkFunction = $compile(el);
      $rootScope.$apply();
      linkFunction($rootScope); // then link
      setTimeout(() => {
        expect(el[0].outerHTML.match(/from-template/)).toBeTruthy();
        done();
      }, 100);
    });

    it("is only allowed once", () => {
      var otherCompileSpy = jasmine.createSpy();
      registerDirectives({
        myTranscluder: () => {
          return {
            priority: 1,
            transclude: true,
            templateUrl: "/public/my_directive.html",
          };
        },
        mySecondTranscluder: () => {
          return {
            priority: 0,
            transclude: true,
            compile: otherCompileSpy,
          };
        },
      });
      reloadModules();
      var el = $("<div my-transcluder my-second-transcluder></div>");

      $compile(el);
      $rootScope.$apply();

      expect(otherCompileSpy).not.toHaveBeenCalled();
    });
  });

  describe("transclude", () => {
    it("removes the children of the element from the DOM", () => {
      registerDirectives({
        myTranscluder: () => {
          return { transclude: true };
        },
      });
      reloadModules();
      var el = $("<div my-transcluder><div>Must go</div></div>");

      $compile(el);
      expect(el[0].innerHTML).toBe("");
    });

    it("compiles child elements", () => {
      var insideCompileSpy = jasmine.createSpy();
      registerDirectives({
        myTranscluder: () => {
          return {
            transclude: true,
            template: "<ng-transclude></ng-transclude>",
          };
        },
        insideTranscluder: () => {
          return {
            compile() {
              insideCompileSpy();
            },
          };
        },
      });
      reloadModules();
      var el = $("<div my-transcluder><div inside-transcluder></div></div>");
      $compile(el)($rootScope);
      expect(insideCompileSpy).toHaveBeenCalled();
    });

    it("makes contents available to link function", () => {
      registerDirectives({
        myTranscluder: () => {
          return {
            transclude: true,
            template: "<div in-template></div>",
            link: function (scope, element, attrs, ctrl, transclude) {
              element[0].append(transclude()[0]);
            },
          };
        },
      });
      reloadModules();
      var el = $("<div my-transcluder><div in-transcluder></div></div>");

      $compile(el)($rootScope);
      expect(el[0].outerHTML.match(/my-transcluder/)).toBeTruthy();
    });

    it("is only allowed once per element", () => {
      registerDirectives({
        myTranscluder: () => {
          return { transclude: true };
        },
        mySecondTranscluder: () => {
          return { transclude: true };
        },
      });
      reloadModules();
      var el = $("<div my-transcluder my-second-transcluder></div>");

      expect(() => {
        $compile(el);
      }).toThrowError();
    });

    it("makes scope available to link functions inside", () => {
      registerDirectives({
        myTranscluder: () => {
          return {
            transclude: true,
            link: function (scope, element, attrs, ctrl, transclude) {
              element.append(transclude());
            },
          };
        },
        myInnerDirective: () => {
          return {
            link: function (scope, element) {
              element.html(scope.anAttr);
            },
          };
        },
      });
      reloadModules();
      var el = $("<div my-transcluder><div my-inner-directive></div></div>");

      $rootScope.anAttr = "Hello from root";
      $compile(el)($rootScope);
      expect(el[0].innerHTML.match(/Hello from root/)).toBeTruthy();
    });

    it("does not use the inherited scope of the directive", () => {
      registerDirectives({
        myTranscluder: () => {
          return {
            transclude: true,
            scope: true,
            link: function (scope, element, attrs, ctrl, transclude) {
              scope.anAttr = "Shadowed attribute";
              element.append(transclude());
            },
          };
        },
        myInnerDirective: () => {
          return {
            link: function (scope, element) {
              element.html(scope.anAttr);
            },
          };
        },
      });
      reloadModules();
      var el = $("<div my-transcluder><div my-inner-directive></div></div>");

      $rootScope.anAttr = "Hello from root";
      $compile(el)($rootScope);
      expect(el[0].innerHTML.match(/Hello from root/)).toBeTruthy();
    });

    it("contents are destroyed along with transcluding directive", () => {
      var watchSpy = jasmine.createSpy();
      registerDirectives({
        myTranscluder: () => {
          return {
            transclude: true,
            scope: true,
            link: function (scope, element, attrs, ctrl, transclude) {
              element.append(transclude());
              window.scope = scope;
              scope.$on("destroyNow", () => {
                scope.$destroy();
              });
            },
          };
        },
        myInnerDirective: () => {
          return {
            link: function (scope) {
              scope.$watch(watchSpy);
            },
          };
        },
      });
      reloadModules();
      var el = $("<div my-transcluder><div my-inner-directive>TEST</div>");
      $compile(el)($rootScope);

      $rootScope.$apply();
      expect(watchSpy.calls.count()).toBe(2);

      $rootScope.$apply();
      expect(watchSpy.calls.count()).toBe(3);

      $rootScope.$broadcast("destroyNow");
      $rootScope.$apply();
      expect(watchSpy.calls.count()).toBe(3);
    });

    it("allows passing another scope to transclusion function", () => {
      var otherLinkSpy = jasmine.createSpy();
      registerDirectives({
        myTranscluder: () => {
          return {
            transclude: true,
            scope: {},
            template: "<div></div>",
            link: function (scope, element, attrs, ctrl, transclude) {
              var mySpecialScope = scope.$new(true);
              mySpecialScope.specialAttr = 42;
              transclude(mySpecialScope);
            },
          };
        },
        myOtherDirective: () => {
          return { link: otherLinkSpy };
        },
      });
      reloadModules();
      var el = $("<div my-transcluder><div my-other-directive></div></div>");

      $compile(el)($rootScope);

      var transcludedScope = otherLinkSpy.calls.first().args[0];
      expect(transcludedScope.specialAttr).toBe(42);
    });

    it("makes contents available to child elements", () => {
      registerDirectives({
        myTranscluder: () => {
          return {
            transclude: true,
            template: "<div in-template></div>",
          };
        },
        inTemplate: () => {
          return {
            link: function (scope, element, attrs, ctrl, transcludeFn) {
              element.append(transcludeFn());
            },
          };
        },
      });
      reloadModules();
      var el = $("<div my-transcluder><div in-transclude></div></div>");

      $compile(el)($rootScope);

      expect(el[0].outerHTML.match(/in-transclude/)).toBeTruthy();
    });

    it("makes contents available to indirect child elements", () => {
      registerDirectives({
        myTranscluder: () => {
          return {
            transclude: true,
            template: "<div><div in-template></div></div>",
          };
        },
        inTemplate: () => {
          return {
            link: function (scope, element, attrs, ctrl, transcludeFn) {
              element.append(transcludeFn());
            },
          };
        },
      });
      reloadModules();
      var el = $("<div my-transcluder><div in-transclude></div></div>");

      $compile(el)($rootScope);

      expect(el[0].outerHTML.match(/in-transclude/)).toBeTruthy();
    });

    it("supports passing transclusion function to public link function", () => {
      registerDirectives({
        myTranscluder: function ($compile) {
          return {
            transclude: true,
            link: function (scope, element, attrs, ctrl, transclude) {
              var customTemplate = $("<div in-custom-template></div>");
              element.append(customTemplate);
              $compile(customTemplate)(scope, undefined, {
                parentBoundTranscludeFn: transclude,
              });
            },
          };
        },
        inCustomTemplate: () => {
          return {
            link: function (scope, element, attrs, ctrl, transclude) {
              element.append(transclude());
            },
          };
        },
      });
      reloadModules();
      var el = $("<div my-transcluder><div in-transclude></div></div>");

      $compile(el)($rootScope);

      expect(el[0].outerHTML.match(/in-transclude/)).toBeTruthy();
    });

    it("destroys scope passed through public link fn at the right time", () => {
      var watchSpy = jasmine.createSpy();
      registerDirectives({
        myTranscluder: function ($compile) {
          return {
            transclude: true,
            link: function (scope, element, attrs, ctrl, transclude) {
              var customTemplate = $("<div in-custom-template></div>");
              element.append(customTemplate);
              $compile(customTemplate)(scope, undefined, {
                parentBoundTranscludeFn: transclude,
              });
            },
          };
        },
        inCustomTemplate: () => {
          return {
            scope: true,
            link: function (scope, element, attrs, ctrl, transclude) {
              element.append(transclude());
              scope.$on("destroyNow", () => {
                scope.$destroy();
              });
            },
          };
        },
        inTransclude: () => {
          return {
            link: function (scope) {
              scope.$watch(watchSpy);
            },
          };
        },
      });
      reloadModules();
      var el = $("<div my-transcluder><div in-transclude></div></div>");

      $compile(el)($rootScope);

      $rootScope.$apply();
      expect(watchSpy.calls.count()).toBe(2);

      $rootScope.$apply();
      expect(watchSpy.calls.count()).toBe(3);

      $rootScope.$broadcast("destroyNow");
      $rootScope.$apply();
      expect(watchSpy.calls.count()).toBe(3);
    });

    it("makes contents available to controller", () => {
      let transclude;
      registerDirectives({
        myTranscluder: () => {
          return {
            transclude: true,
            template: "<div ng-transclude></div>",
            controller: function ($transclude) {
              transclude = $transclude;
            },
          };
        },
      });
      reloadModules();
      var el = $("<div my-transcluder><div in-transclude></div></div>");
      $compile(el)($rootScope);

      expect(transclude()[0].outerHTML.match(/in-transclude/)).toBeTruthy();
    });

    it("can be used with multi-element directives", () => {
      registerDirectives({
        myTranscluder: function ($compile) {
          return {
            transclude: true,
            multiElement: true,
            template: "<div in-template></div>",
            link: function (scope, element, attrs, ctrl, transclude) {
              element[0].append(transclude()[0]);
            },
          };
        },
      });
      reloadModules();
      var el = $(
        "<div><div my-transcluder-start><div in-transclude></div></div><div my-transcluder-end></div></div>",
      );
      $compile(el)($rootScope);
      expect(el[0].outerHTML.match(/in-transclude/)).toBeTruthy();
    });
  });

  describe("clone attach function", () => {
    it("can be passed to public link fn", () => {
      registerDirectives({});
      reloadModules();
      var el = $("<div>Hello</div>");
      var myScope = $rootScope.$new();
      var gotEl, gotScope;

      $compile(el)(myScope, function (el, scope) {
        gotEl = el;
        gotScope = scope;
      });

      expect(gotEl[0].isEqualNode(el[0])).toBe(true);
      expect(gotScope).toBe(myScope);
    });

    it("causes compiled elements to be cloned", () => {
      registerDirectives({});
      reloadModules();
      var el = $("<div>Hello</div>");
      var myScope = $rootScope.$new();
      var gotClonedEl;

      $compile(el)(myScope, function (clonedEl) {
        gotClonedEl = clonedEl;
      });

      expect(gotClonedEl[0].isEqualNode(el[0])).toBe(true);
      expect(gotClonedEl[0]).not.toBe(el[0]);
    });

    it("causes cloned DOM to be linked", () => {
      var gotCompileEl, gotLinkEl;
      registerDirectives({
        myDirective: () => {
          return {
            compile: function (compileEl) {
              gotCompileEl = compileEl;
              return function link(scope, linkEl) {
                gotLinkEl = linkEl;
              };
            },
          };
        },
      });
      reloadModules();
      var el = $("<div my-directive></div>");
      var myScope = $rootScope.$new();

      $compile(el)(myScope, () => {});

      expect(gotCompileEl[0]).not.toBe(gotLinkEl[0]);
    });

    it("allows connecting transcluded content", () => {
      registerDirectives({
        myTranscluder: () => {
          return {
            transclude: true,
            template: "<div in-template></div>",
            link: function (scope, element, attrs, ctrl, transcludeFn) {
              var myScope = scope.$new();
              transcludeFn(myScope, function (transclNode) {
                element[0].append(transclNode[0]);
              });
            },
          };
        },
      });
      reloadModules();
      var el = $("<div my-transcluder><div in-transclude></div></div>");

      $compile(el)($rootScope);
      expect(el[0].outerHTML.match(/in-transclude/)).toBeTruthy();
    });

    it("can be used with default transclusion scope", () => {
      registerDirectives({
        myTranscluder: () => {
          return {
            transclude: true,
            template: "<div in-template></div>",
            link: function (scope, element, attrs, ctrl, transcludeFn) {
              transcludeFn(function (transclNode) {
                element[0].append(transclNode[0]);
              });
            },
          };
        },
      });
      reloadModules();
      var el = $("<div my-transcluder><div in-transclusion></div></div>");

      $compile(el)($rootScope);
      expect(el[0].outerHTML.match(/in-transclusion/)).toBeTruthy();
    });

    it("allows passing data to transclusion", () => {
      registerDirectives({
        myTranscluder: () => {
          return {
            transclude: true,
            template: "<div in-template></div>",
            link: function (scope, element, attrs, ctrl, transcludeFn) {
              transcludeFn(function (transclNode, transclScope) {
                transclScope.dataFromTranscluder = "Hello from transcluder";
                element[0].append(transclNode[0]);
              });
            },
          };
        },
        myOtherDirective: () => {
          return {
            link: function (scope, element) {
              element.html(scope.dataFromTranscluder);
            },
          };
        },
      });
      reloadModules();
      var el = $("<div my-transcluder><div my-other-directive></div></div>");

      $compile(el)($rootScope);
      expect(el[0].outerHTML.match(/Hello from transcluder/)).toBeTruthy();
    });
  });

  describe("element transclusion", () => {
    it("removes the element from the DOM", () => {
      registerDirectives({
        myTranscluder: () => {
          return {
            transclude: "element",
          };
        },
      });
      reloadModules();
      var el = $("<div><div my-transcluder></div></div>");

      $compile(el);
      expect(el[0].innerText).toBe("");
    });

    it("replaces the element with a comment", () => {
      registerDirectives({
        myTranscluder: () => {
          return {
            transclude: "element",
          };
        },
      });
      reloadModules();
      var el = $("<div><div my-transcluder></div></div>");

      $compile(el);

      expect(el[0].innerHTML).toEqual("<!---->");
    });

    it("includes directive attribute value in comment", () => {
      registerDirectives({
        myTranscluder: () => {
          return { transclude: "element" };
        },
      });
      reloadModules();
      var el = $("<div><div my-transcluder=42></div></div>");

      $compile(el);

      expect(el[0].innerHTML).toEqual("<!---->");
    });

    it("calls directive compile and link with comment", () => {
      var gotCompiledEl, gotLinkedEl;
      registerDirectives({
        myTranscluder: () => {
          return {
            transclude: "element",
            compile: function (compiledEl) {
              gotCompiledEl = compiledEl;
              return function (scope, linkedEl) {
                gotLinkedEl = linkedEl;
              };
            },
          };
        },
      });
      reloadModules();
      var el = $("<div><div my-transcluder></div></div>");

      $compile(el)($rootScope);

      expect(gotCompiledEl[0].nodeType).toBe(Node.COMMENT_NODE);
      expect(gotLinkedEl[0].nodeType).toBe(Node.COMMENT_NODE);
    });

    it("calls lower priority compile with original", () => {
      var gotCompiledEl;
      registerDirectives({
        myTranscluder: () => {
          return {
            priority: 2,
            transclude: true,
            compile: function (compiledEl) {
              gotCompiledEl = compiledEl;
            },
          };
        },
        myOtherDirective: () => {
          return {
            priority: 1,
            compile: function (compiledEl) {
              gotCompiledEl = compiledEl;
            },
          };
        },
      });
      reloadModules();
      var el = $("<div my-other-directive my-transcluder></div>");

      $compile(el);
      expect(gotCompiledEl[0].nodeType).toBe(Node.ELEMENT_NODE);
    });

    it("calls compile on child element directives", () => {
      var compileSpy = jasmine.createSpy();
      registerDirectives({
        myTranscluder: () => {
          return {
            transclude: true,
            template: "<div ng-transclude></div>",
          };
        },
        myOtherDirective: () => {
          return {
            compile: compileSpy,
          };
        },
      });
      reloadModules();
      var el = $(
        "<div><div my-transcluder><div my-other-directive></div></div></div>",
      );
      $compile(el)($rootScope);

      expect(compileSpy).toHaveBeenCalled();
    });

    it("compiles original element contents once", () => {
      var compileSpy = jasmine.createSpy();
      registerDirectives({
        myTranscluder: () => {
          return { transclude: true, template: "<div ng-transclude></div>" };
        },
        myOtherDirective: () => {
          return {
            compile: compileSpy,
          };
        },
      });
      reloadModules();
      var el = $(
        "<div><div my-transcluder><div my-other-directive></div></div></div>",
      );

      $compile(el)($rootScope);

      expect(compileSpy.calls.count()).toBe(1);
    });

    it("makes original element available for transclusion", () => {
      registerDirectives({
        myDouble: () => {
          return {
            transclude: true,
            template: "<div ng-transclude></div>",
            link: function (scope, el, attrs, ctrl, transclude) {
              transclude(function (clone) {
                el.after(clone);
              });
              transclude(function (clone) {
                el.after(clone);
              });
            },
          };
        },
      });
      reloadModules();
      var el = $("<div><div my-double>Hello</div>");

      $compile(el)($rootScope);
      expect(el.text()).toBe("HelloHelloHello");
    });

    it("sets directive attributes element to comment", () => {
      registerDirectives({
        myTranscluder: () => {
          return {
            transclude: "element",
            link: function (scope, element, attrs, ctrl, transclude) {
              attrs.$set("testing", "42");
              element.after(transclude());
            },
          };
        },
      });
      reloadModules();
      var el = $("<div><div my-transcluder></div></div>");

      $compile(el)($rootScope);

      expect(el.find("[my-transcluder]").attr("testing")).toBeUndefined();
    });

    it("supports requiring controllers", () => {
      var MyController = function () {};
      var gotCtrl;
      registerDirectives({
        myCtrlDirective: () => {
          return { controller: MyController };
        },
        myTranscluder: () => {
          return {
            transclude: "element",
            link: function (scope, el, attrs, ctrl, transclude) {
              el.after(transclude());
            },
          };
        },
        myOtherDirective: () => {
          return {
            require: "^myCtrlDirective",
            link: function (scope, el, attrs, ctrl, transclude) {
              gotCtrl = ctrl;
            },
          };
        },
      });
      reloadModules();
      var el = $(
        "<div><div my-ctrl-directive my-transcluder><div my-other-directive>Hello</div></div>",
      );

      $compile(el)($rootScope);

      expect(gotCtrl).toBeDefined();
      expect(gotCtrl instanceof MyController).toBe(true);
    });
  });

  describe("interpolation", () => {
    it("is done for text nodes", () => {
      registerDirectives({});
      reloadModules();
      var el = $("<div>My expression: {{myExpr}}</div>");
      $compile(el)($rootScope);

      $rootScope.$apply();
      expect(el.html()).toEqual("My expression: ");

      $rootScope.myExpr = "Hello";
      $rootScope.$apply();
      expect(el.html()).toEqual("My expression: Hello");
    });

    it("is done for attributes", () => {
      registerDirectives({});
      reloadModules();
      var el = $('<img alt="{{myAltText}}">');
      $compile(el)($rootScope);

      $rootScope.$apply();
      expect(el.attr("alt")).toEqual("");

      $rootScope.myAltText = "My favourite photo";
      $rootScope.$apply();
      expect(el.attr("alt")).toEqual("My favourite photo");
    });

    it("fires observers on attribute expression changes", () => {
      var observerSpy = jasmine.createSpy();
      registerDirectives({
        myDirective: () => {
          return {
            link: function (scope, element, attrs) {
              attrs.$observe("alt", observerSpy);
            },
          };
        },
      });
      reloadModules();
      var el = $('<img alt="{{myAltText}}" my-directive>');
      $compile(el)($rootScope);

      $rootScope.myAltText = "My favourite photo";
      $rootScope.$apply();
      expect(observerSpy.calls.mostRecent().args[0]).toEqual(
        "My favourite photo",
      );
    });

    it("fires observers just once upon registration", () => {
      var observerSpy = jasmine.createSpy();
      registerDirectives({
        myDirective: () => {
          return {
            link: function (scope, element, attrs) {
              attrs.$observe("alt", observerSpy);
            },
          };
        },
      });
      reloadModules();
      var el = $('<img alt="{{myAltText}}" my-directive>');
      $compile(el)($rootScope);
      $rootScope.$apply();

      expect(observerSpy.calls.count()).toBe(1);
    });

    it("is done for attributes by the time other directive is linked", () => {
      var gotMyAttr;
      registerDirectives({
        myDirective: () => {
          return {
            link: function (scope, element, attrs) {
              gotMyAttr = attrs.myAttr;
            },
          };
        },
      });
      reloadModules();
      var el = $('<div my-directive my-attr="{{myExpr}}"></div>');
      $rootScope.myExpr = "Hello";
      $compile(el)($rootScope);

      expect(gotMyAttr).toEqual("Hello");
    });

    it("is done for attributes by the time bound to iso scope", () => {
      var gotMyAttr;
      registerDirectives({
        myDirective: () => {
          return {
            scope: { myAttr: "@" },
            link: function (scope, element, attrs) {
              gotMyAttr = scope.myAttr;
            },
          };
        },
      });
      reloadModules();
      var el = $('<div my-directive my-attr="{{myExpr}}"></div>');
      $rootScope.myExpr = "Hello";
      $compile(el)($rootScope);

      expect(gotMyAttr).toEqual("Hello");
    });

    it("is done for attributes so that changes during compile are reflected", () => {
      registerDirectives({
        myDirective: () => {
          return {
            compile: function (element, attrs) {
              attrs.$set("myAttr", "{{myDifferentExpr}}");
            },
          };
        },
      });
      reloadModules();
      var el = $('<div my-directive my-attr="{{myExpr}}"></div>');
      $rootScope.myExpr = "Hello";
      $rootScope.myDifferentExpr = "Other Hello";
      $compile(el)($rootScope);
      $rootScope.$apply();

      expect(el.attr("my-attr")).toEqual("Other Hello");
    });

    it("is done for attributes so that removal during compile is reflected", () => {
      registerDirectives({
        myDirective: () => {
          return {
            compile: function (element, attrs) {
              attrs.$set("myAttr", null);
            },
          };
        },
      });
      reloadModules();
      var el = $('<div my-directive my-attr="{{myExpr}}"></div>');
      $rootScope.myExpr = "Hello";
      $compile(el)($rootScope);
      $rootScope.$apply();

      expect(el.attr("my-attr")).toBeFalsy();
    });

    it("cannot be done for event handler attributes", () => {
      registerDirectives({});
      reloadModules();
      $rootScope.myFunction = () => {};
      var el = $('<button onclick="{{myFunction()}}"></button>');
      expect(() => {
        $compile(el)($rootScope);
      }).toThrowError();
    });

    it("denormalizes directive templates", () => {
      createInjector([
        "ng",
        function ($interpolateProvider, $compileProvider) {
          $interpolateProvider.startSymbol("[[").endSymbol("]]");
          $compileProvider.directive("myDirective", () => {
            return {
              template: "Value is {{myExpr}}",
            };
          });
        },
      ]).invoke(function ($compile, $rootScope) {
        var el = $("<div my-directive></div>");
        $rootScope.myExpr = 42;
        $compile(el)($rootScope);
        $rootScope.$apply();

        expect(el.html()).toEqual("Value is 42");
      });
    });
  });

  describe("components", () => {
    it("can be registered and become directives", () => {
      myModule.component("myComponent", {});
      var injector = createInjector(["ng", "myModule"]);
      expect(injector.has("myComponentDirective")).toBe(true);
    });

    it("are element directives with controllers", () => {
      var controllerInstantiated = false;
      var componentElement;
      myModule.component("myComponent", {
        controller: function ($element) {
          controllerInstantiated = true;
          componentElement = $element;
        },
        template: "<div></div>",
      });

      reloadModules();
      var el = $("<my-component></my-component>");
      $compile(el)($rootScope);

      expect(controllerInstantiated).toBe(true);
      expect(el[0]).toBe(componentElement[0]);
    });

    it("cannot be applied to an attribute", () => {
      var controllerInstantiated = false;
      registerComponent("myComponent", {
        restrict: "A", // Will be ignored
        controller: () => {
          controllerInstantiated = true;
        },
      });
      reloadModules();
      var el = $("<div my-component></div>");
      $compile(el)($rootScope);
      expect(controllerInstantiated).toBe(false);
    });

    it("has an isolate scope", () => {
      var componentScope;
      myModule.component("myComponent", {
        controller: function ($scope) {
          componentScope = $scope;
        },
      });
      reloadModules();
      var el = $("<my-component></my-component>");
      $compile(el)($rootScope);
      expect(componentScope).not.toBe($rootScope);
      expect(componentScope.$parent).toBe($rootScope);
      expect(Object.getPrototypeOf(componentScope)).not.toBe($rootScope);
    });

    it("may have bindings which are attached to controller", () => {
      var controllerInstance;
      myModule.component("myComponent", {
        bindings: {
          attr: "@",
          oneWay: "<",
          twoWay: "=",
        },
        controller: function () {
          controllerInstance = this;
        },
      });
      reloadModules();
      $rootScope.b = 42;
      $rootScope.c = 43;
      var el = $(
        '<my-component attr="a", one-way="b", two-way="c"></my-component>',
      );
      $compile(el)($rootScope);

      expect(controllerInstance.attr).toEqual("a");
      expect(controllerInstance.oneWay).toEqual(42);
      expect(controllerInstance.twoWay).toEqual(43);
    });

    it("may use a controller alias with controllerAs", () => {
      var componentScope;
      var controllerInstance;
      myModule.component("myComponent", {
        controller: function ($scope) {
          componentScope = $scope;
          controllerInstance = this;
        },
        controllerAs: "myComponentController",
      });
      reloadModules();
      var el = $("<my-component></my-component>");
      $compile(el)($rootScope);
      expect(componentScope.myComponentController).toBe(controllerInstance);
    });

    it('may use a controller alias with "controller as" syntax', () => {
      var componentScope;
      var controllerInstance;
      myModule
        .controller("MyController", function ($scope) {
          componentScope = $scope;
          controllerInstance = this;
        })
        .component("myComponent", {
          controller: "MyController as myComponentController",
        });
      reloadModules();
      var el = $("<my-component></my-component");
      $compile(el)($rootScope);
      expect(componentScope.myComponentController).toBe(controllerInstance);
    });

    it("has a default controller alias of $ctrl", () => {
      var componentScope;
      var controllerInstance;
      myModule.component("myComponent", {
        controller: function ($scope) {
          componentScope = $scope;
          controllerInstance = this;
        },
      });
      reloadModules();
      var el = $("<my-component></my-component>");
      $compile(el)($rootScope);
      expect(componentScope.$ctrl).toBe(controllerInstance);
    });

    it("may have a template", () => {
      myModule.component("myComponent", {
        controller: function () {
          this.message = "Hello from component";
        },
        template: "{{ $ctrl.message }}",
      });
      reloadModules();
      var el = $("<my-component></my-component>");
      $compile(el)($rootScope);
      $rootScope.$apply();
      expect(el.text()).toEqual("Hello from component");
    });

    it("may have a templateUrl", (done) => {
      myModule.component("myComponent", {
        controller: function () {
          this.message = "Hello from component";
        },
        templateUrl: "/my_component.html",
      });
      reloadModules();
      $templateCache.set("/my_component.html", "{{ $ctrl.message }}");
      var el = $("<my-component></my-component>");
      $compile(el)($rootScope);
      $rootScope.$apply();
      setTimeout(() => {
        expect(el.text()).toEqual("Hello from component");
        done();
      }, 100);
    });

    it("may have a template function with DI support", () => {
      myModule.constant("myConstant", 42).component("myComponent", {
        template: function (myConstant) {
          return "" + myConstant;
        },
      });
      reloadModules();
      var el = $("<my-component></my-component>");
      $compile(el)($rootScope);
      expect(el.text()).toEqual("42");
    });

    it("may have a template function with array-wrapped DI", () => {
      myModule.constant("myConstant", 42).component("myComponent", {
        template: [
          "myConstant",
          function (c) {
            return "" + c;
          },
        ],
      });
      reloadModules();
      var el = $("<my-component></my-component>");
      $compile(el)($rootScope);
      expect(el.text()).toEqual("42");
    });

    it("may inject $element and $attrs to template function", () => {
      myModule.component("myComponent", {
        template: function ($element, $attrs) {
          return $element.attr("copiedAttr", $attrs.myAttr);
        },
      });
      reloadModules();
      var el = $('<my-component my-attr="42"></my-component>');
      $compile(el)($rootScope);
      expect(el.attr("copiedAttr")).toEqual("42");
    });

    it("may have a template function with DI support", () => {
      myModule.constant("myConstant", 42).component("myComponent", {
        templateUrl: function (myConstant) {
          return "/template" + myConstant + ".html";
        },
      });
      $templateCache.set("/template42.html", "{{ 1 + 1 }}");
      reloadModules();
      var el = $("<my-component></my-component>");
      $compile(el)($rootScope);
      $rootScope.$apply();
      expect(el.text()).toEqual("2");
    });

    it("may use transclusion", () => {
      myModule.component("myComponent", {
        transclude: true,
        template: "<div ng-transclude></div>",
      });
      reloadModules();
      var el = $("<my-component>Transclude me</my-component>");
      $compile(el)($rootScope);
      expect(el.find("div").text()).toEqual("Transclude me");
    });

    it("may require other directive controllers", () => {
      var secondControllerInstance;
      myModule
        .component("first", {
          controller: () => {},
        })
        .component("second", {
          require: { first: "^" },
          controller: function () {
            secondControllerInstance = this;
          },
        });
      reloadModules();
      var el = $("<first><second></second></first>");
      $compile(el)($rootScope);
      expect(secondControllerInstance.first).toBeDefined();
    });
  });

  describe("lifecycle", () => {
    it("calls $onInit after all ctrls created before linking", () => {
      var invocations = [];
      myModule
        .component("first", {
          controller: function () {
            invocations.push("first controller created");
            this.$onInit = () => {
              invocations.push("first controller $onInit");
            };
          },
        })
        .directive("second", () => {
          return {
            controller: function () {
              invocations.push("second controller created");
              this.$onInit = () => {
                invocations.push("second controller $onInit");
              };
            },
            link: {
              pre: () => {
                invocations.push("second prelink");
              },
              post: () => {
                invocations.push("second postlink");
              },
            },
          };
        });

      reloadModules();
      var el = $("<first second></first>");
      $compile(el)($rootScope);
      expect(invocations).toEqual([
        "first controller created",
        "second controller created",
        "first controller $onInit",
        "second controller $onInit",
        "second prelink",
        "second postlink",
      ]);
    });

    it("calls $onDestroy when the scope is destroyed", () => {
      var destroySpy = jasmine.createSpy();
      myModule.component("myComponent", {
        controller: function () {
          this.$onDestroy = destroySpy;
        },
      });
      reloadModules();
      var el = $("<my-component></my-component>");
      $compile(el)($rootScope);
      $rootScope.$destroy();
      expect(destroySpy).toHaveBeenCalled();
    });

    it("calls $postLink after all linking is done", () => {
      var invocations = [];
      myModule
        .component("first", {
          controller: function () {
            this.$postLink = () => {
              invocations.push("first controller $postLink");
            };
          },
        })
        .directive("second", () => {
          return {
            controller: function () {
              this.$postLink = () => {
                invocations.push("second controller $postLink");
              };
            },
            link: () => {
              invocations.push("second postlink");
            },
          };
        });

      reloadModules();
      var el = $("<first><second></second></first>");
      $compile(el)($rootScope);
      expect(invocations).toEqual([
        "second postlink",
        "second controller $postLink",
        "first controller $postLink",
      ]);
    });

    it("calls $onChanges with all bindings during init", () => {
      var changesSpy = jasmine.createSpy();
      myModule.component("myComponent", {
        bindings: {
          myBinding: "<",
          myAttr: "@",
        },
        controller: function () {
          this.$onChanges = changesSpy;
        },
      });
      reloadModules();
      var el = $('<my-component my-binding="42" my-attr="43"></my-component>');
      $compile(el)($rootScope);
      expect(changesSpy).toHaveBeenCalled();
      var changes = changesSpy.calls.mostRecent().args[0];
      expect(changes.myBinding.currentValue).toBe(42);
      expect(changes.myBinding.isFirstChange()).toBe(true);
      expect(changes.myAttr.currentValue).toBe("43");
      expect(changes.myAttr.isFirstChange()).toBe(true);
    });

    it("does not call $onChanges for two-way bindings", () => {
      var changesSpy = jasmine.createSpy();
      myModule.component("myComponent", {
        bindings: {
          myBinding: "=",
        },
        controller: function () {
          this.$onChanges = changesSpy;
        },
      });
      reloadModules();
      var el = $('<my-component my-binding="42"></my-component>');
      $compile(el)($rootScope);
      expect(changesSpy).toHaveBeenCalled();
      expect(changesSpy.calls.mostRecent().args[0].myBinding).toBeUndefined();
    });

    it("calls $onChanges when binding changes", () => {
      var changesSpy = jasmine.createSpy();
      myModule.component("myComponent", {
        bindings: {
          myBinding: "<",
        },
        controller: function () {
          this.$onChanges = changesSpy;
        },
      });
      reloadModules();
      $rootScope.aValue = 42;
      var el = $('<my-component my-binding="aValue"></my-component>');
      $compile(el)($rootScope);
      $rootScope.$apply();

      expect(changesSpy.calls.count()).toBe(1);

      $rootScope.aValue = 43;
      $rootScope.$apply();
      expect(changesSpy.calls.count()).toBe(2);

      var lastChanges = changesSpy.calls.mostRecent().args[0];
      expect(lastChanges.myBinding.currentValue).toBe(43);
      expect(lastChanges.myBinding.previousValue).toBe(42);
      expect(lastChanges.myBinding.isFirstChange()).toBe(false);
    });

    it("calls $onChanges when attribute changes", () => {
      var changesSpy = jasmine.createSpy();
      var attrs;
      myModule.component("myComponent", {
        bindings: {
          myAttr: "@",
        },
        controller: function ($attrs) {
          this.$onChanges = changesSpy;
          attrs = $attrs;
        },
      });
      reloadModules();
      var el = $('<my-component my-attr="42"></my-component>');
      $compile(el)($rootScope);
      $rootScope.$apply();

      expect(changesSpy.calls.count()).toBe(1);

      attrs.$set("myAttr", "43");
      $rootScope.$apply();
      expect(changesSpy.calls.count()).toBe(2);

      var lastChanges = changesSpy.calls.mostRecent().args[0];
      expect(lastChanges.myAttr.currentValue).toBe("43");
      expect(lastChanges.myAttr.previousValue).toBe("42");
      expect(lastChanges.myAttr.isFirstChange()).toBe(false);
    });

    it("calls $onChanges once with multiple changes", () => {
      var changesSpy = jasmine.createSpy();
      var attrs;
      myModule.component("myComponent", {
        bindings: {
          myBinding: "<",
          myAttr: "@",
        },
        controller: function ($attrs) {
          this.$onChanges = changesSpy;
          attrs = $attrs;
        },
      });
      reloadModules();
      $rootScope.aValue = 42;
      var el = $(
        '<my-component my-binding="aValue" my-attr="fourtyTwo"></my-component>',
      );
      $compile(el)($rootScope);
      $rootScope.$apply();

      expect(changesSpy.calls.count()).toBe(1);

      $rootScope.aValue = 43;
      attrs.$set("myAttr", "fourtyThree");
      $rootScope.$apply();
      expect(changesSpy.calls.count()).toBe(2);

      var lastChanges = changesSpy.calls.mostRecent().args[0];
      expect(lastChanges.myBinding.currentValue).toBe(43);
      expect(lastChanges.myBinding.previousValue).toBe(42);
      expect(lastChanges.myAttr.currentValue).toBe("fourtyThree");
      expect(lastChanges.myAttr.previousValue).toBe("fourtyTwo");
    });

    it("runs $onChanges in a digest", () => {
      var changesSpy = jasmine.createSpy();
      myModule.component("myComponent", {
        bindings: {
          myBinding: "<",
        },
        controller: function () {
          this.$onChanges = () => {
            this.innerValue = "myBinding is " + this.myBinding;
          };
        },
        template: "{{ $ctrl.innerValue }}",
      });
      reloadModules();
      $rootScope.aValue = 42;
      var el = $('<my-component my-binding="aValue"></my-component>');
      $compile(el)($rootScope);
      $rootScope.$apply();

      $rootScope.aValue = 43;
      $rootScope.$apply();

      expect(el.text()).toEqual("myBinding is 43");
    });

    it("keeps first value as previous for $onChanges when multiple changes", () => {
      var changesSpy = jasmine.createSpy();
      myModule.component("myComponent", {
        bindings: {
          myBinding: "<",
        },
        controller: function () {
          this.$onChanges = changesSpy;
        },
      });
      reloadModules();
      $rootScope.aValue = 42;
      var el = $('<my-component my-binding="aValue"></my-component>');
      $compile(el)($rootScope);
      $rootScope.$apply();

      $rootScope.aValue = 43;
      $rootScope.$watch("aValue", () => {
        if ($rootScope.aValue !== 44) {
          $rootScope.aValue = 44;
        }
      });
      $rootScope.$apply();
      expect(changesSpy.calls.count()).toBe(2);

      var lastChanges = changesSpy.calls.mostRecent().args[0];
      expect(lastChanges.myBinding.currentValue).toBe(44);
      expect(lastChanges.myBinding.previousValue).toBe(42);
    });

    it("runs $onChanges for all components in the same digest", () => {
      myModule
        .component("first", {
          bindings: { myBinding: "<" },
          controller: function () {
            this.$onChanges = () => {};
          },
        })
        .component("second", {
          bindings: { myBinding: "<" },
          controller: function () {
            this.$onChanges = () => {};
          },
        });
      reloadModules();
      var watchSpy = jasmine.createSpy();
      $rootScope.$watch(watchSpy);

      $rootScope.aValue = 42;
      var el = $(
        "<div>" +
          '<first my-binding="aValue"></first>' +
          '<second my-binding="aValue"></second>' +
          "</div>",
      );
      $compile(el)($rootScope);
      $rootScope.$apply();
      // Dirty watches always cause a second digest
      expect(watchSpy.calls.count()).toBe(2);

      $rootScope.aValue = 43;
      $rootScope.$apply();
      // Two more because of dirty watches $apply here,
      // plus one more for onchanges
      expect(watchSpy.calls.count()).toBe(5);
    });

    it("has a TTL for $onChanges", () => {
      myModule.component("myComponent", {
        bindings: {
          input: "<",
          increment: "=",
        },
        controller: function () {
          this.$onChanges = function () {
            if (this.increment) {
              this.increment = this.increment + 1;
            }
          };
        },
      });
      reloadModules();
      var watchSpy = jasmine.createSpy();
      $rootScope.$watch(watchSpy);

      var el = $(
        "<div>" +
          '<my-component input="valueOne" increment="valueTwo"></my-component>' +
          '<my-component input="valueTwo" increment="valueOne"></my-component>' +
          "</div>",
      );
      $compile(el)($rootScope);
      $rootScope.$apply();

      $rootScope.valueOne = 42;
      $rootScope.valueTwo = 42;
      $rootScope.$apply();
      expect($rootScope.valueOne).toBe(51);
      expect($rootScope.valueTwo).toBe(51);
    });
  });

  describe("configuration", () => {
    it("should use $$sanitizeUriProvider for reconfiguration of the `aHrefSanitizationTrustedUrlList`", () => {
      createInjector([
        "ng",
        ($compileProvider, $$sanitizeUriProvider) => {
          const newRe = /safe:/;
          let returnVal;

          expect($compileProvider.aHrefSanitizationTrustedUrlList()).toBe(
            $$sanitizeUriProvider.aHrefSanitizationTrustedUrlList(),
          );
          returnVal = $compileProvider.aHrefSanitizationTrustedUrlList(newRe);
          expect(returnVal).toBe($compileProvider);
          expect($$sanitizeUriProvider.aHrefSanitizationTrustedUrlList()).toBe(
            newRe,
          );
          expect($compileProvider.aHrefSanitizationTrustedUrlList()).toBe(
            newRe,
          );
        },
      ]);
    });

    it("should use $$sanitizeUriProvider for reconfiguration of the `imgSrcSanitizationTrustedUrlList`", () => {
      createInjector([
        "ng",
        ($compileProvider, $$sanitizeUriProvider) => {
          const newRe = /safe:/;
          let returnVal;

          expect($compileProvider.imgSrcSanitizationTrustedUrlList()).toBe(
            $$sanitizeUriProvider.imgSrcSanitizationTrustedUrlList(),
          );
          returnVal = $compileProvider.imgSrcSanitizationTrustedUrlList(newRe);
          expect(returnVal).toBe($compileProvider);
          expect($$sanitizeUriProvider.imgSrcSanitizationTrustedUrlList()).toBe(
            newRe,
          );
          expect($compileProvider.imgSrcSanitizationTrustedUrlList()).toBe(
            newRe,
          );
        },
      ]);
    });

    it("should allow strictComponentBindingsEnabled to be configured", () => {
      createInjector([
        "ng",
        ($compileProvider) => {
          expect($compileProvider.strictComponentBindingsEnabled()).toBe(false); // the default
          $compileProvider.strictComponentBindingsEnabled(true);
          expect($compileProvider.strictComponentBindingsEnabled()).toBe(true);
        },
      ]);
    });

    it("should register a directive", () => {
      myModule.directive("div", () => ({
        restrict: "EA",
        link(scope, element) {
          log = "OK";
          element.text("SUCCESS");
        },
      }));
      reloadModules();
      var el = $compile("<div></div>")($rootScope);
      expect(el.text()).toEqual("SUCCESS");
      expect(log).toEqual("OK");
    });

    it("should allow registration of multiple directives with same name", () => {
      myModule
        .directive("div", () => ({
          restrict: "EA",
          link: {
            pre: () => log.push("pre1"),
            post: () => log.push("post1"),
          },
        }))
        .directive("div", () => ({
          restrict: "EA",
          link: {
            pre: () => log.push("pre2"),
            post: () => log.push("post2"),
          },
        }));

      reloadModules();
      $compile("<div></div>")($rootScope);
      expect(log).toEqual(["pre1", "pre2", "post2", "post1"]);
    });

    it('should throw an exception if a directive is called "hasOwnProperty"', () => {
      expect(() => {
        myModule.directive("hasOwnProperty", () => {});
        reloadModules();
      }).toThrowError(/hasOwnProperty is not a valid directive name/);
    });

    it("should throw an exception if a directive name starts with a non-lowercase letter", () => {
      expect(() => {
        myModule.directive("BadDirectiveName", () => {});
        reloadModules();
      }).toThrowError(/The first character must be a lowercase letter/);
    });

    it("should throw an exception if a directive name has leading or trailing whitespace", () => {
      function assertLeadingOrTrailingWhitespaceInDirectiveName(name) {
        expect(() => {
          myModule.directive(name, () => {});
          createInjector(["myModule"]).invoke(($compile) => {});
        }).toThrowError(/modulerr/);
      }
      assertLeadingOrTrailingWhitespaceInDirectiveName(
        " leadingWhitespaceDirectiveName",
      );
      assertLeadingOrTrailingWhitespaceInDirectiveName(
        "trailingWhitespaceDirectiveName ",
      );
      assertLeadingOrTrailingWhitespaceInDirectiveName(
        " leadingAndTrailingWhitespaceDirectiveName ",
      );
    });

    it("should throw an exception if the directive name is not defined", () => {
      expect(() => {
        myModule.directive();
        createInjector(["myModule"]).invoke(($compile) => {});
      }).toThrowError(/areq/);
    });

    it("should ignore special chars before processing attribute directive name", () => {
      // a regression https://github.com/angular/angular.js/issues/16278
      myModule.directive("t", () => ({
        restrict: "A",
        link: {
          pre: () => log.push("pre"),
          post: () => log.push("post"),
        },
      }));
      reloadModules();
      $compile("<div t></div>")($rootScope);
      $compile("<div -t></div>")($rootScope);
      $compile("<div t></div>")($rootScope);
      expect(log.join("; ")).toEqual("pre; post; pre; post; pre; post");
    });

    it("should throw an exception if the directive factory is not defined", () => {
      expect(() => {
        myModule.directive("myDir");
        createInjector(["myModule"]).invoke(($compile) => {});
      }).toThrowError(/areq/);
    });

    it("should preserve context within declaration", () => {
      myModule
        .directive("ff", () => {
          const declaration = {
            restrict: "E",
            template() {
              log.push(`ff template: ${this === declaration}`);
            },
            compile() {
              log.push(`ff compile: ${this === declaration}`);
              return () => {
                log.push(`ff post: ${this === declaration}`);
              };
            },
          };
          return declaration;
        })
        .directive("fff", () => {
          const declaration = {
            restrict: "E",
            link: {
              pre() {
                log.push(`fff pre: ${this === declaration}`);
              },
              post() {
                log.push(`fff post: ${this === declaration}`);
              },
            },
          };
          return declaration;
        })
        .directive("ffff", () => {
          const declaration = {
            restrict: "E",
            compile() {
              return {
                pre() {
                  log.push(`ffff pre: ${this === declaration}`);
                },
                post() {
                  log.push(`ffff post: ${this === declaration}`);
                },
              };
            },
          };
          return declaration;
        })
        .directive("fffff", () => {
          const declaration = {
            restrict: "E",
            templateUrl() {
              log.push(`fffff templateUrl: ${this === declaration}`);
              return "fffff.html";
            },
            link() {
              log.push(`fffff post: ${this === declaration}`);
            },
          };
          return declaration;
        });

      reloadModules();

      $templateCache.set("fffff.html", "");

      $compile("<ff></ff>")($rootScope);
      $compile("<fff></fff>")($rootScope);
      $compile("<ffff></ffff>")($rootScope);
      $compile("<fffff></fffff>")($rootScope);
      expect(log.join("; ")).toEqual(
        "ff template: true; " +
          "ff compile: true; " +
          "ff post: true; " +
          "fff pre: true; " +
          "fff post: true; " +
          "ffff pre: true; " +
          "ffff post: true; " +
          "fffff templateUrl: true; " +
          "fffff post: true",
      );
    });
  });

  describe("svg namespace transcludes", () => {
    // this method assumes some sort of sized SVG element is being inspected.
    function assertIsValidSvgCircle(elem) {
      expect(isUnknownElement(elem)).toBe(false);
      expect(isSVGElement(elem)).toBe(true);
      const box = elem.getBoundingClientRect();
      expect(box.width === 0 && box.height === 0).toBe(false);
    }

    beforeEach(() => {
      registerDefaultDirectives();
      reloadModules();
    });

    afterEach(() => {
      dealoc(element);
    });

    it("should handle transcluded svg elements", () => {
      element = JQLite(
        "<div><svg-container>" +
          '<circle cx="4" cy="4" r="2"></circle>' +
          "</svg-container></div>",
      );
      $compile(element[0].childNodes)($rootScope);
      document.body.appendChild(element[0]);

      const circle = element.find("circle");

      assertIsValidSvgCircle(circle[0]);
    });

    it("should handle custom svg elements inside svg tag", () => {
      element = JQLite(
        '<div><svg width="300" height="300">' +
          "<svg-circle></svg-circle>" +
          "</svg></div>",
      );
      $compile(element[0].childNodes)($rootScope);
      document.body.appendChild(element[0]);

      const circle = element.find("circle");
      assertIsValidSvgCircle(circle[0]);
    });

    it("should handle transcluded custom svg elements", () => {
      element = JQLite(
        "<div><svg-container>" +
          "<svg-circle></svg-circle>" +
          "</svg-container></div>",
      );
      $compile(element[0].childNodes)($rootScope);
      document.body.appendChild(element[0]);

      const circle = element.find("circle");
      assertIsValidSvgCircle(circle[0]);
    });

    // Supports: Chrome 53-57+
    // Since Chrome 53-57+, the reported size of `<foreignObject>` elements and their descendants
    // is affected by global display settings (e.g. font size) and browser settings (e.g. default
    // zoom level). In order to avoid false negatives, we compare against the size of the
    // equivalent, hand-written SVG instead of fixed widths/heights.
    const HAND_WRITTEN_SVG =
      '<svg width="400" height="400">' +
      '<foreignObject width="100" height="100">' +
      '<div style="position:absolute;width:20px;height:20px">test</div>' +
      "</foreignObject>" +
      "</svg>";

    it("should handle foreignObject", () => {
      element = JQLite(
        `<div>${
          // By hand (for reference)
          HAND_WRITTEN_SVG
          // By directive
        }<svg-container>` +
          `<foreignObject width="100" height="100">` +
          `<div style="position:absolute;width:20px;height:20px">test</div>` +
          `</foreignObject>` +
          `</svg-container>` +
          `</div>`,
      );
      $compile(element[0].childNodes)($rootScope);
      document.body.appendChild(element[0]);

      const referenceElem = element.find("div")[0];
      const testElem = element.find("div")[1];
      const referenceBounds = referenceElem.getBoundingClientRect();
      const testBounds = testElem.getBoundingClientRect();

      expect(isHTMLElement(testElem)).toBe(true);
      expect(referenceBounds.width).toBeGreaterThan(0);
      expect(referenceBounds.height).toBeGreaterThan(0);
      expect(testBounds.width).toBe(referenceBounds.width);
      expect(testBounds.height).toBe(referenceBounds.height);
    });

    it("should handle custom svg containers that transclude to foreignObject that transclude html", () => {
      element = JQLite(
        `<div>${
          // By hand (for reference)
          HAND_WRITTEN_SVG
          // By directive
        }<svg-container>` +
          `<my-foreign-object>` +
          `<div style="width:20px;height:20px">test</div>` +
          `</my-foreign-object>` +
          `</svg-container>` +
          `</div>`,
      );
      $compile(element[0].childNodes)($rootScope);
      document.body.appendChild(element[0]);

      const referenceElem = element.find("div")[0];
      const testElem = element.find("div")[1];
      const referenceBounds = referenceElem.getBoundingClientRect();
      const testBounds = testElem.getBoundingClientRect();

      expect(isHTMLElement(testElem)).toBe(true);
      expect(referenceBounds.width).toBeGreaterThan(0);
      expect(referenceBounds.height).toBeGreaterThan(0);
      expect(testBounds.width).toBe(referenceBounds.width);
      expect(testBounds.height).toBe(referenceBounds.height);
    });

    it("should handle directives with templates that manually add the transclude further down", () => {
      element = JQLite(
        "<div><svg-custom-transclude-container>" +
          '<circle cx="2" cy="2" r="1"></circle></svg-custom-transclude-container>' +
          "</div>",
      );
      $compile(element[0].childNodes)($rootScope);
      document.body.appendChild(element[0]);

      const circle = element.find("circle");
      assertIsValidSvgCircle(circle[0]);
    });

    it("should support directives with SVG templates and a slow url that are stamped out later by a transcluding directive", (done) => {
      window.angular.module("test", []).directive(
        "svgCircleUrl",
        valueFn({
          replace: true,
          templateUrl: "/mock/circle-svg",
          templateNamespace: "SVG",
        }),
      );

      injector.loadNewModules(["test"]);
      element = $compile(
        '<svg><g ng-repeat="l in list"><svg-circle-url></svg-circle-url></g></svg>',
      )($rootScope);

      // initially the template is not yet loaded
      $rootScope.$apply(() => {
        $rootScope.list = [1];
      });
      expect(element.find("svg-circle-url").length).toBe(1);
      expect(element.find("circle").length).toBe(0);
      // template is loaded and replaces the existing nodes
      setTimeout(() => {
        expect(element.find("svg-circle-url").length).toBe(0);
        expect(element.find("circle").length).toBe(1);
        // new entry should immediately use the loaded template
        $rootScope.$apply(() => {
          $rootScope.list.push(2);
        });
        expect(element.find("svg-circle-url").length).toBe(0);
        expect(element.find("circle").length).toBe(2);
        done();
      }, 100);
    });
  });

  describe("compile phase", () => {
    // NO ELEMENT ATTACHMENTS
    // it("should attach scope to the document node when it is compiled explicitly", () => {
    //   let $document = JQLite(document);
    //   $document = $compile($document)($rootScope);
    //   expect($document.scope()).toBe($rootScope);
    // });

    it("should not wrap root text nodes in spans", () => {
      element = JQLite("<div>   <div>A</div>\n  <div>B</div>C\t\n  </div>");
      $compile(element[0].childNodes)($rootScope);
      const spans = element.find("span");
      expect(spans.length).toEqual(0);
    });

    it("should be able to compile text nodes at the root", () => {
      element = JQLite("<div>Name: {{name}}<br />\nColor: {{color}}</div>");
      $rootScope.name = "Lucas";
      $rootScope.color = "blue";
      $compile(element[0].childNodes)($rootScope);
      expect(element.text()).toEqual("Name: Lucas\nColor: blue");
    });

    it("should not leak memory when there are top level empty text nodes", () => {
      // We compile the contents of element (i.e. not element itself)
      // Then delete these contents and check the cache has been reset to zero
      // Clear cache
      CACHE.clear();
      window.angular.module("test1", ["ng"]);
      createInjector(["test1"]).invoke(($compile) => {
        expect(CACHE.size).toEqual(0);
        // First with only elements at the top level
        element = JQLite("<div><div></div></div>");
        $compile(element[0].childNodes)($rootScope);
        // expect(CACHE.size).toEqual(2);
        element.empty();
        expect(CACHE.size).toEqual(0);

        // Next with non-empty text nodes at the top level
        // (in this case the compiler will wrap them in a <span>)
        element = JQLite("<div>xxx</div>");
        $compile(element[0].childNodes)($rootScope);
        element.empty();
        expect(CACHE.size).toEqual(0);

        // Next with comment nodes at the top level
        element = JQLite("<div><!-- comment --></div>");
        $compile(element[0].childNodes)($rootScope);
        element.empty();
        expect(CACHE.size).toEqual(0);

        // Finally with empty text nodes at the top level
        element = JQLite("<div>   \n<div></div>   </div>");
        $compile(element[0].childNodes)($rootScope);
        //expect(CACHE.size).toEqual(2);
        element.empty();
        expect(CACHE.size).toEqual(0);
      });
    });

    it("should not blow up when elements with no childNodes property are compiled", () => {
      // it turns out that when a browser plugin is bound to a DOM element (typically <object>),
      // the plugin's context rather than the usual DOM apis are exposed on this element, so
      // childNodes might not exist.

      element = JQLite("<div>{{1+2}}</div>");

      try {
        element[0].childNodes[1] = {
          nodeType: 3,
          nodeName: "OBJECT",
          textContent: "fake node",
        };
      } catch (e) {
        /* empty */
      }

      $compile(element)($rootScope);
      $rootScope.$apply();

      // object's children can't be compiled in this case, so we expect them to be raw
      expect(element.html()).toBe("3");
    });

    it('should detect anchor elements with the string "SVG" in the `href` attribute as an anchor', () => {
      element = JQLite(
        '<div><a href="/ID_SVG_ID">' +
          '<span ng-if="true">Should render</span>' +
          "</a></div>",
      );

      $compile(element[0].childNodes)($rootScope);
      document.body.appendChild(element[0]);
      expect(element.find("span").text()).toContain("Should render");
    });

    it("should allow changing the template structure after the current node", () => {
      myModule.directive(
        "after",
        valueFn({
          compile(element) {
            element.after("<span log>B</span>");
          },
        }),
      );
      reloadModules();
      element = JQLite("<div><div after>A</div></div>");
      $compile(element)($rootScope);
      expect(element.text()).toBe("AB");
    });

    it("should allow changing the template structure after the current node inside ngRepeat", () => {
      myModule.directive(
        "after",
        valueFn({
          compile(element) {
            element.after("<span log>B</span>");
          },
        }),
      );

      reloadModules();
      element = JQLite(
        '<div><div ng-repeat="i in [1,2]"><div after>A</div></div></div>',
      );
      $compile(element)($rootScope);
      expect(element.text()).toBe("ABAB");
    });

    it("should allow modifying the DOM structure in post link fn", () => {
      myModule.directive(
        "removeNode",
        valueFn({
          link($scope, $element) {
            $element.remove();
          },
        }),
      );
      reloadModules();
      element = JQLite("<div><div remove-node></div><div>{{test}}</div></div>");
      $rootScope.test = "Hello";
      $compile(element)($rootScope);
      expect(element.children().length).toBe(1);
      expect(element.text()).toBe("Hello");
    });
  });

  describe("error handling", () => {
    it("should handle exceptions", () => {
      myModule
        .factory("$exceptionHandler", () => {
          return (exception) => {
            log.push(exception);
          };
        })
        .directive("factoryError", () => {
          throw "FactoryError";
        })
        .directive(
          "templateError",
          valueFn({
            compile() {
              throw "TemplateError";
            },
          }),
        )
        .directive(
          "linkingError",
          valueFn(() => {
            throw "LinkingError";
          }),
        );
      // we have to create the injector here because the decorate is not able to override
      // exception handler on the defaultModule
      createInjector(["myModule"]).invoke(($compile, $rootScope) => {
        element = $compile(
          "<div factory-error template-error linking-error></div>",
        )($rootScope);
        expect(log[0]).toEqual("FactoryError");
        expect(log[1]).toEqual("TemplateError");
        expect(log[2]).toEqual("LinkingError");
      });
    });
  });

  describe("compiler control", () => {
    describe("priority", () => {
      it("should honor priority", () => {
        registerDefaultDirectives();
        reloadModules();
        element = $compile(
          '<span log="L" high-log="H" data-medium-log="M"></span>',
        )($rootScope);
        expect(log.join("; ")).toEqual("L; M; H");
      });
    });

    describe("terminal", () => {
      it("should prevent further directives from running", () => {
        registerDefaultDirectives();
        reloadModules();

        element = $compile('<div negative-stop><a set="FAIL">OK</a></div>')(
          $rootScope,
        );
        expect(element.text()).toEqual("OK");
      });

      it("should prevent further directives from running, but finish current priority level", () => {
        // class is processed after attrs, so putting log in class will put it after
        // the stop in the current level. This proves that the log runs after stop
        registerDefaultDirectives();
        reloadModules();

        element = $compile(
          '<div high-log medium-stop log medium-log><a set="FAIL">OK</a></div>',
        )($rootScope);
        expect(element.text()).toEqual("OK");
        expect(log).toEqual(["MEDIUM", "HIGH"]);
      });
    });

    describe("restrict", () => {
      it("should allow restriction of availability", () => {
        forEach({ div: "E", attr: "A", all: "EA" }, (restrict, name) => {
          myModule.directive(name, () => ({
            restrict,
            compile: valueFn((scope, element, attr) => {
              log.push(name);
            }),
          }));
        });

        reloadModules();
        dealoc($compile('<span div class="div"></span>')($rootScope));
        expect(log[0]).toBeUndefined();

        dealoc($compile("<div></div>")($rootScope));
        expect(log[0]).toBe("div");

        dealoc($compile('<attr class="attr"></attr>')($rootScope));
        expect(log[1]).toBeUndefined();

        dealoc($compile("<span attr></span>")($rootScope));
        expect(log[1]).toBe("attr");

        dealoc($compile("<clazz clazz></clazz>")($rootScope));
        expect(log[2]).toBeUndefined();

        dealoc($compile('<all class="all" all></all>')($rootScope));
      });

      it("should use EA rule as the default", () => {
        myModule.directive("defaultDir", () => ({
          compile() {
            log.push("defaultDir");
          },
        }));
        reloadModules();
        dealoc($compile("<span default-dir ></span>")($rootScope));
        expect(log[0]).toEqual("defaultDir");

        dealoc($compile("<default-dir></default-dir>")($rootScope));
        expect(log[1]).toEqual("defaultDir");

        dealoc($compile('<span class="default-dir"></span>')($rootScope));
        expect(log[2]).toBeUndefined();
      });
    });

    describe("template", () => {
      let attrs;
      beforeEach(() => {
        myModule
          .directive(
            "replace",
            valueFn({
              restrict: "A",
              replace: true,
              template:
                '<div class="log" style="width: 10px" high-log>Replace!</div>',
              compile(element, attr) {
                attr.$set("compiled", "COMPILED");
                expect(element).toBe(attr.$$element);
              },
            }),
          )
          .directive(
            "nomerge",
            valueFn({
              restrict: "A",
              replace: true,
              template: '<div class="log" id="myid" high-log>No Merge!</div>',
              compile(element, attr) {
                attr.$set("compiled", "COMPILED");
                expect(element).toBe(attr.$$element);
              },
            }),
          )
          .directive(
            "append",
            valueFn({
              restrict: "A",
              template:
                '<div class="log" style="width: 10px" high-log>Append!</div>',
              compile(element, attr) {
                attr.$set("compiled", "COMPILED");
                expect(element).toBe(attr.$$element);
              },
            }),
          )
          .directive(
            "replaceWithInterpolatedClass",
            valueFn({
              replace: true,
              template:
                '<div class="class_{{1+1}}">Replace with interpolated class!</div>',
              compile(element, attr) {
                attr.$set("compiled", "COMPILED");
                expect(element).toBe(attr.$$element);
              },
            }),
          )
          .directive(
            "replaceWithInterpolatedStyle",
            valueFn({
              replace: true,
              template:
                '<div style="width:{{1+1}}px">Replace with interpolated style!</div>',
              compile(element, attr) {
                attr.$set("compiled", "COMPILED");
                expect(element).toBe(attr.$$element);
              },
            }),
          )
          .directive(
            "replaceWithTr",
            valueFn({
              replace: true,
              template: "<tr><td>TR</td></tr>",
            }),
          )
          .directive(
            "replaceWithTd",
            valueFn({
              replace: true,
              template: "<td>TD</td>",
            }),
          )
          .directive(
            "replaceWithTh",
            valueFn({
              replace: true,
              template: "<th>TH</th>",
            }),
          )
          .directive(
            "replaceWithThead",
            valueFn({
              replace: true,
              template: "<thead><tr><td>TD</td></tr></thead>",
            }),
          )
          .directive(
            "replaceWithTbody",
            valueFn({
              replace: true,
              template: "<tbody><tr><td>TD</td></tr></tbody>",
            }),
          )
          .directive(
            "replaceWithTfoot",
            valueFn({
              replace: true,
              template: "<tfoot><tr><td>TD</td></tr></tfoot>",
            }),
          )
          .directive(
            "replaceWithOption",
            valueFn({
              replace: true,
              template: "<option>OPTION</option>",
            }),
          )
          .directive(
            "replaceWithOptgroup",
            valueFn({
              replace: true,
              template: "<optgroup>OPTGROUP</optgroup>",
            }),
          )
          .directive("logAttrs", () => ({
            link($scope, $element, $attrs) {
              attrs = $attrs;
            },
          }));
      });

      it("should replace element with template", () => {
        reloadModules();
        element = $compile("<div><div replace>ignore</div><div>")($rootScope);
        expect(element.text()).toEqual("Replace!");
        expect(element.find("div").attr("compiled")).toEqual("COMPILED");
      });

      it("should append element with template", () => {
        reloadModules();
        element = $compile("<div><div append>ignore</div><div>")($rootScope);
        expect(element.text()).toEqual("Append!");
        expect(element.find("div").attr("compiled")).toEqual("COMPILED");
      });

      it("should compile template when replacing", () => {
        reloadModules();
        element = $compile("<div><div replace>ignore</div><div>")($rootScope);
        expect(element.text()).toEqual("Replace!");
      });

      it("should compile template when appending", () => {
        reloadModules();
        element = $compile("<div><div append>ignore</div><div>")($rootScope);
        expect(element.text()).toEqual("Append!");
      });

      it("should merge attributes including style attr", () => {
        reloadModules();
        element = $compile(
          '<div><div replace class="medium-log" style="height: 20px" ></div><div>',
        )($rootScope);
        const div = element.find("div");
        expect(div[0].classList.contains("medium-log")).toBe(true);
        expect(div[0].classList.contains("log")).toBe(true);
        expect(div[0].style.width).toBe("10px");
        expect(div[0].style.height).toBe("20px");
        expect(div.attr("replace")).toEqual("");
        expect(div.attr("high-log")).toEqual("");
      });

      it("should not merge attributes if they are the same", () => {
        reloadModules();
        element = $compile(
          '<div><div nomerge class="medium-log" id="myid"></div><div>',
        )($rootScope);
        const div = element.find("div");
        expect(div[0].classList.contains("medium-log")).toBe(true);
        expect(div[0].classList.contains("log")).toBe(true);
        expect(div.attr("id")).toEqual("myid");
      });

      it("should correctly merge attributes that contain special characters", () => {
        reloadModules();
        element = $compile(
          '<div><div replace (click)="doSomething()" [value]="someExpression" ω="omega"></div><div>',
        )($rootScope);
        const div = element.find("div");
        expect(div.attr("(click)")).toEqual("doSomething()");
        expect(div.attr("[value]")).toEqual("someExpression");
        expect(div.attr("ω")).toEqual("omega");
      });

      it('should not add white-space when merging an attribute that is "" in the replaced element', () => {
        reloadModules();
        element = $compile('<div><div replace class=""></div><div>')(
          $rootScope,
        );
        const div = element.find("div");
        expect(div[0].classList.contains("log")).toBe(true);
        expect(div.attr("class")).toBe("log");
      });

      it("should not set merged attributes twice in $attrs", () => {
        reloadModules();
        element = $compile(
          '<div><div log-attrs replace class="myLog"></div><div>',
        )($rootScope);
        const div = element.find("div");
        expect(div.attr("class")).toBe("myLog log");
        expect(attrs.class).toBe("myLog log");
      });

      it("should play nice with repeater when replacing", () => {
        reloadModules();
        element = $compile(
          "<div>" + '<div ng-repeat="i in [1,2]" replace></div>' + "</div>",
        )($rootScope);
        expect(element.text()).toEqual("Replace!Replace!");
      });

      it("should play nice with repeater when appending", () => {
        reloadModules();
        element = $compile(
          "<div>" + '<div ng-repeat="i in [1,2]" append></div>' + "</div>",
        )($rootScope);
        expect(element.text()).toEqual("Append!Append!");
      });

      it("should handle interpolated css class from replacing directive", () => {
        reloadModules();
        element = $compile("<div replace-with-interpolated-class></div>")(
          $rootScope,
        );
        expect(element[0].classList.contains("class_2")).toBeTrue();
      });

      it("should merge interpolated css class", () => {
        reloadModules();
        element = $compile('<div class="one {{cls}} three" replace></div>')(
          $rootScope,
        );

        $rootScope.$apply(() => {
          $rootScope.cls = "two";
        });

        expect(element[0].classList.contains("one")).toBeTrue();
        expect(element[0].classList.contains("two")).toBeTrue(); // interpolated
        expect(element[0].classList.contains("three")).toBeTrue();
        expect(element[0].classList.contains("log")).toBeTrue(); // merged from replace directive template
      });

      it("should merge interpolated css class with ngRepeat", () => {
        reloadModules();
        element = $compile(
          "<div>" +
            '<div ng-repeat="i in [1]" class="one {{cls}} three" replace></div>' +
            "</div>",
        )($rootScope);

        $rootScope.$apply(() => {
          $rootScope.cls = "two";
        });

        const child = element.find("div").eq(0);
        expect(child[0].classList.contains("one")).toBeTrue();
        expect(child[0].classList.contains("two")).toBeTrue(); // interpolated
        expect(child[0].classList.contains("three")).toBeTrue();
        expect(child[0].classList.contains("log")).toBeTrue(); // merged from replace directive template
      });

      it("should interpolate the values once per digest", () => {
        $rootScope.log = (res) => {
          log.push(res);
        };

        element = $compile('<div>{{log("A")}} foo {{::log("B")}}</div>')(
          $rootScope,
        );
        expect(log.join("; ")).toEqual("A; B; A; B");
      });

      describe("replace and not exactly one root element", () => {
        let templateVar;

        beforeEach(() => {
          myModule
            .decorator("$exceptionHandler", () => {
              return (exception, cause) => {
                throw new Error();
              };
            })
            .directive("template", () => ({
              replace: true,
              template() {
                return templateVar;
              },
            }));

          createInjector(["myModule"]).invoke((_$compile_, _$rootScope_) => {
            $compile = _$compile_;
            $rootScope = _$rootScope_;
          });
        });

        it("should throw if: no root element", () => {
          templateVar = "dada";
          expect(() => {
            $compile("<p template></p>");
          }).toThrowError(/tplrt/);
        });

        it("should throw if: multiple root elements", () => {
          templateVar = "<div></div><div></div>";
          expect(() => {
            $compile("<p template></p>");
          }).toThrowError(/tplrt/);
        });

        it("should not throw if the root element is accompanied by: whitespace", () => {
          templateVar = "  <div>Hello World!</div> \n";
          let element;
          expect(() => {
            element = $compile("<p template></p>")($rootScope);
          }).not.toThrow();
          expect(element.length).toBe(1);
          expect(element.text()).toBe("Hello World!");
        });

        it("should not throw if the root element is accompanied by: comments", () => {
          templateVar = "<!-- oh hi --><div>Hello World!</div> \n";
          let element;
          expect(() => {
            element = $compile("<p template></p>")($rootScope);
          }).not.toThrow();
          expect(element.length).toBe(1);
          expect(element.text()).toBe("Hello World!");
        });

        it("should not throw if the root element is accompanied by: comments + whitespace", () => {
          templateVar =
            "  <!-- oh hi -->  <div>Hello World!</div>  <!-- oh hi -->\n";
          let element;
          expect(() => {
            element = $compile("<p template></p>")($rootScope);
          }).not.toThrow();
          expect(element.length).toBe(1);
          expect(element.text()).toBe("Hello World!");
        });
      });

      it("should support templates with root <tr> tags", () => {
        reloadModules();
        expect(() => {
          element = $compile("<div replace-with-tr></div>")($rootScope);
        }).not.toThrow();
        expect(getNodeName(element)).toMatch(/tr/i);
      });

      it("should support templates with root <td> tags", () => {
        reloadModules();
        expect(() => {
          element = $compile("<div replace-with-td></div>")($rootScope);
        }).not.toThrow();
        expect(getNodeName(element)).toMatch(/td/i);
      });

      it("should support templates with root <th> tags", () => {
        reloadModules();
        expect(() => {
          element = $compile("<div replace-with-th></div>")($rootScope);
        }).not.toThrow();
        expect(getNodeName(element)).toMatch(/th/i);
      });

      it("should support templates with root <thead> tags", () => {
        reloadModules();
        expect(() => {
          element = $compile("<div replace-with-thead></div>")($rootScope);
        }).not.toThrow();
        expect(getNodeName(element)).toMatch(/thead/i);
      });

      it("should support templates with root <tbody> tags", () => {
        reloadModules();
        expect(() => {
          element = $compile("<div replace-with-tbody></div>")($rootScope);
        }).not.toThrow();
        expect(getNodeName(element)).toMatch(/tbody/i);
      });

      it("should support templates with root <tfoot> tags", () => {
        reloadModules();
        expect(() => {
          element = $compile("<div replace-with-tfoot></div>")($rootScope);
        }).not.toThrow();
        expect(getNodeName(element)).toMatch(/tfoot/i);
      });

      it("should support templates with root <option> tags", () => {
        reloadModules();
        expect(() => {
          element = $compile("<div replace-with-option></div>")($rootScope);
        }).not.toThrow();
        expect(getNodeName(element)).toMatch(/option/i);
      });

      it("should support templates with root <optgroup> tags", () => {
        reloadModules();
        expect(() => {
          element = $compile("<div replace-with-optgroup></div>")($rootScope);
        }).not.toThrow();
        expect(getNodeName(element)).toMatch(/optgroup/i);
      });

      it("should support SVG templates using directive.templateNamespace=svg", () => {
        myModule.directive(
          "svgAnchor",
          valueFn({
            replace: true,
            template: '<a xlink:href="{{linkurl}}">{{text}}</a>',
            templateNamespace: "SVG",
            scope: {
              linkurl: "@svgAnchor",
              text: "@?",
            },
          }),
        );
        reloadModules();
        element = $compile(
          '<svg><g svg-anchor="/foo/bar" text="foo/bar!"></g></svg>',
        )($rootScope);
        const child = element.children().eq(0);
        expect(getNodeName(child)).toMatch(/a/i);
        expect(isSVGElement(child[0])).toBe(true);
        expect(child[0].href.baseVal).toBe("/foo/bar");
      });

      it("should support MathML templates using directive.templateNamespace=math", () => {
        myModule.directive(
          "pow",
          valueFn({
            replace: true,
            transclude: true,
            template: "<msup><mn>{{pow}}</mn></msup>",
            templateNamespace: "MATH",
            scope: {
              pow: "@pow",
            },
            link(scope, elm, attr, ctrl, transclude) {
              transclude((node) => {
                elm.prepend(node[0]);
              });
            },
          }),
        );
        reloadModules();
        element = $compile('<math><mn pow="2"><mn>8</mn></mn></math>')(
          $rootScope,
        );
        const child = element.children().eq(0);
        expect(getNodeName(child)).toMatch(/msup/i);
        expect(isUnknownElement(child[0])).toBe(false);
        expect(isHTMLElement(child[0])).toBe(false);
      });

      it("should keep prototype properties on directive", () => {
        function DirectiveClass() {
          this.restrict = "E";
          this.template = "<p>{{value}}</p>";
        }

        DirectiveClass.prototype.compile = () => {
          return function (scope, element, attrs) {
            scope.value = "Test Value";
          };
        };

        myModule.directive(
          "templateUrlWithPrototype",
          valueFn(new DirectiveClass()),
        );
        reloadModules();
        element = $compile(
          "<template-url-with-prototype><template-url-with-prototype>",
        )($rootScope);
        expect(element.find("p")[0].innerHTML).toEqual("Test Value");
      });
    });

    describe("template as function", () => {
      beforeEach(() => {
        myModule.directive(
          "myDirective",
          valueFn({
            replace: true,
            template($element, $attrs) {
              expect($element.text()).toBe("original content");
              expect($attrs.myDirective).toBe("some value");
              return '<div id="templateContent">template content</div>';
            },
            compile($element, $attrs) {
              expect($element.text()).toBe("template content");
              expect($attrs.id).toBe("templateContent");
            },
          }),
        );
      });

      it("should evaluate `template` when defined as fn and use returned string as template", () => {
        reloadModules();
        element = $compile(
          '<div my-directive="some value">original content<div>',
        )($rootScope);
        expect(element.text()).toEqual("template content");
      });
    });

    describe("templateUrl", () => {
      let $sce, errors;
      // let module, log, $compile, $rootScope, $sce, $templateCache, errors;

      beforeEach(() => {
        // log = [];
        errors = [];
        // publishExternalAPI().decorator("$exceptionHandler", () => {
        //   return (exception, cause) => {
        //     errors.push(exception.message);
        //   };
        // });
        myModule
          .decorator("$exceptionHandler", () => {
            return (exception, cause) => {
              errors.push(exception.message);
            };
          })
          .directive(
            "hello",
            valueFn({
              restrict: "A",
              templateUrl: "/mock/hello",
              transclude: true,
            }),
          )
          .directive(
            "401",
            valueFn({
              restrict: "A",
              templateUrl: "/mock/401",
              transclude: true,
            }),
          )
          .directive(
            "cau",
            valueFn({
              restrict: "A",
              templateUrl: "/mock/divexpr",
            }),
          )
          .directive(
            "crossDomainTemplate",
            valueFn({
              restrict: "A",
              templateUrl: "http://example.com/should-not-load.html",
            }),
          )
          .directive("trustedTemplate", () => ({
            restrict: "A",
            templateUrl() {
              return $sce.trustAsResourceUrl("http://localhost:3000/hello");
            },
          }))
          .directive(
            "cError",
            valueFn({
              restrict: "A",
              templateUrl: "/mock/empty",
              compile() {
                throw new Error("cError");
              },
            }),
          )
          .directive(
            "lError",
            valueFn({
              restrict: "A",
              templateUrl: "/mock/empty",
              compile() {
                throw new Error("lError");
              },
            }),
          )
          .directive(
            "iHello",
            valueFn({
              restrict: "A",
              replace: true,
              templateUrl: "/mock/div",
            }),
          )
          .directive(
            "iCau",
            valueFn({
              restrict: "A",
              replace: true,
              templateUrl: "/mock/divexpr",
            }),
          )
          .directive(
            "iCError",
            valueFn({
              restrict: "A",
              replace: true,
              templateUrl: "error.html",
              compile() {
                throw new Error("cError");
              },
            }),
          )
          .directive(
            "iLError",
            valueFn({
              restrict: "A",
              replace: true,
              templateUrl: "error.html",
              compile() {
                throw new Error("lError");
              },
            }),
          )
          .directive(
            "replace",
            valueFn({
              replace: true,
              template: "<span>Hello, {{name}}!</span>",
            }),
          )
          .directive(
            "replaceWithTr",
            valueFn({
              replace: true,
              templateUrl: "tr.html",
            }),
          )
          .directive(
            "replaceWithTd",
            valueFn({
              replace: true,
              templateUrl: "td.html",
            }),
          )
          .directive(
            "replaceWithTh",
            valueFn({
              replace: true,
              templateUrl: "th.html",
            }),
          )
          .directive(
            "replaceWithThead",
            valueFn({
              replace: true,
              templateUrl: "thead.html",
            }),
          )
          .directive(
            "replaceWithTbody",
            valueFn({
              replace: true,
              templateUrl: "tbody.html",
            }),
          )
          .directive(
            "replaceWithTfoot",
            valueFn({
              replace: true,
              templateUrl: "tfoot.html",
            }),
          )
          .directive(
            "replaceWithOption",
            valueFn({
              replace: true,
              templateUrl: "option.html",
            }),
          )
          .directive(
            "replaceWithOptgroup",
            valueFn({
              replace: true,
              templateUrl: "optgroup.html",
            }),
          );

        createInjector(["myModule"]).invoke(
          (_$compile_, _$rootScope_, _$templateCache_, _$sce_) => {
            $compile = _$compile_;
            $rootScope = _$rootScope_;
            $templateCache = _$templateCache_;
            $sce = _$sce_;
          },
        );
      });

      it("should not load cross domain templates by default", () => {
        expect(() => {
          $compile("<div cross-domain-template></div>")($rootScope);
        }).toThrowError(/insecurl/);
      });

      it("should trust what is already in the template cache", () => {
        $templateCache.set(
          "http://example.com/should-not-load.html",
          "<span>example.com/cached-version</span>",
        );
        element = $compile("<div cross-domain-template></div>")($rootScope);
        expect(element[0].outerHTML).toEqual(
          '<div cross-domain-template=""></div>',
        );
        expect(element[0].outerHTML).toEqual(
          '<div cross-domain-template=""><span>example.com/cached-version</span></div>',
        );
      });

      it("should load cross domain templates when trusted", (done) => {
        element = $compile("<div trusted-template></div>")($rootScope);
        expect(element[0].outerHTML).toEqual('<div trusted-template=""></div>');
        setTimeout(() => {
          expect(element[0].outerHTML).toEqual(
            '<div trusted-template="">Hello</div>',
          );
          done();
        }, 100);
      });

      it("should append template via $http and cache it in $templateCache", (done) => {
        $templateCache.set("/mock/divexpr", "<span>Cau!</span>");
        element = $compile("<div><b hello>ignore</b><b cau>ignore</b></div>")(
          $rootScope,
        );
        expect(element[0].outerHTML).toEqual(
          '<div><b hello=""></b><b cau=""></b></div>',
        );

        expect(element[0].outerHTML).toEqual(
          '<div><b hello=""></b><b cau=""><span>Cau!</span></b></div>',
        );

        setTimeout(() => {
          expect(element[0].outerHTML).toEqual(
            `<div><b hello="">Hello</b><b cau=""><span>Cau!</span></b></div>`,
          );
          done();
        }, 100);
      });

      it("should inline template via $http and cache it in $templateCache", (done) => {
        $templateCache.set("/mock/divexpr", "<span>Cau!</span>");
        element = $compile(
          "<div><b i-hello>ignore</b><b i-cau>ignore</b></div>",
        )($rootScope);
        expect(element[0].outerHTML).toEqual(
          '<div><b i-hello=""></b><b i-cau=""></b></div>',
        );

        expect(element[0].outerHTML).toBe(
          '<div><b i-hello=""></b><span i-cau="">Cau!</span></div>',
        );

        setTimeout(() => {
          expect(element[0].outerHTML).toBe(
            '<div><div i-hello="">Hello</div><span i-cau="">Cau!</span></div>',
          );
          done();
        }, 100);
      });

      it("should compile, link and flush the template append", (done) => {
        $templateCache.set("/mock/hello", "<span>Hello, {{name}}!</span>");
        $rootScope.name = "Elvis";
        element = $compile('<div><b hello=""></b></div>')($rootScope);

        setTimeout(() => {
          expect(element[0].outerHTML).toEqual(
            '<div><b hello=""><span>Hello, Elvis!</span></b></div>',
          );
          done();
        }, 100);
      });

      it("should compile, link and flush the template inline", () => {
        $templateCache.set("/mock/div", "<span>Hello, {{name}}!</span>");
        $rootScope.name = "Elvis";
        element = $compile("<div><b i-hello></b></div>")($rootScope);

        expect(element[0].outerHTML).toBe(
          '<div><span i-hello="">Hello, Elvis!</span></div>',
        );
      });

      it("should compile template when replacing element in another template", () => {
        $templateCache.set("/mock/hello", "<div replace></div>");
        $rootScope.name = "Elvis";
        element = $compile('<div><b hello=""></b></div>')($rootScope);

        expect(element[0].outerHTML).toEqual(
          '<div><b hello=""><span replace="">Hello, Elvis!</span></b></div>',
        );
      });

      it("should compile template when replacing root element", () => {
        $rootScope.name = "Elvis";
        element = $compile("<div replace></div>")($rootScope);

        expect(element[0].outerHTML).toEqual(
          '<span replace="">Hello, Elvis!</span>',
        );
      });

      it("should resolve widgets after cloning in append mode", (done) => {
        $templateCache.set("/mock/divexpr", "<span>{{name}}</span>");
        $rootScope.greeting = "Hello";
        $rootScope.name = "Elvis";
        const template = $compile(
          "<div>" +
            "<b hello></b>" +
            "<b cau></b>" +
            "<b c-error></b>" +
            "<b l-error></b>" +
            "</div>",
        );
        let e1;
        let e2;

        e1 = template($rootScope.$new(), () => {}); // clone
        expect(e1.text()).toEqual("");
        // ;
        setTimeout(() => {
          e2 = template($rootScope.$new(), () => {}); // clone
          //
          expect(e1.text()).toEqual("HelloElvis  ");
          expect(e2.text()).toEqual("HelloElvis  ");

          expect(errors.length).toEqual(2);
          expect(errors[0]).toEqual("cError");
          expect(errors[1]).toEqual("lError");

          dealoc(e1);
          dealoc(e2);
          done();
        }, 100);
      });

      it("should resolve widgets after cloning in append mode without $templateCache", async () => {
        $rootScope.expr = "Elvis";
        const template = $compile("<div cau></div>");
        let e1;
        let e2;

        e1 = template($rootScope.$new(), () => {}); // clone
        expect(e1.text()).toEqual("");

        await wait(100);
        e2 = template($rootScope.$new(), () => {}); // clone
        expect(e1.text()).toEqual("Elvis");
        expect(e2.text()).toEqual("Elvis");

        dealoc(e1);
        dealoc(e2);
      });

      it("should resolve widgets after cloning in inline mode", async () => {
        $templateCache.set("/mock/divexpr", "<span>{{name}}</span>");
        $rootScope.greeting = "Hello";
        $rootScope.name = "Elvis";
        const template = $compile(
          "<div>" +
            "<b i-hello></b>" +
            "<b i-cau></b>" +
            "<b i-c-error></b>" +
            "<b i-l-error></b>" +
            "</div>",
        );
        let e1;
        let e2;

        e1 = template($rootScope.$new(), () => {}); // clone
        expect(e1.text()).toEqual("");

        await wait(100);
        e2 = template($rootScope.$new(), () => {}); // clone
        expect(e1.text()).toEqual("HelloElvis");
        expect(e2.text()).toEqual("HelloElvis");

        expect(errors.length).toEqual(2);
        dealoc(e1);
        dealoc(e2);
      });

      it("should resolve widgets after cloning in inline mode without $templateCache", (done) => {
        $rootScope.expr = "Elvis";
        const template = $compile('<div i-cau=""></div>');
        let e1;
        let e2;

        e1 = template($rootScope.$new(), () => {}); // clone
        expect(e1.text()).toEqual("");

        e2 = template($rootScope.$new(), () => {}); // clone

        setTimeout(() => {
          expect(e1.text()).toEqual("Elvis");
          expect(e2.text()).toEqual("Elvis");

          dealoc(e1);
          dealoc(e2);
          done();
        }, 100);
      });

      it("should be implicitly terminal and not compile placeholder content in append", () => {
        // we can't compile the contents because that would result in a memory leak
        $templateCache.set("/mock/hello", "Hello!");
        element = $compile('<div><b hello=""><div log></div></b></div>')(
          $rootScope,
        );

        expect(log[0]).toBeUndefined();
      });

      it("should be implicitly terminal and not compile placeholder content in inline", () => {
        // we can't compile the contents because that would result in a memory leak

        $templateCache.set("/mock/hello", "Hello!");
        element = $compile("<div><b i-hello><div log></div></b></div>")(
          $rootScope,
        );

        expect(log[0]).toBeUndefined();
      });

      // TODO: Figure out why the test fails twice
      it("should throw an error and clear element content if the template fails to load", (done) => {
        element = $compile("<div><b 401>content</b></div>")($rootScope);
        setTimeout(() => {
          expect(errors.length).toBe(2);
          expect(element[0].outerHTML).toBe('<div><b 401=""></b></div>');
          done();
        }, 1000);
      });

      it("should copy classes from pre-template node into linked element", () => {
        window.angular.module("test1", ["ng"]).directive(
          "test",
          valueFn({
            templateUrl: "test.html",
            replace: true,
          }),
        );
        createInjector(["test1"]).invoke(
          (_$compile_, _$rootScope_, _$templateCache_) => {
            $compile = _$compile_;
            $rootScope = _$rootScope_;
            $templateCache = _$templateCache_;
          },
        );

        $templateCache.set("test.html", '<p class="template-class">Hello</p>');
        element = $compile("<div test></div>")($rootScope, (node) => {
          node[0].classList.add("clonefn-class");
        });
        expect(element[0].classList.contains("template-class")).toBeTrue();
        expect(element[0].classList.contains("clonefn-class")).toBeTrue();
      });

      describe("delay compile / linking functions until after template is resolved", () => {
        let template, module;
        beforeEach(() => {
          log = [];
          module = angular.module("test1", ["ng"]).directive(
            "hello",
            valueFn({
              restrict: "A",
              templateUrl: "/mock/hello",
              transclude: true,
            }),
          );

          function logDirective(name, priority, options) {
            module.directive(name, () =>
              extend(
                {
                  priority,
                  compile() {
                    log.push(`${name}-C`);
                    return {
                      pre() {
                        log.push(`${name}-PreL`);
                      },
                      post() {
                        log.push(`${name}-PostL`);
                      },
                    };
                  },
                },
                options || {},
              ),
            );
          }

          logDirective("first", 10);
          logDirective("second", 5, { templateUrl: "second.html" });
          logDirective("third", 3);
          logDirective("last", 0);

          logDirective("iFirst", 10, { replace: true });
          logDirective("iSecond", 5, {
            replace: true,
            templateUrl: "second.html",
          });
          logDirective("iThird", 3, { replace: true });
          logDirective("iLast", 0, { replace: true });

          createInjector(["test1"]).invoke(
            (_$compile_, _$rootScope_, _$templateCache_) => {
              $compile = _$compile_;
              $rootScope = _$rootScope_;
              $templateCache = _$templateCache_;
            },
          );
        });

        it("should flush after link append", () => {
          $templateCache.set("second.html", "<div third>{{1+2}}</div>");
          template = $compile("<div><span first second last></span></div>");
          element = template($rootScope);
          expect(log[0]).toEqual("first-C");

          log.push("FLUSH");
          // //;
          expect(log.join("; ")).toEqual(
            "first-C; FLUSH; second-C; last-C; third-C; " +
              "first-PreL; second-PreL; last-PreL; third-PreL; " +
              "third-PostL; last-PostL; second-PostL; first-PostL",
          );

          const span = element.find("span");
          expect(span.attr("first")).toEqual("");
          expect(span.attr("second")).toEqual("");
          expect(span.find("div").attr("third")).toEqual("");
          expect(span.attr("last")).toEqual("");

          expect(span.text()).toEqual("3");
        });

        it("should flush after link inline", () => {
          $templateCache.set("second.html", "<div i-third>{{1+2}}</div>");
          template = $compile(
            "<div><span i-first i-second i-last></span></div>",
          );
          element = template($rootScope);
          expect(log[0]).toEqual("iFirst-C");

          log.push("FLUSH");
          expect(log.join("; ")).toEqual(
            "iFirst-C; FLUSH; iSecond-C; iThird-C; iLast-C; " +
              "iFirst-PreL; iSecond-PreL; iThird-PreL; iLast-PreL; " +
              "iLast-PostL; iThird-PostL; iSecond-PostL; iFirst-PostL",
          );

          const div = element.find("div");
          expect(div.attr("i-first")).toEqual("");
          expect(div.attr("i-second")).toEqual("");
          expect(div.attr("i-third")).toEqual("");
          expect(div.attr("i-last")).toEqual("");

          expect(div.text()).toEqual("3");
        });

        it("should flush before link append", () => {
          $templateCache.set("second.html", "<div third>{{1+2}}</div>");
          template = $compile("<div><span first second last></span></div>");
          expect(log[0]).toEqual("first-C");
          log.push("FLUSH");
          //expect(log.join("; ")).toEqual("first-C; FLUSH; second-C; last-C; third-C");

          element = template($rootScope);
          expect(log.join("; ")).toEqual(
            "first-C; FLUSH; second-C; last-C; third-C; " +
              "first-PreL; second-PreL; last-PreL; third-PreL; " +
              "third-PostL; last-PostL; second-PostL; first-PostL",
          );

          const span = element.find("span");
          expect(span.attr("first")).toEqual("");
          expect(span.attr("second")).toEqual("");
          expect(span.find("div").attr("third")).toEqual("");
          expect(span.attr("last")).toEqual("");

          expect(span.text()).toEqual("3");
        });

        it("should flush before link inline", () => {
          $templateCache.set("second.html", "<div i-third>{{1+2}}</div>");
          template = $compile(
            "<div><span i-first i-second i-last></span></div>",
          );
          expect(log[0]).toEqual("iFirst-C");
          log.push("FLUSH");
          element = template($rootScope);
          expect(log.join("; ")).toEqual(
            "iFirst-C; FLUSH; iSecond-C; iThird-C; iLast-C; " +
              "iFirst-PreL; iSecond-PreL; iThird-PreL; iLast-PreL; " +
              "iLast-PostL; iThird-PostL; iSecond-PostL; iFirst-PostL",
          );

          const div = element.find("div");
          expect(div.attr("i-first")).toEqual("");
          expect(div.attr("i-second")).toEqual("");
          expect(div.attr("i-third")).toEqual("");
          expect(div.attr("i-last")).toEqual("");

          expect(div.text()).toEqual("3");
        });

        it("should allow multiple elements in template", () => {
          $templateCache.set("second.html", "before <b>mid</b> after");
          element = $compile("<div second></div>")($rootScope);
          expect(element.text()).toEqual("before mid after");
        });

        it("should work when directive is on the root element", () => {
          $templateCache.set(
            "/mock/hello",
            "<span>3==<span ng-transclude></span></span>",
          );
          element = JQLite('<b hello="">{{1+2}}</b>');
          $compile(element)($rootScope);
          expect(element.text()).toEqual("3==3");
        });

        describe("replace and not exactly one root element", () => {
          beforeEach(() => {
            window.angular = new Angular();
            module = window.angular
              .module("test1", ["ng"])
              .decorator("$exceptionHandler", () => {
                return (exception) => {
                  throw new Error(exception.message);
                };
              });
            module.directive("template", () => ({
              replace: true,
              templateUrl: "template.html",
            }));
            createInjector(["test1"]).invoke(
              (_$compile_, _$rootScope_, _$templateCache_) => {
                $compile = _$compile_;
                $rootScope = _$rootScope_;
                $templateCache = _$templateCache_;
              },
            );
          });

          // TODO these functions pass when being run in isolation. investigate scope pollution
          // it("should throw if: no root element", () => {
          //   $templateCache.set("template.html", "dada");

          //   expect(() => {
          //     $compile("<p template></p>")($rootScope);
          //     ;
          //   }).toThrowError(/tplrt/);
          // });

          // it("should throw if: multiple root elements", () => {
          //   $templateCache.set("template.html", "<div></div><div></div>");

          //   expect(() => {
          //     $compile("<p template></p>")($rootScope);
          //     $rootScope.$();
          //   }).toThrowError(/tplrt/);
          // });

          it("should not throw if the root element is accompanied by: whitespace", () => {
            $templateCache.set("template.html", "<div>Hello World!</div> \n");
            element = $compile("<p template></p>")($rootScope);
            expect(() => {}).not.toThrow();
            expect(element.length).toBe(1);
            expect(element.text()).toBe("Hello World!");
          });

          it("should not throw if the root element is accompanied by: comments", () => {
            $templateCache.set(
              "template.html",
              "<!-- oh hi --><div>Hello World!</div> \n",
            );
            element = $compile("<p template></p>")($rootScope);
            expect(() => {}).not.toThrow();
            expect(element.length).toBe(1);
            expect(element.text()).toBe("Hello World!");
          });

          it("should not throw if the root element is accompanied by: comments + whitespace", () => {
            $templateCache.set(
              "template.html",
              "  <!-- oh hi -->  <div>Hello World!</div>  <!-- oh hi -->\n",
            );
            element = $compile("<p template></p>")($rootScope);
            expect(() => {}).not.toThrow();
            expect(element.length).toBe(1);
            expect(element.text()).toBe("Hello World!");
          });
        });

        it("should resume delayed compilation without duplicates when in a repeater", () => {
          // this is a test for a regression
          // scope creation, isolate watcher setup, controller instantiation, etc should happen
          // only once even if we are dealing with delayed compilation of a node due to templateUrl
          // and the template node is in a repeater

          const controllerSpy = jasmine.createSpy("controller");

          module.directive(
            "delayed",
            valueFn({
              controller: controllerSpy,
              templateUrl: "delayed.html",
              scope: {
                title: "@",
              },
            }),
          );

          createInjector(["test1"]).invoke(
            (_$compile_, _$rootScope_, _$templateCache_) => {
              $compile = _$compile_;
              $rootScope = _$rootScope_;
              $templateCache = _$templateCache_;
            },
          );

          $rootScope.coolTitle = "boom!";
          $templateCache.set("delayed.html", "<div>{{title}}</div>");
          element = $compile(
            '<div><div ng-repeat="i in [1,2]"><div delayed title="{{coolTitle + i}}"></div>|</div></div>',
          )($rootScope);

          $rootScope.$apply();
          expect(controllerSpy).toHaveBeenCalledTimes(2);
          expect(element.text()).toBe("boom!1|boom!2|");
        });

        it("should support templateUrl with replace", () => {
          // a regression https://github.com/angular/angular.js/issues/3792
          module.directive("simple", () => ({
            templateUrl: "/some.html",
            replace: true,
          }));

          createInjector(["test1"]).invoke(
            ($templateCache, $rootScope, $compile) => {
              $templateCache.set(
                "/some.html",
                '<div ng-switch="i">' +
                  '<div ng-switch-when="1">i = 1</div>' +
                  "<div ng-switch-default>I dont know what `i` is.</div>" +
                  "</div>",
              );

              element = $compile("<div simple></div>")($rootScope);

              $rootScope.$apply(() => {
                $rootScope.i = 1;
              });

              expect(element.html()).toContain("i = 1");
            },
          );
        });
      });

      it("should support templates with root <tr> tags", () => {
        $templateCache.set("tr.html", "<tr><td>TR</td></tr>");
        expect(() => {
          element = $compile("<div replace-with-tr></div>")($rootScope);
        }).not.toThrow();
        expect(getNodeName(element)).toMatch(/tr/i);
      });

      it("should support templates with root <td> tags", () => {
        $templateCache.set("td.html", "<td>TD</td>");
        expect(() => {
          element = $compile("<div replace-with-td></div>")($rootScope);
        }).not.toThrow();
        expect(getNodeName(element)).toMatch(/td/i);
      });

      it("should support templates with root <th> tags", () => {
        $templateCache.set("th.html", "<th>TH</th>");
        expect(() => {
          element = $compile("<div replace-with-th></div>")($rootScope);
        }).not.toThrow();
        expect(getNodeName(element)).toMatch(/th/i);
      });

      it("should support templates with root <thead> tags", () => {
        $templateCache.set("thead.html", "<thead><tr><td>TD</td></tr></thead>");
        expect(() => {
          element = $compile("<div replace-with-thead></div>")($rootScope);
        }).not.toThrow();
        expect(getNodeName(element)).toMatch(/thead/i);
      });

      it("should support templates with root <tbody> tags", () => {
        $templateCache.set("tbody.html", "<tbody><tr><td>TD</td></tr></tbody>");
        expect(() => {
          element = $compile("<div replace-with-tbody></div>")($rootScope);
        }).not.toThrow();
        expect(getNodeName(element)).toMatch(/tbody/i);
      });

      it("should support templates with root <tfoot> tags", () => {
        $templateCache.set("tfoot.html", "<tfoot><tr><td>TD</td></tr></tfoot>");
        expect(() => {
          element = $compile("<div replace-with-tfoot></div>")($rootScope);
        }).not.toThrow();
        expect(getNodeName(element)).toMatch(/tfoot/i);
      });

      it("should support templates with root <option> tags", () => {
        $templateCache.set("option.html", "<option>OPTION</option>");
        expect(() => {
          element = $compile("<div replace-with-option></div>")($rootScope);
        }).not.toThrow();
        expect(getNodeName(element)).toMatch(/option/i);
      });

      it("should support templates with root <optgroup> tags", () => {
        $templateCache.set("optgroup.html", "<optgroup>OPTGROUP</optgroup>");
        expect(() => {
          element = $compile("<div replace-with-optgroup></div>")($rootScope);
        }).not.toThrow();
        expect(getNodeName(element)).toMatch(/optgroup/i);
      });

      it("should support SVG templates using directive.templateNamespace=svg", () => {
        myModule.directive(
          "svgAnchor",
          valueFn({
            replace: true,
            templateUrl: "template.html",
            templateNamespace: "SVG",
            scope: {
              linkurl: "@svgAnchor",
              text: "@?",
            },
          }),
        );
        createInjector(["myModule"]).invoke(
          ($templateCache, $rootScope, $compile) => {
            $templateCache.set(
              "template.html",
              '<a xlink:href="{{linkurl}}">{{text}}</a>',
            );
            element = $compile(
              '<svg><g svg-anchor="/foo/bar" text="foo/bar!"></g></svg>',
            )($rootScope);
            const child = element.children().eq(0);
            expect(getNodeName(child)).toMatch(/a/i);
            expect(isSVGElement(child[0])).toBe(true);
            expect(child[0].href.baseVal).toBe("/foo/bar");
          },
        );
      });

      it("should support MathML templates using directive.templateNamespace=math", () => {
        myModule.directive(
          "pow",
          valueFn({
            replace: true,
            transclude: true,
            templateUrl: "template.html",
            templateNamespace: "math",
            scope: {
              pow: "@pow",
            },
            link(scope, elm, attr, ctrl, transclude) {
              transclude((node) => {
                elm.prepend(node[0]);
              });
            },
          }),
        );
        createInjector(["myModule"]).invoke(
          ($templateCache, $rootScope, $compile) => {
            $templateCache.set(
              "template.html",
              "<msup><mn>{{pow}}</mn></msup>",
            );
            element = $compile('<math><mn pow="2"><mn>8</mn></mn></math>')(
              $rootScope,
            );
            const child = element.children().eq(0);
            expect(getNodeName(child)).toMatch(/msup/i);
            expect(isUnknownElement(child[0])).toBe(false);
            expect(isHTMLElement(child[0])).toBe(false);
          },
        );
      });

      it("should keep prototype properties on sync version of async directive", () => {
        function DirectiveClass() {
          this.restrict = "E";
          this.templateUrl = "test.html";
        }

        DirectiveClass.prototype.compile = () => {
          return function (scope, element, attrs) {
            scope.value = "Test Value";
          };
        };

        myModule.directive(
          "templateUrlWithPrototype",
          valueFn(new DirectiveClass()),
        );

        createInjector(["myModule"]).invoke(
          ($templateCache, $rootScope, $compile) => {
            $templateCache.set("test.html", "<p>{{value}}</p>");
            element = $compile(
              "<template-url-with-prototype><template-url-with-prototype>",
            )($rootScope);
            expect(element.find("p")[0].innerHTML).toEqual("Test Value");
          },
        );
      });
    });

    describe("templateUrl as function", () => {
      it("should evaluate `templateUrl` when defined as fn and use returned value as url", () => {
        window.angular.module("test1", ["ng"]).directive(
          "myDirective",
          valueFn({
            replace: true,
            templateUrl($element, $attrs) {
              expect($element.text()).toBe("original content");
              expect($attrs.myDirective).toBe("some value");
              return "my-directive.html";
            },
            compile($element, $attrs) {
              expect($element.text()).toBe("template content");
              expect($attrs.id).toBe("templateContent");
            },
          }),
        );

        createInjector(["test1"]).invoke(
          ($templateCache, $rootScope, $compile) => {
            $templateCache.set(
              "my-directive.html",
              '<div id="templateContent">template content</span>',
            );
            element = $compile(
              '<div my-directive="some value">original content<div>',
            )($rootScope);
            expect(element.text()).toEqual("");

            expect(element.text()).toEqual("template content");
          },
        );
      });
    });

    describe("scope", () => {
      let iscope, module;

      beforeEach(() => {
        log = [];

        window.angular = new Angular();
        module = window.angular
          .module("test1", ["ng"])
          .decorator("$exceptionHandler", () => {
            return (exception) => {
              log.push(exception.message);
            };
          });

        ["", "a", "b"].forEach((name) => {
          module
            .directive(`scope${name.toUpperCase()}`, () => ({
              scope: true,
              restrict: "A",
              compile() {
                return {
                  pre(scope) {
                    log.push(scope.$id);
                  },
                };
              },
            }))
            .directive(`iscope${name.toUpperCase()}`, () => ({
              scope: {},
              restrict: "A",
              compile() {
                return function (scope) {
                  iscope = scope;
                  log.push(scope.$id);
                };
              },
            }))
            .directive(`tscope${name.toUpperCase()}`, () => ({
              scope: true,
              restrict: "A",
              templateUrl: "tscope.html",
              compile() {
                return function (scope) {
                  log.push(scope.$id);
                };
              },
            }))
            .directive(`stscope${name.toUpperCase()}`, () => ({
              scope: true,
              restrict: "A",
              template: "<span></span>",
              compile() {
                return function (scope) {
                  log.push(scope.$id);
                };
              },
            }));
          module.directive(`trscope${name.toUpperCase()}`, () => ({
            scope: true,
            replace: true,
            restrict: "A",
            templateUrl: "trscope.html",
            compile() {
              return function (scope) {
                log.push(scope.$id);
              };
            },
          }));
          module.directive(`tiscope${name.toUpperCase()}`, () => ({
            scope: {},
            restrict: "A",
            templateUrl: "tiscope.html",
            compile() {
              return function (scope) {
                iscope = scope;
                log.push(scope.$id);
              };
            },
          }));
          module.directive(`stiscope${name.toUpperCase()}`, () => ({
            scope: {},
            restrict: "A",
            template: "<span></span>",
            compile() {
              return function (scope) {
                iscope = scope;
                log.push(scope.$id);
              };
            },
          }));
        });
        module.directive("log", () => ({
          restrict: "A",
          link: {
            pre(scope) {
              log.push(
                `log-${scope.$id}-${(scope.$parent && scope.$parent.$id) || "no-parent"}`,
              );
            },
          },
        }));
        module
          .directive("prototypeMethodNameAsScopeVarA", () => ({
            scope: {
              constructor: "=?",
              valueOf: "=",
            },
            restrict: "AE",
            template: "<span></span>",
          }))
          .directive("prototypeMethodNameAsScopeVarB", () => ({
            scope: {
              constructor: "@?",
              valueOf: "@",
            },
            restrict: "AE",
            template: "<span></span>",
          }))
          .directive("prototypeMethodNameAsScopeVarC", () => ({
            scope: {
              constructor: "&?",
              valueOf: "&",
            },
            restrict: "AE",
            template: "<span></span>",
          }))
          .directive("prototypeMethodNameAsScopeVarD", () => ({
            scope: {
              constructor: "<?",
              valueOf: "<",
            },
            restrict: "AE",
            template: "<span></span>",
          }))
          .directive("watchAsScopeVar", () => ({
            scope: {
              watch: "=",
            },
            restrict: "AE",
            template: "<span></span>",
          }));

        createInjector(["test1"]).invoke(
          (_$compile_, _$rootScope_, _$templateCache_) => {
            $compile = _$compile_;
            $rootScope = _$rootScope_;
            $templateCache = _$templateCache_;
          },
        );
      });

      it("should allow creation of new scopes", () => {
        element = $compile("<div><span scope><a log></a></span></div>")(
          $rootScope,
        );
        expect(log.length).toEqual(2);
      });

      it("should allow creation of new isolated scopes for directives", () => {
        element = $compile("<div><span iscope><a log></a></span></div>")(
          $rootScope,
        );
        expect(log.length).toEqual(2);
        $rootScope.name = "abc";
        expect(iscope.$parent).toBe($rootScope);
        expect(iscope.name).toBeUndefined();
      });

      it("should allow creation of new scopes for directives with templates", () => {
        $templateCache.set(
          "tscope.html",
          "<a log>{{name}}; scopeId: {{$id}}</a>",
        );
        element = $compile("<div><span tscope></span></div>")($rootScope);
        expect(log.length).toEqual(2);
        $rootScope.name = "Jozo";
        $rootScope.$apply();
        expect(element.text().match(/Jozo/)).toBeTruthy();
      });

      it("should allow creation of new scopes for replace directives with templates", () => {
        $templateCache.set(
          "trscope.html",
          "<p><a log>{{name}}; scopeId: {{$id}}</a></p>",
        );
        element = $compile("<div><span trscope></span></div>")($rootScope);
        expect(log.length).toEqual(2);
        $rootScope.name = "Jozo";
        $rootScope.$apply();
        expect(element.text().match(/Jozo/)).toBeTruthy();
      });

      it("should allow creation of new scopes for replace directives with templates in a repeater", () => {
        $templateCache.set("trscope.html", "<p><a log>{{name}}|</a></p>");
        element = $compile(
          '<div><span ng-repeat="i in [1,2,3]" trscope></span></div>',
        )($rootScope);
        expect(log.length).toEqual(6);
        $rootScope.name = "Jozo";
        $rootScope.$apply();
        expect(element.text()).toBe("Jozo|Jozo|Jozo|");
      });

      it("should allow creation of new isolated scopes for directives with templates", () => {
        $templateCache.set("tiscope.html", "<a log></a>");
        element = $compile("<div><span tiscope></span></div>")($rootScope);
        expect(log.length).toEqual(2);
        $rootScope.name = "abc";
        expect(iscope.$parent).toBe($rootScope);
        expect(iscope.name).toBeUndefined();
      });

      it("should correctly create the scope hierarchy", () => {
        element = $compile(
          "<div>" + // 1
            "<b scope>" + // 2
            "<b scope><b log></b></b>" + // 3
            "<b log></b>" +
            "</b>" +
            "<b scope>" + // 4
            "<b log></b>" +
            "</b>" +
            "</div>",
        )($rootScope);
        expect(log.length).toEqual(6);
      });

      it("should allow more than one new scope directives per element, but directives should share the scope", () => {
        element = $compile("<div scope-a scope-b></div>")($rootScope);
        expect(log.length).toEqual(2);
      });

      it("should not allow more than one isolate scope creation per element", () => {
        expect(() => {
          $compile("<div iscope-a scope-b></div>")($rootScope);
        }).toThrowError(/multidir/);
      });

      it("should not allow more than one isolate/new scope creation per element regardless of `templateUrl`", () => {
        $templateCache.set("tiscope.html", "<div>Hello, world !</div>");
        $compile("<div tiscope-a scope-b></div>")($rootScope);
        expect(log[0].match(/multidir/)).toBeTruthy();
      });

      it("should create new scope even at the root of the template", () => {
        element = $compile("<div scope-a></div>")($rootScope);
        expect(log.length).toEqual(1);
      });

      it("should create isolate scope even at the root of the template", () => {
        element = $compile("<div iscope></div>")($rootScope);
        expect(log.length).toEqual(1);
      });

      describe("scope()/isolate() scope getters", () => {
        describe("with new scope directives", () => {
          it("should return the new scope at the directive element", () => {
            element = $compile("<div scope></div>")($rootScope);
            expect($rootScope.$$childHead.$parent).toBe($rootScope);
          });

          it("should return the new scope for children in the original template", () => {
            element = $compile("<div scope><a></a></div>")($rootScope);
            expect($rootScope.$$childHead.$parent).toBe($rootScope);
          });

          it("should return the new scope for children in the directive template", () => {
            $templateCache.set("tscope.html", "<a></a>");
            element = $compile("<div tscope></div>")($rootScope);
            expect($rootScope.$$childHead.$parent).toBe($rootScope);
          });

          it("should return the new scope for children in the directive sync template", () => {
            element = $compile("<div stscope></div>")($rootScope);
            expect($rootScope.$$childHead.$parent).toBe($rootScope);
          });
        });

        describe("with isolate scope directives", () => {
          it("should return the non-isolate scope at the directive element", () => {
            expect($rootScope.$$childHead).toBeNull();
            let directiveElement;
            element = $compile("<div><div iscope></div></div>")($rootScope);
            directiveElement = element.children();
            expect($rootScope.$$childHead.$parent).toBe($rootScope);
          });

          it("should return the isolate scope for children in the original template", () => {
            element = $compile("<div iscope><a></a></div>")($rootScope);
            expect($rootScope.$$childHead.$parent).toBe($rootScope); // xx
          });

          it("should return the isolate scope for children in directive template", () => {
            $templateCache.set("tiscope.html", "<a></a>");
            element = $compile("<div tiscope></div>")($rootScope);
            expect($rootScope.$$childHead).toBeDefined(); // ??? this is the current behavior, not desired feature
            expect($rootScope.$$childHead).not.toBe($rootScope);
          });

          it("should return the isolate scope for children in directive sync template", () => {
            element = $compile("<div stiscope></div>")($rootScope);
            expect($rootScope.$$childHead).not.toBe($rootScope);
          });

          it('should handle "=" bindings with same method names in Object.prototype correctly when not present', () => {
            const func = () => {
              element = $compile(
                "<div prototype-method-name-as-scope-var-a></div>",
              )($rootScope);
            };

            expect(func).not.toThrow();
            const scope = $rootScope.$$childHead;
            expect(scope).not.toBe($rootScope);

            // Not shadowed because optional
            expect(scope.constructor).toBe($rootScope.constructor);
            expect(scope.hasOwnProperty("constructor")).toBe(false);

            // Shadowed with undefined because not optional
            expect(scope.valueOf).toBeUndefined();
            expect(scope.hasOwnProperty("valueOf")).toBe(true);
          });

          it('should handle "=" bindings with same method names in Object.prototype correctly when present', () => {
            $rootScope.constructor = "constructor";
            $rootScope.valueOf = "valueOf";
            const func = () => {
              element = $compile(
                '<div prototype-method-name-as-scope-var-a constructor="constructor" value-of="valueOf"></div>',
              )($rootScope);
            };

            expect(func).not.toThrow();
            const scope = $rootScope.$$childHead;
            expect(scope).not.toBe($rootScope);
            expect(scope.constructor).toBe("constructor");
            expect(scope.hasOwnProperty("constructor")).toBe(true);
            expect(scope.valueOf).toBe("valueOf");
            expect(scope.hasOwnProperty("valueOf")).toBe(true);
          });

          describe("strictComponentBindingsEnabled", () => {
            beforeEach(() => {
              myModule
                .directive("prototypeMethodNameAsScopeVarA", () => ({
                  scope: {
                    constructor: "=?",
                    valueOf: "=",
                  },
                  restrict: "AE",
                  template: "<span></span>",
                }))
                .directive("prototypeMethodNameAsScopeVarB", () => ({
                  scope: {
                    constructor: "@?",
                    valueOf: "@",
                  },
                  restrict: "AE",
                  template: "<span></span>",
                }))
                .directive("prototypeMethodNameAsScopeVarC", () => ({
                  scope: {
                    constructor: "&?",
                    valueOf: "&",
                  },
                  restrict: "AE",
                  template: "<span></span>",
                }))
                .directive("prototypeMethodNameAsScopeVarD", () => ({
                  scope: {
                    constructor: "<?",
                    valueOf: "<",
                  },
                  restrict: "AE",
                  template: "<span></span>",
                }));
              injector = createInjector([
                "myModule",
                ($compileProvider) => {
                  $compileProvider.strictComponentBindingsEnabled(true);
                },
              ]);
              reloadInjector();
            });

            it('should throw an error for undefined non-optional "=" bindings when  strictComponentBindingsEnabled is true', () => {
              const func = () => {
                element = $compile(
                  "<div prototype-method-name-as-scope-var-a></div>",
                )($rootScope);
              };
              expect(func).toThrowError(/missingattr/);
            });

            it('should throw an error for undefined non-optional "@" bindings when strictComponentBindingsEnabled is true', () => {
              const func = () => {
                element = $compile(
                  "<div prototype-method-name-as-scope-var-b></div>",
                )($rootScope);
              };
              expect(func).toThrowError(/missingattr/);
            });

            it('should throw an error for undefined non-optional "&" bindings when strictComponentBindingsEnabled is true', () => {
              const func = () => {
                element = $compile(
                  "<div prototype-method-name-as-scope-var-c></div>",
                )($rootScope);
              };
              expect(func).toThrowError(/missingattr/);
            });

            it('should not throw an error for set non-optional "@" bindings when strictComponentBindingsEnabled is true', () => {
              const func = () => {
                element = $compile(
                  '<div prototype-method-name-as-scope-var-b constructor="constructor" value-of="valueOf"></div>',
                )($rootScope);
              };
              expect(func).not.toThrow();
            });

            it('should not throw an error for undefined optional "@" bindings when strictComponentBindingsEnabled is true', () => {
              const func = () => {
                element = $compile(
                  '<div prototype-method-name-as-scope-var-b value-of="valueOf"></div>',
                )($rootScope);
              };
              expect(func).not.toThrow();
            });

            it('should not throw an error for set non-optional "=" bindings when strictComponentBindingsEnabled is true', () => {
              const func = () => {
                element = $compile(
                  '<div prototype-method-name-as-scope-var-a constructor="constructor" value-of="valueOf"></div>',
                )($rootScope);
              };
              expect(func).not.toThrow();
            });

            it('should not throw an error for undefined optional "=" bindings when strictComponentBindingsEnabled is true', () => {
              const func = () => {
                element = $compile(
                  '<div prototype-method-name-as-scope-var-a value-of="valueOf"></div>',
                )($rootScope);
              };
              expect(func).not.toThrow();
            });

            it('should not throw an error for set non-optional "&" bindings when strictComponentBindingsEnabled is true', () => {
              const func = () => {
                element = $compile(
                  '<div prototype-method-name-as-scope-var-c constructor="constructor" value-of="valueOf"></div>',
                )($rootScope);
              };
              expect(func).not.toThrow();
            });

            it('should not throw an error for undefined optional "&" bindings when strictComponentBindingsEnabled is true', () => {
              const func = () => {
                element = $compile(
                  '<div prototype-method-name-as-scope-var-c value-of="valueOf"></div>',
                )($rootScope);
              };
              expect(func).not.toThrow();
            });

            it('should throw an error for undefined non-optional "<" bindings when strictComponentBindingsEnabled is true', () => {
              const func = () => {
                element = $compile(
                  "<div prototype-method-name-as-scope-var-d></div>",
                )($rootScope);
              };
              expect(func).toThrowError(/missingattr/);
            });

            it('should not throw an error for set non-optional "<" bindings when strictComponentBindingsEnabled is true', () => {
              const func = () => {
                element = $compile(
                  '<div prototype-method-name-as-scope-var-d constructor="constructor" value-of="valueOf"></div>',
                )($rootScope);
              };
              expect(func).not.toThrow();
            });

            it('should not throw an error for undefined optional "<" bindings when strictComponentBindingsEnabled is true', () => {
              const func = () => {
                element = $compile(
                  '<div prototype-method-name-as-scope-var-d value-of="valueOf"></div>',
                )($rootScope);
              };
              expect(func).not.toThrow();
            });
          });
        });

        it('should handle "@" bindings with same method names in Object.prototype correctly when not present', () => {
          const func = () => {
            element = $compile(
              "<div prototype-method-name-as-scope-var-b></div>",
            )($rootScope);
          };

          expect(func).not.toThrow();
          const scope = $rootScope.$$childHead;
          expect(scope).not.toBe($rootScope);

          // Does not shadow value because optional
          expect(scope.constructor).toBe($rootScope.constructor);
          expect(scope.hasOwnProperty("constructor")).toBe(false);

          // Shadows value because not optional
          expect(scope.valueOf).toBeUndefined();
          expect(scope.hasOwnProperty("valueOf")).toBe(true);
        });

        it('should handle "@" bindings with same method names in Object.prototype correctly when present', () => {
          const func = () => {
            element = $compile(
              '<div prototype-method-name-as-scope-var-b constructor="constructor" value-of="valueOf"></div>',
            )($rootScope);
          };

          expect(func).not.toThrow();
          const scope = $rootScope.$$childHead;
          expect(scope).not.toBe($rootScope);
          expect(scope.constructor).toBe("constructor");
          expect(scope.valueOf).toBe("valueOf");
        });

        it('should handle "&" bindings with same method names in Object.prototype correctly when not present', () => {
          const func = () => {
            element = $compile(
              "<div prototype-method-name-as-scope-var-c></div>",
            )($rootScope);
          };

          expect(func).not.toThrow();
          const scope = $rootScope.$$childHead;
          expect(scope).not.toBe($rootScope);
          expect(scope.constructor).toBe($rootScope.constructor);
          expect(scope.valueOf()).toBeUndefined();
        });

        it('should handle "&" bindings with same method names in Object.prototype correctly when present', () => {
          $rootScope.constructor = function () {
            return "constructor";
          };
          $rootScope.valueOf = function () {
            return "valueOf";
          };
          const func = () => {
            element = $compile(
              '<div prototype-method-name-as-scope-var-c constructor="constructor()" value-of="valueOf()"></div>',
            )($rootScope);
          };

          expect(func).not.toThrow();
          const scope = $rootScope.$$childHead;
          expect(scope).not.toBe($rootScope);
          expect(scope.constructor()).toBe("constructor");
          expect(scope.valueOf()).toBe("valueOf");
        });

        it("should handle @ bindings on BOOLEAN attributes", () => {
          let checkedVal;
          myModule.directive("test", () => ({
            scope: { checked: "@" },
            link(scope, element, attrs) {
              checkedVal = scope.checked;
            },
          }));
          injector = createInjector(["myModule"]);
          reloadInjector();
          $compile('<input test checked="checked">')($rootScope);
          expect(checkedVal).toEqual(true);
        });

        it("should handle updates to @ bindings on BOOLEAN attributes", () => {
          let componentScope;
          myModule.directive("test", () => ({
            scope: { checked: "@" },
            link(scope, element, attrs) {
              componentScope = scope;
              attrs.$set("checked", true);
            },
          }));
          injector = createInjector(["myModule"]);
          reloadInjector();
          $compile("<test></test>")($rootScope);
          expect(componentScope.checked).toBe(true);
        });
      });

      //       describe("with isolate scope directives and directives that manually create a new scope", () => {
      //         it("should return the new scope at the directive element", () => {
      //           let directiveElement;
      //           element = $compile('<div><a ng-if="true" iscope></a></div>')(
      //             $rootScope,
      //           );
      //           $rootScope.$apply();
      //           directiveElement = element.find("a");
      //           expect(directiveElement.scope().$parent).toBe($rootScope);
      //           expect(directiveElement.scope()).not.toBe(
      //             directiveElement.isolateScope(),
      //           );
      //         });

      //         it("should return the isolate scope for child elements", () => {
      //           let directiveElement;
      //           let child;
      //           $templateCache.set("tiscope.html", "<span></span>");
      //           element = $compile('<div><a ng-if="true" tiscope></a></div>')(
      //             $rootScope,
      //           );
      //           $rootScope.$apply();
      //           ;
      //           directiveElement = element.find("a");
      //           child = directiveElement.find("span");
      //           expect(child.scope()).toBe(directiveElement.isolateScope());
      //         });

      //         it("should return the isolate scope for child elements in directive sync template", () => {
      //           let directiveElement;
      //           let child;
      //           element = $compile('<div><a ng-if="true" stiscope></a></div>')(
      //             $rootScope,
      //           );
      //           $rootScope.$apply();
      //           directiveElement = element.find("a");
      //           child = directiveElement.find("span");
      //           expect(child.scope()).toBe(directiveElement.isolateScope());
      //         });
      //       });
      //     });

      //     describe("multidir isolated scope error messages", () => {
      //       angular
      //         .module("fakeIsoledScopeModule", [])
      //         .directive("fakeScope", () => ({
      //           scope: true,
      //           restrict: "A",
      //           compile() {
      //             return {
      //               pre(scope, element) {
      //                 log.push(scope.$id);
      //                 expect(element.data("$scope")).toBe(scope);
      //               },
      //             };
      //           },
      //         }))
      //         .directive("fakeIScope", () => ({
      //           scope: {},
      //           restrict: "A",
      //           compile() {
      //             return function (scope, element) {
      //               iscope = scope;
      //               log.push(scope.$id);
      //               expect(element.data("$isolateScopeNoTemplate")).toBe(scope);
      //             };
      //           },
      //         });

      //       beforeEach(
      //         module("fakeIsoledScopeModule", () => {
      //           directive("anonymModuleScopeDirective", () => ({
      //             scope: true,
      //             restrict: "A",
      //             compile() {
      //               return {
      //                 pre(scope, element) {
      //                   log.push(scope.$id);
      //                   expect(element.data("$scope")).toBe(scope);
      //                 },
      //               };
      //             },
      //           });
      //         }),
      //       );

      //       it("should add module name to multidir isolated scope message if directive defined through module", () => {
      //         expect(() => {
      //           $compile('<div class="fake-scope; fake-i-scope"></div>');
      //         }).toThrowError(
      //           "$compile",
      //           "multidir",
      //           "Multiple directives [fakeIScope (module: fakeIsoledScopeModule), fakeScope (module: fakeIsoledScopeModule)] " +
      //             'asking for new/isolated scope on: <div class="fake-scope; fake-i-scope">',
      //         );
      //       });

      //       it("shouldn't add module name to multidir isolated scope message if directive is defined directly with $compileProvider", () => {
      //         expect(() => {
      //           $compile(
      //             '<div class="anonym-module-scope-directive; fake-i-scope"></div>',
      //           );
      //         }).toThrowError(
      //           "$compile",
      //           "multidir",
      //           "Multiple directives [anonymModuleScopeDirective, fakeIScope (module: fakeIsoledScopeModule)] " +
      //             'asking for new/isolated scope on: <div class="anonym-module-scope-directive; fake-i-scope">',
      //         );
      //       });
      //     });
    });

    describe("interpolation", () => {
      let observeSpy;
      let directiveAttrs;
      let deregisterObserver;
      let module;
      let $sce;

      beforeEach(() => {
        log = [];
        module = window.angular.module("test1", ["ng"]);
        module
          .directive(
            "observer",
            () =>
              function (scope, elm, attr) {
                directiveAttrs = attr;
                observeSpy = jasmine.createSpy("$observe attr");
                deregisterObserver = attr.$observe("someAttr", observeSpy);
              },
          )
          .directive(
            "replaceSomeAttr",
            valueFn({
              compile(element, attr) {
                attr.$set("someAttr", "bar-{{1+1}}");
                expect(element).toBe(attr.$$element);
              },
            }),
          );
        dealoc(document.getElementById("dummy"));
        window.angular
          .bootstrap(document.getElementById("dummy"), ["test1"])
          .invoke((_$compile_, _$rootScope_, _$templateCache_, _$sce_) => {
            $compile = _$compile_;
            $rootScope = _$rootScope_;
            $templateCache = _$templateCache_;
            $sce = _$sce_;
          });
      });

      it("should compile and link both attribute and text bindings", () => {
        $rootScope.name = "angular";
        element = $compile('<div name="attr: {{name}}">text: {{name}}</div>')(
          $rootScope,
        );
        expect(element.text()).toEqual("text: angular");
        expect(element.attr("name")).toEqual("attr: angular");
      });

      it("should one-time bind if the expression starts with two colons", () => {
        $rootScope.name = "angular";
        element = $compile(
          '<div name="attr: {{::name}}">text: {{::name}}</div>',
        )($rootScope);
        expect($rootScope.$$watchers.length).toBe(2);
        expect(element.text()).toEqual("text: angular");
        expect(element.attr("name")).toEqual("attr: angular");
        expect($rootScope.$$watchers.length).toBe(0);
        $rootScope.name = "not-angular";
        expect(element.text()).toEqual("text: angular");
        expect(element.attr("name")).toEqual("attr: angular");
      });

      it("should one-time bind if the expression starts with a space and two colons", () => {
        $rootScope.name = "angular";
        element = $compile(
          '<div name="attr: {{::name}}">text: {{ ::name }}</div>',
        )($rootScope);
        expect($rootScope.$$watchers.length).toBe(2);
        expect(element.text()).toEqual("text: angular");
        expect(element.attr("name")).toEqual("attr: angular");
        expect($rootScope.$$watchers.length).toBe(0);
        $rootScope.name = "not-angular";
        expect(element.text()).toEqual("text: angular");
        expect(element.attr("name")).toEqual("attr: angular");
      });

      it("should interpolate a multi-part expression for regular attributes", () => {
        element = $compile('<div foo="some/{{id}}"></div>')($rootScope);
        expect(element.attr("foo")).toBe("some/");
        $rootScope.$apply(() => {
          $rootScope.id = 1;
        });
        expect(element.attr("foo")).toEqual("some/1");
      });

      it("should process attribute interpolation in pre-linking phase at priority 100", () => {
        module
          .directive("attrLog", () => ({
            compile($element, $attrs) {
              log.push(`compile=${$attrs.myName}`);

              return {
                pre($scope, $element, $attrs) {
                  log.push(`preLinkP0=${$attrs.myName}`);
                },
                post($scope, $element, $attrs) {
                  log.push(`postLink=${$attrs.myName}`);
                },
              };
            },
          }))
          .directive("attrLogHighPriority", () => ({
            priority: 101,
            compile() {
              return {
                pre($scope, $element, $attrs) {
                  log.push(`preLinkP101=${$attrs.myName}`);
                },
              };
            },
          }));

        createInjector(["test1"]).invoke(
          (_$compile_, _$rootScope_, _$templateCache_) => {
            $compile = _$compile_;
            $rootScope = _$rootScope_;
            $templateCache = _$templateCache_;
          },
        );

        element = $compile(
          '<div attr-log-high-priority attr-log my-name="{{name}}"></div>',
        )($rootScope);
        $rootScope.name = "angular";
        $rootScope.$apply();
        log.push(`digest=${element.attr("my-name")}`);
        expect(log.join("; ")).toEqual(
          "compile={{name}}; preLinkP101={{name}}; preLinkP0=; postLink=; digest=angular",
        );
      });

      it("should allow the attribute to be removed before the attribute interpolation", () => {
        module.directive("removeAttr", () => ({
          restrict: "A",
          compile(tElement, tAttr) {
            tAttr.$set("removeAttr", null);
          },
        }));

        createInjector(["test1"]).invoke(
          (_$compile_, _$rootScope_, _$templateCache_) => {
            $compile = _$compile_;
            $rootScope = _$rootScope_;
            $templateCache = _$templateCache_;
          },
        );

        expect(() => {
          element = $compile('<div remove-attr="{{ toBeRemoved }}"></div>')(
            $rootScope,
          );
        }).not.toThrow();
        expect(element.attr("remove-attr")).toBeUndefined();
      });

      describe("SCE values", () => {
        it("should resolve compile and link both attribute and text bindings", () => {
          $rootScope.name = $sce.trustAsHtml("angular");
          element = $compile('<div name="attr: {{name}}">text: {{name}}</div>')(
            $rootScope,
          );
          expect(element.text()).toEqual("text: angular");
          expect(element.attr("name")).toEqual("attr: angular");
        });
      });

      it("should observe interpolated attrs", () => {
        $compile('<div some-attr="{{value}}" observer></div>')($rootScope);

        // should be async
        expect(observeSpy).not.toHaveBeenCalled();

        $rootScope.$apply(() => {
          $rootScope.value = "bound-value";
        });
        expect(observeSpy).toHaveBeenCalledOnceWith("bound-value");
      });

      it("should return a deregistration function while observing an attribute", () => {
        $compile('<div some-attr="{{value}}" observer></div>')($rootScope);

        $rootScope.$apply('value = "first-value"');
        expect(observeSpy).toHaveBeenCalledWith("first-value");

        deregisterObserver();
        $rootScope.$apply('value = "new-value"');
        expect(observeSpy).not.toHaveBeenCalledWith("new-value");
      });

      it("should set interpolated attrs to initial interpolation value", () => {
        // we need the interpolated attributes to be initialized so that linking fn in a component
        // can access the value during link
        $rootScope.whatever = "test value";
        $compile('<div some-attr="{{whatever}}" observer></div>')($rootScope);
        expect(directiveAttrs.someAttr).toBe($rootScope.whatever);
      });

      it("should allow directive to replace interpolated attributes before attr interpolation compilation", () => {
        element = $compile(
          '<div some-attr="foo-{{1+1}}" replace-some-attr></div>',
        )($rootScope);
        expect(element.attr("some-attr")).toEqual("bar-2");
      });

      it("should call observer of non-interpolated attr through $evalAsync", () => {
        $compile('<div some-attr="nonBound" observer></div>')($rootScope);
        expect(directiveAttrs.someAttr).toBe("nonBound");

        expect(observeSpy).not.toHaveBeenCalled();
        expect(observeSpy).toHaveBeenCalled();
      });

      it("should support non-interpolated `src` and `data-src` on the same element", () => {
        const element = $compile('<img src="abc" data-src="123">')($rootScope);
        expect(element.attr("src")).toEqual("abc");
        expect(element.attr("data-src")).toEqual("123");
        expect(element.attr("src")).toEqual("abc");
        expect(element.attr("data-src")).toEqual("123");
      });

      it("should call observer only when the attribute value changes", () => {
        module.directive("observingDirective", () => ({
          restrict: "E",
          scope: { someAttr: "@" },
        }));

        createInjector(["test1"]).invoke(
          (_$compile_, _$rootScope_, _$templateCache_) => {
            $compile = _$compile_;
            $rootScope = _$rootScope_;
            $templateCache = _$templateCache_;
          },
        );
        $compile("<observing-directive observer></observing-directive>")(
          $rootScope,
        );
        expect(observeSpy).not.toHaveBeenCalledWith(undefined);
      });

      it("should delegate exceptions to $exceptionHandler", () => {
        observeSpy = jasmine.createSpy("$observe attr").and.throwError("ERROR");

        module.directive(
          "error",
          () =>
            function (scope, elm, attr) {
              attr.$observe("someAttr", observeSpy);
              attr.$observe("someAttr", observeSpy);
            },
        );

        createInjector(["test1"]).invoke(
          (_$compile_, _$rootScope_, _$templateCache_) => {
            $compile = _$compile_;
            $rootScope = _$rootScope_;
            $templateCache = _$templateCache_;
          },
        );

        $compile('<div some-attr="{{value}}" error></div>')($rootScope);
        expect(observeSpy).toHaveBeenCalled();
        expect(observeSpy).toHaveBeenCalledTimes(2);
      });

      it("should translate {{}} in terminal nodes", () => {
        element = $compile(
          '<select ng-model="x"><option value="">Greet {{name}}!</option></select>',
        )($rootScope);
        expect(
          element[0].outerHTML.replace(' selected="selected"', ""),
        ).toEqual(
          '<select ng-model="x" class="ng-pristine ng-untouched ng-valid ng-empty" aria-invalid="false">' +
            '<option value="">Greet !</option>' +
            "</select>",
        );
        $rootScope.name = "Misko";
        expect(
          element[0].outerHTML.replace(' selected="selected"', ""),
        ).toEqual(
          '<select ng-model="x" class="ng-pristine ng-untouched ng-valid ng-empty" aria-invalid="false">' +
            '<option value="">Greet Misko!</option>' +
            "</select>",
        );
      });

      it("should handle consecutive text elements as a single text element", () => {
        // Create and register the MutationObserver
        const observer = new window.MutationObserver(() => {});
        observer.observe(document.body, { childList: true, subtree: true });

        // Run the actual test
        const base = JQLite('<div>&mdash; {{ "This doesn\'t." }}</div>');
        element = $compile(base)($rootScope);
        expect(element.text()).toBe("— This doesn't.");

        // Unregister the MutationObserver (and hope it doesn't mess up with subsequent tests)
        observer.disconnect();
      });

      it("should not process text nodes merged into their sibling", () => {
        const div = document.createElement("div");
        div.appendChild(document.createTextNode("1{{ value }}"));
        div.appendChild(document.createTextNode("2{{ value }}"));
        div.appendChild(document.createTextNode("3{{ value }}"));

        element = JQLite(div.childNodes);
        $compile(element)($rootScope);
        $rootScope.$apply("value = 0");

        expect(element.text()).toBe("102030");
        dealoc(div);
      });

      it("should support custom start/end interpolation symbols in template and directive template", () => {
        createInjector([
          "test1",
          ($interpolateProvider, $compileProvider) => {
            $interpolateProvider.startSymbol("##").endSymbol("]]");
            $compileProvider.directive("myDirective", () => ({
              template: "<span>{{hello}}|{{hello}}</span>",
            }));
          },
        ]).invoke((_$compile_, _$rootScope_, _$templateCache_) => {
          $compile = _$compile_;
          $rootScope = _$rootScope_;
          $templateCache = _$templateCache_;
        });

        element = $compile("<div>##hello]]|<div my-directive></div></div>")(
          $rootScope,
        );
        $rootScope.hello = "ahoj";
        expect(element.text()).toBe("ahoj|ahoj|ahoj");
      });

      it("should support custom start interpolation symbol, even when `endSymbol` doesn't change", () => {
        createInjector([
          "test1",
          ($interpolateProvider, $compileProvider) => {
            $interpolateProvider.startSymbol("[[");
            $compileProvider.directive("myDirective", () => ({
              template: "<span>{{ hello }}|{{ hello}}</span>",
            }));
          },
        ]).invoke((_$compile_, _$rootScope_, _$templateCache_) => {
          $compile = _$compile_;
          $rootScope = _$rootScope_;
          $templateCache = _$templateCache_;
        });
        const tmpl = "<div>[[ hello }}|<div my-directive></div></div>";
        element = $compile(tmpl)($rootScope);

        $rootScope.hello = "ahoj";
        expect(element.text()).toBe("ahoj|ahoj|ahoj");
      });

      it("should support custom end interpolation symbol, even when `startSymbol` doesn't change", () => {
        createInjector([
          "test1",
          ($interpolateProvider, $compileProvider) => {
            $interpolateProvider.endSymbol("]]");
            $compileProvider.directive("myDirective", () => ({
              template: "<span>{{ hello }}|{{ hello }}</span>",
            }));
          },
        ]).invoke((_$compile_, _$rootScope_, _$templateCache_) => {
          $compile = _$compile_;
          $rootScope = _$rootScope_;
          $templateCache = _$templateCache_;
        });

        const tmpl = "<div>{{ hello ]]|<div my-directive></div></div>";
        element = $compile(tmpl)($rootScope);

        $rootScope.hello = "ahoj";
        expect(element.text()).toBe("ahoj|ahoj|ahoj");
      });

      it("should support custom start/end interpolation symbols in async directive template", () => {
        createInjector([
          "test1",
          ($interpolateProvider, $compileProvider) => {
            $interpolateProvider.startSymbol("##").endSymbol("]]");
            $compileProvider.directive("myDirective", () => ({
              templateUrl: "myDirective.html",
            }));
          },
        ]).invoke((_$compile_, _$rootScope_, _$templateCache_) => {
          $compile = _$compile_;
          $rootScope = _$rootScope_;
          $templateCache = _$templateCache_;
        });

        $templateCache.set(
          "myDirective.html",
          "<span>{{hello}}|{{hello}}</span>",
        );
        element = $compile("<div>##hello]]|<div my-directive></div></div>")(
          $rootScope,
        );
        $rootScope.hello = "ahoj";
        expect(element.text()).toBe("ahoj|ahoj|ahoj");
      });

      it("should make attributes observable for terminal directives", () => {
        module.directive("myAttr", () => ({
          terminal: true,
          link(scope, element, attrs) {
            attrs.$observe("myAttr", (val) => {
              log.push(val);
            });
          },
        }));
        createInjector(["test1"]).invoke(
          (_$compile_, _$rootScope_, _$templateCache_) => {
            $compile = _$compile_;
            $rootScope = _$rootScope_;
            $templateCache = _$templateCache_;
          },
        );

        element = $compile('<div my-attr="{{myVal}}"></div>')($rootScope);
        expect(log).toEqual([]);

        $rootScope.myVal = "carrot";
        expect(log[0]).toEqual("carrot");
      });
    });

    describe("link phase", () => {
      let module, log;
      beforeEach(() => {
        log = [];
        module = window.angular.module("test1", ["ng"]);
        ["a", "b", "c"].forEach((name) => {
          module.directive(name, () => ({
            restrict: "EA",
            compile() {
              log.push(`t${name.toUpperCase()}`);
              return {
                pre() {
                  log.push(`pre${name.toUpperCase()}`);
                },
                post: function linkFn() {
                  log.push(`post${name.toUpperCase()}`);
                },
              };
            },
          }));
        });

        createInjector(["test1"]).invoke((_$compile_, _$rootScope_) => {
          $compile = _$compile_;
          $rootScope = _$rootScope_;
        });
      });

      it("should not store linkingFns for () => {} branches", () => {
        element = JQLite('<div name="{{a}}"><span>ignore</span></div>');
        const linkingFn = $compile(element);
        // Now prune the branches with no directives
        element.find("span").remove();
        expect(element.find("span").length).toBe(0);
        // and we should still be able to compile without errors
        linkingFn($rootScope);
      });

      it("should compile from top to bottom but link from bottom up", () => {
        element = $compile("<a b><c></c></a>")($rootScope);
        expect(log.join("; ")).toEqual(
          "tA; tB; tC; preA; preB; preC; postC; postB; postA",
        );
      });

      it("should support link function on directive object", () => {
        module.directive(
          "abc",
          valueFn({
            link(scope, element, attrs) {
              element.text(attrs.abc);
            },
          }),
        );

        createInjector(["test1"]).invoke((_$compile_, _$rootScope_) => {
          $compile = _$compile_;
          $rootScope = _$rootScope_;
        });

        element = $compile('<div abc="WORKS">FAIL</div>')($rootScope);
        expect(element.text()).toEqual("WORKS");
      });

      it("should support $observe inside link function on directive object", () => {
        module.directive(
          "testLink",
          valueFn({
            templateUrl: "test-link.html",
            link(scope, element, attrs) {
              attrs.$observe("testLink", (val) => {
                scope.testAttr = val;
              });
            },
          }),
        );

        createInjector(["test1"]).invoke(
          (_$compile_, _$rootScope_, _$templateCache_) => {
            $compile = _$compile_;
            $rootScope = _$rootScope_;
            $templateCache = _$templateCache_;
          },
        );

        $templateCache.set("test-link.html", "{{testAttr}}");
        element = $compile('<div test-link="{{1+2}}"></div>')($rootScope);
        $rootScope.$apply();
        expect(element.text()).toBe("3");
      });

      it("should throw multilink error when linking the same element more then once", () => {
        const linker = $compile("<div>");
        linker($rootScope).remove();
        expect(() => {
          linker($rootScope);
        }).toThrowError(/multilink/);
      });

      describe("attrs", () => {
        it("should allow setting of attributes", () => {
          module.directive({
            setter: valueFn((scope, element, attr) => {
              attr.$set("name", "abc");
              attr.$set("disabled", true);
              expect(attr.name).toBe("abc");
              expect(attr.disabled).toBe(true);
            }),
          });

          createInjector(["test1"]).invoke((_$compile_, _$rootScope_) => {
            $compile = _$compile_;
            $rootScope = _$rootScope_;
          });

          element = $compile("<div setter></div>")($rootScope);
          expect(element.attr("name")).toEqual("abc");
          expect(element.attr("disabled")).toEqual("disabled");
        });

        it("should read boolean attributes as boolean only on control elements", () => {
          let value;
          module.directive({
            input: valueFn({
              restrict: "EA",
              link(scope, element, attr) {
                value = attr.required;
              },
            }),
          });

          createInjector(["test1"]).invoke((_$compile_, _$rootScope_) => {
            $compile = _$compile_;
            $rootScope = _$rootScope_;
          });

          element = $compile("<input required></input>")($rootScope);
          expect(value).toEqual(true);
        });

        it("should read boolean attributes as text on non-controll elements", () => {
          let value;
          module.directive({
            div: valueFn({
              restrict: "EA",
              link(scope, element, attr) {
                value = attr.required;
              },
            }),
          });

          createInjector(["test1"]).invoke((_$compile_, _$rootScope_) => {
            $compile = _$compile_;
            $rootScope = _$rootScope_;
          });

          element = $compile('<div required="some text"></div>')($rootScope);
          expect(value).toEqual("some text");
        });

        it("should create new instance of attr for each template stamping", () => {
          const state = { first: [], second: [] };
          module
            .value("state", state)
            .directive(
              "first",
              valueFn({
                priority: 1,
                compile(templateElement, templateAttr) {
                  return function (scope, element, attr) {
                    state.first.push({
                      template: {
                        element: templateElement,
                        attr: templateAttr,
                      },
                      link: { element, attr },
                    });
                  };
                },
              }),
            )
            .directive(
              "second",
              valueFn({
                priority: 2,
                compile(templateElement, templateAttr) {
                  return function (scope, element, attr) {
                    state.second.push({
                      template: {
                        element: templateElement,
                        attr: templateAttr,
                      },
                      link: { element, attr },
                    });
                  };
                },
              }),
            );

          createInjector(["test1"]).invoke(($rootScope, $compile, state) => {
            const template = $compile("<div first second>");
            dealoc(template($rootScope.$new(), () => {}));
            dealoc(template($rootScope.$new(), () => {}));

            // instance between directives should be shared
            expect(state.first[0].template.element).toBe(
              state.second[0].template.element,
            );
            expect(state.first[0].template.attr).toBe(
              state.second[0].template.attr,
            );

            // the template and the link can not be the same instance
            expect(state.first[0].template.element).not.toBe(
              state.first[0].link.element,
            );
            expect(state.first[0].template.attr).not.toBe(
              state.first[0].link.attr,
            );

            // each new template needs to be new instance
            expect(state.first[0].link.element).not.toBe(
              state.first[1].link.element,
            );
            expect(state.first[0].link.attr).not.toBe(state.first[1].link.attr);
            expect(state.second[0].link.element).not.toBe(
              state.second[1].link.element,
            );
            expect(state.second[0].link.attr).not.toBe(
              state.second[1].link.attr,
            );
          });
        });

        it("should properly $observe inside ng-repeat", () => {
          const spies = [];

          module.directive(
            "observer",
            () =>
              function (scope, elm, attr) {
                spies.push(jasmine.createSpy(`observer ${spies.length}`));
                attr.$observe("some", spies[spies.length - 1]);
              },
          );

          createInjector(["test1"]).invoke((_$compile_, _$rootScope_) => {
            $compile = _$compile_;
            $rootScope = _$rootScope_;
          });

          element = $compile(
            '<div><div ng-repeat="i in items">' +
              '<span some="id_{{i.id}}" observer></span>' +
              "</div></div>",
          )($rootScope);

          $rootScope.$apply(() => {
            $rootScope.items = [{ id: 1 }, { id: 2 }];
          });

          expect(spies[0]).toHaveBeenCalledOnceWith("id_1");
          expect(spies[1]).toHaveBeenCalledOnceWith("id_2");
          spies[0].calls.reset();
          spies[1].calls.reset();

          $rootScope.$apply(() => {
            $rootScope.items[0].id = 5;
          });

          expect(spies[0]).toHaveBeenCalledOnceWith("id_5");
        });

        describe("$set", () => {
          let attr, $sce;
          beforeEach(() => {
            ["input", "a", "img"].forEach((tag) => {
              module.directive(
                tag,
                valueFn({
                  restrict: "EA",
                  link(scope, element, attr) {
                    scope.attr = attr;
                  },
                }),
              );
            });

            createInjector(["test1"]).invoke(
              (_$compile_, _$rootScope_, _$sce_) => {
                $compile = _$compile_;
                $rootScope = _$rootScope_;
                $sce = _$sce_;
              },
            );
            element = $compile("<input></input>")($rootScope);
            attr = $rootScope.attr;
            expect(attr).toBeDefined();
          });

          it("should set attributes", () => {
            attr.$set("ngMyAttr", "value");
            expect(element.attr("ng-my-attr")).toEqual("value");
            expect(attr.ngMyAttr).toEqual("value");
          });

          it("should allow overriding of attribute name and remember the name", () => {
            attr.$set("ngOther", "123", true, "other");
            expect(element.attr("other")).toEqual("123");
            expect(attr.ngOther).toEqual("123");

            attr.$set("ngOther", "246");
            expect(element.attr("other")).toEqual("246");
            expect(attr.ngOther).toEqual("246");
          });

          it("should remove attribute", () => {
            attr.$set("ngMyAttr", "value");
            expect(element.attr("ng-my-attr")).toEqual("value");

            attr.$set("ngMyAttr", undefined);
            expect(element.attr("ng-my-attr")).toBeUndefined();

            attr.$set("ngMyAttr", "value");
            attr.$set("ngMyAttr", null);
            expect(element.attr("ng-my-attr")).toBeUndefined();
          });

          it("should set the value to lowercased keys for boolean attrs", () => {
            attr.$set("disabled", "value");
            expect(element.attr("disabled")).toEqual("disabled");

            element[0].removeAttribute("disabled");

            attr.$set("dISaBlEd", "VaLuE");
            expect(element.attr("disabled")).toEqual("disabled");
          });

          it("should call removeAttr for boolean attrs when value is `false`", () => {
            attr.$set("disabled", "value");

            spyOn(JQLite.prototype, "attr").and.callThrough();
            spyOn(element[0], "removeAttribute").and.callThrough();

            attr.$set("disabled", false);

            expect(element.attr).not.toHaveBeenCalled();
            expect(element[0].removeAttribute).toHaveBeenCalledWith("disabled");
            expect(element.attr("disabled")).toEqual(undefined);

            attr.$set("disabled", "value");

            element.attr.calls.reset();
            element[0].removeAttribute.calls.reset();

            attr.$set("dISaBlEd", false);

            expect(element.attr).not.toHaveBeenCalled();
            expect(element[0].removeAttribute).toHaveBeenCalledWith("disabled");
            expect(element.attr("disabled")).toEqual(undefined);
          });

          it("should not set DOM element attr if writeAttr false", () => {
            attr.$set("test", "value", false);

            expect(element.attr("test")).toBeUndefined();
            expect(attr.test).toBe("value");
          });

          it("should not automatically sanitize a[href]", () => {
            // Breaking change in https://github.com/angular/angular.js/pull/16378
            element = $compile("<a></a>")($rootScope);
            $rootScope.attr.$set("href", "evil:foo()");
            expect(element.attr("href")).toEqual("evil:foo()");
            expect($rootScope.attr.href).toEqual("evil:foo()");
          });

          it("should not automatically sanitize img[src]", () => {
            // Breaking change in https://github.com/angular/angular.js/pull/16378
            element = $compile("<img></img>")($rootScope);
            $rootScope.attr.$set("img", "evil:foo()");
            expect(element.attr("img")).toEqual("evil:foo()");
            expect($rootScope.attr.img).toEqual("evil:foo()");
          });

          it("should automatically sanitize img[srcset]", () => {
            element = $compile("<img></img>")($rootScope);
            $rootScope.attr.$set("srcset", "evil:foo()");
            expect(element.attr("srcset")).toEqual("unsafe:evil:foo()");
            expect($rootScope.attr.srcset).toEqual("unsafe:evil:foo()");
          });

          it("should not accept trusted values for img[srcset]", () => {
            const trusted = $sce.trustAsMediaUrl("trustme:foo()");
            element = $compile("<img></img>")($rootScope);
            expect(() => {
              $rootScope.attr.$set("srcset", trusted);
            }).toThrowError(/srcset/);
          });
        });
      });
    });

    describe("controller lifecycle hooks", () => {
      let module, log;

      beforeEach(() => {
        log = [];
        module = window.angular.module("test1", ["ng"]);
      });

      describe("$onInit", () => {
        it("should call `$onInit`, if provided, after all the controllers on the element have been initialized", () => {
          function check() {
            expect(this.element.controller("d1").id).toEqual(1);
            expect(this.element.controller("d2").id).toEqual(2);
          }

          function Controller1($element) {
            this.id = 1;
            this.element = $element;
          }
          Controller1.prototype.$onInit = jasmine
            .createSpy("$onInit")
            .and.callFake(check);

          function Controller2($element) {
            this.id = 2;
            this.element = $element;
          }
          Controller2.prototype.$onInit = jasmine
            .createSpy("$onInit")
            .and.callFake(check);

          module
            .directive("d1", valueFn({ controller: Controller1 }))
            .directive("d2", valueFn({ controller: Controller2 }));

          createInjector(["test1"]).invoke((_$compile_, _$rootScope_) => {
            $compile = _$compile_;
            $rootScope = _$rootScope_;
          });

          element = $compile("<div d1 d2></div>")($rootScope);
          expect(Controller1.prototype.$onInit).toHaveBeenCalled();
          expect(Controller2.prototype.$onInit).toHaveBeenCalled();
        });

        it("should continue to trigger other `$onInit` hooks if one throws an error", () => {
          function ThrowingController() {
            this.$onInit = function () {
              log.push("bad hook");
            };
          }
          function LoggingController() {
            this.$onInit = function () {
              log.push("onInit");
            };
          }

          module
            .component("c1", {
              controller: ThrowingController,
              bindings: { prop: "<" },
            })
            .component("c2", {
              controller: LoggingController,
              bindings: { prop: "<" },
            });

          createInjector(["test1"]).invoke((_$compile_, _$rootScope_) => {
            $compile = _$compile_;
            $rootScope = _$rootScope_;
          });
          // Setup the directive with bindings that will keep updating the bound value forever
          element = $compile('<div><c1 prop="a"></c1><c2 prop="a"></c2>')(
            $rootScope,
          );

          // The first component's error should be logged
          expect(log[0]).toEqual("bad hook");

          // The second component's hook should still be called
          expect(log[1]).toEqual("onInit");
        });
      });

      describe("$onDestroy", () => {
        it("should call `$onDestroy`, if provided, on the controller when its scope is destroyed", () => {
          function TestController() {
            this.count = 0;
          }
          TestController.prototype.$onDestroy = function () {
            this.count++;
          };

          module
            .directive(
              "d1",
              valueFn({ scope: true, controller: TestController }),
            )
            .directive("d2", valueFn({ scope: {}, controller: TestController }))
            .directive("d3", valueFn({ controller: TestController }));

          createInjector(["test1"]).invoke((_$compile_, _$rootScope_) => {
            $compile = _$compile_;
            $rootScope = _$rootScope_;
          });

          element = $compile(
            '<div><d1 ng-if="show[0]"></d1><d2 ng-if="show[1]"></d2><div ng-if="show[2]"><d3></d3></div></div>',
          )($rootScope);

          $rootScope.$apply("show = [true, true, true]");
          const d1Controller = element.find("d1").controller("d1");
          const d2Controller = element.find("d2").controller("d2");
          const d3Controller = element.find("d3").controller("d3");

          expect([
            d1Controller.count,
            d2Controller.count,
            d3Controller.count,
          ]).toEqual([0, 0, 0]);
          $rootScope.$apply("show = [false, true, true]");
          expect([
            d1Controller.count,
            d2Controller.count,
            d3Controller.count,
          ]).toEqual([1, 0, 0]);
          $rootScope.$apply("show = [false, false, true]");
          expect([
            d1Controller.count,
            d2Controller.count,
            d3Controller.count,
          ]).toEqual([1, 1, 0]);
          $rootScope.$apply("show = [false, false, false]");
          expect([
            d1Controller.count,
            d2Controller.count,
            d3Controller.count,
          ]).toEqual([1, 1, 1]);
        });

        it("should call `$onDestroy` top-down (the same as `scope.$broadcast`)", () => {
          let log = [];
          function ParentController() {
            log.push("parent created");
          }
          ParentController.prototype.$onDestroy = () => {
            log.push("parent destroyed");
          };
          function ChildController() {
            log.push("child created");
          }
          ChildController.prototype.$onDestroy = () => {
            log.push("child destroyed");
          };
          function GrandChildController() {
            log.push("grand child created");
          }
          GrandChildController.prototype.$onDestroy = () => {
            log.push("grand child destroyed");
          };

          module
            .directive(
              "parent",
              valueFn({ scope: true, controller: ParentController }),
            )
            .directive(
              "child",
              valueFn({ scope: true, controller: ChildController }),
            )
            .directive(
              "grandChild",
              valueFn({ scope: true, controller: GrandChildController }),
            );

          createInjector(["test1"]).invoke((_$compile_, _$rootScope_) => {
            $compile = _$compile_;
            $rootScope = _$rootScope_;
          });

          element = $compile(
            '<parent ng-if="show"><child><grand-child></grand-child></child></parent>',
          )($rootScope);
          $rootScope.$apply("show = true");
          expect(log).toEqual([
            "parent created",
            "child created",
            "grand child created",
          ]);
          log = [];
          $rootScope.$apply("show = false");
          expect(log).toEqual([
            "parent destroyed",
            "child destroyed",
            "grand child destroyed",
          ]);
        });
      });

      describe("$postLink", () => {
        it("should call `$postLink`, if provided, after the element has completed linking (i.e. post-link)", () => {
          const log = [];

          function Controller1() {}
          Controller1.prototype.$postLink = () => {
            log.push("d1 view init");
          };

          function Controller2() {}
          Controller2.prototype.$postLink = () => {
            log.push("d2 view init");
          };

          module
            .directive(
              "d1",
              valueFn({
                controller: Controller1,
                link: {
                  pre(s, e) {
                    log.push(`d1 pre: ${e.text()}`);
                  },
                  post(s, e) {
                    log.push(`d1 post: ${e.text()}`);
                  },
                },
                template: "<d2></d2>",
              }),
            )
            .directive(
              "d2",
              valueFn({
                controller: Controller2,
                link: {
                  pre(s, e) {
                    log.push(`d2 pre: ${e.text()}`);
                  },
                  post(s, e) {
                    log.push(`d2 post: ${e.text()}`);
                  },
                },
                template: "loaded",
              }),
            );

          createInjector(["test1"]).invoke((_$compile_, _$rootScope_) => {
            $compile = _$compile_;
            $rootScope = _$rootScope_;
          });
          element = $compile("<d1></d1>")($rootScope);
          expect(log).toEqual([
            "d1 pre: loaded",
            "d2 pre: loaded",
            "d2 post: loaded",
            "d2 view init",
            "d1 post: loaded",
            "d1 view init",
          ]);
        });
      });

      describe("$doCheck", () => {
        it("should call `$doCheck`, if provided, for each digest cycle, after $onChanges and $onInit", () => {
          function TestController() {}
          TestController.prototype.$doCheck = () => {
            log.push("$doCheck");
          };
          TestController.prototype.$onChanges = () => {
            log.push("$onChanges");
          };
          TestController.prototype.$onInit = () => {
            log.push("$onInit");
          };

          module.component("dcc", {
            controller: TestController,
            bindings: { prop1: "<" },
          });

          createInjector(["test1"]).invoke((_$compile_, _$rootScope_) => {
            $compile = _$compile_;
            $rootScope = _$rootScope_;
          });
          element = $compile('<dcc prop1="val"></dcc>')($rootScope);
          expect(log).toEqual(["$onChanges", "$onInit", "$doCheck"]);

          // Clear log
          log = [];

          $rootScope.$apply();
          expect(log).toEqual(["$doCheck", "$doCheck"]);

          //Clear log
          log = [];

          $rootScope.$apply("val = 2");
          expect(log).toEqual(["$doCheck", "$onChanges", "$doCheck"]);
        });

        it("should work if $doCheck is provided in the constructor", () => {
          function TestController() {
            this.$doCheck = () => {
              log.push("$doCheck");
            };
            this.$onChanges = () => {
              log.push("$onChanges");
            };
            this.$onInit = () => {
              log.push("$onInit");
            };
          }

          module.component("dcc", {
            controller: TestController,
            bindings: { prop1: "<" },
          });

          createInjector(["test1"]).invoke((_$compile_, _$rootScope_) => {
            $compile = _$compile_;
            $rootScope = _$rootScope_;
          });

          element = $compile('<dcc prop1="val"></dcc>')($rootScope);
          expect(log).toEqual(["$onChanges", "$onInit", "$doCheck"]);

          // Clear log
          log = [];

          $rootScope.$apply();
          expect(log).toEqual(["$doCheck", "$doCheck"]);

          // Clear log
          log = [];

          $rootScope.$apply("val = 2");
          expect(log).toEqual(["$doCheck", "$onChanges", "$doCheck"]);
        });
      });

      describe("$onChanges", () => {
        it("should call `$onChanges`, if provided, when a one-way (`<`) or interpolation (`@`) bindings are updated", () => {
          function TestController() {}
          TestController.prototype.$onChanges = function (change) {
            log.push(change);
          };

          module.component("c1", {
            controller: TestController,
            bindings: { prop1: "<", prop2: "<", other: "=", attr: "@" },
          });

          createInjector(["test1"]).invoke((_$compile_, _$rootScope_) => {
            $compile = _$compile_;
            $rootScope = _$rootScope_;
          });
          // Setup a watch to indicate some complicated updated logic
          $rootScope.$watch("val", (val, oldVal) => {
            $rootScope.val2 = val * 2;
          });
          // Setup the directive with two bindings
          element = $compile(
            '<c1 prop1="val" prop2="val2" other="val3" attr="{{val4}}"></c1>',
          )($rootScope);

          expect(log).toEqual([
            {
              prop1: jasmine.objectContaining({ currentValue: undefined }),
              prop2: jasmine.objectContaining({ currentValue: undefined }),
              attr: jasmine.objectContaining({ currentValue: "" }),
            },
          ]);

          // Clear the initial changes from the log
          log = [];

          // Update val to trigger the onChanges
          $rootScope.$apply("val = 42");

          // Now we should have a single changes entry in the log
          expect(log).toEqual([
            {
              prop1: jasmine.objectContaining({ currentValue: 42 }),
              prop2: jasmine.objectContaining({ currentValue: 84 }),
            },
          ]);

          // Clear the log
          log = [];

          // Update val to trigger the onChanges
          $rootScope.$apply("val = 17");
          // Now we should have a single changes entry in the log
          expect(log).toEqual([
            {
              prop1: jasmine.objectContaining({
                previousValue: 42,
                currentValue: 17,
              }),
              prop2: jasmine.objectContaining({
                previousValue: 84,
                currentValue: 34,
              }),
            },
          ]);

          // Clear the log
          log = [];

          // Update val3 to trigger the "other" two-way binding
          $rootScope.$apply("val3 = 63");
          // onChanges should not have been called
          expect(log).toEqual([]);

          // Update val4 to trigger the "attr" interpolation binding
          $rootScope.$apply("val4 = 22");
          // onChanges should not have been called
          expect(log).toEqual([
            {
              attr: jasmine.objectContaining({
                previousValue: "",
                currentValue: "22",
              }),
            },
          ]);
        });

        it("should trigger `$onChanges` even if the inner value already equals the new outer value", () => {
          function TestController() {}
          TestController.prototype.$onChanges = function (change) {
            log.push(change);
          };

          module.component("c1", {
            controller: TestController,
            bindings: { prop1: "<" },
          });

          createInjector(["test1"]).invoke((_$compile_, _$rootScope_) => {
            $compile = _$compile_;
            $rootScope = _$rootScope_;
          });

          element = $compile('<c1 prop1="val"></c1>')($rootScope);

          $rootScope.$apply("val = 1");
          expect(log.pop()).toEqual({
            prop1: jasmine.objectContaining({
              previousValue: undefined,
              currentValue: 1,
            }),
          });

          $rootScope.$$childHead.$ctrl.prop1 = 2;
          $rootScope.$apply("val = 2");
          expect(log.pop()).toEqual({
            prop1: jasmine.objectContaining({
              previousValue: 1,
              currentValue: 2,
            }),
          });
        });

        it("should trigger `$onChanges` for literal expressions when expression input value changes (simple value)", () => {
          function TestController() {}
          TestController.prototype.$onChanges = function (change) {
            log.push(change);
          };

          module.component("c1", {
            controller: TestController,
            bindings: { prop1: "<" },
          });

          createInjector(["test1"]).invoke((_$compile_, _$rootScope_) => {
            $compile = _$compile_;
            $rootScope = _$rootScope_;
          });

          element = $compile('<c1 prop1="[val]"></c1>')($rootScope);

          $rootScope.$apply("val = 1");
          expect(log.pop()).toEqual({
            prop1: jasmine.objectContaining({
              previousValue: [undefined],
              currentValue: [1],
            }),
          });

          $rootScope.$apply("val = 2");
          expect(log.pop()).toEqual({
            prop1: jasmine.objectContaining({
              previousValue: [1],
              currentValue: [2],
            }),
          });
        });

        it("should trigger `$onChanges` for literal expressions when expression input value changes (complex value)", () => {
          function TestController() {}
          TestController.prototype.$onChanges = function (change) {
            log.push(change);
          };

          module.component("c1", {
            controller: TestController,
            bindings: { prop1: "<" },
          });

          createInjector(["test1"]).invoke((_$compile_, _$rootScope_) => {
            $compile = _$compile_;
            $rootScope = _$rootScope_;
          });

          element = $compile('<c1 prop1="[val]"></c1>')($rootScope);

          $rootScope.$apply("val = [1]");
          expect(log.pop()).toEqual({
            prop1: jasmine.objectContaining({
              previousValue: [undefined],
              currentValue: [[1]],
            }),
          });

          $rootScope.$apply("val = [2]");
          expect(log.pop()).toEqual({
            prop1: jasmine.objectContaining({
              previousValue: [[1]],
              currentValue: [[2]],
            }),
          });
        });

        it("should trigger `$onChanges` for literal expressions when expression input value changes instances, even when equal", () => {
          function TestController() {}
          TestController.prototype.$onChanges = function (change) {
            log.push(change);
          };

          module.component("c1", {
            controller: TestController,
            bindings: { prop1: "<" },
          });

          createInjector(["test1"]).invoke((_$compile_, _$rootScope_) => {
            $compile = _$compile_;
            $rootScope = _$rootScope_;
          });

          element = $compile('<c1 prop1="[val]"></c1>')($rootScope);

          $rootScope.$apply("val = [1]");
          expect(log.pop()).toEqual({
            prop1: jasmine.objectContaining({
              previousValue: [undefined],
              currentValue: [[1]],
            }),
          });

          $rootScope.$apply("val = [1]");
          expect(log.pop()).toEqual({
            prop1: jasmine.objectContaining({
              previousValue: [[1]],
              currentValue: [[1]],
            }),
          });
        });

        it("should pass the original value as `previousValue` even if there were multiple changes in a single digest", () => {
          let log = [];
          function TestController() {}
          TestController.prototype.$onChanges = function (change) {
            log.push(change);
          };

          module.component("c1", {
            controller: TestController,
            bindings: { prop: "<" },
          });

          createInjector(["test1"]).invoke((_$compile_, _$rootScope_) => {
            $compile = _$compile_;
            $rootScope = _$rootScope_;
          });

          element = $compile('<c1 prop="a + b"></c1>')($rootScope);

          // We add this watch after the compilation to ensure that it will run after the binding watchers
          // therefore triggering the thing that this test is hoping to enforce
          $rootScope.$watch("a", (val) => {
            $rootScope.b = val * 2;
          });

          expect(log).toEqual([
            { prop: jasmine.objectContaining({ currentValue: undefined }) },
          ]);

          // Clear the initial values from the log
          log = [];

          // Update val to trigger the onChanges
          $rootScope.$apply("a = 42");
          // Now the change should have the real previous value (undefined), not the intermediate one (42)
          expect(log).toEqual([
            { prop: jasmine.objectContaining({ currentValue: 126 }) },
          ]);

          // Clear the log
          log = [];

          // Update val to trigger the onChanges
          $rootScope.$apply("a = 7");
          // Now the change should have the real previous value (126), not the intermediate one, (91)
          expect(log).toEqual([
            {
              prop: jasmine.objectContaining({
                previousValue: 126,
                currentValue: 21,
              }),
            },
          ]);
        });

        it("should trigger an initial onChanges call for each binding with the `isFirstChange()` returning true", () => {
          function TestController() {}
          TestController.prototype.$onChanges = function (change) {
            log.push(change);
          };

          module.component("c1", {
            controller: TestController,
            bindings: { prop: "<", attr: "@" },
          });

          createInjector(["test1"]).invoke((_$compile_, _$rootScope_) => {
            $compile = _$compile_;
            $rootScope = _$rootScope_;
          });

          $rootScope.$apply("a = 7");
          element = $compile('<c1 prop="a" attr="{{a}}"></c1>')($rootScope);

          expect(log).toEqual([
            {
              prop: jasmine.objectContaining({ currentValue: 7 }),
              attr: jasmine.objectContaining({ currentValue: "7" }),
            },
          ]);
          expect(log[0].prop.isFirstChange()).toEqual(true);
          expect(log[0].attr.isFirstChange()).toEqual(true);

          log = [];
          $rootScope.$apply("a = 9");
          expect(log).toEqual([
            {
              prop: jasmine.objectContaining({
                previousValue: 7,
                currentValue: 9,
              }),
              attr: jasmine.objectContaining({
                previousValue: "7",
                currentValue: "9",
              }),
            },
          ]);
          expect(log[0].prop.isFirstChange()).toEqual(false);
          expect(log[0].attr.isFirstChange()).toEqual(false);
        });

        it("should trigger an initial onChanges call for each binding even if the hook is defined in the constructor", () => {
          function TestController() {
            this.$onChanges = function (change) {
              log.push(change);
            };
          }

          module.component("c1", {
            controller: TestController,
            bindings: { prop: "<", attr: "@" },
          });

          createInjector(["test1"]).invoke((_$compile_, _$rootScope_) => {
            $compile = _$compile_;
            $rootScope = _$rootScope_;
          });

          $rootScope.$apply("a = 7");
          element = $compile('<c1 prop="a" attr="{{a}}"></c1>')($rootScope);

          expect(log).toEqual([
            {
              prop: jasmine.objectContaining({ currentValue: 7 }),
              attr: jasmine.objectContaining({ currentValue: "7" }),
            },
          ]);
          expect(log[0].prop.isFirstChange()).toEqual(true);
          expect(log[0].attr.isFirstChange()).toEqual(true);

          log = [];
          $rootScope.$apply("a = 10");
          expect(log).toEqual([
            {
              prop: jasmine.objectContaining({
                previousValue: 7,
                currentValue: 10,
              }),
              attr: jasmine.objectContaining({
                previousValue: "7",
                currentValue: "10",
              }),
            },
          ]);
          expect(log[0].prop.isFirstChange()).toEqual(false);
          expect(log[0].attr.isFirstChange()).toEqual(false);
        });

        it("should clean up `@`-binding observers when re-assigning bindings", () => {
          const constructorSpy = jasmine.createSpy("constructor");
          const prototypeSpy = jasmine.createSpy("prototype");

          function TestController() {
            return { $onChanges: constructorSpy };
          }
          TestController.prototype.$onChanges = prototypeSpy;

          module.component("test", {
            bindings: { attr: "@" },
            controller: TestController,
          });

          createInjector(["test1"]).invoke((_$compile_, _$rootScope_) => {
            $compile = _$compile_;
            $rootScope = _$rootScope_;
          });

          const template = '<test attr="{{a}}"></test>';
          $rootScope.a = "foo";

          element = $compile(template)($rootScope);
          expect(constructorSpy).toHaveBeenCalled();
          expect(prototypeSpy).not.toHaveBeenCalled();

          constructorSpy.calls.reset();
          $rootScope.$apply('a = "bar"');
          expect(constructorSpy).toHaveBeenCalled();
          expect(prototypeSpy).not.toHaveBeenCalled();
        });

        it("should not call `$onChanges` twice even when the initial value is `NaN`", () => {
          const onChangesSpy = jasmine.createSpy("$onChanges");

          module.component("test", {
            bindings: { prop: "<", attr: "@" },
            controller: function TestController() {
              this.$onChanges = onChangesSpy;
            },
          });

          createInjector(["test1"]).invoke((_$compile_, _$rootScope_) => {
            $compile = _$compile_;
            $rootScope = _$rootScope_;
          });

          const template =
            '<test prop="a" attr="{{a}}"></test>' +
            '<test prop="b" attr="{{b}}"></test>';
          $rootScope.a = "foo";
          $rootScope.b = NaN;

          element = $compile(template)($rootScope);
          expect(onChangesSpy).toHaveBeenCalledTimes(2);
          expect(onChangesSpy.calls.argsFor(0)[0]).toEqual({
            prop: jasmine.objectContaining({ currentValue: "foo" }),
            attr: jasmine.objectContaining({ currentValue: "foo" }),
          });
          expect(onChangesSpy.calls.argsFor(1)[0]).toEqual({
            prop: jasmine.objectContaining({ currentValue: NaN }),
            attr: jasmine.objectContaining({ currentValue: "NaN" }),
          });

          onChangesSpy.calls.reset();
          $rootScope.$apply('a = "bar"; b = 42');

          expect(onChangesSpy).toHaveBeenCalledTimes(2);
          expect(onChangesSpy.calls.argsFor(0)[0]).toEqual({
            prop: jasmine.objectContaining({
              previousValue: "foo",
              currentValue: "bar",
            }),
            attr: jasmine.objectContaining({
              previousValue: "foo",
              currentValue: "bar",
            }),
          });
          expect(onChangesSpy.calls.argsFor(1)[0]).toEqual({
            prop: jasmine.objectContaining({
              previousValue: NaN,
              currentValue: 42,
            }),
            attr: jasmine.objectContaining({
              previousValue: "NaN",
              currentValue: "42",
            }),
          });
        });

        it("should only trigger one extra digest however many controllers have changes", () => {
          let log = [];
          function TestController1() {}
          TestController1.prototype.$onChanges = function (change) {
            log.push(["TestController1", change]);
          };
          function TestController2() {}
          TestController2.prototype.$onChanges = function (change) {
            log.push(["TestController2", change]);
          };

          module
            .component("c1", {
              controller: TestController1,
              bindings: { prop: "<" },
            })
            .component("c2", {
              controller: TestController2,
              bindings: { prop: "<" },
            });

          createInjector(["test1"]).invoke((_$compile_, _$rootScope_) => {
            $compile = _$compile_;
            $rootScope = _$rootScope_;
          });

          // Create a watcher to count the number of digest cycles
          let watchCount = 0;
          $rootScope.$watch(() => {
            watchCount++;
          });

          // Setup two sibling components with bindings that will change
          element = $compile(
            '<div><c1 prop="val1"></c1><c2 prop="val2"></c2></div>',
          )($rootScope);

          // Clear out initial changes
          log = [];

          // Update val to trigger the onChanges
          $rootScope.$apply("val1 = 42; val2 = 17");

          expect(log).toEqual([
            [
              "TestController1",
              { prop: jasmine.objectContaining({ currentValue: 42 }) },
            ],
            [
              "TestController2",
              { prop: jasmine.objectContaining({ currentValue: 17 }) },
            ],
          ]);
          // A single apply should only trigger three turns of the digest loop
          expect(watchCount).toEqual(3);
        });

        it("should cope with changes occurring inside `$onChanges()` hooks", () => {
          function OuterController() {}
          OuterController.prototype.$onChanges = function (change) {
            log.push(["OuterController", change]);
            // Make a change to the inner component
            this.b = this.prop1 * 2;
          };

          function InnerController() {}
          InnerController.prototype.$onChanges = function (change) {
            log.push(["InnerController", change]);
          };

          module
            .component("outer", {
              controller: OuterController,
              bindings: { prop1: "<" },
              template: '<inner prop2="$ctrl.b"></inner>',
            })
            .component("inner", {
              controller: InnerController,
              bindings: { prop2: "<" },
            });

          initInjector("test1");
          // Setup the directive with two bindings
          element = $compile('<outer prop1="a"></outer>')($rootScope);

          // Clear out initial changes
          log = [];

          // Update val to trigger the onChanges
          $rootScope.a = 42;
          expect(log).toEqual([
            [
              "OuterController",
              {
                prop1: jasmine.objectContaining({
                  previousValue: undefined,
                  currentValue: 42,
                }),
              },
            ],
            [
              "InnerController",
              {
                prop2: jasmine.objectContaining({
                  previousValue: NaN,
                  currentValue: 84,
                }),
              },
            ],
          ]);
        });

        it("should throw an error if `$onChanges()` hooks are not stable", () => {
          function TestController() {}
          TestController.prototype.$onChanges = function (change) {
            this.onChange();
          };

          module
            .decorator("$exceptionHandler", () => {
              return (exception) => {
                throw new Error(exception.message);
              };
            })
            .component("c1", {
              controller: TestController,
              bindings: { prop: "<", onChange: "&" },
            });

          createInjector(["test1"]).invoke((_$compile_, _$rootScope_) => {
            $compile = _$compile_;
            $rootScope = _$rootScope_;
          });
          // Setup the directive with bindings that will keep updating the bound value forever
          element = $compile('<c1 prop="a" on-change="a = -a"></c1>')(
            $rootScope,
          );

          // Update val to trigger the unstable onChanges, which will result in an error
          expect(() => {
            $rootScope.$apply("a = 42");
          }).toThrowError(/infchng/);

          dealoc(element);
          element = $compile('<c1 prop="b" on-change=""></c1>')($rootScope);
          $rootScope.$apply("b = 24");
          $rootScope.$apply("b = 48");
        });

        it("should log an error if `$onChanges()` hooks are not stable", () => {
          function TestController() {}
          TestController.prototype.$onChanges = function (change) {
            this.onChange();
          };

          module
            .decorator("$exceptionHandler", () => {
              return (exception) => {
                log.push(exception.message);
              };
            })
            .component("c1", {
              controller: TestController,
              bindings: { prop: "<", onChange: "&" },
            });

          createInjector(["test1"]).invoke((_$compile_, _$rootScope_) => {
            $compile = _$compile_;
            $rootScope = _$rootScope_;
          });
          // Setup the directive with bindings that will keep updating the bound value forever
          element = $compile('<c1 prop="a" on-change="a = -a"></c1>')(
            $rootScope,
          );

          // Update val to trigger the unstable onChanges, which will result in an error
          $rootScope.$apply("a = 42");
          expect(log.length).toEqual(1);
          expect(log[0].match(/infchng/)).toBeTruthy();
        });

        it("should continue to trigger other `$onChanges` hooks if one throws an error", () => {
          function ThrowingController() {
            this.$onChanges = function (change) {
              throw new Error("bad hook");
            };
          }
          function LoggingController($log) {
            this.$onChanges = function (change) {
              log.push("onChange");
            };
          }

          module
            .component("c1", {
              controller: ThrowingController,
              bindings: { prop: "<" },
            })
            .component("c2", {
              controller: LoggingController,
              bindings: { prop: "<" },
            })
            .decorator("$exceptionHandler", () => {
              return (exception) => {
                log.push(exception.message);
              };
            });

          createInjector(["test1"]).invoke((_$compile_, _$rootScope_) => {
            $compile = _$compile_;
            $rootScope = _$rootScope_;
          });
          // Setup the directive with bindings that will keep updating the bound value forever
          element = $compile('<div><c1 prop="a"></c1><c2 prop="a"></c2>')(
            $rootScope,
          );

          // The first component's error should be logged
          expect(log[0]).toEqual("bad hook");

          // The second component's changes should still be called
          expect(log[1]).toEqual("onChange");

          $rootScope.$apply("a = 42");

          // The first component's error should be logged
          expect(log[2]).toEqual("bad hook");

          // The second component's changes should still be called
          expect(log[3]).toEqual("onChange");
        });

        it("should throw `$onChanges` errors immediately", () => {
          function ThrowingController() {
            this.$onChanges = function (change) {
              throw new Error(`bad hook: ${this.prop}`);
            };
          }

          module
            .component("c1", {
              controller: ThrowingController,
              bindings: { prop: "<" },
            })
            .decorator("$exceptionHandler", () => {
              return (exception) => {
                log.push(exception.message);
              };
            });

          createInjector(["test1"]).invoke((_$compile_, _$rootScope_) => {
            $compile = _$compile_;
            $rootScope = _$rootScope_;
          });
          // Setup the directive with bindings that will keep updating the bound value forever
          element = $compile('<div><c1 prop="a"></c1><c1 prop="a * 2"></c1>')(
            $rootScope,
          );

          // Both component's errors should be logged
          expect(log[0]).toEqual("bad hook: undefined");
          expect(log[1]).toEqual("bad hook: NaN");

          $rootScope.$apply("a = 42");

          // // Both component's error should be logged individually
          expect(log[2]).toEqual("bad hook: 42");
          expect(log[3]).toEqual("bad hook: 84");
        });
      });
    });

    describe("isolated locals", () => {
      let componentScope;
      let regularScope;
      let module;
      let element;

      beforeEach(() => {
        module = window.angular.module("test1", ["ng"]);
        module
          .decorator("$exceptionHandler", () => {
            return (exception, cause) => {
              throw new Error(exception.message);
            };
          })
          .directive("myComponent", () => ({
            scope: {
              attr: "@",
              attrAlias: "@attr",
              $attrAlias: "@$attr$", // TODO DISALLOW THIS AS INVALID ATTRIBUTE
              ref: "=",
              refAlias: "= ref",
              $refAlias: "= $ref$",
              reference: "=",
              optref: "=?",
              optrefAlias: "=? optref",
              $optrefAlias: "=? $optref$",
              optreference: "=?",
              colref: "=*",
              colrefAlias: "=* colref",
              $colrefAlias: "=* $colref$",
              owRef: "<",
              owRefAlias: "< owRef",
              $owRefAlias: "< $owRef$",
              owOptref: "<?",
              owOptrefAlias: "<? owOptref",
              $owOptrefAlias: "<? $owOptref$",
              owColref: "<*",
              owColrefAlias: "<* owColref",
              $owColrefAlias: "<* $owColref$",
              expr: "&",
              optExpr: "&?",
              exprAlias: "&expr",
              $exprAlias: "&$expr$",
              constructor: "&?",
            },
            link(scope) {
              componentScope = scope;
            },
          }))
          .directive("badDeclaration", () => ({
            scope: { attr: "xxx" },
          }))
          .directive("storeScope", () => ({
            link(scope) {
              regularScope = scope;
            },
          }));

        createInjector(["test1"]).invoke((_$compile_, _$rootScope_) => {
          $compile = _$compile_;
          $rootScope = _$rootScope_;
        });
      });

      it("should give other directives the parent scope", () => {
        element = $compile(
          '<div><input type="text" my-component store-scope ng-model="value"></div>',
        )($rootScope);
        $rootScope.$apply(() => {
          $rootScope.value = "from-parent";
        });

        expect(element.find("input").val()).toBe("from-parent");
        expect(componentScope).not.toBe(regularScope);
        expect(componentScope.$parent).toBe(regularScope);
      });

      it("should not give the isolate scope to other directive template", () => {
        module.directive("otherTplDir", () => ({
          template: "value: {{value}}",
        }));
        createInjector(["test1"]).invoke((_$compile_, _$rootScope_) => {
          $compile = _$compile_;
          $rootScope = _$rootScope_;
        });

        element = $compile("<div my-component other-tpl-dir>")($rootScope);

        $rootScope.$apply(() => {
          $rootScope.value = "from-parent";
        });

        expect(element.html()).toBe("value: from-parent");
      });

      it("should not give the isolate scope to other directive template (with templateUrl)", () => {
        module.directive("otherTplDir", () => ({
          templateUrl: "other.html",
        }));

        createInjector(["test1"]).invoke(
          (_$compile_, _$rootScope_, _$templateCache_) => {
            $compile = _$compile_;
            $rootScope = _$rootScope_;
            $templateCache = _$templateCache_;
          },
        );

        $templateCache.set("other.html", "value: {{value}}");
        element = $compile("<div my-component other-tpl-dir>")($rootScope);

        $rootScope.$apply(() => {
          $rootScope.value = "from-parent";
        });

        expect(element.html()).toBe("value: from-parent");
      });

      it("should not give the isolate scope to regular child elements", () => {
        element = $compile("<div my-component>value: {{value}}</div>")(
          $rootScope,
        );

        $rootScope.$apply(() => {
          $rootScope.value = "from-parent";
        });

        expect(element.html()).toBe("value: from-parent");
      });

      it('should update parent scope when "="-bound NaN changes', () => {
        $rootScope.num = NaN;
        element = $compile('<div my-component reference="num"></div>')(
          $rootScope,
        );
        const isolateScope = $rootScope.$$childHead;
        expect(isolateScope.reference).toBeNaN();

        isolateScope.$apply((scope) => {
          scope.reference = 64;
        });
        expect($rootScope.num).toBe(64);
      });

      it('should update isolate scope when "="-bound NaN changes', () => {
        $rootScope.num = NaN;
        element = $compile('<div my-component reference="num"></div>')(
          $rootScope,
        );
        const isolateScope = $rootScope.$$childHead;
        expect(isolateScope.reference).toBeNaN();

        $rootScope.$apply((scope) => {
          scope.num = 64;
        });
        expect(isolateScope.reference).toBe(64);
      });

      it("should be able to bind attribute names which are present in Object.prototype", () => {
        module.directive(
          "inProtoAttr",
          valueFn({
            scope: {
              constructor: "@",
              toString: "&",

              // Spidermonkey extension, may be obsolete in the future
              watch: "=",
            },
          }),
        );
        createInjector(["test1"]).invoke(
          (_$compile_, _$rootScope_, _$templateCache_) => {
            $compile = _$compile_;
            $rootScope = _$rootScope_;
            $templateCache = _$templateCache_;
          },
        );

        expect(() => {
          element = $compile(
            '<div in-proto-attr constructor="hello, world" watch="[]" ' +
              'to-string="value = !value"></div>',
          )($rootScope);
        }).not.toThrow();
        const isolateScope = $rootScope.$$childHead;

        expect(typeof isolateScope.constructor).toBe("string");
        expect(Array.isArray(isolateScope.watch)).toBe(true);
        expect(typeof isolateScope.toString).toBe("function");
        expect($rootScope.value).toBeUndefined();
        isolateScope.toString();
        expect($rootScope.value).toBe(true);
      });

      it("should be able to interpolate attribute names which are present in Object.prototype", () => {
        let attrs;
        module.directive(
          "attrExposer",
          valueFn({
            link($scope, $element, $attrs) {
              attrs = $attrs;
            },
          }),
        );

        createInjector(["test1"]).invoke((_$compile_, _$rootScope_) => {
          $compile = _$compile_;
          $rootScope = _$rootScope_;
        });

        $compile('<div attr-exposer to-string="{{1 + 1}}">')($rootScope);
        $rootScope.$apply();
        expect(attrs.toString).toBe("2");
      });

      it("should not initialize scope value if optional expression binding is not passed", () => {
        element = $compile("<div my-component></div>")($rootScope);
        const isolateScope = $rootScope.$$childHead;
        expect(isolateScope.optExpr).toBeUndefined();
      });

      it("should not initialize scope value if optional expression binding with Object.prototype name is not passed", () => {
        element = $compile("<div my-component></div>")($rootScope);
        const isolateScope = $rootScope.$$childHead;
        expect(isolateScope.constructor).toBe($rootScope.constructor);
      });

      it("should initialize scope value if optional expression binding is passed", () => {
        element = $compile(
          "<div my-component opt-expr=\"value = 'did!'\"></div>",
        )($rootScope);
        const isolateScope = $rootScope.$$childHead;
        expect(typeof isolateScope.optExpr).toBe("function");
        expect(isolateScope.optExpr()).toBe("did!");
        expect($rootScope.value).toBe("did!");
      });

      it("should initialize scope value if optional expression binding with Object.prototype name is passed", () => {
        element = $compile(
          "<div my-component constructor=\"value = 'did!'\"></div>",
        )($rootScope);
        const isolateScope = $rootScope.$$childHead;
        expect(typeof isolateScope.constructor).toBe("function");
        expect(isolateScope.constructor()).toBe("did!");
        expect($rootScope.value).toBe("did!");
      });

      it("should not overwrite @-bound property each digest when not present", () => {
        module.directive(
          "testDir",
          valueFn({
            scope: { prop: "@" },
            controller($scope) {
              $scope.prop = $scope.prop || "default";
              this.getProp = () => {
                return $scope.prop;
              };
            },
            controllerAs: "ctrl",
            template: "<p></p>",
          }),
        );

        createInjector(["test1"]).invoke((_$compile_, _$rootScope_) => {
          $compile = _$compile_;
          $rootScope = _$rootScope_;
        });

        element = $compile("<div test-dir></div>")($rootScope);
        const scope = $rootScope.$$childHead;
        expect(scope.ctrl.getProp()).toBe("default");

        expect(scope.ctrl.getProp()).toBe("default");
      });

      it('should ignore optional "="-bound property if value is the empty string', () => {
        module.directive(
          "testDir",
          valueFn({
            scope: { prop: "=?" },
            controller($scope) {
              $scope.prop = $scope.prop || "default";
              this.getProp = () => {
                return $scope.prop;
              };
            },
            controllerAs: "ctrl",
            template: "<p></p>",
          }),
        );

        createInjector(["test1"]).invoke((_$compile_, _$rootScope_) => {
          $compile = _$compile_;
          $rootScope = _$rootScope_;
        });

        element = $compile("<div test-dir></div>")($rootScope);
        const scope = $rootScope.$$childHead;
        expect(scope.ctrl.getProp()).toBe("default");
        expect(scope.ctrl.getProp()).toBe("default");
        scope.prop = "foop";
        expect(scope.ctrl.getProp()).toBe("foop");
      });

      describe("bind-once", () => {
        function countWatches(scope) {
          let result = 0;
          while (scope !== null) {
            result += (scope.$$watchers && scope.$$watchers.length) || 0;
            result += countWatches(scope.$$childHead);
            scope = scope.$$nextSibling;
          }
          return result;
        }

        it("should be possible to one-time bind a parameter on a component with a template", () => {
          module.directive("otherTplDir", () => ({
            scope: { param1: "=", param2: "=" },
            template: "1:{{param1}};2:{{param2}};3:{{::param1}};4:{{::param2}}",
          }));

          dealoc(document.getElementById("dummy"));
          window.angular
            .bootstrap(document.getElementById("dummy"), ["test1"])
            .invoke((_$compile_, _$rootScope_) => {
              $compile = _$compile_;
              $rootScope = _$rootScope_;
            });

          element = $compile(
            '<div other-tpl-dir param1="::foo" param2="bar"></div>',
          )($rootScope);
          expect(countWatches($rootScope)).toEqual(6); // 4 -> template watch group, 2 -> '='
          expect(element.html()).toBe("1:;2:;3:;4:");
          expect(countWatches($rootScope)).toEqual(6);

          $rootScope.foo = "foo";
          expect(element.html()).toBe("1:foo;2:;3:foo;4:");
          expect(countWatches($rootScope)).toEqual(4);

          $rootScope.foo = "baz";
          $rootScope.bar = "bar";
          expect(element.html()).toBe("1:foo;2:bar;3:foo;4:bar");
          expect(countWatches($rootScope)).toEqual(3);

          $rootScope.bar = "baz";
          expect(element.html()).toBe("1:foo;2:baz;3:foo;4:bar");
        });

        it("should be possible to one-time bind a parameter on a component with a template", () => {
          module.directive("otherTplDir", () => ({
            scope: { param1: "@", param2: "@" },
            template: "1:{{param1}};2:{{param2}};3:{{::param1}};4:{{::param2}}",
          }));

          dealoc(document.getElementById("dummy"));
          window.angular
            .bootstrap(document.getElementById("dummy"), ["test1"])
            .invoke((_$compile_, _$rootScope_) => {
              $compile = _$compile_;
              $rootScope = _$rootScope_;
            });

          element = $compile(
            '<div other-tpl-dir param1="{{::foo}}" param2="{{bar}}"></div>',
          )($rootScope);
          expect(countWatches($rootScope)).toEqual(6); // 4 -> template watch group, 2 -> {{ }}
          expect(element.html()).toBe("1:;2:;3:;4:");
          expect(countWatches($rootScope)).toEqual(4); // (- 2) -> bind-once in template

          $rootScope.foo = "foo";
          expect(element.html()).toBe("1:foo;2:;3:;4:");
          expect(countWatches($rootScope)).toEqual(3);

          $rootScope.foo = "baz";
          $rootScope.bar = "bar";
          expect(element.html()).toBe("1:foo;2:bar;3:;4:");
          expect(countWatches($rootScope)).toEqual(3);

          $rootScope.bar = "baz";
          expect(element.html()).toBe("1:foo;2:baz;3:;4:");
        });

        it("should be possible to one-time bind a parameter on a component with a template", () => {
          module.directive("otherTplDir", () => ({
            scope: { param1: "=", param2: "=" },
            templateUrl: "other.html",
          }));

          dealoc(document.getElementById("dummy"));
          window.angular
            .bootstrap(document.getElementById("dummy"), ["test1"])
            .invoke((_$compile_, _$rootScope_, _$templateCache_) => {
              $compile = _$compile_;
              $rootScope = _$rootScope_;
              $templateCache = _$templateCache_;
            });

          $templateCache.set(
            "other.html",
            "1:{{param1}};2:{{param2}};3:{{::param1}};4:{{::param2}}",
          );
          element = $compile(
            '<div other-tpl-dir param1="::foo" param2="bar"></div>',
          )($rootScope);
          expect(element.html()).toBe("1:;2:;3:;4:");
          expect(countWatches($rootScope)).toEqual(6); // 4 -> template watch group, 2 -> '='

          $rootScope.foo = "foo";
          expect(element.html()).toBe("1:foo;2:;3:foo;4:");
          expect(countWatches($rootScope)).toEqual(4);

          $rootScope.foo = "baz";
          $rootScope.bar = "bar";
          expect(element.html()).toBe("1:foo;2:bar;3:foo;4:bar");
          expect(countWatches($rootScope)).toEqual(3);

          $rootScope.bar = "baz";
          expect(element.html()).toBe("1:foo;2:baz;3:foo;4:bar");
        });

        it("should be possible to one-time bind a parameter on a component with a template", () => {
          module.directive("otherTplDir", () => ({
            scope: { param1: "@", param2: "@" },
            templateUrl: "other.html",
          }));

          dealoc(document.getElementById("dummy"));
          window.angular
            .bootstrap(document.getElementById("dummy"), ["test1"])
            .invoke((_$compile_, _$rootScope_, _$templateCache_) => {
              $compile = _$compile_;
              $rootScope = _$rootScope_;
              $templateCache = _$templateCache_;
            });

          $templateCache.set(
            "other.html",
            "1:{{param1}};2:{{param2}};3:{{::param1}};4:{{::param2}}",
          );
          element = $compile(
            '<div other-tpl-dir param1="{{::foo}}" param2="{{bar}}"></div>',
          )($rootScope);
          expect(element.html()).toBe("1:;2:;3:;4:");
          expect(countWatches($rootScope)).toEqual(4); // (4 - 2) -> template watch group, 2 -> {{ }}

          $rootScope.foo = "foo";
          expect(element.html()).toBe("1:foo;2:;3:;4:");
          expect(countWatches($rootScope)).toEqual(3);

          $rootScope.foo = "baz";
          $rootScope.bar = "bar";
          expect(element.html()).toBe("1:foo;2:bar;3:;4:");
          expect(countWatches($rootScope)).toEqual(3);

          $rootScope.bar = "baz";
          expect(element.html()).toBe("1:foo;2:baz;3:;4:");
        });

        it("should continue with a digets cycle when there is a two-way binding from the child to the parent", () => {
          module.directive("hello", () => ({
            restrict: "E",
            scope: { greeting: "=" },
            template: '<button ng-click="setGreeting()">Say hi!</button>',
            link(scope) {
              scope.setGreeting = () => {
                scope.greeting = "Hello!";
              };
            },
          }));

          createInjector(["test1"]).invoke(
            (_$compile_, _$rootScope_, _$templateCache_) => {
              $compile = _$compile_;
              $rootScope = _$rootScope_;
              $templateCache = _$templateCache_;
            },
          );

          element = $compile(
            "<div>" +
              "<p>{{greeting}}</p>" +
              '<div><hello greeting="greeting"></hello></div>' +
              "</div>",
          )($rootScope);
          element.find("button")[0].click();
          expect(element.find("p").text()).toBe("Hello!");
        });
      });

      describe("attribute", () => {
        it("should copy simple attribute", () => {
          element = $compile(
            '<div><span my-component attr="some text" $attr$="some other text">',
          )($rootScope);

          expect(componentScope.attr).toEqual("some text");
          expect(componentScope.attrAlias).toEqual("some text");
          expect(componentScope.$attrAlias).toEqual("some other text");
          expect(componentScope.attrAlias).toEqual(componentScope.attr);
        });

        it("should copy an attribute with spaces", () => {
          element = $compile(
            '<div><span my-component attr=" some text " $attr$=" some other text ">',
          )($rootScope);

          expect(componentScope.attr).toEqual(" some text ");
          expect(componentScope.attrAlias).toEqual(" some text ");
          expect(componentScope.$attrAlias).toEqual(" some other text ");
          expect(componentScope.attrAlias).toEqual(componentScope.attr);
        });

        it("should set up the interpolation before it reaches the link function", () => {
          $rootScope.name = "misko";
          $compile(
            '<div><span my-component attr="hello {{name}}" $attr$="hi {{name}}">',
          )($rootScope);
          expect(componentScope.attr).toEqual("hello misko");
          expect(componentScope.attrAlias).toEqual("hello misko");
          expect(componentScope.$attrAlias).toEqual("hi misko");
        });

        it("should update when interpolated attribute updates", () => {
          $compile(
            '<div><span my-component attr="hello {{name}}" $attr$="hi {{name}}">',
          )($rootScope);

          $rootScope.name = "igor";
          $rootScope.$apply();

          expect(componentScope.attr).toEqual("hello igor");
          expect(componentScope.attrAlias).toEqual("hello igor");
          expect(componentScope.$attrAlias).toEqual("hi igor");
        });
      });

      describe("object reference", () => {
        it("should update local when origin changes", () => {
          $compile('<div><span my-component ref="name" $ref$="name">')(
            $rootScope,
          );
          expect(componentScope.ref).toBeUndefined();
          expect(componentScope.refAlias).toBe(componentScope.ref);
          expect(componentScope.$refAlias).toBe(componentScope.ref);

          $rootScope.name = "misko";
          $rootScope.$apply();

          expect($rootScope.name).toBe("misko");
          expect(componentScope.ref).toBe("misko");
          expect(componentScope.refAlias).toBe("misko");
          expect(componentScope.$refAlias).toBe("misko");

          $rootScope.name = {};
          $rootScope.$apply();
          expect(componentScope.ref).toBe($rootScope.name);
          expect(componentScope.refAlias).toBe($rootScope.name);
          expect(componentScope.$refAlias).toBe($rootScope.name);
        });

        it("should update local when both change", () => {
          $compile('<div><span my-component ref="name" $ref$="name">')(
            $rootScope,
          );
          $rootScope.name = { mark: 123 };
          componentScope.ref = "misko";

          $rootScope.$apply();
          expect($rootScope.name).toEqual({ mark: 123 });
          expect(componentScope.ref).toBe($rootScope.name);
          expect(componentScope.refAlias).toBe($rootScope.name);
          expect(componentScope.$refAlias).toBe($rootScope.name);

          $rootScope.name = "igor";
          componentScope.ref = {};
          $rootScope.$apply();
          expect($rootScope.name).toEqual("igor");
          expect(componentScope.ref).toBe($rootScope.name);
          expect(componentScope.refAlias).toBe($rootScope.name);
          expect(componentScope.$refAlias).toBe($rootScope.name);
        });

        it("should not break if local and origin both change to the same value", () => {
          $rootScope.name = "aaa";

          $compile('<div><span my-component ref="name">')($rootScope);

          // change both sides to the same item within the same digest cycle
          componentScope.ref = "same";
          $rootScope.name = "same";
          $rootScope.$apply();

          // change origin back to its previous value
          $rootScope.name = "aaa";
          $rootScope.$apply();

          expect($rootScope.name).toBe("aaa");
          expect(componentScope.ref).toBe("aaa");
        });

        it("should complain on non assignable changes", () => {
          $compile("<div><span my-component ref=\"'hello ' + name\">")(
            $rootScope,
          );
          $rootScope.name = "world";
          $rootScope.$apply();
          expect(componentScope.ref).toBe("hello world");

          componentScope.ref = "ignore me";
          expect(() => {
            $rootScope.$apply();
          }).toThrowError(/nonassign/);
          expect(componentScope.ref).toBe("hello world");
          // reset since the exception was rethrown which prevented phase clearing
          $rootScope.$$phase = 0;

          $rootScope.name = "misko";
          $rootScope.$apply();
          expect(componentScope.ref).toBe("hello misko");
        });

        it("should complain if assigning to undefined", () => {
          $compile("<div><span my-component>")($rootScope);
          $rootScope.$apply();
          expect(componentScope.ref).toBeUndefined();

          componentScope.ref = "ignore me";
          expect(() => {
            $rootScope.$apply();
          }).toThrowError(/nonassign/);
          expect(componentScope.ref).toBeUndefined();

          $rootScope.$$phase = 0; // reset since the exception was rethrown which prevented phase clearing
          $rootScope.$apply();
          expect(componentScope.ref).toBeUndefined();
        });

        // regression
        it("should stabilize model", () => {
          $compile('<div><span my-component reference="name">')($rootScope);

          let lastRefValueInParent;
          $rootScope.$watch("name", (ref) => {
            lastRefValueInParent = ref;
          });

          $rootScope.name = "aaa";
          $rootScope.$apply();

          componentScope.reference = "new";
          $rootScope.$apply();

          expect(lastRefValueInParent).toBe("new");
        });

        describe("literal objects", () => {
          it("should copy parent changes", () => {
            $compile('<div><span my-component reference="{name: name}">')(
              $rootScope,
            );

            $rootScope.name = "a";
            $rootScope.$apply();
            expect(componentScope.reference).toEqual({ name: "a" });

            $rootScope.name = "b";
            $rootScope.$apply();
            expect(componentScope.reference).toEqual({ name: "b" });
          });

          it("should not change the component when parent does not change", () => {
            $compile('<div><span my-component reference="{name: name}">')(
              $rootScope,
            );

            $rootScope.name = "a";
            $rootScope.$apply();
            const lastComponentValue = componentScope.reference;
            $rootScope.$apply();
            expect(componentScope.reference).toBe(lastComponentValue);
          });

          it("should complain when the component changes", () => {
            $compile('<div><span my-component reference="{name: name}">')(
              $rootScope,
            );

            $rootScope.name = "a";
            $rootScope.$apply();
            componentScope.reference = { name: "b" };
            expect(() => {
              $rootScope.$apply();
            }).toThrowError(/nonassign/);
          });

          it("should work for primitive literals", () => {
            test("1", 1);
            test("null", null);
            test("undefined", undefined);
            test("'someString'", "someString");
            test("true", true);

            function test(literalString, literalValue) {
              $compile(`<div><span my-component reference="${literalString}">`)(
                $rootScope,
              );

              $rootScope.$apply();
              expect(componentScope.reference).toBe(literalValue);
              dealoc(element);
            }
          });
        });
      });

      describe("optional object reference", () => {
        it("should update local when origin changes", () => {
          $compile('<div><span my-component optref="name" $optref$="name">')(
            $rootScope,
          );
          expect(componentScope.optRef).toBeUndefined();
          expect(componentScope.optRefAlias).toBe(componentScope.optRef);
          expect(componentScope.$optRefAlias).toBe(componentScope.optRef);

          $rootScope.name = "misko";
          $rootScope.$apply();
          expect(componentScope.optref).toBe($rootScope.name);
          expect(componentScope.optrefAlias).toBe($rootScope.name);
          expect(componentScope.$optrefAlias).toBe($rootScope.name);

          $rootScope.name = {};
          $rootScope.$apply();
          expect(componentScope.optref).toBe($rootScope.name);
          expect(componentScope.optrefAlias).toBe($rootScope.name);
          expect(componentScope.$optrefAlias).toBe($rootScope.name);
        });

        it("should not throw exception when reference does not exist", () => {
          $compile("<div><span my-component>")($rootScope);

          expect(componentScope.optref).toBeUndefined();
          expect(componentScope.optrefAlias).toBeUndefined();
          expect(componentScope.$optrefAlias).toBeUndefined();
          expect(componentScope.optreference).toBeUndefined();
        });
      });

      describe("collection object reference", () => {
        it("should update isolate scope when origin scope changes", () => {
          $rootScope.collection = [
            {
              name: "Gabriel",
              value: 18,
            },
            {
              name: "Tony",
              value: 91,
            },
          ];
          $rootScope.query = "";
          $rootScope.$apply();

          $compile(
            '<div><span my-component colref="collection | filter:query" $colref$="collection | filter:query">',
          )($rootScope);

          expect(componentScope.colref).toEqual($rootScope.collection);
          expect(componentScope.colrefAlias).toEqual(componentScope.colref);
          expect(componentScope.$colrefAlias).toEqual(componentScope.colref);

          $rootScope.query = "Gab";
          $rootScope.$apply();

          expect(componentScope.colref).toEqual([$rootScope.collection[0]]);
          expect(componentScope.colrefAlias).toEqual([
            $rootScope.collection[0],
          ]);
          expect(componentScope.$colrefAlias).toEqual([
            $rootScope.collection[0],
          ]);
        });

        it("should update origin scope when isolate scope changes", () => {
          $rootScope.collection = [
            {
              name: "Gabriel",
              value: 18,
            },
            {
              name: "Tony",
              value: 91,
            },
          ];

          $compile('<div><span my-component colref="collection">')($rootScope);

          const newItem = {
            name: "Pablo",
            value: 10,
          };
          componentScope.colref.push(newItem);
          componentScope.$apply();

          expect($rootScope.collection[2]).toEqual(newItem);
        });
      });

      describe("one-way binding", () => {
        it("should update isolate when the identity of origin changes", () => {
          $compile('<div><span my-component ow-ref="obj" $ow-ref$="obj">')(
            $rootScope,
          );

          expect(componentScope.owRef).toBeUndefined();
          expect(componentScope.owRefAlias).toBe(componentScope.owRef);
          expect(componentScope.$owRefAlias).toBe(componentScope.owRef);

          $rootScope.obj = { value: "initial" };
          $rootScope.$apply();

          expect($rootScope.obj).toEqual({ value: "initial" });
          expect(componentScope.owRef).toEqual({ value: "initial" });
          expect(componentScope.owRefAlias).toBe(componentScope.owRef);
          expect(componentScope.$owRefAlias).toBe(componentScope.owRef);

          // This changes in both scopes because of reference
          $rootScope.obj.value = "origin1";
          $rootScope.$apply();
          expect(componentScope.owRef.value).toBe("origin1");
          expect(componentScope.owRefAlias.value).toBe("origin1");
          expect(componentScope.$owRefAlias.value).toBe("origin1");

          componentScope.owRef = { value: "isolate1" };
          componentScope.$apply();
          expect($rootScope.obj.value).toBe("origin1");

          // Change does not propagate because object identity hasn't changed
          $rootScope.obj.value = "origin2";
          $rootScope.$apply();
          expect(componentScope.owRef.value).toBe("isolate1");
          expect(componentScope.owRefAlias.value).toBe("origin2");
          expect(componentScope.$owRefAlias.value).toBe("origin2");

          // Change does propagate because object identity changes
          $rootScope.obj = { value: "origin3" };
          $rootScope.$apply();
          expect(componentScope.owRef.value).toBe("origin3");
          expect(componentScope.owRef).toBe($rootScope.obj);
          expect(componentScope.owRefAlias).toBe($rootScope.obj);
          expect(componentScope.$owRefAlias).toBe($rootScope.obj);
        });

        it("should update isolate when both change", () => {
          $compile('<div><span my-component ow-ref="name" $ow-ref$="name">')(
            $rootScope,
          );

          $rootScope.name = { mark: 123 };
          componentScope.owRef = "misko";

          $rootScope.$apply();
          expect($rootScope.name).toEqual({ mark: 123 });
          expect(componentScope.owRef).toBe($rootScope.name);
          expect(componentScope.owRefAlias).toBe($rootScope.name);
          expect(componentScope.$owRefAlias).toBe($rootScope.name);

          $rootScope.name = "igor";
          componentScope.owRef = {};
          $rootScope.$apply();
          expect($rootScope.name).toEqual("igor");
          expect(componentScope.owRef).toBe($rootScope.name);
          expect(componentScope.owRefAlias).toBe($rootScope.name);
          expect(componentScope.$owRefAlias).toBe($rootScope.name);
        });

        describe("initialization", () => {
          let component;

          beforeEach(() => {
            log = [];
            module.component("owComponent", {
              bindings: { input: "<" },
              controller() {
                component = this;
                this.input = "constructor";
                log.push("constructor");

                this.$onInit = () => {
                  this.input = "$onInit";
                  log.push("$onInit");
                };

                this.$onChanges = function (changes) {
                  if (changes.input) {
                    log.push(["$onChanges", structuredClone(changes.input)]);
                  }
                };
              },
            });

            module.directive(
              "changeInput",
              () =>
                function (scope, elem, attrs) {
                  scope.name = "outer2";
                },
            );

            createInjector(["test1"]).invoke((_$compile_, _$rootScope_) => {
              $compile = _$compile_;
              $rootScope = _$rootScope_;
            });
          });

          it("should not update isolate again after $onInit if outer has not changed", () => {
            $rootScope.name = "outer";
            $compile('<ow-component input="name"></ow-component>')($rootScope);

            expect($rootScope.name).toEqual("outer");
            expect(component.input).toEqual("$onInit");

            expect($rootScope.name).toEqual("outer");
            expect(component.input).toEqual("$onInit");

            expect(log).toEqual([
              "constructor",
              [
                "$onChanges",
                jasmine.objectContaining({ currentValue: "outer" }),
              ],
              "$onInit",
            ]);
          });

          it("should not update isolate again after $onInit if outer object reference has not changed", () => {
            $rootScope.name = ["outer"];
            $compile('<ow-component input="name"></ow-component>')($rootScope);

            expect($rootScope.name).toEqual(["outer"]);
            expect(component.input).toEqual("$onInit");

            $rootScope.name[0] = "inner";
            expect($rootScope.name).toEqual(["inner"]);
            expect(component.input).toEqual("$onInit");

            expect(log).toEqual([
              "constructor",
              [
                "$onChanges",
                jasmine.objectContaining({ currentValue: ["outer"] }),
              ],
              "$onInit",
            ]);
          });

          it("should update isolate again after $onInit if outer object reference changes even if equal", () => {
            $rootScope.name = ["outer"];
            $compile('<ow-component input="name"></ow-component>')($rootScope);

            expect($rootScope.name).toEqual(["outer"]);
            expect(component.input).toEqual("$onInit");

            $rootScope.name = ["outer"];
            expect($rootScope.name).toEqual(["outer"]);
            expect(component.input).toEqual(["outer"]);

            expect(log).toEqual([
              "constructor",
              [
                "$onChanges",
                jasmine.objectContaining({ currentValue: ["outer"] }),
              ],
              "$onInit",
              [
                "$onChanges",
                jasmine.objectContaining({
                  previousValue: ["outer"],
                  currentValue: ["outer"],
                }),
              ],
            ]);
          });

          it("should not update isolate again after $onInit if outer is a literal", () => {
            $rootScope.name = "outer";
            $compile('<ow-component input="[name]"></ow-component>')(
              $rootScope,
            );

            expect(component.input).toEqual("$onInit");

            // No outer change
            $rootScope.$apply('name = "outer"');
            expect(component.input).toEqual("$onInit");

            // Outer change
            $rootScope.$apply('name = "re-outer"');
            expect(component.input).toEqual(["re-outer"]);

            expect(log).toEqual([
              "constructor",
              [
                "$onChanges",
                jasmine.objectContaining({ currentValue: ["outer"] }),
              ],
              "$onInit",
              [
                "$onChanges",
                jasmine.objectContaining({
                  previousValue: ["outer"],
                  currentValue: ["re-outer"],
                }),
              ],
            ]);
          });

          it("should update isolate again after $onInit if outer has changed (before initial watchAction call)", () => {
            $rootScope.name = "outer1";
            $compile('<ow-component input="name"></ow-component>')($rootScope);

            expect(component.input).toEqual("$onInit");
            $rootScope.$apply('name = "outer2"');

            expect($rootScope.name).toEqual("outer2");
            expect(component.input).toEqual("outer2");
            expect(log).toEqual([
              "constructor",
              [
                "$onChanges",
                jasmine.objectContaining({ currentValue: "outer1" }),
              ],
              "$onInit",
              [
                "$onChanges",
                jasmine.objectContaining({
                  currentValue: "outer2",
                  previousValue: "outer1",
                }),
              ],
            ]);
          });

          it("should update isolate again after $onInit if outer has changed (before initial watchAction call)", () => {
            $rootScope.name = "outer1";
            $compile('<ow-component input="name" change-input></ow-component>')(
              $rootScope,
            );

            expect(component.input).toEqual("$onInit");
            expect($rootScope.name).toEqual("outer2");
            expect(component.input).toEqual("outer2");
            expect(log).toEqual([
              "constructor",
              [
                "$onChanges",
                jasmine.objectContaining({ currentValue: "outer1" }),
              ],
              "$onInit",
              [
                "$onChanges",
                jasmine.objectContaining({
                  currentValue: "outer2",
                  previousValue: "outer1",
                }),
              ],
            ]);
          });

          it("should not break when isolate and origin both change to the same value", () => {
            $rootScope.name = "aaa";
            $compile('<div><span my-component ow-ref="name">')($rootScope);

            // change both sides to the same item within the same digest cycle
            componentScope.owRef = "same";
            $rootScope.name = "same";
            $rootScope.$apply();

            // change origin back to its previous value
            $rootScope.name = "aaa";
            $rootScope.$apply();

            expect($rootScope.name).toBe("aaa");
            expect(componentScope.owRef).toBe("aaa");
          });

          it("should not update origin when identity of isolate changes", () => {
            $rootScope.name = { mark: 123 };
            $compile('<div><span my-component ow-ref="name" $ow-ref$="name">')(
              $rootScope,
            );

            expect($rootScope.name).toEqual({ mark: 123 });
            expect(componentScope.owRef).toBe($rootScope.name);
            expect(componentScope.owRefAlias).toBe($rootScope.name);
            expect(componentScope.$owRefAlias).toBe($rootScope.name);

            componentScope.owRef = "martin";
            $rootScope.$apply();
            expect($rootScope.name).toEqual({ mark: 123 });
            expect(componentScope.owRef).toBe("martin");
            expect(componentScope.owRefAlias).toEqual({ mark: 123 });
            expect(componentScope.$owRefAlias).toEqual({ mark: 123 });
          });

          it("should update origin when property of isolate object reference changes", () => {
            $rootScope.obj = { mark: 123 };
            $compile('<div><span my-component ow-ref="obj">')($rootScope);

            expect($rootScope.obj).toEqual({ mark: 123 });
            expect(componentScope.owRef).toBe($rootScope.obj);

            componentScope.owRef.mark = 789;
            $rootScope.$apply();
            expect($rootScope.obj).toEqual({ mark: 789 });
            expect(componentScope.owRef).toBe($rootScope.obj);
          });

          it("should not throw on non assignable expressions in the parent", () => {
            $compile("<div><span my-component ow-ref=\"'hello ' + name\">")(
              $rootScope,
            );

            $rootScope.name = "world";
            $rootScope.$apply();
            expect(componentScope.owRef).toBe("hello world");

            componentScope.owRef = "ignore me";
            expect(componentScope.owRef).toBe("ignore me");
            expect($rootScope.name).toBe("world");

            $rootScope.name = "misko";
            $rootScope.$apply();
            expect(componentScope.owRef).toBe("hello misko");
          });

          it("should not throw when assigning to undefined", () => {
            $compile("<div><span my-component>")($rootScope);

            expect(componentScope.owRef).toBeUndefined();

            componentScope.owRef = "ignore me";
            expect(componentScope.owRef).toBe("ignore me");

            $rootScope.$apply();
            expect(componentScope.owRef).toBe("ignore me");
          });

          it('should update isolate scope when "<"-bound NaN changes', () => {
            $rootScope.num = NaN;
            element = $compile('<div my-component ow-ref="num"></div>')(
              $rootScope,
            );

            const isolateScope = $rootScope.$$childHead;
            expect(isolateScope.owRef).toBeNaN();

            $rootScope.num = 64;
            $rootScope.$apply();
            expect(isolateScope.owRef).toBe(64);
          });
        });

        describe("literal objects", () => {
          it("should copy parent changes", () => {
            $compile('<div><span my-component ow-ref="{name: name}">')(
              $rootScope,
            );

            $rootScope.name = "a";
            $rootScope.$apply();
            expect(componentScope.owRef).toEqual({ name: "a" });

            $rootScope.name = "b";
            $rootScope.$apply();
            expect(componentScope.owRef).toEqual({ name: "b" });
          });

          it("should not change the isolated scope when origin does not change", () => {
            $compile('<div><span my-component ref="{name: name}">')($rootScope);

            $rootScope.name = "a";
            $rootScope.$apply();
            const lastComponentValue = componentScope.owRef;
            $rootScope.$apply();
            expect(componentScope.owRef).toBe(lastComponentValue);
          });

          it("should watch input values to array literals", () => {
            $rootScope.name = "georgios";
            $rootScope.obj = { name: "pete" };
            $compile('<div><span my-component ow-ref="[{name: name}, obj]">')(
              $rootScope,
            );

            expect(componentScope.owRef).toEqual([
              { name: "georgios" },
              { name: "pete" },
            ]);

            $rootScope.name = "lucas";
            $rootScope.obj = { name: "martin" };
            $rootScope.$apply();
            expect(componentScope.owRef).toEqual([
              { name: "lucas" },
              { name: "martin" },
            ]);
          });

          it("should watch input values object literals", () => {
            $rootScope.name = "georgios";
            $rootScope.obj = { name: "pete" };
            $compile(
              '<div><span my-component ow-ref="{name: name, item: obj}">',
            )($rootScope);

            expect(componentScope.owRef).toEqual({
              name: "georgios",
              item: { name: "pete" },
            });

            $rootScope.name = "lucas";
            $rootScope.obj = { name: "martin" };
            $rootScope.$apply();
            expect(componentScope.owRef).toEqual({
              name: "lucas",
              item: { name: "martin" },
            });
          });

          // https://github.com/angular/angular.js/issues/15833
          it("should work with ng-model inputs", () => {
            let componentScope;

            module.directive("undi", () => ({
              restrict: "A",
              scope: {
                undi: "<",
              },
              link($scope) {
                componentScope = $scope;
              },
            }));

            createInjector(["test1"]).invoke((_$compile_, _$rootScope_) => {
              $compile = _$compile_;
              $rootScope = _$rootScope_;
            });

            element = $compile(
              '<form name="f" undi="[f.i]"><input name="i" ng-model="a"/></form>',
            )($rootScope);
            $rootScope.$apply();
            expect(componentScope.undi).toBeDefined();
          });

          it("should not complain when the isolated scope changes", () => {
            $compile('<div><span my-component ow-ref="{name: name}">')(
              $rootScope,
            );

            $rootScope.name = "a";
            $rootScope.$apply();
            componentScope.owRef = { name: "b" };
            componentScope.$apply();

            expect(componentScope.owRef).toEqual({ name: "b" });
            expect($rootScope.name).toBe("a");

            $rootScope.name = "c";
            $rootScope.$apply();
            expect(componentScope.owRef).toEqual({ name: "c" });
          });

          it("should work for primitive literals", () => {
            test("1", 1);
            test("null", null);
            test("undefined", undefined);
            test("'someString'", "someString");
            test("true", true);

            function test(literalString, literalValue) {
              $compile(`<div><span my-component ow-ref="${literalString}">`)(
                $rootScope,
              );

              expect(componentScope.owRef).toBe(literalValue);
              dealoc(element);
            }
          });

          describe("optional one-way binding", () => {
            it("should update local when origin changes", () => {
              $compile(
                '<div><span my-component ow-optref="name" $ow-optref$="name">',
              )($rootScope);

              expect(componentScope.owOptref).toBeUndefined();
              expect(componentScope.owOptrefAlias).toBe(
                componentScope.owOptref,
              );
              expect(componentScope.$owOptrefAlias).toBe(
                componentScope.owOptref,
              );

              $rootScope.name = "misko";
              $rootScope.$apply();
              expect(componentScope.owOptref).toBe($rootScope.name);
              expect(componentScope.owOptrefAlias).toBe($rootScope.name);
              expect(componentScope.$owOptrefAlias).toBe($rootScope.name);

              $rootScope.name = {};
              $rootScope.$apply();
              expect(componentScope.owOptref).toBe($rootScope.name);
              expect(componentScope.owOptrefAlias).toBe($rootScope.name);
              expect(componentScope.$owOptrefAlias).toBe($rootScope.name);
            });

            it("should not throw exception when reference does not exist", () => {
              $compile("<div><span my-component>")($rootScope);

              expect(componentScope.owOptref).toBeUndefined();
              expect(componentScope.owOptrefAlias).toBeUndefined();
              expect(componentScope.$owOptrefAlias).toBeUndefined();
            });
          });
        });
      });

      describe("one-way collection bindings", () => {
        it("should update isolate scope when origin scope changes", () => {
          $rootScope.collection = [
            {
              name: "Gabriel",
              value: 18,
            },
            {
              name: "Tony",
              value: 91,
            },
          ];
          $rootScope.query = "";
          $rootScope.$apply();

          $compile(
            '<div><span my-component ow-colref="collection | filter:query" $ow-colref$="collection | filter:query">',
          )($rootScope);

          expect(componentScope.owColref).toEqual($rootScope.collection);
          expect(componentScope.owColrefAlias).toEqual(componentScope.owColref);
          expect(componentScope.$owColrefAlias).toEqual(
            componentScope.owColref,
          );

          $rootScope.query = "Gab";
          $rootScope.$apply();

          expect(componentScope.owColref).toEqual([$rootScope.collection[0]]);
          expect(componentScope.owColrefAlias).toEqual([
            $rootScope.collection[0],
          ]);
          expect(componentScope.$owColrefAlias).toEqual([
            $rootScope.collection[0],
          ]);
        });

        it("should not update isolate scope when deep state within origin scope changes", () => {
          $rootScope.collection = [
            {
              name: "Gabriel",
              value: 18,
            },
            {
              name: "Tony",
              value: 91,
            },
          ];
          $rootScope.$apply();

          $compile(
            '<div><span my-component ow-colref="collection" $ow-colref$="collection">',
          )($rootScope);

          expect(componentScope.owColref).toEqual($rootScope.collection);
          expect(componentScope.owColrefAlias).toEqual(componentScope.owColref);
          expect(componentScope.$owColrefAlias).toEqual(
            componentScope.owColref,
          );

          componentScope.owColref =
            componentScope.owColrefAlias =
            componentScope.$owColrefAlias =
              undefined;
          $rootScope.collection[0].name = "Joe";
          $rootScope.$apply();

          expect(componentScope.owColref).toBeUndefined();
          expect(componentScope.owColrefAlias).toBeUndefined();
          expect(componentScope.$owColrefAlias).toBeUndefined();
        });

        it("should update isolate scope when origin scope changes", () => {
          $rootScope.gab = {
            name: "Gabriel",
            value: 18,
          };
          $rootScope.tony = {
            name: "Tony",
            value: 91,
          };
          $rootScope.query = "";
          $rootScope.$apply();

          $compile(
            '<div><span my-component ow-colref="[gab, tony] | filter:query" $ow-colref$="[gab, tony] | filter:query">',
          )($rootScope);

          expect(componentScope.owColref).toEqual([
            $rootScope.gab,
            $rootScope.tony,
          ]);
          expect(componentScope.owColrefAlias).toEqual([
            $rootScope.gab,
            $rootScope.tony,
          ]);
          expect(componentScope.$owColrefAlias).toEqual([
            $rootScope.gab,
            $rootScope.tony,
          ]);

          $rootScope.query = "Gab";
          $rootScope.$apply();

          expect(componentScope.owColref).toEqual([$rootScope.gab]);
          expect(componentScope.owColrefAlias).toEqual([$rootScope.gab]);
          expect(componentScope.$owColrefAlias).toEqual([$rootScope.gab]);
        });

        it("should update isolate scope when origin literal object content changes", () => {
          $rootScope.gab = {
            name: "Gabriel",
            value: 18,
          };
          $rootScope.tony = {
            name: "Tony",
            value: 91,
          };
          $rootScope.$apply();

          $compile(
            '<div><span my-component ow-colref="[gab, tony]" $ow-colref$="[gab, tony]">',
          )($rootScope);

          expect(componentScope.owColref).toEqual([
            $rootScope.gab,
            $rootScope.tony,
          ]);
          expect(componentScope.owColrefAlias).toEqual([
            $rootScope.gab,
            $rootScope.tony,
          ]);
          expect(componentScope.$owColrefAlias).toEqual([
            $rootScope.gab,
            $rootScope.tony,
          ]);

          $rootScope.tony = {
            name: "Bob",
            value: 42,
          };
          $rootScope.$apply();

          expect(componentScope.owColref).toEqual([
            $rootScope.gab,
            $rootScope.tony,
          ]);
          expect(componentScope.owColrefAlias).toEqual([
            $rootScope.gab,
            $rootScope.tony,
          ]);
          expect(componentScope.$owColrefAlias).toEqual([
            $rootScope.gab,
            $rootScope.tony,
          ]);
        });
      });

      describe("executable expression", () => {
        it("should allow expression execution with locals", () => {
          $compile(
            '<div><span my-component expr="count = count + offset" $expr$="count = count + offset">',
          )($rootScope);
          $rootScope.count = 2;

          expect(typeof componentScope.expr).toBe("function");
          expect(typeof componentScope.exprAlias).toBe("function");
          expect(typeof componentScope.$exprAlias).toBe("function");

          expect(componentScope.expr({ offset: 1 })).toEqual(3);
          expect($rootScope.count).toEqual(3);

          expect(componentScope.exprAlias({ offset: 10 })).toEqual(13);
          expect(componentScope.$exprAlias({ offset: 10 })).toEqual(23);
          expect($rootScope.count).toEqual(23);
        });
      });

      it("should throw on unknown definition", () => {
        expect(() => {
          $compile("<div><span bad-declaration>");
        }).toThrowError(/iscp/);
      });

      it("should expose a $$isolateBindings property onto the scope", () => {
        $compile("<div><span my-component>")($rootScope);

        expect(typeof componentScope.$$isolateBindings).toBe("object");

        expect(componentScope.$$isolateBindings.attr.mode).toBe("@");
        expect(componentScope.$$isolateBindings.attr.attrName).toBe("attr");
        expect(componentScope.$$isolateBindings.attrAlias.attrName).toBe(
          "attr",
        );
        expect(componentScope.$$isolateBindings.$attrAlias.attrName).toBe(
          "$attr$",
        );
        expect(componentScope.$$isolateBindings.ref.mode).toBe("=");
        expect(componentScope.$$isolateBindings.ref.attrName).toBe("ref");
        expect(componentScope.$$isolateBindings.refAlias.attrName).toBe("ref");
        expect(componentScope.$$isolateBindings.$refAlias.attrName).toBe(
          "$ref$",
        );
        expect(componentScope.$$isolateBindings.reference.mode).toBe("=");
        expect(componentScope.$$isolateBindings.reference.attrName).toBe(
          "reference",
        );
        expect(componentScope.$$isolateBindings.owRef.mode).toBe("<");
        expect(componentScope.$$isolateBindings.owRef.attrName).toBe("owRef");
        expect(componentScope.$$isolateBindings.owRefAlias.attrName).toBe(
          "owRef",
        );
        expect(componentScope.$$isolateBindings.$owRefAlias.attrName).toBe(
          "$owRef$",
        );
        expect(componentScope.$$isolateBindings.expr.mode).toBe("&");
        expect(componentScope.$$isolateBindings.expr.attrName).toBe("expr");
        expect(componentScope.$$isolateBindings.exprAlias.attrName).toBe(
          "expr",
        );
        expect(componentScope.$$isolateBindings.$exprAlias.attrName).toBe(
          "$expr$",
        );

        const firstComponentScope = componentScope;
        const first$$isolateBindings = componentScope.$$isolateBindings;

        dealoc(element);
        $compile("<div><span my-component>")($rootScope);
        expect(componentScope).not.toBe(firstComponentScope);
        expect(componentScope.$$isolateBindings).toBe(first$$isolateBindings);
      });

      it("should expose isolate scope variables on controller with controllerAs when bindToController is true (template)", () => {
        let controllerCalled = false;

        module.directive(
          "fooDir",
          valueFn({
            template: "<p>isolate</p>",
            scope: {
              data: "=dirData",
              oneway: "<dirData",
              str: "@dirStr",
              fn: "&dirFn",
            },
            controller($scope) {
              this.$onInit = () => {
                expect(this.data).toEqual({
                  foo: "bar",
                  baz: "biz",
                });
                expect(this.oneway).toEqual({
                  foo: "bar",
                  baz: "biz",
                });
                expect(this.str).toBe("Hello, world!");
                expect(this.fn()).toBe("called!");
              };
              controllerCalled = true;
            },
            controllerAs: "test",
            bindToController: true,
          }),
        );

        initInjector("test1");

        $rootScope.fn = valueFn("called!");
        $rootScope.whom = "world";
        $rootScope.remoteData = {
          foo: "bar",
          baz: "biz",
        };
        element = $compile(
          '<div foo-dir dir-data="remoteData" ' +
            'dir-str="Hello, {{whom}}!" ' +
            'dir-fn="fn()"></div>',
        )($rootScope);
        expect(controllerCalled).toBe(true);
      });

      it("should not pre-assign bound properties to the controller", () => {
        let controllerCalled = false;
        let onInitCalled = false;
        module.directive(
          "fooDir",
          valueFn({
            template: "<p>isolate</p>",
            scope: {
              data: "=dirData",
              oneway: "<dirData",
              str: "@dirStr",
              fn: "&dirFn",
            },
            controller($scope) {
              expect(this.data).toBeUndefined();
              expect(this.oneway).toBeUndefined();
              expect(this.str).toBeUndefined();
              expect(this.fn).toBeUndefined();
              controllerCalled = true;
              this.$onInit = () => {
                expect(this.data).toEqual({
                  foo: "bar",
                  baz: "biz",
                });
                expect(this.oneway).toEqual({
                  foo: "bar",
                  baz: "biz",
                });
                expect(this.str).toBe("Hello, world!");
                expect(this.fn()).toBe("called!");
                onInitCalled = true;
              };
            },
            controllerAs: "test",
            bindToController: true,
          }),
        );

        initInjector("test1");

        $rootScope.fn = valueFn("called!");
        $rootScope.whom = "world";
        $rootScope.remoteData = {
          foo: "bar",
          baz: "biz",
        };
        element = $compile(
          '<div foo-dir dir-data="remoteData" ' +
            'dir-str="Hello, {{whom}}!" ' +
            'dir-fn="fn()"></div>',
        )($rootScope);
        expect(controllerCalled).toBe(true);
        expect(onInitCalled).toBe(true);
      });

      it("should eventually expose isolate scope variables on ES6 class controller with controllerAs when bindToController is true", () => {
        var controllerCalled = false;
        var Controller = eval(
          "(\n" +
            "class Foo {\n" +
            "  constructor($scope) {}\n" +
            "  $onInit() {\n" +
            "    expect(this.data).toEqual({\n" +
            "      'foo': 'bar',\n" +
            "      'baz': 'biz'\n" +
            "    });\n" +
            "    expect(this.oneway).toEqual({\n" +
            "      'foo': 'bar',\n" +
            "      'baz': 'biz'\n" +
            "    });\n" +
            "    expect(this.str).toBe('Hello, world!');\n" +
            "    expect(this.fn()).toBe('called!');\n" +
            "    controllerCalled = true;\n" +
            "  }\n" +
            "}\n" +
            ")",
        );
        spyOn(Controller.prototype, "$onInit").and.callThrough();

        module.directive(
          "fooDir",
          valueFn({
            template: "<p>isolate</p>",
            scope: {
              data: "=dirData",
              oneway: "<dirData",
              str: "@dirStr",
              fn: "&dirFn",
            },
            controller: Controller,
            controllerAs: "test",
            bindToController: true,
          }),
        );
        initInjector("test1");
        $rootScope.fn = valueFn("called!");
        $rootScope.whom = "world";
        $rootScope.remoteData = {
          foo: "bar",
          baz: "biz",
        };
        element = $compile(
          '<div foo-dir dir-data="remoteData" ' +
            'dir-str="Hello, {{whom}}!" ' +
            'dir-fn="fn()"></div>',
        )($rootScope);
        expect(Controller.prototype.$onInit).toHaveBeenCalled();
        expect(controllerCalled).toBe(true);
      });

      it("should update @-bindings on controller when bindToController and attribute change observed", () => {
        module.directive(
          "atBinding",
          valueFn({
            template: "<p>{{At.text}}</p>",
            scope: {
              text: "@atBinding",
            },
            controller($scope) {},
            bindToController: true,
            controllerAs: "At",
          }),
        );
        initInjector("test1");
        element = $compile('<div at-binding="Test: {{text}}"></div>')(
          $rootScope,
        );
        const p = element.find("p");
        expect(p.text()).toBe("Test: ");

        $rootScope.text = "Kittens";
        expect(p.text()).toBe("Test: Kittens");
      });

      it("should expose isolate scope variables on controller with controllerAs when bindToController is true (templateUrl)", () => {
        let controllerCalled = false;
        module.directive(
          "fooDir",
          valueFn({
            templateUrl: "test.html",
            scope: {
              data: "=dirData",
              oneway: "<dirData",
              str: "@dirStr",
              fn: "&dirFn",
            },
            controller($scope) {
              this.$onInit = () => {
                expect(this.data).toEqual({
                  foo: "bar",
                  baz: "biz",
                });
                expect(this.oneway).toEqual({
                  foo: "bar",
                  baz: "biz",
                });
                expect(this.str).toBe("Hello, world!");
                expect(this.fn()).toBe("called!");
              };
              controllerCalled = true;
            },
            controllerAs: "test",
            bindToController: true,
          }),
        );
        initInjector("test1");

        $templateCache.set("test.html", "<p>isolate</p>");
        $rootScope.fn = valueFn("called!");
        $rootScope.whom = "world";
        $rootScope.remoteData = {
          foo: "bar",
          baz: "biz",
        };
        element = $compile(
          '<div foo-dir dir-data="remoteData" ' +
            'dir-str="Hello, {{whom}}!" ' +
            'dir-fn="fn()"></div>',
        )($rootScope);
        expect(controllerCalled).toBe(true);
      });

      it("should throw noctrl when missing controller", () => {
        module.directive(
          "noCtrl",
          valueFn({
            templateUrl: "test.html",
            scope: {
              data: "=dirData",
              oneway: "<dirData",
              str: "@dirStr",
              fn: "&dirFn",
            },
            controllerAs: "test",
            bindToController: true,
          }),
        );
        initInjector("test1");
        expect(() => {
          $compile("<div no-ctrl>")($rootScope);
        }).toThrowError(/noctrl/);
      });

      it("should throw badrestrict on first compilation when restrict is invalid", () => {
        module
          .directive("invalidRestrictBadString", valueFn({ restrict: '"' }))
          .directive("invalidRestrictTrue", valueFn({ restrict: true }))
          .directive("invalidRestrictObject", valueFn({ restrict: {} }))
          .directive("invalidRestrictNumber", valueFn({ restrict: 42 }))
          .decorator("$exceptionHandler", () => {
            return (exception, cause) => {
              log.push(exception.message);
            };
          });

        initInjector("test1");
        $compile("<div invalid-restrict-true>")($rootScope);
        expect(log.length).toBe(1);
        expect(log[0]).toMatch(/\$compile.*badrestrict.*'true'/);

        $compile("<div invalid-restrict-bad-string>")($rootScope);
        $compile("<div invalid-restrict-bad-string>")($rootScope);
        expect(log.length).toBe(2);
        expect(log[1]).toMatch(/\$compile.*badrestrict.*'"'/);

        $compile("<div invalid-restrict-bad-string invalid-restrict-object>")(
          $rootScope,
        );
        expect(log.length).toBe(3);
        expect(log[2]).toMatch(/\$compile.*badrestrict.*'{}'/);

        $compile("<div invalid-restrict-object invalid-restrict-number>")(
          $rootScope,
        );
        expect(log.length).toBe(4);
        expect(log[3]).toMatch(/\$compile.*badrestrict.*'42'/);
      });

      describe("should bind to controller via object notation", () => {
        const controllerOptions = [
          {
            description: "no controller identifier",
            controller: "myCtrl",
          },
          {
            description: '"Ctrl as ident" syntax',
            controller: "myCtrl as myCtrl",
          },
          {
            description: "controllerAs setting",
            controller: "myCtrl",
            controllerAs: "myCtrl",
          },
        ];

        const scopeOptions = [
          {
            description: "isolate scope",
            scope: {},
          },
          {
            description: "new scope",
            scope: true,
          },
          {
            description: "no scope",
            scope: false,
          },
        ];

        const templateOptions = [
          {
            description: "inline template",
            template: "<p>template</p>",
          },
          {
            description: "templateUrl setting",
            templateUrl: "test.html",
          },
          {
            description: "no template",
          },
        ];

        controllerOptions.forEach((controllerOption) => {
          Object.values(scopeOptions).forEach((scopeOption) => {
            Object.values(templateOptions).forEach((templateOption) => {
              const description = [];
              const ddo = {
                bindToController: {
                  data: "=dirData",
                  oneway: "<dirData",
                  str: "@dirStr",
                  fn: "&dirFn",
                },
              };

              [controllerOption, scopeOption, templateOption].forEach(
                (option) => {
                  description.push(option.description);
                  delete option.description;
                  extend(ddo, option);
                },
              );

              it(`(${description.join(", ")})`, () => {
                let controllerCalled = false;
                myModule
                  .controller("myCtrl", function () {
                    this.$onInit = function () {
                      expect(this.data).toEqual({
                        foo: "bar",
                        baz: "biz",
                      });
                      expect(this.oneway).toEqual({
                        foo: "bar",
                        baz: "biz",
                      });
                      expect(this.str).toBe("Hello, world!");
                      expect(this.fn()).toBe("called!");
                    };
                    controllerCalled = true;
                  })
                  .directive("fooDir", valueFn(ddo));

                initInjector("myModule");

                $templateCache.set("test.html", "<p>template</p>");
                $rootScope.fn = valueFn("called!");
                $rootScope.whom = "world";
                $rootScope.remoteData = {
                  foo: "bar",
                  baz: "biz",
                };
                element = $compile(
                  '<div foo-dir dir-data="remoteData" ' +
                    'dir-str="Hello, {{whom}}!" ' +
                    'dir-fn="fn()"></div>',
                )($rootScope);
                expect(controllerCalled).toBe(true);
                if (ddo.controllerAs || ddo.controller.indexOf(" as ") !== -1) {
                  if (ddo.scope) {
                    expect($rootScope.myCtrl).toBeUndefined();
                  } else {
                    // The controller identifier was added to the containing scope.
                    expect($rootScope.myCtrl).toBeDefined();
                  }
                }
              });
            });
          });
        });
      });

      it("should bind to multiple directives controllers via object notation (no scope)", () => {
        let controller1Called = false;
        let controller2Called = false;
        module
          .directive(
            "foo",
            valueFn({
              bindToController: {
                data: "=fooData",
                oneway: "<fooData",
                str: "@fooStr",
                fn: "&fooFn",
              },
              controllerAs: "fooCtrl",
              controller() {
                this.$onInit = () => {
                  expect(this.data).toEqual({ foo: "bar", baz: "biz" });
                  expect(this.oneway).toEqual({ foo: "bar", baz: "biz" });
                  expect(this.str).toBe("Hello, world!");
                  expect(this.fn()).toBe("called!");
                };
                controller1Called = true;
              },
            }),
          )
          .directive(
            "bar",
            valueFn({
              bindToController: {
                data: "=barData",
                oneway: "<barData",
                str: "@barStr",
                fn: "&barFn",
              },
              controllerAs: "barCtrl",
              controller() {
                this.$onInit = () => {
                  expect(this.data).toEqual({ foo2: "bar2", baz2: "biz2" });
                  expect(this.oneway).toEqual({ foo2: "bar2", baz2: "biz2" });
                  expect(this.str).toBe("Hello, second world!");
                  expect(this.fn()).toBe("second called!");
                };
                controller2Called = true;
              },
            }),
          );
        initInjector("test1");
        $rootScope.fn = valueFn("called!");
        $rootScope.string = "world";
        $rootScope.data = { foo: "bar", baz: "biz" };
        $rootScope.fn2 = valueFn("second called!");
        $rootScope.string2 = "second world";
        $rootScope.data2 = { foo2: "bar2", baz2: "biz2" };
        element = $compile(
          "<div " +
            "foo " +
            'foo-data="data" ' +
            'foo-str="Hello, {{string}}!" ' +
            'foo-fn="fn()" ' +
            "bar " +
            'bar-data="data2" ' +
            'bar-str="Hello, {{string2}}!" ' +
            'bar-fn="fn2()" > ' +
            "</div>",
        )($rootScope);
        expect(controller1Called).toBe(true);
        expect(controller2Called).toBe(true);
      });

      it("should bind to multiple directives controllers via object notation (new iso scope)", () => {
        let controller1Called = false;
        let controller2Called = false;
        module
          .directive(
            "foo",
            valueFn({
              bindToController: {
                data: "=fooData",
                oneway: "<fooData",
                str: "@fooStr",
                fn: "&fooFn",
              },
              scope: {},
              controllerAs: "fooCtrl",
              controller() {
                this.$onInit = () => {
                  expect(this.data).toEqual({ foo: "bar", baz: "biz" });
                  expect(this.oneway).toEqual({ foo: "bar", baz: "biz" });
                  expect(this.str).toBe("Hello, world!");
                  expect(this.fn()).toBe("called!");
                };
                controller1Called = true;
              },
            }),
          )
          .directive(
            "bar",
            valueFn({
              bindToController: {
                data: "=barData",
                oneway: "<barData",
                str: "@barStr",
                fn: "&barFn",
              },
              controllerAs: "barCtrl",
              controller() {
                this.$onInit = () => {
                  expect(this.data).toEqual({ foo2: "bar2", baz2: "biz2" });
                  expect(this.oneway).toEqual({ foo2: "bar2", baz2: "biz2" });
                  expect(this.str).toBe("Hello, second world!");
                  expect(this.fn()).toBe("second called!");
                };
                controller2Called = true;
              },
            }),
          );
        initInjector("test1");
        $rootScope.fn = valueFn("called!");
        $rootScope.string = "world";
        $rootScope.data = { foo: "bar", baz: "biz" };
        $rootScope.fn2 = valueFn("second called!");
        $rootScope.string2 = "second world";
        $rootScope.data2 = { foo2: "bar2", baz2: "biz2" };
        element = $compile(
          "<div " +
            "foo " +
            'foo-data="data" ' +
            'foo-str="Hello, {{string}}!" ' +
            'foo-fn="fn()" ' +
            "bar " +
            'bar-data="data2" ' +
            'bar-str="Hello, {{string2}}!" ' +
            'bar-fn="fn2()" > ' +
            "</div>",
        )($rootScope);
        expect(controller1Called).toBe(true);
        expect(controller2Called).toBe(true);
      });

      it("should bind to multiple directives controllers via object notation (new scope)", () => {
        let controller1Called = false;
        let controller2Called = false;
        module
          .directive(
            "foo",
            valueFn({
              bindToController: {
                data: "=fooData",
                oneway: "<fooData",
                str: "@fooStr",
                fn: "&fooFn",
              },
              scope: true,
              controllerAs: "fooCtrl",
              controller() {
                this.$onInit = () => {
                  expect(this.data).toEqual({ foo: "bar", baz: "biz" });
                  expect(this.oneway).toEqual({ foo: "bar", baz: "biz" });
                  expect(this.str).toBe("Hello, world!");
                  expect(this.fn()).toBe("called!");
                };
                controller1Called = true;
              },
            }),
          )
          .directive(
            "bar",
            valueFn({
              bindToController: {
                data: "=barData",
                oneway: "<barData",
                str: "@barStr",
                fn: "&barFn",
              },
              scope: true,
              controllerAs: "barCtrl",
              controller() {
                this.$onInit = () => {
                  expect(this.data).toEqual({ foo2: "bar2", baz2: "biz2" });
                  expect(this.oneway).toEqual({ foo2: "bar2", baz2: "biz2" });
                  expect(this.str).toBe("Hello, second world!");
                  expect(this.fn()).toBe("second called!");
                };
                controller2Called = true;
              },
            }),
          );
        initInjector("test1");
        $rootScope.fn = valueFn("called!");
        $rootScope.string = "world";
        $rootScope.data = { foo: "bar", baz: "biz" };
        $rootScope.fn2 = valueFn("second called!");
        $rootScope.string2 = "second world";
        $rootScope.data2 = { foo2: "bar2", baz2: "biz2" };
        element = $compile(
          "<div " +
            "foo " +
            'foo-data="data" ' +
            'foo-str="Hello, {{string}}!" ' +
            'foo-fn="fn()" ' +
            "bar " +
            'bar-data="data2" ' +
            'bar-str="Hello, {{string2}}!" ' +
            'bar-fn="fn2()" > ' +
            "</div>",
        )($rootScope);
        expect(controller1Called).toBe(true);
        expect(controller2Called).toBe(true);
      });

      it("should evaluate against the correct scope, when using `bindToController` (new scope)", () => {
        module
          .controller("ParentCtrl", function () {
            this.value1 = "parent1";
            this.value2 = "parent2";
            this.value3 = () => {
              return "parent3";
            };
            this.value4 = "parent4";
          })
          .controller("ChildCtrl", function () {
            this.value1 = "child1";
            this.value2 = "child2";
            this.value3 = () => {
              return "child3";
            };
            this.value4 = "child4";
          })
          .directive(
            "child",
            valueFn({
              scope: true,
              controller: "ChildCtrl as ctrl",
              bindToController: {
                fromParent1: "@",
                fromParent2: "=",
                fromParent3: "&",
                fromParent4: "<",
              },
              template: "",
            }),
          );
        initInjector("test1");
        element = $compile(
          '<div ng-controller="ParentCtrl as ctrl">' +
            "<child " +
            'from-parent-1="{{ ctrl.value1 }}" ' +
            'from-parent-2="ctrl.value2" ' +
            'from-parent-3="ctrl.value3" ' +
            'from-parent-4="ctrl.value4">' +
            "</child>" +
            "</div>",
        )($rootScope);
        const parentCtrl = element.controller("ngController");
        const childCtrl = element.find("child").controller("child");

        expect(childCtrl.fromParent1).toBe(parentCtrl.value1);
        expect(childCtrl.fromParent1).not.toBe(childCtrl.value1);
        expect(childCtrl.fromParent2).toBe(parentCtrl.value2);
        expect(childCtrl.fromParent2).not.toBe(childCtrl.value2);
        expect(childCtrl.fromParent3()()).toBe(parentCtrl.value3());
        expect(childCtrl.fromParent3()()).not.toBe(childCtrl.value3());
        expect(childCtrl.fromParent4).toBe(parentCtrl.value4);
        expect(childCtrl.fromParent4).not.toBe(childCtrl.value4);

        childCtrl.fromParent2 = "modified";
        expect(parentCtrl.value2).toBe("modified");
        expect(childCtrl.value2).toBe("child2");
      });

      it("should evaluate against the correct scope, when using `bindToController` (new iso scope)", () => {
        module
          .controller("ParentCtrl", function () {
            this.value1 = "parent1";
            this.value2 = "parent2";
            this.value3 = () => {
              return "parent3";
            };
            this.value4 = "parent4";
          })
          .controller("ChildCtrl", function () {
            this.value1 = "child1";
            this.value2 = "child2";
            this.value3 = () => {
              return "child3";
            };
            this.value4 = "child4";
          })
          .directive(
            "child",
            valueFn({
              scope: {},
              controller: "ChildCtrl as ctrl",
              bindToController: {
                fromParent1: "@",
                fromParent2: "=",
                fromParent3: "&",
                fromParent4: "<",
              },
              template: "",
            }),
          );

        initInjector("test1");
        element = $compile(
          '<div ng-controller="ParentCtrl as ctrl">' +
            "<child " +
            'from-parent-1="{{ ctrl.value1 }}" ' +
            'from-parent-2="ctrl.value2" ' +
            'from-parent-3="ctrl.value3" ' +
            'from-parent-4="ctrl.value4">' +
            "</child>" +
            "</div>",
        )($rootScope);
        const parentCtrl = element.controller("ngController");
        const childCtrl = element.find("child").controller("child");

        expect(childCtrl.fromParent1).toBe(parentCtrl.value1);
        expect(childCtrl.fromParent1).not.toBe(childCtrl.value1);
        expect(childCtrl.fromParent2).toBe(parentCtrl.value2);
        expect(childCtrl.fromParent2).not.toBe(childCtrl.value2);
        expect(childCtrl.fromParent3()()).toBe(parentCtrl.value3());
        expect(childCtrl.fromParent3()()).not.toBe(childCtrl.value3());
        expect(childCtrl.fromParent4).toBe(parentCtrl.value4);
        expect(childCtrl.fromParent4).not.toBe(childCtrl.value4);

        childCtrl.fromParent2 = "modified";
        expect(parentCtrl.value2).toBe("modified");
        expect(childCtrl.value2).toBe("child2");
      });

      it("should put controller in scope when controller identifier present but not using controllerAs", () => {
        let controllerCalled = false;
        let myCtrl;
        module
          .controller("myCtrl", function () {
            controllerCalled = true;
            myCtrl = this;
          })
          .directive(
            "fooDir",
            valueFn({
              templateUrl: "test.html",
              bindToController: {},
              scope: true,
              controller: "myCtrl as theCtrl",
            }),
          );
        initInjector("test1");
        $templateCache.set("test.html", "<p>isolate</p>");
        element = $compile("<div foo-dir>")($rootScope);
        expect(controllerCalled).toBe(true);
        const childScope = $rootScope.$$childHead;
        expect(childScope).not.toBe($rootScope);
        expect(childScope.theCtrl).toBe(myCtrl);
      });

      it("should re-install controllerAs and bindings for returned value from controller (new scope)", () => {
        let controllerCalled = false;
        let myCtrl;

        function MyCtrl() {}
        MyCtrl.prototype.test = function () {
          expect(this.data).toEqual({
            foo: "bar",
            baz: "biz",
          });
          expect(this.oneway).toEqual({
            foo: "bar",
            baz: "biz",
          });
          expect(this.str).toBe("Hello, world!");
          expect(this.fn()).toBe("called!");
        };

        module
          .controller("myCtrl", function () {
            controllerCalled = true;
            myCtrl = this;
            return new MyCtrl();
          })
          .directive(
            "fooDir",
            valueFn({
              templateUrl: "test.html",
              bindToController: {
                data: "=dirData",
                oneway: "<dirData",
                str: "@dirStr",
                fn: "&dirFn",
              },
              scope: true,
              controller: "myCtrl as theCtrl",
            }),
          );
        initInjector("test1");
        $templateCache.set("test.html", "<p>isolate</p>");
        $rootScope.fn = valueFn("called!");
        $rootScope.whom = "world";
        $rootScope.remoteData = {
          foo: "bar",
          baz: "biz",
        };
        element = $compile(
          '<div foo-dir dir-data="remoteData" ' +
            'dir-str="Hello, {{whom}}!" ' +
            'dir-fn="fn()"></div>',
        )($rootScope);
        expect(controllerCalled).toBe(true);
        const childScope = $rootScope.$$childHead;
        expect(childScope).not.toBe($rootScope);
        expect(childScope.theCtrl).not.toBe(myCtrl);
        expect(childScope.theCtrl.constructor).toBe(MyCtrl);
        childScope.theCtrl.test();
      });

      it("should re-install controllerAs and bindings for returned value from controller (isolate scope)", () => {
        let controllerCalled = false;
        let myCtrl;

        function MyCtrl() {}
        MyCtrl.prototype.test = function () {
          expect(this.data).toEqual({
            foo: "bar",
            baz: "biz",
          });
          expect(this.oneway).toEqual({
            foo: "bar",
            baz: "biz",
          });
          expect(this.str).toBe("Hello, world!");
          expect(this.fn()).toBe("called!");
        };

        module
          .controller("myCtrl", () => {
            controllerCalled = true;
            myCtrl = this;
            return new MyCtrl();
          })
          .directive(
            "fooDir",
            valueFn({
              templateUrl: "test.html",
              bindToController: true,
              scope: {
                data: "=dirData",
                oneway: "<dirData",
                str: "@dirStr",
                fn: "&dirFn",
              },
              controller: "myCtrl as theCtrl",
            }),
          );
        initInjector("test1");
        $templateCache.set("test.html", "<p>isolate</p>");
        $rootScope.fn = valueFn("called!");
        $rootScope.whom = "world";
        $rootScope.remoteData = {
          foo: "bar",
          baz: "biz",
        };
        element = $compile(
          '<div foo-dir dir-data="remoteData" ' +
            'dir-str="Hello, {{whom}}!" ' +
            'dir-fn="fn()"></div>',
        )($rootScope);
        expect(controllerCalled).toBe(true);
        const childScope = $rootScope.$$childHead;
        expect(childScope).not.toBe($rootScope);
        expect(childScope.theCtrl).not.toBe(myCtrl);
        expect(childScope.theCtrl.constructor).toBe(MyCtrl);
        childScope.theCtrl.test();
      });

      describe("should not overwrite @-bound property each digest when not present", () => {
        it("when creating new scope", () => {
          module.directive(
            "testDir",
            valueFn({
              scope: true,
              bindToController: {
                prop: "@",
              },
              controller() {
                const self = this;
                this.$onInit = () => {
                  this.prop = this.prop || "default";
                };
                this.getProp = () => {
                  return self.prop;
                };
              },
              controllerAs: "ctrl",
              template: "<p></p>",
            }),
          );
          initInjector("test1");
          element = $compile("<div test-dir></div>")($rootScope);
          const scope = $rootScope.$$childHead;
          expect(scope.ctrl.getProp()).toBe("default");

          expect(scope.ctrl.getProp()).toBe("default");
        });

        it("when creating isolate scope", () => {
          module.directive(
            "testDir",
            valueFn({
              scope: {},
              bindToController: {
                prop: "@",
              },
              controller() {
                const self = this;
                this.$onInit = () => {
                  this.prop = this.prop || "default";
                };
                this.getProp = () => {
                  return self.prop;
                };
              },
              controllerAs: "ctrl",
              template: "<p></p>",
            }),
          );
          initInjector("test1");
          element = $compile("<div test-dir></div>")($rootScope);
          const scope = $rootScope.$$childHead;
          expect(scope.ctrl.getProp()).toBe("default");

          expect(scope.ctrl.getProp()).toBe("default");
        });
      });
    });

    describe("require", () => {
      let module;

      beforeEach(() => {
        module = window.angular.module("test1", ["ng"]);
      });

      it("should get required controller", () => {
        module
          .directive("main", () => ({
            priority: 2,
            controller() {
              this.name = "main";
            },
            link(scope, element, attrs, controller) {
              log.push(controller.name);
            },
          }))
          .directive("dep", () => ({
            priority: 1,
            require: "main",
            link(scope, element, attrs, controller) {
              log.push(`dep:${controller.name}`);
            },
          }))
          .directive("other", () => ({
            link(scope, element, attrs, controller) {
              log.push(!!controller); // should be false
            },
          }));
        initInjector("test1");
        element = $compile("<div main dep other></div>")($rootScope);
        expect(log.join("; ")).toEqual("false; dep:main; main");
      });

      it("should respect explicit return value from controller", () => {
        let expectedController;
        module.directive("logControllerProp", () => ({
          controller($scope) {
            this.foo = "baz"; // value should not be used.
            expectedController = { foo: "bar" };
            return expectedController;
          },
          link(scope, element, attrs, controller) {
            expect(expectedController).toBeDefined();
            expect(controller).toBe(expectedController);
            expect(controller.foo).toBe("bar");
            log.push("done");
          },
        }));
        initInjector("test1");
        element = $compile("<log-controller-prop></log-controller-prop>")(
          $rootScope,
        );
        expect(log[0]).toEqual("done");
        expect(element.data("$logControllerPropController")).toBe(
          expectedController,
        );
      });

      it("should get explicit return value of required parent controller", () => {
        let expectedController;
        module.directive("nested", () => ({
          require: "^^?nested",
          controller() {
            if (!expectedController) expectedController = { foo: "bar" };
            return expectedController;
          },
          link(scope, element, attrs, controller) {
            if (element.parent().length) {
              expect(expectedController).toBeDefined();
              expect(controller).toBe(expectedController);
              expect(controller.foo).toEqual("bar");
              log.push("done");
            }
          },
        }));
        initInjector("test1");
        element = $compile("<div nested><div nested></div></div>")($rootScope);
        expect(log[0]).toEqual("done");
        expect(element.data("$nestedController")).toBe(expectedController);
      });

      it("should respect explicit controller return value when using controllerAs", () => {
        module.directive("main", () => ({
          templateUrl: "main.html",
          scope: {},
          controller() {
            this.name = "lucas";
            return { name: "george" };
          },
          controllerAs: "mainCtrl",
        }));
        initInjector("test1");
        $templateCache.set(
          "main.html",
          "<span>template:{{mainCtrl.name}}</span>",
        );
        element = $compile("<main/>")($rootScope);
        $rootScope.$apply();
        expect(element.text()).toBe("template:george");
      });

      it("transcluded children should receive explicit return value of parent controller", () => {
        let expectedController;
        module
          .directive(
            "nester",
            valueFn({
              transclude: true,
              controller($transclude) {
                this.foo = "baz";
                expectedController = { transclude: $transclude, foo: "bar" };
                return expectedController;
              },
              link(scope, el, attr, ctrl) {
                ctrl.transclude(cloneAttach);
                function cloneAttach(clone) {
                  el.append(clone);
                }
              },
            }),
          )
          .directive("nested", () => ({
            require: "^^nester",
            link(scope, element, attrs, controller) {
              expect(controller).toBeDefined();
              expect(controller).toBe(expectedController);
              log.push("done");
            },
          }));
        initInjector("test1");
        element = $compile("<div nester><div nested></div></div>")($rootScope);
        $rootScope.$apply();
        expect(log.toString()).toBe("done");
        expect(element.data("$nesterController")).toBe(expectedController);
      });

      it("explicit controller return values are ignored if they are primitives", () => {
        module.directive("logControllerProp", () => ({
          controller($scope) {
            this.foo = "baz"; // value *will* be used.
            return "bar";
          },
          link(scope, element, attrs, controller) {
            log.push(controller.foo);
          },
        }));
        initInjector("test1");
        element = $compile("<log-controller-prop></log-controller-prop>")(
          $rootScope,
        );
        expect(log[0]).toEqual("baz");
        expect(element.data("$logControllerPropController").foo).toEqual("baz");
      });

      it("should correctly assign controller return values for multiple directives", () => {
        let directiveController;
        let otherDirectiveController;
        module
          .directive("myDirective", () => ({
            scope: true,
            controller($scope) {
              directiveController = {
                foo: "bar",
              };
              return directiveController;
            },
          }))
          .directive("myOtherDirective", () => ({
            controller($scope) {
              otherDirectiveController = {
                baz: "luh",
              };
              return otherDirectiveController;
            },
          }));
        initInjector("test1");
        element = $compile("<my-directive my-other-directive></my-directive>")(
          $rootScope,
        );
        expect(element.data("$myDirectiveController")).toBe(
          directiveController,
        );
        expect(element.data("$myOtherDirectiveController")).toBe(
          otherDirectiveController,
        );
      });

      it("should get required parent controller", () => {
        module.directive("nested", () => ({
          require: "^^?nested",
          controller($scope) {},
          link(scope, element, attrs, controller) {
            log.push(!!controller);
          },
        }));
        initInjector("test1");
        element = $compile("<div nested><div nested></div></div>")($rootScope);
        expect(log.join("; ")).toEqual("true; false");
      });

      it("should get required parent controller when the question mark precedes the ^^", () => {
        module.directive("nested", () => ({
          require: "?^^nested",
          controller($scope) {},
          link(scope, element, attrs, controller) {
            log.push(!!controller);
          },
        }));
        initInjector("test1");
        element = $compile("<div nested><div nested></div></div>")($rootScope);
        expect(log.join("; ")).toEqual("true; false");
      });

      it("should throw if required parent is not found", () => {
        module.directive("nested", () => ({
          require: "^^nested",
          controller($scope) {},
          link(scope, element, attrs, controller) {},
        }));
        initInjector("test1");
        expect(() => {
          element = $compile("<div nested></div>")($rootScope);
        }).toThrowError(/ctreq/);
      });

      it("should get required controller via linkingFn (template)", () => {
        module
          .directive("dirA", () => ({
            controller() {
              this.name = "dirA";
            },
          }))
          .directive("dirB", () => ({
            require: "dirA",
            template: "<p>dirB</p>",
            link(scope, element, attrs, dirAController) {
              log.push(`dirAController.name: ${dirAController.name}`);
            },
          }));
        initInjector("test1");
        element = $compile("<div dir-a dir-b></div>")($rootScope);
        expect(log[0]).toEqual("dirAController.name: dirA");
      });

      it("should get required controller via linkingFn (templateUrl)", () => {
        module
          .directive("dirA", () => ({
            controller() {
              this.name = "dirA";
            },
          }))
          .directive("dirB", () => ({
            require: "dirA",
            templateUrl: "dirB.html",
            link(scope, element, attrs, dirAController) {
              log.push(`dirAController.name: ${dirAController.name}`);
            },
          }));
        initInjector("test1");
        $templateCache.set("dirB.html", "<p>dirB</p>");
        element = $compile("<div dir-a dir-b></div>")($rootScope);
        expect(log[0]).toEqual("dirAController.name: dirA");
      });

      it("should bind the required controllers to the directive controller, if provided as an object and bindToController is truthy", () => {
        let parentController;
        let siblingController;

        function ParentController() {
          this.name = "Parent";
        }
        function SiblingController() {
          this.name = "Sibling";
        }
        function MeController() {
          this.name = "Me";
        }
        MeController.prototype.$onInit = function () {
          parentController = this.container;
          siblingController = this.friend;
        };
        spyOn(MeController.prototype, "$onInit").and.callThrough();

        module
          .directive("me", () => ({
            restrict: "E",
            scope: {},
            require: { container: "^parent", friend: "sibling" },
            bindToController: true,
            controller: MeController,
            controllerAs: "$ctrl",
          }))
          .directive("parent", () => ({
            restrict: "E",
            scope: {},
            controller: ParentController,
          }))
          .directive("sibling", () => ({
            controller: SiblingController,
          }));
        initInjector("test1");
        element = $compile("<parent><me sibling></me></parent>")($rootScope);
        expect(MeController.prototype.$onInit).toHaveBeenCalled();
        expect(parentController).toEqual(jasmine.any(ParentController));
        expect(siblingController).toEqual(jasmine.any(SiblingController));
      });

      it("should use the key if the name of a required controller is omitted", () => {
        function ParentController() {
          this.name = "Parent";
        }
        function ParentOptController() {
          this.name = "ParentOpt";
        }
        function ParentOrSiblingController() {
          this.name = "ParentOrSibling";
        }
        function ParentOrSiblingOptController() {
          this.name = "ParentOrSiblingOpt";
        }
        function SiblingController() {
          this.name = "Sibling";
        }
        function SiblingOptController() {
          this.name = "SiblingOpt";
        }

        module
          .component("me", {
            require: {
              parent: "^^",
              parentOpt: "?^^",
              parentOrSibling1: "^",
              parentOrSiblingOpt1: "?^",
              parentOrSibling2: "^",
              parentOrSiblingOpt2: "?^",
              sibling: "",
              siblingOpt: "?",
            },
          })
          .directive("parent", () => ({ controller: ParentController }))
          .directive("parentOpt", () => ({ controller: ParentOptController }))
          .directive("parentOrSibling1", () => ({
            controller: ParentOrSiblingController,
          }))
          .directive("parentOrSiblingOpt1", () => ({
            controller: ParentOrSiblingOptController,
          }))
          .directive("parentOrSibling2", () => ({
            controller: ParentOrSiblingController,
          }))
          .directive("parentOrSiblingOpt2", () => ({
            controller: ParentOrSiblingOptController,
          }))
          .directive("sibling", () => ({ controller: SiblingController }))
          .directive("siblingOpt", () => ({
            controller: SiblingOptController,
          }));
        initInjector("test1");
        const template =
          "<div>" +
          // With optional
          "<parent parent-opt parent-or-sibling-1 parent-or-sibling-opt-1>" +
          "<me parent-or-sibling-2 parent-or-sibling-opt-2 sibling sibling-opt></me>" +
          "</parent>" +
          // Without optional
          "<parent parent-or-sibling-1>" +
          "<me parent-or-sibling-2 sibling></me>" +
          "</parent>" +
          "</div>";
        element = $compile(template)($rootScope);

        const ctrl1 = element.find("me").eq(0).controller("me");
        expect(ctrl1.parent).toEqual(jasmine.any(ParentController));
        expect(ctrl1.parentOpt).toEqual(jasmine.any(ParentOptController));
        expect(ctrl1.parentOrSibling1).toEqual(
          jasmine.any(ParentOrSiblingController),
        );
        expect(ctrl1.parentOrSiblingOpt1).toEqual(
          jasmine.any(ParentOrSiblingOptController),
        );
        expect(ctrl1.parentOrSibling2).toEqual(
          jasmine.any(ParentOrSiblingController),
        );
        expect(ctrl1.parentOrSiblingOpt2).toEqual(
          jasmine.any(ParentOrSiblingOptController),
        );
        expect(ctrl1.sibling).toEqual(jasmine.any(SiblingController));
        expect(ctrl1.siblingOpt).toEqual(jasmine.any(SiblingOptController));

        const ctrl2 = element.find("me").eq(1).controller("me");
        expect(ctrl2.parent).toEqual(jasmine.any(ParentController));
        expect(ctrl2.parentOpt).toBe(null);
        expect(ctrl2.parentOrSibling1).toEqual(
          jasmine.any(ParentOrSiblingController),
        );
        expect(ctrl2.parentOrSiblingOpt1).toBe(null);
        expect(ctrl2.parentOrSibling2).toEqual(
          jasmine.any(ParentOrSiblingController),
        );
        expect(ctrl2.parentOrSiblingOpt2).toBe(null);
        expect(ctrl2.sibling).toEqual(jasmine.any(SiblingController));
        expect(ctrl2.siblingOpt).toBe(null);
      });

      it("should not bind required controllers if bindToController is falsy", () => {
        let parentController;
        let siblingController;

        function ParentController() {
          this.name = "Parent";
        }
        function SiblingController() {
          this.name = "Sibling";
        }
        function MeController() {
          this.name = "Me";
        }
        MeController.prototype.$onInit = () => {
          parentController = this.container;
          siblingController = this.friend;
        };
        spyOn(MeController.prototype, "$onInit").and.callThrough();

        module
          .directive("me", () => ({
            restrict: "E",
            scope: {},
            require: { container: "^parent", friend: "sibling" },
            controller: MeController,
          }))
          .directive("parent", () => ({
            restrict: "E",
            scope: {},
            controller: ParentController,
          }))
          .directive("sibling", () => ({
            controller: SiblingController,
          }));
        initInjector("test1");
        element = $compile("<parent><me sibling></me></parent>")($rootScope);
        expect(MeController.prototype.$onInit).toHaveBeenCalled();
        expect(parentController).toBeUndefined();
        expect(siblingController).toBeUndefined();
      });

      it("should bind required controllers to controller that has an explicit constructor return value", () => {
        let parentController;
        let siblingController;
        let meController;

        function ParentController() {
          this.name = "Parent";
        }
        function SiblingController() {
          this.name = "Sibling";
        }
        function MeController() {
          meController = {
            name: "Me",
            $onInit() {
              parentController = this.container;
              siblingController = this.friend;
            },
          };
          spyOn(meController, "$onInit").and.callThrough();
          return meController;
        }

        module
          .directive("me", () => ({
            restrict: "E",
            scope: {},
            require: { container: "^parent", friend: "sibling" },
            bindToController: true,
            controller: MeController,
            controllerAs: "$ctrl",
          }))
          .directive("parent", () => ({
            restrict: "E",
            scope: {},
            controller: ParentController,
          }))
          .directive("sibling", () => ({
            controller: SiblingController,
          }));
        initInjector("test1");
        element = $compile("<parent><me sibling></me></parent>")($rootScope);
        expect(meController.$onInit).toHaveBeenCalled();
        expect(parentController).toEqual(jasmine.any(ParentController));
        expect(siblingController).toEqual(jasmine.any(SiblingController));
      });

      it("should bind required controllers to controllers that return an explicit constructor return value", () => {
        let parentController;
        let containerController;
        let siblingController;
        let friendController;
        let meController;

        function MeController() {
          this.name = "Me";
          this.$onInit = () => {
            containerController = this.container;
            friendController = this.friend;
          };
        }
        function ParentController() {
          parentController = { name: "Parent" };
          return parentController;
        }
        function SiblingController() {
          siblingController = { name: "Sibling" };
          return siblingController;
        }

        module
          .directive("me", () => ({
            priority: 1, // make sure it is run before sibling to test this case correctly
            restrict: "E",
            scope: {},
            require: { container: "^parent", friend: "sibling" },
            bindToController: true,
            controller: MeController,
            controllerAs: "$ctrl",
          }))
          .directive("parent", () => ({
            restrict: "E",
            scope: {},
            controller: ParentController,
          }))
          .directive("sibling", () => ({
            controller: SiblingController,
          }));
        initInjector("test1");
        element = $compile("<parent><me sibling></me></parent>")($rootScope);
        expect(containerController).toEqual(parentController);
        expect(friendController).toEqual(siblingController);
      });

      it("should require controller of an isolate directive from a non-isolate directive on the same element", () => {
        const IsolateController = function () {};
        let isolateDirControllerInNonIsolateDirective;

        module
          .directive("isolate", () => ({
            scope: {},
            controller: IsolateController,
          }))
          .directive("nonIsolate", () => ({
            require: "isolate",
            link(_, __, ___, isolateDirController) {
              isolateDirControllerInNonIsolateDirective = isolateDirController;
            },
          }));
        initInjector("test1");
        element = $compile("<div isolate non-isolate></div>")($rootScope);

        expect(isolateDirControllerInNonIsolateDirective).toBeDefined();
        expect(
          isolateDirControllerInNonIsolateDirective instanceof
            IsolateController,
        ).toBe(true);
      });

      it("should give the isolate scope to the controller of another replaced directives in the template", () => {
        module.directive("testDirective", () => ({
          replace: true,
          restrict: "E",
          scope: {},
          template: '<input type="checkbox" ng-model="model">',
        }));
        initInjector("test1");
        element = $compile("<div><test-directive></test-directive></div>")(
          $rootScope,
        );

        element = element.children().eq(0);
        expect(element[0].checked).toBe(false);
        $rootScope.$$childHead.model = true;
        expect(element[0].checked).toBe(true);
      });

      it("should share isolate scope with replaced directives (template)", () => {
        let normalScope;
        let isolateScope;

        module
          .directive("isolate", () => ({
            replace: true,
            scope: {},
            template: "<span ng-init=\"name='WORKS'\">{{name}}</span>",
            link(s) {
              isolateScope = s;
            },
          }))
          .directive("nonIsolate", () => ({
            link(s) {
              normalScope = s;
            },
          }));
        initInjector("test1");
        element = $compile("<div isolate non-isolate></div>")($rootScope);

        expect(normalScope).toBe($rootScope);
        expect(normalScope.name).toEqual(undefined);
        expect(isolateScope.name).toEqual("WORKS");
        expect(element.text()).toEqual("WORKS");
      });

      it("should share isolate scope with replaced directives (templateUrl)", () => {
        let normalScope;
        let isolateScope;

        module
          .directive("isolate", () => ({
            replace: true,
            scope: {},
            templateUrl: "main.html",
            link(s) {
              isolateScope = s;
            },
          }))
          .directive("nonIsolate", () => ({
            link(s) {
              normalScope = s;
            },
          }));
        initInjector("test1");
        $templateCache.set(
          "main.html",
          "<span ng-init=\"name='WORKS'\">{{name}}</span>",
        );
        element = $compile("<div isolate non-isolate></div>")($rootScope);
        $rootScope.$apply();

        expect(normalScope).toBe($rootScope);
        expect(normalScope.name).toEqual(undefined);
        expect(isolateScope.name).toEqual("WORKS");
        expect(element.text()).toEqual("WORKS");
      });

      it("should not get confused about where to use isolate scope when a replaced directive is used multiple times", () => {
        module
          .directive("isolate", () => ({
            replace: true,
            scope: {},
            template:
              '<span scope-tester="replaced"><span scope-tester="inside"></span></span>',
          }))
          .directive("scopeTester", () => ({
            link($scope, $element) {
              log.push(
                `${$element.attr("scope-tester")}=${$scope.$root === $scope ? "non-isolate" : "isolate"}`,
              );
            },
          }));
        initInjector("test1");
        element = $compile(
          "<div>" +
            '<div isolate scope-tester="outside"></div>' +
            '<span scope-tester="sibling"></span>' +
            "</div>",
        )($rootScope);

        expect(log.join("; ")).toEqual(
          "inside=isolate; " +
            "outside replaced=non-isolate; " + // outside
            "outside replaced=isolate; " + // replaced
            "sibling=non-isolate",
        );
      });

      it(
        "should require controller of a non-isolate directive from an isolate directive on the " +
          "same element",
        () => {
          const NonIsolateController = function () {};
          let nonIsolateDirControllerInIsolateDirective;

          module
            .directive("isolate", () => ({
              scope: {},
              require: "nonIsolate",
              link(_, __, ___, nonIsolateDirController) {
                nonIsolateDirControllerInIsolateDirective =
                  nonIsolateDirController;
              },
            }))
            .directive("nonIsolate", () => ({
              controller: NonIsolateController,
            }));
          initInjector("test1");
          element = $compile("<div isolate non-isolate></div>")($rootScope);

          expect(nonIsolateDirControllerInIsolateDirective).toBeDefined();
          expect(
            nonIsolateDirControllerInIsolateDirective instanceof
              NonIsolateController,
          ).toBe(true);
        },
      );

      it("should support controllerAs", () => {
        module.directive("main", () => ({
          templateUrl: "main.html",
          transclude: true,
          scope: {},
          controller() {
            this.name = "lucas";
          },
          controllerAs: "mainCtrl",
        }));
        initInjector("test1");
        $templateCache.set(
          "main.html",
          "<span>template:{{mainCtrl.name}} <div ng-transclude></div></span>",
        );
        element = $compile("<div main>transclude:{{mainCtrl.name}}</div>")(
          $rootScope,
        );
        $rootScope.$apply();
        expect(element.text()).toBe("template:lucas transclude:");
      });

      it("should support controller alias", () => {
        module
          .controller("MainCtrl", function () {
            this.name = "lucas";
          })
          .directive("main", () => ({
            templateUrl: "main.html",
            scope: {},
            controller: "MainCtrl as mainCtrl",
          }));
        initInjector("test1");
        $templateCache.set("main.html", "<span>{{mainCtrl.name}}</span>");
        element = $compile("<div main></div>")($rootScope);
        $rootScope.$apply();
        expect(element.text()).toBe("lucas");
      });

      it("should require controller on parent element", () => {
        module
          .directive("main", () => ({
            controller() {
              this.name = "main";
            },
          }))
          .directive("dep", () => ({
            require: "^main",
            link(scope, element, attrs, controller) {
              log.push(`dep:${controller.name}`);
            },
          }));
        initInjector("test1");
        element = $compile("<div main><div dep></div></div>")($rootScope);
        expect(log[0]).toEqual("dep:main");
      });

      it("should throw an error if required controller can't be found", () => {
        module.directive("dep", () => ({
          require: "^main",
          link(scope, element, attrs, controller) {
            log.push(`dep:${controller.name}`);
          },
        }));
        initInjector("test1");
        expect(() => {
          $compile("<div main><div dep></div></div>")($rootScope);
        }).toThrowError(/ctreq/);
      });

      it("should pass null if required controller can't be found and is optional", () => {
        module.directive("dep", () => ({
          require: "?^main",
          link(scope, element, attrs, controller) {
            log.push(`dep:${controller}`);
          },
        }));
        initInjector("test1");
        $compile("<div main><div dep></div></div>")($rootScope);
        expect(log[0]).toEqual("dep:null");
      });

      it("should pass null if required controller can't be found and is optional with the question mark on the right", () => {
        module.directive("dep", () => ({
          require: "^?main",
          link(scope, element, attrs, controller) {
            log.push(`dep:${controller}`);
          },
        }));
        initInjector("test1");
        $compile("<div main><div dep></div></div>")($rootScope);
        expect(log[0]).toEqual("dep:null");
      });

      it("should have optional controller on current element", () => {
        module.directive("dep", () => ({
          require: "?main",
          link(scope, element, attrs, controller) {
            log.push(`dep:${!!controller}`);
          },
        }));
        initInjector("test1");
        element = $compile("<div main><div dep></div></div>")($rootScope);
        expect(log[0]).toEqual("dep:false");
      });

      it("should support multiple controllers", () => {
        module
          .directive(
            "c1",
            valueFn({
              controller() {
                this.name = "c1";
              },
            }),
          )
          .directive(
            "c2",
            valueFn({
              controller() {
                this.name = "c2";
              },
            }),
          )
          .directive("dep", () => ({
            require: ["^c1", "^c2"],
            link(scope, element, attrs, controller) {
              log.push(`dep:${controller[0].name}-${controller[1].name}`);
            },
          }));
        initInjector("test1");
        element = $compile("<div c1 c2><div dep></div></div>")($rootScope);
        expect(log[0]).toEqual("dep:c1-c2");
      });

      it("should support multiple controllers as an object hash", () => {
        module
          .directive(
            "c1",
            valueFn({
              controller() {
                this.name = "c1";
              },
            }),
          )
          .directive(
            "c2",
            valueFn({
              controller() {
                this.name = "c2";
              },
            }),
          )
          .directive("dep", () => ({
            require: { myC1: "^c1", myC2: "^c2" },
            link(scope, element, attrs, controllers) {
              log.push(`dep:${controllers.myC1.name}-${controllers.myC2.name}`);
            },
          }));
        initInjector("test1");
        element = $compile("<div c1 c2><div dep></div></div>")($rootScope);
        expect(log[0]).toEqual("dep:c1-c2");
      });

      it("should support omitting the name of the required controller if it is the same as the key", () => {
        module
          .directive(
            "myC1",
            valueFn({
              controller() {
                this.name = "c1";
              },
            }),
          )
          .directive(
            "myC2",
            valueFn({
              controller() {
                this.name = "c2";
              },
            }),
          )
          .directive("dep", () => ({
            require: { myC1: "^", myC2: "^" },
            link(scope, element, attrs, controllers) {
              log.push(`dep:${controllers.myC1.name}-${controllers.myC2.name}`);
            },
          }));
        initInjector("test1");
        element = $compile("<div my-c1 my-c2><div dep></div></div>")(
          $rootScope,
        );
        expect(log[0]).toEqual("dep:c1-c2");
      });

      it("should instantiate the controller just once when template/templateUrl", () => {
        const syncCtrlSpy = jasmine.createSpy("sync controller");
        const asyncCtrlSpy = jasmine.createSpy("async controller");

        module
          .directive(
            "myDirectiveSync",
            valueFn({
              template: "<div>Hello!</div>",
              controller: syncCtrlSpy,
            }),
          )
          .directive(
            "myDirectiveAsync",
            valueFn({
              templateUrl: "myDirectiveAsync.html",
              controller: asyncCtrlSpy,
              compile() {
                return () => {};
              },
            }),
          );
        initInjector("test1");
        expect(syncCtrlSpy).not.toHaveBeenCalled();
        expect(asyncCtrlSpy).not.toHaveBeenCalled();

        $templateCache.set("myDirectiveAsync.html", "<div>Hello!</div>");
        element = $compile(
          "<div>" +
            "<span xmy-directive-sync></span>" +
            "<span my-directive-async></span>" +
            "</div>",
        )($rootScope);
        expect(syncCtrlSpy).not.toHaveBeenCalled();
        expect(asyncCtrlSpy).not.toHaveBeenCalled();

        $rootScope.$apply();

        // expect(syncCtrlSpy).toHaveBeenCalled();
        expect(asyncCtrlSpy).toHaveBeenCalled();
      });

      it("should instantiate controllers in the parent->child order when transclusion, templateUrl and replacement are in the mix", () => {
        // When a child controller is in the transclusion that replaces the parent element that has a directive with
        // a controller, we should ensure that we first instantiate the parent and only then stuff that comes from the
        // transclusion.
        //
        // The transclusion moves the child controller onto the same element as parent controller so both controllers are
        // on the same level.

        module
          .directive("parentDirective", () => ({
            transclude: true,
            replace: true,
            templateUrl: "parentDirective.html",
            controller() {
              log.push("parentController");
            },
          }))
          .directive("childDirective", () => ({
            require: "^parentDirective",
            templateUrl: "childDirective.html",
            controller() {
              log.push("childController");
            },
          }));
        initInjector("test1");
        $templateCache.set(
          "parentDirective.html",
          "<div ng-transclude>parentTemplateText;</div>",
        );
        $templateCache.set(
          "childDirective.html",
          "<span>childTemplateText;</span>",
        );

        element = $compile(
          "<div parent-directive><div child-directive></div>childContentText;</div>",
        )($rootScope);
        $rootScope.$apply();
        expect(log.join("; ")).toEqual("parentController; childController");
        expect(element.text()).toBe("childTemplateText;childContentText;");
      });

      it("should instantiate the controller after the isolate scope bindings are initialized (with template)", () => {
        const Ctrl = function ($scope) {
          log.push(`myFoo=${$scope.myFoo}`);
        };

        module.directive("myDirective", () => ({
          scope: {
            myFoo: "=",
          },
          template: "<p>Hello</p>",
          controller: Ctrl,
        }));
        initInjector("test1");
        $rootScope.foo = "bar";

        element = $compile('<div my-directive my-foo="foo"></div>')($rootScope);
        $rootScope.$apply();
        expect(log[0]).toEqual("myFoo=bar");
      });

      it("should instantiate the controller after the isolate scope bindings are initialized (with templateUrl)", () => {
        const Ctrl = function ($scope) {
          log.push(`myFoo=${$scope.myFoo}`);
        };

        module.directive("myDirective", () => ({
          scope: {
            myFoo: "=",
          },
          templateUrl: "/mock/hello",
          controller: Ctrl,
        }));
        initInjector("test1");
        $templateCache.set("/mock/hello", "<p>Hello</p>");
        $rootScope.foo = "bar";

        element = $compile('<div my-directive my-foo="foo"></div>')($rootScope);
        $rootScope.$apply();
        expect(log[0]).toEqual("myFoo=bar");
      });

      it("should instantiate controllers in the parent->child->baby order when nested transclusion, templateUrl and replacement are in the mix", () => {
        // similar to the test above, except that we have one more layer of nesting and nested transclusion

        module
          .directive("parentDirective", () => ({
            transclude: true,
            replace: true,
            templateUrl: "parentDirective.html",
            controller() {
              log.push("parentController");
            },
          }))
          .directive("childDirective", () => ({
            require: "^parentDirective",
            transclude: true,
            replace: true,
            templateUrl: "childDirective.html",
            controller() {
              log.push("childController");
            },
          }))
          .directive("babyDirective", () => ({
            require: "^childDirective",
            templateUrl: "babyDirective.html",
            controller() {
              log.push("babyController");
            },
          }));
        initInjector("test1");
        $templateCache.set(
          "parentDirective.html",
          "<div ng-transclude>parentTemplateText;</div>",
        );
        $templateCache.set(
          "childDirective.html",
          "<span ng-transclude>childTemplateText;</span>",
        );
        $templateCache.set(
          "babyDirective.html",
          "<span>babyTemplateText;</span>",
        );

        element = $compile(
          "<div parent-directive>" +
            "<div child-directive>" +
            "childContentText;" +
            "<div baby-directive>babyContent;</div>" +
            "</div>" +
            "</div>",
        )($rootScope);
        $rootScope.$apply();
        expect(log.join("; ")).toEqual(
          "parentController; childController; babyController",
        );
        expect(element.text()).toBe("childContentText;babyTemplateText;");
      });

      it("should allow controller usage in pre-link directive functions with templateUrl", () => {
        const Ctrl = () => {
          log.push("instance");
        };

        module.directive("myDirective", () => ({
          scope: true,
          templateUrl: "/mock/hello",
          controller: Ctrl,
          compile() {
            return {
              pre(scope, template, attr, ctrl) {},
              post() {},
            };
          },
        }));
        initInjector("test1");
        $templateCache.set("/mock/hello", "<p>Hello</p>");

        element = $compile("<div my-directive></div>")($rootScope);
        $rootScope.$apply();

        expect(log[0]).toEqual("instance");
        expect(element.text()).toBe("Hello");
      });

      it("should allow controller usage in pre-link directive functions with a template", () => {
        const Ctrl = () => {
          log.push("instance");
        };

        module.directive("myDirective", () => ({
          scope: true,
          template: "<p>Hello</p>",
          controller: Ctrl,
          compile() {
            return {
              pre(scope, template, attr, ctrl) {},
              post() {},
            };
          },
        }));
        initInjector("test1");
        element = $compile("<div my-directive></div>")($rootScope);
        $rootScope.$apply();

        expect(log[0]).toEqual("instance");
        expect(element.text()).toBe("Hello");
      });

      it("should throw ctreq with correct directive name, regardless of order", () => {
        module.directive(
          "aDir",
          valueFn({
            restrict: "E",
            require: "ngModel",
            link: () => {},
          }),
        );
        initInjector("test1");
        expect(() => {
          // a-dir will cause a ctreq error to be thrown. Previously, the error would reference
          // the last directive in the chain (which in this case would be ngClick), based on
          // priority and alphabetical ordering. This test verifies that the ordering does not
          // affect which directive is referenced in the minErr message.
          element = $compile('<a-dir ng-click="foo=bar"></a-dir>')($rootScope);
        }).toThrowError(/ctreq/);
      });
    });
  });

  describe("$compile", () => {
    // const { document } = window;

    // let directive;

    // beforeEach(() => {
    //   module(provideLog, ($provide, $compileProvider) => {
    //     element = null;
    //     directive = $compileProvider.directive;
    //     return function (_$compile_, _$rootScope_) {
    //       $rootScope = _$rootScope_;
    //       $compile = _$compile_;
    //     };
    // });

    // function compile(html) {
    //   element = angular.element(html);
    //   $compile(element)($rootScope);
    // }

    describe("transclude", () => {
      describe("content transclusion", () => {
        it("should support transclude directive", () => {
          module.directive("trans", () => ({
            transclude: "content",
            replace: true,
            scope: {},
            link(scope) {
              scope.x = "iso";
            },
            template: "<ul><li>W:{{x}}</li><li ng-transclude></li></ul>",
          }));
          initInjector("test1");
          element = $compile(
            "<div><div trans>T:{{x}}<span>;</span></div></div>",
          )($rootScope);
          $rootScope.x = "root";
          $rootScope.$apply();
          expect(element.text()).toEqual("W:isoT:root;");
          expect(
            JQLite(JQLite(element.find("li")[1])[0].childNodes[0]).text(),
          ).toEqual("T:root");
          expect(JQLite(element.find("span")[0]).text()).toEqual(";");
        });

        it("should transclude transcluded content", () => {
          module
            .directive(
              "book",
              valueFn({
                transclude: "content",
                template:
                  "<div>book-<div chapter>(<div ng-transclude></div>)</div></div>",
              }),
            )
            .directive(
              "chapter",
              valueFn({
                transclude: "content",
                templateUrl: "chapter.html",
              }),
            )
            .directive(
              "section",
              valueFn({
                transclude: "content",
                template:
                  "<div>section-!<div ng-transclude></div>!</div></div>",
              }),
            );
          initInjector("test1");
          // return function ($httpBackend) {
          $templateCache.set(
            "chapter.html",
            "<div>chapter-<div section>[<div ng-transclude></div>]</div></div>",
          );
          element = $compile("<div><div book>paragraph</div></div>")(
            $rootScope,
          );
          expect(element.text()).toEqual("book-");
          $rootScope.$apply();
          expect(element.text()).toEqual(
            "book-chapter-section-![(paragraph)]!",
          );
        });

        it("should compile directives with lower priority than ngTransclude", () => {
          let ngTranscludePriority;
          const lowerPriority = -1;

          module
            .directive("lower", () => ({
              priority: lowerPriority,
              link: {
                pre() {
                  log.push("pre");
                },
                post() {
                  log.push("post");
                },
              },
            }))
            .directive("trans", () => ({
              transclude: true,
              template: "<div lower ng-transclude></div>",
            }))
            .decorator("ngTranscludeDirective", ($delegate) => {
              ngTranscludePriority = $delegate[0].priority;
              return $delegate;
            });

          initInjector("test1");
          element = $compile(
            "<div trans><span>transcluded content</span></div>",
          )($rootScope);

          expect(lowerPriority).toBeLessThan(ngTranscludePriority);

          $rootScope.$apply();

          expect(element.text()).toEqual("transcluded content");
          expect(log.join("; ")).toEqual("pre; post");
        });

        it("should not merge text elements from transcluded content", () => {
          module.directive(
            "foo",
            valueFn({
              transclude: "content",
              template: "<div>This is before {{before}}. </div>",
              link(scope, element, attr, ctrls, $transclude) {
                const futureParent = element.children().eq(0);
                $transclude((clone) => {
                  futureParent.append(clone);
                }, futureParent);
              },
              scope: true,
            }),
          );
          initInjector("test1");
          element = $compile(
            "<div><div foo>This is after {{after}}</div></div>",
          )($rootScope);
          $rootScope.before = "BEFORE";
          $rootScope.after = "AFTER";
          $rootScope.$apply();
          expect(element.text()).toEqual(
            "This is before BEFORE. This is after AFTER",
          );

          $rootScope.before = "Not-Before";
          $rootScope.after = "AfTeR";
          $rootScope.$$childHead.before = "BeFoRe";
          $rootScope.$$childHead.after = "Not-After";
          $rootScope.$apply();
          expect(element.text()).toEqual(
            "This is before BeFoRe. This is after AfTeR",
          );
        });

        it("should only allow one content transclusion per element", () => {
          module
            .directive(
              "first",
              valueFn({
                transclude: true,
              }),
            )
            .directive(
              "second",
              valueFn({
                transclude: true,
              }),
            );
          initInjector("test1");
          expect(() => {
            $compile('<div first="" second=""></div>');
          }).toThrowError(/multidir/);
        });

        it("should correctly handle multi-element directives", () => {
          module
            .directive(
              "foo",
              valueFn({
                template: "[<div ng-transclude></div>]",
                transclude: true,
              }),
            )
            .directive(
              "bar",
              valueFn({
                template:
                  '[<div ng-transclude="header"></div>|<div ng-transclude="footer"></div>]',
                transclude: {
                  header: "header",
                  footer: "footer",
                },
              }),
            );
          initInjector("test1");
          const tmplWithFoo =
            "<foo>" +
            '<div ng-if-start="true">Hello, </div>' +
            "<div ng-if-end>world!</div>" +
            "</foo>";
          const tmplWithBar =
            "<bar>" +
            '<header ng-if-start="true">This is a </header>' +
            "<header ng-if-end>header!</header>" +
            '<footer ng-if-start="true">This is a </footer>' +
            "<footer ng-if-end>footer!</footer>" +
            "</bar>";

          const elem1 = $compile(tmplWithFoo)($rootScope);
          const elem2 = $compile(tmplWithBar)($rootScope);

          expect(elem1.text()).toBe("[Hello, world!]");
          expect(elem2.text()).toBe("[This is a header!|This is a footer!]");

          dealoc(elem1);
          dealoc(elem2);
        });

        // see issue https://github.com/angular/angular.js/issues/12936
        it("should use the proper scope when it is on the root element of a replaced directive template", () => {
          module
            .directive(
              "isolate",
              valueFn({
                scope: {},
                replace: true,
                template: "<div trans>{{x}}</div>",
                link(scope, element, attr, ctrl) {
                  scope.x = "iso";
                },
              }),
            )
            .directive(
              "trans",
              valueFn({
                transclude: "content",
                link(scope, element, attr, ctrl, $transclude) {
                  $transclude((clone) => {
                    element.append(clone);
                  });
                },
              }),
            );
          initInjector("test1");
          element = $compile("<isolate></isolate>")($rootScope);
          $rootScope.x = "root";
          $rootScope.$apply();
          expect(element.text()).toEqual("iso");
        });

        // see issue https://github.com/angular/angular.js/issues/12936
        it("should use the proper scope when it is on the root element of a replaced directive template with child scope", () => {
          module
            .directive(
              "child",
              valueFn({
                scope: true,
                replace: true,
                template: "<div trans>{{x}}</div>",
                link(scope, element, attr, ctrl) {
                  scope.x = "child";
                },
              }),
            )
            .directive(
              "trans",
              valueFn({
                transclude: "content",
                link(scope, element, attr, ctrl, $transclude) {
                  $transclude((clone) => {
                    element.append(clone);
                  });
                },
              }),
            );
          initInjector("test1");
          element = $compile("<child></child>")($rootScope);
          $rootScope.x = "root";
          $rootScope.$apply();
          expect(element.text()).toEqual("child");
        });

        it("should throw if a transcluded node is transcluded again", () => {
          module
            .directive(
              "trans",
              valueFn({
                transclude: true,
                link(scope, element, attr, ctrl, $transclude) {
                  $transclude();
                  $transclude();
                },
              }),
            )
            .decorator("$exceptionHandler", () => {
              return (exception, cause) => {
                throw new Error(exception.message);
              };
            });
          initInjector("test1");
          expect(() => {
            $compile("<trans></trans>")($rootScope);
          }).toThrowError(/multilink/);
        });

        it('should not leak if two "element" transclusions are on the same element', () => {
          const cacheSize = CACHE.size;

          element = $compile(
            '<div><div ng-repeat="x in xs" ng-if="x==1">{{x}}</div></div>',
          )($rootScope);
          expect(CACHE.size).toEqual(cacheSize);

          $rootScope.$apply("xs = [0,1]");
          expect(CACHE.size).toEqual(cacheSize);

          $rootScope.$apply("xs = [0]");
          expect(CACHE.size).toEqual(cacheSize);

          $rootScope.$apply("xs = []");
          expect(CACHE.size).toEqual(cacheSize);

          element.remove();
          expect(CACHE.size).toEqual(cacheSize);
        });

        it('should not leak if two "element" transclusions are on the same element', () => {
          const cacheSize = CACHE.size;
          element = $compile(
            '<div><div ng-repeat="x in xs" ng-if="val">{{x}}</div></div>',
          )($rootScope);

          $rootScope.$apply("xs = [0,1]");
          // At this point we have a bunch of comment placeholders but no real transcluded elements
          // So the cache only contains the root element's data
          expect(CACHE.size).toEqual(cacheSize);

          $rootScope.$apply("val = true");
          // Now we have two concrete transcluded elements plus some comments so two more cache items
          expect(CACHE.size).toEqual(cacheSize);

          $rootScope.$apply("val = false");
          // Once again we only have comments so no transcluded elements and the cache is back to just
          // the root element
          expect(CACHE.size).toEqual(cacheSize);

          element.remove();
          // Now we've even removed the root element along with its cache
          expect(CACHE.size).toEqual(cacheSize);
        });

        // it("should not leak when continuing the compilation of elements on a scope that was destroyed", () => {
        //   const linkFn = jasmine.createSpy("linkFn");

        //   module
        //     .controller("Leak", ($scope, $timeout) => {
        //       $scope.code = "red";
        //       setTimeout(() => {
        //         $scope.code = "blue";
        //       });
        //     })
        //     .directive("isolateRed", () => ({
        //       restrict: "A",
        //       scope: {},
        //       template: "<div red></div>",
        //     }))
        //     .directive("red", () => ({
        //       restrict: "A",
        //       templateUrl: "red.html",
        //       scope: {},
        //       link: linkFn,
        //     }));
        //   initInjector("test1");
        //   const cacheSize = CACHE.size;
        //   $templateCache.set("red.html", "<p>red</p>");
        //   const template = $compile(
        //     '<div ng-controller="Leak">' +
        //       '<div ng-switch="code">' +
        //         '<div ng-switch-when="red">' +
        //           "<div isolate-red></div>" +
        //         "</div>" +
        //       "</div>" +
        //     "</div>",
        //   );
        //   element = template($rootScope, function () {});
        //   ;

        //   expect(linkFn).toHaveBeenCalled();
        //   expect(CACHE.size).toEqual(cacheSize + 2);

        //   $templateCache = new Map();
        //   const destroyedScope = $rootScope.$new();
        //   destroyedScope.$destroy();
        //   const clone = template(destroyedScope, () => {});
        //   ;
        //   // expect(linkFn).not.toHaveBeenCalled();
        //   // clone.remove();
        // });

        describe("cleaning up after a replaced element", () => {
          let xs;

          beforeEach(() => {
            xs = [0, 1];
          });

          function testCleanup() {
            let privateData;
            let firstRepeatedElem;
            $rootScope.noop = function () {};
            element = $compile(
              '<div><div ng-repeat="x in xs" ng-click="noop()">{{x}}</div></div>',
            )($rootScope);

            $rootScope.$apply(`xs = [${xs}]`);
            firstRepeatedElem = element.children(".ng-scope").eq(0);

            privateData = CACHE.get(firstRepeatedElem[0][EXPANDO]);
            expect(privateData.events).toBeDefined();

            expect(privateData.events.click).toBeDefined();
            expect(privateData.events.click[0]).toBeDefined();

            // Ensure the AngularJS $destroy event is still sent
            let destroyCount = 0;
            element.find("div").on("$destroy", () => {
              destroyCount++;
            });

            $rootScope.$apply("xs = null");

            expect(destroyCount).toBe(2);
            expect(firstRepeatedElem.data("$scope")).not.toBeDefined();
            privateData = CACHE.get(firstRepeatedElem[0][EXPANDO]);
            expect(privateData && privateData.events).not.toBeDefined();
          }

          it(
            "should work without external libraries (except jQuery)",
            testCleanup,
          );
        });

        it("should add a $$transcluded property onto the transcluded scope", () => {
          module.directive("trans", () => ({
            transclude: true,
            replace: true,
            scope: true,
            template:
              "<div><span>I:{{$$transcluded}}</span><span ng-transclude></span></div>",
          }));
          initInjector("test1");
          element = $compile("<div><div trans>T:{{$$transcluded}}</div></div>")(
            $rootScope,
          );
          $rootScope.$apply();
          expect(JQLite(element.find("span")[0]).text()).toEqual("I:");
          expect(JQLite(element.find("span")[1]).text()).toEqual("T:true");
        });

        it("should clear contents of the ng-transclude element before appending transcluded content if transcluded content exists", () => {
          module.directive("trans", () => ({
            transclude: true,
            template: "<div ng-transclude>old stuff!</div>",
          }));
          initInjector("test1");
          element = $compile("<div trans>unicorn!</div>")($rootScope);
          $rootScope.$apply();
          expect(element.html()).toEqual(
            '<div ng-transclude="">unicorn!</div>',
          );
        });

        it("should NOT clear contents of the ng-transclude element before appending transcluded content if transcluded content does NOT exist", () => {
          module.directive("trans", () => ({
            transclude: true,
            template: "<div ng-transclude>old stuff!</div>",
          }));
          initInjector("test1");
          element = $compile("<div trans></div>")($rootScope);
          $rootScope.$apply();
          expect(element.html()).toEqual(
            '<div ng-transclude="">old stuff!</div>',
          );
        });

        it("should clear the fallback content from the element during compile and before linking", () => {
          module.directive("trans", () => ({
            transclude: true,
            template: "<div ng-transclude>fallback content</div>",
          }));
          initInjector("test1");
          element = JQLite("<div trans></div>");
          const linkfn = $compile(element);
          expect(element.html()).toEqual('<div ng-transclude=""></div>');
          linkfn($rootScope);
          $rootScope.$apply();
          expect(element.html()).toEqual(
            '<div ng-transclude="">fallback content</div>',
          );
        });

        it("should allow cloning of the fallback via ngRepeat", () => {
          module.directive("trans", () => ({
            transclude: true,
            template:
              '<div ng-repeat="i in [0,1,2]"><div ng-transclude>{{i}}</div></div>',
          }));
          initInjector("test1");
          element = $compile("<div trans></div>")($rootScope);
          $rootScope.$apply();
          expect(element.text()).toEqual("012");
        });

        it("should not link the fallback content if transcluded content is provided", () => {
          const linkSpy = jasmine.createSpy("postlink");

          module
            .directive("inner", () => ({
              restrict: "E",
              template: "old stuff! ",
              link: linkSpy,
            }))
            .directive("trans", () => ({
              transclude: true,
              template: "<div ng-transclude><inner></inner></div>",
            }));
          initInjector("test1");
          element = $compile("<div trans>unicorn!</div>")($rootScope);
          $rootScope.$apply();
          expect(element.html()).toEqual(
            '<div ng-transclude="">unicorn!</div>',
          );
          expect(linkSpy).not.toHaveBeenCalled();
        });

        it("should compile and link the fallback content if no transcluded content is provided", () => {
          const linkSpy = jasmine.createSpy("postlink");

          module
            .directive("inner", () => ({
              restrict: "E",
              template: "old stuff! ",
              link: linkSpy,
            }))
            .directive("trans", () => ({
              transclude: true,
              template: "<div ng-transclude><inner></inner></div>",
            }));
          initInjector("test1");
          element = $compile("<div trans></div>")($rootScope);
          $rootScope.$apply();
          expect(element.html()).toEqual(
            '<div ng-transclude=""><inner>old stuff! </inner></div>',
          );
          expect(linkSpy).toHaveBeenCalled();
        });

        it("should compile and link the fallback content if only whitespace transcluded content is provided", () => {
          const linkSpy = jasmine.createSpy("postlink");

          module
            .directive("inner", () => ({
              restrict: "E",
              template: "old stuff! ",
              link: linkSpy,
            }))
            .directive("trans", () => ({
              transclude: true,
              template: "<div ng-transclude><inner></inner></div>",
            }));
          initInjector("test1");
          element = $compile("<div trans>\n  \n</div>")($rootScope);
          $rootScope.$apply();
          expect(element.html()).toEqual(
            '<div ng-transclude=""><inner>old stuff! </inner></div>',
          );
          expect(linkSpy).toHaveBeenCalled();
        });

        it("should not link the fallback content if only whitespace and comments are provided as transclude content", () => {
          const linkSpy = jasmine.createSpy("postlink");

          module
            .directive("inner", () => ({
              restrict: "E",
              template: "old stuff! ",
              link: linkSpy,
            }))
            .directive("trans", () => ({
              transclude: true,
              template: "<div ng-transclude><inner></inner></div>",
            }));
          initInjector("test1");
          element = $compile("<div trans>\n<!-- some comment -->  \n</div>")(
            $rootScope,
          );
          $rootScope.$apply();
          expect(element.html()).toEqual(
            '<div ng-transclude="">\n<!-- some comment -->  \n</div>',
          );
          expect(linkSpy).not.toHaveBeenCalled();
        });

        it("should compile and link the fallback content if an optional transclusion slot is not provided", () => {
          const linkSpy = jasmine.createSpy("postlink");

          module
            .directive("inner", () => ({
              restrict: "E",
              template: "old stuff! ",
              link: linkSpy,
            }))

            .directive("trans", () => ({
              transclude: { optionalSlot: "?optional" },
              template:
                '<div ng-transclude="optionalSlot"><inner></inner></div>',
            }));
          initInjector("test1");
          element = $compile("<div trans></div>")($rootScope);
          $rootScope.$apply();
          expect(element.html()).toEqual(
            '<div ng-transclude="optionalSlot"><inner>old stuff! </inner></div>',
          );
          expect(linkSpy).toHaveBeenCalled();
        });

        it("should cope if there is neither transcluded content nor fallback content", () => {
          module.directive("trans", () => ({
            transclude: true,
            template: "<div ng-transclude></div>",
          }));
          initInjector("test1");
          element = $compile("<div trans></div>")($rootScope);
          $rootScope.$apply();
          expect(element.html()).toEqual('<div ng-transclude=""></div>');
        });

        it("should throw on an ng-transclude element inside no transclusion directive", () => {
          let error;
          module.decorator("$exceptionHandler", () => {
            return (exception, cause) => {
              throw new Error(exception.message);
            };
          });
          initInjector("test1");
          try {
            $compile("<div><div ng-transclude></div></div>")($rootScope);
          } catch (e) {
            error = e;
          }

          expect(error).toBeTruthy();
          // we need to do this because different browsers print empty attributes differently
        });

        it("should not pass transclusion into a template directive when the directive didn't request transclusion", () => {
          module
            .decorator("$exceptionHandler", () => {
              return (exception, cause) => {
                throw new Error(exception.message);
              };
            })
            .directive(
              "transFoo",
              valueFn({
                template:
                  "<div>" +
                  "<div no-trans-bar></div>" +
                  "<div ng-transclude>this one should get replaced with content</div>" +
                  '<div class="foo" ng-transclude></div>' +
                  "</div>",
                transclude: true,
              }),
            )
            .directive(
              "noTransBar",
              valueFn({
                template:
                  "<div>" +
                  // This ng-transclude is invalid. It should throw an error.
                  '<div class="bar" ng-transclude></div>' +
                  "</div>",
                transclude: false,
              }),
            );
          initInjector("test1");
          expect(() => {
            $compile("<div trans-foo>content</div>")($rootScope);
          }).toThrowError(/orphan/);
        });

        it("should not pass transclusion into a templateUrl directive", (done) => {
          module
            .decorator("$exceptionHandler", () => {
              return (exception, cause) => {
                expect(exception.message).toMatch(/orphan/);
                done();
              };
            })
            .directive(
              "transFoo",
              valueFn({
                template:
                  "<div>" +
                  "<div no-trans-bar></div>" +
                  "<div ng-transclude>this one should get replaced with content</div>" +
                  '<div class="foo" ng-transclude></div>' +
                  "</div>",
                transclude: true,
              }),
            )
            .directive(
              "noTransBar",
              valueFn({
                templateUrl: "noTransBar.html",
                transclude: false,
              }),
            );
          initInjector("test1");
          $templateCache.set(
            "noTransBar.html",
            "<div>" +
              // This ng-transclude is invalid. It should throw an error.
              '<div class="bar" ng-transclude></div>' +
              "</div>",
          );

          $compile("<div trans-foo>content</div>")($rootScope);
        });

        it("should expose transcludeFn in compile fn even for templateUrl", () => {
          module.directive(
            "transInCompile",
            valueFn({
              transclude: true,
              // template: '<div class="foo">whatever</div>',
              templateUrl: "foo.html",
              compile(_, __, transclude) {
                return function (scope, element) {
                  transclude(scope, (clone, scope) => {
                    element.html("");
                    element.append(clone);
                  });
                };
              },
            }),
          );
          initInjector("test1");
          $templateCache.set("foo.html", '<div class="foo">whatever</div>');

          element = $compile("<div trans-in-compile>transcluded content</div>")(
            $rootScope,
          );
          $rootScope.$apply();

          expect(element.text()).toBe("transcluded content");
        });

        it("should make the result of a transclusion available to the parent directive in post-linking phase (template)", () => {
          module.directive("trans", () => ({
            transclude: true,
            template: "<div ng-transclude></div>",
            link: {
              pre($scope, $element) {
                log.push(`pre(${$element.text()})`);
              },
              post($scope, $element) {
                log.push(`post(${$element.text()})`);
              },
            },
          }));
          initInjector("test1");
          element = $compile("<div trans><span>unicorn!</span></div>")(
            $rootScope,
          );
          $rootScope.$apply();
          expect(log.join("; ")).toEqual("pre(); post(unicorn!)");
        });

        it("should make the result of a transclusion available to the parent directive in post-linking phase (templateUrl)", () => {
          // when compiling an async directive the transclusion is always processed before the directive
          // this is different compared to sync directive. delaying the transclusion makes little sense.

          module.directive("trans", () => ({
            transclude: true,
            templateUrl: "trans.html",
            link: {
              pre($scope, $element) {
                log.push(`pre(${$element.text()})`);
              },
              post($scope, $element) {
                log.push(`post(${$element.text()})`);
              },
            },
          }));
          initInjector("test1");
          $templateCache.set("trans.html", "<div ng-transclude></div>");

          element = $compile("<div trans><span>unicorn!</span></div>")(
            $rootScope,
          );
          $rootScope.$apply();
          expect(log.join("; ")).toEqual("pre(); post(unicorn!)");
        });

        it("should make the result of a transclusion available to the parent *replace* directive in post-linking phase (template)", () => {
          module.directive("replacedTrans", () => ({
            transclude: true,
            replace: true,
            template: "<div ng-transclude></div>",
            link: {
              pre($scope, $element) {
                log.push(`pre(${$element.text()})`);
              },
              post($scope, $element) {
                log.push(`post(${$element.text()})`);
              },
            },
          }));
          initInjector("test1");
          element = $compile("<div replaced-trans><span>unicorn!</span></div>")(
            $rootScope,
          );
          $rootScope.$apply();
          expect(log.join("; ")).toEqual("pre(); post(unicorn!)");
        });

        it(
          "should make the result of a transclusion available to the parent *replace* directive in post-linking phase" +
            " (templateUrl)",
          () => {
            module.directive("replacedTrans", () => ({
              transclude: true,
              replace: true,
              templateUrl: "trans.html",
              link: {
                pre($scope, $element) {
                  log.push(`pre(${$element.text()})`);
                },
                post($scope, $element) {
                  log.push(`post(${$element.text()})`);
                },
              },
            }));
            initInjector("test1");
            $templateCache.set("trans.html", "<div ng-transclude></div>");

            element = $compile(
              "<div replaced-trans><span>unicorn!</span></div>",
            )($rootScope);
            $rootScope.$apply();
            expect(log.join("; ")).toEqual("pre(); post(unicorn!)");
          },
        );

        it("should copy the directive controller to all clones", () => {
          let transcludeCtrl;
          const cloneCount = 2;
          module.directive(
            "transclude",
            valueFn({
              transclude: "content",
              controller($transclude) {
                transcludeCtrl = this;
              },
              link(scope, el, attr, ctrl, $transclude) {
                let i;
                for (i = 0; i < cloneCount; i++) {
                  $transclude(cloneAttach);
                }

                function cloneAttach(clone) {
                  el.append(clone);
                }
              },
            }),
          );
          initInjector("test1");
          element = $compile("<div transclude><span></span></div>")($rootScope);
          const children = element.children();
          let i;
          expect(transcludeCtrl).toBeDefined();

          expect(element.data("$transcludeController")).toBe(transcludeCtrl);
          for (i = 0; i < cloneCount; i++) {
            expect(
              children.eq(i).data("$transcludeController"),
            ).toBeUndefined();
          }
        });

        it("should provide the $transclude controller local as 5th argument to the pre and post-link function", () => {
          let ctrlTransclude;
          let preLinkTransclude;
          let postLinkTransclude;
          module.directive(
            "transclude",
            valueFn({
              transclude: "content",
              controller($transclude) {
                ctrlTransclude = $transclude;
              },
              compile() {
                return {
                  pre(scope, el, attr, ctrl, $transclude) {
                    preLinkTransclude = $transclude;
                  },
                  post(scope, el, attr, ctrl, $transclude) {
                    postLinkTransclude = $transclude;
                  },
                };
              },
            }),
          );
          initInjector("test1");
          element = $compile("<div transclude></div>")($rootScope);
          expect(ctrlTransclude).toBeDefined();
          expect(ctrlTransclude).toBe(preLinkTransclude);
          expect(ctrlTransclude).toBe(postLinkTransclude);
        });

        it("should allow an optional scope argument in $transclude", () => {
          let capturedChildCtrl;
          module.directive(
            "transclude",
            valueFn({
              transclude: "content",
              link(scope, element, attr, ctrl, $transclude) {
                $transclude(scope, (clone) => {
                  element.append(clone);
                });
              },
            }),
          );
          initInjector("test1");
          element = $compile("<div transclude>{{$id}}</div>")($rootScope);
          $rootScope.$apply();
          expect(element.text()).toBe(`${$rootScope.$id}`);
        });

        it("should expose the directive controller to transcluded children", () => {
          let capturedChildCtrl;
          module
            .directive(
              "transclude",
              valueFn({
                transclude: "content",
                controller() {},
                link(scope, element, attr, ctrl, $transclude) {
                  $transclude((clone) => {
                    element.append(clone);
                  });
                },
              }),
            )
            .directive(
              "child",
              valueFn({
                require: "^transclude",
                link(scope, element, attr, ctrl) {
                  capturedChildCtrl = ctrl;
                },
              }),
            );
          initInjector("test1");
          element = $compile("<div transclude><div child></div></div>")(
            $rootScope,
          );
          expect(capturedChildCtrl).toBeTruthy();
        });

        // See issue https://github.com/angular/angular.js/issues/14924
        it("should not process top-level transcluded text nodes merged into their sibling", () => {
          module.directive(
            "transclude",
            valueFn({
              template: "<ng-transclude></ng-transclude>",
              transclude: true,
              scope: {},
            }),
          );
          initInjector("test1");
          element = JQLite("<div transclude></div>");
          element[0].appendChild(document.createTextNode("1{{ value }}"));
          element[0].appendChild(document.createTextNode("2{{ value }}"));
          element[0].appendChild(document.createTextNode("3{{ value }}"));

          const initialWatcherCount = countWatchers($rootScope);
          $compile(element)($rootScope);
          $rootScope.$apply("value = 0");
          const newWatcherCount =
            countWatchers($rootScope) - initialWatcherCount;

          expect(element.text()).toBe("102030");
          expect(newWatcherCount).toBe(3);
        });

        // see issue https://github.com/angular/angular.js/issues/9413
        describe("passing a parent bound transclude function to the link function returned from `$compile`", () => {
          beforeEach(() => {
            module
              .directive("lazyCompile", ($compile) => ({
                compile(tElement, tAttrs) {
                  const content = JQLite(tElement[0].childNodes);
                  tElement.empty();
                  return function (scope, element, attrs, ctrls, transcludeFn) {
                    element.append(content);
                    $compile(content)(scope, undefined, {
                      parentBoundTranscludeFn: transcludeFn,
                    });
                  };
                },
              }))
              .directive(
                "toggle",
                valueFn({
                  scope: { t: "=toggle" },
                  transclude: true,
                  template:
                    '<div ng-if="t"><lazy-compile><div ng-transclude></div></lazy-compile></div>',
                }),
              );
            initInjector("test1");
          });

          it("should preserve the bound scope", () => {
            element = $compile(
              "<div>" +
                '<div ng-init="outer=true"></div>' +
                '<div toggle="t">' +
                '<span ng-if="outer">Success</span><span ng-if="!outer">Error</span>' +
                "</div>" +
                "</div>",
            )($rootScope);

            $rootScope.$apply("t = false");
            expect(countChildScopes($rootScope)).toBe(1);
            expect(element.text()).toBe("");

            $rootScope.$apply("t = true");
            expect(countChildScopes($rootScope)).toBe(4);
            expect(element.text()).toBe("Success");

            $rootScope.$apply("t = false");
            expect(countChildScopes($rootScope)).toBe(1);
            expect(element.text()).toBe("");

            $rootScope.$apply("t = true");
            expect(countChildScopes($rootScope)).toBe(4);
            expect(element.text()).toBe("Success");
          });

          it("should preserve the bound scope when using recursive transclusion", () => {
            module.directive(
              "recursiveTransclude",
              valueFn({
                transclude: true,
                template:
                  "<div><lazy-compile><div ng-transclude></div></lazy-compile></div>",
              }),
            );
            initInjector("test1");
            element = $compile(
              "<div>" +
                '<div ng-init="outer=true"></div>' +
                '<div toggle="t">' +
                "<div recursive-transclude>" +
                '<span ng-if="outer">Success</span><span ng-if="!outer">Error</span>' +
                "</div>" +
                "</div>" +
                "</div>",
            )($rootScope);

            $rootScope.$apply("t = false");
            expect(countChildScopes($rootScope)).toBe(1);
            expect(element.text()).toBe("");

            $rootScope.$apply("t = true");
            expect(countChildScopes($rootScope)).toBe(5);
            expect(element.text()).toBe("Success");

            $rootScope.$apply("t = false");
            expect(countChildScopes($rootScope)).toBe(1);
            expect(element.text()).toBe("");

            $rootScope.$apply("t = true");
            expect(countChildScopes($rootScope)).toBe(5);
            expect(element.text()).toBe("Success");
          });
        });

        // see issue https://github.com/angular/angular.js/issues/9095
        describe("removing a transcluded element", () => {
          beforeEach(() => {
            module.directive("toggle", () => ({
              transclude: true,
              template: '<div ng-if="t"><div ng-transclude></div></div>',
            }));
            initInjector("test1");
          });

          it("should not leak the transclude scope when the transcluded content is an element transclusion directive", () => {
            element = $compile(
              "<div toggle>" +
                "<div ng-repeat=\"msg in ['msg-1']\">{{ msg }}</div>" +
                "</div>",
            )($rootScope);

            $rootScope.$apply("t = true");
            expect(element.text()).toContain("msg-1");
            // Expected scopes: $rootScope, ngIf, transclusion, ngRepeat
            expect(countChildScopes($rootScope)).toBe(3);

            $rootScope.$apply("t = false");
            expect(element.text()).not.toContain("msg-1");
            // Expected scopes: $rootScope
            expect(countChildScopes($rootScope)).toBe(0);

            $rootScope.$apply("t = true");
            expect(element.text()).toContain("msg-1");
            // Expected scopes: $rootScope, ngIf, transclusion, ngRepeat
            expect(countChildScopes($rootScope)).toBe(3);

            $rootScope.$apply("t = false");
            expect(element.text()).not.toContain("msg-1");
            // Expected scopes: $rootScope
            expect(countChildScopes($rootScope)).toBe(0);
          });

          it("should not leak the transclude scope when the transcluded content is an multi-element transclusion directive", () => {
            element = $compile(
              "<div toggle>" +
                "<div ng-repeat-start=\"msg in ['msg-1']\">{{ msg }}</div>" +
                "<div ng-repeat-end>{{ msg }}</div>" +
                "</div>",
            )($rootScope);

            $rootScope.$apply("t = true");
            expect(element.text()).toContain("msg-1msg-1");
            // Expected scopes: $rootScope, ngIf, transclusion, ngRepeat
            expect(countChildScopes($rootScope)).toBe(3);

            $rootScope.$apply("t = false");
            expect(element.text()).not.toContain("msg-1msg-1");
            // Expected scopes: $rootScope
            expect(countChildScopes($rootScope)).toBe(0);

            $rootScope.$apply("t = true");
            expect(element.text()).toContain("msg-1msg-1");
            // Expected scopes: $rootScope, ngIf, transclusion, ngRepeat
            expect(countChildScopes($rootScope)).toBe(3);

            $rootScope.$apply("t = false");
            expect(element.text()).not.toContain("msg-1msg-1");
            // Expected scopes: $rootScope
            expect(countChildScopes($rootScope)).toBe(0);
          });

          it("should not leak the transclude scope if the transcluded contains only comments", () => {
            element = $compile("<div toggle><!-- some comment --></div>")(
              $rootScope,
            );

            $rootScope.$apply("t = true");
            expect(element.html()).toContain("some comment");
            // Expected scopes: $rootScope, ngIf, transclusion
            expect(countChildScopes($rootScope)).toBe(2);

            $rootScope.$apply("t = false");
            expect(element.html()).not.toContain("some comment");
            // Expected scopes: $rootScope
            expect(countChildScopes($rootScope)).toBe(0);

            $rootScope.$apply("t = true");
            expect(element.html()).toContain("some comment");
            // Expected scopes: $rootScope, ngIf, transclusion
            expect(countChildScopes($rootScope)).toBe(2);

            $rootScope.$apply("t = false");
            expect(element.html()).not.toContain("some comment");
            // Expected scopes: $rootScope
            expect(countChildScopes($rootScope)).toBe(0);
          });

          it("should not leak the transclude scope if the transcluded contains only text nodes", () => {
            element = $compile("<div toggle>some text</div>")($rootScope);

            $rootScope.$apply("t = true");
            expect(element.html()).toContain("some text");
            // Expected scopes: $rootScope, ngIf, transclusion
            expect(countChildScopes($rootScope)).toBe(2);

            $rootScope.$apply("t = false");
            expect(element.html()).not.toContain("some text");
            // Expected scopes: $rootScope
            expect(countChildScopes($rootScope)).toBe(0);

            $rootScope.$apply("t = true");
            expect(element.html()).toContain("some text");
            // Expected scopes: $rootScope, ngIf, transclusion
            expect(countChildScopes($rootScope)).toBe(2);

            $rootScope.$apply("t = false");
            expect(element.html()).not.toContain("some text");
            // Expected scopes: $rootScope
            expect(countChildScopes($rootScope)).toBe(0);
          });

          it("should mark as destroyed all sub scopes of the scope being destroyed", () => {
            element = $compile(
              "<div toggle>" +
                "<div ng-repeat=\"msg in ['msg-1']\">{{ msg }}</div>" +
                "</div>",
            )($rootScope);

            $rootScope.$apply("t = true");
            const childScopes = getChildScopes($rootScope);

            $rootScope.$apply("t = false");
            for (let i = 0; i < childScopes.length; ++i) {
              expect(childScopes[i].$$destroyed).toBe(true);
            }
          });
        });

        describe("nested transcludes", () => {
          beforeEach(() => {
            module
              .directive("noop", valueFn({}))
              .directive(
                "sync",
                valueFn({
                  template: "<div ng-transclude></div>",
                  transclude: true,
                }),
              )
              .directive(
                "async",
                valueFn({
                  templateUrl: "async",
                  transclude: true,
                }),
              )
              .directive(
                "syncSync",
                valueFn({
                  template:
                    "<div noop><div sync><div ng-transclude></div></div></div>",
                  transclude: true,
                }),
              )
              .directive(
                "syncAsync",
                valueFn({
                  template:
                    "<div noop><div async><div ng-transclude></div></div></div>",
                  transclude: true,
                }),
              )
              .directive(
                "asyncSync",
                valueFn({
                  templateUrl: "asyncSync",
                  transclude: true,
                }),
              )
              .directive(
                "asyncAsync",
                valueFn({
                  templateUrl: "asyncAsync",
                  transclude: true,
                }),
              );

            initInjector("test1");
            $templateCache.set("async", "<div ng-transclude></div>");
            $templateCache.set(
              "asyncSync",
              "<div noop><div sync><div ng-transclude></div></div></div>",
            );
            $templateCache.set(
              "asyncAsync",
              "<div noop><div async><div ng-transclude></div></div></div>",
            );
          });

          it("should allow nested transclude directives with sync template containing sync template", () => {
            element = $compile("<div sync-sync>transcluded content</div>")(
              $rootScope,
            );
            expect(element.text()).toEqual("transcluded content");
          });

          it("should allow nested transclude directives with sync template containing async template", () => {
            element = $compile("<div sync-async>transcluded content</div>")(
              $rootScope,
            );
            expect(element.text()).toEqual("transcluded content");
          });

          it("should allow nested transclude directives with async template containing sync template", () => {
            element = $compile("<div async-sync>transcluded content</div>")(
              $rootScope,
            );
            expect(element.text()).toEqual("transcluded content");
          });

          it("should allow nested transclude directives with async template containing asynch template", () => {
            element = $compile("<div async-async>transcluded content</div>")(
              $rootScope,
            );
            expect(element.text()).toEqual("transcluded content");
          });

          it("should not leak memory with nested transclusion", () => {
            let size;
            const initialSize = CACHE.size;

            element = JQLite(
              '<div><ul><li ng-repeat="n in nums">{{n}} => <i ng-if="0 === n%2">Even</i><i ng-if="1 === n%2">Odd</i></li></ul></div>',
            );
            $compile(element)($rootScope.$new());

            $rootScope.nums = [0, 1, 2];
            $rootScope.$apply();
            size = CACHE.size;

            $rootScope.nums = [3, 4, 5];
            $rootScope.$apply();
            expect(CACHE.size).toEqual(size);

            element.remove();
            expect(CACHE.size).toEqual(initialSize);
          });
        });

        describe("nested isolated scope transcludes", () => {
          beforeEach(() => {
            module
              .directive(
                "trans",
                valueFn({
                  restrict: "E",
                  template: "<div ng-transclude></div>",
                  transclude: true,
                }),
              )
              .directive(
                "transAsync",
                valueFn({
                  restrict: "E",
                  templateUrl: "transAsync",
                  transclude: true,
                }),
              )
              .directive(
                "iso",
                valueFn({
                  restrict: "E",
                  transclude: true,
                  template: "<trans><span ng-transclude></span></trans>",
                  scope: {},
                }),
              )
              .directive(
                "isoAsync1",
                valueFn({
                  restrict: "E",
                  transclude: true,
                  template:
                    "<trans-async><span ng-transclude></span></trans-async>",
                  scope: {},
                }),
              )
              .directive(
                "isoAsync2",
                valueFn({
                  restrict: "E",
                  transclude: true,
                  templateUrl: "isoAsync",
                  scope: {},
                }),
              );

            $templateCache.set("transAsync", "<div ng-transclude></div>");
            $templateCache.set(
              "isoAsync",
              "<trans-async><span ng-transclude></span></trans-async>",
            );
          });

          it("should pass the outer scope to the transclude on the isolated template sync-sync", () => {
            $rootScope.val = "transcluded content";
            element = $compile('<iso><span ng-bind="val"></span></iso>')(
              $rootScope,
            );
            expect(element.text()).toEqual("transcluded content");
          });

          it("should pass the outer scope to the transclude on the isolated template async-sync", () => {
            $rootScope.val = "transcluded content";
            element = $compile(
              '<iso-async1><span ng-bind="val"></span></iso-async1>',
            )($rootScope);
            expect(element.text()).toEqual("transcluded content");
          });

          it("should pass the outer scope to the transclude on the isolated template async-async", () => {
            $rootScope.val = "transcluded content";
            element = $compile(
              '<iso-async2><span ng-bind="val"></span></iso-async2>',
            )($rootScope);
            expect(element.text()).toEqual("transcluded content");
          });
        });

        describe("multiple siblings receiving transclusion", () => {
          it("should only receive transclude from parent", () => {
            module.directive(
              "myExample",
              valueFn({
                scope: {},
                link: function link(scope, element, attrs) {
                  const foo = element[0].querySelector(".foo");
                  scope.children = JQLite(foo).children().length;
                },
                template:
                  "<div>" +
                  "<div>myExample {{children}}!</div>" +
                  '<div ng-if="children">has children</div>' +
                  '<div class="foo" ng-transclude></div>' +
                  "</div>",
                transclude: true,
              }),
            );

            initInjector("test1");
            let element = $compile("<div my-example></div>")($rootScope);
            expect(element.text()).toEqual("myExample 0!");
            dealoc(element);

            element = $compile("<div my-example><p></p></div>")($rootScope);
            expect(element.text()).toEqual("myExample 1!has children");
            dealoc(element);
          });
        });
      });
    });

    describe("element transclusion", () => {
      it("should support basic element transclusion", () => {
        module.directive("trans", () => ({
          transclude: "element",
          template: "<div ng-transclude></div>",
          priority: 2,
          controller: function ($transclude) {
            this.$transclude = $transclude;
          },
          compile(element, attrs, template) {
            log.push(`compile`);
            return function (scope, element, attrs, ctrl) {
              log.push("link");
              let cursor = element;
              template(scope.$new(), (clone) => {
                cursor.after((cursor = clone));
              });
              ctrl.$transclude((clone) => {
                cursor.after(clone);
              });
            };
          },
        }));
        initInjector("test1");
        element = $compile('<div><div trans="text">{{$id}}</div></div>')(
          $rootScope,
        );
        $rootScope.$apply();

        expect(log.join("; ")).toEqual("compile; link");
        expect(element.text()).not.toEqual("");
      });

      it("should only allow one element transclusion per element", () => {
        module
          .directive(
            "first",
            valueFn({
              transclude: "element",
              template: "<div ng-transclude></div>",
            }),
          )
          .directive(
            "second",
            valueFn({
              transclude: "element",
              template: "<div ng-transclude></div>",
            }),
          )
          .decorator("$exceptionHandler", () => {
            return (exception, cause) => {
              throw new Error(exception.message);
            };
          });
        initInjector("test1");
        expect(() => {
          $compile("<div first second></div>")($rootScope);
        }).toThrowError(/multidir/);
      });

      it("should only allow one element transclusion per element when directives have different priorities", () => {
        // we restart compilation in this case and we need to remember the duplicates during the second compile
        // regression #3893
        module
          .directive(
            "first",
            valueFn({
              transclude: "element",
              template: "<div ng-transclude></div>",
              priority: 100,
            }),
          )
          .directive(
            "second",
            valueFn({
              transclude: "element",
              template: "<div ng-transclude></div>",
            }),
          )
          .decorator("$exceptionHandler", () => {
            return (exception, cause) => {
              throw new Error(exception.message);
            };
          });
        initInjector("test1");
        expect(() => {
          $compile("<div first second></div>");
        }).toThrowError(/multidir/);
      });

      it("should only allow one element transclusion per element when async replace directive is in the mix", () => {
        module
          .directive(
            "template",
            valueFn({
              templateUrl: "template.html",
              replace: true,
            }),
          )
          .directive(
            "first",
            valueFn({
              transclude: true,
              template: "<div ng-transclude></div>",
              priority: 100,
            }),
          )
          .directive(
            "second",
            valueFn({
              transclude: true,
              template: "<div ng-transclude></div>",
            }),
          );

        initInjector("test1");
        $templateCache.set("template.html", "<p second>template.html</p>");
        expect(() => {
          $compile("<div template first></div>");
        }).toThrowError(/multidir/);
      });

      it("should only allow one element transclusion per element when replace directive is in the mix", () => {
        module
          .directive(
            "template",
            valueFn({
              template: "<p second></p>",
              replace: true,
            }),
          )
          .directive(
            "first",
            valueFn({
              transclude: true,
              template: "<div ng-transclude></div>",
              priority: 100,
            }),
          )
          .directive(
            "second",
            valueFn({
              transclude: true,
              template: "<div ng-transclude></div>",
            }),
          );
        initInjector("test1");
        expect(() => {
          $compile("<div template first></div>");
        }).toThrowError(/multidir/);
      });

      it("should support transcluded element on root content", () => {
        let comment;
        module.directive(
          "transclude",
          valueFn({
            transclude: "element",
            compile(element, attr, linker) {
              return function (scope, element, attr) {
                comment = element;
              };
            },
          }),
        );
        initInjector("test1");
        const element = JQLite(
          JQLite("<div>before<div transclude></div>after</div>")[0].childNodes,
        );
        expect(element.length).toEqual(3);
        expect(getNodeName(element[1])).toBe("div");
        $compile(element)($rootScope);
        expect(getNodeName(element[1])).toBe("#comment");
        expect(getNodeName(comment)).toBe("#comment");
      });

      it("should terminate compilation only for element transclusion", () => {
        module
          .directive("log", () => ({
            restrict: "A",
            priority: 0,
            compile: valueFn((scope, element, attrs) => {
              log.push(attrs.log || "LOG");
            }),
          }))
          .directive("elementTrans", () => ({
            transclude: "element",
            priority: 50,
            compile: () => log.push("compile:elementTrans"),
          }))
          .directive("regularTrans", () => ({
            transclude: true,
            priority: 50,
            compile: () => log.push("compile:regularTrans"),
          }));
        initInjector("test1");
        $compile(
          '<div><div element-trans log="elem"></div><div regular-trans log="regular"></div></div>',
        )($rootScope);
        expect(log.join("; ")).toEqual(
          "compile:elementTrans; compile:regularTrans; regular",
        );
      });

      xit("should instantiate high priority controllers only once, but low priority ones each time we transclude", () => {
        module
          .directive("elementTrans", () => ({
            transclude: true,
            priority: 50,
            controller($transclude, $element) {
              log.push("controller:elementTrans");
              $transclude((clone) => {
                $element.after(clone);
              });
              $transclude((clone) => {
                $element.after(clone);
              });
              $transclude((clone) => {
                $element.after(clone);
              });
            },
          }))
          .directive("normalDir", () => ({
            controller() {
              log.push("controller:normalDir");
            },
          }));
        initInjector("test1");
        element = $compile("<div><div element-trans normal-dir></div></div>")(
          $rootScope,
        );
        $rootScope.$;
        expect(log).toEqual([
          "controller:elementTrans",
          "controller:normalDir",
          "controller:normalDir",
          "controller:normalDir",
        ]);
      });

      it("should allow to access $transclude in the same directive", () => {
        let _$transclude;
        module.directive(
          "transclude",
          valueFn({
            transclude: "element",
            controller($transclude) {
              _$transclude = $transclude;
            },
          }),
        );
        initInjector("test1");
        element = $compile("<div transclude></div>")($rootScope);
        expect(_$transclude).toBeDefined();
      });

      it("should copy the directive controller to all clones", () => {
        let transcludeCtrl;
        const cloneCount = 2;
        module.directive(
          "transclude",
          valueFn({
            transclude: "element",
            controller() {
              transcludeCtrl = this;
            },
            link(scope, el, attr, ctrl, $transclude) {
              let i;
              for (i = 0; i < cloneCount; i++) {
                $transclude(cloneAttach);
              }

              function cloneAttach(clone) {
                el.after(clone);
              }
            },
          }),
        );
        initInjector("test1");
        element = $compile("<div><div transclude></div></div>")($rootScope);
        const children = element.children();
        let i;
        for (i = 0; i < cloneCount; i++) {
          expect(children.eq(i).data("$transcludeController")).toBe(
            transcludeCtrl,
          );
        }
      });

      it("should expose the directive controller to transcluded children", () => {
        let capturedTranscludeCtrl;
        module
          .directive(
            "transclude",
            valueFn({
              transclude: "element",
              controller() {},
              link(scope, element, attr, ctrl, $transclude) {
                $transclude(scope, (clone) => {
                  element.after(clone);
                });
              },
            }),
          )
          .directive(
            "child",
            valueFn({
              require: "^transclude",
              link(scope, element, attr, ctrl) {
                capturedTranscludeCtrl = ctrl;
              },
            }),
          );
        initInjector("test1");
        // We need to wrap the transclude directive's element in a parent element so that the
        // cloned element gets deallocated/cleaned up correctly
        element = $compile(
          "<div><div transclude><div child></div></div></div>",
        )($rootScope);
        expect(capturedTranscludeCtrl).toBeTruthy();
      });

      it("should allow access to $transclude in a templateUrl directive", () => {
        let transclude;
        module
          .directive(
            "template",
            valueFn({
              templateUrl: "template.html",
              replace: true,
            }),
          )
          .directive(
            "transclude",
            valueFn({
              transclude: "content",
              controller($transclude) {
                transclude = $transclude;
              },
            }),
          );
        initInjector("test1");
        $templateCache.set("template.html", "<div transclude></div>");
        element = $compile("<div template></div>")($rootScope);
        expect(transclude).toBeDefined();
      });

      // issue #6006
      it("should link directive with $element as a comment node", () => {
        module
          .directive("innerAgain", () => ({
            transclude: true,
            link(scope, element, attr, controllers, transclude) {
              log.push(`innerAgain:${getNodeName(element)}`);
              transclude(scope, (clone) => {
                element.parent().append(clone);
              });
            },
          }))
          .directive("inner", () => ({
            replace: true,
            templateUrl: "inner.html",
            link(scope, element) {
              log.push(`inner:${getNodeName(element)}`);
            },
          }))
          .directive("outer", () => ({
            transclude: true,
            link(scope, element, attrs, controllers, transclude) {
              log.push(`outer:${getNodeName(element)}`);
              transclude(scope, (clone) => {
                element.parent().append(clone);
              });
            },
          }));
        initInjector("test1");

        $templateCache.set(
          "inner.html",
          "<div inner-again><p>Content</p></div>",
        );
        element = $compile("<div><div outer><div inner></div></div></div>")(
          $rootScope,
        );
        const child = element.children();

        expect(log).toEqual(["outer:div", "innerAgain:div", "inner:div"]);
      });
    });

    it("should be possible to change the scope of a directive using $provide", () => {
      module
        .directive("foo", () => ({
          scope: {},
          template: "<div></div>",
        }))
        .config([
          "$provide",
          function ($provide) {
            $provide.decorator("fooDirective", ($delegate) => {
              const directive = $delegate[0];
              directive.scope.something = "=";
              directive.template = "<span>{{something}}</span>";
              return $delegate;
            });
          },
        ]);

      initInjector("test1");
      element = $compile('<div><div foo something="bar"></div></div>')(
        $rootScope,
      );
      $rootScope.bar = "bar";
      expect(element.text()).toBe("bar");
    });

    it("should distinguish different bindings with the same binding name", () => {
      module.directive("foo", () => ({
        scope: {
          foo: "=",
          bar: "=",
        },
        template: "<div><div>{{foo}}</div><div>{{bar}}</div></div>",
      }));
      initInjector("test1");
      element = $compile("<div><div foo=\"'foo'\" bar=\"'bar'\"></div></div>")(
        $rootScope,
      );
      expect(element.text()).toBe("foobar");
    });

    it('should safely create transclude comment node and not break with "-->"', () => {
      // see: https://github.com/angular/angular.js/issues/1740
      element = $compile(
        "<ul><li ng-repeat=\"item in ['-->', 'x']\">{{item}}|</li></ul>",
      )($rootScope);
      expect(element.text()).toBe("-->|x|");
    });

    describe("lazy compilation", () => {
      // See https://github.com/angular/angular.js/issues/7183
      it("should pass transclusion through to template of a 'replace' directive", (done) => {
        module
          .directive("transSync", () => ({
            transclude: true,

            link(scope, element, attr, ctrl, transclude) {
              expect(transclude).toEqual(jasmine.any(Function));
              transclude((child) => {
                element.append(child);
              });
            },
          }))
          .directive("trans", () => ({
            transclude: true,
            link(scope, element, attrs, ctrl, transclude) {
              // We use timeout here to simulate how ng-if works
              setTimeout(() => {
                transclude((child) => {
                  element.append(child);
                });
              });
            },
          }))
          .directive("replaceWithTemplate", () => ({
            templateUrl: "template.html",
            replace: true,
          }));
        initInjector("test1");
        $templateCache.set(
          "template.html",
          "<div trans-sync>Content To Be Transcluded</div>",
        );
        let res;
        expect(() => {
          res = $compile(
            "<div><div trans><div replace-with-template></div></div></div>",
          )($rootScope);
        }).not.toThrow();
        setTimeout(() => {
          expect(res.text()).toEqual("Content To Be Transcluded");
          done();
        }, 200);
      });

      it("should lazily compile the contents of directives that are transcluded", () => {
        let innerCompilationCount = 0;
        let transclude;

        module
          .directive(
            "trans",
            valueFn({
              transclude: true,
              controller($transclude) {
                transclude = $transclude;
              },
            }),
          )
          .directive(
            "inner",
            valueFn({
              template: "<span>FooBar</span>",
              compile() {
                innerCompilationCount += 1;
              },
            }),
          );
        initInjector("test1");
        element = $compile("<trans><inner></inner></trans>")($rootScope);
        expect(innerCompilationCount).toBe(0);
        transclude((child) => {
          element.append(child);
        });
        expect(innerCompilationCount).toBe(1);
        expect(element.text()).toBe("FooBar");
      });

      it("should lazily compile the contents of directives that are transcluded with a template", () => {
        let innerCompilationCount = 0;
        let transclude;

        module
          .directive(
            "trans",
            valueFn({
              transclude: true,
              template: "<div>Baz</div>",
              controller($transclude) {
                transclude = $transclude;
              },
            }),
          )
          .directive(
            "inner",
            valueFn({
              template: "<span>FooBar</span>",
              compile() {
                innerCompilationCount += 1;
              },
            }),
          );
        initInjector("test1");
        element = $compile("<trans><inner></inner></trans>")($rootScope);
        expect(innerCompilationCount).toBe(0);
        transclude((child) => {
          element.append(child);
        });
        expect(innerCompilationCount).toBe(1);
        expect(element.text()).toBe("BazFooBar");
      });

      it("should lazily compile the contents of directives that are transcluded with a templateUrl", () => {
        let innerCompilationCount = 0;
        let transclude;

        module
          .directive(
            "trans",
            valueFn({
              transclude: true,
              templateUrl: "baz.html",
              controller($transclude) {
                transclude = $transclude;
              },
            }),
          )
          .directive(
            "inner",
            valueFn({
              template: "<span>FooBar</span>",
              compile() {
                innerCompilationCount += 1;
              },
            }),
          );
        initInjector("test1");
        $templateCache.set("baz.html", "<div>Baz</div>");
        element = $compile("<trans><inner></inner></trans>")($rootScope);
        expect(innerCompilationCount).toBe(0);
        transclude((child) => {
          element.append(child);
        });
        expect(innerCompilationCount).toBe(1);
        expect(element.text()).toBe("BazFooBar");
      });

      it("should lazily compile the contents of directives that are transclude element", () => {
        let innerCompilationCount = 0;
        let transclude;

        module
          .directive(
            "trans",
            valueFn({
              transclude: "element",
              controller($transclude) {
                transclude = $transclude;
              },
            }),
          )
          .directive(
            "inner",
            valueFn({
              template: "<span>FooBar</span>",
              compile() {
                innerCompilationCount += 1;
              },
            }),
          );
        initInjector("test1");
        element = $compile("<div><trans><inner></inner></trans></div>")(
          $rootScope,
        );
        expect(innerCompilationCount).toBe(0);
        transclude((child) => {
          element.append(child);
        });
        expect(innerCompilationCount).toBe(1);
        expect(element.text()).toBe("FooBar");
      });

      it("should lazily compile transcluded directives with ngIf on them", () => {
        let innerCompilationCount = 0;
        let outerCompilationCount = 0;
        let transclude;

        module
          .directive(
            "outer",
            valueFn({
              transclude: true,
              compile() {
                outerCompilationCount += 1;
              },
              controller($transclude) {
                transclude = $transclude;
              },
            }),
          )
          .directive(
            "inner",
            valueFn({
              template: "<span>FooBar</span>",
              compile() {
                innerCompilationCount += 1;
              },
            }),
          );
        initInjector("test1");
        $rootScope.shouldCompile = false;

        element = $compile(
          '<div><outer ng-if="shouldCompile"><inner></inner></outer></div>',
        )($rootScope);
        expect(outerCompilationCount).toBe(0);
        expect(innerCompilationCount).toBe(0);
        expect(transclude).toBeUndefined();
        $rootScope.$apply("shouldCompile=true");
        expect(outerCompilationCount).toBe(1);
        expect(innerCompilationCount).toBe(0);
        expect(transclude).toBeDefined();
        transclude((child) => {
          element.append(child);
        });
        expect(outerCompilationCount).toBe(1);
        expect(innerCompilationCount).toBe(1);
        expect(element.text()).toBe("FooBar");
      });

      it("should eagerly compile multiple directives with transclusion and templateUrl/replace", () => {
        let innerCompilationCount = 0;

        module
          .directive(
            "outer",
            valueFn({
              transclude: true,
            }),
          )
          .directive(
            "outer",
            valueFn({
              templateUrl: "inner.html",
              replace: true,
            }),
          )
          .directive(
            "inner",
            valueFn({
              compile() {
                innerCompilationCount += 1;
              },
            }),
          );
        initInjector("test1");
        $templateCache.set("inner.html", "<inner></inner>");
        element = $compile("<outer></outer>")($rootScope);
        expect(innerCompilationCount).toBe(1);
      });
    });
  });

  describe("multi-slot transclude", () => {
    it("should only include elements without a matching transclusion element in default transclusion slot", () => {
      module.directive("minionComponent", () => ({
        restrict: "E",
        scope: {},
        transclude: {
          bossSlot: "boss",
        },
        template: '<div class="other" ng-transclude></div>',
      }));
      initInjector("test1");
      element = $compile(
        "<minion-component>" +
          "<span>stuart</span>" +
          "<span>bob</span>" +
          "<boss>gru</boss>" +
          "<span>kevin</span>" +
          "</minion-component>",
      )($rootScope);
      $rootScope.$apply();
      expect(element.text()).toEqual("stuartbobkevin");
    });

    it("should use the default transclusion slot if the ng-transclude attribute has the same value as its key", () => {
      module.directive("minionComponent", () => ({
        restrict: "E",
        scope: {},
        transclude: {},
        template:
          '<div class="a" ng-transclude="ng-transclude"></div>' +
          '<div class="b" ng-transclude="ng-transclude"></div>' +
          '<div class="c" data-ng-transclude="data-ng-transclude"></div>',
      }));
      initInjector("test1");
      element = $compile(
        "<minion-component>" +
          "<span>stuart</span>" +
          "<span>bob</span>" +
          "<span>kevin</span>" +
          "</minion-component>",
      )($rootScope);
      $rootScope.$apply();
      const a = element.children().eq(0);
      const b = element.children().eq(1);
      const c = element.children().eq(2);
      expect(a[0].classList.contains("a")).toBeTrue();
      expect(b[0].classList.contains("b")).toBeTrue();
      expect(c[0].classList.contains("c")).toBeTrue();
      expect(a.text()).toEqual("stuartbobkevin");
      expect(b.text()).toEqual("stuartbobkevin");
      expect(c.text()).toEqual("stuartbobkevin");
    });

    it("should include non-element nodes in the default transclusion", () => {
      module.directive("minionComponent", () => ({
        restrict: "E",
        scope: {},
        transclude: {
          bossSlot: "boss",
        },
        template: '<div class="other" ng-transclude></div>',
      }));
      initInjector("test1");
      element = $compile(
        "<minion-component>" +
          "text1" +
          "<span>stuart</span>" +
          "<span>bob</span>" +
          "<boss>gru</boss>" +
          "text2" +
          "<span>kevin</span>" +
          "</minion-component>",
      )($rootScope);
      $rootScope.$apply();
      expect(element.text()).toEqual("text1stuartbobtext2kevin");
    });

    it("should transclude elements to an `ng-transclude` with a matching transclusion slot name", () => {
      module.directive("minionComponent", () => ({
        restrict: "E",
        scope: {},
        transclude: {
          minionSlot: "minion",
          bossSlot: "boss",
        },
        template:
          '<div class="boss" ng-transclude="bossSlot"></div>' +
          '<div class="minion" ng-transclude="minionSlot"></div>' +
          '<div class="other" ng-transclude></div>',
      }));
      initInjector("test1");
      element = $compile(
        "<minion-component>" +
          "<minion>stuart</minion>" +
          "<span>dorothy</span>" +
          "<boss>gru</boss>" +
          "<minion>kevin</minion>" +
          "</minion-component>",
      )($rootScope);
      $rootScope.$apply();
      expect(element.children().eq(0).text()).toEqual("gru");
      expect(element.children().eq(1).text()).toEqual("stuartkevin");
      expect(element.children().eq(2).text()).toEqual("dorothy");
    });

    it("should use the `ng-transclude-slot` attribute if ng-transclude is used as an element", () => {
      module.directive("minionComponent", () => ({
        restrict: "E",
        scope: {},
        transclude: {
          minionSlot: "minion",
          bossSlot: "boss",
        },
        template:
          '<ng-transclude class="boss" ng-transclude-slot="bossSlot"></ng-transclude>' +
          '<ng-transclude class="minion" ng-transclude-slot="minionSlot"></ng-transclude>' +
          '<ng-transclude class="other"></ng-transclude>',
      }));
      initInjector("test1");
      element = $compile(
        "<minion-component>" +
          "<minion>stuart</minion>" +
          "<span>dorothy</span>" +
          "<boss>gru</boss>" +
          "<minion>kevin</minion>" +
          "</minion-component>",
      )($rootScope);
      $rootScope.$apply();
      expect(element.children().eq(0).text()).toEqual("gru");
      expect(element.children().eq(1).text()).toEqual("stuartkevin");
      expect(element.children().eq(2).text()).toEqual("dorothy");
    });

    it("should error if a required transclude slot is not filled", () => {
      module.directive("minionComponent", () => ({
        restrict: "E",
        scope: {},
        transclude: {
          minionSlot: "minion",
          bossSlot: "boss",
        },
        template:
          '<div class="boss" ng-transclude="bossSlot"></div>' +
          '<div class="minion" ng-transclude="minionSlot"></div>' +
          '<div class="other" ng-transclude></div>',
      }));
      initInjector("test1");
      expect(() => {
        element = $compile(
          "<minion-component>" +
            "<minion>stuart</minion>" +
            "<span>dorothy</span>" +
            "</minion-component>",
        )($rootScope);
      }).toThrowError(/reqslot/);
    });

    it("should not error if an optional transclude slot is not filled", () => {
      module.directive("minionComponent", () => ({
        restrict: "E",
        scope: {},
        transclude: {
          minionSlot: "minion",
          bossSlot: "?boss",
        },
        template:
          '<div class="boss" ng-transclude="bossSlot"></div>' +
          '<div class="minion" ng-transclude="minionSlot"></div>' +
          '<div class="other" ng-transclude></div>',
      }));
      initInjector("test1");
      element = $compile(
        "<minion-component>" +
          "<minion>stuart</minion>" +
          "<span>dorothy</span>" +
          "</minion-component>",
      )($rootScope);
      $rootScope.$apply();
      expect(element.children().eq(1).text()).toEqual("stuart");
      expect(element.children().eq(2).text()).toEqual("dorothy");
    });

    it("should error if we try to transclude a slot that was not declared by the directive", () => {
      module
        .directive("minionComponent", () => ({
          restrict: "E",
          scope: {},
          transclude: {
            minionSlot: "minion",
          },
          template:
            '<div class="boss" ng-transclude="bossSlot"></div>' +
            '<div class="minion" ng-transclude="minionSlot"></div>' +
            '<div class="other" ng-transclude></div>',
        }))
        .decorator("$exceptionHandler", () => {
          return (exception, cause) => {
            throw new Error(exception.message);
          };
        });
      initInjector("test1");
      expect(() => {
        element = $compile(
          "<minion-component>" +
            "<minion>stuart</minion>" +
            "<span>dorothy</span>" +
            "</minion-component>",
        )($rootScope);
      }).toThrowError(/noslot/);
    });

    it("should allow the slot name to equal the element name", () => {
      module.directive("foo", () => ({
        restrict: "E",
        scope: {},
        transclude: {
          bar: "bar",
        },
        template: '<div class="other" ng-transclude="bar"></div>',
      }));
      initInjector("test1");
      element = $compile("<foo><bar>baz</bar></foo>")($rootScope);
      $rootScope.$apply();
      expect(element.text()).toEqual("baz");
    });

    it("should match the normalized form of the element name", () => {
      module.directive("foo", () => ({
        restrict: "E",
        scope: {},
        transclude: {
          fooBarSlot: "fooBar",
          mooKarSlot: "mooKar",
        },
        template:
          '<div class="a" ng-transclude="fooBarSlot"></div>' +
          '<div class="b" ng-transclude="mooKarSlot"></div>',
      }));
      initInjector("test1");
      element = $compile(
        "<foo>" +
          "<foo-bar>bar1</foo-bar>" +
          "<foo-bar>bar2</foo-bar>" +
          "<moo-kar>baz1</moo-kar>" +
          "<data-moo-kar>baz2</data-moo-kar>" +
          "</foo>",
      )($rootScope);
      $rootScope.$apply();
      expect(element.children().eq(0).text()).toEqual("bar1bar2");
      expect(element.children().eq(1).text()).toEqual("baz1baz2");
    });

    it("should return true from `isSlotFilled(slotName) for slots that have content in the transclusion", () => {
      let capturedTranscludeFn;
      module.directive("minionComponent", () => ({
        restrict: "E",
        scope: {},
        transclude: {
          minionSlot: "minion",
          bossSlot: "?boss",
        },
        template:
          '<div class="boss" ng-transclude="bossSlot"></div>' +
          '<div class="minion" ng-transclude="minionSlot"></div>' +
          '<div class="other" ng-transclude></div>',
        link(s, e, a, c, transcludeFn) {
          capturedTranscludeFn = transcludeFn;
        },
      }));
      initInjector("test1");
      element = $compile(
        "<minion-component>" +
          "  <minion>stuart</minion>" +
          "  <minion>bob</minion>" +
          "  <span>dorothy</span>" +
          "</minion-component>",
      )($rootScope);
      $rootScope.$apply();

      const hasMinions = capturedTranscludeFn.isSlotFilled("minionSlot");
      const hasBosses = capturedTranscludeFn.isSlotFilled("bossSlot");

      expect(hasMinions).toBe(true);
      expect(hasBosses).toBe(false);
    });

    it("should not overwrite the contents of an `ng-transclude` element, if the matching optional slot is not filled", () => {
      module.directive("minionComponent", () => ({
        restrict: "E",
        scope: {},
        transclude: {
          minionSlot: "minion",
          bossSlot: "?boss",
        },
        template:
          '<div class="boss" ng-transclude="bossSlot">default boss content</div>' +
          '<div class="minion" ng-transclude="minionSlot">default minion content</div>' +
          '<div class="other" ng-transclude>default content</div>',
      }));
      initInjector("test1");
      element = $compile(
        "<minion-component>" +
          "<minion>stuart</minion>" +
          "<span>dorothy</span>" +
          "<minion>kevin</minion>" +
          "</minion-component>",
      )($rootScope);
      $rootScope.$apply();
      expect(element.children().eq(0).text()).toEqual("default boss content");
      expect(element.children().eq(1).text()).toEqual("stuartkevin");
      expect(element.children().eq(2).text()).toEqual("dorothy");
    });

    // See issue https://github.com/angular/angular.js/issues/14924
    it("should not process top-level transcluded text nodes merged into their sibling", () => {
      module.directive(
        "transclude",
        valueFn({
          template: "<ng-transclude></ng-transclude>",
          transclude: {},
          scope: {},
        }),
      );
      initInjector("test1");
      element = JQLite("<div transclude></div>");
      element[0].appendChild(document.createTextNode("1{{ value }}"));
      element[0].appendChild(document.createTextNode("2{{ value }}"));
      element[0].appendChild(document.createTextNode("3{{ value }}"));

      const initialWatcherCount = countWatchers($rootScope);
      $compile(element)($rootScope);
      $rootScope.$apply("value = 0");
      const newWatcherCount = countWatchers($rootScope) - initialWatcherCount;

      expect(element.text()).toBe("102030");
      expect(newWatcherCount).toBe(3);
    });
  });

  ["img", "audio", "video"].forEach((tag) => {
    describe(`${tag}[src] context requirement`, () => {
      it("should NOT require trusted values for trusted URIs", () => {
        element = $compile(`<${tag} src="{{testUrl}}"></${tag}>`)($rootScope);
        $rootScope.testUrl = "http://example.com/image.mp4"; // `http` is trusted
        expect(element.attr("src")).toEqual("http://example.com/image.mp4");
      });

      it("should accept trusted values", () => {
        // As a MEDIA_URL URL
        element = $compile(`<${tag} src="{{testUrl}}"></${tag}>`)($rootScope);
        // Some browsers complain if you try to write `javascript:` into an `img[src]`
        // So for the test use something different
        $rootScope.testUrl = $sce.trustAsMediaUrl("untrusted:foo()");
        expect(element.attr("src")).toEqual("untrusted:foo()");

        // As a URL
        element = $compile(`<${tag} src="{{testUrl}}"></${tag}>`)($rootScope);
        $rootScope.testUrl = $sce.trustAsUrl("untrusted:foo()");
        expect(element.attr("src")).toEqual("untrusted:foo()");

        // As a RESOURCE URL
        element = $compile(`<${tag} src="{{testUrl}}"></${tag}>`)($rootScope);
        $rootScope.testUrl = $sce.trustAsResourceUrl("untrusted:foo()");
        expect(element.attr("src")).toEqual("untrusted:foo()");
      });
    });
  });

  ["source", "track"].forEach((tag) => {
    describe(`${tag}[src]`, () => {
      it("should NOT require trusted values for trusted URIs", () => {
        element = $compile(
          `<video><${tag} src="{{testUrl}}"></${tag}></video>`,
        )($rootScope);
        $rootScope.testUrl = "http://example.com/image.mp4"; // `http` is trusted
        expect(element.find(tag).attr("src")).toEqual(
          "http://example.com/image.mp4",
        );
      });

      it("should accept trusted values", () => {
        // As a MEDIA_URL URL
        element = $compile(
          `<video><${tag} src="{{testUrl}}"></${tag}></video>`,
        )($rootScope);
        $rootScope.testUrl = $sce.trustAsMediaUrl("javascript:foo()");
        expect(element.find(tag).attr("src")).toEqual("javascript:foo()");

        // As a URL
        element = $compile(
          `<video><${tag} src="{{testUrl}}"></${tag}></video>`,
        )($rootScope);
        $rootScope.testUrl = $sce.trustAsUrl("javascript:foo()");
        expect(element.find(tag).attr("src")).toEqual("javascript:foo()");

        // As a RESOURCE URL
        element = $compile(
          `<video><${tag} src="{{testUrl}}"></${tag}></video>`,
        )($rootScope);
        $rootScope.testUrl = $sce.trustAsResourceUrl("javascript:foo()");
        expect(element.find(tag).attr("src")).toEqual("javascript:foo()");
      });
    });
  });

  describe("img[src] sanitization", () => {
    it("should accept trusted values", () => {
      element = $compile('<img src="{{testUrl}}"></img>')($rootScope);
      // Some browsers complain if you try to write `javascript:` into an `img[src]`
      // So for the test use something different
      $rootScope.testUrl = $sce.trustAsMediaUrl("someUntrustedThing:foo();");
      expect(element.attr("src")).toEqual("someUntrustedThing:foo();");
    });

    it("should sanitize concatenated values even if they are trusted", () => {
      element = $compile('<img src="{{testUrl}}ponies"></img>')($rootScope);
      $rootScope.testUrl = $sce.trustAsUrl("untrusted:foo();");
      expect(element.attr("src")).toEqual("unsafe:untrusted:foo();ponies");

      element = $compile('<img src="http://{{testUrl2}}"></img>')($rootScope);
      $rootScope.testUrl2 = $sce.trustAsUrl("xyz;");
      expect(element.attr("src")).toEqual("http://xyz;");

      element = $compile('<img src="{{testUrl3}}{{testUrl3}}"></img>')(
        $rootScope,
      );
      $rootScope.testUrl3 = $sce.trustAsUrl("untrusted:foo();");
      expect(element.attr("src")).toEqual(
        "unsafe:untrusted:foo();untrusted:foo();",
      );
    });

    it("should not sanitize attributes other than src", () => {
      element = $compile('<img title="{{testUrl}}"></img>')($rootScope);
      $rootScope.testUrl = "javascript:doEvilStuff()";
      $rootScope.$apply();
      expect(element.attr("title")).toBe("javascript:doEvilStuff()");
    });

    it("should use $$sanitizeUri", () => {
      const $$sanitizeUri = jasmine.createSpy("$$sanitizeUri");
      module.value("$$sanitizeUri", $$sanitizeUri);
      $$sanitizeUri.and.returnValue("someSanitizedUrl");

      initInjector("test1");
      $rootScope.testUrl = "someUrl";
      element = $compile('<img src="{{testUrl}}"></img>')($rootScope);
      $rootScope.$apply();
      expect(element.attr("src")).toBe("someSanitizedUrl");
      expect($$sanitizeUri).toHaveBeenCalledWith($rootScope.testUrl, true);
    });

    it("should use $$sanitizeUri on concatenated trusted values", () => {
      const $$sanitizeUri = jasmine
        .createSpy("$$sanitizeUri")
        .and.returnValue("someSanitizedUrl");
      module.config(($provide) => {
        $provide.value("$$sanitizeUri", $$sanitizeUri);
      });
      initInjector("test1");

      element = $compile('<img src="{{testUrl}}ponies"></img>')($rootScope);
      $rootScope.testUrl = $sce.trustAsUrl("javascript:foo();");
      expect(element.attr("src")).toEqual("someSanitizedUrl");

      element = $compile('<img src="http://{{testUrl}}"></img>')($rootScope);
      $rootScope.testUrl = $sce.trustAsUrl("xyz");
      expect(element.attr("src")).toEqual("someSanitizedUrl");
    });

    it("should not use $$sanitizeUri with trusted values", () => {
      const $$sanitizeUri = jasmine
        .createSpy("$$sanitizeUri")
        .and.throwError("Should not have been called");
      module.value("$$sanitizeUri", $$sanitizeUri);
      initInjector("test1");
      element = $compile('<img src="{{testUrl}}"></img>')($rootScope);
      // Assigning javascript:foo to src makes at least IE9-11 complain, so use another
      // protocol name.
      $rootScope.testUrl = $sce.trustAsMediaUrl("untrusted:foo();");
      $rootScope.$apply();
      expect(element.attr("src")).toEqual("untrusted:foo();");
    });
  });

  describe("img[srcset] sanitization", () => {
    it("should not error if srcset is undefined", () => {
      let linked = false;
      module.directive(
        "setter",
        valueFn((scope, elem, attrs) => {
          // Set srcset to a value
          attrs.$set("srcset", "http://example.com/");
          expect(attrs.srcset).toBe("http://example.com/");
          // Now set it to undefined
          attrs.$set("srcset", undefined);
          expect(attrs.srcset).toBeUndefined();
          linked = true;
        }),
      );
      initInjector("test1");
      element = $compile("<img setter></img>")($rootScope);
      expect(linked).toBe(true);
      expect(element.attr("srcset")).toBeUndefined();
    });

    it("should NOT require trusted values for trusted URI values", () => {
      element = $compile('<img srcset="{{testUrl}}"></img>')($rootScope);
      $rootScope.testUrl = "http://example.com/image.png"; // `http` is trusted
      expect(element.attr("srcset")).toEqual("http://example.com/image.png");
    });

    it("should accept trusted values, if they are also trusted URIs", () => {
      element = $compile('<img srcset="{{testUrl}}"></img>')($rootScope);
      $rootScope.testUrl = $sce.trustAsUrl("http://example.com");
      expect(element.attr("srcset")).toEqual("http://example.com");
    });

    it("should NOT work with trusted values", () => {
      // A limitation of the approach used for srcset is that you cannot use `trustAsUrl`.
      // Use trustAsHtml and ng-bind-html to work around this.
      element = $compile('<img srcset="{{testUrl}}"></img>')($rootScope);
      $rootScope.testUrl = $sce.trustAsUrl("javascript:something");
      expect(element.attr("srcset")).toEqual("unsafe:javascript:something");

      element = $compile('<img srcset="{{testUrl}},{{testUrl}}"></img>')(
        $rootScope,
      );
      $rootScope.testUrl = $sce.trustAsUrl("javascript:something");
      expect(element.attr("srcset")).toEqual(
        "unsafe:javascript:something ,unsafe:javascript:something",
      );
    });

    it("should use $$sanitizeUri", () => {
      const $$sanitizeUri = jasmine
        .createSpy("$$sanitizeUri")
        .and.returnValue("someSanitizedUrl");
      module.config(($provide) =>
        $provide.value("$$sanitizeUri", $$sanitizeUri),
      );
      initInjector("test1");
      element = $compile('<img srcset="{{testUrl}}"></img>')($rootScope);
      $rootScope.testUrl = "someUrl";
      $rootScope.$apply();
      expect(element.attr("srcset")).toBe("someSanitizedUrl");
      expect($$sanitizeUri).toHaveBeenCalledWith($rootScope.testUrl, true);

      element = $compile('<img srcset="{{testUrl}}, {{testUrl}}"></img>')(
        $rootScope,
      );
      $rootScope.testUrl = "javascript:yay";
      $rootScope.$apply();
      expect(element.attr("srcset")).toEqual(
        "someSanitizedUrl ,someSanitizedUrl",
      );

      element = $compile('<img srcset="java{{testUrl}}"></img>')($rootScope);
      $rootScope.testUrl = "script:yay, javascript:nay";
      $rootScope.$apply();
      expect(element.attr("srcset")).toEqual(
        "someSanitizedUrl ,someSanitizedUrl",
      );
    });

    it("should sanitize all uris in srcset", () => {
      element = $compile('<img srcset="{{testUrl}}"></img>')($rootScope);
      const testSet = {
        "http://example.com/image.png": "http://example.com/image.png",
        " http://example.com/image.png": "http://example.com/image.png",
        "http://example.com/image.png ": "http://example.com/image.png",
        "http://example.com/image.png 128w":
          "http://example.com/image.png 128w",
        "http://example.com/image.png 2x": "http://example.com/image.png 2x",
        "http://example.com/image.png 1.5x":
          "http://example.com/image.png 1.5x",
        "http://example.com/image1.png 1x,http://example.com/image2.png 2x":
          "http://example.com/image1.png 1x,http://example.com/image2.png 2x",
        "http://example.com/image1.png 1x ,http://example.com/image2.png 2x":
          "http://example.com/image1.png 1x ,http://example.com/image2.png 2x",
        "http://example.com/image1.png 1x, http://example.com/image2.png 2x":
          "http://example.com/image1.png 1x,http://example.com/image2.png 2x",
        "http://example.com/image1.png 1x , http://example.com/image2.png 2x":
          "http://example.com/image1.png 1x ,http://example.com/image2.png 2x",
        "http://example.com/image1.png 48w,http://example.com/image2.png 64w":
          "http://example.com/image1.png 48w,http://example.com/image2.png 64w",
        // Test regex to make sure doesn't mistake parts of url for width descriptors
        "http://example.com/image1.png?w=48w,http://example.com/image2.png 64w":
          "http://example.com/image1.png?w=48w,http://example.com/image2.png 64w",
        "http://example.com/image1.png 1x,http://example.com/image2.png 64w":
          "http://example.com/image1.png 1x,http://example.com/image2.png 64w",
        "http://example.com/image1.png,http://example.com/image2.png":
          "http://example.com/image1.png ,http://example.com/image2.png",
        "http://example.com/image1.png ,http://example.com/image2.png":
          "http://example.com/image1.png ,http://example.com/image2.png",
        "http://example.com/image1.png, http://example.com/image2.png":
          "http://example.com/image1.png ,http://example.com/image2.png",
        "http://example.com/image1.png , http://example.com/image2.png":
          "http://example.com/image1.png ,http://example.com/image2.png",
        "http://example.com/image1.png 1x, http://example.com/image2.png 2x, http://example.com/image3.png 3x":
          "http://example.com/image1.png 1x,http://example.com/image2.png 2x,http://example.com/image3.png 3x",
        "javascript:doEvilStuff() 2x": "unsafe:javascript:doEvilStuff() 2x",
        "http://example.com/image1.png 1x,javascript:doEvilStuff() 2x":
          "http://example.com/image1.png 1x,unsafe:javascript:doEvilStuff() 2x",
        "http://example.com/image1.jpg?x=a,b 1x,http://example.com/ima,ge2.jpg 2x":
          "http://example.com/image1.jpg?x=a,b 1x,http://example.com/ima,ge2.jpg 2x",
        // Test regex to make sure doesn't mistake parts of url for pixel density descriptors
        "http://example.com/image1.jpg?x=a2x,b 1x,http://example.com/ima,ge2.jpg 2x":
          "http://example.com/image1.jpg?x=a2x,b 1x,http://example.com/ima,ge2.jpg 2x",
      };

      Object.entries(testSet).forEach(([url, ref]) => {
        $rootScope.testUrl = url;
        expect(element.attr("srcset")).toEqual(ref);
      });
    });
  });

  describe("a[href] sanitization", () => {
    it("should NOT require trusted values for trusted URI values", () => {
      $rootScope.testUrl = "http://example.com/image.png"; // `http` is trusted
      element = $compile('<a href="{{testUrl}}"></a>')($rootScope);
      expect(element.attr("href")).toEqual("http://example.com/image.png");

      element = $compile('<a ng-href="{{testUrl}}"></a>')($rootScope);
      expect(element.attr("ng-href")).toEqual("http://example.com/image.png");
    });

    it("should accept trusted values for non-trusted URI values", () => {
      $rootScope.testUrl = $sce.trustAsUrl("javascript:foo()"); // `javascript` is not trusted
      element = $compile('<a href="{{testUrl}}"></a>')($rootScope);
      expect(element.attr("href")).toEqual("javascript:foo()");

      element = $compile('<a ng-href="{{testUrl}}"></a>')($rootScope);
      expect(element.attr("ng-href")).toEqual("javascript:foo()");
    });

    it("should sanitize non-trusted values", () => {
      $rootScope.testUrl = "javascript:foo()"; // `javascript` is not trusted
      element = $compile('<a href="{{testUrl}}"></a>')($rootScope);
      expect(element.attr("href")).toEqual("unsafe:javascript:foo()");

      element = $compile('<a ng-href="{{testUrl}}"></a>')($rootScope);
      expect(element.attr("href")).toEqual("unsafe:javascript:foo()");
    });

    it("should not sanitize href on elements other than anchor", () => {
      element = $compile('<div href="{{testUrl}}"></div>')($rootScope);
      $rootScope.testUrl = "javascript:doEvilStuff()";
      $rootScope.$apply();

      expect(element.attr("href")).toBe("javascript:doEvilStuff()");
    });

    it("should not sanitize attributes other than href/ng-href", () => {
      element = $compile('<a title="{{testUrl}}"></a>')($rootScope);
      $rootScope.testUrl = "javascript:doEvilStuff()";
      $rootScope.$apply();

      expect(element.attr("title")).toBe("javascript:doEvilStuff()");
    });

    it("should use $$sanitizeUri", () => {
      const $$sanitizeUri = jasmine
        .createSpy("$$sanitizeUri")
        .and.returnValue("someSanitizedUrl");
      module.config(($provide) =>
        $provide.value("$$sanitizeUri", $$sanitizeUri),
      );
      initInjector("test1");
      element = $compile('<a href="{{testUrl}}"></a>')($rootScope);
      $rootScope.testUrl = "someUrl";
      $rootScope.$apply();
      expect(element.attr("href")).toBe("someSanitizedUrl");
      expect($$sanitizeUri).toHaveBeenCalledWith($rootScope.testUrl, false);

      $$sanitizeUri.calls.reset();

      element = $compile('<a ng-href="{{testUrl}}"></a>')($rootScope);
      $rootScope.$apply();
      expect(element.attr("href")).toBe("someSanitizedUrl");
      expect($$sanitizeUri).toHaveBeenCalledWith($rootScope.testUrl, false);
    });

    it("should use $$sanitizeUri when working with svg and xlink-href", () => {
      const $$sanitizeUri = jasmine
        .createSpy("$$sanitizeUri")
        .and.returnValue("https://clean.example.org");
      module.config(($provide) =>
        $provide.value("$$sanitizeUri", $$sanitizeUri),
      );
      initInjector("test1");
      // This URL would fail the RESOURCE_URL trusted list, but that test shouldn't be run
      // because these interpolations will be resolved against the URL context instead
      $rootScope.testUrl = "https://bad.example.org";

      const elementA = $compile(
        "<svg><a xlink-href=\"{{ testUrl + 'aTag' }}\"></a></svg>",
      )($rootScope);
      $rootScope.$apply();
      expect(elementA.find("a").attr("xlink-href")).toBe(
        "https://clean.example.org",
      );
      expect($$sanitizeUri).toHaveBeenCalledWith(
        `${$rootScope.testUrl}aTag`,
        false,
      );

      const elementImage = $compile(
        "<svg><image xlink-href=\"{{ testUrl + 'imageTag' }}\"></image></svg>",
      )($rootScope);
      $rootScope.$apply();
      expect(elementImage.find("image").attr("xlink-href")).toBe(
        "https://clean.example.org",
      );
      expect($$sanitizeUri).toHaveBeenCalledWith(
        `${$rootScope.testUrl}imageTag`,
        true,
      );
    });

    it("should use $$sanitizeUri when working with svg and xlink:href through ng-href", () => {
      const $$sanitizeUri = jasmine
        .createSpy("$$sanitizeUri")
        .and.returnValue("https://clean.example.org");
      module.config(($provide) =>
        $provide.value("$$sanitizeUri", $$sanitizeUri),
      );
      initInjector("test1");
      // This URL would fail the RESOURCE_URL trusted list, but that test shouldn't be run
      // because these interpolations will be resolved against the URL context instead
      $rootScope.testUrl = "https://bad.example.org";

      element = $compile(
        '<svg><a xlink:href="" ng-href="{{ testUrl }}"></a></svg>',
      )($rootScope);
      $rootScope.$apply();
      expect(element.find("a")[0].href.baseVal).toBe(
        "https://clean.example.org",
      );
      expect($$sanitizeUri).toHaveBeenCalledWith($rootScope.testUrl, false);
    });

    it("should require a RESOURCE_URL context for xlink:href by if not on an anchor or image", () => {
      module.decorator("$exceptionHandler", () => {
        return (exception, cause) => {
          throw new Error(exception.message);
        };
      });
      initInjector("test1");
      element = $compile(
        '<svg><whatever xlink-href="{{ testUrl }}"></whatever></svg>',
      )($rootScope);
      $rootScope.testUrl = "https://bad.example.org";

      expect(() => {
        $rootScope.$apply();
      }).toThrowError(/interr/);
    });

    it("should not have endless digests when given arrays in concatenable context", () => {
      element = $compile(
        '<foo href="{{testUrl}}"></foo><foo href="{{::testUrl}}"></foo>' +
          '<foo href="http://example.com/{{testUrl}}"></foo><foo href="http://example.com/{{::testUrl}}"></foo>',
      )($rootScope);
      $rootScope.testUrl = [1];
      $rootScope.testUrl = [];
      $rootScope.testUrl = { a: "b" };
      $rootScope.testUrl = {};
      expect(true).toBeTrue();
    });
  });

  describe("interpolation on HTML DOM event handler attributes onclick, onXYZ, formaction", () => {
    it("should disallow interpolation on onclick", () => {
      module.decorator("$exceptionHandler", () => {
        return (exception, cause) => {
          throw new Error(exception.message);
        };
      });
      initInjector("test1");
      // All interpolations are disallowed.
      $rootScope.onClickJs = "";
      expect(() => {
        $compile('<button onclick="{{onClickJs}}"></button>');
      }).toThrowError(/nodomevents/);
      expect(() => {
        $compile('<button ONCLICK="{{onClickJs}}"></button>');
      }).toThrowError(/nodomevents/);
      expect(() => {
        $compile('<button ng-attr-onclick="{{onClickJs}}"></button>');
      }).toThrowError(/nodomevents/);
      expect(() => {
        $compile('<button ng-attr-ONCLICK="{{onClickJs}}"></button>');
      }).toThrowError(/nodomevents/);
    });

    it("should pass through arbitrary values on onXYZ event attributes that contain a hyphen", () => {
      element = $compile('<button on-click="{{onClickJs}}"></button>')(
        $rootScope,
      );
      $rootScope.onClickJs = "javascript:doSomething()";
      $rootScope.$apply();
      expect(element.attr("on-click")).toEqual("javascript:doSomething()");
    });

    it('should pass through arbitrary values on "on" and "data-on" attributes', () => {
      element = $compile('<button data-on="{{dataOnVar}}"></button>')(
        $rootScope,
      );
      $rootScope.dataOnVar = "data-on text";
      $rootScope.$apply();
      expect(element.attr("data-on")).toEqual("data-on text");

      element = $compile('<button on="{{onVar}}"></button>')($rootScope);
      $rootScope.onVar = "on text";
      $rootScope.$apply();
      expect(element.attr("on")).toEqual("on text");
    });
  });

  describe("iframe[src]", () => {
    beforeEach(() => {
      module.decorator("$exceptionHandler", () => {
        return (exception, cause) => {
          throw new Error(exception.message);
        };
      });
      initInjector("test1");
    });

    it("should pass through src attributes for the same domain", () => {
      element = $compile('<iframe src="{{testUrl}}"></iframe>')($rootScope);
      $rootScope.testUrl = "different_page";
      $rootScope.$apply();
      expect(element.attr("src")).toEqual("different_page");
    });

    it("should clear out src attributes for a different domain", () => {
      element = $compile('<iframe src="{{testUrl}}"></iframe>')($rootScope);
      $rootScope.testUrl = "http://a.different.domain.example.com";
      expect(() => {
        $rootScope.$apply();
      }).toThrowError(/interr/);
    });

    it("should clear out JS src attributes", () => {
      element = $compile('<iframe src="{{testUrl}}"></iframe>')($rootScope);
      $rootScope.testUrl = "javascript:alert(1);";
      expect(() => {
        $rootScope.$apply();
      }).toThrowError(/interr/);
    });

    it("should clear out non-resource_url src attributes", () => {
      element = $compile('<iframe src="{{testUrl}}"></iframe>')($rootScope);
      $rootScope.testUrl = $sce.trustAsUrl("javascript:doTrustedStuff()");
      expect(() => {
        $rootScope.$apply();
      }).toThrowError(/interr/);
    });

    it("should pass through $sce.trustAs() values in src attributes", () => {
      element = $compile('<iframe src="{{testUrl}}"></iframe>')($rootScope);
      $rootScope.testUrl = $sce.trustAsResourceUrl(
        "javascript:doTrustedStuff()",
      );
      $rootScope.$apply();

      expect(element.attr("src")).toEqual("javascript:doTrustedStuff()");
    });
  });

  describe("base[href]", () => {
    it("should be a RESOURCE_URL context", () => {
      module.decorator("$exceptionHandler", () => {
        return (exception, cause) => {
          throw new Error(exception.message);
        };
      });
      initInjector("test1");
      element = $compile('<base href="{{testUrl}}"/>')($rootScope);

      $rootScope.testUrl = $sce.trustAsResourceUrl("https://example.com/");
      $rootScope.$apply();
      expect(element.attr("href")).toContain("https://example.com/");

      $rootScope.testUrl = "https://not.example.com/";
      expect(() => {
        $rootScope.$apply();
      }).toThrowError(/interr/);
    });
  });

  describe("form[action]", () => {
    beforeEach(() => {
      module.decorator("$exceptionHandler", () => {
        return (exception, cause) => {
          throw new Error(exception.message);
        };
      });
      initInjector("test1");
    });

    it("should pass through action attribute for the same domain", () => {
      element = $compile('<form action="{{testUrl}}"></form>')($rootScope);
      $rootScope.testUrl = "different_page";
      $rootScope.$apply();
      expect(element.attr("action")).toEqual("different_page");
    });

    it("should clear out action attribute for a different domain", () => {
      element = $compile('<form action="{{testUrl}}"></form>')($rootScope);
      $rootScope.testUrl = "http://a.different.domain.example.com";
      expect(() => {
        $rootScope.$apply();
      }).toThrowError(/interr/);
    });

    it("should clear out JS action attribute", () => {
      element = $compile('<form action="{{testUrl}}"></form>')($rootScope);
      $rootScope.testUrl = "javascript:alert(1);";
      expect(() => {
        $rootScope.$apply();
      }).toThrowError(/interr/);
    });

    it("should clear out non-resource_url action attribute", () => {
      element = $compile('<form action="{{testUrl}}"></form>')($rootScope);
      $rootScope.testUrl = $sce.trustAsUrl("javascript:doTrustedStuff()");
      expect(() => {
        $rootScope.$apply();
      }).toThrowError(/interr/);
    });

    it("should pass through $sce.trustAsResourceUrl() values in action attribute", () => {
      element = $compile('<form action="{{testUrl}}"></form>')($rootScope);
      $rootScope.testUrl = $sce.trustAsResourceUrl(
        "javascript:doTrustedStuff()",
      );
      $rootScope.$apply();

      expect(element.attr("action")).toEqual("javascript:doTrustedStuff()");
    });
  });

  describe("link[href]", () => {
    beforeEach(() => {
      module.decorator("$exceptionHandler", () => {
        return (exception, cause) => {
          throw new Error(exception.message);
        };
      });
      initInjector("test1");
    });

    it("should reject invalid RESOURCE_URLs", () => {
      element = $compile('<link href="{{testUrl}}" rel="stylesheet" />')(
        $rootScope,
      );
      $rootScope.testUrl = "https://evil.example.org/css.css";
      expect(() => {
        $rootScope.$apply();
      }).toThrowError(/interr/);
    });

    it("should accept valid RESOURCE_URLs", () => {
      element = $compile('<link href="{{testUrl}}" rel="stylesheet" />')(
        $rootScope,
      );

      $rootScope.testUrl = "./css1.css";
      $rootScope.$apply();
      expect(element.attr("href")).toContain("css1.css");

      $rootScope.testUrl = $sce.trustAsResourceUrl(
        "https://elsewhere.example.org/css2.css",
      );
      $rootScope.$apply();
      expect(element.attr("href")).toContain(
        "https://elsewhere.example.org/css2.css",
      );
    });

    it("should accept valid constants", () => {
      element = $compile(
        '<link href="https://elsewhere.example.org/css2.css" rel="stylesheet" />',
      )($rootScope);

      $rootScope.$apply();
      expect(element.attr("href")).toContain(
        "https://elsewhere.example.org/css2.css",
      );
    });
  });

  describe("ngAttr* attribute binding", () => {
    it("should bind after digest but not before", () => {
      $rootScope.name = "Misko";
      element = $compile('<span ng-attr-test="{{name}}"></span>')($rootScope);
      expect(element.attr("test")).toBeUndefined();
      expect(element.attr("test")).toBe("Misko");
    });

    it("should bind after digest but not before when after overridden attribute", () => {
      $rootScope.name = "Misko";
      element = $compile('<span test="123" ng-attr-test="{{name}}"></span>')(
        $rootScope,
      );
      expect(element.attr("test")).toBe("123");
      expect(element.attr("test")).toBe("Misko");
    });

    it("should bind after digest but not before when before overridden attribute", () => {
      $rootScope.name = "Misko";
      element = $compile('<span ng-attr-test="{{name}}" test="123"></span>')(
        $rootScope,
      );
      expect(element.attr("test")).toBe("123");
      expect(element.attr("test")).toBe("Misko");
    });

    it("should set the attribute (after digest) even if there is no interpolation", () => {
      element = $compile('<span ng-attr-test="foo"></span>')($rootScope);
      expect(element.attr("test")).toBeUndefined();

      expect(element.attr("test")).toBe("foo");
    });

    it("should remove attribute if any bindings are undefined", () => {
      element = $compile('<span ng-attr-test="{{name}}{{emphasis}}"></span>')(
        $rootScope,
      );
      expect(element.attr("test")).toBeUndefined();
      $rootScope.name = "caitp";
      expect(element.attr("test")).toBeUndefined();
      $rootScope.emphasis = "!!!";
      expect(element.attr("test")).toBe("caitp!!!");
    });

    describe("in directive", () => {
      beforeEach(() => {
        module
          .directive("syncTest", () => ({
            link: {
              pre(s, e, attr) {
                log.push(attr.test);
              },
              post(s, e, attr) {
                log.push(attr.test);
              },
            },
          }))
          .directive("asyncTest", () => ({
            templateUrl: "async.html",
            link: {
              pre(s, e, attr) {
                log.push(attr.test);
              },
              post(s, e, attr) {
                log.push(attr.test);
              },
            },
          }));
        initInjector("test1");
        $templateCache.set("async.html", "<h1>Test</h1>");
      });

      it("should provide post-digest value in synchronous directive link functions when after overridden attribute", () => {
        $rootScope.test = "TEST";
        element = $compile(
          '<div sync-test test="123" ng-attr-test="{{test}}"></div>',
        )($rootScope);
        expect(element.attr("test")).toBe("123");
        expect(log).toEqual(["TEST", "TEST"]);
      });

      it("should provide post-digest value in synchronous directive link functions when before overridden attribute", () => {
        $rootScope.test = "TEST";
        element = $compile(
          '<div sync-test ng-attr-test="{{test}}" test="123"></div>',
        )($rootScope);
        expect(element.attr("test")).toBe("123");
        expect(log).toEqual(["TEST", "TEST"]);
      });

      it("should provide post-digest value in asynchronous directive link functions when after overridden attribute", () => {
        $rootScope.test = "TEST";
        element = $compile(
          '<div async-test test="123" ng-attr-test="{{test}}"></div>',
        )($rootScope);
        expect(element.attr("test")).toBe("123");
        expect(log).toEqual(["TEST", "TEST"]);
      });

      it("should provide post-digest value in asynchronous directive link functions when before overridden attribute", () => {
        $rootScope.test = "TEST";
        element = $compile(
          '<div async-test ng-attr-test="{{test}}" test="123"></div>',
        )($rootScope);
        expect(element.attr("test")).toBe("123");
        expect(log).toEqual(["TEST", "TEST"]);
      });
    });

    it("should work with different prefixes", () => {
      $rootScope.name = "Misko";
      element = $compile(
        '<span ng-attr-test="{{name}}" ng-Attr-test2="{{name}}" ng-Attr-test3="{{name}}"></span>',
      )($rootScope);
      expect(element.attr("test")).toBeUndefined();
      expect(element.attr("test2")).toBeUndefined();
      expect(element.attr("test3")).toBeUndefined();
      expect(element.attr("test")).toBe("Misko");
      expect(element.attr("test2")).toBe("Misko");
      expect(element.attr("test3")).toBe("Misko");
    });

    it("should use the non-prefixed name in $attr mappings", () => {
      let attrs;
      module.directive(
        "attrExposer",
        valueFn({
          link($scope, $element, $attrs) {
            attrs = $attrs;
          },
        }),
      );
      initInjector("test1");

      $compile(
        '<div attr-exposer ng-attr-title="12" ng-attr-super-title="34" ng-attr-my-camel_title="56">',
      )($rootScope);
      $rootScope.$apply();

      expect(attrs.title).toBe("12");
      expect(attrs.$attr.title).toBe("title");
      expect(attrs.ngAttrTitle).toBeUndefined();
      expect(attrs.$attr.ngAttrTitle).toBeUndefined();

      expect(attrs.superTitle).toBe("34");
      expect(attrs.$attr.superTitle).toBe("super-title");
      expect(attrs.ngAttrSuperTitle).toBeUndefined();
      expect(attrs.$attr.ngAttrSuperTitle).toBeUndefined();

      // Note the casing is incorrect: https://github.com/angular/angular.js/issues/16624
      expect(attrs.myCameltitle).toBe("56");
      expect(attrs.$attr.myCameltitle).toBe("my-camelTitle");
      expect(attrs.ngAttrMyCameltitle).toBeUndefined();
      expect(attrs.ngAttrMyCamelTitle).toBeUndefined();
      expect(attrs.$attr.ngAttrMyCameltitle).toBeUndefined();
      expect(attrs.$attr.ngAttrMyCamelTitle).toBeUndefined();
    });

    it('should work with the "href" attribute', () => {
      $rootScope.value = "test";
      element = $compile('<a ng-attr-href="test/{{value}}"></a>')($rootScope);
      expect(element.attr("href")).toBe("test/test");
    });

    it("should work if they are prefixed with data- and different prefixes", () => {
      $rootScope.name = "Misko";
      element = $compile(
        '<span data-ng-attr-test2="{{name}}" ng-attr-test3="{{name}}" data-ng-attr-test4="{{name}}" ' +
          'ng-attr-test5="{{name}}" ng-attr-test6="{{name}}"></span>',
      )($rootScope);
      expect(element.attr("test2")).toBeUndefined();
      expect(element.attr("test3")).toBeUndefined();
      expect(element.attr("test4")).toBeUndefined();
      expect(element.attr("test5")).toBeUndefined();
      expect(element.attr("test6")).toBeUndefined();
      expect(element.attr("test2")).toBe("Misko");
      expect(element.attr("test3")).toBe("Misko");
      expect(element.attr("test4")).toBe("Misko");
      expect(element.attr("test5")).toBe("Misko");
      expect(element.attr("test6")).toBe("Misko");
    });

    describe("with media url attributes", () => {
      it("should work with interpolated ng-attr-src", () => {
        $rootScope.name = "some-image.png";
        element = $compile('<img ng-attr-src="{{name}}">')($rootScope);
        expect(element.attr("src")).toBeUndefined();

        expect(element.attr("src")).toBe("some-image.png");

        $rootScope.name = "other-image.png";
        expect(element.attr("src")).toBe("other-image.png");
      });

      it("should work with interpolated ng-attr-data-src", () => {
        $rootScope.name = "some-image.png";
        element = $compile('<img ng-attr-data-src="{{name}}">')($rootScope);
        expect(element.attr("data-src")).toBeUndefined();

        expect(element.attr("data-src")).toBe("some-image.png");

        $rootScope.name = "other-image.png";
        expect(element.attr("data-src")).toBe("other-image.png");
      });

      it("should work alongside constant [src]-attribute and [ng-attr-data-src] attributes", () => {
        $rootScope.name = "some-image.png";
        element = $compile(
          '<img src="constant.png" ng-attr-data-src="{{name}}">',
        )($rootScope);
        expect(element.attr("data-src")).toBeUndefined();

        expect(element.attr("src")).toBe("constant.png");
        expect(element.attr("data-src")).toBe("some-image.png");

        $rootScope.name = "other-image.png";
        expect(element.attr("src")).toBe("constant.png");
        expect(element.attr("data-src")).toBe("other-image.png");
      });
    });

    describe("when an attribute has a dash-separated name", () => {
      it("should work with different prefixes", () => {
        $rootScope.name = "JamieMason";
        element = $compile(
          '<span ng-attr-dash-test="{{name}}" ng-Attr-dash-test2="{{name}}" ng-Attr-dash-test3="{{name}}"></span>',
        )($rootScope);
        expect(element.attr("dash-test")).toBeUndefined();
        expect(element.attr("dash-test2")).toBeUndefined();
        expect(element.attr("dash-test3")).toBeUndefined();
        expect(element.attr("dash-test")).toBe("JamieMason");
        expect(element.attr("dash-test2")).toBe("JamieMason");
        expect(element.attr("dash-test3")).toBe("JamieMason");
      });

      it("should work if they are prefixed with  or data-", () => {
        $rootScope.name = "JamieMason";
        element = $compile(
          '<span data-ng-attr-dash-test2="{{name}}" ng-attr-dash-test3="{{name}}" data-ng-attr-dash-test4="{{name}}"></span>',
        )($rootScope);
        expect(element.attr("dash-test2")).toBeUndefined();
        expect(element.attr("dash-test3")).toBeUndefined();
        expect(element.attr("dash-test4")).toBeUndefined();
        expect(element.attr("dash-test2")).toBe("JamieMason");
        expect(element.attr("dash-test3")).toBe("JamieMason");
        expect(element.attr("dash-test4")).toBe("JamieMason");
      });

      it("should keep attributes ending with -start single-element directives", () => {
        module.directive("dashStarter", () => ({
          link(scope, element, attrs) {
            log.push(attrs.onDashStart);
          },
        }));
        initInjector("test1");
        $compile(
          '<span data-dash-starter data-on-dash-start="starter"></span>',
        )($rootScope);
        expect(log[0]).toEqual("starter");
      });

      it("should keep attributes ending with -end single-element directives", () => {
        module.directive("dashEnder", () => ({
          link(scope, element, attrs) {
            log.push(attrs.onDashEnd);
          },
        }));
        initInjector("test1");
        $compile('<span data-dash-ender data-on-dash-end="ender"></span>')(
          $rootScope,
        );
        expect(log[0]).toEqual("ender");
      });
    });
  });

  describe("addPropertySecurityContext", () => {
    it("should allow adding new properties", () => {
      createInjector([
        "ng",
        ($compileProvider) => {
          $compileProvider.addPropertySecurityContext(
            "div",
            "title",
            "mediaUrl",
          );
          $compileProvider.addPropertySecurityContext(
            "*",
            "my-prop",
            "resourceUrl",
          );
        },
      ]);
      expect(true).toBeTrue();
    });

    it("should allow different sce types of a property on different element types", () => {
      createInjector([
        "ng",
        ($compileProvider) => {
          $compileProvider.addPropertySecurityContext(
            "div",
            "title",
            "mediaUrl",
          );
          $compileProvider.addPropertySecurityContext("span", "title", "css");
          $compileProvider.addPropertySecurityContext(
            "*",
            "title",
            "resourceUrl",
          );
          $compileProvider.addPropertySecurityContext(
            "article",
            "title",
            "html",
          );
        },
      ]);
      expect(true).toBeTrue();
    });

    it("should throw 'ctxoverride' when changing an existing context", () => {
      createInjector([
        "ng",
        ($compileProvider) => {
          $compileProvider.addPropertySecurityContext(
            "div",
            "title",
            "mediaUrl",
          );
          expect(() => {
            $compileProvider.addPropertySecurityContext(
              "div",
              "title",
              "resourceUrl",
            );
          }).toThrowError(/ctxoverride/);
        },
      ]);
    });

    it("should allow setting the same property/element to the same value", () => {
      createInjector([
        "ng",
        ($compileProvider) => {
          $compileProvider.addPropertySecurityContext(
            "div",
            "title",
            "mediaUrl",
          );
          $compileProvider.addPropertySecurityContext(
            "div",
            "title",
            "mediaUrl",
          );
        },
      ]);
      expect(true).toBeTrue();
    });

    it("should enforce the specified sce type for properties added for specific elements", () => {
      injector = createInjector([
        "ng",
        "defaultModule",
        ($compileProvider) => {
          $compileProvider.addPropertySecurityContext("div", "foo", "mediaUrl");
        },
      ]);
      reloadInjector();

      const element = $compile('<div ng-prop-foo="bar"></div>')($rootScope);

      $rootScope.bar = "untrusted:test1";
      $rootScope.$apply();
      expect(element[0].foo).toBe("unsafe:untrusted:test1");

      $rootScope.bar = $sce.trustAsCss("untrusted:test2");
      $rootScope.$apply();
      expect(element[0].foo).toBe("unsafe:untrusted:test2");

      $rootScope.bar = $sce.trustAsMediaUrl("untrusted:test3");
      $rootScope.$apply();
      expect(element[0].foo).toBe("untrusted:test3");
    });

    it("should enforce the specified sce type for properties added for all elements (*)", () => {
      injector = createInjector([
        "ng",
        "defaultModule",
        ($compileProvider) => {
          $compileProvider.addPropertySecurityContext("*", "foo", "mediaUrl");
        },
      ]);
      reloadInjector();

      const element = $compile('<div ng-prop-foo="bar"></div>')($rootScope);

      $rootScope.bar = "untrusted:test1";
      $rootScope.$apply();
      expect(element[0].foo).toBe("unsafe:untrusted:test1");

      $rootScope.bar = $sce.trustAsCss("untrusted:test2");
      $rootScope.$apply();
      expect(element[0].foo).toBe("unsafe:untrusted:test2");

      $rootScope.bar = $sce.trustAsMediaUrl("untrusted:test3");
      $rootScope.$apply();
      expect(element[0].foo).toBe("untrusted:test3");
    });

    it("should enforce the specific sce type when both an element specific and generic exist", () => {
      injector = createInjector([
        "ng",
        "defaultModule",
        ($compileProvider) => {
          $compileProvider.addPropertySecurityContext("*", "foo", "css");
          $compileProvider.addPropertySecurityContext("div", "foo", "mediaUrl");
        },
      ]);
      reloadInjector();

      const element = $compile('<div ng-prop-foo="bar"></div>')($rootScope);

      $rootScope.bar = "untrusted:test1";
      $rootScope.$apply();
      expect(element[0].foo).toBe("unsafe:untrusted:test1");

      $rootScope.bar = $sce.trustAsCss("untrusted:test2");
      $rootScope.$apply();
      expect(element[0].foo).toBe("unsafe:untrusted:test2");

      $rootScope.bar = $sce.trustAsMediaUrl("untrusted:test3");
      $rootScope.$apply();
      expect(element[0].foo).toBe("untrusted:test3");
    });
  });

  describe("when an attribute has an underscore-separated name", () => {
    it("should work with different prefixes", () => {
      $rootScope.dimensions = "0 0 0 0";
      element = $compile('<svg ng-attr-view-box="{{dimensions}}"></svg>')(
        $rootScope,
      );
      expect(element.attr("view-box")).toBeUndefined();
      expect(element.attr("view-box")).toBe("0 0 0 0");
    });

    it("should work if they are prefixed with data-", () => {
      $rootScope.dimensions = "0 0 0 0";
      $rootScope.number = 0.42;
      $rootScope.scale = 1;
      element = $compile(
        '<svg data-ng-attr-view-box="{{dimensions}}">' +
          '<filter ng-attr-filter-units="{{number}}">' +
          '<feDiffuseLighting data-ng-attr-surface-scale="{{scale}}">' +
          "</feDiffuseLighting>" +
          '<feSpecularLighting ng-attr-surface-scale="{{scale}}">' +
          "</feSpecularLighting></filter></svg>",
      )($rootScope);
      expect(element.attr("viewBox")).toBeUndefined();
      expect(element.attr("view-box")).toBe("0 0 0 0");
      expect(element.find("filter").attr("filter-units")).toBe("0.42");
      expect(element.find("feDiffuseLighting").attr("surface-scale")).toBe("1");
      expect(element.find("feSpecularLighting").attr("surface-scale")).toBe(
        "1",
      );
    });
  });

  describe("multi-element directive", () => {
    it("should group on link function", async () => {
      $rootScope.show = false;
      element = $compile(
        "<div>" +
          '<span ng-show-start="show"></span>' +
          "<span ng-show-end='show'></span>" +
          "</div>",
      )($rootScope);
      await wait(100);
      const spans = element.find("span");
      expect(spans.eq(0)[0].classList.contains("ng-hide")).toBeTrue();
      expect(spans.eq(1)[0].classList.contains("ng-hide")).toBeTrue();
    });

    it("should group on compile function", () => {
      $rootScope.show = false;
      element = $compile(
        "<div>" +
          '<span ng-repeat-start="i in [1,2]">{{i}}A</span>' +
          "<span ng-repeat-end>{{i}}B;</span>" +
          "</div>",
      )($rootScope);
      expect(element.text()).toEqual("1A1B;2A2B;");
    });

    it("should support grouping over text nodes", () => {
      $rootScope.show = false;
      element = $compile(
        "<div>" +
          '<span ng-repeat-start="i in [1,2]">{{i}}A</span>' +
          ":" + // Important: proves that we can iterate over non-elements
          "<span ng-repeat-end>{{i}}B;</span>" +
          "</div>",
      )($rootScope);
      expect(element.text()).toEqual("1A:1B;2A:2B;");
    });

    it("should group on $root compile function", () => {
      $rootScope.show = false;
      element = $compile(
        "<div></div>" +
          '<span ng-repeat-start="i in [1,2]">{{i}}A</span>' +
          "<span ng-repeat-end>{{i}}B;</span>" +
          "<div></div>",
      )($rootScope);
      element = JQLite(element[0].parentNode.childNodes); // reset because repeater is top level.
      expect(element.text()).toEqual("1A1B;2A2B;");
    });

    it("should group on nested groups", () => {
      module.directive(
        "ngMultiBind",
        valueFn({
          multiElement: true,
          link(scope, element, attr) {
            element.text(scope.$eval(attr.ngMultiBind));
          },
        }),
      );
      initInjector("test1");

      $rootScope.show = false;
      element = $compile(
        "<div></div>" +
          '<div ng-repeat-start="i in [1,2]">{{i}}A</div>' +
          "<span ng-multi-bind-start=\"'.'\"></span>" +
          "<span ng-multi-bind-end></span>" +
          "<div ng-repeat-end>{{i}}B;</div>" +
          "<div></div>",
      )($rootScope);
      element = JQLite(element[0].parentNode.childNodes); // reset because repeater is top level.
      expect(element.text()).toEqual("1A..1B;2A..2B;");
    });

    it("should group on nested groups of same directive", () => {
      $rootScope.show = false;
      element = $compile(
        "<div></div>" +
          '<div ng-repeat-start="i in [1,2]">{{i}}(</div>' +
          '<span ng-repeat-start="j in [2,3]">{{j}}-</span>' +
          "<span ng-repeat-end>{{j}}</span>" +
          "<div ng-repeat-end>){{i}};</div>" +
          "<div></div>",
      )($rootScope);
      element = JQLite(element[0].parentNode.childNodes); // reset because repeater is top level.
      expect(element.text()).toEqual("1(2-23-3)1;2(2-23-3)2;");
    });

    it("should set up and destroy the transclusion scopes correctly", () => {
      element = $compile(
        "<div>" +
          '<div ng-if-start="val0"><span ng-if="val1"></span></div>' +
          '<div ng-if-end><span ng-if="val2"></span></div>' +
          "</div>",
      )($rootScope);
      $rootScope.$apply("val0 = true; val1 = true; val2 = true");
      expect($rootScope.$$childHead).toBeTruthy();
      expect($rootScope.$$childHead.$$childHead).toBeTruthy();
      // At this point we should have something like:
      //
      // <div>
      //
      //   <!---->
      //   <div ng-if-start="val0">
      //     <!---->
      //     <span ng-if="val1"></span>
      //     <!---->
      //   </div>
      //
      //   <div ng-if-end="">
      //     <!---->
      //     <span ng-if="val2"></span>
      //     <!---->
      //   </div>
      //
      //   <!---->
      // </div>
      // const ngIfStartScope = element.find("div").eq(0).scope();
      // const ngIfEndScope = element.find("div").eq(1).scope();

      // expect(ngIfStartScope.$id).toEqual(ngIfEndScope.$id);

      // const ngIf1Scope = element.find("span").eq(0).scope();
      // const ngIf2Scope = element.find("span").eq(1).scope();

      // expect(ngIf1Scope.$id).not.toEqual(ngIf2Scope.$id);
      // expect(ngIf1Scope.$parent.$id).toEqual(ngIf2Scope.$parent.$id);

      $rootScope.$apply("val1 = false");
      // Now we should have something like:
      //
      // <div>
      //   <!-- ngIf: val0 -->
      //   <div ng-if-start="val0">
      //     <!-- ngIf: val1 -->
      //   </div>
      //   <div ng-if-end="">
      //     <!-- ngIf: val2 -->
      //     <span ng-if="val2"></span>
      //     <!-- end ngIf: val2 -->
      //   </div>
      //   <!-- end ngIf: val0 -->
      // </div>

      // expect(ngIfStartScope.$$destroyed).not.toEqual(true);
      // expect(ngIf1Scope.$$destroyed).toEqual(true);
      // expect(ngIf2Scope.$$destroyed).not.toEqual(true);

      $rootScope.$apply("val0 = false");

      // Now we should have something like:
      //
      // <div>
      //   <!-- ngIf: val0 -->
      // </div>
      // TODO: Until we figure out a better way of testing this
      expect($rootScope.$$childHead).toBeNull();
      // expect(ngIfStartScope.$$destroyed).toEqual(true);
      // expect(ngIf1Scope.$$destroyed).toEqual(true);
      // expect(ngIf2Scope.$$destroyed).toEqual(true);
    });

    it("should set up and destroy the transclusion scopes correctly", () => {
      element = $compile(
        "<div>" +
          '<div ng-repeat-start="val in val0" ng-if="val1"></div>' +
          '<div ng-repeat-end ng-if="val2"></div>' +
          "</div>",
      )($rootScope);

      // To begin with there is (almost) nothing:
      // <div>
      //   <!-- ngRepeat: val in val0 -->
      // </div>

      //expect(element.scope().$id).toEqual($rootScope.$id);

      // Now we create all the elements
      $rootScope.$apply("val0 = [1]; val1 = true; val2 = true");

      // At this point we have:
      //
      // <div>
      //
      //   <!-- ngRepeat: val in val0 -->
      //   <!-- ngIf: val1 -->
      //   <div ng-repeat-start="val in val0">
      //   </div>
      //   <!-- end ngIf: val1 -->
      //
      //   <!-- ngIf: val2 -->
      //   <div ng-repeat-end="">
      //   </div>
      //   <!-- end ngIf: val2 -->
      //   <!-- end ngRepeat: val in val0 -->
      // </div>
      // const ngIf1Scope = element.find("div").eq(0).scope();
      // const ngIf2Scope = element.find("div").eq(1).scope();
      // const ngRepeatScope = ngIf1Scope.$parent;

      // expect(ngIf1Scope.$id).not.toEqual(ngIf2Scope.$id);
      // expect(ngIf1Scope.$parent.$id).toEqual(ngRepeatScope.$id);
      // expect(ngIf2Scope.$parent.$id).toEqual(ngRepeatScope.$id);

      // // What is happening here??
      // // We seem to have a repeater scope which doesn't actually match to any element
      // expect(ngRepeatScope.$parent.$id).toEqual($rootScope.$id);

      // Now remove the first ngIf element from the first item in the repeater
      $rootScope.$apply("val1 = false");

      // At this point we should have:
      //
      // <div>
      //   <!-- ngRepeat: val in val0 -->
      //
      //   <!-- ngIf: val1 -->
      //
      //   <!-- ngIf: val2 -->
      //   <div ng-repeat-end="" ng-if="val2"></div>
      //   <!-- end ngIf: val2 -->
      //
      //   <!-- end ngRepeat: val in val0 -->
      // </div>
      //
      // expect(ngRepeatScope.$$destroyed).toEqual(false);
      // expect(ngIf1Scope.$$destroyed).toEqual(true);
      // expect(ngIf2Scope.$$destroyed).toEqual(false);

      // Now remove the second ngIf element from the first item in the repeater
      $rootScope.$apply("val2 = false");

      // We are mostly back to where we started
      //
      // <div>
      //   <!-- ngRepeat: val in val0 -->
      //   <!-- ngIf: val1 -->
      //   <!-- ngIf: val2 -->
      //   <!-- end ngRepeat: val in val0 -->
      // </div>

      // expect(ngRepeatScope.$$destroyed).toEqual(false);
      // expect(ngIf1Scope.$$destroyed).toEqual(true);
      // expect(ngIf2Scope.$$destroyed).toEqual(true);

      // Finally remove the repeat items
      $rootScope.$apply("val0 = []");

      // Somehow this ngRepeat scope knows how to destroy itself...
      expect($rootScope.$$childHead).toBeNull();
      // expect(ngRepeatScope.$$destroyed).toEqual(true);
      // expect(ngIf1Scope.$$destroyed).toEqual(true);
      // expect(ngIf2Scope.$$destroyed).toEqual(true);
    });

    it("should throw error if unterminated", () => {
      module.directive("foo", () => ({
        multiElement: true,
      }));
      initInjector("test1");
      expect(() => {
        element = $compile("<div><span foo-start></span></div>");
      }).toThrowError(/uterdir/);
    });

    it("should correctly collect ranges on multiple directives on a single element", () => {
      module
        .directive("emptyDirective", () => ({
          multiElement: true,
          link(scope, element) {
            element.data("x", "abc");
          },
        }))
        .directive("rangeDirective", () => ({
          multiElement: true,
          link(scope) {
            scope.x = "X";
            scope.y = "Y";
          },
        }));
      initInjector("test1");
      element = $compile(
        "<div>" +
          "<div range-directive-start empty-directive>{{x}}</div>" +
          "<div range-directive-end>{{y}}</div>" +
          "</div>",
      )($rootScope);

      expect(element.text()).toBe("XY");
      ///expect(angular.element(element[0].firstChild).data("x")).toBe("abc");
    });

    it("should throw error if unterminated (containing termination as a child)", () => {
      module.directive("foo", () => ({
        multiElement: true,
      }));
      initInjector("test1");
      expect(() => {
        element = $compile(
          "<div><span foo-start><span foo-end></span></span></div>",
        );
      }).toThrowError(/uterdir/);
    });

    it("should support data- prefix", async () => {
      $rootScope.show = false;
      element = $compile(
        "<div>" +
          '<span data-ng-show-start="show"></span>' +
          "<span data-ng-show-end></span>" +
          '<span ng-show-start="show"></span>' +
          "<span ng-show-end></span>" +
          "</div>",
      )($rootScope);
      await wait(100);
      const spans = element.find("span");
      expect(spans.eq(0)[0].classList.contains("ng-hide")).toBeTrue();
      //expect(spans.eq(1)[0].classList.contains("ng-hide")).toBeTrue();
      expect(spans.eq(2)[0].classList.contains("ng-hide")).toBeTrue();
      // expect(spans.eq(3)[0].classList.contains("ng-hide")).toBeTrue();
    });
  });

  // TODO ANIMATIONS
  // describe("$animate animation hooks", () => {
  //   beforeEach(module("ngAnimateMock"));

  //   it("should automatically fire the addClass and removeClass animation hooks", () => {
  //     let data;
  //     const element = JQLite('<div class="{{val1}} {{val2}} fire"></div>');
  //     $compile(element)($rootScope);

  //     ;

  //     expect(element[0].classList.contains("fire")).toBe(true);

  //     $rootScope.val1 = "ice";
  //     $rootScope.val2 = "rice";
  //     ;

  //     data = $animate.queue.shift();
  //     expect(data.event).toBe("addClass");
  //     expect(data.args[1]).toBe("ice rice");

  //     expect(element[0].classList.contains("ice")).toBe(true);
  //     expect(element[0].classList.contains("rice")).toBe(true);
  //     expect(element[0].classList.contains("fire")).toBe(true);

  //     $rootScope.val2 = "dice";
  //     ;

  //     data = $animate.queue.shift();
  //     expect(data.event).toBe("addClass");
  //     expect(data.args[1]).toBe("dice");

  //     data = $animate.queue.shift();
  //     expect(data.event).toBe("removeClass");
  //     expect(data.args[1]).toBe("rice");

  //     expect(element[0].classList.contains("ice")).toBe(true);
  //     expect(element[0].classList.contains("dice")).toBe(true);
  //     expect(element[0].classList.contains("fire")).toBe(true);

  //     $rootScope.val1 = "";
  //     $rootScope.val2 = "";
  //     ;

  //     data = $animate.queue.shift();
  //     expect(data.event).toBe("removeClass");
  //     expect(data.args[1]).toBe("ice dice");

  //     expect(element[0].classList.contains("ice")).toBe(false);
  //     expect(element[0].classList.contains("dice")).toBe(false);
  //     expect(element[0].classList.contains(ist.contains("fire")).toBe(true);
  //   });
  // });

  describe("element replacement", () => {
    it("should broadcast $destroy only on removed elements, not replaced", () => {
      const linkCalls = [];
      const destroyCalls = [];

      module
        .directive("replace", () => ({
          multiElement: true,
          replace: true,
          templateUrl: "template123",
        }))
        .directive("foo", () => ({
          priority: 1, // before the replace directive
          link($scope, $element, $attrs) {
            linkCalls.push($attrs.foo);
            $element.on("$destroy", () => {
              destroyCalls.push($attrs.foo);
            });
          },
        }));
      initInjector("test1");
      $templateCache.set("template123", "<p></p>");

      $compile(
        '<div replace-start foo="1"><span foo="1.1"></span></div>' +
          '<div foo="2"><span foo="2.1"></span></div>' +
          '<div replace-end foo="3"><span foo="3.1"></span></div>',
      )($rootScope);

      expect(linkCalls).toEqual(["2", "3"]);
      expect(destroyCalls).toEqual([]);
      $rootScope.$apply();
      expect(linkCalls).toEqual(["2", "3", "1"]);
      expect(destroyCalls).toEqual(["2", "3"]);
    });

    function sliceArgs(args, startIndex) {
      return [].slice.call(args, startIndex || 0);
    }

    function getAll($root) {
      // check for .querySelectorAll to support comment nodes
      return [$root[0]].concat(
        $root[0].querySelectorAll
          ? sliceArgs($root[0].querySelectorAll("*"))
          : [],
      );
    }

    function testCompileLinkDataCleanup(template) {
      const toCompile = JQLite(template);

      const preCompiledChildren = getAll(toCompile);
      forEach(preCompiledChildren, (element, i) => {
        getOrSetCacheData(element, "foo", `template#${i}`);
      });

      const linkedElements = $compile(toCompile)($rootScope);
      $rootScope.$apply();
      linkedElements.remove();

      forEach(preCompiledChildren, (element, i) => {
        expect(CACHE.has(element[EXPANDO])).toBe(false, `template#${i}`);
      });
      forEach(getAll(linkedElements), (element, i) => {
        expect(CACHE.has(element[EXPANDO])).toBe(false, `linked#${i}`);
      });
    }

    it("should clean data of element-transcluded link-cloned elements", () => {
      testCompileLinkDataCleanup(
        '<div><div ng-repeat-start="i in [1,2]"><span></span></div><div ng-repeat-end></div></div>',
      );
    });

    it("should clean data of element-transcluded elements", () => {
      testCompileLinkDataCleanup(
        '<div ng-if-start="false"><span><span/></div><span></span><div ng-if-end><span></span></div>',
      );
    });

    function testReplaceElementCleanup(dirOptions) {
      const template = "<div></div>";
      module.directive("theDir", () => ({
        multiElement: true,
        replace: dirOptions.replace,
        transclude: dirOptions.transclude,
        template: dirOptions.asyncTemplate ? undefined : template,
        templateUrl: dirOptions.asyncTemplate
          ? "the-dir-template-url"
          : undefined,
      }));
      initInjector("test1");
      $templateCache.set("the-dir-template-url", template);

      testCompileLinkDataCleanup(
        "<div>" +
          "<div the-dir-start><span></span></div>" +
          "<div><span></span><span></span></div>" +
          "<div the-dir-end><span></span></div>" +
          "</div>",
      );
    }
    it("should clean data of elements removed for directive template", () => {
      testReplaceElementCleanup({});
    });
    it("should clean data of elements removed for directive templateUrl", () => {
      testReplaceElementCleanup({ asyncTemplate: true });
    });
    it("should clean data of elements transcluded into directive template", () => {
      testReplaceElementCleanup({ transclude: true });
    });
    it("should clean data of elements transcluded into directive templateUrl", () => {
      testReplaceElementCleanup({ transclude: true, asyncTemplate: true });
    });
    it("should clean data of elements replaced with directive template", () => {
      testReplaceElementCleanup({ replace: true });
    });
    it("should clean data of elements replaced with directive templateUrl", () => {
      testReplaceElementCleanup({ replace: true, asyncTemplate: true });
    });
  });

  describe("component helper", () => {
    it("should return the module", () => {
      const myModule = module;
      expect(myModule.component("myComponent", {})).toBe(myModule);
      expect(myModule.component({})).toBe(myModule);
    });

    it("should register a directive", () => {
      module.component("myComponent", {
        template: "<div>SUCCESS</div>",
        controller() {
          log.push("OK");
        },
      });
      initInjector("test1");
      element = $compile("<my-component></my-component>")($rootScope);
      expect(element.find("div").text()).toEqual("SUCCESS");
      expect(log[0]).toEqual("OK");
    });

    it("should register multiple directives when object passed as first parameter", () => {
      module.component({
        fooComponent: {
          template: "<div>FOO SUCCESS</div>",
          controller() {
            log.push("FOO:OK");
          },
        },
        barComponent: {
          template: "<div>BAR SUCCESS</div>",
          controller() {
            log.push("BAR:OK");
          },
        },
      });
      initInjector("test1");
      const fooElement = $compile("<foo-component></foo-component>")(
        $rootScope,
      );
      const barElement = $compile("<bar-component></bar-component>")(
        $rootScope,
      );

      expect(fooElement.find("div").text()).toEqual("FOO SUCCESS");
      expect(barElement.find("div").text()).toEqual("BAR SUCCESS");
      expect(log.join("")).toEqual("FOO:OKBAR:OK");
    });

    it("should register a directive via $compileProvider.component()", () => {
      module.component("myComponent", {
        template: "<div>SUCCESS</div>",
        controller() {
          log.push("OK");
        },
      });
      initInjector("test1");
      element = $compile("<my-component></my-component>")($rootScope);
      expect(element.find("div").text()).toEqual("SUCCESS");
      expect(log[0]).toEqual("OK");
    });

    it("should add additional annotations to directive factory", () => {
      const myModule = module.component("myComponent", {
        $canActivate: "canActivate",
        $routeConfig: "routeConfig",
        $customAnnotation: "XXX",
      });
      initInjector("test1");
      expect(myModule.invokeQueue.pop().pop()[1]).toEqual(
        jasmine.objectContaining({
          $canActivate: "canActivate",
          $routeConfig: "routeConfig",
          $customAnnotation: "XXX",
        }),
      );
    });

    it("should expose additional annotations on the directive definition object", () => {
      module.component("myComponent", {
        $canActivate: "canActivate",
        $routeConfig: "routeConfig",
        $customAnnotation: "XXX",
      });

      initInjector("test1");
      let myComponentDirective = injector.get("myComponentDirective");
      expect(myComponentDirective[0]).toEqual(
        jasmine.objectContaining({
          $canActivate: "canActivate",
          $routeConfig: "routeConfig",
          $customAnnotation: "XXX",
        }),
      );
    });

    it("should support custom annotations if the controller is named", () => {
      module.component("myComponent", {
        $customAnnotation: "XXX",
        controller: "SomeNamedController",
      });
      initInjector("test1");
      let myComponentDirective = injector.get("myComponentDirective");
      expect(myComponentDirective[0]).toEqual(
        jasmine.objectContaining({
          $customAnnotation: "XXX",
        }),
      );
    });

    it("should provide a new empty controller if none is specified", () => {
      module
        .component("myComponent1", { $customAnnotation1: "XXX" })
        .component("myComponent2", { $customAnnotation2: "YYY" });

      initInjector("test1");
      let myComponent1Directive = injector.get("myComponent1Directive");
      let myComponent2Directive = injector.get("myComponent2Directive");

      const ctrl1 = myComponent1Directive[0].controller;
      const ctrl2 = myComponent2Directive[0].controller;

      expect(ctrl1).not.toBe(ctrl2);
      expect(ctrl1.$customAnnotation1).toBe("XXX");
      expect(ctrl1.$customAnnotation2).toBeUndefined();
      expect(ctrl2.$customAnnotation1).toBeUndefined();
      expect(ctrl2.$customAnnotation2).toBe("YYY");
    });

    it("should return ddo with reasonable defaults", () => {
      module.component("myComponent", {});
      initInjector("test1");

      let myComponentDirective = injector.get("myComponentDirective");
      expect(myComponentDirective[0]).toEqual(
        jasmine.objectContaining({
          controller: jasmine.any(Function),
          controllerAs: "$ctrl",
          template: "",
          templateUrl: undefined,
          transclude: undefined,
          scope: {},
          bindToController: {},
          restrict: "E",
        }),
      );
    });

    it("should return ddo with assigned options", () => {
      function myCtrl() {}
      module.component("myComponent", {
        controller: myCtrl,
        controllerAs: "ctrl",
        template: "abc",
        templateUrl: "def.html",
        transclude: true,
        bindings: { abc: "=" },
      });
      initInjector("test1");
      let myComponentDirective = injector.get("myComponentDirective");

      expect(myComponentDirective[0]).toEqual(
        jasmine.objectContaining({
          controller: myCtrl,
          controllerAs: "ctrl",
          template: "abc",
          templateUrl: "def.html",
          transclude: true,
          scope: {},
          bindToController: { abc: "=" },
          restrict: "E",
        }),
      );
    });

    it("should allow passing injectable functions as template/templateUrl", () => {
      module
        .component("myComponent", {
          template($element, $attrs, myValue) {
            log.push(`template,${$element},${$attrs},${myValue}\n`);
          },
          templateUrl($element, $attrs, myValue) {
            log.push(`templateUrl,${$element},${$attrs},${myValue}\n`);
          },
        })
        .value("myValue", "blah");
      initInjector("test1");
      let myComponentDirective = injector.get("myComponentDirective");
      myComponentDirective[0].template("a", "b");
      myComponentDirective[0].templateUrl("c", "d");
      expect(log.join("")).toEqual("template,a,b,blah\ntemplateUrl,c,d,blah\n");
    });

    it("should allow passing injectable arrays as template/templateUrl", () => {
      module
        .component("myComponent", {
          template: [
            "$element",
            "$attrs",
            "myValue",
            function ($element, $attrs, myValue) {
              log.push(`template,${$element},${$attrs},${myValue}\n`);
            },
          ],
          templateUrl: [
            "$element",
            "$attrs",
            "myValue",
            function ($element, $attrs, myValue) {
              log.push(`templateUrl,${$element},${$attrs},${myValue}\n`);
            },
          ],
        })
        .value("myValue", "blah");
      initInjector("test1");
      let myComponentDirective = injector.get("myComponentDirective");
      myComponentDirective[0].template("a", "b");
      myComponentDirective[0].templateUrl("c", "d");
      expect(log.join("")).toEqual("template,a,b,blah\ntemplateUrl,c,d,blah\n");
    });

    it("should allow passing transclude as object", () => {
      module.component("myComponent", {
        transclude: {},
      });
      initInjector("test1");
      let myComponentDirective = injector.get("myComponentDirective");
      expect(myComponentDirective[0]).toEqual(
        jasmine.objectContaining({
          transclude: {},
        }),
      );
    });

    it("should give ctrl as syntax priority over controllerAs", () => {
      module.component("myComponent", {
        controller: "MyCtrl as vm",
      });
      initInjector("test1");
      let myComponentDirective = injector.get("myComponentDirective");
      expect(myComponentDirective[0]).toEqual(
        jasmine.objectContaining({
          controllerAs: "vm",
        }),
      );
    });
  });
});
