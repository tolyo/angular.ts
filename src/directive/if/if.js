import { domInsert } from "../../animations/animate";
import { getBlockNodes } from "../../shared/jqlite/jqlite.js";
import { hasAnimate } from "../../shared/utils";

ngIfDirective.$inject = ["$animate"];
/**
 *
 * TODO // Add type for animate service
 * @param {*}  $animate
 * @returns {import("../../types").Directive}
 */
export function ngIfDirective($animate) {
  return {
    multiElement: true,
    transclude: "element",
    priority: 600,
    terminal: true,
    restrict: "A",
    /**
     *
     * @param {import("../../core/scope/scope").Scope} $scope
     * @param {import("../../shared/jqlite/jqlite.js").JQLite} $element
     * @param {import("../../core/compile/attributes").Attributes} $attr
     * @param {Object} _ctrl
     * @param {*} $transclude
     */
    link($scope, $element, $attr, _ctrl, $transclude) {
      /** @type {{clone: import("../../shared/jqlite/jqlite.js").JQLite }} */
      let block;

      /** @type {import('../../core/scope/scope').Scope} */
      let childScope;
      /** @type {import("../../shared/jqlite/jqlite.js").JQLite} */
      let previousElements;

      $scope.$watch($attr["ngIf"], (value) => {
        if (value) {
          if (!childScope) {
            $transclude((clone, newScope) => {
              childScope = newScope;
              // TODO removing this breaks messages test
              clone[clone.length++] = document.createComment("");
              // Note: We only need the first/last node of the cloned nodes.
              // However, we need to keep the reference to the jqlite wrapper as it might be changed later
              // by a directive with templateUrl when its template arrives.
              block = {
                clone,
              };
              if (hasAnimate(clone[0])) {
                $animate.enter(clone, $element.parentElement, $element);
              } else {
                domInsert(clone, $element.parentElement, $element);
              }
            });
          }
        } else {
          if (previousElements) {
            previousElements.remove();
            previousElements = null;
          }
          if (childScope) {
            childScope.$destroy();
            childScope = null;
          }
          if (block) {
            previousElements = block.clone;
            if (hasAnimate(previousElements[0])) {
              $animate.leave(previousElements).done((response) => {
                if (response !== false) previousElements = null;
              });
            } else {
              previousElements.remove();
            }
            block = null;
          }
        }
      });
    },
  };
}
