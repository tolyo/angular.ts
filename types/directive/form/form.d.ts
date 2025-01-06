export function FormController($element: any, $attrs: any, $scope: any, $animate: any, $interpolate: any): void;
export class FormController {
    constructor($element: any, $attrs: any, $scope: any, $animate: any, $interpolate: any);
    $$controls: any[];
    $error: {};
    $$success: {};
    $pending: any;
    $name: any;
    $dirty: boolean;
    $pristine: boolean;
    $valid: boolean;
    $invalid: boolean;
    $submitted: boolean;
    /** @type {FormController|Object} */
    $$parentForm: FormController | any;
    $$element: any;
    $$animate: any;
    /**
     * Rollback all form controls pending updates to the `$modelValue`.
     *
     * Updates may be pending by a debounced event or because the input is waiting for a some future
     * event defined in `ng-model-options`. This method is typically needed by the reset button of
     * a form that uses `ng-model-options` to pend updates.
     */
    $rollbackViewValue(): void;
    /**
     * Commit all form controls pending updates to the `$modelValue`.
     *
     * Updates may be pending by a debounced event or because the input is waiting for a some future
     * event defined in `ng-model-options`. This method is rarely needed as `NgModelController`
     * usually handles calling this in response to input events.
     */
    $commitViewValue(): void;
    /**
     * Register a control with the form. Input elements using ngModelController do this automatically
     * when they are linked.
     *
     * Note that the current state of the control will not be reflected on the new parent form. This
     * is not an issue with normal use, as freshly compiled and linked controls are in a `$pristine`
     * state.
     *
     * However, if the method is used programmatically, for example by adding dynamically created controls,
     * or controls that have been previously removed without destroying their corresponding DOM element,
     * it's the developers responsibility to make sure the current state propagates to the parent form.
     *
     * For example, if an input control is added that is already `$dirty` and has `$error` properties,
     * calling `$setDirty()` and `$validate()` afterwards will propagate the state to the parent form.
     */
    $addControl(control: any): void;
    /**
     * This method returns a **shallow copy** of the controls that are currently part of this form.
     * The controls can be instances of {@link form.FormController `FormController`}
     * ({@link ngForm "child-forms"}) and of {@link ngModel.NgModelController `NgModelController`}.
     * If you need access to the controls of child-forms, you have to call `$getControls()`
     * recursively on them.
     * This can be used for example to iterate over all controls to validate them.
     *
     * The controls can be accessed normally, but adding to, or removing controls from the array has
     * no effect on the form. Instead, use {@link form.FormController#$addControl `$addControl()`} and
     * {@link form.FormController#$removeControl `$removeControl()`} for this use-case.
     * Likewise, adding a control to, or removing a control from the form is not reflected
     * in the shallow copy. That means you should get a fresh copy from `$getControls()` every time
     * you need access to the controls.
     */
    $getControls(): any;
    $$renameControl(control: any, newName: any): void;
    /**
     * Deregister a control from the form.
     *
     * Input elements using ngModelController do this automatically when they are destroyed.
     *
     * Note that only the removed control's validation state (`$errors`etc.) will be removed from the
     * form. `$dirty`, `$submitted` states will not be changed, because the expected behavior can be
     * different from case to case. For example, removing the only `$dirty` control from a form may or
     * may not mean that the form is still `$dirty`.
     */
    $removeControl(control: any): void;
    $setValidity: (_a: any, _b: any, _c: any) => void;
    /**
     * Sets the form to a dirty state.
     *
     * This method can be called to add the 'ng-dirty' class and set the form to a dirty
     * state (ng-dirty class). This method will also propagate to parent forms.
     */
    $setDirty(): void;
    /**
     * Sets the form to its pristine state.
     *
     * This method sets the form's `$pristine` state to true, the `$dirty` state to false, removes
     * the `ng-dirty` class and adds the `ng-pristine` class. Additionally, it sets the `$submitted`
     * state to false.
     *
     * This method will also propagate to all the controls contained in this form.
     *
     * Setting a form back to a pristine state is often useful when we want to 'reuse' a form after
     * saving or resetting it.
     */
    $setPristine(): void;
    /**
     * Sets the form to its untouched state.
     *
     * This method can be called to remove the 'ng-touched' class and set the form controls to their
     * untouched state (ng-untouched class).
     *
     * Setting a form controls back to their untouched state is often useful when setting the form
     * back to its pristine state.
     */
    $setUntouched(): void;
    /**
     * Sets the form to its `$submitted` state. This will also set `$submitted` on all child and
     * parent forms of the form.
     */
    $setSubmitted(): void;
    $$setSubmitted(): void;
}
export namespace FormController {
    let $inject: string[];
}
export function setupValidity(instance: any): void;
export function addSetValidityMethod(context: any): void;
export function isObjectEmpty(obj: any): boolean;
export namespace nullFormCtrl {
    export function $addControl(): void;
    export function $getControls(): any[];
    export { nullFormRenameControl as $$renameControl };
    export function $removeControl(): void;
    export let $setValidity: (...any: any) => any;
    export function $setDirty(): void;
    export function $setPristine(): void;
    export function $setSubmitted(): void;
    export function $$setSubmitted(): void;
}
export const PENDING_CLASS: "ng-pending";
export const formDirective: (string | (($parse: any) => {
    name: string;
    restrict: string;
    require: string[];
    controller: typeof FormController;
    compile: (formElement: any, attr: any) => {
        pre: (scope: any, formElement: any, attr: any, ctrls: any) => void;
    };
}))[];
export const ngFormDirective: (string | (($parse: any) => {
    name: string;
    restrict: string;
    require: string[];
    controller: typeof FormController;
    compile: (formElement: any, attr: any) => {
        pre: (scope: any, formElement: any, attr: any, ctrls: any) => void;
    };
}))[];
declare function nullFormRenameControl(control: any, name: any): void;
export {};
