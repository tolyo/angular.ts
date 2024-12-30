import { getBooleanAttrName } from "../../shared/jqlite/jqlite";
import {
  isString,
  snakeCase,
  isUndefined,
  arrayRemove,
  minErr,
  trim,
  directiveNormalize,
} from "../../shared/utils";
import { ALIASED_ATTR } from "../../shared/constants";

const $compileMinErr = minErr("$compile");
const SIMPLE_ATTR_NAME = /^\w/;
const specialAttrHolder = document.createElement("div");

/**
 * @typedef {Object} AttributeLike
 * @property {Object} $attr
 */

/**
 * @extends {AttributeLike}
 */
export class Attributes {
  /**
   * @param {import('../scope/scope').Scope} $rootScope
   * @param {*} $animate
   * @param {import("../exception-handler").ErrorHandler} $exceptionHandler
   * @param {*} $sce
   * @param {import('../../shared/jqlite/jqlite').JQLite} [element]
   * @param {*} [attributesToCopy]
   */
  constructor(
    $rootScope,
    $animate,
    $exceptionHandler,
    $sce,
    element,
    attributesToCopy,
  ) {
    this.$rootScope = $rootScope;
    this.$animate = $animate;
    this.$exceptionHandler = $exceptionHandler;
    this.$sce = $sce;
    if (attributesToCopy) {
      const keys = Object.keys(attributesToCopy);
      for (let i = 0, l = keys.length; i < l; i++) {
        const key = keys[i];
        this[key] = attributesToCopy[key];
      }
    } else {
      this.$attr = {};
    }
    this.$$element = element;
  }

  /**
   * Converts an attribute name (e.g. dash/colon/underscore-delimited string, optionally prefixed with `x-` or
   * `data-`) to its normalized, camelCase form.
   *
   * Also there is special case for Moz prefix starting with upper case letter.
   *
   * For further information check out the guide on {@link guide/directive#matching-directives Matching Directives}
   *
   * @param {string} name Name to normalize
   */
  $normalize = directiveNormalize;

  /**
   * Adds the CSS class value specified by the classVal parameter to the element. If animations
   * are enabled then an animation will be triggered for the class addition.
   *
   * @param {string} classVal The className value that will be added to the element
   */
  $addClass(classVal) {
    if (classVal && classVal.length > 0) {
      this.$animate.addClass(this.$$element, classVal);
    }
  }

  /**
   * Removes the CSS class value specified by the classVal parameter from the element. If
   * animations are enabled then an animation will be triggered for the class removal.
   *
   * @param {string} classVal The className value that will be removed from the element
   */
  $removeClass(classVal) {
    if (classVal && classVal.length > 0) {
      this.$animate.removeClass(this.$$element, classVal);
    }
  }

  /**
   * Adds and removes the appropriate CSS class values to the element based on the difference
   * between the new and old CSS class values (specified as newClasses and oldClasses).
   *
   * @param {string} newClasses The current CSS className value
   * @param {string} oldClasses The former CSS className value
   */
  $updateClass(newClasses, oldClasses) {
    const toAdd = tokenDifference(newClasses, oldClasses);
    if (toAdd && toAdd.length) {
      this.$animate.addClass(this.$$element, toAdd);
    }

    const toRemove = tokenDifference(oldClasses, newClasses);
    if (toRemove && toRemove.length) {
      this.$animate.removeClass(this.$$element, toRemove);
    }
  }

  /**
   * Set a normalized attribute on the element in a way such that all directives
   * can share the attribute. This function properly handles boolean attributes.
   * @param {string} key Normalized key. (ie ngAttribute)
   * @param {string|boolean} value The value to set. If `null` attribute will be deleted.
   * @param {boolean=} writeAttr If false, does not write the value to DOM element attribute.
   *     Defaults to true.
   * @param {string=} attrName Optional none normalized name. Defaults to key.
   */
  $set(key, value, writeAttr, attrName) {
    // TODO: decide whether or not to throw an error if "class"
    // is set through this function since it may cause $updateClass to
    // become unstable.

    const node = this.$$element[0];
    const booleanKey = getBooleanAttrName(node, key);
    const aliasedKey = ALIASED_ATTR[key];
    let observer = key;

    if (booleanKey) {
      this.$$element[0][key] = value;
      attrName = booleanKey;
    } else if (aliasedKey) {
      this[aliasedKey] = value;
      observer = aliasedKey;
    }

    this[key] = value;

    // translate normalized key to actual key
    if (attrName) {
      this.$attr[key] = attrName;
    } else {
      attrName = this.$attr[key];
      if (!attrName) {
        this.$attr[key] = attrName = snakeCase(key, "-");
      }
    }

    let nodeName = this.$$element[0].nodeName.toLowerCase();

    // Sanitize img[srcset] values.
    if (nodeName === "img" && key === "srcset") {
      this[key] = value = this.sanitizeSrcset(value, "$set('srcset', value)");
    }

    if (writeAttr !== false) {
      if (value === null || isUndefined(value)) {
        this.$$element[0].removeAttribute(attrName);
        //
      } else if (SIMPLE_ATTR_NAME.test(attrName)) {
        // jQuery skips special boolean attrs treatment in XML nodes for
        // historical reasons and hence AngularJS cannot freely call
        // `.attr(attrName, false) with such attributes. To avoid issues
        // in XHTML, call `removeAttr` in such cases instead.
        // See https://github.com/jquery/jquery/issues/4249
        if (booleanKey && value === false) {
          this.$$element[0].removeAttribute(attrName);
        } else {
          this.$$element.attr(attrName, value);
        }
      } else {
        this.setSpecialAttr(this.$$element[0], attrName, value);
      }
    }

    // fire observers
    const { $$observers } = this;
    if ($$observers && $$observers[observer]) {
      $$observers[observer].forEach((fn) => {
        try {
          fn(value);
        } catch (e) {
          this.$exceptionHandler(e);
        }
      });
    }
  }

  /**
 * Observes an interpolated attribute.
 *
 * The observer function will be invoked once during the next `$digest` following
 * compilation. The observer is then invoked whenever the interpolated value
 * changes.
 *
 * @param {string} key Normalized key. (ie ngAttribute) .
 * @param {any} fn Function that will be called whenever
          the interpolated value of the attribute changes.
 *        See the {@link guide/interpolation#how-text-and-attribute-bindings-work Interpolation
 *        guide} for more info.
 * @returns {function()} Returns a deregistration function for this observer.
 */
  $observe(key, fn) {
    const $$observers =
      this.$$observers || (this.$$observers = Object.create(null));
    const listeners = $$observers[key] || ($$observers[key] = []);

    listeners.push(fn);
    if (
      !listeners.$$inter &&
      Object.prototype.hasOwnProperty.call(this, key) &&
      !isUndefined(this[key])
    ) {
      // no one registered attribute interpolation function, so lets call it manually
      fn(this[key]);
    }

    return function () {
      arrayRemove(listeners, fn);
    };
  }

  setSpecialAttr(element, attrName, value) {
    // Attributes names that do not start with letters (such as `(click)`) cannot be set using `setAttribute`
    // so we have to jump through some hoops to get such an attribute
    // https://github.com/angular/angular.js/pull/13318
    specialAttrHolder.innerHTML = `<span ${attrName}>`;
    const { attributes } = /** @type {Element} */ (
      specialAttrHolder.firstChild
    );
    const attribute = attributes[0];
    // We have to remove the attribute from its container element before we can add it to the destination element
    attributes.removeNamedItem(attribute.name);
    attribute.value = value;
    element.attributes.setNamedItem(attribute);
  }

  sanitizeSrcset(value, invokeType) {
    if (!value) {
      return value;
    }
    if (!isString(value)) {
      throw $compileMinErr(
        "srcset",
        'Can\'t pass trusted values to `{0}`: "{1}"',
        invokeType,
        value.toString(),
      );
    }

    // Such values are a bit too complex to handle automatically inside $sce.
    // Instead, we sanitize each of the URIs individually, which works, even dynamically.

    // It's not possible to work around this using `$sce.trustAsMediaUrl`.
    // If you want to programmatically set explicitly trusted unsafe URLs, you should use
    // `$sce.trustAsHtml` on the whole `img` tag and inject it into the DOM using the
    // `ng-bind-html` directive.

    var result = "";

    // first check if there are spaces because it's not the same pattern
    var trimmedSrcset = trim(value);
    //                (   999x   ,|   999w   ,|   ,|,   )
    var srcPattern = /(\s+\d+x\s*,|\s+\d+w\s*,|\s+,|,\s+)/;
    var pattern = /\s/.test(trimmedSrcset) ? srcPattern : /(,)/;

    // split srcset into tuple of uri and descriptor except for the last item
    var rawUris = trimmedSrcset.split(pattern);

    // for each tuples
    var nbrUrisWith2parts = Math.floor(rawUris.length / 2);
    for (var i = 0; i < nbrUrisWith2parts; i++) {
      var innerIdx = i * 2;
      // sanitize the uri
      result += this.$sce.getTrustedMediaUrl(trim(rawUris[innerIdx]));
      // add the descriptor
      result += " " + trim(rawUris[innerIdx + 1]);
    }

    // split the last item into uri and descriptor
    var lastTuple = trim(rawUris[i * 2]).split(/\s/);

    // sanitize the last uri
    result += this.$sce.getTrustedMediaUrl(trim(lastTuple[0]));

    // and add the last descriptor if any
    if (lastTuple.length === 2) {
      result += " " + trim(lastTuple[1]);
    }
    return result;
  }
}

/**
 * Computes the difference between two space-separated token strings.
 *
 * @param {string} str1 - The first string containing space-separated tokens.
 * @param {string} str2 - The second string containing space-separated tokens.
 * @returns {string} A string containing tokens that are in str1 but not in str2, separated by spaces.
 *
 * @example
 * // returns "apple orange"
 * tokenDifference("apple banana orange", "banana grape");
 */
function tokenDifference(str1, str2) {
  let values = "";
  const tokens1 = str1.split(/\s+/);
  const tokens2 = str2.split(/\s+/);

  outer: for (let i = 0; i < tokens1.length; i++) {
    const token = tokens1[i];
    for (let j = 0; j < tokens2.length; j++) {
      if (token === tokens2[j]) continue outer;
    }
    values += (values.length > 0 ? " " : "") + token;
  }
  return values;
}
