/**
 * @returns {import('../../types.js').Directive}
 */
export function ngStyleDirective() {
  return {
    restrict: "EA",
    link: (scope, element, attr) => {
      scope.$watchCollection(attr.ngStyle, (newStyles, oldStyles) => {
        if (oldStyles) {
          const oldKeys = Object.keys(oldStyles);
          for (let i = 0, length = oldKeys.length; i < length; i++) {
            element[0].style[oldKeys[i]] = "";
          }
        }
        if (newStyles) {
          const newEntries = Object.entries(newStyles);
          for (let i = 0, length = newEntries.length; i < length; i++) {
            const [key, value] = newEntries[i];
            element[0].style[key] = value;
          }
        }
      });
    },
  };
}
