export function trimEmptyHash(url: any): any;
/**
 * @name $browser
 * @requires $log
 * @description
 * This object has two goals:
 *
 * - hide all the global state in the browser caused by the window object
 * - abstract away all the browser specific features and inconsistencies
 *
 */
/**
 * @param {object} $log window.console or an object with the same interface.
 */
export function Browser($log: object, $$taskTrackerFactory: any): void;
export class Browser {
  /**
   * @name $browser
   * @requires $log
   * @description
   * This object has two goals:
   *
   * - hide all the global state in the browser caused by the window object
   * - abstract away all the browser specific features and inconsistencies
   *
   */
  /**
   * @param {object} $log window.console or an object with the same interface.
   */
  constructor($log: object, $$taskTrackerFactory: any);
  $$completeOutstandingRequest: any;
  $$incOutstandingRequestCount: any;
  notifyWhenNoOutstandingRequests: any;
  /**
   * @name $browser#url
   *
   * @description
   * GETTER:
   * Without any argument, this method just returns current value of `location.href` (with a
   * trailing `#` stripped of if the hash is empty).
   *
   * SETTER:
   * With at least one argument, this method sets url to new value.
   * If html5 history api supported, `pushState`/`replaceState` is used, otherwise
   * `location.href`/`location.replace` is used.
   * Returns its own instance to allow chaining.
   *
   * NOTE: this api is intended for use only by the `$location` service. Please use the
   * {@link ng.$location $location service} to change url.
   *
   * @param {string} url New url (when used as setter)
   * @param {boolean=} replace Should new url replace current history record?
   * @param {object=} state State object to use with `pushState`/`replaceState`
   */
  url: (
    url: string,
    replace?: boolean | undefined,
    state?: object | undefined,
  ) => any;
  /**
   * @name $browser#state
   *
   * @description
   * This method is a getter.
   *
   * Return history.state or null if history.state is undefined.
   *
   * @returns {object} state
   */
  state: () => object;
  /**
   * @name $browser#onUrlChange
   *
   * @description
   * Register callback function that will be called, when url changes.
   *
   * It's only called when the url is changed from outside of AngularJS:
   * - user types different url into address bar
   * - user clicks on history (forward/back) button
   * - user clicks on a link
   *
   * It's not called when url is changed by $browser.url() method
   *
   * The listener gets called with new url as parameter.
   *
   * NOTE: this api is intended for use only by the $location service. Please use the
   * {@link ng.$location $location service} to monitor url changes in AngularJS apps.
   *
   * @param {function(string)} listener Listener function to be called when url changes.
   * @return {function(string)} Returns the registered listener fn - handy if the fn is anonymous.
   */
  onUrlChange: (callback: any) => (arg0: string) => any;
  /**
   * Remove popstate and hashchange handler from window.
   *
   * NOTE: this api is intended for use only by $rootScope.
   */
  $$applicationDestroyed: () => void;
  /**
   * Checks whether the url has changed outside of AngularJS.
   * Needs to be exported to be able to check for changes that have been done in sync,
   * as hashchange/popstate events fire in async.
   */
  $$checkUrlChange: () => void;
  /**
   * @name $browser#baseHref
   *
   * @description
   * Returns current <base href>
   * (always relative - without domain)
   *
   * @returns {string} The current base href
   */
  baseHref: () => string;
  /**
   * @name $browser#defer
   * @param {function()} fn A function, who's execution should be deferred.
   * @param {number=} [delay=0] Number of milliseconds to defer the function execution.
   * @param {string=} [taskType=DEFAULT_TASK_TYPE] The type of task that is deferred.
   * @returns {*} DeferId that can be used to cancel the task via `$browser.cancel()`.
   *
   * @description
   * Executes a fn asynchronously via `setTimeout(fn, delay)`.
   *
   * Unlike when calling `setTimeout` directly, in test this function is mocked and instead of using
   * `setTimeout` in tests, the fns are queued in an array, which can be programmatically flushed
   * via `$browser.defer.flush()`.
   *
   */
  defer: (
    fn: () => any,
    delay?: number | undefined,
    taskType?: string | undefined,
  ) => any;
  /**
   * @name $browser#cancel
   *
   * @description
   * Cancels a deferred task identified with `deferId`.
   *
   * @param {*} deferId Token returned by the `$browser.defer` function.
   * @returns {boolean} Returns `true` if the task hasn't executed yet and was successfully
   *                    canceled.
   */
  cancel: (deferId: any) => boolean;
}
export function BrowserProvider(): void;
export class BrowserProvider {
  $get: (string | (($log: any, $$taskTrackerFactory: any) => Browser))[];
}