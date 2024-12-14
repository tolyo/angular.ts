/**
 * @returns {import('../../types.js').Directive}
 */
export function ngBindDirective(): import("../../types.js").Directive;
/**
 * @returns {import('../../types.js').Directive}
 */
export function ngBindTemplateDirective(): import("../../types.js").Directive;
/**
 * TODO: add type
 */
export const ngBindHtmlDirective: (string | (($parse: any) => {
    restrict: string;
    compile: (_tElement: any, tAttrs: any) => (scope: any, element: any) => void;
}))[];
