import { createInjector } from "../../core/di/injector";
import { Angular } from "../../loader";
import { dealoc } from "../../shared/jqlite/jqlite.js";

describe("$aria", () => {
  let scope;
  let $compile;
  let element;

  beforeEach(() => {
    window.angular = new Angular();
    window.angular.module("test", ["ng"]);
    let injector = createInjector(["test"]);
    scope = injector.get("$rootScope");
    $compile = injector.get("$compile");
  });

  afterEach(() => {
    dealoc(element);
  });

  describe("with `ngAriaDisable`", () => {
    // ariaChecked
    it("should not attach aria-checked to custom checkbox", () => {
      element = $compile(
        '<div role="checkbox" ng-model="val" ng-aria-disable></div>',
      )(scope);

      scope.$apply("val = false");
      expect(element.hasAttribute("aria-checked")).toBeFalse();

      scope.$apply("val = true");
      expect(element.hasAttribute("aria-checked")).toBeFalse();
    });

    it("should not attach aria-checked to custom radio controls", () => {
      element = $compile(
        '<div role="radio" ng-model="val" value="one" ng-aria-disable></div>' +
          '<div role="radio" ng-model="val" value="two" ng-aria-disable></div>',
      )(scope);
      const radio1 = element.eq(0);
      const radio2 = element.eq(1);

      scope.$apply('val = "one"');
      expect(radio1[0].hasAttribute("aria-checked")).toBeFalse();
      expect(radio2[0].hasAttribute("aria-checked")).toBeFalse();

      scope.$apply('val = "two"');
      expect(radio1[0].hasAttribute("aria-checked")).toBeFalse();
      expect(radio2[0].hasAttribute("aria-checked")).toBeFalse();
    });

    // ariaDisabled
    it("should not attach aria-disabled to custom controls", () => {
      element = $compile('<div ng-disabled="val" ng-aria-disable></div>')(
        scope,
      );
      scope.$apply("val = false");
      expect(element.hasAttribute("aria-disabled")).toBeFalse();

      scope.$apply("val = true");
      expect(element.hasAttribute("aria-disabled")).toBeFalse();
    });

    // ariaHidden
    it("should not attach aria-hidden to `ngShow`", () => {
      element = $compile('<div ng-show="val" ng-aria-disable></div>')(scope);
      scope.$apply("val = false");
      expect(element.hasAttribute("aria-hidden")).toBeFalse();

      scope.$apply("val = true");
      expect(element.hasAttribute("aria-hidden")).toBeFalse();
    });

    it("should not attach aria-hidden to `ngHide`", () => {
      element = $compile('<div ng-hide="val" ng-aria-disable></div>')(scope);
      scope.$apply("val = false");
      expect(element.hasAttribute("aria-hidden")).toBeFalse();

      scope.$apply("val = true");
      expect(element.hasAttribute("aria-hidden")).toBeFalse();
    });

    // ariaInvalid
    it("should not attach aria-invalid to input", () => {
      element = $compile(
        '<input ng-model="val" ng-minlength="10" ng-aria-disable />',
      )(scope);
      scope.$apply('val = "lt 10"');
      expect(element.hasAttribute("aria-invalid")).toBeFalse();

      scope.$apply('val = "gt 10 characters"');
      expect(element.hasAttribute("aria-invalid")).toBeFalse();
    });

    it("should not attach aria-invalid to custom controls", () => {
      element = $compile(
        '<div role="textbox" ng-model="val" ng-minlength="10" ng-aria-disable></div>',
      )(scope);
      scope.$apply('val = "lt 10"');
      expect(element.hasAttribute("aria-invalid")).toBeFalse();

      scope.$apply('val = "gt 10 characters"');
      expect(element.hasAttribute("aria-invalid")).toBeFalse();
    });

    // ariaLive
    it("should not attach aria-live to `ngMessages`", () => {
      element = $compile('<div ng-messages="val" ng-aria-disable>')(scope);
      expect(element.hasAttribute("aria-live")).toBeFalse();
    });

    // ariaReadonly
    it("should not attach aria-readonly to custom controls", () => {
      element = $compile('<div ng-readonly="val" ng-aria-disable></div>')(
        scope,
      );
      scope.$apply("val = false");
      expect(element.hasAttribute("aria-readonly")).toBeFalse();

      scope.$apply("val = true");
      expect(element.hasAttribute("aria-readonly")).toBeFalse();
    });

    // ariaRequired
    it("should not attach aria-required to custom controls with `required`", () => {
      element = $compile('<div ng-model="val" required ng-aria-disable></div>')(
        scope,
      );
      expect(element.hasAttribute("aria-required")).toBeFalse();
    });

    it("should not attach aria-required to custom controls with `ngRequired`", () => {
      element = $compile(
        '<div ng-model="val" ng-required="val" ng-aria-disable></div>',
      )(scope);
      scope.$apply("val = false");
      expect(element.hasAttribute("aria-required")).toBeFalse();

      scope.$apply("val = true");
      expect(element.hasAttribute("aria-required")).toBeFalse();
    });

    // ariaValue
    it("should not attach aria-value* to input[range]", () => {
      element = $compile(
        '<input type="range" ng-model="val" min="0" max="100" ng-aria-disable />',
      )(scope);
      expect(element.hasAttribute("aria-valuemax")).toBeFalse();
      expect(element.hasAttribute("aria-valuemin")).toBeFalse();
      expect(element.hasAttribute("aria-valuenow")).toBeFalse();

      scope.$apply("val = 50");
      expect(element.hasAttribute("aria-valuemax")).toBeFalse();
      expect(element.hasAttribute("aria-valuemin")).toBeFalse();
      expect(element.hasAttribute("aria-valuenow")).toBeFalse();

      scope.$apply("val = 150");
      expect(element.hasAttribute("aria-valuemax")).toBeFalse();
      expect(element.hasAttribute("aria-valuemin")).toBeFalse();
      expect(element.hasAttribute("aria-valuenow")).toBeFalse();
    });

    it("should not attach aria-value* to custom controls", () => {
      element = $compile(
        '<div role="progressbar" ng-model="val" min="0" max="100" ng-aria-disable></div>' +
          '<div role="slider" ng-model="val" min="0" max="100" ng-aria-disable></div>',
      )(scope);
      const progressbar = element.eq(0);
      const slider = element.eq(1);

      ["aria-valuemax", "aria-valuemin", "aria-valuenow"].forEach((attr) => {
        expect(progressbar[0].hasAttribute(attr)).toBeFalse();
        expect(slider[0].hasAttribute(attr)).toBeFalse();
      });

      scope.$apply("val = 50");
      ["aria-valuemax", "aria-valuemin", "aria-valuenow"].forEach((attr) => {
        expect(progressbar[0].hasAttribute(attr)).toBeFalse();
        expect(slider[0].hasAttribute(attr)).toBeFalse();
      });

      scope.$apply("val = 150");
      ["aria-valuemax", "aria-valuemin", "aria-valuenow"].forEach((attr) => {
        expect(progressbar[0].hasAttribute(attr)).toBeFalse();
        expect(slider[0].hasAttribute(attr)).toBeFalse();
      });
    });

    // bindKeypress
    it("should not bind keypress to `ngClick`", () => {
      scope.onClick = jasmine.createSpy("onClick");
      element = $compile(
        '<div ng-click="onClick()" tabindex="0" ng-aria-disable></div>' +
          '<ul><li ng-click="onClick()" tabindex="0" ng-aria-disable></li></ul>',
      )(scope);
      const div = element.find("div");
      const li = element.find("li");

      div.triggerHandler({ type: "keypress", keyCode: 32 });
      li.triggerHandler({ type: "keypress", keyCode: 32 });

      expect(scope.onClick).not.toHaveBeenCalled();
    });

    // bindRoleForClick
    it("should not attach role to custom controls", () => {
      element = $compile(
        '<div ng-click="onClick()" ng-aria-disable></div>' +
          '<div type="checkbox" ng-model="val" ng-aria-disable></div>' +
          '<div type="radio" ng-model="val" ng-aria-disable></div>' +
          '<div type="range" ng-model="val" ng-aria-disable></div>',
      )(scope);
      expect(element.eq(0)[0].hasAttribute("role")).toBeFalse();
      expect(element.eq(1)[0].hasAttribute("role")).toBeFalse();
      expect(element.eq(2)[0].hasAttribute("role")).toBeFalse();
      expect(element.eq(3)[0].hasAttribute("role")).toBeFalse();
    });

    // tabindex
    it("should not attach tabindex to custom controls", () => {
      element = $compile(
        '<div role="checkbox" ng-model="val" ng-aria-disable></div>' +
          '<div role="slider" ng-model="val" ng-aria-disable></div>',
      )(scope);
      expect(element.eq(0)[0].hasAttribute("tabindex")).toBeFalse();
      expect(element.eq(1)[0].hasAttribute("tabindex")).toBeFalse();
    });

    it("should not attach tabindex to `ngClick` or `ngDblclick`", () => {
      element = $compile(
        '<div ng-click="onClick()" ng-aria-disable></div>' +
          '<div ng-dblclick="onDblclick()" ng-aria-disable></div>',
      )(scope);
      expect(element.eq(0)[0].hasAttribute("tabindex")).toBeFalse();
      expect(element.eq(1)[0].hasAttribute("tabindex")).toBeFalse();
    });
  });

  describe("aria-hidden", () => {
    it("should attach aria-hidden to ng-show", () => {
      element = $compile('<div ng-show="val"></div>')(scope);
      scope.$apply("val = false");
      expect(element.attr("aria-hidden")).toBe("true");

      scope.$apply("val = true");
      expect(element.attr("aria-hidden")).toBe("false");
    });

    it("should attach aria-hidden to ng-hide", () => {
      element = $compile('<div ng-hide="val"></div>')(scope);
      scope.$apply("val = false");
      expect(element.attr("aria-hidden")).toBe("false");

      scope.$apply("val = true");
      expect(element.attr("aria-hidden")).toBe("true");
    });

    it("should not change aria-hidden if it is already present on ng-show", () => {
      element = $compile(
        '<div ng-show="val" aria-hidden="userSetValue"></div>',
      )(scope);
      expect(element.attr("aria-hidden")).toBe("userSetValue");

      scope.$apply("val = true");
      expect(element.attr("aria-hidden")).toBe("userSetValue");
    });

    it("should not change aria-hidden if it is already present on ng-hide", () => {
      element = $compile(
        '<div ng-hide="val" aria-hidden="userSetValue"></div>',
      )(scope);
      expect(element.attr("aria-hidden")).toBe("userSetValue");

      scope.$apply("val = true");
      expect(element.attr("aria-hidden")).toBe("userSetValue");
    });

    it("should always set aria-hidden to a boolean value", () => {
      element = $compile('<div ng-hide="val"></div>')(scope);
      scope.$apply('val = "test angular"');
      expect(element.attr("aria-hidden")).toBe("true");

      scope.$apply("val = null");
      expect(element.attr("aria-hidden")).toBe("false");

      scope.$apply("val = {}");
      expect(element.attr("aria-hidden")).toBe("true");

      element = $compile('<div ng-show="val"></div>')(scope);
      scope.$apply('val = "test angular"');
      expect(element.attr("aria-hidden")).toBe("false");

      scope.$apply("val = null");
      expect(element.attr("aria-hidden")).toBe("true");

      scope.$apply("val = {}");
      expect(element.attr("aria-hidden")).toBe("false");
    });
  });

  describe("aria-hidden when disabled", () => {
    beforeEach(() => {
      window.angular.module("test", [
        "ng",
        ($ariaProvider) => {
          $ariaProvider.config({
            ariaHidden: false,
          });
        },
      ]);
      let injector = createInjector(["test"]);
      scope = injector.get("$rootScope");
      $compile = injector.get("$compile");
    });

    it("should not attach aria-hidden", () => {
      scope.$apply("val = false");
      element = $compile('<div ng-show="val"></div>')(scope);
      expect(element.hasAttribute("aria-hidden")).toBeFalse();

      element = $compile('<div ng-hide="val"></div>')(scope);
      expect(element.hasAttribute("aria-hidden")).toBeFalse();
    });
  });

  describe("aria-checked", () => {
    it('should not attach itself to native input type="checkbox"', () => {
      element = $compile('<input type="checkbox" ng-model="val">')(scope);
      scope.$apply("val = true");
      expect(element.attr("aria-checked")).toBeUndefined();

      scope.$apply("val = false");
      expect(element.attr("aria-checked")).toBeUndefined();
    });

    it("should attach itself to custom checkbox", () => {
      element = $compile('<div role="checkbox" ng-model="val"></div>')(scope);
      scope.$apply('val = "checked"');
      expect(element.attr("aria-checked")).toBe("true");

      scope.$apply("val = null");
      expect(element.attr("aria-checked")).toBe("false");
    });

    it("should use `$isEmpty()` to determine if the checkbox is checked", () => {
      element = $compile('<div role="checkbox" ng-model="val"></div>')(scope);
      const ctrl = element.controller("ngModel");
      ctrl.$isEmpty = function (value) {
        return value === "not-checked";
      };

      scope.$apply("val = true");
      expect(ctrl.$modelValue).toBe(true);
      expect(element.attr("aria-checked")).toBe("true");

      scope.$apply("val = false");
      expect(ctrl.$modelValue).toBe(false);
      expect(element.attr("aria-checked")).toBe("true");

      scope.$apply('val = "not-checked"');
      expect(ctrl.$modelValue).toBe("not-checked");
      expect(element.attr("aria-checked")).toBe("false");

      scope.$apply('val = "checked"');
      expect(ctrl.$modelValue).toBe("checked");
      expect(element.attr("aria-checked")).toBe("true");
    });

    it("should not handle native checkbox with ngChecked", () => {
      const element = $compile('<input type="checkbox" ng-checked="val">')(
        scope,
      );
      scope.$apply("val = true");
      expect(element.attr("aria-checked")).toBeUndefined();

      scope.$apply("val = false");
      expect(element.attr("aria-checked")).toBeUndefined();
    });

    it("should handle custom checkbox with ngChecked", () => {
      const element = $compile('<div role="checkbox" ng-checked="val">')(scope);

      scope.$apply("val = true");
      expect(element.getAttribute("aria-checked")).toBe("true");

      scope.$apply("val = false");
      expect(element.getAttribute("aria-checked")).toBe("false");
    });

    it('should not attach to native input type="radio"', () => {
      const element = $compile(
        '<input type="radio" ng-model="val" value="one">' +
          '<input type="radio" ng-model="val" value="two">',
      )(scope);

      scope.$apply("val='one'");
      expect(element.eq(0).attr("aria-checked")).toBeUndefined();
      expect(element.eq(1).attr("aria-checked")).toBeUndefined();

      scope.$apply("val='two'");
      expect(element.eq(0).attr("aria-checked")).toBeUndefined();
      expect(element.eq(1).attr("aria-checked")).toBeUndefined();
    });

    it("should attach to custom radio controls", () => {
      const element = $compile(
        '<div role="radio" ng-model="val" value="one"></div>' +
          '<div role="radio" ng-model="val" value="two"></div>',
      )(scope);

      scope.$apply("val='one'");
      expect(element.eq(0).attr("aria-checked")).toBe("true");
      expect(element.eq(1).attr("aria-checked")).toBe("false");

      scope.$apply("val='two'");
      expect(element.eq(0).attr("aria-checked")).toBe("false");
      expect(element.eq(1).attr("aria-checked")).toBe("true");
    });

    it("should handle custom radios with integer model values", () => {
      const element = $compile(
        '<div role="radio" ng-model="val" value="0"></div>' +
          '<div role="radio" ng-model="val" value="1"></div>',
      )(scope);

      scope.$apply("val=0");
      expect(element.eq(0).attr("aria-checked")).toBe("true");
      expect(element.eq(1).attr("aria-checked")).toBe("false");

      scope.$apply("val=1");
      expect(element.eq(0).attr("aria-checked")).toBe("false");
      expect(element.eq(1).attr("aria-checked")).toBe("true");
    });

    it("should handle radios with boolean model values using ngValue", () => {
      const element = $compile(
        '<div role="radio" ng-model="val" ng-value="valExp"></div>' +
          '<div role="radio" ng-model="val" ng-value="valExp2"></div>',
      )(scope);

      scope.$apply(() => {
        scope.valExp = true;
        scope.valExp2 = false;
        scope.val = true;
      });
      expect(element.eq(0).attr("aria-checked")).toBe("true");
      expect(element.eq(1).attr("aria-checked")).toBe("false");

      scope.$apply("val = false");
      expect(element.eq(0).attr("aria-checked")).toBe("false");
      expect(element.eq(1).attr("aria-checked")).toBe("true");
    });

    it('should attach itself to role="menuitemradio"', () => {
      scope.val = "one";
      element = $compile(
        '<div role="menuitemradio" ng-model="val" value="one"></div>',
      )(scope);
      expect(element.attr("aria-checked")).toBe("true");

      scope.$apply("val = 'two'");
      expect(element.attr("aria-checked")).toBe("false");
    });

    it('should attach itself to role="menuitemcheckbox"', () => {
      element = $compile('<div role="menuitemcheckbox" ng-model="val"></div>')(
        scope,
      );
      scope.$apply('val = "checked"');
      expect(element.attr("aria-checked")).toBe("true");

      scope.$apply("val = null");
      expect(element.attr("aria-checked")).toBe("false");
    });

    it("should not attach itself if an aria-checked value is already present", () => {
      const element = [
        $compile(
          "<div role='radio' ng-model='val' value='{{val3}}' aria-checked='userSetValue'></div>",
        )(scope),
        $compile(
          "<div role='menuitemradio' ng-model='val' value='{{val3}}' aria-checked='userSetValue'></div>",
        )(scope),
        $compile(
          "<div role='checkbox' checked='checked' aria-checked='userSetValue'></div>",
        )(scope),
        $compile(
          "<div role='menuitemcheckbox' checked='checked' aria-checked='userSetValue'></div>",
        )(scope),
      ];
      scope.$apply("val1=true;val2='one';val3='1'");
      expectAriaAttrOnEachElement(element, "aria-checked", "userSetValue");
    });
  });

  describe("roles for custom inputs", () => {
    it('should add missing role="button" to custom input', () => {
      element = $compile('<div ng-click="someFunction()"></div>')(scope);
      expect(element.attr("role")).toBe("button");
    });

    it('should not add role="button" to anchor', () => {
      element = $compile('<a ng-click="someFunction()"></a>')(scope);
      expect(element.attr("role")).not.toBe("button");
    });

    it('should add missing role="checkbox" to custom input', () => {
      element = $compile('<div type="checkbox" ng-model="val"></div>')(scope);
      expect(element.attr("role")).toBe("checkbox");
    });

    it("should not add a role to a native checkbox", () => {
      element = $compile('<input type="checkbox" ng-model="val"/>')(scope);
      expect(element.attr("role")).toBeUndefined();
    });

    it('should add missing role="radio" to custom input', () => {
      element = $compile('<div type="radio" ng-model="val"></div>')(scope);
      expect(element.attr("role")).toBe("radio");
    });

    it("should not add a role to a native radio button", () => {
      element = $compile('<input type="radio" ng-model="val"/>')(scope);
      expect(element.attr("role")).toBeUndefined();
    });

    it('should add missing role="slider" to custom input', () => {
      element = $compile('<div type="range" ng-model="val"></div>')(scope);
      expect(element.attr("role")).toBe("slider");
    });

    it("should not add a role to a native range input", () => {
      element = $compile('<input type="range" ng-model="val"/>')(scope);
      expect(element.attr("role")).toBeUndefined();
    });

    it("should not add role to native $prop controls", () => {
      [
        '<input type="text" ng-model="val">',
        '<select type="checkbox" ng-model="val"></select>',
        '<textarea type="checkbox" ng-model="val"></textarea>',
        '<button ng-click="doClick()"></button>',
        '<summary ng-click="doClick()"></summary>',
        '<details ng-click="doClick()"></details>',
        '<a ng-click="doClick()"></a>',
      ].forEach((tmpl) => {
        const element = $compile(tmpl)(scope);
        expect(element.attr("role")).toBeUndefined();
      });
    });
  });

  describe("aria-checked when disabled", () => {
    beforeEach(() => {
      window.angular.module("test", [
        "ng",
        ($ariaProvider) => {
          $ariaProvider.config({
            ariaChecked: false,
          });
        },
      ]);
      let injector = createInjector(["test"]);
      scope = injector.get("$rootScope");
      $compile = injector.get("$compile");
    });

    it("should not attach aria-checked", () => {
      element = $compile(
        "<div role='radio' ng-model='val' value='{{val}}'></div>",
      )(scope);
      expect(element.attr("aria-checked")).toBeUndefined();

      element = $compile(
        "<div role='menuitemradio' ng-model='val' value='{{val}}'></div>",
      )(scope);
      expect(element.attr("aria-checked")).toBeUndefined();

      element = $compile("<div role='checkbox' checked='checked'></div>")(
        scope,
      );
      expect(element.attr("aria-checked")).toBeUndefined();

      element = $compile(
        "<div role='menuitemcheckbox' checked='checked'></div>",
      )(scope);
      expect(element.attr("aria-checked")).toBeUndefined();
    });
  });

  describe("aria-disabled", () => {
    it("should not attach itself to native $prop controls", () => {
      [
        '<input ng-disabled="val">',
        '<textarea ng-disabled="val"></textarea>',
        '<select ng-disabled="val"></select>',
        '<button ng-disabled="val"></button>',
      ].forEach((tmpl) => {
        const element = $compile(tmpl)(scope);
        scope.$apply("val = true");

        expect(element.attr("disabled")).toBeDefined();
        expect(element.attr("aria-disabled")).toBeUndefined();
      });
    });

    it("should attach itself to custom controls", () => {
      element = $compile('<div ng-disabled="val"></div>')(scope);
      expect(element.attr("aria-disabled")).toBe("false");

      scope.$apply("val = true");
      expect(element.attr("aria-disabled")).toBe("true");
    });

    it("should not attach itself if an aria-disabled attribute is already present", () => {
      element = $compile(
        '<div ng-disabled="val" aria-disabled="userSetValue"></div>',
      )(scope);
      expect(element.attr("aria-disabled")).toBe("userSetValue");
    });

    it("should always set aria-disabled to a boolean value", () => {
      element = $compile('<div ng-disabled="val"></div>')(scope);

      scope.$apply('val = "test angular"');
      expect(element.attr("aria-disabled")).toBe("true");

      scope.$apply("val = null");
      expect(element.attr("aria-disabled")).toBe("false");

      scope.$apply("val = {}");
      expect(element.attr("aria-disabled")).toBe("true");
    });
  });

  describe("aria-disabled when disabled", () => {
    beforeEach(() => {
      window.angular.module("test", [
        "ng",
        ($ariaProvider) => {
          $ariaProvider.config({
            ariaDisabled: false,
          });
        },
      ]);
      let injector = createInjector(["test"]);
      scope = injector.get("$rootScope");
      $compile = injector.get("$compile");
    });

    it("should not attach aria-disabled", () => {
      element = $compile('<div ng-disabled="val"></div>')(scope);

      scope.$apply("val = true");
      expect(element.attr("aria-disabled")).toBeUndefined();
    });
  });

  describe("aria-invalid", () => {
    it("should attach aria-invalid to input", () => {
      element = $compile('<input ng-model="txtInput" ng-minlength="10">')(
        scope,
      );
      scope.$apply("txtInput='LTten'");
      expect(element.attr("aria-invalid")).toBe("true");

      scope.$apply("txtInput='morethantencharacters'");
      expect(element.attr("aria-invalid")).toBe("false");
    });

    it("should attach aria-invalid to custom controls", () => {
      element = $compile(
        '<div ng-model="txtInput" role="textbox" ng-minlength="10"></div>',
      )(scope);
      scope.$apply("txtInput='LTten'");
      expect(element.attr("aria-invalid")).toBe("true");

      scope.$apply("txtInput='morethantencharacters'");
      expect(element.attr("aria-invalid")).toBe("false");
    });

    it("should not attach itself if aria-invalid is already present", () => {
      element = $compile(
        '<input ng-model="txtInput" ng-minlength="10" aria-invalid="userSetValue">',
      )(scope);
      scope.$apply("txtInput='LTten'");
      expect(element.attr("aria-invalid")).toBe("userSetValue");
    });

    it('should not attach if input is type="hidden"', () => {
      element = $compile('<input type="hidden" ng-model="txtInput">')(scope);
      expect(element.attr("aria-invalid")).toBeUndefined();
    });

    it('should attach aria-invalid to custom control that is type="hidden"', () => {
      element = $compile(
        '<div ng-model="txtInput" type="hidden" role="textbox" ng-minlength="10"></div>',
      )(scope);
      scope.$apply("txtInput='LTten'");
      expect(element.attr("aria-invalid")).toBe("true");

      scope.$apply("txtInput='morethantencharacters'");
      expect(element.attr("aria-invalid")).toBe("false");
    });
  });

  describe("aria-invalid when disabled", () => {
    beforeEach(() => {
      window.angular.module("test", [
        "ng",
        ($ariaProvider) => {
          $ariaProvider.config({
            ariaInvalid: false,
          });
        },
      ]);
      let injector = createInjector(["test"]);
      scope = injector.get("$rootScope");
      $compile = injector.get("$compile");
    });

    it("should not attach aria-invalid if the option is disabled", () => {
      scope.$apply("txtInput='LTten'");
      element = $compile('<input ng-model="txtInput" ng-minlength="10">')(
        scope,
      );
      expect(element.attr("aria-invalid")).toBeUndefined();
    });
  });

  describe("aria-readonly", () => {
    it("should not attach itself to native $prop controls", () => {
      [
        '<input ng-readonly="val">',
        '<textarea ng-readonly="val"></textarea>',
        '<select ng-readonly="val"></select>',
        '<button ng-readonly="val"></button>',
      ].forEach((tmpl) => {
        const element = $compile(tmpl)(scope);
        scope.$apply("val = true");

        expect(element.attr("readonly")).toBeDefined();
        expect(element.attr("aria-readonly")).toBeUndefined();
      });
    });

    it("should attach itself to custom controls", () => {
      element = $compile('<div ng-readonly="val"></div>')(scope);
      expect(element.attr("aria-readonly")).toBe("false");

      scope.$apply("val = true");
      expect(element.attr("aria-readonly")).toBe("true");
    });

    it("should not attach itself if an aria-readonly attribute is already present", () => {
      element = $compile(
        '<div ng-readonly="val" aria-readonly="userSetValue"></div>',
      )(scope);
      expect(element.attr("aria-readonly")).toBe("userSetValue");
    });

    it("should always set aria-readonly to a boolean value", () => {
      element = $compile('<div ng-readonly="val"></div>')(scope);

      scope.$apply('val = "test angular"');
      expect(element.attr("aria-readonly")).toBe("true");

      scope.$apply("val = null");
      expect(element.attr("aria-readonly")).toBe("false");

      scope.$apply("val = {}");
      expect(element.attr("aria-readonly")).toBe("true");
    });
  });

  describe("aria-readonly when disabled", () => {
    beforeEach(() => {
      window.angular.module("test", [
        "ng",
        ($ariaProvider) => {
          $ariaProvider.config({
            ariaReadonly: false,
          });
        },
      ]);
      let injector = createInjector(["test"]);
      scope = injector.get("$rootScope");
      $compile = injector.get("$compile");
    });

    it("should not add the aria-readonly attribute", () => {
      element = $compile("<input ng-model='val' readonly>")(scope);
      expect(element.attr("aria-readonly")).toBeUndefined();

      element = $compile("<div ng-model='val' ng-readonly='true'></div>")(
        scope,
      );
      expect(element.attr("aria-readonly")).toBeUndefined();
    });
  });

  describe("aria-required", () => {
    it("should not attach to input", () => {
      element = $compile('<input ng-model="val" required>')(scope);
      expect(element.attr("aria-required")).toBeUndefined();
    });

    it("should attach to custom controls with ngModel and required", () => {
      element = $compile('<div ng-model="val" role="checkbox" required></div>')(
        scope,
      );
      expect(element.attr("aria-required")).toBe("true");
    });

    it("should set aria-required to false when ng-required is false", () => {
      element = $compile(
        "<div role='checkbox' ng-required='false' ng-model='val'></div>",
      )(scope);
      expect(element.attr("aria-required")).toBe("false");
    });

    it("should attach to custom controls with ngRequired", () => {
      element = $compile(
        '<div role="checkbox" ng-model="val" ng-required="true"></div>',
      )(scope);
      expect(element.attr("aria-required")).toBe("true");
    });

    it("should not attach itself if aria-required is already present", () => {
      element = $compile(
        "<div role='checkbox' ng-model='val' ng-required='true' aria-required='userSetValue'></div>",
      )(scope);
      expect(element.attr("aria-required")).toBe("userSetValue");
    });
  });

  describe("aria-required when disabled", () => {
    beforeEach(() => {
      window.angular.module("test", [
        "ng",
        ($ariaProvider) => {
          $ariaProvider.config({
            ariaRequired: false,
          });
        },
      ]);
      let injector = createInjector(["test"]);
      scope = injector.get("$rootScope");
      $compile = injector.get("$compile");
    });

    it("should not add the aria-required attribute", () => {
      element = $compile("<input ng-model='val' required>")(scope);
      expect(element.attr("aria-required")).toBeUndefined();

      element = $compile("<div ng-model='val' ng-required='true'></div>")(
        scope,
      );
      expect(element.attr("aria-required")).toBeUndefined();
    });
  });

  describe("aria-value", () => {
    it('should attach to input type="range"', () => {
      const element = [
        $compile('<input type="range" ng-model="val" min="0" max="100">')(
          scope,
        ),
        $compile('<div role="progressbar" min="0" max="100" ng-model="val">')(
          scope,
        ),
        $compile('<div role="slider" min="0" max="100" ng-model="val">')(scope),
      ];

      scope.$apply("val = 50");
      expectAriaAttrOnEachElement(element, "aria-valuenow", "50");
      expectAriaAttrOnEachElement(element, "aria-valuemin", "0");
      expectAriaAttrOnEachElement(element, "aria-valuemax", "100");

      scope.$apply("val = 90");
      expectAriaAttrOnEachElement(element, "aria-valuenow", "90");
    });

    it("should not attach if aria-value* is already present", () => {
      const element = [
        $compile(
          '<input type="range" ng-model="val" min="0" max="100" aria-valuenow="userSetValue1" aria-valuemin="userSetValue2" aria-valuemax="userSetValue3">',
        )(scope),
        $compile(
          '<div role="progressbar" min="0" max="100" ng-model="val" aria-valuenow="userSetValue1" aria-valuemin="userSetValue2" aria-valuemax="userSetValue3">',
        )(scope),
        $compile(
          '<div role="slider" min="0" max="100" ng-model="val" aria-valuenow="userSetValue1" aria-valuemin="userSetValue2" aria-valuemax="userSetValue3">',
        )(scope),
      ];

      scope.$apply("val = 50");
      expectAriaAttrOnEachElement(element, "aria-valuenow", "userSetValue1");
      expectAriaAttrOnEachElement(element, "aria-valuemin", "userSetValue2");
      expectAriaAttrOnEachElement(element, "aria-valuemax", "userSetValue3");
    });

    it("should update `aria-valuemin/max` when `min/max` changes dynamically", () => {
      scope.$apply("min = 25; max = 75");
      element = $compile(
        '<input type="range" ng-model="val" min="{{min}}" max="{{max}}" />',
      )(scope);
      expect(element.attr("aria-valuemin")).toBe("25");
      expect(element.attr("aria-valuemax")).toBe("75");

      scope.$apply("min = 0");
      expect(element.attr("aria-valuemin")).toBe("0");

      scope.$apply("max = 100");
      expect(element.attr("aria-valuemax")).toBe("100");
    });

    it("should update `aria-valuemin/max` when `ng-min/ng-max` changes dynamically", () => {
      scope.$apply("min = 25; max = 75");
      element = $compile(
        '<input type="range" ng-model="val" ng-min="min" ng-max="max" />',
      )(scope);
      expect(element.attr("aria-valuemin")).toBe("25");
      expect(element.attr("aria-valuemax")).toBe("75");

      scope.$apply("min = 0");
      expect(element.attr("aria-valuemin")).toBe("0");

      scope.$apply("max = 100");
      expect(element.attr("aria-valuemax")).toBe("100");
    });
  });

  describe("announcing ngMessages", () => {
    it("should attach aria-live", () => {
      const element = [
        $compile('<div ng-messages="myForm.myName.$error">')(scope),
      ];
      expectAriaAttrOnEachElement(element, "aria-live", "assertive");
    });
  });

  describe("aria-value when disabled", () => {
    beforeEach(() => {
      window.angular.module("test", [
        "ng",
        ($ariaProvider) => {
          $ariaProvider.config({
            ariaValue: false,
          });
        },
      ]);
      let injector = createInjector(["test"]);
      scope = injector.get("$rootScope");
      $compile = injector.get("$compile");
    });

    it("should not attach itself", () => {
      scope.$apply("val = 50");

      element = $compile(
        '<input type="range" ng-model="val" min="0" max="100">',
      )(scope);
      expect(element.attr("aria-valuenow")).toBeUndefined();
      expect(element.attr("aria-valuemin")).toBeUndefined();
      expect(element.attr("aria-valuemax")).toBeUndefined();

      element = $compile(
        '<div role="progressbar" min="0" max="100" ng-model="val">',
      )(scope);
      expect(element.attr("aria-valuenow")).toBeUndefined();
      expect(element.attr("aria-valuemin")).toBeUndefined();
      expect(element.attr("aria-valuemax")).toBeUndefined();
    });
  });

  describe("tabindex", () => {
    it("should not attach to native control $prop", () => {
      [
        "<button ng-click='something'></button>",
        "<a ng-href='#/something'>",
        "<input type='text' ng-model='val'>",
        "<input type='radio' ng-model='val'>",
        "<input type='checkbox' ng-model='val'>",
        "<textarea ng-model='val'></textarea>",
        "<select ng-model='val'></select>",
        "<details ng-model='val'></details>",
      ].forEach((html) => {
        element = $compile(html)(scope);
        expect(element.attr("tabindex")).toBeUndefined();
      });
    });

    it("should not attach to random ng-model elements", () => {
      element = $compile('<div ng-model="val"></div>')(scope);
      expect(element.attr("tabindex")).toBeUndefined();
    });

    it("should attach tabindex to custom inputs", () => {
      element = $compile('<div role="checkbox" ng-model="val"></div>')(scope);
      expect(element.attr("tabindex")).toBe("0");

      element = $compile('<div role="slider" ng-model="val"></div>')(scope);
      expect(element.attr("tabindex")).toBe("0");
    });

    it("should attach to ng-click and ng-dblclick", () => {
      element = $compile('<div ng-click="someAction()"></div>')(scope);
      expect(element.attr("tabindex")).toBe("0");

      element = $compile('<div ng-dblclick="someAction()"></div>')(scope);
      expect(element.attr("tabindex")).toBe("0");
    });

    it("should not attach tabindex if it is already on an element", () => {
      element = $compile('<div role="button" tabindex="userSetValue"></div>')(
        scope,
      );
      expect(element.attr("tabindex")).toBe("userSetValue");

      element = $compile('<div role="checkbox" tabindex="userSetValue"></div>')(
        scope,
      );
      expect(element.attr("tabindex")).toBe("userSetValue");

      element = $compile(
        '<div ng-click="someAction()" tabindex="userSetValue"></div>',
      )(scope);
      expect(element.attr("tabindex")).toBe("userSetValue");

      element = $compile(
        '<div ng-dblclick="someAction()" tabindex="userSetValue"></div>',
      )(scope);
      expect(element.attr("tabindex")).toBe("userSetValue");
    });
  });

  describe("actions when bindRoleForClick is set to false", () => {
    beforeEach(() => {
      window.angular.module("test", [
        "ng",
        ($ariaProvider) => {
          $ariaProvider.config({
            bindRoleForClick: false,
          });
        },
      ]);
      let injector = createInjector(["test"]);
      scope = injector.get("$rootScope");
      $compile = injector.get("$compile");
    });

    it("should not add a button role", () => {
      element = $compile('<radio-group ng-click="something"></radio-group>')(
        scope,
      );
      expect(element.attr("role")).toBeUndefined();
    });
  });

  describe("actions when bindKeydown is set to false", () => {
    beforeEach(() => {
      window.angular.module("test", [
        "ng",
        ($ariaProvider) => {
          $ariaProvider.config({
            bindKeydown: false,
          });
        },
      ]);
      let injector = createInjector(["test"]);
      scope = injector.get("$rootScope");
      $compile = injector.get("$compile");
    });

    it("should not trigger click", () => {
      scope.someAction = jasmine.createSpy("someAction");

      element = $compile('<div ng-click="someAction()" tabindex="0"></div>')(
        scope,
      );

      element.triggerHandler({ type: "keydown", keyCode: 13 });
      element.triggerHandler({ type: "keydown", keyCode: 32 });
      element.triggerHandler({ type: "keypress", keyCode: 13 });
      element.triggerHandler({ type: "keypress", keyCode: 32 });
      element.triggerHandler({ type: "keyup", keyCode: 13 });
      element.triggerHandler({ type: "keyup", keyCode: 32 });

      expect(scope.someAction).not.toHaveBeenCalled();

      element.triggerHandler({ type: "click", keyCode: 32 });

      expect(scope.someAction).toHaveBeenCalled();
    });
  });

  describe("tabindex when disabled", () => {
    beforeEach(() => {
      window.angular.module("test", [
        "ng",
        ($ariaProvider) => {
          $ariaProvider.config({
            tabindex: false,
          });
        },
      ]);
      let injector = createInjector(["test"]);
      scope = injector.get("$rootScope");
      $compile = injector.get("$compile");
    });

    it("should not add a tabindex attribute", () => {
      element = $compile('<div role="button"></div>')(scope);
      expect(element.attr("tabindex")).toBeUndefined();

      element = $compile('<div role="checkbox"></div>')(scope);
      expect(element.attr("tabindex")).toBeUndefined();

      element = $compile('<div ng-click="someAction()"></div>')(scope);
      expect(element.attr("tabindex")).toBeUndefined();

      element = $compile('<div ng-dblclick="someAction()"></div>')(scope);
      expect(element.attr("tabindex")).toBeUndefined();
    });
  });

  describe("ngModel", () => {
    it("should not break when manually compiling", () => {
      window.angular.module("test", [
        "ng",
        ($compileProvider) => {
          $compileProvider.directive("foo", () => ({
            priority: 10,
            terminal: true,
            link(scope, elem) {
              $compile(elem, null, 10)(scope);
            },
          }));
        },
      ]);
      let injector = createInjector(["test"]);
      scope = injector.get("$rootScope");
      $compile = injector.get("$compile");
      element = $compile('<div role="checkbox" ng-model="value" foo />')(scope);

      // Just check an arbitrary feature to make sure it worked
      expect(element.attr("tabindex")).toBe("0");
    });
  });

  function expectAriaAttrOnEachElement(elem, ariaAttr, expected) {
    elem.forEach((val) => {
      expect(val[0].getAttribute(ariaAttr)).toBe(expected);
    });
  }
});
