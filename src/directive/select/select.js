import { JQLite } from "../../shared/jqlite/jqlite.js";
import {
  assertNotHasOwnProperty,
  equals,
  hashKey,
  includes,
  isDefined,
  shallowCopy,
} from "../../shared/utils";

function setOptionSelectedStatus(optionEl, value) {
  optionEl[0].selected = value;
  /**
   * When unselecting an option, setting the property to null / false should be enough
   * However, screenreaders might react to the selected attribute instead, see
   * https://github.com/angular/angular.js/issues/14419
   * Note: "selected" is a boolean attr and will be removed when the "value" arg in attr() is false
   * or null
   */
  optionEl.attr("selected", value);
}

/**
 * The controller for the {@link ng.select select} directive. The controller exposes
 * a few utility methods that can be used to augment the behavior of a regular or an
 * {@link ng.ngOptions ngOptions} select element.
 *
 */
SelectController.$inject = ["$element", "$scope"];
/**
 *
 * @param {JQLite} $element
 * @param {import('../../core/scope/scope').Scope} $scope
 */
function SelectController($element, $scope) {
  const self = this;
  const optionsMap = new Map();

  self.selectValueMap = {}; // Keys are the hashed values, values the original values

  // If the ngModel doesn't get provided then provide a dummy noop version to prevent errors
  self.ngModelCtrl = {};
  self.multiple = false;

  // The "unknown" option is one that is prepended to the list if the viewValue
  // does not match any of the options. When it is rendered the value of the unknown
  // option is '? XXX ?' where XXX is the hashKey of the value that is not known.
  //
  // Support: IE 9 only
  // We can't just JQLite('<option>') since JQLite is not smart enough
  // to create it in <select> and IE barfs otherwise.
  self.unknownOption = JQLite(document.createElement("option"));

  // The empty option is an option with the value '' that the application developer can
  // provide inside the select. It is always selectable and indicates that a "null" selection has
  // been made by the user.
  // If the select has an empty option, and the model of the select is set to "undefined" or "null",
  // the empty option is selected.
  // If the model is set to a different unmatched value, the unknown option is rendered and
  // selected, i.e both are present, because a "null" selection and an unknown value are different.
  self.hasEmptyOption = false;
  self.emptyOption = undefined;

  self.renderUnknownOption = function (val) {
    const unknownVal = self.generateUnknownOptionValue(val);
    self.unknownOption.val(unknownVal);
    $element.prepend(self.unknownOption);
    setOptionSelectedStatus(self.unknownOption, true);
    $element.val(unknownVal);
  };

  self.updateUnknownOption = function (val) {
    const unknownVal = self.generateUnknownOptionValue(val);
    self.unknownOption.val(unknownVal);
    setOptionSelectedStatus(self.unknownOption, true);
    $element.val(unknownVal);
  };

  self.generateUnknownOptionValue = function (val) {
    return `? ${hashKey(val)} ?`;
  };

  self.removeUnknownOption = function () {
    if (self.unknownOption.parent()) self.unknownOption.remove();
  };

  self.selectEmptyOption = function () {
    if (self.emptyOption) {
      $element.val("");
      setOptionSelectedStatus(self.emptyOption, true);
    }
  };

  self.unselectEmptyOption = function () {
    if (self.hasEmptyOption) {
      setOptionSelectedStatus(self.emptyOption, false);
    }
  };

  $scope.$on("$destroy", () => {
    // disable unknown option so that we don't do work when the whole select is being destroyed
    self.renderUnknownOption = () => {};
  });

  // Read the value of the select control, the implementation of this changes depending
  // upon whether the select can have multiple values and whether ngOptions is at work.
  self.readValue = function () {
    const val = $element.val();
    // ngValue added option values are stored in the selectValueMap, normal interpolations are not
    const realVal = val in self.selectValueMap ? self.selectValueMap[val] : val;

    if (self.hasOption(realVal)) {
      return realVal;
    }

    return null;
  };

  // Write the value to the select control, the implementation of this changes depending
  // upon whether the select can have multiple values and whether ngOptions is at work.
  self.writeValue = function writeSingleValue(value) {
    // Make sure to remove the selected attribute from the previously selected option
    // Otherwise, screen readers might get confused
    const currentlySelectedOption =
      $element[0].options[$element[0].selectedIndex];
    if (currentlySelectedOption)
      setOptionSelectedStatus(JQLite(currentlySelectedOption), false);

    if (self.hasOption(value)) {
      self.removeUnknownOption();

      const hashedVal = hashKey(value);
      $element.val(hashedVal in self.selectValueMap ? hashedVal : value);

      // Set selected attribute and property on selected option for screen readers
      const selectedOption = $element[0].options[$element[0].selectedIndex];
      setOptionSelectedStatus(JQLite(selectedOption), true);
    } else {
      self.selectUnknownOrEmptyOption(value);
    }
  };

  // Tell the select control that an option, with the given value, has been added
  self.addOption = function (value, element) {
    // Skip comment nodes, as they only pollute the `optionsMap`
    if (element[0].nodeType === Node.COMMENT_NODE) return;

    assertNotHasOwnProperty(value, '"option value"');
    if (value === "") {
      self.hasEmptyOption = true;
      self.emptyOption = element;
    }
    const count = optionsMap.get(value) || 0;
    optionsMap.set(value, count + 1);
    // Only render at the end of a digest. This improves render performance when many options
    // are added during a digest and ensures all relevant options are correctly marked as selected
    scheduleRender();
  };

  // Tell the select control that an option, with the given value, has been removed
  self.removeOption = function (value) {
    const count = optionsMap.get(value);
    if (count) {
      if (count === 1) {
        optionsMap.delete(value);
        if (value === "") {
          self.hasEmptyOption = false;
          self.emptyOption = undefined;
        }
      } else {
        optionsMap.set(value, count - 1);
      }
    }
  };

  // Check whether the select control has an option matching the given value
  self.hasOption = function (value) {
    return !!optionsMap.get(value);
  };

  /**
   *
   * Returns `true` if the select element currently has an empty option
   * element, i.e. an option that signifies that the select is empty / the selection is null.
   *
   */
  self.$hasEmptyOption = function () {
    return self.hasEmptyOption;
  };

  /**
   *
   * Returns `true` if the select element's unknown option is selected. The unknown option is added
   * and automatically selected whenever the select model doesn't match any option.
   *
   */
  self.$isUnknownOptionSelected = function () {
    // Presence of the unknown option means it is selected
    return $element[0].options[0] === self.unknownOption[0];
  };

  /**
   * Returns `true` if the select element has an empty option and this empty option is currently
   * selected. Returns `false` if the select element has no empty option or it is not selected.
   *
   */
  self.$isEmptyOptionSelected = function () {
    return (
      self.hasEmptyOption &&
      $element[0].options[$element[0].selectedIndex] === self.emptyOption[0]
    );
  };

  self.selectUnknownOrEmptyOption = function (value) {
    if (value == null && self.emptyOption) {
      self.removeUnknownOption();
      self.selectEmptyOption();
    } else if (self.unknownOption.parent().length) {
      self.updateUnknownOption(value);
    } else {
      self.renderUnknownOption(value);
    }
  };

  let renderScheduled = false;
  function scheduleRender() {
    if (renderScheduled) return;
    renderScheduled = true;
    $scope.$postUpdate(() => {
      renderScheduled = false;
      self.ngModelCtrl.$render();
    });
  }

  let updateScheduled = false;
  function scheduleViewValueUpdate(renderAfter) {
    if (updateScheduled) return;

    updateScheduled = true;

    $scope.$postUpdate(() => {
      if ($scope.$$destroyed) return;

      updateScheduled = false;
      self.ngModelCtrl.$setViewValue(self.readValue());
      if (renderAfter) self.ngModelCtrl.$render();
    });
  }

  self.registerOption = function (
    optionScope,
    optionElement,
    optionAttrs,
    interpolateValueFn,
    interpolateTextFn,
  ) {
    let oldVal;
    let hashedVal;
    if (optionAttrs.$attr.ngValue) {
      // The value attribute is set by ngValue

      optionAttrs.$observe("value", (newVal) => {
        let removal;
        const previouslySelected = optionElement[0].selected;

        if (isDefined(hashedVal)) {
          self.removeOption(oldVal);
          delete self.selectValueMap[hashedVal];
          removal = true;
        }

        hashedVal = hashKey(newVal);
        oldVal = newVal;
        self.selectValueMap[hashedVal] = newVal;
        self.addOption(newVal, optionElement);
        // Set the attribute directly instead of using optionAttrs.$set - this stops the observer
        // from firing a second time. Other $observers on value will also get the result of the
        // ngValue expression, not the hashed value
        optionElement.attr("value", hashedVal);

        if (removal && previouslySelected) {
          scheduleViewValueUpdate();
        }
      });
    } else if (interpolateValueFn) {
      // The value attribute is interpolated
      optionAttrs.$observe("value", (newVal) => {
        // This method is overwritten in ngOptions and has side-effects!
        self.readValue();

        let removal;
        const previouslySelected = optionElement[0].selected;

        if (isDefined(oldVal)) {
          self.removeOption(oldVal);
          removal = true;
        }
        oldVal = newVal;
        self.addOption(newVal, optionElement);

        if (removal && previouslySelected) {
          scheduleViewValueUpdate();
        }
      });
    } else if (interpolateTextFn) {
      // The text content is interpolated
      optionScope.$watch(interpolateTextFn, (newVal, oldVal) => {
        optionAttrs.$set("value", newVal);
        const previouslySelected = optionElement[0].selected;
        if (oldVal !== newVal) {
          self.removeOption(oldVal);
        }
        self.addOption(newVal, optionElement);

        if (oldVal && previouslySelected) {
          scheduleViewValueUpdate();
        }
      });
    } else {
      // The value attribute is static
      self.addOption(optionAttrs.value, optionElement);
    }

    optionAttrs.$observe("disabled", (newVal) => {
      // Since model updates will also select disabled options (like ngOptions),
      // we only have to handle options becoming disabled, not enabled

      if (newVal === "true" || (newVal && optionElement[0].selected)) {
        if (self.multiple) {
          scheduleViewValueUpdate(true);
        } else {
          self.ngModelCtrl.$setViewValue(null);
          self.ngModelCtrl.$render();
        }
      }
    });

    optionElement.on("$destroy", () => {
      const currentValue = self.readValue();
      const removeValue = optionAttrs.value;

      self.removeOption(removeValue);
      scheduleRender();

      if (
        (self.multiple &&
          currentValue &&
          currentValue.indexOf(removeValue) !== -1) ||
        currentValue === removeValue
      ) {
        // When multiple (selected) options are destroyed at the same time, we don't want
        // to run a model update for each of them. Instead, run a single update in the $postUpdate
        scheduleViewValueUpdate(true);
      }
    });
  };
}

/**
 * @returns {import('../../types.js').Directive}
 */
export function selectDirective() {
  return {
    restrict: "E",
    require: ["select", "?ngModel"],
    controller: SelectController,
    priority: 1,
    link: {
      pre: selectPreLink,
      post: selectPostLink,
    },
  };

  function selectPreLink(scope, element, attr, ctrls) {
    const selectCtrl = ctrls[0];
    const ngModelCtrl = ctrls[1];

    // if ngModel is not defined, we don't need to do anything but set the registerOption
    // function to noop, so options don't get added internally
    if (!ngModelCtrl) {
      selectCtrl.registerOption = () => {};
      return;
    }

    selectCtrl.ngModelCtrl = ngModelCtrl;

    // When the selected item(s) changes we delegate getting the value of the select control
    // to the `readValue` method, which can be changed if the select can have multiple
    // selected values or if the options are being generated by `ngOptions`
    element.on("change", () => {
      selectCtrl.removeUnknownOption();
      scope.$apply(() => {
        ngModelCtrl.$setViewValue(selectCtrl.readValue());
      });
    });

    // If the select allows multiple values then we need to modify how we read and write
    // values from and to the control; also what it means for the value to be empty and
    // we have to add an extra watch since ngModel doesn't work well with arrays - it
    // doesn't trigger rendering if only an item in the array changes.
    if (attr.multiple) {
      selectCtrl.multiple = true;

      // Read value now needs to check each option to see if it is selected
      selectCtrl.readValue = function readMultipleValue() {
        const array = [];
        Array.from(element[0].getElementsByTagName("option")).forEach(
          (option) => {
            if (option.selected && !option.disabled) {
              const val = option.value;
              array.push(
                val in selectCtrl.selectValueMap
                  ? selectCtrl.selectValueMap[val]
                  : val,
              );
            }
          },
        );
        return array;
      };

      // Write value now needs to set the selected property of each matching option
      selectCtrl.writeValue = function writeMultipleValue(value) {
        Array.from(element[0].getElementsByTagName("option")).forEach(
          (option) => {
            const shouldBeSelected =
              !!value &&
              (includes(value, option.value) ||
                includes(value, selectCtrl.selectValueMap[option.value]));
            const currentlySelected = option.selected;

            // Support: IE 9-11 only, Edge 12-15+
            // In IE and Edge adding options to the selection via shift+click/UP/DOWN
            // will de-select already selected options if "selected" on those options was set
            // more than once (i.e. when the options were already selected)
            // So we only modify the selected property if necessary.
            // Note: this behavior cannot be replicated via unit tests because it only shows in the
            // actual user interface.
            if (shouldBeSelected !== currentlySelected) {
              setOptionSelectedStatus(JQLite(option), shouldBeSelected);
            }
          },
        );
      };

      // we have to do it on each watch since ngModel watches reference, but
      // we need to work of an array, so we need to see if anything was inserted/removed
      let lastView;
      let lastViewRef = NaN;
      debugger;
      // this will throw
      scope.$watch(() => {
        if (
          lastViewRef === ngModelCtrl.$viewValue &&
          !equals(lastView, ngModelCtrl.$viewValue)
        ) {
          lastView = shallowCopy(ngModelCtrl.$viewValue);
          ngModelCtrl.$render();
        }
        lastViewRef = ngModelCtrl.$viewValue;
      });

      // If we are a multiple select then value is now a collection
      // so the meaning of $isEmpty changes
      ngModelCtrl.$isEmpty = function (value) {
        return !value || value.length === 0;
      };
    }
  }

  function selectPostLink(scope, element, attrs, ctrls) {
    // if ngModel is not defined, we don't need to do anything
    const ngModelCtrl = ctrls[1];
    if (!ngModelCtrl) return;

    const selectCtrl = ctrls[0];

    // We delegate rendering to the `writeValue` method, which can be changed
    // if the select can have multiple selected values or if the options are being
    // generated by `ngOptions`.
    // This must be done in the postLink fn to prevent $render to be called before
    // all nodes have been linked correctly.
    ngModelCtrl.$render = function () {
      selectCtrl.writeValue(ngModelCtrl.$viewValue);
    };
  }
}

// The option directive is purely designed to communicate the existence (or lack of)
// of dynamically created (and destroyed) option elements to their containing select
// directive via its controller.
/**
 * @returns {import('../../types.js').Directive}
 */
optionDirective.$inject = ["$interpolate"];
export function optionDirective($interpolate) {
  return {
    restrict: "E",
    priority: 100,
    compile(element, attr) {
      let interpolateValueFn;
      let interpolateTextFn;

      if (isDefined(attr.ngValue)) {
        // Will be handled by registerOption
      } else if (isDefined(attr.value)) {
        // If the value attribute is defined, check if it contains an interpolation
        interpolateValueFn = $interpolate(attr.value, true);
      } else {
        // If the value attribute is not defined then we fall back to the
        // text content of the option element, which may be interpolated
        interpolateTextFn = $interpolate(element.text(), true);
        if (!interpolateTextFn) {
          attr.$set("value", element.text());
        }
      }

      return function (scope, element, attr) {
        // This is an optimization over using ^^ since we don't want to have to search
        // all the way to the root of the DOM for every single option element
        const selectCtrlName = "$selectController";
        const parent = element.parent();
        const selectCtrl =
          parent.data(selectCtrlName) || parent.parent().data(selectCtrlName); // in case we are in optgroup

        if (selectCtrl) {
          selectCtrl.registerOption(
            scope,
            element,
            attr,
            interpolateValueFn,
            interpolateTextFn,
          );
        }
      };
    },
  };
}
