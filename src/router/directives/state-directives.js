import { tail, unnestR, uniqR, removeFrom } from "../../shared/common";
import { isString, isObject } from "../../shared/utils";

import { parse } from "../../shared/hof";
/** @ignore */
function parseStateRef(ref) {
  const paramsOnly = ref.match(/^\s*({[^}]*})\s*$/);
  if (paramsOnly) ref = "(" + paramsOnly[1] + ")";
  const parsed = ref
    .replace(/\n/g, " ")
    .match(/^\s*([^(]*?)\s*(\((.*)\))?\s*$/);
  if (!parsed || parsed.length !== 4)
    throw new Error("Invalid state ref '" + ref + "'");
  return { state: parsed[1] || null, paramExpr: parsed[3] || null };
}
/** @ignore */
function stateContext(el) {
  const $ngView = el.parent().inheritedData("$ngView");
  const path = parse("$cfg.path")($ngView);
  return path ? tail(path).state.name : undefined;
}
/** @ignore */
function processedDef($state, $element, def) {
  const ngState = def.ngState || $state.current.name;
  const ngStateOpts = Object.assign(
    defaultOpts($element, $state),
    def.ngStateOpts || {},
  );
  const href = $state.href(ngState, def.ngStateParams, ngStateOpts);
  return { ngState, ngStateParams: def.ngStateParams, ngStateOpts, href };
}
/** @ignore */
function getTypeInfo(el) {
  // SVGAElement does not use the href attribute, but rather the 'xlinkHref' attribute.
  const isSvg =
    Object.prototype.toString.call(el[0].getAttribute("href")) ===
    "[object SVGAnimatedString]";
  const isForm = el[0].nodeName === "FORM";
  return {
    attr: isForm ? "action" : isSvg ? "xlink:href" : "href",
    isAnchor: el[0].nodeName === "A",
    clickable: !isForm,
  };
}
/** @ignore */
function clickHook(el, $state, type, getDef) {
  return function (e) {
    const button = e.which || e.button,
      target = getDef();

    let res =
      button > 1 ||
      e.ctrlKey ||
      e.metaKey ||
      e.shiftKey ||
      e.altKey ||
      el.attr("target");
    if (!res) {
      // HACK: This is to allow ng-clicks to be processed before the transition is initiated:
      const transition = setTimeout(function () {
        if (!el.attr("disabled")) {
          $state.go(target.ngState, target.ngStateParams, target.ngStateOpts);
        }
      });
      e.preventDefault();
      // if the state has no URL, ignore one preventDefault from the <a> directive.
      let ignorePreventDefaultCount = type.isAnchor && !target.href ? 1 : 0;
      e.preventDefault = function () {
        if (ignorePreventDefaultCount-- <= 0) clearTimeout(transition);
      };
    } else {
      // ignored
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  };
}
/** @ignore */
function defaultOpts(el, $state) {
  return {
    relative: stateContext(el) || $state.$current,
    inherit: true,
    source: "sref",
  };
}
/** @ignore */
function bindEvents(element, scope, hookFn, ngStateOpts) {
  let events;
  if (ngStateOpts) {
    events = ngStateOpts.events;
  }
  if (!Array.isArray(events)) {
    events = ["click"];
  }
  const on = element.on ? "on" : "bind";
  for (const event of events) {
    element[on](event, hookFn);
  }
  scope.$on("$destroy", function () {
    const off = element.off ? "off" : "unbind";
    for (const event of events) {
      element[off](event, hookFn);
    }
  });
}

// // TODO: SEPARATE THESE OUT

$StateRefDirective.$inject = ["$state", "$stateRegistry", "$transitions"];
export function $StateRefDirective(
  $stateService,
  $stateRegistry,
  $transitions,
) {
  const $state = $stateService;
  return {
    restrict: "A",
    require: ["?^ngSrefActive", "?^ngSrefActiveEq"],
    link: (scope, element, attrs, ngSrefActive) => {
      const type = getTypeInfo(element);
      const active = ngSrefActive[1] || ngSrefActive[0];
      let unlinkInfoFn = null;
      const rawDef = {};
      const getDef = () => processedDef($state, element, rawDef);
      const ref = parseStateRef(attrs.ngSref);
      rawDef.ngState = ref.state;
      rawDef.ngStateOpts = attrs.ngSrefOpts
        ? scope.$eval(attrs.ngSrefOpts)
        : {};
      function update() {
        const def = getDef();
        if (unlinkInfoFn) unlinkInfoFn();
        if (active)
          unlinkInfoFn = active.$$addStateInfo(def.ngState, def.ngStateParams);
        if (def.href != null) attrs.$set(type.attr, def.href);
      }
      if (ref.paramExpr) {
        scope.$watch(
          ref.paramExpr,
          function (val) {
            rawDef.ngStateParams = Object.assign({}, val);
            update();
          },
          true,
        );
        rawDef.ngStateParams = Object.assign({}, scope.$eval(ref.paramExpr));
      }
      update();
      scope.$on("$destroy", $stateRegistry.onStatesChanged(update));
      scope.$on("$destroy", $transitions.onSuccess({}, update));
      if (!type.clickable) return;
      const hookFn = clickHook(element, $state, type, getDef);
      bindEvents(element, scope, hookFn, rawDef.ngStateOpts);
    },
  };
}

$StateRefDynamicDirective.$inject = [
  "$state",
  "$stateRegistry",
  "$transitions",
];
export function $StateRefDynamicDirective(
  $state,
  $stateRegistry,
  $transitions,
) {
  return {
    restrict: "A",
    require: ["?^ngSrefActive", "?^ngSrefActiveEq"],
    link: function (scope, element, attrs, ngSrefActive) {
      const type = getTypeInfo(element);
      const active = ngSrefActive[1] || ngSrefActive[0];
      let unlinkInfoFn = null;
      let hookFn;
      const rawDef = {};
      const getDef = () => processedDef($state, element, rawDef);
      const inputAttrs = ["ngState", "ngStateParams", "ngStateOpts"];
      const watchDeregFns = inputAttrs.reduce(
        (acc, attr) => ((acc[attr] = () => {}), acc),
        {},
      );
      function update() {
        const def = getDef();
        if (unlinkInfoFn) unlinkInfoFn();
        if (active)
          unlinkInfoFn = active.$$addStateInfo(def.ngState, def.ngStateParams);
        if (def.href != null) attrs.$set(type.attr, def.href);
      }
      inputAttrs.forEach((field) => {
        rawDef[field] = attrs[field] ? scope.$eval(attrs[field]) : null;
        attrs.$observe(field, (expr) => {
          watchDeregFns[field]();
          watchDeregFns[field] = scope.$watch(
            expr,
            (newval) => {
              rawDef[field] = newval;
              update();
            },
            true,
          );
        });
      });
      update();
      scope.$on("$destroy", $stateRegistry.onStatesChanged(update));
      scope.$on("$destroy", $transitions.onSuccess({}, update));
      if (!type.clickable) return;
      hookFn = clickHook(element, $state, type, getDef);
      bindEvents(element, scope, hookFn, rawDef.ngStateOpts);
    },
  };
}

$StateRefActiveDirective.$inject = [
  "$state",
  "$routerGlobals",
  "$interpolate",
  "$stateRegistry",
  "$transitions",
];

/**
 *
 * @param {*} $state
 * @param {*} $routerGlobals
 * @param {*} $interpolate
 * @param {*} $stateRegistry
 * @param {*} $transitions
 * @returns {import("../../types").Directive}
 */
export function $StateRefActiveDirective(
  $state,
  $routerGlobals,
  $interpolate,
  $stateRegistry,
  $transitions,
) {
  return {
    restrict: "A",
    controller: function ($scope, $element, $attrs) {
      let states = [];
      let activeEqClass;
      let ngSrefActive;
      // There probably isn't much point in $observing this
      // ngSrefActive and ngSrefActiveEq share the same directive object with some
      // slight difference in logic routing
      activeEqClass = $interpolate($attrs.ngSrefActiveEq || "", false)($scope);
      try {
        ngSrefActive = $scope.$eval($attrs.ngSrefActive);
      } catch (e) {
        // Do nothing. ngSrefActive is not a valid expression.
        // Fall back to using $interpolate below
      }
      ngSrefActive =
        ngSrefActive || $interpolate($attrs.ngSrefActive || "", false)($scope);
      setStatesFromDefinitionObject(ngSrefActive);
      // Allow ngSref to communicate with ngSrefActive[Equals]
      this.$$addStateInfo = function (newState, newParams) {
        // we already got an explicit state provided by ui-sref-active, so we
        // shadow the one that comes from ui-sref
        if (isObject(ngSrefActive) && states.length > 0) {
          return;
        }
        const deregister = addState(newState, newParams, ngSrefActive);
        update();
        return deregister;
      };
      function updateAfterTransition(trans) {
        trans.promise.then(update, () => {});
      }
      $scope.$on("$destroy", setupEventListeners());
      if ($routerGlobals.transition) {
        updateAfterTransition($routerGlobals.transition);
      }
      function setupEventListeners() {
        const deregisterStatesChangedListener =
          $stateRegistry.onStatesChanged(handleStatesChanged);
        const deregisterOnStartListener = $transitions.onStart(
          {},
          updateAfterTransition,
        );
        const deregisterStateChangeSuccessListener = $scope.$on(
          "$stateChangeSuccess",
          update,
        );
        return function cleanUp() {
          deregisterStatesChangedListener();
          deregisterOnStartListener();
          deregisterStateChangeSuccessListener();
        };
      }
      function handleStatesChanged() {
        setStatesFromDefinitionObject(ngSrefActive);
      }
      function setStatesFromDefinitionObject(statesDefinition) {
        if (isObject(statesDefinition)) {
          states = [];
          Object.entries(statesDefinition).forEach(
            ([activeClass, stateOrName]) => {
              // Helper function to abstract adding state.
              const addStateForClass = function (stateOrName, activeClass) {
                const ref = parseStateRef(stateOrName);
                addState(ref.state, $scope.$eval(ref.paramExpr), activeClass);
              };
              if (isString(stateOrName)) {
                // If state is string, just add it.
                addStateForClass(stateOrName, activeClass);
              } else if (Array.isArray(stateOrName)) {
                // If state is an array, iterate over it and add each array item individually.
                stateOrName.forEach((stateOrName) => {
                  addStateForClass(stateOrName, activeClass);
                });
              }
            },
          );
        }
      }
      function addState(stateName, stateParams, activeClass) {
        const state = $state.get(stateName, stateContext($element));
        const stateInfo = {
          state: state || { name: stateName },
          params: stateParams,
          activeClass: activeClass,
        };
        states.push(stateInfo);
        return function removeState() {
          removeFrom(states)(stateInfo);
        };
      }
      // Update route state
      function update() {
        const splitClasses = (str) => str.split(/\s/).filter(Boolean);
        const getClasses = (stateList) =>
          stateList
            .map((x) => x.activeClass)
            .map(splitClasses)
            .reduce(unnestR, []);
        const allClasses = getClasses(states)
          .concat(splitClasses(activeEqClass))
          .reduce(uniqR, []);
        const fuzzyClasses = getClasses(
          states.filter((x) => $state.includes(x.state.name, x.params)),
        );
        const exactlyMatchesAny = !!states.filter((x) =>
          $state.is(x.state.name, x.params),
        ).length;
        const exactClasses = exactlyMatchesAny
          ? splitClasses(activeEqClass)
          : [];
        const addClasses = fuzzyClasses.concat(exactClasses).reduce(uniqR, []);
        const removeClasses = allClasses.filter(
          (cls) => !addClasses.includes(cls),
        );
        $scope.$evalAsync(() => {
          addClasses.forEach((className) =>
            $element[0].classList.add(className),
          );
          removeClasses.forEach((className) =>
            $element[0].classList.remove(className),
          );
        });
      }
      update();
    },
  };
}
