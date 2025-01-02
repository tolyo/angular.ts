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
    constructor($rootScope: import("../scope/scope").Scope, $animate: any, $exceptionHandler: import("../exception-handler").ErrorHandler, $sce: any, element?: import("../../shared/jqlite/jqlite").JQLite, attributesToCopy?: any);
    $rootScope: import("../scope/scope").Scope;
    $animate: any;
    $exceptionHandler: import("../exception-handler").ErrorHandler;
    $sce: any;
    $attr: {};
    $$element: import("../../shared/jqlite/jqlite.js").JQLite;
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
    $normalize: typeof directiveNormalize;
    /**
     * Adds the CSS class value specified by the classVal parameter to the element. If animations
     * are enabled then an animation will be triggered for the class addition.
     *
     * @param {string} classVal The className value that will be added to the element
     */
    $addClass(classVal: string): void;
    /**
     * Removes the CSS class value specified by the classVal parameter from the element. If
     * animations are enabled then an animation will be triggered for the class removal.
     *
     * @param {string} classVal The className value that will be removed from the element
     */
    $removeClass(classVal: string): void;
    /**
     * Adds and removes the appropriate CSS class values to the element based on the difference
     * between the new and old CSS class values (specified as newClasses and oldClasses).
     *
     * @param {string} newClasses The current CSS className value
     * @param {string} oldClasses The former CSS className value
     */
    $updateClass(newClasses: string, oldClasses: string): void;
    /**
     * Set a normalized attribute on the element in a way such that all directives
     * can share the attribute. This function properly handles boolean attributes.
     * @param {string} key Normalized key. (ie ngAttribute)
     * @param {string|boolean} value The value to set. If `null` attribute will be deleted.
     * @param {boolean=} writeAttr If false, does not write the value to DOM element attribute.
     *     Defaults to true.
     * @param {string=} attrName Optional none normalized name. Defaults to key.
     */
    $set(key: string, value: string | boolean, writeAttr?: boolean | undefined, attrName?: string | undefined): void;
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
    $observe(key: string, fn: any): () => any;
    $$observers: any;
    setSpecialAttr(element: any, attrName: any, value: any): void;
    sanitizeSrcset(value: any, invokeType: any): any;
    srcset: any;
}
export type AttributeLike = {
    $attr: any;
};
import { directiveNormalize } from "../../shared/utils";
