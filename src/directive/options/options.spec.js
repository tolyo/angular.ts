import { createInjector } from "../../core/di/injector";
import { JQLite, dealoc } from "../../shared/jqlite/jqlite.js";
import { Angular } from "../../loader";
import {
  isBoolean,
  hashKey,
  equals,
  isString,
  isFunction,
} from "../../shared/utils";
import { browserTrigger } from "../../shared/test-utils";

describe("ngOptions", () => {
  let scope;
  let formElement;
  let element;
  let $compile;
  let linkLog;
  let childListMutationObserver;
  let ngModelCtrl;
  let injector;

  function compile(html) {
    formElement = JQLite(`<form name="form">${html}</form>`);
    element = formElement.find("select");
    $compile(formElement)(scope);
    ngModelCtrl = element.controller("ngModel");
    scope.$apply();
  }

  function setSelectValue(selectElement, optionIndex) {
    const option = selectElement.find("option").eq(optionIndex);
    selectElement.val(option.val());
    browserTrigger(element, "change");
  }

  beforeEach(() => {
    jasmine.addMatchers({
      toEqualSelectValue() {
        return {
          compare(_actual_, value, multiple) {
            const errors = [];
            let actual = _actual_.val();

            if (multiple) {
              value = value.map((val) => hashKey(val));
              actual = actual || [];
            } else {
              value = hashKey(value);
            }

            if (!equals(actual, value)) {
              errors.push(
                `Expected select value "${actual}" to equal "${value}"`,
              );
            }
            const message = function () {
              return errors.join("\n");
            };

            return { pass: errors.length === 0, message };
          },
        };
      },
      toEqualOption() {
        return {
          compare(actual, value, text, label) {
            const errors = [];
            const hash = hashKey(value);
            if (actual.attr("value") !== hash) {
              errors.push(
                `Expected option value "${actual.attr("value")}" to equal "${hash}"`,
              );
            }
            if (text && actual.text() !== text) {
              errors.push(
                `Expected option text "${actual.text()}" to equal "${text}"`,
              );
            }
            if (label && actual.attr("label") !== label) {
              errors.push(
                `Expected option label "${actual.attr("label")}" to equal "${label}"`,
              );
            }

            const message = function () {
              return errors.join("\n");
            };

            return { pass: errors.length === 0, message };
          },
        };
      },
      toEqualTrackedOption() {
        return {
          compare(actual, value, text, label) {
            const errors = [];
            if (actual.attr("value") !== `${value}`) {
              errors.push(
                `Expected option value "${actual.attr("value")}" to equal "${value}"`,
              );
            }
            if (text && actual.text() !== text) {
              errors.push(
                `Expected option text "${actual.text()}" to equal "${text}"`,
              );
            }
            if (label && actual.attr("label") !== label) {
              errors.push(
                `Expected option label "${actual.attr("label")}" to equal "${label}"`,
              );
            }

            const message = function () {
              return errors.join("\n");
            };

            return { pass: errors.length === 0, message };
          },
        };
      },
      toEqualUnknownOption() {
        return {
          compare(actual) {
            const errors = [];
            if (actual.attr("value") !== "?") {
              errors.push(
                `Expected option value "${actual.attr("value")}" to equal "?"`,
              );
            }

            const message = function () {
              return errors.join("\n");
            };

            return { pass: errors.length === 0, message };
          },
        };
      },
      toEqualUnknownValue() {
        return {
          compare(actual, value) {
            const errors = [];
            if (actual !== "?") {
              errors.push(`Expected select value "${actual}" to equal "?"`);
            }

            const message = function () {
              return errors.join("\n");
            };

            return { pass: errors.length === 0, message };
          },
        };
      },
    });
  });

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
      ($compileProvider, $provide) => {
        linkLog = [];

        $compileProvider
          .directive("customSelect", () => ({
            restrict: "E",
            replace: true,
            scope: {
              ngModel: "=",
              options: "=",
            },
            templateUrl: "select_template.html",
            link(scope, $element, attributes) {
              scope.selectable_options = scope.options;
            },
          }))

          .directive("oCompileContents", () => ({
            link(scope, element) {
              linkLog.push("linkCompileContents");
              $compile(JQLite(element[0].childNodes))(scope);
            },
          }))

          .directive("observeChildList", () => ({
            link(scope, element) {
              const config = { childList: true };

              childListMutationObserver = new window.MutationObserver(() => {});
              childListMutationObserver.observe(element[0], config);
            },
          }));

        $provide.decorator("ngOptionsDirective", ($delegate) => {
          const origPreLink = $delegate[0].link.pre;
          const origPostLink = $delegate[0].link.post;

          $delegate[0].compile = function () {
            return {
              pre: origPreLink,
              post() {
                linkLog.push("linkNgOptions");
                origPostLink.apply(this, arguments);
              },
            };
          };

          return $delegate;
        });
      },
    ]);
    $compile = injector.get("$compile");
    scope = injector.get("$rootScope").$new(); // create a child scope because the root scope can't be $destroy-ed
    formElement = element = null;
  });

  afterEach(() => {
    scope.$destroy(); // disables unknown option work during destruction
    dealoc(formElement);
    ngModelCtrl = null;
  });

  function createSelect(attrs, blank, unknown) {
    let html = "<select";
    Object.entries(attrs).forEach(([key, value]) => {
      if (isBoolean(value)) {
        if (value) html += ` ${key}`;
      } else {
        html += ` ${key}="${value}"`;
      }
    });
    html += `>${
      blank ? (isString(blank) ? blank : '<option value="">blank</option>') : ""
    }${
      unknown
        ? isString(unknown)
          ? unknown
          : '<option value="?">unknown</option>'
        : ""
    }</select>`;

    compile(html);
  }

  function createSingleSelect(blank, unknown) {
    createSelect(
      {
        "ng-model": "selected",
        "ng-options": "value.name for value in values",
      },
      blank,
      unknown,
    );
  }

  function createMultiSelect(blank, unknown) {
    createSelect(
      {
        "ng-model": "selected",
        multiple: true,
        "ng-options": "value.name for value in values",
      },
      blank,
      unknown,
    );
  }

  it('should throw when not formated "? for ? in ?"', () => {
    expect(() => {
      compile(
        '<select ng-model="selected" ng-options="i dont parse"></select>',
      );
    }).toThrowError(/iexp/);
  });

  it("should have a dependency on ngModel", () => {
    expect(() => {
      compile('<select ng-options="item in items"></select>');
    }).toThrow();
  });

  it("should render a list", () => {
    createSingleSelect();

    scope.$apply(() => {
      scope.values = [{ name: "A" }, { name: "B" }, { name: "C" }];
      scope.selected = scope.values[1];
    });

    const options = element.find("option");
    expect(options.length).toEqual(3);
    expect(options.eq(0)).toEqualOption(scope.values[0], "A");
    expect(options.eq(1)).toEqualOption(scope.values[1], "B");
    expect(options.eq(2)).toEqualOption(scope.values[2], "C");
    expect(options[1].selected).toEqual(true);
  });

  it("should not include properties with non-numeric keys in array-like collections when using array syntax", () => {
    createSelect({
      "ng-model": "selected",
      "ng-options": "value for value in values",
    });

    scope.$apply(() => {
      scope.values = { 0: "X", 1: "Y", 2: "Z", a: "A", length: 3 };
      scope.selected = scope.values[1];
    });

    const options = element.find("option");
    expect(options.length).toEqual(3);
    expect(options.eq(0)).toEqualOption("X");
    expect(options.eq(1)).toEqualOption("Y");
    expect(options.eq(2)).toEqualOption("Z");
  });

  it("should include properties with non-numeric keys in array-like collections when using object syntax", () => {
    createSelect({
      "ng-model": "selected",
      "ng-options": "value for (key, value) in values",
    });

    scope.$apply(() => {
      scope.values = { 0: "X", 1: "Y", 2: "Z", a: "A", length: 3 };
      scope.selected = scope.values[1];
    });

    const options = element.find("option");
    expect(options.length).toEqual(5);
    expect(options.eq(0)).toEqualOption("X");
    expect(options.eq(1)).toEqualOption("Y");
    expect(options.eq(2)).toEqualOption("Z");
    expect(options.eq(3)).toEqualOption("A");
    expect(options.eq(4)).toEqualOption(3);
  });

  it("should render an object", () => {
    createSelect({
      "ng-model": "selected",
      "ng-options": "value as key for (key, value) in object",
    });

    scope.$apply(() => {
      scope.object = { red: "FF0000", green: "00FF00", blue: "0000FF" };
      scope.selected = scope.object.green;
    });

    let options = element.find("option");
    expect(options.length).toEqual(3);
    expect(options.eq(0)).toEqualOption("FF0000", "red");
    expect(options.eq(1)).toEqualOption("00FF00", "green");
    expect(options.eq(2)).toEqualOption("0000FF", "blue");
    expect(options[1].selected).toEqual(true);
    scope.$apply('object.azur = "8888FF"');

    options = element.find("option");
    expect(options[1].selected).toEqual(true);

    scope.$apply("selected = object.azur");

    options = element.find("option");
    expect(options[3].selected).toEqual(true);
  });

  it('should set the "selected" attribute and property on selected options', () => {
    scope.values = [
      {
        id: "FF0000",
        display: "red",
      },
      {
        id: "0000FF",
        display: "blue",
      },
    ];
    scope.selected = "FF0000";

    createSelect({
      "ng-model": "selected",
      "ng-options": "option.id as option.display for option in values",
    });
    const options = element.find("option");
    expect(options.length).toEqual(2);
    expect(options.eq(0)).toEqualOption("FF0000", "red");
    expect(options.eq(1)).toEqualOption("0000FF", "blue");

    expect(options.eq(0)[0].getAttribute("selected")).toBe("selected");
    expect(options.eq(0).attr("selected")).toBe("selected");
    expect(options.eq(0)[0].selected).toBe(true);
    expect(options.eq(0)[0].selected).toBe(true);

    scope.selected = "0000FF";
    expect(options.eq(1)[0].getAttribute("selected")).toBe("selected");
    expect(options.eq(1).attr("selected")).toBe("selected");
    expect(options.eq(1)[0].selected).toBe(true);
    expect(options.eq(1)[0].selected).toBe(true);
  });

  it("should render zero as a valid display value", () => {
    createSingleSelect();

    scope.$apply(() => {
      scope.values = [{ name: 0 }, { name: 1 }, { name: 2 }];
      scope.selected = scope.values[0];
    });

    const options = element.find("option");
    expect(options.length).toEqual(3);
    expect(options.eq(0)).toEqualOption(scope.values[0], "0");
    expect(options.eq(1)).toEqualOption(scope.values[1], "1");
    expect(options.eq(2)).toEqualOption(scope.values[2], "2");
  });

  it("should not be set when an option is selected and options are set asynchronously", (done) => {
    element = $compile(
      '<select ng-model="model" ng-options="opt.id as opt.label for opt in options">' +
        "</select>",
    )(scope);

    scope.$apply(() => {
      scope.model = 0;
    });

    setTimeout(() => {
      scope.options = [
        { id: 0, label: "x" },
        { id: 1, label: "y" },
      ];
      const options = element.find("option");
      expect(options.length).toEqual(2);
      expect(options.eq(0)).toEqualOption(0, "x");
      expect(options.eq(1)).toEqualOption(1, "y");
      done();
    }, 0);
  });

  it("should grow list", () => {
    createSingleSelect();

    scope.$apply(() => {
      scope.values = [];
    });

    expect(element.find("option").length).toEqual(1); // because we add special unknown option
    expect(element.find("option").eq(0)).toEqualUnknownOption();

    scope.$apply(() => {
      scope.values.push({ name: "A" });
      scope.selected = scope.values[0];
    });

    expect(element.find("option").length).toEqual(1);
    expect(element.find("option")).toEqualOption(scope.values[0], "A");

    scope.$apply(() => {
      scope.values.push({ name: "B" });
    });

    expect(element.find("option").length).toEqual(2);
    expect(element.find("option").eq(0)).toEqualOption(scope.values[0], "A");
    expect(element.find("option").eq(1)).toEqualOption(scope.values[1], "B");
  });

  it("should shrink list", () => {
    createSingleSelect();

    scope.$apply(() => {
      scope.values = [{ name: "A" }, { name: "B" }, { name: "C" }];
      scope.selected = scope.values[0];
    });

    expect(element.find("option").length).toEqual(3);

    scope.$apply(() => {
      scope.values.pop();
    });

    expect(element.find("option").length).toEqual(2);
    expect(element.find("option").eq(0)).toEqualOption(scope.values[0], "A");
    expect(element.find("option").eq(1)).toEqualOption(scope.values[1], "B");

    scope.$apply(() => {
      scope.values.pop();
    });

    expect(element.find("option").length).toEqual(1);
    expect(element.find("option")).toEqualOption(scope.values[0], "A");

    scope.$apply(() => {
      scope.values.pop();
      scope.selected = null;
    });

    expect(element.find("option").length).toEqual(1); // we add back the special empty option
  });

  it("should shrink and then grow list", () => {
    createSingleSelect();

    scope.$apply(() => {
      scope.values = [{ name: "A" }, { name: "B" }, { name: "C" }];
      scope.selected = scope.values[0];
    });

    expect(element.find("option").length).toEqual(3);

    scope.$apply(() => {
      scope.values = [{ name: "1" }, { name: "2" }];
      scope.selected = scope.values[0];
    });

    expect(element.find("option").length).toEqual(2);

    scope.$apply(() => {
      scope.values = [{ name: "A" }, { name: "B" }, { name: "C" }];
      scope.selected = scope.values[0];
    });

    expect(element.find("option").length).toEqual(3);
  });

  it("should update list", () => {
    createSingleSelect();

    scope.$apply(() => {
      scope.values = [{ name: "A" }, { name: "B" }, { name: "C" }];
      scope.selected = scope.values[0];
    });

    scope.$apply(() => {
      scope.values = [{ name: "B" }, { name: "C" }, { name: "D" }];
      scope.selected = scope.values[0];
    });

    const options = element.find("option");
    expect(options.length).toEqual(3);
    expect(options.eq(0)).toEqualOption(scope.values[0], "B");
    expect(options.eq(1)).toEqualOption(scope.values[1], "C");
    expect(options.eq(2)).toEqualOption(scope.values[2], "D");
  });

  it("should preserve pre-existing empty option", () => {
    createSingleSelect(true);

    scope.$apply(() => {
      scope.values = [];
    });
    expect(element.find("option").length).toEqual(1);

    scope.$apply(() => {
      scope.values = [{ name: "A" }];
      scope.selected = scope.values[0];
    });

    expect(element.find("option").length).toEqual(2);
    expect(JQLite(element.find("option")[0]).text()).toEqual("blank");
    expect(JQLite(element.find("option")[1]).text()).toEqual("A");

    scope.$apply(() => {
      scope.values = [];
      scope.selected = null;
    });

    expect(element.find("option").length).toEqual(1);
    expect(JQLite(element.find("option")[0]).text()).toEqual("blank");
  });

  it("should ignore $ and $$ properties", () => {
    createSelect({
      "ng-options": "key as value for (key, value) in object",
      "ng-model": "selected",
    });

    scope.$apply(() => {
      scope.object = {
        regularProperty: "visible",
        $$private: "invisible",
        $property: "invisible",
      };
      scope.selected = "regularProperty";
    });

    const options = element.find("option");
    expect(options.length).toEqual(1);
    expect(options.eq(0)).toEqualOption("regularProperty", "visible");
  });

  it("should not watch non-numeric array properties", () => {
    createSelect({
      "ng-options": "value as createLabel(value) for value in array",
      "ng-model": "selected",
    });
    scope.createLabel = jasmine
      .createSpy("createLabel")
      .and.callFake((value) => value);
    scope.array = ["a", "b", "c"];
    scope.array.$$private = "do not watch";
    scope.array.$property = "do not watch";
    scope.array.other = "do not watch";
    scope.array.fn = function () {};
    scope.selected = "b";
    expect(scope.createLabel).toHaveBeenCalledWith("a");
    expect(scope.createLabel).toHaveBeenCalledWith("b");
    expect(scope.createLabel).toHaveBeenCalledWith("c");
    expect(scope.createLabel).not.toHaveBeenCalledWith("do not watch");
    expect(scope.createLabel).not.toHaveBeenCalledWith(jasmine.any(Function));
  });

  it("should not watch object properties that start with $ or $$", () => {
    createSelect({
      "ng-options": "key as createLabel(key) for (key, value) in object",
      "ng-model": "selected",
    });
    scope.createLabel = jasmine
      .createSpy("createLabel")
      .and.callFake((value) => value);
    scope.object = {
      regularProperty: "visible",
      $$private: "invisible",
      $property: "invisible",
    };
    scope.selected = "regularProperty";
    expect(scope.createLabel).toHaveBeenCalledWith("regularProperty");
    expect(scope.createLabel).not.toHaveBeenCalledWith("$$private");
    expect(scope.createLabel).not.toHaveBeenCalledWith("$property");
  });

  it("should allow expressions over multiple lines", () => {
    scope.isNotFoo = function (item) {
      return item.name !== "Foo";
    };

    createSelect({
      "ng-options": "key.id\n" + "for key in values\n" + "| filter:isNotFoo",
      "ng-model": "selected",
    });

    scope.$apply(() => {
      scope.values = [
        { id: 1, name: "Foo" },
        { id: 2, name: "Bar" },
        { id: 3, name: "Baz" },
      ];
      scope.selected = scope.values[0];
    });

    const options = element.find("option");
    expect(options.length).toEqual(3);
    expect(options.eq(1)).toEqualOption(scope.values[1], "2");
    expect(options.eq(2)).toEqualOption(scope.values[2], "3");
  });

  it("should not update selected property of an option element on digest with no change event", () => {
    // ng-options="value.name for value in values"
    // ng-model="selected"
    createSingleSelect();

    scope.$apply(() => {
      scope.values = [{ name: "A" }, { name: "B" }, { name: "C" }];
      scope.selected = scope.values[0];
    });

    const options = element.find("option");

    expect(scope.selected).toEqual(jasmine.objectContaining({ name: "A" }));
    expect(options.eq(0)[0].selected).toBe(true);
    expect(options.eq(1)[0].selected).toBe(false);

    const optionToSelect = options.eq(1);

    expect(optionToSelect.text()).toBe("B");

    optionToSelect[0].selected = true;
    expect(optionToSelect[0].selected).toBe(true);
    expect(scope.selected).toBe(scope.values[0]);
  });

  // bug fix #9621
  it("should update the label property", () => {
    // ng-options="value.name for value in values"
    // ng-model="selected"
    createSingleSelect();

    scope.$apply(() => {
      scope.values = [{ name: "A" }, { name: "B" }, { name: "C" }];
      scope.selected = scope.values[0];
    });

    const options = element.find("option");
    expect(options.eq(0)[0].label).toEqual("A");
    expect(options.eq(1)[0].label).toEqual("B");
    expect(options.eq(2)[0].label).toEqual("C");
  });

  it("should update the label if only the property has changed", () => {
    // ng-options="value.name for value in values"
    // ng-model="selected"
    createSingleSelect();

    scope.$apply(() => {
      scope.values = [{ name: "A" }, { name: "B" }, { name: "C" }];
      scope.selected = scope.values[0];
    });

    let options = element.find("option");
    expect(options.eq(0)[0].label).toEqual("A");
    expect(options.eq(1)[0].label).toEqual("B");
    expect(options.eq(2)[0].label).toEqual("C");

    scope.$apply('values[0].name = "X"');

    options = element.find("option");
    expect(options.eq(0)[0].label).toEqual("X");
  });

  // bug fix #9714
  it("should select the matching option when the options are updated", () => {
    // first set up a select with no options
    scope.selected = "";
    createSelect({
      "ng-options": "val.id as val.label for val in values",
      "ng-model": "selected",
    });
    let options = element.find("option");
    // we expect the selected option to be the "unknown" option
    expect(options.eq(0)).toEqualUnknownOption("");
    expect(options.eq(0)[0].selected).toEqual(true);

    // now add some real options - one of which matches the selected value
    scope.$apply(
      'values = [{id:"",label:"A"},{id:"1",label:"B"},{id:"2",label:"C"}]',
    );

    // we expect the selected option to be the one that matches the correct item
    // and for the unknown option to have been removed
    options = element.find("option");
    expect(element).toEqualSelectValue("");
    expect(options.eq(0)).toEqualOption("", "A");
  });

  it('should remove the "selected" attribute from the previous option when the model changes', () => {
    scope.values = [
      { id: 10, label: "ten" },
      { id: 20, label: "twenty" },
    ];

    createSelect(
      {
        "ng-model": "selected",
        "ng-options": "item.label for item in values",
      },
      true,
    );

    let options = element.find("option");
    expect(options[0].selected).toBe(true);
    expect(options[1].selected).not.toBe(true);
    expect(options[2].selected).not.toBe(true);

    scope.selected = scope.values[0];
    expect(options[0].selected).not.toBe(true);
    expect(options[1].selected).toBe(true);
    expect(options[2].selected).not.toBe(true);

    scope.selected = scope.values[1];
    expect(options[0].selected).not.toBe(true);
    expect(options[1].selected).not.toBe(true);
    expect(options[2].selected).toBe(true);

    // This will select the empty option
    scope.selected = null;
    expect(options[0].selected).toBe(true);
    expect(options[1].selected).not.toBe(true);
    expect(options[2].selected).not.toBe(true);

    // This will add and select the unknown option
    scope.selected = "unmatched value";
    options = element.find("option");

    expect(options[0].selected).toBe(true);
    expect(options[1].selected).not.toBe(true);
    expect(options[2].selected).not.toBe(true);
    expect(options[3].selected).not.toBe(true);

    // Back to matched value
    scope.selected = scope.values[1];
    options = element.find("option");

    expect(options[0].selected).not.toBe(true);
    expect(options[1].selected).not.toBe(true);
    expect(options[2].selected).toBe(true);
  });

  if (window.MutationObserver) {
    // IE9 and IE10 do not support MutationObserver
    // Since the feature is only needed for a test, it's okay to skip these browsers
    it("should render the initial options only one time", () => {
      scope.value = "black";
      scope.values = ["black", "white", "red"];
      // observe-child-list adds a MutationObserver that we will read out after ngOptions
      // has been compiled
      createSelect({
        "ng-model": "value",
        "ng-options": "value.name for value in values",
        "observe-child-list": "",
      });

      const optionEls = element[0].querySelectorAll("option");
      const records = childListMutationObserver.takeRecords();

      expect(records.length).toBe(1);
      expect(records[0].addedNodes).toEqual(optionEls);
    });
  }

  describe("disableWhen expression", () => {
    describe("on single select", () => {
      it("should disable options", () => {
        scope.selected = "";
        scope.options = [
          { name: "white", value: "#FFFFFF" },
          { name: "one", value: 1, unavailable: true },
          { name: "notTrue", value: false },
          { name: "thirty", value: 30, unavailable: false },
        ];
        createSelect({
          "ng-options":
            "o.value as o.name disable when o.unavailable for o in options",
          "ng-model": "selected",
        });
        const options = element.find("option");

        expect(options.length).toEqual(5);
        expect(options.eq(1)[0].disabled).toEqual(false);
        expect(options.eq(2)[0].disabled).toEqual(true);
        expect(options.eq(3)[0].disabled).toEqual(false);
        expect(options.eq(4)[0].disabled).toEqual(false);
      });

      it("should select disabled options when model changes", () => {
        scope.options = [
          { name: "white", value: "#FFFFFF" },
          { name: "one", value: 1, unavailable: true },
          { name: "notTrue", value: false },
          { name: "thirty", value: 30, unavailable: false },
        ];
        createSelect({
          "ng-options":
            "o.value as o.name disable when o.unavailable for o in options",
          "ng-model": "selected",
        });

        // Initially the model is set to an enabled option
        scope.$apply("selected = 30");
        let options = element.find("option");
        expect(options.eq(3)[0].selected).toEqual(true);

        // Now set the model to a disabled option
        scope.$apply("selected = 1");
        options = element.find("option");

        // jQuery returns null for val() when the option is disabled, see
        // https://bugs.jquery.com/ticket/13097
        expect(element[0].value).toBe("number:1");
        expect(options.length).toEqual(4);
        expect(options.eq(0)[0].selected).toEqual(false);
        expect(options.eq(1)[0].selected).toEqual(true);
        expect(options.eq(2)[0].selected).toEqual(false);
        expect(options.eq(3)[0].selected).toEqual(false);
      });

      it("should select options in model when they become enabled", () => {
        scope.options = [
          { name: "white", value: "#FFFFFF" },
          { name: "one", value: 1, unavailable: true },
          { name: "notTrue", value: false },
          { name: "thirty", value: 30, unavailable: false },
        ];
        createSelect({
          "ng-options":
            "o.value as o.name disable when o.unavailable for o in options",
          "ng-model": "selected",
        });

        // Set the model to a disabled option
        scope.$apply("selected = 1");
        let options = element.find("option");

        // jQuery returns null for val() when the option is disabled, see
        // https://bugs.jquery.com/ticket/13097
        expect(element[0].value).toBe("number:1");
        expect(options.length).toEqual(4);
        expect(options.eq(0)[0].selected).toEqual(false);
        expect(options.eq(1)[0].selected).toEqual(true);
        expect(options.eq(2)[0].selected).toEqual(false);
        expect(options.eq(3)[0].selected).toEqual(false);

        // Now enable that option
        scope.$apply(() => {
          scope.options[1].unavailable = false;
        });

        expect(element).toEqualSelectValue(1);
        options = element.find("option");
        expect(options.length).toEqual(4);
        expect(options.eq(1)[0].selected).toEqual(true);
        expect(options.eq(3)[0].selected).toEqual(false);
      });
    });

    describe("on multi select", () => {
      it("should disable options", () => {
        scope.selected = [];
        scope.options = [
          { name: "a", value: 0 },
          { name: "b", value: 1, unavailable: true },
          { name: "c", value: 2 },
          { name: "d", value: 3, unavailable: false },
        ];
        createSelect({
          "ng-options":
            "o.value as o.name disable when o.unavailable for o in options",
          multiple: true,
          "ng-model": "selected",
        });
        const options = element.find("option");

        expect(options.eq(0)[0].disabled).toEqual(false);
        expect(options.eq(1)[0].disabled).toEqual(true);
        expect(options.eq(2)[0].disabled).toEqual(false);
        expect(options.eq(3)[0].disabled).toEqual(false);
      });

      it("should select disabled options when model changes", () => {
        scope.options = [
          { name: "a", value: 0 },
          { name: "b", value: 1, unavailable: true },
          { name: "c", value: 2 },
          { name: "d", value: 3, unavailable: false },
        ];
        createSelect({
          "ng-options":
            "o.value as o.name disable when o.unavailable for o in options",
          multiple: true,
          "ng-model": "selected",
        });

        // Initially the model is set to an enabled option
        scope.$apply("selected = [3]");
        let options = element.find("option");
        expect(options.eq(0)[0].selected).toEqual(false);
        expect(options.eq(1)[0].selected).toEqual(false);
        expect(options.eq(2)[0].selected).toEqual(false);
        expect(options.eq(3)[0].selected).toEqual(true);

        // Now add a disabled option
        scope.$apply("selected = [1,3]");
        options = element.find("option");
        expect(options.eq(0)[0].selected).toEqual(false);
        expect(options.eq(1)[0].selected).toEqual(true);
        expect(options.eq(2)[0].selected).toEqual(false);
        expect(options.eq(3)[0].selected).toEqual(true);

        // Now only select the disabled option
        scope.$apply("selected = [1]");
        expect(options.eq(0)[0].selected).toEqual(false);
        expect(options.eq(1)[0].selected).toEqual(true);
        expect(options.eq(2)[0].selected).toEqual(false);
        expect(options.eq(3)[0].selected).toEqual(false);
      });

      it("should select options in model when they become enabled", () => {
        scope.options = [
          { name: "a", value: 0 },
          { name: "b", value: 1, unavailable: true },
          { name: "c", value: 2 },
          { name: "d", value: 3, unavailable: false },
        ];
        createSelect({
          "ng-options":
            "o.value as o.name disable when o.unavailable for o in options",
          multiple: true,
          "ng-model": "selected",
        });

        // Set the model to a disabled option
        scope.$apply("selected = [1]");
        let options = element.find("option");

        expect(options.eq(0)[0].selected).toEqual(false);
        expect(options.eq(1)[0].selected).toEqual(true);
        expect(options.eq(2)[0].selected).toEqual(false);
        expect(options.eq(3)[0].selected).toEqual(false);

        // Now enable that option
        scope.$apply(() => {
          scope.options[1].unavailable = false;
        });

        expect(element).toEqualSelectValue([1], true);
        options = element.find("option");
        expect(options.eq(0)[0].selected).toEqual(false);
        expect(options.eq(1)[0].selected).toEqual(true);
        expect(options.eq(2)[0].selected).toEqual(false);
        expect(options.eq(3)[0].selected).toEqual(false);
      });
    });
  });

  describe("selectAs expression", () => {
    beforeEach(() => {
      scope.arr = [
        { id: 10, label: "ten" },
        { id: 20, label: "twenty" },
      ];
      scope.obj = {
        10: { score: 10, label: "ten" },
        20: { score: 20, label: "twenty" },
      };
    });

    it("should support single select with array source", () => {
      createSelect({
        "ng-model": "selected",
        "ng-options": "item.id as item.label for item in arr",
      });

      scope.$apply(() => {
        scope.selected = 10;
      });
      expect(element).toEqualSelectValue(10);

      setSelectValue(element, 1);
      expect(scope.selected).toBe(20);
    });

    it("should support multi select with array source", () => {
      createSelect({
        "ng-model": "selected",
        multiple: true,
        "ng-options": "item.id as item.label for item in arr",
      });

      scope.$apply(() => {
        scope.selected = [10, 20];
      });
      expect(element).toEqualSelectValue([10, 20], true);
      expect(scope.selected).toEqual([10, 20]);

      element.children()[0].selected = false;
      browserTrigger(element, "change");
      expect(scope.selected).toEqual([20]);
      expect(element).toEqualSelectValue([20], true);
    });

    it("should re-render if an item in an array source is added/removed", () => {
      createSelect({
        "ng-model": "selected",
        multiple: true,
        "ng-options": "item.id as item.label for item in arr",
      });

      scope.$apply(() => {
        scope.selected = [10];
      });
      expect(element).toEqualSelectValue([10], true);

      scope.$apply(() => {
        scope.selected.push(20);
      });
      expect(element).toEqualSelectValue([10, 20], true);

      scope.$apply(() => {
        scope.selected.shift();
      });
      expect(element).toEqualSelectValue([20], true);
    });

    it("should handle a options containing circular references", () => {
      scope.arr[0].ref = scope.arr[0];
      scope.selected = [scope.arr[0]];
      createSelect({
        "ng-model": "selected",
        multiple: true,
        "ng-options": "item as item.label for item in arr",
      });
      expect(element).toEqualSelectValue([scope.arr[0]], true);

      scope.$apply(() => {
        scope.selected.push(scope.arr[1]);
      });
      expect(element).toEqualSelectValue([scope.arr[0], scope.arr[1]], true);

      scope.$apply(() => {
        scope.selected.pop();
      });
      expect(element).toEqualSelectValue([scope.arr[0]], true);
    });

    it("should support single select with object source", () => {
      createSelect({
        "ng-model": "selected",
        "ng-options": "val.score as val.label for (key, val) in obj",
      });

      scope.$apply(() => {
        scope.selected = 10;
      });
      expect(element).toEqualSelectValue(10);

      setSelectValue(element, 1);
      expect(scope.selected).toBe(20);
    });

    it("should support multi select with object source", () => {
      createSelect({
        "ng-model": "selected",
        multiple: true,
        "ng-options": "val.score as val.label for (key, val) in obj",
      });

      scope.$apply(() => {
        scope.selected = [10, 20];
      });
      expect(element).toEqualSelectValue([10, 20], true);

      element.children()[0].selected = false;
      browserTrigger(element, "change");
      expect(scope.selected).toEqual([20]);
      expect(element).toEqualSelectValue([20], true);
    });
  });

  describe("trackBy expression", () => {
    beforeEach(() => {
      scope.arr = [
        { id: 10, label: "ten" },
        { id: 20, label: "twenty" },
      ];
      scope.obj = {
        1: { score: 10, label: "ten" },
        2: { score: 20, label: "twenty" },
      };
    });

    it("should set the result of track by expression to element value", () => {
      createSelect({
        "ng-model": "selected",
        "ng-options": "item.label for item in arr track by item.id",
      });

      expect(element.val()).toEqualUnknownValue();

      scope.$apply(() => {
        scope.selected = scope.arr[0];
      });
      expect(element.val()).toBe("10");

      scope.$apply(() => {
        scope.arr[0] = { id: 10, label: "new ten" };
      });
      expect(element.val()).toBe("10");

      element.children()[1].selected = "selected";
      browserTrigger(element, "change");
      expect(scope.selected).toEqual(scope.arr[1]);
    });

    it("should use the tracked expression as option value", () => {
      createSelect({
        "ng-model": "selected",
        "ng-options": "item.label for item in arr track by item.id",
      });

      const options = element.find("option");
      expect(options.length).toEqual(3);
      expect(options.eq(0)).toEqualUnknownOption();
      expect(options.eq(1)).toEqualTrackedOption(10, "ten");
      expect(options.eq(2)).toEqualTrackedOption(20, "twenty");
    });

    it("should update the selected option even if only the tracked property on the selected object changes (single)", () => {
      createSelect({
        "ng-model": "selected",
        "ng-options": "item.label for item in arr track by item.id",
      });

      scope.$apply(() => {
        scope.selected = { id: 10, label: "ten" };
      });

      expect(element.val()).toEqual("10");

      // Update the properties on the selected object, rather than replacing the whole object
      scope.$apply(() => {
        scope.selected.id = 20;
        scope.selected.label = "new twenty";
      });

      // The value of the select should change since the id property changed
      expect(element.val()).toEqual("20");

      // But the label of the selected option does not change
      const option = element.find("option").eq(1);
      expect(option[0].selected).toEqual(true);
      expect(option.text()).toEqual("twenty"); // not 'new twenty'
    });

    it(
      "should update the selected options even if only the tracked properties on the objects in the " +
        "selected collection change (multi)",
      () => {
        createSelect({
          "ng-model": "selected",
          multiple: true,
          "ng-options": "item.label for item in arr track by item.id",
        });

        scope.$apply(() => {
          scope.selected = [{ id: 10, label: "ten" }];
        });

        expect(element.val()).toEqual(["10"]);

        // Update the tracked property on the object in the selected array, rather than replacing the whole object
        scope.$apply(() => {
          scope.selected[0].id = 20;
        });

        // The value of the select should change since the id property changed
        expect(element.val()).toEqual(["20"]);

        // But the label of the selected option does not change
        const option = element.find("option").eq(1);
        expect(option[0].selected).toEqual(true);
        expect(option.text()).toEqual("twenty"); // not 'new twenty'
      },
    );

    it("should prevent changes to the selected object from modifying the options objects (single)", () => {
      createSelect({
        "ng-model": "selected",
        "ng-options": "item.label for item in arr track by item.id",
      });

      element.val("10");
      browserTrigger(element, "change");

      expect(scope.selected).toEqual(scope.arr[0]);

      scope.$apply(() => {
        scope.selected.id = 20;
      });

      expect(scope.selected).not.toEqual(scope.arr[0]);
      expect(element.val()).toEqual("20");
      expect(scope.arr).toEqual([
        { id: 10, label: "ten" },
        { id: 20, label: "twenty" },
      ]);
    });

    it("should preserve value even when reference has changed (single&array)", () => {
      createSelect({
        "ng-model": "selected",
        "ng-options": "item.label for item in arr track by item.id",
      });

      scope.$apply(() => {
        scope.selected = scope.arr[0];
      });
      expect(element.val()).toBe("10");

      scope.$apply(() => {
        scope.arr[0] = { id: 10, label: "new ten" };
      });
      expect(element.val()).toBe("10");

      element.children()[1].selected = 1;
      browserTrigger(element, "change");
      expect(scope.selected).toEqual(scope.arr[1]);
    });

    it("should preserve value even when reference has changed (multi&array)", () => {
      createSelect({
        "ng-model": "selected",
        multiple: true,
        "ng-options": "item.label for item in arr track by item.id",
      });

      scope.$apply(() => {
        scope.selected = scope.arr;
      });
      expect(element.val()).toEqual(["10", "20"]);

      scope.$apply(() => {
        scope.arr[0] = { id: 10, label: "new ten" };
      });
      expect(element.val()).toEqual(["10", "20"]);

      element.children()[0].selected = false;
      browserTrigger(element, "change");
      expect(scope.selected).toEqual([scope.arr[1]]);
    });

    it("should preserve value even when reference has changed (single&object)", () => {
      createSelect({
        "ng-model": "selected",
        "ng-options": "val.label for (key, val) in obj track by val.score",
      });

      scope.$apply(() => {
        scope.selected = scope.obj["1"];
      });
      expect(element.val()).toBe("10");

      scope.$apply(() => {
        scope.obj["1"] = { score: 10, label: "ten" };
      });
      expect(element.val()).toBe("10");

      setSelectValue(element, 1);
      expect(scope.selected).toEqual(scope.obj["2"]);
    });

    it("should preserve value even when reference has changed (multi&object)", () => {
      createSelect({
        "ng-model": "selected",
        multiple: true,
        "ng-options": "val.label for (key, val) in obj track by val.score",
      });

      scope.$apply(() => {
        scope.selected = [scope.obj["1"]];
      });
      expect(element.val()).toEqual(["10"]);

      scope.$apply(() => {
        scope.obj["1"] = { score: 10, label: "ten" };
      });
      expect(element.val()).toEqual(["10"]);

      element.children()[1].selected = "selected";
      browserTrigger(element, "change");
      expect(scope.selected).toEqual([scope.obj["1"], scope.obj["2"]]);
    });

    it("should prevent infinite digest if track by expression is stable", () => {
      scope.makeOptions = function () {
        const options = [];
        for (let i = 0; i < 5; i++) {
          options.push({ label: `Value = ${i}`, value: i });
        }
        return options;
      };
      scope.selected = { label: "Value = 1", value: 1 };
      expect(() => {
        createSelect({
          "ng-model": "selected",
          "ng-options":
            "item.label for item in makeOptions() track by item.value",
        });
      }).not.toThrow();
    });

    it("should re-render if the tracked property of the model is changed when using trackBy", () => {
      createSelect({
        "ng-model": "selected",
        "ng-options": "item for item in arr track by item.id",
      });

      scope.$apply(() => {
        scope.selected = { id: 10, label: "ten" };
      });

      spyOn(element.controller("ngModel"), "$render");

      scope.$apply(() => {
        scope.arr[0].id = 20;
      });

      // update render due to equality watch
      expect(element.controller("ngModel").$render).toHaveBeenCalled();
    });

    it("should not set view value again if the tracked property of the model has not changed when using trackBy", () => {
      createSelect({
        "ng-model": "selected",
        "ng-options": "item for item in arr track by item.id",
      });

      scope.$apply(() => {
        scope.selected = { id: 10, label: "ten" };
      });

      spyOn(element.controller("ngModel"), "$setViewValue");

      scope.$apply(() => {
        scope.arr[0] = { id: 10, label: "ten" };
      });

      expect(
        element.controller("ngModel").$setViewValue,
      ).not.toHaveBeenCalled();
    });

    it("should not re-render if a property of the model is changed when not using trackBy", () => {
      createSelect({
        "ng-model": "selected",
        "ng-options": "item for item in arr",
      });

      scope.$apply(() => {
        scope.selected = scope.arr[0];
      });

      spyOn(element.controller("ngModel"), "$render");

      scope.$apply(() => {
        scope.selected.label = "changed";
      });

      // no render update as no equality watch
      expect(element.controller("ngModel").$render).not.toHaveBeenCalled();
    });

    it("should handle options containing circular references (single)", () => {
      scope.arr[0].ref = scope.arr[0];
      createSelect({
        "ng-model": "selected",
        "ng-options": "item for item in arr track by item.id",
      });

      expect(() => {
        scope.$apply(() => {
          scope.selected = scope.arr[0];
        });
      }).not.toThrow();
    });

    it("should handle options containing circular references (multiple)", () => {
      scope.arr[0].ref = scope.arr[0];
      createSelect({
        "ng-model": "selected",
        multiple: true,
        "ng-options": "item for item in arr track by item.id",
      });

      expect(() => {
        scope.$apply(() => {
          scope.selected = [scope.arr[0]];
        });

        scope.$apply(() => {
          scope.selected.push(scope.arr[1]);
        });
      }).not.toThrow();
    });

    it('should remove the "selected" attribute when the model changes', () => {
      createSelect({
        "ng-model": "selected",
        "ng-options": "item.label for item in arr track by item.id",
      });

      const options = element.find("option");
      element[0].selectedIndex = 2;
      element[0].dispatchEvent(new Event("change"));
      expect(scope.selected).toEqual(scope.arr[1]);

      scope.selected = {};
      expect(options[0].selected).toBeTrue();
      expect(options[1].selected).not.toBeTrue();
      expect(options[2].selected).not.toBeTrue();
    });
  });

  /**
   * This behavior is broken and should probably be cleaned up later as track by and select as
   * aren't compatible.
   */
  describe("selectAs+trackBy expression", () => {
    beforeEach(() => {
      scope.arr = [
        { subItem: { label: "ten", id: 10 } },
        { subItem: { label: "twenty", id: 20 } },
      ];
      scope.obj = {
        10: { subItem: { id: 10, label: "ten" } },
        20: { subItem: { id: 20, label: "twenty" } },
      };
    });

    it(
      'It should use the "value" variable to represent items in the array as well as for the ' +
        "selected values in track by expression (single&array)",
      () => {
        createSelect({
          "ng-model": "selected",
          "ng-options":
            "item.subItem as item.subItem.label for item in arr track by (item.id || item.subItem.id)",
        });

        // First test model -> view

        scope.$apply(() => {
          scope.selected = scope.arr[0].subItem;
        });
        expect(element.val()).toEqual("10");

        scope.$apply(() => {
          scope.selected = scope.arr[1].subItem;
        });
        expect(element.val()).toEqual("20");

        // Now test view -> model

        element.val("10");
        browserTrigger(element, "change");
        expect(scope.selected).toEqual(scope.arr[0].subItem);

        // Now reload the array
        scope.$apply(() => {
          scope.arr = [
            {
              subItem: { label: "new ten", id: 10 },
            },
            {
              subItem: { label: "new twenty", id: 20 },
            },
          ];
        });
        expect(element.val()).toBe("10");
        expect(scope.selected.id).toBe(10);
      },
    );

    it(
      'It should use the "value" variable to represent items in the array as well as for the ' +
        "selected values in track by expression (multiple&array)",
      () => {
        createSelect({
          "ng-model": "selected",
          multiple: true,
          "ng-options":
            "item.subItem as item.subItem.label for item in arr track by (item.id || item.subItem.id)",
        });

        // First test model -> view

        scope.$apply(() => {
          scope.selected = [scope.arr[0].subItem];
        });
        expect(element.val()).toEqual(["10"]);

        scope.$apply(() => {
          scope.selected = [scope.arr[1].subItem];
        });
        expect(element.val()).toEqual(["20"]);

        // Now test view -> model

        element.find("option")[0].selected = true;
        element.find("option")[1].selected = false;
        browserTrigger(element, "change");
        expect(scope.selected).toEqual([scope.arr[0].subItem]);

        // Now reload the array
        scope.$apply(() => {
          scope.arr = [
            {
              subItem: { label: "new ten", id: 10 },
            },
            {
              subItem: { label: "new twenty", id: 20 },
            },
          ];
        });
        expect(element.val()).toEqual(["10"]);
        expect(scope.selected[0].id).toEqual(10);
        expect(scope.selected.length).toBe(1);
      },
    );

    it(
      'It should use the "value" variable to represent items in the array as well as for the ' +
        "selected values in track by expression (multiple&object)",
      () => {
        createSelect({
          "ng-model": "selected",
          multiple: true,
          "ng-options":
            "val.subItem as val.subItem.label for (key, val) in obj track by (val.id || val.subItem.id)",
        });

        // First test model -> view

        scope.$apply(() => {
          scope.selected = [scope.obj["10"].subItem];
        });
        expect(element.val()).toEqual(["10"]);

        scope.$apply(() => {
          scope.selected = [scope.obj["10"].subItem];
        });
        expect(element.val()).toEqual(["10"]);

        // Now test view -> model

        element.find("option")[0].selected = true;
        element.find("option")[1].selected = false;
        browserTrigger(element, "change");
        expect(scope.selected).toEqual([scope.obj["10"].subItem]);

        // Now reload the object
        scope.$apply(() => {
          scope.obj = {
            10: {
              subItem: { label: "new ten", id: 10 },
            },
            20: {
              subItem: { label: "new twenty", id: 20 },
            },
          };
        });
        expect(element.val()).toEqual(["10"]);
        expect(scope.selected[0].id).toBe(10);
        expect(scope.selected.length).toBe(1);
      },
    );

    it(
      'It should use the "value" variable to represent items in the array as well as for the ' +
        "selected values in track by expression (single&object)",
      () => {
        createSelect({
          "ng-model": "selected",
          "ng-options":
            "val.subItem as val.subItem.label for (key, val) in obj track by (val.id || val.subItem.id)",
        });

        // First test model -> view

        scope.$apply(() => {
          scope.selected = scope.obj["10"].subItem;
        });
        expect(element.val()).toEqual("10");

        scope.$apply(() => {
          scope.selected = scope.obj["10"].subItem;
        });
        expect(element.val()).toEqual("10");

        // Now test view -> model

        element.find("option")[0].selected = true;
        browserTrigger(element, "change");
        expect(scope.selected).toEqual(scope.obj["10"].subItem);

        // Now reload the object
        scope.$apply(() => {
          scope.obj = {
            10: {
              subItem: { label: "new ten", id: 10 },
            },
            20: {
              subItem: { label: "new twenty", id: 20 },
            },
          };
        });
        expect(element.val()).toEqual("10");
        expect(scope.selected.id).toBe(10);
      },
    );
  });

  describe("binding", () => {
    it("should bind to scope value", () => {
      createSingleSelect();

      scope.$apply(() => {
        scope.values = [{ name: "A" }, { name: "B" }];
        scope.selected = scope.values[0];
      });

      expect(element).toEqualSelectValue(scope.selected);

      scope.$apply(() => {
        scope.selected = scope.values[1];
      });

      expect(element).toEqualSelectValue(scope.selected);
    });

    it("should bind to scope value and group", () => {
      createSelect({
        "ng-model": "selected",
        "ng-options": "item.name group by item.group for item in values",
      });

      scope.$apply(() => {
        scope.values = [
          { name: "A" },
          { name: "B", group: 0 },
          { name: "C", group: "first" },
          { name: "D", group: "second" },
          { name: "E", group: 0 },
          { name: "F", group: "first" },
          { name: "G", group: "second" },
        ];
        scope.selected = scope.values[3];
      });

      expect(element).toEqualSelectValue(scope.selected);

      const optgroups = element.find("optgroup");
      expect(optgroups.length).toBe(3);

      const zero = optgroups.eq(0);
      const b = zero.find("option").eq(0);
      const e = zero.find("option").eq(1);
      expect(zero.attr("label")).toEqual("0");
      expect(b.text()).toEqual("B");
      expect(e.text()).toEqual("E");

      const first = optgroups.eq(1);
      const c = first.find("option").eq(0);
      const f = first.find("option").eq(1);
      expect(first.attr("label")).toEqual("first");
      expect(c.text()).toEqual("C");
      expect(f.text()).toEqual("F");

      const second = optgroups.eq(2);
      const d = second.find("option").eq(0);
      const g = second.find("option").eq(1);
      expect(second.attr("label")).toEqual("second");
      expect(d.text()).toEqual("D");
      expect(g.text()).toEqual("G");

      scope.$apply(() => {
        scope.selected = scope.values[0];
      });

      expect(element).toEqualSelectValue(scope.selected);
    });

    it("should group when the options are available on compile time", () => {
      scope.values = [
        { name: "C", group: "first" },
        { name: "D", group: "second" },
        { name: "F", group: "first" },
        { name: "G", group: "second" },
      ];
      scope.selected = scope.values[3];

      createSelect({
        "ng-model": "selected",
        "ng-options":
          "item as item.name group by item.group for item in values",
      });

      expect(element).toEqualSelectValue(scope.selected);

      const optgroups = element.find("optgroup");
      expect(optgroups.length).toBe(2);

      const first = optgroups.eq(0);
      const c = first.find("option").eq(0);
      const f = first.find("option").eq(1);
      expect(first.attr("label")).toEqual("first");
      expect(c.text()).toEqual("C");
      expect(f.text()).toEqual("F");

      const second = optgroups.eq(1);
      const d = second.find("option").eq(0);
      const g = second.find("option").eq(1);
      expect(second.attr("label")).toEqual("second");
      expect(d.text()).toEqual("D");
      expect(g.text()).toEqual("G");

      scope.$apply(() => {
        scope.selected = scope.values[0];
      });

      expect(element).toEqualSelectValue(scope.selected);
    });

    it("should group when the options are updated", () => {
      let optgroups;
      let one;
      let two;
      let three;
      let alpha;
      let beta;
      let gamma;
      let delta;
      let epsilon;

      createSelect({
        "ng-model": "selected",
        "ng-options": "i.name group by i.cls for i in list",
      });

      scope.list = [
        { cls: "one", name: "Alpha" },
        { cls: "one", name: "Beta" },
        { cls: "two", name: "Gamma" },
      ];
      optgroups = element.find("optgroup");
      expect(optgroups.length).toBe(2);

      one = optgroups.eq(0);
      expect(one.children("option").length).toBe(2);

      alpha = one.find("option").eq(0);
      beta = one.find("option").eq(1);
      expect(one.attr("label")).toEqual("one");
      expect(alpha.text()).toEqual("Alpha");
      expect(beta.text()).toEqual("Beta");

      two = optgroups.eq(1);
      expect(two.children("option").length).toBe(1);

      gamma = two.find("option").eq(0);
      expect(two.attr("label")).toEqual("two");
      expect(gamma.text()).toEqual("Gamma");

      // Remove item from first group, add item to second group, add new group
      scope.list.shift();
      scope.list.push(
        { cls: "two", name: "Delta" },
        { cls: "three", name: "Epsilon" },
      );
      optgroups = element.find("optgroup");
      expect(optgroups.length).toBe(3);

      // Group with removed item
      one = optgroups.eq(0);
      expect(one.children("option").length).toBe(1);

      beta = one.find("option").eq(0);
      expect(one.attr("label")).toEqual("one");
      expect(beta.text()).toEqual("Beta");

      // Group with new item
      two = optgroups.eq(1);
      expect(two.children("option").length).toBe(2);

      gamma = two.find("option").eq(0);
      expect(two.attr("label")).toEqual("two");
      expect(gamma.text()).toEqual("Gamma");
      delta = two.find("option").eq(1);
      expect(two.attr("label")).toEqual("two");
      expect(delta.text()).toEqual("Delta");

      // New group
      three = optgroups.eq(2);
      expect(three.children("option").length).toBe(1);

      epsilon = three.find("option").eq(0);
      expect(three.attr("label")).toEqual("three");
      expect(epsilon.text()).toEqual("Epsilon");
    });

    it("should place non-grouped items in the list where they appear", () => {
      createSelect({
        "ng-model": "selected",
        "ng-options": "item.name group by item.group for item in values",
      });

      scope.$apply(() => {
        scope.values = [
          { name: "A" },
          { name: "B", group: "first" },
          { name: "C", group: "second" },
          { name: "D" },
          { name: "E", group: "first" },
          { name: "F" },
          { name: "G" },
          { name: "H", group: "second" },
        ];
        scope.selected = scope.values[0];
      });

      const children = element.children();
      expect(children.length).toEqual(6);

      expect(children[0].nodeName.toLowerCase()).toEqual("option");
      expect(children[1].nodeName.toLowerCase()).toEqual("optgroup");
      expect(children[2].nodeName.toLowerCase()).toEqual("optgroup");
      expect(children[3].nodeName.toLowerCase()).toEqual("option");
      expect(children[4].nodeName.toLowerCase()).toEqual("option");
      expect(children[5].nodeName.toLowerCase()).toEqual("option");
    });

    it("should group if the group has a falsy value (except undefined)", () => {
      createSelect({
        "ng-model": "selected",
        "ng-options": "item.name group by item.group for item in values",
      });

      scope.$apply(() => {
        scope.values = [
          { name: "A" },
          { name: "B", group: "" },
          { name: "C", group: null },
          { name: "D", group: false },
          { name: "E", group: 0 },
        ];
        scope.selected = scope.values[0];
      });

      const optgroups = element.find("optgroup");
      const options = element.find("option");

      expect(optgroups.length).toEqual(4);
      expect(options.length).toEqual(5);

      expect(optgroups[0].label).toBe("");
      expect(optgroups[1].label).toBe("null");
      expect(optgroups[2].label).toBe("false");
      expect(optgroups[3].label).toBe("0");

      expect(options[0].textContent).toBe("A");
      expect(options[0].parentNode).toBe(element[0]);

      expect(options[1].textContent).toBe("B");
      expect(options[1].parentNode).toBe(optgroups[0]);

      expect(options[2].textContent).toBe("C");
      expect(options[2].parentNode).toBe(optgroups[1]);

      expect(options[3].textContent).toBe("D");
      expect(options[3].parentNode).toBe(optgroups[2]);

      expect(options[4].textContent).toBe("E");
      expect(options[4].parentNode).toBe(optgroups[3]);
    });

    it("should not duplicate a group with a falsy value when the options are updated", () => {
      scope.$apply(() => {
        scope.values = [
          { value: "A", group: "" },
          { value: "B", group: "First" },
        ];
        scope.selected = scope.values[0];
      });

      createSelect({
        "ng-model": "selected",
        "ng-options": "item.value group by item.group for item in values",
      });

      scope.$apply(() => {
        scope.values.push({ value: "C", group: false });
      });

      const optgroups = element.find("optgroup");
      const options = element.find("option");

      expect(optgroups.length).toEqual(3);
      expect(options.length).toEqual(3);

      expect(optgroups[0].label).toBe("");
      expect(optgroups[1].label).toBe("First");
      expect(optgroups[2].label).toBe("false");

      expect(options[0].textContent).toBe("A");
      expect(options[0].parentNode).toBe(optgroups[0]);

      expect(options[1].textContent).toBe("B");
      expect(options[1].parentNode).toBe(optgroups[1]);

      expect(options[2].textContent).toBe("C");
      expect(options[2].parentNode).toBe(optgroups[2]);
    });

    it("should bind to scope value and track/identify objects", () => {
      createSelect({
        "ng-model": "selected",
        "ng-options": "item.name for item in values track by item.id",
      });

      scope.$apply(() => {
        scope.values = [
          { id: 1, name: "first" },
          { id: 2, name: "second" },
          { id: 3, name: "third" },
          { id: 4, name: "forth" },
        ];
        scope.selected = scope.values[1];
      });

      expect(element.val()).toEqual("2");

      const first = JQLite(element.find("option")[0]);
      expect(first.text()).toEqual("first");
      expect(first.attr("value")).toEqual("1");
      const forth = JQLite(element.find("option")[3]);
      expect(forth.text()).toEqual("forth");
      expect(forth.attr("value")).toEqual("4");

      scope.$apply(() => {
        scope.selected = scope.values[3];
      });

      expect(element.val()).toEqual("4");
    });

    it("should bind to scope value through expression", () => {
      createSelect({
        "ng-model": "selected",
        "ng-options": "item.id as item.name for item in values",
      });

      scope.$apply(() => {
        scope.values = [
          { id: 10, name: "A" },
          { id: 20, name: "B" },
        ];
        scope.selected = scope.values[0].id;
      });

      expect(element).toEqualSelectValue(scope.selected);

      scope.$apply(() => {
        scope.selected = scope.values[1].id;
      });

      expect(element).toEqualSelectValue(scope.selected);
    });

    it("should update options in the DOM", () => {
      compile(
        '<select ng-model="selected" ng-options="item.id as item.name for item in values"></select>',
      );

      scope.$apply(() => {
        scope.values = [
          { id: 10, name: "A" },
          { id: 20, name: "B" },
        ];
        scope.selected = scope.values[0].id;
      });

      scope.$apply(() => {
        scope.values[0].name = "C";
      });

      const options = element.find("option");
      expect(options.length).toEqual(2);
      expect(options.eq(0)).toEqualOption(10, "C");
      expect(options.eq(1)).toEqualOption(20, "B");
    });

    it("should update options in the DOM from object source", () => {
      compile(
        '<select ng-model="selected" ng-options="val.id as val.name for (key, val) in values"></select>',
      );

      scope.$apply(() => {
        scope.values = { a: { id: 10, name: "A" }, b: { id: 20, name: "B" } };
        scope.selected = scope.values.a.id;
      });

      scope.$apply(() => {
        scope.values.a.name = "C";
      });

      const options = element.find("option");
      expect(options.length).toEqual(2);
      expect(options.eq(0)).toEqualOption(10, "C");
      expect(options.eq(1)).toEqualOption(20, "B");
    });

    it("should bind to object key", () => {
      createSelect({
        "ng-model": "selected",
        "ng-options": "key as value for (key, value) in object",
      });

      scope.$apply(() => {
        scope.object = { red: "FF0000", green: "00FF00", blue: "0000FF" };
        scope.selected = "green";
      });

      expect(element).toEqualSelectValue(scope.selected);

      scope.$apply(() => {
        scope.selected = "blue";
      });

      expect(element).toEqualSelectValue(scope.selected);
    });

    it("should bind to object value", () => {
      createSelect({
        "ng-model": "selected",
        "ng-options": "value as key for (key, value) in object",
      });

      scope.$apply(() => {
        scope.object = { red: "FF0000", green: "00FF00", blue: "0000FF" };
        scope.selected = "00FF00";
      });

      expect(element).toEqualSelectValue(scope.selected);

      scope.$apply(() => {
        scope.selected = "0000FF";
      });

      expect(element).toEqualSelectValue(scope.selected);
    });

    it("should bind to object disabled", () => {
      scope.selected = 30;
      scope.options = [
        { name: "white", value: "#FFFFFF" },
        { name: "one", value: 1, unavailable: true },
        { name: "notTrue", value: false },
        { name: "thirty", value: 30, unavailable: false },
      ];
      createSelect({
        "ng-options":
          "o.value as o.name disable when o.unavailable for o in options",
        "ng-model": "selected",
      });

      let options = element.find("option");

      expect(scope.options[1].unavailable).toEqual(true);
      expect(options.eq(1)[0].disabled).toEqual(true);

      scope.$apply(() => {
        scope.options[1].unavailable = false;
      });

      options = element.find("option");

      expect(scope.options[1].unavailable).toEqual(false);
      expect(options.eq(1)[0].disabled).toEqual(false);
    });

    it("should insert the unknown option if bound to null", () => {
      createSingleSelect();

      scope.$apply(() => {
        scope.values = [{ name: "A" }];
        scope.selected = null;
      });

      expect(element.find("option").length).toEqual(2);
      expect(element.val()).toEqual("?");
      expect(JQLite(element.find("option")[0]).val()).toEqual("?");

      scope.$apply(() => {
        scope.selected = scope.values[0];
      });

      expect(element).toEqualSelectValue(scope.selected);
      expect(element.find("option").length).toEqual(1);
    });

    it("should select the provided empty option if bound to null", () => {
      createSingleSelect(true);

      scope.$apply(() => {
        scope.values = [{ name: "A" }];
        scope.selected = null;
      });

      expect(element.find("option").length).toEqual(2);
      expect(element.val()).toEqual("");
      expect(JQLite(element.find("option")[0]).val()).toEqual("");

      scope.$apply(() => {
        scope.selected = scope.values[0];
      });

      expect(element).toEqualSelectValue(scope.selected);
      expect(JQLite(element.find("option")[0]).val()).toEqual("");
      expect(element.find("option").length).toEqual(2);
    });

    it("should reuse blank option if bound to null", () => {
      createSingleSelect(true);

      scope.$apply(() => {
        scope.values = [{ name: "A" }];
        scope.selected = null;
      });

      expect(element.find("option").length).toEqual(2);
      expect(element.val()).toEqual("");
      expect(JQLite(element.find("option")[0]).val()).toEqual("");

      scope.$apply(() => {
        scope.selected = scope.values[0];
      });

      expect(element).toEqualSelectValue(scope.selected);
      expect(element.find("option").length).toEqual(2);
    });

    it("should not insert a blank option if one of the options maps to null", () => {
      createSelect({
        "ng-model": "myColor",
        "ng-options": "color.shade as color.name for color in colors",
      });

      scope.$apply(() => {
        scope.colors = [
          { name: "nothing", shade: null },
          { name: "red", shade: "dark" },
        ];
        scope.myColor = null;
      });

      expect(element.find("option").length).toEqual(2);
      expect(element.find("option").eq(0)).toEqualOption(null);
      expect(element.val()).not.toEqualUnknownValue(null);
      expect(element.find("option").eq(0)).not.toEqualUnknownOption(null);
    });

    it("should insert a unknown option if bound to something not in the list", () => {
      createSingleSelect();

      scope.$apply(() => {
        scope.values = [{ name: "A" }];
        scope.selected = {};
      });

      expect(element.find("option").length).toEqual(2);
      expect(element.val()).toEqualUnknownValue(scope.selected);
      expect(element.find("option").eq(0)).toEqualUnknownOption(scope.selected);

      scope.$apply(() => {
        scope.selected = scope.values[0];
      });

      expect(element).toEqualSelectValue(scope.selected);
      expect(element.find("option").length).toEqual(1);
    });

    it(
      "should insert and select temporary unknown option when no options-model match, empty " +
        "option is present and model is defined",
      () => {
        scope.selected = "C";
        scope.values = [{ name: "A" }, { name: "B" }];
        createSingleSelect(true);

        expect(element[0].value).toBe("?");
        expect(element[0].length).toBe(4);

        scope.$apply("selected = values[1]");

        expect(element[0].value).not.toBe("");
        expect(element[0].length).toBe(3);
      },
    );

    it('should select correct input if previously selected option was "?"', () => {
      createSingleSelect();

      scope.$apply(() => {
        scope.values = [{ name: "A" }, { name: "B" }];
        scope.selected = {};
      });

      expect(element.find("option").length).toEqual(3);
      expect(element.val()).toEqualUnknownValue();
      expect(element.find("option").eq(0)).toEqualUnknownOption();

      setSelectValue(element, 1);

      expect(element.find("option").length).toEqual(2);
      expect(element).toEqualSelectValue(scope.selected);
      expect(element.find("option").eq(0)[0].selected).toBeTruthy();
    });

    it("should remove unknown option when empty option exists and model is undefined", () => {
      scope.selected = "C";
      scope.values = [{ name: "A" }, { name: "B" }];
      createSingleSelect(true);

      expect(element[0].value).toBe("?");

      scope.selected = undefined;
      expect(element[0].value).toBe("");
    });

    it('should ensure that at least one option element has the "selected" attribute', () => {
      createSelect({
        "ng-model": "selected",
        "ng-options": "item.id as item.name for item in values",
      });

      scope.$apply(() => {
        scope.values = [
          { id: 10, name: "A" },
          { id: 20, name: "B" },
        ];
      });
      expect(element.val()).toEqualUnknownValue();
      expect(element.find("option").eq(0).attr("selected")).toEqual("selected");

      scope.$apply(() => {
        scope.selected = 10;
      });
      // Here the ? option should disappear and the first real option should have selected attribute
      expect(element).toEqualSelectValue(scope.selected);
      expect(element.find("option").eq(0).attr("selected")).toEqual("selected");

      // Here the selected value is changed and we change the selected attribute
      scope.$apply(() => {
        scope.selected = 20;
      });
      expect(element).toEqualSelectValue(scope.selected);
      expect(element.find("option").eq(1).attr("selected")).toEqual("selected");

      scope.$apply(() => {
        scope.values.push({ id: 30, name: "C" });
      });
      expect(element).toEqualSelectValue(scope.selected);
      expect(element.find("option").eq(1).attr("selected")).toEqual("selected");

      // Here the ? option should reappear and have selected attribute
      scope.$apply(() => {
        scope.selected = undefined;
      });
      expect(element.val()).toEqualUnknownValue();
      expect(element.find("option").eq(0).attr("selected")).toEqual("selected");
    });

    it("should select the correct option for selectAs and falsy values", () => {
      scope.values = [
        { value: 0, label: "zero" },
        { value: 1, label: "one" },
      ];
      scope.selected = "";
      createSelect({
        "ng-model": "selected",
        "ng-options": "option.value as option.label for option in values",
      });

      const option = element.find("option").eq(0);
      expect(option).toEqualUnknownOption();
    });

    it("should update the model if the selected option is removed", () => {
      scope.values = [
        { value: 0, label: "zero" },
        { value: 1, label: "one" },
      ];
      scope.selected = 1;
      createSelect({
        "ng-model": "selected",
        "ng-options": "option.value as option.label for option in values",
      });
      expect(element).toEqualSelectValue(1);

      // Check after initial option update
      scope.$apply(() => {
        scope.values.pop();
      });

      expect(element.val()).toEqual("?");
      expect(scope.selected).toEqual(null);

      // Check after model change
      scope.$apply(() => {
        scope.selected = 0;
      });

      expect(element).toEqualSelectValue(0);

      scope.$apply(() => {
        scope.values.pop();
      });

      expect(element.val()).toEqual("?");
      expect(scope.selected).toEqual(null);
    });

    it("should update the model if all the selected (multiple) options are removed", () => {
      scope.values = [
        { value: 0, label: "zero" },
        { value: 1, label: "one" },
        { value: 2, label: "two" },
      ];
      scope.selected = [1, 2];
      createSelect({
        "ng-model": "selected",
        multiple: true,
        "ng-options": "option.value as option.label for option in values",
      });

      expect(element).toEqualSelectValue([1, 2], true);

      // Check after initial option update
      scope.$apply(() => {
        scope.values.pop();
      });

      expect(element).toEqualSelectValue([1], true);
      expect(scope.selected).toEqual([1]);

      scope.$apply(() => {
        scope.values.pop();
      });

      expect(element).toEqualSelectValue([], true);
      expect(scope.selected).toEqual([]);

      // Check after model change
      scope.$apply(() => {
        scope.selected = [0];
      });

      expect(element).toEqualSelectValue([0], true);

      scope.$apply(() => {
        scope.values.pop();
      });

      expect(element).toEqualSelectValue([], true);
      expect(scope.selected).toEqual([]);
    });
  });

  describe("empty option", () => {
    it("should be compiled as template, be watched and updated", () => {
      let option;
      createSingleSelect('<option value="">blank is {{blankVal}}</option>');

      scope.$apply(() => {
        scope.blankVal = "so blank";
        scope.values = [{ name: "A" }];
      });

      // check blank option is first and is compiled
      expect(element.find("option").length).toBe(2);
      option = element.find("option").eq(0);
      expect(option.val()).toBe("");
      expect(option.text()).toBe("blank is so blank");

      scope.$apply(() => {
        scope.blankVal = "not so blank";
      });

      // check blank option is first and is compiled
      expect(element.find("option").length).toBe(2);
      option = element.find("option").eq(0);
      expect(option.val()).toBe("");
      expect(option.text()).toBe("blank is not so blank");
    });

    it("should support binding via ngBindTemplate directive", () => {
      let option;
      createSingleSelect(
        '<option value="" ng-bind-template="blank is {{blankVal}}"></option>',
      );

      scope.$apply(() => {
        scope.blankVal = "so blank";
        scope.values = [{ name: "A" }];
      });

      // check blank option is first and is compiled
      expect(element.find("option").length).toBe(2);
      option = element.find("option").eq(0);
      expect(option.val()).toBe("");
      expect(option.text()).toBe("blank is so blank");
    });

    it("should support binding via ngBind attribute", () => {
      let option;
      createSingleSelect('<option value="" ng-bind="blankVal"></option>');

      scope.$apply(() => {
        scope.blankVal = "is blank";
        scope.values = [{ name: "A" }];
      });

      // check blank option is first and is compiled
      expect(element.find("option").length).toBe(2);
      option = element.find("option").eq(0);
      expect(option.val()).toBe("");
      expect(option.text()).toBe("is blank");
    });

    it("should be ignored when it has no value attribute", () => {
      // The option value is set to the textContent if there's no value attribute,
      // so in that case it doesn't count as a blank option
      createSingleSelect("<option>--select--</option>");
      scope.$apply(() => {
        scope.values = [{ name: "A" }, { name: "B" }, { name: "C" }];
      });

      const options = element.find("option");

      expect(options.eq(0)).toEqualUnknownOption();
      expect(options.eq(1)).toEqualOption(scope.values[0], "A");
      expect(options.eq(2)).toEqualOption(scope.values[1], "B");
      expect(options.eq(3)).toEqualOption(scope.values[2], "C");
    });

    it("should be rendered with the attributes preserved", () => {
      let option;
      createSingleSelect(
        '<option value="" class="coyote" id="road-runner" ' +
          'custom-attr="custom-attr">{{blankVal}}</option>',
      );

      scope.$apply(() => {
        scope.blankVal = "is blank";
      });

      // check blank option is first and is compiled
      option = element.find("option").eq(0);
      expect(option[0].classList.contains("coyote")).toBeTruthy();
      expect(option.attr("id")).toBe("road-runner");
      expect(option.attr("custom-attr")).toBe("custom-attr");
    });

    it("should be selected, if it is available and no other option is selected", () => {
      // selectedIndex is used here because JQLite incorrectly reports element.val()
      scope.$apply(() => {
        scope.values = [{ name: "A" }];
      });
      createSingleSelect(true);
      // ensure the first option (the blank option) is selected
      expect(element[0].selectedIndex).toEqual(0);
      // ensure the option has not changed following the digest
      expect(element[0].selectedIndex).toEqual(0);
    });

    it("should be selectable if select is multiple", () => {
      createMultiSelect(true);

      // select the empty option
      setSelectValue(element, 0);

      // ensure selection and correct binding
      expect(element[0].selectedIndex).toEqual(0);
      expect(scope.selected).toEqual([]);
    });

    it("should be possible to use ngIf in the blank option", () => {
      let option;
      createSingleSelect('<option ng-if="isBlank" value="">blank</option>');

      scope.$apply(() => {
        scope.values = [{ name: "A" }];
        scope.isBlank = true;
      });

      expect(element[0].value).toBe("");

      scope.$apply("isBlank = false");

      expect(element[0].value).toBe("?");

      scope.$apply("isBlank = true");

      expect(element[0].value).toBe("");
    });

    it("should be possible to use ngIf in the blank option when values are available upon linking", () => {
      let options;

      scope.values = [{ name: "A" }];
      createSingleSelect('<option ng-if="isBlank" value="">blank</option>');

      scope.$apply("isBlank = true");

      options = element.find("option");
      expect(options.length).toBe(2);
      expect(options.eq(0).val()).toBe("");
      expect(options.eq(0).text()).toBe("blank");

      scope.$apply("isBlank = false");

      expect(element[0].value).toBe("?");
    });

    it("should select the correct option after linking when the ngIf expression is initially falsy", () => {
      scope.values = [{ name: "black" }, { name: "white" }, { name: "red" }];
      scope.selected = scope.values[2];

      expect(() => {
        createSingleSelect('<option ng-if="isBlank" value="">blank</option>');
        scope.$apply();
      }).not.toThrow();

      expect(element.find("option")[2].selected).toBe(true);
      expect(linkLog).toEqual(["linkNgOptions"]);
    });

    it('should add / remove the "selected" attribute on empty option which has an initially falsy ngIf expression', () => {
      scope.values = [{ name: "black" }, { name: "white" }, { name: "red" }];
      scope.selected = scope.values[2];

      createSingleSelect('<option ng-if="isBlank" value="">blank</option>');
      scope.$apply();

      expect(element.find("option")[2].selected).toBe(true);

      scope.$apply("isBlank = true");
      expect(element.find("option")[0].value).toBe("");
      expect(element.find("option")[0].selected).toBe(false);

      scope.$apply("selected = null");
      expect(element.find("option")[0].value).toBe("");
      expect(element.find("option")[0].selected).toBe(true);

      scope.selected = scope.values[1];
      scope.$apply();
      expect(element.find("option")[0].value).toBe("");
      expect(element.find("option")[0].selected).toBe(false);
      expect(element.find("option")[2].selected).toBe(true);
    });

    it('should add / remove the "selected" attribute on empty option which has an initially truthy ngIf expression when no option is selected', () => {
      scope.values = [{ name: "black" }, { name: "white" }, { name: "red" }];
      scope.isBlank = true;

      createSingleSelect('<option ng-if="isBlank" value="">blank</option>');
      scope.$apply();

      expect(element.find("option")[0].value).toBe("");
      expect(element.find("option")[0].selected).toBe(true);
      scope.selected = scope.values[2];
      scope.$apply();
      expect(element.find("option")[0].selected).toBe(false);
      expect(element.find("option")[3].selected).toBe(true);
    });

    it('should add the "selected" attribute on empty option which has an initially falsy ngIf expression when no option is selected', () => {
      scope.values = [{ name: "black" }, { name: "white" }, { name: "red" }];

      createSingleSelect('<option ng-if="isBlank" value="">blank</option>');
      scope.$apply();

      expect(element.find("option")[0].selected).toBe(false);

      scope.isBlank = true;
      scope.$apply();

      expect(element.find("option")[0].value).toBe("");
      expect(element.find("option")[0].selected).toBe(true);
      expect(element.find("option")[1].selected).toBe(false);
    });

    it("should not throw when a directive compiles the blank option before ngOptions is linked", () => {
      expect(() => {
        createSelect(
          {
            "o-compile-contents": "",
            name: "select",
            "ng-model": "value",
            "ng-options": "item for item in items",
          },
          true,
        );
      }).not.toThrow();

      expect(linkLog).toEqual(["linkCompileContents", "linkNgOptions"]);
    });

    it("should not throw with a directive that replaces", () => {
      let $templateCache = injector.get("$templateCache");
      $templateCache.set(
        "select_template.html",
        '<select ng-options="option as option for option in selectable_options"> <option value="">This is a test</option> </select>',
      );

      scope.options = ["a", "b", "c", "d"];

      expect(() => {
        element = $compile(
          '<custom-select ng-model="value" options="options"></custom-select>',
        )(scope);
      }).not.toThrow();

      dealoc(element);
    });
  });

  describe("on change", () => {
    it("should update model on change", () => {
      createSingleSelect();

      scope.$apply(() => {
        scope.values = [{ name: "A" }, { name: "B" }];
        scope.selected = scope.values[0];
      });

      expect(element).toEqualSelectValue(scope.selected);

      setSelectValue(element, 1);
      expect(scope.selected).toEqual(scope.values[1]);
    });

    it("should update model on change through expression", () => {
      createSelect({
        "ng-model": "selected",
        "ng-options": "item.id as item.name for item in values",
      });

      scope.$apply(() => {
        scope.values = [
          { id: 10, name: "A" },
          { id: 20, name: "B" },
        ];
        scope.selected = scope.values[0].id;
      });

      expect(element).toEqualSelectValue(scope.selected);

      setSelectValue(element, 1);
      expect(scope.selected).toEqual(scope.values[1].id);
    });

    it("should update model to null on change", () => {
      createSingleSelect(true);

      scope.$apply(() => {
        scope.values = [{ name: "A" }, { name: "B" }];
        scope.selected = scope.values[0];
      });

      element.val("");
      browserTrigger(element, "change");
      expect(scope.selected).toEqual(null);
    });

    // Regression https://github.com/angular/angular.js/issues/7855
    it("should update the model with ng-change", () => {
      createSelect({
        "ng-change": "change()",
        "ng-model": "selected",
        "ng-options": "value for value in values",
      });

      scope.$apply(() => {
        scope.values = ["A", "B"];
        scope.selected = "A";
      });

      scope.change = function () {
        scope.selected = "A";
      };

      element.find("option")[1].selected = true;

      browserTrigger(element, "change");
      expect(element.find("option")[0].selected).toBeTruthy();
      expect(scope.selected).toEqual("A");
    });
  });

  describe("disabled blank", () => {
    it("should select disabled blank by default", () => {
      const html =
        '<select ng-model="someModel" ng-options="c for c in choices">' +
        '<option value="" disabled>Choose One</option>' +
        "</select>";
      scope.$apply(() => {
        scope.choices = ["A", "B", "C"];
      });

      compile(html);

      const options = element.find("option");
      const optionToSelect = options.eq(0);
      expect(optionToSelect.text()).toBe("Choose One");
      expect(optionToSelect[0].selected).toBe(true);
      expect(element[0].value).toBe("");

      dealoc(element);
    });

    it("should select disabled blank by default when select is required", () => {
      const html =
        '<select ng-model="someModel" ng-options="c for c in choices" required>' +
        '<option value="" disabled>Choose One</option>' +
        "</select>";
      scope.$apply(() => {
        scope.choices = ["A", "B", "C"];
      });

      compile(html);

      const options = element.find("option");
      const optionToSelect = options.eq(0);
      expect(optionToSelect.text()).toBe("Choose One");
      expect(optionToSelect[0].selected).toBe(true);
      expect(element[0].value).toBe("");

      dealoc(element);
    });
  });

  describe("select-many", () => {
    it("should read multiple selection", () => {
      createMultiSelect();

      scope.$apply(() => {
        scope.values = [{ name: "A" }, { name: "B" }];
        scope.selected = [];
      });

      expect(element.find("option").length).toEqual(2);
      expect(element.find("option")[0].selected).toBeFalsy();
      expect(element.find("option")[1].selected).toBeFalsy();

      scope.$apply(() => {
        scope.selected.push(scope.values[1]);
      });

      expect(element.find("option").length).toEqual(2);
      expect(element.find("option")[0].selected).toBeFalsy();
      expect(element.find("option")[1].selected).toBeTruthy();

      scope.$apply(() => {
        scope.selected.push(scope.values[0]);
      });

      expect(element.find("option").length).toEqual(2);
      expect(element.find("option")[0].selected).toBeTruthy();
      expect(element.find("option")[1].selected).toBeTruthy();
    });

    it("should update model on change", () => {
      createMultiSelect();

      scope.$apply(() => {
        scope.values = [{ name: "A" }, { name: "B" }];
        scope.selected = [];
      });

      element.find("option")[0].selected = true;

      browserTrigger(element, "change");
      expect(scope.selected).toEqual([scope.values[0]]);
    });

    it("should select from object", () => {
      createSelect({
        "ng-model": "selected",
        multiple: true,
        "ng-options": "key as value for (key,value) in values",
      });
      scope.values = { 0: "A", 1: "B" };

      scope.selected = ["1"];
      expect(element.find("option")[1].selected).toBe(true);

      element.find("option")[0].selected = true;
      browserTrigger(element, "change");
      expect(scope.selected).toEqual(["0", "1"]);

      element.find("option")[1].selected = false;
      browserTrigger(element, "change");
      expect(scope.selected).toEqual(["0"]);
    });

    it("should deselect all options when model is emptied", () => {
      createMultiSelect();
      scope.$apply(() => {
        scope.values = [{ name: "A" }, { name: "B" }];
        scope.selected = [scope.values[0]];
      });
      expect(element.find("option")[0].selected).toEqual(true);

      scope.$apply(() => {
        scope.selected.pop();
      });

      expect(element.find("option")[0].selected).toEqual(false);
    });

    // Support: Safari 9+
    // This test relies defining a getter/setter `selected` property on either `<option>` elements
    // or their prototype. Some browsers (including Safari 9) are very flakey when the
    // getter/setter is not defined on the prototype (probably due to some bug). On Safari 9, the
    // getter/setter that is already defined on the `<option>` element's prototype is not
    // configurable, so we can't overwrite it with our spy.
    if (
      !/\b(9|\d{2})(?:\.\d+)+[\s\S]*safari/i.test(window.navigator.userAgent)
    ) {
      it("should not re-set the `selected` property if it already has the correct value", () => {
        scope.values = [{ name: "A" }, { name: "B" }];
        createMultiSelect();

        const options = element.find("option");
        const optionsSetSelected = [];
        const _selected = [];

        // Set up spies
        const optionProto = Object.getPrototypeOf(options[0]);
        const originalSelectedDescriptor =
          isFunction(Object.getOwnPropertyDescriptor) &&
          Object.getOwnPropertyDescriptor(optionProto, "selected");
        const addSpiesOnProto =
          originalSelectedDescriptor && originalSelectedDescriptor.configurable;

        Object.entries(options).forEach(([i, option]) => {
          const setSelected = function (value) {
            _selected[i] = value;
          };
          optionsSetSelected[i] = jasmine
            .createSpy(`optionSetSelected${i}`)
            .and.callFake(setSelected);
          setSelected(option.selected);
        });

        if (!addSpiesOnProto) {
          Object.entries(options).forEach(([i, option]) => {
            Object.defineProperty(option, "selected", {
              get() {
                return _selected[i];
              },
              set: optionsSetSelected[i],
            });
          });
        } else {
          // Support: Firefox 54+
          // We cannot use the above (simpler) method on all browsers because of Firefox 54+, which
          // is very flaky when the getter/setter property is defined on the element itself and not
          // the prototype. (Possibly the result of some (buggy?) optimization.)
          const getSelected = function (index) {
            return _selected[index];
          };
          const setSelected = function (index, value) {
            optionsSetSelected[index](value);
          };
          const getSelectedOriginal = function (option) {
            return originalSelectedDescriptor.get.call(option);
          };
          const setSelectedOriginal = function (option, value) {
            originalSelectedDescriptor.set.call(option, value);
          };
          const getIndexAndCall = function (
            option,
            foundFn,
            notFoundFn,
            value,
          ) {
            for (let i = 0, ii = options.length; i < ii; ++i) {
              if (options[i] === option) return foundFn(i, value);
            }
            return notFoundFn(option, value);
          };

          Object.defineProperty(optionProto, "selected", {
            get() {
              return getIndexAndCall(this, getSelected, getSelectedOriginal);
            },
            set(value) {
              return getIndexAndCall(
                this,
                setSelected,
                setSelectedOriginal,
                value,
              );
            },
          });
        }

        // Select `optionA`
        scope.$apply("selected = [values[0]]");

        expect(optionsSetSelected[0]).toHaveBeenCalledOnceWith(true);
        expect(optionsSetSelected[1]).not.toHaveBeenCalled();
        expect(options[0].selected).toBe(true);
        expect(options[1].selected).toBe(false);
        optionsSetSelected[0].calls.reset();
        optionsSetSelected[1].calls.reset();

        // Select `optionB` (`optionA` remains selected)
        scope.$apply("selected.push(values[1])");

        expect(optionsSetSelected[0]).not.toHaveBeenCalled();
        expect(optionsSetSelected[1]).toHaveBeenCalledOnceWith(true);
        expect(options[0].selected).toBe(true);
        expect(options[1].selected).toBe(true);
        optionsSetSelected[0].calls.reset();
        optionsSetSelected[1].calls.reset();

        // Unselect `optionA` (`optionB` remains selected)
        scope.$apply("selected.shift()");

        expect(optionsSetSelected[0]).toHaveBeenCalledOnceWith(false);
        expect(optionsSetSelected[1]).not.toHaveBeenCalled();
        expect(options[0].selected).toBe(false);
        expect(options[1].selected).toBe(true);
        optionsSetSelected[0].calls.reset();
        optionsSetSelected[1].calls.reset();

        // Reselect `optionA` (`optionB` remains selected)
        scope.$apply("selected.push(values[0])");

        expect(optionsSetSelected[0]).toHaveBeenCalledOnceWith(true);
        expect(optionsSetSelected[1]).not.toHaveBeenCalled();
        expect(options[0].selected).toBe(true);
        expect(options[1].selected).toBe(true);
        optionsSetSelected[0].calls.reset();
        optionsSetSelected[1].calls.reset();

        // Unselect `optionB` (`optionA` remains selected)
        scope.$apply("selected.shift()");

        expect(optionsSetSelected[0]).not.toHaveBeenCalled();
        expect(optionsSetSelected[1]).toHaveBeenCalledOnceWith(false);
        expect(options[0].selected).toBe(true);
        expect(options[1].selected).toBe(false);
        optionsSetSelected[0].calls.reset();
        optionsSetSelected[1].calls.reset();

        // Unselect `optionA`
        scope.$apply("selected.length = 0");

        expect(optionsSetSelected[0]).toHaveBeenCalledOnceWith(false);
        expect(optionsSetSelected[1]).not.toHaveBeenCalled();
        expect(options[0].selected).toBe(false);
        expect(options[1].selected).toBe(false);
        optionsSetSelected[0].calls.reset();
        optionsSetSelected[1].calls.reset();

        // Support: Firefox 54+
        // Restore `originalSelectedDescriptor`
        if (addSpiesOnProto) {
          Object.defineProperty(
            optionProto,
            "selected",
            originalSelectedDescriptor,
          );
        }
      });
    }

    if (window.MutationObserver) {
      // IE9 and IE10 do not support MutationObserver
      // Since the feature is only needed for a test, it's okay to skip these browsers
      it("should render the initial options only one time", () => {
        scope.value = ["black"];
        scope.values = ["black", "white", "red"];
        // observe-child-list adds a MutationObserver that we will read out after ngOptions
        // has been compiled
        createSelect({
          "ng-model": "selected",
          "ng-options": "value.name for value in values",
          multiple: "true",
          "observe-child-list": "",
        });

        const optionEls = element[0].querySelectorAll("option");
        const records = childListMutationObserver.takeRecords();

        expect(records.length).toBe(1);
        expect(records[0].addedNodes).toEqual(optionEls);
      });
    }
  });

  describe("required state", () => {
    it("should set the error if the empty option is selected", () => {
      createSelect(
        {
          "ng-model": "selection",
          "ng-options": "item for item in values",
          required: "",
        },
        true,
      );

      scope.$apply(() => {
        scope.values = ["a", "b"];
        scope.selection = scope.values[0];
      });
      expect(element[0].classList.contains("ng-valid")).toBeTrue();
      expect(ngModelCtrl.$error.required).toBeFalsy();

      const options = element.find("option");

      // // view -> model
      setSelectValue(element, 0);
      expect(element[0].classList.contains("ng-invalid")).toBeTrue();
      expect(ngModelCtrl.$error.required).toBeTruthy();

      setSelectValue(element, 1);
      expect(element[0].classList.contains("ng-valid")).toBeTrue();
      expect(ngModelCtrl.$error.required).toBeFalsy();

      // // model -> view
      scope.$apply("selection = null");
      expect(options[0].selected).toBe(true);
      expect(element[0].classList.contains("ng-invalid")).toBeTrue();
      expect(ngModelCtrl.$error.required).toBeTruthy();
    });

    it("should validate with empty option and bound ngRequired", () => {
      createSelect(
        {
          "ng-model": "value",
          "ng-options": "item.name for item in values",
          "ng-required": "required",
        },
        true,
      );

      scope.$apply(() => {
        scope.values = [
          { name: "A", id: 1 },
          { name: "B", id: 2 },
        ];
        scope.required = false;
      });

      const options = element.find("option");

      setSelectValue(element, 0);
      expect(element[0].classList.contains("ng-valid")).toBeTrue();

      scope.$apply("required = true");
      expect(element[0].classList.contains("ng-invalid")).toBeTrue();

      scope.$apply("value = values[0]");
      expect(element[0].classList.contains("ng-valid")).toBeTrue();

      setSelectValue(element, 0);
      expect(element[0].classList.contains("ng-invalid")).toBeTrue();

      scope.$apply("required = false");
      expect(element[0].classList.contains("ng-valid")).toBeTrue();
    });

    it("should treat an empty array as invalid when `multiple` attribute used", () => {
      createSelect(
        {
          "ng-model": "value",
          "ng-options": "item.name for item in values",
          "ng-required": "required",
          multiple: "",
        },
        true,
      );

      scope.$apply(() => {
        scope.value = [];
        scope.values = [
          { name: "A", id: 1 },
          { name: "B", id: 2 },
        ];
        scope.required = true;
      });
      expect(element[0].classList.contains("ng-invalid")).toBeTrue();

      scope.$apply(() => {
        // ngModelWatch does not set objectEquality flag
        // array must be replaced in order to trigger $formatters
        scope.value = [scope.values[0]];
      });
      expect(element[0].classList.contains("ng-valid")).toBeTrue();
    });

    it("should NOT set the error if the empty option is present but required attribute is not", () => {
      scope.$apply(() => {
        scope.values = ["a", "b"];
      });

      createSingleSelect();

      expect(element[0].classList.contains("ng-valid")).toBeTrue();
      expect(element[0].classList.contains("ng-pristine")).toBeTrue();
      expect(ngModelCtrl.$error.required).toBeFalsy();
    });

    it("should NOT set the error if the unknown option is selected", () => {
      createSelect({
        "ng-model": "selection",
        "ng-options": "item for item in values",
        required: "",
      });

      scope.$apply(() => {
        scope.values = ["a", "b"];
        scope.selection = "a";
      });

      expect(element[0].classList.contains("ng-valid")).toBeTrue();
      expect(ngModelCtrl.$error.required).toBeFalsy();

      scope.$apply('selection = "c"');
      expect(element[0].value).toBe("?");
      expect(element[0].classList.contains("ng-valid")).toBeTrue();
      expect(ngModelCtrl.$error.required).toBeFalsy();
    });

    it("should allow falsy values as values", () => {
      createSelect(
        {
          "ng-model": "value",
          "ng-options": "item.value as item.name for item in values",
          "ng-required": "required",
        },
        true,
      );

      scope.$apply(() => {
        scope.values = [
          { name: "True", value: true },
          { name: "False", value: false },
        ];
        scope.required = false;
      });

      setSelectValue(element, 2);
      expect(element[0].classList.contains("ng-valid")).toBeTrue();
      expect(scope.value).toBe(false);

      scope.$apply("required = true");
      expect(element[0].classList.contains("ng-valid")).toBeTrue();
      expect(scope.value).toBe(false);
    });

    it("should validate after option list was updated", () => {
      createSelect(
        {
          "ng-model": "selection",
          "ng-options": "item for item in values",
          required: "",
        },
        true,
      );

      scope.$apply(() => {
        scope.values = ["A", "B"];
        scope.selection = scope.values[0];
      });

      expect(element[0].value).toBe("string:A");
      expect(element[0].classList.contains("ng-valid")).toBeTrue();
      expect(ngModelCtrl.$error.required).toBeFalsy();

      scope.$apply(() => {
        scope.values = ["C", "D"];
      });

      expect(element[0].value).toBe("");
      expect(element[0].classList.contains("ng-invalid")).toBeTrue();
      expect(ngModelCtrl.$error.required).toBeTruthy();
      // ngModel sets undefined for invalid values
      expect(scope.selection).toBeUndefined();
    });
  });

  describe("required and empty option", () => {
    it("should select the empty option after compilation", () => {
      createSelect(
        {
          name: "select",
          "ng-model": "value",
          "ng-options": "item for item in ['first', 'second', 'third']",
          required: "required",
        },
        true,
      );

      expect(element.val()).toBe("");
      const emptyOption = element.find("option").eq(0);
      expect(emptyOption[0].selected).toBe(true);
      expect(emptyOption.val()).toBe("");
    });
  });

  describe("ngModelCtrl", () => {
    it('should prefix the model value with the word "the" using $parsers', () => {
      createSelect({
        name: "select",
        "ng-model": "value",
        "ng-options": "item for item in ['first', 'second', 'third', 'fourth']",
      });

      scope.form.select.$parsers.push((value) => `the ${value}`);

      setSelectValue(element, 3);
      expect(scope.value).toBe("the third");
      expect(element).toEqualSelectValue("third");
    });

    it('should prefix the view value with the word "the" using $formatters', () => {
      createSelect({
        name: "select",
        "ng-model": "value",
        "ng-options":
          "item for item in ['the first', 'the second', 'the third', 'the fourth']",
      });

      scope.form.select.$formatters.push((value) => `the ${value}`);

      scope.$apply(() => {
        scope.value = "third";
      });
      expect(element).toEqualSelectValue("the third");
    });

    it("should fail validation when $validators fail", () => {
      createSelect({
        name: "select",
        "ng-model": "value",
        "ng-options": "item for item in ['first', 'second', 'third', 'fourth']",
      });

      scope.form.select.$validators.fail = function () {
        return false;
      };

      setSelectValue(element, 3);
      expect(element[0].classList.contains("ng-invalid")).toBeTrue();
      expect(scope.value).toBeUndefined();
      expect(element).toEqualSelectValue("third");
    });

    it("should pass validation when $validators pass", () => {
      createSelect({
        name: "select",
        "ng-model": "value",
        "ng-options": "item for item in ['first', 'second', 'third', 'fourth']",
      });

      scope.form.select.$validators.pass = function () {
        return true;
      };

      setSelectValue(element, 3);
      expect(element[0].classList.contains("ng-valid")).toBeTrue();
      expect(scope.value).toBe("third");
      expect(element).toEqualSelectValue("third");
    });

    it("should fail validation when $asyncValidators fail", () => {
      let defer;
      createSelect({
        name: "select",
        "ng-model": "value",
        "ng-options": "item for item in ['first', 'second', 'third', 'fourth']",
      });

      scope.form.select.$asyncValidators.async = function () {
        defer = $q.defer();
        return defer.promise;
      };

      setSelectValue(element, 3);
      expect(scope.form.select.$pending).toBeDefined();
      expect(scope.value).toBeUndefined();
      expect(element).toEqualSelectValue("third");

      defer.reject();
      expect(scope.form.select.$pending).toBeUndefined();
      expect(scope.value).toBeUndefined();
      expect(element).toEqualSelectValue("third");
    });

    it("should pass validation when $asyncValidators pass", () => {
      let defer;
      createSelect({
        name: "select",
        "ng-model": "value",
        "ng-options": "item for item in ['first', 'second', 'third', 'fourth']",
      });

      scope.form.select.$asyncValidators.async = function () {
        defer = $q.defer();
        return defer.promise;
      };

      setSelectValue(element, 3);
      expect(scope.form.select.$pending).toBeDefined();
      expect(scope.value).toBeUndefined();
      expect(element).toEqualSelectValue("third");

      defer.resolve();
      expect(scope.form.select.$pending).toBeUndefined();
      expect(scope.value).toBe("third");
      expect(element).toEqualSelectValue("third");
    });

    it("should not set $dirty with select-multiple after compilation", () => {
      scope.values = ["a", "b"];
      scope.selected = ["b"];

      createSelect({
        "ng-model": "selected",
        multiple: true,
        "ng-options": "value for value in values",
        name: "select",
      });

      expect(element.find("option")[1].selected).toBe(true);
      expect(scope.form.select.$pristine).toBe(true);
    });
  });

  describe("selectCtrl api", () => {
    it("should reflect the status of empty and unknown option", () => {
      createSingleSelect('<option ng-if="isBlank" value="">blank</option>');

      const selectCtrl = element.controller("select");

      scope.$apply(() => {
        scope.values = [{ name: "A" }, { name: "B" }];
        scope.isBlank = true;
      });

      expect(element[0].value).toBe("");
      expect(selectCtrl.$hasEmptyOption()).toBe(true);
      expect(selectCtrl.$isEmptyOptionSelected()).toBe(true);
      expect(selectCtrl.$isUnknownOptionSelected()).toBe(false);

      // empty -> selection
      scope.$apply(() => {
        scope.selected = scope.values[0];
      });

      expect(element[0].value).not.toBe("");
      expect(selectCtrl.$hasEmptyOption()).toBe(true);
      expect(selectCtrl.$isEmptyOptionSelected()).toBe(false);
      expect(selectCtrl.$isUnknownOptionSelected()).toBe(false);

      // remove empty
      scope.$apply("isBlank = false");

      expect(element[0].value).not.toBe("");
      expect(selectCtrl.$hasEmptyOption()).toBe(false);
      expect(selectCtrl.$isEmptyOptionSelected()).toBe(false);
      expect(selectCtrl.$isUnknownOptionSelected()).toBe(false);

      // selection -> unknown
      scope.$apply('selected = "unmatched"');

      expect(element[0].value).toBe("?");
      expect(selectCtrl.$hasEmptyOption()).toBe(false);
      expect(selectCtrl.$isEmptyOptionSelected()).toBe(false);
      expect(selectCtrl.$isUnknownOptionSelected()).toBe(true);

      // add empty
      scope.$apply("isBlank = true");

      expect(element[0].value).toBe("?");
      expect(selectCtrl.$hasEmptyOption()).toBe(true);
      expect(selectCtrl.$isEmptyOptionSelected()).toBe(false);
      expect(selectCtrl.$isUnknownOptionSelected()).toBe(true);

      // unknown -> empty
      scope.$apply(() => {
        scope.selected = null;
      });

      expect(element[0].value).toBe("");
      expect(selectCtrl.$hasEmptyOption()).toBe(true);
      expect(selectCtrl.$isEmptyOptionSelected()).toBe(true);
      expect(selectCtrl.$isUnknownOptionSelected()).toBe(false);

      // empty -> unknown
      scope.$apply('selected = "unmatched"');

      expect(element[0].value).toBe("?");
      expect(selectCtrl.$hasEmptyOption()).toBe(true);
      expect(selectCtrl.$isEmptyOptionSelected()).toBe(false);
      expect(selectCtrl.$isUnknownOptionSelected()).toBe(true);

      // unknown -> selection
      scope.$apply(() => {
        scope.selected = scope.values[1];
      });

      expect(element[0].value).not.toBe("");
      expect(selectCtrl.$hasEmptyOption()).toBe(true);
      expect(selectCtrl.$isEmptyOptionSelected()).toBe(false);
      expect(selectCtrl.$isUnknownOptionSelected()).toBe(false);

      // selection -> empty
      scope.$apply("selected = null");

      expect(element[0].value).toBe("");
      expect(selectCtrl.$hasEmptyOption()).toBe(true);
      expect(selectCtrl.$isEmptyOptionSelected()).toBe(true);
      expect(selectCtrl.$isUnknownOptionSelected()).toBe(false);
    });
  });
});
