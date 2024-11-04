export namespace defaultResolvePolicy {
    let when: string;
    let async: string;
}
/**
 * The basic building block for the resolve system.
 *
 * Resolvables encapsulate a state's resolve's resolveFn, the resolveFn's declared dependencies, the wrapped (.promise),
 * and the unwrapped-when-complete (.data) result of the resolveFn.
 *
 * Resolvable.get() either retrieves the Resolvable's existing promise, or else invokes resolve() (which invokes the
 * resolveFn) and returns the resulting promise.
 *
 * Resolvable.get() and Resolvable.resolve() both execute within a context path, which is passed as the first
 * parameter to those fns.
 */
export class Resolvable {
    constructor(arg1: any, resolveFn: any, deps: any, policy: any, data: any);
    resolved: boolean;
    promise: Promise<any>;
    token: any;
    policy: any;
    resolveFn: any;
    deps: any;
    data: any;
    getPolicy(state: any): {
        when: any;
        async: any;
    };
    /**
     * Asynchronously resolve this Resolvable's data
     *
     * Given a ResolveContext that this Resolvable is found in:
     * Wait for this Resolvable's dependencies, then invoke this Resolvable's function
     * and update the Resolvable's state
     */
    resolve(resolveContext: any, trans: any): Promise<any>;
    /**
     * Gets a promise for this Resolvable's data.
     *
     * Fetches the data and returns a promise.
     * Returns the existing promise if it has already been fetched once.
     */
    get(resolveContext: any, trans: any): Promise<any>;
    toString(): string;
    clone(): Resolvable;
}
export namespace Resolvable {
    function fromData(token: any, data: any): Resolvable;
}
