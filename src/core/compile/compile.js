import {
  JQLite,
  cleanElementData,
  getBooleanAttrName,
  getOrSetCacheData,
  isTextNode,
  startingTag,
} from "../../shared/jqlite/jqlite";
import { identifierForController } from "../controller/controller";
import {
  minErr,
  assertArg,
  assertNotHasOwnProperty,
  isDefined,
  isFunction,
  isObject,
  isString,
  lowercase,
  extend,
  isScope,
  valueFn,
  inherit,
  isUndefined,
  getNodeName,
  bind,
  trim,
  isBoolean,
  equals,
  sliceArgs,
  simpleCompare,
  isError,
  directiveNormalize,
} from "../../shared/utils";
import { SCE_CONTEXTS } from "../sce/sce";
import { PREFIX_REGEXP } from "../../shared/constants";
import { createEventDirective } from "../../directive/events/events";
import { CACHE, EXPANDO } from "../cache/cache";
import { Attributes } from "./attributes";

/**
 * Function that aggregates all linking fns for a compilation root (nodeList)
 * @typedef {Function} CompositeLinkFn
 */

const $compileMinErr = minErr("$compile");

const UNINITALIZED_VALIED = new Object();
const EXCLUDED_DIRECTIVES = ["ngIf", "ngRepeat"];

CompileProvider.$inject = ["$provide", "$$sanitizeUriProvider"];
export function CompileProvider($provide, $$sanitizeUriProvider) {
  const hasDirectives = {};
  const Suffix = "Directive";
  const ALL_OR_NOTHING_ATTRS = {
    ngSrc: true,
    ngSrcset: true,
    src: true,
    srcset: true,
  };
  const REQUIRE_PREFIX_REGEXP = /^(?:(\^\^?)?(\?)?(\^\^?)?)?/;

  // Ref: http://developers.whatwg.org/webappapis.html#event-handler-idl-attributes
  // The assumption is that future DOM event attribute names will begin with
  // 'on' and be composed of only English letters.
  const EVENT_HANDLER_ATTR_REGEXP = /^(on[a-z]+|formaction)$/;
  const bindingCache = Object.create(null);

  function parseIsolateBindings(scope, directiveName, isController) {
    const LOCAL_REGEXP = /^([@&]|[=<](\*?))(\??)\s*([\w$]*)$/;

    const bindings = Object.create(null);

    Object.entries(scope).forEach(([scopeName, definition]) => {
      definition = definition.trim();

      if (definition in bindingCache) {
        bindings[scopeName] = bindingCache[definition];
        return;
      }
      const match = definition.match(LOCAL_REGEXP);

      if (!match) {
        throw $compileMinErr(
          "iscp",
          "Invalid {3} for directive '{0}'." +
            " Definition: {... {1}: '{2}' ...}",
          directiveName,
          scopeName,
          definition,
          isController
            ? "controller bindings definition"
            : "isolate scope definition",
        );
      }

      bindings[scopeName] = {
        mode: match[1][0],
        collection: match[2] === "*",
        optional: match[3] === "?",
        attrName: match[4] || scopeName,
      };
      if (match[4]) {
        bindingCache[definition] = bindings[scopeName];
      }
    });

    return bindings;
  }

  function parseDirectiveBindings(directive, directiveName) {
    const bindings = {
      isolateScope: null,
      bindToController: null,
    };
    if (isObject(directive.scope)) {
      if (directive.bindToController === true) {
        bindings.bindToController = parseIsolateBindings(
          directive.scope,
          directiveName,
          true,
        );
        bindings.isolateScope = {};
      } else {
        bindings.isolateScope = parseIsolateBindings(
          directive.scope,
          directiveName,
          false,
        );
      }
    }
    if (isObject(directive.bindToController)) {
      bindings.bindToController = parseIsolateBindings(
        directive.bindToController,
        directiveName,
        true,
      );
    }
    if (bindings.bindToController && !directive.controller) {
      // There is no controller
      throw $compileMinErr(
        "noctrl",
        "Cannot bind to controller without directive '{0}'s controller.",
        directiveName,
      );
    }
    return bindings;
  }

  function getDirectiveRequire(directive) {
    const require =
      directive.require || (directive.controller && directive.name);

    if (!Array.isArray(require) && isObject(require)) {
      Object.entries(require).forEach(([key, value]) => {
        const match = value.match(REQUIRE_PREFIX_REGEXP);
        const name = value.substring(match[0].length);
        if (!name) require[key] = match[0] + key;
      });
    }

    return require;
  }

  function getDirectiveRestrict(restrict, name) {
    if (restrict && !(isString(restrict) && /[EA]/.test(restrict))) {
      throw $compileMinErr(
        "badrestrict",
        "Restrict property '{0}' of directive '{1}' is invalid",
        restrict,
        name,
      );
    }
    // Default is element or attribute
    return restrict || "EA";
  }

  /**
   * Register a new directive with the compiler.
   *
   * @param {string|Object} name Name of the directive in camel-case (i.e. `ngBind` which will match
   *    as `ng-bind`), or an object map of directives where the keys are the names and the values
   *    are the factories.
   * @param {Function|Array} directiveFactory An injectable directive factory function. See the
   *    {@link guide/directive directive guide} and the {@link $compile compile API} for more info.
   * @returns {CompileProvider} Self for chaining.
   */
  this.directive = function registerDirective(name, directiveFactory) {
    assertArg(name, "name");
    assertNotHasOwnProperty(name, "directive");
    if (isString(name)) {
      assertValidDirectiveName(name);
      assertArg(directiveFactory, "directiveFactory");
      if (!Object.prototype.hasOwnProperty.call(hasDirectives, name)) {
        hasDirectives[name] = [];
        $provide.factory(name + Suffix, [
          "$injector",
          "$exceptionHandler",
          /**
           *
           * @param {import("../../core/di/internal-injector").InjectorService} $injector
           * @param {import('../exception-handler').ErrorHandler} $exceptionHandler
           * @returns
           */
          function ($injector, $exceptionHandler) {
            const directives = [];
            hasDirectives[name].forEach((directiveFactory, index) => {
              try {
                let directive = $injector.invoke(directiveFactory);
                if (isFunction(directive)) {
                  directive = { compile: valueFn(directive) };
                } else if (!directive.compile && directive.link) {
                  directive.compile = valueFn(directive.link);
                }
                directive.priority = directive.priority || 0;
                directive.index = index;
                directive.name = directive.name || name;
                directive.require = getDirectiveRequire(directive);
                directive.restrict = getDirectiveRestrict(
                  directive.restrict,
                  name,
                );
                directive.$$moduleName = directiveFactory.$$moduleName;
                directives.push(directive);
              } catch (e) {
                $exceptionHandler(e);
              }
            });
            return directives;
          },
        ]);
      }
      hasDirectives[name].push(directiveFactory);
    } else {
      Object.entries(name).forEach(([k, v]) => registerDirective(k, v));
    }
    return this;
  };

  /**
   * @param {string|Object} name Name of the component in camelCase (i.e. `myComp` which will match `<my-comp>`),
   *    or an object map of components where the keys are the names and the values are the component definition objects.
   * @param {Object} options Component definition object (a simplified
   *    {directive definition object}),
   *    with the following properties (all optional):
   *
   *    - `controller` – `{(string|function()=}` – controller constructor function that should be
   *      associated with newly created scope or the name of a {controller} if passed as a string. An empty `noop` function by default.
   *    - `controllerAs` – `{string=}` – identifier name for to reference the controller in the component's scope.
   *      If present, the controller will be published to scope under the `controllerAs` name.
   *      If not present, this will default to be `$ctrl`.
   *    - `template` – `{string=|function()=}` – html template as a string or a function that
   *      returns an html template as a string which should be used as the contents of this component.
   *      Empty string by default.
   *
   *      If `template` is a function, then it is {injected} with
   *      the following locals:
   *
   *      - `$element` - Current element
   *      - `$attrs` - Current attributes object for the element
   *
   *    - `templateUrl` – `{string=|function()=}` – path or function that returns a path to an html
   *      template that should be used  as the contents of this component.
   *
   *      If `templateUrl` is a function, then it is {injected} with
   *      the following locals:
   *
   *      - `$element` - Current element
   *      - `$attrs` - Current attributes object for the element
   *
   *    - `bindings` – `{object=}` – defines bindings between DOM attributes and component properties.
   *      Component properties are always bound to the component controller and not to the scope.
   *      See {`bindToController`}.
   *    - `transclude` – `{boolean=}` – whether {content transclusion} is enabled.
   *      Disabled by default.
   *    - `require` - `{Object<string, string>=}` - requires the controllers of other directives and binds them to
   *      this component's controller. The object keys specify the property names under which the required
   *      controllers (object values) will be bound. See {`require`}.
   *    - `$...` – additional properties to attach to the directive factory function and the controller
   *      constructor function. (This is used by the component router to annotate)
   *
   * @returns {CompileProvider} the compile provider itself, for chaining of function calls.
   */
  this.component = function (name, options) {
    if (!isString(name)) {
      Object.entries(name).forEach(([key, val]) => this.component(key, val));
      return this;
    }

    const controller = options.controller || function () {};

    function factory($injector) {
      function makeInjectable(fn) {
        if (isFunction(fn) || Array.isArray(fn)) {
          return function (tElement, tAttrs) {
            return $injector.invoke(fn, this, {
              $element: tElement,
              $attrs: tAttrs,
            });
          };
        }
        return fn;
      }

      const template =
        !options.template && !options.templateUrl ? "" : options.template;
      const ddo = {
        controller,
        controllerAs:
          identifierForController(options.controller) ||
          options.controllerAs ||
          "$ctrl",
        template: makeInjectable(template),
        templateUrl: makeInjectable(options.templateUrl),
        transclude: options.transclude,
        scope: {},
        bindToController: options.bindings || {},
        restrict: "E",
        require: options.require,
      };

      // Copy annotations (starting with $) over to the DDO
      Object.entries(options).forEach(([key, val]) => {
        if (key.charAt(0) === "$") ddo[key] = val;
      });

      return ddo;
    }

    // TODO(pete) remove the following `forEach` before we release 1.6.0
    // The component-router@0.2.0 looks for the annotations on the controller constructor
    // Nothing in AngularJS looks for annotations on the factory function but we can't remove
    // it from 1.5.x yet.

    // Copy any annotation properties (starting with $) over to the factory and controller constructor functions
    // These could be used by libraries such as the new component router
    Object.entries(options).forEach(([key, val]) => {
      if (key.charAt(0) === "$") {
        factory[key] = val;
        // Don't try to copy over annotations to named controller
        if (isFunction(controller)) controller[key] = val;
      }
    });

    factory.$inject = ["$injector"];

    return this.directive(name, factory);
  };

  /**
   * Retrieves or overrides the default regular expression that is used for determining trusted safe
   * urls during a[href] sanitization.
   *
   * The sanitization is a security measure aimed at preventing XSS attacks via html links.
   *
   * Any url about to be assigned to a[href] via data-binding is first normalized and turned into
   * an absolute url. Afterwards, the url is matched against the `aHrefSanitizationTrustedUrlList`
   * regular expression. If a match is found, the original url is written into the dom. Otherwise,
   * the absolute url is prefixed with `'unsafe:'` string and only then is it written into the DOM.
   *
   * @param {RegExp=} regexp New regexp to trust urls with.
   * @returns {RegExp|CompileProvider} Current RegExp if called without value or self for
   *    chaining otherwise.
   */
  this.aHrefSanitizationTrustedUrlList = function (regexp) {
    if (isDefined(regexp)) {
      $$sanitizeUriProvider.aHrefSanitizationTrustedUrlList(regexp);
      return this;
    }
    return $$sanitizeUriProvider.aHrefSanitizationTrustedUrlList();
  };

  /**
   * Retrieves or overrides the default regular expression that is used for determining trusted safe
   * urls during img[src] sanitization.
   *
   * The sanitization is a security measure aimed at prevent XSS attacks via html links.
   *
   * Any url about to be assigned to img[src] via data-binding is first normalized and turned into
   * an absolute url. Afterwards, the url is matched against the `imgSrcSanitizationTrustedUrlList`
   * regular expression. If a match is found, the original url is written into the dom. Otherwise,
   * the absolute url is prefixed with `'unsafe:'` string and only then is it written into the DOM.
   *
   * @param {RegExp=} regexp New regexp to trust urls with.
   * @returns {RegExp|CompileProvider} Current RegExp if called without value or self for
   *    chaining otherwise.
   */
  this.imgSrcSanitizationTrustedUrlList = function (regexp) {
    if (isDefined(regexp)) {
      $$sanitizeUriProvider.imgSrcSanitizationTrustedUrlList(regexp);
      return this;
    }
    return $$sanitizeUriProvider.imgSrcSanitizationTrustedUrlList();
  };

  /**
   * @param {boolean=} enabled update the strictComponentBindingsEnabled state if provided,
   * otherwise return the current strictComponentBindingsEnabled state.
   * @returns {*} current value if used as getter or itself (chaining) if used as setter
   *
   * Call this method to enable / disable the strict component bindings check. If enabled, the
   * compiler will enforce that all scope / controller bindings of a
   * {@link $compileProvider#directive directive} / {@link $compileProvider#component component}
   * that are not set as optional with `?`, must be provided when the directive is instantiated.
   * If not provided, the compiler will throw the
   * {@link error/$compile/missingattr $compile:missingattr error}.
   *
   * The default value is false.
   */
  let strictComponentBindingsEnabled = false;
  this.strictComponentBindingsEnabled = function (enabled) {
    if (isDefined(enabled)) {
      strictComponentBindingsEnabled = enabled;
      return this;
    }
    return strictComponentBindingsEnabled;
  };

  /**
   * The security context of DOM Properties.
   */
  const PROP_CONTEXTS = Object.create(null);

  /**
   * Defines the security context for DOM properties bound by ng-prop-*.
   *
   * @param {string} elementName The element name or '*' to match any element.
   * @param {string} propertyName The DOM property name.
   * @param {string} ctx The {@link $sce} security context in which this value is safe for use, e.g. `$sce.URL`
   * @returns {object} `this` for chaining
   */
  this.addPropertySecurityContext = function (elementName, propertyName, ctx) {
    const key = `${elementName.toLowerCase()}|${propertyName.toLowerCase()}`;

    if (key in PROP_CONTEXTS && PROP_CONTEXTS[key] !== ctx) {
      throw $compileMinErr(
        "ctxoverride",
        "Property context '{0}.{1}' already set to '{2}', cannot override to '{3}'.",
        elementName,
        propertyName,
        PROP_CONTEXTS[key],
        ctx,
      );
    }

    PROP_CONTEXTS[key] = ctx;
    return this;
  };

  /* Default property contexts.
   *
   * Copy of https://github.com/angular/angular/blob/6.0.6/packages/compiler/src/schema/dom_security_schema.ts#L31-L58
   * Changing:
   * - SecurityContext.* => SCE_CONTEXTS/$sce.*
   * - STYLE => CSS
   * - various URL => MEDIA_URL
   * - *|formAction, form|action URL => RESOURCE_URL (like the attribute)
   */
  (function registerNativePropertyContexts() {
    function registerContext(ctx, values) {
      values.forEach((v) => {
        PROP_CONTEXTS[v.toLowerCase()] = ctx;
      });
    }

    registerContext(SCE_CONTEXTS.HTML, [
      "iframe|srcdoc",
      "*|innerHTML",
      "*|outerHTML",
    ]);
    registerContext(SCE_CONTEXTS.CSS, ["*|style"]);
    registerContext(SCE_CONTEXTS.URL, [
      "area|href",
      "area|ping",
      "a|href",
      "a|ping",
      "blockquote|cite",
      "body|background",
      "del|cite",
      "input|src",
      "ins|cite",
      "q|cite",
    ]);
    registerContext(SCE_CONTEXTS.MEDIA_URL, [
      "audio|src",
      "img|src",
      "img|srcset",
      "source|src",
      "source|srcset",
      "track|src",
      "video|src",
      "video|poster",
    ]);
    registerContext(SCE_CONTEXTS.RESOURCE_URL, [
      "*|formAction",
      "applet|code",
      "applet|codebase",
      "base|href",
      "embed|src",
      "frame|src",
      "form|action",
      "head|profile",
      "html|manifest",
      "iframe|src",
      "link|href",
      "media|src",
      "object|codebase",
      "object|data",
      "script|src",
    ]);
  })();

  this.$get = [
    "$injector",
    "$interpolate",
    "$exceptionHandler",
    "$templateRequest",
    "$parse",
    "$controller",
    "$rootScope",
    "$sce",
    "$animate",
    /**
     * @param {import("../../core/di/internal-injector").InjectorService} $injector
     * @param {*} $interpolate
     * @param {import("../exception-handler").ErrorHandler} $exceptionHandler
     * @param {*} $templateRequest
     * @param {import("../parse/parse").ParseService} $parse
     * @param {*} $controller
     * @param {import('../scope/scope').Scope} $rootScope
     * @param {*} $sce
     * @param {*} $animate
     * @returns
     */
    function (
      $injector,
      $interpolate,
      $exceptionHandler,
      $templateRequest,
      $parse,
      $controller,
      $rootScope,
      $sce,
      $animate,
    ) {
      // The onChanges hooks should all be run together in a single digest
      // When changes occur, the call to trigger their hooks will be added to this queue
      let onChangesQueue;

      // This function is called in a $postUpdate to trigger all the onChanges hooks in a single digest
      function flushOnChangesQueue() {
        try {
          if (!--ttl) {
            // We have hit the TTL limit so reset everything
            onChangesQueue = undefined;
            throw $compileMinErr(
              "infchng",
              "{0} $onChanges() iterations reached. Aborting!\n",
              ttl,
            );
          }
          // We must run this hook in an apply since the $postUpdate runs outside apply
          $rootScope.$apply(() => {
            for (let i = 0, ii = onChangesQueue.length; i < ii; ++i) {
              try {
                onChangesQueue[i]();
              } catch (e) {
                $exceptionHandler(e);
              }
            }
            // Reset the queue to trigger a new schedule next time there is a change
            onChangesQueue = undefined;
          });
        } finally {
          ttl++;
        }
      }

      const startSymbol = $interpolate.startSymbol();
      const endSymbol = $interpolate.endSymbol();
      /** @type {(string) => string} */
      const denormalizeTemplate =
        startSymbol === "{{" && endSymbol === "}}"
          ? (x) => x
          : (x) => x.replace(/\{\{/g, startSymbol).replace(/}}/g, endSymbol);

      const NG_PREFIX_BINDING = /^ng(Attr|Prop|On)([A-Z].*)$/;
      const MULTI_ELEMENT_DIR_RE = /^(.+)Start$/;
      return compile;

      //= ===============================

      /**
       *
       * @param {string|NodeList} $compileNodes
       * @param {*} transcludeFn
       * @param {*} maxPriority
       * @param {*} ignoreDirective
       * @param {*} previousCompileContext
       * @returns
       */
      function compile(
        $compileNodes,
        transcludeFn,
        maxPriority,
        ignoreDirective,
        previousCompileContext,
      ) {
        let jqCompileNodes = JQLite($compileNodes);

        /**
         * @type {CompositeLinkFn}
         */
        let compositeLinkFn = compileNodes(
          jqCompileNodes,
          transcludeFn,
          jqCompileNodes,
          maxPriority,
          ignoreDirective,
          previousCompileContext,
        );

        let namespace = null;
        return function publicLinkFn(scope, cloneConnectFn, options) {
          if (!jqCompileNodes) {
            throw $compileMinErr(
              "multilink",
              "This element has already been linked.",
            );
          }
          assertArg(scope, "scope");

          if (previousCompileContext && previousCompileContext.needsNewScope) {
            // A parent directive did a replace and a directive on this element asked
            // for transclusion, which caused us to lose a layer of element on which
            // we could hold the new transclusion scope, so we will create it manually
            // here.
            scope = scope.$parent.$new();
          }

          options = options || {};
          let {
            transcludeControllers,
            parentBoundTranscludeFn,
            futureParentElement,
          } = options;

          // When `parentBoundTranscludeFn` is passed, it is a
          // `controllersBoundTransclude` function (it was previously passed
          // as `transclude` to directive.link) so we must unwrap it to get
          // its `boundTranscludeFn`
          if (
            parentBoundTranscludeFn &&
            parentBoundTranscludeFn.$$boundTransclude
          ) {
            parentBoundTranscludeFn = parentBoundTranscludeFn.$$boundTransclude;
          }

          if (!namespace) {
            namespace = detectNamespaceForChildElements(futureParentElement);
          }
          let $linkNode;
          if (namespace !== "html") {
            // When using a directive with replace:true and templateUrl the jqCompileNodes
            // (or a child element inside of them)
            // might change, so we need to recreate the namespace adapted compileNodes
            // for call to the link function.
            // Note: This will already clone the nodes...
            $linkNode = JQLite(
              wrapTemplate(
                namespace,
                JQLite("<div></div>").append(jqCompileNodes).html(),
              ),
            );
          } else if (cloneConnectFn) {
            let elements = jqCompileNodes
              .elements()
              .map((element) => element.cloneNode(true));
            $linkNode = new JQLite(elements);
          } else {
            $linkNode = jqCompileNodes;
          }

          if (transcludeControllers) {
            for (const controllerName in transcludeControllers) {
              $linkNode.data(
                `$${controllerName}Controller`,
                transcludeControllers[controllerName].instance,
              );
            }
          }
          if (cloneConnectFn) cloneConnectFn($linkNode, scope);
          if (compositeLinkFn)
            compositeLinkFn(
              scope,
              $linkNode,
              $linkNode,
              parentBoundTranscludeFn,
            );

          if (!cloneConnectFn) {
            jqCompileNodes = compositeLinkFn = null;
          }
          return $linkNode;
        };
      }

      function detectNamespaceForChildElements(parentElement) {
        // TODO: Make this detect MathML as well...
        const node = parentElement && parentElement[0];
        if (!node) {
          return "html";
        }
        return getNodeName(node) !== "foreignobject" &&
          toString.call(node).match(/SVG/)
          ? "svg"
          : "html";
      }

      /**
       * Compile function matches each node in nodeList against the directives. Once all directives
       * for a particular node are collected their compile functions are executed. The compile
       * functions return values - the linking functions - are combined into a composite linking
       * function, which is the a linking function for the node.
       *
       * @param {NodeList|JQLite} nodeList an array of nodes or NodeList to compile
       * @param {*} transcludeFn A linking function, where the
       *        scope argument is auto-generated to the new child of the transcluded parent scope.
       * @param {JQLite} [$rootElement] If the nodeList is the root of the compilation tree then
       *        the rootElement must be set the JQLite collection of the compile root. This is
       *        needed so that the JQLite collection items can be replaced with widgets.
       * @param {number=} [maxPriority] Max directive priority.
       * @param {*} [ignoreDirective]
       * @param {*} [previousCompileContext]
       * @returns {Function} A composite linking function of all of the matched directives or null.
       */
      function compileNodes(
        nodeList,
        transcludeFn,
        $rootElement,
        maxPriority,
        ignoreDirective,
        previousCompileContext,
      ) {
        const linkFns = [];
        let attrs;
        let directives;
        /**
         * @type {any}
         */
        var nodeLinkFn;
        let childNodes;
        let childLinkFn;
        let linkFnFound;
        let nodeLinkFnFound;

        for (let i = 0; i < nodeList.length; i++) {
          attrs = new Attributes($rootScope, $animate, $exceptionHandler, $sce);

          // We must always refer to `nodeList[i]` hereafter,
          // since the nodes can be replaced underneath us.
          directives = collectDirectives(
            /** @type Element */ (nodeList[i]),
            [],
            attrs,
            i === 0 ? maxPriority : undefined,
            ignoreDirective,
          );

          if (directives.length) {
            nodeLinkFn = applyDirectivesToNode(
              directives,
              nodeList[i],
              attrs,
              transcludeFn,
              $rootElement,
              null,
              [],
              [],
              previousCompileContext,
            );
          } else {
            nodeLinkFn = null;
          }

          childLinkFn =
            (nodeLinkFn && nodeLinkFn.terminal) ||
            !(childNodes = nodeList[i].childNodes) ||
            !childNodes.length
              ? null
              : compileNodes(
                  childNodes,
                  nodeLinkFn
                    ? (nodeLinkFn.transcludeOnThisElement ||
                        !nodeLinkFn.templateOnThisElement) &&
                        nodeLinkFn.transclude
                    : transcludeFn,
                );

          if (nodeLinkFn || childLinkFn) {
            linkFns.push(i, nodeLinkFn, childLinkFn);
            linkFnFound = true;
            nodeLinkFnFound = nodeLinkFnFound || nodeLinkFn;
          }

          // use the previous context only for the first element in the virtual group
          previousCompileContext = null;
        }

        // return a linking function if we have found anything, null otherwise
        return linkFnFound ? compositeLinkFn : null;

        function compositeLinkFn(
          scope,
          nodeList,
          $rootElement,
          parentBoundTranscludeFn,
        ) {
          let nodeLinkFn;
          let childLinkFn;
          let node;
          let childScope;
          let i;
          let ii;
          let idx;
          let childBoundTranscludeFn;
          let stableNodeList;

          if (nodeLinkFnFound) {
            // copy nodeList so that if a nodeLinkFn removes or adds an element at this DOM level our
            // offsets don't get screwed up
            stableNodeList = new Array(nodeList.length);

            // create a sparse array by only copying the elements which have a linkFn
            for (i = 0; i < linkFns.length; i += 3) {
              idx = linkFns[i];
              stableNodeList[idx] = nodeList[idx];
            }
          } else {
            stableNodeList = nodeList;
          }

          for (i = 0, ii = linkFns.length; i < ii; ) {
            node = stableNodeList[linkFns[i++]];
            nodeLinkFn = linkFns[i++];
            childLinkFn = linkFns[i++];

            if (nodeLinkFn) {
              if (nodeLinkFn.scope) {
                childScope = scope.$new();
              } else {
                childScope = scope;
              }

              if (nodeLinkFn.transcludeOnThisElement) {
                childBoundTranscludeFn = createBoundTranscludeFn(
                  scope,
                  nodeLinkFn.transclude,
                  parentBoundTranscludeFn,
                );
              } else if (
                !nodeLinkFn.templateOnThisElement &&
                parentBoundTranscludeFn
              ) {
                childBoundTranscludeFn = parentBoundTranscludeFn;
              } else if (!parentBoundTranscludeFn && transcludeFn) {
                childBoundTranscludeFn = createBoundTranscludeFn(
                  scope,
                  transcludeFn,
                );
              } else {
                childBoundTranscludeFn = null;
              }

              nodeLinkFn(
                childLinkFn,
                childScope,
                node,
                $rootElement,
                childBoundTranscludeFn,
              );
            } else if (childLinkFn) {
              childLinkFn(
                scope,
                node.childNodes,
                undefined,
                parentBoundTranscludeFn,
              );
            }
          }
        }
      }

      function createBoundTranscludeFn(
        scope,
        transcludeFn,
        previousBoundTranscludeFn,
      ) {
        function boundTranscludeFn(
          transcludedScope,
          cloneFn,
          controllers,
          futureParentElement,
          containingScope,
        ) {
          if (!transcludedScope) {
            transcludedScope = scope.$transcluded(containingScope);
            transcludedScope.$$transcluded = true;
          }

          const transcludeRes = transcludeFn(transcludedScope, cloneFn, {
            parentBoundTranscludeFn: previousBoundTranscludeFn,
            transcludeControllers: controllers,
            futureParentElement,
          });

          return transcludeRes;
        }

        // We need  to attach the transclusion slots onto the `boundTranscludeFn`
        // so that they are available inside the `controllersBoundTransclude` function
        const boundSlots = (boundTranscludeFn.$$slots = Object.create(null));
        for (const slotName in transcludeFn.$$slots) {
          if (transcludeFn.$$slots[slotName]) {
            boundSlots[slotName] = createBoundTranscludeFn(
              scope,
              transcludeFn.$$slots[slotName],
              previousBoundTranscludeFn,
            );
          } else {
            boundSlots[slotName] = null;
          }
        }

        return boundTranscludeFn;
      }

      /**
       * Looks for directives on the given node and adds them to the directive collection which is
       * sorted.
       *
       * @param {Element} node Node to search.
       * @param directives An array to which the directives are added to. This array is sorted before
       *        the function returns.
       * @param {Attributes|import("./attributes").AttributeLike} attrs The shared attrs object which is used to populate the normalized attributes.
       * @param {number=} maxPriority Max directive priority.
       * @param {boolean=} ignoreDirective
       */
      function collectDirectives(
        node,
        directives,
        attrs,
        maxPriority,
        ignoreDirective,
      ) {
        const { nodeType } = node;
        const attrsMap = attrs.$attr;
        let nodeName;

        switch (nodeType) {
          case Node.ELEMENT_NODE /* Element */:
            nodeName = node.nodeName.toLowerCase();

            // use the node name: <directive>
            addDirective(
              directives,
              directiveNormalize(nodeName),
              "E",
              maxPriority,
              ignoreDirective,
            );

            // iterate over the attributes
            for (
              var attr,
                name,
                nName,
                value,
                ngPrefixMatch,
                nAttrs = node.attributes,
                j = 0,
                jj = nAttrs && nAttrs.length;
              j < jj;
              j++
            ) {
              /** @type {string|boolean} */
              let attrStartName = false;

              /** @type {string|boolean} */
              let attrEndName = false;

              let isNgAttr = false;
              let isNgProp = false;
              let isNgEvent = false;
              let multiElementMatch;

              attr = nAttrs[j];
              name = attr.name;
              value = attr.value;

              nName = directiveNormalize(name.toLowerCase());

              // Support ng-attr-*, ng-prop-* and ng-on-*
              if ((ngPrefixMatch = nName.match(NG_PREFIX_BINDING))) {
                isNgAttr = ngPrefixMatch[1] === "Attr";
                isNgProp = ngPrefixMatch[1] === "Prop";
                isNgEvent = ngPrefixMatch[1] === "On";

                // Normalize the non-prefixed name
                name = name
                  .replace(PREFIX_REGEXP, "")
                  .toLowerCase()
                  .substr(4 + ngPrefixMatch[1].length)
                  .replace(/_(.)/g, (match, letter) => letter.toUpperCase());

                // Support *-start / *-end multi element directives
              } else if (
                (multiElementMatch = nName.match(MULTI_ELEMENT_DIR_RE)) &&
                directiveIsMultiElement(multiElementMatch[1])
              ) {
                attrStartName = name;
                attrEndName = `${name.substr(0, name.length - 5)}end`;
                name = name.substr(0, name.length - 6);
              }

              if (isNgProp || isNgEvent) {
                attrs[nName] = value;
                attrsMap[nName] = attr.name;

                if (isNgProp) {
                  addPropertyDirective(node, directives, nName, name);
                } else {
                  addEventDirective(directives, nName, name);
                }
              } else {
                // Update nName for cases where a prefix was removed
                // NOTE: the .toLowerCase() is unnecessary and causes https://github.com/angular/angular.js/issues/16624 for ng-attr-*
                nName = directiveNormalize(name.toLowerCase());
                attrsMap[nName] = name;

                if (
                  isNgAttr ||
                  !Object.prototype.hasOwnProperty.call(attrs, nName)
                ) {
                  attrs[nName] = value;
                  if (getBooleanAttrName(node, nName)) {
                    attrs[nName] = true; // presence means true
                  }
                }

                addAttrInterpolateDirective(
                  node,
                  directives,
                  value,
                  nName,
                  isNgAttr,
                );
                addDirective(
                  directives,
                  nName,
                  "A",
                  maxPriority,
                  ignoreDirective,
                  attrStartName,
                  attrEndName,
                );
              }
            }

            if (
              nodeName === "input" &&
              node.getAttribute("type") === "hidden"
            ) {
              // Hidden input elements can have strange behaviour when navigating back to the page
              // This tells the browser not to try to cache and reinstate previous values
              node.setAttribute("autocomplete", "off");
            }

            break;
          case Node.TEXT_NODE:
            addTextInterpolateDirective(directives, node.nodeValue);
            break;
          default:
            break;
        }

        directives.sort(byPriority);
        return directives;
      }

      /**
       * Given a node with a directive-start it collects all of the siblings until it finds
       * directive-end.
       * @param {Element} node
       * @param {string} attrStart
       * @param {string} attrEnd
       * @returns {*}
       */
      function groupScan(node, attrStart, attrEnd) {
        const nodes = [];
        let depth = 0;
        if (attrStart && node.hasAttribute && node.hasAttribute(attrStart)) {
          do {
            if (!node) {
              throw $compileMinErr(
                "uterdir",
                "Unterminated attribute, found '{0}' but no matching '{1}' found.",
                attrStart,
                attrEnd,
              );
            }
            if (node.nodeType === Node.ELEMENT_NODE) {
              if (node.hasAttribute(attrStart)) depth++;
              if (node.hasAttribute(attrEnd)) depth--;
            }
            nodes.push(node);
            node = /** @type {Element} */ (node.nextSibling);
          } while (depth > 0);
        } else {
          nodes.push(node);
        }

        return JQLite(nodes);
      }

      /**
       * Wrapper for linking function which converts normal linking function into a grouped
       * linking function.
       * @param linkFn
       * @param attrStart
       * @param attrEnd
       * @returns {Function}
       */
      function groupElementsLinkFnWrapper(linkFn, attrStart, attrEnd) {
        return function groupedElementsLink(
          scope,
          element,
          attrs,
          controllers,
          transcludeFn,
        ) {
          element = groupScan(element[0], attrStart, attrEnd);
          return linkFn(scope, element, attrs, controllers, transcludeFn);
        };
      }

      /**
       * A function generator that is used to support both eager and lazy compilation
       * linking function.
       * @param eager
       * @param $compileNodes
       * @param transcludeFn
       * @param maxPriority
       * @param ignoreDirective
       * @param previousCompileContext
       * @returns {Function}
       */
      function compilationGenerator(
        eager,
        $compileNodes,
        transcludeFn,
        maxPriority,
        ignoreDirective,
        previousCompileContext,
      ) {
        let compiled;

        if (eager) {
          return compile(
            $compileNodes,
            transcludeFn,
            maxPriority,
            ignoreDirective,
            previousCompileContext,
          );
        }
        return function lazyCompilation() {
          if (!compiled) {
            compiled = compile(
              $compileNodes,
              transcludeFn,
              maxPriority,
              ignoreDirective,
              previousCompileContext,
            );

            // Null out all of these references in order to make them eligible for garbage collection
            // since this is a potentially long lived closure
            $compileNodes = transcludeFn = previousCompileContext = null;
          }
          return compiled.apply(this, arguments);
        };
      }

      /**
       * Once the directives have been collected, their compile functions are executed. This method
       * is responsible for inlining directive templates as well as terminating the application
       * of the directives if the terminal directive has been reached.
       *
       * @param {Array} directives Array of collected directives to execute their compile function.
       *        this needs to be pre-sorted by priority order.
       * @param {Node} compileNode The raw DOM node to apply the compile functions to
       * @param {Object} templateAttrs The shared attribute function
       * @param {function(import('../../core/scope/scope').Scope, Function=):any} transcludeFn A linking function, where the
       *                                                  scope argument is auto-generated to the new
       *                                                  child of the transcluded parent scope.
       * @param {JQLite} jqCollection If we are working on the root of the compile tree then this
       *                              argument has the root JQLite array so that we can replace nodes
       *                              on it.
       * @param {Object=} originalReplaceDirective An optional directive that will be ignored when
       *                                           compiling the transclusion.
       * @param {Array.<Function>} [preLinkFns]
       * @param {Array.<Function>} [postLinkFns]
       * @param {Object} [previousCompileContext] Context used for previous compilation of the current
       *                                        node
       * @returns {Function} linkFn
       */
      function applyDirectivesToNode(
        directives,
        compileNode,
        templateAttrs,
        transcludeFn,
        jqCollection,
        originalReplaceDirective,
        preLinkFns,
        postLinkFns,
        previousCompileContext,
      ) {
        previousCompileContext = previousCompileContext || {};

        let terminalPriority = -Number.MAX_VALUE;
        let { newScopeDirective } = previousCompileContext;
        let { controllerDirectives } = previousCompileContext;
        let { newIsolateScopeDirective } = previousCompileContext;
        let { templateDirective } = previousCompileContext;
        let { nonTlbTranscludeDirective } = previousCompileContext;
        let hasTranscludeDirective = false;
        let hasTemplate = false;
        let { hasElementTranscludeDirective } = previousCompileContext;
        let $compileNode = (templateAttrs.$$element = JQLite(compileNode));
        let directive;
        let directiveName;
        let $template;
        let replaceDirective = originalReplaceDirective;
        /** @type {any} */
        let childTranscludeFn = transcludeFn;
        let linkFn;
        let didScanForMultipleTransclusion = false;
        let mightHaveMultipleTransclusionError = false;
        let directiveValue;

        /** @type {any} */
        let nodeLinkFn = function (
          childLinkFn,
          scope,
          linkNode,
          _,
          boundTranscludeFn,
        ) {
          let i;
          let ii;
          /** @type {import("../../types").Directive|any} */
          let linkFn;
          let isolateScope;
          let controllerScope;
          let elementControllers;
          /** @type {import("../../types").TranscludeFunctionObject|any} */
          let transcludeFn;
          let $element;
          let attrs;
          let scopeBindingInfo;

          if (compileNode === linkNode) {
            attrs = templateAttrs;
            $element = templateAttrs.$$element;
          } else {
            $element = JQLite(linkNode);
            attrs = new Attributes(
              $rootScope,
              $animate,
              $exceptionHandler,
              $sce,
              $element,
              templateAttrs,
            );
          }

          controllerScope = scope;
          if (newIsolateScopeDirective) {
            isolateScope = scope.$newIsolate();
          } else if (newScopeDirective) {
            controllerScope = scope.$parent;
          }

          if (boundTranscludeFn) {
            // track `boundTranscludeFn` so it can be unwrapped if `transcludeFn`
            // is later passed as `parentBoundTranscludeFn` to `publicLinkFn`
            transcludeFn = controllersBoundTransclude;
            transcludeFn.$$boundTransclude = boundTranscludeFn;
            // expose the slots on the `$transclude` function
            transcludeFn.isSlotFilled = function (slotName) {
              return !!boundTranscludeFn.$$slots[slotName];
            };
          }

          if (controllerDirectives) {
            elementControllers = setupControllers(
              $element,
              attrs,
              transcludeFn,
              controllerDirectives,
              isolateScope,
              scope,
              newIsolateScopeDirective,
            );
          }

          if (newIsolateScopeDirective) {
            isolateScope.$$isolateBindings =
              newIsolateScopeDirective.$$isolateBindings;
            scopeBindingInfo = initializeDirectiveBindings(
              scope,
              attrs,
              isolateScope,
              isolateScope.$$isolateBindings,
              newIsolateScopeDirective,
            );
            if (scopeBindingInfo.removeWatches) {
              isolateScope.$on("$destroy", scopeBindingInfo.removeWatches);
            }
          }

          // Initialize bindToController bindings
          for (const name in elementControllers) {
            const controllerDirective = controllerDirectives[name];
            const controller = elementControllers[name];
            const bindings = controllerDirective.$$bindings.bindToController;

            // Controller instance is bound to the scope
            const controllerInstance = controller();
            controller.instance = controllerScope.$new(controllerInstance);
            $element.data(
              `$${controllerDirective.name}Controller`,
              controller.instance,
            );
            controller.bindingInfo = initializeDirectiveBindings(
              controllerScope,
              attrs,
              controller.instance,
              bindings,
              controllerDirective,
            );
          }

          // Bind the required controllers to the controller, if `require` is an object and `bindToController` is truthy
          if (controllerDirectives) {
            Object.entries(controllerDirectives).forEach(
              ([name, controllerDirective]) => {
                const { require } = controllerDirective;
                if (
                  controllerDirective.bindToController &&
                  !Array.isArray(require) &&
                  isObject(require)
                ) {
                  extend(
                    elementControllers[name].instance,
                    getControllers(name, require, $element, elementControllers),
                  );
                }
              },
            );
          }

          // Handle the init and destroy lifecycle hooks on all controllers that have them
          if (elementControllers) {
            Object.values(elementControllers).forEach((controller) => {
              const controllerInstance = controller.instance;
              if (isFunction(controllerInstance.$onChanges)) {
                try {
                  controllerInstance.$onChanges(
                    controller.bindingInfo.initialChanges,
                  );
                } catch (e) {
                  $exceptionHandler(e);
                }
              }
              if (isFunction(controllerInstance.$onInit)) {
                try {
                  controllerInstance.$onInit();
                } catch (e) {
                  $exceptionHandler(e);
                }
              }
              if (isFunction(controllerInstance.$doCheck)) {
                debugger;
                // this will throw
                controllerScope.$watch(() => {
                  controllerInstance.$doCheck();
                });
                controllerInstance.$doCheck();
              }
              if (isFunction(controllerInstance.$onDestroy)) {
                controllerScope.$on("$destroy", () => {
                  controllerInstance.$onDestroy();
                });
              }
            });
          }

          // PRELINKING
          for (i = 0, ii = preLinkFns.length; i < ii; i++) {
            linkFn = preLinkFns[i];
            invokeLinkFn(
              linkFn,
              linkFn.isolateScope ? isolateScope : scope,
              $element,
              attrs,
              linkFn.require &&
                getControllers(
                  linkFn.directiveName,
                  linkFn.require,
                  $element,
                  elementControllers,
                ),
              transcludeFn,
            );
          }

          // RECURSION
          // We only pass the isolate scope, if the isolate directive has a template,
          // otherwise the child elements do not belong to the isolate directive.
          var scopeToChild = scope;
          if (
            newIsolateScopeDirective &&
            (newIsolateScopeDirective.template ||
              newIsolateScopeDirective.templateUrl === null)
          ) {
            scopeToChild = isolateScope;
          }
          if (childLinkFn) {
            childLinkFn(
              scopeToChild,
              linkNode.childNodes,
              undefined,
              boundTranscludeFn,
            );
          }

          // POSTLINKING
          for (i = postLinkFns.length - 1; i >= 0; i--) {
            linkFn = postLinkFns[i];
            invokeLinkFn(
              linkFn,
              linkFn.isolateScope ? isolateScope : scope,
              $element,
              attrs,
              linkFn.require &&
                getControllers(
                  linkFn.directiveName,
                  linkFn.require,
                  $element,
                  elementControllers,
                ),
              transcludeFn,
            );
          }

          if (elementControllers) {
            // Trigger $postLink lifecycle hooks
            Object.values(elementControllers).forEach((controller) => {
              const controllerInstance = controller.instance;
              if (isFunction(controllerInstance.$postLink)) {
                controllerInstance.$postLink();
              }
            });
          }

          // This is the function that is injected as `$transclude`.
          // Note: all arguments are optional!
          function controllersBoundTransclude(
            scope,
            cloneAttachFn,
            futureParentElement,
            slotName,
          ) {
            let transcludeControllers;
            // No scope passed in:
            if (!isScope(scope)) {
              slotName = futureParentElement;
              futureParentElement = cloneAttachFn;
              cloneAttachFn = scope;
              scope = undefined;
            }

            if (hasElementTranscludeDirective) {
              transcludeControllers = elementControllers;
            }
            if (!futureParentElement) {
              futureParentElement = hasElementTranscludeDirective
                ? $element.parent()
                : $element;
            }
            if (slotName) {
              // slotTranscludeFn can be one of three things:
              //  * a transclude function - a filled slot
              //  * `null` - an optional slot that was not filled
              //  * `undefined` - a slot that was not declared (i.e. invalid)
              const slotTranscludeFn = boundTranscludeFn.$$slots[slotName];
              if (slotTranscludeFn) {
                const slotTranscludeRes = slotTranscludeFn(
                  scope,
                  cloneAttachFn,
                  transcludeControllers,
                  futureParentElement,
                  scopeToChild,
                );
                return slotTranscludeRes;
              }
              if (isUndefined(slotTranscludeFn)) {
                throw $compileMinErr(
                  "noslot",
                  'No parent directive that requires a transclusion with slot name "{0}". ' +
                    "Element: {1}",
                  slotName,
                  startingTag($element),
                );
              }
            } else {
              const boundTranscludeRes = boundTranscludeFn(
                scope,
                cloneAttachFn,
                transcludeControllers,
                futureParentElement,
                scopeToChild,
              );
              return boundTranscludeRes;
            }
          }
        };

        // executes all directives on the current element
        for (let i = 0, ii = directives.length; i < ii; i++) {
          directive = directives[i];
          const attrStart = directive.$$start;
          const attrEnd = directive.$$end;

          // collect multiblock sections
          if (attrStart) {
            $compileNode = groupScan(
              /** @type {Element} */ (compileNode),
              attrStart,
              attrEnd,
            );
          }
          $template = undefined;

          if (terminalPriority > directive.priority) {
            break; // prevent further processing of directives
          }

          directiveValue = directive.scope;

          if (directiveValue) {
            // skip the check for directives with async templates, we'll check the derived sync
            // directive when the template arrives
            if (!directive.templateUrl) {
              if (isObject(directiveValue)) {
                // This directive is trying to add an isolated scope.
                // Check that there is no scope of any kind already
                assertNoDuplicate(
                  "new/isolated scope",
                  newIsolateScopeDirective || newScopeDirective,
                  directive,
                  $compileNode,
                );
                newIsolateScopeDirective = directive;
              } else {
                // This directive is trying to add a child scope.
                // Check that there is no isolated scope already
                assertNoDuplicate(
                  "new/isolated scope",
                  newIsolateScopeDirective,
                  directive,
                  $compileNode,
                );
              }
            }

            newScopeDirective = newScopeDirective || directive;
          }

          directiveName = directive.name;

          // If we encounter a condition that can result in transclusion on the directive,
          // then scan ahead in the remaining directives for others that may cause a multiple
          // transclusion error to be thrown during the compilation process.  If a matching directive
          // is found, then we know that when we encounter a transcluded directive, we need to eagerly
          // compile the `transclude` function rather than doing it lazily in order to throw
          // exceptions at the correct time
          if (
            !didScanForMultipleTransclusion &&
            ((directive.replace &&
              (directive.templateUrl || directive.template)) ||
              (directive.transclude &&
                !EXCLUDED_DIRECTIVES.includes(directive.name)))
          ) {
            let candidateDirective;

            for (
              let scanningIndex = i + 1;
              (candidateDirective = directives[scanningIndex++]);

            ) {
              if (
                (candidateDirective.transclude &&
                  !EXCLUDED_DIRECTIVES.includes(candidateDirective.name)) ||
                (candidateDirective.replace &&
                  (candidateDirective.templateUrl ||
                    candidateDirective.template))
              ) {
                mightHaveMultipleTransclusionError = true;
                break;
              }
            }

            didScanForMultipleTransclusion = true;
          }

          if (!directive.templateUrl && directive.controller) {
            controllerDirectives = controllerDirectives || Object.create(null);
            assertNoDuplicate(
              `'${directiveName}' controller`,
              controllerDirectives[directiveName],
              directive,
              $compileNode,
            );
            controllerDirectives[directiveName] = directive;
          }

          directiveValue = directive.transclude;

          if (directiveValue) {
            hasTranscludeDirective = true;

            // Special case ngIf and ngRepeat so that we don't complain about duplicate transclusion.
            // This option should only be used by directives that know how to safely handle element transclusion,
            // where the transcluded nodes are added or replaced after linking.
            if (!EXCLUDED_DIRECTIVES.includes(directive.name)) {
              assertNoDuplicate(
                "transclusion",
                nonTlbTranscludeDirective,
                directive,
                $compileNode,
              );
              nonTlbTranscludeDirective = directive;
            }

            if (directiveValue === "element") {
              hasElementTranscludeDirective = true;
              terminalPriority = directive.priority;
              $template = $compileNode;
              $compileNode = templateAttrs.$$element = JQLite(
                document.createComment(""),
              );
              compileNode = $compileNode[0];
              replaceWith(jqCollection, sliceArgs($template), compileNode);

              childTranscludeFn = compilationGenerator(
                mightHaveMultipleTransclusionError,
                $template,
                transcludeFn,
                terminalPriority,
                replaceDirective && replaceDirective.name,
                {
                  // Don't pass in:
                  // - controllerDirectives - otherwise we'll create duplicates controllers
                  // - newIsolateScopeDirective or templateDirective - combining templates with
                  //   element transclusion doesn't make sense.
                  //
                  // We need only nonTlbTranscludeDirective so that we prevent putting transclusion
                  // on the same element more than once.
                  nonTlbTranscludeDirective,
                },
              );
            } else {
              const slots = Object.create(null);

              if (!isObject(directiveValue)) {
                $template = compileNode.cloneNode(true).childNodes;
              } else {
                // We have transclusion slots,
                // collect them up, compile them and store their transclusion functions
                $template = document.createDocumentFragment();

                const slotMap = Object.create(null);
                const filledSlots = Object.create(null);

                // Parse the element selectors
                Object.entries(directiveValue).forEach(
                  ([slotName, elementSelector]) => {
                    // If an element selector starts with a ? then it is optional
                    const optional = elementSelector.charAt(0) === "?";
                    elementSelector = optional
                      ? elementSelector.substring(1)
                      : elementSelector;

                    slotMap[elementSelector] = slotName;

                    // We explicitly assign `null` since this implies that a slot was defined but not filled.
                    // Later when calling boundTransclusion functions with a slot name we only error if the
                    // slot is `undefined`
                    slots[slotName] = null;

                    // filledSlots contains `true` for all slots that are either optional or have been
                    // filled. This is used to check that we have not missed any required slots
                    filledSlots[slotName] = optional;
                  },
                );

                // Add the matching elements into their slot
                JQLite($compileNode[0].childNodes)
                  .elements()
                  .forEach((node) => {
                    const slotName =
                      slotMap[directiveNormalize(getNodeName(node))];
                    if (slotName) {
                      filledSlots[slotName] = true;
                      slots[slotName] =
                        slots[slotName] || document.createDocumentFragment();
                      slots[slotName].appendChild(node);
                    } else {
                      $template.appendChild(node);
                    }
                  });

                // Check for required slots that were not filled
                Object.entries(filledSlots).forEach(([slotName, filled]) => {
                  if (!filled) {
                    throw $compileMinErr(
                      "reqslot",
                      "Required transclusion slot `{0}` was not filled.",
                      slotName,
                    );
                  }
                });

                for (const slotName in slots) {
                  if (slots[slotName]) {
                    // Only define a transclusion function if the slot was filled
                    const slotCompileNodes = JQLite(slots[slotName].childNodes);
                    slots[slotName] = compilationGenerator(
                      mightHaveMultipleTransclusionError,
                      slotCompileNodes,
                      transcludeFn,
                    );
                  }
                }

                $template = JQLite($template.childNodes);
              }

              $compileNode.empty(); // clear contents
              childTranscludeFn = compilationGenerator(
                mightHaveMultipleTransclusionError,
                $template,
                transcludeFn,
                undefined,
                undefined,
                {
                  needsNewScope:
                    directive.$$isolateScope || directive.$$newScope,
                },
              );
              childTranscludeFn.$$slots = slots;
            }
          }

          if (directive.template) {
            hasTemplate = true;
            assertNoDuplicate(
              "template",
              templateDirective,
              directive,
              $compileNode,
            );
            templateDirective = directive;

            directiveValue = isFunction(directive.template)
              ? directive.template($compileNode, templateAttrs)
              : directive.template;

            directiveValue = denormalizeTemplate(directiveValue);

            if (directive.replace) {
              replaceDirective = directive;
              if (isTextNode(directiveValue)) {
                $template = [];
              } else {
                $template = removeComments(
                  wrapTemplate(
                    directive.templateNamespace,
                    trim(directiveValue),
                  ),
                );
              }
              compileNode = $template[0];

              if (
                $template.length !== 1 ||
                compileNode.nodeType !== Node.ELEMENT_NODE
              ) {
                throw $compileMinErr(
                  "tplrt",
                  "Template for directive '{0}' must have exactly one root element. {1}",
                  directiveName,
                  "",
                );
              }

              replaceWith(jqCollection, $compileNode, compileNode);

              /** @type {import("./attributes").AttributeLike} */
              const newTemplateAttrs = { $attr: {} };

              // combine directives from the original node and from the template:
              // - take the array of directives for this element
              // - split it into two parts, those that already applied (processed) and those that weren't (unprocessed)
              // - collect directives from the template and sort them by priority
              // - combine directives as: processed + template + unprocessed
              const templateDirectives = collectDirectives(
                /** @type {Element} */ (compileNode),
                [],
                newTemplateAttrs,
              );
              const unprocessedDirectives = directives.splice(
                i + 1,
                directives.length - (i + 1),
              );

              if (newIsolateScopeDirective || newScopeDirective) {
                // The original directive caused the current element to be replaced but this element
                // also needs to have a new scope, so we need to tell the template directives
                // that they would need to get their scope from further up, if they require transclusion
                markDirectiveScope(
                  templateDirectives,
                  newIsolateScopeDirective,
                  newScopeDirective,
                );
              }
              directives = directives
                .concat(templateDirectives)
                .concat(unprocessedDirectives);
              mergeTemplateAttributes(templateAttrs, newTemplateAttrs);

              ii = directives.length;
            } else {
              $compileNode.html(directiveValue);
            }
          }

          if (directive.templateUrl) {
            hasTemplate = true;
            assertNoDuplicate(
              "template",
              templateDirective,
              directive,
              $compileNode,
            );
            templateDirective = directive;

            if (directive.replace) {
              replaceDirective = directive;
            }

            nodeLinkFn = compileTemplateUrl(
              directives.splice(i, directives.length - i),
              $compileNode,
              templateAttrs,
              jqCollection,
              hasTranscludeDirective && childTranscludeFn,
              preLinkFns,
              postLinkFns,
              {
                controllerDirectives,
                newScopeDirective:
                  newScopeDirective !== directive && newScopeDirective,
                newIsolateScopeDirective,
                templateDirective,
                nonTlbTranscludeDirective,
              },
            );
            ii = directives.length;
          } else if (directive.compile) {
            try {
              linkFn = directive.compile(
                $compileNode,
                templateAttrs,
                childTranscludeFn,
              );
              const context = directive.$$originalDirective || directive;
              if (isFunction(linkFn)) {
                addLinkFns(null, bind(context, linkFn), attrStart, attrEnd);
              } else if (linkFn) {
                addLinkFns(
                  bind(context, linkFn.pre),
                  bind(context, linkFn.post),
                  attrStart,
                  attrEnd,
                );
              }
            } catch (e) {
              $exceptionHandler(e, startingTag($compileNode));
            }
          }

          if (directive.terminal) {
            nodeLinkFn.terminal = true;
            terminalPriority = Math.max(terminalPriority, directive.priority);
          }
        }

        nodeLinkFn.scope =
          newScopeDirective && newScopeDirective.scope === true;
        nodeLinkFn.transcludeOnThisElement = hasTranscludeDirective;
        nodeLinkFn.templateOnThisElement = hasTemplate;
        nodeLinkFn.transclude = childTranscludeFn;

        previousCompileContext.hasElementTranscludeDirective =
          hasElementTranscludeDirective;

        // might be normal or delayed nodeLinkFn depending on if templateUrl is present
        return nodeLinkFn;

        /// /////////////////

        function addLinkFns(pre, post, attrStart, attrEnd) {
          if (pre) {
            if (attrStart)
              pre = groupElementsLinkFnWrapper(pre, attrStart, attrEnd);
            pre.require = directive.require;
            pre.directiveName = directiveName;
            if (
              newIsolateScopeDirective === directive ||
              directive.$$isolateScope
            ) {
              pre = cloneAndAnnotateFn(pre, { isolateScope: true });
            }
            preLinkFns.push(pre);
          }
          if (post) {
            if (attrStart)
              post = groupElementsLinkFnWrapper(post, attrStart, attrEnd);
            post.require = directive.require;
            post.directiveName = directiveName;
            if (
              newIsolateScopeDirective === directive ||
              directive.$$isolateScope
            ) {
              post = cloneAndAnnotateFn(post, { isolateScope: true });
            }
            postLinkFns.push(post);
          }
        }
      }

      function getControllers(
        directiveName,
        require,
        $element,
        elementControllers,
      ) {
        let value;

        if (isString(require)) {
          const match = require.match(REQUIRE_PREFIX_REGEXP);
          const name = require.substring(match[0].length);
          const inheritType = match[1] || match[3];
          const optional = match[2] === "?";

          // If only parents then start at the parent element
          if (inheritType === "^^") {
            $element = $element.parent();
            // Otherwise attempt getting the controller from elementControllers in case
            // the element is transcluded (and has no data) and to avoid .data if possible
          } else {
            value = elementControllers && elementControllers[name];
            value = value && value.instance;
          }

          if (!value) {
            const dataName = `$${name}Controller`;

            if (
              inheritType === "^^" &&
              $element[0] &&
              $element[0].nodeType === Node.DOCUMENT_NODE
            ) {
              // inheritedData() uses the documentElement when it finds the document, so we would
              // require from the element itself.
              value = null;
            } else {
              value = inheritType
                ? $element.inheritedData(dataName)
                : $element.data(dataName);
            }
          }

          if (!value && !optional) {
            throw $compileMinErr(
              "ctreq",
              "Controller '{0}', required by directive '{1}', can't be found!",
              name,
              directiveName,
            );
          }
        } else if (Array.isArray(require)) {
          value = [];
          for (let i = 0, ii = require.length; i < ii; i++) {
            value[i] = getControllers(
              directiveName,
              require[i],
              $element,
              elementControllers,
            );
          }
        } else if (isObject(require)) {
          value = {};
          Object.entries(require).forEach(([property, controller]) => {
            value[property] = getControllers(
              directiveName,
              controller,
              $element,
              elementControllers,
            );
          });
        }

        return value || null;
      }

      function setupControllers(
        $element,
        attrs,
        transcludeFn,
        controllerDirectives,
        isolateScope,
        scope,
        newIsolateScopeDirective,
      ) {
        const elementControllers = Object.create(null);
        for (const controllerKey in controllerDirectives) {
          const directive = controllerDirectives[controllerKey];
          const locals = {
            $scope:
              directive === newIsolateScopeDirective || directive.$$isolateScope
                ? isolateScope
                : scope,
            $element,
            $attrs: attrs,
            $transclude: transcludeFn,
          };

          let { controller } = directive;
          if (controller === "@") {
            controller = attrs[directive.name];
          }

          const controllerInstance = $controller(
            controller,
            locals,
            true,
            directive.controllerAs,
          );

          // For directives with element transclusion the element is a comment.
          // In this case .data will not attach any data.
          // Instead, we save the controllers for the element in a local hash and attach to .data
          // later, once we have the actual element.
          elementControllers[directive.name] = controllerInstance;
          $element.data(
            `$${directive.name}Controller`,
            controllerInstance.instance,
          );
        }
        return elementControllers;
      }

      // Depending upon the context in which a directive finds itself it might need to have a new isolated
      // or child scope created. For instance:
      // * if the directive has been pulled into a template because another directive with a higher priority
      // asked for element transclusion
      // * if the directive itself asks for transclusion but it is at the root of a template and the original
      // element was replaced. See https://github.com/angular/angular.js/issues/12936
      function markDirectiveScope(directives, isolateScope, newScope) {
        for (let j = 0, jj = directives.length; j < jj; j++) {
          directives[j] = inherit(directives[j], {
            $$isolateScope: isolateScope,
            $$newScope: newScope,
          });
        }
      }

      /**
       * looks up the directive and decorates it with exception handling and proper parameters. We
       * call this the boundDirective.
       *
       * @param {string} name name of the directive to look up.
       * @param {string} location The directive must be found in specific format.
       *   String containing any of theses characters:
       *
       *   * `E`: element name
       *   * `A': attribute
       * @returns {boolean} true if directive was added.
       */
      function addDirective(
        tDirectives,
        name,
        location,
        maxPriority,
        ignoreDirective,
        startAttrName,
        endAttrName,
      ) {
        if (name === ignoreDirective) return null;
        let match = null;
        if (Object.prototype.hasOwnProperty.call(hasDirectives, name)) {
          for (
            let directive,
              directives = $injector.get(name + Suffix),
              i = 0,
              ii = directives.length;
            i < ii;
            i++
          ) {
            directive = directives[i];
            if (
              (isUndefined(maxPriority) || maxPriority > directive.priority) &&
              directive.restrict.indexOf(location) !== -1
            ) {
              if (startAttrName) {
                directive = inherit(directive, {
                  $$start: startAttrName,
                  $$end: endAttrName,
                });
              }
              if (!directive.$$bindings) {
                const bindings = (directive.$$bindings = parseDirectiveBindings(
                  directive,
                  directive.name,
                ));
                if (isObject(bindings.isolateScope)) {
                  directive.$$isolateBindings = bindings.isolateScope;
                }
              }
              tDirectives.push(directive);
              match = directive;
            }
          }
        }
        return match;
      }

      /**
       * looks up the directive and returns true if it is a multi-element directive,
       * and therefore requires DOM nodes between -start and -end markers to be grouped
       * together. Example: `<div my-directive-start></div><div><div/><div my-directive-end></div>`
       *
       * @param {string} name name of the directive to look up.
       * @returns true if directive was registered as multi-element.
       */
      function directiveIsMultiElement(name) {
        if (Object.prototype.hasOwnProperty.call(hasDirectives, name)) {
          for (
            let directive,
              directives = $injector.get(name + Suffix),
              i = 0,
              ii = directives.length;
            i < ii;
            i++
          ) {
            directive = directives[i];
            if (directive.multiElement) {
              return true;
            }
          }
        }
        return false;
      }

      /**
       * When the element is replaced with HTML template then the new attributes
       * on the template need to be merged with the existing attributes in the DOM.
       * The desired effect is to have both of the attributes present.
       *
       * @param {object} dst destination attributes (original DOM)
       * @param {object} src source attributes (from the directive template)
       */
      function mergeTemplateAttributes(dst, src) {
        const srcAttr = src.$attr;
        const dstAttr = dst.$attr;

        // reapply the old attributes to the new element
        Object.entries(dst).forEach(([key, value]) => {
          if (key.charAt(0) !== "$") {
            if (src[key] && src[key] !== value) {
              if (value.length) {
                value += (key === "style" ? ";" : " ") + src[key];
              } else {
                value = src[key];
              }
            }
            dst.$set(key, value, true, srcAttr[key]);
          }
        });

        // copy the new attributes on the old attrs object
        Object.entries(src).forEach(([key, value]) => {
          // Check if we already set this attribute in the loop above.
          // `dst` will never contain hasOwnProperty as DOM parser won't let it.
          // You will get an "InvalidCharacterError: DOM Exception 5" error if you
          // have an attribute like "has-own-property" or "data-has-own-property", etc.
          if (
            !Object.prototype.hasOwnProperty.call(dst, key) &&
            key.charAt(0) !== "$"
          ) {
            dst[key] = value;

            if (key !== "class" && key !== "style") {
              dstAttr[key] = srcAttr[key];
            }
          }
        });
      }

      function compileTemplateUrl(
        directives,
        $compileNode,
        tAttrs,
        $rootElement,
        childTranscludeFn,
        preLinkFns,
        postLinkFns,
        previousCompileContext,
      ) {
        let linkQueue = [];
        /** @type {any} */
        let afterTemplateNodeLinkFn;
        let afterTemplateChildLinkFn;
        const beforeTemplateCompileNode = $compileNode[0];
        const origAsyncDirective = directives.shift();
        const derivedSyncDirective = inherit(origAsyncDirective, {
          templateUrl: null,
          transclude: null,
          replace: null,
          $$originalDirective: origAsyncDirective,
        });
        const templateUrl = isFunction(origAsyncDirective.templateUrl)
          ? origAsyncDirective.templateUrl($compileNode, tAttrs)
          : origAsyncDirective.templateUrl;
        const { templateNamespace } = origAsyncDirective;

        $compileNode.empty();

        $templateRequest(templateUrl)
          .then((content) => {
            let compileNode;
            let tempTemplateAttrs;
            let $template;
            let childBoundTranscludeFn;

            content = denormalizeTemplate(content);

            if (origAsyncDirective.replace) {
              if (isTextNode(content)) {
                $template = [];
              } else {
                $template = removeComments(
                  wrapTemplate(templateNamespace, trim(content)),
                );
              }
              compileNode = $template[0];

              if (
                $template.length !== 1 ||
                compileNode.nodeType !== Node.ELEMENT_NODE
              ) {
                throw $compileMinErr(
                  "tplrt",
                  "Template for directive '{0}' must have exactly one root element. {1}",
                  origAsyncDirective.name,
                  templateUrl,
                );
              }

              tempTemplateAttrs = { $attr: {} };
              replaceWith($rootElement, $compileNode, compileNode);
              const templateDirectives = collectDirectives(
                compileNode,
                [],
                tempTemplateAttrs,
              );

              if (isObject(origAsyncDirective.scope)) {
                // the original directive that caused the template to be loaded async required
                // an isolate scope
                markDirectiveScope(templateDirectives, true);
              }
              directives = templateDirectives.concat(directives);
              mergeTemplateAttributes(tAttrs, tempTemplateAttrs);
            } else {
              compileNode = beforeTemplateCompileNode;
              $compileNode.html(content);
            }

            directives.unshift(derivedSyncDirective);

            afterTemplateNodeLinkFn = applyDirectivesToNode(
              directives,
              compileNode,
              tAttrs,
              childTranscludeFn,
              $compileNode,
              origAsyncDirective,
              preLinkFns,
              postLinkFns,
              previousCompileContext,
            );
            if ($rootElement) {
              Object.entries($rootElement).forEach(([i, node]) => {
                if (node === compileNode) {
                  $rootElement[i] = $compileNode[0];
                }
              });
            }
            afterTemplateChildLinkFn = compileNodes(
              $compileNode[0].childNodes,
              childTranscludeFn,
            );

            while (linkQueue.length) {
              const scope = linkQueue.shift();
              const beforeTemplateLinkNode = linkQueue.shift();
              const linkRootElement = linkQueue.shift();
              const boundTranscludeFn = linkQueue.shift();
              let linkNode = $compileNode[0];

              if (scope.$$destroyed) continue;

              if (beforeTemplateLinkNode !== beforeTemplateCompileNode) {
                const oldClasses = beforeTemplateLinkNode.className;

                if (
                  !(
                    previousCompileContext.hasElementTranscludeDirective &&
                    origAsyncDirective.replace
                  )
                ) {
                  // it was cloned therefore we have to clone as well.
                  linkNode = compileNode.cloneNode(true);
                }
                replaceWith(
                  linkRootElement,
                  JQLite(beforeTemplateLinkNode),
                  linkNode,
                );

                // Copy in CSS classes from original node
                try {
                  if (oldClasses !== "") {
                    linkNode.classList.add(...oldClasses.trim().split(" "));
                  }
                } catch (e) {
                  // ignore, since it means that we are trying to set class on
                  // SVG element, where class name is read-only.
                }
              }
              if (afterTemplateNodeLinkFn.transcludeOnThisElement) {
                childBoundTranscludeFn = createBoundTranscludeFn(
                  scope,
                  afterTemplateNodeLinkFn.transclude,
                  boundTranscludeFn,
                );
              } else {
                childBoundTranscludeFn = boundTranscludeFn;
              }
              afterTemplateNodeLinkFn(
                afterTemplateChildLinkFn,
                scope,
                linkNode,
                $rootElement,
                childBoundTranscludeFn,
              );
            }
            linkQueue = null;
          })
          .catch((error) => {
            if (isError(error)) {
              $exceptionHandler(error);
            }
          });

        return function delayedNodeLinkFn(
          _ignoreChildLinkFn,
          scope,
          node,
          rootElement,
          boundTranscludeFn,
        ) {
          let childBoundTranscludeFn = boundTranscludeFn;
          if (scope.$$destroyed) return;
          if (linkQueue) {
            linkQueue.push(scope, node, rootElement, childBoundTranscludeFn);
          } else {
            if (afterTemplateNodeLinkFn.transcludeOnThisElement) {
              childBoundTranscludeFn = createBoundTranscludeFn(
                scope,
                afterTemplateNodeLinkFn.transclude,
                boundTranscludeFn,
              );
            }
            afterTemplateNodeLinkFn(
              afterTemplateChildLinkFn,
              scope,
              node,
              rootElement,
              childBoundTranscludeFn,
            );
          }
        };
      }

      /**
       * Sorting function for bound directives.
       */
      function byPriority(a, b) {
        const diff = b.priority - a.priority;
        if (diff !== 0) return diff;
        if (a.name !== b.name) return a.name < b.name ? -1 : 1;
        return a.index - b.index;
      }

      function assertNoDuplicate(what, previousDirective, directive, element) {
        function wrapModuleNameIfDefined(moduleName) {
          return moduleName ? ` (module: ${moduleName})` : "";
        }

        if (previousDirective) {
          throw $compileMinErr(
            "multidir",
            "Multiple directives [{0}{1}, {2}{3}] asking for {4} on: {5}",
            previousDirective.name,
            wrapModuleNameIfDefined(previousDirective.$$moduleName),
            directive.name,
            wrapModuleNameIfDefined(directive.$$moduleName),
            what,
            startingTag(element),
          );
        }
      }

      function addTextInterpolateDirective(directives, text) {
        const interpolateFn = $interpolate(text, true); // Create interpolation function
        if (interpolateFn) {
          directives.push({
            priority: 0,
            compile: () => (scope, node) => {
              interpolateFn.expressions.forEach((x) => {
                scope.$watch(x, () => {
                  node[0].nodeValue = interpolateFn(scope, (val) => {
                    node[0].nodeValue = val;
                  });
                });
              });
            },
          });
        }
      }

      /**
       * @param {string} type
       * @param {string} template
       * @returns
       */
      function wrapTemplate(type, template) {
        type = (type || "html").toLowerCase();
        switch (type) {
          case "svg":
          case "math":
            var wrapper = document.createElement("div");
            wrapper.innerHTML = `<${type}>${template}</${type}>`;
            return wrapper.childNodes[0].childNodes;
          default:
            return template;
        }
      }

      function getTrustedAttrContext(nodeName, attrNormalizedName) {
        if (attrNormalizedName === "srcdoc") {
          return $sce.HTML;
        }
        // All nodes with src attributes require a RESOURCE_URL value, except for
        // img and various html5 media nodes, which require the MEDIA_URL context.
        if (attrNormalizedName === "src" || attrNormalizedName === "ngSrc") {
          if (
            ["img", "video", "audio", "source", "track"].indexOf(nodeName) ===
            -1
          ) {
            return $sce.RESOURCE_URL;
          }
          return $sce.MEDIA_URL;
        }
        if (attrNormalizedName === "xlinkHref") {
          // Some xlink:href are okay, most aren't
          if (nodeName === "image") return $sce.MEDIA_URL;
          if (nodeName === "a") return $sce.URL;
          return $sce.RESOURCE_URL;
        }
        if (
          // Formaction
          (nodeName === "form" && attrNormalizedName === "action") ||
          // If relative URLs can go where they are not expected to, then
          // all sorts of trust issues can arise.
          (nodeName === "base" && attrNormalizedName === "href") ||
          // links can be stylesheets or imports, which can run script in the current origin
          (nodeName === "link" && attrNormalizedName === "href")
        ) {
          return $sce.RESOURCE_URL;
        }
        if (
          nodeName === "a" &&
          (attrNormalizedName === "href" || attrNormalizedName === "ngHref")
        ) {
          return $sce.URL;
        }
      }

      function getTrustedPropContext(nodeName, propNormalizedName) {
        const prop = propNormalizedName.toLowerCase();
        return (
          PROP_CONTEXTS[`${nodeName}|${prop}`] || PROP_CONTEXTS[`*|${prop}`]
        );
      }

      function sanitizeSrcsetPropertyValue(value) {
        return sanitizeSrcset($sce.valueOf(value), "ng-prop-srcset");
      }

      function sanitizeSrcset(value, invokeType) {
        if (!value) {
          return value;
        }
        if (!isString(value)) {
          throw $compileMinErr(
            "srcset",
            'Can\'t pass trusted values to `{0}`: "{1}"',
            invokeType,
            value.toString(),
          );
        }

        // Such values are a bit too complex to handle automatically inside $sce.
        // Instead, we sanitize each of the URIs individually, which works, even dynamically.

        // It's not possible to work around this using `$sce.trustAsMediaUrl`.
        // If you want to programmatically set explicitly trusted unsafe URLs, you should use
        // `$sce.trustAsHtml` on the whole `img` tag and inject it into the DOM using the
        // `ng-bind-html` directive.

        var result = "";

        // first check if there are spaces because it's not the same pattern
        var trimmedSrcset = trim(value);
        //                (   999x   ,|   999w   ,|   ,|,   )
        var srcPattern = /(\s+\d+x\s*,|\s+\d+w\s*,|\s+,|,\s+)/;
        var pattern = /\s/.test(trimmedSrcset) ? srcPattern : /(,)/;

        // split srcset into tuple of uri and descriptor except for the last item
        var rawUris = trimmedSrcset.split(pattern);

        // for each tuples
        var nbrUrisWith2parts = Math.floor(rawUris.length / 2);
        for (var i = 0; i < nbrUrisWith2parts; i++) {
          var innerIdx = i * 2;
          // sanitize the uri
          result += $sce.getTrustedMediaUrl(trim(rawUris[innerIdx]));
          // add the descriptor
          result += " " + trim(rawUris[innerIdx + 1]);
        }

        // split the last item into uri and descriptor
        var lastTuple = trim(rawUris[i * 2]).split(/\s/);

        // sanitize the last uri
        result += $sce.getTrustedMediaUrl(trim(lastTuple[0]));

        // and add the last descriptor if any
        if (lastTuple.length === 2) {
          result += " " + trim(lastTuple[1]);
        }
        return result;
      }

      function addPropertyDirective(node, directives, attrName, propName) {
        if (EVENT_HANDLER_ATTR_REGEXP.test(propName)) {
          throw $compileMinErr(
            "nodomevents",
            "Property bindings for HTML DOM event properties are disallowed",
          );
        }

        const nodeName = getNodeName(node);
        const trustedContext = getTrustedPropContext(nodeName, propName);

        let sanitizer = (x) => x;
        // Sanitize img[srcset] + source[srcset] values.
        if (
          propName === "srcset" &&
          (nodeName === "img" || nodeName === "source")
        ) {
          sanitizer = sanitizeSrcsetPropertyValue;
        } else if (trustedContext) {
          sanitizer = $sce.getTrusted.bind($sce, trustedContext);
        }

        directives.push({
          priority: 100,
          compile: function ngPropCompileFn(_, attr) {
            const ngPropGetter = $parse(attr[attrName]);
            const ngPropWatch = $parse(attr[attrName], (val) =>
              // Unwrap the value to compare the actual inner safe value, not the wrapper object.
              $sce.valueOf(val),
            );

            return {
              pre: function ngPropPreLinkFn(scope, $element) {
                function applyPropValue() {
                  const propValue = ngPropGetter(scope);
                  $element[0][propName] = sanitizer(propValue);
                }

                applyPropValue();
                scope.$watch(ngPropWatch, applyPropValue);
              },
            };
          },
        });
      }

      function addEventDirective(directives, attrName, eventName) {
        directives.push(
          createEventDirective(
            $parse,
            $rootScope,
            $exceptionHandler,
            attrName,
            eventName,
            /* forceAsync= */ false,
          ),
        );
      }

      function addAttrInterpolateDirective(
        node,
        directives,
        value,
        name,
        isNgAttr,
      ) {
        const nodeName = getNodeName(node);
        const trustedContext = getTrustedAttrContext(nodeName, name);
        const mustHaveExpression = !isNgAttr;
        const allOrNothing = ALL_OR_NOTHING_ATTRS[name] || isNgAttr;

        let interpolateFn = $interpolate(
          value,
          mustHaveExpression,
          trustedContext,
          allOrNothing,
        );

        // no interpolation found -> ignore
        if (!interpolateFn) return;

        if (name === "multiple" && nodeName === "select") {
          throw $compileMinErr(
            "selmulti",
            "Binding to the 'multiple' attribute is not supported. Element: {0}",
            startingTag(node.outerHTML),
          );
        }

        if (EVENT_HANDLER_ATTR_REGEXP.test(name)) {
          throw $compileMinErr(
            "nodomevents",
            "Interpolations for HTML DOM event attributes are disallowed",
          );
        }

        directives.push({
          priority: 100,
          compile() {
            return {
              pre: function attrInterpolatePreLinkFn(scope, element, attr) {
                const $$observers =
                  attr.$$observers || (attr.$$observers = Object.create(null));

                // If the attribute has changed since last $interpolate()ed
                const newValue = attr[name];
                if (newValue !== value) {
                  // we need to interpolate again since the attribute value has been updated
                  // (e.g. by another directive's compile function)
                  // ensure unset/empty values make interpolateFn falsy

                  interpolateFn =
                    newValue &&
                    $interpolate(newValue, true, trustedContext, allOrNothing);
                  value = newValue;
                }

                // if attribute was updated so that there is no interpolation going on we don't want to
                // register any observers
                if (!interpolateFn) return;

                // initialize attr object so that it's ready in case we need the value for isolate
                // scope initialization, otherwise the value would not be available from isolate
                // directive's linking fn during linking phase

                attr[name] = interpolateFn(scope);

                ($$observers[name] || ($$observers[name] = [])).$$inter = true;
                interpolateFn.expressions.forEach((x) => {
                  (
                    (attr.$$observers && attr.$$observers[name].$$scope) ||
                    scope
                  ).$watch(x, (newValue, oldValue) => {
                    // special case for class attribute addition + removal
                    // so that class changes can tap into the animation
                    // hooks provided by the $animate service. Be sure to
                    // skip animations when the first digest occurs (when
                    // both the new and the old values are the same) since
                    // the CSS classes are the non-interpolated values
                    if (name === "class" && newValue !== oldValue) {
                      attr.$updateClass(newValue, oldValue);
                    } else {
                      attr.$set(name, newValue);
                    }
                  });
                });
              },
            };
          },
        });
      }

      /**
       * This is a special JQLite.replaceWith, which can replace items which
       * have no parents, provided that the containing JQLite collection is provided.
       *
       * @param {JQLite} $rootElement The root of the compile tree. Used so that we can replace nodes
       *                               in the root of the tree.
       * @param {JQLite} elementsToRemove The JQLite element which we are going to replace. We keep
       *                                  the shell, but replace its DOM node reference.
       * @param {Node} newNode The new DOM node.
       */
      function replaceWith($rootElement, elementsToRemove, newNode) {
        const firstElementToRemove = elementsToRemove[0];
        const removeCount = elementsToRemove.length;
        const parent = firstElementToRemove.parentNode;
        let i;
        let ii;

        if ($rootElement) {
          for (i = 0, ii = $rootElement.length; i < ii; i++) {
            if ($rootElement[i] === firstElementToRemove) {
              $rootElement[i++] = newNode;
              for (
                let j = i, j2 = j + removeCount - 1, jj = $rootElement.length;
                j < jj;
                j++, j2++
              ) {
                if (j2 < jj) {
                  $rootElement[j] = $rootElement[j2];
                } else {
                  delete $rootElement[j];
                }
              }
              $rootElement.length -= removeCount - 1;
              break;
            }
          }
        }

        if (parent) {
          parent.replaceChild(newNode, firstElementToRemove);
        }

        // Append all the `elementsToRemove` to a fragment. This will...
        // - remove them from the DOM
        // - allow them to still be traversed with .nextSibling
        // - allow a single fragment.qSA to fetch all elements being removed
        const fragment = document.createDocumentFragment();
        for (i = 0; i < removeCount; i++) {
          fragment.appendChild(elementsToRemove[i]);
        }

        if (CACHE.has(firstElementToRemove[EXPANDO])) {
          // Copy over user data (that includes AngularJS's $scope etc.). Don't copy private
          // data here because there's no public interface in jQuery to do that and copying over
          // event listeners (which is the main use of private data) wouldn't work anyway.
          getOrSetCacheData(
            /** @type {Element} */ (newNode),
            getOrSetCacheData(firstElementToRemove),
          );

          // Remove $destroy event listeners from `firstElementToRemove`
          JQLite(firstElementToRemove).off("$destroy");
        }

        // Cleanup any data/listeners on the elements and children.
        // This includes invoking the $destroy event on any elements with listeners.
        cleanElementData(fragment.querySelectorAll("*"));

        // Update the JQLite collection to only contain the `newNode`
        for (i = 1; i < removeCount; i++) {
          delete elementsToRemove[i];
        }
        elementsToRemove[0] = newNode;
        elementsToRemove.length = 1;
      }

      function cloneAndAnnotateFn(fn, annotation) {
        return extend(
          function () {
            return fn.apply(null, arguments);
          },
          fn,
          annotation,
        );
      }

      function invokeLinkFn(
        linkFn,
        scope,
        $element,
        attrs,
        controllers,
        transcludeFn,
      ) {
        try {
          linkFn(scope, $element, attrs, controllers, transcludeFn);
        } catch (e) {
          console.error(e);
          $exceptionHandler(e, startingTag($element));
        }
      }

      function strictBindingsCheck(attrName, directiveName) {
        if (strictComponentBindingsEnabled) {
          throw $compileMinErr(
            "missingattr",
            "Attribute '{0}' of '{1}' is non-optional and must be set!",
            attrName,
            directiveName,
          );
        }
      }

      // Set up $watches for isolate scope and controller bindings.
      function initializeDirectiveBindings(
        scope,
        attrs,
        destination,
        bindings,
        directive,
      ) {
        const removeWatchCollection = [];
        const initialChanges = {};
        let changes;

        if (bindings) {
          Object.entries(bindings).forEach(([scopeName, definition]) => {
            const { attrName } = definition;
            const { optional } = definition;
            const { mode } = definition; // @, =, <, or &
            let lastValue;
            let parentGet;
            let parentSet;
            let compare;
            let removeWatch;

            switch (mode) {
              case "@":
                if (!optional && !Object.hasOwnProperty.call(attrs, attrName)) {
                  strictBindingsCheck(attrName, directive.name);
                  destination[scopeName] = attrs[attrName] = undefined;
                }
                removeWatch = attrs.$observe(attrName, (value) => {
                  if (isString(value) || isBoolean(value)) {
                    const oldValue = destination[scopeName];
                    recordChanges(scopeName, value, oldValue);
                    destination[scopeName] = value;
                  }
                });
                attrs.$$observers[attrName].$$scope = scope;
                lastValue = attrs[attrName];
                if (isString(lastValue)) {
                  // If the attribute has been provided then we trigger an interpolation to ensure
                  // the value is there for use in the link fn

                  destination[scopeName] = $interpolate(lastValue)(scope);
                } else if (isBoolean(lastValue)) {
                  // If the attributes is one of the BOOLEAN_ATTR then AngularJS will have converted
                  // the value to boolean rather than a string, so we special case this situation
                  destination[scopeName] = lastValue;
                }
                initialChanges[scopeName] = new SimpleChange(
                  UNINITALIZED_VALIED,
                  destination[scopeName],
                );
                removeWatchCollection.push(removeWatch);
                break;

              case "=":
                if (!Object.hasOwnProperty.call(attrs, attrName)) {
                  if (optional) break;
                  strictBindingsCheck(attrName, directive.name);
                  attrs[attrName] = undefined;
                }
                if (optional && !attrs[attrName]) break;

                parentGet = $parse(attrs[attrName]);
                if (parentGet.literal) {
                  compare = equals;
                } else {
                  compare = simpleCompare;
                }
                parentSet =
                  parentGet.assign ||
                  function () {
                    // reset the change, or we will throw this exception on every $digest
                    lastValue = destination[scopeName] = parentGet(scope);
                    throw $compileMinErr(
                      "nonassign",
                      "Expression '{0}' in attribute '{1}' used with directive '{2}' is non-assignable!",
                      attrs[attrName],
                      attrName,
                      directive.name,
                    );
                  };
                lastValue = destination[scopeName] = parentGet(scope);
                var parentValueWatch = function parentValueWatch(parentValue) {
                  if (!compare(parentValue, destination[scopeName])) {
                    // we are out of sync and need to copy
                    if (!compare(parentValue, lastValue)) {
                      // parent changed and it has precedence
                      destination[scopeName] = parentValue;
                    } else {
                      // if the parent can be assigned then do so
                      parentSet(scope, (parentValue = destination[scopeName]));
                    }
                  }
                  lastValue = parentValue;
                  return lastValue;
                };
                parentValueWatch.$stateful = true;
                if (definition.collection) {
                  removeWatch = scope.$watchCollection(
                    attrs[attrName],
                    parentValueWatch,
                  );
                } else {
                  removeWatch = scope.$watch(
                    $parse(attrs[attrName], parentValueWatch),
                    null,
                    parentGet.literal,
                  );
                }
                removeWatchCollection.push(removeWatch);
                break;

              case "<":
                if (!Object.hasOwnProperty.call(attrs, attrName)) {
                  if (optional) break;
                  strictBindingsCheck(attrName, directive.name);
                  attrs[attrName] = undefined;
                }
                if (optional && !attrs[attrName]) break;

                parentGet = $parse(attrs[attrName]);
                var isLiteral = parentGet.literal;

                var initialValue = (destination[scopeName] = parentGet(scope));
                initialChanges[scopeName] = new SimpleChange(
                  UNINITALIZED_VALIED,
                  destination[scopeName],
                );

                scope.attrs = attrs;
                removeWatch = scope.$watch(
                  `attrs.${attrName}`,
                  (newValue, oldValue) => {
                    if (oldValue === newValue) {
                      if (
                        oldValue === initialValue ||
                        (isLiteral && equals(oldValue, initialValue))
                      ) {
                        return;
                      }
                      oldValue = initialValue;
                    }
                    recordChanges(scopeName, newValue, oldValue);
                    destination[scopeName] = newValue;
                  },
                );

                removeWatchCollection.push(removeWatch);
                break;

              case "&":
                if (!optional && !Object.hasOwnProperty.call(attrs, attrName)) {
                  strictBindingsCheck(attrName, directive.name);
                }
                // Don't assign Object.prototype method to scope
                parentGet = Object.prototype.hasOwnProperty.call(
                  attrs,
                  attrName,
                )
                  ? $parse(attrs[attrName])
                  : () => {};

                // Don't assign noop to destination if expression is not valid
                if (parentGet.toString() === (() => {}).toString() && optional)
                  break;

                destination[scopeName] = function (locals) {
                  return parentGet(scope, locals);
                };
                break;
            }
          });
        }
        function recordChanges(key, currentValue, previousValue) {
          if (
            isFunction(destination.$onChanges) &&
            !simpleCompare(currentValue, previousValue)
          ) {
            // If we have not already scheduled the top level onChangesQueue handler then do so now
            if (!onChangesQueue) {
              scope.$postUpdate(flushOnChangesQueue);
              onChangesQueue = [];
            }
            // If we have not already queued a trigger of onChanges for this controller then do so now
            if (!changes) {
              changes = {};
              onChangesQueue.push(triggerOnChangesHook);
            }
            // If the has been a change on this property already then we need to reuse the previous value
            if (changes[key]) {
              previousValue = changes[key].previousValue;
            }
            // Store this change
            changes[key] = new SimpleChange(previousValue, currentValue);
          }
        }

        function triggerOnChangesHook() {
          destination.$onChanges(changes);
          // Now clear the changes so that we schedule onChanges when more changes arrive
          changes = undefined;
        }

        return {
          initialChanges,
          removeWatches:
            removeWatchCollection.length &&
            function removeWatches() {
              for (let i = 0, ii = removeWatchCollection.length; i < ii; ++i) {
                removeWatchCollection[i]();
              }
            },
        };
      }
    },
  ];
}

class SimpleChange {
  constructor(previous, current) {
    this.previousValue = previous;
    this.currentValue = current;
  }

  /**
   * @returns {boolean}
   */
  isFirstChange() {
    return this.previousValue === UNINITALIZED_VALIED;
  }
}

function removeComments(jqNodes) {
  jqNodes = JQLite(jqNodes);
  let i = jqNodes.length;

  if (i <= 1) {
    return jqNodes;
  }

  while (i--) {
    const node = jqNodes[i];
    if (
      node.nodeType === Node.COMMENT_NODE ||
      (node.nodeType === Node.TEXT_NODE && node.nodeValue.trim() === "")
    ) {
      [].splice.call(jqNodes, i, 1);
    }
  }
  return jqNodes;
}

/**
 * @param {String} name
 * @returns {void}
 */
function assertValidDirectiveName(name) {
  const letter = name.charAt(0);
  if (!letter || letter !== lowercase(letter)) {
    throw $compileMinErr(
      "baddir",
      "Directive/Component name '{0}' is invalid. The first character must be a lowercase letter",
      name,
    );
  }
  if (name !== name.trim()) {
    throw $compileMinErr(
      "baddir",
      "Directive/Component name '{0}' is invalid. The name should not contain leading or trailing whitespaces",
      name,
    );
  }
}
