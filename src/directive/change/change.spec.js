import { createInjector } from "../../core/di/injector";
import { dealoc } from "../../shared/jqlite/jqlite.js";
import { Angular } from "../../loader";

describe("ngChange", () => {
  let injector;
  let el;

  beforeEach(() => {
    window.angular = new Angular();
    injector = createInjector(["ng"]);
  });

  afterEach(() => dealoc(el));

  it("should $eval expression after new value is set in the model", () => {
    injector.invoke(($compile, $rootScope) => {
      el = $compile(
        '<input type="text" ng-model="value" ng-change="change()" />',
      )($rootScope);

      $rootScope.change = jasmine.createSpy("change").and.callFake(() => {
        expect($rootScope.value).toBe("new value");
      });

      el[0].setAttribute("value", "new value");
      el[0].dispatchEvent(new Event("change"));

      expect($rootScope.change).toHaveBeenCalled();
    });
  });

  it("should not $eval the expression if changed from model", () => {
    injector.invoke(($compile, $rootScope) => {
      el = $compile(
        '<input type="text" ng-model="value" ng-change="change()" />',
      )($rootScope);

      $rootScope.change = jasmine.createSpy("change");
      $rootScope.$apply("value = true");

      expect($rootScope.change).not.toHaveBeenCalled();
    });
  });

  it("should $eval ngChange expression on checkbox", () => {
    injector.invoke(($compile, $rootScope) => {
      el = $compile(
        '<input type="checkbox" ng-model="foo" ng-change="changeFn()">',
      )($rootScope);

      $rootScope.changeFn = jasmine.createSpy("changeFn");
      expect($rootScope.changeFn).not.toHaveBeenCalled();

      el[0].dispatchEvent(new Event("change"));
      expect($rootScope.changeFn).toHaveBeenCalled();
    });
  });

  it("should be able to change the model and via that also update the view", () => {
    injector.invoke(($compile, $rootScope) => {
      el = $compile(
        '<input type="text" ng-model="value" ng-change="value=\'b\'" />',
      )($rootScope);

      el[0].setAttribute("value", "a");
      el[0].dispatchEvent(new Event("change"));
      expect(el.value).toBe("b");
    });
  });
});
