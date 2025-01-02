import { minErr, hashKey, isArrayLike } from "../../shared/utils";
import { getBlockNodes } from "../../shared/jqlite/jqlite.js";

export const ngRepeatDirective = [
  "$parse",
  "$animate",
  ($parse, $animate) => {
    const NG_REMOVED = "$$NG_REMOVED";
    const ngRepeatMinErr = minErr("ngRepeat");

    function updateScope(
      scope,
      index,
      valueIdentifier,
      value,
      keyIdentifier,
      key,
      arrayLength,
    ) {
      // TODO(perf): generate setters to shave off ~40ms or 1-1.5%
      if (scope[valueIdentifier] !== value) {
        scope[valueIdentifier] = value;
      }

      if (keyIdentifier) scope[keyIdentifier] = key;
      if (value) {
        scope.$target.$$hashKey = value.$$hashKey;
      }
      scope.$index = index;
      scope.$first = index === 0;
      scope.$last = index === arrayLength - 1;
      scope.$middle = !(scope.$first || scope.$last);
      scope.$odd = !(scope.$even = (index & 1) === 0);
    }

    const getBlockStart = function (block) {
      return block.clone[0];
    };

    const getBlockEnd = function (block) {
      return block.clone[block.clone.length - 1];
    };

    const trackByIdArrayFn = function ($scope, key, value) {
      return hashKey(value);
    };

    const trackByIdObjFn = function ($scope, key) {
      return key;
    };

    return {
      restrict: "A",
      multiElement: true,
      transclude: "element",
      priority: 1000,
      terminal: true,
      compile: ($element, $attr) => {
        const expression = $attr.ngRepeat;

        let match = expression.match(
          /^\s*([\s\S]+?)\s+in\s+([\s\S]+?)(?:\s+as\s+([\s\S]+?))?(?:\s+track\s+by\s+([\s\S]+?))?\s*$/,
        );

        if (!match) {
          throw ngRepeatMinErr(
            "iexp",
            "Expected expression in form of '_item_ in _collection_[ track by _id_]' but got '{0}'.",
            expression,
          );
        }

        const lhs = match[1];
        const rhs = match[2];
        const aliasAs = match[3];
        const trackByExp = match[4];

        match = lhs.match(
          /^(?:(\s*[$\w]+)|\(\s*([$\w]+)\s*,\s*([$\w]+)\s*\))$/,
        );

        if (!match) {
          throw ngRepeatMinErr(
            "iidexp",
            "'_item_' in '_item_ in _collection_' should be an identifier or '(_key_, _value_)' expression, but got '{0}'.",
            lhs,
          );
        }
        const valueIdentifier = match[3] || match[1];
        const keyIdentifier = match[2];

        if (
          aliasAs &&
          (!/^[$a-zA-Z_][$a-zA-Z0-9_]*$/.test(aliasAs) ||
            /^(null|undefined|this|\$index|\$first|\$middle|\$last|\$even|\$odd|\$parent|\$root|\$id)$/.test(
              aliasAs,
            ))
        ) {
          throw ngRepeatMinErr(
            "badident",
            "alias '{0}' is invalid --- must be a valid JS identifier which is not a reserved name.",
            aliasAs,
          );
        }

        let trackByIdExpFn;

        if (trackByExp) {
          var hashFnLocals = { $id: hashKey };
          const trackByExpGetter = $parse(trackByExp);

          trackByIdExpFn = function ($scope, key, value, index) {
            // assign key, value, and $index to the locals so that they can be used in hash functions
            if (keyIdentifier) hashFnLocals[keyIdentifier] = key;
            hashFnLocals[valueIdentifier] = value;
            hashFnLocals.$index = index;
            return trackByExpGetter($scope, hashFnLocals);
          };
        }

        return function ngRepeatLink(
          $scope,
          $element,
          $attr,
          ctrl,
          $transclude,
        ) {
          // Store a list of elements from previous run. This is a hash where key is the item from the
          // iterator, and the value is objects with following properties.
          //   - scope: bound scope
          //   - clone: previous element.
          //   - index: position
          //
          // We are using no-proto object so that we don't need to guard against inherited props via
          // hasOwnProperty.
          let lastBlockMap = Object.create(null);

          // watch props
          $scope.$watch(rhs, (collection) => {
            var index,
              length,
              previousNode = $element[0], // node that cloned nodes should be inserted after
              // initialized to the comment node anchor
              nextNode,
              // Same as lastBlockMap but it has the current state. It will become the
              // lastBlockMap on the next iteration.
              nextBlockMap = Object.create(null),
              collectionLength,
              key,
              value, // key/value of iteration
              trackById,
              trackByIdFn,
              collectionKeys,
              block, // last object information {scope, element, id}
              nextBlockOrder,
              elementsToRemove;

            if (aliasAs) {
              $scope[aliasAs] = collection;
            }

            if (isArrayLike(collection)) {
              collectionKeys = collection;
              trackByIdFn = trackByIdExpFn || trackByIdArrayFn;
            } else {
              trackByIdFn = trackByIdExpFn || trackByIdObjFn;
              // if object, extract keys, in enumeration order, unsorted
              collectionKeys = [];
              for (var itemKey in collection) {
                if (
                  Object.hasOwnProperty.call(collection, itemKey) &&
                  itemKey.charAt(0) !== "$"
                ) {
                  collectionKeys.push(itemKey);
                }
              }
            }

            collectionLength = collectionKeys.length;
            nextBlockOrder = new Array(collectionLength);

            // locate existing items
            for (index = 0; index < collectionLength; index++) {
              key =
                collection === collectionKeys ? index : collectionKeys[index];
              value = collection[key];
              trackById = trackByIdFn($scope, key, value, index);
              if (lastBlockMap[trackById]) {
                // found previously seen block
                block = lastBlockMap[trackById];
                delete lastBlockMap[trackById];
                nextBlockMap[trackById] = block;
                nextBlockOrder[index] = block;
              } else if (nextBlockMap[trackById]) {
                // if collision detected. restore lastBlockMap and throw an error
                Object.values(nextBlockOrder).forEach((block) => {
                  if (block && block.scope) lastBlockMap[block.id] = block;
                });
                throw ngRepeatMinErr(
                  "dupes",
                  "Duplicates in a repeater are not allowed. Use 'track by' expression to specify unique keys. Repeater: {0}, Duplicate key: {1}, Duplicate value: {2}",
                  expression,
                  trackById,
                  value,
                );
              } else {
                // new never before seen block
                nextBlockOrder[index] = {
                  id: trackById,
                  scope: undefined,
                  clone: undefined,
                };
                nextBlockMap[trackById] = true;
              }
            }

            // Clear the value property from the hashFnLocals object to prevent a reference to the last value
            // being leaked into the ngRepeatCompile function scope
            if (hashFnLocals) {
              hashFnLocals[valueIdentifier] = undefined;
            }

            // remove leftover items
            for (var blockKey in lastBlockMap) {
              block = lastBlockMap[blockKey];
              elementsToRemove = getBlockNodes(block.clone);
              $animate.leave(elementsToRemove);
              if (elementsToRemove[0].parentNode) {
                // if the element was not removed yet because of pending animation, mark it as deleted
                // so that we can ignore it later
                for (
                  index = 0, length = elementsToRemove.length;
                  index < length;
                  index++
                ) {
                  elementsToRemove[index][NG_REMOVED] = true;
                }
              }
              block.scope.$destroy();
            }

            // we are not using forEach for perf reasons (trying to avoid #call)
            for (index = 0; index < collectionLength; index++) {
              key =
                collection === collectionKeys ? index : collectionKeys[index];
              value = collection[key];
              block = nextBlockOrder[index];

              if (block.scope) {
                // if we have already seen this object, then we need to reuse the
                // associated scope/element

                nextNode = previousNode;

                // skip nodes that are already pending removal via leave animation
                do {
                  nextNode = nextNode.nextSibling;
                } while (nextNode && nextNode[NG_REMOVED]);

                if (getBlockStart(block) !== nextNode) {
                  // existing item which got moved
                  $animate.move(getBlockNodes(block.clone), null, previousNode);
                }
                previousNode = getBlockEnd(block);
                updateScope(
                  block.scope,
                  index,
                  valueIdentifier,
                  value,
                  keyIdentifier,
                  key,
                  collectionLength,
                );
              } else {
                // new item which we don't know about
                $transclude(
                  // Clone attach function
                  (clone, scope) => {
                    block.scope = scope;
                    // Removing this comment node breaks // "clobber ng-if" test
                    // TODO investigate
                    const endNode = document.createComment("");
                    clone[clone.length++] = endNode;
                    $animate.enter(clone, null, previousNode);
                    previousNode = endNode;
                    // Note: We only need the first/last node of the cloned nodes.
                    // However, we need to keep the reference to the jqlite wrapper as it might be changed later
                    // by a directive with templateUrl when its template arrives.
                    block.clone = clone;
                    $animate.enter(clone, null, previousNode);
                    previousNode = clone;
                    // Note: We only need the first/last node of the cloned nodes.
                    // However, we need to keep the reference to the jqlite wrapper as it might be changed later
                    // by a directive with templateUrl when its template arrives.
                    block.clone = clone;
                    nextBlockMap[block.id] = block;
                    updateScope(
                      block.scope,
                      index,
                      valueIdentifier,
                      value,
                      keyIdentifier,
                      key,
                      collectionLength,
                    );
                  },
                );
              }
            }
            lastBlockMap = nextBlockMap;
          });
        };
      },
    };
  },
];
