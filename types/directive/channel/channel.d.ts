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
export function ngChannelDirective(): import("../../types").Directive;
