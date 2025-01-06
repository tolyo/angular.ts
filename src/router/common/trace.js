/**
 * # Transition tracing (debug)
 *
 * Enable transition tracing to print transition information to the console,
 * in order to help debug your application.
 * Tracing logs detailed information about each Transition to your console.
 *
 * To enable tracing, import the [[Trace]] singleton and enable one or more categories.
 *
 * ### ES6
 * ```js
 * import {trace} from "@uirouter/core/index";
 * trace.enable(1, 5); // TRANSITION and VIEWCONFIG
 * ```
 *
 * ### CJS
 * ```js
 * let trace = require("@uirouter/core").trace;
 * trace.enable("TRANSITION", "VIEWCONFIG");
 * ```
 *
 * ### Globals
 * ```js
 * let trace = window["@uirouter/core"].trace;
 * trace.enable(); // Trace everything (very verbose)
 * ```
 *
 * ### Angular 1:
 * ```js
 * app.run($trace => $trace.enable());
 * ```
 *
 * @packageDocumentation
 */
import { parse } from "../../shared/hof";
import { isNumber } from "../../shared/utils";
import {
  stringify,
  functionToString,
  maxLength,
  padString,
} from "../../shared/strings";
function ngViewString(uiview) {
  if (!uiview) return "ng-view (defunct)";
  const state = uiview.creationContext
    ? uiview.creationContext.name || "(root)"
    : "(none)";
  return `[ng-view#${uiview.id}:${uiview.fqn} (${uiview.name}@${state})]`;
}
const viewConfigString = (viewConfig) => {
  const view = viewConfig.viewDecl;
  const state = view.$context.name || "(root)";
  return `[View#${viewConfig.$id} from '${state}' state]: target ng-view: '${view.$ngViewName}@${view.$ngViewContextAnchor}'`;
};
function normalizedCat(input) {
  return isNumber(input) ? Category[input] : Category[Category[input]];
}
/**
 * Trace categories Enum
 *
 * Enable or disable a category using [[Trace.enable]] or [[Trace.disable]]
 *
 * `trace.enable(Category.TRANSITION)`
 *
 * These can also be provided using a matching string, or position ordinal
 *
 * `trace.enable("TRANSITION")`
 *
 * `trace.enable(1)`
 */
var Category;
(function (Category) {
  Category[(Category["RESOLVE"] = 0)] = "RESOLVE";
  Category[(Category["TRANSITION"] = 1)] = "TRANSITION";
  Category[(Category["HOOK"] = 2)] = "HOOK";
  Category[(Category["UIVIEW"] = 3)] = "UIVIEW";
  Category[(Category["VIEWCONFIG"] = 4)] = "VIEWCONFIG";
})(Category || (Category = {}));
export { Category };
const _tid = parse("$id");
const _rid = parse("router.$id");
const transLbl = (trans) => `Transition #${_tid(trans)}-${_rid(trans)}`;
/**
 * Prints ng-router Transition trace information to the console.
 */
export class Trace {
  constructor() {
    this._enabled = {};
    this.approximateDigests = 0;
  }

  _set(enabled, categories) {
    if (!categories.length) {
      categories = Object.keys(Category)
        .map((k) => parseInt(k, 10))
        .filter((k) => !isNaN(k))
        .map((key) => Category[key]);
    }
    categories
      .map(normalizedCat)
      .forEach((category) => (this._enabled[category] = enabled));
  }
  enable(...categories) {
    this._set(true, categories);
  }
  disable(...categories) {
    this._set(false, categories);
  }
  /**
   * Retrieves the enabled stateus of a [[Category]]
   *
   * ```js
   * trace.enabled("VIEWCONFIG"); // true or false
   * ```
   *
   * @returns boolean true if the category is enabled
   */
  enabled(category) {
    return !!this._enabled[normalizedCat(category)];
  }
  /** @internal called by ui-router code */
  traceTransitionStart(trans) {
    if (!this.enabled(Category.TRANSITION)) return;
    console.log(`${transLbl(trans)}: Started  -> ${stringify(trans)}`);
  }
  /** @internal called by ui-router code */
  traceTransitionIgnored(trans) {
    if (!this.enabled(Category.TRANSITION)) return;
    console.log(`${transLbl(trans)}: Ignored  <> ${stringify(trans)}`);
  }
  /** @internal called by ui-router code */
  traceHookInvocation(step, trans, options) {
    if (!this.enabled(Category.HOOK)) return;
    const event = parse("traceData.hookType")(options) || "internal",
      context =
        parse("traceData.context.state.name")(options) ||
        parse("traceData.context")(options) ||
        "unknown",
      name = functionToString(step.registeredHook.callback);
    console.log(
      `${transLbl(trans)}:   Hook -> ${event} context: ${context}, ${maxLength(200, name)}`,
    );
  }
  /** @internal called by ui-router code */
  traceHookResult(hookResult, trans) {
    if (!this.enabled(Category.HOOK)) return;
    console.log(
      `${transLbl(trans)}:   <- Hook returned: ${maxLength(200, stringify(hookResult))}`,
    );
  }
  /** @internal called by ui-router code */
  traceResolvePath(path, when, trans) {
    if (!this.enabled(Category.RESOLVE)) return;
    console.log(`${transLbl(trans)}:         Resolving ${path} (${when})`);
  }
  /** @internal called by ui-router code */
  traceResolvableResolved(resolvable, trans) {
    if (!this.enabled(Category.RESOLVE)) return;
    console.log(
      `${transLbl(trans)}:               <- Resolved  ${resolvable} to: ${maxLength(200, stringify(resolvable.data))}`,
    );
  }
  /** @internal called by ui-router code */
  traceError(reason, trans) {
    if (!this.enabled(Category.TRANSITION)) return;
    console.log(
      `${transLbl(trans)}: <- Rejected ${stringify(trans)}, reason: ${reason}`,
    );
  }
  /** @internal called by ui-router code */
  traceSuccess(finalState, trans) {
    if (!this.enabled(Category.TRANSITION)) return;
    console.log(
      `${transLbl(trans)}: <- Success  ${stringify(trans)}, final state: ${finalState.name}`,
    );
  }
  /** @internal called by ui-router code */
  traceUIViewEvent(event, viewData, extra = "") {
    if (!this.enabled(Category.UIVIEW)) return;
    console.log(
      `ng-view: ${padString(30, event)} ${ngViewString(viewData)}${extra}`,
    );
  }
  /** @internal called by ui-router code */
  traceUIViewConfigUpdated(viewData, context) {
    if (!this.enabled(Category.UIVIEW)) return;
    this.traceUIViewEvent(
      "Updating",
      viewData,
      ` with ViewConfig from context='${context}'`,
    );
  }
  /** @internal called by ui-router code */
  traceUIViewFill(viewData, html) {
    if (!this.enabled(Category.UIVIEW)) return;
    this.traceUIViewEvent("Fill", viewData, ` with: ${maxLength(200, html)}`);
  }
  /** @internal called by ui-router code */
  traceViewSync(pairs) {
    if (!this.enabled(Category.VIEWCONFIG)) return;
    const uivheader = "uiview component fqn";
    const cfgheader = "view config state (view name)";
    const mapping = pairs
      .map(({ ngView, viewConfig }) => {
        const uiv = ngView && ngView.fqn;
        const cfg =
          viewConfig &&
          `${viewConfig.viewDecl.$context.name}: (${viewConfig.viewDecl.$name})`;
        return { [uivheader]: uiv, [cfgheader]: cfg };
      })
      .sort((a, b) => (a[uivheader] || "").localeCompare(b[uivheader] || ""));
    console.table(mapping);
  }
  /** @internal called by ui-router code */
  traceViewServiceEvent(event, viewConfig) {
    if (!this.enabled(Category.VIEWCONFIG)) return;
    console.log(`VIEWCONFIG: ${event} ${viewConfigString(viewConfig)}`);
  }
  /** @internal called by ui-router code */
  traceViewServiceUIViewEvent(event, viewData) {
    if (!this.enabled(Category.VIEWCONFIG)) return;
    console.log(`VIEWCONFIG: ${event} ${ngViewString(viewData)}`);
  }
}
/**
 * The [[Trace]] singleton
 *
 * #### Example:
 * ```js
 * import {trace} from "@uirouter/core/index";
 * trace.enable(1, 5);
 * ```
 */
export const trace = new Trace();
