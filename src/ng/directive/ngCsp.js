/**
 * @ngdoc directive
 * @name ngCsp
 *
 * @restrict A
 * @element ANY
 * @description
 *
 * AngularJS has some features that can conflict with certain restrictions that are applied when using
 * [CSP (Content Security Policy)](https://developer.mozilla.org/en/Security/CSP) rules.
 *
 * If you intend to implement CSP with these rules then you must tell AngularJS not to use these
 * features.
 *
 * This is necessary when developing things like Google Chrome Extensions or Universal Windows Apps.
 *
 *
 * The following default rules in CSP affect AngularJS:
 *
 * * The use of `eval()`, `Function(string)` and similar functions to dynamically create and execute
 * code from strings is forbidden. AngularJS makes use of this in the {@link $parse} service to
 * provide a 30% increase in the speed of evaluating AngularJS expressions. (This CSP rule can be
 * disabled with the CSP keyword `unsafe-eval`, but it is generally not recommended as it would
 * weaken the protections offered by CSP.)
 *
 * * The use of inline resources, such as inline `<script>` and `<style>` elements, are forbidden.
 * This prevents apps from injecting custom styles directly into the document. AngularJS makes use of
 * this to include some CSS rules (e.g. {@link ngCloak} and {@link ngHide}). To make these
 * directives work when a CSP rule is blocking inline styles, you must link to the `angular-csp.css`
 * in your HTML manually. (This CSP rule can be disabled with the CSP keyword `unsafe-inline`, but
 * it is generally not recommended as it would weaken the protections offered by CSP.)
 *
 * If you do not provide `ngCsp` then AngularJS tries to autodetect if CSP is blocking dynamic code
 * creation from strings (e.g., `unsafe-eval` not specified in CSP header) and automatically
 * deactivates this feature in the {@link $parse} service. This autodetection, however, triggers a
 * CSP error to be logged in the console:
 *
 * ```
 * Refused to evaluate a string as JavaScript because 'unsafe-eval' is not an allowed source of
 * script in the following Content Security Policy directive: "default-src 'self'". Note that
 * 'script-src' was not explicitly set, so 'default-src' is used as a fallback.
 * ```
 *
 * This error is harmless but annoying. To prevent the error from showing up, put the `ngCsp`
 * directive on an element of the HTML document that appears before the `<script>` tag that loads
 * the `angular.js` file.
 *
 * *Note: This directive is only available in the `ng-csp` and `data-ng-csp` attribute form.*
 *
 * You can specify which of the CSP related AngularJS features should be deactivated by providing
 * a value for the `ng-csp` attribute. The options are as follows:
 *
 * * no-inline-style: this stops AngularJS from injecting CSS styles into the DOM
 *
 * * no-unsafe-eval: this stops AngularJS from optimizing $parse with unsafe eval of strings
 *
 * You can use these values in the following combinations:
 *
 *
 * * No declaration means that AngularJS will assume that you can do inline styles, but it will do
 * a runtime check for unsafe-eval. E.g. `<body>`. This is backwardly compatible with previous
 * versions of AngularJS.
 *
 * * A simple `ng-csp` (or `data-ng-csp`) attribute will tell AngularJS to deactivate both inline
 * styles and unsafe eval. E.g. `<body ng-csp>`. This is backwardly compatible with previous
 * versions of AngularJS.
 *
 * * Specifying only `no-unsafe-eval` tells AngularJS that we must not use eval, but that we can
 * inject inline styles. E.g. `<body ng-csp="no-unsafe-eval">`.
 *
 * * Specifying only `no-inline-style` tells AngularJS that we must not inject styles, but that we can
 * run eval - no automatic check for unsafe eval will occur. E.g. `<body ng-csp="no-inline-style">`
 *
 * * Specifying both `no-unsafe-eval` and `no-inline-style` tells AngularJS that we must not inject
 * styles nor use eval, which is the same as an empty: ng-csp.
 * E.g.`<body ng-csp="no-inline-style;no-unsafe-eval">`

// `ngCsp` is not implemented as a proper directive any more, because we need it be processed while
// we bootstrap the app (before `$parse` is instantiated). For this reason, we just have the `csp()`
// fn that looks for the `ng-csp` attribute anywhere in the current doc.
*/
