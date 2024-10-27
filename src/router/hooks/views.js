/**
 * A [[TransitionHookFn]] which waits for the views to load
 *
 * Registered using `transitionService.onStart({}, loadEnteringViews);`
 *
 * Allows the views to do async work in [[ViewConfig.load]] before the transition continues.
 * In angular 1, this includes loading the templates.
 */
const loadEnteringViews = (transition) => {
  const enteringViews = transition.views("entering");
  if (!enteringViews.length) return;
  return Promise.all(
    enteringViews.map((view) => Promise.resolve(view.load())),
  ).then(() => {});
};
export const registerLoadEnteringViews = (transitionService) =>
  transitionService.onFinish({}, loadEnteringViews);

export const registerActivateViews = (transitionService, viewService) => {
  /**
   * A [[TransitionHookFn]] which activates the new views when a transition is successful.
   *
   * Registered using `transitionService.onSuccess({}, activateViews);`
   *
   * After a transition is complete, this hook deactivates the old views from the previous state,
   * and activates the new views from the destination state.
   *
   * See [[ViewService]]
   */
  const activateViews = (transition) => {
    const enteringViews = transition.views("entering");
    const exitingViews = transition.views("exiting");
    if (!enteringViews.length && !exitingViews.length) return;
    exitingViews.forEach((vc) => viewService.deactivateViewConfig(vc));
    enteringViews.forEach((vc) => viewService.activateViewConfig(vc));
    viewService.sync();
  };
  transitionService.onSuccess({}, activateViews);
};
