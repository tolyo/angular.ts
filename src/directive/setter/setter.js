ngSetterDirective.$inject = ["$parse"];
/**
 * @returns {import('../../types.js').Directive}
 */
export function ngSetterDirective($parse) {
  return {
    restrict: "A",
    link(scope, element, attrs) {
      const modelExpression = attrs.ngSetter;

      if (!modelExpression) {
        console.warn("ngSetter: Model expression is not provided.");
        return;
      }

      const assignModel = $parse(modelExpression).assign;

      if (!assignModel) {
        console.warn("ngSetter: Invalid model expression.");
        return;
      }

      const updateModel = (value) => {
        assignModel(scope, value);
        scope.$digest();
      };

      const observer = new MutationObserver((mutationsList) => {
        let contentChanged = false;
        for (const mutation of mutationsList) {
          if (
            mutation.type === "childList" ||
            mutation.type === "characterData"
          ) {
            contentChanged = true;
            break;
          }
        }

        if (contentChanged) {
          updateModel(element[0].innerHTML);
        }
      });

      if (element && element[0]) {
        observer.observe(element[0], {
          childList: true,
          subtree: true,
          characterData: true,
        });
      } else {
        console.warn("ngSetter: Element is not a valid DOM node.");
        return;
      }

      scope.$on("$destroy", () => observer.disconnect());
      updateModel(element.innerHTML);
    },
  };
}
