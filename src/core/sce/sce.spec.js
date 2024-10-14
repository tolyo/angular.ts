import { createInjector } from "../di/injector";

import { Angular } from "../../loader";
import { adjustMatcher } from "./sce";

describe("SCE", () => {
  let $sce, $rootScope;
  let sceDelegateProvider;
  let logs = [];

  describe("when disabled", () => {
    beforeEach(function () {
      window.angular = new Angular();
      window.angular.module("myModule", ["ng"]);
      createInjector([
        "myModule",
        function ($sceProvider) {
          $sceProvider.enabled(false);
        },
      ]).invoke((_$sce_) => {
        $sce = _$sce_;
      });
    });

    it("should provide the getter for enabled", () => {
      expect($sce.isEnabled()).toBe(false);
    });

    it("should not wrap/unwrap any value or throw exception on non-string values", () => {
      const originalValue = { foo: "bar" };
      expect($sce.trustAs($sce.JS, originalValue)).toBe(originalValue);
      expect($sce.getTrusted($sce.JS, originalValue)).toBe(originalValue);
    });
  });

  describe("when enabled", () => {
    beforeEach(function () {
      window.angular = new Angular();
      createInjector([
        "ng",
        function ($sceProvider) {
          $sceProvider.enabled(true);
        },
      ]).invoke((_$sce_) => {
        $sce = _$sce_;
      });
    });

    it("should wrap string values with TrustedValueHolder", () => {
      const originalValue = "original_value";
      let wrappedValue = $sce.trustAs($sce.HTML, originalValue);
      expect(typeof wrappedValue).toBe("object");
      expect($sce.getTrusted($sce.HTML, wrappedValue)).toBe("original_value");
      expect(() => {
        $sce.getTrusted($sce.CSS, wrappedValue);
      }).toThrowError(/unsafe/);
      wrappedValue = $sce.trustAs($sce.CSS, originalValue);
      expect(typeof wrappedValue).toBe("object");
      expect($sce.getTrusted($sce.CSS, wrappedValue)).toBe("original_value");
      expect(() => {
        $sce.getTrusted($sce.HTML, wrappedValue);
      }).toThrowError(/unsafe/);
      wrappedValue = $sce.trustAs($sce.URL, originalValue);
      expect(typeof wrappedValue).toBe("object");
      expect($sce.getTrusted($sce.URL, wrappedValue)).toBe("original_value");
      wrappedValue = $sce.trustAs($sce.JS, originalValue);
      expect(typeof wrappedValue).toBe("object");
      expect($sce.getTrusted($sce.JS, wrappedValue)).toBe("original_value");
    });

    it("should NOT wrap non-string values", () => {
      expect(() => {
        $sce.trustAsCss(123);
      }).toThrowError(/itype/);
    });

    it("should NOT wrap unknown contexts", () => {
      expect(() => {
        $sce.trustAs("unknown1", "123");
      }).toThrowError(/icontext/);
    });

    it("should NOT wrap undefined context", () => {
      expect(() => {
        $sce.trustAs(undefined, "123");
      }).toThrowError(/icontext/);
    });

    it("should wrap undefined into undefined", () => {
      expect($sce.trustAsHtml(undefined)).toBeUndefined();
    });

    it("should unwrap undefined into undefined", () => {
      expect($sce.getTrusted($sce.HTML, undefined)).toBeUndefined();
    });

    it("should wrap null into null", () => {
      expect($sce.trustAsHtml(null)).toBe(null);
    });

    it("should unwrap null into null", () => {
      expect($sce.getTrusted($sce.HTML, null)).toBe(null);
    });

    it('should wrap "" into ""', () => {
      expect($sce.trustAsHtml("")).toBe("");
    });

    it('should unwrap "" into ""', () => {
      expect($sce.getTrusted($sce.HTML, "")).toBe("");
    });

    it("should unwrap values and return the original", () => {
      const originalValue = "originalValue";
      const wrappedValue = $sce.trustAs($sce.HTML, originalValue);
      expect($sce.getTrusted($sce.HTML, wrappedValue)).toBe(originalValue);
    });

    it("should NOT unwrap values when the type is different", () => {
      const originalValue = "originalValue";
      const wrappedValue = $sce.trustAs($sce.HTML, originalValue);
      expect(() => {
        $sce.getTrusted($sce.CSS, wrappedValue);
      }).toThrowError(/unsafe/);
    });

    it("should NOT unwrap values that had not been wrapped", () => {
      function TrustedValueHolder(trustedValue) {
        this.$unwrapTrustedValue = function () {
          return trustedValue;
        };
      }
      const wrappedValue = new TrustedValueHolder("originalValue");
      expect(() => $sce.getTrusted($sce.HTML, wrappedValue)).toThrowError(
        /unsafe/,
      );
    });

    it("should implement toString on trusted values", () => {
      const originalValue = "123";
      const wrappedValue = $sce.trustAsHtml(originalValue);
      expect($sce.getTrustedHtml(wrappedValue)).toBe(originalValue);
      expect(wrappedValue.toString()).toBe(originalValue.toString());
    });
  });

  describe("replace $sceDelegate", () => {
    it("should override the default $sce.trustAs/valueOf/etc.", () => {
      window.angular = new Angular();
      createInjector([
        "ng",
        function ($provide) {
          $provide.value("$sceDelegate", {
            trustAs(type, value) {
              return `wrapped:${value}`;
            },
            getTrusted(type, value) {
              return `unwrapped:${value}`;
            },
            valueOf(value) {
              return `valueOf:${value}`;
            },
          });
        },
      ]).invoke((_$sce_) => {
        $sce = _$sce_;
      });

      expect($sce.trustAsJs("value")).toBe("wrapped:value");
      expect($sce.valueOf("value")).toBe("valueOf:value");
      expect($sce.getTrustedJs("value")).toBe("unwrapped:value");
      expect($sce.parseAsJs("name")({ name: "chirayu" })).toBe(
        "unwrapped:chirayu",
      );
    });
  });

  describe("$sce.parseAs", () => {
    window.angular = new Angular();
    beforeEach(function () {
      createInjector(["ng"]).invoke((_$sce_, _$rootScope_) => {
        $sce = _$sce_;
        $rootScope = _$rootScope_;
      });
      logs = [];
    });

    it("should parse constant literals as trusted", () => {
      expect($sce.parseAsJs("1")()).toBe(1);
      expect($sce.parseAsJs("1", $sce.ANY)()).toBe(1);
      expect($sce.parseAsJs("1", $sce.HTML)()).toBe(1);
      expect($sce.parseAsJs("1", "UNDEFINED")()).toBe(1);
      expect($sce.parseAsJs("true")()).toBe(true);
      expect($sce.parseAsJs("false")()).toBe(false);
      expect($sce.parseAsJs("null")()).toBe(null);
      expect($sce.parseAsJs("undefined")()).toBeUndefined();
      expect($sce.parseAsJs('"string"')()).toBe("string");
    });

    it("should be possible to do one-time binding on a non-concatenable context", () => {
      $rootScope.$watch($sce.parseAsHtml("::foo"), (value) => {
        logs.push(`${value}`);
      });

      ;
      expect(logs[0]).toEqual("undefined"); // initial listener call

      $rootScope.foo = $sce.trustAs($sce.HTML, "trustedValue");
      expect($rootScope.$$watchers.length).toBe(1);
      ;

      expect($rootScope.$$watchers.length).toBe(0);
      expect(logs[1]).toEqual("trustedValue");

      $rootScope.foo = $sce.trustAs($sce.HTML, "anotherTrustedValue");
      ;
      expect(logs[2]).toBeUndefined(); // watcher no longer active
    });

    it("should be possible to do one-time binding on a concatenable context", () => {
      $rootScope.$watch($sce.parseAsUrl("::foo"), (value) => {
        logs.push(`${value}`);
      });

      ;
      expect(logs[0]).toEqual("undefined"); // initial listener call

      $rootScope.foo = $sce.trustAs($sce.URL, "trustedValue");
      expect($rootScope.$$watchers.length).toBe(1);
      ;

      expect($rootScope.$$watchers.length).toBe(0);
      expect(logs[1]).toEqual("trustedValue");

      $rootScope.foo = $sce.trustAs($sce.URL, "anotherTrustedValue");
      ;
      expect(logs[2]).toBeUndefined(); // watcher no longer active
    });

    it("should NOT parse constant non-literals", () => {
      // Until there's a real world use case for this, we're disallowing
      // constant non-literals.  See $SceParseProvider.
      const exprFn = $sce.parseAsJs("1+1");
      expect(exprFn).toThrow();
    });

    it("should NOT return untrusted values from expression function", () => {
      const exprFn = $sce.parseAs($sce.HTML, "foo");
      expect(() => exprFn({}, { foo: true })).toThrowError(/unsafe/);
    });

    it("should NOT return trusted values of the wrong type from expression function", () => {
      const exprFn = $sce.parseAs($sce.HTML, "foo");
      expect(() =>
        exprFn({}, { foo: $sce.trustAs($sce.JS, "123") }),
      ).toThrowError(/unsafe/);
    });

    it("should return trusted values from expression function", () => {
      const exprFn = $sce.parseAs($sce.HTML, "foo");
      expect(exprFn({}, { foo: $sce.trustAs($sce.HTML, "trustedValue") })).toBe(
        "trustedValue",
      );
    });

    it("should support shorthand methods", () => {
      // Test shorthand parse methods.
      expect($sce.parseAsHtml("1")()).toBe(1);
      // Test short trustAs methods.
      expect($sce.trustAsAny).toBeUndefined();
      expect(() => {
        // mismatched types.
        $sce.parseAsCss("foo")({}, { foo: $sce.trustAsHtml("1") });
      }).toThrowError(/unsafe/);
    });
  });

  describe("$sceDelegate resource url policies", () => {
    beforeEach(() => {
      createInjector([
        "ng",
        ($sceDelegateProvider) => {
          sceDelegateProvider = $sceDelegateProvider;
        },
      ]).invoke((_$sce_) => {
        $sce = _$sce_;
      });
    });

    it('should default to "self" which allows relative urls', () => {
      expect($sce.getTrustedResourceUrl("foo/bar")).toEqual("foo/bar");
    });

    it("should reject everything when trusted resource URL list is empty", () => {
      sceDelegateProvider.trustedResourceUrlList([]);
      sceDelegateProvider.bannedResourceUrlList([]);
      expect(() => {
        $sce.getTrustedResourceUrl("#");
      }).toThrowError(/insecurl/);
    });

    it("should match against normalized urls", () => {
      sceDelegateProvider.trustedResourceUrlList([/^foo$/]);
      sceDelegateProvider.bannedResourceUrlList([]);
      expect(() => {
        $sce.getTrustedResourceUrl("foo");
      }).toThrowError(/insecurl/);
    });

    it("should not accept unknown matcher type", () => {
      expect(() => {
        sceDelegateProvider.trustedResourceUrlList([{}]);
      }).toThrowError(/imatcher/);
    });

    describe("adjustMatcher", () => {
      /* global adjustMatcher: false */
      it("should rewrite regex into regex and add ^ & $ on either end", () => {
        expect(adjustMatcher(/a.*b/).exec("a.b")).not.toBeNull();
        expect(adjustMatcher(/a.*b/).exec("-a.b-")).toBeNull();
        // Adding ^ & $ onto a regex that already had them should also work.
        expect(adjustMatcher(/^a.*b$/).exec("a.b")).not.toBeNull();
        expect(adjustMatcher(/^a.*b$/).exec("-a.b-")).toBeNull();
      });

      it("should should match * and **", () => {
        expect(
          adjustMatcher("*://*.example.com/**").exec(
            "http://www.example.com/path",
          ),
        ).not.toBeNull();
      });
    });

    describe("regex matcher", () => {
      beforeEach(() => {
        createInjector([
          "ng",
          ($sceDelegateProvider) => {
            sceDelegateProvider = $sceDelegateProvider;
          },
        ]).invoke((_$sce_) => {
          $sce = _$sce_;
        });
      });

      it("should support custom regex", () => {
        sceDelegateProvider.trustedResourceUrlList([
          /^http:\/\/example\.com\/.*/,
        ]);
        sceDelegateProvider.bannedResourceUrlList([]);
        expect($sce.getTrustedResourceUrl("http://example.com/foo")).toEqual(
          "http://example.com/foo",
        );
        // must match entire regex
        expect(() => {
          $sce.getTrustedResourceUrl("https://example.com/foo");
        }).toThrowError(/insecurl/);
        // https doesn't match (mismatched protocol.)
        expect(() => {
          $sce.getTrustedResourceUrl("https://example.com/foo");
        }).toThrowError(/insecurl/);
      });

      it("should match entire regex", () => {
        sceDelegateProvider.trustedResourceUrlList([
          /https?:\/\/example\.com\/foo/,
        ]);
        sceDelegateProvider.bannedResourceUrlList([]);
        expect($sce.getTrustedResourceUrl("http://example.com/foo")).toEqual(
          "http://example.com/foo",
        );
        expect($sce.getTrustedResourceUrl("https://example.com/foo")).toEqual(
          "https://example.com/foo",
        );
        expect(() => {
          $sce.getTrustedResourceUrl("http://example.com/fo");
        }).toThrowError(/insecurl/);
        // Suffix not allowed even though original regex does not contain an ending $.
        expect(() => {
          $sce.getTrustedResourceUrl("http://example.com/foo2");
        }).toThrowError(/insecurl/);
        // Prefix not allowed even though original regex does not contain a leading ^.
        expect(() => {
          $sce.getTrustedResourceUrl("xhttp://example.com/foo");
        }).toThrowError(/insecurl/);
      });
    });

    describe("string matchers", () => {
      beforeEach(() => {
        createInjector([
          "ng",
          ($sceDelegateProvider) => {
            sceDelegateProvider = $sceDelegateProvider;
          },
        ]).invoke((_$sce_) => {
          $sce = _$sce_;
        });
      });

      it("should support strings as matchers", () => {
        sceDelegateProvider.trustedResourceUrlList(["http://example.com/foo"]);
        sceDelegateProvider.bannedResourceUrlList([]);
        expect($sce.getTrustedResourceUrl("http://example.com/foo")).toEqual(
          "http://example.com/foo",
        );
        // "." is not a special character like in a regex.
        expect(() => {
          $sce.getTrustedResourceUrl("http://example-com/foo");
        }).toThrowError(/insecurl/);
        // You can match a prefix.
        expect(() => {
          $sce.getTrustedResourceUrl("http://example.com/foo2");
        }).toThrowError(/insecurl/);
        // You can match a suffix.
        expect(() => {
          $sce.getTrustedResourceUrl("xhttp://example.com/foo");
        }).toThrowError(/insecurl/);
      });

      it("should support the * wildcard", () => {
        sceDelegateProvider.trustedResourceUrlList(["http://example.com/foo*"]);
        sceDelegateProvider.bannedResourceUrlList([]);
        expect($sce.getTrustedResourceUrl("http://example.com/foo")).toEqual(
          "http://example.com/foo",
        );
        // The * wildcard should match extra characters.
        expect(
          $sce.getTrustedResourceUrl("http://example.com/foo-bar"),
        ).toEqual("http://example.com/foo-bar");
        // The * wildcard does not match ':'
        expect(() => {
          $sce.getTrustedResourceUrl("http://example-com/foo:bar");
        }).toThrowError(/insecurl/);
        // The * wildcard does not match '/'
        expect(() => {
          $sce.getTrustedResourceUrl("http://example-com/foo/bar");
        }).toThrowError(/insecurl/);
        // The * wildcard does not match '.'
        expect(() => {
          $sce.getTrustedResourceUrl("http://example-com/foo.bar");
        }).toThrowError(/insecurl/);
        // The * wildcard does not match '?'
        expect(() => {
          $sce.getTrustedResourceUrl("http://example-com/foo?bar");
        }).toThrowError(/insecurl/);
        // The * wildcard does not match '&'
        expect(() => {
          $sce.getTrustedResourceUrl("http://example-com/foo&bar");
        }).toThrowError(/insecurl/);
        // The * wildcard does not match ';'
        expect(() => {
          $sce.getTrustedResourceUrl("http://example-com/foo;bar");
        }).toThrowError(/insecurl/);
      });

      it("should support the ** wildcard", () => {
        sceDelegateProvider.trustedResourceUrlList([
          "http://example.com/foo**",
        ]);
        sceDelegateProvider.bannedResourceUrlList([]);
        expect($sce.getTrustedResourceUrl("http://example.com/foo")).toEqual(
          "http://example.com/foo",
        );
        // The ** wildcard should match extra characters.
        expect(
          $sce.getTrustedResourceUrl("http://example.com/foo-bar"),
        ).toEqual("http://example.com/foo-bar");
        // The ** wildcard accepts the ':/.?&' characters.
        expect(
          $sce.getTrustedResourceUrl("http://example.com/foo:1/2.3?4&5-6"),
        ).toEqual("http://example.com/foo:1/2.3?4&5-6");
      });

      it("should not accept *** in the string", () => {
        expect(() => {
          sceDelegateProvider.trustedResourceUrlList(["http://***"]);
        }).toThrowError(/iwcard/);
      });
    });

    describe('"self" matcher', () => {
      beforeEach(() => {
        createInjector([
          "ng",
          ($sceDelegateProvider) => {
            sceDelegateProvider = $sceDelegateProvider;
          },
        ]).invoke((_$sce_) => {
          $sce = _$sce_;
        });
      });

      it('should support the special string "self" in trusted resource URL list', () => {
        sceDelegateProvider.trustedResourceUrlList(["self"]);
        sceDelegateProvider.bannedResourceUrlList([]);
        expect($sce.getTrustedResourceUrl("foo")).toEqual("foo");
      });

      it('should support the special string "self" in baneed resource URL list', () => {
        sceDelegateProvider.trustedResourceUrlList([/.*/]);
        sceDelegateProvider.bannedResourceUrlList(["self"]);
        expect(() => {
          $sce.getTrustedResourceUrl("foo");
        }).toThrowError(/insecurl/);
      });

      describe("when the document base URL has changed", () => {
        beforeEach(() => {
          createInjector([
            "ng",
            ($sceDelegateProvider) => {
              sceDelegateProvider = $sceDelegateProvider;
              sceDelegateProvider.trustedResourceUrlList(["self"]);
              sceDelegateProvider.bannedResourceUrlList([]);
            },
          ]).invoke((_$sce_) => {
            $sce = _$sce_;
          });
        });

        let baseElem;
        beforeEach(() => {
          baseElem = document.createElement("BASE");
          baseElem.setAttribute(
            "href",
            `${window.location.protocol}//foo.example.com/path/`,
          );
          document.head.appendChild(baseElem);
        });

        afterEach(() => {
          document.head.removeChild(baseElem);
        });

        it("should allow relative URLs", () => {
          expect($sce.getTrustedResourceUrl("foo")).toEqual("foo");
        });

        it("should allow absolute URLs", () => {
          expect($sce.getTrustedResourceUrl("//foo.example.com/bar")).toEqual(
            "//foo.example.com/bar",
          );
        });

        it("should still block some URLs", () => {
          expect(() => {
            $sce.getTrustedResourceUrl("//bad.example.com");
          }).toThrowError(/insecurl/);
        });
      });
      it("should have the banned resource URL list override the trusted resource URL list", () => {
        sceDelegateProvider.trustedResourceUrlList(["self"]);
        sceDelegateProvider.bannedResourceUrlList(["self"]);
        expect(() => {
          $sce.getTrustedResourceUrl("foo");
        }).toThrowError(/insecurl/);
      });

      it("should support multiple items in both lists", () => {
        sceDelegateProvider.trustedResourceUrlList([
          /^http:\/\/example.com\/1$/,
          /^http:\/\/example.com\/2$/,
          /^http:\/\/example.com\/3$/,
          "self",
        ]);
        sceDelegateProvider.bannedResourceUrlList([
          /^http:\/\/example.com\/3$/,
          /.*\/open_redirect/,
        ]);
        expect($sce.getTrustedResourceUrl("same_domain")).toEqual(
          "same_domain",
        );
        expect($sce.getTrustedResourceUrl("http://example.com/1")).toEqual(
          "http://example.com/1",
        );
        expect($sce.getTrustedResourceUrl("http://example.com/2")).toEqual(
          "http://example.com/2",
        );
        expect(() => {
          $sce.getTrustedResourceUrl("http://example.com/3");
        }).toThrowError(/insecurl/);
        expect(() => {
          $sce.getTrustedResourceUrl("open_redirect");
        }).toThrowError(/insecurl/);
      });
    });

    describe("URL-context sanitization", () => {
      it("should sanitize values that are not found in the trusted resource URL list", () => {
        expect($sce.getTrustedMediaUrl("javascript:foo")).toEqual(
          "unsafe:javascript:foo",
        );
        expect($sce.getTrustedUrl("javascript:foo")).toEqual(
          "unsafe:javascript:foo",
        );
      });

      it("should not sanitize values that are found in the trusted resource URL list", () => {
        expect($sce.getTrustedMediaUrl("http://example.com")).toEqual(
          "http://example.com",
        );
        expect($sce.getTrustedUrl("http://example.com")).toEqual(
          "http://example.com",
        );
      });

      it("should not sanitize trusted values", () => {
        expect(
          $sce.getTrustedMediaUrl($sce.trustAsMediaUrl("javascript:foo")),
        ).toEqual("javascript:foo");
        expect(
          $sce.getTrustedMediaUrl($sce.trustAsUrl("javascript:foo")),
        ).toEqual("javascript:foo");
        expect(
          $sce.getTrustedMediaUrl($sce.trustAsResourceUrl("javascript:foo")),
        ).toEqual("javascript:foo");

        expect(
          $sce.getTrustedUrl($sce.trustAsMediaUrl("javascript:foo")),
        ).toEqual("unsafe:javascript:foo");
        expect($sce.getTrustedUrl($sce.trustAsUrl("javascript:foo"))).toEqual(
          "javascript:foo",
        );
        expect(
          $sce.getTrustedUrl($sce.trustAsResourceUrl("javascript:foo")),
        ).toEqual("javascript:foo");
      });

      it("should use the $$sanitizeUri", () => {
        const $$sanitizeUri = jasmine
          .createSpy("$$sanitizeUri")
          .and.returnValue("someSanitizedUrl");
        // module(($provide) => {
        //   $provide.value("$$sanitizeUri", $$sanitizeUri);
        // });
        () => {
          expect($sce.getTrustedMediaUrl("someUrl")).toEqual(
            "someSanitizedUrl",
          );
          expect($$sanitizeUri).toHaveBeenCalledOnceWith("someUrl", true);

          $$sanitizeUri.calls.reset();

          expect($sce.getTrustedUrl("someUrl")).toEqual("someSanitizedUrl");
          expect($$sanitizeUri).toHaveBeenCalledOnceWith("someUrl", false);
        };
      });
    });

    describe("sanitizing html", () => {
      describe("when $sanitize is NOT available", () => {
        it("should throw an exception for getTrusted(string) values", () => {
          expect(() => {
            $sce.getTrustedHtml("<b></b>");
          }).toThrowError(/unsafe/);
        });
      });
    });
  });
});
