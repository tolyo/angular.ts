import { dealoc } from "../shared/jqlite/jqlite.js";
import { Angular } from "../loader";
import { wait } from "../shared/test-utils";

describe("view hooks", () => {
  let app,
    $state,
    $q,
    $timeout,
    log = "";
  class ctrl {
    constructor() {
      this.data = "DATA";
    }
  }

  const component = {
    bindings: { cmpdata: "<" },
    template: "{{$ctrl.cmpdata}}",
  };

  beforeEach(() => {
    dealoc(document.getElementById("dummy"));
    window.angular = new Angular();
    app = window.angular
      .module("defaultModule", [])
      .config(($stateProvider) => {
        $stateProvider.state({ name: "foo", url: "/foo", component: "foo" });
        $stateProvider.state({ name: "bar", url: "/bar", component: "bar" });
        $stateProvider.state({ name: "baz", url: "/baz", component: "baz" });
        $stateProvider.state({ name: "redirect", redirectTo: "baz" });
      })
      .component(
        "foo",
        Object.assign({}, Object.assign(component, { controller: ctrl })),
      )
      .component("bar", Object.assign({}, component))
      .component("baz", Object.assign({}, component));

    let $injector = window.angular.bootstrap(document.getElementById("dummy"), [
      "defaultModule",
    ]);

    $injector.invoke((_$state_, _$q_, _$timeout_, $compile, $rootScope) => {
      $state = _$state_;
      $q = _$q_;
      $timeout = _$timeout_;
      $compile("<div><ng-view></ng-view></div>")($rootScope.$new());
    });
  });

  xdescribe("uiCanExit", () => {
    beforeEach(() => {
      log = "";
    });

    const initial = async () => {
      $state.go("foo");
      await wait(100);
      expect(log).toBe("");
      expect($state.current.name).toBe("foo");
    };

    xit("can cancel a transition that would exit the view's state by returning false", async () => {
      $state.defaultErrorHandler(function () {});
      ctrl.prototype.uiCanExit = function () {
        log += "canexit;";
        return false;
      };
      await initial();
      $state.go("bar");
      expect(log).toBe("canexit;");
      expect($state.current.name).toBe("foo");
    });

    it("can allow the transition by returning true", async () => {
      ctrl.prototype.uiCanExit = function () {
        log += "canexit;";
        return true;
      };
      await initial();

      $state.go("bar");
      await wait(100);
      expect(log).toBe("canexit;");
      expect($state.current.name).toBe("bar");
    });

    xit("can allow the transition by returning nothing", async () => {
      ctrl.prototype.uiCanExit = function () {
        log += "canexit;";
      };
      await initial();

      $state.go("bar");
      await wait(100);
      expect(log).toBe("canexit;");
      expect($state.current.name).toBe("bar");
    });

    xit("can redirect the transition", async () => {
      ctrl.prototype.uiCanExit = function (trans) {
        log += "canexit;";
        return $state.target("baz");
      };
      await initial();

      $state.go("bar");
      await wait(100);
      expect(log).toBe("canexit;");
      expect($state.current.name).toBe("baz");
    });

    xit("can cancel the transition by returning a rejected promise", async () => {
      ctrl.prototype.uiCanExit = function () {
        log += "canexit;";
        return $q.reject("nope");
      };
      await initial();

      $state.defaultErrorHandler(function () {});
      $state.go("bar");
      await wait(100);
      expect(log).toBe("canexit;");
      expect($state.current.name).toBe("foo");
    });

    xit("can wait for a promise and then reject the transition", async () => {
      $state.defaultErrorHandler(function () {});
      ctrl.prototype.uiCanExit = function () {
        log += "canexit;";
        return setTimeout(() => {
          log += "delay;";
          return false;
        }, 1);
      };
      await initial();

      $state.go("bar");
      await wait(100);
      expect(log).toBe("canexit;delay;");
      expect($state.current.name).toBe("foo");
    });

    it("can wait for a promise and then allow the transition", async () => {
      ctrl.prototype.uiCanExit = function () {
        log += "canexit;";
        return setTimeout(() => {
          log += "delay;";
        }, 1);
      };
      await initial();

      $state.go("bar");
      await wait(100);
      expect(log).toBe("canexit;delay;");
      expect($state.current.name).toBe("bar");
    });

    xit("has 'this' bound to the controller", async () => {
      ctrl.prototype.uiCanExit = function () {
        log += this.data;
      };
      await initial();

      $state.go("bar");
      await wait(100);
      expect(log).toBe("DATA");
      expect($state.current.name).toBe("bar");
    });

    xit("receives the new Transition as the first argument", async () => {
      const _state = $state;
      ctrl.prototype.uiCanExit = function (trans) {
        log += "canexit;";
        expect(typeof trans.treeChanges).toBe("function");
        expect(trans.injector().get("$state")).toBe(_state);
      };
      await initial();

      $state.go("bar");
      await wait(100);
      expect(log).toBe("canexit;");
      expect($state.current.name).toBe("bar");
    });

    // Test for https://github.com/angular-ui/ui-router/issues/3308
    xit("should trigger once when answered truthy even if redirected", async () => {
      ctrl.prototype.uiCanExit = function () {
        log += "canexit;";
        return true;
      };
      await initial();

      $state.go("redirect");
      await wait(100);
      expect(log).toBe("canexit;");
      expect($state.current.name).toBe("baz");
    });

    // Test for https://github.com/angular-ui/ui-router/issues/3308
    xit("should trigger only once if returns a redirect", async () => {
      ctrl.prototype.uiCanExit = function () {
        log += "canexit;";
        return $state.target("bar");
      };
      await initial();

      $state.go("redirect");
      await wait(100);
      expect(log).toBe("canexit;");
      expect($state.current.name).toBe("bar");
    });
  });
});
