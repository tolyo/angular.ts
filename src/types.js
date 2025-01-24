/**
 * @typedef {Object} BootstrapConfig
 * @description Configuration option for AngularTS bootstrap process.
 * @property {boolean} [strictDi] - Disable automatic function annotation for the application. This is meant to assist in finding bugs which break minified code. Defaults to `false`.
 */

/**
 * @typedef {Function|Array<string|Function>} Injectable
 * @description Represents a type that can be injected, either as a function or an array of strings/functions.
 * @template T
 */

/**
 * @typedef {Object} Annotated
 * @property {Array<String>} $inject
 *
 * @typedef {Function & Annotated & Array<any>} AnnotatedFunction
 */

/**
 * @typedef {Object} ComponentOptions
 * @description Component definition object (a simplified directive definition object)
 * @property {string |Injectable<ControllerConstructor>> | undefined} [controller]
 *   Controller constructor function or name of a registered controller.
 *   Use array form for dependencies (necessary with strictDi).
 * @property {string | undefined} [controllerAs]
 *   Identifier name for the controller published to its scope (default: '$ctrl').
 * @property {string |Injectable<(...args: any[]) => string> | undefined} [template]
 *   HTML template string or function returning an HTML template.
 *   If a function, injects $element and $attrs.
 *   Use array form for dependencies (necessary with strictDi).
 * @property {string |Injectable<(...args: any[]) => string> | undefined} [templateUrl]
 *   Path or function returning a path to an HTML template.
 *   If a function, injects $element and $attrs.
 *   Use array form for dependencies (necessary with strictDi).
 * @property {{ [boundProperty: string]: string } | undefined} [bindings]
 *   DOM attribute bindings to component properties.
 *   Component properties are bound to the controller, not the scope.
 * @property {boolean | { [slot: string]: string } | undefined} [transclude]
 *   Whether transclusion is enabled. Disabled by default.
 * @property {{ [controller: string]: string } | undefined} [require]
 *   Requires controllers of other directives, binding them to this component's controller.
 *   Keys specify property names under which required controllers (object values) are bound.
 *   Required controllers available before $onInit method execution.
 */

/**
 * @typedef {Function} ControllerConstructor
 * @description Controller constructor type for AngularJS. Note: Instead of classes, plain functions are often used as controller constructors, especially in examples.
 * @param {...any} args Arguments passed to the controller constructor.
 * @returns {void | Controller} Returns nothing or an instance of IController.
 */

/**
 * @typedef {Object} OnChangesObject Object representing changes in one-way bound properties.
 * Keys are the names of the bound properties that have changed, and values are instances of IChangesObject.
 * @property {ChangesObject} property - Represents a changed property.
 */

/**
 * @typedef {Object} ChangesObject Object representing changes in a property.
 * @property {*} currentValue - Current value of the property.
 * @property {*} previousValue - Previous value of the property.
 * @property {function(): boolean} isFirstChange - Function to check if it's the first change of the property.
 */

/**
 * @typedef {Object} Controller  Interface representing the lifecycle hooks for AngularJS directive controllers.
 * @property {string} name *
 * @property {function(): void} [$onInit]
 * Called on each controller after all the controllers on an element have been constructed and had their bindings
 * initialized (and before the pre & post linking functions for the directives on this element). This is a good
 * place to put initialization code for your controller.
 *
 * @property {function(): void} [$doCheck]
 * Called on each turn of the digest cycle. Provides an opportunity to detect and act on changes.
 * Any actions that you wish to take in response to the changes that you detect must be invoked from this hook;
 * implementing this has no effect on when `$onChanges` is called. For example, this hook could be useful if you wish
 * to perform a deep equality check, or to check a `Date` object, changes to which would not be detected by Angular's
 * change detector and thus not trigger `$onChanges`. This hook is invoked with no arguments; if detecting changes,
 * you must store the previous value(s) for comparison to the current values.
 *
 * @property {function(OnChangesObject): void} [$onChanges]
 * Called whenever one-way bindings are updated. The onChangesObj is a hash whose keys are the names of the bound
 * properties that have changed, and the values are an {@link IChangesObject} object  of the form
 * { currentValue, previousValue, isFirstChange() }. Use this hook to trigger updates within a component such as
 * cloning the bound value to prevent accidental mutation of the outer value.
 *
 * @property {function(): void} [$onDestroy]
 * Called on a controller when its containing scope is destroyed. Use this hook for releasing external resources,
 * watches and event handlers.
 *
 * @property {function(): void} [$postLink]
 * Called after this controller's element and its children have been linked. Similar to the post-link function this
 * hook can be used to set up DOM event handlers and do direct DOM manipulation. Note that child elements that contain
 * templateUrl directives will not have been compiled and linked since they are waiting for their template to load
 * asynchronously and their own compilation and linking has been suspended until that occurs. This hook can be considered
 * analogous to the ngAfterViewInit and ngAfterContentInit hooks in Angular 2. Since the compilation process is rather
 * different in Angular 1 there is no direct mapping and care should be taken when upgrading.
 *
 */

/**
 * @typedef {Object.<string, any>} Attributes
 *
 * @property {(name: string) => string} $normalize
 * Converts an attribute name (e.g. dash/colon/underscore-delimited string, optionally prefixed with x- or data-) to its normalized, camelCase form.
 * Also there is special case for Moz prefix starting with upper case letter.
 *
 * @property {(newClasses: string, oldClasses: string) => void} $updateClass
 * Adds and removes the appropriate CSS class values to the element based on the difference between
 * the new and old CSS class values (specified as newClasses and oldClasses).
 *
 * @property {(key: string, value: any) => void} $set
 * Set DOM element attribute value.
 *
 * @property {<T>(name: string, fn: (value?: T) => any) => Function} $observe
 * Observes an interpolated attribute.
 * The observer function will be invoked once during the next $digest
 * following compilation. The observer is then invoked whenever the
 * interpolated value changes.
 *
 * @property {Object.<string, string>} $attr
 * A map of DOM element attribute names to the normalized name. This is needed
 * to do reverse lookup from normalized name back to actual name.
 * @see http://docs.angularjs.org/api/ng/type/$compile.directive.Attributes
 */

/**
 * @typedef {import('./core/scope/scope').Scope} TScope
 */

/**
 * @typedef {import('./shared/jqlite/jqlite').JQLite} TElement
 */

/**
 * @typedef {Attributes} TAttributes
 */

/**
 * @typedef {DirectiveController|NgModelController} TController
 */

/**
 * @typedef {Controller | Controller[] | { [key: string]: Controller }} DirectiveController
 * @description Represents a directive controller, which can be:
 * - A single instance of {@link Controller}
 * - An array of {@link Controller}
 * - An object where keys are string identifiers and values are {@link Controller}
 */

/**
 * Compile function for an AngularJS directive.
 *
 * @callback DirectiveCompileFn
 * @param {TElement} templateElement - The template element.
 * @param {TAttributes} templateAttributes - The template attributes.
 * @param {TranscludeFunction} transclude - @deprecated The transclude function. Note: The transclude function that is passed to the compile function is deprecated,
 * as it e.g. does not know about the right outer scope. Please use the transclude function
 * that is passed to the link function instead.
 * @returns {void | DirectiveLinkFn | DirectivePrePost} Returns void, DirectiveLinkFn, or  DirectivePrePost.
 */

/**
 * Link function for an AngularJS directive.
 *
 * @callback DirectiveLinkFn
 * @param {TScope} scope
 * @param {Element} instanceElement
 * @param {TAttributes} instanceAttributes
 * @param {TController} [controller]
 * @param {TranscludeFunction} [transclude]
 * @returns {void}
 */

/**
 * @callback CloneAttachFunction
 * @param {import('./shared/jqlite/jqlite').JQLite} [clonedElement]
 * @param {import('./core/scope/scope').Scope} [scope] // Let's hint but not force cloneAttachFn's signature
 * @returns {any}
 */

/**
 * This corresponds to $transclude passed to controllers and to the transclude function passed to link functions.
 * https://docs.angularjs.org/api/ng/service/$compile#-controller-
 * http://teropa.info/blog/2015/06/09/transclusion.html
 *
 * @typedef {Object} TranscludeFunctionObject
 * @property {function(TScope, CloneAttachFunction, import('./shared/jqlite/jqlite').JQLite=, string=): import('./shared/jqlite/jqlite').JQLite} transcludeWithScope
 * @property {function(CloneAttachFunction=, import('./shared/jqlite/jqlite').JQLite=, string=): import('./shared/jqlite/jqlite').JQLite} transcludeWithoutScope
 * @property {function(string): boolean} isSlotFilled - Returns true if the specified slot contains content (i.e., one or more DOM nodes)
 */

/**

 *
 * @typedef {function(TScope|Function, CloneAttachFunction=, import('./shared/jqlite/jqlite').JQLite=, string=): import('./shared/jqlite/jqlite').JQLite} TranscludeFunction
 */

/**
 * @typedef {function(TScope, CloneAttachFunction, import('./shared/jqlite/jqlite').JQLite=, string=): import('./shared/jqlite/jqlite').JQLite} transcludeWithScope
 */

/**
 * @typedef {function(CloneAttachFunction=, import('./shared/jqlite/jqlite').JQLite=, string=): import('./shared/jqlite/jqlite').JQLite} transcludeWithoutScope
 */

/**
 * Represents the pre and post linking functions of a directive.
 *
 *
 * @typedef {Object} DirectivePrePost
 * @property {DirectiveLinkFn | undefined} [pre]
 *   The pre-linking function of the directive.
 * @property {DirectiveLinkFn | undefined} [post]
 *   The post-linking function of the directive.
 */

/**
 * Directive definition object.
 *
 *
 * @typedef {Object} Directive
 * @property {DirectiveCompileFn | undefined} [compile]
 * Compile function for the directive.
 * @property {string | Injectable<ControllerConstructor> | undefined} [controller]
 * Controller constructor or name.
 * @property {string | undefined} [controllerAs]
 * Controller alias.
 * @property {boolean | { [boundProperty: string]: string } | undefined} [bindToController]
 * Bindings to controller.
 * @property {DirectiveLinkFn |  DirectivePrePost | undefined} [link]
 * Link function.
 * @property {boolean | undefined} [multiElement]
 * Multi-element directive flag.
 * @property {number | undefined} [priority]
 * Skip all directives on element
 * @property {boolean | undefined} [terminal]
 * Directive priority.
 * @property {boolean | undefined} [replace]
 * Deprecated: Replace flag.
 * @property {string | string[] | { [controller: string]: string } | undefined} [require]
 * Required controllers.
 * @property {string | undefined} [restrict]
 * Restriction mode.
 * @property {boolean | { [boundProperty: string]: string } | undefined} [scope]
 * Scope options.
 * @property {string | ((tElement: TElement, tAttrs: TAttributes) => string) | undefined} [template]
 * HTML template.
 * @property {string | undefined} [templateNamespace]
 * Template namespace.
 * @property {string | ((tElement: TElement, tAttrs: TAttributes) => string) | undefined} [templateUrl]
 * HTML template URL.
 * @property {boolean | "element" | { [slot: string]: string } | undefined} [transclude]
 * Transclusion options.
 * @property {function(...any): any} [$$addStateInfo]
 * Hidden properties added by router
 */

/**
 * Factory function for creating directives.
 *
 *
 * @typedef {(...args: any[]) => Directive | DirectiveLinkFn} DirectiveFactory
 */

/**
 * @typedef {Function} FilterFunction
 */

/**
 * @typedef {Function} FilterFactory
 * @returns {FilterFunction}
 */

/**
 * Interface for a service provider class.
 * @typedef {Object} ServiceProviderClass
 * @property {Function} constructor - The constructor for the service provider.
 * @param {...any} args - The arguments for the constructor.
 * @returns {ServiceProvider}
 */

/**
 * Interface for a service provider factory function.
 * @typedef {Function} ServiceProviderFactory
 * @param {...any} args - The arguments for the factory function.
 * @returns {ServiceProvider}
 */

/**
 * Interface for a service provider.
 * @typedef {Object|Function} ServiceProvider
 * @property {*} $get - The $get property that represents a service instance or a factory function.
 */

/**
 *
 * @typedef {Object} Module AngularJS module interface for registering components, services, providers, etc.
 * @property {function(string, ComponentOptions): Module} component
 *   Use this method to register a component.
 * @property {function({ [componentName: string]: ComponentOptions }): Module} component
 *   Use this method to register multiple components.
 * @property {function(Function): Module} config
 *   Use this method to register work which needs to be performed on module loading.
 * @property {function(any[]): Module} config
 *   Use this method to register work which needs to be performed on module loading.
 * @property {function(string, any): Module} constant
 *   Register a constant service with the $injector.
 * @property {function(Object): Module} constant
 *   Register multiple constant services.
 * @property {function(string, Injectable<ControllerConstructor>): Module} controller
 *   Register a controller with the $controller service.
 * @property {function({ [name: string]: Injectable<ControllerConstructor> }): Module} controller
 *   Register multiple controllers.
 * @property {function(string, Injectable<DirectiveFactory>): Module} directive
 *   Register a directive with the compiler.
 * @property {function(Object.<string, Injectable<DirectiveFactory>>): Module} directive
 *   Register multiple directives.
 * @property {function(string, Injectable<Function>): Module} factory
 *   Register a service factory with the $injector.
 * @property {function(Object.<string, Injectable<Function>>): Module} factory
 *   Register multiple service factories.
 * @property {function(string, Injectable<FilterFactory>): Module} filter
 *   Register a filter service.
 * @property {function(Object.<string, Injectable<FilterFactory>>): Module} filter
 *   Register multiple filter services.
 * @property {function(string, ServiceProviderFactory): Module} provider
 *   Register a provider service factory.
 * @property {function(string, ServiceProviderClass): Module} provider
 *   Register a provider service constructor.
 * @property {function(string, any[]): Module} provider
 *   Register a provider service with inline annotated constructor.
 * @property {function(Injectable<Function>): Module} run
 *   Register code to be run during module loading.
 * @property {function(string, Injectable<Function>): Module} service
 *   Register a service constructor.
 * @property {function(Object.<string, Injectable<Function>>): Module} service
 *   Register multiple service constructors.
 * @property {function(string, any): Module} value
 *   Register a value service with the $injector.
 * @property {function(Object): Module} value
 *   Register multiple value services.
 * @property {function(string, Injectable<Function>): Module} decorator
 *   Register a service decorator with the $injector.
 * @property {string} name
 *   The name of the AngularJS module.
 * @property {string[]} requires
 *   Array of module names that this module depends on.
 */

/**
 * @typedef {Object} FormController
 * @property {boolean} $pristine - True if the form has not been modified.
 * @property {boolean} $dirty - True if the form has been modified.
 * @property {boolean} $valid - True if the form is valid.
 * @property {boolean} $invalid - True if the form is invalid.
 * @property {boolean} $submitted - True if the form has been submitted.
 * @property {Object.<string, Array.<NgModelController|FormController>>} $error - An object containing arrays of controls with validation errors keyed by validation error keys.
 * @property {string|undefined} [$name] - The name of the form.
 * @property {Object.<string, Array.<NgModelController|FormController>>|undefined} [$pending] - An object containing arrays of controls that are pending validation, keyed by validation error keys.
 * @property {function(NgModelController|FormController): void} $addControl - Adds a control to the form.
 * @property {function(): ReadonlyArray.<NgModelController|FormController>} $getControls - Returns an array of all controls in the form.
 * @property {function(NgModelController|FormController): void} $removeControl - Removes a control from the form.
 * @property {function(string, boolean, NgModelController|FormController): void} $setValidity - Sets the validity of a control in the form.
 * @property {function(): void} $setDirty - Marks the form as dirty.
 * @property {function(): void} $setPristine - Marks the form as pristine.
 * @property {function(): void} $commitViewValue - Commits the view value of all controls in the form.
 * @property {function(): void} $rollbackViewValue - Rolls back the view value of all controls in the form.
 * @property {function(): void} $setSubmitted - Marks the form as submitted.
 * @property {function(): void} $setUntouched - Marks the form controls as untouched.
 * @property {function(string): any} [name] - An indexer for additional properties.
 */

/**
 * @typedef {Object} NgModelController
 * @property {function(): void} $render - Renders the view value.
 * @property {function(string, boolean): void} $setValidity - Sets the validity state.
 * @property {function(any, string=): void} $setViewValue - Sets the view value.
 * @property {function(): void} $setPristine - Marks the control as pristine.
 * @property {function(): void} $setDirty - Marks the control as dirty.
 * @property {function(): void} $validate - Validates the control.
 * @property {function(): void} $setTouched - Marks the control as touched.
 * @property {function(): void} $setUntouched - Marks the control as untouched.
 * @property {function(): void} $rollbackViewValue - Rolls back the view value.
 * @property {function(): void} $commitViewValue - Commits the view value.
 * @property {function(): void} $processModelValue - Processes the model value.
 * @property {function(any): boolean} $isEmpty - Checks if the value is empty.
 * @property {function(NgModelOptions): void} $overrideModelOptions - Overrides model options.
 * @property {*} $viewValue - The current view value.
 * @property {*} $modelValue - The current model value.
 * @property {Array.<function(any, any): boolean>} $parsers - Array of parsers.
 * @property {Array.<function(any): any>} $formatters - Array of formatters.
 * @property {Array.<function(): any>} $viewChangeListeners - Array of view change listeners.
 * @property {Object.<string, boolean>} $error - Validation errors.
 * @property {string|undefined} [$name] - The name of the control.
 * @property {boolean} $touched - True if the control has been touched.
 * @property {boolean} $untouched - True if the control has not been touched.
 * @property {Object.<string, function(any, any): boolean>} $validators - Synchronous validators.
 * @property {Object.<string, function(any, any): Promise<any>>} $asyncValidators - Asynchronous validators.
 * @property {Object.<string, boolean>|undefined} [$pending] - Pending validation.
 * @property {boolean} $pristine - True if the control is pristine.
 * @property {boolean} $dirty - True if the control is dirty.
 * @property {boolean} $valid - True if the control is valid.
 * @property {boolean} $invalid - True if the control is invalid.
 */

/**
 * @typedef {Object} NgModelOptions
 * @property {string|undefined} [updateOn] - The event to update on.
 * @property {number|Object.<string, number>|undefined} [debounce] - The debounce delay.
 * @property {boolean|undefined} [allowInvalid] - Allows invalid models.
 * @property {boolean|undefined} [getterSetter] - Indicates if getter/setter syntax is allowed.
 * @property {string|undefined} [timezone] - The timezone.
 * @property {string|undefined} [timeSecondsFormat] - The format for seconds in time and datetime-local inputs.
 * @property {boolean|undefined} [timeStripZeroSeconds] - Indicates if zero seconds should be stripped.
 */

/**
 * @typedef {Object.<string, function(any, any): boolean>} ModelValidators
 * @property {function(any, any): boolean} [index] - Validator function for each index.
 */

/**
 * @typedef {Object.<string, function(any, any): Promise<any>>} AsyncModelValidators
 * @property {function(any, any): IPromise<any>} [index] - Async validator function for each index.
 */

export {};
