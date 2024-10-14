import { createInjector } from "../../core/di/injector";
import { countWatchers } from "../../core/scope/scope";
import { Angular } from "../../loader";
import { isString } from "../../shared/utils";
import { JQLite } from "../../shared/jqlite/jqlite";

describe("ngMessages", () => {
  let $rootScope, $compile, $templateCache;

  beforeEach(() => {
    window.angular = new Angular();
    window.angular.module("app", ["ng"]).directive("messageWrap", () => ({
      transclude: true,
      scope: {
        col: "=col",
      },
      template: '<div ng-messages="col"><ng-transclude></ng-transclude></div>',
    }));

    window.angular
      .bootstrap(document.getElementById("dummy"), ["app"])
      .invoke((_$rootScope_, _$compile_, _$templateCache_) => {
        $rootScope = _$rootScope_;
        $compile = _$compile_;
        $templateCache = _$templateCache_;
      });
  });

  function messageChildren(element) {
    return (element.length ? element[0] : element).querySelectorAll(
      "[ng-message], [ng-message-exp]",
    );
  }

  function s(str) {
    return str.replace(/\s+/g, "");
  }

  function trim(value) {
    return isString(value) ? value.trim() : value;
  }

  let element;

  it("should render based off of a hashmap collection", () => {
    element = $compile(
      '<div ng-messages="col">' +
        '  <div ng-message="val">Message is set</div>' +
        "</div>",
    )($rootScope);
    expect(element.text()).not.toContain("Message is set");

    $rootScope.$apply(() => {
      $rootScope.col = { val: true };
    });

    expect(element.text()).toContain("Message is set");
  });

  it("should render the same message if multiple message keys match", () => {
    element = $compile(
      '<div ng-messages="col">' +
        '  <div ng-message="one, two, three">Message is set</div>' +
        "</div>",
    )($rootScope);
    expect(element.text()).not.toContain("Message is set");

    $rootScope.$apply(() => {
      $rootScope.col = { one: true };
    });

    expect(element.text()).toContain("Message is set");

    $rootScope.$apply(() => {
      $rootScope.col = { two: true, one: false };
    });

    expect(element.text()).toContain("Message is set");

    $rootScope.$apply(() => {
      $rootScope.col = { three: true, two: false };
    });

    expect(element.text()).toContain("Message is set");

    $rootScope.$apply(() => {
      $rootScope.col = { three: false };
    });

    expect(element.text()).not.toContain("Message is set");
  });

  it("should use the when attribute when an element directive is used", () => {
    element = $compile(
      '<ng-messages for="col">' +
        '  <ng-message when="val">Message is set</div>' +
        "</ng-messages>",
    )($rootScope);
    expect(element.text()).not.toContain("Message is set");

    $rootScope.$apply(() => {
      $rootScope.col = { val: true };
    });

    expect(element.text()).toContain("Message is set");
  });

  it("should render the same message if multiple message keys match based on the when attribute", () => {
    element = $compile(
      '<ng-messages for="col">' +
        '  <ng-message when=" one two three ">Message is set</div>' +
        "</ng-messages>",
    )($rootScope);
    expect(element.text()).not.toContain("Message is set");

    $rootScope.$apply(() => {
      $rootScope.col = { one: true };
    });

    expect(element.text()).toContain("Message is set");

    $rootScope.$apply(() => {
      $rootScope.col = { two: true, one: false };
    });

    expect(element.text()).toContain("Message is set");

    $rootScope.$apply(() => {
      $rootScope.col = { three: true, two: false };
    });

    expect(element.text()).toContain("Message is set");

    $rootScope.$apply(() => {
      $rootScope.col = { three: false };
    });

    expect(element.text()).not.toContain("Message is set");
  });

  it("should allow a dynamic expression to be set when ng-message-exp is used", () => {
    element = $compile(
      '<div ng-messages="col">' +
        '  <div ng-message-exp="variable">Message is crazy</div>' +
        "</div>",
    )($rootScope);
    expect(element.text()).not.toContain("Message is crazy");

    $rootScope.$apply(() => {
      $rootScope.variable = "error";
      $rootScope.col = { error: true };
    });

    expect(element.text()).toContain("Message is crazy");

    $rootScope.$apply(() => {
      $rootScope.col = { error: false, failure: true };
    });

    expect(element.text()).not.toContain("Message is crazy");

    $rootScope.$apply(() => {
      $rootScope.variable = ["failure"];
    });

    expect(element.text()).toContain("Message is crazy");

    $rootScope.$apply(() => {
      $rootScope.variable = null;
    });

    expect(element.text()).not.toContain("Message is crazy");
  });

  it("should allow a dynamic expression to be set when the when-exp attribute is used", () => {
    element = $compile(
      '<ng-messages for="col">' +
        '  <ng-message when-exp="variable">Message is crazy</ng-message>' +
        "</ng-messages>",
    )($rootScope);
    expect(element.text()).not.toContain("Message is crazy");

    $rootScope.$apply(() => {
      $rootScope.variable = "error, failure";
      $rootScope.col = { error: true };
    });

    expect(element.text()).toContain("Message is crazy");

    $rootScope.$apply(() => {
      $rootScope.col = { error: false, failure: true };
    });

    expect(element.text()).toContain("Message is crazy");

    $rootScope.$apply(() => {
      $rootScope.variable = [];
    });

    expect(element.text()).not.toContain("Message is crazy");

    $rootScope.$apply(() => {
      $rootScope.variable = null;
    });

    expect(element.text()).not.toContain("Message is crazy");
  });

  // they(
  //   "should render empty when $prop is used as a collection value",
  //   {
  //     null: null,
  //     false: false,
  //     0: 0,
  //     "[]": [],
  //     "[{}]": [{}],
  //     "": "",
  //     "{ val2 : true }": { val2: true },
  //   },
  //   (prop) => {
  //     () => {
  //       element = $compile(
  //         '<div ng-messages="col">' +
  //           '  <div ng-message="val">Message is set</div>' +
  //           "</div>",
  //       )($rootScope);
  //       ;

  //       $rootScope.$apply(() => {
  //         $rootScope.col = prop;
  //       });
  //       expect(element.text()).not.toContain("Message is set");
  //     });
  //   },
  // );

  // they(
  //   "should insert and remove matching inner elements when $prop is used as a value",
  //   { true: true, 1: 1, "{}": {}, "[]": [], "[null]": [null] },
  //   (prop) => {
  //     () => {
  //       element = $compile(
  //         '<div ng-messages="col">' +
  //           '  <div ng-message="blue">This message is blue</div>' +
  //           '  <div ng-message="red">This message is red</div>' +
  //           "</div>",
  //       )($rootScope);

  //       $rootScope.$apply(() => {
  //         $rootScope.col = {};
  //       });

  //       expect(messageChildren(element).length).toBe(0);
  //       expect(trim(element.text())).toEqual("");

  //       $rootScope.$apply(() => {
  //         $rootScope.col = {
  //           blue: true,
  //           red: false,
  //         };
  //       });

  //       expect(messageChildren(element).length).toBe(1);
  //       expect(trim(element.text())).toEqual("This message is blue");

  //       $rootScope.$apply(() => {
  //         $rootScope.col = {
  //           red: prop,
  //         };
  //       });

  //       expect(messageChildren(element).length).toBe(1);
  //       expect(trim(element.text())).toEqual("This message is red");

  //       $rootScope.$apply(() => {
  //         $rootScope.col = null;
  //       });
  //       expect(messageChildren(element).length).toBe(0);
  //       expect(trim(element.text())).toEqual("");

  //       $rootScope.$apply(() => {
  //         $rootScope.col = {
  //           blue: 0,
  //           red: null,
  //         };
  //       });

  //       expect(messageChildren(element).length).toBe(0);
  //       expect(trim(element.text())).toEqual("");
  //     });
  //   },
  // );

  it("should display the elements in the order defined in the DOM", () => {
    element = $compile(
      '<div ng-messages="col">' +
        '  <div ng-message="one">Message#one</div>' +
        '  <div ng-message="two">Message#two</div>' +
        '  <div ng-message="three">Message#three</div>' +
        "</div>",
    )($rootScope);

    $rootScope.$apply(() => {
      $rootScope.col = {
        three: true,
        one: true,
        two: true,
      };
    });

    ["one", "two", "three"].forEach((key) => {
      expect(s(element.text())).toEqual(`Message#${key}`);

      $rootScope.$apply(() => {
        $rootScope.col[key] = false;
      });
    });

    expect(s(element.text())).toEqual("");
  });

  it("should add ng-active/ng-inactive CSS classes to the element when errors are/aren't displayed", () => {
    element = $compile(
      '<div ng-messages="col">' +
        '  <div ng-message="ready">This message is ready</div>' +
        "</div>",
    )($rootScope);

    $rootScope.$apply(() => {
      $rootScope.col = {};
    });

    expect(element[0].classList.contains("ng-active")).toBe(false);
    expect(element[0].classList.contains("ng-inactive")).toBe(true);

    $rootScope.$apply(() => {
      $rootScope.col = { ready: true };
    });

    expect(element[0].classList.contains("ng-active")).toBe(true);
    expect(element[0].classList.contains("ng-inactive")).toBe(false);
  });

  it("should automatically re-render the messages when other directives dynamically change them", () => {
    element = $compile(
      '<div ng-messages="col">' +
        '  <div ng-message="primary">Enter something</div>' +
        '  <div ng-repeat="item in items">' +
        '    <div ng-message-exp="item.name">{{ item.text }}</div>' +
        "  </div>" +
        "</div>",
    )($rootScope);

    $rootScope.$apply(() => {
      $rootScope.col = {};
      $rootScope.items = [
        { text: "Your age is incorrect", name: "age" },
        { text: "You're too tall man!", name: "height" },
        { text: "Your hair is too long", name: "hair" },
      ];
    });

    expect(messageChildren(element).length).toBe(0);
    expect(trim(element.text())).toEqual("");

    $rootScope.$apply(() => {
      $rootScope.col = { hair: true };
    });

    expect(messageChildren(element).length).toBe(1);
    expect(trim(element.text())).toEqual("Your hair is too long");

    $rootScope.$apply(() => {
      $rootScope.col = { age: true, hair: true };
    });

    expect(messageChildren(element).length).toBe(1);
    expect(trim(element.text())).toEqual("Your age is incorrect");

    $rootScope.$apply(() => {
      // remove the age!
      $rootScope.items.shift();
    });

    expect(messageChildren(element).length).toBe(1);
    expect(trim(element.text())).toEqual("Your hair is too long");

    $rootScope.$apply(() => {
      // remove the hair!
      $rootScope.items.length = 0;
      $rootScope.col.primary = true;
    });

    expect(messageChildren(element).length).toBe(1);
    expect(trim(element.text())).toEqual("Enter something");
  });

  it("should be compatible with ngBind", () => {
    element = $compile(
      '<div ng-messages="col">' +
        '        <div ng-message="required" ng-bind="errorMessages.required"></div>' +
        '        <div ng-message="extra" ng-bind="errorMessages.extra"></div>' +
        "</div>",
    )($rootScope);

    $rootScope.$apply(() => {
      $rootScope.col = {
        required: true,
        extra: true,
      };
      $rootScope.errorMessages = {
        required: "Fill in the text field.",
        extra: "Extra error message.",
      };
    });

    expect(messageChildren(element).length).toBe(1);
    expect(trim(element.text())).toEqual("Fill in the text field.");

    $rootScope.$apply(() => {
      $rootScope.col.required = false;
      $rootScope.col.extra = true;
    });

    expect(messageChildren(element).length).toBe(1);
    expect(trim(element.text())).toEqual("Extra error message.");

    $rootScope.$apply(() => {
      $rootScope.errorMessages.extra = "New error message.";
    });

    expect(messageChildren(element).length).toBe(1);
    expect(trim(element.text())).toEqual("New error message.");
  });

  // issue #12856
  it("should only detach the message object that is associated with the message node being removed", () => {
    // We are going to spy on the `leave` method to give us control over
    // when the element is actually removed
    //spyOn($animate, "leave");

    // Create a basic ng-messages set up
    element = $compile(
      '<div ng-messages="col">' +
        '  <div ng-message="primary">Enter something</div>' +
        "</div>",
    )($rootScope);

    // Trigger the message to be displayed
    $rootScope.col = { primary: true };
    expect(messageChildren(element).length).toEqual(1);
    const oldMessageNode = messageChildren(element)[0];

    // Remove the message
    $rootScope.col = { primary: undefined };
    // Since we have spied on the `leave` method, the message node is still in the DOM
    //expect($animate.leave).toHaveBeenCalled();
    // const nodeToRemove = $animate.leave.calls.mostRecent().args[0][0];
    // expect(nodeToRemove).toBe(oldMessageNode);

    // Add the message back in
    $rootScope.col = { primary: true };
    // Simulate the animation completing on the node
    // JQLite(nodeToRemove).remove();

    // We should not get another call to `leave`
    //expect($animate.leave).not.toHaveBeenCalled();

    // There should only be the new message node
    expect(messageChildren(element).length).toEqual(1);
    const newMessageNode = messageChildren(element)[0];
    expect(newMessageNode).not.toBe(oldMessageNode);
  });

  // it("should render animations when the active/inactive classes are added/removed", () => {
  //   // module("ngAnimate");
  //   // module("ngAnimateMock");
  //   element = $compile(
  //     '<div ng-messages="col">' +
  //       '  <div ng-message="ready">This message is ready</div>' +
  //       "</div>",
  //   )($rootScope);

  //   $rootScope.$apply(() => {
  //     $rootScope.col = {};
  //   });

  //   let event = $animate.queue.pop();
  //   expect(event.event).toBe("setClass");
  //   expect(event.args[1]).toBe("ng-inactive");
  //   expect(event.args[2]).toBe("ng-active");

  //   $rootScope.$apply(() => {
  //     $rootScope.col = { ready: true };
  //   });

  //   event = $animate.queue.pop();
  //   expect(event.event).toBe("setClass");
  //   expect(event.args[1]).toBe("ng-active");
  //   expect(event.args[2]).toBe("ng-inactive");
  // });

  describe("ngMessage nested nested inside elements", () => {
    it(
      "should not crash or leak memory when the messages are transcluded, the first message is " +
        "visible, and ngMessages is removed by ngIf",
      () => {
        element = $compile(
          '<div><div ng-if="show"><div message-wrap col="col">' +
            '        <div ng-message="a">A</div>' +
            '        <div ng-message="b">B</div>' +
            "</div></div></div>",
        )($rootScope);

        $rootScope.$apply(() => {
          $rootScope.show = true;
          $rootScope.col = {
            a: true,
            b: true,
          };
        });

        expect(messageChildren(element).length).toBe(1);
        expect(trim(element.text())).toEqual("A");

        $rootScope.$apply("show = false");

        expect(messageChildren(element).length).toBe(0);
      },
    );

    it("should not crash when the first of two nested messages is removed", () => {
      element = $compile(
        '<div ng-messages="col">' +
          '<div class="wrapper">' +
          '<div remove-me ng-message="a">A</div>' +
          '<div ng-message="b">B</div>' +
          "</div>" +
          "</div>",
      )($rootScope);

      $rootScope.$apply(() => {
        $rootScope.col = {
          a: true,
          b: false,
        };
      });

      expect(messageChildren(element).length).toBe(1);
      expect(trim(element.text())).toEqual("A");

      const ctrl = element.controller("ngMessages");
      const deregisterSpy = spyOn(ctrl, "deregister").and.callThrough();

      const nodeA = element[0].querySelector('[ng-message="a"]');
      JQLite(nodeA).remove(); // The next digest triggers the error
      // Make sure removing the element triggers the deregistration in ngMessages
      expect(trim(deregisterSpy.calls.mostRecent().args[0].nodeValue)).toBe("");
      expect(messageChildren(element).length).toBe(0);
    });

    it(
      "should not crash, but show deeply nested messages correctly after a message " +
        "has been removed",
      () => {
        element = $compile(
          '<div ng-messages="col" ng-messages-multiple>' +
            '<div class="another-wrapper">' +
            '<div ng-message="a">A</div>' +
            '<div class="wrapper">' +
            '<div ng-message="b">B</div>' +
            '<div ng-message="c">C</div>' +
            "</div>" +
            '<div ng-message="d">D</div>' +
            "</div>" +
            "</div>",
        )($rootScope);

        $rootScope.$apply(() => {
          $rootScope.col = {
            a: true,
            b: true,
          };
        });

        expect(messageChildren(element).length).toBe(2);
        expect(trim(element.text())).toEqual("AB");

        const ctrl = element.controller("ngMessages");
        const deregisterSpy = spyOn(ctrl, "deregister").and.callThrough();

        const nodeB = element[0].querySelector('[ng-message="b"]');
        JQLite(nodeB).remove(); // The next digest triggers the error
        // Make sure removing the element triggers the deregistration in ngMessages
        expect(trim(deregisterSpy.calls.mostRecent().args[0].nodeValue)).toBe(
          "",
        );
        expect(messageChildren(element).length).toBe(1);
        expect(trim(element.text())).toEqual("A");
      },
    );
  });

  it("should clean-up the ngMessage scope when a message is removed", () => {
    const html =
      '<div ng-messages="items">' +
      '<div ng-message="a">{{forA}}</div>' +
      "</div>";

    element = $compile(html)($rootScope);
    $rootScope.$apply(() => {
      $rootScope.forA = "A";
      $rootScope.items = { a: true };
    });

    expect(element.text()).toBe("A");
    const watchers = countWatchers($rootScope);

    $rootScope.$apply("items.a = false");

    expect(element.text()).toBe("");
    // We don't know exactly how many watchers are on the scope, only that there should be
    // one less now
    expect(countWatchers($rootScope)).toBe(watchers - 1);
  });

  it("should unregister the ngMessage even if it was never attached", () => {
    const html =
      '<div ng-messages="items">' +
      '<div ng-if="show"><div ng-message="x">ERROR</div></div>' +
      "</div>";

    element = $compile(html)($rootScope);

    const ctrl = element.controller("ngMessages");

    expect(messageChildren(element).length).toBe(0);
    expect(Object.keys(ctrl.messages).length).toEqual(0);

    $rootScope.$apply("show = true");
    expect(messageChildren(element).length).toBe(0);
    expect(Object.keys(ctrl.messages).length).toEqual(1);

    $rootScope.$apply("show = false");
    expect(messageChildren(element).length).toBe(0);
    expect(Object.keys(ctrl.messages).length).toEqual(0);
  });

  describe("default message", () => {
    it("should render a default message when no message matches", () => {
      element = $compile(
        '<div ng-messages="col">' +
          '  <div ng-message="val">Message is set</div>' +
          "  <div ng-message-default>Default message is set</div>" +
          "</div>",
      )($rootScope);
      $rootScope.$apply(() => {
        $rootScope.col = { unexpected: false };
      });

      expect(element.text().trim()).toBe("");
      expect(element[0].classList.contains("ng-active")).toBeFalse();

      $rootScope.$apply(() => {
        $rootScope.col = { unexpected: true };
      });

      expect(element.text().trim()).toBe("Default message is set");
      expect(element[0].classList.contains("ng-active")).toBeTrue();

      $rootScope.$apply(() => {
        $rootScope.col = { unexpected: false };
      });

      expect(element.text().trim()).toBe("");
      expect(element[0].classList.contains("ng-active")).toBeFalse();

      $rootScope.$apply(() => {
        $rootScope.col = { val: true, unexpected: true };
      });

      expect(element.text().trim()).toBe("Message is set");
      expect(element[0].classList.contains("ng-active")).toBeTrue();
    });

    it("should not render a default message with ng-messages-multiple if another error matches", () => {
      element = $compile(
        '<div ng-messages="col" ng-messages-multiple>' +
          '  <div ng-message="val">Message is set</div>' +
          '  <div ng-message="other">Other message is set</div>' +
          "  <div ng-message-default>Default message is set</div>" +
          "</div>",
      )($rootScope);

      expect(element.text().trim()).toBe("");

      $rootScope.$apply(() => {
        $rootScope.col = { val: true, other: false, unexpected: false };
      });

      expect(element.text().trim()).toBe("Message is set");

      $rootScope.$apply(() => {
        $rootScope.col = { val: true, other: true, unexpected: true };
      });

      expect(element.text().trim()).toBe(
        "Message is set  Other message is set",
      );

      $rootScope.$apply(() => {
        $rootScope.col = { val: false, other: false, unexpected: true };
      });

      expect(element.text().trim()).toBe("Default message is set");
    });

    it("should handle a default message with ngIf", () => {
      element = $compile(
        '<div ng-messages="col">' +
          '  <div ng-message="val">Message is set</div>' +
          '  <div ng-if="default" ng-message-default>Default message is set</div>' +
          "</div>",
      )($rootScope);
      $rootScope.default = true;
      $rootScope.col = { unexpected: true };
      expect(element.text().trim()).toBe("Default message is set");

      $rootScope.$apply("default = false");

      expect(element.text().trim()).toBe("");

      $rootScope.$apply("default = true");

      expect(element.text().trim()).toBe("Default message is set");

      $rootScope.$apply(() => {
        $rootScope.col = { val: true };
      });

      expect(element.text().trim()).toBe("Message is set");
    });
  });

  describe("when including templates", () => {
    // they(
    //   "should work with a dynamic collection model which is managed by ngRepeat",
    //   {
    //     '<div ng-messages-include="...">':
    //       '<div ng-messages="item">' +
    //       '<div ng-messages-include="abc.html"></div>' +
    //       "</div>",
    //     '<ng-messages-include src="...">':
    //       '<ng-messages for="item">' +
    //       '<ng-messages-include src="abc.html"></ng-messages-include>' +
    //       "</ng-messages>",
    //   },
    //   (html) => {
    //     inject(($compile, $rootScope, $templateCache) => {
    //       $templateCache.set(
    //         "abc.html",
    //         '<div ng-message="a">A</div>' +
    //           '<div ng-message="b">B</div>' +
    //           '<div ng-message="c">C</div>',
    //       );

    //       html = `<div><div ng-repeat="item in items">${html}</div></div>`;
    //       $rootScope.items = [{}, {}, {}];

    //       element = $compile(html)($rootScope);
    //       $rootScope.$apply(() => {
    //         $rootScope.items[0].a = true;
    //         $rootScope.items[1].b = true;
    //         $rootScope.items[2].c = true;
    //       });

    //       const elements = element[0].querySelectorAll("[ng-repeat]");

    //       // all three collections should have at least one error showing up
    //       expect(messageChildren(element).length).toBe(3);
    //       expect(messageChildren(elements[0]).length).toBe(1);
    //       expect(messageChildren(elements[1]).length).toBe(1);
    //       expect(messageChildren(elements[2]).length).toBe(1);

    //       // this is the standard order of the displayed error messages
    //       expect(element.text().trim()).toBe("ABC");

    //       $rootScope.$apply(() => {
    //         $rootScope.items[0].a = false;
    //         $rootScope.items[0].c = true;

    //         $rootScope.items[1].b = false;

    //         $rootScope.items[2].c = false;
    //         $rootScope.items[2].a = true;
    //       });

    //       // with the 2nd item gone and the values changed
    //       // we should see both 1 and 3 changed
    //       expect(element.text().trim()).toBe("A");

    //       $rootScope.$apply(() => {
    //         // add the value for the 2nd item back
    //         $rootScope.items[1].b = true;
    //         $rootScope.items.reverse();
    //       });

    //       // when reversed we get back to our original value
    //       expect(element.text().trim()).toBe("ABC");
    //     });
    //   },
    // );

    // they(
    //   "should remove the $prop element and place a comment anchor node where it used to be",
    //   {
    //     '<div ng-messages-include="...">':
    //       '<div ng-messages="data">' +
    //       '<div ng-messages-include="abc.html"></div>' +
    //       "</div>",
    //     '<ng-messages-include src="...">':
    //       '<ng-messages for="data">' +
    //       '<ng-messages-include src="abc.html"></ng-messages-include>' +
    //       "</ng-messages>",
    //   },
    //   (html) => {
    //     inject(($compile, $rootScope, $templateCache) => {
    //       $templateCache.set("abc.html", "<div></div>");

    //       element = $compile(html)($rootScope);
    //       ;

    //       const includeElement = element[0].querySelector(
    //         "[ng-messages-include], ng-messages-include",
    //       );
    //       expect(includeElement).toBeFalsy();

    //       const comment = element[0].childNodes[0];
    //       expect(comment.nodeType).toBe(8);
    //       expect(comment.nodeValue).toBe(" ngMessagesInclude: abc.html ");
    //     });
    //   },
    // );

    // they(
    //   "should load a remote template using $prop",
    //   {
    //     '<div ng-messages-include="...">':
    //       '<div ng-messages="data">' +
    //       '<div ng-messages-include="abc.html"></div>' +
    //       "</div>",
    //     '<ng-messages-include src="...">':
    //       '<ng-messages for="data">' +
    //       '<ng-messages-include src="abc.html"></ng-messages-include>' +
    //       "</ng-messages>",
    //   },
    //   (html) => {
    //     inject(($compile, $rootScope, $templateCache) => {
    //       $templateCache.set(
    //         "abc.html",
    //         '<div ng-message="a">A</div>' +
    //           '<div ng-message="b">B</div>' +
    //           '<div ng-message="c">C</div>',
    //       );

    //       element = $compile(html)($rootScope);
    //       $rootScope.$apply(() => {
    //         $rootScope.data = {
    //           a: 1,
    //           b: 2,
    //           c: 3,
    //         };
    //       });

    //       expect(messageChildren(element).length).toBe(1);
    //       expect(trim(element.text())).toEqual("A");

    //       $rootScope.$apply(() => {
    //         $rootScope.data = {
    //           c: 3,
    //         };
    //       });

    //       expect(messageChildren(element).length).toBe(1);
    //       expect(trim(element.text())).toEqual("C");
    //     });
    //   },
    // );

    it("should cache the template after download", () => {
      expect($templateCache.get("/mock/hello")).toBeUndefined();
      element = $compile(
        '<div ng-messages="data"><div ng-messages-include="/mock/hello"></div></div>',
      )($rootScope);

      expect($templateCache.get("/mock/hello")).toBeDefined();
    });

    it("should re-render the messages after download without an extra digest", (done) => {
      element = $compile(
        '<div ng-messages="data">' +
          '  <div ng-messages-include="/mock/my-messages"></div>' +
          '  <div ng-message="failed">Your value is that of failure</div>' +
          "</div>",
      )($rootScope);
      $rootScope.data = {
        required: true,
        failed: true,
      };

      expect(messageChildren(element).length).toBe(1);
      expect(trim(element.text())).toEqual("Your value is that of failure");

      setTimeout(() => {
        expect(messageChildren(element).length).toBe(1);
        expect(trim(element.text())).toEqual("You did not enter a value");
        done();
      }, 10);
    });

    it("should allow for overriding the remote template messages within the element depending on where the remote template is placed", () => {
      $templateCache.set(
        "abc.html",
        '<div ng-message="a">A</div>' +
          '<div ng-message="b">B</div>' +
          '<div ng-message="c">C</div>',
      );

      element = $compile(
        '<div ng-messages="data">' +
          '  <div ng-message="a">AAA</div>' +
          '  <div ng-messages-include="abc.html"></div>' +
          '  <div ng-message="c">CCC</div>' +
          "</div>",
      )($rootScope);

      $rootScope.$apply(() => {
        $rootScope.data = {
          a: 1,
          b: 2,
          c: 3,
        };
      });

      expect(messageChildren(element).length).toBe(1);
      expect(trim(element.text())).toEqual("AAA");

      $rootScope.$apply(() => {
        $rootScope.data = {
          b: 2,
          c: 3,
        };
      });

      expect(messageChildren(element).length).toBe(1);
      expect(trim(element.text())).toEqual("B");

      $rootScope.$apply(() => {
        $rootScope.data = {
          c: 3,
        };
      });

      expect(messageChildren(element).length).toBe(1);
      expect(trim(element.text())).toEqual("C");
    });

    // it("should properly detect a previous message, even if it was registered later", () => {
    //   $templateCache.set("include.html", '<div ng-message="a">A</div>');
    //   const html =
    //     '<div ng-messages="items">' +
    //     "<div ng-include=\"'include.html'\"></div>" +
    //     '<div ng-message="b">B</div>' +
    //     '<div ng-message="c">C</div>' +
    //     "</div>";

    //   element = $compile(html)($rootScope);
    //   $rootScope.$apply("items = {b: true, c: true}");

    //   expect(element.text()).toBe("B");

    //   const ctrl = element.controller("ngMessages");
    //   const deregisterSpy = spyOn(ctrl, "deregister").and.callThrough();

    //   const nodeB = element[0].querySelector('[ng-message="b"]');
    //   JQLite(nodeB).remove();

    //   // Make sure removing the element triggers the deregistration in ngMessages
    //   expect(trim(deregisterSpy.calls.mostRecent().args[0].nodeValue)).toBe(
    //     "ngMessage: b",
    //   );

    //   $rootScope.$apply("items.a = true");

    //   expect(element.text()).toBe("A");
    // });

    it("should not throw if the template is empty", () => {
      const html =
        '<div ng-messages="items">' +
        '<div ng-messages-include="messages1.html"></div>' +
        '<div ng-messages-include="messages2.html"></div>' +
        "</div>";

      $templateCache.set("messages1.html", "");
      $templateCache.set("messages2.html", "   ");
      element = $compile(html)($rootScope);
      expect(element.text()).toBe("");
      expect(element[0].childNodes.length).toBe(2);
    });
  });

  describe("when multiple", () => {
    // they(
    //   "should show all truthy messages when the $prop attr is present",
    //   { multiple: "multiple", "ng-messages-multiple": "ng-messages-multiple" },
    //   (prop) => {
    //     () => {
    //       element = $compile(
    //         `<div ng-messages="data" ${prop}>` +
    //           `  <div ng-message="one">1</div>` +
    //           `  <div ng-message="two">2</div>` +
    //           `  <div ng-message="three">3</div>` +
    //           `</div>`,
    //       )($rootScope);

    //       $rootScope.$apply(() => {
    //         $rootScope.data = {
    //           one: true,
    //           two: false,
    //           three: true,
    //         };
    //       });

    //       expect(messageChildren(element).length).toBe(2);
    //       expect(s(element.text())).toContain("13");
    //     });
    //   },
    // );

    it("should render all truthy messages from a remote template", () => {
      $templateCache.set(
        "xyz.html",
        '<div ng-message="x">X</div>' +
          '<div ng-message="y">Y</div>' +
          '<div ng-message="z">Z</div>',
      );

      element = $compile(
        '<div ng-messages="data" ng-messages-multiple="true">' +
          '<div ng-messages-include="xyz.html"></div>' +
          "</div>",
      )($rootScope);

      $rootScope.$apply(() => {
        $rootScope.data = {
          x: "a",
          y: null,
          z: true,
        };
      });

      expect(messageChildren(element).length).toBe(2);
      expect(s(element.text())).toEqual("XZ");

      $rootScope.$apply(() => {
        $rootScope.data.y = {};
      });

      expect(messageChildren(element).length).toBe(3);
      expect(s(element.text())).toEqual("XYZ");
    });

    it("should render and override all truthy messages from a remote template", () => {
      $templateCache.set(
        "xyz.html",
        '<div ng-message="x">X</div>' +
          '<div ng-message="y">Y</div>' +
          '<div ng-message="z">Z</div>',
      );

      element = $compile(
        '<div ng-messages="data" ng-messages-multiple="true">' +
          '<div ng-message="y">YYY</div>' +
          '<div ng-message="z">ZZZ</div>' +
          '<div ng-messages-include="xyz.html"></div>' +
          "</div>",
      )($rootScope);

      $rootScope.$apply(() => {
        $rootScope.data = {
          x: "a",
          y: null,
          z: true,
        };
      });

      expect(messageChildren(element).length).toBe(2);
      expect(s(element.text())).toEqual("ZZZX");

      $rootScope.$apply(() => {
        $rootScope.data.y = {};
      });

      expect(messageChildren(element).length).toBe(3);
      expect(s(element.text())).toEqual("YYYZZZX");
    });
  });
});
