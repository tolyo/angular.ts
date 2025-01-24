import { isUndefined, stringify } from "../../shared/utils";

/**
 * @returns {import('../../types.js').Directive}
 */
export function ngBindDirective() {
  return {
    restrict: "EA",
    link: (scope, element, attr) => {
      scope.$watch(attr.ngBind, (value) => {
        element.textContent = stringify(value);
      });
    },
  };
}

/**
 * @returns {import('../../types.js').Directive}
 */
export function ngBindTemplateDirective() {
  return {
    restrict: "EA",
    link: (_scope, element, attr) => {
      attr.$observe("ngBindTemplate", (value) => {
        element.textContent = isUndefined(value) ? "" : value;
      });
    },
  };
}

/**
 * TODO: add type
 */
export const ngBindHtmlDirective = [
  "$parse",
  ($parse) => {
    return {
      restrict: "A",
      compile: (_tElement, tAttrs) => {
        const ngBindHtmlGetter = $parse(tAttrs.ngBindHtml);
        const ngBindHtmlWatch = $parse(tAttrs.ngBindHtml, (val) => val);
        return (scope, element) => {
          scope.$watch(ngBindHtmlWatch, () => {
            // The watched value is the unwrapped value. To avoid re-escaping, use the direct getter.
            element.html(ngBindHtmlGetter(scope) || "");
          });
        };
      },
    };
  },
];
