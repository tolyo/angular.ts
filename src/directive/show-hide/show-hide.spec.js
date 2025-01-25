import { Angular } from "../../loader";
import { createInjector } from "../../core/di/injector";
import { dealoc, JQLite } from "../../shared/jqlite/jqlite.js";
import { wait } from "../../shared/test-utils";

describe("ngShow / ngHide", () => {
  let $scope;
  let $compile;
  let element;

  beforeEach(() => {
    window.angular = new Angular();
    window.angular.module("myModule", ["ng"]);
    createInjector(["myModule"]).invoke(($rootScope, _$compile_) => {
      $scope = $rootScope.$new();
      $compile = _$compile_;
    });
  });

  afterEach(() => {
    dealoc(element);
  });

  describe("ngShow", () => {
    it("should show and hide an element", async () => {
      element = JQLite('<div ng-show="exp"></div>');
      element = $compile(element)($scope);
      await wait();
      expect(element.classList.contains("ng-hide")).toBeTrue();
      $scope.exp = true;
      await wait();
      expect(element.classList.contains("ng-hide")).toBeFalse();
    });

    // https://github.com/angular/angular.js/issues/5414
    it("should show if the expression is a function with a no arguments", async () => {
      element = JQLite('<div ng-show="exp"></div>');
      element = $compile(element)($scope);
      $scope.exp = function () {};
      await wait();
      expect(element.classList.contains("ng-hide")).toBeFalse();
    });

    it("should make hidden element visible", async () => {
      element = JQLite('<div class="ng-hide" ng-show="exp"></div>');
      element = $compile(element)($scope);
      await wait();
      expect(element.classList.contains("ng-hide")).toBeTrue();
      $scope.exp = true;
      await wait();
      expect(element.classList.contains("ng-hide")).toBeFalse();
    });

    ["false", "undefined", "null", "NaN", "''", "0"].forEach((x) => {
      it("should hide the element if condition is falsy: " + x, async () => {
        element = JQLite(`<div ng-show="${x}"></div>`);
        element = $compile(element)($scope);
        await wait();
        expect(element.classList.contains("ng-hide")).toBeTrue();
      });
    });

    ["'f'", "'0'", "'false'", "'no'", "'n'", "'[]'"].forEach((x) => {
      it(
        "should show the element if condition is a non-empty string: " + x,
        async () => {
          element = JQLite(`<div ng-show="${x}"></div>`);
          element = $compile(element)($scope);
          await wait();
          expect(element.classList.contains("ng-hide")).toBeFalse();
        },
      );
    });

    ["[]", "{}"].forEach((x) => {
      it(
        "should show the element if condition is an object: " + x,
        async () => {
          element = JQLite(`<div ng-show="${x}"></div>`);
          element = $compile(element)($scope);
          await wait();
          expect(element.classList.contains("ng-hide")).toBeFalse();
        },
      );
    });
  });

  describe("ngHide", () => {
    it("should hide an element", async () => {
      element = JQLite('<div ng-hide="exp"></div>');
      element = $compile(element)($scope);
      await wait();
      expect(element.classList.contains("ng-hide")).toBeFalse();
      $scope.exp = true;
      await wait();
      expect(element.classList.contains("ng-hide")).toBeTrue();
    });

    ["false", "undefined", "null", "NaN", "''", "0"].forEach((x) => {
      it("should show the element if condition is falsy: " + x, async () => {
        element = JQLite(`<div ng-hide="${x}"></div>`);
        element = $compile(element)($scope);
        await wait();
        expect(element.classList.contains("ng-hide")).toBeFalse();
      });
    });

    ["'f'", "'0'", "'false'", "'no'", "'n'", "'[]'"].forEach((x) => {
      it(
        "should hide the element if condition is a non-empty string " + x,
        async () => {
          element = JQLite(`<div ng-hide="${x}"></div>`);
          element = $compile(element)($scope);
          await wait();
          expect(element.classList.contains("ng-hide")).toBeTrue();
        },
      );
    });

    ["[]", "{}"].forEach((x) => {
      it("should hide the element if condition is an object " + x, async () => {
        element = JQLite(`<div ng-hide="${x}"></div>`);
        element = $compile(element)($scope);
        await wait();
        expect(element.classList.contains("ng-hide")).toBeTrue();
      });
    });
  });
});

// describe("ngShow / ngHide animations", () => {
//   let body;
//   let element;
//   let $rootElement;

//   function html(content) {
//     body.append($rootElement);
//     $rootElement.html(content);
//     element = $rootElement.children().eq(0);
//     return element;
//   }

//   beforeEach(() => {
//     // we need to run animation on attached elements;
//     body = JQLite(document.body);
//   });

//   afterEach(() => {
//     dealoc(body);
//     dealoc(element);
//     body[0].removeAttribute("ng-animation-running");
//   });

//   beforeEach(module("ngAnimateMock"));

//   beforeEach(
//     module(
//       ($animateProvider, $provide) =>
//         function (_$rootElement_) {
//           $rootElement = _$rootElement_;
//         },
//     ),
//   );

//   describe("ngShow", () => {
//     it("should fire off the $animate.show and $animate.hide animation", inject((
//       $compile,
//       $rootScope,
//       $animate,
//     ) => {
//       let item;
//       const $scope = $rootScope.$new();
//       $scope.on = true;
//       element = $compile(html('<div ng-show="on">data</div>'))($scope);
//       ;

//       item = $animate.queue.shift();
//       expect(item.event).toBe("removeClass");
//       expect(item.element.textContent).toBe("data");
//       expect(item.element).toBeShown();

//       $scope.on = false;
//       ;

//       item = $animate.queue.shift();
//       expect(item.event).toBe("addClass");
//       expect(item.element.textContent).toBe("data");
//       expect(item.element).toBeHidden();
//     }));

//     it("should apply the temporary `.ng-hide-animate` class to the element", inject((
//       $compile,
//       $rootScope,
//       $animate,
//     ) => {
//       let item;
//       const $scope = $rootScope.$new();
//       $scope.on = false;
//       element = $compile(
//         html('<div class="show-hide" ng-show="on">data</div>'),
//       )($scope);
//       ;

//       item = $animate.queue.shift();
//       expect(item.event).toEqual("addClass");
//       expect(item.options.tempClasses).toEqual("ng-hide-animate");

//       $scope.on = true;
//       ;
//       item = $animate.queue.shift();
//       expect(item.event).toEqual("removeClass");
//       expect(item.options.tempClasses).toEqual("ng-hide-animate");
//     }));
//   });

//   describe("ngHide", () => {
//     it("should fire off the $animate.show and $animate.hide animation", inject((
//       $compile,
//       $rootScope,
//       $animate,
//     ) => {
//       let item;
//       const $scope = $rootScope.$new();
//       $scope.off = true;
//       element = $compile(html('<div ng-hide="off">datum</div>'))($scope);
//       ;

//       item = $animate.queue.shift();
//       expect(item.event).toBe("addClass");
//       expect(item.element.textContent).toBe("datum");
//       expect(item.element).toBeHidden();

//       $scope.off = false;
//       ;

//       item = $animate.queue.shift();
//       expect(item.event).toBe("removeClass");
//       expect(item.element.textContent).toBe("datum");
//       expect(item.element).toBeShown();
//     }));

//     it("should apply the temporary `.ng-hide-animate` class to the element", inject((
//       $compile,
//       $rootScope,
//       $animate,
//     ) => {
//       let item;
//       const $scope = $rootScope.$new();
//       $scope.on = false;
//       element = $compile(
//         html('<div class="show-hide" ng-hide="on">data</div>'),
//       )($scope);
//       ;

//       item = $animate.queue.shift();
//       expect(item.event).toEqual("removeClass");
//       expect(item.options.tempClasses).toEqual("ng-hide-animate");

//       $scope.on = true;
//       ;
//       item = $animate.queue.shift();
//       expect(item.event).toEqual("addClass");
//       expect(item.options.tempClasses).toEqual("ng-hide-animate");
//     }));
//   });
// });
