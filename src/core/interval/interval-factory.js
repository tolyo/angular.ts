import { isDefined, sliceArgs } from "../../shared/utils";

export function $IntervalFactoryProvider() {
  this.$get = [
    "$q",
    "$rootScope",
    /**
     * @param {*} $q
     * @param {import('../scope/scope').Scope} $rootScope
     * @returns
     */
    function ($q, $rootScope) {
      return function intervalFactory(setIntervalFn, clearIntervalFn) {
        return function intervalFn(fn, delay, count) {
          const hasParams = arguments.length > 4;
          const args = hasParams ? sliceArgs(arguments, 4) : [];
          let iteration = 0;
          const deferred = $q.defer();
          const { promise } = deferred;

          count = isDefined(count) ? count : 0;

          function callback() {
            if (!hasParams) {
              fn(iteration);
            } else {
              fn.apply(null, args);
            }
          }

          function tick() {
            $rootScope.$evalAsync(callback);

            iteration++;

            if (count > 0 && iteration >= count) {
              deferred.resolve(iteration);
              clearIntervalFn(promise.$$intervalId);
            }
            $rootScope.$apply();
          }

          promise.$$intervalId = setIntervalFn(tick, delay, deferred);

          return promise;
        };
      };
    },
  ];
}
