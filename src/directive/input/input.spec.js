import { Angular } from "../../loader";
import { dealoc, JQLite } from "../../shared/jqlite/jqlite.js";
import { wait } from "../../shared/test-utils";
import { EMAIL_REGEXP, ISO_DATE_REGEXP, URL_REGEXP } from "./input";

describe("input", () => {
  let $compile;
  let scope;
  let inputElm;

  beforeEach(() => {
    window.angular = new Angular();
    window.angular
      .module("myModule", ["ng"])
      .decorator("$exceptionHandler", function () {
        return (exception) => {
          throw new Error(exception.message);
        };
      });
    window.angular
      .bootstrap(document.getElementById("dummy"), ["myModule"])
      .invoke((_$compile_, $rootScope) => {
        $compile = _$compile_;
        scope = $rootScope.$new();
      });
  });

  afterEach(() => {
    dealoc(inputElm);
  });

  it("should bind to a model", async () => {
    inputElm = $compile(
      '<input type="text" ng-model="name" name="alias" ng-change="change()" />',
    )(scope);

    scope.$apply("name = 'misko'");
    await wait();
    expect(inputElm.val()).toBe("misko");
  });

  it('should update the model on "blur" event', async () => {
    inputElm = $compile(
      '<input type="text" ng-model="name" name="alias" ng-change="change()" />',
    )(scope);
    await wait();
    inputElm[0].setAttribute("value", "adam");
    inputElm[0].dispatchEvent(new Event("change"));
    expect(scope.name).toEqual("adam");
  });

  it("should not add the property to the scope if name is unspecified", async () => {
    $compile('<input type="text" ng-model="name">')(scope);
    await wait();
    expect(scope.name).toBeUndefined();
  });

  it("should not set the `val` property when the value is equal to the current value", async () => {
    // This is a workaround for Firefox validation. Look at #12102.
    const input = JQLite('<input type="text" ng-model="foo" required/>');
    let setterCalls = 0;
    scope.foo = "";
    Object.defineProperty(input[0], "value", {
      get() {
        return "";
      },
      set() {
        setterCalls++;
      },
    });
    $compile(input)(scope);
    await wait();
    expect(setterCalls).toBe(0);
  });

  describe("compositionevents", () => {
    it('should not update the model between "compositionstart" and "compositionend"', async () => {
      //$sniffer.android = false;

      inputElm = $compile(
        '<input type="text" ng-model="name" name="alias"" />',
      )(scope);
      await wait();
      inputElm[0].setAttribute("value", "a");
      inputElm[0].dispatchEvent(new Event("change"));
      expect(scope.name).toEqual("a");

      inputElm[0].dispatchEvent(new Event("compositionstart"));
      inputElm[0].setAttribute("value", "adam");
      expect(scope.name).toEqual("a");
      inputElm[0].dispatchEvent(new Event("compositionend"));
      inputElm[0].setAttribute("value", "adam");
      expect(scope.name).toEqual("adam");
    });
  });

  describe("interpolated names", () => {
    it("should interpolate input names", async () => {
      scope.nameID = "47";
      inputElm = $compile(
        '<form name="form"><input type="text" ng-model="name" name="name{{nameID}}" /></form>',
      )(scope);
      await wait();
      expect(scope.form.name47.$pristine).toBeTruthy();
      inputElm.find("input")[0].setAttribute("value", "caitp");
      inputElm.find("input")[0].dispatchEvent(new Event("change"));
      expect(scope.form.name47.$dirty).toBeTruthy();
    });

    it("should rename form controls in form when interpolated name changes", async () => {
      scope.nameID = "A";
      inputElm = $compile(
        '<form name="form"><input type="text" ng-model="name" name="name{{nameID}}" /></form>',
      )(scope);
      await wait();
      expect(scope.form.nameA.$name).toBe("nameA");
      const oldModel = scope.form.nameA;
      scope.nameID = "B";
      await wait();
      expect(scope.form.nameA).toBeUndefined();
      expect(scope.form.nameB).toBe(oldModel);
      expect(scope.form.nameB.$name).toBe("nameB");
    });

    it("should rename form controls in null form when interpolated name changes", async () => {
      scope.nameID = "A";
      inputElm = $compile(
        '<input type="text" ng-model="name" name="name{{nameID}}" />',
      )(scope);
      await wait();
      const model = inputElm.controller("ngModel");
      expect(model.$name).toBe("nameA");

      scope.nameID = "B";
      await wait();
      expect(model.$name).toBe("nameB");
    });
  });

  describe('"change" event', () => {
    let assertBrowserSupportsChangeEvent;

    beforeEach(() => {
      assertBrowserSupportsChangeEvent = async function (inputEventSupported) {
        inputElm = $compile(
          '<input type="text" ng-model="name" name="alias" />',
        )(scope);
        await wait();
        //inputElm.val("mark");
        inputElm[0].setAttribute("value", "mark");
        inputElm[0].dispatchEvent(new Event("change"));
        expect(scope.name).toEqual("mark");
      };
    });

    it('should update the model event if the browser does not support the "input" event', () => {
      assertBrowserSupportsChangeEvent(false);
    });

    it(
      'should update the model event if the browser supports the "input" ' +
        "event so that form auto complete works",
      () => {
        assertBrowserSupportsChangeEvent(true);
      },
    );

    describe('"keydown", "paste", "cut" and "drop" events', () => {
      it('should update the model on "paste" event if the input value changes', async () => {
        inputElm = $compile(
          '<input type="text" ng-model="name" name="alias" ng-change="change()" />',
        )(scope);
        await wait();
        inputElm[0].dispatchEvent(new Event("keydown"));
        expect(inputElm[0].classList.contains("ng-pristine")).toBeTrue();

        inputElm[0].setAttribute("value", "mark");
        inputElm[0].dispatchEvent(new Event("paste"));
        expect(scope.name).toEqual("mark");
      });

      it('should update the model on "drop" event if the input value changes', async () => {
        inputElm = $compile(
          '<input type="text" ng-model="name" name="alias" ng-change="change()" />',
        )(scope);
        await wait();
        inputElm[0].dispatchEvent(new Event("keydown"));
        expect(inputElm[0].classList.contains("ng-pristine")).toBeTrue();

        inputElm[0].setAttribute("value", "mark");
        inputElm[0].dispatchEvent(new Event("drop"));
        expect(scope.name).toEqual("mark");
      });

      it('should update the model on "cut" event', async () => {
        inputElm = $compile(
          '<input type="text" ng-model="name" name="alias" ng-change="change()" />',
        )(scope);
        await wait();
        inputElm[0].setAttribute("value", "john");
        inputElm[0].dispatchEvent(new Event("cut"));
        expect(scope.name).toEqual("john");
      });

      it("should cancel the delayed dirty if a change occurs", async () => {
        inputElm = $compile('<input type="text" ng-model="name" />')(scope);
        await wait();
        const ctrl = inputElm.controller("ngModel");

        inputElm[0].dispatchEvent(
          new Event("keydown", { target: inputElm[0] }),
        );
        inputElm.val("f");
        inputElm[0].dispatchEvent(new Event("change"));
        expect(inputElm[0].classList.contains("ng-dirty")).toBeTrue();

        ctrl.$setPristine();
        await wait();

        expect(inputElm[0].classList.contains("ng-pristine")).toBeTrue();
      });

      describe("ngTrim", () => {
        it("should update the model and trim the value", async () => {
          inputElm = $compile(
            '<input type="text" ng-model="name" name="alias" ng-change="change()" />',
          )(scope);
          await wait();
          inputElm[0].setAttribute("value", "   a    ");
          inputElm[0].dispatchEvent(new Event("change"));
          expect(scope.name).toEqual("a");
        });

        it("should update the model and not trim the value", async () => {
          inputElm = $compile(
            '<input type="text" ng-model="name" name="alias" ng-trim="false" />',
          )(scope);
          await wait();
          inputElm[0].setAttribute("value", "  a  ");
          inputElm[0].dispatchEvent(new Event("change"));
          expect(scope.name).toEqual("  a  ");
        });
      });

      it("should allow complex reference binding", async () => {
        inputElm = $compile(
          '<input type="text" ng-model="obj[\'abc\'].name"/>',
        )(scope);
        scope.$apply("obj = { abc: { name: 'Misko'} }");
        await wait();
        expect(inputElm.val()).toEqual("Misko");
      });

      it("should ignore input without ngModel directive", async () => {
        inputElm = $compile('<input type="text" name="whatever" required />')(
          scope,
        );
        await wait();
        inputElm[0].setAttribute("value", "");
        inputElm[0].dispatchEvent(new Event("change"));
        expect(inputElm[0].classList.contains("ng-valid")).toBe(false);
        expect(inputElm[0].classList.contains("ng-invalid")).toBe(false);
        expect(inputElm[0].classList.contains("ng-pristine")).toBe(false);
        expect(inputElm[0].classList.contains("ng-dirty")).toBe(false);
      });

      it("should report error on assignment error", () => {
        expect(async () => {
          inputElm = $compile('<input type="text" ng-model="throw \'\'">')(
            scope,
          );
          await wait();
        }).toThrowError(/Syntax Error/);
      });

      it("should render as blank if null", async () => {
        inputElm = $compile('<input type="text" ng-model="age" />')(scope);
        await wait();
        scope.$apply("age = null");
        await wait();
        expect(scope.age).toBeNull();
        expect(inputElm.val()).toEqual("");
      });

      it("should render 0 even if it is a number", async () => {
        inputElm = $compile('<input type="text" ng-model="value" />')(scope);
        scope.$apply("value = 0");
        await wait();
        expect(inputElm.val()).toBe("0");
      });

      it("should render the $viewValue when $modelValue is empty", async () => {
        inputElm = $compile('<input type="text" ng-model="value" />')(scope);
        await wait();
        const ctrl = inputElm.controller("ngModel");

        ctrl.$modelValue = null;

        expect(ctrl.$isEmpty(ctrl.$modelValue)).toBe(true);

        ctrl.$viewValue = "abc";
        ctrl.$render();
        await wait();
        expect(inputElm.val()).toBe("abc");
      });
    });

    // INPUT TYPES
    describe("month", () => {
      // IN ANGULAR.JS month types were converted to Date object. This is not standard behavior
      it("should allow a String object in format 'YYYY-MM'", async () => {
        inputElm = $compile('<input type="month" ng-model="january"/>')(scope);
        await wait();
        scope.$apply(() => {
          scope.january = "2013-01";
        });
        await wait();
        expect(inputElm.val()).toBe("2013-01");
      });

      it("should throw if the model is a Date object", async () => {
        inputElm = $compile('<input type="month" ng-model="march"/>')(scope);
        await wait();
        expect(async () => {
          scope.$apply(() => {
            scope.march = new Date(2013, 2, 1);
          });
          await wait();
        }).toThrowError(/datefmt/);
      });

      it("should throw if the model is a Invalid string", () => {
        inputElm = $compile('<input type="month" ng-model="march"/>')(scope);

        expect(() => {
          scope.$apply(() => {
            scope.march = "fail";
          });
        }).toThrowError(/datefmt/);
      });

      it("should not change the model if the input is an invalid month string", () => {
        inputElm = $compile('<input type="month" ng-model="value"/>')(scope);

        scope.$apply(() => {
          scope.value = "2013-01";
        });

        expect(inputElm.val()).toBe("2013-01");

        inputElm[0].setAttribute("value", "stuff");
        inputElm[0].dispatchEvent(new Event("change"));
        expect(inputElm.val()).toBe("2013-01");
        expect(scope.value).toBe("2013-01");
      });

      it("should render as blank if null", async () => {
        inputElm = $compile('<input type="month" ng-model="test" />')(scope);

        scope.$apply("test = null");
        await wait();
        expect(scope.test).toBeNull();
        expect(inputElm.val()).toEqual("");
      });

      it("should come up blank when no value specified", async () => {
        inputElm = $compile('<input type="month" ng-model="test" />')(scope);
        await wait();
        expect(inputElm.val()).toBe("");

        scope.$apply("test = null");
        await wait();
        expect(scope.test).toBeNull();
        expect(inputElm.val()).toBe("");
      });

      it("should parse empty string to null", async () => {
        inputElm = $compile('<input type="month" ng-model="test" />')(scope);
        await wait();
        inputElm[0].setAttribute("value", "");
        inputElm[0].dispatchEvent(new Event("change"));
        expect(scope.test).toBeNull();
        expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
      });

      it("should set scope to a string value", async () => {
        inputElm = $compile('<input type="month" ng-model="value" />')(scope);
        await wait();
        inputElm[0].setAttribute("value", "2013-07");
        inputElm[0].dispatchEvent(new Event("change"));
        expect(scope.value).toBe("2013-07");
      });

      describe("min", () => {
        let inputElm;
        beforeEach(async () => {
          scope.minVal = "2013-01";
          inputElm = $compile(
            '<form name="form"><input type="month" ng-model="value" name="alias" min="{{ minVal }}" /></form>',
          )(scope);
          await wait();
        });

        it("should invalidate", () => {
          inputElm.find("input")[0].setAttribute("value", "2012-12");
          inputElm.find("input")[0].dispatchEvent(new Event("change"));
          expect(
            inputElm.find("input")[0].classList.contains("ng-invalid"),
          ).toBeTrue();
          expect(scope.value).toBeFalsy();
          expect(scope.form.alias.$error.min).toBeTruthy();
        });

        it("should validate", () => {
          inputElm.find("input")[0].setAttribute("value", "2013-07");
          inputElm.find("input")[0].dispatchEvent(new Event("change"));
          expect(
            inputElm.find("input")[0].classList.contains("ng-valid"),
          ).toBeTrue();
          expect(scope.value).toBe("2013-07");
          expect(scope.form.alias.$error.min).toBeFalsy();
        });

        it("should revalidate when the min value changes", async () => {
          inputElm.find("input")[0].setAttribute("value", "2013-07");
          expect(
            inputElm.find("input")[0].classList.contains("ng-valid"),
          ).toBeTrue();
          expect(scope.form.alias.$error.min).toBeFalsy();

          scope.$apply(() => {
            scope.minVal = "2014-01";
          });
          await wait();
          expect(
            inputElm.find("input")[0].classList.contains("ng-invalid"),
          ).toBeTrue();
          expect(scope.form.alias.$error.min).toBeTruthy();
        });

        it("should validate if min is empty", async () => {
          scope.minVal = undefined;
          scope.value = "2014-01";
          await wait();
          expect(scope.form.alias.$error.min).toBeFalsy();
        });
      });

      describe("max", () => {
        let inputElm;
        beforeEach(async () => {
          scope.maxVal = "2013-01";
          inputElm = $compile(
            '<form name="form"><input type="month" ng-model="value" name="alias" max="{{ maxVal }}" /></form>',
          )(scope);
          await wait();
        });

        it("should validate", () => {
          inputElm.find("input")[0].setAttribute("value", "2012-03");
          inputElm.find("input")[0].dispatchEvent(new Event("change"));
          expect(
            inputElm.find("input")[0].classList.contains("ng-valid"),
          ).toBeTrue();
          expect(scope.value).toBe("2012-03");
          expect(scope.form.alias.$error.max).toBeFalsy();
        });

        it("should invalidate", () => {
          inputElm.find("input")[0].setAttribute("value", "2013-05");
          inputElm.find("input")[0].dispatchEvent(new Event("change"));
          expect(
            inputElm.find("input")[0].classList.contains("ng-invalid"),
          ).toBeTrue();
          expect(scope.value).toBeUndefined();
          expect(scope.form.alias.$error.max).toBeTruthy();
        });

        it("should revalidate when the max value changes", async () => {
          inputElm.find("input")[0].setAttribute("value", "2012-07");
          inputElm.find("input")[0].dispatchEvent(new Event("change"));
          expect(
            inputElm.find("input")[0].classList.contains("ng-valid"),
          ).toBeTrue();
          expect(scope.form.alias.$error.max).toBeFalsy();

          scope.maxVal = "2012-01";
          await wait();
          expect(
            inputElm.find("input")[0].classList.contains("ng-invalid"),
          ).toBeTrue();
          expect(scope.form.alias.$error.max).toBeTruthy();
        });

        it("should validate if max is empty", async () => {
          scope.maxVal = undefined;
          scope.value = "2012-03";
          await wait();
          expect(scope.form.alias.$error.max).toBeFalsy();
        });
      });
    });

    describe("week", () => {
      it("should throw if model is a Date object", async () => {
        inputElm = $compile('<input type="week" ng-model="secondWeek"/>')(
          scope,
        );
        await wait();
        expect(async () => {
          scope.$apply(() => {
            scope.secondWeek = new Date(2013, 0, 11);
          });
          await wait();
        }).toThrowError(/datefmt/);
      });

      it("should set the view if the model is a valid String object", async () => {
        inputElm = $compile('<input type="week" ng-model="secondWeek"/>')(
          scope,
        );
        await wait();
        scope.$apply(() => {
          scope.secondWeek = "2013-W02";
        });
        await wait();
        expect(inputElm.val()).toBe("2013-W02");
      });

      it("should set scope to a string value", async () => {
        inputElm = $compile('<input type="week" ng-model="secondWeek" />')(
          scope,
        );
        await wait();
        scope.$apply(() => {
          scope.secondWeek = "2013-W02";
        });
        await wait();
        expect(scope.secondWeek).toBe("2013-W02");
        // input type week in Chrome does not react to changes on the attribute. Value must be set directly
        inputElm[0].value = "2014-W03";
        inputElm[0].dispatchEvent(new Event("change"));

        expect(scope.secondWeek).toBe("2014-W03");
      });

      it("should set the model undefined if the input is an invalid week string", async () => {
        inputElm = $compile('<input type="week" ng-model="secondWeek"/>')(
          scope,
        );
        await wait();
        scope.$apply(() => {
          scope.secondWeek = "2013-W02";
        });
        await wait();
        expect(inputElm.val()).toBe("2013-W02");

        // set to text for browsers with datetime-local validation.
        inputElm[0].value = "stuff";
        inputElm[0].dispatchEvent(new Event("change"));
        expect(inputElm.val()).toBe("");
        expect(scope.value).toBeUndefined();
      });

      it("should render as blank if null", async () => {
        inputElm = $compile('<input type="week" ng-model="test" />')(scope);
        await wait();
        scope.$apply("test = null");
        await wait();
        expect(scope.test).toBeNull();
        expect(inputElm.val()).toEqual("");
      });

      it("should come up blank when no value specified", async () => {
        inputElm = $compile('<input type="week" ng-model="test" />')(scope);
        await wait();
        expect(inputElm.val()).toBe("");

        scope.$apply("test = null");
        await wait();
        expect(scope.test).toBeNull();
        expect(inputElm.val()).toBe("");
      });

      it("should parse empty string to null", async () => {
        inputElm = $compile('<input type="week" ng-model="test" />')(scope);
        await wait();
        scope.$apply(() => {
          scope.test = "2013-W02";
        });
        await wait();
        inputElm[0].value = "";
        inputElm[0].dispatchEvent(new Event("change"));
        expect(scope.test).toBeNull();
      });

      describe("min", () => {
        let inputElm;
        beforeEach(async () => {
          scope.minVal = "2013-W01";
          inputElm = $compile(
            '<form name="form"><input type="week" ng-model="value" name="alias" min="{{ minVal }}" /></from>',
          )(scope);
          await wait();
        });

        it("should invalidate", () => {
          inputElm.find("input")[0].value = "2012-W12";
          inputElm.find("input")[0].dispatchEvent(new Event("change"));
          expect(scope.value).toBeFalsy();
          expect(scope.form.alias.$error.min).toBeTruthy();
        });

        it("should validate", () => {
          inputElm.find("input")[0].value = "2013-W03";
          inputElm.find("input")[0].dispatchEvent(new Event("change"));
          expect(
            inputElm.find("input")[0].classList.contains("ng-valid"),
          ).toBeTrue();
          expect(scope.value).toBe("2013-W03");
          expect(scope.form.alias.$error.min).toBeFalsy();
        });

        it("should revalidate when the min value changes", async () => {
          inputElm.find("input")[0].value = "2013-W03";
          inputElm.find("input")[0].dispatchEvent(new Event("change"));
          expect(
            inputElm.find("input")[0].classList.contains("ng-valid"),
          ).toBeTrue();
          expect(scope.form.alias.$error.min).toBeFalsy();

          scope.minVal = "2014-W01";
          await wait();
          expect(
            inputElm.find("input")[0].classList.contains("ng-invalid"),
          ).toBeTrue();
          expect(scope.form.alias.$error.min).toBeTruthy();
        });

        it("should validate if min is empty", async () => {
          scope.minVal = undefined;
          scope.value = "2013-W03";
          await wait();
          expect(scope.form.alias.$error.min).toBeFalsy();
        });
      });

      describe("max", () => {
        let inputElm;

        beforeEach(async () => {
          scope.maxVal = "2013-W01";
          inputElm = $compile(
            '<form name="form"><input type="week" ng-model="value" name="alias" max="{{ maxVal }}" /></form>',
          )(scope);
          await wait();
        });

        it("should validate", () => {
          inputElm.find("input")[0].value = "2012-W01";
          inputElm.find("input")[0].dispatchEvent(new Event("change"));
          expect(
            inputElm.find("input")[0].classList.contains("ng-valid"),
          ).toBeTrue();
          expect(scope.value).toBe("2012-W01");
          expect(scope.form.alias.$error.max).toBeFalsy();
        });

        it("should invalidate", () => {
          inputElm.find("input")[0].value = "2013-W03";
          inputElm.find("input")[0].dispatchEvent(new Event("change"));
          expect(
            inputElm.find("input")[0].classList.contains("ng-invalid"),
          ).toBeTrue();
          expect(scope.value).toBeUndefined();
          expect(scope.form.alias.$error.max).toBeTruthy();
        });

        it("should revalidate when the max value changes", async () => {
          inputElm.find("input")[0].value = "2012-W03";
          inputElm.find("input")[0].dispatchEvent(new Event("change"));
          expect(
            inputElm.find("input")[0].classList.contains("ng-valid"),
          ).toBeTrue();
          expect(scope.form.alias.$error.max).toBeFalsy();

          scope.maxVal = "2012-W01";
          await wait();
          expect(
            inputElm.find("input")[0].classList.contains("ng-invalid"),
          ).toBeTrue();
          expect(scope.form.alias.$error.max).toBeTruthy();
        });

        it("should validate if max is empty", async () => {
          scope.maxVal = undefined;
          scope.value = "2012-W01";
          await wait();
          expect(scope.form.alias.$error.max).toBeFalsy();
        });
      });
    });

    describe("datetime-local", () => {
      it("should throw if model is a Date object", async () => {
        inputElm = $compile(
          '<input type="datetime-local" ng-model="lunchtime"/>',
        )(scope);
        await wait();
        expect(async () => {
          scope.$apply(() => {
            scope.lunchtime = new Date(2013, 11, 31, 23, 59, 59, 500);
          });
          await wait();
        }).toThrowError(/datefmt/);
      });

      it("should set the view if the model if a valid String.", async () => {
        inputElm = $compile(
          '<input type="datetime-local" ng-model="halfSecondToNextYear"/>',
        )(scope);
        await wait();
        scope.$apply(() => {
          scope.halfSecondToNextYear = "2013-12-16T11:30";
        });
        await wait();
        expect(inputElm.val()).toBe("2013-12-16T11:30");
      });

      it("should bind to the model if a valid String.", async () => {
        inputElm = $compile(
          '<input type="datetime-local" ng-model="halfSecondToNextYear"/>',
        )(scope);
        await wait();
        inputElm[0].value = "2013-12-16T11:30";
        inputElm[0].dispatchEvent(new Event("change"));

        expect(inputElm.val()).toBe("2013-12-16T11:30");
        expect(scope.halfSecondToNextYear).toBe("2013-12-16T11:30");
      });

      it("should set the model null if the view is invalid", async () => {
        inputElm = $compile(
          '<input type="datetime-local" ng-model="breakMe"/>',
        )(scope);
        await wait();
        scope.$apply(() => {
          scope.breakMe = "2013-12-16T11:30";
        });
        await wait();
        expect(inputElm.val()).toBe("2013-12-16T11:30");

        // set to text for browsers with datetime-local validation.

        inputElm[0].value = "stuff";
        inputElm[0].dispatchEvent(new Event("change"));
        expect(inputElm.val()).toBe("");
        expect(scope.breakMe).toBeNull();
      });

      it("should render as blank if null", async () => {
        inputElm = $compile('<input type="datetime-local" ng-model="test" />')(
          scope,
        );
        await wait();
        scope.$apply("test = null");
        await wait();
        expect(scope.test).toBeNull();
        expect(inputElm.val()).toEqual("");
      });

      it("should come up blank when no value specified", async () => {
        inputElm = $compile('<input type="datetime-local" ng-model="test" />')(
          scope,
        );
        await wait();
        expect(inputElm.val()).toBe("");

        scope.$apply("test = null");
        await wait();
        expect(scope.test).toBeNull();
        expect(inputElm.val()).toBe("");
      });

      it("should parse empty string to null", async () => {
        inputElm = $compile('<input type="datetime-local" ng-model="test" />')(
          scope,
        );
        await wait();
        scope.$apply(() => {
          scope.test = "2013-12-16T11:30";
        });
        await wait();
        inputElm[0].value = "";
        inputElm[0].dispatchEvent(new Event("change"));
        expect(scope.test).toBeNull();
      });

      describe("min", () => {
        let inputElm;
        beforeEach(() => {
          scope.minVal = "2000-01-01T12:30:00";
          let formElm = $compile(
            `<form name="form">
              <input type="datetime-local" ng-model="value" name="alias" min="{{ minVal }}" />
            </form>`,
          )(scope);
          inputElm = formElm.find("input");
        });

        it("should invalidate", () => {
          inputElm[0].value = "1999-12-31T01:02:00";
          inputElm[0].dispatchEvent(new Event("change"));
          expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();
          expect(scope.value).toBeFalsy();
          expect(scope.form.alias.$error.min).toBeTruthy();
        });

        it("should validate", () => {
          inputElm[0].value = "2000-01-01T23:02:00";
          inputElm[0].dispatchEvent(new Event("change"));
          expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
          expect(scope.value).toBe("2000-01-01T23:02");
          expect(scope.form.alias.$error.min).toBeFalsy();
        });

        it("should revalidate when the min value changes", () => {
          inputElm[0].value = "2000-02-01T01:02:00";
          inputElm[0].dispatchEvent(new Event("change"));
          expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
          expect(scope.form.alias.$error.min).toBeFalsy();

          scope.minVal = "2010-01-01T01:02:00";
          expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();
          expect(scope.form.alias.$error.min).toBeTruthy();
        });

        it("should validate if min is empty", () => {
          scope.minVal = undefined;
          scope.value = "2010-01-01T01:02:00";
          expect(scope.form.alias.$error.min).toBeFalsy();
        });
      });

      describe("max", () => {
        let inputElm;
        beforeEach(() => {
          scope.maxVal = "2019-01-01T01:02:00";
          let formElm = $compile(
            '<form name="form"><input type="datetime-local" ng-model="value" name="alias" max="{{ maxVal }}" /></form>',
          )(scope);
          inputElm = formElm.find("input");
        });

        it("should invalidate", () => {
          inputElm[0].value = "2019-12-31T01:02:00";
          inputElm[0].dispatchEvent(new Event("change"));
          expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();
          expect(scope.value).toBeFalsy();
          expect(scope.form.alias.$error.max).toBeTruthy();
        });

        it("should validate", () => {
          inputElm[0].value = "2000-01-01T01:02:00";
          inputElm[0].dispatchEvent(new Event("change"));
          expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
          expect(scope.value).toBe("2000-01-01T01:02");
          expect(scope.form.alias.$error.max).toBeFalsy();
        });

        it("should revalidate when the max value changes", () => {
          inputElm[0].value = "2000-02-01T01:02:00";
          inputElm[0].dispatchEvent(new Event("change"));
          expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
          expect(scope.form.alias.$error.max).toBeFalsy();

          scope.maxVal = "2000-01-01T01:02:00";
          expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();
          expect(scope.form.alias.$error.max).toBeTruthy();
        });

        it("should validate if max is empty", () => {
          scope.maxVal = undefined;
          scope.value = "2000-01-01T01:02:00";
          expect(scope.form.alias.$error.max).toBeFalsy();
        });

        it("should validate when timezone is provided.", () => {
          inputElm = $compile(
            '<input type="datetime-local" ng-model="value" name="alias" ' +
              'max="{{ maxVal }}" ng-model-options="{timezone: \'UTC\', allowInvalid: true}"/>',
          )(scope);
          scope.maxVal = "2013-01-01T00:00:00";
          scope.value = "2012-01-01T00:00:00";
          expect(scope.form.alias.$error.max).toBeFalsy();
          expect(scope.form.alias.$valid).toBeTruthy();

          scope.value = "";
          inputElm[0].value = "2013-01-01T00:00:00";
          expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
          expect(scope.form.alias.$error.max).toBeFalsy();
          expect(scope.form.alias.$valid).toBeTruthy();
        });
      });

      it("should validate even if max value changes on-the-fly", () => {
        scope.max = "2013-01-01T01:02:00";
        inputElm = $compile(
          '<input type="datetime-local" ng-model="value" name="alias" max="{{max}}" />',
        )(scope);

        inputElm[0].value = "2014-01-01T12:34:00";
        expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();

        scope.max = "2001-01-01T01:02:00";
        expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();

        scope.max = "2024-01-01T01:02:00";
        expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
      });

      it("should validate even if min value changes on-the-fly", () => {
        scope.min = "2013-01-01T01:02:00";
        inputElm = $compile(
          '<input type="datetime-local" ng-model="value" name="alias" min="{{min}}" />',
        )(scope);

        inputElm[0].value = "2010-01-01T12:34:00";
        expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();

        scope.min = "2014-01-01T01:02:00";
        expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();

        scope.min = "2009-01-01T01:02:00";
        expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
      });

      it("should validate even if ng-max value changes on-the-fly", () => {
        scope.max = "2013-01-01T01:02:00";
        inputElm = $compile(
          '<input type="datetime-local" ng-model="value" name="alias" ng-max="max" />',
        )(scope);

        inputElm[0].value = "2014-01-01T12:34:00";
        expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();

        scope.max = "2001-01-01T01:02:00";
        expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();

        scope.max = "2024-01-01T01:02:00";
        expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
      });

      it("should validate even if ng-min value changes on-the-fly", () => {
        scope.min = "2013-01-01T01:02:00";
        inputElm = $compile(
          '<input type="datetime-local" ng-model="value" name="alias" ng-min="min" />',
        )(scope);

        inputElm[0].value = "2010-01-01T12:34:00";
        expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();

        scope.min = "2014-01-01T01:02:00";
        expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();

        scope.min = "2009-01-01T01:02:00";
        expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
      });
    });

    describe("time", () => {
      it("should throw if model is a Date object", () => {
        inputElm = $compile('<input type="time" ng-model="lunchtime"/>')(scope);
        expect(() => {
          scope.$apply(() => {
            scope.lunchtime = new Date(1970, 0, 1, 15, 41, 0, 500);
          });
        }).toThrowError(/datefmt/);
      });

      it("should set the view if the model is a valid String object.", () => {
        inputElm = $compile('<input type="time" ng-model="threeFortyOnePm"/>')(
          scope,
        );

        scope.$apply(() => {
          scope.threeFortyOnePm = "15:41:00.500";
        });

        expect(inputElm.val()).toBe("15:41:00.500");
      });

      it("should bind to mode if a valid String object.", () => {
        inputElm = $compile('<input type="time" ng-model="threeFortyOnePm"/>')(
          scope,
        );

        inputElm[0].value = "15:41:00.500";
        inputElm[0].dispatchEvent(new Event("change"));

        expect(inputElm.val()).toBe("15:41:00.500");
        expect(scope.threeFortyOnePm).toBe("15:41:00.500");
      });

      it("should set the model to null if the view is invalid", () => {
        inputElm = $compile('<input type="time" ng-model="breakMe"/>')(scope);

        scope.$apply(() => {
          scope.breakMe = "16:25:00.000";
        });

        expect(inputElm.val()).toBe("16:25:00.000");

        inputElm[0].value = "stuff";
        inputElm[0].dispatchEvent(new Event("change"));
        expect(inputElm.val()).toBe("");
        expect(scope.breakMe).toBeNull();
      });

      it("should set blank if null", () => {
        inputElm = $compile('<input type="time" ng-model="test" />')(scope);

        scope.$apply("test = null");

        expect(scope.test).toBeNull();
        expect(inputElm.val()).toEqual("");
      });

      it("should set blank when no value specified", () => {
        inputElm = $compile('<input type="time" ng-model="test" />')(scope);

        expect(inputElm.val()).toBe("");

        scope.$apply("test = null");

        expect(scope.test).toBeNull();
        expect(inputElm.val()).toBe("");
      });

      it("should parse empty string to null", () => {
        inputElm = $compile('<input type="time" ng-model="test" />')(scope);

        scope.$apply(() => {
          scope.test = "16:25:00";
        });

        inputElm[0].value = "";
        inputElm[0].dispatchEvent(new Event("change"));
        expect(scope.test).toBeNull();
      });

      it("should allow to specify the milliseconds", () => {
        inputElm = $compile('<input type="time" ng-model="value"" />')(scope);

        inputElm[0].value = "01:02:03.500";
        inputElm[0].dispatchEvent(new Event("change"));
        expect(scope.value).toBe("01:02:03.500");
      });

      it("should allow to specify single digit milliseconds", () => {
        inputElm = $compile('<input type="time" ng-model="value"" />')(scope);

        inputElm[0].value = "01:02:03.4";
        inputElm[0].dispatchEvent(new Event("change"));
        expect(scope.value).toBe("01:02:03.4");
      });

      it("should allow to specify the seconds", () => {
        inputElm = $compile('<input type="time" ng-model="value"" />')(scope);

        inputElm[0].value = "01:02:03";
        inputElm[0].dispatchEvent(new Event("change"));
        expect(scope.value).toBe("01:02:03");

        scope.$apply(() => {
          scope.value = "01:02:03.000";
        });
        expect(inputElm.val()).toBe("01:02:03.000");
      });

      describe("min", () => {
        let inputElm;
        beforeEach(() => {
          scope.minVal = "09:30:00";
          let formElm = $compile(
            '<form name="form"><input type="time" ng-model="value" name="alias" min="{{ minVal }}" /></form>',
          )(scope);
          inputElm = formElm.find("input");
        });

        it("should invalidate", () => {
          inputElm[0].value = "01:02:03";
          inputElm[0].dispatchEvent(new Event("change"));
          expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();
          expect(scope.value).toBeFalsy();
          expect(scope.form.alias.$error.min).toBeTruthy();
        });

        it("should validate", () => {
          inputElm[0].value = "23:02:00";
          inputElm[0].dispatchEvent(new Event("change"));
          expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
          expect(scope.value).toBe("23:02:00");
          expect(scope.form.alias.$error.min).toBeFalsy();
        });

        it("should revalidate when the min value changes", () => {
          inputElm[0].value = "23:02:00";
          inputElm[0].dispatchEvent(new Event("change"));
          expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
          expect(scope.form.alias.$error.min).toBeFalsy();

          scope.minVal = "23:55:00";
          expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();
          expect(scope.form.alias.$error.min).toBeTruthy();
        });

        it("should validate if min is empty", () => {
          scope.minVal = undefined;
          scope.value = "23:55:00";
          expect(scope.form.alias.$error.min).toBeFalsy();
        });
      });

      describe("max", () => {
        let inputElm;
        beforeEach(() => {
          scope.maxVal = "22:30:00";
          let formElm = $compile(
            '<form name="form"><input type="time" ng-model="value" name="alias" max="{{ maxVal }}" /></form>',
          )(scope);
          inputElm = formElm.find("input");
        });

        it("should invalidate", () => {
          inputElm[0].value = "23:00:00";
          inputElm[0].dispatchEvent(new Event("change"));
          expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();
          expect(scope.value).toBeFalsy();
          expect(scope.form.alias.$error.max).toBeTruthy();
        });

        it("should validate", () => {
          inputElm[0].value = "05:30:00";
          inputElm[0].dispatchEvent(new Event("change"));
          expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
          expect(scope.value).toBe("05:30:00");
          expect(scope.form.alias.$error.max).toBeFalsy();
        });

        it("should validate if max is empty", () => {
          scope.maxVal = undefined;
          scope.value = "05:30:00";
          expect(scope.form.alias.$error.max).toBeFalsy();
        });
      });

      it("should validate even if max value changes on-the-fly", () => {
        scope.max = "04:02:00";
        inputElm = $compile(
          '<input type="time" ng-model="value" name="alias" max="{{max}}" />',
        )(scope);

        inputElm[0].value = "05:34:00";
        inputElm[0].dispatchEvent(new Event("change"));
        expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();

        scope.max = "06:34:00";
        expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
      });

      it("should validate even if min value changes on-the-fly", () => {
        scope.min = "08:45:00";
        inputElm = $compile(
          '<input type="time" ng-model="value" name="alias" min="{{min}}" />',
        )(scope);

        inputElm[0].value = "06:15:00";
        inputElm[0].dispatchEvent(new Event("change"));
        expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();

        scope.min = "05:50:00";
        expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
      });

      it("should validate even if ng-max value changes on-the-fly", () => {
        scope.max = "04:02:00";
        inputElm = $compile(
          '<input type="time" ng-model="value" name="alias" ng-max="max" />',
        )(scope);

        inputElm[0].value = "05:34:00";
        inputElm[0].dispatchEvent(new Event("change"));
        expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();

        scope.max = "06:34:00";
        expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
      });

      it("should validate even if ng-min value changes on-the-fly", () => {
        scope.min = "08:45:00";
        inputElm = $compile(
          '<input type="time" ng-model="value" name="alias" ng-min="min" />',
        )(scope);

        inputElm[0].value = "06:15:00";
        inputElm[0].dispatchEvent(new Event("change"));
        expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();

        scope.min = "05:50:00";
        expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
      });
    });

    describe("date", () => {
      it("should throw if model is a Date object.", () => {
        inputElm = $compile('<input type="date" ng-model="birthday"/>')(scope);

        expect(() => {
          scope.$apply(() => {
            scope.birthday = new Date("a");
          });
        }).toThrowError(/datefmt/);
      });

      it("should set the view  when the model is an valid String", () => {
        inputElm = $compile('<input type="date" ng-model="val"/>')(scope);

        scope.$apply(() => {
          scope.val = "1977-10-22";
        });

        expect(inputElm.val()).toBe("1977-10-22");
      });

      it("should bind to scope when the model is an valid String", () => {
        inputElm = $compile('<input type="date" ng-model="val"/>')(scope);

        inputElm[0].value = "1977-10-22";
        inputElm[0].dispatchEvent(new Event("change"));

        expect(scope.val).toBe("1977-10-22");
      });

      it("should set the model to null if the view is invalid", () => {
        inputElm = $compile('<input type="date" ng-model="arrMatey"/>')(scope);

        scope.$apply(() => {
          scope.arrMatey = "2014-09-14";
        });

        expect(inputElm.val()).toBe("2014-09-14");

        // set to text for browsers with date validation.
        inputElm[0].value = "1-2-3";
        inputElm[0].dispatchEvent(new Event("change"));
        expect(inputElm.val()).toBe("");
        expect(scope.arrMatey).toBeNull();
      });

      it("should render as blank if null", () => {
        inputElm = $compile('<input type="date" ng-model="test" />')(scope);

        scope.$apply("test = null");

        expect(scope.test).toBeNull();
        expect(inputElm.val()).toEqual("");
      });

      it("should come up blank when no value specified", () => {
        inputElm = $compile('<input type="date" ng-model="test" />')(scope);

        expect(inputElm.val()).toBe("");

        scope.$apply("test = null");

        expect(scope.test).toBeNull();
        expect(inputElm.val()).toBe("");
      });

      it("should parse empty string to null", () => {
        inputElm = $compile('<input type="date" ng-model="test" />')(scope);

        scope.$apply(() => {
          scope.test = "2014-09-14";
        });

        inputElm[0].value = "";
        inputElm[0].dispatchEvent(new Event("change"));
        expect(scope.test).toBeNull();
      });

      describe("min", () => {
        it("should invalidate", () => {
          const formElm = $compile(
            '<form name="form"><input type="date" ng-model="value" name="alias" min="2000-01-01" /></form>',
          )(scope);
          inputElm = formElm.find("input");
          inputElm[0].value = "1999-12-31";
          inputElm[0].dispatchEvent(new Event("change"));
          expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();
          expect(scope.value).toBeFalsy();
          expect(scope.form.alias.$error.min).toBeTruthy();
        });

        it("should validate", () => {
          const formElm = $compile(
            '<form name="form"><input type="date" ng-model="value" name="alias" min="2000-01-01" /></form>',
          )(scope);
          inputElm = formElm.find("input");
          inputElm[0].value = "2000-01-01";
          inputElm[0].dispatchEvent(new Event("change"));
          expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
          expect(scope.value).toBe("2000-01-01");
          expect(scope.form.alias.$error.min).toBeFalsy();
        });

        it("should validate if min is empty", () => {
          const formElm = $compile(
            '<form name="form"><input name="alias" ng-model="value" type="date" min >',
          )(scope);
          inputElm = formElm.find("input");

          scope.value = "2000-01-01";
          expect(scope.form.alias.$error.min).toBeFalsy();
        });
      });

      describe("max", () => {
        it("should invalidate", () => {
          const formElm = $compile(
            '<form name="form"><input type="date" ng-model="value" name="alias" max="2019-01-01" /></form>',
          )(scope);
          inputElm = formElm.find("input");

          inputElm[0].value = "2019-12-31";
          inputElm[0].dispatchEvent(new Event("change"));
          expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();
          expect(scope.value).toBeFalsy();
          expect(scope.form.alias.$error.max).toBeTruthy();
        });

        it("should validate", () => {
          const formElm = $compile(
            '<form name="form"><input type="date" ng-model="value" name="alias" max="2019-01-01" /></form>',
          )(scope);
          inputElm = formElm.find("input");

          inputElm[0].value = "2000-01-01";
          inputElm[0].dispatchEvent(new Event("change"));
          expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
          expect(scope.value).toBe("2000-01-01");
          expect(scope.form.alias.$error.max).toBeFalsy();
        });

        it("should parse ISO-based date strings as a valid max date value", () => {
          $compile(
            '<form name="form"><input name="myControl" type="date" max="{{ max }}" ng-model="value"></form>',
          )(scope);

          scope.value = "2020-01-01";
          scope.max = new Date(2014, 10, 10, 0, 0, 0).toISOString();
          expect(scope.form.myControl.$error.max).toBeTruthy();
        });

        it("should validate if max is empty", () => {
          $compile(
            '<form name="form"><input type="date" name="alias" ng-model="value" max /></form>',
          )(scope);

          scope.value = "2020-01-01";
          expect(scope.form.alias.$error.max).toBeFalsy();
        });
      });

      it("should validate even if max value changes on-the-fly", () => {
        scope.max = "2013-01-01";
        inputElm = $compile(
          '<input type="date" ng-model="value" name="alias" max="{{max}}" />',
        )(scope);

        inputElm[0].value = "2014-01-01";
        inputElm[0].dispatchEvent(new Event("change"));
        expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();

        scope.max = "2001-01-01";
        expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();

        scope.max = "2021-01-01";
        expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
      });

      it("should validate even if min value changes on-the-fly", () => {
        scope.min = "2013-01-01";
        inputElm = $compile(
          '<input type="date" ng-model="value" name="alias" min="{{min}}" />',
        )(scope);

        inputElm[0].value = "2010-01-01";
        inputElm[0].dispatchEvent(new Event("change"));
        expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();

        scope.min = "2014-01-01";
        expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();

        scope.min = "2009-01-01";
        expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
      });

      it("should validate even if ng-max value changes on-the-fly", () => {
        scope.max = "2013-01-01";
        inputElm = $compile(
          '<input type="date" ng-model="value" name="alias" ng-max="max" />',
        )(scope);

        inputElm[0].value = "2014-01-01";
        inputElm[0].dispatchEvent(new Event("change"));
        expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();

        scope.max = "2001-01-01";
        expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();

        scope.max = "2021-01-01";
        expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
      });

      it("should validate even if ng-min value changes on-the-fly", () => {
        scope.min = "2013-01-01";
        inputElm = $compile(
          '<input type="date" ng-model="value" name="alias" ng-min="min" />',
        )(scope);

        inputElm[0].value = "2010-01-01";
        inputElm[0].dispatchEvent(new Event("change"));
        expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();

        scope.min = "2014-01-01";
        expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();

        scope.min = "2009-01-01";
        expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
      });

      it("should allow Date objects as valid ng-max values", () => {
        scope.max = new Date(2012, 1, 1, 1, 2, 0);
        inputElm = $compile(
          '<input type="date" ng-model="value" name="alias" ng-max="max" />',
        )(scope);

        inputElm[0].value = "2014-01-01";
        inputElm[0].dispatchEvent(new Event("change"));
        expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();

        scope.max = new Date(2013, 1, 1, 1, 2, 0);
        expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();

        scope.max = new Date(2014, 1, 1, 1, 2, 0);
        expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
      });

      it("should allow Date objects as valid ng-min values", () => {
        scope.min = new Date(2013, 1, 1, 1, 2, 0);
        inputElm = $compile(
          '<input type="date" ng-model="value" name="alias" ng-min="min" />',
        )(scope);

        inputElm[0].value = "2010-01-01";
        inputElm[0].dispatchEvent(new Event("change"));
        expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();

        scope.min = new Date(2014, 1, 1, 1, 2, 0);
        expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();

        scope.min = new Date(2009, 1, 1, 1, 2, 0);
        expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
      });

      describe("ISO_DATE_REGEXP", () => {
        [
          // Validate date
          ["00:00:00.0000+01:01", false], // date must be specified
          ["2010.06.15T00:00:00.0000+01:01", false], // date must use dash separator
          ["x2010-06-15T00:00:00.0000+01:01", false], // invalid leading characters

          // Validate year
          ["2010-06-15T00:00:00.0000+01:01", true], // year has four or more digits
          ["20100-06-15T00:00:00.0000+01:01", true], // year has four or more digits
          ["-06-15T00:00:00.0000+01:01", false], // year has too few digits
          ["2-06-15T00:00:00.0000+01:01", false], // year has too few digits
          ["20-06-15T00:00:00.0000+01:01", false], // year has too few digits
          ["201-06-15T00:00:00.0000+01:01", false], // year has too few digits

          // Validate month
          ["2010-01-15T00:00:00.0000+01:01", true], // month has two digits
          ["2010--15T00:00:00.0000+01:01", false], // month has too few digits
          ["2010-0-15T00:00:00.0000+01:01", false], // month has too few digits
          ["2010-1-15T00:00:00.0000+01:01", false], // month has too few digits
          ["2010-111-15T00:00:00.0000+01:01", false], // month has too many digits
          ["2010-22-15T00:00:00.0000+01:01", false], // month is too large

          // Validate day
          ["2010-01-01T00:00:00.0000+01:01", true], // day has two digits
          ["2010-01-T00:00:00.0000+01:01", false], // day has too few digits
          ["2010-01-1T00:00:00.0000+01:01", false], // day has too few digits
          ["2010-01-200T00:00:00.0000+01:01", false], // day has too many digits
          ["2010-01-41T00:00:00.0000+01:01", false], // day is too large

          // Validate time
          ["2010-01-01", false], // time must be specified
          ["2010-01-0101:00:00.0000+01:01", false], // missing date time separator
          ["2010-01-01V01:00:00.0000+01:01", false], // invalid date time separator
          ["2010-01-01T01-00-00.0000+01:01", false], // time must use colon separator

          // Validate hour
          ["2010-01-01T01:00:00.0000+01:01", true], // hour has two digits
          ["2010-01-01T-01:00:00.0000+01:01", false], // hour must be positive
          ["2010-01-01T:00:00.0000+01:01", false], // hour has too few digits
          ["2010-01-01T1:00:00.0000+01:01", false], // hour has too few digits
          ["2010-01-01T220:00:00.0000+01:01", false], // hour has too many digits
          ["2010-01-01T32:00:00.0000+01:01", false], // hour is too large

          // Validate minutes
          ["2010-01-01T01:00:00.0000+01:01", true], // minute has two digits
          ["2010-01-01T01:-00:00.0000+01:01", false], // minute must be positive
          ["2010-01-01T01::00.0000+01:01", false], // minute has too few digits
          ["2010-01-01T01:0:00.0000+01:01", false], // minute has too few digits
          ["2010-01-01T01:100:00.0000+01:01", false], // minute has too many digits
          ["2010-01-01T01:60:00.0000+01:01", false], // minute is too large

          // Validate seconds
          ["2010-01-01T01:00:00.0000+01:01", true], // second has two digits
          ["2010-01-01T01:00:-00.0000+01:01", false], // second must be positive
          ["2010-01-01T01:00:.0000+01:01", false], // second has too few digits
          ["2010-01-01T01:00:0.0000+01:01", false], // second has too few digits
          ["2010-01-01T01:00:100.0000+01:01", false], // second has too many digits
          ["2010-01-01T01:00:60.0000+01:01", false], // second is too large

          // Validate milliseconds
          ["2010-01-01T01:00:00+01:01", false], // millisecond must be specified
          ["2010-01-01T01:00:00.-0000+01:01", false], // millisecond must be positive
          ["2010-01-01T01:00:00:0000+01:01", false], // millisecond must use period separator
          ["2010-01-01T01:00:00.+01:01", false], // millisecond has too few digits

          // Validate timezone
          ["2010-06-15T00:00:00.0000", false], // timezone must be specified

          // Validate timezone offset
          ["2010-06-15T00:00:00.0000+01:01", true], // timezone offset can be positive hours and minutes
          ["2010-06-15T00:00:00.0000-01:01", true], // timezone offset can be negative hours and minutes
          ["2010-06-15T00:00:00.0000~01:01", false], // timezone has postive/negative indicator
          ["2010-06-15T00:00:00.000001:01", false], // timezone has postive/negative indicator
          ["2010-06-15T00:00:00.0000+00:01Z", false], // timezone invalid trailing characters
          ["2010-06-15T00:00:00.0000+00:01 ", false], // timezone invalid trailing characters

          // Validate timezone hour offset
          ["2010-06-15T00:00:00.0000+:01", false], // timezone hour offset has too few digits
          ["2010-06-15T00:00:00.0000+0:01", false], // timezone hour offset has too few digits
          ["2010-06-15T00:00:00.0000+211:01", false], // timezone hour offset too many digits
          ["2010-06-15T00:00:00.0000+31:01", false], // timezone hour offset value too large

          // Validate timezone minute offset
          ["2010-06-15T00:00:00.0000+00:-01", false], // timezone minute offset must be positive
          ["2010-06-15T00:00:00.0000+00.01", false], // timezone minute offset must use colon separator
          ["2010-06-15T00:00:00.0000+0101", false], // timezone minute offset must use colon separator
          ["2010-06-15T00:00:00.0000+010", false], // timezone minute offset must use colon separator
          ["2010-06-15T00:00:00.0000+00", false], // timezone minute offset has too few digits
          ["2010-06-15T00:00:00.0000+00:", false], // timezone minute offset has too few digits
          ["2010-06-15T00:00:00.0000+00:0", false], // timezone minute offset has too few digits
          ["2010-06-15T00:00:00.0000+00:211", false], // timezone minute offset has too many digits
          ["2010-06-15T00:00:00.0000+01010", false], // timezone minute offset has too many digits
          ["2010-06-15T00:00:00.0000+00:61", false], // timezone minute offset is too large

          // Validate timezone UTC
          ["2010-06-15T00:00:00.0000Z", true], // UTC timezone can be indicated with Z
          ["2010-06-15T00:00:00.0000K", false], // UTC timezone indicator is invalid
          ["2010-06-15T00:00:00.0000 Z", false], // UTC timezone indicator has extra space
          ["2010-06-15T00:00:00.0000ZZ", false], // UTC timezone indicator invalid trailing characters
          ["2010-06-15T00:00:00.0000Z ", false], // UTC timezone indicator invalid trailing characters
        ].forEach((item) => {
          it("should validate date: $prop", () => {
            const date = item[0];
            const valid = item[1];

            expect(ISO_DATE_REGEXP.test(date)).toBe(valid);
          });
        });
      });
    });

    describe("number", () => {
      // Helpers for min / max tests
      const subtract = function (value) {
        return value - 5;
      };

      const add = function (value) {
        return value + 5;
      };

      it("should reset the model if view is invalid", () => {
        inputElm = $compile('<input type="number" ng-model="age"/>')(scope);

        scope.$apply("age = 123");
        expect(inputElm.val()).toBe("123");

        inputElm[0].value = "123X";
        inputElm[0].dispatchEvent(new Event("change"));

        expect(inputElm.val()).toBe("");
        expect(scope.age).toBeNull();
        expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
      });

      it("should render as blank if null", () => {
        inputElm = $compile('<input type="number" ng-model="age" />')(scope);

        scope.$apply("age = null");

        expect(scope.age).toBeNull();
        expect(inputElm.val()).toEqual("");
      });

      it("should come up blank when no value specified", () => {
        inputElm = $compile('<input type="number" ng-model="age" />')(scope);

        expect(inputElm.val()).toBe("");

        scope.$apply("age = null");

        expect(scope.age).toBeNull();
        expect(inputElm.val()).toBe("");
      });

      it("should parse empty string to null", () => {
        inputElm = $compile('<input type="number" ng-model="age" />')(scope);

        scope.$apply("age = 10");

        inputElm[0].value = "";
        inputElm[0].dispatchEvent(new Event("change"));

        expect(scope.age).toBeNull();
        expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
      });

      it("should only invalidate the model if suffering from bad input when the data is parsed", () => {
        inputElm = $compile('<input type="number" ng-model="age" />')(scope);

        expect(scope.age).toBeUndefined();
        expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();

        inputElm[0].value = "this-will-fail-because-of-the-badInput-flag";
        inputElm[0].dispatchEvent(new Event("change"));

        expect(scope.age).toBeNull();
        expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
      });

      it("should validate number if transition from bad input to empty string", () => {
        inputElm = $compile('<input type="number" ng-model="age" />')(scope);
        inputElm[0].value = "10a";
        inputElm[0].dispatchEvent(new Event("change"));

        inputElm[0].value = "";
        inputElm[0].dispatchEvent(new Event("change"));
        expect(scope.age).toBeNull();
        expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
      });

      it("should validate with undefined viewValue when $validate() called", () => {
        inputElm = $compile(
          '<form name="form"><input type="number" name="alias" ng-model="value" /></form>',
        )(scope);

        scope.form.alias.$validate();

        expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
        expect(scope.form.alias.$error.number).toBeUndefined();
      });

      it("should throw if the model value is not a number", () => {
        scope.value = "one";
        expect(() => {
          $compile('<input type="number" ng-model="value" />')(scope);
        }).toThrowError(/numfmt/);
      });

      it("should parse exponential notation", () => {
        const formElm = $compile(
          '<form name="form"><input type="number" name="alias" ng-model="value" /></form>',
        )(scope);
        inputElm = formElm.find("input");

        // #.###e+##
        scope.form.alias.$setViewValue("1.23214124123412412e+26");
        expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
        expect(scope.value).toBe(1.23214124123412412e26);

        // #.###e##
        scope.form.alias.$setViewValue("1.23214124123412412e26");
        expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
        expect(scope.value).toBe(1.23214124123412412e26);

        // #.###e-##
        scope.form.alias.$setViewValue("1.23214124123412412e-26");
        expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
        expect(scope.value).toBe(1.23214124123412412e-26);

        // ####e+##
        scope.form.alias.$setViewValue("123214124123412412e+26");
        expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
        expect(scope.value).toBe(123214124123412412e26);

        // ####e##
        scope.form.alias.$setViewValue("123214124123412412e26");
        expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
        expect(scope.value).toBe(123214124123412412e26);

        // ####e-##
        scope.form.alias.$setViewValue("123214124123412412e-26");
        expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
        expect(scope.value).toBe(123214124123412412e-26);

        // #.###E+##
        scope.form.alias.$setViewValue("1.23214124123412412E+26");
        expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
        expect(scope.value).toBe(1.23214124123412412e26);

        // #.###E##
        scope.form.alias.$setViewValue("1.23214124123412412E26");
        expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
        expect(scope.value).toBe(1.23214124123412412e26);

        // #.###E-##
        scope.form.alias.$setViewValue("1.23214124123412412E-26");
        expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
        expect(scope.value).toBe(1.23214124123412412e-26);

        // ####E+##
        scope.form.alias.$setViewValue("123214124123412412E+26");
        expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
        expect(scope.value).toBe(123214124123412412e26);

        // ####E##
        scope.form.alias.$setViewValue("123214124123412412E26");
        expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
        expect(scope.value).toBe(123214124123412412e26);

        // ####E-##
        scope.form.alias.$setViewValue("123214124123412412E-26");
        expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
        expect(scope.value).toBe(123214124123412412e-26);
      });

      it("should bind to scope if input is valid", () => {
        inputElm = $compile('<input type="number" ng-model="age"/>')(scope);
        const ctrl = inputElm.controller("ngModel");

        let previousParserFail = false;
        let laterParserFail = false;

        ctrl.$parsers.unshift((value) =>
          previousParserFail ? undefined : value,
        );

        ctrl.$parsers.push((value) => (laterParserFail ? undefined : value));

        inputElm[0].value = "123X";
        inputElm[0].dispatchEvent(new Event("change"));
        expect(inputElm.val()).toBe("");

        expect(scope.age).toBeNull();
        expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
        expect(ctrl.$error.number).toBeUndefined();

        inputElm[0].value = "123";
        inputElm[0].dispatchEvent(new Event("change"));
        expect(inputElm.val()).toBe("123");
        expect(scope.age).toBe(123);
        expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
        expect(ctrl.$error.number).toBeFalsy();
        expect(ctrl.$error.parse).toBe(undefined);
      });

      describe("min", () => {
        it("should validate", () => {
          const formElm = $compile(
            '<form name="form"><input type="number" ng-model="value" name="alias" min="10" /></form>',
          )(scope);
          inputElm = formElm.find("input");

          inputElm[0].value = "1";
          inputElm[0].dispatchEvent(new Event("change"));
          expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();
          expect(scope.value).toBeFalsy();
          expect(scope.form.alias.$error.min).toBeTruthy();

          inputElm[0].value = "100";
          inputElm[0].dispatchEvent(new Event("change"));

          expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
          expect(scope.value).toBe(100);
          expect(scope.form.alias.$error.min).toBeFalsy();
        });

        it("should validate against the viewValue", () => {
          const formElm = $compile(
            '<form name="form"><input type="number" ng-model-options="{allowInvalid: true}" ng-model="value" name="alias" min="10" /></form>',
          )(scope);
          inputElm = formElm.find("input");
          const ngModelCtrl = inputElm.controller("ngModel");
          ngModelCtrl.$parsers.push(subtract);

          inputElm[0].value = "10";
          inputElm[0].dispatchEvent(new Event("change"));
          expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
          expect(scope.value).toBe(5);
          expect(scope.form.alias.$error.min).toBeFalsy();

          ngModelCtrl.$parsers.pop();
          ngModelCtrl.$parsers.push(add);

          inputElm[0].value = "5";
          inputElm[0].dispatchEvent(new Event("change"));
          expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();
          expect(scope.form.alias.$error.min).toBeTruthy();
          expect(scope.value).toBe(10);
        });

        it("should validate even if min value changes on-the-fly", () => {
          scope.min = undefined;
          inputElm = $compile(
            '<input type="number" ng-model="value" name="alias" min="{{min}}" />',
          )(scope);
          expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();

          inputElm[0].value = "15";
          inputElm[0].dispatchEvent(new Event("change"));
          expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();

          scope.min = 10;
          expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();

          scope.min = 20;
          expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();

          scope.min = null;
          expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();

          scope.min = "20";
          expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();

          scope.min = "abc";
          expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
        });
      });

      describe("ngMin", () => {
        it("should validate", () => {
          const formElm = $compile(
            '<form name="form"><input type="number" ng-model="value" name="alias" ng-min="50" /></form>',
          )(scope);
          inputElm = formElm.find("input");

          inputElm[0].value = "1";
          inputElm[0].dispatchEvent(new Event("change"));
          expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();
          expect(scope.value).toBeFalsy();
          expect(scope.form.alias.$error.min).toBeTruthy();

          inputElm[0].value = "100";
          inputElm[0].dispatchEvent(new Event("change"));
          expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
          expect(scope.value).toBe(100);
          expect(scope.form.alias.$error.min).toBeFalsy();
        });

        it("should validate against the viewValue", () => {
          const formElm = $compile(
            '<form name="form"><input type="number" ng-model="value" name="alias" ng-min="10" /></form>',
          )(scope);
          inputElm = formElm.find("input");
          const ngModelCtrl = inputElm.controller("ngModel");
          ngModelCtrl.$parsers.push(subtract);

          inputElm[0].value = "10";
          inputElm[0].dispatchEvent(new Event("change"));
          expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
          expect(scope.value).toBe(5);
          expect(scope.form.alias.$error.min).toBeFalsy();

          ngModelCtrl.$parsers.pop();
          ngModelCtrl.$parsers.push(add);

          inputElm[0].value = "5";
          inputElm[0].dispatchEvent(new Event("change"));
          expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();
          expect(scope.form.alias.$error.min).toBeTruthy();
          expect(scope.value).toBe(undefined);
        });

        it("should validate even if the ngMin value changes on-the-fly", () => {
          scope.min = undefined;
          inputElm = $compile(
            '<input type="number" ng-model="value" name="alias" ng-min="min" />',
          )(scope);
          expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();

          inputElm[0].value = "15";
          inputElm[0].dispatchEvent(new Event("change"));
          expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();

          scope.min = 10;
          expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();

          scope.min = 20;
          expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();

          scope.min = null;
          expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();

          scope.min = "20";
          expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();

          scope.min = "abc";
          expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
        });
      });

      describe("max", () => {
        it("should validate", () => {
          const formElm = $compile(
            '<form name="form"><input type="number" ng-model="value" name="alias" max="10" /></form>',
          )(scope);
          inputElm = formElm.find("input");

          inputElm[0].value = "20";
          inputElm[0].dispatchEvent(new Event("change"));
          expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();
          expect(scope.value).toBeUndefined();
          expect(scope.form.alias.$error.max).toBeTruthy();

          inputElm[0].value = "0";
          inputElm[0].dispatchEvent(new Event("change"));
          expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
          expect(scope.value).toBe(0);
          expect(scope.form.alias.$error.max).toBeFalsy();
        });

        it("should validate against the viewValue", () => {
          const formElm = $compile(
            '<form name="form"><input type="number"' +
              'ng-model-options="{allowInvalid: true}" ng-model="value" name="alias" max="10" /></form>',
          )(scope);
          inputElm = formElm.find("input");
          const ngModelCtrl = inputElm.controller("ngModel");
          ngModelCtrl.$parsers.push(add);

          inputElm[0].value = "10";
          inputElm[0].dispatchEvent(new Event("change"));
          expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
          expect(scope.value).toBe(15);
          expect(scope.form.alias.$error.max).toBeFalsy();

          ngModelCtrl.$parsers.pop();
          ngModelCtrl.$parsers.push(subtract);

          inputElm[0].value = "15";
          inputElm[0].dispatchEvent(new Event("change"));
          expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();
          expect(scope.form.alias.$error.max).toBeTruthy();
          expect(scope.value).toBe(10);
        });

        it("should validate even if max value changes on-the-fly", () => {
          scope.max = undefined;
          inputElm = $compile(
            '<input type="number" ng-model="value" name="alias" max="{{max}}" />',
          )(scope);
          expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();

          inputElm[0].value = "5";
          inputElm[0].dispatchEvent(new Event("change"));
          expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();

          scope.max = 10;
          expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();

          scope.max = 0;
          expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();

          scope.max = null;
          expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();

          scope.max = "4";
          expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();

          scope.max = "abc";
          expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
        });
      });

      describe("ngMax", () => {
        it("should validate", () => {
          const formElm = $compile(
            '<form name="form"><input type="number" ng-model="value" name="alias" ng-max="5" /></form>',
          )(scope);
          inputElm = formElm.find("input");

          inputElm[0].value = "20";
          inputElm[0].dispatchEvent(new Event("change"));
          expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();
          expect(scope.value).toBeUndefined();
          expect(scope.form.alias.$error.max).toBeTruthy();

          inputElm[0].value = "0";
          inputElm[0].dispatchEvent(new Event("change"));
          expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
          expect(scope.value).toBe(0);
          expect(scope.form.alias.$error.max).toBeFalsy();
        });

        it("should validate against the viewValue", () => {
          const formElm = $compile(
            '<form name="form"><input type="number"' +
              'ng-model-options="{allowInvalid: true}" ng-model="value" name="alias" ng-max="10" /></form>',
          )(scope);
          inputElm = formElm.find("input");
          const ngModelCtrl = inputElm.controller("ngModel");
          ngModelCtrl.$parsers.push(add);

          inputElm[0].value = "10";
          inputElm[0].dispatchEvent(new Event("change"));
          expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
          expect(scope.value).toBe(15);
          expect(scope.form.alias.$error.max).toBeFalsy();

          ngModelCtrl.$parsers.pop();
          ngModelCtrl.$parsers.push(subtract);

          inputElm[0].value = "15";
          inputElm[0].dispatchEvent(new Event("change"));
          expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();
          expect(scope.form.alias.$error.max).toBeTruthy();
          expect(scope.value).toBe(10);
        });

        it("should validate even if the ngMax value changes on-the-fly", () => {
          scope.max = undefined;
          inputElm = $compile(
            '<input type="number" ng-model="value" name="alias" ng-max="max" />',
          )(scope);
          expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();

          inputElm[0].value = "5";
          inputElm[0].dispatchEvent(new Event("change"));
          expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();

          scope.max = 10;
          expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();

          scope.max = 0;
          expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();

          scope.max = null;
          expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();

          scope.max = "4";
          expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();

          scope.max = "abc";
          expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
        });
      });

      Object.entries({
        step: 'step="{{step}}"',
        ngStep: 'ng-step="step"',
      }).forEach(([attrName, attrHtml]) => {
        describe(attrName, () => {
          it("should validate", () => {
            scope.step = 10;
            scope.value = 20;
            const formElm = $compile(
              `<form name="form"><input type="number" ng-model="value" name="alias" ${attrHtml} /></form>`,
            )(scope);
            inputElm = formElm.find("input");
            scope.$digest();
            expect(inputElm.val()).toBe("20");
            expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
            expect(scope.value).toBe(20);
            expect(scope.form.alias.$error.step).toBeFalsy();

            inputElm[0].value = "18";
            inputElm[0].dispatchEvent(new Event("change"));
            expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();
            expect(inputElm.val()).toBe("18");
            expect(scope.value).toBeUndefined();
            expect(scope.form.alias.$error.step).toBeTruthy();

            inputElm[0].value = "10";
            inputElm[0].dispatchEvent(new Event("change"));
            expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
            expect(inputElm.val()).toBe("10");
            expect(scope.value).toBe(10);
            expect(scope.form.alias.$error.step).toBeFalsy();

            scope.$apply("value = 12");
            expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();
            expect(inputElm.val()).toBe("12");
            expect(scope.value).toBe(12);
            expect(scope.form.alias.$error.step).toBeTruthy();
          });

          it("should validate even if the step value changes on-the-fly", () => {
            scope.step = 10;
            const formElm = $compile(
              `<form name="form"><input type="number" ng-model="value" name="alias" ${attrHtml} /></form>`,
            )(scope);
            inputElm = formElm.find("input");
            inputElm[0].value = "10";
            inputElm[0].dispatchEvent(new Event("change"));
            expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
            expect(scope.value).toBe(10);

            // Step changes, but value matches
            scope.$apply("step = 5");
            expect(inputElm.val()).toBe("10");
            expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
            expect(scope.value).toBe(10);
            expect(scope.form.alias.$error.step).toBeFalsy();

            // Step changes, value does not match
            scope.$apply("step = 6");
            expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();
            expect(scope.value).toBeUndefined();
            expect(inputElm.val()).toBe("10");
            expect(scope.form.alias.$error.step).toBeTruthy();

            // null = valid
            scope.$apply("step = null");
            expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
            expect(scope.value).toBe(10);
            expect(inputElm.val()).toBe("10");
            expect(scope.form.alias.$error.step).toBeFalsy();

            // Step val as string
            scope.$apply('step = "7"');
            expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();
            expect(scope.value).toBeUndefined();
            expect(inputElm.val()).toBe("10");
            expect(scope.form.alias.$error.step).toBeTruthy();

            // unparsable string is ignored
            scope.$apply('step = "abc"');
            expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
            expect(scope.value).toBe(10);
            expect(inputElm.val()).toBe("10");
            expect(scope.form.alias.$error.step).toBeFalsy();
          });

          it('should use the correct "step base" when `[min]` is specified', () => {
            scope.min = 5;
            scope.step = 10;
            scope.value = 10;
            inputElm = $compile(
              `<input type="number" ng-model="value" min="{{min}}" ${attrHtml} />`,
            )(scope);
            const ngModel = inputElm.controller("ngModel");
            scope.$digest();
            expect(inputElm.val()).toBe("10");
            expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();
            expect(ngModel.$error.step).toBe(true);
            expect(scope.value).toBe(10); // an initially invalid value should not be changed

            inputElm[0].value = "15";
            inputElm[0].dispatchEvent(new Event("change"));
            expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
            expect(scope.value).toBe(15);

            scope.$apply("step = 3");
            expect(inputElm.val()).toBe("15");
            expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();
            expect(ngModel.$error.step).toBe(true);
            expect(scope.value).toBeUndefined();

            inputElm[0].value = "8";
            inputElm[0].dispatchEvent(new Event("change"));
            expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
            expect(scope.value).toBe(8);

            scope.$apply("min = 10; step = 20");
            inputElm[0].value = "30";
            inputElm[0].dispatchEvent(new Event("change"));
            expect(inputElm.val()).toBe("30");
            expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
            expect(scope.value).toBe(30);

            scope.$apply("min = 5");
            expect(inputElm.val()).toBe("30");
            expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();
            expect(ngModel.$error.step).toBe(true);
            expect(scope.value).toBeUndefined();

            scope.$apply("step = 0.00000001");
            expect(inputElm.val()).toBe("30");
            expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
            expect(scope.value).toBe(30);

            // 0.3 - 0.2 === 0.09999999999999998
            scope.$apply("min = 0.2; step = (0.3 - 0.2)");
            inputElm[0].value = "0.3";
            inputElm[0].dispatchEvent(new Event("change"));
            expect(inputElm.val()).toBe("0.3");
            expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();
            expect(ngModel.$error.step).toBe(true);
            expect(scope.value).toBeUndefined();
          });

          it("should correctly validate even in cases where the JS floating point arithmetic fails", () => {
            scope.step = 0.1;
            inputElm = $compile(
              `<input type="number" ng-model="value" ${attrHtml} />`,
            )(scope);
            const ngModel = inputElm.controller("ngModel");

            expect(inputElm.val()).toBe("");
            expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
            expect(scope.value).toBeUndefined();

            inputElm[0].value = "0.3";
            inputElm[0].dispatchEvent(new Event("change"));
            expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
            expect(scope.value).toBe(0.3);

            inputElm[0].value = "2.9999999999999996";
            inputElm[0].dispatchEvent(new Event("change"));
            expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();
            expect(ngModel.$error.step).toBe(true);
            expect(scope.value).toBeUndefined();

            // 0.5 % 0.1 === 0.09999999999999998
            inputElm[0].value = "0.5";
            inputElm[0].dispatchEvent(new Event("change"));
            expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
            expect(scope.value).toBe(0.5);

            // // 3.5 % 0.1 === 0.09999999999999981
            inputElm[0].value = "3.5";
            inputElm[0].dispatchEvent(new Event("change"));
            expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
            expect(scope.value).toBe(3.5);

            // 1.16 % 0.01 === 0.009999999999999896
            // 1.16 * 100  === 115.99999999999999
            scope.step = 0.01;
            inputElm[0].value = "1.16";
            inputElm[0].dispatchEvent(new Event("change"));
            expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
            expect(scope.value).toBe(1.16);
          });
        });
      });

      describe("required", () => {
        it("should be valid even if value is 0", () => {
          const formElm = $compile(
            '<form name="form"><input type="number" ng-model="value" name="alias" required /></form>',
          )(scope);
          inputElm = formElm.find("input");

          inputElm[0].value = "0";
          inputElm[0].dispatchEvent(new Event("change"));
          expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
          expect(scope.value).toBe(0);
          expect(scope.form.alias.$error.required).toBeFalsy();
        });

        it("should be valid even if value 0 is set from model", () => {
          const formElm = $compile(
            '<form name="form"><input type="number" ng-model="value" name="alias" required /></form>',
          )(scope);
          inputElm = formElm.find("input");
          scope.$apply("value = 0");

          expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
          expect(inputElm.val()).toBe("0");
          expect(scope.form.alias.$error.required).toBeFalsy();
        });

        it("should register required on non boolean elements", () => {
          const formElm = $compile(
            '<form name="form"><div ng-model="value" name="alias" required></form>',
          )(scope);
          inputElm = formElm.find("div");

          scope.$apply("value = ''");

          expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();
          expect(scope.form.alias.$error.required).toBeTruthy();
        });

        it("should not invalidate number if ng-required=false and viewValue has not been committed", () => {
          inputElm = $compile(
            '<input type="number" ng-model="value" name="alias" ng-required="required">',
          )(scope);

          scope.$apply("required = false");

          expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
        });
      });

      describe("ngRequired", () => {
        describe("when the ngRequired expression initially evaluates to true", () => {
          it("should be valid even if value is 0", () => {
            const formElm = $compile(
              '<form name="form"><input type="number" ng-model="value" name="numberInput" ng-required="true" /></form>',
            )(scope);
            inputElm = formElm.find("input");

            inputElm[0].value = "0";
            inputElm[0].dispatchEvent(new Event("change"));
            expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
            expect(scope.value).toBe(0);
            expect(scope.form.numberInput.$error.required).toBeFalsy();
          });

          it("should be valid even if value 0 is set from model", () => {
            const formElm = $compile(
              '<form name="form"><input type="number" ng-model="value" name="numberInput" ng-required="true" /></form>',
            )(scope);
            inputElm = formElm.find("input");

            scope.$apply("value = 0");

            expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
            expect(inputElm.val()).toBe("0");
            expect(scope.form.numberInput.$error.required).toBeFalsy();
          });

          it("should register required on non boolean elements", () => {
            const formElm = $compile(
              '<form name="form"><div ng-model="value" name="numberInput" ng-required="true"></form>',
            )(scope);
            inputElm = formElm.find("div");

            scope.$apply("value = ''");

            expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();
            expect(scope.form.numberInput.$error.required).toBeTruthy();
          });

          it("should change from invalid to valid when the value is empty and the ngRequired expression changes to false", () => {
            const formElm = $compile(
              '<form name="form"><input type="number" ng-model="value" name="numberInput" ng-required="ngRequiredExpr" /></form>',
            )(scope);
            inputElm = formElm.find("input");

            scope.$apply("ngRequiredExpr = true");

            expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();
            expect(scope.value).toBeUndefined();
            expect(scope.form.numberInput.$error.required).toBeTruthy();

            scope.$apply("ngRequiredExpr = false");

            expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
            expect(scope.value).toBeUndefined();
            expect(scope.form.numberInput.$error.required).toBeFalsy();
          });
        });

        describe("when the ngRequired expression initially evaluates to false", () => {
          it("should be valid even if value is empty", () => {
            const formElm = $compile(
              '<form name="form"><input type="number" ng-model="value" name="numberInput" ng-required="false" /></form>',
            )(scope);
            inputElm = formElm.find("input");

            expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
            expect(scope.value).toBeUndefined();
            expect(scope.form.numberInput.$error.required).toBeFalsy();
            expect(scope.form.numberInput.$error.number).toBeFalsy();
          });

          it("should be valid if value is non-empty", () => {
            const formElm = $compile(
              '<form name="form"><input type="number" ng-model="value" name="numberInput" ng-required="false" /></form>',
            )(scope);
            inputElm = formElm.find("input");

            inputElm[0].value = "42";
            inputElm[0].dispatchEvent(new Event("change"));
            expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
            expect(scope.value).toBe(42);
            expect(scope.form.numberInput.$error.required).toBeFalsy();
          });

          it("should not register required on non boolean elements", () => {
            const formElm = $compile(
              '<form name="form"><div ng-model="value" name="numberInput" ng-required="false"><form>',
            )(scope);
            inputElm = formElm.find("div");

            scope.$apply("value = ''");

            expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
            expect(scope.form.numberInput.$error.required).toBeFalsy();
          });

          it("should change from valid to invalid when the value is empty and the ngRequired expression changes to true", () => {
            const formElm = $compile(
              '<form name="form"><input type="number" ng-model="value" name="numberInput" ng-required="ngRequiredExpr" /><form>',
            )(scope);
            inputElm = formElm.find("input");

            scope.$apply("ngRequiredExpr = false");

            expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
            expect(scope.value).toBeUndefined();
            expect(scope.form.numberInput.$error.required).toBeFalsy();

            scope.$apply("ngRequiredExpr = true");

            expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();
            expect(scope.value).toBeUndefined();
            expect(scope.form.numberInput.$error.required).toBeTruthy();
          });
        });
      });

      describe("minlength", () => {
        it("should invalidate values that are shorter than the given minlength", () => {
          inputElm = $compile(
            '<input type="number" ng-model="value" ng-minlength="3" />',
          )(scope);

          inputElm[0].value = "12";
          inputElm[0].dispatchEvent(new Event("change"));
          expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();

          inputElm[0].value = "123";
          inputElm[0].dispatchEvent(new Event("change"));
          expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
        });

        it("should observe the standard minlength attribute and register it as a validator on the model", () => {
          const formElm = $compile(
            '<form name="form"><input type="number" name="input" ng-model="value" minlength="{{ min }}" /></form>',
          )(scope);
          inputElm = formElm.find("input");
          scope.$apply(() => {
            scope.min = 10;
          });

          inputElm[0].value = "12345";
          inputElm[0].dispatchEvent(new Event("change"));
          expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();
          expect(scope.form.input.$error.minlength).toBe(true);

          scope.$apply(() => {
            scope.min = 5;
          });

          expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
          expect(scope.form.input.$error.minlength).not.toBe(true);
        });
      });

      describe("maxlength", () => {
        it("should invalidate values that are longer than the given maxlength", () => {
          inputElm = $compile(
            '<input type="number" ng-model="value" ng-maxlength="5" />',
          )(scope);

          inputElm[0].value = "12345678";
          inputElm[0].dispatchEvent(new Event("change"));
          expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();

          inputElm[0].value = "123";
          inputElm[0].dispatchEvent(new Event("change"));
          expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
        });

        it("should observe the standard maxlength attribute and register it as a validator on the model", () => {
          const formElm = $compile(
            '<form name="form"><input type="number" name="input" ng-model="value" maxlength="{{ max }}" /></form>',
          )(scope);
          inputElm = formElm.find("input");
          scope.$apply(() => {
            scope.max = 1;
          });

          inputElm[0].value = "12345";
          inputElm[0].dispatchEvent(new Event("change"));
          expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();
          expect(scope.form.input.$error.maxlength).toBe(true);

          scope.$apply(() => {
            scope.max = 6;
          });

          expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
          expect(scope.form.input.$error.maxlength).not.toBe(true);
        });
      });
    });

    describe("range", () => {
      const rangeTestEl = JQLite('<input type="range">');
      const supportsRange = rangeTestEl[0].type === "range";

      it("should render as 50 if null", () => {
        inputElm = $compile('<input type="range" ng-model="age" />')(scope);

        inputElm[0].value = "25";
        inputElm[0].dispatchEvent(new Event("change"));
        expect(scope.age).toBe(25);

        scope.$apply("age = null");

        expect(inputElm.val()).toEqual("50");
      });

      it("should set model to 50 when no value specified and default min/max", () => {
        inputElm = $compile('<input type="range" ng-model="age" />')(scope);

        expect(inputElm.val()).toBe("50");

        scope.$apply("age = null");

        expect(scope.age).toBe(50);
      });

      it("should parse non-number values to 50 when default min/max", () => {
        inputElm = $compile('<input type="range" ng-model="age" />')(scope);

        scope.$apply("age = 10");
        expect(inputElm.val()).toBe("10");

        inputElm[0].value = "";
        inputElm[0].dispatchEvent(new Event("change"));
        expect(scope.age).toBe(50);
        expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
      });

      it("should parse the input value to a Number", () => {
        inputElm = $compile('<input type="range" ng-model="age" />')(scope);

        inputElm[0].value = "75";
        inputElm[0].dispatchEvent(new Event("change"));
        expect(scope.age).toBe(75);
      });

      it("should only invalidate the model if suffering from bad input when the data is parsed", () => {
        scope.age = 60;

        inputElm = $compile('<input type="range" ng-model="age" />')(scope);

        expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();

        inputElm[0].value = "this-will-fail-because-of-the-badInput-flag";
        inputElm[0].dispatchEvent(new Event("change"));

        expect(scope.age).toBe(50);
        expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
      });

      it("should throw if the model value is not a number", () => {
        expect(() => {
          scope.value = "one";
          inputElm = $compile('<input type="range" ng-model="value" />')(scope);
        }).toThrowError(/numfmt/);
      });

      describe("min", () => {
        it("should initialize correctly with non-default model and min value", () => {
          scope.value = -3;
          scope.min = -5;
          const formElm = $compile(
            '<form name="form"><input type="range" ng-model="value" name="alias" min="{{min}}" /></form>',
          )(scope);
          inputElm = formElm.find("input");
          expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
          expect(inputElm.val()).toBe("-3");
          expect(scope.value).toBe(-3);
          expect(scope.form.alias.$error.min).toBeFalsy();
        });

        // Browsers that implement range will never allow you to set the value < min values
        it("should adjust invalid input values", () => {
          const formElm = $compile(
            '<form name="form"><input type="range" ng-model="value" name="alias" min="10" /></form>',
          )(scope);
          inputElm = formElm.find("input");

          inputElm[0].value = "5";
          inputElm[0].dispatchEvent(new Event("change"));
          expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
          expect(scope.value).toBe(10);
          expect(scope.form.alias.$error.min).toBeFalsy();

          inputElm[0].value = "100";
          inputElm[0].dispatchEvent(new Event("change"));
          expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
          expect(scope.value).toBe(100);
          expect(scope.form.alias.$error.min).toBeFalsy();
        });

        it("should set the model to the min val if it is less than the min val", () => {
          scope.value = -10;
          // Default min is 0
          inputElm = $compile(
            '<input type="range" ng-model="value" name="alias" min="{{min}}" />',
          )(scope);
          expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
          expect(inputElm.val()).toBe("0");
          expect(scope.value).toBe(0);

          scope.$apply("value = 5; min = 10");

          expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
          expect(inputElm.val()).toBe("10");
          expect(scope.value).toBe(10);
        });

        it("should adjust the element and model value when the min value changes on-the-fly", () => {
          scope.min = 10;
          inputElm = $compile(
            '<input type="range" ng-model="value" name="alias" min="{{min}}" />',
          )(scope);
          inputElm[0].value = "15";
          inputElm[0].dispatchEvent(new Event("change"));
          expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();

          scope.min = 20;
          expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
          expect(scope.value).toBe(20);
          expect(inputElm.val()).toBe("20");

          scope.min = null;
          expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
          expect(scope.value).toBe(20);
          expect(inputElm.val()).toBe("20");

          scope.min = "15";
          expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
          expect(scope.value).toBe(20);
          expect(inputElm.val()).toBe("20");

          scope.min = "abc";
          expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
          expect(scope.value).toBe(20);
          expect(inputElm.val()).toBe("20");
        });
      });

      describe("max", () => {
        // Browsers that implement range will never allow you to set the value > max value
        it("should initialize correctly with non-default model and max value", () => {
          scope.value = 130;
          scope.max = 150;
          const formElm = $compile(
            '<form name="form"><input type="range" ng-model="value" name="alias" max="{{max}}" /></form>',
          )(scope);
          inputElm = formElm.find("input");
          expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
          expect(inputElm.val()).toBe("130");
          expect(scope.value).toBe(130);
          expect(scope.form.alias.$error.max).toBeFalsy();
        });

        it("should validate", () => {
          const formElm = $compile(
            '<form name="form"><input type="range" ng-model="value" name="alias" max="10" /></form>',
          )(scope);
          inputElm = formElm.find("input");

          inputElm[0].value = "20";
          inputElm[0].dispatchEvent(new Event("change"));
          expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
          expect(scope.value).toBe(10);
          expect(scope.form.alias.$error.max).toBeFalsy();

          inputElm[0].value = "0";
          inputElm[0].dispatchEvent(new Event("change"));
          expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
          expect(scope.value).toBe(0);
          expect(scope.form.alias.$error.max).toBeFalsy();
        });

        it("should set the model to the max val if it is greater than the max val", () => {
          scope.value = 110;
          // Default max is 100
          inputElm = $compile(
            '<input type="range" ng-model="value" name="alias" max="{{max}}" />',
          )(scope);
          expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
          expect(inputElm.val()).toBe("100");
          expect(scope.value).toBe(100);

          scope.$apply("value = 90; max = 10");

          expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
          expect(inputElm.val()).toBe("10");
          expect(scope.value).toBe(10);
        });

        it("should adjust the element and model value if the max value changes on-the-fly", () => {
          scope.max = 10;
          inputElm = $compile(
            '<input type="range" ng-model="value" name="alias" max="{{max}}" />',
          )(scope);
          inputElm[0].value = "5";
          inputElm[0].dispatchEvent(new Event("change"));
          expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();

          scope.max = 0;
          expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
          expect(scope.value).toBe(0);
          expect(inputElm.val()).toBe("0");

          scope.max = null;
          expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
          expect(scope.value).toBe(0);
          expect(inputElm.val()).toBe("0");

          scope.max = "4";
          expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
          expect(scope.value).toBe(0);
          expect(inputElm.val()).toBe("0");

          scope.max = "abc";
          expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
          expect(scope.value).toBe(0);
          expect(inputElm.val()).toBe("0");
        });
      });

      describe("min and max", () => {
        it("should set the correct initial value when min and max are specified", () => {
          scope.max = 80;
          scope.min = 40;
          inputElm = $compile(
            '<input type="range" ng-model="value" name="alias" max="{{max}}" min="{{min}}" />',
          )(scope);
          expect(inputElm.val()).toBe("60");
          expect(scope.value).toBe(60);
        });

        it("should set element and model value to min if max is less than min", () => {
          scope.min = 40;
          inputElm = $compile(
            '<input type="range" ng-model="value" name="alias" max="{{max}}" min="{{min}}" />',
          )(scope);
          expect(inputElm.val()).toBe("70");
          expect(scope.value).toBe(70);

          scope.max = 20;
          expect(inputElm.val()).toBe("40");
          expect(scope.value).toBe(40);
        });
      });

      describe("step", () => {
        // Browsers that implement range will never allow you to set a value that doesn't match the step value
        // However, currently only Firefox fully implements the spec when setting the value after the step value changes.
        // Other browsers fail in various edge cases, which is why they are not tested here.

        it("should round the input value to the nearest step on user input", () => {
          const formElm = $compile(
            '<form name="form"><input type="range" ng-model="value" name="alias" step="5" /></form>',
          )(scope);
          inputElm = formElm.find("input");

          inputElm[0].value = "5";
          inputElm[0].dispatchEvent(new Event("change"));
          expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
          expect(scope.value).toBe(5);
          expect(scope.form.alias.$error.step).toBeFalsy();

          inputElm[0].value = "10";
          inputElm[0].dispatchEvent(new Event("change"));
          expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
          expect(scope.value).toBe(10);
          expect(scope.form.alias.$error.step).toBeFalsy();

          inputElm[0].value = "9";
          inputElm[0].dispatchEvent(new Event("change"));
          expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
          expect(scope.value).toBe(10);
          expect(scope.form.alias.$error.step).toBeFalsy();

          inputElm[0].value = "7";
          inputElm[0].dispatchEvent(new Event("change"));
          expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
          expect(scope.value).toBe(5);
          expect(scope.form.alias.$error.step).toBeFalsy();

          inputElm[0].value = "7.5";
          inputElm[0].dispatchEvent(new Event("change"));
          expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
          expect(scope.value).toBe(10);
          expect(scope.form.alias.$error.step).toBeFalsy();
        });

        it("should round the input value to the nearest step when setting the model", () => {
          const formElm = $compile(
            '<form name="form"><input type="range" ng-model="value" name="alias" step="5" /></form>',
          )(scope);
          inputElm = formElm.find("input");

          scope.$apply("value = 10");
          expect(inputElm.val()).toBe("10");
          expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
          expect(scope.value).toBe(10);
          expect(scope.form.alias.$error.step).toBeFalsy();

          scope.$apply("value = 5");
          expect(inputElm.val()).toBe("5");
          expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
          expect(scope.value).toBe(5);
          expect(scope.form.alias.$error.step).toBeFalsy();

          scope.$apply("value = 7.5");
          expect(inputElm.val()).toBe("10");
          expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
          expect(scope.value).toBe(10);
          expect(scope.form.alias.$error.step).toBeFalsy();

          scope.$apply("value = 7");
          expect(inputElm.val()).toBe("5");
          expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
          expect(scope.value).toBe(5);
          expect(scope.form.alias.$error.step).toBeFalsy();

          scope.$apply("value = 9");
          expect(inputElm.val()).toBe("10");
          expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
          expect(scope.value).toBe(10);
          expect(scope.form.alias.$error.step).toBeFalsy();
        });
      });
    });

    describe("email", () => {
      it("should validate e-mail", () => {
        const formElm = $compile(
          '<form name="form">' +
            '<input type="email" ng-model="email" name="alias" />' +
            "</form>",
        )(scope);
        inputElm = formElm.find("input");

        const widget = scope.form.alias;
        inputElm[0].value = "vojta@google.com";
        inputElm[0].dispatchEvent(new Event("change"));

        expect(scope.email).toBe("vojta@google.com");
        expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
        expect(widget.$error.email).toBeFalsy();

        inputElm[0].value = "invalid@";
        inputElm[0].dispatchEvent(new Event("change"));
        expect(scope.email).toBeUndefined();
        expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();
        expect(widget.$error.email).toBeTruthy();
      });

      describe("EMAIL_REGEXP", () => {
        /* global EMAIL_REGEXP: false */
        it("should validate email", () => {
          /* basic functionality */
          expect(EMAIL_REGEXP.test("a@b.com")).toBe(true);
          expect(EMAIL_REGEXP.test("a@b.museum")).toBe(true);
          expect(EMAIL_REGEXP.test("a@B.c")).toBe(true);
          /* domain label separation, hyphen-minus, syntax */
          expect(EMAIL_REGEXP.test("a@b.c.")).toBe(false);
          expect(EMAIL_REGEXP.test("a@.b.c")).toBe(false);
          expect(EMAIL_REGEXP.test("a@-b.c")).toBe(false);
          expect(EMAIL_REGEXP.test("a@b-.c")).toBe(false);
          expect(EMAIL_REGEXP.test("a@b-c")).toBe(true);
          expect(EMAIL_REGEXP.test("a@-")).toBe(false);
          expect(EMAIL_REGEXP.test("a@.")).toBe(false);
          expect(EMAIL_REGEXP.test("a@host_name")).toBe(false);
          /* leading or sole digit */
          expect(EMAIL_REGEXP.test("a@3b.c")).toBe(true);
          expect(EMAIL_REGEXP.test("a@3")).toBe(true);
          /* TLD eMail address */
          expect(EMAIL_REGEXP.test("a@b")).toBe(true);
          /* domain valid characters */
          expect(
            EMAIL_REGEXP.test(
              "a@abcdefghijklmnopqrstuvwxyz-ABCDEFGHIJKLMNOPQRSTUVWXYZ.0123456789",
            ),
          ).toBe(true);
          /* domain invalid characters */
          expect(EMAIL_REGEXP.test("a@")).toBe(false);
          expect(EMAIL_REGEXP.test("a@ ")).toBe(false);
          expect(EMAIL_REGEXP.test("a@!")).toBe(false);
          expect(EMAIL_REGEXP.test('a@"')).toBe(false);
          expect(EMAIL_REGEXP.test("a@#")).toBe(false);
          expect(EMAIL_REGEXP.test("a@$")).toBe(false);
          expect(EMAIL_REGEXP.test("a@%")).toBe(false);
          expect(EMAIL_REGEXP.test("a@&")).toBe(false);
          expect(EMAIL_REGEXP.test("a@'")).toBe(false);
          expect(EMAIL_REGEXP.test("a@(")).toBe(false);
          expect(EMAIL_REGEXP.test("a@)")).toBe(false);
          expect(EMAIL_REGEXP.test("a@*")).toBe(false);
          expect(EMAIL_REGEXP.test("a@+")).toBe(false);
          expect(EMAIL_REGEXP.test("a@,")).toBe(false);
          expect(EMAIL_REGEXP.test("a@/")).toBe(false);
          expect(EMAIL_REGEXP.test("a@:")).toBe(false);
          expect(EMAIL_REGEXP.test("a@;")).toBe(false);
          expect(EMAIL_REGEXP.test("a@<")).toBe(false);
          expect(EMAIL_REGEXP.test("a@=")).toBe(false);
          expect(EMAIL_REGEXP.test("a@>")).toBe(false);
          expect(EMAIL_REGEXP.test("a@?")).toBe(false);
          expect(EMAIL_REGEXP.test("a@@")).toBe(false);
          expect(EMAIL_REGEXP.test("a@[")).toBe(false);
          expect(EMAIL_REGEXP.test("a@\\")).toBe(false);
          expect(EMAIL_REGEXP.test("a@]")).toBe(false);
          expect(EMAIL_REGEXP.test("a@^")).toBe(false);
          expect(EMAIL_REGEXP.test("a@_")).toBe(false);
          expect(EMAIL_REGEXP.test("a@`")).toBe(false);
          expect(EMAIL_REGEXP.test("a@{")).toBe(false);
          expect(EMAIL_REGEXP.test("a@|")).toBe(false);
          expect(EMAIL_REGEXP.test("a@}")).toBe(false);
          expect(EMAIL_REGEXP.test("a@~")).toBe(false);
          expect(EMAIL_REGEXP.test("a@İ")).toBe(false);
          expect(EMAIL_REGEXP.test("a@ı")).toBe(false);
          /* domain length, label and total */
          expect(
            EMAIL_REGEXP.test(
              "a@xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
            ),
          ).toBe(true);
          expect(
            EMAIL_REGEXP.test(
              "a@xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
            ),
          ).toBe(false);
          expect(
            EMAIL_REGEXP.test(
              "a@xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
            ),
          ).toBe(true);
          expect(
            EMAIL_REGEXP.test(
              "a@xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.x",
            ),
          ).toBe(true);
          expect(
            EMAIL_REGEXP.test(
              "a@xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.xx",
            ),
          ).toBe(false);
          expect(
            EMAIL_REGEXP.test(
              "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa@xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.xx",
            ),
          ).toBe(true);
          expect(
            EMAIL_REGEXP.test(
              "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa@xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.xxx",
            ),
          ).toBe(false);
          /* eslint-enable */
          /* local-part valid characters and dot-atom syntax */
          expect(EMAIL_REGEXP.test("'@x")).toBe(true);
          expect(
            EMAIL_REGEXP.test(
              "-!#$%&*+/0123456789=?ABCDEFGHIJKLMNOPQRSTUVWXYZ@x",
            ),
          ).toBe(true);
          expect(EMAIL_REGEXP.test("^_`abcdefghijklmnopqrstuvwxyz{|}~@x")).toBe(
            true,
          );
          expect(EMAIL_REGEXP.test(".@x")).toBe(false);
          expect(EMAIL_REGEXP.test("'.@x")).toBe(false);
          expect(EMAIL_REGEXP.test(".'@x")).toBe(false);
          expect(EMAIL_REGEXP.test("'.'@x")).toBe(true);
          /* local-part invalid characters */
          expect(EMAIL_REGEXP.test("@x")).toBe(false);
          expect(EMAIL_REGEXP.test(" @x")).toBe(false);
          expect(EMAIL_REGEXP.test('"@x')).toBe(false);
          expect(EMAIL_REGEXP.test("(@x")).toBe(false);
          expect(EMAIL_REGEXP.test(")@x")).toBe(false);
          expect(EMAIL_REGEXP.test(",@x")).toBe(false);
          expect(EMAIL_REGEXP.test(":@x")).toBe(false);
          expect(EMAIL_REGEXP.test(";@x")).toBe(false);
          expect(EMAIL_REGEXP.test("<@x")).toBe(false);
          expect(EMAIL_REGEXP.test(">@x")).toBe(false);
          expect(EMAIL_REGEXP.test("@@x")).toBe(false);
          expect(EMAIL_REGEXP.test("[@x")).toBe(false);
          expect(EMAIL_REGEXP.test("\\@x")).toBe(false);
          expect(EMAIL_REGEXP.test("]@x")).toBe(false);
          expect(EMAIL_REGEXP.test("İ@x")).toBe(false);
          expect(EMAIL_REGEXP.test("ı@x")).toBe(false);
          /* local-part size limit */
          expect(
            EMAIL_REGEXP.test(
              "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx@x",
            ),
          ).toBe(true);
          expect(
            EMAIL_REGEXP.test(
              "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx@x",
            ),
          ).toBe(false);
          /* content (local-part + ‘@’ + domain) is required */
          expect(EMAIL_REGEXP.test("")).toBe(false);
          expect(EMAIL_REGEXP.test("a")).toBe(false);
          expect(EMAIL_REGEXP.test("aa")).toBe(false);
        });
      });
    });

    describe("url", () => {
      it("should validate url", () => {
        const formElm = $compile(
          '<form name="form">' +
            '<input type="url" ng-model="url" name="alias" />',
          +"</form>",
        )(scope);
        inputElm = formElm.find("input");

        const widget = scope.form.alias;

        inputElm[0].value = "http://www.something.com";
        inputElm[0].dispatchEvent(new Event("change"));
        expect(scope.url).toBe("http://www.something.com");
        expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
        expect(widget.$error.url).toBeFalsy();

        inputElm[0].value = "invalid.com";
        inputElm[0].dispatchEvent(new Event("change"));
        expect(scope.url).toBeUndefined();
        expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();
        expect(widget.$error.url).toBeTruthy();
      });

      describe("URL_REGEXP", () => {
        // See valid URLs in RFC3987 (http://tools.ietf.org/html/rfc3987)
        // Note: We are being more lenient, because browsers are too.
        const urls = [
          ["scheme://hostname", true],
          [
            "scheme://username:password@host.name:7678/pa/t.h?q=u&e=r&y#fragment",
            true,
          ],

          // Validating `scheme`
          ["://example.com", false],
          ["0scheme://example.com", false],
          [".scheme://example.com", false],
          ["+scheme://example.com", false],
          ["-scheme://example.com", false],
          ["_scheme://example.com", false],
          ["scheme0://example.com", true],
          ["scheme.://example.com", true],
          ["scheme+://example.com", true],
          ["scheme-://example.com", true],
          ["scheme_://example.com", false],

          // Validating `:` and `/` after `scheme`
          ["scheme//example.com", false],
          ["scheme:example.com", true],
          ["scheme:/example.com", true],
          ["scheme:///example.com", true],

          // Validating `username` and `password`
          ["scheme://@example.com", true],
          ["scheme://username@example.com", true],
          ["scheme://u0s.e+r-n_a~m!e@example.com", true],
          ["scheme://u#s$e%r^n&a*m;e@example.com", true],
          ["scheme://:password@example.com", true],
          ["scheme://username:password@example.com", true],
          ["scheme://username:pass:word@example.com", true],
          ["scheme://username:p0a.s+s-w_o~r!d@example.com", true],
          ["scheme://username:p#a$s%s^w&o*r;d@example.com", true],

          // Validating `hostname`
          ["scheme:", false], // Chrome, FF: true
          ["scheme://", false], // Chrome, FF: true
          ["scheme:// example.com:", false], // Chrome, FF: true
          ["scheme://example com:", false], // Chrome, FF: true
          ["scheme://:", false], // Chrome, FF: true
          ["scheme://?", false], // Chrome, FF: true
          ["scheme://#", false], // Chrome, FF: true
          ["scheme://username:password@:", false], // Chrome, FF: true
          ["scheme://username:password@/", false], // Chrome, FF: true
          ["scheme://username:password@?", false], // Chrome, FF: true
          ["scheme://username:password@#", false], // Chrome, FF: true
          ["scheme://host.name", true],
          ["scheme://123.456.789.10", true],
          ["scheme://[1234:0000:0000:5678:9abc:0000:0000:def]", true],
          ["scheme://[1234:0000:0000:5678:9abc:0000:0000:def]:7678", true],
          ["scheme://[1234:0:0:5678:9abc:0:0:def]", true],
          ["scheme://[1234::5678:9abc::def]", true],
          ["scheme://~`!@$%^&*-_=+|\\;'\",.()[]{}<>", true],

          // Validating `port`
          ["scheme://example.com/no-port", true],
          ["scheme://example.com:7678", true],
          ["scheme://example.com:76T8", false], // Chrome, FF: true
          ["scheme://example.com:port", false], // Chrome, FF: true

          // Validating `path`
          ["scheme://example.com/", true],
          ["scheme://example.com/path", true],
          ["scheme://example.com/path/~`!@$%^&*-_=+|\\;:'\",./()[]{}<>", true],

          // Validating `query`
          ["scheme://example.com?query", true],
          ["scheme://example.com/?query", true],
          ["scheme://example.com/path?query", true],
          ["scheme://example.com/path?~`!@$%^&*-_=+|\\;:'\",.?/()[]{}<>", true],

          // Validating `fragment`
          ["scheme://example.com#fragment", true],
          ["scheme://example.com/#fragment", true],
          ["scheme://example.com/path#fragment", true],
          ["scheme://example.com/path/#fragment", true],
          ["scheme://example.com/path?query#fragment", true],
          [
            "scheme://example.com/path?query#~`!@#$%^&*-_=+|\\;:'\",.?/()[]{}<>",
            true,
          ],

          // Validating miscellaneous
          ["scheme://☺.✪.⌘.➡/䨹", true],
          ["scheme://مثال.إختبار", true],
          ["scheme://例子.测试", true],
          ["scheme://उदाहरण.परीक्षा", true],

          // Legacy tests
          ["http://server:123/path", true],
          ["https://server:123/path", true],
          ["file:///home/user", true],
          ["mailto:user@example.com?subject=Foo", true],
          ["r2-d2.c3-p0://localhost/foo", true],
          ["abc:/foo", true],
          ["http://example.com/path;path", true],
          ["http://example.com/[]$'()*,~)", true],
          ["http:", false], // FF: true
          ["a@B.c", false],
          ["a_B.c", false],
          ["0scheme://example.com", false],
          ["http://example.com:9999/``", true],
        ].forEach((item) => {
          it("should validate url: $prop", () => {
            const url = item[0];
            const valid = item[1];

            /* global URL_REGEXP: false */
            expect(URL_REGEXP.test(url)).toBe(valid);
          });
        });
      });
    });

    describe("radio", () => {
      ["click", "change"].forEach((event) => {
        it("should update the model on $prop event", () => {
          inputElm = $compile(
            '<input type="radio" ng-model="color" value="white" />' +
              '<input type="radio" ng-model="color" value="red" />' +
              '<input type="radio" ng-model="color" value="blue" />',
          )(scope);

          scope.$apply("color = 'white'");
          expect(inputElm[0].checked).toBe(true);
          expect(inputElm[1].checked).toBe(false);
          expect(inputElm[2].checked).toBe(false);

          scope.$apply("color = 'red'");
          expect(inputElm[0].checked).toBe(false);
          expect(inputElm[1].checked).toBe(true);
          expect(inputElm[2].checked).toBe(false);

          if (event === "change") inputElm[2].checked = true;
          if (event === "click") inputElm[2].click();
          inputElm[2].dispatchEvent(new Event("change"));
          expect(scope.color).toBe("blue");
        });
      });

      it("should treat the value as a string when evaluating checked-ness", () => {
        inputElm = $compile(
          '<input type="radio" ng-model="model" value="0" />',
        )(scope);

        scope.$apply("model = '0'");
        expect(inputElm[0].checked).toBe(true);

        scope.$apply("model = 0");
        expect(inputElm[0].checked).toBe(false);
      });

      it("should allow {{expr}} as value", () => {
        scope.some = 11;
        inputElm = $compile(
          '<input type="radio" ng-model="value" value="{{some}}" />' +
            '<input type="radio" ng-model="value" value="{{other}}" />',
        )(scope);

        scope.$apply(() => {
          scope.value = "blue";
          scope.some = "blue";
          scope.other = "red";
        });

        expect(inputElm[0].checked).toBe(true);
        expect(inputElm[1].checked).toBe(false);

        inputElm[1].click();
        inputElm[1].dispatchEvent(new Event("change"));
        expect(scope.value).toBe("red");

        scope.$apply("other = 'non-red'");

        expect(inputElm[0].checked).toBe(false);
        expect(inputElm[1].checked).toBe(false);
      });

      it("should allow the use of ngTrim", () => {
        scope.some = 11;
        inputElm = $compile(
          '<input type="radio" ng-model="value" value="opt1" />' +
            '<input type="radio" ng-model="value" value="  opt2  " />' +
            '<input type="radio" ng-model="value" ng-trim="false" value="  opt3  " />' +
            '<input type="radio" ng-model="value" ng-trim="false" value="{{some}}" />' +
            '<input type="radio" ng-model="value" ng-trim="false" value="  {{some}}  " />',
        )(scope);

        scope.$apply(() => {
          scope.value = "blue";
          scope.some = "blue";
        });

        expect(inputElm[0].checked).toBe(false);
        expect(inputElm[1].checked).toBe(false);
        expect(inputElm[2].checked).toBe(false);
        expect(inputElm[3].checked).toBe(true);
        expect(inputElm[4].checked).toBe(false);

        inputElm[1].click();
        inputElm[1].dispatchEvent(new Event("change"));
        expect(scope.value).toBe("opt2");
        inputElm[2].click();
        inputElm[2].dispatchEvent(new Event("change"));
        expect(scope.value).toBe("  opt3  ");
        inputElm[3].click();
        inputElm[3].dispatchEvent(new Event("change"));
        expect(scope.value).toBe("blue");
        inputElm[4].click();
        inputElm[4].dispatchEvent(new Event("change"));
        expect(scope.value).toBe("  blue  ");

        scope.$apply("value = '  opt2  '");
        expect(inputElm[1].checked).toBe(false);
        scope.$apply("value = 'opt2'");
        expect(inputElm[1].checked).toBe(true);
        scope.$apply("value = '  opt3  '");
        expect(inputElm[2].checked).toBe(true);
        scope.$apply("value = 'opt3'");
        expect(inputElm[2].checked).toBe(false);

        scope.$apply("value = 'blue'");
        expect(inputElm[3].checked).toBe(true);
        expect(inputElm[4].checked).toBe(false);
        scope.$apply("value = '  blue  '");
        expect(inputElm[3].checked).toBe(false);
        expect(inputElm[4].checked).toBe(true);
      });
    });

    describe("checkbox", () => {
      it("should ignore checkbox without ngModel directive", () => {
        inputElm = $compile(
          '<input type="checkbox" name="whatever" required />',
        )(scope);

        inputElm[0].value = "";
        inputElm[0].dispatchEvent(new Event("change"));
        expect(inputElm[0].classList.contains("ng-valid")).toBe(false);
        expect(inputElm[0].classList.contains("ng-invalid")).toBe(false);
        expect(inputElm[0].classList.contains("ng-pristine")).toBe(false);
        expect(inputElm[0].classList.contains("ng-dirty")).toBe(false);
      });

      ["click", "change"].forEach((event) => {
        it("should update the model on $prop event", () => {
          inputElm = $compile('<input type="checkbox" ng-model="checkbox" />')(
            scope,
          );

          expect(inputElm[0].checked).toBe(false);

          scope.$apply("checkbox = true");
          expect(inputElm[0].checked).toBe(true);

          scope.$apply("checkbox = false");
          expect(inputElm[0].checked).toBe(false);

          if (event === "change") inputElm[0].checked = true;
          if (event === "click") inputElm[0].click();
          inputElm[0].dispatchEvent(new Event("change"));
          expect(scope.checkbox).toBe(true);
        });
      });

      it("should format booleans", () => {
        inputElm = $compile('<input type="checkbox" ng-model="name" />')(scope);

        scope.$apply("name = false");
        expect(inputElm[0].checked).toBe(false);

        scope.$apply("name = true");
        expect(inputElm[0].checked).toBe(true);
      });

      it('should support type="checkbox" with non-standard capitalization', () => {
        inputElm = $compile('<input type="checkBox" ng-model="checkbox" />')(
          scope,
        );

        inputElm[0].click();
        inputElm[0].dispatchEvent(new Event("change"));
        expect(scope.checkbox).toBe(true);

        inputElm[0].click();
        inputElm[0].dispatchEvent(new Event("change"));
        expect(scope.checkbox).toBe(false);
      });

      it("should allow custom enumeration", () => {
        inputElm = $compile(
          '<input type="checkbox" ng-model="name" ng-true-value="\'y\'" ' +
            "ng-false-value=\"'n'\">",
        )(scope);

        scope.$apply("name = 'y'");
        expect(inputElm[0].checked).toBe(true);

        scope.$apply("name = 'n'");
        expect(inputElm[0].checked).toBe(false);

        scope.$apply("name = 'something else'");
        expect(inputElm[0].checked).toBe(false);

        inputElm[0].click();
        inputElm[0].dispatchEvent(new Event("change"));
        expect(scope.name).toEqual("y");

        inputElm[0].click();
        inputElm[0].dispatchEvent(new Event("change"));
        expect(scope.name).toEqual("n");
      });

      it("should throw if ngTrueValue is present and not a constant expression", () => {
        expect(() => {
          inputElm = $compile(
            '<input type="checkbox" ng-model="value" ng-true-value="yes" />',
          )(scope);
        }).toThrowError(/constexpr/);
      });

      it("should throw if ngFalseValue is present and not a constant expression", () => {
        expect(() => {
          inputElm = $compile(
            '<input type="checkbox" ng-model="value" ng-false-value="no" />',
          )(scope);
        }).toThrowError(/constexpr/);
      });

      it("should not throw if ngTrueValue or ngFalseValue are not present", () => {
        expect(() => {
          inputElm = $compile('<input type="checkbox" ng-model="value" />')(
            scope,
          );
        }).not.toThrow();
      });

      it("should be required if false", () => {
        inputElm = $compile(
          '<input type="checkbox" ng-model="value" required />',
        )(scope);

        inputElm[0].click();
        inputElm[0].dispatchEvent(new Event("change"));
        expect(inputElm[0].checked).toBe(true);
        expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();

        inputElm[0].click();
        inputElm[0].dispatchEvent(new Event("change"));
        expect(inputElm[0].checked).toBe(false);
        expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();
      });

      it('should pass validation for "required" when trueValue is a string', () => {
        const formElm = $compile(
          '<form name="form">' +
            '<input type="checkbox" required name="cb" ng-model="value" ng-true-value="\'yes\'" />' +
            "</form>",
        )(scope);
        inputElm = formElm.find("input");

        expect(inputElm[0].classList.contains("ng-invalid")).toBeTrue();
        expect(scope.form.cb.$error.required).toBe(true);

        inputElm[0].click();
        inputElm[0].dispatchEvent(new Event("change"));
        expect(inputElm[0].checked).toBe(true);
        expect(inputElm[0].classList.contains("ng-valid")).toBeTrue();
        expect(scope.form.cb.$error.required).toBeUndefined();
      });
    });

    describe("textarea", () => {
      it("should process textarea", () => {
        inputElm = $compile('<textarea ng-model="name"></textarea>')(scope);

        scope.$apply("name = 'Adam'");
        expect(inputElm.val()).toEqual("Adam");

        inputElm[0].value = "Shyam";
        inputElm[0].dispatchEvent(new Event("change"));
        expect(scope.name).toEqual("Shyam");

        inputElm[0].value = "Kai";
        inputElm[0].dispatchEvent(new Event("change"));
        expect(scope.name).toEqual("Kai");
      });

      it("should ignore textarea without ngModel directive", () => {
        inputElm = $compile('<textarea name="whatever" required></textarea>')(
          scope,
        );

        inputElm[0].value = "";
        inputElm[0].dispatchEvent(new Event("change"));
        expect(inputElm[0].classList.contains("ng-valid")).toBe(false);
        expect(inputElm[0].classList.contains("ng-invalid")).toBe(false);
        expect(inputElm[0].classList.contains("ng-pristine")).toBe(false);
        expect(inputElm[0].classList.contains("ng-dirty")).toBe(false);
      });
    });

    describe("ngValue", () => {
      it('should update the dom "value" property and attribute', () => {
        inputElm = $compile('<input type="submit" ng-value="value">')(scope);

        scope.$apply("value = 'something'");

        expect(inputElm[0].value).toBe("something");
        expect(inputElm[0].getAttribute("value")).toBe("something");
      });

      it('should clear the "dom" value property and attribute when the value is undefined', () => {
        inputElm = $compile('<input type="text" ng-value="value">')(scope);

        scope.$apply('value = "something"');

        expect(inputElm[0].value).toBe("something");
        expect(inputElm[0].getAttribute("value")).toBe("something");

        scope.$apply(() => {
          delete scope.value;
        });

        expect(inputElm[0].value).toBe("");
        // Support: IE 9-11, Edge
        // In IE it is not possible to remove the `value` attribute from an input element.
        expect(inputElm[0].getAttribute("value")).toBeNull();
        // } else {
        //   // Support: IE 9-11, Edge
        //   // This will fail if the Edge bug gets fixed
        //   expect(inputElm[0].getAttribute("value")).toBe("something");
        // }
      });

      // they(
      //   'should update the $prop "value" property and attribute after the bound expression changes',
      //   {
      //     input: '<input type="text" ng-value="value">',
      //     textarea: '<textarea ng-value="value"></textarea>',
      //   },
      //   (tmpl) => {
      //     const element = $compile(tmpl)(scope);

      //     helper.changeInputValueTo("newValue");
      //     expect(element[0].value).toBe("newValue");
      //     expect(element[0].getAttribute("value")).toBeNull();

      //     scope.$apply(() => {
      //       scope.value = "anotherValue";
      //     });
      //     expect(element[0].value).toBe("anotherValue");
      //     expect(element[0].getAttribute("value")).toBe("anotherValue");
      //   },
      // );

      it("should evaluate and set constant expressions", () => {
        inputElm = $compile(
          '<input type="radio" ng-model="selected" ng-value="true">' +
            '<input type="radio" ng-model="selected" ng-value="false">' +
            '<input type="radio" ng-model="selected" ng-value="1">',
        )(scope);

        inputElm[0].click();
        inputElm[0].dispatchEvent(new Event("change"));
        expect(scope.selected).toBe(true);

        inputElm[1].click();
        inputElm[1].dispatchEvent(new Event("change"));
        expect(scope.selected).toBe(false);

        inputElm[2].click();
        inputElm[2].dispatchEvent(new Event("change"));
        expect(scope.selected).toBe(1);
      });

      it("should use strict comparison between model and value", () => {
        scope.selected = false;
        inputElm = $compile(
          '<input type="radio" ng-model="selected" ng-value="false">' +
            '<input type="radio" ng-model="selected" ng-value="\'\'">' +
            '<input type="radio" ng-model="selected" ng-value="0">',
        )(scope);
        expect(inputElm[0].checked).toBe(true);
        expect(inputElm[1].checked).toBe(false);
        expect(inputElm[2].checked).toBe(false);
      });

      it("should watch the expression", () => {
        inputElm = $compile(
          '<input type="radio" ng-model="selected" ng-value="value">',
        )(scope);

        scope.$apply(() => {
          scope.selected = scope.value = { some: "object" };
        });
        expect(inputElm[0].checked).toBe(true);

        scope.$apply(() => {
          scope.value = { some: "other" };
        });
        expect(inputElm[0].checked).toBe(false);

        inputElm[0].click();
        inputElm[0].dispatchEvent(new Event("change"));
        expect(scope.selected).toBe(scope.value);
      });

      it("should work inside ngRepeat", () => {
        inputElm = $compile(
          '<div><input type="radio" ng-repeat="i in items" ng-model="$parent.selected" ng-value="i.id"></div>',
        )(scope);

        scope.$apply(() => {
          scope.items = [{ id: 1 }, { id: 2 }];
          scope.selected = 1;
        });

        expect(inputElm[0].children[0].checked).toBe(true);
        expect(inputElm[0].children[1].checked).toBe(false);

        inputElm[0].children[1].click();
        inputElm[0].children[1].dispatchEvent(new Event("change"));

        expect(scope.selected).toBe(2);
      });
    });

    describe("password", () => {
      // Under no circumstances should input[type=password] trim inputs
      it("should not trim if ngTrim is unspecified", () => {
        inputElm = $compile('<input type="password" ng-model="password">')(
          scope,
        );

        inputElm[0].value = " - - untrimmed - - ";
        inputElm[0].dispatchEvent(new Event("change"));
        expect(scope.password.length).toBe(" - - untrimmed - - ".length);
      });

      it("should not trim if ngTrim !== false", () => {
        inputElm = $compile(
          '<input type="password" ng-model="password" ng-trim="true">',
        )(scope);
        inputElm[0].value = " - - untrimmed - - ";
        inputElm[0].dispatchEvent(new Event("change"));
        expect(scope.password.length).toBe(" - - untrimmed - - ".length);
      });

      it("should not trim if ngTrim === false", () => {
        inputElm = $compile(
          '<input type="password" ng-model="password" ng-trim="false">',
        )(scope);
        inputElm[0].value = " - - untrimmed - - ";
        inputElm[0].dispatchEvent(new Event("change"));
        expect(scope.password.length).toBe(" - - untrimmed - - ".length);
      });
    });
  });
});
