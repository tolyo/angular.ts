import { Angular } from "../../loader";
import { createInjector } from "../../core/di/injector";
import { dealoc, JQLite } from "../../shared/jqlite/jqlite";

describe("ng-style", () => {
  let $scope;
  let $compile;
  let element;

  beforeEach(() => {
    window.angular = new Angular();
    window.angular.module("myModule", ["ng"]);
    var injector = createInjector(["myModule"]).invoke(
      ($rootScope, _$compile_) => {
        $scope = $rootScope.$new();
        $compile = _$compile_;
      },
    );
  });

  afterEach(() => {
    dealoc(element);
  });

  it("should set", () => {
    element = $compile("<div ng-style=\"{height: '40px'}\"></div>")($scope);
    expect(element[0].style.height).toEqual("40px");
  });

  it("should silently ignore undefined style", () => {
    element = $compile('<div ng-style="myStyle"></div>')($scope);
    expect(element[0].classList.contains("ng-exception")).toBeFalsy();
  });

  it("should not deep watch objects", () => {
    element = $compile('<div ng-style="{height: heightObj}"></div>')($scope);
    expect(parseInt(element[0].style.height + 0, 10)).toEqual(0); // height could be '' or '0px'
    $scope.heightObj = {
      toString() {
        return "40px";
      },
    };
    expect(element[0].style.height).toBe("40px");

    element[0].style.height = "10px";
    $scope.heightObj.otherProp = 123;
    expect(element[0].style.height).toBe("10px");
  });

  it("should support binding for object literals", () => {
    element = $compile('<div ng-style="{height: heightStr}"></div>')($scope);
    expect(parseInt(element[0].style.height + 0, 10)).toEqual(0); // height could be '' or '0px'
    $scope.$apply('heightStr = "40px"');
    expect(element[0].style.height).toBe("40px");

    $scope.$apply('heightStr = "100px"');
    expect(element[0].style.height).toBe("100px");
  });

  it("should support lazy one-time binding for object literals", () => {
    element = $compile('<div ng-style="::{height: heightStr}"></div>')($scope);
    expect(parseInt(element[0].style.height + 0, 10)).toEqual(0); // height could be '' or '0px'
    $scope.$apply('heightStr = "40px"');
    expect(element[0].style.height).toBe("40px");
  });

  describe("preserving styles set before and after compilation", () => {
    let scope;
    let preCompStyle;
    let preCompVal;
    let postCompStyle;
    let postCompVal;
    let element;

    beforeEach(() => {
      preCompStyle = "width";
      preCompVal = "300px";
      postCompStyle = "height";
      postCompVal = "100px";
      element = JQLite('<div ng-style="styleObj"></div>');
      element[0].style[preCompStyle] = preCompVal;
      JQLite(document.body).append(element);
      $compile(element)($scope);
      scope = $scope;
      scope.styleObj = { "margin-top": "44px" };
      scope.$apply();
      element[0].style[postCompStyle] = postCompVal;
    });

    afterEach(() => {
      element.remove();
    });

    it("should not mess up stuff after compilation", () => {
      element[0].style.margin = "44px";
      expect(element[0].style[preCompStyle]).toBe(preCompVal);
      expect(element[0].style["margin-top"]).toBe("44px");
      expect(element[0].style[postCompStyle]).toBe(postCompVal);
    });

    it("should not mess up stuff after $apply with no model changes", () => {
      element[0].style["padding-top"] = "33px";
      scope.$apply();
      expect(element[0].style[preCompStyle]).toBe(preCompVal);
      expect(element[0].style["margin-top"]).toBe("44px");
      expect(element[0].style[postCompStyle]).toBe(postCompVal);
      expect(element[0].style["padding-top"]).toBe("33px");
    });

    it("should not mess up stuff after $apply with non-colliding model changes", () => {
      scope.styleObj = { "padding-top": "99px" };
      scope.$apply();
      expect(element[0].style[preCompStyle]).toBe(preCompVal);
      expect(element[0].style["margin-top"]).not.toBe("44px");
      expect(element[0].style["padding-top"]).toBe("99px");
      expect(element[0].style[postCompStyle]).toBe(postCompVal);
    });

    it("should overwrite original styles after a colliding model change", () => {
      scope.styleObj = { height: "99px", width: "88px" };
      scope.$apply();
      expect(element[0].style[preCompStyle]).toBe("88px");
      expect(element[0].style[postCompStyle]).toBe("99px");
      scope.styleObj = {};
      scope.$apply();
      expect(element[0].style[preCompStyle]).not.toBe("88px");
      expect(element[0].style[postCompStyle]).not.toBe("99px");
    });

    it("should clear style when the new model is null", () => {
      scope.styleObj = { height: "99px", width: "88px" };
      scope.$apply();
      expect(element[0].style[preCompStyle]).toBe("88px");
      expect(element[0].style[postCompStyle]).toBe("99px");
      scope.styleObj = null;
      scope.$apply();
      expect(element[0].style[preCompStyle]).not.toBe("88px");
      expect(element[0].style[postCompStyle]).not.toBe("99px");
    });

    it("should clear style when the value is undefined or null", () => {
      scope.styleObj = { height: "99px", width: "88px" };
      scope.$apply();
      expect(element[0].style[preCompStyle]).toBe("88px");
      expect(element[0].style[postCompStyle]).toBe("99px");
      scope.styleObj = { height: undefined, width: null };
      scope.$apply();
      expect(element[0].style[preCompStyle]).not.toBe("88px");
      expect(element[0].style[postCompStyle]).not.toBe("99px");
    });

    it("should clear style when the value is false", () => {
      scope.styleObj = { height: "99px", width: "88px" };
      scope.$apply();
      expect(element[0].style[preCompStyle]).toBe("88px");
      expect(element[0].style[postCompStyle]).toBe("99px");
      scope.styleObj = { height: false, width: false };
      scope.$apply();
      expect(element[0].style[preCompStyle]).not.toBe("88px");
      expect(element[0].style[postCompStyle]).not.toBe("99px");
    });

    it("should set style when the value is zero", () => {
      scope.styleObj = { height: "99px", width: "88px" };
      scope.$apply();
      expect(element[0].style[preCompStyle]).toBe("88px");
      expect(element[0].style[postCompStyle]).toBe("99px");
      scope.styleObj = { height: 0, width: 0 };
      scope.$apply();
      expect(element[0].style[preCompStyle]).toBe("0px");
      expect(element[0].style[postCompStyle]).toBe("0px");
    });
  });
});
