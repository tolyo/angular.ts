import { dealoc, JQLite } from "../../shared/jqlite/jqlite.js";
import { Angular } from "../../loader";
import { isObject } from "../../shared/utils";
import { isFunction } from "../../shared/utils";
import { createInjector } from "../di/injector";

describe("$animate", () => {
  describe("without animation", () => {
    let dummy = document.getElementById("dummy");
    let element;
    let $compile;
    let $rootElement;
    let $rootScope;
    let defaultModule;
    let injector;
    let $animate;

    beforeEach(() => {
      window.angular = new Angular();
      defaultModule = window.angular.module("defaultModule", ["ng"]);
      injector = window.angular.bootstrap(dummy, ["defaultModule"]);
      injector.invoke(
        (_$compile_, _$rootElement_, _$rootScope_, _$animate_) => {
          $compile = _$compile_;
          $rootScope = _$rootScope_;
          element = $compile("<div></div>")($rootScope);
          $rootElement = _$rootElement_;
          $animate = _$animate_;
        },
      );
    });

    it("should add element at the start of enter animation", () => {
      const child = $compile("<div></div>")($rootScope);
      expect(element[0].childNodes.length).toBe(0);
      $animate.enter(child, element);
      expect(element[0].childNodes.length).toBe(1);
    });

    it("should enter the element to the start of the parent container", () => {
      for (let i = 0; i < 5; i++) {
        element.append(JQLite(`<div> ${i}</div>`));
      }

      const child = JQLite("<div>first</div>");
      $animate.enter(child, element);

      expect(element.text()).toEqual("first 0 1 2 3 4");
    });

    it("should remove the element at the end of leave animation", () => {
      const child = $compile("<div></div>")($rootScope);
      element.append(child);
      expect(element[0].childNodes.length).toBe(1);
      $animate.leave(child);
      expect(element[0].childNodes.length).toBe(0);
    });

    it("should reorder the move animation", () => {
      const child1 = $compile("<div>1</div>")($rootScope);
      const child2 = $compile("<div>2</div>")($rootScope);
      element.append(child1);
      element.append(child2);
      expect(element.text()).toBe("12");
      $animate.move(child1, element, child2);
      expect(element.text()).toBe("21");
    });

    it("should apply styles instantly to the element", () => {
      $animate.animate(element, { color: "rgb(0, 0, 0)" });
      expect(element[0].style.color).toBe("rgb(0, 0, 0)");

      $animate.animate(
        element,
        { color: "rgb(255, 0, 0)" },
        { color: "rgb(0, 255, 0)" },
      );
      expect(element[0].style.color).toBe("rgb(0, 255, 0)");
    });

    it("should still perform DOM operations even if animations are disabled (post-digest)", () => {
      $animate.enabled(false);
      expect(element[0].classList.contains("ng-hide")).toBeFalse();
      $animate.addClass(element, "ng-hide");
      expect(element[0].classList.contains("ng-hide")).toBeTrue();
    });

    it("should run each method and return a promise", () => {
      const element = JQLite("<div></div>");
      const move = JQLite("<div></div>");
      const parent = JQLite(document.body);
      parent.append(move);

      expect($animate.enter(element, parent).then).toBeDefined();
      expect($animate.move(element, move).then).toBeDefined();
      expect($animate.addClass(element, "on").then).toBeDefined();
      expect($animate.removeClass(element, "off").then).toBeDefined();
      expect($animate.setClass(element, "on", "off").then).toBeDefined();
      expect($animate.leave(element).then).toBeDefined();
    });

    it("should provide the `enabled` and `cancel` methods", () => {
      expect($animate.enabled()).toBeUndefined();
      expect($animate.cancel({})).toBeUndefined();
    });

    it("should provide the `on` and `off` methods", () => {
      expect(isFunction($animate.on)).toBe(true);
      expect(isFunction($animate.off)).toBe(true);
    });

    it("should add and remove classes on SVG elements", () => {
      if (!window.SVGElement) return;
      const svg = JQLite("<svg><rect></rect></svg>");
      const rect = svg.children();
      $animate.enabled(false);
      expect(rect[0].classList.contains("ng-hide")).toBeFalse();
      $animate.addClass(rect, "ng-hide");
      expect(rect[0].classList.contains("ng-hide")).toBeTrue();
      $animate.removeClass(rect, "ng-hide");
      expect(rect[0].classList.contains("ng-hide")).toBeFalse();
    });

    it("should throw error on wrong selector", () => {
      createInjector([
        "ng",
        ($animateProvider) => {
          expect(() => {
            $animateProvider.register("abc", null);
          }).toThrowError(/notcsel/);
        },
      ]);
    });

    it("should register the animation and be available for lookup", () => {
      let provider;
      createInjector([
        "ng",
        ($animateProvider) => {
          provider = $animateProvider;
        },
      ]);
      // by using hasOwnProperty we know for sure that the lookup object is an empty object
      // instead of inheriting properties from its original prototype.
      expect(provider.$$registeredAnimations.hasOwnProperty).toBeFalsy();

      provider.register(".filter", () => {});
      expect(provider.$$registeredAnimations.filter).toBe(".filter-animation");
    });

    it("should apply and retain inline styles on the element that is animated", () => {
      const element = JQLite("<div></div>");
      const parent = JQLite("<div></div>");
      const other = JQLite("<div></div>");
      parent.append(other);
      $animate.enabled(true);

      $animate.enter(element, parent, null, {
        to: { color: "red" },
      });
      assertColor("red");

      $animate.move(element, null, other, {
        to: { color: "yellow" },
      });
      assertColor("yellow");

      $animate.addClass(element, "on", {
        to: { color: "green" },
      });
      assertColor("green");

      $animate.setClass(element, "off", "on", {
        to: { color: "black" },
      });
      assertColor("black");

      $animate.removeClass(element, "off", {
        to: { color: "blue" },
      });
      assertColor("blue");

      $animate.leave(element, {
        to: { color: "yellow" },
      });
      assertColor("yellow");

      function assertColor(color) {
        expect(element[0].style.color).toBe(color);
      }
    });

    it("should merge the from and to styles that are provided", () => {
      const element = JQLite("<div></div>");

      element[0].style.color = "red";
      $animate.addClass(element, "on", {
        from: { color: "green" },
        to: { borderColor: "purple" },
      });
      const { style } = element[0];
      expect(style.color).toBe("green");
      expect(style.borderColor).toBe("purple");
    });

    it("should avoid cancelling out add/remove when the element already contains the class", () => {
      const element = JQLite('<div class="ng-hide"></div>');

      $animate.addClass(element, "ng-hide");
      $animate.removeClass(element, "ng-hide");
      expect(element[0].classList.contains("ng-hide")).toBeFalse();
    });

    it("should avoid cancelling out remove/add if the element does not contain the class", () => {
      const element = JQLite("<div></div>");

      $animate.removeClass(element, "ng-hide");
      $animate.addClass(element, "ng-hide");
      expect(element[0].classList.contains("ng-hide")).toBeTrue();
    });

    ["enter", "move"].forEach((method) => {
      it('should accept an unwrapped "parent" element for the $prop event', () => {
        const element = JQLite("<div></div>");
        const parent = document.createElement("div");
        $rootElement.append(parent);

        $animate[method](element, parent);
        expect(element[0].parentNode).toBe(parent);
      });
    });

    ["enter", "move"].forEach((method) => {
      it('should accept an unwrapped "after" element for the $prop event', () => {
        const element = JQLite("<div></div>");
        const after = document.createElement("div");
        $rootElement.append(after);

        $animate[method](element, null, after);
        expect(element[0].previousSibling).toBe(after);
      });
    });

    [
      "enter",
      "move",
      "leave",
      "addClass",
      "removeClass",
      "setClass",
      "animate",
    ].forEach((event) => {
      it("$prop() should operate using a native DOM element", () => {
        const captureSpy = jasmine.createSpy();
        dealoc(dummy);
        window.angular = new Angular();
        defaultModule = window.angular
          .module("defaultModule", ["ng"])
          .value("$$animateQueue", {
            push: captureSpy,
          });
        injector = window.angular.bootstrap(dummy, ["defaultModule"]);
        injector.invoke(
          (_$compile_, _$rootElement_, _$rootScope_, _$animate_) => {
            $compile = _$compile_;
            $rootScope = _$rootScope_;
            $rootElement = _$rootElement_;
            $animate = _$animate_;
          },
        );

        element = JQLite("<div></div>");
        const parent2 = JQLite("<div></div>");
        const parent = $rootElement;
        parent.append(parent2);

        if (event !== "enter" && event !== "move") {
          parent.append(element);
        }

        let fn;
        const invalidOptions = function () {};

        switch (event) {
          case "enter":
          case "move":
            fn = function () {
              $animate[event](element, parent, parent2, invalidOptions);
            };
            break;

          case "addClass":
            fn = function () {
              $animate.addClass(element, "klass", invalidOptions);
            };
            break;

          case "removeClass":
            element.className = "klass";
            fn = function () {
              $animate.removeClass(element, "klass", invalidOptions);
            };
            break;

          case "setClass":
            element.className = "two";
            fn = function () {
              $animate.setClass(element, "one", "two", invalidOptions);
            };
            break;

          case "leave":
            fn = function () {
              $animate.leave(element, invalidOptions);
            };
            break;

          case "animate":
            const toStyles = { color: "red" };
            fn = function () {
              $animate.animate(element, {}, toStyles, "klass", invalidOptions);
            };
            break;
        }

        expect(() => {
          fn();
        }).not.toThrow();

        const optionsArg = captureSpy.calls.mostRecent().args[2];
        expect(optionsArg).not.toBe(invalidOptions);
        expect(isObject(optionsArg)).toBeTruthy();
      });
    });

    it("should not break postDigest for subsequent elements if addClass contains non-valid CSS class names", () => {
      const element1 = JQLite("<div></div>");
      const element2 = JQLite("<div></div>");

      $animate.enter(element1, $rootElement, null, { addClass: " " });
      $animate.enter(element2, $rootElement, null, { addClass: "valid-name" });
      expect(element2[0].classList.contains("valid-name")).toBeTruthy();
    });

    it("should not alter the provided options input in any way throughout the animation", () => {
      const element = JQLite("<div></div>");
      const parent = $rootElement;

      const initialOptions = {
        from: { height: "50px" },
        to: { width: "50px" },
        addClass: "one",
        removeClass: "two",
      };

      const copiedOptions = structuredClone(initialOptions);
      expect(copiedOptions).toEqual(initialOptions);

      const runner = $animate.enter(element, parent, null, copiedOptions);
      expect(copiedOptions).toEqual(initialOptions);

      expect(copiedOptions).toEqual(initialOptions);
    });

    describe("CSS class DOM manipulation", () => {
      let element;
      let addClass;
      let removeClass;

      afterEach(() => {
        dealoc(element);
      });

      it("should defer class manipulation until end of digest", () => {
        element = JQLite("<p>test</p>");

        $rootScope.$apply(() => {
          $animate.addClass(element, "test-class1");
          expect(element[0].classList.contains("test-class1")).toBeFalse();

          $animate.removeClass(element, "test-class1");

          $animate.addClass(element, "test-class2");
          expect(element[0].classList.contains("test-class2")).toBeFalse();

          $animate.setClass(element, "test-class3", "test-class4");
          expect(element[0].classList.contains("test-class3")).toBeFalse();
          expect(element[0].classList.contains("test-class4")).toBeFalse();
        });

        expect(element[0].classList.contains("test-class1")).toBeFalse();
        expect(element[0].classList.contains("test-class4")).toBeFalse();
        expect(element[0].classList.contains("test-class2")).toBeTrue();
        expect(element[0].classList.contains("test-class3")).toBeTrue();
      });

      it("should defer class manipulation until postDigest when outside of digest", () => {
        element = JQLite('<p class="test-class4">test</p>');

        $animate.addClass(element, "test-class1");
        $animate.removeClass(element, "test-class1");
        $animate.addClass(element, "test-class2");
        $animate.setClass(element, "test-class3", "test-class4");
        expect(element[0].classList.contains("test-class1")).toBeFalse();
        expect(element[0].classList.contains("test-class2")).toBeTrue();
        expect(element[0].classList.contains("test-class3")).toBeTrue();
      });

      it("should perform class manipulation in expected order at end of digest", () => {
        element = JQLite('<p class="test-class3">test</p>');

        $rootScope.$apply(() => {
          $animate.addClass(element, "test-class1");
          $animate.addClass(element, "test-class2");
          $animate.removeClass(element, "test-class1");
          $animate.removeClass(element, "test-class3");
          $animate.addClass(element, "test-class3");
        });
        expect(element[0].classList.contains("test-class3")).toBeTrue();
      });

      it("should return a promise which is resolved on a different turn", () => {
        element = JQLite('<p class="test2">test</p>');

        $animate.addClass(element, "test1");
        $animate.removeClass(element, "test2");

        element = JQLite('<p class="test4">test</p>');

        $rootScope.$apply(() => {
          $animate.addClass(element, "test3");
          $animate.removeClass(element, "test4");
        });

        expect(element[0].classList.contains("test3")).toBeTrue();
      });

      it("should defer class manipulation until end of digest for SVG", () => {
        if (!window.SVGElement) return;

        element = JQLite("<svg><g></g></svg>");
        const target = element.children().eq(0);

        $rootScope.$apply(() => {
          $animate.addClass(target, "test-class1");

          $animate.removeClass(target, "test-class1");

          $animate.addClass(target, "test-class2");
          expect(target[0].classList.contains("test-class2")).toBeFalse();

          $animate.setClass(target, "test-class3", "test-class4");
          expect(target[0].classList.contains("test-class3")).toBeFalse();
          expect(target[0].classList.contains("test-class4")).toBeFalse();
        });

        expect(target[0].classList.contains("test-class2")).toBeTrue();
      });

      it("should defer class manipulation until postDigest when outside of digest for SVG", () => {
        if (!window.SVGElement) return;

        element = JQLite('<svg><g class="test-class4"></g></svg>');
        const target = element.children().eq(0);
        $animate.addClass(target, "test-class1");
        $animate.removeClass(target, "test-class1");
        $animate.addClass(target, "test-class2");
        $animate.setClass(target, "test-class3", "test-class4");

        expect(target[0].classList.contains("test-class2")).toBeTrue();
        expect(target[0].classList.contains("test-class3")).toBeTrue();
      });

      it("should perform class manipulation in expected order at end of digest for SVG", () => {
        if (!window.SVGElement) return;
        element = JQLite('<svg><g class="test-class3"></g></svg>');
        const target = element.children().eq(0);

        $rootScope.$apply(() => {
          $animate.addClass(target, "test-class1");
          $animate.addClass(target, "test-class2");
          $animate.removeClass(target, "test-class1");
          $animate.removeClass(target, "test-class3");
          $animate.addClass(target, "test-class3");
        });
        expect(target[0].classList.contains("test-class3")).toBeTrue();
      });
    });
  });
});
