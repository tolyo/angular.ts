import { dealoc } from "../shared/jqlite/jqlite.js";
import { Angular } from "../loader.js";
import { wait } from "../shared/test-utils.js";

describe("ngView", () => {
  describe("scrollIntoView", () => {
    let elem, $anchorScroll, $ngViewScroll;

    beforeEach(() => {
      dealoc(document.getElementById("dummy"));
      window.angular = new Angular();
      window.angular.module("defaultModule", []);
      let $injector = window.angular.bootstrap(
        document.getElementById("dummy"),
        ["defaultModule"],
      );

      $injector.invoke((_$ngViewScroll_, _$anchorScroll_) => {
        $anchorScroll = _$anchorScroll_;
        $ngViewScroll = _$ngViewScroll_;
      });
      elem = [{ scrollIntoView: jasmine.createSpy("scrollIntoView") }];
    });

    it("should scroll element into view after timeout", async () => {
      $ngViewScroll(elem);
      expect(elem[0].scrollIntoView).not.toHaveBeenCalled();

      await wait(100);
      expect(elem[0].scrollIntoView).toHaveBeenCalled();
    });

    it("should return the promise from the timeout", async () => {
      const promise = $ngViewScroll(elem);

      await wait(100);
      expect(elem[0].scrollIntoView).toHaveBeenCalled();
      expect(promise).toBeDefined();
    });
  });

  describe("useAnchorScroll", () => {
    let elem, $anchorScroll, $ngViewScroll;

    beforeEach(() => {
      dealoc(document.getElementById("dummy"));
      window.angular = new Angular();
      let module = window.angular.module("defaultModule", []);
      module.config(($provide, $ngViewScrollProvider) => {
        $provide.decorator("$anchorScroll", function ($delegate) {
          return jasmine.createSpy("$anchorScroll");
        });
        $ngViewScrollProvider.useAnchorScroll();
      });

      let $injector = window.angular.bootstrap(
        document.getElementById("dummy"),
        ["defaultModule"],
      );

      $injector.invoke((_$ngViewScroll_, _$anchorScroll_) => {
        $anchorScroll = _$anchorScroll_;
        $ngViewScroll = _$ngViewScroll_;
      });
      elem = [{ scrollIntoView: jasmine.createSpy("scrollIntoView") }];
    });

    it("should call $anchorScroll", () => {
      $ngViewScroll();
      expect($anchorScroll).toHaveBeenCalled();
    });
  });
});
