export function getNg1ViewConfigFactory(): (path: any, view: any) => Ng1ViewConfig[];
/**
 * This is a [[StateBuilder.builder]] function for angular1 `views`.
 *
 * When the [[StateBuilder]] builds a [[StateObject]] object from a raw [[StateDeclaration]], this builder
 * handles the `views` property with logic specific to @uirouter/angularjs (ng1).
 *
 * If no `views: {}` property exists on the [[StateDeclaration]], then it creates the `views` object
 * and applies the state-level configuration to a view named `$default`.
 *
 */
export function ng1ViewsBuilder(state: any): {};
export class Ng1ViewConfig {
    /**
     * Normalizes a view's name from a state.views configuration block.
     *
     * This should be used by a framework implementation to calculate the values for
     * [[_ViewDeclaration.$ngViewName]] and [[_ViewDeclaration.$ngViewContextAnchor]].
     *
     * @param context the context object (state declaration) that the view belongs to
     * @param rawViewName the name of the view, as declared in the [[StateDeclaration.views]]
     *
     * @returns the normalized ngViewName and ngViewContextAnchor that the view targets
     */
    static normalizeUIViewTarget(context: any, rawViewName?: string): {
        ngViewName: string;
        ngViewContextAnchor: string;
    };
    constructor(path: any, viewDecl: any, factory: any);
    path: any;
    viewDecl: any;
    factory: any;
    component: any;
    template: any;
    /** @type {Number} */ $id: number;
    loaded: boolean;
    getTemplate: (ngView: any, context: any) => any;
    load(): Promise<this>;
    controller: any;
    /**
     * Gets the controller for a view configuration.
     *
     * @returns {Function|Promise.<Function>} Returns a controller, or a promise that resolves to a controller.
     */
    getController(context: any): Function | Promise<Function>;
}
