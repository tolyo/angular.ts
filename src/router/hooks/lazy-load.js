import { services } from "../common/coreservices";
/**
 * A [[TransitionHookFn]] that performs lazy loading
 *
 * When entering a state "abc" which has a `lazyLoad` function defined:
 * - Invoke the `lazyLoad` function (unless it is already in process)
 *   - Flag the hook function as "in process"
 *   - The function should return a promise (that resolves when lazy loading is complete)
 * - Wait for the promise to settle
 *   - If the promise resolves to a [[LazyLoadResult]], then register those states
 *   - Flag the hook function as "not in process"
 * - If the hook was successful
 *   - Remove the `lazyLoad` function from the state declaration
 * - If all the hooks were successful
 *   - Retry the transition (by returning a TargetState)
 *
 * ```
 * .state('abc', {
 *   component: 'fooComponent',
 *   lazyLoad: () => import('./fooComponent')
 *   });
 * ```
 *
 * See [[StateDeclaration.lazyLoad]]
 */
export function registerLazyLoadHook(
  transitionService,
  stateService,
  urlService,
  stateRegistry,
) {
  return transitionService.onBefore(
    { entering: (state) => !!state.lazyLoad },
    (transition) => {
      function retryTransition() {
        if (transition.originalTransition().options().source !== "url") {
          // The original transition was not triggered via url sync
          // The lazy state should be loaded now, so re-try the original transition
          const orig = transition.targetState();
          return stateService.target(
            orig.identifier(),
            orig.params(),
            orig.options(),
          );
        }
        // The original transition was triggered via url sync
        // Run the URL rules and find the best match
        const result = urlService.match(urlService.parts());
        const rule = result && result.rule;
        // If the best match is a state, redirect the transition (instead
        // of calling sync() which supersedes the current transition)
        if (rule && rule.type === "STATE") {
          const state = rule.state;
          const params = result.match;
          return stateService.target(state, params, transition.options());
        }
        // No matching state found, so let .sync() choose the best non-state match/otherwise
        urlService.sync();
      }
      const promises = transition
        .entering()
        .filter((state) => !!state.$$state().lazyLoad)
        .map((state) => lazyLoadState(transition, state, stateRegistry));
      return Promise.all(promises).then(retryTransition);
    },
  );
}

/**
 * Invokes a state's lazy load function
 *
 * @param transition a Transition context
 * @param state the state to lazy load
 * @returns A promise for the lazy load result
 */
export function lazyLoadState(transition, state, stateRegistry) {
  const lazyLoadFn = state.$$state().lazyLoad;
  // Store/get the lazy load promise on/from the hookfn so it doesn't get re-invoked
  let promise = lazyLoadFn["_promise"];
  if (!promise) {
    const success = (result) => {
      delete state.lazyLoad;
      delete state.$$state().lazyLoad;
      delete lazyLoadFn["_promise"];
      return result;
    };
    const error = (err) => {
      delete lazyLoadFn["_promise"];
      return Promise.reject(err);
    };
    promise = lazyLoadFn["_promise"] = services.$q
      .resolve(lazyLoadFn(transition, state))
      .then(updateStateRegistry)
      .then(success, error);
  }
  /** Register any lazy loaded state definitions */
  function updateStateRegistry(result) {
    if (result && Array.isArray(result.states)) {
      result.states.forEach((_state) => stateRegistry.register(_state));
    }
    return result;
  }
  return promise;
}
