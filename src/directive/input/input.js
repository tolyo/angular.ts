import {
  isDefined,
  isUndefined,
  isString,
  lowercase,
  trim,
  isObject,
  isNumber,
  isNumberNaN,
  isDate,
  convertTimezoneToLocal,
  addDateMinutes,
  timezoneToOffset,
  nextUid,
  equals,
} from "../../shared/utils";
import { ngModelMinErr } from "./../model/model";

// Regex code was initially obtained from SO prior to modification: https://stackoverflow.com/questions/3143070/javascript-regex-iso-datetime#answer-3143231
export const ISO_DATE_REGEXP =
  /^\d{4,}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+(?:[+-][0-2]\d:[0-5]\d|Z)$/;
// See valid URLs in RFC3987 (http://tools.ietf.org/html/rfc3987)
// Note: We are being more lenient, because browsers are too.
//   1. Scheme
//   2. Slashes
//   3. Username
//   4. Password
//   5. Hostname
//   6. Port
//   7. Path
//   8. Query
//   9. Fragment
//                 1111111111111111 222   333333    44444        55555555555555555555555     666     77777777     8888888     999
export const URL_REGEXP =
  /^[a-z][a-z\d.+-]*:\/*(?:[^:@]+(?::[^@]+)?@)?(?:[^\s:/?#]+|\[[a-f\d:]+])(?::\d+)?(?:\/[^?#]*)?(?:\?[^#]*)?(?:#.*)?$/i;

export const EMAIL_REGEXP =
  /^(?=.{1,254}$)(?=.{1,64}@)[-!#$%&'*+/0-9=?A-Z^_`a-z{|}~]+(\.[-!#$%&'*+/0-9=?A-Z^_`a-z{|}~]+)*@[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?(\.[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*$/;
const NUMBER_REGEXP = /^\s*(-|\+)?(\d+|(\d*(\.\d*)))([eE][+-]?\d+)?\s*$/;
const DATE_REGEXP = /^(\d{4,})-(\d{2})-(\d{2})$/;
const DATETIMELOCAL_REGEXP =
  /^(\d{4,})-(\d\d)-(\d\d)T(\d\d):(\d\d)(?::(\d\d)(\.\d{1,3})?)?$/;
const WEEK_REGEXP = /^(\d{4,})-W(\d\d)$/;
const MONTH_REGEXP = /^(\d{4,})-(\d\d)$/;
const TIME_REGEXP = /^(\d\d):(\d\d)(?::(\d\d)(\.\d{1,3})?)?$/;
// The name of a form control's ValidityState property.
// This is used so that it's possible for internal tests to create mock ValidityStates.
export const VALIDITY_STATE_PROPERTY = "validity";

const PARTIAL_VALIDATION_EVENTS = "keydown wheel mousedown";
/**
 * @type {Map<string, boolean>}
 */
const PARTIAL_VALIDATION_TYPES = new Map();
"date,datetime-local,month,time,week".split(",").forEach((type) => {
  PARTIAL_VALIDATION_TYPES.set(type, true);
});

const inputType = {
  text: textInputType,
  date: createDateInputType(
    "date",
    DATE_REGEXP,
    createDateParser(DATE_REGEXP, ["yyyy", "MM", "dd"]),
  ),
  "datetime-local": createDateInputType(
    "datetimelocal",
    DATETIMELOCAL_REGEXP,
    createDateParser(DATETIMELOCAL_REGEXP, [
      "yyyy",
      "MM",
      "dd",
      "HH",
      "mm",
      "ss",
      "sss",
    ]),
  ),
  time: createDateInputType(
    "time",
    TIME_REGEXP,
    createDateParser(TIME_REGEXP, ["HH", "mm", "ss", "sss"]),
  ),
  week: createDateInputType("week", WEEK_REGEXP, weekParser),
  month: createDateInputType(
    "month",
    MONTH_REGEXP,
    createDateParser(MONTH_REGEXP, ["yyyy", "MM"]),
  ),
  number: numberInputType,
  url: urlInputType,
  email: emailInputType,
  radio: radioInputType,
  range: rangeInputType,
  checkbox: checkboxInputType,
  hidden: () => {},
  button: () => {},
  submit: () => {},
  reset: () => {},
  file: () => {},
};

function stringBasedInputType(ctrl) {
  ctrl.$formatters.push((value) =>
    ctrl.$isEmpty(value) ? value : value.toString(),
  );
}

function textInputType(scope, element, attr, ctrl) {
  baseInputType(scope, element, attr, ctrl);
  stringBasedInputType(ctrl);
}

function baseInputType(scope, element, attr, ctrl) {
  const type = element.type.toLowerCase();
  let composing = false;
  // In composition mode, users are still inputting intermediate text buffer,
  // hold the listener until composition is done.
  // More about composition events: https://developer.mozilla.org/en-US/docs/Web/API/CompositionEvent
  element.addEventListener("compositionstart", () => {
    composing = true;
  });

  element.addEventListener("compositionend", () => {
    composing = false;
    listener();
  });

  let timeout;

  let listener = function (ev) {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
    if (composing) return;
    let value = element.value;
    const event = ev && ev.type;

    // By default we will trim the value
    // If the attribute ng-trim exists we will avoid trimming
    // If input type is 'password', the value is never trimmed
    if (type !== "password" && (!attr.ngTrim || attr.ngTrim !== "false")) {
      value = trim(value);
    }

    // If a control is suffering from bad input (due to native validators), browsers discard its
    // value, so it may be necessary to revalidate (by calling $setViewValue again) even if the
    // control's value is the same empty value twice in a row.
    if (
      ctrl.$viewValue !== value ||
      (value === "" && ctrl.$$hasNativeValidators)
    ) {
      ctrl.$setViewValue(value, event);
    }
  };

  ["input", "change", "paste", "drop", "cut"].forEach((event) => {
    element.addEventListener(event, listener);
  });

  // Some native input types (date-family) have the ability to change validity without
  // firing any input/change events.
  // For these event types, when native validators are present and the browser supports the type,
  // check for validity changes on various DOM events.
  if (
    PARTIAL_VALIDATION_TYPES[type] &&
    ctrl.$$hasNativeValidators &&
    type === attr.type
  ) {
    element.addEventListener(PARTIAL_VALIDATION_EVENTS, function (ev) {
      if (!timeout) {
        const validity = this[VALIDITY_STATE_PROPERTY];
        const origBadInput = validity.badInput;
        const origTypeMismatch = validity.typeMismatch;
        timeout = setTimeout(() => {
          timeout = null;
          if (
            validity.badInput !== origBadInput ||
            validity.typeMismatch !== origTypeMismatch
          ) {
            listener(ev);
          }
        });
      }
    });
  }

  ctrl.$render = function () {
    // Workaround for Firefox validation #12102.
    const value = ctrl.$isEmpty(ctrl.$viewValue) ? "" : ctrl.$viewValue;
    if (element.value !== value) {
      element.value = value;
    }
  };
}

export function weekParser(isoWeek, existingDate) {
  if (isDate(isoWeek)) {
    return isoWeek;
  }

  function getFirstThursdayOfYear(year) {
    // 0 = index of January
    const dayOfWeekOnFirst = new Date(year, 0, 1).getDay();
    // 4 = index of Thursday (+1 to account for 1st = 5)
    // 11 = index of *next* Thursday (+1 account for 1st = 12)
    return new Date(
      year,
      0,
      (dayOfWeekOnFirst <= 4 ? 5 : 12) - dayOfWeekOnFirst,
    );
  }

  if (isString(isoWeek)) {
    WEEK_REGEXP.lastIndex = 0;
    const parts = WEEK_REGEXP.exec(isoWeek);
    if (parts) {
      const year = +parts[1];
      const week = +parts[2];
      let hours = 0;
      let minutes = 0;
      let seconds = 0;
      let milliseconds = 0;
      const firstThurs = getFirstThursdayOfYear(year);
      const addDays = (week - 1) * 7;

      if (existingDate) {
        hours = existingDate.getHours();
        minutes = existingDate.getMinutes();
        seconds = existingDate.getSeconds();
        milliseconds = existingDate.getMilliseconds();
      }

      return new Date(
        year,
        0,
        firstThurs.getDate() + addDays,
        hours,
        minutes,
        seconds,
        milliseconds,
      );
    }
  }

  return NaN;
}

export function createDateParser(regexp, mapping) {
  return function (iso, previousDate) {
    let parts;
    let map;

    if (isDate(iso)) {
      return iso;
    }

    if (isString(iso)) {
      // When a date is JSON'ified to wraps itself inside of an extra
      // set of double quotes. This makes the date parsing code unable
      // to match the date string and parse it as a date.
      if (iso.charAt(0) === '"' && iso.charAt(iso.length - 1) === '"') {
        iso = iso.substring(1, iso.length - 1);
      }
      if (ISO_DATE_REGEXP.test(iso)) {
        return new Date(iso);
      }
      regexp.lastIndex = 0;
      parts = regexp.exec(iso);

      if (parts) {
        parts.shift();
        if (previousDate) {
          map = {
            yyyy: previousDate.getFullYear(),
            MM: previousDate.getMonth() + 1,
            dd: previousDate.getDate(),
            HH: previousDate.getHours(),
            mm: previousDate.getMinutes(),
            ss: previousDate.getSeconds(),
            sss: previousDate.getMilliseconds() / 1000,
          };
        } else {
          map = { yyyy: 1970, MM: 1, dd: 1, HH: 0, mm: 0, ss: 0, sss: 0 };
        }

        Object.entries(parts).forEach(([index, part]) => {
          if (index < mapping.length) {
            map[mapping[index]] = +part;
          }
        });

        const date = new Date(
          map.yyyy,
          map.MM - 1,
          map.dd,
          map.HH,
          map.mm,
          map.ss || 0,
          map.sss * 1000 || 0,
        );
        if (map.yyyy < 100) {
          // In the constructor, 2-digit years map to 1900-1999.
          // Use `setFullYear()` to set the correct year.
          date.setFullYear(map.yyyy);
        }

        return date;
      }
    }

    return NaN;
  };
}

const MONTH_INPUT_FORMAT = /\b\d{4}-(0[1-9]|1[0-2])\b/;

export function createDateInputType(type, regexp, parseDate) {
  return function dynamicDateInputType(
    scope,
    element,
    attr,
    ctrl,
    $browser,
    $filter,
    $parse,
  ) {
    console.error("Unused ", $browser);
    badInputChecker(scope, element, attr, ctrl, type);
    baseInputType(scope, element, attr, ctrl);
    let previousDate;
    let previousTimezone;

    ctrl.$parsers.push((value) => {
      if (ctrl.$isEmpty(value)) return null;

      if (regexp.test(value)) {
        // Do not convert for native HTML
        if (["month", "week", "datetimelocal", "time", "date"].includes(type)) {
          return value;
        }

        // Note: We cannot read ctrl.$modelValue, as there might be a different
        // parser/formatter in the processing chain so that the model
        // contains some different data format!
        return parseDateAndConvertTimeZoneToLocal(value, previousDate);
      }
      ctrl.$$parserName = type;
      return undefined;
    });

    ctrl.$formatters.push(function (value) {
      if (value && !isString(value)) {
        throw ngModelMinErr("datefmt", "Expected `{0}` to be a String", value);
      }

      if (type === "month") {
        if (value == null) {
          return "";
        }
        if (!MONTH_INPUT_FORMAT.test(value)) {
          throw ngModelMinErr(
            "datefmt",
            "Expected month `{0}` to be a 'YYYY-DD'",
            value,
          );
        }
      }

      if (type === "week") {
        if (value == null) {
          return "";
        }
        if (!WEEK_REGEXP.test(value)) {
          throw ngModelMinErr(
            "datefmt",
            "Expected week `{0}` to be a 'yyyy-Www'",
            value,
          );
        }
      }

      if (type === "datetimelocal") {
        if (value == null) {
          return "";
        }
        if (!DATETIMELOCAL_REGEXP.test(value)) {
          throw ngModelMinErr(
            "datefmt",
            "Expected week `{0}` to be a in date time format. See: https://developer.mozilla.org/en-US/docs/Web/HTML/Date_and_time_formats#local_date_and_time_strings",
            value,
          );
        }
      }

      return value;

      // if (isValidDate(value)) {
      //   previousDate = value;
      //   const timezone = ctrl.$options.getOption("timezone");

      //   if (timezone) {
      //     previousTimezone = timezone;
      //     previousDate = convertTimezoneToLocal(previousDate, timezone, true);
      //   }

      //   return value;
      // }
      // previousDate = null;
      // previousTimezone = null;
      // return "";
    });

    if (isDefined(attr.min) || attr.ngMin) {
      let minVal = attr.min || $parse(attr.ngMin)(scope);
      let parsedMinVal = parseObservedDateValue(minVal);

      ctrl.$validators.min = function (value) {
        if (type === "month") {
          return (
            isUndefined(parsedMinVal) ||
            parseDate(value) >= parseDate(parsedMinVal)
          );
        }

        return (
          !isValidDate(value) ||
          isUndefined(parsedMinVal) ||
          parseDate(value) >= parsedMinVal
        );
      };
      attr.$observe("min", (val) => {
        if (val !== minVal) {
          parsedMinVal = parseObservedDateValue(val);
          minVal = val;
          ctrl.$validate();
        }
      });
    }

    if (isDefined(attr.max) || attr.ngMax) {
      let maxVal = attr.max || $parse(attr.ngMax)(scope);
      let parsedMaxVal = parseObservedDateValue(maxVal);

      ctrl.$validators.max = function (value) {
        if (type === "month") {
          return (
            isUndefined(parsedMaxVal) ||
            parseDate(value) <= parseDate(parsedMaxVal)
          );
        }
        return (
          !isValidDate(value) ||
          isUndefined(parsedMaxVal) ||
          parseDate(value) <= parsedMaxVal
        );
      };
      attr.$observe("max", (val) => {
        if (val !== maxVal) {
          parsedMaxVal = parseObservedDateValue(val);
          maxVal = val;
          ctrl.$validate();
        }
      });
    }

    function isValidDate(value) {
      // Invalid Date: getTime() returns NaN
      return value && !(value.getTime && value.getTime() !== value.getTime());
    }

    function parseObservedDateValue(val) {
      return isDefined(val) && !isDate(val)
        ? parseDateAndConvertTimeZoneToLocal(val) || undefined
        : val;
    }

    function parseDateAndConvertTimeZoneToLocal(value, previousDate) {
      const timezone = ctrl.$options.getOption("timezone");

      if (previousTimezone && previousTimezone !== timezone) {
        // If the timezone has changed, adjust the previousDate to the default timezone
        // so that the new date is converted with the correct timezone offset
        previousDate = addDateMinutes(
          previousDate,
          timezoneToOffset(previousTimezone),
        );
      }

      let parsedDate = parseDate(value, previousDate);

      if (!Number.isNaN(parsedDate) && timezone) {
        parsedDate = convertTimezoneToLocal(parsedDate, timezone);
      }
      return parsedDate;
    }
  };
}

export function badInputChecker(scope, element, attr, ctrl, parserName) {
  const node = element;
  const nativeValidation = (ctrl.$$hasNativeValidators = isObject(
    node.validity,
  ));

  if (nativeValidation) {
    ctrl.$parsers.push((value) => {
      const validity = element[0][VALIDITY_STATE_PROPERTY] || {};
      if (validity.badInput || validity.typeMismatch) {
        ctrl.$$parserName = parserName;
        return undefined;
      }

      return value;
    });
  }
}

export function numberFormatterParser(ctrl) {
  ctrl.$parsers.push((value) => {
    if (ctrl.$isEmpty(value)) return null;
    if (NUMBER_REGEXP.test(value)) return parseFloat(value);

    ctrl.$$parserName = "number";
    return undefined;
  });

  ctrl.$formatters.push((value) => {
    if (!ctrl.$isEmpty(value)) {
      if (!isNumber(value)) {
        throw ngModelMinErr("numfmt", "Expected `{0}` to be a number", value);
      }
      value = value.toString();
    }
    return value;
  });
}

function parseNumberAttrVal(val) {
  if (isDefined(val) && !isNumber(val)) {
    val = parseFloat(val);
  }
  return !isNumberNaN(val) ? val : undefined;
}

export function isNumberInteger(num) {
  // See http://stackoverflow.com/questions/14636536/how-to-check-if-a-variable-is-an-integer-in-javascript#14794066
  // (minus the assumption that `num` is a number)

  return (num | 0) === num;
}

export function countDecimals(num) {
  const numString = num.toString();
  const decimalSymbolIndex = numString.indexOf(".");

  if (decimalSymbolIndex === -1) {
    if (num > -1 && num < 1) {
      // It may be in the exponential notation format (`1e-X`)
      const match = /e-(\d+)$/.exec(numString);

      if (match) {
        return Number(match[1]);
      }
    }

    return 0;
  }

  return numString.length - decimalSymbolIndex - 1;
}

export function isValidForStep(viewValue, stepBase, step) {
  // At this point `stepBase` and `step` are expected to be non-NaN values
  // and `viewValue` is expected to be a valid stringified number.
  let value = Number(viewValue);

  const isNonIntegerValue = !isNumberInteger(value);
  const isNonIntegerStepBase = !isNumberInteger(stepBase);
  const isNonIntegerStep = !isNumberInteger(step);

  // Due to limitations in Floating Point Arithmetic (e.g. `0.3 - 0.2 !== 0.1` or
  // `0.5 % 0.1 !== 0`), we need to convert all numbers to integers.
  if (isNonIntegerValue || isNonIntegerStepBase || isNonIntegerStep) {
    const valueDecimals = isNonIntegerValue ? countDecimals(value) : 0;
    const stepBaseDecimals = isNonIntegerStepBase ? countDecimals(stepBase) : 0;
    const stepDecimals = isNonIntegerStep ? countDecimals(step) : 0;

    const decimalCount = Math.max(
      valueDecimals,
      stepBaseDecimals,
      stepDecimals,
    );
    const multiplier = 10 ** decimalCount;

    value *= multiplier;
    stepBase *= multiplier;
    step *= multiplier;

    if (isNonIntegerValue) value = Math.round(value);
    if (isNonIntegerStepBase) stepBase = Math.round(stepBase);
    if (isNonIntegerStep) step = Math.round(step);
  }

  return (value - stepBase) % step === 0;
}

export function numberInputType(
  scope,
  element,
  attr,
  ctrl,
  $browser,
  $filter,
  $parse,
) {
  badInputChecker(scope, element, attr, ctrl, "number");
  numberFormatterParser(ctrl);
  baseInputType(scope, element, attr, ctrl);

  let parsedMinVal;

  if (isDefined(attr.min) || attr.ngMin) {
    let minVal = attr.min || $parse(attr.ngMin)(scope);
    parsedMinVal = parseNumberAttrVal(minVal);

    ctrl.$validators.min = function (modelValue, viewValue) {
      return (
        ctrl.$isEmpty(viewValue) ||
        isUndefined(parsedMinVal) ||
        viewValue >= parsedMinVal
      );
    };

    attr.$observe("min", (val) => {
      if (val !== minVal) {
        parsedMinVal = parseNumberAttrVal(val);
        minVal = val;
        // TODO(matsko): implement validateLater to reduce number of validations
        ctrl.$validate();
      }
    });
  }

  if (isDefined(attr.max) || attr.ngMax) {
    let maxVal = attr.max || $parse(attr.ngMax)(scope);
    let parsedMaxVal = parseNumberAttrVal(maxVal);

    ctrl.$validators.max = function (modelValue, viewValue) {
      return (
        ctrl.$isEmpty(viewValue) ||
        isUndefined(parsedMaxVal) ||
        viewValue <= parsedMaxVal
      );
    };

    attr.$observe("max", (val) => {
      if (val !== maxVal) {
        parsedMaxVal = parseNumberAttrVal(val);
        maxVal = val;
        // TODO(matsko): implement validateLater to reduce number of validations
        ctrl.$validate();
      }
    });
  }

  if (isDefined(attr.step) || attr.ngStep) {
    let stepVal = attr.step || $parse(attr.ngStep)(scope);
    let parsedStepVal = parseNumberAttrVal(stepVal);

    ctrl.$validators.step = function (modelValue, viewValue) {
      return (
        ctrl.$isEmpty(viewValue) ||
        isUndefined(parsedStepVal) ||
        isValidForStep(viewValue, parsedMinVal || 0, parsedStepVal)
      );
    };

    attr.$observe("step", (val) => {
      // TODO(matsko): implement validateLater to reduce number of validations
      if (val !== stepVal) {
        parsedStepVal = parseNumberAttrVal(val);
        stepVal = val;
        ctrl.$validate();
      }
    });
  }
}

export function rangeInputType(scope, element, attr, ctrl) {
  badInputChecker(scope, element, attr, ctrl, "range");
  numberFormatterParser(ctrl);
  baseInputType(scope, element, attr, ctrl);

  const supportsRange =
    ctrl.$$hasNativeValidators && element[0].type === "range";
  let minVal = supportsRange ? 0 : undefined;
  let maxVal = supportsRange ? 100 : undefined;
  let stepVal = supportsRange ? 1 : undefined;
  const { validity } = element;
  const hasMinAttr = isDefined(attr.min);
  const hasMaxAttr = isDefined(attr.max);
  const hasStepAttr = isDefined(attr.step);

  const originalRender = ctrl.$render;

  ctrl.$render =
    supportsRange &&
    isDefined(validity.rangeUnderflow) &&
    isDefined(validity.rangeOverflow)
      ? // Browsers that implement range will set these values automatically, but reading the adjusted values after
        // $render would cause the min / max validators to be applied with the wrong value
        function rangeRender() {
          originalRender();
          ctrl.$setViewValue(element.value);
        }
      : originalRender;

  if (hasMinAttr) {
    minVal = parseNumberAttrVal(attr.min);

    ctrl.$validators.min = supportsRange
      ? // Since all browsers set the input to a valid value, we don't need to check validity
        function noopMinValidator() {
          return true;
        }
      : // non-support browsers validate the min val
        function minValidator(modelValue, viewValue) {
          return (
            ctrl.$isEmpty(viewValue) ||
            isUndefined(minVal) ||
            viewValue >= minVal
          );
        };

    setInitialValueAndObserver("min", minChange);
  }

  if (hasMaxAttr) {
    maxVal = parseNumberAttrVal(attr.max);

    ctrl.$validators.max = supportsRange
      ? // Since all browsers set the input to a valid value, we don't need to check validity
        function noopMaxValidator() {
          return true;
        }
      : // non-support browsers validate the max val
        function maxValidator(modelValue, viewValue) {
          return (
            ctrl.$isEmpty(viewValue) ||
            isUndefined(maxVal) ||
            viewValue <= maxVal
          );
        };

    setInitialValueAndObserver("max", maxChange);
  }

  if (hasStepAttr) {
    stepVal = parseNumberAttrVal(attr.step);

    ctrl.$validators.step = supportsRange
      ? function nativeStepValidator() {
          // Currently, only FF implements the spec on step change correctly (i.e. adjusting the
          // input element value to a valid value). It's possible that other browsers set the stepMismatch
          // validity error instead, so we can at least report an error in that case.
          return !validity.stepMismatch;
        }
      : // ngStep doesn't set the setp attr, so the browser doesn't adjust the input value as setting step would
        function stepValidator(modelValue, viewValue) {
          return (
            ctrl.$isEmpty(viewValue) ||
            isUndefined(stepVal) ||
            isValidForStep(viewValue, minVal || 0, stepVal)
          );
        };

    setInitialValueAndObserver("step", stepChange);
  }

  function setInitialValueAndObserver(htmlAttrName, changeFn) {
    // interpolated attributes set the attribute value only after a digest, but we need the
    // attribute value when the input is first rendered, so that the browser can adjust the
    // input value based on the min/max value
    element.attr(htmlAttrName, attr[htmlAttrName]);
    let oldVal = attr[htmlAttrName];
    attr.$observe(htmlAttrName, (val) => {
      if (val !== oldVal) {
        oldVal = val;
        changeFn(val);
      }
    });
  }

  function minChange(val) {
    minVal = parseNumberAttrVal(val);
    // ignore changes before model is initialized
    if (isNumberNaN(ctrl.$modelValue)) {
      return;
    }

    if (supportsRange) {
      let elVal = element.value;
      // IE11 doesn't set the el val correctly if the minVal is greater than the element value
      if (minVal > elVal) {
        elVal = minVal;
        element.value = elVal;
      }
      ctrl.$setViewValue(elVal);
    } else {
      // TODO(matsko): implement validateLater to reduce number of validations
      ctrl.$validate();
    }
  }

  function maxChange(val) {
    maxVal = parseNumberAttrVal(val);
    // ignore changes before model is initialized
    if (isNumberNaN(ctrl.$modelValue)) {
      return;
    }

    if (supportsRange) {
      let elVal = element.value;
      // IE11 doesn't set the el val correctly if the maxVal is less than the element value
      if (maxVal < elVal) {
        element.value = maxVal;
        // IE11 and Chrome don't set the value to the minVal when max < min
        elVal = maxVal < minVal ? minVal : maxVal;
      }
      ctrl.$setViewValue(elVal);
    } else {
      // TODO(matsko): implement validateLater to reduce number of validations
      ctrl.$validate();
    }
  }

  function stepChange(val) {
    stepVal = parseNumberAttrVal(val);
    // ignore changes before model is initialized
    if (isNumberNaN(ctrl.$modelValue)) {
      return;
    }

    // Some browsers don't adjust the input value correctly, but set the stepMismatch error
    if (!supportsRange) {
      // TODO(matsko): implement validateLater to reduce number of validations
      ctrl.$validate();
    } else if (ctrl.$viewValue !== element.value) {
      ctrl.$setViewValue(element.value);
    }
  }
}

function urlInputType(scope, element, attr, ctrl) {
  // Note: no badInputChecker here by purpose as `url` is only a validation
  // in browsers, i.e. we can always read out input.value even if it is not valid!
  baseInputType(scope, element, attr, ctrl);
  stringBasedInputType(ctrl);

  ctrl.$validators.url = function (modelValue, viewValue) {
    const value = modelValue || viewValue;
    return ctrl.$isEmpty(value) || URL_REGEXP.test(value);
  };
}

function emailInputType(scope, element, attr, ctrl) {
  // Note: no badInputChecker here by purpose as `url` is only a validation
  // in browsers, i.e. we can always read out input.value even if it is not valid!
  baseInputType(scope, element, attr, ctrl);
  stringBasedInputType(ctrl);

  ctrl.$validators.email = function (modelValue, viewValue) {
    const value = modelValue || viewValue;
    return ctrl.$isEmpty(value) || EMAIL_REGEXP.test(value);
  };
}

function radioInputType(scope, element, attr, ctrl) {
  const doTrim = !attr.ngTrim || trim(attr.ngTrim) !== "false";
  // make the name unique, if not defined
  if (isUndefined(attr.name)) {
    element.attr("name", nextUid());
  }

  const listener = function (ev) {
    let value;
    if (element[0].checked) {
      value = attr.value;
      if (doTrim) {
        value = trim(value);
      }
      ctrl.$setViewValue(value, ev && ev.type);
    }
  };

  element.addEventListener("change", listener);

  ctrl.$render = function () {
    let { value } = attr;
    if (doTrim) {
      value = trim(value);
    }
    element[0].checked = value === ctrl.$viewValue;
  };

  attr.$observe("value", ctrl.$render);
}

function parseConstantExpr($parse, context, name, expression, fallback) {
  let parseFn;
  if (isDefined(expression)) {
    parseFn = $parse(expression);
    if (!parseFn.constant) {
      throw ngModelMinErr(
        "constexpr",
        "Expected constant expression for `{0}`, but saw " + "`{1}`.",
        name,
        expression,
      );
    }
    return parseFn(context);
  }
  return fallback;
}

function checkboxInputType(
  scope,
  element,
  attr,
  ctrl,
  $browser,
  $filter,
  $parse,
) {
  const trueValue = parseConstantExpr(
    $parse,
    scope,
    "ngTrueValue",
    attr.ngTrueValue,
    true,
  );
  const falseValue = parseConstantExpr(
    $parse,
    scope,
    "ngFalseValue",
    attr.ngFalseValue,
    false,
  );

  const listener = function (ev) {
    ctrl.$setViewValue(element[0].checked, ev && ev.type);
  };

  element.addEventListener("change", listener);

  ctrl.$render = function () {
    element[0].checked = ctrl.$viewValue;
  };

  // Override the standard `$isEmpty` because the $viewValue of an empty checkbox is always set to `false`
  // This is because of the parser below, which compares the `$modelValue` with `trueValue` to convert
  // it to a boolean.
  ctrl.$isEmpty = function (value) {
    return value === false;
  };

  ctrl.$formatters.push((value) => equals(value, trueValue));

  ctrl.$parsers.push((value) => (value ? trueValue : falseValue));
}

/**
 * @returns {import('../../types.js').Directive}
 */
inputDirective.$inject = ["$browser", "$filter", "$parse"];

/**
 * @param {import('../../services/browser').Browser} $browser
 * @param {*} $filter
 * @param {*} $parse
 * @returns
 */
export function inputDirective($browser, $filter, $parse) {
  return {
    restrict: "E",
    require: ["?ngModel"],
    link: {
      pre(scope, element, attr, ctrls) {
        if (ctrls[0]) {
          (inputType[lowercase(attr.type)] || inputType.text)(
            scope,
            element,
            attr,
            ctrls[0],
            $browser,
            $filter,
            $parse,
          );
        }
      },
    },
  };
}

/**
 * @returns {import('../../types.js').Directive}
 */
export function hiddenInputBrowserCacheDirective() {
  const valueProperty = {
    configurable: true,
    enumerable: false,
    get() {
      return this.getAttribute("value") || "";
    },
    set(val) {
      this.setAttribute("value", val);
    },
  };

  return {
    restrict: "E",
    priority: 200,
    compile(_, attr) {
      if (lowercase(attr.type) !== "hidden") {
        return;
      }

      return {
        pre(scope, element) {
          const node = element;

          // Support: Edge
          // Moving the DOM around prevents autofillling
          if (node.parentNode) {
            node.parentNode.insertBefore(node, node.nextSibling);
          }

          // Support: FF, IE
          // Avoiding direct assignment to .value prevents autofillling
          if (Object.defineProperty) {
            Object.defineProperty(node, "value", valueProperty);
          }
        },
      };
    },
  };
}

const CONSTANT_VALUE_REGEXP = /^(true|false|\d+)$/;

/**
 * @returns {import('../../types.js').Directive}
 */
export function ngValueDirective() {
  /**
   *  inputs use the value attribute as their default value if the value property is not set.
   *  Once the value property has been set (by adding input), it will not react to changes to
   *  the value attribute anymore. Setting both attribute and property fixes this behavior, and
   *  makes it possible to use ngValue as a sort of one-way bind.
   */
  function updateElementValue(element, attr, value) {
    // Support: IE9 only
    // In IE9 values are converted to string (e.g. `input.value = null` results in `input.value === 'null'`).
    const propValue = isDefined(value) ? value : null;
    element[0]["value"] = propValue;
    attr.$set("value", value);
  }

  return {
    restrict: "A",
    priority: 100,
    compile(tpl, tplAttr) {
      if (CONSTANT_VALUE_REGEXP.test(tplAttr.ngValue)) {
        return function ngValueConstantLink(scope, elm, attr) {
          const value = scope.$eval(attr.ngValue);
          updateElementValue(elm, attr, value);
        };
      }
      return function ngValueLink(scope, elm, attr) {
        scope.$watch(attr.ngValue, (value) => {
          updateElementValue(elm, attr, value);
        });
      };
    },
  };
}
