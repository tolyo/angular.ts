export class TimeoutProvider {
    $get: (string | (($rootScope: import("../scope/scope").Scope, $browser: import("../../services/browser").Browser, $q: any, $exceptionHandler: import("../exception-handler").ErrorHandler) => {
        (fn?: (() => any) | undefined, delay?: number | undefined, invokeApply?: boolean, ...args: any[]): import("../q/q").QPromise<any>;
        /**
         * Cancels a task associated with the `promise`. As a result of this, the promise will be
         * resolved with a rejection.
         *
         * @param {import("../q/q").QPromise<any>} promise Promise returned by the `$timeout` function.
         * @returns {boolean} Returns `true` if the task hasn't executed yet and was successfully
         *   canceled.
         */
        cancel(promise: import("../q/q").QPromise<any>): boolean;
    }))[];
}
