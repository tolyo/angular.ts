/**
 * @returns {import('../../types.js').Directive}
 */
export function ngSwitchWhenDirective(): import("../../types.js").Directive;
/**
 * @returns {import('../../types.js').Directive}
 */
export function ngSwitchDefaultDirective(): import("../../types.js").Directive;
export const ngSwitchDirective: (string | (($animate: any) => {
    require: string;
    controller: (string | {
        new (): {
            cases: {};
        };
    })[];
    link(scope: any, _element: any, attr: any, ngSwitchController: any): void;
}))[];
