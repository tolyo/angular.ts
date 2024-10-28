import { EventBus } from "../../core/pubsub/pubsub";

/**
 * Dynamically updates an element's content based on events published on a specified channel.
 * When the directive is applied, it listens for data sent via `EventBus` and
 * updates the inner HTML of the element accordingly.
 *
 * When the scope is destroyed, the directive automatically unsubscribes from the channel.
 *
 *
 * @returns {import("../../types").Directive}
 */
export function ngChannelDirective() {
  return {
    restrict: "EA",
    link: (scope, element, attrs) => {
      const targetElement = element[0];
      const channel = attrs["ngChannel"];

      const key = EventBus.subscribe(channel, (val) => {
        targetElement.innerHTML = val;
      });

      scope.$on("$destroy", () => {
        EventBus.unsubscribeByKey(key);
      });
    },
  };
}
