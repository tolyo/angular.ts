import { isDefined } from "../shared/utils";
import {
  TRANSITION_DURATION_PROP,
  TRANSITION_DELAY_PROP,
  ANIMATION_DELAY_PROP,
  TRANSITION_PROP,
  PROPERTY_KEY,
  ANIMATION_DURATION_PROP,
  ANIMATION_ITERATION_COUNT_KEY,
  ANIMATION_PROP,
  DURATION_KEY,
  applyAnimationClassesFactory,
  pendClasses,
  prepareAnimationOptions,
  getDomNode,
  packageStyles,
  EVENT_CLASS_PREFIX,
  ADD_CLASS_SUFFIX,
  REMOVE_CLASS_SUFFIX,
  applyInlineStyle,
  SAFE_FAST_FORWARD_DURATION_VALUE,
  ACTIVE_CLASS_SUFFIX,
  applyAnimationFromStyles,
  applyAnimationStyles,
  blockKeyframeAnimations,
  removeFromArray,
  TIMING_KEY,
  TRANSITIONEND_EVENT,
  ANIMATIONEND_EVENT,
  applyAnimationToStyles,
} from "./shared";

const ANIMATE_TIMER_KEY = "$$animateCss";

const ONE_SECOND = 1000;

const ELAPSED_TIME_MAX_DECIMAL_PLACES = 3;
const CLOSING_TIME_BUFFER = 1.5;

const DETECT_CSS_PROPERTIES = {
  transitionDuration: TRANSITION_DURATION_PROP,
  transitionDelay: TRANSITION_DELAY_PROP,
  transitionProperty: TRANSITION_PROP + PROPERTY_KEY,
  animationDuration: ANIMATION_DURATION_PROP,
  animationDelay: ANIMATION_DELAY_PROP,
  animationIterationCount: ANIMATION_PROP + ANIMATION_ITERATION_COUNT_KEY,
};

const DETECT_STAGGER_CSS_PROPERTIES = {
  transitionDuration: TRANSITION_DURATION_PROP,
  transitionDelay: TRANSITION_DELAY_PROP,
  animationDuration: ANIMATION_DURATION_PROP,
  animationDelay: ANIMATION_DELAY_PROP,
};

function getCssKeyframeDurationStyle(duration) {
  return [ANIMATION_DURATION_PROP, `${duration}s`];
}

function getCssDelayStyle(delay, isKeyframeAnimation) {
  const prop = isKeyframeAnimation
    ? ANIMATION_DELAY_PROP
    : TRANSITION_DELAY_PROP;
  return [prop, `${delay}s`];
}

function computeCssStyles(element, properties) {
  const styles = Object.create(null);
  const detectedStyles = window.getComputedStyle(element) || {};
  Object.entries(properties).forEach(([actualStyleName, formalStyleName]) => {
    let val = detectedStyles[formalStyleName];
    if (val) {
      const c = val.charAt(0);

      // only numerical-based values have a negative sign or digit as the first value
      if (c === "-" || c === "+" || c >= 0) {
        val = parseMaxTime(val);
      }

      // by setting this to null in the event that the delay is not set or is set directly as 0
      // then we can still allow for negative values to be used later on and not mistake this
      // value for being greater than any other negative value.
      if (val === 0) {
        val = null;
      }
      styles[actualStyleName] = val;
    }
  });

  return styles;
}

function parseMaxTime(str) {
  let maxValue = 0;
  str.split(/\s*,\s*/).forEach((value) => {
    // it's always safe to consider only second values and omit `ms` values since
    // getComputedStyle will always handle the conversion for us
    if (value.charAt(value.length - 1) === "s") {
      value = value.substring(0, value.length - 1);
    }
    value = parseFloat(value) || 0;
    maxValue = maxValue ? Math.max(value, maxValue) : value;
  });
  return maxValue;
}

function truthyTimingValue(val) {
  return val === 0 || val != null;
}

function getCssTransitionDurationStyle(duration, applyOnlyDuration) {
  let style = TRANSITION_PROP;
  let value = `${duration}s`;
  if (applyOnlyDuration) {
    style += DURATION_KEY;
  } else {
    value += " linear all";
  }
  return [style, value];
}

// we do not reassign an already present style value since
// if we detect the style property value again we may be
// detecting styles that were added via the `from` styles.
// We make use of `isDefined` here since an empty string
// or null value (which is what getPropertyValue will return
// for a non-existing style) will still be marked as a valid
// value for the style (a falsy value implies that the style
// is to be removed at the end of the animation). If we had a simple
// "OR" statement then it would not be enough to catch that.
function registerRestorableStyles(backup, node, properties) {
  properties.forEach((prop) => {
    backup[prop] = isDefined(backup[prop])
      ? backup[prop]
      : node.style.getPropertyValue(prop);
  });
}

export function AnimateCssProvider() {
  this.$get = [
    "$$AnimateRunner",
    "$$animateCache",
    "$$rAFScheduler",
    "$$animateQueue",

    /**
     *
     * @param {*} $$AnimateRunner
     * @param {*} $$animateCache
     * @param {import("./raf-scheduler").RafScheduler} $$rAFScheduler
     * @param {*} $$animateQueue
     * @returns
     */
    function ($$AnimateRunner, $$animateCache, $$rAFScheduler, $$animateQueue) {
      const applyAnimationClasses = applyAnimationClassesFactory();

      function computeCachedCssStyles(
        node,
        cacheKey,
        allowNoDuration,
        properties,
      ) {
        let timings = $$animateCache.get(cacheKey);

        if (!timings) {
          timings = computeCssStyles(node, properties);
          if (timings.animationIterationCount === "infinite") {
            timings.animationIterationCount = 1;
          }
        }

        // if a css animation has no duration we
        // should mark that so that repeated addClass/removeClass calls are skipped
        const hasDuration =
          allowNoDuration ||
          timings.transitionDuration > 0 ||
          timings.animationDuration > 0;

        // we keep putting this in multiple times even though the value and the cacheKey are the same
        // because we're keeping an internal tally of how many duplicate animations are detected.
        $$animateCache.put(cacheKey, timings, hasDuration);

        return timings;
      }

      function computeCachedCssStaggerStyles(
        node,
        className,
        cacheKey,
        properties,
      ) {
        let stagger;
        const staggerCacheKey = `stagger-${cacheKey}`;

        // if we have one or more existing matches of matching elements
        // containing the same parent + CSS styles (which is how cacheKey works)
        // then staggering is possible
        if ($$animateCache.count(cacheKey) > 0) {
          stagger = $$animateCache.get(staggerCacheKey);

          if (!stagger) {
            const staggerClassName = pendClasses(className, "-stagger");

            node.className += ` ${staggerClassName}`;
            stagger = computeCssStyles(node, properties);

            // force the conversion of a null value to zero incase not set
            stagger.animationDuration = Math.max(stagger.animationDuration, 0);
            stagger.transitionDuration = Math.max(
              stagger.transitionDuration,
              0,
            );

            node.classList.remove(staggerClassName);

            $$animateCache.put(staggerCacheKey, stagger, true);
          }
        }

        return stagger || {};
      }

      const rafWaitQueue = [];
      function waitUntilQuiet(callback) {
        rafWaitQueue.push(callback);
        $$rAFScheduler.waitUntilQuiet(() => {
          $$animateCache.flush();

          // DO NOT REMOVE THIS LINE OR REFACTOR OUT THE `pageWidth` variable.
          // the line below will force the browser to perform a repaint so
          // that all the animated elements within the animation frame will
          // be properly updated and drawn on screen. This is required to
          // ensure that the preparation animation is properly flushed so that
          // the active state picks up from there. DO NOT REMOVE THIS LINE.
          // DO NOT OPTIMIZE THIS LINE. THE MINIFIER WILL REMOVE IT OTHERWISE WHICH
          // WILL RESULT IN AN UNPREDICTABLE BUG THAT IS VERY HARD TO TRACK DOWN AND
          // WILL TAKE YEARS AWAY FROM YOUR LIFE.

          const pageWidth = document.body.offsetWidth + 1;

          // we use a for loop to ensure that if the queue is changed
          // during this looping then it will consider new requests
          for (let i = 0; i < rafWaitQueue.length; i++) {
            rafWaitQueue[i](pageWidth);
          }
          rafWaitQueue.length = 0;
        });
      }

      function computeTimings(node, cacheKey, allowNoDuration) {
        const timings = computeCachedCssStyles(
          node,
          cacheKey,
          allowNoDuration,
          DETECT_CSS_PROPERTIES,
        );
        const aD = timings.animationDelay;
        const tD = timings.transitionDelay;
        timings.maxDelay = aD && tD ? Math.max(aD, tD) : aD || tD;
        timings.maxDuration = Math.max(
          timings.animationDuration * timings.animationIterationCount,
          timings.transitionDuration,
        );

        return timings;
      }

      return function init(element, initialOptions) {
        // all of the animation functions should create
        // a copy of the options data, however, if a
        // parent service has already created a copy then
        // we should stick to using that
        let options = initialOptions || {};
        if (!options.$$prepared) {
          options = prepareAnimationOptions(structuredClone(options));
        }

        const restoreStyles = {};
        const node = /** @type {HTMLElement} */ (getDomNode(element));
        if (!node || !node.parentNode || !$$animateQueue.enabled()) {
          return closeAndReturnNoopAnimator();
        }

        const temporaryStyles = [];
        const styles = packageStyles(options);
        let animationClosed;
        let animationPaused;
        let animationCompleted;
        let runner;
        let runnerHost;
        let maxDelay;
        let maxDelayTime;
        let maxDuration;
        let maxDurationTime;
        let startTime;
        const events = [];

        if (options.duration === 0) {
          return closeAndReturnNoopAnimator();
        }

        const method =
          options.event && Array.isArray(options.event)
            ? options.event.join(" ")
            : options.event;

        const isStructural = method && options.structural;
        let structuralClassName = "";
        let addRemoveClassName = "";

        if (isStructural) {
          structuralClassName = pendClasses(method, EVENT_CLASS_PREFIX, true);
        } else if (method) {
          structuralClassName = method;
        }

        if (options.addClass) {
          addRemoveClassName += pendClasses(options.addClass, ADD_CLASS_SUFFIX);
        }

        if (options.removeClass) {
          if (addRemoveClassName.length) {
            addRemoveClassName += " ";
          }
          addRemoveClassName += pendClasses(
            options.removeClass,
            REMOVE_CLASS_SUFFIX,
          );
        }

        // there may be a situation where a structural animation is combined together
        // with CSS classes that need to resolve before the animation is computed.
        // However this means that there is no explicit CSS code to block the animation
        // from happening (by setting 0s none in the class name). If this is the case
        // we need to apply the classes before the first rAF so we know to continue if
        // there actually is a detected transition or keyframe animation
        if (options.applyClassesEarly && addRemoveClassName.length) {
          applyAnimationClasses(element, options);
        }

        let preparationClasses = [structuralClassName, addRemoveClassName]
          .join(" ")
          .trim();
        const hasToStyles = styles.to && Object.keys(styles.to).length > 0;
        const containsKeyframeAnimation =
          (options.keyframeStyle || "").length > 0;

        // there is no way we can trigger an animation if no styles and
        // no classes are being applied which would then trigger a transition,
        // unless there a is raw keyframe value that is applied to the element.
        if (!containsKeyframeAnimation && !hasToStyles && !preparationClasses) {
          return closeAndReturnNoopAnimator();
        }

        let stagger;
        let cacheKey = $$animateCache.cacheKey(
          node,
          method,
          options.addClass,
          options.removeClass,
        );
        if ($$animateCache.containsCachedAnimationWithoutDuration(cacheKey)) {
          preparationClasses = null;
          return closeAndReturnNoopAnimator();
        }

        if (options.stagger > 0) {
          const staggerVal = parseFloat(options.stagger);
          stagger = {
            transitionDelay: staggerVal,
            animationDelay: staggerVal,
            transitionDuration: 0,
            animationDuration: 0,
          };
        } else {
          stagger = computeCachedCssStaggerStyles(
            node,
            preparationClasses,
            cacheKey,
            DETECT_STAGGER_CSS_PROPERTIES,
          );
        }

        if (!options.$$skipPreparationClasses) {
          element[0].classList.add(
            ...preparationClasses.split(" ").filter((x) => x !== ""),
          );
        }

        let applyOnlyDuration;

        if (options.transitionStyle) {
          const transitionStyle = [TRANSITION_PROP, options.transitionStyle];
          applyInlineStyle(node, transitionStyle);
          temporaryStyles.push(transitionStyle);
        }

        if (options.duration >= 0) {
          applyOnlyDuration = node.style[TRANSITION_PROP].length > 0;
          const durationStyle = getCssTransitionDurationStyle(
            options.duration,
            applyOnlyDuration,
          );

          // we set the duration so that it will be picked up by getComputedStyle later
          applyInlineStyle(node, durationStyle);

          temporaryStyles.push(durationStyle);
        }

        if (options.keyframeStyle) {
          const keyframeStyle = [ANIMATION_PROP, options.keyframeStyle];
          applyInlineStyle(node, keyframeStyle);
          temporaryStyles.push(keyframeStyle);
        }

        const itemIndex = stagger
          ? options.staggerIndex >= 0
            ? options.staggerIndex
            : $$animateCache.count(cacheKey)
          : 0;

        const isFirst = itemIndex === 0;

        // this is a pre-emptive way of forcing the setup classes to be added and applied INSTANTLY
        // without causing any combination of transitions to kick in. By adding a negative delay value
        // it forces the setup class' transition to end immediately. We later then remove the negative
        // transition delay to allow for the transition to naturally do it's thing. The beauty here is
        // that if there is no transition defined then nothing will happen and this will also allow
        // other transitions to be stacked on top of each other without any chopping them out.
        if (isFirst && !options.skipBlocking) {
          blockTransitions(node, SAFE_FAST_FORWARD_DURATION_VALUE);
        }

        let timings = computeTimings(node, cacheKey, !isStructural);
        let relativeDelay = timings.maxDelay;
        maxDelay = Math.max(relativeDelay, 0);
        maxDuration = timings.maxDuration;

        const flags = {};
        flags.hasTransitions = timings.transitionDuration > 0;
        flags.hasAnimations = timings.animationDuration > 0;
        flags.hasTransitionAll =
          flags.hasTransitions && timings.transitionProperty === "all";
        flags.applyTransitionDuration =
          hasToStyles &&
          ((flags.hasTransitions && !flags.hasTransitionAll) ||
            (flags.hasAnimations && !flags.hasTransitions));
        flags.applyAnimationDuration = options.duration && flags.hasAnimations;
        flags.applyTransitionDelay =
          truthyTimingValue(options.delay) &&
          (flags.applyTransitionDuration || flags.hasTransitions);
        flags.applyAnimationDelay =
          truthyTimingValue(options.delay) && flags.hasAnimations;
        flags.recalculateTimingStyles = addRemoveClassName.length > 0;

        if (flags.applyTransitionDuration || flags.applyAnimationDuration) {
          maxDuration = options.duration
            ? parseFloat(options.duration)
            : maxDuration;

          if (flags.applyTransitionDuration) {
            flags.hasTransitions = true;
            timings.transitionDuration = maxDuration;
            applyOnlyDuration =
              node.style[TRANSITION_PROP + PROPERTY_KEY].length > 0;
            temporaryStyles.push(
              getCssTransitionDurationStyle(maxDuration, applyOnlyDuration),
            );
          }

          if (flags.applyAnimationDuration) {
            flags.hasAnimations = true;
            timings.animationDuration = maxDuration;
            temporaryStyles.push(getCssKeyframeDurationStyle(maxDuration));
          }
        }

        if (maxDuration === 0 && !flags.recalculateTimingStyles) {
          return closeAndReturnNoopAnimator();
        }

        var activeClasses = pendClasses(
          preparationClasses,
          ACTIVE_CLASS_SUFFIX,
        );

        if (options.delay != null) {
          var delayStyle;
          if (typeof options.delay !== "boolean") {
            delayStyle = parseFloat(options.delay);
            // number in options.delay means we have to recalculate the delay for the closing timeout
            maxDelay = Math.max(delayStyle, 0);
          }

          if (flags.applyTransitionDelay) {
            temporaryStyles.push(getCssDelayStyle(delayStyle));
          }

          if (flags.applyAnimationDelay) {
            temporaryStyles.push(getCssDelayStyle(delayStyle, true));
          }
        }

        // we need to recalculate the delay value since we used a pre-emptive negative
        // delay value and the delay value is required for the final event checking. This
        // property will ensure that this will happen after the RAF phase has passed.
        if (options.duration == null && timings.transitionDuration > 0) {
          flags.recalculateTimingStyles =
            flags.recalculateTimingStyles || isFirst;
        }

        maxDelayTime = maxDelay * ONE_SECOND;
        maxDurationTime = maxDuration * ONE_SECOND;
        if (!options.skipBlocking) {
          flags.blockTransition = timings.transitionDuration > 0;
          flags.blockKeyframeAnimation =
            timings.animationDuration > 0 &&
            stagger.animationDelay > 0 &&
            stagger.animationDuration === 0;
        }

        if (options.from) {
          if (options.cleanupStyles) {
            registerRestorableStyles(
              restoreStyles,
              node,
              Object.keys(options.from),
            );
          }
          applyAnimationFromStyles(element, options);
        }

        if (flags.blockTransition || flags.blockKeyframeAnimation) {
          applyBlocking(maxDuration);
        } else if (!options.skipBlocking) {
          blockTransitions(node, false);
        }

        // TODO(matsko): for 1.5 change this code to have an animator object for better debugging
        return {
          $$willAnimate: true,
          end: endFn,
          start() {
            if (animationClosed) return;

            runnerHost = {
              end: endFn,
              cancel: cancelFn,
              resume: null, // this will be set during the start() phase
              pause: null,
            };

            runner = new $$AnimateRunner(runnerHost);

            waitUntilQuiet(start);

            // we don't have access to pause/resume the animation
            // since it hasn't run yet. AnimateRunner will therefore
            // set noop functions for resume and pause and they will
            // later be overridden once the animation is triggered
            return runner;
          },
        };

        function endFn() {
          close();
        }

        function cancelFn() {
          close(true);
        }

        function close(rejected) {
          // if the promise has been called already then we shouldn't close
          // the animation again
          if (animationClosed || (animationCompleted && animationPaused))
            return;
          animationClosed = true;
          animationPaused = false;

          if (preparationClasses && !options.$$skipPreparationClasses) {
            element[0].classList.remove(...preparationClasses.split(" "));
          }
          activeClasses = pendClasses(preparationClasses, ACTIVE_CLASS_SUFFIX);
          if (activeClasses) {
            element[0].classList.remove(...activeClasses.split(" "));
          }

          blockKeyframeAnimations(node, false);
          blockTransitions(node, false);

          temporaryStyles.forEach((entry) => {
            // There is only one way to remove inline style properties entirely from elements.
            // By using `removeProperty` this works, but we need to convert camel-cased CSS
            // styles down to hyphenated values.
            node.style[entry[0]] = "";
          });

          applyAnimationClasses(element, options);
          applyAnimationStyles(element, options);

          if (Object.keys(restoreStyles).length) {
            Object.entries(restoreStyles).forEach(([prop, value]) => {
              if (value) {
                node.style.setProperty(prop, value);
              } else {
                node.style.removeProperty(prop);
              }
            });
          }

          // the reason why we have this option is to allow a synchronous closing callback
          // that is fired as SOON as the animation ends (when the CSS is removed) or if
          // the animation never takes off at all. A good example is a leave animation since
          // the element must be removed just after the animation is over or else the element
          // will appear on screen for one animation frame causing an overbearing flicker.
          if (options.onDone) {
            options.onDone();
          }

          if (events && events.length) {
            // Remove the transitionend / animationend listener(s)
            element.off(events.join(" "), onAnimationProgress);
          }

          // Cancel the fallback closing timeout and remove the timer data
          const animationTimerData = element.data(ANIMATE_TIMER_KEY);
          if (animationTimerData) {
            clearTimeout(animationTimerData[0].timer);
            element.removeData(ANIMATE_TIMER_KEY);
          }

          // if the preparation function fails then the promise is not setup
          if (runner) {
            runner.complete(!rejected);
          }
        }

        function applyBlocking(duration) {
          if (flags.blockTransition) {
            blockTransitions(node, duration);
          }

          if (flags.blockKeyframeAnimation) {
            blockKeyframeAnimations(node, !!duration);
          }
        }

        function closeAndReturnNoopAnimator() {
          runner = new $$AnimateRunner({
            end: endFn,
            cancel: cancelFn,
          });

          // should flush the cache animation
          waitUntilQuiet(() => {});
          close();

          return {
            $$willAnimate: false,
            start() {
              return runner;
            },
            end: endFn,
          };
        }

        function onAnimationProgress(event) {
          event.stopPropagation();
          const ev = event.originalEvent || event;

          if (ev.target !== node) {
            // Since TransitionEvent / AnimationEvent bubble up,
            // we have to ignore events by finished child animations
            return;
          }

          // we now always use `Date.now()` due to the recent changes with
          // event.timeStamp in Firefox, Webkit and Chrome (see #13494 for more info)
          const timeStamp = ev.$manualTimeStamp || Date.now();

          /* Firefox (or possibly just Gecko) likes to not round values up
           * when a ms measurement is used for the animation */
          const elapsedTime = parseFloat(
            ev.elapsedTime.toFixed(ELAPSED_TIME_MAX_DECIMAL_PLACES),
          );

          /* $manualTimeStamp is a mocked timeStamp value which is set
           * within browserTrigger(). This is only here so that tests can
           * mock animations properly. Real events fallback to event.timeStamp,
           * or, if they don't, then a timeStamp is automatically created for them.
           * We're checking to see if the timeStamp surpasses the expected delay,
           * but we're using elapsedTime instead of the timeStamp on the 2nd
           * pre-condition since animationPauseds sometimes close off early */
          if (
            Math.max(timeStamp - startTime, 0) >= maxDelayTime &&
            elapsedTime >= maxDuration
          ) {
            // we set this flag to ensure that if the transition is paused then, when resumed,
            // the animation will automatically close itself since transitions cannot be paused.
            animationCompleted = true;
            close();
          }
        }

        function start() {
          if (animationClosed) return;
          if (!node.parentNode) {
            close();
            return;
          }

          // even though we only pause keyframe animations here the pause flag
          // will still happen when transitions are used. Only the transition will
          // not be paused since that is not possible. If the animation ends when
          // paused then it will not complete until unpaused or cancelled.
          const playPause = function (playAnimation) {
            if (!animationCompleted) {
              animationPaused = !playAnimation;
              if (timings.animationDuration) {
                const value = blockKeyframeAnimations(node, animationPaused);
                if (animationPaused) {
                  temporaryStyles.push(value);
                } else {
                  removeFromArray(temporaryStyles, value);
                }
              }
            } else if (animationPaused && playAnimation) {
              animationPaused = false;
              close();
            }
          };

          // checking the stagger duration prevents an accidentally cascade of the CSS delay style
          // being inherited from the parent. If the transition duration is zero then we can safely
          // rely that the delay value is an intentional stagger delay style.
          const maxStagger =
            itemIndex > 0 &&
            ((timings.transitionDuration && stagger.transitionDuration === 0) ||
              (timings.animationDuration && stagger.animationDuration === 0)) &&
            Math.max(stagger.animationDelay, stagger.transitionDelay);
          if (maxStagger) {
            setTimeout(
              triggerAnimationStart,
              Math.floor(maxStagger * itemIndex * ONE_SECOND),
              false,
            );
          } else {
            triggerAnimationStart();
          }

          // this will decorate the existing promise runner with pause/resume methods
          runnerHost.resume = function () {
            playPause(true);
          };

          runnerHost.pause = function () {
            playPause(false);
          };

          function triggerAnimationStart() {
            // just incase a stagger animation kicks in when the animation
            // itself was cancelled entirely
            if (animationClosed) return;

            applyBlocking(false);

            temporaryStyles.forEach((entry) => {
              const key = entry[0];
              const value = entry[1];
              node.style[key] = value;
            });

            applyAnimationClasses(element, options);
            element[0].classList.add(
              ...activeClasses.split(" ").filter((x) => x !== ""),
            );
            if (flags.recalculateTimingStyles) {
              cacheKey = $$animateCache.cacheKey(
                node,
                method,
                options.addClass,
                options.removeClass,
              );

              timings = computeTimings(node, cacheKey, false);
              relativeDelay = timings.maxDelay;
              maxDelay = Math.max(relativeDelay, 0);
              maxDuration = timings.maxDuration;

              if (maxDuration === 0) {
                close();
                return;
              }

              flags.hasTransitions = timings.transitionDuration > 0;
              flags.hasAnimations = timings.animationDuration > 0;
            }

            if (flags.applyAnimationDelay) {
              relativeDelay =
                typeof options.delay !== "boolean" &&
                truthyTimingValue(options.delay)
                  ? parseFloat(options.delay)
                  : relativeDelay;

              maxDelay = Math.max(relativeDelay, 0);
              timings.animationDelay = relativeDelay;
              delayStyle = getCssDelayStyle(relativeDelay, true);
              temporaryStyles.push(delayStyle);
              node.style[delayStyle[0]] = delayStyle[1];
            }

            maxDelayTime = maxDelay * ONE_SECOND;
            maxDurationTime = maxDuration * ONE_SECOND;

            if (options.easing) {
              let easeProp;
              const easeVal = options.easing;
              if (flags.hasTransitions) {
                easeProp = TRANSITION_PROP + TIMING_KEY;
                temporaryStyles.push([easeProp, easeVal]);
                node.style[easeProp] = easeVal;
              }
              if (flags.hasAnimations) {
                easeProp = ANIMATION_PROP + TIMING_KEY;
                temporaryStyles.push([easeProp, easeVal]);
                node.style[easeProp] = easeVal;
              }
            }

            if (timings.transitionDuration) {
              events.push(TRANSITIONEND_EVENT);
            }

            if (timings.animationDuration) {
              events.push(ANIMATIONEND_EVENT);
            }

            startTime = Date.now();
            const timerTime =
              maxDelayTime + CLOSING_TIME_BUFFER * maxDurationTime;
            const endTime = startTime + timerTime;

            const animationsData = element.data(ANIMATE_TIMER_KEY) || [];
            let setupFallbackTimer = true;
            if (animationsData.length) {
              const currentTimerData = animationsData[0];
              setupFallbackTimer = endTime > currentTimerData.expectedEndTime;
              if (setupFallbackTimer) {
                clearTimeout(currentTimerData.timer);
              } else {
                animationsData.push(close);
              }
            }

            if (setupFallbackTimer) {
              const timer = setTimeout(onAnimationExpired, timerTime, false);
              animationsData[0] = {
                timer,
                expectedEndTime: endTime,
              };
              animationsData.push(close);
              element.data(ANIMATE_TIMER_KEY, animationsData);
            }

            if (events.length) {
              element.on(events.join(" "), onAnimationProgress);
            }

            if (options.to) {
              if (options.cleanupStyles) {
                registerRestorableStyles(
                  restoreStyles,
                  node,
                  Object.keys(options.to),
                );
              }
              applyAnimationToStyles(element, options);
            }
          }

          function onAnimationExpired() {
            const animationsData = element.data(ANIMATE_TIMER_KEY);

            // this will be false in the event that the element was
            // removed from the DOM (via a leave animation or something
            // similar)
            if (animationsData) {
              for (let i = 1; i < animationsData.length; i++) {
                animationsData[i]();
              }
              element.removeData(ANIMATE_TIMER_KEY);
            }
          }
        }
      };
    },
  ];
}

function blockTransitions(node, duration) {
  // we use a negative delay value since it performs blocking
  // yet it doesn't kill any existing transitions running on the
  // same element which makes this safe for class-based animations
  const value = duration ? `-${duration}s` : "";
  applyInlineStyle(node, [TRANSITION_DELAY_PROP, value]);
  return [TRANSITION_DELAY_PROP, value];
}
