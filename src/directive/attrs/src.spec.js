import { Angular } from "../../loader";
import { createInjector } from "../../core/di/injector";
import { dealoc } from "../../shared/jqlite/jqlite";

describe("ngSrc", () => {
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

  describe("img[ng-src]", () => {
    it("should not result empty string in img src", () => {
      $scope.image = {};
      element = $compile('<img ng-src="{{image.url}}">')($scope);
      ;
      expect(element.attr("src")).not.toBe("");
      expect(element.attr("src")).toBeUndefined();
    });

    it("should sanitize interpolated url", () => {
      $scope.imageUrl = "javascript:alert(1);";
      element = $compile('<img ng-src="{{imageUrl}}">')($scope);
      ;
      expect(element.attr("src")).toBe("unsafe:javascript:alert(1);");
    });

    it("should sanitize non-interpolated url", () => {
      element = $compile('<img ng-src="javascript:alert(1);">')($scope);
      ;
      expect(element.attr("src")).toBe("unsafe:javascript:alert(1);");
    });

    it("should interpolate the expression and bind to src with raw same-domain value", () => {
      element = $compile('<img ng-src="{{id}}"></img>')($scope);

      ;
      expect(element.attr("src")).toBeUndefined();

      $scope.$apply(() => {
        $scope.id = "/somewhere/here";
      });
      expect(element.attr("src")).toEqual("/somewhere/here");
    });

    it("should interpolate a multi-part expression for img src attribute (which requires the MEDIA_URL context)", () => {
      element = $compile('<img ng-src="some/{{id}}"></img>')($scope);
      expect(element.attr("src")).toBe(undefined); // URL concatenations are all-or-nothing
      $scope.$apply(() => {
        $scope.id = 1;
      });
      expect(element.attr("src")).toEqual("some/1");
    });

    it("should work with `src` attribute on the same element", () => {
      $scope.imageUrl = "dynamic";
      element = $compile('<img ng-src="{{imageUrl}}" src="static">')($scope);
      expect(element.attr("src")).toBe("static");
      ;
      expect(element.attr("src")).toBe("dynamic");
      dealoc(element);

      element = $compile('<img src="static" ng-src="{{imageUrl}}">')($scope);
      expect(element.attr("src")).toBe("static");
      ;
      expect(element.attr("src")).toBe("dynamic");
    });
  });

  describe("iframe[ng-src]", () => {
    let $scope;
    let $compile;
    let element;
    let $sce;

    beforeEach(() => {
      window.angular = new Angular();
      window.angular.module("myModule", ["ng"]);
      createInjector(["myModule"]).invoke(($rootScope, _$compile_, _$sce_) => {
        $scope = $rootScope.$new();
        $compile = _$compile_;
        $sce = _$sce_;
      });
    });

    afterEach(() => {
      dealoc(element);
    });

    it("should pass through src attributes for the same domain", () => {
      element = $compile('<iframe ng-src="{{testUrl}}"></iframe>')($scope);
      $scope.testUrl = "different_page";
      $scope.$apply();
      expect(element.attr("src")).toEqual("different_page");
    });

    it("should error on src attributes for a different domain", () => {
      element = $compile('<iframe ng-src="{{testUrl}}"></iframe>')($scope);
      $scope.testUrl = "http://a.different.domain.example.com";
      $scope.$apply();
      expect($scope.$apply).toThrowError();
    });

    it("should error on JS src attributes", () => {
      element = $compile('<iframe ng-src="{{testUrl}}"></iframe>')($scope);
      $scope.testUrl = "javascript:alert(1);";
      expect($scope.$apply).toThrowError();
    });

    it("should error on non-resource_url src attributes", () => {
      element = $compile('<iframe ng-src="{{testUrl}}"></iframe>')($scope);
      $scope.testUrl = $sce.trustAsUrl("javascript:doTrustedStuff()");
      expect($scope.$apply).toThrowError();
    });

    it("should pass through $sce.trustAs() values in src attributes", () => {
      element = $compile('<iframe ng-src="{{testUrl}}"></iframe>')($scope);
      $scope.testUrl = $sce.trustAsResourceUrl("javascript:doTrustedStuff()");
      $scope.$apply();

      expect(element.attr("src")).toEqual("javascript:doTrustedStuff()");
    });

    it("should interpolate the expression and bind to src with a trusted value", () => {
      element = $compile('<iframe ng-src="{{id}}"></iframe>')($scope);

      ;
      expect(element.attr("src")).toBeUndefined();

      $scope.$apply(() => {
        $scope.id = $sce.trustAsResourceUrl("http://somewhere");
      });
      expect(element.attr("src")).toEqual("http://somewhere");
    });

    it("should NOT interpolate a multi-part expression in a `src` attribute that requires a non-MEDIA_URL context", () => {
      element = $compile('<iframe ng-src="some/{{id}}"></iframe>')($scope);
      $scope.id = 1;
      expect($scope.$apply).toThrowError();
    });

    it("should NOT interpolate a wrongly typed expression", () => {
      element = $compile('<iframe ng-src="{{id}}"></iframe>')($scope);
      $scope.id = $sce.trustAsUrl("http://somewhere");
      expect($scope.$apply).toThrowError();
    });
  });
});
