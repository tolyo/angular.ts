import { Angular } from "../loader";
import { createInjector } from "./di/injector";

describe("$$cookieReader", () => {
  let $$cookieReader;
  let document;

  describe("with access to `document.cookie`", () => {
    function deleteAllCookies() {
      const cookies = document.cookie.split(";");
      const path = window.location.pathname;

      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i];
        const eqPos = cookie.indexOf("=");
        const name = eqPos > -1 ? cookie.substring(0, eqPos) : cookie;
        const parts = path.split("/");
        while (parts.length) {
          document.cookie = `${name}=;path=${parts.join("/") || "/"};expires=Thu, 01 Jan 1970 00:00:00 GMT`;
          parts.pop();
        }
      }
    }

    beforeEach(() => {
      document = window.document;
      deleteAllCookies();
      expect(document.cookie).toEqual("");

      window.angular = new Angular();
      const injector = createInjector(["ng"]);
      $$cookieReader = injector.get("$$cookieReader");
    });

    afterEach(() => {
      deleteAllCookies();
      expect(document.cookie).toEqual("");
    });

    describe("get via $$cookieReader()[cookieName]", () => {
      it("should return undefined for nonexistent cookie", () => {
        expect($$cookieReader().nonexistent).not.toBeDefined();
      });

      it("should return a value for an existing cookie", () => {
        document.cookie = "foo=bar=baz;path=/";
        expect($$cookieReader().foo).toEqual("bar=baz");
      });

      it("should return the the first value provided for a cookie", () => {
        // For a cookie that has different values that differ by path, the
        // value for the most specific path appears first.  $$cookieReader()
        // should provide that value for the cookie.
        document.cookie = 'foo="first"; foo="second"';
        expect($$cookieReader().foo).toBe('"first"');
      });

      it("should decode cookie values that were encoded by puts", () => {
        document.cookie = "cookie2%3Dbar%3Bbaz=val%3Due;path=/";
        expect($$cookieReader()["cookie2=bar;baz"]).toEqual("val=ue");
      });

      it("should preserve leading & trailing spaces in names and values", () => {
        document.cookie = "%20cookie%20name%20=%20cookie%20value%20";
        expect($$cookieReader()[" cookie name "]).toEqual(" cookie value ");
        expect($$cookieReader()["cookie name"]).not.toBeDefined();
      });

      it("should decode special characters in cookie values", () => {
        document.cookie = "cookie_name=cookie_value_%E2%82%AC";
        expect($$cookieReader().cookie_name).toEqual("cookie_value_€");
      });

      it("should not decode cookie values that do not appear to be encoded", () => {
        // see #9211 - sometimes cookies contain a value that causes decodeURIComponent to throw
        document.cookie = "cookie_name=cookie_value_%XX";
        expect($$cookieReader().cookie_name).toEqual("cookie_value_%XX");
      });
    });

    describe("getAll via $$cookieReader()", () => {
      it("should return cookies as hash", () => {
        document.cookie = "foo1=bar1;path=/";
        document.cookie = "foo2=bar2;path=/";
        expect($$cookieReader()).toEqual({ foo1: "bar1", foo2: "bar2" });
      });

      it("should return empty hash if no cookies exist", () => {
        expect($$cookieReader()).toEqual({});
      });
    });

    it("should initialize cookie cache with existing cookies", () => {
      document.cookie = "existingCookie=existingValue;path=/";
      expect($$cookieReader()).toEqual({ existingCookie: "existingValue" });
    });
  });
});
