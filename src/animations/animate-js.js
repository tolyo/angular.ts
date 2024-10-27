import { isObject, isFunction } from "../shared/utils";
import {
  applyAnimationClassesFactory,
  applyAnimationStyles,
  prepareAnimationOptions,
} from "./shared";

// TODO: use caching here to speed things up for detection
// TODO: add documentation

AnimateJsProvider.$inject = ["$animateProvider"];
export function AnimateJsProvider($animateProvider) {
  this.$get = [
    "$injector",
    "$$AnimateRunner",
    /**
     *
     * @param {import("../core/di/internal-injector").InjectorService} $injector
     * @param {*} $$AnimateRunner
     * @returns
     */
    function ($injector, $$AnimateRunner) {
      const applyAnimationClasses = applyAnimationClassesFactory();
      // $animateJs(element, 'enter');
      return function (element, event, classes, options) {
        let animationClosed = false;

        // the `classes` argument is optional and if it is not used
        // then the classes will be resolved from the element's className
        // property as well as options.addClass/options.removeClass.
        if (arguments.length === 3 && isObject(classes)) {
          options = classes;
          classes = null;
        }

        options = prepareAnimationOptions(options);
        if (!classes) {
          classes = element.attr("class") || "";
          if (options.addClass) {
            classes += ` ${options.addClass}`;
          }
          if (options.removeClass) {
            classes += ` ${options.removeClass}`;
          }
        }

        const classesToAdd = options.addClass;
        const classesToRemove = options.removeClass;

        // the lookupAnimations function returns a series of animation objects that are
        // matched up with one or more of the CSS classes. These animation objects are
        // defined via the module.animation factory function. If nothing is detected then
        // we don't return anything which then makes $animation query the next driver.
        const animations = lookupAnimations(classes);
        let before;
        let after;
        if (animations.length) {
          let afterFn;
          let beforeFn;
          if (event === "leave") {
            beforeFn = "leave";
            afterFn = "afterLeave"; // TODO(matsko): get rid of this
          } else {
            beforeFn = `before${event.charAt(0).toUpperCase()}${event.substr(1)}`;
            afterFn = event;
          }

          if (event !== "enter" && event !== "move") {
            before = packageAnimations(
              element,
              event,
              options,
              animations,
              beforeFn,
            );
          }
          after = packageAnimations(
            element,
            event,
            options,
            animations,
            afterFn,
          );
        }

        // no matching animations
        if (!before && !after) return;

        function applyOptions() {
          options.domOperation();
          applyAnimationClasses(element, options);
        }

        function close() {
          animationClosed = true;
          applyOptions();
          applyAnimationStyles(element, options);
        }

        let runner;

        return {
          $$willAnimate: true,
          end() {
            if (runner) {
              runner.end();
            } else {
              close();
              runner = new $$AnimateRunner();
              runner.complete(true);
            }
            return runner;
          },
          start() {
            if (runner) {
              return runner;
            }

            runner = new $$AnimateRunner();
            let closeActiveAnimations;
            const chain = [];

            if (before) {
              chain.push((fn) => {
                closeActiveAnimations = before(fn);
              });
            }

            if (chain.length) {
              chain.push((fn) => {
                applyOptions();
                fn(true);
              });
            } else {
              applyOptions();
            }

            if (after) {
              chain.push((fn) => {
                closeActiveAnimations = after(fn);
              });
            }

            runner.setHost({
              end() {
                endAnimations();
              },
              cancel() {
                endAnimations(true);
              },
            });

            $$AnimateRunner.chain(chain, onComplete);
            return runner;

            function onComplete(success) {
              close();
              runner.complete(success);
            }

            function endAnimations(cancelled) {
              if (!animationClosed) {
                (closeActiveAnimations || (() => {}))(cancelled);
                onComplete(cancelled);
              }
            }
          },
        };

        function executeAnimationFn(fn, element, event, options, onDone) {
          let args;
          switch (event) {
            case "animate":
              args = [element, options.from, options.to, onDone];
              break;

            case "setClass":
              args = [element, classesToAdd, classesToRemove, onDone];
              break;

            case "addClass":
              args = [element, classesToAdd, onDone];
              break;

            case "removeClass":
              args = [element, classesToRemove, onDone];
              break;

            default:
              args = [element, onDone];
              break;
          }

          args.push(options);

          let value = fn.apply(fn, args);
          if (value) {
            if (isFunction(value.start)) {
              value = value.start();
            }

            if (value instanceof $$AnimateRunner) {
              value.done(onDone);
            } else if (isFunction(value)) {
              // optional onEnd / onCancel callback
              return value;
            }
          }

          return () => {};
        }

        function groupEventedAnimations(
          element,
          event,
          options,
          animations,
          fnName,
        ) {
          const operations = [];
          animations.forEach((ani) => {
            const animation = ani[fnName];
            if (!animation) return;

            // note that all of these animations will run in parallel
            operations.push(() => {
              let runner;
              let endProgressCb;

              let resolved = false;
              const onAnimationComplete = function (rejected) {
                if (!resolved) {
                  resolved = true;
                  (endProgressCb || (() => {}))(rejected);
                  runner.complete(!rejected);
                }
              };

              runner = new $$AnimateRunner({
                end() {
                  onAnimationComplete();
                },
                cancel() {
                  onAnimationComplete(true);
                },
              });

              endProgressCb = executeAnimationFn(
                animation,
                element,
                event,
                options,
                (result) => {
                  const cancelled = result === false;
                  onAnimationComplete(cancelled);
                },
              );

              return runner;
            });
          });

          return operations;
        }

        function packageAnimations(
          element,
          event,
          options,
          animations,
          fnName,
        ) {
          let operations = groupEventedAnimations(
            element,
            event,
            options,
            animations,
            fnName,
          );
          if (operations.length === 0) {
            let a;
            let b;
            if (fnName === "beforeSetClass") {
              a = groupEventedAnimations(
                element,
                "removeClass",
                options,
                animations,
                "beforeRemoveClass",
              );
              b = groupEventedAnimations(
                element,
                "addClass",
                options,
                animations,
                "beforeAddClass",
              );
            } else if (fnName === "setClass") {
              a = groupEventedAnimations(
                element,
                "removeClass",
                options,
                animations,
                "removeClass",
              );
              b = groupEventedAnimations(
                element,
                "addClass",
                options,
                animations,
                "addClass",
              );
            }

            if (a) {
              operations = operations.concat(a);
            }
            if (b) {
              operations = operations.concat(b);
            }
          }

          if (operations.length === 0) return;

          // TODO(matsko): add documentation
          return function startAnimation(callback) {
            const runners = [];
            if (operations.length) {
              operations.forEach((animateFn) => {
                runners.push(animateFn());
              });
            }

            if (runners.length) {
              $$AnimateRunner.all(runners, callback);
            } else {
              callback();
            }

            return function endFn(reject) {
              runners.forEach((runner) => {
                if (reject) {
                  runner.cancel();
                } else {
                  runner.end();
                }
              });
            };
          };
        }
      };

      function lookupAnimations(classes) {
        classes = Array.isArray(classes) ? classes : classes.split(" ");
        const matches = [];
        const flagMap = {};
        for (let i = 0; i < classes.length; i++) {
          const klass = classes[i];
          const animationFactory =
            $animateProvider.$$registeredAnimations[klass];
          if (animationFactory && !flagMap[klass]) {
            matches.push($injector.get(animationFactory));
            flagMap[klass] = true;
          }
        }
        return matches;
      }
    },
  ];
}
