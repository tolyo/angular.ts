import { hasAnimate, isBoolean, isString } from "../../shared/utils";

const NG_HIDE_CLASS = "ng-hide";
const NG_HIDE_IN_PROGRESS_CLASS = "ng-hide-animate";

ngShowDirective.$inject = ["$animate"];
/**
 * @returns {import('../../types').Directive}
 */
export function ngShowDirective($animate) {
  return {
    restrict: "A",
    multiElement: true,
    link(scope, element, $attr) {
      scope.$watch($attr["ngShow"], (value) => {
        const truthyValue = convertValue(value);
        // we're adding a temporary, animation-specific class for ng-hide since this way
        // we can control when the element is actually displayed on screen without having
        // to have a global/greedy CSS selector that breaks when other animations are run.
        // Read: https://github.com/angular/angular.js/issues/9103#issuecomment-58335845
        if (hasAnimate(element[0])) {
          $animate[value ? "removeClass" : "addClass"](element, NG_HIDE_CLASS, {
            tempClasses: NG_HIDE_IN_PROGRESS_CLASS,
          });
        } else {
          scope.$postUpdate(() => {
            if (truthyValue) {
              element
                .elements()
                .forEach((element) => element.classList.remove(NG_HIDE_CLASS));
            } else {
              element
                .elements()
                .forEach((element) => element.classList.add(NG_HIDE_CLASS));
            }
          });
        }
      });
    },
  };
}

ngHideDirective.$inject = ["$animate"];
/**
 * @returns {import('../../types').Directive}
 */
export function ngHideDirective($animate) {
  return {
    restrict: "A",
    multiElement: true,
    link(scope, element, attr) {
      scope.$watch(attr["ngHide"], (value) => {
        const truthyValue = !convertValue(value);
        // The comment inside of the ngShowDirective explains why we add and
        // remove a temporary class for the show/hide animation
        if (hasAnimate(element[0])) {
          $animate[value ? "addClass" : "removeClass"](element, NG_HIDE_CLASS, {
            tempClasses: NG_HIDE_IN_PROGRESS_CLASS,
          });
        } else {
          scope.$postUpdate(() => {
            if (truthyValue) {
              element
                .elements()
                .forEach((element) => element.classList.add(NG_HIDE_CLASS));
            } else {
              element
                .elements()
                .forEach((element) => element.classList.remove(NG_HIDE_CLASS));
            }
          });
        }
      });
    },
  };
}

function convertValue(val) {
  if (isBoolean(val)) return val;
  if (isString(val)) {
    switch (val) {
      case "false":
      case "":
        return false;
      default:
        return true;
    }
  }
  return !!val;
}
