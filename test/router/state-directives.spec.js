import { jqLite } from "../../src/jqLite";
import { Angular } from "../../src/loader";
import { publishExternalAPI } from "../../src/public";
import { browserTrigger, wait } from "../test-utils";

fdescribe("uiStateRef", () => {
  window.location.hash = "#!";
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
    $stateParams;

  beforeEach(() => {
    window.angular = new Angular();
    publishExternalAPI();
    let module = window.angular.module("defaultModule", ["ui.router"]);
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
            '<a ui-sref=".item({ id: 5 })" class="item">Person</a> <ui-view></ui-view>',
        })
        .state({
          name: "contacts.item",
          url: "/{id:int}",
          template:
            '<a ui-sref=".detail" class="item-detail">Detail</a> | <a ui-sref="^" class="item-parent">Parent</a> | <ui-view></ui-view>',
        })
        .state({
          name: "contacts.item.detail",
          template:
            '<div class="title">Detail</div> | <a ui-sref="^" class="item-parent2">Item</a>',
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

  afterEach(() => (window.location.hash = "#!"));

  describe("links with promises", () => {
    it("should update the href when promises on parameters change before scope is applied", async () => {
      const defer = $q.defer();
      el = jqLite(
        '<a ui-sref="contacts.item.detail({ id: contact.id })">Details</a>',
      );
      defer.promise.then((val) => {
        $rootScope.contact = val;
      });
      defer.resolve({ id: 6 });
      el = $compile(el)($rootScope);

      $rootScope.$digest();
      expect(el.attr("href")).toBe("#/contacts/6");
    });
  });

  function buildDOM() {
    window.location.hash = "#";
    el = jqLite(
      '<a ui-sref="contacts.item.detail({ id: contact.id })">Details</a>',
    );
    el2 = jqLite('<a ui-sref="top">Top</a>');
    scope = $rootScope;
    scope.contact = { id: 5 };
    scope.$apply();

    $compile(el)(scope);
    $compile(el2)(scope);
    scope.$digest();
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
      el = jqLite(
        '<a ui-sref="contacts.item.detail({\n\tid: $index\n})">Details</a>',
      );
      $rootScope.$index = 3;
      $rootScope.$apply();

      $compile(el)($rootScope);
      $rootScope.$digest();
      expect(el.attr("href")).toBe("#/contacts/3");
    });

    it("should transition states when left-clicked", async () => {
      browserTrigger(el, "click");
      await wait(200);
      expect($state.current.name).toEqual("contacts.item.detail");
      expect($stateParams.id).toEqual(5);
    });

    it("should not transition states when ctrl-clicked", async () => {
      jqLite(el)[0].dispatchEvent(
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
      jqLite(el)[0].dispatchEvent(new MouseEvent("click", { metaKey: true }));
      expect($state.current.name).toEqual("");
      expect($stateParams.id).toBeUndefined();
    });

    it("should not transition states when shift-clicked", async () => {
      jqLite(el)[0].dispatchEvent(new MouseEvent("click", { shiftKey: true }));
      expect($state.current.name).toEqual("top");
      expect($stateParams.id).toBeUndefined();
    });

    // TODO investigate further why this fails
    xit("should not transition states when alt-clicked", async () => {
      expect($state.current.name).toEqual("");

      jqLite(el)[0].dispatchEvent(new MouseEvent("click", { altKey: true }));
      expect($state.current.name).toEqual("top");
      expect($stateParams.id).toBeUndefined();
    });

    it("should not transition states when alt-clicked", async () => {
      expect($state.current.name).toEqual("top");

      jqLite(el)[0].dispatchEvent(new MouseEvent("click", { button: 1 }));
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
      $rootScope.$digest();

      el = jqLite('<a ui-sref="{id: $index}">Details</a>');
      $compile(el)($rootScope);
      $rootScope.$digest();

      expect($state.current.name).toBe("other");
      expect($state.params.id).toEqual("abc");
      expect(el.attr("href")).toBe("#/other/def");

      browserTrigger(el, "click");
      await wait(100);
      expect($state.current.name).toBe("other");
      expect($state.params.id).toEqual("def");

      $rootScope.$index = "ghi";
      $state.go("other.detail");
      $rootScope.$digest();

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
      $rootScope.$digest();

      el = jqLite('<a ui-sref="{\n\tid: $index\n}">Details</a>');
      $rootScope.$index = 3;
      $rootScope.$apply();

      $compile(el)($rootScope);
      $rootScope.$digest();
      expect(el.attr("href")).toBe("#/contacts/3");
    });

    it("should take an object as a parameter and update properly on digest churns", async () => {
      el = jqLite(
        '<div><a ui-sref="contacts.item.detail(urlParams)">Contacts</a></div>',
      );
      template = $compile(el)($rootScope);

      $rootScope.urlParams = { id: 1 };
      $rootScope.$digest();
      expect(jqLite(template[0].querySelector("a")).attr("href")).toBe(
        "#/contacts/1",
      );

      $rootScope.urlParams.id = 2;
      $rootScope.$digest();
      expect(jqLite(template[0].querySelector("a")).attr("href")).toBe(
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
      el = jqLite(
        '<a ui-sref-active="active" ui-sref-active-eq="activeeq" ui-state="state" ui-state-params="params">state</a>',
      );
      scope = $rootScope;
      Object.assign(scope, { state: "contacts", params: {} });
      template = $compile(el)(scope);
      scope.$digest();
    });

    it("sets the correct initial href", () => {
      expect(jqLite(template[0]).attr("href")).toBe("#/contacts");
    });

    it("updates to the new href", () => {
      expect(jqLite(template[0]).attr("href")).toBe("#/contacts");

      scope.state = "contacts.item";
      scope.params = { id: 5 };
      scope.$digest();
      expect(jqLite(template[0]).attr("href")).toBe("#/contacts/5");

      scope.params.id = 25;
      scope.$digest();
      expect(jqLite(template[0]).attr("href")).toBe("#/contacts/25");
    });

    it("updates a linked ui-sref-active", async () => {
      expect(template[0].className).not.toContain("active");
      expect(template[0].className).not.toContain("activeeq");

      $state.go("contacts");
      scope.$digest();
      await wait(100);
      expect(template[0].className).toContain("active activeeq");

      scope.state = "contacts.item";
      scope.params = { id: 5 };
      scope.$digest();
      await wait(100);
      expect(template[0].className).not.toContain("active");
      expect(template[0].className).not.toContain("activeeq");

      $state.go("contacts.item", { id: -5 });
      scope.$digest();
      await wait(100);
      expect(template[0].className).not.toContain("active");
      expect(template[0].className).not.toContain("activeeq");

      $state.go("contacts.item", { id: 5 });
      scope.$digest();
      await wait(100);
      expect(template[0].className).toContain("active activeeq");

      scope.state = "contacts";
      scope.params = {};
      scope.$digest();
      await wait(100);
      expect(template[0].className).toContain("active");
      expect(template[0].className).not.toContain("activeeq");
    });

    it("updates to a new href when it points to a new state", () => {
      expect(jqLite(template[0]).attr("href")).toBe("#/contacts");
      scope.state = "other";
      scope.params = { id: "123" };
      scope.$digest();
      expect(jqLite(template[0]).attr("href")).toBe("#/other/123");
    });

    it("should allow passing params to current state using empty ui-state", async () => {
      $state.go("other", { id: "abc" });
      $rootScope.$index = "def";
      $rootScope.$digest();

      el = jqLite('<a ui-state="" ui-state-params="{id: $index}">Details</a>');
      $compile(el)($rootScope);
      $rootScope.$digest();

      expect($state.current.name).toBe("other");
      expect($state.params.id).toEqual("abc");
      expect(el.attr("href")).toBe("#/other/def");

      browserTrigger(el, "click");
      await wait(100);

      expect($state.current.name).toBe("other");
      expect($state.params.id).toEqual("def");

      $rootScope.$index = "ghi";
      $state.go("other.detail");
      $rootScope.$digest();

      expect($state.current.name).toBe("other.detail");
      expect($state.params.id).toEqual("def");

      expect(el.attr("href")).toBe("#/other/ghi/detail");

      browserTrigger(el, "click");
      await wait(100);

      expect($state.current.name).toBe("other.detail");
      expect($state.params.id).toEqual("ghi");
    });

    it("retains the old href if the new points to a non-state", () => {
      expect(jqLite(template[0]).attr("href")).toBe("#/contacts");
      scope.state = "nostate";
      scope.$digest();
      expect(jqLite(template[0]).attr("href")).toBe("#/contacts");
    });

    it("accepts param overrides", () => {
      scope.state = "contacts.item";
      scope.params = { id: 10 };
      scope.$digest();
      expect(jqLite(template[0]).attr("href")).toBe("#/contacts/10");
    });

    it("accepts param overrides", () => {
      scope.state = "contacts.item";
      scope.params = { id: 10 };
      scope.$digest();
      expect(jqLite(template[0]).attr("href")).toBe("#/contacts/10");

      scope.params.id = 22;
      scope.$digest();
      expect(jqLite(template[0]).attr("href")).toBe("#/contacts/22");
    });

    it("watches attributes", () => {
      el = jqLite(
        '<a ui-state="{{exprvar}}" ui-state-params="params">state</a>',
      );
      template = $compile(el)(scope);

      scope.exprvar = "state1";
      scope.state1 = "contacts.item";
      scope.state2 = "other";
      scope.params = { id: 10 };
      scope.$digest();
      expect(jqLite(template[0]).attr("href")).toBe("#/contacts/10");

      scope.exprvar = "state2";
      scope.$digest();
      expect(jqLite(template[0]).attr("href")).toBe("#/other/10");
    });

    it("allows one-time-binding on ng1.3+", () => {
      el = jqLite('<a ui-state="::state" ui-state-params="::params">state</a>');

      scope.state = "contacts.item";
      scope.params = { id: 10 };
      template = $compile(el)(scope);
      scope.$digest();
      expect(jqLite(template[0]).attr("href")).toBe("#/contacts/10");

      scope.state = "other";
      scope.params = { id: 22 };

      scope.$digest();
      expect(jqLite(template[0]).attr("href")).toBe("#/contacts/10");
    });

    it("accepts option overrides", async () => {
      let transitionOptions;

      el = jqLite('<a ui-state="state" ui-state-opts="opts">state</a>');
      scope.state = "contacts";
      scope.opts = { reload: true };
      template = $compile(el)(scope);
      scope.$digest();

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
        expect($state.current.name).toBe("top");

        el = jqLite('<a ui-state="state"></a>');

        scope.state = "contacts";
        $compile(el)(scope);
        scope.$digest();

        browserTrigger(el, "click");
        await wait(100);

        expect($state.current.name).toBe("contacts");
      });

      it("should bind single HTML events", async () => {
        expect($state.current.name).toEqual("top");

        el = jqLite(
          '<input type="text" ui-state="state" ui-state-opts="{ events: [\'change\'] }">',
        );

        scope.state = "contacts";
        $compile(el)(scope);
        scope.$digest();

        browserTrigger(el, "change");
        await wait(100);

        expect($state.current.name).toEqual("contacts");
      });

      it("should bind multiple HTML events", async () => {
        expect($state.current.name).toEqual("top");

        el = jqLite(
          '<input type="text" ui-state="state" ui-state-opts="{ events: [\'change\', \'blur\'] }">',
        );

        scope.state = "contacts";
        $compile(el)(scope);
        scope.$digest();

        browserTrigger(el, "change");
        await wait(100);
        expect($state.current.name).toEqual("contacts");

        $state.go("top");
        scope.$digest();

        expect($state.current.name).toEqual("top");

        browserTrigger(el, "blur");
        await wait(100);

        expect($state.current.name).toEqual("contacts");
      });

      it("should bind multiple Mouse events", async () => {
        expect($state.current.name).toEqual("top");

        el = jqLite(
          "<a ui-state=\"state\" ui-state-opts=\"{ events: ['mouseover', 'mousedown'] }\">",
        );

        scope.state = "contacts";
        $compile(el)(scope);
        scope.$digest();

        browserTrigger(el, "mouseover");
        await wait(100);
        expect($state.current.name).toEqual("contacts");

        $state.go("top");
        scope.$digest();

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
      el = jqLite(
        '<form ui-sref="contacts.item.detail({ id: contact.id })"></form>',
      );
      scope = $rootScope;
      scope.contact = { id: 5 };
      scope.$apply();

      $compile(el)(scope);
      scope.$digest();
    });

    it("should generate the correct action", () => {
      expect(el.attr("action")).toBe("#/contacts/5");
    });
  });

  describe("relative transitions", () => {
    beforeEach(() => {
      $state.transitionTo("contacts.item", { id: 5 });
      el = jqLite('<a ui-sref=".detail">Details</a>');
      scope = $rootScope;
      scope.$apply();

      $compile(el)(scope);
      template = $compile(jqLite("<div><ui-view></ui-view><div>"))(scope);
      scope.$digest();
    });

    it("should work", async () => {
      browserTrigger(el, "click");
      await wait(100);

      expect($state.$current.name).toBe("contacts.item.detail");
      expect($state.params.id).toEqual(5);
    });

    it("should resolve states from parent uiView", async () => {
      $state.transitionTo("contacts");

      const parentToChild = jqLite(template[0].querySelector("a.item"));
      browserTrigger(parentToChild, "click");
      await wait(100);

      expect($state.$current.name).toBe("contacts.item");

      const childToGrandchild = jqLite(
        template[0].querySelector("a.item-detail"),
      );
      const childToParent = jqLite(template[0].querySelector("a.item-parent"));

      browserTrigger(childToGrandchild, "click");
      await wait(100);

      const grandchildToParent = jqLite(
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
    beforeEach(() => (window.location.hash = ""));
    it("should bind click event by default", async () => {
      el = jqLite('<a ui-sref="contacts"></a>');
      $compile(el)($rootScope);
      $rootScope.$digest();

      expect($state.current.name).toEqual("top");

      browserTrigger(el, "click");
      await wait(100);

      expect($state.current.name).toEqual("contacts");
    });

    it("should bind single HTML events", async () => {
      el = jqLite(
        '<input type="text" ui-sref="contacts" ui-sref-opts="{ events: [\'change\'] }">',
      );
      $compile(el)($rootScope);
      $rootScope.$digest();

      expect($state.current.name).toEqual("top");

      browserTrigger(el, "change");
      await wait(100);

      expect($state.current.name).toEqual("contacts");
    });

    it("should bind multiple HTML events", async () => {
      el = jqLite(
        '<input type="text" ui-sref="contacts" ui-sref-opts="{ events: [\'change\', \'blur\'] }">',
      );
      $compile(el)($rootScope);
      $rootScope.$digest();

      expect($state.current.name).toEqual("top");

      browserTrigger(el, "change");
      await wait(100);
      expect($state.current.name).toEqual("contacts");

      $state.go("top");
      $rootScope.$digest();

      expect($state.current.name).toEqual("top");

      browserTrigger(el, "blur");
      await wait(100);
      expect($state.current.name).toEqual("contacts");
    });

    it("should bind multiple Mouse events", async () => {
      el = jqLite(
        "<a ui-sref=\"contacts\" ui-sref-opts=\"{ events: ['mouseover', 'mousedown'] }\">",
      );
      $compile(el)($rootScope);
      $rootScope.$digest();

      expect($state.current.name).toEqual("top");

      browserTrigger(el, "mouseover");
      await wait(100);
      expect($state.current.name).toEqual("contacts");

      $state.go("top");
      $rootScope.$digest();

      expect($state.current.name).toEqual("top");

      browserTrigger(el, "mousedown");
      await wait(100);
      expect($state.current.name).toEqual("contacts");
    });
  });
});

describe("uiSrefActive", () => {
  window.location.hash = "#!";
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
    window.location.hash = "#!";
    window.angular = new Angular();
    publishExternalAPI();
    let module = window.angular.module("defaultModule", ["ui.router"]);
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
                '<a ui-sref=".item({ id: 6 })" ui-sref-active="active">Contacts</a>',
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
          template: "<ui-view/>",
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

  it("should update class for sibling uiSref", async () => {
    el = jqLite(
      '<div><a ui-sref="contacts.item({ id: 1 })" ui-sref-active="active">Contacts</a><a ui-sref="contacts.item({ id: 2 })" ui-sref-active="active">Contacts</a></div>',
    );
    template = $compile(el)($rootScope);
    $rootScope.$digest();

    expect(jqLite(template[0].querySelector("a")).attr("class")).toBeFalsy();
    $state.transitionTo("contacts.item", { id: 1 });
    await wait(100);
    expect(jqLite(template[0].querySelector("a")).attr("class")).toBe("active");

    $state.transitionTo("contacts.item", { id: 2 });
    await wait(100);
    expect(jqLite(template[0].querySelector("a")).attr("class")).toBeFalsy();
  });

  it("should match state's parameters", async () => {
    el = jqLite(
      '<div><a ui-sref="contacts.item.detail({ foo: \'bar\' })" ui-sref-active="active">Contacts</a></div>',
    );
    template = $compile(el)($rootScope);
    $rootScope.$digest();

    expect(jqLite(template[0].querySelector("a")).attr("class")).toBeFalsy();
    $state.transitionTo("contacts.item.detail", { id: 5, foo: "bar" });
    await wait(100);
    expect(jqLite(template[0].querySelector("a")).attr("class")).toBe("active");

    $state.transitionTo("contacts.item.detail", { id: 5, foo: "baz" });
    await wait(100);
    expect(jqLite(template[0].querySelector("a")).attr("class")).toBeFalsy();
  });

  // Test for #2696
  it("should compare using typed parameters", async () => {
    el = jqLite(
      '<div><a ui-sref="arrayparam({ foo: [1,2,3] })" ui-sref-active="active">foo 123</a></div>',
    );
    template = $compile(el)($rootScope);
    $rootScope.$digest();

    expect(jqLite(template[0].querySelector("a")).attr("class")).toBeFalsy();

    $state.transitionTo("arrayparam", { foo: [1, 2, 3] });
    await wait(100);
    expect(jqLite(template[0].querySelector("a")).attr("class")).toBe("active");

    $state.transitionTo("arrayparam", { foo: [1, 2, 3], bar: "asdf" });
    await wait(100);
    expect(jqLite(template[0].querySelector("a")).attr("class")).toBe("active");

    $state.transitionTo("arrayparam", { foo: [1, 2] });
    await wait(100);
    expect(jqLite(template[0].querySelector("a")).attr("class")).toBeFalsy();
  });

  // Test for #3154
  it("should compare ui-sref-active-eq using typed parameters", async () => {
    el = jqLite(
      '<div><a ui-sref="arrayparam({ foo: [1,2,3] })" ui-sref-active-eq="active">foo 123</a></div>',
    );
    template = $compile(el)($rootScope);
    $rootScope.$digest();

    expect(jqLite(template[0].querySelector("a")).attr("class")).toBeFalsy();

    $state.transitionTo("arrayparam", { foo: [1, 2, 3] });
    await wait(100);
    expect(jqLite(template[0].querySelector("a")).attr("class")).toBe("active");

    $state.transitionTo("arrayparam", { foo: [1, 2, 3], bar: "asdf" });
    await wait(100);
    expect(jqLite(template[0].querySelector("a")).attr("class")).toBe("active");

    $state.transitionTo("arrayparam", { foo: [1, 2] });
    await wait(100);
    expect(jqLite(template[0].querySelector("a")).attr("class")).toBeFalsy();
  });

  it("should update in response to ui-sref param expression changes", async () => {
    el = jqLite(
      '<div><a ui-sref="contacts.item.detail({ foo: fooId })" ui-sref-active="active">Contacts</a></div>',
    );
    template = $compile(el)($rootScope);
    $rootScope.fooId = "bar";
    $rootScope.$digest();

    expect(jqLite(template[0].querySelector("a")).attr("class")).toBeFalsy();
    $state.transitionTo("contacts.item.detail", { id: 5, foo: "bar" });
    await wait(100);
    expect(jqLite(template[0].querySelector("a")).attr("class")).toBe("active");

    $rootScope.fooId = "baz";
    $rootScope.$digest();
    await wait(100);
    expect(jqLite(template[0].querySelector("a")).attr("class")).toBeFalsy();
  });

  it("should match on child states", async () => {
    template = $compile(
      '<div><a ui-sref="contacts.item({ id: 1 })" ui-sref-active="active">Contacts</a></div>',
    )($rootScope);
    $rootScope.$digest();
    const a = jqLite(template[0].getElementsByTagName("a")[0]);

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
      '<div><a ui-sref="contacts.item({ id: 1 })" ui-sref-active-eq="active">Contacts</a></div>',
    )($rootScope);
    $rootScope.$digest();
    const a = jqLite(template[0].getElementsByTagName("a")[0]);

    $state.transitionTo("contacts.item", { id: 1 });
    await wait(100);
    expect(a.attr("class")).toMatch(/active/);

    $state.transitionTo("contacts.item.edit", { id: 1 });
    await wait(100);
    expect(a.attr("class")).not.toMatch(/active/);
  });

  it("should match on child states when active-equals and active-equals-eq is used", async () => {
    template = $compile(
      '<div><a ui-sref="contacts.item({ id: 1 })" ui-sref-active="active" ui-sref-active-eq="active-eq">Contacts</a></div>',
    )($rootScope);
    $rootScope.$digest();
    const a = jqLite(template[0].getElementsByTagName("a")[0]);

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
    el = jqLite("<section><div ui-view></div></section>");
    template = $compile(el)($rootScope);
    $rootScope.$digest();

    $state.transitionTo("contacts");
    await wait(100);
    expect(
      jqLite(template[0].querySelector("a")).attr("class"),
    ).toBeUndefined();

    $state.transitionTo("contacts.item", { id: 6 });
    await wait(100);
    expect(jqLite(template[0].querySelector("a")).attr("class")).toBe("active");

    $state.transitionTo("contacts.item", { id: 5 });
    await wait(100);
    expect(jqLite(template[0].querySelector("a")).attr("class")).toBe("");
  });

  it("should match on any child state refs", async () => {
    el = jqLite(
      '<div ui-sref-active="active"><a ui-sref="contacts.item({ id: 1 })">Contacts</a><a ui-sref="contacts.item({ id: 2 })">Contacts</a></div>',
    );
    template = $compile(el)($rootScope);
    $rootScope.$digest();

    expect(jqLite(template[0]).attr("class")).toBeUndefined();

    $state.transitionTo("contacts.item", { id: 1 });
    await wait(100);
    expect(jqLite(template[0]).attr("class")).toBe("active");

    $state.transitionTo("contacts.item", { id: 2 });
    await wait(100);
    expect(jqLite(template[0]).attr("class")).toBe("active");
  });

  it("should match fuzzy on lazy loaded states", async () => {
    el = jqLite(
      '<div><a ui-sref="contacts.lazy" ui-sref-active="active">Lazy Contact</a></div>',
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
    expect(jqLite(template[0].querySelector("a")).attr("class")).toBeFalsy();

    $state.transitionTo("contacts.lazy");
    await wait(100);
    expect(jqLite(template[0].querySelector("a")).attr("class")).toBe("active");
  });

  it("should match exactly on lazy loaded states", async () => {
    el = jqLite(
      '<div><a ui-sref="contacts.lazy" ui-sref-active-eq="active">Lazy Contact</a></div>',
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
    expect(jqLite(template[0].querySelector("a")).attr("class")).toBeFalsy();

    $state.transitionTo("contacts.lazy");
    await wait(100);
    expect(jqLite(template[0].querySelector("a")).attr("class")).toBe("active");
  });

  it("should allow multiple classes to be supplied", async () => {
    template = $compile(
      '<div><a ui-sref="contacts.item({ id: 1 })" ui-sref-active="active also-active">Contacts</a></div>',
    )($rootScope);
    $rootScope.$digest();
    const a = jqLite(template[0].getElementsByTagName("a")[0]);

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
        return $q.when().then(() => {
          _stateProvider
            .state({ name: "contacts.lazy", abstract: true, url: "/lazy" })
            .state({ name: "contacts.lazy.s1", url: "/s1" })
            .state({ name: "contacts.lazy.s2", url: "/s2" });
        });
      },
    });
    template = $compile(
      '<div ui-sref-active="active"><a ui-sref="contacts.lazy.s1">Lazy</a></div><div ui-sref-active="active"><a ui-sref="contacts.lazy.s2"></a></div>',
    )($rootScope);
    $rootScope.$digest();
    $state.transitionTo("contacts.lazy.s1");
    await wait(100);

    expect(template.eq(0)[0].hasClass("active")).toBeTruthy();
    //expect(template.eq(1).hasClass("active")).toBeFalsy();
  });

  // TODO investigate why transitions error out
  xdescribe("ng-{class,style} interface", () => {
    it("should match on abstract states that are included by the current state", async () => {
      el = $compile(
        '<div ui-sref-active="{active: \'admin.*\'}"><a ui-sref-active="active" ui-sref="admin.roles">Roles</a></div>',
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
        "<div ui-sref-active=\"{active: 'admin.roles({page: 1})'}\"></div>",
      )($rootScope);
      $state.transitionTo("admin.roles", { page: 1 });
      await wait(100);
      expect(el[0].className).toMatch(/active/);
    });

    it("should shadow the state provided by ui-sref", async () => {
      el = $compile(
        '<div ui-sref-active="{active: \'admin.roles({page: 1})\'}"><a ui-sref="admin.roles"></a></div>',
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
        "<div ui-sref-active=\"{contacts: 'contacts.**', admin: 'admin.roles({page: 1})'}\"></div>",
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
      el = $compile("<div ui-sref-active=\"{active: 'admin.roles'}\"/>")(
        $rootScope,
      );
      $rootScope.$digest();
      timeoutFlush();
      expect(el.hasClass("active")).toBeTruthy();
    });

    it("should not match fuzzy on lazy loaded future states", async () => {
      _stateProvider.state({
        name: "contacts.lazy.**",
        url: "/lazy",
        lazyLoad: () => {
          return $q.when().then(() => {
            _stateProvider
              .state({ name: "contacts.lazy", abstract: true, url: "/lazy" })
              .state({ name: "contacts.lazy.s1", url: "/s1" })
              .state({ name: "contacts.lazy.s2", url: "/s2" });
          });
        },
      });
      template = $compile(
        '<div ui-sref-active="{ active: \'contacts.lazy.s1\' }"><a ui-sref="contacts.lazy.s1">Lazy</a></div><div ui-sref-active="{ active: \'contacts.lazy.s2\' }"></div>',
      )($rootScope);
      $rootScope.$digest();
      $state.transitionTo("contacts.lazy.s1");
      await wait(100);
      expect(template.eq(0).hasClass("active")).toBeTruthy();
      expect(template.eq(1).hasClass("active")).toBeFalsy();
    });
  });

  xdescribe("ng-{class,style} interface, and handle values as arrays", () => {
    it("should match on abstract states that are included by the current state", async () => {
      el = $compile(
        '<div ui-sref-active="{active: [\'randomState.**\', \'admin.roles\']}"><a ui-sref-active="active" ui-sref="admin.roles">Roles</a></div>',
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
        "<div ui-sref-active=\"{active: ['admin.roles({page: 1})']}\"></div>",
      )($rootScope);
      $state.transitionTo("admin.roles", { page: 1 });
      await wait(100);
      expect(el[0].className).toMatch(/active/);
    });

    it("should support multiple <className, stateOrName> pairs", async () => {
      el = $compile(
        "<div ui-sref-active=\"{contacts: ['contacts.item', 'contacts.item.detail'], admin: 'admin.roles({page: 1})'}\"></div>",
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
        "<div ui-sref-active=\"{active: ['admin.roles', 'admin.someOtherState']}\"/>",
      )($rootScope);
      $rootScope.$digest();
      timeoutFlush();
      expect(el.hasClass("active")).toBeTruthy();
    });
  });
});
