/**
 * @returns {import("../../types").Directive}
 */
export function ngObserveDirective() {
  return {
    restrict: "A",
    link: (scope, element, attrs) => {
      const targetElement = element[0];
      const prop = targetElement.dataset["update"];
      const source = attrs["ngObserve"];

      if (!scope[prop]) {
        scope[prop] = targetElement.getAttribute(source);
      }

      const observer = new MutationObserver((mutations) => {
        const mutation = mutations[0];
        const newValue = /** @type {HTMLElement} */ (
          mutation.target
        ).getAttribute(source);
        if (scope[prop] !== newValue) {
          scope[prop] = newValue;
          ;
        }
      });

      observer.observe(targetElement, {
        attributes: true,
        attributeFilter: [source],
      });

      scope.$on("$destroy", () => {
        observer.disconnect();
      });
    },
  };
}
