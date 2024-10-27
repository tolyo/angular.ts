import { isUndefined, trim } from "../../shared/utils";

/**
 * @returns {import('../../types').Directive}
 */
export function ngListDirective() {
  return {
    restrict: "A",
    priority: 100,
    require: "ngModel",
    link(_scope, _element, attr, ctrl) {
      const ngList = attr.ngList || ", ";
      const trimValues = attr.ngTrim !== "false";
      const separator = trimValues ? trim(ngList) : ngList;

      const parse = function (viewValue) {
        // If the viewValue is invalid (say required but empty) it will be `undefined`
        if (isUndefined(viewValue)) return;

        const list = [];

        if (viewValue) {
          viewValue.split(separator).forEach((value) => {
            if (value) list.push(trimValues ? trim(value) : value);
          });
        }

        return list;
      };

      ctrl["$parsers"].push(parse);
      ctrl["$formatters"].push((value) => {
        if (Array.isArray(value)) {
          return value.join(ngList);
        }

        return undefined;
      });

      // Override the standard $isEmpty because an empty array means the input is empty.
      ctrl["$isEmpty"] = function (value) {
        return !value || !value.length;
      };
    },
  };
}
