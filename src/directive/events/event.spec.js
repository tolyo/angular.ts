import { Angular } from "../../loader";
import { createInjector } from "../../core/di/injector";
import { dealoc } from "../../shared/jqlite/jqlite";

describe("event directives", () => {
  let angular;
  let element;
  let injector;
  let $rootScope;
  let $compile;
  let logs = [];

  beforeEach(() => {
    angular = window.angular = new Angular();
    window.angular
      .module("myModule", ["ng"])
      .decorator("$exceptionHandler", function () {
        return (exception, cause) => {
          logs.push(exception.message);
        };
      });
    injector = createInjector(["myModule"]).invoke(
      (_$rootScope_, _$compile_) => {
        $rootScope = _$rootScope_;
        $compile = _$compile_;
      },
    );
  });

  afterEach(() => {
    dealoc(element);
    logs = [];
    document.getElementById("dummy").innerHTML = "";
  });

  describe("ngSubmit", () => {
    it("should get called on form submit", () => {
      element = $compile(
        '<form ng-submit="submitted = true">' +
          '<input type="submit" />' +
          "</form>",
      )($rootScope);
      // Support: Chrome 60+
      // We need to add the form to the DOM in order for `submit` events to be properly fired.
      document.getElementById("dummy").appendChild(element[0]);

      // prevent submit within the test harness
      element[0].addEventListener("submit", (e) => {
        e.preventDefault();
      });

      expect($rootScope.submitted).toBeUndefined();

      element[0].dispatchEvent(new Event("submit"));
      expect($rootScope.submitted).toEqual(true);
    });

    it("should expose event on form submit", () => {
      $rootScope.formSubmission = function (e) {
        if (e) {
          $rootScope.formSubmitted = "foo";
        }
      };

      element = $compile(
        '<form ng-submit="formSubmission($event)">' +
          '<input type="submit" />' +
          "</form>",
      )($rootScope);
      // Support: Chrome 60+ (on Windows)
      // We need to add the form to the DOM in order for `submit` events to be properly fired.
      document.getElementById("dummy").appendChild(element[0]);

      // prevent submit within the test harness
      element[0].addEventListener("submit", (e) => {
        e.preventDefault();
      });

      expect($rootScope.formSubmitted).toBeUndefined();

      element[0].dispatchEvent(new Event("submit"));
      expect($rootScope.formSubmitted).toEqual("foo");
    });
  });

  describe("focus", () => {
    describe("call the listener asynchronously during $apply", () => {
      it("should call the listener with non isolate scopes", () => {
        let scope = $rootScope.$new();
        element = $compile('<input type="text" ng-focus="focus()">')(scope);
        scope.focus = jasmine.createSpy("focus");

        scope.$apply(() => {
          element.triggerHandler("focus");
          expect(scope.focus).not.toHaveBeenCalled();
        });

        expect(scope.focus).toHaveBeenCalled();
      });

      it("should call the listener with isolate scopes", () => {
        let scope = $rootScope.$new(true);
        element = $compile('<input type="text" ng-focus="focus()">')(scope);
        scope.focus = jasmine.createSpy("focus");

        scope.$apply(() => {
          element.triggerHandler("focus");
          expect(scope.focus).not.toHaveBeenCalled();
        });
      });
    });

    it("should call the listener synchronously inside of $apply if outside of $apply", () => {
      element = $compile(
        '<input type="text" ng-focus="focus()" ng-model="value">',
      )($rootScope);
      $rootScope.focus = jasmine.createSpy("focus").and.callFake(() => {
        $rootScope.value = "newValue";
      });

      element.triggerHandler("focus");

      expect($rootScope.focus).toHaveBeenCalled();
      expect(element.val()).toBe("newValue");
    });
  });

  describe("DOM event object", () => {
    it("should allow access to the $event object", () => {
      const scope = $rootScope.$new();
      element = $compile('<button ng-click="e = $event">BTN</button>')(scope);
      element.triggerHandler("click");
      expect(scope.e.target).toBe(element[0]);
    });
  });

  describe("blur", () => {
    describe("call the listener asynchronously during $apply", () => {
      it("should call the listener with non isolate scopes", () => {
        const scope = $rootScope.$new();
        element = $compile('<input type="text" ng-blur="blur()">')(scope);
        scope.blur = jasmine.createSpy("blur");

        scope.$apply(() => {
          element.triggerHandler("blur");
          expect(scope.blur).not.toHaveBeenCalled();
        });

        expect(scope.blur).toHaveBeenCalled();
      });

      it("should call the listener with isolate scopes", () => {
        const scope = $rootScope.$new(true);
        element = $compile('<input type="text" ng-blur="blur()">')(scope);
        scope.blur = jasmine.createSpy("blur");

        scope.$apply(() => {
          element.triggerHandler("blur");
          expect(scope.blur).not.toHaveBeenCalled();
        });

        expect(scope.blur).toHaveBeenCalled();
      });
    });

    it("should call the listener synchronously inside of $apply if outside of $apply", () => {
      element = $compile(
        '<input type="text" ng-blur="blur()" ng-model="value">',
      )($rootScope);
      $rootScope.blur = jasmine.createSpy("blur").and.callFake(() => {
        $rootScope.value = "newValue";
      });

      element.triggerHandler("blur");

      expect($rootScope.blur).toHaveBeenCalled();
      expect(element.val()).toBe("newValue");
    });
  });

  it("should call the listener synchronously if the event is triggered inside of a digest", () => {
    let watchedVal;

    element = $compile(
      '<button type="button" ng-click="click()">Button</button>',
    )($rootScope);
    $rootScope.$watch("value", (newValue) => {
      watchedVal = newValue;
    });
    $rootScope.click = jasmine.createSpy("click").and.callFake(() => {
      $rootScope.value = "newValue";
    });

    $rootScope.$apply(() => {
      element.triggerHandler("click");
    });

    expect($rootScope.click).toHaveBeenCalled();
    expect(watchedVal).toEqual("newValue");
  });

  it("should call the listener synchronously if the event is triggered outside of a digest", () => {
    let watchedVal;

    element = $compile(
      '<button type="button" ng-click="click()">Button</button>',
    )($rootScope);
    $rootScope.$watch("value", (newValue) => {
      watchedVal = newValue;
    });
    $rootScope.click = jasmine.createSpy("click").and.callFake(() => {
      $rootScope.value = "newValue";
    });

    element.triggerHandler("click");

    expect($rootScope.click).toHaveBeenCalled();
    expect(watchedVal).toEqual("newValue");
  });

  describe("throwing errors in event handlers", () => {
    it("should not stop execution if the event is triggered outside a digest", () => {
      element = $compile('<button ng-click="click()">Click</button>')(
        $rootScope,
      );

      $rootScope.click = function () {
        throw new Error("listener error");
      };

      $rootScope.do = function () {
        element[0].click();
      };

      $rootScope.do();

      expect(logs).toEqual(["listener error"]);
    });

    it("should not stop execution if the event is triggered inside a digest", () => {
      element = $compile('<button ng-click="click()">Click</button>')(
        $rootScope,
      );

      $rootScope.click = function () {
        throw new Error("listener error");
      };

      $rootScope.do = function () {
        element.triggerHandler("click");
        logs.push("done");
      };

      $rootScope.$apply(() => {
        $rootScope.do();
      });

      expect(logs[0]).toEqual("listener error");
      expect(logs[1]).toEqual("done");
    });

    it("should not stop execution if the event is triggered in a watch expression function", () => {
      element = $compile('<button ng-click="click()">Click</button>')(
        $rootScope,
      );
      $rootScope.click = function () {
        throw new Error("listener error");
      };

      $rootScope.$watch(() => {
        element[0].click();
        logs.push("done");
      });

      expect(logs[0]).toEqual("listener error");
      expect(logs[1]).toEqual("done");
    });
  });
});
