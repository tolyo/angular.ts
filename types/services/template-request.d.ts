/**
 * Used to configure the options passed to the {@link $http} service when making a template request.
 *
 * For example, it can be used for specifying the "Accept" header that is sent to the server, when
 * requesting a template.
 */
export function TemplateRequestProvider(): void;
export class TemplateRequestProvider {
    /**
     * The options to be passed to the {@link $http} service when making the request.
     * You can use this to override options such as the "Accept" header for template requests.
     * The {@link $templateRequest} will set the `cache` and the `transformResponse` properties of the
     * options if not overridden here.
     *
     * @param {string=} val new value for the {@link $http} options.
     * @returns {string|TemplateRequestProvider} Returns the {@link $http} options when used as getter and self if used as setter.
     */
    httpOptions: (val?: string | undefined) => string | TemplateRequestProvider;
    /**
     * The `$templateRequest` service runs security checks then downloads the provided template using
     * `$http` and, upon success, stores the contents inside of `$templateCache`. If the HTTP request
     * fails or the response data of the HTTP request is empty, a `$compile` error will be thrown (the
     * exception can be thwarted by setting the 2nd parameter of the function to true). Note that the
     * contents of `$templateCache` are trusted, so the call to `$sce.getTrustedUrl(tpl)` is omitted
     * when `tpl` is of type string and `$templateCache` has the matching entry.
     *
     * If you want to pass custom options to the `$http` service, such as setting the Accept header you
     * can configure this via {@link $templateRequestProvider#httpOptions}.
     *
     * `$templateRequest` is used internally by {@link $compile}, {@link ngRoute.$route}, and directives such
     * as {@link ngInclude} to download and cache templates.
     *
     * 3rd party modules should use `$templateRequest` if their services or directives are loading
     * templates.
     *
     * @param {string} tpl The HTTP request template URL
     * @param {boolean=} ignoreRequestError Whether or not to ignore the exception when the request fails or the template is empty
     *
     * @return {Promise} a promise for the HTTP response data of the given URL.
     *
     * @property {number} totalPendingRequests total amount of pending template requests being downloaded.
     */
    $get: (string | (($exceptionHandler: import("../core/exception-handler").ErrorHandler, $templateCache: import("../core/cache/cache-factory").TemplateCache, $http: any, $sce: any) => {
        (tpl: any, ignoreRequestError: any): any;
        totalPendingRequests: number;
    }))[];
}
