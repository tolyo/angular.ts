import { Angular } from "../../loader";
import { dealoc } from "../../shared/jqlite/jqlite";

describe("ngSwitch", () => {
  let $scope;
  let $compile;
  let element;
  let $timeout;

  beforeEach(() => {
    window.angular = new Angular();
    window.angular.module("test", []);
    let injector = window.angular.bootstrap(
      document.getElementById("dummy", ["test"]),
    );
    injector.invoke(($rootScope, _$compile_, _$timeout_) => {
      $scope = $rootScope.$new();
      $compile = _$compile_;
      $timeout = _$timeout_;
    });
  });

  afterEach(() => {
    dealoc(element);
  });

  it("should switch on value change", () => {
    element = $compile(
      '<div ng-switch="select">' +
        '<div ng-switch-when="1">first:{{name}}</div>' +
        '<div ng-switch-when="2">second:{{name}}</div>' +
        '<div ng-switch-when="true">true:{{name}}</div>' +
        "</div>",
    )($scope);
    expect(element[0].innerHTML).toEqual("<!----><!----><!---->");
    $scope.select = 1;
    await wait();
    expect(element.text()).toEqual("first:");
    $scope.name = "shyam";
    await wait();
    expect(element.text()).toEqual("first:shyam");
    $scope.select = 2;
    await wait();
    expect(element.text()).toEqual("second:shyam");
    $scope.name = "misko";
    await wait();
    expect(element.text()).toEqual("second:misko");
    $scope.select = true;
    await wait();
    expect(element.text()).toEqual("true:misko");
  });

  it("should show all switch-whens that match the current value", () => {
    element = $compile(
      '<ul ng-switch="select">' +
        '<li ng-switch-when="1">first:{{name}}</li>' +
        '<li ng-switch-when="1">, first too:{{name}}</li>' +
        '<li ng-switch-when="2">second:{{name}}</li>' +
        '<li ng-switch-when="true">true:{{name}}</li>' +
        "</ul>",
    )($scope);
    expect(element[0].innerHTML).toEqual("<!----><!----><!----><!---->");
    $scope.select = 1;
    await wait();
    expect(element.text()).toEqual("first:, first too:");
    $scope.name = "shyam";
    await wait();
    expect(element.text()).toEqual("first:shyam, first too:shyam");

    $scope.select = 2;
    await wait();
    expect(element.text()).toEqual("second:shyam");
    $scope.name = "misko";
    await wait();
    expect(element.text()).toEqual("second:misko");

    $scope.select = true;
    await wait();
    expect(element.text()).toEqual("true:misko");
  });

  it("should show all elements between start and end markers that match the current value", () => {
    element = $compile(
      '<ul ng-switch="select">' +
        '<li ng-switch-when-start="1">A</li>' +
        "<li>B</li>" +
        "<li ng-switch-when-end>C</li>" +
        '<li ng-switch-when-start="2">D</li>' +
        "<li>E</li>" +
        "<li ng-switch-when-end>F</li>" +
        "</ul>",
    )($scope);

    $scope.$apply('select = "1"');
    expect(element.find("li").length).toBe(3);
    expect(element.find("li").eq(0).text()).toBe("A");
    expect(element.find("li").eq(1).text()).toBe("B");
    expect(element.find("li").eq(2).text()).toBe("C");

    $scope.$apply('select = "2"');
    expect(element.find("li").length).toBe(3);
    expect(element.find("li").eq(0).text()).toBe("D");
    expect(element.find("li").eq(1).text()).toBe("E");
    expect(element.find("li").eq(2).text()).toBe("F");
  });

  it("should switch on switch-when-default", () => {
    element = $compile(
      '<ng-switch on="select">' +
        '<div ng-switch-when="1">one</div>' +
        "<div ng-switch-default>other</div>" +
        "</ng-switch>",
    )($scope);
    await wait();
    expect(element.text()).toEqual("other");
    $scope.select = 1;
    await wait();
    expect(element.text()).toEqual("one");
  });

  it("should show all default elements between start and end markers when no match", () => {
    element = $compile(
      '<ul ng-switch="select">' +
        '<li ng-switch-when-start="1">A</li>' +
        "<li>B</li>" +
        "<li ng-switch-when-end>C</li>" +
        "<li ng-switch-default-start>D</li>" +
        "<li>E</li>" +
        "<li ng-switch-default-end>F</li>" +
        "</ul>",
    )($scope);

    $scope.$apply('select = "1"');
    expect(element.find("li").length).toBe(3);
    expect(element.find("li").eq(0).text()).toBe("A");
    expect(element.find("li").eq(1).text()).toBe("B");
    expect(element.find("li").eq(2).text()).toBe("C");

    $scope.$apply('select = "2"');
    expect(element.find("li").length).toBe(3);
    expect(element.find("li").eq(0).text()).toBe("D");
    expect(element.find("li").eq(1).text()).toBe("E");
    expect(element.find("li").eq(2).text()).toBe("F");
  });

  it("should show all switch-when-default", () => {
    element = $compile(
      '<ul ng-switch="select">' +
        '<li ng-switch-when="1">one</li>' +
        "<li ng-switch-default>other</li>" +
        "<li ng-switch-default>, other too</li>" +
        "</ul>",
    )($scope);
    await wait();
    expect(element.text()).toEqual("other, other too");
    $scope.select = 1;
    await wait();
    expect(element.text()).toEqual("one");
  });

  it("should always display the elements that do not match a switch", () => {
    element = $compile(
      '<ul ng-switch="select">' +
        "<li>always </li>" +
        '<li ng-switch-when="1">one </li>' +
        '<li ng-switch-when="2">two </li>' +
        "<li ng-switch-default>other, </li>" +
        "<li ng-switch-default>other too </li>" +
        "</ul>",
    )($scope);
    await wait();
    expect(element.text()).toEqual("always other, other too ");
    $scope.select = 1;
    await wait();
    expect(element.text()).toEqual("always one ");
  });

  it(
    "should display the elements that do not have ngSwitchWhen nor " +
      "ngSwitchDefault at the position specified in the template, when the " +
      "first and last elements in the ngSwitch body do not have a ngSwitch* " +
      "directive",
    () => {
      element = $compile(
        '<ul ng-switch="select">' +
          "<li>1</li>" +
          '<li ng-switch-when="1">2</li>' +
          "<li>3</li>" +
          '<li ng-switch-when="2">4</li>' +
          "<li ng-switch-default>5</li>" +
          "<li>6</li>" +
          "<li ng-switch-default>7</li>" +
          "<li>8</li>" +
          "</ul>",
      )($scope);
      await wait();
      expect(element.text()).toEqual("135678");
      $scope.select = 1;
      await wait();
      expect(element.text()).toEqual("12368");
    },
  );

  it(
    "should display the elements that do not have ngSwitchWhen nor " +
      "ngSwitchDefault at the position specified in the template when the " +
      "first and last elements in the ngSwitch have a ngSwitch* directive",
    () => {
      element = $compile(
        '<ul ng-switch="select">' +
          '<li ng-switch-when="1">2</li>' +
          "<li>3</li>" +
          '<li ng-switch-when="2">4</li>' +
          "<li ng-switch-default>5</li>" +
          "<li>6</li>" +
          "<li ng-switch-default>7</li>" +
          "</ul>",
      )($scope);
      await wait();
      expect(element.text()).toEqual("3567");
      $scope.select = 1;
      await wait();
      expect(element.text()).toEqual("236");
    },
  );

  it("should properly create and destroy child scopes", () => {
    element = $compile(
      '<ng-switch on="url"><div ng-switch-when="a">{{name}}</div></ng-switch>',
    )($scope);
    await wait();

    expect($scope.$$childHead).toBeNull();

    $scope.url = "a";
    await wait();
    const child1 = $scope.$$childHead;
    expect(child1).toBeDefined();
    spyOn(child1, "$destroy");

    $scope.url = "x";
    await wait();

    // NOTE THAT THE CHILD SCOPE IS NOT ACTUALLY DESTROYED.
    expect(child1).toBeDefined();
    expect(child1.$destroy).toHaveBeenCalled();

    $scope.url = "a";
    await wait();
    // ... BUT A NEW CHILD SCOPE WILL BE CREATED IN A TAIL.
    const child2 = $scope.$$childTail;
    expect(child2).toBeDefined();
    expect(child2).not.toBe(child1);
  });

  it("should interoperate with other transclusion directives like ngRepeat", () => {
    element = $compile(
      '<div ng-switch="value">' +
        '<div ng-switch-when="foo" ng-repeat="foo in foos">{{value}}:{{foo}}|</div>' +
        '<div ng-switch-default ng-repeat="bar in bars">{{value}}:{{bar}}|</div>' +
        "</div>",
    )($scope);
    $scope.$apply('value="foo";foos=["one", "two"]');
    expect(element.text()).toEqual("foo:one|foo:two|");

    $scope.$apply('value="foo";foos=["one"]');
    expect(element.text()).toEqual("foo:one|");

    $scope.$apply('value="foo";foos=["one","two","three"]');
    expect(element.text()).toEqual("foo:one|foo:two|foo:three|");

    $scope.$apply('value="bar";bars=["up", "down"]');
    expect(element.text()).toEqual("bar:up|bar:down|");

    $scope.$apply('value="bar";bars=["up", "down", "forwards", "backwards"]');
    expect(element.text()).toEqual(
      "bar:up|bar:down|bar:forwards|bar:backwards|",
    );
  });

  it("should not leak jq data when compiled but not attached to parent when parent is destroyed", () => {
    element = $compile(
      '<div ng-repeat="i in []">' +
        '<ng-switch on="url">' +
        '<div ng-switch-when="a">{{name}}</div>' +
        "</ng-switch>" +
        "</div>",
    )($scope);
    await wait();

    // element now contains only empty repeater. this element is deallocated by local afterEach.
    // afterwards a global afterEach will check for leaks in jq data cache object
  });

  it("should properly support case labels with different numbers of transclude fns", () => {
    element = $compile(
      '<div ng-switch="mode">' +
        '<p ng-switch-when="a">Block1</p>' +
        '<p ng-switch-when="a">Block2</p>' +
        '<a href ng-switch-when="b">a</a>' +
        "</div>",
    )($scope);

    $scope.$apply('mode = "a"');
    expect(element.children().length).toBe(2);

    $scope.$apply('mode = "b"');
    expect(element.children().length).toBe(1);

    $scope.$apply('mode = "a"');
    expect(element.children().length).toBe(2);

    $scope.$apply('mode = "b"');
    expect(element.children().length).toBe(1);
  });

  it("should not trigger a digest after an element is removed", () => {
    const spy = spyOn($scope, "$digest").and.callThrough();

    $scope.select = 1;
    element = $compile(
      '<div ng-switch="select">' +
        '<div ng-switch-when="1">first</div>' +
        '<div ng-switch-when="2">second</div>' +
        "</div>",
    )($scope);
    await wait();

    expect(element.text()).toEqual("first");

    $scope.select = 2;
    await wait();
    spy.calls.reset();
    expect(element.text()).toEqual("second");
    // If ngSwitch re-introduces code that triggers a digest after an element is removed (in an
    // animation .then callback), flushing the queue ensures the callback will be called, and the test
    // fails

    expect(spy).not.toHaveBeenCalled();
    // A digest may have been triggered asynchronously, so check the queue
    //$timeout.verifyNoPendingTasks();
  });

  it("should handle changes to the switch value in a digest loop with multiple value matches", () => {
    const scope = $scope.$new();
    scope.value = "foo";

    scope.$watch("value", () => {
      if (scope.value === "bar") {
        scope.$evalAsync(() => {
          scope.value = "baz";
        });
      }
    });

    element = $compile(
      '<div ng-switch="value">' +
        '<div ng-switch-when="foo">FOO 1</div>' +
        '<div ng-switch-when="foo">FOO 2</div>' +
        '<div ng-switch-when="bar">BAR</div>' +
        '<div ng-switch-when="baz">BAZ</div>' +
        "</div>",
    )(scope);

    scope.$apply();
    expect(element.text()).toBe("FOO 1FOO 2");

    scope.$apply('value = "bar"');
    expect(element.text()).toBe("BAZ");
  });

  describe("ngSwitchWhen separator", () => {
    it("should be possible to define a separator", () => {
      element = $compile(
        '<div ng-switch="mode">' +
          '<p ng-switch-when="a|b" ng-switch-when-separator="|">Block1|</p>' +
          '<p ng-switch-when="a">Block2|</p>' +
          "<p ng-switch-default>Block3|</div>" +
          "</div>",
      )($scope);

      $scope.$apply('mode = "a"');
      expect(element.children().length).toBe(2);
      expect(element.text()).toBe("Block1|Block2|");
      $scope.$apply('mode = "b"');

      expect(element.children().length).toBe(1);
      expect(element.text()).toBe("Block1|");
      $scope.$apply('mode = "c"');

      expect(element.children().length).toBe(1);
      expect(element.text()).toBe("Block3|");
    });

    it("should be possible to use a separator at the end of the value", () => {
      element = $compile(
        '<div ng-switch="mode">' +
          '<p ng-switch-when="a|b|" ng-switch-when-separator="|">Block1|</p>' +
          '<p ng-switch-when="a">Block2|</p>' +
          "<p ng-switch-default>Block3|</div>" +
          "</div>",
      )($scope);

      $scope.$apply('mode = "a"');
      expect(element.children().length).toBe(2);
      expect(element.text()).toBe("Block1|Block2|");
      $scope.$apply('mode = ""');

      expect(element.children().length).toBe(1);
      expect(element.text()).toBe("Block1|");
      $scope.$apply('mode = "c"');

      expect(element.children().length).toBe(1);
      expect(element.text()).toBe("Block3|");
    });

    it("should be possible to use the empty string as a separator", () => {
      element = $compile(
        '<div ng-switch="mode">' +
          '<p ng-switch-when="ab" ng-switch-when-separator="">Block1|</p>' +
          '<p ng-switch-when="a">Block2|</p>' +
          "<p ng-switch-default>Block3|</div>" +
          "</div>",
      )($scope);

      $scope.$apply('mode = "a"');
      expect(element.children().length).toBe(2);
      expect(element.text()).toBe("Block1|Block2|");
      $scope.$apply('mode = "b"');

      expect(element.children().length).toBe(1);
      expect(element.text()).toBe("Block1|");
      $scope.$apply('mode = "c"');

      expect(element.children().length).toBe(1);
      expect(element.text()).toBe("Block3|");
    });

    it("should be possible to use separators that are multiple characters long", () => {
      element = $compile(
        '<div ng-switch="mode">' +
          '<p ng-switch-when="a||b|a" ng-switch-when-separator="||">Block1|</p>' +
          '<p ng-switch-when="a">Block2|</p>' +
          "<p ng-switch-default>Block3|</div>" +
          "</div>",
      )($scope);

      $scope.$apply('mode = "a"');
      expect(element.children().length).toBe(2);
      expect(element.text()).toBe("Block1|Block2|");
      $scope.$apply('mode = "b|a"');

      expect(element.children().length).toBe(1);
      expect(element.text()).toBe("Block1|");
      $scope.$apply('mode = "c"');

      expect(element.children().length).toBe(1);
      expect(element.text()).toBe("Block3|");
    });

    it("should ignore multiple appearances of the same item", () => {
      element = $compile(
        '<div ng-switch="mode">' +
          '<p ng-switch-when="a|b|a" ng-switch-when-separator="|">Block1|</p>' +
          '<p ng-switch-when="a">Block2|</p>' +
          "<p ng-switch-default>Block3|</div>" +
          "</div>",
      )($scope);

      $scope.$apply('mode = "a"');
      expect(element.children().length).toBe(2);
      expect(element.text()).toBe("Block1|Block2|");
      $scope.$apply('mode = "b"');

      expect(element.children().length).toBe(1);
      expect(element.text()).toBe("Block1|");
      $scope.$apply('mode = "c"');

      expect(element.children().length).toBe(1);
      expect(element.text()).toBe("Block3|");
    });
  });
});

// describe("ngSwitch animation", () => {
//   let body;
//   let element;
//   let $rootElement;

//   function html(content) {
//     $rootElement[0].innerHTML = content;
//     element = $rootElement.children().eq(0);
//     return element;
//   }

//   beforeEach(
//     module(
//       () =>
//         // we need to run animation on attached elements;
//         function (_$rootElement_) {
//           $rootElement = _$rootElement_;
//           body = JQLite(document.body);
//           body.append($rootElement);
//         },
//     ),
//   );

//   afterEach(() => {
//     dealoc(body);
//     dealoc(element);
//   });

//   describe("behavior", () => {
//     it("should destroy the previous leave animation if a new one takes place", () => {
//       module("ngAnimate");
//       module(($animateProvider) => {
//         $animateProvider.register(".long-leave", () => ({
//           leave(element, done) {
//             // do nothing at all
//           },
//         }));
//       });
//       () => {
//         // inejct $compile, $scope, $animate, $templateCache
//         let item;
//         const $scope = $rootScope.$new();
//         element = $compile(
//           html(
//             '<div ng-switch="inc">' +
//               '<div ng-switch-when="one">one</div>' +
//               '<div ng-switch-when="two">two</div>' +
//               "</div>",
//           ),
//         )($scope);

//         $scope.$apply('inc = "one"');

//         let destroyed;
//         const inner = element.children(0);
//         inner.on("$destroy", () => {
//           destroyed = true;
//         });

//         $scope.$apply('inc = "two"');

//         $scope.$apply('inc = "one"');

//         expect(destroyed).toBe(true);
//       };
//     });
//   });

//   describe("events", () => {
//     beforeEach(module("ngAnimateMock"));

//     it("should fire off the enter animation", inject((
//       $compile,
//       $rootScope,
//       $animate,
//     ) => {
//       let item;
//       const $scope = $rootScope.$new();
//       element = $compile(
//         html(
//           '<div ng-switch on="val">' +
//             '<div ng-switch-when="one">one</div>' +
//             '<div ng-switch-when="two">two</div>' +
//             '<div ng-switch-when="three">three</div>' +
//             "</div>",
//         ),
//       )($scope);

//       ; // re-enable the animations;
//       $scope.val = "one";
//       ;

//       item = $animate.queue.shift();
//       expect(item.event).toBe("enter");
//       expect(item.element.text()).toBe("one");
//     }));

//     it("should fire off the leave animation", inject((
//       $compile,
//       $rootScope,
//       $animate,
//     ) => {
//       let item;
//       const $scope = $rootScope.$new();
//       element = $compile(
//         html(
//           '<div ng-switch on="val">' +
//             '<div ng-switch-when="one">one</div>' +
//             '<div ng-switch-when="two">two</div>' +
//             '<div ng-switch-when="three">three</div>' +
//             "</div>",
//         ),
//       )($scope);

//       ; // re-enable the animations;
//       $scope.val = "two";
//       ;

//       item = $animate.queue.shift();
//       expect(item.event).toBe("enter");
//       expect(item.element.text()).toBe("two");

//       $scope.val = "three";
//       ;

//       item = $animate.queue.shift();
//       expect(item.event).toBe("leave");
//       expect(item.element.text()).toBe("two");

//       item = $animate.queue.shift();
//       expect(item.event).toBe("enter");
//       expect(item.element.text()).toBe("three");
//     }));

//     it("should work with svg elements when the svg container is transcluded", () => {
//       module(($compileProvider) => {
//         $compileProvider.directive("svgContainer", () => ({
//           template: "<svg ng-transclude></svg>",
//           replace: true,
//           transclude: true,
//         }));
//       });
//       inject(($compile, $rootScope) => {
//         element = $compile(
//           '<svg-container ng-switch="inc"><circle ng-switch-when="one"></circle>' +
//             "</svg-container>",
//         )($rootScope);
//         $rootScope.inc = "one";
//         await wait();

//         const circle = element.find("circle");
//         expect(circle[0].toString()).toMatch(/SVG/);
//       });
//     });
//   });
// });
