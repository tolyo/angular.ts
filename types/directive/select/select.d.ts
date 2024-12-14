/**
 * @returns {import('../../types.js').Directive}
 */
export function selectDirective(): import("../../types.js").Directive;
export function optionDirective($interpolate: any): {
    restrict: string;
    priority: number;
    compile(element: any, attr: any): (scope: any, element: any, attr: any) => void;
};
export namespace optionDirective {
    let $inject: string[];
}
