import { Angular } from "../../loader";
import { JQLite } from "../../shared/jqlite/jqlite";

describe("observe", () => {
  let $compile, $scope, $rootScope, element, observerSpy;

  beforeEach(() => {
    window.angular = new Angular();
    angular.module("myModule", ["ng"]);
    angular
      .bootstrap(document.getElementById("dummy"), ["myModule"])
      .invoke((_$compile_, _$rootScope_) => {
        $compile = _$compile_;
        $rootScope = _$rootScope_;
        $scope = $rootScope.$new();
      });

    observerSpy = jasmine.createSpyObj("MutationObserver", [
      "observe",
      "disconnect",
    ]);
    spyOn(window, "MutationObserver").and.returnValue(observerSpy); // Replace with a spy
  });

  function createDirective(attributeValue, updateProp) {
    const template = `<div ng-observe="${attributeValue}" data-update="${updateProp}"></div>`;
    element = $compile(template)($scope);
    ;
  }

  it("should set the scope property to the attribute value before any changes", () => {
    const scope = $rootScope.$new();
    const element = JQLite(
      '<div data-update="testProp" ng-observe="sourceAttr"></div>',
    );
    element.attr("sourceAttr", "initialValue");
    $compile(element)(scope);

    expect(scope.testProp).toBeDefined();
    expect(scope.testProp).toEqual("initialValue");
  });

  it("should observe attribute changes and update the scope property", () => {
    $scope.myProp = "";
    createDirective("test-attribute", "myProp");
    spyOn($scope, "$digest").and.callThrough();

    const mutationObserverCallback =
      MutationObserver.calls.mostRecent().args[0];
    const mutationRecord = {
      target: element[0],
      attributeName: "test-attribute",
    };

    element.attr("test-attribute", "newValue");
    element[0].setAttribute("test-attribute", "newValue");

    mutationObserverCallback([mutationRecord]);

    expect($scope.myProp).toBe("newValue");
    expect($scope.$digest).toHaveBeenCalled();
  });

  it("should not trigger digest cycle if the attribute value is unchanged", () => {
    $scope.myProp = "existingValue";
    createDirective("test-attribute", "myProp");

    spyOn($scope, "$digest").and.callThrough();

    const mutationObserverCallback =
      MutationObserver.calls.mostRecent().args[0];
    const mutationRecord = {
      target: element[0],
      attributeName: "test-attribute",
    };

    element.attr("test-attribute", "existingValue");
    element[0].setAttribute("test-attribute", "existingValue");

    mutationObserverCallback([mutationRecord]);

    expect($scope.$digest).not.toHaveBeenCalled();
  });

  it("should disconnect the observer on scope destruction", () => {
    createDirective("test-attribute", "myProp");

    $scope.$destroy();

    expect(observerSpy.disconnect).toHaveBeenCalled();
  });
});
