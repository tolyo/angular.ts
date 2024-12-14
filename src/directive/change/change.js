/**
 * @returns {import('../../types.js').Directive}
 */
export function ngChangeDirective() {
  return {
    restrict: "A",
    require: "ngModel",
    link(scope, _element, attr, ctrl) {
      /** @type {import('../../types.js').NgModelController} */ (
        ctrl
      ).$viewChangeListeners.push(() => scope.$eval(attr.ngChange));
    },
  };
}
