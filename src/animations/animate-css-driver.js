import { JQLite } from "../shared/jqlite/jqlite";
import { isString } from "../shared/utils";
import { concatWithSpace, getDomNode } from "./shared";

const NG_ANIMATE_SHIM_CLASS_NAME = "ng-animate-shim";
const NG_ANIMATE_ANCHOR_CLASS_NAME = "ng-anchor";

const NG_OUT_ANCHOR_CLASS_NAME = "ng-anchor-out";
const NG_IN_ANCHOR_CLASS_NAME = "ng-anchor-in";

AnimateCssDriverProvider.$inject = ["$$animationProvider"];
export function AnimateCssDriverProvider($$animationProvider) {
  $$animationProvider.drivers.push("$$animateCssDriver");

  function isDocumentFragment(node) {
    return node.parentNode && node.parentNode.nodeType === 11;
  }

  /**
   * @returns {Function}
   */
  this.$get = [
    "$animateCss",
    "$$AnimateRunner",
    "$rootElement",
    /**
     *
     * @param {*} $animateCss
     * @param {typeof import('./animate-runner').AnimateRunner} $$AnimateRunner
     * @param {JQLite} $rootElement
     * @returns
     */
    function ($animateCss, $$AnimateRunner, $rootElement) {
      const bodyNode = document.body;
      const rootNode = $rootElement[0];

      const rootBodyElement = JQLite(
        // this is to avoid using something that exists outside of the body
        // we also special case the doc fragment case because our unit test code
        // appends the $rootElement to the body after the app has been bootstrapped
        isDocumentFragment(rootNode) || bodyNode.contains(rootNode)
          ? rootNode
          : bodyNode,
      );

      return function initDriverFn(animationDetails) {
        return animationDetails.from && animationDetails.to
          ? prepareFromToAnchorAnimation(
              animationDetails.from,
              animationDetails.to,
              animationDetails.anchors,
            )
          : prepareRegularAnimation(animationDetails);
      };

      function prepareAnchoredAnimation(outAnchor, inAnchor) {
        const clone = JQLite(getDomNode(outAnchor).cloneNode(true));
        const startingClasses = filterCssClasses(getClassVal(clone));

        outAnchor[0].classList.add(NG_ANIMATE_SHIM_CLASS_NAME);
        inAnchor[0].classList.add(NG_ANIMATE_SHIM_CLASS_NAME);

        clone[0].classList.add(NG_ANIMATE_ANCHOR_CLASS_NAME);

        rootBodyElement.append(clone);

        let animatorIn;
        const animatorOut = prepareOutAnimation();

        // the user may not end up using the `out` animation and
        // only making use of the `in` animation or vice-versa.
        // In either case we should allow this and not assume the
        // animation is over unless both animations are not used.
        if (!animatorOut) {
          animatorIn = prepareInAnimation();
          if (!animatorIn) {
            return end();
          }
        }

        const startingAnimator = animatorOut || animatorIn;

        return {
          start() {
            let runner;

            let currentAnimation = startingAnimator.start();
            currentAnimation.done(() => {
              currentAnimation = null;
              if (!animatorIn) {
                animatorIn = prepareInAnimation();
                if (animatorIn) {
                  currentAnimation = animatorIn.start();
                  currentAnimation.done(() => {
                    currentAnimation = null;
                    end();
                    runner.complete();
                  });
                  return currentAnimation;
                }
              }
              // in the event that there is no `in` animation
              end();
              runner.complete();
            });

            runner = new $$AnimateRunner({
              end: endFn,
              cancel: endFn,
            });

            return runner;

            function endFn() {
              if (currentAnimation) {
                currentAnimation.end();
              }
            }
          },
        };

        function calculateAnchorStyles(anchor) {
          const styles = {};

          const coords = getDomNode(anchor).getBoundingClientRect();

          // we iterate directly since safari messes up and doesn't return
          // all the keys for the coords object when iterated
          ["width", "height", "top", "left"].forEach((key) => {
            let value = coords[key];
            switch (key) {
              case "top":
                value += bodyNode.scrollTop;
                break;
              case "left":
                value += bodyNode.scrollLeft;
                break;
            }
            styles[key] = `${Math.floor(value)}px`;
          });
          return styles;
        }

        function prepareOutAnimation() {
          const animator = $animateCss(clone, {
            addClass: NG_OUT_ANCHOR_CLASS_NAME,
            delay: true,
            from: calculateAnchorStyles(outAnchor),
          });

          // read the comment within `prepareRegularAnimation` to understand
          // why this check is necessary
          return animator.$$willAnimate ? animator : null;
        }

        function getClassVal(element) {
          return element.attr("class") || "";
        }

        function prepareInAnimation() {
          const endingClasses = filterCssClasses(getClassVal(inAnchor));
          const toAdd = getUniqueValues(endingClasses, startingClasses);
          const toRemove = getUniqueValues(startingClasses, endingClasses);

          const animator = $animateCss(clone, {
            to: calculateAnchorStyles(inAnchor),
            addClass: `${NG_IN_ANCHOR_CLASS_NAME} ${toAdd}`,
            removeClass: `${NG_OUT_ANCHOR_CLASS_NAME} ${toRemove}`,
            delay: true,
          });

          // read the comment within `prepareRegularAnimation` to understand
          // why this check is necessary
          return animator.$$willAnimate ? animator : null;
        }

        function end() {
          clone.remove();
          outAnchor[0].classList.remove(NG_ANIMATE_SHIM_CLASS_NAME);
          inAnchor[0].classList.remove(NG_ANIMATE_SHIM_CLASS_NAME);
        }
      }

      function prepareFromToAnchorAnimation(from, to, anchors) {
        const fromAnimation = prepareRegularAnimation(from);
        const toAnimation = prepareRegularAnimation(to);

        const anchorAnimations = [];
        anchors.forEach((anchor) => {
          const outElement = anchor.out;
          const inElement = anchor.in;
          const animator = prepareAnchoredAnimation(outElement, inElement);
          if (animator) {
            anchorAnimations.push(animator);
          }
        });

        // no point in doing anything when there are no elements to animate
        if (!fromAnimation && !toAnimation && anchorAnimations.length === 0)
          return;

        return {
          start() {
            const animationRunners = [];

            if (fromAnimation) {
              animationRunners.push(fromAnimation.start());
            }

            if (toAnimation) {
              animationRunners.push(toAnimation.start());
            }

            anchorAnimations.forEach((animation) => {
              animationRunners.push(animation.start());
            });

            const runner = new $$AnimateRunner({
              end: endFn,
              cancel: endFn, // CSS-driven animations cannot be cancelled, only ended
            });

            $$AnimateRunner.all(animationRunners, (status) => {
              runner.complete(status);
            });

            return runner;

            function endFn() {
              animationRunners.forEach((runner) => {
                runner.end();
              });
            }
          },
        };
      }

      function prepareRegularAnimation(animationDetails) {
        const options = animationDetails.options || {};

        if (animationDetails.structural) {
          options.event = animationDetails.event;
          options.structural = true;
          options.applyClassesEarly = true;

          // we special case the leave animation since we want to ensure that
          // the element is removed as soon as the animation is over. Otherwise
          // a flicker might appear or the element may not be removed at all
          if (animationDetails.event === "leave") {
            options.onDone = options.domOperation;
          }
        }

        // We assign the preparationClasses as the actual animation event since
        // the internals of $animateCss will just suffix the event token values
        // with `-active` to trigger the animation.
        if (options.preparationClasses) {
          options.event = concatWithSpace(
            options.event,
            options.preparationClasses,
          );
        }

        const animator = $animateCss(animationDetails.element, options);

        // the driver lookup code inside of $$animation attempts to spawn a
        // driver one by one until a driver returns a.$$willAnimate animator object.
        // $animateCss will always return an object, however, it will pass in
        // a flag as a hint as to whether an animation was detected or not

        return animator.$$willAnimate ? animator : null;
      }
    },
  ];
}

function filterCssClasses(classes) {
  // remove all the `ng-` stuff
  return classes.replace(/\bng-\S+\b/g, "");
}

function getUniqueValues(a, b) {
  if (isString(a)) a = a.split(" ");
  if (isString(b)) b = b.split(" ");
  return a.filter((val) => b.indexOf(val) === -1).join(" ");
}
