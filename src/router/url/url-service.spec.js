import { dealoc } from "../../shared/jqlite/jqlite";
import { Angular } from "../../loader";
import { map, find } from "../../shared/common";

describe("UrlMatcher", () => {
  let $url;
  let $injector;
  let $location;

  beforeEach(() => {
    dealoc(document.getElementById("dummy"));
    window.angular = new Angular();
    window.angular.module("defaultModule", []);
    $injector = window.angular.bootstrap(document.getElementById("dummy"), [
      "defaultModule",
    ]);

    $injector.invoke(($urlService, _$location_) => {
      $url = $urlService;
      $location = _$location_;
    });
  });

  describe("provider", () => {
    it("should factory matchers with correct configuration", () => {
      $url.config.caseInsensitive(false);
      expect($url.compile("/hello").exec("/HELLO")).toBeNull();

      $url.config.caseInsensitive(true);
      expect($url.compile("/hello").exec("/HELLO")).toEqual({});

      $url.config.strictMode(true);
      expect($url.compile("/hello").exec("/hello/")).toBeNull();

      $url.config.strictMode(false);
      expect($url.compile("/hello").exec("/hello/")).toEqual({});
    });

    it("should correctly validate UrlMatcher interface", () => {
      let m = $url.compile("/");
      expect($url.isMatcher(m)).toBe(true);
    });
  });

  it("should match static URLs", () => {
    expect($url.compile("/hello/world").exec("/hello/world")).toEqual({});
  });

  it("should match static case insensitive URLs", () => {
    expect(
      $url
        .compile("/hello/world", { caseInsensitive: true })
        .exec("/heLLo/World"),
    ).toEqual({});
  });

  it("should match against the entire path", () => {
    const matcher = $url.compile("/hello/world", { strict: true });
    expect(matcher.exec("/hello/world/")).toBeNull();
    expect(matcher.exec("/hello/world/suffix")).toBeNull();
  });

  it("should parse parameter placeholders", () => {
    const matcher = $url.compile(
      "/users/:id/details/{type}/{repeat:[0-9]+}?from&to",
    );
    expect(matcher.parameters().map((x) => x.id)).toEqual([
      "id",
      "type",
      "repeat",
      "from",
      "to",
    ]);
  });

  it("should encode and decode duplicate query string values as array", () => {
    const matcher = $url.compile("/?foo"),
      array = { foo: ["bar", "baz"] };
    expect(matcher.exec("/", array)).toEqual(array);
    expect(matcher.format(array)).toBe("/?foo=bar&foo=baz");
  });

  it("should encode and decode slashes in parameter values as ~2F", () => {
    const matcher1 = $url.compile("/:foo");

    expect(matcher1.format({ foo: "/" })).toBe("/~2F");
    expect(matcher1.format({ foo: "//" })).toBe("/~2F~2F");

    expect(matcher1.exec("/")).toBeTruthy();
    expect(matcher1.exec("//")).not.toBeTruthy();

    expect(matcher1.exec("/").foo).toBe("");
    expect(matcher1.exec("/123").foo).toBe("123");
    expect(matcher1.exec("/~2F").foo).toBe("/");
    expect(matcher1.exec("/123~2F").foo).toBe("123/");

    // param :foo should match between two slashes
    const matcher2 = $url.compile("/:foo/");

    expect(matcher2.exec("/")).not.toBeTruthy();
    expect(matcher2.exec("//")).toBeTruthy();

    expect(matcher2.exec("//").foo).toBe("");
    expect(matcher2.exec("/123/").foo).toBe("123");
    expect(matcher2.exec("/~2F/").foo).toBe("/");
    expect(matcher2.exec("/123~2F/").foo).toBe("123/");
  });

  it("should encode and decode tildes in parameter values as ~~", () => {
    const matcher1 = $url.compile("/:foo");

    expect(matcher1.format({ foo: "abc" })).toBe("/abc");
    expect(matcher1.format({ foo: "~abc" })).toBe("/~~abc");
    expect(matcher1.format({ foo: "~2F" })).toBe("/~~2F");

    expect(matcher1.exec("/abc").foo).toBe("abc");
    expect(matcher1.exec("/~~abc").foo).toBe("~abc");
    expect(matcher1.exec("/~~2F").foo).toBe("~2F");
  });

  describe("snake-case parameters", () => {
    it("should match if properly formatted", () => {
      const matcher = $url.compile(
        "/users/?from&to&snake-case&snake-case-triple",
      );
      expect(matcher.parameters().map((x) => x.id)).toEqual([
        "from",
        "to",
        "snake-case",
        "snake-case-triple",
      ]);
    });

    it("should not match if invalid", () => {
      let err =
        "Invalid parameter name '-snake' in pattern '/users/?from&to&-snake'";
      expect(() => {
        $url.compile("/users/?from&to&-snake");
      }).toThrowError(err);

      err =
        "Invalid parameter name 'snake-' in pattern '/users/?from&to&snake-'";
      expect(() => {
        $url.compile("/users/?from&to&snake-");
      }).toThrowError(err);
    });
  });

  describe("parameters containing periods", () => {
    it("should match if properly formatted", () => {
      const matcher = $url.compile(
        "/users/?from&to&with.periods&with.periods.also",
      );
      const params = matcher.parameters().map(function (p) {
        return p.id;
      });

      expect(params.sort()).toEqual([
        "from",
        "to",
        "with.periods",
        "with.periods.also",
      ]);
    });

    it("should not match if invalid", () => {
      let err = new Error(
        "Invalid parameter name '.periods' in pattern '/users/?from&to&.periods'",
      );
      expect(() => {
        $url.compile("/users/?from&to&.periods");
      }).toThrow(err);

      err = new Error(
        "Invalid parameter name 'periods.' in pattern '/users/?from&to&periods.'",
      );
      expect(() => {
        $url.compile("/users/?from&to&periods.");
      }).toThrow(err);
    });
  });

  describe(".exec()", () => {
    it("should capture parameter values", () => {
      const m = $url.compile(
        "/users/:id/details/{type}/{repeat:[0-9]+}?from&to",
        { strict: false },
      );
      expect(m.exec("/users/123/details//0", {})).toEqual({
        id: "123",
        type: "",
        repeat: "0",
        to: undefined,
        from: undefined,
      });
    });

    it("should capture catch-all parameters", () => {
      const m = $url.compile("/document/*path");
      expect(m.exec("/document/a/b/c", {})).toEqual({ path: "a/b/c" });
      expect(m.exec("/document/", {})).toEqual({ path: "" });
    });

    it("should use the optional regexp with curly brace placeholders", () => {
      const m = $url.compile(
        "/users/:id/details/{type}/{repeat:[0-9]+}?from&to",
      );
      expect(
        m.exec("/users/123/details/what/thisShouldBeDigits", {}),
      ).toBeNull();
    });

    it("should not use optional regexp for '/'", () => {
      const m = $url.compile("/{language:(?:fr|en|de)}");
      expect(m.exec("/", {})).toBeNull();
    });

    it("should work with empty default value", () => {
      const m = $url.compile("/foo/:str", {
        state: { params: { str: { value: "" } } },
      });
      expect(m.exec("/foo/", {})).toEqual({ str: "" });
    });

    it("should work with empty default value for regex", () => {
      const m = $url.compile("/foo/{param:(?:foo|bar|)}", {
        state: { params: { param: { value: "" } } },
      });
      expect(m.exec("/foo/", {})).toEqual({ param: "" });
    });

    it("should treat the URL as already decoded and does not decode it further", () => {
      expect($url.compile("/users/:id").exec("/users/100%25", {})).toEqual({
        id: "100%25",
      });
    });

    xit("should allow embedded capture groups", () => {
      const shouldPass = {
        "/url/{matchedParam:([a-z]+)}/child/{childParam}":
          "/url/someword/child/childParam",
        "/url/{matchedParam:([a-z]+)}/child/{childParam}?foo":
          "/url/someword/child/childParam",
      };

      Object.entries(shouldPass).forEach(function ([route, url]) {
        expect($url.compile(route).exec(url, {})).toEqual({
          childParam: "childParam",
          matchedParam: "someword",
        });
      });
    });

    it("should throw on unbalanced capture list", () => {
      const shouldThrow = {
        "/url/{matchedParam:([a-z]+)}/child/{childParam}":
          "/url/someword/child/childParam",
        "/url/{matchedParam:([a-z]+)}/child/{childParam}?foo":
          "/url/someword/child/childParam",
      };

      Object.entries(shouldThrow).forEach(function ([route, url]) {
        expect(() => {
          $url.compile(route).exec(url, {});
        }).toThrowError("Unbalanced capture group in route '" + route + "'");
      });

      const shouldPass = {
        "/url/{matchedParam:[a-z]+}/child/{childParam}":
          "/url/someword/child/childParam",
        "/url/{matchedParam:[a-z]+}/child/{childParam}?foo":
          "/url/someword/child/childParam",
      };

      Object.entries(shouldPass).forEach(function ([route, url]) {
        expect(() => {
          $url.compile(route).exec(url, {});
        }).not.toThrow();
      });
    });
  });

  describe(".format()", () => {
    it("should reconstitute the URL", () => {
      const m = $url.compile("/users/:id/details/{type}/{repeat:[0-9]+}?from"),
        params = {
          id: "123",
          type: "default",
          repeat: 444,
          ignored: "value",
          from: "1970",
        };

      expect(m.format(params)).toEqual(
        "/users/123/details/default/444?from=1970",
      );
    });

    it("should encode URL parameters", () => {
      expect($url.compile("/users/:id").format({ id: "100%" })).toEqual(
        "/users/100%25",
      );
    });

    it("encodes URL parameters with hashes", () => {
      const m = $url.compile("/users/:id#:section");
      expect(m.format({ id: "bob", section: "contact-details" })).toEqual(
        "/users/bob#contact-details",
      );
    });

    it("should trim trailing slashes when the terminal value is optional", () => {
      const config = {
          state: { params: { id: { squash: true, value: "123" } } },
        },
        m = $url.compile("/users/:id", config),
        params = { id: "123" };

      expect(m.format(params)).toEqual("/users");
    });

    it("should format query parameters from parent, child, grandchild matchers", () => {
      const m = $url.compile("/parent?qParent");
      const m2 = m.append($url.compile("/child?qChild"));
      const m3 = m2.append($url.compile("/grandchild?qGrandchild"));

      const params = {
        qParent: "parent",
        qChild: "child",
        qGrandchild: "grandchild",
      };
      const url =
        "/parent/child/grandchild?qParent=parent&qChild=child&qGrandchild=grandchild";

      const formatted = m3.format(params);
      expect(formatted).toBe(url);
      expect(m3.exec(url.split("?")[0], params)).toEqual(params);
    });
  });

  describe(".append()", () => {
    it("should append matchers", () => {
      const matcher = $url
        .compile("/users/:id/details/{type}?from")
        .append($url.compile("/{repeat:[0-9]+}?to"));
      const params = matcher.parameters();
      expect(params.map((x) => x.id)).toEqual([
        "id",
        "type",
        "from",
        "repeat",
        "to",
      ]);
    });

    it("should return a new matcher", () => {
      const base = $url.compile("/users/:id/details/{type}?from");
      const matcher = base.append($url.compile("/{repeat:[0-9]+}?to"));
      expect(matcher).not.toBe(base);
    });

    it("should respect $urlServiceProvider.strictMode", () => {
      let m = $url.compile("/");
      $url.config.strictMode(false);
      m = m.append($url.compile("foo"));
      expect(m.exec("/foo")).toEqual({});
      expect(m.exec("/foo/")).toEqual({});
    });

    it("should respect $urlServiceProvider.caseInsensitive", () => {
      let m = $url.compile("/");
      $url.config.caseInsensitive(true);
      m = m.append($url.compile("foo"));
      expect(m.exec("/foo")).toEqual({});
      expect(m.exec("/FOO")).toEqual({});
    });

    it("should respect $urlServiceProvider.caseInsensitive when validating regex params", () => {
      let m = $url.compile("/");
      $url.config.caseInsensitive(true);
      m = m.append($url.compile("foo/{param:bar}"));
      expect(m.validates({ param: "BAR" })).toEqual(true);
    });

    it("should generate/match params in the proper order", () => {
      let m = $url.compile("/foo?queryparam");
      m = m.append($url.compile("/bar/:pathparam"));
      expect(m.exec("/foo/bar/pathval", { queryparam: "queryval" })).toEqual({
        pathparam: "pathval",
        queryparam: "queryval",
      });
    });
  });

  describe("multivalue-query-parameters", () => {
    it("should handle .is() for an array of values", () => {
      const m = $url.compile("/foo?{param1:int}"),
        param = m.parameter("param1");
      expect(param.type.is([1, 2, 3])).toBe(true);
      expect(param.type.is([1, "2", 3])).toBe(false);
    });

    it("should handle .equals() for two arrays of values", () => {
      const m = $url.compile("/foo?{param1:int}&{param2:date}"),
        param1 = m.parameter("param1"),
        param2 = m.parameter("param2");

      expect(param1.type.equals([1, 2, 3], [1, 2, 3])).toBe(true);
      expect(param1.type.equals([1, 2, 3], [1, 2])).toBe(false);
      expect(
        param2.type.equals(
          [new Date(2014, 11, 15), new Date(2014, 10, 15)],
          [new Date(2014, 11, 15), new Date(2014, 10, 15)],
        ),
      ).toBe(true);
      expect(
        param2.type.equals(
          [new Date(2014, 11, 15), new Date(2014, 9, 15)],
          [new Date(2014, 11, 15), new Date(2014, 10, 15)],
        ),
      ).toBe(false);
    });

    it("should conditionally be wrapped in an array by default", () => {
      const m = $url.compile("/foo?param1");

      // empty array [] is treated like "undefined"
      expect(m.format({ param1: undefined })).toBe("/foo");
      expect(m.format({ param1: [] })).toBe("/foo");
      expect(m.format({ param1: "" })).toBe("/foo");
      expect(m.format({ param1: "1" })).toBe("/foo?param1=1");
      expect(m.format({ param1: ["1"] })).toBe("/foo?param1=1");
      expect(m.format({ param1: ["1", "2"] })).toBe("/foo?param1=1&param1=2");

      expect(m.exec("/foo")).toEqual({ param1: undefined });
      expect(m.exec("/foo", {})).toEqual({ param1: undefined });
      expect(m.exec("/foo", { param1: "" })).toEqual({ param1: undefined });
      expect(m.exec("/foo", { param1: "1" })).toEqual({ param1: "1" }); // auto unwrap single values
      expect(m.exec("/foo", { param1: ["1", "2"] })).toEqual({
        param1: ["1", "2"],
      });

      $url.url("/foo");
      expect(m.exec($url.path(), $url.search())).toEqual({ param1: undefined });
      $url.url("/foo?param1=bar");
      expect(m.exec($url.path(), $url.search())).toEqual({ param1: "bar" }); // auto unwrap
      $url.url("/foo?param1=");
      expect(m.exec($url.path(), $url.search())).toEqual({ param1: undefined });
      $url.url("/foo?param1=bar&param1=baz");
      if (Array.isArray($url.search()))
        // conditional for angular 1.0.8
        expect(m.exec($url.path(), $url.search())).toEqual({
          param1: ["bar", "baz"],
        });

      expect(m.format({})).toBe("/foo");
      expect(m.format({ param1: undefined })).toBe("/foo");
      expect(m.format({ param1: "" })).toBe("/foo");
      expect(m.format({ param1: "bar" })).toBe("/foo?param1=bar");
      expect(m.format({ param1: ["bar"] })).toBe("/foo?param1=bar");
      expect(m.format({ param1: ["bar", "baz"] })).toBe(
        "/foo?param1=bar&param1=baz",
      );
    });

    it("should be wrapped in an array if array: true", () => {
      const m = $url.compile("/foo?param1", {
        state: { params: { param1: { array: true } } },
      });

      // empty array [] is treated like "undefined"
      expect(m.format({ param1: undefined })).toBe("/foo");
      expect(m.format({ param1: [] })).toBe("/foo");
      expect(m.format({ param1: "" })).toBe("/foo");
      expect(m.format({ param1: "1" })).toBe("/foo?param1=1");
      expect(m.format({ param1: ["1"] })).toBe("/foo?param1=1");
      expect(m.format({ param1: ["1", "2"] })).toBe("/foo?param1=1&param1=2");

      expect(m.exec("/foo")).toEqual({ param1: undefined });
      expect(m.exec("/foo", {})).toEqual({ param1: undefined });
      expect(m.exec("/foo", { param1: "" })).toEqual({ param1: undefined });
      expect(m.exec("/foo", { param1: "1" })).toEqual({ param1: ["1"] });
      expect(m.exec("/foo", { param1: ["1", "2"] })).toEqual({
        param1: ["1", "2"],
      });

      $url.url("/foo");
      expect(m.exec($url.path(), $url.search())).toEqual({ param1: undefined });
      $url.url("/foo?param1=");
      expect(m.exec($url.path(), $url.search())).toEqual({ param1: undefined });
      $url.url("/foo?param1=bar");
      expect(m.exec($url.path(), $url.search())).toEqual({ param1: ["bar"] });
      $url.url("/foo?param1=bar&param1=baz");
      if (Array.isArray($url.search()))
        // conditional for angular 1.0.8
        expect(m.exec($url.path(), $url.search())).toEqual({
          param1: ["bar", "baz"],
        });

      expect(m.format({})).toBe("/foo");
      expect(m.format({ param1: undefined })).toBe("/foo");
      expect(m.format({ param1: "" })).toBe("/foo");
      expect(m.format({ param1: "bar" })).toBe("/foo?param1=bar");
      expect(m.format({ param1: ["bar"] })).toBe("/foo?param1=bar");
      expect(m.format({ param1: ["bar", "baz"] })).toBe(
        "/foo?param1=bar&param1=baz",
      );
    });

    it("should be wrapped in an array if paramname looks like param[]", () => {
      const m = $url.compile("/foo?param1[]");
      expect(m.exec("/foo")).toEqual({ "param1[]": undefined });

      $url.url("/foo?param1[]=bar");
      expect(m.exec($url.path(), $url.search())).toEqual({
        "param1[]": ["bar"],
      });
      expect(m.format({ "param1[]": "bar" })).toBe("/foo?param1[]=bar");
      expect(m.format({ "param1[]": ["bar"] })).toBe("/foo?param1[]=bar");

      $url.url("/foo?param1[]=bar&param1[]=baz");
      if (Array.isArray($url.search()))
        // conditional for angular 1.0.8
        expect(m.exec($url.path(), $url.search())).toEqual({
          "param1[]": ["bar", "baz"],
        });
      expect(m.format({ "param1[]": ["bar", "baz"] })).toBe(
        "/foo?param1[]=bar&param1[]=baz",
      );
    });

    // Test for issue #2222
    it("should return default value, if query param is missing.", () => {
      const m = $url.compile("/state?param1&param2&param3&param5", {
        state: {
          params: {
            param1: "value1",
            param2: { array: true, value: ["value2"] },
            param3: { array: true, value: [] },
            param5: {
              array: true,
              value: () => {
                return [];
              },
            },
          },
        },
      });

      const expected = {
        param1: "value1",
        param2: ["value2"],
        param3: [],
        param5: [],
      };

      // Parse url to get Param.value()
      const parsed = m.exec("/state");
      expect(parsed).toEqual(expected);

      // Pass again through Param.value() for normalization (like transitionTo)
      const paramDefs = m.parameters();
      const values = map(parsed, function (val, key) {
        return find(paramDefs, function (def) {
          return def.id === key;
        }).value(val);
      });
      expect(values).toEqual(expected);
    });

    it("should not be wrapped by ui-router into an array if array: false", () => {
      const m = $url.compile("/foo?param1", {
        state: { params: { param1: { array: false } } },
      });
      expect(m.exec("/foo")).toEqual({ param1: undefined });

      $url.url("/foo?param1=bar");
      expect(m.exec($url.path(), $url.search())).toEqual({ param1: "bar" });
      expect(m.format({ param1: "bar" })).toBe("/foo?param1=bar");
      expect(m.format({ param1: ["bar"] })).toBe("/foo?param1=bar");

      $url.url("/foo?param1=bar&param1=baz");
      if (Array.isArray($url.search()))
        // conditional for angular 1.0.8
        expect(m.exec($url.path(), $url.search())).toEqual({
          param1: "bar,baz",
        }); // coerced to string
      expect(m.format({ param1: ["bar", "baz"] })).toBe(
        "/foo?param1=bar%2Cbaz",
      ); // coerced to string
    });
  });

  describe("multivalue-path-parameters", () => {
    it("should behave as a single-value by default", () => {
      const m = $url.compile("/foo/:param1");

      expect(m.exec("/foo/")).toEqual({ param1: "" });

      expect(m.exec("/foo/bar")).toEqual({ param1: "bar" });
      expect(m.format({ param1: "bar" })).toBe("/foo/bar");
      expect(m.format({ param1: ["bar", "baz"] })).toBe("/foo/bar%2Cbaz"); // coerced to string
    });

    it("should be split on - in url and wrapped in an array if array: true", () => {
      const m = $url.compile("/foo/:param1", {
        state: { params: { param1: { array: true } } },
      });

      expect(m.exec("/foo/")).toEqual({ param1: undefined });
      expect(m.exec("/foo/bar")).toEqual({ param1: ["bar"] });
      $url.url("/foo/bar-baz");
      expect(m.exec($location.url())).toEqual({ param1: ["bar", "baz"] });

      expect(m.format({ param1: [] })).toEqual("/foo/");
      expect(m.format({ param1: ["bar"] })).toEqual("/foo/bar");
      expect(m.format({ param1: ["bar", "baz"] })).toEqual("/foo/bar-baz");
    });

    it("should behave similar to multi-value query params", () => {
      const m = $url.compile("/foo/:param1[]");

      // empty array [] is treated like "undefined"
      expect(m.format({ "param1[]": undefined })).toBe("/foo/");
      expect(m.format({ "param1[]": [] })).toBe("/foo/");
      expect(m.format({ "param1[]": "" })).toBe("/foo/");
      expect(m.format({ "param1[]": "1" })).toBe("/foo/1");
      expect(m.format({ "param1[]": ["1"] })).toBe("/foo/1");
      expect(m.format({ "param1[]": ["1", "2"] })).toBe("/foo/1-2");

      expect(m.exec("/foo/")).toEqual({ "param1[]": undefined });
      expect(m.exec("/foo/1")).toEqual({ "param1[]": ["1"] });
      expect(m.exec("/foo/1-2")).toEqual({ "param1[]": ["1", "2"] });

      $url.url("/foo/");
      expect(m.exec($url.path(), $url.search())).toEqual({
        "param1[]": undefined,
      });
      $url.url("/foo/bar");
      expect(m.exec($url.path(), $url.search())).toEqual({
        "param1[]": ["bar"],
      });
      $url.url("/foo/bar-baz");
      expect(m.exec($url.path(), $url.search())).toEqual({
        "param1[]": ["bar", "baz"],
      });

      expect(m.format({})).toBe("/foo/");
      expect(m.format({ "param1[]": undefined })).toBe("/foo/");
      expect(m.format({ "param1[]": "" })).toBe("/foo/");
      expect(m.format({ "param1[]": "bar" })).toBe("/foo/bar");
      expect(m.format({ "param1[]": ["bar"] })).toBe("/foo/bar");
      expect(m.format({ "param1[]": ["bar", "baz"] })).toBe("/foo/bar-baz");
    });

    it("should be split on - in url and wrapped in an array if paramname looks like param[]", () => {
      const m = $url.compile("/foo/:param1[]");

      expect(m.exec("/foo/")).toEqual({ "param1[]": undefined });
      expect(m.exec("/foo/bar")).toEqual({ "param1[]": ["bar"] });
      expect(m.exec("/foo/bar-baz")).toEqual({ "param1[]": ["bar", "baz"] });

      expect(m.format({ "param1[]": [] })).toEqual("/foo/");
      expect(m.format({ "param1[]": ["bar"] })).toEqual("/foo/bar");
      expect(m.format({ "param1[]": ["bar", "baz"] })).toEqual("/foo/bar-baz");
    });

    it("should allow path param arrays with '-' in the values", () => {
      const m = $url.compile("/foo/:param1[]");

      expect(m.exec("/foo/")).toEqual({ "param1[]": undefined });
      expect(m.exec("/foo/bar\\-")).toEqual({ "param1[]": ["bar-"] });
      expect(m.exec("/foo/bar\\--\\-baz")).toEqual({
        "param1[]": ["bar-", "-baz"],
      });

      expect(m.format({ "param1[]": [] })).toEqual("/foo/");
      expect(m.format({ "param1[]": ["bar-"] })).toEqual("/foo/bar%5C%2D");
      expect(m.format({ "param1[]": ["bar-", "-baz"] })).toEqual(
        "/foo/bar%5C%2D-%5C%2Dbaz",
      );
      expect(
        m.format({ "param1[]": ["bar-bar-bar-", "-baz-baz-baz"] }),
      ).toEqual("/foo/bar%5C%2Dbar%5C%2Dbar%5C%2D-%5C%2Dbaz%5C%2Dbaz%5C%2Dbaz");

      // check that we handle $location.url decodes correctly
      $url.url(m.format({ "param1[]": ["bar-", "-baz"] }));
      expect(m.exec($url.path(), $url.search())).toEqual({
        "param1[]": ["bar-", "-baz"],
      });

      // check that we handle $location.url decodes correctly for multiple hyphens
      $url.url(m.format({ "param1[]": ["bar-bar-bar-", "-baz-baz-baz"] }));
      expect(m.exec($url.path(), $url.search())).toEqual({
        "param1[]": ["bar-bar-bar-", "-baz-baz-baz"],
      });

      // check that pre-encoded values are passed correctly
      $url.url(m.format({ "param1[]": ["%2C%20%5C%2C", "-baz"] }));
      expect(m.exec($url.path(), $url.search())).toEqual({
        "param1[]": ["%2C%20%5C%2C", "-baz"],
      });
    });
  });
});

// describe("urlMatcherFactoryProvider", ( ) => {
//   describe(".type()", ( ) => {
//     let $url;
//     beforeEach(
//       module("ng.router.util", function ($urlServiceProvider) {
//         $url = $urlServiceProvider;
//         $urlServiceProvider.type("myType", {}, ( ) => {
//           return {
//             decode: ( ) => {
//               return { status: "decoded" };
//             },
//             is: angular.isObject,
//           };
//         });
//       }),
//     );

//     it("should handle arrays properly with config-time custom type definitions", function (
//       $stateParams,
//     ) {
//       const m = $url.compile("/test?{foo:myType}");
//       expect(m.exec("/test", { foo: "1" })).toEqual({
//         foo: { status: "decoded" },
//       });
//       expect(m.exec("/test", { foo: ["1", "2"] })).toEqual({
//         foo: [{ status: "decoded" }, { status: "decoded" }],
//       });
//     });
//   });

//   // TODO: Fix object pollution between tests for urlMatcherConfig
//   afterEach(function ($urlMatcherFactory) {
//     $urlMatcherFactory.caseInsensitive(false);
//   });
// });

// describe("urlMatcherFactory", ( ) => {
//   let $url;
//   let $url;

//   beforeEach(function ($urlMatcherFactory, $urlService) {
//     $url = $urlMatcherFactory;
//     $url = $urlService;
//   });

//   it("compiles patterns", ( ) => {
//     const matcher = $url.compile("/hello/world");
//     expect(matcher instanceof UrlMatcher).toBe(true);
//   });

//   it("recognizes matchers", ( ) => {
//     expect($url.isMatcher($url.compile("/"))).toBe(true);

//     const custom = {
//       format: angular.noop,
//       exec: angular.noop,
//       append: angular.noop,
//       isRoot: angular.noop,
//       validates: angular.noop,
//       parameters: angular.noop,
//       parameter: angular.noop,
//       _getDecodedParamValue: angular.noop,
//     };
//     expect($url.isMatcher(custom)).toBe(true);
//   });

//   it("should handle case sensitive URL by default", ( ) => {
//     expect($url.compile("/hello/world").exec("/heLLo/WORLD")).toBeNull();
//   });

//   it("should handle case insensitive URL", ( ) => {
//     $url.config.caseInsensitive(true);
//     expect($url.compile("/hello/world").exec("/heLLo/WORLD")).toEqual({});
//   });

//   describe("typed parameters", ( ) => {
//     it("should accept object definitions", ( ) => {
//       const type = { encode: ( ) => {}, decode: ( ) => {} };
//       $url.type("myType1", type);
//       expect($url.type("myType1").encode).toBe(type.encode);
//     });

//     it("should reject duplicate definitions", ( ) => {
//       $url.type("myType2", { encode: ( ) => {}, decode: ( ) => {} });
//       expect(( ) => {
//         $url.type("myType2", {});
//       }).toThrowError("A type named 'myType2' has already been defined.");
//     });

//     it("should accept injected function definitions", function (
//       $stateParams,
//     ) {
//       $url.type("myType3", {}, function ($stateParams) {
//         return {
//           decode: ( ) => {
//             return $stateParams;
//           },
//         };
//       });
//       expect($url.type("myType3").decode()).toBe($stateParams);
//     });

//     it("should accept annotated function definitions", function (
//       $stateParams,
//     ) {
//       $url.type("myAnnotatedType", {}, [
//         "$stateParams",
//         function (s) {
//           return {
//             decode: ( ) => {
//               return s;
//             },
//           };
//         },
//       ]);
//       expect($url.type("myAnnotatedType").decode()).toBe($stateParams);
//     });

//     it("should match built-in types", ( ) => {
//       const m = $url.compile("/{foo:int}/{flag:bool}");
//       expect(m.exec("/1138/1")).toEqual({ foo: 1138, flag: true });
//       expect(m.format({ foo: 5, flag: true })).toBe("/5/1");

//       expect(m.exec("/-1138/1")).toEqual({ foo: -1138, flag: true });
//       expect(m.format({ foo: -5, flag: true })).toBe("/-5/1");
//     });

//     it("should match built-in types with spaces", ( ) => {
//       const m = $url.compile("/{foo: int}/{flag:  bool}");
//       expect(m.exec("/1138/1")).toEqual({ foo: 1138, flag: true });
//       expect(m.format({ foo: 5, flag: true })).toBe("/5/1");
//     });

//     it("should match types named only in params", ( ) => {
//       const m = $url.compile("/{foo}/{flag}", {
//         state: {
//           params: {
//             foo: { type: "int" },
//             flag: { type: "bool" },
//           },
//         },
//       });
//       expect(m.exec("/1138/1")).toEqual({ foo: 1138, flag: true });
//       expect(m.format({ foo: 5, flag: true })).toBe("/5/1");
//     });

//     it("should throw an error if a param type is declared twice", ( ) => {
//       expect(( ) => {
//         $url.compile("/{foo:int}", {
//           state: {
//             params: {
//               foo: { type: "int" },
//             },
//           },
//         });
//       }).toThrow(new Error("Param 'foo' has two type configurations."));
//     });

//     it("should encode/decode dates", ( ) => {
//       const m = $url.compile("/calendar/{date:date}"),
//         result = m.exec("/calendar/2014-03-26");
//       const date = new Date(2014, 2, 26);

//       expect(result.date instanceof Date).toBe(true);
//       expect(result.date.toUTCString()).toEqual(date.toUTCString());
//       expect(m.format({ date: date })).toBe("/calendar/2014-03-26");
//     });

//     it("should encode/decode arbitrary objects to json", ( ) => {
//       const m = $url.compile("/state/{param1:json}/{param2:json}");

//       const params = {
//         param1: { foo: "huh", count: 3 },
//         param2: { foo: "wha", count: 5 },
//       };

//       const json1 = '{"foo":"huh","count":3}';
//       const json2 = '{"foo":"wha","count":5}';

//       expect(m.format(params)).toBe(
//         "/state/" + encodeURIComponent(json1) + "/" + encodeURIComponent(json2),
//       );
//       expect(m.exec("/state/" + json1 + "/" + json2)).toEqual(params);
//     });

//     it("should not match invalid typed parameter values", ( ) => {
//       const m = $url.compile("/users/{id:int}");

//       expect(m.exec("/users/1138").id).toBe(1138);
//       expect(m.exec("/users/alpha")).toBeNull();

//       expect(m.format({ id: 1138 })).toBe("/users/1138");
//       expect(m.format({ id: "alpha" })).toBeNull();
//     });

//     it("should automatically handle multiple search param values", ( ) => {
//       const m = $url.compile("/foo/{fooid:int}?{bar:int}");

//       $url.url("/foo/5?bar=1");
//       expect(m.exec($url.path(), $url.search())).toEqual({ fooid: 5, bar: 1 });
//       expect(m.format({ fooid: 5, bar: 1 })).toEqual("/foo/5?bar=1");

//       $url.url("/foo/5?bar=1&bar=2&bar=3");
//       if (Array.isArray($url.search()))
//         // conditional for angular 1.0.8
//         expect(m.exec($url.path(), $url.search())).toEqual({
//           fooid: 5,
//           bar: [1, 2, 3],
//         });
//       expect(m.format({ fooid: 5, bar: [1, 2, 3] })).toEqual(
//         "/foo/5?bar=1&bar=2&bar=3",
//       );

//       m.format();
//     });

//     it("should allow custom types to handle multiple search param values manually", ( ) => {
//       $url.type("custArray", {
//         encode: function (array) {
//           return array.join("-");
//         },
//         decode: function (val) {
//           return Array.isArray(val) ? val : val.split(/-/);
//         },
//         equals: angular.equals,
//         is: Array.isArray,
//       });

//       const m = $url.compile("/foo?{bar:custArray}", {
//         state: { params: { bar: { array: false } } },
//       });

//       $url.url("/foo?bar=fox");
//       expect(m.exec($url.path(), $url.search())).toEqual({ bar: ["fox"] });
//       expect(m.format({ bar: ["fox"] })).toEqual("/foo?bar=fox");

//       $url.url("/foo?bar=quick-brown-fox");
//       expect(m.exec($url.path(), $url.search())).toEqual({
//         bar: ["quick", "brown", "fox"],
//       });
//       expect(m.format({ bar: ["quick", "brown", "fox"] })).toEqual(
//         "/foo?bar=quick-brown-fox",
//       );
//     });
//   });

//   describe("optional parameters", ( ) => {
//     it("should match with or without values", ( ) => {
//       const m = $url.compile("/users/{id:int}", {
//         state: {
//           params: { id: { value: null, squash: true } },
//         },
//       });
//       expect(m.exec("/users/1138")).toEqual({ id: 1138 });
//       expect(m.exec("/users1138")).toBeNull();
//       expect(m.exec("/users/").id).toBeNull();
//       expect(m.exec("/users").id).toBeNull();
//     });

//     it("should correctly match multiple", ( ) => {
//       const m = $url.compile("/users/{id:int}/{state:[A-Z]+}", {
//         state: {
//           params: {
//             id: { value: null, squash: true },
//             state: { value: null, squash: true },
//           },
//         },
//       });
//       expect(m.exec("/users/1138")).toEqual({ id: 1138, state: null });
//       expect(m.exec("/users/1138/NY")).toEqual({ id: 1138, state: "NY" });

//       expect(m.exec("/users/").id).toBeNull();
//       expect(m.exec("/users/").state).toBeNull();

//       expect(m.exec("/users").id).toBeNull();
//       expect(m.exec("/users").state).toBeNull();

//       expect(m.exec("/users/NY").state).toBe("NY");
//       expect(m.exec("/users/NY").id).toBeNull();
//     });

//     it("should correctly format with or without values", ( ) => {
//       const m = $url.compile("/users/{id:int}", {
//         state: {
//           params: { id: { value: null } },
//         },
//       });
//       expect(m.format()).toBe("/users/");
//       expect(m.format({ id: 1138 })).toBe("/users/1138");
//     });

//     it("should correctly format multiple", ( ) => {
//       const m = $url.compile("/users/{id:int}/{state:[A-Z]+}", {
//         state: {
//           params: {
//             id: { value: null, squash: true },
//             state: { value: null, squash: true },
//           },
//         },
//       });

//       expect(m.format()).toBe("/users");
//       expect(m.format({ id: 1138 })).toBe("/users/1138");
//       expect(m.format({ state: "NY" })).toBe("/users/NY");
//       expect(m.format({ id: 1138, state: "NY" })).toBe("/users/1138/NY");
//     });

//     it("should match in between static segments", ( ) => {
//       const m = $url.compile("/users/{user:int}/photos", {
//         state: {
//           params: { user: { value: 5, squash: true } },
//         },
//       });
//       expect(m.exec("/users/photos").user).toBe(5);
//       expect(m.exec("/users/6/photos").user).toBe(6);
//       expect(m.format()).toBe("/users/photos");
//       expect(m.format({ user: 1138 })).toBe("/users/1138/photos");
//     });

//     it("should correctly format with an optional followed by a required parameter", ( ) => {
//       const m = $url.compile("/home/:user/gallery/photos/:photo", {
//         state: {
//           params: {
//             user: { value: null, squash: true },
//             photo: undefined,
//           },
//         },
//       });
//       expect(m.format({ photo: 12 })).toBe("/home/gallery/photos/12");
//       expect(m.format({ user: 1138, photo: 13 })).toBe(
//         "/home/1138/gallery/photos/13",
//       );
//     });

//     describe("default values", ( ) => {
//       it("should populate if not supplied in URL", ( ) => {
//         const m = $url.compile("/users/{id:int}/{test}", {
//           state: {
//             params: {
//               id: { value: 0, squash: true },
//               test: { value: "foo", squash: true },
//             },
//           },
//         });
//         expect(m.exec("/users")).toEqual({ id: 0, test: "foo" });
//         expect(m.exec("/users/2")).toEqual({ id: 2, test: "foo" });
//         expect(m.exec("/users/bar")).toEqual({ id: 0, test: "bar" });
//         expect(m.exec("/users/2/bar")).toEqual({ id: 2, test: "bar" });
//         expect(m.exec("/users/bar/2")).toBeNull();
//       });

//       it("should populate even if the regexp requires 1 or more chars", ( ) => {
//         const m = $url.compile(
//           "/record/{appId}/{recordId:[0-9a-fA-F]{10,24}}",
//           {
//             state: {
//               params: { appId: null, recordId: null },
//             },
//           },
//         );
//         expect(m.exec("/record/546a3e4dd273c60780e35df3/")).toEqual({
//           appId: "546a3e4dd273c60780e35df3",
//           recordId: null,
//         });
//       });

//       it("should allow shorthand definitions", ( ) => {
//         const m = $url.compile("/foo/:foo", {
//           state: {
//             params: { foo: "bar" },
//           },
//         });
//         expect(m.exec("/foo/")).toEqual({ foo: "bar" });
//       });

//       it("should populate query params", ( ) => {
//         const defaults = { order: "name", limit: 25, page: 1 };
//         const m = $url.compile("/foo?order&{limit:int}&{page:int}", {
//           state: {
//             params: defaults,
//           },
//         });
//         expect(m.exec("/foo")).toEqual(defaults);
//       });

//       it("should allow function-calculated values", ( ) => {
//         function barFn() {
//           return "Value from bar()";
//         }
//         let m = $url.compile("/foo/:bar", {
//           state: {
//             params: { bar: barFn },
//           },
//         });
//         expect(m.exec("/foo/").bar).toBe("Value from bar()");

//         m = $url.compile("/foo/:bar", {
//           state: {
//             params: { bar: { value: barFn, squash: true } },
//           },
//         });
//         expect(m.exec("/foo").bar).toBe("Value from bar()");

//         m = $url.compile("/foo?bar", {
//           state: {
//             params: { bar: barFn },
//           },
//         });
//         expect(m.exec("/foo").bar).toBe("Value from bar()");
//       });

//       it("should allow injectable functions", function ($stateParams) {
//         const m = $url.compile("/users/{user:json}", {
//           state: {
//             params: {
//               user: function ($stateParams) {
//                 return $stateParams.user;
//               },
//             },
//           },
//         });
//         const user = { name: "Bob" };

//         $stateParams.user = user;
//         expect(m.exec("/users/").user).toBe(user);
//       });

//       xit("should match when used as prefix", ( ) => {
//         const m = $url.compile("/{lang:[a-z]{2}}/foo", {
//           state: {
//             params: { lang: "de" },
//           },
//         });
//         expect(m.exec("/de/foo")).toEqual({ lang: "de" });
//         expect(m.exec("/foo")).toEqual({ lang: "de" });
//       });

//       describe("squash policy", ( ) => {
//         const Session = { username: "loggedinuser" };
//         function getMatcher(squash) {
//           return $url.compile(
//             "/user/:userid/gallery/:galleryid/photo/:photoid",
//             {
//               state: {
//                 params: {
//                   userid: {
//                     squash: squash,
//                     value: ( ) => {
//                       return Session.username;
//                     },
//                   },
//                   galleryid: { squash: squash, value: "favorites" },
//                 },
//               },
//             },
//           );
//         }

//         it(": true should squash the default value and one slash", function (
//           $stateParams,
//         ) {
//           const m = getMatcher(true);

//           const defaultParams = {
//             userid: "loggedinuser",
//             galleryid: "favorites",
//             photoid: "123",
//           };
//           expect(m.exec("/user/gallery/photo/123")).toEqual(defaultParams);
//           expect(m.exec("/user//gallery//photo/123")).toEqual(defaultParams);
//           expect(m.format(defaultParams)).toBe("/user/gallery/photo/123");

//           const nonDefaultParams = {
//             userid: "otheruser",
//             galleryid: "travel",
//             photoid: "987",
//           };
//           expect(m.exec("/user/otheruser/gallery/travel/photo/987")).toEqual(
//             nonDefaultParams,
//           );
//           expect(m.format(nonDefaultParams)).toBe(
//             "/user/otheruser/gallery/travel/photo/987",
//           );
//         });

//         it(": false should not squash default values", function (
//           $stateParams,
//         ) {
//           const m = getMatcher(false);

//           const defaultParams = {
//             userid: "loggedinuser",
//             galleryid: "favorites",
//             photoid: "123",
//           };
//           expect(
//             m.exec("/user/loggedinuser/gallery/favorites/photo/123"),
//           ).toEqual(defaultParams);
//           expect(m.format(defaultParams)).toBe(
//             "/user/loggedinuser/gallery/favorites/photo/123",
//           );

//           const nonDefaultParams = {
//             userid: "otheruser",
//             galleryid: "travel",
//             photoid: "987",
//           };
//           expect(m.exec("/user/otheruser/gallery/travel/photo/987")).toEqual(
//             nonDefaultParams,
//           );
//           expect(m.format(nonDefaultParams)).toBe(
//             "/user/otheruser/gallery/travel/photo/987",
//           );
//         });

//         it(": '' should squash the default value to an empty string", function (
//           $stateParams,
//         ) {
//           const m = getMatcher("");

//           const defaultParams = {
//             userid: "loggedinuser",
//             galleryid: "favorites",
//             photoid: "123",
//           };
//           expect(m.exec("/user//gallery//photo/123")).toEqual(defaultParams);
//           expect(m.format(defaultParams)).toBe("/user//gallery//photo/123");

//           const nonDefaultParams = {
//             userid: "otheruser",
//             galleryid: "travel",
//             photoid: "987",
//           };
//           expect(m.exec("/user/otheruser/gallery/travel/photo/987")).toEqual(
//             nonDefaultParams,
//           );
//           expect(m.format(nonDefaultParams)).toBe(
//             "/user/otheruser/gallery/travel/photo/987",
//           );
//         });

//         it(": '~' should squash the default value and replace it with '~'", function (
//           $stateParams,
//         ) {
//           const m = getMatcher("~");

//           const defaultParams = {
//             userid: "loggedinuser",
//             galleryid: "favorites",
//             photoid: "123",
//           };
//           expect(m.exec("/user//gallery//photo/123")).toEqual(defaultParams);
//           expect(m.exec("/user/~/gallery/~/photo/123")).toEqual(defaultParams);
//           expect(m.format(defaultParams)).toBe("/user/~/gallery/~/photo/123");

//           const nonDefaultParams = {
//             userid: "otheruser",
//             galleryid: "travel",
//             photoid: "987",
//           };
//           expect(m.exec("/user/otheruser/gallery/travel/photo/987")).toEqual(
//             nonDefaultParams,
//           );
//           expect(m.format(nonDefaultParams)).toBe(
//             "/user/otheruser/gallery/travel/photo/987",
//           );
//         });
//       });
//     });
//   });

//   describe("strict matching", ( ) => {
//     it("should match with or without trailing slash", ( ) => {
//       const m = $url.compile("/users", { strict: false });
//       expect(m.exec("/users")).toEqual({});
//       expect(m.exec("/users/")).toEqual({});
//     });

//     it("should not match multiple trailing slashes", ( ) => {
//       const m = $url.compile("/users", { strict: false });
//       expect(m.exec("/users//")).toBeNull();
//     });

//     it("should match when defined with parameters", ( ) => {
//       const m = $url.compile("/users/{name}", {
//         strict: false,
//         state: {
//           params: {
//             name: { value: null },
//           },
//         },
//       });
//       expect(m.exec("/users/")).toEqual({ name: null });
//       expect(m.exec("/users/bob")).toEqual({ name: "bob" });
//       expect(m.exec("/users/bob/")).toEqual({ name: "bob" });
//       expect(m.exec("/users/bob//")).toBeNull();
//     });
//   });
// });
