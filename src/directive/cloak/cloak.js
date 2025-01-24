/**
 * @returns {import('../../types.js').Directive}
 */
export function ngCloakDirective() {
  return {
    restrict: "EA",
    compile(element, attr) {
      attr.$set("ngCloak", undefined);
      element.classList.remove("ng-cloak");
    },
  };
}
