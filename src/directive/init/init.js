/**
 * @returns {import('../../types').Directive}
 */
export function ngInitDirective() {
  return {
    priority: 450,
    compile() {
      return {
        pre(scope, element, attrs) {
          if (element.controller()) {
            element.controller().$eval(attrs.ngInit);
          } else {
            scope.$eval(attrs.ngInit);
          }
        },
      };
    },
  };
}
