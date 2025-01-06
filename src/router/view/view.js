import { equals, applyPairs, removeFrom, find } from "../../shared/common";
import { curry } from "../../shared/hof";
import { trace } from "../common/trace";
import { getNg1ViewConfigFactory } from "../state/views";
/**
 * The View service
 *
 * This service pairs existing `ng-view` components (which live in the DOM)
 * with view configs (from the state declaration objects: [[StateDeclaration.views]]).
 *
 * - After a successful Transition, the views from the newly entered states are activated via [[activateViewConfig]].
 *   The views from exited states are deactivated via [[deactivateViewConfig]].
 *   (See: the [[registerActivateViews]] Transition Hook)
 *
 * - As `ng-view` components pop in and out of existence, they register themselves using [[registerUIView]].
 *
 * - When the [[sync]] function is called, the registered `ng-view`(s) ([[ActiveUIView]])
 * are configured with the matching [[ViewConfig]](s)
 *
 */
export class ViewService {
  constructor() {
    this._ngViews = [];
    this._viewConfigs = [];
    this._viewConfigFactories = {};
    this._listeners = [];
    this._pluginapi = {
      _rootViewContext: this._rootViewContext.bind(this),
      _viewConfigFactory: this._viewConfigFactory.bind(this),
      _registeredUIView: (id) => {
        const res = find(this._ngViews, (view) => view.id === id);
        return res;
      },

      _registeredUIViews: () => this._ngViews,
      _activeViewConfigs: () => this._viewConfigs,
      _onSync: (listener) => {
        this._listeners.push(listener);
        return () => removeFrom(this._listeners, listener);
      },
    };
    this._pluginapi._viewConfigFactory(getNg1ViewConfigFactory());
  }

  $get = [() => this];

  _rootViewContext(context) {
    return (this._rootContext = context || this._rootContext);
  }

  _viewConfigFactory(factory) {
    this._viewConfigFactory = factory;
  }
  createViewConfig(path, decl) {
    const cfgFactory = this._viewConfigFactory;
    if (!cfgFactory)
      throw new Error(
        "ViewService: No view config factory registered for type " + decl.$type,
      );
    const cfgs = cfgFactory(path, decl);
    return Array.isArray(cfgs) ? cfgs : [cfgs];
  }
  /**
   * Deactivates a ViewConfig.
   *
   * This function deactivates a `ViewConfig`.
   * After calling [[sync]], it will un-pair from any `ng-view` with which it is currently paired.
   *
   * @param viewConfig The ViewConfig view to deregister.
   */
  deactivateViewConfig(viewConfig) {
    trace.traceViewServiceEvent("<- Removing", viewConfig);
    removeFrom(this._viewConfigs, viewConfig);
  }
  activateViewConfig(viewConfig) {
    trace.traceViewServiceEvent("-> Registering", viewConfig);
    this._viewConfigs.push(viewConfig);
  }
  sync() {
    const ngViewsByFqn = this._ngViews
      .map((uiv) => [uiv.fqn, uiv])
      .reduce(applyPairs, {});
    // Return a weighted depth value for a ngView.
    // The depth is the nesting depth of ng-views (based on FQN; times 10,000)
    // plus the depth of the state that is populating the ngView
    function ngViewDepth(ngView) {
      const stateDepth = (context) =>
        context && context.parent ? stateDepth(context.parent) + 1 : 1;
      return (
        ngView.fqn.split(".").length * 10000 +
        stateDepth(ngView.creationContext)
      );
    }
    // Return the ViewConfig's context's depth in the context tree.
    function viewConfigDepth(config) {
      let context = config.viewDecl.$context,
        count = 0;
      while (++count && context.parent) context = context.parent;
      return count;
    }
    // Given a depth function, returns a compare function which can return either ascending or descending order
    const depthCompare = curry(
      (depthFn, posNeg, left, right) =>
        posNeg * (depthFn(left) - depthFn(right)),
    );
    const matchingConfigPair = (ngView) => {
      const matchingConfigs = this._viewConfigs.filter(
        ViewService.matches(ngViewsByFqn, ngView),
      );
      if (matchingConfigs.length > 1) {
        // This is OK.  Child states can target a ng-view that the parent state also targets (the child wins)
        // Sort by depth and return the match from the deepest child
        // console.log(`Multiple matching view configs for ${ngView.fqn}`, matchingConfigs);
        matchingConfigs.sort(depthCompare(viewConfigDepth, -1)); // descending
      }
      return { ngView, viewConfig: matchingConfigs[0] };
    };
    const configureUIView = (tuple) => {
      // If a parent ng-view is reconfigured, it could destroy child ng-views.
      // Before configuring a child ng-view, make sure it's still in the active ngViews array.
      if (this._ngViews.indexOf(tuple.ngView) !== -1) {
        tuple.ngView.configUpdated(tuple.viewConfig);
      }
    };
    // Sort views by FQN and state depth. Process uiviews nearest the root first.
    const ngViewTuples = this._ngViews
      .sort(depthCompare(ngViewDepth, 1))
      .map(matchingConfigPair);
    const matchedViewConfigs = ngViewTuples.map((tuple) => tuple.viewConfig);
    const unmatchedConfigTuples = this._viewConfigs
      .filter((config) => !matchedViewConfigs.includes(config))
      .map((viewConfig) => ({ ngView: undefined, viewConfig }));
    ngViewTuples.forEach((tuple) => {
      configureUIView(tuple);
    });
    const allTuples = ngViewTuples.concat(unmatchedConfigTuples);
    this._listeners.forEach((cb) => cb(allTuples));
    trace.traceViewSync(allTuples);
  }
  /**
   * Registers a `ng-view` component
   *
   * When a `ng-view` component is created, it uses this method to register itself.
   * After registration the [[sync]] method is used to ensure all `ng-view` are configured with the proper [[ViewConfig]].
   *
   * Note: the `ng-view` component uses the `ViewConfig` to determine what view should be loaded inside the `ng-view`,
   * and what the view's state context is.
   *
   * Note: There is no corresponding `deregisterUIView`.
   *       A `ng-view` should hang on to the return value of `registerUIView` and invoke it to deregister itself.
   *
   * @param ngView The metadata for a UIView
   * @return a de-registration function used when the view is destroyed.
   */
  registerUIView(ngView) {
    trace.traceViewServiceUIViewEvent("-> Registering", ngView);
    const ngViews = this._ngViews;
    const fqnAndTypeMatches = (uiv) => uiv.fqn === ngView.fqn;
    if (ngViews.filter(fqnAndTypeMatches).length)
      trace.traceViewServiceUIViewEvent("!!!! duplicate ngView named:", ngView);
    ngViews.push(ngView);
    this.sync();
    return () => {
      const idx = ngViews.indexOf(ngView);
      if (idx === -1) {
        trace.traceViewServiceUIViewEvent(
          "Tried removing non-registered ngView",
          ngView,
        );
        return;
      }
      trace.traceViewServiceUIViewEvent("<- Deregistering", ngView);
      removeFrom(ngViews)(ngView);
    };
  }
  /**
   * Returns the list of views currently available on the page, by fully-qualified name.
   *
   * @return {Array} Returns an array of fully-qualified view names.
   */
  available() {
    return this._ngViews.map((x) => x.fqn);
  }
  /**
   * Returns the list of views on the page containing loaded content.
   *
   * @return {Array} Returns an array of fully-qualified view names.
   */
  active() {
    return this._ngViews.filter((x) => x.$config).map((x) => x.name);
  }
}
/**
 * Given a ng-view and a ViewConfig, determines if they "match".
 *
 * A ng-view has a fully qualified name (fqn) and a context object.  The fqn is built from its overall location in
 * the DOM, describing its nesting relationship to any parent ng-view tags it is nested inside of.
 *
 * A ViewConfig has a target ng-view name and a context anchor.  The ng-view name can be a simple name, or
 * can be a segmented ng-view path, describing a portion of a ng-view fqn.
 *
 * In order for a ng-view to match ViewConfig, ng-view's $type must match the ViewConfig's $type
 *
 * If the ViewConfig's target ng-view name is a simple name (no dots), then a ng-view matches if:
 * - the ng-view's name matches the ViewConfig's target name
 * - the ng-view's context matches the ViewConfig's anchor
 *
 * If the ViewConfig's target ng-view name is a segmented name (with dots), then a ng-view matches if:
 * - There exists a parent ng-view where:
 *    - the parent ng-view's name matches the first segment (index 0) of the ViewConfig's target name
 *    - the parent ng-view's context matches the ViewConfig's anchor
 * - And the remaining segments (index 1..n) of the ViewConfig's target name match the tail of the ng-view's fqn
 *
 * Example:
 *
 * DOM:
 * <ng-view>                        <!-- created in the root context (name: "") -->
 *   <ng-view name="foo">                <!-- created in the context named: "A"      -->
 *     <ng-view>                    <!-- created in the context named: "A.B"    -->
 *       <ng-view name="bar">            <!-- created in the context named: "A.B.C"  -->
 *       </ng-view>
 *     </ng-view>
 *   </ng-view>
 * </ng-view>
 *
 * ngViews: [
 *  { fqn: "$default",                  creationContext: { name: "" } },
 *  { fqn: "$default.foo",              creationContext: { name: "A" } },
 *  { fqn: "$default.foo.$default",     creationContext: { name: "A.B" } }
 *  { fqn: "$default.foo.$default.bar", creationContext: { name: "A.B.C" } }
 * ]
 *
 * These four view configs all match the ng-view with the fqn: "$default.foo.$default.bar":
 *
 * - ViewConfig1: { ngViewName: "bar",                       ngViewContextAnchor: "A.B.C" }
 * - ViewConfig2: { ngViewName: "$default.bar",              ngViewContextAnchor: "A.B" }
 * - ViewConfig3: { ngViewName: "foo.$default.bar",          ngViewContextAnchor: "A" }
 * - ViewConfig4: { ngViewName: "$default.foo.$default.bar", ngViewContextAnchor: "" }
 *
 * Using ViewConfig3 as an example, it matches the ng-view with fqn "$default.foo.$default.bar" because:
 * - The ViewConfig's segmented target name is: [ "foo", "$default", "bar" ]
 * - There exists a parent ng-view (which has fqn: "$default.foo") where:
 *    - the parent ng-view's name "foo" matches the first segment "foo" of the ViewConfig's target name
 *    - the parent ng-view's context "A" matches the ViewConfig's anchor context "A"
 * - And the remaining segments [ "$default", "bar" ].join("."_ of the ViewConfig's target name match
 *   the tail of the ng-view's fqn "default.bar"
 *
 * @internal
 */
ViewService.matches = (ngViewsByFqn, ngView) => (viewConfig) => {
  // Don't supply an ng1 ng-view with an ng2 ViewConfig, etc
  if (ngView.$type !== viewConfig.viewDecl.$type) return false;
  // Split names apart from both viewConfig and ngView into segments
  const vc = viewConfig.viewDecl;
  const vcSegments = vc.$ngViewName.split(".");
  const uivSegments = ngView.fqn.split(".");
  // Check if the tails of the segment arrays match. ex, these arrays' tails match:
  // vc: ["foo", "bar"], uiv fqn: ["$default", "foo", "bar"]
  if (!equals(vcSegments, uivSegments.slice(0 - vcSegments.length)))
    return false;
  // Now check if the fqn ending at the first segment of the viewConfig matches the context:
  // ["$default", "foo"].join(".") == "$default.foo", does the ng-view $default.foo context match?
  const negOffset = 1 - vcSegments.length || undefined;
  const fqnToFirstSegment = uivSegments.slice(0, negOffset).join(".");
  const ngViewContext = ngViewsByFqn[fqnToFirstSegment].creationContext;
  return vc.$ngViewContextAnchor === (ngViewContext && ngViewContext.name);
};
