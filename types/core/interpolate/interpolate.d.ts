/**
 *
 * Used for configuring the interpolation markup. Defaults to `{{` and `}}`.
 *
 * <div class="alert alert-danger">
 * This feature is sometimes used to mix different markup languages, e.g. to wrap an AngularJS
 * template within a Python Jinja template (or any other template language). Mixing templating
 * languages is **very dangerous**. The embedding template language will not safely escape AngularJS
 * expressions, so any user-controlled values in the template will cause Cross Site Scripting (XSS)
 * security bugs!
 * </div>
 */
export function InterpolateProvider(): void;
export class InterpolateProvider {
    /**
     * Symbol to denote start of expression in the interpolated string. Defaults to `{{`.
     *
     * @param {string=} value new value to set the starting symbol to.
     * @returns {string|InterpolateProvider} Returns the symbol when used as getter and self if used as setter.
     */
    startSymbol: (value?: string | undefined) => string | InterpolateProvider;
    /**
     * Symbol to denote the end of expression in the interpolated string. Defaults to `}}`.
     *
     * @param {string=} value new value to set the ending symbol to.
     * @returns {string|InterpolateProvider} Returns the symbol when used as getter and self if used as setter.
     */
    endSymbol: (value?: string | undefined) => string | InterpolateProvider;
    $get: (string | (($parse: import("../parser/parse").ParseService, $exceptionHandler: import("../exception-handler").ErrorHandler, $sce: any) => {
        (text: string, mustHaveExpression?: boolean | undefined, trustedContext?: string | undefined, allOrNothing?: boolean | undefined): Function;
        /**
         * Symbol to denote the start of expression in the interpolated string. Defaults to `{{`.
         *
         * Use {@link ng.$interpolateProvider#startSymbol `$interpolateProvider.startSymbol`} to change
         * the symbol.
         *
         * @returns {string} start symbol.
         */
        startSymbol(): string;
        /**
         * Symbol to denote the end of expression in the interpolated string. Defaults to `}}`.
         *
         * Use {@link ng.$interpolateProvider#endSymbol `$interpolateProvider.endSymbol`} to change
         * the symbol.
         *
         * @returns {string} end symbol.
         */
        endSymbol(): string;
    }))[];
}
