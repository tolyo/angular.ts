import { isString } from "../../shared/utils";

const ACTIVE_CLASS = "ng-active";
const INACTIVE_CLASS = "ng-inactive";

class NgMessageCtrl {
  /**
   * @param {import('../../shared/jqlite/jqlite').JQLite} $element
   * @param {import('../../core/scope/scope').Scope} $scope
   * @param {import('../../core/compile/attributes').Attributes} $attrs
   * @param {*} $animate
   */
  constructor($element, $scope, $attrs, $animate) {
    this.$element = $element;
    this.$scope = $scope;
    this.$attrs = $attrs;
    this.$animate = $animate;

    this.latestKey = 0;
    this.nextAttachId = 0;
    this.messages = {};
    this.renderLater = false;
    this.cachedCollection = null;

    this.head = undefined;
    this.default = undefined;

    this.$scope.$watchCollection(
      this.$attrs["ngMessages"] || this.$attrs["for"],
      this.render.bind(this),
    );
  }

  getAttachId() {
    return this.nextAttachId++;
  }

  render(collection = {}) {
    this.renderLater = false;
    this.cachedCollection = collection;

    const multiple =
      isAttrTruthy(this.$scope, this.$attrs["ngMessagesMultiple"]) ||
      isAttrTruthy(this.$scope, this.$attrs["multiple"]);

    const unmatchedMessages = [];
    const matchedKeys = {};
    let truthyKeys = 0;
    let messageItem = this.head;
    let messageFound = false;
    let totalMessages = 0;

    while (messageItem != null) {
      totalMessages++;
      const messageCtrl = messageItem.message;
      let messageUsed = false;

      if (!messageFound) {
        Object.entries(collection).forEach(([key, value]) => {
          if (truthy(value) && !messageUsed) {
            truthyKeys++;

            if (messageCtrl.test(key)) {
              if (matchedKeys[key]) return;
              matchedKeys[key] = true;

              messageUsed = true;
              messageCtrl.attach();
            }
          }
        });
      }

      if (messageUsed) {
        messageFound = !multiple;
      } else {
        unmatchedMessages.push(messageCtrl);
      }

      messageItem = messageItem.next;
    }

    unmatchedMessages.forEach((messageCtrl) => {
      messageCtrl.detach();
    });

    const messageMatched = unmatchedMessages.length !== totalMessages;
    const attachDefault = this.default && !messageMatched && truthyKeys > 0;

    if (attachDefault) {
      this.default.attach();
    } else if (this.default) {
      this.default.detach();
    }

    if (messageMatched || attachDefault) {
      this.$animate.setClass(this.$element, ACTIVE_CLASS, INACTIVE_CLASS);
    } else {
      this.$animate.setClass(this.$element, INACTIVE_CLASS, ACTIVE_CLASS);
    }
  }

  reRender() {
    if (!this.renderLater) {
      this.renderLater = true;
      this.$scope.$evalAsync(() => {
        if (this.renderLater && this.cachedCollection) {
          this.render(this.cachedCollection);
        }
      });
    }
  }

  register(comment, messageCtrl, isDefault) {
    if (isDefault) {
      this.default = messageCtrl;
    } else {
      const nextKey = this.latestKey.toString();
      this.messages[nextKey] = {
        message: messageCtrl,
      };
      this.insertMessageNode(this.$element, comment, nextKey);
      comment.$$ngMessageNode = nextKey;
      this.latestKey++;
    }

    this.reRender();
  }

  deregister(comment, isDefault) {
    if (isDefault) {
      delete this.default;
    } else {
      const key = comment.$$ngMessageNode;
      delete comment.$$ngMessageNode;
      this.removeMessageNode(this.$element, comment, key);
      delete this.messages[key];
    }
    this.reRender();
  }

  findPreviousMessage(parent, comment) {
    let prevNode = comment;
    const parentLookup = [];

    while (prevNode && prevNode !== parent) {
      const prevKey = prevNode.$$ngMessageNode;
      if (prevKey && prevKey.length) {
        return this.messages[prevKey];
      }

      if (prevNode.childNodes.length && parentLookup.indexOf(prevNode) === -1) {
        parentLookup.push(prevNode);
        prevNode = prevNode.childNodes[prevNode.childNodes.length - 1];
      } else if (prevNode.previousSibling) {
        prevNode = prevNode.previousSibling;
      } else {
        prevNode = prevNode.parentNode;
        parentLookup.push(prevNode);
      }
    }
  }

  insertMessageNode(parent, comment, key) {
    const messageNode = this.messages[key];
    if (!this.head) {
      this.head = messageNode;
    } else {
      const match = this.findPreviousMessage(parent, comment);
      if (match) {
        messageNode.next = match.next;
        match.next = messageNode;
      } else {
        messageNode.next = this.head;
        this.head = messageNode;
      }
    }
  }

  removeMessageNode(parent, comment, key) {
    const messageNode = this.messages[key];

    if (!messageNode) return;

    const match = this.findPreviousMessage(parent, comment);
    if (match) {
      match.next = messageNode.next;
    } else {
      this.head = messageNode.next;
    }
  }
}

ngMessagesDirective.$inject = ["$animate"];
export function ngMessagesDirective($animate) {
  return {
    require: "ngMessages",
    restrict: "AE",
    controller: ($element, $scope, $attrs) =>
      new NgMessageCtrl($element, $scope, $attrs, $animate),
  };
}

function isAttrTruthy(scope, attr) {
  return (
    (isString(attr) && attr.length === 0) || // empty attribute
    truthy(scope.$eval(attr))
  );
}

function truthy(val) {
  return isString(val) ? val.length : !!val;
}

ngMessagesIncludeDirective.$inject = ["$templateRequest", "$compile"];
export function ngMessagesIncludeDirective($templateRequest, $compile) {
  return {
    restrict: "AE",
    require: "^^ngMessages", // we only require this for validation sake
    link($scope, element, attrs) {
      const src = attrs.ngMessagesInclude || attrs.src;
      $templateRequest(src).then((html) => {
        if ($scope.$$destroyed) return;
        if (isString(html) && !html.trim()) {
          // Empty template - nothing to compile
        } else {
          // Non-empty template - compile and link
          $compile(html)($scope, (contents) => {
            element.after(contents);
          });
        }
      });
    },
  };
}

export const ngMessageDirective = ngMessageDirectiveFactory(false);
export const ngMessageExpDirective = ngMessageDirectiveFactory(false);
export const ngMessageDefaultDirective = ngMessageDirectiveFactory(true);

function ngMessageDirectiveFactory(isDefault) {
  ngMessageDirective.$inject = ["$animate"];
  function ngMessageDirective($animate) {
    return {
      restrict: "AE",
      transclude: "element",
      priority: 1, // must run before ngBind, otherwise the text is set on the comment
      terminal: true,
      require: "^^ngMessages",
      link(scope, element, attrs, ngMessagesCtrl, $transclude) {
        let commentNode;
        let records;
        let staticExp;
        let dynamicExp;

        if (!isDefault) {
          commentNode = element;
          staticExp = attrs.ngMessage || attrs.when;
          dynamicExp = attrs.ngMessageExp || attrs.whenExp;

          const assignRecords = function (items) {
            records = items
              ? Array.isArray(items)
                ? items
                : items.split(/[\s,]+/)
              : null;
            ngMessagesCtrl.reRender();
          };

          if (dynamicExp) {
            assignRecords(scope.$eval(dynamicExp));
            scope.$watchCollection(dynamicExp, assignRecords);
          } else {
            assignRecords(staticExp);
          }
        }

        let currentElement;
        let messageCtrl;
        ngMessagesCtrl.register(
          commentNode,
          (messageCtrl = {
            test(name) {
              return contains(records, name);
            },
            attach() {
              if (!currentElement) {
                $transclude((elm, newScope) => {
                  $animate.enter(elm, null, element);
                  currentElement = elm;

                  // Each time we attach this node to a message we get a new id that we can match
                  // when we are destroying the node later.
                  const $$attachId = (currentElement.$$attachId =
                    ngMessagesCtrl.getAttachId());

                  // in the event that the element or a parent element is destroyed
                  // by another structural directive then it's time
                  // to deregister the message from the controller
                  currentElement.addEventListerer("$destroy", () => {
                    // If the message element was removed via a call to `detach` then `currentElement` will be null
                    // So this handler only handles cases where something else removed the message element.
                    if (
                      currentElement &&
                      currentElement.$$attachId === $$attachId
                    ) {
                      ngMessagesCtrl.deregister(commentNode, isDefault);
                      messageCtrl.detach();
                    }
                    newScope.$destroy();
                  });
                });
              }
            },
            detach() {
              if (currentElement) {
                const elm = currentElement;
                currentElement = null;
                $animate.leave(elm);
              }
            },
          }),
          isDefault,
        );

        // We need to ensure that this directive deregisters itself when it no longer exists
        // Normally this is done when the attached element is destroyed; but if this directive
        // gets removed before we attach the message to the DOM there is nothing to watch
        // in which case we must deregister when the containing scope is destroyed.
        scope.$on("$destroy", () => {
          ngMessagesCtrl.deregister(commentNode, isDefault);
        });
      },
    };
  }
  return ngMessageDirective;
}

function contains(collection, key) {
  if (collection) {
    return Array.isArray(collection)
      ? collection.indexOf(key) >= 0
      : Object.prototype.hasOwnProperty.call(collection, key);
  }
}
