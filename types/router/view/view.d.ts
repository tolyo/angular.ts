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
    _ngViews: any[];
    _viewConfigs: any[];
    _viewConfigFactories: {};
    _listeners: any[];
    _pluginapi: {
        _rootViewContext: any;
        _viewConfigFactory: any;
        _registeredUIView: (id: any) => undefined;
        _registeredUIViews: () => any[];
        _activeViewConfigs: () => any[];
        _onSync: (listener: any) => () => any;
    };
    $get: (() => this)[];
    _rootViewContext(context: any): any;
    _rootContext: any;
    _viewConfigFactory(factory: any): void;
    createViewConfig(path: any, decl: any): (void & any[]) | void[];
    /**
     * Deactivates a ViewConfig.
     *
     * This function deactivates a `ViewConfig`.
     * After calling [[sync]], it will un-pair from any `ng-view` with which it is currently paired.
     *
     * @param viewConfig The ViewConfig view to deregister.
     */
    deactivateViewConfig(viewConfig: any): void;
    activateViewConfig(viewConfig: any): void;
    sync(): void;
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
    registerUIView(ngView: any): () => void;
    /**
     * Returns the list of views currently available on the page, by fully-qualified name.
     *
     * @return {Array} Returns an array of fully-qualified view names.
     */
    available(): any[];
    /**
     * Returns the list of views on the page containing loaded content.
     *
     * @return {Array} Returns an array of fully-qualified view names.
     */
    active(): any[];
}
export namespace ViewService {
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
    function matches(ngViewsByFqn: any, ngView: any): (viewConfig: any) => boolean;
}
