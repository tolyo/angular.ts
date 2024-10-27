import {
  minErr,
  arrayRemove,
  concat,
  extend,
  isDefined,
  isFunction,
  isObject,
  isString,
  isUndefined,
  lowercase,
  getNodeName,
  shallowCopy,
} from "../utils";
import { CACHE, EXPANDO } from "../../core/cache/cache";

/** @type {number} */
let jqId = 1;

const DASH_LOWERCASE_REGEXP = /-([a-z])/g;
const UNDERSCORE_LOWERCASE_REGEXP = /_([a-z])/g;
const MOUSE_EVENT_MAP = { mouseleave: "mouseout", mouseenter: "mouseover" };
const JQLiteMinErr = minErr("jqLite");

const SINGLE_TAG_REGEXP = /^<([\w-]+)\s*\/?>(?:<\/\1>|)$/;
const TAG_NAME_REGEXP = /<([\w:-]+)/;

// Table parts need to be wrapped with `<table>` or they're
// stripped to their contents when put in a div.
// XHTML parsers do not magically insert elements in the
// same way that tag soup parsers do, so we cannot shorten
// this by omitting <tbody> or other required elements.
const wrapMap = {
  thead: ["table"],
  col: ["colgroup", "table"],
  tr: ["tbody", "table"],
  td: ["tr", "tbody", "table"],
};

wrapMap.tbody =
  wrapMap.tfoot =
  wrapMap.colgroup =
  wrapMap.caption =
    wrapMap.thead;
wrapMap.th = wrapMap.td;

export const BOOLEAN_ATTR = {};
"multiple,selected,checked,disabled,readOnly,required,open"
  .split(",")
  .forEach((value) => {
    BOOLEAN_ATTR[lowercase(value)] = value;
  });
const BOOLEAN_ELEMENTS = {};
"input,select,option,textarea,button,form,details"
  .split(",")
  .forEach((value) => {
    BOOLEAN_ELEMENTS[value] = true;
  });

/**
 * JQLite is both a function and an array-like data structure for manipulation of DOM, linking elements to expando cache,
 * and execution of chains of functions.
 *
 * @param {string|Node|Node[]|NodeList|JQLite|ArrayLike<Element>|(() => void)|Window} element
 * @returns {JQLite}
 */
export function JQLite(element) {
  if (element instanceof JQLite) {
    return /** @type {JQLite} */ (element);
  }

  let argIsString = false;

  if (isString(element)) {
    element = /** @type {string} */ (element).trim();
    argIsString = true;
  }

  if (!(this instanceof JQLite)) {
    if (argIsString && /** @type {string} */ (element).charAt(0) !== "<") {
      throw JQLiteMinErr(
        "nosel",
        "Looking up elements via selectors is not supported by JQLite! See: http://docs.angularjs.org/api/angular.element",
      );
    }
    return new JQLite(element);
  }

  if (argIsString) {
    const parsed = parseHtml(/** @type {string} */ (element));
    addNodes(this, parsed);
  } else if (isFunction(element)) {
    onReady(/** @type {Function} */ (element));
  } else {
    addNodes(this, element);
  }
}

/// ///////////////////////////////////////
// Functions which are declared directly.
/// ///////////////////////////////////////
JQLite.prototype = {
  toString() {
    const value = [];
    for (var i = 0; i < this.length; i++) {
      value.push(`${this[i]}`);
    }
    return `[${value.join(", ")}]`;
  },

  eq(index) {
    return index >= 0 ? JQLite(this[index]) : JQLite(this[this.length + index]);
  },

  length: 0,
};

/**
 * @returns {Element[]}
 */
JQLite.prototype.elements = function () {
  /** @type {Element[]} */
  let elements = [];
  for (let index = 0; index < this.length; index++) {
    elements.push(this[index]);
  }
  return elements;
};

/**
 * Remove all child nodes of the set of matched elements from the DOM and clears CACHE data, associated with the node.
 * @returns {JQLite} The current instance of JQLite.
 */
JQLite.prototype.empty = function () {
  for (let i = 0; i < this.length; i++) {
    const element = this[i];
    dealoc(element, true);
    // we may run into situation where we empty a transcluded node
    if (
      [
        Node.ELEMENT_NODE,
        Node.DOCUMENT_NODE,
        Node.DOCUMENT_FRAGMENT_NODE,
      ].includes(element.nodeType)
    ) {
      element.replaceChildren();
    }
  }
  return this;
};

/**
 * Returns the `$scope` of the element.
 * @returns {import("../../core/scope/scope").Scope}
 */
JQLite.prototype.scope = function () {
  // Can't use JQLiteData here directly so we stay compatible with jQuery!
  return (
    getOrSetCacheData(this[0], "$scope") ||
    getInheritedData(this[0].parentNode || this[0], ["$isolateScope", "$scope"])
  );
};

/**
 * Returns the isolate `$scope` of the element.
 * @returns {import("../../core/scope/scope").Scope}
 */
JQLite.prototype.isolateScope = function () {
  return (
    getOrSetCacheData(this[0], "$isolateScope") ||
    getOrSetCacheData(this[0], "$isolateScopeNoTemplate")
  );
};

/**
 * Return instance of controller attached to element
 * @param {string} [name] - Controller name
 * @returns {any}
 */
JQLite.prototype.controller = function (name) {
  return getController(this[0], name);
};

/**
 * Return instance of injector attached to element
 * @returns {import('../../core/di/internal-injector').InjectorService}
 */
JQLite.prototype.injector = function () {
  return getInheritedData(this[0], "$injector");
};

/**
 * Adds an event listener to each element in the JQLite collection.
 *
 * @param {string} type - The event type(s) to listen for. Multiple event types can be specified, separated by a space.
 * @param {Function} fn - The function to execute when the event is triggered.
 * @returns {JQLite} The JQLite collection for chaining.
 */
JQLite.prototype.on = function (type, fn) {
  // Do not add event handlers to non-elements because they will not be cleaned up.
  for (let i = 0; i < this.length; i++) {
    const element = this[i];
    if (!elementAcceptsData(element)) {
      return;
    }

    const expandoStore = getExpando(element, true);

    if (!expandoStore.handle) {
      expandoStore.handle = createEventHandler(element, expandoStore.events);
    }
    // http://jsperf.com/string-indexof-vs-split
    const types = type.indexOf(" ") >= 0 ? type.split(" ") : [type];
    let j = types.length;

    const addHandler = function (type, specialHandlerWrapper, noEventListener) {
      let eventFns = expandoStore.events[type];

      if (!eventFns) {
        eventFns = expandoStore.events[type] = [];
        eventFns.specialHandlerWrapper = specialHandlerWrapper;
        if (type !== "$destroy" && !noEventListener) {
          element.addEventListener(type, expandoStore.handle);
        }
      }

      eventFns.push(fn);
    };

    while (j--) {
      type = types[j];
      if (MOUSE_EVENT_MAP[type]) {
        addHandler(MOUSE_EVENT_MAP[type], specialMouseHandlerWrapper);
        addHandler(type, undefined, true);
      } else {
        addHandler(type);
      }
    }
  }
  return this;
};

/**
 * Removes an event listener to each element in JQLite collection.
 *
 * @param {string} type - The event type(s) to remove listener from
 * @param {Function} [fn] - The function to remove from event type.
 * @returns {JQLite}
 */
JQLite.prototype.off = function (type, fn) {
  for (let i = 0; i < this.length; i++) {
    const element = this[i];
    const expandoStore = getExpando(element);
    const events = expandoStore && expandoStore.events;
    const handle = expandoStore && expandoStore.handle;

    if (!handle) return; // no listeners registered

    if (!type) {
      for (type in events) {
        if (type !== "$destroy") {
          element.removeEventListener(type, handle);
        }
        delete events[type];
      }
    } else {
      const removeHandler = function (type) {
        const listenerFns = events[type];
        if (isDefined(fn) && Array.isArray(listenerFns)) {
          arrayRemove(listenerFns, fn);
        }
        if (!(isDefined(fn) && listenerFns && listenerFns.length > 0)) {
          element.removeEventListener(type, handle);
          delete events[type];
        }
      };

      type.split(" ").forEach((type) => {
        removeHandler(type);
        if (MOUSE_EVENT_MAP[type]) {
          removeHandler(MOUSE_EVENT_MAP[type]);
        }
      });
    }

    removeIfEmptyData(element);
  }
  return this;
};

/**
 * Remove data  by name from cache associated with each element in JQLite collection.
 * @param {string} name - The key of the data associated with element
 * @returns {JQLite}
 */
JQLite.prototype.removeData = function (name) {
  for (let i = 0; i < this.length; i++) {
    const element = this[i];
    removeElementData(element, name);
  }
  return this;
};

/**
 * Gets or sets data on a parent element
 * @param {string} name
 * @param {any} [value]
 * @returns {JQLite|any}
 */
JQLite.prototype.inheritedData = function (name, value) {
  for (let i = 0; i < this.length; i++) {
    const element = this[0];
    let res = getInheritedData(element, name, value);
    if (value) {
      return this;
    } else {
      return res;
    }
  }
};

/**
 * Gets or sets innerHTML on the first element in JQLite collection
 * @param {string} [value]
 * @returns {JQLite|any|undefined}
 */
JQLite.prototype.html = function (value) {
  const element = this[0];
  if (!element) return undefined;
  if (isUndefined(value)) {
    return element.innerHTML;
  }
  dealoc(element, true);
  element.innerHTML = value;
  return this;
};

/**
 * Get the combined text contents of each element in the JQLite collection
 * or set the text contents of all elements.
 * @param {string} [value]
 * @returns {JQLite|string}
 */
JQLite.prototype.text = function (value) {
  let res = "";
  for (let i = 0; i < this.length; i++) {
    const element = this[i];
    if (isUndefined(value)) {
      // read
      const { nodeType } = element;
      res +=
        nodeType === Node.ELEMENT_NODE || nodeType === Node.TEXT_NODE
          ? element.textContent
          : "";
    } else {
      // write
      element.textContent = value;
    }
  }

  if (isUndefined(value)) {
    return res;
  } else {
    return this;
  }
};

/**
 * Gets or sets the values of form elements such as input, select and textarea in a JQLite collection.
 * @param {any} value
 * @returns {JQLite|any}
 */
JQLite.prototype.val = function (value) {
  // We can only get or set a value of
  for (let i = 0; i < this.length; i++) {
    const element = this[i];
    if (isUndefined(value)) {
      // read
      if (element.multiple && getNodeName(element) === "select") {
        const result = [];
        Array.from(element.options).forEach((option) => {
          if (option.selected) {
            result.push(option.value || option.text);
          }
        });
        return result;
      }
      return element.value;
    } else {
      // write
      element.value = value;
      return this;
    }
  }
};

/**
 * @param {string|Object} name
 * @param {any} value
 * @returns
 */
JQLite.prototype.attr = function (name, value) {
  for (let i = 0; i < this.length; i++) {
    const element = this[i];
    let ret;
    const { nodeType } = element;
    if (
      nodeType === Node.TEXT_NODE ||
      nodeType === Node.ATTRIBUTE_NODE ||
      nodeType === Node.COMMENT_NODE ||
      !element.getAttribute
    ) {
      continue;
    }

    const lowercasedName = lowercase(name);
    const isBooleanAttr = BOOLEAN_ATTR[lowercasedName];

    if (isObject(name)) {
      for (let key in name) {
        element.setAttribute(key, isBooleanAttr ? lowercasedName : name[key]);
      }
    } else if (isDefined(value)) {
      // setter

      if (value === null || (value === false && isBooleanAttr)) {
        element.removeAttribute(name);
      } else {
        element.setAttribute(name, isBooleanAttr ? lowercasedName : value);
      }
    } else {
      // getter
      ret = element.getAttribute(name);
      if (isBooleanAttr && ret !== null) {
        ret = lowercasedName;
      }
      // Normalize non-existing attributes to undefined (as jQuery).
      return ret === null ? undefined : ret;
    }
  }

  if (isDefined(value) || isObject(name)) {
    return this;
  }
};

/**
 * @param {string|any} key - The key (as a string) to get/set or an object for mass-setting.
 * @param {any} [value] - The value to set. If not provided, the function acts as a getter.
 * @returns {JQLite|any} - The retrieved data if acting as a getter. Otherwise, returns undefined.
 */
JQLite.prototype.data = function (key, value) {
  let i;
  const nodeCount = this.length;
  if (isUndefined(value)) {
    if (isObject(key)) {
      // we are a write, but the object properties are the key/values
      for (i = 0; i < nodeCount; i++) {
        getOrSetCacheData(this[i], key);
      }
      return this;
    }
    // we are a read, so read the first child.
    const jj = isUndefined(value) ? Math.min(nodeCount, 1) : nodeCount;
    for (let j = 0; j < jj; j++) {
      const nodeValue = getOrSetCacheData(this[j], key, value);
      value = value ? value + nodeValue : nodeValue;
    }
    return value;
  }
  // we are a write, so apply to all children
  for (i = 0; i < nodeCount; i++) {
    getOrSetCacheData(this[i], key, value);
  }
  return this;
};

JQLite.prototype.replaceWith = function (arg1) {
  let value;
  let fn = function (element, replaceNode) {
    let index;
    const parent = element.parentNode;
    dealoc(element);
    const nodes = new JQLite(replaceNode);
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (index) {
        parent.insertBefore(node, index.nextSibling);
      } else {
        parent.replaceChild(node, element);
      }
      index = node;
    }
  };
  for (let i = 0; i < this.length; i++) {
    addNodes(value, fn(this[i], arg1));
  }
  return isDefined(value) ? value : this;
};

JQLite.prototype.children = function () {
  let value;
  let fn = (element) =>
    Array.from(element.childNodes).filter(
      (child) => child.nodeType === Node.ELEMENT_NODE,
    );
  for (let i = 0; i < this.length; i++) {
    value = JQLite(fn(this[i]));
  }
  return isDefined(value) ? value : this;
};

/**
 * @param {string|JQLite} node
 * @returns {JQLite}
 */
JQLite.prototype.append = function (node) {
  for (let i = 0; i < this.length; i++) {
    const element = this[i];
    const { nodeType } = element;
    if (
      nodeType !== Node.ELEMENT_NODE &&
      nodeType !== Node.DOCUMENT_FRAGMENT_NODE
    )
      return this;

    let newNode = new JQLite(node);

    for (let i = 0; i < newNode.length; i++) {
      const child = newNode[i];
      element.appendChild(child);
    }
  }
  return this;
};

/**
 * @param {string|JQLite} node
 * @returns {JQLite}
 */
JQLite.prototype.prepend = function (node) {
  for (let i = 0; i < this.length; i++) {
    const element = this[i];
    if (element.nodeType === Node.ELEMENT_NODE) {
      const index = element.firstChild;
      const el = new JQLite(node);
      for (let i = 0; i < el.length; i++) {
        element.insertBefore(el[i], index);
      }
    }
  }
  return this;
};

/**
 * @param {string} newElement
 * @returns {JQLite}
 */
JQLite.prototype.after = function (newElement) {
  for (let i = 0; i < this.length; i++) {
    const element = this[i];
    let index = element;
    const parent = element.parentNode;

    if (parent) {
      let el = new JQLite(newElement);

      for (let i = 0, ii = el.length; i < ii; i++) {
        const node = el[i];
        parent.insertBefore(node, index.nextSibling);
        index = node;
      }
    }
  }
  return this;
};

/**
 * @param {boolean} [keepData]
 * @returns
 */
JQLite.prototype.remove = function (keepData = false) {
  for (let i = 0; i < this.length; i++) {
    const element = this[i];
    removeElement(element, keepData);
  }
  return this;
};

JQLite.prototype.detach = function () {
  for (let i = 0; i < this.length; i++) {
    const element = this[i];
    removeElement(element, true);
  }
  return this;
};

JQLite.prototype.parent = function () {
  let value;
  let fn = (element) => {
    const parent = element.parentNode;
    return parent && parent.nodeType !== Node.DOCUMENT_FRAGMENT_NODE
      ? parent
      : null;
  };
  for (let i = 0, ii = this.length; i < ii; i++) {
    if (isUndefined(value)) {
      value = fn(this[i]);
      if (isDefined(value)) {
        value = JQLite(value);
      }
    } else {
      addNodes(value, fn(this[i]));
    }
  }
  return isDefined(value) ? value : this;
};

JQLite.prototype.find = function (selector) {
  let value;
  for (let i = 0, ii = this.length; i < ii; i++) {
    const element = this[i];

    if (isUndefined(value)) {
      if (element.getElementsByTagName) {
        value = element.getElementsByTagName(selector);
      } else {
        value = [];
      }
      if (isDefined(value)) {
        // any function which returns a value needs to be wrapped
        value = JQLite(value);
      }
    } else {
      if (element.getElementsByTagName) {
        addNodes(value, element.getElementsByTagName(selector));
      }
    }
  }
  return isDefined(value) ? value : this;
};

/**
 * TODO: REMOVE! This function being used ONLY in tests!
 */
JQLite.prototype.triggerHandler = function (event, extraParameters) {
  let value;
  let fn = function (element, event, extraParameters) {
    let dummyEvent;
    let eventFnsCopy;
    let handlerArgs;
    const eventName = event.type || event;
    const expandoStore = getExpando(element);
    const events = expandoStore && expandoStore.events;
    const eventFns = events && events[eventName];

    if (eventFns) {
      // Create a dummy event to pass to the handlers
      dummyEvent = {
        preventDefault() {
          this.defaultPrevented = true;
        },
        isDefaultPrevented() {
          return this.defaultPrevented === true;
        },
        stopImmediatePropagation() {
          this.immediatePropagationStopped = true;
        },
        isImmediatePropagationStopped() {
          return this.immediatePropagationStopped === true;
        },
        stopPropagation: () => {},
        type: eventName,
        target: element,
      };

      // If a custom event was provided then extend our dummy event with it
      if (event.type) {
        dummyEvent = extend(dummyEvent, event);
      }

      // Copy event handlers in case event handlers array is modified during execution.
      eventFnsCopy = shallowCopy(eventFns);
      handlerArgs = extraParameters
        ? [dummyEvent].concat(extraParameters)
        : [dummyEvent];

      eventFnsCopy.forEach((fn) => {
        if (!dummyEvent.isImmediatePropagationStopped()) {
          fn.apply(element, handlerArgs);
        }
      });
    }
  };
  for (let i = 0, ii = this.length; i < ii; i++) {
    if (isUndefined(value)) {
      fn(this[i], event, extraParameters);
    } else {
      addNodes(value, fn(this[i], event, extraParameters));
    }
  }
  return isDefined(value) ? value : this;
};

///////////////////////////////////////////////////////////////////
////////////        HELPER FUNCTIONS      /////////////////////////
///////////////////////////////////////////////////////////////////

/**
 *
 * @returns {number} Next unique JQInstance id
 */
function jqNextId() {
  return ++jqId;
}

/**
 * @param {string} _all
 * @param {string} letter
 * @returns {string}
 */
function fnCamelCaseReplace(_all, letter) {
  return letter.toUpperCase();
}

/**
 * Converts kebab-case to camelCase.
 * @param {string} name Name to normalize
 * @returns {string}
 */
export function kebabToCamel(name) {
  return name.replace(DASH_LOWERCASE_REGEXP, fnCamelCaseReplace);
}

/**
 * Converts sname to camelCase.
 * @param {string} name
 * @returns {string}
 */
export function snakeToCamel(name) {
  return name.replace(UNDERSCORE_LOWERCASE_REGEXP, fnCamelCaseReplace);
}

/**
 * Removes expando data from this element. If key is provided, only
 * its field is removed. If data is empty, also removes `ExpandoStore`
 * from cache.
 * @param {Element} element
 * @param {string} [name] - key of field to remove
 */
export function removeElementData(element, name) {
  const expandoId = element[EXPANDO];
  const expandoStore = expandoId && CACHE.get(expandoId);

  if (expandoStore) {
    if (name) {
      delete expandoStore.data[name];
    } else {
      expandoStore.data = {};
    }

    removeIfEmptyData(element);
  }
}

/**
 * Stores data associated with an element inside the expando property of the DOM element.
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Glossary/Expando MDN Glossary: Expando}
 *
 * @param {Element} element
 * @param {boolean} [createIfNecessary=false]
 * @returns {import("../../core/cache/cache").ExpandoStore}
 */
function getExpando(element, createIfNecessary = false) {
  let expandoId = element[EXPANDO];
  let expandoStore = expandoId && CACHE.get(expandoId);

  if (createIfNecessary && !expandoStore) {
    element[EXPANDO] = expandoId = jqNextId();
    expandoStore = {
      events: {},
      data: {},
      handle: null,
    };
    CACHE.set(expandoId, expandoStore);
  }

  return expandoStore;
}

/**
 * Checks if the string contains HTML tags or entities.
 * @param {string} html
 * @returns {boolean} True if the string is plain text, false if it contains HTML tags or entities.
 */
export function isTextNode(html) {
  return !/<|&#?\w+;/.test(html);
}

/**
 * Check if element can accept expando data
 * @param {Element} node
 * @returns {boolean}
 */
function elementAcceptsData(node) {
  // The window object can accept data but has no nodeType
  // Otherwise we are only interested in elements (1) and documents (9)
  switch (node.nodeType) {
    case Node.ELEMENT_NODE:
    case Node.DOCUMENT_NODE:
    case undefined: // window.object
      return true;
    default:
      return false;
  }
}

/**
 * @param {string} html
 * @returns {DocumentFragment}
 */
export function buildFragment(html) {
  /** @type {HTMLDivElement} */
  let tmp;
  let tag;
  let wrap;
  let tempFragment = document.createDocumentFragment();
  let nodes = [];
  let i;

  if (isTextNode(html)) {
    // Convert non-html into a text node
    nodes.push(document.createTextNode(html));
  } else {
    // Convert html into DOM nodes

    tmp = tempFragment.appendChild(document.createElement("div"));
    tag = (TAG_NAME_REGEXP.exec(html) || ["", ""])[1].toLowerCase();

    wrap = wrapMap[tag] || [];

    // Create wrappers & descend into them
    i = wrap.length;
    while (--i > -1) {
      tmp.appendChild(document.createElement(wrap[i]));
      tmp = /** @type {HTMLDivElement} */ (tmp.firstChild);
    }
    tmp.innerHTML = html;

    nodes = concat(nodes, tmp.childNodes);

    tmp = /** @type {HTMLDivElement} */ (tempFragment.firstChild);
    tmp.textContent = "";
  }

  let fragment = document.createDocumentFragment();
  fragment.append(...nodes);
  return fragment;
}

/**
 * @param {string} html
 * @returns {NodeListOf<ChildNode> | HTMLElement[]}
 */
function parseHtml(html) {
  let regEx = SINGLE_TAG_REGEXP.exec(html);
  if (regEx) {
    return [document.createElement(regEx[1])];
  }
  let fragment = buildFragment(html);
  if (fragment) {
    return fragment.childNodes;
  }

  return [];
}

/**
 * @param {Element} element
 * @param {boolean} [onlyDescendants]
 * @returns {void}
 */
export function dealoc(element, onlyDescendants) {
  if (!element) return;
  if (!onlyDescendants && elementAcceptsData(element))
    cleanElementData([element]);

  if (element.querySelectorAll) {
    cleanElementData(element.querySelectorAll("*"));
  }
}

/**
 * If `ExpandoStore.data` and `ExpandoStore.events` are empty,
 * then delete element's `ExpandoStore` and set its `ExpandoId`
 * to undefined.
 * @param {Element} element
 */
function removeIfEmptyData(element) {
  const expandoId = element[EXPANDO];
  const { events, data } = CACHE.get(expandoId);

  if (
    (!data || !Object.keys(data).length) &&
    (!events || !Object.keys(events).length)
  ) {
    CACHE.delete(expandoId);
    element[EXPANDO] = undefined; // don't delete DOM expandos. Chrome don't like it
  }
}

/**
 * Gets or sets cache data for a given element.
 *
 * @param {Element} element - The DOM element to get or set data on.
 * @param {string|Object} key - The key (as a string) to get/set or an object for mass-setting.
 * @param {*} [value] - The value to set. If not provided, the function acts as a getter.
 * @returns {*} - The retrieved data if acting as a getter. Otherwise, returns undefined.
 */
export function getOrSetCacheData(element, key, value) {
  if (elementAcceptsData(element)) {
    let prop;

    const isSimpleSetter = isDefined(value);
    const isSimpleGetter = !isSimpleSetter && key && !isObject(key);
    const massGetter = !key;
    const expandoStore = getExpando(element, !isSimpleGetter);
    const data = expandoStore && expandoStore.data;

    if (isSimpleSetter) {
      data[kebabToCamel(key)] = value;
    } else {
      if (massGetter) {
        return data;
      }
      if (isSimpleGetter) {
        // don't force creation of expandoStore if it doesn't exist yet
        return data && data[kebabToCamel(key)];
      }
      // mass-setter: data({key1: val1, key2: val2})
      for (prop in key) {
        data[kebabToCamel(prop)] = key[prop];
      }
    }
  } else {
    // TODO: check should occur perhaps prior at compilation level that this is a valid element
  }
}

/**
 * Adds nodes or elements to the root array-like object.
 *
 * @param {JQLite} root - The array-like object to which elements will be added.
 * @param {(Node|Array|NodeList|Object)} elements - The elements to add to the root. This can be a single DOM node, an array-like object (such as an Array or NodeList), or any other object.
 */
function addNodes(root, elements) {
  if (!elements) return;
  // If a Node (the most common case)
  if (elements.nodeType) {
    root[root.length++] = elements;
    return;
  }
  const length = elements.length;
  // If elements is an Array or NodeList, but not a Window object
  if (typeof length === "number" && elements.window !== elements) {
    for (let i = 0; i < length; i++) {
      root[root.length++] = elements[i];
    }
  } else {
    root[root.length++] = elements;
  }
}

/**
 * @param {Node} element
 * @param {string} name
 * @returns
 */
function getController(element, name) {
  return getInheritedData(element, `$${name || "ngController"}Controller`);
}

/**
 *
 * @param {Node} element
 * @param {string|string[]} name
 * @param {any} [value]
 * @returns
 */
function getInheritedData(element, name, value) {
  // if element is the document object work with the html element instead
  // this makes $(document).scope() possible
  if (element.nodeType === Node.DOCUMENT_NODE) {
    element = /** @type {Document} */ (element).documentElement;
  }
  const names = Array.isArray(name) ? name : [name];

  while (element) {
    for (let i = 0, ii = names.length; i < ii; i++) {
      if (
        isDefined(
          (value = getOrSetCacheData(
            /** @type {Element} */ (element),
            names[i],
          )),
        )
      )
        return value;
    }

    // If dealing with a document fragment node with a host element, and no parent, use the host
    // element as the parent. This enables directives within a Shadow DOM or polyfilled Shadow DOM
    // to lookup parent controllers.
    element =
      element.parentNode ||
      (element.nodeType === Node.DOCUMENT_FRAGMENT_NODE &&
        /** @type {ShadowRoot} */ (element).host);
  }
}

/**
 *
 * @param {Element} element
 * @param {boolean} keepData
 */
export function removeElement(element, keepData = false) {
  if (!keepData) dealoc(element);
  const parent = element.parentNode;
  if (parent) parent.removeChild(element);
}

/**
 * Execute a function on `DOMContentLoaded`
 * @param {Function} fn
 */
function onReady(fn) {
  function trigger() {
    document.removeEventListener("DOMContentLoaded", trigger);
    fn();
  }
  // check if document is already loaded
  if (document.readyState === "complete") {
    setTimeout(fn);
  } else {
    // We can not use JQLite since we are not done loading.
    document.addEventListener("DOMContentLoaded", trigger);
  }
}

function createEventHandler(element, events) {
  const eventHandler = function (event, type) {
    // jQuery specific api
    event.isDefaultPrevented = function () {
      return event.defaultPrevented;
    };

    let eventFns = events[type || event.type];
    const eventFnsLength = eventFns ? eventFns.length : 0;

    if (!eventFnsLength) return;

    if (isUndefined(event.immediatePropagationStopped)) {
      const originalStopImmediatePropagation = event.stopImmediatePropagation;
      event.stopImmediatePropagation = function () {
        event.immediatePropagationStopped = true;

        if (event.stopPropagation) {
          event.stopPropagation();
        }

        if (originalStopImmediatePropagation) {
          originalStopImmediatePropagation.call(event);
        }
      };
    }

    event.isImmediatePropagationStopped = function () {
      return event.immediatePropagationStopped === true;
    };

    // Some events have special handlers that wrap the real handler
    const handlerWrapper =
      eventFns.specialHandlerWrapper || defaultHandlerWrapper;

    // Copy event handlers in case event handlers array is modified during execution.
    if (eventFnsLength > 1) {
      eventFns = shallowCopy(eventFns);
    }

    for (let i = 0; i < eventFnsLength; i++) {
      if (!event.isImmediatePropagationStopped()) {
        handlerWrapper(element, event, eventFns[i]);
      }
    }
  };

  // TODO: this is a hack for angularMocks/clearDataCache that makes it possible to deregister all
  //       events on `element`
  eventHandler.elem = element;
  return eventHandler;
}

function defaultHandlerWrapper(element, event, handler) {
  handler.call(element, event);
}

/**
 * @param {Node} target
 * @param {*} event
 * @param {*} handler
 */
function specialMouseHandlerWrapper(target, event, handler) {
  // Refer to jQuery's implementation of mouseenter & mouseleave
  // Read about mouseenter and mouseleave:
  // http://www.quirksmode.org/js/events_mouse.html#link8
  const related = event.relatedTarget;
  // For mousenter/leave call the handler if related is outside the target.
  // NB: No relatedTarget if the mouse left/entered the browser window
  if (!related || (related !== target && !target.contains(related))) {
    handler.call(target, event);
  }
}

/**
 * @param {string|JQLite} elementStr
 * @returns {string} Returns the string representation of the element.
 */
export function startingTag(elementStr) {
  const clone = JQLite(elementStr)[0].cloneNode(true);
  const element = JQLite(clone).empty();
  const elemHtml = JQLite("<div></div>").append(element[0]).html();
  try {
    return element[0].nodeType === Node.TEXT_NODE
      ? lowercase(elemHtml)
      : elemHtml
          .match(/^(<[^>]+>)/)[1]
          .replace(/^<([\w-]+)/, function (match, nodeName) {
            return "<" + lowercase(nodeName);
          });
  } catch (e) {
    return lowercase(elemHtml);
  }
}

/**
 * Return the DOM siblings between the first and last node in the given array.
 * @param {JQLite|Array} nodes An array-like object
 * @returns {JQLite} the inputted object or a JQLite collection containing the nodes
 */
export function getBlockNodes(nodes) {
  // TODO(perf): update `nodes` instead of creating a new object?
  let node = nodes[0];
  const endNode = nodes[nodes.length - 1];
  let blockNodes;

  for (let i = 1; node !== endNode && (node = node.nextSibling); i++) {
    if (blockNodes || nodes[i] !== node) {
      if (!blockNodes) {
        // use element to avoid circular dependency
        blockNodes = Array.prototype.slice.call(nodes, 0, i);
      }
      blockNodes.push(node);
    }
  }

  return JQLite(blockNodes || nodes);
}

export function getBooleanAttrName(element, name) {
  // check dom last since we will most likely fail on name
  const booleanAttr = BOOLEAN_ATTR[name.toLowerCase()];

  // booleanAttr is here twice to minimize DOM access
  return booleanAttr && BOOLEAN_ELEMENTS[getNodeName(element)] && booleanAttr;
}

/**
 * Takes an array of elements, calls any `$destroy` event handlers, removes any data in cache, and finally removes any
 * listeners.
 * @param {NodeListOf<Element>|Element[]} nodes
 */
export function cleanElementData(nodes) {
  for (let i = 0, ii = nodes.length; i < ii; i++) {
    const events = (CACHE.get(nodes[i][EXPANDO]) || {}).events;
    if (events && events.$destroy) {
      JQLite(nodes[i]).triggerHandler("$destroy");
    }
    removeElementData(nodes[i]);
    JQLite.prototype.off.call(JQLite(nodes[i]));
  }
}
