/**
 * Represents a transition between two states.
 *
 * When navigating to a state, we are transitioning **from** the current state **to** the new state.
 *
 * This object contains all contextual information about the to/from states, parameters, resolves.
 * It has information about all states being entered and exited as a result of the transition.
 */
export class Transition {
    /**
     * Creates a new Transition object.
     *
     * If the target state is not valid, an error is thrown.
     *
     * @internal
     *
     * @param fromPath The path of [[PathNode]]s from which the transition is leaving.  The last node in the `fromPath`
     *        encapsulates the "from state".
     * @param targetState The target state and parameters being transitioned to (also, the transition options)
     * @param {import('../transition/transition-service.js').TransitionProvider} transitionService The [[TransitionService]] instance
     * @internal
     */
    constructor(fromPath: any, targetState: any, transitionService: import("../transition/transition-service.js").TransitionProvider, globals: any);
    globals: any;
    transitionService: import("../transition/transition-service.js").TransitionProvider;
    _deferred: any;
    /**
     * This promise is resolved or rejected based on the outcome of the Transition.
     *
     * When the transition is successful, the promise is resolved
     * When the transition is unsuccessful, the promise is rejected with the [[Rejection]] or javascript error
     */
    promise: any;
    /** @internal Holds the hook registration functions such as those passed to Transition.onStart() */
    _registeredHooks: {};
    _hookBuilder: HookBuilder;
    /** Checks if this transition is currently active/running. */
    isActive: () => boolean;
    _targetState: any;
    _options: any;
    $id: number;
    _treeChanges: {
        from: any;
        to: any;
        retained: any;
        retainedWithToParams: any;
        exiting: any;
        entering: any;
    };
    /**
     * Creates the transition-level hook registration functions
     * (which can then be used to register hooks)
     */
    createTransitionHookRegFns(): void;
    getHooks(hookName: any): any;
    applyViewConfigs(): void;
    /**
     * @internal
     * @returns the internal from [State] object
     */
    $from(): any;
    /**
     * @internal
     * @returns the internal to [State] object
     */
    $to(): any;
    /**
     * Returns the "from state"
     *
     * Returns the state that the transition is coming *from*.
     *
     * @returns The state declaration object for the Transition's ("from state").
     */
    from(): any;
    /**
     * Returns the "to state"
     *
     * Returns the state that the transition is going *to*.
     *
     * @returns The state declaration object for the Transition's target state ("to state").
     */
    to(): any;
    /**
     * Gets the Target State
     *
     * A transition's [[TargetState]] encapsulates the [[to]] state, the [[params]], and the [[options]] as a single object.
     *
     * @returns the [[TargetState]] of this Transition
     */
    targetState(): any;
    /**
     * Determines whether two transitions are equivalent.
     * @deprecated
     */
    is(compare: any): any;
    params(pathname?: string): any;
    paramsChanged(): any;
    /**
     * Creates a [[UIInjector]] Dependency Injector
     *
     * Returns a Dependency Injector for the Transition's target state (to state).
     * The injector provides resolve values which the target state has access to.
     *
     * The `UIInjector` can also provide values from the native root/global injector (ng1/ng2).
     *
     * #### Example:
     * ```js
     * .onEnter({ entering: 'myState' }, trans => {
     *   var myResolveValue = trans.injector().get('myResolve');
     *   // Inject a global service from the global/native injector (if it exists)
     *   var MyService = trans.injector().get('MyService');
     * })
     * ```
     *
     * In some cases (such as `onBefore`), you may need access to some resolve data but it has not yet been fetched.
     * You can use [[UIInjector.getAsync]] to get a promise for the data.
     * #### Example:
     * ```js
     * .onBefore({}, trans => {
     *   return trans.injector().getAsync('myResolve').then(myResolveValue =>
     *     return myResolveValue !== 'ABORT';
     *   });
     * });
     * ```
     *
     * If a `state` is provided, the injector that is returned will be limited to resolve values that the provided state has access to.
     * This can be useful if both a parent state `foo` and a child state `foo.bar` have both defined a resolve such as `data`.
     * #### Example:
     * ```js
     * .onEnter({ to: 'foo.bar' }, trans => {
     *   // returns result of `foo` state's `myResolve` resolve
     *   // even though `foo.bar` also has a `myResolve` resolve
     *   var fooData = trans.injector('foo').get('myResolve');
     * });
     * ```
     *
     * If you need resolve data from the exiting states, pass `'from'` as `pathName`.
     * The resolve data from the `from` path will be returned.
     * #### Example:
     * ```js
     * .onExit({ exiting: 'foo.bar' }, trans => {
     *   // Gets the resolve value of `myResolve` from the state being exited
     *   var fooData = trans.injector(null, 'from').get('myResolve');
     * });
     * ```
     *
     *
     * @param state Limits the resolves provided to only the resolves the provided state has access to.
     * @param pathName Default: `'to'`: Chooses the path for which to create the injector. Use this to access resolves for `exiting` states.
     *
     * @returns a [[UIInjector]]
     */
    injector(state: any, pathName?: string): {
        native: import("../../core/di/internal-injector.js").InjectorService;
        get(token: any): any;
        getAsync(token: any): any;
        getNative(token: any): any;
    };
    /**
     * Gets all available resolve tokens (keys)
     *
     * This method can be used in conjunction with [[injector]] to inspect the resolve values
     * available to the Transition.
     *
     * This returns all the tokens defined on [[StateDeclaration.resolve]] blocks, for the states
     * in the Transition's [[TreeChanges.to]] path.
     *
     * #### Example:
     * This example logs all resolve values
     * ```js
     * let tokens = trans.getResolveTokens();
     * tokens.forEach(token => console.log(token + " = " + trans.injector().get(token)));
     * ```
     *
     * #### Example:
     * This example creates promises for each resolve value.
     * This triggers fetches of resolves (if any have not yet been fetched).
     * When all promises have all settled, it logs the resolve values.
     * ```js
     * let tokens = trans.getResolveTokens();
     * let promise = tokens.map(token => trans.injector().getAsync(token));
     * Promise.all(promises).then(values => console.log("Resolved values: " + values));
     * ```
     *
     * Note: Angular 1 users whould use `$q.all()`
     *
     * @param pathname resolve context's path name (e.g., `to` or `from`)
     *
     * @returns an array of resolve tokens (keys)
     */
    getResolveTokens(pathname?: string): any;
    /**
     * Dynamically adds a new [[Resolvable]] (i.e., [[StateDeclaration.resolve]]) to this transition.
     *
     * Allows a transition hook to dynamically add a Resolvable to this Transition.
     *
     * Use the [[Transition.injector]] to retrieve the resolved data in subsequent hooks ([[UIInjector.get]]).
     *
     * If a `state` argument is provided, the Resolvable is processed when that state is being entered.
     * If no `state` is provided then the root state is used.
     * If the given `state` has already been entered, the Resolvable is processed when any child state is entered.
     * If no child states will be entered, the Resolvable is processed during the `onFinish` phase of the Transition.
     *
     * The `state` argument also scopes the resolved data.
     * The resolved data is available from the injector for that `state` and any children states.
     *
     * #### Example:
     * ```js
     * transitionService.onBefore({}, transition => {
     *   transition.addResolvable({
     *     token: 'myResolve',
     *     deps: ['MyService'],
     *     resolveFn: myService => myService.getData()
     *   });
     * });
     * ```
     *
     * @param resolvable a [[ResolvableLiteral]] object (or a [[Resolvable]])
     * @param state the state in the "to path" which should receive the new resolve (otherwise, the root state)
     */
    addResolvable(resolvable: any, state: any): void;
    /**
     * Gets the transition from which this transition was redirected.
     *
     * If the current transition is a redirect, this method returns the transition that was redirected.
     *
     * #### Example:
     * ```js
     * let transitionA = $state.go('A').transition
     * transitionA.onStart({}, () => $state.target('B'));
     * $transitions.onSuccess({ to: 'B' }, (trans) => {
     *   trans.to().name === 'B'; // true
     *   trans.redirectedFrom() === transitionA; // true
     * });
     * ```
     *
     * @returns The previous Transition, or null if this Transition is not the result of a redirection
     */
    redirectedFrom(): any;
    /**
     * Gets the original transition in a redirect chain
     *
     * A transition might belong to a long chain of multiple redirects.
     * This method walks the [[redirectedFrom]] chain back to the original (first) transition in the chain.
     *
     * #### Example:
     * ```js
     * // states
     * registry.register({ name: 'A', redirectTo: 'B' });
     * registry.register({ name: 'B', redirectTo: 'C' });
     * registry.register({ name: 'C', redirectTo: 'D' });
     * registry.register({ name: 'D' });
     *
     * let transitionA = $state.go('A').transition
     *
     * $transitions.onSuccess({ to: 'D' }, (trans) => {
     *   trans.to().name === 'D'; // true
     *   trans.redirectedFrom().to().name === 'C'; // true
     *   trans.originalTransition() === transitionA; // true
     *   trans.originalTransition().to().name === 'A'; // true
     * });
     * ```
     *
     * @returns The original Transition that started a redirect chain
     */
    originalTransition(): any;
    /**
     * Get the transition options
     *
     * @returns the options for this Transition.
     */
    options(): any;
    /**
     * Gets the states being entered.
     *
     * @returns an array of states that will be entered during this transition.
     */
    entering(): any;
    /**
     * Gets the states being exited.
     *
     * @returns an array of states that will be exited during this transition.
     */
    exiting(): any;
    /**
     * Gets the states being retained.
     *
     * @returns an array of states that are already entered from a previous Transition, that will not be
     *    exited during this Transition
     */
    retained(): any;
    /**
     * Get the [[ViewConfig]]s associated with this Transition
     *
     * Each state can define one or more views (template/controller), which are encapsulated as `ViewConfig` objects.
     * This method fetches the `ViewConfigs` for a given path in the Transition (e.g., "to" or "entering").
     *
     * @param pathname the name of the path to fetch views for:
     *   (`'to'`, `'from'`, `'entering'`, `'exiting'`, `'retained'`)
     * @param state If provided, only returns the `ViewConfig`s for a single state in the path
     *
     * @returns a list of ViewConfig objects for the given path.
     */
    views(pathname: string, state: any): any;
    treeChanges(pathname: any): any;
    /**
     * Creates a new transition that is a redirection of the current one.
     *
     * This transition can be returned from a [[TransitionService]] hook to
     * redirect a transition to a new state and/or set of parameters.
     *
     * @internal
     *
     * @returns Returns a new [[Transition]] instance.
     */
    redirect(targetState: any): Transition;
    /** @internal If a transition doesn't exit/enter any states, returns any [[Param]] whose value changed */
    _changedParams(): any;
    /**
     * Returns true if the transition is dynamic.
     *
     * A transition is dynamic if no states are entered nor exited, but at least one dynamic parameter has changed.
     *
     * @returns true if the Transition is dynamic
     */
    dynamic(): any;
    /**
     * Returns true if the transition is ignored.
     *
     * A transition is ignored if no states are entered nor exited, and no parameter values have changed.
     *
     * @returns true if the Transition is ignored.
     */
    ignored(): boolean;
    _ignoredReason(): "SameAsPending" | "SameAsCurrent";
    /**
     * Runs the transition
     *
     * This method is generally called from the [[StateService.transitionTo]]
     *
     * @internal
     *
     * @returns a promise for a successful transition.
     */
    run(): any;
    success: boolean;
    _error: any;
    /**
     * Checks if the Transition is valid
     *
     * @returns true if the Transition is valid
     */
    valid(): boolean;
    /**
     * Aborts this transition
     *
     * Imperative API to abort a Transition.
     * This only applies to Transitions that are not yet complete.
     */
    abort(): void;
    _aborted: boolean;
    /**
     * The Transition error reason.
     *
     * If the transition is invalid (and could not be run), returns the reason the transition is invalid.
     * If the transition was valid and ran, but was not successful, returns the reason the transition failed.
     *
     * @returns a transition rejection explaining why the transition is invalid, or the reason the transition failed.
     */
    error(): any;
    /**
     * A string representation of the Transition
     *
     * @returns A string representation of the Transition
     */
    toString(): string;
}
export namespace Transition {
    export { Transition as diToken };
}
import { HookBuilder } from "./hook-builder.js";
