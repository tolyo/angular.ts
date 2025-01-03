import { isString, isFunction } from "../../shared/utils";
import { TargetState } from "../state/target-state";

export const registerRedirectToHook = (transitionService, stateService) => {
  /**
   * A [[TransitionHookFn]] that redirects to a different state or params
   *
   * Registered using `transitionService.onStart({ to: (state) => !!state.redirectTo }, redirectHook);`
   *
   * See [[StateDeclaration.redirectTo]]
   */
  const redirectToHook = (trans) => {
    const redirect = trans.to().redirectTo;
    if (!redirect) return;
    const $state = stateService;
    function handleResult(result) {
      if (!result) return;
      if (result instanceof TargetState) return result;
      if (isString(result))
        return $state.target(result, trans.params(), trans.options());
      if (result["state"] || result["params"])
        return $state.target(
          result["state"] || trans.to(),
          result["params"] || trans.params(),
          trans.options(),
        );
    }
    if (isFunction(redirect)) {
      return Promise.resolve(redirect(trans)).then(handleResult);
    }
    return handleResult(redirect);
  };

  transitionService.onStart(
    { to: (state) => !!state.redirectTo },
    redirectToHook,
  );
};
