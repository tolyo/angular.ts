export type BootstrapConfig = any;
export type Injectable<T> = Function | Array<string | Function>;
export type Annotated = {
    $inject: Array<string>;
};
export type AnnotatedFunction = Function & Annotated & Array<any>;
export type ComponentOptions = any;
export type ControllerConstructor = Function;
/**
 * Object representing changes in one-way bound properties.
 * Keys are the names of the bound properties that have changed, and values are instances of IChangesObject.
 */
export type OnChangesObject = {
    /**
     * - Represents a changed property.
     */
    property: ChangesObject;
};
/**
 * Object representing changes in a property.
 */
export type ChangesObject = {
    /**
     * - Current value of the property.
     */
    currentValue: any;
    /**
     * - Previous value of the property.
     */
    previousValue: any;
    /**
     * - Function to check if it's the first change of the property.
     */
    isFirstChange: () => boolean;
};
/**
 * Interface representing the lifecycle hooks for AngularJS directive controllers.
 */
export type Controller = {
    /**
     * *
     */
    name: string;
    /**
     * Called on each controller after all the controllers on an element have been constructed and had their bindings
     * initialized (and before the pre & post linking functions for the directives on this element). This is a good
     * place to put initialization code for your controller.
     */
    $onInit?: () => void;
    /**
     * Called on each turn of the digest cycle. Provides an opportunity to detect and act on changes.
     * Any actions that you wish to take in response to the changes that you detect must be invoked from this hook;
     * implementing this has no effect on when `$onChanges` is called. For example, this hook could be useful if you wish
     * to perform a deep equality check, or to check a `Date` object, changes to which would not be detected by Angular's
     * change detector and thus not trigger `$onChanges`. This hook is invoked with no arguments; if detecting changes,
     * you must store the previous value(s) for comparison to the current values.
     */
    $doCheck?: () => void;
    /**
     * Called whenever one-way bindings are updated. The onChangesObj is a hash whose keys are the names of the bound
     * properties that have changed, and the values are an {@link IChangesObject} object  of the form
     * { currentValue, previousValue, isFirstChange() }. Use this hook to trigger updates within a component such as
     * cloning the bound value to prevent accidental mutation of the outer value.
     */
    $onChanges?: (arg0: OnChangesObject) => void;
    /**
     * Called on a controller when its containing scope is destroyed. Use this hook for releasing external resources,
     * watches and event handlers.
     */
    $onDestroy?: () => void;
    /**
     * Called after this controller's element and its children have been linked. Similar to the post-link function this
     * hook can be used to set up DOM event handlers and do direct DOM manipulation. Note that child elements that contain
     * templateUrl directives will not have been compiled and linked since they are waiting for their template to load
     * asynchronously and their own compilation and linking has been suspended until that occurs. This hook can be considered
     * analogous to the ngAfterViewInit and ngAfterContentInit hooks in Angular 2. Since the compilation process is rather
     * different in Angular 1 there is no direct mapping and care should be taken when upgrading.
     */
    $postLink?: () => void;
};
export type Attributes = {
    [x: string]: any;
};
export type TScope = import("./core/scope/scope").Scope;
export type TElement = import("./shared/jqlite/jqlite.js").JQLite;
export type TAttributes = Attributes;
export type TController = DirectiveController | NgModelController;
export type DirectiveController = Controller | Controller[] | {
    [key: string]: Controller;
};
/**
 * Compile function for an AngularJS directive.
 */
export type DirectiveCompileFn = (templateElement: TElement, templateAttributes: TAttributes, transclude: TranscludeFunction) => any;
/**
 * Link function for an AngularJS directive.
 */
export type DirectiveLinkFn = (scope: TScope, instanceElement: TElement, instanceAttributes: TAttributes, controller?: TController, transclude?: TranscludeFunction) => void;
export type CloneAttachFunction = (clonedElement?: import("./shared/jqlite/jqlite.js").JQLite, scope?: import("./core/scope/scope").Scope) => any;
/**
 * This corresponds to $transclude passed to controllers and to the transclude function passed to link functions.
 * https://docs.angularjs.org/api/ng/service/$compile#-controller-
 * http://teropa.info/blog/2015/06/09/transclusion.html
 */
export type TranscludeFunctionObject = {
    transcludeWithScope: (arg0: TScope, arg1: CloneAttachFunction, arg2: import("./shared/jqlite/jqlite.js").JQLite | undefined, arg3: string | undefined) => import("./shared/jqlite/jqlite.js").JQLite;
    transcludeWithoutScope: (arg0: CloneAttachFunction | undefined, arg1: import("./shared/jqlite/jqlite.js").JQLite | undefined, arg2: string | undefined) => import("./shared/jqlite/jqlite.js").JQLite;
    /**
     * - Returns true if the specified slot contains content (i.e., one or more DOM nodes)
     */
    isSlotFilled: (arg0: string) => boolean;
};
export type TranscludeFunction = (arg0: TScope | Function, arg1: CloneAttachFunction | undefined, arg2: import("./shared/jqlite/jqlite.js").JQLite | undefined, arg3: string | undefined) => import("./shared/jqlite/jqlite.js").JQLite;
export type transcludeWithScope = (arg0: TScope, arg1: CloneAttachFunction, arg2: import("./shared/jqlite/jqlite.js").JQLite | undefined, arg3: string | undefined) => import("./shared/jqlite/jqlite.js").JQLite;
export type transcludeWithoutScope = (arg0: CloneAttachFunction | undefined, arg1: import("./shared/jqlite/jqlite.js").JQLite | undefined, arg2: string | undefined) => import("./shared/jqlite/jqlite.js").JQLite;
/**
 * Represents the pre and post linking functions of a directive.
 */
export type DirectivePrePost = {
    /**
     * The pre-linking function of the directive.
     */
    pre?: DirectiveLinkFn | undefined;
    /**
     * The post-linking function of the directive.
     */
    post?: DirectiveLinkFn | undefined;
};
/**
 * Directive definition object.
 */
export type Directive = {
    /**
     * Compile function for the directive.
     */
    compile?: DirectiveCompileFn | undefined;
    /**
     * Controller constructor or name.
     */
    controller?: string | Injectable<ControllerConstructor> | undefined;
    /**
     * Controller alias.
     */
    controllerAs?: string | undefined;
    /**
     * Bindings to controller.
     */
    bindToController?: boolean | {
        [boundProperty: string]: string;
    } | undefined;
    /**
     * Link function.
     */
    link?: DirectiveLinkFn | DirectivePrePost | undefined;
    /**
     * Multi-element directive flag.
     */
    multiElement?: boolean | undefined;
    /**
     * Skip all directives on element
     */
    priority?: number | undefined;
    /**
     * Directive priority.
     */
    terminal?: boolean | undefined;
    /**
     * Deprecated: Replace flag.
     */
    replace?: boolean | undefined;
    /**
     * Required controllers.
     */
    require?: string | string[] | {
        [controller: string]: string;
    } | undefined;
    /**
     * Restriction mode.
     */
    restrict?: string | undefined;
    /**
     * Scope options.
     */
    scope?: boolean | {
        [boundProperty: string]: string;
    } | undefined;
    /**
     * HTML template.
     */
    template?: string | ((tElement: TElement, tAttrs: TAttributes) => string) | undefined;
    /**
     * Template namespace.
     */
    templateNamespace?: string | undefined;
    /**
     * HTML template URL.
     */
    templateUrl?: string | ((tElement: TElement, tAttrs: TAttributes) => string) | undefined;
    /**
     * Transclusion options.
     */
    transclude?: boolean | "element" | {
        [slot: string]: string;
    } | undefined;
    /**
     * Hidden properties added by router
     */
    $$addStateInfo?: (...args: any[]) => any;
};
/**
 * Factory function for creating directives.
 */
export type DirectiveFactory = (...args: any[]) => Directive | DirectiveLinkFn;
export type FilterFunction = Function;
export type FilterFactory = Function;
/**
 * Interface for a service provider class.
 */
export type ServiceProviderClass = {
    /**
     * - The constructor for the service provider.
     */
    constructor: Function;
};
/**
 * Interface for a service provider factory function.
 */
export type ServiceProviderFactory = Function;
/**
 * Interface for a service provider.
 */
export type ServiceProvider = any | Function;
/**
 * AngularJS module interface for registering components, services, providers, etc.
 */
export type Module = {
    /**
     *   Use this method to register a component.
     */
    component: (arg0: string, arg1: ComponentOptions) => Module;
    /**
     *   Use this method to register work which needs to be performed on module loading.
     */
    config: (arg0: Function) => Module;
    /**
     *   Register a constant service with the $injector.
     */
    constant: (arg0: string, arg1: any) => Module;
    /**
     *   Register a controller with the $controller service.
     */
    controller: (arg0: string, arg1: Injectable<ControllerConstructor>) => Module;
    /**
     *   Register a directive with the compiler.
     */
    directive: (arg0: string, arg1: Injectable<DirectiveFactory>) => Module;
    /**
     *   Register a service factory with the $injector.
     */
    factory: (arg0: string, arg1: Injectable<Function>) => Module;
    /**
     *   Register a filter service.
     */
    filter: (arg0: string, arg1: Injectable<FilterFactory>) => Module;
    /**
     *   Register a provider service factory.
     */
    provider: (arg0: string, arg1: ServiceProviderFactory) => Module;
    /**
     *   Register code to be run during module loading.
     */
    run: (arg0: Injectable<Function>) => Module;
    /**
     *   Register a service constructor.
     */
    service: (arg0: string, arg1: Injectable<Function>) => Module;
    /**
     *   Register a value service with the $injector.
     */
    value: (arg0: string, arg1: any) => Module;
    /**
     *   Register a service decorator with the $injector.
     */
    decorator: (arg0: string, arg1: Injectable<Function>) => Module;
    /**
     *   The name of the AngularJS module.
     */
    name: string;
    /**
     *   Array of module names that this module depends on.
     */
    requires: string[];
};
export type FormController = {
    /**
     * - True if the form has not been modified.
     */
    $pristine: boolean;
    /**
     * - True if the form has been modified.
     */
    $dirty: boolean;
    /**
     * - True if the form is valid.
     */
    $valid: boolean;
    /**
     * - True if the form is invalid.
     */
    $invalid: boolean;
    /**
     * - True if the form has been submitted.
     */
    $submitted: boolean;
    /**
     * - An object containing arrays of controls with validation errors keyed by validation error keys.
     */
    $error: {
        [x: string]: Array<NgModelController | FormController>;
    };
    /**
     * - The name of the form.
     */
    $name?: string | undefined;
    /**
     * - An object containing arrays of controls that are pending validation, keyed by validation error keys.
     */
    $pending?: {
        [x: string]: Array<NgModelController | FormController>;
    } | undefined;
    /**
     * - Adds a control to the form.
     */
    $addControl: (arg0: NgModelController | FormController) => void;
    /**
     * - Returns an array of all controls in the form.
     */
    $getControls: () => ReadonlyArray<NgModelController | FormController>;
    /**
     * - Removes a control from the form.
     */
    $removeControl: (arg0: NgModelController | FormController) => void;
    /**
     * - Sets the validity of a control in the form.
     */
    $setValidity: (arg0: string, arg1: boolean, arg2: NgModelController | FormController) => void;
    /**
     * - Marks the form as dirty.
     */
    $setDirty: () => void;
    /**
     * - Marks the form as pristine.
     */
    $setPristine: () => void;
    /**
     * - Commits the view value of all controls in the form.
     */
    $commitViewValue: () => void;
    /**
     * - Rolls back the view value of all controls in the form.
     */
    $rollbackViewValue: () => void;
    /**
     * - Marks the form as submitted.
     */
    $setSubmitted: () => void;
    /**
     * - Marks the form controls as untouched.
     */
    $setUntouched: () => void;
    /**
     * - An indexer for additional properties.
     */
    name?: (arg0: string) => any;
};
export type NgModelController = {
    /**
     * - Renders the view value.
     */
    $render: () => void;
    /**
     * - Sets the validity state.
     */
    $setValidity: (arg0: string, arg1: boolean) => void;
    /**
     * - Sets the view value.
     */
    $setViewValue: (arg0: any, arg1: string | undefined) => void;
    /**
     * - Marks the control as pristine.
     */
    $setPristine: () => void;
    /**
     * - Marks the control as dirty.
     */
    $setDirty: () => void;
    /**
     * - Validates the control.
     */
    $validate: () => void;
    /**
     * - Marks the control as touched.
     */
    $setTouched: () => void;
    /**
     * - Marks the control as untouched.
     */
    $setUntouched: () => void;
    /**
     * - Rolls back the view value.
     */
    $rollbackViewValue: () => void;
    /**
     * - Commits the view value.
     */
    $commitViewValue: () => void;
    /**
     * - Processes the model value.
     */
    $processModelValue: () => void;
    /**
     * - Checks if the value is empty.
     */
    $isEmpty: (arg0: any) => boolean;
    /**
     * - Overrides model options.
     */
    $overrideModelOptions: (arg0: NgModelOptions) => void;
    /**
     * - The current view value.
     */
    $viewValue: any;
    /**
     * - The current model value.
     */
    $modelValue: any;
    /**
     * - Array of parsers.
     */
    $parsers: Array<(arg0: any, arg1: any) => boolean>;
    /**
     * - Array of formatters.
     */
    $formatters: Array<(arg0: any) => any>;
    /**
     * - Array of view change listeners.
     */
    $viewChangeListeners: Array<() => any>;
    /**
     * - Validation errors.
     */
    $error: {
        [x: string]: boolean;
    };
    /**
     * - The name of the control.
     */
    $name?: string | undefined;
    /**
     * - True if the control has been touched.
     */
    $touched: boolean;
    /**
     * - True if the control has not been touched.
     */
    $untouched: boolean;
    /**
     * - Synchronous validators.
     */
    $validators: {
        [x: string]: (arg0: any, arg1: any) => boolean;
    };
    /**
     * - Asynchronous validators.
     */
    $asyncValidators: {
        [x: string]: (arg0: any, arg1: any) => Promise<any>;
    };
    /**
     * - Pending validation.
     */
    $pending?: {
        [x: string]: boolean;
    } | undefined;
    /**
     * - True if the control is pristine.
     */
    $pristine: boolean;
    /**
     * - True if the control is dirty.
     */
    $dirty: boolean;
    /**
     * - True if the control is valid.
     */
    $valid: boolean;
    /**
     * - True if the control is invalid.
     */
    $invalid: boolean;
};
export type NgModelOptions = {
    /**
     * - The event to update on.
     */
    updateOn?: string | undefined;
    /**
     * - The debounce delay.
     */
    debounce?: number | {
        [x: string]: number;
    } | undefined;
    /**
     * - Allows invalid models.
     */
    allowInvalid?: boolean | undefined;
    /**
     * - Indicates if getter/setter syntax is allowed.
     */
    getterSetter?: boolean | undefined;
    /**
     * - The timezone.
     */
    timezone?: string | undefined;
    /**
     * - The format for seconds in time and datetime-local inputs.
     */
    timeSecondsFormat?: string | undefined;
    /**
     * - Indicates if zero seconds should be stripped.
     */
    timeStripZeroSeconds?: boolean | undefined;
};
export type ModelValidators = {
    [x: string]: (arg0: any, arg1: any) => boolean;
};
export type AsyncModelValidators = {
    [x: string]: (arg0: any, arg1: any) => Promise<any>;
};
