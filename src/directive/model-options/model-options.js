import { isDefined, trim } from "../../shared/utils";

const DEFAULT_REGEXP = /(\s+|^)default(\s+|$)/;

/**
 * @typedef {Object} ModelOptionsConfig
 * @property {string} [updateOn] - A string specifying which events the input should be bound to. Multiple events can be set using a space-delimited list. The special event 'default' matches the default events belonging to the control.
 * @property {number|Object.<string, number>} [debounce] - An integer specifying the debounce time in milliseconds. A value of 0 triggers an immediate update. If an object is supplied, custom debounce values can be set for each event.
 * @property {boolean} [allowInvalid] - Indicates whether the model can be set with values that did not validate correctly. Defaults to false, which sets the model to undefined on validation failure.
 * @property {boolean} [getterSetter] - Determines whether to treat functions bound to `ngModel` as getters/setters. Defaults to false.
 * @property {boolean} [updateOnDefault]
 */

class NgModelOptionsController {
  static $inject = ["$attrs", "$scope"];

  /**
   * @param {import('../../types').Attributes} $attrs
   * @param {import('../../types').TScope} $scope
   */
  constructor($attrs, $scope) {
    this.$$attrs = $attrs;
    this.$$scope = $scope;
    /** @type {NgModelOptionsController?} */
    this.parentCtrl;
  }

  $onInit() {
    const parentOptions = this.parentCtrl
      ? this.parentCtrl.$options
      : defaultModelOptions;
    const modelOptionsDefinition = this.$$scope.$eval(
      this.$$attrs.ngModelOptions,
    );

    this.$options = parentOptions.createChild(modelOptionsDefinition);
  }
}

/**
 * @description
 * A container for the options set by the {@link ngModelOptions} directive
 */
class ModelOptions {
  /**
   * @param {ModelOptionsConfig} options
   */
  constructor(options) {
    /** @type {ModelOptionsConfig} */
    this.$$options = options;
  }

  /**
   * Returns the value of the given option
   * @param {string} name the name of the option to retrieve
   * @returns {string|boolean|number|Object.<string, number>} the value of the option   *
   */
  getOption(name) {
    return this.$$options[name];
  }

  /**
   * @param {ModelOptionsConfig} options a hash of options for the new child that will override the parent's options
   * @return {ModelOptions} a new `ModelOptions` object initialized with the given options.
   */
  createChild(options) {
    let inheritAll = false;

    // make a shallow copy
    options = Object.assign({}, options);

    // Inherit options from the parent if specified by the value `"$inherit"`
    Object.entries(options).forEach(([key, option]) => {
      if (option === "$inherit") {
        if (key === "*") {
          inheritAll = true;
        } else {
          options[key] = this.$$options[key];
          // `updateOn` is special so we must also inherit the `updateOnDefault` option
          if (key === "updateOn") {
            options.updateOnDefault = this.$$options.updateOnDefault;
          }
        }
      } else if (key === "updateOn") {
        // If the `updateOn` property contains the `default` event then we have to remove
        // it from the event list and set the `updateOnDefault` flag.
        options.updateOnDefault = false;
        options[key] = trim(
          /** @type {string} */ (option).replace(DEFAULT_REGEXP, () => {
            options.updateOnDefault = true;
            return " ";
          }),
        );
      }
    }, this);

    if (inheritAll) {
      // We have a property of the form: `"*": "$inherit"`
      delete options["*"];
      defaults(options, this.$$options);
    }

    // Finally add in any missing defaults
    defaults(options, defaultModelOptions.$$options);

    return new ModelOptions(options);
  }
}

export const defaultModelOptions = new ModelOptions({
  updateOn: "",
  updateOnDefault: true,
  debounce: 0,
  getterSetter: false,
  allowInvalid: false,
  //timezone: null,
});

/**
 * @returns {import('../../types').Directive}
 */
export const ngModelOptionsDirective = function () {
  return {
    restrict: "A",
    // ngModelOptions needs to run before ngModel and input directives
    priority: 10,
    require: { parentCtrl: "?^^ngModelOptions" },
    bindToController: true,
    controller: NgModelOptionsController,
  };
};

// shallow copy over values from `src` that are not already specified on `dst`
function defaults(dst, src) {
  Object.keys(src).forEach((key) => {
    if (!isDefined(dst[key])) {
      dst[key] = src[key];
    }
  });
}
