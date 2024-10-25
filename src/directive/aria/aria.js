import { extend } from "../../shared/utils";

const ARIA_DISABLE_ATTR = "ngAriaDisable";

/**
 * Internal Utilities
 */
const nativeAriaNodeNames = [
  "BUTTON",
  "A",
  "INPUT",
  "TEXTAREA",
  "SELECT",
  "DETAILS",
  "SUMMARY",
];

const isNodeOneOf = function (elem, nodeTypeArray) {
  if (nodeTypeArray.indexOf(elem[0].nodeName) !== -1) {
    return true;
  }
};

/**
 * Used for configuring the ARIA attributes injected and managed by ngAria.
 *
 * ```js
 * angular.module('myApp', ['ngAria'], function config($ariaProvider) {
 *   $ariaProvider.config({
 *     ariaValue: true,
 *     tabindex: false
 *   });
 * });
 *```
 *
 * ## Dependencies
 * Requires the {@link ngAria} module to be installed.
 *
 */
export function AriaProvider() {
  let config = {
    ariaHidden: true,
    ariaChecked: true,
    ariaReadonly: true,
    ariaDisabled: true,
    ariaRequired: true,
    ariaInvalid: true,
    ariaValue: true,
    tabindex: true,
    bindKeydown: true,
    bindRoleForClick: true,
  };

  this.config = function (newConfig) {
    config = extend(config, newConfig);
  };

  function watchExpr(attrName, ariaAttr, nativeAriaNodeNames, negate) {
    return function (scope, elem, attr) {
      if (Object.prototype.hasOwnProperty.call(attr, ARIA_DISABLE_ATTR)) return;

      const ariaCamelName = attr.$normalize(ariaAttr);
      if (
        config[ariaCamelName] &&
        !isNodeOneOf(elem, nativeAriaNodeNames) &&
        !attr[ariaCamelName]
      ) {
        scope.$watch(attr[attrName], (boolVal) => {
          // ensure boolean value
          boolVal = negate ? !boolVal : !!boolVal;
          elem.attr(ariaAttr, boolVal);
        });
      }
    };
  }

  this.$get = function () {
    return {
      config(key) {
        return config[key];
      },
      $$watchExpr: watchExpr,
    };
  };
}

ngDisabledAriaDirective.$inject = ["$aria"];
export function ngDisabledAriaDirective($aria) {
  return $aria.$$watchExpr(
    "ngDisabled",
    "aria-disabled",
    nativeAriaNodeNames,
    false,
  );
}

ngShowAriaDirective.$inject = ["$aria"];
export function ngShowAriaDirective($aria) {
  return $aria.$$watchExpr("ngShow", "aria-hidden", [], true);
}

export function ngMessagesAriaDirective() {
  return {
    restrict: "A",
    require: "?ngMessages",
    link(_scope, elem, attr) {
      if (Object.prototype.hasOwnProperty.call(attr, ARIA_DISABLE_ATTR)) return;

      if (!elem.attr("aria-live")) {
        elem.attr("aria-live", "assertive");
      }
    },
  };
}

ngClickAriaDirective.$inject = ["$aria", "$parse"];
export function ngClickAriaDirective($aria, $parse) {
  return {
    restrict: "A",
    compile(elem, attr) {
      if (Object.prototype.hasOwnProperty.call(attr, ARIA_DISABLE_ATTR)) return;

      const fn = $parse(attr.ngClick);
      return function (scope, elem, attr) {
        if (!isNodeOneOf(elem, nativeAriaNodeNames)) {
          if ($aria.config("bindRoleForClick") && !elem.attr("role")) {
            elem.attr("role", "button");
          }

          if ($aria.config("tabindex") && !elem.attr("tabindex")) {
            elem.attr("tabindex", 0);
          }

          if (
            $aria.config("bindKeydown") &&
            !attr.ngKeydown &&
            !attr.ngKeypress &&
            !attr.ngKeyup
          ) {
            elem.on("keydown", (event) => {
              const keyCode = event.which || event.keyCode;

              if (keyCode === 13 || keyCode === 32) {
                // If the event is triggered on a non-interactive element ...
                if (
                  nativeAriaNodeNames.indexOf(event.target.nodeName) === -1 &&
                  !event.target.isContentEditable
                ) {
                  // ... prevent the default browser behavior (e.g. scrolling when pressing spacebar)
                  // See https://github.com/angular/angular.js/issues/16664
                  event.preventDefault();
                }
                scope.$apply(callback);
              }

              function callback() {
                fn(scope, { $event: event });
              }
            });
          }
        }
      };
    },
  };
}

ngRequiredAriaDirective.$inject = ["$aria"];
export function ngRequiredAriaDirective($aria) {
  return $aria.$$watchExpr(
    "ngRequired",
    "aria-required",
    nativeAriaNodeNames,
    false,
  );
}

ngCheckedAriaDirective.$inject = ["$aria"];
export function ngCheckedAriaDirective($aria) {
  return $aria.$$watchExpr(
    "ngChecked",
    "aria-checked",
    nativeAriaNodeNames,
    false,
  );
}

ngValueAriaDirective.$inject = ["$aria"];
export function ngValueAriaDirective($aria) {
  return $aria.$$watchExpr(
    "ngValue",
    "aria-checked",
    nativeAriaNodeNames,
    false,
  );
}

ngHideAriaDirective.$inject = ["$aria"];
export function ngHideAriaDirective($aria) {
  return $aria.$$watchExpr("ngHide", "aria-hidden", [], false);
}

ngReadonlyAriaDirective.$inject = ["$aria"];
export function ngReadonlyAriaDirective($aria) {
  return $aria.$$watchExpr(
    "ngReadonly",
    "aria-readonly",
    nativeAriaNodeNames,
    false,
  );
}

ngModelAriaDirective.$inject = ["$aria"];
export function ngModelAriaDirective($aria) {
  function shouldAttachAttr(attr, normalizedAttr, elem, allowNonAriaNodes) {
    return (
      $aria.config(normalizedAttr) &&
      !elem.attr(attr) &&
      (allowNonAriaNodes || !isNodeOneOf(elem, nativeAriaNodeNames)) &&
      (elem.attr("type") !== "hidden" || elem[0].nodeName !== "INPUT")
    );
  }

  function shouldAttachRole(role, elem) {
    // if element does not have role attribute
    // AND element type is equal to role (if custom element has a type equaling shape) <-- remove?
    // AND element is not in nativeAriaNodeNames
    return (
      !elem.attr("role") &&
      elem.attr("type") === role &&
      !isNodeOneOf(elem, nativeAriaNodeNames)
    );
  }

  function getShape(attr) {
    const { type } = attr;
    const { role } = attr;

    return (type || role) === "checkbox" || role === "menuitemcheckbox"
      ? "checkbox"
      : (type || role) === "radio" || role === "menuitemradio"
        ? "radio"
        : type === "range" || role === "progressbar" || role === "slider"
          ? "range"
          : "";
  }

  return {
    restrict: "A",
    require: "ngModel",
    priority: 200, // Make sure watches are fired after any other directives that affect the ngModel value
    compile(elem, attr) {
      if (Object.prototype.hasOwnProperty.call(attr, ARIA_DISABLE_ATTR)) return;

      const shape = getShape(attr);

      return {
        post(scope, elem, attr, ngModel) {
          const needsTabIndex = shouldAttachAttr(
            "tabindex",
            "tabindex",
            elem,
            false,
          );

          function ngAriaWatchModelValue() {
            return ngModel.$modelValue;
          }

          function getRadioReaction() {
            // Strict comparison would cause a BC
            elem[0].setAttribute(
              "aria-checked",
              (attr.value == ngModel.$viewValue).toString(),
            );
          }

          function getCheckboxReaction() {
            elem.attr(
              "aria-checked",
              (!ngModel.$isEmpty(ngModel.$viewValue)).toString(),
            );
          }

          switch (shape) {
            case "radio":
            case "checkbox":
              if (shouldAttachRole(shape, elem)) {
                elem.attr("role", shape);
              }
              if (
                shouldAttachAttr("aria-checked", "ariaChecked", elem, false)
              ) {
                scope.$watch(
                  ngAriaWatchModelValue,
                  shape === "radio" ? getRadioReaction : getCheckboxReaction,
                );
              }
              if (needsTabIndex) {
                elem.attr("tabindex", 0);
              }
              break;
            case "range":
              if (shouldAttachRole(shape, elem)) {
                elem.attr("role", "slider");
              }
              if ($aria.config("ariaValue")) {
                const needsAriaValuemin =
                  !elem.attr("aria-valuemin") &&
                  (Object.prototype.hasOwnProperty.call(attr, "min") ||
                    Object.prototype.hasOwnProperty.call(attr, "ngMin"));
                const needsAriaValuemax =
                  !elem.attr("aria-valuemax") &&
                  (Object.prototype.hasOwnProperty.call(attr, "max") ||
                    Object.prototype.hasOwnProperty.call(attr, "ngMax"));
                const needsAriaValuenow = !elem.attr("aria-valuenow");

                if (needsAriaValuemin) {
                  attr.$observe("min", (newVal) => {
                    elem.attr("aria-valuemin", newVal);
                  });
                }
                if (needsAriaValuemax) {
                  attr.$observe("max", (newVal) => {
                    elem.attr("aria-valuemax", newVal);
                  });
                }
                if (needsAriaValuenow) {
                  scope.$watch(ngAriaWatchModelValue, (newVal) => {
                    elem.attr("aria-valuenow", newVal);
                  });
                }
              }
              if (needsTabIndex) {
                elem.attr("tabindex", 0);
              }
              break;
          }

          if (
            !Object.prototype.hasOwnProperty.call(attr, "ngRequired") &&
            ngModel.$validators.required &&
            shouldAttachAttr("aria-required", "ariaRequired", elem, false)
          ) {
            // ngModel.$error.required is undefined on custom controls
            attr.$observe("required", () => {
              elem.attr("aria-required", (!!attr.required).toString());
            });
          }

          if (shouldAttachAttr("aria-invalid", "ariaInvalid", elem, true)) {
            scope.$watch("ngModel.$invalid", (newVal) => {
              elem.attr("aria-invalid", (!!newVal).toString());
            });
          }
        },
      };
    },
  };
}

ngDblclickAriaDirective.$inject = ["$aria"];
export function ngDblclickAriaDirective($aria) {
  return function (scope, elem, attr) {
    if (Object.prototype.hasOwnProperty.call(attr, ARIA_DISABLE_ATTR)) return;

    if (
      $aria.config("tabindex") &&
      !elem.attr("tabindex") &&
      !isNodeOneOf(elem, nativeAriaNodeNames)
    ) {
      elem.attr("tabindex", 0);
    }
  };
}
