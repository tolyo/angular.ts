import { dealoc } from "../../shared/jqlite/jqlite";
import { Angular } from "../../loader";
import { isFunction } from "../../shared/utils";
import { wait } from "../../shared/test-utils";

describe("$state", () => {
  let $injector, template, ctrlName, $provide, $compile, module, $stateRegistry;
  let $stateProvider;

  function $get(what) {
    return $injector.get(what);
  }

  async function initStateTo(state, params) {
    const $state = $get("$state");
    return $state.transitionTo(state, params || {});
  }

  const A = {
      name: "A",
      data: {},
      controller: function () {
        log += "controller;";
      },
      template: "a",
    },
    B = { name: "B", template: "b" },
    C = { name: "C", template: "c" },
    D = { name: "D", params: { x: null, y: null }, template: "d" },
    DD = {
      name: "DD",
      parent: D,
      params: { x: null, y: null, z: null },
      template: "dd",
    },
    DDDD = {
      name: "DDDD",
      parent: D,
      controller: function () {},
      template: "hey",
    },
    E = { name: "E", params: { i: {} }, template: "e" },
    F = {
      name: "F",
      params: { a: "", b: false, c: 0, d: undefined, e: -1 },
      template: "f",
    },
    H = { name: "H", data: { propA: "propA", propB: "propB" }, template: "h" },
    HH = { name: "HH", parent: H, template: "hh" },
    HHH = {
      name: "HHH",
      parent: HH,
      data: { propA: "overriddenA", propC: "propC" },
      template: "hhh",
    },
    RS = {
      name: "RS",
      url: "^/search?term",
      reloadOnSearch: false,
      template: "rs",
    },
    OPT = {
      name: "OPT",
      url: "/opt/:param",
      params: { param: "100" },
      template: "opt",
    },
    OPT2 = {
      name: "OPT2",
      url: "/opt2/:param2/:param3",
      params: { param3: "300", param4: "400" },
      template: "opt2",
    },
    ISS2101 = {
      name: "ISS2101",
      params: { bar: { squash: false, value: "qux" } },
      url: "/2101/{bar:string}",
    },
    URLLESS = {
      name: "URLLESS",
      url: "/urllessparams",
      params: { myparam: { type: "int" } },
    },
    AppInjectable = {};

  let log, logEvents, logEnterExit;
  function callbackLogger(state, what) {
    return function () {
      if (logEnterExit) log += state.name + "." + what + ";";
    };
  }

  afterEach(() => {
    dealoc(document.getElementById("dummy"));
  });

  describe("provider", () => {
    beforeEach(() => {
      dealoc(document.getElementById("dummy"));
      // some tests are polluting the cache
      window.angular = new Angular();
      module = window.angular.module("defaultModule", []);
      module.config((_$stateProvider_, _$provide_) => {
        $stateProvider = _$stateProvider_;
      });
      window.angular.bootstrap(document.getElementById("dummy"), [
        "defaultModule",
      ]);
    });

    afterEach(() => {
      dealoc(document.getElementById("dummy"));
    });

    it("should be available at config", () => {
      expect($stateProvider).toBeDefined();
    });

    it("should should not allow states that are already registerred", () => {
      expect(() => {
        $stateProvider.state({ name: "toString", url: "/to-string" });
      }).not.toThrow();
      expect(() => {
        $stateProvider.state({ name: "toString", url: "/to-string" });
      }).toThrowError(/stateinvalid/);
    });

    it("should requred `name` if state definition object is passed", () => {
      expect(() => {
        $stateProvider.state({ url: "/to-string" });
      }).toThrowError(/stateinvalid/);
      expect(() => {
        $stateProvider.state({ name: "hasName", url: "/to-string" });
      }).not.toThrowError(/stateinvalid/);
    });
  });

  describe(".transitionTo()", function () {
    let $rootScope, $state, $stateParams, $transitions, $q, $location;

    beforeEach(() => {
      dealoc(document.getElementById("dummy"));
      window.angular = new Angular();
      module = window.angular.module("defaultModule", []);
      module.config((_$stateProvider_, _$provide_) => {
        $stateProvider = _$stateProvider_;
        $provide = _$provide_;

        [A, B, C, D, DD, E, H, HH, HHH].forEach(function (state) {
          state.onEnter = callbackLogger(state, "onEnter");
          state.onExit = callbackLogger(state, "onExit");
        });

        $stateProvider
          .state(A)
          .state(B)
          .state(C)
          .state(D)
          .state(DD)
          .state(DDDD)
          .state(E)
          .state(F)
          .state(H)
          .state(HH)
          .state(HHH)
          .state(RS)
          .state(OPT)
          .state(OPT2)
          .state(ISS2101)
          .state(URLLESS)
          .state({ name: "home", url: "/" })
          .state({ name: "home.item", url: "front/:id" })
          .state({
            name: "about",
            url: "/about",
            resolve: {
              stateInfo: function ($transition$) {
                return [$transition$.from().name, $transition$.to().name];
              },
            },
            onEnter: function (stateInfo) {
              log = stateInfo.join(" => ");
            },
          })
          .state({ name: "about.person", url: "/:person" })
          .state({ name: "about.person.item", url: "/:id" })
          .state({ name: "about.sidebar" })
          .state({
            name: "about.sidebar.item",
            url: "/:item",
            templateUrl: function (params) {
              templateParams = params;
              return "/templates/" + params.item + ".html";
            },
          })
          .state({
            name: "dynamicTemplate",
            url: "/dynamicTemplate/:type",
            templateProvider: function ($stateParams, foo) {
              template = $stateParams.type + foo + "Template";
              return template;
            },
            resolve: {
              foo: function () {
                return "Foo";
              },
            },
          })
          .state({
            name: "dynamicController",
            url: "/dynamicController/:type",
            template: "a",
            controllerProvider: [
              "$stateParams",
              function ($stateParams) {
                ctrlName = $stateParams.type + "Controller";
                return ctrlName;
              },
            ],
          })
          .state({
            name: "home.redirect",
            url: "redir",
            onEnter: function ($state) {
              $state.transitionTo("about");
            },
          })
          .state({
            name: "resolveFail",
            url: "/resolve-fail",
            resolve: {
              badness: function ($q) {
                return $q.reject("!");
              },
            },
            onEnter: function (badness) {},
          })
          .state({
            name: "resolveTimeout",
            url: "/resolve-timeout/:foo",
            resolve: {
              value: function ($timeout) {
                return setTimeout(function () {
                  log += "Success!";
                }, 1);
              },
            },
            onEnter: function (value) {},
            template: "-",
            controller: function () {
              log += "controller;";
            },
          })
          .state({ name: "badParam", url: "/bad/{param:int}" })
          .state({ name: "badParam2", url: "/bad2/{param:[0-9]{5}}" })

          .state({ name: "json", url: "/jsonstate/{param:json}" })

          .state({ name: "first", url: "^/first/subpath" })
          .state({ name: "second", url: "^/second" })

          // State param inheritance tests. param1 is inherited by sub1 & sub2;
          // param2 should not be transferred (unless explicitly set).
          .state({ name: "root", url: "^/root?param1" })
          .state({ name: "root.sub1", url: "/1?param2" })
          .state({
            name: "logA",
            url: "/logA",
            template: "<div> <div ng-view/></div>",
            controller: function () {
              log += "logA;";
            },
          })
          .state({
            name: "logA.logB",
            url: "/logB",
            views: {
              $default: {
                template: "<div> <div ng-view/></div>",
                controller: function () {
                  log += "logB;";
                },
              },
            },
          })
          .state({
            name: "logA.logB.logC",
            url: "/logC",
            views: {
              $default: {
                template: "<div> <div ng-view/></div>",
                controller: function () {
                  log += "logC;";
                },
              },
            },
          })
          .state({ name: "root.sub2", url: "/2?param2" });

        $provide.value("AppInjectable", AppInjectable);
      });

      $injector = window.angular.bootstrap(document.getElementById("dummy"), [
        "defaultModule",
      ]);

      $injector.invoke(
        (
          _$rootScope_,
          _$state_,
          _$stateParams_,
          _$transitions_,
          _$location_,
          _$compile_,
          _$stateRegistry_,
        ) => {
          $rootScope = _$rootScope_;
          $state = _$state_;
          $stateParams = _$stateParams_;
          $transitions = _$transitions_;
          $location = _$location_;
          $compile = _$compile_;
          $stateRegistry = _$stateRegistry_;
        },
      );
    });

    afterEach(() => {
      dealoc(document.getElementById("dummy"));
    });

    it("returns a promise for the target state", () => {
      const promise = $state.transitionTo(A, {});
      expect(isFunction(promise.then)).toBeTruthy();
      expect(promise.transition.to()).toBe(A);
    });

    it("returns a promise for the target state", () => {
      const promise = $state.transitionTo(A, {});
      expect(isFunction(promise.then)).toBeTruthy();
      expect(promise.transition.to()).toBe(A);
    });

    it("show return promise with an error on invalid state", (done) => {
      let res = $state.transitionTo("about.person.item", { id: 5 });
      setTimeout(() => {
        expect(res.$$state.status).toEqual(2);
        done();
      }, 100);
    });

    xit("allows transitions by name", (done) => {
      $state.transitionTo("A", {});
      setTimeout(() => {
        expect($state.current).toBe(A);
        done();
      }, 100);
    });

    describe("dynamic transitions", function () {
      let dynlog, paramsChangedLog;
      let dynamicstate, childWithParam, childNoParam;

      beforeEach(async () => {
        window.location.hash = "";
        dynlog = paramsChangedLog = "";
        dynamicstate = {
          name: "dyn",
          url: "^/dynstate/:path/:pathDyn?search&searchDyn",
          params: {
            pathDyn: { dynamic: true },
            searchDyn: { dynamic: true },
          },
          template: "dyn state. <div ng-view></div>",
          controller: function () {
            this.uiOnParamsChanged = function (updatedParams) {
              const paramNames = Object.keys(updatedParams).sort();
              const keyValues = paramNames.map(function (key) {
                return key + "=" + updatedParams[key];
              });
              dynlog += "[" + keyValues.join(",") + "];";
              paramsChangedLog += paramNames.join(",") + ";";
            };
          },
        };

        childWithParam = {
          name: "dyn.child",
          url: "/child",
          params: {
            config: "c1", // allow empty
            configDyn: { value: null, dynamic: true },
          },
          template: "dyn.child state",
          controller: function () {
            this.uiOnParamsChanged = function (updatedParams) {
              const paramNames = Object.keys(updatedParams).sort();
              const keyValues = paramNames.map(function (key) {
                return key + "=" + updatedParams[key];
              });
              dynlog += "{" + keyValues.join(",") + "};";
              paramsChangedLog += paramNames.join(",") + ";";
            };
          },
        };

        childNoParam = {
          name: "dyn.noparams",
          url: "/noparams",
          template: "dyn.noparams state",
          controller: function () {
            this.uiOnParamsChanged = function (updatedParams) {
              const paramNames = Object.keys(updatedParams).sort();
              const keyValues = paramNames.map(function (key) {
                return key + "=" + updatedParams[key];
              });
              dynlog += "<" + keyValues.join(",") + ">;";
              paramsChangedLog += paramNames.join(",") + ";";
            };
          },
        };

        $stateProvider.state(dynamicstate);
        $stateProvider.state(childWithParam);
        $stateProvider.state(childNoParam);

        $transitions.onEnter({}, function (trans, state) {
          dynlog += "enter:" + state.name + ";";
        });
        $transitions.onExit({}, function (trans, state) {
          dynlog += "exit:" + state.name + ";";
        });
        $transitions.onSuccess({}, function () {
          dynlog += "success;";
        });

        $compile("<div><ng-view></ng-view></div>")($rootScope.$new());
        await wait(100);
        await initStateTo(dynamicstate, {
          path: "p1",
          pathDyn: "pd1",
          search: "s1",
          searchDyn: "sd1",
        });
        expect(dynlog.endsWith("enter:dyn;success;")).toBeTrue();
        Object.entries({
          path: "p1",
          pathDyn: "pd1",
          search: "s1",
          searchDyn: "sd1",
        }).forEach(([k, v]) => {
          expect($stateParams[k]).toEqual(v);
        });
        expect($location.url()).toEqual(
          "/dynstate/p1/pd1?search=s1&searchDyn=sd1",
        );
      });

      describe("[ transition.dynamic() ]:", function () {
        it("is considered fully dynamic when only dynamic params have changed", function () {
          const promise = $state.go(".", { pathDyn: "pd2", searchDyn: "sd2" });
          expect(promise.transition.dynamic()).toBeTruthy();
        });

        it("is not considered fully dynamic if any state is entered", function () {
          const promise = $state.go(childWithParam);
          expect(promise.transition.dynamic()).toBeFalsy();
        });

        it("is not considered fully dynamic if any state is exited", async () => {
          await initStateTo(childWithParam, {
            config: "p1",
            path: "p1",
            pathDyn: "pd1",
            search: "s1",
            searchDyn: "sd1",
          });
          const promise = $state.go(dynamicstate);
          expect(promise.transition.dynamic()).toBeFalsy();
        });

        it("is not considered fully dynamic if any state is reloaded", function () {
          const promise = $state.go(dynamicstate, null, { reload: true });
          expect(promise.transition.dynamic()).toBeFalsy();
        });

        it("is not considered fully dynamic if any non-dynamic parameter changes", function () {
          const promise = $state.go(dynamicstate, { path: "p2" });
          expect(promise.transition.dynamic()).toBeFalsy();
        });
      });

      describe("[ promises ]", function () {
        beforeEach(() => (dynlog = ""));
        it("runs successful transition when fully dynamic", async () => {
          let transSuccess,
            promise = $state.go(dynamicstate, { searchDyn: "sd2" }),
            transition = promise.transition;
          transition.promise.then(function (result) {
            transSuccess = true;
          });
          await promise;
          await wait(100);
          expect(transition.dynamic()).toBeTruthy();
          expect(transSuccess).toBeTruthy();
          expect(dynlog).toBe("success;[searchDyn=sd2];");
        });

        it("resolves the $state.go() promise with the original/final state, when fully dynamic", async () => {
          await initStateTo(dynamicstate, {
            path: "p1",
            pathDyn: "pd1",
            search: "s1",
            searchDyn: "sd1",
          });
          let destState,
            promise = $state.go(dynamicstate, {
              pathDyn: "pd2",
              searchDyn: "sd2",
            });
          promise.then(function (result) {
            destState = result;
          });
          await promise;
          await wait(100);
          expect(promise.transition.dynamic()).toBeTruthy();
          expect($state.current).toBe(dynamicstate);
          expect(destState).toBe(dynamicstate);
        });
      });

      describe("[ enter/exit ]", function () {
        beforeEach(() => (dynlog = ""));
        it("does not exit nor enter any states when fully dynamic", async () => {
          const promise = $state.go(dynamicstate, { searchDyn: "sd2" });
          await promise;
          await wait(100);
          expect(promise.transition.dynamic()).toBeTruthy();
          expect(promise.transition.treeChanges().entering.length).toBe(0);
          expect(promise.transition.treeChanges().exiting.length).toBe(0);
          expect(promise.transition.treeChanges().retained.length).toBe(2);
          expect(dynlog).toBe("success;[searchDyn=sd2];");
          Object.entries({
            path: "p1",
            pathDyn: "pd1",
            search: "s1",
            searchDyn: "sd2",
          }).forEach(([k, v]) => {
            expect($stateParams[k]).toEqual(v);
          });
        });

        it("does not exit nor enter the state when only dynamic search params change", async () => {
          const promise = $state.go(dynamicstate, { searchDyn: "sd2" });
          await promise;
          expect(promise.transition.dynamic()).toBeTruthy();
          expect(dynlog).toBe("success;[searchDyn=sd2];");
          Object.entries({
            path: "p1",
            pathDyn: "pd1",
            search: "s1",
            searchDyn: "sd2",
          }).forEach(([k, v]) => {
            expect($stateParams[k]).toEqual(v);
          });
        });

        it("does not exit nor enter the state when only dynamic path params change", async () => {
          const promise = $state.go(dynamicstate, { pathDyn: "pd2" });
          await promise;
          expect(promise.transition.dynamic()).toBeTruthy();
          expect(dynlog).toBe("success;[pathDyn=pd2];");
          Object.entries({
            path: "p1",
            pathDyn: "pd2",
            search: "s1",
            searchDyn: "sd1",
          }).forEach(([k, v]) => {
            expect($stateParams[k]).toEqual(v);
          });
        });

        it("exits and enters a state when a non-dynamic search param changes", async () => {
          const promise = $state.go(dynamicstate, { search: "s2" });
          await promise;
          expect(promise.transition.dynamic()).toBeFalsy();
          expect(dynlog).toBe("exit:dyn;enter:dyn;success;");
          Object.entries({
            path: "p1",
            pathDyn: "pd1",
            search: "s2",
            searchDyn: "sd1",
          }).forEach(([k, v]) => {
            expect($stateParams[k]).toEqual(v);
          });
        });

        it("exits and enters a state when a non-dynamic path param changes", async () => {
          const promise = $state.go(dynamicstate, { path: "p2" });
          await promise;
          expect(promise.transition.dynamic()).toBeFalsy();
          expect(dynlog).toBe("exit:dyn;enter:dyn;success;");
          Object.entries({
            path: "p2",
            pathDyn: "pd1",
            search: "s1",
            searchDyn: "sd1",
          }).forEach(([k, v]) => {
            expect($stateParams[k]).toEqual(v);
          });
        });

        it("does not exit nor enter a state when only dynamic params change (triggered via url)", async () => {
          $location.search({ search: "s1", searchDyn: "sd2" });
          $rootScope.$broadcast("$locationChangeSuccess");
          await wait(100);
          expect(dynlog).toBe("success;[searchDyn=sd2];");
        });

        it("exits and enters a state when any non-dynamic params change (triggered via url)", async () => {
          $location.search({ search: "s2", searchDyn: "sd2" });
          $rootScope.$broadcast("$locationChangeSuccess");
          await wait(100);
          expect(dynlog).toBe("exit:dyn;enter:dyn;success;");
        });

        it("does not exit nor enter a state when only dynamic params change (triggered via $state transition)", async () => {
          await $state.go(".", { searchDyn: "sd2" }, { inherit: true });
          expect(dynlog).toBe("success;[searchDyn=sd2];");
        });
      });

      describe("[ global $stateParams service ]", function () {
        it("updates the global $stateParams object", async () => {
          await $state.go(dynamicstate, { searchDyn: "sd2" });

          Object.entries({
            path: "p1",
            pathDyn: "pd1",
            search: "s1",
            searchDyn: "sd2",
          }).forEach(([k, v]) => {
            expect($stateParams[k]).toEqual(v);
          });
        });

        it("updates $stateParams and $location.search when only dynamic params change (triggered via url)", async () => {
          $location.search({ search: "s1", searchDyn: "sd2" });
          $rootScope.$broadcast("$locationChangeSuccess");
          await wait(100);
          expect($stateParams.search).toBe("s1");
          expect($stateParams.searchDyn).toBe("sd2");
          expect($location.search()).toEqual({
            search: "s1",
            searchDyn: "sd2",
          });
        });

        it("updates $stateParams and $location.search when only dynamic params change (triggered via $state transition)", async () => {
          await $state.go(".", { searchDyn: "sd2" });
          expect($stateParams.search).toBe("s1");
          expect($stateParams.searchDyn).toBe("sd2");
          expect($location.search()).toEqual({
            search: "s1",
            searchDyn: "sd2",
          });
        });

        it("dynamic param changes can be observed by watching the global $stateParams", async () => {
          let observedParamValue;
          function stateParamsTerm() {
            return $stateParams.searchDyn;
          }
          $rootScope.$watch(stateParamsTerm, function (newval, oldval) {
            observedParamValue = newval;
          });
          await wait(100);

          $location.search({ search: "s1", searchDyn: "sd2" });
          $rootScope.$broadcast("$locationChangeSuccess");
          await wait(100);

          expect(observedParamValue).toBe("sd2");
        });
      });

      describe("[ uiOnParamsChanged ]", function () {
        beforeEach(() => (dynlog = ""));
        it("should be called when dynamic parameter values change", async () => {
          await $state.go(".", { searchDyn: "sd2" });

          expect(paramsChangedLog).toBe("searchDyn;");
        });

        it("should not be called if a non-dynamic parameter changes (causing the controller's state to exit/enter)", async () => {
          await $state.go(".", { search: "s2", searchDyn: "sd2" });

          expect(paramsChangedLog).toBe("");
        });

        it("should not be called, when entering a new state, if no parameter values change", async () => {
          await $state.go(childNoParam);

          expect(paramsChangedLog).toBe("");
        });

        it("should be called, when entering a new state, if any dynamic parameter value changed", async () => {
          await $state.go(childNoParam, { searchDyn: "sd2" });

          expect(paramsChangedLog).toBe("searchDyn;");
        });

        it("should be called, when entering a new state, if a new parameter value is added", async () => {
          await $state.go(childWithParam, { config: "c2" });

          expect(paramsChangedLog).toBe("config,configDyn;");
        });

        it("should be called, when reactivating the uiOnParamsChanged state, if a dynamic parameter changed", async () => {
          await initStateTo(childNoParam, {
            path: "p1",
            pathDyn: "pd1",
            search: "s1",
            searchDyn: "sd1",
          });
          dynlog = paramsChangedLog = "";

          await $state.go(dynamicstate, { pathDyn: "pd2" });

          expect(paramsChangedLog).toBe("pathDyn;");
        });

        it('should not be called, when reactivating the uiOnParamsChanged state "dyn", if any of dyns non-dynamic parameters changed', async () => {
          await initStateTo(childNoParam, {
            path: "p1",
            pathDyn: "pd1",
            search: "s1",
            searchDyn: "sd1",
          });
          dynlog = paramsChangedLog = "";

          await $state.go(dynamicstate, { path: "p2" });

          expect(paramsChangedLog).toBe("");
        });

        it("should be called with an object containing only the changed params", async () => {
          await $state.go(dynamicstate, { pathDyn: "pd2" });

          expect(dynlog).toBe("success;[pathDyn=pd2];");

          await $state.go(dynamicstate, { pathDyn: "pd3", searchDyn: "sd2" });
          await wait(100);
          expect(dynlog).toBe(
            "success;[pathDyn=pd2];success;[pathDyn=pd3,searchDyn=sd2];",
          );
        });

        it("should be called on all active controllers that have a uiOnParamsChanged", async () => {
          await initStateTo(childWithParam, {
            path: "p1",
            pathDyn: "pd1",
            search: "s1",
            searchDyn: "sd1",
            config: "p1",
            configDyn: "c1",
          });
          dynlog = paramsChangedLog = "";

          await $state.go(childWithParam, { pathDyn: "pd2" });

          expect(dynlog).toBe("success;[pathDyn=pd2];{pathDyn=pd2};");

          dynlog = paramsChangedLog = "";
          await $state.go(childWithParam, {
            pathDyn: "pd2",
            searchDyn: "sd2",
            configDyn: "cd2",
          });

          expect(dynlog).toBe(
            "success;[configDyn=cd2,searchDyn=sd2];{configDyn=cd2,searchDyn=sd2};",
          );
        });
      });
    });

    describe("(with dynamic params because reloadOnSearch=false)", function () {
      describe("and only query params changed", () => {
        let entered = false;
        beforeEach(async () => {
          await initStateTo(RS);
          $transitions.onEnter({ entering: "RS" }, function () {
            entered = true;
          });
        });

        // this passes in isolation
        xit("updates $stateParams", async () => {
          await initStateTo(RS);
          $location.search({ term: "hello" });
          $rootScope.$broadcast("$locationChangeSuccess");
          await wait(100);
          expect($stateParams.term).toEqual("hello");
          expect(entered).toBeFalsy();
        });

        it("doesn't re-enter state (triggered by url change)", async () => {
          $location.search({ term: "hello" });
          $rootScope.$broadcast("$locationChangeSuccess");

          expect($location.search()).toEqual({ term: "hello" });
          expect(entered).toBeFalsy();
        });

        it("doesn't re-enter state (triggered by $state transition)", async () => {
          await initStateTo(RS);
          const promise = $state.go(".", { term: "hello" });
          let success = false,
            transition = promise.transition;
          await transition.promise.then(async () => {
            success = true;
          });

          expect($state.current).toBe(RS);
          expect(entered).toBeFalsy();
          expect(success).toBeTruthy();
          expect($location.search()).toEqual({ term: "hello" });
        });

        it("updates URL when (triggered by $state transition)", async () => {
          await initStateTo(RS);
          await $state.go(".", { term: "goodbye" });

          expect($stateParams.term).toEqual("goodbye");
          expect($location.url()).toEqual("/search?term=goodbye");
          expect(entered).toBeFalsy();
        });
      });
    });

    xit("ignores non-applicable state parameters", async () => {
      await $state.transitionTo("A", { w00t: "hi mom!" });

      expect($state.current).toBe(A);
    });

    it("is a no-op when passing the current state and identical parameters", async () => {
      await initStateTo(A);
      const promise = $state.transitionTo(A, {}); // no-op
      expect(promise).toBeDefined(); // but we still get a valid promise
      await promise;
      expect(promise.$$state.value).toBe(A);
      expect($state.current).toBe(A);
    });

    it("aborts pending transitions (last call wins)", async () => {
      await initStateTo(A);
      logEvents = true;

      const superseded = $state.transitionTo(B, {});
      await superseded;
      await $state.transitionTo(C, {});

      expect($state.current).toBe(C);
      expect(superseded.$$state.status).toBeTruthy();
    });

    it("aborts pending transitions even when going back to the current state", async () => {
      await initStateTo(A);
      logEvents = true;

      const superseded = $state.transitionTo(B, {});
      await superseded;
      await $state.transitionTo(A, {});

      expect($state.current).toBe(A);
      expect(superseded.$$state.status).toBeTruthy();
    });

    xit("aborts pending transitions when aborted from callbacks", async () => {
      await $state.transitionTo("home.redirect");
      expect($state.current.name).toBe("about");
    });

    xit("triggers onEnter and onExit callbacks", async () => {
      log = "";
      await initStateTo(A);
      logEnterExit = true;
      await $state.transitionTo(D, {});

      log += $state.current.name + ";";
      await $state.transitionTo(DD, {});

      log += $state.current.name + ";";
      await $state.transitionTo(A, {});

      expect(log).toBe(
        "A.onExit;" +
          "D.onEnter;" +
          "D;" +
          "DD.onEnter;" +
          "DD;" +
          "DD.onExit;" +
          "D.onExit;" +
          "A.onEnter;",
      );
    });

    // // test for #3081
    it("injects resolve values from the exited state into onExit", async () => {
      const registry = $stateRegistry;
      registry.register({
        name: "design",
        url: "/design",
        resolve: {
          cc: function () {
            return "cc resolve";
          },
        },
        onExit: function (cc, $state$, $transition$) {
          expect($transition$.to().name).toBe("A");
          expect($transition$.from().name).toBe("design");

          expect($state$).toBe(registry.get("design"));

          expect(cc).toBe("cc resolve");
        },
      });

      await $state.go("design");

      await $state.go("A");
    });

    it("doesn't transition to parent state when child has no URL", async () => {
      await $state.transitionTo("about.sidebar");

      expect($state.current.name).toEqual("about.sidebar");
    });

    xit("notifies on failed relative state resolution", async () => {
      await $state.transitionTo(DD);

      let actual,
        err = "Could not resolve '^.Z' from state 'DD'";
      await $state
        .transitionTo("^.Z", null, { relative: $state.$current })
        .catch(function (err) {
          actual = err;
        });

      expect(actual.detail).toEqual(err);
    });

    it("uses the templateProvider to get template dynamically", async () => {
      await $state.transitionTo("dynamicTemplate", { type: "Acme" });

      expect(template).toEqual("AcmeFooTemplate");
    });

    it("uses the controllerProvider to get controller dynamically", async () => {
      await $state.transitionTo("dynamicController", { type: "Acme" });

      expect(ctrlName).toEqual("AcmeController");
    });

    it("updates the location #fragment", async () => {
      await $state.transitionTo("home.item", { id: "world", "#": "frag" });
      expect($location.url()).toBe("/front/world#frag");
      expect($location.hash()).toBe("frag");
    });

    // passes in isolation. on success callback being polluted
    xit("runs a transition when the location #fragment is updated", (done) => {
      let transitionCount = 0;
      $transitions.onSuccess({}, function () {
        transitionCount++;
        done();
      });

      $state.transitionTo("home.item", { id: "world", "#": "frag" });
      expect($location.hash()).toBe("frag");
      expect(transitionCount).toBeGreaterThan(0);

      $state.transitionTo("home.item", { id: "world", "#": "blarg" });

      expect($location.hash()).toBe("blarg");
      expect(transitionCount).toBeGreaterThan(1);
    });

    it("injects $transition$ into resolves", async () => {
      await $state.transitionTo("home");
      await $state.transitionTo("about");

      expect(log).toBe("home => about");
    });
  });
});
