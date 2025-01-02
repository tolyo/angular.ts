import { JQLite } from "../shared/jqlite/jqlite.js";
import { mergeClasses } from "../shared/utils";
import {
  NG_ANIMATE_CLASSNAME,
  PREPARE_CLASS_SUFFIX,
  applyAnimationClassesFactory,
  applyAnimationStyles,
  getDomNode,
  prepareAnimationOptions,
} from "./shared";

const RUNNER_STORAGE_KEY = "$$animationRunner";
const PREPARE_CLASSES_KEY = "$$animatePrepareClasses";

export function AnimationProvider() {
  const NG_ANIMATE_REF_ATTR = "ng-animate-ref";

  const drivers = (this.drivers = []);

  function setRunner(element, runner) {
    element.data(RUNNER_STORAGE_KEY, runner);
  }

  function removeRunner(element) {
    element.removeData(RUNNER_STORAGE_KEY);
  }

  function getRunner(element) {
    return element.data(RUNNER_STORAGE_KEY);
  }

  this.$get = [
    "$rootScope",
    "$injector",
    "$$AnimateRunner",
    "$$rAFScheduler",
    "$$animateCache",
    /**
     *
     * @param {*} $rootScope
     * @param {import("../core/di/internal-injector").InjectorService} $injector
     * @param {*} $$AnimateRunner
     * @param {import("./raf-scheduler").RafScheduler} $$rAFScheduler
     * @param {*} $$animateCache
     * @returns
     */
    function (
      $rootScope,
      $injector,
      $$AnimateRunner,
      $$rAFScheduler,
      $$animateCache,
    ) {
      const animationQueue = [];
      const applyAnimationClasses = applyAnimationClassesFactory();

      function sortAnimations(animations) {
        const tree = { children: [] };
        let i;
        const lookup = new Map();

        // this is done first beforehand so that the map
        // is filled with a list of the elements that will be animated

        for (i = 0; i < animations.length; i++) {
          const animation = animations[i];
          lookup.set(
            animation.domNode,
            (animations[i] = {
              domNode: animation.domNode,
              element: animation.element,
              fn: animation.fn,
              children: [],
            }),
          );
        }

        for (i = 0; i < animations.length; i++) {
          processNode(animations[i]);
        }

        return flatten(tree);

        function processNode(entry) {
          if (entry.processed) return entry;
          entry.processed = true;

          const elementNode = entry.domNode;
          let { parentNode } = elementNode;
          lookup.set(elementNode, entry);

          let parentEntry;
          while (parentNode) {
            parentEntry = lookup.get(parentNode);
            if (parentEntry) {
              if (!parentEntry.processed) {
                parentEntry = processNode(parentEntry);
              }
              break;
            }
            parentNode = parentNode.parentNode;
          }

          (parentEntry || tree).children.push(entry);
          return entry;
        }

        function flatten(tree) {
          const result = [];
          const queue = [];
          let i;

          for (i = 0; i < tree.children.length; i++) {
            queue.push(tree.children[i]);
          }

          let remainingLevelEntries = queue.length;
          let nextLevelEntries = 0;
          let row = [];

          for (i = 0; i < queue.length; i++) {
            const entry = queue[i];
            if (remainingLevelEntries <= 0) {
              remainingLevelEntries = nextLevelEntries;
              nextLevelEntries = 0;
              result.push(row);
              row = [];
            }
            row.push(entry);
            entry.children.forEach((childEntry) => {
              nextLevelEntries++;
              queue.push(childEntry);
            });
            remainingLevelEntries--;
          }

          if (row.length) {
            result.push(row);
          }

          return result;
        }
      }

      // TODO(matsko): document the signature in a better way
      return function (element, event, options) {
        options = prepareAnimationOptions(options);
        const isStructural = ["enter", "move", "leave"].indexOf(event) >= 0;

        // there is no animation at the current moment, however
        // these runner methods will get later updated with the
        // methods leading into the driver's end/cancel methods
        // for now they just stop the animation from starting
        const runner = new $$AnimateRunner({
          end() {
            close();
          },
          cancel() {
            close(true);
          },
        });

        if (!drivers.length) {
          close();
          return runner;
        }

        let classes = mergeClasses(
          element.attr("class"),
          mergeClasses(options.addClass, options.removeClass),
        );
        let { tempClasses } = options;
        if (tempClasses) {
          classes += ` ${tempClasses}`;
          options.tempClasses = null;
        }

        if (isStructural) {
          element.data(
            PREPARE_CLASSES_KEY,
            `ng-${event}${PREPARE_CLASS_SUFFIX}`,
          );
        }

        setRunner(element, runner);

        animationQueue.push({
          // this data is used by the postDigest code and passed into
          // the driver step function
          element,
          classes,
          event,
          structural: isStructural,
          options,
          beforeStart,
          close,
        });

        element.on("$destroy", handleDestroyedElement);

        // we only want there to be one function called within the post digest
        // block. This way we can group animations for all the animations that
        // were apart of the same postDigest flush call.
        if (animationQueue.length > 1) return runner;

        $rootScope.$postUpdate(() => {
          const animations = [];
          animationQueue.forEach((entry) => {
            // the element was destroyed early on which removed the runner
            // form its storage. This means we can't animate this element
            // at all and it already has been closed due to destruction.
            if (getRunner(entry.element)) {
              animations.push(entry);
            } else {
              entry.close();
            }
          });

          // now any future animations will be in another postDigest
          animationQueue.length = 0;

          const groupedAnimations = groupAnimations(animations);
          const toBeSortedAnimations = [];

          groupedAnimations.forEach((animationEntry) => {
            const element = animationEntry.from
              ? animationEntry.from.element
              : animationEntry.element;
            let extraClasses = options.addClass;

            extraClasses =
              (extraClasses ? `${extraClasses} ` : "") + NG_ANIMATE_CLASSNAME;
            const cacheKey = $$animateCache.cacheKey(
              element[0],
              animationEntry.event,
              extraClasses,
              options.removeClass,
            );

            toBeSortedAnimations.push({
              element,
              domNode: getDomNode(element),
              fn: function triggerAnimationStart() {
                let startAnimationFn;
                const closeFn = animationEntry.close;

                // in the event that we've cached the animation status for this element
                // and it's in fact an invalid animation (something that has duration = 0)
                // then we should skip all the heavy work from here on
                if (
                  $$animateCache.containsCachedAnimationWithoutDuration(
                    cacheKey,
                  )
                ) {
                  closeFn();
                  return;
                }

                // it's important that we apply the `ng-animate` CSS class and the
                // temporary classes before we do any driver invoking since these
                // CSS classes may be required for proper CSS detection.
                animationEntry.beforeStart();

                // in the event that the element was removed before the digest runs or
                // during the RAF sequencing then we should not trigger the animation.
                const targetElement = animationEntry.anchors
                  ? animationEntry.from.element || animationEntry.to.element
                  : animationEntry.element;

                if (getRunner(targetElement)) {
                  const operation = invokeFirstDriver(animationEntry);
                  if (operation) {
                    startAnimationFn = operation.start;
                  }
                }

                if (!startAnimationFn) {
                  closeFn();
                } else {
                  const animationRunner = startAnimationFn();
                  animationRunner.done((status) => {
                    closeFn(!status);
                  });
                  updateAnimationRunners(animationEntry, animationRunner);
                }
              },
            });
          });

          // we need to sort each of the animations in order of parent to child
          // relationships. This ensures that the child classes are applied at the
          // right time.
          const finalAnimations = sortAnimations(toBeSortedAnimations);
          for (let i = 0; i < finalAnimations.length; i++) {
            const innerArray = finalAnimations[i];
            for (let j = 0; j < innerArray.length; j++) {
              const entry = innerArray[j];
              const { element } = entry;

              // the RAFScheduler code only uses functions
              finalAnimations[i][j] = entry.fn;

              // the first row of elements shouldn't have a prepare-class added to them
              // since the elements are at the top of the animation hierarchy and they
              // will be applied without a RAF having to pass...
              if (i === 0) {
                element.removeData(PREPARE_CLASSES_KEY);
                continue;
              }

              const prepareClassName = element.data(PREPARE_CLASSES_KEY);
              if (prepareClassName) {
                element[0].classList.add(prepareClassName);
              }
            }
          }
          $$rAFScheduler(finalAnimations);
        });

        return runner;

        // TODO(matsko): change to reference nodes
        function getAnchorNodes(node) {
          const SELECTOR = `[${NG_ANIMATE_REF_ATTR}]`;
          const items = node.hasAttribute(NG_ANIMATE_REF_ATTR)
            ? [node]
            : node.querySelectorAll(SELECTOR);
          const anchors = [];
          items.forEach((node) => {
            const attr = node.getAttribute(NG_ANIMATE_REF_ATTR);
            if (attr && attr.length) {
              anchors.push(node);
            }
          });
          return anchors;
        }

        function groupAnimations(animations) {
          const preparedAnimations = [];
          const refLookup = {};
          animations.forEach((animation, index) => {
            const { element } = animation;
            const node = getDomNode(element);
            const { event } = animation;
            const enterOrMove = ["enter", "move"].indexOf(event) >= 0;
            const anchorNodes = animation.structural
              ? getAnchorNodes(node)
              : [];

            if (anchorNodes.length) {
              const direction = enterOrMove ? "to" : "from";

              anchorNodes.forEach((anchor) => {
                const key = anchor.getAttribute(NG_ANIMATE_REF_ATTR);
                refLookup[key] = refLookup[key] || {};
                refLookup[key][direction] = {
                  animationID: index,
                  element: JQLite(anchor),
                };
              });
            } else {
              preparedAnimations.push(animation);
            }
          });

          const usedIndicesLookup = {};
          const anchorGroups = {};
          Object.values(refLookup).forEach((operations) => {
            const { from } = operations;
            const { to } = operations;

            if (!from || !to) {
              // only one of these is set therefore we can't have an
              // anchor animation since all three pieces are required
              const index = from ? from.animationID : to.animationID;
              const indexKey = index.toString();
              if (!usedIndicesLookup[indexKey]) {
                usedIndicesLookup[indexKey] = true;
                preparedAnimations.push(animations[index]);
              }
              return;
            }

            const fromAnimation = animations[from.animationID];
            const toAnimation = animations[to.animationID];
            const lookupKey = from.animationID.toString();
            if (!anchorGroups[lookupKey]) {
              const group = (anchorGroups[lookupKey] = {
                structural: true,
                beforeStart() {
                  fromAnimation.beforeStart();
                  toAnimation.beforeStart();
                },
                close() {
                  fromAnimation.close();
                  toAnimation.close();
                },
                classes: cssClassesIntersection(
                  fromAnimation.classes,
                  toAnimation.classes,
                ),
                from: fromAnimation,
                to: toAnimation,
                anchors: [], // TODO(matsko): change to reference nodes
              });

              // the anchor animations require that the from and to elements both have at least
              // one shared CSS class which effectively marries the two elements together to use
              // the same animation driver and to properly sequence the anchor animation.
              if (group.classes.length) {
                preparedAnimations.push(group);
              } else {
                preparedAnimations.push(fromAnimation);
                preparedAnimations.push(toAnimation);
              }
            }

            anchorGroups[lookupKey].anchors.push({
              out: from.element,
              in: to.element,
            });
          });

          return preparedAnimations;
        }

        function cssClassesIntersection(a, b) {
          a = a.split(" ");
          b = b.split(" ");
          const matches = [];

          for (let i = 0; i < a.length; i++) {
            const aa = a[i];
            if (aa.substring(0, 3) === "ng-") continue;

            for (let j = 0; j < b.length; j++) {
              if (aa === b[j]) {
                matches.push(aa);
                break;
              }
            }
          }

          return matches.join(" ");
        }

        function invokeFirstDriver(animationDetails) {
          // we loop in reverse order since the more general drivers (like CSS and JS)
          // may attempt more elements, but custom drivers are more particular
          for (let i = drivers.length - 1; i >= 0; i--) {
            const driverName = drivers[i];
            const factory = $injector.get(driverName);
            const driver = factory(animationDetails);
            if (driver) {
              return driver;
            }
          }
        }

        function beforeStart() {
          tempClasses =
            (tempClasses ? `${tempClasses} ` : "") + NG_ANIMATE_CLASSNAME;
          element.className += ` ${tempClasses}`;
          let prepareClassName = element.data(PREPARE_CLASSES_KEY);
          if (prepareClassName) {
            element[0].classList.remove(prepareClassName);
            prepareClassName = null;
          }
        }

        function updateAnimationRunners(animation, newRunner) {
          if (animation.from && animation.to) {
            update(animation.from.element);
            update(animation.to.element);
          } else {
            update(animation.element);
          }

          function update(element) {
            const runner = getRunner(element);
            if (runner) runner.setHost(newRunner);
          }
        }

        function handleDestroyedElement() {
          const runner = getRunner(element);
          if (runner && (event !== "leave" || !options.$$domOperationFired)) {
            runner.end();
          }
        }

        function close(rejected) {
          element.off("$destroy", handleDestroyedElement);
          removeRunner(element);

          applyAnimationClasses(element, options);
          applyAnimationStyles(element, options);
          options.domOperation();

          if (tempClasses) {
            tempClasses
              .split(" ")
              .forEach((cls) => element[0].classList.remove(cls));
          }

          runner.complete(!rejected);
        }
      };
    },
  ];
}
