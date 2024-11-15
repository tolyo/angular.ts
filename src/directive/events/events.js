import { directiveNormalize } from "../../shared/utils";

/*
 * A collection of directives that allows creation of custom event handlers that are defined as
 * AngularJS expressions and are compiled and executed within the current scope.
 */
export const ngEventDirectives = {};

// For events that might fire synchronously during DOM manipulation
// we need to execute their event handlers asynchronously using $evalAsync,
// so that they are not executed in an inconsistent state.
const forceAsyncEvents = {
  blur: true,
  focus: true,
};

"click dblclick submit focus blur copy cut paste"
  .split(" ")
  .forEach((eventName) => {
    const directiveName = directiveNormalize(`ng-${eventName}`);
    ngEventDirectives[directiveName] = [
      "$parse",
      "$rootScope",
      "$exceptionHandler",
      /**
       *
       * @param {*} $parse
       * @param {*} $rootScope
       * @param {import('../../core/exception-handler').ErrorHandler} $exceptionHandler
       * @returns
       */
      ($parse, $rootScope, $exceptionHandler) => {
        return createEventDirective(
          $parse,
          $rootScope,
          $exceptionHandler,
          directiveName,
          eventName,
          forceAsyncEvents[eventName],
        );
      },
    ];
  });

export function createEventDirective(
  $parse,
  $rootScope,
  $exceptionHandler,
  directiveName,
  eventName,
  forceAsync,
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
        element.on(eventName, (event) => {
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
