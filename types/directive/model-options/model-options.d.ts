export const defaultModelOptions: ModelOptions;
export function ngModelOptionsDirective(): import("../../types.js").Directive;
export type ModelOptionsConfig = {
    /**
     * - A string specifying which events the input should be bound to. Multiple events can be set using a space-delimited list. The special event 'default' matches the default events belonging to the control.
     */
    updateOn?: string;
    /**
     * - An integer specifying the debounce time in milliseconds. A value of 0 triggers an immediate update. If an object is supplied, custom debounce values can be set for each event.
     */
    debounce?: number | {
        [x: string]: number;
    };
    /**
     * - Indicates whether the model can be set with values that did not validate correctly. Defaults to false, which sets the model to undefined on validation failure.
     */
    allowInvalid?: boolean;
    /**
     * - Determines whether to treat functions bound to `ngModel` as getters/setters. Defaults to false.
     */
    getterSetter?: boolean;
    updateOnDefault?: boolean;
};
/**
 * @description
 * A container for the options set by the {@link ngModelOptions} directive
 */
declare class ModelOptions {
    /**
     * @param {ModelOptionsConfig} options
     */
    constructor(options: ModelOptionsConfig);
    /** @type {ModelOptionsConfig} */
    $$options: ModelOptionsConfig;
    /**
     * Returns the value of the given option
     * @param {string} name the name of the option to retrieve
     * @returns {string|boolean|number|Object.<string, number>} the value of the option   *
     */
    getOption(name: string): string | boolean | number | {
        [x: string]: number;
    };
    /**
     * @param {ModelOptionsConfig} options a hash of options for the new child that will override the parent's options
     * @return {ModelOptions} a new `ModelOptions` object initialized with the given options.
     */
    createChild(options: ModelOptionsConfig): ModelOptions;
}
export {};
