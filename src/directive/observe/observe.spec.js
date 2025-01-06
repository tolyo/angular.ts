import { Angular } from "../../loader";
import { JQLite } from "../../shared/jqlite/jqlite.js";
import { wait } from "../../shared/test-utils.js";
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

  async function createDirective(attributeValue, updateProp) {
    const template = `<div ng-observe-${attributeValue}="${updateProp}"></div>`;
    element = $compile(template)($scope);
    await wait();
  }

  it("should set the scope property to the attribute value before any changes", () => {
    const scope = $rootScope.$new();
    const element = JQLite('<div ng-observe-sourceAttr="testProp"></div>');
    element.attr("sourceAttr", "initialValue");
    $compile(element)(scope);

    expect(scope.testProp).toBeDefined();
    expect(scope.testProp).toEqual("initialValue");
  });

  it("should observe attribute changes and update the scope property", async () => {
    $scope.myProp = "";
    createDirective("test-attribute", "myProp");

    const mutationObserverCallback =
      MutationObserver.calls.mostRecent().args[0];
    const mutationRecord = {
      target: element[0],
      attributeName: "test-attribute",
    };

    element.attr("test-attribute", "newValue");
    element[0].setAttribute("test-attribute", "newValue");

    mutationObserverCallback([mutationRecord]);
    await wait();
    expect($scope.myProp).toBe("newValue");
  });

  it("should not trigger digest cycle if the attribute value is unchanged", () => {
    $scope.myProp = "existingValue";
    createDirective("test-attribute", "myProp");
    const mutationObserverCallback =
      MutationObserver.calls.mostRecent().args[0];
    const mutationRecord = {
      target: element[0],
      attributeName: "test-attribute",
    };

    element.attr("test-attribute", "existingValue");
    element[0].setAttribute("test-attribute", "existingValue");

    mutationObserverCallback([mutationRecord]);

    expect($scope.myProp).toBe("existingValue");
  });

  it("should disconnect the observer on scope destruction", () => {
    createDirective("test-attribute", "myProp");

    $scope.$destroy();

    expect(observerSpy.disconnect).toHaveBeenCalled();
  });

  it("should observe attribute changes and update the same scope name if attribute definition is absent", async () => {
    $scope.testAttribute = "";
    const template = `<div ng-observe-test-attribute></div>`;
    element = $compile(template)($scope);
    await wait();

    const mutationObserverCallback =
      MutationObserver.calls.mostRecent().args[0];
    const mutationRecord = {
      target: element[0],
      attributeName: "test-attribute",
    };

    element.attr("test-attribute", "newValue");
    element[0].setAttribute("test-attribute", "newValue");

    mutationObserverCallback([mutationRecord]);
    await wait();
    expect($scope.testAttribute).toBe("newValue");
  });
});
