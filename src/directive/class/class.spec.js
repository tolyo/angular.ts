import { dealoc, JQLite } from "../../shared/jqlite/jqlite.js";
import { Angular } from "../../loader.js";
import { wait } from "../../shared/test-utils.js";

describe("ngClass", () => {
  let element;
  let $compile;
  let $rootScope;
  let injector;

  beforeEach(() => {
    window.angular = new Angular();
    window.angular.module("test", []);
    injector = window.angular.bootstrap(document.getElementById("dummy"), [
      "test",
    ]);
    $compile = injector.get("$compile");
    $rootScope = injector.get("$rootScope");
  });

  afterEach(() => {
    dealoc(element);
  });

  it("should add new and remove old classes dynamically", async () => {
    element = $compile('<div class="existing" ng-class="dynClass"></div>')(
      $rootScope,
    );
    $rootScope.dynClass = "A";
    await wait();
    expect(element[0].classList.contains("existing")).toBe(true);
    expect(element[0].classList.contains("A")).toBe(true);

    $rootScope.dynClass = "B";
    await wait();
    expect(element[0].classList.contains("existing")).toBe(true);
    expect(element[0].classList.contains("A")).toBe(false);
    expect(element[0].classList.contains("B")).toBe(true);

    delete $rootScope.dynClass;
    await wait();
    expect(element[0].classList.contains("existing")).toBe(true);
    expect(element[0].classList.contains("A")).toBe(false);
    expect(element[0].classList.contains("B")).toBe(false);
  });

  it("should add new and remove old classes with same names as Object.prototype properties dynamically", async () => {
    element = $compile('<div class="existing" ng-class="dynClass"></div>')(
      $rootScope,
    );
    $rootScope.dynClass = {
      watch: true,
      hasOwnProperty: true,
      isPrototypeOf: true,
    };
    await wait();
    expect(element[0].classList.contains("existing")).toBe(true);
    expect(element[0].classList.contains("watch")).toBe(true);
    expect(element[0].classList.contains("hasOwnProperty")).toBe(true);
    expect(element[0].classList.contains("isPrototypeOf")).toBe(true);

    $rootScope.dynClass.watch = false;
    await wait();
    expect(element[0].classList.contains("existing")).toBe(true);
    expect(element[0].classList.contains("watch")).toBe(false);
    expect(element[0].classList.contains("hasOwnProperty")).toBe(true);
    expect(element[0].classList.contains("isPrototypeOf")).toBe(true);

    delete $rootScope.dynClass;
    await wait();
    expect(element[0].classList.contains("existing")).toBe(true);
    expect(element[0].classList.contains("watch")).toBe(false);
    expect(element[0].classList.contains("hasOwnProperty")).toBe(false);
    expect(element[0].classList.contains("isPrototypeOf")).toBe(false);
  });

  it("should support adding multiple classes via an array", async () => {
    element = $compile(
      "<div class=\"existing\" ng-class=\"['A', 'B']\"></div>",
    )($rootScope);
    await wait();
    expect(element[0].classList.contains("existing")).toBeTruthy();
    expect(element[0].classList.contains("A")).toBeTruthy();
    expect(element[0].classList.contains("B")).toBeTruthy();
  });

  it(
    "should support adding multiple classes conditionally via a map of class names to boolean " +
      "expressions",
    async () => {
      element = $compile(
        '<div class="existing" ' +
          'ng-class="{A: conditionA, B: conditionB(), AnotB: conditionA&&!conditionB()}">' +
          "</div>",
      )($rootScope);
      $rootScope.conditionA = true;
      await wait();
      expect(element[0].classList.contains("existing")).toBeTruthy();
      expect(element[0].classList.contains("A")).toBeTruthy();
      expect(element[0].classList.contains("B")).toBeFalsy();
      expect(element[0].classList.contains("AnotB")).toBeTruthy();

      $rootScope.conditionB = function () {
        return true;
      };
      await wait();
      expect(element[0].classList.contains("existing")).toBeTruthy();
      expect(element[0].classList.contains("A")).toBeTruthy();
      expect(element[0].classList.contains("B")).toBeTruthy();
      expect(element[0].classList.contains("AnotB")).toBeFalsy();
    },
  );

  it("should not break when passed non-string/array/object, truthy values", async () => {
    element = $compile('<div ng-class="42"></div>')($rootScope);
    await wait();
    expect(element[0].classList.contains("42")).toBeTruthy();
  });

  it("should support adding multiple classes via an array mixed with conditionally via a map", async () => {
    element = $compile(
      "<div class=\"existing\" ng-class=\"['A', {'B': condition}]\"></div>",
    )($rootScope);
    await wait();
    expect(element[0].classList.contains("existing")).toBeTruthy();
    expect(element[0].classList.contains("A")).toBeTruthy();
    expect(element[0].classList.contains("B")).toBeFalsy();
    $rootScope.condition = true;
    await wait();
    expect(element[0].classList.contains("B")).toBeTruthy();
  });

  it("should remove classes when the referenced object is the same but its property is changed", async () => {
    element = $compile('<div ng-class="classes"></div>')($rootScope);
    $rootScope.classes = { A: true, B: true };
    await wait();
    expect(element[0].classList.contains("A")).toBeTruthy();
    expect(element[0].classList.contains("B")).toBeTruthy();
    $rootScope.classes.A = false;
    await wait();
    expect(element[0].classList.contains("A")).toBeFalsy();
    expect(element[0].classList.contains("B")).toBeTruthy();
  });

  it("should support adding multiple classes via a space delimited string", async () => {
    element = $compile('<div class="existing" ng-class="\'A B\'"></div>')(
      $rootScope,
    );
    await wait();
    expect(element[0].classList.contains("existing")).toBeTruthy();
    expect(element[0].classList.contains("A")).toBeTruthy();
    expect(element[0].classList.contains("B")).toBeTruthy();
  });

  it("should support adding multiple classes via a space delimited string inside an array", async () => {
    element = $compile(
      "<div class=\"existing\" ng-class=\"['A B', 'C']\"></div>",
    )($rootScope);
    await wait();
    expect(element[0].classList.contains("existing")).toBeTruthy();
    expect(element[0].classList.contains("A")).toBeTruthy();
    expect(element[0].classList.contains("B")).toBeTruthy();
    expect(element[0].classList.contains("C")).toBeTruthy();
  });

  it("should preserve class added post compilation with pre-existing classes", async () => {
    element = $compile('<div class="existing" ng-class="dynClass"></div>')(
      $rootScope,
    );
    $rootScope.dynClass = "A";
    await wait();
    expect(element[0].classList.contains("existing")).toBe(true);

    // add extra class, change model and eval
    element[0].classList.add("newClass");
    $rootScope.dynClass = "B";
    await wait();
    expect(element[0].classList.contains("existing")).toBe(true);
    expect(element[0].classList.contains("B")).toBe(true);
    expect(element[0].classList.contains("newClass")).toBe(true);
  });

  it('should preserve class added post compilation without pre-existing classes"', async () => {
    element = $compile('<div ng-class="dynClass"></div>')($rootScope);
    $rootScope.dynClass = "A";
    await wait();
    expect(element[0].classList.contains("A")).toBe(true);

    // add extra class, change model and eval
    element[0].classList.add("newClass");
    $rootScope.dynClass = "B";
    await wait();
    expect(element[0].classList.contains("B")).toBe(true);
    expect(element[0].classList.contains("newClass")).toBe(true);
  });

  it('should preserve other classes with similar name"', async () => {
    element = $compile(
      '<div class="ui-panel ui-selected" ng-class="dynCls"></div>',
    )($rootScope);
    $rootScope.dynCls = "panel";
    $rootScope.dynCls = "foo";
    await wait();
    expect(element[0].className).toBe("ui-panel ui-selected foo");
  });

  it("should not add duplicate classes", async () => {
    element = $compile('<div class="panel bar" ng-class="dynCls"></div>')(
      $rootScope,
    );
    $rootScope.dynCls = "panel";
    await wait();
    expect(element[0].className).toBe("panel bar");
  });

  it("should remove classes even if it was specified via class attribute", async () => {
    element = $compile('<div class="panel bar" ng-class="dynCls"></div>')(
      $rootScope,
    );
    $rootScope.dynCls = "panel";
    $rootScope.dynCls = "window";
    await wait();
    expect(element[0].className).toBe("bar window");
  });

  it("should remove classes even if they were added by another code", async () => {
    element = $compile('<div ng-class="dynCls"></div>')($rootScope);
    $rootScope.dynCls = "foo";
    await wait();
    element[0].classList.add("foo");
    await wait();
    $rootScope.dynCls = "";
  });

  it("should convert undefined and null values to an empty string", async () => {
    element = $compile('<div ng-class="dynCls"></div>')($rootScope);
    await wait();
    $rootScope.dynCls = [undefined, null];
  });

  it("should ngClass odd/even", async () => {
    element = $compile(
      '<ul><li ng-repeat="i in [0,1]" class="existing" ng-class-odd="\'odd\'" ng-class-even="\'even\'"></li><ul>',
    )($rootScope);
    await wait();
    const e1 = JQLite(element[0].childNodes[1]);
    const e2 = JQLite(element[0].childNodes[3]);
    expect(e1[0].classList.contains("existing")).toBeTruthy();
    expect(e1[0].classList.contains("odd")).toBeTruthy();
    expect(e2[0].classList.contains("existing")).toBeTruthy();
    expect(e2[0].classList.contains("even")).toBeTruthy();
  });

  it("should allow both ngClass and ngClassOdd/Even on the same element", async () => {
    element = $compile(
      "<ul>" +
        '<li ng-repeat="i in [0,1]" ng-class="\'plainClass\'" ' +
        "ng-class-odd=\"'odd'\" ng-class-even=\"'even'\"></li>" +
        "<ul>",
    )($rootScope);
    await wait();
    const e1 = JQLite(element[0].childNodes[1]);
    const e2 = JQLite(element[0].childNodes[3]);

    expect(e1[0].classList.contains("plainClass")).toBeTruthy();
    expect(e1[0].classList.contains("odd")).toBeTruthy();
    expect(e1[0].classList.contains("even")).toBeFalsy();
    expect(e2[0].classList.contains("plainClass")).toBeTruthy();
    expect(e2[0].classList.contains("even")).toBeTruthy();
    expect(e2[0].classList.contains("odd")).toBeFalsy();
  });

  it("should allow ngClassOdd/Even on the same element with overlapping classes", async () => {
    element = $compile(
      "<ul>" +
        '<li ng-repeat="i in [0,1,2]" ' +
        "ng-class-odd=\"'same odd'\" " +
        "ng-class-even=\"'same even'\">" +
        "</li>" +
        "<ul>",
    )($rootScope);
    await wait();
    const e1 = element.children().eq(0)[0];
    const e2 = element.children().eq(1)[0];
    const e3 = element.children().eq(2)[0];

    expect(e1).toHaveClass("same");
    expect(e1).toHaveClass("odd");
    expect(e1).not.toHaveClass("even");
    expect(e2).toHaveClass("same");
    expect(e2).not.toHaveClass("odd");
    expect(e2).toHaveClass("even");
    expect(e3).toHaveClass("same");
    expect(e3).toHaveClass("odd");
    expect(e3).not.toHaveClass("even");
  });

  it("should allow ngClass with overlapping classes", async () => {
    element = $compile(
      "<div ng-class=\"{'same yes': test, 'same no': !test}\"></div>",
    )($rootScope)[0];
    await wait();
    expect(element).toHaveClass("same");
    expect(element).not.toHaveClass("yes");
    expect(element).toHaveClass("no");

    $rootScope.$apply("test = true");
    await wait();

    expect(element).toHaveClass("same");
    expect(element).toHaveClass("yes");
    expect(element).not.toHaveClass("no");
  });

  it("should allow both ngClass and ngClassOdd/Even with multiple classes", async () => {
    element = $compile(
      "<ul>" +
        "<li ng-repeat=\"i in [0,1]\" ng-class=\"['A', 'B']\" " +
        "ng-class-odd=\"['C', 'D']\" ng-class-even=\"['E', 'F']\"></li>" +
        "<ul>",
    )($rootScope);
    await wait();
    const e1 = JQLite(element[0].childNodes[1]);
    const e2 = JQLite(element[0].childNodes[3]);

    expect(e1[0].classList.contains("A")).toBeTruthy();
    expect(e1[0].classList.contains("B")).toBeTruthy();
    expect(e1[0].classList.contains("C")).toBeTruthy();
    expect(e1[0].classList.contains("D")).toBeTruthy();
    expect(e1[0].classList.contains("E")).toBeFalsy();
    expect(e1[0].classList.contains("F")).toBeFalsy();

    expect(e2[0].classList.contains("A")).toBeTruthy();
    expect(e2[0].classList.contains("B")).toBeTruthy();
    expect(e2[0].classList.contains("E")).toBeTruthy();
    expect(e2[0].classList.contains("F")).toBeTruthy();
    expect(e2[0].classList.contains("C")).toBeFalsy();
    expect(e2[0].classList.contains("D")).toBeFalsy();
  });

  it("should reapply ngClass when interpolated class attribute changes", async () => {
    element = $compile(
      "<div>" +
        '<div class="one {{two}} three" ng-class="{five: five}"></div>' +
        '<div class="one {{two}} three {{four}}" ng-class="{five: five}"></div>' +
        "</div>",
    )($rootScope);
    await wait();
    const e1 = element.children().eq(0)[0];
    const e2 = element.children().eq(1)[0];

    $rootScope.$apply('two = "two"; five = true');
    await wait();
    expect(e1).toHaveClass("one");
    expect(e1).toHaveClass("two");
    expect(e1).toHaveClass("three");
    expect(e1).not.toHaveClass("four");
    expect(e1).toHaveClass("five");
    expect(e2).toHaveClass("one");
    expect(e2).toHaveClass("two");
    expect(e2).toHaveClass("three");
    expect(e2).not.toHaveClass("four");
    expect(e2).toHaveClass("five");

    $rootScope.$apply('two = "another-two"');
    await wait();
    expect(e1).toHaveClass("one");
    expect(e1).not.toHaveClass("two");
    expect(e1).toHaveClass("another-two");
    expect(e1).toHaveClass("three");
    expect(e1).not.toHaveClass("four");
    expect(e1).toHaveClass("five");
    expect(e2).toHaveClass("one");
    expect(e2).not.toHaveClass("two");
    expect(e2).toHaveClass("another-two");
    expect(e2).toHaveClass("three");
    expect(e2).not.toHaveClass("four");
    expect(e2).toHaveClass("five");

    $rootScope.$apply('two = "two-more"; four = "four"');
    await wait();
    expect(e1).toHaveClass("one");
    expect(e1).not.toHaveClass("two");
    expect(e1).not.toHaveClass("another-two");
    expect(e1).toHaveClass("two-more");
    expect(e1).toHaveClass("three");
    expect(e1).not.toHaveClass("four");
    expect(e1).toHaveClass("five");
    expect(e2).toHaveClass("one");
    expect(e2).not.toHaveClass("two");
    expect(e2).not.toHaveClass("another-two");
    expect(e2).toHaveClass("two-more");
    expect(e2).toHaveClass("three");
    expect(e2).toHaveClass("four");
    expect(e2).toHaveClass("five");

    $rootScope.$apply("five = false");
    await wait();
    expect(e1).toHaveClass("one");
    expect(e1).not.toHaveClass("two");
    expect(e1).not.toHaveClass("another-two");
    expect(e1).toHaveClass("two-more");
    expect(e1).toHaveClass("three");
    expect(e1).not.toHaveClass("four");
    expect(e1).not.toHaveClass("five");
    expect(e2).toHaveClass("one");
    expect(e2).not.toHaveClass("two");
    expect(e2).not.toHaveClass("another-two");
    expect(e2).toHaveClass("two-more");
    expect(e2).toHaveClass("three");
    expect(e2).toHaveClass("four");
    expect(e2).not.toHaveClass("five");
  });

  it("should not mess up class value due to observing an interpolated class attribute", async () => {
    $rootScope.foo = true;
    $rootScope.$watch("anything", () => {
      $rootScope.foo = false;
    });
    element = $compile('<div ng-class="{foo:foo}"></div>')($rootScope);
    await wait();
    expect(element[0].classList.contains("foo")).toBe(false);
  });

  it("should update ngClassOdd/Even when an item is added to the model", async () => {
    element = $compile(
      "<ul>" +
        '<li ng-repeat="i in items" ' +
        "ng-class-odd=\"'odd'\" ng-class-even=\"'even'\">i</li>" +
        "<ul>",
    )($rootScope);
    $rootScope.items = ["b", "c", "d"];
    $rootScope.items.unshift("a");
    await wait();
    const e1 = JQLite(element[0].childNodes[1]);
    const e4 = JQLite(element[0].childNodes[3]);

    expect(e1[0].classList.contains("odd")).toBeTruthy();
    expect(e1[0].classList.contains("even")).toBeFalsy();

    expect(e4[0].classList.contains("even")).toBeTruthy();
    expect(e4[0].classList.contains("odd")).toBeFalsy();
  });

  it("should update ngClassOdd/Even when model is changed by filtering", async () => {
    element = $compile(
      "<ul>" +
        '<li ng-repeat="i in items track by $index" ' +
        "ng-class-odd=\"'odd'\" ng-class-even=\"'even'\"></li>" +
        "<ul>",
    )($rootScope);
    $rootScope.items = ["a", "b", "a"];
    $rootScope.items = ["a", "a"];
    await wait();
    const e1 = JQLite(element[0].childNodes[1]);
    const e2 = JQLite(element[0].childNodes[3]);

    expect(e1[0].classList.contains("odd")).toBeTruthy();
    expect(e1[0].classList.contains("even")).toBeFalsy();

    expect(e2[0].classList.contains("even")).toBeTruthy();
    expect(e2[0].classList.contains("odd")).toBeFalsy();
  });

  it("should update ngClassOdd/Even when model is changed by sorting", async () => {
    element = $compile(
      "<ul>" +
        '<li ng-repeat="i in items" ' +
        "ng-class-odd=\"'odd'\" ng-class-even=\"'even'\">i</li>" +
        "<ul>",
    )($rootScope);
    $rootScope.items = ["a", "b"];
    $rootScope.items = ["b", "a"];
    await wait();
    const e1 = JQLite(element[0].childNodes[1]);
    const e2 = JQLite(element[0].childNodes[3]);

    expect(e1[0].classList.contains("odd")).toBeTruthy();
    expect(e1[0].classList.contains("even")).toBeFalsy();

    expect(e2[0].classList.contains("even")).toBeTruthy();
    expect(e2[0].classList.contains("odd")).toBeFalsy();
  });

  it("should add/remove the correct classes when the expression and `$index` change simultaneously", async () => {
    element = $compile(
      "<div>" +
        '<div ng-class-odd="foo"></div>' +
        '<div ng-class-even="foo"></div>' +
        "</div>",
    )($rootScope);
    await wait();
    const odd = element.children().eq(0)[0];
    const even = element.children().eq(1)[0];

    $rootScope.$apply('$index = 0; foo = "class1"');
    await wait();
    expect(odd).toHaveClass("class1");
    expect(odd).not.toHaveClass("class2");
    expect(even).not.toHaveClass("class1");
    expect(even).not.toHaveClass("class2");

    $rootScope.$apply('$index = 1; foo = "class2"');
    await wait();
    expect(odd).not.toHaveClass("class1");
    expect(odd).not.toHaveClass("class2");
    expect(even).not.toHaveClass("class1");
    expect(even).toHaveClass("class2");

    $rootScope.$apply('foo = "class1"');
    await wait();
    expect(odd).not.toHaveClass("class1");
    expect(odd).not.toHaveClass("class2");
    expect(even).toHaveClass("class1");
    expect(even).not.toHaveClass("class2");

    $rootScope.$apply("$index = 2");
    await wait();
    expect(odd).toHaveClass("class1");
    expect(odd).not.toHaveClass("class2");
    expect(even).not.toHaveClass("class1");
    expect(even).not.toHaveClass("class2");
  });

  it("should support mixed array/object variable with a mutating object", async () => {
    element = $compile('<div ng-class="classVar"></div>')($rootScope);

    $rootScope.classVar = [{ orange: true }];
    await wait();
    expect(element[0]).toHaveClass("orange");

    $rootScope.classVar[0].orange = false;
    await wait();
    expect(element[0]).not.toHaveClass("orange");
  });

  // // https://github.com/angular/angular.js/issues/15905
  it("should support a mixed literal-array/object variable", async () => {
    element = $compile('<div ng-class="[classVar]"></div>')($rootScope);

    $rootScope.classVar = { orange: true };
    await wait();
    expect(element[0]).toHaveClass("orange");

    $rootScope.classVar.orange = false;
    await wait();
    expect(element[0]).not.toHaveClass("orange");
  });

  it("should track changes of mutating object inside an array", async () => {
    $rootScope.classVar = [{ orange: true }];
    element = $compile('<div ng-class="classVar"></div>')($rootScope);
    await wait();
    expect(element[0]).toHaveClass("orange");

    $rootScope.$apply("classVar[0].orange = false");
    await wait();
    expect(element[0]).not.toHaveClass("orange");
  });

  // https://github.com/angular/angular.js/issues/15960#issuecomment-299109412
  it("should always reevaluate filters with non-primitive inputs within literals", async () => {
    dealoc(document.getElementById("dummy"));
    injector = window.angular.bootstrap(document.getElementById("dummy"), [
      "test",
      ($filterProvider) => {
        $filterProvider.register("foo", () => (o) => o.a || o.b);
      },
    ]);

    injector.invoke(async ($rootScope, $compile) => {
      $rootScope.testObj = {};
      element = $compile('<div ng-class="{x: (testObj | foo)}">')(
        $rootScope,
      )[0];

      await wait();
      expect(element).not.toHaveClass("x");

      $rootScope.$apply("testObj.a = true");
      await wait();
      expect(element).toHaveClass("x");
    });
  });

  describe("large objects", () => {
    let getProp;
    let veryLargeObj;

    beforeEach(() => {
      getProp = jasmine.createSpy("getProp");
      veryLargeObj = {};

      Object.defineProperty(veryLargeObj, "prop", {
        get: getProp,
        enumerable: true,
      });
    });

    it("should not be copied when using an expression", async () => {
      element = $compile('<div ng-class="fooClass"></div>')($rootScope)[0];
      $rootScope.fooClass = { foo: veryLargeObj };
      await wait();
      expect(element).toHaveClass("foo");
      expect(getProp).not.toHaveBeenCalled();
    });

    it("should not be copied when using a literal", async () => {
      element = $compile('<div ng-class="{foo: veryLargeObj}"></div>')(
        $rootScope,
      )[0];
      $rootScope.veryLargeObj = veryLargeObj;
      await wait();
      expect(element).toHaveClass("foo");
      expect(getProp).not.toHaveBeenCalled();
    });

    it("should not be copied when inside an array", async () => {
      element = $compile('<div ng-class="[{foo: veryLargeObj}]"></div>')(
        $rootScope,
      )[0];
      $rootScope.veryLargeObj = veryLargeObj;
      await wait();
      expect(element).toHaveClass("foo");
      expect(getProp).not.toHaveBeenCalled();
    });

    it("should not be copied when using one-time binding", async () => {
      element = $compile(
        '<div ng-class="::{foo: veryLargeObj, bar: bar}"></div>',
      )($rootScope)[0];
      $rootScope.veryLargeObj = veryLargeObj;
      await wait();
      expect(element).toHaveClass("foo");
      expect(element).not.toHaveClass("bar");
      expect(getProp).not.toHaveBeenCalled();

      $rootScope.$apply('veryLargeObj.bar = "bar"');
      await wait();
      expect(element).toHaveClass("foo");
      expect(element).not.toHaveClass("bar");
      expect(getProp).not.toHaveBeenCalled();

      $rootScope.$apply('bar = "bar"');
      await wait();
      expect(element).toHaveClass("foo");
      expect(element).toHaveClass("bar");
      expect(getProp).not.toHaveBeenCalled();

      $rootScope.$apply('veryLargeObj.bar = "qux"');
      await wait();
      expect(element).toHaveClass("foo");
      expect(element).toHaveClass("bar");
      expect(getProp).not.toHaveBeenCalled();
    });
  });
});

// describe("ngClass animations", () => {
//   let body;
//   let element;
//   let $rootElement;

//   afterEach(() => {
//     dealoc(element);
//   });

//   it("should avoid calling addClass accidentally when removeClass is going on", () => {
//     module("ngAnimateMock");
//     inject(($compile, $rootScope, $animate, $timeout) => {
//       element = angular.element('<div ng-class="val"></div>');
//       const body = JQLite(document.body);
//       body.append(element);
//       $compile(element)($rootScope);

//       expect($animate.queue.length).toBe(0);

//       $rootScope.val = "one";
//       ;
//       expect($animate.queue.shift().event).toBe("addClass");
//       expect($animate.queue.length).toBe(0);

//       $rootScope.val = "";
//       ;
//       expect($animate.queue.shift().event).toBe("removeClass"); // only removeClass is called
//       expect($animate.queue.length).toBe(0);

//       $rootScope.val = "one";
//       ;
//       expect($animate.queue.shift().event).toBe("addClass");
//       expect($animate.queue.length).toBe(0);

//       $rootScope.val = "two";
//       ;
//       expect($animate.queue.shift().event).toBe("addClass");
//       expect($animate.queue.shift().event).toBe("removeClass");
//       expect($animate.queue.length).toBe(0);
//     });
//   });

//   it("should combine the ngClass evaluation with the enter animation", () => {
//     // mocks are not used since the enter delegation method is called before addClass and
//     // it makes it impossible to test to see that addClass is called first
//     module("ngAnimate");
//     module("ngAnimateMock");

//     module(($animateProvider) => {
//       $animateProvider.register(".crazy", () => ({
//         enter(element, done) {
//           element.data("state", "crazy-enter");
//           done();
//         },
//       }));
//     });
//     inject(
//       ($compile, $rootScope, $browser, $rootElement, $animate, $document) => {
//         $animate.enabled(true);

//         $rootScope.val = "crazy";
//         element = angular.element('<div ng-class="val"></div>');
//         JQLite($document[0].body).append($rootElement);

//         $compile(element)($rootScope);

//         let enterComplete = false;
//         $animate.enter(element, $rootElement, null).then(() => {
//           enterComplete = true;
//         });

//         // jquery doesn't compare both elements properly so let's use the nodes
//         expect(element.parent()[0]).toEqual($rootElement[0]);
//         expect(element[0].classList.contains("crazy")).toBe(false);
//         expect(enterComplete).toBe(false);

//         ;
//         $animate.flush();
//         ;

//         expect(element[0].classList.contains("crazy")).toBe(true);
//         expect(enterComplete).toBe(true);
//         expect(element.data("state")).toBe("crazy-enter");
//       },
//     );
//   });

//   it("should not remove classes if they're going to be added back right after", () => {
//     module("ngAnimateMock");

//     inject(($rootScope, $compile, $animate) => {
//       let className;

//       $rootScope.one = true;
//       $rootScope.two = true;
//       $rootScope.three = true;

//       element = angular.element(
//         '<div ng-class="{one:one, two:two, three:three}"></div>',
//       );
//       $compile(element)($rootScope);
//       ;

//       // this fires twice due to the class observer firing
//       let item = $animate.queue.shift();
//       expect(item.event).toBe("addClass");
//       expect(item.args[1]).toBe("one two three");

//       expect($animate.queue.length).toBe(0);

//       $rootScope.three = false;
//       ;

//       item = $animate.queue.shift();
//       expect(item.event).toBe("removeClass");
//       expect(item.args[1]).toBe("three");

//       expect($animate.queue.length).toBe(0);

//       $rootScope.two = false;
//       $rootScope.three = true;
//       ;

//       item = $animate.queue.shift();
//       expect(item.event).toBe("addClass");
//       expect(item.args[1]).toBe("three");

//       item = $animate.queue.shift();
//       expect(item.event).toBe("removeClass");
//       expect(item.args[1]).toBe("two");

//       expect($animate.queue.length).toBe(0);
//     });
//   });
// });
