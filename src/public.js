import { CompileProvider } from "./core/compile/compile.js";
import {
  inputDirective,
  ngValueDirective,
  hiddenInputBrowserCacheDirective,
} from "./directive/input/input.js";
import { formDirective, ngFormDirective } from "./directive/form/form.js";
import { scriptDirective } from "./directive/script/script.js";
import { selectDirective, optionDirective } from "./directive/select/select.js";
import {
  ngBindDirective,
  ngBindHtmlDirective,
  ngBindTemplateDirective,
} from "./directive/bind/bind.js";
import {
  ngClassDirective,
  ngClassEvenDirective,
  ngClassOddDirective,
} from "./directive/class/class.js";
import { ngCloakDirective } from "./directive/cloak/cloak.js";
import { ngControllerDirective } from "./directive/controller/controller.js";
import {
  ngHideDirective,
  ngShowDirective,
} from "./directive/show-hide/show-hide.js";
import { ngIfDirective } from "./directive/if/if.js";
import {
  ngIncludeDirective,
  ngIncludeFillContentDirective,
} from "./directive/include/include.js";
import { ngInitDirective } from "./directive/init/init.js";
import { ngNonBindableDirective } from "./directive/non-bindable/non-bindable.js";
import { ngRefDirective } from "./directive/ref/ref.js";
import { ngRepeatDirective } from "./directive/repeat/repeat.js";
import { ngStyleDirective } from "./directive/style/style.js";
import {
  ngSwitchDirective,
  ngSwitchWhenDirective,
  ngSwitchDefaultDirective,
} from "./directive/switch/switch.js";
import { ngOptionsDirective } from "./directive/options/options.js";
import { ngTranscludeDirective } from "./directive/transclude/transclude.js";
import { ngModelDirective } from "./directive/model/model.js";
import { ngChangeDirective } from "./directive/change/change.js";
import {
  maxlengthDirective,
  minlengthDirective,
  patternDirective,
  requiredDirective,
} from "./directive/validators/validators.js";
import { ngModelOptionsDirective } from "./directive/model-options/model-options.js";
import { ngAttributeAliasDirectives } from "./directive/attrs/attrs.js";
import { ngEventDirectives } from "./directive/events/events.js";
import { AnchorScrollProvider } from "./services/anchor-scroll.js";
import { AnimateProvider } from "./animations/animate.js";
import { BrowserProvider } from "./services/browser.js";
import {
  AnimateAsyncRunFactoryProvider,
  AnimateRunnerFactoryProvider,
} from "./animations/animate-runner.js";
import { TemplateCacheProvider } from "./core/cache/cache-factory.js";
import { ControllerProvider } from "./core/controller/controller.js";
import { ExceptionHandlerProvider } from "./core/exception-handler.js";
import { FilterProvider } from "./core/filter/filter.js";
import { InterpolateProvider } from "./core/interpolate/interpolate.js";
import {
  HttpProvider,
  HttpParamSerializerProvider,
} from "./services/http/http.js";
import { HttpBackendProvider } from "./services/http-backend/http-backend.js";
import { LocationProvider } from "./core/location/location.js";
import { LogProvider } from "./services/log.js";
import { ParseProvider } from "./core/parse/parse.js";
import { RootScopeProvider } from "./core/scope/scope.js";
import { SceProvider, SceDelegateProvider } from "./core/sce/sce.js";
import { TaskTrackerFactoryProvider } from "./core/task-tracker-factory.js";
import { TemplateRequestProvider } from "./services/template-request.js";
import { SanitizeUriProvider } from "./core/sanitize/sanitize-uri.js";
import {
  ngMessageDefaultDirective,
  ngMessageDirective,
  ngMessageExpDirective,
  ngMessagesDirective,
  ngMessagesIncludeDirective,
} from "./directive/messages/messages.js";
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
} from "./directive/aria/aria.js";
import { AnimateCssProvider } from "./animations/animate-css.js";
import { AnimateQueueProvider } from "./animations/animate-queue.js";
import { AnimateJsProvider } from "./animations/animate-js.js";
import { AnimationProvider } from "./animations/animation.js";
import { RafSchedulerProvider } from "./animations/raf-scheduler.js";
import { AnimateCacheProvider } from "./animations/animate-cache.js";
import { AnimateCssDriverProvider } from "./animations/animate-css-driver.js";
import { AnimateJsDriverProvider } from "./animations/animate-js-driver.js";
import { ngAnimateSwapDirective } from "./animations/animate-swap.js";
import { $$AnimateChildrenDirective } from "./animations/animate-children-directive.js";
import { UrlConfigProvider } from "./router/url/url-config.js";
import { UIRouterGlobals } from "./router/globals.js";
import { ViewService } from "./router/view/view.js";
import { TransitionProvider } from "./router/transition/transition-service.js";
import { StateProvider } from "./router/state/state-service.js";
import { ViewScrollProvider } from "./router/view-scroll.js";
import { TemplateFactoryProvider } from "./router/template-factory.js";
import { UrlService } from "./router/url/url-service.js";
import { StateRegistryProvider } from "./router/state/state-registry.js";
import { trace } from "./router/common/trace.js";
import {
  $StateRefActiveDirective,
  $StateRefDirective,
  $StateRefDynamicDirective,
} from "./router/directives/state-directives.js";
import {
  $ViewDirectiveFill,
  ngView,
} from "./router/directives/view-directive.js";
import { ngChannelDirective } from "./directive/channel/channel.js";
import { ngSetterDirective } from "./directive/setter/setter.js";

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
              ngSetter: ngSetterDirective,
              ngShow: ngShowDirective,
              ngStyle: ngStyleDirective,
              ngSwitch: ngSwitchDirective,
              ngSwitchWhen: ngSwitchWhenDirective,
              ngSwitchDefault: ngSwitchDefaultDirective,
              ngOptions: ngOptionsDirective,
              ngTransclude: ngTranscludeDirective,
              ngModel: ngModelDirective,
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
              ngChannel: ngChannelDirective,
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
            $http: HttpProvider,
            $httpParamSerializer: HttpParamSerializerProvider,
            $httpBackend: HttpBackendProvider,
            $location: LocationProvider,
            $log: LogProvider,
            $parse: ParseProvider,
            $$rAFScheduler: RafSchedulerProvider,
            $rootScope: RootScopeProvider,
            $routerGlobals: UIRouterGlobals,
            $sce: SceProvider,
            $sceDelegate: SceDelegateProvider,
            $$taskTrackerFactory: TaskTrackerFactoryProvider,
            $templateCache: TemplateCacheProvider,
            $templateRequest: TemplateRequestProvider,
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
