scriptDirective.$inject = ["$templateCache"];

/**
 * @param {import('../../core/cache/cache-factory').TemplateCache} $templateCache
 * @returns {import('../../types.js').Directive}
 */
export function scriptDirective($templateCache) {
  return {
    restrict: "E",
    terminal: true,
    compile(element, attr) {
      if (attr.type === "text/ng-template") {
        $templateCache.set(attr.id, element[0].text);
      }
    },
  };
}
