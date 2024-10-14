import { Angular } from "../../loader";
import { createInjector } from "../../core/di/injector";
import { dealoc, JQLite } from "../../shared/jqlite/jqlite";
import { forEach, hashKey, equals, isNumberNaN } from "../../shared/utils";
import { browserTrigger } from "../../shared/test-utils";

describe("select", () => {
  let scope;
  let formElement;
  let element;
  let $compile;
  let ngModelCtrl;
  let selectCtrl;
  let renderSpy;
  let $rootScope;
  const optionAttributesList = [];

  function compile(html) {
    formElement = JQLite(`<form name="form">${html}</form>`);
    element = formElement.find("select");
    $compile(formElement)(scope);
    ngModelCtrl = element.controller("ngModel");
    ;
  }

  function setSelectValue(selectElement, optionIndex) {
    const option = selectElement.find("option").eq(optionIndex);
    selectElement.val(option.val());
    browserTrigger(element, "change");
  }

  function compileRepeatedOptions() {
    compile(
      '<select ng-model="robot">' +
        '<option value="{{item.value}}" ng-repeat="item in robots">{{item.label}}</option>' +
        "</select>",
    );
  }

  function compileGroupedOptions() {
    compile(
      '<select ng-model="mySelect">' +
        '<option ng-repeat="item in values">{{item.name}}</option>' +
        '<optgroup ng-repeat="group in groups" label="{{group.name}}">' +
        '<option ng-repeat="item in group.values">{{item.name}}</option>' +
        "</optgroup>" +
        "</select>",
    );
  }

  function unknownValue(value) {
    return `? ${hashKey(value)} ?`;
  }

  beforeEach(() => {
    window.angular = new Angular();
    window.angular
      .module("myModule", ["ng"])
      .decorator("$exceptionHandler", function () {
        return (exception, cause) => {
          throw new Error(exception);
        };
      });
    let injector = window.angular.bootstrap(document.getElementById("dummy"), [
      "myModule",
      ($compileProvider) => {
        $compileProvider.directive("spyOnWriteValue", () => ({
          require: "select",
          link: {
            pre(scope, element, attrs, ctrl) {
              selectCtrl = ctrl;
              renderSpy = jasmine.createSpy("renderSpy");
              selectCtrl.ngModelCtrl.$render = renderSpy.and.callFake(
                selectCtrl.ngModelCtrl.$render,
              );
              spyOn(selectCtrl, "writeValue").and.callThrough();
            },
          },
        }));
        $compileProvider.directive("myOptions", () => ({
          scope: { myOptions: "=" },
          replace: true,
          template:
            '<option value="{{ option.value }}" ng-repeat="option in myOptions">' +
            "{{ options.label }}" +
            "</option>",
        }));

        $compileProvider.directive("exposeAttributes", () => ({
          require: "^^select",
          link: {
            pre(scope, element, attrs, ctrl) {
              optionAttributesList.push(attrs);
            },
          },
        }));
      },
    ]);
    injector.invoke((_$rootScope_, _$compile_) => {
      scope = _$rootScope_.$new(); // create a child scope because the root scope can't be $destroy-ed
      $rootScope = _$rootScope_;
      $compile = _$compile_;
      formElement = element = null;
    });
  });

  afterEach(() => {
    scope.$destroy(); // disables unknown option work during destruction
    dealoc(formElement);
    ngModelCtrl = null;
  });

  beforeEach(() => {
    jasmine.addMatchers({
      toEqualSelectWithOptions() {
        return {
          compare(actual, expected) {
            const actualValues = {};
            let optionGroup;
            let optionValue;

            forEach(actual.find("option"), (option) => {
              optionGroup = option.parentNode.label || "";
              actualValues[optionGroup] = actualValues[optionGroup] || [];
              // IE9 doesn't populate the label property from the text property like other browsers
              optionValue = option.label || option.text;
              actualValues[optionGroup].push(
                option.selected ? [optionValue] : optionValue,
              );
            });

            const message = function () {
              return `Expected ${toJson(actualValues)} to equal ${toJson(expected)}.`;
            };

            return {
              pass: equals(expected, actualValues),
              message,
            };
          },
        };
      },
    });
  });

  it("should not add options to the select if ngModel is not present", () => {
    const scope = $rootScope;
    scope.d = "d";
    scope.e = "e";
    scope.f = "f";

    compile(
      "<select>" +
        "<option ng-value=\"'a'\">alabel</option>" +
        '<option value="b">blabel</option>' +
        "<option >c</option>" +
        '<option ng-value="d">dlabel</option>' +
        '<option value="{{e}}">elabel</option>' +
        "<option>{{f}}</option>" +
        "</select>",
    );

    const selectCtrl = element.controller("select");

    expect(selectCtrl.hasOption("a")).toBe(false);
    expect(selectCtrl.hasOption("b")).toBe(false);
    expect(selectCtrl.hasOption("c")).toBe(false);
    expect(selectCtrl.hasOption("d")).toBe(false);
    expect(selectCtrl.hasOption("e")).toBe(false);
    expect(selectCtrl.hasOption("f")).toBe(false);
  });

  describe("select-one", () => {
    it("should compile children of a select without a ngModel, but not create a model for it", () => {
      compile(
        "<select>" +
          '<option selected="true">{{a}}</option>' +
          '<option value="">{{b}}</option>' +
          "<option>C</option>" +
          "</select>",
      );
      scope.$apply(() => {
        scope.a = "foo";
        scope.b = "bar";
      });

      expect(element.text()).toBe("foobarC");
    });

    it("should not interfere with selection via selected attr if ngModel directive is not present", () => {
      compile(
        "<select>" +
          "<option>not me</option>" +
          "<option selected>me!</option>" +
          "<option>nah</option>" +
          "</select>",
      );
      expect(element[0].value).toBe("me!");
    });

    describe("required state", () => {
      it("should set the error if the empty option is selected", () => {
        compile(
          '<select name="select" ng-model="selection" required>' +
            '<option value=""></option>' +
            '<option value="a">A</option>' +
            '<option value="b">B</option>' +
            "</select>",
        );

        scope.$apply(() => {
          scope.selection = "a";
        });

        expect(element[0].classList.contains("ng-valid")).toBeTrue();
        expect(ngModelCtrl.$error.required).toBeFalsy();

        let options = element.find("option");

        // view -> model
        setSelectValue(element, 0);
        expect(element[0].classList.contains("ng-invalid")).toBeTrue();
        expect(ngModelCtrl.$error.required).toBeTruthy();

        setSelectValue(element, 1);
        expect(element[0].classList.contains("ng-valid")).toBeTrue();
        expect(ngModelCtrl.$error.required).toBeFalsy();

        // // model -> view
        scope.$apply("selection = null");
        options = element.find("option");
        expect(options[0].selected).toBe(true);
        expect(element[0].classList.contains("ng-invalid")).toBeTrue();
        expect(ngModelCtrl.$error.required).toBeTruthy();
      });

      it("should validate with empty option and bound ngRequired", () => {
        compile(
          '<select name="select" ng-model="selection" ng-required="required">' +
            '<option value=""></option>' +
            '<option value="a">A</option>' +
            '<option value="b">B</option>' +
            "</select>",
        );

        scope.$apply(() => {
          scope.required = false;
        });

        const options = element.find("option");

        setSelectValue(element, 0);
        expect(element[0].classList.contains("ng-valid")).toBeTrue();

        scope.$apply("required = true");
        expect(element[0].classList.contains("ng-invalid")).toBeTrue();

        scope.$apply('selection = "a"');
        expect(element[0].classList.contains("ng-valid")).toBeTrue();
        expect(element[0].value).toBe("a");

        setSelectValue(element, 0);
        expect(element[0].classList.contains("ng-invalid")).toBeTrue();

        scope.$apply("required = false");
        expect(element[0].classList.contains("ng-valid")).toBeTrue();
      });

      it("should not be invalid if no required attribute is present", () => {
        compile(
          '<select name="select" ng-model="selection">' +
            '<option value=""></option>' +
            '<option value="c">C</option>' +
            "</select>",
        );

        expect(element[0].classList.contains("ng-valid")).toBeTrue();
        expect(element[0].classList.contains("ng-pristine")).toBeTrue();
      });

      it("should NOT set the error if the unknown option is selected", () => {
        compile(
          '<select name="select" ng-model="selection" required>' +
            '<option value="a">A</option>' +
            '<option value="b">B</option>' +
            "</select>",
        );

        scope.$apply(() => {
          scope.selection = "a";
        });

        expect(element[0].classList.contains("ng-valid")).toBeTrue();
        expect(ngModelCtrl.$error.required).toBeFalsy();

        scope.$apply('selection = "c"');
        expect(element[0].value).toBe(unknownValue("c"));
        expect(element[0].classList.contains("ng-valid")).toBeTrue();
        expect(ngModelCtrl.$error.required).toBeFalsy();
      });
    });

    it("should work with repeated value options", () => {
      scope.robots = ["c3p0", "r2d2"];
      scope.robot = "r2d2";
      compile(
        '<select ng-model="robot">' +
          '<option ng-repeat="r in robots">{{r}}</option>' +
          "</select>",
      );
      expect(element[0].value).toBe("r2d2");

      setSelectValue(element, 0);
      expect(element[0].value).toBe("c3p0");
      expect(scope.robot).toBe("c3p0");

      scope.$apply(() => {
        scope.robots.unshift("wallee");
      });
      expect(element[0].value).toBe("c3p0");
      expect(scope.robot).toBe("c3p0");

      scope.$apply(() => {
        scope.robots = ["c3p0+", "r2d2+"];
        scope.robot = "r2d2+";
      });
      expect(element[0].value).toBe("r2d2+");
      expect(scope.robot).toBe("r2d2+");
    });

    it("should interpolate select names", () => {
      scope.robots = ["c3p0", "r2d2"];
      scope.name = "r2d2";
      scope.nameID = 47;
      compile(
        '<form name="form"><select ng-model="name" name="name{{nameID}}">' +
          '<option ng-repeat="r in robots">{{r}}</option>' +
          "</select></form>",
      );

      expect(scope.form.name47.$pristine).toBeTruthy();
      setSelectValue(element, 0);
      expect(scope.form.name47.$dirty).toBeTruthy();
      expect(scope.name).toBe("c3p0");
    });

    it("should rename select controls in form when interpolated name changes", () => {
      scope.nameID = "A";
      compile('<select ng-model="name" name="name{{nameID}}"></select>');
      expect(scope.form.nameA.$name).toBe("nameA");
      const oldModel = scope.form.nameA;
      scope.nameID = "B";
      ;
      expect(scope.form.nameA).toBeUndefined();
      expect(scope.form.nameB).toBe(oldModel);
      expect(scope.form.nameB.$name).toBe("nameB");
    });

    it("should select options in a group when there is a linebreak before an option", () => {
      scope.mySelect = "B";
      scope.$apply();

      const select = JQLite(
        '<select ng-model="mySelect">' +
          '<optgroup label="first">' +
          '<option value="A">A</option>' +
          "</optgroup>" +
          '<optgroup label="second">\n' +
          '<option value="B">B</option>' +
          "</optgroup>      " +
          "</select>",
      );

      $compile(select)(scope);
      scope.$apply();
      expect(select).toEqualSelectWithOptions({
        first: ["A"],
        second: [["B"]],
      });
      dealoc(select);
    });

    it("should only call selectCtrl.writeValue after a digest has occurred", () => {
      scope.mySelect = "B";
      scope.$apply();

      const select = JQLite(
        '<select spy-on-write-value ng-model="mySelect">' +
          '<optgroup label="first">' +
          '<option value="A">A</option>' +
          "</optgroup>" +
          '<optgroup label="second">\n' +
          '<option value="B">B</option>' +
          "</optgroup>      " +
          "</select>",
      );

      $compile(select)(scope);
      expect(selectCtrl.writeValue).not.toHaveBeenCalled();

      ;
      expect(selectCtrl.writeValue).toHaveBeenCalled();
      dealoc(select);
    });

    it('should remove the "selected" attribute from the previous option when the model changes', () => {
      compile(
        '<select name="select" ng-model="selected">' +
          '<option value="">--empty--</option>' +
          '<option value="a">A</option>' +
          '<option value="b">B</option>' +
          "</select>",
      );

      ;

      let options = element.find("option");
      expect(options[0].selected).toBeTrue();
      expect(options[1].selected).toBeFalse();
      expect(options[2].selected).toBeFalse();

      scope.selected = "a";
      ;

      options = element.find("option");
      expect(options.length).toBe(3);
      expect(options[0].selected).toBeFalse();
      expect(options[1].selected).toBeTrue();
      expect(options[2].selected).toBeFalse();

      scope.selected = "b";
      ;

      options = element.find("option");
      expect(options[0].selected).toBeFalse();
      expect(options[1].selected).toBeFalse();
      expect(options[2].selected).toBeTrue();

      // This will select the empty option
      scope.selected = null;
      ;

      expect(options[0].selected).toBeTrue();
      expect(options[1].selected).toBeFalse();
      expect(options[2].selected).toBeFalse();

      // This will add and select the unknown option
      scope.selected = "unmatched value";
      ;
      options = element.find("option");

      expect(options[0].selected).toBeTrue();
      expect(options[1].selected).toBeFalse();
      expect(options[2].selected).toBeFalse();
      expect(options[3].selected).toBeFalse();

      // Back to matched value
      scope.selected = "b";
      ;
      options = element.find("option");

      expect(options[0].selected).toBeFalse();
      expect(options[1].selected).toBeFalse();
      expect(options[2].selected).toBeTrue();
    });

    describe("empty option", () => {
      it("should allow empty option to be added and removed dynamically", () => {
        scope.dynamicOptions = [];
        scope.robot = "";
        compile(
          '<select ng-model="robot">' +
            '<option ng-repeat="opt in dynamicOptions" value="{{opt.val}}">{{opt.display}}</option>' +
            "</select>",
        );

        expect(element[0].value).toBe("? string: ?");

        scope.dynamicOptions = [
          { val: "", display: "--empty--" },
          { val: "x", display: "robot x" },
          { val: "y", display: "robot y" },
        ];
        ;

        expect(element[0].value).toBe("");

        scope.robot = "x";
        ;
        expect(element[0].value).toBe("x");
        scope.dynamicOptions.shift();

        ;
        expect(element[0].value).toBe("x");

        scope.robot = undefined;
        ;
        expect(element[0].value).toBe(unknownValue(undefined));
      });

      it("should cope use a dynamic empty option that is added to a static empty option", () => {
        // We do not make any special provisions for multiple empty options, so this behavior is
        // largely untested
        scope.dynamicOptions = [];
        scope.robot = "x";
        compile(
          '<select ng-model="robot">' +
            '<option value="">--static-select--</option>' +
            '<option ng-repeat="opt in dynamicOptions" value="{{opt.val}}">{{opt.display}}</option>' +
            "</select>",
        );
        ;
        expect(element[0].value).toBe(unknownValue("x"));

        scope.robot = undefined;
        ;
        expect(element.find("option").eq(0)[0].selected).toBe(true);
        expect(element.find("option").eq(0).text()).toBe("--static-select--");

        scope.dynamicOptions = [
          { val: "", display: "--dynamic-select--" },
          { val: "x", display: "robot x" },
          { val: "y", display: "robot y" },
        ];
        ;
        expect(element[0].value).toBe("");

        scope.dynamicOptions = [];
        ;
        expect(element[0].value).toBe("");
      });

      it("should select the empty option when model is undefined", () => {
        compile(
          '<select ng-model="robot">' +
            '<option value="">--select--</option>' +
            '<option value="x">robot x</option>' +
            '<option value="y">robot y</option>' +
            "</select>",
        );

        expect(element[0].value).toBe("");
      });

      it("should support defining an empty option anywhere in the option list", () => {
        compile(
          '<select ng-model="robot">' +
            '<option value="x">robot x</option>' +
            '<option value="">--select--</option>' +
            '<option value="y">robot y</option>' +
            "</select>",
        );

        expect(element[0].value).toBe("");
      });

      it("should set the model to empty string when empty option is selected", () => {
        scope.robot = "x";
        compile(
          '<select ng-model="robot">' +
            '<option value="">--select--</option>' +
            '<option value="x">robot x</option>' +
            '<option value="y">robot y</option>' +
            "</select>",
        );
        expect(element[0].value).toBe("x");
        setSelectValue(element, 0);

        expect(element[0].value).toBe("");
        expect(scope.robot).toBe("");
      });

      it("should remove unknown option when model is undefined", () => {
        scope.robot = "other";
        compile(
          '<select ng-model="robot">' +
            '<option value="">--select--</option>' +
            '<option value="x">robot x</option>' +
            '<option value="y">robot y</option>' +
            "</select>",
        );

        expect(element[0].value).toBe(unknownValue("other"));

        scope.robot = undefined;
        ;

        expect(element[0].value).toBe("");
      });

      it("should support option without a value attribute", () => {
        compile(
          '<select ng-model="robot">' +
            "<option>--select--</option>" +
            '<option value="x">robot x</option>' +
            '<option value="y">robot y</option>' +
            "</select>",
        );
        expect(element[0].value).toBe("? undefined:undefined ?");
      });

      it("should support option without a value with other HTML attributes", () => {
        compile(
          '<select ng-model="robot">' +
            '<option data-foo="bar">--select--</option>' +
            '<option value="x">robot x</option>' +
            '<option value="y">robot y</option>' +
            "</select>",
        );
        expect(element[0].value).toBe("? undefined:undefined ?");
      });

      describe("interactions with repeated options", () => {
        it("should select empty option when model is undefined", () => {
          scope.robots = ["c3p0", "r2d2"];
          compile(
            '<select ng-model="robot">' +
              '<option value="">--select--</option>' +
              '<option ng-repeat="r in robots">{{r}}</option>' +
              "</select>",
          );
          expect(element[0].value).toBe("");
        });

        it("should set model to empty string when selected", () => {
          scope.robots = ["c3p0", "r2d2"];
          compile(
            '<select ng-model="robot">' +
              '<option value="">--select--</option>' +
              '<option ng-repeat="r in robots">{{r}}</option>' +
              "</select>",
          );

          setSelectValue(element, 1);
          expect(element[0].value).toBe("c3p0");

          expect(scope.robot).toBe("c3p0");

          setSelectValue(element, 0);
          expect(element[0].value).toBe("");
          expect(scope.robot).toBe("");
        });

        it("should not break if both the select and repeater models change at once", () => {
          scope.robots = ["c3p0", "r2d2"];
          scope.robot = "c3p0";
          compile(
            '<select ng-model="robot">' +
              '<option value="">--select--</option>' +
              '<option ng-repeat="r in robots">{{r}}</option>' +
              "</select>",
          );

          expect(element[0].value).toBe("c3p0");

          scope.$apply(() => {
            scope.robots = ["wallee"];
            scope.robot = "";
          });

          expect(element[0].value).toBe("");
        });
      });

      it('should add/remove the "selected" attribute when the empty option is selected/unselected', () => {
        compile(
          '<select name="select" ng-model="selected">' +
            '<option value="">--select--</option>' +
            '<option value="a">A</option>' +
            '<option value="b">B</option>' +
            "</select>",
        );

        ;

        let options = element.find("option");
        expect(options.length).toBe(3);
        expect(options[0].selected).toBeTrue();
        expect(options[1].selected).toBeFalse();
        expect(options[2].selected).toBeFalse();

        scope.selected = "a";
        ;

        options = element.find("option");
        expect(options.length).toBe(3);
        expect(options[0].selected).toBeFalse();
        expect(options[1].selected).toBeTrue();
        expect(options[2].selected).toBeFalse();

        scope.selected = "no match";
        ;

        options = element.find("option");
        expect(options[0].selected).toBeTrue();
        expect(options[1].selected).toBeFalse();
        expect(options[2].selected).toBeFalse();
      });
    });

    describe("unknown option", () => {
      it("should insert&select temporary unknown option when no options-model match", () => {
        compile(
          '<select ng-model="robot">' +
            "<option>c3p0</option>" +
            "<option>r2d2</option>" +
            "</select>",
        );

        expect(element[0].value).toBe(unknownValue(undefined));

        scope.$apply(() => {
          scope.robot = "r2d2";
        });

        expect(element[0].value).toBe("r2d2");

        scope.$apply(() => {
          scope.robot = "wallee";
        });

        expect(element[0].value).toBe(unknownValue("wallee"));
      });

      it("should NOT insert temporary unknown option when model is undefined and empty options is present", () => {
        compile(
          '<select ng-model="robot">' +
            '<option value="">--select--</option>' +
            "<option>c3p0</option>" +
            "<option>r2d2</option>" +
            "</select>",
        );

        expect(element[0].value).toBe("");
        expect(scope.robot).toBeUndefined();

        scope.$apply(() => {
          scope.robot = null;
        });
        expect(element[0].value).toBe("");

        scope.$apply(() => {
          scope.robot = "r2d2";
        });
        expect(element[0].value).toBe("r2d2");

        scope.$apply(() => {
          delete scope.robot;
        });
        expect(element[0].value).toBe("");
      });

      it(
        "should insert&select temporary unknown option when no options-model match, empty " +
          "option is present and model is defined",
        () => {
          scope.robot = "wallee";
          compile(
            '<select ng-model="robot">' +
              '<option value="">--select--</option>' +
              "<option>c3p0</option>" +
              "<option>r2d2</option>" +
              "</select>",
          );

          expect(element[0].value).toBe(unknownValue("wallee"));

          scope.$apply(() => {
            scope.robot = "r2d2";
          });
          expect(element[0].value).toBe("r2d2");
        },
      );

      describe("interactions with repeated options", () => {
        it("should work with repeated options", () => {
          compile(
            '<select ng-model="robot">' +
              '<option ng-repeat="r in robots">{{r}}</option>' +
              "</select>",
          );
          expect(element[0].value).toBe(unknownValue(undefined));
          expect(scope.robot).toBeUndefined();

          scope.$apply(() => {
            scope.robot = "r2d2";
          });
          expect(element[0].value).toBe(unknownValue("r2d2"));
          expect(scope.robot).toBe("r2d2");

          scope.$apply(() => {
            scope.robots = ["c3p0", "r2d2"];
          });
          expect(element[0].value).toBe("r2d2");
          expect(scope.robot).toBe("r2d2");
        });

        it("should work with empty option and repeated options", () => {
          compile(
            '<select ng-model="robot">' +
              '<option value="">--select--</option>' +
              '<option ng-repeat="r in robots">{{r}}</option>' +
              "</select>",
          );
          expect(element[0].value).toBe("");
          expect(scope.robot).toBeUndefined();

          scope.$apply(() => {
            scope.robot = "r2d2";
          });

          expect(element[0].value).toBe(unknownValue("r2d2"));
          expect(scope.robot).toBe("r2d2");

          scope.$apply(() => {
            scope.robots = ["c3p0", "r2d2"];
          });
          expect(element[0].value).toBe("r2d2");
          expect(scope.robot).toBe("r2d2");
        });

        it("should insert unknown element when repeater shrinks and selected option is unavailable", () => {
          scope.robots = ["c3p0", "r2d2"];
          scope.robot = "r2d2";
          compile(
            '<select ng-model="robot">' +
              '<option ng-repeat="r in robots">{{r}}</option>' +
              "</select>",
          );
          expect(element[0].value).toBe("r2d2");
          expect(scope.robot).toBe("r2d2");

          scope.$apply(() => {
            scope.robots.pop();
          });
          expect(element[0].value).toBe(unknownValue(null));
          expect(scope.robot).toBe(null);

          scope.$apply(() => {
            scope.robots.unshift("r2d2");
          });
          expect(element[0].value).toBe(unknownValue(null));
          expect(scope.robot).toBe(null);

          scope.$apply(() => {
            scope.robot = "r2d2";
          });

          expect(element[0].value).toBe("r2d2");

          scope.$apply(() => {
            delete scope.robots;
          });

          expect(element[0].value).toBe(unknownValue(null));
          expect(scope.robot).toBe(null);
        });
      });
    });

    it(
      "should not break when adding options via a directive with `replace: true` " +
        "and a structural directive in its template",
      () => {
        scope.options = [
          { value: "1", label: "Option 1" },
          { value: "2", label: "Option 2" },
          { value: "3", label: "Option 3" },
        ];
        compile(
          '<select ng-model="mySelect"><option my-options="options"></option></select>',
        );

        expect(element[0].value).toBe(unknownValue());
      },
    );

    it("should not throw when removing the element and all its children", () => {
      const template =
        '<select ng-model="mySelect" ng-if="visible">' +
        '<option value="">--- Select ---</option>' +
        "</select>";
      scope.visible = true;

      compile(template);

      // It should not throw when removing the element
      scope.$apply("visible = false");
    });
  });

  describe("selectController", () => {
    it(
      "should expose .$hasEmptyOption(), .$isEmptyOptionSelected(), " +
        "and .$isUnknownOptionSelected()",
      () => {
        compile('<select ng-model="mySelect"></select>');

        const selectCtrl = element.controller("select");

        expect(selectCtrl.$hasEmptyOption).toEqual(jasmine.any(Function));
        expect(selectCtrl.$isEmptyOptionSelected).toEqual(
          jasmine.any(Function),
        );
        expect(selectCtrl.$isUnknownOptionSelected).toEqual(
          jasmine.any(Function),
        );
      },
    );

    it("should reflect the status of empty and unknown option", () => {
      scope.dynamicOptions = [];
      scope.selected = "";
      compile(
        '<select ng-model="selected">' +
          '<option ng-if="empty" value="">--no selection--</option>' +
          '<option ng-repeat="opt in dynamicOptions" value="{{opt.val}}">{{opt.display}}</option>' +
          "</select>",
      );

      const selectCtrl = element.controller("select");

      expect(element[0].value).toBe("? string: ?");
      expect(selectCtrl.$hasEmptyOption()).toBe(false);
      expect(selectCtrl.$isEmptyOptionSelected()).toBe(false);

      scope.dynamicOptions = [
        { val: "x", display: "robot x" },
        { val: "y", display: "robot y" },
      ];
      scope.empty = true;

      ;
      expect(element[0].value).toBe("");
      expect(selectCtrl.$hasEmptyOption()).toBe(true);
      expect(selectCtrl.$isEmptyOptionSelected()).toBe(true);
      expect(selectCtrl.$isUnknownOptionSelected()).toBe(false);

      // empty -> selection
      scope.$apply('selected = "x"');
      expect(element[0].value).toBe("x");
      expect(selectCtrl.$hasEmptyOption()).toBe(true);
      expect(selectCtrl.$isEmptyOptionSelected()).toBe(false);
      expect(selectCtrl.$isUnknownOptionSelected()).toBe(false);

      // remove empty
      scope.$apply("empty = false");
      expect(element[0].value).toBe("x");
      expect(selectCtrl.$hasEmptyOption()).toBe(false);
      expect(selectCtrl.$isEmptyOptionSelected()).toBe(false);
      expect(selectCtrl.$isUnknownOptionSelected()).toBe(false);

      // selection -> unknown
      scope.$apply('selected = "unmatched"');
      expect(element[0].value).toBe(unknownValue("unmatched"));
      expect(selectCtrl.$hasEmptyOption()).toBe(false);
      expect(selectCtrl.$isEmptyOptionSelected()).toBe(false);
      expect(selectCtrl.$isUnknownOptionSelected()).toBe(true);

      // add empty
      scope.$apply("empty = true");
      expect(element[0].value).toBe(unknownValue("unmatched"));
      expect(selectCtrl.$hasEmptyOption()).toBe(true);
      expect(selectCtrl.$isEmptyOptionSelected()).toBe(false);
      expect(selectCtrl.$isUnknownOptionSelected()).toBe(true);

      // unknown -> empty
      scope.$apply("selected = null");

      expect(element[0].value).toBe("");
      expect(selectCtrl.$hasEmptyOption()).toBe(true);
      expect(selectCtrl.$isEmptyOptionSelected()).toBe(true);
      expect(selectCtrl.$isUnknownOptionSelected()).toBe(false);

      // empty -> unknown
      scope.$apply('selected = "unmatched"');

      expect(element[0].value).toBe(unknownValue("unmatched"));
      expect(selectCtrl.$hasEmptyOption()).toBe(true);
      expect(selectCtrl.$isEmptyOptionSelected()).toBe(false);
      expect(selectCtrl.$isUnknownOptionSelected()).toBe(true);

      // unknown -> selection
      scope.$apply('selected = "y"');

      expect(element[0].value).toBe("y");
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

  describe("selectController.hasOption", () => {
    describe("flat options", () => {
      it("should return false for options shifted via ngRepeat", () => {
        scope.robots = [
          { value: 1, label: "c3p0" },
          { value: 2, label: "r2d2" },
        ];

        compileRepeatedOptions();

        const selectCtrl = element.controller("select");

        scope.$apply(() => {
          scope.robots.shift();
        });

        expect(selectCtrl.hasOption("1")).toBe(false);
        expect(selectCtrl.hasOption("2")).toBe(true);
      });

      it("should return false for options popped via ngRepeat", () => {
        scope.robots = [
          { value: 1, label: "c3p0" },
          { value: 2, label: "r2d2" },
        ];

        compileRepeatedOptions();

        const selectCtrl = element.controller("select");

        scope.$apply(() => {
          scope.robots.pop();
        });

        expect(selectCtrl.hasOption("1")).toBe(true);
        expect(selectCtrl.hasOption("2")).toBe(false);
      });

      it("should return true for options added via ngRepeat", () => {
        scope.robots = [{ value: 2, label: "r2d2" }];

        compileRepeatedOptions();

        const selectCtrl = element.controller("select");

        scope.$apply(() => {
          scope.robots.unshift({ value: 1, label: "c3p0" });
        });

        expect(selectCtrl.hasOption("1")).toBe(true);
        expect(selectCtrl.hasOption("2")).toBe(true);
      });

      it("should keep all the options when changing the model", () => {
        compile(
          "<select ng-model=\"mySelect\"><option ng-repeat=\"o in ['A','B','C']\">{{o}}</option></select>",
        );

        const selectCtrl = element.controller("select");

        scope.$apply(() => {
          scope.mySelect = "C";
        });

        expect(selectCtrl.hasOption("A")).toBe(true);
        expect(selectCtrl.hasOption("B")).toBe(true);
        expect(selectCtrl.hasOption("C")).toBe(true);
        expect(element).toEqualSelectWithOptions({ "": ["A", "B", ["C"]] });
      });
    });

    describe("grouped options", () => {
      it("should be able to detect when elements move from a previous group", () => {
        scope.values = [{ name: "A" }];
        scope.groups = [
          {
            name: "first",
            values: [{ name: "B" }, { name: "C" }, { name: "D" }],
          },
          {
            name: "second",
            values: [{ name: "E" }],
          },
        ];

        compileGroupedOptions();

        const selectCtrl = element.controller("select");

        scope.$apply(() => {
          const itemD = scope.groups[0].values.pop();
          scope.groups[1].values.unshift(itemD);
          scope.values.shift();
        });

        expect(selectCtrl.hasOption("A")).toBe(false);
        expect(selectCtrl.hasOption("B")).toBe(true);
        expect(selectCtrl.hasOption("C")).toBe(true);
        expect(selectCtrl.hasOption("D")).toBe(true);
        expect(selectCtrl.hasOption("E")).toBe(true);
        expect(element).toEqualSelectWithOptions({
          "": [[""]],
          first: ["B", "C"],
          second: ["D", "E"],
        });
      });

      it("should be able to detect when elements move from a following group", () => {
        scope.values = [{ name: "A" }];
        scope.groups = [
          {
            name: "first",
            values: [{ name: "B" }, { name: "C" }],
          },
          {
            name: "second",
            values: [{ name: "D" }, { name: "E" }],
          },
        ];

        compileGroupedOptions();

        const selectCtrl = element.controller("select");

        scope.$apply(() => {
          const itemD = scope.groups[1].values.shift();
          scope.groups[0].values.push(itemD);
          scope.values.shift();
        });
        expect(selectCtrl.hasOption("A")).toBe(false);
        expect(selectCtrl.hasOption("B")).toBe(true);
        expect(selectCtrl.hasOption("C")).toBe(true);
        expect(selectCtrl.hasOption("D")).toBe(true);
        expect(selectCtrl.hasOption("E")).toBe(true);
        expect(element).toEqualSelectWithOptions({
          "": [[""]],
          first: ["B", "C", "D"],
          second: ["E"],
        });
      });

      it("should be able to detect when an element is replaced with an element from a previous group", () => {
        scope.values = [{ name: "A" }];
        scope.groups = [
          {
            name: "first",
            values: [{ name: "B" }, { name: "C" }, { name: "D" }],
          },
          {
            name: "second",
            values: [{ name: "E" }, { name: "F" }],
          },
        ];

        compileGroupedOptions();

        const selectCtrl = element.controller("select");

        scope.$apply(() => {
          const itemD = scope.groups[0].values.pop();
          scope.groups[1].values.unshift(itemD);
          scope.groups[1].values.pop();
        });
        expect(selectCtrl.hasOption("A")).toBe(true);
        expect(selectCtrl.hasOption("B")).toBe(true);
        expect(selectCtrl.hasOption("C")).toBe(true);
        expect(selectCtrl.hasOption("D")).toBe(true);
        expect(selectCtrl.hasOption("E")).toBe(true);
        expect(selectCtrl.hasOption("F")).toBe(false);
        expect(element).toEqualSelectWithOptions({
          "": [[""], "A"],
          first: ["B", "C"],
          second: ["D", "E"],
        });
      });

      it("should be able to detect when element is replaced with an element from a following group", () => {
        scope.values = [{ name: "A" }];
        scope.groups = [
          {
            name: "first",
            values: [{ name: "B" }, { name: "C" }],
          },
          {
            name: "second",
            values: [{ name: "D" }, { name: "E" }],
          },
        ];

        compileGroupedOptions();

        const selectCtrl = element.controller("select");

        scope.$apply(() => {
          scope.groups[0].values.pop();
          const itemD = scope.groups[1].values.shift();
          scope.groups[0].values.push(itemD);
        });
        expect(selectCtrl.hasOption("A")).toBe(true);
        expect(selectCtrl.hasOption("B")).toBe(true);
        expect(selectCtrl.hasOption("C")).toBe(false);
        expect(selectCtrl.hasOption("D")).toBe(true);
        expect(selectCtrl.hasOption("E")).toBe(true);
        expect(element).toEqualSelectWithOptions({
          "": [[""], "A"],
          first: ["B", "D"],
          second: ["E"],
        });
      });

      it("should be able to detect when an element is removed", () => {
        scope.values = [{ name: "A" }];
        scope.groups = [
          {
            name: "first",
            values: [{ name: "B" }, { name: "C" }],
          },
          {
            name: "second",
            values: [{ name: "D" }, { name: "E" }],
          },
        ];

        compileGroupedOptions();

        const selectCtrl = element.controller("select");

        scope.$apply(() => {
          scope.groups[1].values.shift();
        });
        expect(selectCtrl.hasOption("A")).toBe(true);
        expect(selectCtrl.hasOption("B")).toBe(true);
        expect(selectCtrl.hasOption("C")).toBe(true);
        expect(selectCtrl.hasOption("D")).toBe(false);
        expect(selectCtrl.hasOption("E")).toBe(true);
        expect(element).toEqualSelectWithOptions({
          "": [[""], "A"],
          first: ["B", "C"],
          second: ["E"],
        });
      });

      it("should be able to detect when a group is removed", () => {
        scope.values = [{ name: "A" }];
        scope.groups = [
          {
            name: "first",
            values: [{ name: "B" }, { name: "C" }],
          },
          {
            name: "second",
            values: [{ name: "D" }, { name: "E" }],
          },
        ];

        compileGroupedOptions();

        const selectCtrl = element.controller("select");

        scope.$apply(() => {
          scope.groups.pop();
        });
        expect(selectCtrl.hasOption("A")).toBe(true);
        expect(selectCtrl.hasOption("B")).toBe(true);
        expect(selectCtrl.hasOption("C")).toBe(true);
        expect(selectCtrl.hasOption("D")).toBe(false);
        expect(selectCtrl.hasOption("E")).toBe(false);
        expect(element).toEqualSelectWithOptions({
          "": [[""], "A"],
          first: ["B", "C"],
        });
      });
    });
  });

  describe("select-multiple", () => {
    it('should support type="select-multiple"', () => {
      compile(
        '<select ng-model="selection" multiple>' +
          "<option>A</option>" +
          "<option>B</option>" +
          "</select>",
      );

      scope.$apply(() => {
        scope.selection = ["A"];
      });

      let optionElements = element.find("option");

      expect(element[0].value).toBe("A");
      expect(optionElements[0].selected).toBeTrue();
      expect(optionElements[1].selected).toBeFalse();

      scope.$apply(() => {
        scope.selection.push("B");
      });

      optionElements = element.find("option");

      expect(element[0].value).toBe("A");
      expect(optionElements[0].selected).toBeTrue();
      expect(optionElements[1].selected).toBeTrue();
    });

    it("should work with optgroups", () => {
      compile(
        '<select ng-model="selection" multiple>' +
          '<optgroup label="group1">' +
          "<option>A</option>" +
          "<option>B</option>" +
          "</optgroup>" +
          "</select>",
      );

      expect(element[0].value).toBe("");
      expect(scope.selection).toBeUndefined();

      scope.$apply(() => {
        scope.selection = ["A"];
      });
      expect(element[0].value).toBe("A");

      scope.$apply(() => {
        scope.selection.push("B");
      });
      expect(element[0].value).toBe("A");
    });

    it("should require", () => {
      compile(
        '<select name="select" ng-model="selection" multiple required>' +
          "<option>A</option>" +
          "<option>B</option>" +
          "</select>",
      );

      scope.$apply(() => {
        scope.selection = [];
      });

      expect(scope.form.select.$error.required).toBeTruthy();
      expect(element[0].classList.contains("ng-invalid")).toBeTrue();
      expect(element[0].classList.contains("ng-pristine")).toBeTrue();

      scope.$apply(() => {
        scope.selection = ["A"];
      });

      expect(element[0].classList.contains("ng-valid")).toBeTrue();
      expect(element[0].classList.contains("ng-pristine")).toBeTrue();

      element[0].value = "B";
      browserTrigger(element, "change");
      expect(element[0].classList.contains("ng-valid")).toBeTrue();
      expect(element[0].classList.contains("ng-dirty")).toBeTrue();
    });

    describe("calls to $render", () => {
      let ngModelCtrl;

      beforeEach(() => {
        compile(
          '<select name="select" ng-model="selection" multiple>' +
            "<option>A</option>" +
            "<option>B</option>" +
            "</select>",
        );

        ngModelCtrl = element.controller("ngModel");
        spyOn(ngModelCtrl, "$render").and.callThrough();
      });

      it("should call $render once when the reference to the viewValue changes", () => {
        scope.$apply(() => {
          scope.selection = ["A"];
        });
        expect(ngModelCtrl.$render).toHaveBeenCalledTimes(1);

        scope.$apply(() => {
          scope.selection = ["A", "B"];
        });
        expect(ngModelCtrl.$render).toHaveBeenCalledTimes(2);

        scope.$apply(() => {
          scope.selection = [];
        });
        expect(ngModelCtrl.$render).toHaveBeenCalledTimes(3);
      });

      it("should call $render once when the viewValue deep-changes", () => {
        scope.$apply(() => {
          scope.selection = ["A"];
        });
        expect(ngModelCtrl.$render).toHaveBeenCalledTimes(1);

        scope.$apply(() => {
          scope.selection.push("B");
        });
        expect(ngModelCtrl.$render).toHaveBeenCalledTimes(2);

        scope.$apply(() => {
          scope.selection.length = 0;
        });
        expect(ngModelCtrl.$render).toHaveBeenCalledTimes(3);
      });
    });
  });

  describe("option", () => {
    it("should populate a missing value attribute with the option text", () => {
      compile('<select ng-model="x"><option selected>abc</option></select>');
      expect(element[0].value).toBe(unknownValue(undefined));
    });

    it("should ignore the option text if the value attribute exists", () => {
      compile('<select ng-model="x"><option value="abc">xyz</option></select>');
      expect(element[0].value).toBe(unknownValue(undefined));
    });

    it("should set value even if self closing HTML", () => {
      scope.x = "hello";
      compile('<select ng-model="x"><option>hello</select>');
      expect(element[0].value).toBe("hello");
    });

    it("should add options with interpolated value attributes", () => {
      scope.option1 = "option1";
      scope.option2 = "option2";

      compile(
        '<select ng-model="selected">' +
          '<option value="{{option1}}">Option 1</option>' +
          '<option value="{{option2}}">Option 2</option>' +
          "</select>",
      );

      ;
      expect(scope.selected).toBeUndefined();

      setSelectValue(element, 0);
      expect(scope.selected).toBe("option1");

      scope.selected = "option2";
      ;
      expect(element.find("option").eq(1)[0].selected).toBe(true);
      expect(element.find("option").eq(1).text()).toBe("Option 2");
    });

    it("should update the option when the interpolated value attribute changes", () => {
      scope.option1 = "option1";
      scope.option2 = "";

      compile(
        '<select ng-model="selected">' +
          '<option value="{{option1}}">Option 1</option>' +
          '<option value="{{option2}}">Option 2</option>' +
          "</select>",
      );

      const selectCtrl = element.controller("select");
      spyOn(selectCtrl, "removeOption").and.callThrough();

      ;
      expect(scope.selected).toBeUndefined();
      expect(selectCtrl.removeOption).not.toHaveBeenCalled();

      // Change value of option2
      scope.option2 = "option2Changed";
      scope.selected = "option2Changed";
      ;

      expect(selectCtrl.removeOption).toHaveBeenCalledWith("");
      expect(element.find("option").eq(1)[0].selected).toBe(true);
      expect(element.find("option").eq(1).text()).toBe("Option 2");
    });

    it("should add options with interpolated text", () => {
      scope.option1 = "Option 1";
      scope.option2 = "Option 2";

      compile(
        '<select ng-model="selected">' +
          "<option>{{option1}}</option>" +
          "<option>{{option2}}</option>" +
          "</select>",
      );

      ;
      expect(scope.selected).toBeUndefined();

      setSelectValue(element, 0);
      expect(scope.selected).toBe("Option 1");

      scope.selected = "Option 2";
      ;
      expect(element.find("option").eq(1)[0].selected).toBe(true);
      expect(element.find("option").eq(1).text()).toBe("Option 2");
    });

    it("should update options when their interpolated text changes", () => {
      scope.option1 = "Option 1";
      scope.option2 = "";

      compile(
        '<select ng-model="selected">' +
          "<option>{{option1}}</option>" +
          "<option>{{option2}}</option>" +
          "</select>",
      );

      const selectCtrl = element.controller("select");
      spyOn(selectCtrl, "removeOption").and.callThrough();

      ;
      expect(scope.selected).toBeUndefined();
      expect(selectCtrl.removeOption).not.toHaveBeenCalled();

      // Change value of option2
      scope.option2 = "Option 2 Changed";
      scope.selected = "Option 2 Changed";
      ;

      expect(selectCtrl.removeOption).toHaveBeenCalledWith("");
      expect(element.find("option").eq(1)[0].selected).toBe(true);
      expect(element.find("option").eq(1).text()).toBe("Option 2 Changed");
    });

    it("should not blow up when option directive is found inside of a datalist", () => {
      const element = $compile(
        "<div>" +
          "<datalist><option>some val</option></datalist>" +
          "<span>{{foo}}</span>" +
          "</div>",
      )($rootScope);

      $rootScope.foo = "success";
      ;
      expect(element.find("span").text()).toBe("success");
      dealoc(element);
    });

    it('should throw an exception if an option value interpolates to "hasOwnProperty"', () => {
      scope.hasOwnPropertyOption = "hasOwnProperty";
      expect(() => {
        compile(
          '<select ng-model="x">' +
            "<option>{{hasOwnPropertyOption}}</option>" +
            "</select>",
        );
      }).toThrowError(/badname/);
    });

    describe("with ngValue (and non-primitive values)", () => {
      [
        "string",
        undefined,
        1,
        true,
        null,
        { prop: "value" },
        ["a"],
        NaN,
      ].forEach((prop) => {
        it("should set the option attribute and select it for value $prop", () => {
          scope.option1 = prop;
          scope.option2 = "red";
          scope.selected = "NOMATCH";

          compile(
            '<select ng-model="selected">' +
              '<option ng-value="option1">{{option1}}</option>' +
              '<option ng-value="option2">{{option2}}</option>' +
              "</select>",
          );

          ;
          expect(element.find("option").eq(0).val()).toBe("? string:NOMATCH ?");

          scope.selected = prop;
          ;

          expect(element.find("option").eq(0).val()).toBe(hashKey(prop));

          // Reset
          scope.selected = false;
          ;

          expect(element.find("option").eq(0).val()).toBe("? boolean:false ?");

          setSelectValue(element, 0);
          if (isNumberNaN(prop)) {
            expect(scope.selected).toBeNaN();
          } else {
            expect(scope.selected).toBe(prop);
          }
        });
      });

      [
        "string",
        undefined,
        1,
        true,
        null,
        { prop: "value" },
        ["a"],
        NaN,
      ].forEach((prop) => {
        it("should update the option attribute and select it for value $prop", () => {
          scope.option = prop;
          scope.option2 = "red";
          scope.selected = "NOMATCH";

          compile(
            '<select ng-model="selected">' +
              '<option ng-value="option">{{option}}</option>' +
              '<option ng-value="option2">{{option2}}</option>' +
              "</select>",
          );

          const selectController = element.controller("select");
          spyOn(selectController, "removeOption").and.callThrough();

          ;
          expect(selectController.removeOption).not.toHaveBeenCalled();
          expect(element.find("option").eq(0).val()).toBe("? string:NOMATCH ?");

          scope.selected = prop;
          ;

          expect(element.find("option").eq(0).val()).toBe(hashKey(prop));
          expect(element[0].selectedIndex).toBe(0);

          scope.option = "UPDATEDVALUE";
          ;

          expect(selectController.removeOption.calls.count()).toBe(1);

          // Updating the option value currently does not update the select model
          if (isNumberNaN(prop)) {
            expect(selectController.removeOption.calls.argsFor(0)[0]).toBeNaN();
          } else {
            expect(selectController.removeOption.calls.argsFor(0)[0]).toBe(
              prop,
            );
          }

          expect(scope.selected).toBe(null);
          expect(element[0].selectedIndex).toBe(0);
          expect(element.find("option").length).toBe(3);
          expect(element.find("option").eq(0)[0].selected).toBe(true);
          expect(element.find("option").eq(0).val()).toBe(unknownValue(prop));
          expect(element.find("option").eq(1)[0].selected).toBe(false);
          expect(element.find("option").eq(1).val()).toBe(
            "string:UPDATEDVALUE",
          );

          scope.selected = "UPDATEDVALUE";
          ;

          expect(element[0].selectedIndex).toBe(0);
          expect(element.find("option").eq(0).val()).toBe(
            "string:UPDATEDVALUE",
          );
        });
      });
      it("should interact with custom attribute $observe and $set calls", () => {
        const log = [];
        let optionAttr;

        compile(
          '<select ng-model="selected">' +
            '<option expose-attributes ng-value="option">{{option}}</option>' +
            "</select>",
        );

        optionAttr = optionAttributesList[0];
        optionAttr.$observe("value", (newVal) => {
          log.push(newVal);
        });

        scope.option = "init";
        ;

        expect(log[0]).toBe("init");
        expect(element.find("option").eq(1).val()).toBe("string:init");

        optionAttr.$set("value", "update");
        expect(log[1]).toBe("update");
        expect(element.find("option").eq(1).val()).toBe("string:update");
      });

      it("should ignore the option text / value attribute if the ngValue attribute exists", () => {
        scope.ngvalue = "abc";
        scope.value = "def";
        scope.textvalue = "ghi";

        compile(
          '<select ng-model="x"><option ng-value="ngvalue" value="{{value}}">{{textvalue}}</option></select>',
        );
        expect(element[0].value).toBe(unknownValue(undefined));
      });

      it("should ignore option text with multiple interpolations if the ngValue attribute exists", () => {
        scope.ngvalue = "abc";
        scope.textvalue = "def";
        scope.textvalue2 = "ghi";

        compile(
          '<select ng-model="x"><option ng-value="ngvalue">{{textvalue}} {{textvalue2}}</option></select>',
        );
        expect(element[0].value).toBe(unknownValue(undefined));
      });

      it("should select the first option if it is `undefined`", () => {
        scope.selected = undefined;

        scope.option1 = undefined;
        scope.option2 = "red";

        compile(
          '<select ng-model="selected">' +
            '<option ng-value="option1">{{option1}}</option>' +
            '<option ng-value="option2">{{option2}}</option>' +
            "</select>",
        );

        expect(element[0].value).toBe("undefined:undefined");
      });

      describe("and select[multiple]", () => {
        it("should allow multiple selection", () => {
          scope.options = {
            a: "string",
            b: undefined,
            c: 1,
            d: true,
            e: null,
            f: NaN,
          };
          scope.selected = [];

          compile(
            '<select multiple ng-model="selected">' +
              '<option ng-value="options.a">{{options.a}}</option>' +
              '<option ng-value="options.b">{{options.b}}</option>' +
              '<option ng-value="options.c">{{options.c}}</option>' +
              '<option ng-value="options.d">{{options.d}}</option>' +
              '<option ng-value="options.e">{{options.e}}</option>' +
              '<option ng-value="options.f">{{options.f}}</option>' +
              "</select>",
          );

          ;

          expect(
            Object.values(element[0].childNodes)
              .map((x) => x.value)
              .join(""),
          ).toBe(
            [
              "string:string",
              "undefined:undefined",
              "number:1",
              "boolean:true",
              "object:null",
              "number:NaN",
            ].join(""),
          );

          scope.selected = ["string", 1];
          ;

          expect(element.find("option").eq(0)[0].selected).toBe(true);
          expect(element.find("option").eq(2)[0].selected).toBe(true);

          setSelectValue(element, 1);
          expect(scope.selected).toEqual([undefined]);

          // reset
          scope.selected = [];
          ;

          forEach(element.find("option"), (option) => {
            // browserTrigger can't produce click + ctrl, so set selection manually
            JQLite(option)[0].selected = true;
          });

          browserTrigger(element, "change");

          const arrayVal = ["a"];
          arrayVal.$$hashKey = "object:4";

          expect(scope.selected).toEqual([
            "string",
            undefined,
            1,
            true,
            null,
            NaN,
          ]);
        });
      });
    });

    describe("updating the model and selection when option elements are manipulated", () => {
      ["ngValue", "interpolatedValue", "interpolatedText"].forEach((prop) => {
        it("should set the model to null when the currently selected option with $prop is removed", () => {
          const A = { name: "A" };
          const B = { name: "B" };
          const C = { name: "C" };

          scope.options = [A, B, C];
          scope.obj = {};

          let optionString = "";

          switch (prop) {
            case "ngValue":
              optionString =
                '<option ng-repeat="option in options" ng-value="option">{{$index}}</option>';
              break;
            case "interpolatedValue":
              optionString =
                '<option ng-repeat="option in options" value="{{option.name}}">{{$index}}</option>';
              break;
            case "interpolatedText":
              optionString =
                '<option ng-repeat="option in options">{{option.name}}</option>';
              break;
          }

          compile(`<select ng-model="obj.value">${optionString}</select>`);

          let optionElements = element.find("option");
          expect(optionElements.length).toEqual(4);
          setSelectValue(optionElements, 0);

          optionElements = element.find("option");
          expect(optionElements.length).toEqual(3);
          expect(scope.obj.value).toBe(prop === "ngValue" ? A : "A");

          scope.options.shift();
          ;

          optionElements = element.find("option");
          expect(optionElements.length).toEqual(3);
          expect(scope.obj.value).toBe(null);
          expect(element.val()).toBe("? object:null ?");
        });

        it("should set the model to null when the currently selected option with $prop changes its value", () => {
          const A = { name: "A" };
          const B = { name: "B" };
          const C = { name: "C" };

          scope.options = [A, B, C];
          scope.obj = {};

          let optionString = "";

          switch (prop) {
            case "ngValue":
              optionString =
                '<option ng-repeat="option in options" ng-value="option.name">{{$index}}</option>';
              break;
            case "interpolatedValue":
              optionString =
                '<option ng-repeat="option in options" value="{{option.name}}">{{$index}}</option>';
              break;
            case "interpolatedText":
              optionString =
                '<option ng-repeat="option in options">{{option.name}}</option>';
              break;
          }

          compile(`<select ng-model="obj.value">${optionString}</select>`);

          let optionElements = element.find("option");
          expect(optionElements.length).toEqual(4);
          setSelectValue(optionElements, 0);

          optionElements = element.find("option");
          expect(optionElements.length).toEqual(3);
          expect(scope.obj.value).toBe("A");

          A.name = "X";
          ;

          optionElements = element.find("option");
          expect(optionElements.length).toEqual(4);
          expect(scope.obj.value).toBe(null);
          expect(element.val()).toBe("? string:A ?");
        });

        it("should set the model to null when the currently selected option with $prop is disabled", () => {
          const A = { name: "A" };
          const B = { name: "B" };
          const C = { name: "C" };

          scope.options = [A, B, C];
          scope.obj = {};

          let optionString = "";

          switch (prop) {
            case "ngValue":
              optionString =
                '<option ng-repeat="option in options" ng-disabled="option.disabled" ng-value="option.name">{{$index}}</option>';
              break;
            case "interpolatedValue":
              optionString =
                '<option ng-repeat="option in options" ng-disabled="option.disabled" value="{{option.name}}">{{$index}}</option>';
              break;
            case "interpolatedText":
              optionString =
                '<option ng-repeat="option in options" ng-disabled="option.disabled">{{option.name}}</option>';
              break;
          }

          compile(`<select ng-model="obj.value">${optionString}</select>`);

          let optionElements = element.find("option");
          expect(optionElements.length).toEqual(4);
          setSelectValue(optionElements, 0);

          optionElements = element.find("option");
          expect(optionElements.length).toEqual(3);
          expect(scope.obj.value).toBe("A");

          A.disabled = true;
          ;

          optionElements = element.find("option");
          expect(optionElements.length).toEqual(4);
          expect(scope.obj.value).toBe(null);
          expect(element.val()).toBe("? object:null ?");
        });

        it("should select a disabled option with $prop when the model is set to the matching value", () => {
          const A = { name: "A" };
          const B = { name: "B" };
          const C = { name: "C" };

          scope.options = [A, B, C];
          scope.obj = {};

          let optionString = "";

          switch (prop) {
            case "ngValue":
              optionString =
                '<option ng-repeat="option in options" ng-disabled="option.disabled" ng-value="option.name">{{$index}}</option>';
              break;
            case "interpolatedValue":
              optionString =
                '<option ng-repeat="option in options" ng-disabled="option.disabled" value="{{option.name}}">{{$index}}</option>';
              break;
            case "interpolatedText":
              optionString =
                '<option ng-repeat="option in options" ng-disabled="option.disabled">{{option.name}}</option>';
              break;
          }

          compile(`<select ng-model="obj.value">${optionString}</select>`);

          let optionElements = element.find("option");
          expect(optionElements.length).toEqual(4);
          expect(optionElements[0].value).toEqual(unknownValue(undefined));

          B.disabled = true;
          ;

          optionElements = element.find("option");
          expect(optionElements.length).toEqual(4);
          expect(optionElements[0].value).toEqual(unknownValue(undefined));

          scope.obj.value = "B";
          ;

          optionElements = element.find("option");
          expect(optionElements.length).toEqual(3);
          expect(scope.obj.value).toBe("B");
          // jQuery returns null for val() when the option is disabled, see
          // https://bugs.jquery.com/ticket/13097
          expect(element[0].value).toBe(prop === "ngValue" ? "string:B" : "B");
          expect(optionElements.eq(1)[0].selected).toBe(true);
        });

        it("should ignore an option with $prop that becomes enabled and does not match the model", () => {
          const A = { name: "A" };
          const B = { name: "B" };
          const C = { name: "C" };

          scope.options = [A, B, C];
          scope.obj = {};

          let optionString = "";

          switch (prop) {
            case "ngValue":
              optionString =
                '<option ng-repeat="option in options" ng-disabled="option.disabled" ng-value="option.name">{{$index}}</option>';
              break;
            case "interpolatedValue":
              optionString =
                '<option ng-repeat="option in options" ng-disabled="option.disabled" value="{{option.name}}">{{$index}}</option>';
              break;
            case "interpolatedText":
              optionString =
                '<option ng-repeat="option in options" ng-disabled="option.disabled">{{option.name}}</option>';
              break;
          }

          compile(`<select ng-model="obj.value">${optionString}</select>`);

          let optionElements = element.find("option");
          expect(optionElements.length).toEqual(4);
          setSelectValue(optionElements, 0);

          optionElements = element.find("option");
          expect(optionElements.length).toEqual(3);
          expect(scope.obj.value).toBe("A");

          A.disabled = true;
          ;

          optionElements = element.find("option");
          expect(optionElements.length).toEqual(4);
          expect(scope.obj.value).toBe(null);
          expect(element.val()).toBe("? object:null ?");

          A.disabled = false;
          ;

          optionElements = element.find("option");
          expect(optionElements.length).toEqual(4);
          expect(scope.obj.value).toBe(null);
          expect(element.val()).toBe("? object:null ?");
        });

        it("should select a newly added option with $prop when it matches the current model", () => {
          const A = { name: "A" };
          const B = { name: "B" };
          const C = { name: "C" };

          scope.options = [A, B];
          scope.obj = {
            value: prop === "ngValue" ? C : "C",
          };

          let optionString = "";

          switch (prop) {
            case "ngValue":
              optionString =
                '<option ng-repeat="option in options" ng-value="option">{{$index}}</option>';
              break;
            case "interpolatedValue":
              optionString =
                '<option ng-repeat="option in options" value="{{option.name}}">{{$index}}</option>';
              break;
            case "interpolatedText":
              optionString =
                '<option ng-repeat="option in options">{{option.name}}</option>';
              break;
          }

          compile(`<select ng-model="obj.value">${optionString}</select>`);

          let optionElements = element.find("option");
          expect(optionElements.length).toEqual(3);

          scope.options.push(C);
          ;

          optionElements = element.find("option");
          expect(optionElements.length).toEqual(3);
          expect(optionElements[2].selected).toBe(true);
        });

        it("should keep selection and model when repeated options with track by are replaced with equal options", () => {
          const A = { name: "A" };
          const B = { name: "B" };
          const C = { name: "C" };

          scope.options = [A, B, C];
          scope.obj = {
            value: "C",
          };

          let optionString = "";

          switch (prop) {
            case "ngValue":
              optionString =
                '<option ng-repeat="option in options track by option.name" ng-value="option.name">{{$index}}</option>';
              break;
            case "interpolatedValue":
              optionString =
                '<option ng-repeat="option in options track by option.name" value="{{option.name}}">{{$index}}</option>';
              break;
            case "interpolatedText":
              optionString =
                '<option ng-repeat="option in options track by option.name">{{option.name}}</option>';
              break;
          }

          compile(`<select ng-model="obj.value">${optionString}</select>`);

          let optionElements = element.find("option");
          expect(optionElements.length).toEqual(3);

          scope.obj.value = "C";
          ;

          optionElements = element.find("option");
          expect(element.val()).toBe(prop === "ngValue" ? "string:C" : "C");
          expect(optionElements.length).toEqual(3);
          expect(optionElements[2].selected).toBe(true);
          expect(scope.obj.value).toBe("C");

          scope.options = [{ name: "A" }, { name: "B" }, { name: "C" }];
          ;

          optionElements = element.find("option");
          expect(element.val()).toBe(prop === "ngValue" ? "string:C" : "C");
          expect(optionElements.length).toEqual(3);
          expect(optionElements[2].selected).toBe(true);
          expect(scope.obj.value).toBe("C");
        });
      });

      describe("when multiple", () => {
        ["ngValue", "interpolatedValue", "interpolatedText"].forEach((prop) => {
          it("should set the model to null when the currently selected option with $prop is removed", () => {
            const A = { name: "A" };
            const B = { name: "B" };
            const C = { name: "C" };

            scope.options = [A, B, C];
            scope.obj = {};

            let optionString = "";

            switch (prop) {
              case "ngValue":
                optionString =
                  '<option ng-repeat="option in options" ng-value="option">{{$index}}</option>';
                break;
              case "interpolatedValue":
                optionString =
                  '<option ng-repeat="option in options" value="{{option.name}}">{{$index}}</option>';
                break;
              case "interpolatedText":
                optionString =
                  '<option ng-repeat="option in options">{{option.name}}</option>';
                break;
            }

            compile(
              `<select ng-model="obj.value" multiple>${optionString}</select>`,
            );

            const ngModelCtrl = element.controller("ngModel");
            const ngModelCtrlSpy = spyOn(
              ngModelCtrl,
              "$setViewValue",
            ).and.callThrough();

            let optionElements = element.find("option");
            expect(optionElements.length).toEqual(3);

            optionElements.eq(0)[0].selected = true;
            optionElements.eq(2)[0].selected = true;
            browserTrigger(element);

            optionElements = element.find("option");
            expect(optionElements.length).toEqual(3);

            ngModelCtrlSpy.calls.reset();
            scope.options.shift();
            scope.options.pop();
            ;

            optionElements = element.find("option");
            expect(optionElements.length).toEqual(1);
            expect(scope.obj.value).toEqual([]);

            // Cover both jQuery 3.x ([]) and 2.x (null) behavior.
            let val = element.val();
            if (val === null) {
              val = [];
            }
            expect(val).toEqual([]);

            expect(ngModelCtrlSpy).toHaveBeenCalledTimes(1);
          });

          it("should set the model to null when the currently selected option with $prop changes its value", () => {
            const A = { name: "A" };
            const B = { name: "B" };
            const C = { name: "C" };

            scope.options = [A, B, C];
            scope.obj = {};

            let optionString = "";

            switch (prop) {
              case "ngValue":
                optionString =
                  '<option ng-repeat="option in options" ng-value="option.name">{{$index}}</option>';
                break;
              case "interpolatedValue":
                optionString =
                  '<option ng-repeat="option in options" value="{{option.name}}">{{$index}}</option>';
                break;
              case "interpolatedText":
                optionString =
                  '<option ng-repeat="option in options">{{option.name}}</option>';
                break;
            }

            compile(
              `<select ng-model="obj.value" multiple>${optionString}</select>`,
            );

            const ngModelCtrl = element.controller("ngModel");
            const ngModelCtrlSpy = spyOn(
              ngModelCtrl,
              "$setViewValue",
            ).and.callThrough();

            let optionElements = element.find("option");
            expect(optionElements.length).toEqual(3);

            optionElements.eq(0)[0].selected = true;
            optionElements.eq(2)[0].selected = true;
            browserTrigger(element, "change");

            optionElements = element.find("option");
            expect(optionElements.length).toEqual(3);
            expect(scope.obj.value).toEqual(["A", "C"]);

            ngModelCtrlSpy.calls.reset();
            A.name = "X";
            C.name = "Z";
            ;

            optionElements = element.find("option");
            expect(optionElements.length).toEqual(3);
            expect(scope.obj.value).toEqual([]);

            // Cover both jQuery 3.x ([]) and 2.x (null) behavior.
            let val = element.val();
            if (val === null) {
              val = [];
            }
            expect(val).toEqual([]);

            expect(ngModelCtrlSpy).toHaveBeenCalledTimes(1);
          });

          it("should set the model to null when the currently selected option with $prop becomes disabled", () => {
            const A = { name: "A" };
            const B = { name: "B" };
            const C = { name: "C" };
            const D = { name: "D" };

            scope.options = [A, B, C, D];
            scope.obj = {};

            let optionString = "";

            switch (prop) {
              case "ngValue":
                optionString =
                  '<option ng-repeat="option in options" ng-disabled="option.disabled" ng-value="option.name">{{$index}}</option>';
                break;
              case "interpolatedValue":
                optionString =
                  '<option ng-repeat="option in options" ng-disabled="option.disabled" value="{{option.name}}">{{$index}}</option>';
                break;
              case "interpolatedText":
                optionString =
                  '<option ng-repeat="option in options" ng-disabled="option.disabled">{{option.name}}</option>';
                break;
            }

            compile(
              `<select ng-model="obj.value" multiple>${optionString}</select>`,
            );

            const ngModelCtrl = element.controller("ngModel");
            const ngModelCtrlSpy = spyOn(
              ngModelCtrl,
              "$setViewValue",
            ).and.callThrough();

            let optionElements = element.find("option");
            expect(optionElements.length).toEqual(4);

            optionElements.eq(0)[0].selected = true;
            optionElements.eq(2)[0].selected = true;
            optionElements.eq(3)[0].selected = true;
            browserTrigger(element, "change");

            optionElements = element.find("option");
            expect(optionElements.length).toEqual(4);
            expect(scope.obj.value).toEqual(["A", "C", "D"]);

            ngModelCtrlSpy.calls.reset();
            A.disabled = true;
            C.disabled = true;
            ;

            optionElements = element.find("option");
            expect(optionElements.length).toEqual(4);
            expect(scope.obj.value).toEqual(["D"]);
            expect(element.val()).toEqual(
              prop === "ngValue" ? ["string:D"] : ["D"],
            );
            expect(ngModelCtrlSpy).toHaveBeenCalledTimes(1);
          });

          it("should select disabled options with $prop when the model is set to matching values", () => {
            const A = { name: "A" };
            const B = { name: "B" };
            const C = { name: "C" };
            const D = { name: "D" };

            scope.options = [A, B, C, D];
            scope.obj = {};

            let optionString = "";

            switch (prop) {
              case "ngValue":
                optionString =
                  '<option ng-repeat="option in options" ng-disabled="option.disabled" ng-value="option">{{$index}}</option>';
                break;
              case "interpolatedValue":
                optionString =
                  '<option ng-repeat="option in options" ng-disabled="option.disabled" value="{{option.name}}">{{$index}}</option>';
                break;
              case "interpolatedText":
                optionString =
                  '<option ng-repeat="option in options" ng-disabled="option.disabled">{{option.name}}</option>';
                break;
            }

            compile(
              `<select ng-model="obj.value" multiple>${optionString}</select>`,
            );

            let optionElements = element.find("option");
            expect(optionElements.length).toEqual(4);
            expect(element[0].value).toBe("");

            A.disabled = true;
            D.disabled = true;
            ;

            optionElements = element.find("option");
            expect(optionElements.length).toEqual(4);
            expect(element[0].value).toBe("");

            scope.obj.value = prop === "ngValue" ? [A, C, D] : ["A", "C", "D"];
            ;

            optionElements = element.find("option");
            expect(optionElements.length).toEqual(4);
            expect(optionElements.eq(0)[0].selected).toBe(true);
            expect(optionElements.eq(2)[0].selected).toBe(true);
            expect(optionElements.eq(3)[0].selected).toBe(true);
          });

          it("should select a newly added option with $prop when it matches the current model", () => {
            const A = { name: "A" };
            const B = { name: "B" };
            const C = { name: "C" };

            scope.options = [A, B];
            scope.obj = {
              value: prop === "ngValue" ? [B, C] : ["B", "C"],
            };

            let optionString = "";

            switch (prop) {
              case "ngValue":
                optionString =
                  '<option ng-repeat="option in options" ng-value="option">{{$index}}</option>';
                break;
              case "interpolatedValue":
                optionString =
                  '<option ng-repeat="option in options" value="{{option.name}}">{{$index}}</option>';
                break;
              case "interpolatedText":
                optionString =
                  '<option ng-repeat="option in options">{{option.name}}</option>';
                break;
            }

            compile(
              `<select ng-model="obj.value" multiple>${optionString}</select>`,
            );

            let optionElements = element.find("option");
            expect(optionElements.length).toEqual(2);
            expect(optionElements.eq(1)[0].selected).toBe(true);

            scope.options.push(C);
            ;

            optionElements = element.find("option");

            expect(optionElements.length).toEqual(3);
            expect(optionElements[1].selected).toBe(true);
            expect(optionElements[2].selected).toBe(true);
          });

          it("should keep selection and model when a repeated options with track by are replaced with equal options", () => {
            const A = { name: "A" };
            const B = { name: "B" };
            const C = { name: "C" };

            scope.options = [A, B, C];
            scope.obj = {
              value: "C",
            };

            let optionString = "";

            switch (prop) {
              case "ngValue":
                optionString =
                  '<option ng-repeat="option in options track by option.name" ng-value="option.name">{{$index}}</option>';
                break;
              case "interpolatedValue":
                optionString =
                  '<option ng-repeat="option in options track by option.name" value="{{option.name}}">{{$index}}</option>';
                break;
              case "interpolatedText":
                optionString =
                  '<option ng-repeat="option in options track by option.name">{{option.name}}</option>';
                break;
            }

            compile(
              `<select ng-model="obj.value" multiple>${optionString}</select>`,
            );

            let optionElements = element.find("option");
            expect(optionElements.length).toEqual(3);

            scope.obj.value = ["B", "C"];
            ;

            optionElements = element.find("option");

            expect(optionElements.length).toEqual(3);
            expect(optionElements[1].selected).toBe(true);
            expect(optionElements[2].selected).toBe(true);
            expect(scope.obj.value).toEqual(["B", "C"]);

            scope.options = [{ name: "A" }, { name: "B" }, { name: "C" }];
            ;

            optionElements = element.find("option");

            expect(optionElements.length).toEqual(3);
            expect(optionElements[1].selected).toBe(true);
            expect(optionElements[2].selected).toBe(true);
            expect(scope.obj.value).toEqual(["B", "C"]);
          });
        });
      });

      it("should keep the ngModel value when the selected option is recreated by ngRepeat", () => {
        scope.options = [{ name: "A" }, { name: "B" }, { name: "C" }];
        scope.obj = {
          value: "B",
        };

        compile(
          '<select ng-model="obj.value">' +
            '<option ng-repeat="option in options" value="{{option.name}}">{{option.name}}</option>' +
            "</select>",
        );

        let optionElements = element.find("option");
        expect(optionElements.length).toEqual(3);
        expect(optionElements[0].value).toBe("A");
        expect(optionElements[1].selected).toBeTrue();
        expect(scope.obj.value).toBe("B");

        scope.$apply(() => {
          // Only when new objects are used, ngRepeat re-creates the element from scratch
          scope.options = [{ name: "B" }, { name: "C" }, { name: "D" }];
        });

        const previouslySelectedOptionElement = optionElements[1];
        optionElements = element.find("option");

        expect(optionElements.length).toEqual(3);
        expect(optionElements[0].value).toBe("B");
        expect(optionElements[0].selected).toBeTrue();
        expect(scope.obj.value).toBe("B");
        // Ensure the assumption that the element is re-created is true
        expect(previouslySelectedOptionElement).not.toBe(optionElements[0]);
      });

      it("should validate when the options change", () => {
        scope.values = ["A", "B"];
        scope.selection = "A";

        compile(
          '<select ng-model="selection" required>' +
            '<option value="">--select--</option>' +
            '<option ng-repeat="option in values" value="{{option}}">{{option}}</option>' +
            "</select>",
        );

        expect(element[0].value).toBe("A");
        expect(element[0].classList.contains("ng-valid")).toBeTrue();
        expect(ngModelCtrl.$error.required).toBeFalsy();

        scope.$apply(() => {
          // Only when new objects are used, ngRepeat re-creates the element from scratch
          scope.values = ["B", "C"];
        });

        expect(element[0].value).toBe("");
        expect(element[0].classList.contains("ng-invalid")).toBeTrue();
        expect(ngModelCtrl.$error.required).toBeTruthy();
        // ngModel sets undefined for invalid values
        expect(scope.selection).toBeUndefined();
      });
    });
  });
});
