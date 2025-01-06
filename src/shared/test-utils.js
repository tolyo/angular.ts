import { JQLite } from "./jqlite/jqlite.js";

/**
 * @param {HTMLElement|JQLite} element
 * @param {string} event
 */
export function browserTrigger(element, event) {
  JQLite(element)[0].dispatchEvent(
    new Event(event, { bubbles: true, cancelable: true }),
  );
}

/**
 *
 * @param {number} t milliseconds to wait
 * @returns
 */
export function wait(t) {
  return new Promise((resolve) => setTimeout(resolve, t));
}
