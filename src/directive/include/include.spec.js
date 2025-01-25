import { dealoc, JQLite } from "../../shared/jqlite/jqlite.js";
import { Angular } from "../../loader.js";
import { createInjector } from "../../core/di/injector.js";
import { wait } from "../../shared/test-utils.js";

describe("ngInclude", () => {
  describe("basic", () => {
    let element;
    let $rootScope;
    let $templateCache;
    let $compile;
    let module;
    let injector;
    let angular;
    let errorLog = [];

    beforeEach(() => {
      errorLog = [];
      delete window.angular;
      angular = window.angular = new Angular();
      module = angular
        .module("myModule", ["ng"])
        .decorator("$exceptionHandler", function () {
          return (exception, cause) => {
            errorLog.push(exception.message);
          };
        });
      // module = window.angular.module("myModule", []);
      injector = createInjector(["myModule"]);
      $rootScope = injector.get("$rootScope");
      $templateCache = injector.get("$templateCache");
      $compile = injector.get("$compile");
    });

    afterEach(() => {
      dealoc(element);
    });

    it("should trust and use literal urls", (done) => {
      const element = JQLite(
        "<div><div ng-include=\"'/public/test.html'\"></div></div>",
      );
      const injector = angular.bootstrap(element);
      $rootScope = injector.get("$rootScope");
      setTimeout(() => {
        expect(element.textContent).toEqual("hello");
        dealoc($rootScope);
        done();
      }, 200);
    });

    it("should trust and use trusted urls", async () => {
      const element = JQLite('<div><div ng-include="fooUrl">test</div></div>');
      const injector = angular.bootstrap(element);
      let $sce = injector.get("$sce");
      $rootScope = injector.get("$rootScope");
      $rootScope.fooUrl = $sce.trustAsResourceUrl(
        "http://localhost:4000/mock/hello",
      );
      await wait(100);
      expect(element.textContent).toEqual("Hello");
      dealoc($rootScope);
    });

    it("should include an external file", async () => {
      element = JQLite('<div><ng-include src="url"></ng-include></div>');
      const body = JQLite(document.getElementById("dummy"));
      body.append(element);
      const injector = angular.bootstrap(element);
      $rootScope = injector.get("$rootScope");
      $templateCache = injector.get("$templateCache");
      $templateCache.set("myUrl", [200, "{{name}}", {}]);
      $rootScope.name = "misko";
      $rootScope.url = "myUrl";
      await wait(100);
      expect(body.text()).toEqual("misko");
      body.empty();
      dealoc($rootScope);
    });

    it('should support ng-include="src" syntax', (done) => {
      element = JQLite('<div><div ng-include="url"></div></div>');
      const injector = angular.bootstrap(element);
      $rootScope = injector.get("$rootScope");
      $rootScope.expr = "Alibaba";
      $rootScope.url = "/mock/interpolation";
      setTimeout(() => {
        expect(element.textContent).toEqual("Alibaba");
        done();
      }, 200);
    });

    it("should NOT use untrusted URL expressions ", async () => {
      element = JQLite('<ng-include src="url"></ng-include>');
      const injector = angular.bootstrap(element, ["myModule"]);
      $rootScope = injector.get("$rootScope");
      $rootScope.url = "http://example.com/myUrl";
      await wait();
      expect(errorLog[0]).toMatch(/insecurl/);
    });

    it("should remove previously included text if a falsy value is bound to src", (done) => {
      element = JQLite('<div><ng-include src="url"></ng-include></div>');
      const injector = angular.bootstrap(element);
      $rootScope = injector.get("$rootScope");
      $rootScope.expr = "igor";
      $rootScope.url = "/mock/interpolation";
      setTimeout(() => {
        expect(element.textContent).toEqual("igor");
        $rootScope.url = undefined;
      }, 100);
      setTimeout(() => {
        expect(element.textContent).toEqual("");
        done();
      }, 300);
    });

    it("should fire $includeContentRequested event on scope after making the xhr call", (done) => {
      let called = false;

      window.angular.module("myModule", []).run(($rootScope) => {
        $rootScope.$on("$includeContentRequested", (event) => {
          called = true;
        });
      });
      element = JQLite(
        '<div><div><ng-include src="url"></ng-include></div></div>',
      );
      const injector = angular.bootstrap(element, ["myModule"]);
      $rootScope = injector.get("$rootScope");
      $rootScope.url = "/mock/interpolation";
      setTimeout(() => {
        expect(called).toBe(true);
        done();
      }, 100);
    });

    it("should fire $includeContentLoaded event on child scope after linking the content", (done) => {
      let called = false;

      window.angular.module("myModule", []).run(($rootScope) => {
        $rootScope.$on("$includeContentLoaded", () => {
          called = true;
        });
      });
      element = JQLite(
        '<div><div><ng-include src="url"></ng-include></div></div>',
      );
      const injector = angular.bootstrap(element, ["myModule"]);
      $rootScope = injector.get("$rootScope");
      $rootScope.url = "/mock/interpolation";
      setTimeout(() => {
        expect(called).toBe(true);
        done();
      }, 100);
    });

    it("should fire $includeContentError event when content request fails", (done) => {
      const contentLoadedSpy = jasmine.createSpy("content loaded");
      const contentErrorSpy = jasmine.createSpy("content error");

      window.angular.module("myModule", []).run(($rootScope) => {
        $rootScope.url = "/mock/401";
        $rootScope.$on("$includeContentLoaded", contentLoadedSpy);
        $rootScope.$on("$includeContentError", contentErrorSpy);
      });

      element = JQLite(
        '<div><div><ng-include src="url"></ng-include></div></div>',
      );

      const injector = angular.bootstrap(element, ["myModule"]);
      $rootScope = injector.get("$rootScope");
      setTimeout(() => {
        expect(contentLoadedSpy).not.toHaveBeenCalled();
        expect(contentErrorSpy).toHaveBeenCalled();
        done();
      }, 100);
    });

    it("should evaluate onload expression when a partial is loaded", (done) => {
      window.angular.module("myModule", []);

      element = JQLite(
        '<div><div><ng-include src="url" onload="loaded = true"></ng-include></div></div>',
      );
      const injector = angular.bootstrap(element, ["myModule"]);
      $rootScope = injector.get("$rootScope");
      expect($rootScope.loaded).not.toBeDefined();
      $rootScope.url = "/mock/hello";
      setTimeout(() => {
        expect(element.textContent).toEqual("Hello");
        expect($rootScope.loaded).toBe(true);
        done();
      }, 100);
    });

    it("should create child scope and destroy old one", (done) => {
      window.angular.module("myModule", []);

      element = JQLite('<div><ng-include src="url"></ng-include></div>');
      const injector = angular.bootstrap(element, ["myModule"]);
      $rootScope = injector.get("$rootScope");
      expect($rootScope.$children.length).toBe(1);

      $rootScope.url = "/mock/hello";
      setTimeout(() => {
        expect($rootScope.$children.length).toBe(2);
        expect(element.textContent).toBe("Hello");

        $rootScope.url = "/mock/401";
      }, 100);

      setTimeout(() => {
        expect($rootScope.$children.length).toBe(1);
        expect(element.textContent).toBe("");

        $rootScope.url = "/mock/hello";
      }, 200);

      setTimeout(() => {
        expect($rootScope.$children.length).toBe(2);

        $rootScope.url = null;
      }, 300);

      setTimeout(() => {
        expect($rootScope.$children.length).toBe(1);
        done();
      }, 400);
    });

    it("should do xhr request and cache it", async () => {
      window.angular.module("myModule", []);
      element = JQLite('<div><ng-include src="url"></ng-include></div>');
      const injector = angular.bootstrap(element, ["myModule"]);
      $rootScope = injector.get("$rootScope");
      $rootScope.url = "/mock/hello";
      await wait(100);

      expect(element.textContent).toEqual("Hello");
      $rootScope.url = null;
      await wait(100);
      expect(element.textContent).toEqual("");
      $rootScope.url = "/mock/hello";
      await wait();
      // No request being made
      expect(element.textContent).toEqual("Hello");
    });

    it("should clear content when error during xhr request", async () => {
      window.angular.module("myModule", []);
      element = JQLite('<div><ng-include src="url">content</ng-include></div>');
      const injector = angular.bootstrap(element, ["myModule"]);
      $rootScope = injector.get("$rootScope");
      $rootScope.url = "/mock/401";
      await wait();
      expect(element.textContent).toBe("");
    });

    it("should be async even if served from cache", (done) => {
      window.angular.module("myModule", []);
      element = JQLite('<div><ng-include src="url"></ng-include></div>');
      const injector = angular.bootstrap(element, ["myModule"]);
      $rootScope = injector.get("$rootScope");
      $rootScope.url = "/mock/hello";

      setTimeout(() => {
        expect(element.textContent).toBe("Hello");
        done();
      }, 200);
    });

    it("should discard pending xhr callbacks if a new template is requested before the current finished loading", (done) => {
      window.angular.module("myModule", []);
      element = JQLite(
        "<div><ng-include src='templateUrl'></ng-include></div>",
      );
      const injector = angular.bootstrap(element, ["myModule"]);
      $rootScope = injector.get("$rootScope");
      $rootScope.templateUrl = "/mock/hello";
      $rootScope.expr = "test";
      $rootScope.templateUrl = "/mock/interpolation";
      expect(element.textContent).toBe("");

      setTimeout(() => {
        expect(element.textContent).toBe("test");
        done();
      }, 200);
    });

    it("should not break attribute bindings on the same element", async () => {
      window.angular.module("myModule", []);
      element = JQLite(
        '<div><span foo="#/{{hrefUrl}}" ng-include="includeUrl"></span></div>',
      );
      const injector = angular.bootstrap(element, ["myModule"]);
      $rootScope = injector.get("$rootScope");
      $rootScope.hrefUrl = "fooUrl1";
      $rootScope.includeUrl = "/mock/hello";
      await wait(100);
      expect(element.textContent).toBe("Hello");
      expect(element.find("span").attr("foo")).toBe("#/fooUrl1");

      $rootScope.hrefUrl = "fooUrl2";
      await wait(100);
      expect(element.textContent).toBe("Hello");
      expect(element.find("span").attr("foo")).toBe("#/fooUrl2");

      $rootScope.includeUrl = "/mock/hello2";
      await wait(100);
      expect(element.textContent).toBe("Hello2");
      expect(element.find("span").attr("foo")).toBe("#/fooUrl2");
    });

    it("should construct SVG template elements with correct namespace", async () => {
      window.angular.module("myModule", []).directive("test", () => ({
        templateNamespace: "svg",
        templateUrl: "/mock/my-rect.html",
        replace: true,
      }));
      element = JQLite("<svg><test></test></svg>");
      const injector = angular.bootstrap(element, ["myModule"]);
      $rootScope = injector.get("$rootScope");
      await wait(100);
      const child = element.find("rect");
      expect(child.length).toBe(2);
      expect(child[0] instanceof SVGRectElement).toBe(true);
    });

    it("should compile only the template content of an SVG template", async () => {
      window.angular.module("myModule", []).directive("test", () => ({
        templateNamespace: "svg",
        templateUrl: "/mock/my-rect2.html",
        replace: true,
      }));
      element = JQLite("<svg><test></test></svg>");
      const injector = angular.bootstrap(element, ["myModule"]);
      $rootScope = injector.get("$rootScope");
      await wait(200);
      expect(element.find("a").length).toBe(0);
    });

    it("should not compile template if original scope is destroyed", (done) => {
      window.angular.module("myModule", []);
      element = JQLite(
        '<div ng-if="show"><div ng-include="\'/mock/hello\'"></div></div>',
      );
      const injector = angular.bootstrap(element, ["myModule"]);
      $rootScope = injector.get("$rootScope");
      $rootScope.show = true;
      $rootScope.show = false;
      setTimeout(() => {
        expect(element.textContent).toBe("");
        done();
      }, 200);
    });

    it("should not trigger a digest when the include is changed", (done) => {
      window.angular.module("myModule", []);
      element = JQLite('<div><ng-include src="url"></ng-include></div>');
      const injector = angular.bootstrap(element, ["myModule"]);
      $rootScope = injector.get("$rootScope");
      const spy = spyOn($rootScope, "$digest").and.callThrough();

      $rootScope.url = "/mock/hello";
      setTimeout(() => {
        expect(element.textContent).toEqual("Hello");
        $rootScope.$apply('url = "/mock/hello2"');
      }, 200);

      setTimeout(() => {
        spy.calls.reset();
      }, 300);

      setTimeout(() => {
        expect(element.textContent).toEqual("Hello2");
        expect(spy).not.toHaveBeenCalled();
        done();
      }, 400);
    });

    describe("autoscroll", () => {
      let autoScrollSpy;
      let $animate;

      it("should call $anchorScroll if autoscroll attribute is present", (done) => {
        window.angular.module("myModule", [
          function ($provide) {
            autoScrollSpy = jasmine.createSpy("$anchorScroll");
            $provide.value("$anchorScroll", autoScrollSpy);
          },
        ]);
        element = JQLite(
          '<div><ng-include src="tpl" autoscroll></ng-include></div>',
        );
        const injector = angular.bootstrap(element, ["myModule"]);
        $rootScope = injector.get("$rootScope");
        $animate = injector.get("$animate");
        $rootScope.$apply(() => {
          $rootScope.tpl = "/mock/hello";
        });

        setTimeout(() => {
          expect(autoScrollSpy).toHaveBeenCalled();
          done();
        }, 400);
      });

      it("should call $anchorScroll if autoscroll evaluates to true", (done) => {
        window.angular.module("myModule", [
          function ($provide) {
            autoScrollSpy = jasmine.createSpy("$anchorScroll");
            $provide.value("$anchorScroll", autoScrollSpy);
          },
        ]);
        element = JQLite(
          '<div><ng-include src="tpl" autoscroll="value"></ng-include></div>',
        );
        const injector = angular.bootstrap(element, ["myModule"]);
        $rootScope = injector.get("$rootScope");

        $rootScope.$apply(() => {
          $rootScope.tpl = "/mock/hello";
          $rootScope.value = true;
        });

        setTimeout(() => {
          expect(autoScrollSpy).toHaveBeenCalled();
          done();
        }, 100);
      });

      it("should not call $anchorScroll if autoscroll attribute is not present", (done) => {
        window.angular.module("myModule", [
          function ($provide) {
            autoScrollSpy = jasmine.createSpy("$anchorScroll");
            $provide.value("$anchorScroll", autoScrollSpy);
          },
        ]);

        element = JQLite('<div><ng-include src="tpl"></ng-include></div>');
        const injector = angular.bootstrap(element, ["myModule"]);
        $rootScope = injector.get("$rootScope");

        $rootScope.$apply(() => {
          $rootScope.tpl = "/mock/hello";
        });
        setTimeout(() => {
          expect(autoScrollSpy).not.toHaveBeenCalled();
          done();
        }, 100);
      });

      it("should not call $anchorScroll if autoscroll evaluates to false", (done) => {
        window.angular.module("myModule", [
          function ($provide) {
            autoScrollSpy = jasmine.createSpy("$anchorScroll");
            $provide.value("$anchorScroll", autoScrollSpy);
          },
        ]);

        element = JQLite(
          '<div><ng-include src="tpl" autoscroll="value"></ng-include></div>',
        );
        const injector = angular.bootstrap(element, ["myModule"]);
        $rootScope = injector.get("$rootScope");

        $rootScope.$apply(() => {
          $rootScope.tpl = "/mock/hello";
          $rootScope.value = false;
        });

        $rootScope.$apply(() => {
          $rootScope.tpl = "/mock/hello";
          $rootScope.value = undefined;
        });

        $rootScope.$apply(() => {
          $rootScope.tpl = "/mock/hello";
          $rootScope.value = null;
        });

        setTimeout(() => {
          expect(autoScrollSpy).not.toHaveBeenCalled();
          done();
        }, 100);
      });

      // it('should only call $anchorScroll after the "enter" animation completes', inject(
      //   compileAndLink(
      //     '<div><ng-include src="tpl" autoscroll></ng-include></div>',
      //   ),
      //   ($rootScope, $animate, $timeout) => {
      //     expect(autoScrollSpy).not.toHaveBeenCalled();

      //     $rootScope.$apply("tpl = 'template.html'");
      //     expect($animate.queue.shift().event).toBe("enter");

      //     $animate.flush();
      //     ;

      //     expect(autoScrollSpy).toHaveBeenCalled();
      //   },
      // ));
    });

    describe("and transcludes", () => {
      let element;

      afterEach(() => {
        if (element) {
          dealoc(element);
        }
      });

      it("should allow access to directive controller from children when used in a replace template", (done) => {
        let controller;
        window.angular
          .module("myModule", [])
          .directive("template", () => ({
            template: "<div ng-include=\"'/mock/directive'\"></div>",
            replace: true,
            controller() {
              this.flag = true;
            },
          }))
          .directive("test", () => ({
            require: "^template",
            link(scope, el, attr, ctrl) {
              controller = ctrl;
            },
          }));
        element = JQLite("<div><div template></div></div>");
        const injector = angular.bootstrap(element, ["myModule"]);
        $rootScope = injector.get("$rootScope");

        setTimeout(() => {
          expect(controller.flag).toBe(true);
          done();
        }, 100);
      });

      it("should compile its content correctly (although we remove it later)", (done) => {
        let testElement;
        window.angular.module("myModule", []).directive("test", () => ({
          link(scope, element) {
            testElement = element;
          },
        }));

        element = JQLite(
          "<div><div ng-include=\"'/mock/empty'\"><div test></div></div></div>",
        );
        const injector = angular.bootstrap(element, ["myModule"]);
        $rootScope = injector.get("$rootScope");

        setTimeout(() => {
          expect(testElement[0].nodeName).toBe("DIV");
          done();
        }, 100);
      });

      it("should link directives on the same element after the content has been loaded", (done) => {
        let contentOnLink;
        window.angular.module("myModule", []).directive("test", () => ({
          link(scope, element) {
            contentOnLink = element.textContent;
          },
        }));
        element = JQLite("<div><div ng-include=\"'/mock/hello'\" test></div>");
        const injector = angular.bootstrap(element, ["myModule"]);
        $rootScope = injector.get("$rootScope");
        setTimeout(() => {
          expect(contentOnLink).toBe("Hello");
          done();
        }, 100);
      });

      it("should add the content to the element before compiling it", async () => {
        let root;
        window.angular.module("myModule", []).directive("test", () => ({
          link(scope, el) {
            root = el.parent().parent().parent();
          },
        }));
        element = JQLite("<div><div ng-include=\"'/mock/directive'\"></div>");
        const injector = angular.bootstrap(element, ["myModule"]);
        $rootScope = injector.get("$rootScope");
        await wait();
        await wait(100);
        expect(root[0]).toBe(element);
      });
    });

    // describe("and animations", () => {
    //   let body;
    //   let element;
    //   let $rootElement;

    //   function html(content) {
    //     $rootElement.html(content);
    //     element = $rootElement.children().eq(0);
    //     return element;
    //   }

    //   // beforeEach(
    //   //   module(
    //   //     () =>
    //   //       // we need to run animation on attached elements;
    //   //       function (_$rootElement_) {
    //   //         $rootElement = _$rootElement_;
    //   //         body = JQLite(document.body);
    //   //         body.append($rootElement);
    //   //       },
    //   //   ),
    //   // );

    //   afterEach(() => {
    //     dealoc(body);
    //     dealoc(element);
    //   });

    //   // beforeEach(module("ngAnimateMock"));

    //   afterEach(() => {
    //     dealoc(element);
    //   });

    //   it("should fire off the enter animation", () => {
    //     let item;

    //     $templateCache.set("enter", [200, "<div>data</div>", {}]);
    //     $rootScope.tpl = "enter";
    //     element = $compile(
    //       html("<div><div " + 'ng-include="tpl">' + "</div></div>"),
    //     )($rootScope);
    //     ;

    //     const animation = $animate.queue.pop();
    //     expect(animation.event).toBe("enter");
    //     expect(animation.element.textContent).toBe("data");
    //   });

    //   it("should fire off the leave animation", () => {
    //     let item;
    //     $templateCache.set("enter", [200, "<div>data</div>", {}]);
    //     $rootScope.tpl = "enter";
    //     element = $compile(
    //       html("<div><div " + 'ng-include="tpl">' + "</div></div>"),
    //     )($rootScope);
    //     ;

    //     let animation = $animate.queue.shift();
    //     expect(animation.event).toBe("enter");
    //     expect(animation.element.textContent).toBe("data");

    //     $rootScope.tpl = "";
    //     ;

    //     animation = $animate.queue.shift();
    //     expect(animation.event).toBe("leave");
    //     expect(animation.element.textContent).toBe("data");
    //   });

    //   it("should animate two separate ngInclude elements", () => {
    //     let item;
    //     $templateCache.set("one", [200, "one", {}]);
    //     $templateCache.set("two", [200, "two", {}]);
    //     $rootScope.tpl = "one";
    //     element = $compile(
    //       html("<div><div " + 'ng-include="tpl">' + "</div></div>"),
    //     )($rootScope);
    //     ;

    //     const item1 = $animate.queue.shift().element;
    //     expect(item1.text()).toBe("one");

    //     $rootScope.tpl = "two";
    //     ;

    //     const itemA = $animate.queue.shift().element;
    //     const itemB = $animate.queue.shift().element;
    //     expect(itemA.attr("ng-include")).toBe("tpl");
    //     expect(itemB.attr("ng-include")).toBe("tpl");
    //     expect(itemA).not.toEqual(itemB);
    //   });

    //   it("should destroy the previous leave animation if a new one takes place", () => {
    //     module(($provide) => {
    //       $provide.decorator("$animate", ($delegate, $$q) => {
    //         const emptyPromise = Promise.withResolvers().promise;
    //         emptyPromise.done = () => {};

    //         $delegate.leave = function () {
    //           return emptyPromise;
    //         };
    //         return $delegate;
    //       });
    //     });
    //     () => {
    //       let item;
    //       const $scope = $rootScope.$new();
    //       element = $compile(
    //         html("<div>" + '<div ng-include="inc">Yo</div>' + "</div>"),
    //       )($scope);

    //       $templateCache.set("one", [200, "<div>one</div>", {}]);
    //       $templateCache.set("two", [200, "<div>two</div>", {}]);

    //       $scope.$apply('inc = "one"');

    //       let destroyed;
    //       const inner = element.children(0);
    //       inner.on("$destroy", () => {
    //         destroyed = true;
    //       });

    //       $scope.$apply('inc = "two"');

    //       $scope.$apply('inc = "one"');

    //       $scope.$apply('inc = "two"');

    //       expect(destroyed).toBe(true);
    //     };
    //   });
    // });
  });
});
