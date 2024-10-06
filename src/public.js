import { CompileProvider } from "./core/compile/compile";
import {
  inputDirective,
  ngValueDirective,
  hiddenInputBrowserCacheDirective,
} from "./directive/input/input";
import { formDirective, ngFormDirective } from "./directive/form/form";
import { scriptDirective } from "./directive/script/script";
import { selectDirective, optionDirective } from "./directive/select/select";
import {
  ngBindDirective,
  ngBindHtmlDirective,
  ngBindTemplateDirective,
} from "./directive/bind/bind";
import {
  ngClassDirective,
  ngClassEvenDirective,
  ngClassOddDirective,
} from "./directive/class/class";
import { ngCloakDirective } from "./directive/cloak/cloak";
import { ngControllerDirective } from "./directive/controller/controller";
import {
  ngHideDirective,
  ngShowDirective,
} from "./directive/show-hide/show-hide";
import { ngIfDirective } from "./directive/if/if";
import {
  ngIncludeDirective,
  ngIncludeFillContentDirective,
} from "./directive/include/include";
import { ngInitDirective } from "./directive/init/init";
import { ngNonBindableDirective } from "./directive/non-bindable/non-bindable";
import { ngRefDirective } from "./directive/ref/ref";
import { ngRepeatDirective } from "./directive/repeat/repeat";
import { ngStyleDirective } from "./directive/style/style";
import {
  ngSwitchDirective,
  ngSwitchWhenDirective,
  ngSwitchDefaultDirective,
} from "./directive/switch/switch";
import { ngOptionsDirective } from "./directive/options/options";
import { ngTranscludeDirective } from "./directive/transclude/transclude";
import { ngModelDirective } from "./directive/model/model";
import { ngListDirective } from "./directive/list/list";
import { ngChangeDirective } from "./directive/change/change";
import {
  maxlengthDirective,
  minlengthDirective,
  patternDirective,
  requiredDirective,
} from "./directive/validators/validators";
import { ngModelOptionsDirective } from "./directive/model-options/model-options";
import { ngAttributeAliasDirectives } from "./directive/attrs/attrs";
import { ngEventDirectives } from "./directive/events/events";
import { AnchorScrollProvider } from "./services/anchor-scroll";
import { AnimateProvider } from "./animations/animate";
import { BrowserProvider } from "./services/browser";
import {
  AnimateAsyncRunFactoryProvider,
  AnimateRunnerFactoryProvider,
} from "./animations/animate-runner";
import { TemplateCacheProvider } from "./core/cache/cache-factory";
import { ControllerProvider } from "./core/controller/controller";
import { ExceptionHandlerProvider } from "./core/exception-handler";
import { FilterProvider } from "./core/filter/filter";
import { IntervalProvider } from "./core/interval/interval";
import { InterpolateProvider } from "./core/interpolate/interpolate";
import { $IntervalFactoryProvider } from "./core/interval/interval-factory";
import {
  HttpProvider,
  HttpParamSerializerProvider,
} from "./services/http/http";
import { HttpBackendProvider } from "./services/http-backend/http-backend";
import { LocationProvider } from "./core/location/location";
import { LogProvider } from "./services/log";
import { ParseProvider } from "./core/parser/parse";
import { RootScopeProvider } from "./core/scope/scope";
import { $QProvider } from "./core/q/q";
import { SceProvider, SceDelegateProvider } from "./core/sce/sce";
import { TaskTrackerFactoryProvider } from "./core/task-tracker-factory";
import { TemplateRequestProvider } from "./services/template-request";
import { TimeoutProvider } from "./core/timeout/timeout";
import { SanitizeUriProvider } from "./core/sanitize/sanitize-uri";
import {
  ngMessageDefaultDirective,
  ngMessageDirective,
  ngMessageExpDirective,
  ngMessagesDirective,
  ngMessagesIncludeDirective,
} from "./directive/messages/messages";
import {
  AriaProvider,
  ngCheckedAriaDirective,
  ngClickAriaDirective,
  ngDblclickAriaDirective,
  ngDisabledAriaDirective,
  ngHideAriaDirective,
  ngMessagesAriaDirective,
  ngModelAriaDirective,
  ngReadonlyAriaDirective,
  ngRequiredAriaDirective,
  ngShowAriaDirective,
  ngValueAriaDirective,
} from "./directive/aria/aria";
import { AnimateCssProvider } from "./animations/animate-css";
import { AnimateQueueProvider } from "./animations/animate-queue";
import { AnimateJsProvider } from "./animations/animate-js";
import { AnimationProvider } from "./animations/animation";
import { RafSchedulerProvider } from "./animations/raf-scheduler";
import { AnimateCacheProvider } from "./animations/animate-cache";
import { AnimateCssDriverProvider } from "./animations/animate-css-driver";
import { AnimateJsDriverProvider } from "./animations/animate-js-driver";
import { ngAnimateSwapDirective } from "./animations/animate-swap";
import { $$AnimateChildrenDirective } from "./animations/animate-children-directive";
import { UrlConfigProvider } from "./router/url/url-config";
import { UIRouterGlobals } from "./router/globals";
import { ViewService } from "./router/view/view";
import { TransitionProvider } from "./router/transition/transition-service";
import { StateProvider } from "./router/state/state-service";
import { ViewScrollProvider } from "./router/view-scroll";
import { TemplateFactoryProvider } from "./router/template-factory";
import { UrlService } from "./router/url/url-service";
import { StateRegistryProvider } from "./router/state/state-registry";
import { trace } from "./router/common/trace";
import {
  $StateRefActiveDirective,
  $StateRefDirective,
  $StateRefDynamicDirective,
} from "./router/directives/state-directives";
import { $ViewDirectiveFill, ngView } from "./router/directives/view-directive";
import { ngObserveDirective } from "./directive/observe/observe";

/**
 * @type {string} `version` from `package.json`, injected by Rollup plugin
 */
export const VERSION = "[VI]{version}[/VI]";

/**
 * Initializes `ng`, `animate`, `message`, `aria` and `router` modules.
 * @param {import('./loader').Angular} angular
 * @returns {import('./types').Module} `ng`module
 */
export function publishExternalAPI(angular) {
  const ng = angular
    .module(
      "ng",
      [],
      [
        "$provide",
        ($provide) => {
          // $$sanitizeUriProvider needs to be before $compileProvider as it is used by it.
          $provide.provider({
            $$sanitizeUri: SanitizeUriProvider,
          });
          $provide
            .provider("$compile", CompileProvider)
            .directive({
              input: inputDirective,
              textarea: inputDirective,
              form: formDirective,
              script: scriptDirective,
              select: selectDirective,
              option: optionDirective,
              ngBind: ngBindDirective,
              ngBindHtml: ngBindHtmlDirective,
              ngBindTemplate: ngBindTemplateDirective,
              ngClass: ngClassDirective,
              ngClassEven: ngClassEvenDirective,
              ngClassOdd: ngClassOddDirective,
              ngCloak: ngCloakDirective,
              ngController: ngControllerDirective,
              ngDisabled: ngDisabledAriaDirective,
              ngForm: ngFormDirective,
              ngHide: ngHideDirective,
              ngIf: ngIfDirective,
              ngInclude: ngIncludeDirective,
              ngInit: ngInitDirective,
              ngMessages: ngMessagesDirective,
              ngMessage: ngMessageDirective,
              ngMessageExp: ngMessageExpDirective,
              ngMessagesInclude: ngMessagesIncludeDirective,
              ngMessageDefault: ngMessageDefaultDirective,
              ngNonBindable: ngNonBindableDirective,
              ngRef: ngRefDirective,
              ngRepeat: ngRepeatDirective,
              ngShow: ngShowDirective,
              ngStyle: ngStyleDirective,
              ngSwitch: ngSwitchDirective,
              ngSwitchWhen: ngSwitchWhenDirective,
              ngSwitchDefault: ngSwitchDefaultDirective,
              ngObserve: ngObserveDirective,
              ngOptions: ngOptionsDirective,
              ngTransclude: ngTranscludeDirective,
              ngModel: ngModelDirective,
              ngList: ngListDirective,
              ngChange: ngChangeDirective,
              pattern: patternDirective,
              ngPattern: patternDirective,
              required: requiredDirective,
              ngRequired: requiredDirective,
              ngMinlength: minlengthDirective,
              minlength: minlengthDirective,
              ngMaxlength: maxlengthDirective,
              maxlength: maxlengthDirective,
              ngValue: ngValueDirective,
              ngModelOptions: ngModelOptionsDirective,
            })
            .directive({
              input: hiddenInputBrowserCacheDirective,
              ngAnimateSwap: ngAnimateSwapDirective,
              ngAnimateChildren: $$AnimateChildrenDirective,
              ngChecked: ngCheckedAriaDirective,
              ngClick: ngClickAriaDirective,
              ngDblclick: ngDblclickAriaDirective,
              ngInclude: ngIncludeFillContentDirective,
              ngHide: ngHideAriaDirective,
              ngShow: ngShowAriaDirective,
              ngMessages: ngMessagesAriaDirective,
              ngModel: ngModelAriaDirective,
              ngReadonly: ngReadonlyAriaDirective,
              ngRequired: ngRequiredAriaDirective,
              ngValue: ngValueAriaDirective,
              ngSref: $StateRefDirective,
              ngSrefActive: $StateRefActiveDirective,
              ngSrefActiveEq: $StateRefActiveDirective,
              ngState: $StateRefDynamicDirective,
              ngView: ngView,
            })
            .directive({
              ngView: $ViewDirectiveFill,
            })
            .directive(ngAttributeAliasDirectives)
            .directive(ngEventDirectives);
          $provide.provider({
            $aria: AriaProvider,
            $anchorScroll: AnchorScrollProvider,
            $animate: AnimateProvider,
            $$animation: AnimationProvider,
            $animateCss: AnimateCssProvider,
            $$animateCssDriver: AnimateCssDriverProvider,
            $$animateJs: AnimateJsProvider,
            $$animateJsDriver: AnimateJsDriverProvider,
            $$animateCache: AnimateCacheProvider,
            $$animateQueue: AnimateQueueProvider,
            $$AnimateRunner: AnimateRunnerFactoryProvider,
            $$animateAsyncRun: AnimateAsyncRunFactoryProvider,
            $browser: BrowserProvider,
            $controller: ControllerProvider,
            $exceptionHandler: ExceptionHandlerProvider,
            $filter: FilterProvider,
            $interpolate: InterpolateProvider,
            $interval: IntervalProvider,
            $$intervalFactory: $IntervalFactoryProvider,
            $http: HttpProvider,
            $httpParamSerializer: HttpParamSerializerProvider,
            $httpBackend: HttpBackendProvider,
            $location: LocationProvider,
            $log: LogProvider,
            $parse: ParseProvider,
            $$rAFScheduler: RafSchedulerProvider,
            $rootScope: RootScopeProvider,
            $routerGlobals: UIRouterGlobals,
            $q: $QProvider,
            $sce: SceProvider,
            $sceDelegate: SceDelegateProvider,
            $$taskTrackerFactory: TaskTrackerFactoryProvider,
            $templateCache: TemplateCacheProvider,
            $templateRequest: TemplateRequestProvider,
            $timeout: TimeoutProvider,
            $urlConfig: UrlConfigProvider,
            $view: ViewService,
            $transitions: TransitionProvider,
            $state: StateProvider,
            $ngViewScroll: ViewScrollProvider,
            $templateFactory: TemplateFactoryProvider,
            $urlService: UrlService,
            $stateRegistry: StateRegistryProvider,
          });
        },
      ],
    )
    .factory("$stateParams", [
      "$routerGlobals",
      function (globals) {
        return globals.params;
      },
    ])
    .value("$trace", trace)
    .info({ version: VERSION });

  return ng;
}
