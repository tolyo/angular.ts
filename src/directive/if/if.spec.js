import { dealoc, JQLite } from "../../shared/jqlite/jqlite.js";
import { Angular } from "../../loader.js";
import { wait } from "../../shared/test-utils.js";

describe("ngIf", () => {
  describe("basic", () => {
    let $scope;
    let $compile;
    let element;
    let $compileProvider;
    let $rootScope;
    let injector;
    let angular;

    beforeEach(function () {
      angular = new Angular();
      window.angular = new Angular();
      window.angular.module("test", []);
      injector = window.angular.bootstrap(document.getElementById("dummy"), [
        "test",
        function (_$compileProvider_) {
          $compileProvider = _$compileProvider_;
        },
      ]);
      injector.invoke((_$rootScope_, _$compile_) => {
        $rootScope = _$rootScope_;
        $scope = $rootScope.$new();
        $compile = _$compile_;
        element = $compile("<div></div>")($scope);
      });
    });

    afterEach(() => {
      dealoc(element);
    });

    function makeIf() {
      Array.from(arguments).forEach((expr) => {
        let newElement = $compile(
          `<div class="my-class" ng-if="${expr}"><div>Hi</div></div>`,
        )($scope);
        element.append(newElement);
      });
    }

    it("should immediately remove the element if condition is falsy", async () => {
      makeIf("false", "undefined", "null", "NaN", "''", "0");
      await wait();
      expect(element.children().length).toBe(0);
    });

    it("should leave the element if condition is true", async () => {
      makeIf("true");
      await wait();
      expect(element.children().length).toBe(1);
    });

    it("should leave the element if the condition is a non-empty string", async () => {
      makeIf("'f'", "'0'", "'false'", "'no'", "'n'", "'[]'");
      await wait();
      expect(element.children().length).toBe(6);
    });

    it("should leave the element if the condition is an object", async () => {
      makeIf("[]", "{}");
      await wait();
      expect(element.children().length).toBe(2);
    });

    it("should react to changes on a property of an object", async () => {
      $scope.a = {
        b: true,
      };
      makeIf("a.b");
      await wait();
      expect(element.children().length).toBe(1);

      $scope.a.b = false;
      await wait();
      expect(element.children().length).toBe(0);
    });

    it("should react to changes on a property of a nested object", async () => {
      $scope.a = {
        b: {
          c: true,
        },
      };
      makeIf("a.b.c");
      await wait();
      expect(element.children().length).toBe(1);

      $scope.a.b.c = false;
      await wait();
      expect(element.children().length).toBe(0);

      $scope.a.b.c = true;
      await wait();
      expect(element.children().length).toBe(1);
    });

    it("should not add the element twice if the condition goes from true to true", async () => {
      $scope.hello = "true1";
      makeIf("hello");
      await wait();
      expect(element.children().length).toBe(1);
      $scope.$apply('hello = "true2"');
      await wait();
      expect(element.children().length).toBe(1);
    });

    it("should not recreate the element if the condition goes from true to true", async () => {
      $scope.hello = "true1";
      makeIf("hello");
      await wait();
      element.children().data("flag", true);
      $scope.$apply('hello = "true2"');
      await wait();
      expect(element.children().data("flag")).toBe(true);
    });

    it("should create then remove the element if condition changes", async () => {
      $scope.hello = true;
      makeIf("hello");
      await wait();
      expect(element.children().length).toBe(1);
      $scope.$apply("hello = false");
      await wait();
      expect(element.children().length).toBe(0);
    });

    it("should create a new scope every time the expression evaluates to true", async () => {
      $scope.$apply("value = true");
      await wait();
      element.append(
        $compile(
          '<div ng-if="value"><span ng-init="value=false"></span></div>',
        )($scope),
      );
      await wait();
      expect(element.children("div").length).toBe(1);
    });

    it("should destroy the child scope every time the expression evaluates to false", async () => {
      $scope.value = true;
      element.append($compile('<div ng-if="value"></div>')($scope));
      await wait();
      const childScope = $scope.$handler.$children[0];
      let destroyed = false;

      childScope.$on("$destroy", () => {
        destroyed = true;
      });

      $scope.value = false;

      await wait();

      expect(destroyed).toBe(true);
    });

    it("should play nice with other elements beside it", async () => {
      $scope.values = [1, 2, 3, 4];
      element.append(
        $compile(
          '<div ng-repeat="i in values"></div>' +
            '<div ng-if="values.length==4"></div>' +
            '<div ng-repeat="i in values"></div>',
        )($scope),
      );
      await wait();
      expect(element.children().length).toBe(9);

      $scope.$apply("values.splice(0,1)");
      await wait();
      expect(element.children().length).toBe(6);

      $scope.$apply("values.push(1)");
      await wait();
      expect(element.children().length).toBe(9);
    });

    it("should play nice with ngInclude on the same element", (done) => {
      element = JQLite(
        `<div><div ng-if="value=='first'" ng-include="'/mock/hello'"></div></div>`,
      );

      window.angular.module("myModule", []).run(($rootScope) => {
        $rootScope.value = "first";
      });
      injector = angular.bootstrap(element, ["myModule"]);

      setTimeout(() => {
        expect(element.textContent).toBe("Hello");
        done();
      }, 300);
    });

    it("should work with multiple elements", async () => {
      $scope.show = true;
      $scope.things = [1, 2, 3];
      element.append(
        $compile(
          "<div><div>before;</div>" +
            '<div ng-if-start="show">start;</div>' +
            '<div ng-repeat="thing in things">{{thing}};</div>' +
            "<div ng-if-end>end;</div>" +
            "<div>after;</div></div>",
        )($scope),
      );
      await wait();
      expect(element.textContent).toBe("before;start;1;2;3;end;after;");

      $scope.things.push(4);
      await wait();
      expect(element.textContent).toBe("before;start;1;2;3;4;end;after;");

      $scope.show = false;
      await wait();
      expect(element.textContent).toBe("before;after;");
    });

    it("should restore the element to its compiled state", async () => {
      $scope.value = true;
      makeIf("value");
      await wait();
      expect(element.children().length).toBe(1);
      element.children()[0].classList.remove("my-class");
      expect(element.children()[0].className).not.toContain("my-class");

      $scope.$apply("value = false");
      await wait();
      expect(element.children().length).toBe(0);

      $scope.$apply("value = true");
      await wait();
      expect(element.children().length).toBe(1);
      expect(element.children()[0].className).toContain("my-class");
    });

    it("should work when combined with an ASYNC template that loads after the first digest", async () => {
      $compileProvider.directive("test", () => ({
        templateUrl: "/public/test.html",
      }));
      element.append('<div ng-if="show" test></div>');
      $compile(element)($rootScope);
      $rootScope.show = true;
      await wait();
      expect(element.textContent).toBe("");
      await wait();
      expect(element.textContent).toBe("");

      await wait(100);
      expect(element.textContent).toBe("hello");

      $rootScope.show = false;
      await wait();
      expect(element.children().length).toBe(0);
      expect(element.textContent).toBe("");
    });

    it("should not trigger a digest when the element is removed", async () => {
      const spy = spyOn($rootScope, "$digest").and.callThrough();
      $scope.hello = true;
      makeIf("hello");
      await wait();
      expect(element.children().length).toBe(1);
      $scope.$apply("hello = false");
      await wait();
      spy.calls.reset();
      expect(element.children().length).toBe(0);
      expect(spy).not.toHaveBeenCalled();
    });

    describe("and transcludes", () => {
      it("should allow access to directive controller from children when used in a replace template", async () => {
        let controller;
        const { directive } = $compileProvider;
        directive("template", () => ({
          template: '<div ng-if="true"><span test></span></div>',
          replace: true,
          controller() {
            this.flag = true;
          },
        }));
        directive("test", () => ({
          require: "^template",
          link(scope, el, attr, ctrl) {
            controller = ctrl;
          },
        }));
        $compile("<div><div template></div></div>")($rootScope);
        await wait();
        await wait();
        expect(controller.flag).toBe(true);
      });

      it("should use the correct transcluded scope", async () => {
        $compileProvider.directive("iso", () => ({
          link(scope) {
            scope.val = "value in iso scope";
          },
          restrict: "E",
          transclude: true,
          template:
            '<div ng-if="true">val={{val}}-<div ng-transclude></div></div>',
          scope: {},
        }));
        $rootScope.val = "transcluded content";
        const element = $compile('<iso><span ng-bind="val"></span></iso>')(
          $rootScope,
        );
        await wait();
        expect(element.textContent.trim()).toEqual(
          "val=value in iso scope-transcluded content",
        );
      });
    });
  });
});
