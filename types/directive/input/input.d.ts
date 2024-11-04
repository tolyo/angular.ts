export function weekParser(isoWeek: any, existingDate: any): any;
export function createDateParser(regexp: any, mapping: any): (iso: any, previousDate: any) => any;
export function createDateInputType(type: any, regexp: any, parseDate: any): (scope: any, element: any, attr: any, ctrl: any, $browser: any, $filter: any, $parse: any) => void;
export function badInputChecker(scope: any, element: any, attr: any, ctrl: any, parserName: any): void;
export function numberFormatterParser(ctrl: any): void;
export function isNumberInteger(num: any): boolean;
export function countDecimals(num: any): number;
export function isValidForStep(viewValue: any, stepBase: any, step: any): boolean;
export function numberInputType(scope: any, element: any, attr: any, ctrl: any, $browser: any, $filter: any, $parse: any): void;
export function rangeInputType(scope: any, element: any, attr: any, ctrl: any): void;
/**
 * @param {import('../../services/browser').Browser} $browser
 * @param {*} $filter
 * @param {*} $parse
 * @returns
 */
export function inputDirective($browser: import("../../services/browser").Browser, $filter: any, $parse: any): {
    restrict: string;
    require: string[];
    link: {
        pre(scope: any, element: any, attr: any, ctrls: any): void;
    };
};
export namespace inputDirective {
    let $inject: string[];
}
/**
 * @returns {import('../../types').Directive}
 */
export function hiddenInputBrowserCacheDirective(): import("../../types").Directive;
/**
 * @returns {import('../../types').Directive}
 */
export function ngValueDirective(): import("../../types").Directive;
export const ISO_DATE_REGEXP: RegExp;
export const URL_REGEXP: RegExp;
export const EMAIL_REGEXP: RegExp;
export const VALIDITY_STATE_PROPERTY: "validity";
