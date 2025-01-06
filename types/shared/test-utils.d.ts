/**
 * @param {HTMLElement|JQLite} element
 * @param {string} event
 */
export function browserTrigger(element: HTMLElement | JQLite, event: string): void;
/**
 *
 * @param {number} t milliseconds to wait
 * @returns
 */
export function wait(t: number): Promise<any>;
import { JQLite } from "./jqlite/jqlite.js";
