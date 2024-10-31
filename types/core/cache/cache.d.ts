/**
 * @typedef {Object} ExpandoStore
 *
 * @property {!Object<string, any>} data
 * @property {!Object} events
 * @property {?Function} handle
 *
 */
export const EXPANDO: "ng";
/**
 * Expando cache for adding properties to DOM nodes with JavaScript.
 * This used to be an Object in JQLite decorator, but swapped out for a Map
 * for performance reasons and convenience methods. A proxy is available for
 * additional logic handling.
 *
 * @type {Map<number, ExpandoStore>}
 */
export const CACHE: Map<number, ExpandoStore>;
export type ExpandoStore = {
    data: {
        [x: string]: any;
    };
    events: any;
    handle: Function | null;
};
