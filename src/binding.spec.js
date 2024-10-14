import { JQLite, dealoc } from "./shared/jqlite/jqlite";
import { Angular } from "./loader";
import { browserTrigger } from "./shared/test-utils";

describe("binding", () => {
  let element,
    myModule,
    $injector,
    $rootScope,
    $compile,
    $exceptionHandler,
    errors = [];

  function childNode(element, index) {
    return JQLite(element[0].childNodes[index]);
  }

  beforeEach(function () {
    errors = [];
    window.angular = new Angular();
    myModule = window.angular.module("myModule", ["ng"]);
    myModule.decorator("$exceptionHandler", function () {
      return (exception) => {
        errors.push(exception.message);
      };
    });
    $injector = window.angular.bootstrap(document.getElementById("dummy"), [
      "myModule",
    ]);
    $rootScope = $injector.get("$rootScope");
    $compile = $injector.get("$compile");
    $exceptionHandler = $injector.get("$exceptionHandler");
    this.compileToHtml = function (content) {
      let html;
      content = JQLite(content);
      $compile(content)($rootScope);
      html = content[0].outerHTML;
      return html;
    };
  });

  afterEach(function () {
    dealoc(element);
    dealoc(this.element);
  });

  it("BindUpdate", () => {
    $compile('<div ng-init="a=123"/>')($rootScope);
    ;
    expect($rootScope.a).toBe(123);
  });

  it("ExecuteInitialization", () => {
    $compile('<div ng-init="a=123">')($rootScope);
    expect($rootScope.a).toBe(123);
  });

  it("ExecuteInitializationStatements", () => {
    $compile('<div ng-init="a=123;b=345">')($rootScope);
    expect($rootScope.a).toBe(123);
    expect($rootScope.b).toBe(345);
  });

  it("ApplyTextBindings", () => {
    element = $compile('<div ng-bind="model.a">x</div>')($rootScope);
    $rootScope.model = { a: 123 };
    $rootScope.$apply();
    expect(element.text()).toBe("123");
  });

  it("InputTypeButtonActionExecutesInScope", () => {
    let savedCalled = false;
    element = $compile(
      '<input type="button" ng-click="person.save()" value="Apply">',
    )($rootScope);
    $rootScope.person = {};
    $rootScope.person.save = function () {
      savedCalled = true;
    };
    element[0].dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        view: window,
      }),
    );
    expect(savedCalled).toBe(true);
  });

  it("InputTypeButtonActionExecutesInScope2", () => {
    let log = "";
    element = $compile('<input type="image" ng-click="action()">')($rootScope);
    $rootScope.action = function () {
      log += "click;";
    };
    expect(log).toEqual("");
    element[0].dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        view: window,
      }),
    );
    expect(log).toEqual("click;");
  });

  it("ButtonElementActionExecutesInScope", () => {
    let savedCalled = false;
    element = $compile('<button ng-click="person.save()">Apply</button>')(
      $rootScope,
    );
    $rootScope.person = {};
    $rootScope.person.save = function () {
      savedCalled = true;
    };
    element[0].dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        view: window,
      }),
    );
    expect(savedCalled).toBe(true);
  });

  it("RepeaterUpdateBindings", () => {
    const form = $compile(
      "<ul>" +
        '<LI ng-repeat="item in model.items" ng-bind="item.a"></LI>' +
        "</ul>",
    )($rootScope);
    const items = [{ a: "A" }, { a: "B" }];
    $rootScope.model = { items };

    $rootScope.$apply();
    expect(form[0].outerHTML).toBe(
      "<ul>" +
        "<!---->" +
        '<li ng-repeat="item in model.items" ng-bind="item.a">A</li>' +
        "<!---->" +
        '<li ng-repeat="item in model.items" ng-bind="item.a">B</li>' +
        "<!---->" +
        "</ul>",
    );

    items.unshift({ a: "C" });
    $rootScope.$apply();
    expect(form[0].outerHTML).toBe(
      "<ul>" +
        "<!---->" +
        '<li ng-repeat="item in model.items" ng-bind="item.a">C</li>' +
        "<!---->" +
        '<li ng-repeat="item in model.items" ng-bind="item.a">A</li>' +
        "<!---->" +
        '<li ng-repeat="item in model.items" ng-bind="item.a">B</li>' +
        "<!---->" +
        "</ul>",
    );

    items.shift();
    $rootScope.$apply();
    expect(form[0].outerHTML).toBe(
      "<ul>" +
        "<!---->" +
        '<li ng-repeat="item in model.items" ng-bind="item.a">A</li>' +
        "<!---->" +
        '<li ng-repeat="item in model.items" ng-bind="item.a">B</li>' +
        "<!---->" +
        "</ul>",
    );

    items.shift();
    items.shift();
    $rootScope.$apply();
  });

  it("RepeaterContentDoesNotBind", () => {
    element = $compile(
      "<ul>" +
        '<LI ng-repeat="item in model.items"><span ng-bind="item.a"></span></li>' +
        "</ul>",
    )($rootScope);
    $rootScope.model = { items: [{ a: "A" }] };
    $rootScope.$apply();
    expect(element[0].outerHTML).toBe(
      "<ul>" +
        "<!---->" +
        '<li ng-repeat="item in model.items"><span ng-bind="item.a">A</span></li>' +
        "<!---->" +
        "</ul>",
    );
  });

  it("DoNotOverwriteCustomAction", function () {
    const html = this.compileToHtml(
      '<input type="submit" value="Save" action="foo();">',
    );
    expect(html.indexOf('action="foo();"')).toBeGreaterThan(0);
  });

  it("ItShouldRemoveExtraChildrenWhenIteratingOverHash", () => {
    element = $compile('<div><div ng-repeat="i in items">{{i}}</div></div>')(
      $rootScope,
    );
    const items = {};
    $rootScope.items = items;

    $rootScope.$apply();
    expect(element[0].childNodes.length).toEqual(1);

    items.name = "misko";
    $rootScope.$apply();
    expect(element[0].childNodes.length).toEqual(3);

    delete items.name;
    $rootScope.$apply();
    expect(element[0].childNodes.length).toEqual(1);
  });

  it("IfAttrBindingThrowsErrorDecorateTheAttribute", () => {
    $compile(
      '<div attr="before {{error.throw()}} after"></div>',
      null,
      true,
    )($rootScope);
    let count = 0;

    $rootScope.error = {
      throw: function () {
        throw new Error(`ErrorMsg${++count}`);
      },
    };
    $rootScope.$apply();
    expect(errors.length).not.toEqual(0);
    expect(errors.shift()).toMatch(/ErrorMsg1/);
    errors.length = 0;

    $rootScope.error.throw = function () {
      return "X";
    };
    $rootScope.$apply();
    expect(errors.length).toMatch("0");
  });

  it("NestedRepeater", () => {
    element = $compile(
      "<div>" +
        '<div ng-repeat="m in model" name="{{m.name}}">' +
        '<ul name="{{i}}" ng-repeat="i in m.item"></ul>' +
        "</div>" +
        "</div>",
    )($rootScope);

    $rootScope.model = [
      { name: "a", item: ["a1", "a2"] },
      { name: "b", item: ["b1", "b2"] },
    ];
    $rootScope.$apply();

    expect(element[0].outerHTML).toBe(
      `<div>` +
        `<!---->` +
        `<div ng-repeat="m in model" name="a">` +
        `<!---->` +
        `<ul name="a1" ng-repeat="i in m.item"></ul><!---->` +
        `<ul name="a2" ng-repeat="i in m.item"></ul><!---->` +
        `</div><!---->` +
        `<div ng-repeat="m in model" name="b">` +
        `<!---->` +
        `<ul name="b1" ng-repeat="i in m.item"></ul>` +
        `<!---->` +
        `<ul name="b2" ng-repeat="i in m.item"></ul>` +
        `<!----></div>` +
        `<!----></div>`,
    );
  });

  it("HideBindingExpression", () => {
    element = $compile('<div ng-hide="hidden === 3"/>')($rootScope);

    $rootScope.hidden = 3;
    $rootScope.$apply();

    expect(element[0].classList.contains("ng-hide")).toBe(true);

    $rootScope.hidden = 2;
    $rootScope.$apply();
    expect(element[0].classList.contains("ng-hide")).toBe(false);
  });

  it("HideBinding", () => {
    element = $compile('<div ng-hide="hidden"/>')($rootScope);

    $rootScope.hidden = "true";
    $rootScope.$apply();
    expect(element[0].classList.contains("ng-hide")).toBeTrue();

    $rootScope.hidden = "false";
    $rootScope.$apply();
    expect(element[0].classList.contains("ng-hide")).toBeTrue();

    $rootScope.hidden = 0;
    $rootScope.$apply();
    expect(element[0].classList.contains("ng-hide")).toBeFalse();

    $rootScope.hidden = false;
    $rootScope.$apply();
    expect(element[0].classList.contains("ng-hide")).toBeFalse();

    $rootScope.hidden = "";
    $rootScope.$apply();
    expect(element[0].classList.contains("ng-hide")).toBeFalse();
  });

  it("ShowBinding", () => {
    element = $compile('<div ng-show="show"/>')($rootScope);

    $rootScope.show = "true";
    $rootScope.$apply();
    expect(element[0].classList.contains("ng-hide")).toBeFalse();

    $rootScope.show = "false";
    $rootScope.$apply();
    expect(element[0].classList.contains("ng-hide")).toBeFalse();

    $rootScope.show = false;
    $rootScope.$apply();
    expect(element[0].classList.contains("ng-hide")).toBeTrue();

    $rootScope.show = "";
    $rootScope.$apply();
    expect(element[0].classList.contains("ng-hide")).toBeTrue();
  });

  it("BindClass", () => {
    element = $compile('<div ng-class="clazz"/>')($rootScope);

    $rootScope.clazz = "testClass";
    $rootScope.$apply();

    expect(element[0].classList.contains("testClass")).toBeTrue();

    $rootScope.clazz = ["a", "b"];
    $rootScope.$apply();
    expect(element[0].classList.contains("a")).toBeTrue();
    expect(element[0].classList.contains("b")).toBeTrue();
  });

  it("BindClassEvenOdd", () => {
    element = $compile(
      "<div>" +
        '<div ng-repeat="i in [0,1]" ng-class-even="\'e\'" ng-class-odd="\'o\'"></div>' +
        "</div>",
    )($rootScope);
    $rootScope.$apply();

    const d1 = JQLite(element[0].childNodes[1]);
    const d2 = JQLite(element[0].childNodes[3]);
    expect(d1[0].classList.contains("o")).toBeTruthy();
    expect(d2[0].classList.contains("e")).toBeTruthy();
    // expect(element).toBe(
    //   "<div>" +
    //     "<!-- ngRepeat: i in [0,1] -->" +
    //     '<div class="o" ng-class-even="\'e\'" ng-class-odd="\'o\'" ng-repeat="i in [0,1]"></div>' +
    //     "<!-- end ngRepeat: i in [0,1] -->" +
    //     '<div class="e" ng-class-even="\'e\'" ng-class-odd="\'o\'" ng-repeat="i in [0,1]"></div>' +
    //     "<!-- end ngRepeat: i in [0,1] -->" +
    //     "</div>",
    //);
  });

  it("BindStyle", () => {
    element = $compile('<div ng-style="style"/>')($rootScope);

    $rootScope.$eval('style={height: "10px"}');
    $rootScope.$apply();

    expect(element[0].style["height"]).toBe("10px");

    $rootScope.$eval("style={}");
    $rootScope.$apply();
  });

  it("ActionOnAHrefThrowsError", () => {
    const input = $compile('<a ng-click="action()">Add Phone</a>')($rootScope);
    $rootScope.action = function () {
      throw new Error("MyError");
    };
    input[0].dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        view: window,
      }),
    );

    expect(errors[0]).toMatch(/MyError/);
  });

  it("ShouldIgnoreVbNonBindable", () => {
    element = $compile(
      "<div>{{a}}" +
        "<div ng-non-bindable>{{a}}</div>" +
        "<div ng-non-bindable=''>{{b}}</div>" +
        "<div ng-non-bindable='true'>{{c}}</div>" +
        "</div>",
    )($rootScope);
    $rootScope.a = 123;
    $rootScope.$apply();
    expect(element.text()).toBe("123{{a}}{{b}}{{c}}");
  });

  it("ShouldTemplateBindPreElements", () => {
    element = $compile("<pre>Hello {{name}}!</pre>")($rootScope);
    $rootScope.name = "World";
    $rootScope.$apply();

    expect(element[0].outerHTML).toBe(`<pre>Hello World!</pre>`);
  });

  it("FillInOptionValueWhenMissing", () => {
    element = $compile(
      '<select ng-model="foo">' +
        '<option selected="true">{{a}}</option>' +
        '<option value="">{{b}}</option>' +
        "<option>C</option>" +
        "</select>",
    )($rootScope);
    $rootScope.a = "A";
    $rootScope.b = "B";
    $rootScope.$apply();
    const optionA = childNode(element, 0);
    const optionB = childNode(element, 1);
    const optionC = childNode(element, 2);

    expect(optionA.attr("value")).toEqual("A");
    expect(optionA.text()).toEqual("A");

    expect(optionB.attr("value")).toEqual("");
    expect(optionB.text()).toEqual("B");

    expect(optionC.attr("value")).toEqual("C");
    expect(optionC.text()).toEqual("C");
  });

  it("ItShouldSelectTheCorrectRadioBox", () => {
    element = $compile(
      "<div>" +
        '<input type="radio" ng-model="sex" value="female">' +
        '<input type="radio" ng-model="sex" value="male">' +
        "</div>",
    )($rootScope);
    const female = JQLite(element[0].childNodes[0]);
    const male = JQLite(element[0].childNodes[1]);

    female[0].click();
    browserTrigger(female, "change");
    expect($rootScope.sex).toBe("female");
    expect(female[0].checked).toBe(true);
    expect(male[0].checked).toBe(false);
    expect(female.val()).toBe("female");

    male[0].click();
    browserTrigger(male, "change");
    expect($rootScope.sex).toBe("male");
    expect(female[0].checked).toBe(false);
    expect(male[0].checked).toBe(true);
    expect(male.val()).toBe("male");
  });

  it("ItShouldRepeatOnHashes", () => {
    element = $compile(
      "<ul>" +
        '<li ng-repeat="(k,v) in {a:0,b:1}" ng-bind="k + v"></li>' +
        "</ul>",
    )($rootScope);
    $rootScope.$apply();
    expect(element[0].outerHTML).toBe(
      "<ul>" +
        "<!---->" +
        '<li ng-repeat="(k,v) in {a:0,b:1}" ng-bind="k + v">a0</li>' +
        "<!---->" +
        '<li ng-repeat="(k,v) in {a:0,b:1}" ng-bind="k + v">b1</li>' +
        "<!---->" +
        "</ul>",
    );
  });

  it("ItShouldFireChangeListenersBeforeUpdate", () => {
    element = $compile('<div ng-bind="name"></div>')($rootScope);
    $rootScope.name = "";
    $rootScope.$watch("watched", () => {
      $rootScope.name = 123;
    });
    $rootScope.watched = "change";
    $rootScope.$apply();
    expect($rootScope.name).toBe(123);
    expect(element[0].outerHTML).toBe('<div ng-bind="name">123</div>');
  });

  it("ItShouldHandleMultilineBindings", () => {
    element = $compile("<div>{{\n 1 \n + \n 2 \n}}</div>")($rootScope);
    $rootScope.$apply();
    expect(element.text()).toBe("3");
  });
});
