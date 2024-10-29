import { markQExceptionHandled } from "../q/q";
import { minErr } from "../../shared/utils";

const $intervalMinErr = minErr("$interval");

/**
 * @typedef {number} IntervalId
 * Interval ID which uniquely identifies the interval and can be used to cancel it
 */

/**
 * @type {Map<IntervalId, import("../q/q").Deferred<any>>}
 */
const intervals = new Map();

export function IntervalProvider() {
  this.$get = [
    "$$intervalFactory",
    // TODO Add type
    function ($$intervalFactory) {
      /**
       * @param {TimerHandler} tick
       * @param {number} delay
       * @param {import("../q/q").Deferred<any>} deferred
       * @returns {IntervalId} - This method returns an interval ID which uniquely identifies the interval
       */
      function setIntervalFn(tick, delay, deferred) {
        const id = window.setInterval(tick, delay);
        intervals.set(id, deferred);
        return id;
      }

      /**s
       * @param {IntervalId} id
       */
      function clearIntervalFn(id) {
        window.clearInterval(id);
        intervals.delete(id);
      }

      const interval = $$intervalFactory(setIntervalFn, clearIntervalFn);

      /**
       * Cancels a task associated with the `promise`.
       *
       * @param {!import("../q/q").QPromise<any>} promise returned by the `$interval` function.
       * @returns {boolean} Returns `true` if the task was successfully canceled.
       */
      interval.cancel = function (promise) {
        if (!promise) return false;

        if (!Object.prototype.hasOwnProperty.call(promise, "$$intervalId")) {
          throw $intervalMinErr(
            "badprom",
            "`$interval.cancel()` called with a promise that was not generated by `$interval()`.",
          );
        }

        if (!intervals.has(promise.$$intervalId)) {
          return false;
        }

        const id = promise.$$intervalId;
        const deferred = intervals.get(id);

        // Interval cancels should not report an unhandled promise.
        markQExceptionHandled(deferred.promise);
        deferred.reject("canceled");
        clearIntervalFn(id);

        return true;
      };

      return interval;
    },
  ];
}