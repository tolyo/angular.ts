/**
 * @returns {import('../../types.js').Directive}
 */
export function ngNonBindableDirective() {
  return {
    restrict: "EA",
    terminal: true,
    priority: 1000,
  };
}
