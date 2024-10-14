import { JQLite } from "../../shared/jqlite/jqlite";
import { Angular } from "../../loader";
import { browserTrigger, wait } from "../../shared/test-utils";

describe("ngStateRef", () => {
  window.location.hash = "";
  let el,
    el2,
    template,
    scope,
    _locationProvider,
    $rootScope,
    $compile,
    $q,
    $injector,
    $timeout,
    $state,
    $stateParams,
    $urlService;

  beforeEach(() => {
    window.location.hash = "";
    window.angular = new Angular();
    let module = window.angular.module("defaultModule", []);
    module.config(($stateProvider, $locationProvider) => {
      _locationProvider = $locationProvider;
      $locationProvider.hashPrefix("");
      $stateProvider
        .state({ name: "top", url: "" })
        .state({ name: "other", url: "/other/:id", template: "other" })
        .state({ name: "other.detail", url: "/detail", template: "detail" })
        .state({
          name: "contacts",
          url: "/contacts",
          template:
            '<a ng-sref=".item({ id: 5 })" class="item">Person</a> <ng-view></ng-view>',
        })
        .state({
          name: "contacts.item",
          url: "/{id:int}",
          template:
            '<a ng-sref=".detail" class="item-detail">Detail</a> | <a ng-sref="^" class="item-parent">Parent</a> | <ng-view></ng-view>',
        })
        .state({
          name: "contacts.item.detail",
          template:
            '<div class="title">Detail</div> | <a ng-sref="^" class="item-parent2">Item</a>',
        });
    });
    $injector = window.angular.bootstrap(document.getElementById("dummy"), [
      "defaultModule",
    ]);
    $q = $injector.get("$q");
    $rootScope = $injector.get("$rootScope");
    $compile = $injector.get("$compile");
    $timeout = $injector.get("$timeout");
    $state = $injector.get("$state");
    $stateParams = $injector.get("$stateParams");
    $urlService = $injector.get("$urlService");
    $urlService.listen();
  });

  afterEach(() => (window.location.hash = ""));

  describe("links with promises", () => {
    it("should update the href when promises on parameters change before scope is applied", async () => {
      const defer = $q.defer();
      el = JQLite(
        '<a ng-sref="contacts.item.detail({ id: contact.id })">Details</a>',
      );
      defer.promise.then((val) => {
        $rootScope.contact = val;
      });
      defer.resolve({ id: 6 });
      el = $compile(el)($rootScope);

      expect(el.attr("href")).toBe("#/contacts/6");
    });
  });

  function buildDOM() {
    window.location.hash = "#";
    el = JQLite(
      '<a ng-sref="contacts.item.detail({ id: contact.id })">Details</a>',
    );
    el2 = JQLite('<a ng-sref="top">Top</a>');
    scope = $rootScope;
    scope.contact = { id: 5 };
    scope.$apply();

    $compile(el)(scope);
    $compile(el2)(scope);
  }

  describe("links", () => {
    beforeEach(() => buildDOM());
    afterEach(() => (window.location.hash = ""));

    it("should generate the correct href", () => {
      expect(el.attr("href")).toBe("#/contacts/5");
      expect(el2.attr("href")).toBe("#");
    });

    it("should update the href when parameters change", () => {
      expect(el.attr("href")).toBe("#/contacts/5");
      scope.contact.id = 6;
      scope.$apply();
      expect(el.attr("href")).toBe("#/contacts/6");
    });

    it("should allow multi-line attribute values", async () => {
      el = JQLite(
        '<a ng-sref="contacts.item.detail({\n\tid: $index\n})">Details</a>',
      );
      $rootScope.$index = 3;
      $rootScope.$apply();

      $compile(el)($rootScope);
      expect(el.attr("href")).toBe("#/contacts/3");
    });

    it("should transition states when left-clicked", async () => {
      browserTrigger(el, "click");
      await wait(200);
      expect($state.current.name).toEqual("contacts.item.detail");
      expect($stateParams.id).toEqual(5);
    });

    it("should not transition states when ctrl-clicked", async () => {
      JQLite(el)[0].dispatchEvent(
        new MouseEvent("click", {
          ctrlKey: true,
          bubbles: true,
          cancelable: true,
        }),
      );
      await wait(200);
      expect($state.current.name).toEqual("top");
      expect($stateParams.id).toBeUndefined();
    });

    // TODO investigate further why this fails
    xit("should not transition states when meta-clicked", async () => {
      JQLite(el)[0].dispatchEvent(new MouseEvent("click", { metaKey: true }));
      expect($state.current.name).toEqual("");
      expect($stateParams.id).toBeUndefined();
    });

    it("should not transition states when shift-clicked", async () => {
      JQLite(el)[0].dispatchEvent(new MouseEvent("click", { shiftKey: true }));
      expect($state.current.name).toEqual("top");
      expect($stateParams.id).toBeUndefined();
    });

    // TODO investigate further why this fails
    xit("should not transition states when alt-clicked", async () => {
      expect($state.current.name).toEqual("");

      JQLite(el)[0].dispatchEvent(new MouseEvent("click", { altKey: true }));
      expect($state.current.name).toEqual("top");
      expect($stateParams.id).toBeUndefined();
    });

    it("should not transition states when alt-clicked", async () => {
      expect($state.current.name).toEqual("top");

      JQLite(el)[0].dispatchEvent(new MouseEvent("click", { button: 1 }));
      expect($state.current.name).toEqual("top");
      expect($stateParams.id).toBeUndefined();
    });

    it("should not transition states when element has target specified", async () => {
      el.attr("target", "_blank");
      browserTrigger(el, "click");
      await wait(100);
      expect($state.current.name).toEqual("top");
      expect($stateParams.id).toBeUndefined();
    });

    it("should not transition states if preventDefault() is called in click handler", async () => {
      expect($stateParams.id).toBeUndefined();
      el[0].onclick = (e) => e.preventDefault();

      browserTrigger(el, "click");
      await wait(100);
      expect($state.current.name).toEqual("top");
      expect($stateParams.id).toBeUndefined();
    });

    // // Test for #1031
    it("should allow passing params to current state", async () => {
      $state.go("other", { id: "abc" });
      $rootScope.$index = "def";
      el = JQLite('<a ng-sref="{id: $index}">Details</a>');
      $compile(el)($rootScope);
      expect($state.current.name).toBe("other");
      expect($state.params.id).toEqual("abc");
      expect(el.attr("href")).toBe("#/other/def");

      browserTrigger(el, "click");
      await wait(100);
      expect($state.current.name).toBe("other");
      expect($state.params.id).toEqual("def");

      $rootScope.$index = "ghi";
      $state.go("other.detail");
      expect($state.current.name).toBe("other.detail");
      expect($state.params.id).toEqual("def");

      expect(el.attr("href")).toBe("#/other/ghi/detail");

      browserTrigger(el, "click");
      await wait(100);
      expect($state.current.name).toBe("other.detail");
      expect($state.params.id).toEqual("ghi");
    });

    it("should allow multi-line attribute values when passing params to current state", async () => {
      $state.go("contacts.item.detail", { id: "123" });
      el = JQLite('<a ng-sref="{\n\tid: $index\n}">Details</a>');
      $rootScope.$index = 3;
      $rootScope.$apply();

      $compile(el)($rootScope);
      expect(el.attr("href")).toBe("#/contacts/3");
    });

    it("should take an object as a parameter and update properly on digest churns", async () => {
      el = JQLite(
        '<div><a ng-sref="contacts.item.detail(urlParams)">Contacts</a></div>',
      );
      template = $compile(el)($rootScope);

      $rootScope.urlParams = { id: 1 };
      expect(JQLite(template[0].querySelector("a")).attr("href")).toBe(
        "#/contacts/1",
      );

      $rootScope.urlParams.id = 2;
      expect(JQLite(template[0].querySelector("a")).attr("href")).toBe(
        "#/contacts/2",
      );
    });
  });

  // TODO: Since this is HTML5 mode, we would want to test this with actual backend
  // describe('links in html5 mode', () => {
  //   beforeEach(() => {
  //     _locationProvider.html5Mode(true);
  //   });

  //   beforeEach(inject(buildDOM));

  //   it('should generate the correct href', () => {
  //     expect(el.attr('href')).toBe('/contacts/5');
  //     expect(el2.attr('href')).toBe('');
  //   });

  //   it('should update the href when parameters change', () => {
  //     expect(el.attr('href')).toBe('/contacts/5');
  //     scope.contact.id = 6;
  //     scope.$apply();
  //     expect(el.attr('href')).toBe('/contacts/6');
  //   });

  //   it('should transition states when the url is empty',  async () => {
  //     // Odd, in html5Mode, the initial state isn't matching on empty url, but does match if top.url is "/".
  //     //      expect($state.$current.name).toEqual('top');

  //     triggerClick(el2);
  //     timeoutFlush();
  //     await wait(100);

  //     expect($state.current.name).toEqual('top');
  //     expect(obj($stateParams)).toEqual({});
  //   });
  // });

  describe("links with dynamic state definitions", () => {
    let template;

    beforeEach(() => {
      el = JQLite(
        '<a ng-sref-active="active" ng-sref-active-eq="activeeq" ng-state="state" ng-state-params="params">state</a>',
      );
      scope = $rootScope;
      Object.assign(scope, { state: "contacts", params: {} });
      template = $compile(el)(scope);
    });

    it("sets the correct initial href", () => {
      expect(JQLite(template[0]).attr("href")).toBe("#/contacts");
    });

    it("updates to the new href", () => {
      expect(JQLite(template[0]).attr("href")).toBe("#/contacts");

      scope.state = "contacts.item";
      scope.params = { id: 5 };
      expect(JQLite(template[0]).attr("href")).toBe("#/contacts/5");

      scope.params.id = 25;
      expect(JQLite(template[0]).attr("href")).toBe("#/contacts/25");
    });

    it("updates a linked ng-sref-active", async () => {
      expect(template[0].className).not.toContain("active");
      expect(template[0].className).not.toContain("activeeq");

      $state.go("contacts");
      await wait(100);
      expect(template[0].className).toContain("active activeeq");

      scope.state = "contacts.item";
      scope.params = { id: 5 };
      await wait(100);
      expect(template[0].className).not.toContain("active");
      expect(template[0].className).not.toContain("activeeq");

      $state.go("contacts.item", { id: -5 });
      await wait(100);
      expect(template[0].className).not.toContain("active");
      expect(template[0].className).not.toContain("activeeq");

      $state.go("contacts.item", { id: 5 });
      await wait(100);
      expect(template[0].className).toContain("active activeeq");

      scope.state = "contacts";
      scope.params = {};
      await wait(100);
      expect(template[0].className).toContain("active");
      expect(template[0].className).not.toContain("activeeq");
    });

    it("updates to a new href when it points to a new state", () => {
      expect(JQLite(template[0]).attr("href")).toBe("#/contacts");
      scope.state = "other";
      scope.params = { id: "123" };
      expect(JQLite(template[0]).attr("href")).toBe("#/other/123");
    });

    it("should allow passing params to current state using empty ng-state", async () => {
      await $state.go("other", { id: "abc" });
      $rootScope.$index = "def";
      el = JQLite('<a ng-state="" ng-state-params="{id: $index}">Details</a>');
      $compile(el)($rootScope);

      expect($state.current.name).toBe("other");
      expect($state.params.id).toEqual("abc");
      expect(el.attr("href")).toBe("#/other/def");

      browserTrigger(el, "click");
      await wait(100);

      expect($state.current.name).toBe("other");
      expect($state.params.id).toEqual("def");

      $rootScope.$index = "ghi";
      await $state.go("other.detail");
      expect($state.current.name).toBe("other.detail");
      expect($state.params.id).toEqual("def");

      expect(el.attr("href")).toBe("#/other/ghi/detail");

      browserTrigger(el, "click");
      await wait(100);

      expect($state.current.name).toBe("other.detail");
      expect($state.params.id).toEqual("ghi");
    });

    it("retains the old href if the new points to a non-state", () => {
      expect(JQLite(template[0]).attr("href")).toBe("#/contacts");
      scope.state = "nostate";
      expect(JQLite(template[0]).attr("href")).toBe("#/contacts");
    });

    it("accepts param overrides", () => {
      scope.state = "contacts.item";
      scope.params = { id: 10 };
      expect(JQLite(template[0]).attr("href")).toBe("#/contacts/10");
    });

    it("accepts param overrides", () => {
      scope.state = "contacts.item";
      scope.params = { id: 10 };
      expect(JQLite(template[0]).attr("href")).toBe("#/contacts/10");

      scope.params.id = 22;
      expect(JQLite(template[0]).attr("href")).toBe("#/contacts/22");
    });

    it("watches attributes", () => {
      el = JQLite(
        '<a ng-state="{{exprvar}}" ng-state-params="params">state</a>',
      );
      template = $compile(el)(scope);

      scope.exprvar = "state1";
      scope.state1 = "contacts.item";
      scope.state2 = "other";
      scope.params = { id: 10 };
      expect(JQLite(template[0]).attr("href")).toBe("#/contacts/10");

      scope.exprvar = "state2";
      expect(JQLite(template[0]).attr("href")).toBe("#/other/10");
    });

    it("allows one-time-binding on ng1.3+", () => {
      el = JQLite('<a ng-state="::state" ng-state-params="::params">state</a>');

      scope.state = "contacts.item";
      scope.params = { id: 10 };
      template = $compile(el)(scope);
      expect(JQLite(template[0]).attr("href")).toBe("#/contacts/10");

      scope.state = "other";
      scope.params = { id: 22 };

      expect(JQLite(template[0]).attr("href")).toBe("#/contacts/10");
    });

    it("accepts option overrides", async () => {
      let transitionOptions;

      el = JQLite('<a ng-state="state" ng-state-opts="opts">state</a>');
      scope.state = "contacts";
      scope.opts = { reload: true };
      template = $compile(el)(scope);
      spyOn($state, "go").and.callFake(function (state, params, options) {
        transitionOptions = options;
      });

      browserTrigger(template, "click");
      await wait(100);

      expect(transitionOptions.reload).toEqual(true);
      expect(transitionOptions.absolute).toBeUndefined();
    });

    describe("option event", () => {
      beforeEach(() => (window.location.hash = ""));
      it("should bind click event by default", async () => {
        el = JQLite('<a ng-state="state"></a>');

        scope.state = "contacts";
        $compile(el)(scope);
        browserTrigger(el, "click");
        await wait(100);

        expect($state.current.name).toBe("contacts");
      });

      it("should bind single HTML events", async () => {
        el = JQLite(
          '<input type="text" ng-state="state" ng-state-opts="{ events: [\'change\'] }">',
        );

        scope.state = "contacts";
        $compile(el)(scope);
        browserTrigger(el, "change");
        await wait(100);

        expect($state.current.name).toEqual("contacts");
      });

      it("should bind multiple HTML events", async () => {
        el = JQLite(
          '<input type="text" ng-state="state" ng-state-opts="{ events: [\'change\', \'blur\'] }">',
        );

        scope.state = "contacts";
        $compile(el)(scope);
        browserTrigger(el, "change");
        await wait(100);
        expect($state.current.name).toEqual("contacts");

        $state.go("top");
        expect($state.current.name).toEqual("top");

        browserTrigger(el, "blur");
        await wait(100);

        expect($state.current.name).toEqual("contacts");
      });

      it("should bind multiple Mouse events", async () => {
        el = JQLite(
          "<a ng-state=\"state\" ng-state-opts=\"{ events: ['mouseover', 'mousedown'] }\">",
        );

        scope.state = "contacts";
        $compile(el)(scope);
        browserTrigger(el, "mouseover");
        await wait(100);
        expect($state.current.name).toEqual("contacts");

        $state.go("top");
        expect($state.current.name).toEqual("top");

        browserTrigger(el, "mousedown");
        await wait(100);
        expect($state.current.name).toEqual("contacts");
      });
    });
  });

  describe("forms", () => {
    let el, scope;

    beforeEach(() => {
      el = JQLite(
        '<form ng-sref="contacts.item.detail({ id: contact.id })"></form>',
      );
      scope = $rootScope;
      scope.contact = { id: 5 };
      scope.$apply();

      $compile(el)(scope);
    });

    it("should generate the correct action", () => {
      expect(el.attr("action")).toBe("#/contacts/5");
    });
  });

  describe("relative transitions", () => {
    beforeEach(() => {
      $state.transitionTo("contacts.item", { id: 5 });
      el = JQLite('<a ng-sref=".detail">Details</a>');
      scope = $rootScope;
      scope.$apply();

      $compile(el)(scope);
      template = $compile(JQLite("<div><ng-view></ng-view><div>"))(scope);
      scope.$apply();
    });

    it("should work", async () => {
      $state.transitionTo("contacts.item", { id: 5 });
      await wait(200);
      browserTrigger(el, "click");
      await wait(200);

      expect($state.$current.name).toBe("contacts.item.detail");
      expect($state.params.id).toEqual(5);
    });

    it("should resolve states from parent ngView", async () => {
      $state.transitionTo("contacts");
      await wait(500);
      const parentToChild = JQLite(template[0].querySelector("a.item"));
      browserTrigger(parentToChild, "click");
      await wait(100);

      expect($state.$current.name).toBe("contacts.item");

      const childToGrandchild = JQLite(
        template[0].querySelector("a.item-detail"),
      );
      const childToParent = JQLite(template[0].querySelector("a.item-parent"));

      browserTrigger(childToGrandchild, "click");
      await wait(100);

      const grandchildToParent = JQLite(
        template[0].querySelector("a.item-parent2"),
      );
      expect($state.$current.name).toBe("contacts.item.detail");

      browserTrigger(grandchildToParent, "click");
      await wait(100);

      expect($state.$current.name).toBe("contacts.item");

      $state.transitionTo("contacts.item.detail", { id: 3 });
      browserTrigger(childToParent, "click");
      await wait(100);
      expect($state.$current.name).toBe("contacts");
    });
  });

  describe("option event", () => {
    beforeEach(() => {
      window.location.hash = "";
    });

    it("should bind click event by default", async () => {
      el = JQLite('<a ng-sref="contacts"></a>');
      $compile(el)($rootScope);
      expect($state.current.name).toEqual("top");

      browserTrigger(el, "click");
      await wait(100);

      expect($state.current.name).toEqual("contacts");
    });

    it("should bind single HTML events", async () => {
      el = JQLite(
        '<input type="text" ng-sref="contacts" ng-sref-opts="{ events: [\'change\'] }">',
      );
      $compile(el)($rootScope);
      expect($state.current.name).toEqual("top");

      browserTrigger(el, "change");
      await wait(100);

      expect($state.current.name).toEqual("contacts");
    });

    it("should bind multiple HTML events", async () => {
      el = JQLite(
        '<input type="text" ng-sref="contacts" ng-sref-opts="{ events: [\'change\', \'blur\'] }">',
      );
      $compile(el)($rootScope);
      expect($state.current.name).toEqual("top");

      browserTrigger(el, "change");
      await wait(100);
      expect($state.current.name).toEqual("contacts");

      await $state.go("top");
      expect($state.current.name).toEqual("top");

      browserTrigger(el, "blur");
      await wait(100);
      expect($state.current.name).toEqual("contacts");
    });

    it("should bind multiple Mouse events", async () => {
      el = JQLite(
        "<a ng-sref=\"contacts\" ng-sref-opts=\"{ events: ['mouseover', 'mousedown'] }\">",
      );
      $compile(el)($rootScope);
      expect($state.current.name).toEqual("top");

      browserTrigger(el, "mouseover");
      await wait(100);
      expect($state.current.name).toEqual("contacts");

      await $state.go("top");
      expect($state.current.name).toEqual("top");

      browserTrigger(el, "mousedown");
      await wait(100);
      expect($state.current.name).toEqual("contacts");
    });
  });
});

describe("ngSrefActive", () => {
  window.location.hash = "";
  let el,
    el2,
    template,
    scope,
    _locationProvider,
    $rootScope,
    $compile,
    $q,
    $injector,
    $timeout,
    $state,
    $stateParams,
    _stateProvider;

  beforeEach(() => {
    window.location.hash = "";
    window.angular = new Angular();
    let module = window.angular.module("defaultModule", []);
    module.config(function ($stateProvider) {
      _stateProvider = $stateProvider;
      $stateProvider
        .state({ name: "top", url: "" })
        .state({
          name: "contacts",
          url: "/contacts",
          views: {
            $default: {
              template:
                '<a ng-sref=".item({ id: 6 })" ng-sref-active="active">Contacts</a>',
            },
          },
        })
        .state({ name: "contacts.item", url: "/:id" })
        .state({ name: "contacts.item.detail", url: "/detail/:foo" })
        .state({ name: "contacts.item.edit", url: "/edit" })
        .state({
          name: "admin",
          url: "/admin",
          abstract: true,
          template: "<ng-view/>",
        })
        .state({ name: "admin.roles", url: "/roles?page" })
        .state({
          name: "arrayparam",
          url: "/arrayparam?{foo:int}&bar",
          template: "<div></div>",
        });
    });
    $injector = window.angular.bootstrap(document.getElementById("dummy"), [
      "defaultModule",
    ]);
    $q = $injector.get("$q");
    $rootScope = $injector.get("$rootScope");
    $compile = $injector.get("$compile");
    $timeout = $injector.get("$timeout");
    $state = $injector.get("$state");
    $stateParams = $injector.get("$stateParams");
  });

  it("should update class for sibling ngSref", async () => {
    el = JQLite(
      '<div><a ng-sref="contacts.item({ id: 1 })" ng-sref-active="active">Contacts</a><a ng-sref="contacts.item({ id: 2 })" ng-sref-active="active">Contacts</a></div>',
    );
    template = $compile(el)($rootScope);
    expect(JQLite(template[0].querySelector("a")).attr("class")).toBeFalsy();
    $state.transitionTo("contacts.item", { id: 1 });
    await wait(100);
    expect(JQLite(template[0].querySelector("a")).attr("class")).toBe("active");

    $state.transitionTo("contacts.item", { id: 2 });
    await wait(100);
    expect(JQLite(template[0].querySelector("a")).attr("class")).toBeFalsy();
  });

  it("should match state's parameters", async () => {
    el = JQLite(
      '<div><a ng-sref="contacts.item.detail({ foo: \'bar\' })" ng-sref-active="active">Contacts</a></div>',
    );
    template = $compile(el)($rootScope);
    expect(JQLite(template[0].querySelector("a")).attr("class")).toBeFalsy();
    $state.transitionTo("contacts.item.detail", { id: 5, foo: "bar" });
    await wait(100);
    expect(JQLite(template[0].querySelector("a")).attr("class")).toBe("active");

    $state.transitionTo("contacts.item.detail", { id: 5, foo: "baz" });
    await wait(100);
    expect(JQLite(template[0].querySelector("a")).attr("class")).toBeFalsy();
  });

  // Test for #2696
  it("should compare using typed parameters", async () => {
    el = JQLite(
      '<div><a ng-sref="arrayparam({ foo: [1,2,3] })" ng-sref-active="active">foo 123</a></div>',
    );
    template = $compile(el)($rootScope);
    expect(JQLite(template[0].querySelector("a")).attr("class")).toBeFalsy();

    $state.transitionTo("arrayparam", { foo: [1, 2, 3] });
    await wait(100);
    expect(JQLite(template[0].querySelector("a")).attr("class")).toBe("active");

    $state.transitionTo("arrayparam", { foo: [1, 2, 3], bar: "asdf" });
    await wait(100);
    expect(JQLite(template[0].querySelector("a")).attr("class")).toBe("active");

    $state.transitionTo("arrayparam", { foo: [1, 2] });
    await wait(100);
    expect(JQLite(template[0].querySelector("a")).attr("class")).toBeFalsy();
  });

  // Test for #3154
  it("should compare ng-sref-active-eq using typed parameters", async () => {
    el = JQLite(
      '<div><a ng-sref="arrayparam({ foo: [1,2,3] })" ng-sref-active-eq="active">foo 123</a></div>',
    );
    template = $compile(el)($rootScope);
    expect(JQLite(template[0].querySelector("a")).attr("class")).toBeFalsy();

    $state.transitionTo("arrayparam", { foo: [1, 2, 3] });
    await wait(100);
    expect(JQLite(template[0].querySelector("a")).attr("class")).toBe("active");

    $state.transitionTo("arrayparam", { foo: [1, 2, 3], bar: "asdf" });
    await wait(100);
    expect(JQLite(template[0].querySelector("a")).attr("class")).toBe("active");

    $state.transitionTo("arrayparam", { foo: [1, 2] });
    await wait(100);
    expect(JQLite(template[0].querySelector("a")).attr("class")).toBeFalsy();
  });

  it("should update in response to ng-sref param expression changes", async () => {
    el = JQLite(
      '<div><a ng-sref="contacts.item.detail({ foo: fooId })" ng-sref-active="active">Contacts</a></div>',
    );
    template = $compile(el)($rootScope);
    $rootScope.fooId = "bar";
    expect(JQLite(template[0].querySelector("a")).attr("class")).toBeFalsy();
    $state.transitionTo("contacts.item.detail", { id: 5, foo: "bar" });
    await wait(100);
    expect(JQLite(template[0].querySelector("a")).attr("class")).toBe("active");

    $rootScope.fooId = "baz";
    await wait(100);
    expect(JQLite(template[0].querySelector("a")).attr("class")).toBeFalsy();
  });

  it("should match on child states", async () => {
    template = $compile(
      '<div><a ng-sref="contacts.item({ id: 1 })" ng-sref-active="active">Contacts</a></div>',
    )($rootScope);
    const a = JQLite(template[0].getElementsByTagName("a")[0]);

    $state.transitionTo("contacts.item.edit", { id: 1 });
    await wait(100);
    expect($state.params.id).toBe("1");
    expect(a.attr("class")).toMatch(/active/);

    $state.transitionTo("contacts.item.edit", { id: 4 });
    await wait(100);
    expect($state.params.id).toBe("4");
    expect(a.attr("class")).not.toMatch(/active/);
  });

  it("should NOT match on child states when active-equals is used", async () => {
    template = $compile(
      '<div><a ng-sref="contacts.item({ id: 1 })" ng-sref-active-eq="active">Contacts</a></div>',
    )($rootScope);
    const a = JQLite(template[0].getElementsByTagName("a")[0]);

    $state.transitionTo("contacts.item", { id: 1 });
    await wait(100);
    expect(a.attr("class")).toMatch(/active/);

    $state.transitionTo("contacts.item.edit", { id: 1 });
    await wait(100);
    expect(a.attr("class")).not.toMatch(/active/);
  });

  it("should match on child states when active-equals and active-equals-eq is used", async () => {
    template = $compile(
      '<div><a ng-sref="contacts.item({ id: 1 })" ng-sref-active="active" ng-sref-active-eq="active-eq">Contacts</a></div>',
    )($rootScope);
    const a = JQLite(template[0].getElementsByTagName("a")[0]);

    $state.transitionTo("contacts.item", { id: 1 });
    await wait(100);
    expect(a.attr("class")).toMatch(/active/);
    expect(a.attr("class")).toMatch(/active-eq/);

    $state.transitionTo("contacts.item.edit", { id: 1 });
    await wait(100);
    expect(a.attr("class")).toMatch(/active/);
    expect(a.attr("class")).not.toMatch(/active-eq/);
  });

  it("should resolve relative state refs", async () => {
    el = JQLite("<section><div ng-view></div></section>");
    template = $compile(el)($rootScope);
    $state.transitionTo("contacts");
    await wait(100);
    expect(
      JQLite(template[0].querySelector("a")).attr("class"),
    ).toBeUndefined();

    $state.transitionTo("contacts.item", { id: 6 });
    await wait(100);
    expect(JQLite(template[0].querySelector("a")).attr("class")).toBe("active");

    $state.transitionTo("contacts.item", { id: 5 });
    await wait(100);
    expect(JQLite(template[0].querySelector("a")).attr("class")).toBe("");
  });

  it("should match on any child state refs", async () => {
    el = JQLite(
      '<div ng-sref-active="active"><a ng-sref="contacts.item({ id: 1 })">Contacts</a><a ng-sref="contacts.item({ id: 2 })">Contacts</a></div>',
    );
    template = $compile(el)($rootScope);
    expect(JQLite(template[0]).attr("class")).toBeUndefined();

    $state.transitionTo("contacts.item", { id: 1 });
    await wait(100);
    expect(JQLite(template[0]).attr("class")).toBe("active");

    $state.transitionTo("contacts.item", { id: 2 });
    await wait(100);
    expect(JQLite(template[0]).attr("class")).toBe("active");
  });

  it("should match fuzzy on lazy loaded states", async () => {
    el = JQLite(
      '<div><a ng-sref="contacts.lazy" ng-sref-active="active">Lazy Contact</a></div>',
    );
    template = $compile(el)($rootScope);
    await wait(100);

    _stateProvider.onInvalid(function ($to$) {
      if ($to$.name() === "contacts.lazy") {
        _stateProvider.state({ name: "contacts.lazy" });
        return $to$;
      }
    });

    $state.transitionTo("contacts.item", { id: 1 });
    await wait(100);
    expect(JQLite(template[0].querySelector("a")).attr("class")).toBeFalsy();

    $state.transitionTo("contacts.lazy");
    await wait(100);
    expect(JQLite(template[0].querySelector("a")).attr("class")).toBe("active");
  });

  it("should match exactly on lazy loaded states", async () => {
    el = JQLite(
      '<div><a ng-sref="contacts.lazy" ng-sref-active-eq="active">Lazy Contact</a></div>',
    );
    template = $compile(el)($rootScope);
    await wait(100);

    _stateProvider.onInvalid(function ($to$) {
      if ($to$.name() === "contacts.lazy") {
        _stateProvider.state({ name: "contacts.lazy" });
        return $to$;
      }
    });

    $state.transitionTo("contacts.item", { id: 1 });
    await wait(100);
    expect(JQLite(template[0].querySelector("a")).attr("class")).toBeFalsy();

    $state.transitionTo("contacts.lazy");
    await wait(100);
    expect(JQLite(template[0].querySelector("a")).attr("class")).toBe("active");
  });

  it("should allow multiple classes to be supplied", async () => {
    template = $compile(
      '<div><a ng-sref="contacts.item({ id: 1 })" ng-sref-active="active also-active">Contacts</a></div>',
    )($rootScope);
    const a = JQLite(template[0].getElementsByTagName("a")[0]);

    $state.transitionTo("contacts.item.edit", { id: 1 });
    await wait(100);
    expect(a.attr("class")).toMatch(/active also-active/);
  });

  // TODO does not work
  xit("should not match fuzzy on lazy loaded future states", async () => {
    _stateProvider.state({
      name: "contacts.lazy.**",
      url: "/lazy",
      lazyLoad: () => {
        return $q.resolve().then(() => {
          _stateProvider
            .state({ name: "contacts.lazy", abstract: true, url: "/lazy" })
            .state({ name: "contacts.lazy.s1", url: "/s1" })
            .state({ name: "contacts.lazy.s2", url: "/s2" });
        });
      },
    });
    template = $compile(
      '<div ng-sref-active="active"><a ng-sref="contacts.lazy.s1">Lazy</a></div><div ng-sref-active="active"><a ng-sref="contacts.lazy.s2"></a></div>',
    )($rootScope);
    $state.transitionTo("contacts.lazy.s1");
    await wait(100);

    expect(template.eq(0)[0].hasClass("active")).toBeTruthy();
    //expect(template.eq(1).hasClass("active")).toBeFalsy();
  });

  // TODO investigate why transitions error out
  xdescribe("ng-{class,style} interface", () => {
    it("should match on abstract states that are included by the current state", async () => {
      el = $compile(
        '<div ng-sref-active="{active: \'admin.*\'}"><a ng-sref-active="active" ng-sref="admin.roles">Roles</a></div>',
      )($rootScope);
      $state.transitionTo("admin.roles");
      await wait(100);
      const abstractParent = el[0];
      expect(abstractParent.className).toMatch(/active/);
      const child = el[0].querySelector("a");
      expect(child.className).toMatch(/active/);
    });

    it("should match on state parameters", async () => {
      el = $compile(
        "<div ng-sref-active=\"{active: 'admin.roles({page: 1})'}\"></div>",
      )($rootScope);
      $state.transitionTo("admin.roles", { page: 1 });
      await wait(100);
      expect(el[0].className).toMatch(/active/);
    });

    it("should shadow the state provided by ng-sref", async () => {
      el = $compile(
        '<div ng-sref-active="{active: \'admin.roles({page: 1})\'}"><a ng-sref="admin.roles"></a></div>',
      )($rootScope);
      $state.transitionTo("admin.roles");
      await wait(100);
      expect(el[0].className).not.toMatch(/active/);
      $state.transitionTo("admin.roles", { page: 1 });
      await wait(100);
      expect(el[0].className).toMatch(/active/);
    });

    it("should support multiple <className, stateOrName> pairs", async () => {
      el = $compile(
        "<div ng-sref-active=\"{contacts: 'contacts.**', admin: 'admin.roles({page: 1})'}\"></div>",
      )($rootScope);
      $state.transitionTo("contacts");
      await wait(100);
      expect(el[0].className).toMatch(/contacts/);
      expect(el[0].className).not.toMatch(/admin/);
      $state.transitionTo("admin.roles", { page: 1 });
      await wait(100);
      expect(el[0].className).toMatch(/admin/);
      expect(el[0].className).not.toMatch(/contacts/);
    });

    it("should update the active classes when compiled", async () => {
      $state.transitionTo("admin.roles");
      await wait(100);
      el = $compile("<div ng-sref-active=\"{active: 'admin.roles'}\"/>")(
        $rootScope,
      );
      timeoutFlush();
      expect(el.hasClass("active")).toBeTruthy();
    });

    it("should not match fuzzy on lazy loaded future states", async () => {
      _stateProvider.state({
        name: "contacts.lazy.**",
        url: "/lazy",
        lazyLoad: () => {
          return $q.resolve().then(() => {
            _stateProvider
              .state({ name: "contacts.lazy", abstract: true, url: "/lazy" })
              .state({ name: "contacts.lazy.s1", url: "/s1" })
              .state({ name: "contacts.lazy.s2", url: "/s2" });
          });
        },
      });
      template = $compile(
        '<div ng-sref-active="{ active: \'contacts.lazy.s1\' }"><a ng-sref="contacts.lazy.s1">Lazy</a></div><div ng-sref-active="{ active: \'contacts.lazy.s2\' }"></div>',
      )($rootScope);
      $state.transitionTo("contacts.lazy.s1");
      await wait(100);
      expect(template.eq(0).hasClass("active")).toBeTruthy();
      expect(template.eq(1).hasClass("active")).toBeFalsy();
    });
  });

  xdescribe("ng-{class,style} interface, and handle values as arrays", () => {
    it("should match on abstract states that are included by the current state", async () => {
      el = $compile(
        '<div ng-sref-active="{active: [\'randomState.**\', \'admin.roles\']}"><a ng-sref-active="active" ng-sref="admin.roles">Roles</a></div>',
      )($rootScope);
      $state.transitionTo("admin.roles");
      await wait(100);
      const abstractParent = el[0];
      expect(abstractParent.className).toMatch(/active/);
      const child = el[0].querySelector("a");
      expect(child.className).toMatch(/active/);
    });

    it("should match on state parameters", async () => {
      el = $compile(
        "<div ng-sref-active=\"{active: ['admin.roles({page: 1})']}\"></div>",
      )($rootScope);
      $state.transitionTo("admin.roles", { page: 1 });
      await wait(100);
      expect(el[0].className).toMatch(/active/);
    });

    it("should support multiple <className, stateOrName> pairs", async () => {
      el = $compile(
        "<div ng-sref-active=\"{contacts: ['contacts.item', 'contacts.item.detail'], admin: 'admin.roles({page: 1})'}\"></div>",
      )($rootScope);
      $state.transitionTo("contacts.item.detail", { id: 1, foo: "bar" });
      await wait(100);
      expect(el[0].className).toMatch(/contacts/);
      expect(el[0].className).not.toMatch(/admin/);
      $state.transitionTo("admin.roles", { page: 1 });
      await wait(100);
      expect(el[0].className).toMatch(/admin/);
      expect(el[0].className).not.toMatch(/contacts/);
    });

    it("should update the active classes when compiled", async () => {
      $state.transitionTo("admin.roles");
      await wait(100);
      el = $compile(
        "<div ng-sref-active=\"{active: ['admin.roles', 'admin.someOtherState']}\"/>",
      )($rootScope);
      timeoutFlush();
      expect(el.hasClass("active")).toBeTruthy();
    });
  });
});
