import {
  LocationHtml5Url,
  LocationHashbangUrl,
  LocationProvider,
} from "./location";
import { Angular } from "../../loader";
import { createInjector } from "../di/injector";

describe("$location", () => {
  let module;
  beforeEach(() => {
    window.angular = new Angular();
    module = window.angular.module("test1", ["ng"]);
  });

  // function initService(options) {
  //   module.config(($provide, $locationProvider) => {
  //     $locationProvider.setHtml5Mode(options.html5Mode);
  //     $locationProvider.hashPrefix(options.hashPrefix);
  //     $provide.value("$sniffer", { history: options.supportHistory });
  //   });
  // }

  describe("defaults", () => {
    it('should have hashPrefix of "!"', () => {
      let provider = new LocationProvider();
      expect(provider.getHashPrefix()).toBe("!");
    });

    it("should not be html5 mode", () => {
      let provider = new LocationProvider();
      expect(provider.getHtml5Mode().enabled).toBeFalse();
    });
  });

  describe("File Protocol", () => {
    /* global urlParsingNode: true */
    let urlParsingNodePlaceholder;
    let urlParsingNode;

    beforeEach(() => {
      urlParsingNodePlaceholder = urlParsingNode;

      // temporarily overriding the DOM element
      // with output from IE, if not in IE
      urlParsingNode = {
        hash: "#/C:/",
        host: "",
        hostname: "",
        href: "file:///C:/base#!/C:/foo",
        pathname: "/C:/foo",
        port: "",
        protocol: "file:",
        search: "",
        setAttribute: () => {},
      };
    });

    afterEach(() => {
      urlParsingNode = urlParsingNodePlaceholder;
    });

    it("should not include the drive name in path() on WIN", () => {
      // See issue #4680 for details
      const locationUrl = new LocationHashbangUrl(
        "file:///base",
        "file:///",
        "#!",
      );
      locationUrl.$$parse("file:///base#!/foo?a=b&c#hash");

      expect(locationUrl.path()).toBe("/foo");
    });

    it("should include the drive name if it was provided in the input url", () => {
      const locationUrl = new LocationHashbangUrl(
        "file:///base",
        "file:///",
        "#!",
      );
      locationUrl.$$parse("file:///base#!/C:/foo?a=b&c#hash");

      expect(locationUrl.path()).toBe("/C:/foo");
    });
  });

  describe("NewUrl", () => {
    function createLocationHtml5Url() {
      const locationUrl = new LocationHtml5Url(
        "http://www.domain.com:9877/",
        "http://www.domain.com:9877/",
      );
      locationUrl.$$parse(
        "http://www.domain.com:9877/path/b?search=a&b=c&d#hash",
      );
      return locationUrl;
    }

    it("should provide common getters", () => {
      const locationUrl = createLocationHtml5Url();
      expect(locationUrl.absUrl()).toBe(
        "http://www.domain.com:9877/path/b?search=a&b=c&d#hash",
      );
      expect(locationUrl.protocol()).toBe("http");
      expect(locationUrl.host()).toBe("www.domain.com");
      expect(locationUrl.port()).toBe(9877);
      expect(locationUrl.path()).toBe("/path/b");
      expect(locationUrl.search()).toEqual({ search: "a", b: "c", d: true });
      expect(locationUrl.hash()).toBe("hash");
      expect(locationUrl.url()).toBe("/path/b?search=a&b=c&d#hash");
    });

    it("path() should change path", () => {
      const locationUrl = createLocationHtml5Url();
      locationUrl.path("/new/path");
      expect(locationUrl.path()).toBe("/new/path");
      expect(locationUrl.absUrl()).toBe(
        "http://www.domain.com:9877/new/path?search=a&b=c&d#hash",
      );
    });

    it("path() should not break on numeric values", () => {
      const locationUrl = createLocationHtml5Url();
      locationUrl.path(1);
      expect(locationUrl.path()).toBe("/1");
      expect(locationUrl.absUrl()).toBe(
        "http://www.domain.com:9877/1?search=a&b=c&d#hash",
      );
    });

    it("path() should allow using 0 as path", () => {
      const locationUrl = createLocationHtml5Url();
      locationUrl.path(0);
      expect(locationUrl.path()).toBe("/0");
      expect(locationUrl.absUrl()).toBe(
        "http://www.domain.com:9877/0?search=a&b=c&d#hash",
      );
    });

    it("path() should set to empty path on null value", () => {
      const locationUrl = createLocationHtml5Url();
      locationUrl.path("/foo");
      expect(locationUrl.path()).toBe("/foo");
      locationUrl.path(null);
      expect(locationUrl.path()).toBe("/");
    });

    it("search() should accept string", () => {
      const locationUrl = createLocationHtml5Url();
      locationUrl.search("x=y&c");
      expect(locationUrl.search()).toEqual({ x: "y", c: true });
      expect(locationUrl.absUrl()).toBe(
        "http://www.domain.com:9877/path/b?x=y&c#hash",
      );
    });

    it("search() should accept object", () => {
      const locationUrl = createLocationHtml5Url();
      locationUrl.search({ one: 1, two: true });
      expect(locationUrl.search()).toEqual({ one: 1, two: true });
      expect(locationUrl.absUrl()).toBe(
        "http://www.domain.com:9877/path/b?one=1&two#hash",
      );
    });

    it("search() should copy object", () => {
      const locationUrl = createLocationHtml5Url();
      const obj = { one: 1, two: true, three: null };
      locationUrl.search(obj);
      expect(obj).toEqual({ one: 1, two: true, three: null });
      obj.one = "changed";
      expect(locationUrl.search()).toEqual({ one: 1, two: true });
      expect(locationUrl.absUrl()).toBe(
        "http://www.domain.com:9877/path/b?one=1&two#hash",
      );
    });

    it("search() should change single parameter", () => {
      const locationUrl = createLocationHtml5Url();
      locationUrl.search({ id: "old", preserved: true });
      locationUrl.search("id", "new");

      expect(locationUrl.search()).toEqual({ id: "new", preserved: true });
    });

    it("search() should remove single parameter", () => {
      const locationUrl = createLocationHtml5Url();
      locationUrl.search({ id: "old", preserved: true });
      locationUrl.search("id", null);

      expect(locationUrl.search()).toEqual({ preserved: true });
    });

    it("search() should remove multiple parameters", () => {
      const locationUrl = createLocationHtml5Url();
      locationUrl.search({ one: 1, two: true });
      expect(locationUrl.search()).toEqual({ one: 1, two: true });
      locationUrl.search({ one: null, two: null });
      expect(locationUrl.search()).toEqual({});
      expect(locationUrl.absUrl()).toBe(
        "http://www.domain.com:9877/path/b#hash",
      );
    });

    it("search() should accept numeric keys", () => {
      const locationUrl = createLocationHtml5Url();
      locationUrl.search({ 1: "one", 2: "two" });
      expect(locationUrl.search()).toEqual({ 1: "one", 2: "two" });
      expect(locationUrl.absUrl()).toBe(
        "http://www.domain.com:9877/path/b?1=one&2=two#hash",
      );
    });

    it("search() should handle multiple value", () => {
      const locationUrl = createLocationHtml5Url();
      locationUrl.search("a&b");
      expect(locationUrl.search()).toEqual({ a: true, b: true });

      locationUrl.search("a", null);

      expect(locationUrl.search()).toEqual({ b: true });

      locationUrl.search("b", undefined);
      expect(locationUrl.search()).toEqual({});
    });

    it("search() should handle single value", () => {
      const locationUrl = createLocationHtml5Url();
      locationUrl.search("ignore");
      expect(locationUrl.search()).toEqual({ ignore: true });
      locationUrl.search(1);
      expect(locationUrl.search()).toEqual({ 1: true });
    });

    it("search() should throw error an incorrect argument", () => {
      const locationUrl = createLocationHtml5Url();
      expect(() => {
        locationUrl.search(null);
      }).toThrowError(/isrcharg/);
      expect(() => {
        locationUrl.search(undefined);
      }).toThrowError(/isrcharg/);
    });

    it("hash() should change hash fragment", () => {
      const locationUrl = createLocationHtml5Url();
      locationUrl.hash("new-hash");
      expect(locationUrl.hash()).toBe("new-hash");
      expect(locationUrl.absUrl()).toBe(
        "http://www.domain.com:9877/path/b?search=a&b=c&d#new-hash",
      );
    });

    it("hash() should accept numeric parameter", () => {
      const locationUrl = createLocationHtml5Url();
      locationUrl.hash(5);
      expect(locationUrl.hash()).toBe("5");
      expect(locationUrl.absUrl()).toBe(
        "http://www.domain.com:9877/path/b?search=a&b=c&d#5",
      );
    });

    it("hash() should allow using 0", () => {
      const locationUrl = createLocationHtml5Url();
      locationUrl.hash(0);
      expect(locationUrl.hash()).toBe("0");
      expect(locationUrl.absUrl()).toBe(
        "http://www.domain.com:9877/path/b?search=a&b=c&d#0",
      );
    });

    it("hash() should accept null parameter", () => {
      const locationUrl = createLocationHtml5Url();
      locationUrl.hash(null);
      expect(locationUrl.hash()).toBe("");
      expect(locationUrl.absUrl()).toBe(
        "http://www.domain.com:9877/path/b?search=a&b=c&d",
      );
    });

    it("url() should change the path, search and hash", () => {
      const locationUrl = createLocationHtml5Url();
      locationUrl.url("/some/path?a=b&c=d#hhh");
      expect(locationUrl.url()).toBe("/some/path?a=b&c=d#hhh");
      expect(locationUrl.absUrl()).toBe(
        "http://www.domain.com:9877/some/path?a=b&c=d#hhh",
      );
      expect(locationUrl.path()).toBe("/some/path");
      expect(locationUrl.search()).toEqual({ a: "b", c: "d" });
      expect(locationUrl.hash()).toBe("hhh");
    });

    it("url() should change only hash when no search and path specified", () => {
      const locationUrl = createLocationHtml5Url();
      locationUrl.url("#some-hash");

      expect(locationUrl.hash()).toBe("some-hash");
      expect(locationUrl.url()).toBe("/path/b?search=a&b=c&d#some-hash");
      expect(locationUrl.absUrl()).toBe(
        "http://www.domain.com:9877/path/b?search=a&b=c&d#some-hash",
      );
    });

    it("url() should change only search and hash when no path specified", () => {
      const locationUrl = createLocationHtml5Url();
      locationUrl.url("?a=b");

      expect(locationUrl.search()).toEqual({ a: "b" });
      expect(locationUrl.hash()).toBe("");
      expect(locationUrl.path()).toBe("/path/b");
    });

    it("url() should reset search and hash when only path specified", () => {
      const locationUrl = createLocationHtml5Url();
      locationUrl.url("/new/path");

      expect(locationUrl.path()).toBe("/new/path");
      expect(locationUrl.search()).toEqual({});
      expect(locationUrl.hash()).toBe("");
    });

    it("url() should change path when empty string specified", () => {
      const locationUrl = createLocationHtml5Url();
      locationUrl.url("");

      expect(locationUrl.path()).toBe("/");
      expect(locationUrl.search()).toEqual({});
      expect(locationUrl.hash()).toBe("");
    });

    it("replace should set $$replace flag and return itself", () => {
      const locationUrl = createLocationHtml5Url();
      expect(locationUrl.$$replace).toBe(false);

      locationUrl.replace();
      expect(locationUrl.$$replace).toBe(true);
      expect(locationUrl.replace()).toBe(locationUrl);
    });

    it("should parse new url", () => {
      let locationUrl = new LocationHtml5Url(
        "http://host.com/",
        "http://host.com/",
      );
      locationUrl.$$parse("http://host.com/base");
      expect(locationUrl.path()).toBe("/base");

      locationUrl = new LocationHtml5Url(
        "http://host.com/",
        "http://host.com/",
      );
      locationUrl.$$parse("http://host.com/base#");
      expect(locationUrl.path()).toBe("/base");
    });

    it("should prefix path with forward-slash", () => {
      const locationUrl = new LocationHtml5Url(
        "http://server/",
        "http://server/",
      );
      locationUrl.path("b");

      expect(locationUrl.path()).toBe("/b");
      expect(locationUrl.absUrl()).toBe("http://server/b");
    });

    it("should set path to forward-slash when empty", () => {
      const locationUrl = new LocationHtml5Url(
        "http://server/",
        "http://server/",
      );
      locationUrl.$$parse("http://server/");
      expect(locationUrl.path()).toBe("/");
      expect(locationUrl.absUrl()).toBe("http://server/");
    });

    it("setters should return Url object to allow chaining", () => {
      const locationUrl = createLocationHtml5Url();
      expect(locationUrl.path("/any")).toBe(locationUrl);
      expect(locationUrl.search("")).toBe(locationUrl);
      expect(locationUrl.hash("aaa")).toBe(locationUrl);
      expect(locationUrl.url("/some")).toBe(locationUrl);
    });

    it("should not preserve old properties when parsing new url", () => {
      const locationUrl = createLocationHtml5Url();
      locationUrl.$$parse("http://www.domain.com:9877/a");

      expect(locationUrl.path()).toBe("/a");
      expect(locationUrl.search()).toEqual({});
      expect(locationUrl.hash()).toBe("");
      expect(locationUrl.absUrl()).toBe("http://www.domain.com:9877/a");
    });

    // it("should not rewrite when hashbang url is not given", () => {
    //   initService({ html5Mode: true, hashPrefix: "!", supportHistory: true });
    //   initBrowser({ url: "http://domain.com/base/a/b", basePath: "/base" });
    //   expect($browser.url()).toBe("http://domain.com/base/a/b");
    // });

    it("should prepend path with basePath", () => {
      const locationUrl = new LocationHtml5Url(
        "http://server/base/",
        "http://server/base/",
      );
      locationUrl.$$parse("http://server/base/abc?a");
      expect(locationUrl.path()).toBe("/abc");
      expect(locationUrl.search()).toEqual({ a: true });

      locationUrl.path("/new/path");
      expect(locationUrl.absUrl()).toBe("http://server/base/new/path?a");
    });

    it("should throw error when invalid server url given", () => {
      const locationUrl = new LocationHtml5Url(
        "http://server.org/base/abc",
        "http://server.org/base/",
      );

      expect(() => {
        locationUrl.$$parse("http://other.server.org/path#/path");
      }).toThrowError(/ipthprfx/);
    });

    it("should throw error when invalid base url given", () => {
      const locationUrl = new LocationHtml5Url(
        "http://server.org/base/abc",
        "http://server.org/base/",
      );

      expect(() => {
        locationUrl.$$parse("http://server.org/path#/path");
      }).toThrowError(/ipthprfx/);
    });

    describe("state", () => {
      it("should set $$state and return itself", () => {
        const locationUrl = createLocationHtml5Url();
        expect(locationUrl.$$state).toEqual(undefined);

        const returned = locationUrl.state({ a: 2 });
        expect(locationUrl.$$state).toEqual({ a: 2 });
        expect(returned).toBe(locationUrl);
      });

      it("should set state", () => {
        const locationUrl = createLocationHtml5Url();
        locationUrl.state({ a: 2 });
        expect(locationUrl.state()).toEqual({ a: 2 });
      });

      it("should allow to set both URL and state", () => {
        const locationUrl = createLocationHtml5Url();
        locationUrl.url("/foo").state({ a: 2 });
        expect(locationUrl.url()).toEqual("/foo");
        expect(locationUrl.state()).toEqual({ a: 2 });
      });

      it("should allow to mix state and various URL functions", () => {
        const locationUrl = createLocationHtml5Url();
        locationUrl
          .path("/foo")
          .hash("abcd")
          .state({ a: 2 })
          .search("bar", "baz");

        expect(locationUrl.path()).toEqual("/foo");
        expect(locationUrl.state()).toEqual({ a: 2 });
        expect(locationUrl.search() && locationUrl.search().bar).toBe("baz");
        expect(locationUrl.hash()).toEqual("abcd");
      });
    });

    describe("encoding", () => {
      it("should encode special characters", () => {
        const locationUrl = createLocationHtml5Url();
        locationUrl.path("/a <>#");
        locationUrl.search({ "i j": "<>#" });
        locationUrl.hash("<>#");

        expect(locationUrl.path()).toBe("/a <>#");
        expect(locationUrl.search()).toEqual({ "i j": "<>#" });
        expect(locationUrl.hash()).toBe("<>#");
        expect(locationUrl.absUrl()).toBe(
          "http://www.domain.com:9877/a%20%3C%3E%23?i%20j=%3C%3E%23#%3C%3E%23",
        );
      });

      it("should not encode !$:@", () => {
        const locationUrl = createLocationHtml5Url();
        locationUrl.path("/!$:@");
        locationUrl.search("");
        locationUrl.hash("!$:@");

        expect(locationUrl.absUrl()).toBe(
          "http://www.domain.com:9877/!$:@#!$:@",
        );
      });

      it("should decode special characters", () => {
        const locationUrl = new LocationHtml5Url(
          "http://host.com/",
          "http://host.com/",
        );
        locationUrl.$$parse(
          "http://host.com/a%20%3C%3E%23?i%20j=%3C%3E%23#x%20%3C%3E%23",
        );
        expect(locationUrl.path()).toBe("/a <>#");
        expect(locationUrl.search()).toEqual({ "i j": "<>#" });
        expect(locationUrl.hash()).toBe("x <>#");
      });

      it("should not decode encoded forward slashes in the path", () => {
        const locationUrl = new LocationHtml5Url(
          "http://host.com/base/",
          "http://host.com/base/",
        );
        locationUrl.$$parse("http://host.com/base/a/ng2;path=%2Fsome%2Fpath");
        expect(locationUrl.path()).toBe("/a/ng2;path=%2Fsome%2Fpath");
        expect(locationUrl.search()).toEqual({});
        expect(locationUrl.hash()).toBe("");
        expect(locationUrl.url()).toBe("/a/ng2;path=%2Fsome%2Fpath");
        expect(locationUrl.absUrl()).toBe(
          "http://host.com/base/a/ng2;path=%2Fsome%2Fpath",
        );
      });

      it("should decode pluses as spaces in urls", () => {
        const locationUrl = new LocationHtml5Url(
          "http://host.com/",
          "http://host.com/",
        );
        locationUrl.$$parse("http://host.com/?a+b=c+d");
        expect(locationUrl.search()).toEqual({ "a b": "c d" });
      });

      it("should retain pluses when setting search queries", () => {
        const locationUrl = createLocationHtml5Url();
        locationUrl.search({ "a+b": "c+d" });
        expect(locationUrl.search()).toEqual({ "a+b": "c+d" });
      });
    });
  });

  describe("HashbangUrl", () => {
    function createHashbangUrl() {
      const locationUrl = new LocationHashbangUrl(
        "http://www.server.org:1234/base",
        "http://www.server.org:1234/",
        "#!",
      );
      locationUrl.$$parse("http://www.server.org:1234/base#!/path?a=b&c#hash");
      return locationUrl;
    }

    it("should parse hashbang url into path and search", () => {
      const locationUrl = createHashbangUrl();
      expect(locationUrl.protocol()).toBe("http");
      expect(locationUrl.host()).toBe("www.server.org");
      expect(locationUrl.port()).toBe(1234);
      expect(locationUrl.path()).toBe("/path");
      expect(locationUrl.search()).toEqual({ a: "b", c: true });
      expect(locationUrl.hash()).toBe("hash");
    });

    it("absUrl() should return hashbang url", () => {
      const locationUrl = createHashbangUrl();
      expect(locationUrl.absUrl()).toBe(
        "http://www.server.org:1234/base#!/path?a=b&c#hash",
      );

      locationUrl.path("/new/path");
      locationUrl.search({ one: 1 });
      locationUrl.hash("hhh");
      expect(locationUrl.absUrl()).toBe(
        "http://www.server.org:1234/base#!/new/path?one=1#hhh",
      );
    });

    it("should preserve query params in base", () => {
      const locationUrl = new LocationHashbangUrl(
        "http://www.server.org:1234/base?base=param",
        "http://www.server.org:1234/",
        "#",
      );
      locationUrl.$$parse(
        "http://www.server.org:1234/base?base=param#/path?a=b&c#hash",
      );
      expect(locationUrl.absUrl()).toBe(
        "http://www.server.org:1234/base?base=param#/path?a=b&c#hash",
      );

      locationUrl.path("/new/path");
      locationUrl.search({ one: 1 });
      locationUrl.hash("hhh");
      expect(locationUrl.absUrl()).toBe(
        "http://www.server.org:1234/base?base=param#/new/path?one=1#hhh",
      );
    });

    it("should prefix path with forward-slash", () => {
      const locationUrl = new LocationHashbangUrl(
        "http://host.com/base",
        "http://host.com/",
        "#",
      );
      locationUrl.$$parse("http://host.com/base#path");
      expect(locationUrl.path()).toBe("/path");
      expect(locationUrl.absUrl()).toBe("http://host.com/base#/path");

      locationUrl.path("wrong");
      expect(locationUrl.path()).toBe("/wrong");
      expect(locationUrl.absUrl()).toBe("http://host.com/base#/wrong");
    });

    it("should set path to forward-slash when empty", () => {
      const locationUrl = new LocationHashbangUrl(
        "http://server/base",
        "http://server/",
        "#!",
      );
      locationUrl.$$parse("http://server/base");
      locationUrl.path("aaa");

      expect(locationUrl.path()).toBe("/aaa");
      expect(locationUrl.absUrl()).toBe("http://server/base#!/aaa");
    });

    it("should not preserve old properties when parsing new url", () => {
      const locationUrl = createHashbangUrl();
      locationUrl.$$parse("http://www.server.org:1234/base#!/");

      expect(locationUrl.path()).toBe("/");
      expect(locationUrl.search()).toEqual({});
      expect(locationUrl.hash()).toBe("");
      expect(locationUrl.absUrl()).toBe("http://www.server.org:1234/base#!/");
    });

    it("should insert default hashbang if a hash is given with no hashbang prefix", () => {
      const locationUrl = createHashbangUrl();

      locationUrl.$$parse("http://www.server.org:1234/base#/path");
      expect(locationUrl.absUrl()).toBe(
        "http://www.server.org:1234/base#!#%2Fpath",
      );
      expect(locationUrl.hash()).toBe("/path");
      expect(locationUrl.path()).toBe("");

      locationUrl.$$parse("http://www.server.org:1234/base#");
      expect(locationUrl.absUrl()).toBe("http://www.server.org:1234/base");
      expect(locationUrl.hash()).toBe("");
      expect(locationUrl.path()).toBe("");
    });

    it("should ignore extra path segments if no hashbang is given", () => {
      const locationUrl = createHashbangUrl();
      locationUrl.$$parse("http://www.server.org:1234/base/extra/path");
      expect(locationUrl.absUrl()).toBe("http://www.server.org:1234/base");
      expect(locationUrl.path()).toBe("");
      expect(locationUrl.hash()).toBe("");
    });

    describe("encoding", () => {
      it("should encode special characters", () => {
        const locationUrl = createHashbangUrl();
        locationUrl.path("/a <>#");
        locationUrl.search({ "i j": "<>#" });
        locationUrl.hash("<>#");

        expect(locationUrl.path()).toBe("/a <>#");
        expect(locationUrl.search()).toEqual({ "i j": "<>#" });
        expect(locationUrl.hash()).toBe("<>#");
        expect(locationUrl.absUrl()).toBe(
          "http://www.server.org:1234/base#!/a%20%3C%3E%23?i%20j=%3C%3E%23#%3C%3E%23",
        );
      });

      it("should not encode !$:@", () => {
        const locationUrl = createHashbangUrl();
        locationUrl.path("/!$:@");
        locationUrl.search("");
        locationUrl.hash("!$:@");

        expect(locationUrl.absUrl()).toBe(
          "http://www.server.org:1234/base#!/!$:@#!$:@",
        );
      });

      it("should decode special characters", () => {
        const locationUrl = new LocationHashbangUrl(
          "http://host.com/a",
          "http://host.com/",
          "#",
        );
        locationUrl.$$parse(
          "http://host.com/a#/%20%3C%3E%23?i%20j=%3C%3E%23#x%20%3C%3E%23",
        );
        expect(locationUrl.path()).toBe("/ <>#");
        expect(locationUrl.search()).toEqual({ "i j": "<>#" });
        expect(locationUrl.hash()).toBe("x <>#");
      });

      it("should return decoded characters for search specified in URL", () => {
        const locationUrl = new LocationHtml5Url(
          "http://host.com/",
          "http://host.com/",
        );
        locationUrl.$$parse("http://host.com/?q=1%2F2%203");
        expect(locationUrl.search()).toEqual({ q: "1/2 3" });
      });

      it("should return decoded characters for search specified with setter", () => {
        const locationUrl = new LocationHtml5Url(
          "http://host.com/",
          "http://host.com/",
        );
        locationUrl.$$parse("http://host.com/");
        locationUrl.search("q", "1/2 3");
        expect(locationUrl.search()).toEqual({ q: "1/2 3" });
      });

      it("should return an array for duplicate params", () => {
        const locationUrl = new LocationHtml5Url(
          "http://host.com",
          "http://host.com",
        );
        locationUrl.$$parse("http://host.com");
        locationUrl.search("q", ["1/2 3", "4/5 6"]);
        expect(locationUrl.search()).toEqual({ q: ["1/2 3", "4/5 6"] });
      });

      it("should encode an array correctly from search and add to url", () => {
        const locationUrl = new LocationHtml5Url(
          "http://host.com",
          "http://host.com",
        );
        locationUrl.$$parse("http://host.com");
        locationUrl.search({ q: ["1/2 3", "4/5 6"] });
        expect(locationUrl.absUrl()).toEqual(
          "http://host.com?q=1%2F2%203&q=4%2F5%206",
        );
      });

      it("should rewrite params when specifying a single param in search", () => {
        const locationUrl = new LocationHtml5Url(
          "http://host.com",
          "http://host.com",
        );
        locationUrl.$$parse("http://host.com");
        locationUrl.search({ q: "1/2 3" });
        expect(locationUrl.absUrl()).toEqual("http://host.com?q=1%2F2%203");
        locationUrl.search({ q: "4/5 6" });
        expect(locationUrl.absUrl()).toEqual("http://host.com?q=4%2F5%206");
      });

      it("url() should decode non-component special characters in hashbang mode", () => {
        const locationUrl = new LocationHashbangUrl(
          "http://host.com",
          "http://host.com",
        );
        locationUrl.$$parse("http://host.com");
        locationUrl.url("/foo%3Abar");
        expect(locationUrl.path()).toEqual("/foo:bar");
      });

      it("url() should decode non-component special characters in html5 mode", () => {
        const locationUrl = new LocationHtml5Url(
          "http://host.com",
          "http://host.com",
        );
        locationUrl.$$parse("http://host.com");
        locationUrl.url("/foo%3Abar");
        expect(locationUrl.path()).toEqual("/foo:bar");
      });
    });
  });

  // describe("location watch", () => {
  //   it("should not update browser if only the empty hash fragment is cleared", () => {
  //     initService({ supportHistory: true });
  //     mockUpBrowser({ initialUrl: "http://new.com/a/b#", baseHref: "/base/" });
  //     inject(($browser, $rootScope) => {
  //       $browser.url("http://new.com/a/b");
  //       const $browserUrl = spyOnlyCallsWithArgs(
  //         $browser,
  //         "url",
  //       ).and.callThrough();
  //       $rootScope.$digest();
  //       expect($browserUrl).not.toHaveBeenCalled();
  //     });
  //   });

  //   it("should not replace browser url if only the empty hash fragment is cleared", () => {
  //     initService({ html5Mode: true, supportHistory: true });
  //     mockUpBrowser({ initialUrl: "http://new.com/#", baseHref: "/" });
  //     inject(($browser, $location, $window) => {
  //       expect($browser.url()).toBe("http://new.com/");
  //       expect($location.absUrl()).toBe("http://new.com/");
  //       expect($window.location.href).toBe("http://new.com/#");
  //     });
  //   });

  //   it("should not get caught in infinite digest when replacing path in locationChangeSuccess handler", () => {
  //     initService({ html5Mode: true, supportHistory: false });
  //     mockUpBrowser({
  //       initialUrl: "http://server/base/home",
  //       baseHref: "/base/",
  //     });
  //     inject(($browser, $location, $rootScope, $window) => {
  //       let handlerCalled = false;
  //       $rootScope.$on("$locationChangeSuccess", () => {
  //         handlerCalled = true;
  //         if ($location.path() !== "/") {
  //           $location.path("/").replace();
  //         }
  //       });
  //       expect($browser.url()).toEqual("http://server/base/#!/home");
  //       $rootScope.$digest();
  //       expect(handlerCalled).toEqual(true);
  //       expect($browser.url()).toEqual("http://server/base/#!/");
  //     });
  //   });

  //   it("should not infinitely digest when using a semicolon in initial path", () => {
  //     initService({ html5Mode: true, supportHistory: true });
  //     mockUpBrowser({
  //       initialUrl: "http://localhost:9876/;jsessionid=foo",
  //       baseHref: "/",
  //     });
  //     inject(($location, $browser, $rootScope) => {
  //       expect(() => {
  //         $rootScope.$digest();
  //       }).not.toThrow();
  //     });
  //   });

  //   // https://github.com/angular/angular.js/issues/16592
  //   it("should not infinitely digest when initial params contain a quote", () => {
  //     initService({ html5Mode: true, supportHistory: true });
  //     mockUpBrowser({
  //       initialUrl: "http://localhost:9876/?q='",
  //       baseHref: "/",
  //     });
  //     inject(($location, $browser, $rootScope) => {
  //       expect(() => {
  //         $rootScope.$digest();
  //       }).not.toThrow();
  //     });
  //   });

  //   // https://github.com/angular/angular.js/issues/16592
  //   it("should not infinitely digest when initial params contain an escaped quote", () => {
  //     initService({ html5Mode: true, supportHistory: true });
  //     mockUpBrowser({
  //       initialUrl: "http://localhost:9876/?q=%27",
  //       baseHref: "/",
  //     });
  //     inject(($location, $browser, $rootScope) => {
  //       expect(() => {
  //         $rootScope.$digest();
  //       }).not.toThrow();
  //     });
  //   });

  //   // https://github.com/angular/angular.js/issues/16592
  //   it("should not infinitely digest when updating params containing a quote (via $browser.url)", () => {
  //     initService({ html5Mode: true, supportHistory: true });
  //     mockUpBrowser({ initialUrl: "http://localhost:9876/", baseHref: "/" });
  //     inject(($location, $browser, $rootScope) => {
  //       $rootScope.$digest();
  //       $browser.url("http://localhost:9876/?q='");
  //       expect(() => {
  //         $rootScope.$digest();
  //       }).not.toThrow();
  //     });
  //   });

  //   // https://github.com/angular/angular.js/issues/16592
  //   it("should not infinitely digest when updating params containing a quote (via window.location + popstate)", () => {
  //     initService({ html5Mode: true, supportHistory: true });
  //     mockUpBrowser({ initialUrl: "http://localhost:9876/", baseHref: "/" });
  //     inject(($window, $location, $browser, $rootScope) => {
  //       $rootScope.$digest();
  //       $window.location.href = "http://localhost:9876/?q='";
  //       expect(() => {
  //         JQLite($window).triggerHandler("popstate");
  //       }).not.toThrow();
  //     });
  //   });

  //   describe("when changing the browser URL/history directly during a `$digest`", () => {
  //     beforeEach(() => {
  //       initService({ supportHistory: true });
  //       mockUpBrowser({ initialUrl: "http://foo.bar/", baseHref: "/" });
  //     });

  //     it("should correctly update `$location` from history and not digest infinitely", inject((
  //       $browser,
  //       $location,
  //       $rootScope,
  //       $window,
  //     ) => {
  //       $location.url("baz");
  //       $rootScope.$digest();

  //       const originalUrl = $window.location.href;

  //       $rootScope.$apply(() => {
  //         $rootScope.$evalAsync(() => {
  //           $window.history.pushState({}, null, `${originalUrl}/qux`);
  //         });
  //       });

  //       expect($browser.url()).toBe("http://foo.bar/#!/baz/qux");
  //       expect($location.absUrl()).toBe("http://foo.bar/#!/baz/qux");

  //       $rootScope.$apply(() => {
  //         $rootScope.$evalAsync(() => {
  //           $window.history.replaceState({}, null, `${originalUrl}/quux`);
  //         });
  //       });

  //       expect($browser.url()).toBe("http://foo.bar/#!/baz/quux");
  //       expect($location.absUrl()).toBe("http://foo.bar/#!/baz/quux");
  //     }));

  //     it("should correctly update `$location` from URL and not digest infinitely", inject((
  //       $browser,
  //       $location,
  //       $rootScope,
  //       $window,
  //     ) => {
  //       $location.url("baz");
  //       $rootScope.$digest();

  //       $rootScope.$apply(() => {
  //         $rootScope.$evalAsync(() => {
  //           $window.location.href += "/qux";
  //         });
  //       });

  //       JQLite($window).triggerHandler("hashchange");

  //       expect($browser.url()).toBe("http://foo.bar/#!/baz/qux");
  //       expect($location.absUrl()).toBe("http://foo.bar/#!/baz/qux");
  //     }));
  //   });

  //   function updatePathOnLocationChangeSuccessTo(newPath, newParams) {
  //     inject(($rootScope, $location) => {
  //       $rootScope.$on("$locationChangeSuccess", (event, newUrl, oldUrl) => {
  //         $location.path(newPath);
  //         if (newParams) {
  //           $location.search(newParams);
  //         }
  //       });
  //     });
  //   }

  //   describe("location watch for hashbang browsers", () => {
  //     it("should not infinite $digest when going to base URL without trailing slash when $locationChangeSuccess watcher changes path to /Home", () => {
  //       initService({ html5Mode: true, supportHistory: false });
  //       mockUpBrowser({ initialUrl: "http://server/app/", baseHref: "/app/" });
  //       inject(($rootScope, $location, $browser) => {
  //         const $browserUrl = spyOnlyCallsWithArgs(
  //           $browser,
  //           "url",
  //         ).and.callThrough();

  //         updatePathOnLocationChangeSuccessTo("/Home");

  //         $rootScope.$digest();

  //         expect($browser.url()).toEqual("http://server/app/#!/Home");
  //         expect($location.path()).toEqual("/Home");
  //         expect($browserUrl).toHaveBeenCalledTimes(1);
  //       });
  //     });

  //     it("should not infinite $digest when going to base URL without trailing slash when $locationChangeSuccess watcher changes path to /", () => {
  //       initService({ html5Mode: true, supportHistory: false });
  //       mockUpBrowser({
  //         initialUrl: "http://server/app/Home",
  //         baseHref: "/app/",
  //       });
  //       inject(($rootScope, $location, $browser, $window) => {
  //         const $browserUrl = spyOnlyCallsWithArgs(
  //           $browser,
  //           "url",
  //         ).and.callThrough();

  //         updatePathOnLocationChangeSuccessTo("/");

  //         $rootScope.$digest();

  //         expect($browser.url()).toEqual("http://server/app/#!/");
  //         expect($location.path()).toEqual("/");
  //         expect($browserUrl).toHaveBeenCalledTimes(1);
  //         expect($browserUrl.calls.argsFor(0)).toEqual([
  //           "http://server/app/#!/",
  //           false,
  //           null,
  //         ]);
  //       });
  //     });

  //     it("should not infinite $digest when going to base URL with trailing slash when $locationChangeSuccess watcher changes path to /Home", () => {
  //       initService({ html5Mode: true, supportHistory: false });
  //       mockUpBrowser({ initialUrl: "http://server/app/", baseHref: "/app/" });
  //       inject(($rootScope, $location, $browser) => {
  //         const $browserUrl = spyOnlyCallsWithArgs(
  //           $browser,
  //           "url",
  //         ).and.callThrough();

  //         updatePathOnLocationChangeSuccessTo("/Home");
  //         $rootScope.$digest();

  //         expect($browser.url()).toEqual("http://server/app/#!/Home");
  //         expect($location.path()).toEqual("/Home");
  //         expect($browserUrl).toHaveBeenCalledTimes(1);
  //         expect($browserUrl.calls.argsFor(0)).toEqual([
  //           "http://server/app/#!/Home",
  //           false,
  //           null,
  //         ]);
  //       });
  //     });

  //     it("should not infinite $digest when going to base URL with trailing slash when $locationChangeSuccess watcher changes path to /", () => {
  //       initService({ html5Mode: true, supportHistory: false });
  //       mockUpBrowser({ initialUrl: "http://server/app/", baseHref: "/app/" });
  //       inject(($rootScope, $location, $browser) => {
  //         const $browserUrl = spyOnlyCallsWithArgs(
  //           $browser,
  //           "url",
  //         ).and.callThrough();

  //         updatePathOnLocationChangeSuccessTo("/");
  //         $rootScope.$digest();

  //         expect($browser.url()).toEqual("http://server/app/#!/");
  //         expect($location.path()).toEqual("/");
  //         expect($browserUrl).toHaveBeenCalledTimes(1);
  //       });
  //     });
  //   });

  //   describe("location watch for HTML5 browsers", () => {
  //     it("should not infinite $digest when going to base URL without trailing slash when $locationChangeSuccess watcher changes path to /Home", () => {
  //       initService({ html5Mode: true, supportHistory: true });
  //       mockUpBrowser({ initialUrl: "http://server/app/", baseHref: "/app/" });
  //       inject(($rootScope, $injector, $browser) => {
  //         const $browserUrl = spyOnlyCallsWithArgs(
  //           $browser,
  //           "url",
  //         ).and.callThrough();

  //         const $location = $injector.get("$location");
  //         updatePathOnLocationChangeSuccessTo("/Home");

  //         $rootScope.$digest();

  //         expect($browser.url()).toEqual("http://server/app/Home");
  //         expect($location.path()).toEqual("/Home");
  //         expect($browserUrl).toHaveBeenCalledTimes(1);
  //       });
  //     });

  //     it("should not infinite $digest when going to base URL without trailing slash when $locationChangeSuccess watcher changes path to /", () => {
  //       initService({ html5Mode: true, supportHistory: true });
  //       mockUpBrowser({ initialUrl: "http://server/app/", baseHref: "/app/" });
  //       inject(($rootScope, $injector, $browser) => {
  //         const $browserUrl = spyOnlyCallsWithArgs(
  //           $browser,
  //           "url",
  //         ).and.callThrough();

  //         const $location = $injector.get("$location");
  //         updatePathOnLocationChangeSuccessTo("/");

  //         $rootScope.$digest();

  //         expect($browser.url()).toEqual("http://server/app/");
  //         expect($location.path()).toEqual("/");
  //         expect($browserUrl).not.toHaveBeenCalled();
  //       });
  //     });

  //     it("should not infinite $digest when going to base URL with trailing slash when $locationChangeSuccess watcher changes path to /Home", () => {
  //       initService({ html5Mode: true, supportHistory: true });
  //       mockUpBrowser({ initialUrl: "http://server/app/", baseHref: "/app/" });
  //       inject(($rootScope, $injector, $browser) => {
  //         const $browserUrl = spyOnlyCallsWithArgs(
  //           $browser,
  //           "url",
  //         ).and.callThrough();

  //         const $location = $injector.get("$location");
  //         updatePathOnLocationChangeSuccessTo("/Home");

  //         $rootScope.$digest();

  //         expect($browser.url()).toEqual("http://server/app/Home");
  //         expect($location.path()).toEqual("/Home");
  //         expect($browserUrl).toHaveBeenCalledTimes(1);
  //       });
  //     });

  //     it("should not infinite $digest when going to base URL with trailing slash when $locationChangeSuccess watcher changes path to /", () => {
  //       initService({ html5Mode: true, supportHistory: true });
  //       mockUpBrowser({ initialUrl: "http://server/app/", baseHref: "/app/" });
  //       inject(($rootScope, $injector, $browser) => {
  //         const $browserUrl = spyOnlyCallsWithArgs(
  //           $browser,
  //           "url",
  //         ).and.callThrough();

  //         const $location = $injector.get("$location");
  //         updatePathOnLocationChangeSuccessTo("/");

  //         $rootScope.$digest();

  //         expect($browser.url()).toEqual("http://server/app/");
  //         expect($location.path()).toEqual("/");
  //         expect($browserUrl).not.toHaveBeenCalled();
  //       });
  //     });

  //     // https://github.com/angular/angular.js/issues/16592
  //     it("should not infinite $digest when going to base URL with trailing slash when $locationChangeSuccess watcher changes query params to contain quote", () => {
  //       initService({ html5Mode: true, supportHistory: true });
  //       mockUpBrowser({ initialUrl: "http://server/app/", baseHref: "/app/" });
  //       inject(($rootScope, $injector, $browser) => {
  //         const $browserUrl = spyOnlyCallsWithArgs(
  //           $browser,
  //           "url",
  //         ).and.callThrough();

  //         const $location = $injector.get("$location");
  //         updatePathOnLocationChangeSuccessTo("/", { q: "'" });

  //         $rootScope.$digest();

  //         expect($location.path()).toEqual("/");
  //         expect($location.search()).toEqual({ q: "'" });
  //         expect($browserUrl).toHaveBeenCalledTimes(1);
  //       });
  //     });
  //   });
  // });

  // describe("wiring", () => {
  //   it("should update $location when browser url changes", () => {
  //     initService({ html5Mode: false, hashPrefix: "!", supportHistory: true });
  //     mockUpBrowser({ initialUrl: "http://new.com/a/b#!", baseHref: "/a/b" });
  //     inject(($window, $browser, $location, $rootScope) => {
  //       spyOn($location, "$$parse").and.callThrough();
  //       $window.location.href = "http://new.com/a/b#!/aaa";
  //       $browser.$$checkUrlChange();
  //       expect($location.absUrl()).toBe("http://new.com/a/b#!/aaa");
  //       expect($location.path()).toBe("/aaa");
  //       expect($location.$$parse).toHaveBeenCalled();
  //     });
  //   });

  //   // location.href = '...' fires hashchange event synchronously, so it might happen inside $apply
  //   it("should not $apply when browser url changed inside $apply", () => {
  //     initService({ html5Mode: false, hashPrefix: "!", supportHistory: true });
  //     mockUpBrowser({ initialUrl: "http://new.com/a/b#!", baseHref: "/a/b" });
  //     inject(($rootScope, $browser, $location, $window) => {
  //       const OLD_URL = $browser.url();
  //       const NEW_URL = "http://new.com/a/b#!/new";

  //       $rootScope.$apply(() => {
  //         $window.location.href = NEW_URL;
  //         $browser.$$checkUrlChange(); // simulate firing event from browser
  //         expect($location.absUrl()).toBe(OLD_URL); // should be async
  //       });

  //       expect($location.absUrl()).toBe(NEW_URL);
  //     });
  //   });

  //   // location.href = '...' fires hashchange event synchronously, so it might happen inside $digest
  //   it("should not $apply when browser url changed inside $digest", () => {
  //     initService({ html5Mode: false, hashPrefix: "!", supportHistory: true });
  //     mockUpBrowser({ initialUrl: "http://new.com/a/b#!", baseHref: "/a/b" });
  //     inject(($rootScope, $browser, $location, $window) => {
  //       const OLD_URL = $browser.url();
  //       const NEW_URL = "http://new.com/a/b#!/new";
  //       let notRunYet = true;

  //       $rootScope.$watch(() => {
  //         if (notRunYet) {
  //           notRunYet = false;
  //           $window.location.href = NEW_URL;
  //           $browser.$$checkUrlChange(); // simulate firing event from browser
  //           expect($location.absUrl()).toBe(OLD_URL); // should be async
  //         }
  //       });

  //       $rootScope.$digest();
  //       expect($location.absUrl()).toBe(NEW_URL);
  //     });
  //   });

  //   it("should update browser when $location changes", () => {
  //     initService({ html5Mode: false, hashPrefix: "!", supportHistory: true });
  //     mockUpBrowser({ initialUrl: "http://new.com/a/b#!", baseHref: "/a/b" });
  //     inject(($rootScope, $browser, $location) => {
  //       const $browserUrl = spyOnlyCallsWithArgs(
  //         $browser,
  //         "url",
  //       ).and.callThrough();
  //       $location.path("/new/path");
  //       expect($browserUrl).not.toHaveBeenCalled();
  //       $rootScope.$apply();

  //       expect($browserUrl).toHaveBeenCalled();
  //       expect($browser.url()).toBe("http://new.com/a/b#!/new/path");
  //     });
  //   });

  //   it("should update browser only once per $apply cycle", () => {
  //     initService({ html5Mode: false, hashPrefix: "!", supportHistory: true });
  //     mockUpBrowser({ initialUrl: "http://new.com/a/b#!", baseHref: "/a/b" });
  //     inject(($rootScope, $browser, $location) => {
  //       const $browserUrl = spyOnlyCallsWithArgs(
  //         $browser,
  //         "url",
  //       ).and.callThrough();
  //       $location.path("/new/path");

  //       $rootScope.$watch(() => {
  //         $location.search("a=b");
  //       });

  //       $rootScope.$apply();
  //       expect($browserUrl).toHaveBeenCalled();
  //       expect($browser.url()).toBe("http://new.com/a/b#!/new/path?a=b");
  //     });
  //   });

  //   it("should replace browser url when url was replaced at least once", () => {
  //     initService({ html5Mode: false, hashPrefix: "!", supportHistory: true });
  //     mockUpBrowser({ initialUrl: "http://new.com/a/b#!", baseHref: "/a/b" });
  //     inject(($rootScope, $browser, $location) => {
  //       const $browserUrl = spyOnlyCallsWithArgs(
  //         $browser,
  //         "url",
  //       ).and.callThrough();
  //       $location.path("/n/url").replace();
  //       $rootScope.$apply();

  //       expect($browserUrl).toHaveBeenCalled();
  //       expect($browserUrl.calls.mostRecent().args).toEqual([
  //         "http://new.com/a/b#!/n/url",
  //         true,
  //         null,
  //       ]);
  //       expect($location.$$replace).toBe(false);
  //     });
  //   });

  //   it("should always reset replace flag after running watch", () => {
  //     initService({ html5Mode: false, hashPrefix: "!", supportHistory: true });
  //     mockUpBrowser({ initialUrl: "http://new.com/a/b#!", baseHref: "/a/b" });
  //     inject(($rootScope, $browser, $location) => {
  //       // init watches
  //       $location.url("/initUrl");
  //       $rootScope.$apply();

  //       // changes url but resets it before digest
  //       $location.url("/newUrl").replace().url("/initUrl");
  //       $rootScope.$apply();
  //       expect($location.$$replace).toBe(false);

  //       // set the url to the old value
  //       $location.url("/newUrl").replace();
  //       $rootScope.$apply();
  //       expect($location.$$replace).toBe(false);

  //       // doesn't even change url only calls replace()
  //       $location.replace();
  //       $rootScope.$apply();
  //       expect($location.$$replace).toBe(false);
  //     });
  //   });

  //   it("should update the browser if changed from within a watcher", () => {
  //     initService({ html5Mode: false, hashPrefix: "!", supportHistory: true });
  //     mockUpBrowser({ initialUrl: "http://new.com/a/b#!", baseHref: "/a/b" });
  //     inject(($rootScope, $browser, $location) => {
  //       $rootScope.$watch(
  //         () => true,
  //         () => {
  //           $location.path("/changed");
  //         },
  //       );

  //       $rootScope.$digest();
  //       expect($browser.url()).toBe("http://new.com/a/b#!/changed");
  //     });
  //   });

  //   it("should not infinitely digest if hash is set when there is no hashPrefix", () => {
  //     initService({ html5Mode: false, hashPrefix: "", supportHistory: true });
  //     mockUpBrowser({ initialUrl: "http://new.com/a/b", baseHref: "/a/b" });
  //     inject(($rootScope, $browser, $location) => {
  //       $location.hash("test");

  //       $rootScope.$digest();
  //       expect($browser.url()).toBe("http://new.com/a/b##test");
  //     });
  //   });
  // });

  // describe("wiring in html5 mode", () => {
  //   it("should initialize state to initial state from the browser", () => {
  //     initService({ html5Mode: true, supportHistory: true });
  //     mockUpBrowser({
  //       initialUrl: "http://new.com/a/b/",
  //       baseHref: "/a/b/",
  //       state: { a: 2 },
  //     });
  //     inject(($location) => {
  //       expect($location.state()).toEqual({ a: 2 });
  //     });
  //   });

  //   it("should update $location when browser state changes", () => {
  //     initService({ html5Mode: true, supportHistory: true });
  //     mockUpBrowser({ initialUrl: "http://new.com/a/b/", baseHref: "/a/b/" });
  //     inject(($location, $rootScope, $window) => {
  //       $window.history.pushState({ b: 3 });
  //       $rootScope.$digest();

  //       expect($location.state()).toEqual({ b: 3 });

  //       $window.history.pushState(
  //         { b: 4 },
  //         null,
  //         `${$window.location.href}c?d=e#f`,
  //       );
  //       $rootScope.$digest();

  //       expect($location.path()).toBe("/c");
  //       expect($location.search()).toEqual({ d: "e" });
  //       expect($location.hash()).toBe("f");
  //       expect($location.state()).toEqual({ b: 4 });
  //     });
  //   });

  //   // https://github.com/angular/angular.js/issues/16592
  //   it("should not infinite $digest on pushState() with quote in param", () => {
  //     initService({ html5Mode: true, supportHistory: true });
  //     mockUpBrowser({ initialUrl: "http://server/app/", baseHref: "/app/" });
  //     inject(($rootScope, $injector, $window) => {
  //       const $location = $injector.get("$location");
  //       $rootScope.$digest(); // allow $location initialization to finish

  //       $window.history.pushState({}, null, "http://server/app/Home?q='");
  //       $rootScope.$digest();

  //       expect($location.absUrl()).toEqual("http://server/app/Home?q='");
  //       expect($location.path()).toEqual("/Home");
  //       expect($location.search()).toEqual({ q: "'" });
  //     });
  //   });

  //   // https://github.com/angular/angular.js/issues/16592
  //   it("should not infinite $digest on popstate event with quote in param", () => {
  //     initService({ html5Mode: true, supportHistory: true });
  //     mockUpBrowser({ initialUrl: "http://server/app/", baseHref: "/app/" });
  //     inject(($rootScope, $injector, $window) => {
  //       const $location = $injector.get("$location");
  //       $rootScope.$digest(); // allow $location initialization to finish

  //       $window.location.href = "http://server/app/Home?q='";
  //       JQLite($window).triggerHandler("popstate");

  //       expect($location.absUrl()).toEqual("http://server/app/Home?q='");
  //       expect($location.path()).toEqual("/Home");
  //       expect($location.search()).toEqual({ q: "'" });
  //     });
  //   });

  //   it("should replace browser url & state when replace() was called at least once", () => {
  //     initService({ html5Mode: true, supportHistory: true });
  //     mockUpBrowser({ initialUrl: "http://new.com/a/b/", baseHref: "/a/b/" });
  //     inject(($rootScope, $location, $browser) => {
  //       const $browserUrl = spyOnlyCallsWithArgs(
  //         $browser,
  //         "url",
  //       ).and.callThrough();
  //       $location.path("/n/url").state({ a: 2 }).replace();
  //       $rootScope.$apply();

  //       expect($browserUrl).toHaveBeenCalled();
  //       expect($browserUrl.calls.mostRecent().args).toEqual([
  //         "http://new.com/a/b/n/url",
  //         true,
  //         { a: 2 },
  //       ]);
  //       expect($location.$$replace).toBe(false);
  //       expect($location.$$state).toEqual({ a: 2 });
  //     });
  //   });

  //   it("should use only the most recent url & state definition", () => {
  //     initService({ html5Mode: true, supportHistory: true });
  //     mockUpBrowser({ initialUrl: "http://new.com/a/b/", baseHref: "/a/b/" });

  //     inject(($rootScope, $location, $browser) => {
  //       const $browserUrl = spyOnlyCallsWithArgs(
  //         $browser,
  //         "url",
  //       ).and.callThrough();
  //       $location
  //         .path("/n/url")
  //         .state({ a: 2 })
  //         .replace()
  //         .state({ b: 3 })
  //         .path("/o/url");
  //       $rootScope.$apply();

  //       expect($browserUrl).toHaveBeenCalled();
  //       expect($browserUrl.calls.mostRecent().args).toEqual([
  //         "http://new.com/a/b/o/url",
  //         true,
  //         { b: 3 },
  //       ]);
  //       expect($location.$$replace).toBe(false);
  //       expect($location.$$state).toEqual({ b: 3 });
  //     });
  //   });

  //   it("should allow to set state without touching the URL", () => {
  //     initService({ html5Mode: true, supportHistory: true });
  //     mockUpBrowser({ initialUrl: "http://new.com/a/b/", baseHref: "/a/b/" });

  //     inject(($rootScope, $location, $browser) => {
  //       const $browserUrl = spyOnlyCallsWithArgs(
  //         $browser,
  //         "url",
  //       ).and.callThrough();
  //       $location.state({ a: 2 }).replace().state({ b: 3 });
  //       $rootScope.$apply();

  //       expect($browserUrl).toHaveBeenCalled();
  //       expect($browserUrl.calls.mostRecent().args).toEqual([
  //         "http://new.com/a/b/",
  //         true,
  //         { b: 3 },
  //       ]);
  //       expect($location.$$replace).toBe(false);
  //       expect($location.$$state).toEqual({ b: 3 });
  //     });
  //   });

  //   it("should always reset replace flag after running watch", () => {
  //     initService({ html5Mode: true, supportHistory: true });
  //     mockUpBrowser({ initialUrl: "http://new.com/a/b/", baseHref: "/a/b/" });

  //     inject(($rootScope, $location) => {
  //       // init watches
  //       $location.url("/initUrl").state({ a: 2 });
  //       $rootScope.$apply();

  //       // changes url & state but resets them before digest
  //       $location
  //         .url("/newUrl")
  //         .state({ a: 2 })
  //         .replace()
  //         .state({ b: 3 })
  //         .url("/initUrl");
  //       $rootScope.$apply();
  //       expect($location.$$replace).toBe(false);

  //       // set the url to the old value
  //       $location.url("/newUrl").state({ a: 2 }).replace();
  //       $rootScope.$apply();
  //       expect($location.$$replace).toBe(false);

  //       // doesn't even change url only calls replace()
  //       $location.replace();
  //       $rootScope.$apply();
  //       expect($location.$$replace).toBe(false);
  //     });
  //   });

  //   it("should allow to modify state only before digest", () => {
  //     initService({ html5Mode: true, supportHistory: true });
  //     mockUpBrowser({ initialUrl: "http://new.com/a/b/", baseHref: "/a/b/" });

  //     inject(($rootScope, $location, $browser) => {
  //       const o = { a: 2 };
  //       $location.state(o);
  //       o.a = 3;
  //       $rootScope.$apply();
  //       expect($browser.state()).toEqual({ a: 3 });

  //       o.a = 4;
  //       $rootScope.$apply();
  //       expect($browser.state()).toEqual({ a: 3 });
  //     });
  //   });

  //   it("should make $location.state() referencially identical with $browser.state() after digest", () => {
  //     initService({ html5Mode: true, supportHistory: true });
  //     mockUpBrowser({ initialUrl: "http://new.com/a/b/", baseHref: "/a/b/" });

  //     inject(($rootScope, $location, $browser) => {
  //       $location.state({ a: 2 });
  //       $rootScope.$apply();
  //       expect($location.state()).toBe($browser.state());
  //     });
  //   });

  //   it("should allow to query the state after digest", () => {
  //     initService({ html5Mode: true, supportHistory: true });
  //     mockUpBrowser({ initialUrl: "http://new.com/a/b/", baseHref: "/a/b/" });

  //     inject(($rootScope, $location) => {
  //       $location.url("/foo").state({ a: 2 });
  //       $rootScope.$apply();
  //       expect($location.state()).toEqual({ a: 2 });
  //     });
  //   });

  //   it("should reset the state on .url() after digest", () => {
  //     initService({ html5Mode: true, supportHistory: true });
  //     mockUpBrowser({ initialUrl: "http://new.com/a/b/", baseHref: "/a/b/" });

  //     inject(($rootScope, $location, $browser) => {
  //       $location.url("/foo").state({ a: 2 });
  //       $rootScope.$apply();

  //       const $browserUrl = spyOnlyCallsWithArgs(
  //         $browser,
  //         "url",
  //       ).and.callThrough();
  //       $location.url("/bar");
  //       $rootScope.$apply();

  //       expect($browserUrl).toHaveBeenCalled();
  //       expect($browserUrl.calls.mostRecent().args).toEqual([
  //         "http://new.com/a/b/bar",
  //         false,
  //         null,
  //       ]);
  //     });
  //   });

  //   it("should force a page reload if navigating outside of the application base href", () => {
  //     initService({ html5Mode: true, supportHistory: true });
  //     mockUpBrowser({ initialUrl: "http://new.com/a/b/", baseHref: "/a/b/" });

  //     inject(($window, $browser, $location) => {
  //       $window.location.href = "http://new.com/a/outside.html";
  //       spyOn($window.location, "$$setHref");
  //       expect($window.location.$$setHref).not.toHaveBeenCalled();
  //       $browser.$$checkUrlChange();
  //       expect($window.location.$$setHref).toHaveBeenCalledWith(
  //         "http://new.com/a/outside.html",
  //       );
  //     });
  //   });
  // });

  // TODO MOVE TO PLAYWRIGHT
  // html5 history is disabled
  // describe("disabled history", () => {
  //   it("should use hashbang url with hash prefix", () => {
  //     initService({ html5Mode: false, hashPrefix: "!" });
  //     mockUpBrowser({
  //       initialUrl: "http://domain.com/base/index.html#!/a/b",
  //       baseHref: "/base/index.html",
  //     });
  //     inject(($rootScope, $location, $browser) => {
  //       expect($browser.url()).toBe("http://domain.com/base/index.html#!/a/b");
  //       $location.path("/new");
  //       $location.search({ a: true });
  //       $rootScope.$apply();
  //       expect($browser.url()).toBe(
  //         "http://domain.com/base/index.html#!/new?a",
  //       );
  //     });
  //   });

  //   it("should use hashbang url without hash prefix", () => {
  //     initService({ html5Mode: false, hashPrefix: "" });
  //     mockUpBrowser({
  //       initialUrl: "http://domain.com/base/index.html#/a/b",
  //       baseHref: "/base/index.html",
  //     });
  //     inject(($rootScope, $location, $browser) => {
  //       expect($browser.url()).toBe("http://domain.com/base/index.html#/a/b");
  //       $location.path("/new");
  //       $location.search({ a: true });
  //       $rootScope.$apply();
  //       expect($browser.url()).toBe("http://domain.com/base/index.html#/new?a");
  //     });
  //   });
  // });

  // TODO MOVE TO PLAYWRIGHT
  // html5 history enabled, but not supported by browser
  // describe("history on old browser", () => {
  //   it("should use hashbang url with hash prefix", () => {
  //     initService({ html5Mode: true, hashPrefix: "!!", supportHistory: false });
  //     inject(
  //       initBrowser({
  //         url: "http://domain.com/base/index.html#!!/a/b",
  //         basePath: "/base/index.html",
  //       }),
  //       ($rootScope, $location, $browser) => {
  //         expect($browser.url()).toBe(
  //           "http://domain.com/base/index.html#!!/a/b",
  //         );
  //         $location.path("/new");
  //         $location.search({ a: true });
  //         $rootScope.$apply();
  //         expect($browser.url()).toBe(
  //           "http://domain.com/base/index.html#!!/new?a",
  //         );
  //       },
  //     );
  //   });

  //   it("should redirect to hashbang url when new url given", () => {
  //     initService({ html5Mode: true, hashPrefix: "!" });
  //     inject(
  //       initBrowser({
  //         url: "http://domain.com/base/new-path/index.html",
  //         basePath: "/base/index.html",
  //       }),
  //       ($browser, $location) => {
  //         expect($browser.url()).toBe(
  //           "http://domain.com/base/index.html#!/new-path/index.html",
  //         );
  //       },
  //     );
  //   });

  //   it("should correctly convert html5 url with path matching basepath to hashbang url", () => {
  //     initService({ html5Mode: true, hashPrefix: "!", supportHistory: false });
  //     inject(
  //       initBrowser({
  //         url: "http://domain.com/base/index.html",
  //         basePath: "/base/index.html",
  //       }),
  //       ($browser, $location) => {
  //         expect($browser.url()).toBe(
  //           "http://domain.com/base/index.html#!/index.html",
  //         );
  //       },
  //     );
  //   });
  // });

  // TODO MOVE TO PLAYWRIGHT
  // html5 history enabled and supported by browser
  // describe("history on new browser", () => {
  //   it("should use new url", () => {
  //     initService({ html5Mode: true, hashPrefix: "", supportHistory: true });
  //     mockUpBrowser({
  //       initialUrl: "http://domain.com/base/old/index.html#a",
  //       baseHref: "/base/index.html",
  //     });
  //     inject(($rootScope, $location, $browser) => {
  //       expect($browser.url()).toBe("http://domain.com/base/old/index.html#a");
  //       $location.path("/new");
  //       $location.search({ a: true });
  //       $rootScope.$apply();
  //       expect($browser.url()).toBe("http://domain.com/base/new?a#a");
  //     });
  //   });

  //   it("should rewrite when hashbang url given", () => {
  //     initService({ html5Mode: true, hashPrefix: "!", supportHistory: true });
  //     mockUpBrowser({
  //       initialUrl: "http://domain.com/base/index.html#!/a/b",
  //       baseHref: "/base/index.html",
  //     });
  //     inject(($rootScope, $location, $browser) => {
  //       expect($browser.url()).toBe("http://domain.com/base/a/b");
  //       $location.path("/new");
  //       $location.hash("abc");
  //       $rootScope.$apply();
  //       expect($browser.url()).toBe("http://domain.com/base/new#abc");
  //       expect($location.path()).toBe("/new");
  //     });
  //   });

  //   it("should rewrite when hashbang url given (without hash prefix)", () => {
  //     initService({ html5Mode: true, hashPrefix: "", supportHistory: true });
  //     mockUpBrowser({
  //       initialUrl: "http://domain.com/base/index.html#/a/b",
  //       baseHref: "/base/index.html",
  //     });
  //     inject(($rootScope, $location, $browser) => {
  //       expect($browser.url()).toBe("http://domain.com/base/a/b");
  //       expect($location.path()).toBe("/a/b");
  //     });
  //   });
  // });

  // describe("PATH_MATCH", () => {
  //   it("should parse just path", () => {
  //     const match = PATH_MATCH.exec("/path");
  //     expect(match[1]).toBe("/path");
  //   });

  //   it("should parse path with search", () => {
  //     const match = PATH_MATCH.exec("/ppp/a?a=b&c");
  //     expect(match[1]).toBe("/ppp/a");
  //     expect(match[3]).toBe("a=b&c");
  //   });

  //   it("should parse path with hash", () => {
  //     const match = PATH_MATCH.exec("/ppp/a#abc?");
  //     expect(match[1]).toBe("/ppp/a");
  //     expect(match[5]).toBe("abc?");
  //   });

  //   it("should parse path with both search and hash", () => {
  //     const match = PATH_MATCH.exec("/ppp/a?a=b&c#abc/d?");
  //     expect(match[3]).toBe("a=b&c");
  //   });
  // });

  // TODO MOVE TO PLAYWRIGHT
  // describe("link rewriting", () => {
  //   let root;
  //   let link;
  //   let originalBrowser;
  //   let lastEventPreventDefault;

  //   function configureTestLink(options) {
  //     let { linkHref } = options;
  //     const { relLink } = options;
  //     let { attrs } = options;
  //     const { content } = options;

  //     attrs = attrs ? ` ${attrs} ` : "";

  //     if (typeof linkHref === "string" && !relLink) {
  //       if (linkHref[0] === "/") {
  //         linkHref = `http://host.com${linkHref}`;
  //       } else if (!linkHref.match(/:\/\//)) {
  //         // fake the behavior of <base> tag
  //         linkHref = `http://host.com/base/${linkHref}`;
  //       }
  //     }

  //     if (linkHref) {
  //       link = JQLite(`<a href="${linkHref}"${attrs}>${content}</a>`)[0];
  //     } else {
  //       link = JQLite(`<a ${attrs}>${content}</a>`)[0];
  //     }

  //     module(
  //       ($provide) =>
  //         function ($rootElement, $document) {
  //           $rootElement.append(link);
  //           root = $rootElement[0];
  //           // we need to do this otherwise we can't simulate events
  //           $document.find("body").append($rootElement);
  //         },
  //     );
  //   }

  //   function setupRewriteChecks() {
  //     return function ($browser, $location, $rootElement) {
  //       originalBrowser = $browser.url();
  //       // we have to prevent the default operation, as we need to test absolute links (http://...)
  //       // and navigating to these links would kill jstd
  //       $rootElement.on("click", (e) => {
  //         lastEventPreventDefault = e.isDefaultPrevented();
  //         e.preventDefault();
  //       });
  //     };
  //   }

  //   function expectRewriteTo($browser, url) {
  //     expect(lastEventPreventDefault).toBe(true);
  //     expect($browser.url()).toBe(url);
  //   }

  //   function expectNoRewrite($browser) {
  //     expect(lastEventPreventDefault).toBe(false);
  //     expect($browser.url()).toBe(originalBrowser);
  //   }

  //   afterEach(() => {
  //     dealoc(root);
  //     dealoc(document.body);
  //   });

  //   it("should rewrite rel link to new url when history enabled on new browser", () => {
  //     configureTestLink({ linkHref: "link?a#b" });
  //     initService({ html5Mode: true, supportHistory: true });
  //     inject(
  //       initBrowser({
  //         url: "http://host.com/base/index.html",
  //         basePath: "/base/index.html",
  //       }),
  //       setupRewriteChecks(),
  //       ($browser) => {
  //         browserTrigger(link, "click");
  //         expectRewriteTo($browser, "http://host.com/base/link?a#b");
  //       },
  //     );
  //   });

  //   it("should do nothing if already on the same URL", () => {
  //     configureTestLink({ linkHref: "/base/" });
  //     initService({ html5Mode: true, supportHistory: true });
  //     inject(
  //       initBrowser({
  //         url: "http://host.com/base/index.html",
  //         basePath: "/base/index.html",
  //       }),
  //       setupRewriteChecks(),
  //       ($browser) => {
  //         browserTrigger(link, "click");
  //         expectRewriteTo($browser, "http://host.com/base/");

  //         JQLite(link).attr("href", "http://host.com/base/foo");
  //         browserTrigger(link, "click");
  //         expectRewriteTo($browser, "http://host.com/base/foo");

  //         JQLite(link).attr("href", "http://host.com/base/");
  //         browserTrigger(link, "click");
  //         expectRewriteTo($browser, "http://host.com/base/");

  //         JQLite(link)
  //           .attr("href", "http://host.com/base/foo")
  //           .on("click", (e) => {
  //             e.preventDefault();
  //           });
  //         browserTrigger(link, "click");
  //         expect($browser.url()).toBe("http://host.com/base/");
  //       },
  //     );
  //   });

  //   it("should rewrite abs link to new url when history enabled on new browser", () => {
  //     configureTestLink({ linkHref: "/base/link?a#b" });
  //     initService({ html5Mode: true, supportHistory: true });
  //     inject(
  //       initBrowser({
  //         url: "http://host.com/base/index.html",
  //         basePath: "/base/index.html",
  //       }),
  //       setupRewriteChecks(),
  //       ($browser) => {
  //         browserTrigger(link, "click");
  //         expectRewriteTo($browser, "http://host.com/base/link?a#b");
  //       },
  //     );
  //   });

  //   it("should rewrite rel link to hashbang url when history enabled on old browser", () => {
  //     configureTestLink({ linkHref: "link?a#b" });
  //     initService({ html5Mode: true, supportHistory: false, hashPrefix: "!" });
  //     inject(
  //       initBrowser({
  //         url: "http://host.com/base/index.html",
  //         basePath: "/base/index.html",
  //       }),
  //       setupRewriteChecks(),
  //       ($browser) => {
  //         browserTrigger(link, "click");
  //         expectRewriteTo(
  //           $browser,
  //           "http://host.com/base/index.html#!/link?a#b",
  //         );
  //       },
  //     );
  //   });

  //   // Regression (gh-7721)
  //   it("should not throw when clicking anchor with no href attribute when history enabled on old browser", () => {
  //     configureTestLink({ linkHref: null });
  //     initService({ html5Mode: true, supportHistory: false });
  //     inject(
  //       initBrowser({
  //         url: "http://host.com/base/index.html",
  //         basePath: "/base/index.html",
  //       }),
  //       setupRewriteChecks(),
  //       ($browser) => {
  //         browserTrigger(link, "click");
  //         expectNoRewrite($browser);
  //       },
  //     );
  //   });

  //   it('should produce relative paths correctly when $location.path() is "/" when history enabled on old browser', () => {
  //     configureTestLink({ linkHref: "partial1" });
  //     initService({ html5Mode: true, supportHistory: false, hashPrefix: "!" });
  //     inject(
  //       initBrowser({
  //         url: "http://host.com/base/index.html",
  //         basePath: "/base/index.html",
  //       }),
  //       setupRewriteChecks(),
  //       ($browser, $location, $rootScope) => {
  //         $rootScope.$apply(() => {
  //           $location.path("/");
  //         });
  //         browserTrigger(link, "click");
  //         expectRewriteTo(
  //           $browser,
  //           "http://host.com/base/index.html#!/partial1",
  //         );
  //       },
  //     );
  //   });

  //   it("should rewrite abs link to hashbang url when history enabled on old browser", () => {
  //     configureTestLink({ linkHref: "/base/link?a#b" });
  //     initService({ html5Mode: true, supportHistory: false, hashPrefix: "!" });
  //     inject(
  //       initBrowser({
  //         url: "http://host.com/base/index.html",
  //         basePath: "/base/index.html",
  //       }),
  //       setupRewriteChecks(),
  //       ($browser) => {
  //         browserTrigger(link, "click");
  //         expectRewriteTo(
  //           $browser,
  //           "http://host.com/base/index.html#!/link?a#b",
  //         );
  //       },
  //     );
  //   });

  //   it("should not rewrite full url links to different domain", () => {
  //     configureTestLink({ linkHref: "http://www.dot.abc/a?b=c" });
  //     initService({ html5Mode: true });
  //     inject(
  //       initBrowser({
  //         url: "http://host.com/base/index.html",
  //         basePath: "/base/index.html",
  //       }),
  //       setupRewriteChecks(),
  //       ($browser) => {
  //         browserTrigger(link, "click");
  //         expectNoRewrite($browser);
  //       },
  //     );
  //   });

  //   it('should not rewrite links with target="_blank"', () => {
  //     configureTestLink({ linkHref: "base/a?b=c", attrs: 'target="_blank"' });
  //     initService({ html5Mode: true, supportHistory: true });
  //     inject(
  //       initBrowser({
  //         url: "http://host.com/base/index.html",
  //         basePath: "/base/index.html",
  //       }),
  //       setupRewriteChecks(),
  //       ($browser) => {
  //         browserTrigger(link, "click");
  //         expectNoRewrite($browser);
  //       },
  //     );
  //   });

  //   it("should not rewrite links with target specified", () => {
  //     configureTestLink({
  //       linkHref: "base/a?b=c",
  //       attrs: 'target="some-frame"',
  //     });
  //     initService({ html5Mode: true, supportHistory: true });
  //     inject(
  //       initBrowser({
  //         url: "http://host.com/base/index.html",
  //         basePath: "/base/index.html",
  //       }),
  //       setupRewriteChecks(),
  //       ($browser) => {
  //         browserTrigger(link, "click");
  //         expectNoRewrite($browser);
  //       },
  //     );
  //   });

  //   it("should not rewrite links with `javascript:` URI", () => {
  //     configureTestLink({
  //       linkHref: ' jAvAsCrIpT:throw new Error("Boom!")',
  //       relLink: true,
  //     });
  //     initService({ html5Mode: true, supportHistory: true });
  //     inject(
  //       initBrowser({
  //         url: "http://host.com/base/index.html",
  //         basePath: "/base/index.html",
  //       }),
  //       setupRewriteChecks(),
  //       ($browser) => {
  //         browserTrigger(link, "click");
  //         expectNoRewrite($browser);
  //       },
  //     );
  //   });

  //   it("should not rewrite links with `mailto:` URI", () => {
  //     configureTestLink({ linkHref: " mAiLtO:foo@bar.com", relLink: true });
  //     initService({ html5Mode: true, supportHistory: true });
  //     inject(
  //       initBrowser({
  //         url: "http://host.com/base/index.html",
  //         basePath: "/base/index.html",
  //       }),
  //       setupRewriteChecks(),
  //       ($browser) => {
  //         browserTrigger(link, "click");
  //         expectNoRewrite($browser);
  //       },
  //     );
  //   });

  //   it("should not rewrite links when rewriting links is disabled", () => {
  //     configureTestLink({ linkHref: "link?a#b" });
  //     initService({
  //       html5Mode: { enabled: true, rewriteLinks: false },
  //       supportHistory: true,
  //     });
  //     inject(
  //       initBrowser({
  //         url: "http://host.com/base/index.html",
  //         basePath: "/base/index.html",
  //       }),
  //       setupRewriteChecks(),
  //       ($browser) => {
  //         browserTrigger(link, "click");
  //         expectNoRewrite($browser);
  //       },
  //     );
  //   });

  //   it("should rewrite links when the specified rewriteLinks attr is present", () => {
  //     configureTestLink({ linkHref: "link?a#b", attrs: "do-rewrite" });
  //     initService({
  //       html5Mode: { enabled: true, rewriteLinks: "do-rewrite" },
  //       supportHistory: true,
  //     });
  //     inject(
  //       initBrowser({
  //         url: "http://host.com/base/index.html",
  //         basePath: "/base/index.html",
  //       }),
  //       setupRewriteChecks(),
  //       ($browser) => {
  //         browserTrigger(link, "click");
  //         expectRewriteTo($browser, "http://host.com/base/link?a#b");
  //       },
  //     );
  //   });

  //   it("should not rewrite links when the specified rewriteLinks attr is not present", () => {
  //     configureTestLink({ linkHref: "link?a#b" });
  //     initService({
  //       html5Mode: { enabled: true, rewriteLinks: "do-rewrite" },
  //       supportHistory: true,
  //     });
  //     inject(
  //       initBrowser({
  //         url: "http://host.com/base/index.html",
  //         basePath: "/base/index.html",
  //       }),
  //       setupRewriteChecks(),
  //       ($browser) => {
  //         browserTrigger(link, "click");
  //         expectNoRewrite($browser);
  //       },
  //     );
  //   });

  //   it("should rewrite full url links to same domain and base path", () => {
  //     configureTestLink({ linkHref: "http://host.com/base/new" });
  //     initService({ html5Mode: true, supportHistory: false, hashPrefix: "!" });
  //     inject(
  //       initBrowser({
  //         url: "http://host.com/base/index.html",
  //         basePath: "/base/index.html",
  //       }),
  //       setupRewriteChecks(),
  //       ($browser) => {
  //         browserTrigger(link, "click");
  //         expectRewriteTo($browser, "http://host.com/base/index.html#!/new");
  //       },
  //     );
  //   });

  //   it("should rewrite when clicked span inside link", () => {
  //     configureTestLink({
  //       linkHref: "some/link",
  //       attrs: "",
  //       content: "<span>link</span>",
  //     });
  //     initService({ html5Mode: true, supportHistory: true });
  //     inject(
  //       initBrowser({
  //         url: "http://host.com/base/index.html",
  //         basePath: "/base/index.html",
  //       }),
  //       setupRewriteChecks(),
  //       ($browser) => {
  //         const span = JQLite(link).find("span");

  //         browserTrigger(span, "click");
  //         expectRewriteTo($browser, "http://host.com/base/some/link");
  //       },
  //     );
  //   });

  //   it("should not rewrite when link to different base path when history enabled on new browser", () => {
  //     configureTestLink({ linkHref: "/other_base/link" });
  //     initService({ html5Mode: true, supportHistory: true });
  //     inject(
  //       initBrowser({
  //         url: "http://host.com/base/index.html",
  //         basePath: "/base/index.html",
  //       }),
  //       setupRewriteChecks(),
  //       ($browser) => {
  //         browserTrigger(link, "click");
  //         expectNoRewrite($browser);
  //       },
  //     );
  //   });

  //   it("should not rewrite when link to different base path when history enabled on old browser", () => {
  //     configureTestLink({ linkHref: "/other_base/link" });
  //     initService({ html5Mode: true, supportHistory: true });
  //     inject(
  //       initBrowser({
  //         url: "http://host.com/base/index.html",
  //         basePath: "/base/index.html",
  //       }),
  //       setupRewriteChecks(),
  //       ($browser) => {
  //         browserTrigger(link, "click");
  //         expectNoRewrite($browser);
  //       },
  //     );
  //   });

  //   it("should not rewrite when link to different base path when history disabled", () => {
  //     configureTestLink({ linkHref: "/other_base/link" });
  //     initService({ html5Mode: false });
  //     inject(
  //       initBrowser({
  //         url: "http://host.com/base/index.html",
  //         basePath: "/base/index.html",
  //       }),
  //       setupRewriteChecks(),
  //       ($browser) => {
  //         browserTrigger(link, "click");
  //         expectNoRewrite($browser);
  //       },
  //     );
  //   });

  //   it("should not rewrite when full link to different base path when history enabled on new browser", () => {
  //     configureTestLink({ linkHref: "http://host.com/other_base/link" });
  //     initService({ html5Mode: true, supportHistory: true });
  //     inject(
  //       initBrowser({
  //         url: "http://host.com/base/index.html",
  //         basePath: "/base/index.html",
  //       }),
  //       setupRewriteChecks(),
  //       ($browser) => {
  //         browserTrigger(link, "click");
  //         expectNoRewrite($browser);
  //       },
  //     );
  //   });

  //   it("should not rewrite when full link to different base path when history enabled on old browser", () => {
  //     configureTestLink({ linkHref: "http://host.com/other_base/link" });
  //     inject(
  //       initBrowser({
  //         url: "http://host.com/base/index.html",
  //         basePath: "/base/index.html",
  //       }),
  //       setupRewriteChecks(),
  //       ($browser) => {
  //         browserTrigger(link, "click");
  //         expectNoRewrite($browser);
  //       },
  //     );
  //   });

  //   it("should not rewrite when full link to different base path when history disabled", () => {
  //     configureTestLink({ linkHref: "http://host.com/other_base/link" });
  //     initService({ html5Mode: false });
  //     inject(
  //       initBrowser({
  //         url: "http://host.com/base/index.html",
  //         basePath: "/base/index.html",
  //       }),
  //       setupRewriteChecks(),
  //       ($browser) => {
  //         browserTrigger(link, "click");
  //         expectNoRewrite($browser);
  //       },
  //     );
  //   });

  //   it('should replace current hash fragment when link begins with "#" history disabled', () => {
  //     configureTestLink({ linkHref: "#link", relLink: true });
  //     initService({ html5Mode: true, supportHistory: false, hashPrefix: "!" });
  //     inject(
  //       initBrowser({
  //         url: "http://host.com/base/index.html",
  //         basePath: "/base/index.html",
  //       }),
  //       setupRewriteChecks(),
  //       ($browser, $location, $rootScope) => {
  //         $rootScope.$apply(() => {
  //           $location.path("/some");
  //           $location.hash("foo");
  //         });
  //         browserTrigger(link, "click");
  //         expect($location.hash()).toBe("link");
  //         expectRewriteTo(
  //           $browser,
  //           "http://host.com/base/index.html#!/some#link",
  //         );
  //       },
  //     );
  //   });

  //   it('should replace current hash fragment when link begins with "#" history enabled', () => {
  //     configureTestLink({ linkHref: "#link", relLink: true });
  //     initService({ html5Mode: true, supportHistory: true });
  //     inject(
  //       initBrowser({
  //         url: "http://host.com/base/index.html",
  //         basePath: "/base/index.html",
  //       }),
  //       setupRewriteChecks(),
  //       ($browser, $location, $rootScope) => {
  //         $rootScope.$apply(() => {
  //           $location.path("/some");
  //           $location.hash("foo");
  //         });
  //         browserTrigger(link, "click");
  //         expect($location.hash()).toBe("link");
  //         expectRewriteTo($browser, "http://host.com/base/some#link");
  //       },
  //     );
  //   });

  //   it("should not rewrite when clicked with ctrl pressed", () => {
  //     configureTestLink({ linkHref: "base/a?b=c" });
  //     initService({ html5Mode: true, supportHistory: true });
  //     inject(
  //       initBrowser({
  //         url: "http://host.com/base/index.html",
  //         basePath: "/base/index.html",
  //       }),
  //       setupRewriteChecks(),
  //       ($browser) => {
  //         browserTrigger(link, "click", { keys: ["ctrl"] });
  //         expectNoRewrite($browser);
  //       },
  //     );
  //   });

  //   it("should not rewrite when clicked with meta pressed", () => {
  //     configureTestLink({ linkHref: "base/a?b=c" });
  //     initService({ html5Mode: true, supportHistory: true });
  //     inject(
  //       initBrowser({
  //         url: "http://host.com/base/index.html",
  //         basePath: "/base/index.html",
  //       }),
  //       setupRewriteChecks(),
  //       ($browser) => {
  //         browserTrigger(link, "click", { keys: ["meta"] });
  //         expectNoRewrite($browser);
  //       },
  //     );
  //   });

  //   it("should not rewrite when right click pressed", () => {
  //     configureTestLink({ linkHref: "base/a?b=c" });
  //     initService({ html5Mode: true, supportHistory: true });
  //     inject(
  //       initBrowser({
  //         url: "http://host.com/base/index.html",
  //         basePath: "/base/index.html",
  //       }),
  //       setupRewriteChecks(),
  //       ($browser) => {
  //         const rightClick = document.createEvent("MouseEvents");
  //         rightClick.initMouseEvent(
  //           "click",
  //           true,
  //           true,
  //           window,
  //           1,
  //           10,
  //           10,
  //           10,
  //           10,
  //           false,
  //           false,
  //           false,
  //           false,
  //           2,
  //           null,
  //         );

  //         link.dispatchEvent(rightClick);
  //         expectNoRewrite($browser);
  //       },
  //     );
  //   });

  //   it("should not rewrite when clicked with shift pressed", () => {
  //     configureTestLink({ linkHref: "base/a?b=c" });
  //     initService({ html5Mode: true, supportHistory: true });
  //     inject(
  //       initBrowser({
  //         url: "http://host.com/base/index.html",
  //         basePath: "/base/index.html",
  //       }),
  //       setupRewriteChecks(),
  //       ($browser) => {
  //         browserTrigger(link, "click", { keys: ["shift"] });
  //         expectNoRewrite($browser);
  //       },
  //     );
  //   });

  //   it("should not mess up hash urls when clicking on links in hashbang mode", () => {
  //     let base;
  //     module(
  //       () =>
  //         function ($browser) {
  //           window.location.hash = "someHash";
  //           base = window.location.href;
  //           $browser.url(base);
  //           base = base.split("#")[0];
  //         },
  //     );
  //     inject(
  //       (
  //         $rootScope,
  //         $compile,
  //         $browser,
  //         $rootElement,
  //
  //         $location,
  //       ) => {
  //         // we need to do this otherwise we can't simulate events
  //         $document.find("body").append($rootElement);

  //         const element = $compile(
  //           '<a href="#!/view1">v1</a><a href="#!/view2">v2</a>',
  //         )($rootScope);
  //         $rootElement.append(element);
  //         const av1 = $rootElement.find("a").eq(0);
  //         const av2 = $rootElement.find("a").eq(1);

  //         browserTrigger(av1, "click");
  //         expect($browser.url()).toEqual(`${base}#!/view1`);

  //         browserTrigger(av2, "click");
  //         expect($browser.url()).toEqual(`${base}#!/view2`);

  //         $rootElement.remove();
  //       },
  //     );
  //   });

  //   it("should not mess up hash urls when clicking on links in hashbang mode with a prefix", () => {
  //     let base;
  //     module(
  //       ($locationProvider) =>
  //         function ($browser) {
  //           window.location.hash = "!!someHash";
  //           $browser.url((base = window.location.href));
  //           base = base.split("#")[0];
  //           $locationProvider.hashPrefix("!!");
  //         },
  //     );
  //     inject(
  //       (
  //         $rootScope,
  //         $compile,
  //         $browser,
  //         $rootElement,
  //
  //         $location,
  //       ) => {
  //         // we need to do this otherwise we can't simulate events
  //         $document.find("body").append($rootElement);

  //         const element = $compile(
  //           '<a href="#!!/view1">v1</a><a href="#!!/view2">v2</a>',
  //         )($rootScope);
  //         $rootElement.append(element);
  //         const av1 = $rootElement.find("a").eq(0);
  //         const av2 = $rootElement.find("a").eq(1);

  //         browserTrigger(av1, "click");
  //         expect($browser.url()).toEqual(`${base}#!!/view1`);

  //         browserTrigger(av2, "click");
  //         expect($browser.url()).toEqual(`${base}#!!/view2`);
  //       },
  //     );
  //   });

  //   it("should not intercept clicks outside the current hash prefix", () => {
  //     let base;
  //     let clickHandler;
  //     module(($provide) => {
  //       $provide.value("$rootElement", {
  //         on(event, handler) {
  //           expect(event).toEqual("click");
  //           clickHandler = handler;
  //         },
  //         off: () => {},
  //       });
  //       return function ($browser) {
  //         $browser.url((base = "http://server/"));
  //       };
  //     });
  //     inject(($location) => {
  //       // make IE happy
  //       JQLite(document.body).html(
  //         '<a href="http://server/test.html">link</a>',
  //       );

  //       const event = {
  //         target: JQLite(document.body).find("a")[0],
  //         preventDefault: jasmine.createSpy("preventDefault"),
  //         isDefaultPrevented: jasmine.createSpy().and.returnValue(false),
  //       };

  //       clickHandler(event);
  //       expect(event.preventDefault).not.toHaveBeenCalled();
  //     });
  //   });

  //   it("should not intercept hash link clicks outside the app base url space", () => {
  //     let base;
  //     let clickHandler;
  //     module(($provide) => {
  //       $provide.value("$rootElement", {
  //         on(event, handler) {
  //           expect(event).toEqual("click");
  //           clickHandler = handler;
  //         },
  //         off: () => {},
  //       });
  //       return function ($browser) {
  //         $browser.url((base = "http://server/"));
  //       };
  //     });
  //     inject(
  //       (
  //         $rootScope,
  //         $compile,
  //         $browser,
  //         $rootElement,
  //
  //         $location,
  //       ) => {
  //         // make IE happy
  //         JQLite(document.body).html(
  //           '<a href="http://server/index.html#test">link</a>',
  //         );

  //         const event = {
  //           target: JQLite(document.body).find("a")[0],
  //           preventDefault: jasmine.createSpy("preventDefault"),
  //           isDefaultPrevented: jasmine.createSpy().and.returnValue(false),
  //         };

  //         clickHandler(event);
  //         expect(event.preventDefault).not.toHaveBeenCalled();
  //       },
  //     );
  //   });

  //   // regression https://github.com/angular/angular.js/issues/1058
  //   it("should not throw if element was removed", inject((
  //
  //     $rootElement,
  //     $location,
  //   ) => {
  //     // we need to do this otherwise we can't simulate events
  //     $document.find("body").append($rootElement);

  //     $rootElement.html("<button></button>");
  //     const button = $rootElement.find("button");

  //     button.on("click", () => {
  //       button.remove();
  //     });
  //     browserTrigger(button, "click");
  //   }));

  //   it("should not throw when clicking an SVGAElement link", () => {
  //     let base;
  //     module(
  //       ($locationProvider) =>
  //         function ($browser) {
  //           window.location.hash = "!someHash";
  //           $browser.url((base = window.location.href));
  //           base = base.split("#")[0];
  //           $locationProvider.hashPrefix("!");
  //         },
  //     );
  //     inject(
  //       (
  //         $rootScope,
  //         $compile,
  //         $browser,
  //         $rootElement,
  //
  //         $location,
  //       ) => {
  //         // we need to do this otherwise we can't simulate events
  //         $document.find("body").append($rootElement);
  //         const template =
  //           '<svg><g><a xlink:href="#!/view1"><circle r="50"></circle></a></g></svg>';
  //         const element = $compile(template)($rootScope);

  //         $rootElement.append(element);
  //         const av1 = $rootElement.find("a").eq(0);
  //         expect(() => {
  //           browserTrigger(av1, "click");
  //         }).not.toThrow();
  //       },
  //     );
  //   });
  // });

  // describe("location cancellation", () => {
  //   it("should fire $before/afterLocationChange event", inject((
  //     $location,
  //     $browser,
  //     $rootScope,
  //     $log,
  //   ) => {
  //     expect($browser.url()).toEqual("http://server/");

  //     $rootScope.$on("$locationChangeStart", (event, newUrl, oldUrl) => {
  //       $log.info("before", newUrl, oldUrl, $browser.url());
  //     });
  //     $rootScope.$on("$locationChangeSuccess", (event, newUrl, oldUrl) => {
  //       $log.info("after", newUrl, oldUrl, $browser.url());
  //     });

  //     expect($location.url()).toEqual("");
  //     $location.url("/somePath");
  //     expect($location.url()).toEqual("/somePath");
  //     expect($browser.url()).toEqual("http://server/");
  //     expect($log.info.logs).toEqual([]);

  //     $rootScope.$apply();

  //     expect($log.info.logs.shift()).toEqual([
  //       "before",
  //       "http://server/#!/somePath",
  //       "http://server/",
  //       "http://server/",
  //     ]);
  //     expect($log.info.logs.shift()).toEqual([
  //       "after",
  //       "http://server/#!/somePath",
  //       "http://server/",
  //       "http://server/#!/somePath",
  //     ]);
  //     expect($location.url()).toEqual("/somePath");
  //     expect($browser.url()).toEqual("http://server/#!/somePath");
  //   }));

  //   it("should allow $locationChangeStart event cancellation", inject((
  //     $location,
  //     $browser,
  //     $rootScope,
  //     $log,
  //   ) => {
  //     expect($browser.url()).toEqual("http://server/");
  //     expect($location.url()).toEqual("");

  //     $rootScope.$on("$locationChangeStart", (event, newUrl, oldUrl) => {
  //       $log.info("before", newUrl, oldUrl, $browser.url());
  //       event.preventDefault();
  //     });
  //     $rootScope.$on("$locationChangeSuccess", (event, newUrl, oldUrl) => {
  //       throw new Error("location should have been canceled");
  //     });

  //     expect($location.url()).toEqual("");
  //     $location.url("/somePath");
  //     expect($location.url()).toEqual("/somePath");
  //     expect($browser.url()).toEqual("http://server/");
  //     expect($log.info.logs).toEqual([]);

  //     $rootScope.$apply();

  //     expect($log.info.logs.shift()).toEqual([
  //       "before",
  //       "http://server/#!/somePath",
  //       "http://server/",
  //       "http://server/",
  //     ]);
  //     expect($log.info.logs[1]).toBeUndefined();
  //     expect($location.url()).toEqual("");
  //     expect($browser.url()).toEqual("http://server/");
  //   }));

  //   it("should allow redirect during $locationChangeStart", inject((
  //     $location,
  //     $browser,
  //     $rootScope,
  //     $log,
  //   ) => {
  //     $rootScope.$on("$locationChangeStart", (event, newUrl, oldUrl) => {
  //       $log.info("before", newUrl, oldUrl, $browser.url());
  //       if (newUrl === "http://server/#!/somePath") {
  //         $location.url("/redirectPath");
  //       }
  //     });
  //     $rootScope.$on("$locationChangeSuccess", (event, newUrl, oldUrl) => {
  //       $log.info("after", newUrl, oldUrl, $browser.url());
  //     });

  //     $location.url("/somePath");
  //     $rootScope.$apply();

  //     expect($log.info.logs.shift()).toEqual([
  //       "before",
  //       "http://server/#!/somePath",
  //       "http://server/",
  //       "http://server/",
  //     ]);
  //     expect($log.info.logs.shift()).toEqual([
  //       "before",
  //       "http://server/#!/redirectPath",
  //       "http://server/",
  //       "http://server/",
  //     ]);
  //     expect($log.info.logs.shift()).toEqual([
  //       "after",
  //       "http://server/#!/redirectPath",
  //       "http://server/",
  //       "http://server/#!/redirectPath",
  //     ]);

  //     expect($location.url()).toEqual("/redirectPath");
  //     expect($browser.url()).toEqual("http://server/#!/redirectPath");
  //   }));

  //   it("should allow redirect during $locationChangeStart even if default prevented", inject((
  //     $location,
  //     $browser,
  //     $rootScope,
  //     $log,
  //   ) => {
  //     $rootScope.$on("$locationChangeStart", (event, newUrl, oldUrl) => {
  //       $log.info("before", newUrl, oldUrl, $browser.url());
  //       if (newUrl === "http://server/#!/somePath") {
  //         event.preventDefault();
  //         $location.url("/redirectPath");
  //       }
  //     });
  //     $rootScope.$on("$locationChangeSuccess", (event, newUrl, oldUrl) => {
  //       $log.info("after", newUrl, oldUrl, $browser.url());
  //     });

  //     $location.url("/somePath");
  //     $rootScope.$apply();

  //     expect($log.info.logs.shift()).toEqual([
  //       "before",
  //       "http://server/#!/somePath",
  //       "http://server/",
  //       "http://server/",
  //     ]);
  //     expect($log.info.logs.shift()).toEqual([
  //       "before",
  //       "http://server/#!/redirectPath",
  //       "http://server/",
  //       "http://server/",
  //     ]);
  //     expect($log.info.logs.shift()).toEqual([
  //       "after",
  //       "http://server/#!/redirectPath",
  //       "http://server/",
  //       "http://server/#!/redirectPath",
  //     ]);

  //     expect($location.url()).toEqual("/redirectPath");
  //     expect($browser.url()).toEqual("http://server/#!/redirectPath");
  //   }));

  //   it("should allow multiple redirect during $locationChangeStart", inject((
  //     $location,
  //     $browser,
  //     $rootScope,
  //     $log,
  //   ) => {
  //     $rootScope.$on("$locationChangeStart", (event, newUrl, oldUrl) => {
  //       $log.info("before", newUrl, oldUrl, $browser.url());
  //       if (newUrl === "http://server/#!/somePath") {
  //         $location.url("/redirectPath");
  //       } else if (newUrl === "http://server/#!/redirectPath") {
  //         $location.url("/redirectPath2");
  //       }
  //     });
  //     $rootScope.$on("$locationChangeSuccess", (event, newUrl, oldUrl) => {
  //       $log.info("after", newUrl, oldUrl, $browser.url());
  //     });

  //     $location.url("/somePath");
  //     $rootScope.$apply();

  //     expect($log.info.logs.shift()).toEqual([
  //       "before",
  //       "http://server/#!/somePath",
  //       "http://server/",
  //       "http://server/",
  //     ]);
  //     expect($log.info.logs.shift()).toEqual([
  //       "before",
  //       "http://server/#!/redirectPath",
  //       "http://server/",
  //       "http://server/",
  //     ]);
  //     expect($log.info.logs.shift()).toEqual([
  //       "before",
  //       "http://server/#!/redirectPath2",
  //       "http://server/",
  //       "http://server/",
  //     ]);
  //     expect($log.info.logs.shift()).toEqual([
  //       "after",
  //       "http://server/#!/redirectPath2",
  //       "http://server/",
  //       "http://server/#!/redirectPath2",
  //     ]);

  //     expect($location.url()).toEqual("/redirectPath2");
  //     expect($browser.url()).toEqual("http://server/#!/redirectPath2");
  //   }));

  //   it("should fire $locationChangeSuccess event when change from browser location bar", inject((
  //     $log,
  //     $location,
  //     $browser,
  //     $rootScope,
  //   ) => {
  //     $rootScope.$apply(); // clear initial $locationChangeStart

  //     expect($browser.url()).toEqual("http://server/");
  //     expect($location.url()).toEqual("");

  //     $rootScope.$on("$locationChangeStart", (event, newUrl, oldUrl) => {
  //       $log.info("start", newUrl, oldUrl);
  //     });
  //     $rootScope.$on("$locationChangeSuccess", (event, newUrl, oldUrl) => {
  //       $log.info("after", newUrl, oldUrl);
  //     });

  //     $browser.url("http://server/#!/somePath");
  //     $browser.poll();

  //     expect($log.info.logs.shift()).toEqual([
  //       "start",
  //       "http://server/#!/somePath",
  //       "http://server/",
  //     ]);
  //     expect($log.info.logs.shift()).toEqual([
  //       "after",
  //       "http://server/#!/somePath",
  //       "http://server/",
  //     ]);
  //   }));

  //   it("should fire $locationChangeSuccess when browser location changes to URL which ends with #", inject((
  //     $location,
  //     $browser,
  //     $rootScope,
  //     $log,
  //   ) => {
  //     $location.url("/somepath");
  //     $rootScope.$apply();

  //     expect($browser.url()).toEqual("http://server/#!/somepath");
  //     expect($location.url()).toEqual("/somepath");

  //     $rootScope.$on("$locationChangeStart", (event, newUrl, oldUrl) => {
  //       $log.info("start", newUrl, oldUrl);
  //     });
  //     $rootScope.$on("$locationChangeSuccess", (event, newUrl, oldUrl) => {
  //       $log.info("after", newUrl, oldUrl);
  //     });

  //     $browser.url("http://server/#");
  //     $browser.poll();

  //     expect($log.info.logs.shift()).toEqual([
  //       "start",
  //       "http://server/",
  //       "http://server/#!/somepath",
  //     ]);
  //     expect($log.info.logs.shift()).toEqual([
  //       "after",
  //       "http://server/",
  //       "http://server/#!/somepath",
  //     ]);
  //   }));

  //   it("should allow redirect during browser url change", inject((
  //     $location,
  //     $browser,
  //     $rootScope,
  //     $log,
  //   ) => {
  //     $rootScope.$on("$locationChangeStart", (event, newUrl, oldUrl) => {
  //       $log.info("before", newUrl, oldUrl, $browser.url());
  //       if (newUrl === "http://server/#!/somePath") {
  //         $location.url("/redirectPath");
  //       }
  //     });
  //     $rootScope.$on("$locationChangeSuccess", (event, newUrl, oldUrl) => {
  //       $log.info("after", newUrl, oldUrl, $browser.url());
  //     });

  //     $browser.url("http://server/#!/somePath");
  //     $browser.poll();

  //     expect($log.info.logs.shift()).toEqual([
  //       "before",
  //       "http://server/#!/somePath",
  //       "http://server/",
  //       "http://server/#!/somePath",
  //     ]);
  //     expect($log.info.logs.shift()).toEqual([
  //       "before",
  //       "http://server/#!/redirectPath",
  //       "http://server/#!/somePath",
  //       "http://server/#!/somePath",
  //     ]);
  //     expect($log.info.logs.shift()).toEqual([
  //       "after",
  //       "http://server/#!/redirectPath",
  //       "http://server/#!/somePath",
  //       "http://server/#!/redirectPath",
  //     ]);

  //     expect($location.url()).toEqual("/redirectPath");
  //     expect($browser.url()).toEqual("http://server/#!/redirectPath");
  //   }));

  //   it("should allow redirect during browser url change even if default prevented", inject((
  //     $location,
  //     $browser,
  //     $rootScope,
  //     $log,
  //   ) => {
  //     $rootScope.$on("$locationChangeStart", (event, newUrl, oldUrl) => {
  //       $log.info("before", newUrl, oldUrl, $browser.url());
  //       if (newUrl === "http://server/#!/somePath") {
  //         event.preventDefault();
  //         $location.url("/redirectPath");
  //       }
  //     });
  //     $rootScope.$on("$locationChangeSuccess", (event, newUrl, oldUrl) => {
  //       $log.info("after", newUrl, oldUrl, $browser.url());
  //     });

  //     $browser.url("http://server/#!/somePath");
  //     $browser.poll();

  //     expect($log.info.logs.shift()).toEqual([
  //       "before",
  //       "http://server/#!/somePath",
  //       "http://server/",
  //       "http://server/#!/somePath",
  //     ]);
  //     expect($log.info.logs.shift()).toEqual([
  //       "before",
  //       "http://server/#!/redirectPath",
  //       "http://server/#!/somePath",
  //       "http://server/#!/somePath",
  //     ]);
  //     expect($log.info.logs.shift()).toEqual([
  //       "after",
  //       "http://server/#!/redirectPath",
  //       "http://server/#!/somePath",
  //       "http://server/#!/redirectPath",
  //     ]);

  //     expect($location.url()).toEqual("/redirectPath");
  //     expect($browser.url()).toEqual("http://server/#!/redirectPath");
  //   }));

  //   it("should listen on click events on href and prevent browser default in hashbang mode", () => {
  //     module(
  //       () =>
  //         function ($rootElement, $compile, $rootScope) {
  //           $rootElement.html('<a href="http://server/#!/somePath">link</a>');
  //           $compile($rootElement)($rootScope);
  //           JQLite(document.body).append($rootElement);
  //         },
  //     );

  //     inject(($location, $rootScope, $browser, $rootElement) => {
  //       let log = "";
  //       const link = $rootElement.find("a");

  //       $rootScope.$on("$locationChangeStart", (event) => {
  //         event.preventDefault();
  //         log += "$locationChangeStart";
  //       });
  //       $rootScope.$on("$locationChangeSuccess", () => {
  //         throw new Error("after cancellation in hashbang mode");
  //       });

  //       browserTrigger(link, "click");

  //       expect(log).toEqual("$locationChangeStart");
  //       expect($browser.url()).toEqual("http://server/");

  //       dealoc($rootElement);
  //     });
  //   });

  //   it("should listen on click events on href and prevent browser default in html5 mode", () => {
  //     module(($locationProvider, $provide) => {
  //       $locationProvider.setHtml5Mode(true);
  //       return function ($rootElement, $compile, $rootScope) {
  //         $rootElement.html('<a href="http://server/somePath">link</a>');
  //         $compile($rootElement)($rootScope);
  //         JQLite(document.body).append($rootElement);
  //       };
  //     });

  //     inject(($location, $rootScope, $browser, $rootElement) => {
  //       let log = "";
  //       const link = $rootElement.find("a");
  //       const browserUrlBefore = $browser.url();

  //       $rootScope.$on("$locationChangeStart", (event) => {
  //         event.preventDefault();
  //         log += "$locationChangeStart";
  //       });
  //       $rootScope.$on("$locationChangeSuccess", () => {
  //         throw new Error("after cancellation in html5 mode");
  //       });

  //       browserTrigger(link, "click");

  //       expect(log).toEqual("$locationChangeStart");
  //       expect($browser.url()).toBe(browserUrlBefore);

  //       dealoc($rootElement);
  //     });
  //   });

  //   it("should always return the new url value via path() when $locationChangeStart event occurs regardless of cause", inject((
  //     $location,
  //     $rootScope,
  //     $browser,
  //     log,
  //   ) => {
  //     const base = $browser.url();

  //     $rootScope.$on("$locationChangeStart", () => {
  //       log($location.path());
  //     });

  //     // change through $location service
  //     $rootScope.$apply(() => {
  //       $location.path("/myNewPath");
  //     });

  //     // reset location
  //     $rootScope.$apply(() => {
  //       $location.path("");
  //     });

  //     // change through $browser
  //     $browser.url(`${base}#!/myNewPath`);
  //     $browser.poll();

  //     expect(log).toEqual(["/myNewPath", "/", "/myNewPath"]);
  //   }));
  // });

  describe("$locationProvider", () => {
    describe("html5Mode", () => {
      it("should set enabled, requireBase and rewriteLinks when called with object", () => {
        module.config(($locationProvider) => {
          $locationProvider.setHtml5Mode({
            enabled: true,
            requireBase: false,
            rewriteLinks: false,
          });
          expect($locationProvider.getHtml5Mode()).toEqual({
            enabled: true,
            requireBase: false,
            rewriteLinks: false,
          });
        });
        createInjector(["test1"]);
      });

      it("should only overwrite existing properties if values are of the correct type", () => {
        module.config(($locationProvider) => {
          $locationProvider.setHtml5Mode({
            enabled: "duh",
            requireBase: "probably",
            rewriteLinks: 0,
          });

          expect($locationProvider.getHtml5Mode()).toEqual({
            enabled: false,
            requireBase: true,
            rewriteLinks: true,
          });
        });

        createInjector(["test1"]);
      });

      it("should support setting rewriteLinks to a string", () => {
        module.config(($locationProvider) => {
          $locationProvider.setHtml5Mode({
            rewriteLinks: "yes-rewrite",
          });

          expect($locationProvider.getHtml5Mode().rewriteLinks).toEqual(
            "yes-rewrite",
          );
        });

        createInjector(["test1"]);
      });

      it("should not set unknown input properties to html5Mode object", () => {
        module.config(($locationProvider) => {
          $locationProvider.setHtml5Mode({
            someProp: "foo",
          });

          expect($locationProvider.getHtml5Mode()).toEqual({
            enabled: false,
            requireBase: true,
            rewriteLinks: true,
          });
        });

        createInjector(["test1"]);
      });

      it("should default to enabled:false, requireBase:true and rewriteLinks:true", () => {
        module.config(($locationProvider) => {
          expect($locationProvider.getHtml5Mode()).toEqual({
            enabled: false,
            requireBase: true,
            rewriteLinks: true,
          });
        });

        createInjector(["test1"]);
      });
    });
  });

  describe("LocationHtml5Url", () => {
    let locationUrl;
    let locationUmlautUrl;
    let locationIndexUrl;

    beforeEach(() => {
      locationUrl = new LocationHtml5Url(
        "http://server/pre/",
        "http://server/pre/",
      );
      locationUmlautUrl = new LocationHtml5Url(
        "http://särver/pre/",
        "http://särver/pre/",
      );
      locationIndexUrl = new LocationHtml5Url(
        "http://server/pre/index.html",
        "http://server/pre/",
      );
    });

    it("should rewrite URL", () => {
      expect(parseLinkAndReturn(locationUrl, "http://other")).toEqual(
        undefined,
      );
      expect(parseLinkAndReturn(locationUrl, "http://server/pre")).toEqual(
        "http://server/pre/",
      );
      expect(parseLinkAndReturn(locationUrl, "http://server/pre/")).toEqual(
        "http://server/pre/",
      );
      expect(
        parseLinkAndReturn(locationUrl, "http://server/pre/otherPath"),
      ).toEqual("http://server/pre/otherPath");
      // Note: relies on the previous state!
      expect(
        parseLinkAndReturn(locationUrl, "someIgnoredAbsoluteHref", "#test"),
      ).toEqual("http://server/pre/otherPath#test");

      expect(parseLinkAndReturn(locationUmlautUrl, "http://other")).toEqual(
        undefined,
      );
      expect(
        parseLinkAndReturn(locationUmlautUrl, "http://särver/pre"),
      ).toEqual("http://särver/pre/");
      expect(
        parseLinkAndReturn(locationUmlautUrl, "http://särver/pre/"),
      ).toEqual("http://särver/pre/");
      expect(
        parseLinkAndReturn(locationUmlautUrl, "http://särver/pre/otherPath"),
      ).toEqual("http://särver/pre/otherPath");
      // Note: relies on the previous state!
      expect(
        parseLinkAndReturn(
          locationUmlautUrl,
          "someIgnoredAbsoluteHref",
          "#test",
        ),
      ).toEqual("http://särver/pre/otherPath#test");

      expect(parseLinkAndReturn(locationIndexUrl, "http://server/pre")).toEqual(
        "http://server/pre/",
      );
      expect(
        parseLinkAndReturn(locationIndexUrl, "http://server/pre/"),
      ).toEqual("http://server/pre/");
      expect(
        parseLinkAndReturn(locationIndexUrl, "http://server/pre/otherPath"),
      ).toEqual("http://server/pre/otherPath");
      // Note: relies on the previous state!
      expect(
        parseLinkAndReturn(locationUrl, "someIgnoredAbsoluteHref", "#test"),
      ).toEqual("http://server/pre/otherPath#test");
    });

    it("should complain if the path starts with double slashes", () => {
      expect(() => {
        parseLinkAndReturn(locationUrl, "http://server/pre///other/path");
      }).toThrowError(/badpath/);

      expect(() => {
        parseLinkAndReturn(locationUrl, "http://server/pre/\\\\other/path");
      }).toThrowError(/badpath/);

      expect(() => {
        parseLinkAndReturn(locationUrl, "http://server/pre//\\//other/path");
      }).toThrowError(/badpath/);
    });

    // it("should complain if no base tag present", () => {
    //   let module = window.angular.module("test1", ["ng"]);
    //   module.config((_$locationProvider_) => {
    //     $locationProvider.setHtml5Mode(true);
    //   });

    //   createInjector(["test1"]).invoke(($browser, $injector) => {
    //     $browser.$$baseHref = undefined;
    //     expect(() => {
    //       $injector.get("$location");
    //     }).toThrowError(/nobase/);
    //   });
    // });

    // it("should not complain if baseOptOut set to true in html5Mode", () => {
    //   module.config(($locationProvider) => {
    //     $locationProvider.setHtml5Mode({
    //       enabled: true,
    //       requireBase: false,
    //     });
    //   });

    //   inject(($browser, $injector) => {
    //     $browser.$$baseHref = undefined;
    //     expect(() => {
    //       $injector.get("$location");
    //     }).not.toThrow(
    //       "$location",
    //       "nobase",
    //       "$location in HTML5 mode requires a <base> tag to be present!",
    //     );
    //   });
    // });

    it("should support state", () => {
      expect(locationUrl.state({ a: 2 }).state()).toEqual({ a: 2 });
    });
  });

  describe("LocationHashbangUrl", () => {
    let locationUrl;

    it("should rewrite URL", () => {
      locationUrl = new LocationHashbangUrl(
        "http://server/pre/",
        "http://server/pre/",
        "#",
      );

      expect(parseLinkAndReturn(locationUrl, "http://other")).toEqual(
        undefined,
      );
      expect(parseLinkAndReturn(locationUrl, "http://server/pre/")).toEqual(
        "http://server/pre/",
      );
      expect(
        parseLinkAndReturn(locationUrl, "http://server/pre/#otherPath"),
      ).toEqual("http://server/pre/#/otherPath");

      expect(parseLinkAndReturn(locationUrl, "javascript:void(0)")).toEqual(
        undefined,
      );
    });

    it("should not set hash if one was not originally specified", () => {
      locationUrl = new LocationHashbangUrl(
        "http://server/pre/index.html",
        "http://server/pre/",
        "#",
      );

      locationUrl.$$parse("http://server/pre/index.html");
      expect(locationUrl.url()).toBe("");
      expect(locationUrl.absUrl()).toBe("http://server/pre/index.html");
    });

    it("should parse hash if one was specified", () => {
      locationUrl = new LocationHashbangUrl(
        "http://server/pre/index.html",
        "http://server/pre/",
        "#",
      );

      locationUrl.$$parse("http://server/pre/index.html#/foo/bar");
      expect(locationUrl.url()).toBe("/foo/bar");
      expect(locationUrl.absUrl()).toBe(
        "http://server/pre/index.html#/foo/bar",
      );
    });

    it("should prefix hash url with / if one was originally missing", () => {
      locationUrl = new LocationHashbangUrl(
        "http://server/pre/index.html",
        "http://server/pre/",
        "#",
      );

      locationUrl.$$parse(
        "http://server/pre/index.html#not-starting-with-slash",
      );
      expect(locationUrl.url()).toBe("/not-starting-with-slash");
      expect(locationUrl.absUrl()).toBe(
        "http://server/pre/index.html#/not-starting-with-slash",
      );
    });

    it("should not strip stuff from path just because it looks like Windows drive when it's not", () => {
      locationUrl = new LocationHashbangUrl(
        "http://server/pre/index.html",
        "http://server/pre/",
        "#",
      );

      locationUrl.$$parse(
        "http://server/pre/index.html#http%3A%2F%2Fexample.com%2F",
      );
      expect(locationUrl.url()).toBe("/http://example.com/");
      expect(locationUrl.absUrl()).toBe(
        "http://server/pre/index.html#/http://example.com/",
      );
    });

    it("should allow navigating outside the original base URL", () => {
      locationUrl = new LocationHashbangUrl(
        "http://server/pre/index.html",
        "http://server/pre/",
        "#",
      );

      locationUrl.$$parse("http://server/next/index.html");
      expect(locationUrl.url()).toBe("");
      expect(locationUrl.absUrl()).toBe("http://server/next/index.html");
    });
  });

  // function mockUpBrowser(options) {
  //   module(($windowProvider, $browserProvider) => {
  //     let browser;
  //     const parser = document.createElement("a");
  //     parser.href = options.initialUrl;

  //     $windowProvider.$get = function () {
  //       const win = {};
  //       angular.extend(win, window);
  //       // Ensure `window` is a reference to the mock global object, so that
  //       // JQLite does the right thing.
  //       win.window = win;
  //       win.history = {
  //         state: options.state || null,
  //         replaceState(state, title, url) {
  //           win.history.state = copy(state);
  //           if (url) win.location.href = url;
  //         },
  //         pushState(state, title, url) {
  //           win.history.state = copy(state);
  //           if (url) win.location.href = url;
  //         },
  //       };
  //       win.addEventListener = () => {};
  //       win.removeEventListener = () => {};
  //       win.location = {
  //         get href() {
  //           return this.$$getHref();
  //         },
  //         $$getHref() {
  //           return parser.href;
  //         },
  //         set href(val) {
  //           this.$$setHref(val);
  //         },
  //         $$setHref(val) {
  //           parser.href = val;
  //         },
  //         get hash() {
  //           return parser.hash;
  //         },
  //         // The parser correctly strips on a single preceding hash character if necessary
  //         // before joining the fragment onto the href by a new hash character
  //         // See hash setter spec: https://url.spec.whatwg.org/#urlutils-and-urlutilsreadonly-members
  //         set hash(val) {
  //           parser.hash = val;
  //         },

  //         replace(val) {
  //           win.location.href = val;
  //         },
  //       };
  //       return win;
  //     };
  //     $browserProvider.$get = function (
  //
  //       $window,
  //       $log,
  //       $sniffer,
  //       $$taskTrackerFactory,
  //     ) {
  //       /* global Browser: false */
  //       browser = new Browser(
  //         $window,
  //
  //         $log,
  //         $sniffer,
  //         $$taskTrackerFactory,
  //       );
  //       browser.baseHref = function () {
  //         return options.baseHref;
  //       };
  //       return browser;
  //     };
  //   });
  // }

  function initBrowser(options) {
    return function ($browser) {
      $browser.url(options.url);
      $browser.$$baseHref = options.basePath;
    };
  }

  function expectThrowOnStateChange(location) {
    expect(() => {
      location.state({ a: 2 });
    }).toThrowError(/nostate/);
  }

  function parseLinkAndReturn(location, url, relHref) {
    if (location.$$parseLinkUrl(url, relHref)) {
      return location.absUrl();
    }
    return undefined;
  }
});
