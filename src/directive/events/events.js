import { onEvent } from "../../shared/jqlite/jqlite.js";
import { directiveNormalize } from "../../shared/utils.js";

/*
 * A collection of directives that allows creation of custom event handlers that are defined as
 * AngularJS expressions and are compiled and executed within the current scope.
 */
export const ngEventDirectives = {};

"click copy cut dblclick focus blur keydown keyup keypress load mouseover mousein mouseout mouseleave paste submit touchstart touchend touchmove"
  .split(" ")
  .forEach(
    /** @param { string } eventName */
    (eventName) => {
      const directiveName = directiveNormalize(`ng-${eventName}`);
      ngEventDirectives[directiveName] = [
        "$parse",
        "$exceptionHandler",
        /**
         * @param {import("../../core/parse/parse.js").ParseService} $parse
         * @param {import('../../core/exception-handler.js').ErrorHandler} $exceptionHandler
         * @returns
         */
        ($parse, $exceptionHandler) => {
          return createEventDirective(
            $parse,
            $exceptionHandler,
            directiveName,
            eventName,
          );
        },
      ];
    },
  );

/**
 *
 * @param {import("../../core/parse/parse.js").ParseService} $parse
 * @param {import('../../core/exception-handler.js').ErrorHandler} $exceptionHandler
 * @param {string} directiveName
 * @param {string} eventName
 * @returns {import("../../types.js").Directive}
 */
export function createEventDirective(
  $parse,
  $exceptionHandler,
  directiveName,
  eventName,
) {
  return {
    restrict: "A",
    compile(_element, attr) {
      // NOTE:
      // We expose the powerful `$event` object on the scope that provides access to the Window,
      // etc. This is OK, because expressions are not sandboxed any more (and the expression
      // sandbox was never meant to be a security feature anyway).
      const fn = $parse(attr[directiveName]);
      return function ngEventHandler(scope, element) {
        onEvent(element, eventName, (event) => {
          const callback = function () {
            fn(scope, { $event: event });
          };

          try {
            callback();
          } catch (error) {
            $exceptionHandler(error);
          }
        });
      };
    },
  };
}
