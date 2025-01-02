export function ngModelDirective(): {
    restrict: string;
    require: string[];
    controller: typeof NgModelController;
    priority: number;
    compile: (element: import("../../shared/jqlite/jqlite.js").JQLite) => {
        pre: (scope: any, _element: any, attr: any, ctrls: any) => void;
        post: (scope: any, element: any, _attr: any, ctrls: any) => void;
    };
};
export const ngModelMinErr: (arg0: string, ...arg1: any[]) => Error;
/**
 *
 * @property {*} $viewValue The actual value from the control's view.
 *
 * @property {*} $modelValue The value in the model that the control is bound to.
 * @property {Array.<Function>} $parsers Array of functions to execute, as a pipeline, whenever
 *  the control updates the ngModelController with a new `$viewValue` from the DOM, usually via user input.
 *
 * @property {Array.<Function>} $formatters Array of functions to execute, as a pipeline, whenever
    the bound ngModel expression changes programmatically. The `$formatters` are not called when the
    value of the control is changed by user interaction.
 *
 * @property {Object.<string, (string, string) => boolean>} $validators A collection of validators that are applied whenever the model value changes.
 * The key value within the object refers to the name of the validator while the function refers to the validation operation.
 * The validation operation is provided with the model value as an argument and must return a true or false value depending on the response of that validation.
 *
 * @property {Object.<string, function(string, string) => QPromise>} $asyncValidators A collection of validations that are expected to perform an asynchronous validation (e.g. a HTTP request).
 *  The validation function that is provided is expected to return a promise when it is run during the model validation process
 *
 * @property {Array.<Function>} $viewChangeListeners Array of functions to execute whenever
 *     a change to {@link ngModel.NgModelController#$viewValue `$viewValue`} has caused a change
 *     to {@link ngModel.NgModelController#$modelValue `$modelValue`}.
 *     It is called with no arguments, and its return value is ignored.
 *     This can be used in place of additional $watches against the model value.
 *
 * @property {Object} $error An object hash with all failing validator ids as keys.
 * @property {Object} $pending An object hash with all pending validator ids as keys.
 *
 * @property {boolean} $untouched True if control has not lost focus yet.
 * @property {boolean} $touched True if control has lost focus.
 * @property {boolean} $pristine True if user has not interacted with the control yet.
 * @property {boolean} $dirty True if user has already interacted with the control.
 * @property {boolean} $valid True if there is no error.
 * @property {boolean} $invalid True if at least one error on the control.
 * @property {string} $name The name attribute of the control.
 */
export class NgModelController {
    static $inject: string[];
    /**
     * @param {import('../../core/scope/scope').Scope} $scope
     * @param {import('../../core/exception-handler').ErrorHandler} $exceptionHandler
     * @param {import('../../core/compile/attributes').Attributes} $attr
     * @param {import('../../shared/jqlite/jqlite').JQLite} $element
     * @param {import("../../core/parse/parse").ParseService} $parse
     * @param {*} $animate
     * @param {*} $interpolate
     */
    constructor($scope: import("../../core/scope/scope").Scope, $exceptionHandler: import("../../core/exception-handler").ErrorHandler, $attr: import("../../core/compile/attributes").Attributes, $element: import("../../shared/jqlite/jqlite.js").JQLite, $parse: import("../../core/parse/parse").ParseService, $animate: any, $interpolate: any);
    /** @type {any} The actual value from the control's view  */
    $viewValue: any;
    /** @type {any} The value in the model that the control is bound to. */
    $modelValue: any;
    /** @type {any} */
    $$rawModelValue: any;
    $validators: {};
    $asyncValidators: {};
    $parsers: any[];
    $formatters: any[];
    $viewChangeListeners: any[];
    $untouched: boolean;
    /** @type {boolean} */
    $touched: boolean;
    /** @type {boolean} */
    $pristine: boolean;
    /** @type {boolean} */
    $dirty: boolean;
    /** @type {boolean} */
    $valid: boolean;
    /** @type {boolean} */
    $invalid: boolean;
    $error: {};
    $$success: {};
    $pending: any;
    $name: any;
    $$parentForm: {
        $addControl: () => void;
        $getControls: () => any;
        $$renameControl: (control: any, name: any) => void;
        $removeControl: () => void;
        $setValidity: (...any: any) => any;
        $setDirty: () => void;
        $setPristine: () => void;
        $setSubmitted: () => void;
        $$setSubmitted: () => void;
    };
    $options: {
        $$options: import("../model-options/model-options.js").ModelOptionsConfig;
        getOption(name: string): string | boolean | number | {
            [x: string]: number;
        };
        createChild(options: ModelOptionsConfig): any;
    };
    $$updateEvents: string;
    $$updateEventHandler(ev: any): void;
    $$parsedNgModel: import("../../core/parse/parse").CompiledExpression;
    $$parsedNgModelAssign: (arg0: any, arg1: any) => any;
    /** @type {import("../../core/parse/parse").CompiledExpression|((Scope) => any)} */
    $$ngModelGet: import("../../core/parse/parse").CompiledExpression | ((Scope: any) => any);
    $$ngModelSet: (arg0: any, arg1: any) => any;
    $$pendingDebounce: NodeJS.Timeout;
    $$parserValid: boolean;
    /** @type {string} */
    $$parserName: string;
    /** @type {number} */
    $$currentValidationRunId: number;
    /** @type {import('../../core/scope/scope.js').Scope} */
    $$scope: import("../../core/scope/scope.js").Scope;
    /** @type {import('../../core/scope/scope.js').Scope} */
    $$rootScope: import("../../core/scope/scope.js").Scope;
    $$attr: import("../../core/compile/attributes").Attributes;
    $$element: import("../../shared/jqlite/jqlite.js").JQLite;
    $$animate: any;
    $$parse: import("../../core/parse/parse").ParseService;
    $$exceptionHandler: import("../../core/exception-handler").ErrorHandler;
    $$hasNativeValidators: boolean;
    set(object: any, property: any): void;
    unset(object: any, property: any): void;
    $setValidity(validationErrorKey: any, state: any): void;
    $$initGetterSetters(): void;
    /**
     * Called when the view needs to be updated. It is expected that the user of the ng-model
     * directive will implement this method.
     *
     * The `$render()` method is invoked in the following situations:
     *
     * * `$rollbackViewValue()` is called.  If we are rolling back the view value to the last
     *   committed value then `$render()` is called to update the input control.
     * * The value referenced by `ng-model` is changed programmatically and both the `$modelValue` and
     *   the `$viewValue` are different from last time.
     *
     * Since `ng-model` does not do a deep watch, `$render()` is only invoked if the values of
     * `$modelValue` and `$viewValue` are actually different from their previous values. If `$modelValue`
     * or `$viewValue` are objects (rather than a string or number) then `$render()` will not be
     * invoked if you only change a property on the objects.
     */
    $render(): void;
    /**
     * This is called when we need to determine if the value of an input is empty.
     *
     * For instance, the required directive does this to work out if the input has data or not.
     *
     * The default `$isEmpty` function checks whether the value is `undefined`, `''`, `null` or `NaN`.
     *
     * You can override this for input directives whose concept of being empty is different from the
     * default. The `checkboxInputType` directive does this because in its case a value of `false`
     * implies empty.
     *
     * @param {*} value The value of the input to check for emptiness.
     * @returns {boolean} True if `value` is "empty".
     */
    $isEmpty(value: any): boolean;
    $$updateEmptyClasses(value: any): void;
    /**
     * Sets the control to its pristine state.
     *
     * This method can be called to remove the `ng-dirty` class and set the control to its pristine
     * state (`ng-pristine` class). A model is considered to be pristine when the control
     * has not been changed from when first compiled.
     */
    $setPristine(): void;
    /**
     * Sets the control to its dirty state.
     *
     * This method can be called to remove the `ng-pristine` class and set the control to its dirty
     * state (`ng-dirty` class). A model is considered to be dirty when the control has been changed
     * from when first compiled.
     */
    $setDirty(): void;
    /**
     * Sets the control to its untouched state.
     *
     * This method can be called to remove the `ng-touched` class and set the control to its
     * untouched state (`ng-untouched` class). Upon compilation, a model is set as untouched
     * by default, however this function can be used to restore that state if the model has
     * already been touched by the user.
     */
    $setUntouched(): void;
    /**
     * Sets the control to its touched state.
     *
     * This method can be called to remove the `ng-untouched` class and set the control to its
     * touched state (`ng-touched` class). A model is considered to be touched when the user has
     * first focused the control element and then shifted focus away from the control (blur event).
     */
    $setTouched(): void;
    /**
     * Cancel an update and reset the input element's value to prevent an update to the `$modelValue`,
     * which may be caused by a pending debounced event or because the input is waiting for some
     * future event.
     *
     * If you have an input that uses `ng-model-options` to set up debounced updates or updates that
     * depend on special events such as `blur`, there can be a period when the `$viewValue` is out of
     * sync with the ngModel's `$modelValue`.
     *
     * In this case, you can use `$rollbackViewValue()` to manually cancel the debounced / future update
     * and reset the input to the last committed view value.
     *
     * It is also possible that you run into difficulties if you try to update the ngModel's `$modelValue`
     * programmatically before these debounced/future events have resolved/occurred, because AngularJS's
     * dirty checking mechanism is not able to tell whether the model has actually changed or not.
     *
     * The `$rollbackViewValue()` method should be called before programmatically changing the model of an
     * input which may have such events pending. This is important in order to make sure that the
     * input field will be updated with the new model value and any pending operations are cancelled.
     *
     * @example
     * <example name="ng-model-cancel-update" module="cancel-update-example">
     *   <file name="app.js">
     *     angular.module('cancel-update-example', [])
     *
     *     .controller('CancelUpdateController', ['$scope', function($scope) {
     *       $scope.model = {value1: '', value2: ''};
     *
     *       $scope.setEmpty = function(e, value, rollback) {
     *         if (e.keyCode === 27) {
     *           e.preventDefault();
     *           if (rollback) {
     *             $scope.myForm[value].$rollbackViewValue();
     *           }
     *           $scope.model[value] = '';
     *         }
     *       };
     *     }]);
     *   </file>
     *   <file name="index.html">
     *     <div ng-controller="CancelUpdateController">
     *       <p>Both of these inputs are only updated if they are blurred. Hitting escape should
     *       empty them. Follow these steps and observe the difference:</p>
     *       <ol>
     *         <li>Type something in the input. You will see that the model is not yet updated</li>
     *         <li>Press the Escape key.
     *           <ol>
     *             <li> In the first example, nothing happens, because the model is already '', and no
     *             update is detected. If you blur the input, the model will be set to the current view.
     *             </li>
     *             <li> In the second example, the pending update is cancelled, and the input is set back
     *             to the last committed view value (''). Blurring the input does nothing.
     *             </li>
     *           </ol>
     *         </li>
     *       </ol>
     *
     *       <form name="myForm" ng-model-options="{ updateOn: 'blur' }">
     *         <div>
     *           <p id="inputDescription1">Without $rollbackViewValue():</p>
     *           <input name="value1" aria-describedby="inputDescription1" ng-model="model.value1"
     *                  ng-keydown="setEmpty($event, 'value1')">
     *           value1: "{{ model.value1 }}"
     *         </div>
     *
     *         <div>
     *           <p id="inputDescription2">With $rollbackViewValue():</p>
     *           <input name="value2" aria-describedby="inputDescription2" ng-model="model.value2"
     *                  ng-keydown="setEmpty($event, 'value2', true)">
     *           value2: "{{ model.value2 }}"
     *         </div>
     *       </form>
     *     </div>
     *   </file>
         <file name="style.css">
            div {
              display: table-cell;
            }
            div:nth-child(1) {
              padding-right: 30px;
            }
  
          </file>
     * </example>
     */
    $rollbackViewValue(): void;
    /**
     * Runs each of the registered validators (first synchronous validators and then
     * asynchronous validators).
     * If the validity changes to invalid, the model will be set to `undefined`,
     * unless {@link ngModelOptions `ngModelOptions.allowInvalid`} is `true`.
     * If the validity changes to valid, it will set the model to the last available valid
     * `$modelValue`, i.e. either the last parsed value or the last value set from the scope.
     */
    $validate(): void;
    $$runValidators(modelValue: any, viewValue: any, doneCallback: any): void;
    /**
     * Commit a pending update to the `$modelValue`.
     *
     * Updates may be pending by a debounced event or because the input is waiting for a some future
     * event defined in `ng-model-options`. this method is rarely needed as `NgModelController`
     * usually handles calling this in response to input events.
     */
    $commitViewValue(): void;
    $$lastCommittedViewValue: any;
    $$parseAndValidate(): void;
    $$writeModelToScope(): void;
    /**
     * Update the view value.
     *
     * This method should be called when a control wants to change the view value; typically,
     * this is done from within a DOM event handler. For example, the {@link ng.directive:input input}
     * directive calls it when the value of the input changes and {@link ng.directive:select select}
     * calls it when an option is selected.
     *
     * When `$setViewValue` is called, the new `value` will be staged for committing through the `$parsers`
     * and `$validators` pipelines. If there are no special {@link ngModelOptions} specified then the staged
     * value is sent directly for processing through the `$parsers` pipeline. After this, the `$validators` and
     * `$asyncValidators` are called and the value is applied to `$modelValue`.
     * Finally, the value is set to the **expression** specified in the `ng-model` attribute and
     * all the registered change listeners, in the `$viewChangeListeners` list are called.
     *
     * In case the {@link ng.directive:ngModelOptions ngModelOptions} directive is used with `updateOn`
     * and the `default` trigger is not listed, all those actions will remain pending until one of the
     * `updateOn` events is triggered on the DOM element.
     * All these actions will be debounced if the {@link ng.directive:ngModelOptions ngModelOptions}
     * directive is used with a custom debounce for this particular event.
     * Note that a `$digest` is only triggered once the `updateOn` events are fired, or if `debounce`
     * is specified, once the timer runs out.
     *
     * When used with standard inputs, the view value will always be a string (which is in some cases
     * parsed into another type, such as a `Date` object for `input[date]`.)
     * However, custom controls might also pass objects to this method. In this case, we should make
     * a copy of the object before passing it to `$setViewValue`. This is because `ngModel` does not
     * perform a deep watch of objects, it only looks for a change of identity. If you only change
     * the property of the object then ngModel will not realize that the object has changed and
     * will not invoke the `$parsers` and `$validators` pipelines. For this reason, you should
     * not change properties of the copy once it has been passed to `$setViewValue`.
     * Otherwise you may cause the model value on the scope to change incorrectly.
     *
     * <div class="alert alert-info">
     * In any case, the value passed to the method should always reflect the current value
     * of the control. For example, if you are calling `$setViewValue` for an input element,
     * you should pass the input DOM value. Otherwise, the control and the scope model become
     * out of sync. It's also important to note that `$setViewValue` does not call `$render` or change
     * the control's DOM value in any way. If we want to change the control's DOM value
     * programmatically, we should update the `ngModel` scope expression. Its new value will be
     * picked up by the model controller, which will run it through the `$formatters`, `$render` it
     * to update the DOM, and finally call `$validate` on it.
     * </div>
     *
     * @param {*} value value from the view.
     * @param {string} trigger Event that triggered the update.
     */
    $setViewValue(value: any, trigger: string): void;
    $$debounceViewValueCommit(trigger: any): void;
    /**
     *
     * Override the current model options settings programmatically.
     *
     * The previous `ModelOptions` value will not be modified. Instead, a
     * new `ModelOptions` object will inherit from the previous one overriding
     * or inheriting settings that are defined in the given parameter.
     *
     * See {@link ngModelOptions} for information about what options can be specified
     * and how model option inheritance works.
     *
     * <div class="alert alert-warning">
     * **Note:** this function only affects the options set on the `ngModelController`,
     * and not the options on the {@link ngModelOptions} directive from which they might have been
     * obtained initially.
     * </div>
     *
     * <div class="alert alert-danger">
     * **Note:** it is not possible to override the `getterSetter` option.
     * </div>
     *
     * @param {Object} options a hash of settings to override the previous options
     *
     */
    $overrideModelOptions(options: any): void;
    /**
     * Runs the model -> view pipeline on the current
     * {@link ngModel.NgModelController#$modelValue $modelValue}.
     *
     * The following actions are performed by this method:
     *
     * - the `$modelValue` is run through the {@link ngModel.NgModelController#$formatters $formatters}
     * and the result is set to the {@link ngModel.NgModelController#$viewValue $viewValue}
     * - the `ng-empty` or `ng-not-empty` class is set on the element
     * - if the `$viewValue` has changed:
     *   - {@link ngModel.NgModelController#$render $render} is called on the control
     *   - the {@link ngModel.NgModelController#$validators $validators} are run and
     *   the validation status is set.
     *
     * This method is called by ngModel internally when the bound scope value changes.
     * Application developers usually do not have to call this function themselves.
     *
     * This function can be used when the `$viewValue` or the rendered DOM value are not correctly
     * formatted and the `$modelValue` must be run through the `$formatters` again.
     *
     * @example
     * Consider a text input with an autocomplete list (for fruit), where the items are
     * objects with a name and an id.
     * A user enters `ap` and then selects `Apricot` from the list.
     * Based on this, the autocomplete widget will call `$setViewValue({name: 'Apricot', id: 443})`,
     * but the rendered value will still be `ap`.
     * The widget can then call `ctrl.$processModelValue()` to run the model -> view
     * pipeline again, which formats the object to the string `Apricot`,
     * then updates the `$viewValue`, and finally renders it in the DOM.
     *
     * <example module="inputExample" name="ng-model-process">
       <file name="index.html">
        <div ng-controller="inputController" style="display: flex;">
          <div style="margin-right: 30px;">
            Search Fruit:
            <basic-autocomplete items="items" on-select="selectedFruit = item"></basic-autocomplete>
          </div>
          <div>
            Model:<br>
            <pre>{{selectedFruit | json}}</pre>
          </div>
        </div>
       </file>
       <file name="app.js">
        angular.module('inputExample', [])
          .controller('inputController', function($scope) {
            $scope.items = [
              {name: 'Apricot', id: 443},
              {name: 'Clementine', id: 972},
              {name: 'Durian', id: 169},
              {name: 'Jackfruit', id: 982},
              {name: 'Strawberry', id: 863}
            ];
          })
          .component('basicAutocomplete', {
            bindings: {
              items: '<',
              onSelect: '&'
            },
            templateUrl: 'autocomplete.html',
            controller: function($element, $scope) {
              let that = this;
              let ngModel;
  
              that.$postLink = function() {
                ngModel = $element.find('input').controller('ngModel');
  
                ngModel.$formatters.push(function(value) {
                  return (value && value.name) || value;
                });
  
                ngModel.$parsers.push(function(value) {
                  let match = value;
                  for (let i = 0; i < that.items.length; i++) {
                    if (that.items[i].name === value) {
                      match = that.items[i];
                      break;
                    }
                  }
  
                  return match;
                });
              };
  
              that.selectItem = function(item) {
                ngModel.$setViewValue(item);
                ngModel.$processModelValue();
                that.onSelect({item: item});
              };
            }
          });
       </file>
       <file name="autocomplete.html">
         <div>
           <input type="search" ng-model="$ctrl.searchTerm" />
           <ul>
             <li ng-repeat="item in $ctrl.items | filter:$ctrl.searchTerm">
               <button ng-click="$ctrl.selectItem(item)">{{ item.name }}</button>
             </li>
           </ul>
         </div>
       </file>
     * </example>
     *
     */
    $processModelValue(): void;
    /**
     * This method is called internally to run the $formatters on the $modelValue
     */
    $$format(): any;
    /**
     * This method is called internally when the bound scope value changes.
     */
    $$setModelValue(modelValue: any): void;
    $$setUpdateOnEvents(): void;
}
