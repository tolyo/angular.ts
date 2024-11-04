export function $StateRefDirective($stateService: any, $stateRegistry: any, $transitions: any): {
    restrict: string;
    require: string[];
    link: (scope: any, element: any, attrs: any, ngSrefActive: any) => void;
};
export namespace $StateRefDirective {
    let $inject: string[];
}
export function $StateRefDynamicDirective($state: any, $stateRegistry: any, $transitions: any): {
    restrict: string;
    require: string[];
    link: (scope: any, element: any, attrs: any, ngSrefActive: any) => void;
};
export namespace $StateRefDynamicDirective {
    let $inject_1: string[];
    export { $inject_1 as $inject };
}
/**
 *
 * @param {*} $state
 * @param {*} $routerGlobals
 * @param {*} $interpolate
 * @param {*} $stateRegistry
 * @param {*} $transitions
 * @returns {import("../../types").Directive}
 */
export function $StateRefActiveDirective($state: any, $routerGlobals: any, $interpolate: any, $stateRegistry: any, $transitions: any): import("../../types").Directive;
export namespace $StateRefActiveDirective {
    let $inject_2: string[];
    export { $inject_2 as $inject };
}
