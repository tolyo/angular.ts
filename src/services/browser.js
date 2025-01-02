import { JQLite } from "../shared/jqlite/jqlite.js";
import { urlResolve } from "../core/url-utils/url-utils";
import { equals } from "../shared/utils";

/**
 * Removes a trailing hash ('#') from the given URL if it exists.
 *
 * @param {string} url
 * @returns {string}
 */
export function trimEmptyHash(url) {
  return url.replace(/#$/, "");
}

/**
 * @typedef {function(string, string|null): any} UrlChangeListener
 */

/**
 * This object has two goals:
 *
 * - hide all the global state in the browser caused by the window object
 * - abstract away all the browser specific features and inconsistencies
 */
export class Browser {
  /**
   * @param {import('../core/task-tracker-factory').TaskTracker} taskTracker
   */
  constructor(taskTracker) {
    /**
     * @type {import('../core/task-tracker-factory').TaskTracker} taskTracker
     */
    this.taskTracker = taskTracker;
    this.pendingDeferIds = {};
    /** @type {Array<UrlChangeListener>} */
    this.urlChangeListeners = [];
    this.urlChangeInit = false;

    /** @type {any} */
    this.cachedState = null;
    /** @type {any} */
    this.lastHistoryState = null;
    /** @type {string} */
    this.lastBrowserUrl = window.location.href;
    /** @type {JQLite} */
    this.baseElement = JQLite(
      Array.from(document.getElementsByTagName("base")),
    );

    // Task-tracking API
    this.$$completeOutstandingRequest =
      this.taskTracker.completeTask.bind(taskTracker);
    this.$$incOutstandingRequestCount =
      this.taskTracker.incTaskCount.bind(taskTracker);
    this.notifyWhenNoOutstandingRequests =
      this.taskTracker.notifyWhenNoPendingTasks.bind(taskTracker);

    this.cacheState();
  }

  /// ///////////////////////////////////////////////////////////
  // URL API
  /// ///////////////////////////////////////////////////////////

  url(url, state) {
    if (state === undefined) {
      state = null;
    }

    // setter
    if (url) {
      url = urlResolve(url).href;

      if (this.lastBrowserUrl === url && this.lastHistoryState === state) {
        return this;
      }

      this.lastBrowserUrl = url;
      this.lastHistoryState = state;
      history.pushState(state, "", url);
      this.cacheState();
      return this;
    }

    // getter
    return trimEmptyHash(window.location.href);
  }

  /**
   * Returns the cached state.
   *
   * @returns {any} The cached state.
   */
  state() {
    return this.cachedState;
  }

  /**
   * Caches the current state and fires the URL change event.
   *
   * @private
   */
  cacheStateAndFireUrlChange() {
    this.fireStateOrUrlChange();
  }

  /**
   * Caches the current state.
   *
   * @private
   */
  cacheState() {
    const currentState = history.state ?? null;
    if (!equals(currentState, this.lastCachedState)) {
      this.cachedState = currentState;
      this.lastCachedState = currentState;
      this.lastHistoryState = currentState;
    }
  }

  /**
   * Fires the state or URL change event.
   *
   * @private
   */
  fireStateOrUrlChange() {
    const prevLastHistoryState = this.lastHistoryState;
    this.cacheState();

    if (
      this.lastBrowserUrl === this.url() &&
      prevLastHistoryState === this.cachedState
    ) {
      return;
    }

    this.lastBrowserUrl = /** @type {string} */ (this.url());
    this.lastHistoryState = this.cachedState;
    this.urlChangeListeners.forEach((listener) => {
      listener(trimEmptyHash(window.location.href), this.cachedState);
    });
  }

  /**
   * Registers a callback to be called when the URL changes.
   *
   * @param {UrlChangeListener} callback - The callback function to register.
   * @returns {UrlChangeListener} The registered callback function.
   */
  onUrlChange(callback) {
    if (!this.urlChangeInit) {
      window.addEventListener(
        "popstate",
        this.cacheStateAndFireUrlChange.bind(this),
      );
      window.addEventListener(
        "hashchange",
        this.cacheStateAndFireUrlChange.bind(this),
      );

      this.urlChangeInit = true;
    }

    this.urlChangeListeners.push(callback);
    return callback;
  }

  $$applicationDestroyed() {
    window.removeEventListener(
      "popstate",
      this.cacheStateAndFireUrlChange.bind(this),
    );
    window.removeEventListener(
      "hashchange",
      this.cacheStateAndFireUrlChange.bind(this),
    );
  }

  $$checkUrlChange() {
    this.fireStateOrUrlChange();
  }

  /// ///////////////////////////////////////////////////////////
  // Misc API
  /// ///////////////////////////////////////////////////////////

  /**
   * Returns the base href of the document.
   *
   * @returns {string} The base href.
   */
  baseHref() {
    const href = this.baseElement.attr("href");
    return href ? href.replace(/^(https?:)?\/\/[^/]*/, "") : "";
  }

  /**
   * Defers a function to be executed after a delay.
   *
   * @param {function(): any} fn - The function to defer.
   * @param {number} [delay=0] - The delay in milliseconds before executing the function.
   * @param {string} [taskType=this.taskTracker.DEFAULT_TASK_TYPE] - The type of task to track.
   * @returns {number} The timeout ID associated with the deferred function.
   */
  defer(fn, delay = 0, taskType = this.taskTracker.DEFAULT_TASK_TYPE) {
    let timeoutId;

    this.taskTracker.incTaskCount(taskType);
    timeoutId = window.setTimeout(() => {
      delete this.pendingDeferIds[timeoutId];
      this.taskTracker.completeTask(fn, taskType);
    }, delay);
    this.pendingDeferIds[timeoutId] = taskType;

    return timeoutId;
  }

  /**
   * Cancels a deferred function.
   *
   * @param {number} deferId - The ID of the deferred function to cancel.
   * @returns {boolean} True if the function was successfully canceled, false otherwise.
   */
  cancel(deferId) {
    if (Object.prototype.hasOwnProperty.call(this.pendingDeferIds, deferId)) {
      const taskType = this.pendingDeferIds[deferId];
      delete this.pendingDeferIds[deferId];
      window.clearTimeout(deferId);
      this.taskTracker.completeTask(() => {}, taskType);
      return true;
    }
    return false;
  }
}

/**
 * This object has two goals:
 *
 * - hide all the global state in the browser caused by the window object
 * - abstract away all the browser specific features and inconsistencies
 *
 * Remove this in the future
 */
export class BrowserProvider {
  $get = [
    "$$taskTrackerFactory",
    /**
     * @param {import('../core/task-tracker-factory').TaskTracker} $$taskTrackerFactory
     * @returns
     */
    ($$taskTrackerFactory) => new Browser($$taskTrackerFactory),
  ];
}
