import { createInjector } from "../../core/di/injector";
import { Angular } from "../../loader";

describe("ngRef", () => {
  beforeEach(() => {
    jasmine.addMatchers({
      toEqualJq(util) {
        return {
          compare(actual, expected) {
            // Jquery <= 2.2 objects add a context property that is irrelevant for equality
            if (actual && actual.hasOwnProperty("context")) {
              delete actual.context;
            }

            if (expected && expected.hasOwnProperty("context")) {
              delete expected.context;
            }

            return {
              pass: util.equals(actual, expected),
            };
          },
        };
      },
    });
  });

  describe("on a component", () => {
    let myComponentController;
    let attributeDirectiveController;
    let $rootScope;
    let $compile;
    let injector;

    beforeEach(() => {
      window.angular = new Angular();
      window.angular
        .module("myModule", ["ng"])
        .decorator("$exceptionHandler", function () {
          return (exception, cause) => {
            throw new Error(exception.message);
          };
        });
      injector = createInjector([
        "myModule",
        ($compileProvider) => {
          $compileProvider.component("myComponent", {
            template: "foo",
            controller() {
              myComponentController = this;
            },
          });

          $compileProvider.directive("attributeDirective", () => ({
            restrict: "A",
            controller() {
              attributeDirectiveController = this;
            },
          }));
        },
      ]);

      $compile = injector.get("$compile");
      $rootScope = injector.get("$rootScope");
    });

    it("should bind in the current scope the controller of a component", () => {
      $rootScope.$ctrl = "undamaged";
      $compile('<my-component ng-ref="myComponentRef"></my-component>')(
        $rootScope,
      );
      expect($rootScope.$ctrl).toBe("undamaged");
      //expect($rootScope.myComponentRef).toBe(myComponentController);
    });

    //   it("should throw if the expression is not assignable", () => {
    //     expect(() => {
    //       $compile("<my-component ng-ref=\"'hello'\"></my-component>")(
    //         $rootScope,
    //       );
    //     }).toThrow(
    //       "ngRef",
    //       "nonassign",
    //       "Expression in ngRef=\"'hello'\" is non-assignable!",
    //     );
    //   });

    //   it("should work with non:normalized entity name", () => {
    //     $compile('<my:component ng-ref="myComponent1"></my:component>')(
    //       $rootScope,
    //     );
    //     expect($rootScope.myComponent1).toBe(myComponentController);
    //   });

    //   it("should work with data-non-normalized entity name", () => {
    //     $compile('<data-my-component ng-ref="myComponent2"></data-my-component>')(
    //       $rootScope,
    //     );
    //     expect($rootScope.myComponent2).toBe(myComponentController);
    //   });

    //   it("should work with x-non-normalized entity name", () => {
    //     $compile('<x-my-component ng-ref="myComponent3"></x-my-component>')(
    //       $rootScope,
    //     );
    //     expect($rootScope.myComponent3).toBe(myComponentController);
    //   });

    //   it("should work with data-non-normalized attribute name", () => {
    //     $compile('<my-component data-ng-ref="myComponent1"></my-component>')(
    //       $rootScope,
    //     );
    //     expect($rootScope.myComponent1).toBe(myComponentController);
    //   });

    //   it("should work with x-non-normalized attribute name", () => {
    //     $compile('<my-component ng-ref="myComponent2"></my-component>')(
    //       $rootScope,
    //     );
    //     expect($rootScope.myComponent2).toBe(myComponentController);
    //   });

    //   it("should not bind the controller of an attribute directive", () => {
    //     $compile(
    //       '<my-component attribute-directive-1 ng-ref="myComponentRef"></my-component>',
    //     )($rootScope);
    //     expect($rootScope.myComponentRef).toBe(myComponentController);
    //   });

    //   it("should not leak to parent scopes", () => {
    //     const template =
    //       '<div ng-if="true">' +
    //       '<my-component ng-ref="myComponent"></my-component>' +
    //       "</div>";
    //     $compile(template)($rootScope);
    //     expect($rootScope.myComponent).toBe(undefined);
    //   });

    //   it("should nullify the variable once the component is destroyed", () => {
    //     const template =
    //       '<div><my-component ng-ref="myComponent"></my-component></div>';

    //     const element = $compile(template)($rootScope);
    //     expect($rootScope.myComponent).toBe(myComponentController);

    //     const componentElement = element.children();
    //     const isolateScope = componentElement.isolateScope();
    //     componentElement.remove();
    //     isolateScope.$destroy();
    //     expect($rootScope.myComponent).toBe(null);
    //   });

    //   it("should be compatible with entering/leaving components", () => {
    //     const template = '<my-component ng-ref="myComponent"></my-component>';
    //     $rootScope.$ctrl = {};
    //     const parent = $compile("<div></div>")($rootScope);

    //     const leaving = $compile(template)($rootScope);
    //     const leavingController = myComponentController;

    //     $animate.enter(leaving, parent);
    //     expect($rootScope.myComponent).toBe(leavingController);

    //     const entering = $compile(template)($rootScope);
    //     const enteringController = myComponentController;

    //     $animate.enter(entering, parent);
    //     $animate.leave(leaving, parent);
    //     expect($rootScope.myComponent).toBe(enteringController);
    //   });

    //   it("should allow binding to a nested property", () => {
    //     $rootScope.obj = {};

    //     $compile('<my-component ng-ref="obj.myComponent"></my-component>')(
    //       $rootScope,
    //     );
    //     expect($rootScope.obj.myComponent).toBe(myComponentController);
    //   });
    // });

    // it("should bind the jqlite wrapped DOM element if there is no component", inject((
    //   $compile,
    //   $rootScope,
    // ) => {
    //   const el = $compile('<span ng-ref="mySpan">my text</span>')($rootScope);

    //   expect($rootScope.mySpan).toEqualJq(el);
    //   expect($rootScope.mySpan[0].textContent).toBe("my text");
    // }));

    // it("should nullify the expression value if the DOM element is destroyed", inject((
    //   $compile,
    //   $rootScope,
    // ) => {
    //   const element = $compile('<div><span ng-ref="mySpan">my text</span></div>')(
    //     $rootScope,
    //   );
    //   element.children().remove();
    //   expect($rootScope.mySpan).toBe(null);
    // }));

    // it("should bind the controller of an element directive", () => {
    //   let myDirectiveController;

    //   module(($compileProvider) => {
    //     $compileProvider.directive("myDirective", () => ({
    //       controller() {
    //         myDirectiveController = this;
    //       },
    //     }));
    //   });

    //   inject(($compile, $rootScope) => {
    //     $compile('<my-directive ng-ref="myDirective"></my-directive>')(
    //       $rootScope,
    //     );

    //     expect($rootScope.myDirective).toBe(myDirectiveController);
    //   });
    // });

    // describe("ngRefRead", () => {
    //   it('should bind the element instead of the controller of a component if ngRefRead="$element" is set', () => {
    //     module(($compileProvider) => {
    //       $compileProvider.component("myComponent", {
    //         template: "my text",
    //         controller() {},
    //       });
    //     });

    //     inject(($compile, $rootScope) => {
    //       const el = $compile(
    //         '<my-component ng-ref="myEl" ng-ref-read="$element"></my-component>',
    //       )($rootScope);
    //       expect($rootScope.myEl).toEqualJq(el);
    //       expect($rootScope.myEl[0].textContent).toBe("my text");
    //     });
    //   });

    //   it('should bind the element instead an element-directive controller if ngRefRead="$element" is set', () => {
    //     module(($compileProvider) => {
    //       $compileProvider.directive("myDirective", () => ({
    //         restrict: "E",
    //         template: "my text",
    //         controller() {},
    //       }));
    //     });

    //     inject(($compile, $rootScope) => {
    //       const el = $compile(
    //         '<my-directive ng-ref="myEl" ng-ref-read="$element"></my-directive>',
    //       )($rootScope);

    //       expect($rootScope.myEl).toEqualJq(el);
    //       expect($rootScope.myEl[0].textContent).toBe("my text");
    //     });
    //   });

    //   it('should bind an attribute-directive controller if ngRefRead="controllerName" is set', () => {
    //     let attrDirective1Controller;

    //     module(($compileProvider) => {
    //       $compileProvider.directive("elementDirective", () => ({
    //         restrict: "E",
    //         template: "my text",
    //         controller() {},
    //       }));

    //       $compileProvider.directive("attributeDirective1", () => ({
    //         restrict: "A",
    //         controller() {
    //           attrDirective1Controller = this;
    //         },
    //       }));

    //       $compileProvider.directive("attributeDirective2", () => ({
    //         restrict: "A",
    //         controller() {},
    //       }));
    //     });

    //     inject(($compile, $rootScope) => {
    //       const el = $compile(
    //         "<element-directive" +
    //           "attribute-directive-1" +
    //           "attribute-directive-2" +
    //           'ng-ref="myController"' +
    //           'ng-ref-read="$element"></element-directive>',
    //       )($rootScope);

    //       expect($rootScope.myController).toBe(attrDirective1Controller);
    //     });
    //   });

    //   it("should throw if no controller is found for the ngRefRead value", () => {
    //     module(($compileProvider) => {
    //       $compileProvider.directive("elementDirective", () => ({
    //         restrict: "E",
    //         template: "my text",
    //         controller() {},
    //       }));
    //     });

    //     inject(($compile, $rootScope) => {
    //       expect(() => {
    //         $compile(
    //           "<element-directive " +
    //             'ng-ref="myController"' +
    //             'ng-ref-read="attribute"></element-directive>',
    //         )($rootScope);
    //       }).toThrow(
    //         "ngRef",
    //         "noctrl",
    //         'The controller for ngRefRead="attribute" could not be found on ngRef="myController"',
    //       );
    //     });
    //   });
    // });

    // it("should bind the jqlite element if the controller is on an attribute-directive", () => {
    //   let myDirectiveController;

    //   module(($compileProvider) => {
    //     $compileProvider.directive("myDirective", () => ({
    //       restrict: "A",
    //       template: "my text",
    //       controller() {
    //         myDirectiveController = this;
    //       },
    //     }));
    //   });

    //   inject(($compile, $rootScope) => {
    //     const el = $compile('<div my-directive ng-ref="myEl"></div>')($rootScope);

    //     expect(myDirectiveController).toBeDefined();
    //     expect($rootScope.myEl).toEqualJq(el);
    //     expect($rootScope.myEl[0].textContent).toBe("my text");
    //   });
    // });

    // it("should bind the jqlite element if the controller is on an class-directive", () => {
    //   let myDirectiveController;

    //   module(($compileProvider) => {
    //     $compileProvider.directive("myDirective", () => ({
    //       restrict: "C",
    //       template: "my text",
    //       controller() {
    //         myDirectiveController = this;
    //       },
    //     }));
    //   });

    //   inject(($compile, $rootScope) => {
    //     const el = $compile('<div class="my-directive" ng-ref="myEl"></div>')(
    //       $rootScope,
    //     );

    //     expect(myDirectiveController).toBeDefined();
    //     expect($rootScope.myEl).toEqualJq(el);
    //     expect($rootScope.myEl[0].textContent).toBe("my text");
    //   });
    // });

    // describe("transclusion", () => {
    //   it("should work with simple transclusion", () => {
    //     module(($compileProvider) => {
    //       $compileProvider.component("myComponent", {
    //         transclude: true,
    //         template: "<ng-transclude></ng-transclude>",
    //         controller() {
    //           this.text = "SUCCESS";
    //         },
    //       });
    //     });

    //     inject(($compile, $rootScope) => {
    //       const template =
    //         '<my-component ng-ref="myComponent">{{myComponent.text}}</my-component>';
    //       const element = $compile(template)($rootScope);
    //       await wait();
    //       expect(element.text()).toBe("SUCCESS");
    //       dealoc(element);
    //     });
    //   });

    //   it("should be compatible with element transclude components", () => {
    //     module(($compileProvider) => {
    //       $compileProvider.component("myComponent", {
    //         transclude: "element",
    //         controller($animate, $element, $transclude) {
    //           this.text = "SUCCESS";
    //           this.$postLink = function () {
    //             $transclude((clone, newScope) => {
    //               $animate.enter(clone, $element.parent(), $element);
    //             });
    //           };
    //         },
    //       });
    //     });

    //     inject(($compile, $rootScope) => {
    //       const template =
    //         "<div>" +
    //         '<my-component ng-ref="myComponent">' +
    //         "{{myComponent.text}}" +
    //         "</my-component>" +
    //         "</div>";
    //       const element = $compile(template)($rootScope);
    //       await wait();
    //       expect(element.text()).toBe("SUCCESS");
    //       dealoc(element);
    //     });
    //   });

    //   it("should be compatible with ngIf and transclusion on same element", () => {
    //     module(($compileProvider) => {
    //       $compileProvider.component("myComponent", {
    //         template: "<ng-transclude></ng-transclude>",
    //         transclude: true,
    //         controller($scope) {
    //           this.text = "SUCCESS";
    //         },
    //       });
    //     });

    //     inject(($compile, $rootScope) => {
    //       const template =
    //         "<div>" +
    //         '<my-component ng-if="present" ng-ref="myComponent" >' +
    //         "{{myComponent.text}}" +
    //         "</my-component>" +
    //         "</div>";
    //       const element = $compile(template)($rootScope);

    //       $rootScope.$apply("present = false");
    //       expect(element.text()).toBe("");
    //       $rootScope.$apply("present = true");
    //       expect(element.text()).toBe("SUCCESS");
    //       $rootScope.$apply("present = false");
    //       expect(element.text()).toBe("");
    //       $rootScope.$apply("present = true");
    //       expect(element.text()).toBe("SUCCESS");
    //       dealoc(element);
    //     });
    //   });

    //   it("should be compatible with element transclude & destroy components", () => {
    //     let myComponentController;
    //     module(($compileProvider) => {
    //       $compileProvider.component("myTranscludingComponent", {
    //         transclude: "element",
    //         controller($animate, $element, $transclude) {
    //           myComponentController = this;

    //           let currentClone;
    //           let currentScope;
    //           this.transclude = function (text) {
    //             this.text = text;
    //             $transclude((clone, newScope) => {
    //               currentClone = clone;
    //               currentScope = newScope;
    //               $animate.enter(clone, $element.parent(), $element);
    //             });
    //           };
    //           this.destroy = function () {
    //             currentClone.remove();
    //             currentScope.$destroy();
    //           };
    //         },
    //       });
    //     });

    //     inject(($compile, $rootScope) => {
    //       const template =
    //         "<div>" +
    //         '<my-transcluding-component ng-ref="myComponent">' +
    //         "{{myComponent.text}}" +
    //         "</my-transcluding-component>" +
    //         "</div>";
    //       const element = $compile(template)($rootScope);
    //       await wait();
    //       expect(element.text()).toBe("");

    //       myComponentController.transclude("transcludedOk");
    //       await wait();
    //       expect(element.text()).toBe("transcludedOk");

    //       myComponentController.destroy();
    //       await wait();
    //       expect(element.text()).toBe("");
    //     });
    //   });

    //   it("should be compatible with element transclude directives", () => {
    //     module(($compileProvider) => {
    //       $compileProvider.directive("myDirective", ($animate) => ({
    //         transclude: "element",
    //         controller() {
    //           this.text = "SUCCESS";
    //         },
    //         link(scope, element, attrs, ctrl, $transclude) {
    //           $transclude((clone, newScope) => {
    //             $animate.enter(clone, element.parent(), element);
    //           });
    //         },
    //       }));
    //     });

    //     inject(($compile, $rootScope) => {
    //       const template =
    //         "<div>" +
    //         '<my-directive ng-ref="myDirective">' +
    //         "{{myDirective.text}}" +
    //         "</my-directive>" +
    //         "</div>";
    //       const element = $compile(template)($rootScope);
    //       await wait();
    //       expect(element.text()).toBe("SUCCESS");
    //       dealoc(element);
    //     });
    //   });
    // });

    // it("should work with components with templates via $http", () => {
    //   module(($compileProvider) => {
    //     $compileProvider.component("httpComponent", {
    //       templateUrl: "template.html",
    //       controller() {
    //         this.me = true;
    //       },
    //     });
    //   });

    //   inject(($compile, $httpBackend, $rootScope) => {
    //     const template =
    //       '<div><http-component ng-ref="controller"></http-component></div>';
    //     const element = $compile(template)($rootScope);
    //     $httpBackend.expect("GET", "template.html").respond("ok");
    //     await wait();
    //     expect($rootScope.controller).toBeUndefined();
    //     $httpBackend.flush();
    //     expect($rootScope.controller.me).toBe(true);
    //     dealoc(element);
    //   });
    // });

    // it("should work with ngRepeat-ed components", () => {
    //   const controllers = [];

    //   module(($compileProvider) => {
    //     $compileProvider.component("myComponent", {
    //       template: "foo",
    //       controller() {
    //         controllers.push(this);
    //       },
    //     });
    //   });

    //   inject(($compile, $rootScope) => {
    //     $rootScope.elements = [0, 1, 2, 3, 4];
    //     $rootScope.controllers = []; // Initialize the array because ngRepeat creates a child scope

    //     const template =
    //       '<div><my-component ng-repeat="(key, el) in elements" ng-ref="controllers[key]"></my-component></div>';
    //     const element = $compile(template)($rootScope);
    //     await wait();

    //     expect($rootScope.controllers).toEqual(controllers);

    //     $rootScope.$apply("elements = []");

    //     expect($rootScope.controllers).toEqual([null, null, null, null, null]);
    //   });
  });
});
