import {
  hasCustomToString,
  isFunction,
  isObject,
  isArrayLike,
  isString,
  minErr,
} from "../shared/utils";

orderByFilter.$inject = ["$parse"];

export function orderByFilter($parse) {
  return function (array, sortPredicate, reverseOrder, compareFn) {
    if (array == null) return array;
    if (isFunction(array)) return array();
    if (!isArrayLike(array)) {
      throw minErr("orderBy")(
        "notarray",
        "Expected array but received: {0}",
        array,
      );
    }

    if (!Array.isArray(sortPredicate)) {
      sortPredicate = [sortPredicate];
    }
    if (sortPredicate.length === 0) {
      sortPredicate = ["+"];
    }

    const predicates = processPredicates(sortPredicate);

    const descending = reverseOrder ? -1 : 1;

    // Define the `compare()` function. Use a default comparator if none is specified.
    const compare = isFunction(compareFn) ? compareFn : defaultCompare;

    // The next three lines are a version of a Swartzian Transform idiom from Perl
    // (sometimes called the Decorate-Sort-Undecorate idiom)
    // See https://en.wikipedia.org/wiki/Schwartzian_transform
    const compareValues = Array.prototype.map.call(array, getComparisonObject);
    compareValues.sort(doComparison);
    array = compareValues.map((item) => item.value);

    return array;

    function getComparisonObject(value, index) {
      // NOTE: We are adding an extra `tieBreaker` value based on the element's index.
      // This will be used to keep the sort stable when none of the input predicates can
      // distinguish between two elements.
      return {
        value,
        tieBreaker: { value: index, type: "number", index },
        predicateValues: predicates.map((predicate) =>
          getPredicateValue(predicate.get(value), index),
        ),
      };
    }

    function doComparison(v1, v2) {
      for (let i = 0, ii = predicates.length; i < ii; i++) {
        const result = compare(v1.predicateValues[i], v2.predicateValues[i]);
        if (result) {
          return result * predicates[i].descending * descending;
        }
      }

      return (
        (compare(v1.tieBreaker, v2.tieBreaker) ||
          defaultCompare(v1.tieBreaker, v2.tieBreaker)) * descending
      );
    }
  };

  function processPredicates(sortPredicates) {
    return sortPredicates.map((predicate) => {
      let descending = 1;
      let get = (x) => x;

      if (isFunction(predicate)) {
        get = predicate;
      } else if (isString(predicate)) {
        if (predicate.charAt(0) === "+" || predicate.charAt(0) === "-") {
          descending = predicate.charAt(0) === "-" ? -1 : 1;
          predicate = predicate.substring(1);
        }
        if (predicate !== "") {
          let parsed = $parse(predicate);
          if (parsed.constant) {
            const key = parsed();
            get = (value) => value[key];
          } else {
            get = parsed;
          }
        }
      }
      return { get, descending };
    });
  }

  function isPrimitive(value) {
    switch (typeof value) {
      case "number": /* falls through */
      case "boolean": /* falls through */
      case "string":
        return true;
      default:
        return false;
    }
  }

  function objectValue(value) {
    // If `valueOf` is a valid function use that
    if (isFunction(value.valueOf)) {
      value = value.valueOf();
      if (isPrimitive(value)) return value;
    }
    // If `toString` is a valid function and not the one from `Object.prototype` use that
    if (hasCustomToString(value)) {
      value = value.toString();
      if (isPrimitive(value)) return value;
    }

    return value;
  }

  function getPredicateValue(value, index) {
    /** @type {String} */ let type = typeof value;
    if (value === null) {
      type = "null";
    } else if (type === "object") {
      value = objectValue(value);
    }
    return { value, type, index };
  }

  function defaultCompare(v1, v2) {
    let result = 0;
    const type1 = v1.type;
    const type2 = v2.type;

    if (type1 === type2) {
      let value1 = v1.value;
      let value2 = v2.value;

      if (type1 === "string") {
        // Compare strings case-insensitively
        value1 = value1.toLowerCase();
        value2 = value2.toLowerCase();
      } else if (type1 === "object") {
        // For basic objects, use the position of the object
        // in the collection instead of the value
        if (isObject(value1)) value1 = v1.index;
        if (isObject(value2)) value2 = v2.index;
      }

      if (value1 !== value2) {
        result = value1 < value2 ? -1 : 1;
      }
    } else {
      result =
        type1 === "undefined"
          ? 1
          : type2 === "undefined"
            ? -1
            : type1 === "null"
              ? 1
              : type2 === "null"
                ? -1
                : type1 < type2
                  ? -1
                  : 1;
    }

    return result;
  }
}
