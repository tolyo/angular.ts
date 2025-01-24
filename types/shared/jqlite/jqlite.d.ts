/**
 * JQLite is both a function and an array-like data structure for manipulation of DOM, linking elements to expando cache,
 * and execution of chains of functions.
 *
 * @param {string|Node|Node[]|NodeList|JQLite|ArrayLike<Element>|(() => void)|Window} element
 * @returns {JQLite}
 */
export function JQLite(element: string | Node | Node[] | NodeList | JQLite | ArrayLike<Element> | (() => void) | Window): JQLite;
export class JQLite {
    /**
     * JQLite is both a function and an array-like data structure for manipulation of DOM, linking elements to expando cache,
     * and execution of chains of functions.
     *
     * @param {string|Node|Node[]|NodeList|JQLite|ArrayLike<Element>|(() => void)|Window} element
     * @returns {JQLite}
     */
    constructor(element: string | Node | Node[] | NodeList | JQLite | ArrayLike<Element> | (() => void) | Window);
    /**
     * @returns {Element[]}
     */
    elements(): Element[];
    /**
     * Remove all child nodes of the set of matched elements from the DOM and clears CACHE data, associated with the node.
     * @returns {JQLite} The current instance of JQLite.
     */
    empty(): JQLite;
    /**
     * Returns the `$scope` of the element.
     * @returns {import("../../core/scope/scope").Scope}
     */
    scope(): import("../../core/scope/scope").Scope;
    /**
     * Returns the isolate `$scope` of the element.
     * @returns {import("../../core/scope/scope").Scope}
     */
    isolateScope(): import("../../core/scope/scope").Scope;
    /**
     * Return instance of controller attached to element
     * @param {string} [name] - Controller name
     * @returns {any}
     */
    controller(name?: string): any;
    /**
     * Return instance of injector attached to element
     * @returns {import('../../core/di/internal-injector').InjectorService}
     */
    injector(): import("../../core/di/internal-injector").InjectorService;
    /**
     * Removes an event listener to each element in JQLite collection.
     *
     * @param {string} type - The event type(s) to remove listener from
     * @param {Function} [fn] - The function to remove from event type.
     * @returns {JQLite}
     */
    off(type: string, fn?: Function): JQLite;
    /**
     * Remove data  by name from cache associated with each element in JQLite collection.
     * @param {string} name - The key of the data associated with element
     * @returns {JQLite}
     */
    removeData(name: string): JQLite;
    /**
     * Gets or sets data on a parent element
     * @param {string} name
     * @param {any} [value]
     * @returns {JQLite|any}
     */
    inheritedData(name: string, value?: any): JQLite | any;
    /**
     * Gets or sets innerHTML on the first element in JQLite collection
     * @param {string} [value]
     * @returns {JQLite|any|undefined}
     */
    html(value?: string): JQLite | any | undefined;
    /**
     * Get the combined text contents of each element in the JQLite collection
     * or set the text contents of all elements.
     * @param {string} [value]
     * @returns {JQLite|string}
     */
    text(value?: string): JQLite | string;
    /**
     * @param {string|Object} name
     * @param {any} value
     * @returns
     */
    attr(name: string | any, value: any): any;
    /**
     * @param {string|any} key - The key (as a string) to get/set or an object for mass-setting.
     * @param {any} [value] - The value to set. If not provided, the function acts as a getter.
     * @returns {JQLite|any} - The retrieved data if acting as a getter. Otherwise, returns undefined.
     */
    data(key: string | any, value?: any): JQLite | any;
    replaceWith(arg1: any): this;
    children(): JQLite;
    /**
     * @param {string|JQLite} node
     * @returns {JQLite}
     */
    append(node: string | JQLite): JQLite;
    /**
     * @param {string|JQLite} node
     * @returns {JQLite}
     */
    prepend(node: string | JQLite): JQLite;
    /**
     * @param {string} newElement
     * @returns {JQLite}
     */
    after(newElement: string): JQLite;
    /**
     * @param {boolean} [keepData]
     * @returns
     */
    remove(keepData?: boolean): this;
    detach(): this;
    parent(): any;
    find(selector: any): any;
    /**
     * TODO: REMOVE! This function being used ONLY in tests!
     */
    triggerHandler(event: any, extraParameters: any): this;
    toString(): string;
    eq(index: any): JQLite;
    length: number;
}
/**
 * Converts kebab-case to camelCase.
 * @param {string} name Name to normalize
 * @returns {string}
 */
export function kebabToCamel(name: string): string;
/**
 * Converts sname to camelCase.
 * @param {string} name
 * @returns {string}
 */
export function snakeToCamel(name: string): string;
/**
 * Removes expando data from this element. If key is provided, only
 * its field is removed. If data is empty, also removes `ExpandoStore`
 * from cache.
 * @param {Element} element
 * @param {string} [name] - key of field to remove
 */
export function removeElementData(element: Element, name?: string): void;
/**
 * Stores data associated with an element inside the expando property of the DOM element.
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Glossary/Expando MDN Glossary: Expando}
 *
 * @param {Element} element
 * @param {boolean} [createIfNecessary=false]
 * @returns {import("../../core/cache/cache.js").ExpandoStore}
 */
export function getExpando(element: Element, createIfNecessary?: boolean): import("../../core/cache/cache.js").ExpandoStore;
/**
 * Checks if the string contains HTML tags or entities.
 * @param {string} html
 * @returns {boolean} True if the string is plain text, false if it contains HTML tags or entities.
 */
export function isTextNode(html: string): boolean;
/**
 * @param {string} html
 * @returns {DocumentFragment}
 */
export function buildFragment(html: string): DocumentFragment;
/**
 * @param {Element} element
 * @param {boolean} [onlyDescendants]
 * @returns {void}
 */
export function dealoc(element: Element, onlyDescendants?: boolean): void;
/**
 * Gets or sets cache data for a given element.
 *
 * @param {Element} element - The DOM element to get or set data on.
 * @param {string|Object} key - The key (as a string) to get/set or an object for mass-setting.
 * @param {*} [value] - The value to set. If not provided, the function acts as a getter.
 * @returns {*} - The retrieved data if acting as a getter. Otherwise, returns undefined.
 */
export function getOrSetCacheData(element: Element, key: string | any, value?: any): any;
/**
 * Gets or sets cache data for a given element.
 *
 * @param {Element} element - The DOM element to get or set data on.
 * @param {string} key - The key (as a string) to get/set or an object for mass-setting.
 * @param {*} [value] - The value to set. If not provided, the function acts as a getter.
 * @returns
 */
export function setCacheData(element: Element, key: string, value?: any): void;
/**
 * @param {Node} element
 * @param {string} [name]
 * @returns
 */
export function getController(element: Node, name?: string): any;
/**
 *
 * @param {Node} element
 * @param {string|string[]} name
 * @param {any} [value]
 * @returns
 */
export function getInheritedData(element: Node, name: string | string[], value?: any): any;
/**
 *
 * @param {Element} element
 * @param {boolean} keepData
 */
export function removeElement(element: Element, keepData?: boolean): void;
/**
 * Extracts the starting tag from an HTML string or DOM element.
 *
 * @param {string|Element} elementOrStr - The HTML string or DOM element to process.
 * @returns {string} The starting tag or processed result.
 */
export function startingTag(elementOrStr: string | Element): string;
/**
 * Return the DOM siblings between the first and last node in the given array.
 * @param {JQLite|Array} nodes An array-like object
 * @returns {JQLite} the inputted object or a JQLite collection containing the nodes
 */
export function getBlockNodes(nodes: JQLite | any[]): JQLite;
export function getBooleanAttrName(element: any, name: any): any;
/**
 * Takes an array of elements, calls any `$destroy` event handlers, removes any data in cache, and finally removes any
 * listeners.
 * @param {NodeListOf<Element>|Element[]} nodes
 */
export function cleanElementData(nodes: NodeListOf<Element> | Element[]): void;
/**
 * Return instance of injector attached to element
 * @returns {import('../../core/di/internal-injector.js').InjectorService}
 */
export function getInjector(element: any): import("../../core/di/internal-injector.js").InjectorService;
export function setData(element: any, key: any, value: any): void;
/**
 * Creates a DOM element from an HTML string.
 * @param {string} htmlString - A string representing the HTML to parse.
 * @returns {Element} - The parsed DOM element.
 */
export function createElementFromHTML(htmlString: string): Element;
/**
 * Appends nodes or an HTML string to a given DOM element.
 * @param {Element} element - The element to append nodes to.
 * @param {Node | Node[] | string} nodes - Nodes or HTML string to append.
 */
export function appendNodesToElement(element: Element, nodes: Node | Node[] | string): void;
export const BOOLEAN_ATTR: {};
