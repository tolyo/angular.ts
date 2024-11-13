import { Angular } from "../../loader";
import { createInjector } from "../../core/di/injector";
import { dealoc } from "../../shared/jqlite/jqlite";

describe("validators", () => {
  let $rootScope;
  let $compile;
  let inputElm;

  beforeEach(() => {
    window.angular = new Angular();
    window.angular
      .module("myModule", ["ng"])
      .decorator("$exceptionHandler", function () {
        return (exception, cause) => {
          console.error(exception);
          throw new Error(exception);
        };
      });
    window.angular
      .bootstrap(document.getElementById("dummy"), ["myModule"])
      .invoke((_$compile_, _$rootScope_) => {
        $compile = _$compile_;
        $rootScope = _$rootScope_;
      });
  });

  afterEach(() => {
    dealoc(inputElm);
  });

  describe("pattern", () => {
    it("should validate in-lined pattern", () => {
      inputElm = $compile(
        '<input type="text" ng-model="value" ng-pattern="/^\\d\\d\\d-\\d\\d-\\d\\d\\d\\d$/" />',
      )($rootScope);

      inputElm[0].setAttribute("value", "x000-00-0000x");
      inputElm[0].dispatchEvent(new Event("change"));
      expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();

      inputElm[0].setAttribute("value", "000-00-0000");
      inputElm[0].dispatchEvent(new Event("change"));
      expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();

      inputElm[0].setAttribute("value", "000-00-0000x");
      inputElm[0].dispatchEvent(new Event("change"));
      expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();

      inputElm[0].setAttribute("value", "123-45-6789");
      inputElm[0].dispatchEvent(new Event("change"));
      expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();

      inputElm[0].setAttribute("value", "x");
      inputElm[0].dispatchEvent(new Event("change"));
      expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();
    });

    it("should listen on ng-pattern when pattern is changed", () => {
      const patternVal = /^\w+$/;
      inputElm = $compile(
        '<input type="text" ng-model="value" ng-pattern="pat" />',
      )($rootScope);

      $rootScope.pat = patternVal;
      await wait();
      expect(inputElm[0].getAttribute("ng-pattern")).toEqual("/^\\w+$/");
    });

    it("should validate in-lined pattern with modifiers", () => {
      inputElm = $compile(
        '<input type="text" ng-model="value" ng-pattern="/^abc?$/i" />',
      )($rootScope);

      inputElm[0].setAttribute("value", "aB");
      inputElm[0].dispatchEvent(new Event("change"));
      expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();

      inputElm[0].setAttribute("value", "xx");
      inputElm[0].dispatchEvent(new Event("change"));
      expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();
    });

    it("should validate pattern from scope", () => {
      $rootScope.regexp = /^\d\d\d-\d\d-\d\d\d\d$/;
      inputElm = $compile(
        '<input type="text" ng-model="value" ng-pattern="regexp" />',
      )($rootScope);

      inputElm[0].setAttribute("value", "x000-00-0000x");
      inputElm[0].dispatchEvent(new Event("change"));
      expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();

      inputElm[0].setAttribute("value", "000-00-0000");
      inputElm[0].dispatchEvent(new Event("change"));
      expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();

      inputElm[0].setAttribute("value", "000-00-0000x");
      inputElm[0].dispatchEvent(new Event("change"));
      expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();

      inputElm[0].setAttribute("value", "123-45-6789");
      inputElm[0].dispatchEvent(new Event("change"));
      expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();

      inputElm[0].setAttribute("value", "x");
      inputElm[0].dispatchEvent(new Event("change"));
      expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();

      $rootScope.$apply(() => {
        $rootScope.regexp = /abc?/;
      });

      inputElm[0].setAttribute("value", "ab");
      inputElm[0].dispatchEvent(new Event("change"));
      expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();

      inputElm[0].setAttribute("value", "xx");
      inputElm[0].dispatchEvent(new Event("change"));
      expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();
    });

    it("should perform validations when the ngPattern scope value changes", () => {
      $rootScope.regexp = /^[a-z]+$/;
      inputElm = $compile(
        '<input type="text" ng-model="value" ng-pattern="regexp" />',
      )($rootScope);

      inputElm[0].setAttribute("value", "abcdef");
      inputElm[0].dispatchEvent(new Event("change"));
      expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();

      inputElm[0].setAttribute("value", "123");
      inputElm[0].dispatchEvent(new Event("change"));
      expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();

      $rootScope.$apply(() => {
        $rootScope.regexp = /^\d+$/;
      });

      expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();

      inputElm[0].setAttribute("value", "abcdef");
      inputElm[0].dispatchEvent(new Event("change"));
      expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();

      $rootScope.$apply(() => {
        $rootScope.regexp = "";
      });

      expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
    });

    it('should register "pattern" with the model validations when the pattern attribute is used', () => {
      const formElm = $compile(
        '<form name="form"><input type="text" name="input" ng-model="value" pattern="^\\d+$" /></form>',
      )($rootScope);
      inputElm = formElm.find("input");

      inputElm[0].value = "abcd";
      inputElm[0].dispatchEvent(new Event("change"));
      await wait();
      expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();
      expect($rootScope.form.input.$error.pattern).toBe(true);

      inputElm[0].value = "12345";
      inputElm[0].dispatchEvent(new Event("change"));
      expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
      expect($rootScope.form.input.$error.pattern).not.toBe(true);
    });

    it("should not throw an error when scope pattern can't be found", () => {
      expect(() => {
        inputElm = $compile(
          '<input type="text" ng-model="foo" ng-pattern="fooRegexp" />',
        )($rootScope);
        $rootScope.$apply("foo = 'bar'");
      }).not.toThrow();
    });

    it("should throw an error when the scope pattern is not a regular expression", () => {
      expect(() => {
        inputElm = $compile(
          '<input type="text" ng-model="foo" ng-pattern="fooRegexp" />',
        )($rootScope);
        $rootScope.$apply(() => {
          $rootScope.fooRegexp = {};
          $rootScope.foo = "bar";
        });
      }).toThrowError(/Expected fooRegexp/);
    });

    it("should be invalid if entire string does not match pattern", () => {
      let formElm = $compile(
        '<form name="form"><input type="text" name="test" ng-model="value" pattern="\\d{4}"></form>',
      )($rootScope);
      inputElm = formElm.find("input");
      inputElm[0].setAttribute("value", "1234");
      inputElm[0].dispatchEvent(new Event("change"));
      expect($rootScope.form.test.$error.pattern).not.toBe(true);
      expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();

      inputElm[0].setAttribute("value", "123");
      inputElm[0].dispatchEvent(new Event("change"));
      expect($rootScope.form.test.$error.pattern).toBe(true);
      expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();

      inputElm[0].setAttribute("value", "12345");
      inputElm[0].dispatchEvent(new Event("change"));
      expect($rootScope.form.test.$error.pattern).toBe(true);
      expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();
    });

    it("should be cope with patterns that start with ^", () => {
      let formElm = $compile(
        '<form name="form"><input type="text" name="test" ng-model="value" pattern="^\\d{4}"></form>',
      )($rootScope);
      inputElm = formElm.find("input");
      inputElm[0].setAttribute("value", "1234");
      inputElm[0].dispatchEvent(new Event("change"));
      expect($rootScope.form.test.$error.pattern).not.toBe(true);
      expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();

      inputElm[0].setAttribute("value", "123");
      inputElm[0].dispatchEvent(new Event("change"));
      expect($rootScope.form.test.$error.pattern).toBe(true);
      expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();

      inputElm[0].setAttribute("value", "12345");
      inputElm[0].dispatchEvent(new Event("change"));
      expect($rootScope.form.test.$error.pattern).toBe(true);
      expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();
    });

    it("should be cope with patterns that end with $", () => {
      let formElm = $compile(
        '<form name="form"><input type="text" name="test" ng-model="value" pattern="\\d{4}$"></form>',
      )($rootScope);
      inputElm = formElm.find("input");
      inputElm[0].setAttribute("value", "1234");
      inputElm[0].dispatchEvent(new Event("change"));
      expect($rootScope.form.test.$error.pattern).not.toBe(true);
      expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();

      inputElm[0].setAttribute("value", "123");
      inputElm[0].dispatchEvent(new Event("change"));
      expect($rootScope.form.test.$error.pattern).toBe(true);
      expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();

      inputElm[0].setAttribute("value", "12345");
      inputElm[0].dispatchEvent(new Event("change"));
      expect($rootScope.form.test.$error.pattern).toBe(true);
      expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();
    });

    it("should validate the viewValue and not the modelValue", () => {
      let formElm = $compile(
        '<form name="form"><input type="text" name="test" ng-model="value" pattern="\\d{4}"></form>',
      )($rootScope);
      inputElm = formElm.find("input");
      const ctrl = inputElm.controller("ngModel");

      ctrl.$parsers.push((value) => `${value * 10}`);

      inputElm[0].setAttribute("value", "1234");
      inputElm[0].dispatchEvent(new Event("change"));
      expect($rootScope.form.test.$error.pattern).not.toBe(true);
      expect($rootScope.form.test.$modelValue).toBe("12340");
      expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
    });

    it("should validate on non-input elements", () => {
      $rootScope.pattern = "\\d{4}";
      const elm = $compile('<span ng-model="value" pattern="\\d{4}"></span>')(
        $rootScope,
      );
      const elmNg = $compile(
        '<span ng-model="value" ng-pattern="pattern"></span>',
      )($rootScope);
      const ctrl = elm.controller("ngModel");
      const ctrlNg = elmNg.controller("ngModel");

      expect(ctrl.$error.pattern).not.toBe(true);
      expect(ctrlNg.$error.pattern).not.toBe(true);

      ctrl.$setViewValue("12");
      ctrlNg.$setViewValue("12");

      expect(ctrl.$error.pattern).toBe(true);
      expect(ctrlNg.$error.pattern).toBe(true);
    });
  });

  describe("minlength", () => {
    it("should invalidate values that are shorter than the given minlength", () => {
      inputElm = $compile(
        '<input type="text" ng-model="value" ng-minlength="3" />',
      )($rootScope);

      inputElm[0].setAttribute("value", "aa");
      inputElm[0].dispatchEvent(new Event("change"));
      expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();

      inputElm[0].setAttribute("value", "aaa");
      inputElm[0].dispatchEvent(new Event("change"));
      expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
    });

    it("should observe the standard minlength attribute and register it as a validator on the model", () => {
      let formElm = $compile(
        '<form name="form"><input type="text" name="input" ng-model="value" minlength="{{ min }}" /></form>',
      )($rootScope);
      inputElm = formElm.find("input");
      $rootScope.$apply("min = 10");

      inputElm[0].setAttribute("value", "12345");
      inputElm[0].dispatchEvent(new Event("change"));
      expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();
      expect($rootScope.form.input.$error.minlength).toBe(true);

      $rootScope.$apply("min = 5");

      expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
      expect($rootScope.form.input.$error.minlength).not.toBe(true);
    });

    it("should validate when the model is initialized as a number", () => {
      $rootScope.value = 12345;
      let formElm = $compile(
        '<form name="form"><input type="text" name="input" ng-model="value" minlength="3" /></form>',
      )($rootScope);
      inputElm = formElm.find("input");
      expect($rootScope.value).toBe(12345);
      expect($rootScope.form.input.$error.minlength).toBeUndefined();
    });

    it("should validate emptiness against the viewValue", () => {
      inputElm = $compile(
        '<input type="text" name="input" ng-model="value" minlength="3" />',
      )($rootScope);

      const ctrl = inputElm.controller("ngModel");
      spyOn(ctrl, "$isEmpty").and.callThrough();

      ctrl.$parsers.push((value) => `${value}678`);

      inputElm[0].setAttribute("value", "12345");
      inputElm[0].dispatchEvent(new Event("change"));
      expect(ctrl.$isEmpty).toHaveBeenCalledWith("12345");
    });

    it("should validate on non-input elements", () => {
      $rootScope.min = 3;
      const elm = $compile(
        '<span ng-model="value" minlength="{{min}}"></span>',
      )($rootScope);
      const elmNg = $compile(
        '<span ng-model="value" ng-minlength="min"></span>',
      )($rootScope);
      const ctrl = elm.controller("ngModel");
      const ctrlNg = elmNg.controller("ngModel");

      expect(ctrl.$error.minlength).not.toBe(true);
      expect(ctrlNg.$error.minlength).not.toBe(true);

      ctrl.$setViewValue("12");
      ctrlNg.$setViewValue("12");

      expect(ctrl.$error.minlength).toBe(true);
      expect(ctrlNg.$error.minlength).toBe(true);
    });
  });

  describe("maxlength", () => {
    it("should invalidate values that are longer than the given maxlength", () => {
      inputElm = $compile(
        '<input type="text" ng-model="value" ng-maxlength="5" />',
      )($rootScope);

      inputElm[0].setAttribute("value", "aaaaaaaa");
      inputElm[0].dispatchEvent(new Event("change"));
      expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();

      inputElm[0].setAttribute("value", "aaa");
      inputElm[0].dispatchEvent(new Event("change"));
      expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
    });

    it("should only accept empty values when maxlength is 0", () => {
      inputElm = $compile(
        '<input type="text" ng-model="value" ng-maxlength="0" />',
      )($rootScope);

      inputElm[0].setAttribute("value", "");
      inputElm[0].dispatchEvent(new Event("change"));
      expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();

      inputElm[0].setAttribute("value", "a");
      inputElm[0].dispatchEvent(new Event("change"));
      expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();
    });

    it("should accept values of any length when maxlength is negative", () => {
      inputElm = $compile(
        '<input type="text" ng-model="value" ng-maxlength="-1" />',
      )($rootScope);

      inputElm[0].setAttribute("value", "");
      inputElm[0].dispatchEvent(new Event("change"));
      expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();

      inputElm[0].setAttribute("value", "aaaaaaaaaa");
      inputElm[0].dispatchEvent(new Event("change"));
      expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
    });

    it("should accept values of any length when maxlength is non-numeric", () => {
      inputElm = $compile(
        '<input type="text" ng-model="value" ng-maxlength="maxlength" />',
      )($rootScope);
      inputElm[0].setAttribute("value", "aaaaaaaaaa");
      inputElm[0].dispatchEvent(new Event("change"));

      $rootScope.$apply('maxlength = "5"');
      expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();

      $rootScope.$apply('maxlength = "abc"');
      expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();

      $rootScope.$apply('maxlength = ""');
      expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();

      $rootScope.$apply("maxlength = null");
      expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();

      $rootScope.someObj = {};
      $rootScope.$apply("maxlength = someObj");
      expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
    });

    it("should observe the standard maxlength attribute and register it as a validator on the model", () => {
      let formElm = $compile(
        '<form name="form"><input type="text" name="input" ng-model="value" maxlength="{{ max }}" /></form>',
      )($rootScope);
      inputElm = formElm.find("input");
      $rootScope.$apply("max = 1");

      inputElm[0].setAttribute("value", "12345");
      inputElm[0].dispatchEvent(new Event("change"));
      expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();
      expect($rootScope.form.input.$error.maxlength).toBe(true);

      $rootScope.$apply("max = 6");

      expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
      expect($rootScope.form.input.$error.maxlength).not.toBe(true);
    });

    it("should assign the correct model after an observed validator became valid", () => {
      inputElm = $compile(
        '<input type="text" name="input" ng-model="value" maxlength="{{ max }}" />',
      )($rootScope);

      $rootScope.$apply("max = 1");
      inputElm[0].setAttribute("value", "12345");
      inputElm[0].dispatchEvent(new Event("change"));
      expect($rootScope.value).toBeUndefined();

      $rootScope.$apply("max = 6");
      expect($rootScope.value).toBe("12345");
    });

    it("should assign the correct model after an observed validator became invalid", () => {
      inputElm = $compile(
        '<input type="text" name="input" ng-model="value" maxlength="{{ max }}" />',
      )($rootScope);

      $rootScope.$apply("max = 6");
      inputElm[0].setAttribute("value", "12345");
      inputElm[0].dispatchEvent(new Event("change"));
      expect($rootScope.value).toBe("12345");

      $rootScope.$apply("max = 1");
      expect($rootScope.value).toBeUndefined();
    });

    it("should leave the value as invalid if observed maxlength changed, but is still invalid", () => {
      let formElm = $compile(
        '<form name="form"><input type="text" name="input" ng-model="value" maxlength="{{ max }}" /></form>',
      )($rootScope);
      inputElm = formElm.find("input");
      $rootScope.$apply("max = 1");

      inputElm[0].setAttribute("value", "12345");
      inputElm[0].dispatchEvent(new Event("change"));
      expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();
      expect($rootScope.form.input.$error.maxlength).toBe(true);
      expect($rootScope.value).toBeUndefined();

      $rootScope.$apply("max = 3");

      expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();
      expect($rootScope.form.input.$error.maxlength).toBe(true);
      expect($rootScope.value).toBeUndefined();
    });

    it("should not notify if observed maxlength changed, but is still invalid", () => {
      inputElm = $compile(
        '<input type="text" name="input" ng-model="value" ng-change="ngChangeSpy()" ' +
          'maxlength="{{ max }}" />',
      )($rootScope);

      $rootScope.$apply("max = 1");
      inputElm[0].setAttribute("value", "12345");
      inputElm[0].dispatchEvent(new Event("change"));

      $rootScope.ngChangeSpy = jasmine.createSpy();
      $rootScope.$apply("max = 3");

      expect($rootScope.ngChangeSpy).not.toHaveBeenCalled();
    });

    it("should leave the model untouched when validating before model initialization", () => {
      $rootScope.value = "12345";
      inputElm = $compile(
        '<input type="text" name="input" ng-model="value" minlength="3" />',
      )($rootScope);
      expect($rootScope.value).toBe("12345");
    });

    it("should validate when the model is initialized as a number", () => {
      $rootScope.value = 12345;
      $compile(
        '<form name="form"><input type="text" name="input" ng-model="value" maxlength="10" /></form>',
      )($rootScope);

      expect($rootScope.value).toBe(12345);
      expect($rootScope.form.input.$error.maxlength).toBeUndefined();
    });

    it("should validate emptiness against the viewValue", () => {
      inputElm = $compile(
        '<input type="text" name="input" ng-model="value" maxlength="10" />',
      )($rootScope);

      const ctrl = inputElm.controller("ngModel");
      spyOn(ctrl, "$isEmpty").and.callThrough();

      ctrl.$parsers.push((value) => `${value}678`);

      inputElm[0].setAttribute("value", "12345");
      inputElm[0].dispatchEvent(new Event("change"));
      expect(ctrl.$isEmpty).toHaveBeenCalledWith("12345");
    });

    it("should validate on non-input elements", () => {
      $rootScope.max = 3;
      const elm = $compile(
        '<span ng-model="value" maxlength="{{max}}"></span>',
      )($rootScope);
      const elmNg = $compile(
        '<span ng-model="value" ng-maxlength="max"></span>',
      )($rootScope);
      const ctrl = elm.controller("ngModel");
      const ctrlNg = elmNg.controller("ngModel");

      expect(ctrl.$error.maxlength).not.toBe(true);
      expect(ctrlNg.$error.maxlength).not.toBe(true);

      ctrl.$setViewValue("1234");
      ctrlNg.$setViewValue("1234");

      expect(ctrl.$error.maxlength).toBe(true);
      expect(ctrlNg.$error.maxlength).toBe(true);
    });
  });

  describe("required", () => {
    it("should allow bindings via ngRequired", () => {
      inputElm = $compile(
        '<input type="text" ng-model="value" ng-required="required" />',
      )($rootScope);

      $rootScope.$apply("required = false");

      inputElm[0].setAttribute("value", "");
      inputElm[0].dispatchEvent(new Event("change"));
      expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();

      $rootScope.$apply("required = true");
      expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();

      $rootScope.$apply("value = 'some'");
      expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();

      inputElm[0].value = "";
      inputElm[0].dispatchEvent(new Event("change"));
      expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();

      $rootScope.$apply("required = false");
      expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
    });

    it("should invalid initial value with bound required", () => {
      inputElm = $compile(
        '<input type="text" ng-model="value" required="{{required}}" />',
      )($rootScope);

      $rootScope.$apply("required = true");

      expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();
    });

    it("should be $invalid but $pristine if not touched", () => {
      inputElm = $compile(
        '<input type="text" ng-model="name" name="alias" required />',
      )($rootScope);

      $rootScope.$apply("name = null");

      expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();
      expect(inputElm[0].classList.contains("ng-pristine")).toBeTrue();

      inputElm[0].setAttribute("value", "");
      inputElm[0].dispatchEvent(new Event("change"));
      expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();
      expect(inputElm[0].classList.contains("ng-dirty")).toBeTrue();
    });

    it("should allow empty string if not required", () => {
      inputElm = $compile('<input type="text" ng-model="foo" />')($rootScope);
      inputElm[0].setAttribute("value", "a");
      inputElm[0].dispatchEvent(new Event("change"));
      inputElm[0].setAttribute("value", "");
      inputElm[0].dispatchEvent(new Event("change"));
      expect($rootScope.foo).toBe("");
    });

    it("should set $invalid when model undefined", () => {
      inputElm = $compile(
        '<input type="text" ng-model="notDefined" required />',
      )($rootScope);
      expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();
    });

    it("should consider bad input as an error before any other errors are considered", () => {
      inputElm = $compile('<input type="text" ng-model="value" required />', {
        badInput: true,
      })($rootScope);
      const ctrl = inputElm.controller("ngModel");
      ctrl.$parsers.push(() => undefined);

      inputElm[0].setAttribute("value", "abc123");
      inputElm[0].dispatchEvent(new Event("change"));

      expect(ctrl.$error.parse).toBe(true);
      expect(inputElm[0].classList.contains("ng-invalid-parse")).toBeTrue();
      expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue(); // invalid because of the number validator
    });

    it('should allow `false` as a valid value when the input type is not "checkbox"', () => {
      inputElm = $compile(
        '<input type="radio" ng-value="true" ng-model="answer" required />' +
          '<input type="radio" ng-value="false" ng-model="answer" required />',
      )($rootScope);

      await wait();
      expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();

      $rootScope.$apply("answer = true");
      expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();

      $rootScope.$apply("answer = false");
      expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
    });

    it("should validate emptiness against the viewValue", () => {
      inputElm = $compile(
        '<input type="text" name="input" ng-model="value" required />',
      )($rootScope);

      const ctrl = inputElm.controller("ngModel");
      spyOn(ctrl, "$isEmpty").and.callThrough();

      ctrl.$parsers.push((value) => `${value}678`);

      inputElm[0].setAttribute("value", "12345");
      inputElm[0].dispatchEvent(new Event("change"));
      expect(ctrl.$isEmpty).toHaveBeenCalledWith("12345");
    });

    it("should validate on non-input elements", () => {
      $rootScope.value = "12";
      const elm = $compile('<span ng-model="value" required></span>')(
        $rootScope,
      );
      const elmNg = $compile(
        '<span ng-model="value" ng-required="true"></span>',
      )($rootScope);
      const ctrl = elm.controller("ngModel");
      const ctrlNg = elmNg.controller("ngModel");

      expect(ctrl.$error.required).not.toBe(true);
      expect(ctrlNg.$error.required).not.toBe(true);

      ctrl.$setViewValue("");
      ctrlNg.$setViewValue("");

      expect(ctrl.$error.required).toBe(true);
      expect(ctrlNg.$error.required).toBe(true);
    });

    it('should override "required" when ng-required="false" is set', () => {
      inputElm = $compile(
        '<input type="text" ng-model="notDefined" required ng-required="false" />',
      )($rootScope);

      expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
    });
  });
});
